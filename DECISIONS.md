# DECISIONS.md — To-Do Boards v1

Where `PRD.md` / `UIUX.md` make a decision, it is followed exactly. This file
records only (a) the one place the two documents conflict internally, and
(b) choices the specs leave silent, each resolved by the **product principles
in PRD §1** (capture precedes structure · relationships asserted not inferred ·
positions permanent · zero cognitive tax · work performed stays visible) and the
**governing design law in UIUX §1/§6** (if you have to think about the
interface, it failed; every pixel earns its place). No principle-resolvable
question was escalated.

---

## A. Resolved internal conflict

### A1. Long-press menu order
PRD §6.6 lists the active-item menu as **“Complete · Delete · Boards.”**
UIUX §7 explicitly names that order *wrong* and mandates the destructive action
**last**: **Complete/Restore · Boards · Delete**, with Delete in `--danger`
separated by a hairline.

**Decision:** follow UIUX §7. It is the rendering authority, it resolves the
conflict *in the document itself* (calling the alternative ordering out by
name), and Delete-last is the safer, convention-correct placement for a
destructive action. Implemented in `app.js › openMenuFor`. Not escalated,
because the spec resolves its own conflict.

---

## B. Silent choices (resolved by the principles)

### B1. Icons — artwork & generation
The specs require 192/512 + maskable icons from the token set but don't specify
artwork. **Decision:** the icon *is* the product's identity motif — a near-square
`--ink` note-frame on `--paper` with two ink “text” lines and a short scratch
stroke (the completion texture). Identity from structure, not costume (UIUX §1).
Generated once by a dependency-free Node script (`node:zlib` PNG encoder) so the
deliverables stay static and buildless; the maskable variant keeps the motif
inside the ~80% safe zone with paper bleeding to the edges.

### B2. `contenteditable` is toggled on only while editing
Notes/anchors/lot lines are made `contenteditable` on entering edit and reverted
on blur, rather than being permanently editable. **Why:** permanent
`contenteditable` fights the gesture recognizer — a tap would focus and open the
keyboard on `pointerdown`, before drag vs. long-press can be distinguished,
breaking capture-vs-manipulate. Toggling gives the recognizer full control
(zero cognitive tax) while keyboard/AT users still enter edit via `focusin`.
`role="textbox"` + `aria-multiline` are always present for AT (UIUX §12).

### B3. `contenteditable="plaintext-only"`
Editable regions use `plaintext-only` (the primary device is Chromium/Samsung
Internet), with a runtime feature-check falling back to `"true"` where
unsupported. **Why:** the data model is plain strings; rich markup from paste
would be un-representable and off-model. Text capture never breaks either way.

### B4. Pinch origin & drift
UIUX §4.1 requires `transform-origin: top-left` (so stored `x,y` stays truthful);
§5 also says the note is “position-compensated so it doesn't drift.” **Decision:**
top-left origin throughout — under it the top-left corner is the fixed anchor, so
there is no drift to compensate; the two requirements coincide. The only
position adjustment on pinch is re-clamping into the page when a grown footprint
would cross the boundary (the only constraint §6.3 allows).

### B5. Tap recognition upper bound
UIUX §5 defines Tap as `<250 ms` and Long-press as `500 ms`, leaving 250–500 ms
undefined. **Decision:** any release **before** the 500 ms long-press fires, with
movement < 10 px, commits as a tap. A slow, deliberate press that isn't a
long-press should still act (zero cognitive tax) rather than do nothing.

### B6. Parking Lot uses block flow, not the absolute canvas
Lot items are stacked in normal document flow inside `#lot-items`. This is **not**
the §14 “no flow container” regression: that rule protects the *free canvas*,
where position permanence lives. Lot items have **no `x/y`** in the data model
(PRD §4) — they are ordered lines by definition (PRD §6.5), so flow is the
correct, faithful layout. Notes on the canvas remain strictly absolutely
positioned.

### B7. Decoupled 44 px hit floor
Each note carries a computed `--hit` inset on a transparent `::before` expander,
sized so `inset · scale · renderScale ≥ 44 px` physical, recomputed on
scale/edit/resize. **Why:** honors Fitts / PRD §5.3 without altering the visual
frame — hit area is generous, never pixel-perfect to visual bounds (UIUX §6).

### B8. Empty-frame discard uses `trim()`
A note/lot line committed with only whitespace is discarded, not just one with
literal zero length. **Why:** “no empty frames ever exist” (PRD §6.2) — a
whitespace-only frame reads as empty. Tap-empty always creates a note (§6.2), so
a transient empty editor may exist *while editing*; it vanishes on blur.

### B9. Navigation & OS back via the History API
Opening the board list `pushState`s a `{v:'list'}` entry; selecting a row or
“New board” calls `history.back()`; `popstate` drives the view. **Why:** UIUX §10
demands the OS/browser back action is *never intercepted or disabled* — this
makes back return to the board naturally, with no interception, and keeps the
board (not the list) as the app's resting state.

### B10. Empty-database first launch
PRD §8.1/§6.7 assume a board exists at launch but don't say what a truly empty
install shows. **Decision:** create and open one blank board (four anchors). The
desk always shows a working page (UIUX §1); the list is never the landing view.

### B11. Manifest `orientation` + colors
`orientation: "any"`, `theme_color`/`background_color` = `--paper` (`#F7F5F0`).
**Why:** the Z Fold's inner and cover displays must both be first-class (PRD §3)
and survive fold/unfold, so orientation is not locked; paper is the surface the
user should perceive as the app, including the launch splash. `theme-color` is
also set per-scheme in `index.html` so the system UI matches the active theme.

### B12. Browser pinch-zoom disabled (`touch-action: none`, `user-scalable=no`)
**Why:** the board explicitly never pans or zooms (PRD §5.1); a two-finger pinch
is reserved for scaling the *note*. Letting the browser also pinch-zoom would
make the note-scale gesture ambiguous. The app provides its own uniform
scale-to-fit, so native zoom is redundant here. This is a deliberate,
spec-driven trade, scoped to this fixed-page tool.

### B13. Persistence timing & resilience
Keystrokes debounce at 300 ms; blur, drag-end, pinch-end, complete/restore,
delete, and z-order changes commit immediately; `updatedAt` refreshes on every
write (PRD §4). Writes go through a single-flight queue with exponential backoff;
on failure the polite `role="status"` toast “Couldn’t save — retrying.” shows and
auto-retries, and never blocks capture (UIUX §12) — a pending Undo toast is never
clobbered by it.

### B14. Caret at the tapped point
Editing places the caret at the touch point via `caretRangeFromPoint` /
`caretPositionFromPoint`, falling back to end-of-text. Serves “edit at tap point”
(UIUX §5) directly.

### B15. Focus-ring color in dark theme
UIUX §2.2's dark table doesn't override `--focus-ring`, so `#0B57D0` is kept in
both themes as specified. It remains a 2 px ring at 2 px offset (non-color-alone),
so the indicator is robust regardless of hue contrast.
