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

This is not a default with an escape hatch. `PRD §0.2` forbids the setting: the
app asks nothing of the person, and a theme is a question. One identity, no
choice to make.

### §2.2 The surface ladder

Six grounds, ordered by luminance. Depth reads as literal darkness.

| Token | Value | What it is | Rel. luminance |
|---|---|---|---|
| `--letterbox` | `#000000` | the desk, outside the sheet | 0.0000 |
| `--chrome` | `#031019` | menu, toast, board list, the desktop rail | 0.0046 |
| `--furniture` | `#041F29` | the title compartment; Components; Requirements | 0.0117 |
| `--board` | `#3A5958` | the sheet; also rail board cards | 0.0875 |
| `--shelf` | `#A6AAA9` | the Parking Lot ground | 0.3972 |
| `--note` | `#89c7c5` | the note — the brightest surface in the app | 0.5020 |

**The band recedes; the shelf and the notes are lit.** This inversion inside one
sheet is deliberate. The band is an inset header — structure you read past. The
Parking Lot is a shelf — a surface things rest on. And the note is the brightest
thing on the board because **it is the only thing the person *placed*.**

> That last clause is the corrected version of an earlier claim that the note is
> brightest because it is "the only thing the person made." It isn't — a Parking
> Lot line is also written by the person, which is why the shelf is the
> second-brightest ground and not a dark one. What separates a note from a lot
> line is not authorship but **coordinates** (`PRD §6.1`): a note has a position,
> a lot line is an ordered line. The ladder was already right; the sentence
> justifying it was not.

**On `--letterbox` being true black.** It is the darkest thing because it is
furthest from the light — the bottom of the water, in §1.1's register. It is
*not* black for the OLED power saving sometimes claimed for it: that benefit
lands on phones, and on the mobile path `renderScale = 1` (B32) means the
letterbox is never drawn at all. The saving applies where the surface doesn't
appear, and doesn't apply where it does. Keep the value; drop the argument.

### §2.3 Ink — one per surface, not one per app

Two poles:

| Token | Value | Bound on |
|---|---|---|
| `--ink-light` | `#f4f5f1` | `--letterbox`, `--chrome`, `--furniture`, `--board` |
| `--ink-dark` | `#031019` | `--shelf`, `--note` |

Verified contrast for every text-bearing surface:

| Ground | Ink | Ratio | Level |
|---|---|---|---|
| `--letterbox` `#000000` | light | **19.18:1** | AAA |
| `--chrome` `#031019` | light | **17.56:1** | AAA |
| `--furniture` `#041F29` | light | **15.55:1** | AAA |
| `--board` `#3A5958` | light | **6.97:1** | AA |
| `--shelf` `#A6AAA9` | dark | **8.19:1** | AAA |
| `--note` `#89c7c5` | dark | **10.11:1** | AAA |

Every pairing clears AA for normal text; five of six clear AAA.

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
must separate. Either the **fill** does it (≥3:1) or the **edge** does — and the
edge always can, because a surface's ink clears at least 6.97:1 against that
surface by §2.3.

Every adjacency that occurs in the running app:

| Touching | Fill | Edge | Separated by |
|---|---|---|---|
| sheet / desk | 2.75 | light **6.97** | edge |
| menu or toast / desk | 1.09 | light **17.56** | edge |
| title compartment / sheet | 2.23 | light **6.97** | edge |
| menu or toast / sheet | 2.52 | light **6.97** | edge |
| note / Parking Lot | 1.23 | dark **8.19** | edge |
| menu / compartment | 1.13 | light **15.55** | edge |
| rail card / rail | 2.52 | light **6.97** | edge |
| **note / note** (overlap) | 1.00 | dark **10.11** | edge |
| Parking Lot / sheet | **3.25** | — | fill |
| note / sheet | **4.01** | — | fill |
| toast / Parking Lot | **8.19** | — | fill |
| note / compartment | **8.95** | — | fill |

Two consequences worth stating out loud:

- **The note's 2px frame is the only thing separating two overlapping notes**
  (1.00:1 fill — they are the same colour). Free overlap with no snapping is a
  core behaviour (`PRD §4`), so the frame is not chrome around the note; it is
  what makes overlap legible. This is §1's "identity from structure" doing real
  work rather than asserting itself.
- **The sheet gets a drawn edge it did not have in v1.** At 2.75:1 the page does
  not separate from the desk by fill. It appears only where the letterbox is
  visible — desktop, and any aspect mismatch — because on mobile the sheet *is*
  the viewport and there is nothing to be an edge against. A bounded page is the
  product's central claim (`PRD §0.1`); drawing its bound is the thesis, not
  decoration.

**Rules.** `#band-rule` and `#lot-rule` are 1px at full surface ink — 6.97:1 on
the sheet and 8.19:1 on the shelf. This **supersedes** the proposal to draw them
in a mid-grey, which would have put them at 1.64:1 and 1.99:1 on the grounds they
actually sit on.

> **The lot rule survives the Parking Lot gaining a fill.** Once the shelf has a
> ground, the fill boundary (3.25:1) already announces the section, and a rule on
> top of it is two marks doing one job. The resolution is that they are one mark:
> the rule *is* the shelf's top edge, drawn in the shelf's own ink — which is
> both the section's rule and the fill's boundary, and satisfies §2.5 without
> adding anything. B38's "one section grammar on the board" is preserved: the
> band and the lot each announce themselves with a rule in their own ink.
> *Impermanent* — if the shelf fill alone proves sufficient in use, the rule is
> the thing to remove, and the band's rule is not affected either way.

**Hairlines.** A separator is that surface's ink at the lowest alpha clearing
3:1 on it — `0.40` on `--chrome`, where the only separators in the app live
(the menu's destructive divider, §7). v1's `0.14` was 1.43:1 there: invisible,
and therefore not earning its place at that weight.

```css
--hairline: rgb(var(--ink-a) / 0.4);
```

### §2.6 Accents

| Token | Value | Role | on `--chrome` | on `--furniture` | label when filled |
|---|---|---|---|---|---|
| `--accent-restore` | `#B7E3E1` | Complete / Restore / Undo | 13.82:1 | 12.24:1 | 13.82:1 |
| `--danger` | `#E2A08C` | Delete | 8.83:1 | 7.82:1 | 8.83:1 |
| `--accent-page` | `#6E9C9A` | rail pager, drop target | 6.30:1 | 5.58:1 | 6.30:1 |

> **An accent is text only on `--chrome` or `--furniture`. Anywhere else it is a
> fill carrying `--ink-dark`.**

This rule is the correction to a real hole. `--danger` is 3.51:1 on `--board` and
`--accent-page` is 2.50:1 — as text those are below AA and below the 3:1 non-text
floor respectively. As *fills* they are fine (a filled Delete button on the sheet
is 3.51:1 against it, which is what a UI component needs, and its label rides at
8.83:1). The placement rule keeps every accent on a ground where it works, and no
value has to change.

`--danger` is **the only warm hue in the application.** Everything else is cool
water; the one thing that destroys is the one thing that isn't. It need not
shout — position (last) and the hairline above it already carry the meaning
(§7, §1).

### §2.7 Focus

**The ring is two-tone**, and that is structural rather than stylistic:

```css
outline: 2px solid var(--ink-light);
box-shadow: 0 0 0 4px var(--ink-dark);
outline-offset: 2px;      /* -2px on inset rows */
```

No single colour works on all six grounds — `--ink-light` is 2.14:1 on the shelf,
`--ink-dark` is 1.00:1 on chrome. The two are exactly complementary, so the
doubled ring clears 3:1 on every ground **by construction**, not by tuning:

| Ground | light tone | dark tone | best |
|---|---|---|---|
| `--letterbox` | 19.18 | 1.09 | **19.18** |
| `--chrome` | 17.56 | 1.00 | **17.56** |
| `--furniture` | 15.55 | 1.13 | **15.55** |
| `--board` | 6.97 | 2.52 | **6.97** |
| `--shelf` | 2.14 | 8.19 | **8.19** |
| `--note` | 1.74 | 10.11 | **10.11** |

This is B15's "robustness from geometry, not hue," carried into the new palette
and made total.

---

## §3 Board geometry

The board is a fixed, bounded logical coordinate space rendered through a single
uniform `transform: scale()`. It never pans and never zooms; browser pinch-zoom
is disabled at the platform level because the two-finger pinch belongs to the
note (B12).

Geometry is specified in `PRD §7.3`. Two rendering facts belong here:

- **The scale is uniform.** Note frames stay square and the decoupled hit maths
  (§6) stays exact. A *cover* fit would crop edge furniture; an axis-decoupled
  *stretch* would distort the frame. Neither is available.
- **Band geometry is sized by the type it holds, not by the sheet** (B37).
  Across is a fraction of the sheet, because it holds the sheet's own divisions.
  Down is set by the type. The rule crosses the title compartment at its
  midpoint, and the band reads **rule → header → content** — the same three-part
  split the Parking Lot has always used (B38).

> The band has been ruled on five times: B33 → B35 → B36 → B37 → B38. Read that
> chain before changing band geometry. Each ruling corrected a regression the
> previous one caused. **§13.2 puts a measurement gate on it for v2**, because
> changing the typeface changes the type, and the band is sized by the type.

The title compartment is a *compartment*, not a card: the sheet's own top edge is
its fourth side, so only three are drawn (B38). It is the one deliberate
exception to "no empty frames" (§4) — that rule protects the free canvas; the
compartment is permanent furniture and is always drawn.

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
there is no drift to compensate (B4). Positions are data (`PRD §0.2`); a
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
property of the bytes (`PRD §4`).

### §4.4 Lot lines are never framed

Parking Lot items are unframed stacked text lines: the one place in the app where
text carries no frame. That is the visual expression of the structural fact that
a lot item has no coordinates (`PRD §6.1`).

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

The v2 invariant, and the correction it makes, is specified in `PRD §7.3` and
`FR-210`: across a device change the board is redrawn as a **similarity
transform** — one ratio for both axes and for size — so relative arrangement is
preserved exactly. v1 mapped `x` and `y` by two different ratios while sizing on
the width ratio alone, which is why arrangement survives a resize but not a fold.

---

## §12 Accessibility

Non-negotiable, and specified as requirements in `PRD §5.3`.

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
shell (`PRD §17`). Fonts live in `fonts/`, are declared with `@font-face`, are
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
the band. Before v2 ships:

1. Measure the rendered width of "Requirements" at 12px/600 in Montserrat
   Alternates. B38 chose 12px because "Requirements" is one word, cannot wrap,
   and must fit the 100px column `--card-w`'s floor guarantees. If the new
   measurement exceeds that column, the label size drops — the geometry does not.
2. Re-measure the two-line title box against `--card-h: 68px` at 15px/600/1.3.
   `--band-top + --card-h = 82` must still land the type on the same pixel.
3. Re-check the 11px pager against `PANE_PAGER_H = 32`.

This is a gate, not a preference: `test/mobile.js` already asserts band and lot
geometry, so a font change that moves the band **fails the suite**, which is the
correct outcome.

### §13.3 Marks

v1's glyph set — `✓ ↺ ▦ ⇩ ⧉ 🗑 « ‹ › »` — is **retired as type and redrawn as
inline SVG** in `currentColor`.

The reasoning is the one `app.js` already applies to `🗑` and then does not
follow through on. Montserrat Alternates is a Latin display face: of those ten
marks, only the guillemets are plausibly in a Latin subset. The other eight fall
back to whatever the platform supplies — which is exactly the objection raised
against the colour-emoji bin, multiplied by eight, and it means the app's
symbols are drawn by Android, iOS and Windows in three different voices.

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
requirements in `PRD §9` and `PRD §10`.

1. **Five colour sync points, none automated.** `styles.css :root`;
   `index.html`'s two `theme-color` metas (which collapse to one — there is one
   theme); `manifest.json`'s `background_color` and `theme_color`; and `app.js`'s
   `PDF_PAPER` / `PDF_INK` / `PDF_SHADE`, which are hand-derived floats. Changing
   a token in one place silently desynchronises the others. `PRD §9.1` requires a
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
