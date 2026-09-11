/* Structured prose — the SAME text-box field, repeated as an array of points.
   Each point is one MathLive field (identical to the text box): type words,
   use the ∑ widget for math. Add / remove / reorder points. Optional
   conclusion (config.conclusion). Saves { points:[latex...], conclusion } or null. */

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
        { label: 'Explain (6 marks)',
          question: { text: 'Explain how the kinetic energy of the ball changes as it falls.',
                      marks: 6, config: { conclusion: true } } },
        { label: 'Short explain (3 marks)',
          question: { text: 'Explain why the rate of reaction increases with temperature.',
                      marks: 3, config: { conclusion: false } } },
      ],
    },
    function (container, { question, value, onChange }) {
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
