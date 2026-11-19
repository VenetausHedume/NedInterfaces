/* A very small SQL engine for IGCSE queries: one table, SELECT … FROM … [WHERE …] [ORDER BY …].
   NedSql.run(query, tables) -> { ok, columns:[…], rows:[[…]], ordered, error? }
   tables = { Students: { columns:['Name','Class','Mark'], rows:[['Asha',10,71], …] } }
   Supports: column lists, *, COUNT(*) / COUNT(col) / SUM / AVG / MIN / MAX, WHERE with = <> < > <= >= LIKE (with %),
   AND / OR / NOT and brackets, ORDER BY col [ASC|DESC] (several columns). Names and keywords ignore case. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NedSql = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  class SErr extends Error {}
  function lex(q) {
    const out = []; let i = 0; q = String(q).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
    while (i < q.length) {
      const c = q[i];
      if (/\s/.test(c) || c === ';') { i++; continue; }
      if (c === "'" || c === '"') { let j = i + 1, s = ''; while (j < q.length && q[j] !== c) s += q[j++]; if (j >= q.length) throw new SErr('A piece of text is missing its closing quote mark.'); out.push({ t: 'str', v: s }); i = j + 1; continue; }
      if (/[0-9]/.test(c)) { let j = i; while (j < q.length && /[0-9.]/.test(q[j])) j++; out.push({ t: 'num', v: parseFloat(q.slice(i, j)) }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (j < q.length && /[A-Za-z0-9_]/.test(q[j])) j++; out.push({ t: 'id', v: q.slice(i, j), u: q.slice(i, j).toUpperCase() }); i = j; continue; }
      const two = q.slice(i, i + 2);
      if (['<>', '!=', '<=', '>='].includes(two)) { out.push({ t: 'op', v: two === '!=' ? '<>' : two }); i += 2; continue; }
      if ('=<>(),*'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
      throw new SErr(`The character "${c}" is not expected in a query.`);
    }
    return out;
  }
  function run(query, tables) {
    try {
      const T = lex(query); let i = 0;
      const is = (u) => T[i] && T[i].t === 'id' && T[i].u === u, op = (v) => T[i] && T[i].t === 'op' && T[i].v === v;
      const eat = (u) => { if (!is(u)) throw new SErr(`Expected ${u}` + (T[i] ? ` but found "${T[i].v}".` : ' but the query ends.')); i++; };
      eat('SELECT');
      const sel = [];
      do {
        if (op(',')) i++;
        if (op('*')) { i++; sel.push({ star: true }); continue; }
        const a = T[i]; if (!a || a.t !== 'id') throw new SErr('After SELECT, list the columns you want.');
        if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(a.u) && T[i + 1] && T[i + 1].v === '(') { i += 2; let col = null; if (op('*')) i++; else { col = T[i].v; i++; } if (!op(')')) throw new SErr('A bracket is not closed.'); i++; sel.push({ fn: a.u, col }); }
        else { i++; sel.push({ col: a.v }); }
      } while (op(','));
      eat('FROM');
      const tn = T[i]; if (!tn || tn.t !== 'id') throw new SErr('After FROM, name the table.'); i++;
      const key = Object.keys(tables || {}).find(k => k.toUpperCase() === tn.u);
      if (!key) throw new SErr(`There is no table called "${tn.v}".`);
      const tab = tables[key], cols = tab.columns;
      const ci = (name) => { const k = cols.findIndex(c => c.toUpperCase() === String(name).toUpperCase()); if (k < 0) throw new SErr(`The table has no column called "${name}".`); return k; };
      let where = null;
      function prim() {
        if (op('(')) { i++; const e = or(); if (!op(')')) throw new SErr('A bracket is not closed.'); i++; return e; }
        if (is('NOT')) { i++; const e = prim(); return r => !e(r); }
        const l = val(); const o = T[i];
        if (o && o.t === 'id' && o.u === 'LIKE') { i++; const p = val(); return r => { const re = new RegExp('^' + String(p(r)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i'); return re.test(String(l(r))); }; }
        if (!o || o.t !== 'op' || !['=', '<>', '<', '>', '<=', '>='].includes(o.v)) {
          // a Boolean field on its own ('WHERE News AND Sport') is allowed by Cambridge: it means News = TRUE
          const yesNo = v => typeof v === 'boolean' || /^(true|false|yes|no|y|n)$/i.test(String(v));
          if ((!o || (o.t === 'id' && ['AND', 'OR', 'ORDER'].includes(o.u)) || (o.t === 'op' && [')', ';'].includes(o.v))) && tab.rows.length && tab.rows.every(r => yesNo(l(r))))
            return r => { const v = l(r); return v === true || /^(true|yes|y)$/i.test(String(v)); };
          throw new SErr('A WHERE condition needs a comparison such as = or >.');
        }
        i++; const rr = val();
        return r => { let a = l(r), b = rr(r); if (typeof a === 'string' && typeof b === 'string') { a = a.toLowerCase(); b = b.toLowerCase(); } else if (typeof a !== typeof b) { if (!isNaN(+a) && !isNaN(+b)) { a = +a; b = +b; } else { a = String(a).toLowerCase(); b = String(b).toLowerCase(); } }
          switch (o.v) { case '=': return a === b; case '<>': return a !== b; case '<': return a < b; case '>': return a > b; case '<=': return a <= b; default: return a >= b; } };
      }
      function val() { const t = T[i]; if (!t) throw new SErr('The condition is not finished.'); i++; if (t.t === 'num' || t.t === 'str') return () => t.v; if (t.t === 'id') { if (t.u === 'TRUE') return () => true; if (t.u === 'FALSE') return () => false; const k = ci(t.v); return r => r[k]; } throw new SErr(`"${t.v}" cannot be used in a condition.`); }
      function and() { let a = prim(); while (is('AND')) { i++; const b = prim(), x = a; a = r => x(r) && b(r); } return a; }
      function or() { let a = and(); while (is('OR')) { i++; const b = and(), x = a; a = r => x(r) || b(r); } return a; }
      if (is('WHERE')) { i++; where = or(); }
      const order = [];
      if (is('ORDER')) { i++; eat('BY'); do { if (op(',')) i++; const c = T[i]; if (!c || c.t !== 'id') throw new SErr('After ORDER BY, name a column.'); i++; let dir = 1; if (is('ASC')) i++; else if (is('DESC')) { i++; dir = -1; } order.push([ci(c.v), dir]); } while (op(',')); }
      if (i < T.length) throw new SErr(`"${T[i].v}" was not expected here.`);
      let rows = tab.rows.filter(r => !where || where(r));
      if (order.length) rows = rows.slice().sort((a, b) => { for (const [k, d] of order) { const x = a[k], y = b[k]; const c = typeof x === 'string' ? String(x).localeCompare(String(y), undefined, { sensitivity: 'base' }) : x - y; if (c) return c * d; } return 0; });
      if (sel.some(s => s.fn)) {
        if (sel.some(s => !s.fn)) throw new SErr('Mixing a total such as COUNT with ordinary columns needs GROUP BY, which is not used at IGCSE.');
        const out = sel.map(s => { const vals = s.col == null ? rows.map(() => 1) : rows.map(r => r[ci(s.col)]);
          switch (s.fn) { case 'COUNT': return vals.length; case 'SUM': return vals.reduce((a, b) => a + (+b), 0); case 'AVG': return vals.length ? vals.reduce((a, b) => a + (+b), 0) / vals.length : null; case 'MIN': return vals.length ? vals.reduce((a, b) => (b < a ? b : a)) : null; default: return vals.length ? vals.reduce((a, b) => (b > a ? b : a)) : null; } });
        return { ok: true, columns: sel.map(s => `${s.fn}(${s.col || '*'})`), rows: [out], ordered: false };
      }
      const idx = []; sel.forEach(s => { if (s.star) cols.forEach((c, k) => idx.push(k)); else idx.push(ci(s.col)); });
      return { ok: true, columns: idx.map(k => cols[k]), rows: rows.map(r => idx.map(k => r[k])), ordered: order.length > 0 };
    } catch (e) { if (e instanceof SErr) return { ok: false, error: e.message, columns: [], rows: [] }; throw e; }
  }
  const cell = v => (typeof v === 'number' ? String(+v.toFixed(6)) : String(v).trim().toLowerCase());
  function sameResult(a, b, ordered) {
    if (!a.ok || !b.ok || a.columns.length !== b.columns.length || a.rows.length !== b.rows.length) return false;
    const A = a.rows.map(r => r.map(cell).join('\u0001')), B = b.rows.map(r => r.map(cell).join('\u0001'));
    if (!ordered) { A.sort(); B.sort(); }
    return A.every((x, i) => x === B[i]);
  }
  /* the four clauses as tidy text, for part marks when the result is not right */
  function clauses(q) {
    const s = ' ' + String(q).replace(/\s+/g, ' ').replace(/;/g, '').trim() + ' ';
    const g = (re) => { const m = s.match(re); return m ? m[1].trim().toUpperCase().replace(/\s*,\s*/g, ',').replace(/\s*(<>|<=|>=|=|<|>)\s*/g, '$1').replace(/["\u201c\u201d]/g, "'") : ''; };
    return { select: g(/\bSELECT\b(.*?)\bFROM\b/i), from: g(/\bFROM\b\s+([A-Za-z_]\w*)/i), where: g(/\bWHERE\b(.*?)(?:\bORDER\s+BY\b|$)/i), order: g(/\bORDER\s+BY\b(.*)$/i).replace(/\s+ASC$/, '') };
  }
  return { run, sameResult, clauses };
});
