/* More economics diagrams, adjusted rather than drawn freehand (as the demand-and-supply one).
   'ppc'          — production possibility curve: shift the curve out or in, and/or mark a point (inside / on / beyond).
                    config: { goods:['Capital goods','Consumer goods'], point?:true, shift?:true }
                    Saves { shift:'out'|'in'|null, point:[x,y]|null, where:'inside'|'on'|'beyond'|null }.
                    Marked: right shift; point in the right place.
   'pricecontrol' — maximum or minimum price (also a minimum wage in a labour market): drag the price line to where it
                    should be, then name the gap it causes (shortage / surplus).
                    config: { yLabel?, xLabel?, dLabel?, sLabel? }
                    Saves { price:'above'|'below'|'at', gap:'shortage'|'surplus'|null }.
                    Marked: line on the right side of equilibrium; gap named correctly. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const btn = 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
  const T = (x, y, s, a) => Object.assign(S('text', Object.assign({ x, y, 'font-size': 14, fill: '#2b2b2b' }, a || {})), { textContent: s });
  const OX = 70, OY = 330, W = 540, H = 360;
  function axes(g, yl, xl) {
    g.appendChild(S('line', { x1: OX, y1: 20, x2: OX, y2: OY, stroke: '#2b2b2b', 'stroke-width': 2 }));
    g.appendChild(S('line', { x1: OX, y1: OY, x2: W - 20, y2: OY, stroke: '#2b2b2b', 'stroke-width': 2 }));
    g.appendChild(T(OX - 8, 30, yl, { 'text-anchor': 'end', 'font-size': 13 })); g.appendChild(T(W - 20, OY + 24, xl, { 'text-anchor': 'end', 'font-size': 13 }));
  }

  /* ── PPC ── quarter-ellipse with radii RX, RY; shifted by ±18 % */
  Ned.register('ppc',
    { name: 'Production possibility curve', unlocks: 'PPC shifts, points inside / on / beyond',
      samples: [
        { label: 'Economic growth (2 marks)', question: { text: 'A country discovers new oil reserves. Show the effect on its production possibility curve.', marks: 2, config: { shift: true, point: false } }, answer: { shift: 'out' } },
        { label: 'Unemployment (1 mark)', question: { text: 'Mark a point X that shows the economy with unemployed resources.', marks: 1, config: { shift: false, point: true } }, answer: { where: 'inside' } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const goods = cfg.goods || ['Capital goods', 'Consumer goods'];
      const RX = 330, RY = 230, K = { out: 1.18, in: 0.8, null: 1 };
      let shift = null, point = null;
      const bar = Ned.el('div', { role: 'toolbar', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;' });
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'application', 'aria-label': 'Production possibility curve' });
      svg.style.cssText = 'display:block;width:100%;max-width:540px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;';
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(bar, svg, status);
      const bs = {};
      if (cfg.shift !== false) [['out', 'Shift the curve outwards'], ['in', 'Shift the curve inwards']].forEach(([k, l]) => { const b = Ned.el('button', { type: 'button', style: btn, 'data-shift': k }, [l]); b.addEventListener('click', () => { shift = shift === k ? null : k; paint(); emit(); }); bs[k] = b; bar.appendChild(b); });
      const g0 = S('g', {}), g1 = S('g', {}); svg.append(g0, g1); axes(g0, goods[0], goods[1]);
      const curve = k => `M${OX} ${OY - RY * k} A${RX * k} ${RY * k} 0 0 1 ${OX + RX * k} ${OY}`;
      const where = p => { if (!p) return null; const r = Math.pow((p[0] - OX) / RX, 2) + Math.pow((OY - p[1]) / RY, 2); return Math.abs(Math.sqrt(r) - 1) < 0.05 ? 'on' : r < 1 ? 'inside' : 'beyond'; };
      function paint() {
        g1.innerHTML = '';
        g1.appendChild(S('path', { d: curve(1), fill: 'none', stroke: '#2b2b2b', 'stroke-width': 2.5 })); g1.appendChild(T(OX + RX * 0.72 + 6, OY - RY * 0.72 - 6, 'PPC'));
        if (shift) { g1.appendChild(S('path', { d: curve(K[shift]), fill: 'none', stroke: '#2b5d8a', 'stroke-width': 2.5 })); g1.appendChild(T(OX + RX * K[shift] * 0.72 + 6, OY - RY * K[shift] * 0.72 - 6, 'PPC1', { fill: '#2b5d8a' })); }
        if (point) { g1.appendChild(S('circle', { cx: point[0], cy: point[1], r: 5, fill: '#b0413e' })); g1.appendChild(T(point[0] + 8, point[1] - 6, 'X', { 'font-weight': 700, fill: '#b0413e' })); }
        Object.keys(bs).forEach(k => { bs[k].style.background = shift === k ? '#eaf1f8' : 'var(--paper)'; bs[k].style.borderColor = shift === k ? 'var(--accent)' : 'var(--line)'; bs[k].setAttribute('aria-pressed', shift === k); });
        status.textContent = cfg.point ? 'Click the diagram to mark point X.' : 'Use the buttons to shift the curve.';
      }
      function emit() { onChange(shift || point ? { shift, point: point ? point.slice() : null, where: where(point) } : null); }
      if (cfg.point) svg.addEventListener('click', evt => { const r = svg.getBoundingClientRect(); const x = (evt.clientX - r.left) * W / r.width, y = (evt.clientY - r.top) * H / r.height;
        if (x < OX || y > OY) return; point = [Math.round(x), Math.round(y)];
        const w = where(point); if (w === 'on') { const t = Math.atan2((OY - y) / RY, (x - OX) / RX); point = [Math.round(OX + RX * Math.cos(t)), Math.round(OY - RY * Math.sin(t))]; }   // snap onto the curve
        paint(); emit(); });
      function load(v) { shift = (v && v.shift) || null; point = v && v.point ? v.point.slice() : null; paint(); }
      load(value);
      container.__nedPpc = { screen: (fx, fy) => { const r = svg.getBoundingClientRect(); return { x: r.left + (OX + RX * fx) * r.width / W, y: r.top + (OY - RY * fy) * r.height / H }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });

  /* ── maximum / minimum price ── */
  Ned.register('pricecontrol',
    { name: 'Maximum / minimum price', unlocks: 'price controls, minimum wage',
      samples: [
        { label: 'Maximum price (2 marks)', question: { text: 'The government sets a maximum price on bread. Show it on the diagram and name what it causes.', marks: 2, config: {} }, answer: { control: 'max' } },
        { label: 'Minimum wage (2 marks)', question: { text: 'A national minimum wage is set above the equilibrium wage. Show it and name what happens in the labour market.', marks: 2,
          config: { yLabel: 'Wage', xLabel: 'Quantity of labour', dLabel: 'D (labour)', sLabel: 'S (labour)' } }, answer: { control: 'min' } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const EQ = 175;                          // equilibrium price line (y in the drawing)
      let py = null, gap = null, drag = false;
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'application', 'aria-label': 'Demand and supply. Drag the price line up or down.' });
      svg.style.cssText = 'display:block;width:100%;max-width:540px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const gapSel = Ned.el('select', { 'aria-label': 'What the price control causes', 'data-gap': '', style: 'padding:5px;font:inherit;' }, [Ned.el('option', { value: '' }, ['choose…']), Ned.el('option', { value: 'shortage' }, ['a shortage (excess demand)']), Ned.el('option', { value: 'surplus' }, ['a surplus (excess supply)'])]);
      gapSel.addEventListener('change', () => { gap = gapSel.value || null; paint(); emit(); });
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['Press on the diagram at the level where the ' + (cfg.yLabel === 'Wage' ? 'wage' : 'price') + ' is set; drag to adjust.']);
      container.append(svg, Ned.el('div', { style: 'margin-top:8px;display:flex;gap:8px;align-items:center;font-size:14px;flex-wrap:wrap;' }, ['This causes', gapSel]), status);
      const g0 = S('g', {}), g1 = S('g', {}); svg.append(g0, g1); axes(g0, cfg.yLabel || 'Price', cfg.xLabel || 'Quantity');
      const D = [[110, 60], [470, 300]], Sp = [[110, 300], [470, 60]];
      const xAt = (L, y) => L[0][0] + (y - L[0][1]) * (L[1][0] - L[0][0]) / (L[1][1] - L[0][1]);
      g0.appendChild(S('line', { x1: D[0][0], y1: D[0][1], x2: D[1][0], y2: D[1][1], stroke: '#2b2b2b', 'stroke-width': 2.5 })); g0.appendChild(T(D[1][0] + 4, D[1][1] + 4, cfg.dLabel || 'D'));
      g0.appendChild(S('line', { x1: Sp[0][0], y1: Sp[0][1], x2: Sp[1][0], y2: Sp[1][1], stroke: '#2b2b2b', 'stroke-width': 2.5 })); g0.appendChild(T(Sp[1][0] + 4, Sp[1][1], cfg.sLabel || 'S'));
      g0.appendChild(S('line', { x1: OX, y1: EQ + 5, x2: 290, y2: EQ + 5, stroke: '#9c9282', 'stroke-dasharray': '3 4' })); g0.appendChild(T(OX - 6, EQ + 10, cfg.yLabel === 'Wage' ? 'We' : 'Pe', { 'text-anchor': 'end', 'font-size': 12 }));
      const pos = () => (py == null ? null : Math.abs(py - (EQ + 5)) < 6 ? 'at' : py < EQ + 5 ? 'above' : 'below');
      function paint() {
        g1.innerHTML = ''; if (py == null) return; const y = py;
        g1.appendChild(S('line', { x1: OX, y1: y, x2: W - 30, y2: y, stroke: py == null ? '#b9b1a0' : '#2b5d8a', 'stroke-width': 2.5, 'stroke-dasharray': '9 6' }));
        g1.appendChild(S('rect', { x: OX, y: y - 12, width: W - 30 - OX, height: 24, fill: 'transparent', 'data-pline': 1, style: 'cursor:ns-resize' }));
        g1.appendChild(T(W - 32, y - 8, cfg.yLabel === 'Wage' ? 'wage set' : 'price set', { 'text-anchor': 'end', 'font-size': 12, fill: '#2b5d8a' }));
        if (py != null && pos() !== 'at') { const a = xAt(D, py), b = xAt(Sp, py); g1.appendChild(S('line', { x1: Math.min(a, b), y1: y + 16, x2: Math.max(a, b), y2: y + 16, stroke: '#b0413e', 'stroke-width': 2, 'marker-end': '' }));
          if (gap) g1.appendChild(T((a + b) / 2, y + 32, gap, { 'text-anchor': 'middle', fill: '#b0413e', 'font-size': 13, 'font-weight': 600 })); }
      }
      function emit() { onChange(py == null && !gap ? null : { price: pos(), gap }); }
      const yOf = evt => { const r = svg.getBoundingClientRect(); return Math.max(40, Math.min(310, Math.round((evt.clientY - r.top) * H / r.height))); };
      svg.addEventListener('pointerdown', evt => { drag = true; py = yOf(evt); try { svg.setPointerCapture(evt.pointerId); } catch (e) {} paint(); });
      svg.addEventListener('pointermove', evt => { if (drag) { py = yOf(evt); paint(); } });
      const end = () => { if (drag) { drag = false; emit(); } };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      function load(v) { py = v && v.price ? (v.price === 'above' ? 110 : v.price === 'below' ? 250 : EQ + 5) : null; gap = (v && v.gap) || null; gapSel.value = gap || ''; paint(); }
      load(value);
      container.__nedPc = { screen: y => { const r = svg.getBoundingClientRect(); return { x: r.left + 200 * r.width / W, y: r.top + y * r.height / H }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
