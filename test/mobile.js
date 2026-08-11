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
    // y 708-830 at this viewport (846 - 16 bottom - 122 two-row lot, B37).
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
    // B43 (issues #59/#60): All boards · Complete · Copy · Delete, top to
    // bottom — danger last, behind the one separator.
    const shape = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')];
      return { labels: b.map(x => x.textContent),
               danger: b.map(x => x.classList.contains('danger')),
               seps: document.querySelectorAll('#menu .sep').length };
    });
    const labels = shape.labels;
    ok('menu is All boards · Complete · Copy · Delete', labels.length === 4 &&
       /All boards/.test(labels[0]) && /Complete/.test(labels[1]) &&
       /Copy/.test(labels[2]) && /Delete/.test(labels[3]), JSON.stringify(labels));
    ok('only Delete is danger, and it is last',
       shape.danger.join('|') === 'false|false|false|true', JSON.stringify(shape.danger));
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
    await page.keyboard.type('LinkedIn Learnings To Do');
    await page.waitForTimeout(120);
    const g = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const q = s => { const r = document.querySelector(s).getBoundingClientRect();
                       return { top: r.top - b.top, bottom: r.bottom - b.top, height: r.height,
                                left: r.left - b.left, right: r.right - b.left }; };
      const anchorBottom = Math.max(...[...document.querySelectorAll('.band-zone .anchor')]
        .map(n => n.getBoundingClientRect().bottom - b.top));
      return { sheetH: b.height, card: q('#anchor-title'), lot: q('#lot'), anchorBottom,
               compLabel: q('#zone-components .band-label'),
               reqLabel: q('#zone-requirements .band-label') };
    });
    ok('the title grew the card past its two-line minimum', g.card.height > 82,
      String(g.card.height));
    ok('the headers stay at rule + 8, not chasing the grown card',
      Math.abs(g.compLabel.top - 56) < 1 && Math.abs(g.reqLabel.top - 56) < 1,
      JSON.stringify([g.compLabel.top, g.reqLabel.top]));
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
    // B38 (issue #51) reads the band rule → header → content, the same
    // three-part split #lot has always used: the label sits a fixed 8px under
    // the rule and clears the compartment horizontally, on its own zone's side.
    // width:max-content means the box is the ink, so the rect is the true bound.
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
                 fontSize: getComputedStyle(n).fontSize };
      });
    });
    ok('label top is 8px under the rule',
      labels.every(l => Math.abs((l.top - l.ruleTop) - 8) < 1),
      JSON.stringify(labels.map(l => [l.text, l.top, l.ruleTop])));
    ok('labels clear the compartment horizontally',
      labels.every(l => l.zone === 'zone-components'
        ? l.right <= l.cardLeft + 0.5 : l.left >= l.cardRight - 0.5),
      JSON.stringify(labels.map(l => [l.text, l.zone, l.left, l.right, l.cardLeft, l.cardRight])));
    ok('labels render at 12px', labels.every(l => l.fontSize === '12px'),
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
    ok('lot is 122px — two rows on a phone', Math.round(geo.lot.height) === 122, String(geo.lot.height));
    ok('lot sits above the bottom edge', Math.round(geo.lot.bottom) === 830, String(geo.lot.bottom));
    // B37 (issue #49): the band is sized by the type it holds, not by the sheet,
    // so the rule is at 14 + 68/2 = 48 on every sheet, unchanged by B38.
    ok('band rule is at 48, not a fraction of the sheet',
      Math.abs(geo.rule.top - 48) < 1, String(geo.rule.top));
    // B38 (issue #52): the compartment is bounded by the sheet's own top edge,
    // not centred on the rule any more — its box runs 0..82 while the rule
    // stays at 48. The box is no longer symmetric about the rule; the type it
    // holds still is (the padding math in styles.css keeps that pixel fixed).
    ok('the compartment bottom is at 82',
      Math.abs(geo.title.bottom - 82) < 1, String(geo.title.bottom));
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
      // The band is type-sized, so it does not move when the sheet does.
      ok(`${tag} band rule is still at 48`, Math.abs(g.rule.top - 48) < 1, String(g.rule.top));
      // The clearances the band could break.
      ok(`${tag} card still crosses the rule`, g.card.bottom > g.rule.top + 1,
        JSON.stringify([g.card.bottom, g.rule.top]));
      ok(`${tag} label sits 8px under the rule and clears the lot`,
        Math.abs((g.label.top - g.rule.top) - 8) < 1 && g.label.bottom <= g.lot.top,
        JSON.stringify([g.rule.top, g.label.top, g.label.bottom, g.lot.top]));
      ok(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  // ---- 11c. EXPORT_GEO still draws what the board draws (B37, reworked B38) --
  // The exporter cannot read computed CSS, so it restates the band a second
  // time and the two can drift. The band is fixed units, identical at every
  // sheet size, so the comparison is direct: measure the live board and
  // require EXPORT_GEO to agree. The B36 form of this test resolved a *copy* of
  // the clamp in a throwaway probe, so it could only catch EXPORT_GEO drifting
  // from that hand-copied string — never from the stylesheet itself.
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
    const num = k => Number((src.match(new RegExp(k + ':\\s*(\\d+)')) || [])[1]);
    const [ruleY, cardTop, cardMinH, zoneHeaderY, zoneItemsY, labelSize] =
      ['ruleY', 'cardTop', 'cardMinH', 'zoneHeaderY', 'zoneItemsY', 'labelSize'].map(num);
    ok('EXPORT_GEO ruleY is where the board draws the rule',
      ruleY === Math.round(m.rule.top), JSON.stringify([ruleY, m.rule.top]));
    ok('EXPORT_GEO cardTop is where the board draws the card',
      cardTop === Math.round(m.card.top), JSON.stringify([cardTop, m.card.top]));
    ok('EXPORT_GEO card bottom is the boards card bottom',
      cardTop + cardMinH === Math.round(m.card.bottom),
      JSON.stringify([cardTop + cardMinH, m.card.bottom]));
    // app.js computes the exported label as ruleY + zoneHeaderY; the
    // stylesheet says the same (.band-label's own top: 8px under the rule).
    // Same number or the PDF drifts.
    ok('EXPORT_GEO label offset is the stylesheets rule + 8px',
      ruleY + zoneHeaderY === Math.round(m.label.top),
      JSON.stringify([ruleY + zoneHeaderY, m.label.top]));
    // app.js computes the exported anchor text off ruleY + zoneItemsY; the
    // stylesheet says the same (.band-zone .anchor's own top: 34px under the
    // rule, mirroring #lot-items).
    ok('EXPORT_GEO zoneItemsY agrees with the rendered anchor top',
      ruleY + zoneItemsY === Math.round(m.anchor.top),
      JSON.stringify([ruleY + zoneItemsY, m.anchor.top]));
    ok('EXPORT_GEO labelSize agrees with the rendered labels font-size',
      labelSize + 'px' === m.labelFontSize, JSON.stringify([labelSize, m.labelFontSize]));
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

  await browser.close();
  console.log('\n=== mobile: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
