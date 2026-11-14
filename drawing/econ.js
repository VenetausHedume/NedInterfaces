/* Economics diagram — adjust a ready-made demand and supply diagram (nothing is drawn freehand).
   The student (1) shifts a curve left or right, and (2) marks the new equilibrium by picking the right crossing.
   The shifted curve and the new price and quantity lines are labelled automatically (D1, S1, P1, Q1).
   config: { xLabel?, yLabel?, labelling? }   labelling:true = the student must first name the axes and the two lines
   (then also saves labels:{ y, x, down, up })
   Saves { shifts:{ D:'left'|'right', S:'left'|'right' }, equilibrium:'D1S'|'DS1'|'D1S1'|null }, or null when untouched.
   Marked by NedMark 'econ': right curve, right direction, new equilibrium at the right crossing. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const OX = 64, OY = 344, STEP = 72;                    // origin, shift size (px in the drawing)
  const dLine = o => [[110 + o, 80], [430 + o, 320]], sLine = o => [[110 + o, 320], [430 + o, 80]];
  const cross = (d, s) => ({ x: 270 + (d + s) / 2, y: 200 + 0.375 * (s - d) });
  const OFF = { left: -STEP, right: STEP };
  const NAMES = { D1S: 'D1 crosses S', DS1: 'D crosses S1', D1S1: 'D1 crosses S1' };

  Ned.register('econ',
    { name: 'Economics diagram (adjust)', unlocks: 'demand and supply shifts',
      samples: [
        { label: 'Increase in demand',
          question: { text: 'Consumer incomes rise and the good is a normal good. Show the effect on the market and mark the new equilibrium.', marks: 3, config: {} },
          answer: { shifts: { D: 'right' } } },
        { label: 'Rise in costs of production',
          question: { text: 'The cost of raw materials rises. Show the effect on the market and mark the new equilibrium.', marks: 3, config: {} },
          answer: { shifts: { S: 'left' } } },
        { label: 'Indirect tax',
          question: { text: 'The government puts an indirect tax on cigarettes. Show the effect on the market and mark the new equilibrium.', marks: 3, config: {} },
          answer: { shifts: { S: 'left' } } },
        { label: 'Label it yourself, then show the change (4 marks)',
          question: { text: 'The diagram shows a market. Label the axes and the two lines, then show the effect of a fall in the price of a substitute good and mark the new equilibrium.', marks: 4, config: { labelling: true } },
          answer: { shifts: { D: 'left' }, labels: { y: 'Price', x: 'Quantity', down: 'D', up: 'S' } } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      let shifts = Object.assign({}, value && value.shifts), eq = (value && value.equilibrium) || null;
      /* config.labelling: the diagram starts with NO labels and the student names the axes and the two lines first.
         An unlabelled diagram earns nothing in the exam, so this knowledge is tested, not given away. */
      const labelling = !!cfg.labelling;
      let labels = Object.assign({}, value && value.labels);

      const ctl = Ned.el('div', { style: 'display:grid;gap:8px;max-width:560px;margin-bottom:10px;' });
      const board = S('svg', { viewBox: '0 0 560 400', role: 'img' });
      board.style.cssText = 'display:block;width:100%;max-width:560px;height:auto;background:#fffdf7;border:1px solid var(--line);border-radius:10px;';
      const eqRow = Ned.el('div', { style: 'margin-top:10px;max-width:560px;' });
      const eqSel = Ned.el('select', { 'aria-label': 'New equilibrium', style: 'padding:7px 8px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;max-width:100%;' });
      eqSel.addEventListener('change', () => { eq = eqSel.value || null; draw(); emit(); });
      eqRow.appendChild(Ned.labelled('new equilibrium (or click a circle on the diagram)', eqSel));
      const labRow = Ned.el('div', { style: 'display:' + (labelling ? 'flex' : 'none') + ';gap:8px;flex-wrap:wrap;max-width:560px;margin-bottom:10px;' });
      const labSel = {};
      [['y', 'vertical axis', ['Price', 'Quantity', 'Cost', 'Income']], ['x', 'horizontal axis', ['Price', 'Quantity', 'Cost', 'Income']], ['down', 'line sloping down', ['D', 'S']], ['up', 'line sloping up', ['D', 'S']]].forEach(([k, name, opts]) => {
        const sel = Ned.el('select', { 'aria-label': 'Label for the ' + name, 'data-label': k, style: 'padding:6px 7px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;' });
        sel.appendChild(Ned.el('option', { value: '' }, ['choose…']));
        opts.forEach(o => sel.appendChild(Ned.el('option', { value: o }, [o === 'D' ? 'D (demand)' : o === 'S' ? 'S (supply)' : o])));
        sel.addEventListener('change', () => { if (sel.value) labels[k] = sel.value; else delete labels[k]; draw(); emit(); });
        labSel[k] = sel; labRow.appendChild(Ned.labelled(name, sel));
      });
      container.append(labRow, ctl, board, eqRow);

      const btnS = 'padding:7px 11px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font:inherit;font-size:14px;';
      const groups = {};
      [['D', labelling ? 'Line sloping down' : 'Demand'], ['S', labelling ? 'Line sloping up' : 'Supply']].forEach(([k, name]) => {
        const row = Ned.el('div', { role: 'group', 'aria-label': name + ' curve', style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;' }, [Ned.el('span', { style: 'width:' + (labelling ? '9.5rem' : '4.6rem') + ';font-weight:600;' }, [name])]);
        groups[k] = {};
        [['left', '← shift left'], ['', 'no shift'], ['right', 'shift right →']].forEach(([dir, lab]) => {
          const b = Ned.el('button', { type: 'button', 'data-curve': k, 'data-dir': dir || 'none', style: btnS }, [lab]);
          b.addEventListener('click', () => { if (dir) shifts[k] = dir; else delete shifts[k]; if (eq && !candidates().includes(eq)) eq = null; draw(); emit(); });
          groups[k][dir] = b; row.appendChild(b);
        });
        ctl.appendChild(row);
      });
      const candidates = () => { const c = []; if (shifts.D) c.push('D1S'); if (shifts.S) c.push('DS1'); if (shifts.D && shifts.S) c.push('D1S1'); return c; };
      const posOf = key => cross(key.startsWith('D1') ? OFF[shifts.D] : 0, key.endsWith('S1') ? OFF[shifts.S] : 0);

      function draw() {
        const focusKey = document.activeElement && document.activeElement.getAttribute && board.contains(document.activeElement) ? document.activeElement.getAttribute('data-eq') : null;
        for (const k in groups) for (const d in groups[k]) { const on = (shifts[k] || '') === d; const b = groups[k][d]; b.setAttribute('aria-pressed', on); b.style.background = on ? '#eaf1f8' : 'var(--paper)'; b.style.borderColor = on ? 'var(--accent)' : 'var(--line)'; }
        board.innerHTML = '';
        const line = (p, color, w, dash) => board.appendChild(S('line', Object.assign({ x1: p[0][0], y1: p[0][1], x2: p[1][0], y2: p[1][1], stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, dash ? { 'stroke-dasharray': dash } : {})));
        const text = (x, y, s, o) => { const t = S('text', Object.assign({ x, y, 'font-size': 15, fill: '#2b2b2b' }, o || {})); t.textContent = s; board.appendChild(t); };
        line([[OX, 24], [OX, OY]], '#2b2b2b', 2); line([[OX, OY], [540, OY]], '#2b2b2b', 2);
        text(OX - 8, 20, labelling ? (labels.y || '?') : (cfg.yLabel || 'Price'), { 'text-anchor': 'start', 'font-size': 13 }); text(540, OY + 34, labelling ? (labels.x || '?') : (cfg.xLabel || 'Quantity'), { 'text-anchor': 'end', 'font-size': 13 }); text(OX - 14, OY + 16, 'O', { 'font-size': 13 });
        const guide = (pt, pl, ql, color) => { line([[OX, pt.y], [pt.x, pt.y]], color, 1.5, '5 4'); line([[pt.x, pt.y], [pt.x, OY]], color, 1.5, '5 4'); text(OX - 8, pt.y + 5, pl, { 'text-anchor': 'end', fill: color }); text(pt.x, OY + 18, ql, { 'text-anchor': 'middle', fill: color }); };
        const nD = labelling ? (labels.down || '?') : 'D', nS = labelling ? (labels.up || '?') : 'S';
        for (const k in labSel) labSel[k].value = labels[k] || '';
        const e0 = cross(0, 0); guide(e0, labelling ? '' : 'P', labelling ? '' : 'Q', '#6f6757');
        line(dLine(0), '#2b2b2b', 3); text(436, 334, nD); line(sLine(0), '#2b2b2b', 3); text(436, 78, nS);
        if (shifts.D) { const o = OFF[shifts.D]; line(dLine(o), '#4682b4', 3); text(436 + o, 334, nD + '1', { fill: '#2f6694', 'font-weight': 600 }); arrow(190, 140, shifts.D); }
        if (shifts.S) { const o = OFF[shifts.S]; line(sLine(o), '#4682b4', 3); text(436 + o, 78, nS + '1', { fill: '#2f6694', 'font-weight': 600 }); arrow(190, 260, shifts.S); }
        if (eq && candidates().includes(eq)) guide(posOf(eq), labelling ? 'new' : 'P1', labelling ? 'new' : 'Q1', '#2f6694');
        candidates().forEach(key => {
          const p = posOf(key), on = eq === key;
          const c = S('circle', { cx: p.x, cy: p.y, r: 9, fill: on ? '#4682b4' : '#fff', stroke: '#4682b4', 'stroke-width': 2.5, 'data-eq': key, tabindex: 0, role: 'button', 'aria-label': 'Mark new equilibrium where ' + NAMES[key], style: 'cursor:pointer' });
          const pick = () => { eq = eq === key ? null : key; draw(); emit(); };
          c.addEventListener('click', pick); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
          board.appendChild(c);
        });
        board.setAttribute('aria-label', 'Demand and supply diagram.' + (shifts.D ? ' Demand shifted ' + shifts.D + '.' : '') + (shifts.S ? ' Supply shifted ' + shifts.S + '.' : '') + (eq ? ' New equilibrium marked where ' + NAMES[eq] + '.' : ''));
        if (focusKey) { const again = board.querySelector('[data-eq="' + focusKey + '"]'); if (again) again.focus(); }
        eqSel.innerHTML = ''; eqSel.appendChild(Ned.el('option', { value: '' }, [candidates().length ? 'not marked yet' : 'shift a curve first']));
        candidates().forEach(k => eqSel.appendChild(Ned.el('option', { value: k }, [NAMES[k]])));
        eqSel.value = eq || ''; eqSel.disabled = !candidates().length;
        function arrow(x, y, dir) { const s = dir === 'right' ? 1 : -1, x1 = x + (dir === 'right' ? 0 : STEP) + (y > 200 ? 30 : 0), x2 = x1 + s * (STEP - 16);
          board.appendChild(S('path', { d: `M${x1} ${y}H${x2}M${x2 - s * 8} ${y - 6}L${x2} ${y}L${x2 - s * 8} ${y + 6}`, fill: 'none', stroke: '#4682b4', 'stroke-width': 2 })); }
      }
      const emit = () => { const any = Object.keys(shifts).length || eq || (labelling && Object.keys(labels).length); if (!any) return onChange(null); const v = { shifts: Object.assign({}, shifts), equilibrium: eq }; if (labelling) v.labels = Object.assign({}, labels); onChange(v); };
      draw();
      return {
        update: (v) => { shifts = Object.assign({}, v && v.shifts); eq = (v && v.equilibrium) || null; labels = Object.assign({}, v && v.labels); draw(); },
        clear: () => { shifts = {}; eq = null; labels = {}; draw(); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
