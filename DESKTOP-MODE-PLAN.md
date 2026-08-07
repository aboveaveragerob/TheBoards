# Desktop Mode for TheBoards — Implementation Plan (Issue #4)

> **Status: awaiting review.** This is a plan, not an implementation — per the request, no solution is built until the nine flagged decisions below are confirmed or vetoed. Reply on the PR (or the issue) with any changes; each decision ships with a recommended default so a simple "approved" is enough to start.
>
> **Resolved so far:** decision 3 (board create/delete on desktop) — see [issue #10](https://github.com/aboveaveragerob/TheBoards/issues/10). Its DECISIONS.md entry lands with the implementation, folded into the pane entry pre-allocated in step 8.

## Context

TheBoards is a spatial, offline-first to-do PWA — vanilla HTML/CSS/JS, no build step — designed mobile-first (Samsung Z Fold primary). The whole app is one logical sheet (`LOGICAL_W = 900` fixed; height derived from viewport aspect; one uniform `renderScale`), driven by a touch gesture recognizer: tap to capture, drag to move, **pinch to scale**, **long-press for the Complete/Boards/Delete menu**. Issue #4 asks for a desktop (mouse-and-keyboard) mode: today a mouse user literally **cannot resize a note** (pinch is the only scale gesture), long-press-with-a-mouse is an alien gesture, and a 16:9 monitor renders the aspect-derived sheet as a squat, oversized page. The issue defines a select-then-act model for notes and an always-visible left board pane replacing the full-screen board list.

Binding constraints (from `DECISIONS.md` — PRD.md/UIUX.md are referenced but not in the repo):

- **B17 — positions permanent**: committed note positions are never re-clamped by layout changes.
- **B18 — the 400 ms acknowledged action window**: every click *action* commits 400 ms after release via `delayAction()`; taps inside an open window are dropped.
- **B9 — OS back is never intercepted**: list routing uses pushState/popstate; desktop must not disturb it.
- **§8 motion is a closed, justified set** with a global `prefers-reduced-motion` kill-switch.
- Both themes derive from the `--paper`/`--ink` poles. The muted red (`--danger`) and muted green (`--accent-restore`) the issue asks for **already exist as tokens**.
- Mobile must remain pixel-identical.

## Requirement → code mapping

| Issue requirement | Where it lands |
|---|---|
| Click note → select, not type | Selection state gating `handleTap`'s note branch (`app.js` §7/§8) |
| Drag outlined frame → scaled resize | New recognizer branch sharing pinch math (`note.scale`, 0.5–2.0 clamp, `setHitInset`) |
| Double-click → edit, caret at end | Recognizer tap-pairing + existing `editText` no-coords path (falls through to `caretToEnd`) |
| Remove click-and-hold menu | Gate `g.longPressTimer` + `attachRowGestures` long-press behind `!isDesktop`; the menu *surface* stays — for mobile, and on desktop for pane-card right-click (decision 3) |
| Complete/Delete buttons under selected note | New `#selection` overlay; actions reuse `completeNote`/`restoreNote`/`deleteNote` + `delayAction` |
| Muted red / muted green, contrasting text | Existing `--danger`/`--accent-restore` as fills paired with `--paper` text (contrast verified below) |
| Expand width, scale-to-fit, no distortion | Desktop branch in `applyLayout` — min-anchored uniform scale (below) |
| Right side = new note surface | Falls out of wider `LOGICAL_W`; all clamps already read `LOGICAL_W` (becomes `let`) |
| Left pane, darker, embedded/sunken | Unscaled fixed `<aside id="pane">`; `--offx` (already plumbed through `toLogical` + board transform) shifts the sheet right — zero per-note math changes |
| 5–6 compact cards, ~6–7 words wide, newest first | `renderPane()` reusing `renderList` row logic (`createdAt` desc, untitled + date fallback) |
| Click card → swap board, minimalist animation | `swapBoard(id)` — direct load + `renderBoard()`, no history push, ~150 ms crossfade added to §8 |

## ⚠️ Open decisions — flagged for your input (recommended defaults applied)

These are the gaps, contradictions, and judgment calls the issue leaves open. Each carries a **recommended default you can veto before implementation**. None is silently baked in.

1. **Desktop detection** — *Default: `(min-width: 1024px) and (hover: hover) and (pointer: fine)` via `matchMedia`, live-switched.* Pointer capability (not width alone) excludes tablets, per "not including tablets." A touch-laptop with a mouse qualifies; an iPad Pro at 1366 px does not.
2. **Pane geometry** — the issue has an internal tension: "always-visible pane" implies full height, but "5–6 compact cards before scrolling" caps the visible list (compact cards on a full-height 1080p rail show 12+). *Default: full-height sunken rail, compact cards stacking from the top, scrolling only when boards outgrow it* — treating "5–6" as the expectation at typical board counts, not a hard cap.
3. **Board create/delete on desktop** — ✅ **resolved (issue #10).** The issue is silent, yet both currently live in surfaces desktop removes (list-view button; long-press on rows) — without new affordances desktop cannot create or remove boards at all. Confirmed in placement (both live in the pane, reusing the existing `deleteBoard` 5 s-undo flow), sharpened in form, because the default left both controls' *shape* unexamined:

   - **Create is the existing filled button, at the top of the pane.** `#new-board` reused as-is — unmistakably a control, and consistent with the list header the pane replaces. It carries real weight in a sunken rail, which is accepted deliberately: the one thing a board picker must never make you hunt for is the way to start a new board.
   - **Delete has two paths, and neither is hover.** The visible path is **open the board, then delete it**: the delete control is permanently present on the **active card** — the card for the board you're currently in — in **A1**'s grammar (`GLYPH.delete` in `--danger`, hairline-separated). One control on one card, so nothing is revealed, nothing reserves width on inactive cards, and no card reflows. Deletion stays a deliberate act with the board's contents in front of you, which is what mobile's 500 ms long-press bought and what a hover glyph would have thrown away.
   - **Right-click on any card is the second path.** `contextmenu` on a pane card opens the **existing menu** with the red Delete item — restoring the mobile list's ability to remove a board without opening it, without putting a destructive control on every card at rest. It is the same menu, the same item, the same act; only the gesture that summons it is desktop-native. Right-click is also the one gesture the issue's "remove click-and-hold" doesn't touch: it is not a hold, and it collides with nothing else in the app.
   - **No confirm step; Undo pays for it.** Both paths converge on `deleteBoard`: the 400 ms acknowledged window (B18) → delete → 5 s Undo toast. Same protection every other destruction in this app has.
   - **Impermanence:** the two-path split holds until board counts get high enough that "open it to delete it" becomes the common case rather than the careful one — at which point the right-click path is already there to promote. The active-card control and the context menu are independent; either can be re-interrogated without disturbing the other.
4. **Parking Lot lines** — removing click-and-hold removes their **only** Complete/Delete path; the issue's frame model doesn't cover them (unframed flow lines). *Default: same select / double-click-edit grammar as notes (no resize), with buttons inline at the row's right edge* — `#lot-items` has `overflow: hidden`, so buttons-below would clip on the last row, and the right end of a full-width row is its natural action position.
5. **Canvas click while a note is selected** — tap-canvas-creates-a-note is the app's capture-first identity, but desktop users will click canvas to dismiss selections. *Default: click deselects when a selection is active; creates a note (existing ghost + 400 ms flow) only when nothing is selected.*
6. **Selection timing vs. B18** — *Default: selection/deselection is **instant**; Complete/Delete/board-swap/create keep the 400 ms window.* This is not merely taste: `delayAction` **drops** taps while a window is open, so a delayed selection would swallow the second click of every double-click — delayed selection and double-click-to-edit are mechanically incompatible. Recorded as a DECISIONS entry.
7. **"Most recent" ordering** — *Default: `createdAt` descending,* matching the existing list view and stable — `updatedAt` ordering would make the currently-edited board's card jump around inside an always-visible pane.
8. **Cross-device data consequence** — notes placed on desktop's wider canvas (x > 900) are **off-screen on a phone** until reopened on a wide viewport (invisible but preserved; they return intact). This follows B17 — the codebase already accepts the same tradeoff vertically for portrait↔landscape. *Default: keep truthful positions; documented, not "fixed."* (Desktop y stays ≤ ~1000, which always fits tall phone sheets, so only the x-axis is affected; the Parking Lot has no x/y and is fully portable.)
9. **Anchors (title/components/requirements)** — remain **direct-edit on click** (the issue: "title cards … remain a fixed component"). They can't move, resize, complete, or delete, so selection would be an empty state for them.

## Architecture (validated against the code by an independent review pass)

### Desktop detection
`matchMedia` → `isDesktop` flag + `desktop` class on `<html>` (single source of truth; CSS gates on the class, not duplicate media queries). Mode-flip teardown: clear selection, `closeMenu()`, **`history.back()` if `listOpen`** (routes through the existing `popstate` → `showBoardFromList()`, keeping B9 intact — merely hiding the list would leave a stale history entry that resurrects it on the next OS back), and null out `g`/`pointers`/long-press timers so a half-finished gesture can't fire in the wrong mode.

### Geometry — min-anchored axis inversion
Desktop branch of `applyLayout()` (mobile branch stays byte-for-byte):

```
renderScale = Math.min(vh / 1000, (vw − PANE_W) / 900)   // PANE_W = 300 CSS px
LOGICAL_H   = vh / renderScale                            // ≥ 1000
LOGICAL_W   = (vw − PANE_W) / renderScale                 // ≥ 900
offX = PANE_W; offY = 0
```

Uniform scale (no distortion), both axes fill exactly (no letterbox), and **neither logical dimension ever drops below the 900×1000 reference** — so mobile-placed notes always fit even in a narrow desktop window, and top furniture (216+400+216 + margins ≈ 880 units) never collides. On typical wide screens this degenerates to the pure `vh/1000` inversion, and the right side becomes the issue's "additional surface."

Wiring fixes this depends on: `applyLayout` currently hardcodes `--offx` to the literal `'0px'` and `#board` hardcodes `width: 900px` — both become variable (`--offx: offX`, `width: var(--logical-w, 900px)`); mobile writes the same `900px`/`0px` as today. `LOGICAL_W` becomes `let` (its clamp sites in `createNote`/`updateDrag`/`updatePinch`/`makeTapGhost` all read it). `toLogical()` already subtracts `offX`, so stored note x stays canvas-relative on both devices.

Furniture CSS becomes width-agnostic — **arithmetically identical at 900** (mobile pixel-safe): requirements `left:660` → `right:24` (900−660−216=24); lot `width:852` → `left:24; right:24`; title `left:250;width:400` → `left: calc(50% − 200px)` (center 450 = sheet center; `calc` over `translateX` to avoid a new stacking context). On desktop the title centers over the canvas, requirements pins to the true right edge, the lot spans the full width.

### Selection model
Single `#selection` overlay div appended to `#board` (z-index 3, above notes at 2) holding the outlined frame, corner handles, and the two buttons — positioned in logical units from the note's transform-independent footprint (`node.offsetWidth × note.scale`, the same math `updateDrag` uses). It inherits `renderScale` but **never** `note.scale`, so the selection chrome stays constant-weight at any note size. Counter-scaled children inside `.note` were rejected (per-note var threading + collision with the `::before` hit expander).

**Buttons must route through the recognizer, not native click listeners**: `onPointerDown` calls `el.board.setPointerCapture()`, which retargets `pointerup` (and the derived `click`) to `#board` — button listeners inside `#board` are unreliable by construction. `classifyTarget` gains `sel-btn` / `sel-frame` types (checked before `.note`); `handleTap` dispatches them.

Interaction: first click on a note → instant select; second click on the same note within ~350 ms → clear overlay, `editText` (no coords → `caretToEnd`). Drag still moves directly and selects. Edit and selection are mutually exclusive (focus ring is the edit affordance); commit-on-blur does not reselect. Completed notes: selectable, button 1 reads **Restore** (mirrors `openMenuFor`'s state branch), no edit on double-click (same `state === 'active'` guard as mobile). Keyboard/AT: desktop `focusin` branch selects instead of auto-editing (Enter edits); the existing `if (pointers.size) return` guard already keeps mouse clicks out of that path. Overlay reposition/clear hooks: `updateDrag`, resize, `input` (text growth), `applyLayout`, `renderBoard` (rebuilds notes → clear), `deleteNote`/`removeNoteSilently`.

### Resize
Pointerdown on `sel-frame` → `g.mode = 'resize'`: `scale = clamp(startScale · dist(pointer, note origin)/dist(grab, origin), 0.5, 2.0)` — top-left origin, so no drift (B4). Extract the shared tail of `updatePinch` (apply transform, re-clamp footprint into the page, `setHitInset`) into `applyNoteScale(note, node, scale)` used by pinch and resize; release follows the `endPinch` pattern (`saveNow`). `cursor: nwse-resize` on frame/handles.

### Action buttons — palette (verified contrast, WCAG)
Rest: `background`/`border` in the token, `color: var(--paper)` — the stylesheet's own law ("every fill pairs a token with `--paper`, so both themes invert by construction"):

| Pairing | Light | Dark |
|---|---|---|
| paper on `--danger` (Delete) | ≈ 6.6:1 | ≈ 8.4:1 |
| paper on `--accent-restore` (Complete/Restore) | ≈ 6.3:1 | ≈ 9.9:1 |

All ≥ AA. `.tapped` acknowledgment drains per the `#new-board` precedent (`background: var(--paper); color: <token>`; border keeps the token) — inverted pairs have identical ratios by symmetry. Both route through `delayAction` (B18 intact for actions).

### Board pane
`<aside id="pane">` as first child of `#board-view`, before `#board` — outside the board, so the recognizer never sees its events. `position:absolute; inset-block:0; left:0; width:300px; overflow-y:auto; overscroll-behavior:contain`; hidden unless `html.desktop`. New derived token `--pane` in both theme blocks (slightly darker than `--paper`: light ≈ `#E2DEE4`, dark ≈ `#141118`), sunken via inset box-shadow + `--hairline` right seam.

- **`openBoardById()` and `newBoard()` cannot be reused as-is** — both end in `history.back()` (mobile-list-shaped). Extract `swapBoard(id)`: `saveNow()` (safe — `persist()` snapshots `current` synchronously) → `idbGet` → `current = rec` → crossfaded `renderBoard()` → `renderPane()`. Desktop new-board = create + `idbPut` + same swap. No history push → mobile `popstate` handler untouched.
- **`deleteBoard()` needs a desktop wrapper**: (a) its undo callback calls `renderList()` — generalize to `refreshBoardsUI()` (list on mobile, pane on desktop); (b) deleting the *open* board sets `current = null` — on desktop the dead board would stay on screen and the next interaction dereferences `current.notes` → **crash**. After delete: if `current === null`, run the existing `ensureCurrentValid()` (picks most-recent-by-`updatedAt` or creates a blank) + `renderPane()`; undo restores the record and swaps back if it was open.
- Cards: shared row-content helper with `renderList` (title / `COPY.untitled` + `formatDate`), `createdAt` desc, `.active` mark by `current.id` (structural — ink weight, not color alone). Live title: the anchor `input` handler updates the active card's title span per keystroke (no full re-render); full `renderPane()` on boot/swap/new/delete/undo/title-commit.
- Create/delete affordances, per resolved decision 3:
  - **New board** reuses `#new-board`, pinned above the card stack. Its rule (`styles.css › #new-board`) and its `.tapped` drain generalize from an ID selector to a class shared by both instances — same declarations, re-scoped, so mobile stays pixel-identical. It needs its own listener: `newBoard()` ends in `history.back()`, so the pane's button is create + `idbPut` + `swapBoard()` (per the extraction above), through its own `delayAction`.
  - **Delete on the active card** is the last child of `.pane-card.active` only — `GLYPH.delete` in `--danger`, hairline-separated, `.tapped` fill — a sibling `<button>` rather than nested inside the card's own button, so the card stays one clean swap target and the glyph is its own tab stop. No `:hover`/`:focus-within` reveal and no reserved slot on inactive cards: the control exists on exactly one card, and `renderPane()` already re-renders on every swap.
  - **Right-click on any card** is `contextmenu` → `preventDefault()` → `openBoardRowMenu(card, board, x, y)` — the existing one-item danger menu, unchanged. `buildMenu` already gives it viewport-clamped positioning, a Tab/arrow focus trap, Escape-to-close, outside-`pointerdown`-to-close, and `delayAction` routing, so **no new menu code is written**. Four details: `preventDefault()` is scoped to `.pane-card` (right-click elsewhere keeps native behavior); card swap binds to `click`, which never fires for the secondary button, so a right-click can't swap as a side effect; Shift+F10 and the context-menu key fire `contextmenu` with `clientX/clientY` of 0, so fall back to the card's `getBoundingClientRect()` when the coords are non-positive; and `closeMenu()` doesn't restore focus, so return it to the card that opened the menu.
  - All three route through `delayAction` (B18 intact for actions).
- **Crossfade sequenced with `setTimeout`, not `transitionend`** — the reduced-motion kill-switch zeroes transitions and `transitionend` would never fire (the existing `leave()` helper already establishes the setTimeout pattern). ~150 ms, added to the §8 motion set with a DECISIONS entry. A `swapping` flag guards async re-entrancy beyond `delayAction`'s 400 ms window.

### Keyboard (additive — beyond the issue, flagged)
One desktop-gated `document` keydown: **Escape** = blur edit, else deselect; **Delete/Backspace** = delete selected **only when `!isEditing(document.activeElement)`** (otherwise typing backspace nukes the note under you); **Enter** = edit selected at end.

**This handler must bail while `menuOpen`.** Decision 3 puts a right-click menu on pane cards, so the menu *does* open on desktop — and `menuKeyHandler` is registered capture-phase but calls only `preventDefault()`, never `stopPropagation()`, so both handlers would run on the same keypress: Escape would close the menu **and** clear the note selection, and Delete/Backspace would destroy the selected note while focus sits inside the open menu. One guard at the top of the handler covers both.

## Codebase review — breaks, gaps, and clashes found

1. **Cross-board Undo bug (pre-existing, desktop-amplified).** `deleteNote`/`deleteLot` undo callbacks splice into `current` *at undo time* — delete a note, switch boards within 5 s, tap Undo → the note resurrects **onto the wrong board**. The always-visible pane makes this a one-click accident. In scope: board swap (and mobile board-open) finalizes any pending Undo via `hideToast()` (the delete is already persisted).
2. **`deleteBoard` desktop crash + wrong-surface re-render** — see Board pane above.
3. **Hardcoded layout literals** — `--offx: '0px'` in `applyLayout` and `#board { width: 900px }` in CSS both contradict variable-width desktop; become vars (mobile values unchanged).
4. **`setPointerCapture` breaks native clicks inside `#board`** — selection buttons must be recognizer-routed (see Selection model).
5. **`focusin` auto-edit fights click-to-select** — resolved by the desktop branch; the pointer guard already isolates the keyboard path.
6. **`delayAction`'s drop-guard makes delayed selection impossible** — the mechanical forcing function behind flagged decision 6.
7. **Narrow desktop windows** — resolved structurally by the min-anchored scale formula (`LOGICAL_W` floors at 900; furniture never collides), rather than accepted as clipping.
8. **`history.back()` baked into `openBoardById`/`newBoard`** — desktop needs the extracted `swapBoard`; popstate flow untouched for mobile (B9).
9. **`sw.js` cache-first** — bump `CACHE` to `todo-boards-v3` or installed clients never receive the change.
10. **Mode flip edge cases** — stale list history entry (fix: `history.back()` on flip), half-finished gestures (fix: null recognizer state), mid-edit flips (safe: teardown never blurs, `focusout` commit still runs).
11. **No mobile regression surface**: the only change touching mobile rendering is the width-agnostic furniture refactor, equivalence-proven at 900 and screenshot-checked; every behavior change is `isDesktop`-gated; long-press gating is `!isDesktop`, never removal.

## Implementation steps (ordered for review)

1. **Furniture CSS made width-agnostic** (pure refactor, provably identical at 900) + `--logical-w`/`--offx` wiring in `applyLayout`. Screenshot-verify mobile.
2. **Mode module**: `PANE_W`, `isDesktop` matchMedia + `html.desktop`, `applyMode()` teardown (selection, menu, list-state pop, gesture nulling), long-press gating.
3. **Geometry**: `LOGICAL_W` → `let`; desktop `applyLayout` branch (min-anchored formula).
4. **Pane**: markup (`index.html`), `--pane` tokens + sunken styles, `renderPane()`/`swapBoard()`/`refreshBoardsUI()`/desktop new+delete wrappers, `#new-board` rule re-scoped to a class, card `contextmenu` → `openBoardRowMenu` (+ the `menuOpen` guard on the desktop keydown handler, step 7), live-title hook, crossfade (+ §8 entry), Undo-finalize-on-swap (finding 1).
5. **Selection + buttons**: `#selection` overlay + styles, `classifyTarget` additions, `handleTap` desktop branches (instant select / tap-pairing edit / canvas deselect-first / `sel-btn` via `delayAction`), drag-selects, reposition/clear hooks, completed→Restore.
6. **Resize**: extract `applyNoteScale` from `updatePinch`; `resize` gesture branch; cursors.
7. **Lot lines + keyboard**: lot select + inline right-edge buttons; desktop `focusin` branch; Escape/Delete/Enter.
8. **Ship hygiene**: `sw.js` → v3; DECISIONS entries B19–B23 (detection + geometry + pane-replaces-list incl. the resolved decision 3 create/delete affordances (filled New board button; delete visible on the active card only, plus right-click → the existing A1 menu on any card; Undo in place of a confirm step), instant selection vs B18, caret-at-end vs B14, motion additions, cross-device x tradeoff + lot-item resolution); README desktop section.

## Verification

`python3 -m http.server 8000`, exercise in Chromium (no test suite exists; verification is behavioral):

- **Desktop (≥1024 px, mouse)**: click-select vs double-click-edit (caret at end); frame-drag resize against the 0.5–2.0 clamp; Complete/Restore/Delete buttons incl. 5 s Undo; no menu on press-and-hold anywhere (notes, lot, anchors, pane cards); pane order/active mark; New board button (drains through the 400 ms window, new board opens); delete glyph present on the active card only and moving with it across swaps, its click never swapping the board; right-click any card → red Delete menu (positioned at the pointer, clamped near the viewport edges, Escape closes it *without* also clearing the note selection, Delete/Backspace inert while it's open, focus returns to the card, right-click elsewhere still gets the native browser menu, Shift+F10 on a focused card opens it at the card rather than the corner, right-click never swaps the board); deleting the *open* board by either path (pane re-renders onto a valid board, Undo restores and swaps back); swap crossfade; canvas deselect-then-create; lot-line select/complete/delete; Escape/Delete/Enter; both themes; `prefers-reduced-motion` (swap instant, still sequenced).
- **Narrow desktop window** (~1024×900): `LOGICAL_W` floors at 900 — no furniture collision, mobile-placed notes all visible.
- **Mobile emulation**: tap-create, drag, pinch, long-press menu, list view + OS back, B18 acknowledgments — pixel/behavior-identical; furniture unchanged at 900.
- **Mode flip**: cross 1024 px both directions mid-selection, mid-edit, and with the list open — clean teardown, no stuck gesture, no resurrected list on OS back.
- **Cross-device data**: notes on desktop's right expanse → mobile width (off-canvas but intact in IndexedDB) → widen (they return). Parking Lot fully portable.
- **Undo-across-boards**: delete a note, immediately swap boards → toast finalizes, no wrong-board resurrection.
- **Service worker**: v3 cache serves the new build after one reload cycle.
