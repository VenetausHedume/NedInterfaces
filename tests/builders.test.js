/* Pseudocode runner, SQL runner, and the builder markers. Run: node tests/builders.test.js */
const M = require('../marking/builders.js'), P = require('../marking/pseudo.js'), Q = require('../marking/sql.js');
let pass = 0, fail = 0;
const t = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok || process.argv[2] === '-v') console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + (ok ? '' : `: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)); };
const run = (code, inp) => { const r = P.run(code, inp || []); return r.ok ? r.output.join('|') : 'ERR' + (r.error.line ? ' L' + r.error.line : '') + ': ' + r.error.message; };
const sc = (ui, a, v, marks, q) => M.mark(ui, a, v, Object.assign({ marks }, q || {})).score;
const A = '←';

// ── pseudocode: the constructs in the 0478 guide ──
t('assign + output', run(`X ${A} 5\nOUTPUT X * 2`), '10');
t('<- and = both assign', run('a <- 2\nb = a + 3\nOUTPUT b'), '5');
t('for loop total', run(`Total ${A} 0\nFOR i ${A} 1 TO 3\n INPUT N\n Total ${A} Total + N\nNEXT i\nOUTPUT "Total is ", Total`, [4, 5, 6]), 'Total is 15');
t('for with step', run(`FOR i ${A} 10 TO 1 STEP -3\n OUTPUT i\nNEXT`), '10|7|4|1');
t('while', run('INPUT x\nWHILE x <> -1 DO\n OUTPUT x * x\n INPUT x\nENDWHILE', [2, 3, -1]), '4|9');
t('repeat until', run('c <- 0\nREPEAT\n c <- c + 1\nUNTIL c >= 3\nOUTPUT c'), '3');
t('if else', run('INPUT m\nIF m >= 50 THEN\n OUTPUT "Pass"\nELSE\n OUTPUT "Fail"\nENDIF', [49]), 'Fail');
t('nested if', run('INPUT m\nIF m >= 50 THEN\n IF m >= 80 THEN\n  OUTPUT "A"\n ELSE\n  OUTPUT "C"\n ENDIF\nELSE\n OUTPUT "U"\nENDIF', [85]), 'A');
t('THEN on its own line', run('INPUT x\nIF x > 5\n THEN\n  OUTPUT "hi"\n ELSE\n  OUTPUT "lo"\nENDIF', [2]), 'lo');
t('one-line IF', run('INPUT x\nIF x > 5 THEN OUTPUT "hi"\nENDIF', [9]), 'hi');
t('case', run('INPUT g\nCASE OF g\n "A" : OUTPUT "top"\n "B" : OUTPUT "ok"\n OTHERWISE OUTPUT "low"\nENDCASE', ['B']), 'ok');
t('case otherwise', run('INPUT g\nCASE OF g\n 1 : OUTPUT "one"\n OTHERWISE : OUTPUT "many"\nENDCASE', [7]), 'many');
t('array 1D', run(`DECLARE A : ARRAY[1:3] OF INTEGER\nFOR i ${A} 1 TO 3\n A[i] ${A} i * i\nNEXT\nOUTPUT A[1] + A[2] + A[3]`), '14');
t('array 2D', run(`DECLARE G : ARRAY[1:2,1:2] OF INTEGER\nG[1,2] ${A} 7\nOUTPUT G[1,2]`), '7');
t('undeclared array allowed', run('N[1] <- 4\nN[2] <- 6\nOUTPUT N[1] + N[2]'), '10');
t('function', run('FUNCTION Sq(n : INTEGER) RETURNS INTEGER\n RETURN n * n\nENDFUNCTION\nOUTPUT Sq(7)'), '49');
t('procedure with CALL', run('PROCEDURE Hi(n : STRING)\n OUTPUT "Hi ", n\nENDPROCEDURE\nCALL Hi("Sam")'), 'Hi Sam');
t('MOD and DIV both styles', run('OUTPUT 17 MOD 5, " ", 17 DIV 5, " ", MOD(9,4), " ", DIV(9,4)'), '2 3 1 2');
t('string functions', run('s <- "Hello"\nOUTPUT LENGTH(s), UCASE(s), SUBSTRING(s,2,3)'), '5HELLOell');
t('string joined with &', run('OUTPUT "a" & "b" & 3'), 'ab3');
t('boolean logic', run('x <- 5\nIF x > 1 AND NOT (x = 6) OR FALSE THEN\n OUTPUT "y"\nENDIF'), 'y');
t('power and brackets', run('OUTPUT (2 + 3) ^ 2 - 1'), '24');
t('real division', run('OUTPUT 7 / 2'), '3.5');
t('ROUND', run('OUTPUT ROUND(3.14159, 2)'), '3.14');
t('lower-case keywords', run('total = 0\nfor i = 1 to 3\n total = total + i\nnext i\nprint total'), '6');
t('comments ignored', run('// set up\nx <- 1 // one\nOUTPUT x'), '1');
t('string input kept when declared STRING', run('DECLARE n : STRING\nINPUT n\nOUTPUT n & "!"', ['007']), '007!');
t('number input used as a number', run('INPUT a\nINPUT b\nOUTPUT a + b', ['3', '4']), '7');
t('symbols ≠ ≤ ≥', run('x <- 3\nIF x ≠ 4 AND x ≤ 3 AND x ≥ 3 THEN\n OUTPUT "ok"\nENDIF'), 'ok');
t('largest of four', run(`Largest ${A} 0\nCount ${A} 0\nREPEAT\n INPUT Number\n IF Number > Largest THEN\n  Largest ${A} Number\n ENDIF\n Count ${A} Count + 1\nUNTIL Count = 4\nOUTPUT Largest`, [3, 9, 2, 7]), '9');
// errors a student can act on
t('err: endless loop', run('x <- 1\nWHILE x > 0 DO\n x <- x + 1\nENDWHILE'), 'ERR L2: The program ran for too long. A loop probably never ends.');
t('err: missing ENDIF', run('INPUT x\nIF x > 1 THEN\n OUTPUT x', [3]), 'ERR L3: IF (started on line 2) needs ENDIF to close it.');
t('err: missing NEXT', run('FOR i <- 1 TO 3\n OUTPUT i'), 'ERR L2: FOR (started on line 1) needs NEXT to close it.');
t('err: unset variable', run('OUTPUT Total'), 'ERR L1: "TOTAL" is used before it has been given a value.');
t('err: out of input', run('INPUT a\nINPUT b', [1]), 'ERR L2: The program asked for more input than it was given.');
t('err: array bounds', run('DECLARE A : ARRAY[1:3] OF INTEGER\nA[4] <- 1'), 'ERR L2: A[4] is outside the array (it goes from 1 to 3).');
t('err: divide by zero', run('OUTPUT 4 / 0'), 'ERR L1: Division by zero.');
t('err: stray ENDIF', run('ENDIF'), 'ERR L1: ENDIF has nothing to close. Check that the matching opening line is there.');
t('err: condition not boolean', run('x <- 3\nIF x THEN\n OUTPUT 1\nENDIF'), 'ERR L2: A condition must be true or false, for example Count < 10.');
t('err: text as number', run('OUTPUT "abc" * 2'), 'ERR L1: "abc" is not a number.');
t('err: unknown function', run('OUTPUT Foo(2)'), 'ERR L1: There is no function or procedure called "FOO".');
t('err: unclosed quote', run('OUTPUT "abc'), 'ERR L1: This text is missing its closing quote mark.');
t('output kept up to the error', P.run('OUTPUT 1\nOUTPUT y', []).output, ['1']);
t('never throws on junk', ['', '((((', 'FOR', 'IF THEN', 'x <-', '←←', 'CASE OF', 'OUTPUT ,', 'NEXT i', 'DECLARE', 'a[ <- 1'].map(c => { try { P.run(c, []); return 1; } catch (e) { return e.message; } }), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
t('output match ignores prompts', P.outputMatches(['Enter a number', 'The total is 15.0'], [15]), true);
t('output match needs the value', P.outputMatches(['14'], [15]), false);
t('output match keeps order', [P.outputMatches(['3', '5'], [3, 5]), P.outputMatches(['5', '3'], [3, 5])], [true, false]);
t('output match text', P.outputMatches(['PASS'], ['pass']), true);
t('15 is not found inside 150', P.outputMatches(['150'], [15]), false);

// ── marking code ──
const SUM = { tests: [{ input: [4, 5, 6], expect: [15] }, { input: [1, 1, 1], expect: [3] }], features: ['loop', 'input', 'totalling', 'output'] };
t('code: correct, FOR', sc('code', SUM, { code: 'Total <- 0\nFOR i <- 1 TO 3\nINPUT N\nTotal <- Total + N\nNEXT\nOUTPUT Total' }, 5), 5);
t('code: correct, WHILE and different names', sc('code', SUM, { code: 'sum = 0\ncount = 0\nWHILE count < 3 DO\n INPUT num\n sum = sum + num\n count = count + 1\nENDWHILE\nPRINT "Sum: ", sum' }, 5), 5);
t('code: correct without a loop still full marks', sc('code', SUM, { code: 'INPUT a\nINPUT b\nINPUT c\nOUTPUT a + b + c' }, 5), 5);
t('code: loops twice only -> features', sc('code', SUM, { code: 'Total <- 0\nFOR i <- 1 TO 2\nINPUT N\nTotal <- Total + N\nNEXT\nOUTPUT Total' }, 5), 4);
t('code: syntax slip keeps feature marks', sc('code', SUM, { code: 'Total <- 0\nFOR i <- 1 TO 3\nINPUT N\nTotal <- Total + N\nOUTPUT Total' }, 5), 4);
t('code: only input and output', sc('code', SUM, { code: 'INPUT N\nOUTPUT N' }, 5), 2);
t('code: hard-coded answer fails the second test', sc('code', SUM, { code: 'OUTPUT 15' }, 5), 1);
t('code: nonsense', sc('code', SUM, { code: 'hello world' }, 5), 0);
t('code: empty', M.mark('code', SUM, { code: '  ' }, { marks: 5 }).status, 'unanswered');
t('code: no feature list -> share of tests', sc('code', { tests: SUM.tests.concat([{ input: [0, 0, 0], expect: [0] }]) }, { code: 'INPUT a\nINPUT b\nINPUT c\nIF a = 4 THEN\n OUTPUT 15\nELSE\n OUTPUT 0\nENDIF' }, 4), 2);

// ── flowcharts are run too ──
const fc = { nodes: [{ id: 1, type: 'start', text: 'START' }, { id: 2, type: 'process', text: `Total ${A} 0, Count ${A} 0` }, { id: 3, type: 'io', text: 'INPUT N' }, { id: 4, type: 'process', text: `Total ${A} Total + N\nCount ${A} Count + 1` }, { id: 5, type: 'decision', text: 'Is Count = 3?' }, { id: 6, type: 'io', text: 'OUTPUT Total' }, { id: 7, type: 'start', text: 'STOP' }],
  edges: [{ from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6, label: 'Yes' }, { from: 5, to: 3, label: 'No' }, { from: 6, to: 7 }] };
t('flowchart runs', P.runFlowchart(fc, [1, 2, 3]).output, ['6']);
t('flowchart marked by tests', sc('flowchart', { tests: [{ input: [1, 2, 3], expect: [6] }, { input: [5, 5, 5], expect: [15] }], features: ['input', 'decision', 'counting', 'output'] }, fc, 5), 5);
const swapped = JSON.parse(JSON.stringify(fc)); swapped.edges[4].label = 'No'; swapped.edges[5].label = 'Yes';
t('flowchart Yes/No swapped -> features only', sc('flowchart', { tests: [{ input: [1, 2, 3], expect: [6] }], features: ['input', 'decision', 'counting', 'output'] }, swapped, 5), 4);
t('flowchart missing branch label explains itself', /Yes and one labelled No/.test(P.runFlowchart(Object.assign({}, fc, { edges: fc.edges.map(e => Object.assign({}, e, { label: '' })) }), [1, 2, 3]).error.message), true);
t('flowchart with no STOP', /without reaching STOP/.test(P.runFlowchart({ nodes: fc.nodes.slice(0, 2), edges: [{ from: 1, to: 2 }] }, []).error.message), true);
t('flowchart endless loop stops', P.runFlowchart({ nodes: [{ id: 1, type: 'start', text: 'START' }, { id: 2, type: 'process', text: 'x <- 1' }], edges: [{ from: 1, to: 2 }, { from: 2, to: 2 }] }, []).ok, false);
t('flowchart empty', M.mark('flowchart', { tests: [] }, { nodes: [], edges: [] }, { marks: 3 }).status, 'unanswered');

// ── ordering ──
const ORD = { order: ['init', 'for', 'in', 'add', 'next', 'out'], indent: { init: 0, for: 0, in: 1, add: 1, next: 0, out: 0 }, indentMarks: 1 };
t('order: perfect with indent', sc('order', ORD, { order: ORD.order, indent: { in: 1, add: 1 } }, 5), 5);
t('order: right order, no indent', sc('order', ORD, { order: ORD.order }, 5), 4);
t('order: two lines swapped', sc('order', ORD, { order: ['init', 'for', 'add', 'in', 'next', 'out'], indent: { in: 1, add: 1 } }, 5), 3);
t('order: distractor included', sc('order', ORD, { order: ['init', 'for', 'in', 'bad', 'add', 'next', 'out'] }, 5), 3);
t('order: one line missing', sc('order', ORD, { order: ['init', 'for', 'in', 'add', 'out'] }, 5), 3);
t('order: reversed', sc('order', ORD, { order: ORD.order.slice().reverse() }, 5), 0);
t('order: alternatives accepted', sc('order', { orders: [['a', 'b', 'c'], ['b', 'a', 'c']] }, { order: ['b', 'a', 'c'] }, 3), 3);
t('order: empty', M.mark('order', ORD, { order: [] }, { marks: 5 }).status, 'unanswered');

// ── SQL ──
const T = { Students: { columns: ['Name', 'Class', 'Mark'], rows: [['Dev', 10, 88], ['Asha', 10, 71], ['Ben', 9, 55], ['Chen', 10, 64], ['Eve', 9, 90]] } };
const sql = q => { const r = Q.run(q, T); return r.ok ? r.rows.map(x => x.join(',')).join('|') : 'ERR: ' + r.error; };
t('sql select where order', sql('SELECT Name FROM Students WHERE Class = 10 ORDER BY Name'), 'Asha|Chen|Dev');
t('sql star', sql('select * from students where mark > 85'), 'Dev,10,88|Eve,9,90');
t('sql and/or/not + brackets', sql("SELECT Name FROM Students WHERE (Class = 9 OR Mark > 80) AND NOT Name = 'Eve'"), 'Dev|Ben');
t('sql order desc, two columns', sql('SELECT Name, Mark FROM Students ORDER BY Class DESC, Mark DESC'), 'Dev,88|Asha,71|Chen,64|Eve,90|Ben,55');
t('sql count sum avg', [sql('SELECT COUNT(*) FROM Students WHERE Mark > 60'), sql('SELECT SUM(Mark) FROM Students WHERE Class = 9'), sql('SELECT MAX(Mark) FROM Students')], ['4', '145', '90']);
t('sql like', sql("SELECT Name FROM Students WHERE Name LIKE 'C%'"), 'Chen');
t('sql text compare ignores case', sql("SELECT Mark FROM Students WHERE Name = 'asha'"), '71');
t('sql errors', [sql('SELECT Nme FROM Students'), sql('SELECT Name FROM Pupils'), sql('SELECT Name Students'), sql('Name FROM Students'), sql("SELECT Name FROM Students WHERE Class")],
  ['ERR: The table has no column called "Nme".', 'ERR: There is no table called "Pupils".', 'ERR: Expected FROM but found "Students".', 'ERR: Expected SELECT but found "Name".', 'ERR: A WHERE condition needs a comparison such as = or >.']);
const q = { config: { tables: T } }, MODEL = { query: 'SELECT Name FROM Students WHERE Class = 10 ORDER BY Name' };
t('sql mark: same result, different spelling', sc('sql', MODEL, { code: 'select name from students where class=10 order by name asc;' }, 4, q), 4);
t('sql mark: no ORDER BY', sc('sql', MODEL, { code: 'SELECT Name FROM Students WHERE Class = 10' }, 4, q), 3);
t('sql mark: wrong WHERE', sc('sql', MODEL, { code: 'SELECT Name FROM Students WHERE Class = 9 ORDER BY Name' }, 4, q), 3);
t('sql mark: extra column', sc('sql', MODEL, { code: 'SELECT Name, Mark FROM Students WHERE Class = 10 ORDER BY Name' }, 4, q), 3);
t('sql mark: error still gets clause marks', sc('sql', MODEL, { code: 'SELECT Nme FROM Students WHERE Class = 10' }, 4, q), 2);
t('sql mark: equivalent condition', sc('sql', { query: 'SELECT COUNT(*) FROM Students WHERE Mark > 60' }, { code: 'SELECT COUNT(Name) FROM Students WHERE Mark >= 61' }, 3, q), 3);

// ── chemistry and physics builders ──
t('shells atom', [sc('shells', { shells: [2, 8, 1] }, { shells: [2, 8, 1] }, 2), sc('shells', { shells: [2, 8, 1] }, { shells: [2, 9] }, 2), sc('shells', { shells: [2, 8, 1] }, { shells: [8, 2, 1] }, 2), sc('shells', { shells: [2, 8, 1] }, { shells: [2, 8, 2] }, 2)], [2, 1, 1, 1]);
t('shells ion', [sc('shells', { shells: [2, 8], charge: '2-' }, { shells: [2, 8], charge: '2-' }, 3), sc('shells', { shells: [2, 8], charge: '2-' }, { shells: [2, 8], charge: '-2' }, 3), sc('shells', { shells: [2, 8], charge: '2-' }, { shells: [2, 8], charge: '^{2-}' }, 3), sc('shells', { shells: [2, 8], charge: '2-' }, { shells: [2, 8] }, 3), sc('shells', { shells: [2, 8], charge: '2-' }, { shells: [2, 8], charge: '2+' }, 3)], [3, 3, 3, 2, 2]);
const eth = { atoms: [{ id: 1, element: 'C' }, { id: 2, element: 'C' }, { id: 3, element: 'H' }, { id: 4, element: 'H' }, { id: 5, element: 'H' }, { id: 6, element: 'H' }], bonds: [{ from: 1, to: 2, order: 2 }, { from: 1, to: 3, order: 1 }, { from: 1, to: 4, order: 1 }, { from: 2, to: 5, order: 1 }, { from: 2, to: 6, order: 1 }] };
const eth2 = { atoms: [{ id: 'a', element: 'H' }, { id: 'b', element: 'C' }, { id: 'c', element: 'H' }, { id: 'd', element: 'C' }, { id: 'e', element: 'H' }, { id: 'f', element: 'H' }], bonds: [{ from: 'b', to: 'd', order: 2 }, { from: 'a', to: 'b', order: 1 }, { from: 'c', to: 'b', order: 1 }, { from: 'd', to: 'e', order: 1 }, { from: 'd', to: 'f', order: 1 }] };
const single = JSON.parse(JSON.stringify(eth2)); single.bonds[0].order = 1;
const lop = JSON.parse(JSON.stringify(eth2)); lop.bonds[4].from = 'b';
t('structure: same molecule drawn differently', sc('structure', { model: eth }, eth2, 3), 3);
t('structure: single bond where double needed', sc('structure', { model: eth }, single, 3), 1);
t('structure: 3 H on one carbon', sc('structure', { model: eth }, lop, 3), 1);
t('structure: wrong atoms', sc('structure', { model: eth }, { atoms: eth2.atoms.slice(0, 5), bonds: eth2.bonds.slice(0, 4) }, 3), 0);
const dme = { atoms: [{ id: 1, element: 'C' }, { id: 2, element: 'O' }, { id: 3, element: 'C' }].concat([4, 5, 6, 7, 8, 9].map(i => ({ id: i, element: 'H' }))), bonds: [{ from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 1, to: 4, order: 1 }, { from: 1, to: 5, order: 1 }, { from: 1, to: 6, order: 1 }, { from: 3, to: 7, order: 1 }, { from: 3, to: 8, order: 1 }, { from: 3, to: 9, order: 1 }] };
const etoh = { atoms: [{ id: 1, element: 'C' }, { id: 2, element: 'C' }, { id: 3, element: 'O' }].concat([4, 5, 6, 7, 8, 9].map(i => ({ id: i, element: 'H' }))), bonds: [{ from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 3, to: 9, order: 1 }, { from: 1, to: 4, order: 1 }, { from: 1, to: 5, order: 1 }, { from: 1, to: 6, order: 1 }, { from: 2, to: 7, order: 1 }, { from: 2, to: 8, order: 1 }] };
t('structure: an isomer (right atoms and bonds, wrong arrangement) is not full marks', sc('structure', { model: etoh }, dme, 4), 2);
const water = { atoms: [{ id: 'o', element: 'O', x: 200, y: 200, slots: { top: ['dot', 'dot'], bottom: ['dot', 'dot'], left: ['dot'], right: ['dot'] } }, { id: 'h1', element: 'H', x: 110, y: 200, slots: { top: [], bottom: [], left: [], right: ['cross'] } }, { id: 'h2', element: 'H', x: 290, y: 200, slots: { top: [], bottom: [], left: ['cross'], right: [] } }] };
const WA = { bonds: [['O', 'H', 2], ['O', 'H', 2]], lone: { O: [4], H: [0, 0] } };
const both = JSON.parse(JSON.stringify(water)); both.atoms[0].slots.left = ['dot', 'cross']; both.atoms[1].slots.right = [];
const nol = JSON.parse(JSON.stringify(water)); nol.atoms[0].slots.top = [];
const dots = JSON.parse(JSON.stringify(water)); dots.atoms[1].slots.right = ['dot'];
t('lewis: water', sc('lewis', WA, water, 3), 3);
t('lewis: pair drawn in one atom\'s slot', sc('lewis', WA, both, 3), 3);
t('lewis: a lone pair missing', sc('lewis', WA, nol, 3), 1);
t('lewis: pair not dot + cross', sc('lewis', WA, dots, 3), 2);
t('circuit', [sc('circuit', { components: { cell: 1, switch: 1, lamp: 2 }, arrangement: 'series' }, { components: [{ type: 'cell' }, { type: 'switch' }, { type: 'bulb' }, { type: 'lamp' }], overall: 'series', meters: [] }, 4),
  sc('circuit', { components: { cell: 1, switch: 1, lamp: 2 }, arrangement: 'series' }, { components: [{ type: 'cell' }, { type: 'switch' }, { type: 'lamp' }, { type: 'lamp' }], overall: 'parallel', meters: [] }, 4),
  sc('circuit', { components: { cell: 1, resistor: 1, ammeter: 1, voltmeter: 1 }, meters: true }, { components: [{ type: 'cell' }, { type: 'resistor' }, { type: 'ammeter' }, { type: 'voltmeter' }], overall: 'parallel', meters: [{ type: 'ammeter', correct: true }, { type: 'voltmeter', correct: false }] }, 5)], [4, 2, 3]);

// ── long answer sorted under headings; economics labels ──
const PRO = { points: [{ alts: ['more sales'], require: [['sales', 'demand']] }, { alts: ['more revenue'], require: ['revenue'] }, { alts: ['lower price'], require: ['price'] }, { alts: ['diseconomies of scale'], require: ['diseconomies'] }], groups: [{ title: 'for', max: 5, points: [0, 1] }, { title: 'against', max: 5, points: [2, 3] }] };
t('prose sides: points under the right heading', sc('prose', PRO, { points: ['more sales', 'price may be lower'], sides: [0, 1] }, 8), 2);
t('prose sides: a point under the wrong heading earns nothing', sc('prose', PRO, { points: ['more sales', 'price may be lower'], sides: [1, 0] }, 8), 0);
t('prose without sides still works', sc('prose', PRO, { points: ['more sales', 'price may be lower'] }, 8), 2);
// a chosen layout: Definition / for / against / Conclusion. Definition and conclusion boxes (-1) can earn any point.
{ const FQ = { marks: 8, config: { formats: [{ id: 'sides', label: 'D → for → against → C', sections: [{ title: 'Definition', one: true, group: -2 }, { title: 'For', group: 0 }, { title: 'Against', group: 1 }, { title: 'Conclusion', one: true }] }] } };
  const V = { points: ['output is the amount produced', 'more sales', 'price may be lower', 'overall it depends on diseconomies of scale'], sec: [0, 1, 2, 3], sides: [-2, 0, 1, -1], format: 'sides' };
  t('prose layout: each section earns its points, the conclusion can earn any', sc('prose', PRO, V, 8, FQ), 3);
  t('prose layout: a "for" point under "against" earns nothing', sc('prose', PRO, Object.assign({}, V, { sides: [-2, 1, 0, -1] }), 8, FQ), 1);
  t('prose layout: a definition box cannot earn an argument point', sc('prose', PRO, { points: ['revenue rises as more sales are made'], sec: [0], sides: [-2], format: 'sides' }, 8, FQ), 0);
  const fb = M.explain('prose', PRO, V, M.mark('prose', PRO, V, FQ), FQ).map(f => f.text);
  t('prose layout: feedback names the sections', [fb.some(x => x.startsWith('For, sentence 1: more sales')), fb.some(x => x.startsWith('Against, sentence 1: lower price')), fb.some(x => x.startsWith('Definition: no separate mark'))], [true, true, true]); }
const EL = { shifts: { D: 'left' }, labels: { y: 'Price', x: 'Quantity', down: 'D', up: 'S' } };
t('econ labels: all right', sc('econ', EL, { shifts: { D: 'left' }, equilibrium: 'D1S', labels: { y: 'Price', x: 'Quantity', down: 'D', up: 'S' } }, 4), 4);
t('econ labels: axes swapped', sc('econ', EL, { shifts: { D: 'left' }, equilibrium: 'D1S', labels: { y: 'Quantity', x: 'Price', down: 'D', up: 'S' } }, 4), 3);
t('econ labels: only labels done', sc('econ', EL, { shifts: {}, equilibrium: null, labels: { y: 'Price', x: 'Quantity', down: 'D', up: 'S' } }, 4), 1);

// ── feedback exists for every marker and never throws ──
const cases = [['text', { points: [{ alts: ['refinery gas'] }, { alts: ['bitumen'] }], need: 1 }, { latex: 'petrol' }, {}], ['formula', { final: [{ value: '9000', unit: 'N s' }], method: ['1200 x 7.5'] }, { answer: '900' }, {}], ['mcq', { key: 'C' }, { choice: 'A' }, {}], ['mcq', { keys: ['A', 'B'] }, { choices: ['A', 'C'] }, {}],
  ['match', { pairs: { a: '1', b: '2' } }, { pairs: { a: '2' } }, { config: { left: [{ id: 'a', text: 'Evaporation' }, { id: 'b', text: 'Melting' }], right: [{ id: '1', text: 'liquid to gas' }, { id: '2', text: 'solid to liquid' }] } }],
  ['table', { cells: { r1c1: { alts: ['starch'] } } }, { cells: { r1c1: 'fat' } }, { config: { table: [['enzyme', 'substrate'], ['amylase', null]] } }], ['prose', PRO, { points: ['more sales', 'nothing'], sides: [0, 1] }, {}], ['label', { labels: { n: { alts: ['nucleus'] } } }, { labels: { n: 'wall' } }, { config: { labels: [{ id: 'n' }] } }],
  ['place', { spots: { s: 'ammeter' } }, { spots: { s: 'voltmeter' } }, { config: { spots: [{ id: 's' }] } }], ['flowfill', { boxes: { c: { alts: ['Mark >= 50'] } } }, { boxes: { c: 'Mark > 60' } }, {}],
  ['logic', { expr: 'A AND B' }, { gates: [{ id: 'g1', gate: 'OR' }], inputs: [{ id: 't1', label: 'A' }, { id: 't2', label: 'B' }], outputs: [{ id: 't3', label: 'Q' }], wires: [{ from: { id: 't1', pin: 'out' }, to: { id: 'g1', pin: 'in0' } }, { from: { id: 't2', pin: 'out' }, to: { id: 'g1', pin: 'in1' } }, { from: { id: 'g1', pin: 'out' }, to: { id: 't3', pin: 'in' } }] }, {}],
  ['plot', { points: { list: [[1, 2], [2, 4]], marks: 2 }, line: { gradient: [1.8, 2.2], marks: 1 }, scale: { data: { xmin: 0, xmax: 2, ymin: 0, ymax: 4 }, marks: 1 } }, { axes: { xmin: 0, xmax: 20, xstep: 2, ymin: 0, ymax: 40, ystep: 5, chosen: true }, points: [[1, 2]], lines: [{ p1: [0, 0], p2: [2, 1] }] }, {}],
  ['econ', EL, { shifts: { S: 'left' }, equilibrium: null, labels: { y: 'Quantity' } }, {}], ['code', SUM, { code: 'INPUT N\nOUTPUT N' }, {}], ['flowchart', { tests: [{ input: [1, 2, 3], expect: [6] }], features: ['decision'] }, swapped, {}],
  ['order', ORD, { order: ['init', 'for'] }, {}], ['sql', MODEL, { code: 'SELECT Nme FROM Students' }, q], ['sql', MODEL, { code: 'SELECT Name FROM Students' }, q], ['shells', { shells: [2, 8], charge: '2-' }, { shells: [2, 6] }, {}], ['structure', { model: eth }, single, {}], ['lewis', WA, nol, {}],
  ['circuit', { components: { cell: 1 }, arrangement: 'series', meters: true }, { components: [{ type: 'lamp' }], overall: 'open', meters: [] }, {}]];
// file handling (syllabus: open, close and use a file for reading and writing)
{ const code = 'DECLARE Line : STRING\nCount <- 0\nOPENFILE "Names.txt" FOR READ\nWHILE NOT EOF("Names.txt") DO\n  READFILE "Names.txt", Line\n  Count <- Count + 1\nENDWHILE\nCLOSEFILE "Names.txt"\nOPENFILE "Out.txt" FOR WRITE\nWRITEFILE "Out.txt", Count\nCLOSEFILE "Out.txt"\nOUTPUT Count';
  const r = P.run(code, [], undefined, { 'Names.txt': ['Ann', 'Bo', 'Cy'] });
  t('files: read to EOF and count', r.output, ['3']);
  t('files: written file returned', r.files['Out.txt'], ['3']);
  t('files: reading an unopened file explains itself', /not open/.test(P.run('READFILE "x.txt", A', []).error.message), true);
  t('files: reading a file opened for WRITE', /cannot be read/.test(P.run('OPENFILE "a.txt" FOR WRITE\nREADFILE "a.txt", B', []).error.message), true);
  t('files: APPEND keeps old lines', P.run('OPENFILE "a.txt" FOR APPEND\nWRITEFILE "a.txt", "z"\nCLOSEFILE "a.txt"', [], undefined, { 'a.txt': ['y'] }).files['a.txt'], ['y', 'z']);
  const ans = { tests: [{ files: { 'Names.txt': ['Ann', 'Bo', 'Cy'] }, expect: [3], expectFiles: { 'Out.txt': ['3'] } }, { files: { 'Names.txt': [] }, expect: [0] }], features: ['file', 'loop', 'counting'] };
  t('files: marked full', M.mark('code', ans, { code }, { marks: 3 }).score, 3);
  t('files: wrong count gets feature marks only', M.mark('code', ans, { code: code.replace('Count + 1', 'Count + 2') }, { marks: 3 }).score, 2); }
// ionic dot-and-cross
{ const A = { ionic: true, ions: { Na: '+', Cl: '-' }, electrons: { Na: [0, 8], Cl: [8] } };
  const na = { id: 'a1', element: 'Na', charge: '+', x: 200, y: 200, slots: { top: [], bottom: [], left: [], right: [] } };
  const cl = { id: 'a2', element: 'Cl', charge: '-', x: 400, y: 200, slots: { top: ['dot', 'dot'], bottom: ['dot', 'dot'], left: ['dot', 'cross'], right: ['dot', 'dot'] } };
  t('ionic: NaCl full marks', M.mark('lewis', A, { atoms: [na, cl] }, { marks: 3 }).score, 3);
  t('ionic: missing charge', M.mark('lewis', A, { atoms: [Object.assign({}, na, { charge: '' }), cl] }, { marks: 3 }).score, 2);
  t('ionic: gained electron not shown', M.mark('lewis', A, { atoms: [na, Object.assign({}, cl, { slots: { top: ['dot', 'dot'], bottom: ['dot', 'dot'], left: ['dot', 'dot'], right: ['dot', 'dot'] } })] }, { marks: 3 }).score, 2); }
// new circuit symbols
t('circuit: thermistor asked, resistor given', M.mark('circuit', { components: { cell: 1, thermistor: 1, lamp: 1 }, arrangement: 'series' }, { components: [{ type: 'cell' }, { type: 'resistor' }, { type: 'lamp' }], overall: 'series' }, { marks: 3 }).score, 1);
t('circuit: thermistor circuit right', M.mark('circuit', { components: { cell: 1, thermistor: 1, lamp: 1 }, arrangement: 'series' }, { components: [{ type: 'cell' }, { type: 'thermistor' }, { type: 'lamp' }], overall: 'series' }, { marks: 3 }).score, 3);

// Python answers (syllabus: "pseudocode or program code")
{ const Py = require('../marking/python.js');
  t('python: runner loads in Node', Py.available(), true);
  const A = { tests: [{ input: [4, 5, 6], expect: [15] }, { input: [10, 0, -3], expect: [7] }], features: ['loop', 'input', 'totalling', 'output'] };
  const good = 'total = 0\nfor i in range(3):\n    total = total + int(input("Number: "))\nprint("Total", total)';
  t('python: right program -> full marks', M.mark('code', A, { code: good, lang: 'python' }, { marks: 4 }).score, 4);
  t('python: same code marked as pseudocode fails to run', M.mark('code', A, { code: good }, { marks: 4 }).detail.passed, 0);
  t('python: off-by-one loop gets feature marks', M.mark('code', A, { code: good.replace('range(3)', 'range(2)'), lang: 'python' }, { marks: 4 }).score, 3);
  t('python: error line reported', Py.run('x = 1\nprint(y)', []).error.line, 2);
  t('python: endless loop stopped', /too long/.test(Py.run('while True:\n    pass', [], 300).error.message), true);
  t('python: files read and written', Py.run('n = 0\nfor line in open("S.txt"):\n    n += 1\nf = open("O.txt", "w")\nf.write(str(n))\nf.close()', [], 0, { 'S.txt': ['a', 'b'] }).files['O.txt'], ['2']);
  t('python: features read from the words', Py.features('count = 0\nwhile x != -1:\n    count += 1\n    x = int(input())\nprint(count)').counting, true); }

// nuclear equations
{ const Q = { marks: 3, config: { left: 1, right: 2, given: [{ side: 'left', i: 0, A: 238, Z: 92, s: 'U' }] } };
  const A = { left: [{ A: 238, Z: 92, s: 'U' }], right: [{ A: 234, Z: 90, s: 'Th' }, { A: 4, Z: 2, s: 'He' }] };
  const v = r => ({ left: [{ A: '', Z: '', s: '' }], right: r });
  t('nuclide: alpha decay right', M.mark('nuclide', A, v([{ A: '234', Z: '90', s: 'Th' }, { A: '4', Z: '2', s: 'He' }]), Q).score, 3);
  t('nuclide: particles in either order, α accepted', M.mark('nuclide', A, v([{ A: '4', Z: '2', s: 'α' }, { A: '234', Z: '90', s: 'Th' }]), Q).score, 3);
  t('nuclide: mass number wrong', M.mark('nuclide', A, v([{ A: '238', Z: '90', s: 'Th' }, { A: '4', Z: '2', s: 'He' }]), Q).score, 2);
  t('nuclide: mostly blank', M.mark('nuclide', A, v([{ A: '', Z: '', s: 'Th' }, { A: '', Z: '', s: '' }]), Q).score, 0);
  const r = M.mark('nuclide', A, v([{ A: '238', Z: '90', s: 'Th' }, { A: '4', Z: '2', s: 'He' }]), Q);
  t('nuclide: feedback names the box and the mass imbalance', M.explain('nuclide', A, null, r, Q).map(f => f.text).join(' ').includes('should be 234') && M.explain('nuclide', A, null, r, Q).some(f => /238 before, 242 after/.test(f.text)), true);
  const QB = { marks: 2, config: { left: 1, right: 2, given: [{ side: 'left', i: 0, A: 14, Z: 6, s: 'C' }, { side: 'right', i: 0, s: 'N' }] } };
  const AB = { left: [{ A: 14, Z: 6, s: 'C' }], right: [{ A: 14, Z: 7, s: 'N' }, { A: 0, Z: -1, s: 'e' }] };
  t('nuclide: beta with −1 typed as a minus sign', M.mark('nuclide', AB, { left: [{}], right: [{ A: '14', Z: '7', s: 'N' }, { A: '0', Z: '−1', s: 'β' }] }, QB).score, 2); }

// drawing interfaces (set aside in the lab, marked here)
{ const sc = (ui, A, v, q) => M.mark(ui, A, v, q).score;
  const R = { region: { lines: [{ through: [[0, 1], [7, 1]], strict: false, keep: [3, 2] }, { through: [[2, 0], [2, 7]], strict: true, keep: [3, 2] }, { through: [[0, 6], [6, 0]], strict: false, keep: [3, 2] }], marks: 4 } };
  const AX = { xmin: 0, xmax: 7, xstep: 1, ymin: 0, ymax: 7, ystep: 1, minor: 2 }, L = [{ p1: [0, 1], p2: [7, 1] }, { p1: [2, 0], p2: [2, 7], dashed: true }, { p1: [1, 5], p2: [5, 1] }];
  t('region: all right', sc('plot', R, { axes: AX, points: [], lines: L, region: [3, 2] }, { marks: 4 }), 4);
  t('region: R outside', sc('plot', R, { axes: AX, points: [], lines: L, region: [1, 2] }, { marks: 4 }), 3);
  t('region: strict line drawn solid', sc('plot', R, { axes: AX, points: [], lines: L.map(l => ({ p1: l.p1, p2: l.p2 })), region: [3, 2] }, { marks: 4 }), 3);
  t('curve: credited once enough points', sc('plot', { curve: { marks: 1, min: 6 } }, { axes: AX, points: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], lines: [] }, { marks: 1 }), 1);
  t('transform: right image', sc('transform', { shape: [[3, 1], [5, 1], [5, 2]] }, { shapes: [{ pts: [[5, 2], [3, 1], [5, 1]] }] }, { marks: 2 }), 2);
  t('transform: wrong place', sc('transform', { shape: [[3, 1], [5, 1], [5, 2]] }, { shapes: [{ pts: [[4, 1], [6, 1], [6, 2]] }] }, { marks: 2 }), 1);
  t('transform: wrong shape', sc('transform', { shape: [[3, 1], [5, 1], [5, 2]] }, { shapes: [{ pts: [[1, 3], [1, 5], [2, 5]] }] }, { marks: 2 }), 0);
  t('numberline: right', sc('numberline', { lo: { v: -2, closed: false }, hi: { v: 3, closed: true } }, { lo: { v: -2, closed: false }, hi: { v: 3, closed: true } }, { marks: 2 }), 2);
  t('numberline: one circle wrong', sc('numberline', { lo: { v: -2, closed: false }, hi: { v: 3, closed: true } }, { lo: { v: -2, closed: true }, hi: { v: 3, closed: true } }, { marks: 2 }), 1);
  t('venn: shading right', sc('venn', { shaded: ['A'] }, { shaded: ['A'] }, { marks: 1 }), 1);
  t('venn: one region out', sc('venn', { shaded: ['none', 'C', 'AC', 'BC', 'ABC'] }, { shaded: ['none', 'C', 'AC', 'BC'] }, { marks: 2 }), 1);
  t('venn: counts one wrong', sc('venn', { counts: { A: 11, AB: 7, B: 8, none: 4 } }, { counts: { A: '11', AB: '7', B: '8', none: '5' } }, { marks: 3 }), 2);
  const HQ = { marks: 3, config: { axis: { max: 7, step: 1, minor: 5 } } };
  t('bars: within half a small square', sc('bars', { heights: [2, 6, 1.6] }, { heights: [2.1, 6, 1.6] }, HQ), 3);
  t('bars: frequency not density', sc('bars', { heights: [2, 6, 1.6] }, { heights: [20, 30, 24] }, HQ), 0);
  const CQ = { marks: 2, config: { points: { A: [3, 2], B: [11, 2] } } }, CA = { points: { C: { at: [6.3125, 5.7453], tol: 0.2 } }, arcs: [{ center: 'A', r: 5 }, { center: 'B', r: 6 }], segments: [['A', 'C'], ['B', 'C']] };
  const cv = { points: { C: [6.31, 5.75] }, arcs: [{ c: [3, 2], r: 5 }, { c: [11, 2], r: 6 }], segments: [[3, 2, 6.31, 5.75], [11, 2, 6.31, 5.75]] };
  t('construct: triangle with arcs', sc('construct', CA, cv, CQ), 2);
  t('construct: no arcs shown', sc('construct', CA, Object.assign({}, cv, { arcs: [] }), CQ), 1);
  t('construct: bearing measured anticlockwise from east', sc('construct', { bearing: { from: 'A', to: 'B', deg: 60, tol: 2, dist: 4, dtol: 0.2 } }, { points: { B: [6, 5.96] } }, { marks: 2, config: { points: { A: [4, 2.5] } } }), 1);
  const RQ = { marks: 3, config: { kind: 'lens', f: 2, object: { x: -6, h: 2 } } }, RA = { rays: 2, image: { x: 3, h: -1 } };
  t('rays: parallel + centre ray and image', sc('rays', RA, { rays: [{ pts: [[-6, 2], [0, 2], [4, -2]] }, { pts: [[-6, 2], [6, -2]] }], image: { x: 3, h: -1 } }, RQ), 3);
  t('rays: a ray that does not bend through F', sc('rays', RA, { rays: [{ pts: [[-6, 2], [0, 2], [4, -2]] }, { pts: [[-6, 2], [0, 2], [6, 2]] }], image: { x: 3, h: -1 } }, RQ), 2);
  t('rays: mirror, angle of reflection right', sc('rays', { rays: 1, image: { x: 4, h: 2 } }, { rays: [{ pts: [[-4, 2], [0, 1], [-4, 0]] }], image: { x: 4, h: 2 } }, { marks: 2, config: { kind: 'mirror', object: { x: -4, h: 2 } } }), 2);
  const FA = { arrows: [{ label: 'weight', dir: 270 }, { label: 'normal reaction', dir: 90 }], compare: [['weight', '=', 'normal reaction']] };
  t('arrows: balanced forces', sc('arrows', FA, { arrows: [{ dir: 270, len: 2, label: 'weight' }, { dir: 90, len: 2, label: 'normal reaction' }] }, { marks: 2 }), 2);
  t('arrows: unequal lengths', sc('arrows', FA, { arrows: [{ dir: 270, len: 2, label: 'weight' }, { dir: 90, len: 3, label: 'normal reaction' }] }, { marks: 2 }), 1);
  t('ppc: shift out', sc('ppc', { shift: 'out' }, { shift: 'out', point: null, where: null }, { marks: 2 }), 2);
  t('ppc: shift in when out asked', sc('ppc', { shift: 'out' }, { shift: 'in', point: null, where: null }, { marks: 2 }), 0);
  t('price control: max price above equilibrium has no effect', sc('pricecontrol', { control: 'max' }, { price: 'above', gap: 'shortage' }, { marks: 2 }), 1);
  t('minimum wage: surplus of labour', sc('pricecontrol', { control: 'min' }, { price: 'above', gap: 'surplus' }, { marks: 2 }), 2); }

let fbOk = 0; const thin = [];
cases.forEach(([ui, a, v, qq]) => { const question = Object.assign({ marks: 4 }, qq); const r = M.mark(ui, a, v, question); const fb = M.explain(ui, a, v, r, question); if (fb.length && fb.every(f => f.text && !/undefined|NaN|\[object/.test(f.text))) fbOk++; else thin.push(ui + ': ' + JSON.stringify(fb)); });
t('feedback for all ' + cases.length + ' wrong-answer cases is readable', thin, []);
t('feedback for a blank answer', M.explain('text', { points: [] }, null, M.mark('text', { points: [] }, null, { marks: 1 }), {})[0].text, 'Nothing to mark yet.');
if (process.argv[2] === '-fb') cases.forEach(([ui, a, v, qq]) => { const question = Object.assign({ marks: 4 }, qq); const r = M.mark(ui, a, v, question); console.log('\n' + ui + ' ' + r.score + '/' + r.max); M.explain(ui, a, v, r, question).forEach(f => console.log('   ' + { good: '+', bad: 'x', info: 'i' }[f.kind] + ' ' + f.text)); });
// ── CS additions: Boolean fields in WHERE, self-marked algorithms, trace-table feedback ──
{ const tabs = { Contract: { columns: ['ContractNumber', 'News', 'Sport'], rows: [[1, true, true], [2, true, false], [3, false, true]] } };
  t('SQL: a Boolean field on its own in WHERE', Q.run('SELECT ContractNumber FROM Contract WHERE News AND Sport;', tabs).rows, [[1]]);
  t('SQL: WHERE News = TRUE gives the same', sc('sql', { query: 'SELECT ContractNumber FROM Contract WHERE News AND Sport;', tables: tabs }, { code: 'SELECT ContractNumber FROM Contract WHERE News = TRUE AND Sport = TRUE;' }, 2), 2); }
{ const a = { selfmark: true, checklist: ['loop', 'total', { text: 'output', marks: 2 }] };
  t('self-marked: before ticking, the status asks for it', M.mark('code', a, { code: 'OUTPUT 1' }, { marks: 4 }).status, 'self_check');
  t('self-marked: ticks add up (a point can be worth 2)', sc('code', a, { code: 'x', ticks: [0, 2] }, 4), 3);
  t('self-marked: never above the marks', sc('code', a, { code: 'x', self: 9 }, 4), 4); }
{ const a = { mode: 'trace', columns: { 0: ['1', '2'] }, headers: ['Count'] }, v = { cells: { r1c0: '1', r2c0: '3' } };
  const r = M.mark('table', a, v, { marks: 1 }); t('trace feedback names the column and the right values', M.explain('table', a, v, r, { marks: 1 })[0].text, 'Column Count: should read 1, 2; yours reads 1, 3.'); }

// circuits read again on the server from parts and wires; a printed figure to complete
{ const fig = { components: [{ id: 'c1', type: 'cell', x: 0, y: 0, rot: 0, given: true }, { id: 'c2', type: 'resistor', label: '4.0 Ω', x: 0, y: 0, rot: 0, given: true },
    { id: 'n3', type: 'node', label: 'A', given: true }, { id: 'n4', type: 'node', label: 'B', given: true }],
    wires: [{ a: 'c1:a', b: 'c2:a' }, { a: 'c2:b', b: 'n3:a' }, { a: 'n4:a', b: 'c1:b' }] };
  const q = { marks: 2, config: { circuit: fig } };
  const key = { criteria: [{ name: 'ammeter in gap AB', marks: 1, rules: [{ between: { type: 'ammeter', at: ['A', 'B'] } }] },
    { name: 'voltmeter across 4.0 Ω', marks: 1, rules: [{ across: { meter: 'voltmeter', of: [{ type: 'resistor', label: '4.0 Ω' }] } }] }] };
  const amm = [{ id: 'c9', type: 'ammeter' }], aw = [{ a: 'c9:a', b: 'n3:a' }, { a: 'c9:b', b: 'n4:a' }];
  t('circuit: gap and voltmeter right', M.mark('circuit', key, { components: amm.concat([{ id: 'c10', type: 'voltmeter' }]), wires: aw.concat([{ a: 'c10:a', b: 'c2:a' }, { a: 'c10:b', b: 'c2:b' }]) }, q).score, 2);
  t('circuit: voltmeter across the cell', M.mark('circuit', key, { components: amm.concat([{ id: 'c10', type: 'voltmeter' }]), wires: aw.concat([{ a: 'c10:a', b: 'c1:a' }, { a: 'c10:b', b: 'c1:b' }]) }, q).score, 1);
  t('circuit: the printed parts cannot be changed by the answer', M.mark('circuit', key, { components: [{ id: 'c2', type: 'voltmeter' }], wires: [] }, q).status, 'marked');
  t('circuit: nothing added', M.mark('circuit', key, { components: [], wires: [] }, q).status, 'unanswered');
  const led = { criteria: [{ name: 'series', marks: 1, rules: [{ series: ['source', 'led', 'resistor'] }] }, { name: 'way round', marks: 1, rules: [{ forward: 'led' }] }] };
  const sc = (a, b) => ({ components: [{ id: 'c1', type: 'cell' }, { id: 'c2', type: 'led' }, { id: 'c3', type: 'resistor' }], wires: [{ a: 'c1:a', b: a }, { a: b, b: 'c3:a' }, { a: 'c3:b', b: 'c1:b' }] });
  t('circuit: LED forward', M.mark('circuit', led, sc('c2:a', 'c2:b'), { marks: 2 }).score, 2);
  t('circuit: LED backwards still in series', M.mark('circuit', led, sc('c2:b', 'c2:a'), { marks: 2 }).score, 1);
  t('circuit: open loop', M.mark('circuit', led, { components: sc('c2:a', 'c2:b').components, wires: sc('c2:a', 'c2:b').wires.slice(0, 2) }, { marks: 2 }).score, 0);
  const par = { criteria: [{ name: 'parallel', marks: 1, rules: [{ acrossSource: ['lamp', 'lamp'] }] }] };
  const pv = { components: [{ id: 'c1', type: 'ac' }, { id: 'c2', type: 'lamp' }, { id: 'c3', type: 'lamp' }], wires: [{ a: 'c1:a', b: 'c2:a' }, { a: 'c2:b', b: 'c1:b' }, { a: 'c1:a', b: 'c3:a' }, { a: 'c3:b', b: 'c1:b' }] };
  t('circuit: lamps across the supply', M.mark('circuit', par, pv, { marks: 1 }).score, 1);
  t('circuit: lamps in series are not across the supply', M.mark('circuit', par, { components: pv.components, wires: [{ a: 'c1:a', b: 'c2:a' }, { a: 'c2:b', b: 'c3:a' }, { a: 'c3:b', b: 'c1:b' }] }, { marks: 1 }).score, 0); }
t('symbol: right', M.mark('symbol', { symbol: 'ldr' }, { symbol: 'ldr' }, { marks: 1 }).score, 1);
t('symbol: thermistor is not an LDR', M.mark('symbol', { symbol: 'ldr' }, { symbol: 'thermistor' }, { marks: 1 }).score, 0);
t('symbol: name needed too', M.mark('symbol', { symbol: 'variable', names: ['variable resistor'] }, { symbol: 'variable', name: 'resistor' }, { marks: 1 }).score, 0);

// dot-and-cross from a mark scheme: printed atoms, a criterion per line
{ const cfg = { atoms: [{ id: 'a1', element: 'O', x: 132, y: 60 }, { id: 'a2', element: 'C', x: 60, y: 60 }, { id: 'a3', element: 'O', x: -12, y: 60 }] };
  const key = { mol: { bonds: [['C', 'O', 4], ['C', 'O', 4]], lone: { C: [0], O: [4, 4] }, links: [['a1', 'a2'], ['a2', 'a3']] },
    criteria: [{ name: 'double bonds', marks: 1, rules: [{ bonds: 'double' }] }, { name: 'non-bonding', marks: 1, rules: [{ lone: ['C', 'O'] }] }] };
  const sl = (t, b, l, r) => ({ top: t, bottom: b, left: l, right: r });
  const right = { atoms: [{ id: 'a1', element: 'O', slots: sl(['dot', 'dot'], ['dot', 'dot'], ['dot', 'dot'], []) }, { id: 'a2', element: 'C', slots: sl([], [], ['cross', 'cross'], ['cross', 'cross']) },
    { id: 'a3', element: 'O', slots: sl(['dot', 'dot'], ['dot', 'dot'], [], ['dot', 'dot']) }] };
  t('dot-and-cross: CO2 right', M.mark('lewis', key, right, { marks: 2, config: cfg }).score, 2);
  const single = JSON.parse(JSON.stringify(right)); single.atoms[1].slots = sl([], [], ['cross'], ['cross']); single.atoms[0].slots.left = ['dot']; single.atoms[2].slots.right = ['dot'];
  t('dot-and-cross: single bonds instead of double (octets not complete either)', M.mark('lewis', key, single, { marks: 2, config: cfg }).score, 0);
  t('dot-and-cross: printed atoms only', M.mark('lewis', key, { atoms: [{ id: 'a1', element: 'O', slots: sl([], [], [], []) }] }, { marks: 2, config: cfg }).status, 'unanswered');
  const ion = { mol: { ionic: true, ions: { Mg: '2+', Cl: '-' }, electrons: { Mg: 8, Cl: 8 }, counts: { Mg: 1, Cl: 2 } },
    criteria: [{ name: 'Mg', marks: 1, rules: [{ shell: 'Mg' }] }, { name: 'Cl', marks: 1, rules: [{ shell: 'Cl' }] }, { name: 'charges', marks: 1, rules: [{ charges: true }] }] };
  const x8 = sl(['cross', 'cross'], ['cross', 'cross'], ['cross', 'cross'], ['cross', 'cross']), cl = sl(['dot', 'dot'], ['dot', 'dot'], ['dot', 'dot'], ['dot', 'cross']);
  const icfg = { config: { atoms: [{ id: 'a1', element: 'Mg', x: 0, y: 0 }, { id: 'a2', element: 'Cl', x: 170, y: 0 }, { id: 'a3', element: 'Cl', x: 340, y: 0 }] }, marks: 3 };
  t('ionic: right', M.mark('lewis', ion, { atoms: [{ id: 'a1', element: 'Mg', charge: '2+', slots: x8 }, { id: 'a2', element: 'Cl', charge: '-', slots: cl }, { id: 'a3', element: 'Cl', charge: '−', slots: cl }] }, icfg).score, 3);
  t('ionic: gained electron not shown', M.mark('lewis', ion, { atoms: [{ id: 'a1', element: 'Mg', charge: '2+', slots: x8 }, { id: 'a2', element: 'Cl', charge: '-', slots: sl(['dot', 'dot'], ['dot', 'dot'], ['dot', 'dot'], ['dot', 'dot']) }, { id: 'a3', element: 'Cl', charge: '-', slots: cl }] }, icfg).score, 2); }
// displayed formula from a mark scheme
{ const C = (id, e) => ({ id, element: e }), B = (f, t, o) => ({ from: f, to: t, order: o || 1 });
  const ethanol = { atoms: [C(1, 'C'), C(2, 'C'), C(3, 'O'), C(4, 'H'), C(5, 'H'), C(6, 'H'), C(7, 'H'), C(8, 'H'), C(9, 'H')], bonds: [B(1, 2), B(2, 3), B(3, 9), B(1, 4), B(1, 5), B(1, 6), B(2, 7), B(2, 8)] };
  const key = { model: ethanol, names: ['ethanol'], criteria: [{ name: 'name', marks: 1, rules: [{ name: true }] }, { name: 'alcohol group', marks: 1, rules: [{ alcohol: true }] }, { name: 'structure', marks: 1, rules: [{ same: true }] }] };
  t('structure: all right', M.mark('structure', key, Object.assign({ name: 'Ethanol' }, ethanol), { marks: 3 }).score, 3);
  const meoch3 = { atoms: ethanol.atoms, bonds: [B(1, 3), B(2, 3), B(1, 4), B(1, 5), B(1, 6), B(2, 7), B(2, 8), B(2, 9)] };
  t('structure: an ether is not an alcohol', M.mark('structure', key, Object.assign({ name: 'ethanol' }, meoch3), { marks: 3 }).score, 1); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
