/* Text box — now a MathLive math field so the math keyboard renders properly.
   Type normally with your system keyboard (spaces work); use the floating math
   widget for x², H₂, √, fractions, ∫, etc. Saves { latex } or null.
   config.multiline : taller field   config.size : "short" | "medium" | "long"
   Marked by NedMark 'text': keyword match against the mark scheme's points (with their alternatives). */

(function () {
  Ned.register('text',
    {
      name: 'Text box',
      unlocks: '~55–65% of marks',
      samples: [
        { label: 'Recall (1 mark)',
          question: { text: 'Name the fraction with the smallest molecules.', marks: 1, config: { multiline: false, size: 'medium' } },
          answer: { points: [{ alts: ['refinery gas'] }], need: 1 } },
        { label: 'One of a list (1 mark)',
          question: { text: 'Give one example of a change of state which does not involve boiling or evaporation.', marks: 1, config: { multiline: false, size: 'medium' } },
          answer: { points: [{ alts: ['condensation', 'freezing', 'solidification', 'melting', 'sublimation'] }], need: 1 } },
        { label: 'Two points (2 marks)',
          question: { text: 'State two ways in which evaporation is different from boiling.', marks: 2, config: { multiline: true, size: 'long' } },
          answer: { points: [{ alts: ['evaporation takes place at any temperature', 'boiling occurs at a fixed temperature'] }, { alts: ['evaporation takes place at the surface', 'boiling occurs throughout the liquid'] },
            { alts: ['no bubbles in evaporation', 'bubbles in boiling'], require: ['bubbles'] }], need: 2 } },
        { label: 'Formula (1 mark)',
          question: { text: 'Give the formula of sulfuric acid.', marks: 1, config: { multiline: false, size: 'medium' } },
          answer: { points: [{ alts: ['H2SO4'] }], need: 1 } },
        { label: 'Symbol equation with state symbols (3 marks)',
          question: { text: 'Write the balanced symbol equation, with state symbols, for the reaction of zinc with dilute hydrochloric acid.', marks: 3, config: { multiline: false, size: 'long' } },
          answer: { equation: 'Zn(s) + 2HCl(aq) → ZnCl2(aq) + H2(g)', states: true } },
        { label: 'Ionic half-equation (1 mark)',
          question: { text: 'Write the ionic half-equation for the reaction at the cathode when copper is deposited.', marks: 1, config: { multiline: false, size: 'medium' } },
          answer: { equation: 'Cu2+ + 2e- → Cu' } },
        { label: 'Word equation (2 marks)',
          question: { text: 'Write the word equation for aerobic respiration.', marks: 2, config: { multiline: false, size: 'long' } },
          answer: { equation: 'glucose + oxygen → carbon dioxide + water' } },
        { label: 'Logic expression (2 marks)',
          question: { text: 'Write the logic expression for: the alarm X sounds if the door A is open and the system B is on, or if the panic button C is pressed.', marks: 2, config: { multiline: false, size: 'long' } },
          answer: { logic: '(A AND B) OR C' } },
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
      try { mf.menuItems = []; } catch (e) {}               // remove the built-in ≡ menu
      try { mf.style.setProperty('--keyboard-toggle-display','none'); } catch (e) {}
      if (value && value.latex) mf.value = value.latex;

      const emit = () => { const l = mf.value.trim(); onChange(l === '' ? null : { latex: l }); };
      mf.addEventListener('input', emit);

      container.appendChild(mf);
      if (Ned.plainTyping) Ned.plainTyping(mf);
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
