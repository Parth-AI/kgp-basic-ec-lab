/* KGP Lab Bench · Manual wiring: leads, nets, what the student has built, probe signals */
/* ================= manual wiring: every lead is placed by the student ================= */
const WIRES={e2:[],e3:[],e4:[],e5:[]};
try{const w=JSON.parse(localStorage.getItem('kgpbench.wires2')||'null');if(w&&typeof w==='object')for(const k in WIRES)if(Array.isArray(w[k]))WIRES[k]=w[k].filter(p=>Array.isArray(p)&&p.length===2&&p.every(x=>typeof x==='string'))}catch(e){}
const saveW=()=>{try{localStorage.setItem('kgpbench.wires2',JSON.stringify(WIRES))}catch(e){}};
BV.hints=false;try{BV.hints=localStorage.getItem('kgpbench.hints2')==='1'}catch(e){}
S.fgk=0;S.kill=[];S.need=[];S.inSock=null;S.wire=null;
const EQN={'M+':'meter red lead (VΩ)','M-':'meter black lead (COM)','FG+':'AFG red clip','FG-':'AFG black clip','C1+':'CH1 probe tip','C1-':'CH1 ground clip','C2+':'CH2 probe tip','C2-':'CH2 ground clip','DC+':'+12 V supply lead','DC-':'−12 V supply lead','DCG':'supply GROUND lead'};
const EQS={'M+':'VΩ','M-':'COM','FG+':'HI','FG-':'LO','C1+':'tip','C1-':'gnd','C2+':'tip','C2-':'gnd','DC+':'+12','DC-':'−12','DCG':'GND'};
const isEq=id=>id in EQN;
const GRD={e2:'GL',e3:'G1',e4:'GL',e5:'GL'};
const pname=id=>isEq(id)?EQN[id]:sname(id);
function buildSP(){const c=cur(),b=curB();return c.exp==='e2'?sp2(c,b):c.id==='rect'?sp3(c,b):c.id==='ce'?sp4(c,b):sp5(c,b)}
function groups(){const e=S.exp;return e==='e2'?{GND:['GL','GR']}:e==='e3'?SP.G:e==='e4'?SP.G:{GND:['GL','GT','GR'],P2:['A2','B2'],P3:['A3','B3']}}
function eqLayout(){const e=S.exp,{w,u}=SP,C1=getComputedStyle(document.documentElement).getPropertyValue('--ch1').trim()||'#f3d417',C2=getComputedStyle(document.documentElement).getPropertyValue('--ch2').trim()||'#2fc4ea';
  const T=[],J={},y=-84*u,jy=-34*u;
  const put=(cx,text,fill,ink,ids)=>{T.push([cx,y,text,fill,ink]);ids.forEach(([id,col],i)=>{J[id]=[cx+(i-(ids.length-1)/2)*62*u,jy,col]})};
  const X=e==='e3'?[0,.3,.5,.72]:e==='e2'?[.1,.32,.52,.76]:[.08,.27,.45,.63,.85];
  if(e!=='e3')put(w*X[0],'AFG1022 CH1','#1f4e8c','#fff',[['FG+','#d8261f'],['FG-','#1b1b1b']]);
  put(w*X[1],'CH1 probe',C1,'#111',[['C1+',C1],['C1-','#1b1b1b']]);
  put(w*X[2],'CH2 probe',C2,'#111',[['C2+',C2],['C2-','#1b1b1b']]);
  put(w*X[3],'MULTIMETER','#e0a500','#111',[['M+','#d8261f'],['M-','#1b1b1b']]);
  if(e==='e4')put(w*X[4],'DC SUPPLY','#3a434a','#fff',[['DC+','#d8261f'],['DCG','#1b1b1b']]);
  if(e==='e5')put(w*X[4],'DC SUPPLY','#3a434a','#fff',[['DC+','#d8261f'],['DC-','#2b6fd6'],['DCG','#1b1b1b']]);
  return {T,J}}
let EQ={T:[],J:{}};
const ptOf=id=>isEq(id)?EQ.J[id]:SP.S[id];

function nets(){const par={},f=x=>{while(par[x]!==x)x=par[x];return x},un=(a,b)=>{a=f(a);b=f(b);if(a!==b)par[a]=b};
  Object.keys(SP.S).concat(Object.keys(EQN)).forEach(k=>par[k]=k);
  for(const g of Object.values(groups()||{}))for(let i=1;i<g.length;i++)if(g[i] in par&&g[0] in par)un(g[0],g[i]);
  for(const [a,b] of WIRES[S.exp])if(a in par&&b in par)un(a,b);
  return x=>x in par?f(x):x}

/* work out from the leads what the student has built */
function derive(auto){const e=S.exp;SP=buildSP();EQ=eqLayout();const F=nets(),same=(a,b)=>F(a)===F(b),gnd=a=>same(a,GRD[e]),has=t=>WIRES[e].some(w=>w.includes(t));
  S.wire={same,gnd,has};S.kill=[];S.fgk=0;S.inSock=null;const need=[];let switched=null;
  const fgOn=s=>has('FG+')&&has('FG-')?(same('FG+',s)&&gnd('FG-')?1:same('FG-',s)&&gnd('FG+')?-1:0):0;
  const probe=(ch,s)=>need.push([same(ch,s),`${EQN[ch]} on ${sname(s)}`]);
  if(e==='e2'){const IN={div:'T1',rc:'T23',cr4:'T25',cr5:'T27',rl:'T21'};
    if(auto)for(const [id,s] of Object.entries(IN))if(has('FG+')&&same('FG+',s)&&S.circ.e2!==id){S.circ.e2=id;switched=CIRC[id].name;break}
    const c=cur(),b=curB(),inS=IN[c.id],out={div:'T4',rc:'T24',cr4:'T26',cr5:'T28',rl:'T22'}[c.id];S.inSock=inS;
    S.fgk=fgOn(inS);need.push([S.fgk===1,`AFG red clip on ${inS} and black clip on GROUND`]);
    if(c.id==='div'){b.j74=same('T7','T4');b.j64=same('T6','T4');const ok=same('T2','T3');if(!ok)S.kill=['vl','v2'];need.push([ok,'patch lead T2 – T3 (feeds the divider R1, R2 through Co)'])}
    probe('C1+',inS);probe('C2+',out)}
  if(e==='e3'){const b=S.b.rect;
    for(const [id,[p,q]] of Object.entries(SP.J))b[id]=id==='L1'||id==='L2'?['UR1','ZO','ICO'].some(o=>same(id==='L1'?'L1a':'L2',o)):same(p,q);
    const m=CIRC.rect.mode(b);need.push([!!m.m,m.err||'a rectifier']);
    if(same('C1+','T3')&&same('C1-','T2'))b.p1='x23';else if(same('C1+','T1')&&same('C1-','T3'))b.p1='x13';else b.p1='x12';
    probe('C1+','T1');probe('C2+',SP.out)}
  if(e==='e4'){const b=S.b.ce;b.j11=same('IN','S1p');b.j22=same('E2','S2');b.j2E=same('E','S2');b.j33=same('OUT','RLS');
    b.pwr=same('DC+','P12')&&gnd('DCG');S.fgk=fgOn('IN');if(!S.fgk&&fgOn('S1p')){S.fgk=fgOn('S1p');b.j11=true}S.inSock='IN';
    need.push([S.fgk===1,'AFG red clip on INPUT and black clip on GROUND'],[b.pwr,'+12 V lead on +12VOLT and supply GROUND lead on GROUND']);probe('C1+','IN');probe('C2+','OUT')}
  if(e==='e5'){const c=cur(),b=curB(),cfg=c.cfg,P2='A2',P3='A3',SIX='S6';
    b.pwr=same('DC+','P12')&&same('DC-','M12')&&gnd('DCG');need.push([b.pwr,'+12 V on +12V, −12 V on −12V and supply GROUND on GROUND']);
    const srcAt=s=>{if(!s)return null;if(has('FG+')&&same('FG+',s))return fgOn(s)?'fg':null;for(const t of ['V1','V2','V3'])if(same(s,t))return t;return null};
    const fx=['F3','F4','F5','F6'].find(f=>same(f,SIX)),RF={F3:10e3,F4:27e3,F5:47e3,F6:100e3};
    const ri=same('I8',P2)?['I7','I8',1e3]:same('I2',P2)?['I1','I2',10e3]:null;let inS=null;const N=(ok,t)=>need.push([!!ok,t]);
    if(cfg==='inv'){if(ri){b.Ri=ri[2];inS=ri[0]}if(fx)b.Rf=RF[fx];N(ri,'an input resistor (I1–I2 or I7–I8) to pin 2');N(same('F0',P2),'F0 to pin 2');N(fx,'a feedback socket F3–F6 to pin 6');N(gnd(P3),'pin 3 to GROUND')}
    if(cfg==='noninv'){inS=P3;if(ri)b.Ri=ri[2];if(fx)b.Rf=RF[fx];N(ri,'an input resistor (I1–I2 or I7–I8) to pin 2');N(ri&&((same(ri[0],'I4')&&gnd('I3'))||(same(ri[0],'I3')&&gnd('I4'))),'the free end of that resistor through C11 (I3–I4) to GROUND');N(same('F0',P2),'F0 to pin 2');N(fx,'a feedback socket F3–F6 to pin 6')}
    if(cfg==='foll'){inS=P3;N(same(P2,SIX),'pin 2 to pin 6')}
    if(cfg==='add'){inS='I1';const t2=['V1','V2','V3'].find(t=>same(t,'I5'));if(t2)b.tap2=t2;N(t2,'a divider tap to I5 (second input)');N(same('I2',P2),'I2 to pin 2');N(same('I6',P2),'I6 to pin 2');N(same('F0',P2),'F0 to pin 2');N(same('F3',SIX),'F3 (10 kΩ) to pin 6');N(gnd(P3),'pin 3 to GROUND')}
    if(cfg==='int'){inS='I7';N(same('I8',P2),'I8 to pin 2');N(same('F0',P2),'F0 to pin 2');N(same('F6',SIX),'F6 (100 kΩ) to pin 6');N(same('F2',SIX),'F2 (0.47 µF) to pin 6');N(gnd(P3),'pin 3 to GROUND')}
    if(cfg==='dif'){inS='I7';N(same('I8','I9'),'I8 to I9 (1 kΩ in series with 0.01 µF)');N(same('I10',P2),'I10 to pin 2');N(same('F0',P2),'F0 to pin 2');N(same('F6',SIX),'F6 (100 kΩ) to pin 6');N(same('F1',SIX),'F1 (47 pF) to pin 6');N(gnd(P3),'pin 3 to GROUND')}
    const src=srcAt(inS);S.inSock=inS;b.src=src||'fg';S.fgk=src==='fg'?fgOn(inS):0;
    N(src,`a signal into ${inS?sname(inS):'the input'} (AFG red clip with black on GROUND, or a divider tap)`);
    if(src&&src!=='fg'||cfg==='add'){b.v4=same('V4','M12')?'m12':'gnd';N(same('V4','M12')||gnd('V4'),'divider V4 to GROUND or −12 V')}
    const ok=need.slice(1).every(n=>n[0]);if(!ok)S.kill=['vout','vm'];
    probe('C1+',inS||P3);probe('C2+',SIX)}
  S.need=need;return switched}

/* what each probe sees */
function nodeOf(s){const e=S.exp,c=cur(),b=curB(),W=S.wire;
  if(e==='e2'){if(c.id==='div'){const k=W.same('T2','T3');return {T1:'vin',T2:k?'v2':'vin',T3:k?'v2':null,T4:k?'vl':null}[s]??null}
    const io={rc:['T23','T24'],cr4:['T25','T26'],cr5:['T27','T28'],rl:['T21','T22']}[c.id];return s===io[0]?'vin':s===io[1]?'vout':null}
  if(e==='e3'){const r=c.reg(b);return {T1:'t1',T2:'t2',T3:'t3',S2:'unreg',S6:'unreg',UR1:'unreg',UR2:'unreg',ZO:r==='z'?'out':null,ICO:r==='ic'?'out':null}[s]??null}
  if(e==='e4')return {IN:'vin',S1p:'vs1',VB:'vb',VB2:'vb',E:'ve',E2:'ve2',OUT:'vout',P12:b.pwr?12:null,TPC:'vc'}[s]??null;
  const t=taps(b.v4);if(s===S.inSock)return 'vin';if(c.cfg==='add'&&s==='I5')return 'v2';
  return {S6:'vout',A2:'vm',B2:'vm',V1:b.pwr?t.V1[0]:null,V2:b.pwr?t.V2[0]:null,V3:b.pwr?t.V3[0]:null,V4:b.pwr?(b.v4==='m12'?-12:null):null,P12:b.pwr?12:null,M12:b.pwr?-12:null}[s]??null}
function netVal(p){const W=S.wire;if(!W||!W.has(p))return null;if(W.gnd(p))return 0;
  for(const s of Object.keys(SP.S))if(W.same(s,p)){const v=nodeOf(s);if(v!=null)return v}return null}
function probeSig(nodes,i,M){const tip=i?'C2+':'C1+',clip=i?'C2-':'C1-',arr=v=>v==null?new Float64Array(M):typeof v==='number'?konst(M,v):(nodes[v]||new Float64Array(M));
  let y=arr(netVal(tip));if(S.wire&&S.wire.has(clip)&&S.wire.has(tip))y=add(y,arr(netVal(clip)),-1);return y}

/* expected connections, used for the optional hints */
function expected(){const e=S.exp,c=cur(),L=[];
  if(e==='e2'){const io={div:['T1','T4','GL'],rc:['T23','T24','GR'],cr4:['T25','T26','GR'],cr5:['T27','T28','GR'],rl:['T21','T22','GR']}[c.id];
    L.push(['FG+',io[0]],['FG-',io[2]],['C1+',io[0]],['C2+',io[1]]);if(c.id==='div')L.push(['T2','T3'],['T7','T4','R_L = R3'],['T6','T4','R_L = R4'])}
  if(e==='e3'){L.push(['C1+','T1'],['C1-','T2'],['C2+',SP.out],['C2-','G3']);const jl=Object.fromEntries(c.jumpers.map(j=>[j[0],j[1]]));for(const [id,[p,q]] of Object.entries(SP.J))L.push([p,q==='OUT'?SP.out:q,jl[id]])}
  if(e==='e4'){L.push(['FG+','IN'],['FG-','GL'],['DC+','P12'],['DCG','GTR'],['C1+','IN'],['C2+','OUT']);const jl=Object.fromEntries(c.jumpers.map(j=>[j[0],j[1]]));for(const [id,[p,q]] of Object.entries(SP.J))L.push([p,q,jl[id]])}
  if(e==='e5'){const b=curB();for(const [p,q] of SP.auto)L.push([p,q]);L.push(['DC+','P12'],['DC-','M12'],['DCG','GL'],['C2+','S6']);
    const Ri=(b.Ri===1e3||c.cfg==='int'||c.cfg==='dif')?'I7':'I1',inS=c.cfg==='noninv'||c.cfg==='foll'?'B3':Ri;
    if(b.src==='fg')L.push(['FG+',inS],['FG-','GR'],['C1+',inS]);else L.push(['C1+',inS])}
  return L}

/* ----- drawing ----- */
const PATCH=['#d8261f','#f2c419','#2b6fd6','#e9e9e9','#8a4fd0','#e57a1f'];
function boardSVG(){const {w,h,u,r}=SP,m=120*u,W=S.wire;
  let s=pcbBase(w,h,u)+SP.art,so='',hint='',leads='',eq='',jacks='';
  for(const [id,[x,y,col,lab,dx,dy,an]] of Object.entries(SP.S)){if(lab)s+=silk(x+(dx??0),y+(dy??-46),lab,u,{a:an||'middle'});so+=sk(id,x,y,col,r,sname(id))}
  if(SP.mn)for(const [id,[t,dx,dy,an]] of Object.entries(SP.mn)){const [x,y]=SP.S[id];s+=silk(x+dx,y+dy,t,u,{a:an,c:'mn',s:22})}
  let mainsT='';if(SP.mains){const on=S.mainsOn!==false,M1=SP.mains[1];eq+=on?cord(SP.mains[0],M1,'#3a3a3a',u,{noA:true,noB:true,sag:0,w:11}):cord(SP.mains[0],[SP.mains[0][0]-60*u,SP.mains[0][1]+60*u],'#3a3a3a',u,{noA:true,sag:10,w:11});mainsT=`<g class="mainsT" role="button" tabindex="0" aria-label="${on?'Unplug':'Plug in'} the mains">${tag(M1[0],M1[1],on?'220 V AC':'unplugged',on?'#3a434a':'#8a4b2a','#fff',u)}</g>`}
  for(const [x,y,t,f,ink] of EQ.T)eq+=tag(x,y,t,f,ink,u);
  for(const [id,[x,y,col]] of Object.entries(EQ.J))jacks+=`<g class="sock jack${BV.sel===id?' sel':''}" data-s="${id}" tabindex="0" role="button" aria-label="${EQN[id]}${W.has(id)?'':', not connected'}"><circle class="ring" cx="${x}" cy="${y}" r="${22*u}" fill="none" stroke-width="${5*u}"/><circle cx="${x}" cy="${y}" r="${14*u}" fill="${col}" stroke="rgba(0,0,0,.6)" stroke-width="${3*u}"/><circle cx="${x}" cy="${y}" r="${5*u}" fill="#d9dcdf"/></g>${silk(x,y+(W.has(id)?-22:36)*u,EQS[id],u,{s:15,c:'eqt'})}`;
  if(BV.hints)for(const [a,b,lab] of expected()){if(W.same(a,b))continue;const A=ptOf(a),B=ptOf(b);if(!A||!B)continue;const q=curve(A,B,u,{sag:isEq(a)?30:undefined});
    hint+=`<g class="hintw"><path class="hp" d="${q.d}" fill="none" stroke-width="${3*u}" stroke-dasharray="${10*u} ${8*u}"/>${lab?silk(q.m[0],q.m[1]-6*u,lab,u,{s:16,c:'jt'}):''}</g>`}
  let k=0;WIRES[S.exp].forEach(([a,b],i)=>{const A=ptOf(a),B=ptOf(b);if(!A||!B)return;const eqEnd=isEq(a)?a:isEq(b)?b:null;
    const col=eqEnd?EQ.J[eqEnd][2]:(W.gnd(a)||W.gnd(b))?'#1b1b1b':PATCH[k++%PATCH.length];
    const o=eqEnd?{sag:30,w:eqEnd[0]==='C'?6:8,noA:true}:{};const P=eqEnd===a?[A,B]:eqEnd===b?[B,A]:[A,B];
    const cq=curve(P[0],P[1],u,o).c,qa=P[0],qb=P[1],at=s=>[(1-s)*(1-s)*qa[0]+2*(1-s)*s*cq[0]+s*s*qb[0],(1-s)*(1-s)*qa[1]+2*(1-s)*s*cq[1]+s*s*qb[1]],pts=Object.values(SP.S).map(q=>[q[0],q[1],r*1.45+14*u]).concat(Object.values(EQ.J).map(q=>[q[0],q[1],38*u]));let mid=at(.5);for(const s of [.5,.42,.58,.34,.66,.26,.74,.2,.8]){const q=at(s);if(!pts.some(([x,y,d])=>Math.hypot(q[0]-x,q[1]-y)<d)){mid=q;break}}leads+=`<g class="lead" data-w="${i}" role="button" tabindex="0" aria-label="Remove lead ${pname(a)} to ${pname(b)}">${cord(P[0],P[1],col,u,o)}<g class="lh"><circle cx="${mid[0]}" cy="${mid[1]}" r="${13*u}" fill="${col}" stroke="#fff" stroke-width="${3*u}"/>${ln([mid[0]-5*u,mid[1]-5*u],[mid[0]+5*u,mid[1]+5*u],col==='#1b1b1b'||col==='#2b6fd6'||col==='#8a4fd0'||col==='#d8261f'?'#fff':'#111',2.5*u)+ln([mid[0]-5*u,mid[1]+5*u],[mid[0]+5*u,mid[1]-5*u],col==='#1b1b1b'||col==='#2b6fd6'||col==='#8a4fd0'||col==='#d8261f'?'#fff':'#111',2.5*u)}</g></g>`});
  return `<svg class="pcbsvg" viewBox="${-m} ${-m} ${w+2*m} ${h+2*m}" role="img" aria-label="Trainer board">${s}${hint}${so}<g class="eq">${eq}</g>${mainsT}${jacks}${leads}</svg>`}

/* ----- interaction ----- */
function sockClick(id){
  if(!BV.sel){BV.sel=id;BV.msg=`Holding ${pname(id)}. Click where the other end goes.`;BV.warn=false;return renderSchem()}
  if(BV.sel===id){BV.sel=null;BV.msg='Put down.';BV.warn=false;return renderSchem()}
  const a=BV.sel,z=id,Wl=WIRES[S.exp];BV.sel=null;
  if(isEq(a)&&isEq(z)){BV.msg='Instrument leads go onto the board sockets, not onto each other.';BV.warn=true;return renderSchem()}
  if(isEq(a)||isEq(z)){const q=isEq(a)?a:z,s=isEq(a)?z:a;for(let i=Wl.length-1;i>=0;i--)if(Wl[i].includes(q))Wl.splice(i,1);Wl.push([q,s]);BV.msg=`${EQN[q]} on ${sname(s)}.`}
  else{if(Wl.some(w=>w.includes(a)&&w.includes(z))){BV.msg=`${sname(a)} and ${sname(z)} are already joined.`;BV.warn=true;return renderSchem()}Wl.push([a,z]);BV.msg=`Patch lead ${sname(a)} – ${sname(z)}.`}
  BV.warn=false;wiresChanged()}
function wiresChanged(){saveW();const sw=derive(true);dirty=true;if(sw){BV.msg+=` The generator is on the ${sw} now, so that tab is selected.`;renderBoard()}else{renderSchem();renderTheory();showHints()}}
function boardAct(t){if(BV.view!=='board')return false;if(t.closest('.mainsT')){S.mainsOn=S.mainsOn===false;BV.msg=S.mainsOn?'Mains plugged in. The transformer is live.':'Mains unplugged. The board is safe for resistance checks.';BV.warn=false;dirty=true;renderSchem();return true}const l=t.closest('.lead[data-w]');
  if(l){const i=+l.dataset.w,wr=WIRES[S.exp][i];if(wr){WIRES[S.exp].splice(i,1);BV.sel=null;BV.msg=`Removed ${pname(wr[0])} – ${pname(wr[1])}.`;BV.warn=false;wiresChanged()}return true}
  const s=t.closest('.sock');if(s){sockClick(s.dataset.s);return true}return false}
function checkWiring(){derive(false);const miss=S.need.filter(n=>!n[0]).map(n=>n[1]);
  BV.msg=miss.length?'Still needed: '+miss.join('; ')+'.':'Wiring is complete for '+cur().name+'. Press Autoset on the scope.';BV.warn=!!miss.length;BV.ok=!miss.length;renderSchem()}
$('#bbar').addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a)return;
  if(a.dataset.act==='check')checkWiring();
  if(a.dataset.act==='clear'){WIRES[S.exp]=[];BV.sel=null;BV.msg='All leads removed from this board.';BV.warn=false;wiresChanged()}});
$('#bbar').addEventListener('change',e=>{if(e.target.id==='hintsChk')try{localStorage.setItem('kgpbench.hints2',e.target.checked?'1':'0')}catch(_){}});
function renderSchem(){const c=cur(),bar=$('#bbar');
  if(BV.cid!==c.id){BV.cid=c.id;BV.sel=null;BV.msg='';BV.warn=false;BV.ok=false}
  derive(false);
  const wrap=$('#schemWrap');wrap.classList.toggle('pcb',BV.view==='board');
  if(BV.view==='circuit')renderCircuit();else wrap.innerHTML=boardSVG();
  const def=BV.view==='circuit'?'Circuit diagram of what you have wired. Leads are plugged on the Board view.':'Click a socket or an instrument lead end, then click where the other end goes. Click the ✕ on a lead to remove it.'+(c.id==='ce'?' Amber labels are the manual’s point names; the board does not print them.':c.exp==='e5'?' Part positions are read from the manual photo; check them against your board.':'');
  bar.innerHTML=`<div class="seg" role="group" aria-label="View"><button type="button" data-v="board" aria-pressed="${BV.view==='board'}">Board</button><button type="button" data-v="circuit" aria-pressed="${BV.view==='circuit'}">Circuit diagram</button></div>`+
    (BV.view==='board'?`<button type="button" class="sbtn" data-act="check">Check wiring</button><button type="button" class="sbtn" data-act="clear">Remove all leads</button><label><input type="checkbox" id="hintsChk"${BV.hints?' checked':''}> Show expected connections</label>`:'')+
    `<span class="bmsg${BV.warn?' warn':BV.ok&&BV.msg?' okm':''}">${BV.msg||def}</span>`;BV.ok=false}
