/* Math input (MathLive) + a GLOBAL floating keyboard widget.
   The widget: a small draggable box on every page; click to open a compact
   floating keyboard (not the full-width bar); +/- scales its size.
   Requires MathLive in index.html.
   Real-math: ÷ fraction · √ radical · powers stack · ∫ ∑ ∏ bounds.
   Saves { latex } or null. */

(function () {

  // ---------- keycap helpers ----------
  const fn   = (name, disp) => ({ latex: disp || '\\' + name, insert: '\\' + name + '\\left(#?\\right)' });
  const op   = (name, disp) => ({ latex: disp, insert: '\\operatorname{' + name + '}\\left(#?\\right)' });
  const inv  = (base, disp) => ({ latex: disp, insert: '\\' + base + '^{-1}\\left(#?\\right)' });
  const key  = (k) => ({ latex: k });
  const act  = (label, cmd) => ({ label: label, class: 'action', command: cmd });
  const sw   = (label, layer) => ({ label: label, class: 'action', command: ['switchKeyboardLayer', layer] });

  function installLayouts() {
    if (window.__nedKbLayouts || !window.mathVirtualKeyboard) return;
    try {
      const mathLayer = { id: 'ned-math', rows: [
        [ key('x'), key('y'), { latex: 'a^2', insert: '#@^2' }, { latex: 'a^b', insert: '#@^{#?}' },
          key('7'), key('8'), key('9'), { latex: '\\div', insert: '\\frac{#@}{#?}' }, sw('functions', 'ned-fn') ],
        [ key('('), key(')'), key('<'), key('>'), key('4'), key('5'), key('6'), { latex: '\\times' },
          act('\u232b', ['performWithFeedback', 'deleteBackward']) ],
        [ { latex: '|a|', insert: '\\left|#@\\right|' }, key(','), { latex: '\\le' }, { latex: '\\ge' },
          key('1'), key('2'), key('3'), { latex: '-' },
          act('\u2190', ['performWithFeedback', 'moveToPreviousChar']), act('\u2192', ['performWithFeedback', 'moveToNextChar']) ],
        [ { latex: '\\sqrt{#?}' }, { latex: '\\pi' }, sw('ABC', 'ned-abc'),
          key('0'), key('.'), key('='), { latex: '+' }, act('\u21b5', ['performWithFeedback', 'commit']) ],
      ] };
      const abcLayer = { id: 'ned-abc', rows: [
        [ key('q'), key('w'), key('e'), key('r'), key('t'), key('y'), key('u'), key('i'), key('o'), key('p') ],
        [ key('a'), key('s'), key('d'), key('f'), key('g'), key('h'), key('j'), key('k'), key('l'), { latex: '\\theta' } ],
        [ key('z'), key('x'), key('c'), key('v'), key('b'), key('n'), key('m'), key('('), key(')'),
          act('\u232b', ['performWithFeedback', 'deleteBackward']) ],
        [ sw('123', 'ned-math'), { latex: '\\pi' }, key(','), key('='), { label: 'space', class: 'action', latex: '\\;' },
          act('\u2190', ['performWithFeedback', 'moveToPreviousChar']), act('\u2192', ['performWithFeedback', 'moveToNextChar']),
          act('\u21b5', ['performWithFeedback', 'commit']) ],
      ] };
      const fnLayer = { id: 'ned-fn', rows: [
        [ sw('\u2190 123', 'ned-math') ],
        [ { label: 'exp', insert: 'e^{#?}' }, fn('ln'), fn('log'),
          { latex: '\\log_a', insert: '\\log_{#?}\\left(#?\\right)' }, { latex: '\\frac{d}{dx}' }, { latex: "f'", insert: "#@'" } ],
        [ { latex: '\\int', insert: '\\int_{#?}^{#?}#?\\,\\mathrm{d}#?' },
          { latex: '\\sum', insert: '\\sum_{#?}^{#?}#?' }, { latex: '\\prod', insert: '\\prod_{#?}^{#?}#?' } ],
        [ fn('sin'), fn('cos'), fn('tan'), fn('csc'), fn('sec'), fn('cot') ],
        [ inv('sin', '\\sin^{-1}'), inv('cos', '\\cos^{-1}'), inv('tan', '\\tan^{-1}'),
          inv('csc', '\\csc^{-1}'), inv('sec', '\\sec^{-1}'), inv('cot', '\\cot^{-1}') ],
        [ fn('sinh'), fn('cosh'), fn('tanh'), op('csch', '\\text{csch}'), op('sech', '\\text{sech}'), fn('coth') ],
      ] };
      window.mathVirtualKeyboard.layouts = [
        { label: 'Ned', tooltip: 'Ned math keyboard', layers: [mathLayer, abcLayer, fnLayer] },
      ];
      window.__nedKbLayouts = true;
    } catch (e) {}
  }

  // ---------- the global floating keyboard widget (built once) ----------
  function buildWidget() {
    if (window.__nedKbWidget || !window.mathVirtualKeyboard) return;
    try {
      const panel = document.createElement('div');
      panel.id = 'ned-kb-panel';
      panel.style.cssText =
        'position:fixed;right:24px;bottom:90px;width:500px;max-width:92vw;display:none;' +
        'background:#fff;border:1px solid #d8cfb8;border-radius:10px;overflow:hidden;' +
        'box-shadow:0 10px 34px rgba(0,0,0,.30);z-index:10000;transform-origin:center bottom;';

      const header = document.createElement('div');
      header.style.cssText =
        'display:flex;align-items:center;gap:6px;padding:6px 10px;background:#4682b4;' +
        'color:#fff;cursor:move;user-select:none;font:14px system-ui,sans-serif;';
      const title = document.createElement('span'); title.textContent = '\u2328 Keyboard'; title.style.flex = '1';
      const btn = (t) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        b.style.cssText = 'width:26px;height:24px;border:none;border-radius:5px;background:rgba(255,255,255,.25);color:#fff;cursor:pointer;font-size:15px;line-height:1;'; return b; };
      const smaller = btn('\u2212'), bigger = btn('+'), closeB = btn('\u2715');
      header.appendChild(title); header.appendChild(smaller); header.appendChild(bigger); header.appendChild(closeB);

      const mount = document.createElement('div'); mount.id = 'ned-kb-mount';
      panel.appendChild(header); panel.appendChild(mount);
      document.body.appendChild(panel);

      try { window.mathVirtualKeyboard.container = mount; } catch (e) {}

      // scale
      let scale = 1;
      const applyScale = () => { panel.style.transform = 'scale(' + scale + ')'; };
      bigger.onclick  = (e) => { e.stopPropagation(); scale = Math.min(1.8, scale + 0.1); applyScale(); };
      smaller.onclick = (e) => { e.stopPropagation(); scale = Math.max(0.6, scale - 0.1); applyScale(); };

      // drag by header
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      header.addEventListener('pointerdown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true; sx = e.clientX; sy = e.clientY;
        const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.left = ox + 'px'; panel.style.top = oy + 'px';
        try { header.setPointerCapture(e.pointerId); } catch (e2) {}
      });
      header.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        panel.style.left = (ox + e.clientX - sx) + 'px';
        panel.style.top  = (oy + e.clientY - sy) + 'px';
      });
      const endDrag = () => { dragging = false; };
      header.addEventListener('pointerup', endDrag);
      header.addEventListener('pointercancel', endDrag);

      // FAB
      const fab = document.createElement('button'); fab.id = 'ned-kb-fab'; fab.type = 'button';
      fab.textContent = '\u2328'; fab.title = 'Keyboard';
      fab.style.cssText =
        'position:fixed;right:24px;bottom:24px;width:54px;height:54px;border-radius:50%;border:none;' +
        'background:#4682b4;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:10000;';
      const open  = () => { panel.style.display = 'block'; try { window.mathVirtualKeyboard.show(); } catch (e) {} };
      const close = () => { panel.style.display = 'none';  try { window.mathVirtualKeyboard.hide(); } catch (e) {} };
      fab.onclick = () => { panel.style.display === 'none' ? open() : close(); };
      closeB.onclick = (e) => { e.stopPropagation(); close(); };
      document.body.appendChild(fab);

      window.__nedKbWidget = { panel, fab, open, close };
    } catch (e) {}
  }

  // build once MathLive is available (script loads before this, but be safe)
  (function whenReady() {
    if (window.mathVirtualKeyboard) { installLayouts(); buildWidget(); return; }
    let n = 0; const t = setInterval(() => {
      if (window.mathVirtualKeyboard) { clearInterval(t); installLayouts(); buildWidget(); }
      else if (++n > 50) clearInterval(t);
    }, 100);
  })();

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
        ['Type here (renders live). Tap the floating \u2328 (bottom-right) for the on-screen keyboard \u2014 drag it, and +/\u2212 scales it.']));

      return {
        update:  (v) => { mf.value = (v && v.latex) || ''; },
        clear:   () => { mf.value = ''; emit(); mf.focus(); },
        destroy: () => { container.innerHTML = ''; },   // widget is global, stays put
      };
    });

})();