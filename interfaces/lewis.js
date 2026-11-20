/* Dot-and-cross (Lewis) builder (chem) — Konva. Place atoms (bare symbols); add
   electrons into 4 side-slots (max 2 each) as dots or crosses. Slot-based for strict
   grading. A slot facing another atom = bonding region (dot+cross = shared pair).
   Saves { atoms:[{id,element,circle,charge?,x,y,slots:{top,bottom,left,right}}] } or null. A charge ('+', '2-'…) draws the
   atom as an ion in square brackets, for ionic dot-and-cross diagrams. Select an atom, then pick its charge.
   Marked by NedMark 'lewis': shared electrons between neighbouring atoms, and the non-bonding electrons on each atom.
   Requires Konva (index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('lewis', { name:'Dot-and-cross', unlocks:'chem bonding', samples:[{label:'Molecule', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('lewis',
    { name:'Dot-and-cross', unlocks:'chem bonding',
      samples:[
        { label:'Covalent (water)', question:{ text:'Draw a dot-and-cross diagram for water, H2O. Show outer shell electrons only.', marks:3, config:{} }, answer:{ bonds:[['O','H',2],['O','H',2]], lone:{ O:[4], H:[0,0] } } },
        { label:'Covalent (methane)', question:{ text:'Draw a dot-and-cross diagram for methane, CH4. Show outer shell electrons only.', marks:3, config:{} }, answer:{ bonds:[['C','H',2],['C','H',2],['C','H',2],['C','H',2]], lone:{ C:[0], H:[0,0,0,0] } } },
        { label:'Ionic (sodium chloride)', question:{ text:'Draw a dot-and-cross diagram for sodium chloride, NaCl. Show the outer shell electrons only and the charges on the ions.', marks:3, config:{} }, answer:{ ionic:true, ions:{ Na:'+', Cl:'-' }, electrons:{ Na:[0,8], Cl:[8] } } },
      ] },
    function (container, { question, value, onChange }) {
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      tb.innerHTML = `<span style="font-size:13px;color:#8a8272;">Atom:</span>
    <button data-el="H">H</button><button data-el="C">C</button><button data-el="N">N</button><button data-el="O">O</button><button data-el="Cl">Cl</button><button data-el="F">F</button><button data-el="Na">Na</button><button data-el="Mg">Mg</button>
    <label style="font-size:13px;">other: <input type="text" id="el" value="O" maxlength="3" aria-label="Element symbol"></label>
    <button data-tool="atom">+ Place atom</button>
    <button data-tool="circle">Toggle circle</button>
    <label style="font-size:13px;">charge: <select id="charge" aria-label="Charge on the selected atom (makes it an ion)"><option value="">none</option><option>+</option><option>2+</option><option>3+</option><option>-</option><option>2-</option><option>3-</option></select></label>
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
      if(question&&question.config&&question.config.atoms) container.appendChild(Ned.el('p',{class:'ned-note'},['The atoms are drawn for you. Choose Dot or Cross and click one of the four small rings around an atom to add an electron there (two per ring at most). Electrons in the rings between two atoms are shared. For an ion, choose Select, click the ion and pick its charge.']));
      else container.appendChild(Ned.el('p',{class:'ned-note'},['Pick an atom and click the board to place it. Then choose Dot or Cross and click one of the four small rings around an atom to add an electron there (two per ring at most). Put atoms next to each other: electrons in the rings between them are the shared pair. For an ion, select the atom and choose its charge: it is drawn in square brackets.']));
      tb.querySelectorAll('button').forEach(b=>{ b.style.cssText='padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;'; });
      tb.querySelectorAll('.sep').forEach(x=>{ x.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; });
      if(question&&question.config&&question.config.atoms){ tb.querySelectorAll('[data-el],[data-tool="atom"],#del').forEach(b=>b.style.display='none'); const l=tb.querySelector('#el'); if(l&&l.parentNode) l.parentNode.style.display='none'; const f=tb.querySelector('span'); if(f) f.style.display='none'; }
      const elI=tb.querySelector('#el'); if(elI) elI.style.cssText='width:60px;padding:6px;border:1px solid var(--line);border-radius:6px;font-size:14px;text-align:center;';


// wrap & bar(tb) provided by scaffold
const PRE=(question&&question.config&&question.config.atoms)||null;   // atoms printed in the question: they stay where they are
const Wd=Math.min(900,(container.clientWidth||860)-4), H=PRE?Math.max(300,Math.max(...PRE.map(a=>a.y))+90):470;
const stage=new Konva.Stage({container:wrap,width:Wd,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold

let uid=1, tool='dot', selected=null;
// atom: { id, el, circle:bool, x, y, slots:{top:[],bottom:[],left:[],right:[]} }  each slot: array of 'dot'|'cross' (max 2)
let atoms=[];
const SIDES=['top','bottom','left','right'];
const SLOT_OFF=26; // distance of slot centre from atom centre
function slotCentre(a,side){ if(side==='top')return{x:a.x,y:a.y-SLOT_OFF}; if(side==='bottom')return{x:a.x,y:a.y+SLOT_OFF}; if(side==='left')return{x:a.x-SLOT_OFF,y:a.y}; return{x:a.x+SLOT_OFF,y:a.y}; }

function addAtom(el,x,y){ const a={id:'a'+(uid++),el,circle:false,charge:'',x,y,slots:{top:[],bottom:[],left:[],right:[]}}; atoms.push(a); render(); emit(); return a; }

function render(){
  layer.destroyChildren();
  atoms.forEach(a=>{
    if(a.circle) layer.add(new Konva.Circle({x:a.x,y:a.y,radius:SLOT_OFF+8,stroke:'#2b2b2b',strokeWidth:1.5}));
    if(a.charge){ const r=SLOT_OFF+14; const br=(x,dir)=>layer.add(new Konva.Line({points:[x+dir*6,a.y-r,x,a.y-r,x,a.y+r,x+dir*6,a.y+r],stroke:'#2b2b2b',strokeWidth:1.8,listening:false}));
      br(a.x-r,1); br(a.x+r,-1);
      layer.add(new Konva.Text({x:a.x+r+3,y:a.y-r-6,text:a.charge.replace('-','\u2212'),fontSize:15,fontStyle:'bold',fill:'#2b2b2b',listening:false})); }
    // element symbol
    const t=new Konva.Text({x:a.x,y:a.y,text:a.el,fontSize:20,fontStyle:'bold',fill:'#2b2b2b'}); t.offsetX(t.width()/2); t.offsetY(t.height()/2); layer.add(t);
    // draggable hit pad
    const pad=new Konva.Circle({x:a.x,y:a.y,radius:16,fill:'rgba(0,0,0,0.001)',draggable:true});
    if(a.given) pad.draggable(false);
    pad.on('dragmove',()=>{ a.x=pad.x(); a.y=pad.y(); render(); });
    pad.on('dragend',()=>emit());
    pad.on('mousedown touchstart',(e)=>{ if(tool==='select'){ e.cancelBubble=true; selected=a; chargeSel.value=a.charge||''; render(); } });
    layer.add(pad);
    // slot markers + electrons
    SIDES.forEach(side=>{ const c=slotCentre(a,side); const es=a.slots[side];
      // clickable slot target
      const hit=new Konva.Circle({x:c.x,y:c.y,radius:11,fill:(selected===a?'rgba(70,130,180,0.08)':'rgba(0,0,0,0.001)'),stroke:(selected===a?'#9db8d2':'#d9d2bd'),strokeWidth:1,dash:[3,3]});      // the rings are always visible, so it is clear where electrons go
      hit.on('mousedown touchstart',(e)=>{ e.cancelBubble=true; onSlot(a,side); });
      layer.add(hit);
      // draw electrons in slot (1 -> centre; 2 -> side by side)
      es.forEach((type,i)=>{ let ex=c.x, ey=c.y; if(es.length===2){ if(side==='top'||side==='bottom'){ ex=c.x+(i===0?-5:5); } else { ey=c.y+(i===0?-5:5); } }
        // electrons do not take clicks, so a second click on the same ring adds the second electron
        if(type==='dot'){ layer.add(new Konva.Circle({x:ex,y:ey,radius:3.2,fill:'#2b2b2b',listening:false})); }
        else { layer.add(new Konva.Text({x:ex,y:ey,text:'\u00d7',fontSize:13,fontStyle:'bold',fill:'#2b2b2b',offsetX:4,offsetY:7,listening:false})); }
      });
    });
  });
  layer.draw();   // drawn at once, so the next click finds the new shapes
}

function onSlot(a,side){
  if(tool==='dot'||tool==='cross'){ if(a.slots[side].length<2){ a.slots[side].push(tool); render(); emit(); } }
  else if(tool==='erase'){ if(a.slots[side].length){ a.slots[side].pop(); render(); emit(); } }
  else if(tool==='select'){ selected=a; chargeSel.value=a.charge||''; render(); }
}

// facing side between two atoms -> which slot is the "bonding region"
function facingSide(a,b){ const dx=b.x-a.x, dy=b.y-a.y; if(Math.abs(dx)>=Math.abs(dy)) return dx>0?'right':'left'; return dy>0?'bottom':'top'; }
function emit(){
  const empty = atoms.length===0;
  onChange(empty ? null : { atoms:atoms.map(a=>Object.assign({id:a.id,element:a.el,circle:a.circle,x:Math.round(a.x),y:Math.round(a.y),slots:a.slots},a.charge?{charge:a.charge}:{})) });
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

function setTool(t){ tool=t; tb.querySelectorAll('[data-tool]').forEach(b=>{ const on=b.dataset.tool===t; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); b.style.background=on?'#eaf1f8':'var(--paper)'; b.style.borderColor=on?'var(--accent)':'var(--line)'; }); }
tb.querySelectorAll('[data-el]').forEach(b=> b.onclick=()=>{ tb.querySelector('#el').value=b.dataset.el; setTool('atom'); });
tb.querySelectorAll('[data-tool]').forEach(b=>{ if(!['atom','circle'].includes(b.dataset.tool)) b.onclick=()=>setTool(b.dataset.tool); });
tb.querySelector('[data-tool="atom"]').onclick=()=>setTool('atom');
const chargeSel=tb.querySelector('#charge');
chargeSel.onchange=()=>{ if(selected){ selected.charge=chargeSel.value; render(); emit(); } };
tb.querySelector('[data-tool="circle"]').onclick=()=>{ if(selected){ selected.circle=!selected.circle; render(); emit(); } };
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage){
  if(tool==='atom'){ const t=stage.getAbsoluteTransform().copy(); t.invert(); const p=t.point(stage.getPointerPosition());
    addAtom((tb.querySelector('#el').value||'X').trim(), p.x, p.y); }      // the atom tool stays on until Dot or Cross is chosen
  else { selected=null; render(); }
}});
stage.on('wheel',(e)=>{ e.evt.preventDefault(); const old=stage.scaleX(); const ptr=stage.getPointerPosition();
  const m={x:(ptr.x-stage.x())/old,y:(ptr.y-stage.y())/old}; const dir=e.evt.deltaY>0?-1:1; const f=1.08; const k=Math.max(0.5,Math.min(2.4,dir>0?old*f:old/f));
  stage.scale({x:k,y:k}); stage.position({x:ptr.x-m.x*k,y:ptr.y-m.y*k}); stage.batchDraw(); });
tb.querySelector('#del').onclick=()=>{ if(selected&&!selected.given){ atoms=atoms.filter(a=>a!==selected); selected=null; render(); emit(); } };
tb.querySelector('#clear').onclick=()=>{ loadValue(null); };

function loadValue(v){
  const sv=a=>({top:((a.slots||{}).top||[]).slice(),bottom:((a.slots||{}).bottom||[]).slice(),left:((a.slots||{}).left||[]).slice(),right:((a.slots||{}).right||[]).slice()});
  const mine={}; ((v&&v.atoms)||[]).forEach(a=>{ mine[a.id]=a; });
  atoms=(PRE||[]).map(p=>{ const m=mine[p.id]||{}; return {id:p.id,el:p.element,given:true,circle:!!(m.circle||p.circle),charge:m.charge||p.charge||'',x:p.x,y:p.y,slots:sv(m)}; })
    .concat(((v&&v.atoms)||[]).filter(a=>!(PRE||[]).some(p=>p.id===a.id)).map(a=>({id:a.id,el:a.element,circle:!!a.circle,charge:a.charge||'',x:a.x,y:a.y,slots:sv(a)})));
  uid=atoms.reduce((n,a)=>Math.max(n,+String(a.id).replace(/\D/g,'')||0),0)+1; selected=null; render(); emit();
}
setTool(tool); loadValue(value);

      return {
        update: (v) => { loadValue(v); },
        clear: () => { loadValue(null); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
