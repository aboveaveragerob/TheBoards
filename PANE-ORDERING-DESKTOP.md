# Board pane ordering on desktop — resolved spec (issue #14)

> **Status: decision resolved, implementation pending.** This closes open decision 7
> of 9 from [`DESKTOP-MODE-PLAN.md`](https://github.com/aboveaveragerob/TheBoards/blob/claude/desktop-view-planning-1nd3sq/DESKTOP-MODE-PLAN.md)
> (PR #7, planning issue #4). No code changes here — the parent plan holds
> implementation until all nine decisions are confirmed. The `DECISIONS.md` entry is
> drafted at the bottom of this file, ready to paste **when the implementation lands**,
> not before: `DECISIONS.md` records what v1 ships, and this does not ship yet.

## The problem

Issue #4 specifies the pane's cards in "descending order beginning with the most recent
board at the top." **Most recent by what?** The codebase answers this twice, differently:

- `renderList` sorts `b.createdAt - a.createdAt` (`app.js:822`) — creation order.
- `boot()` (`app.js:930`) and `ensureCurrentValid()` (`app.js:903`) both reduce to the
  maximum `updatedAt` — edit recency.

Neither reading is a typo, so "match the existing behavior" does not resolve it. And the
question is not cosmetic on this surface: the mobile list is a **destination** — you push
a history entry, look at it, and leave (B9), so its order is read once and never watched
change. The desktop pane is **ambient**. It is on screen the entire time you work, in the
periphery, beside the board you are editing. An ordering key that is a stable index on a
transient list becomes a live, self-rearranging surface on a permanent one.

## Resolution

| | Resolution | Origin |
|---|---|---|
| Pane ordering key | `createdAt` **descending** | Plan default, **confirmed** |
| Boot / recovery key | Stays `updatedAt` — deliberately a different key | **Confirmed**, recorded as intentional |
| Tiebreak | `id` descending, so equal-millisecond `createdAt` never reorders | **Added** to scope |
| Comparator location | One shared comparator, used by both `renderList` and `renderPane` | **Added** to scope |

### 1. `createdAt` descending — because a fixed slot is a learnable slot

The conventional answer here is recency ranking. Every file manager, editor, and document
app orders "recent" by last-touched, and that convention exists for a good reason: it wins
when the list is long and you are retrieving one item out of hundreds. **This rail is not
that list.** Issue #4 sizes it at 5–6 compact cards, and it is on screen permanently rather
than opened to search.

At that size and that permanence, the property worth optimizing is not ranking but
**constancy**. `createdAt` is immutable, so a board's card never moves. After a week the
rail is muscle memory — third card down is the one you reach for without reading it. That
is the same claim the rest of the app makes about space: positions are permanent (PRD §1),
committed work is never silently moved (B17), lot lines are ordered by assertion rather
than inference (B6). A rail that re-ranks itself is the one surface in the app that would
rearrange your things on your behalf.

`updatedAt` would surrender that, and the three specific costs are:

**a. The top slot would carry no information.** The board you are editing is, by
construction, always the most recently updated one — `saveNow` stamps `updatedAt` on every
write (`app.js:145`, B13). So slot 1 would permanently hold *the board already filling the
screen next to it*. The parent plan already marks the current board with a structural
`.active` state, so the top card would be a second, redundant way of saying the same thing,
and the most prominent slot in the rail would be spent on the one board you never need to
navigate to. "Every pixel earns its place" (UIUX §1) is not satisfied by a slot whose value
is a tautology.

**b. It forces a choice between motion noise and an order that lies.** The parent plan
updates the active card's title *per keystroke without a full re-render*. Under `updatedAt`
that hook has no correct form: either the pane keeps its rendered order and the order is
wrong the instant you type, or it re-sorts per keystroke and a card visibly slides to the
top in your peripheral vision while you are typing somewhere else. UIUX §8 holds motion to
a closed, justified set; a reorder triggered by typing elsewhere justifies nothing. Under
`createdAt` the question does not arise — the title text changes in place and the order is
invariant.

**c. The order would have no visible basis.** `renderList` prints `formatDate(b.createdAt)`
on untitled rows (`app.js:830-836`), and the pane reuses that row content. Sorting by
`createdAt` means the one date a card actually shows is the key the rail is sorted on — the
ordering explains itself on screen. Sorting by `updatedAt` would rank cards by a timestamp
that appears nowhere, so a user comparing two visible dates would find them in the "wrong"
order and be made to think about the interface (UIUX §1).

### 2. The boot path keeps `updatedAt` — the split is the answer, not the bug

It is tempting to read `app.js:822` against `app.js:930` as an inconsistency and unify
them. It is not one. **The two keys answer different questions:**

- `updatedAt` selects **continuity** — *which board do I resume?* Launch, and the recovery
  path when `current` was deleted, both need the board you were last working in. Creation
  date says nothing useful about that.
- `createdAt` orders **space** — *where does this card sit?* That wants a value that never
  changes, for every reason in §1.

So both call sites stay exactly as they are. This is recorded explicitly so the next reader
does not "fix" it: `boot()` and `ensureCurrentValid()` must keep reducing on `updatedAt`,
and `renderPane` must sort on `createdAt`, and that is correct.

**Consequence to accept:** on launch, the resumed board's card is wherever its creation date
puts it — often mid-rail, not at the top. That is the intended behavior rather than a
shortfall: the `.active` mark says which card it is, and the slot is in the same place it
was yesterday. The alternative buys a top-slot highlight at the price of the constancy in
§1, which is the entire value of the choice.

### 3. Implementation notes

- **One comparator, in one place.** `renderPane` must not restate the sort. Step 4 of the
  parent plan already extracts a shared row-content helper between `renderList`
  (`app.js:820-840`) and `renderPane`; the comparator belongs in that same shared module so
  the list and the rail cannot drift apart later. If the key is ever re-interrogated
  (see *Impermanence*), it moves in exactly one place.
- **Tiebreak on `id`.** `newBoardRecord` stamps `createdAt` from `Date.now()`
  (`app.js:133-137`), so two boards created in the same millisecond compare equal and fall
  through to `idbGetAll`'s key order — uuid, i.e. arbitrary. `Array.prototype.sort` is
  stable, so today's list is at least stable *within a render*, but two renders can differ.
  Compare `b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)`: cheap,
  total, and it makes "the card never moves" true without an asterisk.
- **No write-path or schema change.** `updatedAt` is written in exactly one place
  (`saveNow`, `app.js:145`) and the store has no indexes (`app.js:58-71`). This decision
  adds neither, and does not touch the three direct `idbPut` calls that deliberately bypass
  `saveNow` (`app.js:868` undo, `885` new board, `904` empty-DB seed).
- **Re-render triggers are unchanged** from the parent plan — boot, swap, new, delete,
  undo, title-commit. Notably this decision adds **no** per-keystroke re-render; avoiding
  that is one of the things it buys.

## Blocked on

Nothing. This decision is self-contained — it constrains one comparator. Implementation
lands with **step 4 of the parent plan** (the pane), alongside decision 2 (pane geometry,
issue #9) and decision 3 (create/delete affordances, issue #10).

## Draft `DECISIONS.md` entry — paste when implementation lands

> **Numbering:** take the next free `B` number at paste time. Do **not** assume a number
> now — the nine decision branches are resolving in parallel and claiming numbers as they
> merge (PR #28 already claims B19). The number is assigned when the entry lands, not when
> it is drafted.

> ### B__. The desktop board pane orders by `createdAt`, not `updatedAt`
>
> Issue #4 asks for "the most recent board at the top" and the codebase already uses both
> meanings — the list view sorts `createdAt` desc (`app.js › renderList`) while boot and
> recovery reduce on `updatedAt` (`app.js › boot`, `ensureCurrentValid`). **Decision: the
> pane sorts `createdAt` descending, tiebroken on `id`.**
>
> **Why, beyond matching the list:** the mobile list is a destination you open and leave
> (B9), so its order is never watched changing; the pane is ambient and permanently on
> screen. At 5–6 cards the value is constancy, not ranking — an immutable key means a
> board's card never moves and the rail becomes navigable from memory, which is the same
> claim as positions permanent (PRD §1) and B17's refusal to move committed work. Recency
> ranking is the convention borrowed from lists of hundreds; this is not one.
>
> `updatedAt` was rejected for three specific costs. **The top slot would carry no
> information:** `saveNow` stamps `updatedAt` on every write (B13), so slot 1 would
> permanently hold the board already on screen, duplicating the card's `.active` mark and
> spending the most prominent slot on the one board you never navigate to (UIUX §1).
> **It has no correct form for the live-title hook:** the pane updates the active card's
> title per keystroke without a full re-render, so `updatedAt` ordering is either stale the
> moment you type or it slides a card to the top in the periphery while you type elsewhere
> — motion that justifies nothing against §8. **And its basis would be invisible:** cards
> print `formatDate(createdAt)` on untitled rows, so `createdAt` sorting is explained by
> what is on screen, while `updatedAt` sorting would order cards by a timestamp nothing
> shows.
>
> **Boot and recovery deliberately keep `updatedAt`, and that split is intentional, not an
> inconsistency to repair:** `updatedAt` selects continuity (which board to resume),
> `createdAt` orders space (where a card sits). Consequence: on launch the resumed board's
> card sits wherever its creation date puts it rather than at the top — correct, because
> the `.active` mark identifies it and the slot is where it was yesterday. The comparator
> lives in the row helper shared with `renderList` so the two surfaces cannot drift.
>
> **Impermanence:** this trades retrieval efficiency for spatial constancy, and the trade
> is sound only while the rail is small. With enough boards, a frequently-used old board
> sits below newer ones that are never opened. If that arrives, the answer is pinning or
> search — not re-ranking, because re-ranking gives back the fixed slot that is the whole
> reason for the choice. Only the comparator would move, and it lives in one place.
