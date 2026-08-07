# Canvas click semantics on desktop — resolved spec (issue #12)

> **Status: decision resolved, implementation pending.** This closes open decision 5
> of 9 from [`DESKTOP-MODE-PLAN.md`](https://github.com/aboveaveragerob/TheBoards/blob/claude/desktop-view-planning-1nd3sq/DESKTOP-MODE-PLAN.md)
> (PR #7, planning issue #4). No code changes here — the parent plan holds implementation
> until all nine decisions are confirmed, and this one is downstream of two that are still
> open (see *Blocked on* below). The `DECISIONS.md` entry is drafted at the bottom of this
> file, ready to paste **when the implementation lands**, not before: `DECISIONS.md`
> records what v1 ships, and this does not ship yet.

## The problem

A click on bare paper already means something, and it means it unambiguously. `handleTap`'s
`'canvas'` branch (`app.js:422-426`) draws a ghost frame and creates a note 400 ms later at
the point of the click. This is not one feature among several — it is the capture-first
identity (PRD §1, "capture precedes structure"), and the coordinates are not incidental:
the `x, y` the click supplies *is* data, permanent from the moment it lands (B17).

Desktop introduces a second meaning for the same gesture. Issue #4's select-then-act model
gives a note a selected state with a frame, resize handles and Complete/Delete buttons, and
the universal way to leave that state on a desktop is to click away from it. Two meanings,
one gesture, on the app's largest surface.

Letting both fire is the worse failure. A dismiss-click is aimed at *nothing* — the user is
looking at the note they are dismissing, not at where the cursor is — so every stray
dismissal would drop an empty frame somewhere they were not looking. Those frames self-clean
on blur (B8), but the board would flicker with junk and the user would learn to distrust
the canvas.

## Resolution

| | Resolution | Origin |
|---|---|---|
| Click with a selection active | **Deselects**; creates nothing | Plan default, **confirmed** |
| Click with no selection | Existing ghost + 400 ms create flow, unchanged | Plan default, **confirmed** |
| Which surfaces pay the deselect click | **Creation surfaces**, not "the canvas" | default **restated** |
| Deselect timing | Instant, and opens **no** `delayAction` window | **sharpened** from decision 6 |
| Note hit collar on desktop | Floor drops **44 px → 24 px** | **added** to scope (overrides B7) |

### 1. The default holds — and it costs less than the framing suggests

The extra click lands only on a **manipulate → capture** transition. It never touches
capture → capture, which is the chain the app is actually built around.

The parent plan already establishes that edit and selection are mutually exclusive, and
that commit-on-blur does not reselect. So the ordinary capture loop — click paper, type,
click paper, type — never has a selection active at the moment of the second click. There is
nothing to dismiss and nothing to pay. A selection exists only when you clicked or dragged a
note *without* editing it, which is to say only when you are manipulating rather than
capturing. Going straight from manipulating one note to placing a new one costs one click.

That is the honest size of the tradeoff, and it is smaller than "deselection costs one extra
click" implies.

**The mode is legible, not hidden.** The objection to a gesture that means two things is
that the user must track invisible state to predict it. Here the state is the loudest thing
on the board: an outlined frame with handles and two buttons. Before the click it is
visible; after it, its disappearance is the acknowledgment. Neither branch of the click is
silent, and neither requires the user to remember anything.

**Both alternatives stay rejected.** (a) double-click-to-create would make the primary
surface's primary action a secondary gesture in order to match a convention the app does
not otherwise follow — a straight trade of identity for familiarity, and the wrong side of
UIUX §1. (b) always-create is the pure reading of capture-first, and it is exactly the
stray-frame failure above; a principle that produces litter is being applied past the point
where it was doing work.

### 2. The rule binds to *creation surfaces*, not to "the canvas"

"Canvas click deselects" describes one `switch` branch. The harm it exists to prevent —
a dismiss-click producing something to throw away — is a property of **what a surface does
when clicked**, not of which surface it is. The Parking Lot background creates a lot item
on click (`handleTap`'s `'lot'` branch, `app.js:427`), so it has the identical problem;
an anchor, another note, or a lot line has none of it.

So the rule is written on that axis:

- **Creation surfaces — empty canvas and the `#lot` background.** With a selection active,
  the click **deselects and does nothing else.** No ghost is drawn, no note or lot item is
  created, and the coordinates are discarded. With no selection active, the existing flow
  runs unchanged.
- **Every other surface — another note, a lot line, an anchor, a pane card, the selection
  buttons.** Its own action runs immediately and the selection is replaced or cleared as a
  consequence of that action. **No extra click.** Selecting a different note replaces the
  selection by definition; editing an anchor ends it because edit and selection are mutually
  exclusive. Nothing here needs a dismissal step, because nothing here is at risk of
  creating junk.
- **Canvas drag** — `g.mode = 'cancelled'` (`app.js:354`) — **does not deselect.** Only a
  completed tap dismisses. An aborted or cancelled gesture leaves state exactly as it found
  it, which is already how the recognizer treats every cancelled gesture.
- **Escape deselects**, per the parent plan's keyboard section, so the dismissal has a
  pointer-free equivalent.

Decision 4 (issue #11, PR #30) independently arrived at deselect-first for lot whitespace,
explicitly to mirror this decision "rather than inventing a second, differently-shaped one
for the same situation." Stating the rule on the creation-surface axis makes that a
consequence of one rule instead of an agreement between two.

**Selection is single across the whole app.** One selected thing at a time — a note or a lot
line, never both — which is what makes "deselect" an unambiguous instruction with no target.

### 3. Deselect is instant, and consumes no action window

Decision 6 makes selection instant because `delayAction` drops taps while a window is open
(`app.js:396`), which would swallow the second click of every double-click. Decision 5 needs
that in a stronger form, and needs it for its own reason.

If dismissing opened a 400 ms window, the sequence the whole rule is designed to enable —
click paper to dismiss, click paper to place a note — would break at speed. The second click
would arrive inside the open window and be dropped (B18(d)), and the user would get nothing
for a click they aimed carefully. Under a rule whose entire cost is "one extra click," an
extra click that sometimes does nothing is not a cost, it is a defect.

So: **deselection is applied on the frame the click releases, and calls no `delayAction`.**
Deselect-then-create works at any speed, including faster than 400 ms.

This does not weaken B18, which governs *actions*. A dismissal is not an action: it commits
nothing, writes nothing, and produces nothing to acknowledge. B18(a)'s justification for the
window is that the tapped thing must respond so the delay reads as a beat rather than a
dropped tap — here the response *is* the outcome, and there is nothing left to wait for.
Creation, completion, deletion and board swaps keep their 400 ms exactly as today.

### 4. The dismiss-click needs canvas that is where it looks — the hit collar drops to 24 px

This decision quietly depends on something the parent plan does not guarantee: that the
empty-looking space next to a selected note is actually empty.

It is not. B7 gives every note an invisible collar — `setHitInset` (`app.js:192-198`) sets
`--hit` so that `inset · scale · renderScale ≥ 44 px` physical, expanded by
`.note::before { inset: calc(-1 * var(--hit)) }` (`styles.css:177-181`). At the small end
this is substantial. A note scaled to 0.5 on a 1080p desktop
(`renderScale = min(1080/1000, (1920−300)/900) = 1.08`, so `k = 0.54`) carries roughly
**12 physical px of invisible note** on every side.

A dismiss-click that lands in that collar does not fail quietly. It re-selects the note the
user was dismissing, or — if it falls inside the ~350 ms double-click pairing window — opens
the editor. The failure mode of a near-miss is *"I am now typing into the thing I was trying
to put down."*

**Resolution: on desktop `HIT_FLOOR` drops from 44 px to 24 px.** Both numbers come from the
same standard rather than from taste: 44 px is WCAG 2.5.5 Target Size (Enhanced, AAA) and
44 px is what a fingertip needs (PRD §5.3); 24 px is WCAG 2.5.8 Target Size (Minimum, AA),
the pointer-agnostic floor. Mobile keeps 44 and the enhanced level. Desktop drops to the
minimum level, which is the level the standard itself considers sufficient for a precise
pointer.

The arithmetic is what makes it work. A note's text box is `17px` at `line-height: 1.4`
plus `10px` padding and a `2px` border (`styles.css:190-195`) — about **48 logical px tall**
before scaling. At `k = 0.54` (scale 0.5 on a 1080p desktop) that is 25.8 physical px, which
already clears 24, so the vertical collar goes to **zero**. The worst remaining case is a
single-character note at scale 0.5: ~38 logical px wide → 20.5 physical, leaving about
**1.7 physical px** of collar. Twelve pixels of invisible note becomes under two. The canvas
is where it looks.

**This is an override of B7, scoped to desktop**, and it is recorded as one rather than left
to sit silently beside it. B7's justification is Fitts for a fingertip — a decoupled collar
"honors Fitts / PRD §5.3 without altering the visual frame." Fitts does not stop applying to
a mouse, but the floor was sized for a finger, and on a pointer that can hit a 2 px target
the collar stops buying reach and starts costing canvas. B7's *structure* — a decoupled,
computed, transparent expander, recomputed on scale/edit/resize — is untouched. One constant
moves, gated on `isDesktop`.

**The same requirement, applied to the selection overlay.** The overlay sits above the note
(z-index 3) and its buttons sit *outside* the note's footprint, so a dismiss-click below a
selected note can land on Complete or Delete. That is acceptable in a way the collar is not,
for exactly one reason: **the buttons are drawn.** The user can see where not to click. So
the overlay must not extend the same hazard invisibly — its container is
`pointer-events: none`, with `pointer-events: auto` restored only on the frame, the handles
and the buttons. A click through the overlay's bounding box but not on any of its drawn
parts reaches the canvas and dismisses, as it appears it should.

That is the general form of this section, and the thing implementation should hold onto:
**a dismiss-click can only be trusted if everything that is not canvas is visible.**

### 5. Lifecycle — what clears a selection

- A tap on a creation surface (empty canvas, `#lot` background) — instant, per §3.
- Escape.
- Selecting a different note or lot line (replacement, not clearing).
- Entering edit on anything, including the anchors, which stay direct-edit (decision 9).
- `renderBoard` — it rebuilds the notes and `#lot-items`, so the overlay's target is gone.
- `deleteNote` / `removeNoteSilently` / `deleteLot`.
- Board swap, and the desktop↔mobile mode flip (`applyMode`'s teardown already lists it).

Deselection is pure teardown: remove the overlay, drop the selected id. It writes nothing
and never calls `saveNow` — there is no state change to persist, which is a second reason it
needs no action window.

## What implementation changes

Step 5 of the parent plan, plus one constant in step 2. All of it `isDesktop`-gated;
**mobile's `handleTap` is byte-for-byte unchanged**, including the ghost.

- `handleTap` (`app.js:419`): the `'canvas'` and `'lot'` branches gain a leading
  `if (isDesktop && selection) { clearSelection(); break; }`. Both branches, one guard
  shape — that is the creation-surface rule expressed directly in the code.
- `clearSelection()` is called directly, never through `delayAction`.
- `HIT_FLOOR` (`app.js:28`) becomes desktop-aware; `setHitInset` is otherwise untouched and
  is already re-run on every scale, edit and layout change.
- `#selection` gets `pointer-events: none`, with `auto` on `.sel-frame`, the handles and
  `.sel-btn`.

## Blocked on

- **Decision 1 — desktop detection (#8)**: supplies the `isDesktop` flag every rule above is
  gated on. This spec is inert if detection changes shape; it makes no assumption about how
  the flag is derived.
- **Decision 6 — selection timing vs. B18 (#13)**: §3 sharpens it rather than restating it.
  If decision 6 were overridden to a delayed selection, §3 would have to be re-argued —
  though the drop-guard makes that unlikely to survive on its own terms.

Decision 4 (#11, PR #30) is not a blocker but is coupled: it makes lot lines selectable,
which is what makes the lot *background* a creation surface while a lot *line* is not.

## Draft `DECISIONS.md` entry — paste when implementation lands

> **Numbering:** take the next free `B` number at paste time. Do **not** assume B19 — the
> nine decision branches are resolving in parallel and claiming numbers as they merge
> (PR #28 already claims B19 for the board pane, and issue #8 proposes a second). The number
> is assigned when the entry lands, not when it is drafted.

> ### B__. Desktop canvas click: creation surfaces deselect first
>
> On desktop a click on bare paper has two candidate meanings — create a note (§6.2, the
> capture-first identity) and dismiss the current selection (issue #4's select-then-act
> model). **Decision:** with a selection active the click **deselects and creates nothing**;
> with no selection it runs the existing ghost + 400 ms flow unchanged
> (`app.js › handleTap`). Mobile is untouched in every state.
>
> **The rule binds to creation surfaces, not to "the canvas."** Empty canvas and the `#lot`
> background both create on click, so both deselect first; every other surface — another
> note, a lot line, an anchor, a pane card, the selection buttons — performs its own action
> immediately and clears or replaces the selection as a consequence, at no extra click. The
> harm being prevented is a dismiss-click producing something to throw away, and that is a
> property of what a surface *does*, not of which surface it is. A canvas *drag* does not
> deselect: only a completed tap dismisses, matching how the recognizer already treats
> cancelled gestures. Selection is single app-wide, so "deselect" is never ambiguous.
>
> **Why the cost is acceptable:** the extra click lands only on a manipulate → capture
> transition. Edit and selection are mutually exclusive and commit-on-blur does not
> reselect, so the ordinary capture loop — click paper, type, click paper — never has a
> selection active and never pays. And the mode is not hidden state: the selection overlay
> is the loudest thing on the board before the click, and its disappearance is the
> acknowledgment after it.
>
> **Deselection is instant and opens no action window** (`app.js › delayAction`). Not merely
> taste, and not only decision 6's double-click argument: `delayAction` drops taps while a
> window is open (B18(d)), so a deselect that opened one would swallow the immediately
> following click — and under a rule whose whole cost is one extra click, an extra click
> that sometimes does nothing is a defect, not a cost. B18 is undisturbed for actions; a
> dismissal commits nothing, writes nothing, and has nothing to acknowledge.
>
> **Consequence — the hit collar drops to 24 px on desktop, overriding B7.** The rule
> depends on the space beside a selected note actually being empty, and B7's collar makes it
> not: at scale 0.5 on a 1080p desktop a note carries ~12 physical px of invisible note, so
> a near-miss dismissal re-selects it or opens its editor. `HIT_FLOOR` therefore drops from
> 44 px (WCAG 2.5.5 Enhanced, AAA — sized for a fingertip, PRD §5.3) to 24 px (WCAG 2.5.8
> Minimum, AA — the pointer-agnostic floor) on desktop only; mobile keeps 44 and the
> enhanced level. A note's text box is ~48 logical px tall, so at 24 the vertical collar
> goes to zero and the worst remaining case — a single-character note at scale 0.5 — keeps
> under 2 physical px. B7's structure is untouched; one constant moves. The selection
> overlay carries the same requirement by a different route: it is `pointer-events: none`
> except on the frame, handles and buttons, which are *drawn* — a dismiss-click can only be
> trusted if everything that is not canvas is visible.
>
> **Not chosen:** double-click-to-create with single click always deselecting — fully
> desktop-conventional, but it demotes the primary surface's primary action to a secondary
> gesture to buy familiarity the app does not otherwise trade for (UIUX §1). Nor
> always-create-even-when-selected: the pure reading of capture-first, and the one that
> litters the board with frames the user was not looking at.
>
> **Impermanence:** the load-bearing claim is that manipulate → capture is the rare
> transition. If desktop use turns out to run the other way — select, act, immediately place
> — the extra click stops being marginal and the answer is a dedicated placement affordance,
> not a re-reading of the click. The 24 px floor is likewise a standard's minimum, not a
> measured one; if small notes prove awkward to hit with a mouse on a real monitor, the
> constant moves and nothing above it changes.
