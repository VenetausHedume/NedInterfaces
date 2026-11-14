/* Shared answer field — the same MathLive box the Text interface uses, with a plain-input fallback.
   Ned.field({ multiline, width, label, placeholder, value, onInput }) -> { el, get(), set(v), focus() }
   get() returns LaTeX when MathLive is loaded, plain text otherwise; the markers read both. */
(function () {
  const hasMath = () => window.customElements && customElements.get('math-field');
  /* Make a MathLive field behave like a normal text box for words: no auto-conversion of "in", "and", "lt", "ch"…
     into maths symbols, and the space bar types a space. MathLive only keeps these settings once the field is on
     the page, so they are applied now, when it mounts, and on the next frame. */
  Ned.plainTyping = function (mf) {
    const apply = () => { try { mf.inlineShortcuts = {}; } catch (e) {} try { mf.mathModeSpace = '\\;'; } catch (e) {} try { mf.menuItems = []; } catch (e) {} try { mf.smartFence = false; } catch (e) {} };
    apply(); mf.addEventListener('mount', apply);
    if (window.requestAnimationFrame) requestAnimationFrame(apply);
    setTimeout(apply, 0);
  };
  Ned.field = function (o) {
    o = o || {};
    let el;
    if (hasMath() && !o.plain) {
      el = document.createElement('math-field');
      el.style.cssText = 'display:block;width:' + (o.width || '100%') + ';max-width:100%;font-size:' + (o.fontSize || '1.15rem') + ';padding:7px 9px;' +
        'min-height:' + (o.multiline ? '4.2rem' : '2.4rem') + ';border:1px solid var(--line);border-radius:6px;background:#fffdf7;';
      el.mathVirtualKeyboardPolicy = 'manual';
      Ned.plainTyping(el);
    } else {
      el = document.createElement(o.multiline ? 'textarea' : 'input');
      if (!o.multiline) el.type = 'text'; else el.rows = 3;
      el.className = 'ned-input';
      el.style.cssText = 'display:block;width:' + (o.width || '100%') + ';max-width:100%;' + (o.multiline ? 'resize:vertical;' : '');
      if (o.placeholder) el.placeholder = o.placeholder;
    }
    if (o.label) el.setAttribute('aria-label', o.label);
    if (o.value) el.value = o.value;
    if (o.onInput) el.addEventListener('input', () => o.onInput(el.value));
    return { el, get: () => (el.value || '').trim(), set: (v) => { el.value = v || ''; }, focus: () => el.focus() };
  };
  /* a small caption above a control */
  Ned.labelled = function (text, node) {
    return Ned.el('label', { style: 'display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);' }, [Ned.el('span', {}, [text]), node]);
  };
})();
