/* Logic circuit (ready-made IGCSE gates) — Konva palette + terminals + wiring.
   Drop AND/OR/NOT/NAND/NOR/XOR, add Inputs (A,B..) + Output (Q), wire output->input.
   Saves { gates:[{id,gate}], inputs, outputs, wires:[{from,to}] } or null.
   Requires Konva (loaded via index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('logic', { name:'Logic gates', unlocks:'boolean logic', samples:[{label:'Circuit', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva library not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('logic',
    { name:'Logic gates', unlocks:'boolean logic',
      samples:[
        { label:'Build a circuit', question:{ text:'Draw a logic circuit for Q = (A AND B) OR (NOT C).', marks:6, config:{} } },
        { label:'Single gate', question:{ text:'Draw a NAND gate with inputs A and B, output Q.', marks:3, config:{} } },
      ] },
    function (container, { question, value, onChange }) {
      // ---- scaffold ----
      const tb = document.createElement('div'); tb.className='ned-logic-bar';
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<button data-tool="select" class="on">Select / Move</button>
    <span class="sep"></span>
    <button class="gatebtn" data-gate="AND" title="AND"><svg width="40" height="26" viewBox="0 0 44 28" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 5 H20 A9 9 0 0 1 20 23 H8 Z"/><line x1="2" y1="10" x2="8" y2="10"/><line x1="2" y1="18" x2="8" y2="18"/><line x1="29" y1="14" x2="36" y2="14"/></svg></button>
    <button class="gatebtn" data-gate="OR" title="OR"><svg width="40" height="26" viewBox="0 0 44 28" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 5 Q14 14 6 23 Q26 22 34 14 Q26 6 6 5 Z"/><line x1="2" y1="10" x2="9" y2="10"/><line x1="2" y1="18" x2="9" y2="18"/><line x1="34" y1="14" x2="40" y2="14"/></svg></button>
    <button class="gatebtn" data-gate="NOT" title="NOT"><svg width="40" height="26" viewBox="0 0 44 28" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 5 L26 14 L8 23 Z"/><circle cx="30" cy="14" r="3"/><line x1="2" y1="14" x2="8" y2="14"/><line x1="33" y1="14" x2="40" y2="14"/></svg></button>
    <button class="gatebtn" data-gate="NAND" title="NAND"><svg width="40" height="26" viewBox="0 0 44 28" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M7 5 H18 A9 9 0 0 1 18 23 H7 Z"/><circle cx="30" cy="14" r="3"/><line x1="1" y1="10" x2="7" y2="10"/><line x1="1" y1="18" x2="7" y2="18"/><line x1="33" y1="14" x2="39" y2="14"/></svg></button>
    <button class="gatebtn" data-gate="NOR" title="NOR"><svg width="40" height="26" viewBox="0 0 44 28" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 5 Q14 14 6 23 Q26 22 33 14 Q26 6 6 5 Z"/><circle cx="37" cy="14" r="3"/><line x1="1" y1="10" x2="9" y2="10"/><line x1="1" y1="18" x2="9" y2="18"/><line x1="40" y1="14" x2="43" y2="14"/></svg></button>
    <button class="gatebtn" data-gate="XOR" title="XOR"><svg width="40" height="26" viewBox="0 0 44 28" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 5 Q16 14 8 23 Q28 22 35 14 Q28 6 8 5 Z"/><path d="M4 5 Q12 14 4 23"/><line x1="1" y1="10" x2="6" y2="10"/><line x1="1" y1="18" x2="6" y2="18"/><line x1="35" y1="14" x2="41" y2="14"/></svg></button>
    <span class="sep"></span>
    <button data-tool="input">+ Input</button>
    <button data-tool="output">+ Output</button>
    <span class="sep"></span>
    <button id="del">Delete</button>
    <button id="clear">Clear</button>`;
      const wrap = document.createElement('div'); wrap.style.cssText='position:relative;width:100%;max-width:960px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf7;touch-action:none;';
      container.append(tb, wrap);
      const note = Ned.el('p',{class:'ned-note'},['Click a gate icon to drop it, add Inputs/Output, then wire output pin \u2192 input pin. Scroll=zoom, drag empty=pan.']);
      container.appendChild(note);
      // style the icon buttons + tool buttons
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });


// wrap provided by scaffold
const W=Math.min(960, (container.clientWidth||900)-4), H=470;
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='select', selected=null, inLetter=65, wireFrom=null;
let gates=[];     // {id, type, node(Group), inN}
let terms=[];     // {id, kind:'in'|'out', label, node(Group)}
let wires=[];     // {fromKey,toKey, from:{k,id,pin}, to:{k,id,pin}}

// ---------- draw standard IGCSE gate symbols into a group (origin at gate's logical center) ----------
// Gate body sized ~ width 70, height 56. Pins added separately.
function drawGateShape(type){
  const g=new Konva.Group();
  const bw=64, bh=54, hw=bw/2, hh=bh/2;
  const stroke='#2b2b2b', sw=3;
  const shapes=[];
  const orBack = ()=> new Konva.Line({points:[-hw,-hh, -hw+16,0, -hw,hh],stroke,strokeWidth:sw,tension:0.4,lineCap:'round',lineJoin:'round'});
  if(type==='AND'||type==='NAND'){
    // flat back + top/bottom straight + semicircular front (D shape)
    const p=new Konva.Path({data:
      'M '+(-hw)+' '+(-hh)+' L 0 '+(-hh)+' A '+hh+' '+hh+' 0 0 1 0 '+hh+' L '+(-hw)+' '+hh+' Z',
      stroke,strokeWidth:sw,lineJoin:'round'});
    shapes.push(p);
  } else if(type==='OR'||type==='NOR'||type==='XOR'){
    // curved back + two curves meeting at a point (pointed front)
    const body=new Konva.Path({data:
      'M '+(-hw)+' '+(-hh)+
      ' Q '+(-hw+22)+' 0 '+(-hw)+' '+hh+
      ' Q '+(hw-8)+' '+(hh-2)+' '+hw+' 0'+
      ' Q '+(hw-8)+' '+(-hh+2)+' '+(-hw)+' '+(-hh)+' Z',
      stroke,strokeWidth:sw,lineJoin:'round'});
    shapes.push(body);
    if(type==='XOR'){ // extra back curve
      shapes.push(new Konva.Path({data:'M '+(-hw-7)+' '+(-hh)+' Q '+(-hw+15)+' 0 '+(-hw-7)+' '+hh, stroke,strokeWidth:sw,fill:'', lineCap:'round'}));
    }
  } else if(type==='NOT'){
    // triangle
    shapes.push(new Konva.Line({points:[-hw,-hh, hw-6,0, -hw,hh],closed:true,stroke,strokeWidth:sw,lineJoin:'round'}));
  }
  // inversion bubble for NAND/NOR/NOT
  if(type==='NAND'||type==='NOR'||type==='NOT'){
    const bx = (type==='NAND')? hh+6 : (type==='NOT')? hw-6+6 : hw+6;
    shapes.push(new Konva.Circle({x:bx,y:0,radius:5,stroke,strokeWidth:sw,fill:'#fffdf7'}));
  }
  shapes.forEach(sh=>g.add(sh));
  return g;
}
function inputsFor(type){ return type==='NOT'?1:2; }
// pin local positions relative to gate group origin
function gatePinLocals(type){
  const bw=64, hw=bw/2; const n=inputsFor(type);
  let outX;
  if(type==='AND') outX=hw+27;               // + semicircle bulge (~hh)
  else if(type==='NAND') outX=hw+27+12;       // + bubble
  else if(type==='OR'||type==='XOR') outX=hw+8;
  else if(type==='NOR') outX=hw+8+12;
  else outX=hw-6+12;                          // NOT triangle tip + bubble
  const pins=[];
  for(let i=0;i<n;i++){ const off=(n===1)?0:(i===0?-13:13); pins.push({pin:'in'+i,kind:'in',x:-hw-8,y:off}); }
  pins.push({pin:'out',kind:'out',x:outX,y:0});
  return pins;
}

function addGate(type,x,y){
  const id='g'+(uid++);
  const g=new Konva.Group({x,y,draggable:true});
  const shape=drawGateShape(type); g.add(shape);
  const rec={id,type,node:g,inN:inputsFor(type)};
  g.on('dragmove',()=>{ drawPins(); drawWires(); });
  g.on('dragend',()=>{ emitStruct(); });
  g.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; select(rec); } });
  gates.push(rec); layer.add(g); drawPins(); layer.batchDraw(); emitStruct();
  return rec;
}
function addTerminal(kind,x,y){
  const id='t'+(uid++); const label= kind==='in'?String.fromCharCode(inLetter++):'Q';
  const g=new Konva.Group({x,y,draggable:true});
  g.add(new Konva.Circle({radius:16,fill:'#fff',stroke:'#2b2b2b',strokeWidth:2}));
  const t=new Konva.Text({text:label,fontSize:13,fontStyle:'bold',fill:'#2b2b2b'}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); g.add(t);
  const rec={id,kind,label,node:g};
  g.on('dragmove',()=>{ drawPins(); drawWires(); });
  g.on('dragend',()=>emitStruct());
  g.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; select(rec); } });
  terms.push(rec); layer.add(g); drawPins(); layer.batchDraw(); emitStruct();
  return rec;
}

// ---------- pins ----------
function allPins(){
  const ps=[];
  gates.forEach(g=>{ const gx=g.node.x(), gy=g.node.y(); gatePinLocals(g.type).forEach(p=>{ ps.push({key:g.id+':'+p.pin,kind:p.kind,x:gx+p.x,y:gy+p.y,ownerK:'gate',ownerId:g.id,pin:p.pin}); }); });
  terms.forEach(t=>{ const x=t.node.x(), y=t.node.y(); if(t.kind==='in') ps.push({key:t.id+':out',kind:'out',x:x+16,y,ownerK:'term',ownerId:t.id,pin:'out'});
    else ps.push({key:t.id+':in',kind:'in',x:x-16,y,ownerK:'term',ownerId:t.id,pin:'in'}); });
  return ps;
}
function pinByKey(k){ return allPins().find(p=>p.key===k); }
let pinShapes=[];
function drawPins(){
  pinShapes.forEach(s=>s.destroy()); pinShapes=[];
  allPins().forEach(p=>{ const c=new Konva.Circle({x:p.x,y:p.y,radius:5,fill:(wireFrom&&wireFrom.key===p.key)?'#4682b4':'#fff',stroke:'#4682b4',strokeWidth:1.5,hitStrokeWidth:14});
    c.on('mousedown touchstart',(e)=>{ e.cancelBubble=true; onPin(p); }); layer.add(c); pinShapes.push(c); });
  layer.batchDraw();
}
function onPin(p){
  if(p.kind==='out'){ wireFrom=p; drawPins(); return; }
  if(p.kind==='in'&&wireFrom){ wires.push({fromKey:wireFrom.key,toKey:p.key,from:{k:wireFrom.ownerK,id:wireFrom.ownerId,pin:wireFrom.pin},to:{k:p.ownerK,id:p.ownerId,pin:p.pin}}); wireFrom=null; drawWires(); drawPins(); emitStruct(); }
}
let wireShapes=[];
function drawWires(){
  wireShapes.forEach(s=>s.destroy()); wireShapes=[];
  wires.forEach(w=>{ const a=pinByKey(w.fromKey), b=pinByKey(w.toKey); if(!a||!b) return; const mx=(a.x+b.x)/2;
    const ln=new Konva.Line({points:[a.x,a.y,mx,a.y,mx,b.y,b.x,b.y],stroke:(selected===w?'#4682b4':'#2b2b2b'),strokeWidth:2,tension:0.25,hitStrokeWidth:12});
    ln.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=w; drawWires(); } });
    layer.add(ln); wireShapes.push(ln); });
  layer.batchDraw();
}

// ---------- selection ----------
function select(o){ selected=o; drawWires(); }
function deselect(){ selected=null; drawWires(); }

// ---------- board ----------
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(tool!=='select'){ const p=toWorld(stage.getPointerPosition());
    if(tool==='input') addTerminal('in',p.x,p.y);
    else if(tool==='output') addTerminal('out',p.x,p.y);
    setTool('select');
  } else { deselect(); wireFrom=null; drawPins(); }
}});
function toWorld(p){ const t=stage.getAbsoluteTransform().copy(); t.invert(); return t.point(p); }
stage.on('wheel',(e)=>{ e.evt.preventDefault(); const old=stage.scaleX(); const ptr=stage.getPointerPosition();
  const m={x:(ptr.x-stage.x())/old,y:(ptr.y-stage.y())/old}; const dir=e.evt.deltaY>0?-1:1; const f=1.08; const k=Math.max(0.4,Math.min(2.5,dir>0?old*f:old/f));
  stage.scale({x:k,y:k}); stage.position({x:ptr.x-m.x*k,y:ptr.y-m.y*k}); stage.batchDraw(); drawPins(); drawWires(); });

// ---------- structure + status ----------
function emitStruct(){
  drawPins(); drawWires();
  const gs=gates.map(g=>({id:g.id,gate:g.type}));
  const ins=terms.filter(t=>t.kind==='in').map(t=>({id:t.id,label:t.label}));
  const outs=terms.filter(t=>t.kind==='out').map(t=>({id:t.id,label:t.label}));
  const empty = gs.length===0 && ins.length===0 && outs.length===0 && wires.length===0;
  onChange(empty ? null : {gates:gs,inputs:ins,outputs:outs,wires:wires.map(w=>({from:w.from,to:w.to}))});
}

// ---------- toolbar ----------
function setTool(t){ tool=t; tb.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t)); }
tb.querySelectorAll('[data-tool]').forEach(b=> b.onclick=()=>setTool(b.dataset.tool));
tb.querySelectorAll('[data-gate]').forEach(b=> b.onclick=()=>{ addGate(b.dataset.gate, 120+Math.random()*260, 120+Math.random()*200); });
tb.querySelector('#del').onclick=()=>{ if(!selected) return;
  if(selected.fromKey){ wires=wires.filter(w=>w!==selected); }
  else if(selected.type){ wires=wires.filter(w=>w.from.id!==selected.id&&w.to.id!==selected.id); selected.node.destroy(); gates=gates.filter(g=>g!==selected); }
  else if(selected.kind){ wires=wires.filter(w=>w.from.id!==selected.id&&w.to.id!==selected.id); selected.node.destroy(); terms=terms.filter(t=>t!==selected); }
  selected=null; drawPins(); drawWires(); emitStruct(); };
tb.querySelector('#clear').onclick=()=>{ gates.forEach(g=>g.node.destroy()); terms.forEach(t=>t.node.destroy()); gates=[];terms=[];wires=[];inLetter=65;wireFrom=null;selected=null;
  pinShapes.forEach(s=>s.destroy()); wireShapes.forEach(s=>s.destroy()); pinShapes=[];wireShapes=[]; layer.draw(); emitStruct(); };

emitStruct();

      return {
        update: () => {},
        clear: () => { try{ gates.forEach(g=>g.node.destroy()); terms.forEach(t=>t.node.destroy()); }catch(e){} gates=[];terms=[];wires=[];inLetter=65;wireFrom=null;selected=null; try{pinShapes.forEach(s=>s.destroy());wireShapes.forEach(s=>s.destroy());}catch(e){} pinShapes=[];wireShapes=[]; layer.draw(); emitStruct(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
