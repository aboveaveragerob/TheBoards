# Parking Lot lines on desktop — resolved spec (issue #11)

> **Status: decision resolved, implementation pending.** This closes open decision 4
> of 9 from [`DESKTOP-MODE-PLAN.md`](https://github.com/aboveaveragerob/TheBoards/blob/claude/desktop-view-planning-1nd3sq/DESKTOP-MODE-PLAN.md)
> (PR #7, planning issue #4). No code changes here — the parent plan holds
> implementation until all nine decisions are confirmed, and this one is downstream of
> three that are still open (see *Blocked on* below). The `DECISIONS.md` entry is
> drafted at the bottom of this file, ready to paste **when the implementation lands**,
> not before: `DECISIONS.md` records what v1 ships, and this does not ship yet.

## The problem

Removing click-and-hold removes the **only** Complete/Delete path a Parking Lot line
has. `openMenuFor` (`app.js:732`) is reached solely from the 500 ms long-press timer
armed in `onPointerDown` (`app.js:312`); issue #4 removes that gesture on desktop.

Issue #4's replacement grammar — select the frame, reveal Complete/Delete beneath its
bottom edge — is written for `.note`: absolutely positioned, carrying `x`, `y`, and
`scale`. A lot item is `{ id, text, state }` with **no geometry at all** (`app.js:136`,
DECISIONS B6), rendered as a full-width flow row inside `#lot-items`. There is no frame
to hang buttons under and no bottom edge that means anything. The grammar does not
transfer unmodified.

## Resolution

| | Resolution | Origin |
|---|---|---|
| Grammar | Same as notes — click selects, double-click edits, Complete/Delete (Restore/Delete when complete). No resize. | Plan default, **confirmed** |
| Button placement | Pinned to the row's **right edge** | Plan default, **confirmed** |
| Selected state | The selected row **draws a frame** | Plan default **overridden** |
| Lot height | The lot **grows taller** on desktop | **Added** to scope |

### 1. Grammar — the same one, minus what lot lines don't have

Single click selects. Double-click on an active row enters edit with the caret at the
end — `editText` with no coordinates already falls through to `caretToEnd`
(`app.js:454-459`), which is exactly issue #4's requirement for notes. A completed row
is selectable and offers **Restore**/Delete, but double-click does not edit it, gated by
the same `state === 'active'` check the mobile lot branch already uses
(`app.js:439`).

**No resize.** Lot items have no `scale` and no `x`/`y`. Resize on a full-width flow row
would either do nothing or mean something different from what it means on a note, and a
grammar that reuses a gesture for a second meaning costs more than the gesture is worth.

Selection is **instant**, not delayed. This is not a taste call: `delayAction` *drops*
taps while its window is open (`app.js:396`), so a delayed selection would swallow the
second click of every double-click. Delayed selection and double-click-to-edit are
mechanically incompatible. Actions (Complete/Restore/Delete) keep the 400 ms window —
B18 is intact where it applies.

### 2. Buttons at the row's right edge

Buttons-below is not available: `#lot-items` is `overflow: hidden` (`styles.css:142`), so
a strip rendered under the last visible row is clipped away — the one row most likely to
be acted on would be the one whose controls vanish. The right end of a full-width row is
its natural terminus and the position a reader's eye already travels to.

The cost, recorded honestly: on a wide desktop canvas the lot spans the full sheet, so
the controls can sit a long way from the words they act on. The alternative — buttons
trailing the last word — keeps them adjacent but was not chosen. Right-edge alignment is
stable and predictable; that is what it buys.

**Implementation notes**

- **Build the strip lazily on selection; remove it on deselect.** `makeLotEl`
  (`app.js:261`) stays byte-identical, so the mobile DOM is untouched and `deleteLot`'s
  undo path (`app.js:672-678`, which rebuilds through `makeLotEl`) restores a correctly
  unselected row for free.
- **Append the strip after `.lot-scratch`.** `applyCompleteA11y` reads
  `node.firstChild` to find the text (`app.js:283-284`); anything inserted ahead of
  `.lot-text` mislabels the row for AT.
- **The strip needs `z-index: 3`.** `.lot-scratch` is `inset: 0; z-index: 2`
  (`styles.css:220-231`) at `0.97` opacity when complete — it covers the entire row, so
  Restore/Delete would be scratched out underneath it otherwise.
- **Reserve the strip's width with `padding-right` on `.lot-item`, unconditionally on
  desktop.** `.lot-text` is `width: 100%` (`styles.css:155`); shrinking it only while
  selected would rewrap a long line the instant it is clicked, so the act of selecting
  would move the text being selected. Reserving permanently costs nothing visible — an
  unselected row is unframed, and a selected one has the buttons occupying that space, so
  the frame shows no empty gutter.
- **Route the buttons through the recognizer, never a native `click` listener.**
  `onPointerDown` calls `setPointerCapture` on `#board`, which retargets `pointerup` and
  the derived `click` to `#board` — listeners on elements inside `#board` are unreliable
  by construction. Add a `lot-btn` type to `classifyTarget` (`app.js:299`), checked
  **before** the `.lot-item` branch, and dispatch it in `handleTap`. Actions run through
  `delayAction` with the button as `ackNode`, reusing `completeLot` / `restoreLot` /
  `deleteLot` (`app.js:640-679`) unchanged.
- Palette and the `.tapped` drain follow the parent plan's verified `--danger` /
  `--accent-restore` pairings against `--paper`, per the `#new-board` precedent. B18(b):
  controls fill; only notes may never fill.

### 3. The selected row draws a frame — an explicit override

`styles.css:144` reads: *"Unframed text lines — the one place text is never framed
(§4.4 / §6.5)."* Framing the selected row breaks that rule. The plan's default carried no
frame for exactly this reason; the frame was chosen deliberately, for consistency with
the note selection model, and is recorded as an **override of §4.4 / §6.5**, not an
extension of it.

It is scoped as narrowly as it can be: **desktop only, selected state only, one row at a
time.** Mobile lot rows remain unframed in every state, and an unselected desktop row is
unframed too — the law holds everywhere except the single row the user is currently
acting on.

**Draw it with `outline`, not `border`.** `.lot-item` has no padding, so a border would
shift the text 2 px and change the row's height at the moment of selection. `outline` is
layout-neutral and reuses the vocabulary already present at `styles.css:164`. Use
`var(--ink)` rather than `var(--focus-ring)`: selection and edit are mutually exclusive
so the two never co-occur, but they must not read as the same state.

**Consequence to accept:** a lot row's frame *encloses* its own buttons, where a note's
selection frame *excludes* them (they sit below it). The two surfaces diverge on
containment. They were always going to diverge somewhere — a frameless flow row and a
positioned frame cannot share every rule — and containment is the cheapest place for it,
because it changes nothing about what either control does.

### 4. The lot grows taller on desktop

`#lot` is a fixed `128px` box (`styles.css:130`) and `#lot-items` runs `top: 34; bottom: 0`
→ roughly 94 px of visible rows against a 44 px `min-height`. **Only about two rows are
ever visible, and every row past them is clipped silently** — no scrollbar, no
truncation mark, no indication anything is there. Desktop widens the lot but does nothing
about its height, so the clipping would ship into a mode that has room to spare.

**Desktop:** `#lot { height: 210px }` under `html.desktop` — `34` (rule + header offset)
`+ 4 × 44` (four rows at the hit-target floor) `= 210`. **Mobile keeps `128px` exactly.**

Four rows rather than five or six: the vertical room is not actually free. On a typical
1080p desktop `renderScale = min(1080/1000, (1920−300)/900) = 1.08`, so `LOGICAL_H` lands
at 1000 — the same reference height as mobile. Height taken by the lot comes straight out
of the canvas that issue #4 earmarks as new note surface. 210 is one constant and is
trivially tuned once it is on a real monitor.

**Consequence to accept:** per B17, committed note positions are never re-clamped, so
**notes already placed near the bottom of the sheet will overlap the taller lot.** They
render above it (`.note` is z-index 2, `#lot` is z-index 1), so nothing is hidden,
lost, or unreachable — but the overlap is real, and B17 means the correct response is to
document it rather than to silently move the user's work.

### 5. Lifecycle

Because the buttons sit **in flow inside the row**, there is no reposition math at all —
unlike the note `#selection` overlay, this needs no hook on `applyLayout`, `updateDrag`,
window resize, or text growth. The row carries its own controls.

Clear the selection on: `renderBoard` (it rebuilds `#lot-items`), `deleteLot`, board
swap, desktop↔mobile mode flip, and a click on the canvas or on another row.

A click on lot whitespace currently creates a new item (`handleTap`'s `'lot'` branch,
`app.js:427`). On desktop it **deselects first when a selection is active**, and creates
only when nothing is selected — mirroring decision 5's canvas rule rather than inventing
a second, differently-shaped one for the same situation.

Selection is **single across both surfaces**: selecting a lot row clears any note
selection, and vice versa. One selected thing at a time, app-wide.

### 6. Keyboard / AT

Mostly falls out of the parent plan's desktop `focusin` branch. `.lot-item` is already
`tabindex="0"` (`app.js:265`), so on desktop focus **selects** instead of auto-editing —
`app.js:507-510` is the mobile path to gate. Enter edits, Escape deselects,
Delete/Backspace deletes when focus is not inside an editor.

Buttons carry explicit `aria-label`s. `applyCompleteA11y` puts `aria-hidden` on
`.lot-text` only, never on the row, so the buttons stay reachable on a completed row —
which is exactly when Restore matters most.

## Blocked on

Implementation lands as **step 7 of the parent plan**, and cannot start before:

- **Decision 1 — desktop detection**: supplies the `isDesktop` flag and the `html.desktop`
  class every rule above is gated on.
- **Decision 5 — canvas click while selected**: defines the deselect-then-create rule this
  spec mirrors for lot whitespace.
- **Decision 6 — selection timing vs. B18**: defines instant selection, which the
  double-click grammar here mechanically depends on.

## Draft `DECISIONS.md` entry — paste when implementation lands

> **Numbering:** take the next free `B` number at paste time. Do **not** assume B19 —
> the nine decision branches are resolving in parallel and claiming numbers as they
> merge (PR #28 already claims B19 for the board pane). The number is assigned when the
> entry lands, not when it is drafted.

> ### B__. Parking Lot lines on desktop: same selection grammar, framed, controls inline
>
> Desktop removes the long-press menu (issue #4), which was a lot line's **only** route to
> Complete/Delete. Lot lines take the same grammar as notes — click selects, double-click
> edits with the caret at the end, Complete/Delete (Restore/Delete when complete) — minus
> resize, which has no meaning on a row with no `x`/`y`/`scale` (B6). Selection is instant
> for the reason given in the desktop selection entry: `delayAction` drops taps inside an
> open window, so a delayed selection would eat the second click of every double-click.
> Actions keep the 400 ms window, so B18 holds where it applies.
>
> **Controls sit at the row's right edge, inside the row.** `#lot-items` is
> `overflow: hidden`, so a strip below the row would be clipped on the last visible row —
> the row most likely to be acted on would be the one whose controls disappeared. The
> right end of a full-width row is its terminus. They are built on selection and removed
> on deselect, so `makeLotEl` and the mobile DOM are untouched, and they sit above
> `.lot-scratch` so Restore stays legible on a completed row.
>
> **The selected row is framed — an explicit override of §4.4 / §6.5.** That rule makes
> lot lines "the one place text is never framed," and this breaks it, deliberately, for
> consistency with the note selection model. Scoped as narrowly as it goes: desktop only,
> selected only, one row at a time; mobile rows are never framed in any state. Drawn with
> `outline` rather than `border` so selecting a row does not reflow it, and in `--ink`
> rather than `--focus-ring` so selection and edit never read as the same state.
> Consequence: a lot row's frame encloses its buttons where a note's frame excludes them.
> The two surfaces diverge on containment; a frameless flow row and a positioned frame
> could not share every rule, and containment is the cheapest place to differ.
>
> **The lot grows to 210 px on desktop** (`34 + 4 × 44` — four rows at the hit floor);
> mobile keeps 128 px. At 128 px only ~2 rows are visible and the rest are clipped with no
> scrollbar and no truncation mark — work performed stays visible (PRD §1) is not
> satisfied by a lot that hides its own contents. Four rows and not more because the sheet
> is still ~1000 logical units tall on desktop, so the height comes out of the canvas
> issue #4 earmarks as new note surface. Consequence: per B17 committed positions are
> never re-clamped, so notes already placed near the bottom will overlap the taller lot.
> They render above it and nothing is lost or unreachable — B17 means this is documented,
> not silently corrected by moving the user's work.
>
> **Impermanence:** 210 px is a felt value pending a real monitor, and the frame is the
> one part of this that contradicts a standing law. If the framed row reads as a note on
> device — or if right-edge controls prove too far from their text on a wide canvas — the
> structure above survives both changes; only the frame rule and the constant move.
