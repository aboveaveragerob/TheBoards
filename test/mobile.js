const { chromium } = require('playwright');
const URL = process.env.BOARDS_URL || 'http://localhost:8000/index.html';
// Point at a specific Chromium with CHROMIUM_PATH; otherwise Playwright's own.
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? (pass++, console.log('  PASS ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? ' :: ' + extra : ''))); };

async function newMobilePage(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 384, height: 846 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
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

  // ---- 5. rapid double tap -> exactly one surviving note -------------------
  console.log('\n[5] Impatient double-tap');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 150, 450);
    await tap(page, 250, 550);
    await page.waitForTimeout(150);
    const n = await noteCount(page);
    ok('one note survives (empty first one discarded)', n === 1, 'count=' + n);
    ok('the survivor holds focus', await activeIsNoteText(page));
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
          b.notes.push({ id: 'husk-1', text: '   ', x: 300, y: 500, rw: 900, scale: 1, state: 'active' });
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
    await tap(page, 128, 500);   // logical 300 -> css 300*384/900 = 128
    await page.waitForTimeout(80);
    ok('tap on its former location creates a note', (await noteCount(page)) === before + 1);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- 7. keyboard-shrink: layout held still while editing ----------------
  console.log('\n[7] Viewport shrink during edit (keyboard proxy)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    await tap(page, 200, 700);            // low on the sheet, where clipping bit
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
    // dismissing the menu on canvas must NOT also create a note (B30)
    const n0 = await noteCount(page);
    await tap(page, 60, 700);
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

  // ---- 10. sustained capture session: no lost taps -------------------------
  console.log('\n[10] Sustained capture (10 notes, mixed hold times)');
  {
    const { ctx, page, errors } = await newMobilePage(browser);
    const pts = [[80,300],[300,300],[80,420],[300,420],[80,540],[300,540],[80,660],[300,660],[190,360],[190,600]];
    for (let i = 0; i < pts.length; i++) {
      await tap(page, pts[i][0], pts[i][1], i % 3 === 0 ? 600 : 40);   // some are long-presses
      await page.waitForTimeout(40);
      await page.keyboard.type('n' + i);
      await page.waitForTimeout(30);
    }
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(400);
    const texts = await page.evaluate(() => [...document.querySelectorAll('.note-text')].map(n => n.textContent).sort());
    ok('all 10 taps captured a note', texts.length === 10, 'got ' + texts.length + ': ' + JSON.stringify(texts));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== mobile: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
