# RTCB Mockups — Rolling Temporal Calendar Board, v2 (2026-08-31)

The owner's spec: a **Calendar board type** wearing the existing board shell —
one timeline zone per day beside a left-anchored date card, 3 visible lines
with per-zone paging, the Daily To-Do strip with its stretch arrow, the
midnight roll with carry-forward, today always lit and always at the top.

This set covers the **viewport story** — where the calendar lives on each
device class:

| File | Viewport | The arrangement |
|---|---|---|
| `rtcb-6-desktop-rail.html` | Desktop / iPad / large viewport | A 40px rail pinned to the right edge, "Calendar Board" vertical, lit dot + today's date. Click expands leftward into a panel over ~⅓ of the viewport: the 7-day rolling stack — today lit at top, the week receding below. Collapse returns the rail; the board never reflows. |
| `rtcb-7-zfold.html` | Unfolded Z Fold / dual-pane | The calendar takes the ENTIRE right half — the device is two viewports side by side, so each half is a full pane: board left, 7-day stack right at full height. The corner control folds it back to the edge rail. The crease is the seam between doing and when. |
| `rtcb-8-mobile.html` | Phone | A "Calendar" button joins the board-action row between All boards and Export (accent-page fill). It opens the calendar board full screen: the 7-day rolling stack — today lit and tallest, Daily To-Do stretch arrow in its corner, no scrolling. |

The laws common to all three:

- **Today is always the top card**, the lit one, the largest — on every viewport.
- **A full week is always visible**: today plus the next six days; the stack
  never scrolls, it *rolls* — at midnight every card rises one slot, yesterday
  folds into the archive, and today's Daily To-Do carries the unfinished items.
- **Attention recedes with distance from now** — tomorrow near, then far,
  open water at the week's tail. Scale and luminance, never icons.
- **Collapse is always available** on large viewports; the phone needs none —
  the board and the calendar are separate full screens joined by one button.

PNG renders (`preview-*.png`) are Chromium captures of each HTML file. All
values are the shipped `UIUX §2.2.2` tokens; the v2 day-row layout follows
the owner's single-timeline refinement (date card left-anchored, one zone).
