/* KGP Lab Bench · Circuit-diagram view, board controls, theory panel */
/* ================= schematic drawing ================= */
const pts=p=>p.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
const wire=(...p)=>`<polyline class="w" points="${pts(p)}"/>`;
const dv=(x1,y1,x2,y2)=>{const L=Math.hypot(x2-x1,y2-y1);return {L,ux:(x2-x1)/L,uy:(y2-y1)/L}};
function lbl(x1,y1,x2,y2,n,v){const h=Math.abs(x2-x1)>Math.abs(y2-y1),mx=(x1+x2)/2,my=(y1+y2)/2;
  return h?`<text x="${mx}" y="${my-15}" text-anchor="middle">${n}${v?` <tspan class="lbl">${v}</tspan>`:''}</text>`:`<text x="${mx+16}" y="${my-3}">${n}</text>${v?`<text class="lbl" x="${mx+16}" y="${my+12}">${v}</text>`:''}`}
function Res(x1,y1,x2,y2,n,v){const {L,ux,uy}=dv(x1,y1,x2,y2),s=(L-36)/2,px=-uy,py=ux,p=[[x1,y1],[x1+ux*s,y1+uy*s]];
  for(let k=0;k<6;k++){const t=s+3+k*6,a=(k%2?-1:1)*7;p.push([x1+ux*t+px*a,y1+uy*t+py*a])}p.push([x1+ux*(L-s),y1+uy*(L-s)],[x2,y2]);return wire(...p)+lbl(x1,y1,x2,y2,n,v)}
function Cap(x1,y1,x2,y2,n,v){const {L,ux,uy}=dv(x1,y1,x2,y2),m=L/2,px=-uy,py=ux,a=[x1+ux*(m-4),y1+uy*(m-4)],b=[x1+ux*(m+4),y1+uy*(m+4)];
  return wire([x1,y1],a)+wire(b,[x2,y2])+wire([a[0]+px*12,a[1]+py*12],[a[0]-px*12,a[1]-py*12])+wire([b[0]+px*12,b[1]+py*12],[b[0]-px*12,b[1]-py*12])+lbl(x1,y1,x2,y2,n,v)}
function Ind(x1,y1,x2,y2,n,v){const {L,ux,uy}=dv(x1,y1,x2,y2),s=(L-40)/2,px=-uy,py=ux;let d=`M${x1} ${y1}L${x1+ux*s} ${y1+uy*s}`;
  for(let k=0;k<4;k++){const t0=s+k*10,t1=t0+10,cx_=x1+ux*(t0+5)+px*12,cy_=y1+uy*(t0+5)+py*12;d+=`Q${cx_} ${cy_} ${x1+ux*t1} ${y1+uy*t1}`}
  d+=`L${x2} ${y2}`;return `<path class="w" d="${d}"/>`+lbl(x1,y1,x2,y2,n,v)}
function Dio(x1,y1,x2,y2,n){const {L,ux,uy}=dv(x1,y1,x2,y2),m=L/2,px=-uy,py=ux,b=[x1+ux*(m-7),y1+uy*(m-7)],t=[x1+ux*(m+7),y1+uy*(m+7)];
  return wire([x1,y1],b)+wire(t,[x2,y2])+`<polygon class="w" style="fill:var(--wire)" points="${pts([[b[0]+px*8,b[1]+py*8],[b[0]-px*8,b[1]-py*8],t])}"/>`+wire([t[0]+px*8,t[1]+py*8],[t[0]-px*8,t[1]-py*8])+(n?lbl(x1,y1,x2,y2,n):'')}
const Gnd=(x,y)=>wire([x,y],[x,y+8])+wire([x-10,y+8],[x+10,y+8])+wire([x-6,y+12],[x+6,y+12])+wire([x-2,y+16],[x+2,y+16]);
const Term=(x,y,n,dx=0,dy=-10,an='middle')=>`<circle class="term" cx="${x}" cy="${y}" r="4"/>${n?`<text x="${x+dx}" y="${y+dy}" text-anchor="${an}">${n}</text>`:''}`;
const Dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" style="fill:var(--wire)"/>`;
const Probe=(x,y,ch,dx,dy)=>`<line x1="${x}" y1="${y}" x2="${x+dx}" y2="${y+dy}" style="stroke:${ch===1?'var(--ch1)':'var(--ch2)'};stroke-width:2"/><rect class="probe${ch}" x="${x+dx-19}" y="${y+dy-9}" width="38" height="18" rx="4"/><text x="${x+dx}" y="${y+dy+4}" text-anchor="middle" style="fill:#111;font-weight:600;font-size:11px">CH${ch}</text>`;
function Src(x,y,top,bot,lab='FG'){return `<circle cx="${x}" cy="${y}" r="16" class="w"/><path class="w" d="M${x-9} ${y}q4.5 -10 9 0t9 0"/>`+wire([x,y-16],[x,top])+wire([x,y+16],[x,bot])+`<text x="${x-22}" y="${y+4}" text-anchor="end">${lab}</text>`}
function DCsrc(x,y,top,bot,lab){return wire([x,top],[x,y-6])+wire([x-14,y-6],[x+14,y-6])+wire([x-8,y+2],[x+8,y+2])+wire([x,y+2],[x,bot])+`<text x="${x-20}" y="${y}" text-anchor="end">${lab}</text>`}
function Jmp(id,a,b,label,bow){const b_=curB(),on=!!b_[id],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,{ux,uy}=dv(a[0],a[1],b[0],b[1]),qx=mx-uy*bow,qy=my+ux*bow,d=`M${a[0]} ${a[1]}Q${qx} ${qy} ${b[0]} ${b[1]}`;
  return `<g class="jmp${on?' on':''}" data-j="${id}" role="button" tabindex="0" aria-pressed="${on}" aria-label="Jumper ${label}"><path class="hit" d="${d}"/><path class="jl" d="${d}"/><text x="${(mx+qx)/2}" y="${(my+qy)/2-4}" text-anchor="middle">${label}</text></g>`}
const OpAmp=(x,y)=>`<polygon class="w" points="${x},${y-32} ${x},${y+32} ${x+62},${y}"/><text x="${x+6}" y="${y-11}" style="font-size:15px">−</text><text x="${x+6}" y="${y+21}" style="font-size:15px">+</text><text x="${x+20}" y="${y+4}" class="lbl">741</text><text x="${x+8}" y="${y-38}" class="lbl">7: +12 V</text><text x="${x+8}" y="${y+48}" class="lbl">4: −12 V</text>`;
const sv=(w,h,s)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Circuit schematic">${s}</svg>`;
const fv=(v,u)=>eng(v,u).replace(' ',' ');

const SCH={
  div(b){return sv(620,250,Src(50,150,80,215)+wire([50,80],[100,80])+Term(100,80,'T1',-10,22)+Cap(100,80,180,80,'Co',fv(b.Co,'F'))+Term(180,80,'T2/T3',0,22)+Res(180,80,320,80,'R1',fv(b.R1,'Ω'))+Term(320,80,'T4',14,22,'start')+
    Res(320,80,320,215,'R2',fv(b.R2,'Ω'))+Res(430,80,430,215,'R3',fv(b.R3,'Ω'))+Term(430,80,'T7',14,-6,'start')+Res(540,80,540,215,'R4',fv(b.R4,'Ω'))+Term(540,80,'T6',14,-6,'start')+wire([50,215],[540,215])+Gnd(290,215)+
    Jmp('j74',[320,80],[430,80],'T7–T4',-34)+Jmp('j64',[320,80],[540,80],'T6–T4',-92)+Probe(100,80,1,0,-40)+Probe(320,80,2,-40,40)+`<text x="50" y="242" class="lbl">GROUND</text>`)},
  net(b,c){const k=c.kind,ser=k==='rc'?Res:Cap,sh=k==='rc'?Cap:k==='rl'?Ind:Res,sv1=k==='rc'?fv(b.R,'Ω'):fv(b.C,'F'),sv2=k==='rc'?fv(b.C,'F'):k==='rl'?fv(b.L,'H'):fv(b.R,'Ω');
    const sn=k==='rc'?'R':'C',hn=k==='rc'?'C':k==='rl'?'L':'R',T=({rc:['T23','T24'],cr4:['T25','T26'],cr5:['T27','T28'],rl:['T21','T22']})[c.id].concat(['','']);
    return sv(560,240,Src(50,145,80,205)+wire([50,80],[110,80])+Term(110,80,T[0]||'V_in',0,-12)+ser(110,80,270,80,sn,sv1)+Term(270,80,T[1],0,22)+wire([270,80],[370,80])+Dot(370,80)+sh(370,80,370,205,hn,sv2)+(T[2]?`<text x="380" y="98" class="lbl">${T[2]}–${T[3]}</text>`:'')+
      wire([370,80],[470,80])+Term(470,80,'V_out',0,-12)+wire([50,205],[470,205])+Term(470,205,'',0,0)+Gnd(250,205)+Probe(110,80,1,-30,-40)+Probe(470,80,2,40,30)+`<text x="16" y="232" class="lbl">Fig (${c.fig})  ${k==='rl'?'L = 2.2 mH on the board':''}</text>`)},
  ce(b){const q=[360,150];return sv(660,345,
    wire([300,40],[600,40])+`<text x="604" y="44">+12 V</text>`+Res(300,40,300,150,'R1',fv(b.R1,'Ω'))+Res(300,150,300,300,'R2',fv(b.R2,'Ω'))+Res(368,40,368,120,'R_C',fv(b.Rc,'Ω'))+
    Src(40,225,150,300)+wire([40,150],[70,150])+Term(70,150,'V_IN',-6,26,'end')+Res(70,150,160,150,'R_x',fv(b.Rx,'Ω'))+Term(70,150,'')+Term(160,150,'1′',0,22)+`<text x="76" y="174" class="lbl">1</text>`+Cap(160,150,250,150,'C_c',fv(b.Cc,'F'))+wire([250,150],[334,150])+Dot(300,150)+`<text x="306" y="168" class="lbl">V_B</text>`+
    `<circle cx="${q[0]}" cy="${q[1]}" r="21" class="w"/>`+wire([342,138],[342,162])+wire([342,144],[368,128],[368,120])+wire([342,156],[368,172],[368,190])+`<polygon points="368,172 357,171 363,163" style="fill:var(--wire)"/>`+`<text x="388" y="154" class="lbl">BC547</text>`+
    wire([368,120],[368,110],[430,110])+Dot(368,110)+`<text x="392" y="126" class="lbl">V_C</text>`+Cap(430,110,500,110,'C_c',fv(b.Cc,'F'))+wire([500,110],[520,110])+Term(520,110,'3',0,24)+Term(590,110,'3′',14,-6,'start')+Res(590,110,590,300,'R_L',fv(b.RL,'Ω'))+
    Res(368,190,368,245,'R_E1',fv(b.RE1,'Ω'))+`<text x="340" y="194" class="lbl" text-anchor="end">E · V_E</text>`+Term(368,245,'2′',-12,4,'end')+Res(368,245,368,300,'R_E2',fv(b.RE2,'Ω'))+Term(460,245,'2',0,-10)+Cap(460,245,460,300,'C_E',fv(b.CE,'F'))+
    wire([40,300],[590,300])+Gnd(200,300)+`<text x="40" y="335" class="lbl">GROUND · supply ${b.pwr?'connected':'NOT connected'}</text>`+
    Jmp('j11',[70,150],[160,150],'1–1′',34)+Jmp('j22',[368,245],[460,245],'2–2′',22)+Jmp('j2E',[368,190],[460,245],'2–E',-38)+Jmp('j33',[520,110],[590,110],'3–3′',-28)+
    Probe(70,150,1,-22,-42)+Probe(520,110,2,-6,-48))},
  oa(b,c){const cfg=c.cfg,X=300,Y=140,inT=[X,Y-16],nonT=[X,Y+16],out=[X+62,Y];let s=OpAmp(X,Y);
    const srcLab=b.src==='fg'?'FG':b.src+' tap';
    const source=(x,y)=>b.src==='fg'?Src(40,y+70,y,230,'FG'):DCsrc(40,y+60,y,230,srcLab);
    s+=wire(out,[470,Y])+Term(470,Y,'V_out',0,-12)+Dot(420,Y)+Probe(470,Y,2,40,32);
    if(cfg==='inv'||cfg==='int'||cfg==='dif'){
      s+=source(40,Y-16)+wire([40,Y-16],[80,Y-16])+Term(80,Y-16,'V_in',0,-12)+Probe(80,Y-16,1,-6,-46);
      if(cfg==='dif')s+=Res(80,Y-16,150,Y-16,'R_i',fv(b.Ri,'Ω'))+Cap(150,Y-16,230,Y-16,'C',fv(b.C,'F'));else s+=Res(80,Y-16,230,Y-16,'R_i',fv(b.Ri,'Ω'));
      s+=wire([230,Y-16],inT)+Dot(260,Y-16)+wire(nonT,[280,Y+16],[280,230])+Gnd(280,230);
      if(cfg==='inv')s+=wire([260,Y-16],[260,60])+Res(260,60,420,60,'R_f',fv(b.Rf,'Ω'))+wire([420,60],[420,Y]);
      else{const cf=cfg==='int'?fv(b.C,'F'):'47 pF';s+=wire([260,Y-16],[260,30])+Res(260,30,420,30,'R_f',fv(b.Rf,'Ω'))+wire([420,30],[420,Y])+wire([260,78],[300,78])+Cap(300,78,380,78,'C_f',cf)+wire([380,78],[420,78])+Dot(260,78)+Dot(420,78)}
    }else if(cfg==='noninv'){
      s+=source(40,Y+16)+wire([40,Y+16],[100,Y+16])+Term(100,Y+16,'V_in',0,22)+Probe(100,Y+16,1,-6,46)+wire([100,Y+16],nonT)+wire(inT,[230,Y-16])+Dot(230,Y-16)+Res(230,Y-16,230,175,'R_i',fv(b.Ri,'Ω'))+Cap(230,175,230,230,'',' 0.47 µF')+Gnd(230,230)+
        wire([230,Y-16],[230,60])+Res(230,60,420,60,'R_f',fv(b.Rf,'Ω'))+wire([420,60],[420,Y]);
    }else if(cfg==='foll'){
      s+=source(40,Y+16)+wire([40,Y+16],[100,Y+16])+Term(100,Y+16,'V_in',0,22)+Probe(100,Y+16,1,-6,46)+wire([100,Y+16],nonT)+wire(inT,[260,Y-16],[260,70],[420,70],[420,Y]);
    }else if(cfg==='add'){
      s+=source(40,90)+wire([40,90],[80,90])+Term(80,90,'V1',0,-12)+Probe(80,90,1,-6,-42)+Res(80,90,220,90,'R',fv(10e3,'Ω'))+wire([220,90],[245,90],[245,Y-16])+
        DCsrc(130,200,170,230,b.tap2+' tap')+wire([130,170],[150,170])+Term(150,170,'V2',0,22)+Res(150,170,230,170,'R','10 kΩ')+wire([230,170],[245,170],[245,Y-16])+wire([245,Y-16],inT)+Dot(245,Y-16)+
        wire(nonT,[285,Y+16],[285,230])+Gnd(285,230)+wire([245,Y-16],[245,50],[260,50])+Res(260,50,420,50,'R_f','10 kΩ')+wire([420,50],[420,Y])}
    s+=wire([40,230],[285,230])+`<text x="16" y="262" class="lbl">Supply ${b.pwr?'±12 V connected':'NOT connected'}${b.src!=='fg'||cfg==='add'?' · divider V4 '+(b.v4==='m12'?'at −12 V':'grounded'):''}</text>`;
    return sv(600,270,s)},
  rect(b,c){const P={T1:[80,60],T2:[80,150],T3:[80,240],F:[180,60],'1':[290,60],'3':[290,240],B1:[170,128],B2:[170,172],'4':[290,128],'5':[290,172],'2':[380,60],'6':[380,150],C:[450,150],'7':[510,60],'8':[510,150],OUT:[700,60],L1:[700,170],L2:[700,250],GND:[330,300]};
    const post=(k,n,dx=0,dy=-12,an='middle')=>`<circle class="post" cx="${P[k][0]}" cy="${P[k][1]}" r="6"/><text x="${P[k][0]+dx}" y="${P[k][1]+dy}" text-anchor="${an}">${n}</text>`;
    const reg=c.reg(b),RLn=b.L1||b.L2;
    let s=`<rect x="12" y="34" width="110" height="232" rx="8" style="fill:none;stroke:var(--line)"/><text x="18" y="28" class="lbl">TRANSFORMER</text>`+
      `<path class="w" d="M40 50q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16q14 8 0 16"/>`+wire([40,50],[40,60],[80,60])+wire([40,150],[80,150])+wire([40,242],[40,240],[80,240])+`<text x="18" y="282" class="lbl">220 V AC in · ${b.Vs}-0-${b.Vs} V</text>`;
    s+=`<text x="150" y="28" class="lbl">RECTIFIER</text>`+wire(P.F,[205,60])+Dio(205,60,265,60,'D1')+wire([265,60],P['1'])+wire(P.T3,[205,240])+Dio(205,240,265,240,'D2')+wire([265,240],P['3']);
    s+=`<rect x="195" y="112" width="70" height="76" rx="6" style="fill:none;stroke:var(--wire);stroke-width:1.5"/><text x="230" y="146" text-anchor="middle" class="lbl">BRIDGE</text><text x="230" y="161" text-anchor="middle" class="lbl">D3–D6</text>`+wire(P.B1,[195,128])+wire(P.B2,[195,172])+wire([265,128],P['4'])+wire([265,172],P['5']);
    s+=`<text x="352" y="28" class="lbl">UNREGULATED DC</text>`+wire(P['2'],P['6'])+Res(380,150,380,300,'R','8.3 kΩ')+Cap(450,150,450,300,'C_f',fv(b.C,'F'));
    s+=`<text x="512" y="28" class="lbl">REGULATORS</text>`+Res(510,60,590,60,'R_z','100 Ω')+wire([590,60],[605,60])+Dio(605,100,605,60,'')+wire([605,100],[605,110])+`<text x="615" y="96" class="lbl">D_z ${b.Vz} V</text>`+
      `<rect x="545" y="132" width="58" height="36" rx="4" style="fill:none;stroke:var(--wire);stroke-width:1.5"/><text x="574" y="155" text-anchor="middle">7806</text>`+wire(P['8'],[545,150]);
    s+=Res(630,170,630,300,'','')+wire(P.L1,[630,170])+Res(670,250,670,300,'','')+wire(P.L2,[670,250])+`<text x="620" y="230" text-anchor="end" class="lbl">R_L1 820 Ω</text><text x="660" y="290" text-anchor="end" class="lbl">R_L2 1 kΩ</text>`;
    s+=wire([330,300],[670,300])+Gnd(560,300);
    s+=post('T1','T1',-14,4,'end')+post('T2','T2',-14,4,'end')+post('T3','T3',-14,4,'end')+post('F','F')+post('1','1')+post('3','3',0,22)+post('B1','B1',-12,4,'end')+post('B2','B2',-12,4,'end')+post('4','4',0,-10)+post('5','5',0,22)+post('2','2 · Unreg DC',8,-12,'start')+post('6','6',-12,4,'end')+post('C','C',14,4,'start')+post('7','7',-10,4,'end')+`<text x="500" y="84" class="lbl">Zener in</text>`+post('8','8',0,-12)+`<text x="490" y="176" class="lbl">IC in</text>`+post('OUT','Output',0,-12)+post('L1','Load 1',8,-12,'start')+post('L2','Load 2',8,-12,'start')+post('GND','GND',0,22);
    s+=`<text x="700" y="88" text-anchor="middle" class="lbl">= ${reg==='z'?'Zener out':reg==='ic'?'7806 out':reg?'?':'Unreg DC'}</text>`;
    const J=(id,a,bb,l,bow)=>Jmp(id,P[a],P[bb],l,bow);
    s+=J('T1F','T1','F','T1–F',-26)+J('T2G','T2','GND','T2–GND',45)+J('J12','1','2','1–2',-22)+J('J31','3','1','3–1',45)+J('T1B1','T1','B1','T1–B1',18)+J('T2B2','T2','B2','T2–B2',-14)+J('J5G','5','GND','5–GND',20)+J('J42','4','2','4–2',30)+J('J6C','6','C','6–C',-20)+J('JC7','C','7','C–7',-30)+J('JC8','C','8','C–8',22)+J('L1','L1','OUT','L1–Out',40)+J('L2','L2','OUT','L2–Out',72);
    const p1=b.p1==='x12'?['T1','T2']:b.p1==='x23'?['T3','T2']:['T1','T3'];
    s+=Probe(P[p1[0]][0],P[p1[0]][1],1,-48,p1[0]==='T3'?30:-28)+Probe(P.OUT[0],P.OUT[1],2,0,-38);
    return sv(800,330,s)}};

/* ================= board panel ================= */
const PRE={div:['sine',20e3,6],rc:['sine',1e3,1.2],cr4:['sine',1e3,1.2],cr5:['sine',10e3,1.2],rl:['sine',50e3,1.2],ce:['sine',4e3,0.1],inv:['sine',1e3,1],noninv:['sine',10e3,1],foll:['sine',1e3,1],add:['sine',1e3,1.5],int:['sine',50,1],dif:['square',1e3,0.2]};
function parseEng(s){const m=String(s).trim().replace(/\s/g,'').match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)([pnuµmkM]?)/i);if(!m)return NaN;const k={p:1e-12,n:1e-9,u:1e-6,'µ':1e-6,m:1e-3,k:1e3,K:1e3,M:1e6}[m[2]]||1;return parseFloat(m[1])*k}
const fin=v=>eng(v,'',3).replace(' ','');
function sel(id,label,opts,val){return `<label class="field">${label}<select id="${id}">${opts.map(o=>`<option value="${o[0]}"${String(o[0])===String(val)?' selected':''}>${o[1]}</option>`).join('')}</select></label>`}
function renderNav(){$('#exps').innerHTML=EXPS.map(e=>`<button class="chip" data-exp="${e.id}" aria-pressed="${S.exp===e.id}">${e.name}</button>`).join('');
  $$('[data-exp]').forEach(b=>b.onclick=()=>{S.exp=b.dataset.exp;applyPreset(false);renderNav();renderBoard()})}
function renderCircuit(){const c=cur(),b=curB();$('#schemWrap').innerHTML=c.id==='div'?SCH.div(b):c.kind?SCH.net(b,c):c.id==='ce'?SCH.ce(b):c.id==='rect'?SCH.rect(b,c):SCH.oa(b,c);
  $$('#schemWrap .jmp').forEach(g=>{const t=()=>toggleJ(g.dataset.j);g.addEventListener('click',t);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();t()}})})}
function toggleJ(id){BV.view='board';BV.msg='Leads are plugged on the Board view: click one socket, then the other.';BV.warn=false;renderSchem()}
function changed(){dirty=true;renderSchem();renderCtrlState();renderTheory();showHints()}
function renderCtrlState(){const b=curB();$$('#ctrls [data-jc]').forEach(x=>x.setAttribute('aria-pressed',!!b[x.dataset.jc]))}
function renderBoard(){
  const e=EXPS.find(x=>x.id===S.exp),c=cur(),b=curB();
  $('#bTitle').textContent=e.title;$('#bSub').textContent='CH1 → '+c.probes.ch1+' · CH2 → '+c.probes.ch2;
  $('#circTabs').innerHTML=e.circ.length>1?e.circ.map(id=>`<button class="tab" data-c="${id}" aria-pressed="${S.circ[S.exp]===id}">${CIRC[id].name}</button>`).join(''):'';
  $$('[data-c]').forEach(t=>t.onclick=()=>{S.circ[S.exp]=t.dataset.c;applyPreset(false);renderBoard()});
  let h='';
  for(const [k,u] of c.params)h+=`<label class="field">${k.replace(/^R(\w)/,'R$1')}${u?' ('+u+')':''}<input id="p_${k}" value="${u?fin(b[k]):b[k]}" inputmode="decimal" spellcheck="false"></label>`;
  if(PRE[c.id])h+=`<div class="field">Generator<div class="jrow"><button class="jchip" id="usePre">Apply manual settings + Autoset</button></div></div>`;
  $('#ctrls').innerHTML=h;
  $$('#ctrls [data-jc]').forEach(x=>x.onclick=()=>toggleJ(x.dataset.jc));
  $$('#ctrls [data-rp]').forEach(x=>x.onclick=()=>{const p=x.dataset.rp;RJ.forEach(j=>{if(!['J6C','JC7','JC8','L1','L2'].includes(j[0])||p==='clr')b[j[0]]=false});
    if(p==='hw')Object.assign(b,{T1F:true,T2G:true,J12:true});if(p==='ct')Object.assign(b,{T1F:true,T2G:true,J31:true,J12:true});if(p==='br')Object.assign(b,{T1B1:true,T2B2:true,J5G:true,J42:true});changed()});
  $$('#ctrls select').forEach(s=>s.onchange=()=>{const v=s.value;b[s.id]=isNaN(+v)?v:+v;changed()});
  $$('#ctrls input').forEach(i=>i.onchange=()=>{const k=i.id.slice(2),v=parseEng(i.value);if(isFinite(v)&&v>0){b[k]=v;changed()}i.value=c.params.find(p=>p[0]===k)[1]?fin(b[k]):b[k]});
  const up=$('#usePre');if(up)up.onclick=()=>applyPreset(true);
  $('#procList').innerHTML=c.proc.map(p=>`<li>${p}</li>`).join('');
  renderSchem();renderTheory();renderLog();showHints();dirty=true;hashSet()}
function renderTheory(){const c=cur(),rows=c.theory(curB());$('#theory').innerHTML=rows.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b><span>${r[2]||''}</span></div>`).join('');$('#theoryNote').textContent=c.note||'Component values are editable; set them to the values printed on your board. Small-signal source resistance of the generator (50 Ω) is included.'}
function applyPreset(force){const c=cur(),p=PRE[c.id];if(!p||!force)return;const f=S.fg;f.wave=p[0];f.freq=p[1];f.amp=p[2];f.off=0;f.load='hz';f.on=true;f.menu='main';f.entry=null;f.msg='Set for '+c.name+' from the manual';
  S.sc.ch.forEach(ch=>{ch.on=true;ch.probe=1;ch.cpl='DC'});fgRender();autoset()}
function showHints(){const c=cur(),b=curB(),H=[];if(!c)return;
  const usesFG=c.src!=='mains'&&!(c.cfg&&b.src!=='fg');
  if(usesFG&&!S.fg.on)H.push('Generator output is off. Press <b>CH1 On/Off</b> on the AFG1022.');
  if(usesFG&&S.fg.on&&S.fg.load==='50')H.push('Generator Load is set to 50 Ω, but the board is high impedance, so the real output is <b>twice</b> the amplitude on its screen. Utility › Setup › CH1 Load › High Z.');
  S.sc.ch.forEach((ch,i)=>{if(ch.on&&ch.probe===10)H.push(`CH${i+1} probe attenuation is 10X, but the lab BNC lead is 1X, so CH${i+1} reads 10× too high. CH${i+1} Menu › Probe → 1X.`)});
  if('pwr' in b&&!b.pwr)H.push('The board has no DC supply. Connect the power (and GROUND) first.');
  let st='';
  if(c.id==='rect'){const m=c.mode(b),r=c.reg(b);if(m.err)H.push(m.err);
    if(r==='both')H.push('C–7 and C–8 are both joined. Use one regulator at a time.');else if(r&&!b.J6C)H.push('The regulator input is the filter capacitor terminal C. Join 6–C as well.');
    if(m.m)st=`${{hw:'Half-wave',ct:'Full-wave (centre-tap)',br:'Bridge'}[m.m]} rectifier · filter ${b.J6C?'on':'off'} · output from ${r==='z'?'Zener regulator':r==='ic'?'IC 7806':'Unregulated DC'} · load ${b.L1&&b.L2?'R_L1 ‖ R_L2 (full load)':b.L1?'R_L1':b.L2?'R_L2':'none (no load)'}`}
  if(c.id==='ce')st=`R_x ${b.j11?'shorted (1–1′)':'in circuit'} · C_E ${b.j2E?'across R_E1+R_E2 (2–E)':b.j22?'across R_E2 (2–2′)':'removed'} · load ${b.j33?'connected (3–3′)':'open'}`;
  if(c.id==='div'){const rl=c.RL(b);st='Load: '+(isFinite(rl)?eng(rl,'Ω'):'none (R_L = ∞)')}
  $('#hintBox').innerHTML=(st?`<div class="status ${H.length?'':'good'}">${st}</div>`:'')+H.map(h=>`<div class="hint">${h}</div>`).join('')}
