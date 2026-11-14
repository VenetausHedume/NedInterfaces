/* Number line — "show the inequality −2 < x ≤ 3 on the number line".
   The student clicks the line to place the end(s), clicks a circle to switch it between open (○, < or >) and closed
   (●, ≤ or ≥), and chooses whether the line runs between the two ends or off to one side with an arrow.
   config.min, config.max, config.step (default −5, 5, 1); ends snap to config.snap (default the step)
   Saves { lo:{ v, closed }|null, hi:{ v, closed }|null } (null = the line runs on with an arrow) or null.
   Marked by NedMark 'numberline': each end (value and open/closed, or the arrow) is one item. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  Ned.register('numberline',
    { name: 'Number line', unlocks: 'inequalities on a number line',
      samples: [
        { label: 'Between two values (2 marks)', question: { text: 'Show −2 < x ≤ 3 on the number line.', marks: 2, config: { min: -5, max: 5 } },
          answer: { lo: { v: -2, closed: false }, hi: { v: 3, closed: true } } },
        { label: 'One end with an arrow (1 mark)', question: { text: 'Show x ≥ 1 on the number line.', marks: 1, config: { min: -5, max: 5 } },
          answer: { lo: { v: 1, closed: true }, hi: null } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const min = cfg.min != null ? cfg.min : -5, max = cfg.max != null ? cfg.max : 5, step = cfg.step || 1, snap = cfg.snap || step;
      const VW = 640, VH = 110, PL = 40, PR = 40, Y = 56;
      const sx = v => PL + (v - min) / (max - min) * (VW - PL - PR);
      let ends = [], mode = 'between';           // ends: [{v, closed}] sorted; mode: 'between' | 'left' | 'right'
      const btn = 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
      const bar = Ned.el('div', { role: 'toolbar', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;' });
      const modes = {};
      [['between', 'Join the two ends'], ['left', 'Arrow to the left'], ['right', 'Arrow to the right']].forEach(([k, l]) => { const b = Ned.el('button', { type: 'button', style: btn, 'data-mode': k }, [l]); b.addEventListener('click', () => { mode = k; if (k !== 'between' && ends.length > 1) ends = [ends[k === 'left' ? 1 : 0]]; paint(); emit(); }); modes[k] = b; bar.appendChild(b); });
      const clr = Ned.el('button', { type: 'button', style: btn, 'data-act': 'clear' }, ['Clear']); clr.addEventListener('click', () => { ends = []; paint(); emit(); }); bar.appendChild(clr);
      const svg = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Number line. Click to place an end; click an end to make it open or closed.' });
      svg.style.cssText = 'display:block;width:100%;max-width:640px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(bar, svg, status);
      const base = S('g', {}), obj = S('g', {}); svg.append(base, obj);
      base.appendChild(S('line', { x1: PL - 20, y1: Y, x2: VW - PR + 20, y2: Y, stroke: '#2b2b2b', 'stroke-width': 2 }));
      for (let v = min; v <= max + 1e-9; v += step) { const X = sx(v); base.appendChild(S('line', { x1: X, y1: Y - 7, x2: X, y2: Y + 7, stroke: '#2b2b2b', 'stroke-width': 1.5 }));
        const t = S('text', { x: X, y: Y + 26, 'text-anchor': 'middle', 'font-size': 14, fill: '#2b2b2b' }); t.textContent = +v.toFixed(4); base.appendChild(t); }
      base.appendChild(S('rect', { x: 0, y: 0, width: VW, height: VH, fill: 'transparent', 'data-line': 1 }));
      const toV = evt => { const r = svg.getBoundingClientRect(); const px = (evt.clientX - r.left) * VW / r.width; return Math.max(min, Math.min(max, +(Math.round((min + (px - PL) / (VW - PL - PR) * (max - min)) / snap) * snap).toFixed(6))); };
      function paint() {
        obj.innerHTML = '';
        Object.keys(modes).forEach(k => { modes[k].style.background = k === mode ? '#eaf1f8' : 'var(--paper)'; modes[k].style.borderColor = k === mode ? 'var(--accent)' : 'var(--line)'; modes[k].setAttribute('aria-pressed', k === mode); });
        const L = 'stroke:#2b5d8a;stroke-width:5;stroke-linecap:round;', yy = Y - 26;
        if (mode === 'between' && ends.length === 2) obj.appendChild(S('line', { x1: sx(ends[0].v), y1: yy, x2: sx(ends[1].v), y2: yy, style: L }));
        if (mode !== 'between' && ends.length === 1) { const X = sx(ends[0].v), to = mode === 'left' ? 14 : VW - 14;
          obj.appendChild(S('line', { x1: X, y1: yy, x2: to, y2: yy, style: L }));
          obj.appendChild(S('path', { d: mode === 'left' ? `M${to} ${yy} l12 -8 v16z` : `M${to} ${yy} l-12 -8 v16z`, fill: '#2b5d8a' })); }
        ends.forEach((e, i) => { obj.appendChild(S('line', { x1: sx(e.v), y1: yy, x2: sx(e.v), y2: Y, stroke: '#9db8d2', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
          obj.appendChild(S('circle', { cx: sx(e.v), cy: yy, r: 8, fill: e.closed ? '#2b5d8a' : '#fffdf7', stroke: '#2b5d8a', 'stroke-width': 2.5, 'data-end': i, style: 'cursor:pointer' })); });
        const val = read();
        const w = e => (e.closed ? '≤' : '<');
        status.textContent = !ends.length ? 'Click the line to place an end.' : !val ? (mode === 'between' ? 'Place the second end, or choose an arrow.' : '') :
          val.lo && val.hi ? `${val.lo.v} ${w(val.lo)} x ${w(val.hi)} ${val.hi.v}` : val.lo ? `x ${val.lo.closed ? '≥' : '>'} ${val.lo.v}` : `x ${w(val.hi)} ${val.hi.v}`;
      }
      function read() {
        if (!ends.length) return null;
        if (mode === 'between') return ends.length === 2 ? { lo: Object.assign({}, ends[0]), hi: Object.assign({}, ends[1]) } : null;
        return mode === 'right' ? { lo: Object.assign({}, ends[0]), hi: null } : { lo: null, hi: Object.assign({}, ends[0]) };
      }
      function emit() { onChange(read()); }
      svg.addEventListener('click', evt => {
        const t = evt.target;
        if (t.dataset.end != null) { const e = ends[+t.dataset.end]; e.closed = !e.closed; paint(); emit(); return; }
        const v = toV(evt);
        if (ends.some(e => e.v === v)) return;
        if (mode === 'between') { if (ends.length >= 2) ends.shift(); ends.push({ v, closed: false }); ends.sort((a, b) => a.v - b.v); }
        else ends = [{ v, closed: false }];
        paint(); emit();
      });
      function load(v) {
        ends = []; mode = 'between';
        if (v && v.lo && v.hi) ends = [Object.assign({}, v.lo), Object.assign({}, v.hi)];
        else if (v && v.lo) { ends = [Object.assign({}, v.lo)]; mode = 'right'; }
        else if (v && v.hi) { ends = [Object.assign({}, v.hi)]; mode = 'left'; }
        paint();
      }
      load(value);
      container.__nedLine = { screen: v => { const r = svg.getBoundingClientRect(); return { x: r.left + sx(v) * r.width / VW, y: r.top + Y * r.height / VH }; },
        end: v => { const r = svg.getBoundingClientRect(); return { x: r.left + sx(v) * r.width / VW, y: r.top + (Y - 26) * r.height / VH }; } };
      return { update: v => load(v), clear: () => { ends = []; paint(); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
