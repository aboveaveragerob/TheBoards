# TheBoards

**To-Do Boards** — a spatial, offline-first PWA. A fixed, bounded page where any
thought becomes a framed, movable, scalable note the instant it is typed, and
structure is asserted *after* capture by where things sit and how big they are.
Task tracking, creative ideation, note-taking, problem-solving — one surface, no
modes, no chrome.

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

## On desktop

With a mouse and a window ≥ 1024 px wide, the board switches to a
mouse-and-keyboard grammar (tablets stay in touch mode):

- **Click** a note to select it; the outlined frame appears with **Complete**
  and **Delete** underneath. **Drag the frame** to resize. **Double-click** to
  edit (caret at the end). Click empty canvas to deselect — with nothing
  selected, a click still creates a note. Parking Lot lines select the same
  way, with their buttons at the row's right edge. There is no click-and-hold.
- A **board rail** on the left lists every board, newest first, with the open
  board marked. Click a card to switch (a brief crossfade), **New board** at
  the top to create, the active card's 🗑 to delete the open board — or
  **right-click any card** to delete it. Deletes keep the 5-second Undo.
- **Esc** deselects (or commits an edit), **Delete** removes the selection,
  **Enter** edits it. Notes placed on the wider desktop canvas scale their
  position proportionally when the same board opens on a phone, and back.
