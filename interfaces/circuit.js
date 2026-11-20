/* Circuit builder (physics) — Konva. Components (cell,battery,resistor,lamp,switch,
   ammeter,voltmeter,bulb,variable) with a rotation handle; wires (2 ends + 1 bend)
   that snap to terminals and can be moved. Analyses series/parallel + checks meters
   (ammeter=series, voltmeter=parallel). Saves circuit + analysis, or null.
   Marked by NedMark 'circuit': the right components, a complete circuit in the right arrangement, meters connected correctly.
   Requires Konva (index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('circuit', { name:'Circuit (build)', unlocks:'physics circuits', samples:[{label:'Circuit', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva library not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('circuit',
    { name:'Circuit (build)', unlocks:'physics circuits',
      samples:[
        { label:'Series circuit', question:{ text:'Draw a series circuit with a cell, a switch and two lamps.', marks:4, config:{} }, answer:{ components:{ cell:1, switch:1, lamp:2 }, arrangement:'series' } },
        { label:'Thermistor and lamp in series', question:{ text:'Draw a circuit in which a cell, a thermistor and a lamp are connected in series.', marks:3, config:{} }, answer:{ components:{ cell:1, thermistor:1, lamp:1 }, arrangement:'series' } },
        { label:'Meters', question:{ text:'Draw a circuit with a cell and a resistor. Add an ammeter to measure the current and a voltmeter to measure the p.d. across the resistor.', marks:5, config:{} }, answer:{ components:{ cell:1, resistor:1, ammeter:1, voltmeter:1 }, meters:true } },
      ] },
    function (container, { question, value, onChange }) {
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<button data-tool="select" class="on">Select / Move</button>
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
    <button data-comp="thermistor" title="Thermistor"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="8" y2="13"/><rect x="8" y="7" width="28" height="12"/><line x1="36" y1="13" x2="42" y2="13"/><polyline points="6,23 10,23 34,3"/></svg></button>
    <button data-comp="ldr" title="Light-dependent resistor (LDR)"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="15" x2="8" y2="15"/><rect x="8" y="10" width="28" height="10"/><line x1="36" y1="15" x2="42" y2="15"/><line x1="12" y1="1" x2="18" y2="7"/><path d="M15 7 h3 v-3" stroke-width="1.5"/><line x1="22" y1="1" x2="28" y2="7"/><path d="M25 7 h3 v-3" stroke-width="1.5"/></svg></button>
    <button data-comp="diode" title="Diode"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="14" y2="13"/><path d="M14 5 L28 13 L14 21 Z"/><line x1="28" y1="5" x2="28" y2="21"/><line x1="28" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="led" title="Light-emitting diode (LED)"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="15" x2="12" y2="15"/><path d="M12 8 L24 15 L12 22 Z"/><line x1="24" y1="8" x2="24" y2="22"/><line x1="24" y1="15" x2="42" y2="15"/><line x1="26" y1="6" x2="32" y2="1"/><line x1="31" y1="9" x2="37" y2="4"/></svg></button>
    <button data-comp="fuse" title="Fuse"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="42" y2="13"/><rect x="10" y="8" width="24" height="10"/></svg></button>
    <button data-comp="heater" title="Heater"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="8" y2="13"/><rect x="8" y="7" width="28" height="12"/><line x1="15" y1="7" x2="15" y2="19"/><line x1="22" y1="7" x2="22" y2="19"/><line x1="29" y1="7" x2="29" y2="19"/><line x1="36" y1="13" x2="42" y2="13"/></svg></button>
    <button data-comp="ac" title="a.c. power supply"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="15" x2="14" y2="15"/><circle cx="17" cy="15" r="3"/><circle cx="27" cy="15" r="3"/><line x1="30" y1="15" x2="42" y2="15"/><path d="M18 7 C19.5 3.5 21 3.5 22 7 C23 10.5 24.5 10.5 26 7" stroke-width="1.6"/></svg></button>
    <button data-comp="supply" title="Power supply"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="15" x2="14" y2="15"/><circle cx="17" cy="15" r="3"/><circle cx="27" cy="15" r="3"/><line x1="30" y1="15" x2="42" y2="15"/></svg></button>
    <button data-comp="dcsupply" title="d.c. power supply"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="15" x2="14" y2="15"/><circle cx="17" cy="15" r="3"/><circle cx="27" cy="15" r="3"/><line x1="30" y1="15" x2="42" y2="15"/><text x="17" y="9" font-size="9" text-anchor="middle" stroke="none" fill="#2b2b2b" font-weight="bold">+</text><text x="27" y="9" font-size="9" text-anchor="middle" stroke="none" fill="#2b2b2b" font-weight="bold">−</text></svg></button>
    <button data-comp="generator" title="Generator"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="9" y2="13"/><circle cx="22" cy="13" r="9"/><line x1="35" y1="13" x2="42" y2="13"/><text x="22" y="17" font-size="11" text-anchor="middle" stroke="none" fill="#2b2b2b" font-weight="bold">G</text></svg></button>
    <button data-comp="motor" title="Motor"><svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"><line x1="2" y1="13" x2="9" y2="13"/><circle cx="22" cy="13" r="9"/><line x1="35" y1="13" x2="42" y2="13"/><text x="22" y="17" font-size="11" text-anchor="middle" stroke="none" fill="#2b2b2b" font-weight="bold">M</text></svg></button>
    <span class="sep"></span>
    <button id="del">Delete</button>
    <button id="clear">Clear</button>`;
      const wrap = document.createElement('div'); wrap.style.cssText='position:relative;width:100%;max-width:980px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf7;touch-action:none;';
      const statusEl = document.createElement('div'); statusEl.style.cssText='font:13px ui-monospace,Menlo,Consolas,monospace;margin-top:8px;color:#555;';
      container.append(tb, wrap, statusEl);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Click a component to add it. To wire: click one blue terminal, then the terminal to join it to. Select a component to turn it; select a wire to delete it or drag its corner.']));
      if(question&&question.config&&question.config.names===false) tb.querySelectorAll('[data-comp]').forEach(b=>b.removeAttribute('title'));   // knowing the symbols is part of the question
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:4px 7px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });
      tb.querySelectorAll('button svg').forEach(sv=>{ sv.style.display='block'; });


// wrap & bar provided by scaffold
const FIG=(question&&question.config&&question.config.circuit)||null;      // the printed circuit to complete
const W=Math.min(980,(container.clientWidth||900)-4);
const FW=FIG?Math.max(FIG.width||600,600):900, FH=FIG?(FIG.height||300)+170:480;   // room under the figure for new parts
const K=FIG?Math.min(1,W/FW):1, H=Math.round(FIG?FH*K:480);
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
if(K!==1) stage.scale({x:K,y:K});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='select', selected=null, wireFrom=null, loading=false;
let comps=[];   // {id,type,node(Group),rot}
let wires=[];   // {id, a:{x,y,snap}, mid:{x,y}, b:{x,y,snap}}  drawn segments; snap = terminal key or null

// ---- component symbols drawn in a group; body length 60, two leads to terminals at x=-40 and x=+40 ----
const LEAD=40, S='#2b2b2b', SW=2.5;
function line(pts,extra){ return new Konva.Line(Object.assign({points:pts,stroke:S,strokeWidth:SW,lineCap:'round'},extra||{})); }
function drawComp(type,len,kind){
  const g=new Konva.Group(); const parts=[]; const L=Math.max(len||LEAD,18);
  if(type==='node'){                                    // a point of a given circuit: junction dot, terminal post, or nothing
    if(kind==='dot') g.add(new Konva.Circle({radius:3.5,fill:S}));
    else if(kind==='post') g.add(new Konva.Circle({radius:4.5,fill:'#fffdf7',stroke:S,strokeWidth:1.8}));
    return g; }
  // leads
  parts.push(line([-L,0,-18,0])); parts.push(line([18,0,L,0]));
  if(type==='ac'||type==='supply'||type==='dcsupply'){            // power supplies: two terminals (Cambridge symbols)
    parts.length=0; parts.push(line([-L,0,-12,0])); parts.push(line([12,0,L,0]));
    parts.push(new Konva.Circle({x:-9,y:0,radius:3.5,stroke:S,strokeWidth:2,fill:'#fffdf7'})); parts.push(new Konva.Circle({x:9,y:0,radius:3.5,stroke:S,strokeWidth:2,fill:'#fffdf7'}));
    if(type==='ac') parts.push(new Konva.Path({data:'M-5 -9 C-3.5 -13 -1.5 -13 0 -9 C1.5 -5 3.5 -5 5 -9',stroke:S,strokeWidth:1.8}));
    if(type==='dcsupply'){ [['+',-9],['\u2212',9]].forEach(([t,x])=>{ const k=new Konva.Text({text:t,fontSize:14,fontStyle:'bold',fill:S}); k.offsetX(k.width()/2); k.offsetY(k.height()+5); k.x(x); parts.push(k); }); } }
  else if(type==='generator'){ parts.push(new Konva.Circle({radius:14,stroke:S,strokeWidth:SW}));
    const t=new Konva.Text({text:'G',fontSize:15,fontStyle:'bold',fill:S}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); parts.push(t);
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
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
  else if(type==='thermistor'||type==='heater'||type==='fuse'||type==='ldr'){
    if(type==='fuse'){ parts.push(new Konva.Rect({x:-16,y:-6,width:32,height:12,stroke:S,strokeWidth:SW})); parts.push(line([-18,0,18,0])); }
    else parts.push(new Konva.Rect({x:-18,y:-8,width:36,height:16,stroke:S,strokeWidth:SW}));
    if(type==='thermistor') parts.push(line([-26,16,-20,16,20,-16]));
    if(type==='heater') [-6,6].forEach(x=>parts.push(line([x,-8,x,8])));
    if(type==='ldr') [-10,4].forEach(x=>parts.push(new Konva.Arrow({points:[x-8,-26,x,-14],stroke:S,fill:S,strokeWidth:1.8,pointerLength:5,pointerWidth:5}))); }
  else if(type==='diode'||type==='led'){ parts.push(new Konva.Line({points:[-10,-10,8,0,-10,10],closed:true,stroke:S,strokeWidth:SW}));
    parts.push(line([8,-10,8,10])); parts.push(line([-18,0,-10,0])); parts.push(line([8,0,18,0]));
    if(type==='led') [0,9].forEach(x=>parts.push(new Konva.Arrow({points:[x,-12,x+8,-22],stroke:S,fill:S,strokeWidth:1.8,pointerLength:5,pointerWidth:5}))); }
  else if(type==='motor'){ parts.push(new Konva.Circle({radius:14,stroke:S,strokeWidth:SW}));
    const t=new Konva.Text({text:'M',fontSize:15,fontStyle:'bold',fill:S}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); parts.push(t);
    parts.push(line([-18,0,-14,0])); parts.push(line([14,0,18,0])); }
  parts.forEach(p=>g.add(p));
  return g;
}
// terminal local positions (two ends)
function termLocals(rec){ if(rec&&rec.type==='node') return [{term:'a',x:0,y:0}];
  const L=Math.max((rec&&rec.len)||LEAD,18); return [{term:'a',x:-L,y:0},{term:'b',x:L,y:0}]; }

/* opts: { len, label, given, kind }. A given part belongs to the printed figure: it cannot be moved or deleted. */
function addComp(type,x,y,fixedId,rot,opts){
  opts=opts||{};
  const id=fixedId||('c'+(uid++));
  const g=new Konva.Group({x,y,draggable:!opts.given});
  g.add(drawComp(type,opts.len,opts.kind));
  const rec={id,type,node:g,rot:rot||0,len:opts.len||null,given:!!opts.given,kind:opts.kind||null,label:opts.label||null}; if(rot) g.rotation(rot);
  g.find('Text').forEach(t=>t.rotation(-(rot||0)));      // the A, V, M inside a meter stay upright
  if(opts.label){ const vert=(rot||0)%180!==0, isNode=type==='node';
    const t=new Konva.Text({text:opts.label,fontSize:15,fill:S,listening:false});
    if(isNode) t.position({x:x-t.width()/2-(0),y:y-t.height()-8});
    else if(vert) t.position({x:x+22,y:y-t.height()/2});
    else t.position({x:x-t.width()/2,y:y-t.height()-16});
    layer.add(t); rec.labelNode=t; }
  g.on('dragmove',()=>{ drawTerms(); drawWires(); if(selected===rec) showRot(rec); });
  g.on('dragend',()=>emit());
  g.on('mousedown touchstart',(e)=>{ if(tool==='select'&&!rec.given){ e.cancelBubble=true; select(rec); } });
  comps.push(rec); layer.add(g); if(!loading){ drawTerms(); layer.batchDraw(); emit(); }
  return rec;
}

// ---- terminals (blue dots at both ends, in world coords) ----
function compTerms(rec){
  const g=rec.node; const rot=(rec.rot||0)*Math.PI/180, cos=Math.cos(rot), sin=Math.sin(rot);
  return termLocals(rec).map(t=>({ key:rec.id+':'+t.term, id:rec.id, term:t.term,
    x:g.x()+t.x*cos - t.y*sin, y:g.y()+t.x*sin + t.y*cos }));
}
function allTerms(){ let a=[]; comps.forEach(c=>{ if(c.type==='node'&&c.kind==='corner') return; a=a.concat(compTerms(c)); }); return a; }
function anyTerm(k){ let r=null; comps.forEach(c=>compTerms(c).forEach(t=>{ if(t.key===k) r=t; })); return r; }
function termByKey(k){ return anyTerm(k); }
let termShapes=[];
function drawTerms(){
  termShapes.forEach(s=>s.destroy()); termShapes=[];
  allTerms().forEach(t=>{ const c=new Konva.Circle({_key:t.key,x:t.x,y:t.y,radius:5,fill:(wireFrom&&wireFrom.key===t.key)?'#4682b4':'#fff',stroke:'#4682b4',strokeWidth:1.5,hitStrokeWidth:14});
    c.on('mousedown touchstart',(e)=>{ e.cancelBubble=true; onTerm(t); }); layer.add(c); termShapes.push(c); });
  layer.draw();   // drawn at once, so a terminal can be clicked the moment it appears
}
/* wiring: click one terminal, then another. The wire is fixed to both and bends once, like a drawn circuit.
   Several wires may meet at one terminal (that is how a parallel branch is made). */
function onTerm(t){
  if(!wireFrom){ wireFrom=t; drawTerms(); return; }
  if(wireFrom.key===t.key){ wireFrom=null; drawTerms(); return; }
  const dup=wires.some(w=>(w.a.snap===wireFrom.key&&w.b.snap===t.key)||(w.a.snap===t.key&&w.b.snap===wireFrom.key));
  if(!dup) wires.push({id:'w'+(uid++),a:{x:wireFrom.x,y:wireFrom.y,snap:wireFrom.key},b:{x:t.x,y:t.y,snap:t.key},pts:[],auto:true});
  wireFrom=null; drawWires(); drawTerms(); emit();
}
/* the corner of an automatic wire: the one of the two possible corners that keeps clear of the components */
function autoCorner(a,b){
  if(Math.abs(a.x-b.x)<6||Math.abs(a.y-b.y)<6) return [];
  const c1={x:b.x,y:a.y}, c2={x:a.x,y:b.y};
  const clear=c=>Math.min.apply(null,comps.map(k=>Math.hypot(k.node.x()-c.x,k.node.y()-c.y)).concat([1e9]));
  return [clear(c1)>=clear(c2)?c1:c2];
}
const SNAP=22;
function nearestTerm(x,y){ let best=null,bd=SNAP; allTerms().forEach(t=>{ const d=Math.hypot(t.x-x,t.y-y); if(d<bd){bd=d;best=t;} }); return best; }
let wireShapes=[];
function wpt(p){ // resolve a wire endpoint's position: snapped terminal position if snapped, else its x/y
  if(p.snap){ const t=termByKey(p.snap); if(t) return {x:t.x,y:t.y}; }
  return {x:p.x,y:p.y};
}
function wirePolyline(w){ const a=wpt(w.a), b=wpt(w.b); const pts=[a.x,a.y]; (w.auto?autoCorner(a,b):(w.pts||[])).forEach(p=>{pts.push(p.x,p.y);}); pts.push(b.x,b.y); return pts; }
function drawWires(){
  wireShapes.forEach(s=>s.destroy()); wireShapes=[];
  wires.forEach(w=>{
    const ln=new Konva.Line({points:wirePolyline(w),stroke:(selected===w?'#4682b4':'#2b2b2b'),strokeWidth:2.5,hitStrokeWidth:16,lineCap:'round',lineJoin:'round'});
    layer.add(ln); wireShapes.push(ln);
    // ---- move the whole wire by dragging its body (pointer-delta) ----
    let dragging=false, last=null;
    if(w.given){ ln.listening(false); return; }
    ln.on('mousedown touchstart',(e)=>{ if(tool!=='select') return; e.cancelBubble=true; selected=w;
      if(w.auto){ clearRot(); drawWires(); return; }          // a terminal-to-terminal wire stays attached: select it to delete it
      dragging=true; last=stage.getPointerPosition();
      // detach snapped endpoints so the whole wire moves
      const A=wpt(w.a), B=wpt(w.b); w.a.x=A.x; w.a.y=A.y; w.b.x=B.x; w.b.y=B.y; w.a.snap=null; w.b.snap=null;
      drawWires();
    });
    stage.on('mousemove.w'+w.id+' touchmove.w'+w.id,()=>{ if(!dragging) return; const p=stage.getPointerPosition(); if(!p||!last) return;
      const k=1/stage.scaleX(); const dx=(p.x-last.x)*k, dy=(p.y-last.y)*k; last=p;
      w.a.x+=dx; w.a.y+=dy; w.b.x+=dx; w.b.y+=dy; (w.pts||[]).forEach(bp=>{ bp.x+=dx; bp.y+=dy; });
      ln.points(wirePolyline(w)); layer.batchDraw();
    });
    stage.on('mouseup.w'+w.id+' touchend.w'+w.id,()=>{ if(dragging){ dragging=false; last=null;
      ['a','b'].forEach(role=>{ const near=nearestTerm(w[role].x,w[role].y); if(near){ w[role].snap=near.key; w[role].x=near.x; w[role].y=near.y; } });
      drawWires(); emit();
    }});

    if(selected===w && !w.auto){
      const relive=()=>{ ln.points(wirePolyline(w)); layer.batchDraw(); };
      const mkEnd=(role)=>{ const pos=wpt(w[role]); const h=new Konva.Circle({x:pos.x,y:pos.y,radius:6,fill:w[role].snap?'#4caf50':'#fff',stroke:w[role].snap?'#2e7d32':'#4682b4',strokeWidth:2,draggable:true,hitStrokeWidth:16});
        h.on('dragmove',()=>{ const near=nearestTerm(h.x(),h.y()); if(near){ w[role].snap=near.key; w[role].x=near.x; w[role].y=near.y; } else { w[role].snap=null; w[role].x=h.x(); w[role].y=h.y(); } relive(); });
        h.on('dragend',()=>{ if(w[role].snap){ const t=termByKey(w[role].snap); if(t) h.position({x:t.x,y:t.y}); } drawWires(); emit(); });
        layer.add(h); wireShapes.push(h); };
      mkEnd('a'); mkEnd('b');
      (w.pts||[]).forEach((bp,idx)=>{ const h=new Konva.Circle({x:bp.x,y:bp.y,radius:5.5,fill:'#fff',stroke:'#4682b4',strokeWidth:2,draggable:true,hitStrokeWidth:14});
        h.on('dragmove',()=>{ w.pts[idx]={x:h.x(),y:h.y()}; relive(); });
        h.on('dragend',()=> emit());
        layer.add(h); wireShapes.push(h); });
    }
  });
  termShapes.forEach(t=>t.moveToTop());          // terminals stay clickable even when a wire runs over them
  layer.batchDraw();
}
// ---- selection + rotate ----
let rotG=null, rotLine=null, rotBadge=null;
function clearRot(){ [rotG,rotLine,rotBadge].forEach(o=>{ if(o)o.destroy(); }); rotG=rotLine=rotBadge=null; }
function showRot(rec){
  clearRot(); if(!rec||!rec.type) return;
  const cx=rec.node.x(), cy=rec.node.y(); const hy=cy-46;
  rotLine=new Konva.Line({points:[cx,cy-16,cx,hy],stroke:'#4682b4',strokeWidth:1.5,dash:[4,4],listening:false});
  rotG=new Konva.Group({x:cx,y:hy,draggable:true});
  rotG.add(new Konva.Circle({radius:13,fill:'#4682b4',stroke:'#fff',strokeWidth:2}));
  rotG.add(new Konva.Arc({innerRadius:5,outerRadius:5,angle:280,rotation:-50,stroke:'#fff',strokeWidth:2}));
  rotG.add(new Konva.Line({points:[4,-5,7,-2,2.5,-1],stroke:'#fff',strokeWidth:2}));
  layer.add(rotLine,rotG);
  rotG.on('dragmove',()=>{ const c={x:rec.node.x(),y:rec.node.y()};
    let deg=Math.atan2(rotG.y()-c.y, rotG.x()-c.x)*180/Math.PI + 90;   // handle points up at 0°
    const near=Math.round(deg/45)*45; if(Math.abs(deg-near)<=5) deg=near;
    rec.rot=((deg%360)+360)%360; rec.node.rotation(rec.rot); rec.node.find('Text').forEach(t=>t.rotation(-rec.rot));
    drawTerms(); drawWires();
    let show=Math.round(rec.rot); if(show>180)show-=360;
    if(!rotBadge){ rotBadge=new Konva.Label({listening:false}); rotBadge.add(new Konva.Tag({fill:'#3a4653',cornerRadius:5})); rotBadge.add(new Konva.Text({text:'',fontSize:13,fontStyle:'bold',fill:'#fff',padding:5})); layer.add(rotBadge); }
    rotBadge.position({x:rotG.x()+16,y:rotG.y()-10}); rotBadge.getText().text(show+'°'); rotBadge.moveToTop();
    layer.batchDraw(); });
  rotG.on('dragend',()=>{ if(rotBadge){rotBadge.destroy();rotBadge=null;} showRot(rec); emit(); });
  layer.batchDraw();
}
function select(o){ selected=o; drawWires(); if(o&&o.type) showRot(o); else clearRot(); }
function deselect(){ selected=null; clearRot(); drawWires(); }

// ---- board ----
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(wireFrom){ wireFrom=null; }
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
  if(loading) return;
  const cs=comps.filter(c=>!c.given).map(c=>({id:c.id,type:c.type,rot:c.rot||0,x:Math.round(c.node.x()),y:Math.round(c.node.y())}));
  const A=analyzeCircuit();
  const wiresOut=wires.filter(w=>!w.given).map(w=>({a:w.a.snap||null,b:w.b.snap||null,bends:w.auto?[]:(w.pts||[]).map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))}));
  const empty = cs.length===0 && wiresOut.length===0;
  onChange(empty ? null : {components:cs,wires:wiresOut,
    spans:A.spans.map(s=>({id:s.id,type:s.type,node1:s.n1,node2:s.n2})),
    overall:A.overall, parallelPairs:A.parallelPairs, meters:A.meterReport});
  // status
  let html=FIG?('you added: '+(cs.length?cs.map(c=>c.type).join(', '):'nothing yet')+', wires: '+wiresOut.length)
    :('components: '+cs.length+' ['+cs.map(c=>c.type).join(', ')+'], wires: '+wires.length);
  if(FIG) html+='';
  else if(cs.length){
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
tb.querySelectorAll('[data-tool]').forEach(b=>{ b.onclick=()=>setTool(b.dataset.tool); });
function freeSlot(){ const taken=(x,y)=>comps.some(c=>Math.abs(c.node.x()-x)<110&&Math.abs(c.node.y()-y)<70);
  if(FIG){ const y0=(FIG.height||300)+70; for(let r=0;r<3;r++) for(let c=0;c<6;c++){ const x=90+c*140, y=y0+r*90; if(x<FW-60&&!taken(x,y)) return {x,y}; } return {x:120+Math.random()*300,y:y0}; }
  for(let r=0;r<5;r++) for(let c=0;c<5;c++){ const x=120+c*150, y=80+r*95; if(x<W-70&&y<H-40&&!taken(x,y)) return {x,y}; } return {x:130+Math.random()*300,y:120+Math.random()*220}; }
tb.querySelectorAll('[data-comp]').forEach(b=> b.onclick=()=>{ const p=FIG?freeSlot():toWorld(freeSlot()); addComp(b.dataset.comp, p.x, p.y); setTool('select'); });
tb.querySelector('#del').onclick=()=>{ if(!selected) return;
  if(selected.id&&selected.a){ wires=wires.filter(w=>w!==selected); }
  else if(selected.type&&!selected.given){ wires=wires.filter(w=>!(String(w.a.snap||'').startsWith(selected.id+':')||String(w.b.snap||'').startsWith(selected.id+':'))); selected.node.destroy(); comps=comps.filter(c=>c!==selected); clearRot(); }
  selected=null; drawTerms(); drawWires(); emit(); };
tb.querySelector('#clear').onclick=()=>{ loadValue(null); };

let textNodes=[];
function loadValue(v){
  loading=true;
  try{ comps.forEach(c=>{ c.node.destroy(); if(c.labelNode) c.labelNode.destroy(); }); termShapes.forEach(s=>s.destroy()); wireShapes.forEach(s=>s.destroy()); clearRot(); }catch(e){}
  comps=[];wires=[];termShapes=[];wireShapes=[];wireFrom=null;selected=null; let n=0;
  const num=id=>+String(id).replace(/\D/g,'')||0;
  if(FIG){ textNodes.forEach(t=>t.destroy()); textNodes=(FIG.texts||[]).map(o=>{ const t=new Konva.Text({text:o.t,fontSize:15,fill:S,listening:false}); t.position({x:o.x-t.width()/2,y:o.y-t.height()/2}); layer.add(t); return t; });   // printed labels ('power supply')
    (FIG.components||[]).forEach(c=>{ addComp(c.type,c.x,c.y,c.id,c.rot||0,{len:c.len,label:c.label,given:true,kind:c.kind}); n=Math.max(n,num(c.id)); });
    (FIG.wires||[]).forEach(w=>{ const A=termByKey(w.a), B=termByKey(w.b); if(!A||!B) return;
      wires.push({id:'g'+(++n),given:true,a:{x:A.x,y:A.y,snap:w.a},b:{x:B.x,y:B.y,snap:w.b},pts:(w.bends||[]).map(p=>({x:p.x,y:p.y})),auto:false}); }); }
  ((v&&v.components)||[]).filter(c=>!c.given).forEach((c,i)=>{ addComp(c.type, c.x!=null?c.x:120+(i%5)*150, c.y!=null?c.y:80+Math.floor(i/5)*95, c.id, c.rot||0); n=Math.max(n,num(c.id)); });
  ((v&&v.wires)||[]).filter(w=>!w.given).forEach(w=>{ if(!w.a||!w.b) return; const A=termByKey(w.a), B=termByKey(w.b); if(!A||!B) return;
    wires.push({id:'w'+(++n),a:{x:A.x,y:A.y,snap:w.a},b:{x:B.x,y:B.y,snap:w.b},pts:(w.bends||[]).map(p=>({x:p.x,y:p.y})),auto:!(w.bends&&w.bends.length)}); });
  uid=n+1; loading=false; drawTerms(); drawWires(); layer.draw(); emit();
}
loadValue(value);

      return {
        update: (v) => { loadValue(v); },
        clear: () => { loadValue(null); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
