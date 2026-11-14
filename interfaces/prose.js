/* Structured prose — the SAME text-box field, repeated as an array of points.
   Each point is one MathLive field (identical to the text box): type words,
   use the ∑ widget for math. Add / remove / reorder points. Optional
   conclusion (config.conclusion). Saves { points:[latex...], conclusion } or null.
   Marked by NedMark 'prose': each box can earn one mark-scheme point, each point counts once, and a group
   (e.g. "why it might" / "why it might not") never earns more than its cap. The score is a floor, shown as provisional. */

(function () {

  const hasMath = () => window.customElements && customElements.get('math-field');

  function makeField(initial, onInput) {
    if (hasMath()) {
      const mf = document.createElement('math-field');
      mf.style.cssText =
        'display:block;width:100%;font-size:1.25rem;padding:8px 10px;min-height:2.6rem;' +
        'border:1px solid var(--line);border-radius:6px;background:#fffdf7;';
      mf.mathVirtualKeyboardPolicy = 'manual';
      try { mf.menuItems = []; } catch (e) {}
      try { mf.style.setProperty('--keyboard-toggle-display','none'); } catch (e) {}
      try { mf.inlineShortcuts = {}; } catch (e) {}
      try { mf.mathModeSpace = '\\;'; } catch (e) {}
      if (Ned.plainTyping) Ned.plainTyping(mf);
      if (initial) mf.value = initial;
      mf.addEventListener('input', () => onInput(mf.value));
      return mf;
    }
    const ta = document.createElement('textarea');
    ta.rows = 2; ta.className = 'ned-input'; ta.style.cssText = 'width:100%;resize:vertical;';
    ta.value = initial || '';
    ta.addEventListener('input', () => onInput(ta.value));
    return ta;
  }

  Ned.register('prose',
    {
      name: 'Structured prose',
      unlocks: 'multi-mark written',
      samples: [
        { label: 'Economics, two sides (8 marks)',
          question: { text: 'Discuss whether an increase in output will increase the profits that firms receive.', marks: 8, config: { sides: ['Why it might', 'Why it might not'] } },
          answer: { points: [
              { alts: ['higher output may be a response to higher demand', 'more sales'], require: [['demand', 'sales', 'sell']] },
              { alts: ['raise revenue', 'more revenue'], require: ['revenue'] },
              { alts: ['take advantage of economies of scale'], require: ['economies of scale'], reject: ['diseconomies'] },
              { alts: ['lower average costs', 'average cost falls'], require: ['average'], reject: ['diseconomies'] },
              { alts: ['widen the gap between revenue and cost', 'profit margin rises'] },
              { alts: ['price may have to fall to sell the extra output', 'lower price'], require: ['price'] },
              { alts: ['demand may be inelastic so revenue falls'], require: ['inelastic'] },
              { alts: ['diseconomies of scale'], require: ['diseconomies'] },
              { alts: ['average costs may rise', 'higher average cost'], require: ['average', ['rise', 'higher', 'increase']] },
              { alts: ['costs may rise by more than revenue'] }],
            groups: [{ title: 'Why it might', max: 5, points: [0, 1, 2, 3, 4] }, { title: 'Why it might not', max: 5, points: [5, 6, 7, 8, 9] }] } },
        { label: 'Biology (5 marks)',
          question: { text: 'Describe how bile helps in the digestion of fat. Write each point in its own box.', marks: 4, config: { conclusion: false } },
          answer: { points: [{ alts: ['emulsification', 'emulsifies fat'] }, { alts: ['increases the surface area of fat'], require: ['surface area'] }, { alts: ['faster digestion', 'faster breakdown by enzymes'], require: [['faster', 'quicker', 'speeds']] },
            { alts: ['by lipase'], require: ['lipase'] }, { alts: ['neutralises stomach acid'], require: [['neutralise', 'neutralize', 'neutralises', 'neutralizes']] }] } },
      ],
    },
    function (container, { question, value, onChange }) {
      /* Two-sided answers ("discuss whether…"): the student sorts their own points under each heading.
         Saves { points:[…], sides:[0,0,1,…] } — sides[i] says which heading point i was written under. */
      const cfg0 = (question && question.config) || {};
      if (cfg0.sides && cfg0.sides.length && Ned.field) {
        const sides = cfg0.sides;
        const lists = sides.map(() => []);
        const v0 = value || {};
        (v0.points || []).forEach((p, i) => { const k = (v0.sides || [])[i] || 0; if (lists[k]) lists[k].push(p); });
        const wrap = Ned.el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;max-width:900px;' });
        container.appendChild(wrap);
        const emitS = () => { const pts = [], sd = []; lists.forEach((L, k) => L.forEach(t => { if (t && t.trim()) { pts.push(t); sd.push(k); } })); onChange(pts.length ? { points: pts, sides: sd } : null); };
        const cols = sides.map((title, k) => {
          const body = Ned.el('div', { style: 'display:grid;gap:8px;' });
          const add = Ned.el('button', { type: 'button', class: 'ned-mode', 'data-add': String(k), style: 'margin-top:8px;' }, ['+ Add point']);
          const col = Ned.el('div', { 'data-side': String(k), style: 'flex:1 1 300px;min-width:0;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--paper);' },
            [Ned.el('div', { style: 'font-weight:600;margin-bottom:8px;' }, [title]), body, add]);
          const draw = () => { body.innerHTML = ''; if (!lists[k].length) lists[k].push('');
            lists[k].forEach((t, i) => { const f = Ned.field({ multiline: false, label: title + ', point ' + (i + 1), placeholder: 'one point', value: t, onInput: (val) => { lists[k][i] = val; emitS(); } }); body.appendChild(f.el); }); };
          add.addEventListener('click', () => { lists[k].push(''); draw(); const fs = body.children; if (fs.length) fs[fs.length - 1].focus(); });
          wrap.appendChild(col); draw(); return { draw };
        });
        container.appendChild(Ned.el('p', { class: 'ned-note' }, ['Write one point in each box, under the heading it supports.']));
        return {
          update: (v) => { lists.forEach(L => { L.length = 0; }); ((v && v.points) || []).forEach((p, i) => { const k = ((v && v.sides) || [])[i] || 0; if (lists[k]) lists[k].push(p); }); cols.forEach(c => c.draw()); },
          clear: () => { lists.forEach(L => { L.length = 0; }); cols.forEach(c => c.draw()); emitS(); },
          destroy: () => { container.innerHTML = ''; },
        };
      }
      const cfg = (question && question.config) || {};
      const wantConclusion = !!cfg.conclusion;

      let points = (value && value.points && value.points.length) ? value.points.slice() : [''];
      let conclusion = (value && value.conclusion) || '';

      const list = Ned.el('div', {});
      const concWrap = Ned.el('div', {});

      function emit() {
        const cleaned = points.map(p => (p || '').trim()).filter(p => p !== '');
        const out = {};
        if (cleaned.length) out.points = cleaned;
        const c = (conclusion || '').trim();
        if (wantConclusion && c) out.conclusion = c;
        onChange(Object.keys(out).length ? out : null);
      }

      function render() {
        list.innerHTML = '';
        points.forEach((val, i) => {
          const row = Ned.el('div', { style: 'display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;' });

          const fieldWrap = Ned.el('div', { style: 'flex:1;' });
          fieldWrap.appendChild(makeField(val, (v) => { points[i] = v; emit(); }));

          const ctrls = Ned.el('div', { style: 'flex:0 0 auto;display:flex;flex-direction:column;gap:3px;' });
          const mk = (label, title, fn) => Ned.el('button', { type:'button', title:title,
            style:'width:26px;height:22px;border:1px solid var(--line);border-radius:4px;background:var(--paper);cursor:pointer;font-size:12px;line-height:1;',
            onclick: fn }, [label]);
          ctrls.append(
            mk('\u2191','Move up',   () => { if (i>0){ [points[i-1],points[i]]=[points[i],points[i-1]]; render(); emit(); } }),
            mk('\u2193','Move down', () => { if (i<points.length-1){ [points[i+1],points[i]]=[points[i],points[i+1]]; render(); emit(); } }),
            mk('\u2715','Delete',    () => { points.splice(i,1); if(!points.length) points.push(''); render(); emit(); })
          );

          row.append(fieldWrap, ctrls);
          list.appendChild(row);
        });
      }

      const addBar = Ned.el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px;' });
      const addBtn = (label, fn, disabled) => {
        const b = Ned.el('button', { type:'button',
          style:'padding:5px 10px;border:1px solid var(--line);border-radius:6px;cursor:pointer;' +
                'background:' + (disabled ? '#efeadd' : 'var(--paper)') + ';color:' + (disabled ? 'var(--muted)' : 'inherit') + ';',
          onclick: disabled ? null : fn }, [label]);
        if (disabled) b.disabled = true;
        return b;
      };
      addBar.append(
        addBtn('+ Add point', () => { points.push(''); render(); }),
        addBtn('+ Graph (soon)', null, true),
        addBtn('+ Diagram (soon)', null, true),
      );

      container.appendChild(list);
      container.appendChild(addBar);

      if (wantConclusion) {
        concWrap.appendChild(Ned.el('div', { style:'font-size:12px;color:var(--muted);margin:6px 0 4px;' }, ['Conclusion']));
        const cEd = makeField(conclusion, (v) => { conclusion = v; emit(); });
        concWrap.appendChild(cEd);
        container.appendChild(concWrap);
      }

      render();

      return {
        update: (v) => { points = (v && v.points && v.points.length) ? v.points.slice() : ['']; conclusion = (v && v.conclusion) || ''; render(); },
        clear:  () => { points = ['']; conclusion = ''; render(); emit(); },
        destroy:() => { container.innerHTML = ''; },
      };
    });
})();
