/* Ned marking, part 2 — the builders: code, flowchart, line ordering, SQL, and the chemistry / physics builders.
   Loads after mark.js (and pseudo.js, sql.js) and adds to NedMark.MARKERS. No AI, no network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./mark.js'), require('./pseudo.js'), require('./sql.js'), require('./python.js'));
  else factory(root.NedMark, root.NedPseudo, root.NedSql, root.NedPython);
})(typeof self !== 'undefined' ? self : this, function (M, P, Q, Py) {
  'use strict';
  const un = (max) => ({ score: 0, max, status: 'unanswered', detail: {} });
  const FEATURE_NAMES = { loop: 'uses a loop', file: 'uses a text file', forLoop: 'uses a FOR loop', whileLoop: 'uses a WHILE loop', repeatLoop: 'uses a REPEAT loop', selection: 'uses IF or CASE', input: 'takes input', output: 'gives output',
    array: 'uses an array', totalling: 'keeps a running total', counting: 'counts', procedure: 'uses a procedure or function', decision: 'has a decision box' };

  /* ───────── algorithms: pseudocode and flowcharts are RUN against test cases ─────────
     answer: { tests:[{ input:[…], expect:[…], files?:{name:[lines]}, expectFiles?:{name:[lines]} }], features?:['loop','input','totalling',…] }
     Full marks when every test gives the expected output (extra text such as prompts is ignored).
     Otherwise one mark for each listed feature the answer shows, up to max − 1; with no feature list,
     a share of max − 1 for the tests that pass. A syntax slip does not zero the answer: features are read from the words. */
  /* answer.auto (written per past-paper question): { tests:[…], points?:[…], require?:[…] }
       test   : { input:[…] | inputs:[[…],[…]] (any one of several input orders may pass), given?:{ Name: value },
                 expect?:[values the output must contain, in order], vars?:{ Name: value after the run }, files?, expectFiles? }
       point  : { text, tests?:[i…] (these tests pass) | code:'regex on the code' | feature:'loop' | not:'regex' }
       require: { code|not|feature, why }   e.g. a rewrite must use WHILE and must not use FOR
     Full marks when every test passes and every requirement holds. Otherwise one mark per mark point met (max − 1),
     like an examiner who gives marks for the parts that are right even when the whole program is not. */
  // a key value may be a rule instead of a value: { min, max, int } for numbers, { of, count, notAt } for arrays
  function ruleOk(a, b) {
    if (b.of !== undefined) {
      const cells = []; const walk = (x, at) => (Array.isArray(x) ? x.forEach((y, i) => walk(y, at.concat(i + 1))) : cells.push([x, at])); walk(a, []);
      const hits = cells.filter(([x]) => String(x).trim().toLowerCase() === String(b.of).toLowerCase());
      if (b.count != null && hits.length !== b.count) return false;
      if (b.notAt && hits.some(([, at]) => b.notAt.some(p => p.join(',') === at.join(',')))) return false;
      return true;
    }
    if (a == null || a === '' || isNaN(+a)) return false;
    if (b.int && Math.abs(+a - Math.round(+a)) > 1e-9) return false;
    return (b.min == null || +a >= b.min - 1e-9) && (b.max == null || +a <= b.max + 1e-9);
  }
  const isRule = b => b && typeof b === 'object' && !Array.isArray(b) && ('min' in b || 'max' in b || 'int' in b || 'of' in b);
  const expectOfLines = lines => { const out = []; lines.forEach(l => { const n = String(l).match(/-?\d+(?:\.\d+)?/g); if (n) out.push(...n); else if (String(l).trim()) out.push(String(l).trim()); }); return out; };
  const sameVal = (a, b) => { if (isRule(b)) return ruleOk(a, b); if (a == null || b == null) return a == b; if (typeof a === 'boolean' || typeof b === 'boolean') return String(a).toLowerCase() === String(b).toLowerCase();
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length >= b.length && b.every((x, i) => x == null || sameVal(a[i], x));
    if (!isNaN(+a) && !isNaN(+b) && String(a).trim() !== '' && String(b).trim() !== '') return Math.abs(+a - +b) < 1e-6 * Math.max(1, Math.abs(+b));
    return String(a).trim() === String(b).trim(); };
  function stripCode(code, py) { return String(code).replace(py ? /#.*$/gm : /\/\/.*$/gm, '').replace(/"[^"\n]*"|'[^'\n]*'/g, '""'); }
  function runOne(kind, py, value, code, t, input) {
    const opts = { given: t.given, random: t.random, vars: Object.keys(t.vars || {}).concat(...(t.checks || []).map(c => Object.keys(c.vars || {})), (t.derive && t.derive.take) || []) };
    if (kind === 'flowchart') return P.runFlowchart(value, input, undefined, t.files, opts);
    // a procedure/function the question only asks to be written: the test adds the call (test.append = { pseudo, python })
    if (t.append) code = code + '\n' + ((py ? t.append.python : t.append.pseudo) || '');
    if (py) return Py ? Py.run(code, input, 1500, t.files, opts) : { ok: false, output: [], error: { message: 'The Python runner did not load.' } };
    return P.run(code, input, 1000000, t.files, opts);        // big programs (sorting 200 records) need more than the Run button's limit
  }
  function markAlgo(kind) {
    return function (answer, value, max) {
      const code = kind === 'code' ? ((value && value.code) || '') : '';
      const py = kind === 'code' && value && value.lang === 'python';
      if (kind === 'code' ? !code.trim() : !(value && (value.nodes || []).length)) return un(max);
      const A = answer.auto || answer;
      const t0 = Date.now(), BUDGET = 7000;            // marking has a time limit: a program that never stops must not hold it up
      const tests = (A.tests || []).map(t0 => {
        let t = t0;
        const tries = t.inputs || [t.input || []];
        let best = null;
        if (Date.now() - t0 > BUDGET) return { pass: false, output: [], vars: {}, error: { message: 'not run: the earlier tests took too long' }, input: tries[0], expect: t.expect || [], want: t.vars || null };
        for (const input of tries) {
          let tt = t;
          const r = runOne(kind, py, value, code, t, input);
          const filesOk = !t.expectFiles || (r.ok && Object.keys(t.expectFiles).every(nm => JSON.stringify(((r.files || {})[nm] || []).map(x => String(x).trim())) === JSON.stringify(t.expectFiles[nm].map(x => String(x).trim()))));
          if (t.derive && r.ok && A.ref) {
            // the right result depends on data the program made itself (a random cell, a generated code):
            // run the reference on that same data and the same inputs to get what this program should output
            const g = Object.assign({}, t.given); (t.derive.take || []).forEach(k => { if (r.vars && r.vars[k] !== undefined) g[k] = r.vars[k]; });
            const rr = P.run(A.ref, input, 1000000, t.files, { given: g, random: t.random });
            const lines = (rr.output || []).map(String);
            if (A.levels) tt = Object.assign({}, t, { checks: (t.checks || []).concat(lines.map(l => l.match(/^#R(\d+)\s*(.*)$/)).filter(Boolean).map(m => ({ req: m[1] - 1, expect: expectOfLines([m[2]]) }))) });
            else tt = Object.assign({}, t, { expect: (tt.expect || []).concat(expectOfLines(lines)) });
          }
          const varsOk = !tt.vars || (r.ok && Object.keys(tt.vars).every(k => sameVal((r.vars || {})[k], tt.vars[k])));
          const outOk = r.ok && P.outputMatches(r.output, tt.expect || []);
          // requirement checks on the same run (15-mark programs): a program that stops part-way still earns the checks it reached
          const checks = (tt.checks || []).map(c => ({ req: c.req, ok: (!c.expect || P.outputMatches(r.output, c.expect)) && (!c.vars || Object.keys(c.vars).every(k => sameVal((r.vars || {})[k], c.vars[k]))) }));
          const res = { pass: outOk && filesOk && varsOk && checks.every(c => c.ok), filesOk, varsOk, checks, output: r.output, vars: r.vars || {}, error: r.error || null, input, expect: tt.expect || [], want: t.vars || null };
          if (!best || res.pass || (!best.error && false)) best = res;
          if (res.pass || (r.error && /too long/.test(r.error.message)) || Date.now() - t0 > BUDGET) break;
        }
        return best;
      });
      const passed = tests.filter(t => t.pass).length;
      const text = kind === 'code' ? code : (value.nodes || []).map(n => n.text || '').join('\n');
      const f = py && Py ? Py.features(text) : P.features(text);
      if (kind === 'flowchart') f.decision = (value.nodes || []).some(n => n.type === 'decision');
      const plain = stripCode(text, py);
      const holds = c => c.feature ? !!f[c.feature] : c.code ? new RegExp(c.code, 'i').test(plain) : c.not ? !new RegExp(c.not, 'i').test(plain) : true;
      const reqs = (A.require || []).map(c => ({ why: c.why || c.code || c.not || c.feature, ok: (py && c.pseudoOnly) ? true : holds(c) }));
      const feats = (A.features || []).map(name => ({ name, label: FEATURE_NAMES[name] || name, ok: !!f[name] }));
      const points = (A.points || []).map(p => ({ text: p.text, ok: p.tests ? p.tests.every(i => tests[i] && tests[i].pass) : (py && p.pseudoOnly) ? false : holds(p) }));
      let score;
      if (A.levels) {
        // AO2 (techniques, data structures) and AO3 (names, logic, accuracy, requirements met) from how much of each
        // requirement the program gets right when it is run. Comments are not marked.
        const R = A.levels.requirements || [];
        const per = R.map((q, k) => { const cs = tests.flatMap(t => (t.checks || []).filter(c => c.req === k)); return { text: q.text, weight: q.weight || 1, got: cs.filter(c => c.ok).length, of: cs.length }; });
        const W = per.reduce((a, q) => a + q.weight, 0) || 1;
        const frac = per.reduce((a, q) => a + q.weight * (q.of ? q.got / q.of : 0), 0) / W;
        const ids = [...new Set((plain.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(w => !/^(IF|THEN|ELSE|ENDIF|FOR|TO|NEXT|WHILE|DO|ENDWHILE|REPEAT|UNTIL|INPUT|OUTPUT|PRINT|AND|OR|NOT|CASE|OF|OTHERWISE|ENDCASE|DECLARE|TRUE|FALSE|DIV|MOD|STEP|RETURN|in|range|int|float|str|len|print|input|def|if|else|elif|for|while|and|or|not|True|False|return|i|j|k)$/i.test(w)))];
        const counters = new Set((plain.match(/\bFOR\s+([A-Za-z_]\w*)|\bfor\s+([A-Za-z_]\w*)\s+in\b/gi) || []).map(x => x.split(/\s+/)[1].toLowerCase()));
        const named = ids.filter(w => !counters.has(w.toLowerCase()));
        const structures = (A.levels.names || []).every(n => new RegExp('\\b' + n + '\\b', 'i').test(plain));
        const meaningful = named.length ? named.filter(w => w.length >= 3).length / named.length >= 0.75 : false;   // loop counters (FOR i …) may be short
        const attempt = ['loop', 'selection', 'input', 'output', 'array'].filter(x => f[x]).length;
        let ao2 = frac >= 0.999 ? 9 : Math.min(8, Math.round(9 * frac)), ao3 = frac >= 0.999 && structures && meaningful ? 6 : Math.min(5, Math.round(6 * frac * (structures && meaningful ? 1 : 0.8)));
        if (ao2 === 0 && attempt >= 2) ao2 = 1;           // at least one programming technique used
        if (ao3 === 0 && attempt >= 2) ao3 = 1;           // attempts at least one requirement
        score = Math.min(max, ao2 + ao3);
        return { score, max, status: 'marked', detail: { tests, passed, levels: { ao2, ao3, requirements: per, structures, meaningful }, error: (tests.find(t => t.error) || {}).error || null } };
      }
      if (tests.length && passed === tests.length && reqs.every(r => r.ok)) score = max;
      else if (points.length) {
        // mark points earn marks, but a program that gets no test right cannot score more than half (and never full marks)
        const cap = tests.length && passed === 0 ? Math.ceil(max / 2) : max - 1;
        score = Math.min(Math.max(0, cap), points.filter(x => x.ok).length);
      }
      else if (feats.length) score = Math.min(Math.max(0, max - 1), feats.filter(x => x.ok).length);
      else score = tests.length ? Math.floor(Math.max(0, max - 1) * passed / tests.length) : 0;
      return { score, max, status: 'marked', detail: { tests, passed, features: feats, points, require: reqs, error: (tests.find(t => t.error) || {}).error || null } };
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

  /* ───────── nuclear equations ─────────  value: { left:[{A,Z,s}], right:[…] }  answer: same shape, the full equation
     Each box the student had to fill is one item; particles may be in any order on a side. Marks = share of items right. */
  const NUC_ALIAS = { 'α': 'He', alpha: 'He', 'β': 'e', 'β-': 'e', 'β−': 'e', beta: 'e', 'e-': 'e', 'γ': 'γ', gamma: 'γ' };
  const nucSym = s => { s = String(s == null ? '' : s).trim(); return NUC_ALIAS[s] || NUC_ALIAS[s.toLowerCase()] || s; };
  const nucNum = x => { const n = String(x == null ? '' : x).trim().replace(/[−–]/g, '-'); return n === '' || isNaN(+n) ? null : +n; };
  function perms(a) { if (a.length < 2) return [a]; const out = []; a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => out.push([x].concat(p)))); return out; }
  function markNuclide(answer, value, max, opts, question) {
    if (!value) return un(max);
    const given = ((question && question.config && question.config.given) || []);
    const isGiven = (side, i, k) => given.some(g => g.side === side && g.i === i && g[k] != null);
    let right = 0, total = 0; const wrong = [];
    ['left', 'right'].forEach(side => {
      const want = answer[side] || [], got = value[side] || [];
      const idx = want.map((_, i) => i);
      let best = null;
      perms(idx).forEach(order => {      // which expected particle each box is compared with
        let r = 0, t = 0; const w = [];
        order.forEach((wi, gi) => { const e = want[wi], g = got[gi] || {};
          ['A', 'Z', 's'].forEach(k => { if (isGiven(side, gi, k)) return; t++;
            const ok = k === 's' ? nucSym(g.s) === nucSym(e.s) && nucSym(g.s) !== '' : nucNum(g[k]) === e[k];
            if (ok) r++; else w.push({ side, i: gi, field: k, want: e[k] }); }); });
        if (!best || r > best.r) best = { r, t, w };
      });
      right += best.r; total += best.t; wrong.push(...best.w);
    });
    const sum = (side, k) => (value[side] || []).reduce((s, p, i) => { const g = given.find(x => x.side === side && x.i === i && x[k] != null); const n = nucNum(g ? g[k] : p[k]); return s == null || n == null ? null : s + n; }, 0);
    const mass = [sum('left', 'A'), sum('right', 'A')], proton = [sum('left', 'Z'), sum('right', 'Z')];
    const score = total ? Math.floor(max * right / total + 1e-9) : 0;
    return { score, max, status: 'marked', detail: { right, total, wrong, mass, proton } };
  }

  /* ───────── shapes on a grid ─────────  value: { shapes:[{pts}] }   answer: { shape:[[x,y]…], tol? }
     Full marks when a drawn shape has exactly the right corners. With 2+ marks, the right shape the right way round
     in the wrong place earns 1 (the usual "correct size and orientation" special case). */
  function samePts(a, b, tol) { if (a.length !== b.length) return false; const used = new Set();
    return a.every(p => { const k = b.findIndex((q, i) => !used.has(i) && Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol); if (k < 0) return false; used.add(k); return true; }); }
  function markTransform(answer, value, max) {
    const shapes = ((value && value.shapes) || []).map(s => s.pts || []).filter(p => p.length);
    if (!shapes.length) return un(max);
    const want = answer.shape, tol = answer.tol || 0.01;
    const exact = shapes.some(s => samePts(s, want, tol));
    const shifted = !exact && shapes.some(s => { if (s.length !== want.length) return false;
      const cs = s.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]), cw = want.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
      const d = [(cw[0] - cs[0]) / s.length, (cw[1] - cs[1]) / s.length]; return samePts(s.map(p => [p[0] + d[0], p[1] + d[1]]), want, tol); });
    const score = exact ? max : shifted && max >= 2 ? 1 : 0;
    return { score, max, status: 'marked', detail: { exact, shifted, extra: shapes.length > 1 } };
  }

  /* ───────── number line ─────────  value/answer: { lo:{v,closed}|null, hi:{v,closed}|null }   each end is one item */
  function markNumberline(answer, value, max) {
    if (!value) return un(max);
    const same = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a.v - b.v) < 1e-9 && !!a.closed === !!b.closed);
    const lo = same(value.lo, answer.lo), hi = same(value.hi, answer.hi), n = (lo ? 1 : 0) + (hi ? 1 : 0);
    return { score: n === 2 ? max : max >= 2 ? Math.min(max - 1, n) : 0, max, status: 'marked', detail: { lo, hi } };
  }

  /* ───────── Venn diagrams ─────────  value: { shaded:[regions] } | { counts:{region:n} }   answer: same shape */
  function markVenn(answer, value, max) {
    if (!value) return un(max);
    if (answer.counts) {
      const got = value.counts || {}, keys = Object.keys(answer.counts);
      const right = keys.filter(k => got[k] != null && String(got[k]).trim() !== '' && Number(String(got[k]).trim()) === Number(answer.counts[k])).length;
      return { score: right === keys.length ? max : answer.scale ? ladder(right, max, answer.scale) : Math.max(0, max - (keys.length - right)), max, status: 'marked', detail: { counts: true, right, of: keys.length, wrongKeys: keys.filter(k => Number(String(got[k] || '').trim()) !== Number(answer.counts[k]) || String(got[k] || '').trim() === '') } };
    }
    const got = new Set(value.shaded || []), want = new Set(answer.shaded);
    const missing = [...want].filter(k => !got.has(k)), extra = [...got].filter(k => !want.has(k));
    const off = missing.length + extra.length;
    return { score: off === 0 ? max : off === 1 && max >= 2 ? max - 1 : 0, max, status: 'marked', detail: { missing, extra } };
  }
  const ladder = (n, max, scale) => M.ladder ? M.ladder(n, max, scale) : (scale ? Object.keys(scale).reduce((b, k) => (n >= +k ? Math.max(b, scale[k]) : b), 0) : Math.max(0, Math.min(max, n)));

  /* ───────── bars: bar charts, histograms, pyramids ─────────  value/answer: { heights:[…] }, answer.tol optional */
  function markBars(answer, value, max, opts, question) {
    const h = (value && value.heights) || [];
    if (!h.some(v => v != null)) return un(max);
    const ax = Object.assign({ step: 1, minor: 5 }, (question && question.config && question.config.axis) || {});
    const tol = answer.tol != null ? answer.tol : ax.step / ax.minor / 2 + 1e-9;
    const wrong = answer.heights.map((w, i) => (h[i] == null || Math.abs(h[i] - w) > tol ? i : -1)).filter(i => i >= 0);
    const score = answer.scale ? ladder(answer.heights.length - wrong.length, max, answer.scale) : Math.max(0, max - wrong.length);
    return { score, max, status: 'marked', detail: { wrong, want: answer.heights } };
  }

  /* ───────── constructions, scale drawings, bearings ─────────
     value : { points:{C:[x,y]}, segments:[[x1,y1,x2,y2]], arcs:[{c,r}] } in cm
     answer: { points?:{ C:{ at, tol?, alt? } }, arcs?:[{ center, r }], segments?:[[p,q]], bearing?:{ from, to, deg, tol, dist, dtol } }
     Criteria: the construction arcs; the finished figure (points + lines); a bearing's direction; its distance. */
  function markConstruct(answer, value, max, opts, question) {
    const v = value || {}; if (!Object.keys(v.points || {}).length && !(v.segments || []).length && !(v.arcs || []).length) return un(max);
    const given = (question && question.config && question.config.points) || {};
    const at = k => (Array.isArray(k) ? k : (v.points || {})[k] || given[k]);
    const near = (a, b, t) => !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) <= t;
    const crit = [];
    if (answer.arcs) crit.push({ name: 'arcs', ok: answer.arcs.every(A => (v.arcs || []).some(a => near(a.c, at(A.center), 0.15) && Math.abs(a.r - A.r) <= (A.tol || 0.15))) });
    if (answer.points || answer.segments) {
      const pOk = Object.keys(answer.points || {}).every(k => { const P = answer.points[k]; return near(at(k), P.at, P.tol || 0.2) || (P.alt || []).some(q => near(at(k), q, P.tol || 0.2)); });
      const sOk = (answer.segments || []).every(([p, q]) => (v.segments || []).some(s => { const a = [s[0], s[1]], b = [s[2], s[3]]; return (near(a, at(p), 0.2) && near(b, at(q), 0.2)) || (near(a, at(q), 0.2) && near(b, at(p), 0.2)); }));
      crit.push({ name: 'figure', ok: pOk && sOk, pOk, sOk });
    }
    if (answer.bearing) { const B = answer.bearing, a = at(B.from), b = at(B.to);
      let deg = null, dist = null; if (a && b) { deg = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360; dist = Math.hypot(b[0] - a[0], b[1] - a[1]); }
      const dd = deg == null ? 999 : Math.min(Math.abs(deg - B.deg), 360 - Math.abs(deg - B.deg));
      crit.push({ name: 'bearing', ok: dd <= (B.tol || 2), measured: deg == null ? null : Math.round(deg) }); crit.push({ name: 'distance', ok: dist != null && Math.abs(dist - B.dist) <= (B.dtol || 0.2), measured: dist == null ? null : Math.round(dist * 10) / 10 }); }
    const n = crit.filter(c => c.ok).length;
    return { score: n === crit.length ? max : Math.min(Math.max(0, max - 1), n), max, status: 'marked', detail: { criteria: crit } };
  }

  /* ───────── ray diagrams ─────────  value: { rays:[{pts,dashed?}], image:{x,h} }   answer: { rays:n, image:{x,h} }
     A ray counts when it starts at the top of the object, meets the lens or mirror, and leaves along a line that passes
     through the top of the true image (forwards for a real image, traced back for a virtual one or a mirror). That is
     true of every correctly drawn ray, so the parallel, centre and focal rays all count. */
  function markRays(answer, value, max, opts, question) {
    const v = value || {}; const rays = (v.rays || []).filter(r => !r.dashed && (r.pts || []).length >= 2);
    if (!rays.length && !(v.image && v.image.h)) return un(max);
    const obj = Object.assign({ x: -6, h: 2 }, (question && question.config && question.config.object) || {});
    const tip = [obj.x, obj.h], img = [answer.image.x, answer.image.h], tol = answer.tol || 0.5;
    const distLine = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy); return n < 1e-9 ? Infinity : Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / n; };
    const good = rays.filter(r => {
      const P = r.pts; if (Math.hypot(P[0][0] - tip[0], P[0][1] - tip[1]) > tol) return false;
      for (let i = 0; i < P.length - 1; i++) {              // the first place the ray reaches the lens / mirror plane (x = 0)
        const a = P[i], c = P[i + 1];
        if (Math.abs(c[0]) <= 0.25 && i + 2 < P.length) return distLine(img, c, P[i + 2]) <= tol && distLine(tip, a, c) <= 1e-9 + (i === 0 ? 0 : tol);
        if ((a[0] < 0) !== (c[0] < 0) && Math.abs(a[0]) > 0.25) { const t = -a[0] / (c[0] - a[0]), m = [0, a[1] + t * (c[1] - a[1])]; return distLine(img, m, c) <= tol; }
      }
      return false; }).length;
    const imageOk = !!(v.image && Math.abs(v.image.x - img[0]) <= tol && Math.abs(v.image.h - img[1]) <= tol);
    const n = Math.min(answer.rays || 2, good) + (imageOk ? 1 : 0), need = (answer.rays || 2) + 1;
    return { score: n >= need ? max : Math.min(Math.max(0, max - 1), n), max, status: 'marked', detail: { good, want: answer.rays || 2, imageOk } };
  }

  /* ───────── force arrows ─────────  value: { arrows:[{dir,len,label}] }
     answer: { arrows:[{ label:'weight'|[alts], dir }], compare?:[[label, '>'|'<'|'=', label]] } */
  function markArrows(answer, value, max) {
    const got = (value && value.arrows) || []; if (!got.length) return un(max);
    const alts = l => [].concat(l).map(x => String(x).toLowerCase());
    const find = W => got.find(a => a.dir === W.dir && alts(W.label).includes(String(a.label || '').toLowerCase()));
    const per = answer.arrows.map(W => ({ label: [].concat(W.label)[0], ok: !!find(W) }));
    const byLabel = l => got.find(a => alts(l).includes(String(a.label || '').toLowerCase()));
    const cmp = (answer.compare || []).map(([p, op, q]) => { const A = byLabel(p), B = byLabel(q); const ok = !!A && !!B && (op === '>' ? A.len > B.len : op === '<' ? A.len < B.len : A.len === B.len); return { p: [].concat(p)[0], op, q: [].concat(q)[0], ok }; });
    const extra = got.filter(a => !answer.arrows.some(W => alts(W.label).includes(String(a.label || '').toLowerCase()) && W.dir === a.dir)).length;
    const n = per.filter(x => x.ok).length + cmp.filter(x => x.ok).length, need = per.length + cmp.length;
    return { score: n === need && !extra ? max : Math.min(Math.max(0, max - 1), Math.max(0, n - extra)), max, status: 'marked', detail: { per, cmp, extra } };
  }

  /* ───────── PPC and price controls ───────── */
  function markPpc(answer, value, max) {
    if (!value) return un(max);
    const crit = []; if (answer.shift) crit.push({ name: 'shift', ok: value.shift === answer.shift }); if (answer.where) crit.push({ name: 'point', ok: value.where === answer.where });
    const n = crit.filter(c => c.ok).length;
    return { score: n === crit.length ? max : Math.min(Math.max(0, max - 1), n), max, status: 'marked', detail: { criteria: crit, got: value } };
  }
  function markPriceControl(answer, value, max) {
    if (!value) return un(max);
    const side = answer.control === 'max' ? 'below' : 'above', gap = answer.control === 'max' ? 'shortage' : 'surplus';
    const crit = [{ name: 'line', ok: value.price === side }, { name: 'gap', ok: value.gap === gap }];
    const n = crit.filter(c => c.ok).length;
    return { score: n === 2 ? max : Math.min(Math.max(0, max - 1), n), max, status: 'marked', detail: { criteria: crit, side, gap } };
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
          else { bad('When ' + Object.keys(L.row).map(k => k + ' = ' + L.row[k]).join(', ') + ' your expression gives a different output from the correct one.');
            if (L.parts) info(`${L.partsRight} of the ${L.parts} bracketed parts of the expression are right.`); }
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
      case 'table': if (answer.mode === 'errors') {
          (d.errors || []).forEach(e => (e.fixOk ? good(`Line ${e.line}: right error, right correction.`) : e.lineOk ? bad(`Line ${e.line} has an error, but the correction is not right.`) : bad(e.line == null ? 'Give the line number of each error.' : `Line ${e.line} is not one of the errors (or you named it twice).`)));
          if (d.found < r.max) info(`${d.found} of ${r.max} errors found and corrected.`);
          break; }
        if (answer.mode === 'trace') {
          const H = answer.headers || (cfg.table && cfg.table[0]) || [];
          Object.keys(d.columns || {}).forEach(c => { const x = d.columns[c], name = H[c] || 'column ' + (+c + 1);
            if (x.ok) good(`Column ${name}: right.`);
            else bad(`Column ${name}: should read ${x.want.join(', ') || '(nothing)'}` + (x.have.length ? `; yours reads ${x.have.join(', ')}.` : '; yours is empty.')); });
          info('Trace tables are marked column by column: the values in each column must appear in the right order. Writing a value again on the next row is fine.');
          break; }
        keyed('cells', 'cell'); if (answer.scheme === 'row') info('This table is marked by row: every cell in a row must be right.'); break;
      case 'label': keyed('labels', 'label'); break;
      case 'cloze': keyed('blanks', 'blank'); break;
      case 'place': keyed('spots', 'spot'); break;
      case 'flowfill': keyed('boxes', 'box'); break;
      case 'logic': {
        if (d.match) good('Your circuit gives the right output for every combination of inputs.');
        else { if (!d.outputWired) bad('The output is not connected to a complete path from the inputs.');
          else { const vars = answer.expr ? [...new Set((String(answer.expr).match(/\b[A-Za-z]\b/g) || []).map(x => x.toUpperCase()))].sort() : answer.table.vars; const k = [...d.expected].findIndex((c, i) => c !== d.table[i]);
            if (k >= 0) { const bits = k.toString(2).padStart(vars.length, '0'); bad(`When ${vars.map((v, i) => v + ' = ' + bits[i]).join(', ')} the output should be ${d.expected[k]}, but your circuit gives ${d.table[k]}.`); } }
          if (d.gatesExpected) info(`${d.gatesRight || 0} of ${d.gatesExpected} gates produce the right signal.`);
          else if (d.rowsRight != null) info(`Your circuit gives the right output in ${d.rowsRight} of ${d.expected.length} rows of the truth table.`); }
        break; }
      case 'plot': {
        if (d.points) { (d.points.right === d.points.of && !d.points.extra) ? good('Every point is plotted correctly.') : bad(`${d.points.right} of ${d.points.of} points are within half a small square` + (d.points.extra ? `, and ${d.points.extra} point${d.points.extra === 1 ? ' is' : 's are'} in the wrong place.` : '.')); }
        if (d.line) d.line.ok ? good('Your line is a good fit.') : bad('Your line is not a good fit' + (d.line.gradient != null ? ` (its gradient is ${d.line.gradient})` : ': draw one straight line') + '.');
        if (d.curve) d.curve.ok ? good('Your curve goes through your points.') : bad('Plot all the points first: the curve is drawn through them.');
        if (d.region) { d.region.per.forEach((p, i) => (p.drawn ? (p.style || answer.region.style === false ? good(`Line ${i + 1} is right.`) : bad(`Line ${i + 1} is in the right place but should be ${answer.region.lines[i].strict ? 'broken (the inequality is strict: < or >)' : 'solid (≤ or ≥ includes the line)'}.`)) : bad(`Line ${i + 1} is missing or in the wrong place.`)));
          d.region.inside ? good('R is in the right region.') : bad('R is not in the region that satisfies every inequality.'); }
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
        if (d.levels) {
          const L = d.levels;
          L.requirements.forEach(q => (q.of && q.got === q.of ? good(`${q.text}: works.`) : q.got ? bad(`${q.text}: works in ${q.got} of ${q.of} checks.`) : bad(`${q.text}: not working yet.`)));
          if (d.error) info('Your program stopped: ' + (d.error.line ? 'line ' + d.error.line + ': ' : '') + d.error.message);
          if (!L.structures) info('Use the array names given in the question.');
          if (!L.meaningful) info('Use meaningful names for your variables (not single letters).');
          info(`AO2 (programming techniques and data structures): ${L.ao2} of 9. AO3 (names, logic, accuracy, requirements): ${L.ao3} of 6. Comments are not marked here.`);
          break; }
        const shown = (answer.auto && answer.auto.show) || 2;           // the first tests are shown in full; the rest are hidden tests
        (d.tests || []).forEach((t, i) => {
          const fmt = v => { if (v && typeof v === 'object' && !Array.isArray(v)) { if (v.of !== undefined) return `${v.count != null ? 'exactly ' + v.count + ' ' : ''}"${v.of}"` + (v.notAt ? ' (not at ' + v.notAt.map(p => '[' + p.join(',') + ']').join(' or ') + ')' : '');
              return v.min === v.max && v.min != null ? String(v.min) : `${v.int ? 'a whole number' : 'a number'}${v.min != null ? ' from ' + v.min : ''}${v.max != null ? ' to ' + v.max : ''}`; }
            const j = JSON.stringify(v); return j && j.length > 80 ? j.slice(0, 77) + '…' : j; };
          const what = t.want ? Object.keys(t.want).map(k => `${k} = ${fmt(t.want[k])}`).join(', ') : t.expect.length ? t.expect.join(', ') : t.filesOk === false ? 'the right file contents' : 'the right result';
          const got = t.want ? Object.keys(t.want).map(k => `${k} = ${fmt((t.vars || {})[k] === undefined ? null : t.vars[k])}`).join(', ') : (t.output.join(' | ') || 'nothing');
          const inp = t.input && t.input.length ? `With inputs ${t.input.join(', ')}` : 'Test ' + (i + 1);
          if (i >= shown) { t.pass ? good(`Hidden test ${i + 1 - shown}: right.`) : bad(`Hidden test ${i + 1 - shown}: not right` + (t.error ? ` (it stopped: ${t.error.message})` : '') + '.'); return; }
          t.pass ? good(`${inp}: right.`) : bad(`${inp}: expected ${what}` + (t.error ? `, but it stopped: ${t.error.line ? 'line ' + t.error.line + ': ' : ''}${t.error.message}` : `, but it gave ${got}.`)); });
        (d.require || []).forEach(q => { if (!q.ok) bad('The question asks you to ' + q.why + '.'); });
        if (r.score < r.max) (d.points || []).forEach(p => (p.ok ? good('Mark point: ' + p.text + '.') : info('Missing: ' + p.text + '.')));
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
      case 'nuclide': {
        if (d.right === d.total) good('Every box is right.');
        else { (d.right ? good : info)(`${d.right} of ${d.total} boxes right.`);
          (d.wrong || []).slice(0, 4).forEach(w => bad(`${w.side === 'left' ? 'Before' : 'After'} the arrow, particle ${w.i + 1}: the ${w.field === 'A' ? 'mass number' : w.field === 'Z' ? 'proton number' : 'symbol'} should be ${w.want}.`)); }
        if (d.mass[0] != null && d.mass[1] != null && d.mass[0] !== d.mass[1]) bad(`Mass numbers must add up to the same on both sides: ${d.mass[0]} before, ${d.mass[1]} after.`);
        if (d.proton[0] != null && d.proton[1] != null && d.proton[0] !== d.proton[1]) bad(`Proton numbers must add up to the same on both sides: ${d.proton[0]} before, ${d.proton[1]} after.`);
        break; }
      case 'transform':
        if (d.exact) good('Your image is in exactly the right place.');
        else if (d.shifted) { info('Your shape is the right size and the right way round, but in the wrong place.'); bad('Check the line, centre or vector you used.'); }
        else bad('Your image is not right. Check each corner: ' + answer.shape.map(p => '(' + p.join(', ') + ')').join(' ') + ' is where it should be.');
        break;
      case 'numberline': {
        const say = (e, side) => e == null ? `an arrow running ${side === 'lo' ? 'left' : 'right'}` : `${e.closed ? 'a filled circle (●) at' : 'an open circle (○) at'} ${e.v}`;
        ['lo', 'hi'].forEach(k => (d[k] ? good(`The ${k === 'lo' ? 'left' : 'right'} end is right.`) : bad(`The ${k === 'lo' ? 'left' : 'right'} end should be ${say(answer[k], k)}.`)));
        info('Open circle: < or > (the value is not included). Filled circle: ≤ or ≥ (the value is included).');
        break; }
      case 'venn':
        if (d.counts) { d.right === d.of ? good('Every region has the right number.') : bad(`${d.right} of ${d.of} regions are right. Start with the middle (both sets), then each set on its own, then outside.`); }
        else { if (!d.missing.length && !d.extra.length) good('Exactly the right regions are shaded.');
          if (d.missing.length) bad(`${d.missing.length} region${d.missing.length > 1 ? 's' : ''} should also be shaded.`);
          if (d.extra.length) bad(`${d.extra.length} shaded region${d.extra.length > 1 ? 's are' : ' is'} not part of the set.`);
          info('′ means "not in"; ∩ means "in both"; ∪ means "in either or both".'); }
        break;
      case 'bars': {
        const names = cfg.kind === 'histogram' ? (cfg.classes || []).map(c => c.join('–')) : (cfg.labels || []);
        if (!d.wrong.length) good('Every bar is the right height.');
        d.wrong.slice(0, 5).forEach(i => bad(`${names[i] || 'Bar ' + (i + 1)}: should be ${d.want[i]}.`));
        if (cfg.kind === 'histogram' && d.wrong.length) info('Histogram: height = frequency density = frequency ÷ class width.');
        break; }
      case 'construct': (d.criteria || []).forEach(c => {
        if (c.name === 'arcs') (c.ok ? good('Your construction arcs are there, with the right radii.') : bad('Show the construction arcs: set the compasses to each length and draw an arc from each end.'));
        if (c.name === 'figure') (c.ok ? good('The figure is in the right place.') : bad(!c.pOk ? 'The point is not where the arcs cross (allowed: 2 mm).' : 'Join the point to the ends with a ruler.'));
        if (c.name === 'bearing') (c.ok ? good('The bearing is right.') : bad(`The bearing should be ${answer.bearing.deg}°${c.measured != null ? ` (yours is about ${c.measured}°)` : ''}. Measure clockwise from north.`));
        if (c.name === 'distance') (c.ok ? good('The distance is right for the scale.') : bad(`The distance should be ${answer.bearing.dist} cm on the paper${c.measured != null ? ` (yours is ${c.measured} cm)` : ''}.`)); }); break;
      case 'rays':
        (d.good >= d.want ? good : bad)(`${d.good} correct ray${d.good === 1 ? '' : 's'} (${d.want} needed).`);
        if (d.good < d.want) info(cfg.kind === 'mirror' ? 'At a mirror the angle of reflection equals the angle of incidence; trace the reflected ray back (dashed) behind the mirror.' : 'Easy rays: parallel to the axis then through F; straight through the centre of the lens.');
        d.imageOk ? good('The image is in the right place and the right size.') : bad('The image should be where the rays meet' + (cfg.kind === 'mirror' ? ', as far behind the mirror as the object is in front.' : ' (or appear to come from).'));
        break;
      case 'arrows':
        d.per.forEach(x => (x.ok ? good(`${x.label}: right direction and name.`) : bad(`${x.label}: missing, the wrong way, or not named.`)));
        d.cmp.forEach(c => (c.ok ? good(`${c.p} ${c.op === '=' ? 'equals' : c.op === '>' ? 'is bigger than' : 'is smaller than'} ${c.q}: shown by the arrow lengths.`) : bad(`Show ${c.p} ${c.op === '=' ? 'equal to' : c.op === '>' ? 'bigger than' : 'smaller than'} ${c.q} by the arrow lengths.`)));
        if (d.extra) bad(`${d.extra} arrow${d.extra > 1 ? 's' : ''} should not be there (or ${d.extra > 1 ? 'are' : 'is'} unnamed).`);
        break;
      case 'ppc': d.criteria.forEach(c => { if (c.name === 'shift') (c.ok ? good('The curve shifts the right way.') : bad(`The curve should shift ${answer.shift === 'out' ? 'outwards (more of both goods can be made)' : 'inwards (less can be made)'}.`));
        if (c.name === 'point') (c.ok ? good('X is in the right place.') : bad(`X should be ${answer.where === 'inside' ? 'inside the curve (resources unused)' : answer.where === 'on' ? 'on the curve (all resources used)' : 'beyond the curve (not reachable now)'}.`)); }); break;
      case 'pricecontrol': d.criteria.forEach(c => { if (c.name === 'line') (c.ok ? good('The line is on the right side of the equilibrium.') : bad(`A ${answer.control === 'max' ? 'maximum price only has an effect below' : 'minimum price only has an effect above'} the equilibrium.`));
        if (c.name === 'gap') (c.ok ? good(`Right: it causes a ${d.gap}.`) : bad(`It causes a ${d.gap}: at that price the quantity ${d.gap === 'shortage' ? 'demanded is more than the quantity supplied' : 'supplied is more than the quantity demanded'}.`)); }); break;
      case 'circuit': (d.criteria || []).forEach(c => (c.ok ? good(c.name[0].toUpperCase() + c.name.slice(1) + ': right.') : bad(c.name[0].toUpperCase() + c.name.slice(1) + ': not right.'))); break;
    }
    return out;
  }
  M.explain = explain;

  Object.assign(M.MARKERS, { code: markAlgo('code'), flowchart: markAlgo('flowchart'), order: markOrder, sql: markSql, shells: markShells, structure: markStructure, lewis: markLewis, circuit: markCircuit, nuclide: markNuclide, transform: markTransform, numberline: markNumberline, venn: markVenn, bars: markBars, construct: markConstruct, rays: markRays, arrows: markArrows, ppc: markPpc, pricecontrol: markPriceControl });
  M.FEATURE_NAMES = FEATURE_NAMES;
  return M;
});
