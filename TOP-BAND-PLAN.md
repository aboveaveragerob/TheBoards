# The Top Band — Implementation Plan (issues #51, #52)

> **Status: designed, not implemented.** This document is the hand-off: the
> geometry is derived and the owner's three open calls are ruled on, but no
> source file in this commit has been touched. The implementing session executes
> the steps below on this branch. The binding record when it lands is
> `DECISIONS.md` B38, which does not exist yet — writing it is step 8.
>
> *Screenshots not seen.* The three images on issues #51/#52 could not be fetched
> (the planning session's proxy blocks `user-attachments`). Everything here is
> derived from the issue text plus the geometry history in `DECISIONS.md`
> B33–B37. If the screenshots show something the text does not say, the
> verification steps are where it will surface — trust the pictures over this
> document.

## Context

Two open issues, #51 a sub-issue of #52, both about the board's top band. This is
the fourth ruling on that band (B33 → B35 → B36 → B37). **Read `DECISIONS.md` §G
before touching anything** — each previous fix broke the next thing, and each of
those rulings is written down precisely so this one does not repeat them.

**#52 — "Title card frame is incorrect — desktop AND mobile."** The title card
should have no top frame, and the vertical frame lines must extend to the top of
the board. Today `#anchor-title` is a 4-sided 2px border at `top: 14px`. It draws
a *second* top edge 14 px below the sheet's own top edge and orphans a strip of
paper above it. The honest reading of the issue: this is not a **card**, it is a
**compartment** — the sheet's top edge is its fourth side, and only three sides
need drawing.

**#51 — "Headers still broken."** The Components/Requirements headers are not
aligned with their quadrants, and there is a gap between each header and its
section. Two symptoms, one cause: **the band reads content → rule → header.** The
anchor text sits at y=14–82 and its label at y=88 — *below* the content it names,
and 40 px clear of the rule that defines the band. The Parking Lot has read
**rule → header → items** since day one (`#lot-rule` / `#lot-header` at `top: 8`
/ `#lot-items` at `top: 34`). B35 claimed it had brought the band into line — "the
band now reads rule-then-header, the same way `#lot-rule` / `#lot-header` always
has" — and delivered half of it: it moved the labels below the card and left the
anchors above the rule. The order stayed inverted, and that inversion is both of
#51's complaints.

**Intended outcome:** one section grammar on the board. Both bands read
rule → header → content, and the title compartment is bounded by the sheet.

**The owner's rulings on the three open calls — already made, do not re-litigate:**

- **The header shrinks to fit its column; the compartment keeps its 37.7778 %.**
  In the owner's words: *"Header is nomenclature of function, not definitive of
  size requirements. Reduce the font size of requirements and components so they
  fit within their quadrant, on either side of the title box, anchored
  horizontally to the border line of their quadrants."*
- **Headers stay mirrored** — Components anchored to the left border line of its
  quadrant, Requirements to the right. The existing `left: 0` / `right: 0` rules
  are already correct.
- **The gesture recognizer is out of scope.** The headers stay inert furniture.
  (Considered and declined: making a tap on "Components" focus its section the
  way a tap on "Parking Lot" creates a lot line.)

## The geometry, derived

Everything below is fixed logical px and identical at every sheet size (B37).
`--gutter`, `--card-w`, `--card-l` and `--card-gap` are **unchanged**.

| edge | now | after |
|---|---|---|
| compartment top | 14 | **0** (the sheet's own edge) |
| band rule | 48 | 48 (unchanged) |
| compartment bottom | 82 | 82 (unchanged) |
| header label top | 88 | **56** (= rule + 8, `#lot-header`'s offset) |
| header label size | 15 px | **12 px** |
| anchor text top | 14 | **82** (= rule + 34, `#lot-items`' offset) |

**Why 12 px, not 13.** `--card-w`'s existing `min()` floor guarantees a side
column of **exactly 100 px** on every sheet narrower than ~380 units, and wider
columns above that (101.2 px at 384, 109.8 px at 414, 248 px at 900). B35
measured the widest system-ui "Requirements" at **~118 px at 15 px/600**. Scaling
linearly: 13 px needs 102.3 px and **fails** the 100 px floor; 12 px needs
94.4 px and clears it with 5.6 % slack. 12 is the largest whole pixel size that
fits the column the stylesheet already guarantees — derived, not chosen. This is
why `--card-w` needs **no change at all**, and why the test that pins the card to
145.1 px must stay green.

**Why the anchor's 82 is not derived from the compartment's 82.** They coincide
only because `--card-h` is 68 (`rule + 34` vs `band-top + 68`). Write the
anchor's offset as its own `34px` mirroring `#lot-items`; do not couple them, or
a future change to `--card-h` silently moves the section text.

---

## Steps

### 1. `styles.css` — the compartment (#52)

`#anchor-title`'s box becomes the compartment, running from the sheet's top edge.
Top padding absorbs the `--band-top` inset **plus the 2 px border that is no
longer drawn**, so the type lands on exactly the pixel it does today (content box
28..68, centred on the rule at 48).

```css
#anchor-title {
  left: var(--card-l); width: var(--card-w);
  /* The sheet's top edge is the compartment's fourth side (issue #52), so only
     three are drawn and the box starts at 0 — no orphan strip of paper above a
     second top edge, and a tap on the compartment's shoulders reaches the title
     it belongs to instead of dropping a note behind the frame. */
  top: 0; min-height: calc(var(--band-top) + var(--card-h));   /* 82 */
  display: flex;
  flex-direction: column; justify-content: center;
  /* --band-top + the 2px border-top no longer drawn + the 12px it always had:
     the type sits exactly where it did, centred on the rule at 48. */
  padding: calc(var(--band-top) + 14px) 12px 12px;
  border: 2px solid var(--ink);
  border-top: 0;
  border-radius: 0 0 2px 2px;                  /* only the corners that exist */
  background: var(--paper);
  text-align: center;
  font-size: 15px; font-weight: 600; line-height: 1.3;
}
```

Tap acknowledgment must not resurrect the top border — `border-width` sets all
four sides:

```css
#anchor-title.tapped {
  border-width: 0 3px 3px;                     /* the top stays undrawn */
  padding: calc(var(--band-top) + 14px) 11px 11px;   /* no reflow */
}
```

### 2. `styles.css` — the band's grammar (#51)

The zone begins at its rule and lays its children out exactly as `#lot` does.

```css
.band-zone {
  position: absolute;
  /* The zone begins at its rule and reads rule → header → content, the same
     three-part split #lot has always used. It was the card's own box until B37,
     which put the header *below* the text it names (issue #51). Height 0: the
     children are absolutely positioned off this top edge, and nothing measures
     the zone itself any more. */
  top: var(--rule-y); height: 0;
  pointer-events: none;
}
.band-label {
  position: absolute;
  top: 8px;                    /* #lot-header's own offset under its rule */
  width: max-content;          /* the box is the ink; alignment rules below */
  /* Nomenclature of the section, not a claim about its size — and the largest
     whole px at which the widest measured "Requirements" (~118px at 15px) fits
     the 100px column --card-w's floor guarantees. */
  font-size: 12px; font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}
.band-zone .anchor {
  left: 0; right: 0; top: 34px;   /* #lot-items' own offset: below the header */
  width: auto;
  pointer-events: auto;
  font-size: 15px; font-weight: 600;
}
```

Alignment stays mirrored — `#zone-components .band-label { left: 0 }` and
`#zone-requirements .band-label { right: 0 }` are **already correct and must not
be touched**. Each label now anchors to the outer border line of its own
quadrant, at 12 px, clearing the compartment horizontally by ~15 px on a 384
sheet.

Delete `--card-actual-h` from `.band-zone`, and rewrite the block comments above
`.band-zone` / `.band-label` — they currently explain B35/B37 reasoning that this
change reverses, and a stale comment here is worse than none.

### 3. `app.js` — delete the card-height republish

With the labels no longer hanging off the compartment, `--card-actual-h` has no
consumer. Remove all three:

- the `syncCardHeight()` definition (~line 347) and its comment block
- its call in `applyLayout()` (~line 242) and the comment above it
- its call in the `input` handler's title branch (~line 881) — **keep**
  `updateActiveCardTitle()` on the line below it

Confirm with `grep -n "card-actual-h\|syncCardHeight" app.js styles.css`
returning nothing.

### 4. `app.js` — `EXPORT_GEO` and `exportBoardPage`

The exporter restates this geometry against the 900-unit sheet and cannot read
computed CSS, so it must move in lockstep. `compL/compR/reqL/reqR` and every
`--card-w`-derived value are **unchanged**.

```js
gutter: 24, ruleY: 48,
compL: 24, compR: 272, reqL: 628, reqR: 876,
cardL: 280, cardW: 340, cardTop: 0, cardMinH: 82, cardPad: 12, cardPadTop: 28,
zoneHeaderY: 8, zoneItemsY: 34,      // mirrors lotHeaderY / lotItemsY
headSize: 15, headLH: 19.5,          // title, anchor text, lot header
labelSize: 12, labelLH: 15.6,        // the band's nomenclature (12 x 1.3)
```

`bandTop` is retired — nothing reads it once the anchor text starts at
`ruleY + zoneItemsY`.

In `exportBoardPage` (~line 1709), keeping today's draw order (rule → zones →
compartment on top, so the compartment occludes the rule):

- card height: `Math.max(g.cardMinH, blockH + g.cardPadTop + g.cardPad + g.border)`
  — **one** border now, not two
- title block top:
  `g.cardPadTop + (cardH - g.cardPadTop - g.cardPad - g.border - blockH) / 2`
- anchor text top: `g.ruleY + g.zoneItemsY + 2` (the `.anchor`'s own 2 px padding)
- label: `g.ruleY + g.zoneHeaderY`, at `g.labelSize` / `g.labelLH`; keep each
  zone's existing `align` (`'left'` / `'right'`)
- replace the card's `p.frame(...)` with a new `frameOpenTop` helper

Add `frameOpenTop` beside `frame` (~line 1568), reusing `p.rect` /
`p.strokeColor` / `p.lineWidth` / `pdfNum` exactly as `frame` does. Fill a plain
rect, then stroke down the left, across the bottom, and back up the right — inset
by `bw / 2` on the three drawn sides only, the same half-width correction `frame`
makes for a CSS border drawn inside its box. Comment that the 2 px bottom radius
is dropped: at the export's 0.581 A4 scale it is ~1 pt, and a three-segment path
is honest about which sides exist.

### 5. `sw.js` — bump the cache

`todo-boards-v6` → `todo-boards-v7`. **Non-optional.** B36 exists because a
correct stylesheet reached `main` and never reached the device.

### 6. `test/mobile.js`

Most assertions survive untouched. These are the ones that encode the rulings
being reversed:

- **[9c]** — currently *"A title that outgrows the card takes the headers with
  it."* **Invert it.** The labels no longer follow the card; a grown title must
  leave them at `rule + 8`. Assert: the card grows past 82; both labels' top is
  still 56; both still clear the compartment horizontally; the free-canvas floor
  still holds. Rename the block to match.
- **[11]**
  - `titleBorder` (`borderTopWidth === '2px'`) → assert `borderTopWidth === '0px'`
    **and** `borderLeftWidth === '2px'`
  - **new:** the compartment reaches the sheet's top edge (`#anchor-title` rect
    top === `#board` rect top)
  - `the rule crosses the card at its middle` → replace: the rule is at 48 and
    the compartment's bottom is at 82. The box is no longer symmetric about the
    rule; its *type* still is.
  - `band labels clear the card` → replace with **`label.top - rule.top === 8`**
    plus a horizontal clearance check (components right ≤ card left; requirements
    left ≥ card right)
  - **new:** labels render at 12 px
  - keep `band labels are not clipped` and `stay inside the gutters` **exactly as
    they are** — they are what catches a bad font-size choice
  - free-canvas measure: change `lot.top - labelBottom` to
    `lot.top - max(card.bottom, anchor.bottom)`; expect ~68.8 % against the
    existing `>= 0.68` floor
  - `title card is 37.7778% of the sheet` (145.1) — **unchanged, and it must stay
    passing.** It is the guard that `--card-w` was not touched.
- **[11b]** — `label clears the card and the lot` → the label sits 8 px under the
  rule and above the lot. Keep the free-canvas measure as `lot.top - card.bottom`
  and the `0.65` / `0.60` floors: `card.bottom` is still 82, so they hold
  unchanged.
- **[11c]** — rewrite for `cardTop: 0`, `cardMinH: 82`; drop the
  `bandTop === cardTop` assertion; the label offset becomes
  `ruleY + zoneHeaderY === label.top`; add `zoneItemsY` agreement with the
  rendered anchor top, and `labelSize` agreement with the rendered label's
  computed font-size.
- **[8]** (~line 222) and **[10]** (~line 348) — **comments only.** *"the top
  band, whose labels end at y=107.5"* is now the anchors ending at y=126. Every
  tap point is at y ≥ 180 and stays on bare canvas: **do not move any
  coordinate.**

### 7. `test/desktop.js`

**[D8]** only: `titleBorder: w('#anchor-title').borderTopWidth` →
`borderLeftWidth`, plus a new `borderTopWidth === '0px'` assertion. `title card
is 340px`, `band rule sits at y=48` and `zones clear the card on both sides` all
stay green unchanged — that is the evidence desktop was not disturbed.

### 8. `DECISIONS.md` — write B38

House style is a numbered ruling carrying its reasoning, its costs and its
impermanence. Append to §G, in the register of B35–B37. Record:

- **The card is a compartment** (#52). The sheet's top edge is its fourth side; a
  drawn top edge was a second one, with an orphaned strip of paper between them.
  Consequence worth naming: the compartment's shoulders are now part of the
  title's hit area, so a tap there focuses the title instead of creating a note
  behind the frame — geometry fixing a misfire nobody filed.
- **The band adopts the lot's grammar** (#51). Rule → header → content. B35
  claimed this and delivered half of it: it moved the labels and left the anchors
  above the rule, so the band read content → rule → header. That inversion *is*
  both of #51's symptoms, and it is why #49's fix did not settle the headers.
- **The header is nomenclature, and sets at 12 px.** The owner's ruling, plus the
  arithmetic that makes 12 the number rather than a taste: ~118 px measured at
  15 px, a 100 px column guaranteed by `--card-w`'s floor, 12 the largest whole
  px that fits. Name that the floor's `100px` is now load-bearing in a second way
  and that the two must move together.
- **`--card-actual-h` and `syncCardHeight()` are deleted.** B37 added them for
  one job — labels following a grown card — and the labels no longer hang off the
  card. A CSS var, a JS function and a per-keystroke `offsetHeight` read removed
  because the geometry got simpler.
- *Known, not fixed:* `#lot-header` stays at 15 px, so the board now names its
  sections at two sizes. The lot header has the full sheet width and is under no
  pressure to shrink; unifying them is a hierarchy call nobody has made.
- *Impermanent:* `EXPORT_GEO` is still a second copy of this geometry. [11c] pins
  it to the rendered board, which is as close to one source as two files get
  without a shared module.

---

## Verification

```
python3 -m http.server 8000        # serve the repo root
node test/mobile.js                # must exit 0
node test/desktop.js               # must exit 0
node test/sw-update.js             # must exit 0 — proves the v7 bump ships
```

`npm install playwright` first if it is not on `NODE_PATH`. All three exit
non-zero on failure. `test/README.md` warns that a suite which cannot fail is
lying: after editing an assertion, revert the source change locally and confirm
that assertion goes red before restoring it.

Then look at it, at 384×846 in a mobile emulation profile:

1. **Blank board.** Two vertical strokes run from the very top edge of the sheet
   down to the compartment's bottom; no horizontal line across the compartment's
   top; the band rule butts into both verticals and is occluded between them.
2. **Both headers** sit just under the rule, level with the compartment's lower
   half — Components on the left gutter, Requirements on the right, neither
   touching the compartment nor spilling past a gutter.
3. **Type into Components.** The text appears *below* its header, not above it.
4. **Type a three-line title** ("LinkedIn Learnings To Do", the reporter's own).
   The compartment grows downward; the headers do not move.
5. **Tap the strip at the very top of the compartment.** The title focuses — it
   does not create a note.
6. **Long-press the title → Export.** Page one of the PDF must match the screen:
   a three-sided compartment reaching the page's top edge, headers under the rule
   at the smaller size, anchor text below them.
7. **Dark mode**, and **desktop** at ≥ 1024 px wide: the compartment is 340 px
   and the rule is at y=48, unchanged.

## Done

- [ ] Both issues' complaints reproduced before the change and gone after
- [ ] All three suites green, and each edited assertion confirmed able to fail
- [ ] `grep -n "card-actual-h\|syncCardHeight" app.js styles.css` → nothing
- [ ] `sw.js` reads `todo-boards-v7`
- [ ] B38 written in `DECISIONS.md` §G
- [ ] This file's status blockquote updated to *implemented*, or the file deleted
      — `DECISIONS.md` B38 is the binding record once the work lands
