/* Code editor (IGCSE pseudocode). CodeMirror with a Cambridge 0478 highlighting
   mode. Monospaced, line numbers, `<-` -> the ← assignment arrow.
   Registration NEVER touches CodeMirror at load time (so it can't fail to register);
   CodeMirror is only used inside the factory, with a plain-textarea fallback.
   Saves { code, lang? } (plain text; lang:'python' when written in Python) or null. config.langs limits the choice.
   A Run panel under the editor runs the pseudocode on test inputs (marking/pseudo.js).
   Marked by NedMark 'code': the program is run on the mark scheme's test cases; part marks for the features it shows. */

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
        { label: 'Total of three numbers (run + marked by test cases)',
          question: { text: 'Write an algorithm, using pseudocode, that inputs three numbers and outputs their total.', marks: 5, config: { tryInputs: [4, 5, 6] } },
          answer: { tests: [{ input: [4, 5, 6], expect: [15] }, { input: [10, 0, -3], expect: [7] }, { input: [1, 1, 1], expect: [3] }], features: ['loop', 'input', 'totalling', 'output'] } },
        { label: 'Largest of five',
          question: { text: 'Write an algorithm that inputs five positive numbers and outputs the largest.', marks: 6, config: { tryInputs: [3, 9, 2, 7, 5] } },
          answer: { tests: [{ input: [3, 9, 2, 7, 5], expect: [9] }, { input: [8, 1, 1, 1, 1], expect: [8] }, { input: [1, 2, 3, 4, 50], expect: [50] }], features: ['loop', 'input', 'selection', 'output'] } },
        { label: 'Read a text file',
          question: { text: 'The text file Scores.txt holds one score per line. Write an algorithm, using pseudocode, that reads every score from the file and outputs how many scores are above 50.', marks: 5, config: { files: { 'Scores.txt': ['45', '72', '50', '91', '12'] } } },
          answer: { tests: [{ files: { 'Scores.txt': ['45', '72', '50', '91', '12'] }, expect: [2] }, { files: { 'Scores.txt': ['51', '100', '99'] }, expect: [3] }, { files: { 'Scores.txt': [] }, expect: [0] }], features: ['file', 'loop', 'selection', 'counting'] } },
      ],
    },
    function (container, { question, value, onChange }) {
      const startCode = (value && value.code) || '';
      const cfg = (question && question.config) || {};
      const langs = cfg.langs || ['pseudo', 'python'];
      let lang = (value && value.lang) || cfg.lang || langs[0];
      const LANG_NAME = { pseudo: 'Pseudocode', python: 'Python' };
      const pack = c => (c.trim() === '' ? null : Object.assign({ code: c }, lang !== 'pseudo' ? { lang } : {}));
      let onLang = () => {};
      if (langs.length > 1) {
        const sel = Ned.el('select', { 'aria-label': 'Language', 'data-lang': '', style: 'font:inherit;padding:4px 6px;' }, langs.map(l => Ned.el('option', { value: l }, [LANG_NAME[l] || l])));
        sel.value = lang;
        sel.addEventListener('change', () => { lang = sel.value; onLang(); });
        container.appendChild(Ned.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:14px;' }, ['Write your answer in', sel,
          Ned.el('span', { style: 'color:var(--muted);font-size:13px;' }, ['(Java and Visual Basic answers are not run here)'])]));
      }

      // plain-textarea fallback (also used if CodeMirror missing or errors)
      function buildTextarea() {
        const ta = document.createElement('textarea');
        ta.value = startCode; ta.spellcheck = false;
        ta.style.cssText = 'width:100%;min-height:300px;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;' +
          'padding:10px;border:1px solid var(--line);border-radius:8px;background:#fffdf7;resize:vertical;tab-size:4;';
        const emitT = () => onChange(pack(ta.value));
        onLang = emitT;
        ta.addEventListener('input', emitT);
        container.appendChild(ta);
        if (Ned.runPanel) Ned.runPanel(container, 'code', () => ta.value, question, () => lang);
        return { update: (v) => { ta.value = (v && v.code) || ''; }, clear: () => { ta.value = ''; emitT(); }, destroy: () => { container.innerHTML = ''; } };
      }

      if (!window.CodeMirror) return buildTextarea();

      try {
        ensureMode();
        const host = document.createElement('div');
        host.style.cssText = 'border:1px solid var(--line);border-radius:8px;overflow:hidden;';
        container.appendChild(host);
        const note = Ned.el('p', { class: 'ned-note' }, ['']); container.appendChild(note);
        const noteText = () => { note.textContent = lang === 'python' ? 'Python 3. input() takes the test inputs in order; open() reads the given files.' : 'IGCSE pseudocode. Type "<-" to insert the \u2190 assignment arrow.'; };
        noteText();

        const cm = window.CodeMirror(host, {
          value: startCode, mode: lang === 'python' ? 'python' : 'igcse-pseudocode',
          lineNumbers: true, indentUnit: 4, tabSize: 4, lineWrapping: true,
        });
        cm.setSize('100%', 320);

        cm.on('inputRead', (inst, ch) => {
          if (ch.text && ch.text[0] === '-') {
            const cur = inst.getCursor(), line = inst.getLine(cur.line);
            if (lang !== 'python' && line.slice(cur.ch - 2, cur.ch) === '<-') inst.replaceRange('\u2190', { line: cur.line, ch: cur.ch - 2 }, { line: cur.line, ch: cur.ch });
          }
        });
        const emit = () => onChange(pack(cm.getValue()));
        onLang = () => { cm.setOption('mode', lang === 'python' ? 'python' : 'igcse-pseudocode'); noteText(); emit(); };
        cm.on('change', emit);
        setTimeout(() => cm.refresh(), 0);
        if (Ned.runPanel) Ned.runPanel(container, 'code', () => cm.getValue(), question, () => lang);

        return { update: (v) => cm.setValue((v && v.code) || ''), clear: () => { cm.setValue(''); emit(); }, destroy: () => { container.innerHTML = ''; } };
      } catch (e) {
        container.innerHTML = '';
        return buildTextarea();
      }
    });
})();