const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.BOARDS_URL || 'http://localhost:8000/index.html';
// Point at a specific Chromium with CHROMIUM_PATH; otherwise Playwright's own.
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? (pass++, console.log('  PASS ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? ' :: ' + extra : ''))); };

async function newDesktopPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 },
                                         acceptDownloads: true });
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
    // A1 / UIUX §7: non-destructive first, destructive last, hairline between.
    const shape = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')];
      return { labels: b.map(x => x.textContent), danger: b.map(x => x.classList.contains('danger')),
               seps: document.querySelectorAll('#menu .sep').length };
    });
    ok('menu is Export then Delete', shape.labels.length === 2 &&
       /Export/.test(shape.labels[0]) && /Delete/.test(shape.labels[1]), JSON.stringify(shape.labels));
    ok('only Delete is danger', shape.danger[0] === false && shape.danger[1] === true,
       JSON.stringify(shape.danger));
    ok('one separator between them', shape.seps === 1, String(shape.seps));
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

  console.log('\n[D8] B32 leaves desktop furniture alone');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    const geo = await page.evaluate(() => {
      const w = s => getComputedStyle(document.querySelector(s));
      return {
        title: w('#anchor-title').width, comp: w('#anchor-components').width,
        req: w('#anchor-requirements').width,
        titleBorder: w('#anchor-title').borderTopWidth,
        ruleL: w('#band-rule').left, ruleT: w('#band-rule').top,
        zoneGap: (() => {
          const r = s => document.querySelector(s).getBoundingClientRect();
          return [r('#zone-components').right, r('#anchor-title').left,
                  r('#anchor-title').right, r('#zone-requirements').left];
        })(),
        lotH: w('#lot').height, lotL: w('#lot').left,
      };
    });
    // B33 / issue #38 as widened by B35: the card is a 340px box, and the two
    // side zones fill the sheet either side of it with an 8px gap.
    ok('title card is 340px', geo.title === '340px', geo.title);
    ok('title card is framed', geo.titleBorder === '2px', geo.titleBorder);
    ok('band rule keeps the 24px gutter', geo.ruleL === '24px', geo.ruleL);
    ok('band rule sits at y=48', geo.ruleT === '48px', geo.ruleT);
    // Screen space, so the 8px logical gap arrives scaled — assert the ordering.
    ok('zones clear the card on both sides',
      geo.zoneGap[0] < geo.zoneGap[1] && geo.zoneGap[2] < geo.zoneGap[3],
      JSON.stringify(geo.zoneGap));
    ok('Components and Requirements zones match', geo.comp === geo.req, geo.comp + ' / ' + geo.req);
    // Desktop is the mode that keeps three rows: B20 pins LOGICAL_H >= 1000,
    // and B37's budget only drops to two below 900.
    ok('lot is 166px tall — three rows (B37)', geo.lotH === '166px', geo.lotH);
    ok('lot gutter still 24px', geo.lotL === '24px', geo.lotL);
    // Issue #53 (B38): no predetermined cap — a long sentence wraps only at
    // the sheet's right edge, past the 405 the old cap would have held it to.
    await page.mouse.click(900, 500);
    await page.waitForTimeout(500);
    await page.keyboard.type('The quick brown fox jumps over the lazy dog while the '
      + 'cat watches from the window and the dog barks at the mailman who hurries '
      + 'past the gate before the rain starts falling on the quiet grey street');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    const wrap = await page.evaluate(() => {
      const n = document.querySelector('.note');
      return { right: n.getBoundingClientRect().right,
               boardRight: document.querySelector('#board').getBoundingClientRect().right,
               w: n.offsetWidth };
    });
    ok('long note wraps at the board right edge (issue #53)',
       wrap.right <= wrap.boardRight + 1, JSON.stringify(wrap));
    ok('and is wider than the old 405 cap', wrap.w > 405, String(wrap.w));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D9] Export a board to PDF (issue #43)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    // Seed through the app's own persistence rather than the UI: this test is
    // about the file, and driving twenty gestures to build a fixture would only
    // re-test D2-D7. Reload so the rail draws from storage.
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Export fixture';
      rec.components = 'alpha component';
      rec.requirements = 'beta requirement';
      rec.notes = [
        { id: 'n1', text: 'ACTIVEMARKER', x: 100, y: 400, rw: 900, rh: 1000, scale: 1, state: 'active' },
        { id: 'n2', text: 'SCRATCHEDSECRET', x: 400, y: 520, rw: 900, rh: 1000, scale: 1.5, state: 'complete' },
        { id: 'n3', text: 'legacy note with no rh', x: 120, y: 700, scale: 1, state: 'active' },
        { id: 'n4', text: '   ', x: 10, y: 10, rw: 900, rh: 1000, scale: 1, state: 'active' },
      ];
      rec.parkingLot = [{ id: 'l1', text: 'LOTMARKER', state: 'active' },
                        { id: 'l2', text: 'LOTSECRET', state: 'complete' }];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);

    const openExportMenu = () => page.evaluate(() => {
      const c = [...document.querySelectorAll('#pane-cards .pane-card')]
        .find(x => x.textContent.includes('Export fixture'));
      c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 300 }));
    });
    const clickExport = () => page.evaluate(() => {
      [...document.querySelectorAll('#menu button')]
        .find(b => /Export/.test(b.textContent)).click();
    });

    await openExportMenu();
    await page.waitForTimeout(150);
    // B18 governs this item like every other: the window is acknowledged first.
    await clickExport();
    await page.waitForTimeout(150);
    ok('menu holds open through the 400ms window',
       await page.evaluate(() => document.querySelector('#menu').hidden === false));
    ok('the chosen item is filled',
       await page.evaluate(() => !!document.querySelector('#menu button.tapped')));

    const dl = await page.waitForEvent('download');
    const buf = fs.readFileSync(await dl.path());
    const s = buf.toString('latin1');

    ok('filename is slug + creation date',
       /^export-fixture-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    ok('starts %PDF-', s.startsWith('%PDF-'));
    ok('ends %%EOF', s.trimEnd().endsWith('%%EOF'));
    ok('is 7-bit ascii', !/[^\x00-\x7F]/.test(s));
    ok('two pages: the board and its text', /\/Count 2/.test(s), (s.match(/\/Count \d+/) || [])[0]);
    ok('non-trivial size', buf.length > 2000, 'bytes=' + buf.length);

    // The offsets are the one thing a hand-rolled writer gets wrong silently:
    // a viewer reports "damaged file" and says nothing about which object.
    const startxref = Number(/startxref\s+(\d+)/.exec(s)[1]);
    ok('startxref lands on the table', s.slice(startxref, startxref + 4) === 'xref');
    const head = /xref\n0 (\d+)\n/.exec(s.slice(startxref));
    const at = startxref + head[0].length;
    let xrefOk = true, why = '';
    ok('free entry is well-formed', s.slice(at, at + 20) === '0000000000 65535 f \n');
    for (let i = 1; i < Number(head[1]); i++) {
      const entry = s.substr(at + i * 20, 20);
      if (!/^\d{10} \d{5} n \n$/.test(entry)) { xrefOk = false; why = 'entry ' + i + ': ' + JSON.stringify(entry); break; }
      const want = i + ' 0 obj';
      if (s.substr(Number(entry.slice(0, 10)), want.length) !== want) {
        xrefOk = false; why = 'object ' + i + ' is not where xref says'; break;
      }
    }
    ok('every xref offset resolves to its object', xrefOk, why);

    ok('active note text is in the file', s.includes('(ACTIVEMARKER)'));
    ok('active lot line is in the file', s.includes('(LOTMARKER)'));
    ok('anchors are in the file', s.includes('(alpha component)') && s.includes('(beta requirement)'));
    // §4.3's promise, kept in the new medium: the scratch-out destroys the text
    // rather than covering it, so nothing can extract it back out.
    ok('completed note text is ABSENT', !s.includes('SCRATCHEDSECRET'));
    ok('completed lot text is ABSENT', !s.includes('LOTSECRET'));
    ok('page objects match the count', (s.match(/\/Type \/Page\b/g) || []).length === 2);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D10] Export a card that is not the open board');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.evaluate(async () => {
      const a = newBoardRecord();
      a.title = 'Board Alpha';
      a.notes = [{ id: 'a1', text: 'ALPHAMARKER', x: 80, y: 300, rw: 900, rh: 1000, scale: 1, state: 'active' }];
      await idbPut(a);
    });
    await page.reload();
    await page.waitForTimeout(600);
    // A second board becomes `current`, so Alpha's card is now inactive.
    await page.click('#pane-new');
    await page.waitForTimeout(700);
    await page.evaluate(() => { current.notes.push(
      { id: 'b1', text: 'BETAMARKER', x: 80, y: 300, rw: 900, rh: 1000, scale: 1, state: 'active' }); });

    await page.evaluate(() => {
      const c = [...document.querySelectorAll('#pane-cards .pane-card')]
        .find(x => x.textContent.includes('Board Alpha'));
      c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 300 }));
    });
    await page.waitForTimeout(150);
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => [...document.querySelectorAll('#menu button')]
        .find(b => /Export/.test(b.textContent)).click()),
    ]);
    const s = fs.readFileSync(await dl.path()).toString('latin1');
    ok('the inactive card exported its own board', s.includes('(ALPHAMARKER)'));
    ok('and not the board that happens to be open', !s.includes('BETAMARKER'));
    ok('filename follows the exported board', /^board-alpha-/.test(dl.suggestedFilename()),
       dl.suggestedFilename());
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D11] Export the open board, including unsaved edits');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.click('#pane-new');
    await page.waitForTimeout(700);
    // Straight into `current`, with no time for the debounced save to land —
    // this is the stale-snapshot case the rail's closure would otherwise hit.
    // The husk rides along to prove the export's B8 sweep works on a copy:
    // renderBoard has already run, so nothing else is going to remove it.
    await page.evaluate(() => {
      current.notes.push(
        { id: 'u1', text: 'UNSAVEDEDIT', x: 200, y: 400, rw: 900, rh: 1000, scale: 1, state: 'active' },
        { id: 'u2', text: '   ', x: 10, y: 10, rw: 900, rh: 1000, scale: 1, state: 'active' });
    });
    await page.evaluate(() => {
      document.querySelector('#pane-cards .pane-card.active')
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 300 }));
    });
    await page.waitForTimeout(150);
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => [...document.querySelectorAll('#menu button')]
        .find(b => /Export/.test(b.textContent)).click()),
    ]);
    const s = fs.readFileSync(await dl.path()).toString('latin1');
    ok('the open board exports what is on screen', s.includes('(UNSAVEDEDIT)'));
    // B21: an export is a read. It filters its own copy and leaves live state
    // exactly as it found it, husk included.
    const live = await page.evaluate(() => current.notes.map(n => n.id));
    ok('exporting did not mutate live state', live.includes('u1') && live.includes('u2'),
       JSON.stringify(live));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D15] Copy: Complete · Copy · Delete, B18 window, clipboard + notice (issue #59)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.mouse.click(800, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('take this text');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const r = document.querySelector('.note').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(120);
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll('#selection .sel-btn')].map(b => b.textContent));
    ok('three buttons in order Complete · Copy · Delete',
       labels.join('|') === 'Complete|Copy|Delete', JSON.stringify(labels));
    const btn = await page.evaluate(() => {
      const b = document.querySelector('#selection .sel-btn.sel-copy');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    ok('the Copy button is hittable', !!btn);
    if (btn) {
      // A sentinel proves the B18 window really is empty of side effects.
      await page.evaluate(() => navigator.clipboard.writeText('sentinel'));
      await page.mouse.click(btn.x, btn.y);
      await page.waitForTimeout(100);
      ok('nothing copied at 100ms (B18)', await page.evaluate(() =>
        navigator.clipboard.readText().then(t => t === 'sentinel', () => false)));
      ok('no notice yet at 100ms', await page.evaluate(() =>
        !document.querySelector('#toast').classList.contains('show')));
      await page.waitForTimeout(450);
      ok('the note text lands after the window', await page.evaluate(() =>
        navigator.clipboard.readText().then(t => t === 'take this text', () => false)));
      ok('Copied notice shows', await page.evaluate(() => {
        const t = document.querySelector('#toast');
        return t.classList.contains('show') && /Copied/.test(t.textContent);
      }));
      ok('the note is still selected — Copy is not destructive', await page.evaluate(() =>
        !!document.querySelector('.note.selected')));
    }
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D12] Notes shrink with the frame they were written in — no overlap (issue #57)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    // Two notes side by side on an 1800-unit frame, wide enough that at this
    // window's LOGICAL_W (~1267) constant-size rendering would slide the first
    // across the second — the reported bug. Homothetic rendering scales width
    // by the same ratio as x, so what was adjacent stays adjacent. 25 W's, not
    // 30: since issue #53 removed the 405 cap, the first note renders at its
    // natural width, and the fixture itself must stay clear of h2 in authored
    // units (≈450 < 500) for "adjacent" to be true at all.
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Homothetic fixture';
      rec.notes = [
        { id: 'h1', text: 'W'.repeat(25), x: 0,   y: 300, rw: 1800, rh: 1000, scale: 1, state: 'active' },
        { id: 'h2', text: 'W'.repeat(25), x: 500, y: 300, rw: 1800, rh: 1000, scale: 1, state: 'active' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const n1 = document.querySelector('[data-id="h1"]');
      const n2 = document.querySelector('[data-id="h2"]');
      const r1 = n1.getBoundingClientRect(), r2 = n2.getBoundingClientRect();
      return { right1: r1.right, left1: r1.left, left2: r2.left, w1: n1.offsetWidth,
               rs: Number(getComputedStyle(document.querySelector('#board'))
                     .getPropertyValue('--rs')) };
    });
    ok('authored side-by-side stays side-by-side', m.right1 <= m.left2 + 0.5,
      JSON.stringify(m));
    // Prove the fixture is the regression case: at constant visual size the
    // first note's right edge would cross the second's left.
    ok('the old constant-size law would have overlapped',
      m.left1 + m.w1 * 1 * m.rs > m.left2, JSON.stringify(m));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D13] A cross-frame grab is visually silent and folds the multiplier (issue #57)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Grab fixture';
      // Authored on a 384-unit phone frame: mult here is ~3.3.
      rec.notes = [{ id: 'g1', text: 'grab', x: 50, y: 380, rw: 384, rh: 846,
                     scale: 1, state: 'active' }];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => {
      const r = document.querySelector('[data-id="g1"]').getBoundingClientRect();
      return { w: r.width, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(before.x, before.y);
    await page.mouse.down();
    await page.mouse.move(before.x + 20, before.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() =>
      document.querySelector('[data-id="g1"]').getBoundingClientRect().width);
    ok('visual width unchanged across the grab (<1px)',
      Math.abs(after - before.w) < 1, before.w + ' -> ' + after);
    // rebaseNote folded the multiplier: scale becomes old·mult, rw the current
    // frame. At 1440x900, LOGICAL_W = (1440-300)/0.9 = 1266.67.
    const lw = (1440 - 300) / 0.9;
    const stored = await page.evaluate(() => new Promise(res => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
        all.onsuccess = () => res(all.result.flatMap(b => b.notes).find(n => n.id === 'g1'));
      };
    }));
    ok('stored scale ≈ old·mult after the grab',
      !!stored && Math.abs(stored.scale - lw / 384) < 0.001, stored && String(stored.scale));
    ok('rw rebased to the current frame',
      !!stored && Math.abs(stored.rw - lw) < 0.01, stored && String(stored.rw));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D14] A folded scale past MAX does not snap at resize grab (issue #57)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Fold fixture';
      // scale 3 on a 900 frame folds to ~4.2 here — legitimately past
      // MAX_SCALE. The gesture clamps widen to include the start value, so a
      // grab must not snap it back to 2.
      rec.notes = [{ id: 'f1', text: 'big', x: 600, y: 300, rw: 900, rh: 1000,
                     scale: 3, state: 'active' }];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    const c = await page.evaluate(() => {
      const r = document.querySelector('[data-id="f1"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
    });
    await page.mouse.click(c.x, c.y);          // select (B22: instant)
    await page.waitForTimeout(120);
    const edge = await page.evaluate(() => {
      const e = document.querySelector('#selection .sel-edge.e');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    ok('selection frame is up', !!edge);
    if (edge) {
      await page.mouse.move(edge.x, edge.y);
      await page.mouse.down();
      await page.mouse.move(edge.x + 1, edge.y);
      await page.mouse.up();
      await page.waitForTimeout(300);
      const w2 = await page.evaluate(() =>
        document.querySelector('[data-id="f1"]').getBoundingClientRect().width);
      ok('1px edge drag does not snap the folded scale (<3px)',
        Math.abs(w2 - c.w) < 3, c.w + ' -> ' + w2);
    }
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D16] Rail categories: To-Do / Idea / Unsorted, drag between, pager (issue #58)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('#pane-cards .pane-cat-head span:first-child')].map(s => s.textContent));
    ok('three category headers in order', heads.length === 3 &&
       heads[0] === 'To-Do Boards' && heads[1] === 'Idea Boards' && heads[2] === 'Unsorted Boards',
       JSON.stringify(heads));

    // A board created from the rail auto-categorizes to Unsorted.
    await page.click('#pane-new');
    await page.waitForTimeout(700);
    ok('new board appears in Unsorted', await page.evaluate(() =>
      document.querySelectorAll('.pane-cat[data-cat="unsorted"] .pane-card').length === 2 &&
      !document.querySelector('.pane-cat[data-cat="todo"] .pane-card') &&
      !document.querySelector('.pane-cat[data-cat="idea"] .pane-card')));

    // Pointer-drag the inactive card onto To-Do.
    const beforeId = await page.evaluate(() => current.id);
    const dragId = await page.evaluate(() =>
      document.querySelector('.pane-cat[data-cat="unsorted"] .pane-card:not(.active)').dataset.id);
    const from = await page.evaluate(() => {
      const r = document.querySelector('.pane-cat[data-cat="unsorted"] .pane-card:not(.active)')
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const to = await page.evaluate(() => {
      const r = document.querySelector('.pane-cat[data-cat="todo"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.waitForTimeout(60);
    ok('To-Do frame highlights mid-drag', await page.evaluate(() =>
      document.querySelector('.pane-cat[data-cat="todo"]').classList.contains('drop-target')));
    ok('drag ghost follows the pointer', await page.evaluate(() =>
      !!document.querySelector('.pane-drag-ghost')));
    await page.mouse.up();
    await page.waitForTimeout(300);
    ok('highlight cleared on release', await page.evaluate(() =>
      !document.querySelector('.drop-target') && !document.querySelector('.pane-drag-ghost')));
    ok('card lands first in To-Do', await page.evaluate((id) => {
      const first = document.querySelector('.pane-cat[data-cat="todo"] .pane-card');
      return !!first && first.dataset.id === id;
    }, dragId));
    ok('IDB record carries category + catStamp', await page.evaluate(async (id) => {
      const rec = await idbGet(id);
      return !!rec && rec.category === 'todo' && typeof rec.catStamp === 'number';
    }, dragId));
    ok('the drag did not switch boards', await page.evaluate(() => current.id) === beforeId);

    // Overflow pages, never scrolls: seed 9 more boards into Unsorted.
    await page.evaluate(async () => {
      for (let i = 0; i < 9; i++) {
        const r = newBoardRecord();
        r.title = 'Seed ' + i;
        r.createdAt = r.updatedAt = Date.now() - (i + 1) * 100000;  // older than the live boards
        await idbPut(r);
      }
    });
    await page.reload();
    await page.waitForTimeout(600);
    ok('categorization survives the reload', await page.evaluate((id) => {
      const first = document.querySelector('.pane-cat[data-cat="todo"] .pane-card');
      return !!first && first.dataset.id === id;
    }, dragId));
    const pg = await page.evaluate(async () => {
      const un = document.querySelector('.pane-cat[data-cat="unsorted"]');
      const pager = un.querySelector('.pane-pager');
      const btns = [...pager.querySelectorAll('.pager-btn')];
      const all = await idbGetAll();
      return {
        visible: !pager.hidden,
        disabled: btns.map(b => b.disabled),
        labels: btns.map(b => b.getAttribute('aria-label')),
        ind: un.querySelector('.pane-cat-pages').textContent,
        onPage: un.querySelectorAll('.pane-card').length,
        total: all.filter(b => b.category !== 'todo' && b.category !== 'idea').length,
        noScroll: un.querySelector('.pane-cat-cards').scrollHeight <=
                  un.querySelector('.pane-cat-cards').clientHeight + 1,
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
    ok('the shown page does not overflow its clip', pg.noScroll);

    // Pager clicks are inert navigation — instant, no 400ms window.
    const clickPager = (lbl) => page.evaluate((l) => {
      document.querySelector('.pane-cat[data-cat="unsorted"] .pager-btn[aria-label="' + l + '"]').click();
    }, lbl);
    const unState = () => page.evaluate(() => {
      const un = document.querySelector('.pane-cat[data-cat="unsorted"]');
      const btn = (l) => un.querySelector('.pager-btn[aria-label="' + l + '"]');
      return { ind: un.querySelector('.pane-cat-pages').textContent,
               first: un.querySelector('.pane-card').dataset.id,
               nextOff: btn('Next page').disabled, lastOff: btn('Last page').disabled };
    });
    const p0 = await unState();
    await clickPager('Next page');
    await page.waitForTimeout(150);
    let s = await unState();
    ok('next turns to page 2', s.ind === '2/' + pages && s.first !== p0.first, s.ind);
    await clickPager('Last page');
    await page.waitForTimeout(150);
    s = await unState();
    ok('last jumps to the end, next/last disable', s.ind === pages + '/' + pages &&
       s.nextOff && s.lastOff, s.ind);
    await clickPager('Previous page');
    await page.waitForTimeout(150);
    s = await unState();
    ok('prev steps back', s.ind === (pages - 1) + '/' + pages, s.ind);
    await clickPager('First page');
    await page.waitForTimeout(150);
    s = await unState();
    ok('first returns to page 1', s.ind === '1/' + pages && s.first === p0.first, s.ind);

    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D17] The wrap cap is one law, on screen and in the PDF (issue #53)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Edge fixture';
      rec.notes = [
        // e1 hits the cap: (900-300)/1 = 600 authored units, on screen and out.
        { id: 'e1', text: 'The quick brown fox jumps over the lazy dog while the '
            + 'cat watches from the window and the dog barks at the mailman who '
            + 'hurries past the gate before the rain starts falling',
          x: 300, y: 300, rw: 900, rh: 1000, scale: 1, state: 'active' },
        // e2 has 300 units to the edge: far too narrow for one line of this.
        { id: 'e2', text: 'WRAPHEAD alpha beta gamma delta epsilon zeta eta theta '
            + 'iota kappa lambda WRAPTAIL',
          x: 600, y: 600, rw: 900, rh: 1000, scale: 1, state: 'active' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    // The invariant B38 asserts: screen wrap width ≡ export wrap width, both
    // (rw − x)/scale in authored units. e1 is cap-bound, so min(natural, cap)
    // is the cap itself on both sides and the two must agree exactly.
    const m = await page.evaluate(() => {
      const note = current.notes.find(n => n.id === 'e1');
      const node = document.querySelector('[data-id="e1"]');
      const box = exportNoteBox(note);
      return { screenW: node.offsetWidth, exportW: box.w,
               cap: (note.rw - note.x) / (note.scale || 1) };
    });
    ok('screen wrap width is the authored-unit cap (±1)',
       Math.abs(m.screenW - m.cap) <= 1, JSON.stringify(m));
    ok('export wrap width agrees with the screen (±1)',
       Math.abs(m.exportW - m.screenW) <= 1, JSON.stringify(m));
    // And in the file itself: the x=600 note cannot fit one Tj line.
    await page.evaluate(() => {
      document.querySelector('#pane-cards .pane-card.active')
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 300 }));
    });
    await page.waitForTimeout(150);
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => [...document.querySelectorAll('#menu button')]
        .find(b => /Export/.test(b.textContent)).click()),
    ]);
    const s = fs.readFileSync(await dl.path()).toString('latin1');
    // First stream in the file = page 1, the board (page 2 re-sets the text
    // at page width, which would fit it on one line and prove nothing).
    const board = /stream\n([\s\S]*?)\nendstream/.exec(s)[1];
    const tjs = board.match(/\([^)]*\) Tj/g) || [];
    const head = tjs.find(t => t.includes('WRAPHEAD'));
    const tail = tjs.find(t => t.includes('WRAPTAIL'));
    ok('the x=600 note spans more than one Tj line',
       !!head && !!tail && head !== tail,
       JSON.stringify({ head, tail }));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== desktop: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
