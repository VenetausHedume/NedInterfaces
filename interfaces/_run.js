/* Run panel — lets a student RUN their pseudocode or SQL and see what it does, before it is marked.
   Seeing your own program print the wrong total teaches more than a cross next to it.
   Ned.runPanel(container, 'code' | 'sql' | 'flow', getCode, question)   ('flow': getCode returns { nodes, edges })
   code: optional question.config.tryInputs = [..] pre-fills the test inputs box
   sql : question.config.tables = { Name:{ columns, rows } } is shown above the editor and queried on Run */
(function () {
  const btn = 'padding:7px 14px;border:1px solid var(--accent);border-radius:7px;background:var(--accent);color:#fff;cursor:pointer;font:inherit;font-size:14px;';
  const box = 'margin-top:8px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;min-height:2.6rem;';
  function table(columns, rows) {
    const t = Ned.el('table', { style: 'border-collapse:collapse;font-size:13px;background:#fff;' });
    t.appendChild(Ned.el('tr', {}, columns.map(c => Ned.el('th', { scope: 'col', style: 'border:1px solid var(--line);padding:4px 9px;background:#efeadd;text-align:left;' }, [String(c)]))));
    rows.forEach(r => t.appendChild(Ned.el('tr', {}, r.map(v => Ned.el('td', { style: 'border:1px solid var(--line);padding:4px 9px;' }, [String(v)])))));
    return Ned.el('div', { style: 'overflow-x:auto;max-width:100%;' }, [t]);
  }
  Ned.runPanel = function (container, kind, getCode, question) {
    const cfg = (question && question.config) || {};
    if (cfg.run === false) return;
    const out = Ned.el('div', { style: box, 'aria-live': 'polite', 'data-run': 'output' }, ['Press Run to try your ' + (kind === 'sql' ? 'query' : kind === 'flow' ? 'flowchart' : 'program') + '.']);
    const run = Ned.el('button', { type: 'button', style: btn, 'data-run': 'go' }, [kind === 'sql' ? 'Run query' : kind === 'flow' ? 'Run flowchart' : 'Run']);
    const panel = Ned.el('div', { style: 'margin-top:12px;max-width:100%;' });
    if (kind === 'sql') {
      const tabs = cfg.tables || {};
      if (Object.keys(tabs).length) {
        const top = Ned.el('div', { style: 'margin-bottom:10px;' });
        Object.keys(tabs).forEach(n => { top.appendChild(Ned.el('div', { style: 'font-size:13px;font-weight:600;margin:4px 0;' }, ['Table: ' + n])); top.appendChild(table(tabs[n].columns, tabs[n].rows)); });
        container.insertBefore(top, container.firstChild);
      }
      run.addEventListener('click', () => {
        if (!window.NedSql) { out.textContent = 'The SQL runner did not load.'; return; }
        const r = NedSql.run(getCode(), tabs);
        out.innerHTML = '';
        if (!r.ok) { out.style.color = '#b0413e'; out.textContent = r.error; return; }
        out.style.color = '';
        out.appendChild(Ned.el('div', { style: 'font-family:inherit;margin-bottom:6px;color:var(--muted);' }, [r.rows.length + (r.rows.length === 1 ? ' row' : ' rows')]));
        out.appendChild(table(r.columns, r.rows));
      });
      panel.append(run, out);
    } else {
      const inp = Ned.el('textarea', { rows: 3, 'aria-label': 'Test inputs, one per line', 'data-run': 'inputs', placeholder: 'one value per line', style: 'width:100%;max-width:16rem;padding:7px;border:1px solid var(--line);border-radius:6px;background:#fffdf7;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;resize:vertical;' });
      inp.value = (cfg.tryInputs || []).join('\n');
      run.addEventListener('click', () => {
        if (!window.NedPseudo) { out.textContent = 'The pseudocode runner did not load.'; return; }
        const inputs = inp.value.split('\n').map(s => s.trim()).filter(s => s !== '');
        const r = kind === 'flow' ? NedPseudo.runFlowchart(getCode(), inputs) : NedPseudo.run(getCode(), inputs);
        out.innerHTML = '';
        if (r.output.length) out.appendChild(Ned.el('div', {}, [r.output.join('\n')]));
        if (!r.ok) out.appendChild(Ned.el('div', { style: 'color:#b0413e;margin-top:' + (r.output.length ? '6px' : '0') + ';', 'data-run': 'error' }, [(r.error.line ? 'Line ' + r.error.line + ': ' : '') + r.error.message]));
        else if (!r.output.length) out.appendChild(Ned.el('div', { style: 'color:var(--muted);' }, [kind === 'flow' ? 'The flowchart ran to STOP but did not OUTPUT anything.' : 'The program ran but did not OUTPUT anything.']));
      });
      panel.append(Ned.el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;' }, [Ned.labelled('inputs to test with', inp), run]), out);
    }
    container.appendChild(panel);
  };
})();
