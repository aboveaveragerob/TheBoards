# Product Requirements Document: To-Do Boards v2

**Version:** 2.0 · **Status:** specification complete, implementation not started
**Supersedes:** the v1 reconstruction (PR #77)
**Companion documents:** `UIUX.md` (rendering authority) · `DECISIONS.md` (v1 record)

---

**How to read this with the other records.**

| Document | Authority |
|---|---|
| **`PRD.md`** (this) | What the product is, who it is for, what it must do. Requirements and acceptance criteria. |
| **`UIUX.md`** | How it renders and behaves under the hand. **Wins on any rendering question** — that is what "rendering authority" means, and `DECISIONS.md` A1 already resolved one such conflict that way. |
| **`DECISIONS.md`** | The v1 reasoning history, A1 and B1–B43. Binding for v1 and the record of *why*. Where this document supersedes a ruling, it says so by number. |

v1 was built first and specified afterwards. v2 is specified first. That is the
change this document exists to make.

---

## 0. Vision & Principles

*Capturing the soul of the product — taste and judgment that cannot be inferred.*

### 0.1 Product Vision

**A fixed, bounded page where any thought becomes a framed, movable, scalable
note the instant it is typed — and where structure is asserted afterwards, by
where things sit and how big they are.**

It matters because every other tool makes you decide what a thought *is* before
it will let you write it down: which list, which project, which tag, which
priority. That decision costs more than the thought did. This app takes the
thought first and lets meaning arrive later, spatially, from the person rather
than from the software.

### 0.2 Design Principles (Non-Negotiables)

| # | Principle | Why it matters | Example violation to avoid |
|---|---|---|---|
| P1 | **Capture precedes structure** | A thought must reach the page in the time it takes to type it | Any mode, dialog, picker, animation or delay between the intent to write and the caret. A 400ms window in front of note creation |
| P2 | **Relationships are asserted, not inferred** | Meaning belongs to the person, not the software | Auto-grouping, tag suggestions, "related notes", sorting by anything the person did not choose, snapping, alignment guides |
| P3 | **Positions are permanent — a committed position is data** | The board you left is the board you return to | Re-clamping notes on resize; rewriting stored `x`/`y` because the viewport changed; reflowing a board to fit a new device |
| P4 | **Zero cognitive tax** | The interface asks nothing | Settings, accounts, sync state, onboarding, empty states to interpret, a theme switch |
| P5 | **Work performed stays visible** | The board is a record that the work happened, and where it sat | Completion that deletes, hides, archives, or moves an item out of its place |

And the governing design law, which `UIUX.md` implements:

> **If you have to think about the interface, it failed. Every pixel earns its
> place.**

### 0.3 What Would Feel Wrong

If v2 shipped with any of these, it has failed regardless of technical
correctness:

- A **loading state, spinner or skeleton** anywhere. The device is the only copy;
  there is nothing to wait for.
- **Anything that congratulates the person.** No streaks, no confetti, no
  "You're on a roll!". Completing something is a record, not an achievement.
- A **settings screen.** Even one toggle. P4 is not "few settings"; it is none.
- The board feeling **bright, clinical, or like a productivity SaaS**. §0.4.
- **Decoration that does no job** — a gradient, a rounded corner, an animation
  present because interfaces have those.
- Notes that **move themselves.** Anything that reorganises the person's
  arrangement without them doing it.
- An **empty board that looks broken** — an illustration, a "Get started!"
  prompt, a tutorial. A blank page is the correct state of a blank page.

### 0.4 Aesthetic & UX North Star

- **What it should feel like:** **Peaceful fondness.** A place you are glad to
  return to. Not productive-anxious, not gamified, not neutral-corporate.
- **The imagery:** **calm water** — beaches, rivers, brooks. At depth and at
  dusk, not noon glare. That is why the palette is dark: deep water is peaceful;
  a bright white productivity surface is not. **The one lit thing in the room is
  the note you just wrote.**
- **The personality:** quiet, exact, unhurried, and completely uninterested in
  your attention. It does not want to be opened more often. It wants to be right
  when it is.
- **What this does not license:** decoration. Peace is produced by restraint,
  depth and consistency. Where a value is decorative rather than structural, it
  is wrong.

### 0.5 Explicit Taste Decisions

Judgment calls that are subjective and load-bearing.

| Decision | Choice made | Rationale |
|---|---|---|
| Theme | **Dark only.** The light/dark pair (B16) is retired | P4 forbids the setting, and the identity is one room at dusk. A theme choice is a question the app must not ask |
| The note's colour | **The brightest surface in the app** (`--note #89c7c5`) | It is the only thing the person *placed*. Position is what the product is about |
| Completion | **A scratch-out that stays in place**, at its size, in its arrangement | P5. Deleting the record deletes the fact that the work happened |
| Destructive colour | `--danger #E2A08C` is **the only warm hue in the app** | Everything else is cool water; the one thing that destroys is the one thing that isn't |
| Symbols | **Drawn, not typed** (`UIUX §13.3`) | A symbol asked to render identically everywhere in one voice is not text. Type is the wrong medium for that job |
| The page's edge | **Drawn** where the desk is visible | A bounded page is the product's central claim. Drawing its bound is the thesis, not decoration |
| Export | **Paper-light, always**, whatever the app looks like | The export is a reference sheet *for paper*. Paper is the ground it is designed against |
| Boards on first launch | **A blank board, never the list** (B10) | The desk always shows a working page |
| Motion | **A closed set of five transitions.** It does not grow | Nothing else has earned its place |

**Section Status:** COMPLETE

---

## 1. Problem Statement

### 1.1 Background

Capture tools ask for classification at the moment of capture. Spatial tools
(whiteboards, canvases) accept a thought without classification but replace the
problem with a different one: an infinite canvas has no "all of it", so the
person navigates instead of thinking, and nothing is ever fully in view.

v1 of To-Do Boards resolved this — a bounded page, instant capture, structure
asserted by position — and it works. It shipped as a PWA with no backend, no
build step and no dependencies, and it is in daily use.

What v1 does not have is an identity or a specification. It looks like the
default browser rendering of its own markup, and every product rule lives in
three places that disagree about what they are: 81KB of retrospective rulings,
the code's own comments, and ~20 citations pointing at a `PRD.md`/`UIUX.md` pair
that did not exist until now.

### 1.2 Pain Points

| # | Pain | Evidence |
|---|---|---|
| PP1 | **The board does not survive a device change.** Notes lose their arrangement relative to each other when a foldable is folded, unfolded or rotated | Issues #65, #75 (screenshots attached to #65) |
| PP2 | **There is no visual identity.** Nothing about the surface says what the app is for or how it should feel | §0.4 has never been implemented |
| PP3 | **Board categories exist only on desktop.** Mobile is the primary path and has no way to sort boards | Issue #74; B42 shipped categories to the rail only |
| PP4 | **The specification did not exist.** Citations pointed at nothing; every behavioural rule had to be reconstructed from code | ~20 dead `PRD §x` / `UIUX §x` citations across `app.js`, `styles.css`, `sw.js`, `DECISIONS.md` |
| PP5 | **Design values were never verified.** The v1 palette's rules and hairlines were specified against surfaces they are not drawn on | `--line #717575` is 1.64:1 on the sheet it rules across |

### 1.3 Impact

PP1 is a data-integrity failure in the user's eyes: the arrangement *is* the
content (P2, P3), so losing it loses meaning even though every byte is intact.
It is the only pain point that makes the product wrong rather than plain.

PP2 is what v2 is named for. PP4 and PP5 are why v2 is specified before it is
built.

**Section Status:** COMPLETE

---

## 2. Target Users

### 2.1 Primary Persona — the sole author

- **Who:** one person, on their own device, capturing their own thinking.
- **Devices:** a foldable Android phone is the primary target (both the inner and
  cover displays), with a desktop browser as an explicit second grammar. The app
  is installed to the home screen and used offline.
- **Goals:** get a thought out of their head before they lose it; arrange
  thoughts spatially until the arrangement means something; see the whole of a
  problem at once.
- **Frustrations today:** tools that demand classification at capture time;
  canvases that never show "all of it"; anything that reorganises their work.
- **Behaviours:** opens the app mid-thought, often one-handed, often with the
  device in whatever fold or orientation it happens to be in. Returns to a board
  days or weeks later and expects it unchanged.

### 2.2 Secondary Personas

**There are none, and this is a product decision rather than an omission.** There
is no second user, no team, no sharing model, and no plan to add one. Every
requirement in §4 assumes exactly one author with exclusive access to the device.
See §14.2 and §18.2.

**Section Status:** COMPLETE

---

## 3. User Stories

Priority uses MoSCoW. **Must** = v2 does not ship without it.

---

### US-001: Capture a thought without deciding what it is

**As** the sole author
**I want** a note to appear and accept text the instant I touch an empty part of the page
**So that** nothing stands between the thought and the page

**Acceptance Criteria:**
- [ ] Given a board is open, when I tap empty canvas, then a note is created at
      the tapped point, is in edit mode, and has a visible caret — with no
      intervening delay, dialog or animation.
- [ ] Given I have tapped, when the soft keyboard is raised, then it is raised
      within the same user-activation gesture (not after a timeout).
- [ ] Given the note has no characters, when it is rendered, then it draws no
      frame and no fill.
- [ ] Given I commit a note containing only whitespace, when any render occurs,
      then the record is discarded.

**Priority:** Must · **Traces to:** P1, B8, B27, B31

---

### US-002: Assert meaning by moving and resizing

**As** the sole author
**I want** to drag a note anywhere and scale it freely
**So that** the arrangement carries the meaning instead of a field

**Acceptance Criteria:**
- [ ] Given a note, when I drag it, then it moves freely, may overlap any other
      note, and is subject to no snapping or alignment guide.
- [ ] Given two notes overlap exactly, when they render, then each is
      distinguishable from the other by its frame.
- [ ] Given a note, when I pinch (touch) or drag its selection frame (pointer),
      then it scales within 0.5–2.0 about its top-left corner.
- [ ] Given any move or scale, when it commits, then the stored coordinates are
      the only thing that changed.

**Priority:** Must · **Traces to:** P2, P3, B4, B12, B40

---

### US-003: Return to a board and find it as I left it

**As** the sole author
**I want** my arrangement preserved across every device change
**So that** the meaning I asserted survives folding, rotating and resizing

**Acceptance Criteria:**
- [ ] Given a board arranged on one screen, when the device is folded, unfolded
      or rotated, then every note's position and size **relative to every other
      note** is unchanged.
- [ ] Given the same, when the board is redrawn, then no stored `x`, `y` or
      `scale` has been mutated.
- [ ] Given a note is being edited, when the viewport resizes because the soft
      keyboard opened, then the layout does not recompute until the edit commits.

**Priority:** Must · **Traces to:** P3, PP1, issues #65 / #75

---

### US-004: Mark work done without losing the record of it

**As** the sole author
**I want** completing an item to strike it out in place
**So that** the board still shows the work happened and where it sat

**Acceptance Criteria:**
- [ ] Given an active item, when I complete it, then it is struck out in place at
      its size and position, with ≥90% stroke coverage and its text destroyed
      beneath.
- [ ] Given a completed item, when I restore it, then it returns to its exact
      prior state.
- [ ] Given a completed item, when the board is exported, then it is drawn struck
      out and **no text object for it exists anywhere in the file**.

**Priority:** Must · **Traces to:** P5, B34

---

### US-005: Undo a deletion I did not mean

**As** the sole author
**I want** five seconds to take a deletion back
**So that** a mistaken tap does not cost me work

**Acceptance Criteria:**
- [ ] Given I delete an item, when the toast is showing, then activating Undo
      restores the item to its exact prior state including its index in its
      collection.
- [ ] Given I delete several items at once, when the toast appears, then there is
      exactly one window, one save and one Undo for the batch.
- [ ] Given a pending Undo, when a save-failure toast is raised, then the Undo is
      not replaced or cancelled.
- [ ] Given a pending note or lot Undo, when I switch boards, then it is
      finalized; a pending **board**-delete Undo survives the switch.

**Priority:** Must · **Traces to:** B13, B26

---

### US-006: Keep the board dark and calm

**As** the sole author
**I want** the app to look like still water at dusk with my notes lit on it
**So that** returning to it feels peaceful rather than demanding

**Acceptance Criteria:**
- [ ] Given the app is open, when any surface renders, then it draws from the
      six-value ladder in `UIUX §2.2` and no light theme exists in the codebase.
- [ ] Given any two surfaces that touch, when they render, then they are
      separated by fill (≥3:1) or by a drawn edge (≥3:1 against both).
- [ ] Given any text, when it renders, then it clears WCAG AA (4.5:1) against its
      own ground.
- [ ] Given any state distinguished by colour, when it renders, then it is also
      distinguished by geometry, position or texture.

**Priority:** Must · **Traces to:** §0.4, PP2, PP5

---

### US-007: Sort my boards on the device I actually use

**As** the sole author
**I want** to sort boards into To-Do, Idea and Unsorted on mobile
**So that** the phone has the organisation the desktop already has

**Acceptance Criteria:**
- [ ] Given the mobile board list, when it renders, then boards appear under
      **To-Do / Idea / Unsorted**, matching the rail's categories.
- [ ] Given a board card, when I drag it onto another category, then it moves,
      the target section frames itself during the drag, and the change persists.
- [ ] Given more cards than a section can show, when it renders, then the
      overflow **pages** and does not scroll; a single page hides its own pager.
- [ ] Given a board saved by an older build with no category, when it is read,
      then it is defaulted at the read site and **not** migrated on disk.

**Priority:** Must · **Traces to:** PP3, issue #74, B42

---

### US-008: Take a board off the device

**As** the sole author
**I want** to export any board to a PDF
**So that** the device is not the only copy

**Acceptance Criteria:**
- [ ] Given any board — open or not — when I export it, then a two-page A4
      portrait PDF is produced: the reference sheet drawn as vectors, then the
      board as prose.
- [ ] Given an unchanged board, when I export it twice, then the two files are
      byte-identical.
- [ ] Given text outside the PDF font's encoding, when I export, then those
      characters render as `?` and a toast says so.
- [ ] Given the app is offline, when I export, then it succeeds.

**Priority:** Must · **Traces to:** §0.5, B34

---

### US-009: Work with no network, ever

**As** the sole author
**I want** the app to behave identically offline
**So that** I never think about connectivity

**Acceptance Criteria:**
- [ ] Given the app is installed and the device is in airplane mode, when I cold
      launch, then it is indistinguishable from an online launch.
- [ ] Given a shipped change, when I next launch the installed app, then I am
      running it.
- [ ] Given any interaction, when it runs, then it makes no network request.

**Priority:** Must · **Traces to:** P4, B36

---

### US-010: Get back to the board with the system gesture

**As** the sole author
**I want** the OS back gesture to return me from the board list
**So that** I do not have to learn the app's own navigation

**Acceptance Criteria:**
- [ ] Given the board list is open on mobile, when I use the OS back gesture,
      then the board I came from is shown.
- [ ] Given any navigation, when it occurs, then the History API is neither
      intercepted, shadowed nor disabled.

**Priority:** Must · **Traces to:** P4, B9

---

### US-011: Reach every target with a fingertip

**As** the sole author, often one-handed
**I want** every target large enough to hit
**So that** capture does not become aiming

**Acceptance Criteria:**
- [ ] Given touch input, when any interactive element renders, then its hit area
      is ≥44 physical CSS px on its smallest axis, at every note scale.
- [ ] Given a note's hit area expands to meet the floor, when it renders, then
      its visible frame is unchanged.
- [ ] Given a fine pointer with hover, when any element renders, then the floor
      is 24px.

**Priority:** Must · **Traces to:** B7, B23

---

### US-012: Know my tap registered

**As** the sole author
**I want** every committing action to acknowledge itself
**So that** I do not tap twice and cause two things to happen

**Acceptance Criteria:**
- [ ] Given a committing action, when I release, then within 400ms the interface
      visibly acknowledges it and the window is never blank.
- [ ] Given an open action window, when I tap again inside it, then the second
      tap is **dropped, not queued**.
- [ ] Given note creation on mobile, when I tap, then no window is opened and the
      note is created synchronously.

**Priority:** Must · **Traces to:** B18, B22, B27, B42

---

**Section Status:** COMPLETE

---

## 4. Functional Requirements

Numbering: **0xx** capture and the note atom · **1xx** surfaces · **2xx** layout
and cross-device · **3xx** boards · **4xx** export · **5xx** design system ·
**6xx** persistence and offline.

Requirements marked **[v2]** are new or changed in this release. All others
specify existing behaviour so that v2 has one document to conform against.

### 4.1 Capture and the note atom (FR-0xx)

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-001 | A tap or click on empty canvas creates a note at that point, in edit mode, with the caret placed | Note exists, is focused, caret visible, in the same event turn on touch | Must |
| FR-002 | Mobile capture executes synchronously inside `pointerup` | No timer between release and focus; soft keyboard raises within user activation | Must |
| FR-003 | The caret lands at the touch point on touch, and at the end of the text on pointer | Verified per input mode | Must |
| FR-004 | A note draws no frame and no fill until its first character | `:empty` renders transparent border and background | Must |
| FR-005 | A frame committed with only whitespace is discarded, using `trim()` rather than zero-length | Discarded at blur **and** swept on every render | Must |
| FR-006 | Note text is a plain string; paste is coerced to plain text | `contenteditable="plaintext-only"` where supported, `true` otherwise | Must |
| FR-007 | A note wraps at the sheet's right edge, not at a predetermined width | Cap = `max(NOTE_MIN_W, (LOGICAL_W − renderX)/effScale)`; live during drag; export mirrors it | Must |
| FR-008 | Notes scale within 0.5–2.0 about their top-left corner | Clamps admit an out-of-range starting scale (B40) | Must |
| FR-009 | Notes overlap freely; there is no snapping, alignment guide or auto-layout | No such code path exists | Must |
| FR-010 | Z-order is DOM order; touching or grabbing a note surfaces it | No layer panel, no send-to-back | Must |
| FR-011 | On a fine pointer, shift-click multi-selects; a group drag moves every member by one delta; resize is single-selection only | Lot rows stay single-select | Must |

### 4.2 Surfaces (FR-1xx)

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-101 | Four permanent regions exist on every board: Title, Components, Requirements, Parking Lot. They cannot be created, moved, resized or deleted | Present on a blank board | Must |
| FR-102 | `contenteditable` is enabled only while editing | The recognizer owns tap/drag/long-press without fighting native focus | Must |
| FR-103 | The top band is drawn furniture, independent of content, and reads rule → header → content | Renders identically on a blank and a full board | Must |
| FR-104 | The title compartment draws three sides; the sheet's top edge is its fourth | Always drawn — the one exception to FR-004 | Must |
| FR-105 | Band geometry is sized by the type it holds, not by the sheet | Across is a fraction of the sheet; down is set by the type | Must |
| FR-106 | Parking Lot items are unframed stacked text lines with no coordinates | The one place text is never framed | Must |
| FR-107 | Lot height is a whole-row budget of `34 + n × 44`; rows past the budget still exist, save and export | Three rows on a tall sheet, two on a phone | Must |
| FR-108 | On a fine pointer, a selected lot row draws an outline with its actions inline at the row's right edge | Scoped to desktop and selected | Must |
| FR-109 | Completing draws a scratch-out in place: ≥90% coverage in three stroke families, with the text destroyed beneath to 40% ink | Reversible via Restore | Must |
| FR-110 | Menus order navigation first, then the item's own actions in rising severity, destructive last behind a hairline | Item · Anchor · Board-row · Selection menus per `UIUX §7` | Must |
| FR-111 | Delete is undoable for 5s, restoring exact prior state including collection index | One window per batch; a new destructive action finalizes the prior undo | Must |
| FR-112 | No long-press timer is armed over bare canvas or lot background, and the `pointerdown` that dismisses a menu creates nothing | Dismissal is a retraction | Must |
| FR-113 | Every committing action passes through a filled 400ms window; a second tap inside it is dropped, not queued | A note is never *filled* as acknowledgement | Must |

### 4.3 Layout and cross-device (FR-2xx)

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-201 | The board is one bounded logical space rendered through a single **uniform** `transform: scale()` | Frames stay square; hit maths stays exact | Must |
| FR-202 | The board never pans and never zooms; browser pinch-zoom is disabled | Two-finger pinch belongs to the note | Must |
| FR-203 | On touch, the sheet is the viewport: `LOGICAL_W = vw`, `LOGICAL_H = vh`, `renderScale = 1` | Every declared px is a real px | Must |
| FR-204 | On a fine pointer ≥1024px, the rail takes 300px unscaled and the sheet fills the rest; neither logical dimension drops below 900×1000 | Min-anchored scale | Must |
| FR-205 | Mode is a live capability test — `(min-width:1024px) and (hover:hover) and (pointer:fine)` — never a width or UA test | Tablets stay in touch mode | Must |
| FR-206 | A mode flip tears down all live state: selection, menu, gesture, pointers | Nothing half-finished survives | Must |
| FR-207 | Committed notes are never re-clamped on resize, and no layout change mutates stored `x`, `y`, `rw`, `rh` or `scale` | Only gestures write | Must |
| FR-208 | While a `contenteditable` inside the board holds focus, mobile re-layout is deferred and re-applied on `focusout` | A genuine rotation mid-edit is postponed, not lost | Must |
| FR-209 | The reference sheet is 900×1000 — what band and lot proportions are derived against and what the export draws | Distinct from the live viewport-derived dimensions | Must |
| **FR-210** **[v2]** | **Across any device change, the board is redrawn as a similarity transform: one ratio `k` applied to `x`, `y` and `scale` alike, where `k = min(LOGICAL_W/rw, LOGICAL_H/rh)`, with the mapped content centred in the sheet** | **Every note's position and size relative to every other note is unchanged after fold, unfold, rotate or resize. Stored values are not mutated. Notes authored before `rh` existed keep their render-time-only legacy clamp** | **Must** |
| FR-211 **[v2]** | Where the similarity transform leaves unused sheet, that area is live canvas | A tap there creates a note at that point | Must |

> **FR-210 is the fix for PP1, and it is a design decision before it is a bug
> fix.** v1 maps `x` by `LOGICAL_W/rw` and `y` by `LOGICAL_H/rh` — two different
> ratios — while sizing on the width ratio alone. When those ratios diverge, which
> is exactly what folding a device does, the transform is anisotropic: arrangement
> distorts. B40 named and accepted this ("when the two ratios diverge, vertical
> clearances can still shift"). Issue #65 asks for the opposite in the author's
> own words — cards that "maintain their positioning **in relation to each other**
> AND scale their size." That is a similarity transform, and it is the correct
> reading of P3: a position is data, so a redraw may re-*present* the arrangement
> but may not re-*write* it. **FR-210 supersedes B40's accepted divergence and
> B21's width-only multiplier.**
>
> The cost is honest and stated: a similarity transform cannot fill both axes when
> the aspect ratio changes, so some sheet is left over. FR-211 makes that area
> useful rather than dead. The alternative — filling the sheet — is what v1 does,
> and it is what issue #65 reports as broken.

### 4.4 Boards (FR-3xx)

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-301 | An empty database creates and opens one blank board; the list is never the landing view | First launch shows a working page | Must |
| FR-302 | Routing between board and list uses the History API so the OS back gesture works | Back is never intercepted or shadowed | Must |
| FR-303 | On a fine pointer, an always-visible 300px rail replaces the list, sunken rather than floating, outside `#board` | The recognizer never sees its events | Must |
| FR-304 | Cards are ordered `createdAt` desc with an `id` tiebreak — immutable, so a card's slot never moves | P3 applied to card order | Must |
| FR-305 | Boards sort into **To-Do / Idea / Unsorted**; a pointer-drag moves a card between sections with the target framing itself | Persisted in `category` / `catStamp` | Must |
| FR-306 | Section overflow **pages**; it does not scroll. A single page hides its own pager | No state, no statement | Must |
| FR-307 | A rail board swap is a crossfade with **no history push** | FR-302 is bypassed, not touched | Must |
| **FR-308** **[v2]** | **The mobile board list provides the same three categories and the same drag-to-sort and paging behaviour as the rail** | **Categories, drag-to-recategorise with target framing, paged overflow, single page hides its pager. Touch drag uses the existing recognizer and the 400ms window (FR-113)** | **Must** |
| FR-309 **[v2]** | Category is defaulted at the read site and never migrated on disk | A board written by an older build opens correctly and is not rewritten | Must |

### 4.5 Export (FR-4xx)

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-401 | Export is hand-rolled with no library and works offline by construction | No dependency added | Must |
| FR-402 | Export produces two A4 portrait pages: the reference sheet as vectors at 900×1000 with a 36pt margin, then the board as prose | Never the live viewport | Must |
| FR-403 | Export reuses the screen's own laws — `exportX`/`exportY`/`exportMult` mirror `renderX`/`renderY`/`noteMult`, `exportNoteBox` mirrors `noteMaxW` | A cap-hitting note cannot disagree between screen and PDF | Must |
| FR-404 | A completed item is drawn struck out and **emits no text object at all** | Assertable against the file's bytes | Must |
| FR-405 | Output is byte-identical for an unchanged board | Two exports diff clean | Must |
| FR-406 | Characters outside the font's encoding export as `?` and raise a toast | No silent failure | Must |
| FR-407 | Export is reachable from the anchor menu, the board-row menu and the rail card menu | Any board, no detour through the list | Must |
| FR-408 | The export is paper-light regardless of the app's palette | `UIUX §15` | Must |
| FR-409 **[v2]** | The export embeds Montserrat Alternates | `FontFile2`, `/FontDescriptor`, `/Widths` from real `hmtx`/`hhea` advances, `PDF_ASC`/`PDF_DESC` re-derived from the font's em box; `/WinAnsiEncoding` + CP1252 unchanged | Should |
| FR-410 **[v2]** | `EXPORT_GEO.radius` tracks the CSS radius (2 → 3) | Verified against `styles.css` | Must |

### 4.6 Design system (FR-5xx) **[all v2]**

Specified in full in `UIUX.md`; stated here as testable requirements.

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-501 | The app is dark-only; the light `:root` and the `prefers-color-scheme` block are **removed, not overridden** | No light-theme declaration remains in `styles.css` | Must |
| FR-502 | Every surface draws from the six-value ladder in `UIUX §2.2` | No colour literal outside the token set | Must |
| FR-503 | Ink is bound per surface, not per app; `--line` is deleted | `.on-dark` / `.on-light` rebind `--ink` and `--ink-a`; downstream rules read `var(--ink)` unchanged | Must |
| FR-504 | Every text pairing clears WCAG AA (4.5:1) against its own ground | The table in `UIUX §2.3` reproduces | Must |
| FR-505 | Every adjacency separates by fill (≥3:1) or by a drawn edge (≥3:1 against both its fill and its ground) | The matrix in `UIUX §2.5` reproduces, all twelve pairs | Must |
| FR-506 | A surface's edge is drawn in that surface's own ink | Single rule, no per-context exception | Must |
| FR-507 | The sheet draws an edge wherever the letterbox is visible, and none on the mobile path | `renderScale = 1` means no edge to draw | Must |
| FR-508 | Rules are 1px at full surface ink; hairlines are surface ink at the lowest alpha clearing 3:1 on that ground (0.40 on `--chrome`) | Measured, not assumed | Must |
| FR-509 | An accent is text only on `--chrome` or `--furniture`; anywhere else it is a fill carrying `--ink-dark` | No accent renders as text on `--board`, `--shelf` or `--note` | Must |
| FR-510 | The focus ring is two-tone and clears 3:1 on all six grounds by construction | The table in `UIUX §2.7` reproduces | Must |
| FR-511 | No state is distinguished by colour alone | Every colour-carrying state has a geometry, position or texture | Must |
| FR-512 | Shadow is used only on `#menu`, `#toast` and `.pane-drag-ghost`; the rail's is inset; notes have none | Audit of every `box-shadow` | Must |
| FR-513 | Montserrat Alternates is self-hosted in `fonts/`, three weights, Latin `woff2`, `font-display: swap`, listed in `sw.js` `ASSETS` | No CDN reference anywhere | Must |
| FR-514 | Band and lot geometry are re-verified against the new typeface before ship | `UIUX §13.2`'s three measurements; `test/mobile.js` asserts the geometry | Must |
| FR-515 | The symbol set is inline SVG in `currentColor`, drawn at the note's stroke weight and corner radius | No glyph resolves through a platform font | Must |
| FR-516 | Motion is the closed set of five transitions at 200/260ms on a long deceleration; `prefers-reduced-motion: reduce` kills all of it | Nothing else animates; note capture and the control press stay instant | Must |
| FR-517 | Controls share one tactile signature — offset shadow plus press-translate — across all four species | Primary, selection, pager, and bare rows | Must |

### 4.7 Persistence and offline (FR-6xx)

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-601 | IndexedDB `boards-db` / store `boards` is the only persistence; no network call exists anywhere in the app | Audit of `fetch`/`XHR` outside `sw.js` | Must |
| FR-602 | Keystrokes debounce at 300ms; blur, drag-end, pinch-end, complete, delete and z-order changes commit immediately | Measured | Must |
| FR-603 | Writes go through a single-flight queue with exponential backoff; a failure raises a polite `role="status"` toast | Never clobbers a pending Undo | Must |
| FR-604 | **A write may never block capture** — the save queue is behind the caret, always | No await between tap and caret | Must |
| FR-605 | New fields are defaulted at the read site, never migrated | An older board opens without being rewritten | Must |
| FR-606 | The service worker is cache-first with stale-while-revalidate; a warm hit returns without waiting on the network | Offline behaviour and cold-start latency unchanged | Must |
| FR-607 | `CACHE` is version-stamped and bumped on every shipped change to any precached asset | Asserted against the deployed file by CI | Must |

**Section Status:** COMPLETE

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-101 | Time from `pointerup` on empty canvas to a focused caret | **0 frames of deliberate delay**; no timer in the path | Code path audit + `test/mobile.js` |
| NFR-102 | Cold launch to interactive, installed, airplane mode | ≤ **1s** on the target device | Manual, on the Z Fold |
| NFR-103 | Layout recompute on resize, fold or rotate | ≤ **1 frame** (16ms) for ≤50 notes | `performance.now()` around `applyLayout` |
| NFR-104 | Save debounce | **300ms** from last keystroke | `SAVE_DEBOUNCE` |
| NFR-105 | Action acknowledgement window | **400ms**, filled, never blank | `ACTION_DELAY`; *impermanent, see §18.2* |
| NFR-106 | Total shipped payload excluding fonts | ≤ **250KB** | `du` of precached assets |
| NFR-107 | Font payload | ≤ **90KB** for three Latin-subset `woff2` weights | Measured at build of the subset |
| NFR-108 | Exported PDF size | ≤ **400KB** with both weights embedded whole (no subsetter — §17) | Measured |

### 5.2 Security

| ID | Requirement |
|---|---|
| NFR-201 | No data leaves the device except through an explicit user-initiated export. |
| NFR-202 | No analytics, telemetry, crash reporting or beacon of any kind. |
| NFR-203 | No third-party origin is contacted at runtime — no CDN, font host or API. Enforceable by inspection: `sw.js` runtime-caches same-origin `basic` responses only. |
| NFR-204 | No credential, token or secret exists in the codebase, because there is nothing to authenticate to. |
| NFR-205 | Note text is never interpreted as markup: `plaintext-only` at the input boundary, and rendering sets text rather than HTML. |

### 5.3 Accessibility

Target: **WCAG 2.2 AA, with AAA where the product already reaches it.**

| ID | Requirement | Criterion |
|---|---|---|
| NFR-301 | All text clears 4.5:1 against its own ground | 1.4.3 (five of six surfaces clear AAA 1.4.6) |
| NFR-302 | All non-text UI boundaries and state indicators clear 3:1 | 1.4.11 |
| NFR-303 | Nothing is distinguished by colour alone | 1.4.1 |
| NFR-304 | Touch targets ≥44px; pointer targets ≥24px | 2.5.5 AAA / 2.5.8 AA |
| NFR-305 | Focus is visible on every interactive element, on every ground | 2.4.7, 2.4.11 |
| NFR-306 | `prefers-reduced-motion: reduce` removes all motion | 2.3.3 |
| NFR-307 | Editable regions expose `role="textbox"` / `aria-multiline`; the toast is a polite `role="status"` | 4.1.2, 4.1.3 |
| NFR-308 | Truncation is always visibly indicated | 1.4.13 |
| NFR-309 | Keyboard: `Esc` deselects or commits, `Delete` removes the selection, `Enter` edits it | 2.1.1 |
| NFR-310 | The desktop rail is hidden from assistive technology off-desktop | 1.3.1 |

### 5.4 Scalability

The product's scaling axis is **notes per board**, not users or data volume.

| ID | Requirement | Target |
|---|---|---|
| NFR-401 | Notes per board rendering within NFR-103 | **200** |
| NFR-402 | Boards in the database, list and rail paging within one frame | **500** |
| NFR-403 | Characters in a single note | **10,000** |
| NFR-404 | Behaviour beyond these numbers | Degrades in speed only — never in correctness, and never by dropping or reordering data |

**Section Status:** COMPLETE

---

## 6. Data Model

### 6.1 Records

```
Board  { id, createdAt, updatedAt, title, components, requirements,
         notes[], parkingLot[], category, catStamp }

Note   { id, text, x, y, rw, rh, scale, state }

LotItem{ id, text, state }
```

`state` is `active` or `complete`. `text` is a plain string in every case.
`category` is `todo` | `idea` | `unsorted`; `catStamp` records when it was set.

### 6.2 Two structural facts that carry product meaning

- **A lot item has no `x`/`y`.** It is an ordered line, not a spatial object.
  This is why lot items live in block flow rather than on the absolute canvas
  (B6), why they are never framed (FR-106), and why they are not
  multi-selectable (B41) — herding is a spatial operation.
- **`rw`/`rh` are the reference frame a note was authored against**, not a
  position. They exist so P3 can hold across devices: stored `x`/`y` are never
  mutated, and rendering maps them from the authoring frame to the current one
  (FR-210).

### 6.3 Constraints

| Field | Constraint |
|---|---|
| `id` | UUID; `crypto.randomUUID()` where available, RFC-4122 v4 fallback otherwise |
| `text` | Plain string. A record whose `text.trim()` is empty does not persist (FR-005) |
| `x`, `y` | Numbers in the authoring frame's logical units. **Never mutated by a layout change** |
| `rw`, `rh` | The `LOGICAL_W`/`LOGICAL_H` the note was last written against. Absent on pre-B32 records; `rw` defaults to 900, `rh` has no recoverable default and takes the legacy render-time clamp |
| `scale` | 0.5–2.0 as authored. The frame multiplier is applied at render, not stored |
| `category` | Defaulted at the read site to `unsorted`. **Never migrated on disk** (FR-309) |

### 6.4 Schema evolution

**New fields are defaulted at the read site, never migrated.** A board written by
an older build opens correctly without being rewritten — which is P3 applied to
the schema. This is B21's idiom, reused by B42 for `category`/`catStamp`, and it
is the required pattern for any field v2 adds.

**Section Status:** COMPLETE

---

## 7. UI/UX Specification

**`UIUX.md` is the full specification and the rendering authority.** This section
states what it covers and the three things a reader needs before opening it.

| Concern | `UIUX.md` |
|---|---|
| Governing law and register | §1 |
| Tokens, ladder, ink, edges, accents, focus | §2 |
| Board geometry | §3 |
| The note component and its states | §4 |
| Gestures | §5 |
| The touch floor | §6 |
| The menu | §7 |
| Motion | §8 |
| The undo toast | §9 |
| Board list and rail | §10 |
| Scale to fit | §11 |
| Accessibility | §12 |
| Typography and marks | §13 |
| Controls | §14 |
| Where the identity does not reach | §15 |
| Implementation consequences | §16 |

### 7.1 The one-sentence version

**Notes are lit paper on a dark board, in one room at dusk; everything else
recedes, and every mark on the surface is doing a job.**

### 7.2 The two rules that generate the rest

1. **A surface's edge is drawn in that surface's own ink.** Two surfaces that
   touch separate either by fill (≥3:1) or by that edge. This single rule closes
   all twelve adjacencies that occur in the app, including two overlapping notes
   — which are the same colour, so the frame is the only thing between them.
2. **Never colour alone.** Every state carrying colour also carries a geometry,
   a position or a texture.

### 7.3 Board geometry

| | Touch | Fine pointer ≥1024px |
|---|---|---|
| `LOGICAL_W` | `vw` | `(vw − 300) / renderScale` |
| `LOGICAL_H` | `vh` | `vh / renderScale` |
| `renderScale` | `1` | `min(vh/1000, (vw − 300)/900)` |
| `offX` | `0` | `300` (the rail) |
| Floor | — | Neither logical dimension below 900×1000 |

**The reference sheet is 900×1000** — what band and lot proportions are derived
against and what the export draws, distinct from the live viewport-derived
dimensions.

Cross-device rendering is the **similarity transform** of FR-210: one ratio for
both axes and for size, mapped content centred, stored values untouched.

**Section Status:** COMPLETE

---

## 8. API Contract

**Not applicable, by product decision rather than omission.**

There is no backend, no server round-trip and no network call anywhere in the app
(FR-601, NFR-203). Adding one changes what the product is: P4 and §14.2. The only
data contracts that exist are internal and are specified in §6:

| Boundary | Contract |
|---|---|
| App ↔ IndexedDB | §6.1 record shapes; §6.4 read-site defaulting |
| App ↔ service worker cache | `sw.js` `ASSETS` list; `CACHE` version string |
| App → PDF | FR-402 through FR-410 — the export *is* the app's only outbound format |

**Section Status:** COMPLETE (N/A, with reason)

---

## 9. Change Analysis

*Addresses: "What will likely change?"*

### 9.1 Configuration vs Hardcoded Decisions

| Element | Decision | Rationale |
|---|---|---|
| Colour tokens | **Config** — CSS custom properties in one `:root` | The whole point of §2's ladder is that it is one place |
| **The five colour sync points** | **Config, but currently unenforced — this is a known defect** | `styles.css :root`, `index.html`'s `theme-color` metas, `manifest.json`'s two colour fields, and `app.js`'s `PDF_PAPER`/`PDF_INK`/`PDF_SHADE` hand-derived floats all restate colour independently. **v2 must add a check that fails when they diverge** (see §12.2) |
| Geometry constants (`LOGICAL_*`, band, lot) | **Hardcode**, derived in one place and read everywhere | `styles.css`'s `#board` already declares `--gutter`/`--card-w`/`--card-l`/`--rule-y` once and derives every edge from them. Keep that discipline |
| `EXPORT_GEO` | **Hardcode — and it is a duplicate**, restating `styles.css` geometry by hand | Accepted deliberately (no build step means no shared source), but it is the single most fragile thing in the codebase. §10.3 maps it; §12.2 requires a test pinning it |
| Timing (`ACTION_DELAY`, `SAVE_DEBOUNCE`, `UNDO_MS`, `LONGPRESS_MS`, `MOVE_THRESHOLD`) | **Hardcode as named constants** | Felt values, tuned on the device. Named so they can be re-interrogated; not exposed, because P4 forbids the setting |
| `NOTE_MIN_W`, `MIN_SCALE`, `MAX_SCALE` | **Hardcode as named constants** | Same |
| Category names (To-Do / Idea / Unsorted) | **Hardcode in `COPY`** | One key renames every site at once — the idiom `COPY.boards` already establishes |
| Font files | **Config** — `sw.js` `ASSETS` and `@font-face` | Adding a weight is a two-line change |
| Symbol set | **Config** — one `GLYPH` map, now of markup | FR-515 |

### 9.2 Flexibility Requirements

What must be cheap to change:

- **A colour token.** One edit in `:root`, plus the four sync points — which is
  precisely why §9.1 requires the divergence check.
- **A timing constant.** One named constant, no call-site edits. `ACTION_DELAY`
  in particular is marked impermanent (§18.2) and will be re-interrogated.
- **A menu's contents or order.** `openMenuFor` builds from a list; adding an item
  must not require touching the recognizer.
- **A symbol.** One entry in `GLYPH`.

What is deliberately expensive, and must stay that way:

- **Adding a dependency, a build step or a backend.** §17. The friction is the
  feature.
- **Changing the coordinate law.** FR-207 means every write path is a place P3
  can be violated. Changes there go through `DECISIONS.md`.

### 9.3 Feature Flags / Toggle Points

**There are none, and none may be added.** A flag is a setting with a longer
half-life, and P4 forbids the setting. `isDesktop` is not a flag — it is a live
capability test with no persistence and no manual override (FR-205).

**Section Status:** COMPLETE

---

## 10. Architecture Decisions

*Addresses: "Should this exist once or everywhere?" · "What's the source of
truth?" · "What breaks if I change this?"*

### 10.1 Shared vs Local Concepts

| Concept | Scope | Rationale |
|---|---|---|
| **The gesture recognizer** | **Shared — one, for both grammars** | `onPointerDown`/`Move`/`Up` branch inline on `isDesktop`. There is no separate desktop code path, and adding one would double every future gesture fix |
| **`delayAction()`** | **Shared — the action primitive** | Every committing action goes through it. A new action must not invent a bespoke timeout |
| **Coordinate mapping** (`toLogical`, `renderX`, `renderY`, `noteMult`, `effScale`) | **Shared — the only way geometry is read** | Never read `clientX`/`clientY` against note geometry directly |
| **Read-site defaulting** | **Shared idiom** | B21's pattern, reused by B42. Required for any new field (FR-605) |
| **`COPY` and `GLYPH`** | **Shared maps** | One key renames or redraws every site |
| **Ink binding** | **Shared, but rebound per surface** | `.on-dark`/`.on-light` set `--ink`; everything downstream reads it unchanged (`UIUX §2.3`) |
| **`EXPORT_GEO`** | **Local duplicate — knowingly** | The exporter cannot read CSS. See §10.3 |
| **Desktop rail** | **Local to desktop, and outside `#board`** | So the recognizer never sees its events |

### 10.2 Source of Truth

| Data | Owner | Consumers |
|---|---|---|
| Board content and note coordinates | **IndexedDB `boards-db`/`boards`** | Everything. There is no second store, no cache layer, no server |
| The live board in memory | `current` in `app.js` §3 | Rendering, gestures, export. Written back through the debounced queue |
| Which build is live | **`sw.js`'s `CACHE` string** | The service worker, `pages.yml`'s post-deploy assertion, `test/sw-update.js` |
| Render scale and offsets | `applyLayout()` | Every coordinate helper, via CSS custom properties on `#board` |
| Input mode | `DESKTOP_MQ` → `isDesktop` + `html.desktop` | JS branches on the flag; CSS gates on the class. **One test, two expressions** |
| Colour | **`styles.css :root`** | …and four hand-maintained copies. §9.1 |
| Page geometry for the export | `EXPORT_GEO` | The PDF writer only |

### 10.3 Dependency Map

*What breaks if I change this?*

| Change | Breaks |
|---|---|
| `styles.css` `:root` colour | `index.html` `theme-color`, `manifest.json` `background_color`/`theme_color`, `app.js` `PDF_*` floats — **all silently** |
| `styles.css` band/lot geometry | `EXPORT_GEO` (the PDF stops matching the screen), `test/mobile.js` geometry assertions |
| `NOTE_MIN_W` or the wrap law | `noteMaxW` **and** `exportNoteBox` — they must agree or a cap-hitting note disagrees between screen and PDF |
| `renderX`/`renderY`/`noteMult` | `exportX`/`exportY`/`exportMult`, `setHitInset` (hit area is derived from what the note draws at), `updateSelectionUI` |
| `LOGICAL_*` derivation | Every stored coordinate's interpretation. **P3 is at stake**; changes go through `DECISIONS.md` |
| Any precached asset | `sw.js` `CACHE` must bump or the change does not reach an installed app |
| The `GLYPH` map's value type | Every injection site (FR-515 changes strings to markup) |
| `isDesktop`'s query | The rail, hit floor, caret placement, selection, capture path, and `applyMode`'s teardown |
| Adding a font weight | `@font-face`, `sw.js` `ASSETS`, `CACHE`, and NFR-107's budget |

**The single most fragile edge is `EXPORT_GEO`.** It restates `styles.css`'s
geometry by hand, in a file that cannot read CSS, with no build step to generate
it. `DECISIONS.md` marks it *impermanent* three times over (B34, B37, B38) and it
has never been resolved. §12.2 requires a test that pins it; §18.4 names splitting
the exporter as the eventual fix.

**Section Status:** COMPLETE

---

## 11. Edge Cases & Error Scenarios

### 11.1 Malformed Input Handling

| Input | Malformed example | Expected behaviour |
|---|---|---|
| Note text | Whitespace only (`"   "`, `"\n"`) | Not persisted. Discarded at blur via `trim()` **and** swept on every render (FR-005) |
| Note text | Pasted rich text or HTML | Coerced to plain text at the input boundary (FR-006). Never interpreted as markup (NFR-205) |
| Note text | 10,000+ characters | Renders and saves; wraps at the sheet's right edge; degrades in speed only (NFR-404) |
| Note text | Non-Latin outside CP1252 | Renders correctly on screen. On export, those characters become `?` and a toast says so (FR-406) |
| Stored record | Missing `rw` | Defaults to 900 at the read site (FR-605) |
| Stored record | Missing `rh` | No recoverable default — the old mobile height was device-dependent. Mapped through `LEGACY_H` and clamped into the page **at render time only**; stored `y` untouched |
| Stored record | Missing `scale` | Treated as 1 at the read site. Never folded as `NaN` into storage |
| Stored record | Missing `category` | Defaults to `unsorted` at the read site; not written back (FR-309) |
| Stored record | `scale` outside 0.5–2.0 | Accepted. Gesture clamps widen to admit an out-of-range starting scale (B40) |

### 11.2 Missing Data Scenarios

| Scenario | Expected behaviour |
|---|---|
| Empty database on first launch | One blank board is created and opened. **The list is never the landing view** (FR-301) |
| A board with no notes and no title | Renders as a blank sheet with its permanent furniture drawn. **No empty state, no prompt, no illustration** (§0.3) |
| The last board is deleted | A new blank board is created and opened — FR-301's invariant holds at all times |
| A lot row beyond the visible budget | Still exists, still saves, still exports. Simply not drawn (FR-107) |
| A note positioned off the current page (legacy record) | Reachable via the render-time clamp; reappears intact when the device returns to a taller frame |

### 11.3 System Failure Modes

| Failure | Expected behaviour |
|---|---|
| IndexedDB write fails | Single-flight queue retries with exponential backoff. A polite `role="status"` toast says "Couldn't save — retrying." It **never clobbers a pending Undo** (FR-603) |
| IndexedDB unavailable or quota exceeded | The app remains usable for the session and surfaces the save failure. It must not silently discard work or appear to have saved |
| Service worker fails to install | The app still runs online. Offline launch is lost until the next successful install — a degradation, never a broken shell |
| A stale cache serves an old build | Stale-while-revalidate makes the next launch current. A missed `CACHE` bump costs **one** stale launch, not every launch after it (B36) |
| PDF export throws | A toast says so; no partial file is downloaded |
| `crypto.randomUUID` unavailable | RFC-4122 v4 fallback (§6.3) |
| `contenteditable="plaintext-only"` unsupported | Falls back to `true` so text still captures (FR-006) |
| `caretRangeFromPoint` and `caretPositionFromPoint` both unavailable | Caret falls back to the end of the text rather than failing to focus |

### 11.4 Concurrent / Race Conditions

| Race | Expected behaviour |
|---|---|
| **Soft keyboard resize mid-edit** | Mobile re-layout is deferred while a `contenteditable` inside `#board` holds focus, and re-applied on `focusout` (FR-208). **This is the only thing standing between the keyboard and a permanent write of a shrunken `rh`. It must not be weakened** |
| **Fold, unfold or rotate mid-edit** | Deferred by the same guard, then applied on commit. The change is postponed, never lost |
| **Mode flip (`matchMedia`) mid-gesture** | `applyMode` tears down selection, menu, gesture state and pointers. Nothing half-finished survives (FR-206) |
| **Second tap inside an open action window** | Dropped, not queued (FR-113) |
| **A new destructive action while an Undo is pending** | The prior Undo is finalized or cancelled — never two live windows |
| **Board switch with a pending Undo** | A note or lot Undo is finalized. A board-delete Undo is cross-board-safe and survives (B26) |
| **Debounced save racing a board switch** | The pending write must flush against the board it belongs to, never the newly opened one |
| **A drag that begins before the previous action's window closes** | The recognizer owns pointer state; the window drops the action, not the gesture |
| **Two rapid exports of the same board** | Each produces a byte-identical file (FR-405); neither is affected by the other |

**Section Status:** COMPLETE

---

## 12. Testing Strategy

*Addresses: "How would I test this?"*

### 12.1 Testability Assessment

| Requirement | Easy to test? | If no, why | Redesign needed? |
|---|---|---|---|
| FR-001–FR-005 capture | **Yes** | Genuine touch events over CDP; `test/mobile.js` already does this | No |
| FR-210 similarity transform | **Yes** | Resize the viewport between two aspect ratios and assert pairwise ratios between note centres are invariant. **This is the strongest kind of assertion in the suite: an invariant, not a value** | No |
| FR-404 completed items emit no text | **Yes** | Search the PDF bytes for the string. Already asserted | No |
| FR-405 byte-identical export | **Yes** | Export twice, compare buffers | No |
| FR-504/505/510 contrast | **Yes** | Compute WCAG luminance from the token values and assert the tables. A pure function over constants — the cheapest test in the suite | No |
| FR-501 no light theme | **Yes** | Assert `styles.css` contains no `prefers-color-scheme` block | No |
| FR-509 accent placement | **Partly** | Requires knowing each accent's ground. Testable by asserting the *rule* — no accent appears as a `color` on a `--board`/`--shelf`/`--note` element — via computed style over rendered elements | No |
| FR-513/515 fonts and marks | **Partly** | Font loading and glyph fallback are hard to assert directly. Test the observable proxies: `ASSETS` lists the files, no CDN URL exists, `GLYPH` values contain no character outside the drawn set | No |
| FR-514 band geometry vs new type | **Yes** | `test/mobile.js` already asserts band and lot geometry. A font change that moves the band **fails the suite**, which is the correct outcome | No |
| NFR-101 zero-delay capture | **Partly** | "No deliberate delay" is a code-path property, not a timing measurement. Assert the absence of a timer in the path plus a generous wall-clock ceiling | No |
| §9.1 colour sync points | **Yes, and currently untested** | Parse the four files, extract the colour literals, assert they match `:root`. **This is new work v2 must do** | No |
| §10.3 `EXPORT_GEO` vs CSS | **Partly** | The exporter cannot read CSS, so the test must restate the expected values a third time — which is the duplication itself. Assert screen and PDF *agree* on an observable (a cap-hitting note's wrap point) rather than comparing constants | **The duplication is the design problem. §18.4 names the fix** |
| NFR-102 cold launch ≤1s | **No — manual** | Requires the target device in airplane mode | No |

> Two entries above are the honest answers to the scaffold's fifth question.
> `EXPORT_GEO` is awkward to test **because the design is wrong** — a value
> restated in two files that cannot see each other. The test works around it; §18.4
> fixes it. Everything else is awkward only because it needs a real browser, which
> the suite already provides.

### 12.2 Test Approach per Feature

| Area | Where | Approach |
|---|---|---|
| Capture, gestures, band/lot geometry, keyboard guard | `test/mobile.js` | Genuine touch events over CDP — **never synthesized clicks**, because the bug this suite exists to catch lived in the browser's touch-to-mouse compatibility events (B27) |
| Selection grammar, rail, menus, PDF export | `test/desktop.js` | Real Chromium, pointer events |
| Delivery | `test/sw-update.js` | Serves its own mutable copy; **step 2 requires the bug to reproduce before step 3 demonstrates the fix**. If step 2 ever passes cleanly, the harness has stopped exercising the service worker and the suite is lying |
| **Contrast and token integrity** **[v2 — new]** | **`test/tokens.js`** | Pure Node, no browser. Parses `styles.css :root`, computes WCAG luminance, asserts every table in `UIUX §2`. Also asserts the four colour sync points match `:root` (§9.1) and that no `prefers-color-scheme` block survives |
| **Cross-device invariance** **[v2 — new]** | `test/mobile.js` | Place notes, capture pairwise centre ratios, resize across aspect ratios, assert invariance and that stored values are untouched (FR-210) |
| **Mobile categories** **[v2 — new]** | `test/mobile.js` | Touch-drag a card between categories, assert persistence, paging, and single-page pager suppression (FR-308) |

### 12.3 Test Data Requirements

| Need | Fixture |
|---|---|
| Legacy records | Boards with `rw`/`rh`/`scale`/`category` absent, seeded directly into IndexedDB |
| Aspect-ratio pairs | Z Fold cover (narrow-tall) and inner (near-square), plus portrait/landscape phone |
| Cap-hitting note | A note placed near the sheet's right edge with text long enough to wrap |
| Non-Latin text | A string outside CP1252, for FR-406 |
| Overflow | A category with more boards than one page holds |
| Completed items | One completed note and one completed lot line, for FR-404 |

### 12.4 Integration Test Scenarios

| # | Scenario | Asserts |
|---|---|---|
| IT-1 | Capture on a phone → fold to the inner display → verify arrangement → export | FR-001, FR-210, FR-402 |
| IT-2 | Create, complete, delete, undo, switch board, return | FR-109, FR-111, B26 |
| IT-3 | Author on desktop → reopen the same board on a phone → reopen on desktop | FR-210, FR-207 (no mutation across three frames) |
| IT-4 | Ship a `styles.css` change → deploy → cold-launch an installed PWA | FR-607, B36 |
| IT-5 | Sort boards on mobile → reopen on desktop → verify the rail agrees | FR-305, FR-308, FR-309 |
| IT-6 | Airplane mode: launch, capture, complete, export | US-009, FR-401 |

> **A suite which cannot fail is lying.** Run the mobile suite against the commit
> before the §D fixes and it reproduces the original capture failure in full. That
> is what these assertions are pinned to — keep them honest by checking they can
> still fail.

**Section Status:** COMPLETE

---

## 13. Success Metrics

There is one user and no telemetry (NFR-202), so every metric here is observed or
asserted, never collected.

| # | Metric | Target | How measured |
|---|---|---|---|
| SM-1 | **A thought reaches the page faster than it can be second-guessed** | No perceptible delay between tap and caret | NFR-101 assertion + use on the target device |
| SM-2 | **A board opened weeks later shows the same arrangement** | Exact, on any device the author owns | IT-3, and use |
| SM-3 | **Arrangement survives a fold** | Pairwise relative positions invariant | FR-210 assertion — the direct fix for PP1 |
| SM-4 | **The board is a place the author is glad to return to** | Subjective, and the author is the only judge | §0.4 held up against the built thing. **If it looks correct and feels like a productivity app, v2 failed** |
| SM-5 | **Zero accessibility regressions** | Every table in `UIUX §2` reproduces; NFR-301–310 hold | `test/tokens.js` |
| SM-6 | **A shipped change reaches the installed app on the next launch** | 100% | `pages.yml` post-deploy assertion + `test/sw-update.js` |
| SM-7 | **The constraint holds** | Zero dependencies, zero build steps, five app files | Inspection |

SM-4 is the one that matters and the one that cannot be automated. That is why
§0.3 is written as a list of failures rather than a list of goals: it is the only
form in which taste can be checked.

**Section Status:** COMPLETE

---

## 14. Scope Boundaries

### 14.1 In Scope (v2)

1. **The design system** — `UIUX.md` in full: dark-only palette, the surface
   ladder, per-surface ink, the edge rule, verified contrast throughout,
   Montserrat Alternates self-hosted, drawn symbols, the motion set, controls
   (FR-501–FR-517).
2. **Cross-device arrangement invariance** — the similarity transform, FR-210 and
   FR-211. Closes issues **#65** and **#75**.
3. **Board categories on mobile** — FR-308, FR-309. Closes issue **#74**.
4. **PDF font embedding** — FR-409, so the export is typographically the app's.
5. **Token and sync-point testing** — `test/tokens.js`, closing the §9.1 defect.
6. **The specification itself** — this document and `UIUX.md`, and the citation
   migration in Appendix C.

### 14.2 Out of Scope (and why)

| Not built | Reason |
|---|---|
| Accounts, sync, sharing, collaboration | P4, and there is no backend (§8). Adding one changes what the product is |
| Tags, folders, search, filters, auto-grouping | P2. Every one infers a relationship the person did not assert |
| Rich text, images, attachments, drawing | The data model is plain strings (§6.1), enforced at the paste boundary |
| Snapping, alignment guides, auto-layout | P2 and P3. Notes overlap freely; the person places them |
| Reminders, due dates, notifications, streaks | P4. The board makes no demands |
| Infinite canvas, pan, zoom | Boundedness is the feature — a page you can see all of |
| A framework, bundler, package manager, dependency | §17 |
| Settings, preferences, a theme switch | P4. One identity, not a choice to make |
| A light theme | §0.5. Retired in v2, not made optional |
| Analytics, telemetry, crash reporting | NFR-202 |
| Splitting the PDF exporter into its own file | Named and deferred — §18.4 |

**Section Status:** COMPLETE

---

## 15. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **FR-210 leaves visible unused sheet** when the aspect ratio changes sharply (a Z Fold cover screen is far narrower than the inner display) | High — it is a certainty of the maths | Medium | FR-211 makes that area live canvas. State the trade openly: v1 fills the sheet and breaks arrangement; v2 preserves arrangement and leaves margin. Issue #65 asks for the latter in the author's own words |
| R2 | **The new typeface moves the band**, regressing the B33→B38 chain | High | High | `UIUX §13.2`'s three measurements are a **gate**, and `test/mobile.js` already asserts band geometry — so a font change that moves it fails the suite (FR-514) |
| R3 | **PDF font embedding is the largest single item** and touches the most intricate code in the app | Medium | Medium | It is **Should**, not Must (FR-409). If it slips, the export keeps base-14 Helvetica and stays correct — only its typography is not the app's |
| R4 | **The five colour sync points diverge silently** | High, historically | Medium | `test/tokens.js` asserts them (§12.2). This is the direct fix for the §9.1 defect |
| R5 | **`EXPORT_GEO` drifts from `styles.css`** as the design system lands | High | High | Assert screen/PDF *agreement* on an observable rather than comparing constants (§12.1). §18.4 names the structural fix |
| R6 | **Drawn SVG marks read worse than glyphs at 16px** | Medium | Low | Marked impermanent (`UIUX §13.3`): a mark that fails is redrawn, not reverted to a code point |
| R7 | **Removing the light theme upsets a use case** — outdoors, bright light | Low | Medium | Accepted deliberately. P4 forbids the setting and §0.5 makes dark-only the identity. Revisit only if the author reports it in use |
| R8 | **The mobile category drag conflicts with the note-drag recognizer** | Medium | Medium | The list view is a separate surface from `#board`; the rail already proves the pattern by living outside it. FR-308 reuses `delayAction` rather than a bespoke timeout |
| R9 | **Scope creep from "full version upgrade"** | Medium | High | §14.1 is exhaustive. Anything not in it is v3 (§18.1) |
| R10 | **The device remains the only copy** | Certain | High | Stated plainly rather than mitigated. Export (FR-407) is the answer, and it is reachable from three places. §18.1 lists a backup path as anticipated future work |

**Section Status:** COMPLETE

---

## 16. Dependencies

### 16.1 Runtime dependencies

**None.** This is the product's defining constraint, not an accident (§17).

### 16.2 Platform capabilities depended upon

| Capability | Used for | If absent |
|---|---|---|
| IndexedDB | All persistence (FR-601) | The app cannot function. No fallback is planned |
| Service Worker + Cache API | Offline shell (FR-606) | App runs online only |
| Pointer Events | The gesture recognizer (FR-205) | The app cannot function |
| `matchMedia` | Mode detection (FR-205) | Would default to touch |
| `contenteditable="plaintext-only"` | Paste coercion (FR-006) | Falls back to `true` |
| `caretRangeFromPoint` / `caretPositionFromPoint` | Caret at the touch point (FR-003) | Falls back to end-of-text |
| `crypto.randomUUID` | Record ids (§6.3) | RFC-4122 v4 fallback |
| `interactive-widget=resizes-visual` | Keyboard guard (FR-208) | The JS guard alone still holds the layout |
| CSS custom properties, `transform`, `@font-face`, `woff2` | Rendering and typography | The app cannot function |
| `prefers-reduced-motion` | FR-516 | Motion would not be suppressed |

**Target:** current Chromium and Samsung Internet on Android (the foldable is the
primary device), and current Chromium/Firefox/Safari on desktop.

### 16.3 Development dependencies (never shipped)

| Tool | Purpose |
|---|---|
| Node 20 | Runs the three test scripts and `test/tokens.js` |
| `playwright` (latest, installed fresh, **no lockfile committed**) | Drives real Chromium |
| Python 3 `http.server` | Serves the repo root locally |
| GitHub Actions | CI (`ci.yml`) and Pages deploy with delivery assertion (`pages.yml`) |

### 16.4 Assets

Montserrat Alternates (SIL Open Font License), weights 400/600/800, Latin subset
`woff2` for the screen and `.ttf` for PDF embedding. **Committed to `fonts/`, not
fetched.**

**Section Status:** COMPLETE

---

## 17. Technical Constraints

> **Vanilla HTML/CSS/JS. No frameworks, no build step, no package manager, no
> dependencies, no backend.**

This is a hard constraint, not a preference, and it is load-bearing on the product
rather than the engineering:

- It is why the PDF exporter is **hand-rolled** (FR-401) — and why that exporter
  works offline by construction rather than by configuration.
- It is why the icons come from a dependency-free PNG writer (B1).
- It is why fonts are **self-hosted** (FR-513): a CDN font is a network dependency
  and an uncacheable hole in an offline-first shell.
- It is why anything requiring a compile step must instead be **computed once and
  committed as a literal** — including, per FR-409, the PDF font metrics.
- It is why there is **no subsetter**, so embedded font weights go in whole and
  NFR-108 budgets for it.

**Further constraints:**

| # | Constraint |
|---|---|
| TC-1 | Five files are the entire app: `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, plus `icons/` and `fonts/`. There is no `src/` tree |
| TC-2 | The repo root **is** the deployed site. `pages.yml` uploads it as-is |
| TC-3 | The device is the only copy. Export is the only way data leaves (R10) |
| TC-4 | No network call may exist outside `sw.js`'s cache revalidation |
| TC-5 | `app.js` is a single file. `DECISIONS.md` marks splitting §10.5 out as *impermanent* once it passes ~2,200 lines; it is now ~2,900 (§18.4) |
| TC-6 | There is no lint, typecheck or build command, because there is no toolchain to run one |

**Section Status:** COMPLETE

---

## 18. Evolution Strategy

### 18.1 Anticipated Future Features

| Feature | Likelihood | Impact on current design |
|---|---|---|
| A backup / restore path beyond PDF (JSON export-import) | **High** — R10 is the product's largest standing risk | Additive. Reads §6.1 shapes; needs no schema change. Must not become sync (P4) |
| Splitting the PDF exporter into its own file | High | Resolves §10.3's most fragile edge. Requires a second `<script>` — permitted; a bundler is not (§17) |
| Re-interrogating `ACTION_DELAY` | Medium | One constant. B18 explicitly invites it |
| Restoring the 24px title now the compartment is 340 wide | Medium | `UIUX §3`; B38 notes the constraint that forced 15px is gone but the call has not been made |
| Additional board categories beyond three | Low | `COPY` + the category union in §6.1. Paging already generalises |
| A second export format | Low | `COPY.export` is deliberately one word with no object noun. **The day a second format exists, Export must become a submenu with PDF as the leaf** |

### 18.2 Assumptions That May Become Invalid

| Assumption | If it breaks |
|---|---|
| **One user, one device, no sharing** | The entire product changes. §2.2, §8 and P4 all rest on this. This is not an extensibility point; it is the product's definition |
| **`ACTION_DELAY = 400ms` feels right** | Marked *impermanent* by B18. A felt value, tuned on the device, and re-interrogation is invited |
| **`NOTE_MIN_W = 60` is the narrowest useful column** | Marked *impermanent* by B39 |
| **`EXPORT_GEO` duplication is affordable** | Marked *impermanent* by B34, B37 and B38 — three rulings, unresolved. §18.4 |
| **The reference sheet is 900×1000** | Every proportion in the band, lot and export derives from it. Changing it invalidates the B33→B38 chain wholesale |
| **A single `app.js` is manageable** | TC-5. Already past the threshold `DECISIONS.md` named |
| **Dark-only suits every environment the author uses** | R7. Revisit from use, not from principle |
| **Montserrat Alternates has no variable version** | If one ships, three files become one and NFR-107 improves |

### 18.3 Migration Paths

**The migration strategy is that there are no migrations.**

New fields are **defaulted at the read site and never written back** (FR-605,
§6.4). A board written by any prior build opens correctly in any later one
without being rewritten. This is P3 applied to the schema: the record the person
committed is the record that persists.

Two consequences follow, and both are requirements:

- A v2 field must have a **safe default derivable without the record**
  (`category` → `unsorted`), or an explicit **render-time-only** accommodation
  (`rh` → `LEGACY_H` plus a clamp that is never written back).
- **No v2 code path may rewrite a record it merely read.** Only the gestures that
  already own writes may write.

### 18.4 Extensibility Points

| Point | Designed for extension |
|---|---|
| `COPY` | Every user-visible string. One key renames every site |
| `GLYPH` | Every symbol. One entry redraws every site |
| `delayAction()` | Every new committing action. **A new action must go through it, not a bespoke timeout** |
| Read-site defaulting | Every new field (§18.3) |
| The token layer | Every colour. `.on-dark`/`.on-light` extend the ladder without touching downstream rules |
| `app.js` §10.5 | **The intended split point.** Extracting the exporter is the named fix for §10.3's fragility and TC-5's file size |
| The recognizer's `isDesktop` branches | The only sanctioned place a grammar may differ. **A second code path is not an extensibility point; it is the failure mode this avoids** |

**Section Status:** COMPLETE

---

# AI Implementation Specification

*The following sections ensure any competent agent can build this without asking
clarifying questions.*

---

## 19. Tech Stack

*"No dependencies" is the stack. What follows pins the actual contract.*

### 19.1 Core Technologies

| Category | Technology | Version | Rationale |
|---|---|---|---|
| Language | JavaScript | **ES2020**, `'use strict'`, no transpilation | Runs as authored in every target browser. Optional chaining and nullish coalescing are available; anything newer is not assumed |
| Markup | HTML5 | — | One shell, two views |
| Styling | CSS | **Custom properties, `transform`, flexbox, `@media (hover/pointer)`** — no preprocessor | §17 |
| Persistence | IndexedDB | Native | `boards-db` / store `boards` |
| Offline | Service Worker + Cache API | Native | Cache-first, stale-while-revalidate |
| Typeface | Montserrat Alternates | 400 / 600 / 800 | SIL OFL, committed to `fonts/` |
| Framework | **None** | — | §17. Not a gap to fill |
| Build tool | **None** | — | §17. The repo root is the site |
| Package manager | **None for the app** | — | No `package.json` is committed |

### 19.2 Development Tools

| Tool | Version | Purpose |
|---|---|---|
| Node | **20** | Runs the test scripts |
| Playwright | **latest**, installed fresh per run | Drives real Chromium. No lockfile is committed — the app stays dependency-free (see `test/README.md`) |
| Python | **3.x** | `http.server` for local serving |
| GitHub Actions | `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5` | CI and deploy |

### 19.3 External Services

| Service | Purpose |
|---|---|
| GitHub Pages | Static hosting of the repo root |

**Nothing else.** No CDN, no font host, no API, no analytics endpoint (NFR-203).

**Section Status:** COMPLETE

---

## 20. Project Structure

### 20.1 Directory Tree

```
TheBoards/
├── index.html              # App shell: #board-view (+ #pane rail), #list-view, #menu, #toast
├── styles.css              # Tokens, board geometry, note component. Sectioned by § markers
├── app.js                  # Everything else. 12 numbered sections; read the header map first
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker: CACHE + ASSETS, stale-while-revalidate
├── icons/                  # 192 / 512 / maskable app icons
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
├── fonts/                  # [v2] Self-hosted Montserrat Alternates
│   ├── MontserratAlternates-Regular.woff2     # 400, screen
│   ├── MontserratAlternates-SemiBold.woff2    # 600, screen
│   ├── MontserratAlternates-ExtraBold.woff2   # 800, screen
│   ├── MontserratAlternates-Regular.ttf       # PDF embedding (FR-409)
│   └── MontserratAlternates-SemiBold.ttf      # PDF embedding (FR-409)
├── test/                   # Dev-only. Never served, never bundled
│   ├── README.md
│   ├── mobile.js
│   ├── desktop.js
│   ├── sw-update.js
│   └── tokens.js           # [v2] Contrast + sync-point assertions
├── .github/workflows/
│   ├── ci.yml              # Runs the suite on PR and push to main
│   └── pages.yml           # Deploys the root; asserts the deployed sw.js is this commit's
├── PRD.md                  # This document
├── UIUX.md                 # Rendering authority
├── DECISIONS.md            # v1 record (A1, B1–B43)
├── README.md
├── SECURITY.md
├── DESKTOP-MODE-PLAN.md    # Historical
└── TOP-BAND-PLAN.md        # Historical
```

**There is no `src/`, and adding one is a violation of TC-1.**

### 20.2 Key Files and Their Purposes

| File | Purpose |
|---|---|
| `app.js` | Persistence, layout, gestures, editing, undo, menus, PDF export, routing, boot. **Read the 12-section header map before searching** |
| `app.js` §10.5 | The hand-rolled PDF writer. The intended split point (§18.4) |
| `styles.css` `#board` | Declares `--gutter`/`--card-w`/`--card-l`/`--band-top`/`--card-h`/`--rule-y` once; every band and lot edge derives from them |
| `sw.js` `CACHE` | **The one string that says which build is live** |
| `DECISIONS.md` | Grep it before changing gesture, layout, band/lot or menu behaviour |

### 20.3 Naming Conventions

- **Files:** lowercase, no separators (`app.js`, `styles.css`). Docs are
  `SCREAMING-KEBAB.md`.
- **CSS custom properties:** `--kebab-case`, named for **what the thing is**
  (`--shelf`, `--furniture`), never for what it looks like (`--grey-200`).
- **CSS classes:** `.kebab-case`, semantic (`.note-text`, `.band-label`,
  `.pane-card`). State classes are adjectives: `.pressed`, `.tapped`,
  `.complete`, `.leaving`, `.swapping`.
- **DOM ids:** `#kebab-case`, one per singleton surface (`#board`, `#lot`,
  `#menu`, `#toast`, `#pane`).
- **JS constants:** `SCREAMING_SNAKE` for tuned values (`ACTION_DELAY`,
  `MOVE_THRESHOLD`, `NOTE_MIN_W`).
- **JS functions:** `camelCase`, verb-first for actions (`createNote`,
  `applyLayout`, `showUndo`), noun-first for derivations (`noteMaxW`,
  `renderX`, `lotH`).
- **Requirement ids:** `FR-nnn`, `US-nnn`, `NFR-nnn`, `SM-n`, `R-n`, `TC-n`,
  `IT-n`. Decision ids stay `A1` / `Bnn` in `DECISIONS.md`.

**Section Status:** COMPLETE

---

## 21. Commands

### 21.1 Development

```bash
# Serve the app (the repo root IS the site — there is nothing to build)
python3 -m http.server 8000        # then visit http://localhost:8000
```

There is no install step, no dev server, and no watch mode. Edit a file and
reload.

### 21.2 Testing

```bash
# One-time, somewhere on NODE_PATH. Not committed, no package.json.
npm install playwright

node test/mobile.js                # capture, gestures, band/lot geometry
node test/desktop.js               # selection grammar, rail, PDF export
node test/sw-update.js             # asserts a shipped change reaches an installed PWA
node test/tokens.js                # [v2] contrast tables + colour sync points

# Environment overrides
BOARDS_URL=http://localhost:8000/index.html   # default
CHROMIUM_PATH=/path/to/chromium               # else Playwright's own download
SW_TEST_PORT=8199                             # sw-update.js's throwaway server
```

All scripts exit non-zero on failure. **There is no way to run a single assertion
inside a script** — each file is one linear scenario; run the whole file. There
is no test runner and no framework.

### 21.3 Build & Deploy

```bash
# There is no build step.

# Deploy: push to main. .github/workflows/pages.yml uploads the repo root as-is
# and then asserts the deployed sw.js matches this commit.
git push origin main

# Force a deploy without inventing a commit:
#   Actions → "Deploy to Pages" → Run workflow

# The fastest way to answer "did my change actually reach anyone":
curl -s https://<pages-host>/sw.js | grep todo-boards-
```

### 21.4 Utilities

```bash
# There is no lint, format or typecheck command. The project has no toolchain.

# Before changing gesture, layout, band/lot or menu behaviour:
grep -n "B3[0-9]\|B4[0-9]" DECISIONS.md

# Confirm every spec citation still resolves:
grep -rn "PRD §\|UIUX §" app.js styles.css sw.js DECISIONS.md
```

**Section Status:** COMPLETE

---

## 22. Code Style & Examples

### 22.1 General Style Rules

- **Comments say *why*, never *what*.** The code says what. A comment that
  restates the line is noise; a comment naming the ruling that produced the line
  is the most valuable thing in the file.
- **Cite the decision.** Any non-obvious value or branch carries its `Bnn`,
  `FR-nnn` or issue number.
- **`app.js` is 12 numbered sections** with a map in the header. New code goes in
  its section, not at the end of the file.
- **`styles.css` is sectioned by `§` markers** matching `UIUX.md` numbering.
- **One recognizer, branching inline on `isDesktop`.** Never a parallel code path.
- **Derive, do not restate.** A geometric value is declared once and read
  everywhere (`styles.css`'s `#board` block is the model).
- **No `!important`, no inline styles except computed geometry** (`--hit`,
  `--note-max-w`, `--logical-*`, transforms) — values CSS cannot derive.
- Two-space indent. Single quotes in JS. Semicolons.

### 22.2 Example: a tuned constant

```js
// GOOD — the value carries its reason and its ruling
const MOVE_THRESHOLD = 16;   // px before a drag begins / long-press cancels (B29 —
                             // 10px was cancelling ordinary taps on a 7.6" foldable)
```

```js
// BAD — a magic number with a restating comment
const MOVE_THRESHOLD = 16;   // the move threshold
```

### 22.3 Example: a new committing action

```js
// GOOD — every committing action goes through the shared primitive (FR-113, B18)
function onArchiveTap(node, item) {
  delayAction(node, () => {
    archive(item);
    scheduleSave();
  });
}
```

```js
// BAD — a bespoke timeout. Now there are two action grammars, and the
// double-tap drop rule only applies to one of them.
function onArchiveTap(node, item) {
  setTimeout(() => { archive(item); scheduleSave(); }, 400);
}
```

### 22.4 Example: a new field

```js
// GOOD — defaulted at the read site, never written back (FR-605, §18.3).
// An older board opens correctly and is not rewritten.
const category = board.category || 'unsorted';
```

```js
// BAD — a migration. It rewrites a record the user did not touch, which is
// P3 violated at the schema level.
if (!board.category) { board.category = 'unsorted'; saveNow(board); }
```

### 22.5 Example: reading geometry

```js
// GOOD — coordinates go through the mapping helpers, always
const p = toLogical(e.clientX, e.clientY);
node.style.left = renderX(note) + 'px';
```

```js
// BAD — clientX read straight against note geometry. Breaks at every
// renderScale that is not 1, which is every desktop session.
if (e.clientX > note.x) { /* ... */ }
```

### 22.6 Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Tuned constant | `SCREAMING_SNAKE` + reason comment | `ACTION_DELAY = 400` |
| Derivation | `camelCase` noun-first | `noteMaxW(note)` |
| Action | `camelCase` verb-first | `createNote()`, `showUndo()` |
| CSS surface token | `--noun` for what it is | `--shelf`, not `--grey-400` |
| CSS state class | `.adjective` | `.pressed`, `.complete` |
| User-visible string | A key in `COPY` | `COPY.boards` |
| Symbol | A key in `GLYPH` | `GLYPH.export` |

**Section Status:** COMPLETE

---

## 23. Git Workflow

### 23.1 Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature / release work | `TheBoards_<version>-<Topic>` | `TheBoards_v2-UIUX-DesignOverhaul-FeatureReleases` |
| Agent-authored work | `claude/<topic>-<suffix>` | `claude/boards-v2-prd-design-s3jchd` |
| Dependency bumps | `dependabot/...` | automatic |

`main` is the deployed branch. **A push to `main` is a deploy** (TC-2).

### 23.2 Commit Message Format

**Subjects are short, imperative, and describe the outcome — not the mechanism —
with the driving issue number(s) in parentheses.**

```
Wrap note text at the sheet's right edge (issue #53)
Deselect before creating, and select many with shift (issues #54, #55)
Specify the product and give the board an identity
```

Not `refactor: update noteMaxW calculation`. The subject says what the app now
does, in the voice of someone describing the app rather than the diff. There is
no `type:` prefix convention.

**Most work traces to a GitHub issue — check for one before assuming a change is
unscoped.**

### 23.3 Pull Request Process

1. Branch from `main`.
2. Commit with a subject per §23.2.
3. Push and open a PR. `ci.yml` runs all four test scripts on every PR.
4. **If the change touches `app.js`, `styles.css`, or any precached asset, bump
   `CACHE` in `sw.js` in the same PR** (FR-607).
5. Merge to `main`. `pages.yml` deploys the root and then asserts the deployed
   `sw.js` matches the commit.
6. **A silent Pages failure is a shipped bug, not a non-event.** This has happened
   once: two merges landed with no deploy at all.

### 23.4 Protected Files (Never Auto-Modify)

- `.github/workflows/pages.yml` — the delivery assertion. Weakening it removes the
  only check that a change reached anyone.
- `DECISIONS.md` existing entries — **append only.** A ruling is superseded by a
  later ruling, never edited away.
- `sw.js`'s stale-while-revalidate handler — it is the net under a missed bump
  (B36).
- `app.js`'s layout-deferral guard (FR-208) — the only thing between the soft
  keyboard and a permanent bad write.

**Section Status:** COMPLETE

---

## 24. AI Agent Boundaries

### 24.1 ALWAYS DO (Safe to Proceed)

- [ ] **Read `DECISIONS.md` before changing gesture, layout, band/lot or menu
      behaviour.** A prior fix in that area very likely already ruled out the
      approach being considered — the band alone has been ruled on five times,
      each correcting a regression the previous ruling caused.
- [ ] **Bump `CACHE` in `sw.js`** on every shipped change to `app.js`,
      `styles.css`, or any precached asset.
- [ ] Route every new committing action through `delayAction()` (§22.3).
- [ ] Default new fields at the read site (§22.4).
- [ ] Read coordinates through `toLogical` / `renderX` / `renderY` (§22.5).
- [ ] Put new code in its numbered `app.js` section, and new CSS under its `§`
      marker.
- [ ] Write comments that say **why**, citing the ruling or issue (§22.1).
- [ ] Run all four test scripts before proposing a change as done.
- [ ] Add a new `B`-numbered entry to `DECISIONS.md` for any UI or behaviour
      judgment call this document does not already cover.

### 24.2 ASK FIRST (Require Human Approval)

- [ ] Changing any value marked *impermanent* (`ACTION_DELAY`, `NOTE_MIN_W`,
      `EXPORT_GEO`'s duplication) — the interrogation is invited, but the call is
      the author's.
- [ ] Changing the coordinate law, `LOGICAL_*` derivation, or anything that could
      cause a stored value to be rewritten. **P3 is at stake.**
- [ ] Changing the reference sheet's 900×1000 geometry — it invalidates the
      B33→B38 chain wholesale.
- [ ] Adding or removing a menu item, or changing menu order.
- [ ] Adding anything to the motion set (§8 of `UIUX.md` is closed).
- [ ] Splitting `app.js` (§18.4 names the split point; the timing is a judgment
      call).

### 24.3 NEVER DO (Hard Stops)

- [ ] **Never add a dependency, framework, bundler, package manager or build
      step.** §17. This is the product's defining constraint.
- [ ] **Never add a backend, a network call, or any third-party origin** — no CDN,
      no font host, no API, no analytics.
- [ ] **Never add a setting, preference, toggle or feature flag.** P4, §9.3.
- [ ] **Never intercept, shadow or disable the History API back gesture.** B9.
- [ ] **Never weaken the layout-deferral guard.** FR-208, §23.4.
- [ ] **Never migrate a record on read.** §18.3.
- [ ] **Never re-clamp or rewrite committed coordinates on a layout change.**
      FR-207.
- [ ] **Never create a second code path for desktop.** FR-205, §18.4.
- [ ] **Never distinguish a state by colour alone.** FR-511.
- [ ] **Never use synthesized clicks in `test/mobile.js`** — the bug the suite
      exists to catch lives in the browser's touch-to-mouse compatibility events.
- [ ] **Never commit secrets, tokens or credentials.** There is nothing to
      authenticate to, so any such string is by definition wrong.
- [ ] **Never edit or delete an existing `DECISIONS.md` entry.** Append only.
- [ ] **Never push directly to `main`** without a PR and green CI.

### 24.4 Security Boundaries

- No data leaves the device except through a user-initiated export (NFR-201).
- Note text is never interpreted as markup (NFR-205).
- `sw.js` runtime-caches **same-origin `basic` responses only** — never widen this.
- No `eval`, no `new Function`, no dynamic script injection.
- The app must remain fully functional with no network, which is also its
  strongest security property: there is no channel to attack.

**Section Status:** COMPLETE

---

## Appendix A: Traceability Matrix

| Source | User Story | Requirement | Acceptance |
|---|---|---|---|
| P1 · capture precedes structure | US-001, US-012 | FR-001–FR-005, FR-113 | NFR-101 |
| P2 · relationships asserted | US-002 | FR-009, FR-010 | §14.2 |
| P3 · positions permanent | US-003 | FR-207, FR-210, FR-605 | IT-3, SM-2, SM-3 |
| P4 · zero cognitive tax | US-009, US-010 | FR-301, FR-302, §9.3 | §0.3 |
| P5 · work performed stays visible | US-004 | FR-109, FR-404 | IT-2 |
| §0.4 · calm water, dark, notes lit | US-006 | FR-501–FR-517 | SM-4, SM-5 |
| **Issue #65 / #75** · fold breaks arrangement | **US-003** | **FR-210, FR-211** | **IT-1, IT-3, SM-3** |
| **Issue #74** · categories on mobile | **US-007** | **FR-308, FR-309** | **IT-5** |
| Issue #43 · export | US-008 | FR-401–FR-410 | IT-6 |
| B36 · delivery ≠ correctness | US-009 | FR-607 | IT-4, SM-6 |
| B7 / B23 · hit floors | US-011 | §6 of `UIUX.md` | NFR-304 |
| B13 / B26 · undo | US-005 | FR-111, FR-603 | IT-2 |
| PP5 · unverified design values | US-006 | FR-504, FR-505, FR-508, FR-509 | `test/tokens.js` |
| §9.1 · colour sync points | — | §12.2 `test/tokens.js` | R4 |

## Appendix B: Five Pre-Coding Questions Checklist

- [x] **What will likely change?** → §9 Change Analysis. Colour tokens, timing
      constants and copy are config; geometry and the coordinate law are
      deliberately expensive. §9.3: no feature flags, ever.
- [x] **Should this exist once or everywhere?** → §10.1. One recognizer, one
      action primitive, one coordinate mapping, one ink binding. The one knowing
      duplicate is `EXPORT_GEO`, and §18.4 names its fix.
- [x] **What's the source of truth?** → §10.2. IndexedDB for content, `sw.js`'s
      `CACHE` for which build is live, `styles.css :root` for colour — with four
      unenforced copies that §12.2 now tests.
- [x] **What breaks if I change this?** → §10.3. The most fragile edge is
      `EXPORT_GEO`; the highest-stakes is the coordinate law, because P3 is at
      stake.
- [x] **How would I test this?** → §12. Two requirements are awkward to test, and
      §12.1 says honestly which of them is awkward because the design is wrong
      (`EXPORT_GEO`) rather than merely because it needs a browser.

## Appendix C: Citation Migration

The codebase carries ~20 `PRD §x` / `UIUX §x` citations written against documents
that did not exist. **`UIUX §x` citations need no change** — `UIUX.md` §1–§12 were
numbered to preserve their v1 meanings exactly (`UIUX §17` tabulates them).

`PRD §x` citations move, because v2 adopts the 25-section structure. Re-point them
mechanically:

| Cited as | Meant | Now |
|---|---|---|
| `PRD §1` | the five principles | **`PRD §0.2`** |
| `PRD §3` | platform, offline, build constraints | **`PRD §17`**, `§19` |
| `PRD §4` | the data model and the write path | **`PRD §6`**, `FR-601`–`FR-605` |
| `PRD §5` | layout, scale, touch | **`PRD §7.3`**, `FR-201`–`FR-211` |
| `PRD §5.1` | one logical page, one render scale; never pans or zooms | **`FR-201`, `FR-202`** |
| `PRD §5.3` | the 44px touch floor | **`UIUX §6`**, `NFR-304` |
| `PRD §6.1` | the four permanent anchors | **`FR-101`** |
| `PRD §6.2` | note capture; the width cap | **`FR-001`**, **`FR-007`** (the predetermined cap was superseded by B39) |
| `PRD §6.3` | move, scale, stack | **`FR-008`–`FR-010`** |
| `PRD §6.4` | complete / scratch-out | **`FR-109`** |
| `PRD §6.5` | the Parking Lot | **`FR-106`, `FR-107`** |
| `PRD §6.6` | the menu | **`FR-110`** (order superseded by A1, then B43) |
| `PRD §6.7` | boards, list, rail | **`FR-301`–`FR-307`** |
| `PRD §6.8` | offline / service worker | **`FR-606`** |
| `PRD §7` | export | **`FR-401`–`FR-410`** |
| `PRD §8.1` | shipping discipline | **`FR-607`**, `§23.3` |

> Re-pointing is safe precisely because this table exists. It is the reason v2
> could adopt a different section structure without orphaning the code's comments
> a second time — which was PP4, the failure this document was written to end.

---

## Final Summary

**PRD Completion Date:** 2026-08-12

**Sections Completed:** 25/25

**Taste Layer:** Vision & Principles — COMPLETE

**Anti-Accidental-Architecture:** 4/4 (Change Analysis, Architecture Decisions,
Edge Cases, Testing Strategy)

**AI Implementation:** 6/6 (Tech Stack, Project Structure, Commands, Code Style,
Git Workflow, AI Boundaries)

**Key Requirements:**
- **FR-210** — cross-device arrangement is a similarity transform. Supersedes
  B40's accepted anisotropy and closes issues #65 / #75.
- **FR-505 / FR-506** — every adjacency separates by fill or by an edge drawn in
  the surface's own ink. One rule closes all twelve.
- **FR-308** — board categories reach mobile, the primary path.

**Primary User Stories:**
- **US-003** — return to a board and find it as I left it.
- **US-006** — keep the board dark and calm.
- **US-001** — capture a thought without deciding what it is.

**Known Gaps:**
- **FR-409** (PDF font embedding) is **Should**, not Must. If it slips the export
  stays correct and only its typography is not the app's.
- **`EXPORT_GEO` remains a knowing duplicate** of `styles.css` geometry. Marked
  impermanent three times in `DECISIONS.md`; §18.4 names the fix and §12.1 states
  plainly that its awkward test is a symptom of the design, not the test.
- **SM-4 cannot be automated.** Whether the board feels like a place worth
  returning to is the author's judgment, and §0.3 is the only form in which it can
  be checked.
- **`UIUX §13.2`'s band measurements are a gate, not a result.** They require the
  font in hand and cannot be computed from this document.

**Next Steps:**
1. Review this document and `UIUX.md` against §0.3 — does anything here feel
   wrong?
2. Acquire and subset Montserrat Alternates; run the `UIUX §13.2` measurements.
3. Write `test/tokens.js` first — it makes every design requirement in §4.6
   falsifiable before any of it is built.
4. Implement in the order FR-501→517, FR-210/211, FR-308/309, FR-409.
