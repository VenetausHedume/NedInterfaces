/* Written answers — one box, written in sentences as in the exam (see below). With config.formats the student can
   instead pick a layout (Definition → Why it might → … → Conclusion) and write each part under its heading.
   (Without the shared text field, Ned.field, it falls back to the older list of point boxes.)
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
        { label: 'Economics, choose a layout (8 marks)',
          question: { text: 'Discuss whether an increase in output will increase the profits that firms receive.', marks: 8, config: { formats: [
            { id: 'sides', label: 'Definition → Why it might → Why it might not → Conclusion', sections: [
              { title: 'Definition', hint: 'define the key term in the question', one: true, group: -2 },
              { title: 'Why it might', hint: 'one point per box, then explain it', group: 0 },
              { title: 'Why it might not', hint: 'one point per box, then explain it', group: 1 },
              { title: 'Conclusion', hint: 'your overall judgement and what it depends on', one: true }] }] } },
          answer: { points: [
              { alts: ['higher output may be a response to higher demand', 'more sales'], require: [['demand', 'sales', 'sell']] },
              { alts: ['raise revenue', 'more revenue'], require: ['revenue'] },
              { alts: ['take advantage of economies of scale'], require: ['economies of scale'], reject: ['diseconomies'] },
              { alts: ['price may have to fall to sell the extra output', 'lower price'], require: ['price'] },
              { alts: ['diseconomies of scale'], require: ['diseconomies'] },
              { alts: ['costs may rise by more than revenue'] }],
            groups: [{ title: 'Why it might', max: 5, points: [0, 1, 2] }, { title: 'Why it might not', max: 5, points: [3, 4, 5] }] } },
      ],
    },
    function (container, { question, value, onChange }) {
      /* A written answer is written as the student would in the exam: in sentences, in ONE box. It is marked the way an
         examiner reads a script, statement by statement (NedMark 'prose', format 'full').
         For questions with room for a structure (two sides, advantages / disadvantages, a comparison, an experiment
         plan, "explain two …") the student may instead pick a layout — e.g. Definition → Why it might → Why it might not
         → Conclusion — and write each part in its own box under its heading. config.formats = [{ id, label,
         sections:[{ title, hint?, one?, group? }] }].
         Saves { points:[text], format:'full' }  or, with a layout,  { points:[one per sentence], sec:[section of each],
         sides:[mark-scheme group of each, -1 = any, -2 = definition], format }. */
      const cfg0 = (question && question.config) || {};
      if (Ned.field) {
        let layouts = (cfg0.formats || []).filter(f => f && f.id && f.id !== 'full' && f.sections && f.sections.length);
        if (!layouts.length && cfg0.sides && cfg0.sides.length)      // older keys: two headings, no layout list
          layouts = [{ id: 'sides', label: cfg0.sides.join(' → '), sections: cfg0.sides.map((t, k) => ({ title: t, group: k })) }];
        const formats = [{ id: 'full', label: 'One full answer', sections: [{ title: null }] }].concat(layouts);
        const texts = {};                                  // format id -> one text per section
        const blank = () => formats.forEach(f => { texts[f.id] = f.sections.map(() => ''); });
        const sentences = (t) => String(t).split(/(?<=[.!?])\s+(?=[A-Z0-9"'(“‘])|\n+/).map(x => x.trim()).filter(Boolean);
        let mode = 'full';
        const load = (v) => {
          blank(); mode = 'full';
          const pts = (v && v.points) || [];
          const f = v && v.format && formats.find(x => x.id === v.format);
          if (f && f.id !== 'full') { mode = f.id; pts.forEach((p, i) => { const k = (v.sec || [])[i] || 0; texts[f.id][k] = (texts[f.id][k] ? texts[f.id][k] + ' ' : '') + p; }); }
          else if (v && v.sides && layouts.length && !v.format) { mode = layouts[0].id; pts.forEach((p, i) => { const k = v.sides[i] || 0; if (k in texts[mode]) texts[mode][k] = (texts[mode][k] ? texts[mode][k] + ' ' : '') + p; }); }
          else texts.full[0] = pts.map(p => (/[.!?]\s*$/.test(p) ? p : p + '.')).join(' ').concat(v && v.conclusion ? ' ' + v.conclusion : '').replace(/^\.$/, '');   // answers saved as points before
        };
        load(value);
        const chipsRow = Ned.el('div', { class: 'ned-formats', style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 10px;' });
        const body = Ned.el('div', {});
        if (layouts.length) {
          container.appendChild(Ned.el('div', { style: 'font-size:12px;color:var(--muted);margin-bottom:4px;' }, ['How do you want to write your answer?']));
          container.appendChild(chipsRow);
        }
        container.appendChild(body);
        const emitF = () => {
          if (mode === 'full') { const t = (texts.full[0] || '').trim(); onChange(t ? { points: [t], format: 'full' } : null); return; }
          const f = formats.find(x => x.id === mode), pts = [], sec = [], sides = [];
          f.sections.forEach((s, k) => sentences(texts[f.id][k] || '').forEach(t => { pts.push(t); sec.push(k); sides.push(s.group == null ? -1 : s.group); }));
          onChange(pts.length ? { points: pts, sec, sides, format: f.id } : null);
        };
        const box = (fid, k, title, hint, rows) => {
          const f = Ned.field({ multiline: true, plain: true, label: title || 'Your answer', placeholder: hint || 'Write your answer here, in full sentences, as you would in the exam.',
            value: texts[fid][k], onInput: (val) => { texts[fid][k] = val; emitF(); } });
          f.el.rows = rows; f.el.style.minHeight = (rows * 1.4) + 'rem'; f.el.style.width = '100%';
          return f.el;
        };
        const render = () => {
          chipsRow.innerHTML = '';
          formats.forEach(f => {
            const on = f.id === mode;
            chipsRow.appendChild(Ned.el('button', { type: 'button', 'data-format': f.id, 'aria-pressed': on ? 'true' : 'false',
              style: 'padding:5px 10px;border-radius:999px;cursor:pointer;font-size:13px;border:1px solid ' + (on ? 'var(--ink,#222)' : 'var(--line)') + ';background:' + (on ? 'var(--ink,#222)' : 'var(--paper)') + ';color:' + (on ? '#fff' : 'inherit') + ';',
              onclick: () => switchTo(f.id) }, [f.label]));
          });
          body.innerHTML = '';
          if (mode === 'full') {
            const marks = (question && question.marks) || 2;
            body.appendChild(Ned.el('div', { 'data-section': 'full', style: 'display:grid;gap:6px;margin-bottom:10px;' }, [box('full', 0, null, null, Math.min(14, Math.max(4, marks * 2))),
              Ned.el('p', { class: 'ned-note', style: 'margin:0;' }, ['Marked the way an examiner reads it: each statement is checked against the mark scheme, so make each point and explain it fully.'])]));
            return;
          }
          const f = formats.find(x => x.id === mode);
          f.sections.forEach((s, k) => body.appendChild(Ned.el('div', { 'data-section': s.title, style: 'display:grid;gap:4px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--paper);margin-bottom:10px;' },
            [Ned.el('div', { style: 'font-weight:600;' }, [s.title]), s.hint ? Ned.el('div', { style: 'font-size:12px;color:var(--muted);' }, [String(s.hint).replace(/one point per box, then explain it/, 'make each point, then explain it')]) : null,
              box(f.id, k, s.title, 'Write in full sentences.', s.one ? 2 : 4)].filter(Boolean))));
        };
        const filled = (id) => (texts[id] || []).some(t => t && t.trim());
        function switchTo(id) {
          if (id === mode) return;
          // what was written is carried across, so the latest writing is never left behind in the other layout
          if (filled(mode)) {
            const all = texts[mode].filter(t => t && t.trim()).join(' ');
            if (id === 'full') texts.full[0] = all;
            else { const f = formats.find(x => x.id === id); texts[id][Math.max(0, f.sections.findIndex(s => !s.one))] = all; }
          }
          mode = id; render(); emitF();
        }
        render();
        return {
          update: (v) => { load(v); render(); },
          clear: () => { load(null); render(); emitF(); },
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
