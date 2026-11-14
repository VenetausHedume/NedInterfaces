/* Ned marking, part 2 — the builders: code, flowchart, line ordering, SQL, and the chemistry / physics builders.
   Loads after mark.js (and pseudo.js, sql.js) and adds to NedMark.MARKERS. No AI, no network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./mark.js'), require('./pseudo.js'), require('./sql.js'));
  else factory(root.NedMark, root.NedPseudo, root.NedSql);
})(typeof self !== 'undefined' ? self : this, function (M, P, Q) {
  'use strict';
  const un = (max) => ({ score: 0, max, status: 'unanswered', detail: {} });
  const FEATURE_NAMES = { loop: 'uses a loop', file: 'uses a text file', forLoop: 'uses a FOR loop', whileLoop: 'uses a WHILE loop', repeatLoop: 'uses a REPEAT loop', selection: 'uses IF or CASE', input: 'takes input', output: 'gives output',
    array: 'uses an array', totalling: 'keeps a running total', counting: 'counts', procedure: 'uses a procedure or function', decision: 'has a decision box' };

  /* ───────── algorithms: pseudocode and flowcharts are RUN against test cases ─────────
     answer: { tests:[{ input:[…], expect:[…], files?:{name:[lines]}, expectFiles?:{name:[lines]} }], features?:['loop','input','totalling',…] }
     Full marks when every test gives the expected output (extra text such as prompts is ignored).
     Otherwise one mark for each listed feature the answer shows, up to max − 1; with no feature list,
     a share of max − 1 for the tests that pass. A syntax slip does not zero the answer: features are read from the words. */
  function markAlgo(kind) {
    return function (answer, value, max) {
      const code = kind === 'code' ? ((value && value.code) || '') : '';
      if (kind === 'code' ? !code.trim() : !(value && (value.nodes || []).length)) return un(max);
      const tests = (answer.tests || []).map(t => {
        const r = kind === 'code' ? P.run(code, t.input || [], undefined, t.files) : P.runFlowchart(value, t.input || []);
        const filesOk = !t.expectFiles || (r.ok && Object.keys(t.expectFiles).every(nm => JSON.stringify(((r.files || {})[nm] || []).map(x => String(x).trim())) === JSON.stringify(t.expectFiles[nm].map(x => String(x).trim()))));
        return { pass: r.ok && P.outputMatches(r.output, t.expect || []) && filesOk, filesOk, output: r.output, error: r.error || null, input: t.input || [], expect: t.expect || [] };
      });
      const passed = tests.filter(t => t.pass).length;
      const text = kind === 'code' ? code : (value.nodes || []).map(n => n.text || '').join('\n');
      const f = P.features(text);
      if (kind === 'flowchart') f.decision = (value.nodes || []).some(n => n.type === 'decision');
      const feats = (answer.features || []).map(name => ({ name, label: FEATURE_NAMES[name] || name, ok: !!f[name] }));
      let score;
      if (tests.length && passed === tests.length) score = max;
      else if (feats.length) score = Math.min(Math.max(0, max - 1), feats.filter(x => x.ok).length);
      else score = tests.length ? Math.floor(Math.max(0, max - 1) * passed / tests.length) : 0;
      return { score, max, status: 'marked', detail: { tests, passed, features: feats, error: (tests.find(t => t.error) || {}).error || null } };
    };
  }

  /* ───────── put the lines in order (Parsons problem) ─────────
     value : { order:[ids in the student's order], indent?:{ id: level } }      (unused lines are simply left out)
     answer: { order:[ids] } or { orders:[[…],[…]] }, indent?:{ id: level }, indentMarks? }
     One mark is lost for each line that is missing, extra, or out of sequence (longest common run of lines kept). */
  function lcs(a, b) { const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]); return d[a.length][b.length]; }
  function markOrder(answer, value, max) {
    const got = ((value && value.order) || []).map(String);
    if (!got.length) return un(max);
    const im = answer.indent ? (answer.indentMarks || 1) : 0, om = max - im;
    let best = { errors: 1e9 };
    (answer.orders || [answer.order]).forEach(o => { o = o.map(String); const k = lcs(got, o), errors = Math.max(o.length - k, got.length - k); if (errors < best.errors) best = { errors, correct: o }; });
    let score = Math.max(0, om - best.errors), indentOk = null;
    if (answer.indent) { indentOk = best.errors === 0 && Object.keys(answer.indent).every(id => ((value.indent || {})[id] || 0) === answer.indent[id]); if (indentOk) score += im; }
    return { score: Math.min(max, score), max, status: 'marked', detail: { errors: best.errors, indentOk, inPlace: got.map((id, i) => best.correct[i] === id) } };
  }

  /* ───────── SQL: the query is RUN on the question's table and its result compared with the model query's ─────────
     question.config.tables = { Name:{ columns, rows } }      answer: { query:'SELECT …' }
     Full marks for the same result. Otherwise one mark per clause that matches the model (SELECT, FROM, WHERE, ORDER BY), up to max − 1. */
  function markSql(answer, value, max, opts, question) {
    const code = (value && value.code) || '';
    if (!code.trim()) return un(max);
    const tables = (question && question.config && question.config.tables) || answer.tables || {};
    const want = Q.run(answer.query, tables), got = Q.run(code, tables);
    const same = Q.sameResult(got, want, want.ordered) && !(want.ordered && !got.ordered);      // an ordered answer needs ORDER BY, even if the rows happen to come out in order
    const a = Q.clauses(code), b = Q.clauses(answer.query);
    const parts = ['select', 'from', 'where', 'order'].filter(k => b[k]).map(k => ({ clause: k === 'order' ? 'ORDER BY' : k.toUpperCase(), ok: a[k] === b[k] }));
    const score = same ? max : Math.min(Math.max(0, max - 1), parts.filter(p => p.ok).length);
    return { score, max, status: 'marked', detail: { same, error: got.ok ? null : got.error, result: got.ok ? { columns: got.columns, rows: got.rows.slice(0, 20) } : null, expected: { columns: want.columns, rows: want.rows.slice(0, 20) }, parts } };
  }

  /* ───────── electron shells ─────────  value: { shells:[2,8,1], charge }   answer: { shells:[…], charge?:'2-' } */
  const chargeNorm = c => { const s = M.latexToText(c || '').replace(/[\u2212\u2013]/g, '-').replace(/\s+/g, ''); const sign = (s.match(/[+-]/) || [''])[0], n = (s.match(/\d+/) || ['1'])[0]; return sign ? sign + (n === '1' ? '' : n) : ''; };
  function markShells(answer, value, max) {
    const got = (value && value.shells) || [];
    if (!got.length && !(value && value.charge)) return un(max);
    const want = answer.shells, same = got.length === want.length && got.every((n, i) => n === want[i]);
    const needCharge = answer.charge != null, chargeOk = !needCharge || chargeNorm(value.charge) === chargeNorm(answer.charge);
    const shellMarks = max - (needCharge ? 1 : 0);
    let score = same ? shellMarks : (got.length === want.length ? Math.min(shellMarks - 1, 1) : 0);
    if (shellMarks > 1 && !same && got.reduce((a, b) => a + b, 0) === want.reduce((a, b) => a + b, 0)) score = Math.max(score, 1);     // right number of electrons, wrong arrangement
    if (needCharge && chargeOk) score += 1;
    return { score: Math.max(0, Math.min(max, score)), max, status: 'marked', detail: { shellsOk: same, chargeOk: needCharge ? chargeOk : null, total: got.reduce((a, b) => a + b, 0), expectedTotal: want.reduce((a, b) => a + b, 0) } };
  }

  /* ───────── displayed formula ─────────  value / answer.model: { atoms:[{id,element}], bonds:[{from,to,order}] }
     The two drawings are compared as molecules (which atom is joined to which, and by what kind of bond), not by position. */
  function molSig(m) {
    const atoms = m.atoms || [], bonds = m.bonds || [];
    const nb = {}; atoms.forEach(a => { nb[a.id] = []; });
    bonds.forEach(b => { if (nb[b.from] && nb[b.to]) { nb[b.from].push([b.to, b.order || 1]); nb[b.to].push([b.from, b.order || 1]); } });
    let lab = {}; atoms.forEach(a => { lab[a.id] = String(a.element).toUpperCase(); });
    for (let r = 0; r < 4; r++) { const nx = {}; atoms.forEach(a => { nx[a.id] = lab[a.id] + '(' + nb[a.id].map(x => x[1] + lab[x[0]]).sort().join(',') + ')'; }); lab = nx; }
    return atoms.map(a => lab[a.id]).sort().join('|');
  }
  const VAL = { H: 1, C: 4, O: 2, N: 3, CL: 1, BR: 1, F: 1, I: 1, S: 2 };
  function markStructure(answer, value, max) {
    if (!value || !(value.atoms || []).length) return un(max);
    const model = answer.model, count = m => { const c = {}; (m.atoms || []).forEach(a => { const e = String(a.element).toUpperCase(); c[e] = (c[e] || 0) + 1; }); return JSON.stringify(Object.keys(c).sort().map(k => [k, c[k]])); };
    const same = molSig(value) === molSig(model), atomsOk = count(value) === count(model);
    const deg = {}; (value.bonds || []).forEach(b => { deg[b.from] = (deg[b.from] || 0) + (b.order || 1); deg[b.to] = (deg[b.to] || 0) + (b.order || 1); });
    const valencyOk = value.atoms.every(a => VAL[String(a.element).toUpperCase()] == null || deg[a.id] === VAL[String(a.element).toUpperCase()]);
    const score = same ? max : Math.min(Math.max(0, max - 1), (atomsOk ? 1 : 0) + (atomsOk && valencyOk ? 1 : 0));
    return { score, max, status: 'marked', detail: { same, atomsOk, valencyOk } };
  }

  /* ───────── dot-and-cross ─────────  value: { atoms:[{id,element,x,y,slots:{top,bottom,left,right}}] }
     answer: { bonds:[['O','H',2],['O','H',2]], lone:{ O:[4], H:[0,0] }, mixed?:true }
     shared electrons = what sits between two neighbouring atoms (in either atom's facing slot); the rest are non-bonding. */
  function markLewis(answer, value, max) {
    const atoms = (value && value.atoms) || [];
    if (!atoms.length) return un(max);
    if (answer.ionic) {   // ionic: each ion has the right charge and outer-shell electrons; the gained electron is shown as the other symbol
      const sym = e => String(e).toLowerCase(), want = {}; Object.keys(answer.ions || {}).forEach(k => { want[sym(k)] = answer.ions[k]; });
      const canon = c => String(c || '').replace(/[−–]/g, '-').replace(/^1(?=[+-])/, '');
      const chargesOk = atoms.every(a => sym(a.element) in want) && Object.keys(want).every(k => atoms.some(a => sym(a.element) === k)) && atoms.every(a => canon(a.charge) === canon(want[sym(a.element)]));
      const count = a => Object.keys(a.slots).reduce((s, k) => s + a.slots[k].length, 0);
      const ew = {}; Object.keys(answer.electrons || {}).forEach(k => { ew[sym(k)] = [].concat(answer.electrons[k]); });
      const electronsOk = atoms.every(a => !ew[sym(a.element)] || ew[sym(a.element)].includes(count(a)));
      const anions = atoms.filter(a => /-$/.test(canon(a.charge)));
      const transferOk = anions.every(a => { const all = [].concat(...Object.values(a.slots)); return all.includes('dot') && all.includes('cross'); });
      const crit = [electronsOk, chargesOk].concat(max >= 3 ? [transferOk] : []);
      const n = crit.filter(Boolean).length;
      return { score: n === crit.length ? max : Math.min(Math.max(0, max - 1), n), max, status: 'marked', detail: { ionic: true, electronsOk, chargesOk, transferOk } };
    }
    const side = (A, B) => (Math.abs(B.x - A.x) >= Math.abs(B.y - A.y) ? (B.x > A.x ? 'right' : 'left') : (B.y > A.y ? 'bottom' : 'top'));
    const used = {}; atoms.forEach(a => { used[a.id] = 0; });
    const bonds = []; let mixedOk = true;
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
      const A = atoms[i], B = atoms[j]; if (Math.hypot(A.x - B.x, A.y - B.y) > 120) continue;
      const sa = (A.slots[side(A, B)] || []), sb = (B.slots[side(B, A)] || []), all = sa.concat(sb);
      if (!all.length) continue;
      used[A.id] += sa.length; used[B.id] += sb.length;
      if (!(all.includes('dot') && all.includes('cross'))) mixedOk = false;
      bonds.push([String(A.element).toUpperCase(), String(B.element).toUpperCase()].sort().concat([all.length]).join('-'));
    }
    const lone = {}; atoms.forEach(a => { const e = String(a.element).toUpperCase(); const tot = Object.keys(a.slots).reduce((s, k) => s + a.slots[k].length, 0); (lone[e] = lone[e] || []).push(tot - used[a.id]); });
    const wantB = (answer.bonds || []).map(b => [String(b[0]).toUpperCase(), String(b[1]).toUpperCase()].sort().concat([b[2]]).join('-')).sort();
    const bondsOk = JSON.stringify(bonds.slice().sort()) === JSON.stringify(wantB);
    const wl = {}; Object.keys(answer.lone || {}).forEach(k => { wl[k.toUpperCase()] = answer.lone[k].slice().sort(); });
    const loneOk = Object.keys(wl).length === Object.keys(lone).length && Object.keys(wl).every(k => JSON.stringify((lone[k] || []).slice().sort()) === JSON.stringify(wl[k]));
    const all = bondsOk && loneOk && (answer.mixed === false || mixedOk);
    const score = all ? max : Math.min(Math.max(0, max - 1), (bondsOk ? 1 : 0) + (loneOk ? 1 : 0));
    return { score, max, status: 'marked', detail: { bondsOk, loneOk, mixedOk } };
  }

  /* ───────── circuits ─────────  value from the circuit builder: { components:[{type}], overall, meters:[{type,correct}] }
     answer: { components:{ cell:1, lamp:2, switch:1 }, arrangement?:'series'|'parallel', meters?:true }
     One criterion each: the right components, a complete circuit in the right arrangement, meters connected correctly. */
  const ALIAS = { bulb: 'lamp', battery: 'cell', variable: 'resistor' };
  function markCircuit(answer, value, max) {
    const comps = (value && value.components) || [];
    if (!comps.length) return un(max);
    const have = {}; comps.forEach(c => { const t = ALIAS[c.type] && !(c.type in (answer.components || {})) ? ALIAS[c.type] : c.type; have[t] = (have[t] || 0) + 1; });
    const need = answer.components || {};
    const compsOk = Object.keys(need).every(k => (have[k] || 0) === need[k]);
    const crit = [{ name: 'components', ok: compsOk }];
    crit.push({ name: 'complete circuit' + (answer.arrangement ? ', ' + answer.arrangement : ''), ok: value.overall !== 'open' && (!answer.arrangement || value.overall === answer.arrangement) });
    if (answer.meters) crit.push({ name: 'meters', ok: (value.meters || []).length > 0 && value.meters.every(m => m.correct) });
    const ok = crit.filter(c => c.ok).length;
    const score = ok === crit.length ? max : Math.min(Math.max(0, max - 1), Math.floor(max * ok / crit.length));
    return { score, max, status: 'marked', detail: { criteria: crit, have } };
  }

  /* ───────── feedback a student can read ─────────
     NedMark.explain(ui, answer, value, result, question) -> [{ kind:'good'|'bad'|'info', text }]
     Shown AFTER marking. It says what was right, what was missing and what the mark scheme wanted,
     so every attempt ends with something learned and not just a number. */
  const first = spec => (spec == null ? '' : typeof spec === 'object' ? (spec.alts ? spec.alts[0] : spec.final ? finalText(spec.final[0]) : '') : String(spec));
  const finalText = f => (!f ? '' : f.expr != null ? f.expr : f.lo != null ? `${f.lo} to ${f.hi}` : String(f.value).trim() + ((f.units ? f.units[0] : f.unit) ? ' ' + (f.units ? f.units[0] : f.unit) : ''));
  function explain(ui, answer, value, r, question) {
    const out = [], good = t => out.push({ kind: 'good', text: t }), bad = t => out.push({ kind: 'bad', text: t }), info = t => out.push({ kind: 'info', text: t });
    if (!answer || !r) return out;
    if (r.status === 'unanswered') { info('Nothing to mark yet.'); return out; }
    const d = r.detail || {}, cfg = (question && question.config) || {};
    const keyed = (field, noun) => { (d.right || []).length && good(`${d.right.length} ${noun}${d.right.length === 1 ? '' : 's'} right.`); (d.wrong || []).forEach(k => { const given = M.latexToText(((value && value[field]) || {})[k] || ''); bad(`${noun[0].toUpperCase() + noun.slice(1)} ${labelOf(k)}: ${given ? `"${given}" is not right` : 'left blank'}. Expected: ${first(answer[field][k])}.`); }); };
    const labelOf = k => { const m = String(k).match(/^r(\d+)c(\d+)$/); if (m && cfg.table) return `in row "${cfg.table[+m[1]][0] || m[1]}", column "${cfg.table[0][+m[2]] || m[2]}"`; const list = cfg.labels || cfg.spots || cfg.nodes || []; const i = list.findIndex(x => String(x.id) === String(k)); return i >= 0 && !cfg.nodes ? String(i + 1) : String(k); };
    switch (ui) {
      case 'text': case 'short': {
        if (d.eq) { const e = d.eq;
          if (!e.arrow) { bad('Write the equation with an arrow (→ or ->) between the two sides.'); break; }
          if (e.word) { (e.reactants ? good : bad)('Reactants' + (e.reactants ? ' right.' : ' not right.')); (e.products ? good : bad)('Products' + (e.products ? ' right.' : ' not right.')); }
          else { (e.formulae ? good : bad)(e.formulae ? 'All the formulae are right.' : 'Check the formulae: one or more substances or charges are wrong, missing or extra.');
            if (e.formulae) (e.balanced ? good : bad)(e.balanced ? 'The equation is balanced.' : 'The equation is not balanced: count each kind of atom on both sides.');
            if (e.states != null) (e.states ? good : bad)(e.states ? 'State symbols right.' : 'Check the state symbols: (s), (l), (g) or (aq).'); }
          if (r.score < r.max) info('Expected: ' + answer.equation);
          break; }
        if (d.logic) { const L = d.logic;
          if (L.error) bad(L.error + '. Use AND, OR, NOT, NAND, NOR, XOR and brackets.');
          else if (L.same) good('Your expression gives the right output for every combination of inputs.');
          else bad('When ' + Object.keys(L.row).map(k => k + ' = ' + L.row[k]).join(', ') + ' your expression gives a different output from the correct one.');
          break; }
        (d.awarded || []).forEach(i => good('You made the point: ' + answer.points[i].alts[0] + '.'));
        if (r.score < r.max) { const need = Math.min(r.max, answer.need || r.max) - r.score; const rest = (d.missed || []).map(i => answer.points[i].alts[0]);
          if (rest.length) info(`${need} more mark${need === 1 ? '' : 's'} available. Points that score: ${rest.slice(0, 6).join('; ')}.`);
          info('This was marked by matching key words. If you made one of these points in different words, count it yourself.'); }
        break; }
      case 'prose': {
        (d.perBox || []).forEach((i, b) => (i >= 0 ? good(`Box ${b + 1}: ${answer.points[i].alts[0]}.`) : bad(`Box ${b + 1}: no mark-scheme point found here${value && value.sides && answer.groups ? ' for this side' : ''}.`)));
        (d.groups || []).forEach(g => info(`${g.title}: ${g.score} of up to ${g.max}.`));
        const rest = (d.missed || []).map(i => answer.points[i].alts[0]); if (rest.length) info('Points you could add: ' + rest.slice(0, 6).join('; ') + '.');
        info('Long answers are marked on the points they contain, not on how well they are argued. Treat this score as a minimum.');
        break; }
      case 'formula': case 'numeric': case 'math': {
        if (d.final) good('Your final answer is correct.');
        else { bad('The final answer is not right. Expected: ' + (answer.final || []).map(finalText).join(' or ') + '.');
          if (d.unitWrong) bad('Your number is right but the unit is not.');
          if (d.method) good(`Your working earns ${d.method} method mark${d.method === 1 ? '' : 's'}.`); else if ((answer.method || []).length) info('Method: ' + answer.method.join(' → ') + '.'); }
        break; }
      case 'mcq': {
        if (answer.keys) { (d.right || 0) && good(`${d.right} correct choice${d.right === 1 ? '' : 's'}.`); (d.wrong || 0) && bad(`${d.wrong} wrong choice${d.wrong === 1 ? '' : 's'}: each one cancels a correct one.`); if (r.score < r.max) info('The correct choices are ' + answer.keys.join(', ') + '.'); }
        else if (r.score === r.max) good('Correct.'); else bad('Not right. The answer is ' + answer.key + '.');
        break; }
      case 'match': {
        ((d.right || []).length ? good : bad)(`${(d.right || []).length} of ${d.total} matched correctly.`);
        const L = cfg.left || [], R = cfg.right || [], nameL = id => (L.find(x => String(x.id) === String(id)) || {}).text || id, nameR = id => (R.find(x => String(x.id) === String(id)) || {}).text || id;
        Object.keys(answer.pairs).filter(k => !(d.right || []).includes(k)).forEach(k => bad(`${nameL(k)} goes with ${nameR(answer.pairs[k])}.`));
        break; }
      case 'table': keyed('cells', 'cell'); if (answer.scheme === 'row') info('This table is marked by row: every cell in a row must be right.'); break;
      case 'label': keyed('labels', 'label'); break;
      case 'place': keyed('spots', 'spot'); break;
      case 'flowfill': keyed('boxes', 'box'); break;
      case 'logic': {
        if (d.match) good('Your circuit gives the right output for every combination of inputs.');
        else { if (!d.outputWired) bad('The output is not connected to a complete path from the inputs.');
          else { const vars = [...new Set((String(answer.expr).match(/\b[A-Za-z]\b/g) || []).map(x => x.toUpperCase()))].sort(); const k = [...d.expected].findIndex((c, i) => c !== d.table[i]);
            if (k >= 0) { const bits = k.toString(2).padStart(vars.length, '0'); bad(`When ${vars.map((v, i) => v + ' = ' + bits[i]).join(', ')} the output should be ${d.expected[k]}, but your circuit gives ${d.table[k]}.`); } }
          info(`${d.gatesRight || 0} of ${d.gatesExpected} gates produce the right signal.`); }
        break; }
      case 'plot': {
        if (d.points) { (d.points.right === d.points.of && !d.points.extra) ? good('Every point is plotted correctly.') : bad(`${d.points.right} of ${d.points.of} points are within half a small square` + (d.points.extra ? `, and ${d.points.extra} point${d.points.extra === 1 ? ' is' : 's are'} in the wrong place.` : '.')); }
        if (d.line) d.line.ok ? good('Your line is a good fit.') : bad('Your line is not a good fit' + (d.line.gradient != null ? ` (its gradient is ${d.line.gradient})` : ': draw one straight line') + '.');
        if (d.segments) d.segments.per.forEach(s => (s.ok ? good(`Line ${s.label} is right.`) : bad(`Line ${s.label} is missing, unlabelled or the wrong shape.`)));
        if (d.scale) d.scale.ok ? good('Your scales are sensible and the data fills more than half the grid.') : bad(!d.scale.covers ? 'Your scales do not fit all the data.' : (d.scale.usesX <= 0.5 || d.scale.usesY <= 0.5) ? 'Your data uses less than half of the grid. Choose a scale that spreads it out.' : 'Use steps of 1, 2 or 5 (or ten times those).');
        break; }
      case 'econ': {
        if (d.labelsOk === true) good('Axes and lines are labelled correctly.'); if (d.labelsOk === false) bad('Check your labels: price goes on the vertical axis, quantity on the horizontal; demand slopes down, supply slopes up.');
        const want = Object.keys(answer.shifts).map(k => `${k === 'D' ? 'demand' : 'supply'} shifts ${answer.shifts[k]}`).join(' and ');
        d.curveOk ? good('You moved the right curve.') : bad('The curve that changes here: ' + want + '.');
        if (d.curveOk) d.dirOk ? good('It moves in the right direction.') : bad('Right curve, wrong direction: ' + want + '.');
        d.eqOk ? good('New equilibrium marked at the right crossing.') : info('Mark the new equilibrium where the shifted curve crosses the other one.');
        break; }
      case 'code': case 'flowchart': {
        (d.tests || []).forEach(t => (t.pass ? good(`Inputs ${t.input.join(', ') || 'none'}: correct output.`) : bad(`Inputs ${t.input.join(', ') || 'none'}: expected ${t.expect.join(', ')}` + (t.error ? `, but it stopped: ${t.error.line ? 'line ' + t.error.line + ': ' : ''}${t.error.message}` : `, but it gave ${t.output.join(' | ') || 'nothing'}.`))));
        (d.features || []).forEach(f => (f.ok ? good('It ' + f.label + '.') : bad('It should ' + f.label.replace(/^(uses|takes|gives|keeps|counts|has)\b/, m => ({ uses: 'use', takes: 'take', gives: 'give', keeps: 'keep', counts: 'count', has: 'have' }[m])) + '.')));
        break; }
      case 'order': {
        d.errors === 0 ? good('Every line is in the right place.') : bad(`${d.errors} line${d.errors === 1 ? ' is' : 's are'} missing, extra or out of sequence.`);
        if (d.indentOk === true) good('The lines inside the loop are moved in correctly.'); if (d.indentOk === false && d.errors === 0) bad('The order is right, but check which lines are moved in (inside the loop or IF).');
        break; }
      case 'sql': {
        if (d.same) good('Your query returns exactly the right rows.');
        else { d.error ? bad('The query did not run: ' + d.error) : bad(`Your query returned ${d.result.rows.length} row${d.result.rows.length === 1 ? '' : 's'}; the right answer has ${d.expected.rows.length}` + (d.result.rows.length === d.expected.rows.length ? ', with different contents or order.' : '.'));
          (d.parts || []).forEach(p => (p.ok ? good(p.clause + ' is right.') : bad('Check your ' + p.clause + '.'))); }
        break; }
      case 'shells': {
        d.shellsOk ? good('Electron arrangement is correct.') : bad(`Not the right arrangement. You placed ${d.total} electrons; this needs ${d.expectedTotal}, arranged ${answer.shells.join(', ')}.`);
        if (d.chargeOk === true) good('Charge is correct.'); if (d.chargeOk === false) bad('Show the charge: ' + answer.charge + '.');
        break; }
      case 'structure': {
        if (d.same) good('Every atom and bond is right.');
        else { d.atomsOk ? good('You have the right atoms.') : bad('Check the number of each type of atom against the formula.'); if (d.atomsOk) d.valencyOk ? bad('Every atom has the right number of bonds, but they are joined in the wrong arrangement.') : bad('Count the bonds on each atom: carbon makes 4, oxygen 2, hydrogen 1.'); }
        break; }
      case 'lewis': {
        if (d.ionic) { d.electronsOk ? good('The outer-shell electrons on each ion are right.') : bad('Check the outer shells: the metal ion has lost its outer electrons, the non-metal ion has a full outer shell.');
          d.chargesOk ? good('The charges on the ions are right.') : bad('Check the charges: select each ion and choose its charge.');
          if (!d.transferOk) bad('Show the electron the non-metal gained as the other symbol (a cross among the dots, or a dot among the crosses).');
          break; }
        d.bondsOk ? good('The shared pairs are right.') : bad('Check the shared electrons between the atoms: each single bond is one pair.');
        d.loneOk ? good('The non-bonding electrons are right.') : bad('Check the electrons that are not shared: count each atom’s outer shell.');
        if (d.bondsOk && d.loneOk && !d.mixedOk) bad('Each shared pair should be one dot and one cross, to show an electron from each atom.');
        break; }
      case 'circuit': (d.criteria || []).forEach(c => (c.ok ? good(c.name[0].toUpperCase() + c.name.slice(1) + ': right.') : bad(c.name[0].toUpperCase() + c.name.slice(1) + ': not right.'))); break;
    }
    return out;
  }
  M.explain = explain;

  Object.assign(M.MARKERS, { code: markAlgo('code'), flowchart: markAlgo('flowchart'), order: markOrder, sql: markSql, shells: markShells, structure: markStructure, lewis: markLewis, circuit: markCircuit });
  M.FEATURE_NAMES = FEATURE_NAMES;
  return M;
});
