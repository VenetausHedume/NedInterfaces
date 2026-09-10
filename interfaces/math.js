/* Math input (MathLive) + a self-built, draggable floating keyboard.
   Movement modelled on the uploaded virtual-keyboard.js: a small draggable
   widget that opens a draggable, scalable panel with three views
   (math / abc / functions). Keys drive the MathLive field via .insert().
   Requires MathLive in index.html. Saves { latex } or null. */

(function () {

  // ---------- keyboard layout ----------
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
      [ D('x','x'), D('y','y'), D('x\u00b2','^{2}'), D('x\u02b8','^{\\placeholder{}}'),
        D('7','7'), D('8','8'), D('9','9'), D('\u00f7','\\frac{\\placeholder{}}{\\placeholder{}}'),
        { t: 'functions', layer: 'fn' } ],
      [ D('(','('), D(')',')'), D('<','<'), D('>','>'),
        D('4','4'), D('5','5'), D('6','6'), D('\u00d7','\\times'), BS ],
      [ D('|a|','\\left|\\placeholder{}\\right|'), D(',',','), D('\u2264','\\le'), D('\u2265','\\ge'),
        D('1','1'), D('2','2'), D('3','3'), D('\u2212','-'), LT, UP, DN, RT ],
      [ D('\u221a','\\sqrt{\\placeholder{}}'), D('\u03c0','\\pi'), { t: 'ABC', layer: 'abc' },
        D('0','0'), D('.','.'), D('=','='), D('+','+') ],
    ],
    abc: [
      'qwertyuiop'.split('').map(c => D(c, c)),
      'asdfghjkl'.split('').map(c => D(c, c)).concat([ D('\u03b8','\\theta') ]),
      'zxcvbnm'.split('').map(c => D(c, c)).concat([ D('(','('), D(')',')'), BS ]),
      [ { t: '123', layer: 'math' }, D('\u03c0','\\pi'), D(',',','), D('=','='),
        D('space','\\;'), LT, DN, RT ],
    ],
    fn: [
      [ { t: '\u2190 123', layer: 'math' } ],
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

    let activeField = null;
    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.tagName === 'MATH-FIELD') activeField = e.target;
    });
    const field = () => activeField || document.querySelector('math-field');

    // send a keypress to the math field  (THIS is the fix: use .insert())
    function typeInto(def) {
      const f = field();
      if (!f) return;
      f.focus();
      try {
        if (def.cmd) { f.executeCommand(def.cmd); return; }
        if (def.ins == null) return;
        if (typeof f.insert === 'function') f.insert(def.ins, { focus: true, feedback: false });
        else f.executeCommand(['insert', def.ins]);
      } catch (e) {
        try { f.executeCommand(['insert', def.ins]); } catch (e2) {}
      }
    }

    // ----- panel -----
    const panel = document.createElement('div');
    panel.id = 'ned-kb-panel';
    panel.style.cssText =
      'position:fixed;left:auto;right:24px;top:auto;bottom:90px;display:none;' +
      'background:#fff;border:1px solid #d8cfb8;border-radius:10px;overflow:hidden;' +
      'box-shadow:0 10px 34px rgba(0,0,0,.30);z-index:10000;transform-origin:top left;';

    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;gap:6px;padding:6px 10px;background:#4682b4;' +
      'color:#fff;cursor:move;user-select:none;font:14px system-ui,sans-serif;';
    const title = document.createElement('span'); title.textContent = '\u2328 Keyboard'; title.style.flex = '1';
    const mkBtn = (t) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
      b.style.cssText = 'width:26px;height:24px;border:none;border-radius:5px;background:rgba(255,255,255,.25);color:#fff;cursor:pointer;font-size:15px;line-height:1;'; return b; };
    const smaller = mkBtn('\u2212'), bigger = mkBtn('+'), closeB = mkBtn('\u2715');
    header.append(title, smaller, bigger, closeB);

    const body = document.createElement('div');
    body.style.cssText = 'padding:8px;background:#f3eede;';
    panel.append(header, body);
    document.body.appendChild(panel);

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
          b.addEventListener('mousedown', (e) => {
            e.preventDefault();                      // keep field focused
            if (def.layer) render(def.layer);
            else typeInto(def);
          });
          row.appendChild(b);
        });
        body.appendChild(row);
      });
    }
    render('math');

    // ----- scale -----
    let scale = 1;
    const applyScale = () => { panel.style.transform = 'scale(' + scale + ')'; };
    bigger.onclick  = (e) => { e.stopPropagation(); scale = Math.min(2, scale + 0.1); applyScale(); };
    smaller.onclick = (e) => { e.stopPropagation(); scale = Math.max(0.6, scale - 0.1); applyScale(); };

    // ----- drag panel by header -----
    function dragify(handle, target, skipButtons) {
      let on = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
      const move = (e) => {
        if (!on) return;
        if (Math.abs(e.clientX - sx) > 3 || Math.abs(e.clientY - sy) > 3) moved = true;
        target.style.left = (ox + e.clientX - sx) + 'px';
        target.style.top  = (oy + e.clientY - sy) + 'px';
      };
      let upCb = null;
      const up = () => { on = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); if (upCb) upCb(moved); };
      handle.addEventListener('mousedown', (e) => {
        if (skipButtons && e.target.tagName === 'BUTTON') return;
        const r = target.getBoundingClientRect();
        ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY; moved = false; on = true;
        target.style.right = 'auto'; target.style.bottom = 'auto';
        target.style.left = ox + 'px'; target.style.top = oy + 'px';
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        e.preventDefault();
      });
      return { setUp: (cb) => { upCb = cb; } };
    }
    dragify(header, panel, true);

    // ----- FAB (draggable + click to toggle) -----
    const fab = document.createElement('button'); fab.id = 'ned-kb-fab'; fab.type = 'button';
    fab.textContent = '\u2328'; fab.title = 'Keyboard';
    fab.style.cssText =
      'position:fixed;right:24px;bottom:24px;width:54px;height:54px;border-radius:50%;border:none;' +
      'background:#4682b4;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:10000;';
    const toggle = () => {
      if (panel.style.display === 'none') { panel.style.display = 'block'; const f = field(); if (f) f.focus(); }
      else { panel.style.display = 'none'; }
    };
    const fabDrag = dragify(fab, fab, false);
    fabDrag.setUp((moved) => { if (!moved) toggle(); });   // click (no drag) = toggle
    document.body.appendChild(fab);

    closeB.onclick = (e) => { e.stopPropagation(); panel.style.display = 'none'; };

    window.__nedKbWidget = { panel, fab };
  }

  buildWidget();

  // ---------- the math interface ----------
  Ned.register('math',
    {
      name: 'Math input',
      unlocks: 'maths & calculations',
      samples: [
        { label: 'Solve a quadratic', question: { text: 'Solve for x:  x\u00b2 \u2212 5x + 6 = 0', marks: 3, config: {} } },
        { label: 'Differentiate',     question: { text: 'Find dy/dx for  y = x\u00b3 + 2x', marks: 2, config: {} } },
        { label: 'Evaluate an integral', question: { text: 'Evaluate  \u222b 2x dx', marks: 2, config: {} } },
      ],
    },
    function (container, { question, value, onChange }) {
      const ready = window.customElements && customElements.get('math-field');
      if (!ready) {
        container.appendChild(Ned.el('p', { class: 'ned-note' },
          ['MathLive isn\u2019t loaded. Add its <script> to index.html, then reload.']));
        return { update() {}, clear() {}, destroy() { container.innerHTML = ''; } };
      }

      const mf = document.createElement('math-field');
      mf.style.cssText =
        'display:block;width:100%;max-width:640px;font-size:1.4rem;padding:10px;' +
        'border:1px solid var(--line);border-radius:6px;background:#fffdf7;';
      mf.mathVirtualKeyboardPolicy = 'manual';
      if (value && value.latex) mf.value = value.latex;

      const emit = () => { const l = mf.value.trim(); onChange(l === '' ? null : { latex: l }); };
      mf.addEventListener('input', emit);

      container.appendChild(mf);
      try { mf.inlineShortcuts = {}; } catch (e) {}
      try { mf.mathModeSpace = '\\;'; } catch (e) {}

      container.appendChild(Ned.el('p', { class: 'ned-note' },
        ['Type here (renders live), or use the floating \u2328 keyboard \u2014 drag it, +/\u2212 scales it.']));

      return {
        update:  (v) => { mf.value = (v && v.latex) || ''; },
        clear:   () => { mf.value = ''; emit(); mf.focus(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });

})();
