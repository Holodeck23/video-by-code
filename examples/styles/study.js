/* Eight original diagnostic studies reconstructed from the rewritten style cards.
 * Shared helpers provide geometry only; each look supplies its own materials/composition.
 * No source posters, source prompt code or network assets are loaded by these pages.
 */
(() => {
'use strict';
const c = document.querySelector('canvas'), x = c.getContext('2d'), W=1920, HT=1080;
const style = document.documentElement.dataset.style;
const hand = '"Chalkboard SE", "Comic Sans MS", cursive';
const brush = '"Bradley Hand", "Noteworthy", cursive';
const mono = '"Courier New", monospace';
const noise=H.noise(37);
function path(pts, close=false){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));if(close)x.closePath();}
function line(pts,col,w=4,alpha=1){x.save();x.globalAlpha=alpha;x.strokeStyle=col;x.lineWidth=w;x.lineCap='round';x.lineJoin='round';path(pts);x.stroke();x.restore();}
function poly(pts,col,stroke=null,w=3){path(pts,true);x.fillStyle=col;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=w;x.stroke();}}
function circle(cx,cy,r,col,stroke=null,w=3){x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fillStyle=col;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=w;x.stroke();}}
function round(a,b,w,h,r,col,stroke=null,lw=3){x.beginPath();x.roundRect(a,b,w,h,r);if(col){x.fillStyle=col;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=lw;x.stroke();}}
function txt(s,a,b,size,col,font='Arial',weight=700,align='left'){x.font=`${weight} ${size}px ${font}`;x.textAlign=align;x.textBaseline='alphabetic';x.fillStyle=col;x.fillText(s,a,b);}
function gradient(stops,a=0,b=0,d=W,e=HT){const g=x.createLinearGradient(a,b,d,e);stops.forEach((col,i)=>g.addColorStop(i/(stops.length-1),col));return g;}
function glow(cx,cy,r,col,alpha=.3){x.save();x.globalAlpha=alpha;const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,col);g.addColorStop(.35,col+'66');g.addColorStop(1,col+'00');circle(cx,cy,r,g);x.restore();}
function texture(key,col,strength=.15){const q=H.offscreen('surface-'+key,480,270,(g,w,h)=>{const r=H.rng(key);g.fillStyle=col;g.fillRect(0,0,w,h);for(let i=0;i<22000;i++){const v=r()>0.5?255:0;g.fillStyle=`rgba(${v},${v},${v},${r()*strength})`;g.fillRect(r()*w,r()*h,1+r()*2,1);}});x.drawImage(q,0,0,W,HT);}
function wobbled(pts,seed=1,amp=2){return H.wobble(H.resample(pts,4),noise,{amp,freq:.012,seed});}
function ellipsePts(cx,cy,rx,ry,turn=1.06){return Array.from({length:101},(_,i)=>{const a=i/100*Math.PI*2*turn;return[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];});}
function arrow(a,b,col,w=9,rough=false){let pts=H.bezier(a,[a[0]+100,a[1]-25],[b[0]-100,b[1]-25],b,50);if(rough)pts=wobbled(pts,9);line(pts,col,w);const ang=Math.atan2(b[1]-pts[pts.length-2][1],b[0]-pts[pts.length-2][0]);line([[b[0]-35*Math.cos(ang-.5),b[1]-35*Math.sin(ang-.5)],b,[b[0]-35*Math.cos(ang+.5),b[1]-35*Math.sin(ang+.5)]],col,w);}
function marker(pts,col,w=10,seed=1){const p=wobbled(pts,seed,2.2);line(p,col,w,.3);line(p,col,w*.82,.6);line(p.map(([a,b])=>[a,b-2]),col,w*.23,.55);line(p.map(([a,b])=>[a,b+2]),col,w*.2,.45);line(p.map(([a,b])=>[a,b-.5]),'#f6f8f7',w*.08,.4);}
function markerTool(cx,cy,col='#1f4fc2'){x.save();x.translate(cx,cy);x.rotate(.8);x.shadowColor='#0006';x.shadowBlur=10;x.shadowOffsetX=14;x.shadowOffsetY=22;round(-8,-28,330,46,10,gradient(['#fff','#a8afb7'],0,-25,0,25));x.shadowColor='transparent';round(5,-28,45,46,3,col);poly([[-24,-6],[0,-19],[0,10],[-24,4]],col);x.restore();}
function whiteboard(t){
 x.fillStyle=gradient(['#f6f8f7','#ecefee','#dfe4e3']);x.fillRect(0,0,W,HT);
 x.save();x.globalAlpha=.07;txt('old idea',1350,190,74,'#30343c',hand);line([[1310,210],[1660,180],[1700,330],[1450,310]],'#30343c',8);txt('x + y = ?',120,900,75,'#30343c',hand);x.restore();
 const r=H.rng(41);for(let i=0;i<70;i++)line([[r()*W,r()*HT],[r()*W,r()*HT]],'#fff',15,.045);
 x.save();x.translate(125,210);x.rotate(-.018);txt('MAKE THE SIGNAL CLEAR',0,0,106,'#1d1f26',hand);x.restore();marker([[130,245],[1510,256]],'#1f4fc2',12,2);marker([[135,264],[1520,270]],'#1f4fc2',7,5);
 const boxes=[[230,400,530,300,'#1f4fc2'],[1110,400,530,300,'#16884a']];
 for(const [a,b,w,h,col]of boxes){marker([[a-6,b],[a+w+10,b-5],[a+w,b+h+10],[a,b+h],[a-5,b-9]],col,10,a);marker([[a+6,b+9],[a+w-9,b+8],[a+w-5,b+h-8],[a+10,b+h-5]],col,5,a+1);}
 txt('INPUT',495,490,77,'#1f4fc2',hand,700,'center');txt('one useful idea',495,570,57,'#1d1f26',hand,700,'center');
 for(let i=0;i<6;i++)marker([[310+i*22,625],[350+i*22,585]],'#1f4fc2',5,i);
 txt('OUTPUT',1375,490,77,'#16884a',hand,700,'center');txt('a clear picture',1375,570,57,'#1d1f26',hand,700,'center');
 arrow([800,555],[1055,555],'#1f4fc2',10,true);txt('explain',925,500,50,'#1d1f26',hand,700,'center');
 marker(ellipsePts(1350,553,242,88),'#d4262f',8,8);marker([[1240,635],[1285,680],[1480,622]],'#16884a',13,4);
 txt('One mark. One meaning.',230,830,66,'#1d1f26',hand);
 const sheen=x.createLinearGradient(-400+t*6,0,1550+t*6,HT);sheen.addColorStop(0,'#fff0');sheen.addColorStop(.5,'#fff0');sheen.addColorStop(.56,'#fff4');sheen.addColorStop(.62,'#fff0');x.fillStyle=sheen;x.fillRect(0,0,W,HT);
 x.save();x.globalAlpha=.4;x.scale(1,.12);glow(450,600,450,'#ffffff',.7);glow(1500,600,450,'#ffffff',.7);x.restore();markerTool(1565,570);
 H.grain(x,t,{strength:.018,cell:2,seed:2,fps:12});
}
function wash(cx,cy,rx,ry,col,seed,alpha=.047){const r=H.rng(seed);x.save();x.globalCompositeOperation='multiply';for(let k=0;k<28;k++){const pts=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2,v=1+r.gauss()*.026;return[cx+Math.cos(a)*rx*v,cy+Math.sin(a)*ry*v];});x.globalAlpha=alpha*(.6+.8*r());poly(pts,col);}x.restore();}
function watercolor(t){
 texture('watercolor','#fbf8f0',.14);x.fillStyle=gradient(['#e8d6b655','#ffffff00','#e4d0ac55'],0,0,0,HT);x.fillRect(0,0,W,HT);
 wash(1450,335,350,230,'#7eb2d6',2,.025);wash(500,775,410,90,'#deb876',8,.022);
 txt('A LITTLE WATER,',135,200,110,'#2c3470',brush);txt('A LOT OF POSSIBILITY',135,310,103,'#2c3470',brush);
 const jars=[[440,620,185,165,'#7eb2d6'],[915,620,185,165,'#deb876'],[1390,620,185,165,'#c87896']];
 for(const[a,b,rx,ry,col]of jars){line(ellipsePts(a,b,rx+12,ry+10),'#464448',2,.25);wash(a,b,rx,ry,col,a);wash(a+rx*.3,b+ry*.3,rx*.65,ry*.5,col,a+1,.04);x.save();x.globalCompositeOperation='multiply';x.globalAlpha=.28;line(ellipsePts(a,b,rx,ry),col,8);x.restore();
  const r=H.rng(a);for(let i=0;i<300;i++){const px=a+(r()-.5)*rx*1.5,py=b+(r()-.5)*ry*1.5;circle(px,py,1+r()*2,'#2c347015');}
  wash(a-60,b-58,42,45,'#fbf8f0',18,.06);
 }
 arrow([650,620],[700,620],'#2c3470',12,true);arrow([1120,620],[1170,620],'#2c3470',12,true);
 ['observe','connect','understand'].forEach((s,i)=>txt(s,440+i*475,895,70,i===2?'#be283c':'#2c3470',brush,700,'center'));
 line(ellipsePts(1390,884,225,62),'#be283c',9,.72);txt('Let the paper be the light.',135,1010,47,'#504e54',brush);
 const paper=H.offscreen('water-grain',480,270,(g,w,h)=>{const r=H.rng(79);for(let i=0;i<15000;i++){g.fillStyle=r()>.5?'#77583012':'#ffffff55';g.fillRect(r()*w,r()*h,1,1);}});x.drawImage(paper,0,0,W,HT);
}
function tube(draw,col,w=10,power=1){x.save();x.lineCap='round';x.lineJoin='round';x.strokeStyle='#2c2430';x.lineWidth=w+4;draw();x.stroke();if(power>0){for(const[b,a,lw]of[[48,.18,w*2.5],[22,.55,w*1.4],[0,.95,w]]){x.shadowColor=col;x.shadowBlur=b;x.globalAlpha=a*power;x.strokeStyle=col;x.lineWidth=lw;draw();x.stroke();}x.globalAlpha=power;x.shadowBlur=0;x.strokeStyle='#fff2fb';x.lineWidth=w*.3;draw();x.stroke();}x.restore();}
function neonText(s,a,b,size,col,font='Arial'){x.save();x.font=`700 ${size}px ${font}`;x.textAlign='center';x.textBaseline='alphabetic';for(const[blur,alpha]of[[70,.27],[30,.5],[10,.9],[0,1]]){x.shadowColor=col;x.shadowBlur=blur;x.globalAlpha=alpha;x.fillStyle=blur===0?'#ffeef7':col;x.strokeStyle=col;x.lineWidth=4;x.strokeText(s,a,b);x.fillText(s,a,b);}x.restore();}
function neon(t){
 const r=H.rng(16);x.fillStyle='#13121d';x.fillRect(0,0,W,HT);const brick=['#e66a4c','#c85a42','#f5825c','#b4604e','#dc785a','#8c4c3e'];for(let row=0;row<13;row++)for(let j=-1;j<12;j++){const a=j*190+(row%2)*95,b=row*75;x.fillStyle=brick[Math.floor(r()*6)];x.globalAlpha=.11;round(a+3,b+3,184,67,3,x.fillStyle);x.globalAlpha=.06;line([[a,b],[a+190,b]],'#beb6ac',3);}
 x.globalAlpha=1;glow(880,490,800,'#ff197d',.09);glow(1100,650,800,'#0096ff',.1);
 const scene=()=>{tube(()=>{x.beginPath();x.roundRect(255,250,1410,525,35)},'#46e4ff',10);neonText('MAKE IT',960,465,150,'#ff46a5','"Snell Roundhand", cursive');neonText('GLOW',960,625,200,'#ff46a5','"Snell Roundhand", cursive');tube(()=>{x.beginPath();x.moveTo(625,685);x.lineTo(1295,685)},'#af6eff',8);};
 scene();
 // Hardware stays dark over the luminous tubes, so the tubes appear mounted to the wall.
 for(const [a,b]of[[255,380],[255,680],[1665,380],[1665,680],[625,685],[1295,685]]){round(a-8,b-15,16,30,4,'#16131c');line([[a-5,b-10],[a-5,b+9]],'#615968',2);}
 round(980,720,75,27,7,'#15131d');line([[1010,745],[1010,807],[1420,807],[1420,850]],'#05050a',9);round(1350,840,150,50,8,'#17151c','#353040');
 x.fillStyle='#101116';x.fillRect(0,894,W,186);line([[0,894],[W,894]],'#363840',5);
 x.save();x.beginPath();x.rect(0,900,W,180);x.clip();x.translate(0,1790);x.scale(1,-.39);x.globalAlpha=.12;x.filter='blur(6px)';scene();x.restore();
 for(let i=0;i<9;i++){x.save();x.globalAlpha=.07;x.strokeStyle=i%2?'#46e4ff':'#ff46a5';x.lineWidth=2;x.beginPath();x.ellipse(470+i*120,960+(i%3)*20,80+i*8,6,0,0,Math.PI*2);x.stroke();x.restore();}
 txt('LIGHT IS THE MATERIAL',960,160,46,'#7b7891',mono,400,'center');H.vignette(x,{strength:.65,inner:.3});H.grain(x,t,{strength:.035,cell:2,seed:55});
}
const glyphs={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01110'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],'!':['1','1','1','1','1','0','1']};
function pixel(t){
 const b=H.offscreen('pixel-target',320,180,()=>{}),g=b.getContext('2d'),r=H.rng(92);g.imageSmoothingEnabled=false;
 const sky=['#120d38','#1b1448','#2a1a5c','#3f2470','#5b2d80','#80377f','#a94379','#d15872','#ef7a6c','#ffa672','#ffd691'];for(let py=0;py<135;py++){g.fillStyle=sky[Math.min(10,Math.floor(py/13))];g.fillRect(0,py,320,1);if(py%13>9){g.fillStyle=sky[Math.min(10,Math.floor(py/13)+1)];for(let px=py%2;px<320;px+=2)g.fillRect(px,py,1,1);}}
 for(let py=-24;py<=24;py++){if(py%5===0)continue;const rad=Math.sqrt(24*24-py*py);g.fillStyle='#ffd691';g.fillRect(266-Math.floor(rad),85+py,Math.ceil(rad*2),1);}
 for(const[base,amp,col,rim]of[[112,23,'#66337a','#b24f80'],[127,17,'#3d2060','#7a3a74']])for(let px=0;px<320;px++){const y=Math.round(base-Math.abs(noise.fbm2(px*.02,base))*amp*2);g.fillStyle=col;g.fillRect(px,y,1,145-y);g.fillStyle=rim;g.fillRect(px,y,1,1);}
 for(let px=0;px<320;){const w=8+Math.floor(r()*12),h=8+Math.floor(r()*36);g.fillStyle='#1b1448';g.fillRect(px,128-h,w,h);g.fillStyle='#80377f';g.fillRect(px,128-h,w,1);for(let a=px+2;a<px+w-1;a+=3)for(let y=130-h;y<125;y+=4)if(r()<.35){g.fillStyle=r()<.5?'#ffd27a':'#6ef0ff';g.fillRect(a,y,1,2);}px+=w+2;}
 function text(s,a,py,col,scale=1){g.fillStyle=col;for(const ch of s){const glyph=glyphs[ch];if(!glyph){a+=4*scale;continue;}for(let yy=0;yy<7;yy++)for(let xx=0;xx<glyph[yy].length;xx++)if(glyph[yy][xx]==='1')g.fillRect(a+xx*scale,py+yy*scale,scale,scale);a+=(glyph[0].length+1)*scale;}}
 text('SIGNAL QUEST',16,17,'#f8f8ff',2);text('BUILD THE NEXT FRAME',16,41,'#ffd57e');
 const sprite=['....KKKKKK.....','...KHHHHHHK....','..KHHHHHHHHK...','..KSSKSSKSSK...','..KSSSSSSSSK...','...KSSSSSSK....','....KKKKKK.....','...KCCCCCCK....','..KCCCCCCCCK...','.KSSKCCCCKSSK..','.KSSKCCCCKSSK..','..KKKCCCCKKK...','....KPPPPK.....','....KPPPPK.....','....KPKKPK.....','....KPKKPK.....','...KBBKKBBK....','...KKKKKKKK....'];const pal={K:'#0b0720',H:'#d15872',S:'#ffd691',C:'#6ef0ff',P:'#3552c0',B:'#a94379'};
 for(let yy=0;yy<sprite.length;yy++)for(let xx=0;xx<sprite[yy].length;xx++){const col=pal[sprite[yy][xx]];if(col){g.fillStyle=col;g.fillRect(73+xx*2,88+yy*2,2,2);}}
 g.fillStyle='#0b0720';g.fillRect(0,128,320,52);g.fillStyle='#b24f80';g.fillRect(0,128,320,2);
 g.fillStyle='#f8f8ff';g.fillRect(6,136,308,39);g.fillStyle='#0b0720';g.fillRect(7,137,306,37);for(let i=0;i<6;i++){g.fillStyle=['#3f62d6','#3552c0','#2b43a8','#223590','#1a2a7a','#132066'][i];g.fillRect(9,139+i*5,302,5);}
 text('EVERY FRAME HAS A PURPOSE',18,145,'#f8f8ff');text('READY FOR THE NEXT IDEA!',18,160,'#ffd57e');
 x.imageSmoothingEnabled=false;x.drawImage(b,0,0,W,HT);x.imageSmoothingEnabled=true;
}
function chalkStroke(pts,col,w=12,seed=5){const p=wobbled(pts,seed,2);for(let i=0;i<4;i++)line(p.map(([a,b])=>[a,b+(i-1.5)*w*.21]),col,w*.55,.45+(i%2)*.1);}
function chalkboard(t){
 texture('chalk-slate','#2c4639',.13);x.save();x.globalAlpha=.055;txt('WHAT IF ...',1200,320,100,'#e8eee6',hand);txt('1 + 1 = 2',300,560,100,'#e8eee6',hand);x.restore();
 const layer=H.offscreen('chalk-content',W,HT,()=>{}),g=layer.getContext('2d');const main=x;g.clearRect(0,0,W,HT);
 // Drawing on a temporary layer lets the tooth remove pigment without erasing slate.
 x.save();const original = x.getImageData(0,0,1,1);x.restore();
 const ink=H.offscreen('chalk-ink',W,HT,(q)=>{
 q.font=`700 126px ${hand}`;q.fillStyle='#f0f2ec';q.fillText('LET THE IDEA GROW',125,200);q.lineCap='round';q.lineJoin='round';
 const stroke=(pts,col,w)=>{q.strokeStyle=col;q.lineWidth=w;for(let z=0;z<3;z++){q.globalAlpha=.45; q.beginPath();pts.forEach(([a,b],i)=>i?q.lineTo(a,b+z*2):q.moveTo(a,b+z*2));q.stroke();}q.globalAlpha=1;};
 stroke(wobbled([[130,230],[1465,238]],3),'#f6de78',10);
 stroke([[260,850],[260,350]],'#f0f2ec',12);stroke([[240,382],[260,350],[282,383]],'#f0f2ec',12);stroke([[260,850],[1390,850]],'#f0f2ec',12);stroke([[1356,829],[1390,850],[1355,872]],'#f0f2ec',12);
 const pts=H.bezier([285,800],[800,830],[800,350],[1360,375],80);stroke(wobbled(pts,5),'#f0f2ec',16);
 q.setLineDash([18,16]);stroke([[1050,440],[1050,850]],'#96cdf0',6);q.setLineDash([]);stroke(ellipsePts(1050,440,90,75),'#f496af',10);
 q.font=`700 62px ${hand}`;q.fillStyle='#f496af';q.fillText('the turning point',1175,470);q.fillStyle='#f0f2ec';q.fillText('time',1410,865);q.save();q.translate(130,715);q.rotate(-Math.PI/2);q.fillText('understanding',0,0);q.restore();
 const d=q.getImageData(0,0,W,HT),r=H.rng(91);for(let i=3;i<d.data.length;i+=4)if(d.data[i]){const a=d.data[i]/255;const grain=.5*r()+.5*(noise.n2((i/4%W)*.12,Math.floor(i/4/W)*.12)*.5+.5);d.data[i]*=Math.max(0,Math.min(1,3*(grain-((1-a)*.95+.06))));}q.putImageData(d,0,0);
 });
 x.save();x.filter='blur(6px)';x.globalAlpha=.22;x.drawImage(ink,0,0);x.restore();x.drawImage(ink,0,0);
 x.fillStyle=gradient(['#96663a','#6e4624','#3e2510'],0,965,0,1035);x.fillRect(0,970,W,80);x.fillStyle='#80542e';x.fillRect(0,0,W,40);x.fillRect(0,0,40,HT);x.fillRect(W-40,0,40,HT);x.fillRect(0,HT-40,W,40);
 const r=H.rng(71);for(let i=0;i<450;i++){x.fillStyle='#f0f2ec33';x.fillRect(100+r()*1600,970+r()*25,1+r()*3,1+r()*2);}round(1410,967,125,22,8,'#ecece4');round(1600,960,150,42,7,'#93806d');H.vignette(x,{strength:.4,inner:.6});
}
function dim(a,b,label,vertical=false){line([a,b],'#eef4ff',1.5);const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);for(const[p,dir]of[[a,1],[b,-1]])poly([p,[p[0]+dir*17*Math.cos(ang)+6*Math.sin(ang),p[1]+dir*17*Math.sin(ang)-6*Math.cos(ang)],[p[0]+dir*17*Math.cos(ang)-6*Math.sin(ang),p[1]+dir*17*Math.sin(ang)+6*Math.cos(ang)]],'#eef4ff');x.save();x.translate((a[0]+b[0])/2,(a[1]+b[1])/2);if(vertical)x.rotate(-Math.PI/2);round(-80,-28,160,50,0,'#163a70');txt(label,0,8,33,'#eef4ff',mono,400,'center');x.restore();}
function blueprint(t){
 texture('blueprint','#163a70',.08);glow(150,80,900,'#4d76ac',.13);
 for(let a=50;a<W;a+=30)line([[a,45],[a,1035]],'#c8dcff',1,a%150===50?.11:.045);for(let b=45;b<HT;b+=30)line([[50,b],[1870,b]],'#c8dcff',1,b%150===45?.11:.045);
 round(45,40,1830,1000,0,null,'#eef4ff',3.6);round(60,55,1800,970,0,null,'#eef4ff',1.5);
 txt('A SYSTEM YOU CAN SEE',125,190,80,'#eef4ff',mono,700);txt('FIG. 01 / ORTHOGRAPHIC STUDY',130,250,32,'#eef4ff',mono,400);
 const col='#eef4ff';round(260,400,500,350,25,null,col,5);round(290,430,440,290,10,null,col,2.4);circle(405,575,82,'#163a70',col,4);circle(405,575,45,'#163a70',col,2.4);circle(620,575,54,'#163a70',col,4);x.setLineDash([27,6,5,6]);line([[210,575],[810,575]],col,1.2,.8);line([[405,360],[405,795]],col,1.2,.8);x.setLineDash([]);
 x.save();x.beginPath();x.roundRect(1020,400,500,350,20);x.roundRect(1050,430,440,290,12);x.clip('evenodd');for(let a=640;a<1600;a+=14)line([[a,370],[a+420,790]],col,1.4,.8);x.restore();round(1020,400,500,350,20,null,col,5);round(1050,430,440,290,12,null,col,3);
 x.setLineDash([3,8]);line([[760,400],[1020,400]],col,1,.35);line([[760,750],[1020,750]],col,1,.35);x.setLineDash([]);
 for(const a of[260,760])line([[a,760],[a,840]],col,1.4);dim([260,820],[760,820],'500 mm');for(const b of[400,750])line([[245,b],[175,b]],col,1.4);dim([195,400],[195,750],'350 mm',true);
 circle(1520,400,4,col);line([[1520,400],[1590,340],[1740,340]],col,1.4);txt('SECTION A',1600,325,30,col,mono,400);txt('FRONT',510,900,35,col,mono,400,'center');txt('CUTAWAY',1270,830,35,col,mono,400,'center');
 round(1230,900,610,105,0,'#163a70',col,2);line([[1230,945],[1840,945]],col,1.4);line([[1450,945],[1450,1005]],col,1.4);txt('SIGNAL HOUSING / REV. A',1250,932,29,col,mono,700);txt('SCALE 1:5',1250,980,25,col,mono,400);txt('DWG 001',1470,980,25,col,mono,400);
 line([[960,55],[960,1025]],'#000a1e',5,.18);line([[966,55],[966,1025]],'#bed2f0',3,.13);H.vignette(x,{strength:.3,inner:.55});H.grain(x,t,{strength:.022,cell:2,seed:39});
}
function keyShape(build,fill,w=4){x.save();x.translate(2.2,1.5);build();x.fillStyle=fill;x.fill();x.restore();build();x.strokeStyle='#1b2236';x.lineWidth=w;x.stroke();x.save();x.translate(1,.75);x.globalAlpha=.5;build();x.lineWidth=w*.6;x.stroke();x.restore();}
function ukiyo(t){
 texture('washi','#ecdfc2',.12);x.fillStyle=gradient(['#6d84a0','#e3d2ab','#efe5cc'],0,0,0,670);x.fillRect(60,55,1800,820);
 keyShape(()=>{x.beginPath();x.arc(1260,300,135,0,Math.PI*2)},'#c4432d',3);
 keyShape(()=>{path([[900,770],[1290,340],[1620,770]],true)},'#6d84a0',4);keyShape(()=>{path([[1184,456],[1290,340],[1390,470],[1317,440],[1274,471],[1230,438]],true)},'#f1e8d2',3);
 const wave=()=>{x.beginPath();x.moveTo(70,925);x.bezierCurveTo(200,380,320,180,730,300);x.bezierCurveTo(1000,380,970,670,785,638);x.bezierCurveTo(650,610,780,465,657,445);x.bezierCurveTo(430,405,625,890,1190,955);x.lineTo(1860,1010);x.lineTo(70,1010);x.closePath();};
 const g=gradient(['#24507e','#16304f'],0,280,0,950);keyShape(wave,g,5);
 x.save();wave();x.clip();for(let k=0;k<13;k++){const pts=H.bezier([105+k*26,960],[250+k*8,430+k*12],[320+k*12,170+k*16],[765+k*6,360+k*19],70);line(pts,k%2?'#f1e8d2':'#4d7ca6',k%2?3:12,.8);}x.restore();
 // Carved foam fingers are hooked Bezier silhouettes, not circle bubbles.
 for(let j=0;j<14;j++){const a=.95+j*.11,base=[570+Math.cos(a)*330,500-Math.sin(a)*230],L=45+j*2.2;for(let f=0;f<3;f++){x.save();x.translate(base[0]+f*12,base[1]+f*7);x.rotate(-.6+j*.08);const len=L*(1-f*.16);keyShape(()=>{x.beginPath();x.moveTo(-10,20);x.bezierCurveTo(-20,-len*.7,25,-len,52,-len*.55);x.bezierCurveTo(30,-len*.7,17,-len*.3,13,28);x.closePath();},'#f1e8d2',2.4);x.restore();}}
 for(let i=0;i<8;i++){const a=820+i*42,b=260+(i%3)*49;keyShape(()=>{path([[a,b],[a+14,b-13],[a+28,b],[a+13,b+13]],true)},'#f1e8d2',2);}
 round(1400,115,370,440,0,'#e8d49a','#1b2236',4);round(1410,125,350,420,0,null,'#1b2236',1.5);txt('FOLLOW',1585,245,58,'#1b2236','Georgia',700,'center');txt('THE',1585,335,58,'#1b2236','Georgia',700,'center');txt('CURRENT',1585,425,55,'#1b2236','Georgia',700,'center');
 x.save();x.translate(1705,540);x.rotate(.06);round(-53,-53,106,106,0,'#c4432d');round(-41,-41,82,82,0,null,'#efe2c6',3);txt('01',0,17,43,'#efe2c6','Georgia',700,'center');x.restore();
 x.save();x.globalAlpha=.5;for(let i=0;i<5;i++)wash(1540+i*95,850-i*24,210,36,'#d4b25a',74+i,.02);x.restore();
 const wood=H.offscreen('wood-grain',480,270,(q,w,h)=>{const r=H.rng(93);for(let y=0;y<h;y++){q.strokeStyle=r()>.5?'#fff8df10':'#1b22360d';q.lineWidth=.5;q.beginPath();q.moveTo(0,y);q.bezierCurveTo(140,y+Math.sin(y*.13)*3,300,y-2,w,y+1);q.stroke();}});x.save();x.globalCompositeOperation='multiply';x.drawImage(wood,0,0,W,HT);x.restore();H.vignette(x,{strength:.22,color:'#5a3c1e',inner:.65});
}
function ball(cx,cy,r,ramp){glow(cx,cy,r*1.9,ramp[1],.28);circle(cx,cy,r,gradient(ramp,cx-r*.7,cy-r*.7,cx+r*.7,cy+r*.7));x.save();x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.clip();for(const[off,alpha]of[[.3,.5],[.66,.225]]){x.beginPath();x.rect(cx-r-2,cy-r-2,r*2+4,r*2+4);x.arc(cx-r*.63*off,cy-r*.78*off,r*1.02,0,Math.PI*2,true);x.fillStyle=ramp[2];x.globalAlpha=alpha;x.fill('evenodd');}x.globalAlpha=.45;x.strokeStyle='#ffffff';x.lineWidth=r*.055;x.beginPath();x.arc(cx,cy,r*.975,3.5,4.7);x.stroke();x.restore();}
function face(cx,cy,r){for(const s of[-1,1]){circle(cx+s*r*.29,cy-r*.1,r*.25,'#fff');circle(cx+s*r*.29-r*.04,cy-r*.11,r*.14,'#141638');circle(cx+s*r*.29-r*.08,cy-r*.16,r*.05,'#fff');}x.strokeStyle='#141638';x.lineWidth=r*.05;x.lineCap='round';x.beginPath();x.arc(cx,cy+r*.12,r*.3,.2,Math.PI-.2);x.stroke();}
function pill(s,cx,cy,size=42){x.font=`900 ${size}px Arial`;const w=x.measureText(s).width+size*1.15;round(cx-w/2,cy-size,w,size*1.6,size*.8,'#fff');txt(s,cx,cy+size*.1,size,'#141846','Arial',900,'center');}
function flatspace(t){
 x.fillStyle=gradient(['#090b2c','#18134f','#3a1a6c'],0,0,W*.3,HT);x.fillRect(0,0,W,HT);glow(1650,120,1050,'#7b34c6',.34);glow(100,HT,930,'#2448b4',.4);const r=H.rng(77);for(let i=0;i<620;i++){const a=r()*W,b=r()*HT,rad=.9+r()*2.1;x.globalAlpha=.4+.5*Math.sin(t*(.8+r()*1.8)+r()*6);circle(a,b,rad,'#cfe4ff');}x.globalAlpha=1;
 txt('SMALL IDEAS.',120,185,108,'#fff','Arial',900);txt('COSMIC POSSIBILITY.',120,310,108,'#ffd23f','Arial',900);
 const py=805,px=1570,pr=290;
 x.save();x.translate(px,py);x.rotate(-.2);x.strokeStyle='#ffcc7a';x.lineWidth=32;x.beginPath();x.ellipse(0,0,pr*1.72,pr*.42,0,Math.PI,Math.PI*2);x.stroke();x.restore();ball(px,py,pr,['#ffa0c4','#de4b93','#4e1670']);
 x.save();x.beginPath();x.arc(px,py,pr,0,Math.PI*2);x.clip();for(let j=0;j<4;j++){x.strokeStyle=j%2?'#ffa0c488':'#4e167044';x.lineWidth=38;x.beginPath();x.ellipse(px,py-140+j*90,pr*1.1,45,0,0,Math.PI);x.stroke();}x.restore();
 x.save();x.translate(px,py);x.rotate(-.2);x.strokeStyle='#ffcc7a';x.lineWidth=32;x.beginPath();x.ellipse(0,0,pr*1.72,pr*.42,0,0,Math.PI);x.stroke();x.restore();
 const heroY=660+Math.sin(t*1.8)*10;ball(900,heroY,160,['#a4fbef','#3ccbdc','#1d64b0']);face(900,heroY,160);ball(440,810,67,['#ffcc7a','#ff8d3f','#d24a2a']);face(440,810,67);ball(250,625,53,['#ffe9be','#ecb676','#b4723c']);face(250,625,53);
 const pts=H.bezier([230,930],[300,1020],[560,1020],[720,760],60);x.save();x.setLineDash([.01,27]);line(pts,'#7ff0ff',14,.8);x.restore();poly([[720,760],[696,793],[679,774]],'#7ff0ff');pill('START HERE',360,490,42);pill('CONNECT',880,435,42);pill('A NEW WORLD',1510,415,42);
 circle(1740,180,50,'#9da4d0');circle(260,400,30,'#ff8d3f');H.grain(x,t,{strength:.075,cell:2,seed:4242,fps:24});
}
const draw={whiteboard,watercolor,'neon-sign':neon,'pixel-16bit':pixel,chalkboard,blueprint,'ukiyo-e':ukiyo,'flat-space':flatspace}[style];
window.DURATION=8;window.FPS=30;
let neonPlate;
window.__ready=Promise.all([document.fonts.load(`700 80px ${hand}`),document.fonts.load(`700 80px ${brush}`),document.fonts.ready]).then(()=>{
 // Neon tubes/reflection are static material. Cache their native blur raster once:
 // Chrome's shadow cache can differ by tiny pixel rounding when redrawn after seeks.
 if(style==='neon-sign'){
   x.reset();neon(5.5);neonPlate=document.createElement('canvas');
   neonPlate.width=W;neonPlate.height=HT;neonPlate.getContext('2d').drawImage(c,0,0);
 }
});
window.__renderFrame=t=>{if(!draw)throw new Error('unknown study style '+style);x.reset();
 if(neonPlate){x.drawImage(neonPlate,0,0);H.grain(x,t,{strength:.012,cell:2,seed:56});}
 else draw(t);
};
window.__ready.then(()=>window.__renderFrame(5.5));
})();
