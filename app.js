/*! KGP Lab Bench — built 2026-11-06 */
(()=>{
/* ---- 01-models.js ---- */
/* KGP Lab Bench · Units, filters, instrument state and the circuit models for each experiment */
/* ================= core: units, filters, sources ================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const TAU=2*Math.PI, SQ2=Math.SQRT2;
const par=(a,b)=>(!isFinite(a)?b:!isFinite(b)?a:a*b/(a+b));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PFX=[[1e6,'M'],[1e3,'k'],[1,''],[1e-3,'m'],[1e-6,'µ'],[1e-9,'n'],[1e-12,'p']];
function eng(v,u='',sig=3){
  if(v==null||!isFinite(v))return '?';
  if(v===0)return '0'+(u?' '+u:'');
  const a=Math.abs(v);
  for(const [p,s] of PFX){ if(a>=p*0.9995||p===1e-12){ let m=(v/p).toPrecision(sig); if(Math.abs(+m)>=1000&&p<1e6){continue} return m+' '+s+u; } }
  return v.toPrecision(sig)+' '+u;
}
function lp(x,dt,tau){const n=x.length,y=new Float64Array(n);if(!(tau>0)||tau<dt*1e-3){y.set(x);return y}
  const a=Math.exp(-dt/tau);let s=0;for(let i=0;i<n;i++)s+=x[i];s/=n;
  for(let i=0;i<n;i++){s=x[i]+(s-x[i])*a;y[i]=s}return y}
function hp(x,dt,tau){const l=lp(x,dt,tau),n=x.length,y=new Float64Array(n);if(!(tau>0)){return y}for(let i=0;i<n;i++)y[i]=x[i]-l[i];return y}
const mul=(x,k)=>{const y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=x[i]*k;return y};
const add=(a,b,kb=1)=>{const y=new Float64Array(a.length);for(let i=0;i<a.length;i++)y[i]=a[i]+kb*b[i];return y};
const konst=(n,v)=>new Float64Array(n).fill(v);
function knee(v,up,dn){ // soft-knee clip: linear to 85% of each limit
  if(v>=0){const k=.85*up;return v<k?v:k+(up-k)*Math.tanh((v-k)/(up-k||1e-9))}
  const k=.85*dn,a=-v;return -(a<k?a:k+(dn-k)*Math.tanh((a-k)/(dn-k||1e-9)))}

/* ================= state ================= */
const FG_DEFAULT={wave:'sine',freq:1000,amp:1,off:0,duty:50,on:false,load:'50',field:null,entry:null,menu:'main',step:{freq:2,amp:-1,off:-1,duty:0},msg:''};
const SC_DEFAULT=()=>({ch:[{on:true,vdiv:1,pos:0,cpl:'DC',probe:10,inv:false},{on:false,vdiv:1,pos:0,cpl:'DC',probe:10,inv:false}],
  tdiv:500e-6,hpos:0,trig:{src:0,level:0,slope:'rise',mode:'auto'},run:true,single:false,menu:null,mlist:null,meas:[]});
const S={exp:'e2',circ:{e2:'div',e3:'rect',e4:'ce',e5:'inv'},b:{},fg:{...FG_DEFAULT,step:{...FG_DEFAULT.step}},sc:SC_DEFAULT(),log:{}};
try{const L=JSON.parse(localStorage.getItem('kgpbench.log')||'{}');if(L&&typeof L==='object')S.log=L}catch(e){}
const saveLog=()=>{try{localStorage.setItem('kgpbench.log',JSON.stringify(S.log))}catch(e){}};

/* function generator output (open-circuit EMF the circuit sees) */
function fgShape(ph,w,duty){
  switch(w){case 'sine':return Math.sin(TAU*ph);
    case 'square':return ph<.5?1:-1;
    case 'pulse':return ph<duty?1:-1;
    case 'ramp':return ph<.25?4*ph:ph<.75?2-4*ph:4*ph-4;}
  return 0}
function fgSignal(n,dt){
  const f=S.fg,x=new Float64Array(n);if(!f.on)return x;
  const g=f.load==='50'?2:1, A=f.amp/2*g, O=f.off*g, d=f.duty/100;
  for(let i=0;i<n;i++){let ph=(i*dt*f.freq)%1;x[i]=A*fgShape(ph,f.wave,d)+O}
  return x}

/* ================= circuits ================= */
const B=(id)=>S.b[id];
const RS=50; // generator source resistance
const CIRC={};
function defC(id,o){CIRC[id]=Object.assign({id,src:'fg',jumpers:[],params:[]},o);S.b[id]=Object.assign({},o.init)}

/* --- Exp 2: voltage divider (Fig i, ii) --- */
defC('div',{exp:'e2',name:'Voltage divider',
  init:{R1:10e3,R2:10e3,R3:10e3,R4:4.7e3,Co:1e-6,j74:false,j64:false},
  params:[['R1','Ω'],['R2','Ω'],['R3','Ω'],['R4','Ω'],['Co','F']],
  jumpers:[['j74','T7–T4','connects R3 as load'],['j64','T6–T4','connects R4 as load']],
  probes:{ch1:'T1 (V_in)',ch2:'T4 (V_L)'},nodes:{vin:'T1 (V_in)',vl:'T4 (V_L)'},
  RL(b){let r=Infinity;if(b.j74)r=par(r,b.R3);if(b.j64)r=par(r,b.R4);return r},
  tau(b){return b.Co*(b.R1+b.R2)},
  run(x,dt,b){const R2e=par(b.R2,this.RL(b)),Rin=b.R1+R2e;const v2=hp(mul(x,Rin/(Rin+RS)),dt,b.Co*(Rin+RS));
    return {vin:mul(x,Rin/(Rin+RS)),vl:mul(v2,R2e/(b.R1+R2e)),v2}},
  theory(b){const vth=b.R2/(b.R1+b.R2),ro=par(b.R1,b.R2),rl=this.RL(b),k=isFinite(rl)?vth*rl/(rl+ro):vth;
    const vin=S.fg.amp*(S.fg.load==='50'?2:1);
    return [['Thevenin V_th / V_in',(vth).toFixed(3),'R2/(R1+R2)'],['R_out = R1‖R2',eng(ro,'Ω'),'Thevenin resistance'],
      ['Load now',isFinite(rl)?eng(rl,'Ω'):'none (R_L = ∞)','from your jumpers'],['V_L / V_in',k.toFixed(3),'V_th·R_L/(R_L+R_out)'],
      ['Expected V_L p-p',eng(k*vin,'V'),'for the generator output now'],['Xc of Co at f',eng(1/(TAU*S.fg.freq*b.Co),'Ω'),'should be ≪ R1']]},
  proc:['Connect the divider of Fig (i)/(ii): generator HI to T1, LO to GROUND.','Set the generator to a 6 Vpp, 20 kHz sine. Put CH1 on T1 and measure its amplitude and frequency.','Measure V_L on CH2 at T4 for (a) no load, (b) R_L = R3 (join T7–T4), (c) R_L = R4 (join only T6–T4), (d) R3‖R4 (join T6 and T7 to T4).','Compare each with the Thevenin model: V_L = V_th·R_L/(R_L + R1‖R2). At 20 kHz, Xc of Co ≪ R1.']});

/* --- Exp 2: R-C, C-R, R-L networks (Fig iii–vi) --- */
const netProc=(kind)=>[ 'Record the R and '+(kind==='rl'?'L':'C')+' values on your board.','Apply a sine of about 1.2 Vpp. Display V_in on CH1 and V_out on CH2.','Keep the input amplitude constant and vary frequency from 100 Hz to 500 kHz. Take more readings where V_out changes fast.','Plot V_out/V_in against frequency (log axis), name the filter type and find the 3 dB cut-off f_c.',
  kind==='rl'?'Compare with f_c = R/(2πL).':'Compare with f_c = 1/(2πRC).',
  'Pulse response: switch to a 1.2 Vpp square wave and use the settings in the manual table ('+(kind==='rc'?'150 Hz, 1 ms/div, 0.2 V/div for T ≫ RC; 1.5 kHz, 0.2 ms/div, 0.1 V/div for the integrator':kind==='rl'?'15 kHz, 50 µs/div, 0.2 V/div, differentiator':'1.5 kHz, 0.1 ms/div, 0.2 V/div, differentiator')+').',
  kind==='rc'?'For the T ≫ RC display, measure the 10–90 % rise time and compare with 2.2RC = 0.35/f_c.':'Try other repetition frequencies and watch the spikes widen or narrow.'];
function netC(id,name,fig,kind,R,X){
  defC(id,{exp:'e2',name,fig,kind,init:kind==='rl'?{R,L:X,rL:15}:{R,C:X},
    params:kind==='rl'?[['R','Ω'],['L','H'],['rL','Ω']]:[['R','Ω'],['C','F']],
    probes:{ch1:'V_in',ch2:'V_out'},nodes:{vin:'V_in',vout:'V_out'},
    tau(b){return kind==='rl'?b.L/(b.R+b.rL+RS):b.C*(b.R+RS)},
    run(x,dt,b){
      if(kind==='rc')return {vin:x,vout:lp(x,dt,b.C*(b.R+RS))};
      if(kind==='cr')return {vin:x,vout:mul(hp(x,dt,b.C*(b.R+RS)),b.R/(b.R+RS))};
      const Rt=b.R+RS+b.rL,t=b.L/Rt;return {vin:x,vout:add(mul(x,b.rL/Rt),hp(x,dt,t),(b.R+RS)/Rt*0+1-b.rL/Rt)}},
    theory(b){
      if(kind==='rl'){const fc=(b.R+b.rL)/(TAU*b.L),t=b.L/(b.R+b.rL);return [['f_c = R/2πL',eng(fc,'Hz'),'high-pass (output across L)'],['Time constant L/R',eng(t,'s'),'pulse: T ≫ L/R gives spikes'],['Inductor resistance',eng(b.rL,'Ω'),'sets the small floor at low f']]}
      const fc=1/(TAU*b.R*b.C),t=b.R*b.C;
      return [['f_c = 1/2πRC',eng(fc,'Hz'),kind==='rc'?'low-pass':'high-pass'],['Time constant RC',eng(t,'s'),'pulse response scale'],
        kind==='rc'?['Rise time 2.2RC',eng(2.2*t,'s'),'= 0.35/f_c']:['Gain at f_c',' 0.707 (−3 dB)','phase +45°'],
        ['Gain at '+eng(S.fg.freq,'Hz'),(kind==='rc'?1/Math.hypot(1,S.fg.freq/fc):1/Math.hypot(1,fc/S.fg.freq)).toFixed(3),'V_out/V_in now']]},
    proc:netProc(kind)})}
netC('rc','R-C · Fig iii','iii','rc',10e3,0.1e-6);
netC('cr4','C-R · Fig iv','iv','cr',10e3,0.01e-6);
netC('cr5','C-R · Fig v','v','cr',1e3,0.01e-6);
netC('rl','R-L · Fig vi','vi','rl',1e3,2.2e-3);

/* --- Exp 3: rectifier & power supply --- */
const RJ=[['T1F','T1–F'],['T2G','T2–GND'],['J12','1–2'],['J31','3–1'],['T1B1','T1–B1'],['T2B2','T2–B2'],['J5G','5–GND'],['J42','4–2'],['J6C','6–C'],['JC7','C–7'],['JC8','C–8'],['L1','Load 1–Output'],['L2','Load 2–Output']];
defC('rect',{exp:'e3',name:'Rectifier & power supply',src:'mains',
  init:Object.assign({Vs:9,Vz:6.2,C:100e-6,RL1:820,RL2:1000,Rb:8.3e3,Rz:100,Rw:8,p1:'x12'},Object.fromEntries(RJ.map(j=>[j[0],false])),{T1F:true,T2G:true,J12:true}),
  params:[['Vs','V'],['Vz','V'],['C','F']],
  jumpers:RJ.map(j=>[j[0],j[1]]),
  probes:{ch1:'Secondary',ch2:'Output terminal'},nodes:{out:'Output',unreg:'Unregulated DC',sec:'Secondary (CH1 point)'},
  mode(b){const br=b.T1B1&&b.T2B2&&b.J5G&&b.J42,hw=b.T1F&&b.T2G&&b.J12,any=b.T1F||b.T2G||b.J12||b.J31||b.T1B1||b.T2B2||b.J5G||b.J42;
    if(br&&(b.T1F||b.T2G||b.J12||b.J31))return {m:null,err:'Bridge and centre-tap links are mixed. Remove all connections first, as the manual says.'};
    if(br)return {m:'br'};
    if(hw&&(b.T1B1||b.T2B2||b.J5G||b.J42))return {m:null,err:'Bridge links are mixed with the half-wave links. Remove all connections first.'};
    if(hw)return {m:b.J31?'ct':'hw'};
    return {m:null,err:any?'Rectifier circuit incomplete: no path from transformer to the Unregulated DC terminal.':'No rectifier connections yet.'}},
  reg(b){return b.JC7&&b.JC8?'both':b.JC7?'z':b.JC8?'ic':null},
  RL(b){let r=Infinity;if(b.L1)r=par(r,b.RL1);if(b.L2)r=par(r,b.RL2);return r},
  tau(){return 0.08},
  run(x,dt,b){
    const n=x.length,Vp=b.Vs*SQ2,{m}=this.mode(b),reg=this.reg(b),RL=this.RL(b),hasC=b.J6C;
    const sec=new Float64Array(n),out=new Float64Array(n),un=new Float64Array(n),t1=new Float64Array(n),t2=new Float64Array(n),t3=new Float64Array(n);
    const drop=m==='br'?1.4:0.7;let vC=m?Math.max(Vp-drop,0)*0.97:0;const kc=1-Math.exp(-dt/(b.Rw*b.C));
    for(let i=0;i<n;i++){
      const v1=Vp*Math.sin(TAU*50*i*dt);
      t1[i]=v1;t3[i]=-v1;sec[i]=b.p1==='x12'?v1:b.p1==='x23'?-v1:2*v1;
      let vr=0;
      if(m==='hw')vr=v1-0.7;else if(m==='ct')vr=Math.abs(v1)-0.7;else if(m==='br')vr=Math.abs(v1)-1.4;
      vr=Math.max(vr,0);
      if(!hasC){
        const rl=reg?b.Rb:par(b.Rb,RL);un[i]=vr*rl/(rl+b.Rw);out[i]=reg?0:un[i];
      }else{
        let iL=vC/b.Rb,vo=vC;
        if(!reg)iL+=isFinite(RL)?vC/RL:0;
        else if(reg==='z'){const vd=isFinite(RL)?vC*RL/(RL+b.Rz):vC;vo=Math.min(vd,b.Vz);iL+=Math.max(vC-vo,0)/b.Rz}
        else if(reg==='ic'){vo=vC>=8?6:Math.max(vC-2,0);iL+=(isFinite(RL)?vo/RL:0)+0.005}
        else {vo=0}
        vC-=iL*dt/b.C;if(vr>vC)vC+=(vr-vC)*kc;if(vC<0)vC=0;
        un[i]=vC;out[i]=reg==='both'?0:vo}
    }
    return {sec,out,unreg:un,t1,t2,t3}},
  theory(b){const Vp=b.Vs*SQ2,{m}=this.mode(b),vm=Vp-(m==='br'?1.4:0.7),RL=this.RL(b),R=par(b.Rb,RL);
    const fr=m==='hw'?50:100,vdc=m==='hw'?vm/Math.PI:2*vm/Math.PI,vr=m==='hw'?0.385*vm:0.308*vm;
    const rows=[['V_m (peak, after diode drop)',m?eng(vm,'V'):'—','√2·'+b.Vs+' V − '+(m==='br'?'1.4':'0.7')+' V'],['Ripple frequency',m?fr+' Hz':'—',m==='hw'?'half wave':'full wave']];
    if(m&&!b.J6C)rows.push(['V_dc (no filter)',eng(vdc,'V'),m==='hw'?'V_m/π':'2V_m/π'],['V_r(rms)',eng(vr,'V'),m==='hw'?'0.385 V_m':'0.308 V_m'],['Ripple factor',(vr/vdc*100).toFixed(0)+' %',m==='hw'?'≈ 121 %':'≈ 48 %']);
    if(m&&b.J6C){const ipp=vm/R/(fr*b.C);rows.push(['Ripple p-p ≈ V_m/(f·C·R)',isFinite(ipp)?eng(Math.min(ipp,vm),'V'):'—','R = load ‖ 8.3 kΩ bleeder'],['V_dc ≈ V_m − V_r(p-p)/2',eng(vm-Math.min(ipp,vm)/2,'V'),'triangular approximation'],['V_r(rms) = V_r(p-p)/2√3',eng(Math.min(ipp,vm)/(2*Math.sqrt(3)),'V'),'triangular ripple'])}
    rows.push(['Voltage regulation','(V_NL − V_FL)/V_FL','measure V_NL with no load, V_FL with Load 1 + Load 2']);
    return rows},
  note:'Assumed: 9-0-9 V rms transformer, silicon diodes (0.7 V), 6.2 V Zener, about 8 Ω winding resistance. Change V_s and V_z to match your board.',
  proc:['Trace the board and find the transformer, rectifier, filter, regulator and load blocks of Fig 1.','Observe the secondary voltages T1–T2, T2–T3 and T1–T3 on the scope.','Half wave: remove all links, then join T1–F, T2–GND, 1–2. View Unregulated DC against GROUND.','Find V_m and V_r(rms). Switch CH2 coupling between AC and DC to read V_dc from the shift, and check V_dc on the multimeter. Ripple factor = V_r(rms)/V_dc.','Filter: join 6–C. Measure the ripple with AC coupling and a smaller V/div; use the triangular approximation for V_r(rms).','Full wave (centre tap): T1–F, T2–GND, 3–1, 1–2. Bridge: T1–B1, T2–B2, 5–GND, 4–2. Repeat the measurements.','Regulation: measure V_NL (no load), then Load 1, Load 2, and both together for V_FL. V.R = (V_NL − V_FL)/V_FL.','Zener regulator: filtered full wave, then join C–7; the Zener output is now the Output. IC 7806: join C–8 instead.']});

/* --- Exp 4: CE amplifier --- */
defC('ce',{exp:'e4',name:'CE amplifier (BC547)',
  init:{R1:47e3,R2:4.7e3,Rc:6.8e3,RE1:330,RE2:330,Rx:1e3,RL:1e3,Cc:10e-6,CE:100e-6,beta:200,j11:true,j22:true,j2E:false,j33:false,pwr:true},
  params:[['beta',''],['Rc','Ω'],['RL','Ω'],['CE','F'],['Cc','F']],
  jumpers:[['j11','1–1′','shorts R_x'],['j22','2–2′','C_E across R_E2'],['j2E','2–E','C_E across R_E1+R_E2'],['j33','3–3′','connects R_L']],
  probes:{ch1:'V_IN',ch2:'V_out'},nodes:{vin:'V_IN',vout:'V_out',vb:'V_B (base)',vc:'V_C (collector)',ve:'V_E (emitter)'},
  dc(b){if(!b.pwr)return {VB:0,VC:0,VE:0,IC:0,IE:0,re:Infinity,RBB:par(b.R1,b.R2)};const VBB=12*b.R2/(b.R1+b.R2),RBB=par(b.R1,b.R2),RE=b.RE1+b.RE2;
    let IE=(VBB-0.65)/(RE+RBB/(b.beta+1));IE=Math.max(IE,1e-9);const IC=IE*b.beta/(b.beta+1),VE=IE*RE,VB=VE+0.65,VC=12-IC*b.Rc;
    return {VB,VC,VE,IC,IE,re:0.02585/IE,VBB,RBB}},
  ac(b){const d=this.dc(b),RLe=b.j33?b.RL:1e6,Rdeg=b.j2E?0:b.j22?b.RE1:b.RE1+b.RE2,Rac=par(b.Rc,RLe);
    const Rin=par(d.RBB||1,(b.beta+1)*(d.re+Rdeg)),Rx=b.j11?0:b.Rx;return {d,RLe,Rdeg,Rac,Rin,Rx,Av:Rac/(d.re+Rdeg)}},
  tau(b){return Math.min(0.15,Math.max(b.CE*b.RE2,b.Cc*6e3))},
  run(x,dt,b){
    const A=this.ac(b),{d}=A,n=x.length;const Rtot=RS+A.Rx+A.Rin;
    const vin=mul(x,(A.Rx+A.Rin)/Rtot),vs1=mul(x,A.Rin/Rtot);
    if(!b.pwr){return {vin,vs1,vout:new Float64Array(n),vb:konst(n,0),vc:konst(n,0),ve:konst(n,0),ve2:konst(n,0)}}
    let vb=hp(mul(x,A.Rin/Rtot),dt,b.Cc*Rtot);
    const Cin=20e-12+4e-12*(1+A.Av);vb=lp(vb,dt,par(RS+A.Rx,A.Rin)*Cin);
    let ic;
    if(b.j2E||b.j22){const a=d.re+(b.j2E?0:b.RE1),bb=b.j2E?b.RE1+b.RE2:b.RE2,t=bb*b.CE,tp=a*t/(a+bb);
      ic=mul(add(vb,hp(vb,dt,tp),t/tp-1),1/(a+bb))}
    else ic=mul(vb,1/(d.re+b.RE1+b.RE2));
    let vo=mul(hp(mul(ic,-b.Rc),dt,b.Cc*(b.Rc+A.RLe)),A.RLe/(b.Rc+A.RLe));
    vo=lp(vo,dt,A.Rac*150e-12);
    const up=d.IC*A.Rac,dn=Math.max(d.VC-d.VE-0.2,0.05);
    for(let i=0;i<n;i++)vo[i]=knee(vo[i],up,dn);
    const vbN=add(konst(n,d.VB),vb),veN=add(konst(n,d.VE),mul(ic,b.j2E?0:b.RE1)),vcN=add(konst(n,d.VC),vo);
    const ve2=add(konst(n,d.IE*b.RE2),(b.j22||b.j2E)?new Float64Array(n):mul(ic,b.RE2));
    return {vin,vs1,vout:vo,vb:vbN,vc:vcN,ve:veN,ve2}},
  theory(b){const A=this.ac(b),{d}=A;if(!b.pwr)return [['Power','off','connect +12 V and GROUND']];
    const vsm=(Math.min(d.IC*A.Rac,d.VC-d.VE-0.2)*2/A.Av);
    return [['V_B',eng(d.VB,'V'),'β = '+b.beta+', V_BE = 0.65 V'],['V_E',eng(d.VE,'V'),'I_E(R_E1+R_E2)'],['V_C',eng(d.VC,'V'),'12 − I_C·R_C'],['I_C',eng(d.IC,'A'),'active region if V_CE > 0.3 V'],['V_CE',eng(d.VC-d.VE,'V'),'Q-point'],
      ['Mid-band gain |A_v|',A.Av.toFixed(1),'(R_C‖R_L)/(r_e + unbypassed R_E)'],['r_e = 26 mV/I_E',eng(d.re,'Ω'),''],['R_in (base side)',eng(A.Rin,'Ω'),'R1‖R2‖(β+1)(r_e+R_E,unbyp.)'],['Approx. V_SM (input p-p)',eng(vsm,'V'),'before the output clips']]},
  note:'Simplified small-signal model: coupling and bypass capacitors set the lower cut-off, a Miller and wiring capacitance sets the upper cut-off. Clipping limits come from the Q-point.',
  proc:['Trace the circuit of Fig 1 and match the component values.','DC: apply +12 V (and join supply GROUND to circuit GROUND). Measure V_B, V_C, V_E with the multimeter. Work out V_BE, V_CE, I_C, I_E and check the Q-point.','Signal handling: join 1–1′ and 2–2′. Apply about 100 mVp-p at 4 kHz. Measure gain, then raise V_in until the output distorts. That input is V_SM.','Connect the load (3–3′) and find V_SM again.','Frequency response: keep V_in well below V_SM, sweep 100 Hz to 100 kHz, plot 20 log(V_out/V_in) and read the 3 dB lower and upper cut-offs. Repeat without the load.','Effect of C_E: remove 2–2′ and repeat; then try point 2 joined to the emitter (2–E).','R_in: with 1–1′ and 2–2′ joined and 3–3′ open, note V_out. Open 1–1′ and note V_out again. R_in = R_x·V_out,Rx/(V_out,0 − V_out,Rx) − R_s.','R_out: with 3–3′ joined note V_out,RL; open 3–3′ for V_out. R_out = R_L(V_out − V_out,RL)/V_out,RL.']});

/* --- Exp 5: op-amp (741) --- */
function taps(v4){const V4=v4==='m12'?-12:0,R=[5.6e3,3.3e3,1.2e3,2.2e3],I=(12-V4)/(R[0]+R[1]+R[2]+R[3]);
  const V1=12-I*R[0],V2=V1-I*R[1],V3=V2-I*R[2];
  return {V1:[V1,par(R[0],R[1]+R[2]+R[3])],V2:[V2,par(R[0]+R[1],R[2]+R[3])],V3:[V3,par(R[0]+R[1]+R[2],R[3])]}}
const OAP={inv:'Inverting · Fig 2',noninv:'Non-inverting · Fig 3',foll:'Voltage follower · Fig 4',add:'Adder · Fig 5',int:'Integrator · Fig 7',dif:'Differentiator · Fig 8'};
function oaC(cfg){
  const usesRf=cfg==='inv'||cfg==='noninv';
  defC(cfg,{exp:'e5',name:OAP[cfg],cfg,
    init:{Ri:cfg==='int'||cfg==='dif'?1e3:10e3,Rf:cfg==='int'||cfg==='dif'?100e3:10e3,src:cfg==='int'||cfg==='dif'||cfg==='noninv'?'fg':'fg',tap2:'V2',v4:cfg==='inv'||cfg==='foll'?'m12':'gnd',pwr:true,C:cfg==='int'?0.47e-6:0.01e-6},
    params:[],usesRf,
    probes:{ch1:'V_in',ch2:'V_out (pin 6)'},nodes:{vout:'V_out (pin 6)',vin:'V_in',vm:'Pin 2 (inverting input)',...(cfg==='add'?{v2:'V2 input'}:{})},
    vin(x,b,load){if(b.src==='fg')return x;const [v,r]=taps(b.v4)[b.src];return konst(x.length,isFinite(load)?v*load/(load+r):v)},
    tau(b){return cfg==='noninv'?b.Ri*0.47e-6:cfg==='int'?b.Rf*b.C:1e-4},
    run(x,dt,b){
      const n=x.length,GBW=1e6,SR=0.5e6,VS=10.5;
      const load=cfg==='inv'||cfg==='add'?b.Ri:Infinity;
      const vi=this.vin(x,b,load);let y,ng,v2=null;
      if(cfg==='inv'){y=mul(vi,-b.Rf/b.Ri);ng=1+b.Rf/b.Ri}
      else if(cfg==='noninv'){y=add(vi,hp(vi,dt,b.Ri*0.47e-6),b.Rf/b.Ri);ng=1+b.Rf/b.Ri}
      else if(cfg==='foll'){y=Float64Array.from(vi);ng=1}
      else if(cfg==='add'){const [tv,tr]=taps(b.v4)[b.tap2];v2=konst(n,tv*10e3/(10e3+tr));y=mul(add(vi,v2),-1);ng=3}
      else if(cfg==='int'){y=mul(lp(vi,dt,b.Rf*b.C),-b.Rf/b.Ri);ng=1.5}
      else {y=mul(lp(hp(vi,dt,b.Ri*b.C),dt,b.Rf*47e-12),-b.Rf/b.Ri);ng=30}
      if(!b.pwr){return {vin:vi,vout:new Float64Array(n),vm:new Float64Array(n),...(v2?{v2}:{})}}
      y=lp(y,dt,ng/(TAU*GBW));
      const o=new Float64Array(n),st=SR*dt;let p=clamp(y[0],-VS,VS);
      for(let i=0;i<n;i++){p+=clamp(y[i]-p,-st,st);p=clamp(p,-VS,VS);o[i]=p}
      const vm=new Float64Array(n);
      for(let i=0;i<n;i++){
        if(cfg==='inv')vm[i]=(vi[i]*b.Rf+o[i]*b.Ri)/(b.Ri+b.Rf)-o[i]/2e5;
        else if(cfg==='noninv'||cfg==='foll')vm[i]=vi[i]-o[i]/2e5;
        else if(cfg==='add')vm[i]=(vi[i]+v2[i]+o[i])/3-o[i]/2e5;
        else vm[i]=-o[i]/2e5}
      return {vin:vi,vout:o,vm,...(v2?{v2}:{})}},
    theory(b){
      const t=taps(b.v4),f=S.fg.freq,rows=[];
      if(!b.pwr)return [['Power','off','apply +12 V, −12 V and GROUND']];
      const vinDC=b.src==='fg'?null:(()=>{const [v,r]=t[b.src];const L=cfg==='inv'||cfg==='add'?b.Ri:Infinity;return isFinite(L)?v*L/(L+r):v})();
      if(b.src!=='fg')rows.push(['Tap '+b.src+' open-circuit',eng(t[b.src][0],'V'),'V4 '+(b.v4==='m12'?'at −12 V':'grounded')],['V_in actually applied',eng(vinDC,'V'),cfg==='inv'||cfg==='add'?'loaded by R_i (tap R ≈ '+eng(t[b.src][1],'Ω')+')':'no loading']);
      if(cfg==='inv'){const g=-b.Rf/b.Ri;rows.push(['Gain −R_f/R_i',g.toFixed(2),''],['Expected V_out',vinDC!=null?eng(clamp(g*vinDC,-10.5,10.5),'V')+(Math.abs(g*vinDC)>10.5?' (saturated)':''):'gain × V_in','±10.5 V saturation'],['Bandwidth ≈ GBW/(1+R_f/R_i)',eng(1e6/(1-g),'Hz'),'741 GBW ≈ 1 MHz'])}
      if(cfg==='noninv'){const g=1+b.Rf/b.Ri;rows.push(['Gain 1 + R_f/R_i',g.toFixed(2),'output in phase'],['Xc of 0.47 µF at f',eng(1/(TAU*f*0.47e-6),'Ω'),'compare with R_i'],['Bandwidth ≈ GBW/A_f',eng(1e6/g,'Hz'),'gain × bandwidth ≈ 1 MHz'])}
      if(cfg==='foll')rows.push(['Gain','1.00','V_out = V_in until ±10.5 V'],['Pin 2','≈ V_in','not a virtual ground']);
      if(cfg==='add'){const [tv,tr]=t[b.tap2];rows.push(['V2 tap applied',eng(tv*10e3/(10e3+tr),'V'),'tap '+b.tap2+' loaded by 10 kΩ'],['V_out = −(V1 + V2)',vinDC!=null?eng(-(vinDC+tv*10e3/(10e3+tr)),'V'):'−V1 − V2','R_f = R_i = 10 kΩ'])}
      if(cfg==='int'){rows.push(['|Gain| at f = 1/(ωR_iC)',(1/(TAU*f*b.Ri*b.C)).toFixed(2),'valid while ≪ R_f/R_i = 100'],['Phase','+90° (V_out leads −V_in)','sine in, cosine out'],['Square in: triangle p-p',eng(S.fg.amp*(S.fg.load==='50'?2:1)/2/(2*f*b.Ri*b.C)*2,'V'),'V_in·T/2/(R_iC)'])}
      if(cfg==='dif')rows.push(['R_iC (input)',eng(b.Ri*b.C,'s'),'1 kΩ × 0.01 µF'],['Gain at f = ωR_fC',(TAU*f*b.Rf*b.C).toFixed(2),'ideal, before 1 kΩ and 47 pF limits'],['Spike decay ≈ R_iC',eng(b.Ri*b.C,'s'),'square input']);
      return rows},
    proc:{inv:['Power the board: +12 V, −12 V and GROUND. The manual stops drawing these; you still have to connect them.','DC gain: R_i = 10 kΩ, R_f = 10 kΩ. Take +1 V from the voltage divider (V4 to −12 V, use V1).','Measure the actual V_in; it is below 1 V because R_i loads the divider. Compare V_out with −(R_f/R_i)·V_in.','Repeat for R_f = 27 kΩ, 47 kΩ, 100 kΩ.','Virtual ground: with R_f = 100 kΩ, measure pin 2. Then try R_i = 1 kΩ and find where the output saturates.'],
      noninv:['Power the board.','R_i = 10 kΩ, R_f = 10 kΩ. Apply a 1 Vp-p, 10 kHz sine. Measure the gain; is the output inverted?','Repeat for R_f = 27 kΩ, 47 kΩ and 100 kΩ, and tabulate measured against computed gain.','Work out Xc of the 0.47 µF capacitor at 10 kHz and decide whether it matters.','Frequency response from 1 Hz to 100 kHz for each R_f. Find bandwidth and gain × bandwidth.'],
      foll:['Power the board.','Apply +1 V DC. Check whether pin 2 is a virtual ground.','Verify V_out = V_in, then find the most positive and negative inputs where this stops being true.'],
      add:['Power the board.','Apply V1 ≈ +2 V and V2 ≈ +3 V DC from the divider taps. Measure V1, V2 and V_out and compare with −(V1 + V2).','Summing amplifier: feed a 1.5 Vp-p, 1 kHz sine to V1 and +1 V DC to V2. Watch the DC offset on CH2 by switching AC/DC coupling.'],
      int:['Power the board.','Apply a 50 Hz, 1 Vp-p sine. View V_in and V_out together, note the phase difference and the gain.','Apply a 1 Vp-p, 300 Hz square wave and trace the triangular output. Compare with V_out = −(1/RC)∫V_in dt.'],
      dif:['Power the board.','Apply a 0.2 Vp-p, 1 kHz square wave. View input and output together and trace them.','Repeat from 1 kHz to 10 kHz, then for sine and triangle inputs. Compare with V_out = −RC·dV_in/dt.']}[cfg]})}
['inv','noninv','foll','add','int','dif'].forEach(oaC);

const EXPS=[{id:'e2',name:'Exp 2 · RC, CR, RL',title:'Experiment 2 · Signal generator, oscilloscope, RC/CR/RL',circ:['div','rc','cr4','cr5','rl']},
  {id:'e3',name:'Exp 3 · Rectifier',title:'Experiment 3 · Rectifier and power supply',circ:['rect']},
  {id:'e4',name:'Exp 4 · CE amplifier',title:'Experiment 4 · Small-signal CE amplifier',circ:['ce']},
  {id:'e5',name:'Exp 5 · Op-amp 741',title:'Experiment 5 · Analog circuits with the 741',circ:['inv','noninv','foll','add','int','dif']}];
const cur=()=>CIRC[S.circ[S.exp]];
const curB=()=>S.b[cur().id];
function srcFreq(){const c=cur();if(c.src==='mains')return 50;if(c.cfg&&curB().src!=='fg')return 0;return S.fg.on?S.fg.freq:0}

/* ---- 02-scope.js ---- */
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

/* ---- 03-instruments.js ---- */
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

/* ---- 04-boards.js ---- */
/* KGP Lab Bench · Trainer boards drawn from the manual photos */
/* ================= physical trainer boards, drawn from the manual photos ================= */
const BV={view:'board',hints:true,sel:null,msg:'',warn:false,cid:null};
try{if(localStorage.getItem('kgpbench.view')==='circuit')BV.view='circuit';if(localStorage.getItem('kgpbench.hints')==='0')BV.hints=false}catch(e){}
const SOCK={red:['#d8261f','#7f120d'],yellow:['#f2c419','#94720a'],green:['#1f8a3a','#0d4d1f'],black:['#2a2d2f','#050606']};
const SILK='#f3f6f1',TRACE='#e6ebe4',PCBG='#2e8a3d';
const BAND=['#151515','#7a4a1e','#d42a1f','#f07b16','#f2d21b','#2e9c3e','#2459c9','#7d3fb8','#8a8a8a','#f4f4f4'];
function bandsOf(v){if(!(v>0))return [];const e=Math.floor(Math.log10(v)+1e-9);let m=Math.round(v/10**(e-1)),mul=e-1;if(m>=100){m=10;mul++}
  return [BAND[Math.floor(m/10)],BAND[m%10],mul>=0&&mul<=9?BAND[mul]:mul===-1?'#c9a23a':'#bfc3c6','#c9a23a']}
const P2=a=>a.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
const ln=(a,b,c,w)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const tr=(u,...p)=>`<polyline points="${P2(p)}" fill="none" stroke="${TRACE}" stroke-width="${7*u}" stroke-linejoin="round" stroke-linecap="round"/>`;
const silk=(x,y,t,u,o={})=>`<text x="${x}" y="${y}" text-anchor="${o.a||'middle'}"${o.c?` class="${o.c}"`:''}${o.r?` transform="rotate(${o.r} ${x} ${y})"`:''} style="font-size:${(o.s||24)*u}px${o.f?';fill:'+o.f:''}">${t}</text>`;
const box=(x,y,w,h,u,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx*u}" fill="none" stroke="${SILK}" stroke-width="${2.5*u}"/>`;
const geo=(a,b)=>({cx:(a[0]+b[0])/2,cy:(a[1]+b[1])/2,ang:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI});
const grp=(g,inner)=>`<g transform="translate(${g.cx} ${g.cy}) rotate(${g.ang})">${inner}</g>`;
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
function cRes(a,b,v,u,col){const g=geo(a,b),w=58*u,h=17*u,bs=bandsOf(v);
  return ln(a,b,'#b9bec2',3*u)+grp(g,`<rect x="${-w/2-7*u}" y="${-h/2-6*u}" width="${w+14*u}" height="${h+12*u}" fill="none" stroke="${SILK}" stroke-width="${2*u}"/><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${h/2.2}" fill="${col||'#dcc192'}" stroke="#7b6038" stroke-width="${u}"/>`+bs.map((c,i)=>`<rect x="${-w/2+(i<3?10+i*9:42)*u}" y="${-h/2}" width="${5*u}" height="${h}" fill="${c}"/>`).join(''))}
function cFilm(a,b,u,col='#b8572a',w=40,h=18){const g=geo(a,b);return ln(a,b,'#b9bec2',3*u)+grp(g,`<rect x="${-w*u/2-6*u}" y="${-h*u/2-6*u}" width="${w*u+12*u}" height="${h*u+12*u}" fill="none" stroke="${SILK}" stroke-width="${2*u}"/><rect x="${-w*u/2}" y="${-h*u/2}" width="${w*u}" height="${h*u}" rx="${4*u}" fill="${col}" stroke="rgba(0,0,0,.4)" stroke-width="${u}"/>`)}
function cElec(a,b,u,col='#2c4f9e'){const g=geo(a,b),w=42*u,h=32*u;return ln(a,b,'#b9bec2',3*u)+grp(g,`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${6*u}" fill="${col}" stroke="rgba(0,0,0,.4)" stroke-width="${u}"/><rect x="${w/2-10*u}" y="${-h/2}" width="${6*u}" height="${h}" fill="rgba(255,255,255,.55)"/><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h*.32}" rx="${6*u}" fill="rgba(255,255,255,.2)"/>`)}
function cDiode(a,b,u,col='#2a2a2a'){const g=geo(a,b),w=34*u,h=12*u;return ln(a,b,'#b9bec2',3*u)+grp(g,`<rect x="${-w/2-6*u}" y="${-h/2-6*u}" width="${w+12*u}" height="${h+12*u}" fill="none" stroke="${SILK}" stroke-width="${2*u}"/><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${2*u}" fill="${col}"/><rect x="${w/2-9*u}" y="${-h/2}" width="${4*u}" height="${h}" fill="#d9dcdf"/>`)}
const cTO92=(x,y,u)=>box(x-34*u,y-30*u,68*u,64*u,u)+[-12,0,12].map(d=>ln([x+d*u,y+6*u],[x+d*u,y+30*u],'#b9bec2',3*u)).join('')+`<path d="M${x-16*u} ${y+8*u}A${16*u} ${16*u} 0 0 1 ${x+16*u} ${y+8*u}Z" fill="#171717"/>`;
const cDIP=(x,y,u)=>[0,1,2,3].map(i=>`<rect x="${x-28*u+i*17*u}" y="${y-31*u}" width="${7*u}" height="${9*u}" fill="#c7ccd0"/><rect x="${x-28*u+i*17*u}" y="${y+22*u}" width="${7*u}" height="${9*u}" fill="#c7ccd0"/>`).join('')+`<rect x="${x-36*u}" y="${y-23*u}" width="${72*u}" height="${46*u}" rx="${3*u}" fill="#141414"/><circle cx="${x-36*u}" cy="${y}" r="${7*u}" fill="#2b2b2b"/><circle cx="${x-24*u}" cy="${y+12*u}" r="${3*u}" fill="#3a3a3a"/>`;
const cTO220=(x,y,u)=>[-14,0,14].map(d=>ln([x+d*u,y+22*u],[x+d*u,y+48*u],'#b9bec2',3.5*u)).join('')+`<rect x="${x-27*u}" y="${y-50*u}" width="${54*u}" height="${28*u}" rx="${3*u}" fill="#b4babe"/><circle cx="${x}" cy="${y-37*u}" r="${7*u}" fill="${PCBG}"/><rect x="${x-27*u}" y="${y-24*u}" width="${54*u}" height="${46*u}" rx="${2*u}" fill="#151515"/>`+silk(x,y+3*u,'7806',u,{s:13,f:'#bfc4c7'});
function screws(w,h,u){return [[w*.12,14],[w*.5,10],[w*.88,13],[16,h*.86],[w-16,h*.84],[w*.46,h-12],[w*.6,h-12]].map(([x,y])=>{y=y<h/2?y*u:y;const r=9*u;return `<circle cx="${x}" cy="${y}" r="${r}" fill="#c4c8cb" stroke="#6f7579" stroke-width="${1.5*u}"/>`+ln([x-r*.6,y],[x+r*.6,y],'#6f7579',1.6*u)+ln([x,y-r*.6],[x,y+r*.6],'#6f7579',1.6*u)}).join('')}
function pcbBase(w,h,u){return `<defs><radialGradient id="nk" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#f8f8f6"/><stop offset=".65" stop-color="#a9afb3"/><stop offset="1" stop-color="#666c70"/></radialGradient><linearGradient id="mt" x1="0" x2="1"><stop offset="0" stop-color="#8d928f"/><stop offset=".45" stop-color="#cfd3cf"/><stop offset="1" stop-color="#7d837f"/></linearGradient></defs>
<rect x="0" y="0" width="${w}" height="${h}" rx="${8*u}" fill="#b5803f"/><rect x="${24*u}" y="${24*u}" width="${w-48*u}" height="${h-48*u}" rx="${10*u}" fill="${PCBG}"/><rect x="${w*.36}" y="0" width="${w*.46}" height="${34*u}" fill="${PCBG}"/><rect x="${w*.3}" y="${h-30*u}" width="${w*.5}" height="${30*u}" fill="${PCBG}"/>`+screws(w,h,u)}
function sk(id,x,y,col,r,lab){if(col==='pad')return `<g class="sock pad${BV.sel===id?' sel':''}" data-s="${id}" tabindex="0" role="button" aria-label="Test pad ${lab||id}"><circle class="ring" cx="${x}" cy="${y}" r="${r*.62}" fill="none" stroke-width="${r*.14}"/><circle cx="${x}" cy="${y}" r="${r*.36}" fill="#d9dcdf" stroke="#80868a" stroke-width="${r*.08}"/><circle cx="${x}" cy="${y}" r="${r*.13}" fill="#545a5e"/></g>`;const [c,d]=SOCK[col];
  return `<g class="sock${BV.sel===id?' sel':''}" data-s="${id}" tabindex="0" role="button" aria-label="Socket ${lab||id}"><rect x="${x-r*.88}" y="${y-r*.98}" width="${r*2.1}" height="${r*2.1}" rx="${r*.1}" fill="#eeeee6"/><circle class="ring" cx="${x}" cy="${y}" r="${r*1.34}" fill="none" stroke-width="${r*.2}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${d}" stroke-width="${r*.14}"/><circle cx="${x}" cy="${y}" r="${r*.56}" fill="url(#nk)"/><circle cx="${x}" cy="${y}" r="${r*.29}" fill="#101010"/><circle cx="${x-r*.42}" cy="${y-r*.46}" r="${r*.15}" fill="rgba(255,255,255,.4)"/></g>`}
const plug=(p,col,u)=>`<g class="plug"><circle cx="${p[0]}" cy="${p[1]}" r="${15*u}" fill="${col}" stroke="rgba(0,0,0,.55)" stroke-width="${3*u}"/><circle cx="${p[0]-4*u}" cy="${p[1]-4*u}" r="${5*u}" fill="rgba(255,255,255,.3)"/></g>`;
function curve(a,b,u,o={}){const L=Math.hypot(b[0]-a[0],b[1]-a[1]),c=[(a[0]+b[0])/2+(o.dx||0)*u,(a[1]+b[1])/2+(o.sag??Math.min(110,24+L*.2/u))*u];return {d:`M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`,m:[(a[0]+2*c[0]+b[0])/4,(a[1]+2*c[1]+b[1])/4],c}}
function cord(a,b,col,u,o={}){const {d}=curve(a,b,u,o),w=(o.w||9)*u;
  return `<path d="${d}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="${w+4*u}" stroke-linecap="round" transform="translate(${3*u} ${5*u})"/><path class="cab" d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="${2.4*u}" stroke-linecap="round" transform="translate(${-2*u} ${-2*u})"/>`+(o.noA?'':plug(a,col,u))+(o.noB?'':plug(b,col,u))}
function tag(x,y,t,fill,ink,u){const w=(t.length*12.5+24)*u,h=36*u;return `<g><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${8*u}" fill="${fill}" stroke="rgba(0,0,0,.5)" stroke-width="${1.5*u}"/>${silk(x,y+7.5*u,t,u,{s:20,f:ink})}</g>`}
const LEADC=['#d8261f','#f2c419','#2b6fd6','#d8261f','#e8e8e8','#2b6fd6'];

/* ----- Exp 2: R, L, C, transistor & diode board ----- */
function sp2(c,b){const u=1,d=S.b.div;
  const S_={T1:[96,98,'red','T1',0,-46],T2:[178,228,'yellow','T2',-46,8,'end'],T3:[178,325,'red','T3',-46,8,'end'],T4:[178,493,'yellow','T4',-46,8,'end'],
    T7:[298,453,'yellow','T7',0,-46],T6:[408,423,'yellow','T6',0,-46],T5:[518,383,'yellow','T5',0,-46],GL:[185,681,'black','GROUND',-42,8,'end'],
    T18:[698,523,'yellow','T18'],T19:[851,523,'black','T19'],T20:[1003,523,'yellow','T20'],
    T21:[910,93,'yellow','T21'],T22:[1078,88,'green','T22'],T23:[1225,88,'yellow','T23'],T24:[1403,83,'green','T24'],
    T25:[1231,325,'yellow','T25'],T26:[1403,323,'green','T26'],T27:[1181,523,'yellow','T27'],T28:[1360,523,'green','T28'],GR:[1453,673,'black',''],T8:[341,113,'pad',''],T9:[538,113,'pad',''],T10:[341,173,'pad',''],T11:[538,173,'pad',''],T12:[663,146,'pad',''],T13:[703,146,'pad',''],T14:[743,146,'pad',''],T15:[663,272,'pad',''],T16:[703,272,'pad',''],T17:[743,272,'pad','']};
  let a=tr(u,[185,681],[215,733],[1430,733],[1453,673])+tr(u,[1078,200],[1078,243],[1498,243],[1498,640],[1453,673])+
    tr(u,[96,98],[163,98],[163,112])+cFilm([163,112],[163,172],u,'#2f2f2f',34,24)+tr(u,[163,172],[163,200],[178,228])+
    tr(u,[178,325],[178,360])+cRes([178,360],[178,460],d.R1,u)+tr(u,[178,460],[178,493])+
    tr(u,[178,493],[185,540])+cRes([185,540],[185,630],d.R2,u)+tr(u,[185,630],[185,733])+
    tr(u,[298,453],[305,545])+cRes([305,545],[305,640],d.R3,u,'#8fb7cf')+tr(u,[305,640],[305,733])+
    tr(u,[408,423],[415,545])+cRes([415,545],[415,640],d.R4,u)+tr(u,[415,640],[415,733])+
    tr(u,[518,383],[528,545])+cElec([528,550],[528,630],u,'#d4884a')+tr(u,[528,630],[528,733])+
    silk(240,146,'Co',u,{s:28})+silk(36,104,'Vin',u,{a:'start'})+silk(130,236,'+V',u,{s:20})+silk(140,420,'R1',u,{a:'end'})+silk(140,595,'R2',u,{a:'end'})+silk(270,600,'R3',u,{a:'end'})+silk(380,600,'R4',u,{a:'end'})+silk(492,600,'Cb',u,{a:'end'})+
    box(303,63,272,148,u)+silk(439,52,'DIODE',u,{s:20})+tr(u,[341,113],[398,113])+cDiode([398,113],[482,113],u)+tr(u,[482,113],[538,113])+tr(u,[341,173],[398,173])+cDiode([398,173],[482,173],u)+tr(u,[482,173],[538,173])+
    silk(440,94,'D1',u,{s:20})+silk(440,154,'D2',u,{s:20})+silk(330,120,'T8',u,{s:18,a:'end'})+silk(552,120,'T9',u,{s:18,a:'start'})+silk(330,180,'T10',u,{s:18,a:'end'})+silk(552,180,'T11',u,{s:18,a:'start'})+
    box(615,61,173,260,u)+silk(701,50,'TRANSISTOR',u,{s:20})+cTO92(703,108,u)+cTO92(703,233,u)+silk(770,96,'TR1',u,{s:18,a:'end'})+silk(770,222,'TR2',u,{s:18,a:'end'})+
    tr(u,[691,138],[663,146])+tr(u,[715,138],[743,146])+tr(u,[703,138],[703,146])+tr(u,[691,263],[663,272])+tr(u,[715,263],[743,272])+tr(u,[703,263],[703,272])+['T12','T13','T14'].map((t,i)=>silk(663+i*40,170,t,u,{s:15})).join('')+['T15','T16','T17'].map((t,i)=>silk(663+i*40,296,t,u,{s:15})).join('')+
    box(813,268,312,152,u,14)+silk(969,298,'IIT KHARAGPUR',u,{s:20})+silk(969,323,'E&amp;ECE DEPARTMENT',u,{s:20})+silk(969,348,'BASIC ELECTRONICS LAB',u,{s:20})+ln([830,360],[1108,360],SILK,2)+silk(969,385,'R,L,C TRANSISTOR &amp; DIODE',u,{s:19})+silk(969,408,'COMPONENTS AND CIRCUITS',u,{s:19})+
    box(645,428,406,250,u)+tr(u,[698,523],[698,621],[735,621])+cRes([735,621],[815,621],10e3,u)+tr(u,[815,621],[887,621])+tr(u,[851,523],[851,621])+cRes([887,621],[967,621],4.7e3,u,'#8fb7cf')+tr(u,[967,621],[1003,621],[1003,523])+
    silk(775,596,'R1',u)+silk(927,596,'R2',u)+silk(775,664,'V1',u)+silk(851,664,'A',u)+silk(927,664,'V2',u)+
    tr(u,[910,93],[950,93])+cRes([950,93],[1040,93],S.b.rl.R,u)+tr(u,[1040,93],[1078,88])+silk(995,138,'R',u)+
    tr(u,[1078,88],[1078,128])+cRes([1078,128],[1078,200],0,u,'#3fa66a')+silk(1046,178,'(L)',u,{a:'end'})+silk(1046,204,'Inductor',u,{a:'end'})+silk(1108,178,'2.2mH',u,{a:'start'})+
    tr(u,[1225,88],[1265,88])+cRes([1265,88],[1355,88],S.b.rc.R,u)+tr(u,[1355,88],[1403,83])+silk(1310,62,'R',u)+
    tr(u,[1403,83],[1403,160])+cFilm([1403,160],[1403,222],u,'#b8572a',44,22)+silk(1446,198,'C',u,{a:'start'})+silk(1263,226,'GROUND',u)+
    tr(u,[1231,325],[1278,325])+cFilm([1278,325],[1352,325],u,'#b8572a',46,20)+tr(u,[1352,325],[1403,323])+silk(1314,290,'C',u)+
    tr(u,[1403,323],[1403,368])+cRes([1403,368],[1403,445],S.b.cr4.R,u)+tr(u,[1403,445],[1403,450],[1498,450])+silk(1440,416,'R',u,{a:'start'})+
    tr(u,[1181,523],[1238,523])+cFilm([1238,523],[1302,523],u,'#e0a53a',36,14)+tr(u,[1302,523],[1360,523])+silk(1270,490,'C',u)+
    tr(u,[1360,523],[1360,560])+cRes([1360,560],[1360,650],S.b.cr5.R,u)+tr(u,[1360,650],[1360,733])+silk(1396,612,'R',u,{a:'start'})+silk(1228,716,'GROUND',u);
  const io={div:['T1','T4','GL'],rc:['T23','T24','GR'],cr4:['T25','T26','GR'],cr5:['T27','T28','GR'],rl:['T21','T22','GR']}[c.id];
  const sx=S_[io[0]][0],ox=S_[io[1]];
  return {w:1540,h:770,u,r:30,S:S_,art:a,J:c.id==='div'?{j74:['T7','T4'],j64:['T6','T4',{sag:150}]}:{},auto:c.id==='div'?[['T2','T3',{sag:0,dx:70}]]:[],
    fg:{sig:io[0],gnd:io[2],at:c.id==='div'?[30,-90]:[sx-160,-90]},ch1:{s:io[0],at:c.id==='div'?[250,-90]:[sx+60,-90]},ch2:{s:io[1],at:c.id==='div'?[-75,ox[1]+40]:[1610,ox[1]]},
    idle:c.id==='div'?null:'No patch leads are needed for this network. The generator and probes are already on '+io[0]+' and '+io[1]+'.'}}

/* ----- Exp 3: rectifier & power supply board ----- */
function sp3(c,b){const u=1;
  const S_={T1:[410,293,'red','T1',-44,8,'end'],T2:[410,428,'red','T2',-44,8,'end'],T3:[410,558,'red','T3',-44,8,'end'],F:[525,108,'red','F',0,-46],S1:[810,108,'yellow','1',48,8,'start'],
    B1:[528,288,'red','B1',0,-46],B2:[528,428,'red','B2',0,-46],S4:[810,288,'yellow','4',48,8,'start'],S5:[810,423,'yellow','5',48,8,'start'],S3:[810,553,'yellow','3',48,8,'start'],
    S6:[1060,108,'yellow','6',0,-46],S2:[930,218,'yellow','2',48,8,'start'],UR1:[1385,103,'green',''],UR2:[1515,103,'green',''],C1:[1020,378,'yellow','C',0,-46],C2:[1130,378,'yellow','C',0,-46],
    S7:[1110,245,'red','7',0,-46],ZO:[1295,388,'green',''],S8:[1050,638,'red','8',0,-46],ICO:[1215,643,'green',''],L1a:[1405,328,'black',''],L1b:[1405,448,'black',''],L2:[1520,448,'black',''],
    G1:[550,703,'black',''],G2:[930,701,'black',''],G3:[1535,698,'black','']};
  const L=[615,303],T=[685,233],R=[755,303],B_=[685,373];
  let a=box(80,183,245,405,u)+`<rect x="150" y="212" width="100" height="40" rx="6" fill="#9ea39f"/><rect x="150" y="518" width="100" height="40" rx="6" fill="#9ea39f"/><circle cx="200" cy="232" r="9" fill="#5e6360"/><circle cx="200" cy="538" r="9" fill="#5e6360"/><rect x="112" y="248" width="176" height="274" rx="6" fill="url(#mt)" stroke="#5c615e" stroke-width="2"/><rect x="286" y="300" width="26" height="170" rx="4" fill="#c98a3a"/><rect x="160" y="280" width="78" height="210" rx="3" fill="#efe9d8"/>`+
    silk(214,385,'TRANSFORMER',u,{s:22,r:-90,f:'#333'})+silk(184,385,'Chakraborty',u,{s:20,r:-90,f:'#555'})+
    tr(u,[312,320],[350,293],[377,293])+tr(u,[312,385],[377,428])+tr(u,[312,450],[350,558],[377,558])+
    box(40,620,330,160,u,10)+silk(205,650,'IIT KHARAGPUR',u,{s:20})+silk(205,675,'E&amp;ECE DEPARTMENT',u,{s:20})+silk(205,700,'BASIC ELECTRONICS LAB',u,{s:20})+ln([55,712],[355,712],SILK,2)+silk(205,738,'RECTIFIER &amp; POWER SUPPLY',u,{s:20})+silk(205,762,'CIRCUIT',u,{s:20})+
    `<rect x="490" y="684" width="1060" height="78" rx="16" fill="${TRACE}"/><rect x="690" y="718" width="140" height="36" fill="${PCBG}"/><rect x="1200" y="718" width="140" height="36" fill="${PCBG}"/>`+silk(760,745,'GROUND',u)+silk(1270,745,'GROUND',u)+
    tr(u,[525,108],[640,113])+cDiode([640,113],[720,113],u)+tr(u,[720,113],[810,108])+silk(680,84,'D1',u)+
    tr(u,[410,558],[640,553])+cDiode([640,553],[720,553],u)+tr(u,[720,553],[810,553])+silk(680,604,'D2',u)+
    tr(u,L,T,R,B_,L)+tr(u,[528,288],L)+tr(u,T,[685,193],[810,193],[810,288])+tr(u,R,[790,340],[870,340],[870,480],[528,480],[528,428])+tr(u,B_,[685,423],[810,423])+
    cDiode(lerp(L,T,.22),lerp(L,T,.78),u)+cDiode(lerp(T,R,.22),lerp(T,R,.78),u)+cDiode(lerp(L,B_,.22),lerp(L,B_,.78),u)+cDiode(lerp(B_,R,.22),lerp(B_,R,.78),u)+
    silk(685,309,'BRIDGE',u,{s:17})+silk(628,252,'D3',u,{s:15})+silk(744,252,'D5',u,{s:15})+silk(628,370,'D6',u,{s:15})+silk(744,370,'D4',u,{s:15})+
    tr(u,[930,218],[930,106],[1515,103])+tr(u,[930,218],[937,430])+cRes([937,430],[937,516],8.3e3,u)+tr(u,[937,516],[937,690])+silk(966,480,'R',u,{a:'start'})+
    tr(u,[1020,378],[1130,378])+tr(u,[1020,378],[1005,440])+cElec([1005,445],[1005,520],u,'#2c4f9e')+tr(u,[1005,520],[1005,690])+silk(1040,492,'Cf',u,{a:'start'})+
    tr(u,[1110,245],[1176,250])+cRes([1176,250],[1262,250],100,u)+tr(u,[1262,250],[1295,250],[1295,388],[1295,505])+cDiode([1295,600],[1295,505],u)+tr(u,[1295,600],[1295,690])+silk(1219,222,'Rz',u)+silk(1326,562,'Dz',u,{a:'start'})+
    silk(1250,368,'ZENER',u,{s:17,a:'end'})+silk(1250,389,'REGLTD',u,{s:17,a:'end'})+silk(1250,410,'OUTPUT',u,{s:17,a:'end'})+
    tr(u,[1050,638],[1100,640],[1111,640])+cTO220(1125,598,u)+tr(u,[1139,646],[1180,646],[1215,643])+tr(u,[1125,646],[1125,690])+silk(1215,566,'IC',u,{s:17})+silk(1215,586,'REGLTD',u,{s:17})+silk(1215,606,'OUTPUT',u,{s:17})+
    tr(u,[1405,328],[1405,448],[1410,530])+cRes([1410,530],[1410,620],b.RL1,u)+tr(u,[1410,620],[1410,690])+silk(1448,585,'RL1',u,{a:'start'})+
    tr(u,[1520,448],[1515,535])+cRes([1515,535],[1515,625],b.RL2,u)+tr(u,[1515,625],[1515,690])+silk(1550,590,'RL2',u,{a:'start'})+
    silk(1450,58,'UNREGULATED DC',u,{s:26})+silk(1405,276,'LOAD 1',u,{s:26})+silk(1520,396,'LOAD 2',u,{s:26});
  const r=c.reg(b),out=r==='z'?'ZO':r==='ic'?'ICO':'UR2',p1=b.p1==='x12'?['T1','T2']:b.p1==='x23'?['T3','T2']:['T1','T3'];
  return {w:1618,h:813,u,r:33,S:S_,art:a,out,G:{GND:['G1','G2','G3'],N2:['S2','S6','UR1','UR2'],C:['C1','C2'],LD1:['L1a','L1b']},
    J:{T1F:['T1','F'],T2G:['T2','G1',{sag:40}],J12:['S1','S2'],J31:['S3','S1',{dx:70,sag:20}],T1B1:['T1','B1'],T2B2:['T2','B2'],J5G:['S5','G2'],J42:['S4','S2',{sag:30}],J6C:['S6','C1'],JC7:['C2','S7',{sag:10}],JC8:['C2','S8',{dx:50}],L1:['L1a','OUT',{sag:60}],L2:['L2','OUT',{sag:80}]},
    mains:[[80,385],[-56,385]],ch1:{s:p1[0],ref:p1[1],at:[300,-90]},ch2:{s:out,at:[1690,out==='UR2'?40:S_[out][1]]}}}

/* ----- Exp 4: CE amplifier board ----- */
function sp4(c,b){const u=1.5;
  const S_={IN:[150,771,'red','INPUT',62,12,'start'],GL:[165,960,'black','GROUND',0,84],S1p:[144,441,'yellow',''],VB:[525,441,'yellow',''],CCB:[525,261,'yellow',''],VB2:[405,801,'yellow',''],TPC:[720,372,'pad',''],
    P12:[1005,192,'red',''],GTR:[1335,201,'black','GROUND',0,-70],OUT:[1215,411,'green','OUTPUT',0,-70],E:[864,612,'yellow',''],E2:[864,801,'yellow',''],S2:[1044,705,'yellow',''],RLS:[1215,612,'yellow',''],GBR:[1320,981,'black','GROUND',0,84]};
  let a=tr(u,[414,192],[1005,192])+tr(u,[1365,201],[1365,981])+tr(u,[165,960],[190,1030],[1300,1030],[1320,981])+
    tr(u,[414,192],[414,212])+cRes([414,212],[414,312],b.R1,u)+tr(u,[414,312],[414,441])+
    tr(u,[150,771],[147,660])+cRes([147,660],[147,566],b.Rx,u)+tr(u,[147,566],[144,441])+
    tr(u,[144,441],[270,441])+cElec([270,441],[390,441],u,'#1e2a63')+tr(u,[390,441],[760,441])+
    tr(u,[525,261],[600,270])+cFilm([600,270],[700,270],u,'#9b6a3b',26,14)+tr(u,[700,270],[780,270])+
    tr(u,[414,441],[405,801],[414,850])+cRes([414,850],[414,950],b.R2,u)+tr(u,[414,950],[414,1030])+
    tr(u,[780,192],[780,230])+cRes([780,230],[780,340],b.Rc,u)+tr(u,[780,340],[780,400],[800,420])+tr(u,[780,372],[720,372])+cTO92(800,441,u)+
    tr(u,[800,420],[900,420],[930,426])+cFilm([930,426],[1020,426],u,'#8a8f93',22,14)+tr(u,[1020,426],[1215,411])+
    tr(u,[800,470],[789,520],[789,612],[864,612])+tr(u,[789,612],[789,650])+cRes([789,650],[789,750],b.RE1,u)+tr(u,[789,750],[789,801],[864,801])+tr(u,[789,801],[789,850])+cRes([789,850],[789,950],b.RE2,u)+tr(u,[789,950],[789,1030])+
    tr(u,[1044,705],[1050,850])+cElec([1050,850],[1050,930],u,'#1e2a63')+tr(u,[1050,930],[1050,1030])+
    tr(u,[1215,612],[1215,700])+cRes([1215,700],[1215,800],b.RL,u)+tr(u,[1215,800],[1215,880],[1365,880])+
    silk(660,165,'Vcc',u)+silk(366,272,'R1',u,{a:'end'})+silk(192,622,'Rx',u,{a:'start'})+silk(330,505,'Cc',u)+silk(650,322,'Ccb',u)+silk(830,295,'Rc',u,{a:'start'})+silk(975,388,'Cc',u)+
    silk(830,452,'c b e',u,{a:'start',s:16})+silk(366,912,'R2',u,{a:'end'})+silk(744,712,'RE1',u,{a:'end'})+silk(744,912,'RE2',u,{a:'end'})+silk(1094,900,'CE',u,{a:'start'})+silk(1260,762,'RL',u,{a:'start'})+
    `<circle cx="840" cy="126" r="${12*u}" fill="none" stroke="${SILK}" stroke-width="${2*u}"/>`+silk(866,138,'+12VOLT',u,{a:'start'})+silk(110,742,'∿',u,{a:'end',s:26});
  return {w:1506,h:1122,u,r:46,S:S_,art:a,G:{GND:['GL','GTR','GBR'],VB:['VB','VB2']},
    mn:{TPC:['V_C',-30,-26,'end'],IN:['1',-62,-40,'end'],S1p:['1′',-62,-42,'end'],VB:['V_B',60,-38,'start'],E:['E',60,-34,'start'],E2:['2′',60,-34,'start'],S2:['2',60,-34,'start'],OUT:['3',-62,-34,'end'],RLS:['3′',-62,-34,'end']},
    J:{j11:['IN','S1p',{dx:-110,sag:0}],j22:['E2','S2',{sag:40}],j2E:['E','S2',{sag:-20}],j33:['OUT','RLS',{dx:110,sag:0}]},
    fg:{sig:'IN',gnd:'GL',at:[-40,560]},ch1:{s:'IN',at:[-40,880]},ch2:{s:'OUT',at:[1215,-90]},
    dc:b.pwr?{at:[1560,-100],t:'DC SUPPLY',leads:[['P12','#d8261f'],['GTR','#1b1b1b']]}:null}}

/* ----- Exp 5: op-amp board ----- */
function sp5(c,b){const u=1,cfg=c.cfg;
  const S_={V4:[208,125,'yellow','V4',46,8,'start'],M12:[123,225,'green','−12V',0,-46],V3:[213,295,'yellow','V3',46,8,'start'],GL:[118,383,'black','GROUND',0,-46],V2:[213,462,'yellow','V2',46,8,'start'],P12:[123,560,'red','+12V',0,-46],V1:[213,640,'yellow','V1',46,8,'start'],
    F0:[413,150,'green','F0',0,-46],F6:[343,335,'yellow','F6',0,58],F5:[438,333,'yellow','F5',0,58],F4:[533,333,'yellow','F4',0,58],F3:[623,333,'yellow','F3',0,58],F2:[690,415,'yellow','F2',0,58],F1:[748,333,'yellow','F1',0,58],
    F7:[343,485,'yellow','F7',0,-46],F8:[348,640,'yellow','F8',0,58],S6:[1033,110,'green','6',0,-46],GT:[1183,105,'black','GROUND',0,-46],
    I10:[838,250,'yellow','I10',-44,8,'end'],I9:[838,392,'yellow','I9',-44,8,'end'],I8:[838,482,'yellow','I8',-44,8,'end'],I7:[840,645,'red','I7',-44,8,'end'],
    A2:[965,290,'yellow','2',0,-44],B2:[965,392,'yellow','2',0,-44],I6:[965,482,'yellow','I6',0,-44],I5:[965,645,'red','I5',-44,8,'end'],
    A3:[1088,290,'yellow','3',0,-44],B3:[1088,390,'yellow','3',0,-44],I4:[1088,477,'yellow','I4',0,-44],I3:[1088,645,'red','I3',-44,8,'end'],
    I2:[1205,477,'yellow','I2',0,-44],I1:[1206,645,'red','I1',-44,8,'end'],GR:[1413,645,'black','GROUND',0,60]};
  let a=tr(u,[208,125],[216,160])+cRes([216,160],[216,255],2.2e3,u)+tr(u,[216,255],[213,295],[218,335])+cRes([218,335],[218,425],1.2e3,u)+tr(u,[218,425],[213,462],[220,500])+cRes([220,500],[220,595],3.3e3,u)+tr(u,[220,595],[213,640],[213,690])+
    tr(u,[123,560],[80,600],[80,700],[140,700])+cRes([140,700],[220,700],5.6e3,u)+tr(u,[220,700],[213,690])+
    silk(184,212,'RU4',u,{s:18,r:-90})+silk(186,385,'RU3',u,{s:18,r:-90})+silk(188,552,'RU2',u,{s:18,r:-90})+silk(180,738,'RU1',u,{s:18})+
    tr(u,[413,150],[413,192])+tr(u,[343,192],[748,192])+
    [[343,100e3,'RF4'],[438,47e3,'RF3'],[533,27e3,'RF2'],[623,10e3,'RF1']].map(([x,v,n])=>tr(u,[x,192],[x,205])+cRes([x,205],[x,290],v,u)+tr(u,[x,290],[x,333])+silk(x-28,250,n,u,{s:17,r:-90})).join('')+
    tr(u,[683,192],[683,205])+cFilm([683,205],[683,290],u,'#5d6a73',40,16)+tr(u,[683,290],[683,380],[690,415])+silk(656,250,'CF1',u,{s:17,r:-90})+
    tr(u,[743,192],[743,205])+cFilm([743,205],[743,290],u,'#c9663a',28,14)+tr(u,[743,290],[748,333])+silk(716,250,'CF2',u,{s:17,r:-90})+
    tr(u,[343,485],[385,480])+cRes([385,480],[465,480],100e3,u)+tr(u,[343,485],[348,525])+cRes([348,525],[348,600],100e3,u)+tr(u,[348,600],[348,640])+silk(318,565,'RF5',u,{s:17,r:-90})+
    `<circle cx="528" cy="73" r="20" fill="#3c9a4a"/><circle cx="686" cy="73" r="20" fill="#3c9a4a"/><circle cx="843" cy="73" r="20" fill="#3c9a4a"/>`+silk(528,58,'D1',u,{s:20})+silk(686,58,'D2',u,{s:20})+silk(843,58,'D3',u,{s:20})+
    cDiode([575,115],[640,115],u,'#e8e8e8')+cDiode([735,113],[800,113],u,'#e8e8e8')+silk(608,95,'DB1',u,{s:18})+silk(768,95,'DB2',u,{s:18})+cDiode([840,148],[895,148],u)+cDiode([840,180],[895,180],u)+
    cDIP(1013,198,u)+silk(1062,206,'741',u,{a:'start'})+silk(966,186,'8',u,{s:13,f:SILK})+silk(966,218,'1',u,{s:13})+
    tr(u,[838,250],[838,282])+cFilm([838,282],[838,360],u,'#c9663a',36,18)+tr(u,[838,360],[838,392])+silk(872,326,'C12',u,{s:17,a:'start'})+
    tr(u,[838,482],[840,520])+cRes([840,520],[840,605],1e3,u)+tr(u,[840,605],[840,645])+silk(808,567,'R13',u,{s:15,a:'end'})+
    tr(u,[965,290],[965,392])+tr(u,[965,482],[965,520])+cRes([965,520],[965,605],10e3,u)+tr(u,[965,605],[965,645])+silk(933,567,'R12',u,{s:15,a:'end'})+
    tr(u,[1088,290],[1088,390])+tr(u,[1088,477],[1088,515])+cFilm([1088,515],[1088,605],u,'#5d6a73',40,16)+tr(u,[1088,605],[1088,645])+silk(1058,567,'C11',u,{s:15,a:'end'})+
    tr(u,[1205,477],[1205,515])+cRes([1205,515],[1205,605],10e3,u)+tr(u,[1205,605],[1206,645])+silk(1174,567,'R11',u,{s:15,a:'end'})+
    cRes([1152,340],[1228,340],10e3,u,'#8fb7cf')+silk(1190,318,'R14',u,{s:14})+
    `<circle cx="1348" cy="135" r="22" fill="#3c9a4a"/><circle cx="1348" cy="355" r="22" fill="#3c9a4a"/><circle cx="1348" cy="535" r="22" fill="#3c9a4a"/>`+silk(1395,143,'W3',u,{a:'start'})+silk(1395,363,'W2',u,{a:'start'})+silk(1395,543,'W1',u,{a:'start'})+
    cFilm([1350,180],[1350,290],u,'#d9dcd6',56,14)+silk(1385,245,'CW',u,{a:'start'})+cRes([1350,410],[1350,480],10e3,u)+silk(1385,452,'RW',u,{a:'start'})+cFilm([1262,615],[1342,615],u,'#d9dcd6',48,12)+silk(1302,592,'CW',u)+cRes([1262,650],[1342,650],10e3,u)+silk(1302,690,'RW',u)+
    box(438,508,302,140,u,12)+silk(589,538,'STUDIES ON ANALOG',u,{s:20})+silk(589,562,'CIRCUITS USING OP-AMP',u,{s:20})+ln([452,573],[726,573],SILK,2)+silk(589,597,'BASIC ELECTRONICS LAB',u,{s:18})+silk(589,618,'E&amp;ECE DEPARTMENT',u,{s:18})+silk(589,639,'IIT KHARAGPUR',u,{s:18});
  // patch leads follow the chosen configuration
  const Ri=(b.Ri===1e3||cfg==='int'||cfg==='dif')?['I7','I8']:['I1','I2'],Fx={1e4:'F3',27e3:'F4',47e3:'F5',1e5:'F6'}[b.Rf]||'F3';
  const fgIn=b.src==='fg',inS=cfg==='noninv'||cfg==='foll'?'B3':Ri[0];
  const auto=[];
  if(cfg==='inv')auto.push([Ri[1],'A2'],['F0','B2'],[Fx,'S6'],['A3','GT']);
  if(cfg==='noninv')auto.push(['A2',Ri[1]],[Ri[0],'I4'],['I3','GR'],['F0','B2'],[Fx,'S6']);
  if(cfg==='foll')auto.push(['A2','S6',{sag:30}]);
  if(cfg==='add')auto.push(['I2','A2'],['I6','B2'],['F0','A2'],['F3','S6'],['A3','GT'],[b.tap2,'I5',{sag:160}]);
  if(cfg==='int')auto.push(['I8','A2'],['F0','B2'],['F6','S6'],['F2','S6'],['A3','GT']);
  if(cfg==='dif')auto.push(['I8','I9',{dx:-40,sag:0}],['I10','A2'],['F0','B2'],['F6','S6'],['F1','S6'],['A3','GT']);
  if(!fgIn)auto.push([b.src,inS,{sag:160}]);
  if(!fgIn||cfg==='add')auto.push(['V4',b.v4==='m12'?'M12':'GL',{sag:20,dx:-40}]);
  return {w:1513,h:750,u,r:33,S:S_,art:a,auto,
    fg:fgIn?{sig:inS,gnd:'GR',at:[1010,850]}:null,ch1:{s:fgIn?inS:b.src,at:fgIn?[1230,850]:[-70,b.src==='V1'?700:b.src==='V2'?470:300]},ch2:{s:'S6',at:[1033,-90]},
    dc:b.pwr?{at:[-66,470],t:'±12 V',leads:[['P12','#d8261f'],['M12','#2b6fd6'],['GL','#1b1b1b']]}:null,
    idle:'On this board the patch leads follow the circuit and values you pick below. Resistor and capacitor positions are read from the manual photo, so check them against the values printed on your board.'}}

/* ----- render + interaction ----- */
let SP=null;
const spT=s=>Array.isArray(s)?s:SP.S[s==='OUT'&&SP.out?SP.out:s];
const canon=id=>{if(id==='OUT'&&SP.out)id=SP.out;if(SP.G)for(const [g,l] of Object.entries(SP.G))if(l.includes(id))return g;return id};
const sname=id=>{const s=SP.S[id];const mn=SP.mn&&SP.mn[id];return (s&&s[3])||(mn&&mn[0])||({GR:'GROUND',GT:'GROUND',GTR:'GROUND',GBR:'GROUND',TPC:'collector test point',UR1:'Unregulated DC',UR2:'Unregulated DC',ZO:'Zener regulated output',ICO:'IC regulated output',L1a:'Load 1',L1b:'Load 1',L2:'Load 2',G1:'GROUND',G2:'GROUND',G3:'GROUND',VB2:'base point',CCB:'Ccb terminal'})[id]||id};
$('#bbar').addEventListener('click',e=>{const v=e.target.closest('[data-v]');if(v){BV.view=v.dataset.v;BV.sel=null;BV.msg='';try{localStorage.setItem('kgpbench.view',BV.view)}catch(_){}renderSchem()}});
$('#bbar').addEventListener('change',e=>{if(e.target.id==='hintsChk'){BV.hints=e.target.checked;try{localStorage.setItem('kgpbench.hints',BV.hints?'1':'0')}catch(_){}renderSchem()}});
$('#schemWrap').addEventListener('click',e=>boardAct(e.target));
$('#schemWrap').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&boardAct(e.target))e.preventDefault()});

/* terminal names on the probes / multimeter now match the board */
[['div','T1','T4'],['rc','T23','T24'],['cr4','T25','T26'],['cr5','T27','T28'],['rl','T21','T22']].forEach(([id,a,z])=>{const C=CIRC[id];C.probes={ch1:a+' (V_in)',ch2:z+(id==='div'?' (V_L)':' (V_out)')};C.nodes=id==='div'?{vin:a+' (V_in)',vl:z+' (V_L)'}:{vin:a+' (V_in)',vout:z+' (V_out)'}});
CIRC.ce.probes={ch1:'INPUT',ch2:'OUTPUT'};CIRC.rect.probes={ch1:'transformer secondary',ch2:'Output terminal'};

/* ---- 05-wiring.js ---- */
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

/* ---- 06-meter-graphs.js ---- */
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

/* ---- 07-panels.js ---- */
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

/* ---- 08-shell.js ---- */
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

/* ---- 09-boot.js ---- */
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

})();
