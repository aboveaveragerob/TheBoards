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
| `manifest.json` · `sw.js` | PWA manifest + stale-while-revalidate offline service worker |
| `icons/` | 192 / 512 / maskable app icons |
| `test/` | Browser regression tests for the gesture recognizer (dev-only; see `test/README.md`) |
| `.github/workflows/pages.yml` | Deploy to Pages, and assert the deployed `sw.js` is this commit's |

## Shipping

`sw.js`'s cache name is the one string that says which build is live, so it is
the fastest way to answer "did my change actually reach anyone":

```
curl -s https://<pages-host>/sw.js | grep todo-boards-
```

**Bump `CACHE` in `sw.js` on every shipped `app.js`/`styles.css` change.** The
worker re-installs only when its own bytes change; the stale-while-revalidate
fetch handler means a missed bump costs one stale launch rather than every
launch after it, but it is a net, not a substitute (B36).

## Using the board

- **Tap** empty canvas → a note appears and frames itself as you type.
- **Drag** to move (free overlap, no snapping). **Pinch** to scale a note.
- **Long-press** a note or Parking Lot line for its menu (Complete/Restore ·
  Boards · Delete). Delete is undoable for 5 seconds.
- **Long-press the title, Components, or Requirements** for the board's own
  menu: **Export** and **Boards**. Export writes the board you're looking at
  to a PDF and downloads it, no detour through the list — page one is the
  sheet itself, page two its text. Completed items export scratched out, with
  their words absent from the file.
- **Boards** (in either long-press menu) opens the board list; the OS back
  gesture returns you to the board.
- **Long-press a board row** in the list opens the same menu for that board —
  Export or Delete — whether or not it's the one currently open.

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
  **right-click any card** to export or delete it. Deletes keep the 5-second
  Undo; Export writes the board to a PDF, whether or not that board is open.
- **Esc** deselects (or commits an edit), **Delete** removes the selection,
  **Enter** edits it. Notes placed on the wider desktop canvas scale their
  position proportionally when the same board opens on a phone, and back.
