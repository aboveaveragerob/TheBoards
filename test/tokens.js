/* The design contract, falsifiable (PRD §9.6): parse the SHIPPED files and
 * reproduce every table in UIUX §2 by recomputing WCAG relative luminance from
 * the declared hexes — ranges asserted at their worst extremes (UIUX §2.2,
 * §16 item 10). Node-only, no browser, no dependencies.
 *
 * This is the test PRD §9.6 orders written FIRST: against the v1 stylesheet it
 * fails, and it goes green only as the v2 design system lands. It also pins
 * the five colour sync points (PRD §9.5.1) whose silent divergence has already
 * happened once, the accent placement rule (UIUX §2.6), self-hosting
 * (UIUX §13.1), the shipped-cache discipline (B36/B48/B50), the scratch pair
 * that moves together or not at all (B53), and the sw-update.js marker pair
 * (UIUX §16.3).
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

/* ---- The declared palette, parsed from styles.css ------------------------ */
// Every custom property whose value is a bare hex.
const declared = {};
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*[;}]/g)) declared[m[1]] = m[2];
const allHexes = new Set([...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m => m[0].toLowerCase()));

// The wisp colours live inside the base64 feColorMatrix data URIs (UIUX §2.9):
// each matrix row's constant column is channel/255. Decode and recover them.
const wispHexes = new Set();
for (const m of css.matchAll(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g)) {
  let svg = '';
  try { svg = Buffer.from(m[1], 'base64').toString('utf8'); } catch (e) { continue; }
  const cm = svg.match(/feColorMatrix[^>]*values="([^"]+)"/);
  if (!cm) continue;
  const v = cm[1].trim().split(/\s+/).map(Number);
  if (v.length < 15) continue;
  const ch = [v[4], v[9], v[14]].map(x => Math.round(x * 255));
  if (ch.every(x => x >= 0 && x <= 255)) {
    wispHexes.add('#' + ch.map(x => x.toString(16).padStart(2, '0')).join(''));
  }
}

/* The ladder (UIUX §2.2) and its satellites (UIUX §2.3, §2.5–§2.9), as the
   record declares them. tokens.js restates the VALUES on purpose: it is the
   independent witness — if styles.css and UIUX §2 ever disagree, one of the
   two fails here. */
const T = {
  band: '#020812', chrome: '#020812', card: '#08152c', frame: '#698ebf', note: '#a0d4da',
  boardTop: '#34697f', boardMid: '#255265', boardBot: '#163646',
  sandLight: '#eaddc7', sandBase: '#e3d2b5', sandDark: '#dbc7a3',
  wispPink: '#d7b7ad', wispGrey: '#bec3bb', wispTaupe: '#d4bfa0',
  inkLight: '#f4f5f1', inkDark: '#031019',
  accentRestore: '#b6dee2', accentPage: '#6d9cb0', danger: '#E2A08C',
};

console.log('\n[1] The surface ladder — tokens declared, luminances reproduce (UIUX §2.2)');
{
  const need = {
    '--band': T.band, '--chrome': T.chrome, '--card': T.card, '--frame': T.frame,
    '--note': T.note, '--ink-light': T.inkLight, '--ink-dark': T.inkDark,
    '--accent-restore': T.accentRestore, '--accent-page': T.accentPage, '--danger': T.danger,
  };
  for (const [name, hex] of Object.entries(need)) {
    ok(`${name} is ${hex}`, (declared[name] || '').toLowerCase() === hex.toLowerCase(),
      `declared ${declared[name]}`);
  }
  for (const hex of [T.boardTop, T.boardMid, T.boardBot]) {
    ok(`field stop ${hex} declared (UIUX §2.8)`, allHexes.has(hex.toLowerCase()));
  }
  for (const hex of [T.sandLight, T.sandBase, T.sandDark]) {
    ok(`sand stop ${hex} declared (UIUX §2.9)`, allHexes.has(hex.toLowerCase()));
  }
  for (const hex of [T.wispPink, T.wispGrey, T.wispTaupe]) {
    ok(`wisp ${hex} recovered from the turbulence matrix (UIUX §2.9)`,
      wispHexes.has(hex.toLowerCase()), 'found ' + [...wispHexes].join(','));
  }
  // The published luminances, at 4 decimals as UIUX §2.2 prints them.
  const L = [
    ['--band', T.band, 0.0023], ['--card', T.card, 0.0077], ['--frame', T.frame, 0.2611],
    ['--note', T.note, 0.5962], ['field top stop', T.boardTop, 0.1237],
    ['field bottom stop', T.boardBot, 0.0325],
    ['shelf darkest weather', T.wispPink, 0.5133], ['shelf lightest weather', T.sandLight, 0.7333],
  ];
  for (const [name, hex, want] of L) {
    ok(`${name} luminance ${want}`, r4(lum(hex)) === want, String(r4(lum(hex))));
  }
}

console.log('\n[2] One ink per surface — every published ratio reproduces (UIUX §2.3)');
{
  const rows = [
    ['light ink on the band', T.band, T.inkLight, 18.33],
    ['light ink on the card', T.card, T.inkLight, 16.62],
    ['light ink on the field, lightest stop', T.boardTop, T.inkLight, 5.52],
    ['light ink on the field, darkest stop', T.boardBot, T.inkLight, 11.62],
    ['dark ink on the shelf base', T.sandBase, T.inkDark, 12.96],
    ['dark ink on the darkest wisp', T.wispTaupe, T.inkDark, 10.77],
    ['dark ink on the note', T.note, T.inkDark, 11.84],
  ];
  for (const [name, g, ink, want] of rows) {
    ok(`${name} = ${want}`, r2(contrast(g, ink)) === want, String(r2(contrast(g, ink))));
  }
  // The rebinding (UIUX §2.3): channels space-separated — the fix for v1's
  // invalid comma-channels / slash-alpha rgb() (UIUX §16.2, --ink-rgb row).
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
}

console.log('\n[3] The crossover and the forbidden band (UIUX §2.3.1, §2.3.2)');
{
  const cross = Math.sqrt((lum(T.inkLight) + 0.05) * (lum(T.inkDark) + 0.05)) - 0.05;
  ok('crossover from the poles is 0.1788', r4(cross) === 0.1788, String(r4(cross)));
  // No text-bearing ground may sit in (0.163, 0.196) — there is no ink there.
  const grounds = [T.band, T.chrome, T.card, T.boardTop, T.boardMid, T.boardBot, T.note,
                   T.sandLight, T.sandBase, T.sandDark, T.wispPink, T.wispGrey, T.wispTaupe];
  for (const g of grounds) {
    const L = lum(g);
    ok(`ground ${g} (L=${r4(L)}) is outside the forbidden band`, L <= 0.163 || L >= 0.196);
  }
  // Each ground sits on the correct side of the crossover for the ink bound on it.
  for (const g of [T.band, T.chrome, T.card, T.boardTop, T.boardMid, T.boardBot]) {
    ok(`ground ${g} is below the crossover (takes light ink)`, lum(g) < cross);
  }
  for (const g of [T.note, T.sandBase, T.sandLight, T.sandDark, T.wispTaupe]) {
    ok(`ground ${g} is above the crossover (takes dark ink)`, lum(g) > cross);
  }
}

console.log('\n[4] Edges, rules and hairlines — every adjacency at the worst extreme (UIUX §2.5)');
{
  const rows = [
    ['card border on the card', T.frame, T.card, 5.39],
    ['card border on the band', T.frame, T.band, 5.95],
    ['band / sheet fill, lightest stop', T.band, T.boardTop, 3.32],
    ['card / sheet fill where it overhangs, lightest stop', T.card, T.boardTop, 3.01],
    ['lot / sheet fill, darkest wisp vs lightest stop', T.wispTaupe, T.boardTop, 3.39],
    ['note / sheet fill, lightest stop', T.note, T.boardTop, 3.72],
    ['note / note edge — dark ink on the note', T.note, T.inkDark, 11.84],
    ['card / band fill — deliberately quiet', T.card, T.band, 1.10],
  ];
  for (const [name, a, b, want] of rows) {
    ok(`${name} = ${want}`, r2(contrast(a, b)) === want, String(r2(contrast(a, b))));
  }
  ok('--hairline is that surface\'s ink at 0.40',
    /--hairline:\s*rgb\(var\(--ink-a\)\s*\/\s*0\.4\)/.test(css));
  const hair = contrast(mix(T.inkLight, T.chrome, 0.4), T.chrome);
  ok('the hairline clears 3:1 on chrome (3.52)', r2(hair) === 3.52 && hair >= 3, String(r2(hair)));
}

console.log('\n[5] Accents — values, worst-extreme ratios, and the placement rule (UIUX §2.6)');
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
  // The placement rule, asserted as a rule: an accent is TEXT only on a
  // near-black ground. Find every `color: var(--accent-*|--danger)` in the
  // stylesheet and require its selector to live on chrome (menu, toast, rail
  // seam) or on an --ink-dark drain fill — never on --board, --shelf or --note.
  const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, '');   // selectors, not commentary
  const accentText = [];
  for (const m of cssBare.matchAll(/([^{}]+){[^}]*color:\s*var\((--danger|--accent-restore|--accent-page)\)[^}]*}/g)) {
    accentText.push(m[1].trim().replace(/\s+/g, ' '));
  }
  const chromeGrounded = /^(#menu|#toast|\.pane-del|\.sel-btn\.[\w-]+\.tapped|\.primary-btn\.tapped)/;
  for (const sel of accentText) {
    ok(`accent as text only on a near-black ground: "${sel}"`,
      sel.split(',').every(s => chromeGrounded.test(s.trim())), sel);
  }
  const onContent = /(\.note(?:-text)?|\.lot-text|\.lot-item|#board\b|\.anchor|\.band-label)[^,{]*$/;
  ok('no accent is a text colour on --board, --shelf or --note elements',
    accentText.every(sel => sel.split(',').every(s => !onContent.test(s.trim()))),
    accentText.join(' | '));
}

console.log('\n[6] The two-tone focus ring clears 3:1 on every ground by construction (UIUX §2.7)');
{
  const rows = [
    ['--band', T.band, 18.33, 1.04], ['--chrome', T.chrome, 18.33, 1.04],
    ['--card', T.card, 16.62, 1.06],
    ['--board, lightest stop', T.boardTop, 5.52, 3.18],
    ['--board, darkest stop', T.boardBot, 11.62, 1.51],
    ['--shelf', T.sandBase, 1.36, 12.96], ['--note', T.note, 1.48, 11.84],
  ];
  for (const [name, g, wantLight, wantDark] of rows) {
    const l = r2(contrast(g, T.inkLight)), d = r2(contrast(g, T.inkDark));
    ok(`${name}: light ${wantLight} / dark ${wantDark}`, l === wantLight && d === wantDark,
      `${l} / ${d}`);
    ok(`${name}: the better tone clears 3:1`, Math.max(l, d) >= 3);
  }
  ok('the ring is the two-tone construction, not a hue',
    /outline:\s*2px\s+solid\s+var\(--ink-light\)/.test(css) &&
    /box-shadow:[^;}]*0\s+0\s+0\s+4px\s+var\(--ink-dark\)/.test(css));
  ok('--focus-ring is retired (UIUX §16.2)', !/--focus-ring/.test(css));
}

console.log('\n[7] Dark-only: the light theme is removed, not overridden (UIUX §2.1, B48)');
{
  ok('no prefers-color-scheme block survives in styles.css', !/prefers-color-scheme/.test(css));
  ok('the reduced-motion kill-switch survives (UIUX §8)', /prefers-reduced-motion:\s*reduce/.test(css));
  for (const dead of ['--paper', '--ink-rgb', '--ink-shadow', '--letterbox',
                      '--surface-raised', '--line', '--furniture']) {
    ok(`${dead} is retired (UIUX §16.2)`, !css.includes(dead + ':') && !css.includes(`var(${dead})`));
  }
  ok('--pane the token is retired (UIUX §16.2)', !/--pane\s*:/.test(css) && !/var\(--pane\)/.test(css));
  ok('html keeps a plain black background — not a token (UIUX §2.2)',
    /html\s*(?:,[^{]*)?{[^}]*background:\s*#000\b/.test(css));
  ok('--elevation is 0 2px 8px rgb(0 0 0 / 0.45) (UIUX §2.4)',
    /--elevation:\s*0 2px 8px rgb\(0 0 0 \/ 0\.45\)/.test(css));
  ok('--elevation-inset exists for #pane (UIUX §2.4, §16.2)',
    /--elevation-inset:\s*inset /.test(css) && /#pane\s*{[^}]*var\(--elevation-inset\)/s.test(css.replace(/html\.desktop /g, '')));
}

console.log('\n[8] The scratch pair moves together: 0.62 over 0.12 (UIUX §4.3, B53)');
{
  const veil = /\.complete \.note-scratch[^{]*{[^}]*opacity:\s*0\.62/.test(css) ||
               /opacity:\s*0\.62/.test(css);
  const burial = /color:\s*rgb\(var\(--ink-a\)\s*\/\s*0\.12\)/.test(css);
  ok('the veil is 0.62', veil);
  ok('the burial is 0.12', burial);
  ok('the pair moves together, never separately', veil === burial);
  ok('no 0.97 veil and no 0.40 burial survive',
    !/opacity:\s*0\.97/.test(css) && !/color:\s*rgb\(var\(--ink-a\)\s*\/\s*0\.4\)/.test(css));
  // Composited, the strike is a mark everywhere and the burial is a smudge.
  const marks = [
    ['the note', T.note, T.inkDark, 4.53],
    ['the shelf base', T.sandBase, T.inkDark, 4.71],
    ['the darkest wisp', T.wispTaupe, T.inkDark, 4.35],
  ];
  for (const [name, g, ink, want] of marks) {
    const c = contrast(mix(ink, g, 0.62), g);
    ok(`the strike on ${name} = ${want}, above the 3:1 mark floor`,
      r2(c) === want && c >= 3, String(r2(c)));
  }
  const buried = contrast(mix(T.inkDark, T.note, 0.12), T.note);
  ok('the buried text is a smudge: 1.28 on the note', r2(buried) === 1.28, String(r2(buried)));
  // The PDF mirrors the pair (B53; B34's no-text-object promise is the suite's).
  ok('the export mixes its scratch at 0.62', /0\.62/.test(app) && !/\*\s*0\.97/.test(app));
}

console.log('\n[9] The five colour sync points agree (PRD §9.5.1, UIUX §16.1)');
{
  const metas = [...html.matchAll(/<meta name="theme-color"([^>]*)>/g)];
  ok('index.html carries exactly one theme-color meta (B48 halves B11)', metas.length === 1,
    metas.length + ' found');
  const content = metas.length === 1 ? (metas[0][1].match(/content="([^"]+)"/) || [])[1] : null;
  ok('the theme-color meta carries no media attribute', metas.length === 1 && !/media=/.test(metas[0][1]));
  ok('manifest background_color agrees with the meta',
    !!content && manifest.background_color === content,
    `meta ${content} vs manifest ${manifest.background_color}`);
  ok('manifest theme_color agrees with the meta',
    !!content && manifest.theme_color === content,
    `meta ${content} vs manifest ${manifest.theme_color}`);
  const declaredSet = new Set(Object.values(declared).map(h => h.toLowerCase()));
  ok('the OS chrome wears a declared token value',
    !!content && declaredSet.has(String(content).toLowerCase()), String(content));
  // The export's palette is its OWN — paper-light, deliberately not derived
  // from :root (UIUX §15, B48).
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

console.log('\n[10] Self-hosted type, shipped cache (UIUX §13.1, B36, B50)');
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
  ok('CACHE is todo-boards-v10 — B36 is the definition of shipped',
    /const CACHE = 'todo-boards-v10';/.test(sw), (sw.match(/todo-boards-v\d+/) || [])[0]);
  const external = /https?:\/\//;
  ok('no CDN URL in styles.css', !external.test(css.replace(/http:\/\/www\.w3\.org/g, '')));
  ok('no CDN URL in index.html', !external.test(html));
  ok('no CDN URL in sw.js or manifest.json', !external.test(sw) && !external.test(read('manifest.json')));
}

console.log('\n[11] The delivery marker pair (UIUX §16.3)');
{
  // Either styles.css still declares `--card-h: 68px` literally, or
  // sw-update.js's marker regex moved in the same commit. The invariant that
  // matters: every marker regex sw-update.js greps the stylesheet with MUST
  // match the shipped stylesheet, or the delivery proof dry-runs against
  // nothing and B36's tripwire goes dark.
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
