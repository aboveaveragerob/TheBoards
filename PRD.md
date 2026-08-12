# Product Requirements Document: To-Do Boards v2 — the design system

**Version:** 2.0 · **Status:** specified, implementation not started
**Companion documents:** `UIUX.md` (rendering authority) · `DECISIONS.md` (the decision record)

---

**What v2 is:** the app gets an identity. A dark palette with verified contrast, a
typeface of its own, drawn marks instead of borrowed glyphs, and one control
grammar. Nothing about what the app *does* changes.

**What this document is not.** It does not restate behaviour that already ships.
That behaviour is recorded in `DECISIONS.md` (A1, B1–B44) and in the code's own
comments, and a second copy with nothing keeping it honest would be a defect, not
a specification — the same defect §7 exists to close for colour.

| Document | Authority |
|---|---|
| **`PRD.md`** (this) | What v2 must be, as requirements that can fail |
| **`UIUX.md`** | How it renders and behaves under the hand. **Wins on any rendering question** — A1 already resolved one such conflict that way |
| **`DECISIONS.md`** | Why the app does what it does, and what has already been tried. Binding, append-only, still where new rulings go |

---

## 1. Vision & Principles

### 1.1 Product vision

**A fixed, bounded page where any thought becomes a framed, movable, scalable
note the instant it is typed — and where structure is asserted afterwards, by
where things sit and how big they are.**

Every other tool makes you decide what a thought *is* before it will let you
write it down: which list, which project, which tag. That decision costs more
than the thought did. This app takes the thought first and lets meaning arrive
later, spatially, from the person rather than from the software.

### 1.2 Design principles (non-negotiable)

| # | Principle | Example violation |
|---|---|---|
| P1 | **Capture precedes structure** | Any mode, dialog, picker or delay between the intent to write and the caret |
| P2 | **Relationships are asserted, not inferred** | Auto-grouping, tag suggestions, snapping, alignment guides, sorting by anything the person did not choose |
| P3 | **Positions are permanent — a committed position is data** | Re-clamping notes on resize; rewriting stored `x`/`y` because the viewport changed |
| P4 | **Zero cognitive tax** | Settings, accounts, sync state, onboarding, a theme switch |
| P5 | **Work performed stays visible** | Completion that deletes, hides, archives or moves an item out of its place |

And the governing design law, which `UIUX.md` implements:

> **If you have to think about the interface, it failed. Every pixel earns its
> place.**

### 1.3 What would feel wrong

If v2 ships with any of these it has failed, regardless of technical correctness:

- A **loading state, spinner or skeleton** anywhere. The device is the only copy.
- **Anything that congratulates the person.** Completing something is a record,
  not an achievement.
- A **settings screen.** Even one toggle. P4 is not "few settings"; it is none.
- The board feeling **bright, clinical, or like a productivity SaaS**.
- **Decoration that does no job** — a gradient, a radius, an animation present
  because interfaces have those.
- Notes that **move themselves.**
- An **empty board that looks broken.** A blank page is the correct state of a
  blank page.

### 1.4 North star

- **Feel:** peaceful fondness. A place you are glad to return to.
- **Imagery:** calm water, at depth and at dusk, not noon glare. That is why the
  palette is dark. **The one lit thing in the room is the note you just wrote.**
- **Personality:** quiet, exact, unhurried, completely uninterested in your
  attention.
- **What this does not license:** decoration. Peace comes from restraint, depth
  and consistency.

### 1.5 Taste decisions

| Decision | Choice | Rationale |
|---|---|---|
| Theme | **Dark only.** The light/dark pair (B16) is retired | P4 forbids the setting; a theme is a question the app must not ask |
| The note's colour | The brightest surface in the app | It is the only thing the person *placed* |
| Destructive colour | `--danger` is the only warm hue | Everything else is cool water |
| Symbols | **Drawn, not typed** (`UIUX §13.3`) | A symbol asked to render identically everywhere in one voice is not text |
| The page's edge | **Drawn** where the desk is visible | A bounded page is the product's central claim |
| Export | **Paper-light, always** | It is a reference sheet *for paper* |
| Motion | A closed set of five transitions. It does not grow | Nothing else has earned its place |

---

## 2. Why v2 exists

| # | Problem | Evidence |
|---|---|---|
| PP1 | **There is no visual identity.** Nothing about the surface says what the app is for or how it should feel | §1.4 has never been implemented |
| PP2 | **Design values were never verified.** v1's palette specifies rules and hairlines against surfaces they are not drawn on | `--line #717575` is **1.64:1** on the sheet it rules across, and **1.99:1** on the shelf |
| PP3 | **Colour is restated in five places and checked in none** | `styles.css :root`, `index.html`'s two `theme-color` metas, `manifest.json`'s two colour fields, and `app.js`'s `PDF_PAPER`/`PDF_INK`/`PDF_SHADE` floats |
| PP4 | **`UIUX.md` never existed.** ~15 `UIUX §x` citations in `app.js` and `styles.css` have pointed at nothing since the first commit | `grep -rn "UIUX §" app.js styles.css` |

PP4 is closed by `UIUX.md` existing. §1–§12 of it were numbered to preserve the
meanings those citations already assume, so **not one citation moves.**

---

## 3. Scope

### 3.1 In scope

1. **The design system** — `UIUX.md` in full: dark-only palette, the surface
   ladder, per-surface ink, the edge rule, verified contrast, Montserrat
   Alternates self-hosted, drawn marks, the motion set, the control grammar.
   Stated as requirements in §6.
2. **Token and sync-point testing** — `test/tokens.js`, closing PP3.
3. **`UIUX.md` itself**, closing PP4.

### 3.2 Out of scope

| Not built | Reason |
|---|---|
| Accounts, sync, sharing, collaboration | P4, and there is no backend |
| Tags, folders, search, filters, auto-grouping | P2 — each infers a relationship the person did not assert |
| Rich text, images, attachments, drawing | The data model is plain strings (§4) |
| Snapping, alignment guides, auto-layout | P2 and P3 |
| Reminders, due dates, notifications, streaks | P4 |
| Infinite canvas, pan, zoom | Boundedness is the feature |
| A framework, bundler, package manager, dependency | §5 |
| Settings, preferences, a theme switch, a feature flag | P4. A flag is a setting with a longer half-life |
| A light theme | §1.5. Retired, not made optional |
| Analytics, telemetry, crash reporting | Nothing leaves the device |

### 3.3 Deferred, with reason

These are real and are **not** abandoned. They are separate changes, and pinning
them to the design system would gate a palette on unrelated work.

| Deferred | Why it is not here |
|---|---|
| **The fold/rotate arrangement bug — issues #65, #75** | The highest-value change outstanding, and unrelated to colour. v1 maps `x` by `LOGICAL_W/rw` and `y` by `LOGICAL_H/rh` — two ratios — while sizing on the width ratio alone; when those diverge, which is what folding does, arrangement distorts. B40 named and accepted this. The fix is a similarity transform (one ratio for both axes and for size), and it supersedes B40 — which makes it its own ruling, its own branch and its own PR |
| **PDF font embedding** | ~150KB per exported file, in the most intricate code in the app, so that a printed reference sheet matches the app's typography. Worth doing; not worth blocking a recolor on. The export keeps base-14 Helvetica and stays correct |
| **Board categories on mobile** | **Already shipped** — PR #79, issue #74, ruled B44 |

---

## 4. Data model

```
Board  { id, createdAt, updatedAt, title, components, requirements,
         notes[], parkingLot[], category, catStamp }

Note   { id, text, x, y, rw, rh, scale, state }

LotItem{ id, text, state }
```

`state` is `active` or `complete`. `text` is a plain string in every case.
`category` is `todo` | `idea` | `unsorted`; `catStamp` records when it was set.

**Four permanent regions** exist on every board — Title, Components,
Requirements, Parking Lot. They cannot be created, moved, resized or deleted.

| Field | Constraint |
|---|---|
| `id` | UUID; `crypto.randomUUID()` where available, RFC-4122 v4 fallback otherwise |
| `text` | Plain string. A record whose `text.trim()` is empty does not persist |
| `x`, `y` | Numbers in the authoring frame's logical units. **Never mutated by a layout change** |
| `rw`, `rh` | The `LOGICAL_W`/`LOGICAL_H` the note was last written against |
| `scale` | 0.5–2.0 as authored. The frame multiplier is applied at render, not stored |
| `category` | Defaulted at the read site to `unsorted`. **Never migrated on disk** |

Two structural facts carry product meaning:

- **A lot item has no `x`/`y`.** It is an ordered line, not a spatial object —
  which is why lot lines are never framed (`UIUX §4.4`).
- **`rw`/`rh` are the reference frame a note was authored against**, not a
  position. Stored `x`/`y` are never mutated; rendering maps them.

**New fields are defaulted at the read site and never written back.** A board
written by any prior build opens in any later one without being rewritten. That
is P3 applied to the schema, and it is the required pattern for any field v2
adds — including every one in §6.

---

## 5. Constraints

> **Vanilla HTML/CSS/JS. No frameworks, no build step, no package manager, no
> dependencies, no backend.**

A hard constraint, and load-bearing on the product rather than the engineering:

- It is why the PDF exporter is hand-rolled, and why it works offline by
  construction rather than by configuration.
- It is why fonts are **self-hosted** (FR-513): a CDN font is a network
  dependency and an uncacheable hole in an offline-first shell.
- It is why anything needing a compile step is instead **computed once and
  committed as a literal**.

| # | Constraint |
|---|---|
| C1 | Five files are the entire app: `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, plus `icons/` and `fonts/`. There is no `src/` tree |
| C2 | The repo root **is** the deployed site |
| C3 | No network call may exist outside `sw.js`'s cache revalidation |
| C4 | `sw.js`'s `CACHE` is bumped on every shipped change to a precached asset. It is the one string that says which build is live |
| C5 | There is no lint, typecheck or build command, because there is no toolchain to run one |

---

## 6. Requirements — the design system

Specified in full in `UIUX.md`; stated here as requirements that can fail.

| ID | Requirement | Acceptance criteria | Pri |
|---|---|---|---|
| FR-501 | The app is dark-only; the light `:root` and the `prefers-color-scheme` block are **removed, not overridden** | No light-theme declaration remains in `styles.css` | Must |
| FR-502 | Every surface draws from the six-value ladder in `UIUX §2.2` | No colour literal outside the token set | Must |
| FR-503 | Ink is bound per surface, not per app; `--line` is deleted | `.on-dark`/`.on-light` rebind `--ink`/`--ink-a`; downstream rules read `var(--ink)` unchanged | Must |
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
| FR-517 | Controls share one tactile signature — offset shadow plus press-translate — across all four species | Primary, selection, pager, bare rows | Must |
| FR-518 | `EXPORT_GEO.radius` tracks the CSS radius (2 → 3) | Verified against `styles.css` | Must |

**Accessibility** is specified as behaviour in `UIUX §12` and is not restated
here. The target is WCAG 2.2 AA; FR-504/505/510 are the parts a test can prove.

---

## 7. Verification

**`test/tokens.js` is written first.** It makes every requirement in §6 falsifiable
before any of it is built, it needs no browser, and it is the only part of this
specification that cannot rot.

| What | How |
|---|---|
| FR-504 / 505 / 508 / 510 | Parse `styles.css :root`, compute WCAG relative luminance, assert every table in `UIUX §2`. A pure function over constants |
| FR-501 | Assert no `prefers-color-scheme` block survives in `styles.css` |
| **PP3 — the five colour sync points** | Parse `styles.css`, `index.html`, `manifest.json` and `app.js`; assert the colour literals agree with `:root`. **This is new work and the direct fix for PP3** |
| FR-509 | Assert the rule rather than each case: no accent appears as a `color` on a `--board`/`--shelf`/`--note` element |
| FR-513 / 515 | Assert the observable proxies: `ASSETS` lists the font files, no CDN URL exists, `GLYPH` values contain no character outside the drawn set |
| FR-514 | `test/mobile.js` already asserts band and lot geometry, so a typeface that moves the band **fails the suite** — the correct outcome |
| FR-516 / 517 | `test/desktop.js`, against computed style |

The three existing suites (`mobile.js`, `desktop.js`, `sw-update.js`) must pass
unchanged; this release changes how the app looks, not what it does.

> **A suite which cannot fail is lying.** `sw-update.js`'s step 2 requires the bug
> to reproduce before step 3 demonstrates the fix. If step 2 ever passes cleanly,
> the harness has stopped exercising the service worker.

---

## 8. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **The new typeface moves the band**, regressing the B33→B38 chain | High | High | `UIUX §13.2`'s three measurements are a **gate**, and `test/mobile.js` already asserts band geometry (FR-514) |
| R2 | **The five colour sync points diverge silently** | High, historically | Medium | `test/tokens.js` asserts them (§7). The direct fix for PP3 |
| R3 | **`EXPORT_GEO` drifts from `styles.css`** as the design system lands | High | High | Assert screen/PDF *agreement* on an observable rather than comparing constants. `DECISIONS.md` marks the duplication impermanent three times (B34, B37, B38); splitting the exporter out of `app.js` is the structural fix, and is not this release |
| R4 | **Drawn SVG marks read worse than glyphs at 16px** | Medium | Low | Impermanent (`UIUX §13.3`): a mark that fails is redrawn, not reverted to a code point |
| R5 | **Removing the light theme upsets a use case** — outdoors, bright light | Low | Medium | Accepted deliberately. P4 forbids the setting. Revisit from use, not from principle |
| R6 | **A missed `CACHE` bump** means the recolor never reaches the installed app | Medium | High | C4, and `pages.yml` asserts the deployed `sw.js` matches the commit |

---

## Appendix: citation migration

The codebase carries `PRD §x` / `UIUX §x` citations written against documents that
did not exist when they were written.

**`UIUX §x` citations need no change.** `UIUX.md` §1–§12 were numbered to preserve
their meanings exactly (`UIUX §17` tabulates them).

**`PRD §x` citations** were written against a v1 numbering that never shipped as a
file. Most of them are rendering or behaviour questions, and they resolve to the
documents that actually own those questions:

| Cited as | Meant | Resolves to |
|---|---|---|
| `PRD §1` | the five principles | **`PRD §1.2`** |
| `PRD §3` | platform, offline, build constraints | **`PRD §5`** |
| `PRD §4` | the data model and the write path | **`PRD §4`** |
| `PRD §5`, `§5.1` | layout, scale, one page that never pans or zooms | **`UIUX §3`, `§11`** |
| `PRD §5.3` | the 44px touch floor | **`UIUX §6`** |
| `PRD §6.1` | the four permanent regions | **`PRD §4`** |
| `PRD §6.2` | note capture; the width cap | **`UIUX §5`** (capture), **`B39`** (the cap, which superseded the 405/45% rule) |
| `PRD §6.3` | move, scale, stack | **`UIUX §5`** |
| `PRD §6.4` | complete / scratch-out | **`UIUX §4.3`** |
| `PRD §6.5` | the Parking Lot | **`UIUX §4.4`** |
| `PRD §6.6` | the menu | **`UIUX §7`** (order superseded by A1, then B43) |
| `PRD §6.7` | boards, list, rail | **`UIUX §10`** |
| `PRD §6.8` | offline / service worker | **`PRD §5`**, `B36` |
| `PRD §7` | export | **`UIUX §15`**, `B34` |
| `PRD §8.1` | shipping discipline | **`PRD §5` C4**, `B36` |

Re-pointing is safe because this table exists. Updating the comments themselves is
a change to `app.js` and `index.html`, so it rides with the first release that
touches them — and takes a `CACHE` bump with it (C4).
