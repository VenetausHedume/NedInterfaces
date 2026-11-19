/* Subject check: real questions from the March 2017 papers (all six subjects), converted the way the converter will
   convert them, and answered the way students really write: the mark-scheme answer, other wordings, typos, symbols
   instead of words, half-right answers and common mistakes. Each expected mark is what a fair examiner would give.
   Run: node tests/subjects.test.js            (add -v to list every case) */
const M = require('../marking/builders.js');
const verbose = process.argv.includes('-v');
let pass = 0, fail = 0; const fails = []; const per = {};
const SUBJ = { '0610': 'Biology', '0620': 'Chemistry', '0625': 'Physics', '0580': 'Maths', '0478': 'Computer Science', '0455': 'Economics' };
function q(id, ui, marks, answer, tries, config, text) {
  const s = id.slice(0, 4); per[s] = per[s] || { pass: 0, fail: 0 };
  tries.forEach(([value, want, note]) => {
    const r = M.mark(ui, answer, value, { marks, config: config || {}, text: text || '' });
    const ok = r.score === want;
    if (ok) { pass++; per[s].pass++; } else { fail++; per[s].fail++; fails.push(`${id} [${note || JSON.stringify(value).slice(0, 60)}] got ${r.score}/${marks}, examiner ${want}`); }
    if (verbose || !ok) console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${note || ''}: ${r.score}/${marks} (examiner ${want})`);
  });
}
const T = s => ({ latex: s });                 // a typed answer
const P = (...pts) => ({ points: pts });        // one box per point
const F = (answer, unit, working) => ({ formula: working || '', answer, unit: unit || '' });

/* ─────────── Biology 0610 ─────────── */
q('0610 Q1(a)(i) heart labels', 'label', 3, { labels: { L: { alts: ['atrioventricular valve', 'bicuspid valve', 'mitral valve'] }, M: 'septum', O: { alts: ['semilunar valve', 'semi-lunar valve', 'aortic valve'] } } }, [
  [{ labels: { L: 'bicuspid valve', M: 'septum', O: 'semi-lunar valve' } }, 3, 'other names'],
  [{ labels: { L: 'atrioventricular vlave', M: 'Septum', O: 'semilunar valve' } }, 3, 'typo and capital'],
  [{ labels: { L: 'valve', M: 'septum', O: 'aorta' } }, 1, '"valve" alone, wrong O'],
]);
q('0610 Q1(a)(ii) letters', 'table', 3, { cells: { r1c1: { alts: ['N', 'P'], exact: true }, r2c1: { alts: ['J', 'K'], exact: true }, r3c1: { alts: ['J'], exact: true } } }, [
  [{ cells: { r1c1: 'N', r2c1: 'K', r3c1: 'J' } }, 3, 'right letters'],
  [{ cells: { r1c1: 'p', r2c1: 'J', r3c1: 'K' } }, 2, 'lower-case letter, one wrong'],
]);
q('0610 Q2(a) prokaryotes', 'text', 2, { points: [{ alts: ['no nucleus', 'does not have a nucleus'] }, { alts: ['cell wall'] }, { alts: ['loop of DNA', 'circular DNA'] }, { alts: ['plasmid', 'plasmids'] }], need: 2 }, [
  [T('they have no nucleus and a cell wall'), 2, 'mark-scheme words'],
  [T("they don't have a nucleus and they have plasmids"), 2, "don't have"],
  [T('no nucleus, they contain DNA'), 1, 'DNA alone is not enough'],
  [T('they have a nucleus'), 0, 'opposite'],
]);
q('0610 Q4(a) photosynthesis needs', 'text', 2, { points: [{ alts: ['carbon dioxide'] }, { alts: ['light', 'light energy', 'sunlight'] }, { alts: ['chlorophyll'] }], need: 2 }, [
  [T('carbon dioxide and light'), 2],
  [T('CO_2 and sunlight'), 2, 'formula for carbon dioxide'],
  [T('oxygen and glucose'), 0, 'products, not needs'],
]);
q('0610 Q4(b) % loss', 'formula', 2, { final: [{ value: 15, unit: '%', units: ['%', ''] }], method: ['2/13*100'] }, [
  [F('15', '%'), 2],
  [F('15', '', '\\frac{2}{13}\\times100'), 2, 'no % sign'],
  [F('15.38', '%', '2/13 × 100'), 1, 'not to the nearest whole number, working shown'],
  [F('85', '%'), 0, 'remaining, not lost'],
]);
q('0610 Q5(a)(i) fermentation equation', 'text', 2, { equation: 'C6H12O6 → 2C2H5OH + 2CO2' }, [
  [T('C_6H_{12}O_6\\rightarrow2C_2H_5OH+2CO_2'), 2],
  [T('C6H12O6 -> C2H5OH + CO2'), 1, 'not balanced'],
  [T('glucose → ethanol + carbon dioxide'), 0, 'word equation where symbols asked'],
]);
q('0610 Q5(c)(ii) enzyme factor', 'text', 1, { points: [{ alts: ['pH'] }], need: 1 }, [
  [T('pH'), 1], [T('PH'), 1, 'capital P'], [T('the ph'), 1, 'lower case'], [T('light'), 0],
]);
q('0610 Q5(d)(i) gene', 'text', 2, { points: [{ alts: ['length of DNA', 'section of DNA', 'part of DNA'] }, { alts: ['codes for a protein', 'code for a protein'] }], need: 2 }, [
  [T('a section of DNA that codes for a protein'), 2],
  [T('a length of DNA'), 1],
  [T('a part of a chromosome'), 0],
]);
q('0610 Q6(d) PEM disease', 'text', 1, { points: [{ alts: ['marasmus', 'kwashiorkor'] }], need: 1 }, [
  [T('kwashiorkor'), 1], [T('kwashiorkar'), 1, 'typo'], [T('scurvy'), 0],
]);
q('0610 Q3(d) genetic diagram offspring', 'table', 4, { cells: { r1c1: 'XBXb', r1c2: 'XBXb', r1c3: 'XbY', r1c4: 'XbY' } }, [
  [{ cells: { r1c1: 'X^BX^b', r1c2: 'X^BX^b', r1c3: 'X^bY', r1c4: 'X^bY' } }, 4, 'typed with superscripts'],
  [{ cells: { r1c1: 'XbXB', r1c2: 'XBXb', r1c3: 'YXb', r1c4: 'XbY' } }, 4, 'alleles either way round'],
  [{ cells: { r1c1: 'XBXB', r1c2: 'XbXb', r1c3: 'XBY', r1c4: 'XbY' } }, 1, 'wrong genotypes'],
]);
q('0610 Q2(d)(ii) starch result', 'text', 1, { points: [{ alts: ['blue-black', 'blue black', 'black'] }], need: 1 }, [
  [T('blue-black'), 1], [T('it turns blue/black'), 1, 'slash'], [T('purple'), 0], [T('orange to blue black'), 1],
]);
q("0610 Q2(d)(iii) Benedict's", 'text', 2, { points: [{ alts: ["Benedict's", "Benedict's solution", "Benedict's reagent"] }, { alts: ['heat', 'warm', 'water bath'] }], need: 2 }, [
  [T('add benedicts solution and heat it in a water bath'), 2, 'no apostrophe'],
  [T("add Benedict's and wait"), 1],
  [T('add iodine'), 0],
]);
q('0610 Q4(c)(ii) water into roots', 'prose', 3, { points: [{ alts: ['by osmosis', 'osmosis'] }, { alts: ['soil has a higher water potential than the root cells', 'higher water potential in the soil'] }, { alts: ['from higher water potential to lower water potential', 'down a water potential gradient'] }, { alts: ['across a partially permeable membrane'] }, { alts: ['root hair cell', 'root hairs'] }] }, [
  [P('water enters by osmosis', 'through the root hair cells', 'across a partially permeable membrane'), 3],
  [P('osmosis', 'the soil has a higher water potential than the root'), 2],
  [P('the roots suck up water'), 0, 'no science'],
]);

/* ─────────── Chemistry 0620 ─────────── */
q('0620 Q1(b)(i) fraction', 'text', 1, { points: [{ alts: ['bitumen'] }], need: 1 }, [[T('Bitumen'), 1], [T('bitumin'), 1, 'typo'], [T('diesel'), 0]]);
q('0620 Q1(a)(vi) combustion products', 'text', 1, { points: [{ require: ['carbon dioxide', 'water'] }], need: 1 }, [
  [T('carbon dioxide and water'), 1], [T('CO_2 and H_2O'), 1, 'formulae'], [T('carbon dioxide'), 0, 'only one'], [T('carbon monoxide and water'), 0, 'incomplete combustion'],
]);
q('0620 Q2(b)(i) charge', 'text', 1, { points: [{ alts: ['2-', '-2'] }], need: 1 }, [[T('2-'), 1], [T('-2'), 1], [T('2−'), 1, 'unicode minus'], [T('2+'), 0]]);
q('0620 Q2(b)(ii) ionic equation', 'text', 1, { equation: '2Ag+ + Cr2O7 2- → Ag2Cr2O7' }, [
  [T('2Ag^++Cr_2O_7^{2-}\\rightarrow Ag_2Cr_2O_7'), 1], [T('Ag^++Cr_2O_7^{2-}\\rightarrow Ag_2Cr_2O_7'), 0, 'not balanced'],
]);
q('0620 Q2(e)(ii) decomposition equation', 'text', 2, { equation: '(NH4)2Cr2O7 → N2 + Cr2O3 + 4H2O' }, [
  [T('(NH_4)_2Cr_2O_7\\rightarrow N_2+Cr_2O_3+4H_2O'), 2], [T('(NH4)2Cr2O7 → N2 + Cr2O3 + H2O'), 1, 'not balanced'], [T('(NH4)2Cr2O7 → N2 + CrO + H2O'), 0, 'wrong oxide'],
]);
q('0620 Q4(b)(ii) cathode', 'text', 2, { equation: 'Cu2+ + 2e- → Cu' }, [[T('Cu^{2+}+2e^-\\rightarrow Cu'), 2], [T('Cu2+ + 2e- -> Cu'), 2, 'typed plainly'], [T('Cu → Cu2+ + 2e-'), 0, 'anode reaction']]);
q('0620 Q5(d)(ii) roasting', 'text', 1, { equation: '2ZnS + 3O2 → 2ZnO + 2SO2' }, [[T('2ZnS+3O_2\\rightarrow2ZnO+2SO_2'), 1], [T('ZnS + 1.5O2 → ZnO + SO2'), 1, 'halves are balanced too'], [T('ZnS + O2 → ZnO + SO2'), 0]]);
q('0620 Q6(a)(i) moles', 'formula', 2, { final: [{ value: 0.0508, unit: 'mol', units: ['mol', ''] }], method: ['197', '10/197'] }, [
  [F('0.0508', 'mol'), 2], [F('0.051', 'mol'), 2, '2 s.f.'], [F('5.08 \\times 10^{-2}', 'mol'), 2, 'standard form'], [F('0.05', 'mol', '10.0/197'), 1, '1 s.f., working shown'],
]);
q('0620 Q7(c)(i) empirical formula', 'formula', 3, { final: [{ text: ['C3H4O4', 'C3O4H4'] }], method: ['2.885', '1.33'] }, [
  [F('C_3H_4O_4'), 3], [F('C3O4H4'), 3, 'other order'], [F('c3h4o4'), 0, 'not a formula in lower case'], [F('CH1.33O1.33', '', '2.885 : 3.846 : 3.85'), 2, 'ratio not whole numbers (M1, M2)'],
]);
q('0620 Q3(a) equilibrium', 'text', 2, { points: [{ alts: ['forward and backward reactions occur at equal rates', 'rate of forward reaction equals rate of backward reaction'] }, { alts: ['concentrations remain constant', 'amounts remain constant'] }, { alts: ['closed system'] }], need: 2 }, [
  [T('the forward and reverse reactions happen at the same rate and the concentrations stay the same'), 2, 'reverse / same / stay the same'],
  [T('rate of forward reaction = rate of backward reaction'), 1, 'equals sign'],
  [T('the reaction has stopped'), 0],
]);
q('0620 Q3(b) temperature and rate', 'prose', 3, { points: [{ alts: ['particles have more energy', 'particles move faster'] }, { alts: ['more collisions per second', 'greater collision rate', 'more frequent collisions'] }, { alts: ['more particles have energy greater than the activation energy', 'more successful collisions'] }] }, [
  [P('particles move faster', 'more collisions per second', 'more particles have energy above the activation energy'), 3],
  [P('particles have more kinetic energy', 'they collide more often', 'more collisions are successful'), 3, 'collide more often / successful'],
  [P('it gets hotter'), 0],
]);
q('0620 Q2(a) pure dry solid', 'prose', 3, { points: [{ alts: ['filter'] }, { alts: ['wash the residue with water', 'wash with water'] }, { alts: ['dry'] }] }, [
  [P('filter the mixture', 'wash the solid with distilled water', 'leave it to dry on a warm windowsill'), 3],
  [P('filtration', 'rinse it with water', 'dry it in an oven'), 3, 'filtration / rinse / oven'],
  [P('evaporate the water', 'crystallise'), 0, 'method for a soluble salt'],
]);
q('0620 Q3(c) temperature and equilibrium', 'text', 2, { points: [{ alts: ['equilibrium moves left', 'shifts to the left', 'yield decreases'], reject: ['right'] }, { alts: ['forward reaction is exothermic', 'reverse reaction is endothermic', 'backward reaction is endothermic'] }], need: 2 }, [
  [T('it shifts to the left because the forward reaction is exothermic'), 2],
  [T('moves left, the backward reaction is endothermic'), 2],
  [T('it moves to the right'), 0],
], {}, 'State and explain the effect, if any, of increasing the temperature on the position of equilibrium.');
q('0620 Q5(d)(iii) sulfur dioxide', 'text', 2, { points: [{ alts: ['forms acid rain', 'acid rain'] }, { alts: ['kills trees', 'kills plants'] }, { alts: ['kills fish'] }, { alts: ['damages buildings', 'damages statues', 'erodes limestone'] }, { alts: ['breathing difficulties', 'breathing problems', 'asthma'] }], need: 2 }, [
  [T('it causes acid rain which damages buildings'), 2], [T('it is toxic and causes asthma'), 1], [T('it causes global warming'), 0, 'a common wrong answer'],
]);
q('0620 electronic configuration', 'text', 1, { points: [{ alts: ['2,8,3'] }], need: 1 }, [[T('2,8,3'), 1], [T('2.8.3'), 1, 'dots'], [T('2, 8, 3'), 1, 'spaces'], [T('2,8,8,3'), 0]]);

/* ─────────── Physics 0625 ─────────── */
q('0625 Q2(b)(i) change of momentum', 'formula', 2, { final: [{ value: 9000, unit: 'kg m/s', units: ['kg m/s', 'N s', 'Ns', 'kgm/s'], abs: true }], method: ['1200*7.5'] }, [
  [F('9000', 'kg m/s'), 2], [F('-9000', 'N s'), 2, 'negative, N s'], [F('9000', 'Ns'), 2, 'Ns'], [F('9 \\times 10^3', 'kg\\,m\\,s^{-1}'), 2, 'kg m s⁻¹'], [F('9000', 'N', '1200 × 7.5'), 1, 'wrong unit'],
]);
q('0625 Q2(b)(ii) average force', 'formula', 2, { final: [{ value: 25000, unit: 'N' }], method: ['9000/0.36'] }, [
  [F('25000', 'N'), 2], [F('25 000', 'N'), 2, 'space as thousands separator'], [F('2.5\\times10^4', 'N'), 2], [F('25', 'kN'), 2, 'kN'], [F('25000', ''), 1, 'no unit'],
]);
q('0625 Q4(c) temperature range', 'formula', 1, { final: [{ lo: 24, hi: 26, unit: '°C', units: ['°C', 'C', ''] }] }, [[F('25', '°C'), 1], [F('25', ''), 1, 'no unit'], [F('27', '°C'), 0]]);
q('0625 Q3(a)(i) no acceleration', 'text', 1, { points: [{ alts: ['no resultant force', 'no net force', 'forces are balanced', 'forces cancel', 'resultant force is zero'] }], need: 1 }, [
  [T('the forces are balanced'), 1], [T('resultant force is zero'), 1], [T('net force = 0'), 1, '= 0'], [T('there are no forces'), 0, 'wrong physics'],
]);
q('0625 Q6(a) radiation types', 'text', 1, { points: [{ require: [['visible', 'light'], ['infrared']] }], need: 1 }, [
  [T('light and infra-red'), 1], [T('visible and IR'), 1, 'IR'], [T('infrared'), 0, 'only one'], [T('ultraviolet and light'), 0],
]);
q('0625 Q8(a)(i) coil material', 'text', 2, { points: [{ alts: ['copper'] }, { alts: ['low resistance', 'good conductor', 'good electrical conductor'] }], need: 2 }, [
  [T('copper because it has a low resistance'), 2], [T('copper, it is a good conductor of electricity'), 2], [T('iron'), 0],
]);
q('0625 Q9(b)(i) resistance', 'formula', 3, { final: [{ value: 11.1, unit: 'Ω', units: ['Ω', 'ohm', 'ohms'] }], method: ['8.0/0.72', 'V/I'] }, [
  [F('11', 'Ω'), 3, '2 s.f.'], [F('11.1', 'ohms'), 3, 'ohms in words'], [F('11.11', '\\Omega'), 3, 'Ω typed in LaTeX'], [F('5.76', 'Ω', '8 × 0.72'), 0, 'multiplied'],
]);
q('0625 Q9(b)(ii) power', 'formula', 2, { final: [{ lo: 5.7, hi: 5.8, unit: 'W' }], method: ['0.72*8'] }, [[F('5.76', 'W'), 2], [F('5.8', 'W'), 2], [F('5.76', 'J'), 1, 'wrong unit']]);
q('0625 Q5(a)(i) evaporation and boiling', 'text', 2, { points: [{ alts: ['evaporation takes place at any temperature', 'boiling occurs at a fixed temperature'] }, { alts: ['evaporation takes place at the surface', 'boiling occurs throughout the liquid'] }, { alts: ['no bubbles in evaporation', 'bubbles in boiling'], require: ['bubbles'] }, { alts: ['evaporation cools the liquid'] }], need: 2 }, [
  [T('evaporation happens at any temperature but boiling only at the boiling point, and evaporation only happens at the surface'), 2],
  [T('boiling makes bubbles'), 1], [T('boiling is faster'), 0],
]);

/* ─────────── Maths 0580 ─────────── */
q('0580 Q1 expand and simplify', 'formula', 2, { final: [{ expr: '18w+14', form: 'expanded' }], method: ['20w+12', '-2w+2'] }, [
  [F('18w+14'), 2], [F('14+18w'), 2, 'other order'], [F('4(5w+3)-2(w-1)'), 0, 'question copied'], [F('22w+10', '', '20w+12-2w-2'), 1, 'sign slip, one bracket right'],
]);
q('0580 Q10 original price', 'formula', 3, { final: [{ value: 1050, unit: '$', units: ['$', ''] }], method: ['924/0.88', '924/88*100'] }, [
  [F('1050'), 3], [F('\\$1050'), 3, 'with $'], [F('1050.00'), 3], [F('1034.88', '', '924 × 1.12'), 0, 'common wrong method'], [F('1060', '', '924/0.88'), 1, 'right method, slip'],
]);
q('0580 Q12 inverse proportion', 'formula', 3, { final: [{ value: 4 }], method: ['y=k/x^2', '400'] }, [[F('4'), 3], [F('y=4'), 3, 'y ='], [F('64'), 0]]);
q('0580 Q13(a) factorise', 'formula', 2, { final: [{ expr: '5c(3c-1)' }] }, [
  [F('5c(3c-1)'), 2], [F('5c\\left(3c-1\\right)'), 2, 'MathLive brackets'], [F('c(15c-5)'), 1, 'partly factorised'], [F('15c^2-5c'), 0, 'not factorised'],
]);
q('0580 Q13(b) factorise fully', 'formula', 2, { final: [{ expr: '(2p-m)(k+3)' }] }, [[F('(k+3)(2p-m)'), 2, 'other order'], [F('k(2p-m)+3(2p-m)'), 1, 'one step left'], [F('(2p+m)(k+3)'), 0]]);
q('0580 Q15(a) indices', 'formula', 1, { final: [{ expr: 't^20' }] }, [[F('t^{20}'), 1], [F('t^{24}'), 0]]);
q('0580 Q6 recurring decimal', 'formula', 2, { final: [{ value: 8 / 45, exact: true }] }, [[F('\\frac{8}{45}'), 2], [F('16/90'), 2, 'not simplified, still exact'], [F('0.18'), 0, 'decimal rounded']]);
q('0580 Q19(a) area', 'formula', 2, { final: [{ lo: 11.4, hi: 11.41, unit: 'cm²', units: ['cm²', 'cm^2', ''] }] }, [[F('11.4', 'cm^2'), 2], [F('11.40'), 2], [F('11.5'), 0]]);
q('0580 Q20(a) equation of a line', 'formula', 3, { final: [{ expr: 'y=-2x+3' }], method: ['-2'] }, [[F('y=-2x+3'), 3], [F('y = 3 - 2x'), 3, 'other order'], [F('y=2x+3', '', 'gradient = -2'), 1, 'sign lost, gradient worked out']]);
q('0580 Q20(b) perpendicular line', 'formula', 3, { final: [{ expr: 'y=x/2-5/2' }] }, [
  [F('y=\\frac{1}{2}x-\\frac{5}{2}'), 3], [F('y=0.5x-2.5'), 3, 'decimals'], [F('y=\\frac{x-5}{2}'), 3, 'one fraction (oe)'], [F('y=-2x+5'), 0],
]);
q('0580 Q16(b) distance in km', 'formula', 3, { final: [{ value: 0.45, unit: 'km', units: ['km'], strict: true }] }, [[F('0.45', 'km'), 3], [F('450', 'm'), 2, 'metres when km asked']]);

/* ─────────── Computer Science 0478 ─────────── */
q('0478 Q8(a) binary to denary and hex', 'table', 2, { cells: { r1c1: '55', r2c1: '37' } }, [[{ cells: { r1c1: '55', r2c1: '37' } }, 2], [{ cells: { r1c1: '55', r2c1: '0x37' } }, 2, '0x prefix'], [{ cells: { r1c1: '55', r2c1: '55' } }, 1]]);
q('0478 Q8(b) ASCII 7', 'table', 3, { cells: { r1c1: { alts: ['00111001', '111001'], exact: true }, r2c1: '57', r3c1: '39' } }, [
  [{ cells: { r1c1: '00111001', r2c1: '57', r3c1: '39' } }, 3], [{ cells: { r1c1: '0011 1001', r2c1: '57', r3c1: '39' } }, 3, 'nibbles spaced'], [{ cells: { r1c1: '00000111', r2c1: '7', r3c1: '7' } }, 0, 'value 7, not the ASCII code'],
]);
q('0478 Q3(c) error check', 'text', 1, { points: [{ alts: ['checksum', 'ARQ', 'automatic repeat request', 'check digit', 'echo check'] }], need: 1 }, [
  [T('checksum'), 1], [T('check sum'), 1, 'two words'], [T('Automatic Repeat reQuest'), 1], [T('parity check'), 0, 'excluded by the question'],
]);
q('0478 Q3(b) parity', 'table', 2, { cells: { r1c1: { alts: ['odd'] }, r2c1: { alts: ['even'] } } }, [[{ cells: { r1c1: 'Odd', r2c1: 'even' } }, 2], [{ cells: { r1c1: 'even', r2c1: 'odd' } }, 0]]);
q('0478 Q5(b) WHILE vs REPEAT', 'prose', 4, { points: [{ alts: ['WHILE has the condition checked at the start', 'WHILE is pre-condition', 'pre-test'] }, { alts: ['WHILE may never run', 'may not run at all'] }, { alts: ['REPEAT has the condition checked at the end', 'REPEAT is post-condition', 'post-test'] }, { alts: ['REPEAT always runs at least once', 'will always run at least once'] }] }, [
  [P('WHILE checks the condition at the start', 'so the loop might never run', 'REPEAT checks the condition at the end', 'so it always runs at least once'), 4],
  [P('WHILE is a pre-condition loop', 'REPEAT UNTIL is a post-condition loop'), 2],
], {}, 'Explain the differences between a WHILE … DO … ENDWHILE and a REPEAT … UNTIL loop.');
q('0478 Q12(b) why hexadecimal', 'text', 2, { points: [{ alts: ['easier for programmers to read and understand', 'easier to read', 'easier to understand'] }, { alts: ['easier to find errors', 'easier to debug'] }, { alts: ['shorter than binary', 'fewer digits', 'takes up less screen space'] }, { alts: ['easy to convert to binary'] }], need: 2 }, [
  [T('it is easier for humans to read and uses fewer digits than binary'), 2], [T('it is quicker for the computer'), 0, 'a common wrong idea'],
]);
q('0478 logic expression', 'text', 2, { logic: '(A AND B) OR NOT C' }, [[T('X = (A AND B) OR (NOT C)'), 2], [T('X = A.B + ¬C'), 2, 'Boolean symbols'], [T('X = A AND B OR C'), 1, 'the A AND B part is right: Cambridge gives a mark per correct part'], [T('X = A OR C'), 0]]);
q('0478 pseudocode average', 'code', 4, { tests: [{ input: [4, 6, 8, -1], expect: [6] }, { input: [10, -1], expect: [10] }], features: ['loop', 'input', 'totalling', 'counting'] }, [
  [{ code: 'Total <- 0\nCount <- 0\nINPUT N\nWHILE N <> -1 DO\n  Total <- Total + N\n  Count <- Count + 1\n  INPUT N\nENDWHILE\nOUTPUT Total / Count' }, 4, 'pseudocode'],
  [{ lang: 'python', code: 'total = 0\ncount = 0\nn = int(input())\nwhile n != -1:\n    total += n\n    count += 1\n    n = int(input())\nprint(total / count)' }, 4, 'Python (prints 6.0)'],
  [{ code: 'Total <- 0\nCount <- 0\nREPEAT\n  INPUT N\n  Total <- Total + N\n  Count <- Count + 1\nUNTIL N = -1\nOUTPUT Total / Count' }, 3, 'counts the -1 too: features only'],
]);
q('0478 SQL', 'sql', 2, { query: 'SELECT Name FROM Pupils WHERE Age > 14 ORDER BY Name' }, [
  [{ code: 'SELECT Name FROM Pupils WHERE Age > 14 ORDER BY Name' }, 2], [{ code: 'select name from pupils where age>14 order by name;' }, 2, 'lower case, semicolon'], [{ code: 'SELECT Name FROM Pupils WHERE Age > 14' }, 1, 'not sorted'],
], { tables: { Pupils: { columns: ['Name', 'Age'], rows: [['Zoe', 15], ['Ali', 16], ['Max', 13], ['Bea', 14]] } } });

/* ─────────── Economics 0455 ─────────── */
q('0455 Q1(c)(i) percentage', 'formula', 2, { final: [{ value: 22, unit: '%', units: ['%', ''] }], method: ['6160/28000*100'] }, [
  [F('22', '%'), 2], [F('22\\%'), 2, '% typed in the answer'], [F('21.9', '%'), 2, 'not rounded'], [F('0.22', '', '6160/28000'), 0, 'proportion, not % (the mark scheme working needs × 100)'],
]);
q('0455 Q1(c)(ii) PED change', 'formula', 2, { final: [{ value: 18, unit: '%', units: ['%', ''] }], method: ['1.2*15'] }, [[F('18', '%'), 2], [F('+18%'), 2], [F('12.5', '%', '15/1.2'), 0, 'divided']]);
q('0455 Q2(a) business goals', 'text', 2, { points: [{ alts: ['profit maximisation', 'make a profit', 'profit'] }, { alts: ['growth', 'expand', 'grow'] }, { alts: ['survival', 'survive'] }, { alts: ['sales revenue maximisation', 'maximise sales'] }, { alts: ['social responsibility'] }], need: 2 }, [
  [T('profit maximisation and growth'), 2], [T('to make a profit and to grow bigger'), 2, 'grow'], [T('to survive and to expand'), 2], [T('to pay workers'), 0],
]);
q('0455 Q3(a) capital vs land', 'text', 2, { points: [{ alts: ['capital is human-made goods used to produce other products', 'capital is man-made'] }, { alts: ['land is a natural resource', 'land is natural'] }], need: 2 }, [
  [T('capital is man-made but land is natural'), 2], [T('Capital is made by people, land is a gift of nature'), 2, 'made by people / gift of nature'], [T('capital is money'), 0, 'common mistake'],
]);
q('0455 Q5(a) balance of payments', 'text', 2, { points: [{ alts: ['record of economic transactions', 'record of transactions'] }, { alts: ['with other countries', 'with the rest of the world'] }], need: 2 }, [
  [T('a record of all economic transactions with other countries'), 2], [T('record of a country’s transactions with the rest of the world'), 2], [T('exports minus imports'), 0, 'trade balance only (mark scheme gives 1 elsewhere)'],
]);
q('0455 Q2(b) commercial bank', 'prose', 4, { points: [{ alts: ['accepting deposits', 'allow people to save'] }, { alts: ['keeps money safe', 'pays interest'] }, { alts: ['lending', 'gives loans', 'provides loans'] }, { alts: ['so firms can invest', 'so people can buy houses', 'charges interest'] }], groups: [{ title: 'function 1', max: 2, points: [0, 1] }, { title: 'function 2', max: 2, points: [2, 3] }] }, [
  [P('accept deposits', 'which keeps money safe and earns interest', 'give loans', 'so firms can invest in machinery'), 4],
  [P('banks lend money', 'they let people save'), 2, 'two functions, no explanations'],
]);

/* ═════════ fresh set: written after the fixes above, never tuned against (kept as a check on over-fitting) ═════════ */
q('0610 Q5(a)(ii) organ', 'text', 1, { points: [{ alts: ['liver'] }], need: 1 }, [[T('the liver'), 1], [T('kidney'), 0], [T('Liver'), 1]]);
q('0610 Q1(c)(i) long sticks', 'text', 1, { points: [{ alts: ['change would be greater', 'easier to measure', 'more time to reach equilibrium'] }], need: 1 }, [
  [T('so that the change is bigger and easier to measure'), 1], [T('so they had time to reach equilibrium'), 1], [T('to make it fair'), 0]]);
q('0610 Q6(b) bile', 'prose', 3, { points: [{ alts: ['emulsification', 'emulsifies fat'] }, { alts: ['increased surface area of fat globules', 'larger surface area'] }, { alts: ['faster digestion of fat by enzymes', 'faster breakdown by lipase'] }, { alts: ['neutralises stomach acid', 'neutralises acid'] }] }, [
  [P('bile emulsifies fats', 'this gives a larger surface area', 'so lipase can digest it faster'), 3], [P('it neutralises the acid from the stomach'), 1], [P('it digests fat'), 0, 'bile has no enzymes']]);
q('0610 Q6(c) absorption', 'text', 3, { points: [{ alts: ['movement of small food molecules and ions', 'small molecules'] }, { alts: ['through the wall of the intestine', 'through the intestine wall'] }, { alts: ['into the blood'] }], need: 3 }, [
  [T('the movement of small food molecules through the wall of the intestine into the blood'), 3], [T('when food goes into the blood'), 1]]);
q('0620 Q1(b)(iv) jet fuel', 'text', 1, { points: [{ alts: ['kerosene', 'paraffin'] }], need: 1 }, [[T('kerosine'), 1, 'spelling'], [T('petrol'), 0]]);
q('0620 Q2(c) neutralisation', 'text', 1, { points: [{ alts: ['neutralisation', 'neutralization'] }], need: 1 }, [[T('neutralization'), 1], [T('Neutralisation'), 1], [T('displacement'), 0]]);
q('0620 Q3(d) pressure and equilibrium', 'text', 2, { points: [{ alts: ['no change', 'no effect'] }, { alts: ['same number of moles of gas on each side', 'equal moles of gas on both sides'] }], need: 2 }, [
  [T('no effect because there are the same number of moles of gas on both sides'), 2], [T('it moves to the left'), 0]], {}, 'State and explain the effect, if any, of decreasing the pressure on the position of equilibrium.');
q('0620 Q4(b)(i) oxidation', 'text', 1, { points: [{ alts: ['electrons are lost', 'loss of electrons', 'loses electrons'] }], need: 1 }, [[T('it loses electrons'), 1], [T('electrons are gained'), 0, 'opposite'], [T('oxygen is added'), 0]]);
q('0620 Q6(c)(ii) concentration', 'formula', 2, { final: [{ value: 0.234, unit: 'mol/dm³', units: ['mol/dm³', 'mol/dm3', 'mol dm-3', ''] }], method: ['2*0.00219', '0.00438'] }, [
  [F('0.234', 'mol/dm^3'), 2], [F('0.117', '', '0.00219/0.01875'), 0, 'forgot the 2'], [F('0.23'), 2]]);
q('0620 Q3(b)(i) precipitate', 'text', 1, { points: [{ alts: ['white precipitate'] }], need: 1 }, [[T('a white ppt'), 1, 'ppt'], [T('white'), 0, 'no precipitate'], [T('blue precipitate'), 0]]);
q('0625 Q4(a) density', 'prose', 2, { points: [{ alts: ['density of bulb A greater than density of water', 'A is denser than water'] }, { alts: ['density of other bulbs less than density of water', 'other bulbs are less dense than water'] }] }, [
  [P('bulb A is more dense than the water', 'the other bulbs are less dense than the water'), 2], [P('A is heavier'), 0, 'heavier is not denser']]);
q('0625 Q8(b)(iii) 240 V', 'text', 1, { points: [{ alts: ['safe', 'safer'] }], need: 1 }, [[T('because it is safer for people at home'), 1], [T('it is cheaper'), 0]]);
q('0625 Q9(c)(ii) current', 'formula', 1, { final: [{ value: 3.6, unit: 'A' }] }, [[F('3.6', 'A'), 1], [F('3.6', 'amps'), 1], [F('0.72', 'A'), 0]]);
q('0625 Q3(b)(ii) tension', 'formula', 3, { final: [{ value: 6000, unit: 'N' }], method: ['9.6/1.6', '9600/1.6'] }, [[F('6', 'kN'), 3], [F('6000', 'N'), 3], [F('15360', 'N', '9600 × 1.6'), 0]]);
q('0580 Q4 exponential growth', 'formula', 2, { final: [{ value: 4 }] }, [[F('4'), 2], [F('4 years'), 2, 'unit in the answer box'], [F('5'), 0]]);
q('0580 Q15(b) indices', 'formula', 1, { final: [{ expr: '27m^6' }] }, [[F('27m^{6}'), 1], [F('9m^6'), 0]]);
q('0580 Q16(a) acceleration', 'formula', 1, { final: [{ value: 0.25 }] }, [[F('\\frac{1}{4}'), 1], [F('0.25'), 1], [F('4'), 0]]);
q('0580 solve linear', 'formula', 2, { final: [{ value: 3.5 }], method: ['2x=7'] }, [[F('x=3.5'), 2], [F('\\frac{7}{2}'), 2], [F('7', '', '2x=7'), 1]]);
q('0478 Q1 sensors', 'text', 3, { points: [{ alts: ['light'] }, { alts: ['temperature'] }, { alts: ['gas'] }, { alts: ['magnetic field'] }, { alts: ['pressure'] }, { alts: ['moisture'] }, { alts: ['humidity'] }, { alts: ['pH'] }, { alts: ['motion', 'infrared'] }], need: 3 }, [
  [T('light sensor, temperature sensor, pressure sensor'), 3], [T('camera, microphone, keyboard'), 0, 'input devices, not sensors'], [T('PIR motion sensor, humidity, ph'), 3]]);
q('0478 Q3(a) serial or parallel', 'text', 3, { points: [{ alts: ['serial'], reject: ['parallel'] }, { alts: ['more reliable over distance', 'reliable over long distances'] }, { alts: ['less likely to be skewed', 'no skewing'] }, { alts: ['less interference', 'single wire'] }], need: 3 }, [
  [T('serial because it is more reliable over long distances and there is no skewing of data'), 3], [T('parallel because it is faster'), 0]]);
q('0478 Q12(a) hexadecimal uses', 'table', 2, { cells: { r1c1: { alts: ['HTML colours', 'colour codes', 'colours in HTML'] }, r2c1: { alts: ['MAC address', 'MAC addresses'] } } }, [[{ cells: { r1c1: 'colour codes in HTML', r2c1: 'MAC addresses' } }, 2], [{ cells: { r1c1: 'storing numbers', r2c1: 'MAC address' } }, 1]]);
q('0478 trace table OUTPUT', 'table', 3, { cells: { r4c4: '16', r7c4: '9', r8c4: 'Exit' } }, [[{ cells: { r4c4: '16', r7c4: '9', r8c4: 'exit' } }, 3], [{ cells: { r4c4: '12', r7c4: '9', r8c4: '-1' } }, 1]]);
q('0455 Q4(a) wage factors', 'text', 2, { points: [{ alts: ['wage rate', 'pay', 'income'] }, { alts: ['bonuses', 'bonus'] }, { alts: ['overtime payments', 'overtime'] }, { alts: ['commission'] }, { alts: ['pension'] }], need: 2 }, [
  [T('the wage and the bonus'), 2, 'wage ~ pay'], [T('overtime and commission'), 2], [T('job satisfaction and holidays'), 0, 'non-wage factors']]);
q('0455 define inflation', 'text', 2, { points: [{ alts: ['sustained rise', 'continuous increase', 'general rise'] }, { alts: ['in the general price level', 'price level'] }], need: 2 }, [
  [T('a sustained rise in the general price level'), 2], [T('when prices go up'), 0, 'too vague'], [T('a continuous increase in the price level'), 2]]);
q('0455 PED value', 'formula', 2, { final: [{ value: -0.5, abs: true }], method: ['10/20', '-10/20'] }, [[F('-0.5'), 2], [F('0.5'), 2], [F('2', '', '20/10'), 0, 'upside down']]);

console.log(`\n${pass} passed, ${fail} failed`);
Object.keys(per).forEach(s => console.log(`  ${SUBJ[s]}: ${per[s].pass}/${per[s].pass + per[s].fail}`));
if (fail) console.log('\nFAILED:\n  ' + fails.join('\n  '));
process.exit(fail ? 1 : 0);
