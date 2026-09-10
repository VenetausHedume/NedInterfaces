/* Testbench — dev preview for interfaces.
   Lists everything in Ned.registry, mounts the selected one, and shows the
   exact value it saves. This is the page you deploy to Vercel while building. */

(function () {
  const sidebar = document.getElementById('list');
  const qText   = document.getElementById('qtext');
  const mount   = document.getElementById('mount');
  const json    = document.getElementById('json');
  const sampleSel = document.getElementById('samples');

  let current = null;              // { instance, id }
  let activeId = null;

  const ids = Object.keys(Ned.registry);

  // build sidebar
  ids.forEach(id => {
    const m = Ned.registry[id].meta;
    const btn = Ned.el('button', { class: 'nav', onclick: () => load(id) },
      [ Ned.el('span', { class: 'nav-name' }, [m.name]),
        Ned.el('span', { class: 'nav-sub'  }, [m.unlocks || '']) ]);
    btn.dataset.id = id;
    sidebar.appendChild(btn);
  });

  function setValue(v) {
    const env = v == null ? Ned.envelope(activeId, null) : Ned.envelope(activeId, v);
    json.textContent = JSON.stringify(env, null, 2);
  }

  function load(id, sampleIdx = 0) {
    if (current && current.instance.destroy) current.instance.destroy();
    activeId = id;
    sidebar.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.id === id));

    const entry = Ned.registry[id];
    const samples = entry.meta.samples || [{ label: 'Default', question: { text: '', config: {} } }];

    // sample dropdown
    sampleSel.innerHTML = '';
    samples.forEach((s, i) => sampleSel.appendChild(Ned.el('option', { value: i }, [s.label])));
    sampleSel.onchange = () => load(id, +sampleSel.value);

    const q = samples[sampleIdx].question;
    qText.textContent = q.text ? `Q. ${q.text}` + (q.marks ? `  [${q.marks}]` : '') : '(no prompt)';

    mount.innerHTML = '';
    setValue(null);
    const instance = entry.factory(mount, {
      question: q,
      value: null,
      onChange: (v) => setValue(v),
    });
    current = { instance, id };
  }

  // toolbar
  document.getElementById('clear').onclick = () => {
    if (current && current.instance.clear) current.instance.clear();
  };

  if (ids.length) load(ids[0]);
  else sidebar.appendChild(Ned.el('p', { class: 'nav-sub' }, ['No interfaces registered yet.']));
})();
