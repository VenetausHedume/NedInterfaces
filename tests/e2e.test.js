/* Browser tests: every phase-1 interface is driven through its real controls, and the live mark panel is read back.
   Run: node tests/e2e.test.js            (needs Playwright; CDN libraries are served from ../vendor when offline) */
const { chromium } = require('playwright');
const { start, routeCdn } = require('./serve.js');
const PORT = 3220, BASE = `http://localhost:${PORT}/index.html`;
let pass = 0, fail = 0; const fails = [];
const ok = (name, cond, extra) => { cond ? pass++ : (fail++, fails.push(name)); if (!cond || process.argv.includes('-v')) console.log((cond ? 'ok  ' : 'FAIL') + ' ' + name + (cond ? '' : '  -> ' + JSON.stringify(extra))); };

(async () => {
  const srv = await start(PORT);
  const browser = await chromium.launch();

  async function session(opts, fn) {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts could not be loaded|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await routeCdn(page, opts);
    const h = {
      page, errs,
      open: async (ui, sample) => { await page.goto(`${BASE}?ui=${ui}&sample=${sample || 0}`); await page.waitForFunction(() => window.NedLab && document.getElementById('mount').children.length > 0); await page.waitForTimeout(150); },
      score: () => page.getAttribute('#mark', 'data-score'),
      status: () => page.getAttribute('#mark', 'data-status'),
      value: () => page.evaluate(() => NedLab.value),
      reload: async () => { await page.click('#restore'); await page.waitForTimeout(200); },
      clear: async () => { await page.click('#clear'); await page.waitForTimeout(120); },
      type: async (sel, text, nth) => { const l = page.locator(sel).nth(nth || 0); await l.click(); await page.waitForTimeout(180); await page.keyboard.type(text, { delay: 12 }); await page.waitForTimeout(80); },
      wipe: async (sel, nth) => { const l = page.locator(sel).nth(nth || 0); await l.click(); await page.waitForTimeout(150); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.waitForTimeout(60); },
      noOverflow: () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    };
    await fn(h);
    ok(`[${opts.name}] no page errors`, errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }

  /* ───────── desktop, MathLive loaded ───────── */
  await session({ name: 'desktop' }, async (h) => {
    const { page } = h;
    ok('MathLive is loaded', await page.evaluate(() => !!customElements.get('math-field')) || (await h.open('text', 0), await page.evaluate(() => !!customElements.get('math-field'))));

    // 1.1 text
    await h.open('text', 0);
    ok('text: starts unanswered', (await h.value()) === null && (await h.status()) === 'unanswered');
    await h.type('#mount math-field', 'refinery gas');
    ok('text: typed answer saved as latex', /refinery/.test(((await h.value()) || {}).latex || ''), await h.value());
    ok('text: correct -> 1/1', (await h.score()) === '1/1', await h.score());
    await h.reload();
    ok('text: answer survives reload', (await h.score()) === '1/1' && /refinery/.test(await page.evaluate(() => document.querySelector('#mount math-field').value)));
    await h.clear();
    ok('text: clear -> null', (await h.value()) === null);
    await h.type('#mount math-field', 'bitumen');
    ok('text: wrong -> 0/1', (await h.score()) === '0/1', await h.score());
    await h.open('text', 2);
    await h.type('#mount math-field', 'Evaporation happens at any temperature and only at the surface');
    ok('text: two points -> 2/2', (await h.score()) === '2/2', [await h.score(), await h.value()]);
    await h.open('text', 3);
    await h.type('#mount math-field', 'H2SO4');
    ok('text: formula H2SO4 -> 1/1', (await h.score()) === '1/1', [await h.score(), await h.value()]);

    // 1.2 formula
    await h.open('formula', 0);
    ok('formula: three boxes, unit always shown', await page.locator('#mount math-field').count() === 3 && await page.locator('#mount math-field[aria-label=Unit]').isVisible());
    await h.type('#mount math-field[aria-label=Working]', '1200x7.5');
    await h.type('#mount math-field[aria-label=Answer]', '900');
    ok('formula: wrong answer, method mark -> 1/2', (await h.score()) === '1/2', [await h.score(), await h.value()]);
    await h.wipe('#mount math-field[aria-label=Answer]'); await h.type('#mount math-field[aria-label=Answer]', '9000');
    await h.type('#mount math-field[aria-label=Unit]', 'Ns');
    ok('formula: right answer + unit -> 2/2', (await h.score()) === '2/2', [await h.score(), await h.value()]);
    let v = await h.value();
    ok('formula: saves {formula, answer, unit}', v && v.formula && v.answer && v.unit && Object.keys(v).length === 3, v);
    await h.wipe('#mount math-field[aria-label=Unit]'); await h.type('#mount math-field[aria-label=Unit]', 'J');
    ok('formula: wrong unit loses the answer mark -> 1/2', (await h.score()) === '1/2', await h.score());
    await h.reload();
    ok('formula: survives reload', (await h.score()) === '1/2' && (await page.evaluate(() => document.querySelector('#mount math-field[aria-label=Answer]').value)) === '9000');
    await h.clear();
    ok('formula: clear -> null', (await h.value()) === null);
    await h.open('formula', 3);
    await h.type('#mount math-field[aria-label=Answer]', '14+18w');
    ok('formula: expression in any order -> 2/2', (await h.score()) === '2/2', [await h.score(), await h.value()]);

    // 1.3 mcq pick one
    await h.open('mcq', 0);
    await page.click('#mount [data-key=C]');
    ok('mcq: right -> 1/1', (await h.score()) === '1/1' && (await h.value()).choice === 'C');
    await page.click('#mount [data-key=A]');
    ok('mcq: changing answer -> 0/1, only one selected', (await h.score()) === '0/1' && await page.locator('#mount [aria-checked=true]').count() === 1);
    await page.click('#mount [data-key=A]');
    ok('mcq: clicking again unselects -> null', (await h.value()) === null);
    await page.focus('#mount [data-key=C]'); await page.keyboard.press('Enter');
    ok('mcq: keyboard select works', (await h.score()) === '1/1');
    await h.reload();
    ok('mcq: survives reload', (await h.score()) === '1/1' && (await page.getAttribute('#mount [data-key=C]', 'aria-checked')) === 'true');
    // 1.4 pick several
    await h.open('mcq', 1);
    for (const k of ['B', 'D', 'F']) await page.click(`#mount [data-key=${k}]`);
    ok('mcq several: all three -> 2/2', (await h.score()) === '2/2' && JSON.stringify((await h.value()).choices) === '["B","D","F"]', await h.value());
    await page.click('#mount [data-key=A]');
    ok('mcq several: an extra wrong tick costs a mark -> 1/2', (await h.score()) === '1/2');
    await page.click('#mount [data-key=A]'); await page.click('#mount [data-key=F]');
    ok('mcq several: two right -> 1/2', (await h.score()) === '1/2');
    // 1.6 pictures
    await h.open('mcq', 2);
    ok('mcq pictures: four drawings shown', await page.locator('#mount button svg').count() === 4);
    await page.click('#mount [data-key=B]');
    ok('mcq pictures: right -> 1/1', (await h.score()) === '1/1');

    // 1.5 match
    await h.open('match', 0);
    const picks = { 0: 'AND', 1: 'OR', 2: 'NOT', 3: 'NAND', 4: 'NOR' };
    await page.locator('#mount select').nth(0).selectOption('AND');
    ok('match: a used choice disappears from the other rows', !(await page.locator('#mount select').nth(1).locator('option').allTextContents()).includes('AND'));
    for (const i of [1, 2, 3, 4]) await page.locator('#mount select').nth(i).selectOption(picks[i]);
    ok('match: all right -> 4/4', (await h.score()) === '4/4', await h.value());
    await page.locator('#mount select').nth(4).selectOption('');
    await page.locator('#mount select').nth(3).selectOption('NOR');
    ok('match: three right -> 2/4 (scale)', (await h.score()) === '2/4', await h.score());
    await h.reload();
    ok('match: survives reload', (await h.score()) === '2/4' && (await page.locator('#mount select').nth(3).inputValue()) === 'NOR');
    await h.clear();
    ok('match: clear -> null', (await h.value()) === null);

    // 1.7 table
    await h.open('table', 0);
    const cells = { r1c1: 'starch', r1c2: 'maltose', r2c1: 'protein', r3c2: 'fatty acids and glycerol' };
    for (const k in cells) await h.type(`#mount [data-cell=${k}]`, cells[k]);
    ok('table: all cells -> 4/4', (await h.score()) === '4/4', [await h.score(), await h.value()]);
    await h.wipe('#mount [data-cell=r1c2]'); await h.type('#mount [data-cell=r1c2]', 'glucose');
    ok('table: one wrong cell -> 3/4', (await h.score()) === '3/4', await h.score());
    await h.reload();
    ok('table: survives reload', (await h.score()) === '3/4' && /starch/.test(await page.evaluate(() => document.querySelector('#mount [data-cell=r1c1]').value)));
    await h.clear();
    ok('table: clear -> null and boxes empty', (await h.value()) === null && (await page.evaluate(() => document.querySelector('#mount [data-cell=r1c1]').value)) === '');
    await h.open('table', 1);
    for (const [k, t] of [['r1c1', '4'], ['r1c2', '1'], ['r2c1', '8'], ['r2c2', '2']]) await h.type(`#mount [data-cell=${k}]`, t);
    ok('table: trace table marks by row -> 1/2', (await h.score()) === '1/2', await h.score());

    // 1.8 long answer, sorted under two headings
    await h.open('prose', 0);
    ok('prose: two headed columns', await page.locator('#mount [data-side]').count() === 2);
    await h.type('#mount [data-side="0"] math-field', 'More output means more sales');
    await page.click('#mount [data-add="0"]');
    await h.type('#mount [data-side="0"] math-field', 'This gives more revenue', 1);
    await h.type('#mount [data-side="1"] math-field', 'But the price may have to be lower');
    ok('prose: three points under the right headings -> 3/8, provisional', (await h.score()) === '3/8' && (await h.status()) === 'self_check', [await h.score(), await h.status(), await h.value()]);
    ok('prose: saves which heading each point is under', JSON.stringify((await h.value()).sides) === '[0,0,1]', await h.value());
    await page.click('#mount [data-add="1"]');
    await h.type('#mount [data-side="1"] math-field', 'more revenue from sales', 1);
    ok('prose: a "for" point written under "against" earns nothing', (await h.score()) === '3/8', await h.score());
    ok('prose: feedback names the points found and points to add', await page.locator('#mark .fb-good').count() === 3 && /Points you could add/.test(await page.textContent('#mark')));
    await h.reload();
    ok('prose: survives reload with both columns filled', (await h.score()) === '3/8' && await page.locator('#mount [data-side="0"] math-field').count() === 2 && await page.locator('#mount [data-side="1"] math-field').count() === 2);
    await h.open('prose', 1);
    await h.type('#mount math-field', 'bile emulsifies fat');
    await page.click('#mount button:has-text("+ Add point")');
    await h.type('#mount math-field', 'this increases the surface area', 1);
    ok('prose: plain point list still works -> 2/4', (await h.score()) === '2/4', [await h.score(), await h.value()]);

    // 1.10 label
    await h.open('label', 0);
    const labs = ['cell wall', 'nucleus', 'vacuole', 'chloroplast'];
    for (let i = 0; i < 4; i++) await page.fill(`#mount [aria-label="Label ${i + 1}"]`, labs[i]);
    ok('label: all four -> 4/4', (await h.score()) === '4/4', await h.value());
    ok('label: boxes sit inside the figure', await page.evaluate(() => { const st = document.querySelector('#mount > div > div').getBoundingClientRect(); return [...document.querySelectorAll('#mount input')].every(i => { const r = i.getBoundingClientRect(); return r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1; }); }));
    await page.fill('#mount [aria-label="Label 2"]', 'cytoplasm');
    ok('label: one wrong -> 3/4', (await h.score()) === '3/4');
    await h.reload();
    ok('label: survives reload', (await h.score()) === '3/4' && (await page.inputValue('#mount [aria-label="Label 1"]')) === 'cell wall');
    // 1.11 what goes where
    await h.open('place', 0);
    await page.locator('#mount select').nth(0).selectOption('ammeter');
    ok('place: used item removed from the other spot', !(await page.locator('#mount select').nth(1).locator('option').allTextContents()).includes('ammeter'));
    await page.locator('#mount select').nth(1).selectOption('voltmeter');
    ok('place: right -> 2/2', (await h.score()) === '2/2', await h.value());
    await page.locator('#mount select').nth(1).selectOption('thermistor');
    ok('place: one wrong -> 1/2', (await h.score()) === '1/2');

    // 1.13 flowchart blanks
    await h.open('flowfill', 0);
    ok('flowfill: three blanks', await page.locator('#mount select').count() === 3);
    await page.selectOption('#mount [aria-label^="Missing box 1"]', 'Is Number > Largest?');
    await page.selectOption('#mount [aria-label^="Missing box 2"]', 'Largest ← Number');
    await page.selectOption('#mount [aria-label^="Missing box 3"]', 'Is Count = 10?');
    ok('flowfill: all right -> 3/3', (await h.score()) === '3/3', await h.value());
    await page.selectOption('#mount [aria-label^="Missing box 3"]', 'Is Count > 10?');
    ok('flowfill: one wrong -> 2/3', (await h.score()) === '2/3');
    await h.reload();
    ok('flowfill: survives reload', (await h.score()) === '2/3' && (await page.inputValue('#mount [aria-label^="Missing box 1"]')) === 'Is Number > Largest?');
    await h.open('flowfill', 1);
    await page.fill('#mount [aria-label^="Missing box 1"]', 'Is Mark >= 50?');
    await page.fill('#mount [aria-label^="Missing box 2"]', 'OUTPUT "Pass"');
    ok('flowfill: typed answers -> 2/2', (await h.score()) === '2/2', await h.value());

    // 1.12 logic gates: build (A AND B) OR (NOT C) with real clicks on the canvas
    await h.open('logic', 0);
    const box = await page.locator('#mount .konvajs-content').boundingBox();
    const at = async (x, y) => { await page.mouse.click(box.x + x, box.y + y); await page.waitForTimeout(60); };   // one animation frame, as a person would
    for (const g of ['AND', 'NOT', 'OR']) await page.click(`#mount [data-gate=${g}]`);
    for (const y of [70, 150, 290]) { await page.click('#mount [data-tool=input]'); await at(60, y); }
    await page.click('#mount [data-tool=output]'); await at(box.width - 60, 200);
    v = await h.value();
    ok('logic: 3 gates, 3 inputs A B C, 1 output', v.gates.length === 3 && v.inputs.map(i => i.label).join('') === 'ABC' && v.outputs.length === 1, v);
    ok('logic: gates do not land on top of each other', new Set(v.gates.map(g => g.x + ',' + g.y)).size === 3);
    const G = Object.fromEntries(v.gates.map(g => [g.gate, g])), I = Object.fromEntries(v.inputs.map(t => [t.label, t])), Q = v.outputs[0];
    const OUTX = { AND: 33, OR: 40, NOT: 38 };
    const pin = { out: g => [g.x + OUTX[g.gate], g.y], in0: g => [g.x - 40, g.y + (g.gate === 'NOT' ? 0 : -13)], in1: g => [g.x - 40, g.y + 13], tOut: t => [t.x + 16, t.y], tIn: t => [t.x - 16, t.y] };
    const wire = async (a, b) => { await at(a[0], a[1]); await at(b[0], b[1]); await page.waitForTimeout(40); };
    await wire(pin.tOut(I.A), pin.in0(G.AND));
    await wire(pin.tOut(I.B), pin.in1(G.AND));
    await wire(pin.in0(G.NOT), pin.tOut(I.C));                 // input pin first, then the output: either order works
    await wire(pin.out(G.AND), pin.in0(G.OR));
    await wire(pin.out(G.NOT), pin.in1(G.OR));
    ok('logic: partly wired circuit gets part marks', /^[1-5]\/6$/.test(await h.score()), await h.score());
    await wire(pin.out(G.OR), pin.tIn(Q));
    v = await h.value();
    ok('logic: six wires saved', v.wires.length === 6, v.wires);
    ok('logic: correct circuit -> 6/6', (await h.score()) === '6/6', [await h.score(), await page.textContent('#mark')]);
    await wire(pin.tOut(I.C), pin.in0(G.AND));                 // a second wire into an occupied input pin replaces the first
    v = await h.value();
    ok('logic: an input pin holds only one wire', v.wires.length === 6 && v.wires.filter(w => w.to.id === G.AND.id && w.to.pin === 'in0').length === 1, v.wires);
    ok('logic: rewired circuit is no longer full marks', (await h.score()) !== '6/6', await h.score());
    await wire(pin.tOut(I.A), pin.in0(G.AND));
    ok('logic: wired back -> 6/6', (await h.score()) === '6/6', await h.score());
    await h.reload();
    v = await h.value();
    ok('logic: circuit survives reload (same parts, wires, mark)', v && v.gates.length === 3 && v.wires.length === 6 && (await h.score()) === '6/6', [await h.score(), v]);
    await page.click('#mount [data-gate=XOR]');
    v = await h.value();
    ok('logic: after reload new parts get fresh ids', new Set(v.gates.map(g => g.id)).size === 4, v.gates);
    await h.clear();
    ok('logic: clear -> null', (await h.value()) === null);
    await h.open('logic', 1);
    await page.click('#mount [data-gate=AND]');
    const b2 = await page.locator('#mount .konvajs-content').boundingBox(); const at2 = async (x, y) => { await page.mouse.click(b2.x + x, b2.y + y); await page.waitForTimeout(60); };
    for (const y of [60, 140]) { await page.click('#mount [data-tool=input]'); await at2(60, y); }
    await page.click('#mount [data-tool=output]'); await at2(b2.width - 60, 100);
    v = await h.value(); const g = v.gates[0];
    for (const [a, b] of [[[v.inputs[0].x + 16, v.inputs[0].y], [g.x - 40, g.y - 13]], [[v.inputs[1].x + 16, v.inputs[1].y], [g.x - 40, g.y + 13]], [[g.x + 33, g.y], [v.outputs[0].x - 16, v.outputs[0].y]]]) { await at2(a[0], a[1]); await at2(b[0], b[1]); }
    ok('logic: AND where NAND is asked -> 0/3', (await h.score()) === '0/3', await h.score());

    // 1.15 plot points
    await h.open('plot', 0);
    const scr = (x, y) => page.evaluate(([a, b]) => document.getElementById('mount').__nedPlot.screen(a, b), [x, y]);
    const clickAt = async (x, y) => { const p = await scr(x, y); await page.mouse.click(p.x, p.y); };
    for (const p of [[1, 2], [2, 4.2], [3, 5.8], [4, 8]]) await clickAt(p[0], p[1]);
    ok('plot: four of five points -> 1/2', (await h.score()) === '1/2', [await h.score(), await h.value()]);
    await page.fill('#mount [aria-label="x value"]', '5'); await page.fill('#mount [aria-label="y value"]', '10.2'); await page.click('#mount [data-act=addpoint]');
    v = await h.value();
    ok('plot: typed point added, values exact', JSON.stringify(v.points) === '[[1,2],[2,4.2],[3,5.8],[4,8],[5,10.2]]', v.points);
    ok('plot: all five -> 2/2', (await h.score()) === '2/2', await h.score());
    await clickAt(2, 10);
    ok('plot: an extra point loses a mark -> 1/2', (await h.score()) === '1/2', await h.score());
    await page.click('#mount [data-act=delete]');
    ok('plot: delete selected -> back to 2/2', (await h.score()) === '2/2' && (await h.value()).points.length === 5);
    let a = await scr(4, 8), b = await scr(4, 6);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();
    ok('plot: dragging a point moves it', JSON.stringify((await h.value()).points[3]) === '[4,6]', (await h.value()).points);
    await clickAt(1.03, 2.05);
    ok('plot: clicking an existing point does not add a duplicate', (await h.value()).points.length === 5);
    await h.reload();
    ok('plot: survives reload', (await h.value()).points.length === 5 && (await h.score()) === '1/2', await h.score());
    await h.clear();
    ok('plot: clear -> null', (await h.value()) === null);
    // 1.16 line of best fit
    await h.open('plot', 1);
    for (const p of [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 10.2]]) await clickAt(p[0], p[1]);
    await page.click('#mount [data-tool=line]');
    a = await scr(0, 0); b = await scr(5.6, 11.6);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    v = await h.value();
    ok('plot: line drawn by dragging', v.lines.length === 1 && JSON.stringify(v.lines[0].p1) === '[0,0]', v.lines);
    ok('plot: points + good line -> 3/3', (await h.score()) === '3/3', [await h.score(), v.lines]);
    b = await scr(5.6, 11.6); const c = await scr(5.6, 6);
    await page.mouse.move(b.x, b.y); await page.mouse.down(); await page.mouse.move(c.x, c.y, { steps: 4 }); await page.mouse.up();
    ok('plot: dragging the line end to a bad fit -> 2/3', (await h.score()) === '2/3', [await h.score(), (await h.value()).lines]);
    await page.click('#mount [data-tool=line]'); await clickAt(3, 3);
    ok('plot: a click without dragging does not leave a zero-length line', (await h.value()).lines.length === 1);
    // 1.17 sketches with labels
    await h.open('plot', 2);
    ok('plot sketch: only the line tool is offered', await page.locator('#mount [data-tool=point]').count() === 0 && await page.locator('#mount [data-tool=line]').count() === 1);
    const dragLine = async (p, q) => { const s = await scr(p[0], p[1]), e = await scr(q[0], q[1]); await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.mouse.move(e.x, e.y, { steps: 4 }); await page.mouse.up(); };
    await dragLine([0, 6], [10, 6]); await page.fill('#mount [aria-label="Label for the selected line"]', 'A');
    await dragLine([0, 0], [8, 9]); await page.fill('#mount [aria-label="Label for the selected line"]', 'B');
    ok('plot sketch: both lines labelled -> 2/2', (await h.score()) === '2/2', [await h.score(), (await h.value()).lines]);
    await h.reload();
    ok('plot sketch: labels survive reload', (await h.value()).lines.map(l => l.label).join('') === 'AB' && (await h.score()) === '2/2');
    // 1.19 student-chosen scale
    await h.open('plot', 3);
    ok('plot scale: grid hidden until the scale is chosen', !(await page.locator('#mount svg').isVisible()));
    await page.click('#mount [data-act=drawaxes]');
    ok('plot scale: empty form is refused', !(await page.locator('#mount svg').isVisible()) && /Fill in/.test(await page.textContent('#mount [role=alert]')));
    const fillAxes = async (o) => { for (const k in o) await page.fill(`#mount [aria-label="${k}"]`, String(o[k])); };
    await fillAxes({ 'x-axis from': 0, 'x-axis to': 10, 'x-axis step': 0.1, 'y-axis from': 0, 'y-axis to': 40, 'y-axis step': 5 });
    await page.click('#mount [data-act=drawaxes]');
    ok('plot scale: a silly step is refused', /bigger step/.test(await page.textContent('#mount [role=alert]')));
    await fillAxes({ 'x-axis step': 2, 'x-axis title': 'load / N', 'y-axis title': 'extension / mm' });
    await page.click('#mount [data-act=drawaxes]');
    ok('plot scale: grid appears', await page.locator('#mount svg').isVisible());
    for (const p of [[0, 0], [2, 8], [4, 16], [6, 24], [8, 32]]) await clickAt(p[0], p[1]);
    v = await h.value();
    ok('plot scale: axes saved with the titles and "chosen"', v.axes.chosen === true && v.axes.xlabel === 'load / N' && v.axes.xmax === 10, v.axes);
    ok('plot scale: good scale + points -> 3/3', (await h.score()) === '3/3', [await h.score(), await page.textContent('#mark')]);
    await page.click('#mount [data-act=scale]');
    await fillAxes({ 'x-axis to': 40, 'x-axis step': 5, 'y-axis to': 200, 'y-axis step': 20 });
    await page.click('#mount [data-act=drawaxes]');
    ok('plot scale: data squeezed into a corner loses the scale mark -> 2/3', (await h.score()) === '2/3', [await h.score(), await h.value()]);
    await h.reload();
    ok('plot scale: survives reload without asking for the scale again', await page.locator('#mount svg').isVisible() && (await h.score()) === '2/3');

    // 1.18 economics
    await h.open('econ', 0);
    ok('econ: no crossing to pick before a shift', await page.locator('#mount [data-eq]').count() === 0 && await page.locator('#mount [aria-label="New equilibrium"]').isDisabled());
    await page.click('#mount [data-curve=D][data-dir=right]');
    ok('econ: right curve and direction -> 2/3', (await h.score()) === '2/3', await h.value());
    await page.click('#mount [data-eq=D1S]');
    ok('econ: new equilibrium marked -> 3/3', (await h.score()) === '3/3' && (await h.value()).equilibrium === 'D1S');
    ok('econ: P1 and Q1 are drawn', /P1/.test(await page.textContent('#mount svg')) && /Q1/.test(await page.textContent('#mount svg')));
    await page.click('#mount [data-curve=D][data-dir=left]');
    ok('econ: wrong direction -> 2/3', (await h.score()) === '2/3', await h.score());
    await page.click('#mount [data-curve=D][data-dir=none]');
    ok('econ: removing the shift also removes the equilibrium -> null', (await h.value()) === null);
    await page.click('#mount [data-curve=S][data-dir=right]');
    ok('econ: wrong curve -> 0/3', (await h.score()) === '0/3', await h.score());
    await h.open('econ', 1);
    await page.click('#mount [data-curve=S][data-dir=left]');
    await page.selectOption('#mount [aria-label="New equilibrium"]', 'DS1');
    ok('econ: equilibrium chosen from the list -> 3/3', (await h.score()) === '3/3');
    await page.focus('#mount [data-eq=DS1]'); await page.keyboard.press('Enter');
    ok('econ: keyboard toggles the crossing', (await h.value()).equilibrium === null);
    await page.keyboard.press('Enter');
    await h.reload();
    ok('econ: survives reload', (await h.score()) === '3/3' && (await page.getAttribute('#mount [data-curve=S][data-dir=left]', 'aria-pressed')) === 'true');

    // put the lines in order
    await h.open('order', 0);
    ok('order: seven jumbled lines offered', await page.locator('#mount [data-pool]').count() === 7 && (await h.value()) === null);
    for (const id of ['init', 'for', 'add', 'in', 'next', 'out']) await page.click(`#mount [data-pool=${id}] button`);
    ok('order: two lines the wrong way round -> 3/5', (await h.score()) === '3/5', [await h.score(), await h.value()]);
    await page.click('#mount [data-ctl=in] button >> nth=0');                       // move INPUT up above the add line
    ok('order: fixed by moving a line up -> 4/5 (indent still to do)', (await h.score()) === '4/5', [await h.score(), await h.value()]);
    await page.click('#mount [data-ctl=in] button >> nth=3'); await page.click('#mount [data-ctl=add] button >> nth=3');
    ok('order: lines moved inside the loop -> 5/5', (await h.score()) === '5/5' && JSON.stringify((await h.value()).indent) === '{"in":1,"add":1}', await h.value());
    await page.click('#mount [data-pool=bad] button');
    ok('order: adding the unneeded line loses a mark', (await h.score()) === '3/5', await h.score());
    await page.click('#mount [data-ctl=bad] button >> nth=4');
    ok('order: removed again -> 5/5', (await h.score()) === '5/5');
    await page.focus('#mount [data-ctl=out] button >> nth=0'); await page.keyboard.press('Enter');
    ok('order: keyboard move keeps focus on the moved line', await page.evaluate(() => document.activeElement && document.activeElement.closest('[data-ctl]') && document.activeElement.closest('[data-ctl]').dataset.ctl === 'out'));
    await h.reload();
    ok('order: survives reload', (await h.value()).order.length === 6 && await page.locator('#mount li[data-line]').count() === 6);
    await h.open('order', 1);
    for (const id of ['f', 'p', 'd', 'e']) await page.click(`#mount [data-pool=${id}] button`);
    ok('order: sentences in sequence -> 3/3', (await h.score()) === '3/3', await h.value());

    // pseudocode: write, RUN, see output and errors, then marked by test cases
    await h.open('code', 0);
    ok('code: CodeMirror editor and a Run panel', await page.locator('#mount .CodeMirror').count() === 1 && await page.locator('#mount [data-run=go]').count() === 1);
    const writeCode = async (text) => { await page.click('#mount .CodeMirror'); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.evaluate(t => document.querySelector('#mount .CodeMirror').CodeMirror.setValue(t), text); await page.waitForTimeout(80); };
    await page.click('#mount .CodeMirror'); await page.keyboard.type('Total <- 0', { delay: 8 });
    ok('code: typing "<-" becomes the arrow', /Total ← 0/.test((await h.value()).code), await h.value());
    await writeCode('Total ← 0\nFOR i ← 1 TO 3\nINPUT N\nTotal ← Total + N\nOUTPUT Total');
    await page.click('#mount [data-run=go]');
    ok('code: Run reports the missing NEXT with its line', /needs NEXT to close it/.test(await page.textContent('#mount [data-run=output]')), await page.textContent('#mount [data-run=output]'));
    ok('code: a syntax slip still earns feature marks -> 4/5', (await h.score()) === '4/5', await h.score());
    await writeCode('Total ← 0\nFOR i ← 1 TO 3\nINPUT N\nTotal ← Total + N\nNEXT i\nOUTPUT "Total = ", Total');
    await page.click('#mount [data-run=go]');
    ok('code: Run shows the program\'s output for the test inputs', /Total = 15/.test(await page.textContent('#mount [data-run=output]')), await page.textContent('#mount [data-run=output]'));
    ok('code: passes every test case -> 5/5', (await h.score()) === '5/5', [await h.score(), await page.textContent('#mark')]);
    await page.fill('#mount [data-run=inputs]', '1\n2');
    await page.click('#mount [data-run=go]');
    ok('code: Run explains running out of input', /more input than it was given/.test(await page.textContent('#mount [data-run=output]')));
    await writeCode('OUTPUT 15');
    ok('code: a hard-coded answer does not pass -> 1/5', (await h.score()) === '1/5', await h.score());
    await h.reload();
    ok('code: survives reload', (await h.value()).code === 'OUTPUT 15');

    // SQL: the table is shown, the query is run, and marked by its result
    await h.open('sql', 0);
    ok('sql: the table is shown to the student', /Table: Students/.test(await page.textContent('#mount')) && await page.locator('#mount table tr').count() === 6);
    const writeSql = async (text) => { await page.evaluate(t => document.querySelector('#mount .CodeMirror').CodeMirror.setValue(t), text); await page.waitForTimeout(80); };
    await writeSql('SELECT Name FROM Students WHERE Class = 10');
    await page.click('#mount [data-run=go]');
    ok('sql: Run shows the rows returned', /3 rows/.test(await page.textContent('#mount [data-run=output]')) && /Asha/.test(await page.textContent('#mount [data-run=output]')));
    ok('sql: right rows but not ordered -> 3/4', (await h.score()) === '3/4', await h.score());
    await writeSql('select name from students where class = 10 order by name;');
    ok('sql: correct query in lower case -> 4/4', (await h.score()) === '4/4', await h.score());
    await writeSql('SELECT Nme FROM Students');
    await page.click('#mount [data-run=go]');
    ok('sql: Run explains a wrong column name', /no column called "Nme"/.test(await page.textContent('#mount [data-run=output]')));

    // economics: label it yourself
    await h.open('econ', 2);
    ok('econ labelling: the diagram starts unlabelled', (await page.textContent('#mount svg')).includes('?') && !/Price|Quantity/.test(await page.textContent('#mount svg')));
    for (const [k, val] of [['y', 'Price'], ['x', 'Quantity'], ['down', 'D'], ['up', 'S']]) await page.selectOption(`#mount [data-label=${k}]`, val);
    ok('econ labelling: labels alone -> 1/4', (await h.score()) === '1/4' && /Price/.test(await page.textContent('#mount svg')), await h.value());
    await page.click('#mount [data-curve=D][data-dir=left]'); await page.click('#mount [data-eq=D1S]');
    ok('econ labelling: full answer -> 4/4', (await h.score()) === '4/4', await h.value());
    await page.selectOption('#mount [data-label=down]', 'S');
    ok('econ labelling: a wrong label loses the label mark -> 3/4', (await h.score()) === '3/4');
    await h.reload();
    ok('econ labelling: survives reload', (await h.score()) === '3/4' && (await page.inputValue('#mount [data-label=y]')) === 'Price');

    // the science builders and the free flowchart: a saved answer loads back and is marked
    const mountWith = async (ui, n, v) => { await h.open(ui, n); await page.evaluate(([ui, n, v]) => { const m = document.getElementById('mount'); m.innerHTML = ''; const s = Ned.registry[ui].meta.samples[n]; let out = v; const inst = Ned.registry[ui].factory(m, { question: s.question, value: v, onChange: x => { out = x; window.__emitted = x; } }); window.__mk = NedMark.mark(ui, s.answer, v, s.question); window.__fb = NedMark.explain(ui, s.answer, v, window.__mk, s.question); }, [ui, n, v]); await page.waitForTimeout(250); return page.evaluate(() => ({ score: __mk.score + '/' + __mk.max, fb: __fb.length, kids: document.getElementById('mount').children.length })); };
    let r = await mountWith('shells', 0, { nucleus: 'Na', charge: null, shells: [2, 8, 1], labels: [] });
    ok('shells: saved atom loads and scores 2/2', r.score === '2/2' && r.kids > 0 && r.fb > 0, r);
    r = await mountWith('shells', 1, { nucleus: 'O', charge: '2-', shells: [2, 8], labels: [] });
    ok('shells: ion with charge 3/3', r.score === '3/3', r);
    // the science builders driven through their own controls
    const canvas = async () => { const bx = await page.locator('#mount .konvajs-content').boundingBox(); return async (x, y) => { await page.mouse.click(bx.x + x, bx.y + y); await page.waitForTimeout(70); }; };
    await h.open('shells', 0);
    for (let i = 0; i < 3; i++) await page.click('#mount #addShell');
    for (const [i, n] of [[1, 2], [2, 8], [3, 1]]) await page.fill(`#mount [aria-label="Electrons in shell ${i}"]`, String(n));
    ok('shells: built with its controls -> 2/2', (await h.score()) === '2/2', await h.value());
    await page.fill('#mount [aria-label="Electrons in shell 3"]', '2');
    ok('shells: one electron too many -> 1/2', (await h.score()) === '1/2');
    await h.reload();
    ok('shells: survives reload', JSON.stringify((await h.value()).shells) === '[2,8,2]' && (await page.inputValue('#mount [aria-label="Electrons in shell 2"]')) === '8', await h.value());

    await h.open('structure', 0);
    let at3 = await canvas();
    await page.click('#mount [data-el=C]'); await at3(200, 220);
    await at3(200, 220);                                                             // click the carbon again: a second carbon is attached to it
    await page.click('#mount [data-el=H]');
    await at3(200, 220); await at3(200, 220); await at3(262, 220); await at3(262, 220);
    v = await h.value();
    ok('structure: six atoms and five bonds from nine clicks', v.atoms.length === 6 && v.bonds.length === 5, v);
    ok('structure: single C-C bond is not ethene -> 1/3', (await h.score()) === '1/3', await h.score());
    await page.click('#mount [data-tool=bond]'); await at3(231, 220);
    ok('structure: clicking the bond makes it double -> 3/3', (await h.score()) === '3/3', [await h.score(), (await h.value()).bonds]);
    await h.reload();
    v = await h.value();
    ok('structure: survives reload', v.atoms.length === 6 && v.bonds.length === 5 && (await h.score()) === '3/3', v);
    await page.click('#mount [data-el=H]'); await at3(500, 100);
    ok('structure: after reload a new atom gets a fresh id', new Set((await h.value()).atoms.map(a => a.id)).size === 7);

    await h.open('lewis', 0);
    let at4 = await canvas();
    await page.click('#mount [data-el=O]'); await at4(300, 200);
    await page.click('#mount [data-el=H]'); await at4(210, 200); await at4(390, 200);
    await page.click('#mount [data-tool=dot]');
    for (const [x, y] of [[300, 174], [300, 174], [300, 226], [300, 226], [274, 200], [326, 200]]) await at4(x, y);
    ok('lewis: oxygen electrons placed, hydrogens empty -> not full', (await h.score()) !== '3/3', await h.score());
    await page.click('#mount [data-tool=cross]'); await at4(236, 200); await at4(364, 200);
    ok('lewis: water built with its controls -> 3/3', (await h.score()) === '3/3', [await h.score(), await h.value()]);
    await h.reload();
    ok('lewis: survives reload', (await h.value()).atoms.length === 3 && (await h.score()) === '3/3');

    await h.open('circuit', 0);
    for (const c of ['cell', 'switch', 'lamp', 'lamp']) await page.click(`#mount [data-comp=${c}]`);
    let at5 = await canvas();
    v = await h.value();
    ok('circuit: four components, none overlapping', v.components.length === 4 && new Set(v.components.map(c => c.x + ',' + c.y)).size === 4 && v.overall === 'open', v);
    const T = (c, end) => [c.x + (end === 'a' ? -40 : 40), c.y];
    const [cell, sw, l1, l2] = v.components;
    const join = async (p, q) => { await at5(p[0], p[1]); await at5(q[0], q[1]); };
    await join(T(cell, 'b'), T(sw, 'a')); await join(T(sw, 'b'), T(l1, 'a')); await join(T(l1, 'b'), T(l2, 'a'));
    ok('circuit: clicking terminals makes wires (no errors), still open', (await h.value()).wires.length === 3 && (await h.value()).overall === 'open', await h.value());
    await join(T(l2, 'b'), T(cell, 'a'));
    ok('circuit: complete series circuit -> 4/4', (await h.value()).overall === 'series' && (await h.score()) === '4/4', [await h.score(), (await h.value()).overall]);
    await join(T(l1, 'a'), T(l2, 'b'));                                               // a wire straight across the two lamps: now a branch
    ok('circuit: extra branch is no longer a series circuit', (await h.value()).overall === 'parallel' && (await h.score()) !== '4/4', [(await h.value()).overall, await h.score()]);
    await h.reload();
    v = await h.value();
    ok('circuit: survives reload with its wires', v.components.length === 4 && v.wires.length === 5 && v.overall === 'parallel', v);
    r = await mountWith('structure', 0, { atoms: [{ id: 'a1', element: 'C', x: 200, y: 200 }, { id: 'a2', element: 'C', x: 300, y: 200 }, { id: 'a3', element: 'H', x: 150, y: 140 }, { id: 'a4', element: 'H', x: 150, y: 260 }, { id: 'a5', element: 'H', x: 350, y: 140 }, { id: 'a6', element: 'H', x: 350, y: 260 }], bonds: [{ from: 'a1', to: 'a2', order: 2 }, { from: 'a1', to: 'a3', order: 1 }, { from: 'a1', to: 'a4', order: 1 }, { from: 'a2', to: 'a5', order: 1 }, { from: 'a2', to: 'a6', order: 1 }] });
    ok('structure: ethene 3/3', r.score === '3/3' && r.kids > 0, r);
    r = await mountWith('lewis', 0, { atoms: [{ id: 'a1', element: 'O', circle: false, x: 300, y: 200, slots: { top: ['dot', 'dot'], bottom: ['dot', 'dot'], left: ['dot'], right: ['dot'] } }, { id: 'a2', element: 'H', circle: false, x: 210, y: 200, slots: { top: [], bottom: [], left: [], right: ['cross'] } }, { id: 'a3', element: 'H', circle: false, x: 390, y: 200, slots: { top: [], bottom: [], left: ['cross'], right: [] } }] });
    ok('lewis: water 3/3', r.score === '3/3' && r.kids > 0, r);
    const fcv = { nodes: [{ id: 1, type: 'start', text: 'START', x: 300, y: 40 }, { id: 2, type: 'process', text: 'Largest ← 0, Count ← 0', x: 300, y: 120 }, { id: 3, type: 'io', text: 'INPUT Number', x: 300, y: 200 }, { id: 4, type: 'decision', text: 'Is Number > Largest?', x: 300, y: 290 }, { id: 5, type: 'process', text: 'Largest ← Number', x: 520, y: 290 }, { id: 6, type: 'process', text: 'Count ← Count + 1', x: 300, y: 380 }, { id: 7, type: 'decision', text: 'Is Count = 10?', x: 300, y: 470 }, { id: 8, type: 'io', text: 'OUTPUT Largest', x: 300, y: 560 }, { id: 9, type: 'start', text: 'STOP', x: 300, y: 640 }],
      edges: [{ from: 1, to: 2, label: '' }, { from: 2, to: 3, label: '' }, { from: 3, to: 4, label: '' }, { from: 4, to: 5, label: 'Yes' }, { from: 4, to: 6, label: 'No' }, { from: 5, to: 6, label: '' }, { from: 6, to: 7, label: '' }, { from: 7, to: 8, label: 'Yes' }, { from: 7, to: 3, label: 'No' }, { from: 8, to: 9, label: '' }] };
    r = await mountWith('flowchart', 0, fcv);
    ok('flowchart: a free-drawn flowchart is run on test cases -> 6/6', r.score === '6/6' && r.kids > 0, r);
    await page.fill('#mount [data-run=inputs]', '4\n11\n2\n7\n5\n1\n8\n3\n6\n0');
    await page.click('#mount [data-run=go]');
    ok('flowchart: Run button steps through the student\'s own flowchart', (await page.textContent('#mount [data-run=output]')).trim() === '11', await page.textContent('#mount [data-run=output]'));
    await h.open('flowchart', 1);
    ok('flowchart: no Run button on a non-algorithm flowchart (FDE cycle)', (await page.locator('#mount [data-run=go]').count()) === 0);

    // every interface (including the parked ones) still mounts, and every marked sample starts at 0
    const all = await page.evaluate(() => Object.keys(Ned.registry).map(id => [id, (Ned.registry[id].meta.samples || []).map(s => !!s.answer)]));
    let mounted = 0, zero = 0, marked = 0;
    for (const [id, ss] of all) for (let s = 0; s < Math.max(1, ss.length); s++) {
      await page.evaluate(([i, k]) => NedLab.load(i, k), [id, s]); await page.waitForTimeout(80);
      if (await page.evaluate(() => document.getElementById('mount').children.length > 0)) mounted++;
      if (ss[s]) { marked++; if (/^0\//.test(await h.score() || '')) zero++; }
    }
    ok(`all ${all.length} interfaces mount (${mounted} samples)`, mounted === all.reduce((n, x) => n + Math.max(1, x[1].length), 0));
    ok(`all ${marked} marked samples start at 0`, zero === marked, [zero, marked]);
  });

  /* ───────── MathLive missing: plain boxes must still work ───────── */
  await session({ name: 'no MathLive', noMath: true }, async (h) => {
    const { page } = h;
    await h.open('text', 0);
    ok('fallback: plain input shown', await page.locator('#mount input, #mount textarea').count() === 1 && await page.locator('#mount math-field').count() === 0);
    await page.fill('#mount input', 'refinery gas');
    ok('fallback text -> 1/1', (await h.score()) === '1/1', await h.value());
    await h.open('formula', 1);
    await page.fill('#mount [aria-label=Answer]', '1.5 x 10^8'); await page.fill('#mount [aria-label=Unit]', 'J');
    ok('fallback formula -> 2/2', (await h.score()) === '2/2', await h.value());
    await h.open('table', 1);
    for (const [k, t] of [['r1c1', '4'], ['r1c2', '1'], ['r2c1', '7'], ['r2c2', '2']]) await page.fill(`#mount [data-cell=${k}]`, t);
    ok('fallback table -> 2/2', (await h.score()) === '2/2', await h.value());
    await h.open('prose', 1);
    await page.fill('#mount textarea', 'bile emulsifies fat');
    ok('fallback prose -> 1/4', (await h.score()) === '1/4', await h.value());
  });

  /* ───────── phone width ───────── */
  await session({ name: 'phone', viewport: { width: 375, height: 800 } }, async (h) => {
    const { page } = h;
    for (const [ui, n] of [['text', 2], ['formula', 0], ['mcq', 1], ['mcq', 2], ['match', 0], ['table', 0], ['prose', 0], ['label', 0], ['place', 0], ['logic', 0], ['flowfill', 0], ['plot', 1], ['plot', 3], ['econ', 0], ['econ', 2], ['order', 0], ['code', 0], ['sql', 0]]) {
      await h.open(ui, n);
      ok(`phone: ${ui}/${n} does not make the page scroll sideways`, await h.noOverflow(), await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
    }
    await h.open('label', 0);
    ok('phone: label boxes move into a list under the figure', await page.evaluate(() => { const st = document.querySelector('#mount > div > div').getBoundingClientRect(); return [...document.querySelectorAll('#mount input')].every(i => i.getBoundingClientRect().top >= st.bottom - 1); }));
    for (let i = 0; i < 4; i++) await page.fill(`#mount [aria-label="Label ${i + 1}"]`, ['cell wall', 'nucleus', 'vacuole', 'chloroplast'][i]);
    ok('phone: label -> 4/4', (await h.score()) === '4/4');
    await h.open('plot', 0);
    await page.locator('#mount svg').scrollIntoViewIfNeeded();
    const p = await page.evaluate(() => document.getElementById('mount').__nedPlot.screen(3, 5.8));
    await page.mouse.click(p.x, p.y);
    ok('phone: plot click lands on the right data point', JSON.stringify((await h.value()).points) === '[[3,5.8]]', await h.value());
    await h.open('econ', 0);
    await page.click('#mount [data-curve=D][data-dir=right]'); await page.click('#mount [data-eq=D1S]');
    ok('phone: econ -> 3/3', (await h.score()) === '3/3');
  });

  await browser.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed` + (fail ? '\nFAILED: ' + fails.join(' | ') : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
