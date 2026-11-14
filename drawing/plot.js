/* Plot — points and straight lines on ready-made axes. Everything is stored in DATA units, so it can be marked.
   config.axes  : { xmin, xmax, xstep, ymin, ymax, ystep, minor?, xlabel?, ylabel? }   fixed axes, or
   config.scale : 'student'  -> the student chooses the ranges, steps and axis titles first (keeps the scale mark)
   config.tools : ['point', 'line']  which tools are offered (default both)
   config.labels: true -> a selected line can be given a short label (A, B, "constant speed" …)
   config.curve : true -> a smooth curve is drawn through the plotted points (quadratic, cubic, reciprocal, cumulative
                  frequency …); config.breakAt:[0] splits it at an asymptote. Draw a tangent with the line tool.
   config.given : { points:[[x,y]…] } a curve printed in the question (drawn, not part of the answer)
   config.region: true -> inequality regions: a selected line can be made broken (strict) or solid, and the R tool marks the
                  wanted region; every unwanted side is shaded, as the syllabus asks.
   Points and line ends snap to half a small square (a small square = step ÷ minor, default 5 per step).
   Saves { axes:{…, chosen}, points:[[x,y]…], lines:[{ p1:[x,y], p2:[x,y], label?, dashed? }], region?:[x,y] }, or null when nothing is drawn.
   Marked by NedMark 'plot': points within half a small square, line by gradient/intercept, labelled segments by shape. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  let VW = 720, VH = 480;                                    // drawing size; shrinks with the container so text stays readable on a phone
  const PL = 58, PR = 20, PT = 16, PB = 48;
  const r4 = n => Math.round(n * 1e4) / 1e4;

  Ned.register('plot',
    { name: 'Plot points and lines', unlocks: 'plotting, best-fit lines, simple sketches',
      samples: [
        { label: 'Plot points (fixed axes)',
          question: { text: 'Plot the results from the table: (1, 2), (2, 4.2), (3, 5.8), (4, 8), (5, 10.2).', marks: 2,
            config: { axes: { xmin: 0, xmax: 6, xstep: 1, ymin: 0, ymax: 12, ystep: 2, minor: 5, xlabel: 'time / s', ylabel: 'distance / m' }, tools: ['point'] } },
          answer: { points: { list: [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 10.2]], marks: 2 } } },
        { label: 'Points + line of best fit',
          question: { text: 'Plot the points (1, 2), (2, 4.2), (3, 5.8), (4, 8), (5, 10.2) and draw the line of best fit.', marks: 3,
            config: { axes: { xmin: 0, xmax: 6, xstep: 1, ymin: 0, ymax: 12, ystep: 2, minor: 5, xlabel: 'time / s', ylabel: 'distance / m' } } },
          answer: { points: { list: [[1, 2], [2, 4.2], [3, 5.8], [4, 8], [5, 10.2]], marks: 2 }, line: { gradient: [1.85, 2.2], intercept: [-0.6, 0.6], marks: 1 } } },
        { label: 'Sketch: labelled lines',
          question: { text: 'On the speed–time axes, draw a line for an object moving at constant speed (label it A) and a line for an object with constant acceleration from rest (label it B).', marks: 2,
            config: { axes: { xmin: 0, xmax: 10, xstep: 2, ymin: 0, ymax: 10, ystep: 2, minor: 2, xlabel: 'time / s', ylabel: 'speed / m/s' }, tools: ['line'], labels: true } },
          answer: { segments: { list: [{ label: 'A', shape: 'flat' }, { label: 'B', shape: 'up', from: [0, 0], tol: [0.5, 0.5] }], marks: 2 } } },
        { label: 'Curve: quadratic graph',
          question: { text: 'Complete the table for y = x² − 2x − 3 and draw the graph for −2 ≤ x ≤ 4. x: −2, −1, 0, 1, 2, 3, 4.', marks: 4,
            config: { axes: { xmin: -2, xmax: 4, xstep: 1, ymin: -4, ymax: 6, ystep: 1, minor: 5, xlabel: 'x', ylabel: 'y' }, tools: ['point', 'line'], curve: true } },
          answer: { points: { list: [[-2, 5], [-1, 0], [0, -3], [1, -4], [2, -3], [3, 0], [4, 5]], marks: 3, scale: { 7: 3, 6: 2, 5: 1 } }, curve: { marks: 1, min: 6 } } },
        { label: 'Curve: tangent and gradient',
          question: { text: 'The curve y = x² is drawn. Draw a tangent to the curve at x = 1.', marks: 2,
            config: { axes: { xmin: 0, xmax: 3, xstep: 1, ymin: -1, ymax: 9, ystep: 1, minor: 5, xlabel: 'x', ylabel: 'y' }, tools: ['line'], curve: true, given: { points: [[0, 0], [0.5, 0.25], [1, 1], [1.5, 2.25], [2, 4], [2.5, 6.25], [3, 9]] } } },
          answer: { line: { gradient: [1.7, 2.3], intercept: [-1.3, -0.7], marks: 2 } } },
        { label: 'Inequalities: shade the region',
          question: { text: 'Draw the lines y = 1, x = 2 and x + y = 6. Leave unshaded the region where y ≥ 1, x > 2 and x + y ≤ 6. Label it R.', marks: 4,
            config: { axes: { xmin: 0, xmax: 7, xstep: 1, ymin: 0, ymax: 7, ystep: 1, minor: 2, xlabel: 'x', ylabel: 'y' }, tools: ['line'], region: true } },
          answer: { region: { lines: [{ through: [[0, 1], [7, 1]], strict: false, keep: [3, 2] }, { through: [[2, 0], [2, 7]], strict: true, keep: [3, 2] }, { through: [[0, 6], [6, 0]], strict: false, keep: [3, 2] }], marks: 4 } } },
        { label: 'Student chooses the scale',
          question: { text: 'Plot a graph of extension against load. Results: (0, 0), (2, 8), (4, 16), (6, 24), (8, 32). Choose suitable scales.', marks: 3,
            config: { scale: 'student', tools: ['point', 'line'] } },
          answer: { scale: { data: { xmin: 0, xmax: 8, ymin: 0, ymax: 32 }, marks: 1 }, points: { list: [[0, 0], [2, 8], [4, 16], [6, 24], [8, 32]], marks: 2 } } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const tools = (cfg.tools || ['point', 'line']).concat(cfg.region && !(cfg.tools || []).includes('region') ? ['region'] : []);
      const studentScale = cfg.scale === 'student';
      let ax = null, points = [], lines = [], tool = tools[0], sel = null, drag = null, region = null;

      const setup = Ned.el('div', { style: 'display:none;max-width:560px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--paper);margin-bottom:10px;' });
      const bar = Ned.el('div', { role: 'toolbar', 'aria-label': 'Graph tools', style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;' });
      const board = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Graph area. Use the tools above, or type coordinates below.' });
      board.style.cssText = 'display:block;width:100%;max-width:720px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;';
      const gGrid = S('g', {}), gShade = S('g', { 'clip-path': 'url(#ned-plot-clip-' + (++window.__nedPlotN || (window.__nedPlotN = 1)) + ')' }), gObj = S('g', {});
      const clipId = 'ned-plot-clip-' + window.__nedPlotN, defs = S('defs', {}), clipRect = S('rect', {}); const cp = S('clipPath', { id: clipId }); cp.appendChild(clipRect); defs.appendChild(cp);
      board.append(defs, gGrid, gShade, gObj);
      const under = Ned.el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:8px;' });
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(setup, bar, board, under, status);

      const btnStyle = 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
      const mk = (label, fn, attrs) => { const b = Ned.el('button', Object.assign({ type: 'button', style: btnStyle }, attrs || {}), [label]); b.addEventListener('click', fn); return b; };
      const toolBtns = {};
      const NAMES = { point: 'Point', line: 'Line', select: 'Select / move', region: 'Mark region R' };
      ['select'].concat(tools).forEach(t => { toolBtns[t] = mk(NAMES[t], () => setTool(t), { 'data-tool': t }); bar.appendChild(toolBtns[t]); });
      const delBtn = mk('Delete selected', () => removeSel(), { 'data-act': 'delete' }); bar.appendChild(delBtn);
      const dashBtn = mk('Solid / broken', () => { if (sel && sel.kind === 'line') { lines[sel.i].dashed = !lines[sel.i].dashed; if (!lines[sel.i].dashed) delete lines[sel.i].dashed; draw(); emit(); } }, { 'data-act': 'dash' });
      if (cfg.region) bar.appendChild(dashBtn);
      let editAxesBtn = null;
      if (studentScale) { editAxesBtn = mk('Change scale', () => showSetup(true), { 'data-act': 'scale' }); bar.appendChild(editAxesBtn); }

      // type-in row (keyboard route) + line label
      const num = (lab) => Ned.el('input', { type: 'number', step: 'any', 'aria-label': lab, style: 'width:5.2rem;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;' });
      const tx = num('x value'), ty = num('y value');
      const addPt = mk('Add point', () => { if (!ax || tx.value === '' || ty.value === '') return; addPoint(+tx.value, +ty.value, true); tx.value = ''; ty.value = ''; tx.focus(); }, { 'data-act': 'addpoint' });
      const typeRow = Ned.el('div', { style: 'display:' + (tools.includes('point') ? 'flex' : 'none') + ';gap:6px;align-items:flex-end;' }, [Ned.labelled('x', tx), Ned.labelled('y', ty), addPt]);
      const labInput = Ned.el('input', { type: 'text', maxlength: '24', 'aria-label': 'Label for the selected line', style: 'width:11rem;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;' });
      labInput.addEventListener('input', () => { if (sel && sel.kind === 'line') { const t = labInput.value.trim(); if (t) lines[sel.i].label = t; else delete lines[sel.i].label; draw(); emit(); } });
      const labRow = Ned.el('div', { style: 'display:none;' }, [Ned.labelled('label for the selected line', labInput)]);
      under.append(typeRow, labRow);

      // ---------- axes ----------
      const sx = x => PL + (x - ax.xmin) / (ax.xmax - ax.xmin) * (VW - PL - PR);
      const sy = y => VH - PB - (y - ax.ymin) / (ax.ymax - ax.ymin) * (VH - PT - PB);
      const snap = (v, step) => { const m = step / (ax.minor || 5) / 2; return r4(Math.round(v / m) * m); };   // half a small square
      function toData(evt) {
        const r = board.getBoundingClientRect();
        const px = (evt.clientX - r.left) * (VW / r.width), py = (evt.clientY - r.top) * (VH / r.height);
        let x = ax.xmin + (px - PL) / (VW - PL - PR) * (ax.xmax - ax.xmin), y = ax.ymin + (VH - PB - py) / (VH - PT - PB) * (ax.ymax - ax.ymin);
        x = Math.max(ax.xmin, Math.min(ax.xmax, snap(x, ax.xstep))); y = Math.max(ax.ymin, Math.min(ax.ymax, snap(y, ax.ystep)));
        return [x, y];
      }
      function drawAxes() {
        gGrid.innerHTML = '';
        if (!ax) return;
        const minor = ax.minor || 5, mx = ax.xstep / minor, my = ax.ystep / minor;
        const nx = (ax.xmax - ax.xmin) / mx, ny = (ax.ymax - ax.ymin) / my;
        if (nx <= 120) for (let k = 0; k <= Math.round(nx); k++) { const X = sx(ax.xmin + k * mx); gGrid.appendChild(S('line', { x1: X, y1: PT, x2: X, y2: VH - PB, stroke: '#eee6d2', 'stroke-width': 1 })); }
        if (ny <= 120) for (let k = 0; k <= Math.round(ny); k++) { const Y = sy(ax.ymin + k * my); gGrid.appendChild(S('line', { x1: PL, y1: Y, x2: VW - PR, y2: Y, stroke: '#eee6d2', 'stroke-width': 1 })); }
        for (let k = 0; k <= Math.round((ax.xmax - ax.xmin) / ax.xstep); k++) { const v = r4(ax.xmin + k * ax.xstep), X = sx(v);
          gGrid.appendChild(S('line', { x1: X, y1: PT, x2: X, y2: VH - PB, stroke: '#d5c9a8', 'stroke-width': 1 }));
          const t = S('text', { x: X, y: VH - PB + 16, 'text-anchor': 'middle', 'font-size': 12, fill: '#6f6757' }); t.textContent = v; gGrid.appendChild(t); }
        for (let k = 0; k <= Math.round((ax.ymax - ax.ymin) / ax.ystep); k++) { const v = r4(ax.ymin + k * ax.ystep), Y = sy(v);
          gGrid.appendChild(S('line', { x1: PL, y1: Y, x2: VW - PR, y2: Y, stroke: '#d5c9a8', 'stroke-width': 1 }));
          const t = S('text', { x: PL - 8, y: Y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#6f6757' }); t.textContent = v; gGrid.appendChild(t); }
        const x0 = ax.xmin <= 0 && ax.xmax >= 0 ? sx(0) : PL, y0 = ax.ymin <= 0 && ax.ymax >= 0 ? sy(0) : VH - PB;
        gGrid.appendChild(S('line', { x1: PL, y1: y0, x2: VW - PR, y2: y0, stroke: '#4a4a4a', 'stroke-width': 2 }));
        gGrid.appendChild(S('line', { x1: x0, y1: PT, x2: x0, y2: VH - PB, stroke: '#4a4a4a', 'stroke-width': 2 }));
        if (ax.xlabel) { const t = S('text', { x: (PL + VW - PR) / 2, y: VH - 8, 'text-anchor': 'middle', 'font-size': 13, fill: '#2b2b2b' }); t.textContent = ax.xlabel; gGrid.appendChild(t); }
        if (ax.ylabel) { const t = S('text', { x: 14, y: (PT + VH - PB) / 2, 'text-anchor': 'middle', 'font-size': 13, fill: '#2b2b2b', transform: `rotate(-90 14 ${(PT + VH - PB) / 2})` }); t.textContent = ax.ylabel; gGrid.appendChild(t); }
      }

      // ---------- objects ----------
      function smooth(ps) {      // Catmull–Rom through the points, as cubic Béziers
        if (ps.length < 2) return '';
        let d = `M${ps[0][0]} ${ps[0][1]}`;
        for (let i = 0; i < ps.length - 1; i++) { const p0 = ps[i - 1] || ps[i], p1 = ps[i], p2 = ps[i + 1], p3 = ps[i + 2] || p2;
          d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; }
        return d;
      }
      function shade() {
        gShade.innerHTML = '';
        clipRect.setAttribute('x', PL); clipRect.setAttribute('y', PT); clipRect.setAttribute('width', VW - PL - PR); clipRect.setAttribute('height', VH - PT - PB);
        if (!region) return;
        const R = [sx(region[0]), sy(region[1])], BIG = 4000;
        lines.forEach(L => {
          const a = [sx(L.p1[0]), sy(L.p1[1])], b = [sx(L.p2[0]), sy(L.p2[1])], d = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(d[0], d[1]);
          if (n < 1) return;
          const u = [d[0] / n, d[1] / n], side = Math.sign(u[0] * (R[1] - a[1]) - u[1] * (R[0] - a[0])) || 1, nn = [u[1] * side, -u[0] * side];   // nn points away from R
          const p1 = [a[0] - u[0] * BIG, a[1] - u[1] * BIG], p2 = [a[0] + u[0] * BIG, a[1] + u[1] * BIG];
          const poly = [p1, p2, [p2[0] + nn[0] * BIG, p2[1] + nn[1] * BIG], [p1[0] + nn[0] * BIG, p1[1] + nn[1] * BIG]];
          gShade.appendChild(S('polygon', { points: poly.map(p => p.join(',')).join(' '), fill: '#9c9282', 'fill-opacity': 0.28, 'data-shade': 1 }));
        });
      }
      function draw() {
        gObj.innerHTML = '';
        if (!ax) return;
        shade();
        if (cfg.given && cfg.given.points) { const g = cfg.given.points.slice().sort((p, q) => p[0] - q[0]).map(p => [sx(p[0]), sy(p[1])]); gObj.appendChild(S('path', { d: smooth(g), fill: 'none', stroke: '#5b5b5b', 'stroke-width': 2.2, 'data-given': 1 })); }
        if (cfg.curve && points.length > 1) {
          const sorted = points.slice().sort((p, q) => p[0] - q[0]); const parts = [[]];
          sorted.forEach((p, i) => { if (i && (cfg.breakAt || []).some(b => sorted[i - 1][0] < b && p[0] > b)) parts.push([]); parts[parts.length - 1].push([sx(p[0]), sy(p[1])]); });
          parts.forEach(ps => { const d = smooth(ps); if (d) gObj.appendChild(S('path', { d, fill: 'none', stroke: '#2b2b2b', 'stroke-width': 2, 'data-curve': 1 })); });
        }
        if (region) { const X = sx(region[0]), Y = sy(region[1]); const t = S('text', { x: X, y: Y + 7, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#2b6a2b', 'data-region': 1, style: 'cursor:grab' }); t.textContent = 'R'; gObj.appendChild(t); }
        lines.forEach((L, i) => {
          const on = sel && sel.kind === 'line' && sel.i === i;
          const a = [sx(L.p1[0]), sy(L.p1[1])], b = [sx(L.p2[0]), sy(L.p2[1])];
          gObj.appendChild(S('line', Object.assign({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: on ? '#4682b4' : '#2b2b2b', 'stroke-width': 3, 'stroke-linecap': 'round', 'data-line': i }, L.dashed ? { 'stroke-dasharray': '10 8' } : {})));
          gObj.appendChild(S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'transparent', 'stroke-width': 18, 'data-line': i, style: 'cursor:move' }));
          [a, b].forEach((p, e) => gObj.appendChild(S('circle', { cx: p[0], cy: p[1], r: 7, fill: '#fff', stroke: on ? '#4682b4' : '#2b2b2b', 'stroke-width': 2, 'data-line': i, 'data-end': e, style: 'cursor:grab' })));
          if (L.label) { const t = S('text', { x: (a[0] + b[0]) / 2 + 8, y: (a[1] + b[1]) / 2 - 10, 'font-size': 15, 'font-weight': 600, fill: '#2b2b2b', 'paint-order': 'stroke', stroke: '#fffdf7', 'stroke-width': 4 }); t.textContent = L.label; gObj.appendChild(t); }
        });
        points.forEach((p, i) => {
          const on = sel && sel.kind === 'point' && sel.i === i, X = sx(p[0]), Y = sy(p[1]), c = on ? '#4682b4' : '#b0413e';
          gObj.appendChild(S('path', { d: `M${X - 6} ${Y - 6}L${X + 6} ${Y + 6}M${X - 6} ${Y + 6}L${X + 6} ${Y - 6}`, stroke: c, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
          gObj.appendChild(S('circle', { cx: X, cy: Y, r: 12, fill: 'transparent', 'data-point': i, style: 'cursor:grab' }));
        });
        delBtn.disabled = !sel; delBtn.style.opacity = sel ? 1 : .5;
        dashBtn.disabled = !(sel && sel.kind === 'line'); dashBtn.style.opacity = dashBtn.disabled ? .5 : 1;
        labRow.style.display = cfg.labels && sel && sel.kind === 'line' ? '' : 'none';
        if (sel && sel.kind === 'line' && document.activeElement !== labInput) labInput.value = lines[sel.i].label || '';
        if (sel && sel.kind === 'point') status.textContent = `Point at (${points[sel.i][0]}, ${points[sel.i][1]}).`;
        else if (sel && sel.kind === 'line') status.textContent = `Line from (${lines[sel.i].p1.join(', ')}) to (${lines[sel.i].p2.join(', ')}).`;
        else status.textContent = !ax ? '' : tool === 'point' ? 'Click the grid to plot a point. Drag a point to move it.' : tool === 'line' ? 'Press and drag on the grid to draw a straight line. Drag its ends to adjust.' : tool === 'region' ? 'Click inside the region you want: it is labelled R and every unwanted side is shaded.' : 'Click a point or line to select it.';
      }
      function emit() {
        if (!ax || (!points.length && !lines.length && !region)) return onChange(null);
        onChange(Object.assign({ axes: Object.assign({}, ax), points: points.map(p => p.slice()), lines: lines.map(L => Object.assign({ p1: L.p1.slice(), p2: L.p2.slice() }, L.label ? { label: L.label } : {}, L.dashed ? { dashed: true } : {})) }, region ? { region: region.slice() } : {}));
      }
      function addPoint(x, y, clamp) {
        if (clamp) { x = Math.max(ax.xmin, Math.min(ax.xmax, x)); y = Math.max(ax.ymin, Math.min(ax.ymax, y)); }
        const k = points.findIndex(p => p[0] === x && p[1] === y);
        if (k >= 0) { sel = { kind: 'point', i: k }; draw(); return; }
        points.push([r4(x), r4(y)]); sel = { kind: 'point', i: points.length - 1 }; draw(); emit();
      }
      function removeSel() {
        if (!sel) return;
        if (sel.kind === 'point') points.splice(sel.i, 1); else lines.splice(sel.i, 1);
        sel = null; draw(); emit();
      }
      function setTool(t) { tool = t; for (const k in toolBtns) { const on = k === t; toolBtns[k].style.background = on ? '#eaf1f8' : 'var(--paper)'; toolBtns[k].style.borderColor = on ? 'var(--accent)' : 'var(--line)'; toolBtns[k].setAttribute('aria-pressed', on); } draw(); }

      board.addEventListener('pointerdown', (evt) => {
        if (!ax) return;
        const t = evt.target, d = toData(evt);
        if (t.dataset.region != null || tool === 'region') { region = d; sel = null; drag = { kind: 'region' }; try { board.setPointerCapture(evt.pointerId); } catch (e) {} draw(); emit(); evt.preventDefault(); return; }
        if (t.dataset.point != null) { sel = { kind: 'point', i: +t.dataset.point }; drag = { kind: 'point' }; }
        else if (t.dataset.end != null) { sel = { kind: 'line', i: +t.dataset.line }; drag = { kind: 'end', end: +t.dataset.end }; }
        else if (t.dataset.line != null) { sel = { kind: 'line', i: +t.dataset.line }; const L = lines[sel.i]; drag = { kind: 'body', from: d, p1: L.p1.slice(), p2: L.p2.slice() }; }
        else if (tool === 'point') { addPoint(d[0], d[1]); drag = { kind: 'point' }; }
        else if (tool === 'line') { lines.push({ p1: d, p2: d.slice() }); sel = { kind: 'line', i: lines.length - 1 }; drag = { kind: 'end', end: 1, fresh: true }; }
        else sel = null;
        try { board.setPointerCapture(evt.pointerId); } catch (e) {}
        draw(); evt.preventDefault();
      });
      board.addEventListener('pointermove', (evt) => {
        if (drag && drag.kind === 'region') { region = toData(evt); draw(); return; }
        if (!drag || !sel) return;
        const d = toData(evt);
        if (drag.kind === 'point') points[sel.i] = d;
        else if (drag.kind === 'end') lines[sel.i][drag.end ? 'p2' : 'p1'] = d;
        else { const dx = d[0] - drag.from[0], dy = d[1] - drag.from[1]; const L = lines[sel.i];
          const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
          const ddx = cl(dx, ax.xmin - Math.min(drag.p1[0], drag.p2[0]), ax.xmax - Math.max(drag.p1[0], drag.p2[0])), ddy = cl(dy, ax.ymin - Math.min(drag.p1[1], drag.p2[1]), ax.ymax - Math.max(drag.p1[1], drag.p2[1]));
          L.p1 = [r4(drag.p1[0] + ddx), r4(drag.p1[1] + ddy)]; L.p2 = [r4(drag.p2[0] + ddx), r4(drag.p2[1] + ddy)]; }
        draw();
      });
      const endDrag = () => {
        if (!drag) return;
        if (drag.kind === 'region') { drag = null; emit(); return; }
        if (drag.fresh && sel) { const L = lines[sel.i]; if (L.p1[0] === L.p2[0] && L.p1[1] === L.p2[1]) { lines.splice(sel.i, 1); sel = null; status.textContent = 'Press and drag to draw a line.'; drag = null; draw(); return; } }
        if (sel && sel.kind === 'point') {                       // dropped on top of another point -> merge
          const p = points[sel.i], k = points.findIndex((q, i) => i !== sel.i && q[0] === p[0] && q[1] === p[1]);
          if (k >= 0) { points.splice(sel.i, 1); sel = { kind: 'point', i: k > sel.i ? k - 1 : k }; }
        }
        drag = null; draw(); emit();
      };
      board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
      const onKey = (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && container.contains(document.activeElement || board)) { removeSel(); e.preventDefault(); } };
      board.setAttribute('tabindex', '0'); board.addEventListener('keydown', onKey);

      // ---------- student-chosen scale ----------
      function showSetup(editing) {
        setup.innerHTML = ''; setup.style.display = '';
        const f = {}; const cur = ax || {};
        const inp = (k, lab, def, type) => { f[k] = Ned.el('input', { type: type || 'number', step: 'any', value: cur[k] != null ? String(cur[k]) : (def != null ? String(def) : ''), 'aria-label': lab, style: 'width:' + (type ? '11rem' : '5.2rem') + ';padding:6px;border:1px solid var(--line);border-radius:6px;background:#fffdf7;font:inherit;' }); return Ned.labelled(lab.replace(/^[xy]-axis /, ''), f[k]); };
        const rowS = 'display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 10px;';
        const err = Ned.el('p', { class: 'ned-note', role: 'alert', style: 'color:#b0413e;' }, ['']);
        setup.append(
          Ned.el('strong', {}, ['Choose your scales']),
          Ned.el('p', { class: 'ned-note' }, ['Pick ranges that fit all your data and use more than half of the grid.']),
          Ned.el('div', { style: 'font-size:13px;font-weight:600;' }, ['x-axis']),
          Ned.el('div', { style: rowS }, [inp('xmin', 'x-axis from', ''), inp('xmax', 'x-axis to', ''), inp('xstep', 'x-axis step', ''), inp('xlabel', 'x-axis title', '', 'text')]),
          Ned.el('div', { style: 'font-size:13px;font-weight:600;' }, ['y-axis']),
          Ned.el('div', { style: rowS }, [inp('ymin', 'y-axis from', ''), inp('ymax', 'y-axis to', ''), inp('ystep', 'y-axis step', ''), inp('ylabel', 'y-axis title', '', 'text')]),
          mk(editing ? 'Redraw axes' : 'Draw axes', () => {
            const n = k => (f[k].value === '' ? NaN : +f[k].value);
            const a = { xmin: n('xmin'), xmax: n('xmax'), xstep: n('xstep'), ymin: n('ymin'), ymax: n('ymax'), ystep: n('ystep'), minor: 5, chosen: true };
            if (Object.keys(a).some(k => typeof a[k] === 'number' && isNaN(a[k]))) { err.textContent = 'Fill in from, to and step for both axes.'; return; }
            if (a.xmax <= a.xmin || a.ymax <= a.ymin) { err.textContent = '"To" must be bigger than "from".'; return; }
            if (a.xstep <= 0 || a.ystep <= 0) { err.textContent = 'Steps must be bigger than 0.'; return; }
            if ((a.xmax - a.xmin) / a.xstep > 30 || (a.ymax - a.ymin) / a.ystep > 30) { err.textContent = 'That step gives more than 30 divisions. Use a bigger step.'; return; }
            if (f.xlabel.value.trim()) a.xlabel = f.xlabel.value.trim(); if (f.ylabel.value.trim()) a.ylabel = f.ylabel.value.trim();
            const inside = p => p[0] >= a.xmin && p[0] <= a.xmax && p[1] >= a.ymin && p[1] <= a.ymax;
            points = points.filter(inside); lines = lines.filter(L => inside(L.p1) && inside(L.p2)); sel = null;
            ax = a; setup.style.display = 'none'; showBoard(true); drawAxes(); draw(); emit();
          }, { 'data-act': 'drawaxes', style: btnStyle + 'background:var(--accent);color:#fff;border-color:var(--accent);' }),
          err);
        if (!editing) showBoard(false);
      }
      function showBoard(on) { [bar, board, under, status].forEach(n => { n.style.display = on ? (n === bar || n === under ? 'flex' : 'block') : 'none'; }); }

      function load(v) {
        points = v && v.points ? v.points.map(p => p.slice()) : [];
        lines = v && v.lines ? v.lines.map(L => Object.assign({ p1: L.p1.slice(), p2: L.p2.slice() }, L.label ? { label: L.label } : {}, L.dashed ? { dashed: true } : {})) : [];
        region = v && v.region ? v.region.slice() : null;
        sel = null;
        if (studentScale) { ax = v && v.axes ? Object.assign({}, v.axes) : null; if (ax) { setup.style.display = 'none'; showBoard(true); } else showSetup(false); }
        else ax = Object.assign({ minor: 5 }, cfg.axes || { xmin: 0, xmax: 10, xstep: 1, ymin: 0, ymax: 10, ystep: 1 });
        drawAxes(); setTool(tool);
      }
      function fit() {
        const w = Math.round(container.getBoundingClientRect().width) || 720;
        const nw = Math.max(320, Math.min(720, w)), nh = nw < 520 ? Math.round(nw * 0.95) : 480;
        if (nw === VW && nh === VH) return;
        VW = nw; VH = nh; board.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        drawAxes(); draw();
      }
      fit();
      load(value);
      let ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(container); }
      container.__nedPlot = { screen: (x, y) => { const r = board.getBoundingClientRect(); return { x: r.left + sx(x) * r.width / VW, y: r.top + sy(y) * r.height / VH }; } };

      return {
        update: (v) => load(v),
        clear: () => { points = []; lines = []; region = null; sel = null; if (studentScale) { ax = null; showSetup(false); } draw(); emit(); },
        destroy: () => { if (ro) ro.disconnect(); container.innerHTML = ''; delete container.__nedPlot; },
      };
    });
})();
