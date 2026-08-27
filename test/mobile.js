const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.BOARDS_URL || 'http://localhost:8000/index.html';
// Point at a specific Chromium with CHROMIUM_PATH; otherwise Playwright's own.
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? (pass++, console.log('  PASS ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? ' :: ' + extra : ''))); };

async function newMobilePage(browser, viewport = { width: 384, height: 846 }) {
  const ctx = await browser.newContext({
    viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => !!document.querySelector('#board'));
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// A real touch tap through CDP Input domain (Playwright's touchscreen.tap issues
// touch events that the browser translates to pointer events).
async function tap(page, x, y, holdMs = 30) {
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(holdMs);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
}
async function tapWithMove(page, x, y, dx, dy) {
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(20);
  await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
  await page.waitForTimeout(20);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
}

// Press and drag, stopping WITH THE FINGER STILL DOWN so the caller can assert
// mid-drag state (the landing frame, the ghost). Returns the live CDP session:
// the caller sends touchEnd and detaches. Stepped so the move crosses
// MOVE_THRESHOLD, and quick enough to stay inside LONGPRESS_MS.
async function touchDragTo(page, from, to, steps = 8) {
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  await page.waitForTimeout(20);
  for (let i = 1; i <= steps; i++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: from.x + (to.x - from.x) * i / steps,
      y: from.y + (to.y - from.y) * i / steps,
    }] });
    await page.waitForTimeout(15);
  }
  // Settle before the caller reads the DOM. Input.dispatchTouchEvent resolves
  // when the event is DISPATCHED, not when the recognizer's handler has run and
  // painted its consequence — so a drop-target assertion straight off the last
  // move is a race the CI runner loses under load. The desktop twin already
  // waits 60ms at exactly this point; this is the same wait, in the helper, so
  // every caller gets it.
  await page.waitForTimeout(60);
  return c;
}

const noteCount = page => page.evaluate(() => document.querySelectorAll('.note').length);
const activeIsNoteText = page => page.evaluate(() =>
  !!document.activeElement && document.activeElement.classList.contains('note-text'));

(async () => {
  const browser = await chromium.launch({ ...launchOpts });

  // ---- 1. mobile mode is actually active -----------------------------------
  console.log('\n[1] Mobile mode detection');
  {
    const { ctx, page } = await newMobilePage(browser);
    const desktop = await page.evaluate(() => document.documentElement.classList.contains('desktop'));
    ok('isDesktop is false (mobile branch under test)', desktop === false, 'desktop=' + desktop);
    await ctx.close();
  }

  // ---- 2. tap creates a note INSTANTLY and focuses it -----------------------
  console.log('\n[2] Tap empty canvas -> instant note + focus (B27)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 200, 500);
    await page.waitForTimeout(50);           // well under the old 400ms window
    const n = await noteCount(page);
    ok('note exists within 50ms', n === 1, 'count=' + n);
    ok('.note-text has focus', await activeIsNoteText(page));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    // typing lands and survives a reload
    await page.keyboard.type('hello board');
    await tap(page, 200, 250);               // blur onto other paper
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(600);
    const txt = await page.evaluate(() => [...document.querySelectorAll('.note-text')].map(n => n.textContent));
    ok('text persisted across reload', txt.includes('hello board'), JSON.stringify(txt));
    await ctx.close();
  }

  // ---- 3. long press on empty canvas: no crash, note created ---------------
  console.log('\n[3] Long-press empty canvas (700ms) -> note, no crash');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 200, 500, 700);
    await page.waitForTimeout(100);
    const n = await noteCount(page);
    ok('exactly one note created', n === 1, 'count=' + n);
    ok('no page errors (was TypeError on rec.state)', errors.length === 0, errors.join(' | '));
    ok('no menu opened', await page.evaluate(() => document.querySelector('#menu').hidden !== false));
    await ctx.close();
  }

  // ---- 4. slop threshold ---------------------------------------------------
  console.log('\n[4] Touch slop (MOVE_THRESHOLD 16)');
  {
    const { ctx, page } = await newMobilePage(browser);
    await tapWithMove(page, 200, 500, 12, 0);
    await page.waitForTimeout(80);
    ok('12px roll still creates a note', (await noteCount(page)) === 1, 'count=' + await noteCount(page));
    await ctx.close();
  }
  {
    const { ctx, page } = await newMobilePage(browser);
    await tapWithMove(page, 200, 500, 40, 0);
    await page.waitForTimeout(80);
    ok('40px drag creates nothing', (await noteCount(page)) === 0, 'count=' + await noteCount(page));
    await ctx.close();
  }

  // ---- 5. rapid double tap -> second tap only dismisses (issue #41) --------
  console.log('\n[5] Impatient double-tap');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 150, 450);
    await tap(page, 250, 550);
    await page.waitForTimeout(150);
    const n = await noteCount(page);
    ok('the empty first note is discarded, no second one created', n === 0, 'count=' + n);
    ok('nothing holds focus (keyboard dismissed)', !(await activeIsNoteText(page)));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 6. landmine purge ---------------------------------------------------
  console.log('\n[6] Whitespace-only husk is swept and leaves no dead zone');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    // Seed a whitespace-only note directly into IDB, then reload.
    await page.evaluate(() => new Promise((res, rej) => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const db = rq.result;
        const store = db.transaction('boards', 'readwrite').objectStore('boards');
        const all = store.getAll();
        all.onsuccess = () => {
          const b = all.result[0];
          b.notes.push({ id: 'husk-1', text: '   ', x: 300, y: 500, rw: 900, rh: 1000, scale: 1, state: 'active' });
          const put = store.put(b);
          put.onsuccess = () => res(b.id);
          put.onerror = () => rej(put.error);
        };
        all.onerror = () => rej(all.error);
      };
      rq.onerror = () => rej(rq.error);
    }));
    await page.reload();
    await page.waitForTimeout(700);
    const inDom = await page.evaluate(() => !!document.querySelector('[data-id="husk-1"]'));
    ok('husk absent from DOM after boot', inDom === false);
    const inData = await page.evaluate(() => new Promise(res => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
        all.onsuccess = () => res(all.result.some(b => b.notes.some(n => n.id === 'husk-1')));
      };
    }));
    ok('husk purged from storage', inData === false);
    // its former patch of paper is live again
    const before = await noteCount(page);
    // rw/rh 900x1000 -> css 300*384/900 = 128 , 500*846/1000 = 423 (B32 renderY)
    await tap(page, 128, 423);
    await page.waitForTimeout(80);
    ok('tap on its former location creates a note', (await noteCount(page)) === before + 1);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 7. keyboard-shrink: layout held still while editing ----------------
  console.log('\n[7] Viewport shrink during edit (keyboard proxy)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    // Low on the sheet, where clipping bit — but above the lot, which occupies
    // y 724-846 at this viewport (full-bleed two-row floor, B47).
    await tap(page, 200, 560);
    await page.waitForTimeout(80);
    ok('note created low on the sheet', (await noteCount(page)) === 1);
    const before = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#board')).getPropertyValue('--logical-h'));
    await page.setViewportSize({ width: 384, height: 450 });   // "keyboard up"
    await page.waitForTimeout(200);
    const during = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#board')).getPropertyValue('--logical-h'));
    ok('--logical-h unchanged while editing', before === during, before + ' -> ' + during);
    ok('note still present', (await noteCount(page)) === 1);
    ok('editor still focused (no flap)', await activeIsNoteText(page));
    // blur -> deferred layout lands
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const after = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#board')).getPropertyValue('--logical-h'));
    ok('deferred layout applies after blur', after !== during, during + ' -> ' + after);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 8. long-press a note still opens its menu ---------------------------
  console.log('\n[8] Long-press a note still opens the menu');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 200, 400);
    await page.waitForTimeout(60);
    await page.keyboard.type('real note');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, box.x, box.y, 700);
    await page.waitForTimeout(150);
    const menuVisible = await page.evaluate(() => document.querySelector('#menu').hidden === false);
    ok('menu opened on note long-press', menuVisible);
    // B43 (issues #59/#60) + B71 (issue #105): All boards · Complete · Highlight
    // · Copy · Delete, top to bottom — danger last, behind the one separator.
    const shape = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')];
      return { labels: b.map(x => x.textContent),
               danger: b.map(x => x.classList.contains('danger')),
               seps: document.querySelectorAll('#menu .sep').length };
    });
    const labels = shape.labels;
    ok('menu is All boards · Complete · Highlight · Copy · Delete', labels.length === 5 &&
       /All boards/.test(labels[0]) && /Complete/.test(labels[1]) && /Highlight/.test(labels[2]) &&
       /Copy/.test(labels[3]) && /Delete/.test(labels[4]), JSON.stringify(labels));
    ok('only Delete is danger, and it is last',
       shape.danger.join('|') === 'false|false|false|false|true', JSON.stringify(shape.danger));
    ok('one separator before Delete', shape.seps === 1, String(shape.seps));
    // Export is board-level. The item-order law is per-menu, and a note's menu
    // is not the place to export the board it happens to sit on.
    ok('the note menu did not gain Export', !labels.some(l => /Export/.test(l)), JSON.stringify(labels));
    // dismissing the menu on canvas must NOT also create a note (B30)
    const n0 = await noteCount(page);
    // Bare canvas: above the note, clear of the menu it opened (which hangs
    // below the press point), of the lot band (y 708-830) and of the top band,
    // whose anchors end at y=126 (B38).
    await tap(page, 60, 200);
    await page.waitForTimeout(150);
    ok('menu dismissal creates no note (B30)', (await noteCount(page)) === n0, 'before=' + n0 + ' after=' + await noteCount(page));
    ok('menu is closed', await page.evaluate(() => document.querySelector('#menu').hidden !== false));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 9. anchors + parking lot still capture ------------------------------
  console.log('\n[9] Anchor and Parking Lot capture');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const t = await page.evaluate(() => {
      const r = document.querySelector('#anchor-title').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, t.x, t.y);
    await page.waitForTimeout(60);
    ok('anchor focused instantly', await page.evaluate(() =>
      document.activeElement && document.activeElement.classList.contains('anchor')));
    await page.keyboard.type('Board title');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(150);
    const lot = await page.evaluate(() => {
      const r = document.querySelector('#lot').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height - 12 };
    });
    await tap(page, lot.x, lot.y);
    await page.waitForTimeout(60);
    ok('lot line focused instantly', await page.evaluate(() =>
      document.activeElement && document.activeElement.classList.contains('lot-text')));
    await page.keyboard.type('a lot line');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(600);
    const state = await page.evaluate(() => ({
      title: document.querySelector('#anchor-title').textContent,
      lot: [...document.querySelectorAll('.lot-text')].map(n => n.textContent),
    }));
    ok('anchor text persisted', state.title === 'Board title', JSON.stringify(state));
    ok('lot line persisted', state.lot.includes('a lot line'), JSON.stringify(state));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 9b. section headers are permanent (B33, issue #38) ------------------
  console.log('\n[9b] Components/Requirements headers survive content');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    for (const [sel, text] of [['#anchor-components', 'widget'], ['#anchor-requirements', 'must ship']]) {
      const p = await page.evaluate(s => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, sel);
      await tap(page, p.x, p.y);
      await page.waitForTimeout(60);
      await page.keyboard.type(text);
      await page.evaluate(() => document.activeElement.blur());
      await page.waitForTimeout(150);
    }
    const labels = await page.evaluate(() => [...document.querySelectorAll('.band-label')].map(n => {
      const r = n.getBoundingClientRect();
      return { text: n.textContent, w: r.width, h: r.height };
    }));
    ok('both headers still rendered', labels.length === 2, JSON.stringify(labels));
    ok('headers still read Components / Requirements',
      labels.map(l => l.text).join('|') === 'Components|Requirements', JSON.stringify(labels));
    ok('headers still have a box', labels.every(l => l.w > 0 && l.h > 0), JSON.stringify(labels));
    ok('anchors captured the text', await page.evaluate(() =>
      document.querySelector('#anchor-components').textContent === 'widget' &&
      document.querySelector('#anchor-requirements').textContent === 'must ship'));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 9c. Headers no longer chase a grown title (B38, issue #51) ----------
  // The card is sized for two lines, and a phone card is ~145 units wide, so a
  // real title regularly takes three — "LinkedIn Learnings To Do" does, which
  // is the board in issue #49. B37 had the labels follow the card down so
  // "Requirements" (width: max-content, spilling inward by design since B35)
  // would not run under the card's frame — but that meant the band read
  // content → rule → header, which is both of #51's complaints. B38 pins the
  // labels under the rule instead, so a grown title must leave them exactly
  // where they were.
  console.log('\n[9c] A three-line title grows the card, not the headers');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const p = await page.evaluate(() => {
      const r = document.querySelector('#anchor-title').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, p.x, p.y);
    await page.waitForTimeout(60);
    // Issue #49's board plus a clause: the card's floor (rule-y + 22 = 83 on a
    // blank band, B74) covers a few lines, so growth needs a longer title.
    await page.keyboard.type('LinkedIn Learnings To Do Before The Quarterly Review Lands');
    await page.waitForTimeout(120);
    const g = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const q = s => { const r = document.querySelector(s).getBoundingClientRect();
                       return { top: r.top - b.top, bottom: r.bottom - b.top, height: r.height,
                                left: r.left - b.left, right: r.right - b.left }; };
      const anchorBottom = Math.max(...[...document.querySelectorAll('.band-zone .anchor')]
        .map(n => n.getBoundingClientRect().bottom - b.top));
      return { sheetH: b.height, card: q('#anchor-title'), lot: q('#lot'), anchorBottom,
               rule: q('#band-rule'),
               compLabel: q('#zone-components .band-label'),
               reqLabel: q('#zone-requirements .band-label') };
    });
    // The card's floor is rule-y + 22 = 83 on a blank band (B74), so a short
    // title no longer exercises growth; the law under test is B38's, unchanged
    // — a grown title grows the card, never the headers.
    ok('the title grew the card past its minimum', g.card.height > g.rule.top + 22 + 1,
      JSON.stringify([g.card.height, g.rule.top]));
    ok('the headers hang on the rule, not chasing the grown card (B74)',
      Math.abs(g.compLabel.top - g.rule.top) < 1 &&
      Math.abs(g.reqLabel.top - g.rule.top) < 1,
      JSON.stringify([g.compLabel.top, g.reqLabel.top, g.rule.top]));
    ok('the headers still clear the compartment horizontally',
      g.compLabel.right <= g.card.left + 0.5 && g.reqLabel.left >= g.card.right - 0.5,
      JSON.stringify([g.compLabel.right, g.card.left, g.card.right, g.reqLabel.left]));
    // The grown card must not eat the board it sits on. The labels no longer
    // trail the lowest furniture (B38), so the floor is measured off the card
    // and the side anchors — whichever reaches further down.
    const free = (g.lot.top - Math.max(g.card.bottom, g.anchorBottom)) / g.sheetH;
    ok('free canvas is still >=64% of the sheet', free >= 0.64, (free * 100).toFixed(1) + '%');
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 10. sustained capture session: no lost taps -------------------------
  console.log('\n[10] Sustained capture (10 notes, mixed hold times)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    // Rows 120 apart so no tap lands on the ~42px note above it (at 1:1 a note
    // is its real size, not 43% of it), clear of the top furniture and of the
    // lot band (y 708-830, B37). The top band ends at the anchors' y=126 (B38),
    // so every row here is on bare canvas.
    const pts = [[80,180],[300,180],[80,300],[300,300],[80,420],[300,420],[80,540],[300,540],[190,360],[190,480]];
    for (let i = 0; i < pts.length; i++) {
      await tap(page, pts[i][0], pts[i][1], i % 3 === 0 ? 600 : 40);   // some are long-presses
      await page.waitForTimeout(40);
      await page.keyboard.type('n' + i);
      await page.waitForTimeout(30);
      // Tap away to dismiss before the next capture (issue #41): a tap onto a
      // new spot while this one is still focused now only deselects it.
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.waitForTimeout(20);
    }
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(400);
    const texts = await page.evaluate(() => [...document.querySelectorAll('.note-text')].map(n => n.textContent).sort());
    ok('all 10 taps captured a note', texts.length === 10, 'got ' + texts.length + ': ' + JSON.stringify(texts));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 11. 1:1 sheet geometry: the furniture is legible (B32, issue #37) ----
  console.log('\n[11] 1:1 sheet + furniture geometry (B32)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const geo = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('#board'));
      const r = s => document.querySelector(s).getBoundingClientRect();
      const titleStyle = getComputedStyle(document.querySelector('#anchor-title'));
      return {
        rs: cs.getPropertyValue('--rs').trim(),
        lw: cs.getPropertyValue('--logical-w').trim(),
        lh: cs.getPropertyValue('--logical-h').trim(),
        titleFont: titleStyle.fontSize,
        compFont: getComputedStyle(document.querySelector('#anchor-components')).fontSize,
        title: r('#anchor-title'), comp: r('#anchor-components'),
        req: r('#anchor-requirements'), lot: r('#lot'), board: r('#board'),
        rule: r('#band-rule'),
        titleBorderTop: titleStyle.borderTopWidth, titleBorderLeft: titleStyle.borderLeftWidth,
        anchorBottom: Math.max(...[...document.querySelectorAll('.band-zone .anchor')]
          .map(n => n.getBoundingClientRect().bottom)),
      };
    });
    ok('renderScale is 1', geo.rs === '1', 'rs=' + geo.rs);
    ok('sheet width is the viewport', geo.lw === '384px', geo.lw);
    ok('sheet height is the viewport', geo.lh === '846px', geo.lh);
    // Declared sizes reach the screen, not ~43% of them. The title sets at the
    // header size now that the card carries the hierarchy (B33).
    ok('title renders at 15px', geo.titleFont === '15px', geo.titleFont);
    ok('Components renders at 15px', geo.compFont === '15px', geo.compFont);
    ok('title card is 37.7778% of the sheet', Math.abs(geo.title.width - 145.1) < 1, String(geo.title.width));
    ok('three-across header preserved',
      geo.comp.right <= geo.title.left && geo.title.right <= geo.req.left,
      JSON.stringify([geo.comp.right, geo.title.left, geo.title.right, geo.req.left]));
    // B47 reads the band content → rule; B74 hangs the header just BELOW the
    // rule as a tab in the rule's own ink (--frame) — its top edge lands on the
    // rule and the tab hangs down, at 13px/600 (B54).
    const labels = await page.evaluate(() => {
      const sheet = document.querySelector('#board').getBoundingClientRect();
      const card = document.querySelector('#anchor-title').getBoundingClientRect();
      const gut = document.querySelector('#band-rule').getBoundingClientRect();
      return [...document.querySelectorAll('.band-label')].map(n => {
        const r = n.getBoundingClientRect();
        return { text: n.textContent, top: r.top, bottom: r.bottom,
                 left: r.left, right: r.right,
                 zone: n.closest('.band-zone').id,
                 cardLeft: card.left, cardRight: card.right,
                 ruleTop: gut.top, gutL: gut.left, gutR: gut.right,
                 sheetR: sheet.right, clipped: n.scrollWidth > Math.ceil(r.width),
                 fontSize: getComputedStyle(n).fontSize,
                 bg: getComputedStyle(n).backgroundColor };
      });
    });
    ok('the tab hangs below the rule, top edge on it (B74)',
      labels.every(l => Math.abs(l.top - l.ruleTop) < 1),
      JSON.stringify(labels.map(l => [l.text, l.top, l.ruleTop])));
    ok('the tab is filled in the rule\'s own colour, --frame (B74)',
      labels.every(l => l.bg === 'rgb(105, 142, 191)'),
      JSON.stringify(labels.map(l => [l.text, l.bg])));
    ok('labels clear the compartment horizontally',
      labels.every(l => l.zone === 'zone-components'
        ? l.right <= l.cardLeft + 0.5 : l.left >= l.cardRight - 0.5),
      JSON.stringify(labels.map(l => [l.text, l.zone, l.left, l.right, l.cardLeft, l.cardRight])));
    ok('labels render at 13px (B54)', labels.every(l => l.fontSize === '13px'),
      JSON.stringify(labels.map(l => [l.text, l.fontSize])));
    ok('band labels are not clipped', labels.every(l => !l.clipped),
      JSON.stringify(labels.map(l => [l.text, l.clipped])));
    ok('band labels stay inside the gutters',
      labels.every(l => l.left >= l.gutL - 0.5 && l.right <= l.gutR + 0.5),
      JSON.stringify(labels.map(l => [l.text, l.left, l.right, l.gutL, l.gutR])));
    // B38 / issue #52: the band is drawn furniture. The compartment is framed
    // on three sides on a blank board — the sheet's own top edge is its
    // fourth — and it overhangs the rule so it occludes it.
    ok('title card is framed on three sides when empty',
      geo.titleBorderTop === '0px' && geo.titleBorderLeft === '2px',
      JSON.stringify([geo.titleBorderTop, geo.titleBorderLeft]));
    ok('the compartment reaches the sheets top edge',
      Math.abs(geo.title.top - geo.board.top) < 0.5,
      JSON.stringify([geo.title.top, geo.board.top]));
    ok('band rule is drawn on a blank board', geo.rule.width > 0 && geo.rule.height >= 1,
      JSON.stringify([geo.rule.width, geo.rule.height]));
    ok('card crosses the band rule', geo.title.bottom > geo.rule.top + 1,
      JSON.stringify([geo.title.bottom, geo.rule.top]));
    // The lot's height is its two-row FLOOR now, not a phone budget: empty,
    // one row and two rows all draw the same 122px shelf (B47, UIUX §3.2).
    ok('empty lot draws the two-row floor, 122px (B47)',
      Math.round(geo.lot.height) === 122, String(geo.lot.height));
    ok('lot is full-bleed to the sheet bottom (UIUX §3.2)',
      Math.round(geo.lot.bottom) === 846, String(geo.lot.bottom));
    // B47 without B54's label term (B74 moved the label below the rule): the
    // band sizes to its tallest zone from a two-line floor — 14 + 2 x 19.5 + 8
    // = 61 on a blank board.
    ok('band rule is at the two-line floor, 61 (B47/B74)',
      Math.abs(geo.rule.top - 61) < 1, String(geo.rule.top));
    // B38's compartment under B47's band: bounded by the sheet's own top
    // edge, overhanging the rule by 22 — 83 on a blank board.
    ok('the compartment bottom is at rule + 22 (B47)',
      Math.abs(geo.title.bottom - (geo.rule.top + 22)) < 1,
      JSON.stringify([geo.title.bottom, geo.rule.top]));
    // The headline number, and the thing issue #49 was actually about. Between
    // the band furniture and the lot — the lower of the compartment and the
    // side anchors, since B38 no longer trails the labels below both.
    {
      const free = (geo.lot.top - Math.max(geo.title.bottom, geo.anchorBottom)) / 846;
      ok('free canvas is >=68% of the sheet', free >= 0.68, (free * 100).toFixed(1) + '%');
    }
    // Issue #53 (B39): no 45% cap — a long line wraps only at the sheet's
    // right edge, spanning most of the viewport where 173px used to stop it.
    await tap(page, 24, 250);
    await page.waitForTimeout(60);
    await page.keyboard.type('The quick brown fox jumps over the lazy dog while the '
      + 'cat watches from the window and the dog barks at the mailman going past');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    const wrap = await page.evaluate(() => {
      const n = document.querySelector('.note');
      return { right: n.getBoundingClientRect().right, w: n.offsetWidth };
    });
    ok('long note wraps at the sheet right edge (issue #53)',
       wrap.right <= 384 + 1, JSON.stringify(wrap));
    ok('and spans past the old 45% cap', wrap.w > 173, String(wrap.w));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 11b. The short-window case (B36, retuned by B37) ---------------------
  // The regression this exists for: on a short, wide window the furniture ate
  // the board. B36 made the band a fraction of --logical-h, which fixed the
  // short *window* and broke the tall *phone* (issue #49) — 0.2 of 737 is a
  // 147px rule. B37 makes it fixed units instead, so the floors here go up and
  // the rule must land at the same 48 at every sheet height.
  console.log('\n[11b] Free canvas survives a short sheet (B37)');
  {
    for (const [w, h, floor] of [[1000, 715, 0.65], [800, 600, 0.60]]) {
      const { ctx, page, errors } = await newMobilePage(browser, { width: w, height: h });
      const g = await page.evaluate(() => {
        const b = document.querySelector('#board').getBoundingClientRect();
        const q = s => { const r = document.querySelector(s).getBoundingClientRect();
                         return { top: r.top - b.top, bottom: r.bottom - b.top }; };
        return { desktop: document.documentElement.classList.contains('desktop'),
                 sheetH: b.height, card: q('#anchor-title'), lot: q('#lot'),
                 label: q('#zone-components .band-label'), rule: q('#band-rule') };
      });
      const free = g.lot.top - g.card.bottom;
      const tag = `${w}x${h}`;
      ok(`${tag} is mobile mode`, !g.desktop, String(g.desktop));
      ok(`${tag} free canvas is >=${floor * 100}% of the sheet`,
        free / g.sheetH >= floor, `${free.toFixed(1)}px of ${g.sheetH} = ${(100 * free / g.sheetH).toFixed(1)}%`);
      // The band is type-sized (B37's law through B47's formula), so it does
      // not move when the sheet does: the two-line floor is 61 everywhere (B74).
      ok(`${tag} band rule is still at the 61 floor (B47/B74)`,
        Math.abs(g.rule.top - 61) < 1, String(g.rule.top));
      // The clearances the band could break.
      ok(`${tag} card still crosses the rule`, g.card.bottom > g.rule.top + 1,
        JSON.stringify([g.card.bottom, g.rule.top]));
      ok(`${tag} tab hangs below the rule and clears the lot (B74)`,
        Math.abs(g.label.top - g.rule.top) < 1 && g.label.bottom <= g.lot.top,
        JSON.stringify([g.rule.top, g.label.top, g.label.bottom, g.lot.top]));
      ok(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  // ---- 11c. EXPORT_GEO still draws what the board draws (B47/B54) -----------
  // The exporter cannot read computed CSS, so it restates the band a second
  // time and the two can drift. Since B47 the band is content-derived on both
  // sides from ONE formula — bandTop + max(2, lines) x headLH + bandGap (B74
  // dropped B54's labelLH + bandClear label term, the label now hanging below
  // the rule) — so the tripwire recomputes the formula from EXPORT_GEO's own
  // terms and requires the rendered blank board (both zones at the two-line
  // floor) to land on the same pixel.
  console.log('\n[11c] EXPORT_GEO matches what the board draws');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const m = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const q = s => { const r = document.querySelector(s).getBoundingClientRect();
                       return { top: r.top - b.top, bottom: r.bottom - b.top }; };
      return { rule: q('#band-rule'), card: q('#anchor-title'),
               label: q('#zone-components .band-label'),
               anchor: q('#zone-components .anchor'),
               labelFontSize: getComputedStyle(
                 document.querySelector('#zone-components .band-label')).fontSize };
    });
    const src = fs.readFileSync(__dirname + '/../app.js', 'utf8');
    const num = k => Number((src.match(new RegExp(k + ':\\s*(\\d+(?:\\.\\d+)?)')) || [])[1]);
    const [bandTop, bandGap, cardTop, cardOverhang, headLH, labelSize, labelLH, radius] =
      ['bandTop', 'bandGap', 'cardTop', 'cardOverhang',
       'headLH', 'labelSize', 'labelLH', 'radius'].map(num);
    const floorRuleY = Math.round(bandTop + 2 * headLH + bandGap);
    ok('EXPORT_GEO formula lands the rule where the board draws it (B47/B74)',
      floorRuleY === Math.round(m.rule.top), JSON.stringify([floorRuleY, m.rule.top]));
    ok('EXPORT_GEO cardTop is where the board draws the card',
      cardTop === Math.round(m.card.top), JSON.stringify([cardTop, m.card.top]));
    ok('EXPORT_GEO card bottom is the boards card bottom (rule + overhang)',
      floorRuleY + cardOverhang === Math.round(m.card.bottom),
      JSON.stringify([floorRuleY + cardOverhang, m.card.bottom]));
    // B74: the label hangs below the rule as a tab, its TOP edge on the rule.
    // The stylesheet says the same (.band-label's top: 100% inside the zone).
    ok('EXPORT_GEO lands the tab top on the rule where the board draws it (B74)',
      floorRuleY === Math.round(m.label.top),
      JSON.stringify([floorRuleY, m.label.top]));
    // Zone content hangs from the band's top at bandTop (B47); the stylesheet
    // says the same (.band-zone .anchor's top: var(--band-top)).
    ok('EXPORT_GEO bandTop agrees with the rendered anchor top',
      bandTop === Math.round(m.anchor.top), JSON.stringify([bandTop, m.anchor.top]));
    ok('EXPORT_GEO labelSize agrees with the rendered labels font-size (B54)',
      labelSize + 'px' === m.labelFontSize, JSON.stringify([labelSize, m.labelFontSize]));
    ok('EXPORT_GEO radius mirrors the notes 3px (B49)', radius === 3, String(radius));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 11d. The cover screen keeps its three lot rows (B57) -----------------
  // The ceiling re-derived under full bleed: B37's proportional bound with the
  // 16px margin gone returns 821, so 384x846 draws a three-item lot at
  // 34 + 3 x 44 = 166, to the sheet's bottom edge — exactly as proof sheets 7
  // and 9 render it. The short-window cases stay two rows ([11b]).
  console.log('\n[11d] Three lot items draw three rows on the cover screen (B57)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Lot ceiling fixture';
      rec.parkingLot = [
        { id: 'l1', text: 'Measure the alcove', state: 'active' },
        { id: 'l2', text: 'Grout colour undecided', state: 'complete' },
        { id: 'l3', text: 'Tile samples from Dover St', state: 'active' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const g = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const lot = document.querySelector('#lot').getBoundingClientRect();
      return { h: lot.height, bottom: lot.bottom - b.top,
               rows: document.querySelectorAll('.lot-item').length,
               thirdVisible: (() => {
                 const r = [...document.querySelectorAll('.lot-item')][2].getBoundingClientRect();
                 return r.bottom <= lot.bottom + 0.5;
               })() };
    });
    ok('three items grow the lot to 166 (B57)', Math.round(g.h) === 166, String(g.h));
    ok('the lot still ends at the sheet bottom', Math.round(g.bottom) === 846, String(g.bottom));
    ok('the third row is drawn, not clipped', g.rows === 3 && g.thirdVisible, JSON.stringify(g));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 11e. The lot grows to its MEASURED content, unclipped (issue #106, B73)
  // The old height was item COUNT x 44, so a row that wrapped to several lines
  // was allotted 44 and #lot-items clipped the rest. lotH() now sums the rows'
  // rendered heights from the two-row floor, so a wrapping item grows the lot
  // upward and is drawn whole — a CEILING of half the sheet still holds a
  // runaway lot off the canvas.
  console.log('\n[11e] The lot grows with wrapped content and caps at half the sheet (B73)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Lot growth fixture';
      rec.parkingLot = [
        { id: 'w1', text: 'This is a deliberately long parking lot entry that will '
          + 'certainly wrap onto several separate lines within the gutter width '
          + 'of a phone sheet, and every one of them must stay visible.', state: 'active' },
        { id: 'w2', text: 'A short second row', state: 'active' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const g = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const lot = document.querySelector('#lot').getBoundingClientRect();
      const items = [...document.querySelectorAll('.lot-item')];
      return {
        sheetH: b.height,
        lotH: lot.height,
        wraps: items[0].getBoundingClientRect().height > 44,
        // every row's bottom sits within the lot section — nothing is clipped
        allVisible: items.every(n => n.getBoundingClientRect().bottom <= lot.bottom + 0.5),
      };
    });
    ok('a wrapping item grows the lot past the two-row floor (122)',
      g.wraps && g.lotH > 122, JSON.stringify(g));
    ok('every row is drawn within the lot, unclipped', g.allVisible, JSON.stringify(g));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Lot ceiling fixture';
      rec.parkingLot = Array.from({ length: 40 }, (_, i) => ({
        id: 'p' + i, text: 'Row ' + i + ' with enough text to occupy a full '
          + 'single line on the phone sheet gutter', state: 'active',
      }));
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const g = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const lot = document.querySelector('#lot').getBoundingClientRect();
      return { cap: Math.round(b.height * 0.5), lotH: Math.round(lot.height) };
    });
    ok('a runaway lot is held at half the sheet (B73 ceiling)',
      Math.abs(g.lotH - g.cap) <= 1, JSON.stringify(g));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 12. rh keeps y portable across frames (B32) --------------------------
  console.log('\n[12] Note y is frame-relative (rh)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 200, 400);
    await page.waitForTimeout(60);
    await page.keyboard.type('portable');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const n = document.querySelector('.note').getBoundingClientRect();
      return { top: n.top, h: window.innerHeight };
    });
    await page.setViewportSize({ width: 384, height: 600 });   // not editing: layout applies
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const n = document.querySelector('.note').getBoundingClientRect();
      return { top: n.top, h: window.innerHeight };
    });
    ok('top stays proportional to the sheet',
      Math.abs(after.top / after.h - before.top / before.h) < 0.01,
      before.top + '/' + before.h + ' -> ' + after.top + '/' + after.h);
    ok('a resize does not rewrite rh', await page.evaluate(() => new Promise(res => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
        all.onsuccess = () => {
          const n = all.result.flatMap(b => b.notes).find(n => n.text === 'portable');
          res(!!n && n.rh === 846);          // the frame it was written in, not 600
        };
      };
    })));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 12b. note size is frame-relative too (issue #57, B40) ----------------
  // renderX's law applied to visual scale: shrinking the sheet shrinks the
  // note at the same ratio, so relative geometry survives the resize. Reading
  // is not writing (B21): with no grab there is no rebase, and the stored
  // scale stays exactly what the author set.
  console.log('\n[12b] Note size scales with the sheet width (homothetic, B40)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 150, 400);
    await page.waitForTimeout(60);
    await page.keyboard.type('hi');           // short: never meets --note-max-w
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    const before = await page.evaluate(() =>
      document.querySelector('.note').getBoundingClientRect().width);
    await page.setViewportSize({ width: 300, height: 846 });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() =>
      document.querySelector('.note').getBoundingClientRect().width);
    ok('rendered width shrank by ~300/384',
      Math.abs(after / before - 300 / 384) < 0.02, before + ' -> ' + after);
    ok('stored scale unchanged — no grab, no write (B21)',
      await page.evaluate(() => new Promise(res => {
        const rq = indexedDB.open('boards-db');
        rq.onsuccess = () => {
          const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
          all.onsuccess = () => {
            const n = all.result.flatMap(b => b.notes).find(n => n.text === 'hi');
            res(!!n && n.scale === 1 && n.rw === 384);
          };
        };
      })));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 12c. fold/rotate is a similarity (issues #65/#75, B64) ---------------
  // One uniform ratio k = min(LOGICAL_W/rw, LOGICAL_H/rh) maps x, y and size
  // together, so an aspect change maps the arrangement as a figure instead of
  // shearing it: pairwise angles hold, distances and sizes scale by the one k,
  // min keeps every note on the page, and reading is not writing (B21) — the
  // stored geometry never moves. Folding back is the inverse similarity, so
  // the round trip is exact.
  console.log('\n[12c] Fold/rotate is a similarity: shape held, size uniform, storage untouched, round trip exact (issues #65/#75, B64)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Similarity fixture';
      // Three notes in an L on the 384x846 frame they were authored in.
      rec.notes = [
        { id: 's1', text: 'n1', x: 60,  y: 200, rw: 384, rh: 846, scale: 1, state: 'active' },
        { id: 's2', text: 'n2', x: 300, y: 200, rw: 384, rh: 846, scale: 1, state: 'active' },
        { id: 's3', text: 'n3', x: 60,  y: 700, rw: 384, rh: 846, scale: 1, state: 'active' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const measure = () => page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const out = { board: { left: b.left, top: b.top, right: b.right, bottom: b.bottom } };
      for (const id of ['s1', 's2', 's3']) {
        const r = document.querySelector('[data-id="' + id + '"]').getBoundingClientRect();
        out[id] = { cx: r.x + r.width / 2 - b.x, cy: r.y + r.height / 2 - b.y,
                    w: r.width, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }
      return out;
    });
    const dist = (m, a, b) => Math.hypot(m[b].cx - m[a].cx, m[b].cy - m[a].cy);
    const ang = (m, a, b) => Math.atan2(m[b].cy - m[a].cy, m[b].cx - m[a].cx);
    const before = await measure();

    // The fold: 384x846 -> 846x384. k = min(846/384, 384/846) = 384/846.
    await page.setViewportSize({ width: 846, height: 384 });
    await page.waitForTimeout(250);
    const after = await measure();
    const k = 384 / 846;

    const pairs = [['s1', 's2'], ['s1', 's3'], ['s2', 's3']];
    const ratios = pairs.map(([a, b]) => dist(after, a, b) / dist(before, a, b));
    ok('all pairwise distances shrink by the one ratio k ≈ ' + k.toFixed(4),
      ratios.every(r => Math.abs(r / k - 1) < 0.01), JSON.stringify(ratios));
    const angles = [['s1', 's2'], ['s1', 's3']].map(([a, b]) =>
      Math.abs(ang(after, a, b) - ang(before, a, b)) * 180 / Math.PI);
    ok('the figure keeps its angles at n1 (±0.5°)',
      angles.every(d => d < 0.5), JSON.stringify(angles));
    const wRatios = ['s1', 's2', 's3'].map(id => after[id].w / before[id].w);
    ok('every note width scales by k (±2%), and equally',
      wRatios.every(r => Math.abs(r / k - 1) < 0.02) &&
      Math.max(...wRatios) - Math.min(...wRatios) < 0.01, JSON.stringify(wRatios));
    ok('every note stays inside the board (min gives containment)',
      ['s1', 's2', 's3'].every(id =>
        after[id].left >= after.board.left - 0.5 && after[id].top >= after.board.top - 0.5 &&
        after[id].right <= after.board.right + 0.5 && after[id].bottom <= after.board.bottom + 0.5),
      JSON.stringify(after));
    ok('stored geometry untouched — reading is not writing (B21)',
      await page.evaluate(() => new Promise(res => {
        const rq = indexedDB.open('boards-db');
        rq.onsuccess = () => {
          const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
          all.onsuccess = () => {
            const ns = all.result.flatMap(b => b.notes);
            const want = { s1: [60, 200], s2: [300, 200], s3: [60, 700] };
            res(Object.entries(want).every(([id, [x, y]]) => {
              const n = ns.find(m => m.id === id);
              return !!n && n.x === x && n.y === y && n.scale === 1 && n.rw === 384 && n.rh === 846;
            }));
          };
        };
      })));

    // And back: the inverse similarity lands every centre where it began.
    await page.setViewportSize({ width: 384, height: 846 });
    await page.waitForTimeout(250);
    const back = await measure();
    ok('round trip is lossless (every centre within 0.5px)',
      ['s1', 's2', 's3'].every(id =>
        Math.abs(back[id].cx - before[id].cx) < 0.5 &&
        Math.abs(back[id].cy - before[id].cy) < 0.5),
      JSON.stringify({ s1: [before.s1.cx, back.s1.cx, before.s1.cy, back.s1.cy] }));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 13. pre-B32 notes stay reachable, and are not rewritten -------------
  console.log('\n[13] Legacy note (no rh) is rescued, not mutated');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await page.evaluate(() => new Promise((res, rej) => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const store = rq.result.transaction('boards', 'readwrite').objectStore('boards');
        const all = store.getAll();
        all.onsuccess = () => {
          const b = all.result[0];
          // Written on the old ~1983-unit mobile sheet: off the bottom of a 846 page.
          b.notes.push({ id: 'legacy-1', text: 'old', x: 300, y: 1500, rw: 900, scale: 1, state: 'active' });
          const put = store.put(b);
          put.onsuccess = () => res(); put.onerror = () => rej(put.error);
        };
      };
      rq.onerror = () => rej(rq.error);
    }));
    await page.reload();
    await page.waitForTimeout(700);
    const top = await page.evaluate(() => {
      const n = document.querySelector('[data-id="legacy-1"]');
      return n ? n.getBoundingClientRect().top : null;
    });
    ok('legacy note renders on the sheet', top !== null && top >= 0 && top <= 846 - 44, String(top));
    ok('stored y is untouched', await page.evaluate(() => new Promise(res => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
        all.onsuccess = () => {
          const n = all.result.flatMap(b => b.notes).find(n => n.id === 'legacy-1');
          res(!!n && n.y === 1500 && n.rh === undefined);
        };
      };
    })));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 14. tap away deselects; a further tap opens a new note (issue #41) --
  console.log('\n[14] Tap away from an editing note only deselects it');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 150, 300);
    await page.waitForTimeout(60);
    await page.keyboard.type('keep me');
    await tap(page, 150, 550);                 // tap away on bare canvas
    await page.waitForTimeout(150);
    ok('no phantom second note appears', (await noteCount(page)) === 1, 'count=' + await noteCount(page));
    ok('nothing holds focus (keyboard dismissed)', !(await activeIsNoteText(page)));
    const textAfterDismiss = await page.evaluate(() =>
      document.querySelector('.note-text').textContent);
    ok('the original note text is unchanged', textAfterDismiss === 'keep me', textAfterDismiss);
    await tap(page, 150, 550);                 // a further tap now creates a new note
    await page.waitForTimeout(60);
    ok('a second note is created on the next tap', (await noteCount(page)) === 2, 'count=' + await noteCount(page));
    ok('the new note holds focus', await activeIsNoteText(page));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 15. long-press a board row exports it (issue #43) -------------------
  console.log('\n[15] Long-press a board row offers Export');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Pocket board';
      rec.notes = [
        { id: 'm1', text: 'TOUCHMARKER', x: 60, y: 300, rw: 900, rh: 1000, scale: 1, state: 'active' },
        { id: 'm2', text: 'TOUCHSECRET', x: 60, y: 450, rw: 900, rh: 1000, scale: 1, state: 'complete' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(400);
    await page.evaluate(() => goToList());
    await page.waitForTimeout(300);

    const row = await page.evaluate(() => {
      const r = [...document.querySelectorAll('#list-rows .board-row')]
        .find(x => x.textContent.includes('Pocket board')).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const before = await noteCount(page);
    await tap(page, row.x, row.y, 700);                  // long-press, not a tap
    await page.waitForTimeout(200);
    ok('menu opened on row long-press',
       await page.evaluate(() => document.querySelector('#menu').hidden === false));
    const shape = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')];
      return { labels: b.map(x => x.textContent), danger: b.map(x => x.classList.contains('danger')) };
    });
    ok('row menu is Export then Delete', shape.labels.length === 2 &&
       /Export/.test(shape.labels[0]) && /Delete/.test(shape.labels[1]), JSON.stringify(shape.labels));
    ok('only Delete is danger', shape.danger[0] === false && shape.danger[1] === true);
    ok('the long-press did not also open the board',
       await page.evaluate(() => document.querySelector('#list-view').hidden === false));

    const btn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')].find(x => /Export/.test(x.textContent));
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const [dl] = await Promise.all([page.waitForEvent('download'), tap(page, btn.x, btn.y)]);
    const s = fs.readFileSync(await dl.path()).toString('latin1');
    ok('touch export produced a PDF', s.startsWith('%PDF-') && s.trimEnd().endsWith('%%EOF'));
    ok('filename is the board slug', /^pocket-board-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()),
       dl.suggestedFilename());
    ok('active note text is in the file', s.includes('(TOUCHMARKER)'));
    ok('completed note text is ABSENT', !s.includes('TOUCHSECRET'));
    ok('exporting created no notes', (await noteCount(page)) === before);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 16. long-press the board itself exports it, no detour through the list
  console.log('\n[16] Long-press an anchor exports the open board (issue #43)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const t = await page.evaluate(() => {
      const r = document.querySelector('#anchor-title').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, t.x, t.y);
    await page.waitForTimeout(60);
    await page.keyboard.type('Board in hand');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(150);
    const note = await page.evaluate(() => {
      const r = document.querySelector('#board').getBoundingClientRect();
      return { x: r.x + 80, y: r.y + 300 };
    });
    await tap(page, note.x, note.y);
    await page.waitForTimeout(60);
    await page.keyboard.type('ANCHORPATHMARKER');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);

    await tap(page, t.x, t.y, 700);                       // long-press the title card
    await page.waitForTimeout(200);
    ok('menu opened on anchor long-press', await page.evaluate(() =>
      document.querySelector('#menu').hidden === false));
    const shape = await page.evaluate(() =>
      [...document.querySelectorAll('#menu button')].map(b => b.textContent));
    ok('anchor menu is Export then All boards', shape.length === 2 &&
       /Export/.test(shape[0]) && /All boards/.test(shape[1]), JSON.stringify(shape));
    ok('still on the board — no navigation yet',
       await page.evaluate(() => document.querySelector('#list-view').hidden !== false));

    const btn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')].find(x => /Export/.test(x.textContent));
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const [dl] = await Promise.all([page.waitForEvent('download'), tap(page, btn.x, btn.y)]);
    const s = fs.readFileSync(await dl.path()).toString('latin1');
    ok('touch export from the anchor menu produced a PDF',
       s.startsWith('%PDF-') && s.trimEnd().endsWith('%%EOF'));
    ok('the open board — not a stale snapshot — was exported', s.includes('(ANCHORPATHMARKER)'));
    ok('exporting did not navigate to the list',
       await page.evaluate(() => document.querySelector('#list-view').hidden !== false));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 17. Copy from the long-press menu (issue #59) -----------------------
  console.log('\n[17] Long-press menu Copy shows the Copied notice');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await tap(page, 200, 400);
    await page.waitForTimeout(60);
    await page.keyboard.type('pocket text');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, box.x, box.y, 700);
    await page.waitForTimeout(150);
    const btn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')].find(x => /Copy/.test(x.textContent));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    ok('the menu offers Copy', !!btn);
    if (btn) {
      await tap(page, btn.x, btn.y);
      await page.waitForTimeout(600);                    // through the B18 window
      ok('menu closed after the window',
        await page.evaluate(() => document.querySelector('#menu').hidden !== false));
      ok('Copied notice shows', await page.evaluate(() => {
        const t = document.querySelector('#toast');
        return t.classList.contains('show') && /Copied/.test(t.textContent);
      }));
      ok('the record text reached the clipboard', await page.evaluate(() =>
        navigator.clipboard.readText().then(t => t === 'pocket text', () => false)));
      ok('copying deleted nothing', (await noteCount(page)) === 1);
    }
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 17b. Highlight toggles the note's wash, and the label flips (issue #105, B71)
  console.log('\n[17b] Long-press menu Highlight washes the note, and toggles back');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 200, 400);
    await page.waitForTimeout(60);
    await page.keyboard.type('mark me');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    // A drawn-fresh note is not highlighted.
    ok('a new note is not highlighted', await page.evaluate(() =>
      !document.querySelector('.note').classList.contains('highlight') && !current.notes[0].highlighted));

    const tapItem = async (re) => {
      const btn = await page.evaluate((src) => {
        const b = [...document.querySelectorAll('#menu button')].find(x => new RegExp(src).test(x.textContent));
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, re);
      if (btn) { await tap(page, btn.x, btn.y); await page.waitForTimeout(600); }
      return btn;
    };

    // Open the menu, choose Highlight: the whole note washes amber, and it persists.
    await tap(page, box.x, box.y, 700);
    await page.waitForTimeout(150);
    const onBtn = await tapItem('^Highlight$');
    ok('the menu offers Highlight', !!onBtn);
    ok('the note gains the highlight class', await page.evaluate(() =>
      document.querySelector('.note').classList.contains('highlight')));
    ok('and the record carries highlighted', await page.evaluate(() => current.notes[0].highlighted === true));

    // Re-open: the item now reads "Remove highlight" (the Complete/Restore grammar).
    await tap(page, box.x, box.y, 700);
    await page.waitForTimeout(150);
    ok('the item flips to Remove highlight', await page.evaluate(() =>
      [...document.querySelectorAll('#menu button')].some(b => /Remove highlight/.test(b.textContent))));
    await tapItem('Remove highlight');
    ok('the wash toggles back off', await page.evaluate(() =>
      !document.querySelector('.note').classList.contains('highlight') && current.notes[0].highlighted === false));
    ok('highlighting deleted nothing', (await noteCount(page)) === 1);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 18. screen wrap ≡ export wrap, in authored units (issue #53, B39) ---
  // One law, two resolutions: the screen caps at (LOGICAL_W − renderX)/eff,
  // exportNoteBox at (EXPORT_W − exportX)/(scale·exportMult) — both reduce to
  // (rw − x)/scale, so a cap-hitting note wraps at the same width on a phone
  // sheet and on the 900 export frame. This is the cross-frame agreement B40
  // left as "known, not fixed".
  console.log('\n[18] Screen and export share one wrap law (issue #53)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 100, 300);
    await page.waitForTimeout(60);
    await page.keyboard.type('a long line of perfectly ordinary words that has to wrap '
      + 'well before the right edge arrives because it just keeps going and going');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const note = current.notes[current.notes.length - 1];
      const node = document.querySelector('[data-id="' + note.id + '"]');
      const box = exportNoteBox(note);
      return { screenW: node.offsetWidth, exportW: box.w,
               cap: (note.rw - note.x) / (note.scale || 1),
               x: note.x, rw: note.rw, lines: box.lines.length };
    });
    // Authored at x=100 on this 384 sheet: the cap is 284 authored units.
    ok('screen wrap width is the authored-unit cap (±1)',
       Math.abs(m.screenW - m.cap) <= 1, JSON.stringify(m));
    ok('export wrap width agrees with the screen (±1)',
       Math.abs(m.exportW - m.screenW) <= 1, JSON.stringify(m));
    ok('the exported note wraps to more than one line', m.lines > 1, String(m.lines));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 18b. the note's text is centred in its frame (issue #82, B62) ------
  // One declaration covers both renders: the live editor IS .note-text
  // (contenteditable on the node, no overlay), so editing and rest agree.
  console.log('\n[18b] Note text is centred, editing and at rest (issue #82)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 100, 300);
    await page.waitForTimeout(60);
    await page.keyboard.type('centred words');
    ok('the editor centres as it types', await page.evaluate(() =>
      document.activeElement.classList.contains('note-text') &&
      getComputedStyle(document.activeElement).textAlign === 'center'));
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    ok('the resting note stays centred', await page.evaluate(() =>
      getComputedStyle(document.querySelector('.note-text')).textAlign === 'center'));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 19. the list view's categories (issue #74, B44) --------------------
  // The mobile twin of desktop's [D16]. Everything here rides genuine touch
  // events, never synthesized clicks (B27b): the drag IS the feature, and it
  // is the browser's touch pipeline that has to deliver it.
  console.log('\n[19] List categories: To-Do / Idea / Note, touch-drag between, pager (issue #74)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    // A second board, so Unsorted holds one the drag can move without it also
    // being the open board (which takes dropBoardCard's other write path).
    // Two genuine pre-#58 legacy records — no `category` field at all. B67 makes
    // `newBoardRecord()` seed 'todo', so it is deleted here: this scenario is
    // about what a record that NEVER had a category reads as, which is the half
    // of B21's idiom B67 deliberately left alone.
    await page.evaluate(async () => {
      const mk = async (title, ageMs) => {
        const r = newBoardRecord();
        r.title = title;
        delete r.category;
        r.createdAt = r.updatedAt = Date.now() - ageMs;  // older: sorts below the open board
        await idbPut(r);
      };
      await mk('Draggable', 50000);
      await mk('Stays put', 60000);
    });
    await page.reload();
    await page.waitForTimeout(500);
    await page.evaluate(() => goToList());
    await page.waitForTimeout(300);

    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('#list-rows .cat-head span')].map(s => s.textContent));
    ok('three category headers in order', heads.length === 3 &&
       heads[0] === 'To-Do Boards' && heads[1] === 'Idea Boards' && heads[2] === 'Note Boards',
       JSON.stringify(heads));

    // Category is read-site defaulted (B21 idiom): a record that never had one
    // IS Unsorted, so nothing was written to put the two legacy records there.
    // The third board is the first-run one, seeded 'todo' by B67.
    ok('the legacy records start in Unsorted, the seeded board in To-Do', await page.evaluate(() =>
      document.querySelectorAll('.board-cat[data-cat="unsorted"] .board-row').length === 2 &&
      document.querySelectorAll('.board-cat[data-cat="todo"] .board-row').length === 1 &&
      !document.querySelector('.board-cat[data-cat="idea"] .board-row')));
    ok('nothing was written to file the legacy records (B21)', await page.evaluate(async () =>
      (await idbGetAll())
        .filter(b => b.category === undefined && b.catStamp === undefined).length === 2));

    // ---- touch-drag Unsorted -> To-Do ------------------------------------
    const beforeId = await page.evaluate(() => current.id);
    const dragId = await page.evaluate(() =>
      [...document.querySelectorAll('.board-cat[data-cat="unsorted"] .board-row')]
        .find(c => c.textContent.includes('Draggable')).dataset.id);
    const from = await page.evaluate(() => {
      const r = [...document.querySelectorAll('.board-cat[data-cat="unsorted"] .board-row')]
        .find(c => c.textContent.includes('Draggable')).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    // The section itself, not its .cat-cards: To-Do holds nothing yet, so it
    // is collapsed to its head row (B68) and its cards box measures zero. The
    // drop hit-test has always been the .board-cat rect — that is exactly what
    // keeps an empty category droppable (B44's requirement, B68's obligation).
    const to = await page.evaluate(() => {
      const r = document.querySelector('.board-cat[data-cat="todo"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    // Press and move, all inside LONGPRESS_MS — movement past MOVE_THRESHOLD
    // is what turns the press into a drag rather than into the board menu.
    const c = await touchDragTo(page, from, to);
    ok('To-Do frame highlights mid-drag', await page.evaluate(() =>
      document.querySelector('.board-cat[data-cat="todo"]').classList.contains('drop-target')));
    ok('drag ghost follows the finger', await page.evaluate(() =>
      !!document.querySelector('.card-drag-ghost')));
    ok('the hold menu never opened — movement cancelled it',
       await page.evaluate(() => document.querySelector('#menu').hidden !== false));
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await c.detach();
    await page.waitForTimeout(300);

    ok('highlight and ghost cleared on release', await page.evaluate(() =>
      !document.querySelector('.drop-target') && !document.querySelector('.card-drag-ghost')));
    ok('card lands first in To-Do', await page.evaluate((id) => {
      const first = document.querySelector('.board-cat[data-cat="todo"] .board-row');
      return !!first && first.dataset.id === id;
    }, dragId));
    ok('it left Unsorted', await page.evaluate(() =>
      document.querySelectorAll('.board-cat[data-cat="unsorted"] .board-row').length === 1));
    ok('IDB record carries category + catStamp', await page.evaluate(async (id) => {
      const rec = await idbGet(id);
      return !!rec && rec.category === 'todo' && typeof rec.catStamp === 'number';
    }, dragId));
    ok('the drag did not open the board',
       await page.evaluate(() => document.querySelector('#list-view').hidden === false));
    ok('and did not switch the open board', await page.evaluate(() => current.id) === beforeId);

    // ---- the other two readings of the same press are untouched (B43) -----
    const todoCard = await page.evaluate(() => {
      const r = document.querySelector('.board-cat[data-cat="todo"] .board-row').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, todoCard.x, todoCard.y, 700);        // motionless hold
    await page.waitForTimeout(200);
    ok('a motionless hold still opens the board menu',
       await page.evaluate(() => document.querySelector('#menu').hidden === false));
    const items = await page.evaluate(() =>
      [...document.querySelectorAll('#menu button')].map(b => b.textContent));
    ok('and it is still Export then Delete', items.length === 2 &&
       /Export/.test(items[0]) && /Delete/.test(items[1]), JSON.stringify(items));
    // Dismiss on a category head: B30's inert-dismiss only covers presses that
    // land on #board, so a dismiss onto a board card would open that board,
    // and .cat-add / the pager buttons are controls. A .cat-head is aria-hidden
    // furniture with no listener of its own — the press dismisses and does
    // nothing else. (It replaces #list-title, deleted with the heading by B66.)
    // The menu is drawn at the press point, so take a head the menu is not
    // covering and that really is the topmost thing at that point.
    const dismiss = await page.evaluate(() => {
      const m = document.querySelector('#menu').getBoundingClientRect();
      const heads = [...document.querySelectorAll('.cat-head')].map((h) => {
        const r = h.getBoundingClientRect();
        const p = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        const hit = document.elementFromPoint(p.x, p.y);
        p.clear = !(p.x >= m.left && p.x <= m.right && p.y >= m.top && p.y <= m.bottom) &&
                  (hit === h || h.contains(hit));
        return p;
      });
      // null, never a point we have not cleared: tapping a point the menu is
      // over would hit Delete and destroy the board the rest of [19] asserts on.
      return heads.find(p => p.clear) || null;
    });
    ok('an inert category head is clear of the open menu', !!dismiss);
    if (dismiss) await tap(page, dismiss.x, dismiss.y);
    await page.waitForTimeout(600);                      // let any window drain
    ok('dismissing the menu opened nothing',
       await page.evaluate(() => document.querySelector('#list-view').hidden === false));

    await tap(page, todoCard.x, todoCard.y);             // motionless release
    await page.waitForTimeout(600);                      // past ACTION_DELAY
    ok('a motionless tap still opens the board',
       await page.evaluate(() => document.querySelector('#list-view').hidden !== false));
    ok('and it opened the one that was tapped',
       await page.evaluate(() => current.id) === dragId);

    // ---- overflow pages, never scrolls -----------------------------------
    // Enough to keep Note Boards at three or more pages now that the collapse
    // of an empty Idea Boards raises the measured budget (B68): the pager is
    // only under test while there is something to page.
    await page.evaluate(async () => {
      // 30, not 14: B70 put two cards on a row, so a page holds twice what it
      // did and the old seed no longer reached the 3+ pages this block asserts.
      for (let i = 0; i < 30; i++) {
        const r = newBoardRecord();
        r.title = 'Seed ' + i;
        r.category = 'unsorted';        // written, not defaulted: B67 seeds 'todo'
        r.createdAt = r.updatedAt = Date.now() - (i + 2) * 100000;
        await idbPut(r);
      }
    });
    await page.reload();
    await page.waitForTimeout(500);
    await page.evaluate(() => goToList());
    await page.waitForTimeout(300);

    ok('categorization survives the reload', await page.evaluate((id) => {
      const first = document.querySelector('.board-cat[data-cat="todo"] .board-row');
      return !!first && first.dataset.id === id;
    }, dragId));

    const pg = await page.evaluate(async () => {
      const un = document.querySelector('.board-cat[data-cat="unsorted"]');
      const pager = un.querySelector('.cat-pager');
      const btns = [...pager.querySelectorAll('.pager-btn')];
      const all = await idbGetAll();
      const cards = un.querySelector('.cat-cards');
      return {
        visible: !pager.hidden,
        disabled: btns.map(b => b.disabled),
        labels: btns.map(b => b.getAttribute('aria-label')),
        ind: un.querySelector('.cat-pages').textContent,
        onPage: un.querySelectorAll('.board-row').length,
        total: all.filter(b => b.category !== 'todo' && b.category !== 'idea').length,
        noScroll: cards.scrollHeight <= cards.clientHeight + 1,
        listNoScroll: (() => {
          const v = document.querySelector('#list-view');
          return v.scrollHeight <= v.clientHeight + 1;
        })(),
        floor: Math.min(...btns.map(b => Math.min(b.getBoundingClientRect().width,
                                                  b.getBoundingClientRect().height))),
      };
    });
    ok('pager visible in Unsorted', pg.visible);
    ok('pager is first/prev/next/last', pg.labels.join(',') ===
       'First page,Previous page,Next page,Last page', pg.labels.join(','));
    ok('first/prev disabled on page 0; next/last enabled',
       pg.disabled[0] && pg.disabled[1] && !pg.disabled[2] && !pg.disabled[3],
       JSON.stringify(pg.disabled));
    const pages = Math.ceil(pg.total / pg.onPage);
    ok('indicator reads 1/' + pages, pg.ind === '1/' + pages,
       pg.ind + ' (total=' + pg.total + ' onPage=' + pg.onPage + ')');
    // The seed is sized to the measured budget, not to a constant: if a future
    // capacity change swallowed the overflow, every pager assertion below would
    // pass vacuously. Three pages keep first/prev/next/last distinguishable.
    ok('the seed still overflows into 3+ pages', pages >= 3,
       'pages=' + pages + ' (total=' + pg.total + ' onPage=' + pg.onPage + ')');
    // The load-bearing pair: overflow PAGES. Neither the category nor the
    // screen itself may scroll — B44 trades the scroll away for the drag.
    ok('the shown page does not overflow its clip', pg.noScroll);
    ok('the list view itself does not scroll', pg.listNoScroll);
    ok('pager buttons clear the 44px touch floor', pg.floor >= 44, String(pg.floor));

    // Page turns are inert navigation — instant, no 400ms window (B22).
    const tapPager = async (lbl) => {
      const b = await page.evaluate((l) => {
        const r = document.querySelector(
          '.board-cat[data-cat="unsorted"] .pager-btn[aria-label="' + l + '"]')
          .getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, lbl);
      await tap(page, b.x, b.y);
      await page.waitForTimeout(150);
    };
    const unState = () => page.evaluate(() => {
      const un = document.querySelector('.board-cat[data-cat="unsorted"]');
      const btn = (l) => un.querySelector('.pager-btn[aria-label="' + l + '"]');
      return { ind: un.querySelector('.cat-pages').textContent,
               first: un.querySelector('.board-row').dataset.id,
               nextOff: btn('Next page').disabled, lastOff: btn('Last page').disabled };
    });
    const p0 = await unState();
    await tapPager('Next page');
    let s = await unState();
    ok('next turns to page 2', s.ind === '2/' + pages && s.first !== p0.first, s.ind);
    await tapPager('Last page');
    s = await unState();
    ok('last jumps to the end, next/last disable', s.ind === pages + '/' + pages &&
       s.nextOff && s.lastOff, s.ind);
    await tapPager('Previous page');
    s = await unState();
    ok('prev steps back', s.ind === (pages - 1) + '/' + pages, s.ind);
    await tapPager('First page');
    s = await unState();
    ok('first returns to page 1', s.ind === '1/' + pages && s.first === p0.first, s.ind);
    ok('a page turn opened no board',
       await page.evaluate(() => document.querySelector('#list-view').hidden === false));

    // ---- most recently updated first (issue #97, B69) --------------------
    // The order key is last touch, not creation: a board edited through the
    // app's own save path comes back to the top of its section. The order
    // must also be TOTAL — two builds of the same records have to slice the
    // same page, or a card could change slots for no reason the user caused.
    const unSorted = () => page.evaluate(async () => {
      const all = await idbGetAll();
      return all.map(b => (current && b.id === current.id) ? current : b)
                .filter(b => catOf(b) === 'unsorted').sort(catOrder).map(b => b.id);
    });
    const unShown = () => page.evaluate(() =>
      [...document.querySelectorAll('.board-cat[data-cat="unsorted"] .board-row')]
        .map(c => c.dataset.id));
    const order0 = await unSorted();
    const shown0 = await unShown();
    await page.evaluate(() => renderList());
    await page.waitForTimeout(200);
    ok('two builds of the same records give the same order',
       order0.length >= 3 && order0.join(',') === (await unSorted()).join(',') &&
       shown0.join(',') === (await unShown()).join(','), order0.join(','));

    // Open the SECOND card on page 1 — already visible, and not already first.
    const target = shown0[1];
    ok('a non-first card is under test', !!target && target !== order0[0], String(target));
    if (target && target !== order0[0]) {
    const tbox = await page.evaluate((id) => {
      const r = document.querySelector('.board-row[data-id="' + id + '"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, target);
    await tap(page, tbox.x, tbox.y);
    await page.waitForTimeout(600);                     // past ACTION_DELAY
    ok('the second card opened its board',
       await page.evaluate(() => current.id) === target);
    // A genuine edit, not a poked field: capture a note and commit it — the
    // commit's saveNow() is what stamps updatedAt.
    await tap(page, 200, 500);
    await page.waitForTimeout(80);
    await page.keyboard.type('touched');
    // The capture above is a genuine touch (B27b); the commit is a blur so a
    // second tap doesn't leave a stray empty note behind.
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(400);
    await page.evaluate(() => goToList());
    await page.waitForTimeout(300);
    const order1 = await unSorted();
    ok('the edited board is now first in its section', order1[0] === target,
       order1.join(',') + ' (edited ' + target + ')');
    ok('and its card is first on the page',
       (await unShown())[0] === target, (await unShown()).join(','));
    ok('the boards nobody touched keep their relative order',
       order1.filter(id => id !== target).join(',') ===
       order0.filter(id => id !== target).join(','),
       order1.join(',') + ' vs ' + order0.join(','));
    }

    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 20. per-category creation (issue #88, B63) -------------------------
  // Each section carries its own New board control on the head row; the pager
  // moved below the cards, centred; the global buttons are gone. Creating
  // rides genuine touch events like everything mobile (B27b).
  console.log('\n[20] Per-category New board: head row, pager below, create-in-category (issue #88)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    // Every section holds something, so every section draws its whole grid —
    // head, control, cards, pager — which is what this scenario measures. (An
    // empty one collapses to its head row under B68 and is [21]'s subject.)
    // Note Boards is seeded past the budget so the pager row is under test.
    await page.evaluate(async () => {
      const put = async (cat, n, tag) => {
        for (let i = 0; i < n; i++) {
          const r = newBoardRecord();
          r.title = tag + ' ' + i;
          // Written, never defaulted: B67 seeds newBoardRecord() 'todo', so an
          // omitted category would file these in To-Do, not Note Boards.
          r.category = cat;
          r.catStamp = Date.now() - (i + 1) * 100000;
          r.createdAt = r.updatedAt = Date.now() - (i + 1) * 100000;
          await idbPut(r);
        }
      };
      await put('todo', 2, 'To-do');
      await put('idea', 2, 'Idea');
      await put('unsorted', 8, 'Fill');
    });
    await page.reload();
    await page.waitForTimeout(500);
    await page.evaluate(() => goToList());
    await page.waitForTimeout(300);

    ok('the global New board buttons are gone', await page.evaluate(() =>
      !document.querySelector('#new-board') && !document.querySelector('#pane-new')));
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('#list-rows .cat-head span')].map(s => s.textContent));
    ok('labels read To-Do / Idea / Note Boards',
       heads.join('|') === 'To-Do Boards|Idea Boards|Note Boards', JSON.stringify(heads));

    const geo = await page.evaluate(() =>
      [...document.querySelectorAll('#list-rows .board-cat')].map(sec => {
        const s = sec.getBoundingClientRect();
        const adds = sec.querySelectorAll('.cat-add');
        const a = adds[0] && adds[0].getBoundingClientRect();
        const h = sec.querySelector('.cat-head').getBoundingClientRect();
        const cards = sec.querySelector('.cat-cards');
        const pager = sec.querySelector('.cat-pager');
        const kids = pager && !pager.hidden
          ? [...pager.children].map(k => k.getBoundingClientRect()) : null;
        return {
          adds: adds.length,
          empty: sec.classList.contains('empty'),
          addRight: a ? Math.abs(a.right - s.right) : 99,
          headH: h.height, addH: a ? a.height : 0, addW: a ? a.width : 0,
          headOverflow: sec.querySelector('.cat-head span').scrollWidth >
                        sec.querySelector('.cat-head span').clientWidth + 1,
          pagerVisible: !!kids,
          pagerBelow: kids
            ? pager.getBoundingClientRect().top >= cards.getBoundingClientRect().bottom : null,
          pagerCentre: kids
            ? Math.abs((Math.min(...kids.map(k => k.left)) +
                        Math.max(...kids.map(k => k.right))) / 2 - (s.left + s.width / 2))
            : null,
          clip: cards.scrollHeight <= cards.clientHeight + 1,
        };
      }));
    ok('one New board per section, anchored right (±1)', geo.length === 3 &&
       geo.every(g => g.adds === 1 && g.addRight <= 1),
       JSON.stringify(geo.map(g => [g.adds, g.addRight])));
    ok('every section is populated here, so every grid is drawn whole',
       geo.every(g => !g.empty), JSON.stringify(geo.map(g => g.empty)));
    ok('the head row is one box: header height = button height',
       geo.every(g => Math.abs(g.headH - g.addH) < 0.5),
       JSON.stringify(geo.map(g => [g.headH, g.addH])));
    ok('the control clears the 44px touch floor',
       geo.every(g => g.addH >= 44 && g.addW >= 44),
       JSON.stringify(geo.map(g => [g.addW, g.addH])));
    ok('no header truncates beside its control', geo.every(g => !g.headOverflow),
       JSON.stringify(geo.map(g => g.headOverflow)));
    const paged = geo.filter(g => g.pagerVisible);
    ok('a visible pager is under test', paged.length >= 1, String(paged.length));
    ok('the pager sits below the cards', paged.every(g => g.pagerBelow));
    ok('and centres on its section (±1)', paged.every(g => g.pagerCentre <= 1),
       JSON.stringify(paged.map(g => g.pagerCentre)));
    ok('no section overflows its clip', geo.every(g => g.clip));
    ok('the list view itself does not scroll', await page.evaluate(() => {
      const v = document.querySelector('#list-view');
      return v.scrollHeight <= v.clientHeight + 1;
    }));

    // Tap To-Do's own control: B18's window, then the board opens IN To-Do.
    const before = await page.evaluate(() => current.id);
    const btn = await page.evaluate(() => {
      const r = document.querySelector('.board-cat[data-cat="todo"] .cat-add')
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await tap(page, btn.x, btn.y);
    await page.waitForTimeout(80);
    ok('acknowledged inside the window: .cat-add.tapped, list still up (B18)',
       await page.evaluate(() =>
         !!document.querySelector('.cat-add.tapped') &&
         document.querySelector('#list-view').hidden === false));
    await page.waitForTimeout(600);
    ok('the window closed onto the new board', await page.evaluate(() =>
      document.querySelector('#list-view').hidden !== false));
    const rec = await page.evaluate(async () => {
      const all = await idbGetAll();
      const newest = all.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      return { cat: newest.category, stamp: typeof newest.catStamp,
               opened: newest.id === current.id };
    });
    ok('the record is written into To-Do, stamped, and open',
       rec.cat === 'todo' && rec.stamp === 'number' && rec.opened, JSON.stringify(rec));
    ok('and it is a new board, not the one that was open',
       await page.evaluate(() => current.id) !== before);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 21. the compartment's handle: the menu, named, on the title card ----
  console.log('\n[21] The compartment names its menu (issue #94, B65)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const geo = await page.evaluate(() => {
      const b = document.querySelector('#title-menu');
      const r = b.getBoundingClientRect();
      const card = document.querySelector('#anchor-title').getBoundingClientRect();
      const rule = document.querySelector('#band-rule').getBoundingClientRect();
      const hit = parseFloat(getComputedStyle(b).getPropertyValue('--hit')) || 0;
      return { label: b.textContent, expanded: b.getAttribute('aria-expanded'),
               pop: b.getAttribute('aria-haspopup'), child: document.querySelector('#anchor-title').contains(b),
               r: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom },
               card: { right: card.right, bottom: card.bottom }, ruleTop: rule.top, hit };
    });
    ok('the handle says Menu', geo.label === 'Menu', geo.label);
    ok('and declares the popup it opens', geo.pop === 'menu' && geo.expanded === 'false',
       JSON.stringify([geo.pop, geo.expanded]));
    // The whole reason it is a sibling: contenteditable is toggled onto
    // #anchor-title itself, so a child would be edited along with the title.
    ok('it is a SIBLING of the title, never inside the editable region', geo.child === false);
    ok('flush with the compartment\'s right edge (±0.5)',
       Math.abs(geo.r.right - geo.card.right) < 0.5, JSON.stringify([geo.r.right, geo.card.right]));
    ok('bisected by the compartment\'s bottom edge (±1)',
       Math.abs((geo.r.y + geo.r.h / 2) - geo.card.bottom) < 1,
       JSON.stringify([geo.r.y + geo.r.h / 2, geo.card.bottom]));
    // B38/B47 are untouched: the handle is out of flow and nothing measures it.
    ok('the compartment did not grow: bottom is still rule + 22 (B38/B47)',
       Math.abs(geo.card.bottom - (geo.ruleTop + 22)) < 1,
       JSON.stringify([geo.card.bottom, geo.ruleTop]));
    // UIUX §6 / B7: the hit area expands, the visual frame does not.
    ok('the visual frame stays small (32px)', Math.abs(geo.r.h - 32) < 0.5, String(geo.r.h));
    ok('the hit target clears the 44px touch floor',
       geo.r.h + 2 * geo.hit >= 44 && geo.r.w + 2 * geo.hit >= 44,
       JSON.stringify([geo.r.w + 2 * geo.hit, geo.r.h + 2 * geo.hit]));

    // The collar is asymmetric on purpose (B65): all of it goes DOWNWARD, onto
    // the deep, because upward is the title's own words.
    ok('the collar never reaches up into the title\'s words',
       await page.evaluate(() => {
         const b = document.querySelector('#title-menu');
         const box = b.getBoundingClientRect();
         const collar = getComputedStyle(b, '::before');
         return collar.top === '0px' && parseFloat(collar.bottom) <= 0 && box.height > 0;
       }));
    // Press the BOTTOM of the collar — past the card, over bare canvas — so the
    // classifier, not the painted box, is what is under test.
    const before = await noteCount(page);
    await tap(page, geo.r.x + geo.r.w / 2, geo.r.bottom + 2 * geo.hit - 1);
    await page.waitForTimeout(80);
    ok('acknowledged inside the window: #title-menu.tapped, menu still shut (B18)',
       await page.evaluate(() => !!document.querySelector('#title-menu.tapped') &&
         document.querySelector('#menu').hidden === true));
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => ({
      open: document.querySelector('#menu').hidden === false,
      items: [...document.querySelectorAll('#menu button')].map(b => b.textContent),
      expanded: document.querySelector('#title-menu').getAttribute('aria-expanded'),
    }));
    ok('the collar opened the menu — no note on the canvas beneath it',
       opened.open && (await noteCount(page)) === before, JSON.stringify(opened.open));
    // Exactly the anchor menu B43 pins, unchanged: the handle is a second door
    // to one room, not a second room.
    ok('and it is the anchor menu unchanged: Export then All boards',
       opened.items.length === 2 && /Export/.test(opened.items[0]) &&
       /All boards/.test(opened.items[1]), JSON.stringify(opened.items));
    ok('the handle reports itself expanded', opened.expanded === 'true', opened.expanded);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    ok('Escape shuts it, collapsed, with focus back on the handle',
       await page.evaluate(() => document.querySelector('#menu').hidden === true &&
         document.querySelector('#title-menu').getAttribute('aria-expanded') === 'false' &&
         document.activeElement === document.querySelector('#title-menu')));

    // Issue #94's own condition: the gesture path is not replaced.
    const t = await page.evaluate(() => {
      const r = document.querySelector('#anchor-title').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + 24 };
    });
    await tap(page, t.x, t.y, 700);
    await page.waitForTimeout(200);
    ok('long-press on the title still opens the same menu — both paths exist',
       await page.evaluate(() => document.querySelector('#menu').hidden === false &&
         [...document.querySelectorAll('#menu button')].length === 2));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 22. four cards a page: the empty category collapses (issue #97, B68) --
  // The budget stays MEASURED (B42/B44) — nothing here pins a constant. What
  // is pinned is the shape B68 rules: an empty section gives up its cards and
  // pager slots but keeps its head row, so the populated sections clear four.
  console.log('\n[22] Four cards a page: empty categories collapse to their head row (issue #97)');
  {
    // The fill state has to be EXACTLY what is asked for, so the first-run
    // board goes first: B67 seeds it 'todo', and a To-Do that is never empty
    // is a To-Do that never collapses — which is the whole subject here.
    // Clearing also makes this scenario independent of whatever the seed's
    // category happens to be, rather than re-encoding today's answer.
    const seed = (page, counts) => page.evaluate(async (c) => {
      for (const b of await idbGetAll()) await idbDelete(b.id);
      const cats = ['todo', 'idea', 'unsorted'];
      let n = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < c[i]; j++) {
          const r = newBoardRecord();
          r.title = cats[i].toUpperCase() + ' ' + j;
          r.category = cats[i];
          r.catStamp = r.createdAt = r.updatedAt = Date.now() - (++n) * 100000;
          await idbPut(r);
        }
      }
    }, counts);
    // What every fill state must be true of, whatever the measured number is.
    const survey = (page) => page.evaluate(() => {
      const secs = [...document.querySelectorAll('#list-rows .board-cat')];
      const v = document.querySelector('#list-view');
      return {
        sections: secs.length,
        cats: secs.map(s => s.dataset.cat),
        empty: secs.map(s => s.classList.contains('empty')),
        cards: secs.map(s => s.querySelectorAll('.board-row').length),
        secH: secs.map(s => +s.getBoundingClientRect().height.toFixed(1)),
        // Label and control survive a collapse: it is still somewhere to
        // create in (B63) and still somewhere to drop onto (B44).
        labels: secs.map(s => s.querySelector('.cat-head span').textContent),
        addBox: secs.map(s => {
          const r = s.querySelector('.cat-add').getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.height)];
        }),
        cardFloor: Math.min(99, ...[...document.querySelectorAll('.board-row')]
          .map(c => c.getBoundingClientRect().height)),
        cols: getComputedStyle(secs[0].querySelector('.cat-cards'))
          .gridTemplateColumns.split(' ').filter(Boolean).length,
        clip: secs.every(s => {
          const c = s.querySelector('.cat-cards');
          return c.scrollHeight <= c.clientHeight + 1;
        }),
        listNoScroll: v.scrollHeight <= v.clientHeight + 1,
        inds: secs.map(s => (s.querySelector('.cat-pager').hidden
          ? null : s.querySelector('.cat-pages').textContent)),
      };
    });
    const invariants = (s, where) => {
      ok(where + ': all three sections are still drawn, in order',
         s.sections === 3 && s.cats.join(',') === 'todo,idea,unsorted', JSON.stringify(s.cats));
      ok(where + ': every section still names itself and offers New board',
         s.labels.join('|') === 'To-Do Boards|Idea Boards|Note Boards' &&
         s.addBox.every(b => b[0] >= 44 && b[1] >= 44),
         JSON.stringify(s.labels) + ' ' + JSON.stringify(s.addBox));
      ok(where + ': no card is under the 44px touch floor (UIUX §6)',
         s.cardFloor >= 44, String(s.cardFloor));
      // B70: the vertical axis is at §6's floor, so the row carries two. Pinned
      // as the rendered track count, not the declaration — a card that spanned
      // both columns would still pass a text check on the stylesheet.
      ok(where + ': the cards track is two columns wide (B70)',
         s.cols === 2, String(s.cols));
      ok(where + ': no section overflows its clip', s.clip);
      ok(where + ': the list view itself does not scroll', s.listNoScroll);
    };

    // -- one category populated: two collapse, and it clears four ----------
    {
      const { ctx, page, errors } = await newMobilePage(browser);
      await seed(page, [0, 0, 8]);
      await page.reload();
      await page.waitForTimeout(500);
      await page.evaluate(() => goToList());
      await page.waitForTimeout(300);
      const s = await survey(page);
      invariants(s, 'one populated');
      ok('one populated: To-Do and Idea collapse, Note Boards does not',
         s.empty.join(',') === 'true,true,false', JSON.stringify(s.empty));
      ok('one populated: a collapsed section is exactly its head row (44px)',
         s.empty.every((e, i) => !e || Math.abs(s.secH[i] - 44) < 0.5),
         JSON.stringify(s.secH));
      ok('one populated: six or more cards on the page (issue #97, B70)',
         s.cards[2] >= 6, JSON.stringify(s.cards));

      // A collapsed category is still a place to create in — B63's control is
      // the whole reason the head row survives the collapse.
      const btn = await page.evaluate(() => {
        const r = document.querySelector('.board-cat[data-cat="todo"] .cat-add')
          .getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await tap(page, btn.x, btn.y);
      await page.waitForTimeout(600);
      ok('one populated: New board in a collapsed To-Do still creates there',
         await page.evaluate(async () => {
           const all = await idbGetAll();
           const newest = all.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
           return newest.category === 'todo' && newest.id === current.id;
         }));
      ok('no page errors', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // -- two populated: one collapses, and it still clears four ------------
    {
      const { ctx, page, errors } = await newMobilePage(browser);
      await seed(page, [0, 3, 8]);
      await page.reload();
      await page.waitForTimeout(500);
      await page.evaluate(() => goToList());
      await page.waitForTimeout(300);
      const s = await survey(page);
      invariants(s, 'two populated');
      ok('two populated: only the empty To-Do collapses',
         s.empty.join(',') === 'true,false,false', JSON.stringify(s.empty));
      ok('two populated: six or more cards on the page (issue #97, B70)',
         s.cards[2] >= 6, JSON.stringify(s.cards));
      ok('no page errors', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // -- all three populated: nothing collapses, and the pager states the
    //    honest budget rather than a constant clipping off the bottom -------
    {
      const { ctx, page, errors } = await newMobilePage(browser);
      await seed(page, [3, 3, 8]);
      await page.reload();
      await page.waitForTimeout(500);
      await page.evaluate(() => goToList());
      await page.waitForTimeout(300);
      const s = await survey(page);
      invariants(s, 'three populated');
      ok('three populated: nothing collapses',
         s.empty.join(',') === 'false,false,false', JSON.stringify(s.empty));
      ok('three populated: the sections share the height evenly',
         Math.max(...s.secH) - Math.min(...s.secH) < 1, JSON.stringify(s.secH));
      // The state the issue's number is really about: nothing empty to reclaim,
      // so the six come from the row holding two rather than from a collapse.
      ok('three populated: six cards on the page, all three sections drawn (B70)',
         s.cards[2] >= 6, JSON.stringify(s.cards));
      ok('three populated: the budget is measured, and the pager says so',
         s.cards[2] >= 3 && s.inds[2] === '1/' + Math.ceil(9 / s.cards[2]),
         JSON.stringify(s.cards) + ' ' + JSON.stringify(s.inds));
      ok('no page errors', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // -- nothing at all: the open board is the only record ------------------
    {
      const { ctx, page, errors } = await newMobilePage(browser);
      await page.evaluate(() => goToList());
      await page.waitForTimeout(300);
      const s = await survey(page);
      invariants(s, 'empty app');
      // Not seeded: this is the genuine first-run state. B67 seeds that board
      // 'todo', so To-Do is the section held open and the other two collapse —
      // the mirror of what this block asserted before the ladder rotated.
      ok('empty app: the first-run board holds To-Do open, Idea and Note collapse',
         s.empty.join(',') === 'false,true,true', JSON.stringify(s.empty));
      ok('no page errors', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  await browser.close();
  console.log('\n=== mobile: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
