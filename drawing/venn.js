/* Venn diagram — shade a region (A ∩ B′, (A ∪ B)′ …) or write the number in each region.
   config.sets  : ['A', 'B'] or ['A', 'B', 'C']          (Core: two sets; Extended: up to three)
   config.mode  : 'shade' (default) — click regions to shade or unshade them
                  'count' — a box in each region for a number (or the elements)
   Region names: the sets the region is inside, e.g. 'A', 'AB', 'ABC'; 'none' = inside the rectangle only.
   Saves { shaded:['A','AB'] } or { counts:{ A:'5', AB:'3', … } }, or null.
   Marked by NedMark 'venn': shaded regions must match exactly (with 2+ marks, one region out earns marks − 1);
   counts are marked box by box. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const LAYOUT = {
    2: { W: 580, H: 330, c: [[230, 170, 112], [350, 170, 112]], lab: { A: [168, 172], AB: [290, 172], B: [412, 172], none: [44, 300] } },
    3: { W: 580, H: 390, c: [[238, 150, 100], [342, 150, 100], [290, 240, 100]],
      lab: { A: [196, 118], B: [384, 118], C: [290, 298], AB: [290, 106], AC: [228, 222], BC: [352, 222], ABC: [290, 180], none: [44, 360] } },
  };
  let uid = 0;
  Ned.register('venn',
    { name: 'Venn diagram', unlocks: 'sets: shading regions, numbers in regions',
      samples: [
        { label: "Shade A ∩ B′ (1 mark)", question: { text: "Shade the region A ∩ B′.", marks: 1, config: { sets: ['A', 'B'] } }, answer: { shaded: ['A'] } },
        { label: "Shade (A ∪ B)′ ∪ C (2 marks)", question: { text: "Shade the region (A ∪ B)′ ∪ C.", marks: 2, config: { sets: ['A', 'B', 'C'] } }, answer: { shaded: ['none', 'C', 'AC', 'BC', 'ABC'] } },
        { label: 'Numbers in regions (3 marks)', question: { text: '30 students: 18 study French (F), 15 study Spanish (S), 7 study both. Complete the Venn diagram.', marks: 3, config: { sets: ['F', 'S'], mode: 'count' } },
          answer: { counts: { A: 11, AB: 7, B: 8, none: 4 } } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const names = cfg.sets || ['A', 'B'], n = names.length === 3 ? 3 : 2, L = LAYOUT[n], count = cfg.mode === 'count';
      const keys = Object.keys(L.lab);                                     // region ids use A/B/C for the first, second, third set
      const id = 'nv' + (++uid);
      let shaded = new Set(), counts = {};
      const svg = S('svg', { viewBox: `0 0 ${L.W} ${L.H}`, role: 'application', 'aria-label': count ? 'Venn diagram with a box in each region' : 'Venn diagram. Click a region to shade it.' });
      svg.style.cssText = 'display:block;width:100%;max-width:' + L.W + 'px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;';
      const wrap = Ned.el('div', { style: 'position:relative;max-width:' + L.W + 'px;' }, [svg]);
      const status = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.append(wrap, status);
      const defs = S('defs', {}); svg.appendChild(defs);
      L.c.forEach((c, i) => { const cp = S('clipPath', { id: `${id}c${i}` }); cp.appendChild(S('circle', { cx: c[0], cy: c[1], r: c[2] })); defs.appendChild(cp);
        const m = S('mask', { id: `${id}m${i}` }); m.appendChild(S('rect', { x: 0, y: 0, width: L.W, height: L.H, fill: '#fff' })); m.appendChild(S('circle', { cx: c[0], cy: c[1], r: c[2], fill: '#000' })); defs.appendChild(m); });
      const gFill = S('g', {}), gLines = S('g', {}); svg.append(gFill, gLines);
      const frame = { x: 12, y: 12, w: L.W - 24, h: L.H - 24 };
      gLines.appendChild(S('rect', { x: frame.x, y: frame.y, width: frame.w, height: frame.h, fill: 'none', stroke: '#2b2b2b', 'stroke-width': 2 }));
      gLines.appendChild(Object.assign(S('text', { x: frame.x + 10, y: frame.y + 22, 'font-size': 18, 'font-style': 'italic', fill: '#2b2b2b' }), { textContent: 'ℰ' }));
      L.c.forEach((c, i) => { gLines.appendChild(S('circle', { cx: c[0], cy: c[1], r: c[2], fill: 'none', stroke: '#2b2b2b', 'stroke-width': 2 }));
        const ang = n === 2 ? (i ? -0.6 : -2.55) : [-2.4, -0.75, 1.57][i];
        gLines.appendChild(Object.assign(S('text', { x: c[0] + Math.cos(ang) * (c[2] + 16), y: c[1] + Math.sin(ang) * (c[2] + 16) + 6, 'text-anchor': 'middle', 'font-size': 18, 'font-style': 'italic', fill: '#2b2b2b' }), { textContent: names[i] })); });
      const letters = ['A', 'B', 'C'].slice(0, n);
      function regionAt(x, y) {
        if (x < frame.x || y < frame.y || x > frame.x + frame.w || y > frame.y + frame.h) return null;
        const r = letters.filter((_, i) => Math.hypot(x - L.c[i][0], y - L.c[i][1]) <= L.c[i][2]).join('');
        return r || 'none';
      }
      function regionShape(r) {          // the region as nested clips (inside) and masks (outside)
        let node = S('rect', { x: frame.x, y: frame.y, width: frame.w, height: frame.h, fill: '#4682b4', 'fill-opacity': 0.35 });
        letters.forEach((l, i) => { if (r === 'none' || !r.includes(l)) { const g = S('g', { mask: `url(#${id}m${i})` }); g.appendChild(node); node = g; } });
        letters.forEach((l, i) => { if (r !== 'none' && r.includes(l)) { const g = S('g', { 'clip-path': `url(#${id}c${i})` }); g.appendChild(node); node = g; } });
        node.setAttribute('data-region', r); return node;
      }
      const boxes = {};
      if (count) keys.forEach(k => { const p = L.lab[k]; const inp = Ned.el('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'Region ' + regionName(k), 'data-region': k,
        style: `position:absolute;left:${(p[0] / L.W * 100).toFixed(2)}%;top:${(p[1] / L.H * 100).toFixed(2)}%;transform:translate(-50%,-50%);width:3.4rem;padding:4px;border:1px solid var(--line);border-radius:5px;background:#fff;font:inherit;text-align:center;` });
        inp.addEventListener('input', () => { const t = inp.value.trim(); if (t) counts[k] = t; else delete counts[k]; emit(); });
        boxes[k] = inp; wrap.appendChild(inp); });
      function regionName(k) {
        if (k === 'none') return 'outside every set';
        const inn = letters.map((l, i) => (k.includes(l) ? names[i] : null)).filter(Boolean), out = letters.map((l, i) => (!k.includes(l) ? names[i] + '′' : null)).filter(Boolean);
        return inn.concat(out).join(' ∩ ');
      }
      function paint() {
        gFill.innerHTML = '';
        shaded.forEach(r => gFill.appendChild(regionShape(r)));
        status.textContent = count ? 'Type the number for each region.' : shaded.size ? 'Shaded: ' + [...shaded].map(regionName).join('; ') + '.' : 'Click a region to shade it. Click again to unshade.';
      }
      function emit() {
        if (count) return onChange(Object.keys(counts).length ? { counts: Object.assign({}, counts) } : null);
        onChange(shaded.size ? { shaded: [...shaded].sort() } : null);
      }
      if (!count) svg.addEventListener('click', evt => {
        const r = svg.getBoundingClientRect(), x = (evt.clientX - r.left) * L.W / r.width, y = (evt.clientY - r.top) * L.H / r.height;
        const k = regionAt(x, y); if (!k) return;
        if (shaded.has(k)) shaded.delete(k); else shaded.add(k);
        paint(); emit();
      });
      function load(v) { shaded = new Set((v && v.shaded) || []); counts = Object.assign({}, v && v.counts); Object.keys(boxes).forEach(k => { boxes[k].value = counts[k] != null ? String(counts[k]) : ''; }); paint(); }
      load(value);
      container.__nedVenn = { screen: k => { const p = L.lab[k], r = svg.getBoundingClientRect(); return { x: r.left + p[0] * r.width / L.W, y: r.top + p[1] * r.height / L.H }; } };
      return { update: v => load(v), clear: () => { load(null); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
