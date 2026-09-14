/* Code editor (IGCSE pseudocode). CodeMirror with a Cambridge 0478 highlighting
   mode. Monospaced, line numbers, `<-` -> the ← assignment arrow.
   Registration NEVER touches CodeMirror at load time (so it can't fail to register);
   CodeMirror is only used inside the factory, with a plain-textarea fallback.
   Saves { code } (plain text) or null. */

(function () {

  const KEYWORDS = ['DECLARE','CONSTANT','INPUT','OUTPUT','IF','THEN','ELSE','ENDIF',
    'CASE','OF','OTHERWISE','ENDCASE','FOR','TO','STEP','NEXT','WHILE','DO','ENDWHILE',
    'REPEAT','UNTIL','PROCEDURE','ENDPROCEDURE','FUNCTION','RETURNS','RETURN','ENDFUNCTION',
    'CALL','ARRAY','TYPE','ENDTYPE','BYREF','BYVAL','OPENFILE','READFILE','WRITEFILE',
    'CLOSEFILE','READ','WRITE','APPEND','EOF','AND','OR','NOT','MOD','DIV','TRUE','FALSE'];
  const TYPES = ['INTEGER','REAL','CHAR','STRING','BOOLEAN','DATE'];
  const BUILTINS = ['LENGTH','SUBSTRING','MID','LEFT','RIGHT','UCASE','LCASE','ROUND',
    'RANDOM','INT','ASC','CHR'];
  const KW = new Set(KEYWORDS), TY = new Set(TYPES), BI = new Set(BUILTINS);

  function ensureMode() {
    if (!window.CodeMirror || window.__nedPseudoMode) return;
    try {
      window.CodeMirror.defineMode('igcse-pseudocode', function () {
        return { token: function (stream) {
          if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
          if (stream.match('<-') || stream.match('\u2190')) return 'operator';
          if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
          if (stream.match(/^'(?:[^'\\]|\\.)'?/)) return 'string';
          if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number';
          if (stream.match(/^[<>]=?|=|<>|[-+*/^&]|:/)) return 'operator';
          const w = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
          if (w) { const up = w[0].toUpperCase();
            if (KW.has(up)) return 'keyword';
            if (TY.has(up)) return 'variable-2';
            if (BI.has(up)) return 'builtin';
            return 'variable'; }
          stream.next(); return null;
        } };
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

      // plain-textarea fallback (also used if CodeMirror missing or errors)
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
        container.appendChild(Ned.el('p', { class: 'ned-note' }, ['IGCSE pseudocode. Type "<-" to insert the \u2190 assignment arrow.']));

        const cm = window.CodeMirror(host, {
          value: startCode, mode: 'igcse-pseudocode',
          lineNumbers: true, indentUnit: 4, tabSize: 4, lineWrapping: true,
        });
        cm.setSize('100%', 320);

        cm.on('inputRead', (inst, ch) => {
          if (ch.text && ch.text[0] === '-') {
            const cur = inst.getCursor(), line = inst.getLine(cur.line);
            if (line.slice(cur.ch - 2, cur.ch) === '<-') inst.replaceRange('\u2190', { line: cur.line, ch: cur.ch - 2 }, { line: cur.line, ch: cur.ch });
          }
        });
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