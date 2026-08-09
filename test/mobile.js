const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.BOARDS_URL || 'http://localhost:8000/index.html';
// Point at a specific Chromium with CHROMIUM_PATH; otherwise Playwright's own.
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? (pass++, console.log('  PASS ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? ' :: ' + extra : ''))); };

async function newMobilePage(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 384, height: 846 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
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
    // Low on the sheet, where clipping bit — but above the lot, which under B32
    // occupies y 620-830 at this viewport (846 - 16 bottom - 210 tall).
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
    const labels = await page.evaluate(() => [...document.querySelectorAll('#menu button')].map(b => b.textContent));
    ok('menu has Complete/Boards/Delete', labels.length === 3, JSON.stringify(labels));
    // Export is board-level. The item-order law is per-menu, and a note's menu
    // is not the place to export the board it happens to sit on.
    ok('the note menu did not gain Export', !labels.some(l => /Export/.test(l)), JSON.stringify(labels));
    // dismissing the menu on canvas must NOT also create a note (B30)
    const n0 = await noteCount(page);
    // Bare canvas: above the note, clear of the menu it opened (which hangs
    // below the press point) and of the lot band (y 620-830 under B32).
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

  // ---- 10. sustained capture session: no lost taps -------------------------
  console.log('\n[10] Sustained capture (10 notes, mixed hold times)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    // Rows 120 apart so no tap lands on the ~42px note above it (at 1:1 a note
    // is its real size, not 43% of it), clear of the top furniture and of the
    // lot band (y 620-830 under B32). The centre column starts below the title
    // card, which reaches y=252 now that it is a framed box (B33).
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
      return {
        rs: cs.getPropertyValue('--rs').trim(),
        lw: cs.getPropertyValue('--logical-w').trim(),
        lh: cs.getPropertyValue('--logical-h').trim(),
        maxW: cs.getPropertyValue('--note-max-w').trim(),
        titleFont: getComputedStyle(document.querySelector('#anchor-title')).fontSize,
        compFont: getComputedStyle(document.querySelector('#anchor-components')).fontSize,
        title: r('#anchor-title'), comp: r('#anchor-components'),
        req: r('#anchor-requirements'), lot: r('#lot'),
        rule: r('#band-rule'),
        titleBorder: getComputedStyle(document.querySelector('#anchor-title')).borderTopWidth,
      };
    });
    ok('renderScale is 1', geo.rs === '1', 'rs=' + geo.rs);
    ok('sheet width is the viewport', geo.lw === '384px', geo.lw);
    ok('sheet height is the viewport', geo.lh === '846px', geo.lh);
    // Declared sizes reach the screen, not ~43% of them. The title sets at the
    // header size now that the card carries the hierarchy (B33).
    ok('title renders at 15px', geo.titleFont === '15px', geo.titleFont);
    ok('Components renders at 15px', geo.compFont === '15px', geo.compFont);
    ok('title card is 24.4444% of the sheet', Math.abs(geo.title.width - 93.9) < 1, String(geo.title.width));
    ok('three-across header preserved',
      geo.comp.right <= geo.title.left && geo.title.right <= geo.req.left,
      JSON.stringify([geo.comp.right, geo.title.left, geo.title.right, geo.req.left]));
    // B33 / issue #38: the band is drawn furniture. The card is framed on a
    // blank board, and it overhangs the rule so it occludes it.
    ok('title card is framed when empty', geo.titleBorder === '2px', geo.titleBorder);
    ok('band rule is drawn on a blank board', geo.rule.width > 0 && geo.rule.height >= 1,
      JSON.stringify([geo.rule.width, geo.rule.height]));
    ok('card overhangs the band rule', geo.title.bottom > geo.rule.top + 1,
      JSON.stringify([geo.title.bottom, geo.rule.top]));
    ok('lot is 210px — four rows', Math.round(geo.lot.height) === 210, String(geo.lot.height));
    ok('lot sits above the bottom edge', Math.round(geo.lot.bottom) === 830, String(geo.lot.bottom));
    ok('note cap is 45% of the sheet', geo.maxW === '173px', geo.maxW);
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

  await browser.close();
  console.log('\n=== mobile: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
