/* KGP Lab Bench · Start-up and animation loop */
/* ================= boot ================= */
Object.assign(S.fg,{wave:'sine',freq:20e3,amp:6,load:'hz',on:true,field:'freq'});
S.sc.ch.forEach(ch=>{ch.on=true;ch.probe=1;ch.vdiv=1});
S.sc.meas=[{ch:0,k:'pk'},{ch:0,k:'fr'},{ch:1,k:'pk'},{ch:1,k:'fr'}];
hashApply();renderNav();renderBoard();fgRender();fit();S.sc.tdiv=25e-6;S.sc.ch.forEach(ch=>{ch.vdiv=1;ch.pos=0});S.sc.ch[0].pos=2;S.sc.ch[1].pos=-2;dirty=true;updKeys();
let last=0,lastD=0;
function tick(ts){
  if(S.sc.run&&(dirty||ts-last>120)){CAP=capture();last=ts;dirty=false;needDraw=true;if(S.sc.single){S.sc.run=false;S.sc.single=false;updKeys()}}
  if(needDraw)draw();
  if(ts-lastD>350){showDmm();lastD=ts}
  requestAnimationFrame(tick)}
requestAnimationFrame(tick);
