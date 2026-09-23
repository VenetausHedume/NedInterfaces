/* Circuit builder (physics) — Konva. Drop components (cell, battery, resistor,
   lamp, switch, ammeter, voltmeter, bulb, variable), draw wires (4 bend points,
   ends snap to terminals). Analyses series/parallel + checks meters
   (ammeter=series, voltmeter=parallel). Saves the circuit + analysis, or null.
   Requires Konva (loaded via index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('circuit', { name:'Circuit (build)', unlocks:'physics circuits', samples:[{label:'Circuit', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva library not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('circuit',
    { name:'Circuit (build)', unlocks:'physics circuits',
      samples:[
        { label:'Series circuit', question:{ text:'Draw a series circuit with a cell, a switch and two lamps.', marks:4, config:{} } },
        { label:'Meters', question:{ text:'Draw a circuit with a cell and a resistor. Add an ammeter to measure the current and a voltmeter to measure the p.d. across the resistor.', marks:5, config:{} } },
      ] },
    function (container, { question, value, onChange }) {
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<button data-tool="select" class="on">Select / Move</button>
    <button data-tool="wire">+ Wire</button>
    <span class="sep"></span>
    <button data-comp="cell" title="Cell"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="17" y2="13"/><line x1="17" y1="6" x2="17" y2="20"/><line x1="24" y1="9" x2="24" y2="17" stroke-width="5"/><line x1="24" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="battery" title="Battery"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="8" y2="13"/><line x1="8" y1="6" x2="8" y2="20"/><line x1="14" y1="9" x2="14" y2="17" stroke-width="5"/><line x1="20" y1="6" x2="20" y2="20"/><line x1="26" y1="9" x2="26" y2="17" stroke-width="5"/><line x1="26" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="resistor" title="Resistor"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="8" y2="13"/><rect x="8" y="7" width="28" height="12"/><line x1="36" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="lamp" title="Lamp"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="8" y2="13"/><circle cx="22" cy="13" r="9"/><line x1="16" y1="7" x2="28" y2="19"/><line x1="16" y1="19" x2="28" y2="7"/><line x1="36" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="switch" title="Switch"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="12" y2="13"/><circle cx="12" cy="13" r="1.5" fill="#2b2b2b"/><line x1="12" y1="13" x2="30" y2="5"/><circle cx="32" cy="13" r="1.5" fill="#2b2b2b"/><line x1="32" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="ammeter" title="Ammeter"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="9" y2="13"/><circle cx="22" cy="13" r="9"/><line x1="35" y1="13" x2="42" y2="13"/><text x="22" y="17" font-size="11" text-anchor="middle" stroke="none" fill="#2b2b2b" font-weight="bold">A</text></svg></button>
    <button data-comp="voltmeter" title="Voltmeter"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="9" y2="13"/><circle cx="22" cy="13" r="9"/><line x1="35" y1="13" x2="42" y2="13"/><text x="22" y="17" font-size="11" text-anchor="middle" stroke="none" fill="#2b2b2b" font-weight="bold">V</text></svg></button>
    <button data-comp="bulb" title="Bulb/indicator"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="9" y2="13"/><circle cx="22" cy="13" r="9"/><path d="M15 13 a7 7 0 0 1 14 0" /><line x1="35" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="variable" title="Variable resistor"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="8" y2="13"/><rect x="8" y="7" width="28" height="12"/><line x1="36" y1="13" x2="42" y2="13"/><line x1="10" y1="22" x2="34" y2="4"/><path d="M31 5 l3 -1 l-1 3" stroke-width="1.5"/></svg></button>
    <span class="sep"></span>
    <button data-tool="rotate" id="rotBtn" disabled>⟳ Rotate 90°</button>
    <button id="del">Delete</button>
    <button id="clear">Clear</button>`;
      const wrap = document.createElement('div'); wrap.style.cssText='position:relative;width:100%;max-width:980px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf7;touch-action:none;';
      const statusEl = document.createElement('div'); statusEl.style.cssText='font:13px ui-monospace,Menlo,Consolas,monospace;margin-top:8px;color:#555;';
      container.append(tb, wrap, statusEl);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Click a component icon to drop it; draw wires end-to-end (ends snap to terminals). Scroll=zoom, drag empty=pan.']));
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:4px 7px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });
      tb.querySelectorAll('button svg').forEach(sv=>{ sv.style.display='block'; });


// wrap & bar provided by scaffold
const W=Math.min(980,(container.clientWidth||900)-4), H=480;
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='select', selected=null, wireFrom=null;
let comps=[];   // {id,type,node(Group),rot}
let wires=[];   // {id, a:{x,y,snap}, mid:{x,y}, b:{x,y,snap}}  drawn segments; snap = terminal key or null

// ---- component symbols drawn in a group; body length 60, two leads to terminals at x=-40 and x=+40 ----
const LEAD=40, S='#2b2b2b', SW=2.5;
function line(pts,extra){ return new Konva.Line(Object.assign({points:pts,stroke:S,strokeWidth:SW,lineCap:'round'},extra||{})); }
function drawComp(type){
  const g=new Konva.Group(); const parts=[];
  // leads
  parts.push(line([-LEAD,0,-18,0])); parts.push(line([18,0,LEAD,0]));
  if(type==='cell'){ // long line + short thick line
    parts.push(line([-6,-14,-6,14])); parts.push(line([6,-7,6,7],{strokeWidth:6}));
    // reconnect leads to plates
    parts.push(line([-18,0,-6,0])); parts.push(line([6,0,18,0]));
  } else if(type==='battery'){ parts.push(line([-12,-14,-12,14])); parts.push(line([-4,-7,-4,7],{strokeWidth:6}));
    parts.push(line([4,-14,4,14])); parts.push(line([12,-7,12,7],{strokeWidth:6}));
    parts.push(line([-18,0,-12,0])); parts.push(line([12,0,18,0]));
  } else if(type==='resistor'){ parts.push(new Konva.Rect({x:-18,y:-8,width:36,height:16,stroke:S,strokeWidth:SW})); }
  else if(type==='variable'){ parts.push(new Konva.Rect({x:-18,y:-8,width:36,height:16,stroke:S,strokeWidth:SW}));
    parts.push(line([-22,12,22,-12],{})); parts.push(new Konva.Arrow({points:[-22,12,22,-12],stroke:S,fill:S,strokeWidth:SW,pointerLength:6,pointerWidth:6})); }
  else if(type==='lamp'){ parts.push(new Konva.Circle({radius:14,stroke:S,strokeWidth:SW}));
    parts.push(line([-10,-10,10,10])); parts.push(line([-10,10,10,-10]));
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
  else if(type==='bulb'){ parts.push(new Konva.Circle({radius:14,stroke:S,strokeWidth:SW}));
    parts.push(new Konva.Arc({innerRadius:0,outerRadius:8,angle:180,rotation:180,stroke:S,strokeWidth:SW}));
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
  else if(type==='switch'){ parts.push(new Konva.Circle({x:-14,y:0,radius:2.5,fill:S}));
    parts.push(new Konva.Circle({x:14,y:0,radius:2.5,fill:S})); parts.push(line([-14,0,10,-12]));
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
  else if(type==='ammeter'){ parts.push(new Konva.Circle({radius:14,stroke:S,strokeWidth:SW}));
    const t=new Konva.Text({text:'A',fontSize:15,fontStyle:'bold',fill:S}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); parts.push(t);
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
  else if(type==='voltmeter'){ parts.push(new Konva.Circle({radius:14,stroke:S,strokeWidth:SW}));
    const t=new Konva.Text({text:'V',fontSize:15,fontStyle:'bold',fill:S}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); parts.push(t);
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
  parts.forEach(p=>g.add(p));
  return g;
}
// terminal local positions (two ends)
function termLocals(){ return [{term:'a',x:-LEAD,y:0},{term:'b',x:LEAD,y:0}]; }

function addComp(type,x,y){
  const id='c'+(uid++);
  const g=new Konva.Group({x,y,draggable:true});
  g.add(drawComp(type));
  const rec={id,type,node:g,rot:0};
  g.on('dragmove',()=>{ drawTerms(); drawWires(); });
  g.on('dragend',()=>emit());
  g.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; select(rec); } });
  comps.push(rec); layer.add(g); drawTerms(); layer.batchDraw(); emit();
  return rec;
}

// ---- terminals (blue dots at both ends, in world coords) ----
function compTerms(rec){
  const g=rec.node; const rot=(rec.rot||0)*Math.PI/180, cos=Math.cos(rot), sin=Math.sin(rot);
  return termLocals().map(t=>({ key:rec.id+':'+t.term, id:rec.id, term:t.term,
    x:g.x()+t.x*cos - t.y*sin, y:g.y()+t.x*sin + t.y*cos }));
}
function allTerms(){ let a=[]; comps.forEach(c=>a=a.concat(compTerms(c))); return a; }
function termByKey(k){ return allTerms().find(t=>t.key===k); }
let termShapes=[];
function drawTerms(){
  termShapes.forEach(s=>s.destroy()); termShapes=[];
  allTerms().forEach(t=>{ const c=new Konva.Circle({x:t.x,y:t.y,radius:5,fill:(wireFrom&&wireFrom.key===t.key)?'#4682b4':'#fff',stroke:'#4682b4',strokeWidth:1.5,hitStrokeWidth:14});
    c.on('mousedown touchstart',(e)=>{ e.cancelBubble=true; onTerm(t); }); layer.add(c); termShapes.push(c); });
  layer.batchDraw();
}
// (terminals are snap targets for drawn wires; clicking them directly does nothing now)
const SNAP=22;
function nearestTerm(x,y){ let best=null,bd=SNAP; allTerms().forEach(t=>{ const d=Math.hypot(t.x-x,t.y-y); if(d<bd){bd=d;best=t;} }); return best; }
let wireShapes=[];
function wpt(p){ // resolve a wire endpoint's position: snapped terminal position if snapped, else its x/y
  if(p.snap){ const t=termByKey(p.snap); if(t) return {x:t.x,y:t.y}; }
  return {x:p.x,y:p.y};
}
function wirePolyline(w){ const a=wpt(w.a), b=wpt(w.b); const pts=[a.x,a.y]; (w.pts||[]).forEach(p=>{pts.push(p.x,p.y);}); pts.push(b.x,b.y); return pts; }
function drawWires(){
  wireShapes.forEach(s=>s.destroy()); wireShapes=[];
  wires.forEach(w=>{
    const ln=new Konva.Line({points:wirePolyline(w),stroke:(selected===w?'#4682b4':'#2b2b2b'),strokeWidth:2.5,hitStrokeWidth:14,lineCap:'round',lineJoin:'round'});
    ln.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=w; drawWires(); } });
    layer.add(ln); wireShapes.push(ln);
    if(selected===w){
      const relive=()=>{ ln.points(wirePolyline(w)); layer.batchDraw(); };
      // endpoint handles (snap to terminals)
      const mkEnd=(role)=>{ const pos=wpt(w[role]); const h=new Konva.Circle({x:pos.x,y:pos.y,radius:6,fill:w[role].snap?'#4caf50':'#fff',stroke:w[role].snap?'#2e7d32':'#4682b4',strokeWidth:2,draggable:true,hitStrokeWidth:16});
        h.on('dragmove',()=>{ const near=nearestTerm(h.x(),h.y()); if(near){ w[role].snap=near.key; w[role].x=near.x; w[role].y=near.y; } else { w[role].snap=null; w[role].x=h.x(); w[role].y=h.y(); } relive(); });
        h.on('dragend',()=>{ if(w[role].snap){ const t=termByKey(w[role].snap); if(t) h.position({x:t.x,y:t.y}); } drawWires(); emit(); });
        layer.add(h); wireShapes.push(h); };
      mkEnd('a'); mkEnd('b');
      // 4 interior bend handles
      (w.pts||[]).forEach((bp,idx)=>{ const h=new Konva.Circle({x:bp.x,y:bp.y,radius:5.5,fill:'#fff',stroke:'#4682b4',strokeWidth:2,draggable:true,hitStrokeWidth:14});
        h.on('dragmove',()=>{ w.pts[idx]={x:h.x(),y:h.y()}; relive(); });
        h.on('dragend',()=> emit());
        layer.add(h); wireShapes.push(h); });
    }
  });
  layer.batchDraw();
}

// ---- selection + rotate ----
function select(o){ selected=o; drawWires(); tb.querySelector('#rotBtn').disabled = !(o&&o.type); }
function deselect(){ selected=null; drawWires(); tb.querySelector('#rotBtn').disabled=true; }
function rotateSel(){ if(selected&&selected.type){ selected.rot=((selected.rot||0)+90)%360; selected.node.rotation(selected.rot); drawTerms(); drawWires(); emit(); } }

// ---- board ----
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(tool==='wire'){ const p=toWorld(stage.getPointerPosition());
    const a={x:p.x-40,y:p.y,snap:null}, b={x:p.x+40,y:p.y,snap:null};
    const na=nearestTerm(a.x,a.y); if(na){a.snap=na.key;a.x=na.x;a.y=na.y;}
    const nb=nearestTerm(b.x,b.y); if(nb){b.snap=nb.key;b.x=nb.x;b.y=nb.y;}
    const bendPts=[]; for(let i=1;i<=4;i++){ const t=i/5; bendPts.push({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t}); }
    const w={id:'w'+(uid++),a,b,pts:bendPts}; wires.push(w); selected=w; setTool('select'); drawWires(); drawTerms(); emit(); return; }
  deselect(); drawTerms();
}});
function toWorld(p){ const t=stage.getAbsoluteTransform().copy(); t.invert(); return t.point(p); }
stage.on('wheel',(e)=>{ e.evt.preventDefault(); const old=stage.scaleX(); const ptr=stage.getPointerPosition();
  const m={x:(ptr.x-stage.x())/old,y:(ptr.y-stage.y())/old}; const dir=e.evt.deltaY>0?-1:1; const f=1.08; const k=Math.max(0.4,Math.min(2.5,dir>0?old*f:old/f));
  stage.scale({x:k,y:k}); stage.position({x:ptr.x-m.x*k,y:ptr.y-m.y*k}); stage.batchDraw(); drawTerms(); drawWires(); });

function analyzeCircuit(){
  const wlist = wires.filter(w=>w.a.snap&&w.b.snap).map(w=>[w.a.snap,w.b.snap]);
  const terms=[]; comps.forEach(c=>terms.push(c.id+':a',c.id+':b'));
  const parent={}; terms.forEach(t=>parent[t]=t); const find=x=>{while(parent[x]!==x)x=parent[x]=parent[parent[x]];return x;};
  wlist.forEach(w=>{ parent[find(w[0])]=find(w[1]); });
  const nodeOf={}; terms.forEach(t=>nodeOf[t]=find(t));
  const isSrc=t=>(t==='cell'||t==='battery');
  const spans=comps.map(c=>({id:c.id,type:c.type,n1:nodeOf[c.id+':a'],n2:nodeOf[c.id+':b']}));
  const degree={}; spans.forEach(sp=>{ degree[sp.n1]=(degree[sp.n1]||0)+1; degree[sp.n2]=(degree[sp.n2]||0)+1; });
  const openT = terms.filter(t=>{ let u=false; wires.forEach(w=>{ if(w.a.snap===t||w.b.snap===t)u=true;}); return !u; });
  const parallelPairs=[];
  for(let i=0;i<spans.length;i++)for(let j=i+1;j<spans.length;j++){ const A=spans[i],B=spans[j];
    if(isSrc(A.type)||isSrc(B.type)) continue;
    if((A.n1===B.n1&&A.n2===B.n2)||(A.n1===B.n2&&A.n2===B.n1)) parallelPairs.push([A.type,B.type]); }
  const meterReport=[];
  spans.filter(sp=>sp.type==='voltmeter'||sp.type==='ammeter').forEach(m=>{
    if(m.type==='voltmeter'){ const across=spans.find(o=>o.id!==m.id&&o.type!=='voltmeter'&&((o.n1===m.n1&&o.n2===m.n2)||(o.n1===m.n2&&o.n2===m.n1)));
      meterReport.push({type:'voltmeter',correct:!!across,actual:across?('parallel across '+across.type):'not in parallel'}); }
    else { let ok=false,withC=null; spans.forEach(o=>{ if(o.id===m.id||o.type==='ammeter')return; const sh=[m.n1,m.n2].filter(n=>n===o.n1||n===o.n2); if(sh.length===1&&degree[sh[0]]===2){ok=true;withC=o.type;} });
      meterReport.push({type:'ammeter',correct:ok,actual:ok?('series with '+withC):'not in series'}); }
  });
  const branch=Object.keys(degree).filter(n=>degree[n]>=3);
  let overall = openT.length? 'open' : (branch.length===0? 'series':'parallel');
  return {overall,openN:openT.length,parallelPairs,meterReport,spans};
}
function emit(){
  drawTerms(); drawWires();
  const cs=comps.map(c=>({id:c.id,type:c.type,rot:c.rot||0}));
  const A=analyzeCircuit();
  const wiresOut=wires.map(w=>({a:w.a.snap||null,b:w.b.snap||null,bends:(w.pts||[]).map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))}));
  const empty = cs.length===0 && wires.length===0;
  onChange(empty ? null : {components:cs,wires:wiresOut,
    spans:A.spans.map(s=>({id:s.id,type:s.type,node1:s.n1,node2:s.n2})),
    overall:A.overall, parallelPairs:A.parallelPairs, meters:A.meterReport});
  // status
  let html='components: '+cs.length+' ['+cs.map(c=>c.type).join(', ')+'], wires: '+wires.length;
  if(cs.length){
    html += '<br>circuit: <b>'+A.overall+'</b>' + (A.openN? ' <span style="color:#c0392b">('+A.openN+' open terminal'+(A.openN>1?'s':'')+')</span>':'');
    if(A.parallelPairs.length) html += ' | parallel: '+A.parallelPairs.map(p=>p[0]+'∥'+p[1]).join(', ');
    A.meterReport.forEach(m=>{ html += '<br>'+m.type+': '+(m.correct
      ? '<span style="color:#2e7d32">✓ '+m.actual+'</span>'
      : '<span style="color:#c0392b">✗ should be '+(m.type==='ammeter'?'series':'parallel')+' — '+m.actual+'</span>'); });
  }
  statusEl.innerHTML=html;
}

// ---- toolbar ----
function setTool(t){ tool=t; tb.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t)); }
tb.querySelectorAll('[data-tool]').forEach(b=>{ if(b.dataset.tool!=='rotate') b.onclick=()=>setTool(b.dataset.tool); });
tb.querySelectorAll('[data-comp]').forEach(b=> b.onclick=()=>{ addComp(b.dataset.comp, 130+Math.random()*300, 120+Math.random()*220); setTool('select'); });
tb.querySelector('#rotBtn').onclick=rotateSel;
tb.querySelector('#del').onclick=()=>{ if(!selected) return;
  if(selected.id&&selected.a){ wires=wires.filter(w=>w!==selected); }
  else if(selected.type){ wires=wires.filter(w=>w.from.id!==selected.id&&w.to.id!==selected.id); selected.node.destroy(); comps=comps.filter(c=>c!==selected); }
  selected=null; drawTerms(); drawWires(); emit(); };
tb.querySelector('#clear').onclick=()=>{ comps.forEach(c=>c.node.destroy()); comps=[];wires=[];wireFrom=null;selected=null;
  termShapes.forEach(s=>s.destroy()); wireShapes.forEach(s=>s.destroy()); termShapes=[];wireShapes=[]; layer.draw(); emit(); };

emit();

      return {
        update: () => {},
        clear: () => { try{ comps.forEach(c=>c.node.destroy()); }catch(e){} comps=[];wires=[];wireFrom=null;selected=null; try{termShapes.forEach(s=>s.destroy());wireShapes.forEach(s=>s.destroy());}catch(e){} termShapes=[];wireShapes=[]; layer.draw(); emit(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
