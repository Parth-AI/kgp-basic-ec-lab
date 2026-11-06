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
