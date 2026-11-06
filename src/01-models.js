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
