/* Shapes on a grid — "draw the image of shape A after …" (reflection, rotation, enlargement, translation), and any
   question that asks for a polygon drawn on a coordinate grid.
   config.grid   : { xmin, xmax, ymin, ymax, snap? }   whole squares; vertices snap to whole numbers (snap 0.5 = half squares)
   config.shapes : [{ label, pts:[[x,y]…] }]            shapes printed in the question (grey, not part of the answer)
   config.lines  : [{ p1:[x,y], p2:[x,y], label }]     printed lines, e.g. the mirror line y = x
   config.max    : how many shapes the student may draw (default 1)
   Saves { shapes:[{ pts:[[x,y]…] }] } or null.
   Marked by NedMark 'transform': the vertices must match the correct image (any starting vertex, either direction).
   With 2+ marks, the right shape in the wrong place (right size and way round) earns 1. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  Ned.register('transform',
    { name: 'Shapes on a grid', unlocks: 'transformations, drawing shapes on a grid',
      samples: [
        { label: 'Reflection in y = x (2 marks)',
          question: { text: 'Reflect triangle A in the line y = x. Draw the image.', marks: 2,
            config: { grid: { xmin: -1, xmax: 7, ymin: -1, ymax: 7 }, shapes: [{ label: 'A', pts: [[1, 3], [1, 5], [2, 5]] }], lines: [{ p1: [-1, -1], p2: [7, 7], label: 'y = x' }] } },
          answer: { shape: [[3, 1], [5, 1], [5, 2]] } },
        { label: 'Enlargement, scale factor 2 (3 marks)',
          question: { text: 'Enlarge triangle B by scale factor 2, centre (0, 0).', marks: 3,
            config: { grid: { xmin: 0, xmax: 9, ymin: 0, ymax: 7 }, shapes: [{ label: 'B', pts: [[1, 1], [3, 1], [1, 3]] }] } },
          answer: { shape: [[2, 2], [6, 2], [2, 6]] } },
        { label: 'Rotation 90° clockwise (2 marks)',
          question: { text: 'Rotate shape C 90° clockwise about (0, 0).', marks: 2,
            config: { grid: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 }, shapes: [{ label: 'C', pts: [[1, 1], [4, 1], [4, 2], [1, 3]] }] } },
          answer: { shape: [[1, -1], [1, -4], [2, -4], [3, -1]] } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const g = Object.assign({ xmin: 0, xmax: 8, ymin: 0, ymax: 8, snap: 1 }, cfg.grid || {});
      const maxShapes = cfg.max || 1;
      let shapes = [], draft = null, sel = null, drag = null, tool = 'draw';
      const W = 640, cell = Math.min((W - 60) / (g.xmax - g.xmin), 520 / (g.ymax - g.ymin)), PL = 34, PT = 14;
      const VW = PL + cell * (g.xmax - g.xmin) + 20, VH = PT + cell * (g.ymax - g.ymin) + 30;
      const sx = x => PL + (x - g.xmin) * cell, sy = y => PT + (g.ymax - y) * cell;
      const btn = 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
      const bar = Ned.el('div', { role: 'toolbar', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;' });
      const mk = (label, fn, attrs) => { const b = Ned.el('button', Object.assign({ type: 'button', style: btn }, attrs || {}), [label]); b.addEventListener('click', fn); bar.appendChild(b); return b; };
      const tb = { draw: mk('Draw shape', () => setTool('draw'), { 'data-tool': 'draw' }), move: mk('Move a corner', () => setTool('move'), { 'data-tool': 'move' }) };
      const finishBtn = mk('Finish shape', () => finish(), { 'data-act': 'finish' });
      mk('Undo corner', () => { if (draft && draft.length) { draft.pop(); if (!draft.length) draft = null; draw(); } }, { 'data-act': 'undo' });
      mk('Delete shape', () => { if (sel != null) { shapes.splice(sel, 1); sel = null; draw(); emit(); } else if (shapes.length) { shapes.pop(); draw(); emit(); } }, { 'data-act': 'delete' });
      const svg = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Grid. Click grid points to place the corners of your shape.' });
      svg.style.cssText = 'display:block;width:100%;max-width:' + Math.round(VW) + 'px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(bar, svg, status);
      const gGrid = S('g', {}), gObj = S('g', {}); svg.append(gGrid, gObj);
      for (let x = g.xmin; x <= g.xmax; x++) { gGrid.appendChild(S('line', { x1: sx(x), y1: sy(g.ymin), x2: sx(x), y2: sy(g.ymax), stroke: x === 0 ? '#4a4a4a' : '#ddd3bb', 'stroke-width': x === 0 ? 2 : 1 }));
        const t = S('text', { x: sx(x), y: sy(g.ymin) + 16, 'text-anchor': 'middle', 'font-size': 11, fill: '#6f6757' }); t.textContent = x; gGrid.appendChild(t); }
      for (let y = g.ymin; y <= g.ymax; y++) { gGrid.appendChild(S('line', { x1: sx(g.xmin), y1: sy(y), x2: sx(g.xmax), y2: sy(y), stroke: y === 0 ? '#4a4a4a' : '#ddd3bb', 'stroke-width': y === 0 ? 2 : 1 }));
        const t = S('text', { x: sx(g.xmin) - 8, y: sy(y) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#6f6757' }); t.textContent = y; gGrid.appendChild(t); }
      (cfg.lines || []).forEach(L => { gGrid.appendChild(S('line', { x1: sx(L.p1[0]), y1: sy(L.p1[1]), x2: sx(L.p2[0]), y2: sy(L.p2[1]), stroke: '#2b2b2b', 'stroke-width': 2 }));
        if (L.label) { const t = S('text', { x: sx(L.p2[0]) - 18, y: sy(L.p2[1]) + 34, 'text-anchor': 'end', 'font-size': 13, 'font-style': 'italic', fill: '#2b2b2b' }); t.textContent = L.label; gGrid.appendChild(t); } });
      (cfg.shapes || []).forEach(sh => { gGrid.appendChild(S('polygon', { points: sh.pts.map(p => sx(p[0]) + ',' + sy(p[1])).join(' '), fill: '#d8d2c4', 'fill-opacity': 0.6, stroke: '#5b5b5b', 'stroke-width': 2 }));
        if (sh.label) { const c = sh.pts.reduce((a, p) => [a[0] + p[0] / sh.pts.length, a[1] + p[1] / sh.pts.length], [0, 0]); const t = S('text', { x: sx(c[0]), y: sy(c[1]) + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#2b2b2b' }); t.textContent = sh.label; gGrid.appendChild(t); } });

      const snapV = v => Math.round(v / g.snap) * g.snap;
      function toGrid(evt) { const r = svg.getBoundingClientRect(); const px = (evt.clientX - r.left) * VW / r.width, py = (evt.clientY - r.top) * VH / r.height;
        return [Math.max(g.xmin, Math.min(g.xmax, snapV(g.xmin + (px - PL) / cell))), Math.max(g.ymin, Math.min(g.ymax, snapV(g.ymax - (py - PT) / cell)))]; }
      function draw() {
        gObj.innerHTML = '';
        shapes.forEach((sh, i) => { gObj.appendChild(S('polygon', { points: sh.map(p => sx(p[0]) + ',' + sy(p[1])).join(' '), fill: '#4682b4', 'fill-opacity': sel === i ? 0.3 : 0.18, stroke: '#2b5d8a', 'stroke-width': 2.5, 'data-shape': i }));
          sh.forEach((p, k) => gObj.appendChild(S('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 6, fill: '#fff', stroke: '#2b5d8a', 'stroke-width': 2, 'data-shape': i, 'data-v': k, style: 'cursor:grab' }))); });
        if (draft) { if (draft.length > 1) gObj.appendChild(S('polyline', { points: draft.map(p => sx(p[0]) + ',' + sy(p[1])).join(' '), fill: 'none', stroke: '#b0413e', 'stroke-width': 2.5 }));
          draft.forEach((p, k) => gObj.appendChild(S('circle', { cx: sx(p[0]), cy: sy(p[1]), r: k === 0 ? 8 : 5, fill: k === 0 ? '#fbe9e7' : '#b0413e', stroke: '#b0413e', 'stroke-width': 2, 'data-first': k === 0 ? 1 : null }))); }
        finishBtn.disabled = !(draft && draft.length >= 2); finishBtn.style.opacity = finishBtn.disabled ? .5 : 1;
        status.textContent = draft ? `Corners so far: ${draft.map(p => '(' + p.join(', ') + ')').join(' ')}. Click the first corner again, or Finish, to close the shape.`
          : shapes.length ? `Your shape: ${shapes.map(sh => sh.map(p => '(' + p.join(', ') + ')').join(' ')).join(' | ')}.` : 'Click grid points to place the corners of your shape, in order.';
      }
      function emit() { onChange(shapes.length ? { shapes: shapes.map(sh => ({ pts: sh.map(p => p.slice()) })) } : null); }
      function finish() { if (!draft || draft.length < 2) return; if (shapes.length >= maxShapes) shapes.splice(0, shapes.length - maxShapes + 1); shapes.push(draft); draft = null; draw(); emit(); }
      function setTool(t) { tool = t; Object.keys(tb).forEach(k => { tb[k].style.background = k === t ? '#eaf1f8' : 'var(--paper)'; tb[k].style.borderColor = k === t ? 'var(--accent)' : 'var(--line)'; tb[k].setAttribute('aria-pressed', k === t); }); }
      svg.addEventListener('pointerdown', evt => {
        const t = evt.target, p = toGrid(evt);
        if (t.dataset.v != null && tool === 'move') { sel = +t.dataset.shape; drag = { i: sel, k: +t.dataset.v }; try { svg.setPointerCapture(evt.pointerId); } catch (e) {} draw(); return; }
        if (tool === 'move') { sel = t.dataset.shape != null ? +t.dataset.shape : null; draw(); return; }
        if (draft && draft.length >= 2 && p[0] === draft[0][0] && p[1] === draft[0][1]) { finish(); return; }
        if (!draft) draft = [];
        if (!draft.some(q => q[0] === p[0] && q[1] === p[1])) draft.push(p);
        draw();
      });
      svg.addEventListener('pointermove', evt => { if (!drag) return; shapes[drag.i][drag.k] = toGrid(evt); draw(); });
      const end = () => { if (drag) { drag = null; draw(); emit(); } };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      function load(v) { shapes = v && v.shapes ? v.shapes.map(sh => sh.pts.map(p => p.slice())) : []; draft = null; sel = null; draw(); }
      setTool('draw'); load(value);
      container.__nedGrid = { screen: (x, y) => { const r = svg.getBoundingClientRect(); return { x: r.left + sx(x) * r.width / VW, y: r.top + sy(y) * r.height / VH }; } };
      return { update: v => load(v), clear: () => { shapes = []; draft = null; sel = null; draw(); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
