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

  const markBox = document.getElementById('mark');
  let lastValue = null, curSample = null;

  function setValue(v) {
    lastValue = v == null ? null : JSON.parse(JSON.stringify(v));
    const env = v == null ? Ned.envelope(activeId, null) : Ned.envelope(activeId, v);
    json.textContent = JSON.stringify(env, null, 2);
    showMark(v);
  }

  /* live marking: every sample that carries an `answer` (its mark scheme) is marked as you type */
  function showMark(v) {
    if (!curSample || !curSample.answer || !window.NedMark) { markBox.textContent = 'No mark scheme for this sample.'; markBox.dataset.score = ''; return; }
    let r;
    try { r = NedMark.mark(activeId, curSample.answer, v, curSample.question); }
    catch (e) { markBox.textContent = 'Marker error: ' + e.message; markBox.dataset.score = 'error'; return; }
    markBox.dataset.score = r.score + '/' + r.max;
    markBox.dataset.status = r.status;
    markBox.innerHTML = '';
    markBox.appendChild(Ned.el('div', { class: 'mark-score' }, [r.score + ' / ' + r.max]));
    markBox.appendChild(Ned.el('div', { class: 'mark-status' }, [{ marked: 'marked', unsure: 'marked by keywords: check wording', self_check: 'provisional: compare with the points', unanswered: 'not answered yet', no_marker: 'no marker for this interface' }[r.status] || r.status]));
    const fb = NedMark.explain ? NedMark.explain(activeId, curSample.answer, v, r, curSample.question) : [];
    const list = Ned.el('ul', { class: 'mark-fb' });
    fb.forEach(f => list.appendChild(Ned.el('li', { class: 'fb-' + f.kind }, [f.text])));
    markBox.appendChild(list);
    const det = Ned.el('details', {}, [Ned.el('summary', {}, ['marker data'])]);
    det.appendChild(Ned.el('pre', { class: 'mark-detail' }, [JSON.stringify(r.detail, null, 1)]));
    markBox.appendChild(det);
  }

  function load(id, sampleIdx = 0) {
    if (current && current.instance.destroy) current.instance.destroy();
    activeId = id;
    sidebar.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.id === id));

    const entry = Ned.registry[id];
    const samples = (entry.meta.samples && entry.meta.samples.length)
      ? entry.meta.samples
      : [{ label: 'Default', question: { text: '', config: {} } }];

    // sample dropdown
    sampleSel.innerHTML = '';
    samples.forEach((s, i) => sampleSel.appendChild(Ned.el('option', { value: i }, [s.label])));
    sampleSel.onchange = () => load(id, +sampleSel.value);
    sampleSel.value = String(sampleIdx);

    curSample = samples[sampleIdx];
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

  // remount the interface from the saved value: proves an answer can be shown again later
  document.getElementById('restore').onclick = () => {
    if (!current) return;
    const keep = lastValue;
    if (current.instance.destroy) current.instance.destroy();
    mount.innerHTML = '';
    const instance = Ned.registry[activeId].factory(mount, { question: curSample.question, value: keep, onChange: (v) => setValue(v) });
    current = { instance, id: activeId };
    setValue(keep);
  };

  // toolbar
  document.getElementById('clear').onclick = () => {
    if (current && current.instance.clear) current.instance.clear();
  };

  const qs = new URLSearchParams(location.search);
  window.NedLab = { load, get value() { return lastValue; } };
  if (ids.length) load(qs.get('ui') && Ned.registry[qs.get('ui')] ? qs.get('ui') : ids[0], +(qs.get('sample') || 0));
  else sidebar.appendChild(Ned.el('p', { class: 'nav-sub' }, ['No interfaces registered yet.']));
})();
