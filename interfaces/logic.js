/* Logic circuit (ready-made IGCSE gates) — Konva palette + terminals + wiring.
   Drop AND/OR/NOT/NAND/NOR/XOR, add Inputs (A,B..) + Output (Q), wire output->input.
   Saves { gates:[{id,gate,x,y}], inputs:[{id,label,x,y}], outputs:[…], wires:[{from:{k,id,pin},to:{k,id,pin}}] } or null.
   x, y are only there so a saved circuit can be shown again; marking ignores them.
   Marked by NedMark 'logic': the truth table of the student's circuit is compared with the expected one.
   Wiring: click any pin, then the pin to join it to (either order). An input pin holds one wire; a new wire replaces the old one.
   Requires Konva (loaded via index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('logic', { name:'Logic gates', unlocks:'boolean logic', samples:[{label:'Circuit', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva library not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('logic',
    { name:'Logic gates', unlocks:'boolean logic',
      samples:[
        { label:'Build a circuit', question:{ text:'Draw a logic circuit for Q = (A AND B) OR (NOT C).', marks:6, config:{} }, answer:{ expr:'(A AND B) OR (NOT C)', output:'Q' } },
        { label:'Single gate', question:{ text:'Draw a NAND gate with inputs A and B, output Q.', marks:3, config:{} }, answer:{ expr:'A NAND B', output:'Q' } },
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
      const note = Ned.el('p',{class:'ned-note'},['Click a gate to add it, add Inputs and an Output, then click one pin and the pin to join it to. Scroll to zoom, drag the background to move.']);
      container.appendChild(note);
      // style the icon buttons + tool buttons
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });


// wrap provided by scaffold
const W=Math.min(960, (container.clientWidth||900)-4), H=470;
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='select', selected=null, inLetter=65, wireFrom=null, loading=false;
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
function nextInputLabel(){ const used=new Set(terms.filter(t=>t.kind==='in').map(t=>t.label)); for(let c=65;c<91;c++){ const L=String.fromCharCode(c); if(L!=='Q'&&!used.has(L)) return L; } return 'A'; }
// pin local positions relative to gate group origin
function gatePinLocals(type){
  const bw=64, hw=bw/2; const n=inputsFor(type);
  let outX;
  if(type==='AND') outX=27+6;                // body ends where the semicircle ends (x = hh); the pin sits just outside it
  else if(type==='NAND') outX=27+6+5+6;       // + bubble
  else if(type==='OR'||type==='XOR') outX=hw+8;
  else if(type==='NOR') outX=hw+8+12;
  else outX=hw-6+12;                          // NOT triangle tip + bubble
  const pins=[];
  for(let i=0;i<n;i++){ const off=(n===1)?0:(i===0?-13:13); pins.push({pin:'in'+i,kind:'in',x:-hw-8,y:off}); }
  pins.push({pin:'out',kind:'out',x:outX,y:0});
  return pins;
}

function addGate(type,x,y,fixedId){
  const id=fixedId||('g'+(uid++));
  const g=new Konva.Group({x,y,draggable:true});
  const shape=drawGateShape(type); g.add(shape);
  const rec={id,type,node:g,inN:inputsFor(type)};
  g.on('dragmove',()=>{ drawPins(); drawWires(); });
  g.on('dragend',()=>{ emitStruct(); });
  g.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; select(rec); } });
  gates.push(rec); layer.add(g); drawPins(); layer.batchDraw(); emitStruct();
  return rec;
}
function addTerminal(kind,x,y,fixedId,fixedLabel){
  const id=fixedId||('t'+(uid++)); const label= fixedLabel || (kind==='in'?nextInputLabel():'Q');
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
  allPins().forEach(p=>{ const c=new Konva.Circle({x:p.x,y:p.y,radius:(wireFrom&&wireFrom.key===p.key)?7:5,fill:(wireFrom&&wireFrom.key===p.key)?'#4682b4':'#fff',stroke:'#4682b4',strokeWidth:1.5,hitStrokeWidth:14});
    c.on('mousedown touchstart',(e)=>{ e.cancelBubble=true; onPin(p); }); layer.add(c); pinShapes.push(c); });
  layer.batchDraw();
}
function onPin(p){
  if(!wireFrom){ wireFrom=p; drawPins(); return; }
  if(wireFrom.key===p.key){ wireFrom=null; drawPins(); return; }          // same pin again = cancel
  if(wireFrom.kind===p.kind){ wireFrom=p; drawPins(); return; }           // two outputs / two inputs: start again from this pin
  const out = wireFrom.kind==='out' ? wireFrom : p, inp = wireFrom.kind==='out' ? p : wireFrom;
  if(out.ownerId===inp.ownerId){ wireFrom=null; drawPins(); return; }     // a gate cannot feed itself directly
  wires = wires.filter(w=>w.toKey!==inp.key);                             // an input pin holds one wire
  wires.push({fromKey:out.key,toKey:inp.key,from:{k:out.ownerK,id:out.ownerId,pin:out.pin},to:{k:inp.ownerK,id:inp.ownerId,pin:inp.pin}});
  wireFrom=null; drawWires(); drawPins(); emitStruct();
}
let wireShapes=[];
function drawWires(){
  wireShapes.forEach(s=>s.destroy()); wireShapes=[];
  wires.forEach(w=>{ const a=pinByKey(w.fromKey), b=pinByKey(w.toKey); if(!a||!b) return; const mx=(a.x+b.x)/2;
    const back = b.x < a.x + 16;                                             // target is behind the source: route around instead of doubling back
    const pts = back ? [a.x,a.y, a.x+18,a.y, a.x+18,(a.y+b.y)/2+(Math.abs(a.y-b.y)<40?46:0), b.x-18,(a.y+b.y)/2+(Math.abs(a.y-b.y)<40?46:0), b.x-18,b.y, b.x,b.y] : [a.x,a.y,mx,a.y,mx,b.y,b.x,b.y];
    const ln=new Konva.Line({points:pts,stroke:(selected===w?'#4682b4':'#2b2b2b'),strokeWidth:2,lineJoin:'round',hitStrokeWidth:12});
    ln.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=w; drawWires(); } });
    layer.add(ln); wireShapes.push(ln); });
  pinShapes.forEach(s=>s.moveToTop());          // pins stay clickable even when a wire runs over them
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
  if(loading) return;
  const R=n=>Math.round(n);
  const gs=gates.map(g=>({id:g.id,gate:g.type,x:R(g.node.x()),y:R(g.node.y())}));
  const ins=terms.filter(t=>t.kind==='in').map(t=>({id:t.id,label:t.label,x:R(t.node.x()),y:R(t.node.y())}));
  const outs=terms.filter(t=>t.kind==='out').map(t=>({id:t.id,label:t.label,x:R(t.node.x()),y:R(t.node.y())}));
  const empty = gs.length===0 && wires.length===0;          // terminals alone are not an answer yet
  onChange(empty ? null : {gates:gs,inputs:ins,outputs:outs,wires:wires.map(w=>({from:w.from,to:w.to}))});
}

// ---------- toolbar ----------
function setTool(t){ tool=t; tb.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t)); }
tb.querySelectorAll('[data-tool]').forEach(b=> b.onclick=()=>setTool(b.dataset.tool));
// new gates go to the first free slot of a tidy grid (never on top of another part)
function freeSlot(){ const taken=(x,y)=>gates.some(g=>Math.abs(g.node.x()-x)<90&&Math.abs(g.node.y()-y)<70)||terms.some(t=>Math.abs(t.node.x()-x)<60&&Math.abs(t.node.y()-y)<50);
  for(let r=0;r<6;r++) for(let c=0;c<4;c++){ const x=230+c*150, y=80+r*105; if(x<W-90&&y<H-40&&!taken(x,y)) return {x,y}; } return {x:230+Math.random()*200,y:80+Math.random()*300}; }
tb.querySelectorAll('[data-gate]').forEach(b=> b.onclick=()=>{ const p=toWorld(freeSlot()); addGate(b.dataset.gate, p.x, p.y); });
tb.querySelector('#del').onclick=()=>{ if(!selected) return;
  if(selected.fromKey){ wires=wires.filter(w=>w!==selected); }
  else if(selected.type){ wires=wires.filter(w=>w.from.id!==selected.id&&w.to.id!==selected.id); selected.node.destroy(); gates=gates.filter(g=>g!==selected); }
  else if(selected.kind){ wires=wires.filter(w=>w.from.id!==selected.id&&w.to.id!==selected.id); selected.node.destroy(); terms=terms.filter(t=>t!==selected); }
  selected=null; drawPins(); drawWires(); emitStruct(); };
tb.querySelector('#clear').onclick=()=>{ gates.forEach(g=>g.node.destroy()); terms.forEach(t=>t.node.destroy()); gates=[];terms=[];wires=[];inLetter=65;wireFrom=null;selected=null;
  pinShapes.forEach(s=>s.destroy()); wireShapes.forEach(s=>s.destroy()); pinShapes=[];wireShapes=[]; layer.draw(); emitStruct(); };

function wipe(){ try{ gates.forEach(g=>g.node.destroy()); terms.forEach(t=>t.node.destroy()); }catch(e){} gates=[];terms=[];wires=[];wireFrom=null;selected=null;
  try{pinShapes.forEach(s=>s.destroy());wireShapes.forEach(s=>s.destroy());}catch(e){} pinShapes=[];wireShapes=[]; }
function loadValue(v){
  loading=true; wipe();
  if(v){
    let n=0;
    (v.gates||[]).forEach((g,i)=>{ addGate(g.gate, g.x!=null?g.x:260+(i%3)*150, g.y!=null?g.y:110+Math.floor(i/3)*110, g.id); n=Math.max(n, +String(g.id).replace(/\D/g,'')||0); });
    (v.inputs||[]).forEach((t,i)=>{ addTerminal('in', t.x!=null?t.x:70, t.y!=null?t.y:90+i*90, t.id, t.label); n=Math.max(n, +String(t.id).replace(/\D/g,'')||0); });
    (v.outputs||[]).forEach((t,i)=>{ addTerminal('out', t.x!=null?t.x:W-70, t.y!=null?t.y:200+i*90, t.id, t.label); n=Math.max(n, +String(t.id).replace(/\D/g,'')||0); });
    uid=n+1;
    const key=(e)=>e.id+':'+e.pin;
    (v.wires||[]).forEach(w=>{ const from=Object.assign({k:String(w.from.id)[0]==='g'?'gate':'term'},w.from), to=Object.assign({k:String(w.to.id)[0]==='g'?'gate':'term'},w.to); wires.push({fromKey:key(from),toKey:key(to),from,to}); });
  }
  loading=false; drawPins(); drawWires(); layer.batchDraw();
}
if(value) loadValue(value);
else if((question&&question.config&&question.config.inputs||[]).length){
  // the question names the inputs and the output: put them on the canvas ready to wire
  const ins=question.config.inputs; loading=true;
  ins.forEach((L,i)=>addTerminal('in',70,Math.round(H/2+(i-(ins.length-1)/2)*90),'t'+(uid++),String(L)));
  addTerminal('out',W-70,Math.round(H/2),'t'+(uid++),question.config.output||'X');
  inLetter=65+ins.length; loading=false; drawPins(); layer.batchDraw();
}
emitStruct();

      return {
        update: (v) => { loadValue(v); },
        clear: () => { try{ gates.forEach(g=>g.node.destroy()); terms.forEach(t=>t.node.destroy()); }catch(e){} gates=[];terms=[];wires=[];inLetter=65;wireFrom=null;selected=null; try{pinShapes.forEach(s=>s.destroy());wireShapes.forEach(s=>s.destroy());}catch(e){} pinShapes=[];wireShapes=[]; layer.draw(); emitStruct(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
