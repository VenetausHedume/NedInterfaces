/* Universal MATH keyboard — one draggable unit (widget + keyboard together).
   Math-only: no letters, no spacebar. Your system keyboard types text; this
   widget inserts math (LaTeX) into a MathLive <math-field>: fractions, powers,
   super/subscripts, roots, integrals, trig, comparisons, brackets, digits.
   Global floating widget on every page. No interface registered here. */

(function () {

  const D  = (t, ins) => ({ t: t, ins: ins });
  const C  = (t, cmd) => ({ t: t, cmd: cmd });
  const FN = (name, t) => ({ t: t || name, ins: '\\' + name + '\\left(\\placeholder{}\\right)' });
  const IV = (name, t) => ({ t: t, ins: '\\' + name + '^{-1}\\left(\\placeholder{}\\right)' });
  const OP = (name, t) => ({ t: t, ins: '\\operatorname{' + name + '}\\left(\\placeholder{}\\right)' });
  const BS = C('\u232b', 'deleteBackward');
  const LT = C('\u2190', 'moveToPreviousChar');
  const RT = C('\u2192', 'moveToNextChar');
  const UP = C('\u2191', 'moveUp');
  const DN = C('\u2193', 'moveDown');

  const LAYERS = {
    math: [
      [ D('x\u00b2','^{2}'), D('x\u02b8','^{\\placeholder{}}'), D('x\u2093','_{\\placeholder{}}'),
        D('\u221a','\\sqrt{\\placeholder{}}'),
        D('7','7'), D('8','8'), D('9','9'), D('\u00f7','\\frac{\\placeholder{}}{\\placeholder{}}'),
        { t: 'f(x)', layer: 'fn' } ],
      [ D('(','('), D(')',')'), D('<','<'), D('>','>'),
        D('4','4'), D('5','5'), D('6','6'), D('\u00d7','\\times'), BS ],
      [ D('|a|','\\left|\\placeholder{}\\right|'), D(',',','), D('\u2264','\\le'), D('\u2265','\\ge'),
        D('1','1'), D('2','2'), D('3','3'), D('\u2212','-'), LT, UP, DN, RT ],
      [ D('\u03c0','\\pi'), D('\u03b8','\\theta'), D('\u2192','\\to'), D('\u21cc','\\rightleftharpoons'),
        D('0','0'), D('.','.'), D('=','='), D('+','+') ],
    ],
    fn: [
      [ { t: '\u2190 back', layer: 'math' } ],
      [ D('exp','e^{\\placeholder{}}'), FN('ln'), FN('log'),
        D('log\u2090','\\log_{\\placeholder{}}\\left(\\placeholder{}\\right)'),
        D('d/dx','\\frac{d}{dx}'), D("f'","'") ],
      [ D('\u222b','\\int_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}\\,\\mathrm{d}\\placeholder{}'),
        D('\u2211','\\sum_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}'),
        D('\u220f','\\prod_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}') ],
      [ FN('sin'), FN('cos'), FN('tan'), FN('csc'), FN('sec'), FN('cot') ],
      [ IV('sin','sin\u207b\u00b9'), IV('cos','cos\u207b\u00b9'), IV('tan','tan\u207b\u00b9'),
        IV('csc','csc\u207b\u00b9'), IV('sec','sec\u207b\u00b9'), IV('cot','cot\u207b\u00b9') ],
      [ FN('sinh'), FN('cosh'), FN('tanh'), OP('csch','csch'), OP('sech','sech'), FN('coth') ],
    ],
  };

  function buildWidget() {
    if (window.__nedKbWidget) return;

    const dock = document.createElement('div');
    dock.id = 'ned-kb-dock';
    dock.style.cssText =
      'position:fixed;top:90px;right:24px;display:flex;flex-direction:column;align-items:flex-end;' +
      'gap:8px;z-index:10000;';

    const fab = document.createElement('button'); fab.type = 'button'; fab.textContent = '\u2211'; fab.title = 'Math keyboard';
    fab.style.cssText =
      'width:54px;height:54px;border-radius:50%;border:none;background:#4682b4;color:#fff;' +
      'font-size:24px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';

    const panel = document.createElement('div');
    panel.style.cssText =
      'display:none;background:#fff;border:1px solid #d8cfb8;border-radius:10px;overflow:hidden;' +
      'box-shadow:0 10px 34px rgba(0,0,0,.30);transform-origin:top right;';

    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;gap:6px;padding:6px 10px;background:#4682b4;color:#fff;' +
      'user-select:none;font:14px system-ui,sans-serif;';
    const title = document.createElement('span'); title.textContent = 'Math'; title.style.flex = '1';
    const mkBtn = (t) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
      b.style.cssText = 'width:26px;height:24px;border:none;border-radius:5px;background:rgba(255,255,255,.25);color:#fff;cursor:pointer;font-size:15px;line-height:1;'; return b; };
    const smaller = mkBtn('\u2212'), bigger = mkBtn('+');
    header.append(title, smaller, bigger);

    const body = document.createElement('div');
    body.style.cssText = 'padding:8px;background:#f3eede;';
    panel.append(header, body);

    dock.append(fab, panel);
    document.body.appendChild(dock);

    let target = null;
    document.addEventListener('focusin', (e) => {
      const el = e.target; if (!el) return;
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'MATH-FIELD') && !dock.contains(el)) target = el;
    });
    function currentField() {
      if (target && document.contains(target)) return target;
      const a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'MATH-FIELD') && !dock.contains(a)) return a;
      return null;
    }
    function firstEditable() {
      const els = document.querySelectorAll('input,textarea,math-field');
      for (let i = 0; i < els.length; i++) if (!dock.contains(els[i])) return els[i];
      return null;
    }

    function insertText(el, s) {
      const start = el.selectionStart != null ? el.selectionStart : el.value.length;
      const end   = el.selectionEnd   != null ? el.selectionEnd   : el.value.length;
      el.value = el.value.slice(0, start) + s + el.value.slice(end);
      const pos = start + s.length;
      try { el.setSelectionRange(pos, pos); } catch (e) {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function inputCmd(el, cmd) {
      const s = el.selectionStart != null ? el.selectionStart : 0;
      const e = el.selectionEnd   != null ? el.selectionEnd   : 0;
      if (cmd === 'deleteBackward') {
        if (s === e && s > 0) { el.value = el.value.slice(0, s - 1) + el.value.slice(e); try { el.setSelectionRange(s - 1, s - 1); } catch (x) {} }
        else if (s !== e)     { el.value = el.value.slice(0, s) + el.value.slice(e);     try { el.setSelectionRange(s, s); } catch (x) {} }
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (cmd === 'moveToPreviousChar') { const p = Math.max(0, s - 1); try { el.setSelectionRange(p, p); } catch (x) {} }
      else if (cmd === 'moveToNextChar')       { const p = Math.min(el.value.length, e + 1); try { el.setSelectionRange(p, p); } catch (x) {} }
    }
    function press(def) {
      if (def.layer) { render(def.layer); return; }
      const el = currentField();
      if (!el) return;
      el.focus();
      if (el.tagName === 'MATH-FIELD') {
        try {
          if (def.cmd) { el.executeCommand(def.cmd); return; }
          if (def.ins == null) return;
          // if the field is in text mode, embed math as $...$ so prose stays prose
          let ins = def.ins, mode = 'math';
          try { mode = el.mode || (el.model && el.model.mode) || 'math'; } catch (e2) {}
          if (mode === 'text') ins = '$' + def.ins + '$';
          if (typeof el.insert === 'function') el.insert(ins, { focus: true, feedback: false, selectionMode: 'placeholder' });
          else el.executeCommand(['insert', ins]);
          // collapse any lingering selection so nothing stays highlighted
          try { el.executeCommand('moveToMathfieldEnd'); } catch (e3) {}
        } catch (e) {}
      } else {
        if (def.cmd) inputCmd(el, def.cmd);
        else insertText(el, def.t);
      }
    }

    function render(layerId) {
      body.innerHTML = '';
      LAYERS[layerId].forEach(rowDefs => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:5px;margin-bottom:5px;';
        rowDefs.forEach(def => {
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = def.t; b.tabIndex = -1;
          b.style.cssText =
            'min-width:38px;height:38px;padding:0 8px;border:1px solid #d8cfb8;border-radius:6px;' +
            'background:#fffdf7;cursor:pointer;font:16px system-ui,sans-serif;flex:1;' +
            (def.layer ? 'background:#eaf1f8;border-color:#4682b4;font-size:13px;' : '');
          b.addEventListener('mousedown', (e) => { e.preventDefault(); press(def); });
          row.appendChild(b);
        });
        body.appendChild(row);
      });
    }
    render('math');

    let scale = 1;
    const applyScale = () => { panel.style.transform = 'scale(' + scale + ')'; };
    bigger.onmousedown  = (e) => { e.stopPropagation(); e.preventDefault(); scale = Math.min(2, scale + 0.1); applyScale(); };
    smaller.onmousedown = (e) => { e.stopPropagation(); e.preventDefault(); scale = Math.max(0.6, scale - 0.1); applyScale(); };

    let on = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
    const move = (e) => {
      if (!on) return;
      if (Math.abs(e.clientX - sx) > 3 || Math.abs(e.clientY - sy) > 3) moved = true;
      dock.style.left = (ox + e.clientX - sx) + 'px';
      dock.style.top  = (oy + e.clientY - sy) + 'px';
    };
    const up = () => {
      if (!on) return;
      on = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
      if (!moved) {
        if (panel.style.display === 'none') {
          panel.style.display = 'block';
          // only grab a field if the user isn't already in one
          const active = document.activeElement;
          const inField = active && (active.tagName === 'MATH-FIELD' || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !dock.contains(active);
          if (!inField && !currentField()) { const f = firstEditable(); if (f) { f.focus(); target = f; } }
        } else panel.style.display = 'none';
      }
    };
    fab.addEventListener('mousedown', (e) => {
      const r = dock.getBoundingClientRect();
      ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY; moved = false; on = true;
      dock.style.right = 'auto'; dock.style.left = ox + 'px'; dock.style.top = oy + 'px';
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      e.preventDefault();
    });

    window.__nedKbWidget = { dock, fab, panel };
  }

  buildWidget();

})();
