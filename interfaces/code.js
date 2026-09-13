/* Code editor (IGCSE pseudocode) — CodeMirror with a Cambridge 0478 highlighting
   mode. Monospaced, line numbers, `<-` auto-converts to the ← assignment arrow.
   Saves { code } (plain text) or null. Execution/marking is a Phase-2 concern.
   Requires CodeMirror in index.html (CDN). Falls back to a plain textarea. */

(function () {

  const KEYWORDS = new Set(['DECLARE','CONSTANT','INPUT','OUTPUT','IF','THEN','ELSE','ENDIF',
    'CASE','OF','OTHERWISE','ENDCASE','FOR','TO','STEP','NEXT','WHILE','DO','ENDWHILE',
    'REPEAT','UNTIL','PROCEDURE','ENDPROCEDURE','FUNCTION','RETURNS','RETURN','ENDFUNCTION',
    'CALL','ARRAY','TYPE','ENDTYPE','BYREF','BYVAL','OPENFILE','READFILE','WRITEFILE',
    'CLOSEFILE','READ','WRITE','APPEND','SEEK','GETRECORD','PUTRECORD','EOF','AND','OR','NOT',
    'MOD','DIV','TRUE','FALSE']);
  const TYPES = new Set(['INTEGER','REAL','CHAR','STRING','BOOLEAN','DATE']);
  const BUILTINS = new Set(['LENGTH','SUBSTRING','LEFT','RIGHT','MID','UCASE','LCASE','ROUND',
    'RANDOM','INT','DIV','MOD','ASC','CHR','NUM_TO_STRING','STRING_TO_NUM']);

  // register a simple CodeMirror mode for IGCSE pseudocode (idempotent)
  function ensureMode() {
    if (!window.CodeMirror || window.__nedPseudoMode) return;
    try {
      window.CodeMirror.defineMode('igcse-pseudocode', function () {
        return {
          token: function (stream) {
            if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
            if (stream.match('<-') || stream.match('\u2190')) return 'operator';
            if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
            if (stream.match(/^'(?:[^'\\]|\\.)'?/)) return 'string';
            if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number';
            if (stream.match(/^[<>]=?|=|<>|[-+*/^&]|:/)) return 'operator';
            const w = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
            if (w) { const t = w[0]; const up = t.toUpperCase();
              if (KEYWORDS.has(up)) return 'keyword';
              if (TYPES.has(up)) return 'variable-2';
              if (BUILTINS.has(up)) return 'builtin';
              return 'variable'; }
            stream.next(); return null;
          }
        };
      });
      window.__nedPseudoMode = true;
    } catch (e) {}
  }

  Ned.register('code',
    {
      name: 'Code editor',
      unlocks: 'CS pseudocode',
      samples: [
        { label: 'Write an algorithm',
          question: { text: 'Write pseudocode that outputs the numbers 1 to 10.', marks: 4, config: {} } },
        { label: 'Procedure',
          question: { text: 'Write a procedure that takes a name and outputs a greeting.', marks: 3, config: {} } },
      ],
    },
    function (container, { question, value, onChange }) {
      const startCode = (value && value.code) || '';
      const ready = !!window.CodeMirror;

      // fallback: plain monospaced textarea
      if (!ready) {
        const ta = document.createElement('textarea');
        ta.value = startCode; ta.spellcheck = false;
        ta.style.cssText = 'width:100%;min-height:280px;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;' +
          'padding:10px;border:1px solid var(--line);border-radius:8px;background:#fffdf7;resize:vertical;tab-size:4;';
        const emitT = () => { const c = ta.value; onChange(c.trim() === '' ? null : { code: c }); };
        ta.addEventListener('input', emitT);
        container.appendChild(ta);
        container.appendChild(Ned.el('p', { class: 'ned-note' }, ['CodeMirror not loaded \u2014 add it to index.html for syntax highlighting.']));
        return { update: (v) => { ta.value = (v && v.code) || ''; }, clear: () => { ta.value = ''; emitT(); }, destroy: () => { container.innerHTML = ''; } };
      }

      ensureMode();
      const host = document.createElement('div');
      host.style.cssText = 'border:1px solid var(--line);border-radius:8px;overflow:hidden;';
      container.appendChild(host);
      container.appendChild(Ned.el('p', { class: 'ned-note' }, ['IGCSE pseudocode. Type "<-" to insert the \u2190 assignment arrow.']));

      const cm = window.CodeMirror(host, {
        value: startCode,
        mode: 'igcse-pseudocode',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        theme: 'default',
        lineWrapping: true,
      });
      cm.setSize('100%', 320);

      // "<-" -> "←" as you type
      cm.on('inputRead', (inst, ch) => {
        if (ch.text && ch.text[0] === '-') {
          const cur = inst.getCursor(); const line = inst.getLine(cur.line);
          if (line.slice(cur.ch - 2, cur.ch) === '<-') {
            inst.replaceRange('\u2190', { line: cur.line, ch: cur.ch - 2 }, { line: cur.line, ch: cur.ch });
          }
        }
      });

      const emit = () => { const c = cm.getValue(); onChange(c.trim() === '' ? null : { code: c }); };
      cm.on('change', emit);
      setTimeout(() => cm.refresh(), 0);   // ensure correct layout after mount

      return {
        update: (v) => { cm.setValue((v && v.code) || ''); },
        clear: () => { cm.setValue(''); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
