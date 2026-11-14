/* Constructions and scale drawings — ruler, compasses and a protractor on plain paper, measured in centimetres.
   Covers "construct triangle ABC with AB = 8 cm …" (arcs must show), scale drawings and bearings.
   config.paper   : { w, h } in cm (default 16 × 11)
   config.points  : { A:[x,y], B:[x,y] }  given points (cm from the bottom-left corner)
   config.segments: [['A','B']]          given lines
   config.north   : ['A']                draw a north line at these points (bearings)
   config.label   : the letter(s) the student may place, e.g. 'C' or ['B', 'C']
   Tools: Ruler (drag to draw a line; its length shows as you draw, as a ruler would), Compasses (press on the centre, drag
   out the radius, let go to draw an arc), Point (click to place the labelled point; snaps to where arcs and lines cross),
   Protractor (a 180° protractor you can move onto a point and turn by its handle).
   Saves { points:{ C:[x,y] }, segments:[[x1,y1,x2,y2]…], arcs:[{ c:[x,y], r, a0, a1 }…] } in cm, or null.
   Marked by NedMark 'construct': point positions within 2 mm, required arcs present, required lines drawn, bearings. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const PX = 40, r2 = n => Math.round(n * 100) / 100;
  Ned.register('construct',
    { name: 'Ruler, compasses, protractor', unlocks: 'constructions, scale drawings, bearings',
      samples: [
        { label: 'Construct a triangle (2 marks)',
          question: { text: 'AB = 8 cm is drawn. Using a ruler and compasses only, construct triangle ABC with BC = 6 cm and AC = 5 cm, with C above AB. Leave in your construction arcs.', marks: 2,
            config: { points: { A: [3, 2], B: [11, 2] }, segments: [['A', 'B']], label: 'C' } },
          answer: { points: { C: { at: [6.3125, 5.7453], tol: 0.2 } }, arcs: [{ center: 'A', r: 5 }, { center: 'B', r: 6 }], segments: [['A', 'C'], ['B', 'C']] } },
        { label: 'Bearing and scale (2 marks)',
          question: { text: 'A ship sails from A on a bearing of 060° for 40 km. Scale: 1 cm represents 10 km. Mark its position B.', marks: 2,
            config: { points: { A: [4, 2.5] }, north: ['A'], label: 'B', paper: { w: 14, h: 10 } } },
          answer: { bearing: { from: 'A', to: 'B', deg: 60, tol: 2, dist: 4, dtol: 0.2 } } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const paper = Object.assign({ w: 16, h: 11 }, cfg.paper || {});
      const VW = paper.w * PX, VH = paper.h * PX;
      const given = cfg.points || {}, labels = [].concat(cfg.label || 'C');
      let pts = {}, segs = [], arcs = [], tool = 'ruler', drag = null, prot = null;   // prot: { c:[x,y], ang } in cm / degrees
      const X = x => x * PX, Y = y => VH - y * PX;
      const btn = 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
      const bar = Ned.el('div', { role: 'toolbar', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;' });
      const tb = {};
      [['ruler', 'Ruler'], ['compass', 'Compasses'], ['point', 'Point ' + labels.join('/')], ['protractor', 'Protractor']].forEach(([k, l]) => { const b = Ned.el('button', { type: 'button', style: btn, 'data-tool': k }, [l]); b.addEventListener('click', () => setTool(k)); tb[k] = b; bar.appendChild(b); });
      const undo = Ned.el('button', { type: 'button', style: btn, 'data-act': 'undo' }, ['Undo']); bar.appendChild(undo);
      const history = [];
      undo.addEventListener('click', () => { const last = history.pop(); if (!last) return; if (last === 'seg') segs.pop(); else if (last === 'arc') arcs.pop(); else delete pts[last]; paint(); emit(); });
      const svg = S('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'application', 'aria-label': 'Drawing paper. 1 square = 1 cm.' });
      svg.style.cssText = 'display:block;width:100%;max-width:' + VW + 'px;height:auto;background:#fffefb;border:1px solid var(--line);border-radius:6px;touch-action:none;';
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(bar, svg, status);
      const g0 = S('g', {}), g1 = S('g', {}), gP = S('g', {}), g2 = S('g', {}); svg.append(g0, g1, gP, g2);
      for (let x = 0; x <= paper.w; x++) g0.appendChild(S('line', { x1: X(x), y1: 0, x2: X(x), y2: VH, stroke: '#f1ece0' }));
      for (let y = 0; y <= paper.h; y++) g0.appendChild(S('line', { x1: 0, y1: Y(y), x2: VW, y2: Y(y), stroke: '#f1ece0' }));
      const pen = { stroke: '#2b2b2b', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' };
      const named = () => Object.assign({}, given, pts);
      function crossings() {      // where arcs and lines cross: points snap to these
        const out = [], circles = arcs.map(a => ({ c: a.c, r: a.r }));
        for (let i = 0; i < circles.length; i++) for (let j = i + 1; j < circles.length; j++) {
          const A = circles[i], B = circles[j], dx = B.c[0] - A.c[0], dy = B.c[1] - A.c[1], d = Math.hypot(dx, dy);
          if (d < 1e-6 || d > A.r + B.r || d < Math.abs(A.r - B.r)) continue;
          const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.r * A.r - a * a)), mx = A.c[0] + a * dx / d, my = A.c[1] + a * dy / d;
          out.push([mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]); }
        return out;
      }
      function snapPt(p, extra) {
        const cands = Object.values(named()).concat(crossings(), segs.flatMap(s => [[s[0], s[1]], [s[2], s[3]]]), extra || []);
        let best = null, bd = 0.25; cands.forEach(c => { const d = Math.hypot(c[0] - p[0], c[1] - p[1]); if (d < bd) { bd = d; best = c; } });
        return best ? [r2(best[0]), r2(best[1])] : [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
      }
      function toCm(evt) { const r = svg.getBoundingClientRect(); return [((evt.clientX - r.left) * VW / r.width) / PX, (VH - (evt.clientY - r.top) * VH / r.height) / PX]; }
      function arcPath(a) { const p = t => [X(a.c[0] + a.r * Math.cos(t)), Y(a.c[1] + a.r * Math.sin(t))]; const s = p(a.a0), e = p(a.a1), large = a.a1 - a.a0 > Math.PI ? 1 : 0;
        return `M${s[0]} ${s[1]} A${a.r * PX} ${a.r * PX} 0 ${large} 0 ${e[0]} ${e[1]}`; }
      function paint() {
        g1.innerHTML = ''; g2.innerHTML = ''; gP.innerHTML = '';
        (cfg.segments || []).forEach(s => { const a = given[s[0]], b = given[s[1]]; if (a && b) g1.appendChild(S('line', Object.assign({ x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]) }, pen, { 'stroke-width': 2 }))); });
        (cfg.north || []).forEach(k => { const a = given[k]; if (!a) return; g1.appendChild(S('line', Object.assign({ x1: X(a[0]), y1: Y(a[1]), x2: X(a[0]), y2: Y(a[1] + 2.4) }, pen)));
          g1.appendChild(S('path', { d: `M${X(a[0])} ${Y(a[1] + 2.6)} l-5 9 h10z`, fill: '#2b2b2b' })); g1.appendChild(Object.assign(S('text', { x: X(a[0]), y: Y(a[1] + 2.75), 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 }), { textContent: 'N' })); });
        segs.forEach(s => g1.appendChild(S('line', Object.assign({ x1: X(s[0]), y1: Y(s[1]), x2: X(s[2]), y2: Y(s[3]) }, pen))));
        arcs.forEach(a => g1.appendChild(S('path', Object.assign({ d: arcPath(a) }, pen, { stroke: '#555', 'stroke-width': 1.2 }))));
        Object.entries(named()).forEach(([k, p]) => { g2.appendChild(S('circle', { cx: X(p[0]), cy: Y(p[1]), r: 3, fill: '#2b2b2b' }));
          g2.appendChild(Object.assign(S('text', { x: X(p[0]) + 7, y: Y(p[1]) - 7, 'font-size': 15, 'font-weight': 700, fill: given[k] ? '#2b2b2b' : '#2b5d8a' }), { textContent: k })); });
        if (prot) drawProtractor();
        if (drag && drag.preview) g2.appendChild(drag.preview);
      }
      function drawProtractor() {
        const R = 4.5 * PX, g = S('g', { transform: `translate(${X(prot.c[0])} ${Y(prot.c[1])}) rotate(${-prot.ang})`, 'data-prot': 1 });
        g.appendChild(S('path', { d: `M${-R} 0 A${R} ${R} 0 0 1 ${R} 0 Z`, fill: '#cfe3f5', 'fill-opacity': 0.45, stroke: '#2b5d8a', 'stroke-width': 1.2, 'data-prot': 'body', style: 'cursor:move' }));
        for (let d = 0; d <= 180; d += 1) { const t = -d * Math.PI / 180, len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5;
          g.appendChild(S('line', { x1: R * Math.cos(t), y1: R * Math.sin(t), x2: (R - len) * Math.cos(t), y2: (R - len) * Math.sin(t), stroke: '#2b5d8a', 'stroke-width': d % 10 === 0 ? 1.2 : 0.6, 'pointer-events': 'none' }));
          if (d % 10 === 0) { [[R - 24, d], [R - 40, 180 - d]].forEach(([rr, lab]) => { const tx = S('text', { x: rr * Math.cos(t), y: rr * Math.sin(t) + 3, 'text-anchor': 'middle', 'font-size': rr > R - 30 ? 9 : 8, fill: rr > R - 30 ? '#2b5d8a' : '#7a3b3b', 'pointer-events': 'none', transform: `rotate(${prot.ang} ${rr * Math.cos(t)} ${rr * Math.sin(t)})` }); tx.textContent = lab; g.appendChild(tx); }); } }
        g.appendChild(S('line', { x1: -R, y1: 0, x2: R, y2: 0, stroke: '#2b5d8a', 'stroke-width': 1, 'pointer-events': 'none' }));
        g.appendChild(S('circle', { cx: 0, cy: 0, r: 3, fill: 'none', stroke: '#b0413e', 'pointer-events': 'none' }));
        g.appendChild(S('circle', { cx: R + 12, cy: 0, r: 9, fill: '#fff', stroke: '#2b5d8a', 'stroke-width': 2, 'data-prot': 'turn', style: 'cursor:grab' }));
        gP.appendChild(g);
      }
      function emit() { const any = Object.keys(pts).length || segs.length || arcs.length; onChange(any ? { points: JSON.parse(JSON.stringify(pts)), segments: segs.map(s => s.slice()), arcs: arcs.map(a => ({ c: a.c.slice(), r: a.r, a0: r2(a.a0), a1: r2(a.a1) })) } : null); }
      function setTool(t) { tool = t; if (t === 'protractor' && !prot) { const first = Object.values(given)[0] || [paper.w / 2, paper.h / 2]; prot = { c: first.slice(), ang: 0 }; }
        Object.keys(tb).forEach(k => { tb[k].style.background = k === t ? '#eaf1f8' : 'var(--paper)'; tb[k].style.borderColor = k === t ? 'var(--accent)' : 'var(--line)'; tb[k].setAttribute('aria-pressed', k === t); });
        status.textContent = { ruler: 'Press on the paper and drag to draw a straight line. The length shows as you draw.', compass: 'Press on the centre (a point), drag out to the radius you want, and let go to draw an arc.',
          point: 'Click to place ' + labels.join(' or ') + '. It snaps to where arcs or lines cross.', protractor: 'Drag the protractor onto a point. Turn it with the round handle. Read the scale that starts at 0 on your line.' }[t];
        paint(); }
      svg.addEventListener('pointerdown', evt => {
        const p = toCm(evt), t = evt.target;
        try { svg.setPointerCapture(evt.pointerId); } catch (e) {}
        if (prot && t.dataset.prot === 'turn') { drag = { kind: 'turn' }; return; }
        if (prot && t.dataset.prot === 'body') { drag = { kind: 'prot', off: [p[0] - prot.c[0], p[1] - prot.c[1]] }; return; }
        if (tool === 'ruler') drag = { kind: 'ruler', a: snapPt(p) };
        else if (tool === 'compass') drag = { kind: 'compass', c: snapPt(p) };
        else if (tool === 'point') { const q = snapPt(p); const k = labels.find(l => !pts[l]) || labels[labels.length - 1]; if (pts[k]) history.splice(history.lastIndexOf(k), 1); pts[k] = q; history.push(k); paint(); emit(); }
      });
      svg.addEventListener('pointermove', evt => {
        if (!drag) return; const p = toCm(evt);
        if (drag.kind === 'prot') { prot.c = snapPt([p[0] - drag.off[0], p[1] - drag.off[1]]); paint(); return; }
        if (drag.kind === 'turn') { prot.ang = Math.round(Math.atan2(p[1] - prot.c[1], p[0] - prot.c[0]) * 180 / Math.PI * 2) / 2; paint(); return; }
        if (drag.kind === 'ruler') { const b = snapPt(p); drag.b = b; const len = Math.hypot(b[0] - drag.a[0], b[1] - drag.a[1]);
          drag.preview = S('g', {}); drag.preview.appendChild(S('line', Object.assign({ x1: X(drag.a[0]), y1: Y(drag.a[1]), x2: X(b[0]), y2: Y(b[1]) }, pen, { stroke: '#2b5d8a' })));
          drag.preview.appendChild(Object.assign(S('text', { x: X(b[0]) + 8, y: Y(b[1]) - 8, 'font-size': 13, fill: '#2b5d8a', 'font-weight': 600 }), { textContent: len.toFixed(1) + ' cm' })); }
        if (drag.kind === 'compass') { const r = Math.round(Math.hypot(p[0] - drag.c[0], p[1] - drag.c[1]) * 10) / 10; drag.r = r; drag.at = Math.atan2(p[1] - drag.c[1], p[0] - drag.c[0]);
          drag.preview = S('g', {}); drag.preview.appendChild(S('line', { x1: X(drag.c[0]), y1: Y(drag.c[1]), x2: X(drag.c[0] + r * Math.cos(drag.at)), y2: Y(drag.c[1] + r * Math.sin(drag.at)), stroke: '#9db8d2', 'stroke-dasharray': '4 3' }));
          drag.preview.appendChild(S('path', Object.assign({ d: arcPath({ c: drag.c, r, a0: drag.at - 0.9, a1: drag.at + 0.9 }) }, pen, { stroke: '#2b5d8a' })));
          drag.preview.appendChild(Object.assign(S('text', { x: X(drag.c[0] + r * Math.cos(drag.at)) + 8, y: Y(drag.c[1] + r * Math.sin(drag.at)) - 8, 'font-size': 13, fill: '#2b5d8a', 'font-weight': 600 }), { textContent: 'radius ' + r.toFixed(1) + ' cm' })); }
        paint();
      });
      const end = () => {
        if (!drag) return; const d = drag; drag = null;
        if (d.kind === 'ruler' && d.b && Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) > 0.05) { segs.push([d.a[0], d.a[1], d.b[0], d.b[1]]); history.push('seg'); emit(); }
        if (d.kind === 'compass' && d.r > 0.1) { arcs.push({ c: d.c, r: d.r, a0: d.at - 0.9, a1: d.at + 0.9 }); history.push('arc'); emit(); }
        paint();
      };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      function load(v) { pts = JSON.parse(JSON.stringify((v && v.points) || {})); segs = ((v && v.segments) || []).map(s => s.slice()); arcs = ((v && v.arcs) || []).map(a => ({ c: a.c.slice(), r: a.r, a0: a.a0, a1: a.a1 })); history.length = 0; paint(); }
      load(value); setTool('ruler');
      container.__nedPaper = { screen: (x, y) => { const r = svg.getBoundingClientRect(); return { x: r.left + X(x) * r.width / VW, y: r.top + Y(y) * r.height / VH }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
