/* ─────────────────────────────────────────────────────────────
   Ned — the interface contract

   Every answer interface is a factory:

     createX(container, { question, value, onChange })
       → { update, clear, destroy }

   - container : the DOM node to render into
   - question  : { text, marks, config }  (config is interface-specific)
   - value     : the previously stored value, or null (for restore)
   - onChange  : call with the current value whenever it changes.
                 Emit ONLY the value. The wrapper adds ui + meta.
                 Empty answer = null, never an empty shape like { text:"" }.

   Return an object with:
     update(value)  reload a value (restore)
     clear()        reset to empty
     destroy()      remove listeners / DOM

   Interfaces register themselves here so the testbench can list them.
   ───────────────────────────────────────────────────────────── */

window.Ned = window.Ned || {};
Ned.registry = Ned.registry || {};

/* register(id, meta, factory)
   meta = { name, unlocks, samples:[ {label, question} ] }  */
Ned.register = function (id, meta, factory) {
  Ned.registry[id] = { id, meta, factory };
};

/* the stored answer shape the marker will read */
Ned.envelope = function (ui, value) {
  return { ui, value: value == null ? null : value, meta: {} };
};

/* small DOM helper — el('div', {class:'x'}, [child, 'text']) */
Ned.el = function (tag, attrs, kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.style.cssText = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k] === 'function')
      n.addEventListener(k.slice(2), attrs[k]);
    else n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(c =>
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
};
