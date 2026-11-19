/* Fill the gaps — a passage or an algorithm with blanks to complete.
   config.text    : the passage; each blank is written {{0}}, {{1}}, … (new lines are kept)
   config.code    : true = show it as code (monospace, lines kept as they are)
   config.options : optional word list ("use terms from the list"): each blank becomes a drop-down
   Saves { blanks: { "0": "…", "1": "…" } } or null.
   Marked by NedMark 'cloze': each blank like a short answer (answer: { blanks:{ "0": spec, … }, scale? }). */
(function () {
  Ned.register('cloze',
    {
      name: 'Fill the gaps',
      unlocks: 'complete the algorithm, complete the description',
      samples: [
        { label: 'Complete the algorithm',
          question: { text: 'Complete the bubble sort.', marks: 3, config: { code: true,
            text: 'Last ← {{0}}\nREPEAT\n  Swap ← {{1}}\n  FOR {{2}} ← 1 TO Last - 1\n    IF Names[Index] > Names[Index + 1]\n      THEN\n        Temp ← Names[Index]\n        Names[Index] ← Names[Index + 1]\n        Names[Index + 1] ← Temp\n        Swap ← TRUE\n    ENDIF\n  NEXT Index\nUNTIL NOT Swap' } },
          answer: { blanks: { 0: '50', 1: 'FALSE', 2: 'Index' } } },
        { label: 'Use terms from the list',
          question: { text: 'Complete the description.', marks: 2, config: {
            text: 'A hard disk has several {{0}}. Each one is split into tracks and {{1}}.', options: ['platters', 'sectors', 'pages', 'cells'] } },
          answer: { blanks: { 0: { alts: ['platters'], exact: true }, 1: { alts: ['sectors'], exact: true } } } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const text = String(cfg.text || '');
      let got = Object.assign({}, (value && value.blanks) || {});
      const fields = {};
      const box = Ned.el('div', { class: 'ned-cloze' + (cfg.code ? ' ned-cloze-code' : ''),
        style: cfg.code ? 'font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.95rem;line-height:2.1;white-space:pre-wrap;overflow-x:auto;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);'
                        : 'line-height:2.2;max-width:720px;' });
      function emit() {
        const out = {}; Object.keys(got).forEach(k => { if (String(got[k] || '').trim()) out[k] = got[k]; });
        onChange(Object.keys(out).length ? { blanks: out } : null);
      }
      text.split(/(\{\{\d+\}\})/).forEach(part => {
        const m = part.match(/^\{\{(\d+)\}\}$/);
        if (!m) { box.appendChild(document.createTextNode(part)); return; }
        const id = m[1];
        let f;
        if (cfg.options && cfg.options.length) {
          f = Ned.el('select', { 'aria-label': 'Gap ' + (+id + 1), 'data-blank': id, style: 'font:inherit;padding:2px 6px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:inherit;' },
            [Ned.el('option', { value: '' }, ['choose…'])].concat(cfg.options.map(o => Ned.el('option', { value: o }, [o]))));
          f.value = got[id] || '';
          f.addEventListener('change', () => { got[id] = f.value; emit(); });
        } else {
          f = Ned.el('input', { type: 'text', 'aria-label': 'Gap ' + (+id + 1), 'data-blank': id, autocomplete: 'off', spellcheck: 'false',
            style: 'font:inherit;width:' + Math.max(6, Math.min(30, +(cfg.widths && cfg.widths[id]) || 10)) + 'ch;padding:1px 6px;border:none;border-bottom:2px solid var(--accent);background:transparent;color:inherit;' });
          f.value = got[id] || '';
          f.addEventListener('input', () => { got[id] = f.value; emit(); });
        }
        fields[id] = f; box.appendChild(f);
      });
      container.appendChild(box);
      return {
        update(v) { got = Object.assign({}, (v && v.blanks) || {}); Object.keys(fields).forEach(k => { fields[k].value = got[k] || ''; }); },
        clear() { got = {}; Object.keys(fields).forEach(k => { fields[k].value = ''; }); onChange(null); },
        destroy() { container.innerHTML = ''; },
      };
    });
})();
