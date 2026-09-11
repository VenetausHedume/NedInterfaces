/* Text box — now a MathLive math field so the math keyboard renders properly.
   Type normally with your system keyboard (spaces work); use the floating math
   widget for x², H₂, √, fractions, ∫, etc. Saves { latex } or null.
   config.multiline : taller field   config.size : "short" | "medium" | "long" */

(function () {
  Ned.register('text',
    {
      name: 'Text box',
      unlocks: '~55–65% of marks',
      samples: [
        { label: 'Recall (single line)',
          question: { text: 'Name the gas produced.', marks: 1,
                      config: { multiline: false, size: 'short' } } },
        { label: 'Formula (single line)',
          question: { text: 'Give the formula of sulfuric acid.', marks: 1,
                      config: { multiline: false, size: 'medium' } } },
        { label: 'Short explanation (multi-line)',
          question: { text: 'Explain why the rate of reaction increases.', marks: 3,
                      config: { multiline: true, size: 'long' } } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};

      // fall back to a plain box if MathLive somehow isn't loaded
      const hasMath = window.customElements && customElements.get('math-field');
      if (!hasMath) {
        const input = cfg.multiline
          ? Ned.el('textarea', { rows: 4, class: 'ned-input', style: 'width:100%;' })
          : Ned.el('input', { type: 'text', class: 'ned-input', style: 'width:20rem;' });
        if (value && (value.latex || value.text)) input.value = value.latex || value.text;
        const emitT = () => { const t = input.value; onChange(t.trim() === '' ? null : { latex: t }); };
        input.addEventListener('input', emitT);
        container.appendChild(input);
        return { update: (v) => { input.value = (v && (v.latex || v.text)) || ''; },
                 clear: () => { input.value = ''; emitT(); }, destroy: () => { container.innerHTML = ''; } };
      }

      const width = { short: '16rem', medium: '28rem', long: '100%' }[cfg.size] || '28rem';
      const mf = document.createElement('math-field');
      mf.style.cssText =
        'display:block;width:' + width + ';max-width:100%;font-size:1.3rem;padding:10px;' +
        'min-height:' + (cfg.multiline ? '5rem' : '2.6rem') + ';' +
        'border:1px solid var(--line);border-radius:6px;background:#fffdf7;';
      mf.mathVirtualKeyboardPolicy = 'manual';           // our widget handles the on-screen keys
      if (value && value.latex) mf.value = value.latex;

      const emit = () => { const l = mf.value.trim(); onChange(l === '' ? null : { latex: l }); };
      mf.addEventListener('input', emit);

      container.appendChild(mf);
      try { mf.inlineShortcuts = {}; } catch (e) {}       // typing "sqrt" stays letters
      try { mf.mathModeSpace = '\\;'; } catch (e) {}       // spacebar works for word answers

      container.appendChild(Ned.el('p', { class: 'ned-note' },
        ['Type with your keyboard; use the floating \u2211 widget for math symbols.']));

      return {
        update:  (v) => { mf.value = (v && v.latex) || ''; },
        clear:   () => { mf.value = ''; emit(); mf.focus(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
