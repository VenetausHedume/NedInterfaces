/* Force arrows — "draw and label the forces acting on the object" (free-body diagrams).
   The object is printed in the middle. The student presses on it and drags outwards to draw an arrow (directions snap
   to every 45°, lengths to half a square), then picks its name from the list. Longer arrow = bigger force.
   config.labels : the force names offered (default weight, normal reaction, friction, air resistance, thrust, …)
   config.shape  : 'box' (default) | 'ball'
   Saves { arrows:[{ dir, len, label }] } (dir in degrees: 0 = right, 90 = up) or null.
   Marked by NedMark 'arrows': each expected force present with the right direction and name; optional
   "bigger than" / "equal" comparisons of arrow lengths (e.g. thrust > drag when accelerating). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const DEF = ['weight', 'normal reaction', 'friction', 'air resistance', 'thrust', 'driving force', 'tension', 'upthrust', 'drag', 'lift'];
  Ned.register('arrows',
    { name: 'Force arrows', unlocks: 'free-body diagrams',
      samples: [
        { label: 'Box resting on a table (2 marks)', question: { text: 'A box rests on a table. Draw and label the two forces acting on the box.', marks: 2, config: {} },
          answer: { arrows: [{ label: 'weight', dir: 270 }, { label: 'normal reaction', dir: 90 }], compare: [['weight', '=', 'normal reaction']] } },
        { label: 'Car speeding up (3 marks)', question: { text: 'A car accelerates along a level road. Draw and label the horizontal forces on the car, showing which is bigger.', marks: 3, config: {} },
          answer: { arrows: [{ label: ['driving force', 'thrust'], dir: 0 }, { label: ['air resistance', 'drag', 'friction'], dir: 180 }], compare: [[['driving force', 'thrust'], '>', ['air resistance', 'drag', 'friction']]] } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const labels = cfg.labels || DEF;
      const VW = 560, VH = 400, C = [VW / 2, VH / 2], U = 30, HALF = 40;
      let arrows = [], drag = null, sel = null;
      const svg = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Press on the object and drag outwards to draw a force arrow.' });
      svg.style.cssText = 'display:block;width:100%;max-width:560px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const list = Ned.el('div', { style: 'display:grid;gap:6px;margin-top:8px;max-width:560px;' });
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['Press on the object and drag outwards to draw a force. Then choose its name below.']);
      container.append(svg, list, status);
      const g0 = S('g', {}), g1 = S('g', {}); svg.append(g0, g1);
      for (let x = 0; x <= VW; x += U) g0.appendChild(S('line', { x1: x, y1: 0, x2: x, y2: VH, stroke: '#f1ece0' }));
      for (let y = 0; y <= VH; y += U) g0.appendChild(S('line', { x1: 0, y1: y, x2: VW, y2: y, stroke: '#f1ece0' }));
      g0.appendChild(cfg.shape === 'ball' ? S('circle', { cx: C[0], cy: C[1], r: HALF, fill: '#e7e0cf', stroke: '#2b2b2b', 'stroke-width': 2, 'data-obj': 1, style: 'cursor:crosshair' })
        : S('rect', { x: C[0] - HALF, y: C[1] - HALF, width: HALF * 2, height: HALF * 2, fill: '#e7e0cf', stroke: '#2b2b2b', 'stroke-width': 2, 'data-obj': 1, style: 'cursor:crosshair' }));
      const tipOf = a => { const t = a.dir * Math.PI / 180, start = HALF; return [C[0] + Math.cos(t) * (start + a.len * U), C[1] - Math.sin(t) * (start + a.len * U)]; };
      const baseOf = a => { const t = a.dir * Math.PI / 180; return [C[0] + Math.cos(t) * HALF, C[1] - Math.sin(t) * HALF]; };
      function paint() {
        g1.innerHTML = '';
        arrows.concat(drag && drag.a ? [drag.a] : []).forEach((a, i) => { const b = baseOf(a), t = tipOf(a), ang = Math.atan2(t[1] - b[1], t[0] - b[0]), col = sel === i ? '#4682b4' : '#b0413e';
          g1.appendChild(S('line', { x1: b[0], y1: b[1], x2: t[0], y2: t[1], stroke: col, 'stroke-width': 4 }));
          g1.appendChild(S('path', { d: `M${t[0]} ${t[1]} L${t[0] - 14 * Math.cos(ang - 0.4)} ${t[1] - 14 * Math.sin(ang - 0.4)} L${t[0] - 14 * Math.cos(ang + 0.4)} ${t[1] - 14 * Math.sin(ang + 0.4)} Z`, fill: col }));
          g1.appendChild(S('line', { x1: b[0], y1: b[1], x2: t[0], y2: t[1], stroke: 'transparent', 'stroke-width': 16, 'data-arrow': i, style: 'cursor:pointer' }));
          if (a.label) g1.appendChild(Object.assign(S('text', { x: t[0] + 10 * Math.cos(ang), y: t[1] + 10 * Math.sin(ang) + 5, 'text-anchor': Math.cos(ang) < -0.3 ? 'end' : Math.cos(ang) > 0.3 ? 'start' : 'middle', 'font-size': 13, 'font-weight': 600, fill: col, 'paint-order': 'stroke', stroke: '#fffdf7', 'stroke-width': 4 }), { textContent: a.label })); });
        list.innerHTML = '';
        arrows.forEach((a, i) => { const s = Ned.el('select', { 'aria-label': 'Name of force ' + (i + 1), 'data-label': i, style: 'padding:5px;font:inherit;' }, [Ned.el('option', { value: '' }, ['choose a name…'])].concat(labels.map(l => Ned.el('option', { value: l }, [l]))));
          s.value = a.label || ''; s.addEventListener('change', () => { a.label = s.value; paint(); emit(); });
          const x = Ned.el('button', { type: 'button', 'data-del': i, style: 'padding:4px 9px;border:1px solid var(--line);border-radius:6px;background:var(--paper);cursor:pointer;' }, ['✕']); x.addEventListener('click', () => { arrows.splice(i, 1); sel = null; paint(); emit(); });
          const dirName = { 0: 'right', 45: 'up-right', 90: 'up', 135: 'up-left', 180: 'left', 225: 'down-left', 270: 'down', 315: 'down-right' }[a.dir];
          list.appendChild(Ned.el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px;' }, [`Force ${i + 1}: ${dirName}, length ${a.len}`, s, x])); });
      }
      function emit() { onChange(arrows.length ? { arrows: arrows.map(a => Object.assign({}, a)) } : null); }
      const fromEvt = evt => { const r = svg.getBoundingClientRect(); const x = (evt.clientX - r.left) * VW / r.width - C[0], y = C[1] - (evt.clientY - r.top) * VH / r.height;
        const dir = (Math.round(Math.atan2(y, x) * 180 / Math.PI / 45) * 45 + 360) % 360, len = Math.max(0.5, Math.min(5, Math.round((Math.hypot(x, y) - HALF) / U * 2) / 2)); return { dir, len, label: '' }; };
      svg.addEventListener('pointerdown', evt => { const t = evt.target;
        if (t.dataset.arrow != null) { sel = +t.dataset.arrow; paint(); return; }
        if (t.dataset.obj == null) return; drag = { a: null }; try { svg.setPointerCapture(evt.pointerId); } catch (e) {} });
      svg.addEventListener('pointermove', evt => { if (!drag) return; drag.a = fromEvt(evt); paint(); });
      const end = () => { if (!drag) return; const a = drag.a; drag = null; if (a) { const k = arrows.findIndex(b => b.dir === a.dir); if (k >= 0) arrows[k].len = a.len; else arrows.push(a); emit(); } paint(); };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      function load(v) { arrows = ((v && v.arrows) || []).map(a => Object.assign({}, a)); sel = null; paint(); }
      load(value);
      container.__nedArrows = { screen: (dirDeg, len) => { const r = svg.getBoundingClientRect(), t = dirDeg * Math.PI / 180, d = len == null ? 0 : HALF + len * U; return { x: r.left + (C[0] + Math.cos(t) * d) * r.width / VW, y: r.top + (C[1] - Math.sin(t) * d) * r.height / VH }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
