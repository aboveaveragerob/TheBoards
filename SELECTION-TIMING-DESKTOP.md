# Selection timing vs. the 400 ms action window — resolved spec (issue #13)

> **Status: decision resolved, implementation pending.** This closes open decision 6
> of 9 from [`DESKTOP-MODE-PLAN.md`](https://github.com/aboveaveragerob/TheBoards/blob/claude/desktop-view-planning-1nd3sq/DESKTOP-MODE-PLAN.md)
> (PR #7, planning issue #4). No code changes here — the parent plan holds implementation
> until all nine decisions are confirmed. The `DECISIONS.md` entry is drafted at the bottom
> of this file, ready to paste **when the implementation lands**, not before: `DECISIONS.md`
> records what v1 ships, and this does not ship yet.

## The problem

B18 routes every click *action* through a 400 ms acknowledged window (`ACTION_DELAY`,
`app.js › delayAction`, `app.js:395-403`). Desktop introduces a select-then-act model for
notes (issue #4): click a note to select it, click again within the pairing window to edit
it, click Complete/Delete on the resulting overlay. Does any part of that go through B18's
window?

The plan's recommended default is selection/deselection instant, actions delayed, argued
from mechanics: `delayAction` **drops** a tap that arrives while a window is open
(`app.js:396`), so a delayed selection would swallow the second click of every double-click,
making double-click-to-edit impossible. That argument is correct as far as it goes, but it
is contingent — tie the edit gesture to something other than double-click and the argument
evaporates, while the timing question would still need an answer. Interrogating the default
surfaced a sturdier reason underneath it, and two questions the plan leaves silent that turn
out to gate the sturdier reason's implementation.

## Resolution

| | Resolution | Origin |
|---|---|---|
| Select / deselect / replace selection | **Instant**; opens no `delayAction` window | Plan default, **confirmed** |
| Reason of record | Categorical — selection has no consequence to acknowledge | default **re-grounded** |
| Double-click → edit entry | **Instant** | **added** to scope |
| `handleTap`'s blanket drop-guard (`app.js:420`) | Selection is **exempt**; the guard moves into the action branches | **added** to scope |
| Deselect vs. an in-flight action | Deselect does **not** cancel it | **sharpened** |
| Selecting calls `surfaceNote` | **No** — selection writes nothing | **added** to scope |
| Complete/Restore/Delete, create, board swap/new/delete, Undo toast | Keep the 400 ms window | Plan default, **confirmed** |

### 1. The default holds — but its stated reason is the weaker of two

The plan's argument is mechanical: a delayed selection is swallowed by the drop-guard, so
double-click-to-edit couldn't work. True, and true via *both* of the codebase's guards (see
§4). But it is contingent on double-click being the edit gesture — change the gesture and
the argument is gone, while the underlying question (should selecting a note open a 400 ms
window at all?) is untouched.

The durable reason is categorical, not mechanical. B18's window exists so that a
*consequence* can be acknowledged before it lands — B18(a): "400 ms of nothing is
indistinguishable from a dropped tap." Selection has no consequence to acknowledge. It
commits nothing, writes nothing, persists nothing, and is undone for free by clicking
anywhere else. It **is** its own acknowledgment — the frame, handles and buttons appear the
instant it happens, which is the loudest state change on the board. Delaying it would mean
opening 400 ms in which the interface has to acknowledge an acknowledgment, which is not a
thing B18 was written to do. This reason survives any future change to the edit gesture; the
mechanical one is a confirmation of it, not the ground it stands on.

### 2. Instant selection is what makes double-click free, not merely compatible with it

The conventional way desktop UIs resolve single-click vs. double-click is to *defer* the
single-click action until the pairing window (~300–350 ms) expires without a second click —
which is itself a delay, and functionally the same tax B18 imposes elsewhere. That tax is
avoidable here only because selection is inert and reversible: click 1 selects on the frame
it releases; click 2, if it comes, supersedes the selection by tearing down the overlay and
opening the editor directly. Nothing about the first click has to be guessed or held open
pending a second click that may not come, so nothing about it has to wait. Selection is
instant *in order for* double-click-to-edit to cost nothing — not merely instant despite the
double-click mechanic depending on it.

### 3. Edit entry is instant too — the plan is silent here, and B18(a) argues against delaying it

Opening the editor on the second click is the same category of change as selection: it
commits nothing, writes nothing until the user types, and is undone by clicking or tabbing
away with nothing typed. Beyond the categorical argument, B18(a)'s own fill test cannot be
satisfied on this transition — the note is already wearing the selection frame from click 1,
so a `.pressed`/`.tapped` 3 px thicken underneath an existing frame is a weak, competing
signal, and 400 ms with no further visible change is exactly the "was that dropped?" failure
B18(a) exists to prevent. A caret that arrives 400 ms after the click that requested it is
the one thing a text-entry surface cannot afford — every keystroke typed in that window has
nowhere to land.

**Mobile is untouched.** `app.js:428-434` (note tap → `delayAction` → `surfaceNote` +
`editNoteText`) is unchanged. There the tap starts from an unacknowledged rest state — no
prior selection frame — so B18(a)'s fill test is met on its own terms and the window is
doing real work. This decision is desktop-only.

**Consequence: selecting a note does not call `surfaceNote`.** `surfaceNote`
(`app.js:616-625`) reorders `current.notes` and calls `saveNow()` — it writes. Selection that
writes is not the inert state this whole argument rests on. It is also unnecessary:
`#selection` is a dedicated overlay at z-index 3, above every note (z-index 2 per the parent
plan's Selection model section), so a selected note reads on top regardless of its position
in `current.notes`. Surfacing stays exactly where it is today: bound to drag start and to
edit entry, both of which already write.

### 4. Selection is exempt from `handleTap`'s blanket drop-guard, not just from `delayAction`'s

Two independent guards exist in the codebase today, not one:

- `delayAction`'s own guard, `app.js:396` — `if (pendingAction) return;` — refuses to *open*
  a second window while one is running.
- `handleTap`'s guard, `app.js:420` — `if (pendingAction) return;` **before the `switch`** —
  refuses to *dispatch* any tap at all, to any target, while a window is open. This is
  stricter: it isn't specific to actions, it drops the tap before target classification even
  matters.

Selection has to route through `handleTap`, not a native click listener — `setPointerCapture`
(`app.js:330`) retargets `pointerup`/`click` to `#board`, which is why the parent plan's
selection buttons face the identical problem (its Selection model section: "Buttons must
route through the recognizer, not native click listeners"). Because selection dispatches
through `handleTap`, it inherits `app.js:420` by default — and if it did, "instant selection"
would only be instant when nothing else happened to be in flight. Click Delete on note A,
then immediately click note B: the second click lands inside A's still-open 400 ms window
and is dropped by `app.js:420` before it is ever classified as a selection tap. The result is
a 400 ms dead zone where clicks land on nothing — the exact failure mode this decision exists
to eliminate, just relocated to sit after every action instead of after every selection.

**Resolution: the guard at `app.js:420` moves from the top of `handleTap` into the branches
that call `delayAction`**, rather than being deleted. B18(d) — "taps inside an open window
are dropped, not queued" — is preserved exactly where it does real work: two clicks on the
canvas 100 ms apart still can't create two notes, two clicks on a note still can't queue two
deletes. It simply stops applying to targets that were never going to call `delayAction` in
the first place.

This is safe because `delayAction`'s closure captures its acknowledgment node and its `fn`
at the moment of the original click (`app.js:395`, arguments bound in the call, e.g.
`app.js:430`: `delayAction(target.node, () => { ... })`). Whatever note or lot item is
selected 400 ms later has no bearing on which note the pending action fires against — the
target was fixed at click time, not read at fire time.

**Stated consequence, not left to be discovered in testing: deselecting does not cancel a
pending Complete or Delete.** The 400 ms window is an acknowledgment of a decision already
made, not a cancellation grace period — B18 commits at the *click* that opened the window; a
subsequent click just happens to release before the timer fires. The cancellation path that
exists is the separate 5 s Undo toast (`app.js:704`), unaffected by any of this. An
alternative — deferring the overlay's teardown until the pending action actually fires, so
dismissal always waits out whatever's in flight — was considered and rejected: it reintroduces
exactly the responsiveness lag this decision removes, on a schedule the user didn't
trigger and can't predict (0–400 ms depending on when the other action happened to start).

### 5. "Instant" is measured from release, matching B18's own convention

B18: "measured from release, not press, because a click is complete at release." Selection
follows the identical rule — it applies on the frame the recognizer dispatches the tap
(`app.js:373`, gated on `mode === 'pending' && !longPressed && !moved`), which is also the
earliest point the recognizer can know a completed tap happened at all; `moved` and
`longPressed` aren't settled until release. A **drag selects on drop, not on pointerdown** —
a cancelled gesture (`g.mode = 'cancelled'`, `app.js:354`) leaves selection exactly as it
found it, matching how the recognizer already treats every cancelled gesture elsewhere, and
means no selection chrome trails a note that's still being dragged.

### Full timing table

**Instant, no `delayAction` window:** select a note, replace a selection, deselect
(including the creation-surface deselect from decision 5, #12), Escape, drag-then-drop
select, the desktop `focusin` keyboard-select branch, double-click → edit entry.

**Keep the 400 ms window:** `sel-btn` Complete / Restore / Delete, canvas note creation, lot
whitespace item creation, board swap / new-board / delete-board, the Undo toast button, and
(mobile only, unaffected by this decision) the long-press menu items.

### Impermanence

The load-bearing claim is that selection stays categorically inert — no write, no persisted
consequence. If a later feature gives selecting a note a side effect (surfacing on select
after all, a remembered "last selected" marker, anything persisted), this entry's ground is
gone and the timing has to be re-argued from whatever that new write is, not inherited from
here. The 350 ms double-click pairing window is likewise a felt value in the same sense B18's
400 ms is (B18, "Impermanence") — re-interrogate on the device, don't defend the number.

## What implementation changes

Step 5 of the parent plan. All `isDesktop`-gated; **mobile's `handleTap` is byte-for-byte
unchanged**, including every existing `delayAction` call.

- `handleTap` (`app.js:419`): the blanket `if (pendingAction) return;` currently at
  `app.js:420` moves into the branches that call `delayAction` (the desktop equivalents of
  the `note`/`lot-item`/`anchor`/`canvas`/`lot` cases, plus `sel-btn`). Desktop's select /
  deselect / edit-entry branches sit above that guard and are unaffected by an open window.
- `select(id)` / `clearSelection()` are called directly, never through `delayAction`, and
  neither calls `saveNow` nor `surfaceNote`.
- `sel-btn` dispatch keeps routing through `delayAction`, with the clicked button as the
  acknowledgment node — same shape as every existing action call site.
- Tap-pairing (~350 ms) drives double-click: the second click on an already-selected note
  calls `surfaceNote` + `editText` (no coords → `caretToEnd`) directly, no `delayAction`.
- The desktop keydown handler's Escape (deselect) and Enter (edit selected) are direct, not
  delayed; Delete/Backspace (delete selected) keeps `delayAction` — it's a B18 action.

## Blocked on

- **Decision 1 — desktop detection (#8)**: supplies the `isDesktop` flag every branch above
  is gated on.
- **Decision 5 — canvas click semantics (#12, PR #31, `CANVAS-CLICK-DESKTOP.md`)**: its §3
  already sharpened this decision — deselection from a creation-surface click must open *no*
  window, not merely be instant, so the immediately-following click can place a note at any
  speed. That spec cites this one for the categorical ground; this one confirms it.

**Coupled, not blocking:** decision 4 (#11, PR #30, `PARKING-LOT-DESKTOP.md`) already lists
this decision in its own *Blocked on* section — its double-click grammar for lot lines
depends on instant selection, and every timing rule above applies to lot lines identically
to notes. Review finding 4 (#20) is why selection has to route through `handleTap` at all
(`setPointerCapture` retargeting); finding 6 (#22) is this decision's companion finding.

## Draft `DECISIONS.md` entry — paste when implementation lands

> **Numbering:** take the next free `B` number at paste time. Do **not** assume a specific
> number — the nine decision branches are resolving in parallel and claiming numbers as they
> merge (PR #28 already claims B19 for the board pane). The number is assigned when the
> entry lands, not when it is drafted.

> ### B__. Desktop selection and edit entry are instant; B18 governs actions only
>
> Selecting a note, replacing a selection, deselecting, and entering the editor via
> double-click are all **instant** on desktop and open no `delayAction` window
> (`app.js:395-403`). Complete/Restore/Delete, board create/swap/delete, and note/lot-item
> creation keep the existing 400 ms window unchanged. Mobile's `handleTap` is untouched in
> every state.
>
> **Ground:** B18's window exists to acknowledge a *consequence* before it lands (B18(a)).
> Selection and edit entry have none — both commit nothing, write nothing, and are undone by
> clicking elsewhere. A selection's own appearance (frame, handles, buttons) is its
> acknowledgment; delaying it would mean acknowledging an acknowledgment. This is the
> durable reason. The mechanical one — `delayAction` drops taps inside an open window
> (B18(d)), so a delayed selection would swallow the second click of every double-click — is
> a confirming consequence of the same fact, not the ground itself: it holds because
> selection has nothing to wait for, not the other way around. Selection being instant is
> also what lets double-click-to-edit cost nothing — the conventional alternative (defer the
> single click until the pairing window expires) is a delay of its own kind, avoided here
> only because the first click is free to act immediately and be superseded.
>
> **Selecting a note does not call `surfaceNote`.** Surfacing writes (`saveNow`) and would
> make selection non-inert; it's also unnecessary, since the `#selection` overlay renders
> above every note (z-index 3 vs. 2) regardless of list order. Surfacing stays bound to drag
> and to edit entry, both of which already write.
>
> **The `handleTap` blanket guard (`app.js:420`) does not apply to selection.** A second,
> stricter guard beyond `delayAction`'s own (`app.js:396`) sat at the top of `handleTap` and
> dropped *any* tap — not just action taps — while a window was open. Left in place it would
> have made "instant selection" true only when nothing else was mid-action: clicking a
> different note immediately after clicking Delete on the first would land inside the first
> action's window and be silently dropped, reproducing the same dead zone this decision
> removes. The guard moves into the branches that call `delayAction`, preserving B18(d)
> (one action in flight, no double-fire) exactly where it matters and nowhere else. This is
> safe because `delayAction`'s closure binds its target at the original click, so a pending
> action always resolves against the note it was aimed at regardless of what's selected when
> it fires.
>
> **Deselecting does not cancel a pending action.** The 400 ms window acknowledges a
> decision already made at click time; it is not a cancellation grace period. The
> cancellation path is the existing 5 s Undo toast. Deferring overlay teardown until a
> pending action fires was rejected — it reintroduces the lag this decision removes, on a
> schedule the user didn't trigger.
>
> **Timing measured from release**, matching B18's own convention and the recognizer's
> tap-dispatch point (`app.js:373`); a cancelled drag (`g.mode = 'cancelled'`) leaves
> selection untouched, same as every other cancelled gesture.
>
> **Impermanence:** rests on selection staying categorically inert. If selecting ever
> acquires a persisted side effect, the timing has to be re-argued from that write, not
> inherited from here.
