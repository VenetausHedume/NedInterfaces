/* Match list — replaces "draw a line between each … and its …".
   config.left  : [{ id, text, svg?, image? }]     the things to be matched
   config.right : [{ id, text }]                   the choices
   config.once  : true = each choice can be used only once (default true)
   Saves { pairs: { leftId: rightId } } with only the filled rows, or null.
   Marked by NedMark 'match': one per correct pair, through a scale if the mark scheme has one. */
(function () {
  const gate = (d) => '<svg viewBox="0 0 64 36" width="64" height="36" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  Ned.register('match',
    {
      name: 'Match list',
      unlocks: 'join-with-lines questions',
      samples: [
        { label: 'Logic gate symbols',
          question: { text: 'Match each logic gate symbol to its name.', marks: 4, config: {
            left: [
              { id: 'g1', text: 'Symbol 1', svg: gate('<path d="M14 6H30A12 12 0 0 1 30 30H14Z"/><path d="M4 12H14M4 24H14M42 18H58"/>') },
              { id: 'g2', text: 'Symbol 2', svg: gate('<path d="M12 6Q22 18 12 30Q36 29 46 18Q36 7 12 6Z"/><path d="M4 12H16M4 24H16M46 18H60"/>') },
              { id: 'g3', text: 'Symbol 3', svg: gate('<path d="M14 6L38 18L14 30Z"/><circle cx="42" cy="18" r="4"/><path d="M4 18H14M46 18H60"/>') },
              { id: 'g4', text: 'Symbol 4', svg: gate('<path d="M14 6H28A12 12 0 0 1 28 30H14Z"/><circle cx="44" cy="18" r="4"/><path d="M4 12H14M4 24H14M48 18H60"/>') },
              { id: 'g5', text: 'Symbol 5', svg: gate('<path d="M12 6Q22 18 12 30Q34 29 42 18Q34 7 12 6Z"/><circle cx="46" cy="18" r="4"/><path d="M4 12H16M4 24H16M50 18H60"/>') }],
            right: [{ id: 'AND', text: 'AND' }, { id: 'OR', text: 'OR' }, { id: 'NOT', text: 'NOT' }, { id: 'NAND', text: 'NAND' }, { id: 'NOR', text: 'NOR' }] } },
          answer: { pairs: { g1: 'AND', g2: 'OR', g3: 'NOT', g4: 'NAND', g5: 'NOR' }, scale: { 5: 4, 4: 3, 3: 2, 2: 1 } } },
        { label: 'Terms and definitions',
          question: { text: 'Match each term to its meaning.', marks: 3, config: {
            left: [{ id: 'a', text: 'Evaporation' }, { id: 'b', text: 'Condensation' }, { id: 'c', text: 'Sublimation' }],
            right: [{ id: '1', text: 'gas to liquid' }, { id: '2', text: 'solid to gas' }, { id: '3', text: 'liquid to gas at the surface' }, { id: '4', text: 'liquid to solid' }] } },
          answer: { pairs: { a: '3', b: '1', c: '2' } } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const left = cfg.left || [], right = cfg.right || [], once = cfg.once !== false;
      let pairs = Object.assign({}, value && value.pairs);
      const rows = Ned.el('div', { style: 'display:grid;gap:8px;max-width:640px;' });
      const sels = {};
      left.forEach(L => {
        const sel = Ned.el('select', { 'aria-label': 'Match for ' + (L.text || L.id), style: 'padding:7px 8px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font:inherit;min-width:11rem;max-width:100%;' });
        sel.addEventListener('change', () => { if (sel.value) pairs[L.id] = sel.value; else delete pairs[L.id]; paint(); emit(); });
        sels[L.id] = sel;
        const lab = Ned.el('div', { style: 'display:flex;gap:10px;align-items:center;flex:1 1 12rem;min-width:0;' });
        if (L.svg) { const h = Ned.el('span', {}); h.innerHTML = L.svg; lab.appendChild(h); }
        if (L.image) lab.appendChild(Ned.el('img', { src: L.image, alt: L.text || '', style: 'max-height:60px;' }));
        if (L.text) lab.appendChild(Ned.el('span', {}, [L.text]));
        rows.appendChild(Ned.el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);' },
          [lab, Ned.el('span', { 'aria-hidden': 'true', style: 'color:var(--muted);' }, ['→']), sel]));
      });
      function paint() {                       // rebuild option lists so a used choice disappears from the other rows
        left.forEach(L => {
          const sel = sels[L.id], cur = pairs[L.id] || '';
          sel.innerHTML = '';
          sel.appendChild(Ned.el('option', { value: '' }, ['choose…']));
          right.forEach(R => {
            const usedElsewhere = once && Object.keys(pairs).some(k => k !== L.id && String(pairs[k]) === String(R.id));
            if (!usedElsewhere) sel.appendChild(Ned.el('option', { value: R.id }, [R.text]));
          });
          sel.value = cur;
        });
      }
      const emit = () => onChange(Object.keys(pairs).length ? { pairs: Object.assign({}, pairs) } : null);
      container.appendChild(rows); paint();
      return {
        update: (v) => { pairs = Object.assign({}, v && v.pairs); paint(); },
        clear: () => { pairs = {}; paint(); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
