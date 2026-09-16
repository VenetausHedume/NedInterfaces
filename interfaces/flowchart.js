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
      const editbox = Ned.el('div', { style: 'position:absolute;display:none;z-index:6;' });
      const editinput = Ned.el('input', { style: 'font:14px system-ui,sans-serif;border:1px solid var(--accent);border-radius:5px;padding:4px 6px;background:#fff;min-width:120px;text-align:center;' });
      editbox.appendChild(editinput);
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
          if (tool === 'connect') { evt.stopPropagation();
            if (!connectFrom) { connectFrom = N; select(N); }
            else if (connectFrom !== N) { makeEdge(connectFrom, N); connectFrom = null; setTool('select'); }
            return; }
          if (tool !== 'select') return;
          evt.stopPropagation(); select(N);
          const p0 = pt(evt), o = { x: N.x, y: N.y };
          const mv = (e) => { const p = pt(e); N.x = o.x + (p.x - p0.x); N.y = o.y + (p.y - p0.y); drawNode(N); drawEdges(); };
          const up = () => { emit(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
        });
        N.el.g.addEventListener('dblclick', (evt) => { evt.stopPropagation(); editNode(N); });
      }
      function makeEdge(A, B) {
        let label = '';
        if (A.type === 'decision') label = window.confirm('Yes branch? (Cancel = No)') ? 'Yes' : 'No';
        edges.push({ id: uid++, from: A.id, to: B.id, label }); drawEdges(); emit();
      }

      // ensure the shared IGCSE pseudocode CodeMirror mode exists (same as code editor)
      function ensurePseudoMode() {
        if (!window.CodeMirror || window.__nedPseudoMode) return;
        const KW = new Set(['DECLARE','CONSTANT','INPUT','OUTPUT','IF','THEN','ELSE','ENDIF','CASE','OF','OTHERWISE','ENDCASE','FOR','TO','STEP','NEXT','WHILE','DO','ENDWHILE','REPEAT','UNTIL','PROCEDURE','ENDPROCEDURE','FUNCTION','RETURNS','RETURN','ENDFUNCTION','CALL','ARRAY','AND','OR','NOT','MOD','DIV','TRUE','FALSE']);
        const TY = new Set(['INTEGER','REAL','CHAR','STRING','BOOLEAN','DATE']);
        try { window.CodeMirror.defineMode('igcse-pseudocode', function () { return { token: function (st) {
          if (st.match('//')) { st.skipToEnd(); return 'comment'; }
          if (st.match('<-') || st.match('\u2190')) return 'operator';
          if (st.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
          if (st.match(/^[0-9]+(\.[0-9]+)?/)) return 'number';
          if (st.match(/^[<>]=?|=|<>|[-+*/^&]/)) return 'operator';
          const w = st.match(/^[A-Za-z_][A-Za-z0-9_]*/); if (w) { const u = w[0].toUpperCase(); if (KW.has(u)) return 'keyword'; if (TY.has(u)) return 'variable-2'; return 'variable'; }
          st.next(); return null; } }; }); window.__nedPseudoMode = true; } catch (e) {}
      }

      let editing = null, editCM = null;
      function editNode(N) {
        editing = N;
        const r = board.getBoundingClientRect();
        editbox.style.left = (N.x * (r.width / W) - 80) + 'px';
        editbox.style.top = (N.y * (r.height / H) - 16) + 'px';
        editbox.style.display = 'block';
        if (window.CodeMirror) {
          ensurePseudoMode();
          editinput.style.display = 'none';
          if (!editCM) {
            const holder = document.createElement('div');
            holder.style.cssText = 'border:1px solid var(--accent);border-radius:5px;overflow:hidden;background:#fff;min-width:170px;';
            editbox.appendChild(holder);
            editCM = window.CodeMirror(holder, { value: N.text, mode: 'igcse-pseudocode', lineNumbers: false, lineWrapping: true });
            editCM.setSize('100%', 'auto');
            editCM.on('inputRead', (inst, ch) => { if (ch.text && ch.text[0] === '-') { const c = inst.getCursor(), ln = inst.getLine(c.line); if (ln.slice(c.ch - 2, c.ch) === '<-') inst.replaceRange('\u2190', { line: c.line, ch: c.ch - 2 }, { line: c.line, ch: c.ch }); } });
            editCM.on('keydown', (inst, e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); } else if (e.key === 'Escape') { editbox.style.display = 'none'; editing = null; } });
            editCM.on('blur', commitEdit);
          } else { editCM.setValue(N.text); }
          setTimeout(() => { editCM.refresh(); editCM.focus(); }, 0);
        } else {
          editinput.style.display = 'block'; editinput.value = N.text; editinput.focus(); editinput.select();
        }
      }
      function commitEdit() { if (!editing) return; editing.text = window.CodeMirror && editCM ? editCM.getValue().replace(/\n+$/,'') : editinput.value; drawNode(editing); editbox.style.display = 'none'; editing = null; emit(); }
      editinput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitEdit(); else if (e.key === 'Escape') { editbox.style.display = 'none'; editing = null; } });
      editinput.addEventListener('blur', commitEdit);

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
      const bDel = tb('Delete', () => { if (!selected) return;
        if (selected.from !== undefined) edges = edges.filter(e => e !== selected);
        else { nodes = nodes.filter(n => n !== selected); edges = edges.filter(e => e.from !== selected.id && e.to !== selected.id); selected.el.g.remove(); }
        select(null); emit(); });
      const bClr = tb('Clear', () => { nodes.forEach(n => n.el.g.remove()); nodes = []; edges = []; select(null); emit(); });
      toolbar.append(btns.select, btns.start, btns.process, btns.io, btns.decision, btns.connect, bDel, bClr);

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
