/* reasoning.test.js — marking written economics answers the way an examiner reads them (marking/reasoning.js).
   1. 54 real answers from Cambridge's Economics Example Candidate Responses, with the examiners' marks
      (tests/data/econ_ecr_scripts.jsonl, transcribed from the booklet; keys built from its mark schemes by
      ned-bank/tools/econ_ms.py), and a real June 2026 0455/22 script with its on-screen marks
      (tests/data/econ_s26_22_*).
   2. The rules themselves on short answers.  Run: node tests/reasoning.test.js */
const fs = require('fs'), path = require('path');
const R = require('../marking/reasoning.js');
let pass = 0, fail = 0;
const t = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); };

const K = require('./data/econ_ecr_keys.json');
const S = fs.readFileSync(path.join(__dirname, 'data/econ_ecr_scripts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
for (const [nm, f, minExact, minNear, maxOff] of [['booklet Q1–Q4', q => q <= 4, 15, 25, 22], ['booklet Q5–Q7', q => q >= 5, 9, 18, 22]]) {
  let e = 0, n1 = 0, o = 0, c = 0;
  for (const s of S) { if (!f(+s.q[1])) continue; c++; const r = R.mark(K[s.q], s.text); e += r.score === s.mark; n1 += Math.abs(r.score - s.mark) <= 1; o += Math.abs(r.score - s.mark); }
  console.log(`real scripts, ${nm}: ${c} answers, ${e} exact, ${n1} within one mark, ${o} marks off in all`);
  t(`real scripts ${nm}: no worse than measured`, [e >= minExact, n1 >= minNear, o <= maxOff], [true, true, true]);
}

// a real 2026 script (0455/22 June 2026, on-screen marked: the examiner's ticks, levels and marks per part)
{ const K2 = require('./data/econ_s26_22_keys.json');
  const S2 = fs.readFileSync(path.join(__dirname, 'data/econ_s26_22_script.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(s => s.q !== '1(e)');
  let e = 0, n1 = 0, o = 0;
  for (const s of S2) { const r = R.mark(Object.assign({}, K2[s.q], { marks: s.marks }), s.text); e += r.score === s.mark; n1 += Math.abs(r.score - s.mark) <= 1; o += Math.abs(r.score - s.mark); }
  console.log(`real script, June 2026: ${S2.length} answers, ${e} exact, ${n1} within one mark, ${o} marks off in all`);
  t('June 2026 script: no worse than measured', [e >= 10, n1 >= 16, o <= 8], [true, true, true]);
  // the examiner kept every 8-mark discussion without a judgement at Level 2, however developed
  ['3(d)', '4(d)', '5(d)'].forEach(q => { const s = S2.find(x => x.q === q); const r = R.mark(Object.assign({}, K2[q], { marks: 8 }), s.text);
    t(`June 2026 ${q}: developed both sides, no judgement -> Level 2`, r.level, 2); }); }

// a chain's explanation counts only when it is joined to its point
const C = { kind: 'chains', q: 'Discuss whether a cut in taxes will reduce unemployment.', marks: 6, listMax: 3, sides: [
  { title: 'Why it might', max: 4, chains: [{ max: 3, links: ['a cut in corporation tax will increase the profit firms can keep', 'this may encourage firms to expand', 'and so take on more workers'] }] },
  { title: 'Why it might not', max: 4, chains: [{ max: 3, links: ['firms may not spend extra profits on expansion', 'if they lack confidence', 'that they will sell the extra output'] }] }] };
t('chain: point, explanation, consequence joined -> 3', R.mark(C, 'A cut in corporation tax means firms keep more profit, so they may expand, which means they will take on more workers.').score, 3);
t('chain: point only -> 1', R.mark(C, 'A cut in corporation tax means firms keep more profit.').score, 1);
t('chain: links written as separate claims, not joined -> 1', R.mark(C, 'Firms keep more profit after a cut in corporation tax. In addition, firms take on more workers.').score, 1);
t('chain: developed on both sides', R.mark(C, 'A cut in corporation tax means firms keep more profit, so they may expand and take on more workers. However, firms may not spend the extra profit on expansion if they lack confidence that they will sell the extra output.').score, 6);

// levels: depth of reasoning decides the level
const L = { kind: 'levels', q: 'Discuss whether or not a government should impose a high rate of personal income tax on the rich.', marks: 8, levels: [{ level: 3, min: 6, max: 8 }, { level: 2, min: 3, max: 5 }, { level: 1, min: 1, max: 2 }], sides: [
  { title: 'Why it should', points: ['able to pay a high rate', 'raise tax revenue', 'create a more even distribution of income'] },
  { title: 'Why it should not', points: ['may act as a disincentive', 'may reduce enterprise/saving/investment (by rich individuals) less employment', 'the rich may emigrate'] }] };
const lv = (txt) => { const r = R.mark(L, txt); return [r.level, r.score]; };
t('levels: a list of points -> level 1', lv('The rich are able to pay a high rate. It would raise tax revenue. It may act as a disincentive. The rich may emigrate.'), [1, 2]);
t('levels: one reason per point, both sides -> level 2, 4', lv('A high income tax rate on the rich could raise tax revenue, so the government could spend more on schools and hospitals. The rich are able to pay a high rate because they have a lot of income left after their needs are met. It also creates a more even distribution of income, which can reduce poverty. However, it may act as a disincentive to work, because the rich keep less of each extra dollar they earn. The rich may emigrate to countries with lower taxes, which means the government would lose tax revenue. Overall, whether it should depends on how high the rate is and how easily the rich can move abroad.'), [2, 4]);
t('levels: one side in depth, no judgement -> level 2, 4', lv('A high rate of income tax on the rich would raise tax revenue. The government could spend this revenue on education and training, which would improve the skills of workers. More skilled workers are more productive, so firms can increase output and the economy grows. It would also create a more even distribution of income, as the extra revenue can be paid to poor households as state benefits, raising their living standards and reducing poverty.'), [2, 4]);
t('levels: both sides in chains + judgement -> level 3', lv('A high rate of income tax on the rich would raise tax revenue. The government could spend this revenue on education and training, which would improve the skills of workers. More skilled workers are more productive, so firms can increase output and the economy grows. However, a high tax rate may act as a disincentive for the rich to work and invest, as they keep less of each extra dollar they earn. With less investment, fewer jobs are created, so unemployment may rise and output falls. Overall, whether the government should impose a high rate depends on how easily the rich can move abroad.')[0], 3);

// pairs: reason + joined explanation
const P = { kind: 'pairs', q: 'Explain two reasons why labour productivity is low in Angola.', marks: 4, pairs: { n: 2, eg: true, ids: ['lack of capital equipment', 'lack of education'], expl: ['workers will not be able to produce much if they are working with low amounts of capital', 'workers will lack skills'] } };
t('pairs: two reasons explained -> 4', R.mark(P, 'There is a lack of capital equipment, so workers cannot produce much output. There is also a lack of education, which means workers lack the skills they need.').score, 4);
t('pairs: two reasons named -> 2', R.mark(P, 'Lack of capital equipment. Lack of education.').score, 2);

// concepts: same idea in other words, opposite direction refused
t('concepts: "higher tax revenues" says "generate more tax revenue"', R.same('High demand means higher tax revenues for governments', 'may generate more tax revenue', ''), true);
t('concepts: "jobs" says "employment"', R.same('firms will hire more workers and create jobs', 'this will increase employment', ''), true);
t('concepts: opposite direction refused', R.same('unemployment will rise', 'this will reduce unemployment', ''), false);
t('concepts: the question topic alone is not the point', R.same('GDP is the total output of a country', 'real GDP may not have increased', 'Discuss whether an increase in GDP will reduce poverty.'), false);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
