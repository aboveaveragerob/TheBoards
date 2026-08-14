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
| `styles.css` | Design tokens (dark-only), board geometry, note component |
| `app.js` | Persistence, rendering/scale, gestures, z-order, undo, routing |
| `manifest.json` · `sw.js` | PWA manifest + stale-while-revalidate offline service worker |
| `icons/` | 192 / 512 / maskable app icons |
| `fonts/` | Montserrat Alternates 400/600/800, self-hosted woff2 |
| `test/` | Four regression scripts (dev-only; see `test/README.md`) — three drive a browser; `tokens.js` recomputes the design contract with no browser at all |
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
- **Long-press** a note or Parking Lot line for its menu (All boards ·
  Complete/Restore · Copy · Delete). Delete is undoable for 5 seconds.
- **Long-press the title, Components, or Requirements** for the board's own
  menu: **Export · All boards**. Export writes the board you're looking at
  to a PDF and downloads it, no detour through the list — page one is the
  sheet itself, page two its text. Completed items export scratched out, with
  their words absent from the file.
- **All boards** (in either long-press menu) opens the board list; the OS
  back gesture returns you to the board.
- The list sorts boards into three categories — To-Do, Idea, and Note
  Boards — each with a **New board** button on its header that creates a
  board in that category and opens it, and its own pager below the cards;
  nothing scrolls. A press on a board card has three readings: **move**
  drags it to another category, **hold** opens that board's menu (Export ·
  Delete, whether or not it's the one currently open), **release** opens
  the board.

## On desktop

When the primary pointer is fine, can hover, and the window is ≥ 1024 px
wide, the board switches to a mouse-and-keyboard grammar (capability, not
width, is what keeps tablets in touch mode):

- **Click** a note to select it; the outlined frame appears with **Complete ·
  Copy · Delete** underneath. **Drag the frame** to resize. **Double-click** to
  edit (caret at the end). Click empty canvas to deselect — with nothing
  selected, a click still creates a note. Parking Lot lines select the same
  way, with their buttons at the row's right edge. There is no click-and-hold.
- A **board rail** on the left sorts the same three categories, each with
  its own pager — newest first within a category — with the open board
  marked. Click a card to switch (a brief crossfade), a category's own
  **New board** button to create a board in that section and open it, the
  active card's delete mark to delete the open board — or
  **right-click any card** to export or delete it. Deletes keep the 5-second
  Undo; Export writes the board to a PDF, whether or not that board is open.
- **Esc** deselects (or commits an edit), **Delete** removes the selection,
  **Enter** edits it. Notes placed on the wider desktop canvas scale
  proportionally — position and size together — when the same board opens on
  a phone, and back.
