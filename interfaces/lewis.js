/* Dot-and-cross (Lewis) builder (chem) — Konva. Place atoms (bare symbols); add
   electrons into 4 side-slots (max 2 each) as dots or crosses. Slot-based for strict
   grading. A slot facing another atom = bonding region (dot+cross = shared pair).
   Saves { atoms:[{id,element,circle,x,y,slots:{top,bottom,left,right}}] } or null.
   Requires Konva (index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('lewis', { name:'Dot-and-cross', unlocks:'chem bonding', samples:[{label:'Molecule', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('lewis',
    { name:'Dot-and-cross', unlocks:'chem bonding',
      samples:[
        { label:'Covalent (water)', question:{ text:'Draw a dot-and-cross diagram for water, H2O.', marks:3, config:{} } },
        { label:'Covalent (methane)', question:{ text:'Draw a dot-and-cross diagram for methane, CH4.', marks:3, config:{} } },
      ] },
    function (container, { question, value, onChange }) {
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<label style="font-size:13px;">Atom: <input type="text" id="el" value="O" maxlength="3"></label>
    <button data-tool="atom">+ Place atom</button>
    <button data-tool="circle">Toggle circle</button>
    <span class="sep"></span>
    <span style="font-size:13px;color:#8a8272;">add:</span>
    <button data-tool="dot" class="on">• Dot</button>
    <button data-tool="cross">× Cross</button>
    <button data-tool="erase">Erase e⁻</button>
    <span class="sep"></span>
    <button data-tool="select">Select</button>
    <button id="del">Delete atom</button>
    <button id="clear">Clear</button>`;
      const wrap = document.createElement('div'); wrap.style.cssText='position:relative;width:100%;max-width:900px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf7;touch-action:none;';
      const statusEl = document.createElement('div'); statusEl.style.cssText='font:12.5px ui-monospace,Menlo,Consolas,monospace;margin-top:8px;color:#555;white-space:pre-wrap;';
      container.append(tb, wrap, statusEl);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Type element, + Place atom; with Dot/Cross active click a side-slot (max 2). Erase removes one. Toggle circle draws the shell. Scroll=zoom, drag empty=pan.']));
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });
      const elI=tb.querySelector('#el'); if(elI) elI.style.cssText='width:60px;padding:6px;border:1px solid var(--line);border-radius:6px;font-size:14px;text-align:center;';


// wrap & bar(tb) provided by scaffold
const Wd=Math.min(900,(container.clientWidth||860)-4), H=470;
const stage=new Konva.Stage({container:wrap,width:Wd,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='dot', selected=null;
// atom: { id, el, circle:bool, x, y, slots:{top:[],bottom:[],left:[],right:[]} }  each slot: array of 'dot'|'cross' (max 2)
let atoms=[];
const SIDES=['top','bottom','left','right'];
const SLOT_OFF=26; // distance of slot centre from atom centre
function slotCentre(a,side){ if(side==='top')return{x:a.x,y:a.y-SLOT_OFF}; if(side==='bottom')return{x:a.x,y:a.y+SLOT_OFF}; if(side==='left')return{x:a.x-SLOT_OFF,y:a.y}; return{x:a.x+SLOT_OFF,y:a.y}; }

function addAtom(el,x,y){ const a={id:'a'+(uid++),el,circle:false,x,y,slots:{top:[],bottom:[],left:[],right:[]}}; atoms.push(a); render(); emit(); return a; }

function render(){
  layer.destroyChildren();
  atoms.forEach(a=>{
    if(a.circle) layer.add(new Konva.Circle({x:a.x,y:a.y,radius:SLOT_OFF+8,stroke:'#2b2b2b',strokeWidth:1.5}));
    // element symbol
    const t=new Konva.Text({x:a.x,y:a.y,text:a.el,fontSize:20,fontStyle:'bold',fill:'#2b2b2b'}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); layer.add(t);
    // draggable hit pad
    const pad=new Konva.Circle({x:a.x,y:a.y,radius:16,fill:'rgba(0,0,0,0.001)',draggable:true});
    pad.on('dragmove',()=>{ a.x=pad.x(); a.y=pad.y(); render(); });
    pad.on('dragend',()=>emit());
    pad.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=a; render(); } });
    layer.add(pad);
    // slot markers + electrons
    SIDES.forEach(side=>{ const c=slotCentre(a,side); const es=a.slots[side];
      // clickable slot target
      const hit=new Konva.Circle({x:c.x,y:c.y,radius:11,fill:(selected===a?'rgba(70,130,180,0.08)':'rgba(0,0,0,0.001)'),stroke:(selected===a?'#cdd8e4':null),strokeWidth:1});
      hit.on('mousedown touchstart',(e)=>{ e.cancelBubble=true; onSlot(a,side); });
      layer.add(hit);
      // draw electrons in slot (1 -> centre; 2 -> side by side)
      es.forEach((type,i)=>{ let ex=c.x, ey=c.y; if(es.length===2){ if(side==='top'||side==='bottom'){ ex=c.x+(i===0?-5:5); } else { ey=c.y+(i===0?-5:5); } }
        if(type==='dot'){ layer.add(new Konva.Circle({x:ex,y:ey,radius:3.2,fill:'#2b2b2b'})); }
        else { layer.add(new Konva.Text({x:ex,y:ey,text:'\u00d7',fontSize:13,fontStyle:'bold',fill:'#2b2b2b',offsetX:4,offsetY:7})); }
      });
    });
  });
  layer.batchDraw();
}

function onSlot(a,side){
  if(tool==='dot'||tool==='cross'){ if(a.slots[side].length<2){ a.slots[side].push(tool); render(); emit(); } }
  else if(tool==='erase'){ if(a.slots[side].length){ a.slots[side].pop(); render(); emit(); } }
  else if(tool==='select'){ selected=a; render(); }
}

// facing side between two atoms -> which slot is the "bonding region"
function facingSide(a,b){ const dx=b.x-a.x, dy=b.y-a.y; if(Math.abs(dx)>=Math.abs(dy)) return dx>0?'right':'left'; return dy>0?'bottom':'top'; }
function emit(){
  const empty = atoms.length===0;
  onChange(empty ? null : { atoms:atoms.map(a=>({id:a.id,element:a.el,circle:a.circle,x:Math.round(a.x),y:Math.round(a.y),slots:a.slots})) });
  // grading-friendly summary: per atom electron count + bonding regions (a slot with 1 dot+1 cross between two near atoms)
  let lines=[];
  atoms.forEach(a=>{ const tot=SIDES.reduce((s,sd)=>s+a.slots[sd].length,0); const dots=SIDES.reduce((s,sd)=>s+a.slots[sd].filter(x=>x==='dot').length,0); const cr=tot-dots;
    lines.push(a.el+': '+tot+' e⁻ ('+dots+' dot, '+cr+' cross)'); });
  // detect bonding pairs: for each pair of atoms, the facing slot on each that has dot+cross
  let bonds=[];
  for(let i=0;i<atoms.length;i++)for(let j=i+1;j<atoms.length;j++){ const A=atoms[i],B=atoms[j];
    const d=Math.hypot(A.x-B.x,A.y-B.y); if(d>120) continue;
    const sA=facingSide(A,B); const slot=A.slots[sA];
    const shared = slot.includes('dot')&&slot.includes('cross');
    if(shared) bonds.push(A.el+'–'+B.el+' bonding pair ✓');
  }
  statusEl.textContent = (lines.join('\n')||'(no atoms)') + (bonds.length? '\n'+bonds.join('\n') : '');
}

function setTool(t){ tool=t; tb.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t)); }
tb.querySelectorAll('[data-tool]').forEach(b=>{ if(!['atom','circle'].includes(b.dataset.tool)) b.onclick=()=>setTool(b.dataset.tool); });
tb.querySelector('[data-tool="atom"]').onclick=()=>setTool('atom');
tb.querySelector('[data-tool="circle"]').onclick=()=>{ if(selected){ selected.circle=!selected.circle; render(); emit(); } };
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(tool==='atom'){ const t=stage.getAbsoluteTransform().copy(); t.invert(); const p=t.point(stage.getPointerPosition());
    addAtom(tb.querySelector('#el').value||'X', p.x, p.y); setTool('dot'); }
  else { selected=null; render(); }
}});
stage.on('wheel',(e)=>{ e.evt.preventDefault(); const old=stage.scaleX(); const ptr=stage.getPointerPosition();
  const m={x:(ptr.x-stage.x())/old,y:(ptr.y-stage.y())/old}; const dir=e.evt.deltaY>0?-1:1; const f=1.08; const k=Math.max(0.5,Math.min(2.4,dir>0?old*f:old/f));
  stage.scale({x:k,y:k}); stage.position({x:ptr.x-m.x*k,y:ptr.y-m.y*k}); stage.batchDraw(); });
tb.querySelector('#del').onclick=()=>{ if(selected){ atoms=atoms.filter(a=>a!==selected); selected=null; render(); emit(); } };
tb.querySelector('#clear').onclick=()=>{ atoms=[]; selected=null; render(); emit(); };

render(); emit();

      return {
        update: () => {},
        clear: () => { atoms=[]; selected=null; render(); emit(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
