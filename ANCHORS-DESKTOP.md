# Anchors stay direct-edit on desktop — resolved spec (issue #16)

> **Status: decision resolved, implementation pending.** This closes open decision 9
> of 9 from [`DESKTOP-MODE-PLAN.md`](https://github.com/aboveaveragerob/TheBoards/blob/claude/desktop-view-planning-1nd3sq/DESKTOP-MODE-PLAN.md)
> (PR #7, planning issue #4). No code changes here — the parent plan holds
> implementation until all nine decisions are confirmed. The `DECISIONS.md` entry is
> drafted at the bottom of this file, ready to paste **when the implementation lands**,
> not before: `DECISIONS.md` records what v1 ships, and this does not ship yet.

## The problem

Issue #4 introduces a select-then-act model for notes: click selects, a second click (or
double-click) edits, and a selection overlay carries Complete/Delete. Does that model
extend to the app's three fixed anchors — title, Components, Requirements
(`index.html:26-36`, `#anchor-title` / `#anchor-components` / `#anchor-requirements`) — or
do they keep today's single-click-to-edit (`app.js:443`,
`case 'anchor': delayAction(target.node, () => editText(target.node, x, y))`)?

## Resolution

**Confirmed as proposed: anchors stay direct-edit on click. No implementation changes.**

Selection exists to carry actions a target needs beyond editing — move, resize, Complete,
Delete (per the parent plan's Selection model, and decisions 4/6 extending the same
grammar to lot lines). Anchors have none of those. The current code already establishes
this: for `target.type === 'anchor'`, `openMenuFor`'s long-press menu is `[Boards]` only
(`app.js:734-735`) — no Complete, no Delete, because neither is a legal anchor state. A
selection overlay would either have to render with its action buttons omitted or omit
itself entirely, either way adding a click that resolves to nothing before the one thing
an anchor supports — typing into it.

Issue #4's own language treats anchors as furniture, not manipulable content: "the title
cards … remain a fixed component." Fixed components don't move or resize, so desktop's
resize affordance (drag the selection frame) is inapplicable by construction, not by
omission.

The existing entry path is unaffected by every other desktop decision: anchors keep
routing through `delayAction` exactly as today (B18's 400 ms acknowledged window,
confirmed for desktop actions by decision 6, issue #13), landing directly in `editText`
with no selection step in front of it.

## What implementation changes

Nothing. `app.js:443`'s anchor branch, `openMenuFor`'s anchor-menu restriction
(`app.js:734-735`), and `classifyTarget`'s `anchor` target type (`app.js:299-308`) are all
unchanged on both mobile and desktop. `isDesktop` gates the note/lot-item selection
branches added by decisions 5-7; it gates nothing in the anchor path, because there is
nothing to gate.

## Blocked on

Nothing. This decision is self-contained and adds no work to any implementation step.

## Draft `DECISIONS.md` entry — paste when implementation lands

> **Numbering:** take the next free `B` number at paste time. Do **not** assume a specific
> number — the nine decision branches are resolving in parallel and claiming numbers as
> they merge (PR #28 already claims B19 for the board pane). The number is assigned when
> the entry lands, not when it is drafted.

> ### B__. Desktop anchors stay direct-edit; selection does not extend to them
>
> The desktop select-then-act model (decisions 5-7) applies to notes and lot lines, not to
> the three fixed anchors — title, Components, Requirements (`index.html` `#anchor-title` /
> `#anchor-components` / `#anchor-requirements`). Clicking an anchor edits it directly, as
> it does on mobile today (`app.js › handleTap`, the `anchor` case), through the same B18
> 400 ms acknowledged window.
>
> **Ground:** selection exists to carry actions a target needs beyond editing — move,
> resize, Complete, Delete. Anchors support none of them; issue #4 itself calls the title
> card "a fixed component." The current code already treats anchors this way: their
> long-press menu is `Boards` only (`app.js › openMenuFor`), with no Complete/Delete item,
> because neither is a legal anchor state. A selection step here would cost a click and
> resolve to nothing before the one action anchors support — text entry.
>
> **Impermanence:** this holds only as long as anchors stay non-manipulable furniture. If a
> future requirement gives an anchor a state selection would need to carry — reordering the
> three anchors, say, or a per-anchor visibility toggle — this entry no longer applies and
> the decision must be re-made against that capability, not stretched to cover it.
