# UIUX.md — To-Do Boards

**Status:** v1 of the rendering specification, written for v2's design system.

**What this document is.** `PRD.md` says what the app is and what it is for.
This says what it renders, in values an implementer can type without deriving
anything. `DECISIONS.md:22` already calls this document *"the rendering
authority"* and resolved A1 by following `UIUX §7` over `PRD §6.6`; that is the
standing it is written to.

**Precedence.** On rendering, this document binds. Where a later `DECISIONS.md`
ruling contradicts it, the ruling wins and this document is owed an amendment —
that is how B16 replaced the palette and how B29 replaced B5's slop. Where it
and `PRD.md` disagree, this document wins on *how it draws* and `PRD.md` wins on
*what it is for*.

**Numbering is recovered, not chosen.** `app.js`, `styles.css`, `index.html` and
`DECISIONS.md` cite `UIUX §1`–`§12` in 37 places, and `styles.css:4-5` carries
this document's table of contents in its own header. The sections below are
those citations, filled in. Do not renumber.

**How to read a clause.** Every normative value carries the constraint that
produced it. A value with no constraint is a value nobody can safely change,
which is how B33's band geometry survived onto a sheet B32 had already
abolished. Where a value is *felt* rather than derived it is marked
**impermanent**, in the idiom B18 established for its own 400ms.

**Test coverage is stated, not assumed.** Each section ends with what
`test/mobile.js` / `test/desktop.js` actually pin. *A suite which cannot fail is
lying* — so where a clause is unguarded, this document says so rather than
letting the green suite imply otherwise.

---

## §1 Governing law and identity

> **If you have to think about the interface, it failed. Every pixel earns its
> place.**

Quoted as the governing design law by `DECISIONS.md:8`, which cites it to
`§1/§6`: §1 is the first sentence, §6 is the second. It is the test every clause
below has to pass.

### §1.1 Identity comes from structure — never costume

`styles.css:3` has carried this line since the first commit, and B1 built the
app icon from it: the icon *is* a note frame, two text lines and one scratch
stroke, because those are the app's only structural marks.

The rule has teeth. It is what makes the frame, the scratch-out and the surface
tone legitimate, and it is what a decorative value fails. **A §2 value that
cannot name the job it does is wrong**, however good it looks.

v2 tests this harder than v1 did, because v2 gives the note a colour (§2.1). A
colour is costume unless it is doing structural work. It survives here for one
reason: the note is the brightest surface in the app because it is the only
thing the person made, and that is a statement about *what a note is*, not about
how it looks. If the ladder were re-tuned so that some other surface were
brightest, the identity would be wrong even if every contrast ratio still
passed.

### §1.2 Zero chrome

`index.html:21` — the board view carries no toolbar, no status bar, no mode
indicator, no empty state. The only persistent non-content elements on the sheet
are the four anchors and the two rules, and all six are furniture the board
would have if it were paper.

Every transient surface (menu, toast, selection chrome) is summoned and
dismissed. Nothing waits on screen to be noticed.

### §1.3 The board is the resting state

`DECISIONS.md:100`, from B10: the desk always shows a working page. An empty
database creates and opens a blank board. The list is never the landing view,
and there is no screen between launch and the caret.

### §1.4 Never colour alone

Every state distinguished by colour is also distinguished by geometry, position
or texture:

| State | Colour | And also |
|---|---|---|
| Complete | ink at 40% | the scratch-out texture (§4.3) |
| Focus | the ring (§2.3) | 2px geometry at an offset (§12) |
| Destructive | `--danger` | last in the menu, behind a hairline (§7) |
| Selection | — | an outline, no fill (§4.2) |
| Undo in the toast | `--accent-restore` | underlined (§9) |
| Pressed | — | border weight 2 → 3px (§4.2) |
| Rail drop target | `--accent-page` | the section frames itself (§10) |

B15 named the principle: robustness comes from geometry, not hue. §2.3's
two-tone focus ring is the same argument applied to a palette where no single
hue works on every ground.

### §1.5 Elevation means "temporary, above the page"

`index.html:80`. Shadow is not depth decoration; it is a statement that a
surface is transient. See §2.4 for the values and the complete list of what may
carry one. **Notes carry no shadow** — a note is *on* the page, not floating
over it.

---

## §2 Design tokens

`styles.css:8`. This section is the whole token layer. v1 tokenised colour and
board geometry only; every space, size, radius, border weight and type value was
a literal repeated at each use site, which is why four copies of the paper
colour exist in the repo with no shared source. §2.5–§2.7 close that.

### §2.1 The surface ladder

**The app is dark-only.** The v1 light/dark pair driven by
`prefers-color-scheme` (B16) is retired — not defaulted, retired. `PRD §1.4`
forbids the setting, so there is no switch to retire it *to*.

Six grounds, ordered by luminance. Depth reads as literal darkness.

| Token | Value | Rel. luminance | Role |
|---|---|---|---|
| `--letterbox` | `#000000` | 0.0000 | the desk, outside the sheet |
| `--chrome` | `#031019` | 0.0046 | menus, toast, board list, rail |
| `--furniture` | `#041F29` | 0.0117 | title compartment, Components, Requirements |
| `--board` | `#3A5958` | 0.0875 | the sheet; also rail board cards |
| `--shelf` | `#A6AAA9` | 0.3972 | Parking Lot ground; `.primary-btn` ground |
| `--note` | `#89c7c5` | 0.5020 | the note — the brightest surface in the app |

**`--letterbox` is true black.** On mobile `renderScale = 1` and the letterbox
is absent (B32); on desktop and on any aspect mismatch it is a large permanent
field. True black switches OLED pixels off, so the largest persistent area in
the app costs nothing to display and the board floats in void.

**The band recedes; the shelf and the notes are lit.** This inversion inside one
sheet is the ladder's whole argument. The band is an inset header — structure
you read past. The Parking Lot is a shelf — a surface things rest on. Notes are
brightest because they are the only thing the person made (§1.1).

#### §2.1.1 The generative law

B16 did not legitimise the v1 palette by listing it. It legitimised it by naming
the method — *"a single near-monochrome value scale generated from two poles"*,
pole chroma ≤ 0.018 OKLCH — and that method is what let B16 claim identity from
structure rather than costume. Six hand-picked hexes with verified ratios are
six assertions; they say nothing about what a seventh surface would be.

The ladder is therefore stated as a law, and the six values above are its
output:

1. **One axis: luminance.** A surface's position in the app is its position on
   the ladder. Nothing is distinguished from another surface by hue alone.
2. **The hue is one family.** Every ground is a desaturated cyan-green except
   `--letterbox`, which is achromatic because it is the absence of the app.
   `--danger` (§2.3) is the single warm value in the application and it is not a
   ground.
3. **Rungs are separated by their function, not by an interval.** The four dark
   rungs sit inside one luminance decade (0.000–0.088) because they are all
   "behind"; `--shelf` and `--note` sit an order of magnitude above because they
   are "in front". The gap between `--board` and `--shelf` is the largest in the
   ladder and it is where the ink flips (§2.2).
4. **A new rung must clear §2.2's crossover test before it exists.** Adding a
   surface means computing its luminance, reading its ink pole off §2.2, and
   confirming it is outside the forbidden band. A value that cannot carry text
   is not a ground; it is a line.

Deriving the rungs from an interval — an even luminance ladder, or a fixed
OKLCH step — was considered and is wrong here. It would space `--chrome` and
`--furniture` far enough apart to read as two different depths, when their job
is to read as one recessed mass with a seam in it (their mutual contrast is
1.13:1, and that is the intent, not a defect).

**Impermanent:** the six hex values. The law above is not.

### §2.2 The ink poles

| Token | Value | Rel. luminance |
|---|---|---|
| `--ink-light` | `#f4f5f1` | 0.9089 |
| `--ink-dark` | `#031019` | 0.0046 |

`--ink-dark` and `--chrome` are the same value. That is deliberate and it is
what makes §2.2.2 possible: one value is both the deepest surface and the ink
that reads on the lit ones.

#### §2.2.1 The crossover

The two poles are equal-contrast against a ground whose luminance is their
geometric mean, offset by WCAG's 0.05:

```
L_cross = √((L_light + 0.05) × (L_dark + 0.05)) − 0.05
        = √(0.9589 × 0.0546) − 0.05
        = 0.1788        (both poles land on 4.19:1 there)
```

> **Below `L = 0.1788` a ground takes `--ink-light`. Above it, `--ink-dark`.**

This is the rule; the table below is its output, not its source.

| Ground | L | `--ink-light` | `--ink-dark` | Takes |
|---|---|---|---|---|
| `--letterbox` | 0.0000 | **19.18** | 1.09 | light |
| `--chrome` | 0.0046 | **17.56** | 1.00 | light |
| `--furniture` | 0.0117 | **15.55** | 1.13 | light |
| `--board` | 0.0875 | **6.97** | 2.52 | light |
| `--shelf` | 0.3972 | 2.14 | **8.19** | dark |
| `--note` | 0.5020 | 1.74 | **10.11** | dark |

Every pairing in use clears WCAG AA (4.5:1); four clear AAA (7:1).

#### §2.2.2 The forbidden band

Solving each pole for 4.5:1 gives the range where **neither** pole can carry
body text:

```
light ink holds to   L ≤ 0.1631
dark  ink holds from L ≥ 0.1957
forbidden band:      0.163 < L < 0.196
```

> **No text-bearing surface may have a relative luminance between 0.163 and
> 0.196.** There is no ink in the palette that works there.

This is not hypothetical. v1's `--line #717575` has `L = 0.1752` — dead centre.
§2.3 retires it for exactly this reason, and the band is stated as a law so the
next mid-grey is rejected before it is authored rather than after.

**The band closes at 3:1.** Repeating the solve for non-text contrast gives
light ink holding to `L ≤ 0.270` and dark ink from `L ≥ 0.114` — they *overlap*.
So every ground in the ladder can carry a line, an icon or a border from one
pole or the other; only *text* has a hole. This asymmetry is load-bearing in
§2.3 and §2.5.3: it is why a mark can go anywhere a word cannot, and it is what
makes the drawn delete mark legal where the word "Delete" would not be.

#### §2.2.3 The crossover governs edges too

The crossover is not a text rule. It is the rule for **anything that must be
seen against a ground**: text, rules, hairlines, borders, drawn marks.

> **A line takes the same ink pole its ground takes.**

One law, three jobs. This supersedes the "every filled control carries a 2px
`--chrome` border" formulation, which was derived from the Parking Lot case and
does not generalise: `--chrome` clears 3:1 on `--shelf` (8.19) and `--note`
(10.11) but fails on `--letterbox` (1.09), `--chrome` (1.00), `--furniture`
(1.13) and `--board` (2.52). Under the pole rule every ground is covered, and on
`--shelf` it reduces to exactly what the old rule said.

### §2.3 Accents, lines and the focus ring

| Token | Value | Role |
|---|---|---|
| `--accent-restore` | `#B7E3E1` | Complete / Restore / Undo |
| `--danger` | `#E2A08C` | Delete |
| `--accent-page` | `#6E9C9A` | rail pager, drop target |

`--danger` is **the only warm hue in the application.** Everything else is cool
water; the one thing that destroys is the one thing that isn't. It need not
shout — §7's position (last) and the hairline above it already carry the
meaning, and §1.4 forbids colour from carrying it alone.

Accents as text, per ground:

| Accent | letterbox | chrome | furniture | board | shelf | note |
|---|---|---|---|---|---|---|
| `--accent-restore` | 15.09 | 13.82 | 12.24 | 5.49 | 1.69 | 1.37 |
| `--danger` | 9.64 | 8.83 | 7.82 | 3.51 | 1.08 | 1.15 |
| `--accent-page` | 6.89 | 6.30 | 5.58 | 2.50 | 1.30 | 1.60 |

> **An accent is legal as text only on `--letterbox`, `--chrome` and
> `--furniture`.** On `--board` only `--accent-restore` clears AA;
> `--accent-page` and `--danger` do not. On `--shelf` and `--note` none of them
> do. Accents on those grounds are **fills**, not text, and take `--ink-dark`
> labels (§2.2.1).

`--danger` on `--board` at 3.51:1 is the one case that reads as a near-miss and
is not: it clears 3:1, so a `--danger` **mark** on a rail card is legal while
`--danger` **text** there is not. §2.5's replacement of `🗑` with a drawn mark
takes this route deliberately — the form change is what makes the contrast
legal.

**`--line` is retired.** v1 carried a mid-grey (`#717575`) for rules, hairlines,
disabled states and the tap-ghost. It fails three of those four jobs on the v2
ladder: 1.64:1 on `--board` means the band rule — the element B33 through B38
fought five times to make permanent — would be invisible, and so would B18's
tap-ghost, which is the entire content of the 400ms acknowledgment window. A
grey that reads on every ground is a convention, not a value that works; §2.2.2
shows why no such grey can exist between these poles. **Rules and hairlines take
the ground's ink pole** (§2.2.3), at full strength when structural and at alpha
when merely grouping:

| Token | Value | Use |
|---|---|---|
| `--ink-light-rgb` | `244, 245, 241` | `rgb(var(--ink-light-rgb) / α)` |
| `--ink-dark-rgb` | `3, 16, 25` | `rgb(var(--ink-dark-rgb) / α)` |

α is `0.4` for destroyed text (§4.3, inherited from v1's `rgb(var(--ink-rgb) /
0.4)`) and `0.22` for a grouping hairline on `--chrome` (§7's separator). A
structural rule takes no alpha.

**The focus ring is two-tone**, and this is geometry rather than style:

```css
outline: 2px solid #f4f5f1;
box-shadow: 0 0 0 4px #031019;
outline-offset: 2px;
```

The two tones are the two ink poles, so by §2.2.1 exactly one of them clears on
any ground the ladder can produce — 19.18/17.56/15.55/6.97 on the four dark
grounds from the light tone, 8.19/10.11 on the two lit ones from the dark tone.
The ring's worst case across the whole app is **6.97:1**. This is B15's
"robustness from geometry, not hue" carried into a palette where hue could not
have done it.

### §2.4 Elevation

Cited by number at `index.html:80` — this subsection number is fixed.

```css
--elevation:       0 2px 8px rgb(0 0 0 / 0.25);
--elevation-inset: inset -3px 0 8px rgb(0 0 0 / 0.16),
                   inset  0 2px 4px rgb(0 0 0 / 0.10);
```

**Exhaustive list of what may carry `--elevation`:** `#menu`, `#toast`,
`.pane-drag-ghost`. Nothing else. Each is summoned, acted on and dismissed;
the shadow says so.

`#pane` takes `--elevation-inset` instead. The rail is the inverse case — it is
embedded in the page, not floating over it — and an inset shadow states that.
The inset is **directional**, carried in from the board-facing edge and the top
rather than glowing evenly inward: the rail is a trench cut into the page, and
the side the light falls from is the side the board is on. v1 wrote the pair
inline on `#pane`; naming it is what stops the next inset surface from inventing
its own.

v1 shipped `--elevation` with no dark-theme override, so the same 25%-black
shadow sat on a `#29232F` surface. Dark-only removes the inconsistency by
removing the second theme. On `--letterbox` a black shadow is invisible by
construction; that is correct, because a menu over true black is already
separated by 17.56:1 of its own ground.

### §2.5 Typography

**Montserrat Alternates**, self-hosted, **no CDN**. A CDN font is a network
dependency (`PRD §3.3`) and an uncacheable hole in an offline-first shell
(`PRD §3.2`). Fonts live in `fonts/`, are declared with `@font-face`, are listed
in `sw.js`'s `ASSETS`, and are subject to `PRD §8.1`'s cache bump.

**Three weights** — 400, 600, 800 — as Latin-subset `woff2`, with
`font-display: swap` so capture is never blocked on a font load (`PRD §1.1`).
Montserrat Alternates has no variable version, so each weight is a separate
file; three is the smallest set covering body, the existing 600 emphasis, and
the 800 button label.

#### §2.5.1 The size scale, with roles

Eight sizes, all inherited from v1. **Every size below has exactly one job.** A
size with two jobs is a size that cannot be changed.

| px | Weight | LH | Role | Where |
|---|---|---|---|---|
| 11 | 400 | — | page indicator | `.pane-cat-pages` |
| 12 | 600 | 1.3 | band label | `.band-label`, `.pane-cat-head` |
| 13 | 600 | — | inline row control | `.lot-actions .sel-btn` |
| 14 | 600 | — | floating control | `.sel-btn` |
| 15 | 600 | 1.3 | section name | `#anchor-title`, band anchors, `#lot-header`, `.pager-btn` |
| 15 | 400 | — | list content | `#toast .msg`, `.pane-card .row-title` |
| 16 | 400 | 1.45 | lot line | `.lot-text`, `#menu button` |
| 16 | 600 | — | primary label | `.primary-btn`, `#toast button` |
| 17 | 400 | 1.4 | **the note — the app's body text** | `.note-text`, `.board-row .row-title` |
| 18 | 700 | — | page heading | `#list-title` |

`.primary-btn` sets 16/800 rather than 16/600: it is the app's single primary
control and 800 is the only place the heaviest weight is used.

**13 and 14 are not collapsed, and 11 and 12 are not collapsed.** Both pairs
look like duplication and neither is safe to remove yet:

- 12px is **B38 arithmetic**. It is the largest whole size whose "Requirements"
  label clears `--card-w`'s 100px floor — ~94.4px at 12px against ~102.3px at
  13px, which fails. Touching it reopens the band.
- 13px exists because `.lot-actions .sel-btn` is 32px tall inside a 44px row and
  14px overflows it.

Recorded as known, not fixed: `#lot-header` sets 15px while the band's labels
set 12px, so the board names its sections at two sizes. B38 flagged this as "a
hierarchy call nobody has made" and it is still unmade. Unifying them is a band
change, not a type change.

#### §2.5.2 The typeface changes the band, and the band has been ruled on five times

> **The band is sized by the type it holds, not by the sheet** (B37).

Montserrat Alternates has a different apparent x-height and different advance
widths from `system-ui`. Two v2 values are therefore **not yet verified** and
must be measured against the shipped font files before release:

1. **`--card-h: 68px`** = `2 × (15px × 1.3) + 2 × 12 padding + 2 × 2 border`.
   The `2 ×` is two lines of title. If Montserrat Alternates' 15px line box
   differs, `--card-h` moves and `--rule-y` (= `--band-top + --card-h/2`) moves
   with it.
2. **12px labels clearing the 100px `--card-w` floor** (§2.5.1). The floor was
   computed from `system-ui`'s "Requirements" at ~118px. Re-measure in the new
   face; if it exceeds ~100px at 12px the floor moves, and `--card-w`'s `min()`
   changes.

The verification procedure is B37's: measure the **live board**, not a copy of
the stylesheet. `test/mobile.js [11c]` already does this and exists because
B36's version resolved a hand-copied clamp string in a throwaway probe and could
only ever catch `EXPORT_GEO` drifting from that copy, never from the CSS.

Read B33 → B35 → B36 → B37 → B38 before changing any of it. The arc is: right
numbers on the wrong sheet → fractions preserved but proportions lost →
symmetry mistaken for correctness → the type sets the vertical → and the reading
order was inverted the whole time.

#### §2.5.3 Glyphs

`✓ ↺ ▦ ⇩ ⧉ « ‹ › »` — typographic, not assets. Each must be verified to render
from the self-hosted subset rather than falling back to a platform font; a
fallback is a second typeface arriving unannounced.

**`🗑` is replaced by a drawn mark.** It was a colour emoji among monochrome
geometric marks — a bright foreign object on a near-black palette that also
overrode `--danger` — and `app.js` already reasoned against exactly this when it
chose `⇩` over `📄`. Swapping in another codepoint does not fix it, because
§2.5.3's own requirement (verify it renders from the subset) cannot be met
against a subset chosen for Latin text.

`.pane-del` draws its mark instead: two 1px rules crossed at ±45°, in
`--danger`. Three things fall out of that one change, which is why it is the
right one rather than merely an available one:

- it needs no glyph coverage at all, so it cannot fall back;
- it is monochrome by construction, so it cannot reintroduce a foreign palette;
- it stops being text, so WCAG 1.4.11's 3:1 applies instead of 1.4.3's 4.5:1 —
  and `--danger` on a `--board` card is **3.51:1**, which passes as a mark and
  fails as a word (§2.3).

The contrast problem and the palette problem had the same fix. Neither would
have been solved by choosing a better emoji.

### §2.6 Space and size

There is no modular scale and this document does not invent one. A ratio-derived
scale would be a pattern completed rather than a value earned (§1), and the
app's spacing is already determined by two real constraints: the 44px touch
floor (§6) and the type it wraps.

**The rhythm is even, dominated by 8 and 12.** Values in use: 2 · 4 · 6 · 8 ·
10 · 12 · 14 · 16 · 18 · 20 · 24, with structural sizes 28 · 32 · 34 · 36 · 44 ·
48 · 56 · 68 · 82 and one fixed 300 (the rail).

**Odd values exist only as border compensation, never as rhythm.** This is a
rule, not an observation. When a border thickens, its padding thins by the same
amount so the box does not reflow:

| Element | Rest | Pressed | Invariant |
|---|---|---|---|
| `.note-text` | `10px 12px` / 2px | `9px 11px` / 3px | box unchanged |
| `.pane-card` | `8px 12px` / 2px | `7px 11px` / 2px | box unchanged |
| `.anchor` | `2px 0 4px` | `2px 0 1px` / 3px | box unchanged |
| `#anchor-title` | `28px 12px 12px` | `28px 11px 11px` / `0 3px 3px` | box unchanged |

`#anchor-title`'s 28px top padding is `--band-top (14) + 14`, and the second 14
absorbs the border-top B38 removed so the type lands on the same pixel it did
when four sides were drawn.

**Minimum heights are the touch floor, not taste:** 44 (`.anchor`, `.lot-item`,
`.primary-btn`, `.tap-ghost`, `.pane-del`), 48 (`#menu button`, `#toast
button` — a menu row is the easiest thing to mis-hit), 56 (`.board-row`,
`.pane-card`). Desktop-only controls sit below 44 and above the 24px desktop
floor by design: `.sel-btn` 36, `.lot-actions .sel-btn` 32, `.pager-btn` 36×28
(§6).

### §2.7 Radius and border weight

Both are three-step sets, and each step means something.

| Radius | Meaning | Where |
|---|---|---|
| `2px` | a drawn thing | `.note-text`, `.note-scratch`, `.primary-btn`, `.pane-card`, `.sel-btn`, `.tap-ghost` |
| `3px` | the selection ring | `.sel-ring` only — 1px outside the note's own 2px so the ring reads as separate |
| `8px` | an elevated transient surface | `#menu`, `#toast` |

**The radius stays near-square.** Notes scale 0.5–2.0 and `NOTE_MIN_W = 60`, so
a large radius inside `transform: scale()` turns a minimum-width note into a
capsule. 2px reads as *drawn* rather than as a UI card at every size a note can
be. This is geometry, not taste.

| Border | Meaning |
|---|---|
| `1px` | hairline furniture — rules, separators, card edges |
| `2px` | a drawn object — notes, controls, compartment |
| `3px` | "I have this" — the pressed/tapped acknowledgment (§4.2) |

Colour for all three is §2.2.3: the ground's ink pole.

### §2.8 The paper palette — export only

The PDF export does not use §2.1's ladder. `PRD §9.4` states why: dark `--board`
prints as a slab of near-black and costs a cartridge to discover. The export is
a reference sheet *for paper*, and paper is the ground it is designed against.

v1 left this implicit — the exporter's three floats were commented against
`--paper`, `--ink` and `--ink-shadow`, tokens the dark-only move deletes. Naming
the palette separately is what stops three orphaned float triples from pointing
at names that no longer exist.

| Token | Hex | PDF float triple | Role |
|---|---|---|---|
| `--paper-export` | `#EEEBEF` | `[0.933, 0.922, 0.937]` | the sheet |
| `--ink-export` | `#221C24` | `[0.133, 0.110, 0.141]` | all text and rules |
| `--shade-export` | `#837B88` | `[0.514, 0.482, 0.533]` | dates, "— completed —" |

Ink on paper is **14.10:1**; shade on paper is **3.45:1** and carries only
non-essential ≥9pt metadata. `PDF_SCRATCH = ink × 0.97 + paper × 0.03` mixes
down rather than carrying an ExtGState, mirroring v1's `opacity: 0.97`.

These are the **only** colours in the export and they are not part of the
ladder. They do not appear on screen and no screen value appears in the PDF.

**Montserrat Alternates does reach the export**, so the document is
typographically the app's even though it is not chromatically the app's. The
embedding work is `PRD §9.5.2`.

### §2.9 Token migration from v1

Thirteen tokens exist in v1. **Every one has a fate here**; a token with no
stated fate is a call site nobody knows how to edit.

| v1 token | Sites | v2 |
|---|---|---|
| `--paper` | 22 | **split** — as a ground → §2.1's ladder by role; as a label on a fill → `--ink-dark` (§2.2.1) |
| `--ink` | 38 | **split** — `--ink-light` or `--ink-dark` by the ground it sits on (§2.2.1) |
| `--ink-rgb` | 1 | **renamed** → `--ink-light-rgb` / `--ink-dark-rgb` (§2.3), and now carries hairlines as well as destroyed text |
| `--ink-shadow` | 8 | **retired** — a second mid-tone has the same problem `--line` has (§2.2.2). Placeholders, dates and category heads take the ground's pole; the tap-ghost takes it too |
| `--letterbox` | 2 | **kept**, retuned to `#000000` (§2.1) |
| `--surface-raised` | 3 | **retired** → `--chrome`. v1 raised menus *above* paper; v2 sinks them below the board, and `--chrome` is that ground |
| `--hairline` | 6 | **retired** → `rgb(var(--ink-*-rgb) / 0.22)` (§2.3) |
| `--danger` | 7 | **kept**, retuned (§2.3) |
| `--accent-restore` | 5 | **kept**, retuned (§2.3) |
| `--focus-ring` | 11 | **retired** — no single hue works on six grounds. Replaced by the two-tone ring (§2.3) |
| `--elevation` | 3 | **kept** (§2.4), gains `--elevation-inset` for `#pane` |
| `--pane` | 1 | **retired** → `--chrome` |
| `--accent-page` | 2 | **kept**, retuned (§2.3) |

#### §2.9.1 The ground → ink binding

`--ink`'s 38 sites and `--paper`'s 22 cannot be find-and-replaced. Each resolves
by the ground beneath it:

| The element sits on | Text and lines take |
|---|---|
| `#board` free canvas, rail cards | `--ink-light` |
| `#menu`, `#toast`, `#list-view`, `#pane` | `--ink-light` |
| the title compartment, Components, Requirements | `--ink-light` |
| `#lot` and its rows | `--ink-dark` |
| inside a `.note` | `--ink-dark` |
| on an accent fill | `--ink-dark` |
| outside the sheet | `--ink-light` |

A note is the one element that **crosses grounds** — it sits on `--board` and is
dragged over `--shelf`. Its ink cannot follow the ground because its ink is on
its own fill; see §4 for why its border is the exception that proves §2.2.3.

#### §2.9.2 Five sync points, none automated

Changing a token in one place silently desynchronises the others:

1. `styles.css :root`
2. `index.html`'s two `theme-color` metas → collapse to one dark value
3. `manifest.json`'s `background_color` and `theme_color` → one dark value (the
   format has no dark variant)
4. `app.js`'s `PDF_PAPER` / `PDF_INK` / `PDF_SHADE` → §2.8, and note these do
   **not** follow the ladder
5. `icons/` — B1's motif is drawn in the poles and must be regenerated, as B16
   regenerated it

### §2.10 Coverage

| Clause | Pinned by |
|---|---|
| Contrast ratios | **nothing** — no test computes a ratio. §2.2/§2.3 are prose-verified only |
| Token existence | **nothing** |
| Band type metrics (§2.5.2) | `test/mobile.js [11c]` measures the live board, but against the *current* face |

The whole of §2 is unguarded. This is the largest untested surface in the spec.

---

## §3 Board geometry

`styles.css:67`, `app.js:8`. The sheet, the band, the Parking Lot and the
anchors. Scale is §11; this section is what is drawn inside the logical page.

### §3.1 The sheet

One fixed, bounded logical coordinate space rendered through a single
`transform: scale()`. **The board never pans and never zooms.** Browser
pinch-zoom is disabled at the platform level (`touch-action: none` on `body`,
`user-scalable=no` in the viewport meta) because the two-finger pinch is
reserved for scaling a note (B12, §5).

```css
#board { transform-origin: 0 0;
         transform: translate(var(--offx), var(--offy)) scale(var(--rs)); }
```

Because the scale is *uniform*, a note's frame stays square and §6's hit
arithmetic stays exact. A `cover` fit would crop edge furniture; an
axis-decoupled stretch would distort both (B17).

**The reference sheet is 900×1000.** It is what the band and lot proportions
were derived against and what the export draws (`PRD §7`). It is not the live
viewport — see §11.

Runtime custom properties published by `applyLayout` (`app.js:254-259`):

| Property | Fallback | Consumed at |
|---|---|---|
| `--logical-w` | `900px` | `styles.css:82` |
| `--logical-h` | `1000px` | `styles.css:83` |
| `--rs` | `1` | `styles.css:85` |
| `--offx` / `--offy` | `0px` | `styles.css:85` |
| `--lot-h` | `166px` | `styles.css:263` |

### §3.2 The top band

> **The band reads rule → header → content** (B38), the same three-part split
> the Parking Lot has used since day one. One section grammar on the board.

The band is **drawn furniture, independent of content** (B33). Before B33 the
band was emergent: the anchors' only rule was a `border-bottom` gated on
`.filled`/`:focus`, so *what this section is* rode on the same element as *this
section is empty* and inherited its transience. A blank board drew nothing; a
filled board lost its headers.

**Across is a fraction of the sheet, because it holds the sheet's own divisions.
Down is set by the type** (B37). These are not the same axis and must not be
made symmetric — B36 made both fractions and that *was* the regression B37
corrected.

Declared on `#board` (`styles.css:95-131`):

| Property | Mobile | Desktop | Derivation |
|---|---|---|---|
| `--gutter` | `2.6667%` | `24px` | 24/900 |
| `--card-gap` | `8px` | `8px` | — |
| `--card-w` | `min(37.7778%, 100% − 2×(--gutter + 100px + --card-gap))` | `340px` | 340/900; the 100px term floors the side columns |
| `--card-l` | `calc((100% − --card-w) / 2)` | same | centred by construction |
| `--band-top` | `14px` | `14px` | absorbed into padding (below) |
| `--card-h` | `68px` | `68px` | `2 × (15px × 1.3) + 2 × 12 + 2 × 2` |
| `--rule-y` | `calc(--band-top + --card-h / 2)` = **48px** | same | **the rule crosses the compartment's midpoint** |

The edges are **derived, not restated**. B33 wrote the card's right edge as the
literal `62.2222%` in three rules, and `#zone-components` reached the card's
*left* edge only because `100 − 62.2222 = 37.7778` — a dependency on the card
being centred that nothing named and no test guarded. Do not reintroduce a
literal here.

**The title is a compartment, not a card.** It draws **three sides**
(`border-top: 0`) starting at the sheet's own top edge, which is its fourth
side. Top padding is `28px` = `--band-top (14) + 14`, the second 14 absorbing
the undrawn border so the type lands on the pixel it did when four sides were
drawn. Tapped state is `border-width: 0 3px 3px` — **not** a flat `3px`, which
would resurrect the top border. No test catches that one; it only shows during
the 400ms window.

The compartment is the **one deliberate exception** to "no empty frames"
(`PRD §6.2`). That rule protects the free canvas; the compartment is permanent
furniture and is always drawn. Its shoulders are part of the title's hit area,
so a tap there focuses the title rather than dropping a note behind the frame.

Offsets, all measured from the rule (B38 adopted the lot's own numbers so the
two sections share one grammar):

| Element | Offset | = |
|---|---|---|
| `.band-zone` | `top: var(--rule-y); height: 0` | the zone *is* the rule's box |
| `.band-label` | `top: 8px` | rule + 8 |
| `.band-zone .anchor` | `top: 34px` | rule + 34 |
| compartment | `0` → `82px` | `--band-top + --card-h` |

`.band-zone` is `pointer-events: none` with its anchor `auto`, so everything in
the band that is not an anchor is bare canvas and a tap there captures.

Labels are `width: max-content` pinned to the **outer** gutter, so overflow
spills *inward* toward the card rather than off the sheet.

**The rule does not thicken on tap.** Side anchors grow a 3px baseline; the
compartment thickens its frame like a pressed note (§4.2).

### §3.3 The Parking Lot

A permanent region at the foot of the sheet for things that are not yet placed.
Its items are **unframed stacked text lines** — the one place in the app where
text is never framed (§4.4). That is the visual expression of the structural
fact that a lot item has no `x`/`y`: it is an ordered line, not a spatial
object, so it lives in block flow rather than on the absolute canvas (B6).

```css
#lot        { left: var(--gutter); right: var(--gutter);
              bottom: 16px; height: var(--lot-h, 166px); }
#lot-rule   { top: 0; height: 1px; }
#lot-header { top: 8px; }                 /* 15/600 — see §2.5.1 */
#lot-items  { top: 34px; bottom: 0; overflow: hidden; }
.lot-item   { min-height: 44px; }
```

**Height is a whole-row budget, stepped in JS because CSS cannot step a length**
(`app.js:392-393`):

```
LOT_HEAD = 34, LOT_ROW = 44, LOT_3ROW_MIN_H = 900
lotH() = 34 + 44 × (LOGICAL_H >= 900 ? 3 : 2)     // 166px or 122px
```

Three rows on a tall sheet, two on a phone. Desktop is always three because §11
pins `LOGICAL_H ≥ 1000`.

`overflow: hidden` means the height *is* the visible budget. **Rows past the
budget are clipped from view but still exist, still save and still export.**
That is deliberate: clipping is a rendering fact, not a data one.

### §3.4 The anchors

Four permanent regions on every board — Title, Components, Requirements, Parking
Lot. Always present, always in the same place, and they cannot be created,
moved, resized or deleted. They are furniture, not content.

`contenteditable` is toggled on **only while editing** and reverted on blur
(B2), so the gesture recognizer owns tap/drag/long-press without fighting native
focus. It is `plaintext-only` where supported, falling back to `true` (B3),
because the data model is plain strings.

`min-height: 44px` so an anchor is long-pressable even when empty. An anchor
returns to its placeholder on empty blur; there is no select-and-delete state
(`styles.css:149`).

### §3.5 Coverage

| Clause | Pinned by |
|---|---|
| Band and lot geometry | `test/mobile.js [11]`, `[11c]` — measures the **live board**, not a stylesheet copy |
| `EXPORT_GEO` agreement with the `--card-h` ceiling | `test/mobile.js [11c]` |
| Free canvas on a short sheet | `test/mobile.js [11]` |
| `#anchor-title.tapped` border-width | **nothing** — B38 flagged this explicitly |
| Lot row budget stepping | `test/mobile.js [11]` |

---

## §4 The note component

`styles.css:301`. The atom. **A tap on empty canvas creates a note at the tapped
point, in edit mode, with the caret placed** — instantly on mobile (§5). That is
`PRD §1.1` in one sentence and it is the single most important behaviour in the
app.

```css
.note        { position: absolute; transform-origin: top left;
               z-index: 2; touch-action: none; }
.note::before{ content: ""; position: absolute;
               inset: calc(-1 * var(--hit, 0px)); }     /* §6 */
.note-text   { display: block; width: max-content;
               max-width: var(--note-max-w, none);
               padding: 10px 12px;
               border: 2px solid var(--ink-dark);
               border-radius: 2px;
               background: var(--note);
               color: var(--ink-dark);                  /* 10.11:1 */
               caret-color: var(--ink-dark);
               font-size: 17px; line-height: 1.4;
               white-space: pre-wrap; overflow-wrap: break-word;
               outline: none; }
```

**The note carries no shadow** (§1.5).

### §4.1 Transform origin and truthful coordinates

`DECISIONS.md:57`. `transform-origin: top left` throughout — on the note, on
pinch, on resize.

This is not a style choice. With a top-left origin, stored `x`/`y` remain the
note's actual top-left at every scale, so scaling needs no drift compensation
and `PRD §1.3`'s "positions are permanent" is true of the stored value rather
than true after a correction. A centre origin would make every stored
coordinate a function of the current scale.

The only positional adjustment a scale may make is re-clamping into the page.

### §4.2 States and focus

Nine states. Each is distinguished by something other than colour (§1.4).

| State | Rendering |
|---|---|
| **empty** | `border-color: transparent; background: transparent` — the frame draws itself on the first character. **No empty frame ever exists** (`PRD §6.2`, B8, B31) |
| **idle** | as declared above |
| **editing** | `:focus` → the two-tone ring (§2.3) at `outline-offset: 2px`; `contenteditable` on |
| **pressed** *(drag or the 400ms window)* | `border-width: 3px; padding: 9px 11px` — the box does not reflow (§2.6) |
| **selected** *(desktop)* | `#selection` overlay in board space, inheriting `renderScale` and **never** `note.scale`; `.sel-ring` at radius 3px |
| **multi-selected** *(desktop)* | `outline: 2px solid var(--ink-light); outline-offset: 3px` on the node itself — zero JS positioning |
| **complete** | §4.3 |
| **leaving** | `opacity: 0` over §8's leave duration |
| **ghost** *(desktop only)* | `.tap-ghost`, 44×44, on empty canvas during the window |

**A note is never *filled* as acknowledgment.** A filled note is the completion
scratch-out, and an acknowledgment that reads as "completed" would be a lie for
400ms (B18). Thickening is the note's only press language.

**Selection is not edit.** Selection draws an outline; edit draws the focus
ring. They are different marks because they are different states, and v1 already
made this distinction with two different tokens.

At multi-selection size ≥ 2 the overlay **hides its edges and handles: resize is
single-selection only** (B41). Herding is a position operation; resizing many
things to one size is not something the person asserted.

#### §4.2.1 Width

A note wraps at **the sheet's right edge**, not at a predetermined width:

```
noteMaxW(n) = max(NOTE_MIN_W, (LOGICAL_W − renderX(n)) / effScale(n))
NOTE_MIN_W  = 60          // ~3 chars at 17px + 28px box chrome (2×12 + 2×2)
```

In authored units this reduces to `(rw − x) / scale`, which is **frame-
invariant**: the same note wraps at the same word on any device (B39). The cap
is live during a drag, and the export mirrors the same law so a cap-hitting note
cannot disagree between screen and PDF.

The variable lives on each `.note`, not on `#board`. A single board-level cap
made a note lose width twice on a narrowing phone — once as the cap tightened,
once from the homothetic multiplier.

`NOTE_MIN_W = 60` is **impermanent** (B39).

#### §4.2.2 Scale

`MIN_SCALE = 0.5`, `MAX_SCALE = 2.0`, applied through one shared helper so pinch
and frame-drag cannot diverge:

```
gestureScale(start, f) = clamp(start × f, min(0.5, start), max(2.0, start))
```

The clamps **widen to admit an out-of-range starting scale**, because a
cross-frame grab folds the homothetic multiplier into stored scale and can
legitimately land outside `[0.5, 2.0]` (B40). Clamping it back would move a
committed size, which `PRD §1.3` forbids.

### §4.3 The scratch-out

Completing does not delete and does not hide. It draws three families of ruled
strokes over the item at ≥90% coverage — **texture, not colour** — and destroys
the underlying text to 40% ink so no screenshot or zoom recovers it.

```css
.note-scratch { position: absolute; inset: 0; z-index: 2;
                border-radius: 2px; pointer-events: none; opacity: 0;
                background:
                  repeating-linear-gradient(  8deg, var(--ink-dark) 0 5px, transparent 5px 8px),
                  repeating-linear-gradient(-14deg, var(--ink-dark) 0 4px, transparent 4px 7px),
                  repeating-linear-gradient( 79deg, var(--ink-dark) 0 3px, transparent 3px 5px); }
.note.complete .note-scratch { opacity: 0.97; }
.note.complete .note-text    { color: rgb(var(--ink-dark-rgb) / 0.4); }
```

Three angles, three periods, all coprime-ish so no moiré alignment appears at
any scale. The radius tracks the note's (§2.7). Strokes are `--ink-dark` on the
note's own ground at 10.11:1.

This is `PRD §1.5`: the item stays in place, at its size, in its arrangement.
The board still shows that the work was done and where it sat. Completion is
reversible (Restore).

In the export a completed item is drawn scratched out and **emits no text object
at all** — the on-screen promise becomes a testable property of the file. The
obvious port (draw the text, hatch over it) yields a PDF `pdftotext` reads back
verbatim: identical-looking, promise broken.

For assistive technology the destruction is real too: the container swaps to
`aria-label="completed note"` and the text goes `aria-hidden` (§12).

### §4.4 Lot lines are never framed

`styles.css:277`. A lot line has no coordinates, so it gets no frame. It is the
one place in the app where text is never boxed, and that is the visual
expression of a structural fact rather than a stylistic preference.

**One narrow override**, scoped to desktop *and* selected *and* one row: the
selected lot row draws an `outline` in `--ink-dark` (B25). It is an outline, not
a border, so it does not enter the box model and the line's position does not
move when it is selected. Action buttons sit inline at the row's right edge
because `#lot-items` is `overflow: hidden` and a floating bar would be clipped.

Lot rows are **single-select**, reaffirmed by B41 — herding is a spatial
operation and a lot line is not a spatial object. They are not resizable: they
are not frames.

### §4.5 Coverage

| Clause | Pinned by |
|---|---|
| `noteMaxW` law, screen ≡ export | `test/desktop.js [D17]`, `test/mobile.js [18]`, `[11]` |
| No empty frame survives | `test/mobile.js` — empty-frame sweeps |
| Completed text absent from the PDF | `test/desktop.js` |
| Multi-selection and group drag | `test/desktop.js [D18]`, `[D19]` |
| Scratch-out geometry | **nothing** — the three angles are unguarded |
| The nine states | **partial** — `pressed` and `ghost` via `[D-window]`; `leaving` unguarded |

---

## §5 Gestures

`styles.css:57`, `app.js:11`. **One custom recognizer** (`onPointerDown` /
`Move` / `Up`) drives both grammars, branching on `isDesktop` inline. There is
no separate desktop code path.

### §5.1 The mode switch

```js
matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
```

A **capability** test, not a width or UA test (B19). This correctly keeps
tablets in touch mode, because desktop's hover grammar would strictly reduce a
touch-only device. There is no persistence and no manual override; a mode flip
tears down live state (selection, menu, long-press timer, pointer set) and pops
a pushed list entry so §10's history contract holds.

### §5.2 The two grammars

| | Mobile | Desktop |
|---|---|---|
| Create | tap empty canvas | click empty canvas (nothing selected) |
| Select | — | click |
| Move | drag | drag |
| Scale | two-finger pinch | drag the selection frame |
| Edit | tap | double-click, or `Enter` |
| Multi-select | — | shift-click (notes only) |
| Menu | long-press | right-click |
| Caret on edit | at the touch point | at the end |
| Boards | full-screen list | always-visible rail |

### §5.3 Thresholds

| Constant | Value | Meaning |
|---|---|---|
| `MOVE_THRESHOLD` | **16px** | slop before a drag begins or a long-press cancels |
| `LONGPRESS_MS` | **500ms** | menu summons |
| `DBLCLICK_MS` | **350ms** | second click on a selected item = edit |

**Any release before 500ms with movement under threshold commits as a tap**
(B5). This closes the 250–500ms band the original spec left undefined: there is
no "too slow to be a tap" state, because a slow tap is still a tap.

The slop is 16px, not 10px (B29). On a 7.6" foldable held one-handed a fingertip
rolls further than 10px, and every such tap was cancelled outright with **no
feedback of any kind**. One shared constant covers drag-start, long-press-cancel
and list rows — three call sites that must not drift.

### §5.4 Capture is synchronous

**Mobile capture runs synchronously in `pointerup`** — outside the 400ms
acknowledgment window, outside any timeout (B27).

A browser raises the soft keyboard for a programmatic `focus()` only inside user
activation, and `setTimeout(…, 400)` is outside it. Every mobile focus in v1 was
reached through the delay timer, so the keyboard raise was never guaranteed — it
was luck. `PRD §1.1` wins over uniformity here.

Compatibility mouse events are suppressed at `pointerdown` past the `isEditing`
guard, and **not** on the editing path. Without that, a touch tap fired
`pointerup`, the browser synthesized `mousedown`/`mouseup`/`click`,
`setPointerCapture` retargeted them to `#board` which cannot hold focus, and
their default action pulled focus out of the editor the tap had just opened —
leaving it empty at blur, so the empty-frame rule correctly destroyed it. *The
bug wore the costume of the fix.*

Accepted consequence: "first tap wins" no longer applies to capture. A
double-tap creates two notes; the second blurs the first and the empty-frame
rule discards it.

### §5.5 Long-press has no target over bare ground

**No long-press timer is armed over bare canvas or the lot background** (B30).
The release still captures. Arming it there produced a buzz and nothing else,
because neither surface carries a record id.

**The `pointerdown` that dismisses an open menu is inert and creates nothing.**
Dismissal is a retraction, not a choice of what was underneath.

The same shape applies mid-edit on desktop: an `isEditing(document.activeElement)
→ blur` guard sits **above** the selection check on both creation surfaces, so a
click away commits and dismisses, and the *next* click creates (B41).

### §5.6 Actions are acknowledged, not idle

Every committing action passes through `delayAction()`, a **400ms** window
measured from release (B18). Within it:

- the window is **filled**, never blank — content thickens, controls fill and
  drain their label, and an empty-canvas tap raises a `.tap-ghost`;
- a note is never filled as acknowledgment (§4.2);
- a second tap inside an open window is **dropped, not queued**.

400ms of nothing is indistinguishable from a dropped tap. This is the shared
primitive: **any new interactive action goes through it rather than a bespoke
timeout.**

The acknowledgment is **instant, not animated**, so `prefers-reduced-motion` has
nothing to remove and the window survives it intact (§8).

Four things sit outside the window, each for a stated reason:

| Outside | Why |
|---|---|
| Mobile capture | user activation (§5.4) |
| Desktop selection | commits nothing, and a delayed selection would swallow the second click of every double-click |
| Rail page turns | commits nothing |
| Category drop | a completed gesture, like a note drag — saved immediately |

> **`ACTION_DELAY = 400ms` is impermanent.** It is a felt value and
> re-interrogating it is invited.

### §5.7 Coverage

| Clause | Pinned by |
|---|---|
| Instant capture, focus and caret | `test/mobile.js` — taps dispatched as **genuine touch events** over CDP, because the bug lived in touch-to-mouse compatibility events |
| Touch slop | `test/mobile.js` |
| Long-press on bare paper | `test/mobile.js` |
| Menu dismissal creating nothing | `test/mobile.js` |
| The 400ms window and the ghost | `test/desktop.js` |
| Click-select / double-click-edit / drag | `test/desktop.js` |
| `DBLCLICK_MS` boundary | **nothing** |

---

## §6 The touch floor — every pixel earns its place

`app.js:32`, `DECISIONS.md:8,82`. §1 carries the first half of the governing
law; this section carries the second.

**44 CSS px physical on mobile** — the fingertip floor, WCAG 2.5.5 AAA.
**24px on desktop** — WCAG 2.5.8 AA and pointer-appropriate. A 44px collar on
desktop swallowed dismiss clicks, so the floor drops with the input device
rather than with the screen.

### §6.1 The hit area is decoupled from the frame

Because notes scale, the floor cannot be a fixed padding. Each note carries a
computed inset on a transparent `::before`:

```
--hit = max(0, (floor − physW) / 2, (floor − physH) / 2) / k
        where k = effScale(n) × renderScale
```

so that `inset × scale × renderScale ≥ 44px` physical (B7). **The hit area
expands; the visual frame does not.**

> Hit area is generous, never pixel-perfect to visual bounds.

This is the section's whole argument, and it is why "every pixel earns its
place" lives here rather than in §2: a pixel that is *reachable* is earning its
place even when it draws nothing.

### §6.2 Structural floors

Where an element does not scale, the floor is a `min-height` and not a
calculation:

| Floor | Elements |
|---|---|
| 44 | `.anchor`, `.lot-item`, `.primary-btn`, `.tap-ghost`, `.pane-del` |
| 48 | `#menu button`, `#toast button` |
| 56 | `.board-row`, `.pane-card` |

Menu and toast rows take 48 rather than 44 because a mis-hit there is
destructive or dismissive, not merely wrong.

**Below 44 by design, desktop only, all above the 24px desktop floor:**
`.sel-btn` 36, `.lot-actions .sel-btn` 32, `.pager-btn` 36×28. Each sits inside
a row that already meets its own floor.

### §6.3 Coverage

| Clause | Pinned by |
|---|---|
| `--hit` collar arithmetic | `test/mobile.js` — via tap-near-edge assertions |
| Desktop floor not swallowing dismiss clicks | `test/desktop.js` |
| The structural `min-height` set | **nothing** |

---

## §7 The menu

`app.js:14`, and the section `DECISIONS.md:22` followed over `PRD §6.6` when the
two conflicted. Summoned by long-press (mobile) or right-click (desktop) on a
note, lot line, anchor, board row or rail card.

### §7.1 The law

> **Navigation first, then the item's own actions in rising severity. The
> destructive action is always last, in `--danger`, behind a hairline** — and
> never distinguished by colour alone (§1.4).

A1 resolved the original spec conflict by following this law; B43 then reordered
the items *within* it. The law did not change — only what it sorted.

### §7.2 The menus, exhaustively

| Menu | Items |
|---|---|
| Item (note, lot line) | All boards · Complete/Restore · Copy · ─── · **Delete** |
| Anchor | Export · All boards |
| Board row / rail card | Export · ─── · **Delete** |
| Desktop selection buttons | Complete · Copy · **Delete** |
| Desktop multi-selection | Complete all *(Restore all only when **every** member is complete)* · ─── · **Delete all** |

At selection size 1 the labels are singular. The count is never printed: every
member wears a ring, so the board itself already states it and a number would be
something to reconcile.

**Every menu says "All boards."** The list view's own heading stays "Boards"
because it names a page, not a destination. One `COPY.boards` key renames every
menu site at once.

Copy takes no accent — accents mark state changes and Copy changes nothing. It
still runs through the 400ms window (§5.6) because a clipboard write has no
visible result of its own; the acknowledgment *is* the feedback.

**Copying a completed item is allowed.** The scratch-out withholds text from the
screen and from the export; the record still holds it, and Copy reads the record.

### §7.3 Geometry

```css
#menu        { min-width: 184px; padding: 6px 0; border-radius: 8px;
               background: var(--chrome); color: var(--ink-light);
               box-shadow: var(--elevation); }
#menu button { min-height: 48px; padding: 0 16px; gap: 12px;
               font: inherit; font-size: 16px; background: none; }
#menu .glyph { flex: 0 0 20px; }
#menu .danger{ color: var(--danger); }                  /* 8.83:1 on --chrome */
#menu .sep   { height: 1px; background: rgb(var(--ink-light-rgb) / 0.22); }
```

Menu rows carry **no fill at rest** and fill on tap (§5.6). They sit directly on
`--chrome`, so §2.2.3 gives them `--ink-light` and the separator an alpha of the
same pole (§2.3).

`--danger` is legal as *text* here because `--chrome` is one of the three grounds
where it clears AA (§2.3).

### §7.4 Coverage

| Clause | Pinned by |
|---|---|
| Menu order, all sites | `test/mobile.js [8]`, `test/desktop.js [D15]` |
| Right-click menu | `test/desktop.js` |
| Board-row export from the menu | `test/mobile.js` |
| Destructive-last placement | `test/desktop.js [D15]` |
| Separator presence | **nothing** |

---

## §8 Motion

`styles.css:829`. **A closed, justified set. Nothing else in the app animates.**

### §8.1 The set

| What | Property | Duration | Easing |
|---|---|---|---|
| `#menu` | opacity | `--dur-quick` | `--ease-settle` |
| `.note-scratch`, `.lot-scratch` | opacity | `--dur-settle` | `--ease-settle` |
| `#toast` | opacity + transform | `--dur-settle` | `--ease-settle` |
| `.leaving` (note, lot, row, card) | opacity | `--dur-quick` | `--ease-settle` |
| `html.desktop #board.swapping` | opacity | `--dur-settle` | `--ease-settle` |

```css
--dur-quick:  200ms;    /* was 120ms */
--dur-settle: 260ms;    /* was 150ms */
--ease-settle: cubic-bezier(0.16, 1, 0.3, 1);
```

`PRD §1.1`'s calm water asks for a slower settle than v1's brisk 120/150. The
curve is a long decelerate — most of the distance is covered early and the last
few percent take the tail, which is what a settle looks like and what a linear
or symmetric ease does not.

**The set does not grow.** No new motion has earned its place. Two things stay
instant and lengthening the set must not catch them:

- **Note capture** (§5.4). Nothing may sit between the intent to write and the
  caret.
- **The 400ms acknowledgment and the button press-translate** (§5.6, §10.3). A
  control that lags feels broken, not calm.

The toast's 8px rise is the only motion *distance* in the system.

### §8.2 The durations are duplicated in JS and must move together

Three JS constants are copies of the CSS values above. Changing one side alone
ships a teardown that beats its own animation:

| JS constant | v1 | v2 | Paired with |
|---|---|---|---|
| `LEAVE_MS` | 120 | **200** | `.leaving` |
| `SWAP_MS` | 150 | **260** | `#board.swapping` |
| toast teardown | 160 | **270** | `#toast`, always `--dur-settle + 10ms` |

### §8.3 Reduced motion is a kill-switch in **both** layers

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

Mandatory and global. But CSS alone is not sufficient, and this gets *worse* as
§8.1's durations lengthen:

The board swap is sequenced by `setTimeout`, not `transitionend`, precisely
because a zeroed transition never fires its event (B24). With the CSS killed,
the JS still waits `SWAP_MS` — so a reduced-motion user gets **260ms of nothing**
where v1 gave them 150ms of nothing. That is the exact failure §5.6 exists to
prevent.

> **A duration sequenced in JS must be zeroed in JS when reduced motion is set** —
> not merely zeroed in CSS. `LEAVE_MS` and `SWAP_MS` read
> `matchMedia('(prefers-reduced-motion: reduce)')` and collapse to `0`.

### §8.4 Coverage

| Clause | Pinned by |
|---|---|
| Anything in §8 | **nothing.** No test asserts a duration, an easing, or the JS/CSS pairing |

The pairing in §8.2 is the single most likely thing in this document to be
half-implemented, and nothing would catch it.

---

## §9 The undo toast

`app.js:13,1584`. Delete is undoable for **5 seconds** (`UNDO_MS = 5000`) via a
toast that restores exact prior state, including a note's original index in its
collection and its DOM order.

### §9.1 Behaviour

- A **batch delete is one window, one save and one Undo.**
- A new destructive action **finalizes or cancels** the prior undo — there is
  never a second pending toast.
- A pending note or lot Undo is **finalized on any board switch**. A board-delete
  Undo is **cross-board-safe and survives** one; the toast carries a scope for
  the distinction.
- The save-retry notice and the copy notices **never clobber a pending Undo**.
  An Undo is the only toast with a deadline.

### §9.2 Rendering

```css
#toast        { bottom: var(--toast-bottom, 12px); gap: 16px;
                padding: 8px 8px 8px 16px; border-radius: 8px;
                max-width: calc(100vw - 24px);
                background: var(--chrome); color: var(--ink-light);
                box-shadow: var(--elevation);
                transform: translateX(-50%) translateY(8px); opacity: 0; }
#toast.show   { transform: translateX(-50%) translateY(0); opacity: 1; }
#toast .msg   { font-size: 15px; font-weight: 400; }
#toast button { min-height: 48px; padding: 0 12px;
                font-size: 16px; font-weight: 600;
                background: none; color: var(--accent-restore);
                text-decoration: underline; }
```

`--accent-restore` on `--chrome` is **13.82:1**. The Undo is **underlined**, so
it is not distinguished by colour alone (§1.4) — the underline is the affordance
and the colour is the family.

`--toast-bottom` is published by `applyLayout` so the toast clears the lot on
short sheets.

### §9.3 Coverage

| Clause | Pinned by |
|---|---|
| Undo restores exact state and index | `test/desktop.js`, `test/mobile.js` |
| One window / one Undo for a batch | `test/desktop.js [D18]` |
| Toast never clobbers a pending Undo | **nothing** |
| `UNDO_MS` boundary | **nothing** |

---

## §10 The board list and the rail

`app.js:16`, `index.html:71`. Multiple boards; the board is the unit. **The list
is never the landing view** (§1.3).

> **Truncation is always indicated. No state, no statement.**

Two clauses of one idea: say what is hidden, and say nothing when nothing is.
A single page hides its own pager; a title that fits shows no ellipsis.

### §10.1 Mobile — the list

Full-screen, newest first. Routing uses the History API (`pushState` /
`popstate`) **specifically so the OS back gesture returns you to the board**.
Back is never intercepted, shadowed or disabled.

```css
#list-header  { padding: 16px 20px; gap: 16px; }
#list-title   { font-size: 18px; font-weight: 700; }      /* "Boards" */
#list-rows    { padding-bottom: 24px; }
.board-row    { min-height: 56px; padding: 12px 20px; border-radius: 2px;
                background: var(--chrome); color: var(--ink-light); }
.row-title    { font-size: 17px; text-overflow: ellipsis; }
.row-date     { font-size: 13px; }
```

### §10.2 Desktop — the rail

The list is **replaced**, not supplemented, by an always-visible 300px rail
(`PANE_W`). It sits **outside `#board`**, so the gesture recognizer never sees
its events, and it is **sunken rather than floating** (`--elevation-inset`,
§2.4) because it is embedded in the page.

Cards are ordered `createdAt` desc with an `id` tiebreak — **immutable**, so a
card's slot never moves. That is `PRD §1.3` applied to card order, and the
comparator's `updatedAt`/`createdAt` split is deliberate: do not "fix" it.

The rail sorts into **three equal sections — To-Do / Idea / Unsorted**. A
pointer-drag (not HTML5 DnD) moves a card between them, and the section under
the cursor **frames itself** in `--accent-page`. Release writes `category` and
`catStamp`, which sorts the card to the top of its new section.

**Overflow pages rather than scrolling.** Per-section budget is measured from
rail height and re-derived on resize; page state is per-category and reset to
page one on a drop. `«‹›»` pagers in `--accent-page`. A single page hides its
pager *and* its indicator.

| Constant | Value | CSS twin |
|---|---|---|
| `PANE_W` | 300 | `#pane { width: 300px }` |
| `PANE_CAT_HEAD` | 24 | `.pane-cat-head { flex: 0 0 24px }` |
| `PANE_PAGER_H` | 32 | `.pane-pager { flex: 0 0 32px }` |
| `PANE_ROW_H` | 56 | `.pane-card { min-height: 56px }` |
| `PANE_ROW_GAP` | 8 | `.pane-cat-cards { gap: 8px }` |

Each pair is a duplication the build does not enforce. Changing one side alone
mis-measures the page budget.

```css
#pane          { width: 300px; padding: 16px 12px 10px; gap: 12px;
                 background: var(--chrome); box-shadow: var(--elevation-inset); }
.pane-cat-head { font-size: 12px; font-weight: 600;
                 text-transform: uppercase; letter-spacing: 0.05em; }
.pane-card     { min-height: 56px; padding: 8px 12px; border-radius: 2px;
                 background: var(--board); border: 2px solid var(--ink-light); }
.pane-card .row-title { font-size: 15px; }
.pane-card .row-date  { font-size: 12px; }
.pane-del      { flex: 0 0 44px; }                        /* drawn mark, §2.5.3 */
.pager-btn     { min-width: 36px; min-height: 28px;
                 font-size: 15px; font-weight: 600;
                 background: var(--accent-page); color: var(--ink-dark);
                 border: 2px solid var(--ink-light); }
.pane-cat-pages{ font-size: 11px; }
```

**The card's border is `--ink-light`, not `--chrome`.** A `--board` card on a
`--chrome` rail is 2.52:1 — below WCAG 1.4.11's 3:1 — so a `--chrome` border
would leave the card's edge invisible against the ground it sits on. §2.2.3's
pole rule gives `--ink-light` at 17.56:1. This is one of the two cases that
retired the "always `--chrome`" formulation; the other is `.sel-btn` Copy
(§10.3).

A rail board swap is a **crossfade with no history push**, at `--dur-settle`
(§8.1) with `SWAP_MS` moving to match (§8.2). The History API contract is
*bypassed*, not touched.

### §10.3 Controls

Four species. All share one tactile signature; each keeps its own fill.

```css
.primary-btn { background: var(--shelf); color: var(--ink-dark);   /* 8.19:1 */
               border: 2px solid var(--ink-dark);
               border-radius: 2px;
               box-shadow: 0.1em 0.1em var(--ink-dark);
               font-size: 16px; font-weight: 800;
               min-height: 44px; padding: 0 18px; }
@media (hover: hover) {
  .primary-btn:hover  { transform: translate(-0.05em, -0.05em);
                        box-shadow: 0.15em 0.15em var(--ink-dark); }
}
.primary-btn:active   { transform: translate(0.05em, 0.05em);
                        box-shadow: 0.05em 0.05em var(--ink-dark); }
```

The offset shadow and press-translate are the **shared tactile signature** across
all four species — the thing that makes a control feel like a control. It is
instant, never eased (§8.1).

`.primary-btn` (`New board`) is the app's **single primary control** and the only
place weight 800 is used. It is `--shelf`-filled, so §2.2.1 gives it
`--ink-dark` ink and §2.2.3 gives it a `--ink-dark` edge — and both are the same
value, which is why this control needs no special case.

The hover is wrapped in `@media (hover: hover)`: mobile is the primary path and
a bare `:hover` sticks after a touch.

| Species | Fill | Border | Notes |
|---|---|---|---|
| `.primary-btn` | `--shelf` | `--ink-dark` | 16/800, min-height 44 |
| `.sel-btn` Complete/Restore | `--accent-restore` | `--ink-dark` | 14/600, min-height 36 |
| `.sel-btn` Delete | `--danger` | `--ink-dark` | 14/600 |
| `.sel-btn` Copy | `--chrome` | **`--ink-light`** | changes nothing, so no accent |
| `.pager-btn` | `--accent-page` | `--ink-light` | `opacity: 0.4` when disabled |
| Menu rows, toast Undo | none | none | bare on `--chrome`, fill on tap (§7.3, §9.2) |

**`.sel-btn` Copy is the second `--ink-light` border.** It sits on the board with
a `--chrome` fill at 2.52:1 — invisible at its edge under a `--chrome` border,
legible at 6.97:1 under `--ink-light`.

Lot-row buttons are the case the original border rule *was* derived from: they
sit on `--shelf`, where accent fills run 1.08–1.69:1 and a `--ink-dark` border is
8.19:1. §2.2.3 gives the same answer there, which is why it supersedes rather
than contradicts.

### §10.4 Coverage

| Clause | Pinned by |
|---|---|
| Rail create and swap | `test/desktop.js` |
| Rail card right-click menu | `test/desktop.js` |
| Back gesture returns to the board | `test/mobile.js` |
| List never the landing view | **nothing** |
| Pager budget vs. the five JS/CSS twins | **nothing** |
| Truncation indicated | **nothing** |

---

## §11 Scale to fit

`app.js:8`, cited alongside §3. §3 is what is drawn; this is how the logical
page reaches the screen.

### §11.1 The two branches

**Mobile — the sheet *is* the viewport** (B32):

```
LOGICAL_W = window.innerWidth
LOGICAL_H = window.innerHeight
renderScale = 1;  offX = 0;  offY = 0
LEGACY_H  = 900 × vh / vw        // what the pre-B32 build would have produced here
```

This overrides the earlier fixed-900 model because at `renderScale ≈ 0.45` a
24px title reached a phone as 10px and the 12px labels as 6px. **Legibility beat
abstraction.**

**Desktop — min-anchored so neither dimension drops below the reference** (B20):

```
renderScale = min(vh / 1000, (vw − 300) / 900)
LOGICAL_H   = vh / renderScale
LOGICAL_W   = (vw − 300) / renderScale
offX = 300;  offY = 0;  LEGACY_H = LOGICAL_H
```

`offX = 300` is the rail. Neither logical dimension ever drops below 900×1000,
which is what lets §3's fixed-px band values stay correct on desktop.

### §11.2 Positions are permanent

> **Committed notes are never re-clamped on resize.** A rotation or a window drag
> changes how a position renders, never what it is.

This is the single most-cited clause in `DECISIONS.md` and it is the reason
`rw`/`rh` exist. They are **the reference frame a note was authored against**,
not a position:

```
renderX(n) = n.x × (LOGICAL_W / (n.rw ‖ 900))
renderY(n) = n.rh ? n.y × (LOGICAL_H / n.rh)
                  : clamp(n.y × (LOGICAL_H / LEGACY_H), 0, LOGICAL_H − 44)
toLogical(cx, cy) = ((cx − offX) / renderScale, (cy − offY) / renderScale)
```

The clamp is scoped to the **legacy branch only** — pre-`rh` notes cannot have
their authoring height recovered (it was device-dependent, ~1700–2000), so they
are clamped at *render time*, never in storage.

**Never read `clientX`/`clientY` against note geometry.** Go through
`toLogical`.

### §11.3 Rendering is homothetic

Position's law applied to size (B40):

```
noteMult(n) = LOGICAL_W / (n.rw ‖ 900)
effScale(n) = (n.scale ‖ 1) × noteMult(n)
```

Resizing a window slides notes proportionally rather than letting fixed-size
notes collide. The multiplier is folded into stored scale **at grab**
(`rebaseNote`), which is visually silent and makes the multiplier 1 thereafter —
that is why §4.2.2's clamps must widen to admit an out-of-range start.

The multiplier itself is **never clamped**.

### §11.4 The soft keyboard

`interactive-widget=resizes-visual` in the viewport meta, **plus** a JS guard
that skips mobile re-layout while a `contenteditable` inside `#board` holds
focus, re-applied on `focusout` (B28).

The skipped layout is **deferred, not discarded** — a rotation or a fold
mid-edit is a real change and must land when the edit ends.

Without this the Android soft keyboard halved the sheet (measured 1983 → 1055
logical units), a low-committed note fell outside it, `overflow: hidden` clipped
it while it still held focus, the next tap blurred an invisible editor, and the
empty-frame rule discarded it. That loop is not a keyboard bug: it is the layout
law faithfully doing its job on a viewport that had stopped meaning what the law
assumed.

### §11.5 Coverage

| Clause | Pinned by |
|---|---|
| The keyboard-resize guard | `test/mobile.js` |
| Band/lot geometry across sheet sizes | `test/mobile.js [11]`, `[11c]` |
| `rw`/`rh` proportional render | `test/desktop.js [D17]`, `test/mobile.js [18]` |
| Positions never re-clamped on resize | **nothing directly** |
| Mode-flip teardown | `test/desktop.js` |

---

## §12 Accessibility

`styles.css:5`, `DECISIONS.md:48,121`.

### §12.1 Focus is visible on everything

One ring (§2.3), two offsets. **`+2px` on free-standing controls, `−2px` on
inset rows** — anything that clips or abuts its neighbour takes the inner offset
so the ring is not cropped.

| Offset | Elements |
|---|---|
| `+2` | `.anchor`, `.lot-text`, `.note-text`, `#toast button`, `.primary-btn`, `.pager-btn`, `.sel-btn` |
| `−2` | `#menu button`, `.board-row`, `.pane-card`, `.pane-del` |

Editing surfaces use plain `:focus` — while you are editing, the ring is always
visible. Controls use `:focus-visible`.

### §12.2 Roles and names

- `#board` is `role="application"` with `aria-roledescription="spatial board"`.
- **Every editable region carries `role="textbox"` and `aria-multiline="true"`**,
  always present — not toggled with `contenteditable`, because an element that
  loses its role between edits is a different element to a screen reader.
- `#toast` is `role="status" aria-live="polite"`.
- `#menu` is `role="menu"` with `role="menuitem"` children; glyph spans are
  `aria-hidden`.
- Rules, band labels and `#lot-header` are `aria-hidden` — they are drawn
  furniture and the anchors they label carry `aria-label` already.
- Rail sections are `role="group"` and **carry page state in `aria-label`**
  ("To-Do Boards, page 2 of 3") because the visual indicator is `aria-hidden`.
  This is §10's truncation law applied to a non-visual channel.
- **A completed item swaps to `aria-label="completed note"` with its text
  `aria-hidden`.** §4.3's destruction is real for assistive technology, not just
  visual — the same promise the export keeps.
- The rail is hidden from assistive technology off-desktop.

### §12.3 Keyboard

`tabindex="0"` on the three anchors and on every note and lot item.

| Key | Effect |
|---|---|
| `Tab` | selects on desktop, edits on mobile |
| `Enter` | edits the selection |
| `Esc` | deselects, or commits an edit |
| `Delete` / `Backspace` | removes the selection |
| `↑` / `↓` | move within an open menu |
| `Shift+F10` | opens the context menu, re-centred on the node rather than at 0,0 |

The menu **traps focus** while open: `Esc` closes, `Tab` cycles, the first item
is auto-focused, and focus returns to the invoker on close. The desktop keyboard
handler is **inert while a menu is open**, so `Delete` cannot fire behind it.

The pager re-focuses the successor button after a page turn, so a keyboard user
is not dropped to the top of the document.

### §12.4 Reduced motion

See §8.3 — global CSS kill-switch **and** JS zeroing. The 400ms acknowledgment
is instant by construction and therefore survives untouched.

### §12.5 Contrast

Text meets WCAG 1.4.3 AA (4.5:1) at every pairing in use; four clear AAA (§2.2).
Non-text UI meets 1.4.11 (3:1) at every pairing in use (§2.2.3, §10.3). The
focus ring's worst case anywhere in the app is 6.97:1 (§2.3).

`--shade-export` at 3.45:1 is the one sub-AA value in the system. It is export
only, carries only ≥9pt non-essential metadata (dates, "— completed —"), and is
on paper rather than screen (§2.8).

### §12.6 Known gaps

Stated rather than omitted, because an unstated gap reads as a covered one:

1. **`user-scalable=no`** blocks browser pinch-zoom app-wide — a WCAG 1.4.4
   concern, and a deliberate consequence of the app owning pinch as a note-scale
   gesture (§5.2). The mitigation is that the app has no fixed small type: the
   mobile sheet is 1:1 with the viewport (§11.1) precisely so nothing is
   rendered below its authored size.
2. **No `prefers-contrast` or `forced-colors` handling.** Forced-colors mode
   will override the ladder and the two-tone ring; nothing has been designed for
   what it produces.
3. **`role="application"` suppresses AT virtual navigation inside `#board`**, by
   design — the board is a spatial surface, not a document — but it means the
   arrow-key reading model is unavailable there.
4. **`#toast` is a polite live region containing an interactive control.** An
   Undo announced politely may be announced after its 5s window has closed.
5. **No skip link.**

### §12.7 Coverage

| Clause | Pinned by |
|---|---|
| Completed item's a11y swap | **nothing** |
| Focus visible on every control | **nothing** |
| Menu focus trap | **nothing** |
| Contrast | **nothing** |

§12 is almost entirely unguarded. Items 1–5 in §12.6 are known; the untested
clauses above are the ones that could regress silently.

---

## Appendix A — Citation convention

`styles.css` currently cites **two documents with one syntax**. In the same
file, bare `§6.1`, `§6.2` and `§6.5` mean *`PRD` §6.1 anchors, §6.2 notes, §6.5
Parking Lot*, while bare `§6` means *`UIUX` §6, the touch floor*. Nothing in the
text distinguishes them.

> **Cite with the document prefix: `PRD §6.2`, `UIUX §4.3`.** A bare `§x` is
> ambiguous and may not be added.

Existing bare citations are grandfathered but should be prefixed when the
surrounding rule is next touched. The ambiguous sites are `styles.css:140, 222,
249, 277, 280, 309, 335, 340, 345, 371, 395` and the section headers at 134 and
249, which pair a `UIUX §3` with a `PRD §6.1`/`§6.5`.

`app.js:2209` cites "styles.css §1", which does not exist as a marker in that
file — §1 is the unnumbered header block. Either number the header or repoint
the citation at `UIUX §1`.

---

## Appendix B — Open, known and not fixed

Carried forward so they are not rediscovered as bugs.

**Owed before v2 ships:**

1. **Band type metrics re-verified against Montserrat Alternates** (§2.5.2).
   `--card-h: 68px` and the 12px label's clearance of the 100px `--card-w` floor
   are both `system-ui` measurements. This is the highest-risk item in the
   release: it lands in geometry that has been ruled on five times.
2. **The §8.2 duration pairing** — three JS constants and three CSS values that
   must move together, with no test to catch a half-implementation.
3. **`icons/` regenerated in the new poles** (§2.9.2), as B16 regenerated them.

**Known, not fixed — pre-existing:**

- `#lot-header` sets 15px while band labels set 12px: the board names its
  sections at two sizes. A hierarchy call nobody has made (§2.5.1).
- §4.2.1's wrap law binds `x` only. Typing can still grow a note past the
  sheet's bottom, and a cross-frame arrival keeps its bottom overhang.
- Size rides the `x` ratio while `y` rides the height ratio, so an aspect change
  can still shift vertical clearances (§11.3).
- Group members hitting different clamps can compress a group's relative
  geometry at the sheet edge.
- `EXPORT_GEO` is a second, hand-maintained copy of §3's band and lot geometry.
  A shared constants module is the named fix and remains undone.

**Known, not fixed — found while writing this document, code not spec:**

- **`.note.tapped .note-text` and `.lot-item.tapped .lot-text` are unreachable.**
  `.tapped` is only ever applied by `delayAction`, and no code path passes a
  `.note` or `.lot-item` as the acknowledgment node. §4.2's pressed state reaches
  notes through `.pressed` alone. Either the rules are dead and should go, or the
  acknowledgment is missing on notes and should be wired — but the current state
  says one thing in CSS and does another in JS.
- **`--elevation` had no dark override in v1**, so the same 25%-black shadow sat
  on a `#29232F` surface. Dark-only removes the inconsistency by removing the
  second theme (§2.4), but the token was wrong for a year and nothing caught it.

**Marked impermanent** — felt values, re-interrogation invited:
`ACTION_DELAY = 400ms` (§5.6) · `NOTE_MIN_W = 60` (§4.2.1) ·
`MOVE_THRESHOLD = 16px` (§5.3) · the six hex values of the ladder (§2.1.1) ·
`--dur-quick` / `--dur-settle` (§8.1).
