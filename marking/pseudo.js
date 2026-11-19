/* Cambridge IGCSE pseudocode — a small interpreter. No AI, no network.
   It lets a student RUN what they wrote, and lets the marker check an algorithm by its behaviour (test cases)
   instead of by its wording.

   NedPseudo.run(code, inputs)          -> { ok, output:[lines], error?:{ line, message }, steps }
   NedPseudo.runFlowchart(value, inputs)-> same, for a flowchart saved by the flowchart builder ({ nodes, edges })
   NedPseudo.features(code)             -> { loop, selection, input, output, array, totalling, counting, procedure, file }

   Understands: DECLARE, CONSTANT, ← (also <- and =), INPUT / READ, OUTPUT / PRINT, IF…THEN…ELSE…ENDIF,
   CASE OF…OTHERWISE…ENDCASE, FOR…TO…STEP…NEXT, WHILE…DO…ENDWHILE, REPEAT…UNTIL, PROCEDURE / FUNCTION / CALL / RETURN,
   1-D and 2-D arrays, + − * / ^ DIV MOD, = <> < > <= >=, AND OR NOT, & for joining strings,
   LENGTH, UCASE, LCASE, SUBSTRING, LEFT, RIGHT, MID, ROUND, INT, RANDOM, DIV(), MOD().
   Keywords and names are not case-sensitive (students are not marked on capitals).
   Text files: OPENFILE "name" FOR READ / WRITE / APPEND, READFILE "name", Var, WRITEFILE "name", Value, CLOSEFILE "name", EOF("name").
   run(code, inputs, limit, files) takes files as { name:[lines] } and returns the files after the run. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NedPseudo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = new Set(['DECLARE', 'CONSTANT', 'INPUT', 'READ', 'OUTPUT', 'PRINT', 'IF', 'THEN', 'ELSE', 'ENDIF', 'CASE', 'OF', 'OTHERWISE', 'ENDCASE', 'FOR', 'TO', 'STEP', 'NEXT',
    'WHILE', 'DO', 'ENDWHILE', 'REPEAT', 'UNTIL', 'PROCEDURE', 'ENDPROCEDURE', 'FUNCTION', 'RETURNS', 'RETURN', 'ENDFUNCTION', 'CALL', 'ARRAY', 'AND', 'OR', 'NOT', 'MOD', 'DIV', 'TRUE', 'FALSE',
    'INTEGER', 'REAL', 'CHAR', 'STRING', 'BOOLEAN', 'DATE', 'ELSEIF', 'OPENFILE', 'READFILE', 'WRITEFILE', 'CLOSEFILE']);
  class PErr extends Error { constructor(message, line) { super(message); this.line = line; } }

  /* ── tokens ── */
  function lex(src) {
    const lines = String(src).replace(/\r/g, '').split('\n');
    const out = [];
    lines.forEach((text, li) => {
      const toks = []; let i = 0; const s = text;
      while (i < s.length) {
        const c = s[i];
        if (c === ' ' || c === '\t' || c === ' ') { i++; continue; }
        if (c === '/' && s[i + 1] === '/') break;
        if (c === '"' || c === "'" || c === '“' || c === '‘') {
          const close = c === '“' ? '”' : c === '‘' ? '’' : c; let j = i + 1, str = '';
          while (j < s.length && s[j] !== close && !(c === '"' && s[j] === '”')) str += s[j++];
          if (j >= s.length) throw new PErr('This text is missing its closing quote mark.', li + 1);
          toks.push({ t: 'str', v: str }); i = j + 1; continue;
        }
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; toks.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
        if (/[A-Za-z_]/.test(c)) { let j = i; while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++; const w = s.slice(i, j), U = w.toUpperCase(); toks.push(KEY.has(U) ? { t: 'kw', v: U } : { t: 'id', v: U, raw: w }); i = j; continue; }
        const two = s.slice(i, i + 2);
        if (two === '<-') { toks.push({ t: 'op', v: '←' }); i += 2; continue; }
        if (two === '<>' || two === '!=') { toks.push({ t: 'op', v: '<>' }); i += 2; continue; }
        if (two === '<=' || two === '>=') { toks.push({ t: 'op', v: two }); i += 2; continue; }
        if (two === '==') { toks.push({ t: 'op', v: '=' }); i += 2; continue; }
        const map = { '←': '←', '≠': '<>', '≤': '<=', '≥': '>=', '×': '*', '÷': '/', '−': '-', '–': '-' };
        if (map[c]) { toks.push({ t: 'op', v: map[c] }); i++; continue; }
        if ('+-*/^=<>(),[]:&'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
        if (c === ';' || c === '?' || c === '.') { i++; continue; }           // harmless punctuation students add
        throw new PErr(`The character "${c}" is not used in pseudocode.`, li + 1);
      }
      if (toks.length) out.push({ line: li + 1, toks });
    });
    return out;
  }

  /* ── expressions (precedence climbing) ── */
  function exprParser(toks, line) {
    let i = 0;
    const peek = () => toks[i], is = (t, v) => toks[i] && toks[i].t === t && (v === undefined || toks[i].v === v);
    const eat = (t, v) => { if (!is(t, v)) throw new PErr(v ? `Expected "${v}" here.` : 'Something is missing in this line.', line); return toks[i++]; };
    function primary() {
      const k = peek();
      if (!k) throw new PErr('This line stops before the expression is finished.', line);
      if (k.t === 'num') { i++; return { k: 'lit', v: k.v }; }
      if (k.t === 'str') { i++; return { k: 'lit', v: k.v }; }
      if (k.t === 'kw' && (k.v === 'TRUE' || k.v === 'FALSE')) { i++; return { k: 'lit', v: k.v === 'TRUE' }; }
      if (k.t === 'op' && k.v === '(') { i++; const e = or(); eat('op', ')'); return e; }
      if (k.t === 'op' && k.v === '-') { i++; return { k: 'neg', a: unary() }; }
      if (k.t === 'kw' && (k.v === 'MOD' || k.v === 'DIV') && toks[i + 1] && toks[i + 1].v === '(') { i += 2; const a = or(); eat('op', ','); const b = or(); eat('op', ')'); return { k: 'bin', op: k.v, a, b }; }
      if (k.t === 'id') {
        i++;
        if (is('op', '(')) { i++; const args = []; if (!is('op', ')')) { args.push(or()); while (is('op', ',')) { i++; args.push(or()); } } eat('op', ')'); return { k: 'call', name: k.v, args }; }
        if (is('op', '[')) { i++; const idx = [or()]; while (is('op', ',')) { i++; idx.push(or()); } eat('op', ']'); return { k: 'idx', name: k.v, idx }; }
        return { k: 'var', name: k.v };
      }
      throw new PErr(`"${k.raw || k.v}" cannot be used here.`, line);
    }
    function unary() { if (is('kw', 'NOT')) { i++; return { k: 'not', a: unary() }; } return pow(); }
    function pow() { let a = primary(); while (is('op', '^')) { i++; a = { k: 'bin', op: '^', a, b: unaryNoNot() }; } return a; }
    function unaryNoNot() { if (is('op', '-')) { i++; return { k: 'neg', a: primary() }; } return primary(); }
    function mul() { let a = unary(); while ((peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) || is('kw', 'MOD') || is('kw', 'DIV')) { const op = toks[i++].v; a = { k: 'bin', op, a, b: unary() }; } return a; }
    function add() { let a = mul(); while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-' || peek().v === '&')) { const op = toks[i++].v; a = { k: 'bin', op, a, b: mul() }; } return a; }
    function cmp() { let a = add(); while (peek() && peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) { const op = toks[i++].v; a = { k: 'bin', op, a, b: add() }; } return a; }
    function and() { let a = cmp(); while (is('kw', 'AND')) { i++; a = { k: 'bin', op: 'AND', a, b: cmp() }; } return a; }
    function or() { let a = and(); while (is('kw', 'OR')) { i++; a = { k: 'bin', op: 'OR', a, b: and() }; } return a; }
    return { expr: or, peek, is, eat, pos: () => i, done: () => i >= toks.length, rest: () => toks.slice(i) };
  }
  function parseExprTokens(toks, line) { const p = exprParser(toks, line); const e = p.expr(); if (!p.done()) throw new PErr(`"${p.peek().raw || p.peek().v}" was not expected here.`, line); return e; }
  function target(p, line) {
    const id = p.eat('id');
    if (p.is('op', '[')) { p.eat('op', '['); const idx = [p.expr()]; while (p.is('op', ',')) { p.eat('op', ','); idx.push(p.expr()); } p.eat('op', ']'); return { name: id.v, idx }; }
    return { name: id.v };
  }

  /* ── statements ── */
  function parse(src) {
    // mark schemes write file names without quotes (OPENFILE MyFile.txt FOR READ): accept that
    src = String(src).replace(/\b(OPENFILE|READFILE|WRITEFILE|CLOSEFILE|EOF\s*\()\s*([A-Za-z_][\w-]*\.(?:txt|dat|csv))\b/gi, (m, k, f) => k + (/\($/.test(k) ? '' : ' ') + '"' + f + '"');
    const L = lex(src); let n = 0;
    const first = () => (L[n] ? L[n].toks[0] : null);
    const kw = v => first() && first().t === 'kw' && first().v === v;
    function block(enders) {
      const out = [];
      while (n < L.length && !(first().t === 'kw' && enders.includes(first().v))) out.push(stmt());
      return out;
    }
    function endifAhead() {                    // is there an ENDIF for an IF that starts here, before the enclosing block ends?
      let depth = 0;
      for (let k = n; k < L.length; k++) {
        const t = L[k].toks[0]; if (!t || t.t !== 'kw') continue;
        const last = L[k].toks[L[k].toks.length - 1];
        if (t.v === 'IF') { const thenAt = L[k].toks.findIndex(x => x.t === 'kw' && x.v === 'THEN'); const oneLine = thenAt >= 0 && thenAt < L[k].toks.length - 1 && !(last.t === 'kw' && last.v === 'ENDIF');
          if (!(last.t === 'kw' && last.v === 'ENDIF') && !oneLine) depth++; continue; }
        if (t.v === 'ENDIF') { if (depth === 0) return true; depth--; continue; }
        if (depth === 0 && ['NEXT', 'ENDWHILE', 'UNTIL', 'ENDFUNCTION', 'ENDPROCEDURE', 'ENDCASE'].includes(t.v)) return false;
      }
      return false;
    }
    function need(v, what, openLine) { if (!kw(v)) throw new PErr(`${what} (started on line ${openLine}) needs ${v} to close it.`, L[Math.min(n, L.length - 1)].line); return L[n++]; }
    function inline(toks, line) { const save = [L, n]; const sub = parseTokensAsStatement(toks, line); return sub; }
    function parseTokensAsStatement(toks, line) { const tmp = L.splice(n, 0, { line, toks }); const s = stmt(); return s; }
    function stmt() {
      const { line, toks } = L[n]; const t0 = toks[0];
      const p = exprParser(toks, line);
      if (t0.t === 'kw') {
        switch (t0.v) {
          case 'DECLARE': { n++; p.eat('kw', 'DECLARE'); const names = [p.eat('id').v]; while (p.is('op', ',')) { p.eat('op', ','); names.push(p.eat('id').v); }
            let type = null, dims = null;
            if (p.is('op', ':')) { p.eat('op', ':');
              if (p.is('kw', 'ARRAY')) { p.eat('kw', 'ARRAY'); p.eat('op', '['); dims = []; do { if (dims.length) p.eat('op', ','); const lo = p.expr(); p.eat('op', ':'); const hi = p.expr(); dims.push([lo, hi]); } while (p.is('op', ',')); p.eat('op', ']'); p.eat('kw', 'OF'); }
              type = p.eat('kw').v; }
            return { k: 'declare', names, type, dims, line }; }
          case 'CONSTANT': { n++; p.eat('kw', 'CONSTANT'); const name = p.eat('id').v; if (p.is('op', '←')) p.eat('op', '←'); else p.eat('op', '='); return { k: 'assign', to: { name }, e: p.expr(), line }; }
          case 'INPUT': case 'READ': { n++; p.eat('kw'); const ts = []; if (p.is('str')) { p.eat('str'); if (p.is('op', ',')) p.eat('op', ','); } ts.push(target(p, line)); while (p.is('op', ',')) { p.eat('op', ','); ts.push(target(p, line)); } return { k: 'input', ts, line }; }
          case 'OPENFILE': { n++; p.eat('kw'); const f = p.expr(); if (!p.is('kw', 'FOR')) throw new PErr('OPENFILE needs FOR READ, FOR WRITE or FOR APPEND after the file name.', line); p.eat('kw', 'FOR');
            const md = String((p.done() ? {} : p.eat(p.is('kw') ? 'kw' : 'id')).v || '').toUpperCase(); if (!['READ', 'WRITE', 'APPEND'].includes(md)) throw new PErr('OPENFILE needs FOR READ, FOR WRITE or FOR APPEND.', line);
            return { k: 'open', f, mode: md, line }; }
          case 'READFILE': { n++; p.eat('kw'); const f = p.expr(); p.eat('op', ','); return { k: 'readf', f, t: target(p, line), line }; }
          case 'WRITEFILE': { n++; p.eat('kw'); const f = p.expr(); p.eat('op', ','); return { k: 'writef', f, e: p.expr(), line }; }
          case 'CLOSEFILE': { n++; p.eat('kw'); return { k: 'close', f: p.expr(), line }; }
          case 'OUTPUT': case 'PRINT': { n++; p.eat('kw'); const es = []; if (!p.done()) { es.push(p.expr()); while (p.is('op', ',')) { p.eat('op', ','); es.push(p.expr()); } } if (!p.done()) throw new PErr('Separate the things you OUTPUT with commas.', line); return { k: 'output', es, line }; }
          case 'IF': { n++; p.eat('kw', 'IF'); const cond = p.expr(); let rest = [];
            if (p.is('kw', 'THEN')) { p.eat('kw', 'THEN'); rest = p.rest(); } else if (!p.done()) throw new PErr('IF needs THEN after the condition.', line);
            else { if (!kw('THEN')) throw new PErr('IF needs THEN after the condition.', line); rest = L[n].toks.slice(1); n++; }
            const yes = [], no = [];
            // 'IF X > 5 THEN Count ← Count + 1' on one line with no ENDIF anywhere after it: a one-line IF (examiners accept it)
            if (rest.length && !(rest[rest.length - 1].t === 'kw' && rest[rest.length - 1].v === 'ENDIF') && !(rest[0].t === 'kw' && rest[0].v === 'IF') && !endifAhead()) {
              const el = rest.findIndex(x => x.t === 'kw' && x.v === 'ELSE');
              L.splice(n, 0, { line, toks: el > 0 ? rest.slice(0, el) : rest }); yes.push(stmt());
              if (el > 0 && el < rest.length - 1) { L.splice(n, 0, { line, toks: rest.slice(el + 1) }); no.push(stmt()); }
              else if (kw('ELSE') && L[n].toks.length > 1) { const e = L[n]; e.toks.shift(); no.push(stmt()); }
              return { k: 'if', cond, yes, no, line };
            }
            if (rest.length) { const last = rest[rest.length - 1]; if (rest.length > 1 && last.t === 'kw' && last.v === 'ENDIF') L.splice(n, 0, { line, toks: rest.slice(0, -1) }, { line, toks: [last] }); else L.splice(n, 0, { line, toks: rest }); }   // one-line IF … THEN … ENDIF
            yes.push(...block(['ELSE', 'ENDIF', 'ELSEIF']));
            if (kw('ELSE')) { const e = L[n]; if (e.toks.length > 1) { e.toks.shift(); } else n++; no.push(...block(['ENDIF'])); }
            need('ENDIF', 'IF', line);
            return { k: 'if', cond, yes, no, line }; }
          case 'CASE': { n++; p.eat('kw', 'CASE'); if (p.is('kw', 'OF')) p.eat('kw', 'OF'); const subj = p.expr(); const arms = []; let other = null;
            while (n < L.length && !kw('ENDCASE')) {
              const row = L[n]; const q = exprParser(row.toks, row.line);
              if (q.is('kw', 'OTHERWISE')) { q.eat('kw', 'OTHERWISE'); if (q.is('op', ':')) q.eat('op', ':'); const r = q.rest(); n++; if (r.length) L.splice(n, 0, { line: row.line, toks: r }); other = []; while (n < L.length && !kw('ENDCASE')) other.push(stmt()); break; }
              const vals = [q.expr()]; let range = null;
              if (q.is('kw', 'TO')) { q.eat('kw', 'TO'); range = q.expr(); }
              while (q.is('op', ',')) { q.eat('op', ','); vals.push(q.expr()); }
              q.eat('op', ':'); const r = q.rest(); n++;
              if (!r.length) throw new PErr('Put the statement for this CASE value after the colon.', row.line);
              L.splice(n, 0, { line: row.line, toks: r }); arms.push({ vals, range, body: [stmt()] });
            }
            need('ENDCASE', 'CASE', line); return { k: 'case', subj, arms, other, line }; }
          case 'FOR': { n++; p.eat('kw', 'FOR'); const v = p.eat('id').v; if (p.is('op', '←')) p.eat('op', '←'); else p.eat('op', '='); const from = p.expr(); p.eat('kw', 'TO'); const to = p.expr(); let step = null; if (p.is('kw', 'STEP')) { p.eat('kw', 'STEP'); step = p.expr(); }
            const body = block(['NEXT']); need('NEXT', 'FOR', line); return { k: 'for', v, from, to, step, body, line }; }
          case 'WHILE': { n++; p.eat('kw', 'WHILE'); const cond = p.expr(); if (p.is('kw', 'DO')) p.eat('kw', 'DO'); else if (kw('DO') && L[n].toks.length === 1) n++; const body = block(['ENDWHILE']); need('ENDWHILE', 'WHILE', line); return { k: 'while', cond, body, line }; }
          case 'REPEAT': { n++; const body = block(['UNTIL']); const u = need('UNTIL', 'REPEAT', line); return { k: 'repeat', body, cond: parseExprTokens(u.toks.slice(1), u.line), line }; }
          case 'PROCEDURE': case 'FUNCTION': { n++; p.eat('kw'); const name = p.eat('id').v; const params = [];
            if (p.is('op', '(')) { p.eat('op', '('); while (!p.is('op', ')')) { if (p.is('kw')) p.eat('kw'); params.push(p.eat('id').v); if (p.is('op', ':')) { p.eat('op', ':'); p.eat('kw'); } if (p.is('op', ',')) p.eat('op', ','); } p.eat('op', ')'); }
            const end = t0.v === 'PROCEDURE' ? 'ENDPROCEDURE' : 'ENDFUNCTION'; const body = block([end]); need(end, t0.v, line); return { k: 'def', name, params, body, line }; }
          case 'CALL': { n++; p.eat('kw', 'CALL'); const name = p.eat('id').v; const args = []; if (p.is('op', '(')) { p.eat('op', '('); if (!p.is('op', ')')) { args.push(p.expr()); while (p.is('op', ',')) { p.eat('op', ','); args.push(p.expr()); } } p.eat('op', ')'); } return { k: 'callstmt', name, args, line }; }
          case 'RETURN': { n++; p.eat('kw', 'RETURN'); return { k: 'return', e: p.done() ? null : p.expr(), line }; }
          case 'THEN': throw new PErr('THEN must come straight after an IF condition.', line);
          case 'ELSE': case 'ENDIF': case 'NEXT': case 'ENDWHILE': case 'UNTIL': case 'ENDCASE': case 'ENDPROCEDURE': case 'ENDFUNCTION': case 'OTHERWISE':
            throw new PErr(`${t0.v} has nothing to close. Check that the matching opening line is there.`, line);
          default: throw new PErr(`A line cannot start with ${t0.v}.`, line);
        }
      }
      if (t0.t === 'id') {
        n++; const to = target(p, line);
        if (p.is('op', '←') || p.is('op', '=')) { p.eat('op'); const e = p.expr(); if (!p.done()) throw new PErr(`"${p.peek().raw || p.peek().v}" was not expected here.`, line); return { k: 'assign', to, e, line }; }
        if (p.done() && !to.idx) return { k: 'callstmt', name: to.name, args: [], line };
        throw new PErr(`Use ← to give "${t0.raw}" a value.`, line);
      }
      throw new PErr('This line is not a pseudocode statement.', line);
    }
    const prog = [];
    while (n < L.length) prog.push(stmt());
    return prog;
  }

  /* ── running ── */
  const num = (v, line) => { if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '' && !isNaN(+v)) return +v; if (typeof v === 'boolean') throw new PErr('TRUE/FALSE cannot be used as a number.', line); throw new PErr(`"${v}" is not a number.`, line); };
  const show = v => (typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : typeof v === 'number' ? String(+v.toFixed(10)) : String(v));
  function machine(inputs, limit, files, given, random) {
    // tests can fix what RANDOM() returns (a list used in turn), so a program that uses it can still be checked
    let ri = 0; const rnd = () => (random && random.length ? +random[(ri++) % random.length] : Math.random());
    const globals = new Map(), types = new Map(), defs = new Map(), out = [];
    // data the question says already exists (variables, arrays): set before the program runs, and a DECLARE of it keeps it
    const givenNames = new Set();
    Object.keys(given || {}).forEach(k => { const N = k.toUpperCase(); globals.set(N, toValue(given[k])); givenNames.add(N); });
    const store = {}; Object.keys(files || {}).forEach(k => { store[k] = (files[k] || []).map(String); });
    const opened = {};
    const fileOf = (name, line, mode) => { const o = opened[name]; if (!o) throw new PErr(`The file "${name}" is not open. Use OPENFILE first.`, line); if (mode && (mode === 'READ') !== (o.mode === 'READ')) throw new PErr(`The file "${name}" was opened FOR ${o.mode}, so it cannot be ${mode === 'READ' ? 'read' : 'written'}.`, line); return o; };
    const queue = (inputs || []).map(x => x); let steps = 0;
    const tick = line => { if (++steps > (limit || 100000)) throw new PErr('The program ran for too long. A loop probably never ends.', line); };
    const frames = [globals];
    const scope = name => { for (let f = frames.length - 1; f >= 0; f -= frames.length - 1 - f > 0 ? f : 1) { if (frames[f].has(name)) return frames[f]; if (f === 0) break; f = 1; } return null; };
    const lookup = name => (frames[frames.length - 1].has(name) ? frames[frames.length - 1] : globals.has(name) ? globals : null);
    function get(name, line) { const s = lookup(name); if (!s) throw new PErr(`"${name}" is used before it has been given a value.`, line); return s.get(name); }
    function set(name, v) { const s = lookup(name) || frames[frames.length - 1]; s.set(name, v); }
    function ev(e, line) {
      switch (e.k) {
        case 'lit': return e.v;
        case 'var': { const v = get(e.name, line); if (v && v.__arr) throw new PErr(`"${e.name}" is an array: say which element, e.g. ${e.name}[1].`, line); return v; }
        case 'idx': { const a = get(e.name, line); if (typeof a === 'string' && e.idx.length === 1) { return a[num(ev(e.idx[0], line), line) - 1] || ''; } if (!a || !a.__arr) throw new PErr(`"${e.name}" is not an array.`, line);
          const key = e.idx.map(x => num(ev(x, line), line)); bounds(a, key, e.name, line); const v = a.data.get(key.join(',')); if (v === undefined) throw new PErr(`${e.name}[${key.join(',')}] has not been given a value yet.`, line); return v; }
        case 'neg': return -num(ev(e.a, line), line);
        case 'not': return !truth(ev(e.a, line), line);
        case 'call': return call(e.name, e.args.map(a => ev(a, line)), line, true);
        case 'bin': {
          if (e.op === 'AND') return truth(ev(e.a, line), line) && truth(ev(e.b, line), line);
          if (e.op === 'OR') return truth(ev(e.a, line), line) || truth(ev(e.b, line), line);
          const a = ev(e.a, line), b = ev(e.b, line);
          switch (e.op) {
            case '+': return (typeof a === 'string' && isNaN(+a)) || (typeof b === 'string' && isNaN(+b)) ? show(a) + show(b) : num(a, line) + num(b, line);
            case '&': return show(a) + show(b);
            case '-': return num(a, line) - num(b, line);
            case '*': return num(a, line) * num(b, line);
            case '/': if (num(b, line) === 0) throw new PErr('Division by zero.', line); return num(a, line) / num(b, line);
            case '^': return Math.pow(num(a, line), num(b, line));
            case 'DIV': if (num(b, line) === 0) throw new PErr('Division by zero.', line); return Math.trunc(num(a, line) / num(b, line));
            case 'MOD': if (num(b, line) === 0) throw new PErr('Division by zero.', line); return num(a, line) % num(b, line);
            default: { let x = a, y = b;
              if (typeof x !== typeof y) { if (!isNaN(+x) && !isNaN(+y) && typeof x !== 'boolean' && typeof y !== 'boolean') { x = +x; y = +y; } else { x = show(x); y = show(y); } }
              if (typeof x === 'string') { x = x.toLowerCase() === x.toUpperCase() ? x : x; }
              switch (e.op) { case '=': return x === y; case '<>': return x !== y; case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y; } }
          }
        }
      }
      throw new PErr('This expression cannot be worked out.', line);
    }
    const truth = (v, line) => { if (typeof v === 'boolean') return v; throw new PErr('A condition must be true or false, for example Count < 10.', line); };
    function bounds(a, key, name, line) { key.forEach((k, d) => { if (!Number.isInteger(k) || k < a.dims[d][0] || k > a.dims[d][1]) throw new PErr(`${name}[${key.join(',')}] is outside the array (it goes from ${a.dims[d][0]} to ${a.dims[d][1]}).`, line); }); }
    function assign(to, v, line) {
      if (!to.idx) return set(to.name, v);
      let a = lookup(to.name) ? get(to.name, line) : null;
      const key = to.idx.map(x => num(ev(x, line), line));
      if (!a || !a.__arr) { a = { __arr: true, dims: key.map(() => [-1e9, 1e9]), data: new Map() }; set(to.name, a); }      // undeclared arrays are allowed (lenient)
      bounds(a, key, to.name, line); a.data.set(key.join(','), v);
    }
    function call(name, args, line, wantValue) {
      const B = { EOF: s => { const nm = show(s[0]), o = fileOf(nm, line, 'READ'); return o.pos >= (store[nm] || []).length; }, LENGTH: s => show(s[0]).length, UCASE: s => show(s[0]).toUpperCase(), LCASE: s => show(s[0]).toLowerCase(), UPPER: s => show(s[0]).toUpperCase(), LOWER: s => show(s[0]).toLowerCase(),
        SUBSTRING: s => show(s[0]).substr(num(s[1], line) - 1, num(s[2], line)), MID: s => show(s[0]).substr(num(s[1], line) - 1, num(s[2], line)), LEFT: s => show(s[0]).slice(0, num(s[1], line)), RIGHT: s => { const t = show(s[0]); return t.slice(Math.max(0, t.length - num(s[1], line))); },
        ROUND: s => { const p = Math.pow(10, s.length > 1 ? num(s[1], line) : 0); return Math.round(num(s[0], line) * p) / p; }, INT: s => Math.trunc(num(s[0], line)), RANDOM: s => (s.length >= 2 ? num(s[0], line) + Math.floor(rnd() * (num(s[1], line) - num(s[0], line) + 1)) : rnd()), RAND: s => (s.length >= 2 ? num(s[0], line) + Math.floor(rnd() * (num(s[1], line) - num(s[0], line) + 1)) : s.length ? Math.floor(rnd() * num(s[0], line)) : rnd()),
        NUM_TO_STR: s => show(s[0]), STR_TO_NUM: s => num(s[0], line), ASC: s => show(s[0]).charCodeAt(0), CHR: s => String.fromCharCode(num(s[0], line)) };
      if (B[name] && !defs.has(name)) return B[name](args);          // a FUNCTION the program defines wins over a built-in of the same name
      const d = defs.get(name);
      if (!d) throw new PErr(`There is no function or procedure called "${name}".`, line);
      if (frames.length > 60) throw new PErr('Too many calls inside calls.', line);
      const f = new Map(); d.params.forEach((p, i) => f.set(p, args[i])); frames.push(f);
      let ret;
      try { exec(d.body); } catch (r) { if (r && r.__ret) ret = r.v; else { frames.pop(); throw r; } }
      frames.pop();
      if (wantValue && ret === undefined) throw new PErr(`"${name}" does not RETURN a value.`, line);
      return ret;
    }
    function exec(list) {
      for (const s of list) {
        tick(s.line);
        switch (s.k) {
          case 'declare': s.names.forEach(nm => { if (s.type) types.set(nm, s.type); if (s.dims && !(givenNames.has(nm) && frames.length === 1)) frames[frames.length - 1].set(nm, { __arr: true, dims: s.dims.map(d => [num(ev(d[0], s.line), s.line), num(ev(d[1], s.line), s.line)]), data: new Map() }); }); break;
          case 'assign': assign(s.to, ev(s.e, s.line), s.line); break;
          case 'input': s.ts.forEach(t => { if (!queue.length) throw new PErr('The program asked for more input than it was given.', s.line); let v = queue.shift(); const ty = types.get(t.name);
            if (typeof v === 'string' && /^\s*-?(\d+\.?\d*|\.\d+)\s*$/.test(v) && ty !== 'STRING' && ty !== 'CHAR') v = +v; assign(t, v, s.line); }); break;
          case 'open': { const nm = show(ev(s.f, s.line)); if (s.mode === 'READ' && !store[nm]) throw new PErr(`There is no file called "${nm}".`, s.line); if (s.mode === 'WRITE' || !store[nm]) store[nm] = []; opened[nm] = { mode: s.mode, pos: 0 }; break; }
          case 'readf': { const nm = show(ev(s.f, s.line)), o = fileOf(nm, s.line, 'READ'); if (o.pos >= store[nm].length) throw new PErr(`The program read past the end of "${nm}". Check EOF first.`, s.line); let v = store[nm][o.pos++]; const ty = types.get(s.t.name); if (v.trim() !== '' && !isNaN(+v) && ty !== 'STRING' && ty !== 'CHAR') v = +v; assign(s.t, v, s.line); break; }
          case 'writef': { const nm = show(ev(s.f, s.line)); fileOf(nm, s.line, 'WRITE'); store[nm].push(show(ev(s.e, s.line))); break; }
          case 'close': { const nm = show(ev(s.f, s.line)); fileOf(nm, s.line); delete opened[nm]; break; }
          case 'output': out.push(s.es.map(e => show(ev(e, s.line))).reduce((a, b) => a + (/\d$/.test(a) && /^-?\d/.test(b) ? ' ' : '') + b, '')); break;   // two numbers side by side keep a space between them
          case 'if': exec(truth(ev(s.cond, s.line), s.line) ? s.yes : s.no); break;
          case 'case': { const v = ev(s.subj, s.line); let done = false;
            for (const a of s.arms) { const hit = a.range ? (v >= ev(a.vals[0], s.line) && v <= ev(a.range, s.line)) : a.vals.some(x => { const y = ev(x, s.line); return y === v || (!isNaN(+y) && !isNaN(+v) && +y === +v) || show(y) === show(v); }); if (hit) { exec(a.body); done = true; break; } }
            if (!done && s.other) exec(s.other); break; }
          case 'for': { const a = num(ev(s.from, s.line), s.line), b = num(ev(s.to, s.line), s.line), st = s.step ? num(ev(s.step, s.line), s.line) : 1; if (st === 0) throw new PErr('STEP cannot be 0.', s.line);
            for (let i = a; st > 0 ? i <= b : i >= b; i += st) { tick(s.line); set(s.v, i); exec(s.body); } break; }
          case 'while': while (truth(ev(s.cond, s.line), s.line)) { tick(s.line); exec(s.body); } break;
          case 'repeat': do { tick(s.line); exec(s.body); } while (!truth(ev(s.cond, s.line), s.line)); break;
          case 'def': defs.set(s.name, s); break;
          case 'callstmt': call(s.name, s.args.map(a => ev(a, s.line)), s.line, false); break;
          case 'return': throw { __ret: true, v: s.e ? ev(s.e, s.line) : undefined };
        }
      }
    }
    const snapshot = names => { const o = {}; (names || []).forEach(n => { const v = globals.get(String(n).toUpperCase()); o[n] = v && v.__arr ? fromArray(v) : v; }); return o; };
    return { exec, out, ev, truth, assign, queue, steps: () => steps, tick, defs, files: store, snapshot, used: () => (inputs || []).length - queue.length };
  }
  /* given values: a JS array is a 1-D array from index 1, an array of arrays is 2-D; {dims:[[lo,hi]…], data:{'i,j':v}} sets the bounds */
  function toValue(v) {
    if (Array.isArray(v)) {
      const two = v.length && Array.isArray(v[0]), data = new Map();
      if (two) { v.forEach((row, i) => row.forEach((x, j) => data.set((i + 1) + ',' + (j + 1), x))); return { __arr: true, dims: [[1, v.length], [1, Math.max(...v.map(r => r.length))]], data }; }
      v.forEach((x, i) => data.set(String(i + 1), x)); return { __arr: true, dims: [[1, v.length]], data };
    }
    if (v && typeof v === 'object' && v.dims) return { __arr: true, dims: v.dims, data: new Map(Object.entries(v.data || {})) };
    return v;
  }
  function fromArray(a) {
    if (a.dims.length === 1) { const out = []; for (let i = a.dims[0][0]; i <= Math.min(a.dims[0][1], a.dims[0][0] + 999); i++) out.push(a.data.has(String(i)) ? a.data.get(String(i)) : null); return out; }
    const out = []; for (let i = a.dims[0][0]; i <= Math.min(a.dims[0][1], 200); i++) { const row = []; for (let j = a.dims[1][0]; j <= Math.min(a.dims[1][1], 200); j++) row.push(a.data.has(i + ',' + j) ? a.data.get(i + ',' + j) : null); out.push(row); } return out;
  }
  /* opts: { given:{ Name: value }, vars:[names to report after the run] } -> the result also has used (inputs read) and vars */
  function run(code, inputs, limit, files, opts) {
    let m = null;
    const done = r => Object.assign(r, m ? { used: m.used(), vars: m.snapshot(opts && opts.vars) } : {});
    try { const prog = parse(code); m = machine(inputs, limit, files, opts && opts.given, opts && opts.random); prog.filter(s => s.k === 'def').forEach(s => m.defs.set(s.name, s)); m.exec(prog.filter(s => s.k !== 'def')); return done({ ok: true, output: m.out, steps: m.steps(), files: m.files }); }
    catch (e) { if (e && e.__ret) return done({ ok: true, output: m.out, steps: m.steps(), files: m.files }); if (e instanceof PErr) return done({ ok: false, output: m ? m.out : [], error: { line: e.line || null, message: e.message }, steps: m ? m.steps() : 0 }); throw e; }
  }
  function check(code) { try { parse(code); return null; } catch (e) { if (e instanceof PErr) return { line: e.line || null, message: e.message }; throw e; } }

  /* ── flowcharts: every box holds a pseudocode statement, a decision holds a condition, arrows are Yes / No ── */
  function runFlowchart(value, inputs, limit, files, opts) {
    const nodes = (value && value.nodes) || [], edges = (value && value.edges) || [];
    let m = null;
    const where = n => `the box "${(n.text || '').trim() || n.type}"`;
    try {
      m = machine(inputs, limit, files, opts && opts.given, opts && opts.random);
      const done = r => Object.assign(r, { used: m.used(), vars: m.snapshot(opts && opts.vars) });
      const isStart = n => /^(start|begin)$/i.test((n.text || '').trim());
      const isStop = n => /^(stop|end|finish)$/i.test((n.text || '').trim());
      let cur = nodes.find(isStart) || nodes.find(n => !edges.some(e => e.to === n.id));
      if (!cur) throw new PErr('The flowchart needs a START box.');
      for (let guard = 0; guard < 20000; guard++) {
        m.tick(null);
        const outs = edges.filter(e => e.from === cur.id);
        const text = (cur.text || '').trim();
        let next = null;
        if (isStop(cur)) return done({ ok: true, output: m.out, steps: m.steps() });
        if (cur.type === 'decision') {
          const cond = text.replace(/^\s*is\s+/i, '').replace(/\?\s*$/, '');
          let v; try { v = m.truth(m.ev(parseExprTokens(lex(cond)[0].toks, 1), 1), 1); } catch (e) { throw new PErr(`In ${where(cur)}: ${e.message}`); }
          const yes = outs.find(e => /^(y|yes|true|t)$/i.test((e.label || '').trim())), no = outs.find(e => /^(n|no|false|f)$/i.test((e.label || '').trim()));
          if (!yes || !no) throw new PErr(`${where(cur)} needs one arrow labelled Yes and one labelled No.`);
          next = v ? yes : no;
        } else {
          if (text && !isStart(cur)) {
            const lines = text.split(/\n|;|,(?![^\[\(]*[\]\)])(?=\s*[A-Za-z_]\w*\s*(?:←|<-|=))/);
            for (const ln of lines) { if (!ln.trim()) continue; const src = cur.type === 'io' && !/^\s*(input|output|print|read)\b/i.test(ln) ? ln : ln; let prog; try { prog = parse(src); } catch (e) { throw new PErr(`In ${where(cur)}: ${e.message}`); } try { m.exec(prog); } catch (e) { if (e instanceof PErr) throw new PErr(`In ${where(cur)}: ${e.message}`); throw e; } }
          }
          if (outs.length > 1) throw new PErr(`${where(cur)} has more than one arrow leaving it. Only a decision can branch.`);
          next = outs[0];
        }
        if (!next) throw new PErr(`The flowchart stops at ${where(cur)} without reaching STOP.`);
        cur = nodes.find(n => n.id === next.to);
        if (!cur) throw new PErr('An arrow points to nothing.');
      }
      throw new PErr('The flowchart ran for too long. A loop probably never ends.');
    } catch (e) { if (e instanceof PErr) return { ok: false, output: m ? m.out : [], error: { line: null, message: e.message }, steps: m ? m.steps() : 0 }; throw e; }
  }

  /* what the writing contains, judged from the words alone — still works when the code has a syntax slip */
  function features(code) {
    const s = ' ' + String(code).replace(/\/\/.*$/gm, '').replace(/"[^"]*"|'[^']*'/g, '""') + ' ';
    const has = re => re.test(s);
    return {
      loop: has(/\b(FOR|WHILE|REPEAT)\b/i), selection: has(/\b(IF|CASE)\b/i), input: has(/\b(INPUT|READ)\b/i), output: has(/\b(OUTPUT|PRINT)\b/i),
      array: has(/[A-Za-z_]\w*\s*\[[^\]]+\]/), procedure: has(/\b(PROCEDURE|FUNCTION)\b/i),
      totalling: /([A-Za-z_]\w*)\s*(?:←|<-|=)\s*\1\s*\+\s*(?!1\b)[A-Za-z_]/i.test(s),
      counting: /([A-Za-z_]\w*)\s*(?:←|<-|=)\s*\1\s*\+\s*1\b/i.test(s),
      file: has(/\b(OPENFILE|READFILE|WRITEFILE)\b/i),
      forLoop: has(/\bFOR\b/i), whileLoop: has(/\bWHILE\b/i), repeatLoop: has(/\bREPEAT\b/i),
    };
  }
  /* does the output contain every expected item, in order? numbers compare as numbers; prompts and extra text are ignored */
  function outputMatches(output, expect) {
    const hay = output.join('\n').toLowerCase(); let pos = 0;
    for (const want of expect) {
      const w = String(want).toLowerCase().trim();
      let at = -1;
      if (w !== '' && !isNaN(+w)) { const re = /-?\d+(?:\.\d+)?/g; re.lastIndex = pos; let m; while ((m = re.exec(hay))) { const dp = (m[0].split('.')[1] || '').length; if (Math.abs(+m[0] - +w) < 1e-6 * Math.max(1, Math.abs(+w)) || (dp >= 2 && Math.abs(+m[0] - +w) <= 0.5 * Math.pow(10, -dp) + 1e-9)) { at = m.index + m[0].length; break; } } }
      else { let k = hay.indexOf(w, pos); while (k >= 0 && !/^(no|not)\b/.test(w) && /\b(no|not)\s+$/.test(hay.slice(Math.max(0, k - 5), k))) k = hay.indexOf(w, k + 1); if (k >= 0) at = k + w.length; }   // 'no drought' is not 'drought'
      if (at < 0) return false; pos = at;
    }
    return true;
  }
  return { run, check, parse, runFlowchart, features, outputMatches };
});
