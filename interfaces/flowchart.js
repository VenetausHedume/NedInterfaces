/* Flowchart builder (IGCSE) — shape palette + arrows, on-screen only.
   Shapes: start/stop (stadium), process (rect), input/output (parallelogram),
   decision (diamond). Connect source->target with arrows; decision branches
   are labelled Yes/No. Each block holds text (a statement / condition).
   Saves { nodes:[{id,type,text,x,y}], edges:[{from,to,label}] } or null.
   (Phase 2: turn the graph into an executable and check output.) */

(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  Ned.register('flowchart',
    {
      name: 'Flowchart',
      unlocks: 'CS algorithms',
      samples: [
        { label: 'Algorithm flowchart',
          question: { text: 'Draw a flowchart that inputs 10 numbers and outputs the largest.', marks: 6, config: {} } },
        { label: 'FDE cycle',
          question: { text: 'Draw a flowchart for the fetch-decode-execute cycle.', marks: 4, config: {} } },
      ],
    },
    function (container, { question, value, onChange }) {
      const toolbar = Ned.el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;' });
      const wrap = Ned.el('div', { style: 'position:relative;width:100%;max-width:900px;' });
      const board = svg('svg', { viewBox: '0 0 900 560' });
      board.style.cssText = 'width:100%;height:560px;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;display:block;';
      board.innerHTML = '<defs><marker id="fc-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" fill="#2b2b2b"/></marker></defs>';
      const gEdges = svg('g', {}), gNodes = svg('g', {}); board.append(gEdges, gNodes);
      const editbox = Ned.el('div', { style: 'position:absolute;display:none;z-index:9999;' });
      const editta = document.createElement('textarea');
      editta.rows = 2; editta.spellcheck = false;
      editta.style.cssText = 'font:14px/1.4 ui-monospace,Menlo,Consolas,monospace;border:2px solid var(--accent);border-radius:6px;padding:6px 8px;background:#fff;min-width:180px;resize:both;box-shadow:0 4px 14px rgba(0,0,0,.25);';
      editbox.appendChild(editta);
      wrap.append(board, editbox);
      container.append(toolbar, wrap);
      container.appendChild(Ned.el('p', { class: 'ned-note' }, ['Add shapes, double-click to type text, then Connect source \u2192 target. Decision branches ask Yes/No.']));

      let W = 900, H = 560;
      function fit() { const r = board.getBoundingClientRect(); if (!r.width) return; W = Math.round(r.width); H = Math.round(r.height); board.setAttribute('viewBox', '0 0 ' + W + ' ' + H); }
      const pt = (evt) => { const r = board.getBoundingClientRect(); return { x: (evt.clientX - r.left) * (W / r.width), y: (evt.clientY - r.top) * (H / r.height) }; };

      let nodes = [], edges = [], tool = 'select', selected = null, uid = 1, connectFrom = null;

      const SIZE = { start: { w: 120, h: 44 }, process: { w: 150, h: 54 }, io: { w: 160, h: 54 }, decision: { w: 140, h: 84 } };
      const DEFTEXT = { start: '', process: '', io: '', decision: '' };

      function addNode(type, x, y, text) {
        const s = SIZE[type];
        const N = { id: uid++, type, x, y, w: s.w, h: s.h, text: text != null ? text : DEFTEXT[type] };
        const g = svg('g', {});
        let shape;
        if (type === 'start') shape = svg('rect', { rx: 22, ry: 22, fill: '#fff', stroke: '#2b2b2b', 'stroke-width': 2, cursor: 'move' });
        else if (type === 'process') shape = svg('rect', { rx: 4, ry: 4, fill: '#fff', stroke: '#2b2b2b', 'stroke-width': 2, cursor: 'move' });
        else shape = svg('polygon', { fill: '#fff', stroke: '#2b2b2b', 'stroke-width': 2, cursor: 'move' });
        const lbl = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 14, fill: '#2b2b2b', 'pointer-events': 'none' });
        g.append(shape, lbl); gNodes.appendChild(g);
        N.el = { g, shape, lbl }; nodes.push(N); wireNode(N); drawNode(N); select(N); return N;
      }

      function drawNode(N) {
        const { x, y, w, h, type } = N, e = N.el;
        if (type === 'io') { const sk = 14; e.shape.setAttribute('points', [[x - w / 2 + sk, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2 - sk, y + h / 2], [x - w / 2, y + h / 2]].map(p => p.join(',')).join(' ')); }
        else if (type === 'decision') { e.shape.setAttribute('points', [[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]].map(p => p.join(',')).join(' ')); }
        else { e.shape.setAttribute('x', x - w / 2); e.shape.setAttribute('y', y - h / 2); e.shape.setAttribute('width', w); e.shape.setAttribute('height', h); }
        e.shape.setAttribute('stroke', selected === N ? 'var(--accent)' : '#2b2b2b');
        e.shape.setAttribute('stroke-width', selected === N ? 2.5 : 2);
        e.lbl.setAttribute('x', x); e.lbl.setAttribute('y', y); e.lbl.textContent = N.text;
      }
      function clipAtBox(N, tx, ty) { const dx = tx - N.x, dy = ty - N.y; if (!dx && !dy) return { x: N.x, y: N.y }; const s = Math.min(dx ? (N.w / 2) / Math.abs(dx) : Infinity, dy ? (N.h / 2) / Math.abs(dy) : Infinity); return { x: N.x + dx * s, y: N.y + dy * s }; }
      function drawEdges() {
        gEdges.innerHTML = '';
        edges.forEach(E => {
          const A = nodes.find(n => n.id === E.from), B = nodes.find(n => n.id === E.to); if (!A || !B) return;
          const c1 = clipAtBox(A, B.x, B.y), c2 = clipAtBox(B, A.x, A.y);
          const hit = svg('line', { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, stroke: 'transparent', 'stroke-width': 14, cursor: 'pointer' });
          const ln = svg('line', { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, stroke: selected === E ? '#4682b4' : '#2b2b2b', 'stroke-width': 2, 'marker-end': 'url(#fc-arrow)' });
          hit.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); select(E); });
          gEdges.append(hit, ln);
          if (E.label) { const mx = (c1.x + c2.x) / 2, my = (c1.y + c2.y) / 2; const t = svg('text', { x: mx + 6, y: my - 4, 'font-size': 12, fill: '#c0392b' }); t.textContent = E.label; gEdges.appendChild(t); }
        });
      }

      function emit() {
        if (!nodes.length) { onChange(null); return; }
        onChange({
          nodes: nodes.map(n => ({ id: n.id, type: n.type, text: n.text, x: Math.round(n.x), y: Math.round(n.y) })),
          edges: edges.map(e => ({ from: e.from, to: e.to, label: e.label || '' })),
        });
      }

      function select(o) { selected = o; nodes.forEach(drawNode); drawEdges(); if (o && o.el) o.el.g.parentNode.appendChild(o.el.g); }

      function wireNode(N) {
        N.el.g.addEventListener('pointerdown', (evt) => {
          if (tool === 'connect' || tool === 'connect-yes' || tool === 'connect-no') { evt.stopPropagation();
            connectLabel = (tool === 'connect-yes') ? 'Yes' : (tool === 'connect-no') ? 'No' : '';
            if (!connectFrom) { connectFrom = N; select(N); }
            else if (connectFrom !== N) { makeEdge(connectFrom, N); connectFrom = null; setTool('select'); }
            return; }
          if (tool !== 'select') return;
          evt.stopPropagation();
          const wasSelected = (selected === N);
          select(N);
          if (wasSelected) { editNode(N); return; }   // click a selected shape -> edit its text
          const p0 = pt(evt), o = { x: N.x, y: N.y };
          const mv = (e) => { const p = pt(e); N.x = o.x + (p.x - p0.x); N.y = o.y + (p.y - p0.y); drawNode(N); drawEdges(); };
          const up = () => { emit(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
        });
        // (editing is via the 'Edit text' toolbar button, or click an already-selected shape)
      }
      // connector label is decided by which Connect tool is active
      let connectLabel = '';   // '', 'Yes', or 'No'
      function makeEdge(A, B) {
        edges.push({ id: uid++, from: A.id, to: B.id, label: connectLabel });
        drawEdges(); emit();
      }

      let editing = null;
      function editNode(N) {
        editing = N;
        const r = board.getBoundingClientRect();
        editbox.style.left = Math.max(4, (N.x * (r.width / W) - 90)) + 'px';
        editbox.style.top  = Math.max(4, (N.y * (r.height / H) - 20)) + 'px';
        editbox.style.display = 'block';
        editta.value = N.text || '';
        // focus reliably on next frame
        setTimeout(() => { editta.focus(); editta.select(); }, 0);
      }
      function commitEdit() { if (!editing) return; editing.text = editta.value.replace(/\s+$/,''); drawNode(editing); editbox.style.display = 'none'; editing = null; emit(); }
      // "<-" -> the assignment arrow, live as you type
      editta.addEventListener('input', () => {
        const p = editta.selectionStart;
        if (p >= 2 && editta.value.slice(p - 2, p) === '<-') {
          editta.value = editta.value.slice(0, p - 2) + '\u2190' + editta.value.slice(p);
          editta.selectionStart = editta.selectionEnd = p - 1;
        }
      });
      editta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
        else if (e.key === 'Escape') { e.preventDefault(); editbox.style.display = 'none'; editing = null; }
      });
      editta.addEventListener('blur', () => { if (editing) commitEdit(); });

      board.addEventListener('pointerdown', (evt) => { const p = pt(evt);
        if (['start', 'process', 'io', 'decision'].includes(tool)) { addNode(tool, p.x, p.y); setTool('select'); emit(); return; }
        select(null);
      });

      function tb(label, fn) { return Ned.el('button', { type: 'button', style: 'padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font-size:14px;', onclick: fn }, [label]); }
      // icon button: draws the raw shape (no text) so the student must know what it means
      function shapeBtn(type, fn) {
        const b = document.createElement('button'); b.type = 'button';
        b.title = ''; // deliberately no name — testing shape knowledge, not vocabulary
        b.style.cssText = 'width:56px;height:40px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;';
        const ic = document.createElementNS('http://www.w3.org/2000/svg','svg');
        ic.setAttribute('width','40'); ic.setAttribute('height','24'); ic.setAttribute('viewBox','0 0 40 24');
        let sh;
        if (type==='start') sh = svg('rect',{x:3,y:4,width:34,height:16,rx:8,ry:8,fill:'#fff',stroke:'#2b2b2b','stroke-width':2});
        else if (type==='process') sh = svg('rect',{x:4,y:4,width:32,height:16,rx:2,ry:2,fill:'#fff',stroke:'#2b2b2b','stroke-width':2});
        else if (type==='io') sh = svg('polygon',{points:'9,4 37,4 31,20 3,20',fill:'#fff',stroke:'#2b2b2b','stroke-width':2});
        else sh = svg('polygon',{points:'20,2 38,12 20,22 2,12',fill:'#fff',stroke:'#2b2b2b','stroke-width':2}); // rhombus
        ic.appendChild(sh); b.appendChild(ic);
        b.addEventListener('click', fn);
        return b;
      }
      const btns = {};
      function setTool(t) { tool = t; connectFrom = null; Object.values(btns).forEach(b => b.style.background = 'var(--paper)'); if (btns[t]) btns[t].style.background = '#eaf1f8'; }
      btns.select = tb('Select / Move', () => setTool('select'));
      btns.start = shapeBtn('start', () => setTool('start'));
      btns.process = shapeBtn('process', () => setTool('process'));
      btns.io = shapeBtn('io', () => setTool('io'));
      btns.decision = shapeBtn('decision', () => setTool('decision'));
      btns.connect = tb('Connect', () => setTool('connect'));
      btns['connect-yes'] = tb('Connect: Yes', () => setTool('connect-yes'));
      btns['connect-no'] = tb('Connect: No', () => setTool('connect-no'));
      const bEdit = tb('Edit text', () => { if (selected && selected.type) editNode(selected); });
      const bDel = tb('Delete', () => { if (!selected) return;
        if (selected.from !== undefined) edges = edges.filter(e => e !== selected);
        else { nodes = nodes.filter(n => n !== selected); edges = edges.filter(e => e.from !== selected.id && e.to !== selected.id); selected.el.g.remove(); }
        select(null); emit(); });
      const bClr = tb('Clear', () => { nodes.forEach(n => n.el.g.remove()); nodes = []; edges = []; select(null); emit(); });
      toolbar.append(btns.select, btns.start, btns.process, btns.io, btns.decision, btns.connect, btns['connect-yes'], btns['connect-no'], bEdit, bDel, bClr);

      function loadValue(v) {
        (v.nodes || []).forEach(n => { const N = addNode(n.type, n.x, n.y, n.text); N.id = n.id; if (n.id >= uid) uid = n.id + 1; });
        (v.edges || []).forEach(e => edges.push({ id: uid++, from: e.from, to: e.to, label: e.label || '' }));
        drawEdges(); select(null);
      }

      requestAnimationFrame(() => {
        fit();
        if (value && value.nodes && value.nodes.length) loadValue(value);
        else addNode('start', W / 2, 70);
        setTool('select');
      });
      window.addEventListener('resize', () => { fit(); drawEdges(); });

      return {
        update: (v) => { nodes.forEach(n => n.el.g.remove()); nodes = []; edges = []; if (v && v.nodes) loadValue(v); },
        clear: () => { nodes.forEach(n => n.el.g.remove()); nodes = []; edges = []; select(null); emit(); },
        destroy: () => { container.innerHTML = ''; },
      };
    });
})();
