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
        maxW: getComputedStyle(document.querySelector('#board'))
          .getPropertyValue('--note-max-w').trim(),
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
    ok('note cap still 405px', geo.maxW === '405px', geo.maxW);
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

  await browser.close();
  console.log('\n=== desktop: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
