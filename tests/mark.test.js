/* Marking rules. Run: node tests/mark.test.js */
const M = require('../marking/mark.js');
let pass = 0, fail = 0;
const t = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok || process.argv[2] === '-v') console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + (ok ? '' : `: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)); };
const sc = (ui, a, v, marks, o) => M.mark(ui, a, v, { marks }, o).score;

// ── LaTeX from MathLive ──
t('latex space', M.latexToText('refinery\\;gas'), 'refinery gas');
t('latex frac', M.latexToText('\\frac{1}{2}mv^2'), '1/2mv^2');
t('latex nested frac', M.latexToText('\\frac{x+1}{2}'), '(x+1)/2');
t('latex subscript', M.latexToText('H_2SO_4'), 'H2SO4');
t('latex subscript braces', M.latexToText('C_{2}H_{5}OH'), 'C2H5OH');
t('latex sci', M.latexToText('1.5\\times10^{8}\\;\\text{J}'), '1.5×10^8 J');
t('latex degree', M.latexToText('45^{\\circ}'), '45°');
t('latex left/right', M.latexToText('\\left(x+1\\right)^{2}'), '(x+1)^2');
t('latex arrow', M.latexToText('2H_2+O_2\\rightarrow2H_2O'), '2H2+O2→2H2O');
t('plain passes through', M.latexToText('plain text 12'), 'plain text 12');
t('null', M.latexToText(null), '');

// ── short text ──
const gas = { points: [{ alts: ['refinery gas'] }], need: 1 };
t('text latex right', sc('text', gas, { latex: 'refinery\\;gas' }, 1), 1);
t('text plain right', sc('text', gas, { text: 'Refinery gas' }, 1), 1);
t('text wrong', sc('text', gas, { latex: 'bitumen' }, 1), 0);
t('text half the words', sc('text', gas, { latex: 'gas' }, 1), 0);
t('text typo', sc('text', gas, { latex: 'refinary gas' }, 1), 1);
t('text null', M.mark('text', gas, null, { marks: 1 }).status, 'unanswered');
t('text empty latex', M.mark('text', gas, { latex: '  ' }, { marks: 1 }).status, 'unanswered');
const list = { points: [{ alts: ['condensation', 'freezing', 'melting', 'sublimation'] }], need: 1 };
t('one of list', sc('text', list, { latex: 'Melting' }, 1), 1);
t('not in list', sc('text', list, { latex: 'boiling' }, 1), 0);
const evap = { points: [{ alts: ['evaporation takes place at any temperature', 'boiling occurs at a fixed temperature'] }, { alts: ['evaporation takes place at the surface', 'boiling occurs throughout the liquid'] }, { alts: ['no bubbles in evaporation', 'bubbles in boiling'], require: ['bubbles'] }], need: 2 };
t('two points', sc('text', evap, { latex: 'Evaporation\\;happens\\;at\\;any\\;temperature.\\;It\\;only\\;happens\\;at\\;the\\;surface.' }, 2), 2);
t('one point', sc('text', evap, { latex: 'evaporation is at the surface' }, 2), 1);
t('three points capped', sc('text', evap, 'evaporation at any temperature, at the surface, and no bubbles', 2), 2);
t('unsure status', M.mark('text', evap, 'evaporation is at the surface', { marks: 2 }).status, 'unsure');
t('formula answer H2SO4', sc('text', { points: [{ alts: ['H2SO4'] }], need: 1 }, { latex: 'H_2SO_4' }, 1), 1);
t('formula wrong H2SO3', sc('text', { points: [{ alts: ['H2SO4'] }], need: 1 }, { latex: 'H_2SO_3' }, 1), 0);
t('single letter answer', sc('text', { points: [{ alts: ['A'] }], need: 1 }, { latex: 'A' }, 1), 1);
t('single letter not inside a word', sc('text', { points: [{ alts: ['A'] }], need: 1 }, { latex: 'B\\;and\\;C' }, 1), 0);
t('pH', sc('text', { points: [{ alts: ['pH'] }], need: 1 }, 'the pH', 1), 1);
// require / reject
const scale = { points: [{ alts: ['economies of scale'], require: ['economies of scale'], reject: ['diseconomies'] }], need: 1 };
t('require ok', sc('text', scale, 'it gains economies of scale', 1), 1);
t('reject blocks', sc('text', scale, 'it suffers diseconomies of scale', 1), 0);
t('require any-of', sc('text', { points: [{ alts: ['faster digestion'], require: [['faster', 'quicker']] }], need: 1 }, 'quicker digestion', 1), 1);
t('stems agree', [M.tokens('wages')[0] === M.tokens('wage')[0], M.tokens('gases')[0] === M.tokens('gas')[0], M.tokens('faster')[0] === M.tokens('fast')[0], M.tokens('glasses')[0] === M.tokens('glass')[0], M.tokens('boxes')[0] === M.tokens('box')[0]], [true, true, true, true, true]);
// synonyms
t('synonym general', sc('text', { points: [{ alts: ['higher wages'] }], need: 1 }, 'better pay that is higher', 1), 1);
t('synonym custom', sc('text', { points: [{ alts: ['alveoli'] }], need: 1, synonyms: { alveoli: ['air sacs'] } }, 'the air sacs', 1), 1);
t('no synonym, no mark', sc('text', { points: [{ alts: ['alveoli'] }], need: 1 }, 'the air sacs', 1), 0);
// split: excluded points
t('exclude used point', sc('text', { points: [{ alts: ['light'] }, { alts: ['pressure'] }], need: 1 }, 'light', 1, { exclude: [0] }), 0);

// ── numbers ──
const mom = { final: [{ value: '9000', unit: 'kg m / s', units: ['kg m / s', 'N s'], abs: true }], method: ['1200 × 7.5'] };
t('num exact', sc('formula', mom, { answer: '9000', unit: 'kg\\;m/s' }, 2), 2);
t('num alt unit', sc('formula', mom, { answer: '9000', unit: 'Ns' }, 2), 2);
t('num negative allowed', sc('formula', mom, { answer: '-9000' }, 2), 2);
t('num no unit', sc('formula', mom, { answer: '9000' }, 2), 2);
t('num sci latex', sc('formula', mom, { answer: '9.0\\times10^{3}' }, 2), 2);
t('num wrong + method', sc('formula', mom, { answer: '900', formula: '1200\\times7.5' }, 2), 1);
t('num wrong no method', sc('formula', mom, { answer: '900' }, 2), 0);
t('num wrong unit', sc('formula', mom, { answer: '9000', unit: 'J' }, 2), 1);
t('num only working', sc('formula', mom, { formula: '1200 x 7.5' }, 2), 1);
t('num thousands', sc('formula', { final: [{ value: '25 000', unit: 'N' }] }, { answer: '25,000', unit: 'N' }, 2), 2);
t('num kN vs N', sc('formula', { final: [{ value: '25 000', unit: 'N' }] }, { answer: '25', unit: 'kN' }, 2), 2);
t('num N vs kN', sc('formula', { final: [{ value: '18', unit: 'kN' }] }, { answer: '18000', unit: 'N' }, 2), 2);
t('num 10^8 from pdf', sc('formula', { final: [{ value: '1.5 × 10 8', unit: 'J' }] }, { answer: '1.5\\times10^8', unit: 'J' }, 2), 2);
t('num e-notation', sc('formula', { final: [{ value: '1.5 × 10^8', unit: 'J' }] }, { answer: '1.5e8' }, 2), 2);
t('num wrong power', sc('formula', { final: [{ value: '1.5 × 10^8', unit: 'J' }] }, { answer: '1.5\\times10^{7}' }, 2), 0);
t('num rounding 3sf', sc('formula', { final: [{ value: '0.0508' }] }, { answer: '0.051' }, 2), 2);
t('num 1sf not enough', sc('formula', { final: [{ value: '0.0508' }] }, { answer: '0.05' }, 2), 0);
t('num range in', sc('formula', { final: [{ lo: '11.40', hi: '11.41' }] }, { answer: '11.405' }, 2), 2);
t('num range out', sc('formula', { final: [{ value: '11.4' }, { lo: '11.40', hi: '11.41' }] }, { answer: '11.5' }, 2), 0);
t('num fraction latex', sc('formula', { final: [{ value: '0.75' }] }, { answer: '\\frac{3}{4}' }, 1), 1);
t('num fraction text', sc('formula', { final: [{ value: '0.75' }] }, { answer: '3/4' }, 1), 1);
t('num percent', sc('formula', { final: [{ value: '22', unit: '%' }] }, { answer: '22\\%' }, 2), 2);
t('num y=4', sc('formula', { final: [{ value: '4' }] }, { answer: 'y=4' }, 3), 3);
t('num money', sc('formula', { final: [{ value: '1050' }] }, { answer: '\\$1050' }, 3), 3);
t('expr same', sc('formula', { final: [{ expr: '18w + 14' }] }, { answer: '18w+14' }, 2), 2);
t('expr reordered', sc('formula', { final: [{ expr: '18w + 14' }] }, { answer: '14+18w' }, 2), 2);
t('expr wrong', sc('formula', { final: [{ expr: '18w + 14' }] }, { answer: '18w+12' }, 2), 0);
t('expr factorised', sc('formula', { final: [{ expr: '5c(3c−1)' }] }, { answer: '5c\\left(3c-1\\right)' }, 2), 2);
t('num blank', M.mark('formula', mom, { answer: ' ' }, { marks: 2 }).status, 'unanswered');
t('num words', sc('formula', mom, { answer: 'nine thousand' }, 2), 0);

// ── mcq ──
t('mcq right', sc('mcq', { key: 'C' }, { choice: 'C' }, 1), 1);
t('mcq wrong', sc('mcq', { key: 'C' }, { choice: 'A' }, 1), 0);
t('mcq lower case', sc('mcq', { key: 'C' }, { choice: 'c' }, 1), 1);
const tick = { keys: ['B', 'D', 'F'], scale: { 3: 2, 2: 1 } };
t('multi all', sc('mcq', tick, { choices: ['B', 'D', 'F'] }, 2), 2);
t('multi two', sc('mcq', tick, { choices: ['B', 'D'] }, 2), 1);
t('multi all + one wrong', sc('mcq', tick, { choices: ['B', 'D', 'F', 'A'] }, 2), 1);
t('multi tick everything', sc('mcq', tick, { choices: ['A', 'B', 'C', 'D', 'E', 'F'] }, 2), 0);
t('multi no scale', sc('mcq', { keys: ['A', 'B'] }, { choices: ['A', 'B'] }, 2), 2);
t('multi no scale one wrong', sc('mcq', { keys: ['A', 'B'] }, { choices: ['A', 'C'] }, 2), 0);
t('multi none', M.mark('mcq', tick, { choices: [] }, { marks: 2 }).status, 'unanswered');

// ── match ──
const gates = { pairs: { g1: 'AND', g2: 'OR', g3: 'NOT', g4: 'NAND', g5: 'NOR' }, scale: { 5: 4, 4: 3, 3: 2, 2: 1 } };
t('match all', sc('match', gates, { pairs: { g1: 'AND', g2: 'OR', g3: 'NOT', g4: 'NAND', g5: 'NOR' } }, 4), 4);
t('match three', sc('match', gates, { pairs: { g1: 'AND', g2: 'OR', g3: 'NOT', g4: 'NOR', g5: 'NAND' } }, 4), 2);
t('match one', sc('match', gates, { pairs: { g1: 'AND' } }, 4), 0);
t('match default 1 each', sc('match', { pairs: { a: '3', b: '1', c: '2' } }, { pairs: { a: '3', b: '2', c: '1' } }, 3), 1);

// ── table ──
const enz = { cells: { r1c1: { alts: ['starch'] }, r1c2: { alts: ['maltose', 'sugar'] }, r2c1: { alts: ['protein'] }, r3c2: { alts: ['fatty acids and glycerol'], require: ['fatty', 'glycerol'] } } };
t('table all', sc('table', enz, { cells: { r1c1: 'starch', r1c2: 'maltose', r2c1: 'proteins', r3c2: 'fatty\\;acids\\;and\\;glycerol' } }, 4), 4);
t('table two', sc('table', enz, { cells: { r1c1: 'starch', r1c2: 'glucose', r2c1: 'protein' } }, 4), 2);
t('table half answer cell', sc('table', enz, { cells: { r3c2: 'fatty acids' } }, 4), 0);
const trace = { cells: { r1c1: 4, r1c2: 1, r2c1: 7, r2c2: 2 }, scheme: 'row' };
t('trace both rows', sc('table', trace, { cells: { r1c1: '4', r1c2: '1', r2c1: '7', r2c2: '2' } }, 2), 2);
t('trace one row', sc('table', trace, { cells: { r1c1: '4', r1c2: '1', r2c1: '8', r2c2: '2' } }, 2), 1);
t('trace 4.0 equals 4', sc('table', trace, { cells: { r1c1: '4.0', r1c2: '1', r2c1: '7', r2c2: '2' } }, 2), 2);
t('trace 14 is not 4', sc('table', trace, { cells: { r1c1: '14', r1c2: '1' } }, 2), 0);
t('table numeric cell with unit', sc('table', { cells: { r1c1: { final: [{ value: '2.5', unit: 'V' }] } } }, { cells: { r1c1: '2.5\\;V' } }, 1), 1);

// ── long answer ──
const profit = { points: [
  { alts: ['more sales'], require: [['demand', 'sales', 'sell']] }, { alts: ['more revenue'], require: ['revenue'] },
  { alts: ['economies of scale'], require: ['economies of scale'], reject: ['diseconomies'] }, { alts: ['lower average costs'], require: ['average'], reject: ['diseconomies'] }, { alts: ['profit margin rises'] },
  { alts: ['lower price'], require: ['price'] }, { alts: ['demand inelastic so revenue falls'], require: ['inelastic'] }, { alts: ['diseconomies of scale'], require: ['diseconomies'] },
  { alts: ['higher average cost'], require: ['average', ['rise', 'higher', 'increase']] }, { alts: ['costs rise more than revenue'] }],
  groups: [{ title: 'for', max: 5, points: [0, 1, 2, 3, 4] }, { title: 'against', max: 5, points: [5, 6, 7, 8, 9] }] };
t('prose three boxes', sc('prose', profit, { points: ['More output means more sales', 'This gives more revenue', 'But the price may have to be lower'] }, 8), 3);
t('prose same point twice', sc('prose', profit, { points: ['more revenue', 'revenue goes up, more revenue'] }, 8), 1);
t('prose one box holds two points -> one mark', sc('prose', profit, { points: ['more sales and more revenue'] }, 8), 1);
t('prose side cap', sc('prose', profit, { points: ['more sales', 'more revenue', 'economies of scale', 'lower average costs', 'profit margin rises', 'sales rise again'] }, 8), 5);
t('prose both sides capped at max', sc('prose', profit, { points: ['more sales', 'more revenue', 'economies of scale', 'lower average costs', 'profit margin rises', 'lower price', 'demand is inelastic so revenue falls', 'diseconomies of scale', 'higher average cost'] }, 8), 8);
t('prose provisional', M.mark('prose', profit, { points: ['more sales'] }, { marks: 8 }).status, 'self_check');
t('prose empty', M.mark('prose', profit, { points: ['  '] }, { marks: 8 }).status, 'unanswered');
t('prose conclusion counted', sc('prose', profit, { points: ['more sales'], conclusion: 'overall price may be lower' }, 8), 2);

// ── label / place / flowfill ──
const cell = { labels: { wall: { alts: ['cell wall'] }, nucleus: { alts: ['nucleus'] } } };
t('label both', sc('label', cell, { labels: { wall: 'Cell wall', nucleus: 'nucleus' } }, 2), 2);
t('label typo in a long word accepted', sc('label', cell, { labels: { nucleus: 'nucleas' } }, 2), 1);
t('label typo in a short word not accepted', sc('label', cell, { labels: { wall: 'cell wal' } }, 2), 0);
t('label swapped', sc('label', cell, { labels: { wall: 'nucleus', nucleus: 'cell wall' } }, 2), 0);
t('label membrane is not wall', sc('label', cell, { labels: { wall: 'cell membrane' } }, 2), 0);
const meters = { spots: { series: { exact: true, alts: ['ammeter'] }, parallel: { exact: true, alts: ['voltmeter'] } } };
t('place right', sc('place', meters, { spots: { series: 'ammeter', parallel: 'voltmeter' } }, 2), 2);
t('place swapped', sc('place', meters, { spots: { series: 'voltmeter', parallel: 'ammeter' } }, 2), 0);
const ff = { boxes: { n4: { exact: true, alts: ['Is Number > Largest?'] }, n5: { exact: true, alts: ['Largest ← Number'] } } };
t('flow bank right', sc('flowfill', ff, { boxes: { n4: 'Is Number > Largest?', n5: 'Largest ← Number' } }, 2), 2);
t('flow bank wrong', sc('flowfill', ff, { boxes: { n4: 'Is Number < Largest?', n5: 'Largest ← Number' } }, 2), 1);
const ft = { boxes: { c: { alts: ['Mark >= 50', 'Mark > 49'], require: ['mark', '50'] }, d: { alts: ['OUTPUT Pass'], require: ['pass'] } } };
t('flow typed right', sc('flowfill', ft, { boxes: { c: 'Is Mark >= 50 ?', d: 'output "Pass"' } }, 2), 2);
t('flow typed wrong number', sc('flowfill', ft, { boxes: { c: 'Mark >= 40', d: 'OUTPUT Fail' } }, 2), 0);

// ── logic ──
const W = (a, ap, b, bp) => ({ from: { id: a, pin: ap }, to: { id: b, pin: bp } });
const ins = [{ id: 't1', label: 'A' }, { id: 't2', label: 'B' }, { id: 't3', label: 'C' }], out = [{ id: 't4', label: 'Q' }];
const full = { gates: [{ id: 'g1', gate: 'AND' }, { id: 'g2', gate: 'NOT' }, { id: 'g3', gate: 'OR' }], inputs: ins, outputs: out,
  wires: [W('t1', 'out', 'g1', 'in0'), W('t2', 'out', 'g1', 'in1'), W('t3', 'out', 'g2', 'in0'), W('g1', 'out', 'g3', 'in0'), W('g2', 'out', 'g3', 'in1'), W('g3', 'out', 't4', 'in')] };
const E3 = { expr: '(A AND B) OR (NOT C)', output: 'Q' };
t('logic exact', sc('logic', E3, full, 6), 6);
t('logic inputs swapped on AND still right', sc('logic', E3, Object.assign({}, full, { wires: [W('t2', 'out', 'g1', 'in0'), W('t1', 'out', 'g1', 'in1')].concat(full.wires.slice(2)) }), 6), 6);
t('logic equivalent circuit (De Morgan)', sc('logic', { expr: 'A NAND B' }, { gates: [{ id: 'g1', gate: 'NOT' }, { id: 'g2', gate: 'NOT' }, { id: 'g3', gate: 'OR' }], inputs: ins.slice(0, 2), outputs: out,
  wires: [W('t1', 'out', 'g1', 'in0'), W('t2', 'out', 'g2', 'in0'), W('g1', 'out', 'g3', 'in0'), W('g2', 'out', 'g3', 'in1'), W('g3', 'out', 't4', 'in')] }, 3), 3);
t('logic wrong last gate: partial', sc('logic', E3, Object.assign({}, full, { gates: [{ id: 'g1', gate: 'AND' }, { id: 'g2', gate: 'NOT' }, { id: 'g3', gate: 'AND' }] }), 6), 4);
t('logic output not wired: partial', sc('logic', E3, Object.assign({}, full, { wires: full.wires.slice(0, 5) }), 6), 5);
t('logic nothing wired', sc('logic', E3, Object.assign({}, full, { wires: [] }), 6), 0);
t('logic single NAND', sc('logic', { expr: 'A NAND B' }, { gates: [{ id: 'g1', gate: 'NAND' }], inputs: ins.slice(0, 2), outputs: out, wires: [W('t1', 'out', 'g1', 'in0'), W('t2', 'out', 'g1', 'in1'), W('g1', 'out', 't4', 'in')] }, 3), 3);
t('logic AND instead of NAND', sc('logic', { expr: 'A NAND B' }, { gates: [{ id: 'g1', gate: 'AND' }], inputs: ins.slice(0, 2), outputs: out, wires: [W('t1', 'out', 'g1', 'in0'), W('t2', 'out', 'g1', 'in1'), W('g1', 'out', 't4', 'in')] }, 3), 0);
t('logic feedback loop does not hang', sc('logic', { expr: 'A AND B' }, { gates: [{ id: 'g1', gate: 'AND' }, { id: 'g2', gate: 'NOT' }], inputs: ins.slice(0, 2), outputs: out, wires: [W('g2', 'out', 'g1', 'in0'), W('g1', 'out', 'g2', 'in0'), W('g1', 'out', 't4', 'in')] }, 2), 0);
t('logic empty', M.mark('logic', E3, { gates: [], inputs: [], outputs: [], wires: [] }, { marks: 6 }).status, 'unanswered');
t('expr parser symbols', JSON.stringify(M.parseExpr('A.B + ¬C')), JSON.stringify(M.parseExpr('(A AND B) OR NOT C')));

// ── plot ──
const AX = { xmin: 0, xmax: 6, xstep: 1, ymin: 0, ymax: 12, ystep: 2, minor: 5 };
const P5 = { points: { list: [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 10.2]], tol: [0.1, 0.2], marks: 2 } };
t('plot all points', sc('plot', P5, { axes: AX, points: [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 10.2]], lines: [] }, 2), 2);
t('plot within half square', sc('plot', P5, { axes: AX, points: [[1, 2], [2, 4.4], [3, 5.6], [4, 8], [5, 10.2]], lines: [] }, 2), 2);
t('plot one misplaced point costs one mark', sc('plot', P5, { axes: AX, points: [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 9]], lines: [] }, 2), 1);
t('plot two misplaced', sc('plot', P5, { axes: AX, points: [[1, 2], [2, 4.2], [3, 5.8], [4, 6], [5, 9]], lines: [] }, 2), 0);
t('plot one missing', sc('plot', P5, { axes: AX, points: [[1, 2], [2, 4.2], [3, 5.8], [4, 8]], lines: [] }, 2), 1);
t('plot extra point', sc('plot', P5, { axes: AX, points: [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 10.2], [6, 1]], lines: [] }, 2), 1);
t('plot default tolerance is half a small square', [sc('plot', { points: { list: [[2, 4.2]], marks: 1 } }, { axes: AX, points: [[2, 4.4]], lines: [] }, 1), sc('plot', { points: { list: [[2, 4.2]], marks: 1 } }, { axes: AX, points: [[2, 4.6]], lines: [] }, 1)], [1, 0]);
const PL = Object.assign({ line: { gradient: [1.85, 2.2], intercept: [-0.6, 0.6], marks: 1 } }, P5);
t('plot + good line', sc('plot', PL, { axes: AX, points: P5.points.list, lines: [{ p1: [0, 0], p2: [5, 10.2] }] }, 3), 3);
t('plot + line drawn right to left', sc('plot', PL, { axes: AX, points: P5.points.list, lines: [{ p1: [5, 10.2], p2: [0, 0] }] }, 3), 3);
t('plot + bad line', sc('plot', PL, { axes: AX, points: P5.points.list, lines: [{ p1: [0, 3], p2: [5, 8] }] }, 3), 2);
t('plot vertical line ignored', sc('plot', PL, { axes: AX, points: P5.points.list, lines: [{ p1: [2, 0], p2: [2, 8] }] }, 3), 2);
t('line through points', sc('plot', { line: { through: [[0, 1], [4, 9]], tol: [0.2, 0.2], marks: 2 } }, { axes: AX, points: [], lines: [{ p1: [0, 1], p2: [5, 11] }] }, 2), 2);
const SEG = { segments: { list: [{ label: 'A', shape: 'flat' }, { label: 'B', shape: 'up', from: [0, 0], tol: [0.5, 0.5] }], marks: 2 } };
const AX2 = { xmin: 0, xmax: 10, xstep: 2, ymin: 0, ymax: 10, ystep: 2, minor: 2 };
t('sketch both', sc('plot', SEG, { axes: AX2, points: [], lines: [{ p1: [0, 6], p2: [10, 6], label: 'A' }, { p1: [0, 0], p2: [8, 9], label: 'B' }] }, 2), 2);
t('sketch labels lower case', sc('plot', SEG, { axes: AX2, points: [], lines: [{ p1: [0, 6], p2: [10, 6], label: 'a' }, { p1: [8, 9], p2: [0, 0], label: 'b' }] }, 2), 2);
t('sketch B not from rest', sc('plot', SEG, { axes: AX2, points: [], lines: [{ p1: [0, 6], p2: [10, 6], label: 'A' }, { p1: [0, 3], p2: [8, 9], label: 'B' }] }, 2), 1);
t('sketch no labels', sc('plot', SEG, { axes: AX2, points: [], lines: [{ p1: [0, 6], p2: [10, 6] }, { p1: [0, 0], p2: [8, 9] }] }, 2), 0);
t('sketch swapped labels', sc('plot', SEG, { axes: AX2, points: [], lines: [{ p1: [0, 6], p2: [10, 6], label: 'B' }, { p1: [0, 0], p2: [8, 9], label: 'A' }] }, 2), 0);
const SCL = { scale: { data: { xmin: 0, xmax: 8, ymin: 0, ymax: 32 }, marks: 1 }, points: { list: [[0, 0], [2, 8], [4, 16], [6, 24], [8, 32]], marks: 2 } };
const good = { xmin: 0, xmax: 10, xstep: 2, ymin: 0, ymax: 40, ystep: 5, minor: 5, chosen: true };
t('scale good', sc('plot', SCL, { axes: good, points: SCL.points.list, lines: [] }, 3), 3);
t('scale too big (under half the grid)', sc('plot', SCL, { axes: Object.assign({}, good, { xmax: 20, ymax: 100, ystep: 10 }), points: SCL.points.list, lines: [] }, 3), 2);
t('scale does not cover data', M.mark('plot', SCL, { axes: Object.assign({}, good, { ymax: 30 }), points: [[0, 0]], lines: [] }, { marks: 3 }).detail.scale.ok, false);
t('scale awkward step', M.mark('plot', SCL, { axes: Object.assign({}, good, { ystep: 3, ymax: 36 }), points: SCL.points.list, lines: [] }, { marks: 3 }).detail.scale.ok, false);
t('scale not chosen by student', M.mark('plot', SCL, { axes: Object.assign({}, good, { chosen: false }), points: SCL.points.list, lines: [] }, { marks: 3 }).detail.scale.ok, false);
t('plot empty', M.mark('plot', P5, { axes: AX, points: [], lines: [] }, { marks: 2 }).status, 'unanswered');

// ── econ ──
t('econ full', sc('econ', { shifts: { D: 'right' } }, { shifts: { D: 'right' }, equilibrium: 'D1S' }, 3), 3);
t('econ wrong direction', sc('econ', { shifts: { D: 'right' } }, { shifts: { D: 'left' }, equilibrium: 'D1S' }, 3), 2);
t('econ wrong curve', sc('econ', { shifts: { D: 'right' } }, { shifts: { S: 'right' }, equilibrium: 'DS1' }, 3), 0);
t('econ no equilibrium', sc('econ', { shifts: { S: 'left' } }, { shifts: { S: 'left' }, equilibrium: null }, 3), 2);
t('econ both shifted when one expected', sc('econ', { shifts: { S: 'left' } }, { shifts: { S: 'left', D: 'right' }, equilibrium: 'D1S1' }, 3), 0);
t('econ both expected', sc('econ', { shifts: { S: 'left', D: 'right' } }, { shifts: { S: 'left', D: 'right' }, equilibrium: 'D1S1' }, 3), 3);

// ── syllabus check (14 Nov): symbols, algebra, equations, logic expressions ──
const cel1 = (spec, v) => sc('table', { cells: { r1c1: spec } }, { cells: { r1c1: v } }, 1);
t('genotype: tt is not Tt', cel1('Tt', 'tt'), 0);
t('genotype: either order', cel1('Tt', 'tT'), 1);
t('genotype: TT is not tt', cel1('tt', 'TT'), 0);
t('ordinary word ignores capitals', cel1('nucleus', 'Nucleus'), 1);
t('formula: capitals matter (h2so4)', sc('text', { points: [{ alts: ['H2SO4'] }], need: 1 }, { latex: 'h2so4' }, 1), 0);
t('formula: CO is not Co', cel1('Co', 'CO'), 0);
t('formula inside a sentence', sc('text', { points: [{ alts: ['CO2'] }], need: 1 }, { latex: 'the gas is CO_2' }, 1), 1);
t('case:false turns it off', cel1({ alts: ['Tt'], case: false }, 'tt'), 1);
const alg = (model, ans) => sc('formula', { final: [{ expr: model }] }, { answer: ans }, 1);
t('factorise: either order of brackets', alg('(x-2)(x-3)', '(x-3)(x-2)'), 1);
t('factorise: expanded form refused', alg('(x-2)(x-3)', 'x^2-5x+6'), 0);
t('factorise: not fully factorised refused', alg('2x(x+3)', 'x(2x+6)'), 0);
t('factorise: one bracket alone refused', alg('2(x+3)', '(2x+6)'), 0);
t('expand: copying the question refused', alg('3x+6', '3(x+2)'), 0);
t('expand: unsimplified refused', alg('3x+6', '2x+x+6'), 0);
t('expand: terms in any order', alg('3x+6', '6+3x'), 1);
t('simplify: letters in any order', alg('2x^2y', '2yx^2'), 1);
t('fraction: same value, different look', alg('(x+1)/2', '\\frac{1}{2}x+\\frac12'), 1);
t('wrong algebra', alg('5x-10y', '5x-10'), 0);
const EQ = { equation: '2H2 + O2 → 2H2O' };
t('equation right', sc('text', EQ, { latex: '2H_2+O_2\\rightarrow 2H_2O' }, 2), 2);
t('equation unbalanced: formulae mark only', sc('text', EQ, { latex: 'H_2+O_2\\rightarrow H_2O' }, 2), 1);
t('equation: a multiple is still balanced', sc('text', EQ, { latex: '4H2 + 2O2 -> 4H2O' }, 2), 2);
t('equation: wrong formula', sc('text', EQ, { latex: 'H2 + O → H2O' }, 2), 0);
t('equation: no arrow', sc('text', EQ, { latex: '2H2 + O2 2H2O' }, 2), 0);
const ST = { equation: 'Zn(s) + 2HCl(aq) → ZnCl2(aq) + H2(g)', states: true };
t('equation with state symbols', sc('text', ST, { latex: 'Zn(s)+2HCl(aq)\\rightarrow ZnCl_2(aq)+H_2(g)' }, 3), 3);
t('equation missing state symbols', sc('text', ST, { latex: 'Zn+2HCl→ZnCl2+H2' }, 3), 2);
t('ionic half-equation', sc('text', { equation: 'Cu2+ + 2e- → Cu' }, { latex: 'Cu^{2+}+2e^-\\rightarrow Cu' }, 1), 1);
t('ionic half-equation, electrons wrong', sc('text', { equation: 'Cu2+ + 2e- → Cu' }, { latex: 'Cu^{2+}+e^-\\rightarrow Cu' }, 1), 0);
t('ionic equation with brackets', sc('text', { equation: 'Fe3+ + 3OH- → Fe(OH)3' }, { latex: 'Fe^{3+}+3OH^-\\rightarrow Fe(OH)_3' }, 2), 2);
t('word equation, any order', sc('text', { equation: 'glucose + oxygen → carbon dioxide + water' }, { latex: 'oxygen + glucose → water + carbon dioxide' }, 2), 2);
t('word equation, one side wrong', sc('text', { equation: 'glucose + oxygen → carbon dioxide + water' }, { latex: 'glucose + oxygen → carbon dioxide + energy' }, 2), 1);
t('logic expression equivalent', sc('text', { logic: '(A AND B) OR NOT C' }, { latex: 'X = NOT C OR (B AND A)' }, 2), 2);
t('logic expression different', sc('text', { logic: '(A AND B) OR NOT C' }, { latex: 'A AND B OR C' }, 2), 0);

// ── general ──
t('no answer key', M.mark('text', null, { latex: 'x' }, { marks: 1 }).status, 'no_answer_key');
t('unknown ui', M.mark('zzz', {}, { a: 1 }, { marks: 1 }).status, 'no_marker');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
