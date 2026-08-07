# Cross-device note positions — resolved spec (issue #15)

> **Status: decision resolved, implementation pending.** This closes open decision 8
> of 9 from [`DESKTOP-MODE-PLAN.md`](https://github.com/aboveaveragerob/TheBoards/blob/claude/desktop-view-planning-1nd3sq/DESKTOP-MODE-PLAN.md)
> (PR #7, planning issue #4). No code changes here — the parent plan holds
> implementation until all nine decisions are confirmed, and this one has no
> blockers among the rest (see *Blocked on* below). The `DECISIONS.md` entry is
> drafted at the bottom of this file, ready to paste **when the implementation lands**,
> not before: `DECISIONS.md` records what v1 ships, and this does not ship yet.

## The problem

Decision 2's desktop geometry makes `LOGICAL_W` variable —
`renderScale = min(vh/1000, (vw−PANE_W)/900)`, `LOGICAL_W = (vw−PANE_W)/renderScale` —
where mobile keeps `LOGICAL_W` fixed at 900 (`app.js:22`). A note placed at, say,
`x = 1400` is valid on a wide desktop window and invalid on a phone: reopen that board
on mobile and the note sits past the sheet's right edge — not deleted, not clamped,
just off-screen until a wide-enough viewport returns.

The plan's own recommended default was to accept that outright, per `DECISIONS.md` B17
(committed positions are never re-clamped on resize — the identical tradeoff already
applies to `y` across portrait/landscape). **That default has been explicitly overridden**
by the repo owner:

> "Scale it to fit on mobile and on desktop — the position only changes based on the
> viewport in a scaled fashion, not a fixed position fashion."

The stored position is still never silently rewritten outside an explicit user action —
this calls for a *render-time* transform, not a change to what gets persisted.

## Resolution

| | Resolution | Origin |
|---|---|---|
| Which axis is affected | `x` only — `y` already fits every device (`LOGICAL_H` stays ≥ 1000), the Parking Lot has no `x`/`y` | Plan's own scoping, **confirmed** |
| Stored `note.x` | Never mutated by a viewport change; mutated only by `createNote`/drag/pinch/resize, exactly as today | Constraint, **confirmed** |
| Visual position | Proportionally scaled to the current device's `LOGICAL_W`, not clamped to a boundary | Plan default **overridden** |
| Mechanism | New per-note field `note.rw` (the `LOGICAL_W` in effect when `x` was last written) + a render-time-only multiply | **New**, scoped to this decision |
| Drag/pinch grab | Rebases `note.x`/`note.rw` to the current frame at gesture start, so grab math is untouched | **New**, required for consistency |
| Legacy notes (no `rw`) | Read as `rw = 900` | **New**, migration-free |

### 1. Why B17's mechanism doesn't already solve this

B17 ("grow the canvas," `DECISIONS.md`) rescales the *whole* sheet with one uniform
factor — `renderScale = vw/LOGICAL_W` — and never touches `x`/`y`, because `LOGICAL_W`
is a `const` (`app.js:22`) that never changes. A single uniform scale is sufficient there
because every stored coordinate is already valid against the one width that's ever in
effect. Decision 8 breaks that premise: once desktop mode ships, `LOGICAL_W` itself is
device-dependent. A uniform whole-canvas `renderScale` maps logical px to physical px —
it does not remap a logical `x` that was valid against a *different* `LOGICAL_W` into one
valid against the current one. Fitting the note requires knowing what "1400 out of how
wide" meant when it was written, which B17's mechanism was never asked to track because
it never needed to.

### 2. The mechanism — a render-time ratio, not a new position system

At each point `x` is currently written — `createNote` (`app.js:467-468`), drag
(`app.js:573-574`), and pinch (`app.js:604-605`) — record the `LOGICAL_W` in effect at
that moment as a sibling field, `note.rw`. At render time, wherever the code sets
`node.style.left = note.x + 'px'`, compute instead:

```
renderX = note.x * (LOGICAL_W / (note.rw || 900))
```

and use `renderX` for that one assignment. `note.y` is untouched — `y` always fits and
stays governed by B17 alone. The persisted model's `note.x` is untouched — only the CSS
`left` a viewer sees is derived from it, freshly, on every layout pass, from data that
was already true.

This is proportional by construction, not clamped: `note.x` is already clamped into
`[0, note.rw − footprint]` at the moment it's written (`clamp()`, `app.js:627`, call
sites unchanged), so `renderX` lands inside `[0, LOGICAL_W − footprint · (LOGICAL_W/note.rw)]`
at read time — always on-page, with no second boundary check needed. A note authored at
`x = 1400` against `rw = 1600` renders at `x ≈ 787` on a 900-wide phone; the same note
reopened on a 1200-wide desktop window renders at `x = 1050` — always the same fraction
of the sheet. A note authored at `x = 450` on mobile (`rw = 900`, page-center) renders at
`x = 800` on a 1600-wide desktop canvas — still page-center. The formula treats
desktop→mobile and mobile→desktop identically, which is what "scaled, not fixed" means
applied consistently.

### 3. Drag/pinch rebase at grab, so gesture math needs no other change

`updateDrag` and `updatePinch` read and write `note.x` directly in the frame's current
logical units (`app.js:573-574`, `604-605`). If `note.x` could mean "a position recorded
against a different `LOGICAL_W`," grab-relative math (`grabDX`/`grabDY`, `startScale`)
would desync from the position the user is actually looking at and grabbing.

**Resolution:** at the instant a drag or pinch grabs a note — before computing any
grab-relative offset — rebase it: `note.x = renderX; note.rw = LOGICAL_W`. Because
`renderX` is by definition the on-screen position at that exact instant, this rebase is
visually silent — nothing jumps — and every line of existing drag/pinch math downstream
keeps operating in "current frame" units exactly as it does today, unchanged. This only
fires on an explicit user gesture, so it does not conflict with the rule that a viewport
change alone must never mutate stored data — the mutation is gated on the same events
that already own writes to `x`.

### 4. Why a per-note field, not a single fixed constant

A single global reference width was considered, to avoid adding per-note state at all.
It doesn't hold up against decision 2's own geometry: `LOGICAL_W = (vw−PANE_W)/renderScale`
is **uncapped** — two different desktop monitors, or the same monitor resized, produce
two different `LOGICAL_W`s at two different moments. No single constant can equal "the
`LOGICAL_W` this particular note's `x` was actually written against" for every note,
because that value is a fact about the moment of writing, not a property of the app.
Capping `LOGICAL_W` at a fixed ceiling would make a constant workable, but that reopens
decision 2's geometry formula — already specified, and not this decision's surface to
touch — purely to avoid one field. `note.rw` is the smaller, more local change: recorded
at exactly the call sites that already write `note.x`, the same way `note.scale` and
`state` already ride alongside `x`/`y` on every note.

### 5. Legacy notes

Notes with no `rw` field — anything created before this ships — are read as `rw = 900`.
This is not a migration to write: `LOGICAL_W` cannot have been anything but 900 for any
note that exists before decision 8's implementation lands, because desktop mode itself
has not shipped. `rw = 900` is simply the truth for every note that predates the field,
at zero cost.

## Blocked on

Nothing; this decision does not depend on the other open decisions. It touches only note
rendering and the drag/pinch grab path, none of which decisions 1–7 or 9 govern — those
cover desktop detection, pane geometry, board create/delete, canvas click semantics,
selection timing, board ordering, and anchors, respectively. The desktop geometry formula
this decision reads (`LOGICAL_W` becoming variable) is decision 2's, but decision 2 is
already fully specified in `DESKTOP-MODE-PLAN.md`'s Architecture section and not itself
one of the nine open decisions — this file only consumes that formula's output
(`LOGICAL_W`), it does not need decision 2 to resolve anything further first.

## Draft `DECISIONS.md` entry — paste when implementation lands

> **Numbering:** take the next free `B` number at paste time. Do **not** assume a
> specific number — the nine decision branches are resolving in parallel and claiming
> numbers as they merge. The number is assigned when the entry lands, not when it is
> drafted.

> ### B__. Cross-device note `x` — scaled, not clamped, not fixed
>
> Desktop's variable `LOGICAL_W` (`(vw−PANE_W)/renderScale`, wider than the mobile-fixed
> 900) lets a note's `x` exceed what a phone's 900-unit sheet can show. B17 already
> commits to *not* silently reflowing committed positions on resize — but B17's uniform
> whole-canvas `renderScale` only ever rescales pixels-per-logical-unit; it does not remap
> a logical `x` that was valid against one `LOGICAL_W` into one valid against another.
> **Decision:** a render-time-only ratio does that remapping — each note carries `rw`, the
> `LOGICAL_W` in effect when its `x` was last written (`createNote`/drag/pinch), and every
> render computes `renderX = note.x · (LOGICAL_W / note.rw)` in place of `note.x` for the
> note's CSS `left`, leaving the stored `x` untouched. **Why:** this is the smallest
> addition that keeps positions honestly proportional in both directions —
> desktop-authored notes compress to fit a phone, mobile-authored notes spread out on a
> wide desktop — while the persisted value never changes except by an explicit
> drag/pinch/resize, matching "positions permanent" (PRD §1) to the same standard B17
> already set. **Tradeoff:** one new per-note field (`rw`), and drag/pinch must rebase
> `note.x`/`rw` to the current frame at grab start (`app.js:573-574`, `604-605`) so
> grab-relative math isn't reading a position recorded against a different width — the
> rebase is visually silent since it happens at the exact instant the on-screen and
> rebased values are equal. **Not chosen:** a single fixed reference width (no per-note
> field) — rejected because the desktop geometry formula is uncapped, so no constant can
> represent "the `LOGICAL_W` this note was actually written against" for every device and
> every note; only recording the true value at write time is exact.
