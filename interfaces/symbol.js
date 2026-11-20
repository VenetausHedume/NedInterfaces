/* Circuit symbol — pick the symbol for a part from a set of symbols drawn without names ('Draw the symbol for a thermistor').
   config.symbols : the symbols to show, e.g. ['cell','resistor','variable','thermistor','ldr',…] or ['gate:AND','gate:NOR',…]
   config.askName : also ask for the name of the part ('Name a device … and draw its symbol')
   Saves { symbol:'variable' } (+ name), or null.   Marked by NedMark 'symbol': the right symbol (and an accepted name). */
(function () {
  const SVG = {
    "cell": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"17\" y2=\"13\"/><line x1=\"17\" y1=\"6\" x2=\"17\" y2=\"20\"/><line x1=\"24\" y1=\"9\" x2=\"24\" y2=\"17\" stroke-width=\"5\"/><line x1=\"24\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "battery": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"8\" y1=\"6\" x2=\"8\" y2=\"20\"/><line x1=\"14\" y1=\"9\" x2=\"14\" y2=\"17\" stroke-width=\"5\"/><line x1=\"20\" y1=\"6\" x2=\"20\" y2=\"20\"/><line x1=\"26\" y1=\"9\" x2=\"26\" y2=\"17\" stroke-width=\"5\"/><line x1=\"26\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "resistor": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"8\" y2=\"13\"/><rect x=\"8\" y=\"7\" width=\"28\" height=\"12\"/><line x1=\"36\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "lamp": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"8\" y2=\"13\"/><circle cx=\"22\" cy=\"13\" r=\"9\"/><line x1=\"16\" y1=\"7\" x2=\"28\" y2=\"19\"/><line x1=\"16\" y1=\"19\" x2=\"28\" y2=\"7\"/><line x1=\"36\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "switch": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"12\" y2=\"13\"/><circle cx=\"12\" cy=\"13\" r=\"1.5\" fill=\"#2b2b2b\"/><line x1=\"12\" y1=\"13\" x2=\"30\" y2=\"5\"/><circle cx=\"32\" cy=\"13\" r=\"1.5\" fill=\"#2b2b2b\"/><line x1=\"32\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "ammeter": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"9\" y2=\"13\"/><circle cx=\"22\" cy=\"13\" r=\"9\"/><line x1=\"35\" y1=\"13\" x2=\"42\" y2=\"13\"/><text x=\"22\" y=\"17\" font-size=\"11\" text-anchor=\"middle\" stroke=\"none\" fill=\"#2b2b2b\" font-weight=\"bold\">A</text></svg>",
    "voltmeter": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"9\" y2=\"13\"/><circle cx=\"22\" cy=\"13\" r=\"9\"/><line x1=\"35\" y1=\"13\" x2=\"42\" y2=\"13\"/><text x=\"22\" y=\"17\" font-size=\"11\" text-anchor=\"middle\" stroke=\"none\" fill=\"#2b2b2b\" font-weight=\"bold\">V</text></svg>",
    "variable": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"8\" y2=\"13\"/><rect x=\"8\" y=\"7\" width=\"28\" height=\"12\"/><line x1=\"36\" y1=\"13\" x2=\"42\" y2=\"13\"/><line x1=\"10\" y1=\"22\" x2=\"34\" y2=\"4\"/><path d=\"M31 5 l3 -1 l-1 3\" stroke-width=\"1.5\"/></svg>",
    "thermistor": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"8\" y2=\"13\"/><rect x=\"8\" y=\"7\" width=\"28\" height=\"12\"/><line x1=\"36\" y1=\"13\" x2=\"42\" y2=\"13\"/><polyline points=\"6,23 10,23 34,3\"/></svg>",
    "ldr": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"15\" x2=\"8\" y2=\"15\"/><rect x=\"8\" y=\"10\" width=\"28\" height=\"10\"/><line x1=\"36\" y1=\"15\" x2=\"42\" y2=\"15\"/><line x1=\"12\" y1=\"1\" x2=\"18\" y2=\"7\"/><path d=\"M15 7 h3 v-3\" stroke-width=\"1.5\"/><line x1=\"22\" y1=\"1\" x2=\"28\" y2=\"7\"/><path d=\"M25 7 h3 v-3\" stroke-width=\"1.5\"/></svg>",
    "diode": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"14\" y2=\"13\"/><path d=\"M14 5 L28 13 L14 21 Z\"/><line x1=\"28\" y1=\"5\" x2=\"28\" y2=\"21\"/><line x1=\"28\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "led": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"15\" x2=\"12\" y2=\"15\"/><path d=\"M12 8 L24 15 L12 22 Z\"/><line x1=\"24\" y1=\"8\" x2=\"24\" y2=\"22\"/><line x1=\"24\" y1=\"15\" x2=\"42\" y2=\"15\"/><line x1=\"26\" y1=\"6\" x2=\"32\" y2=\"1\"/><line x1=\"31\" y1=\"9\" x2=\"37\" y2=\"4\"/></svg>",
    "fuse": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"42\" y2=\"13\"/><rect x=\"10\" y=\"8\" width=\"24\" height=\"10\"/></svg>",
    "heater": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"8\" y2=\"13\"/><rect x=\"8\" y=\"7\" width=\"28\" height=\"12\"/><line x1=\"15\" y1=\"7\" x2=\"15\" y2=\"19\"/><line x1=\"22\" y1=\"7\" x2=\"22\" y2=\"19\"/><line x1=\"29\" y1=\"7\" x2=\"29\" y2=\"19\"/><line x1=\"36\" y1=\"13\" x2=\"42\" y2=\"13\"/></svg>",
    "ac": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"9\" y2=\"13\"/><circle cx=\"12\" cy=\"13\" r=\"3\"/><circle cx=\"32\" cy=\"13\" r=\"3\"/><line x1=\"35\" y1=\"13\" x2=\"42\" y2=\"13\"/><path d=\"M17 13 C18.5 9 20.5 9 22 13 C23.5 17 25.5 17 27 13\" stroke-width=\"1.6\"/></svg>",
    "supply": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"15\" x2=\"14\" y2=\"15\"/><circle cx=\"17\" cy=\"15\" r=\"3\"/><circle cx=\"27\" cy=\"15\" r=\"3\"/><line x1=\"30\" y1=\"15\" x2=\"42\" y2=\"15\"/></svg>",
    "dcsupply": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"15\" x2=\"14\" y2=\"15\"/><circle cx=\"17\" cy=\"15\" r=\"3\"/><circle cx=\"27\" cy=\"15\" r=\"3\"/><line x1=\"30\" y1=\"15\" x2=\"42\" y2=\"15\"/><text x=\"17\" y=\"9\" font-size=\"9\" text-anchor=\"middle\" stroke=\"none\" fill=\"#2b2b2b\" font-weight=\"bold\">+</text><text x=\"27\" y=\"9\" font-size=\"9\" text-anchor=\"middle\" stroke=\"none\" fill=\"#2b2b2b\" font-weight=\"bold\">\u2212</text></svg>",
    "generator": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"9\" y2=\"13\"/><circle cx=\"22\" cy=\"13\" r=\"9\"/><line x1=\"35\" y1=\"13\" x2=\"42\" y2=\"13\"/><text x=\"22\" y=\"17\" font-size=\"11\" text-anchor=\"middle\" stroke=\"none\" fill=\"#2b2b2b\" font-weight=\"bold\">G</text></svg>",
    "motor": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"13\" x2=\"9\" y2=\"13\"/><circle cx=\"22\" cy=\"13\" r=\"9\"/><line x1=\"35\" y1=\"13\" x2=\"42\" y2=\"13\"/><text x=\"22\" y=\"17\" font-size=\"11\" text-anchor=\"middle\" stroke=\"none\" fill=\"#2b2b2b\" font-weight=\"bold\">M</text></svg>",
    "earth": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"22\" y1=\"2\" x2=\"22\" y2=\"12\"/><line x1=\"12\" y1=\"12\" x2=\"32\" y2=\"12\"/><line x1=\"15.5\" y1=\"17\" x2=\"28.5\" y2=\"17\"/><line x1=\"19\" y1=\"22\" x2=\"25\" y2=\"22\"/></svg>",
    "transformer": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M8 4 a3 3 0 0 1 0 6 a3 3 0 0 1 0 6 a3 3 0 0 1 0 6\"/><line x1=\"18\" y1=\"3\" x2=\"18\" y2=\"23\"/><line x1=\"22\" y1=\"3\" x2=\"22\" y2=\"23\"/><path d=\"M34 4 a3 3 0 0 0 0 6 a3 3 0 0 0 0 6 a3 3 0 0 0 0 6\"/></svg>",
    "coil": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"17\" x2=\"8\" y2=\"17\"/><path d=\"M8 17 a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0\"/><line x1=\"36\" y1=\"17\" x2=\"42\" y2=\"17\"/></svg>",
    "bell": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"20\" x2=\"14\" y2=\"20\"/><line x1=\"30\" y1=\"20\" x2=\"42\" y2=\"20\"/><path d=\"M14 20 V14 A8 8 0 0 1 30 14 V20 Z\"/></svg>",
    "potdiv": "<svg width=\"96\" height=\"57\" viewBox=\"0 0 44 26\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"16\" x2=\"8\" y2=\"16\"/><rect x=\"8\" y=\"11\" width=\"28\" height=\"10\"/><line x1=\"36\" y1=\"16\" x2=\"42\" y2=\"16\"/><line x1=\"22\" y1=\"1\" x2=\"22\" y2=\"9\"/><path d=\"M19 6 L22 10 L25 6\" stroke-width=\"1.6\"/></svg>",
    'gate:AND': "<svg width=\"96\" height=\"57\" viewBox=\"0 0 60 36\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"11\" x2=\"16\" y2=\"11\"/><line x1=\"2\" y1=\"25\" x2=\"16\" y2=\"25\"/><path d=\"M16 4 H28 A14 14 0 0 1 28 32 H16 Z\"/><line x1=\"42\" y1=\"18\" x2=\"58\" y2=\"18\"/></svg>",
    'gate:NAND': "<svg width=\"96\" height=\"57\" viewBox=\"0 0 60 36\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"11\" x2=\"14\" y2=\"11\"/><line x1=\"2\" y1=\"25\" x2=\"14\" y2=\"25\"/><path d=\"M14 4 H25 A14 14 0 0 1 25 32 H14 Z\"/><circle cx=\"42.5\" cy=\"18\" r=\"3\"/><line x1=\"45.5\" y1=\"18\" x2=\"58\" y2=\"18\"/></svg>",
    'gate:OR': "<svg width=\"96\" height=\"57\" viewBox=\"0 0 60 36\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"11\" x2=\"19\" y2=\"11\"/><line x1=\"2\" y1=\"25\" x2=\"19\" y2=\"25\"/><path d=\"M14 4 Q22 18 14 32 Q34 32 44 18 Q34 4 14 4 Z\"/><line x1=\"44\" y1=\"18\" x2=\"58\" y2=\"18\"/></svg>",
    'gate:NOR': "<svg width=\"96\" height=\"57\" viewBox=\"0 0 60 36\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"11\" x2=\"17\" y2=\"11\"/><line x1=\"2\" y1=\"25\" x2=\"17\" y2=\"25\"/><path d=\"M12 4 Q20 18 12 32 Q31 32 41 18 Q31 4 12 4 Z\"/><circle cx=\"44\" cy=\"18\" r=\"3\"/><line x1=\"47\" y1=\"18\" x2=\"58\" y2=\"18\"/></svg>",
    'gate:NOT': "<svg width=\"96\" height=\"57\" viewBox=\"0 0 60 36\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"2\" stroke-linecap=\"round\"><line x1=\"2\" y1=\"18\" x2=\"18\" y2=\"18\"/><path d=\"M18 6 L38 18 L18 30 Z\"/><circle cx=\"41\" cy=\"18\" r=\"3\"/><line x1=\"44\" y1=\"18\" x2=\"58\" y2=\"18\"/></svg>"
  };
  const DEFAULT = ['cell', 'battery', 'ac', 'supply', 'dcsupply', 'switch', 'resistor', 'variable', 'thermistor', 'ldr', 'potdiv', 'fuse', 'heater', 'lamp', 'diode', 'led', 'ammeter', 'voltmeter', 'motor', 'generator', 'earth', 'transformer', 'coil', 'bell'];
  // the same question always shows the symbols in the same mixed order (so the answer is not always in one place)
  function order(list, seed) { let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return list.map((k, i) => [k, Math.imul(h ^ (i * 2654435761), 1597334677) >>> 0]).sort((a, b) => a[1] - b[1]).map(x => x[0]); }
  Ned.register('symbol',
    { name: 'Circuit symbol', unlocks: 'draw the symbol for …',
      samples: [
        { label: 'Thermistor', question: { text: 'Draw the circuit symbol for a thermistor.', marks: 1, config: {} }, answer: { symbol: 'thermistor' } },
        { label: 'NOR gate', question: { text: 'Draw the symbol for a NOR gate.', marks: 1, config: { symbols: ['gate:AND', 'gate:OR', 'gate:NOT', 'gate:NAND', 'gate:NOR'] } }, answer: { symbol: 'gate:NOR' } },
        { label: 'Name and symbol', question: { text: 'Name a single device that can be used to control the current in the circuit. Draw the electrical symbol for the device.', marks: 1, config: { askName: true } },
          answer: { symbol: 'variable', names: ['variable resistor', 'rheostat'] } },
      ] },
    function (container, { question, value, onChange }) {
      const cfg = (question && question.config) || {};
      const list = order((cfg.symbols || DEFAULT).filter(k => SVG[k]), (question && question.text) || '');
      let pick = value && value.symbol || null, name = value && value.name || '';
      let nameIn = null;
      if (cfg.askName) {
        nameIn = Ned.el('input', { type: 'text', placeholder: 'name of the device', 'aria-label': 'Name of the device', value: name,
          style: 'display:block;margin:0 0 10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit;width:100%;max-width:320px;' });
        nameIn.addEventListener('input', () => { name = nameIn.value; emit(); });
        container.appendChild(nameIn);
      }
      const grid = Ned.el('div', { role: 'radiogroup', 'aria-label': 'Symbols', style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;max-width:720px;' });
      const btns = list.map((k, i) => {
        const b = Ned.el('button', { type: 'button', role: 'radio', 'aria-label': 'Symbol ' + (i + 1), 'data-key': k,
          style: 'display:grid;place-items:center;padding:10px 6px;border:1px solid var(--line);border-radius:10px;background:var(--paper);cursor:pointer;min-height:76px;' });
        b.innerHTML = SVG[k];
        b.addEventListener('click', () => { pick = pick === k ? null : k; paint(); emit(); });
        grid.appendChild(b); return b;
      });
      container.appendChild(grid);
      container.appendChild(Ned.el('p', { class: 'ned-note' }, ['Choose the correct symbol.']));
      function paint() { btns.forEach(b => { const on = b.dataset.key === pick; b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.style.background = on ? '#eaf1f8' : 'var(--paper)'; b.style.borderColor = on ? 'var(--accent)' : 'var(--line)'; b.style.borderWidth = on ? '2px' : '1px'; }); }
      function emit() { onChange(pick || (name && name.trim()) ? Object.assign({ symbol: pick }, cfg.askName ? { name } : {}) : null); }
      paint();
      return {
        update(v) { pick = v && v.symbol || null; name = v && v.name || ''; if (nameIn) nameIn.value = name; paint(); },
        clear() { pick = null; name = ''; if (nameIn) nameIn.value = ''; paint(); emit(); },
        destroy() { container.innerHTML = ''; },
      };
    });
})();
