/* KGP Lab Bench · AFG1022 front panel, knobs and scope buttons */
/* ================= AFG1022 front panel ================= */
const FGF={freq:{n:'Frequency',u:[['MHz',1e6],['kHz',1e3],['Hz',1]],su:'Hz'},amp:{n:'Amplitude',u:[['Vpp',1],['mVpp',1e-3]],su:'V'},off:{n:'Offset',u:[['V',1],['mV',1e-3]],su:'V'},duty:{n:'Duty',u:[['%',1]],su:'%'}};
const grp3=s=>{const [i,d]=s.split('.');return d?i+'.'+d.replace(/(\d{3})(?=\d)/g,'$1 '):i};
function fmtF(f){const [u,s]=f>=1e6?[1e6,'MHz']:f>=1e3?[1e3,'kHz']:[1,'Hz'];return grp3((f/u).toFixed(6))+' '+s}
const fmtA=a=>a>=1?a.toFixed(3)+' Vpp':(a*1000).toFixed(1)+' mVpp';
const fmtO=o=>Math.abs(o)>=1?o.toFixed(3)+' V':(o*1000).toFixed(1)+' mV';
function fgSet(k,v){const f=S.fg,lim=f.load==='50'?5:10;let msg='';
  if(k==='freq'){const mx=f.wave==='sine'?25e6:f.wave==='ramp'?1e6:12.5e6;if(v>mx||v<1e-3)msg='Frequency out of range';v=clamp(v,1e-3,mx)}
  if(k==='amp'){const mx=2*(lim-Math.abs(f.off));if(v>mx||v<1e-3)msg='Amplitude limited by offset and load';v=clamp(v,1e-3,mx)}
  if(k==='off'){const mx=lim-f.amp/2;if(Math.abs(v)>mx)msg='Offset limited by amplitude';v=clamp(v,-mx,mx)}
  if(k==='duty'){if(v<10||v>90)msg='Duty range 10–90 %';v=clamp(v,10,90)}
  f[k]=+v.toPrecision(10);f.msg=msg;dirty=true}
function fgSoft(){const f=S.fg;
  if(f.entry!=null){const u=FGF[f.field].u.map(x=>x[0]);while(u.length<4)u.push('');u.push('Cancel');return u}
  if(f.menu==='util')return ['System','Setup','','','Back'];
  if(f.menu==='sys')return ['Set to Default','','','','Back'];
  if(f.menu==='setup')return ['CH1 Load|'+(f.load==='50'?'50 Ω':'High Z'),'','','','Back'];
  return ['Frequency','Amplitude','Offset',f.wave==='pulse'?'Duty':'','']}
function fgSoftPress(k){const f=S.fg,lab=fgSoft()[k];if(!lab)return;
  if(f.entry!=null){if(lab==='Cancel'){f.entry=null}else{const u=FGF[f.field].u[k],v=parseFloat(f.entry);if(isFinite(v))fgSet(f.field,v*u[1]);f.entry=null}}
  else if(f.menu==='util'){if(k===0)f.menu='sys';if(k===1)f.menu='setup';if(k===4)f.menu='main'}
  else if(f.menu==='sys'){if(k===0){Object.assign(f,JSON.parse(JSON.stringify(FG_DEFAULT)));f.msg='Restored defaults: 1 kHz, 1 Vpp sine, Load 50 Ω';dirty=true}if(k===4)f.menu='util'}
  else if(f.menu==='setup'){if(k===0){f.load=f.load==='50'?'hz':'50';fgSet('amp',f.amp)}if(k===4)f.menu='util'}
  else f.field=['freq','amp','off','duty'][k];
  fgRender()}
function fgKey(t){const f=S.fg;
  if(t==='left'||t==='right'){const k=f.field||'freq';f.field=k;f.step[k]+=t==='left'?1:-1;f.step[k]=clamp(f.step[k],-3,7);fgRender();return}
  if(t==='esc'){f.entry=null;fgRender();return}
  if(t==='bs'){if(f.entry!=null)f.entry=f.entry.slice(0,-1);fgRender();return}
  if(!f.field||f.menu!=='main'){f.field=f.field||'freq';f.menu='main'}
  if(f.entry==null)f.entry='';
  if(t==='±'){f.entry=f.entry.startsWith('-')?f.entry.slice(1):'-'+f.entry}
  else if(t==='.'){if(!f.entry.includes('.'))f.entry+=f.entry===''||f.entry==='-'?'0.':'.'}
  else if(f.entry.replace(/[-.]/g,'').length<10)f.entry+=t;
  fgRender()}
function fgTurn(d){const f=S.fg,k=f.field||'freq';f.field=k;f.entry=null;fgSet(k,f[k]+d*10**f.step[k]);fgRender()}
function wavePath(w,duty){let p='';for(let i=0;i<=120;i++){const ph=(i/60)%1,y=fgShape(ph===0&&i>0?0.99999:ph,w,duty/100);p+=(i?'L':'M')+(3+i*0.66).toFixed(1)+' '+(32-y*22).toFixed(1)}return p}
function fgRender(){const f=S.fg,soft=fgSoft(),step=10**f.step[f.field||'freq'],su=FGF[f.field||'freq'].su;
  const rows=[['freq',fmtF(f.freq)],['amp',fmtA(f.amp)],['off',fmtO(f.off)]];if(f.wave==='pulse')rows.push(['duty',f.duty.toFixed(1)+' %']);
  $('#fgScreen').innerHTML=`<div class="fg-top"><span class="fg-ch ${f.on?'':'off'}">CH1 ${f.on?'Output On':'Output Off'}</span><span>${{sine:'Sine',square:'Square',ramp:'Ramp',pulse:'Pulse'}[f.wave]}</span><span>Load: ${f.load==='50'?'50 Ω':'High Z'}</span></div>
  <div class="fg-main"><svg class="fg-wave" viewBox="0 0 86 64" aria-hidden="true"><line x1="0" y1="32" x2="86" y2="32" stroke="#284154"/><path d="${wavePath(f.wave,f.duty)}" fill="none" stroke="#e8c518" stroke-width="1.6"/></svg>
  <div class="fg-params">${rows.map(([k,v])=>`<span class="n ${f.field===k?'sel':''}">${FGF[k].n}</span><span class="v ${f.field===k?'sel':''}">${f.field===k&&f.entry!=null?`<span class="fg-entry">${f.entry||'_'}</span>`:v}</span>`).join('')}</div></div>
  <div style="font-size:11px;color:${f.msg?'#ff9f7a':'#8fb3c9'}">${f.msg||(f.entry!=null?'Type the value, then press a unit soft key':(f.menu!=='main'?'Utility menu':'Knob step: '+eng(step,su).replace(/\.00|\.0(?= )/,'')+' · ◀ ▶ moves the cursor'))}</div>
  <div class="fg-soft">${soft.map(s=>`<div class="${s?'':'empty'}">${s.replace('|','<br>')}</div>`).join('')}</div>`;
  $$('[data-wave]').forEach(b=>b.classList.toggle('lit',b.dataset.wave===f.wave));
  $('#fgOut').classList.toggle('on',f.on);$('#fgUtil').classList.toggle('lit',f.menu!=='main');
  showHints()}

/* ================= knobs ================= */
const KA={};
$$('[data-knob]').forEach(el=>{const id=el.dataset.knob,lab=el.dataset.label;el.className='kw';
  el.innerHTML=`<div class="knob${el.dataset.big?' big':''}" tabindex="0" role="slider" aria-label="${lab}"><span class="tick"></span></div><div class="karr"><button type="button" aria-label="${lab}: turn anticlockwise">◀</button><button type="button" aria-label="${lab}: turn clockwise">▶</button></div><div class="kl">${lab}</div>`;
  const k=el.querySelector('.knob'),tk=k.querySelector('.tick');KA[id]=0;
  const rot=d=>{KA[id]+=d*18;tk.style.transform=`rotate(${KA[id]}deg)`};
  const go=d=>{rot(d);turn(id,d)};
  let sy=0,sx=0,acc=0,moved=0,down=false;
  k.addEventListener('pointerdown',e=>{down=true;sy=e.clientY;sx=e.clientX;acc=0;moved=0;try{k.setPointerCapture(e.pointerId)}catch(_){}});
  k.addEventListener('pointermove',e=>{if(!down)return;const d=(sy-e.clientY)+(e.clientX-sx);sy=e.clientY;sx=e.clientX;acc+=d;moved+=Math.abs(d);while(acc>=10){go(1);acc-=10}while(acc<=-10){go(-1);acc+=10}});
  k.addEventListener('pointerup',()=>{if(down&&moved<4)push(id);down=false});
  k.addEventListener('pointercancel',()=>{down=false});
  k.addEventListener('wheel',e=>{e.preventDefault();go(e.deltaY<0?1:-1)},{passive:false});
  k.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();go(1)}else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();go(-1)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();push(id)}});
  const [bl,br]=el.querySelectorAll('.karr button');bl.onclick=()=>go(-1);br.onclick=()=>go(1)});
function turn(id,d){const sc=S.sc;
  switch(id){
    case 'c1pos':case 'c2pos':{const ch=sc.ch[+id[1]-1];ch.pos=clamp(+(ch.pos+0.1*d).toFixed(2),-5,5);break}
    case 'c1sc':case 'c2sc':{const ch=sc.ch[+id[1]-1],seq=VSEQ.map(v=>v*ch.probe);let i=seq.findIndex(v=>Math.abs(v-ch.vdiv)/v<1e-3);if(i<0)i=8;ch.vdiv=seq[clamp(i-d,0,seq.length-1)];break}
    case 'hsc':{let i=TSEQ.findIndex(v=>Math.abs(v-sc.tdiv)/v<1e-3);if(i<0)i=15;sc.tdiv=TSEQ[clamp(i-d,0,TSEQ.length-1)];sc.hpos=clamp(sc.hpos,-5*sc.tdiv,5*sc.tdiv);break}
    case 'hpos':sc.hpos=+clamp(sc.hpos+d*sc.tdiv/5,-5*sc.tdiv,5*sc.tdiv).toPrecision(4);break;
    case 'tlev':{const ch=sc.ch[sc.trig.src];sc.trig.level=+(sc.trig.level+d*ch.vdiv/10).toPrecision(4);break}
    case 'mp':if(sc.mlist)sc.mlist.idx=(sc.mlist.idx+d+MT.length)%MT.length;break;
    case 'fg':fgTurn(d);return}
  if(sc.run)dirty=true;needDraw=true}
function push(id){const sc=S.sc;
  if(id==='c1pos'||id==='c2pos')sc.ch[+id[1]-1].pos=0;
  else if(id==='hpos')sc.hpos=0;
  else if(id==='tlev'&&CAP){const m=meas(CAP.d[sc.trig.src],sc.trig.src,CAP.dt);sc.trig.level=+((m.mx+m.mn)/2).toPrecision(3)}
  else if(id==='mp'&&sc.mlist)toggleMeas(sc.mlist.ch,MT[sc.mlist.idx][0]);
  dirty=true;needDraw=true}
function toggleMeas(ch,k){const sc=S.sc,i=sc.meas.findIndex(e=>e.ch===ch&&e.k===k);if(i>=0)sc.meas.splice(i,1);else{sc.meas.push({ch,k});if(sc.meas.length>6)sc.meas.shift()}needDraw=true}

/* ================= scope buttons ================= */
function updKeys(){const sc=S.sc;$('#bCh1').classList.toggle('on',sc.ch[0].on);$('#bCh2').classList.toggle('on',sc.ch[1].on);
  const r=$('#bRun');r.classList.toggle('lit',sc.run);r.classList.toggle('red',!sc.run);
  $('#bMeasure').classList.toggle('lit',sc.menu==='meas');$('#bTrigM').classList.toggle('lit',sc.menu==='trig');needDraw=true;showHints()}
function chKey(i){const sc=S.sc,ch=sc.ch[i],m='ch'+(i+1);
  if(!ch.on){ch.on=true;sc.menu=m}else if(sc.menu===m){ch.on=false;sc.menu=null}else sc.menu=m;
  sc.mlist=null;dirty=true;updKeys()}
$('#bCh1').onclick=()=>chKey(0);$('#bCh2').onclick=()=>chKey(1);
$('#bMeasure').onclick=()=>{const sc=S.sc;sc.menu=sc.menu==='meas'?null:'meas';sc.mlist=null;updKeys()};
$('#bTrigM').onclick=()=>{const sc=S.sc;sc.menu=sc.menu==='trig'?null:'trig';sc.mlist=null;updKeys()};
$('#bDefault').onclick=()=>{Object.assign(S.sc,SC_DEFAULT());dirty=true;updKeys()};
$('#bAuto').onclick=autoset;
$('#bRun').onclick=()=>{S.sc.run=!S.sc.run;S.sc.single=false;dirty=true;updKeys()};
$('#bSingle').onclick=()=>{S.sc.run=true;S.sc.single=true;dirty=true;updKeys()};
$$('[data-ss]').forEach(b=>b.onclick=()=>{const sc=S.sc,k=+b.dataset.ss,m=sc.menu;if(!m)return;
  if(m==='ch1'||m==='ch2'){const ch=sc.ch[m==='ch1'?0:1];
    if(k===0)ch.cpl={DC:'AC',AC:'GND',GND:'DC'}[ch.cpl];
    if(k===1)ch.inv=!ch.inv;
    if(k===2){const np=ch.probe===10?1:10;ch.vdiv=ch.vdiv*np/ch.probe;if(sc.trig.src===(m==='ch1'?0:1))sc.trig.level*=np/ch.probe;ch.probe=np}
    if(k===4)sc.menu=null}
  else if(m==='meas'){if(k===0||k===1)sc.mlist=sc.mlist&&sc.mlist.ch===k?null:{ch:k,idx:0};if(k===2)sc.meas=[];if(k===4){sc.menu=null;sc.mlist=null}}
  else if(m==='trig'){if(k===0)sc.trig.src=1-sc.trig.src;if(k===1)sc.trig.slope=sc.trig.slope==='rise'?'fall':'rise';if(k===2)sc.trig.mode=sc.trig.mode==='auto'?'normal':'auto';if(k===3)push('tlev');if(k===4)sc.menu=null}
  dirty=true;updKeys()});
cv.addEventListener('click',e=>{const L=S.sc.mlist;if(!L||!L.box)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  const k=Math.round((y-L.box.by-28)/17);if(x>L.box.bx&&x<L.box.bx+L.box.bw&&k>=0&&k<MT.length){L.idx=k;toggleMeas(L.ch,MT[k][0])}});

/* FG wiring */
$$('[data-fs]').forEach(b=>b.onclick=()=>fgSoftPress(+b.dataset.fs));
$$('#fgPad .key').forEach(b=>b.onclick=()=>fgKey(b.dataset.pk||b.textContent.trim()));
$$('[data-wave]').forEach(b=>b.onclick=()=>{S.fg.wave=b.dataset.wave;S.fg.menu='main';S.fg.entry=null;fgSet('freq',S.fg.freq);fgRender()});
$('#fgUtil').onclick=()=>{S.fg.menu='util';S.fg.entry=null;fgRender()};
$('#fgBack').onclick=()=>{const f=S.fg;if(f.entry!=null)f.entry=null;else f.menu=f.menu==='sys'||f.menu==='setup'?'util':'main';fgRender()};
$('#fgOut').onclick=()=>{S.fg.on=!S.fg.on;dirty=true;fgRender()};
