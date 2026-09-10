/* Math input — live math field + a custom Desmos-style on-screen keyboard.
   Powered by MathLive. Requires it in index.html:
     <script src="https://cdn.jsdelivr.net/npm/mathlive"></script>

   The keyboard has three layers matching the Desmos layout:
     - math  : variables, powers, brackets, comparisons, numpad, operators
     - abc   : letters + a couple of Greek
     - fn     : CALCUL (exp/ln/log/…, ∫ ∑ ∏), trig, inverse trig, hyperbolic
   In-keyboard buttons switch between them (ABC / functions / 123-back).

   Real-math behaviour (not Unicode):
     ÷ makes a fraction · √ a radical · powers stack · ∫ ∑ ∏ get bounds.
   Saves { latex } or null. */

(function () {

  // ---- keycap helpers ---------------------------------------------------
  // #@ = current selection / char before cursor ; #? = an editable placeholder
  const fn   = (name, disp) => ({ latex: disp || '\\' + name, insert: '\\' + name + '\\left(#?\\right)' });
  const op   = (name, disp) => ({ latex: disp, insert: '\\operatorname{' + name + '}\\left(#?\\right)' });
  const inv  = (base, disp) => ({ latex: disp, insert: '\\' + base + '^{-1}\\left(#?\\right)' });
  const key  = (k) => ({ latex: k });
  const act  = (label, cmd) => ({ label: label, class: 'action', command: cmd });
  const sw   = (label, layer) => ({ label: label, class: 'action', command: ['switchKeyboardLayer', layer] });

  function installNedKeyboard() {
    if (window.__nedKbInstalled || !window.mathVirtualKeyboard) return;

    const mathLayer = {
      id: 'ned-math',
      rows: [
        [ key('x'), key('y'),
          { latex: 'a^2', insert: '#@^2' },
          { latex: 'a^b', insert: '#@^{#?}' },
          key('7'), key('8'), key('9'),
          { latex: '\\div', insert: '\\frac{#@}{#?}' },
          sw('functions', 'ned-fn') ],

        [ key('('), key(')'), key('<'), key('>'),
          key('4'), key('5'), key('6'),
          { latex: '\\times' },
          act('\u232b', ['performWithFeedback', 'deleteBackward']) ],

        [ { latex: '|a|', insert: '\\left|#@\\right|' },
          key(','), { latex: '\\le' }, { latex: '\\ge' },
          key('1'), key('2'), key('3'),
          { latex: '-' },
          act('\u2190', ['performWithFeedback', 'moveToPreviousChar']),
          act('\u2192', ['performWithFeedback', 'moveToNextChar']) ],

        [ { latex: '\\sqrt{#?}' },
          { latex: '\\pi' },
          sw('ABC', 'ned-abc'),
          key('0'), key('.'), key('='),
          { latex: '+' },
          act('\u21b5', ['performWithFeedback', 'commit']) ],
      ],
    };

    const abcLayer = {
      id: 'ned-abc',
      rows: [
        [ key('q'), key('w'), key('e'), key('r'), key('t'), key('y'), key('u'), key('i'), key('o'), key('p') ],
        [ key('a'), key('s'), key('d'), key('f'), key('g'), key('h'), key('j'), key('k'), key('l'), { latex: '\\theta' } ],
        [ key('z'), key('x'), key('c'), key('v'), key('b'), key('n'), key('m'),
          key('('), key(')'),
          act('\u232b', ['performWithFeedback', 'deleteBackward']) ],
        [ sw('123', 'ned-math'), { latex: '\\pi' }, key(','), key('='),
          act('\u2190', ['performWithFeedback', 'moveToPreviousChar']),
          act('\u2192', ['performWithFeedback', 'moveToNextChar']),
          act('\u21b5', ['performWithFeedback', 'commit']) ],
      ],
    };

    const fnLayer = {
      id: 'ned-fn',
      rows: [
        [ sw('\u2190 123', 'ned-math') ],
        [ { label: 'exp', insert: 'e^{#?}' },
          fn('ln'), fn('log'),
          { latex: '\\log_a', insert: '\\log_{#?}\\left(#?\\right)' },
          { latex: '\\frac{d}{dx}' },
          { latex: "f'", insert: "#@'" } ],
        [ { latex: '\\int', insert: '\\int_{#?}^{#?}#?\\,\\mathrm{d}#?' },
          { latex: '\\sum', insert: '\\sum_{#?}^{#?}#?' },
          { latex: '\\prod', insert: '\\prod_{#?}^{#?}#?' } ],
        [ fn('sin'), fn('cos'), fn('tan'), fn('csc'), fn('sec'), fn('cot') ],
        [ inv('sin', '\\sin^{-1}'), inv('cos', '\\cos^{-1}'), inv('tan', '\\tan^{-1}'),
          inv('csc', '\\csc^{-1}'), inv('sec', '\\sec^{-1}'), inv('cot', '\\cot^{-1}') ],
        [ fn('sinh'), fn('cosh'), fn('tanh'), op('csch', '\\text{csch}'), op('sech', '\\text{sech}'), fn('coth') ],
      ],
    };

    window.mathVirtualKeyboard.layouts = [
      { label: 'Ned', tooltip: 'Ned math keyboard', layers: [mathLayer, abcLayer, fnLayer] },
    ];
    window.__nedKbInstalled = true;
  }

  // ---- the interface ----------------------------------------------------
  Ned.register('math',
    {
      name: 'Math input',
      unlocks: 'maths & calculations',
      samples: [
        { label: 'Solve a quadratic',
          question: { text: 'Solve for x:  x\u00b2 \u2212 5x + 6 = 0', marks: 3, config: {} } },
        { label: 'Differentiate',
          question: { text: 'Find dy/dx for  y = x\u00b3 + 2x', marks: 2, config: {} } },
        { label: 'Evaluate an integral',
          question: { text: 'Evaluate  \u222b 2x dx', marks: 2, config: {} } },
      ],
    },
    function (container, { question, value, onChange }) {
      const ready = window.customElements && customElements.get('math-field');
      if (!ready) {
        container.appendChild(Ned.el('p', { class: 'ned-note' },
          ['MathLive isn\u2019t loaded. Add its <script> to index.html (see README), then reload.']));
        return { update() {}, clear() {}, destroy() { container.innerHTML = ''; } };
      }

      installNedKeyboard();

      const mf = document.createElement('math-field');
      mf.style.cssText =
        'display:block;width:100%;max-width:640px;font-size:1.4rem;padding:10px;' +
        'border:1px solid var(--line);border-radius:6px;background:#fffdf7;';
      mf.mathVirtualKeyboardPolicy = 'manual';
      if (value && value.latex) mf.value = value.latex;

      const emit = () => {
        const latex = mf.value.trim();
        onChange(latex === '' ? null : { latex });
      };
      mf.addEventListener('input', emit);

      const kbBtn = Ned.el('button', { type: 'button', class: 'ned-mode',
        onclick: () => {
          const vk = window.mathVirtualKeyboard;
          if (vk.visible) { vk.hide(); }
          else { mf.focus(); vk.show(); }
        } }, ['\u2328 keyboard']);

      container.appendChild(Ned.el('div', { class: 'ned-modebar' }, [kbBtn]));
      container.appendChild(mf);
      container.appendChild(Ned.el('p', { class: 'ned-note' },
        ['Type on your keyboard (renders live), or tap \u2328 for the on-screen keys \u2014 ABC / functions switch views.']));

      return {
        update: (v) => { mf.value = (v && v.latex) || ''; },
        clear:  () => { mf.value = ''; emit(); mf.focus(); },
        destroy: () => {
          try { window.mathVirtualKeyboard.hide(); } catch (e) {}
          container.innerHTML = '';
        },
      };
    });

})();
