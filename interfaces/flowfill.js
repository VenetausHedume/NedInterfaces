/* Flowchart — fill the missing boxes. The flowchart is given; the student only completes the blanks.
   config.nodes : [{ id, type:'start'|'process'|'io'|'decision', text:'…' | null, x, y }]   text null = a blank to fill
                  x, y = centre of the box on a 0–100 grid across, any range down (the chart sizes itself)
   config.edges : [{ from, to, label? }]
   config.bank  : ['…'] optional list of statements to choose from (blank becomes a dropdown); without it the student types
   Saves { boxes:{ id:'text' } } with only the filled blanks, or null.
   Marked by NedMark 'flowfill': each blank like a short answer (exact when chosen from the bank). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const BW = 180, BH = 54, UNIT = 7, VGAP = 96;       // box size (px in the drawing), px per x-unit, px per y-step

  Ned.register('flowfill',
    { name: 'Flowchart: fill the boxes', unlocks: 'part-drawn flowcharts',
      samples: [
        { label: 'Largest of 10 numbers (choose from list)',
          question: { text: 'The flowchart inputs 10 numbers and outputs the largest. Complete the three missing boxes.', marks: 3, config: {
            nodes: [
              { id: 'n1', type: 'start', text: 'START', x: 50, y: 0 },
              { id: 'n2', type: 'process', text: 'Largest ← 0, Count ← 0', x: 50, y: 1 },
              { id: 'n3', type: 'io', text: 'INPUT Number', x: 50, y: 2 },
              { id: 'n4', type: 'decision', text: null, x: 50, y: 3 },
              { id: 'n5', type: 'process', text: null, x: 84, y: 3 },
              { id: 'n6', type: 'process', text: 'Count ← Count + 1', x: 50, y: 4 },
              { id: 'n7', type: 'decision', text: null, x: 50, y: 5 },
              { id: 'n8', type: 'io', text: 'OUTPUT Largest', x: 50, y: 6 },
              { id: 'n9', type: 'start', text: 'STOP', x: 50, y: 7 }],
            edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }, { from: 'n4', to: 'n5', label: 'Yes' }, { from: 'n4', to: 'n6', label: 'No' },
              { from: 'n5', to: 'n6' }, { from: 'n6', to: 'n7' }, { from: 'n7', to: 'n8', label: 'Yes' }, { from: 'n7', to: 'n3', label: 'No' }, { from: 'n8', to: 'n9' }],
            bank: ['Is Number > Largest?', 'Is Number < Largest?', 'Largest ← Number', 'Number ← Largest', 'Is Count = 10?', 'Is Count > 10?'] } },
          answer: { boxes: { n4: { exact: true, alts: ['Is Number > Largest?'] }, n5: { exact: true, alts: ['Largest ← Number'] }, n7: { exact: true, alts: ['Is Count = 10?'] } } } },
        { label: 'Typed answers',
          question: { text: 'Complete the flowchart for a program that outputs "Pass" when Mark is 50 or more.', marks: 2, config: {
            nodes: [{ id: 'a', type: 'start', text: 'START', x: 50, y: 0 }, { id: 'b', type: 'io', text: 'INPUT Mark', x: 50, y: 1 }, { id: 'c', type: 'decision', text: null, x: 50, y: 2 },
              { id: 'd', type: 'io', text: null, x: 84, y: 2 }, { id: 'e', type: 'start', text: 'STOP', x: 50, y: 3 }],
            edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd', label: 'Yes' }, { from: 'c', to: 'e', label: 'No' }, { from: 'd', to: 'e' }] } },
          answer: { boxes: { c: { alts: ['Mark >= 50', 'Mark > 49', 'is Mark >= 50', 'Mark ≥ 50'], require: ['mark', '50'] }, d: { alts: ['OUTPUT Pass', 'PRINT Pass'], require: ['pass'] } } } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const nodes = cfg.nodes || [], edges = cfg.edges || [];
      let vals = Object.assign({}, value && value.boxes);
      const ys = nodes.map(n => n.y), rows = Math.max.apply(null, ys.concat([0]));
      const W = 100 * UNIT, H = rows * VGAP + BH + 40;
      const P = n => ({ x: n.x * UNIT, y: 20 + BH / 2 + n.y * VGAP });
      const byId = {}; nodes.forEach(n => { byId[n.id] = n; });

      const wrap = Ned.el('div', { style: 'position:relative;width:100%;max-width:' + W + 'px;border:1px solid var(--line);border-radius:10px;background:#fffdf7;overflow-x:auto;' });
      const inner = Ned.el('div', { style: 'position:relative;min-width:520px;' });
      const board = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Flowchart with ' + nodes.filter(n => n.text == null).length + ' boxes to complete' });
      board.style.cssText = 'display:block;width:100%;height:auto;';
      board.innerHTML = '<defs><marker id="ff-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" fill="#2b2b2b"/></marker></defs>';
      inner.appendChild(board); wrap.appendChild(inner); container.appendChild(wrap);

      edges.forEach(e => {
        const a = byId[e.from], b = byId[e.to]; if (!a || !b) return;
        const A = P(a), B = P(b); let d, lx, ly;
        if (b.y > a.y && Math.abs(A.x - B.x) < 1) { d = `M${A.x} ${A.y + BH / 2}V${B.y - BH / 2}`; lx = A.x + 8; ly = A.y + BH / 2 + 16; }
        else if (b.y === a.y) { const dir = B.x > A.x ? 1 : -1; d = `M${A.x + dir * BW / 2} ${A.y}H${B.x - dir * BW / 2}`; lx = A.x + dir * (BW / 2 + 10) - (dir < 0 ? 26 : 0); ly = A.y - 7; }
        else if (b.y > a.y) { d = `M${A.x} ${A.y + BH / 2}V${(A.y + B.y) / 2}H${B.x}V${B.y - BH / 2}`; if (Math.abs(A.x - B.x) > BW / 2) d = `M${A.x} ${A.y + BH / 2}V${B.y}H${B.x + (A.x > B.x ? 1 : -1) * BW / 2}`; lx = A.x + 8; ly = A.y + BH / 2 + 16; }
        else { const side = A.x - BW / 2 - 46; d = `M${A.x - BW / 2} ${A.y}H${side}V${B.y}H${B.x - BW / 2}`; lx = A.x - BW / 2 - 34; ly = A.y - 7; }   // loop back up the left side
        board.appendChild(S('path', { d, fill: 'none', stroke: '#2b2b2b', 'stroke-width': 2, 'marker-end': 'url(#ff-arrow)' }));
        if (e.label) { const t = S('text', { x: lx, y: ly, 'font-size': 13, fill: '#555' }); t.textContent = e.label; board.appendChild(t); }
      });

      const ctrls = {};
      let blankNo = 0;
      nodes.forEach(n => {
        const c = P(n), x = c.x - BW / 2, y = c.y - BH / 2, blank = n.text == null;
        const st = { fill: blank ? '#fff' : '#fffdf7', stroke: blank ? '#4682b4' : '#2b2b2b', 'stroke-width': 2 };
        if (blank) st['stroke-dasharray'] = '6 4';
        let shape;
        if (n.type === 'start') shape = S('rect', Object.assign({ x, y, width: BW, height: BH, rx: BH / 2 }, st));
        else if (n.type === 'io') shape = S('path', Object.assign({ d: `M${x + 18} ${y}H${x + BW}L${x + BW - 18} ${y + BH}H${x}Z` }, st));
        else if (n.type === 'decision') shape = S('path', Object.assign({ d: `M${c.x} ${y - 8}L${x + BW + 14} ${c.y}L${c.x} ${y + BH + 8}L${x - 14} ${c.y}Z` }, st));
        else shape = S('rect', Object.assign({ x, y, width: BW, height: BH, rx: 4 }, st));
        board.appendChild(shape);
        if (!blank) {
          const t = S('text', { x: c.x, y: c.y + 5, 'text-anchor': 'middle', 'font-size': 14, fill: '#2b2b2b' }); t.textContent = n.text; board.appendChild(t);
          return;
        }
        blankNo++;
        const lab = 'Missing box ' + blankNo + ' (' + ({ decision: 'decision', io: 'input or output', process: 'process', start: 'start or stop' }[n.type] || 'box') + ')';
        let ctl;
        if (cfg.bank) {
          ctl = Ned.el('select', { 'aria-label': lab });
          ctl.appendChild(Ned.el('option', { value: '' }, ['choose…']));
          cfg.bank.forEach(b => ctl.appendChild(Ned.el('option', { value: b }, [b])));
          ctl.addEventListener('change', () => { if (ctl.value) vals[n.id] = ctl.value; else delete vals[n.id]; emit(); });
        } else {
          ctl = Ned.el('input', { type: 'text', 'aria-label': lab, placeholder: 'type here', autocomplete: 'off' });
          ctl.addEventListener('input', () => { if (ctl.value.trim()) vals[n.id] = ctl.value; else delete vals[n.id]; emit(); });
        }
        const inset = n.type === 'decision' ? 30 : n.type === 'io' ? 22 : 10;
        ctl.style.cssText = 'position:absolute;left:' + ((x + inset) / W * 100) + '%;top:' + (c.y / H * 100) + '%;transform:translateY(-50%);width:' + ((BW - inset * 2) / W * 100) + '%;' +
          'padding:4px 5px;border:1px solid var(--line);border-radius:5px;background:#fff;font:inherit;font-size:13px;';
        inner.appendChild(ctl); ctrls[n.id] = ctl;
      });
      const paint = () => { for (const id in ctrls) ctrls[id].value = vals[id] || ''; };
      const emit = () => onChange(Object.keys(vals).length ? { boxes: Object.assign({}, vals) } : null);
      paint();
      return {
        update: (v) => { vals = Object.assign({}, v && v.boxes); paint(); },
        clear: () => { vals = {}; paint(); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
