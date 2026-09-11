/* Structured prose — a list of typed BLOCKS (extensible).
   Block types now: text (plain) and math (MathLive, renders LaTeX).
   Designed so graph/diagram/table blocks slot in later via the same add menu.
   Optional conclusion box (config.conclusion). Your system keyboard types text;
   the floating math widget inserts symbols into a focused math block.
   Saves { blocks:[{type,value}], conclusion } or null. */

(function () {

  const hasMath = () => window.customElements && customElements.get('math-field');

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
        ? value.blocks.map(b => ({ type: b.type, value: b.value }))
        : [{ type: 'text', value: '' }];
      let conclusion = (value && value.conclusion) || '';

      const list = Ned.el('div', {});
      const concWrap = Ned.el('div', {});

      function emit() {
        const cleaned = blocks
          .map(b => ({ type: b.type, value: (b.value || '').trim ? b.value.trim() : b.value }))
          .filter(b => b.value !== '' && b.value != null);
        const out = {};
        if (cleaned.length) out.blocks = cleaned;
        const c = (conclusion || '').trim();
        if (wantConclusion && c) out.conclusion = c;
        onChange(Object.keys(out).length ? out : null);
      }

      function makeEditor(block, onInput) {
        if (block.type === 'math' && hasMath()) {
          const mf = document.createElement('math-field');
          mf.style.cssText =
            'display:block;width:100%;font-size:1.25rem;padding:8px 10px;text-align:center;' +
            'border:1px solid var(--line);border-radius:6px;background:#fffdf7;';
          mf.mathVirtualKeyboardPolicy = 'manual';
          try { mf.menuItems = []; } catch (e) {}
          try { mf.style.setProperty('--keyboard-toggle-display','none'); } catch (e) {}
          try { mf.inlineShortcuts = {}; } catch (e) {}
          try { mf.mathModeSpace = '\\;'; } catch (e) {}
          if (block.value) mf.value = block.value;
          mf.addEventListener('input', () => onInput(mf.value));
          return mf;
        }
        const ta = Ned.el('textarea', { rows: 2, class: 'ned-input',
          style: 'width:100%;resize:vertical;' });
        ta.value = block.value || '';
        ta.addEventListener('input', () => onInput(ta.value));
        return ta;
      }

      function render() {
        list.innerHTML = '';
        blocks.forEach((block, i) => {
          const row = Ned.el('div', { style: 'display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;' });

          const tag = Ned.el('span', { style:
            'flex:0 0 auto;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);' +
            'padding:6px 6px 0 0;min-width:2.6rem;' }, [block.type]);

          const editorWrap = Ned.el('div', { style: 'flex:1;' });
          editorWrap.appendChild(makeEditor(block, (v) => { block.value = v; emit(); }));

          const ctrls = Ned.el('div', { style: 'flex:0 0 auto;display:flex;flex-direction:column;gap:3px;' });
          const mk = (label, title, fn) => Ned.el('button', { type:'button', title:title,
            style:'width:26px;height:22px;border:1px solid var(--line);border-radius:4px;background:var(--paper);cursor:pointer;font-size:12px;line-height:1;',
            onclick: fn }, [label]);
          ctrls.append(
            mk('\u2191','Move up',   () => { if (i>0){ [blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]]; render(); emit(); } }),
            mk('\u2193','Move down', () => { if (i<blocks.length-1){ [blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]]; render(); emit(); } }),
            mk('\u2715','Delete',    () => { blocks.splice(i,1); if(!blocks.length) blocks.push({type:'text',value:''}); render(); emit(); })
          );

          row.append(tag, editorWrap, ctrls);
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
        addBtn('+ Text', () => { blocks.push({ type:'text', value:'' }); render(); }),
        addBtn('+ Math', () => { blocks.push({ type:'math', value:'' }); render(); }),
        addBtn('+ Graph (soon)', null, true),
        addBtn('+ Diagram (soon)', null, true),
      );

      container.appendChild(list);
      container.appendChild(addBar);

      if (wantConclusion) {
        concWrap.appendChild(Ned.el('div', { style:'font-size:12px;color:var(--muted);margin:6px 0 4px;' },
          ['Conclusion']));
        const cta = Ned.el('textarea', { rows: 2, class:'ned-input', style:'width:100%;resize:vertical;' });
        cta.value = conclusion;
        cta.addEventListener('input', () => { conclusion = cta.value; emit(); });
        concWrap.appendChild(cta);
        container.appendChild(concWrap);
      }

      render();

      return {
        update: (v) => {
          blocks = (v && v.blocks && v.blocks.length) ? v.blocks.map(b=>({type:b.type,value:b.value})) : [{type:'text',value:''}];
          conclusion = (v && v.conclusion) || '';
          render();
        },
        clear: () => { blocks = [{ type:'text', value:'' }]; conclusion=''; render();
                       const cta = concWrap.querySelector('textarea'); if (cta) cta.value=''; emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
