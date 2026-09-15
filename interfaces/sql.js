/* SQL editor (IGCSE) — CodeMirror with a SQL highlighting mode. Monospaced,
   line numbers. Registration never touches CodeMirror at load (can't fail to
   register); CodeMirror is only used inside the factory, with a textarea
   fallback. Saves { code } (plain text) or null. */

(function () {

  const KEYWORDS = ['SELECT','FROM','WHERE','ORDER','BY','GROUP','HAVING','INSERT','INTO',
    'VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','ADD','PRIMARY','KEY',
    'FOREIGN','REFERENCES','JOIN','INNER','LEFT','RIGHT','OUTER','ON','AS','DISTINCT',
    'AND','OR','NOT','IN','BETWEEN','LIKE','IS','NULL','ASC','DESC','COUNT','SUM','AVG',
    'MIN','MAX','SUM','LIMIT','UNION','ALL','EXISTS','DEFAULT','AUTOINCREMENT'];
  const TYPES = ['INTEGER','INT','REAL','TEXT','CHAR','VARCHAR','BOOLEAN','DATE','TIME',
    'DATETIME','NUMERIC','DECIMAL','FLOAT','DOUBLE'];
  const KW = new Set(KEYWORDS), TY = new Set(TYPES);

  function ensureMode() {
    if (!window.CodeMirror || window.__nedSqlMode) return;
    try {
      window.CodeMirror.defineMode('igcse-sql', function () {
        return { token: function (stream) {
          if (stream.match('--')) { stream.skipToEnd(); return 'comment'; }
          if (stream.match('/*')) { stream.skipTo('*/') ? stream.match('*/') : stream.skipToEnd(); return 'comment'; }
          if (stream.match(/^'(?:[^'\\]|\\.)*'?/)) return 'string';
          if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
          if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number';
          if (stream.match(/^[<>]=?|=|<>|!=|[-+*/%]|\|\|/)) return 'operator';
          if (stream.match(/^[*]/)) return 'operator';
          const w = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
          if (w) { const up = w[0].toUpperCase();
            if (KW.has(up)) return 'keyword';
            if (TY.has(up)) return 'variable-2';
            return 'variable'; }
          stream.next(); return null;
        } };
      });
      window.__nedSqlMode = true;
    } catch (e) {}
  }

  Ned.register('sql',
    {
      name: 'SQL editor',
      unlocks: 'CS databases',
      samples: [
        { label: 'SELECT query',
          question: { text: 'Write an SQL query to list all students in class 10 ordered by name.', marks: 4, config: {} } },
        { label: 'Aggregate',
          question: { text: 'Write an SQL query to count how many books cost more than 20.', marks: 3, config: {} } },
      ],
    },
    function (container, { question, value, onChange }) {
      const startCode = (value && value.code) || '';

      function buildTextarea() {
        const ta = document.createElement('textarea');
        ta.value = startCode; ta.spellcheck = false;
        ta.style.cssText = 'width:100%;min-height:300px;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;' +
          'padding:10px;border:1px solid var(--line);border-radius:8px;background:#fffdf7;resize:vertical;tab-size:4;';
        const emitT = () => { const c = ta.value; onChange(c.trim() === '' ? null : { code: c }); };
        ta.addEventListener('input', emitT);
        container.appendChild(ta);
        return { update: (v) => { ta.value = (v && v.code) || ''; }, clear: () => { ta.value = ''; emitT(); }, destroy: () => { container.innerHTML = ''; } };
      }

      if (!window.CodeMirror) return buildTextarea();

      try {
        ensureMode();
        const host = document.createElement('div');
        host.style.cssText = 'border:1px solid var(--line);border-radius:8px;overflow:hidden;';
        container.appendChild(host);
        container.appendChild(Ned.el('p', { class: 'ned-note' }, ['SQL. Keywords are highlighted; strings use single quotes.']));

        const cm = window.CodeMirror(host, {
          value: startCode, mode: 'igcse-sql',
          lineNumbers: true, indentUnit: 2, tabSize: 2, lineWrapping: true,
        });
        cm.setSize('100%', 320);

        const emit = () => { const c = cm.getValue(); onChange(c.trim() === '' ? null : { code: c }); };
        cm.on('change', emit);
        setTimeout(() => cm.refresh(), 0);

        return { update: (v) => cm.setValue((v && v.code) || ''), clear: () => { cm.setValue(''); emit(); }, destroy: () => { container.innerHTML = ''; } };
      } catch (e) {
        container.innerHTML = '';
        return buildTextarea();
      }
    });
})();
