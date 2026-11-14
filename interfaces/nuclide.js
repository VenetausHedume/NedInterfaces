/* Nuclear equation — boxes for a decay equation in nuclide notation (mass number on top, proton number below, symbol).
   Typing ¹⁴₆C in a maths box is fiddly, so each particle gets three small boxes laid out the way it is written on paper.
   config.left / config.right : number of particles on each side (e.g. 1 and 2 for a decay)
   config.given : [{ side:'left'|'right', i, A, Z, s }]   particles printed in the question (shown, not editable)
   Saves { left:[{A,Z,s}], right:[{A,Z,s}] } (blanks as '') or null.
   Marked by NedMark 'nuclide': each box the student filled is compared with the mark scheme
   (particles may be in any order on a side; α = He, β = e, γ = γ). */
(function () {
  const box = 'width:3.2rem;padding:5px 4px;border:1px solid var(--line);border-radius:5px;background:#fffdf7;font:15px/1.2 ui-monospace,Menlo,Consolas,monospace;text-align:right;';
  Ned.register('nuclide',
    {
      name: 'Nuclear equation',
      unlocks: 'decay equations in nuclide notation',
      samples: [
        { label: 'Alpha decay (3 marks)',
          question: { text: 'Uranium-238 decays by emitting an α-particle to form thorium (Th). Complete the decay equation.', marks: 3,
            config: { left: 1, right: 2, given: [{ side: 'left', i: 0, A: 238, Z: 92, s: 'U' }] } },
          answer: { left: [{ A: 238, Z: 92, s: 'U' }], right: [{ A: 234, Z: 90, s: 'Th' }, { A: 4, Z: 2, s: 'He' }] } },
        { label: 'Beta decay (2 marks)',
          question: { text: 'Carbon-14 decays by β-emission to nitrogen. Complete the equation.', marks: 2,
            config: { left: 1, right: 2, given: [{ side: 'left', i: 0, A: 14, Z: 6, s: 'C' }, { side: 'right', i: 0, s: 'N' }] } },
          answer: { left: [{ A: 14, Z: 6, s: 'C' }], right: [{ A: 14, Z: 7, s: 'N' }, { A: 0, Z: -1, s: 'e' }] } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const sides = { left: cfg.left || 1, right: cfg.right || 2 };
      const given = cfg.given || [];
      const inputs = { left: [], right: [] };
      const row = Ned.el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--paper);max-width:100%;' });
      ['left', 'right'].forEach(side => {
        for (let i = 0; i < sides[side]; i++) {
          if (i > 0) row.appendChild(Ned.el('span', { style: 'font-size:22px;color:var(--ink);' }, ['+']));
          const g = given.find(x => x.side === side && x.i === i) || {};
          const mk = (field, label) => {
            const fixed = g[field] != null;
            const inp = Ned.el('input', { type: 'text', inputmode: field === 's' ? 'text' : 'numeric', 'aria-label': `${side === 'left' ? 'Before' : 'After'} the arrow, particle ${i + 1}: ${label}`,
              'data-nuc': `${side}${i}${field}`, style: box + (field === 's' ? 'width:3rem;text-align:left;font-size:20px;' : '') + (fixed ? 'background:transparent;border-color:transparent;' : '') });
            if (fixed) { inp.value = String(g[field]); inp.readOnly = true; inp.tabIndex = -1; }
            inp.addEventListener('input', emit);
            return inp;
          };
          const A = mk('A', 'mass number'), Z = mk('Z', 'proton number'), S = mk('s', 'symbol');
          inputs[side].push({ A, Z, s: S, given: g });
          row.appendChild(Ned.el('span', { style: 'display:inline-flex;align-items:center;gap:3px;' }, [
            Ned.el('span', { style: 'display:inline-flex;flex-direction:column;gap:3px;' }, [A, Z]), S]));
        }
        if (side === 'left') row.appendChild(Ned.el('span', { style: 'font-size:24px;padding:0 4px;' }, ['→']));
      });
      container.appendChild(row);
      container.appendChild(Ned.el('p', { class: 'ned-note' }, ['Top box: mass (nucleon) number. Bottom box: proton (atomic) number. Then the symbol, e.g. He, e, Th. For a gamma ray write γ or gamma.']));
      function read() {
        const v = {}; let any = false;
        ['left', 'right'].forEach(side => { v[side] = inputs[side].map(p => {
          const o = { A: p.A.value.trim(), Z: p.Z.value.trim(), s: p.s.value.trim() };
          ['A', 'Z', 's'].forEach(k => { if (p.given[k] == null && o[k] !== '') any = true; });
          return o; }); });
        return any ? v : null;
      }
      function emit() { onChange(read()); }
      function load(v) {
        ['left', 'right'].forEach(side => inputs[side].forEach((p, i) => { const o = (v && v[side] && v[side][i]) || {};
          ['A', 'Z', 's'].forEach(k => { if (p.given[k] == null) p[k].value = o[k] != null ? String(o[k]) : ''; }); }));
      }
      load(value);
      return {
        update: (v) => load(v),
        clear: () => { load(null); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
