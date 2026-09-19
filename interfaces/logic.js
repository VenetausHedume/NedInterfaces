/* Logic gates — build gates from PRIMITIVES (line, curve, bubble; + premade
   open-rect / dome / back-curve), weld joining points, and the unique code
   (straight,curved,bubble counts) identifies the gate:
     3,0,1=NOT 3,1,0=AND 2,2,0=OR 3,1,1=NAND 2,2,1=NOR 2,3,0=XOR.
   Recognised gates get input pins (2, or 1 for NOT) + an output pin; wire
   Inputs (A,B..) and Output (Q) to build a circuit. Saves the whole circuit
   in code form: { gates:[{id,code,gate}], inputs, outputs, wires }.
   Canva-style resize box, rotation, alignment snap, pan/zoom. */

(function () {
  Ned.register('logic',
    {
      name: 'Logic gates',
      unlocks: 'boolean logic',
      samples: [
        { label: 'Build a circuit',
          question: { text: 'Draw a logic circuit for Q = (A AND B) OR (NOT C).', marks: 6, config: {} } },
        { label: 'Single gate',
          question: { text: 'Draw a NAND gate with inputs A and B, output Q.', marks: 3, config: {} } },
      ],
    },
    function (container, { question, value, onChange }) {
      const NS = 'http://www.w3.org/2000/svg';
      // ---- scaffold DOM inside the container ----
      const tb = document.createElement('div'); tb.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;';
      const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;width:100%;max-width:940px;';
      const board = document.createElementNS(NS,'svg'); board.setAttribute('viewBox','0 0 940 560');
      board.style.cssText = 'width:100%;height:560px;background:#fffdf7;border:1px solid var(--line);border-radius:10px;touch-action:none;display:block;';
      const vp = document.createElementNS(NS,'g'); const gP = document.createElementNS(NS,'g'); gP.id='prims'; vp.appendChild(gP); board.appendChild(vp);
      const abadge = document.createElement('div'); abadge.style.cssText='position:absolute;display:none;transform:translate(-50%,-50%);background:#3a4653;color:#fff;font-size:13px;font-weight:600;padding:5px 10px;border-radius:8px;pointer-events:none;z-index:5;';
      wrap.append(board, abadge);
      container.append(tb, wrap);
      container.appendChild(Ned.el('p',{class:'ned-note'},['Build gates from primitives; weld joining points. Recognised gates get pins to wire. Scroll=zoom, Shift+scroll/drag=pan.']));


// board, vp, gP, tb, abadge are created by the factory scaffold below
let W=940,H=560; function fit(){const r=board.getBoundingClientRect();W=Math.round(r.width);H=Math.round(r.height);board.setAttribute('viewBox','0 0 '+W+' '+H);}
function svg(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
let view={x:0,y:0,k:1}; function applyView(){vp.setAttribute('transform','translate('+view.x+','+view.y+') scale('+view.k+')');}
const px=(e)=>{const r=board.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};};
const pt=(e)=>{const p=px(e);return{x:(p.x-view.x)/view.k,y:(p.y-view.y)/view.k};};

let prims=[], joinPts=[], links=[], tool='select', selected=null, uid=1, attachFrom=null, rotating=false;
let terminals=[];   // {id, kind:'in'|'out', label, x, y}
let wires=[];       // {from:{k:'term'|'gate', id, pin?}, to:{k:'gate'|'out', gid, pin}}
let inLetter=65, wireFrom=null;
// abadge created in scaffold
function showBadge(x,y,txt){const r=board.getBoundingClientRect();abadge.style.left=(x*(r.width/W))+'px';abadge.style.top=(y*(r.height/H))+'px';abadge.textContent=txt;abadge.style.display='block';}
function hideBadge(){abadge.style.display='none';}
const SNAPA=[0,45,90,135,180,-45,-90,-135,-180];
function snapDeg(d){for(const t of SNAPA)if(Math.abs(d-t)<=4)return t;return d;}
const JOIN_SNAP=14;   // px (world) distance for magnetic join snapping
const CURVE_PTS=5;

function addLine(x,y){ const P={id:uid++,kind:'line',pts:[{x:x-70,y},{x:x+70,y}]}; build(P); }
function addCurve(x,y){ const pts=[]; for(let i=0;i<CURVE_PTS;i++) pts.push({x:x-80+i*(160/(CURVE_PTS-1)), y:y-(i%2?24:0)}); const P={id:uid++,kind:'curve',pts}; build(P); }
function addBubble(x,y){ const P={id:uid++,kind:'bubble',pts:[{x,y}]}; build(P); }

// --- Premades: pre-arranged + pre-welded REAL primitives (identical code to hand-built) ---
function addPrimSilent(kind, pts){ const P={id:uid++,kind,pts:pts.map(p=>({x:p.x,y:p.y}))};
  const g=svg('g',{}); const hit=svg('path',{class:'prim-hit',stroke:'transparent','stroke-width':16,fill:'none',style:'cursor:move'}),body=svg('path',{class:'prim',stroke:'#2b2b2b','stroke-width':3,fill:'none','stroke-linecap':'round',style:'cursor:move'}); g.append(hit,body); gP.appendChild(g);
  P.el={g,hit,body}; prims.push(P); wirePrim(P); return P; }
function addJoinSilent(P,x,y){ const c=primCentroid(P); joinPts.push({id:uid++,prim:P.id,x,y,ox:x-c.x,oy:y-c.y}); }
function weldSilent(A,B){ // create coincident join points on A and B and link them
  const ja=joinPts[joinPts.length-1]; // not used; explicit below
}
function linkPts(aid,bid){ links.push({a:aid,b:bid}); }

// open rectangle = 3 lines (top, back, bottom) welded at the two left corners
function addOpenRect(x,y){
  const w=120,h=70; const L=x-w/2,R=x+w/2,T=y-h/2,B=y+h/2;
  const top=addPrimSilent('line',[{x:L,y:T},{x:R,y:T}]);
  const back=addPrimSilent('line',[{x:L,y:T},{x:L,y:B}]);
  const bot=addPrimSilent('line',[{x:L,y:B},{x:R,y:B}]);
  // joining points at the two shared corners + weld
  const idBase=uid;
  joinPts.push({id:uid++,prim:top.id, x:L,y:T, ox:L-primCentroid(top).x, oy:T-primCentroid(top).y});
  joinPts.push({id:uid++,prim:back.id,x:L,y:T, ox:L-primCentroid(back).x,oy:T-primCentroid(back).y});
  linkPts(idBase, idBase+1);
  const id2=uid;
  joinPts.push({id:uid++,prim:back.id,x:L,y:B, ox:L-primCentroid(back).x,oy:B-primCentroid(back).y});
  joinPts.push({id:uid++,prim:bot.id, x:L,y:B, ox:L-primCentroid(bot).x, oy:B-primCentroid(bot).y});
  linkPts(id2, id2+1);
  select(bot); emit();
}
// dome curve = single curve bent into the AND front dome (opens to the LEFT)
function addDome(x,y){
  const pts=[{x:x-10,y:y-40},{x:x+30,y:y-30},{x:x+45,y:y},{x:x+30,y:y+30},{x:x-10,y:y+40}];
  const P=addPrimSilent('curve',pts); select(P); draw(P); emit();
}
// back curve = single curve bent into the OR back (concave, opens to the RIGHT)
function addBackCurve(x,y){
  const pts=[{x:x-20,y:y-40},{x:x+8,y:y-20},{x:x+16,y:y},{x:x+8,y:y+20},{x:x-20,y:y+40}];
  const P=addPrimSilent('curve',pts); select(P); draw(P); emit();
}

function build(P){ const g=svg('g',{}); const hit=svg('path',{class:'prim-hit',stroke:'transparent','stroke-width':16,fill:'none',style:'cursor:move'}),body=svg('path',{class:'prim',stroke:'#2b2b2b','stroke-width':3,fill:'none','stroke-linecap':'round',style:'cursor:move'}); g.append(hit,body); gP.appendChild(g); P.el={g,hit,body}; prims.push(P); wirePrim(P); draw(P); select(P); emit(); }
function pathOf(P){
  if(P.kind==='line'){ const a=P.pts[0],b=P.pts[1]; return 'M '+a.x+' '+a.y+' L '+b.x+' '+b.y; }
  if(P.kind==='curve'){ const p=P.pts; let d='M '+p[0].x+' '+p[0].y; for(let i=0;i<p.length-1;i++){ const p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p[i+1]; d+=' C '+(p1.x+(p2.x-p0.x)/6)+' '+(p1.y+(p2.y-p0.y)/6)+' '+(p2.x-(p3.x-p1.x)/6)+' '+(p2.y-(p3.y-p1.y)/6)+' '+p2.x+' '+p2.y; } return d; }
  const c=P.pts[0],r=9; return 'M '+(c.x-r)+' '+c.y+' a '+r+' '+r+' 0 1 0 '+(2*r)+' 0 a '+r+' '+r+' 0 1 0 '+(-2*r)+' 0';
}
function draw(P){ const e=P.el,d=pathOf(P); e.body.setAttribute('d',d); e.hit.setAttribute('d',d); e.body.setAttribute('stroke', selected===P ? 'var(--accent)' : '#2b2b2b'); e.g.classList.toggle('sel',selected===P); redraw(); drawCircuit(); }

let wireLayer=svg('g',{}); vp.appendChild(wireLayer);   // wires (under pins)
let ptLayer=svg('g',{}); vp.appendChild(ptLayer);
let pinLayer=svg('g',{}); vp.appendChild(pinLayer);     // gate pins + terminals (on top)
let guideLayer=svg('g',{}); vp.appendChild(guideLayer);
const ALIGN_TOL=1;
function clearGuides(){ guideLayer.innerHTML=''; }
// given the moving primitive P, snap its bbox edges/centres to others; draw dotted guides
function alignSnap(P){
  clearGuides();
  const bb=bboxOf(P); const meX={left:bb.minx,cx:(bb.minx+bb.maxx)/2,right:bb.maxx}, meY={top:bb.miny,cy:(bb.miny+bb.maxy)/2,bottom:bb.maxy};
  let snapDX=null, snapDY=null, gx=[], gy=[];
  prims.forEach(Q=>{ if(Q===P) return; const qb=bboxOf(Q); const qX=[qb.minx,(qb.minx+qb.maxx)/2,qb.maxx], qY=[qb.miny,(qb.miny+qb.maxy)/2,qb.maxy];
    [meX.left,meX.cx,meX.right].forEach(mx=>{ qX.forEach(qx=>{ if(Math.abs(mx-qx)<=ALIGN_TOL && (snapDX===null||Math.abs(qx-mx)<Math.abs(snapDX))){ snapDX=qx-mx; gx.push(qx);} }); });
    [meY.top,meY.cy,meY.bottom].forEach(my=>{ qY.forEach(qy=>{ if(Math.abs(my-qy)<=ALIGN_TOL && (snapDY===null||Math.abs(qy-my)<Math.abs(snapDY))){ snapDY=qy-my; gy.push(qy);} }); });
  });
  if(snapDX!==null){ P.pts.forEach(pp=>pp.x+=snapDX); movePrimJoins(P); }
  if(snapDY!==null){ P.pts.forEach(pp=>pp.y+=snapDY); movePrimJoins(P); }
  // draw guides at the snapped lines (span the canvas-ish)
  gx.forEach(x=>guideLayer.appendChild(svg('line',{x1:x,y1:-2000,x2:x,y2:2000,stroke:'#e0679a','stroke-width':1,'stroke-dasharray':'4 4'})));
  gy.forEach(y=>guideLayer.appendChild(svg('line',{x1:-2000,y1:y,x2:2000,y2:y,stroke:'#e0679a','stroke-width':1,'stroke-dasharray':'4 4'})));
}

// pin world-positions for a recognised group
function gatePins(g){
  const n=inputsFor(g.gate); const pins=[];
  for(let i=0;i<n;i++){ const off=(n===1)?0:(i===0?-14:14); pins.push({key:g.gid+':in'+i, kind:'in', gid:g.gid, pin:'in'+i, x:g.minx-6, y:g.cy+off}); }
  pins.push({key:g.gid+':out', kind:'out', gid:g.gid, pin:'out', x:g.maxx+6, y:g.cy});
  return pins;
}
function termPins(T){ if(T.kind==='in') return [{key:'t'+T.id+':out', kind:'out', term:T.id, x:T.x+16, y:T.y}];
  return [{key:'t'+T.id+':in', kind:'in', term:T.id, x:T.x-16, y:T.y}]; }
function allPins(){ let ps=[]; groupsOf().forEach(g=>{ if(g.gate) ps=ps.concat(gatePins(g)); }); terminals.forEach(T=>{ ps=ps.concat(termPins(T)); }); return ps; }
function pinByKey(k){ return allPins().find(p=>p.key===k); }

function drawCircuit(){
  pinLayer.innerHTML=''; wireLayer.innerHTML='';
  // terminals
  terminals.forEach(T=>{ const g=svg('g',{}); g.setAttribute('transform','translate('+T.x+','+T.y+')');
    const c=svg('circle',{r:16,fill:'#fff',stroke:'#2b2b2b','stroke-width':2, style:'cursor:move', class:(selected===T?'':'')});
    const t=svg('text',{'text-anchor':'middle','dominant-baseline':'middle','font-size':13,fill:'#2b2b2b','pointer-events':'none'}); t.textContent=T.label;
    if(selected===T) c.setAttribute('stroke','var(--accent)');
    c.addEventListener('pointerdown',(ev)=>{ if(tool!=='select')return; ev.stopPropagation(); selectTerm(T);
      let last=pt(ev); const mv=(e)=>{const p=pt(e);T.x+=p.x-last.x;T.y+=p.y-last.y;last=p;drawCircuit();}; const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);emit();}; window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up); });
    g.append(c,t); pinLayer.appendChild(g);
  });
  // pins
  allPins().forEach(p=>{ const c=svg('circle',{r:5,cx:p.x,cy:p.y,fill:(wireFrom&&wireFrom.key===p.key)?'var(--accent)':'#fff',stroke:'var(--accent)','stroke-width':1.5,style:'cursor:crosshair'});
    c.addEventListener('pointerdown',(ev)=>{ ev.stopPropagation(); onPin(p); }); pinLayer.appendChild(c); });
  // wires
  wires.forEach(w=>{ const a=pinByKey(w.from), b=pinByKey(w.to); if(!a||!b) return; const mx=(a.x+b.x)/2;
    const d='M '+a.x+' '+a.y+' C '+mx+' '+a.y+' '+mx+' '+b.y+' '+b.x+' '+b.y;
    const hit=svg('path',{d,stroke:'transparent','stroke-width':12,fill:'none',style:'cursor:pointer'});
    const ln=svg('path',{d,stroke:(selected===w?'#4682b4':'#2b2b2b'),'stroke-width':2,fill:'none'});
    hit.addEventListener('pointerdown',(ev)=>{ev.stopPropagation(); selectWire(w);}); wireLayer.append(hit,ln); });
}
function onPin(p){
  if(p.kind==='out'){ wireFrom=p; drawCircuit(); return; }
  if(p.kind==='in' && wireFrom){ wires.push({from:wireFrom.key, to:p.key}); wireFrom=null; drawCircuit(); emit(); }
}
function selectTerm(T){ selected=T; prims.forEach(draw); redraw(); drawCircuit(); }
function selectWire(w){ selected=w; prims.forEach(draw); redraw(); drawCircuit(); }
function primCentroid(P){ const n=P.pts.length; return {x:P.pts.reduce((s,p)=>s+p.x,0)/n, y:P.pts.reduce((s,p)=>s+p.y,0)/n}; }
function bboxOf(P){ const xs=P.pts.map(p=>p.x), ys=P.pts.map(p=>p.y); return {minx:Math.min(...xs),maxx:Math.max(...xs),miny:Math.min(...ys),maxy:Math.max(...ys)}; }
// scale a primitive's points around an anchor (ax,ay) by (sx,sy)
function scalePrim(P,ax,ay,sx,sy){ P.pts.forEach(pp=>{ pp.x=ax+(pp.x-ax)*sx; pp.y=ay+(pp.y-ay)*sy; }); movePrimJoins(P); }
function redraw(){
  ptLayer.innerHTML='';
  // editable (shaping) points — only for the selected primitive
  if(selected && selected.pts && selected.kind!=='bubble'){ selected.pts.forEach((pp,idx)=>{ const c=svg('circle',{class:'edit',r:6,cx:pp.x,cy:pp.y,fill:'#eaf1f8',stroke:'var(--accent)','stroke-width':2,style:'cursor:grab'});
    c.addEventListener('pointerdown',(ev)=>{ev.stopPropagation(); dragEdit(selected,idx);}); ptLayer.appendChild(c); }); }
  // resize: dotted bounding box + 8 handles (drag to scale the shape inside)
  if(selected && selected.pts && selected.kind!=='bubble' && !rotating){
    const bb=bboxOf(selected); const pad=8; const x0=bb.minx-pad,y0=bb.miny-pad,x1=bb.maxx+pad,y1=bb.maxy+pad;
    ptLayer.appendChild(svg('rect',{x:x0,y:y0,width:(x1-x0),height:(y1-y0),fill:'none',stroke:'var(--accent)','stroke-width':1,'stroke-dasharray':'5 4'}));
    const H=[['nw',x0,y0],['n',(x0+x1)/2,y0],['ne',x1,y0],['e',x1,(y0+y1)/2],['se',x1,y1],['s',(x0+x1)/2,y1],['sw',x0,y1],['w',x0,(y0+y1)/2]];
    H.forEach(([pos,hx,hy])=>{ const h=svg('rect',{x:hx-4,y:hy-4,width:8,height:8,fill:'#fff',stroke:'var(--accent)','stroke-width':1.5,style:'cursor:pointer'});
      h.addEventListener('pointerdown',(ev)=>{ ev.stopPropagation(); startResize(selected,pos,{x0,y0,x1,y1},ev); }); ptLayer.appendChild(h); });
  }
  // rotate handle for the selected line/curve
  if(selected && selected.pts && selected.kind!=='bubble' && !rotating){
    // rotate handle: offset perpendicular to the shape so it never sits on it
    const c=primCentroid(selected);
    let ang=0; if(selected.pts.length>=2){ const a=selected.pts[0], b=selected.pts[selected.pts.length-1]; ang=Math.atan2(b.y-a.y,b.x-a.x); }
    const nx=Math.sin(ang), ny=-Math.cos(ang);           // perpendicular
    const rx=c.x+nx*60, ry=c.y+ny*60;
    const rg=svg('g',{}); rg.setAttribute('transform','translate('+rx+','+ry+')');
    const bg=svg('circle',{r:16,cx:0,cy:0,fill:'#4682b4',stroke:'#fff','stroke-width':2,style:'cursor:grab;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))'});
    rg.append(bg, svg('path',{d:'M -6 -1 A 6 6 0 1 1 -4 5',fill:'none',stroke:'#fff','stroke-width':2}), svg('path',{d:'M -4 5 l -3.5 -1 M -4 5 l 1 -3.5',fill:'none',stroke:'#fff','stroke-width':2}));
    bg.addEventListener('pointerdown',(ev)=>{ ev.stopPropagation(); startRotate(selected); });
    ptLayer.appendChild(rg);
  }
  // joining points (user-added) — CLICK one, then CLICK another to connect
  joinPts.forEach(J=>{ const linked=links.some(l=>l.a===J.id||l.b===J.id);
    const c=svg('circle',{r:8,cx:J.x,cy:J.y,fill:(linked?'#c0392b':'#fff'),stroke:'#c0392b','stroke-width':2,style:'cursor:grab'});
    let downX=0,downY=0,moved=false;
    c.addEventListener('pointerdown',(ev)=>{ ev.stopPropagation();
      if(tool==='detach'){ links=links.filter(l=>l.a!==J.id&&l.b!==J.id); redraw(); emit(); return; }
      const P=prims.find(p=>p.id===J.prim); if(!P) return;
      const startPt=pt(ev); downX=ev.clientX; downY=ev.clientY; moved=false;
      const o=P.pts.map(pp=>({x:pp.x,y:pp.y}));
      const oj=joinPts.filter(j=>j.prim===P.id).map(j=>({id:j.id,x:j.x,y:j.y}));
      const thisJ0={x:J.x,y:J.y};
      let snapTarget=null;
      const mv=(e)=>{ moved=true; const p=pt(e); let dx=p.x-startPt.x, dy=p.y-startPt.y;
        // where THIS joining point would land
        const nx=thisJ0.x+dx, ny=thisJ0.y+dy;
        // nearest OTHER joining point (not on this primitive)
        let best=null,bd=16; joinPts.forEach(k=>{ if(k.prim===P.id) return; const d=Math.hypot(k.x-nx,k.y-ny); if(d<bd){bd=d;best=k;} });
        if(best){ dx = best.x - thisJ0.x; dy = best.y - thisJ0.y; snapTarget=best.id; }
        else snapTarget=null;
        // move the primitive (and drag any already-welded neighbours) by delta from original
        P.pts.forEach((pp,i)=>{ pp.x=o[i].x+dx; pp.y=o[i].y+dy; });
        oj.forEach(z=>{ const jj=joinPts.find(j=>j.id===z.id); jj.x=z.x+dx; jj.y=z.y+dy; });
        draw(P);
        // live guide dot on the snap target
        clearGuides(); if(best){ guideLayer.appendChild(svg('circle',{cx:best.x,cy:best.y,r:11,fill:'none',stroke:'#4caf50','stroke-width':2})); }
      };
      const up=()=>{ clearGuides(); window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up);
        if(snapTarget!=null){ if(!links.some(l=>(l.a===J.id&&l.b===snapTarget)||(l.b===J.id&&l.a===snapTarget))) links.push({a:J.id,b:snapTarget}); }
        else if(!moved){ onJoinClick(J); }   // no drag = fall back to click-to-connect
        redraw(); emit(); };
      window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up);
    });
    ptLayer.appendChild(c); });
}
function onJoinClick(J){
  if(tool==='detach'){ links=links.filter(l=>l.a!==J.id&&l.b!==J.id); attachFrom=null; redraw(); emit(); return; }
  if(!attachFrom){ attachFrom=J.id; redraw(); return; }          // first click: arm
  if(attachFrom===J.id){ attachFrom=null; redraw(); return; }     // click same: cancel
  const A=joinPts.find(j=>j.id===attachFrom), B=J;                // second click: connect
  const P=prims.find(p=>p.id===B.prim);
  if(P){ const dx=A.x-B.x, dy=A.y-B.y; P.pts.forEach(pp=>{pp.x+=dx;pp.y+=dy;}); joinPts.filter(j=>j.prim===P.id).forEach(j=>{j.x+=dx;j.y+=dy;}); draw(P); }
  if(!links.some(l=>(l.a===A.id&&l.b===B.id)||(l.a===B.id&&l.b===A.id))) links.push({a:A.id,b:B.id});
  attachFrom=null; redraw(); emit();
}
function startResize(P, pos, box, ev0){
  const {x0,y0,x1,y1}=box; const w0=x1-x0, h0=y1-y0;
  // anchor = the opposite corner/edge that stays fixed
  const ax = pos.includes('w')? x1 : (pos.includes('e')? x0 : (x0+x1)/2);
  const ay = pos.includes('n')? y1 : (pos.includes('s')? y0 : (y0+y1)/2);
  const o=P.pts.map(pp=>({x:pp.x,y:pp.y}));
  const horiz = pos.includes('e')||pos.includes('w'); const vert = pos.includes('n')||pos.includes('s');
  const corner = horiz && vert;
  const mv=(e)=>{ const p=pt(e);
    let sx=1, sy=1;
    if(horiz){ const denom=(pos.includes('e')? (x1-ax): (ax-x0))||1; sx = (pos.includes('e')? (p.x-ax): (ax-p.x))/denom; }
    if(vert){  const denom=(pos.includes('s')? (y1-ay): (ay-y0))||1; sy = (pos.includes('s')? (p.y-ay): (ay-p.y))/denom; }
    if(corner && e.shiftKey){ const k=Math.max(Math.abs(sx),Math.abs(sy)); sx=Math.sign(sx||1)*k; sy=Math.sign(sy||1)*k; }
    sx=Math.max(0.1,sx); sy=Math.max(0.1,sy);
    P.pts.forEach((pp,i)=>{ pp.x=ax+(o[i].x-ax)*sx; pp.y=ay+(o[i].y-ay)*sy; }); movePrimJoins(P); draw(P);
  };
  const up=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); emit(); };
  window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up);
}
function startRotate(P){ const c=primCentroid(P); rotating=true; redraw();
  const o=P.pts.map(pp=>({x:pp.x,y:pp.y})); const base=Math.atan2(-(o[o.length-1].y-o[0].y),o[o.length-1].x-o[0].x)*180/Math.PI;
  const mv=(e)=>{ const p=pt(e); let ang=Math.atan2(-(p.y-c.y),p.x-c.x)*180/Math.PI; ang=snapDeg(ang); const dr=(ang-base)*Math.PI/180, cs=Math.cos(dr), sn=Math.sin(dr);
    P.pts.forEach((pp,i)=>{ const ox=o[i].x-c.x, oy=o[i].y-c.y; pp.x=c.x+(ox*cs+oy*sn); pp.y=c.y+(-ox*sn+oy*cs); }); movePrimJoins(P); draw(P); showBadge(p.x,p.y-26,Math.round(ang)+'\u00b0'); };
  const up=()=>{ hideBadge(); rotating=false; redraw(); emit(); window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); };
  window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up);
}
function dragEdit(P,idx){ const mv=(e)=>{const p=pt(e);P.pts[idx].x=p.x;P.pts[idx].y=p.y; movePrimJoins(P); draw(P);}; const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);emit();}; window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up); }
// joining points added on a primitive move with that primitive (store offset from centroid)
function movePrimJoins(P){ joinPts.filter(j=>j.prim===P.id).forEach(j=>{ const c=primCentroid(P); j.x=c.x+j.ox; j.y=c.y+j.oy; }); }
// move a primitive by (dx,dy) and drag any WELDED (linked) primitives along, transitively
function moveWelded(startId, dx, dy){
  const seen=new Set();
  function go(id){
    if(seen.has(id)) return; seen.add(id);
    const P=prims.find(p=>p.id===id); if(!P) return;
    P.pts.forEach(pp=>{pp.x+=dx;pp.y+=dy;});
    joinPts.filter(j=>j.prim===id).forEach(j=>{ j.x+=dx; j.y+=dy; });
    draw(P);
    // follow every link touching this primitive's join points
    joinPts.filter(j=>j.prim===id).forEach(j=>{
      links.forEach(l=>{ let other=null; if(l.a===j.id) other=l.b; else if(l.b===j.id) other=l.a;
        if(other!=null){ const oj=joinPts.find(k=>k.id===other); if(oj) go(oj.prim); } });
    });
  }
  go(startId);
}


function select(o){ selected=o; prims.forEach(draw); if(o&&o.el) o.el.g.parentNode.appendChild(o.el.g); redraw(); }
function wirePrim(P){ P.el.g.addEventListener('pointerdown',(evt)=>{ if(tool!=='select')return; evt.stopPropagation(); select(P);
  let last=pt(evt);
  const mv=(e)=>{ const p=pt(e); const dx=p.x-last.x, dy=p.y-last.y; last=p; moveWelded(P.id, dx, dy); alignSnap(P); };
  const up=()=>{clearGuides();window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);emit();};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up); }); }

// lookup
const LOOKUP={'3,0,1':'NOT','3,1,0':'AND','2,2,0':'OR','3,1,1':'NAND','2,2,1':'NOR','2,3,0':'XOR'};
function groupsOf(){ const parent={}; prims.forEach(p=>parent[p.id]=p.id); const find=x=>{while(parent[x]!==x)x=parent[x]=parent[parent[x]];return x;};
  links.forEach(l=>{ const ja=joinPts.find(j=>j.id===l.a), jb=joinPts.find(j=>j.id===l.b); if(ja&&jb) parent[find(ja.prim)]=find(jb.prim); });
  const gm={}; prims.forEach(p=>{const r=find(p.id);(gm[r]=gm[r]||[]).push(p);});
  return Object.entries(gm).map(([root,gr])=>{ let s=0,c=0,b=0,xs=[],ys=[]; gr.forEach(p=>{p.kind==='line'?s++:p.kind==='curve'?c++:b++; p.pts.forEach(pp=>{xs.push(pp.x);ys.push(pp.y);});});
    const code=s+','+c+','+b; const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
    return { gid:'g'+root, members:gr.map(p=>p.id), code, gate:LOOKUP[code]||null, minx,maxx,miny,maxy, cx:(minx+maxx)/2, cy:(miny+maxy)/2 };
  }).filter(g=>g.members.length>=2);
}
function classify(){ return groupsOf().map(g=>({code:g.code,gate:g.gate||'?'})); }
// how many inputs a recognised gate takes
function inputsFor(gate){ return gate==='NOT'?1:2; }
function emit(){
  const gs=groupsOf();
  const gates=gs.map(g=>({ id:g.gid, code:g.code, gate:g.gate||'?' }));
  const inputs=terminals.filter(t=>t.kind==='in').map(t=>({id:'t'+t.id,label:t.label}));
  const outputs=terminals.filter(t=>t.kind==='out').map(t=>({id:'t'+t.id,label:t.label}));
  const wr=wires.map(w=>({from:w.from,to:w.to}));
  const empty = gates.length===0 && inputs.length===0 && outputs.length===0 && wr.length===0;
  onChange(empty ? null : { gates, inputs, outputs, wires: wr });
}

board.addEventListener('pointerdown',(evt)=>{ const p=pt(evt);
  if(tool==='line'){addLine(p.x,p.y);setTool('select');return;}
  if(tool==='curve'){addCurve(p.x,p.y);setTool('select');return;}
  if(tool==='bubble'){addBubble(p.x,p.y);setTool('select');return;}
  if(tool==='openrect'){ addOpenRect(p.x,p.y); setTool('select'); return; }
  if(tool==='dome'){ addDome(p.x,p.y); setTool('select'); return; }
  if(tool==='backcurve'){ addBackCurve(p.x,p.y); setTool('select'); return; }
  if(tool==='addin'){ terminals.push({id:uid++,kind:'in',label:String.fromCharCode(inLetter++),x:p.x,y:p.y}); drawCircuit(); emit(); setTool('select'); return; }
  if(tool==='addout'){ terminals.push({id:uid++,kind:'out',label:'Q',x:p.x,y:p.y}); drawCircuit(); emit(); setTool('select'); return; }
  if(tool==='addjoin'){ // drop a joining point on the nearest primitive
    let best=null,bd=1e9; prims.forEach(P=>{ const c=primCentroid(P); const d=Math.hypot(c.x-p.x,c.y-p.y); if(d<bd){bd=d;best=P;} });
    if(best){ const c=primCentroid(best); joinPts.push({id:uid++,prim:best.id,x:p.x,y:p.y,ox:p.x-c.x,oy:p.y-c.y}); redraw(); emit(); }
    setTool('select'); return;
  }
  select(null); attachFrom=null; wireFrom=null; redraw(); drawCircuit();
  if(tool==='select'){ const s=px(evt),v0={x:view.x,y:view.y}; const mv=(e)=>{const q=px(e);view.x=v0.x+(q.x-s.x);view.y=v0.y+(q.y-s.y);applyView();}; const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);}; window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up); }
});
board.addEventListener('wheel',(e)=>{ e.preventDefault(); const r=board.getBoundingClientRect(),sx=W/r.width,sy=H/r.height; if(e.shiftKey){view.x-=e.deltaX*sx;view.y-=e.deltaY*sy;applyView();return;} const cx=(e.clientX-r.left)*sx,cy=(e.clientY-r.top)*sy,f=e.deltaY<0?1.1:1/1.1,nk=Math.max(0.3,Math.min(3,view.k*f)); view.x=cx-(cx-view.x)*(nk/view.k);view.y=cy-(cy-view.y)*(nk/view.k);view.k=nk;applyView(); },{passive:false});

// tb created in scaffold
function setTool(t){tool=t;attachFrom=null;[...tb.children].forEach(b=>{ const on=(b.dataset.t===t); b.style.background=on?'#eaf1f8':'var(--paper)'; b.style.borderColor=on?'var(--accent)':'var(--line)'; });redraw&&redraw();}
function btn(l,t){const b=document.createElement('button');b.textContent=l;b.dataset.t=t;b.onclick=()=>setTool(t);tb.appendChild(b);}
btn('Select / Move','select'); btn('Line','line'); btn('Curve','curve'); btn('Bubble','bubble'); btn('Add joining point','addjoin'); btn('Detach','detach');
btn('\u2b1c Open rect','openrect'); btn('\u25D6 Dome','dome'); btn('\u25D7 Back curve','backcurve'); btn('+ Input','addin'); btn('+ Output','addout');
const bPts=document.createElement('button'); bPts.textContent='Curve: 5 pts'; bPts.onclick=()=>{ if(selected&&selected.kind==='curve'){ const cur=selected.pts.length; const target=cur===5?3:5; resampleCurve(selected,target); bPts.textContent='Curve: '+(target===5?'5':'3')+' pts'; draw(selected); emit(); } }; tb.appendChild(bPts);
function resampleCurve(P,n){ const old=P.pts; const np=[]; for(let i=0;i<n;i++){ const t=i/(n-1); const idx=t*(old.length-1); const lo=Math.floor(idx),hi=Math.ceil(idx),fr=idx-lo; np.push({x:old[lo].x+(old[hi].x-old[lo].x)*fr, y:old[lo].y+(old[hi].y-old[lo].y)*fr}); } P.pts=np; }
const bDel=document.createElement('button');bDel.textContent='Delete';bDel.onclick=()=>{ if(!selected) return;
  if(selected.kind==='in'||selected.kind==='out'){ terminals=terminals.filter(t=>t!==selected); wires=wires.filter(w=>!w.from.startsWith('t'+selected.id)&&!w.to.startsWith('t'+selected.id)); selected=null; drawCircuit(); emit(); return; }
  if(selected.from&&selected.to){ wires=wires.filter(w=>w!==selected); selected=null; drawCircuit(); emit(); return; }
  if(selected.el){ prims=prims.filter(p=>p!==selected); joinPts=joinPts.filter(j=>j.prim!==selected.id); links=links.filter(l=>{const ja=joinPts.find(j=>j.id===l.a),jb=joinPts.find(j=>j.id===l.b);return ja&&jb;}); selected.el.g.remove(); select(null); emit(); }
};tb.appendChild(bDel);
const bClr=document.createElement('button');bClr.textContent='Clear';bClr.onclick=()=>{prims.forEach(p=>p.el.g.remove());prims=[];joinPts=[];links=[];terminals=[];wires=[];inLetter=65;select(null);drawCircuit();emit();};tb.appendChild(bClr);

fit(); applyView(); window.addEventListener('resize',()=>{fit();redraw();drawCircuit();}); setTool('select'); drawCircuit(); emit();

      return {
        update: () => {},   // (load-from-value can be added later; fresh build for now)
        clear: () => { try { prims.forEach(p=>p.el.g.remove()); } catch(e){} prims=[]; joinPts=[]; links=[]; terminals=[]; wires=[]; inLetter=65; select(null); drawCircuit(); emit(); },
        destroy: () => { container.innerHTML=''; },
      };
    });
})();
