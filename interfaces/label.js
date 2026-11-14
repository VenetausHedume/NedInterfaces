/* Figure answers — two interfaces that put answer boxes on a printed figure.

   'label'  the student TYPES a label at each numbered spot.
            config: { figure:{ svg | image, w, h }, labels:[{ id, x, y, w? }] }      x, y = % of the figure
            saves : { labels:{ id: 'text' } }
   'place'  the student PICKS what goes at each spot from a list ("what goes where").
            config: { figure, spots:[{ id, x, y }], items:['…'], once? }            once = each item used once (default true)
            saves : { spots:{ id: 'item' } }
   Only filled boxes are saved; nothing filled = null.
   On a wide screen the boxes sit on the figure. On a narrow screen the figure keeps numbered pins and the
   boxes move into a list underneath, so nothing overlaps.
   Marked by NedMark 'label' / 'place': each box like a short answer. */
(function () {
  const CELL = '<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of a plant cell with four numbered parts">' +
    '<rect x="70" y="30" width="260" height="200" rx="18" fill="#f3f7ea" stroke="#5c7a3a" stroke-width="6"/>' +
    '<rect x="82" y="42" width="236" height="176" rx="12" fill="#fbfdf5" stroke="#9db36f" stroke-width="2"/>' +
    '<ellipse cx="200" cy="140" rx="62" ry="46" fill="#e4eef9" stroke="#7d9cc0" stroke-width="2"/>' +
    '<circle cx="128" cy="92" r="19" fill="#d9c7e6" stroke="#6b4a86" stroke-width="2"/>' +
    '<ellipse cx="278" cy="84" rx="20" ry="11" fill="#b9d89a" stroke="#4f7a2c" stroke-width="2"/>' +
    '<ellipse cx="272" cy="190" rx="20" ry="11" fill="#b9d89a" stroke="#4f7a2c" stroke-width="2"/></svg>';
  const CIRC = '<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Series circuit with a cell, a lamp and two empty meter positions">' +
    '<path d="M60 40H340V180H60Z" fill="none" stroke="#2b2b2b" stroke-width="2.5"/>' +
    '<rect x="150" y="26" width="40" height="28" fill="#fffdf7"/><path d="M162 22V58M178 30V50" stroke="#2b2b2b" stroke-width="3"/>' +
    '<circle cx="270" cy="180" r="16" fill="#fffdf7" stroke="#2b2b2b" stroke-width="2.5"/><path d="M259 169L281 191M281 169L259 191" stroke="#2b2b2b" stroke-width="2"/>' +
    '<circle cx="130" cy="180" r="17" fill="#fffdf7" stroke="#2b2b2b" stroke-width="2.5" stroke-dasharray="4 3"/>' +
    '<path d="M270 196V214H232M270 164V146H232" fill="none" stroke="#2b2b2b" stroke-width="2"/><circle cx="216" cy="180" r="17" fill="#fffdf7" stroke="#2b2b2b" stroke-width="2.5" stroke-dasharray="4 3"/>' +
    '<path d="M232 146H216V163M232 214H216V197" fill="none" stroke="#2b2b2b" stroke-width="2"/></svg>';

  function build(kind) {
    return function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const fig = cfg.figure || {};
      const spots = (kind === 'label' ? cfg.labels : cfg.spots) || [];
      const field = kind === 'label' ? 'labels' : 'spots';
      const once = cfg.once !== false;
      let vals = Object.assign({}, value && value[field]);

      const stage = Ned.el('div', { style: 'position:relative;width:100%;max-width:' + (cfg.maxWidth || 640) + 'px;border:1px solid var(--line);border-radius:10px;background:#fff;overflow:hidden;' });
      if (fig.svg) { const h = Ned.el('div', { style: 'display:block;line-height:0;' }); h.innerHTML = fig.svg; const s = h.querySelector('svg'); if (s) { s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; } stage.appendChild(h); }
      else if (fig.image) stage.appendChild(Ned.el('img', { src: fig.image, alt: fig.alt || 'Figure for this question', style: 'display:block;width:100%;height:auto;' }));
      const list = Ned.el('div', { style: 'display:none;gap:8px;margin-top:10px;max-width:640px;' });
      const wrap = Ned.el('div', {}, [stage, list]);
      container.appendChild(wrap);

      const ctrls = {}, pins = {}, holders = {}, rows = {};
      spots.forEach((s, i) => {
        const n = String(i + 1);
        const pin = Ned.el('span', { 'aria-hidden': 'true', style: 'position:absolute;transform:translate(-50%,-50%);left:' + s.x + '%;top:' + s.y + '%;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;box-shadow:0 0 0 2px #fff;' }, [n]);
        let c;
        if (kind === 'label') {
          c = Ned.el('input', { type: 'text', 'aria-label': 'Label ' + n, placeholder: 'label ' + n, autocomplete: 'off',
            style: 'width:100%;padding:5px 7px;border:1px solid var(--accent);border-radius:6px;background:#fffdf7;font:inherit;font-size:14px;' });
          c.addEventListener('input', () => { if (c.value.trim()) vals[s.id] = c.value; else delete vals[s.id]; emit(); });
        } else {
          c = Ned.el('select', { 'aria-label': 'What goes at spot ' + n, style: 'width:100%;padding:5px 6px;border:1px solid var(--accent);border-radius:6px;background:#fffdf7;font:inherit;font-size:14px;' });
          c.addEventListener('change', () => { if (c.value) vals[s.id] = c.value; else delete vals[s.id]; paint(); emit(); });
        }
        const onFig = Ned.el('div', { style: 'position:absolute;left:' + s.x + '%;top:' + s.y + '%;transform:translate(14px,-50%);width:' + (s.w || 22) + '%;min-width:6.5rem;' });
        const row = Ned.el('label', { style: 'display:flex;gap:8px;align-items:center;' }, [Ned.el('span', { style: 'flex:0 0 22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;' }, [n])]);
        if (s.side === 'left') onFig.style.transform = 'translate(calc(-100% - 14px),-50%)';
        stage.append(pin, onFig); list.appendChild(row);
        ctrls[s.id] = c; pins[s.id] = pin; holders[s.id] = onFig; rows[s.id] = row;
      });

      function paint() {
        spots.forEach(s => {
          const c = ctrls[s.id];
          if (kind === 'label') { if (c.value !== (vals[s.id] || '')) c.value = vals[s.id] || ''; return; }
          c.innerHTML = ''; c.appendChild(Ned.el('option', { value: '' }, ['choose…']));
          (cfg.items || []).forEach(it => { const used = once && Object.keys(vals).some(k => k !== s.id && vals[k] === it); if (!used) c.appendChild(Ned.el('option', { value: it }, [it])); });
          c.value = vals[s.id] || '';
        });
      }
      let narrow = null;
      function layout() {
        const w = stage.getBoundingClientRect().width || 640;
        const n = w < 520;
        if (n === narrow && !n) return fitBoxes();
        if (n === narrow) return;
        narrow = n;
        list.style.display = n ? 'grid' : 'none';
        spots.forEach(s => { const c = ctrls[s.id]; if (n) { holders[s.id].style.display = 'none'; c.style.flex = '1'; rows[s.id].appendChild(c); } else { holders[s.id].style.display = ''; holders[s.id].appendChild(c); } });
        fitBoxes();
      }
      /* keep every on-figure box inside the figure: flip it to the other side of its pin if it would stick out */
      function fitBoxes() {
        if (narrow) return;
        const R = stage.getBoundingClientRect();
        spots.forEach(s => {
          const h = holders[s.id];
          h.style.transform = s.side === 'left' ? 'translate(calc(-100% - 14px),-50%)' : 'translate(14px,-50%)';
          let r = h.getBoundingClientRect();
          if (r.right > R.right - 2) h.style.transform = 'translate(calc(-100% - 14px),-50%)';
          else if (r.left < R.left + 2) h.style.transform = 'translate(14px,-50%)';
        });
      }
      const emit = () => onChange(Object.keys(vals).length ? { [field]: Object.assign({}, vals) } : null);
      paint(); layout(); fitBoxes();
      let ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(stage); }
      return {
        update: (v) => { vals = Object.assign({}, v && v[field]); paint(); },
        clear: () => { vals = {}; paint(); emit(); },
        destroy: () => { if (ro) ro.disconnect(); container.innerHTML = ''; },
      };
    };
  }

  Ned.register('label',
    { name: 'Label a figure', unlocks: 'label questions, converted drawing questions',
      samples: [
        { label: 'Plant cell (4 labels)',
          question: { text: 'Fig. 1.1 shows a plant cell. Name the parts labelled 1 to 4.', marks: 4, config: { figure: { svg: CELL }, labels: [
            { id: 'wall', x: 17.5, y: 55, side: 'left', w: 16 }, { id: 'nucleus', x: 32, y: 35.5 }, { id: 'vacuole', x: 50, y: 54 }, { id: 'chloroplast', x: 69.5, y: 32.5 }] } },
          answer: { labels: { wall: { alts: ['cell wall'] }, nucleus: { alts: ['nucleus'] }, vacuole: { alts: ['vacuole', 'sap vacuole'] }, chloroplast: { alts: ['chloroplast'] } } } },
      ] },
    build('label'));

  Ned.register('place',
    { name: 'What goes where', unlocks: 'converted drawing questions',
      samples: [
        { label: 'Meters in a circuit',
          question: { text: 'A student measures the current in the lamp and the potential difference across it. Choose the correct meter for each position.', marks: 2,
            config: { figure: { svg: CIRC }, spots: [{ id: 'series', x: 32.5, y: 81.8, side: 'left', w: 20 }, { id: 'parallel', x: 54, y: 81.8, w: 20 }], items: ['ammeter', 'voltmeter', 'thermistor'], once: true } },
          answer: { spots: { series: { exact: true, alts: ['ammeter'] }, parallel: { exact: true, alts: ['voltmeter'] } } } },
      ] },
    build('place'));
})();
