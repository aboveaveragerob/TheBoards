# TheBoards

**To-Do Boards** — a spatial, offline-first PWA built cognitive-first, for
spatial reasoners and neurodivergent minds. A fixed, bounded page where any
thought becomes a framed, movable, scalable note the instant it is typed.
Structure is asserted *after* capture — by where things sit and how big they
are — never by forms, tags, or folders the app makes you fill in first.

## Where it came from

This app started in a sketchbook. When a thought arrived, it got written
down and a square was drawn around it — not to decorate it, but to isolate
it. A boxed thought is a thought you can *see*, separate from every other
thought making noise for attention. The real shift came when all of those
squares lived on one page together: thoughts stopped rolling around in my
head and started sitting somewhere I could look at, point at, move, and
make bigger or smaller. The page held them so my head didn't have to.

TheBoards is that sketchbook, kept honest. Tap the canvas and a framed note
appears under your fingers — the square draws itself the moment you type.
Place is structure. Size is priority. Nothing else is required of you.

## Why it looks the way it does

The design is opinionated about cognition, and it states its own rules in
`docs/PRD.md` — every change to the interface is resolved against them:

- **Zero cognitive tax.** The interface asks nothing. No settings, no
  accounts, no onboarding, no modes, no empty states to interpret, no
  dialogs. Everything that can be acted on is visible at once; if a feature
  needs a hidden menu or a settings screen, it doesn't ship.
- **Capture precedes structure.** A thought reaches the page in the time it
  takes to type it. Tap-and-write is the entire entry gesture — no "new
  note" button, no picker, no animation between the intent and the caret.
- **Relationships are asserted, not inferred.** The app never groups, tags,
  sorts, or suggests. Where a note sits and how big it is *is* the meaning,
  and only the person who put it there decided that.
- **Positions are permanent.** A committed position is data. Rotating the
  phone, resizing the window, opening the board on another device — these
  render stored coordinates differently; they never rewrite them.
- **Work performed stays visible.** Completing something scratches it out;
  it does not vanish. The scratch-out is the record that the work happened.

The visual register is calm water at depth and at dusk — a dark, quiet page
rather than a bright productivity surface. It should feel like a place you
are glad to return to, not a tool you owe something to.

## Local-first, dependency-free

- **All data lives on-device** in IndexedDB. There is no backend, no sync,
  no account, no analytics, no network call anywhere in the app. Export
  (PDF or a whole-library JSON backup) is the only way data leaves, and you
  press the button.
- **Vanilla HTML/CSS/JS** — no frameworks, no bundler, no package manager,
  no build step. Five files are the entire app; every dependency is a font
  file shipped alongside it.
- **Offline-first PWA.** Install it to your home screen or desktop and it
  runs with the network off, from a version-stamped service-worker cache.

## Get it

**Use it directly** — it's deployed on GitHub Pages:
<https://aboveaveragerob.github.io/TheBoards/>
Open it in a browser, or install it as an app (browser menu → *Install app*
/ *Add to Home Screen*) for the standalone, fully-offline experience.

**Run it yourself** — clone or download this repository and serve the
folder; there is nothing to build:

```
git clone https://github.com/aboveaveragerob/TheBoards.git
cd TheBoards
python3 -m http.server 8000   # then visit http://localhost:8000
```

Any static file server works; the app is served as-is. Data is per-device
by design — the JSON export under **Export** is your backup and your way
to move a library between devices (**Import** restores it).

## Using the board

Everything happens on the one canvas; there is nothing behind it.

- **Tap** empty canvas → a note appears and frames itself as you type.
  **Drag** to move (free overlap, no snapping); **pinch** to scale.
- **Tap a note once** to select it — its own small toolbar appears on the
  frame (Complete · Copy · Link · Delete). **Tap again to edit.** Delete is
  undoable for 5 seconds. Completing scratches the line out; it stays.
- The **board-action tabs** hover above the Parking Lot: **All Boards**
  (opens the board list — the OS back gesture returns you), **Export**
  (PDF of this board · JSON backup of every board), **Import** (restore a
  JSON backup).
- The **Parking Lot** holds plain stacked lines for the small thoughts that
  don't need a frame yet — tap the lot, type, done.
- Nothing scrolls. The board is one bounded sheet; if it's full, it's full
  — that boundary is the point.

### On desktop

When a fine pointer is present and the window is ≥ 1024 px, the same board
speaks mouse-and-keyboard: **click** to select (the toolbar appears under
the note), **drag the frame** to resize, **double-click** to edit, **Esc**
deselects, **Delete** removes, and a **board rail** on the left holds the
same categories with the open board marked. Capability, not width, decides
— tablets stay in touch mode.

## For contributors

| File | Role |
|---|---|
| `index.html` | App shell (board view, list view, board-action tabs, toast) |
| `styles.css` | Design tokens (dark-only), board geometry, note component |
| `app.js` | Persistence, rendering/scale, gestures, toolbars, undo, routing |
| `manifest.json` · `sw.js` | PWA manifest + stale-while-revalidate offline service worker |
| `icons/` | App icons and the favicon set, generated by `icons/make-icons.js` |
| `fonts/` | Montserrat Alternates 400/600/800, self-hosted woff2 |
| `test/` | Four regression scripts (dev-only; see `test/README.md`) |
| `.github/workflows/pages.yml` | Deploys to Pages and asserts the deployed `sw.js` is this commit's |

The product, design, and decision records under `docs/` are the real
specification — `PRD.md` for the principles quoted above, `UIUX.md` as the
rendering authority (every hex, size, radius, threshold), and
`DECISIONS.md`, the numbered, cumulative record of every ruling (`B<n>`),
where the later ruling always wins. Read them before changing behavior; the
tests pin both the rulings and the shipped cache version.

To run the regression suite locally (dev-only, not shipped): install
Playwright, serve the folder on port 8000, and run the four scripts in
`test/`. `sw.js`'s `CACHE` name must be bumped on every shipped
`app.js`/`styles.css` change — it is the one string that says which build
is live.