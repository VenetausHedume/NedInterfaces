/* Structured prose — plain-text blocks with INLINE math chips.
   A block is normal text (system keyboard, words stay words). The "fx" button
   drops a math chip at the cursor: a small MathLive field the ∑ widget drives,
   rendering real math inline. No mode-fighting, clean saved data.
   Block value = ordered parts: strings (text) and { math:"<latex>" } chips.
   Saves { blocks:[{ type:"rich", parts:[...] }], conclusion } or null.
   graph/diagram slot in later as their own block types. */

(function () {

  const hasMath = () => window.customElements && customElements.get('math-field');

  function mathChip(latex, onChange) {
    const mf = document.createElement('math-field');
    mf.style.cssText =
      'display:inline-block;vertical-align:middle;min-width:2.2rem;margin:0 3px;padding:1px 5px;' +
      'border:1px solid #bcd2e6;border-radius:5px;background:#eef4fa;font-size:1.05em;';
    mf.mathVirtualKeyboardPolicy = 'manual';
    try { mf.menuItems = []; } catch (e) {}
    try { mf.style.setProperty('--keyboard-toggle-display','none'); } catch (e) {}
    try { mf.inlineShortcuts = {}; } catch (e) {}
    if (latex) mf.value = latex;
    mf.addEventListener('input', () => onChange(mf.value));
    return mf;
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

      function normalize(v) {
        if (v && v.blocks && v.blocks.length) {
          return v.blocks.map(b => ({ parts: (b.parts && b.parts.length) ? b.parts.slice() : [''] }));
        }
        return [{ parts: [''] }];
      }
      let blocks = normalize(value);
      let conclusion = (value && value.conclusion) || '';

      const list = Ned.el('div', {});
      const concWrap = Ned.el('div', {});

      function cleanParts(parts) {
        const out = [];
        parts.forEach(p => {
          if (typeof p === 'string') { if (p.trim() !== '') out.push(p); }
          else if (p && p.math && p.math.trim() !== '') out.push({ math: p.math });
        });
        return out;
      }
      function emit() {
        const cleaned = blocks
          .map(b => ({ type: 'rich', parts: cleanParts(b.parts) }))
          .filter(b => b.parts.length);
        const out = {};
        if (cleaned.length) out.blocks = cleaned;
        const c = (conclusion || '').trim();
        if (wantConclusion && c) out.conclusion = c;
        onChange(Object.keys(out).length ? out : null);
      }

      function renderBlock(block, host) {
        host.innerHTML = '';
        host.style.cssText = 'flex:1;border:1px solid var(--line);border-radius:6px;background:#fffdf7;' +
          'padding:6px 8px;min-height:2.4rem;display:flex;flex-wrap:wrap;align-items:center;gap:2px;';

        block.parts.forEach((part, idx) => {
          if (typeof part === 'string') {
            const ta = document.createElement('textarea');
            ta.rows = 1; ta.value = part;
            ta.style.cssText = 'border:none;outline:none;resize:none;background:transparent;font:inherit;' +
              'min-width:3rem;flex:1 1 6rem;overflow:hidden;';
            const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
            ta.addEventListener('input', () => { block.parts[idx] = ta.value; grow(); emit(); });
            setTimeout(grow, 0);
            host.appendChild(ta);
          } else {
            const chip = mathChip(part.math, (v) => { block.parts[idx].math = v; emit(); });
            host.appendChild(chip);
          }
        });
      }

      function render() {
        list.innerHTML = '';
        blocks.forEach((block, i) => {
          const row = Ned.el('div', { style: 'display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;' });
          const host = document.createElement('div');
          renderBlock(block, host);

          const ctrls = Ned.el('div', { style: 'flex:0 0 auto;display:flex;flex-direction:column;gap:3px;' });
          const mk = (label, title, fn) => Ned.el('button', { type:'button', title:title,
            style:'width:30px;height:24px;border:1px solid var(--line);border-radius:4px;background:var(--paper);cursor:pointer;font-size:12px;line-height:1;',
            onclick: fn }, [label]);
          ctrls.append(
            mk('fx','Insert math here', () => {
              block.parts.push({ math: '' }, '');
              render();
              const chips = host.querySelectorAll('math-field');
              const last = chips[chips.length - 1];
              if (last) last.focus();
              emit();
            }),
            mk('\u2191','Move up',   () => { if (i>0){ [blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]]; render(); emit(); } }),
            mk('\u2193','Move down', () => { if (i<blocks.length-1){ [blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]]; render(); emit(); } }),
            mk('\u2715','Delete',    () => { blocks.splice(i,1); if(!blocks.length) blocks.push({parts:['']}); render(); emit(); })
          );

          row.append(host, ctrls);
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
        addBtn('+ Add block', () => { blocks.push({ parts: [''] }); render(); }),
        addBtn('+ Graph (soon)', null, true),
        addBtn('+ Diagram (soon)', null, true),
      );

      container.appendChild(list);
      container.appendChild(addBar);

      if (wantConclusion) {
        concWrap.appendChild(Ned.el('div', { style:'font-size:12px;color:var(--muted);margin:6px 0 4px;' }, ['Conclusion']));
        const cta = Ned.el('textarea', { rows: 2, class:'ned-input', style:'width:100%;resize:vertical;' });
        cta.value = conclusion;
        cta.addEventListener('input', () => { conclusion = cta.value; emit(); });
        concWrap.appendChild(cta);
        container.appendChild(concWrap);
      }

      render();

      return {
        update: (v) => { blocks = normalize(v); conclusion = (v && v.conclusion) || ''; render();
                         const cta = concWrap.querySelector('textarea'); if (cta) cta.value = conclusion; },
        clear:  () => { blocks = [{ parts: [''] }]; conclusion=''; render();
                        const cta = concWrap.querySelector('textarea'); if (cta) cta.value=''; emit(); },
        destroy:() => { container.innerHTML = ''; },
      };
    });
})();
