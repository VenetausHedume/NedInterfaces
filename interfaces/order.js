/* Put the lines in order — the student BUILDS a program (or a sequence of steps) from jumbled lines.
   This keeps the thinking of "write an algorithm" (which statement comes when, what sits inside the loop)
   without the typing, and it can be marked exactly.
   config.lines  : [{ id, text }]   given already jumbled; may include lines that are not needed
   config.indent : true -> each line can be moved in or out (to show what is inside a loop or an IF)
   config.mono   : false for ordinary sentences (e.g. the stages of a process); default true = code font
   Saves { order:[ids, top to bottom], indent:{ id: level } } (indent only when used), or null when nothing is placed.
   Marked by NedMark 'order': one mark lost for each line missing, extra or out of sequence. */
(function () {
  const B = 'padding:3px 9px;border:1px solid var(--line);border-radius:6px;background:var(--paper);cursor:pointer;font:inherit;font-size:13px;line-height:1.3;';
  Ned.register('order',
    { name: 'Put the lines in order', unlocks: 'write-an-algorithm questions, sequences',
      samples: [
        { label: 'Build the algorithm (one line is not needed)',
          question: { text: 'These lines make an algorithm that inputs 10 numbers and outputs their total. Put them in order. One line is not needed.', marks: 5,
            config: { indent: true, lines: [
              { id: 'out', text: 'OUTPUT Total' }, { id: 'add', text: 'Total ← Total + Number' }, { id: 'for', text: 'FOR Count ← 1 TO 10' },
              { id: 'bad', text: 'Total ← Number' }, { id: 'init', text: 'Total ← 0' }, { id: 'next', text: 'NEXT Count' }, { id: 'in', text: 'INPUT Number' }] } },
          answer: { order: ['init', 'for', 'in', 'add', 'next', 'out'], indent: { init: 0, for: 0, in: 1, add: 1, next: 0, out: 0 }, indentMarks: 1 } },
        { label: 'Stages of a process',
          question: { text: 'Put the stages of the fetch–decode–execute cycle in order.', marks: 3,
            config: { mono: false, lines: [{ id: 'd', text: 'The instruction is decoded by the control unit' }, { id: 'f', text: 'The instruction is fetched from memory' }, { id: 'p', text: 'The program counter is incremented' }, { id: 'e', text: 'The instruction is executed' }] } },
          answer: { order: ['f', 'p', 'd', 'e'], scale: null } },
        { label: 'Food chain (2 marks)',
          question: { text: 'Construct a food chain using four of these organisms. Start with the producer; each arrow points to the organism that eats it.', marks: 2,
            config: { mono: false, lines: [{ id: 's', text: 'snake' }, { id: 'g', text: 'grass' }, { id: 'h', text: 'grasshopper' }, { id: 'x', text: 'sun' }, { id: 'f', text: 'frog' }] } },
          answer: { order: ['g', 'h', 'f', 's'] } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const lines = cfg.lines || [], byId = {}; lines.forEach(l => { byId[l.id] = l; });
      const font = cfg.mono === false ? 'inherit' : '14px ui-monospace,Menlo,Consolas,monospace';
      let order = [], indent = {};
      const load = v => { order = ((v && v.order) || []).filter(id => byId[id]); indent = Object.assign({}, v && v.indent); };
      load(value);

      const pool = Ned.el('div', { 'aria-label': 'Lines to use', style: 'display:grid;gap:6px;' });
      const prog = Ned.el('ol', { 'aria-label': 'Your answer, in order', style: 'display:grid;gap:6px;margin:0;padding:0;list-style:none;min-height:3rem;' });
      const head = t => Ned.el('div', { style: 'font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 6px;' }, [t]);
      const colS = 'flex:1 1 280px;min-width:0;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--paper);';
      container.appendChild(Ned.el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;max-width:900px;' },
        [Ned.el('div', { style: colS }, [head('Lines to use'), pool]), Ned.el('div', { style: colS + 'background:#fffdf7;' }, [head('Your answer (top to bottom)'), prog])]));
      const live = Ned.el('p', { class: 'ned-note', 'aria-live': 'polite' }, ['']);
      container.appendChild(live);

      const mk = (label, title, fn, off) => { const b = Ned.el('button', { type: 'button', title, 'aria-label': title, style: B + (off ? 'opacity:.35;' : '') }, [label]); if (off) b.disabled = true; else b.addEventListener('click', fn); return b; };
      function draw(focus) {
        pool.innerHTML = ''; prog.innerHTML = '';
        const left = lines.filter(l => !order.includes(l.id));
        if (!left.length) pool.appendChild(Ned.el('p', { class: 'ned-note' }, ['All lines are placed.']));
        left.forEach(l => pool.appendChild(Ned.el('div', { 'data-pool': l.id, style: 'display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;' },
          [Ned.el('span', { style: 'font:' + font + ';min-width:0;overflow-wrap:anywhere;' }, [l.text]), mk('Add →', 'Add: ' + l.text, () => { order.push(l.id); change('Added. ' + order.length + ' lines in your answer.', l.id + ':down'); })])));
        if (!order.length) prog.appendChild(Ned.el('li', { class: 'ned-note', style: 'padding:6px 2px;' }, ['Add lines from the left, then move them into order.']));
        order.forEach((id, i) => {
          const l = byId[id], lvl = indent[id] || 0;
          const ctl = [mk('↑', 'Move up: ' + l.text, () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; change('Moved up to position ' + i + '.', id + ':up'); }, i === 0),
            mk('↓', 'Move down: ' + l.text, () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; change('Moved down to position ' + (i + 2) + '.', id + ':down'); }, i === order.length - 1)];
          if (cfg.indent) ctl.push(mk('⇤', 'Move out: ' + l.text, () => { indent[id] = lvl - 1; if (!indent[id]) delete indent[id]; change('Moved out.', id + ':out'); }, lvl === 0),
            mk('⇥', 'Move in (inside a loop or IF): ' + l.text, () => { indent[id] = lvl + 1; change('Moved in.', id + ':in'); }, lvl >= 3));
          ctl.push(mk('✕', 'Remove: ' + l.text, () => { order.splice(i, 1); delete indent[id]; change('Removed.'); }));
          prog.appendChild(Ned.el('li', { 'data-line': id, 'data-indent': lvl, style: 'display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;margin-left:' + (lvl * 26) + 'px;' },
            [Ned.el('span', { style: 'font:' + font + ';min-width:0;overflow-wrap:anywhere;' }, [l.text]), Ned.el('span', { 'data-ctl': id, style: 'display:flex;gap:4px;flex:0 0 auto;' }, ctl)]));
        });
        if (focus) { const [id, which] = focus.split(':'); const row = prog.querySelector('[data-ctl="' + id + '"]'); const idx = { up: 0, down: 1, out: 2, in: 3 }[which]; const b = row && row.children[idx]; if (b && !b.disabled) b.focus(); else if (row) { const any = [...row.children].find(x => !x.disabled); if (any) any.focus(); } }
      }
      function change(msg, focus) { draw(focus); live.textContent = msg || ''; emit(); }
      function emit() { if (!order.length) return onChange(null); const v = { order: order.slice() }; if (cfg.indent && Object.keys(indent).length) v.indent = Object.assign({}, indent); onChange(v); }
      draw();
      return { update: (v) => { load(v); draw(); }, clear: () => { order = []; indent = {}; draw(); emit(); }, destroy: () => { container.innerHTML = ''; } };
    });
})();
