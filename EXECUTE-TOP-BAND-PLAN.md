# Execute the top-band fix (issues #51, #52)

**Repo:** `aboveaveragerob/TheBoards` · **Spec:** `TOP-BAND-PLAN.md` on `main`

---

## Context

PR #61 merged the **design**, not the fix. `TOP-BAND-PLAN.md` is now on `main`
and issues #51 and #52 are still open — no source file has been touched. This
plan is the execution wrapper for the session that writes the code.

**It deliberately does not restate the spec.** Every CSS block, the `EXPORT_GEO`
table, the `frameOpenTop` helper and the B38 content are in `TOP-BAND-PLAN.md`,
steps 1–8. Copying them here would create a second copy that drifts — which is
the exact failure this repo keeps hitting (B36: correct CSS behind a stale cache;
`EXPORT_GEO`: geometry restated in two files). One source. Read the repo copy.

What this file adds is what a spec cannot carry: the order to work in, the
**exact set of assertions that must go red** in between, and the traps.

### Read first, in this order

1. `TOP-BAND-PLAN.md` — the whole thing, including its status blockquote
2. `DECISIONS.md` §G (B35, B36, B37) — three prior rulings on this same band,
   each of which broke the next thing. B38 has to be written knowing them.
3. `test/README.md` — in particular that a suite which cannot fail is lying

### The one caveat that travels with this work

The planning session **could not fetch the three issue screenshots** (the proxy
blocks `user-attachments`). The spec is derived from the issue text plus
B33–B37. If you can see the images, look at them before you start — and if they
contradict the spec, **the pictures win**; say so rather than implementing the
spec over the top of them.

---

## Branch

This PR's branch (`claude/review-issues-51-52-pt2z2c`) was cut fresh from `main`
*after* PR #61 merged — the earlier branch of the same name was deleted on
merge, and a merged PR cannot carry follow-up work. If you are resuming later
and need to re-cut it:

```
git fetch origin main
git checkout -B claude/review-issues-51-52-pt2z2c origin/main
```

Confirm `TOP-BAND-PLAN.md` is present before starting — if it is not, you are not
on the merged `main`.

---

## Order of work

The ordering matters: it turns the test suite into the instrument that proves the
change landed, rather than something to be fixed up afterwards.

### 0. Green baseline — before touching anything

```
python3 -m http.server 8000        # leave running
node test/mobile.js && node test/desktop.js && node test/sw-update.js
```

All three must exit 0 **before** you edit a line. If they do not, stop and report
that — a red baseline means the expected-failure list below is meaningless.
(`npm install playwright` first if it is not on `NODE_PATH`.)

### 1. Source only — spec steps 1–5

`styles.css` (the compartment, then the band's grammar), `app.js` (delete
`syncCardHeight`, then `EXPORT_GEO` + `exportBoardPage` + `frameOpenTop`),
`sw.js` (cache → `v7`). **Do not touch either test file yet.**

### 2. Confirm the failures are exactly the predicted ones

Re-run `mobile.js` and `desktop.js`. **Nine assertions must fail, and only these
nine.** Each one is a prior ruling being reversed, so each red line is evidence
the change landed:

| suite | block | assertion | why it must fail |
|---|---|---|---|
| mobile | [9c] | `the headers followed the card down` | labels no longer chase the card — this is the ruling being inverted |
| mobile | [11] | `title card is framed when empty` | reads `borderTopWidth`, now `0px` |
| mobile | [11] | `the rule crosses the card at its middle` | box is 0..82, midpoint 41, rule 48 — the *type* is still centred, the box is not |
| mobile | [11] | `band labels clear the card` | label top 56 is above card bottom 82, by design now |
| mobile | [11b] | `1000x715 label clears the card and the lot` | same assertion, short-sheet viewport |
| mobile | [11b] | `800x600 label clears the card and the lot` | same assertion, second viewport |
| mobile | [11c] | `EXPORT_GEO bandTop is the same top` | `bandTop` is retired, so the regex yields `NaN` |
| mobile | [11c] | `EXPORT_GEO label offset is the stylesheets 6px` | label is now `ruleY + 8` = 56, not `cardTop + cardMinH + 6` = 88 |
| desktop | [D8] | `title card is framed` | reads `borderTopWidth`, now `0px` |

**Anything else red is a real regression — diagnose it, do not paper over it.**
The ones most worth watching because they must stay **green**:

- `title card is 37.7778% of the sheet` (145.1 px) — the guard that `--card-w`
  was not touched. If this goes red you changed the compartment's width, which
  the owner explicitly ruled against.
- `band labels are not clipped` / `stay inside the gutters` — the guard on the
  12 px choice. Red here means the font size is wrong for the column.
- `band rule is at the card midpoint` (48) and `card crosses the band rule`
- `[11b]` free-canvas floors (0.65 / 0.60) — they measure `lot.top − card.bottom`
  and `card.bottom` is still 82, so they must not move
- everything in `desktop.js` except `[D8]`

### 3. Tests — spec steps 6–7

Update the nine, plus the additions the spec lists (compartment reaches the
sheet's top edge; `label.top − rule.top === 8`; labels at 12 px; the `[11]`
free-canvas measure moving to `lot.top − max(card.bottom, anchor.bottom)`; the
`[11c]` rewrite). Comments only in `[8]` and `[10]` — **do not move any tap
coordinate.**

Then confirm each edited assertion can still fail: revert the source change it
covers, watch it go red, restore. `test/README.md` is explicit that this is the
discipline, and B36 exists because a green suite and a correct stylesheet
coexisted with a user looking at neither.

### 4. `DECISIONS.md` — write B38 (spec step 8)

Six things to record; the spec lists them. House style is B35–B37: the ruling,
the arithmetic behind it, what it costs, and what would have to be true for it to
be replaced. Include the *known, not fixed* on `#lot-header` staying 15 px and
the *impermanent* on `EXPORT_GEO`.

### 5. Look at it

Spec's seven-point visual checklist at 384×846, plus dark mode and desktop.
Steps 1, 2 and 5 are the ones that would expose a wrong reading of the
screenshots; step 6 (export to PDF) is the one the test suite covers least.

---

## Traps

Ranked by how easily they slip through green tests:

1. **`.tapped` resurrects the top border.** `border-width: 3px` sets all four
   sides. It must be `border-width: 0 3px 3px`. No test catches this — it only
   appears during the 400 ms tap window.
2. **Do not couple the anchor's `top: 34px` to `--card-h`.** They both resolve to
   82 today only because `--card-h` is 68. Write `34px`, mirroring `#lot-items`.
3. **Do not touch `--card-w`, `--gutter`, `--card-l`, `--card-gap`.** The 12 px
   header exists precisely so these stay fixed.
4. **`--card-h`'s comment goes stale.** It reads "2px border x2"; the compartment
   now draws one horizontal border, not two. The value stays 68 — update the
   comment or it lies to the next reader.
5. **`.band-zone { height: 0 }` is deliberate.** Its children are absolutely
   positioned off its top edge and nothing measures the zone any more. Do not
   "fix" it to a real height.
6. **Stale comments in `styles.css`.** The blocks above `.band-zone`,
   `.band-label` and `#anchor-title` currently explain B35/B37 reasoning this
   change reverses. In a codebase where the comments carry the rulings, leaving
   them is worse than leaving no comment.
7. **`sw.js` v7 is not optional.** B36 is the ruling that exists because this was
   forgotten once and the fix never reached the device.

---

## Done

- [ ] Baseline green before any edit; the nine predicted failures observed after
      steps 1–5, with nothing else red
- [ ] All three suites green afterwards; each edited assertion confirmed still
      able to fail
- [ ] `grep -n "card-actual-h\|syncCardHeight" app.js styles.css` → nothing
- [ ] `grep -n "bandTop" app.js` → nothing
- [ ] `sw.js` reads `todo-boards-v7`
- [ ] B38 in `DECISIONS.md` §G
- [ ] `TOP-BAND-PLAN.md` status blockquote flipped to *implemented*, or the file
      deleted — B38 is the binding record once the code lands
- [ ] Visual checklist walked, including the export and desktop
- [ ] Pushed with `git push -u origin claude/review-issues-51-52-pt2z2c`; this
      PR taken out of draft / left ready for review, with `Closes #51` and
      `Closes #52` confirmed still in the body (this time the keywords are
      correct — the code is the fix, not just the plan).
