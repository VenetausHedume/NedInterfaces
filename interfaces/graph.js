/* Graph (draw) — whiteboard graph editor: axes + line + curve + shade + label,
   with whole-number snapping. Coordinates are stored in DATA units (not pixels)
   so answers are resolution-independent and markable.
   Labels reuse the shared math field (driven by the global ∑ widget).
   Saves { axes:{xmin,xmax,ymin,ymax}, objects:[...] } or null. */

(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const hasMath = () => window.customElements && customElements.get('math-field');
  const svg = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  Ned.register('graph',
    {
      name: 'Graph (draw)',
      unlocks: 'plotting & shading',
      samples: [
        { label: 'Econ supply & demand',
          question: { text: 'Draw and label a supply and demand diagram.', marks: 4,
                      config: { xmin: 0, xmax: 10, ymin: 0, ymax: 10 } } },
        { label: 'Maths axes (−5 to 5)',
          question: { text: 'Sketch the line y = x.', marks: 2,
                      config: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 } } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const A0 = {
        xmin: cfg.xmin != null ? cfg.xmin : 0, xmax: cfg.xmax != null ? cfg.xmax : 10,
        ymin: cfg.ymin != null ? cfg.ymin : 0, ymax: cfg.ymax != null ? cfg.ymax : 10,
      };

      // ---- layout ----
      const toolbar = Ned.el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;' });
      const wrap = Ned.el('div', { style: 'position:relative;width:100%;max-width:860px;' });
      const board = svg('svg', { viewBox: '0 0 860 540' });
      board.style.cssText = 'width:100%;height:540px;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;display:block;';
      const note = Ned.el('div', { style: 'position:absolute;left:12px;top:12px;background:#3a4653;color:#fff;font-size:12px;padding:6px 10px;border-radius:8px;display:none;' },
        ['Click to add points \u00b7 Enter or first point to shade \u00b7 Esc removes last']);
      wrap.append(board, note);
      container.append(toolbar, wrap);

      let W = 860, H = 540;
      function fit() { const r = board.getBoundingClientRect(); if (!r.width) return; W = Math.round(r.width); H = Math.round(r.height); board.setAttribute('viewBox', '0 0 ' + W + ' ' + H); }

      const gridG = svg('g', {}); board.appendChild(gridG);
      const objsG = svg('g', {}); board.appendChild(objsG);
      const snapG = svg('g', {}); board.appendChild(snapG);

      const PAD = 46;
      let axis = null, snapOn = true, tool = 'select', selected = null, rotating = false, uid = 1;
      let objs = [];

      const pt = (evt) => { const r = board.getBoundingClientRect(); return { x: (evt.clientX - r.left) * (W / r.width), y: (evt.clientY - r.top) * (H / r.height) }; };
      const niceStep = (range, target) => { const raw = range / target, pw = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / pw; let s; if (n < 1.5) s = 1; else if (n < 3) s = 2; else if (n < 7) s = 5; else s = 10; return s * pw; };
      const angCCW = (x1, y1, x2, y2) => Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI;
      const SNAPA = [0, 45, 90, 135, 180, -45, -90, -135, -180];
      const snapDeg = (d) => { for (const t of SNAPA) if (Math.abs(d - t) <= 4) return t; return d; };

      function drawAxes(a) {
        axis = null; gridG.innerHTML = '';
        const plotW = W - PAD * 2, plotH = H - PAD * 2;
        const sx = (x) => PAD + (x - a.xmin) / (a.xmax - a.xmin) * plotW;
        const sy = (y) => H - PAD - (y - a.ymin) / (a.ymax - a.ymin) * plotH;
        const stepX = niceStep(a.xmax - a.xmin, 10), stepY = niceStep(a.ymax - a.ymin, 10);
        for (let x = Math.ceil(a.xmin / stepX) * stepX; x <= a.xmax + 1e-9; x += stepX) { const X = sx(x);
          gridG.appendChild(svg('line', { x1: X, y1: PAD, x2: X, y2: H - PAD, stroke: '#e7dfca', 'stroke-width': 1 }));
          const t = svg('text', { x: X, y: H - PAD + 18, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12 }); t.textContent = +x.toFixed(6); gridG.appendChild(t); }
        for (let y = Math.ceil(a.ymin / stepY) * stepY; y <= a.ymax + 1e-9; y += stepY) { const Y = sy(y);
          gridG.appendChild(svg('line', { x1: PAD, y1: Y, x2: W - PAD, y2: Y, stroke: '#e7dfca', 'stroke-width': 1 }));
          const t = svg('text', { x: PAD - 9, y: Y + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 12 }); t.textContent = +y.toFixed(6); gridG.appendChild(t); }
        const x0 = (a.xmin <= 0 && a.xmax >= 0) ? sx(0) : PAD, y0 = (a.ymin <= 0 && a.ymax >= 0) ? sy(0) : H - PAD;
        gridG.appendChild(svg('line', { x1: PAD, y1: y0, x2: W - PAD, y2: y0, stroke: '#5a5a5a', 'stroke-width': 2 }));
        gridG.appendChild(svg('line', { x1: x0, y1: PAD, x2: x0, y2: H - PAD, stroke: '#5a5a5a', 'stroke-width': 2 }));
        axis = { ...a, sx, sy, plotW, plotH,
          toData: (px, py) => ({ x: a.xmin + (px - PAD) / plotW * (a.xmax - a.xmin), y: a.ymin + (H - PAD - py) / plotH * (a.ymax - a.ymin) }) };
      }
      // data <-> screen
      const D2S = (dx, dy) => ({ x: axis.sx(dx), y: axis.sy(dy) });
      const S2D = (px, py) => axis.toData(px, py);
      function snapScreen(px, py) {
        if (!snapOn || !axis) return { x: px, y: py, snapped: false };
        const d = axis.toData(px, py), rx = Math.round(d.x), ry = Math.round(d.y);
        if (rx < axis.xmin || rx > axis.xmax || ry < axis.ymin || ry > axis.ymax) return { x: px, y: py, snapped: false };
        const s = D2S(rx, ry); return { x: s.x, y: s.y, snapped: true };
      }
      const showSnap = (px, py) => { snapG.innerHTML = ''; snapG.appendChild(svg('circle', { cx: px, cy: py, r: 8, fill: 'none', stroke: '#4caf50', 'stroke-width': 2 })); };
      const clearSnap = () => { snapG.innerHTML = ''; };

      // ---- emit (screen -> data) ----
      function emit() {
        if (!axis) { onChange(null); return; }
        const out = { axes: { xmin: axis.xmin, xmax: axis.xmax, ymin: axis.ymin, ymax: axis.ymax }, objects: [] };
        objs.forEach(O => {
          if (O.kind === 'line') {
            const p1 = S2D(O.x1, O.y1), p2 = S2D(O.x2, O.y2);
            const o = { type: O.curved ? 'curve' : 'line', p1: [round(p1.x), round(p1.y)], p2: [round(p2.x), round(p2.y)], dotted: !!O.dotted };
            if (O.curved && O.bx != null) { const b = S2D(O.bx, O.by); o.bend = [round(b.x), round(b.y)]; }
            if (O.label) o.label = O.label;
            out.objects.push(o);
          } else {
            const o = { type: 'region', points: O.pts.map(p => { const d = S2D(p.x, p.y); return [round(d.x), round(d.y)]; }) };
            if (O.label) o.label = O.label;
            out.objects.push(o);
          }
        });
        onChange(out.objects.length ? out : { axes: out.axes });   // keep axes even if empty? -> treat empty as null:
      }
      function emitClean() {
        if (!axis) return onChange(null);
        const objects = [];
        objs.forEach(O => {
          if (O.kind === 'line') {
            const p1 = S2D(O.x1, O.y1), p2 = S2D(O.x2, O.y2);
            const o = { type: O.curved ? 'curve' : 'line', p1: [round(p1.x), round(p1.y)], p2: [round(p2.x), round(p2.y)], dotted: !!O.dotted };
            if (O.curved && O.bx != null) { const b = S2D(O.bx, O.by); o.bend = [round(b.x), round(b.y)]; }
            if (O.label) o.label = O.label;
            objects.push(o);
          } else {
            const o = { type: 'region', points: O.pts.map(p => { const d = S2D(p.x, p.y); return [round(d.x), round(d.y)]; }) };
            if (O.label) o.label = O.label;
            objects.push(o);
          }
        });
        onChange(objects.length ? { axes: { xmin: axis.xmin, xmax: axis.xmax, ymin: axis.ymin, ymax: axis.ymax }, objects } : null);
      }
      const round = (n) => Math.round(n * 100) / 100;

      // ---- objects ----
      function addLineObj(cx, cy, curved) {
        const len = Math.min(180, axis ? axis.plotW / 3 : 180);
        const O = { id: uid++, kind: 'line', curved: !!curved, x1: cx - len / 2, y1: cy, x2: cx + len / 2, y2: cy, bx: null, by: null, dotted: false, label: '' };
        if (curved) { O.bx = cx; O.by = cy - 60; }
        const g = svg('g', {}), hit = svg('path', { stroke: 'transparent', 'stroke-width': 18, fill: 'none', cursor: 'move' }), body = svg('path', { stroke: '#2b2b2b', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none', cursor: 'move' });
        const h1 = svg('circle', { r: 6, fill: '#fff', stroke: 'var(--accent)', 'stroke-width': 2, cursor: 'grab' }), h2 = svg('circle', { r: 6, fill: '#fff', stroke: 'var(--accent)', 'stroke-width': 2, cursor: 'grab' });
        const bend = svg('circle', { r: 7, fill: '#eaf1f8', stroke: 'var(--accent)', 'stroke-width': 2, cursor: 'grab' });
        const rotG = svg('g', {}), rotBg = svg('circle', { r: 13, fill: '#fff', stroke: 'var(--line)', 'stroke-width': 1.5, cursor: 'grab' });
        rotG.append(rotBg, svg('path', { d: 'M -5 -1 A 5 5 0 1 1 -3 4', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }), svg('path', { d: 'M -3 4 l -3 -1 M -3 4 l 1 -3', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }));
        g.append(hit, body, h1, h2, bend, rotG); objsG.appendChild(g);
        O.el = { g, body, hit, h1, h2, bend, rotG, rotBg }; objs.push(O); wireLine(O); draw(O); select(O); return O;
      }
      const pathFor = (O) => { const { x1, y1, x2, y2, bx, by } = O; if (bx == null) return 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2; const cx = 2 * bx - 0.5 * (x1 + x2), cy = 2 * by - 0.5 * (y1 + y2); return 'M ' + x1 + ' ' + y1 + ' Q ' + cx + ' ' + cy + ' ' + x2 + ' ' + y2; };

      function addRegion(points) {
        const O = { id: uid++, kind: 'region', pts: points.map(p => ({ x: p.x, y: p.y })), label: '' };
        const g = svg('g', {}), poly = svg('polygon', { fill: 'rgba(70,130,180,.28)', stroke: 'var(--accent)', 'stroke-width': 1.5, cursor: 'move' });
        g.append(poly); objsG.appendChild(g); O.el = { g, poly }; objs.push(O); wireRegion(O); draw(O); select(O); return O;
      }

      function draw(O) {
        const e = O.el;
        if (O.kind === 'line') {
          const d = pathFor(O); e.body.setAttribute('d', d); e.hit.setAttribute('d', d);
          e.body.setAttribute('stroke-dasharray', O.dotted ? '8 7' : 'none');
          e.h1.setAttribute('cx', O.x1); e.h1.setAttribute('cy', O.y1); e.h2.setAttribute('cx', O.x2); e.h2.setAttribute('cy', O.y2);
          const mx = (O.x1 + O.x2) / 2, my = (O.y1 + O.y2) / 2, bpx = O.bx == null ? mx : O.bx, bpy = O.by == null ? my : O.by;
          e.bend.setAttribute('cx', bpx); e.bend.setAttribute('cy', bpy);
          e.rotG.setAttribute('transform', 'translate(' + mx + ',' + (my + 40) + ')');
          const show = (selected === O && !rotating) ? 'visible' : 'hidden';
          [e.h1, e.h2, e.rotG].forEach(h => h.setAttribute('visibility', show));
          e.bend.setAttribute('visibility', (O.curved && show === 'visible') ? 'visible' : 'hidden');
          e.g.classList.toggle('sel', selected === O);
        } else {
          e.poly.setAttribute('points', O.pts.map(p => p.x + ',' + p.y).join(' '));
          e.poly.setAttribute('stroke-width', selected === O ? 2.5 : 1.5);
          e.g.querySelectorAll('.rhandle').forEach(h => h.remove());
          if (selected === O) O.pts.forEach((p, i) => { const h = svg('circle', { class: 'rhandle', r: 6, cx: p.x, cy: p.y, fill: '#fff', stroke: 'var(--accent)', 'stroke-width': 2, cursor: 'grab' });
            h.addEventListener('pointerdown', (evt) => { evt.stopPropagation(); select(O);
              const mv = (e2) => { const q = pt(e2), sp = snapScreen(q.x, q.y); sp.snapped ? showSnap(sp.x, sp.y) : clearSnap(); O.pts[i].x = sp.x; O.pts[i].y = sp.y; draw(O); };
              const up = () => { clearSnap(); emitClean(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
              window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); });
            e.g.appendChild(h); });
          e.g.classList.toggle('sel', selected === O);
        }
      }
      function latexToPlain(s) { if (!s) return ''; return s.replace(/\\[a-zA-Z]+/g, '').replace(/[{}$]/g, ''); }

      function select(O) { selected = O; objs.forEach(draw); if (O) O.el.g.parentNode.appendChild(O.el.g); showDesc(O); }

      function wireLine(O) {
        const startMove = (evt) => { if (tool !== 'select') return; evt.stopPropagation(); select(O);
          const p0 = pt(evt), o = { x1: O.x1, y1: O.y1, x2: O.x2, y2: O.y2, bx: O.bx, by: O.by };
          const mv = (e) => { const p = pt(e), dx = p.x - p0.x, dy = p.y - p0.y; O.x1 = o.x1 + dx; O.y1 = o.y1 + dy; O.x2 = o.x2 + dx; O.y2 = o.y2 + dy; if (o.bx != null) { O.bx = o.bx + dx; O.by = o.by + dy; } draw(O); };
          const up = () => { emitClean(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); };
        O.el.hit.addEventListener('pointerdown', startMove); O.el.body.addEventListener('pointerdown', startMove);
        const dragEnd = (w) => (evt) => { evt.stopPropagation(); select(O);
          const mv = (e) => { const p = pt(e), sp = snapScreen(p.x, p.y); sp.snapped ? showSnap(sp.x, sp.y) : clearSnap(); if (w === 1) { O.x1 = sp.x; O.y1 = sp.y; } else { O.x2 = sp.x; O.y2 = sp.y; } draw(O); };
          const up = () => { clearSnap(); emitClean(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); };
        O.el.h1.addEventListener('pointerdown', dragEnd(1)); O.el.h2.addEventListener('pointerdown', dragEnd(2));
        O.el.bend.addEventListener('pointerdown', (evt) => { evt.stopPropagation(); select(O);
          const mv = (e) => { const p = pt(e), mx = (O.x1 + O.x2) / 2, my = (O.y1 + O.y2) / 2; if (Math.hypot(p.x - mx, p.y - my) < 10) { O.bx = null; O.by = null; } else { O.bx = p.x; O.by = p.y; } draw(O); };
          const up = () => { emitClean(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); });
        O.el.rotBg.addEventListener('pointerdown', (evt) => { evt.stopPropagation(); select(O);
          const mx = (O.x1 + O.x2) / 2, my = (O.y1 + O.y2) / 2, half = Math.hypot(O.x2 - O.x1, O.y2 - O.y1) / 2;
          let boff = null; if (O.bx != null) boff = { dx: O.bx - mx, dy: O.by - my }; const base = angCCW(O.x1, O.y1, O.x2, O.y2);
          rotating = true; draw(O);
          const mv = (e) => { const p = pt(e); let ccw = Math.atan2(-(p.y - my), p.x - mx) * 180 / Math.PI; ccw = snapDeg(ccw);
            const rad = ccw * Math.PI / 180, dx = Math.cos(rad) * half, dy = -Math.sin(rad) * half; O.x1 = mx - dx; O.y1 = my - dy; O.x2 = mx + dx; O.y2 = my + dy;
            if (boff) { const dr = (ccw - base) * Math.PI / 180, cs = Math.cos(dr), sn = Math.sin(dr); O.bx = mx + (boff.dx * cs + boff.dy * sn); O.by = my + (-boff.dx * sn + boff.dy * cs); }
            draw(O); };
          const up = () => { rotating = false; draw(O); emitClean(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); });
      }
      function wireRegion(O) {
        const startMove = (evt) => { if (tool !== 'select') return; evt.stopPropagation(); select(O);
          const p0 = pt(evt), o = O.pts.map(p => ({ x: p.x, y: p.y }));
          const mv = (e) => { const p = pt(e), dx = p.x - p0.x, dy = p.y - p0.y; O.pts.forEach((pp, i) => { pp.x = o[i].x + dx; pp.y = o[i].y + dy; }); draw(O); };
          const up = () => { emitClean(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); };
        O.el.poly.addEventListener('pointerdown', startMove);
      }

      // ---- shade placement ----
      let placing = null;
      function startPlacing() { placing = { pts: [], g: svg('g', {}) }; board.appendChild(placing.g); redrawPlacing(); }
      function redrawPlacing() { if (!placing) return; placing.g.innerHTML = '';
        if (placing.pts.length > 2) placing.g.appendChild(svg('polygon', { points: placing.pts.map(p => p.x + ',' + p.y).join(' '), fill: 'rgba(70,130,180,.15)', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
        else if (placing.pts.length > 1) placing.g.appendChild(svg('polyline', { points: placing.pts.map(p => p.x + ',' + p.y).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
        placing.pts.forEach((p, i) => placing.g.appendChild(svg('circle', { r: i === 0 ? 7 : 5, cx: p.x, cy: p.y, fill: 'var(--accent)', stroke: '#fff', 'stroke-width': i === 0 ? 3 : 2 }))); }
      function finishPlacing() { if (!placing) return; const pts = placing.pts.slice(); placing.g.remove(); placing = null; setTool('select'); if (pts.length >= 3) { addRegion(pts); emitClean(); } }

      board.addEventListener('pointerdown', (evt) => { const p = pt(evt);
        if (tool === 'line') { const sp = snapScreen(p.x, p.y); addLineObj(sp.x, sp.y, false); setTool('select'); emitClean(); return; }
        if (tool === 'curve') { const sp = snapScreen(p.x, p.y); addLineObj(sp.x, sp.y, true); setTool('select'); emitClean(); return; }
        if (tool === 'shade') { if (!placing) startPlacing(); const sp = snapScreen(p.x, p.y);
          if (placing.pts.length >= 3) { const f = placing.pts[0]; if (Math.hypot(sp.x - f.x, sp.y - f.y) < 14) { finishPlacing(); return; } }
          placing.pts.push({ x: sp.x, y: sp.y }); redrawPlacing(); return; }
        select(null);
      });
      const keyHandler = (e) => { if (tool === 'shade' && placing) { if (e.key === 'Enter') finishPlacing(); else if (e.key === 'Escape') { placing.pts.pop(); redrawPlacing(); } } };
      window.addEventListener('keydown', keyHandler);

      // ---- description box (below toolbar; shows selected object's description) ----
      const descWrap = Ned.el('div', { style:'display:none;margin-bottom:10px;background:#efeadd;border:1px solid var(--line);border-radius:8px;padding:8px 10px;' });
      const descHead = Ned.el('div', { style:'font-size:12px;color:var(--muted);margin-bottom:6px;' }, ['Description of selected object']);
      let descField;
      if (hasMath()) { descField = document.createElement('math-field'); descField.style.cssText='display:block;width:100%;max-width:520px;font-size:1.05rem;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--paper);'; descField.mathVirtualKeyboardPolicy='manual'; try{descField.menuItems=[];}catch(e){} try{descField.defaultMode='text';}catch(e){} }
      else { descField = document.createElement('input'); descField.type='text'; descField.style.cssText='width:100%;max-width:520px;padding:6px 8px;'; }
      descWrap.append(descHead, descField);
      container.insertBefore(descWrap, wrap);
      let descBound=false;
      function bindDesc(){ if(descBound) return; descBound=true;
        descField.addEventListener('input', ()=>{ if(selected){ selected.label=descField.value; emitClean(); } }); }
      function showDesc(O){
        if(!O){ descWrap.style.display='none'; return; }
        bindDesc();
        descHead.textContent = 'Description of selected ' + (O.kind==='line' ? (O.curved?'curve':'line') : 'region');
        descField.value = O.label || '';
        descWrap.style.display='block';
      }

      // ---- toolbar ----      // ---- toolbar ----
      function tb(label, fn, id) { const b = Ned.el('button', { type: 'button', id: id || '', style: 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font-size:14px;', onclick: fn }, [label]); return b; }
      function setTool(t) { tool = t; [bSel, bLine, bCurve, bShade].forEach(b => b.style.background = 'var(--paper)');
        ({ select: bSel, line: bLine, curve: bCurve, shade: bShade })[t] && (({ select: bSel, line: bLine, curve: bCurve, shade: bShade })[t].style.background = '#eaf1f8');
        note.style.display = (t === 'shade') ? 'block' : 'none'; }
      const bSel = tb('Select / Move', () => setTool('select'));
      const bLine = tb('+ Line', () => setTool('line'));
      const bCurve = tb('+ Curve', () => setTool('curve'));
      const bShade = tb('+ Shade', () => setTool('shade'));
      const bLabel = tb('Describe', () => { if (selected) { descWrap.style.display='block'; descField.focus(); } });
      const bDot = tb('Dotted', () => { if (selected && selected.kind === 'line') { selected.dotted = !selected.dotted; draw(selected); emitClean(); } });
      const bSnap = tb('Snap: ON', function () { snapOn = !snapOn; this.textContent = 'Snap: ' + (snapOn ? 'ON' : 'OFF'); this.style.background = snapOn ? '#e6f4ea' : 'var(--paper)'; });
      bSnap.style.background = '#e6f4ea';
      const bDel = tb('Delete', () => { if (selected) { selected.el.g.remove(); objs = objs.filter(o => o !== selected); select(null); emitClean(); } });
      const bClr = tb('Clear', () => { objs.forEach(o => o.el.g.remove()); objs = []; if (placing) { placing.g.remove(); placing = null; } select(null); emitClean(); });
      toolbar.append(bSel, bLine, bCurve, bShade, bLabel, bDot, bSnap, bDel, bClr);

      // ---- setup screen (choose axes first) then drawing screen ----
      const setupScreen = Ned.el('div', { style:'background:#efeadd;border:1px solid var(--line);border-radius:10px;padding:18px;max-width:520px;' });
      setupScreen.appendChild(Ned.el('div', { style:'font-size:14px;margin-bottom:12px;color:var(--ink);' }, ['Set the axis ranges, then start drawing.']));
      const mkNum = (lab, val) => { const w=Ned.el('label',{style:'display:inline-flex;align-items:center;gap:6px;margin:0 12px 10px 0;font-size:13px;color:var(--muted);'});
        const inp=Ned.el('input',{type:'number',value:String(val),style:'width:72px;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;'});
        w.append(document.createTextNode(lab+' '), inp); return {w, inp}; };
      const fXmin=mkNum('x-min',A0.xmin), fXmax=mkNum('x-max',A0.xmax), fYmin=mkNum('y-min',A0.ymin), fYmax=mkNum('y-max',A0.ymax);
      const rowa=Ned.el('div',{}); rowa.append(fXmin.w, fXmax.w);
      const rowb=Ned.el('div',{}); rowb.append(fYmin.w, fYmax.w);
      const startBtn=Ned.el('button',{type:'button',style:'margin-top:6px;padding:8px 16px;border:none;border-radius:7px;background:var(--accent);color:#fff;cursor:pointer;font-size:14px;'},['Start drawing \u2192']);
      setupScreen.append(rowa, rowb, startBtn);

      // the drawing UI (toolbar + wrap) is built above but not yet shown; hide until setup done
      toolbar.style.display='none'; wrap.style.display='none';
      container.insertBefore(setupScreen, toolbar);

      // small "Edit axes" button shown on the drawing screen
      const editAxesBtn = Ned.el('button',{type:'button',style:'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font-size:14px;'},['\u2190 Edit axes']);
      toolbar.appendChild(editAxesBtn);

      function enterDrawing(a){
        setupScreen.style.display='none';
        toolbar.style.display='flex'; wrap.style.display='block';
        fit(); drawAxes(a);
        setTool('select');
        emitClean();
      }
      startBtn.onclick=()=>{
        const a={ xmin:+fXmin.inp.value, xmax:+fXmax.inp.value, ymin:+fYmin.inp.value, ymax:+fYmax.inp.value };
        if(!(a.xmax>a.xmin) || !(a.ymax>a.ymin)){ alert('max must be greater than min'); return; }
        enterDrawing(a);
      };
      editAxesBtn.onclick=()=>{ setupScreen.style.display='block'; toolbar.style.display='none'; wrap.style.display='none'; };

      // if we already have a saved value, skip setup and go straight to drawing
      requestAnimationFrame(() => {
        if (value && value.objects && value.objects.length) {
          setupScreen.style.display='none'; toolbar.style.display='flex'; wrap.style.display='block';
          fit(); loadValue(value); setTool('select');
        }
      });
      function loadValue(v) {
        const a = v.axes || A0; drawAxes(a);
        (v.objects || []).forEach(o => {
          if (o.type === 'region') { const O = addRegion(o.points.map(p => D2S(p[0], p[1]))); O.label = o.label || ''; draw(O); }
          else { const s1 = D2S(o.p1[0], o.p1[1]), s2 = D2S(o.p2[0], o.p2[1]); const O = addLineObj((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, o.type === 'curve');
            O.x1 = s1.x; O.y1 = s1.y; O.x2 = s2.x; O.y2 = s2.y; O.dotted = !!o.dotted; O.label = o.label || '';
            if (o.type === 'curve' && o.bend) { const b = D2S(o.bend[0], o.bend[1]); O.bx = b.x; O.by = b.y; } draw(O); }
        });
        select(null);
      }
      window.addEventListener('resize', () => { fit(); if (axis) drawAxes({ xmin: axis.xmin, xmax: axis.xmax, ymin: axis.ymin, ymax: axis.ymax }); });

      return {
        update: (v) => { objs.forEach(o => o.el.g.remove()); objs = []; if (v && v.objects) loadValue(v); else drawAxes(A0); },
        clear: () => { objs.forEach(o => o.el.g.remove()); objs = []; select(null); drawAxes(A0); emitClean(); },
        destroy: () => { window.removeEventListener('keydown', keyHandler); container.innerHTML = ''; },
      };
    });
})();