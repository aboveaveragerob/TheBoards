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

**The rendered reference.** This system was settled by rendered specimen sheets,
not prose — seven proof rounds, run outside the repo. The final sheet, **proof
sheet 7, "A Well, Swapped"**, is committed at
`docs/proofs/proof-7-a-well-swapped.html`; its own verification table records the
swap that ended the process (the band takes `#020812` and is the deepest surface
on the page; the card takes `#08152c` and separates by its border — 5.39:1 on the
card, 5.95:1 on the band). The three `fonts/` files are extracted from that
sheet's embedded faces. Where this document and that render disagree, the render
is the earlier authority and the disagreement is a defect *here*.

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
peaceful; a bright white productivity surface is not. The page reads top to
bottom as one scene — water closing each end of the sheet, the deep between —
and the note is the one lit thing on the deep (B58, ruled from the rendered
what-if the way every scene decision before it was ruled).

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

**One of these is not a value.** The water is a *field* (§2.8), grounding the
two sections that close the sheet. It is given as a range, and **every ratio in
this document is stated against the worst extreme of its range**, never against
a midpoint.

| Token | Value | What it is | Rel. luminance |
|---|---|---|---|
| `--deep` | `#020812` | the canvas — the deepest surface on the page (B58) | 0.0023 |
| `--chrome` | `#020812` | the room behind the page — the ground under the menu, the toast, the board list and the desktop rail. The deep's value doing a second job, off the page (B52/B58) | 0.0023 |
| `--card` | `#08152c` | the title compartment, sitting just above the deep | 0.0077 |
| `--water` | `#34697f` → `#255265` → `#163646` | **the water, as a field** — the band and the Parking Lot, closing both ends of the sheet (§2.8) | 0.1237 … 0.0325 |
| `--frame` | `#698ebf` | the card's border and both full-width rules — §2.5, B61 | 0.2611 |
| `--note` | `#a0d4da` | the note | 0.5962 |

**The hexes above are the To-Do board's.** Since B67 the ladder has three
bindings — one per board type, the same seven rungs at three hues, each rung
holding the luminance in the right-hand column exactly. §2.2.2 gives the other
two. Every ratio in this document is computed from that column, so every ratio
in this document holds on all three; where a number is genuinely per-ladder,
it is printed per-ladder (§4.3 is the only such table).

`--furniture` was retired by B46; `--band` and the `--shelf` texture are
retired by B58 — the second swap renamed the deep's token honestly
(`--band` → `--deep`, the field's stops → `--water-*`) and removed the sand
from the application entirely (its fates are in §16.2). `--line` was already
deleted (§2.3).

**The page reads top to bottom as one scene:** water at the top, closing the
band; the deep through the middle, where everything the person makes lives;
water again at the foot, closing the Parking Lot. The canvas is the deepest
thing on the page, and the card sits fractionally above it at 1.10:1,
separated by its border rather than by its fill (§2.5).

**The room behind the page is the same deep.** `--chrome` is not a new rung:
chrome touches neither the water nor the card (the menu and the toast float on
elevation, the list replaces the page, the rail sits beside it), so a new
value would be a rung with no adjacency to earn it. It shares the canvas's
value — a summoned surface over the deep separates by its elevation, which is
elevation's whole job (§2.4) — a rail card's fill (the water's own top stop)
holds 3.32:1 behind its 0.40 hairline edge, and light ink reads at 18.33:1.
**`--chrome` does not rotate with the board type** (B67): there is one room,
and it is behind all three boards at once, so it keeps `#020812` — the To-Do
deep's value — whichever board is open. Taken deliberately, the consequence is
that a green board's OS chrome, menu, toast and board list are still the blue.
Settled by proof rounds 8–9 (B52) and carried through the swap (B58); the
rendered references are `docs/proofs/proof-9-a-well-furnished.html` and
`docs/proofs/proof-10-the-second-swap.html`. **The platform edge is the same
room** (B55): the one `theme-color` meta and `manifest.json`'s
`background_color`/`theme_color` all wear `#020812`.

> **The note is the brightest surface on the page — without qualification,
> for the first time.** B46 had to scope the claim to the water because the
> sand outshone the note at 0.6576; B58 retired the sand, and at 0.5962 over
> the deep's 0.0023 the note reads at **12.36:1** — the strongest the note
> has ever been. The old sentence — "the note is the brightest thing on the
> board because it is the only thing the person *placed*" — is simply true
> now (`PRD §1.4`, `PRD §9.2`). Transient chrome is above the page, not part
> of the scene (B52), so nothing summoned counts against it.

**The desk is not a surface, and there is no desk token.** Earlier drafts
carried one, with an OLED rationale — and it described a condition that does not
occur: `applyLayout()` derives both logical dimensions by dividing the viewport
by the render scale, on *both* paths, so the sheet fills its area exactly at
every viewport. The code says so in its own comments twice. The desk appears for
260ms during a desktop board swap, when `#board` crossfades to `opacity: 0`, and
nowhere else; the page behind it keeps a plain black background, which is a
one-line fact about `html`, not a rung on this ladder. The token and every row
it occupied are **retired**.

### §2.2.1 The generative law

Seven hand-picked values with verified ratios are seven assertions; they say
nothing about what an eighth surface would be. The ladder is therefore stated as
a law, and the values above are its output:

1. **One axis: luminance.** A surface's position in the app is its position on
   the ladder. **Within one scene, nothing is distinguished from another
   surface by hue alone.** The qualifier is B67's, and it narrows nothing this
   rule ever governed: the rule is about *rungs* — what tells the card from the
   deep, the water from the canvas — and the answer must stay luminance,
   because hue is the one channel a person's eyes may not deliver. §2.2.2
   rotates the whole ladder at once, every rung together, holding each rung's
   luminance to the 4dp printed above; it therefore distinguishes *scenes*,
   not surfaces, and no reading of the page depends on it.
2. **One hue family for the page, with a job per depth** (B58 collapsed the
   second). Everything on the page is one blue family: the deep and the card
   as the recessed ground, the water as the sections that close the sheet, the
   note as the lit thing. Sand held the second family while the shelf was
   *ground for things at rest*; the swap made the water that ground, and the
   family left with its job. A new family must bring a new job with it;
   `--danger` (§2.6) is the single warm value and it is not a ground.
3. **Rungs are separated by their function, not by an interval.** The dark rungs
   sit inside one luminance decade because they are all "behind": the card reads
   at 1.10:1 against the deep *deliberately* — one recessed mass with a seam in
   it, separated by linework, not by depth (§2.5). The note sits an order of
   magnitude above because it is "in front". The largest gap in the ladder is
   between the water's top stop (0.1237) and the note (0.5962), and it is where
   the ink flips (§2.3.1).
4. **A new rung must clear the crossover test before it exists** (§2.3.1,
   §2.3.2). Adding a surface means computing its luminance, reading its ink pole
   off the crossover, and confirming it is outside the forbidden band. A value
   that cannot carry text is not a ground; it is a line.

Deriving the rungs from an interval — an even luminance ladder, a fixed OKLCH
step — was considered and is wrong here: it would push the deep and the card far
enough apart to read as two depths, when their job is to read as one.

**Impermanent:** the hex values. The law is not.

### §2.2.2 The ladder rotates with the board type

**A board type is a whole scene, not a rung on one** (B67, issue #96). To-Do
boards keep the water blue above. Idea boards take a deep hunter green, Note
boards a deep violet — and each is *the same ladder*, rotated in hue and in
nothing else.

| Rung | To-Do | Idea | Note | Rel. luminance |
|---|---|---|---|---|
| `--deep` | `#020812` | `#000a06` | `#0c0512` | 0.0023 |
| `--card` | `#08152c` | `#001a0e` | `#1e0f28` | 0.0077 |
| `--water-top` | `#34697f` | `#486b49` | `#6d5b83` | 0.1237 |
| `--water-mid` | `#255265` | `#345439` | `#534769` | 0.0737 |
| `--water-bot` | `#163646` | `#1f3825` | `#382e47` | 0.0325 |
| `--water-bot-a` | `22 54 70` | `31 56 37` | `56 46 71` | (the bottom stop, as channels) |
| `--frame` | `#698ebf` | `#52997f` | `#9d80b9` | 0.2611 |
| `--note` | `#a0d4da` | `#b9d2b2` | `#cec6ed` | 0.5962 |

**The derivation is hue and only hue.** Each rung was converted to OKLCH, its
hue moved, and the result re-solved against sRGB so that its **WCAG relative
luminance reproduces the To-Do rung's** — the right-hand column is one number
per row because it is one number per row. The family's own internal hue spread
(the shipped blue runs 205° at the note to 261° at the card) is narrowed as it
rotates, so each scene reads as one hue rather than smearing across a 56° arc:

| Rung | To-Do H / L / C | Idea H / L / C | Note H / L / C |
|---|---|---|---|
| `--deep` | 251.6° / 0.132 / 0.027 | 171.0° / 0.129 / 0.025 | 309.1° / 0.136 / 0.032 |
| `--card` | 260.8° / 0.199 / 0.050 | 161.3° / 0.192 / 0.043 | 310.3° / 0.203 / 0.052 |
| `--water-top` | 227.5° / 0.494 / 0.066 | 145.1° / 0.491 / 0.067 | 304.7° / 0.504 / 0.066 |
| `--water-mid` | 228.2° / 0.415 / 0.059 | 148.3° / 0.413 / 0.059 | 300.2° / 0.424 / 0.057 |
| `--water-bot` | 232.7° / 0.317 / 0.047 | 150.7° / 0.314 / 0.046 | 302.3° / 0.323 / 0.045 |
| `--frame` | 255.7° / 0.639 / 0.085 | 167.8° / 0.629 / 0.083 | 307.3° / 0.648 / 0.089 |
| `--note` | 205.0° / 0.836 / 0.054 | 138.9° / 0.836 / 0.051 | 294.6° / 0.846 / 0.054 |

> **OKLCH lightness and chroma are the aiming coordinates, not the pinned
> ones.** They are held as closely as 8-bit sRGB allows — L within 0.010, C
> within 0.007 — and they cannot be held *exactly*, because OKLab lightness and
> WCAG luminance are different functions and a hue rotation cannot preserve
> both. Luminance is the one that is pinned, because luminance is what every
> ratio in this document is made of, and it is what §2.2.1 rule 1 means by "one
> axis". Where the two conflict, luminance wins.

**One place the gamut binds, recorded so it is not re-litigated.** `--card` on
the Idea ladder is `C = 0.043` against the blue's `0.050`, and `--deep` is
`0.025` against `0.027`. Both are the **sRGB maximum** available at that
luminance in that hue arc — verified by scanning every 8-bit triple. The blue
primary is very dark (luminance weight 0.0722), so a dark blue can push `B`
high and buy chroma almost free; green's weight is 0.7152, so a dark green must
keep `G` small and its chroma is capped. A greener dark card at this luminance
does not exist in sRGB, and no amount of searching will find one.

> **Because luminance is preserved, every ratio this document publishes is
> preserved.** §2.3's five ink pairings, §2.5's seven adjacencies, §2.7's ring
> table and §2.3.1's crossover are all functions of luminance alone, and B67
> moved no luminance. `test/tokens.js` asserts each of them against **all
> three** ladders with a single expected number, so a hue that drags a rung off
> its luminance fails the suite rather than the eye.

**§2.2.1 rule 4 is satisfied for all fourteen new values.** Every one is
outside §2.3.2's forbidden band (0.163–0.196), every ground below §2.3.1's
0.1788 crossover still takes `--ink-light`, and every note still takes
`--ink-dark` — necessarily, since each sits at its To-Do rung's luminance.

**What does not rotate:** `--chrome` (§2.2 — one room, B55), the two ink poles
(§2.3 — ink is per surface, not per app, and rotating it would move the
crossover), and the three accents (§2.6 — they live on chrome). Rotating the
ink would also break §2.7's ring, whose whole claim is that the two poles are
complementary on every ground.

**Bound by rebinding, never by overriding.** The board is drawn by four layers
— the flat `var(--deep)` fill, the dither over it, the band's radial vignette
over its three-stop fall, and the Parking Lot mirroring it — and all four read
the tokens through `var()`. Rebinding the *names* under a `[data-cat]` scope
therefore carries the hue into all four at once, which is what issue #96's
"same stylization and graphic effects" asks for; pointing a background at a new
`--board-bg` token would have recoloured the fill and left the furniture blue.
The list and rail cards rotate with the section they sit in, since a card is a
small rendering of what it names (§10).

**A board with no category reads as a Note board**, violet — because `catOf()`
is a read-site default and a record without a category *is* the third bucket
everywhere (B21's idiom, storage key `unsorted`). That is the same bucket the
list files it in, and the agreement is the point: a card that opens a violet
board must itself be violet. It applies to every pre-#58 legacy record and to
the board `newBoardRecord()` makes on a fresh install, neither of which writes
a category. To-Do is what the page shows for the instant *before* app.js has
spoken, because To-Do is `:root` and carries no `[data-cat]` block.

### §2.3 Ink — one per surface, not one per app

Two poles:

| Token | Value | Bound on |
|---|---|---|
| `--ink-light` | `#f4f5f1` | `--deep`, `--card`, `--water`, `--chrome` |
| `--ink-dark` | `#031019` | `--note` |

Verified contrast for every text-bearing surface, **each at the worst extreme of
its range**:

| Ground | Ink | Ratio | Level |
|---|---|---|---|
| `--deep` `#020812` | light | **18.33:1** | AAA |
| `--card` `#08152c` | light | **16.62:1** | AAA |
| `--water`, lightest stop `#34697f` | light | **5.52:1** | AA |
| `--water`, darkest stop `#163646` | light | **11.62:1** | AAA |
| `--note` `#a0d4da` | dark | **11.84:1** | AAA |

Every pairing clears AA; every one but the water's lightest stop clears AAA.
The two sections are the only surfaces where the field's extreme matters to
text, and 5.52:1 is that extreme rather than an average. **The hexes named are
the To-Do ladder's; every ratio holds unchanged on the Idea and Note ladders**,
whose rungs sit at the same luminances (§2.2.2).

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

`#board`, `#menu`, `#toast`, `#pane`, `#anchor-title`, the band zones and —
since B58 put it on the water — `#lot` carry `.on-dark`; the note is the one
`.on-light` island left. Everything downstream — text, caret, rules,
hairlines, borders, the scratch-out — keeps reading `var(--ink)` and
`var(--ink-a)` unchanged.

This matters beyond tidiness: it means the v1 stylesheet was **already written
for this**, and the change is a rebinding rather than a rewrite. `--ink-a` stays
channel-synced to `--ink` for the scratch-out's buried text (§4.3).

**`--line` is deleted.** v1's mid-grey had four jobs — rules, hairlines, disabled
states, the tap-ghost — and it failed the first two on the grounds they are
actually drawn on (1.64:1 on v1's board, 1.99:1 on its shelf); its luminance
sits dead centre in the forbidden band (§2.3.2). Each job
now resolves to the surface's own ink at a different weight: rules at full ink
(§2.5), hairlines at an alpha (§2.5), disabled at `opacity`, the tap-ghost at a
low alpha. **One ink per surface, expressed at three weights** — fewer tokens,
and every one of them legible where it lands.

### §2.3.1 The crossover

The two poles are equal-contrast against a ground whose luminance is their
geometric mean, offset by WCAG's 0.05. The poles are unchanged from the first
derivation, so the number carries:

```
L_cross = √((L_light + 0.05) × (L_dark + 0.05)) − 0.05
        = √(0.9589 × 0.0546) − 0.05
        = 0.1788        (both poles land on 4.19:1 there)
```

> **Below `L = 0.1788` a ground takes `--ink-light`. Above it, `--ink-dark`.**

This is the rule; §2.3's table is its output, not its source. Two margins are
worth naming. The field's top stop (`L = 0.1237`) is the closest any ground
comes to the boundary, 0.039 below it — the sheet cannot get much lighter
without changing its ink. And `--frame` (`L = 0.2611`) sits *above* the
crossover on grounds that take light ink — which is legal because it is a
line, not a text ground; see §2.3.2's 3:1 close.

### §2.3.2 The forbidden band

Solving each pole for 4.5:1 gives the range where **neither** pole can carry
body text:

```
light ink holds to   L ≤ 0.1631
dark  ink holds from L ≥ 0.1957
forbidden band:      0.163 < L < 0.196
```

> **No text-bearing surface may have a relative luminance between 0.163 and
> 0.196.** There is no ink in the palette that works there.

This is not hypothetical: v1's retired `--line` sat dead centre in that band
(§2.3), and the band is stated as a law so the next mid-grey is rejected before
it is authored rather than after.

**The band closes at 3:1.** Repeating the solve for non-text contrast gives
light ink holding to `L ≤ 0.270` and dark ink from `L ≥ 0.114` — they
*overlap*. Every ground can carry a line, an icon or a border from one pole or
the other; only *text* has a hole. The asymmetry is load-bearing: it is why a
drawn mark can go where a word cannot (§13.3), and why `--frame` may live above
the crossover while no text ground may.

> **A line takes the same ink pole its ground takes** (§2.5). The crossover is
> not a text rule; it is the rule for anything that must be seen against a
> ground. The one deliberate exception is `--frame`, which is not an ink at all:
> it is the band's own hue lifted until it clears 3:1 on both of its grounds,
> because the card/band seam separates surfaces that share a pole.

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
water** — which end of the fall is "worst" depends on the question: a
separation *against the deep* is worst at the water's darkest reach, and a
mark *on the water* is worst at its lightest:

| Touching | Fill | Edge | Separated by |
|---|---|---|---|
| **title card / deep** | 1.10 | `--frame` **5.39** / **5.95** | **edge** |
| **band / canvas, at the rule** (water's darkest stop) | **1.58** | `--frame` **5.95** / **3.77** | **edge** |
| **note / note** (overlap) | 1.00 | dark ink **11.84** | **edge** |
| note / Parking Lot (water's lightest stop) | **3.72** | — | fill |
| lot / canvas (water's lightest stop, at the lot's top edge) | **3.32** | — | fill |
| note / canvas | **12.36** | — | fill |
| note / water (lightest stop) | **3.72** | — | fill |

**Every row holds on all three ladders** (§2.2.2). An adjacency is always
between two rungs of the *same* scene — a board never mixes ladders — and the
two rungs sit at the same pair of luminances whichever hue the board wears.

Three consequences worth stating out loud:

- **The note's 2px frame is the only thing separating two overlapping notes**
  (1.00:1 fill — they are the same colour). Free overlap with no snapping is a
  core behaviour (`PRD §1.2`, P2), so the frame is not chrome around the note; it is
  what makes overlap legible. This is §1's "identity from structure" doing real
  work rather than asserting itself.
- **The card's border is the second load-bearing edge.** At 1.10:1 the card does
  not separate from the deep by fill at all, by design — it is meant to be quiet.
  Its border carries the whole separation, which is why `--frame` is a token and
  not a decoration.
- **The band's rule became the third load-bearing edge** (B58 inverted this
  clause). The band's water darkens to its bottom stop at the rule, meeting
  the deep at 1.58:1 — under the fill floor — so the rule now *carries* that
  seam, clearing 5.95:1 on the deep and 3.77:1 on the water's darkest stop.
  The lot's rule keeps the section-mark reading: the lot's top edge is the
  water's lightest stop, and that seam separates by fill at 3.32:1.

**`--frame` `#698ebf`.** One token for the card's border and both full-width
rules (B61): the two ends of the sheet close with the same line, the same
idiom at both ends (§3.1). It is a lift of the deep's own hue, so the linework
belongs to the page rather than being applied to it. Clears 5.39:1 on the
card, 5.95:1 on the deep, 3.77:1 on the water's darkest stop.

> **Ratified.** `#698ebf` arrived as the frame carried by the "A Well"
> specimen, kept deliberately by proof sheet 7 against rendered alternatives,
> and extended to the lot's rule by Rob's B61 pick — both ends matching —
> from the rendered pair on the second-swap round.

**Hairlines.** A separator is that surface's ink at the lowest alpha clearing
3:1 on it — `0.40` on `--chrome`, where the only separators in the app live
(the menu's destructive divider, §7). v1's `0.14` was 1.43:1 there: invisible,
and therefore not earning its place at that weight.

```css
--hairline: rgb(var(--ink-a) / 0.4);
```

### §2.6 Accents

| Token | Value | Role | on `--chrome` | on `--card` (the lightest near-black ground) | label when filled |
|---|---|---|---|---|---|
| `--accent-restore` | `#b6dee2` | Complete / Restore / Undo | 13.90:1 | 12.60:1 | 13.31:1 |
| `--danger` | `#E2A08C` | Delete | 9.22:1 | 8.35:1 | 8.83:1 |
| `--accent-page` | `#6d9cb0` | the primary (B59), rail pager, drop target | 6.72:1 | 6.09:1 | 6.44:1 |

> **An accent is text only on a near-black ground — `--chrome`, `--deep` or
> `--card`. Anywhere else it is a fill carrying `--ink-dark`.**

Each value is derived from a family the scene already keeps: `--accent-restore`
is the note's own hue and saturation lifted 74 → 80 — the derivation `--frame`
used on the deep — because what restores is kin to what returns;
`--accent-page` is the water's hue at the old value's depth, because the accent
about boards is cut from the board's own water — which is why B59 put it on
the one control that *makes* a board, when the sand left and took the old
primary fill with it; `--danger` re-derived to its own value and holds it.

This rule is the correction to a real hole. `--danger` is 2.78:1 against the
water's lightest stop and `--accent-page` is 2.11:1 — as text those are below
AA and below the 3:1 non-text floor respectively. As *fills* they work where
they land: a filled Delete button separates from the water by its fill at
3.90:1 from the mid stop down and by its `--ink-dark` border at 3.18:1 at the
top, with its label riding at 8.83:1 (the fill/border handover dips to ~2.99
over a narrow reach of the fall — recorded in §16.1); a Complete fill clears
4.19:1 against the water's worst extreme; the primary, the pager and the
drop-target frame live on `--chrome` at 6.72:1. The placement rule keeps
every accent on a ground where it works.

`--danger` is **the only warm hue in the application** — B58 returned the
sentence to its original, unqualified form. B46 had to add "saturated" because
the sand was warm ground; the sand is retired, so among everything the app
draws, the one thing that destroys is the one thing that isn't cool water,
full stop.

> **Ratified.** The whole family was re-derived against the deep-dusk grounds
> in proof round 8 — candidates rendered beside the round-1 values, every
> ratio against its worst extreme — and rendered whole in round 9
> (`docs/proofs/proof-9-a-well-furnished.html`). The round-1 restore and page
> values were hue 177°, the retired teal's kin; the new values belong to the
> note's and the field's families. `--danger` re-verified clean against every
> ground it lands on and kept its value — re-chosen, not inherited. Recorded
> as B52, where the superseded hexes live.

### §2.6.1 The highlight wash (B71)

| Token | Value | Role | text on it (`--ink-dark`) | vs. the note families (hue) |
|---|---|---|---|---|
| `--highlight` | `#F2D64B` | a note the user has toggled Highlight | 13.27:1 | amber vs. cool blue/green/violet |

A highlight is **not an accent.** Accents live on chrome and signal *the app's*
verbs (§2.6). A highlight is a fill the *user* asserts on one note — a new axis,
the first per-note appearance state the board has (every other note surface is
set by board *type*, not by the note). So the rule that keeps accents off the
board surface does not reach it: the highlight is *made* to sit on the board, on
exactly one note at a time, at the user's command.

It is the one **warm** surface a note can wear. The three note families are all
cool pastels (§2.2.2); `#F2D64B` is a bright amber that reads as "marked" against
every one of them — the separation is **hue**, not luminance. That is deliberate:
the note is the brightest surface on the page (§2.2), and the wash keeps that rung
(luminance 0.675, a hair above `--note`'s 0.596) while turning warm, so a
highlighted note still reads as a note, only lit. Its dark ink and 2px border are
unchanged — the note already binds `--ink` to `--ink-dark` on its `.on-light`
surface (§2.3), which holds on amber at 13.27:1. Unlike the ladder, `--highlight`
does **not** rotate with board type: an emphasis the user places means the same
thing on a To-Do, an Idea, and a Note board, so it is one constant value.

### §2.7 Focus

**The ring is two-tone**, and that is structural rather than stylistic:

```css
outline: 2px solid var(--ink-light);
box-shadow: 0 0 0 4px var(--ink-dark);
outline-offset: 2px;      /* -2px on inset rows */
```

No single colour works on every ground — `--ink-light` is 1.48:1 on the note,
`--ink-dark` is 1.04:1 on the deep. The two are exactly complementary, so the
doubled ring clears 3:1 on every ground **by construction**, not by tuning.
Both extremes of the water are checked, since the ring can land anywhere on
the two sections:

| Ground | light tone | dark tone | best |
|---|---|---|---|
| `--deep` | 18.33 | 1.04 | **18.33** |
| `--chrome` | 18.33 | 1.04 | **18.33** |
| `--card` | 16.62 | 1.06 | **16.62** |
| `--water`, lightest stop | 5.52 | 3.18 | **5.52** |
| `--water`, darkest stop | 11.62 | 1.51 | **11.62** |
| `--note` | 1.48 | 11.84 | **11.84** |

This is B15's "robustness from geometry, not hue," carried into the new palette
and made total. The water's lightest stop is the only ground where *both* tones
clear 3:1 at once, which is a margin rather than a problem. **Geometry, not
hue, is also why the table survives B67 untouched:** the ring is built from the
two poles, the poles do not rotate, and the grounds keep their luminances — so
every row above holds identically on the Idea and Note ladders (§2.2.2).

### §2.8 The water is a field, not a value

Since B58 the field belongs to the two sections that close the sheet — the
band and the Parking Lot — while the canvas between them is the flat deep.
A flat fill could not carry §1.1's register alone; the water carries the
depth, and each of its layers holds a job or it comes out (§1):

1. **The vertical fall** — `#34697f` → `#255265` → `#163646`, top to bottom in
   each section. Light from above, depth downward — and at the band it darkens
   into the rule, which is what hands that seam to the rule's edge (§2.5).
2. **The sections' falloff** — the radial darkening each section carries
   toward its reach. The *sheet-bound* job this layer held in the pre-swap
   scene died with the water canvas (a near-black ground has nothing darker
   to fall to); within the sections it keeps the water reading as depth
   rather than as two flat strips.
3. **Dither** — noise at anti-banding amplitude over the sections' ramps,
   which an 8-bit panel would otherwise band. On the deep between, it is the
   grain the ratified render carries (B58) — the canvas is flat by value,
   textured by repair.

**The field is authored as opaque stops**, so its extremes are exactly the
declared colours rather than something to sample. The falloff and the dither
can only *darken or perturb below the threshold of a ratio*, so each
adjacency in §2.5 is asserted against the stop that is worst **for that
question** — the lightest where a mark must read on the water, the darkest
where the water must part from the deep.

### §2.9 The sand is retired

The Parking Lot wore warm sand with turbulence weather from B46 to B58, and
B58's swap retired the family entirely (the six superseded hexes live in that
entry, as B52's precedent has it): the lot takes the water (§2.8),
the primary control takes `--accent-page` (B59), and no sand value survives
anywhere in the application. The full fate table is §16.2. What §2.9 carried
that outlives the sand is its craft note, which applies to the water's own
weather wherever a ramp meets a quantiser:

> **Banding comes from long monotonic ramps, not from amplitude.** A smooth
> run gives the quantiser something to step through; irregular overlapping
> texture does not band at *higher* amplitude, because no run is long or
> smooth enough to step.

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
rule.** The header is **centred in its zone and sits on the rule**, at 13px/600
with 10px of clearance beneath it (B54, closing §13.2's question).

**Both rules run the full width of the sheet** — `left: 0; right: 0`, not inset
to the gutter. **This supersedes B35 and B38's gutter-inset rule.**

**The band sizes to its tallest zone, from a two-line floor:**

```
rule-y = 14 + max(2, lines) × 19.5 + 8 + 16.9 + 10
       = 88px at the floor, 107px at three lines
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

Empty, one row and two rows all draw the same two-row section — furniture, not a
by-product of content. The third row grows it *upward*, since the section is
anchored to the sheet's bottom edge. `maxRows` is B37's proportional bound,
retained as a **ceiling** so a long lot cannot swallow the canvas and
re-instantiated under the full-bleed geometry (B57): B37 accepted 182 of a
900-unit sheet with the old 16px margin, and three full-bleed rows are 166, so
**three rows hold from 821 units and two below** — the 846-unit cover screen
draws three, exactly as proof sheets 7 and 9 render it. A row past the ceiling
still exists, still saves and still exports. **This supersedes B37's fixed
whole-row budget**, keeping only its cap's arithmetic.

---

## §4 The note component

```css
.note-text {
  background: var(--note);            /* #a0d4da */
  color: var(--ink);                  /* rebound dark here — 11.84:1 */
  border: 2px solid var(--ink);       /* §2.5 — dark on this surface */
  border-radius: 3px;
  padding: 10px 12px;
  font-size: 17px; line-height: 1.4;
  text-align: center;
}
.note-text:empty { background: transparent; border-color: transparent; }
```

**The text is centred in its frame** (B62, issue #82). Alignment moves glyphs,
not the box: the note is `width: max-content` capped at the sheet's right edge
(B39), so `text-align` changes no dimension — the wrap cap, the hit collar and
every stored position measure exactly as before. A single-line note
shrink-wraps to its own text and centres invisibly; the change is legible
wherever a line falls short of the box's widest — a cap-wrapped note's soft
lines, or a short hard line beside a longer one — each held in the middle of
the frame. The export draws the same centring in the same content box
(§15, B34/B39), measured sans trailing spaces because `pre-wrap` hangs them.

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
≥90% coverage (93.6% measured) — **texture, not colour** — in the surface's own
ink at **0.62**, with the underlying text destroyed to **12% ink** so no
screenshot or zoom recovers it. The radius tracks the note's. B53's pair
proved pole-independent under B58's swap: the note strikes in dark ink at
4.53:1; the lot now strikes in light ink on the water at 3.19:1 / 4.08:1 /
5.47:1 against the fall's three stops — a mark above the 3:1 floor at every
extreme, on either pole, and no longer a bar anywhere.

**This is the one published table B67 moves, and it moves in the second
decimal.** A strike is an *alpha composite*, so its ratio is a function of the
ground's three channels rather than of its luminance alone: rotating the hue
(§2.2.2) re-quantises the mix at 8 bits and the number shifts. The values are
stated per ladder rather than averaged, because a range stated as a midpoint is
the thing §2.2 forbids:

| Mark | To-Do | Idea | Note |
|---|---|---|---|
| note strike — dark ink at 0.62 | 4.53 | 4.51 | 4.54 |
| lot strike on the water's lightest stop | 3.19 | 3.22 | 3.20 |
| lot strike on the water's mid stop | 4.08 | 4.11 | 4.12 |
| lot strike on the water's darkest stop | 5.47 | 5.49 | 5.50 |
| buried text on the note | 1.28 | 1.27 | 1.27 |
| buried text on the water's lightest stop | 1.29 | 1.30 | 1.28 |

The law is unchanged and is what is actually asserted: **every mark clears 3:1
on every stop of every ladder, and every burial stays a smudge.** The largest
movement is 0.04, against a floor the smallest value clears by 0.19.

The sections' radial falloff (§2.8) is the *other* alpha composite in the app,
and its luminance moves for the same reason. No published ratio is computed
from the vignetted ground — §2.8 asserts each adjacency against the fall's
declared stops precisely because the falloff can only darken below the
threshold of a ratio — so nothing above depends on it. Named here so the next
value derived from the band's real ground is derived per ladder.

**The veil and the burial are one decision** (B53). The old 0.97/0.40 pair was
tuned for a mid ground: a near-opaque veil destroyed what was under it, and the
burial only had to kill the 10% showing in the gaps. Thin the veil and the words
come back *through* the strokes — so as the strike's alpha fell to 0.62, the
burial deepened to 0.12. The buried text lands at 1.28:1 on the note and
1.29:1 at the water's worst extreme — a smudge where words were. **That is
the target, not a failure:** the content is deliberately illegible, and
legibility minima do not apply to something the person has asked the app to
strike out.

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

**A collar is not obliged to be symmetric.** The note's is, because a note is
surrounded by paper on all sides. The title compartment's handle (§14, B65)
spends its whole collar downward, onto the deep, because upward is the title's
own words — the direction a collar grows in is part of the decision, not a
consequence of `inset`.

---

## §7 The menu

Long-press (mobile) or right-click (desktop) — **and, for the anchor menu, the
`Menu` handle on the title compartment** (§14, B65). The handle is a second door
to the same room: it opens the anchor menu exactly as listed below, and it
replaces neither gesture. On desktop it is that menu's *only* door, since no
long-press is armed there (B19/issue #4) and `contextmenu` routes notes alone.

| Menu | Items |
|---|---|
| Item | All boards · Complete/Restore · Highlight/Remove highlight · Copy · Delete |
| Anchor | Export · All boards |
| Board row / rail card | Export · Delete |
| Desktop selection | Complete/Restore · Highlight/Remove highlight · Delete |

Ordering is **navigation first, then the item's own actions in rising severity**
(B43, superseding A1). The destructive action is **always last, in `--danger`,
behind a hairline** — and never distinguished by colour alone (§1): position and
the divider carry the meaning independently.

**Highlight** (issue #105, B71) is a note-only toggle: it washes the whole note
in `--highlight` (§2.6.1) and, chosen again, returns it to the board's default
note surface. Its label states the act it will perform — **Highlight** on a plain
note, **Remove highlight** on a lit one — the same Complete→Restore grammar it
sits beside, never a fixed noun. On a desktop multi-selection the flip is on the
whole set (it removes only when *every* selected note is already lit, exactly as
the Complete item flips), with the plural **Highlight all** / **Remove
highlights**. The Parking Lot has no surface to wash, so it is not offered there.

Every menu says "All boards", and that is now the only place the word is
written: the list view carries no visible page heading (B66 supersedes B43's
heading clause) — its three category heads say where you are, and the screen's
accessible name lives on `#list-view`'s `aria-label`.

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

**Mobile:** a full-screen list on `--chrome`, most recently updated first,
opening straight onto the categories — **there is no page heading** (B66): the
screen is reached by choosing "All boards", and a title repeating the choice you
just made is a pixel that does not earn its place. Routing uses the History API
specifically so the OS back gesture returns you to the board (B9). Back is never
intercepted, shadowed or disabled.

**Desktop:** an always-visible 300px rail (B24) — **sunken, not floating** (§2.4),
sitting outside `#board` so the recognizer never sees its events. Cards are
the water's upper fall on `--chrome`, compact.

**Both surfaces order a section by last touch, newest first** (B69, superseding
B24's immutable slot): the key is the later of `updatedAt` (written on every
committing action) and `catStamp` (written by a drop or a create), floored at
`createdAt`, with `createdAt` desc + an `id` tiebreak closing it so the sort is
total and no card can change slots between two renders of the same data. A card's
slot therefore **does** move — editing a board returns it to the top of its
section, which is the cost B69 accepted.

Both surfaces sort into **To-Do / Idea / Note** (B63 renamed the third at the
label only — its storage key remains `unsorted`), and a pointer-drag moves a
card between sections with the target section framing itself in
`--accent-page`. **A card wears its own section's water** (B67): the cards are
the water's upper fall, and since B67 that fall is per board type, so a card
previews the board it opens rather than describing a board that no longer looks
like it. The section's ground stays `--chrome` — the list is the room, not a
board (§2.2.2) — so the three sections read as three tones of card on one
surface, which is also what makes a drag between them legible. The drag ghost
carries the scope too, so a card does not change hue in the air. Overflow
**pages** rather than scrolling, and a single page hides its own pager: no
state, no statement (B42).

**Each section lays out as one grid, on both surfaces** (B63): a head row —
the category's display label left, and the section's **own `New board`
control** right, the two boxes one height — then the cards, then the pager
row **below the cards, centred**. The header sits at §13.1's 24px display
step on mobile and at the scale's own top step, 18px, on the rail — at 24px
the longest name sets 215px and the rail's 276px cannot hold it beside any
legible control (B63's measurement; the name is never crowded off its own
row). The furniture rows are **44px** on mobile — §6's floor exactly, the
control *is* the row — with the control's label at 14px, and **32px** on
desktop (a 32px control, its label at 13px). The global New board controls
are **removed** — creation lives in the categories: a section's control
writes `category` (+ `catStamp`, so the new card lands first, like a drop)
and **opens the new board at once**.

**A card is 44px and the gaps are two values** (B68). The row height is
`§6`'s touch floor and stops there: a card is a tap target, and what makes it
read as a discrete object with its own edge is the hairline and the water
fill, never the height. **4px** separates card from card inside a section;
**8px** separates section from section — one number could not say both, and
the second is what keeps three categories reading as three.

**An empty category collapses to its head row** (B68): its label and its own
New board control stay — it is still somewhere to create, and still a target
to drop onto, one furniture row tall (44px on mobile, §6's floor; 32px on the
rail, past §6's B23 pointer floor) — and its cards and pager slots go to the
sections that have boards. The pager's slot is reserved wherever cards are
drawn, even when a single page hides the pager, so the budget cannot flap
between one- and many-page states.

**The per-page budget is measured, never a constant** (B42, restated B68):
the surface's real content height, less every section's furniture, in whole
rows — **times the cards a row holds** (B70). The list puts **two** to a row;
the rail keeps one, because `PANE_W` is 300 and two would be narrower than the
titles they name. On a 384×846 phone that comes out at **twenty-six** cards
with one category populated, **twelve** with two and **six** with all three;
the rail at 1440×900 holds four. Where the measurement falls short of what is
asked for, the pager states it — a number that clipped off the bottom of a
short phone would be a lie about the height.

**Truncation is always indicated** — `text-overflow: ellipsis`, never a hard cut.

A rail board swap is a 260ms crossfade (§8) with **no history push** — B9 is
bypassed, not touched.

---

## §11 Scale to fit

One logical page, one render scale. Stored coordinates are converted for display
and **never mutated by a layout change** — a rotation, a fold or a window drag
changes how a position renders, never what it is.

**The mapping is a similarity transform (ruled B64; issues #65, #75).** Each
note renders through one uniform ratio `k = min(LOGICAL_W/rw, LOGICAL_H/rh)`
— the smaller of the two frame ratios — applied to `x`, `y` **and** size, so
a fold, a rotation or a window drag maps the arrangement as a figure: pairwise
angles and distance ratios are preserved, and `min` keeps every authored
position on the page by construction. The figure is anchored top-left, never
centred; slack falls to the right and bottom as open canvas. Legacy notes
(no `rh`) keep B32's rescue exactly — width-ratio `x` and size, `y` through
`LEGACY_H` with the render-time clamp. This supersedes B40's anisotropic
mapping and B21's width-only multiplier (B64).

---

## §12 Accessibility

Non-negotiable. The target is **WCAG 2.2 AA**, with AAA where the product already
reaches it. This section is the specification; `PRD §9.6` states only the parts
a test can prove.

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
shell (`PRD §3.2`, `PRD §3.3`). The three weight files are committed in
`fonts/`, extracted from proof sheet 7's embedded faces, declared with
`@font-face`, listed in `sw.js`'s `ASSETS`, and subject to the cache bump —
wired when the system shipped, exactly as this section ordered.

**Three weights** — 400, 600, 800 — as Latin-subset `woff2`, with
`font-display: swap` so capture is never blocked on a font load. Montserrat
Alternates has no variable version, so each weight is a separate file; three is
the smallest set covering body, the existing 600 emphasis, and the button's heavy
label.

Size scale is retained: 11 · 12 · 13 · 14 · 15 · 16 · 17 · 18px; line-heights
1.3 / 1.4 / 1.45 — and one display step above it: **24px** (the mobile
category header, B63; the rail's header takes the scale's own 18).

### §13.2 The band measurement gate

Montserrat Alternates has a different apparent x-height from `system-ui`. The
band is **sized by the type it holds** (B37, §3), so changing the type changes
the band. **The gate is discharged.** Measurements taken from the font's own
`hmtx` advances, with no kerning applied, so every figure is a conservative
upper bound on what a browser draws:

| # | Measurement | Result | |
|---|---|---|---|
| 1 | "Requirements" at 13px/600 against the 100px column `--card-w`'s floor guarantees | **95.2px** | clears, 4.8px spare (96px browser-rendered) |
| 2 | Two-line title box against `--band-top + --card-h = 82` | **79px** | clears |
| 3 | 11px pager against `PANE_PAGER_H = 32` | **14.3px** | clears |

x-height is 0.534em and cap height 0.700em at 1000 units per em.

> **The gate clears, and the pixel it opened is taken: the label is 13px**
> (B54). B38 set the label to 12px because that was "the largest whole px at
> which the widest measured *Requirements* (~118px at 15px) fits the 100px
> column" — a measurement taken in `system-ui`. In Montserrat Alternates the
> same word sets **95.2px at 13px**, so B38's own rule applied to the face the
> app owns returns 13, and keeping 12 would have inherited a dead face's
> measurement. The band is sized by the type it holds (B37), so the formula's
> label term moves 15.6 → 16.9 and the band grows by exactly the pixel: 88 at
> the floor, 107 at three lines (§3.1). Rendered at both sizes on proof sheet
> 8; the ratified render is `docs/proofs/proof-9-a-well-furnished.html`.

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

### §13.4 The icon

B1's motif, unchanged — the note-frame, two text lines, the completion
stroke — drawn in what a note now *is*: `--note` `#a0d4da` behind its 2px
`--ink-dark` frame, **on the deep** (B60, re-ruled when B58 moved the notes'
ground; supersedes B56's water). The launcher is where the identity claim
meets the person first, and the claim is the canvas the note actually lives
on — at 12.36:1, the strongest it has ever read. Generated by the committed,
dependency-free `icons/make-icons.js` (the water kept as a `--ground` flag);
the maskable variant keeps the motif inside the ~80% safe zone with the deep
bleeding to the mask's edge.

---

## §14 Controls

*New in v2.*

Four species. All share one tactile signature; each keeps its own fill.

**Primary** (`New board` — the per-category create control, one on every
section's head row since B63; refilled by B59 when the sand retired — the
accent about boards, on the controls that make one; the construction below is
unchanged, except that the category instance sizes its label to its row:
14px mobile, 13px desktop, B63):

```css
.primary-btn {
  background: var(--accent-page);
  color: var(--ink-dark);              /* 6.44:1 */
  border: 2px solid var(--ink-dark);   /* §2.5 */
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

**The compartment's handle** (`#title-menu` — the `Menu` control on the title
card, B65): `--frame` fill, `--ink-dark` label at **5.70:1**, on a fill that
clears **5.39:1 on the card** (§2.5's published pair — it is the card's own
border colour, filled). It is the fifth species and it keeps §14's signature
whole; only the fill is new, and the fill is not a new token. Deliberately
**not** `--accent-page`: B59 gave that to the controls that *make* a board, and
on desktop this handle and the rail's `New board` share a screen.

```css
#title-menu {
  top: calc(var(--card-bottom) - 16px);          /* bisected by the card's bottom edge */
  right: calc(100% - var(--card-l) - var(--card-w));   /* flush with its right one */
  height: 32px; padding: 0 12px;
  font-size: 13px; font-weight: 800;        /* the band's own furniture size, B54 */
  background: var(--frame); color: var(--ink-dark);
  border: 2px solid var(--ink-dark); border-radius: 0.4em;
  box-shadow: 0.1em 0.1em var(--ink-dark);
}
```

`--card-bottom` is the compartment's **measured** height, set beside `--rule-y` in
`updateBoardGeometry`, so the handle follows a title that grew past the floor (and
`document.fonts.ready` re-runs that measure once, since the faces swap in after
boot — §13.1). The 32px frame is under §6's floor on purpose: the handle carries
the note's own decoupled collar (`--hit`, B7), sized in JS so
`(32 + 2 × hit) × renderScale` clears **44px on touch and 24px on desktop**.
Unlike the note's, this collar is **asymmetric** — `top: 0`, the whole
`2 × hit` spent downward onto the deep — because upward is the title's own
words. Inside the compartment it could not go — at
B32's 384px floor the card is 145×110 and a two-line title already fills it — so
it sits on the joint where the card's two drawn sides meet (B38: only three are
drawn). Half on `--card`, half on `--deep`, which are 1.10:1 apart: the ground
under it is one value either way.

It **adds** a door to the anchor menu (§7); long-press and right-click are
unchanged.

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

Named here so the follow-up work was scoped rather than discovered — and
landed with the v2 release, in the shape this list ordered. Scoped in
`PRD §9` and verified per `PRD §9.6`.

1. **Five colour sync points, none automated.** `styles.css :root`;
   `index.html`'s two `theme-color` metas (which collapse to one — there is one
   theme); `manifest.json`'s `background_color` and `theme_color`; and `app.js`'s
   `PDF_PAPER` / `PDF_INK` / `PDF_SHADE`, which are hand-derived floats; and
   `icons/`, whose B1 motif is drawn in the poles and must be regenerated, as
   B16 regenerated it. Changing a token in one place silently desynchronises
   the others. `PRD §9.6` requires a test that fails when they diverge.
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
   step, and paint-only — the layout cost is untouched.
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

- **The Delete button's boundary on the field has a narrow handover.** Its fill
  separates below the field's mid stop (3.90:1) and its `--ink-dark` border at
  the top (3.18:1); across a narrow reach of the fall the two cross at ~2.99 —
  a hair under the 3:1 component floor. This lives in §14's construction
  meeting §2.8's field, not in any accent value. Surfaced by round 8's
  verification; not yet ruled.

Everything else this list has carried is settled and has moved into the body,
with the proof sheets as provenance and `DECISIONS.md` as the record: the desk
token is retired (§2.2), the brightest-surface claim is reworded rather than
defended (§2.2, `PRD §1.4`), the lot keeps its top rule in its own ink (§2.5),
`--frame` is ratified (§2.5) — B46+ — and round 8's three, ruled B52–B54: the
chrome family (§2.2, §2.6), the scratch-out's pair (§4.3), and the 13px band
label (§3.1, §13.2), rendered whole in
`docs/proofs/proof-9-a-well-furnished.html`.

### §16.2 Retiring v1's tokens

Thirteen tokens exist in v1. **Every one has a fate here**; a token with no
stated fate is a call site nobody knows how to edit.

| v1 token | Sites | v2 |
|---|---|---|
| `--paper` | 22 | **split** — as a ground → §2.2's ladder by role; as a label on a fill → `--ink-dark` (§2.3) |
| `--ink` | 38 | **split** — `--ink-light` or `--ink-dark`, rebound at the surface (§2.3) |
| `--ink-rgb` | 1 | **renamed** → `--ink-a`, rebound per surface (§2.3) — and corrected: v1 declared comma-separated channels and used them with slash alpha (`rgb(34, 28, 36 / 0.4)`), which CSS Color 4 rejects, so the buried-text fade (§4.3) may never have rendered. The v2 form is space-separated and valid |
| `--ink-shadow` | 8 | **retired** — a second mid-tone has the same defect `--line` had (§2.3.2). Placeholders, dates and category heads take the ground's pole; the tap-ghost takes it at a low alpha |
| `--letterbox` | 2 | **retired** — never drawn (§2.2). `html` keeps a plain black background, which is not a token |
| `--surface-raised` | 3 | **retired** → `--chrome` — v1 raised menus *above* paper; v2 sinks them below the board (§2.2, B52) |
| `--hairline` | 6 | **retired** → `rgb(var(--ink-a) / 0.4)` — that surface's ink at the lowest alpha clearing 3:1 on it (§2.5) |
| `--danger` | 7 | **kept**, re-derived and held (§2.6, B52) |
| `--accent-restore` | 5 | **kept**, re-derived to the note's family (§2.6, B52) |
| `--focus-ring` | 11 | **retired** — no single hue works on six grounds; replaced by the two-tone ring (§2.7) |
| `--elevation` | 3 | **kept** (§2.4), gains an inset variant for `#pane` |
| `--pane` | 1 | **retired** → `--chrome` (§2.2, B52) |
| `--accent-page` | 2 | **kept**, re-derived to the field's family (§2.6, B52) |

**And the second swap's fates (B58–B61)** — the same discipline applied to the
tokens the swap moved:

| Pre-swap token | Fate |
|---|---|
| `--band` | **renamed** → `--deep`: the value moved from the band to the canvas, and the name follows the surface it grounds (§2.2) |
| `--board-top/-mid/-bot` (+ `-a`) | **renamed** → `--water-top/-mid/-bot` (+ `-a`): the field grounds the two sections now, not the board (§2.8) |
| `--sand-light/-base/-dark` | **retired** — the lot takes the water (§2.8); the primary takes `--accent-page` (B59) |
| `--sand-taupe`, the three wisps | **retired with their ground** — the turbulence weather leaves with the sand (§2.9) |
| `--chrome`, `--card`, `--frame`, `--note`, inks, accents, elevations | **kept**, unmoved — the swap trades surfaces, not values |

### §16.3 What pins this document

Per surface, what would actually fail if the words above were violated today:

| Clause | Pinned by |
|---|---|
| §2 — every token, every ratio | `test/tokens.js` (`PRD §9.6`): every table here recomputed from the shipped hexes, each range at its worst extreme, plus the sync points, the accent placement rule, self-hosting and B53's pair |
| §2.2.2 — three ladders, one axis | `test/tokens.js` [1b] parses the palette **per scope** (`:root`, `#board[data-cat="idea"]`, `#board[data-cat="unsorted"]`), asserts each rung's luminance against the shared column, asserts the two spellings of the darkest stop agree (`--water-bot` / `--water-bot-a`), and asserts `--chrome`, the ink poles and the accents are *not* rebound. §2.3/§2.5/§2.7's tables are then run against all three ladders with one expected number each |
| §3 — band and lot geometry | `test/mobile.js` [9c]/[11b]/[11c] and `test/desktop.js` [D8] — moved with B47/B54 when the band shipped, recomputing rule-y from the formula (88 floor / 107 at three lines); `test/mobile.js` [21] and `test/desktop.js` [D21] pin the handle to the compartment's corner and prove it does not grow the box (B65) |
| §3/§7 — `EXPORT_GEO` agreement | `test/mobile.js` [11c] pins export geometry to the rendered board — the intended tripwire |
| §4 — wrap, similarity render, centred text | `test/mobile.js` (B39 scenarios; [12c] pins B64's fold/rotate similarity — shape held, size uniform, storage untouched, round trip exact; [18b] computes the alignment, editing and at rest) and `test/desktop.js` [D13] (the silent cross-frame grab folds k) and [D17b] — the computed style, plus the centring inset parsed out of page 1's content stream (B62) |
| §5 — the recognizer, both grammars | `test/mobile.js`, `test/desktop.js` |
| §7 — menu contents and order | `test/mobile.js` [8]; the handle's door onto the anchor menu by `test/mobile.js` [21] and `test/desktop.js` [D21], which assert the two items unchanged (B65) |
| §8 motion, §12 accessibility beyond floors | **nothing** |
| §13.2 — the band under the new face | measured from `hmtx` here; the live gate is `test/mobile.js`'s geometry, now running against the shipped face |
| §16 — that shipped CSS reaches an installed PWA | `test/sw-update.js` (B36) — its marker moved with the band: `--card-h` died with B47, so the regex now reads `--band-top: 14px` literally out of `styles.css`, and `test/tokens.js` asserts the marker matches the shipped stylesheet |

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

**The prefix mandate.** Every new citation names its document — `PRD §x`,
`UIUX §x`, or a `B`-number — never a bare `§x`. The codebase already carries
bare cites that mean different documents in the same file (`styles.css` mixes
`§6.1`, this document's anchors under PRD numbering, with `§6`, this document's
touch floor); existing cites keep their meaning, and new ones do not add to the
ambiguity.

New in this revision, so nothing existing moves: **§2.2.1** the generative law,
**§2.3.1**/**§2.3.2** the crossover and the forbidden band, **§2.8** the board
as a field, **§2.9** the shelf as weather, **§3.1** the band, **§3.2** the
Parking Lot as a section, **§13.4** the icon, **§16.1** what is not settled,
**§16.2** retiring v1's tokens, **§16.3** what pins this document. Every
citation above keeps the meaning it already had.
