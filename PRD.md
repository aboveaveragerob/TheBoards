# PRD.md — To-Do Boards

**Status:** v1 of the specification, written after the MVP. The app was built
first; this document reconstructs its product rules from the working code and
`DECISIONS.md`, and adds §9, the design system, which is new.

**How to read this with the other records.** `DECISIONS.md` is the binding,
cumulative record of every UI/interaction ruling (A1, B1–B43+), each resolved
against the principles in §1 below. Where this document and `DECISIONS.md`
disagree, **`DECISIONS.md` wins** — it is the later, issue-tied ruling, and
several of its entries deliberately supersede earlier positions stated here.
This document exists to say what the app *is* and what it is *for*, so that a
new ruling has something to resolve against.

Sections are numbered to match the citations already in `app.js`, `styles.css`,
`sw.js` and `DECISIONS.md`. §10 maps the `UIUX §x` citations onto §9.

---

## §1 Principles

Five product principles. Every ruling in `DECISIONS.md` resolves against these.

1. **Capture precedes structure.** A thought must reach the page in the time it
   takes to type it. Nothing — no mode, no dialog, no picker, no animation, no
   400ms window — may stand between the intent to write and the caret.
2. **Relationships are asserted, not inferred.** The app never groups, tags,
   links, sorts or suggests. Meaning is expressed by where a thing sits and how
   big it is, and only the person putting it there decides that.
3. **Positions are permanent.** A committed position is data. Layout changes —
   rotation, resize, a different device, a new build — render stored coordinates
   differently; they never rewrite them.
4. **Zero cognitive tax.** The interface asks nothing. No settings, no accounts,
   no sync state, no onboarding, no empty states to interpret.
5. **Work performed stays visible.** Completing something does not remove it.
   The scratch-out is the record that the work happened.

And the governing design law, which §9 implements:

> **If you have to think about the interface, it failed. Every pixel earns its
> place.**

### §1.1 Emotional identity

The five principles say what the app *does*. This says what it should *feel*
like, and it is equally binding on §9.

**Peaceful Fondness.** The board should feel like a place you are glad to
return to. Not productive-anxious, not gamified, not neutral-corporate.

The mental imagery is **calm water** — beaches, rivers, brooks. Note the
register carefully: this is water at depth and at dusk, not noon glare. The
palette in §9.2 is dark, and that is deliberate. Deep water is peaceful; a
bright white productivity surface is not. The one lit thing in the room is the
note you just wrote.

This identity does **not** license decoration. §1's law still holds: every pixel
earns its place. Peace is produced by restraint, depth and consistency, not by
ornament. Where §9 adds something, it is because that thing does a job.

---

## §2 Users and scope

### §2.1 Who it is for

One person, on their own device, capturing their own thinking. There is no
second user, no team, no sharing model, and no plan to add one.

The app deliberately does not decide what kind of tool it is. Task tracking,
creative ideation, note-taking, problem-solving — one surface, no modes. A board
is whatever the person puts on it.

### §2.2 In scope

A fixed, bounded page where any thought becomes a framed, movable, scalable note
the instant it is typed; structure asserted after capture by position and size;
permanent named regions for a title, components, requirements and a parking lot;
completion as a visible scratch-out; multiple boards; and a PDF export.

### §2.3 Out of scope, and why

| Not built | Reason |
|---|---|
| Accounts, sync, sharing, collaboration | §1.4. There is no backend (§3.2) and adding one changes what the product is. |
| Tags, folders, search, filters, auto-grouping | §1.2. Every one of these infers a relationship the person did not assert. |
| Rich text, images, attachments, drawing | The data model is plain strings (§4.1). B3 enforces this at the paste boundary. |
| Snapping, alignment guides, auto-layout | §1.3 and §1.2. Notes overlap freely; the person places them. |
| Reminders, due dates, notifications, streaks | §1.4. The board makes no demands. |
| Infinite canvas, pan, zoom | §5.1. Boundedness is the feature — a page you can see all of. |
| A framework, bundler, package manager, dependency | §3.3. |
| Settings, preferences, a theme switch | §1.4. §9 is one identity, not a choice to make. |

### §2.4 Success

The app succeeds if a thought reaches the page faster than the person can
second-guess it, and if opening a board weeks later still shows the same
arrangement they left. Everything else is secondary.

---

## §3 Platform

### §3.1 Devices

A PWA, installable to the home screen, running standalone and fully offline.

Mobile-first, and mobile is the primary path — the geometry (§5.2), the touch
floor (§5.3) and the capture path (§6.2) are all specified for touch first, with
desktop as an explicit second grammar (§5.4). Foldables are first-class: both the
inner and cover displays of a Z Fold are supported, which is why the manifest
declares `orientation: "any"` (B11) and why the sheet is viewport-derived (B32).

### §3.2 Offline and storage

There is no backend, no network call, and no server round-trip anywhere in the
app. All data is client-side in IndexedDB (§4). The service worker precaches the
whole shell, so a cold launch in airplane mode is indistinguishable from an
online one.

The consequence must be stated plainly: **the device is the only copy.** The PDF
export (§7) is the only way data leaves the app.

### §3.3 Build constraints

Vanilla HTML/CSS/JS. No frameworks, no build step, no package manager, no
dependencies, no backend. Five files are the entire app: `index.html`,
`styles.css`, `app.js`, `manifest.json`, `sw.js`, plus `icons/` and (per §9.3)
`fonts/`.

This is a hard constraint, not a preference. It is why the PDF exporter is
hand-rolled (§7), why the icons come from a dependency-free PNG writer (B1), why
fonts are self-hosted rather than pulled from a CDN (§9.3), and why anything
requiring a compile step must instead be computed once and committed as a
literal.

---

## §4 Data model and writes

### §4.1 Records

A board:

```
{ id, createdAt, updatedAt, title, components, requirements,
  notes[], parkingLot[], category, catStamp }
```

A note: `{ id, text, x, y, rw, rh, scale, state }`
A parking-lot item: `{ id, text, state }`

`state` is `active` or `complete`. `text` is a plain string in every case.

Two structural facts carry product meaning:

- **A lot item has no `x`/`y`.** It is an ordered line, not a spatial object.
  This is why lot items live in block flow rather than on the absolute canvas
  (B6), why they are never framed (§6.5), and why they are not multi-selectable
  on desktop (B41) — herding is a spatial operation.
- **`rw`/`rh` are the reference frame a note was authored against**, not a
  position. They exist so §1.3 can be honoured across devices: stored `x`/`y`
  are never mutated, and rendering scales them from the authoring frame to the
  current one (B21, B32, B40).

New fields are **defaulted at the read site, never migrated** (B21's idiom,
reused by B42 for `category`/`catStamp`). A board written by an older build
opens correctly without being rewritten — which is §1.3 applied to the schema.

### §4.2 Writes

IndexedDB `boards-db` / store `boards` is the only persistence.

Keystrokes debounce at `SAVE_DEBOUNCE = 300ms`. Blur, drag-end, pinch-end,
complete, delete and z-order changes commit immediately. Writes go through a
single-flight queue with exponential backoff; a failure raises a polite
`role="status"` toast ("Couldn't save — retrying.") which never clobbers a
pending Undo (B13).

**A write may never block capture.** The save queue is behind the caret, always.

### §4.3 What earns persistence

A note or lot line earns persistence with its first real character. A frame
committed with only whitespace is discarded — `trim()`, not zero-length (B8) —
and this is enforced not only at blur but on **every render**, which sweeps
whitespace-only records (B31). The rule exists because failed taps were leaving
landmines that compounded into flakiness.

---

## §5 Layout, scale and touch

### §5.1 One logical page, one render scale

The board is a fixed, bounded logical coordinate space (`LOGICAL_W` ×
`LOGICAL_H`) rendered through a single `transform: scale()` (`renderScale`,
`offX`, `offY`). Note positions and sizes are stored in that logical space and
converted with `toLogical` / `renderX` / `renderY`.

The board never pans and never zooms. Browser pinch-zoom is disabled at the
platform level (`touch-action: none`, `user-scalable=no`) because the two-finger
pinch is reserved for scaling a note (B12).

Because the scale is *uniform*, a note's frame stays square and the hit-area
maths in §5.3 stays exact.

### §5.2 The sheet's dimensions

**Mobile (B32):** `LOGICAL_W = vw`, `LOGICAL_H = vh`, `renderScale = 1`. The
sheet *is* the viewport. This overrides the earlier fixed-900 model (B17)
because at `renderScale ≈ 0.45` a 24px title reached the screen as 10px —
legibility beat abstraction.

**Desktop (B20):** `renderScale = min(vh/1000, (vw − 300)/900)`,
`LOGICAL_H = vh/renderScale`, `LOGICAL_W = (vw − 300)/renderScale`, `offX = 300`
for the rail. Neither logical dimension ever drops below 900×1000.

**The reference sheet is 900×1000.** It is what the band and lot proportions are
derived against and what the export draws (§7) — distinct from the live
viewport-derived dimensions.

**Committed notes are never re-clamped on resize** (B17, and §1.3). A rotation
or a window drag changes how a position renders, never what it is.

Cross-device rendering is **homothetic**: position's law applied to size.
`noteMult = LOGICAL_W / (rw ‖ 900)`, and a note's effective scale is
`scale × noteMult` (B21, B40). Resizing a window slides notes proportionally
rather than letting fixed-size notes collide.

### §5.3 The touch floor

44 CSS px physical on mobile — the fingertip floor (WCAG 2.5.5 AAA).

Because notes scale, this cannot be a fixed padding. Each note carries a
computed `--hit` inset on a transparent `::before`, sized so that
`inset × scale × renderScale ≥ 44px` physical (B7). The hit area expands; the
visual frame does not.

On desktop the floor drops to 24px (`HIT_FLOOR_DESKTOP`), which is WCAG 2.5.8
AA and pointer-appropriate (B23). The 44px floor stands on touch.

### §5.4 Two grammars, one recognizer

`isDesktop` is a live `matchMedia` switch:
`(min-width: 1024px) and (hover: hover) and (pointer: fine)` (B19). It is a
**capability** test, not a width or UA test — which correctly keeps tablets in
touch mode, since desktop's hover grammar would strictly reduce a touch-only
device. There is no persistence and no manual override; a mode flip tears down
live state.

A single custom gesture recognizer (`onPointerDown`/`Move`/`Up`) drives both
grammars, branching on `isDesktop` inline. There is no separate desktop code
path.

| | Mobile | Desktop |
|---|---|---|
| Create | tap empty canvas | click empty canvas (nothing selected) |
| Select | — | click |
| Move | drag | drag |
| Scale | two-finger pinch | drag the selection frame |
| Edit | tap | double-click, or Enter |
| Menu | long-press (500ms) | right-click |
| Caret on edit | at the touch point (B14) | at the end (B26) |
| Boards | full-screen list (§6.7) | always-visible rail (§6.7) |

`MOVE_THRESHOLD = 16px` of slop before a drag begins or a long-press cancels
(B29 — 10px was cancelling ordinary taps on a 7.6" foldable). `LONGPRESS_MS =
500`; any release before that with movement under threshold commits as a tap
(B5).

### §5.5 The soft keyboard

`interactive-widget=resizes-visual` plus a JS guard that skips mobile re-layout
while a `contenteditable` inside `#board` holds focus, re-applied on `focusout`
(B28). Without this the keyboard changed `vh`, collapsing the sheet mid-sentence
and clipping the note being written.

### §5.6 Actions are acknowledged, not idle

Every committing action — delete, complete, board create/swap/delete, note
creation on desktop — passes through `delayAction()`, a 400ms window measured
from release (B18). Within it:

- the window is **filled**, never blank: content thickens, controls fill, and an
  empty-canvas tap raises a `.tap-ghost`;
- a note is never *filled* as acknowledgment, because a filled note is the
  completion scratch-out;
- a second tap inside an open window is **dropped, not queued**.

400ms of nothing is indistinguishable from a dropped tap. This is the shared
primitive: any new interactive action goes through it rather than a bespoke
timeout.

Three things are deliberately outside it. **Mobile capture** runs synchronously
in `pointerup` (B27) — a browser raises the soft keyboard only inside user
activation, and a 400ms timeout is outside it, so §1.1 wins. **Desktop
selection** opens no window (B22): it commits nothing, and a delayed selection
would swallow every double-click. **Rail page turns** likewise commit nothing
(B42).

> B18's 400ms is explicitly marked *impermanent* — it is a felt value, and
> re-interrogating it is invited.

---

## §6 Surfaces

### §6.1 The anchors — permanent furniture

Four permanent regions exist on every board: **Title**, **Components**,
**Requirements** and the **Parking Lot**. They are always present, always in the
same place, and cannot be created, moved, resized or deleted.

They are furniture, not content. `contenteditable` is toggled on only while
editing (B2) so the gesture recognizer owns tap/drag/long-press without fighting
native focus, and it is `plaintext-only` where supported, falling back to `true`
(B3), because the data model is plain strings.

### §6.1.1 The top band

The band is **drawn furniture, independent of content** (B33). It reads
**rule → header → content** — the same three-part split the Parking Lot has used
since day one, which is the point: one section grammar on the board (B38).

It comprises one `#band-rule` across the sheet; a permanent `.band-label` per
side zone naming what that zone is; and the **title compartment**, which
occludes the rule.

The title is a *compartment*, not a card: the sheet's own top edge is its fourth
side, so only three sides are drawn (B38). It is the **one deliberate exception**
to "no empty frames" (§6.2) — that rule protects the free canvas; the compartment
is permanent furniture and is always drawn.

Band geometry is sized **by the type it holds, not by the sheet** (B37): across
is a fraction of the sheet, because it holds the sheet's own divisions; down is
set by the type. The rule crosses the compartment at its midpoint.

> The band has been ruled on five times: B33 → B35 → B36 → B37 → B38. B38 is
> current. Read that chain before changing band geometry — each ruling corrected
> a regression the previous one caused.

### §6.2 Notes — the atom

**A tap on empty canvas creates a note at the tapped point, in edit mode, with
the caret placed.** Instantly on mobile (§5.6, B27). This is §1.1 in one
sentence, and it is the single most important behaviour in the app.

**No empty frame ever exists.** The frame draws itself on the first character
and is transparent before it (§6.2's rule; enforced by B8 and B31). A note earns
its frame the way it earns persistence (§4.3).

A note wraps at **the sheet's right edge**, not at a predetermined width:
`noteMaxW = max(NOTE_MIN_W, (LOGICAL_W − renderX) / effScale)`, which reduces to
`(rw − x)/scale` in authored units and is therefore frame-invariant. The cap is
live during a drag, and the export mirrors the same law so a cap-hitting note
cannot disagree between screen and PDF (B39, superseding an earlier 45% cap).

`NOTE_MIN_W = 60` — roughly three characters at 17px plus box chrome. *Marked
impermanent in B39.*

### §6.3 Move, scale, stack

**Drag to move.** Free overlap, no snapping, no alignment guides (§1.2). The
only clamp is to the page bounds.

**Pinch to scale** on mobile, **drag the selection frame** on desktop — both
share the same maths. `MIN_SCALE = 0.5`, `MAX_SCALE = 2.0`, clamps widened to
admit an out-of-range starting scale (B40). `transform-origin` is top-left
throughout, so stored `x`/`y` stay truthful and there is no drift to compensate
(B4).

**Z-order is DOM order.** Touching or grabbing a note surfaces it. There is no
layer panel and no send-to-back.

On desktop, shift-click multi-selects notes; a group drag moves every member by
one delta; resize is single-selection only. Lot rows stay single-select — a lot
line is a list entry, not a spatial object worth herding (B41).

### §6.4 Complete — work performed stays visible

Completing does not delete and does not hide. It draws a **scratch-out** over
the item: three families of ruled strokes at ≥90% coverage, texture rather than
colour, plus the underlying text destroyed to 40% ink so no screenshot or zoom
recovers it.

This is §1.5. The item stays in place, at its size, in its arrangement — the
board still shows that the work was done and where it sat.

Completion is reversible (Restore). In the PDF export, a completed item is drawn
scratched out and **emits no text object at all** (§7) — the on-screen promise
becomes a testable property of the file.

### §6.5 The Parking Lot

A permanent region at the foot of the sheet for things that are not yet placed —
thoughts with no position.

Its items are **unframed stacked text lines**: the one place in the app where
text is never framed. That is the visual expression of §4.1's structural fact
that a lot item has no coordinates. They are ordered lines, so they live in
block flow, not the absolute canvas (B6).

Tapping the lot background creates a line. Height is a whole-row budget,
`34 + n × 44` — three rows on a tall sheet, two on a phone (B37). Rows past the
budget are clipped from view but **still exist, still save and still export**.

Desktop selection frames the selected row with an `outline` — an explicit,
narrow override of "lot lines are never framed," scoped to desktop and selected,
with action buttons inline at the row's right edge (B25).

### §6.6 The menu

Long-press (mobile) or right-click (desktop) on a note, lot line or anchor.

**Item menu:** All boards · Complete/Restore · Copy · Delete.
**Anchor menu:** Export · All boards.
**Board row / rail card menu:** Export · Delete.
**Desktop selection buttons:** Complete · Copy · Delete.

Ordering is navigation first, then the item's own actions in rising severity
(B43). The destructive action is **always last, in `--danger`, behind a
hairline** — and, per §9.6, never distinguished by colour alone.

Every menu says "All boards" (the list view's own heading stays "Boards").

No long-press timer is armed over bare canvas or lot background — the release
still captures — and the `pointerdown` that dismisses an open menu is inert and
creates nothing, because dismissal is a retraction, not a choice of what was
underneath (B30).

### §6.6.1 Undo

Delete is undoable for **5 seconds** via a toast that restores exact prior state,
including a note's original index in its collection. A batch delete is **one**
window, one save and one Undo. A new destructive action finalizes or cancels the
prior undo. A pending note or lot Undo is finalized on any board switch; a
board-delete Undo is cross-board-safe and survives (B26).

### §6.7 Boards

Multiple boards; the board is the unit. An empty database creates and opens one
blank board — **the list is never the landing view** (B10), because the desk
always shows a working page.

**Mobile:** a full-screen list, newest first. Routing uses the History API
(`pushState` / `popstate`) specifically so the OS back gesture returns you to the
board (B9). Back is never intercepted, shadowed or disabled.

**Desktop:** the list is replaced by an always-visible 300px **rail** (B24),
sunken rather than floating, sitting outside `#board` so the gesture recognizer
never sees its events. Cards are compact and ordered `createdAt` desc with an
`id` tiebreak — immutable, so a card's slot never moves (§1.3 applied to card
order).

The rail sorts into three sections — **To-Do / Idea / Unsorted** — and a
pointer-drag moves a card between them, with the target section framing itself.
Overflow **pages** rather than scrolling, and a single page hides its own pager:
no state, no statement (B42).

A rail board swap is a 150ms crossfade with **no history push** — B9 is bypassed,
not touched.

### §6.8 Offline

The service worker is cache-first with stale-while-revalidate. A warm hit is
returned without ever waiting on the network, so offline behaviour and
cold-start latency are unchanged, but the revalidation runs alongside the hit
and overwrites the entry — so the next launch is current.

`CACHE` is version-stamped and `install` only re-runs when `sw.js`'s own bytes
change. See §8.1: this makes the cache name the one string that says which build
is live.

---

## §7 Export

The only way data leaves the app.

**Hand-rolled, no library** (B34) — §3.3 forbids the dependency, and a
hand-rolled writer works offline by construction.

Export produces **two A4 portrait pages**:

1. **The reference sheet**, drawn as vectors at the fixed 900×1000 geometry —
   never the live viewport — centred with a 36pt margin. The export reuses the
   screen's own laws (`exportX`/`exportY`/`exportMult` mirror
   `renderX`/`renderY`/`noteMult`, and `exportNoteBox` mirrors `noteMaxW`) so the
   PDF is geometrically faithful to what is on screen (B39, B40).
2. **The board as prose** — title, date, Components, Requirements, notes, lot.

Rules:

- **A completed item emits no text object at all.** It is drawn scratched out on
  page 1 and its words are absent from the file. §6.4's promise becomes a
  property of the bytes.
- **The export is always paper-light**, whatever the app looks like. See §9.2.4.
- Output is **byte-identical for an unchanged board** — which is what makes it
  testable.
- Non-Latin characters outside the font's encoding export as `?` and raise a
  toast saying so, rather than failing silently.
- Export is reachable from the anchor menu, the board-row menu and the rail card
  menu — the board you are looking at, or any other, with no detour through the
  list.

> B34 marks the `EXPORT_GEO` duplication *impermanent*: the exporter restates
> `styles.css`'s geometry by hand, and splitting §10.5 into its own file is
> invited.

---

## §8 Release

### §8.1 Shipping discipline

`sw.js`'s `CACHE` constant (`todo-boards-v<N>`) is the one string that says which
build is live. **Bump it on every shipped change to `app.js`, `styles.css`, or
any precached asset.**

The worker re-installs only when its own bytes change. Stale-while-revalidate
(§6.8) means a missed bump costs one stale launch rather than every launch
after it — but it is a net, not a substitute (B36).

`.github/workflows/pages.yml` deploys the repo root as-is to GitHub Pages on push
to `main`, then curls the deployed `sw.js` and asserts it matches the commit. A
silent Pages failure is treated as a shipped bug, not a non-event — this
happened once, with two merges landing with no deploy at all.

> **Asserting the source is not asserting delivery.** (B36)

The fastest way to answer "did my change reach anyone":
`curl -s https://<pages-host>/sw.js | grep todo-boards-`

*Current state: `sw.js` reads `todo-boards-v8`, while B38 and `TOP-BAND-PLAN.md`
both record `v7` as the last documented bump. The v8 bump has no DECISIONS entry.*

### §8.2 Testing

Three standalone Node scripts driving real Chromium via Playwright; no test
runner, no framework, not shipped. `test/mobile.js`, `test/desktop.js`,
`test/sw-update.js`. Each is one linear scenario and is run whole.

Mobile taps are dispatched as **genuine touch events**, not synthesized clicks,
because a real bug lived specifically in the browser's touch-to-mouse
compatibility events (B27) — test taps stay that way.

`test/sw-update.js` exists because of B36: it asserts that a shipped change
actually reaches an installed PWA.

> *A suite which cannot fail is lying.*

---

## §9 Design system

New in this document. §1–§8 describe an app that already works; §9 gives it an
identity. It implements §1.1 under §1's law — every value here does a job.

### §9.1 Position

> **Identity comes from structure — frame, scratch-out, surface tone — never
> costume.**

This predates §9 and survives it. §9 changes what the surfaces *are*; it does
not add ornament on top of them. Where a §9 value is decorative rather than
structural, it is wrong.

Two consequences hold throughout:

- **Never colour alone.** Every state distinguished by colour is also
  distinguished by geometry, position or texture: completion is a texture, focus
  is a ring, destructive is last and behind a hairline, the toast's Undo is
  underlined, selection is an outline.
- **Elevation means "temporary, above the page."** Shadow is reserved for
  transient surfaces — menu, toast, drag ghost. **Notes carry no shadow.** A note
  is on the page, not floating over it.

### §9.2 Colour

#### §9.2.1 One theme

**The app is dark-only.** The previous light/dark pair driven by
`prefers-color-scheme` (B16) is retired.

This is not a default with an escape hatch — §1.4 forbids the setting. It is the
identity: deep water, one room, the note as the lit thing in it.

#### §9.2.2 The surface ladder

Six grounds, ordered by luminance. Depth reads as literal darkness.

| Token | Value | Role | Rel. luminance |
|---|---|---|---|
| `--letterbox` | `#000000` | the desk, outside the sheet | 0.0000 |
| `--chrome` | `#031019` | menus, toast, board list, rail — **and every border and frame line** | 0.0046 |
| `--furniture` | `#041F29` | title compartment, Components, Requirements | 0.0117 |
| `--board` | `#3A5958` | the sheet; also rail board cards | 0.0875 |
| `--shelf` | `#A6AAA9` | Parking Lot ground; `.primary-btn` ground | 0.3972 |
| `--note` | `#89c7c5` | the note — the brightest surface in the app | 0.5020 |

**`--letterbox` is true black.** On the mobile path the letterbox is
`renderScale = 1` and therefore absent, but on desktop and on any aspect
mismatch it is a large, permanent field. True black switches OLED pixels off:
the board floats in void, and the largest persistent area costs nothing to
display.

**The band recedes; the shelf and the notes are lit.** This inversion within one
sheet is deliberate. The band is an inset header — structure you read past. The
Parking Lot is a shelf — a surface things rest on. Notes are the brightest thing
on the board because they are the only thing the person made.

#### §9.2.3 Two ink poles

| Token | Value | Used on |
|---|---|---|
| `--ink-light` | `#f4f5f1` | `--letterbox`, `--chrome`, `--furniture`, `--board` |
| `--ink-dark` | `#031019` | `--shelf`, `--note` |

Verified contrast, every text-bearing pairing:

| Ground | `--ink-light` | `--ink-dark` | Used |
|---|---|---|---|
| `#000000` | **19.18:1** | 1.09:1 | light |
| `#031019` | **17.56:1** | 1.00:1 | light |
| `#041F29` | **15.55:1** | 1.13:1 | light |
| `#3A5958` | **6.97:1** | 2.52:1 | light |
| `#A6AAA9` | 2.14:1 | **8.19:1** | dark |
| `#89c7c5` | 1.74:1 | **10.11:1** | dark |

Every pairing in use clears WCAG AA (4.5:1) for normal text; four clear AAA.

`--line: #717575` is the mid grey: rules, hairlines, disabled states, the
tap-ghost. **It is never a fill and never a text ground** — at that luminance no
ink in the palette reaches AA on it (`--ink-light` 4.26:1, `--ink-dark` 4.12:1).
As a 1px line on furniture it is 3.65:1, which is what a rule needs.

#### §9.2.4 Accents

| Token | Value | Role | on `--board` | on `--chrome` |
|---|---|---|---|---|
| `--accent-restore` | `#B7E3E1` | Complete / Restore / Undo | 5.49:1 | 13.82:1 |
| `--danger` | `#E2A08C` | Delete | 3.51:1 | 8.83:1 |
| `--accent-page` | `#6E9C9A` | rail pager, drop target | 2.50:1 | 6.30:1 |

`--danger` is **the only warm hue in the application.** Everything else is cool
water; the one thing that destroys is the one thing that isn't. It need not
shout — position (last) and the hairline above it already carry the meaning
(§6.6, §9.1).

All accent fills take `--ink-dark`.

**The focus ring is two-tone**, and this is structural rather than stylistic:

```
outline: 2px solid #f4f5f1;
box-shadow: 0 0 0 4px #031019;
outline-offset: 2px;
```

No single colour works on all six grounds — `#f4f5f1` is 2.14:1 on the shelf and
`#031019` is 1.00:1 on chrome. They are exactly complementary, so the doubled
ring clears 3:1 everywhere by construction. This is B15's "robustness from
geometry, not hue" carried into the new palette.

#### §9.2.5 The ink border rule

> **Every filled control carries a 2px `--chrome` border.**

Accent fills are 1.08–1.69:1 against `--shelf`, and the lot-row action buttons
sit on exactly that ground. A `#031019` border is 8.19:1 there and legible
against all six surfaces, so one rule makes every control safe on every ground
without a per-context exception.

This is why `--chrome` is defined as *"menus … and every border and frame line"*:
one value is both the deepest surface and the line that separates things from
whatever they sit on.

### §9.3 Typography

**Montserrat Alternates**, self-hosted, **no CDN**.

A CDN font is a network dependency (§3.3) and an uncacheable hole in an
offline-first shell (§3.2). Fonts live in `fonts/`, are declared with
`@font-face`, are listed in `sw.js`'s `ASSETS`, and are subject to §8.1's bump.

**Screen: three weights** — 400, 600, 800 — as Latin-subset `woff2`, with
`font-display: swap` so capture is never blocked on a font load (§1.1).
Montserrat Alternates has no variable version, so each weight is a separate
file; three is the smallest set that covers body, the existing 600 emphasis, and
the button's heavy label.

The existing size scale is retained: 11 · 12 · 13 · 14 · 15 · 16 · 17 · 18px,
line-heights 1.3 / 1.4 / 1.45. The typeface's apparent x-height differs from
`system-ui`, so the 12px band labels and 11px pager must be re-verified against
B37/B38's type-fitted band geometry before shipping — the band is sized by the
type it holds, so changing the type changes the band.

**Glyphs.** `✓ ↺ ▦ ⇩ ⧉ 🗑 « ‹ › »`. These are typographic, not assets.
`🗑` is a known deviation: it is a colour emoji among monochrome geometric marks,
and `app.js` already reasons against exactly this when it chose `⇩` over `📄`. On
a near-black palette a colour emoji is a bright foreign object that also
overrides `--danger`. It should be replaced with a monochrome mark, and each
glyph verified to render from the self-hosted font rather than falling back to a
platform emoji font.

### §9.4 The note component

```css
.note-text {
  background: var(--note);          /* #89c7c5 */
  color: var(--ink-dark);           /* #031019 — 10.11:1 */
  border: 2px solid var(--chrome);
  border-radius: 3px;
  padding: 10px 12px;
  font-size: 17px; line-height: 1.4;
}
.note-text:empty { background: transparent; border-color: transparent; }
```

**The radius stays near-square.** Notes scale (0.5–2.0) and `NOTE_MIN_W = 60`,
so a large radius inside `transform: scale()` turns a minimum-width note into a
capsule. This is a geometric constraint, not a taste: 3px reads as *drawn*, not
as a UI card, at every size the note can be.

**The note carries no shadow** (§9.1).

The 2px frame is load-bearing beyond style. A note dragged over the Parking Lot
is only 1.23:1 against `--shelf` — but its frame is 8.19:1 there. Where colour
cannot separate the note from its ground, structure does. This is §9.1 earning
its keep rather than asserting itself.

Pressed and tapped states thicken the border to 3px with compensating padding,
so nothing reflows — one state, two moments (§5.6).

The scratch-out (§6.4) uses `--ink-dark` strokes on the note's own ground at
10.11:1, and its radius tracks the note's.

### §9.5 Controls

Four species. All share one tactile signature; each keeps its own fill.

**Primary** (`New board` — the app's single primary control):

```css
.primary-btn {
  background: var(--shelf);
  color: var(--ink-dark);           /* 8.19:1 */
  border: 2px solid var(--chrome);
  border-radius: 0.4em;
  box-shadow: 0.1em 0.1em var(--chrome);
  font-size: 16px; font-weight: 800;
  min-height: 44px; padding: 0 18px;
}
@media (hover: hover) {
  .primary-btn:hover  { transform: translate(-0.05em, -0.05em);
                        box-shadow: 0.15em 0.15em var(--chrome); }
}
.primary-btn:active   { transform: translate(0.05em, 0.05em);
                        box-shadow: 0.05em 0.05em var(--chrome); }
```

The offset shadow and press-translate are the **shared tactile signature**
across all four species — the thing that makes a control feel like a control.

Four corrections against the source reference, each with its reason:

| Source | Corrected | Why |
|---|---|---|
| `font-color: #f4f5f1` | `color: var(--ink-dark)` | `font-color` is not a CSS property. And `#f4f5f1` on the original `#717575` was 4.26:1 — below AA. |
| `font-size: 10px` | `16px` | Below the app's 13–16px control scale and unreadable against a 44px touch floor (§5.3). |
| `padding: 0.6em 1.3em` | `min-height: 44px; padding: 0 18px` | §5.3. Em-padding on a 16px label does not reach the floor. |
| bare `:hover` | `@media (hover: hover)` | Mobile is the primary path (§3.1); a bare hover sticks after a touch. |
| `box-shadow: 0.1em 0.1em` | `… var(--chrome)` | Unqualified, it inherits `currentColor`. |

**Selection buttons** (`.sel-btn` — Complete · Copy · Delete): accent fill or
`--chrome` for Copy, `--ink-dark` label, 2px `--chrome` border per §9.2.5, same
shadow geometry. Copy takes plain chrome because it changes nothing — accents
mark state changes.

**Pager** (`.pager-btn`): `--accent-page`, same construction, `opacity: 0.4` when
disabled.

**Menu rows and the toast's Undo** carry no fill: menu rows are bare on
`--chrome` and fill on tap; the toast's Undo is `--accent-restore` text
distinguished by **underline**, not colour (§9.1).

### §9.6 Elevation, motion, accessibility

**Elevation** applies to transient surfaces only: `#menu`, `#toast`,
`.pane-drag-ghost`. The desktop rail is the inverse — an *inset* shadow, because
it is embedded in the page, not floating over it.

**Motion is a closed, justified set.** Six transitions, and nothing else
animates:

| What | Property |
|---|---|
| `#menu` | opacity |
| `.note-scratch` / `.lot-scratch` | opacity |
| `#toast` | opacity + transform |
| `.leaving` (note, lot, row, card) | opacity |
| `html.desktop #board.swapping` | opacity |

§1.1 argues for a slower, water-like settle, and durations should lengthen
accordingly (roughly 120→200ms and 150→260ms) onto a long-decelerating curve.
The set itself does **not** grow — no new motion has earned its place, and note
capture in particular stays instant (§5.6, B27). The button press-translate also
stays instant: a control that lags feels broken, not calm.

**`prefers-reduced-motion: reduce` is a mandatory global kill-switch**, and the
board-swap crossfade is sequenced by timeout in JS specifically so it degrades to
an instant swap rather than breaking.

**Accessibility.** Every editable region carries `role="textbox"` /
`aria-multiline`. The toast is a polite `role="status"`. Focus is visible on
every interactive element via §9.2.4's ring, at `outline-offset: 2px` on
free-standing controls and `-2px` on inset rows. Truncation is always indicated.
The desktop rail is hidden from assistive technology off-desktop. Keyboard:
`Esc` deselects or commits an edit, `Delete` removes the selection, `Enter`
edits it.

### §9.7 Where the identity does not reach

**The PDF export stays paper-light.** Dark `--board` prints as a slab of
near-black and costs a cartridge to discover. The export is a reference sheet
for paper, and paper is the ground it is designed against — so §9.2's ladder
does not apply to it, by intent rather than omission.

Montserrat Alternates **does** reach the export: the PDF embeds it, so the
document is typographically the app's even though it is not chromatically the
app's. See §9.8.

### §9.8 Implementation consequences

Named here so the follow-up work is scoped rather than discovered.

1. **Five colour sync points, none automated.** `styles.css :root`;
   `index.html`'s two `theme-color` metas; `manifest.json`'s `background_color`
   and `theme_color` (the format has no dark variant, so it becomes a single dark
   value); and `app.js`'s `PDF_PAPER` / `PDF_INK` / `PDF_SHADE`, which are
   hand-derived floats. Changing a token in one place silently desynchronises the
   others.
2. **PDF font embedding is the largest single item.** The exporter uses base-14
   Helvetica with hardcoded base-36 advance-width tables. Embedding requires:
   `.ttf` (not `woff2`) for `FontFile2`; a `/FontDescriptor`; a `/Widths` array
   with `/FirstChar`/`/LastChar`; real advances read from `hmtx`/`hhea`; and
   `PDF_ASC`/`PDF_DESC` re-derived from the font's own em box. The existing
   `/WinAnsiEncoding` + CP1252 layer is unaffected. With no build step (§3.3)
   there is no subsetter, so both weights embed whole — roughly 150KB per
   exported PDF. That cost is accepted deliberately.
3. `EXPORT_GEO.radius` mirrors the CSS radius by hand and moves 2 → 3.
4. `sw.js` `ASSETS` gains the font files; `CACHE` bumps per §8.1.
5. The `prefers-color-scheme: dark` block and the entire light `:root` are
   removed, not overridden.
6. New `DECISIONS.md` entries are owed for: the band and lot gaining fills (B33–B38
   territory), the retirement of the light theme (B16), and the note taking colour
   (§9.1's "never costume").

---

## §10 Cross-reference

The codebase cites `UIUX.md` as a separate document. It does not exist; its
material is §9. Every citation resolves as follows.

| Citation | Here |
|---|---|
| `UIUX §1` — governing law, identity | §1, §9.1 |
| `UIUX §2` — design tokens | §9.2 |
| `UIUX §2.4` — elevation | §9.6 |
| `UIUX §3` — board geometry | §5.1, §5.2 |
| `UIUX §4` — the note component | §9.4 |
| `UIUX §4.1` — transform origin, truthful coordinates | §5.1, §6.3 |
| `UIUX §4.2` — note states, focus | §9.4 |
| `UIUX §4.3` — the scratch-out | §6.4, §9.4 |
| `UIUX §4.4` — lot lines are never framed | §6.5 |
| `UIUX §5` — gestures | §5.4 |
| `UIUX §6` — the touch floor | §5.3 |
| `UIUX §7` — the menu, destructive last | §6.6 |
| `UIUX §8` — motion | §9.6 |
| `UIUX §9` — the undo toast | §6.6.1 |
| `UIUX §10` — the board list, truncation | §6.7 |
| `UIUX §11` — scale to fit | §5.2 |
| `UIUX §12` — accessibility | §9.6 |
| `styles.css §1` — "identity from structure, never costume" | §9.1 |

`PRD §x` citations resolve to their own numbers here, with two notes:
`PRD §6.2`'s predetermined width cap was **superseded by B39** (§6.2), and
`PRD §6.6`'s menu ordering was **superseded by A1 and then B43** (§6.6).
