# Regression tests

Dev-only tooling. **The app itself still has no dependencies and no build step** —
nothing here is served, bundled, or shipped to the device.

Three scripts drive a real Chromium through Playwright and assert the behaviour of
the gesture recognizer, the capture path, the layout guard, and delivery:

| Script | Covers |
|---|---|
| `mobile.js` | Touch capture (§D of `DECISIONS.md`): instant note creation, focus and caret, long-press on bare paper, touch slop, empty-frame sweeps, the keyboard-resize guard, menu dismissal, board-row export. Plus band/lot geometry (B32–B36), including the free canvas on a short sheet and `EXPORT_GEO`'s agreement with the `--band-h` ceiling |
| `desktop.js` | Desktop grammar (B19–B26): the B18 ghost and 400 ms window, click-to-select, double-click edit, rail create/swap, right-click menu, drag, PDF export (B34) — menu order, byte-accurate xref, and that a completed item's text is absent from the file |
| `sw-update.js` | **Delivery** (B36): that a shipped `styles.css`/`app.js` change actually reaches an installed PWA rather than sitting behind a stale service-worker cache |

Taps are dispatched as genuine touch events over CDP rather than synthesised
clicks, because the bug they exist to catch lived in the browser's
touch-to-mouse compatibility events (B27b) — synthetic clicks would not see it.

## Running

```
python3 -m http.server 8000        # serve the repo root
npm install playwright             # somewhere on NODE_PATH; not committed
node test/mobile.js
node test/desktop.js
node test/sw-update.js             # serves its own throwaway copy; no server needed
```

All three exit non-zero on failure.

- `BOARDS_URL` overrides the served URL (default `http://localhost:8000/index.html`).
- `CHROMIUM_PATH` points at a specific Chromium binary; otherwise Playwright's own
  download is used.

- `SW_TEST_PORT` moves `sw-update.js`'s throwaway server off `8199`. It serves its
  own mutable copy of the app rather than the repo root, because it has to change
  files under a live service worker.

Run against the commit *before* the §D fixes and the mobile suite reproduces the
original capture-session failure in full, including the `TypeError` from a
long-press on empty canvas and the sheet collapsing mid-edit. That is what these
assertions are pinned to — keep them honest by checking they can still fail.

`sw-update.js` builds that discipline in: step 2 *requires* the bug to reproduce
before step 3 is allowed to demonstrate the fix. If a change ever makes step 2
pass cleanly, the harness has stopped exercising the service worker and the suite
is lying rather than passing — B36 exists because a green suite and a correct
stylesheet coexisted with a user looking at neither.
