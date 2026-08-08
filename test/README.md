# Regression tests

Dev-only tooling. **The app itself still has no dependencies and no build step** —
nothing here is served, bundled, or shipped to the device.

Two scripts drive a real Chromium through Playwright and assert the behaviour of
the gesture recognizer, the capture path, and the layout guard:

| Script | Covers |
|---|---|
| `mobile.js` | Touch capture (§D of `DECISIONS.md`): instant note creation, focus and caret, long-press on bare paper, touch slop, empty-frame sweeps, the keyboard-resize guard, menu dismissal |
| `desktop.js` | Desktop grammar (B19–B26): the B18 ghost and 400 ms window, click-to-select, double-click edit, rail create/swap, right-click menu, drag |

Taps are dispatched as genuine touch events over CDP rather than synthesised
clicks, because the bug they exist to catch lived in the browser's
touch-to-mouse compatibility events (B27b) — synthetic clicks would not see it.

## Running

```
python3 -m http.server 8000        # serve the repo root
npm install playwright             # somewhere on NODE_PATH; not committed
node test/mobile.js
node test/desktop.js
```

Both exit non-zero on failure.

- `BOARDS_URL` overrides the served URL (default `http://localhost:8000/index.html`).
- `CHROMIUM_PATH` points at a specific Chromium binary; otherwise Playwright's own
  download is used.

Run against the commit *before* the §D fixes and the mobile suite reproduces the
original capture-session failure in full, including the `TypeError` from a
long-press on empty canvas and the sheet collapsing mid-edit. That is what these
assertions are pinned to — keep them honest by checking they can still fail.
