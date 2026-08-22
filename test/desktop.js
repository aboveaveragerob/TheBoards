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
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
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
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
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
        titleBorderTop: w('#anchor-title').borderTopWidth,
        titleBorderLeft: w('#anchor-title').borderLeftWidth,
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
    // B38 (issue #52): the compartment is bounded by the sheet's own top edge,
    // so its top border is no longer drawn — the other three sides still are.
    ok('title card top is open', geo.titleBorderTop === '0px', geo.titleBorderTop);
    ok('title card is framed on the other three sides',
      geo.titleBorderLeft === '2px', geo.titleBorderLeft);
    // B47 (supersedes B35/B38's gutter inset): both rules run the full width
    // of the sheet, and the band sizes to its tallest zone from a two-line
    // floor — 14 + 2 x 19.5 + 8 + 16.9 + 10 = 88 on this blank board (B54's
    // 16.9 label term).
    ok('band rule runs full width (B47)', geo.ruleL === '0px', geo.ruleL);
    ok('band rule sits at the two-line floor, y=88 (B47/B54)', geo.ruleT === '88px', geo.ruleT);
    // Screen space, so the 8px logical gap arrives scaled — assert the ordering.
    ok('zones clear the card on both sides',
      geo.zoneGap[0] < geo.zoneGap[1] && geo.zoneGap[2] < geo.zoneGap[3],
      JSON.stringify(geo.zoneGap));
    ok('Components and Requirements zones match', geo.comp === geo.req, geo.comp + ' / ' + geo.req);
    // The lot sizes to its rows from a two-row floor (B47, UIUX §3.2): empty,
    // this board draws the same two-row shelf — 34 + 2 x 44 = 122. B37's
    // three-row budget survives only as the ceiling a filled lot can reach.
    ok('empty lot draws the two-row floor, 122px (B47)', geo.lotH === '122px', geo.lotH);
    ok('lot is full-bleed; its content keeps the gutter (UIUX §3.2)', geo.lotL === '0px', geo.lotL);
    // Issue #53 (B39): no predetermined cap — a long sentence wraps only at
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
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
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
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
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
    // by the same ratio as x, so what was adjacent stays adjacent. 21 W's, not
    // 25: the count is calibrated in the face the app speaks, and B50's
    // Montserrat Alternates sets a wider W than system-ui did (~20.3px at
    // 17px), so 25 of them ran to ~508 authored units — overlapping h2 at 500
    // before the law under test was even in play. 21 keeps the fixture clear
    // (≈454 < 500), exactly as 25-not-30 kept it clear when issue #53 removed
    // the 405 cap.
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Homothetic fixture';
      rec.notes = [
        { id: 'h1', text: 'W'.repeat(21), x: 0,   y: 300, rw: 1800, rh: 1000, scale: 1, state: 'active' },
        { id: 'h2', text: 'W'.repeat(21), x: 500, y: 300, rw: 1800, rh: 1000, scale: 1, state: 'active' },
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

  console.log('\n[D13] A cross-frame grab is visually silent and folds the similarity ratio (issue #57, B64)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Grab fixture';
      // Authored on a 384x846 phone frame: k here is min(lw/384, 1000/846)
      // ≈ 1.182 — the height ratio binds (B64).
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
    // rebaseNote folded the similarity ratio (B64): scale becomes old·k,
    // rw/rh the current frame. At 1440x900, LOGICAL_W = (1440-300)/0.9 =
    // 1266.67 and LOGICAL_H = 1000, so k = min(lw/384, 1000/846) ≈ 1.182.
    const lw = (1440 - 300) / 0.9;
    const k = Math.min(lw / 384, 1000 / 846);
    const stored = await page.evaluate(() => new Promise(res => {
      const rq = indexedDB.open('boards-db');
      rq.onsuccess = () => {
        const all = rq.result.transaction('boards', 'readonly').objectStore('boards').getAll();
        all.onsuccess = () => res(all.result.flatMap(b => b.notes).find(n => n.id === 'g1'));
      };
    }));
    ok('stored scale ≈ old·k after the grab',
      !!stored && Math.abs(stored.scale - k) < 0.001, stored && String(stored.scale));
    ok('rw rebased to the current frame',
      !!stored && Math.abs(stored.rw - lw) < 0.01, stored && String(stored.rw));
    ok('rh rebased to the current frame',
      !!stored && stored.rh === 1000, stored && String(stored.rh));
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

  console.log('\n[D16] Rail categories: To-Do / Idea / Note, drag between, pager (issue #58)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('#pane-cards .cat-head span:first-child')].map(s => s.textContent));
    ok('three category headers in order', heads.length === 3 &&
       heads[0] === 'To-Do Boards' && heads[1] === 'Idea Boards' && heads[2] === 'Note Boards',
       JSON.stringify(heads));

    // B67 seeds the first-run board 'todo', so an empty database opens blue on
    // the app's own kind of board instead of defaulting into Note Boards. This
    // is the whole of To-Do at this point in the scenario.
    ok('the first-run board is seeded To-Do and wears the blue ladder (B67)',
      await page.evaluate(async () => {
        const all = await idbGetAll();
        return all.length === 1 && all[0].category === 'todo' &&
          document.getElementById('board').dataset.cat === 'todo' &&
          getComputedStyle(document.getElementById('board')).backgroundColor === 'rgb(2, 8, 18)' &&
          document.querySelectorAll('.board-cat[data-cat="todo"] .pane-card').length === 1;
      }));

    // A board created from a section's own control lands in that section, and
    // the write is explicit now (issue #88): category + catStamp on the record.
    // Two of them, because `newBoardIn` opens what it makes and the drag below
    // needs an inactive card to pick up — the first-run board used to supply
    // one from this section, and since B67 it sits in To-Do instead.
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
    await page.waitForTimeout(700);
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
    await page.waitForTimeout(700);
    ok('new boards appear in Note Boards', await page.evaluate(() =>
      document.querySelectorAll('.board-cat[data-cat="unsorted"] .pane-card').length === 2 &&
      document.querySelectorAll('.board-cat[data-cat="todo"] .pane-card').length === 1 &&
      !document.querySelector('.board-cat[data-cat="idea"] .pane-card')));
    ok('the created record carries category:"unsorted" + catStamp', await page.evaluate(async () => {
      const all = await idbGetAll();
      const rec = all.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      return rec.category === 'unsorted' && typeof rec.catStamp === 'number';
    }));

    // B67 (issue #96): the board's whole ladder rotates with its type. This is
    // the RENDERED pin — test/tokens.js reads the stylesheet's text, and only a
    // real browser can say the cascade actually reaches the page. The control
    // above just made and opened a Note board, so the scene is violet.
    const scene = await page.evaluate(() => {
      const g = e => getComputedStyle(e);
      return {
        cat: document.getElementById('board').dataset.cat,
        deep: g(document.getElementById('board')).backgroundColor,
        rule: g(document.getElementById('band-rule')).backgroundColor,
        card: g(document.getElementById('anchor-title')).backgroundColor,
        band: g(document.getElementById('band-fill')).backgroundImage,
        lot:  g(document.getElementById('lot')).backgroundImage,
        railCard: g(document.querySelector('.board-cat[data-cat="unsorted"] .pane-card')).backgroundImage,
      };
    });
    ok('the open Note board wears the violet ladder, every layer (B67)',
      scene.cat === 'unsorted' && scene.deep === 'rgb(12, 5, 18)' &&
      scene.rule === 'rgb(157, 128, 185)' && scene.card === 'rgb(30, 15, 40)' &&
      scene.band.includes('rgb(109, 91, 131)') && scene.band.includes('rgba(56, 46, 71') &&
      scene.lot.includes('rgb(109, 91, 131)'),
      JSON.stringify(scene));
    ok('its rail card previews the same violet water (B67)',
      scene.railCard.includes('rgb(109, 91, 131)'), scene.railCard);

    // Pointer-drag the inactive card onto To-Do.
    const beforeId = await page.evaluate(() => current.id);
    const dragId = await page.evaluate(() =>
      document.querySelector('.board-cat[data-cat="unsorted"] .pane-card:not(.active)').dataset.id);
    const from = await page.evaluate(() => {
      const r = document.querySelector('.board-cat[data-cat="unsorted"] .pane-card:not(.active)')
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const to = await page.evaluate(() => {
      const r = document.querySelector('.board-cat[data-cat="todo"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.waitForTimeout(60);
    ok('To-Do frame highlights mid-drag', await page.evaluate(() =>
      document.querySelector('.board-cat[data-cat="todo"]').classList.contains('drop-target')));
    ok('drag ghost follows the pointer', await page.evaluate(() =>
      !!document.querySelector('.card-drag-ghost')));
    // The ghost is fixed off document.body, outside its section's token scope,
    // so it has to carry the scope itself or a Note card turns blue in the air.
    ok('the drag ghost keeps its section\'s hue in the air (B67)', await page.evaluate(() => {
      const gh = document.querySelector('.card-drag-ghost');
      const painted = gh.matches('.pane-card, .board-row') ? gh
        : gh.querySelector('.pane-card, .board-row') || gh;
      return gh.dataset.cat === 'unsorted' &&
        getComputedStyle(painted).backgroundImage.includes('rgb(109, 91, 131)');
    }));
    await page.mouse.up();
    await page.waitForTimeout(300);
    ok('highlight cleared on release', await page.evaluate(() =>
      !document.querySelector('.drop-target') && !document.querySelector('.card-drag-ghost')));
    ok('card lands first in To-Do', await page.evaluate((id) => {
      const first = document.querySelector('.board-cat[data-cat="todo"] .pane-card');
      return !!first && first.dataset.id === id;
    }, dragId));
    ok('IDB record carries category + catStamp', await page.evaluate(async (id) => {
      const rec = await idbGet(id);
      return !!rec && rec.category === 'todo' && typeof rec.catStamp === 'number';
    }, dragId));
    ok('the drag did not switch boards', await page.evaluate(() => current.id) === beforeId);

    // B67: the rotation follows a swap, not just a load — and back again. The
    // card just dropped into To-Do, so opening it must repaint the page blue.
    await page.evaluate((id) => swapBoard(id), dragId);
    await page.waitForTimeout(500);
    ok('swapping to the To-Do board rotates the page back to the blue (B67)',
      await page.evaluate(() => {
        const b = document.getElementById('board');
        return b.dataset.cat === 'todo' && getComputedStyle(b).backgroundColor === 'rgb(2, 8, 18)' &&
          getComputedStyle(document.getElementById('band-rule')).backgroundColor === 'rgb(105, 142, 191)';
      }));
    await page.evaluate((id) => swapBoard(id), beforeId);   // leave the state as found
    await page.waitForTimeout(500);
    ok('and back to the violet on the return swap (B67)', await page.evaluate(() => {
      const b = document.getElementById('board');
      return b.dataset.cat === 'unsorted' && getComputedStyle(b).backgroundColor === 'rgb(12, 5, 18)';
    }));

    // Overflow pages, never scrolls: seed 12 more boards into Unsorted, and
    // two into Idea so no section collapses (B68) — a collapsed Idea would
    // hand its slots to the others and could page the overflow away.
    await page.evaluate(async () => {
      for (let i = 0; i < 12; i++) {
        const r = newBoardRecord();
        r.title = 'Seed ' + i;
        r.category = 'unsorted';
        r.createdAt = r.updatedAt = Date.now() - (i + 1) * 100000;  // older than the live boards
        await idbPut(r);
      }
      for (let i = 0; i < 2; i++) {
        const r = newBoardRecord();
        r.title = 'Idea ' + i;
        r.category = 'idea';
        r.catStamp = r.createdAt = r.updatedAt = Date.now() - (i + 20) * 100000;
        await idbPut(r);
      }
    });
    await page.reload();
    await page.waitForTimeout(600);
    ok('categorization survives the reload', await page.evaluate((id) => {
      const first = document.querySelector('.board-cat[data-cat="todo"] .pane-card');
      return !!first && first.dataset.id === id;
    }, dragId));
    const pg = await page.evaluate(async () => {
      const un = document.querySelector('.board-cat[data-cat="unsorted"]');
      const pager = un.querySelector('.cat-pager');
      const btns = [...pager.querySelectorAll('.pager-btn')];
      const all = await idbGetAll();
      return {
        visible: !pager.hidden,
        disabled: btns.map(b => b.disabled),
        labels: btns.map(b => b.getAttribute('aria-label')),
        ind: un.querySelector('.cat-pages').textContent,
        onPage: un.querySelectorAll('.pane-card').length,
        total: all.filter(b => b.category !== 'todo' && b.category !== 'idea').length,
        noScroll: un.querySelector('.cat-cards').scrollHeight <=
                  un.querySelector('.cat-cards').clientHeight + 1,
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
    // The seed is sized to the measured budget, not to a constant: a capacity
    // that swallowed the overflow would make every pager assertion vacuous.
    ok('the seed still overflows into 3+ pages', pages >= 3,
       'pages=' + pages + ' (total=' + pg.total + ' onPage=' + pg.onPage + ')');
    ok('the shown page does not overflow its clip', pg.noScroll);

    // Pager clicks are inert navigation — instant, no 400ms window.
    const clickPager = (lbl) => page.evaluate((l) => {
      document.querySelector('.board-cat[data-cat="unsorted"] .pager-btn[aria-label="' + l + '"]').click();
    }, lbl);
    const unState = () => page.evaluate(() => {
      const un = document.querySelector('.board-cat[data-cat="unsorted"]');
      const btn = (l) => un.querySelector('.pager-btn[aria-label="' + l + '"]');
      return { ind: un.querySelector('.cat-pages').textContent,
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

    // ---- most recently updated first (issue #97, B69) --------------------
    // The rail and the list share one comparator, so this is the same law as
    // test/mobile.js [19]: last touch orders a section, and the order is
    // total — two builds of the same records slice the same page.
    const unSorted = () => page.evaluate(async () => {
      const all = await idbGetAll();
      return all.map(b => (current && b.id === current.id) ? current : b)
                .filter(b => catOf(b) === 'unsorted').sort(catOrder).map(b => b.id);
    });
    const unShown = () => page.evaluate(() =>
      [...document.querySelectorAll('.board-cat[data-cat="unsorted"] .pane-card')]
        .map(c => c.dataset.id));
    const order0 = await unSorted();
    const shown0 = await unShown();
    await page.evaluate(() => renderPane());
    await page.waitForTimeout(200);
    ok('two builds of the same records give the same order',
       order0.length >= 3 && order0.join(',') === (await unSorted()).join(',') &&
       shown0.join(',') === (await unShown()).join(','), order0.join(','));

    // Swap to a card that is on the page and is not already first, then edit
    // the board it opens. The swap alone must NOT reorder anything: leaving a
    // board is not updating it, so swapBoard's flush stamps nothing (B69).
    const leaving = await page.evaluate(() => current.id);
    const stampOf = (id) => page.evaluate((i) => idbGet(i).then(r => r.updatedAt), id);
    const leftStamp = await stampOf(leaving);
    const target = shown0.find(id => id !== leaving && id !== order0[0]);
    ok('a non-first, non-open card is under test', !!target, String(target));
    if (target) {
    await page.click('.pane-card[data-id="' + target + '"]');
    await page.waitForTimeout(800);                     // delayAction 400 + swap 260
    ok('the card opened its board', await page.evaluate(() => current.id) === target);
    ok('the swap did not stamp the board it left — leaving is not updating',
       (await stampOf(leaving)) === leftStamp,
       leftStamp + ' -> ' + (await stampOf(leaving)));
    ok('and nothing reordered', (await unSorted()).join(',') === order0.join(','),
       (await unSorted()).join(',') + ' vs ' + order0.join(','));

    // Page away from the open board's card, then edit it. The order changes
    // underneath; the reader's PAGE does not (B42) — a save renders nothing.
    await clickPager('Next page');
    await page.waitForTimeout(150);
    ok('paged off the active card', await page.evaluate(() =>
      !document.querySelector('.board-cat[data-cat="unsorted"] .pane-card.active')));
    await page.mouse.click(800, 600);                   // capture on empty canvas
    await page.waitForTimeout(500);                     // past B18's window
    await page.keyboard.type('touched');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(300);
    const order1 = await unSorted();
    ok('the edited board is now first in its section', order1[0] === target,
       order1.join(',') + ' (edited ' + target + ')');
    // The rail re-sorts when it is BUILT, not while you type (B69): the card
    // must not jump out from under the pointer mid-edit.
    ok('but the rail on screen has not moved yet',
       (await unShown()).indexOf(target) === -1, (await unShown()).join(','));
    await page.evaluate(() => renderPane());
    await page.waitForTimeout(200);
    ok('and a rebuild keeps the reader on the page they turned to (B42)',
       (await page.evaluate(() =>
         document.querySelector('.board-cat[data-cat="unsorted"] .cat-pages').textContent))
         .startsWith('2/'));
    await clickPager('First page');
    await page.waitForTimeout(150);
    ok('page 1 is where the edited board now is',
       (await unShown())[0] === target, (await unShown()).join(','));
    ok('the boards nobody touched keep their relative order',
       order1.filter(id => id !== target).join(',') ===
       order0.filter(id => id !== target).join(','),
       order1.join(',') + ' vs ' + order0.join(','));

    // B63 under B69: a board created in the section the OPEN board already
    // sits in still lands first — the swap's flush must not outrank it.
    await page.click('.board-cat[data-cat="unsorted"] .cat-add');
    await page.waitForTimeout(800);
    const made = await page.evaluate(() => current.id);
    ok('a board created beside the open one still lands first',
       (await unSorted())[0] === made && (await unShown())[0] === made,
       (await unShown()).join(','));
    }

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
    // The invariant B39 asserts: screen wrap width ≡ export wrap width, both
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

  console.log('\n[D17b] Note text is centred — computed style, and Tm x in the stream (issue #82)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.evaluate(async () => {
      const rec = newBoardRecord();
      rec.title = 'Centre fixture';
      rec.notes = [
        // Cap-bound at (900-300)/1 = 600 authored units; the \n makes
        // CENTERPIN a deliberately short line inside that wide frame. Its
        // trailing spaces must NOT count toward the centring: pre-wrap hangs
        // them on screen, and the export measures the line without them.
        { id: 'c1', text: 'CENTERPIN  \nThe quick brown fox jumps over the lazy '
            + 'dog while the cat watches from the window and the dog barks at '
            + 'the mailman who hurries past the gate before the rain starts',
          x: 300, y: 300, rw: 900, rh: 1000, scale: 1, state: 'active' },
      ];
      await idbPut(rec);
    });
    await page.reload();
    await page.waitForTimeout(600);
    ok('.note-text computes text-align: center', await page.evaluate(() =>
      getComputedStyle(document.querySelector('[data-id="c1"] .note-text')).textAlign === 'center'));
    // Where the stream must put the short line: left content edge + half the
    // slack, in note-local units (the note's cm makes its Tm x box-local).
    // Measured on the trimmed line — the hanging trailing spaces are not text.
    const exp = await page.evaluate(() => {
      const g = EXPORT_GEO;
      const note = current.notes.find(n => n.id === 'c1');
      const box = exportNoteBox(note);
      return { left: g.border + g.notePadX, content: box.content,
               tx: g.border + g.notePadX
                   + (box.content - pdfTextW('CENTERPIN', false, g.noteSize)) / 2 };
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
    // First stream = page 1, the board (page 2 is left-aligned prose by design).
    const board = /stream\n([\s\S]*?)\nendstream/.exec(s)[1];
    const m = /1 0 0 -1 ([\d.]+) [\d.]+ Tm\n\(CENTERPIN *\) Tj/.exec(board);
    ok('the short line has a Tm in page 1', !!m);
    if (m) {
      const tx = parseFloat(m[1]);
      ok('its Tm x is inset from the left content edge (centred, not flushed)',
         tx > exp.left + 50, JSON.stringify({ tx, ...exp }));
      ok('and the inset is the centring formula, exactly (±0.01)',
         Math.abs(tx - exp.tx) <= 0.01, JSON.stringify({ tx, expected: exp.tx }));
    }
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D18] Click-away from an open editor dismisses; the second click creates (issue #54)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await page.mouse.click(800, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('persist me');
    // Click far empty canvas while the editor is open: commit + dismiss only —
    // no ghost, no note, even after the window a buggy path would have used.
    await page.mouse.click(500, 300);
    await page.waitForTimeout(600);
    ok('no note created by the dismissing click', (await noteCount(page)) === 1,
       'count=' + await noteCount(page));
    ok('editor blurred', await page.evaluate(() =>
      !document.activeElement || !document.activeElement.classList.contains('note-text')));
    ok('text persisted', await page.evaluate(() =>
      current.notes.length === 1 && current.notes[0].text === 'persist me'));
    // The SECOND click is the creating one: ghost, then a note after the window.
    await page.mouse.click(500, 300);
    await page.waitForTimeout(80);
    ok('second click draws the ghost', await page.evaluate(() => !!document.querySelector('.tap-ghost')));
    ok('still one note at 80ms', (await noteCount(page)) === 1, 'count=' + await noteCount(page));
    await page.waitForTimeout(450);
    ok('second click created the note', (await noteCount(page)) === 2, 'count=' + await noteCount(page));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D19] Shift-click multi-select: rings, group drag, menu, bulk delete + one Undo (issue #55)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const make = async (x, y, t) => {
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
      await page.keyboard.type(t);
      await page.evaluate(() => document.activeElement.blur());
      await page.waitForTimeout(150);
    };
    await make(500, 200, 'one');
    await make(700, 400, 'two');
    await make(900, 600, 'three');
    const rectOf = (t) => page.evaluate((t) => {
      const n = [...document.querySelectorAll('.note')]
        .find(x => x.querySelector('.note-text').textContent === t);
      const r = n.getBoundingClientRect();
      return { x: r.x, y: r.y, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    }, t);

    // Select one, shift-click two: one member ring, the overlay loses its grip.
    let r1 = await rectOf('one');
    await page.mouse.click(r1.cx, r1.cy);
    await page.waitForTimeout(100);
    let r2 = await rectOf('two');
    await page.keyboard.down('Shift');
    await page.mouse.click(r2.cx, r2.cy);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);
    ok('one .multi-selected ring', await page.evaluate(() =>
      document.querySelectorAll('.note.multi-selected').length === 1));
    ok('the overlay wears .multi', await page.evaluate(() =>
      document.querySelector('#selection').classList.contains('multi')));
    ok('resize handles hidden — resize is single-select only', await page.evaluate(() =>
      getComputedStyle(document.querySelector('#selection .sel-handle.br')).display === 'none' &&
      getComputedStyle(document.querySelector('#selection .sel-edge.e')).display === 'none'));

    // Group drag: one delta moves both members.
    r1 = await rectOf('one'); r2 = await rectOf('two');
    await page.mouse.move(r2.cx, r2.cy);
    await page.mouse.down();
    await page.mouse.move(r2.cx + 60, r2.cy + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const n1 = await rectOf('one'), n2 = await rectOf('two');
    const d1 = { x: n1.x - r1.x, y: n1.y - r1.y }, d2 = { x: n2.x - r2.x, y: n2.y - r2.y };
    ok('both notes moved by the same delta',
       Math.abs(d1.x - d2.x) < 1 && Math.abs(d1.y - d2.y) < 1, JSON.stringify({ d1, d2 }));
    ok('and the delta is the drag (~60px)', d1.x > 45 && d1.x < 75, JSON.stringify(d1));

    // Right-click a MEMBER: the selection's own menu.
    const m1 = await rectOf('one');
    await page.mouse.click(m1.cx, m1.cy, { button: 'right' });
    await page.waitForTimeout(150);
    ok('menu opened on right-click', await page.evaluate(() =>
      document.querySelector('#menu').hidden === false));
    const shape = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')];
      return { labels: b.map(x => x.textContent), danger: b.map(x => x.classList.contains('danger')),
               seps: document.querySelectorAll('#menu .sep').length };
    });
    ok('menu is Complete all then Delete all', shape.labels.length === 2 &&
       /Complete all/.test(shape.labels[0]) && /Delete all/.test(shape.labels[1]),
       JSON.stringify(shape.labels));
    ok('only Delete all is danger, and last',
       shape.danger[0] === false && shape.danger[1] === true, JSON.stringify(shape.danger));
    ok('one separator', shape.seps === 1, String(shape.seps));

    // Delete all → one B18 window, both gone, ONE Undo toast.
    const origTexts = await page.evaluate(() => current.notes.map(n => n.text));
    await page.evaluate(() => {
      [...document.querySelectorAll('#menu button')].find(b => /Delete all/.test(b.textContent)).click();
    });
    await page.waitForTimeout(100);
    ok('nothing deleted at 100ms (B18)', (await noteCount(page)) === 3,
       'count=' + await noteCount(page));
    await page.waitForTimeout(600);
    ok('both selected notes gone after the window', (await noteCount(page)) === 1,
       'count=' + await noteCount(page));
    const toast = await page.evaluate(() => ({
      shown: document.querySelector('#toast').classList.contains('show'),
      msg: document.querySelector('#toast .msg') && document.querySelector('#toast .msg').textContent,
      buttons: document.querySelectorAll('#toast button').length,
    }));
    ok('ONE Undo toast for the batch', toast.shown && toast.msg === 'Deleted' && toast.buttons === 1,
       JSON.stringify(toast));

    // Undo restores both at their original indices.
    await page.evaluate(() => document.querySelector('#toast button').click());
    await page.waitForTimeout(600);
    ok('both restored', (await noteCount(page)) === 3, 'count=' + await noteCount(page));
    ok('at their original indices', await page.evaluate((want) =>
      JSON.stringify(current.notes.map(n => n.text)) === JSON.stringify(want), origTexts),
      JSON.stringify(origTexts));

    // sel-btn actions run on the whole selection: Complete both, Copy both.
    const s1 = await rectOf('one');
    await page.mouse.click(s1.cx, s1.cy);
    await page.waitForTimeout(100);
    const s2 = await rectOf('two');
    await page.keyboard.down('Shift');
    await page.mouse.click(s2.cx, s2.cy);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);
    const btn = await page.evaluate(() => {
      const b = document.querySelector('#selection .sel-btn.sel-complete');
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(btn.x, btn.y);
    await page.waitForTimeout(550);
    ok('Complete with two selected completes both', await page.evaluate(() => {
      const st = t => [...document.querySelectorAll('.note')]
        .find(x => x.querySelector('.note-text').textContent === t).classList.contains('complete');
      return st('one') && st('two') && !st('three');
    }));
    const cbtn = await page.evaluate(() => {
      const b = document.querySelector('#selection .sel-btn.sel-copy');
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(cbtn.x, cbtn.y);
    await page.waitForTimeout(550);
    ok('Copy with two selected joins the texts, primary first', await page.evaluate(() =>
      navigator.clipboard.readText().then(t => t === 'two\none', () => false)));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n[D20] Per-category New board on the rail: head row, pager below, create-in-category (issue #88)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    // Every section holds something, so every section draws its whole grid —
    // head, control, cards, pager — which is what this scenario measures. (An
    // empty one collapses to its head row under B68.) Note Boards is seeded
    // past the budget so the pager row is under test.
    await page.evaluate(async () => {
      const put = async (cat, n, tag) => {
        for (let i = 0; i < n; i++) {
          const r = newBoardRecord();
          r.title = tag + ' ' + i;
          if (cat) { r.category = cat; r.catStamp = Date.now() - (i + 1) * 100000; }
          r.createdAt = r.updatedAt = Date.now() - (i + 1) * 100000;
          await idbPut(r);
        }
      };
      await put('todo', 2, 'To-do');
      await put('idea', 2, 'Idea');
      await put(null, 8, 'Fill');            // no category written: Unsorted by default
    });
    await page.reload();
    await page.waitForTimeout(600);

    ok('the global New board buttons are gone', await page.evaluate(() =>
      !document.querySelector('#new-board') && !document.querySelector('#pane-new')));
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('#pane-cards .cat-head span')].map(s => s.textContent));
    ok('labels read To-Do / Idea / Note Boards',
       heads.join('|') === 'To-Do Boards|Idea Boards|Note Boards', JSON.stringify(heads));

    const geo = await page.evaluate(() =>
      [...document.querySelectorAll('#pane-cards .board-cat')].map(sec => {
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
          addRight: a ? Math.abs(a.right - s.right) : 99,
          headH: h.height, addH: a ? a.height : 0,
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
    ok('the head row is one box: header height = button height',
       geo.every(g => Math.abs(g.headH - g.addH) < 0.5),
       JSON.stringify(geo.map(g => [g.headH, g.addH])));
    ok('the control clears B23\'s 24px floor', geo.every(g => g.addH >= 24),
       JSON.stringify(geo.map(g => g.addH)));
    ok('no header truncates beside its control', geo.every(g => !g.headOverflow),
       JSON.stringify(geo.map(g => g.headOverflow)));
    const paged = geo.filter(g => g.pagerVisible);
    ok('a visible pager is under test', paged.length >= 1, String(paged.length));
    ok('the pager sits below the cards', paged.every(g => g.pagerBelow));
    ok('and centres on its section (±1)', paged.every(g => g.pagerCentre <= 1),
       JSON.stringify(paged.map(g => g.pagerCentre)));
    ok('no section overflows its clip', geo.every(g => g.clip));
    ok('the rail itself does not scroll', await page.evaluate(() => {
      const p = document.querySelector('#pane-cards');
      return p.scrollHeight <= p.clientHeight + 1;
    }));

    // Click To-Do's own control: B18's window, then the swap opens it IN To-Do.
    const before = await page.evaluate(() => current.id);
    await page.click('.board-cat[data-cat="todo"] .cat-add');
    await page.waitForTimeout(80);
    ok('acknowledged inside the window: .cat-add.tapped, no swap yet (B18)',
       await page.evaluate((id) =>
         !!document.querySelector('.cat-add.tapped') && current.id === id, before));
    await page.waitForTimeout(700);                      // delayAction 400 + swap 260
    const rec = await page.evaluate(async () => {
      const all = await idbGetAll();
      const newest = all.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      const first = document.querySelector('.board-cat[data-cat="todo"] .pane-card');
      return { cat: newest.category, stamp: typeof newest.catStamp,
               opened: newest.id === current.id,
               firstInTodo: !!first && first.dataset.id === newest.id };
    });
    ok('the record is written into To-Do, stamped, and open',
       rec.cat === 'todo' && rec.stamp === 'number' && rec.opened, JSON.stringify(rec));
    ok('and its card lands first in To-Do', rec.firstInTodo, JSON.stringify(rec));
    ok('and it is a new board, not the one that was open',
       await page.evaluate(() => current.id) !== before);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- D21. the same handle on desktop, where the anchor menu had no door ---
  console.log('\n[D21] The compartment names its menu on desktop too (issue #94, B65)');
  {
    const { ctx, page, errors } = await newDesktopPage(browser);
    const geo = await page.evaluate(() => {
      const b = document.querySelector('#title-menu');
      const r = b.getBoundingClientRect();
      const card = document.querySelector('#anchor-title').getBoundingClientRect();
      const hit = parseFloat(getComputedStyle(b).getPropertyValue('--hit')) || 0;
      const rs = parseFloat(getComputedStyle(document.querySelector('#board'))
        .getPropertyValue('--rs')) || 1;
      return { shown: getComputedStyle(b).display !== 'none', label: b.textContent,
               r: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right },
               card: { right: card.right, bottom: card.bottom }, hit, rs };
    });
    ok('the handle is drawn on desktop', geo.shown && geo.label === 'Menu',
       JSON.stringify([geo.shown, geo.label]));
    ok('flush right, bisected by the card\'s bottom edge (±1)',
       Math.abs(geo.r.right - geo.card.right) < 1 &&
       Math.abs((geo.r.y + geo.r.h / 2) - geo.card.bottom) < 1,
       JSON.stringify([geo.r.right, geo.card.right, geo.r.y + geo.r.h / 2, geo.card.bottom]));
    // B23's 24px pointer floor, measured in PHYSICAL px — the collar is what
    // makes it hold at a small renderScale, and 0 when the frame already does.
    ok('the hit target clears the 24px desktop floor (B23)',
       geo.r.h + 2 * geo.hit * geo.rs >= 24 && geo.r.w + 2 * geo.hit * geo.rs >= 24,
       JSON.stringify([geo.r.w + 2 * geo.hit * geo.rs, geo.r.h + 2 * geo.hit * geo.rs, geo.rs]));

    // Desktop arms no long-press (issue #4) and right-click routes only notes,
    // so this is the first door the anchor menu has ever had here.
    const before = await noteCount(page);
    await page.mouse.click(geo.r.x + geo.r.w / 2, geo.r.y + geo.r.h / 2);
    await page.waitForTimeout(80);
    ok('acknowledged inside the window: #title-menu.tapped, menu still shut (B18)',
       await page.evaluate(() => !!document.querySelector('#title-menu.tapped') &&
         document.querySelector('#menu').hidden === true));
    await page.waitForTimeout(500);
    const items = await page.evaluate(() =>
      [...document.querySelectorAll('#menu button')].map(b => b.textContent));
    ok('it opens the anchor menu unchanged: Export then All boards',
       items.length === 2 && /Export/.test(items[0]) && /All boards/.test(items[1]),
       JSON.stringify(items));
    ok('and created no note under it', (await noteCount(page)) === before);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);

    // The recognizer owns pointers, so the keyboard is its own path (B65).
    await page.evaluate(() => document.querySelector('#title-menu').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(560);
    ok('Enter on the focused handle opens the same menu',
       await page.evaluate(() => document.querySelector('#menu').hidden === false &&
         document.querySelectorAll('#menu button').length === 2));
    ok('and it opened exactly once', (await noteCount(page)) === before &&
       await page.evaluate(() => document.querySelectorAll('#menu button').length) === 2);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);

    // Right-click is untouched: on a note it is still the note's own menu.
    await page.mouse.click(900, 600);
    await page.waitForTimeout(500);
    await page.keyboard.type('RIGHTCLICKPATH');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    await page.mouse.click(905, 605, { button: 'right' });
    await page.waitForTimeout(200);
    ok('right-click on a note still gives the note menu, untouched',
       await page.evaluate(() =>
         [...document.querySelectorAll('#menu button')].some(b => /Delete/.test(b.textContent))));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // The handle is the first focusable thing inside #board that is neither an
    // editor nor the selection, so its keys must not reach the desktop keyboard
    // grammar underneath: Enter there edits the selection, Delete destroys it.
    await page.mouse.click(905, 605);              // select the note
    await page.waitForTimeout(120);
    await page.evaluate(() => document.querySelector('#title-menu').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    ok('Enter on the handle does not edit the selected note underneath',
       await page.evaluate(() => !document.activeElement ||
         !document.activeElement.classList.contains('note-text')));
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');          // shut the menu Enter opened
    await page.waitForTimeout(400);               // and clear the pairing window
    await page.mouse.click(905, 605);             // re-select: Enter may have eaten it
    await page.waitForTimeout(150);
    ok('a note really is selected for the Delete case',
       await page.evaluate(() => !!selected));
    await page.evaluate(() => document.querySelector('#title-menu').focus());
    const noteBefore = await noteCount(page);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(400);
    ok('Delete on the handle does not destroy the selected note underneath',
       (await noteCount(page)) === noteBefore, String(noteBefore));
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== desktop: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})();
