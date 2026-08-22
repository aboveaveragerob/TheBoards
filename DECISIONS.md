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

> ## The specification now exists. This file is unchanged by that.
>
> A1 and B1–B44 below were ruled against a `PRD.md` / `UIUX.md` pair that did not
> exist at the time. Both documents now do. **This remains the decision record:**
> new rulings continue here as `B45`+, citing `UIUX §x` where the rendering detail
> lives. A specification and a decision log answer different questions, and only
> one of them records what has already been tried.
>
> | Question | Authority |
> |---|---|
> | What v2 must be | `PRD.md` |
> | How it renders and behaves under the hand | `UIUX.md` (wins on any rendering question — see A1) |
> | Why the app does what it does, and what has already been tried | **this file** |
>
> **Append only.** An entry is superseded by a later ruling, never edited away.
> What v2's design system overturns, by number:
>
> - **B16** (the light/dark palette pair) — retired. v2 is dark-only; `PRD §1.5`,
>   `UIUX §2.1`.
> - **The `--line` mid-grey introduced with B15/B16** — deleted. It was specified
>   against surfaces it is not drawn on (1.64:1 on the sheet it rules across);
>   `UIUX §2.3`, `§2.5`.
>
> **B40's accepted anisotropy** ("when the two ratios diverge, vertical clearances
> can still shift") and **B21's width-only multiplier**: issues #65 and #75 are the
> argument against them — superseded by B64.
>
> Everything else here stands. In particular the B33 → B35 → B36 → B37 → B38 band
> chain is **unchanged and still authoritative** — `UIUX §13.2` adds a measurement
> gate in front of it, because a new typeface changes the type and the band is
> sized by the type it holds.
>
> **Grep this file before changing gesture, layout, band/lot or menu behaviour.**
> A prior fix in that area very likely already ruled out the approach you are
> about to take.

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
`orientation: "any"`, `theme_color`/`background_color` = `--paper` (`#EEEBEF`).
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

### B15. Focus-ring color follows the palette
With the "Aubergine on Mist" palette (B16), `--focus-ring` is retuned into the
family — muted indigo `#4A4E82` (light) and `#A0A2D8` (dark, a new override the
old blue didn't need). It stays a 2 px ring at 2 px offset (non-color-alone), so
robustness comes from geometry, not hue; the retune only keeps the indicator in
the same low-chroma world as the poles (light ring 6.6:1 on paper, dark 7.4:1).

### B16. Palette — "Aubergine on Mist"
The token set is retuned from a warm paper/ink to a muted-plum pairing: poles
`--paper #EEEBEF` / `--ink #221C24` (light) and `#1A161C` / `#E6E1E8` (dark), with
every derived token (`--ink-shadow`, `--letterbox`, `--surface-raised`, `--hairline`)
and accent (`--danger`, `--accent-restore`, `--focus-ring`) regenerated from those
poles. **Why:** the choice follows the two-axis brief — *sharply contrasted* (ink/paper
14.1:1 light, 13.9:1 dark: past AAA, short of the harsh 21:1) but *not brightly sharp*
(pole chroma ≤ 0.018 OKLCH, off the vivid axis). This is a re-interrogation of an
impermanent value choice, not costume: the system stays a single near-monochrome value
scale generated from two poles (UIUX §1 "identity from structure"). `--ink-rgb` stays
channel-synced to `--ink` for the scratch-out text. Icons (B1) regenerated in the new
poles to keep the installed-app identity in sync.

### B17. Layout — "grow the canvas" fill replaces the letterbox
B11/B12 framed the page as a fixed 900×1000 sheet shown with a *contain* fit
(`Math.min`), which left `--letterbox` bands on any device whose aspect isn't 0.9 —
on a tall phone, thick dark bands top and bottom. **Decision:** the sheet now fills the
screen edge-to-edge on every device. `LOGICAL_W` stays a fixed 900-unit width reference;
`LOGICAL_H` is recomputed each layout as `LOGICAL_W · vh/vw`, so `vw/LOGICAL_W === vh/LOGICAL_H`
and a single **uniform** `renderScale = vw/LOGICAL_W` fills both axes with `offX = offY = 0`.
**Why this fill, not the others:** uniform scale is preserved, so note frames stay square
(B1 identity motif) and the decoupled 44 px hit math (B7, `renderScale`-based) stays
exact — a *cover*/crop fit would cut off edge furniture and an axis-decoupled *stretch*
would distort both. The extra height is honest canvas; furniture pinned to the top (title,
Components, Required) is unchanged and the Parking Lot re-pins to the true bottom
(`#lot { bottom: 16px }`, same 16 px gap it had at the old 1000-unit bottom). `--letterbox`
survives only as the pre-paint background and is no longer visible in normal use.

**Tradeoff (kept faithful to "positions permanent," PRD §1):** when the page *shrinks*
(e.g. portrait→landscape) a note committed lower on the taller page keeps its truthful
`y` rather than being reflowed — existing notes are **not** re-clamped on resize (that
would silently move committed work). Notes are still clamped into the current page at
creation/drag/pinch, so new placement always lands on-page, and off-page notes reappear
when the device returns to a taller orientation. This favors the primary portrait / Z Fold use.

### B18. The 400 ms action window is acknowledged, not idle
Every click interaction now commits **400 ms** after release rather than on the same
frame (`ACTION_DELAY`, `app.js › delayAction`). The literal instruction — put 400 ms
between click and action — is followed exactly; what the specs leave silent is what
happens *during* it, and four choices resolve that:

**a. The window is filled, not empty.** 400 ms of nothing is indistinguishable from a
dropped tap, and a user who has to wonder whether their tap landed has been made to
think about the interface (UIUX §1). So the tapped thing responds immediately and the
action lands as the response releases. The delay is a beat, not lag. This is the whole
justification for the feature having a visual dimension at all: without it the change
satisfies the instruction and fails the law.

**b. Content thickens; controls fill.** The acknowledgment is the system's existing
press language, not a new one. Notes reuse `.pressed` verbatim (§4.2) — the same 3 px
weight the note already shows when picked up for a drag, padding-compensated so nothing
reflows; anchors and lot lines take the same weight in their own idiom. Notes are
deliberately **never** filled: a filled note is the completion scratch-out (§4.3), and an
acknowledgment that reads as "completed" would be a lie for 400 ms. Furniture and
controls have no such collision, so they fill with their own ink and drain their label to
`--paper` — every fill pairs a token with `--paper`, so light and dark invert correctly by
construction rather than by a second rule.

**c. Empty canvas gets a ghost.** A tap on bare paper has no element to acknowledge, so
the frame it is about to produce is drawn first at `--ink-shadow` weight (`.tap-ghost`),
sized to the 44 px hit floor, and replaced by the real note when the window closes. The
B1 motif before it has content — the promise of the frame, then the frame.

**d. Taps inside an open window are dropped, not queued.** One action is in flight at a
time. Queueing would make an impatient double-tap create two notes or delete twice, which
is worse than the delay it is reacting to. First tap wins.

**Measured from release, not press,** because a click is complete at release. Combined
with B5 (a slow press up to 500 ms still commits as a tap) the worst case is ~900 ms from
touch to action; the common case is ~400 ms.

**Not delayed, because they are not clicks:** long-press menu *opening*, drag drop, pinch
end, and the `focusin` edit path for keyboard/AT users. Keyboard activation of a menu item
*is* delayed — it routes through the same `click` listener, correctly.

**Amended by B27** (mobile capture left the window; B18c's ghost is desktop-only). The
clause below is the amendment working as written, not a repeal: the structure held and only
the scope moved.

**Impermanence:** 400 ms is a felt value, given not derived. It should be re-interrogated
on the device rather than defended — the structure above holds at any duration, and only
the number would move. The acknowledgment is instant (no transition), so the mandatory
`prefers-reduced-motion` kill-switch (§8) has nothing to remove and the delay survives it
intact — correctly, since reduced-motion is about vestibular safety, not about timing.

---

## C. Desktop mode (issue #4; decisions ruled in issues #8–#16, specs in PRs #28–#35)

### B19. Desktop-mode detection
A session is desktop iff `matchMedia('(min-width: 1024px) and (hover: hover) and
(pointer: fine)')` matches, re-evaluated live on `change`. One `isDesktop` flag + one
`desktop` class on `<html>` are the single source of truth; CSS gates on the class and
never restates the query. Primary-input capability — not width, not UA — excludes
tablets (iPadOS reports coarse/none even with a trackpad; a stylus is `any-pointer`,
so an S Pen Z Fold stays mobile). Width is the reverse backstop and guarantees room for
the 300 px rail. The exclusion is derived, not quoted: desktop's hover-dependent grammar
would strictly reduce a touch-only device, while mobile mode costs it nothing. Mode
flips tear down live state (selection, menu, a pushed list entry via `history.back()`
so B9 holds, half-finished gestures). No persistence, no override.

### B20. Desktop geometry — min-anchored axis inversion beside an unscaled rail
`renderScale = min(vh/1000, (vw − 300)/900)`; `LOGICAL_H = vh/renderScale`;
`LOGICAL_W = (vw − 300)/renderScale`; `offX = 300` (the rail is unscaled chrome; the
sheet fills the rest — `--offx` already flows through `toLogical` and the board
transform, so stored coordinates stay sheet-relative with no per-note math). Uniform
scale (no distortion), both axes fill exactly, and **neither logical dimension ever
drops below the 900×1000 reference** — mobile-placed notes always fit and the top
furniture never collides, at any window shape. The extra width is the issue's new note
surface. Mobile's B17 branch is untouched; the furniture CSS became width-agnostic
(`right:24`, `left:24;right:24`, `calc(50% − 200px)`) — arithmetically identical at 900.

### B21. Cross-device note `x` — scaled, not clamped, not fixed (overrides the B17 default)
Desktop's variable `LOGICAL_W` lets a note's `x` exceed a phone's 900-unit sheet. Ruling
(issue #15): positions render **proportionally** in both directions. Each note carries
`rw`, the `LOGICAL_W` in effect when `x` was last written (`createNote`/drag/pinch/
resize); rendering computes `renderX = x · (LOGICAL_W / (rw ‖ 900))` for CSS `left`,
leaving stored `x` untouched — a viewport change never mutates data. Gestures rebase
(`x = renderX; rw = LOGICAL_W`) at grab, which is visually silent by definition, so all
grab math runs in current-frame units unchanged. Legacy notes read as `rw = 900` — true
by construction, so there is no migration. `y` needs none of this (`LOGICAL_H ≥ 1000`
everywhere); the Parking Lot has no `x`/`y`.

### B22. Desktop selection is instant, inert state; B18 governs actions
Click selects; the selection (and its dismissal, and the second-click edit entry) is
**instant and opens no `delayAction` window** — B18's window acknowledges a
*consequence*, and selection commits nothing. (Confirming mechanics: the drop-guard
would swallow the second click of every double-click, so delayed selection is also
impossible.) `handleTap`'s blanket drop-guard moved into the branches that fire
actions, preserving B18(d) exactly where it does work. Complete/Restore/Delete, board
create/swap/delete, and creation keep the 400 ms window. Deselecting does not cancel a
pending action (Undo is the cancellation path); selecting never calls `surfaceNote`
(it would write — the overlay renders above every note regardless). The selection
chrome is one overlay in board space: it inherits `renderScale`, never `note.scale`,
and its buttons are recognizer-routed because `setPointerCapture` retargets native
clicks inside `#board`. Frame-drag resize shares pinch's scale/clamp/hit math.

### B23. Creation surfaces deselect first; the hit floor is 24 px on desktop
With a selection active, a click on a creation surface (empty canvas *or* the lot
background — one rule) only deselects; with none, capture runs exactly as on mobile.
The ordinary capture loop never pays the extra click — edit and selection are mutually
exclusive and commit-on-blur doesn't reselect. So near-miss dismissals don't land in an
invisible hit collar and reselect (or re-edit) the note, `HIT_FLOOR` drops 44 → 24 px
on desktop only — WCAG 2.5.8 AA, the pointer-agnostic floor; B7's 44 px (2.5.5 AAA,
fingertip) stands untouched on mobile.

### B24. The board rail replaces the list view on desktop
A full-height sunken rail (`--pane`, slightly darker paper, inset shadow — embedded,
not floating) at a fixed 300 CSS px. Cards are compact (56 px, ~40ch) and ordered by
one shared comparator: `createdAt` desc + `id` tiebreak — immutable, so a card's slot
never moves (the same claim as positions-permanent); `boot()`/`ensureCurrentValid()`
keep `updatedAt` deliberately (`updatedAt` selects *continuity*, `createdAt` orders
*space* — do not "fix" this). When boards overflow the rail, the bottom edge says so
in the §10 truncation idiom; otherwise it says nothing. Card click swaps the board in
place — **no history push**, so B9's popstate flow is bypassed, never touched — behind
a 150 ms crossfade sequenced by `setTimeout` (reduced-motion zeroes transitions, so
`transitionend` would never fire). Create is the same filled primary control as the
list view (shared class; its own listener — the mobile path ends in `history.back()`).
Delete has two paths, neither hover: a permanent control on the **active card only**
(deleting keeps the board's contents in front of you), and **right-click any card** →
the existing one-item danger menu — the one summoning gesture "remove click-and-hold"
doesn't touch. Both land in `deleteBoard` → 400 ms window → 5 s Undo; deleting the
open board heals `current` immediately via `ensureCurrentValid()` (no list screen will).
Consequence: the menu *can* open on desktop, so the desktop keyboard handler is inert
while `menuOpen`.

### B25. Parking Lot on desktop
Same select grammar as notes (click selects, double-click edits, Complete/Restore +
Delete; no resize — they are not frames). The selected row draws a frame: an explicit,
narrow override of §4.4's "never framed," scoped to desktop + selected + one row,
drawn with `outline` (no padding to absorb a border shift) in `--ink` (selection ≠
edit, which keeps `--focus-ring`). Buttons sit inline at the row's right edge —
`#lot-items` is `overflow: hidden`, so below-the-row controls would clip on exactly
the last, most actionable row. The lot grows to 210 px (`34 + 4·44`, four rows) out of
the desktop canvas; mobile keeps 128 px. Notes committed near the sheet bottom may
overlap the taller lot; they render above it (z-order) and are not moved — B17.

### B26. Desktop caret and Undo scope
Double-click (and Enter on a selection) enters edit with the caret at the **end** —
issue #4's explicit instruction, a desktop-only override of B14's caret-at-tap-point,
which stands on mobile. A pending **note/lot** Undo is finalized on any board switch:
its callback splices into whatever board is `current` at undo time, so switching would
resurrect the item onto the wrong board (a pre-existing mobile bug the always-visible
rail turns into a one-click accident). Board-delete Undo is cross-board-safe and
survives switches — the toast now carries a scope for exactly this distinction.

---

## D. Capture reliability on the device (the note-creation tap issue)

Evidence: a screen recording of a real capture session on the Z Fold (Samsung Internet).
Sixteen seconds of tapping bare paper to start a note. Most taps did nothing at all; the
few that landed opened an editor and a keyboard that immediately closed again, and the
keyboard flapped up and down for the rest of the session. **Not one note survived.**

That is the whole product failing at its first principle — *capture precedes structure*
(PRD §1). Everything below descends from it. Four independent suppressors were stacked on
the same gesture and each one alone was enough to lose a tap; the entries are separated
because the fixes are separable, not because the causes were.

### B27. Mobile capture is instant, and the recognizer suppresses the browser's compatibility mouse events

Two changes, one cause: **`focus()` must run inside the gesture that asked for it.**

**a. Capture leaves B18's window.** Creating a note or a lot line, and entering edit on
either, now happen synchronously in `pointerup` on mobile. B18's 400 ms beat stays on every
action that *consequences* something — Complete/Restore, Delete, menu items, Undo, board
create/swap/delete. This is B22's line ("B18's window acknowledges a *consequence*"),
extended from desktop selection to mobile capture by the same reasoning: creating a note
commits nothing, destroys nothing, and can be undone by walking away from it. B18's own
impermanence clause asked for exactly this re-interrogation *on the device*, and the video
is it — so this is the mechanism working, not an exception to it.

The functional half is decisive: a browser raises the soft keyboard for a programmatic
`focus()` only while it can attribute it to user activation, and `setTimeout(…, 400)` is
outside that. Every mobile focus in the app was reached through `delayAction`'s timer, so
the keyboard raise was never guaranteed — it was luck.

The formal half is the stronger claim, and it stands on its own: **the editor appearing
with a live caret is a better acknowledgment than the ghost that preceded it.** B18c
invented `.tap-ghost` because empty canvas had no element to acknowledge — the promise of
the frame, then the frame. Once the frame itself can arrive instantly, the promise is a
stand-in for something no longer absent, and the interface is asking to be thought about
(UIUX §1) for 400 ms. So the ghost is not deleted, it is **scoped to desktop**, where the
window it fills still exists. B18c is narrowed, not repealed.

**b. Compatibility mouse events are suppressed at `pointerdown`.** This was the largest
single cause of the dropped taps and the one the code's own comments had already half
found. A touch tap fires `pointerup`, then the browser synthesizes `mousedown`/`mouseup`/
`click`; `setPointerCapture` retargets those to `#board`, which cannot hold focus, so their
default action pulled focus straight back out of the editor the tap had just opened. The
note was then empty at blur and B8 correctly destroyed it. **The bug wore the costume of
the fix**: a tap that worked perfectly, undone one event later, looked exactly like a tap
that never registered. Measured in the browser, a plain tap lost its note about as often as
it kept it, and any finger movement at all made it near-certain.

Past the `isEditing` guard the recognizer owns the press outright and places every caret
and focus explicitly, so `preventDefault()` there removes only duplicates. It is *not*
called on the editing path, where the native caret is exactly what should run.

**Consequence, deliberately accepted:** B18(d) ("first tap wins") no longer applies to
capture, because it no longer needs to. An impatient double-tap creates a note, then a
second — and creating the second blurs the first, which is empty, which B8 discards. One
note survives, at the last point tapped. The guard that existed to prevent a double-create
is not weakened; it is made unnecessary by a mechanism already in the system.

**Impermanence:** the 400 ms itself is untouched and still felt-not-derived. If it is ever
re-interrogated to zero, this entry collapses into it and B18c's ghost goes with it.

### B28. The sheet holds still while a note is being written

`interactive-widget=resizes-visual` in the viewport meta, **plus** a JS guard that skips
mobile re-layout while a `contenteditable` inside `#board` holds focus, with the skipped
layout re-applied on `focusout`.

**Why both.** Under B17 the mobile sheet's height *is* the viewport (`LOGICAL_H = 900·vh/vw`),
which was the right call for filling the screen and the wrong one to leave unguarded when
something else can change `vh` — and on Android the soft keyboard does exactly that. The
sheet collapsed to roughly half its height the instant the keyboard opened (measured:
1983 → 1055 units), a note committed low on the page fell outside it, and
`#board-view { overflow: hidden }` clipped it away while it still held focus. The user's
next tap therefore landed on bare canvas, blurred an editor they could no longer see, and
B8 discarded the empty note — dropping the keyboard, resizing again, and starting over.
**That loop is the flapping in the video**, and it is not a keyboard bug: it is B17
faithfully doing its job on a viewport that had stopped meaning what B17 assumed.

The meta directive is the correct fix and states the intent declaratively — the keyboard
should resize the *visual* viewport, not the layout one. It is Chromium-only, and Samsung
Internet is Chromium with a lag and its own keyboard/insets layer, so it is treated as the
primary fix and assumed to be possibly ignored. The guard is what makes the claim true
everywhere, including a browser that has never heard of the directive.

Deferring rather than discarding matters: a rotation or a fold *during* an edit is a real
layout change with no second resize coming after blur, so the guard remembers it and
`focusout` applies it. B17's "committed notes are never re-clamped on resize" is untouched
and now easier to hold — mid-edit there is no longer a resize to re-clamp against.

### B29. Touch slop 10 px → 16 px

B5 quotes "<10 px" from UIUX §5. On a 7.6-inch foldable held one-handed, a fingertip rolls
further than 10 CSS px during an ordinary tap, and every such tap was cancelled outright
(`g.mode = 'cancelled'`) with no feedback of any kind. 16 px recovers them and is still far
short of any intentional drag. Same license B18 grants itself: a felt value, re-interrogated
against the device rather than defended from the page it was written on. The constant is
shared by drag-start, long-press-cancel and list rows, so the recognizer stays coherent at
one number rather than three.

### B30. A long-press on a creation surface captures; dismissing a menu does not

**Long-press.** No long-press timer is armed over bare canvas or the lot background, so the
release commits as the tap it always was. Previously the timer fired, vibrated, and threw
a `TypeError` inside `openMenuFor` — canvas and lot pass `#board`/`#lot` as the target node
and neither carries a `dataset.id`, so the record lookup returned `undefined`. Worse than
the crash: `g.longPressed` was set *before* the throw, which suppressed the release. Every
press held past 500 ms on empty paper produced a buzz and nothing else — and holding a
moment too long is entirely ordinary on a phone. This is B5 one step further out: a
deliberate press that isn't a long-press must still act, and so must one that *is* a
long-press over a surface with nothing to open. Boards is unaffected; it lives on the
anchor menus. `openMenuFor` also returns early on a missing record now, so no future caller
can reproduce the crash.

**Dismissal.** The `pointerdown` that closes an open menu is inert — it no longer also
creates a note on the paper the menu was covering. Dismissal is a retraction, not a choice
of what was underneath.

### B31. No empty frame outlives its editor

B8 ("no empty frames ever exist") was enforced only at blur, and blur presupposes focus. A
frame whose editor never received focus never blurred, so it was never discarded: it stayed
in the model, invisible (`.note-text:empty` is fully transparent), and kept its 44 px hit
collar (B7). Any later tap inside that collar hit the `isEditing` early-return and died
silently. **Failed taps left landmines, so the flakiness compounded the longer the user
tried** — which is precisely the shape of the video, worsening over sixteen seconds.

Three closures, at three different layers, deliberately:

- **`isEditing` now requires real focus**, not just the attribute. An attribute can outlive
  its edit; focus cannot. A husk is therefore an ordinary note again — the next tap focuses
  it and the following blur discards it, so the app heals on contact.
- **Creation verifies its own premise**: if `focus()` did not land, the frame is removed in
  the same breath. Cheap, and a no-op now that capture runs in-gesture (B27).
- **Every render sweeps the board** of whitespace-only notes and lot lines. B8 at rest
  rather than only at blur — so data written by the *old* code cleans itself up the first
  time it is drawn and this bug leaves nothing behind.

**Not fixed by saving on creation**, which was the tempting one-liner: writing an empty
frame to disk is the exact thing B8 forbids. A note earns persistence with its first
character. The real hole — an empty frame swept to disk by some unrelated `saveNow()` —
is closed by the sweep, which is the right layer for it.

**Verification.** 35 mobile and 26 desktop checks drive a real browser (touch events via
CDP, mobile emulation) and cover every claim above; run against the pre-fix commit they
reproduce the video's symptoms exactly, including the `TypeError` and the mid-edit sheet
collapse. They are the standing regression net for anything that touches the recognizer.
The device remains the only authority on B28's directive.

## E. Mobile legibility (issue #37)

### B32. The mobile sheet is 1:1 with the viewport (overrides B17, and B21's `y` clause)
B17 kept the phone on a fixed 900-unit sheet scaled to fit, which on a ~400 px phone means
`renderScale ≈ 0.45`: 24 px of title reached the screen as 10 px, the Components/Required
labels as 6 px, and the 128 px Parking Lot as ~55 px — about one row. The sections were never
resizable and are not made so here; they were literals being shrunk. **Decision:** on mobile
`LOGICAL_W = vw`, `LOGICAL_H = vh`, `renderScale = 1`. The sheet *is* the viewport, every
declared px is a real px, and B17's claim survives intact — a scale of 1 is uniform by
construction, so there is still no letterbox and no distortion.

The three-across top furniture (Components · Title · Required) is preserved exactly. It could
no longer be written as px against a known 900 sheet, so its mobile rules are restated as the
fractions they always were — 24/900 = 2.6667 %, 216/900 = 24 %, 400/900 = 44.4444 % — which is
identical geometry at 900 units and the same layout at any width. Desktop keeps fixed px
(`html.desktop` overrides): its `LOGICAL_W` is derived per layout (B20), so percentages there
would drift with the window shape. The Parking Lot takes desktop's 210 px (`34 + 4·44`) in
both modes, so four rows are visible everywhere.

B21 ruled that `y` needed no counterpart to `rw` because `LOGICAL_H ≥ 1000` everywhere. At 1:1
the mobile height is `vh`, so that premise is false and every note now carries `rh` beside
`rw`, written at exactly the same call sites (`createNote`, and `rebaseNote` at drag/pinch/
resize grab) and read by `renderY`. Notes written before B32 have no `rh`, and unlike `rw`'s
legacy 900 it cannot be recovered — the old mobile height was device-dependent (~1700–2000) —
so they are mapped through the height the previous build would have produced on *this* device
(`LEGACY_H`) and clamped into the page **at render time only**. Stored `y` is never mutated, so
B17's "committed positions are permanent, never re-clamped on resize" holds; the clamp exists
solely so a note authored on the old ~2000-unit sheet stays reachable rather than clipped off a
page that — unlike a rotation — will never be that tall again. The clamp is scoped to the
legacy branch: applied to live notes it would fight `createNote`'s own bottom clamp and
`rebaseNote` would write the pulled-up value back, which is the silent mutation B21 forbids.

Two consequences carried with it. The 405 px note cap (45 % of the old sheet, PRD §6.2) becomes
a width-relative `--note-max-w` set in `applyLayout`, because at 1:1 a fixed 405 px is ~98 % of
a phone — no cap at all, and the spatial board would collapse into one column. The decoupled
44 px hit floor (B7) needs no change at all: it was always parameterised on `renderScale`, and
at 1 it simply meets the floor with real geometry instead of a ~100-unit invisible collar. B28's
keyboard deferral is untouched and now load-bearing in a second way — an unguarded resize would
move every note, and a gesture during one would bake a keyboard-shrunken `rh` into storage.

### B33. The top band is drawn furniture, not a by-product of content (issue #38)
Three symptoms, one cause: the title card had no frame, there was no rule under Components /
Requirements, and both headers vanished the moment text was typed. The anchors' only rule was
`border-bottom` gated on `.filled`/`:focus`, and their only label was a `::before` fed from
`data-placeholder` — so *what this section is* (permanent) was carried by the same element as
*this section is empty* (transient), and inherited its transience. A blank board drew nothing;
a filled board lost its headers. The Parking Lot had the right shape all along (`#lot-rule` /
`#lot-header` / `#lot-items`); the band never got it.

**Ruling:** the band is furniture and draws unconditionally. One `#band-rule` across the sheet at
`y=200`, at `#lot-rule`'s weight and gutter. Each side is a `.band-zone` holding its anchor and a
permanent `.band-label` pinned to the rule and hugging the card — right-aligned left of it,
left-aligned right of it. The card is a 4-sided frame, always drawn, `--paper`-filled, `top:24`
to `252`: it **overhangs the rule and occludes it** rather than the rule crossing it, which is
the whole spatial idea — the line was drawn across the page and the card landed on top of it.
Geometry is the issue's wireframe measured against the 900×1000 reference sheet: rule `y=200`,
card 220 wide (24.4444%) and 228 tall, the 1.26 overhang ratio it draws.

Three consequences worth naming. **The card is the one always-drawn frame** — a deliberate
exception to §6.2 "no empty frames", which exists to keep the *free canvas* clean; the card is
permanent furniture, and the reference draws it on a blank board. **The title sets at the header
size** (15/600, not 24/700): the card carries the hierarchy now, and at 24px a 220-wide card
broke titles mid-word on a phone sheet — the wireframe sets them identically for exactly this
reason. **The rule does not thicken on tap.** B18(b) still holds, but in each anchor's own idiom
— the side anchors grow a 3px baseline, the card thickens its frame like a pressed note, both
padding-compensated. The rule belongs to both zones at once, so thickening it could not say which
one was tapped; `#lot-rule` can, because it belongs to one.

`.band-zone` is `pointer-events:none` with the anchor `auto`, so `classifyTarget`'s
`closest('.anchor')` is untouched and the rest of the band stays bare canvas — which is where the
reference puts notes. No `app.js` change; `.filled` keeps its one remaining job, the card's
placeholder. Not changed, and inconsistent with the reference until it is: `#lot-header` sits
*below* its rule where the wireframe puts it above.

## F. Export (issue #43)

### B34. The exporter is hand-rolled, and it draws the reference sheet
Boards only left the device as screenshots. Issue #43 asks for a `.pdf` on the board-card menu.

**Why no library.** jsPDF plus html2canvas is ~550 KB of vendored code, two new `ASSETS` entries in
`sw.js`, and a false sentence in the README's first paragraph. PDF is a text format and the base-14
fonts need no embedding, so the whole exporter is ~430 lines in `app.js` §10.5. B1 already settled
the precedent — the icons come out of a dependency-free PNG encoder — and the app still has no
frameworks, no build step and no dependencies. It also keeps the promise the PWA is built on: the
export works with the aeroplane switch on, because nothing is fetched.

**The frame is 900×1000, not the device.** `LOGICAL_W`/`LOGICAL_H` are viewport-derived (B20, B32),
so exporting against them would make one board a different document on a phone than on a desktop.
`exportX`/`exportY` are `renderX`/`renderY` with the reference sheet substituted for the viewport,
so the export inherits issue #15 and B32 rather than re-deriving them, and B21 holds: stored `x`/`y`
are read, never written. A pre-`rh` note keeps B32's admission that its authoring height cannot be
recovered — it maps through `LEGACY_H` and is clamped onto the page at export time only.

Reading, not writing, is the rule for the whole action. Records reach the menu straight from
`idbGetAll()` and have never passed through `renderBoard`'s sweep, so the export re-runs B8/B31's
`trim()` filter **on a copy**: a whitespace husk would otherwise export as an empty framed box, and
filtering in place would be a silent mutation of live state. For the open board the export reads
`current` rather than the rail's closure, because saves are debounced and the card's snapshot can be
several keystrokes behind what the user is looking at.

**Four medium decisions.**

*Two pages, A4 portrait.* Page one is the sheet — the thing the screenshot was standing in for —
scaled 0.581 and centred. Page two is the same board as prose, so the file is searchable and
readable without decoding a diagram. A4 because a board is 0.9 wide-to-tall and A4 is 0.707: some
page is left over either way, and a standard size prints anywhere without a dialog.

*Paper edge to edge, always light.* `styles.css` §1 names paper tone as part of the identity
alongside the frame and the scratch-out, so both pages are filled with `--paper` rather than the
sheet floating on white — B17 and B32 spent two rulings deleting the letterbox and this is not the
place to bring it back. Dark mode does not travel: it is an accommodation for an emissive display,
and `--paper` at `#1A161C` prints as a slab of near-black.

*Helvetica, not embedded.* "Identity comes from structure, never costume" (`styles.css` §1). The
structure is exact; the costume changes. The honest cost, stated rather than hidden: the browser
measures in `system-ui` and the viewer sets in Helvetica, so wrap points and a note's `max-content`
box width can differ by a line. **Positions do not** — those come from the record. A base-14 font
also cannot say CJK or emoji; those characters export as `?` and the substitution raises a toast,
because §10's law is that truncation is always indicated and a silently mangled line is truncation.

*The scratch-out destroys the text in the new medium too.* `styles.css` §4.3 says the mark is such
that "no screenshot/zoom recovers it." The obvious port — draw the text, hatch over it — yields a
PDF that `pdftotext` reads back verbatim, breaking that promise while looking identical. **A
completed note or lot line emits no text object at all**: frame, paper, hatch. `opacity: 0.97` goes
with it, since its job was to let a hair of the 40 %-ink text show through and there is now nothing
underneath; the ink is mixed down against paper instead, which saves an `/ExtGState`. The
interrogation produced a simplification, and the promise is a test rather than a claim.

**Two smaller notes.** The item needed no `styles.css` change — it speaks the existing menu language
(`#menu button`, `.glyph`, `.sep`) — which is the evidence the design was right. And the writer emits
no dates, so an unchanged board exports byte-identically twice running; the test asserts it.

**Export lives on the board menu, not only the board-card menu.** The issue's own wording — "long
tap on mobile, right click board card on desktop" — describes one function reached two ways, and on
mobile the board itself is reachable before its card is: long-pressing the title, Components, or
Requirements already opened `[Boards]` (`openMenuFor`'s anchor branch), so exporting the board on
screen required leaving it for the list first. That menu now reads `[Export, Boards]`. Desktop has
no matching gap — right-click already reaches the active card directly in the rail — so this is
mobile-only, gated the same way the anchor menu itself is (`!isDesktop`, B23/issue #4).

*Impermanent.* Split §10.5 into its own file once `app.js` passes ~2,200 lines or a second consumer
appears — it costs a `<script>` tag, an `ASSETS` entry, and a row in the README's Files table today,
which is why it has not been done yet. `Export` becomes a submenu with `PDF` as the leaf the moment
a second format exists. The hatch is inline ruled lines; past ~1 MB the order is a Form XObject,
then `/FlateDecode` — noting the latter makes the build async and breaks the plaintext assertions.

## G. Band and lot proportions

### B35. B32 preserved the fractions, not the proportions they were chosen for (supersedes B33's card width; overrides the four-row lot)
Two complaints, one cause. The Parking Lot ate a quarter of a phone sheet, and the title card was a
portrait stamp taller than it was wide — the exact opposite of what a title card is. Both numbers
were correct once, against the 900×1000 reference sheet, and neither was re-derived when B32 made
the mobile sheet 1:1 with the viewport. B32 restated the horizontal geometry "as the fractions
[it] always [was] — 24/900 = 2.6667 %, 216/900 = 24 %" and called that "identical geometry at 900
units and the same layout at any width." The first half is true; the second is not. `220/900` is
24.4444 % of *any* width, so on a 384-unit phone the card renders 93.9 px wide. The fraction
survived; the proportion it encoded did not.

The narrowness had already extracted a price. `styles.css` demoted the title from 24 px to 15 px —
the section headers' own size — because "at 24px the 220-wide card broke titles mid-word on a phone
sheet." That is the card losing an argument with the type it exists to hold.

**Ruling.** The card is **340/900 = 37.7778 %** (280..620 on the reference sheet), landscape at
1.5:1 rather than portrait at 0.96:1. Both side zones absorb it evenly, 308 → 248. The Parking Lot
is **166 px = 34 header + 3·44**, one row down from four: the section holds two or three questions
at most and is often unused, so the fourth row was canvas the board never got back. `#lot-items` is
`overflow:hidden`, so that height *is* the visible row budget — a fourth item still exists in the
record and still exports, it is simply not drawn.

**The band's edges are now derived, not restated.** B33 wrote the card's right edge as the literal
`62.2222 %` in three rules, and `#zone-components` reached the card's *left* edge only because
`100 − 62.2222 = 37.7778` — a dependency on the card being centred that nothing named and no test
guarded, so widening the card by hand would have desynchronised one column and not the other.
`#board` now declares `--gutter`, `--card-gap`, `--card-w`, `--card-l`; the rule, both zones, the
card and the lot read them. Desktop's five px overrides collapse to two inputs
(`--gutter: 24px; --card-w: 340px`) and every edge follows.

**The headers moved below the rule, and the card is why.** B33 pinned them above the rule hugging
the card, which worked while the card was 220 wide. It does not survive 340: the columns drop to
~101 px on a 384-unit sheet, and "Components"/"Requirements" are single words that cannot wrap.
Nor can alignment rescue them — CSS puts overflow at the line box's *end* edge whatever
`text-align` says, so a right-aligned "Requirements" still runs off the sheet rather than back onto
it. The first attempt floored `--card-w` to protect the columns instead; the arithmetic killed it,
since a floor wide enough for the widest `system-ui` (~118 px, measured) leaves a phone card of
~100 px — narrower than the one the change exists to widen.

So the card took the width and the labels took the space that was actually free: `top: calc(100% +
58px)` puts them at y=258, 6 px below the card's 252, mirroring the 6 px they used to keep above
the rule. Each is `width: max-content` pinned to its outer gutter (`left: 0` / `right: 0`), so the
box is the word and any spill runs *inward*, under the card's bottom edge, where the canvas is
empty. This also settles the inconsistency B33 left standing: the band now reads rule-then-header,
the same way `#lot-rule` / `#lot-header` always has. Two consequences: the anchor gets its whole
176 px back (the exporter's clip at the label is gone with it), and a below-rule label sits in
canvas territory where `.band-zone`'s `pointer-events: none` lets a tap fall through and create a
note under it — the same way the rule itself behaves. `test/mobile.js` pins all of it: the labels
clear the card, are not clipped, and stay inside the gutters.

*Known, not fixed.* The band's vertical geometry is fixed px (rule at 200, card 24..252) while its
horizontal geometry is a fraction of the viewport, so the card is landscape at 1.49:1 on the
reference sheet and on desktop, but 145×228 — still portrait — on a 384-unit phone. A landscape
card there needs a card wider than 176 units (46 % of the sheet, leaving 79 px columns) or the rule
moved up. Both are band-height decisions, not card-width ones.

*Not reopened.* The title's 15 px. A 340-wide card removes the constraint that forced the demotion,
but restoring 24 px is its own call about hierarchy and has not been made.

*Impermanent.* `EXPORT_GEO` in `app.js` restates all of this a second time against the 900-unit
export sheet, because the exporter cannot read computed CSS from a board it never renders. Four
values moved here that a shared constants module would have moved once.

### B36. A shipped change reached `main` and never reached the device (supersedes B35's "known, not fixed")

B35 shipped correct CSS that nobody could see. `sw.js` carries a version-stamped cache and the
instruction, on its own line 3, to *bump on every shipped `app.js`/`styles.css` change*. The fetch
handler was unconditionally cache-first — return the hit, and only touch the network when there
isn't one — and a service worker re-installs only when **its own bytes** change. So a missed bump
was not a delayed update, it was a permanent one. B35 (`9ace6d6`) and the export follow-up
(`072a15e`) both landed without a bump: an installed app was pinned to `825a006` and would have
stayed there forever.

This is worth stating plainly because the failure was not in the code that was written, it was in
what "done" was taken to mean. The suites asserted the stylesheet was correct — it was — and the
correct stylesheet sat behind a cache nobody had invalidated. **Asserting the source is not
asserting delivery.** `test/sw-update.js` now asserts delivery: it installs the old worker, warms
its cache, changes `styles.css` *without* touching `sw.js` and requires the page to stay stale
(the bug, reproduced — if that step ever passes clean the harness has stopped exercising the
worker), then ships the bumped worker and requires the change to land within two launches.

Two changes, and only the first is load-bearing:

**The cache is `v5`.** That is the fix. Everything else is insurance.

**The fetch handler is stale-while-revalidate.** Still cache-first — a warm hit is returned without
waiting on the network, so offline behaviour and cold-start latency are exactly as before — but the
fetch now runs *alongside* the hit rather than only in its absence, and overwrites the entry. A
missed bump now costs one stale launch instead of everything after it. The bump discipline stays:
it is what makes an update land on the *next* launch rather than the one after. Cost is one
background request per asset per launch when online, which for eight small static files is not a
consideration. A caveat worth recording: an outgoing worker keeps serving the page until the new
one claims it, and its runtime-cache path can re-create the very entry `activate` just deleted, so
a dead `v4` may briefly outlive its own eviction. Nothing reads it once `v5` controls.

**And the band's vertical geometry is now a fraction of the sheet**, which is B35's *known, not
fixed* paragraph, fixed. The two axes had been treated differently for no reason anyone chose:
horizontal was a fraction of the viewport (B32/B35), vertical was flat px. So `252` of card plus
`182` of lot was `434 px` of furniture on *any* sheet — over 60 % of a short window, which is why
the card rendered portrait there and why B35's 44 px barely registered.

```
--band-h:   clamp(132px, 0.2 * var(--logical-h, 1000px), 200px);
--overhang: calc(0.26 * var(--band-h));      /* B33's 1.26 ratio, kept proportional */
```

Four literals become four derivations — `#band-rule`'s `top`, `.band-zone`'s `height`,
`#anchor-title`'s `min-height`, `.band-label`'s offset — and each reduces to today's value at the
`200px` ceiling, so the reference sheet is untouched *by construction* rather than by inspection.
Desktop is untouched for free: B20's min-anchored scale keeps `LOGICAL_H ≥ 1000`, so desktop always
hits the ceiling and `test/desktop.js` passes unchanged. `EXPORT_GEO` needs no edit for the same
reason, and `test/mobile.js` now pins it to the ceiling so the two cannot drift apart silently.

Free canvas, mobile, between the card's bottom and the lot's top:

| sheet | before B35 | after B35 | now |
|---|---|---|---|
| 384×846 (phone) | 43.5 % | 48.7 % | **53.3 %** |
| 1000×715 | 33.1 % | 39.3 % | **49.3 %** |
| 800×600 | 20.3 % | 27.7 % | **42.0 %** |

*Derived from `--logical-h`, not a percentage.* A custom property substitutes as raw tokens, so a
`%` inside `--band-h` would resolve against each **use site's** containing block — and
`.band-label` sits inside `.band-zone`, whose height is itself derived from `--band-h`. The px form
resolves identically everywhere. This is the kind of thing that would have shipped looking correct
on the one viewport anybody checked.

*Known, not fixed.* The phone card is 145×189 (0.77:1) — squarer than B35's 145×228, still not
landscape. It only turns landscape at the `132px` floor. So the floor, not the fraction, is the
number to argue about if a landscape card on a phone matters more than band height. Nobody has
made that call.

### B37. The band is sized by the type it holds, not by the sheet (supersedes B36's band paragraph; overrides B35's three-row lot on a phone)

Issue #49, with two pictures: the app on the device, and the paper board it exists to reproduce.
Measured off both, as a percentage of sheet height —

| edge | the paper board | the app | now |
|---|---|---|---|
| title card top | 1.9 % | 3.1 % | 1.9 % |
| **band rule** | **5.2 %** | **19.9 %** | **6.5 %** |
| title card bottom | 7.8 % | 24.9 % | 11.1 % |
| headers | 5.4–7.4 % | 26.7–27.8 % | 11.9–14.6 % |
| Parking Lot rule | 79.8 % | 75.3 % | 81.3 % |

(the app column is the reporter's own 414×737 sheet, read off the screenshot in the issue.)

B36 made the band's vertical geometry a fraction of `--logical-h` so that both axes would be
fractions of the sheet. Symmetry was the wrong argument. **Across is a fraction of the sheet
because it holds the sheet's own divisions; down is set by the type.** B32 made the mobile sheet
1:1 with the viewport, so `renderScale` is 1 and the title stays 15 px however tall the sheet is —
only the box around it grew. At `0.2 × 737` that box is a rule at 147 and a card running to 185:
a quarter of a phone spent framing two lines of text, which is the whole of issue #49.

Three complaints, one cause. *"Far too large vertically"* is the 25 %. The *"giant gap at the
top"* is B33's overhang: the card ran `24 → 1.26 × --band-h`, so 123 px of it sat above the rule
and 39 below — the rule at 76 % of the way down a box it is supposed to cross. The paper board
draws the rule through the card's **midpoint**. And *"the headers no longer align with the
borders"* follows from both: `.band-label` is pinned under the card, and the card's bottom had
moved a quarter of the way down the sheet, so the headers floated ~120 px clear of the rule they
belong to.

**Ruling.** The card is its content box, and the band is the card:

```
--band-top: 14px;                                         /* card + zone top */
--card-h:   68px;      /* 2 x (15px x 1.3) + 2 x 12 padding + 2 x 2 border */
--rule-y:   calc(var(--band-top) + var(--card-h) / 2);    /* the rule crosses the middle */
```

Fixed units, identical on every sheet — desktop scales the whole sheet uniformly (B20), so a
proportion held in logical px is held on screen too. Four derivations collapse to three, and
`--overhang` is deleted: the 1.26 ratio was a way of saying "the card hangs below the rule", and a
card centred on the rule says it better. `.band-zone` becomes the card's own box, so
`.band-label`'s offset is a plain `calc(100% + 6px)`.

**Two lines, not one, and the labels follow the card past them.** A phone card is ~145 units wide;
one line is not the common case and three is not rare — the reporter's own title, "LinkedIn
Learnings To Do", takes three. `min-height` already grew the card, but the labels did not go with
it, and `.band-label` is `width: max-content` spilling *inward* by design (B35), so "Requirements"
ran under the card's frame. `applyLayout` now republishes the card's rendered height as
`--card-actual-h` and `.band-zone` reads it, the same way it republishes `--note-max-w`; the input
handler calls it again as the title is typed. `test/mobile.js` [9c] pins it, and fails without it.

**The lot's budget is whole rows.** `166 = 34 + 3·44` is 18 % of the 1000-unit reference sheet and
a quarter of a 737-unit phone — the same fraction-versus-proportion error, in the section B35
already shortened once. It cannot simply scale: rows are 44 px hit targets and `#lot-items` clips,
so a proportional height draws a row cut off at the knees. So the budget steps by whole rows —
three above 900 units, two below — chosen in `applyLayout` because CSS cannot step a length. A row
past the budget still exists, still saves and still exports; it is simply not drawn (B35). Desktop
keeps three: B20 pins `LOGICAL_H ≥ 1000`.

**The exporter drops its zone clip.** `EXPORT_GEO` follows the CSS (`ruleY: 48`, `bandTop`/
`cardTop: 14`, `cardMinH: 68`) and `bandH` is gone with the clip it fed. Against a 176-unit zone
that clip bit at nine lines and nobody met it; against 68 it would bite at three, silently cutting
anchor text the board still shows. The screen sets no `overflow` there, so neither does the export
(B34). The exported label now hangs off the *measured* card height for the same reason the screen's
does.

**And `test/mobile.js` [11c] reads the board instead of a copy of the stylesheet.** B36's version
resolved a hand-copied clamp string in a throwaway probe, so it could only ever catch `EXPORT_GEO`
drifting from that copy — never from the CSS. It now measures the live `#band-rule`, `#anchor-title`
and `.band-label` and requires `EXPORT_GEO` to agree.

Free canvas, mobile, between the card's bottom and the lot's top — the same measure B36's table uses:

| sheet | after B35 | after B36 | now |
|---|---|---|---|
| 414×737 (the phone in #49) | — | 50.1 % | **70.1 %** |
| 384×846 | 48.7 % | 53.3 % | **74.0 %** |
| 1000×715 | 39.3 % | 49.3 % | **69.2 %** |
| 800×600 | — | — | **63.3 %** |

*Settled, at last.* B35's *known, not fixed* asked for "a card wider than 176 units **or the rule
moved up**", and B36 took neither — it scaled the rule instead, which is what put it at 147 on a
phone. This moves it up. The phone card is 145×68, landscape at 2.1:1.

*Not reopened.* The title's 15 px, and `--card-w`'s 37.7778 %. The complaint was vertical and the
horizontal geometry is doing its job.

*Impermanent, still.* `EXPORT_GEO` remains a second copy of this geometry. [11c] now pins it to the
rendered board rather than to a literal, which is as close to one source as two files get without
a shared module.

### B38. The band reads rule → header → content, and the card is a compartment (issues #51, #52)

Two complaints, one cause each, both in the top band. **#52 — the title card's frame.**
`#anchor-title` drew a 4-sided 2px border at `top: 14px`: a second top edge 14 px below the sheet's
own, orphaning a strip of paper between them. **#51 — the section headers.** The band read
content → rule → header: the anchor text sat at `y=14..82`, *above* the rule at `y=48`, and the
label at `y=88`, below it — the exact inverse of `#lot-rule` / `#lot-header` / `#lot-items`, which
has read rule → header → content since day one. B35 claimed to have fixed this — "the band now
reads rule-then-header, the same way `#lot-rule` / `#lot-header` always has" — and delivered half
of it: it moved the label below the card and left the anchor exactly where it always was, above
the rule. The order stayed inverted, and that inversion is both of #51's symptoms. The three
screenshots on the two issues, unread when PR #62 proposed this plan (the environment's proxy
blocked `user-attachments`), were fetched and read this session before implementing: the visible
gap between the rule and the header labels, and a reference photo of a physical note card with no
top edge and its side lines run past where the text starts, both confirm the plan's reading. No
contradiction — the pictures agree with the text.

**Ruling: the card is a compartment, and the band adopts the lot's own grammar.**

```
compartment top:     14 -> 0    (the sheet's own edge is the fourth side)
band rule:            48 -> 48   (unchanged)
compartment bottom:   82 -> 82   (unchanged)
header label top:     88 -> 56   (= rule + 8, #lot-header's own offset)
header label size:  15px -> 12px
anchor text top:      14 -> 82   (= rule + 34, #lot-items' own offset)
```

`#anchor-title` draws three sides, not four (`border-top: 0`), starting at the sheet's own top
edge; its top padding absorbs `--band-top` plus the 2px border no longer drawn, so the type lands
on the same pixel it always did (content box 28..68, centred on the rule at 48). Consequence worth
naming: the compartment's shoulders — the strip that used to be orphaned paper above the frame —
are now part of the title's hit area, so a tap there focuses the title instead of dropping a note
behind the frame: a misfire nobody had filed, fixed by the same geometry that fixes #52. The tapped
state (`#anchor-title.tapped`) sets `border-width: 0 3px 3px` rather than a flat `3px`, so pressing
the compartment does not resurrect the top border this ruling just removed — no test catches that
one; it only shows up during the 400 ms action window.

`.band-zone` moves from being the card's own box to being the rule's: `top: var(--rule-y); height:
0`, its children absolutely positioned off that edge rather than the zone measuring anything.
`.band-label` is `top: 8px` and `.band-zone .anchor` is `top: 34px` — `#lot-header` and
`#lot-items`'s own offsets, read literally rather than approximated. Mirrored alignment (`left: 0`
/ `right: 0`) is untouched, per the owner's ruling that it was already correct.

**The header shrinks to fit its column; the label is nomenclature, not a size claim.** The owner's
words, verbatim: *"Header is nomenclature of function, not definitive of size requirements. Reduce
the font size of requirements and components so they fit within their quadrant, on either side of
the title box, anchored horizontally to the border line of their quadrants."* 12 px is not a taste
— it is the largest whole pixel size that clears `--card-w`'s existing 100 px floor: B35 measured
the widest system-ui "Requirements" at ~118 px at 15 px/600, which scales to 94.4 px at 12 px
(5.6 % slack) and 102.3 px at 13 px (fails). Consequence: the 100 px floor is now load-bearing in a
second way, and the two — floor and label size — must move together if either changes again.

**`--card-actual-h` and `syncCardHeight()` are deleted.** B37 added them for one job: republishing
the card's rendered height so `.band-zone`'s labels would grow with a wrapped title. The labels no
longer hang off the card, so there is nothing left to synchronise — a CSS var, a JS function and a
per-keystroke `offsetHeight` read removed because the geometry got simpler, not because it stopped
mattering.

**The exporter draws the same three sides.** `frameOpenTop` fills a plain rect, then strokes a
single path — down the left, across the bottom, back up the right — inset by half the border width
on the three drawn sides only, the same half-width correction `frame` already makes for a CSS
border drawn inside its box. The compartment's 2 px corner radius is dropped in the export: at the
page's 0.581 A4 scale it is ~1 pt, and a three-segment path is more honest about which sides exist
than rounding a corner that is not drawn. `EXPORT_GEO`'s `cardTop`/`cardMinH`/`cardPadTop` restate
the compartment and `zoneHeaderY`/`zoneItemsY` restate the band's new offsets — [11c] measures the
live board and requires all of them to agree.

**`sw.js` is `v7`.** Non-optional, per B36: a correct stylesheet that never reaches an installed
device is not a fix.

*Known, not fixed.* `#lot-header` stays at 15 px, so the board now names its sections at two
different sizes. The lot header has the full sheet width and is under no pressure to shrink;
unifying the two sizes is a hierarchy call nobody has made.

*Impermanent, still.* `EXPORT_GEO` remains a second copy of this geometry. [11c] pins it to the
rendered board rather than to a literal, which is as close to one source as two files get without
a shared module.

---

## H. Note width (issue #53)

### B39. A note wraps at the sheet's right edge, not at a predetermined width (resolves B40's cap residue)

The bug report: neither desktop nor mobile text frames should have predefined widths — the
max width is the width of the entire board, and only a line that would exceed the board's
right edge wraps. The cap in force was a number: 405 on desktop, 45% of the sheet on mobile
(`noteMaxW()`, published once per layout on `#board`). Both were readings of PRD §6.2's "45%
of board width" against frames that no longer exist for every note — the cap was frame-blind,
which is B40's *known, not fixed* paragraph.

**Ruling.** A note's max-width is the remaining distance to the sheet's right edge, in the
note's own unscaled units, floored so an edge-adjacent note stays a usable column:

```
noteMaxW(note) = max(NOTE_MIN_W, (LOGICAL_W − renderX(note)) / effScale(note))
NOTE_MIN_W = 60          /* ~3 chars at 17px + 28px of padding and border */
```

which reduces to `(rw − x)/scale` in authored units — **frame-invariant**: the same note
wraps at the same point on every device, and a grab's rebase (B21/B40) cannot rewrap it,
because the fold leaves that ratio unchanged. The var moves from `#board` to each `.note`
(custom properties inherit; `.note-text` reads it as before, fallback `none`), set by
`applyNoteWidth` in `makeNoteEl`, in `applyLayout`'s per-note loop (before `setHitInset`,
which measures the offsetWidth the cap changes), in `applyNoteScale` (scale changes the
unscaled cap), and live in `updateDrag`.

**The cap is live during a drag.** Dragging a note rightward tightens its cap and the text
rewraps narrower as it goes; the smaller footprint frees more x, and the loop converges in a
single pass per move — an overhanging rewrapped foot means the cap was floored, and pulling
x back to the edge leaves the applied cap exact — at worst at `x = LOGICAL_W −
NOTE_MIN_W·scale`. The rewrap changes the *height* too, so the drag's bottom bound is live
as well (`settleDragFoot`): derived per move from the measured foot, plus the overhang the
grab itself admitted — B40's oversized cross-frame arrival never teleports, and only
overhang the drag's own rewrap creates is pulled back onto the sheet. The per-move measure
is reflow-guarded: the width write and `offsetWidth` read are skipped while the cap provably
cannot bind (the note at natural width, the cap at or above it), and the drop forces one
exact settle before `saveNow`. Legal under B17/B21: the re-clamp runs inside the gesture,
which owns its writes; outside a gesture stored x/y are untouched, and a note that used to
wrap at 405/45% simply rewraps wider and flatter where it stands — intended, shipped.

**The export mirrors the law, mandatorily.** `exportNoteBox` wraps at `max(NOTE_MIN_W,
(EXPORT_W − exportX)/((scale ‖ 1)·exportMult))` — the same `(rw − x)/scale`, resolved
against the 900 frame — replacing B40's authoring-frame cap (`min(405, 0.45·rw)`), and
`EXPORT_GEO.noteMaxW` is gone. Screen wrap width ≡ export wrap width in authored units,
which resolves B40's known-not-fixed cap paragraph outright: no double-shrink on a
narrowing phone, and a cap-hitting cross-frame note can no longer disagree between the
desktop screen and the PDF. `test/desktop.js` [D17] and `test/mobile.js` [18] pin the
equality; [D8] and mobile [11] now assert edge-wrap where they asserted the numbers.

**Costs.** A note created at the right edge is born a NOTE_MIN_W column — the floor is the
price of never refusing capture there. A note's wrap width now depends on where it sits, so
dragging changes its shape; that is the feature. And the one-column collapse the 45% cap
existed to prevent (B32) is now the author's own choice to make — a note only spans the
sheet if its text is long and its x is 0.

*Known, not fixed.* The law binds x. Vertically, typing can still grow a note past the
sheet's bottom (the input path has never clamped position, and B17 wants it that way), and
a cross-frame arrival keeps whatever bottom overhang it arrived with — only a drag's own
rewrap is pulled back. `NOTE_MIN_W` is a felt value — re-interrogate it on the device, like
B18's 400ms.

Supersedes PRD §6.2's 45% cap as read by B32 ("--note-max-w set in applyLayout" — the
per-note var is the pattern now) and B40's exportNoteBox cap; B40 is annotated in place.

---

## I. Homothetic note rendering (issue #57)

### B40. Notes render homothetically: position's law applied to size (extends B21/B32)

The bug: resizing a desktop window slid constant-size notes into each other, and the PDF —
a fixed 900×1000 frame — showed the same collisions. B21 maps `x` proportionally
(`renderX = x · LOGICAL_W/rw`) and B32 gave `y` the mirror law against `rh`, but a note's
*visual* size stayed constant in logical px, so positions tracked the frame while sizes did
not, and relative geometry was not preserved across viewport changes.

**Ruling.** The law the position already obeys is applied to the scale: `noteMult =
LOGICAL_W / (rw ‖ 900)` — renderX's own ratio — and a note draws at `effScale = scale ·
noteMult`. Along x, position ×k and width ×k together preserve horizontal overlap *exactly*
for any change of sheet width: the viewport resizes and the notes resize at the same ratio,
which is issue #57's instruction verbatim. Desktop's geometry (B20) has two regimes and both
cooperate: width-limited windows pin `LOGICAL_W ≡ 900` (the multiplier never moves), and
height-limited windows pin `LOGICAL_H ≡ 1000` so *only* width varies — the reported case,
where preservation is exact.

At grab, `rebaseNote` folds the multiplier into the stored scale (`scale *= mult`, alongside
the existing `x`/`y`/`rw`/`rh` rebase). Visually silent by construction — `effScale` before
equals `scale` after — and mult ≡ 1 from then on, so every gesture (drag footprints, pinch,
frame-drag resize) runs in current-frame units unmodified. A folded scale may legitimately
leave [0.5, 2.0], so the pinch/resize clamps widen to include the start value
(`gestureScale`: `clamp(start·f, min(MIN_SCALE, start), max(MAX_SCALE, start))`, one helper
shared by both per B22): an out-of-range note never jumps at gesture start, and can always be
scaled back into the authored range but never further out. The footprint clamps get the same
treatment, because a folded note can be bigger than the sheet and the old
`[0, max(0, sheet − foot)]` range then degenerates to `[0, 0]` — a corner pin. The drag range
is fixed at grab and widened to admit the grab position (silence again), and
`applyNoteScale`'s re-clamp becomes `min`/`max` of the same pair — sheet-inside-note where
note-inside-sheet is impossible; for any fitting note both are byte-for-byte the old bounds.
The multiplier itself is never clamped — MIN/MAX_SCALE bound the *authored* scale at gesture
time, not the frame mapping. The export applies the same law against its own sheet
(`exportMult = EXPORT_W / (rw ‖ 900)`), which is the downstream fix: screen and PDF now share
one law, where before the PDF drew every note at authored size regardless of the frame it was
written in. `exportNoteBox` wraps at the *authoring* frame's width cap
(`min(405, 0.45·rw)` — 45% of a mobile sheet, the literal 405 on desktop, selected without a
mode flag because B20 pins desktop `rw ≥ 900`): wrapped at the literal 405, a phone-authored
note would re-wrap wide and, under `exportMult`, run off the export sheet. `effScale` and the
fold guard a missing legacy `scale` with `‖ 1`, as the exporter always has — a drag must not
write `NaN` into storage.

Costs. A note authored on a wide desktop frame arrives small on a phone (and a phone note
large on desktop) — that is the point, but cross-device notes no longer land at "their" size;
the decoupled hit floor (B7) is what keeps a shrunken note tappable. Stored `scale` is no
longer confined to [0.5, 2.0] after a cross-frame grab; every read site outside the widened
clamps was checked and none assumes the range.

*Known, not fixed.* Size rides the x-ratio while y rides the height ratio (B32), so when the
two diverge — an aspect-ratio change — vertical clearances can still shift: a note may close
on or open from the one below it even though horizontal geometry holds. Accepted: mapping y
by the x-ratio instead would push notes off the bottom of a shorter sheet and demand exactly
the re-clamps B17/B21 forbid. And the *screen's* width cap is still frame-blind — a note
holding `--note-max-w` loses width twice on a narrowing phone (once as the cap tightens, once
from the multiplier), and a phone note re-wraps at desktop's 405 and can overhang the sheet
there, which is why the footprint clamps above had to learn the oversized case. The cap is a
later unit's subject and is untouched here; until it lands, a cap-hitting cross-frame note is
the one place the desktop screen and the PDF still disagree — the PDF draws the authored
proportions.

*[The width-cap clauses above are resolved by B39 (issue #53): the cap is now per-note and
frame-invariant — `(rw − x)/scale` — and the export shares it. The y/aspect clause stands.]*

B21's grab-time rebase (`x = renderX; rw = LOGICAL_W`) now folds scale as well; B22's
"frame-drag resize shares pinch's scale/clamp/hit math" still holds — the two clamps widened
together.

---

## J. Desktop dismissal and multi-selection (issues #54, #55)

### B41. Click-away while editing commits and dismisses, never creates; shift-click herds notes

**#54.** The desktop `canvas`/`lot` tap guarded on `selected` alone, but while EDITING nothing
is selected (edit paths clear selection first) and the recognizer's `isEditing` early-out tests
the *clicked* target, not the active editor — so a click on bare paper mid-edit sailed past the
guard, `preventDefault` had already suppressed the native blur (B27), and the tap fell into the
ghost + `createNote` path: dismissal and creation on the same click. Ruling: a mode-independent
`isEditing(document.activeElement) → blur` guard sits ABOVE the `selected` check in both
creation-surface cases — the blur runs the commit-on-blur path, the click is spent on
dismissing, and the NEXT click creates (ghost + B18 window), which is desktop parity with #41's
mobile rule. The desktop `note`/`lot-item` branches commit an open editor the same way before
selecting; on the edited note's own hit collar the click only dismisses, because edit and
selection are mutually exclusive (B22).

**#55.** Desktop notes gain shift-click multi-selection; **lot rows stay single-select by
design** — a lot line is a list entry, not a spatial object worth herding. `selected` remains
the sole PRIMARY, so every existing `selected &&` guard is untouched; a module-level `multiSel`
set holds member ids and is empty (today's behavior, bit-for-bit) or size ≥ 2 and containing
the primary. The primary wears the one `#selection` overlay; every other member wears
`.multi-selected`, a CSS outline that rides the node itself — zero JS positioning. With two or
more selected the overlay hides its edges and handles: **resize is single-selection only**.
Shift-click toggles membership (adding makes the clicked note primary; removing the primary
promotes another member; the last removal clears) and never pairs into the double-click window;
a plain click collapses to single. Group drag: grabbing a member moves every member by one
delta — per-member `rebaseNote` at grab (B21's licensed write, folding each member's scale per
B40), per-member bounds widened to admit the grab position, `.pressed` on all, `surfaceNote`
only on the grabbed one, one `saveNow` at drop. Members hitting different clamps can compress
the group's relative geometry at the sheet edge — accepted; the alternative is a group that can
never park flush. Right-click (the recognizer now ignores non-primary buttons outright) opens
the selection's own menu via the delegated board `contextmenu` listener: Complete all — Restore
all only when EVERY member is complete — then the hairline, then Delete all in `--danger`
(UIUX §7); singular labels at size 1; empty canvas and active editors keep the browser's native
menu. The sel-actions row acts on the whole selection: Complete/Restore keyed off the primary
applied to all, Copy joins every text primary-first with newlines, Delete routes through the
new `deleteNotes` — one B18 window, one save, ONE Undo that re-inserts every note at its
original index and restores DOM order. `clearSelection` strips rings and set together, so
`applyMode`'s teardown and `renderBoard`'s rebuild stay one call; note-removal paths drop ids
from the set, and a set of one collapses back to a plain single selection.
`test/desktop.js` [D18] pins the dismiss-then-create sequence; [D19] pins rings, hidden
handles, the shared drag delta, the menu shape, and the batch Undo round-trip.

---

## K. The desktop rail's categories (issue #58)

### B42. The rail sorts into To-Do / Idea / Unsorted, and each section pages (supersedes B24's overflow ellipsis)
The desktop rail splits into three equal sections — To-Do Boards, Idea Boards, Unsorted
Boards, top to bottom. A board carries `category` and `catStamp`, both read-site
defaulted (the B21 idiom — no migration, no DB version bump): a record without a
category *is* Unsorted, so every pre-#58 board and every new board lands there by
writing nothing. In-category order is `(catStamp ‖ createdAt)` desc with B24's
immutable comparator as tiebreak. A pointer-drag moves a card between sections —
pointer-based like the list rows, because native HTML5 DnD fights the cards' button
semantics and paints its own ghost — and the section under the cursor frames itself in
`--accent-page`: where the board will land. Release writes `category` +
`catStamp = Date.now()`, which *is* moved-to-top by the sort key. The drop is a
completed gesture like a note drag: saved immediately, no B18 window. Whole-record
puts (B13) make the write site two-headed — the open board mutates `current` +
`saveNow()` (putting any snapshot would lose live edits); any other board is fetched
fresh and put directly (the debounced persist can't clobber a record it never holds).
Overflow **pages** instead of scrolling: each section clips to a per-page card budget
measured from the rail's height (re-derived on resize), and «‹›» pager buttons —
muted blue `--accent-page` paired with `--paper`, the sel-btn construction so both
themes invert ≥ AA, behind a neutral `--ink-shadow` border — turn pages instantly,
like all navigation (B22: B18 governs consequences, and a page turn commits nothing).
Page state is per-category, clamped every render, reset to the first page on a drop
into the section; a single page hides its pager and indicator (§10: no state, no
statement). B24's "when boards overflow the rail, the bottom edge says so"
(`#pane-more`'s ellipsis) is **superseded** — pagination states the same truth and
makes it actionable.

---

## L. The menus: All boards, and Copy (issues #59, #60)

### B43. Every menu says "All boards", and every item offers Copy (issues #59, #60; supersedes A1's item order)

**"Boards" → "All boards".** The menu item is a destination, and beside Complete and Delete the
bare word read as a category label for the things on the board (issue #60). The rename is the one
`COPY.boards` key, so every menu site changes together — the item menu and the anchor's
Export · All boards. The `#list-title` page heading still says "Boards": it is not a menu, it
names the page you are standing on, and that is the one place the old word was right.

**Copy is an action on the record, not the DOM.** `copyText()` writes the item's `.text` field —
plain text by construction, the data model has never held anything else (B3) — through
`navigator.clipboard.writeText`, falling back to a throwaway textarea + `execCommand('copy')`
where the async API is missing or rejects. The textarea must opt back into `user-select: text`
(the body forbids selection, so `select()` would otherwise grab nothing), sits off-viewport, and
is removed in `finally`. Success shows a short "Copied" notice; failure shows "Couldn't copy." for
longer, because the notice is the only evidence anything went wrong — and `showNotice` already
refuses to clobber a pending undo. Copying a completed item is allowed: the scratch-out withholds
the text from the screen and the export (§4.3), but the record still holds it, and Copy reads the
record.

**The item menu reorders: All boards · Complete/Restore · Copy · Delete.** A1 led with Complete on
the reading that the likeliest action goes first. With four items the menu now reads navigation
first, then the item's own actions in rising severity — change state, read out, destroy. That
supersedes A1's Complete-first placement; UIUX §7's actual law — destructive last, in `--danger`,
behind the hairline — holds unchanged, and `test/mobile.js` [8] pins the new order. The anchor
menu stays Export · All boards: two non-destructive items, no separator, same as everywhere else.

**Desktop selection shows Complete · Copy · Delete.** The new `.sel-copy` rests in plain ink — the
accent fills mark state changes, and Copy changes nothing — and drains on tap like its siblings.
It runs through `delayAction` like every action (B18 uniform): a clipboard write has no visible
result of its own, so the drain is the acknowledgment. Lot rows carry the same inline button, and
all of it routes through the recognizer, not native `click` — setPointerCapture retargets clicks,
the constraint B22 already records. `.sel-actions` centres its flex row under the note, so the
third button arrives centred and equally spaced for free; `test/desktop.js` [D15] pins the order,
the empty B18 window, and the clipboard round-trip.

---

## M. The board list's categories (issue #74)

### B44. The list view is the rail's twin: same categories, same paging, and the scroll it gave up buys the drag (extends B42 to mobile; supersedes B24's flat list)
Issue #58 sorted the desktop rail into To-Do / Idea / Unsorted with a pointer-drag between
sections and per-category pagination (B42). Mobile kept the pre-#58 screen — one flat,
scrolling list ordered by `createdAt` — so the same records told two different stories
depending on which device you picked up. Categorization is a property of the board, not of
the surface reading it; issue #74 makes the list say what the rail says.

**One law, two skins.** Everything B42 ruled is now surface-neutral and lives beside
`boardOrder` in §11, not inside the rail's §11.5: `BOARD_CATS`, `CAT_COPY`, `catOf`,
`catOrder`, the `catPage`/`catCap` pagination state, `catPageCap`, `makeCatSection`,
`goCatPage`, `makePagerBtn`, `dropBoardCard`. `renderPane` and `renderList` are now the same
function with a different card-maker, and both emit the identical section — head, cards,
pager — so what differs between phone and rail is CSS and nothing else. That is the same
stance the app already took on the recognizer: one code path, `isDesktop` branching inline.
The read-site default holds unchanged (B21's idiom): a record with no `category` **is**
Unsorted, so nothing was migrated and no DB version moved. `catPage` is shared by both
surfaces rather than duplicated, because they are never on screen together — `applyMode`
pops the list state on the flip to desktop — and each render clamps, so a differing
per-page budget heals itself instead of stranding a reader past the end.

**The list stops scrolling, and that is what pays for the drag.** B42's "overflow pages,
never scrolls" arrives on mobile as the removal of the one thing that made a drag ambiguous
there. With `#list-view` at `touch-action: none` (the board's own stance, B12) there is no
vertical pan for a press-and-move to be confused with, so the drag needs no long-press to
arm it: movement past `MOVE_THRESHOLD` is the whole discriminator, exactly as on the rail
and on the board itself. The press therefore has three readings and they do not overlap —
**move** drags the card to a category, **hold** opens the board's Export · Delete menu
(B43/A1 untouched, and movement cancels the timer per B29), **release** opens the board
through B18's window. Drag start vibrates like the hold does: both are the moment the
gesture changed meaning. The drop itself is a completed gesture like `endDrag` — written
immediately, no B18 window — and releasing over the section the card already lives in is a
change of mind, not a move: no write, no reorder, no page reset.

**Three equal sections, and the furniture pays for the boards.** The rail spends 56px per
section on furniture (a 24px head above the cards, a 32px pager below). On a 384×846 phone
that leaves two cards per page. Mobile therefore merges the head and the pager onto one
48px strip — the same three DOM children, laid out by a grid instead of a column — and gets
three. The pager's buttons meet the 44px touch floor rather than the rail's B23 24px, and
share their borders in the seam `.pane-del` already uses: four separate squares at that size
crowd "Unsorted Boards" off its own strip, and one segmented control reads as one control.
The `n/m` indicator moved from beside the label to between `‹` and `›` on **both** surfaces:
it states which page the arrows are on, so it travels with them, and §10's "one page says
nothing" then falls out of the pager's own `hidden` instead of a second guard that has to
agree with it.

**Consequences taken deliberately.** Three sections are always drawn, so a phone holding one
board shows two empty thirds — a category you cannot see is a category you cannot drop into,
and the drop targets are the feature. The capacity check in `applyLayout` grew a mobile arm,
so a rotation re-paginates; `showList` now reveals the view *before* rendering, because
`catPageCap` measures `#list-rows` and a `hidden` element measures zero; and `deleteBoard`
re-renders the list after the row's `leave`, because a paged section must pull the next board
up where the flat list could simply close the gap. `test/mobile.js` [19] pins the header
order, the untouched-storage default, the touch-drag (landing frame, ghost, the write, and
that it neither opened nor switched a board), all three readings of the press, the pager,
the 44px floor, and the two assertions the whole ruling rests on — neither the category nor
the screen may scroll.

**Not ruled here.** Dismissing an open menu is inert only where the press lands on `#board`
(B30's `swallowTap`), so a dismiss onto a board card still opens that board. That predates
categories — the flat list behaved the same way — and is left as it is rather than widened
inside this issue.

---

## N. The v2 design system (PRs #76–#81; proof sheets 1–7)

### B45. v2 is the design system, and the specification is sized to the change (supersedes the draft that retired this file)

**A specification describes what is changing, not what already runs.** The first v2 draft ran to
1,707 lines of `PRD.md`: 87 numbered requirements, of which 64 restated behaviour that already
ships and is already recorded here, in this file, with the reasoning intact. A second copy with
nothing keeping it honest is the same defect as the five unsynchronised colour sync points it
correctly identifies — a value restated in places that cannot see each other — and the copy was
twenty times the size. It also carried sections that existed only because the scaffold had them:
an API contract that says "N/A", a dependency list that says "None", a tech stack that says
"None", a project structure for five files, and a commands section duplicating `CLAUDE.md`, which
is the file a session loads automatically. `PRD.md` is now §1–§8 and one appendix: the taste
layer, scope, the data model, the constraints, eighteen design-system requirements, how they are
verified, the risks, and the citation table. Everything cut is either in this file, in `UIUX.md`,
or in `CLAUDE.md` already.

**This file stays the decision record.** The draft retired it — "for v2, decisions live in
`PRD.md` and `UIUX.md`, not in a `B44+` here" — on the reasoning that two records can disagree.
The reasoning is sound and the conclusion is backwards: a specification says what must be true,
a decision log says what was tried and rejected, and it is the second that stops a future session
re-proposing an approach that has already regressed the band four times. B44 was ruled and merged
to `main` eleven minutes before that sentence was written, which is the practical answer to
whether the record had stopped being needed. New rulings continue here, citing `UIUX §x` where
the rendering detail lives rather than restating it.

**Three things are separated out of this release, and none is abandoned.** The fold/rotate
arrangement bug (issues #65, #75) is the highest-value change outstanding and has nothing to do
with colour; it needs its own ruling because the similarity transform supersedes B40 and B21, and
gating it behind a palette serves neither. PDF font embedding is ~150KB per exported file in the
most intricate code in the app, bought for typographic consistency on a printed sheet. Mobile
board categories were specified as v2 scope after B44 had already shipped them. What remains is
one coherent change: the app gets an identity, and nothing it does changes.

**The design work itself is kept whole**, because it is the release. `UIUX.md` §2's ladder, the
per-surface ink rebinding, the edge rule and its twelve adjacencies, and the two-tone focus ring
were recomputed independently and every published ratio reproduces. They also caught three real
defects in the draft that preceded them — a rule at 1.64:1 on the surface it crosses, a border at
1.00:1 on its own ground, and two accents tabulated below AA as text without being flagged. That
is the work; the rest was scaffolding around it. One arithmetic slip is corrected in passing:
`UIUX §13.3` said eight of ten marks fall back to a platform font. Four of the ten are guillemets
and plausibly in a Latin subset; six fall back.

---

### B46. The surfaces take the scene: seven proof rounds land deep dusk (supersedes B16's poles and the flat sheet; B18's letter bends, its job does not)

The palette was not argued into place; it was rendered into place. Seven proof-sheet
rounds ran outside the repo — full-board specimens against the live geometry — and the
final one is committed at `docs/proofs/proof-7-a-well-swapped.html`, carrying its own
verification table. Round 1's teal ladder, which PRs #76–#80 spent a day documenting
against each other, was "wrong in almost every value" by round 7. The settled system is
`UIUX §2.2`: **the band `#020812` is the deepest surface on the page** — sheet 7's one
change was exchanging the band's and card's fills, so the furniture recedes below the
title it frames and the card separates by its border alone — the sheet is a three-stop
water field with an edge falloff and dither (`UIUX §2.8`), the Parking Lot is warm sand
with weather (`UIUX §2.9`), and the note is `#a0d4da` behind its 2px ink frame.

Two claims died on the way and are reworded rather than defended. *"The note is the
brightest surface in the app"* is false against the sand; the claim is now scoped to
where it is true — brightest **on the water** (`PRD §1.4`, `UIUX §2.2`). *"One warm
hue"* gains a word: one warm **accent** — sand is ground, not signal (`UIUX §2.6`).

B18's grammar keeps its job with one word of its letter bent: acknowledgment is still
thickening for content and fill for controls, and completion is still texture. The
resting note now carries a fill, which B18(b) read as forbidden — but what that ruling
was protecting was the 400ms window's honesty: a fill *as acknowledgment* would be
indistinguishable from the completion mark. A resting fill is neither a state change
nor a mark, the pressed state still thickens (2px → 3px), and the scratch-out is still
ink texture at ≥90% coverage. Nothing in the window lies.

### B47. The band is a section above its rule, and both ends of the sheet close the same way (supersedes B35/B38's gutter-inset rule and B37's fixed budget; keeps B37's law and B38's compartment)

Reading down: **content, then its header sitting on the rule, then the rule as the
band's bottom edge** — which makes the band the exact mirror of the Parking Lot: one
section closing each end of the sheet, free canvas between (`UIUX §3.1`). Both rules
run the full width. The band sizes to its tallest zone from a two-line floor — 87px at
the floor, 106px at three lines — the same law the lot has always used for its rows;
the lot itself goes full-bleed with its content on the gutter and keeps B37's
viewport-derived budget as a **ceiling** only (`UIUX §3.2`).

B37's deeper law — *across is a fraction of the sheet; down is set by the type* —
survives intact and is what makes the sizing work. What dies is the fixed
`--rule-y: 48` and the gutter-inset rule. B38's compartment is untouched: it overhangs
the band by 22px, occludes the rule, and draws three sides with the sheet's own top
edge as the fourth. `EXPORT_GEO` and the geometry assertions in `test/mobile.js` /
`test/desktop.js` move **with this ruling when it ships, not before** (`UIUX §16.3`).

### B48. The light theme is retired, not made optional (supersedes B16; halves B11; hardens B34's export palette)

Dark-only, because `PRD §1.2`'s P4 forbids the question a theme asks. The whole light
`:root` and the `prefers-color-scheme: dark` block are **removed, not overridden**
(`UIUX §2.1`). B11 splits down the middle: its orientation half stands; its colour half
collapses — the two per-scheme `theme-color` metas become one value, and
`manifest.json`'s pair follows. B34's *"paper edge to edge, always light"* already
ruled that the export ignores the screen; with one dark theme that hardens from a
preference into a necessity — `PDF_PAPER` / `PDF_INK` / `PDF_SHADE` stop being
derivable from `:root` and become the export's own named palette (`UIUX §15`). The
`icons/` motif regenerates from the new poles, as B16 regenerated it under B1.

### B49. The note takes its colour, and the radius moves to 3 (extends B39/B40's homothetic reading; the ring re-derives to 4)

The note rests as `--note` behind its 2px ink frame at radius **3px**. The
counterargument is recorded because it was good: an earlier draft held the radius at 2
on the ground that the radius set is three steps — 2 drawn, 3 the selection ring, 8
elevated transient — and the ring is 3 *because* it sits 1px outside a 2px note. The
rendered proofs overruled it: at 3px the note still reads as drawn at every scale it
can take (`NOTE_MIN_W = 60` under the uniform scale keeps it near-square — the B39/B40
constraint), and the ring re-derives to 4 by the same 1px-outside law.
`EXPORT_GEO.radius` mirrors the move by hand (`UIUX §16`).

### B50. One typeface, self-hosted; the marks are drawn, not typed

**Montserrat Alternates**, 400/600/800, Latin-subset woff2 — committed in `fonts/`
(extracted from proof sheet 7's embedded faces), declared and cached only when the
system ships (`UIUX §13.1`). The re-measurement B37 makes mandatory — the band is sized
by the type it holds — is discharged in `UIUX §13.2`: every figure clears, and the
measurement surfaces one question this ruling deliberately leaves open: on the new face
13px, not 12px, is the largest whole pixel at which the widest label fits the 100px
column, so B38's own rule returns a different answer than the stylesheet. Decide it;
don't inherit it.

The ten menu glyphs are **retired as type and redrawn as inline SVG** in the note's own
stroke weight and corner radius (`UIUX §13.3`). Six of the ten fall back to platform
fonts under any Latin face — the objection `app.js` already applies to `🗑` alone,
multiplied by six. A symbol asked to render identically everywhere in one voice is not
text; type is the wrong medium for that job.

### B51. Three records, one home per value (supersedes B45's document-shape clause)

B45 sized the specification to the change, and half of that ruling stands: restating
shipped behaviour as numbered requirements was the defect that sank the 1,707-line
draft. But its shape clause — *"`PRD.md` is now §1–§8 and one appendix"* — is
superseded, because the cut also destroyed the verified §1–§8 product reconstruction
that ~20 `PRD §x` citations in the code and in this file resolve against. The
consolidated shape: **`PRD.md`** restores the reconstruction and holds positions only
(`PRD §9`; the boundary in `PRD §10`); **`UIUX.md`** holds every enumerable value,
once; **this file** stays the record. A value with two homes has no home — the v2
attempt proved it by desynchronising `PRD.md` and `UIUX.md` inside a single PR. The
four overlapping v2 PRs collapse into one, and the proof sheets gain a committed
reference (`docs/proofs/`) so the next session reads the render rather than
re-deriving the design from rival documents.

### B52. The room joins the water: chrome takes the band's value, and the accents re-derive into the settled families (supersedes the round-1 chrome and accent values; discharges `UIUX §16.1`'s "largest open gap")

`--chrome` — the ground under the menu, the toast, the board list and the
desktop rail — and the three accents were the last round-1 teal survivors,
tuned against a palette that no longer exists. Round 8 re-derived them the way
rounds 1–7 settled everything else: by rendering, against every floor in
`UIUX §2.3.1`–`§2.3.2`, `§2.5` and `§2.6`, each ratio printed against the worst
extreme of its range.

**Chrome proposes no new hex.** A third hue family needs a third job chrome
does not have (`UIUX §2.2.1`, rule 2), and a new *rung* lost before rendering:
chrome touches neither the band nor the card — the menu and the toast float on
elevation, the list replaces the page, the rail sits beside it — so an eighth
value would be a rung with no adjacency to earn it, a pixel that cannot name
its job (`UIUX §1`). Of the two recessed values that exist, the card's
`#08152c` was rendered and rejected: legal, but every separation lands at
exactly 3.01 — the floor with nothing to spare, on a full-height seam — and
the menu stops reading as summoned, reading instead as the compartment,
detached. **The band's `#020812` wins**: the room behind the page is the sky,
every surface on the page stays lifted above it, and the margins are real —
seam 3.32, rail card 3.32, hairline 3.52 (`UIUX §2.2`, `§2.6`). `UIUX §2.5`'s
0.40 hairline alpha survives unchanged, and `§2.7`'s ring gains the chrome row
its table never had.

**The accents move into families the scene kept.** Round 1's `#B7E3E1` and
`#6E9C9A` were hue 177° — the retired teal's kin, relatives of nothing left on
the page. `--accent-restore #b6dee2` is the note's own hue and saturation
lifted 74 → 80, the derivation `--frame` used on the band: what restores is
kin to what returns. `--accent-page #6d9cb0` is the field's hue at the old
value's depth: the accent about boards, cut from the board's own water.
`--danger` was re-derived and the derivation did not move it — every floor
clears with room, hue 14° keeps its distance from the sand it is never
adjacent to, and it stays the only saturated warm — so `#E2A08C` holds,
**re-chosen rather than inherited**.

The counterargument is recorded because it was good: the note's exact
`#a0d4da` as the restore accent — the undo toast offering literally the note
back. Rejected on `UIUX §1`: a Complete button in the note's own fill and
frame is a control wearing content's identity, and structure-not-costume cuts
both ways. A second consequence is accepted rather than hidden: a summoned
Complete fill (0.677) can outshine the note (0.596) while selection chrome is
up, exactly as the menu can shadow it — transient surfaces are above the page,
not part of the scene, so `PRD §9.2`'s brightest-on-the-water claim is
untouched. One question surfaced by the verification is recorded in
`UIUX §16.1` rather than ruled: the Delete fill/border handover on the field
dips to ~2.99 over a narrow reach of the fall — a `UIUX §14` construction
question, not an accent value.

**Provenance.** Proof sheet 8, "The Room Behind the Page", rendered the
candidates, the rejections and the maths, and was ruled **not committed** —
its derivations live in this entry and in `UIUX.md`'s restated tables. Proof
sheet 9, "A Well, Furnished", renders the ratified system whole, with nothing
beside it, and is committed at `docs/proofs/proof-9-a-well-furnished.html` as
the rendered reference alongside sheet 7.

### B53. The strike and its burial are one decision: 0.62 over 0.12 (supersedes `UIUX §4.3`'s 0.97/0.40 letter; keeps its law)

The scratch-out's three stroke families at 0.97 were tuned when the completed
thing sat on a mid ground; on the 0.66-luminance sand the union read as a slab
— `UIUX §16.1` carried the complaint three times unruled. The repair axis is
the one `UIUX §2.3` already sanctions — one ink per surface, expressed at a
weight — so the geometry never moved: same three families, ≥90% coverage
(93.6%, measured by rasterising the sheet's own pattern), radius tracking the
note's.

Rendering then forced a second value to move with the first, which prose alone
would have missed. The 0.40-ink burial was calibrated for a near-opaque veil:
at 0.97 the strokes crush what is under them, and the burial only had to kill
the 10% showing in the gaps. Thin the veil and the words come back *through*
the strokes — at 0.62 over 0.40 both rendered specimen lines read at 1.3× —
breaking the invariant P5 rides on: the strike is the record that work
happened (`PRD §1`), and the content under it is destroyed, on screen as B34
made it in the bytes. So the veil and the burial move together: **0.62 over
0.12**. The strike composites to 4.53 / 4.71 / 4.35 against the note, the
shelf's base and its darkest wisp — a mark everywhere, above the 3:1 floor its
worst ground demands (0.45 dies there at 2.76 and was rejected on the math
before taste voted) — and the buried text lands at 1.28:1: a smudge that still
says *something was here*, with the words gone at any zoom the app can
produce.

### B54. The band label takes the pixel back: 13px (supersedes B38's 12px letter; keeps B38's rule and B37's law)

B38 chose 12px as "the largest whole px at which the widest measured
*Requirements* fits the 100px column" — measured in `system-ui`, a face the
app no longer speaks. In Montserrat Alternates the same word sets 95.2px at
13px (`hmtx` upper bound; 96px browser-rendered), so B38's own rule applied to
the committed face returns 13, and `UIUX §13.2`'s open question closes the way
B50 asked: decided, not inherited. The band is sized by the type it holds
(B37), so the formula's label term moves 15.6 → 16.9 and the band grows by
exactly the pixel the label takes — 88 at the floor, 107 at three lines
(`UIUX §3.1`). The counterargument was real: nothing is broken at 12, and the
headroom is harmless. Rejected because keeping it inherits a dead face's
measurement into a face that has already paid the pixel back — and the label
is the smallest text on the page, read at arm's length on the primary device.
Both sizes were rendered side by side at the committed geometry in round 8;
sheet 9 renders 13 in place. `test/mobile.js`'s band-geometry assertions move
with this ruling when it ships, not before (`UIUX §16.3`; B47's clause
unchanged).

---

## O. The recolor ships (PR #86; the shipped round)

### B55. The platform edge wears the sky: one theme-color, #020812 (completes B48's collapse; extends B52 off the page)

B48 collapsed the two per-scheme `theme-color` metas to one and ordered
`manifest.json`'s pair to follow, but no ruling named the value — B11's colour
half died without a successor. The candidates were rendered as launch frames
and put to Rob beside the alternative (`--card`'s `#08152c`): **the sky wins,
`#020812`**. The reasoning is B52's, carried one surface further out: the room
behind the page is the sky, and the OS chrome around the app — the splash
frame, the status bar's tint, the task-switcher edge — *is* the room behind
the page. Everything the app draws stays lifted above what the platform draws
around it. One meta, `background_color` and `theme_color` all read `--chrome`'s
value; `test/tokens.js` holds the three in agreement and requires the value to
be a declared token. Ruled by Rob against the rendered pair on the shipped
round's review sheet.

### B56. The icon grounds the note on the water (B1's motif under B48's regeneration)

B48 ordered the `icons/` motif regenerated from the new poles, as B16
regenerated it under B1. The motif never moved — the near-square note-frame,
two text lines, the completion stroke; identity from structure, not costume —
and the question was its ground. Rendered both ways at 192/512/maskable and
put to Rob: **the field's own fall wins** over the quieter `#020812`. The
launcher is where the identity claim meets the person first, and the claim is
B46's — on the water, the note is the brightest thing there is. A sky ground
renders a note in a void; the water renders the product. The generator is
committed this time (`icons/make-icons.js`, dependency-free `node:zlib`,
`--ground=sky` kept as a flag), so the next regeneration edits a script
rather than reverse-engineering three PNGs. Ruled by Rob on the shipped
round's review sheet.

### B57. The cover screen keeps its three lot rows: the ceiling re-derives under full bleed (amends B37's threshold as kept by B47; ratifies the sheets' 166)

Implementation surfaced a genuine conflict between the records. B47 kept
B37's viewport-derived budget as the lot's ceiling, and B37's letter steps it
at 900 units — two rows below — which caps the 846-unit cover screen at 122
with a third item saved but not drawn. Both ratified sheets disagree: proof
sheets 7 **and** 9 draw exactly that viewport with three rows at 166, and
sheet 9's own footer says what it renders is what ships. Put to Rob rendered
both ways rather than decided silently: **the sheets win — three rows on the
cover screen.**

The repair is a re-instantiation, not a new law. B37's bound was always
proportional — it accepted `182/900 = 20.2%` of the sheet, measured with the
16px bottom margin the lot then carried. B47's full bleed killed that margin,
so three rows now cost 166, and B37's own arithmetic returns a new threshold:
`166 × 900 / 182 = 821`. **Three rows hold from 821 units and two below** —
the 846 cover screen draws three (19.6% of the sheet, *less* than B37
accepted), the short windows in `test/mobile.js` [11b] (715, 600) keep two,
and desktop keeps three exactly as before (B20 pins ≥1000). The ceiling's
values stay 2 and 3; nothing opens toward four. `LOT_3ROW_MIN_H` moves
900 → 821 with the derivation at its declaration, `EXPORT_GEO`'s 1000-unit
sheet is untouched, and `test/mobile.js` [11d] pins the ratified case: three
items at 384×846 draw 166 to the sheet's bottom edge. Ruled by Rob on the
shipped round's review sheet.

---

## P. The second swap (the ruled what-if; proof sheet 10)

### B58. The scene inverts: the canvas takes the deep, the sections take the water (supersedes B46's surface assignment; keeps every geometry ruling; inverts §2.5's rule clause; retires the sand)

Rob saw the shipped v2 on the final-gate sheet, asked for one throwaway
render — the band's dark and the board's water exchanged, the lot joining
the water — and ruled on the render: **this is the one.** The scene
reads water closing each end of the sheet, the deep between, and the
note as the one lit thing on the deep. Ruled the way every scene
decision before it was ruled: from a render, not prose; the ratified
reference is `docs/proofs/proof-10-the-second-swap.html`.

**No value moved; every surface did.** The palette is unchanged — the
swap trades grounds, and the token names follow the surfaces so they do
not lie (`UIUX §16.2`'s discipline): `--band` → `--deep`, the field's
stops → `--water-*`. The sand family had no surface left to ground and
is retired entirely — lot to the water, primary to `--accent-page`
(B59); the six superseded hexes, recorded here as B52's precedent has
it: base `#e3d2b5`, run `#eaddc7` → `#dbc7a3`, wisps
`#d7b7ad`/`#bec3bb`/`#d4bfa0`. The retirement returns two claims B46
had to qualify to their original,
unqualified form: **the note is the brightest surface on the page**
(12.36:1 over the deep, the strongest it has ever read), and
**`--danger` is the only warm hue in the application**.

**The maths inverted one law's letter.** The band's water darkens into
its rule, meeting the deep at 1.58:1 — under `UIUX §2.5`'s 3:1 fill
floor — so the `--frame` rule the recolor called "not load-bearing" now
carries that seam (5.95:1 on the deep, 3.77:1 on the water's darkest
stop). The lot's seam is the water's lightest stop against the deep,
3.32:1: fill separates, and its rule stays a section mark. B53's
scratch pair proved pole-independent: the lot's strike flips to light
ink and still clears the mark floor at every stop (3.19/4.08/5.47),
the burial still a smudge (1.29). The radial falloff's sheet-bound job
died with the water canvas — a near-black ground has nothing darker to
fall to — and the falloff survives only inside the sections, where the
water still ramps. The dither stays: anti-banding over the sections'
ramps, ratified grain over the deep.

**Sequencing, ruled by Rob:** the finished recolor landed first
(PR #86, merged on his word), and the swap ships as its own release —
each release matches its own paperwork, and the record stays honest
about the order in which the design was found.

### B59. The primary takes the accent about boards (supersedes §14's sand fill; completes the sand's retirement)

The `New board` button wore `--sand-base` because the shelf was sand
and the control that makes shelf-space wore the shelf's material. B58
took the reasoning's ground away. Rendered both ways on the swapped
rail and put to Rob: **`--accent-page` wins** over keeping the sand as
a control-only warm. The derivation was already in the record —
`--accent-page` is "the accent about boards, cut from the board's own
water" (B52) — and New board is the accent-about-boards job itself.
6.72:1 on chrome, 6.44:1 under its `--ink-dark` label; the tapped
drain becomes the accent as text on a near-black ground, exactly
§2.6's placement. With the sand gone nowhere survives it, and the
application's one warm hue is the destructive one.

### B60. The icon follows the note's ground: the deep (supersedes B56)

B56 ruled "the note on the water" when the note lived on the water.
Nineteen minutes of shipped v2 later, B58 moved the note's ground to
the deep, and the icon's claim pointed at the wrong surface. Re-put to
Rob with both renders — the water kept, or the canvas matched — and
**the deep wins**: the launcher shows exactly what the app opens onto,
the pale note blazing on the near-black at 12.36:1. The generator's
default flips (`icons/make-icons.js --ground=deep`; the water stays a
flag), and the three PNGs regenerate. B56's water render remains in
the record as the shipped v2 icon it briefly was.

### B61. Both ends close with the same line: the lot's rule takes --frame (supersedes §2.5's "shelf's own ink" clause; completes §3.1's idiom)

§3.1 has said since B47 that the two ends of the sheet close the same
way — yet the recolor drew the band's rule in `--frame` and the lot's
in its surface ink, an asymmetry the sand's on-light context excused.
The swap removed the excuse: both sections are water now. Rendered
both ways and put to Rob: **`--frame` at both ends.** One line, one
idiom, and the lawfulness is already proven — the band's rule carries
its seam at 5.95/3.77 (B58), and the lot's, a section mark over a
3.32:1 fill separation, wears the same line without an obligation to
carry.

---

## Q. The note's text is centered (issue #82)

### B62. A note centres its text in its own frame (extends UIUX §4; leaves B39's width law untouched)

The report: text notes left-align their text; it should be centred with
respect to the note's own frame. Ruled for centring against `UIUX §1`'s
law: the note is a framed object on a sheet, not a document. The frame is
the unit of reading — it earns itself on the first character (B8/B31) and
its border is the only thing separating two overlapping notes (`UIUX §2.5`)
— and glyphs hugging the left edge of a wrapped frame leave the right side
carrying nothing, pixels that stopped earning their place the moment a
line broke early. Centred, the frame and its words share one axis, the way
the title compartment and the band's nomenclature already read.

**One declaration: `text-align: center` on `.note-text`** — the value
lives in `UIUX §4`, the rendering authority. The live editor is
`.note-text` itself (`contenteditable` is set on the node; there is no
overlay element), so rest and edit render identically and typing is
centred from the first character.

**B39 is not disturbed.** Alignment moves glyphs, not the box: the note
stays `width: max-content` capped at the sheet's right edge, and
`text-align` changes no dimension of that box — the wrap cap,
`setHitInset`'s 44px collar, the drag bounds and every stored `x`/`y`
measure exactly as before. A single-line note shrink-wraps to its own
text and centres invisibly; the change is legible wherever a line falls
short of the box's widest — a cap-wrapped note's soft lines, or a short
hard line beside a longer one in a shrink-wrapped note.

**The export moves with the screen, mandatorily** (B34, and B39's own
mirror clause): `exportBoardPage`'s note loop passes `'center'` to the
same `lines()` primitive the band labels and the title compartment
already use, measured over `exportNoteBox`'s content width — the exact
analogue of the CSS content box — so the PDF's inset is the screen's
inset by construction, with one divergence closed rather than copied:
`pre-wrap` hangs a line's preserved trailing spaces, so `lines()`
measures centring against the line sans trailing spaces — counting them
would shift glyphs the screen does not shift. Page 2+ stays left-aligned
prose: B34 made it a searchable document, and a document reads from its
margin.

**The rendered record keeps its dates.** Proof sheet 10 (B58) still
draws its cap-wrapped note left-aligned and stays as ratified — a
pre-B62 render the way sheets 7 and 9 are pre-swap renders, B58's own
precedent. For the note's alignment, the render to trust is the shipped
app, v12 on.

**Scope: the note component only.** `.lot-text` rows and the band's
anchors stay left-aligned — the lot is a list read top-to-bottom down one
edge (`UIUX §3.2`), and the anchors' content hangs from the band's top
against its zone (B47); different objects, different reading.
`#anchor-title` and `.band-label` were already centred.

Pinned per `UIUX §16.3`: mobile [18b] and desktop [D17b] assert the
computed style on `.note-text`, and [D17b] parses page 1's content stream
to prove a deliberately short line inside a cap-wide note draws with its
`Tm` x operand inset from the note's left content edge — centred in the
file, not just in the DOM.
## R. Creation moves into the categories (issue #88)

### B63. Every category makes its own boards, and the pager steps below the cards (supersedes B44's merged strip and its three-per-page clause; supersedes B24's and B44's create-to-Unsorted flows; supersedes §14's "single primary control" claim; renames Unsorted's label only)

Issue #88 names the tax: the app sorts boards into categories, yet the one
control that makes a board stood outside them all — a global `New board` on
the list header and another on the rail — so every created board landed in
Unsorted and its categorization became a second, separate act. Capture
precedes structure, but creation *is* capture here, and the category the
user is looking at when they reach for the control is structure they have
already asserted. Making them re-state it with a drag is cognitive tax.

**Each section carries its own control, and it writes what it sits in.**
`makeCatSection` emits a fourth child — a `.primary-btn.cat-add` between
the head and the cards, on both surfaces, no `isDesktop` branch — and its
`newBoardIn(cat)` writes `category` explicitly (`'unsorted'` included,
`dropBoardCard`'s precedent; `catOf` stays a read-site default and no
record migrates) plus `catStamp`, so the new card lands first exactly as a
drop does. The board **opens at once** — `swapBoard` on desktop, the B9
page-turn on mobile — because a control that made something you then had
to go find would tax the very moment it exists to serve. The tap runs
through `delayAction` (B18: acknowledged, not idle), and the globals are
**removed, not duplicated**: `#new-board` and `#pane-new` are gone, and
§14's "the app's single primary control" claim goes with them — the
primary species survives, one per section, its construction unchanged.

**The section restacks as one grid on both surfaces.** Head row — label
left, control right, one box height — then cards, then the pager on its
own row **below the cards, centred**. The issue's word ("centered") wins
over the mockups' right-leaning pager: the mockups relocate the control
and grow the header, which is what they were drawn for; the text states
the pager's position outright. The header takes one new display step to
hold the row — **24px**, recorded in `UIUX §13.1` — keeping B44's
uppercase and letter-spacing; the control's own label steps to 14px so
the longest name still fits whole at B32's 384px floor. **The rail
measures out of the step:** at 24px `TO-DO BOARDS` sets 215px, and the
rail's 276px cannot hold that beside any legible control — so the rail's
header takes the scale's existing top step, 18px, rather than crowding
the category name off its own row (the refusal B44 already made when
four pager squares crowded `Unsorted Boards` off its strip). One new
step on the scale, not two: the rail adds none. Rows are 48px on mobile
(the control at §6's 44px floor) and 32px on desktop, where the
control's label steps down to 13px so a 300px rail holds both boxes.

**The capacity consequence is owned here.** Two 44px-floor furniture rows
where B44's merged strip spent one leave a 384×846 phone **two cards per
page**, not B44's three — that clause is superseded, deliberately: the
rows bought a create control per category and a header that reads at
arm's length, and overflow was already paged, so the third card costs a
page-turn, not a scroll. Desktop stays at three — retiring `#pane-new`
pays for its taller head row. `test/mobile.js` [19]'s no-overflow /
no-scroll pair still binds.

**The control's name is generic on purpose.** Three buttons all read
`New board`; each is a grid *sibling* of the aria-hidden `.cat-head`
(a button inside it would be unreachable to AT), so the enclosing group's
`aria-label` — the category, with its page state — disambiguates them,
exactly as it already disambiguates the pager's twelve arrows. **The
rename is the label alone:** `COPY.catUnsorted` becomes `Note Boards`;
the storage key `'unsorted'`, `BOARD_CATS`, `catOf`, `data-cat` and the
buckets are untouched (B21/B42/B44's read-site idiom — no migration).

## S. The similarity transform (issues #65, #75)

### B64. One ratio maps x, y and size: the arrangement travels as a figure (supersedes B40's mapping clause and B21's width-only multiplier; B32's legacy rescue, B39, and B40's widened gesture clamps stand)

The bug, twice reported: fold or unfold a Z Fold, or rotate any phone, and the
board comes back with its arrangement mangled. The cause was in the record all
along — B21 maps `x` by `LOGICAL_W/rw`, B32 maps `y` by `LOGICAL_H/rh`, and B40
sizes on the width ratio alone, naming the consequence and accepting it: "when
the two ratios diverge, vertical clearances can still shift." An aspect change
is precisely the two ratios diverging, so every fold sheared the one thing PRD
§2.4 says must survive — "opening a board weeks later still shows the same
arrangement they left." Positions permanent means the *arrangement*, not three
coordinates that happen to agree only on the device that wrote them.

**Ruling.** One uniform ratio per note,

```
k = min(LOGICAL_W / (rw ‖ 900), LOGICAL_H / rh)
```

maps `x`, `y` **and** size (`renderX = x·k`, `renderY = y·k`, `effScale =
scale·k`). A single ratio on both axes and the size is a similarity transform:
pairwise angles and distance ratios are preserved, so the figure the author
left is the figure every device shows — smaller or larger, never sheared.
`min` gives containment **by construction**: `x ≤ rw ⇒ x·k ≤ LOGICAL_W`, and
the same for `y` against `rh` — which dissolves B40's stated objection to
mapping `y` by the x-ratio ("would push notes off the bottom of a shorter
sheet and demand exactly the re-clamps B17/B21 forbid") with zero re-clamps.
Stored geometry is still never touched by a viewport change; the entire law is
render-time, and the export applies it against its own sheet (`exportK`, the
same `min` over `EXPORT_W`/`EXPORT_H`) because the export mirrors the render
law mandatorily (B34, B39).

**Anchored top-left, and deliberately not centred — a ruled-out approach,
recorded.** With the height ratio binding, the figure occupies the sheet's
upper-left and the slack falls to the right/bottom as open canvas. Centring
the slack looks kinder and is impossible in principle: a centring offset is a
function of `rw`/`rh`, which each note carries *per authoring cohort* — notes
written on different frames would take different offsets, and a grabbed note
rebases to the live frame (offset 0) while its ungrabbed neighbours kept
theirs. Both re-shear exactly the arrangements this ruling exists to preserve.
The anchor is part of the law, not a default.

**The grab stays silent in position and size; the wrap cap rebinds, owned.**
`rebaseNote` folds `k` where it folded B40's width multiplier: `x = renderX;
y = renderY; scale·= k; rw = LOGICAL_W; rh = LOGICAL_H`. Silence is the same
proof as B40's: `effScale` before equals `scale` after, and once `rw`/`rh`
equal the live frame, `k ≡ 1`, so all gesture math runs in current-frame
units unmodified. B40's widened gesture clamps need no change and are kept —
a folded scale may still leave [MIN_SCALE, MAX_SCALE], merely by a smaller
factor than before. One thing the old rebase preserved, this one does not,
and it is chosen rather than suffered: with `rw·mult ≡ LOGICAL_W` the cap
`(rw − x)/scale` survived B40's rebase exactly, but under min-k
`rw = LOGICAL_W ≥ rw·k`, so a height-bound cross-frame grab can *widen* the
cap (never narrow it). That is B39's own live law — the cap is the distance
to the sheet the gesture is running on, and "a note simply rewraps wider and
flatter where it stands — intended, shipped" — surfacing at the pickup.
Keeping the authored cap instead (`rw = rw·k`) was considered and ruled out:
the drag would then wrap against a phantom edge at `rw·k`, short of the
sheet's true right edge, violating B39's headline. `rebaseNote` re-asserts
the width var on the element at the fold, so the DOM, the drag guard's
caches, and the record agree from the gesture's first frame — a stale cap
would otherwise hold the old wrap through the drag and snap it at the drop.

**`noteMaxW` is restated, not changed.** B39's law is `(rw − x)/scale` in
authored units; the shipped form `(LOGICAL_W − renderX)/effScale` was that
identity only while position and size shared the width ratio. Under min-k it
silently widens the cap whenever the height ratio binds — a cap-wide note
re-wraps across a fold, and the screen≡PDF wrap parity ([D17], mobile [18])
breaks. The cap now states the identity directly: `max(NOTE_MIN_W,
(rw ‖ 900 − x)/(scale ‖ 1))`, value-identical under the old law — and with
no frame constant left in it, `exportNoteBox` calls the screen's function
itself rather than restating it. Containment survives the restatement:
`renderX + cap·effScale = (x + (rw − x))·k = rw·k ≤ LOGICAL_W`.

**Legacy notes are untouched.** A pre-B32 note has no `rh`, its authoring
height is device-dependent and unrecoverable, and there is no second ratio to
take a `min` against. The entire legacy branch — width-ratio `x` and size,
`y` through `LEGACY_H`, the clamp at render time only — is B32's exact ruling
and stands verbatim.

**B28/B32's keyboard-resize deferral is now triply load-bearing.** It already
prevented the soft keyboard from moving every note (`y` is frame-relative) and
from baking a shrunken `rh` into storage at a mid-edit grab; under one shared
`k` an unguarded keyboard resize would now shrink `x` and *size* too — the
whole board would flinch at every keyboard. Do not weaken it.

**Costs, owned as B40 owned its own.** This deliberately changes how
cross-frame boards *look*, in both directions. A phone-authored board on a
1440×900 desktop rendered at B40's ~3.3× wide — and sheared; it now renders at
`min(lw/384, 1000/846) ≈ 1.18×` — compact, faithful, with the right and
bottom left as open canvas. A desktop-authored board on a phone renders small
(k ≈ 0.30 where B40 gave `y` 0.85), the arrangement gathered toward the
top-left; B7's decoupled 44 px hit collar is what keeps a shrunken note
tappable, exactly the job B40 assigned it. And where B40's width-only
multiplier related any two notes identically on every frame (`LOGICAL_W`
cancels in the ratio), min-k does not: a board whose notes carry *different*
authoring frames can relate its cohorts differently on different sheets —
including the PDF's — because each cohort's `min` may bind on a different
axis. Within one cohort, which is what an arrangement is, the figure is
exact; and any grab rebases toward one cohort. Faithful-but-small over
large-but-lying: the board is a *spatial* record, and a shear is a lie about
space. Pinned by `test/mobile.js` [12c] (shape held, size uniform, storage
untouched, round trip exact) and `test/desktop.js` [D13] (the silent grab
folds k); `UIUX §11` now states the law and `PRD §2.5`'s deferral row closes.

---

## V. New background colours for the Idea and Note boards (issue #96)

### B67. A board type is a whole scene, not a rung: the ladder rotates with it (scopes UIUX §2.2.1 rule 1 to within a scene; extends UIUX §2.2 with §2.2.2; leaves B55's one platform edge and B58's scene untouched)

Rob: *"New background colors for just the idea boards and the note
boards. To do boards retain their ink well blue background. Idea boards
update to a deep hunter green with same stylization and graphic effects.
Note boards background color updates to a deep, light violet."*

Two screenshots came with the issue and could not be read from the
build environment, so the values were **derived rather than sampled** —
Rob's own call: rotate the shipped ladder in hue at matched lightness
and chroma. The hexes are in `UIUX §2.2.2`; this entry is why.

**What "matched" turned out to mean, precisely.** OKLCH lightness and
chroma and WCAG relative luminance cannot all be held across a hue
rotation — OKLab lightness and WCAG luminance are different functions of
the same colour. Only one can be pinned, and it has to be **luminance**,
because luminance is what every ratio in `UIUX §2` is computed from and
what `§2.2.1` rule 1 means by "one axis". So L and C became the aiming
coordinates, held as closely as 8-bit sRGB allows (L within 0.010, C
within 0.007), and luminance is exact to the 4dp the record prints.
`UIUX §2.2.2` prints the residuals rather than claiming they are zero.

**The rule this bends, said out loud.** `UIUX §2.2.1` rule 1 is "one
axis: luminance — nothing is distinguished from another surface by hue
alone." Taken flat, three coloured boards violate it. Taken as written,
it does not: the rule exists so that *reading the page* — card from
deep, water from canvas, note from ground — never depends on a channel
a person's eyes may not deliver. It governs **rungs within a scene**.
Board type is not a rung; it is the whole scene, every rung moving
together. So rule 1 gains the qualifier "within one scene," and the
distinction is made honest by construction rather than by exemption:
**every rung holds its To-Do luminance to the 4dp the record prints.**
The three ladders are the same ladder. Turn the hue off and they are
indistinguishable — which is exactly the property rule 1 protects.

**Where the gamut binds, recorded so it is not re-derived.** The Idea
card sits at `C = 0.043` against the blue's `0.050`, and the Idea deep at
`0.025` against `0.027`. Both are the **sRGB maximum** at that luminance
in that hue arc — checked by scanning every 8-bit triple, not estimated.
sRGB's blue primary is very dark, so a dark blue buys chroma almost free
by pushing `B`; green's primary carries 0.7152 of the luminance, so a
dark green must keep `G` small and its chroma is capped. A more
chromatic dark green card at that luminance **does not exist**.

**Rule 4 is satisfied, with the numbers.** Fourteen new values, each
one put through `§2.3.1`'s crossover and `§2.3.2`'s forbidden band
before it existed: all fourteen sit outside 0.163–0.196, every ground
below 0.1788 still takes `--ink-light`, every note above it still takes
`--ink-dark`. Necessarily so, since each sits at its To-Do rung's
luminance — which is the point of deriving them that way rather than
picking them.

**B52's precedent, met.** B52 rejected a hex that had not earned a job.
These have one, and it is a job no existing value could do: the app has
had three board categories since B42, and until now type drove **zero**
rendering — the category was a fact about the list, invisible the moment
you opened the board. A person with a to-do board and an idea board open
across two sessions had nothing on the page telling them which they were
in. The hue is the first thing the board itself says about what kind of
board it is, and it says it without a label, a badge or a legend —
`PRD §1.2`'s zero cognitive tax, and every pixel earning its place.

**Bound by rebinding, not by overriding — and that is the whole of
"same stylization and graphic effects."** The board is four layers: the
flat `var(--deep)` fill, the SVG turbulence dither, the band's radial
vignette over its three-stop fall, and the Parking Lot mirroring it.
All four read tokens through `var()`. Rebinding the token *names* under
`#board[data-cat=…]` carries the hue into all four at once. The
alternative considered and rejected — a new `--board-bg` token with
`#board`'s background pointed at it — would have recoloured the fill and
left blue furniture standing on a green ground, and it would also have
broken `test/tokens.js`'s assertion that the canvas is literally
`var(--deep)`.

**The list and rail cards rotate with their section.** `UIUX §10` calls
a card "a small rendering of what it names," and a card is drawn in the
water's upper fall — so once the water is per type, a blue card opening
a green board is the card lying about its board. The section *ground*
stays `--chrome`. The **drag ghost** is the one card that leaves its
section: it is fixed to the viewport off `document.body`, outside the
scope, so it carries the attribute itself and keeps its hue in the air.
A card that changed colour the moment you picked it up would be the same
lie, told during the one gesture that is *about* its category.

**A record with no category renders violet, and that is the coherent
answer.** `catOf()` is a read-site default and a record without a
category IS the third bucket (B21's idiom) — the list already files it
under Note Boards. Forking the default so the board rendered blue while
its card sat in the violet section would have reintroduced exactly the
lie the card preview removes. The consequence, owned: every pre-#58
legacy record opens violet, since it writes no category — and that is
correct, because the list has always filed it under Note Boards.

**The first-run board is the one exception, and it is seeded, not
defaulted.** `newBoardRecord()` wrote no category either, so a fresh
install of an app named for its To-Do boards opened violet — a default
that was invisible until this entry made the type render. It now writes
`category: 'todo'`. This extends B63's "every new board writes its
category at creation" to the one creation path that predates it: the
empty-database boot. `newBoardIn` overwrites the seed with the section
the board is made in, so the three callers stay coherent. Legacy records
are deliberately untouched — reclassifying them would mean a migration
and a DB version bump, and B21's read-site idiom exists to avoid exactly
that.

**Three things deliberately do not rotate.** `--chrome`, because there
is one room and it sits behind all three boards at once (B55's one
platform edge stands: `index.html`'s `theme-color` and the manifest's
two colours all still wear `#020812`, so **a green board's OS chrome is
the blue** — owned, not overlooked). The two **ink poles**, because ink
is per surface, not per app (`UIUX §2.3`) — and because rotating them
would move `§2.3.1`'s crossover and break `§2.7`'s ring, whose whole
claim is that the poles are complementary on every ground. The three
**accents**, because they live on chrome (`UIUX §2.6`).

**What actually moved, and what did not.** `§2.3`'s five ink pairings,
`§2.5`'s seven adjacencies, `§2.7`'s six ring rows and `§2.3.1`'s
crossover are functions of luminance alone, and no luminance moved:
every one of them reproduces on all three ladders, and `test/tokens.js`
now asserts each against all three with a single expected number. (The
sections' radial falloff is a second alpha composite whose luminance also
moves; no published ratio is computed from the vignetted ground, because
`§2.8` asserts every adjacency against the fall's declared stops. Said
out loud in `§4.3` so the next value derived from the band's real ground
is derived per ladder.) The
only **published** table that moves is `§4.3`'s scratch pair, because a
strike is an *alpha composite* — a function of the ground's three
channels, not of its luminance — so rotating the hue re-quantises the mix
at 8 bits. The six marks shift by at most 0.04, stated per ladder in
`§4.3` rather than averaged, and the law they serve is asserted separately so it cannot be
satisfied by editing a constant: every mark clears 3:1 on every stop of
every ladder, every burial stays a smudge. Reproducing all twenty-four
published numbers exactly was attempted first and is **not achievable at
8 bits** — the search is over-constrained — which is itself worth
recording, so the next agent does not spend the afternoon on it.

**Pinned.** `test/tokens.js` now parses the palette **per scope** rather
than flat, because a last-wins scan would read whichever ladder came
last in the file as if it were `:root`'s — and it asserts the rung
values, the shared luminances, that the two spellings of the darkest
stop agree (`--water-bot` / `--water-bot-a`), that `--chrome`, the poles
and the accents are *not* rebound, and that `app.js` sets the scope from
the record while carrying no hex of its own. `test/desktop.js` [D16]
adds the **rendered** pin, which is the one that matters: tokens.js
reads stylesheet text, and only a real browser can say the cascade
reaches the page — it asserts the computed fill, rule, card, band and
lot of an open Note board, its rail card's preview, the drag ghost
mid-flight, and that a swap to a To-Do board repaints the page blue and
the return swap repaints it violet. `docs/proofs/proof-10-the-second-swap.html`
renders all three scenes side by side; nothing tests that file, so it
was updated in the same commit.
