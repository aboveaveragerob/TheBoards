const { chromium } = require('playwright');
const URL = process.env.BOARDS_URL || 'http://localhost:8000/index.html';
// Point at a specific Chromium with CHROMIUM_PATH; otherwise Playwright's own.
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? (pass++, console.log('  PASS ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? ' :: ' + extra : ''))); };

async function newDesktopPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
const noteCount = page => page.evaluate(() => document.querySelectorAll('.note').length);

(async () => {
  const browser = await chromium.launch({ ...launchOpts });

  console.log('\n[D1] Desktop mode is active');
  {
    const { ctx, page } = await newDesktopPage(browser);
    ok('html.desktop set', await page.evaluate(() => document.documentElement.classList.contains('desktop')));
    ok('rail visible', await page.evaluate(() => getComputedStyle(document.querySelector('#pane')).display !== 'none'));
    await ctx.close();
  }

  console.log('\n[D2] Canvas click keeps the B18 ghost + 400ms window');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.mouse.click(800, 600);
    await page.waitForTimeout(80);
    ok('ghost drawn during the window', await page.evaluate(() => !!document.querySelector('.tap-ghost')));
    ok('no note yet at 80ms', (await noteCount(page)) === 0, 'count=' + await noteCount(page));
    await page.waitForTimeout(450);
    ok('note lands after the window', (await noteCount(page)) === 1, 'count=' + await noteCount(page));
    ok('ghost removed', await page.evaluate(() => !document.querySelector('.tap-ghost')));
    ok('editor focused', await page.evaluate(() => document.activeElement.classList.contains('note-text')));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D3] Click selects instantly; double-click edits (B22/B26)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.mouse.click(800, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('desktop note');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(80);
    ok('selection appears instantly', await page.evaluate(() =>
      !!document.querySelector('#selection') && document.querySelector('#selection').hidden === false));
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(120);
    ok('second click enters edit', await page.evaluate(() =>
      document.activeElement && document.activeElement.classList.contains('note-text')));
    await page.keyboard.type('!');
    await page.waitForTimeout(80);
    ok('caret at end (B26): typing appends', await page.evaluate(() =>
      document.activeElement.textContent === 'desktop note!'),
      await page.evaluate(() => document.activeElement.textContent));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D4] Selection buttons still honour the 400ms window');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.mouse.click(800, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('to complete');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(120);
    const btn = await page.evaluate(() => {
      const b = document.querySelector('#selection .sel-btn');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    ok('selection has action buttons', !!btn);
    if (btn) {
      await page.mouse.click(btn.x, btn.y);
      await page.waitForTimeout(100);
      ok('not complete yet at 100ms', await page.evaluate(() => !document.querySelector('.note.complete')));
      await page.waitForTimeout(450);
      ok('complete lands after the window', await page.evaluate(() => !!document.querySelector('.note.complete')));
    }
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D5] Board rail: create, swap, delete');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    const n0 = await page.evaluate(() => document.querySelectorAll('#pane-cards .pane-card').length);
    await page.click('#pane-new');
    await page.waitForTimeout(700);
    const n1 = await page.evaluate(() => document.querySelectorAll('#pane-cards .pane-card').length);
    ok('new board added a card', n1 === n0 + 1, n0 + ' -> ' + n1);
    // swap to the other card
    const swapped = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#pane-cards .pane-card')];
      const other = cards.find(c => !c.classList.contains('active'));
      if (other) { other.click(); return true; }
      return false;
    });
    await page.waitForTimeout(900);
    ok('swapped to another board', swapped);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D6] Right-click a card opens the danger menu; keyboard still works');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.click('#pane-new');
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const c = document.querySelector('#pane-cards .pane-card');
      c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }));
    });
    await page.waitForTimeout(200);
    ok('menu opened on right-click', await page.evaluate(() => document.querySelector('#menu').hidden === false));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok('Escape closes it', await page.evaluate(() => document.querySelector('#menu').hidden !== false));
    // Enter on a selection edits
    await page.mouse.click(800, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('kbd');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(120);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    ok('Enter on selection enters edit', await page.evaluate(() =>
      document.activeElement && document.activeElement.classList.contains('note-text')));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok('Escape leaves edit (commit-on-blur)', await page.evaluate(() =>
      !document.activeElement || !document.activeElement.classList.contains('note-text')));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D7] Drag a note still moves it');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.mouse.click(800, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('draggable');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => document.querySelector('.note').getBoundingClientRect().x);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.querySelector('.note').getBoundingClientRect().x);
    ok('note moved right by ~120px', after - before > 80, before + ' -> ' + after);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== desktop: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
