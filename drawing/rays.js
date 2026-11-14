/* Ray diagrams — converging lens (real or virtual image) and plane mirror.
   The axis, lens (or mirror), focal points and object are printed. The student draws rays as straight lines that
   bend where they meet the lens: click the start, click where the ray meets the lens or mirror, click where it goes,
   then Finish ray (or double-click). Lines can be switched to dashed (for the extension back to a virtual image).
   Finally the student drags the image arrow into place: press on the axis and drag up or down to its tip.
   Units are grid squares; points snap to half a square.
   config.kind   : 'lens' (default) | 'mirror'
   config.f      : focal length in squares (lens)
   config.object : { x, h }   object position (x < 0, left of the lens / mirror) and height
   config.grid   : { xmin, xmax, ymin, ymax }
   Saves { rays:[{ pts:[[x,y]…], dashed? }], image:{ x, h }|null } or null.
   Marked by NedMark 'rays': each standard ray drawn correctly, and the image in the right place (± half a square). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  Ned.register('rays',
    { name: 'Ray diagrams', unlocks: 'lenses and plane mirrors',
      samples: [
        { label: 'Lens: real image (3 marks)',
          question: { text: 'An object is placed 6 squares from a converging lens of focal length 2 squares. Draw two rays from the top of the object to locate the image, and draw the image.', marks: 3,
            config: { kind: 'lens', f: 2, object: { x: -6, h: 2 }, grid: { xmin: -8, xmax: 8, ymin: -4, ymax: 4 } } },
          answer: { rays: 2, image: { x: 3, h: -1 } } },
        { label: 'Lens: virtual image (3 marks)',
          question: { text: 'The object is 1 square from a converging lens of focal length 2 squares. Draw rays to find the image (use dashed lines for rays traced back) and draw the image.', marks: 3,
            config: { kind: 'lens', f: 2, object: { x: -1, h: 1 }, grid: { xmin: -8, xmax: 8, ymin: -4, ymax: 4 } } },
          answer: { rays: 2, image: { x: -2, h: 2 } } },
        { label: 'Plane mirror (2 marks)',
          question: { text: 'Draw the image of the object in the plane mirror, and one ray from the top of the object that reflects off the mirror, traced back to the image.', marks: 2,
            config: { kind: 'mirror', object: { x: -4, h: 2 }, grid: { xmin: -7, xmax: 7, ymin: -1, ymax: 5 } } },
          answer: { rays: 1, image: { x: 4, h: 2 } } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const kind = cfg.kind || 'lens', f = cfg.f || 2, obj = Object.assign({ x: -6, h: 2 }, cfg.object || {});
      const g = Object.assign({ xmin: -8, xmax: 8, ymin: -4, ymax: 4 }, cfg.grid || {});
      const cell = Math.min(640 / (g.xmax - g.xmin), 420 / (g.ymax - g.ymin)), VW = cell * (g.xmax - g.xmin), VH = cell * (g.ymax - g.ymin);
      const sx = x => (x - g.xmin) * cell, sy = y => (g.ymax - y) * cell;
      let rays = [], draft = null, image = null, tool = 'ray', drag = null, sel = null;
      const btn = 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
      const bar = Ned.el('div', { role: 'toolbar', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;' });
      const tb = {}; const mk = (k, l, fn) => { const b = Ned.el('button', { type: 'button', style: btn, 'data-tool': k }, [l]); b.addEventListener('click', fn); bar.appendChild(b); return b; };
      tb.ray = mk('ray', 'Draw a ray', () => setTool('ray')); tb.image = mk('image', 'Draw the image', () => setTool('image'));
      const fin = mk('finish', 'Finish ray', () => finish()); fin.removeAttribute('data-tool'); fin.dataset.act = 'finish';
      const dash = mk('dash', 'Dashed / solid', () => { const i = sel != null ? sel : rays.length - 1; if (rays[i]) { rays[i].dashed = !rays[i].dashed; paint(); emit(); } }); dash.removeAttribute('data-tool'); dash.dataset.act = 'dash';
      const del = mk('del', 'Delete ray', () => { const i = sel != null ? sel : rays.length - 1; if (rays[i]) { rays.splice(i, 1); sel = null; paint(); emit(); } }); del.removeAttribute('data-tool'); del.dataset.act = 'delete';
      const svg = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Ray diagram' });
      svg.style.cssText = 'display:block;width:100%;max-width:' + Math.round(VW) + 'px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(bar, svg, status);
      const g0 = S('g', {}), g1 = S('g', {}); svg.append(g0, g1);
      for (let x = g.xmin; x <= g.xmax; x++) g0.appendChild(S('line', { x1: sx(x), y1: 0, x2: sx(x), y2: VH, stroke: '#efe8d6' }));
      for (let y = g.ymin; y <= g.ymax; y++) g0.appendChild(S('line', { x1: 0, y1: sy(y), x2: VW, y2: sy(y), stroke: '#efe8d6' }));
      g0.appendChild(S('line', { x1: 0, y1: sy(0), x2: VW, y2: sy(0), stroke: '#2b2b2b', 'stroke-width': 1.5 }));
      const arrow = (x, h, col, extra) => { const t = S('g', extra || {}); t.appendChild(S('line', { x1: sx(x), y1: sy(0), x2: sx(x), y2: sy(h), stroke: col, 'stroke-width': 3 }));
        t.appendChild(S('path', { d: `M${sx(x)} ${sy(h)} l-6 ${h > 0 ? 10 : -10} h12z`, fill: col })); return t; };
      if (kind === 'lens') {
        g0.appendChild(S('path', { d: `M${sx(0)} ${sy(g.ymax - 0.3)} Q${sx(0.45)} ${sy(0)} ${sx(0)} ${sy(g.ymin + 0.3)} Q${sx(-0.45)} ${sy(0)} ${sx(0)} ${sy(g.ymax - 0.3)}`, fill: '#cfe3f5', stroke: '#2b5d8a', 'stroke-width': 1.5 }));
        [-f, f].forEach(x => { g0.appendChild(S('circle', { cx: sx(x), cy: sy(0), r: 3.5, fill: '#2b2b2b' })); g0.appendChild(Object.assign(S('text', { x: sx(x), y: sy(0) + 18, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 }), { textContent: 'F' })); });
      } else { g0.appendChild(S('line', { x1: sx(0), y1: 0, x2: sx(0), y2: VH, stroke: '#2b2b2b', 'stroke-width': 3 }));
        for (let y = g.ymin; y < g.ymax; y += 0.5) g0.appendChild(S('line', { x1: sx(0), y1: sy(y), x2: sx(0) + 8, y2: sy(y) - 8, stroke: '#2b2b2b' })); }
      g0.appendChild(arrow(obj.x, obj.h, '#2b2b2b'));
      g0.appendChild(Object.assign(S('text', { x: sx(obj.x) - 8, y: sy(obj.h) - 6, 'text-anchor': 'end', 'font-size': 13 }), { textContent: 'object' }));
      const snap = v => Math.round(v * 2) / 2;
      function toG(evt) { const r = svg.getBoundingClientRect(); const px = (evt.clientX - r.left) * VW / r.width, py = (evt.clientY - r.top) * VH / r.height;
        return [Math.max(g.xmin, Math.min(g.xmax, snap(g.xmin + px / cell))), Math.max(g.ymin, Math.min(g.ymax, snap(g.ymax - py / cell)))]; }
      function paint() {
        g1.innerHTML = '';
        rays.forEach((R, i) => { const d = R.pts.map(p => sx(p[0]) + ',' + sy(p[1])).join(' ');
          g1.appendChild(S('polyline', Object.assign({ points: d, fill: 'none', stroke: sel === i ? '#4682b4' : '#b0413e', 'stroke-width': 2.2 }, R.dashed ? { 'stroke-dasharray': '7 6' } : {})));
          g1.appendChild(S('polyline', { points: d, fill: 'none', stroke: 'transparent', 'stroke-width': 14, 'data-ray': i, style: 'cursor:pointer' })); });
        if (draft) { g1.appendChild(S('polyline', { points: draft.map(p => sx(p[0]) + ',' + sy(p[1])).join(' '), fill: 'none', stroke: '#d98b85', 'stroke-width': 2 }));
          draft.forEach(p => g1.appendChild(S('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 4, fill: '#b0413e' }))); }
        if (image && image.h) g1.appendChild(arrow(image.x, image.h, '#2b5d8a', { 'data-image': 1 }));
        fin.disabled = !(draft && draft.length >= 2); fin.style.opacity = fin.disabled ? .5 : 1;
        status.textContent = tool === 'image' ? 'Press on the axis where the image is and drag to its tip.' : draft ? 'Click where the ray goes next; Finish ray when done.' : 'Click on the object to start a ray, then where it meets the ' + (kind === 'lens' ? 'lens' : 'mirror') + ', then where it goes. Click a ray to select it.';
      }
      function emit() { onChange(rays.length || (image && image.h) ? { rays: rays.map(R => Object.assign({ pts: R.pts.map(p => p.slice()) }, R.dashed ? { dashed: true } : {})), image: image && image.h ? Object.assign({}, image) : null } : null); }
      function finish() { if (draft && draft.length >= 2) { rays.push({ pts: draft }); sel = null; } draft = null; paint(); emit(); }
      function setTool(t) { if (draft) finish(); tool = t; ['ray', 'image'].forEach(k => { tb[k].style.background = k === t ? '#eaf1f8' : 'var(--paper)'; tb[k].style.borderColor = k === t ? 'var(--accent)' : 'var(--line)'; tb[k].setAttribute('aria-pressed', k === t); }); paint(); }
      svg.addEventListener('pointerdown', evt => {
        const p = toG(evt), t = evt.target;
        if (tool === 'image') { image = { x: p[0], h: 0 }; drag = true; try { svg.setPointerCapture(evt.pointerId); } catch (e) {} paint(); return; }
        if (!draft && t.dataset.ray != null) { sel = +t.dataset.ray; paint(); return; }
        if (!draft) draft = [];
        const last = draft[draft.length - 1];
        if (!last || last[0] !== p[0] || last[1] !== p[1]) draft.push(p);
        paint();
      });
      svg.addEventListener('dblclick', () => finish());
      svg.addEventListener('pointermove', evt => { if (!drag) return; const p = toG(evt); image.h = p[1]; paint(); });
      const end = () => { if (drag) { drag = false; paint(); emit(); } };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      function load(v) { rays = ((v && v.rays) || []).map(R => ({ pts: R.pts.map(p => p.slice()), dashed: !!R.dashed })); image = v && v.image ? Object.assign({}, v.image) : null; draft = null; sel = null; paint(); }
      load(value); setTool('ray');
      container.__nedRays = { screen: (x, y) => { const r = svg.getBoundingClientRect(); return { x: r.left + sx(x) * r.width / VW, y: r.top + sy(y) * r.height / VH }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
