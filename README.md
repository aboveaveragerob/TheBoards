# TheBoards

**To-Do Boards** — a spatial, offline-first PWA. A fixed, bounded page where any
thought becomes a framed, movable, scalable note the instant it is typed, and
structure is asserted *after* capture by where things sit and how big they are.
Task tracking, creative ideation, note-taking, problem-solving — one surface, no
modes, no chrome.

Built to the binding spec in `PRD.md` (what & why) and `UIUX.md` (how it renders
& behaves). Design decisions where the spec was silent are recorded in
`DECISIONS.md`.

## Run it

Vanilla HTML/CSS/JS — no frameworks, no build step, no dependencies. Serve the
folder over any static host and open it:

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

Install to the home screen for a standalone, fully-offline experience (all data
lives on-device in IndexedDB; there is no backend).

## Files

| File | Role |
|---|---|
| `index.html` | App shell (board view, list view, menu, toast) |
| `styles.css` | Design tokens, both themes, board geometry, note component |
| `app.js` | Persistence, rendering/scale, gestures, z-order, undo, routing |
| `manifest.json` · `sw.js` | PWA manifest + cache-first offline service worker |
| `icons/` | 192 / 512 / maskable app icons |

## Using the board

- **Tap** empty canvas → a note appears and frames itself as you type.
- **Drag** to move (free overlap, no snapping). **Pinch** to scale a note.
- **Long-press** any note, anchor, or Parking Lot line for the menu
  (Complete/Restore · Boards · Delete). Delete is undoable for 5 seconds.
- **Boards** (in the long-press menu) opens the board list; the OS back gesture
  returns you to the board.
