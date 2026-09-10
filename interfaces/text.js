/* Text box — values, terms, short explanations. The workhorse.
   config.multiline : single line vs a few rows
   config.size      : "short" | "medium" | "long"  (box width)
   Stores { text } or null. */

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
      input.addEventListener('input', emit);

      container.appendChild(input);

      return {
        update:  (v) => { input.value = (v && v.text) || ''; },
        clear:   () => { input.value = ''; emit(); input.focus(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})(); 