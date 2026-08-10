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
