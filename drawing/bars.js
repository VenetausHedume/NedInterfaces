/* Bars — bar charts, histograms (unequal widths, frequency density) and pyramids of numbers / biomass.
   The student clicks or drags inside a bar's column to set its height (snaps to half a small square), or types it.
   config.kind     : 'bar' (default) | 'histogram' | 'pyramid'
   config.labels   : bar / pyramid level names (pyramid: bottom level first)
   config.classes  : histogram class boundaries [[lo, hi]…] on a numeric x-axis (config.x = { min, max, step })
   config.axis     : { max, step, minor?, title? }   the value axis (vertical; horizontal for a pyramid)
   Saves { heights:[n|null…] } or null.
   Marked by NedMark 'bars': each bar within half a small square; one mark lost for each wrong bar. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const r4 = n => Math.round(n * 1e4) / 1e4;
  Ned.register('bars',
    { name: 'Bar charts, histograms, pyramids', unlocks: 'drawing bar charts, histograms, pyramids of numbers',
      samples: [
        { label: 'Bar chart (2 marks)', question: { text: 'Draw a bar chart: Cat 7, Dog 12, Fish 3, Rabbit 5.', marks: 2,
          config: { kind: 'bar', labels: ['Cat', 'Dog', 'Fish', 'Rabbit'], axis: { max: 14, step: 2, minor: 2, title: 'Frequency' } } }, answer: { heights: [7, 12, 3, 5] } },
        { label: 'Histogram (3 marks)', question: { text: 'Draw the histogram. Time t (min): 0<t≤10: 20, 10<t≤15: 30, 15<t≤30: 24. Work out each frequency density first.', marks: 3,
          config: { kind: 'histogram', classes: [[0, 10], [10, 15], [15, 30]], x: { min: 0, max: 30, step: 5, title: 'Time (minutes)' }, axis: { max: 7, step: 1, minor: 5, title: 'Frequency density' } } },
          answer: { heights: [2, 6, 1.6] } },
        { label: 'Pyramid of numbers (2 marks)', question: { text: 'Draw a pyramid of numbers for: grass 500, grasshoppers 120, frogs 20, snake 2. Use the scale given.', marks: 2,
          config: { kind: 'pyramid', labels: ['grass', 'grasshoppers', 'frogs', 'snake'], axis: { max: 500, step: 100, minor: 5, title: 'number of organisms' } } }, answer: { heights: [500, 120, 20, 2], tol: 10 } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const kind = cfg.kind || 'bar', ax = Object.assign({ max: 10, step: 1, minor: 5 }, cfg.axis || {});
      const n = kind === 'histogram' ? (cfg.classes || []).length : (cfg.labels || []).length;
      const snapStep = ax.step / (ax.minor || 5) / 2;
      let h = new Array(n).fill(null), drag = null;
      const VW = 640, VH = kind === 'pyramid' ? 60 + n * 54 : 400, PL = kind === 'pyramid' ? 120 : 62, PR = 20, PT = 16, PB = 50;
      const svg = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Chart. Click in a column to set the height of its bar, or type the values below.' });
      svg.style.cssText = 'display:block;width:100%;max-width:640px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const typeRow = Ned.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:flex-end;' });
      container.append(svg, typeRow);
      const g0 = S('g', {}), g1 = S('g', {}); svg.append(g0, g1);
      const vlen = kind === 'pyramid' ? (VW - PL - PR) : (VH - PT - PB);
      const val2px = v => v / ax.max * vlen;
      // the category slots
      let slots;
      if (kind === 'histogram') { const x = Object.assign({ min: 0, max: 10, step: 1 }, cfg.x || {}); const sx = v => PL + (v - x.min) / (x.max - x.min) * (VW - PL - PR);
        slots = cfg.classes.map(c => ({ a: sx(c[0]), b: sx(c[1]) }));
        for (let v = x.min; v <= x.max + 1e-9; v += x.step) { g0.appendChild(S('line', { x1: sx(v), y1: VH - PB, x2: sx(v), y2: VH - PB + 6, stroke: '#2b2b2b' })); g0.appendChild(Object.assign(S('text', { x: sx(v), y: VH - PB + 20, 'text-anchor': 'middle', 'font-size': 12, fill: '#2b2b2b' }), { textContent: r4(v) })); }
        if (x.title) g0.appendChild(Object.assign(S('text', { x: (PL + VW - PR) / 2, y: VH - 8, 'text-anchor': 'middle', 'font-size': 13 }), { textContent: x.title })); }
      else if (kind === 'bar') { const w = (VW - PL - PR) / n; slots = cfg.labels.map((l, i) => ({ a: PL + w * i + w * 0.18, b: PL + w * (i + 1) - w * 0.18 }));
        cfg.labels.forEach((l, i) => g0.appendChild(Object.assign(S('text', { x: (slots[i].a + slots[i].b) / 2, y: VH - PB + 20, 'text-anchor': 'middle', 'font-size': 13 }), { textContent: l }))); }
      else { const bh = (VH - PT - PB) / n; slots = cfg.labels.map((l, i) => ({ a: VH - PB - bh * (i + 1) + 4, b: VH - PB - bh * i - 4 }));
        cfg.labels.forEach((l, i) => g0.appendChild(Object.assign(S('text', { x: PL - 10, y: (slots[i].a + slots[i].b) / 2 + 5, 'text-anchor': 'end', 'font-size': 13 }), { textContent: l }))); }
      // value grid
      for (let k = 0; k <= Math.round(ax.max / (ax.step / ax.minor)); k++) { const v = k * ax.step / ax.minor, p = val2px(v), major = Math.abs(v / ax.step - Math.round(v / ax.step)) < 1e-9;
        if (kind === 'pyramid') { const cx = PL + (VW - PL - PR) / 2; [cx - p / 2, cx + p / 2].forEach(X => g0.appendChild(S('line', { x1: X, y1: PT, x2: X, y2: VH - PB, stroke: major ? '#d5c9a8' : '#eee6d2' }))); if (major) g0.appendChild(Object.assign(S('text', { x: cx + p / 2, y: VH - PB + 18, 'text-anchor': 'middle', 'font-size': 11, fill: '#6f6757' }), { textContent: r4(v) })); }
        else { const Y = VH - PB - p; g0.appendChild(S('line', { x1: PL, y1: Y, x2: VW - PR, y2: Y, stroke: major ? '#d5c9a8' : '#eee6d2' })); if (major) g0.appendChild(Object.assign(S('text', { x: PL - 8, y: Y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#6f6757' }), { textContent: r4(v) })); } }
      if (kind !== 'pyramid') { g0.appendChild(S('line', { x1: PL, y1: VH - PB, x2: VW - PR, y2: VH - PB, stroke: '#2b2b2b', 'stroke-width': 2 })); g0.appendChild(S('line', { x1: PL, y1: PT, x2: PL, y2: VH - PB, stroke: '#2b2b2b', 'stroke-width': 2 }));
        if (ax.title) g0.appendChild(Object.assign(S('text', { x: 14, y: (PT + VH - PB) / 2, 'text-anchor': 'middle', 'font-size': 13, transform: `rotate(-90 14 ${(PT + VH - PB) / 2})` }), { textContent: ax.title })); }
      else if (ax.title) g0.appendChild(Object.assign(S('text', { x: PL + (VW - PL - PR) / 2, y: VH - 10, 'text-anchor': 'middle', 'font-size': 13 }), { textContent: ax.title + ' (width of each bar)' }));
      const inputs = [];
      for (let i = 0; i < n; i++) { const name = kind === 'histogram' ? cfg.classes[i].join('–') : cfg.labels[i];
        const inp = Ned.el('input', { type: 'number', step: 'any', 'aria-label': (kind === 'histogram' ? 'Height of the bar for ' : 'Value for ') + name, 'data-bar': i, style: 'width:5.4rem;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;' });
        inp.addEventListener('input', () => { h[i] = inp.value === '' ? null : Math.max(0, Math.min(ax.max, +inp.value)); paint(); emit(); });
        inputs.push(inp); typeRow.appendChild(Ned.labelled(name, inp)); }
      function paint() {
        g1.innerHTML = '';
        h.forEach((v, i) => { const s = slots[i];
          g1.appendChild(S('rect', kind === 'pyramid' ? { x: PL, y: s.a, width: VW - PL - PR, height: s.b - s.a, fill: 'transparent', 'data-slot': i } : { x: s.a, y: PT, width: s.b - s.a, height: VH - PT - PB, fill: 'transparent', 'data-slot': i }));
          if (v == null) return; const p = val2px(v);
          if (kind === 'pyramid') { const cx = PL + (VW - PL - PR) / 2; g1.appendChild(S('rect', { x: cx - p / 2, y: s.a, width: Math.max(1, p), height: s.b - s.a, fill: '#4682b4', 'fill-opacity': 0.35, stroke: '#2b5d8a', 'stroke-width': 2, 'data-slot': i })); }
          else g1.appendChild(S('rect', { x: s.a, y: VH - PB - p, width: s.b - s.a, height: Math.max(0, p), fill: '#4682b4', 'fill-opacity': 0.35, stroke: '#2b5d8a', 'stroke-width': 2, 'data-slot': i }));
          if (document.activeElement !== inputs[i]) inputs[i].value = String(v); });
      }
      function emit() { onChange(h.some(v => v != null) ? { heights: h.slice() } : null); }
      function fromEvt(evt, i) { const r = svg.getBoundingClientRect(); const px = (evt.clientX - r.left) * VW / r.width, py = (evt.clientY - r.top) * VH / r.height;
        let v = kind === 'pyramid' ? Math.abs(px - (PL + (VW - PL - PR) / 2)) * 2 / vlen * ax.max : (VH - PB - py) / vlen * ax.max;
        return r4(Math.max(0, Math.min(ax.max, Math.round(v / snapStep) * snapStep))); }
      svg.addEventListener('pointerdown', evt => { const t = evt.target; if (t.dataset.slot == null) return; const i = +t.dataset.slot; drag = i; h[i] = fromEvt(evt, i); try { svg.setPointerCapture(evt.pointerId); } catch (e) {} paint(); evt.preventDefault(); });
      svg.addEventListener('pointermove', evt => { if (drag == null) return; h[drag] = fromEvt(evt, drag); paint(); });
      const end = () => { if (drag != null) { drag = null; emit(); } };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      function load(v) { h = new Array(n).fill(null).map((_, i) => (v && v.heights && v.heights[i] != null ? v.heights[i] : null)); inputs.forEach((inp, i) => { inp.value = h[i] == null ? '' : String(h[i]); }); paint(); }
      load(value);
      container.__nedBars = { screen: (i, v) => { const r = svg.getBoundingClientRect(), s = slots[i], p = val2px(v);
        const x = kind === 'pyramid' ? PL + (VW - PL - PR) / 2 + p / 2 : (s.a + s.b) / 2, y = kind === 'pyramid' ? (s.a + s.b) / 2 : VH - PB - p;
        return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
