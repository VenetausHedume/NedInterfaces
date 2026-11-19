/* Python runner for answers written in Python instead of pseudocode (the syllabus allows "pseudocode or program code").
   Uses Skulpt (a Python 3 interpreter written in JavaScript), so nothing is sent anywhere and no API key is needed.

   NedPython.run(code, inputs, limit, files) -> { ok, output:[lines], error?:{ line, message }, files }
     same shape as NedPseudo.run, so the code marker treats both languages alike.
     inputs : values handed to input() in order (the prompt text is not printed, as in an exam trace)
     files  : { 'Names.txt':[lines] } readable with open(); files written with open(name, 'w'|'a') come back in .files
   NedPython.features(code) -> { loop, selection, input, output, array, totalling, counting, procedure, file, … }
   NedPython.available()    -> true once Skulpt is loaded

   Browser: load skulpt.min.js and skulpt-stdlib.js (jsDelivr, skulpt@1.2.0) before this file.
   Node:    npm install skulpt@1.2.0 (this file loads it on first use). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(null);
  else root.NedPython = factory(root);
})(typeof self !== 'undefined' ? self : this, function (win) {
  'use strict';

  function sk() {
    if (win) return win.Sk || null;
    if (typeof global !== 'undefined' && global.Sk) return global.Sk;
    try {
      const had = 'window' in global;
      if (!had) global.window = global;            // Skulpt's bundle expects a window object
      require('skulpt/dist/skulpt.min.js'); require('skulpt/dist/skulpt-stdlib.js');
      if (!had) delete global.window;
      return global.Sk || null;
    } catch (e) { return null; }
  }
  function available() { return !!sk(); }

  function friendly(msg) {
    return String(msg)
      .replace(/^TimeLimitError: Program exceeded run time limit\./, 'The program ran for too long. A loop probably never ends.')
      .replace(/^NameError: name '([^']+)' is not defined/, '"$1" is used before it has been given a value (or is misspelt).')
      .replace(/^EOFError.*/, 'The program asked for more input than it was given.')
      .replace(/^IndentationError: (.*)/, 'Indentation problem: $1. Lines inside a loop or IF must be indented by the same amount.')
      .replace(/ on line \d+$/, '');
  }

  const pyLit = v => Array.isArray(v) ? '[' + v.map(pyLit).join(', ') + ']' : typeof v === 'string' ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? 'True' : 'False') : v == null ? 'None' : String(v);
  /* opts: { given:{ Name: value } set before the program (lists start at 0, as Python students write them), vars:[names] read after it } */
  function run(code, inputs, limit, files, opts) {
    const given = (opts && opts.given) || {}, want = (opts && opts.vars) || [];
    const pre = Object.keys(given).map(k => k + ' = ' + pyLit(given[k])).join('\n');
    const post = want.map(k => `\ntry:\n    print("\\x01VAR", ${JSON.stringify(k)}, repr(${k}))\nexcept Exception:\n    print("\\x01VAR", ${JSON.stringify(k)}, "None")`).join('');
    const r = runRaw((pre ? pre + '\n' : '') + String(code).replace(/\t/g, '    ') + post, inputs, limit, files);
    const shift = pre ? pre.split('\n').length : 0;
    if (r.error && r.error.line) r.error.line = Math.max(1, r.error.line - shift);
    const vars = {}; r.output = r.output.filter(l => { const m = l.match(/^\x01VAR (\S+) (.*)$/); if (!m) return true; vars[m[1]] = pyValue(m[2]); return false; });
    r.vars = vars; return r;
  }
  function pyValue(t) {
    try { return JSON.parse(t.replace(/'/g, '"').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null')); } catch (e) { return t === 'None' ? null : t; }
  }
  function runRaw(code, inputs, limit, files) {
    const Sk = sk();
    if (!Sk) return { ok: false, output: [], error: { line: null, message: 'The Python runner did not load.' }, files: {} };
    let out = '';
    const queue = (inputs || []).map(String);
    const store = {}; Object.keys(files || {}).forEach(k => { store[k] = (files[k] || []).map(String); });
    const written = new WeakSet(), buf = {};
    let ranOut = false, used = 0;
    const wasBrowser = Sk.inBrowser;
    Sk.inBrowser = false;                              // open() then reads through Sk.read, i.e. our files
    Sk.configure({
      output: t => { out += t; },
      read: name => {
        if (Object.prototype.hasOwnProperty.call(store, name)) return store[name].length ? store[name].join('\n') + '\n' : '';
        if (Sk.builtinFiles && Sk.builtinFiles.files[name] !== undefined) return Sk.builtinFiles.files[name];
        if (/^(src\/|\.\/)/.test(name) || /\.(py|js)$/.test(name)) throw new Sk.builtin.ImportError('No module named ' + name);
        return '';                                     // a new file about to be written
      },
      filewrite: (fileObj, str) => {
        const name = Sk.ffi.remapToJs(fileObj.name), mode = Sk.ffi.remapToJs(fileObj.mode);
        if (!written.has(fileObj)) { written.add(fileObj); buf[name] = mode[0] === 'a' && store[name] && store[name].length ? store[name].join('\n') + '\n' : ''; }
        buf[name] += Sk.ffi.remapToJs(str);
      },
      inputfun: () => { if (!queue.length) { ranOut = true; throw new Sk.builtin.EOFError('EOF when reading a line'); } used++; return queue.shift(); },
      inputfunTakesPrompt: true, nonreadopen: true,
      __future__: Sk.python3,
      execLimit: limit || 3000,
    });
    const finish = () => {
      Object.keys(buf).forEach(k => { const t = buf[k].replace(/\n$/, ''); store[k] = t === '' ? [] : t.split('\n'); });
      const lines = out.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
      return { lines, files: Object.fromEntries(Object.keys(store).map(k => [k, store[k].slice()])) };
    };
    try {
      Sk.importMainWithBody('<stdin>', false, String(code).replace(/\t/g, '    '), false);
      const f = finish(); Sk.inBrowser = wasBrowser;
      return { ok: true, output: f.lines, files: f.files, used };
    } catch (e) {
      const f = finish(); Sk.inBrowser = wasBrowser;
      const line = (e && e.traceback && e.traceback[0] && e.traceback[0].lineno) || null;
      const message = ranOut ? 'The program asked for more input than it was given.' : friendly(e && e.toString ? e.toString() : e);
      return { ok: false, output: f.lines, error: { line, message }, files: f.files, used };
    }
  }

  /* what the code contains, read from the words (still works when it does not run) */
  function features(code) {
    const s = '\n' + String(code).replace(/#.*$/gm, '').replace(/"[^"\n]*"|'[^'\n]*'/g, '""') + '\n';
    const has = re => re.test(s);
    return {
      loop: has(/\n\s*(for|while)\b/), forLoop: has(/\n\s*for\b/), whileLoop: has(/\n\s*while\b/), repeatLoop: has(/\n\s*while\s+True\b/),
      selection: has(/\n\s*(if|elif|match)\b/), input: has(/\binput\s*\(/) || has(/\bopen\s*\(/), output: has(/\bprint\s*\(/),
      array: has(/[A-Za-z_]\w*\s*\[[^\]]+\]/) || has(/\[\s*\]/) || has(/\.append\s*\(/), procedure: has(/\n\s*def\s+\w+/),
      file: has(/\bopen\s*\(/),
      totalling: /([A-Za-z_]\w*)\s*\+=\s*(?!1\b)[A-Za-z_(]/.test(s) || /([A-Za-z_]\w*)\s*=\s*\1\s*\+\s*(?!1\b)[A-Za-z_(]/.test(s),
      counting: /([A-Za-z_]\w*)\s*\+=\s*1\b/.test(s) || /([A-Za-z_]\w*)\s*=\s*\1\s*\+\s*1\b/.test(s),
    };
  }

  return { run, features, available };
});
