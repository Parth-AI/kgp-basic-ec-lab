/* KGP Lab Bench · Handheld multimeter and the graph / observation panel */
/* ================= handheld multimeter (leads placed on the board) ================= */
const MTR={mode:'off',sub:0,hold:false,last:null,beepOn:false};
const MODES=[['off','OFF',205],['vdc','V⎓',245],['vac','V~',285],['ohm','Ω ▸|',325],['cap','⊣⊢',5],['amp','A',45]];
let ACX=null;
function beep(){try{ACX=ACX||new (window.AudioContext||window.webkitAudioContext)();const o=ACX.createOscillator(),g=ACX.createGain();o.frequency.value=2700;g.gain.value=.05;o.connect(g);g.connect(ACX.destination);o.start();o.stop(ACX.currentTime+.12)}catch(e){}}
function hashTol(id,p){let h=2166136261;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return 1+((((h>>>0)%1000)/1000)-.5)*2*p}
/* passive parts on each board, by the sockets they sit between */
function parts(){const e=S.exp,B=S.b,L=[],R=(a,z,v,id)=>L.push({t:'R',a,z,v:v*hashTol(e+id,.008),id}),C=(a,z,v,id,p=.05)=>L.push({t:'C',a,z,v:v*hashTol(e+id,p),id}),D=(a,z,vf,id)=>L.push({t:'D',a,z,v:vf+(hashTol(e+id,.02)-1)*.3,id});
  if(e==='e2'){const d=B.div;R('T3','T4',d.R1,'R1');R('T4','GL',d.R2,'R2');R('T7','GL',d.R3,'R3');R('T6','GL',d.R4,'R4');C('T1','T2',d.Co,'Co');C('T5','GL',47e-6,'Cb',.15);R('T18','T19',10e3,'RA');R('T19','T20',4.7e3,'RB');
    R('T21','T22',B.rl.R,'Rl');R('T22','GR',B.rl.rL,'L');R('T23','T24',B.rc.R,'Rrc');C('T24','GR',B.rc.C,'Crc');C('T25','T26',B.cr4.C,'C4');R('T26','GR',B.cr4.R,'R4n');C('T27','T28',B.cr5.C,'C5');R('T28','GR',B.cr5.R,'R5n');
    D('T8','T9',.58,'D1');D('T10','T11',.27,'D2');D('T13','T12',.66,'Q1e');D('T13','T14',.63,'Q1c');D('T15','T16',.65,'Q2e');D('T17','T16',.62,'Q2c')}
  if(e==='e3'){const b=B.rect;R('T1','T2',3.8,'W1');R('T2','T3',3.8,'W2');D('F','S1',.6,'D1');D('T3','S3',.6,'D2');D('B1','S4',.6,'D3');D('B2','S4',.6,'D4');D('S5','B1',.6,'D5');D('S5','B2',.6,'D6');
    R('S2','G1',8.3e3,'Rb');C('C1','G1',b.C,'Cf',.12);R('S7','ZO',100,'Rz');D('G1','ZO',.7,'Dz');R('L1a','G1',b.RL1,'RL1');R('L2','G1',b.RL2,'RL2')}
  if(e==='e4'){const b=B.ce;R('IN','S1p',b.Rx,'Rx');C('S1p','VB',b.Cc,'Cc1',.12);R('P12','VB',b.R1,'R1');R('VB','GL',b.R2,'R2');R('P12','TPC',b.Rc,'Rc');D('VB','E',.66,'Qbe');D('VB','TPC',.64,'Qbc');
    R('E','E2',b.RE1,'RE1');R('E2','GL',b.RE2,'RE2');C('S2','GL',b.CE,'CE',.15);C('TPC','OUT',b.Cc,'Cc2',.12);R('RLS','GL',b.RL,'RL');C('CCB','TPC',100e-12,'Ccb')}
  if(e==='e5'){R('P12','V1',5.6e3,'RU1');R('V1','V2',3.3e3,'RU2');R('V2','V3',1.2e3,'RU3');R('V3','V4',2.2e3,'RU4');
    R('F0','F6',100e3,'RF4');R('F0','F5',47e3,'RF3');R('F0','F4',27e3,'RF2');R('F0','F3',10e3,'RF1');C('F0','F2',.47e-6,'CF1');C('F0','F1',47e-12,'CF2');R('F7','F8',100e3,'RF5');
    R('I7','I8',1e3,'R13');R('I5','I6',10e3,'R12');R('I1','I2',10e3,'R11');C('I3','I4',.47e-6,'C11');C('I9','I10',.01e-6,'C12')}
  return L}
function powered(){const W=S.wire,e=S.exp,why=[];if(!W)return why;
  if(e!=='e3'&&W.has('FG+')&&W.has('FG-')&&S.fg.on)why.push('the generator output is on and connected');
  if(e==='e4'&&(W.has('DC+')||W.has('DCG'))&&curB().pwr)why.push('the +12 V supply is connected');
  if(e==='e5'&&(W.has('DC+')||W.has('DC-')))why.push('the ±12 V supply is connected');
  if(e==='e3'&&S.mainsOn!==false)why.push('the mains is plugged in (click the 220 V AC tag to unplug)');return why}
function solveR(){const W=S.wire,F=nets();const mp=F('M+'),mm=F('M-');if(mp===mm)return 0.12;
  const el=parts().filter(p=>p.t==='R').map(p=>[F(p.a),F(p.z),p.v]);
  for(const [t,cl] of [['C1+','C1-'],['C2+','C2-']])if(W.has(t)&&W.has(cl))el.push([F(t),F(cl),1e6]);
  const ids=new Map();const idx=n=>{if(n===mm)return -1;if(!ids.has(n))ids.set(n,ids.size);return ids.get(n)};idx(mp);el.forEach(([a,z])=>{idx(a);idx(z)});
  const n=ids.size,A=Array.from({length:n},()=>new Float64Array(n+1));for(let i=0;i<n;i++)A[i][i]=1e-12;
  for(const [a,z,r] of el){const i=idx(a),j=idx(z),g=1/r;if(i>=0)A[i][i]+=g;if(j>=0)A[j][j]+=g;if(i>=0&&j>=0){A[i][j]-=g;A[j][i]-=g}}
  const ip=idx(mp);A[ip][n]=1;
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];const v=A[c][c];if(Math.abs(v)<1e-30)continue;
    for(let r=0;r<n;r++){if(r===c)continue;const k=A[r][c]/v;if(k)for(let q=c;q<=n;q++)A[r][q]-=k*A[c][q]}}
  return A[ip][n]/A[ip][ip]}
function diodeV(){const F=nets(),mp=F('M+'),mm=F('M-'),E=parts().filter(p=>p.t==='D').map(p=>[F(p.a),F(p.z),p.v]);let best=Infinity;
  const go=(n,v,d)=>{if(v>=best)return;if(n===mm){best=v;return}if(d>=3)return;for(const [a,z,vf] of E)if(a===n)go(z,v+vf,d+1)};go(mp,0,0);return best}
function capV(){const F=nets(),mp=F('M+'),mm=F('M-');let s=0;for(const p of parts())if(p.t==='C'){const a=F(p.a),z=F(p.z);if((a===mp&&z===mm)||(a===mm&&z===mp))s+=p.v}return s}
function sigPt(p,nodes,M){const v=netVal(p);return v==null?null:typeof v==='number'?konst(M,v):(nodes[v]||new Float64Array(M))}
let mKey='',mVal=null;
function meterVolts(){const W=S.wire;if(!W||!W.has('M+'))return {dc:(Math.random()-.5)*.0008,ac:Math.random()*.0004,f:0};
  const c=cur(),b=curB(),key=JSON.stringify([c.id,b,S.fg,S.fgk,S.mainsOn,WIRES[S.exp]]);if(key===mKey&&mVal)return mVal;
  const f=srcFreq(),per=f>0?1/f:0.004,dt=per/300,nP=f>0?Math.max(3,Math.min(30,Math.ceil(0.04/per))):1;
  const warm=Math.min(Math.ceil(Math.min(6*c.tau(b),1)/dt),150000),n=Math.ceil(nP*per/dt),M=warm+n;
  const nodes=simulate(dt,M),A=sigPt('M+',nodes,M),Z=W.has('M-')?sigPt('M-',nodes,M):null;
  let s=0,s2=0;for(let i=warm;i<M;i++){const v=(A?A[i]:0)-(Z?Z[i]:0);s+=v;s2+=v*v}const mean=s/n,rms=Math.sqrt(Math.max(s2/n-mean*mean,0));
  mKey=key;mVal={dc:mean,ac:f>0?rms/Math.sqrt(1+(f/1500)**2):rms,f};return mVal}
function fmtMV(v){const a=Math.abs(v);if(a<.6)return [(v*1000).toFixed(1),'mV'];if(a<6)return [v.toFixed(3),'V'];if(a<60)return [v.toFixed(2),'V'];if(a<600)return [v.toFixed(1),'V'];return ['OL','V']}
function fmtR(R){if(!isFinite(R)||R>=6e7)return ['OL','MΩ'];if(R<600)return [R.toFixed(1),'Ω'];if(R<6e3)return [(R/1e3).toFixed(3),'kΩ'];if(R<6e4)return [(R/1e3).toFixed(2),'kΩ'];if(R<6e5)return [(R/1e3).toFixed(1),'kΩ'];if(R<6e6)return [(R/1e6).toFixed(3),'MΩ'];return [(R/1e6).toFixed(2),'MΩ']}
function fmtCap(C){if(C>=.1)return ['OL','mF'];const t=[[6e-9,1e9,3,'nF'],[6e-8,1e9,2,'nF'],[6e-7,1e9,1,'nF'],[6e-6,1e6,3,'µF'],[6e-5,1e6,2,'µF'],[6e-4,1e6,1,'µF'],[6e-3,1e3,3,'mF'],[.1,1e3,2,'mF']];for(const [lim,k,d,u] of t)if(C<lim)return [(C*k).toFixed(d),u];return ['OL','mF']}
function meterRead(){const W=S.wire,m=MTR.mode,both=W&&W.has('M+')&&W.has('M-');
  if(m==='off')return {val:'',unit:'',flag:''};
  if(m==='amp')return {val:'----',unit:'A',flag:'',note:'amp'};
  if(m==='vdc'){const r=meterVolts(),[v,u]=fmtMV(r.dc);return {val:v,unit:u,flag:'AUTO DC',num:r.dc}}
  if(m==='vac'){const r=meterVolts(),[v,u]=fmtMV(r.ac);return {val:v,unit:u,flag:'AUTO AC',num:r.ac,f:r.f}}
  const pw=powered();if(pw.length)return {val:'Err',unit:'',flag:'',pw};
  if(m==='ohm'){if(!both)return {val:MTR.sub===1?'OL':'OL',unit:MTR.sub===1?'V':MTR.sub===2?'Ω':'MΩ',flag:['AUTO','▸|','•)))'][MTR.sub]};
    const R=solveR();
    if(MTR.sub===0){const [v,u]=fmtR(R);return {val:v,unit:u,flag:'AUTO Ω',num:R}}
    if(MTR.sub===1){const vd=Math.min(diodeV(),R*1e-3);return {val:vd>2?'OL':vd.toFixed(3),unit:'V',flag:'▸|',num:vd}}
    if(R<50)beep();return {val:R<600?R.toFixed(1):'OL',unit:'Ω',flag:'•)))'+(R<50?' ♪':''),num:R}}
  if(m==='cap'){if(!both)return {val:'0.000',unit:'nF',flag:'AUTO'};const [v,u]=fmtCap(capV());return {val:v,unit:u,flag:'AUTO ⊣⊢'}}
  return {val:'',unit:''}}
const MODEHELP={vdc:'Black lead on GROUND, red lead on the point. A minus sign means the leads are the wrong way round.',
  vac:'Shows the RMS value, not peak-to-peak. The manual says it is only accurate up to about 200 Hz.',
  ohm:['Power off first. Reads the resistance between the two leads, including anything else connected between them. Parts have a small tolerance, so readings differ slightly from the colour code.','Diode test: red lead on the anode, black on the cathode. Silicon reads about 0.5–0.7 V, germanium about 0.2–0.4 V. Reversed shows OL.','Continuity beeps below about 50 Ω. Use it to check tracks and your patch leads.'],
  cap:'Power off. Reads the capacitor between the two leads, up to 100 mF.',
  amp:'Current has to be measured in series, which this fixed kit does not allow. Work it out instead: I = V / R, as the manual says.'};
function showDmm(){if(MTR.hold&&MTR.last)return;const r=meterRead();MTR.last=r;
  $('#mVal').textContent=MTR.mode==='off'?'':r.val;$('#mUnit').textContent=r.unit||'';$('#mFlags').textContent=(MTR.hold?'HOLD ':'')+(r.flag||'');
  const W=S.wire,where=p=>W&&W.has(p)?`<b>${sname(WIRES[S.exp].find(w=>w.includes(p)).find(x=>x!==p))}</b>`:'<i>not connected</i>';
  let h=`<div>Red lead (VΩ): ${where('M+')} · Black lead (COM): ${where('M-')}</div>`;
  if(MTR.mode==='off')h+='<div>Turn the dial to choose what to measure, then place the leads from the MULTIMETER tag on the board.</div>';
  else{const t=MODEHELP[MTR.mode];h+=`<div>${Array.isArray(t)?t[MTR.sub]:t}</div>`;
    if(MTR.mode==='ohm'&&MTR.sub===1&&S.exp==='e2')h+='<div class="m-warn">On this simulated board D1 is silicon, D2 is germanium, TR1 is NPN and TR2 is PNP (pins T12/T15 emitter, T13/T16 base). Your real board may differ.</div>';
    if(r.pw)h+=`<div class="m-warn">Not valid: ${r.pw.join(' and ')}. Disconnect it before measuring ${MTR.mode==='cap'?'capacitance':'resistance'}.</div>`;
    if(MTR.mode==='vac'&&r.f>200)h+=`<div class="m-warn">The signal is ${eng(r.f,'Hz')}, so this reading is too low. Use the scope's Pk-Pk and divide by 2√2 for a sine.</div>`}
  $('#mInfo').innerHTML=h}
(function initMeter(){const d=$('#mDial');d.insertAdjacentHTML('beforeend',MODES.map(([k,l,a])=>{const rad=a*Math.PI/180,x=50+43*Math.cos(rad),y=50+43*Math.sin(rad);return `<button type="button" class="m-pos" data-m="${k}" style="left:${x}%;top:${y}%">${l}</button>`}).join(''));
  const set=k=>{MTR.mode=k;MTR.hold=false;const a=MODES.find(m=>m[0]===k)[2];$('#mKnob').style.transform=`rotate(${a+90}deg)`;$$('.m-pos').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===k));mKey='';showDmm()};
  d.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b){try{ACX=ACX||new (window.AudioContext||window.webkitAudioContext)()}catch(_){}set(b.dataset.m)}});
  $('#mSel').onclick=()=>{if(MTR.mode==='ohm'){MTR.sub=(MTR.sub+1)%3;showDmm()}};
  $('#mHold').onclick=()=>{MTR.hold=!MTR.hold;$('#mHold').setAttribute('aria-pressed',MTR.hold);if(!MTR.hold)MTR.last=null;showDmm()};
  set('off')})();

/* ================= graphs: frequency response, transfer, regulation ================= */
const GK={div:['loads'],rc:['freq'],cr4:['freq'],cr5:['freq'],rl:['freq'],rect:['reg'],ce:['freq','transfer'],inv:['transfer','freq'],noninv:['freq','transfer'],foll:['transfer'],add:['transfer'],int:['freq'],dif:['freq']};
const GKN={freq:'Frequency response',transfer:'V_out vs V_in',reg:'Load regulation',loads:'Loaded divider'};
const GRANGE={rc:[20,1e6],cr4:[20,1e6],cr5:[20,1e6],rl:[20,1e6],ce:[2,2e6],inv:[100,1e6],noninv:[5,1e6],int:[5,5e4],dif:[100,1e5]};
const SCOL=['#2a7fd4','#e0632a','#2e9e57','#b04cc8','#c9a227','#d43d6a'];
const GS={kind:{},ydb:true,theory:true,busy:false,log:{}};
try{const L=JSON.parse(localStorage.getItem('kgpbench.log2')||'{}');if(L&&typeof L==='object')GS.log=L}catch(e){}
const saveG=()=>{try{localStorage.setItem('kgpbench.log2',JSON.stringify(GS.log))}catch(e){}};
const gkind=()=>{const ks=GK[cur().id];return ks.includes(GS.kind[cur().id])?GS.kind[cur().id]:ks[0]};
const grows=()=>{const k=cur().id+'|'+gkind();return GS.log[k]||(GS.log[k]=[])};
const fe=v=>eng(v,'',3).replace(' ','');
function seriesLabel(){const c=cur(),b=curB();
  if(c.kind)return c.kind==='rl'?`R ${fe(b.R)}Ω, L ${fe(b.L)}H`:`R ${fe(b.R)}Ω, C ${fe(b.C)}F`;
  if(c.id==='ce')return `R_L ${b.j33?'on':'off'}, C_E ${b.j2E?'on RE1+RE2':b.j22?'on RE2':'off'}${b.j11?'':', R_x in'}`;
  if(c.cfg==='inv'||c.cfg==='noninv')return `R_i ${fe(b.Ri)}Ω, R_f ${fe(b.Rf)}Ω`;
  if(c.id==='rect'){const m=c.mode(b).m,r=c.reg(b);return `${{hw:'Half wave',ct:'Full wave CT',br:'Bridge'}[m]||'No rectifier'}${b.J6C?' + C':''}${r==='z'?' → Zener':r==='ic'?' → 7806':''}`}
  return c.name}
function loadLabel(){const c=cur(),b=curB();if(c.id==='div'){const r=c.RL(b);return b.j74&&b.j64?'R3 ‖ R4':b.j74?'R3':b.j64?'R4':'none (R_L = ∞)'}
  if(c.id==='rect')return b.L1&&b.L2?'RL1 ‖ RL2':b.L1?'RL1':b.L2?'RL2':'no load';return ''}
function gmsg(t,warn){$('#gMsg').innerHTML=t?`<span class="${warn?'warn':''}">${t}</span>`:''}
function probesOK(){const W=S.wire;if(!W||!W.has('C1+')||!W.has('C2+')){gmsg('Connect the CH1 probe to the input and the CH2 probe to the output first.',true);return false}return true}
function takeRow(){const k=gkind(),c=cur(),b=curB();if(!CAP)return null;const A=meas(CAP.d[0],0,CAP.dt),Bm=meas(CAP.d[1],1,CAP.dt),f=srcFreq();
  if(k==='loads'){const vth=b.R2/(b.R1+b.R2),ro=par(b.R1,b.R2),rl=c.RL(b);return {s:loadLabel(),a:A.pk,b:Bm.pk,th:isFinite(rl)?vth*rl/(rl+ro):vth,q:A.clip||Bm.clip}}
  if(k==='transfer'&&!f)return {s:seriesLabel()+' (DC)',a:A.me,b:Bm.me,dc:true,q:A.clip||Bm.clip};
  return {s:seriesLabel(),f:f||A.fr,a:A.pk,b:Bm.pk,q:A.clip||Bm.clip}}
$('#bRec').onclick=()=>{const k=gkind();
  if(k==='reg'){const W=S.wire;if(MTR.mode!=='vdc'||!W||!W.has('M+')||!W.has('M-')){gmsg('Set the multimeter to V⎓ and put its red lead on the output terminal and the black lead on GROUND.',true);return}
    const r=meterVolts(),b=curB(),RL=[b.L1?b.RL1:Infinity,b.L2?b.RL2:Infinity].reduce(par),m2=S.wire.has('C2+')&&CAP?meas(CAP.d[1],1,CAP.dt):null,rip=m2&&!m2.clip?m2.pk:null;
    grows().push({s:seriesLabel(),c:loadLabel(),v:r.dc,i:isFinite(RL)?r.dc/RL:0,rip});saveG();gmsg(m2&&m2.clip?'Ripple not recorded: the CH2 trace is off the screen. Set CH2 coupling to AC and lower its V/div.':'',!!(m2&&m2.clip));return renderLog()}
  if(!probesOK())return;const row=takeRow();if(!row)return;grows().push(row);saveG();gmsg(row.q?'A trace is off the screen, so that reading is marked “?”. Adjust V/div and record again.':'',row.q);renderLog()};
$('#bUndo').onclick=()=>{grows().pop();saveG();renderLog()};
$('#bClr').onclick=()=>{GS.log[cur().id+'|'+gkind()]=[];saveG();gmsg('');renderLog()};
const tick0=()=>new Promise(r=>setTimeout(r,0));
$('#bSweep').onclick=async()=>{if(GS.busy)return;const k=gkind(),c=cur();
  if(k==='reg'||k==='loads'){gmsg('Auto sweep is for frequency and amplitude sweeps. Here, change the load leads and record each reading.',true);return}
  if(!probesOK())return;if(!S.fg.on||S.fgk!==1){gmsg('Connect the generator (red clip on the input, black on GROUND) and turn its output on.',true);return}
  if(k==='transfer'&&!srcFreq()){gmsg('Auto sweep needs the generator as the input. Record each divider-tap reading by hand.',true);return}
  GS.busy=true;$$('.log .btn').forEach(b=>b.disabled=true);
  const sc0=JSON.parse(JSON.stringify(S.sc)),f0=S.fg.freq,a0=S.fg.amp,L=grows();let pts;
  if(k==='freq'){const [lo,hi]=GRANGE[c.id]||[100,1e6],n=24;pts=Array.from({length:n},(_,i)=>lo*(hi/lo)**(i/(n-1)))}
  else{const g=S.fg.load==='50'?2:1,top=c.id==='ce'?2:10,bot=c.id==='ce'?.02:.1;pts=Array.from({length:14},(_,i)=>bot*(top/bot)**(i/13)/g)}
  try{for(let i=0;i<pts.length;i++){if(k==='freq')S.fg.freq=+pts[i].toPrecision(4);else S.fg.amp=+pts[i].toPrecision(4);fgRender();autoset();CAP=capture();const row=takeRow();if(row){if(k==='freq')row.f=S.fg.freq;L.push(row)}
      gmsg(`Sweeping… ${i+1} / ${pts.length}`);if(i%3===2){renderLog();await tick0()}}}
  finally{S.fg.freq=f0;S.fg.amp=a0;Object.assign(S.sc,sc0);dirty=true;fgRender();updKeys();GS.busy=false;$$('.log .btn').forEach(b=>b.disabled=false);saveG();gmsg('Sweep done. Scope and generator settings are back to what they were.');renderLog()}};
/* theory */
function thGain(f){const c=cur(),b=curB(),w=TAU*f;
  if(c.kind==='rc')return 1/Math.hypot(1,f*TAU*b.R*b.C);
  if(c.kind==='cr')return 1/Math.hypot(1,1/(f*TAU*b.R*b.C));
  if(c.kind==='rl')return 1/Math.hypot(1,b.R/(TAU*b.L*f));
  if(c.cfg==='noninv'){const A0=1+b.Rf/b.Ri,x=w*b.Ri*.47e-6,k=b.Rf/b.Ri;return Math.hypot(1+k*x*x/(1+x*x),k*x/(1+x*x))/Math.hypot(1,f*A0/1e6)}
  if(c.cfg==='inv'){const A=b.Rf/b.Ri;return A/Math.hypot(1,f*(1+A)/1e6)}
  if(c.cfg==='int')return (b.Rf/b.Ri)/Math.hypot(1,w*b.Rf*b.C);
  if(c.cfg==='dif')return (w*b.Rf*b.C)/Math.hypot(1,w*b.Ri*b.C)/Math.hypot(1,w*b.Rf*47e-12);
  return null}
function thFc(){const c=cur(),b=curB();if(c.kind==='rc'||c.kind==='cr')return 1/(TAU*b.R*b.C);if(c.kind==='rl')return b.R/(TAU*b.L);return null}
function thTransfer(x){const c=cur(),b=curB();if(c.cfg==='inv')return clamp(-b.Rf/b.Ri*x,-10.5,10.5);if(c.cfg==='noninv')return clamp((1+b.Rf/b.Ri)*x,-10.5,10.5);if(c.cfg==='foll')return clamp(x,-10.5,10.5);
  if(c.id==='ce'){const A=c.ac(b);return A.Av*x}return null}
/* analysis */
function bySeries(L){const m=new Map();L.forEach(r=>{if(!m.has(r.s))m.set(r.s,[]);m.get(r.s).push(r)});return [...m.entries()]}
function freqStats(P){const p=P.filter(r=>r.a>0&&r.b>0&&r.f>0).map(r=>({f:r.f,db:20*Math.log10(r.b/r.a)})).sort((a,b)=>a.f-b.f);if(p.length<2)return null;
  let im=0;p.forEach((q,i)=>{if(q.db>p[im].db)im=i});const top=cur().kind?Math.max(0,p[im].db):p[im].db,th=top-3,cross=(i,j)=>{const a=p[i],z=p[j],t=(th-a.db)/(z.db-a.db);return 10**(Math.log10(a.f)+t*(Math.log10(z.f)-Math.log10(a.f)))};
  let fL=null,fH=null;for(let i=im;i>0;i--)if(p[i-1].db<th){fL=cross(i,i-1);break}for(let i=im;i<p.length-1;i++)if(p[i+1].db<th){fH=cross(i,i+1);break}
  return {top,fL,fH,fmax:p[im].f}}
function xferStats(P){let p=P.filter(r=>Math.abs(r.a)>1e-6).sort((a,b)=>Math.abs(a.a)-Math.abs(b.a));if(p.length<2)return null;const big=p.filter(r=>Math.abs(r.a)>=.02);if(big.length>=2)p=big;
  const rs=p.slice(0,Math.min(4,Math.max(2,Math.ceil(p.length/3)))).map(r=>r.b/r.a).sort((a,b)=>a-b),g0=rs[Math.floor(rs.length/2)];let vsm=null;
  for(const r of p){if(Math.abs(r.b-g0*r.a)<=.05*Math.abs(g0*r.a))vsm=Math.abs(r.a);else if(vsm!=null)break}return {g0,vsm,lin:vsm===Math.abs(p[p.length-1].a)}}
function renderLog(){const c=cur(),k=gkind(),ks=GK[c.id];
  $('#gKinds').innerHTML=ks.length>1?ks.map(x=>`<button class="tab" data-gk="${x}" aria-pressed="${x===k}">${GKN[x]}</button>`).join(''):'';
  $$('[data-gk]').forEach(t=>t.onclick=()=>{GS.kind[c.id]=t.dataset.gk;gmsg('');renderLog()});
  $('#gOpts').innerHTML=(k==='freq'?`<div class="seg" role="group" aria-label="Y axis"><button type="button" data-y="db" aria-pressed="${GS.ydb}">Gain in dB</button><button type="button" data-y="ratio" aria-pressed="${!GS.ydb}">V_out/V_in, log scale</button></div>`:'')+
    (k==='freq'||k==='transfer'?`<label><input type="checkbox" id="thChk"${GS.theory?' checked':''}> Theory curve</label>`:'');
  $$('[data-y]').forEach(b=>b.onclick=()=>{GS.ydb=b.dataset.y==='db';renderLog()});const th=$('#thChk');if(th)th.onchange=()=>{GS.theory=th.checked;renderLog()};
  $('#bSweep').hidden=k==='reg'||k==='loads';
  $('#logSub').textContent=k==='reg'?'Multimeter V⎓ on the output, ripple from CH2':k==='loads'?'CH1 = V_in at T1, CH2 = V_L at T4':'CH1 = V_in, CH2 = V_out, from the scope’s Pk-Pk';
  const L=grows(),S_=bySeries(L),col=s=>SCOL[S_.findIndex(z=>z[0]===s)%SCOL.length];
  const head={freq:['#','Series','f','V_in p-p','V_out p-p','V_out/V_in','dB'],transfer:['#','Series','V_in','V_out','Gain'],reg:['#','Circuit','Load','V_out (DMM)','I_L','Ripple p-p'],loads:['#','Load','V_in p-p','V_L p-p','V_L/V_in','Thevenin']}[k];
  $('#logHead').innerHTML='<tr>'+head.map(h=>`<th>${h.replace(/_(\w+)/g,'<sub>$1</sub>')}</th>`).join('')+'</tr>';
  const dot=s=>`<span class="sdot" style="background:${col(s)}"></span>`;
  $('#logBody').innerHTML=L.length?L.map((r,i)=>{const q=r.q?' ?':'';
    if(k==='freq'){const g=r.b/r.a;return `<tr><td>${i+1}</td><td>${dot(r.s)}${r.s}</td><td>${eng(r.f,'Hz')}</td><td>${eng(r.a,'V')}${q}</td><td>${eng(r.b,'V')}</td><td>${isFinite(g)?g.toFixed(3):'?'}</td><td>${g>0?(20*Math.log10(g)).toFixed(2):'?'}</td></tr>`}
    if(k==='transfer'){const g=r.b/r.a;return `<tr><td>${i+1}</td><td>${dot(r.s)}${r.s}</td><td>${eng(r.a,'V')}${r.dc?'':' p-p'}${q}</td><td>${eng(r.b,'V')}${r.dc?'':' p-p'}</td><td>${isFinite(g)?g.toFixed(2):'?'}</td></tr>`}
    if(k==='reg')return `<tr><td>${i+1}</td><td>${dot(r.s)}${r.s}</td><td>${r.c}</td><td>${r.v.toFixed(3)} V</td><td>${eng(r.i,'A')}</td><td>${r.rip!=null?eng(r.rip,'V'):'—'}</td></tr>`;
    return `<tr><td>${i+1}</td><td>${r.s}</td><td>${eng(r.a,'V')}${q}</td><td>${eng(r.b,'V')}</td><td>${(r.b/r.a).toFixed(3)}</td><td>${r.th.toFixed(3)}</td></tr>`}).join(''):`<tr><td colspan="${head.length}" style="text-align:left;color:var(--mute)">No readings yet.</td></tr>`;
  let res='';
  if(k==='freq'){const fc=thFc();for(const [s,P] of S_){const st=freqStats(P);if(!st)continue;const g=10**(st.top/20),parts_=[`max ${st.top.toFixed(1)} dB (×${g.toFixed(2)})`];
      if(st.fL)parts_.push(`f<sub>L</sub> = ${eng(st.fL,'Hz')}`);if(st.fH)parts_.push(`f<sub>H</sub> = ${eng(st.fH,'Hz')}`);if(st.fL&&st.fH)parts_.push(`BW = ${eng(st.fH-st.fL,'Hz')}`);if(!st.fL&&(c.id==='ce'||c.kind==='cr'||c.kind==='rl'))parts_.push('f<sub>L</sub> is below your lowest frequency');if(!st.fH&&(c.id==='ce'||c.kind==='rc'||c.cfg))parts_.push('f<sub>H</sub> is above your highest frequency');
      if(st.fH&&c.cfg)parts_.push(`gain × BW = ${eng(g*st.fH,'Hz')}`);if(c.kind)parts_.push(c.kind==='rc'?'low-pass':'high-pass');
      res+=`<div>${dot(s)}<b>${s}</b>: ${parts_.join(' · ')}</div>`}
    if(fc)res+=`<div class="mute">Theory f<sub>c</sub> = ${c.kind==='rl'?'R/2πL':'1/2πRC'} = ${eng(fc,'Hz')}</div>`;if(c.id==='ce')res+=`<div class="mute">Theory mid-band gain ≈ ${c.ac(curB()).Av.toFixed(1)} (${(20*Math.log10(c.ac(curB()).Av)).toFixed(1)} dB)</div>`}
  if(k==='transfer')for(const [s,P] of S_){const st=xferStats(P);if(!st)continue;res+=`<div>${dot(s)}<b>${s}</b>: small-signal gain ${st.g0.toFixed(2)}${st.vsm!=null?` · linear up to V<sub>in</sub> = ${eng(st.vsm,'V')}${st.lin?' (no distortion yet; go higher)':' → this is V<sub>SM</sub>'}`:''}</div>`}
  if(k==='reg')for(const [s,P] of S_){if(P.length<2)continue;const nl=P.reduce((a,r)=>r.i<a.i?r:a),fl=P.reduce((a,r)=>r.i>a.i?r:a);if(fl.i<=nl.i)continue;res+=`<div>${dot(s)}<b>${s}</b>: V<sub>NL</sub> = ${nl.v.toFixed(3)} V, V<sub>FL</sub> = ${fl.v.toFixed(3)} V · V.R. = ${((nl.v-fl.v)/fl.v*100).toFixed(1)} %</div>`}
  $('#gRes').innerHTML=res;
  $('#gNote').textContent={freq:'Keep V_in constant, change the generator frequency, and press Record at each step, or use Auto sweep. The x axis is log frequency; the −3 dB line is 3 dB below the pass-band (0 dB for the R-C, C-R and R-L networks, otherwise each series’ maximum), as in Note II of the manual.',
    transfer:'Raise the input step by step and record. The fitted gain uses the first readings; V_SM is the largest input still within 5 % of that straight line.',
    reg:'Record with no load first (V_NL), then Load 1, Load 2 and both together (V_FL). Change the regulator or rectifier and repeat to compare.',
    loads:'Record once for each load case (a)–(d) and compare V_L/V_in with the Thevenin value. No graph is needed for this part.'}[k];
  $('#plot').hidden=k==='loads';drawPlot()}
function drawPlot(){const cv_=$('#plot');if(cv_.hidden)return;const r=cv_.getBoundingClientRect(),d=window.devicePixelRatio||1;if(!r.width)return;cv_.width=r.width*d;cv_.height=r.height*d;const g=cv_.getContext('2d');g.setTransform(d,0,0,d,0,0);
  const st=getComputedStyle(document.documentElement),ink=st.getPropertyValue('--ink'),mute=st.getPropertyValue('--mute'),line=st.getPropertyValue('--line'),warn=st.getPropertyValue('--warn');
  const W=r.width,H=r.height,l=54,rt=W-14,t=14,bt=H-32,k=gkind(),c=cur(),L=grows(),S_=bySeries(L);g.clearRect(0,0,W,H);g.font='11px "IBM Plex Mono",monospace';g.lineWidth=1;
  const col=s=>SCOL[S_.findIndex(z=>z[0]===s)%SCOL.length];
  let X,Y,xs=[],ys=[];
  if(k==='freq'){const [lo,hi]=GRANGE[c.id]||[10,1e6];let x0=Math.floor(Math.log10(lo)),x1=Math.ceil(Math.log10(hi));L.forEach(p=>{if(p.f>0){x0=Math.min(x0,Math.floor(Math.log10(p.f)));x1=Math.max(x1,Math.ceil(Math.log10(p.f)))}});
    const yv=p=>GS.ydb?20*Math.log10(p.b/p.a):Math.log10(p.b/p.a);const vals=L.filter(p=>p.a>0&&p.b>0).map(yv);
    const thv=[];if(GS.theory){for(let i=0;i<=120;i++){const f=10**(x0+(x1-x0)*i/120),gv=thGain(f);if(gv>0)thv.push([f,GS.ydb?20*Math.log10(gv):Math.log10(gv)])}}
    const all=vals.concat(thv.map(q=>q[1]));let y1,y0;
    if(GS.ydb){y1=all.length?Math.ceil((Math.max(...all)+3)/10)*10:10;y0=all.length?Math.floor((Math.min(...all)-3)/10)*10:-40;y0=Math.max(Math.min(y0,y1-20),y1-80)}
    else{y1=all.length?Math.ceil(Math.max(...all)+.05):1;y0=all.length?Math.floor(Math.min(...all)-.05):-2;y0=Math.max(Math.min(y0,y1-1),y1-5)}
    X=v=>l+(Math.log10(v)-x0)/(x1-x0)*(rt-l);Y=v=>t+(y1-clamp(v,y0,y1))/(y1-y0)*(bt-t);
    g.strokeStyle=line;g.fillStyle=mute;g.textAlign='center';
    for(let e=x0;e<=x1;e++){g.globalAlpha=1;g.beginPath();g.moveTo(X(10**e),t);g.lineTo(X(10**e),bt);g.stroke();g.fillText(eng(10**e,'Hz',3).replace('.00',''),X(10**e),bt+16);
      if(e<x1)for(let m=2;m<10;m++){g.globalAlpha=.35;g.beginPath();g.moveTo(X(m*10**e),t);g.lineTo(X(m*10**e),bt);g.stroke()}}g.globalAlpha=1;
    g.textAlign='right';if(GS.ydb){const sp=(y1-y0)>40?20:10;for(let v=y0;v<=y1;v+=sp){g.beginPath();g.moveTo(l,Y(v));g.lineTo(rt,Y(v));g.stroke();g.fillText(v+' dB',l-6,Y(v)+4)}}
    else for(let v=y0;v<=y1;v++){g.beginPath();g.moveTo(l,Y(v));g.lineTo(rt,Y(v));g.stroke();g.fillText(String(+(10**v).toPrecision(2)),l-6,Y(v)+4)}
    g.save();g.translate(14,(t+bt)/2);g.rotate(-Math.PI/2);g.textAlign='center';g.fillText(GS.ydb?'20 log(V_out/V_in)':'V_out / V_in',0,0);g.restore();
    if(thv.length){g.strokeStyle=mute;g.setLineDash([6,4]);g.lineWidth=1.5;g.beginPath();thv.forEach(([f,v],i)=>i?g.lineTo(X(f),Y(v)):g.moveTo(X(f),Y(v)));g.stroke();g.setLineDash([]);g.lineWidth=1}
    const fc=thFc();if(fc&&GS.theory&&fc>10**x0&&fc<10**x1){g.strokeStyle=mute;g.setLineDash([2,3]);g.beginPath();g.moveTo(X(fc),t);g.lineTo(X(fc),bt);g.stroke();g.setLineDash([]);g.fillStyle=mute;g.textAlign='left';g.fillText('f_c theory '+eng(fc,'Hz'),X(fc)+4,t+12)}
    if(c.id==='ce'&&GS.theory&&GS.ydb){const av=20*Math.log10(c.ac(curB()).Av);g.strokeStyle=mute;g.setLineDash([6,4]);g.beginPath();g.moveTo(l,Y(av));g.lineTo(rt,Y(av));g.stroke();g.setLineDash([]);g.fillStyle=mute;g.textAlign='right';g.fillText('theory mid-band',rt-4,Y(av)-5)}
    for(const [s,P] of S_){const p=P.filter(q=>q.a>0&&q.b>0&&q.f>0).sort((a,b)=>a.f-b.f),cl=col(s);if(!p.length)continue;const stt=freqStats(P);
      if(stt){const v=GS.ydb?stt.top-3:Math.log10(10**((stt.top-3)/20));g.strokeStyle=cl;g.globalAlpha=.6;g.setLineDash([3,4]);g.beginPath();g.moveTo(l,Y(v));g.lineTo(rt,Y(v));g.stroke();g.setLineDash([]);g.globalAlpha=1;
        for(const fx of [stt.fL,stt.fH])if(fx){g.fillStyle=cl;g.beginPath();g.moveTo(X(fx),Y(v)-7);g.lineTo(X(fx)-5,Y(v)-14);g.lineTo(X(fx)+5,Y(v)-14);g.fill()}}
      g.strokeStyle=cl;g.lineWidth=2;g.beginPath();p.forEach((q,i)=>i?g.lineTo(X(q.f),Y(yv(q))):g.moveTo(X(q.f),Y(yv(q))));g.stroke();g.lineWidth=1;g.fillStyle=cl;p.forEach(q=>{g.beginPath();g.arc(X(q.f),Y(yv(q)),3.2,0,TAU);g.fill()})}
    if(!L.length){g.fillStyle=mute;g.textAlign='center';g.fillText(GS.theory&&thv.length?'Dashed line: theory. Your readings appear on top.':'Recorded points appear here',(l+rt)/2,(t+bt)/2)}}
  else{const pts=k==='reg'?L.map(p=>[p.i*1e3,p.v,p.s]):L.map(p=>[p.a,p.b,p.s]);
    let xmin=0,xmax=1,ymin=0,ymax=1;if(pts.length){xmax=Math.max(...pts.map(p=>p[0]),1e-3)*1.12;xmin=Math.min(0,...pts.map(p=>p[0]))*1.12;ymax=Math.max(0,...pts.map(p=>p[1]))*1.12||1;ymin=Math.min(0,...pts.map(p=>p[1]))*1.12}
    if(k==='reg'&&pts.length)ymin=Math.max(0,Math.min(...pts.map(p=>p[1]))*0.9);
    if(ymax<=ymin)ymax=ymin+1;if(xmax<=xmin)xmax=xmin+1;
    X=v=>l+(v-xmin)/(xmax-xmin)*(rt-l);Y=v=>t+(ymax-v)/(ymax-ymin)*(bt-t);
    const nice=(a,b)=>{const s=10**Math.floor(Math.log10((b-a)/5)),m=(b-a)/5/s;return s*(m>5?10:m>2?5:m>1?2:1)};
    g.strokeStyle=line;g.fillStyle=mute;const sx=nice(xmin,xmax),sy=nice(ymin,ymax);g.textAlign='center';
    for(let v=Math.ceil(xmin/sx)*sx;v<=xmax;v+=sx){g.beginPath();g.moveTo(X(v),t);g.lineTo(X(v),bt);g.stroke();g.fillText(+v.toPrecision(3)+'',X(v),bt+16)}
    g.textAlign='right';for(let v=Math.ceil(ymin/sy)*sy;v<=ymax;v+=sy){g.beginPath();g.moveTo(l,Y(v));g.lineTo(rt,Y(v));g.stroke();g.fillText(+v.toPrecision(3)+'',l-6,Y(v)+4)}
    g.textAlign='center';g.fillText(k==='reg'?'Load current I_L (mA)':'V_in (V)',(l+rt)/2,H-3);g.save();g.translate(14,(t+bt)/2);g.rotate(-Math.PI/2);g.fillText(k==='reg'?'V_out (V)':'V_out (V)',0,0);g.restore();
    if(k==='transfer'&&GS.theory&&thTransfer(1)!=null){g.strokeStyle=mute;g.setLineDash([6,4]);g.lineWidth=1.5;g.beginPath();for(let i=0;i<=60;i++){const x=xmin+(xmax-xmin)*i/60,dc=L.some(p=>p.dc),y=dc?thTransfer(x):Math.min(Math.abs(thTransfer(x)),c.id==='ce'?1e9:21);i?g.lineTo(X(x),Y(y)):g.moveTo(X(x),Y(y))}g.stroke();g.setLineDash([]);g.lineWidth=1}
    for(const [s,P] of S_){const p=(k==='reg'?P.map(q=>[q.i*1e3,q.v]):P.map(q=>[q.a,q.b])).sort((a,b)=>a[0]-b[0]),cl=col(s);g.strokeStyle=cl;g.fillStyle=cl;g.lineWidth=2;g.beginPath();p.forEach((q,i)=>i?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1])));g.stroke();g.lineWidth=1;p.forEach(q=>{g.beginPath();g.arc(X(q[0]),Y(q[1]),3.2,0,TAU);g.fill()});
      if(k==='transfer'){const stt=xferStats(P);if(stt&&stt.vsm&&!stt.lin){g.strokeStyle=warn;g.setLineDash([3,3]);g.beginPath();g.moveTo(X(stt.vsm),t);g.lineTo(X(stt.vsm),bt);g.stroke();g.setLineDash([]);g.fillStyle=warn;g.textAlign='left';g.fillText('V_SM',X(stt.vsm)+4,t+12)}}}
    if(!L.length){g.fillStyle=mute;g.textAlign='center';g.fillText('Recorded points appear here',(l+rt)/2,(t+bt)/2)}}
  if(S_.length){g.font='11px "IBM Plex Sans",sans-serif';let y=t+6;g.textAlign='right';for(const [s] of S_.slice(-6)){g.fillStyle=col(s);g.fillRect(rt-10,y-4,8,8);g.fillStyle=ink;g.fillText(s,rt-14,y+4);y+=15}}}
try{new ResizeObserver(()=>drawPlot()).observe($('#plot'))}catch(e){}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>drawPlot())}catch(e){}
