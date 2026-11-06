/* KGP Lab Bench · Oscilloscope acquisition, measurements, autoset and screen drawing */
/* ================= oscilloscope engine ================= */
const VSEQ=[2e-3,5e-3,1e-2,2e-2,5e-2,.1,.2,.5,1,2,5,10];
const TSEQ=(()=>{const a=[];for(let k=-9;k<=1;k++)for(const m of [1,2.5,5]){const v=+(m*10**k).toPrecision(3);if(v>=4.9e-9&&v<=10.1)a.push(v)}return a})();
const NREC=2500;
const MT=[['pk','Pk-Pk','V'],['fr','Frequency','Hz'],['pe','Period','s'],['me','Mean','V'],['rm','RMS','V'],['mx','Maximum','V'],['mn','Minimum','V'],['ri','Rise Time','s']];
const chNodes=c=>c.id==='div'?['vin','vl']:c.id==='rect'?['sec','out']:['vin','vout'];
let CAP=null,needDraw=true,dirty=true;
function simulate(dt,M){const c=cur(),b=curB();let x=c.src==='mains'?new Float64Array(M):fgSignal(M,dt);if(c.src!=='mains'&&S.fgk!==1)x=mul(x,S.fgk||0);const r=c.run(x,dt,c.src==='mains'&&S.mainsOn===false?Object.assign({},b,{Vs:0}):b);for(const k of S.kill||[])if(r[k])r[k]=new Float64Array(M);return r}
function chanProc(v,dt,i){const ch=S.sc.ch[i],n=v.length;let y;
  if(ch.cpl==='GND')y=new Float64Array(n);else if(ch.cpl==='AC')y=hp(v,dt,0.016);else y=Float64Array.from(v);
  const k=ch.probe*(ch.inv?-1:1),nz=0.0011*ch.probe;
  for(let j=0;j<n;j++)y[j]=y[j]*k+(Math.random()-.5)*2*nz;return y}
function capture(){
  const sc=S.sc,N=NREC,dt=10*sc.tdiv/N,c=cur(),b=curB(),f=srcFreq(),per=f>0?1/f:0;
  const warm=Math.min(Math.ceil(Math.min(6*c.tau(b),1)/dt),120000);
  const Sm=per?Math.min(Math.ceil(per/dt)+4,3*N):N;
  const base=warm+N,M=base+Sm+N+2;
  const nodes=simulate(dt,M);
  const disp=[0,1].map(i=>chanProc(probeSig(nodes,i,M),dt,i));
  const t=sc.trig,src=disp[t.src];let ti=-1;
  for(let i=base;i<base+Sm;i++){const a=src[i-1],v=src[i];if(t.slope==='rise'?(a<t.level&&v>=t.level):(a>t.level&&v<=t.level)){ti=i;break}}
  const trig=ti>=0;
  if(!trig){if(t.mode==='normal'&&CAP)return Object.assign(CAP,{waiting:true});ti=base+Math.floor(Math.random()*Sm)}
  const st=clamp(ti+Math.round(sc.hpos/dt)-N/2,0,M-N);
  return {d:disp.map(a=>a.slice(st,st+N)),trig,dt,waiting:false}}
function meas(a,i,dt){
  const ch=S.sc.ch[i],lo=(-5.1-ch.pos)*ch.vdiv,hi=(5.1-ch.pos)*ch.vdiv,n=a.length;
  let mx=-1e9,mn=1e9,s=0,s2=0,clip=false;const c=new Float64Array(n);
  for(let j=0;j<n;j++){let v=a[j];if(v>hi){v=hi;clip=true}else if(v<lo){v=lo;clip=true}c[j]=v;if(v>mx)mx=v;if(v<mn)mn=v;s+=v;s2+=v*v}
  const pp=mx-mn;let fr=NaN,pe=NaN,ri=NaN;
  if(pp>0.25*ch.vdiv&&pp>0.004*ch.probe){
    const mid=(mx+mn)/2,h=pp*0.1,cr=[];let arm=false;
    for(let j=1;j<n;j++){const v=c[j];if(v<mid-h)arm=true;else if(arm&&v>=mid){cr.push(j-1+(mid-c[j-1])/((v-c[j-1])||1));arm=false}}
    if(cr.length>=2){pe=(cr[cr.length-1]-cr[0])/(cr.length-1)*dt;fr=1/pe}
    const l=mn+0.1*pp,u=mn+0.9*pp;let il=-1;
    for(let j=1;j<n;j++){if(c[j-1]<l&&c[j]>=l)il=j-1+(l-c[j-1])/(c[j]-c[j-1]);if(il>=0&&c[j-1]<u&&c[j]>=u){ri=(j-1+(u-c[j-1])/(c[j]-c[j-1])-il)*dt;break}}
  }
  return {pk:pp,fr,pe,me:s/n,rm:Math.sqrt(s2/n),mx,mn,ri,clip}}
const nearestUp=(seq,v)=>{for(const s of seq)if(s>=v*0.999)return s;return seq[seq.length-1]};
function autoset(){
  const sc=S.sc,f=srcFreq();
  sc.tdiv=f>0?nearestUp(TSEQ,2.5/f/10):1e-3;sc.hpos=0;
  sc.ch.forEach((ch)=>{ch.pos=0;ch.vdiv=10*ch.probe});
  const cap=capture(),srcCh=[0,1].find(i=>sc.ch[i].on)??0;
  const both=sc.ch[0].on&&sc.ch[1].on;
  cap.d.forEach((a,i)=>{const ch=sc.ch[i];let mx=-1e9,mn=1e9;for(const v of a){if(v>mx)mx=v;if(v<mn)mn=v}
    ch.pos=both?(i?-2:2):0;const top=3.9-ch.pos,bot=3.9+ch.pos;
    const need=Math.max((mx-mn)/(both?3.6:6),Math.max(mx,0)/top,Math.max(-mn,0)/bot,0.002*ch.probe);
    ch.vdiv=nearestUp(VSEQ.map(v=>v*ch.probe),need);
    if(i===srcCh){sc.trig.src=i;sc.trig.level=+((mx+mn)/2).toPrecision(3);}});
  sc.trig.slope='rise';sc.trig.mode='auto';sc.run=true;sc.menu=null;sc.mlist=null;dirty=true;updKeys()}

/* ================= screen drawing ================= */
const cv=$('#scr'),cx=cv.getContext('2d');let CW=600,CH=500;
function fit(){const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;CW=Math.max(200,r.width);CH=Math.max(160,r.height);cv.width=Math.round(CW*d);cv.height=Math.round(CH*d);cx.setTransform(d,0,0,d,0,0);needDraw=true}
try{new ResizeObserver(fit).observe(cv)}catch(e){window.addEventListener('resize',fit)}
const CC=()=>{const s=getComputedStyle(document.documentElement);return {c1:s.getPropertyValue('--ch1').trim()||'#f3d417',c2:s.getPropertyValue('--ch2').trim()||'#2fc4ea',g:s.getPropertyValue('--grat').trim()||'#2f3d48'}};
let COL=null;
function menuDef(){const sc=S.sc,m=sc.menu;
  if(m==='ch1'||m==='ch2'){const i=m==='ch1'?0:1,ch=sc.ch[i];return {t:'CH'+(i+1),it:[['Coupling',ch.cpl],['Invert',ch.inv?'On':'Off'],['Probe','Attn '+ch.probe+'X'],['',''],['Exit','']]}}
  if(m==='meas')return {t:'Measure',it:[['Source','CH1 ▸'],['Source','CH2 ▸'],['Clear all',''],['',''],['Exit','']]};
  if(m==='trig')return {t:'Trigger',it:[['Source','CH'+(sc.trig.src+1)],['Slope',sc.trig.slope==='rise'?'Rising ↗':'Falling ↘'],['Mode',sc.trig.mode==='auto'?'Auto':'Normal'],['Set to 50%',''],['Exit','']]};
  return null}
function fmtV(v){return eng(v,'V',3).replace(' ','')}
function draw(){
  if(!COL)COL=CC();
  const sc=S.sc,W=CW,H=CH,m=menuDef(),mw=m?Math.min(112,W*.26):0,nm=sc.meas.length,measH=nm?Math.ceil(nm/2)*15+4:0;
  const x0=4,x1=W-mw-4,y0=20,y1=H-30-measH,dx=(x1-x0)/10,dy=(y1-y0)/8,xc=(x0+x1)/2,yc=(y0+y1)/2;
  cx.fillStyle='#060a0e';cx.fillRect(0,0,W,H);
  cx.font='600 11px "IBM Plex Mono",monospace';cx.textBaseline='middle';
  // top bar
  cx.fillStyle='#4f8fd6';cx.fillText('Tek',6,10);
  const stTxt=!sc.run?'Stop':CAP&&CAP.waiting?'Ready':CAP&&CAP.trig?"Trig'd":'Auto';
  cx.fillStyle=!sc.run?'#ff6b5e':stTxt==="Trig'd"?'#5fe08b':'#f2c14e';cx.fillText(stTxt,36,10);
  cx.fillStyle='#8aa2b4';const tp=xc-sc.hpos/sc.tdiv*dx;cx.fillText('T',clamp(tp,x0,x1)-3,10);
  cx.fillStyle='#8aa2b4';cx.textAlign='right';cx.fillText('H '+eng(sc.hpos,'s'),x1,10);cx.textAlign='left';
  // graticule
  cx.strokeStyle=COL.g;cx.lineWidth=1;cx.setLineDash([1,3]);cx.beginPath();
  for(let i=1;i<10;i++){const x=Math.round(x0+i*dx)+.5;cx.moveTo(x,y0);cx.lineTo(x,y1)}
  for(let i=1;i<8;i++){const y=Math.round(y0+i*dy)+.5;cx.moveTo(x0,y);cx.lineTo(x1,y)}cx.stroke();cx.setLineDash([]);
  cx.strokeStyle='#4a5a66';cx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0);cx.beginPath();
  for(let i=0;i<50;i++){const x=x0+i*dx/5;cx.moveTo(x,yc-3);cx.lineTo(x,yc+3)}for(let i=0;i<40;i++){const y=y0+i*dy/5;cx.moveTo(xc-3,y);cx.lineTo(xc+3,y)}cx.stroke();
  // traces
  const ccol=[COL.c1,COL.c2];
  if(CAP){CAP.d.forEach((a,i)=>{const ch=sc.ch[i];if(!ch.on)return;const n=a.length;
    cx.save();cx.beginPath();cx.rect(x0,y0,x1-x0,y1-y0);cx.clip();
    cx.strokeStyle=ccol[i];cx.lineWidth=1.3;cx.shadowColor=ccol[i];cx.shadowBlur=3;cx.beginPath();
    for(let j=0;j<n;j++){const x=x0+j/(n-1)*(x1-x0),y=yc-clamp(a[j]/ch.vdiv+ch.pos,-5.1,5.1)*dy;j?cx.lineTo(x,y):cx.moveTo(x,y)}
    cx.stroke();cx.restore()})}
  // markers
  sc.ch.forEach((ch,i)=>{if(!ch.on)return;const y=clamp(yc-ch.pos*dy,y0+6,y1-6);cx.fillStyle=ccol[i];cx.beginPath();cx.moveTo(x0,y-6);cx.lineTo(x0+12,y-6);cx.lineTo(x0+17,y);cx.lineTo(x0+12,y+6);cx.lineTo(x0,y+6);cx.fill();cx.fillStyle='#000';cx.font='700 10px "IBM Plex Mono",monospace';cx.fillText(String(i+1),x0+3,y+.5)});
  {const t=sc.trig,ch=sc.ch[t.src],y=clamp(yc-(t.level/ch.vdiv+ch.pos)*dy,y0+5,y1-5);cx.fillStyle=ccol[t.src];cx.beginPath();cx.moveTo(x1,y-5);cx.lineTo(x1-8,y);cx.lineTo(x1,y+5);cx.fill()}
  // measurement strip
  cx.font='500 11px "IBM Plex Mono",monospace';
  if(nm&&CAP){const ms=[0,1].map(i=>meas(CAP.d[i],i,CAP.dt));
    sc.meas.forEach((e,k)=>{const r=Math.floor(k/2),c=k%2,x=x0+c*(x1-x0)/2,y=y1+10+r*15,mt=MT.find(z=>z[0]===e.k),v=ms[e.ch][e.k];
      const bad=!isFinite(v)||(ms[e.ch].clip&&e.k!=='fr'&&e.k!=='pe');
      cx.fillStyle=ccol[e.ch];cx.fillText('CH'+(e.ch+1),x+2,y);cx.fillStyle='#d7e1e8';cx.fillText(mt[1]+' '+(isFinite(v)?eng(v,mt[2],3).replace(' ',''):'')+(bad?'?':''),x+32,y)})}
  // bottom bar
  const yb=H-22;cx.fillStyle='#0f1820';cx.fillRect(0,H-30,W-mw,30);
  cx.font='600 11px "IBM Plex Mono",monospace';let xx=6;
  sc.ch.forEach((ch,i)=>{if(!ch.on)return;const t=(i?'2 ':'1 ')+fmtV(ch.vdiv)+(ch.cpl==='AC'?' ∿':ch.cpl==='GND'?' ⏚':'')+(ch.inv?' ↕':'');cx.fillStyle=ccol[i];cx.fillRect(xx,yb-7,14,14);cx.fillStyle='#000';cx.fillText(String(i+1),xx+3.5,yb);cx.fillStyle=ccol[i];cx.fillText(t.slice(2),xx+18,yb);xx+=cx.measureText(t).width+24});
  cx.fillStyle='#e7edf2';cx.fillText('M '+eng(sc.tdiv,'s').replace(' ',''),xx,yb);xx+=78;
  const t=sc.trig;cx.fillStyle=ccol[t.src];cx.fillText((t.slope==='rise'?'↗ ':'↘ ')+fmtV(t.level),Math.min(xx,W-mw-80),yb);
  if(CAP){const mt=meas(CAP.d[t.src],t.src,CAP.dt).fr;cx.fillStyle='#8aa2b4';cx.font='500 10px "IBM Plex Mono",monospace';cx.fillText('Trig f: '+(isFinite(mt)?eng(mt,'Hz'):'< 10 Hz'),6,H-7)}
  // side menu
  if(m){const xm=W-mw;cx.fillStyle='#14263a';cx.fillRect(xm,0,mw,H);cx.fillStyle='#e9f1f7';cx.font='700 12px "IBM Plex Mono",monospace';cx.fillText(m.t,xm+8,10);
    m.it.forEach((it,k)=>{const y=H*(k+.5)/5;if(!it[0])return;cx.fillStyle='#21405f';cx.fillRect(xm+4,y-17,mw-8,34);cx.fillStyle='#c9d9e6';cx.font='500 10.5px "IBM Plex Mono",monospace';cx.fillText(it[0],xm+9,y-7);cx.fillStyle='#ffffff';cx.font='600 11.5px "IBM Plex Mono",monospace';cx.fillText(it[1],xm+9,y+8)})}
  // measurement chooser
  if(sc.mlist){const L=sc.mlist,bw=Math.min(190,x1-x0-20),bh=MT.length*17+26,bx=xc-bw/2,by=clamp(yc-bh/2,y0+2,y1-bh);
    cx.fillStyle='rgba(12,24,38,.96)';cx.fillRect(bx,by,bw,bh);cx.strokeStyle=ccol[L.ch];cx.strokeRect(bx+.5,by+.5,bw,bh);
    cx.fillStyle=ccol[L.ch];cx.font='700 11px "IBM Plex Mono",monospace';cx.fillText('CH'+(L.ch+1)+' · turn knob, push to select',bx+8,by+11);
    MT.forEach((z,k)=>{const y=by+28+k*17,on=sc.meas.some(e=>e.ch===L.ch&&e.k===z[0]);if(k===L.idx){cx.fillStyle='#2f5d8a';cx.fillRect(bx+3,y-8,bw-6,16)}cx.fillStyle='#e8f0f6';cx.font='500 11px "IBM Plex Mono",monospace';cx.fillText((on?'✓ ':'  ')+z[1],bx+10,y)});
    L.box={bx,by,bw}}
  needDraw=false}
