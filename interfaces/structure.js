/* Displayed formula builder (chem) — Konva. Place atoms (bare element symbols),
   draw bonds, set single/double/triple. Dragging an atom snaps its bonds to clean
   angles (0/45/90...). Saves { atoms:[{id,element,x,y}], bonds:[{from,to,order}] }
   or null. Requires Konva (index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('structure', { name:'Displayed formula', unlocks:'chem structure', samples:[{label:'Molecule', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('structure',
    { name:'Displayed formula', unlocks:'chem structure',
      samples:[
        { label:'Ethene', question:{ text:'Draw the displayed formula of ethene, C2H4.', marks:3, config:{} } },
        { label:'Ethanol', question:{ text:'Draw the displayed formula of ethanol, C2H5OH.', marks:4, config:{} } },
      ] },
    function (container, { question, value, onChange }) {
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<label style="font-size:13px;">Atom: <input type="text" id="el" value="C" maxlength="3"></label>
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
      container.append(tb, wrap, statusEl);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Type an element, + Place atom; + Bond then click atom A then atom B; select a bond and pick the order. Drag atoms (bonds snap to 90°). Scroll=zoom, drag empty=pan.']));
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;'; });
      tb.querySelectorAll('.chip').forEach(b=>{ b.style.cssText='padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:var(--paper);cursor:pointer;font-size:14px;font-weight:700;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });
      const elInput=tb.querySelector('#el'); if(elInput) elInput.style.cssText='width:60px;padding:6px;border:1px solid var(--line);border-radius:6px;font-size:14px;text-align:center;';


// wrap & bar(tb) provided by scaffold
const W=Math.min(900,(container.clientWidth||860)-4), H=470;
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='select', selected=null, bondFrom=null;
let atoms=[];   // {id, el, node(Group)}
let bonds=[];   // {id, a:atomId, b:atomId, order}

function addAtom(el,x,y){
  const id='a'+(uid++);
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
    else if(tool==='select'){ selected=rec; drawBonds(); }
  });
  atoms.push(rec); layer.add(g); layer.batchDraw(); emit();
  return rec;
}
function atomById(id){ return atoms.find(a=>a.id===id); }
function onAtomBond(rec){
  if(!bondFrom){ bondFrom=rec; drawBonds(); return; }
  if(bondFrom.id===rec.id){ bondFrom=null; drawBonds(); return; }
  bonds.push({id:'b'+(uid++), a:bondFrom.id, b:rec.id, order:1}); bondFrom=null; setTool('select'); drawBonds(); emit();
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
      ln.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=bd; drawBonds(); } });
      layer.add(ln); bondShapes.push(ln); });
  });
  // highlight bondFrom atom
  atoms.forEach(a=>{ const t=a.node.findOne('Text'); if(t) t.fill(bondFrom&&bondFrom.id===a.id?'#4682b4':'#2b2b2b'); });
  layer.batchDraw();
}

function emit(){
  drawBonds();
  const empty = atoms.length===0 && bonds.length===0;
  onChange(empty ? null : { atoms:atoms.map(a=>({id:a.id,element:a.el,x:Math.round(a.node.x()),y:Math.round(a.node.y())})),
    bonds:bonds.map(b=>({from:b.a,to:b.b,order:b.order})) });
  // formula tally
  const tally={}; atoms.forEach(a=>{ tally[a.el]=(tally[a.el]||0)+1; });
  const formula=Object.keys(tally).sort().map(k=>k+(tally[k]>1?tally[k]:'')).join('');
  statusEl.textContent='atoms: '+atoms.length+' ['+formula+'], bonds: '+bonds.length+' ('+
    bonds.filter(b=>b.order===1).length+' single, '+bonds.filter(b=>b.order===2).length+' double, '+bonds.filter(b=>b.order===3).length+' triple)';
}

function setTool(t){ tool=t; bondFrom=null; tb.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t)); }
tb.querySelectorAll('[data-tool]').forEach(b=> b.onclick=()=>setTool(b.dataset.tool));
tb.querySelectorAll('[data-order]').forEach(b=> b.onclick=()=>{ if(selected&&selected.order!==undefined){ selected.order=parseInt(b.dataset.order); drawBonds(); emit(); } });
// place atom on canvas click when atom tool active
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(tool==='atom'){ const t=stage.getAbsoluteTransform().copy(); t.invert(); const p=t.point(stage.getPointerPosition());
    addAtom(tb.querySelector('#el').value||'C', p.x, p.y); setTool('select'); }
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

emit();

      return {
        update: () => {},
        clear: () => { try{ atoms.forEach(a=>a.node.destroy()); }catch(e){} atoms=[];bonds=[];bondFrom=null;selected=null; try{bondShapes.forEach(s=>s.destroy());}catch(e){} bondShapes=[]; layer.draw(); emit(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
