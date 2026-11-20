/* Displayed formula builder (chem) — Konva. Place atoms (bare element symbols),
   draw bonds, set single/double/triple. Dragging an atom snaps its bonds to clean
   angles (0/45/90...). Saves { atoms:[{id,element,x,y}], bonds:[{from,to,order}] }
   or null. Marked by NedMark 'structure': compared with the model as a molecule (what is joined to what), not by position. Requires Konva (index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('structure', { name:'Displayed formula', unlocks:'chem structure', samples:[{label:'Molecule', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('structure',
    { name:'Displayed formula', unlocks:'chem structure',
      samples:[
        { label:'Ethene', question:{ text:'Draw the displayed formula of ethene, C2H4.', marks:3, config:{} }, answer:{ model:{ atoms:[{id:1,element:'C'},{id:2,element:'C'},{id:3,element:'H'},{id:4,element:'H'},{id:5,element:'H'},{id:6,element:'H'}], bonds:[{from:1,to:2,order:2},{from:1,to:3,order:1},{from:1,to:4,order:1},{from:2,to:5,order:1},{from:2,to:6,order:1}] } } },
        { label:'Ethanol', question:{ text:'Draw the displayed formula of ethanol, C2H5OH.', marks:4, config:{} }, answer:{ model:{ atoms:[{id:1,element:'C'},{id:2,element:'C'},{id:3,element:'O'},{id:4,element:'H'},{id:5,element:'H'},{id:6,element:'H'},{id:7,element:'H'},{id:8,element:'H'},{id:9,element:'H'}], bonds:[{from:1,to:2,order:1},{from:2,to:3,order:1},{from:3,to:9,order:1},{from:1,to:4,order:1},{from:1,to:5,order:1},{from:1,to:6,order:1},{from:2,to:7,order:1},{from:2,to:8,order:1}] } } },
      ] },
    function (container, { question, value, onChange }) {
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<span style="font-size:13px;color:#8a8272;">Atom:</span>
    <button class="chip" data-el="C">C</button><button class="chip" data-el="H">H</button><button class="chip" data-el="O">O</button><button class="chip" data-el="N">N</button><button class="chip" data-el="Cl">Cl</button><button class="chip" data-el="Br">Br</button>
    <label style="font-size:13px;">other: <input type="text" id="el" value="C" maxlength="3" aria-label="Element symbol"></label>
    <button data-tool="atom">+ Place atom</button>
    <span class="sep"></span>
    <button data-tool="bond">+ Bond</button>
    <span style="font-size:13px;color:#8a8272;">order:</span>
    <button class="chip" data-order="1">—</button>
    <button class="chip" data-order="2">=</button>
    <button class="chip" data-order="3">≡</button>
    <span class="sep"></span>
    <button data-tool="select" class="on">Select</button>
    <button id="del">Delete</button>
    <button id="clear">Clear</button>`;
      const wrap = document.createElement('div'); wrap.style.cssText='position:relative;width:100%;max-width:900px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf7;touch-action:none;';
      const statusEl = document.createElement('div'); statusEl.style.cssText='font:13px ui-monospace,Menlo,Consolas,monospace;margin-top:8px;color:#555;';
      // 'Name … and draw its displayed formula': a box for the name above the board
      let nameIn=null;
      if(question&&question.config&&question.config.askName){ nameIn=Ned.el('input',{type:'text',placeholder:'name',value:(value&&value.name)||'','aria-label':'Name',
        style:'display:block;margin:0 0 10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit;width:100%;max-width:340px;'});
        container.appendChild(Ned.el('label',{style:'display:block;font-size:13px;color:#8a8272;margin-bottom:2px;'},['Name']));
        container.appendChild(nameIn); }
      container.append(tb, wrap, statusEl);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Pick an atom, then click the board to place it, or click an atom already there to attach a new one to it. + Bond joins two atoms you click; clicking a bond with + Bond changes it to double, then triple. Drag atoms to tidy.']));
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;'; });
      tb.querySelectorAll('.chip').forEach(b=>{ b.style.cssText='padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font-size:14px;font-weight:700;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });
      const elInput=tb.querySelector('#el'); if(elInput) elInput.style.cssText='width:60px;padding:6px;border:1px solid var(--line);border-radius:6px;font-size:14px;text-align:center;';


// wrap & bar(tb) provided by scaffold
const W=Math.min(900,(container.clientWidth||860)-4), H=470;
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='select', selected=null, bondFrom=null, loading=false;
let atoms=[];   // {id, el, node(Group)}
let bonds=[];   // {id, a:atomId, b:atomId, order}

function addAtom(el,x,y,fixedId){
  const id=fixedId||('a'+(uid++));
  const g=new Konva.Group({x,y,draggable:true});
  // bare element symbol (no circle) — a small transparent hit-pad makes it easy to grab/click
  const pad=new Konva.Circle({radius:14,fill:'rgba(0,0,0,0.001)'});
  const t=new Konva.Text({text:el,fontSize:18,fontStyle:'bold',fill:'#2b2b2b'}); t.offsetX(t.width()/2); t.offsetY(t.height()/2);
  g.add(pad,t);
  const rec={id,el,node:g};
  g.on('dragmove',()=>{ angleSnapAtom(rec); drawBonds(); });
  g.on('dragend',()=>emit());
  g.on('mousedown touchstart',(e)=>{ e.cancelBubble=true;
    if(tool==='bond'){ onAtomBond(rec); }
    else if(tool==='atom'){ growFrom(rec); }
    else if(tool==='select'){ selected=rec; drawBonds(); }
  });
  atoms.push(rec); layer.add(g); layer.batchDraw(); if(!loading) emit();
  return rec;
}
/* attach a new atom to one already on the board: it goes in the first free direction and is bonded straight away */
function growFrom(rec){
  const el=(tb.querySelector('#el').value||'C').trim(); const x=rec.node.x(), y=rec.node.y(), D=62;
  const free=(px,py)=>!atoms.some(a=>Math.hypot(a.node.x()-px,a.node.y()-py)<34);
  const order=[0,180,90,270,45,135,225,315]; let spot=null;
  for(const d of order){ const r=d*Math.PI/180, px=x+Math.cos(r)*D, py=y+Math.sin(r)*D; if(free(px,py)){ spot={x:px,y:py}; break; } }
  if(!spot) spot={x:x+D*1.5,y:y+D*1.5};
  const n=addAtom(el,spot.x,spot.y);
  bonds.push({id:'b'+(uid++), a:rec.id, b:n.id, order:1}); drawBonds(); emit();
}
function atomById(id){ return atoms.find(a=>a.id===id); }
function onAtomBond(rec){
  if(!bondFrom){ bondFrom=rec; drawBonds(); return; }
  if(bondFrom.id===rec.id){ bondFrom=null; drawBonds(); return; }
  const had=bonds.find(b=>(b.a===bondFrom.id&&b.b===rec.id)||(b.b===bondFrom.id&&b.a===rec.id));
  if(had) had.order=had.order%3+1;                       // joining the same two atoms again makes the bond double, then triple
  else bonds.push({id:'b'+(uid++), a:bondFrom.id, b:rec.id, order:1});
  bondFrom=null; drawBonds(); emit();              // the bond tool stays on, ready for the next bond
}

const SNAP_ANGLES=[0,45,90,135,180,225,270,315];
function angleSnapAtom(rec){
  // find neighbours connected by a bond; snap so the nearest bond hits a clean angle
  const nb=[]; bonds.forEach(bd=>{ if(bd.a===rec.id) nb.push(atomById(bd.b)); else if(bd.b===rec.id) nb.push(atomById(bd.a)); });
  if(!nb.length) return;
  let best=null, bestDiff=8;   // within 8 degrees
  const x=rec.node.x(), y=rec.node.y();
  nb.forEach(o=>{ if(!o) return; const dx=x-o.node.x(), dy=y-o.node.y(); const len=Math.hypot(dx,dy); if(len<6) return;
    let deg=Math.atan2(dy,dx)*180/Math.PI; if(deg<0)deg+=360;
    SNAP_ANGLES.forEach(t=>{ let d=Math.abs(deg-t); if(d>180)d=360-d; if(d<bestDiff){ bestDiff=d; best={o,t,len}; } });
  });
  if(best){ const r=best.t*Math.PI/180; rec.node.position({ x:best.o.node.x()+Math.cos(r)*best.len, y:best.o.node.y()+Math.sin(r)*best.len }); }
}
let bondShapes=[];
function drawBonds(){
  bondShapes.forEach(s=>s.destroy()); bondShapes=[];
  bonds.forEach(bd=>{ const A=atomById(bd.a), B=atomById(bd.b); if(!A||!B) return;
    const ax=A.node.x(), ay=A.node.y(), bx=B.node.x(), by=B.node.y();
    // unit perpendicular for multi-bond offset
    const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1; const px=-dy/len, py=dx/len;
    const gap=4; const offs = bd.order===1?[0]: bd.order===2?[-gap,gap]:[-gap*1.6,0,gap*1.6];
    // shorten to atom edges (radius 15)
    const r=13; const sx=ax+dx/len*r, sy=ay+dy/len*r, ex=bx-dx/len*r, ey=by-dy/len*r;
    offs.forEach(o=>{ const ln=new Konva.Line({points:[sx+px*o,sy+py*o, ex+px*o,ey+py*o],stroke:(selected===bd?'#4682b4':'#2b2b2b'),strokeWidth:2,hitStrokeWidth:12});
      ln.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=bd; drawBonds(); } else if(tool==='bond'){ e.cancelBubble=true; bd.order=bd.order%3+1; drawBonds(); emit(); } });
      layer.add(ln); bondShapes.push(ln); });
  });
  // highlight bondFrom atom
  atoms.forEach(a=>{ const t=a.node.findOne('Text'); if(t) t.fill(bondFrom&&bondFrom.id===a.id?'#4682b4':'#2b2b2b'); });
  layer.batchDraw();
}

function emit(){
  drawBonds();
  const empty = atoms.length===0 && bonds.length===0;
  const nm=nameIn?nameIn.value.trim():'';
  onChange(empty && !nm ? null : Object.assign({ atoms:atoms.map(a=>({id:a.id,element:a.el,x:Math.round(a.node.x()),y:Math.round(a.node.y())})),
    bonds:bonds.map(b=>({from:b.a,to:b.b,order:b.order})) }, nameIn?{name:nm}:{}));
  // formula tally
  const tally={}; atoms.forEach(a=>{ tally[a.el]=(tally[a.el]||0)+1; });
  const formula=Object.keys(tally).sort().map(k=>k+(tally[k]>1?tally[k]:'')).join('');
  statusEl.textContent='atoms: '+atoms.length+' ['+formula+'], bonds: '+bonds.length+' ('+
    bonds.filter(b=>b.order===1).length+' single, '+bonds.filter(b=>b.order===2).length+' double, '+bonds.filter(b=>b.order===3).length+' triple)';
}

function setTool(t){ tool=t; bondFrom=null; tb.querySelectorAll('[data-tool]').forEach(b=>{ const on=b.dataset.tool===t; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); b.style.background=on?'#eaf1f8':'var(--paper)'; b.style.borderColor=on?'var(--accent)':'var(--line)'; }); }
tb.querySelectorAll('[data-tool]').forEach(b=> b.onclick=()=>setTool(b.dataset.tool));
tb.querySelectorAll('[data-el]').forEach(b=> b.onclick=()=>{ tb.querySelector('#el').value=b.dataset.el; setTool('atom'); tb.querySelectorAll('[data-el]').forEach(x=>{ x.style.background= x===b?'#eaf1f8':'var(--paper)'; x.style.borderColor= x===b?'var(--accent)':'var(--line)'; }); });
tb.querySelectorAll('[data-order]').forEach(b=> b.onclick=()=>{ if(selected&&selected.order!==undefined){ selected.order=parseInt(b.dataset.order); drawBonds(); emit(); } });
// place atom on canvas click when atom tool active
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(tool==='atom'){ const t=stage.getAbsoluteTransform().copy(); t.invert(); const p=t.point(stage.getPointerPosition());
    addAtom((tb.querySelector('#el').value||'C').trim(), p.x, p.y); }                        // the atom tool stays on
  else { selected=null; bondFrom=null; drawBonds(); }
}});
stage.on('wheel',(e)=>{ e.evt.preventDefault(); const old=stage.scaleX(); const ptr=stage.getPointerPosition();
  const m={x:(ptr.x-stage.x())/old,y:(ptr.y-stage.y())/old}; const dir=e.evt.deltaY>0?-1:1; const f=1.08; const k=Math.max(0.5,Math.min(2.4,dir>0?old*f:old/f));
  stage.scale({x:k,y:k}); stage.position({x:ptr.x-m.x*k,y:ptr.y-m.y*k}); stage.batchDraw(); drawBonds(); });

tb.querySelector('#del').onclick=()=>{ if(!selected) return;
  if(selected.order!==undefined){ bonds=bonds.filter(b=>b!==selected); }
  else { bonds=bonds.filter(b=>b.a!==selected.id&&b.b!==selected.id); selected.node.destroy(); atoms=atoms.filter(a=>a!==selected); }
  selected=null; drawBonds(); emit(); };
tb.querySelector('#clear').onclick=()=>{ atoms.forEach(a=>a.node.destroy()); atoms=[];bonds=[];bondFrom=null;selected=null; bondShapes.forEach(s=>s.destroy()); bondShapes=[]; layer.draw(); emit(); };

function wipe(){ try{ atoms.forEach(a=>a.node.destroy()); bondShapes.forEach(s=>s.destroy()); }catch(e){} atoms=[];bonds=[];bondFrom=null;selected=null;bondShapes=[]; }
function loadValue(v){
  loading=true; wipe(); let n=0;
  ((v&&v.atoms)||[]).forEach((a,i)=>{ addAtom(a.element, a.x!=null?a.x:120+(i%6)*70, a.y!=null?a.y:120+Math.floor(i/6)*70, a.id); n=Math.max(n,+String(a.id).replace(/\D/g,'')||0); });
  ((v&&v.bonds)||[]).forEach(b=>{ bonds.push({id:'b'+(++n), a:b.from, b:b.to, order:b.order||1}); });
  uid=n+1; loading=false; drawBonds(); layer.draw(); emit();
}
loadValue(value);
if(nameIn) nameIn.addEventListener('input',()=>emit());

      return {
        update: (v) => { if(nameIn) nameIn.value=(v&&v.name)||''; loadValue(v); },
        clear: () => { try{ atoms.forEach(a=>a.node.destroy()); }catch(e){} atoms=[];bonds=[];bondFrom=null;selected=null; try{bondShapes.forEach(s=>s.destroy());}catch(e){} bondShapes=[]; layer.draw(); emit(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
