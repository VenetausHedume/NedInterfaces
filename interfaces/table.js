/* Table entry — fill the editable cells of a given table.
   config.table : 2D array. A string cell is a FIXED label (read-only header);
   a null cell is EDITABLE -> a text-box field (same as the text interface).
   config.maxRows : optional cap (trace tables default cap 20).
   Saves only filled cells, keyed by position: { cells: { "r0c2": "..." } } or null.
   Marked by NedMark 'table': each cell like a short answer or a number; scheme 'row' = a row scores only if all its cells are right. */

(function () {

  const hasMath = () => window.customElements && customElements.get('math-field');

  function makeCellField(initial, onInput) {
    if (hasMath()) {
      const mf = document.createElement('math-field');
      mf.style.cssText =
        'display:block;width:100%;min-width:4rem;font-size:1.05rem;padding:4px 6px;' +
        'border:none;background:transparent;';
      mf.mathVirtualKeyboardPolicy = 'manual';
      try { mf.menuItems = []; } catch (e) {}
      try { mf.style.setProperty('--keyboard-toggle-display','none'); } catch (e) {}
      try { mf.inlineShortcuts = {}; } catch (e) {}
      try { mf.mathModeSpace = '\\;'; } catch (e) {}
      if (Ned.plainTyping) Ned.plainTyping(mf);
      if (initial) mf.value = initial;
      mf.addEventListener('input', () => onInput(mf.value));
      return mf;
    }
    const inp = document.createElement('input');
    inp.type = 'text'; inp.style.cssText = 'width:100%;min-width:4rem;border:none;background:transparent;font:inherit;padding:4px 6px;';
    inp.value = initial || '';
    inp.addEventListener('input', () => onInput(inp.value));
    return inp;
  }

  Ned.register('table',
    {
      name: 'Table entry',
      unlocks: 'results/trace tables',
      samples: [
        { label: 'Enzymes (one mark per cell)',
          question: { text: 'Complete Table 6.1 about enzymes in the digestive system.', marks: 4,
            config: { table: [
              ['enzyme', 'substrate', 'product'],
              ['amylase', null, null],
              ['protease', null, 'amino acids'],
              ['lipase', 'fats', null],
            ] } },
          answer: { cells: { r1c1: { alts: ['starch'] }, r1c2: { alts: ['maltose', 'sugar', 'simple sugars'] }, r2c1: { alts: ['protein'] }, r3c2: { alts: ['fatty acids and glycerol'], require: ['fatty', 'glycerol'] } } } },
        { label: 'Trace table (one mark per row)',
          question: { text: 'Complete the trace table for the inputs 4, 3, -1.  Each loop: Total = Total + Number, Count = Count + 1.', marks: 2,
            config: { table: [
              ['Number', 'Total', 'Count'],
              ['4', null, null],
              ['3', null, null],
            ] } },
          answer: { cells: { r1c1: 4, r1c2: 1, r2c1: 7, r2c2: 2 }, scheme: 'row' } },
        { label: 'Results table',
          question: { text: 'Complete the results table.', marks: 3,
            config: { table: [
              ['Trial', 'Mass (g)', 'Volume (cm\u00b3)'],
              ['1', null, null],
              ['2', null, null],
              ['3', null, null],
            ] } } },
        { label: 'Trace table (CS)',
          question: { text: 'Complete the trace table.', marks: 4,
            config: { table: [
              ['Step', 'x', 'y', 'output'],
              ['1', null, null, null],
              ['2', null, null, null],
            ] } } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const grid = Array.isArray(cfg.table) ? cfg.table : [[null]];
      const maxRows = cfg.maxRows || 20;

      const cells = {};
      if (value && value.cells) for (const k in value.cells) cells[k] = value.cells[k];

      function emit() {
        const out = {};
        for (const k in cells) { const v = (cells[k] || '').trim(); if (v !== '') out[k] = cells[k]; }
        onChange(Object.keys(out).length ? { cells: out } : null);
      }

      const table = document.createElement('table');
      table.style.cssText = 'border-collapse:collapse;background:#fffdf7;border:1px solid var(--line);';

      grid.forEach((rowArr, r) => {
        if (r >= maxRows + 1) return;
        const tr = document.createElement('tr');
        rowArr.forEach((cell, c) => {
          const td = document.createElement('td');
          td.style.cssText = 'border:1px solid var(--line);padding:0;vertical-align:middle;';
          if (cell === null || cell === undefined) {
            const key = 'r' + r + 'c' + c;
            td.style.background = '#fff';
            const fld = makeCellField(cells[key] || '', (v) => { cells[key] = v; emit(); });
            fld.setAttribute('data-cell', key); fld.setAttribute('aria-label', 'Row ' + r + ', ' + (grid[0][c] || 'column ' + (c + 1)));
            td.appendChild(fld);
          } else {
            td.textContent = cell;
            td.style.cssText += 'background:#efeadd;font-weight:600;padding:6px 10px;color:var(--ink);white-space:nowrap;';
          }
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });

      container.appendChild(table);

      return {
        update: (v) => {
          for (const k in cells) delete cells[k];
          if (v && v.cells) for (const k in v.cells) cells[k] = v.cells[k];
          table.querySelectorAll('[data-cell]').forEach(f => { f.value = cells[f.getAttribute('data-cell')] || ''; });
        },
        clear: () => {
          for (const k in cells) delete cells[k];
          table.querySelectorAll('math-field, input').forEach(f => { f.value = ''; });
          emit();
        },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
