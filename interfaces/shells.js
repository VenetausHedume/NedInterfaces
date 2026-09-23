/* Electron shell builder (chem) — Konva. Nucleus + Charge are MathLive text-box
   fields (reusing the text component + math keyboard). Add concentric shells, set
   electrons per shell (auto-spaced), add labels. Saves { nucleus, charge, shells:[...],
   labels } or null. Requires Konva + MathLive (index.html). */
(function () {
  if (typeof Konva === 'undefined') { Ned.register('shells', { name:'Electron shells', unlocks:'chem structure', samples:[{label:'Atom', question:{text:'Konva failed to load.',marks:0,config:{}}}] }, function(c){ c.textContent='Konva not loaded — check the CDN <script> in index.html.'; return {update(){},clear(){},destroy(){c.innerHTML='';}}; }); return; }
  Ned.register('shells',
    { name:'Electron shells', unlocks:'chem atoms',
      samples:[
        { label:'Draw an atom', question:{ text:'Draw the electron arrangement of a sodium atom (2,8,1).', marks:3, config:{} } },
        { label:'Draw an ion', question:{ text:'Draw the electron arrangement of an oxide ion, O²⁻.', marks:3, config:{} } },
      ] },
    function (container, { question, value, onChange }) {
      // ---- scaffold ----
      const tb = document.createElement('div');
      tb.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      // nucleus + charge as MathLive fields (text mode) — reuse the text-box component
      const hasMath = window.customElements && customElements.get('math-field');
      const mkField = (w) => {
        if(!hasMath){ const inp=document.createElement('input'); inp.type='text'; inp.style.cssText='width:'+(w||'80px')+';padding:6px;border:1px solid var(--line);border-radius:6px;font-size:14px;'; return inp; }
        const f=document.createElement('math-field');
        f.style.cssText='display:inline-block;width:'+(w||'90px')+';font-size:1.1rem;padding:4px 8px;min-height:2.2rem;border:1px solid var(--line);border-radius:6px;background:#fffdf7;vertical-align:middle;';
        f.mathVirtualKeyboardPolicy='manual';
        try{ f.menuItems=[]; }catch(e){}
        try{ f.style.setProperty('--keyboard-toggle-display','none'); }catch(e){}
        try{ f.inlineShortcuts={}; }catch(e){}
        try{ f.defaultMode='text'; }catch(e){}
        return f;
      };
      const fieldVal = (f)=> hasMath ? f.value : f.value;   // MathLive .value = LaTeX; input .value = text
      // convert simple LaTeX (charges/formulae) to unicode for canvas drawing
      const _SUP={'0':'\u2070','1':'\u00b9','2':'\u00b2','3':'\u00b3','4':'\u2074','5':'\u2075','6':'\u2076','7':'\u2077','8':'\u2078','9':'\u2079','+':'\u207a','-':'\u207b','(':'\u207d',')':'\u207e'};
      const _SUB={'0':'\u2080','1':'\u2081','2':'\u2082','3':'\u2083','4':'\u2084','5':'\u2085','6':'\u2086','7':'\u2087','8':'\u2088','9':'\u2089','+':'\u208a','-':'\u208b','(':'\u208d',')':'\u208e'};
      const _sup=t=>[...String(t)].map(c=>_SUP[c]||c).join('');
      const _sub=t=>[...String(t)].map(c=>_SUB[c]||c).join('');
      function latexToUnicode(x){ if(!x) return '';
        let out=String(x);
        out=out.replace(/\$/g,'');                              // strip math-island $
        out=out.replace(/\\text\{([^}]*)\}/g,'$1');            // \text{..}
        out=out.replace(/\^\{([^}]*)\}/g,(m,g)=>_sup(g));        // ^{..}
        out=out.replace(/\^(.)/g,(m,g)=>_sup(g));                 // ^x
        out=out.replace(/_\{([^}]*)\}/g,(m,g)=>_sub(g));          // _{..}
        out=out.replace(/_(.)/g,(m,g)=>_sub(g));                   // _x
        out=out.replace(/\\[,;: ]/g,'');                         // spacing macros
        out=out.replace(/[{}]/g,'');
        return out.trim();
      }
      const nucField = mkField(); const chgField = mkField();
      const lbl=(t,el)=>{ const s=document.createElement('label'); s.style.cssText='font-size:13px;display:inline-flex;align-items:center;gap:4px;'; s.append(document.createTextNode(t)); s.append(el); return s; };
      const addShellBtn=btn('+ Add shell','addShell'), delShellBtn=btn('− Remove outer shell','delShell');
      const selBtn=btnTool('Select','select',true), labelBtn=btnTool('+ Label','label');
      const clrBtn=btn('Clear','clear');
      function btn(t,id){ const b=document.createElement('button'); b.textContent=t; b.id=id; style(b); return b; }
      function btnTool(t,tool,on){ const b=document.createElement('button'); b.textContent=t; b.dataset.tool=tool; style(b); if(on)b.classList.add('on'); return b; }
      function style(b){ b.style.cssText='padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);cursor:pointer;font-size:13px;font-weight:600;'; }
      const sep=()=>{ const s=document.createElement('span'); s.style.cssText='width:1px;height:24px;background:var(--line);margin:0 4px;'; return s; };
      tb.append(lbl('Nucleus:',nucField), lbl('Charge:',chgField), sep(), addShellBtn, delShellBtn, sep(), selBtn, labelBtn, sep(), clrBtn);

      const shellbar = document.createElement('div'); shellbar.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';
      const cap=document.createElement('span'); cap.style.cssText='font-size:13px;color:var(--muted);'; cap.textContent='Electrons per shell:'; shellbar.append(cap);

      const wrap = document.createElement('div'); wrap.style.cssText='position:relative;width:100%;max-width:760px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf7;touch-action:none;';
      const statusEl = document.createElement('div'); statusEl.style.cssText='font:13px ui-monospace,Menlo,Consolas,monospace;margin-top:8px;color:#555;';
      container.append(tb, shellbar, wrap, statusEl);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Type the element (and charge) in the fields; + Add shell then set electrons per shell. + Label to annotate. Scroll=zoom, drag empty=pan.']));


// wrap, bar(tb), shellbar provided by scaffold
const W=Math.min(760,(container.clientWidth||720)-4), H=460;
const stage=new Konva.Stage({container:wrap,width:W,height:H,draggable:true});
const layer=new Konva.Layer(); stage.add(layer);
// statusEl provided by scaffold
const CX=W/2, CY=H/2;

let tool='select', uid=1;
let shells=[];   // {count} ; radius derived from index
let labels=[];   // {id,text,x,y,node}
let nucleusText=''; let chargeText='';
const R0=46, RSTEP=42;   // first shell radius + spacing

function radiusOf(i){ return R0 + i*RSTEP; }

function render(){
  layer.destroyChildren();
  // shells (rings) + electrons
  shells.forEach((sh,i)=>{
    const r=radiusOf(i);
    layer.add(new Konva.Circle({x:CX,y:CY,radius:r,stroke:'#2b2b2b',strokeWidth:1.5}));
    const n=sh.count|0;
    for(let k=0;k<n;k++){ const ang=(-90 + k*(360/n))*Math.PI/180;
      layer.add(new Konva.Circle({x:CX+r*Math.cos(ang), y:CY+r*Math.sin(ang), radius:6, fill:'#2b2b2b'})); }
  });
  // nucleus
  layer.add(new Konva.Circle({x:CX,y:CY,radius:24,fill:'#fff',stroke:'#2b2b2b',strokeWidth:2}));
  const nucDisp=latexToUnicode(nucleusText), chgDisp=latexToUnicode(chargeText);
  const nt=new Konva.Text({x:CX,y:CY,text:nucDisp,fontSize:15,fontStyle:'bold',fill:'#2b2b2b'});
  nt.offsetX(nt.width()/2); nt.offsetY(nt.height()/2); layer.add(nt);
  if(chgDisp){ const ct=new Konva.Text({x:CX+nt.width()/2+2, y:CY-nt.height()/2-4, text:_sup(chgDisp), fontSize:15, fontStyle:'bold', fill:'#2b2b2b'}); layer.add(ct); }
  // labels
  labels.forEach(L=>{ const t=new Konva.Text({x:L.x,y:L.y,text:L.text,fontSize:14,fill:'#2b2b2b',draggable:true});
    t.on('dragend',()=>{ L.x=t.x(); L.y=t.y(); emit(); });
    t.on('dblclick dbltap',()=>{ const v=prompt('Label text:',L.text); if(v!=null){ L.text=v; render(); emit(); } });
    L.node=t; layer.add(t); });
  layer.batchDraw();
}

function rebuildShellBar(){
  // keep the leading caption span, rebuild number inputs
  shellbar.querySelectorAll('.shellinp').forEach(e=>e.remove());
  shells.forEach((sh,i)=>{ const wrapEl=document.createElement('label'); wrapEl.className='inl shellinp'; wrapEl.style.marginLeft='6px';
    wrapEl.innerHTML='Shell '+(i+1)+': ';
    const inp=document.createElement('input'); inp.type='number'; inp.min='0'; inp.max='32'; inp.value=sh.count;
    inp.oninput=()=>{ sh.count=Math.max(0,Math.min(32, parseInt(inp.value||'0'))); render(); emit(); };
    wrapEl.appendChild(inp); shellbar.appendChild(wrapEl); });
}

function emit(){
  const arr=shells.map(s=>s.count|0);
  const empty = !nucleusText && !chargeText && arr.length===0 && labels.length===0;
  onChange(empty ? null : { nucleus:nucleusText, nucleusDisplay:latexToUnicode(nucleusText), charge:chargeText||null, chargeDisplay:latexToUnicode(chargeText)||null, shells:arr, labels:labels.map(L=>({text:L.text,x:Math.round(L.x),y:Math.round(L.y)})) });
  const total=arr.reduce((a,b)=>a+b,0);
  statusEl.textContent='nucleus: '+(nucleusText||'—')+(chargeText?(' ('+chargeText+')'):'')+'  |  configuration: '+(arr.length?arr.join(','):'(no shells)')+'  |  total electrons: '+total;
}

// tools
function setTool(t){ tool=t; tb.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t)); }
tb.querySelectorAll('[data-tool]').forEach(b=> b.onclick=()=>setTool(b.dataset.tool));
tb.querySelector('#addShell').onclick=()=>{ shells.push({count:0}); rebuildShellBar(); render(); emit(); };
tb.querySelector('#delShell').onclick=()=>{ shells.pop(); rebuildShellBar(); render(); emit(); };
const _ev = hasMath ? 'input' : 'input';
nucField.addEventListener(_ev,()=>{ nucleusText=fieldVal(nucField); render(); emit(); });
chgField.addEventListener(_ev,()=>{ chargeText=fieldVal(chgField); render(); emit(); });
tb.querySelector('#clear').onclick=()=>{ shells=[]; labels=[]; rebuildShellBar(); render(); emit(); };

// place label on canvas click when label tool active
stage.on('mousedown touchstart',(e)=>{ if(e.target===stage && tool==='label'){ const t=stage.getAbsoluteTransform().copy(); t.invert(); const p=t.point(stage.getPointerPosition());
  labels.push({id:uid++,text:'label',x:p.x,y:p.y}); setTool('select'); render(); emit(); }});
// zoom
stage.on('wheel',(e)=>{ e.evt.preventDefault(); const old=stage.scaleX(); const ptr=stage.getPointerPosition();
  const m={x:(ptr.x-stage.x())/old,y:(ptr.y-stage.y())/old}; const dir=e.evt.deltaY>0?-1:1; const f=1.08; const k=Math.max(0.5,Math.min(2.2,dir>0?old*f:old/f));
  stage.scale({x:k,y:k}); stage.position({x:ptr.x-m.x*k,y:ptr.y-m.y*k}); stage.batchDraw(); });

shells=[]; rebuildShellBar(); render(); emit();

      return {
        update: () => {},
        clear: () => { shells=[]; labels=[]; nucleusText=''; chargeText=''; try{nucField.value='';chgField.value='';}catch(e){} rebuildShellBar(); render(); emit(); },
        destroy: () => { try{ stage.destroy(); }catch(e){} container.innerHTML=''; },
      };
    });
})();
