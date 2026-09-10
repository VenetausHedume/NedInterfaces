/* Text box — the workhorse: values, terms, short explanations.
   config.multiline : single line vs a few rows
   config.size      : "short" | "medium" | "long"  (box width)
   Symbol bar for chemistry: subscripts, superscripts, arrows.
   Stores exactly what's typed (marker normalises H2SO4 -> H₂SO₄).
   Saves { text } or null. */

(function () {

  const SYMBOLS = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉',
                   '⁺','⁻','²','³','→','⇌','°','·','½','·'];

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
      const width = { short: '9rem', medium: '20rem', long: '100%' }[cfg.size] || '20rem';

      const input = cfg.multiline
        ? Ned.el('textarea', { rows: 4, style: `width:${width};` })
        : Ned.el('input', { type: 'text', style: `width:${width};` });
      input.className = 'ned-input';
      if (value && value.text != null) input.value = value.text;

      const emit = () => {
        const t = input.value;
        onChange(t.trim() === '' ? null : { text: t });
      };

      const insert = (s) => {
        const start = input.selectionStart ?? input.value.length;
        const end   = input.selectionEnd ?? input.value.length;
        input.value = input.value.slice(0, start) + s + input.value.slice(end);
        const pos = start + s.length;
        input.focus();
        try { input.setSelectionRange(pos, pos); } catch (e) {}
        emit();
      };

      const bar = Ned.el('div', { class: 'ned-symbolbar' },
        SYMBOLS.map(s => Ned.el('button', { type: 'button', onclick: () => insert(s) }, [s])));

      input.addEventListener('input', emit);

      container.appendChild(bar);
      container.appendChild(input);

      return {
        update:  (v) => { input.value = (v && v.text) || ''; },
        clear:   () => { input.value = ''; emit(); input.focus(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });

})();
