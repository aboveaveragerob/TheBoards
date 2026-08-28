# Skeuomorphic overhaul — speculative explorations

**These are throwaway design what-ifs, not the shipped design and not a
proposal to change it.** They explore a "what if TheBoards went full
skeuomorphic" prompt. Nothing here is cited by `app.js`, `styles.css`,
`sw.js`, or the three records, and none of it bumps `sw.js`'s `CACHE`.

> The shipped design is **deliberately anti-skeuomorphic**. `UIUX.md` §1
> governs by *"Identity comes from structure — frame, scratch-out, surface
> tone — never costume,"* notes carry **no shadow**, and the scene is *"calm
> water at depth, at dusk."* Every page below therefore departs from the
> app's stated law on purpose. Each one names, in its own critique panel,
> exactly what it trades away against that law — so these double as an honest
> argument for why the current flat system exists, not just eye-candy.

Each file is a self-contained HTML page (open directly or serve the repo
root and browse to it) that reskins the app's **real** screen anatomy — the
bounded sheet, the top band + title compartment + handle, four-to-five notes
on the deep (one completed, one highlighted), the Parking Lot, and a kit of
the shared controls, a list-view card, the undo toast and the context menu —
plus the four board-hue swatches (§2.2.2).

| # | File | Direction | One line |
|---|------|-----------|----------|
| 1 | `skeuo-1-wood-desk.html` | **Desk & Card Index** | Walnut desk, ruled manila index cards on brass eyelets, leather title plate. |
| 2 | `skeuo-2-dive-slate.html` | **Dive Slate & Sounding** | The app's own water metaphor made physical — etched acrylic slates glowing on a lit deep, sonar-contour bands. |
| 3 | `skeuo-3-celestial-atlas.html` | **Celestial Atlas & Orrery** | The dark stays dark as a night sky; enamel planisphere note cards, engraved brass rings. |
| 4 | `skeuo-4-cyanotype-drafting.html` | **Cyanotype Drafting Table** | Capture-then-arrange as literal drafting — vellum trace scraps on brass dots, parallel-rule chrome. |

Typography and colour are per-page and material-specific (each pulls its
faces from Google Fonts with real fallback stacks). They commit to a single
visual world by design, so they are single-theme.

To view all four: `python3 -m http.server 8000` from the repo root, then open
`http://localhost:8000/docs/proofs/skeuomorph-explorations/skeuo-1-wood-desk.html`.
