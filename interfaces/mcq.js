/* Multiple choice — pick one, pick several, or pick a picture.
   config.options  : [{ key:'A', text:'…', image?:'url', svg?:'<svg…>' }]
   config.multiple : true = tick all that apply (optional config.max = most ticks allowed)
   Saves { choice:'B' }  or  { choices:['A','C'] } (sorted), or null.
   Marked by NedMark 'mcq': exact for pick-one; (right ticks − wrong ticks) for pick-several. */
(function () {
  const pic = (label, body) => '<svg viewBox="0 0 120 80" width="120" height="80" role="img" aria-label="' + label + '">' + body + '</svg>';
  const ax = '<path d="M14 8V66H112" fill="none" stroke="#2b2b2b" stroke-width="2"/>';
  Ned.register('mcq',
    {
      name: 'Multiple choice',
      unlocks: 'tick / ring questions, converted questions',
      samples: [
        { label: 'Pick one',
          question: { text: 'Which quantity is a vector?', marks: 1, config: { options: [
            { key: 'A', text: 'mass' }, { key: 'B', text: 'speed' }, { key: 'C', text: 'momentum' }, { key: 'D', text: 'energy' }] } },
          answer: { key: 'C' } },
        { label: 'Pick several (tick all that apply)',
          question: { text: 'An object is placed closer to a converging lens than its principal focus. Tick all the words that describe the image.', marks: 2,
            config: { multiple: true, options: [
              { key: 'A', text: 'diminished' }, { key: 'B', text: 'enlarged' }, { key: 'C', text: 'inverted' },
              { key: 'D', text: 'upright' }, { key: 'E', text: 'real' }, { key: 'F', text: 'virtual' }] } },
          answer: { keys: ['B', 'D', 'F'], scale: { 3: 2, 2: 1 } } },
        { label: 'Pick a picture',
          question: { text: 'Which distance–time graph shows an object moving at constant speed?', marks: 1, config: { options: [
            { key: 'A', svg: pic('flat line', ax + '<path d="M14 40H104" stroke="#4682b4" stroke-width="3" fill="none"/>') },
            { key: 'B', svg: pic('straight line rising', ax + '<path d="M14 66L104 14" stroke="#4682b4" stroke-width="3" fill="none"/>') },
            { key: 'C', svg: pic('curve getting steeper', ax + '<path d="M14 66Q80 62 104 12" stroke="#4682b4" stroke-width="3" fill="none"/>') },
            { key: 'D', svg: pic('curve levelling off', ax + '<path d="M14 66Q30 18 104 16" stroke="#4682b4" stroke-width="3" fill="none"/>') }] } },
          answer: { key: 'B' } },
      ],
    },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const multi = !!cfg.multiple, opts = cfg.options || [];
      const pictures = opts.some(o => o.image || o.svg);
      let chosen = new Set(value ? (value.choices || (value.choice ? [value.choice] : [])) : []);
      const box = Ned.el('div', { role: multi ? 'group' : 'radiogroup', 'aria-label': 'Answer options',
        style: 'display:grid;gap:8px;max-width:640px;' + (pictures ? 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));' : '') });
      const note = Ned.el('p', { class: 'ned-note' }, [multi ? 'Tick every answer that applies.' : 'Choose one answer.']);
      const btns = opts.map(o => {
        const badge = Ned.el('span', { style: 'flex:0 0 auto;display:inline-grid;place-items:center;width:26px;height:26px;border:1px solid var(--line);border-radius:' + (multi ? '6px' : '50%') + ';font-weight:600;' }, [o.key]);
        const kids = [badge];
        if (o.svg) { const h = Ned.el('span', {}); h.innerHTML = o.svg; kids.push(h); }
        if (o.image) kids.push(Ned.el('img', { src: o.image, alt: o.text || ('Option ' + o.key), style: 'max-width:100%;max-height:140px;' }));
        if (o.text) kids.push(Ned.el('span', {}, [o.text]));
        const b = Ned.el('button', { type: 'button', role: multi ? 'checkbox' : 'radio', 'data-key': o.key,
          style: 'display:flex;gap:10px;align-items:center;text-align:left;width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font:inherit;color:inherit;' }, kids);
        b.addEventListener('click', () => {
          if (multi) {
            if (chosen.has(o.key)) chosen.delete(o.key);
            else if (!cfg.max || chosen.size < cfg.max) chosen.add(o.key);
          } else chosen = new Set(chosen.has(o.key) ? [] : [o.key]);
          paint(); emit();
        });
        box.appendChild(b); return b;
      });
      function paint() {
        btns.forEach(b => { const on = chosen.has(b.dataset.key); b.setAttribute('aria-checked', on ? 'true' : 'false');
          b.style.background = on ? '#eaf1f8' : 'var(--paper)'; b.style.borderColor = on ? 'var(--accent)' : 'var(--line)'; });
        if (multi && cfg.max) note.textContent = 'Tick up to ' + cfg.max + ' (' + chosen.size + ' chosen).';
      }
      function emit() {
        if (!chosen.size) return onChange(null);
        onChange(multi ? { choices: [...chosen].sort() } : { choice: [...chosen][0] });
      }
      container.append(box, note); paint();
      return {
        update: (v) => { chosen = new Set(v ? (v.choices || (v.choice ? [v.choice] : [])) : []); paint(); },
        clear: () => { chosen = new Set(); paint(); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
