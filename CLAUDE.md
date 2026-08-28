# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TheBoards — **To-Do Boards**: a spatial, offline-first PWA. A fixed, bounded
page where any thought becomes a framed, movable, scalable note the instant
it is typed; structure is asserted *after* capture by where things sit and
how big they are. Vanilla HTML/CSS/JS. **No frameworks, no build step, no
package manager, no dependencies, no backend.** All data lives client-side in
IndexedDB. Keep it that way — do not introduce a bundler, a framework, or a
server unless the user explicitly asks for one.

## Commands

Serve and open:
```
python3 -m http.server 8000   # then visit http://localhost:8000
```

Run the regression suite (dev-only; not shipped). Each script drives a real
Chromium via Playwright and exits non-zero on failure — there is no test
runner/framework, just three standalone Node scripts:
```
npm install playwright              # somewhere on NODE_PATH; not committed, no package.json
node test/tokens.js                 # the design contract: UIUX §2's tables recomputed from the shipped hexes (no browser needed)
node test/mobile.js                 # touch capture, gesture recognizer, band/lot geometry
node test/desktop.js                # click/double-click/drag selection grammar, rail, PDF export
node test/sw-update.js              # asserts a shipped change actually reaches an installed PWA
```
Env overrides: `BOARDS_URL` (default `http://localhost:8000/index.html`),
`CHROMIUM_PATH`, `SW_TEST_PORT` (default 8199, for `sw-update.js`'s own
throwaway server). There is no way to run a single assertion inside a
script — each file is one linear scenario; run the whole file.

There is no lint/build/typecheck command — the project has none.

## Shipping discipline (do this on every app.js/styles.css change)

`sw.js`'s `CACHE` constant (`todo-boards-v<N>`) is the one string that says
which build is live — **bump it on every shipped change to `app.js` or
`styles.css`**. The service worker only re-installs when its own bytes
change; missing the bump means the fetch handler's stale-while-revalidate
serves a stale build until the *next* deploy bumps it. `.github/workflows/pages.yml`
deploys the repo root as-is (no build step) to GitHub Pages on push to `main`
and then curls the deployed `sw.js` to assert it matches the commit — a
silent Pages failure is treated as a shipped bug, not a non-event (this
happened once: two merges landed with no deploy at all).

## Architecture

Five files are the entire app; there is no `src/` tree:

| File | Role |
|---|---|
| `index.html` | App shell: `#board-view` (the one scaled logical page + desktop `#pane` rail) and `#list-view` (board list), plus transient `#menu`/`#toast`. |
| `styles.css` | Design tokens (dark-only: the `UIUX §2.2` ladder, ink rebound per surface via `.on-dark`/`.on-light`), board geometry, note component. Sectioned by `§` markers matching the PRD/UIUX spec numbering. |
| `app.js` | Everything else — persistence, layout/scale-to-fit, gesture recognizer, editing/drag/pinch/z-order, undo, long-press/context menu, PDF export, board list + routing, boot/SW registration. Organized into 12 numbered sections (see the header comment at the top of the file) — read that map before searching blind in a 130KB single file. |
| `manifest.json` / `sw.js` | PWA manifest + stale-while-revalidate offline service worker (`CACHE`/`ASSETS`, see above). |
| `icons/` | 192/512/maskable app icons. |

Key architectural facts:

- **One logical page, one render scale.** The whole board is a fixed logical
  coordinate space (`LOGICAL_W`/`LOGICAL_H`, mobile: viewport-derived per
  B32; desktop: derived per B20) rendered via a single `transform: scale()`
  (`renderScale`/`offX`/`offY`). Note positions/sizes are stored in that
  logical space and converted with `toLogical`/`renderX`/`renderY` — never
  read `clientX`/`clientY` directly against note geometry.
- **A single custom gesture recognizer** (`onPointerDown`/`Move`/`Up`, §7)
  drives tap-to-capture, drag-to-move, pinch-to-scale (mobile), and
  click-to-select/drag-to-resize/double-click-to-edit (desktop, gated by
  `isDesktop`, a live `matchMedia` switch). There is no separate desktop
  code path elsewhere — `isDesktop` branches inline throughout `app.js`.
  Mobile taps are dispatched as genuine touch events, not synthesized
  clicks, because a real bug lived specifically in the browser's
  touch-to-mouse compatibility events (B27b) — keep test taps that way.
- **IndexedDB is the only persistence** (`boards-db` / `boards` store, see
  §2). Writes are debounced (`SAVE_DEBOUNCE`) through `scheduleSave`/`saveNow`;
  there is no server round-trip anywhere in the app.
- **Actions commit on release, guarded against re-fire** (B18 → B81): every
  committing *consequence* (delete, complete, copy, undo, menu item, board
  create/delete) runs the instant it is released through `commitAction()`, which
  then briefly drops a second tap so an impatient double-tap can't double-fire.
  Navigation (menu open, board swap, edit-entry) and capture (note/lot creation)
  commit nothing a stray tap could duplicate, so they run raw. Any new
  interactive consequence needs to go through `commitAction()`, not a bespoke
  timeout.
- **Undo is a 5s toast** (`showUndo`/`UNDO_MS`) that restores exact prior
  state; a new destructive action finalizes/cancels the prior undo.
- **PDF export is hand-rolled** (§10.5, no library): `exportBoardPage`/
  `pdfAssemble` etc. draw the reference sheet directly in PDF primitives,
  reusing the same `EXPORT_GEO`/`exportX`/`exportY` logic that mirrors the
  on-screen render math so the export is geometrically faithful to what's
  on screen.
- **Routing** between board view and list view uses the History API
  (`pushState`/`popstate`) specifically so the OS/browser back gesture works
  (B9) — never intercept or shadow it.

## The three records — read before changing behavior

| File | Answers | Wins on | Cited as |
|---|---|---|---|
| `PRD.md` | what the app is, who it is for, why | product intent | `PRD §x` |
| `UIUX.md` | what it renders, and in what values | **rendering** | `UIUX §x` |
| `DECISIONS.md` | every ruling, in order, with its reason | the later ruling always wins | `B<n>` |

**`UIUX.md` is the rendering authority** (`DECISIONS.md:22`, which resolved A1
by following `UIUX §7` over `PRD §6.6`). Every design value — hexes, contrast
ratios, sizes, radii, durations, thresholds, ARIA contracts — lives there and
nowhere else. `PRD.md` §9 holds the design system's *position* and points at it.
Both `app.js` and `styles.css` are sectioned against `UIUX.md`'s numbering:
every top-level `§` marker in `styles.css` is a UIUX section number, and its
header block is that document's table of contents. The design system's
**rendered reference** is `docs/proofs/proof-10-the-second-swap.html` (B58 —
the current scene; sheets 7 and 9 remain the pre-swap record, B46/B52) —
read the render before re-deriving the design from prose. `fonts/` holds
Montserrat Alternates 400/600/800 (B50): declared in `styles.css`, listed in
`sw.js`'s `ASSETS`, shipped with v2.

**Cite with the document prefix** — `PRD §6.2`, `UIUX §4.3`. A bare `§x` is
ambiguous: `styles.css` uses bare `§6.1`/`§6.2`/`§6.5` for PRD sections and bare
`§6` for UIUX's touch floor, in the same file (`UIUX §17`).

`DECISIONS.md` is the binding, cumulative record of every UI/interaction
ruling in this app, each numbered (`B1`…`B51`+) and tied to an issue number,
resolved against the product/design principles quoted at its top (capture
precedes structure · positions permanent · zero cognitive tax · every pixel
earns its place). Later entries explicitly `supersede`/`override` earlier
ones — **grep `DECISIONS.md` for the relevant section before changing
gesture, layout, band/lot, or menu behavior**, because a prior fix in that
area very likely already ruled out the approach you're about to take (the
band geometry alone has been ruled on five times — B33 → B35 → B36 → B37 →
B38 — each correcting a regression the previous ruling caused, and it is back
in play twice over: B47 moves the rule to the band's bottom edge, and B50
changes the typeface that sizes the band). If you make a new UI/behavior
judgment call that isn't already covered, add a new `B`-numbered entry in
the same style (issue reference, principle it resolves against, what it
supersedes/overrides) rather than leaving the decision implicit in code —
and if it is a *rendering* call, the value itself belongs in `UIUX.md`,
with the entry recording why.

`DESKTOP-MODE-PLAN.md` and `TOP-BAND-PLAN.md` are point-in-time
implementation plans for past features (both marked `Status: implemented`
at the top) — useful as historical context for *why* the desktop grammar
and top-band layout look the way they do, but `DECISIONS.md` is authoritative
if the two ever disagree.

## Commit style

Commit subjects are short, imperative, and describe the outcome, not the
mechanism (e.g. "Wrap note text at the sheet's right edge (issue #53)",
"Deselect before creating, and select many with shift (issues #54, #55)"),
with the driving issue number(s) in parens. Most work traces to a GitHub
issue — check for one before assuming a change is unscoped.
