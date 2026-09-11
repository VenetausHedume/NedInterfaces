/* Structured prose — many "text boxes" (mixed prose + inline math) as blocks,
   plus buttons to attach a graph/diagram later. Each block is one MathLive
   field in TEXT mode by default: type words normally, drop in math with the
   floating widget. Optional conclusion (config.conclusion).
   Saves { blocks:[{type,value}], conclusion } or null.
   Block types: "rich" (prose+math). graph/diagram slot in later. */

(function () {

  const hasMath = () => window.customElements && customElements.get('math-field');

  function makeRichEditor(initial, onInput) {
    if (hasMath()) {
      const mf = document.createElement('math-field');
      mf.style.cssText =
        'display:block;width:100%;font-size:1.2rem;padding:8px 10px;min-height:2.6rem;' +
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

      let blocks = (value && value.blocks && value.blocks.length)
        ? value.blocks.map(b => ({ type: b.type || 'rich', value: b.value }))
        : [{ type: 'rich', value: '' }];
      let conclusion = (value && value.conclusion) || '';

      const list = Ned.el('div', {});
      const concWrap = Ned.el('div', {});

      function emit() {
        const cleaned = blocks
          .map(b => ({ type: b.type, value: typeof b.value === 'string' ? b.value.trim() : b.value }))
          .filter(b => b.value !== '' && b.value != null);
        const out = {};
        if (cleaned.length) out.blocks = cleaned;
        const c = (conclusion || '').trim();
        if (wantConclusion && c) out.conclusion = c;
        onChange(Object.keys(out).length ? out : null);
      }

      function render() {
        list.innerHTML = '';
        blocks.forEach((block, i) => {
          const row = Ned.el('div', { style: 'display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;' });

          const editorWrap = Ned.el('div', { style: 'flex:1;' });
          editorWrap.appendChild(makeRichEditor(block.value, (v) => { block.value = v; emit(); }));

          const ctrls = Ned.el('div', { style: 'flex:0 0 auto;display:flex;flex-direction:column;gap:3px;' });
          const mk = (label, title, fn) => Ned.el('button', { type:'button', title:title,
            style:'width:26px;height:22px;border:1px solid var(--line);border-radius:4px;background:var(--paper);cursor:pointer;font-size:12px;line-height:1;',
            onclick: fn }, [label]);
          ctrls.append(
            mk('\u2191','Move up',   () => { if (i>0){ [blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]]; render(); emit(); } }),
            mk('\u2193','Move down', () => { if (i<blocks.length-1){ [blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]]; render(); emit(); } }),
            mk('\u2715','Delete',    () => { blocks.splice(i,1); if(!blocks.length) blocks.push({type:'rich',value:''}); render(); emit(); })
          );

          row.append(editorWrap, ctrls);
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
        addBtn('+ Add block', () => { blocks.push({ type:'rich', value:'' }); render(); }),
        addBtn('+ Graph (soon)', null, true),
        addBtn('+ Diagram (soon)', null, true),
      );

      container.appendChild(list);
      container.appendChild(addBar);

      if (wantConclusion) {
        concWrap.appendChild(Ned.el('div', { style:'font-size:12px;color:var(--muted);margin:6px 0 4px;' }, ['Conclusion']));
        const cEd = makeRichEditor(conclusion, (v) => { conclusion = v; emit(); });
        concWrap.appendChild(cEd);
        container.appendChild(concWrap);
      }

      render();

      return {
        update: (v) => {
          blocks = (v && v.blocks && v.blocks.length) ? v.blocks.map(b=>({type:b.type||'rich',value:b.value})) : [{type:'rich',value:''}];
          conclusion = (v && v.conclusion) || '';
          render();
        },
        clear: () => { blocks = [{ type:'rich', value:'' }]; conclusion=''; render(); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
