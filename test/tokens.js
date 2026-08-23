/* The design contract, falsifiable (PRD §9.6): parse the SHIPPED files and
 * reproduce every table in UIUX §2 by recomputing WCAG relative luminance from
 * the declared hexes — ranges asserted at their worst extremes (UIUX §2.2,
 * §16 item 10). Node-only, no browser, no dependencies.
 *
 * The expectations here are B58's scene — the second swap: the canvas is the
 * deep #020812, the band and the Parking Lot close both ends of the sheet in
 * the water field, and the sand is retired from the application. Against the
 * pre-swap tree this file fails, and it goes green only as the swap lands —
 * the same test-first discipline the recolor itself shipped under. It also
 * pins the five colour sync points (PRD §9.5.1), the accent placement rule
 * (UIUX §2.6) with B59's primary, self-hosting (UIUX §13.1), the shipped
 * cache (B36), the scratch pair that moves together or not at all (B53,
 * pole-flipped on the lot by B58), and the sw-update.js marker pair
 * (UIUX §16.3).
 *
 * Since B67 (issue #96) the ladder has THREE bindings — one per board type,
 * the same rungs at three hues (UIUX §2.2.2). Every §2 table below is asserted
 * against all three with one expected number, because B67 moved no luminance;
 * only §4.3's alpha composites are stated per ladder. The palette is therefore
 * parsed per scope rather than flat: see propsIn() below.
 *
 * Run: node test/tokens.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (n, c, extra) => {
  c ? (pass++, console.log('  PASS ' + n))
    : (fail++, console.log('  FAIL ' + n + (extra ? ' :: ' + extra : '')));
};

const read = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
const css = read('styles.css');
const html = read('index.html');
const app = read('app.js');
const sw = read('sw.js');
const swTest = read('test/sw-update.js');
const iconScript = read('icons/make-icons.js');
let manifest = {};
try { manifest = JSON.parse(read('manifest.json')); } catch (e) { /* asserted below */ }

/* ---- WCAG 2.x relative luminance and contrast, from the definition -------- */
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const rgbOf = hex => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const lum = hex => { const [r, g, b] = rgbOf(hex); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// Alpha-composite fg over bg in sRGB (how the browser paints rgb(c / a)), then hex.
const mix = (fg, bg, a) => {
  const f = rgbOf(fg), g = rgbOf(bg);
  return '#' + f.map((c, i) => Math.round(c * a + g[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
};
const r2 = x => Math.round(x * 100) / 100;
const r4 = x => Math.round(x * 10000) / 10000;

/* ---- The declared palette, parsed from styles.css ------------------------
 * Parsed PER SCOPE since B67: the ladder has three bindings, and a flat
 * last-wins scan would read whichever came last in the file as if it were
 * :root's. Comments are stripped first so a brace inside one cannot end a
 * block early; `[^{}]*` then matches innermost rules only, which is what a
 * custom-property block is. */
const cssBody = css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssBlocks = [];
for (const m of cssBody.matchAll(/([^{}]+)\{([^{}]*)\}/g))
  cssBlocks.push([m[1].trim().replace(/\s+/g, ' '), m[2]]);
// Every 6-digit custom property declared in blocks whose selector list mentions
// `needle`. Only 6-digit hexes count — a 3-digit shorthand or a var() alias is
// invisible here, and would be a way to smuggle a value past this witness.
const propsIn = needle => {
  const out = {};
  for (const [sel, body] of cssBlocks) {
    if (!sel.includes(needle)) continue;
    for (const d of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*[;}]/g)) out[d[1]] = d[2];
  }
  return out;
};
const declared = propsIn(':root');
const allHexes = new Set([...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m => m[0].toLowerCase()));

/* The ladder (UIUX §2.2 under B58) and its satellites. tokens.js restates the
   VALUES on purpose: it is the independent witness — if styles.css and
   UIUX §2 ever disagree, one of the two fails here. */
const T = {
  deep: '#020812', chrome: '#020812', card: '#08152c', frame: '#698ebf', note: '#a0d4da',
  waterTop: '#34697f', waterMid: '#255265', waterBot: '#163646',
  inkLight: '#f4f5f1', inkDark: '#031019',
  accentRestore: '#b6dee2', accentPage: '#6d9cb0', danger: '#E2A08C',
  highlight: '#F2D64B',   // the per-note highlight wash (UIUX §2.6.1, B71)
};
/* B67 (issue #96): the same ladder at two more hues, one per board type. Each
   rung reproduces the To-Do rung's WCAG relative luminance to the 4dp UIUX §2.2
   prints — the ladder's one axis is literally unmoved — so every ratio in
   §2.2/§2.3/§2.5/§2.7 below is asserted against ALL THREE with the same
   expected number. (OKLCH lightness and chroma were the aiming coordinates,
   not the pinned ones; they cannot both be exact across a hue change, and
   UIUX §2.2.2 prints the residuals. Luminance is what this file measures,
   because luminance is what the ratios are made of.) Only §4.3's alpha
   composites move (≤0.04, from 8-bit quantisation of the mix), and those are
   stated per ladder in [8]. `sel` is the scope styles.css binds them under;
   To-Do has no block because To-Do IS :root. */
const LADDER = {
  'To-Do': { sel: ':root', deep: T.deep, card: T.card, frame: T.frame, note: T.note,
             waterTop: T.waterTop, waterMid: T.waterMid, waterBot: T.waterBot },
  'Idea':  { sel: '#board[data-cat="idea"]',
             deep: '#000a06', card: '#001a0e', frame: '#52997f', note: '#b9d2b2',
             waterTop: '#486b49', waterMid: '#345439', waterBot: '#1f3825' },
  'Note':  { sel: '#board[data-cat="unsorted"]',
             deep: '#0c0512', card: '#1e0f28', frame: '#9d80b9', note: '#cec6ed',
             waterTop: '#6d5b83', waterMid: '#534769', waterBot: '#382e47' },
};
const LADDER_NAMES = Object.keys(LADDER);
// The retired sand family (B58/B59): present anywhere = the swap regressed.
const SAND = ['#e3d2b5', '#eaddc7', '#dbc7a3', '#d7b7ad', '#bec3bb', '#d4bfa0'];

console.log('\n[1] The surface ladder — tokens declared, luminances reproduce (UIUX §2.2, B58)');
{
  const need = {
    '--deep': T.deep, '--chrome': T.chrome, '--card': T.card, '--frame': T.frame,
    '--note': T.note, '--water-top': T.waterTop, '--water-mid': T.waterMid,
    '--water-bot': T.waterBot, '--ink-light': T.inkLight, '--ink-dark': T.inkDark,
    '--accent-restore': T.accentRestore, '--accent-page': T.accentPage, '--danger': T.danger,
  };
  for (const [name, hex] of Object.entries(need)) {
    ok(`${name} is ${hex}`, (declared[name] || '').toLowerCase() === hex.toLowerCase(),
      `declared ${declared[name]}`);
  }
  ok('--band the token is renamed --deep (B58): the name may not lie about the canvas',
    !/--band\s*:\s*#/.test(css) && !/var\(--band\)/.test(css));
  ok('--board-* stops are renamed --water-* (B58): they ground the two sections now',
    !/--board-top\s*:/.test(css) && !/--board-mid\s*:/.test(css) && !/--board-bot\s*:/.test(css));
  for (const hex of SAND) {
    ok(`sand ${hex} is retired from the application (B58/B59)`, !allHexes.has(hex));
  }
  ok('the turbulence wisps left with the sand (B58)',
    !/feColorMatrix/.test(Buffer.from((css.match(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/) || ['', ''])[1], 'base64').toString('utf8')) ||
    ![...css.matchAll(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g)]
      .some(m => Buffer.from(m[1], 'base64').toString('utf8').includes('feColorMatrix')));
  // The published luminances, at 4 decimals as UIUX §2.2 prints them.
  const L = [
    ['--deep', T.deep, 0.0023], ['--card', T.card, 0.0077], ['--frame', T.frame, 0.2611],
    ['--note', T.note, 0.5962], ['water top stop', T.waterTop, 0.1237],
    ['water mid stop', T.waterMid, 0.0737], ['water bottom stop', T.waterBot, 0.0325],
  ];
  for (const [name, hex, want] of L) {
    ok(`${name} luminance ${want}`, r4(lum(hex)) === want, String(r4(lum(hex))));
  }
}

console.log('\n[1b] The ladder rotates with the board type — three bindings, one axis (UIUX §2.2.2, B67)');
{
  // The rung -> token-name map, and the luminance each rung must hold on EVERY
  // ladder. This is the whole claim of B67: hue moves, the axis does not.
  const RUNG = { deep: '--deep', card: '--card', frame: '--frame', note: '--note',
                 waterTop: '--water-top', waterMid: '--water-mid', waterBot: '--water-bot' };
  const WANT_L = { deep: 0.0023, card: 0.0077, frame: 0.2611, note: 0.5962,
                   waterTop: 0.1237, waterMid: 0.0737, waterBot: 0.0325 };
  for (const name of LADDER_NAMES) {
    const lad = LADDER[name];
    const decl = propsIn(lad.sel);
    for (const [rung, token] of Object.entries(RUNG)) {
      ok(`${name}: ${token} is ${lad[rung]}`,
        (decl[token] || '').toLowerCase() === lad[rung].toLowerCase(), `declared ${decl[token]}`);
      ok(`${name}: ${token} luminance is the ladder's own ${WANT_L[rung]}`,
        r4(lum(lad[rung])) === WANT_L[rung], String(r4(lum(lad[rung]))));
    }
  }
  // The vignette reads the darkest stop as channels; the two spellings of one
  // colour must agree, on every ladder (styles.css --water-bot / --water-bot-a).
  for (const name of LADDER_NAMES) {
    const lad = LADDER[name];
    const want = rgbOf(lad.waterBot).join(' ');
    const body = cssBlocks.filter(([sel]) => sel.includes(lad.sel)).map(([, b]) => b).join('');
    ok(`${name}: --water-bot-a is ${want} — the darkest stop's own channels`,
      new RegExp('--water-bot-a:\\s*' + want.replace(/ /g, '\\s+') + '\\s*;').test(body), body.match(/--water-bot-a:[^;]*/));
  }
  // The rotation is real: no two ladders may share a rung's value, or a board
  // type would be a relabel rather than a scene.
  for (const rung of Object.keys(RUNG)) {
    const vals = LADDER_NAMES.map(n => LADDER[n][rung].toLowerCase());
    ok(`the three ladders differ at ${RUNG[rung]}`, new Set(vals).size === 3, vals.join(' '));
  }
  // --chrome does not rotate: the room behind the page is one room (B55).
  for (const name of LADDER_NAMES.filter(n => n !== 'To-Do')) {
    ok(`${name}: --chrome is not rebound — one room behind all three (B55)`,
      !('--chrome' in propsIn(LADDER[name].sel)));
  }
  // The binding is a rebinding, not a bypass: the four layers still read var().
  ok('the list/rail cards rotate with their section (UIUX §10)',
    /\.board-cat\[data-cat="idea"\]/.test(css) && /\.board-cat\[data-cat="unsorted"\]/.test(css));
  ok('app.js sets the scope from the record and carries no colour of its own (B67)',
    /el\.board\.dataset\.cat = catOf\(current\)/.test(app));
  // The drag ghost is fixed off document.body, outside its section's scope, so
  // it has to carry the attribute itself or a green card turns blue in the air.
  ok('the card drag ghost carries its own scope (B67)',
    /ghost\.dataset\.cat = catOf\(b\)/.test(app) &&
    /\.card-drag-ghost\[data-cat="idea"\]/.test(css) &&
    /\.card-drag-ghost\[data-cat="unsorted"\]/.test(css));
  // A section and its ghost draw the water's upper fall and nothing else, so
  // the two stops they read must agree with the board's — one hue, not two.
  for (const name of LADDER_NAMES.filter(n => n !== 'To-Do')) {
    const lad = LADDER[name], cat = lad.sel.match(/"([^"]+)"/)[1];
    const cardScope = propsIn(`.board-cat[data-cat="${cat}"]`);
    ok(`${name}: the card's water agrees with the board's`,
      cardScope['--water-top'] === lad.waterTop && cardScope['--water-mid'] === lad.waterMid,
      JSON.stringify(cardScope));
  }
  // The ink poles, the accents, and the highlight wash are app-level, not
  // scene-level (the highlight means one thing on every board type — B71).
  for (const name of LADDER_NAMES.filter(n => n !== 'To-Do')) {
    const decl = propsIn(LADDER[name].sel);
    for (const dead of ['--ink-light', '--ink-dark', '--accent-restore', '--accent-page', '--danger', '--highlight'])
      ok(`${name}: ${dead} is not rebound per board type`, !(dead in decl), decl[dead]);
  }
}

console.log('\n[2] One ink per surface — every published ratio reproduces (UIUX §2.3, B58)');
{
  // One expected number per row, asserted against every ladder (B67): the ink
  // ratios are a function of luminance alone, and B67 moved no luminance.
  const rows = [
    ['light ink on the deep', 'deep', T.inkLight, 18.33],
    ['light ink on the card', 'card', T.inkLight, 16.62],
    ['light ink on the water, lightest stop', 'waterTop', T.inkLight, 5.52],
    ['light ink on the water, darkest stop', 'waterBot', T.inkLight, 11.62],
    ['dark ink on the note', 'note', T.inkDark, 11.84],
  ];
  for (const [name, rung, ink, want] of rows) {
    for (const lname of LADDER_NAMES) {
      const g = LADDER[lname][rung];
      ok(`${name} = ${want} (${lname})`, r2(contrast(g, ink)) === want, String(r2(contrast(g, ink))));
    }
  }
  const onDark = css.match(/\.on-dark\s*{([^}]*)}/);
  const onLight = css.match(/\.on-light\s*{([^}]*)}/);
  ok('.on-dark binds --ink to the light pole', !!onDark && /--ink:\s*var\(--ink-light\)/.test(onDark[1]));
  ok('.on-light binds --ink to the dark pole', !!onLight && /--ink:\s*var\(--ink-dark\)/.test(onLight[1]));
  const chan = hex => rgbOf(hex).join(' ');
  ok('.on-dark --ink-a channels are ' + chan(T.inkLight) + ', space-separated',
    !!onDark && new RegExp('--ink-a:\\s*' + chan(T.inkLight) + '\\s*;').test(onDark[1]), onDark && onDark[1]);
  ok('.on-light --ink-a channels are ' + chan(T.inkDark) + ', space-separated',
    !!onLight && new RegExp('--ink-a:\\s*' + chan(T.inkDark) + '\\s*;').test(onLight[1]), onLight && onLight[1]);
  ok('no comma-separated --ink-a survives',
    !/--ink-a:\s*\d+\s*,/.test(css) && !/--ink-rgb\s*:/.test(css) && !css.includes('var(--ink-rgb)'));
  // The binding flip B58 orders: the lot sits on water and speaks light ink.
  ok('#lot carries .on-dark in index.html (B58)',
    /<div id="lot" class="on-dark"/.test(html));
  ok('the notes are the one .on-light island left',
    /'note on-light'/.test(app));
}

console.log('\n[3] The crossover and the forbidden band (UIUX §2.3.1, §2.3.2)');
{
  const cross = Math.sqrt((lum(T.inkLight) + 0.05) * (lum(T.inkDark) + 0.05)) - 0.05;
  ok('crossover from the poles is 0.1788', r4(cross) === 0.1788, String(r4(cross)));
  // UIUX §2.2.1 rule 4: every new value clears the crossover test before it
  // exists. B67 authored fourteen, so all three ladders are put through it.
  const grounds = [T.chrome, ...LADDER_NAMES.flatMap(n =>
    ['deep', 'card', 'waterTop', 'waterMid', 'waterBot', 'note'].map(r => LADDER[n][r]))];
  for (const g of grounds) {
    const L = lum(g);
    ok(`ground ${g} (L=${r4(L)}) is outside the forbidden band`, L <= 0.163 || L >= 0.196);
  }
  const darkGrounds = [T.chrome, ...LADDER_NAMES.flatMap(n =>
    ['deep', 'card', 'waterTop', 'waterMid', 'waterBot'].map(r => LADDER[n][r]))];
  for (const g of darkGrounds) {
    ok(`ground ${g} is below the crossover (takes light ink)`, lum(g) < cross);
  }
  for (const n of LADDER_NAMES) {
    ok(`ground ${LADDER[n].note} is above the crossover (takes dark ink)`, lum(LADDER[n].note) > cross);
  }
}

console.log('\n[4] Edges, rules and hairlines — every adjacency at the worst extreme (UIUX §2.5, B58)');
{
  // Every adjacency on the sheet, on every ladder (B67). An adjacency is a
  // ratio between two rungs of the SAME scene — a board never mixes ladders.
  const rows = [
    ['card border on the card', 'frame', 'card', 5.39],
    ['card border on the deep', 'frame', 'deep', 5.95],
    ['lot / canvas fill, the water\'s lightest stop', 'waterTop', 'deep', 3.32],
    ['note / canvas fill', 'note', 'deep', 12.36],
    ['note / water, lightest stop', 'note', 'waterTop', 3.72],
    ['card / deep fill — deliberately quiet', 'card', 'deep', 1.10],
  ];
  for (const [name, a, b, want] of rows) {
    for (const lname of LADDER_NAMES) {
      const x = LADDER[lname][a], y = LADDER[lname][b];
      ok(`${name} = ${want} (${lname})`, r2(contrast(x, y)) === want, String(r2(contrast(x, y))));
    }
  }
  for (const lname of LADDER_NAMES) {
    const n = LADDER[lname].note;
    ok(`note / note edge — dark ink on the note = 11.84 (${lname})`,
      r2(contrast(n, T.inkDark)) === 11.84, String(r2(contrast(n, T.inkDark))));
  }
  // B58's structural inversion: the band's water darkens to its bottom stop at
  // the rule, meeting the deep at 1.58 — under the 3:1 fill floor — so the
  // band's rule is LOAD-BEARING now, and must clear 3:1 on both its grounds.
  // B67 rotated the hue and left this seam exactly where B58 put it.
  for (const lname of LADDER_NAMES) {
    const { deep, frame, waterBot } = LADDER[lname];
    ok(`the band/canvas seam fails by fill at the dark extreme (1.58): the rule must carry it (${lname})`,
      r2(contrast(waterBot, deep)) === 1.58, String(r2(contrast(waterBot, deep))));
    ok(`the load-bearing rule clears 3:1 on the deep (5.95) (${lname})`,
      contrast(frame, deep) >= 3);
    ok(`the load-bearing rule clears 3:1 on the water's darkest stop (3.77) (${lname})`,
      r2(contrast(frame, waterBot)) === 3.77 && contrast(frame, waterBot) >= 3,
      String(r2(contrast(frame, waterBot))));
  }
  // B61: both ends of the sheet close with the same line.
  ok('#lot-rule is drawn in --frame — the same idiom at both ends (B61)',
    /#lot-rule\s*{[^}]*background:\s*var\(--frame\)/s.test(css));
  // B65: the compartment's handle is the card's own line, filled — a control
  // made of the edge it sits on, and deliberately not --accent-page, which B59
  // gave to the controls that MAKE a board (both are on screen at once on
  // desktop). The fill's separation is the pair already published above.
  ok('the compartment\'s handle is --frame filled, --ink-dark label (B65)',
    /#title-menu\s*{[^}]*background:\s*var\(--frame\)[^}]*}/s.test(css) &&
    /#title-menu\s*{[^}]*color:\s*var\(--ink-dark\)[^}]*}/s.test(css));
  ok('and it is NOT the primary\'s accent (B59 keeps --accent-page)',
    !/#title-menu\s*{[^}]*var\(--accent-page\)[^}]*}/s.test(css));
  ok('--frame filled, dark label = 5.70', r2(contrast(T.frame, T.inkDark)) === 5.70,
    String(r2(contrast(T.frame, T.inkDark))));
  ok('--hairline is that surface\'s ink at 0.40',
    /--hairline:\s*rgb\(var\(--ink-a\)\s*\/\s*0\.4\)/.test(css));
  const hair = contrast(mix(T.inkLight, T.chrome, 0.4), T.chrome);
  ok('the hairline clears 3:1 on chrome (3.52)', r2(hair) === 3.52 && hair >= 3, String(r2(hair)));
}

console.log('\n[5] Accents — values, worst-extreme ratios, and the placement rule (UIUX §2.6, B59)');
{
  const rows = [
    ['--accent-restore on chrome', T.accentRestore, T.chrome, 13.90],
    ['--accent-restore on the card', T.accentRestore, T.card, 12.60],
    ['--accent-restore filled, dark label', T.accentRestore, T.inkDark, 13.31],
    ['--danger on chrome', T.danger, T.chrome, 9.22],
    ['--danger on the card', T.danger, T.card, 8.35],
    ['--danger filled, dark label', T.danger, T.inkDark, 8.83],
    ['--accent-page on chrome', T.accentPage, T.chrome, 6.72],
    ['--accent-page on the card', T.accentPage, T.card, 6.09],
    ['--accent-page filled, dark label', T.accentPage, T.inkDark, 6.44],
  ];
  for (const [name, a, b, want] of rows) {
    ok(`${name} = ${want}`, r2(contrast(a, b)) === want, String(r2(contrast(a, b))));
  }
  // B59: the primary control takes the accent about boards; with the sand gone
  // the only warm hue left in the application is the destructive one.
  ok('the primary control is --accent-page filled (B59)',
    /\.primary-btn\s*{[^}]*background:\s*var\(--accent-page\)/s.test(css));
  const accentText = [];
  for (const m of cssBody.matchAll(/([^{}]+){[^}]*color:\s*var\((--danger|--accent-restore|--accent-page)\)[^}]*}/g)) {
    accentText.push(m[1].trim().replace(/\s+/g, ' '));
  }
  const chromeGrounded = /^(#menu|#toast|\.pane-del|\.sel-btn\.[\w-]+\.tapped|\.primary-btn\.tapped)/;
  for (const sel of accentText) {
    ok(`accent as text only on a near-black ground: "${sel}"`,
      sel.split(',').every(s => chromeGrounded.test(s.trim())), sel);
  }
  const onContent = /(\.note(?:-text)?|\.lot-text|\.lot-item|#board\b|\.anchor|\.band-label)[^,{]*$/;
  ok('no accent is a text colour on the water or the note',
    accentText.every(sel => sel.split(',').every(s => !onContent.test(s.trim()))),
    accentText.join(' | '));
}

console.log('\n[5b] The highlight wash — value, dark-ink contrast, note-surface placement (UIUX §2.6.1, B71)');
{
  ok(`--highlight is ${T.highlight}`, (declared['--highlight'] || '').toLowerCase() === T.highlight.toLowerCase(),
    declared['--highlight']);
  // It carries the note's dark ink at the published 13.27:1 (UIUX §2.6.1).
  ok('--highlight with --ink-dark = 13.27', r2(contrast(T.highlight, T.inkDark)) === 13.27,
    String(r2(contrast(T.highlight, T.inkDark))));
  // A highlight is a NOTE SURFACE, not a chrome accent: it fills .note-text, and
  // the note is the one .on-light island (UIUX §2.6.1 — the accent placement
  // rule does not reach it).
  ok('--highlight fills the highlighted note surface (.note.highlight .note-text)',
    /\.note\.highlight\s+\.note-text\s*{[^}]*background:\s*var\(--highlight\)/s.test(css));
  ok('--highlight is never an accent text colour', !/color:\s*var\(--highlight\)/.test(css));
  // It sits warm against every cool note family, and keeps the note's brightest
  // rung (a hair above --note): its own luminance, above the crossover so dark
  // ink is correct.
  ok('--highlight stays above the ink crossover (takes dark ink like the note)',
    lum(T.highlight) > 0.1788, String(r4(lum(T.highlight))));
}

console.log('\n[6] The two-tone focus ring clears 3:1 on every ground by construction (UIUX §2.7)');
{
  // The ring is built from the two poles, and B67 rotated neither, so every
  // row holds on every ladder by the same construction.
  const rows = [
    ['--deep', 'deep', 18.33, 1.04],
    ['--card', 'card', 16.62, 1.06],
    ['the water, lightest stop', 'waterTop', 5.52, 3.18],
    ['the water, darkest stop', 'waterBot', 11.62, 1.51],
    ['--note', 'note', 1.48, 11.84],
  ];
  for (const [name, rung, wantLight, wantDark] of rows) {
    for (const lname of LADDER_NAMES) {
      const g = LADDER[lname][rung];
      const l = r2(contrast(g, T.inkLight)), d = r2(contrast(g, T.inkDark));
      ok(`${name}: light ${wantLight} / dark ${wantDark} (${lname})`,
        l === wantLight && d === wantDark, `${l} / ${d}`);
      ok(`${name}: the better tone clears 3:1 (${lname})`, Math.max(l, d) >= 3);
    }
  }
  {
    const l = r2(contrast(T.chrome, T.inkLight)), d = r2(contrast(T.chrome, T.inkDark));
    ok('--chrome: light 18.33 / dark 1.04', l === 18.33 && d === 1.04, `${l} / ${d}`);
    ok('--chrome: the better tone clears 3:1', Math.max(l, d) >= 3);
  }
  ok('the ring is the two-tone construction, not a hue',
    /outline:\s*2px\s+solid\s+var\(--ink-light\)/.test(css) &&
    /box-shadow:[^;}]*0\s+0\s+0\s+4px\s+var\(--ink-dark\)/.test(css));
  ok('--focus-ring is retired (UIUX §16.2)', !/--focus-ring/.test(css));
}

console.log('\n[7] Dark-only: one theme, and the retired tokens stay retired (UIUX §2.1, B48, B58)');
{
  ok('no prefers-color-scheme block survives in styles.css', !/prefers-color-scheme/.test(css));
  ok('the reduced-motion kill-switch survives (UIUX §8)', /prefers-reduced-motion:\s*reduce/.test(css));
  for (const dead of ['--paper', '--ink-rgb', '--ink-shadow', '--letterbox',
                      '--surface-raised', '--line', '--furniture',
                      '--sand-light', '--sand-base', '--sand-dark', '--sand-taupe']) {
    ok(`${dead} is retired (UIUX §16.2)`, !css.includes(dead + ':') && !css.includes(`var(${dead})`));
  }
  ok('--pane the token is retired (UIUX §16.2)', !/--pane\s*:/.test(css) && !/var\(--pane\)/.test(css));
  ok('html keeps a plain black background — not a token (UIUX §2.2)',
    /html\s*(?:,[^{]*)?{[^}]*background:\s*#000\b/.test(css));
  ok('--elevation is 0 2px 8px rgb(0 0 0 / 0.45) (UIUX §2.4)',
    /--elevation:\s*0 2px 8px rgb\(0 0 0 \/ 0\.45\)/.test(css));
  ok('--elevation-inset exists for #pane (UIUX §2.4, §16.2)',
    /--elevation-inset:\s*inset /.test(css) && /#pane\s*{[^}]*var\(--elevation-inset\)/s.test(css.replace(/html\.desktop /g, '')));
  // B58: the canvas is the deep, flat under its dither; the falloff died with
  // the water it drew a bound in.
  ok('the canvas is var(--deep), not a field',
    /#board\s*{[^}]*background:\s*var\(--deep\)/s.test(css));
  ok('the two sections carry the water field',
    /#band-fill\s*{[^}]*linear-gradient\(180deg,\s*var\(--water-top\)/s.test(css) &&
    /#lot\s*{[^}]*linear-gradient\(180deg,\s*var\(--water-top\)/s.test(css));
}

console.log('\n[8] The scratch pair moves together: 0.62 over 0.12, both poles (UIUX §4.3, B53, B58)');
{
  const veil = /opacity:\s*0\.62/.test(css);
  const burial = /color:\s*rgb\(var\(--ink-a\)\s*\/\s*0\.12\)/.test(css);
  ok('the veil is 0.62', veil);
  ok('the burial is 0.12', burial);
  ok('the pair moves together, never separately', veil === burial);
  ok('no 0.97 veil and no 0.40 burial survive',
    !/opacity:\s*0\.97/.test(css) && !/color:\s*rgb\(var\(--ink-a\)\s*\/\s*0\.4\)/.test(css));
  // The note keeps its dark-ink strike; the lot's flips to light ink on the
  // water (B58) — B53's law is pole-independent, and the numbers prove it.
  //
  // This is the ONE table B67 moves. A strike is an alpha composite, so its
  // ratio is a function of the ground's channels and not of its luminance
  // alone: rotating the hue re-quantises the mix and the number shifts in the
  // second decimal. The values are stated per ladder rather than averaged,
  // and the law — every mark above the 3:1 floor, every burial a smudge — is
  // asserted separately so it cannot be satisfied by editing a constant.
  const MARKS = {
    'To-Do': { note: 4.53, top: 3.19, mid: 4.08, bot: 5.47, buriedNote: 1.28, buriedTop: 1.29 },
    'Idea':  { note: 4.51, top: 3.22, mid: 4.11, bot: 5.49, buriedNote: 1.27, buriedTop: 1.30 },
    'Note':  { note: 4.54, top: 3.20, mid: 4.12, bot: 5.50, buriedNote: 1.27, buriedTop: 1.28 },
  };
  for (const lname of LADDER_NAMES) {
    const lad = LADDER[lname], want = MARKS[lname];
    const noteMark = contrast(mix(T.inkDark, lad.note, 0.62), lad.note);
    ok(`${lname}: the strike on the note = ${want.note}, above the 3:1 mark floor`,
      r2(noteMark) === want.note && noteMark >= 3, String(r2(noteMark)));
    const lotMarks = [
      ['lightest stop', lad.waterTop, want.top], ['mid stop', lad.waterMid, want.mid],
      ['darkest stop', lad.waterBot, want.bot],
    ];
    for (const [name, g, w] of lotMarks) {
      const c = contrast(mix(T.inkLight, g, 0.62), g);
      ok(`${lname}: the lot strike on the water's ${name} = ${w}, above the 3:1 mark floor`,
        r2(c) === w && c >= 3, String(r2(c)));
    }
    const buriedNote = contrast(mix(T.inkDark, lad.note, 0.12), lad.note);
    const buriedLot = contrast(mix(T.inkLight, lad.waterTop, 0.12), lad.waterTop);
    ok(`${lname}: the buried text is a smudge on the note (${want.buriedNote})`,
      r2(buriedNote) === want.buriedNote, String(r2(buriedNote)));
    ok(`${lname}: the buried text is a smudge on the water (${want.buriedTop} at the worst extreme)`,
      r2(buriedLot) === want.buriedTop, String(r2(buriedLot)));
    // The law, independent of the constants above.
    ok(`${lname}: every mark clears the 3:1 floor and every burial stays a smudge`,
      [lad.waterTop, lad.waterMid, lad.waterBot].every(g => contrast(mix(T.inkLight, g, 0.62), g) >= 3) &&
      contrast(mix(T.inkDark, lad.note, 0.62), lad.note) >= 3 &&
      buriedNote < 1.4 && buriedLot < 1.4);
  }
  ok('the export mixes its scratch at 0.62', /0\.62/.test(app) && !/\*\s*0\.97/.test(app));
}

console.log('\n[9] The five colour sync points agree (PRD §9.5.1, B55)');
{
  const metas = [...html.matchAll(/<meta name="theme-color"([^>]*)>/g)];
  ok('index.html carries exactly one theme-color meta (B48 halves B11)', metas.length === 1,
    metas.length + ' found');
  const content = metas.length === 1 ? (metas[0][1].match(/content="([^"]+)"/) || [])[1] : null;
  ok('the theme-color meta carries no media attribute', metas.length === 1 && !/media=/.test(metas[0][1]));
  ok('the platform edge wears the deep (B55)', content === '#020812', String(content));
  ok('manifest background_color agrees with the meta',
    !!content && manifest.background_color === content,
    `meta ${content} vs manifest ${manifest.background_color}`);
  ok('manifest theme_color agrees with the meta',
    !!content && manifest.theme_color === content,
    `meta ${content} vs manifest ${manifest.theme_color}`);
  const declaredSet = new Set(Object.values(declared).map(h => h.toLowerCase()));
  ok('the OS chrome wears a declared token value',
    !!content && declaredSet.has(String(content).toLowerCase()), String(content));
  const pdfConst = k => {
    const m = app.match(new RegExp('const ' + k + '\\s*=\\s*\\[([^\\]]+)\\]'));
    return m ? m[1].split(',').map(Number) : null;
  };
  const paper = pdfConst('PDF_PAPER'), ink = pdfConst('PDF_INK'), shade = pdfConst('PDF_SHADE');
  ok('PDF_PAPER / PDF_INK / PDF_SHADE exist as the export\'s named palette (UIUX §15)',
    !!(paper && ink && shade));
  const lumF = v => 0.2126 * lin(v[0] * 255) + 0.7152 * lin(v[1] * 255) + 0.0722 * lin(v[2] * 255);
  ok('the export stays paper-light: paper is light, ink is dark',
    !!paper && !!ink && lumF(paper) > 0.5 && lumF(ink) < 0.05,
    paper && ink && `${r4(lumF(paper))} / ${r4(lumF(ink))}`);
  ok('the export palette is not the screen ladder',
    !!paper && !Object.values(T).some(h => {
      const c = rgbOf(h); return paper.every((v, i) => Math.abs(v - c[i] / 255) < 0.002);
    }));
}

console.log('\n[10] Self-hosted type, drawn icon, shipped cache (UIUX §13, B36, B50, B60)');
{
  const fonts = ['fonts/MontserratAlternates-400.woff2', 'fonts/MontserratAlternates-600.woff2',
                 'fonts/MontserratAlternates-800.woff2'];
  for (const f of fonts) {
    ok(`${f} is committed`, fs.existsSync(path.join(ROOT, f)));
    ok(`${f} is in sw.js ASSETS`, sw.includes(`'${f}'`));
    ok(`${f} is declared in @font-face`, css.includes(f));
  }
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)];
  ok('three @font-face blocks, all font-display: swap', faces.length === 3 &&
    faces.every(f => /font-display:\s*swap/.test(f[1])), faces.length + ' faces');
  ok('the family is Montserrat Alternates, 400/600/800',
    faces.length === 3 && faces.every(f => /['"]Montserrat Alternates['"]/.test(f[1])) &&
    ['400', '600', '800'].every(w => faces.some(f => new RegExp('font-weight:\\s*' + w).test(f[1]))));
  ok('the app speaks it ahead of the v1 stack',
    /font-family:\s*['"]Montserrat Alternates['"],\s*system-ui/.test(css));
  ok('the icon generator defaults to the deep — the note on the canvas (B60)',
    /--ground=deep/.test(iconScript));
  ok('CACHE is todo-boards-v22 — B36 is the definition of shipped',
    /const CACHE = 'todo-boards-v22';/.test(sw), (sw.match(/todo-boards-v\d+/) || [])[0]);
  const external = /https?:\/\//;
  ok('no CDN URL in styles.css', !external.test(css.replace(/http:\/\/www\.w3\.org/g, '')));
  ok('no CDN URL in index.html', !external.test(html));
  ok('no CDN URL in sw.js or manifest.json', !external.test(sw) && !external.test(read('manifest.json')));
}

console.log('\n[11] The delivery marker pair (UIUX §16.3)');
{
  const markers = [...swTest.matchAll(/_RE\s*=\s*\/(.+?)\/[a-z]*\s*;/g)].map(m => m[1]);
  ok('sw-update.js declares a stylesheet marker', markers.length >= 1, markers.join(' | '));
  for (const m of markers) {
    let re = null;
    try { re = new RegExp(m); } catch (e) { /* falls through to the fail */ }
    ok(`marker /${m}/ matches the shipped styles.css`, !!re && re.test(css));
  }
}

console.log(`\n=== tokens: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
