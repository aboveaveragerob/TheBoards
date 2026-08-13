# UIUX.md — To-Do Boards

**Status:** v2. This is the rendering authority — the document `app.js`,
`styles.css` and `DECISIONS.md` have cited as `UIUX §x` since the first commit,
written down for the first time.

**How to read this with the other records.** `PRD.md` says what the product is
and what it must do; this says what it looks like and how it behaves under the
hand. Where the two disagree about a rendering decision, **this document wins** —
that is what "rendering authority" means, and `DECISIONS.md` A1 already resolved
one such conflict that way. `DECISIONS.md` remains the v1 reasoning history;
where §§ below supersede a numbered ruling, they say so by number.

Sections §1–§12 keep the meanings the code already cites. New v2 material is
numbered §13 and up, so no existing citation moves.

---

## §1 Governing law

> **If you have to think about the interface, it failed.
> Every pixel earns its place.**

And its corollary, which predates this document and survives it:

> **Identity comes from structure — frame, scratch-out, surface tone — never
> costume.**

**And the test that separates the two, which a flat surface cannot pass.** A
gradient present because interfaces have gradients is costume. A gradient that
encodes something true about the page is structure. The distinction is not the
technique but the job: the sheet's edge falloff (§2.8) renders the page's bound
on the mobile path, where `renderScale = 1` leaves no letterbox to draw an edge
against — a thing the product claims about itself and could not otherwise show.
**Anything that cannot name its job in one sentence is costume and comes out.**

Two consequences hold throughout, without exception:

- **Never colour alone.** Every state distinguished by colour is also
  distinguished by geometry, position or texture. Completion is a texture. Focus
  is a ring. Destructive is last, behind a hairline. The toast's Undo is
  underlined. Selection is an outline.
- **Elevation means "temporary, above the page."** Shadow is reserved for
  transient surfaces — menu, toast, drag ghost. **Notes carry no shadow.** A note
  is *on* the page, not floating over it.

### §1.1 The register

The board should feel like a place you are glad to return to. Not
productive-anxious, not gamified, not neutral-corporate.

The imagery is **calm water** — and note the register carefully: water at depth
and at dusk, not noon glare. That is why the palette is dark. Deep water is
peaceful; a bright white productivity surface is not. The one lit thing in the
room is the note you just wrote.

This does not license decoration. Peace is produced by restraint, depth and
consistency. Where a value below is decorative rather than structural, it is
wrong and should be removed.

---

## §2 Design tokens

### §2.1 One theme

**The app is dark-only.** The light/dark pair driven by `prefers-color-scheme`
(B16) is retired — the whole light `:root` and the `prefers-color-scheme: dark`
block are **removed, not overridden**.

This is not a default with an escape hatch. `PRD §1.2` forbids the setting: the
app asks nothing of the person, and a theme is a question. One identity, no
choice to make.

### §2.2 The surface ladder

**Two of these are not values.** The sheet is a *field* (§2.8) and the shelf is
a *texture* (§2.9). Both are given as ranges, and **every ratio in this document
is stated against the worst extreme of its range**, never against a midpoint.

| Token | Value | What it is | Rel. luminance |
|---|---|---|---|
| `--band` | `#020812` | Components and Requirements — the deepest surface on the page | 0.0023 |
| `--card` | `#08152c` | the title compartment, sitting just above the band | 0.0077 |
| `--board` | `#34697f` → `#255265` → `#163646` | **the sheet, as a field** — §2.8 | 0.1237 … 0.0325 |
| `--frame` | `#698ebf` | the card's border and the full-width rule — §2.5 | 0.2611 |
| `--note` | `#a0d4da` | the note | 0.5962 |
| `--shelf` | `#e3d2b5`, with weather | **the Parking Lot, as a texture** — §2.9 | 0.5133 … 0.7333 |
| `--letterbox` | `#000000` | the desk — **never drawn**, see below | 0.0000 |

`--furniture` is retired; `--band` and `--card` replace it, because the
compartment and the two zones are no longer one surface. `--line` was already
deleted (§2.3).

**The page reads top to bottom as one scene:** near-black at the top, water
through the middle, lit sand at the foot. The band is the deepest thing on it —
an inset header you read past — and the card sits fractionally above the band at
1.10:1, separated by its border rather than by its fill (§2.5).

> **The note is no longer the brightest surface, and that retires a claim this
> document used to make.** At 0.5962 the note now sits *below* the shelf's
> 0.6576. The old sentence — "the note is the brightest thing on the board
> because it is the only thing the person *placed*" — is simply false against
> these values, and `§1.1`'s "the one lit thing in the room is the note you just
> wrote" is true only of the canvas, not of the sheet.
>
> Nothing is broken by it: the note still separates from the sheet by fill at
> 3.72:1 and from the shelf by its frame at 1.09:1 fill. But the ladder's
> ordering argument no longer holds, and **it is an open question** whether the
> shelf should come down below the note or the claim should be reworded. Not
> decided here.

**On `--letterbox`.** It is **never drawn.** `applyLayout()` derives both logical
dimensions by dividing the viewport by the render scale, on *both* paths, so the
sheet fills its area exactly at every viewport — the code says so in its own
comments twice. The desk appears for 260ms during a desktop board swap, when
`#board` crossfades to `opacity: 0`, and nowhere else. The token, its rationale,
and every row it occupies in §2.5 and §2.7 are therefore specified against a
condition that does not occur. **Open, and not resolved here:** either the layout
maths change so the desk is real, or the token and its rows come out.

### §2.3 Ink — one per surface, not one per app

Two poles:

| Token | Value | Bound on |
|---|---|---|
| `--ink-light` | `#f4f5f1` | `--band`, `--card`, `--board`, `--chrome` |
| `--ink-dark` | `#031019` | `--shelf`, `--note` |

Verified contrast for every text-bearing surface, **each at the worst extreme of
its range**:

| Ground | Ink | Ratio | Level |
|---|---|---|---|
| `--band` `#020812` | light | **18.33:1** | AAA |
| `--card` `#08152c` | light | **16.62:1** | AAA |
| `--board`, lightest stop `#34697f` | light | **5.52:1** | AA |
| `--board`, darkest stop `#163646` | light | **11.62:1** | AAA |
| `--shelf`, base `#e3d2b5` | dark | **12.96:1** | AAA |
| `--shelf`, darkest wisp `#d4bfa0` | dark | **10.77:1** | AAA |
| `--note` `#a0d4da` | dark | **11.84:1** | AAA |

Every pairing clears AA; every one but the sheet's lightest stop clears AAA. The
sheet is the only surface where the field's extreme matters to text, and 5.52:1
is that extreme rather than an average.

**`--ink` is no longer a single value.** v1 used one `var(--ink)` for note text,
lot text, band labels, rules, hairlines and borders alike, which worked only
because there was one ground per theme. With a six-ground ladder the ink pole
flips at the surface, so ink is **rebound at each surface boundary** and
inherited downward:

```css
:root        { --ink-light: #f4f5f1; --ink-dark: #031019; }
.on-dark     { --ink: var(--ink-light); --ink-a: 244 245 241; }
.on-light    { --ink: var(--ink-dark);  --ink-a:   3  16  25; }
```

`#board`, `#menu`, `#toast`, `#pane`, `#anchor-title` and the band zones carry
`.on-dark`; `#lot` and `.note-text` carry `.on-light`. Everything downstream —
text, caret, rules, hairlines, borders, the scratch-out — keeps reading
`var(--ink)` and `var(--ink-a)` unchanged.

This matters beyond tidiness: it means the v1 stylesheet was **already written
for this**, and the change is a rebinding rather than a rewrite. `--ink-a` stays
channel-synced to `--ink` for the scratch-out's buried text (§4.3).

**`--line` is deleted.** v1's mid-grey had four jobs — rules, hairlines, disabled
states, the tap-ghost — and at `#717575` it failed the first two on the grounds
they are actually drawn on (1.64:1 on `--board`, 1.99:1 on `--shelf`). Each job
now resolves to the surface's own ink at a different weight: rules at full ink
(§2.5), hairlines at an alpha (§2.5), disabled at `opacity`, the tap-ghost at a
low alpha. **One ink per surface, expressed at three weights** — fewer tokens,
and every one of them legible where it lands.

### §2.4 Elevation

Transient surfaces only: `#menu`, `#toast`, `.pane-drag-ghost`.

```css
--elevation: 0 2px 8px rgb(0 0 0 / 0.45);
```

The desktop rail is the inverse — an **inset** shadow, because it is embedded in
the page rather than floating over it. **Notes take no shadow** (§1).

### §2.5 Edges, rules and hairlines — the separation rule

> **A surface's edge is drawn in that surface's own ink.**

One rule, and it is load-bearing rather than stylistic. Two surfaces that touch
must separate. Either the **fill** does it (≥3:1) or the **edge** does.

Every adjacency that occurs on the sheet, **each at the worst extreme of the
field** — which for a "is the sheet too light" question means the top stop:

| Touching | Fill | Edge | Separated by |
|---|---|---|---|
| **title card / band** | 1.10 | `--frame` **5.39** / **5.95** | **edge** |
| **note / note** (overlap) | 1.00 | dark ink **11.84** | **edge** |
| note / Parking Lot | 1.09 | dark ink **11.84** | edge |
| band / sheet | **3.32** | — | fill |
| title card / sheet (where it overhangs) | **3.01** | — | fill |
| Parking Lot / sheet (darkest wisp) | **3.39** | — | fill |
| note / sheet | **3.72** | — | fill |

Three consequences worth stating out loud:

- **The note's 2px frame is the only thing separating two overlapping notes**
  (1.00:1 fill — they are the same colour). Free overlap with no snapping is a
  core behaviour (`PRD §1.2`, P2), so the frame is not chrome around the note; it is
  what makes overlap legible. This is §1's "identity from structure" doing real
  work rather than asserting itself.
- **The card's border is the second load-bearing edge.** At 1.10:1 the card does
  not separate from the band by fill at all, by design — it is meant to be quiet.
  Its border carries the whole separation, which is why `--frame` is a token and
  not a decoration.
- **The full-width rule is *not* load-bearing.** Band and sheet already separate
  by fill at 3.32:1, so §2.5 is satisfied without it. The rule is a **section
  mark** — it says where the band ends — and it carries no 3:1 obligation. That
  is precisely what freed it to stop being white.

**`--frame` `#698ebf`.** One token for the card's border and the full-width rule
together: they were the only white marks in the band, and colouring one without
the other clashes. It is a lift of the band's own hue, so the linework belongs to
the band rather than being applied to it. Clears 5.39:1 on the card, 5.95:1 on
the band.

> **Chosen implicitly.** `#698ebf` was the frame carried by the "A Well"
> specimen, which was selected for its card fill. It was never picked on its own
> against the two alternatives that were rendered beside it — muted ink
> `#727a85` and a sand line `#b29c76`. Recorded as settled, but settled by
> adoption rather than by choice.

**The lot's top rule is still drawn, and still questionable.** With the shelf at
3.39:1 against the sheet the fill already announces the section, so a rule on top
of it is two marks doing one job. *Impermanent* — the case for keeping it is that
a full-bleed section closed by a rule is a section idiom, while a box is enclosed
on four sides. **Not decided.**

**Hairlines.** A separator is that surface's ink at the lowest alpha clearing
3:1 on it — `0.40` on `--chrome`, where the only separators in the app live
(the menu's destructive divider, §7). v1's `0.14` was 1.43:1 there: invisible,
and therefore not earning its place at that weight.

```css
--hairline: rgb(var(--ink-a) / 0.4);
```

### §2.6 Accents

| Token | Value | Role | on `--chrome` * | on the old `--furniture` * | label when filled |
|---|---|---|---|---|---|
| `--accent-restore` | `#B7E3E1` | Complete / Restore / Undo | 13.82:1 | 12.24:1 | 13.82:1 |
| `--danger` | `#E2A08C` | Delete | 8.83:1 | 7.82:1 | 8.83:1 |
| `--accent-page` | `#6E9C9A` | rail pager, drop target | 6.30:1 | 5.58:1 | 6.30:1 |

> **An accent is text only on a near-black ground — `--chrome`, `--band` or
> `--card`. Anywhere else it is a fill carrying `--ink-dark`.**

\* The two ratio columns are measured against the **retired** `--furniture` and
the round-1 `--chrome`, and are carried here unrevised — see the note below.

This rule is the correction to a real hole. `--danger` is 3.51:1 on `--board` and
`--accent-page` is 2.50:1 — as text those are below AA and below the 3:1 non-text
floor respectively. As *fills* they are fine (a filled Delete button on the sheet
is 3.51:1 against it, which is what a UI component needs, and its label rides at
8.83:1). The placement rule keeps every accent on a ground where it works, and no
value has to change.

`--danger` is **the only *saturated* warm hue in the application.** The
qualifier is new and necessary: the Parking Lot is now warm sand (§2.9), so
"the only warm hue" is no longer true. Sand is warm-neutral at 46% saturation
and `--danger` is warm-chromatic at 60%; they are never adjacent, since sand is
a ground and danger is a fill on chrome. The distinction the rule was making —
*the one thing that destroys is the one thing that isn't cool water* — survives
with the one word added.

> **The accents in this table have not been re-derived against the navy.**
> `--accent-restore`, `--danger` and `--accent-page` were tuned against the
> round-1 teal `--chrome #031019`, and the ratios above are measured against
> that. `--chrome` itself, the menu, the toast and the desktop rail have not
> been rendered since the palette moved to navy. **This is the largest open gap
> in the system** and none of it should be treated as settled.

### §2.7 Focus

**The ring is two-tone**, and that is structural rather than stylistic:

```css
outline: 2px solid var(--ink-light);
box-shadow: 0 0 0 4px var(--ink-dark);
outline-offset: 2px;      /* -2px on inset rows */
```

No single colour works on every ground — `--ink-light` is 1.36:1 on the shelf,
`--ink-dark` is 1.04:1 on the band. The two are exactly complementary, so the
doubled ring clears 3:1 on every ground **by construction**, not by tuning. Both
extremes of the field are checked, since the ring can land anywhere on it:

| Ground | light tone | dark tone | best |
|---|---|---|---|
| `--band` | 18.33 | 1.04 | **18.33** |
| `--card` | 16.62 | 1.06 | **16.62** |
| `--board`, lightest stop | 5.52 | 3.18 | **5.52** |
| `--board`, darkest stop | 11.62 | 1.51 | **11.62** |
| `--shelf` | 1.36 | 12.96 | **12.96** |
| `--note` | 1.48 | 11.84 | **11.84** |

This is B15's "robustness from geometry, not hue," carried into the new palette
and made total. The sheet's lightest stop is the only ground where *both* tones
clear 3:1 at once, which is a margin rather than a problem.

### §2.8 The board is a field, not a value

A flat fill cannot carry §1.1's register. Peace is a property of depth, and depth
is a field. Three layers, and **each one holds a job or it comes out** (§1):

1. **The vertical fall** — `#34697f` → `#255265` → `#163646`, top to bottom.
   Light from above, depth downward. It also makes the sheet's vertical order
   mean something: the band is the inset dark end, the lit sand is the floor.
2. **The edge falloff** — a radial darkening toward the sheet's bounds. This is
   the layer that earns the most. `PRD` requires the sheet to draw its bound,
   and **on the mobile path it cannot**: `renderScale = 1`, the sheet *is* the
   viewport (B32), and there is no letterbox to draw an edge against. A luminance
   falloff is the only way a bounded page can be felt on the device where nearly
   all the use happens. That is the product's central claim getting rendered.
3. **Dither** — noise at anti-banding amplitude. The blue channel travels 45
   steps across an 846px sheet, one step every 19px, which an 8-bit panel shows
   as horizontal banding. This is repair, not texture.

**The field is authored as opaque stops**, so its extremes are exactly the
declared colours rather than something to sample. The falloff and the dither can
only *darken or perturb below the threshold of a ratio*, so **the top stop is the
single worst case** for every adjacency in §2.5 — which is what keeps the
verification tractable now that the ground is not flat.

### §2.9 The shelf is weather

The Parking Lot is a warm sand that is **not** a flat fill either: base
`#e3d2b5`, running `#eaddc7` → `#dbc7a3`, with wisps in pink `#d7b7ad`, grey
`#bec3bb` and taupe `#d4bfa0`. Hue 38° at 46% saturation — warm without being
brown, which it would become at low HSL lightness rather than at low luminance.

The wisps are **stretched turbulence**, not gradients: `feTurbulence` at a low
horizontal and a high vertical frequency produces long soft filaments where broad
radial gradients produce blobs that average into cream. One inline SVG, no
dependency, no build step.

> **Banding comes from long monotonic ramps, not from amplitude.** An earlier
> pass tightened these striations to 1.17:1 out of a fear of banding, and got a
> flat cream for it. A smooth run gives the quantiser something to step through;
> irregular overlapping wisps do not band at *higher* amplitude, because no run
> is long or smooth enough to step. The correct move was more structure and more
> amplitude at once.

---

## §3 Board geometry

The board is a fixed, bounded logical coordinate space rendered through a single
uniform `transform: scale()`. It never pans and never zooms; browser pinch-zoom
is disabled at the platform level because the two-finger pinch belongs to the
note (B12).

| | Touch | Fine pointer ≥1024px |
|---|---|---|
| `LOGICAL_W` | `vw` | `(vw − 300) / renderScale` |
| `LOGICAL_H` | `vh` | `vh / renderScale` |
| `renderScale` | `1` | `min(vh/1000, (vw − 300)/900)` |
| `offX` | `0` | `300` (the rail) |
| Floor | — | Neither logical dimension below 900×1000 |

**The reference sheet is 900×1000** — what band and lot proportions are derived
against and what the export draws, distinct from the live viewport-derived
dimensions.

Two rendering facts belong alongside it:

- **The scale is uniform.** Note frames stay square and the decoupled hit maths
  (§6) stays exact. A *cover* fit would crop edge furniture; an axis-decoupled
  *stretch* would distort the frame. Neither is available.
- **Band geometry is sized by the type it holds, not by the sheet** (B37).
  Across is a fraction of the sheet, because it holds the sheet's own divisions.
  Down is set by the type.

> The band has been ruled on five times: B33 → B35 → B36 → B37 → B38. Read that
> chain before changing band geometry. Each ruling corrected a regression the
> previous one caused. **§13.2's measurement gate is now discharged** — the
> results are there.

### §3.1 The band, and the two sections that bound the sheet

**The section sits above the rule.** The rule is the band's *bottom edge*, not a
division inside it — which makes the band the exact mirror of the Parking Lot at
the other end: a section closed by a full-width rule at each end of the sheet,
with the free canvas between them.

Reading down: **Components / Requirements content, then its header, then the
rule.** The header is **centred in its zone and sits on the rule**, at 12px/600
with 10px of clearance beneath it.

**Both rules run the full width of the sheet** — `left: 0; right: 0`, not inset
to the gutter. **This supersedes B35 and B38's gutter-inset rule.**

**The band sizes to its tallest zone, from a two-line floor:**

```
rule-y = 14 + max(2, lines) × 19.5 + 8 + 15.6 + 10
       = 87px at the floor, 106px at three lines
```

A fill has to have a bottom edge and the band's content does not have a fixed
height — at 384 wide the Requirements column is ~101px, so "Under 2k, keep the
window" sets to three lines. A fixed band left the third line on open water. This
is deliberately **the same law the Parking Lot uses**, stated once and applied to
both pieces of furniture rather than two schemes that drift apart.

**The title compartment overhangs the band by 22px and occludes the rule.** That
is B38 and it has never been in question. The sheet's own top edge is its fourth
side, so only three are drawn. It is the one deliberate exception to "no empty
frames" (§4) — that rule protects the free canvas; the compartment is permanent
furniture and is always drawn.

### §3.2 The Parking Lot is a section, not a box

**Full-bleed**: `left: 0; right: 0; bottom: 0`, with its *content* still on the
gutter. It lives as a section of the page rather than a box bolted onto it.
**This supersedes B32's "the sheet keeps one left margin"** as it applied to the
lot.

**Its height follows its contents, from a two-row floor:**

```
lot-h = 34 + clamp(2, n, maxRows) × 44
```

Empty, one row and two rows all draw the same two-row shelf — furniture, not a
by-product of content. The third row grows it *upward*, since the section is
anchored to the sheet's bottom edge. `maxRows` is B37's viewport-derived budget,
retained as a **ceiling** so a long lot cannot swallow the canvas; a row past it
still exists, still saves and still exports. **This supersedes B37's fixed
whole-row budget**, keeping only its cap.

---

## §4 The note component

```css
.note-text {
  background: var(--note);            /* #89c7c5 */
  color: var(--ink);                  /* rebound dark here — 10.11:1 */
  border: 2px solid var(--ink);       /* §2.5 — dark on this surface */
  border-radius: 3px;
  padding: 10px 12px;
  font-size: 17px; line-height: 1.4;
}
.note-text:empty { background: transparent; border-color: transparent; }
```

**No empty frame ever exists.** The frame draws itself on the first character and
is transparent before it — enforced at blur (B8) and again on every render (B31).
A note earns its frame the way it earns persistence.

**The radius stays near-square.** Notes scale 0.5–2.0 and `NOTE_MIN_W` is 60, so
a large radius inside `transform: scale()` turns a minimum-width note into a
capsule. 3px is a geometric constraint, not a taste: it reads as *drawn* at every
size the note can be. It moves 2 → 3 from v1 to hold that reading against the new
2px frame; `EXPORT_GEO.radius` mirrors it by hand (§15).

**The note carries no shadow** (§1).

### §4.1 Transform origin

`transform-origin: top left` throughout, so stored `x`/`y` stay truthful and
there is no drift to compensate (B4). Positions are data (`PRD §1.2`, P3); a
rendering choice that required correcting them would be rewriting them.

### §4.2 States

| State | Drawn as |
|---|---|
| empty | no frame, no fill |
| resting | 2px frame, `--note` fill |
| pressed (drag/pinch engaged) | frame 3px, padding compensates so nothing reflows |
| tapped (the action window is open) | same as pressed — one state, two moments |
| editing | §2.7 focus ring + visible caret |
| selected (desktop) | outline, not a fill — a fill is the completion mark |
| complete | §4.3 |

Nothing here is colour alone (§1): every state has a geometry.

### §4.3 The scratch-out

Completing does not delete and does not hide. Three families of ruled strokes at
≥90% coverage — **texture, not colour** — in the surface's own ink at 10.11:1,
with the underlying text destroyed to 40% ink so no screenshot or zoom recovers
it. The radius tracks the note's.

The buried text lands at 2.37:1 on a note and 2.28:1 on a shelf line. **That is
the target, not a failure:** the content is deliberately illegible, and legibility
minima do not apply to something the person has asked the app to strike out.

Completion is reversible. In the PDF export a completed item is drawn scratched
out and **emits no text object at all** — the on-screen promise becomes a
property of the bytes (B34).

### §4.4 Lot lines are never framed

Parking Lot items are unframed stacked text lines: the one place in the app where
text carries no frame. That is the visual expression of the structural fact that
a lot item has no coordinates (`PRD §4`).

The one override is narrow and scoped: on desktop, a selected row draws an
`outline` with its actions inline at the row's right edge (B25). Selected, on
desktop, and nowhere else.

---

## §5 Gestures

One custom recognizer drives both grammars, branching inline on `isDesktop` — a
live capability test, never a width or UA test (B19). There is no separate
desktop code path.

| | Mobile | Desktop |
|---|---|---|
| Create | tap empty canvas | click empty canvas (nothing selected) |
| Select | — | click |
| Move | drag | drag |
| Scale | two-finger pinch | drag the selection frame |
| Edit | tap | double-click, or `Enter` |
| Menu | long-press (500ms) | right-click |
| Caret on edit | at the touch point (B14) | at the end (B26) |
| Boards | full-screen list | always-visible rail |

`MOVE_THRESHOLD = 16px` of slop before a drag begins or a long-press cancels
(B29). `LONGPRESS_MS = 500`; any release before that with movement under
threshold commits as a tap (B5).

**Acknowledgement, not idleness.** Every committing action passes through a 400ms
window measured from release (B18), and that window is *filled* — content
thickens, controls fill, an empty-canvas tap raises a `.tap-ghost`. A second tap
inside an open window is **dropped, not queued**. 400ms of nothing is
indistinguishable from a dropped tap.

A note is never *filled* as acknowledgement, because a filled note is the
completion scratch-out.

Three things sit outside the window deliberately: **mobile capture** (a browser
raises the soft keyboard only inside user activation — B27), **desktop selection**
(it commits nothing, and a delay would swallow every double-click — B22), and
**rail page turns** (likewise commit nothing — B42).

---

## §6 The touch floor

**44 CSS px physical on mobile** (WCAG 2.5.5 AAA). Because notes scale, this
cannot be a fixed padding: each note carries a computed `--hit` inset on a
transparent `::before`, sized so that `inset × scale × renderScale ≥ 44px`
physical (B7). **The hit area expands; the visual frame does not.**

On desktop the floor is 24px (WCAG 2.5.8 AA, pointer-appropriate) — a 44px collar
swallows dismiss clicks (B23). The 44px floor stands on touch.

---

## §7 The menu

Long-press (mobile) or right-click (desktop).

| Menu | Items |
|---|---|
| Item | All boards · Complete/Restore · Copy · Delete |
| Anchor | Export · All boards |
| Board row / rail card | Export · Delete |
| Desktop selection | Complete · Copy · Delete |

Ordering is **navigation first, then the item's own actions in rising severity**
(B43, superseding A1). The destructive action is **always last, in `--danger`,
behind a hairline** — and never distinguished by colour alone (§1): position and
the divider carry the meaning independently.

Every menu says "All boards"; the list view's own heading stays "Boards".

No long-press timer is armed over bare canvas or lot background — the release
still captures — and the `pointerdown` that dismisses an open menu is inert and
creates nothing, because dismissal is a retraction, not a choice of what was
underneath (B30).

---

## §8 Motion

**A closed, justified set. Nothing else animates.**

| What | Property | Duration |
|---|---|---|
| `#menu` | opacity | 200ms |
| `.note-scratch` / `.lot-scratch` | opacity | 200ms |
| `#toast` | opacity + transform | 200ms |
| `.leaving` (note, lot, row, card) | opacity | 200ms |
| `html.desktop #board.swapping` | opacity | 260ms |

Curve: a long deceleration — `cubic-bezier(0.22, 0.61, 0.36, 1)`. The durations
lengthen from v1's 120/150ms because §1.1 argues for a water-like settle, and a
120ms fade reads as a flicker rather than a movement.

**The set does not grow.** No new motion has earned its place. Two things stay
instant and are not candidates:

- **Note capture** (§5, B27) — the caret must arrive with the tap.
- **The control press-translate** (§14) — a control that lags feels broken, not
  calm.

**`prefers-reduced-motion: reduce` is a mandatory global kill-switch.** The
board-swap crossfade is sequenced by timeout in JS specifically so it degrades to
an instant swap rather than breaking.

---

## §9 The undo toast

Delete is undoable for **5 seconds** via a `role="status"` toast that restores
exact prior state, including a note's original index in its collection. A batch
delete is **one** window, one save and one Undo. A new destructive action
finalizes or cancels the prior undo.

The toast sits on `--chrome` with `--elevation` (§2.4) and a light edge (§2.5).
Its Undo is `--accent-restore` text distinguished by **underline** — not colour
(§1).

A save-failure toast must never clobber a pending Undo (B13).

---

## §10 The board list and the rail

**Mobile:** a full-screen list on `--chrome`, newest first. Routing uses the
History API specifically so the OS back gesture returns you to the board (B9).
Back is never intercepted, shadowed or disabled.

**Desktop:** an always-visible 300px rail (B24) — **sunken, not floating** (§2.4),
sitting outside `#board` so the recognizer never sees its events. Cards are
`--board` on `--chrome`, compact, ordered `createdAt` desc with an `id` tiebreak:
immutable, so a card's slot never moves.

The rail sorts into **To-Do / Idea / Unsorted**, and a pointer-drag moves a card
between sections with the target section framing itself in `--accent-page`.
Overflow **pages** rather than scrolling, and a single page hides its own pager:
no state, no statement (B42).

**Truncation is always indicated** — `text-overflow: ellipsis`, never a hard cut.

A rail board swap is a 260ms crossfade (§8) with **no history push** — B9 is
bypassed, not touched.

---

## §11 Scale to fit

One logical page, one render scale. Stored coordinates are converted for display
and **never mutated by a layout change** — a rotation, a fold or a window drag
changes how a position renders, never what it is.

**A correction is outstanding here, and it is not part of this release.** The
current mapping is anisotropic: `x` maps by `LOGICAL_W/rw` and `y` by
`LOGICAL_H/rh` — two ratios — while size maps on the width ratio alone. When
those ratios diverge, which is exactly what folding a device does, relative
arrangement distorts. B40 named and accepted this; issues **#65** and **#75**
report it. The fix is a similarity transform — one ratio for both axes and for
size — which supersedes B40, and it ships as its own change (`PRD §3.3`).

---

## §12 Accessibility

Non-negotiable. The target is **WCAG 2.2 AA**, with AAA where the product already
reaches it. This section is the specification; `PRD §6` states only the parts a
test can prove.

- Every editable region carries `role="textbox"` / `aria-multiline`.
- The toast is a polite `role="status"`.
- Focus is visible on every interactive element via §2.7's ring, at
  `outline-offset: 2px` on free-standing controls and `-2px` on inset rows.
- **Never colour alone** (§1), everywhere, without exception.
- Truncation is always indicated (§10).
- The desktop rail is hidden from assistive technology off-desktop.
- Keyboard: `Esc` deselects or commits an edit, `Delete` removes the selection,
  `Enter` edits it.
- `prefers-reduced-motion: reduce` kills all motion (§8).
- Touch targets meet §6.

---

## §13 Typography and marks

*New in v2.*

### §13.1 The typeface

**Montserrat Alternates**, self-hosted, **no CDN**.

A CDN font is a network dependency and an uncacheable hole in an offline-first
shell (`PRD §5`). Fonts live in `fonts/`, are declared with `@font-face`, are
listed in `sw.js`'s `ASSETS`, and are subject to the cache bump.

**Three weights** — 400, 600, 800 — as Latin-subset `woff2`, with
`font-display: swap` so capture is never blocked on a font load. Montserrat
Alternates has no variable version, so each weight is a separate file; three is
the smallest set covering body, the existing 600 emphasis, and the button's heavy
label.

Size scale is retained: 11 · 12 · 13 · 14 · 15 · 16 · 17 · 18px; line-heights
1.3 / 1.4 / 1.45.

### §13.2 The band measurement gate

Montserrat Alternates has a different apparent x-height from `system-ui`. The
band is **sized by the type it holds** (B37, §3), so changing the type changes
the band. **The gate is discharged.** Measurements taken from the font's own
`hmtx` advances, with no kerning applied, so every figure is a conservative
upper bound on what a browser draws:

| # | Measurement | Result | |
|---|---|---|---|
| 1 | "Requirements" at 12px/600 against the 100px column `--card-w`'s floor guarantees | **87.9px** | clears, 12.1px spare |
| 2 | Two-line title box against `--band-top + --card-h = 82` | **79px** | clears |
| 3 | 11px pager against `PANE_PAGER_H = 32` | **14.3px** | clears |

x-height is 0.534em and cap height 0.700em at 1000 units per em.

> **The gate clears, and it opens a pixel B38 could not have known about.** B38
> set the label to 12px because that was "the largest whole px at which the
> widest measured *Requirements* (~118px at 15px) fits the 100px column" — a
> measurement taken in `system-ui`. In Montserrat Alternates the same word sets
> 109.9px at 15px and **95.2px at 13px**, so 13px is now the largest whole px
> that fits, and B38's own rule applied to the new face returns a different
> answer than the one in the stylesheet. Nothing is broken at 12px. **It is a
> live decision, not a defect** — the label can take the pixel back, or the
> headroom is simply spare. Either way it should be decided rather than
> inherited.

Still a gate for anything downstream: `test/mobile.js` asserts band and lot
geometry, so a later font change that moves the band **fails the suite**, which
is the correct outcome.

### §13.3 Marks

v1's glyph set — `✓ ↺ ▦ ⇩ ⧉ 🗑 « ‹ › »` — is **retired as type and redrawn as
inline SVG** in `currentColor`.

The reasoning is the one `app.js` already applies to `🗑` and then does not
follow through on. Montserrat Alternates is a Latin display face: of those ten
marks, the four guillemets are plausibly in a Latin subset. **The other six —
`✓ ↺ ▦ ⇩ ⧉ 🗑` — fall back** to whatever the platform supplies, which is exactly
the objection raised against the colour-emoji bin, multiplied by six, and it
means the app's symbols are drawn by Android, iOS and Windows in three different
voices.

Interrogating what a menu glyph actually *is* settles it. It is not text — it is
a symbol being asked to do something type cannot do: render identically
everywhere, in one hand. Type is the wrong medium for that job. Drawing them:

- puts every mark in the app rather than on the platform, which is the identity
  claim §13.1 is making in the first place;
- solves the bin structurally instead of by substitution;
- costs no dependency and no build step — inline SVG in `app.js`'s existing
  `GLYPH` map;
- and lets the marks be drawn **at the note's own stroke weight and corner
  radius**, so the icon set is literally in the same hand as the board. That is
  function borrowing from form, and it is not available to a typeface.

The set is drawn whole, including the guillemets, which type would also have
served. One voice beats one saved path. *Impermanent:* if a mark proves
unreadable at 16px, it is redrawn — not swapped back to a code point.

Semantics carried forward, unchanged: `⇩` is "out of the app, down to the
device," not `↓` (a borrowed browser-download convention) and not `📄` (which
restates the noun). `⧉` is "this, again, elsewhere" — two frames, one content.
Guillemets read as "page", not "play".

---

## §14 Controls

*New in v2.*

Four species. All share one tactile signature; each keeps its own fill.

**Primary** (`New board` — the app's single primary control):

```css
.primary-btn {
  background: var(--shelf);
  color: var(--ink-dark);              /* 8.19:1 */
  border: 2px solid var(--ink-dark);   /* §2.5 — the shelf's own ink */
  border-radius: 0.4em;
  box-shadow: 0.1em 0.1em var(--ink-dark);
  font-size: 16px; font-weight: 800;
  min-height: 44px; padding: 0 18px;   /* §6 */
}
@media (hover: hover) {
  .primary-btn:hover { transform: translate(-0.05em, -0.05em);
                       box-shadow: 0.15em 0.15em var(--ink-dark); }
}
.primary-btn:active  { transform: translate(0.05em, 0.05em);
                       box-shadow: 0.05em 0.05em var(--ink-dark); }
```

The offset shadow and press-translate are the **shared tactile signature** across
all four species — the thing that makes a control feel like a control. It is
instant (§8).

Five corrections against the source reference this was drawn from, each with its
reason:

| Source | Corrected | Why |
|---|---|---|
| `font-color: #f4f5f1` | `color: var(--ink-dark)` | `font-color` is not a CSS property; and light ink on the original grey was 4.26:1, below AA |
| `font-size: 10px` | `16px` | below the app's 13–16px control scale, and unreadable against a 44px target |
| `padding: 0.6em 1.3em` | `min-height: 44px; padding: 0 18px` | §6; em-padding on a 16px label does not reach the floor |
| bare `:hover` | `@media (hover: hover)` | mobile is the primary path; a bare hover sticks after a touch |
| `box-shadow: 0.1em 0.1em` | `… var(--ink-dark)` | unqualified it inherits `currentColor` |

**Selection buttons** (`.sel-btn` — Complete · Copy · Delete): accent fill per
§2.6, or `--chrome` for Copy, `--ink-dark` label, ink border, same shadow
geometry. Copy takes plain chrome because it changes nothing — accents mark state
changes.

**Pager** (`.pager-btn`): `--accent-page`, same construction, `opacity: 0.4`
when disabled.

**Menu rows and the toast's Undo** carry no fill: rows are bare on `--chrome` and
fill on tap; Undo is underlined text (§9).

---

## §15 Where the identity does not reach

**The PDF export stays paper-light.** A dark board prints as a slab of near-black
and costs a cartridge to discover. The export is a reference sheet *for paper*,
and paper is the ground it is designed against — so §2's ladder does not apply
to it, by intent rather than omission.

Montserrat Alternates **does** reach the export: the PDF embeds it, so the
document is typographically the app's even though it is not chromatically the
app's.

---

## §16 Implementation consequences

Named here so the follow-up work is scoped rather than discovered. Tracked as
requirements in `PRD §6` and verified per `PRD §7`.

1. **Five colour sync points, none automated.** `styles.css :root`;
   `index.html`'s two `theme-color` metas (which collapse to one — there is one
   theme); `manifest.json`'s `background_color` and `theme_color`; and `app.js`'s
   `PDF_PAPER` / `PDF_INK` / `PDF_SHADE`, which are hand-derived floats. Changing
   a token in one place silently desynchronises the others. `PRD §7` requires a
   test that fails when they diverge.
2. **PDF font embedding is the largest single item.** The exporter uses base-14
   Helvetica with hardcoded base-36 advance-width tables. Embedding requires
   `.ttf` (not `woff2`) for `FontFile2`; a `/FontDescriptor`; a `/Widths` array
   with `/FirstChar`/`/LastChar`; real advances read from `hmtx`/`hhea`; and
   `PDF_ASC`/`PDF_DESC` re-derived from the font's own em box. The existing
   `/WinAnsiEncoding` + CP1252 layer is unaffected. With no build step there is
   no subsetter, so both weights embed whole — roughly 150KB per exported PDF.
   That cost is accepted deliberately.
3. **`EXPORT_GEO.radius`** mirrors the CSS radius by hand and moves 2 → 3 (§4).
4. **`sw.js`** `ASSETS` gains `fonts/`; `CACHE` bumps.
5. **The light theme is removed, not overridden** — the whole light `:root` and
   the `prefers-color-scheme: dark` block both go (§2.1).
6. **`--ink` becomes per-surface and `--line` is deleted** (§2.3). This is a
   rebinding, not a rewrite: downstream rules keep reading `var(--ink)`.
7. **The marks become SVG** (§13.3), which changes `GLYPH` from a map of strings
   to a map of markup and touches every site that injects one.
8. **`--furniture` is retired and `--band`, `--card` and `--frame` replace it**
   (§2.2, §2.5). The band and the compartment are no longer one surface, and the
   linework is no longer ink.
9. **Two surfaces stop being values.** `--board` becomes a three-stop field plus
   a falloff plus dither (§2.8); `--shelf` becomes a base plus turbulence wisps
   (§2.9). Both are pure CSS and one inline SVG each — no dependency, no build
   step, paint-only, so `NFR-103`'s one-frame layout budget is untouched.
10. **`test/tokens.js` cannot stay a pure function over constants.** With a
    non-flat ground every ratio is a range. The rule becomes: *a non-flat
    surface declares its extremes, and every adjacency is asserted against the
    worst one.* Tractable because the field is authored as opaque stops and
    because the falloff and dither can only darken (§2.8).
11. **The band and the lot both size to their content** from a two-line and a
    two-row floor respectively (§3.1, §3.2), and both rules go full width. This
    supersedes **B32**, **B35/B38** and **B37**; `EXPORT_GEO` and
    `test/mobile.js`'s geometry assertions both move with it.

### §16.1 What is not settled

Recorded here so it is not mistaken for decided:

- **`--chrome`, the accents, the focus ring, the menu, the toast and the desktop
  rail have never been re-derived against the navy.** They carry round-1 teal
  values and have not been rendered since. **The largest open gap.**
- **The scratch-out is nearly a solid black bar on the new shelf.** Three stroke
  families at 97% opacity in the surface's own ink (§4.3) was a dark bar on a mid
  ground; on a 0.66-luminance sand it is the loudest thing on the board. The
  requirement — ≥90% coverage, text destroyed beneath — survives at a lower alpha
  on a light ground. Raised three times, never ruled.
- **`--letterbox` is never drawn** (§2.2). The token, its rationale and its rows
  in §2.5 and §2.7 describe a surface that does not appear.
- **The note is no longer the brightest surface** (§2.2); the shelf is. §1.1's
  "the one lit thing in the room" is true of the canvas, not of the sheet.
- **Whether the lot keeps its top rule** (§2.5).
- **`--frame #698ebf` was adopted, not chosen** (§2.5).
- **The band label could go to 13px** on the new face (§13.2).

---

## §17 Cross-reference

The codebase's `UIUX §x` citations resolve to their own numbers here — that is
why §1–§12 keep their v1 meanings. For completeness:

| Citation | Here |
|---|---|
| `UIUX §1` — governing law, identity | §1 |
| `UIUX §2` — design tokens | §2 |
| `UIUX §2.4` — elevation | §2.4 |
| `UIUX §3` — board geometry | §3 |
| `UIUX §4` — the note component | §4 |
| `UIUX §4.1` — transform origin, truthful coordinates | §4.1 |
| `UIUX §4.2` — note states, focus | §4.2, §2.7 |
| `UIUX §4.3` — the scratch-out | §4.3 |
| `UIUX §4.4` — lot lines are never framed | §4.4 |
| `UIUX §5` — gestures | §5 |
| `UIUX §6` — the touch floor | §6 |
| `UIUX §7` — the menu, destructive last | §7 |
| `UIUX §8` — motion | §8 |
| `UIUX §9` — the undo toast | §9 |
| `UIUX §10` — the board list, truncation | §10 |
| `UIUX §11` — scale to fit | §11 |
| `UIUX §12` — accessibility | §12 |
| `styles.css §1` — "identity from structure, never costume" | §1 |

New in this revision, so nothing existing moves: **§2.8** the board as a field,
**§2.9** the shelf as weather, **§3.1** the band, **§3.2** the Parking Lot as a
section, **§16.1** what is not settled. Every citation above keeps the meaning it
already had.
