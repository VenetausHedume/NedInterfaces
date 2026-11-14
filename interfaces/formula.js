/* Formula / answer / unit — for calculations.
   Three boxes that are always there: working, answer, unit. The unit box is ALWAYS shown
   (showing it only when a unit is needed would give the mark scheme away).
   Saves { formula, answer, unit } with only the filled keys, or null.
   Marked by NedMark 'formula': number comparison, unit check, method marks from the working. */
(function () {
  Ned.register('formula',
    {
      name: 'Formula / answer / unit',
      unlocks: 'calculations',
      samples: [
        { label: 'Physics: momentum (2 marks)',
          question: { text: 'A car of mass 1200 kg travelling at 7.5 m/s is brought to rest. Calculate the change of momentum of the car.', marks: 2, config: {} },
          answer: { final: [{ value: '9000', unit: 'kg m / s', units: ['kg m / s', 'N s'], abs: true }], method: ['1200 × 7.5'] } },
        { label: 'Physics: standard form',
          question: { text: 'A charge of 0.60 C moves through a potential difference of 2.5 × 10⁸ V. Calculate the energy transferred.', marks: 2, config: {} },
          answer: { final: [{ value: '1.5 × 10^8', unit: 'J' }], method: ['0.60 × 2.5 × 10^8'] } },
        { label: 'Maths: range answer',
          question: { text: 'Calculate the length of AC. Give your answer correct to 3 significant figures.', marks: 2, config: {} },
          answer: { final: [{ value: '11.4' }, { lo: '11.40', hi: '11.41' }], method: [] } },
        { label: 'Maths: expression',
          question: { text: 'Expand and simplify 4(5w + 3) − 2(w − 1).', marks: 2, config: {} },
          answer: { final: [{ expr: '18w + 14' }], method: [] } },
      ],
    },
    function (container, { question, value, onChange }) {
      const v0 = value || {};
      const emit = () => {
        const o = {};
        if (fW.get()) o.formula = fW.get();
        if (fA.get()) o.answer = fA.get();
        if (fU.get()) o.unit = fU.get();
        onChange(Object.keys(o).length ? o : null);
      };
      const fW = Ned.field({ multiline: true, label: 'Working', placeholder: 'Working', value: v0.formula, onInput: emit });
      const fA = Ned.field({ width: '13rem', label: 'Answer', placeholder: 'Answer', value: v0.answer, onInput: emit });
      const fU = Ned.field({ width: '8rem', label: 'Unit', placeholder: 'Unit', value: v0.unit, onInput: emit });
      const row = Ned.el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px;' },
        [Ned.labelled('answer', fA.el), Ned.labelled('unit', fU.el)]);
      const wrap = Ned.el('div', { style: 'max-width:640px;' }, [Ned.labelled('working (earns method marks)', fW.el), row]);
      container.appendChild(wrap);
      return {
        update: (v) => { v = v || {}; fW.set(v.formula); fA.set(v.answer); fU.set(v.unit); },
        clear: () => { fW.set(''); fA.set(''); fU.set(''); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
