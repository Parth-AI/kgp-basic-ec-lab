/* KGP Lab Bench · App shell: links to each experiment, theme, help/about, export, offline install */
const EMBED=(()=>{try{return window.self!==window.top}catch(e){return true}})();
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

/* shareable links: #e2-rc, #e4-ce, #e5-noninv … */
function hashSet(){const h=S.exp+'-'+S.circ[S.exp];if(location.hash.slice(1)!==h){try{location.replace('#'+h)}catch(e){}}}
function hashApply(){const m=/^#(e[2-5])(?:-([a-z0-9]+))?$/.exec(location.hash||'');if(!m)return false;S.exp=m[1];if(m[2]&&CIRC[m[2]]&&CIRC[m[2]].exp===m[1])S.circ[m[1]]=m[2];return true}
window.addEventListener('hashchange',()=>{const e=S.exp,c=S.circ[S.exp];if(hashApply()&&(e!==S.exp||c!==S.circ[S.exp])){renderNav();renderBoard()}});

/* theme: system → light → dark */
const THEMES=['system','light','dark'];
function applyTheme(t){const r=document.documentElement;if(t==='system')delete r.dataset.theme;else r.dataset.theme=t;
  const b=$('#themeBtn');if(b){b.textContent={system:'Theme: Auto',light:'Theme: Light',dark:'Theme: Dark'}[t];b.setAttribute('aria-label','Theme: '+t+'. Click to change.')}
  try{drawPlot()}catch(e){}}
let THEME=store.get('kgpbench.theme');if(!THEMES.includes(THEME))THEME='system';applyTheme(THEME);
$('#themeBtn').onclick=()=>{THEME=THEMES[(THEMES.indexOf(THEME)+1)%3];store.set('kgpbench.theme',THEME);applyTheme(THEME)};

/* dialogs */
function openDlg(id){const d=$(id);if(d.showModal)d.showModal();else d.setAttribute('open','')}
$('#helpBtn').onclick=()=>openDlg('#helpDlg');$('#aboutBtn').onclick=()=>openDlg('#aboutDlg');
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
if(!store.get('kgpbench.welcomed'))$('#welcome').hidden=false;
const welcomed=()=>{store.set('kgpbench.welcomed','1');$('#welcome').hidden=true};
$('#welcomeHelp').onclick=()=>{welcomed();openDlg('#helpDlg')};$('#welcomeClose').onclick=welcomed;
let resetArm=false;$('#resetBtn').onclick=()=>{const b=$('#resetBtn');
  if(!resetArm){resetArm=true;b.textContent='Click again to erase everything';b.classList.add('danger');setTimeout(()=>{resetArm=false;b.textContent='Clear all saved wiring and readings';b.classList.remove('danger')},4000);return}
  ['kgpbench.wires2','kgpbench.log2','kgpbench.log','kgpbench.view','kgpbench.hints','kgpbench.hints2','kgpbench.welcomed'].forEach(k=>store.del(k));
  for(const k in WIRES)WIRES[k]=[];GS.log={};b.textContent='Cleared';resetArm=false;$('#aboutDlg').close();BV.msg='All saved wiring and readings were cleared.';derive(false);renderBoard()};

/* toast */
function toast(msg,act,fn){const t=$('#toast');t.innerHTML=`<span>${msg}</span>${act?`<button type="button">${act}</button>`:''}`;t.hidden=false;if(act)t.querySelector('button').onclick=fn;else setTimeout(()=>{t.hidden=true},3500)}

/* export (works on the published site; a sandboxed preview blocks downloads) */
function download(name,blob){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function csvRows(){const k=gkind(),L=grows(),q=v=>`"${String(v).replace(/"/g,'""')}"`,n=v=>v==null||!isFinite(v)?'':+(+v).toPrecision(6);
  if(k==='freq')return [['series','f_Hz','Vin_pp_V','Vout_pp_V','Vout_over_Vin','gain_dB','off_screen'],...L.map(r=>[q(r.s),n(r.f),n(r.a),n(r.b),n(r.b/r.a),n(20*Math.log10(r.b/r.a)),r.q?1:0])];
  if(k==='transfer')return [['series','Vin_V','Vout_V','gain','dc_reading','off_screen'],...L.map(r=>[q(r.s),n(r.a),n(r.b),n(r.b/r.a),r.dc?1:0,r.q?1:0])];
  if(k==='reg')return [['circuit','load','Vout_V','IL_A','ripple_pp_V'],...L.map(r=>[q(r.s),q(r.c),n(r.v),n(r.i),n(r.rip)])];
  return [['load','Vin_pp_V','VL_pp_V','VL_over_Vin','thevenin_ratio'],...L.map(r=>[q(r.s),n(r.a),n(r.b),n(r.b/r.a),n(r.th)])]}
$('#bCsv').onclick=()=>{if(!grows().length){gmsg('Record some readings first.',true);return}download(`kgp-lab-${cur().id}-${gkind()}.csv`,new Blob([csvRows().map(r=>r.join(',')).join('\n')],{type:'text/csv'}))};
$('#bPng').onclick=()=>{const src=$('#plot');if(src.hidden||!src.width){gmsg('There is no graph for this part.',true);return}const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d');
  g.fillStyle=getComputedStyle(document.body).backgroundColor||'#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(src,0,0);c.toBlob(b=>b&&download(`kgp-lab-${cur().id}-${gkind()}.png`,b),'image/png')};
if(EMBED){$('#bCsv').hidden=true;$('#bPng').hidden=true}

/* offline + install (only on the published site) */
if(!EMBED&&'serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').then(reg=>{reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)toast('A new version of Lab Bench is ready.','Reload',()=>location.reload())})})}).catch(()=>{})})}
let installEvt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!installEvt)return;installEvt.prompt();try{await installEvt.userChoice}catch(e){}installEvt=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;toast('Installed. Lab Bench now works offline too.')});
