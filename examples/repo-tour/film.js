/* A new-topic tutorial test: one continuous schematic route, timed to a measured voice.
 * Original implementation of prompts/styles/transit-map.md, composed for vertical.
 * No poster assets, remote fonts, wall-clock drawing or inherited frame state.
 */
(() => {
'use strict';
const c=document.getElementById('c'),x=c.getContext('2d'),D=window.TOUR;
window.DURATION=D.duration;window.FPS=30;
const C={paper:'#f7f5ef',ink:'#1b1f3b',muted:'#6a6d80',blue:'#0a6cb8',red:'#dc2a26',green:'#00894a',orange:'#f39419',led:'#ffb21e'};
const P=H.prog,E=H.ease;
const nodes=[
 {p:[0,0],name:'BRIEF',colour:C.blue}, {p:[500,0],name:'STYLE',colour:C.blue},
 {p:[900,400],name:'VOICE',colour:C.red}, {p:[900,1000],name:'TIMELINE',colour:C.red},
 {p:[400,1500],name:'CODE',colour:C.red}, {p:[0,1900],name:'RENDER',colour:C.green},
 {p:[500,2400],name:'CHECK',colour:C.green}, {p:[900,2400],name:'VIDEO',colour:C.green}
];
const cameras=[{cx:520,cy:1120,z:.26},{cx:0,cy:0,z:1.02},{cx:500,cy:0,z:.93},{cx:900,cy:700,z:.77},{cx:200,cy:1700,z:.72},{cx:650,cy:2400,z:.82},{cx:520,cy:1120,z:.26}];
const travel=[[0,.1],[0,.65],[.65,2],[2,3],[3,5],[5,7],[7,7]];
const active=[[0,4,7],[0],[1],[2,3],[4,5],[6,7],[0,4,7]];
window.__audit=[];window.__textBounds=()=>window.__audit;

function rect(a,b,w,h,col,r=0){x.fillStyle=col;x.beginPath();x.roundRect(a,b,w,h,r);x.fill();}
function text(s,a,b,size=50,col=C.ink,weight=700,align='left',critical=false){
 x.font=`${weight} ${size}px Arial,sans-serif`;x.fillStyle=col;x.textAlign=align;x.textBaseline='alphabetic';
 if(critical){const m=x.measureText(s);let left=a-m.actualBoundingBoxLeft,right=a+m.actualBoundingBoxRight;
  window.__audit.push({text:s,critical:true,left,right,top:b-m.actualBoundingBoxAscent,bottom:b+m.actualBoundingBoxDescent});}
 x.fillText(s,a,b);
}
function line(pts,col,w=5,alpha=1){x.save();x.strokeStyle=col;x.lineWidth=w;x.lineCap='butt';x.lineJoin='round';x.globalAlpha=alpha;H.strokePath(x,pts);x.stroke();x.restore();}
function ring(a,b,r,col=C.ink,w=5){x.fillStyle=C.paper;x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();x.stroke();}
function halo(s,a,b,size,col=C.ink,align='left'){
 x.font=`800 ${size}px Arial,sans-serif`;x.textAlign=align;x.textBaseline='alphabetic';x.lineJoin='round';x.lineWidth=size*.24;x.strokeStyle=C.paper;x.strokeText(s,a,b);x.fillStyle=col;x.fillText(s,a,b);
}
function smoothRoute(points,r=55){
 const out=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],u=Math.hypot(b[0]-a[0],b[1]-a[1]),v=Math.hypot(c[0]-b[0],c[1]-b[1]),rr=Math.min(r,u/2,v/2);
  const p=[b[0]-(b[0]-a[0])/u*rr,b[1]-(b[1]-a[1])/u*rr],q=[b[0]+(c[0]-b[0])/v*rr,b[1]+(c[1]-b[1])/v*rr];
  out.push(p,...H.bezier(p,[H.lerp(p[0],b[0],.55),H.lerp(p[1],b[1],.55)],[H.lerp(q[0],b[0],.55),H.lerp(q[1],b[1],.55)],q,12));
 }
 out.push(points[points.length-1]);return H.resample(out,8);
}
const routes=[
 {ids:[0,1,2],colour:C.blue}, {ids:[2,3,4,5],colour:C.red}, {ids:[5,6,7],colour:C.green}
].map(r=>({...r,pts:smoothRoute(r.ids.map(i=>nodes[i].p))}));
const feedback=smoothRoute([[500,2400],[650,2550],[1250,2550],[1400,2400],[1400,1150],[1250,1000],[900,1000]],70);
function loc(pts,u){const k=H.clamp(u,0,1)*(pts.length-1),i=Math.min(pts.length-2,Math.floor(k)),f=k-i;
 return {x:H.lerp(pts[i][0],pts[i+1][0],f),y:H.lerp(pts[i][1],pts[i+1][1],f),a:Math.atan2(pts[i+1][1]-pts[i][1],pts[i+1][0]-pts[i][0])};}
function vehicle(at,zoom){x.save();x.translate(at.x,at.y);x.rotate(at.a);const k=Math.max(1,.70/zoom);x.scale(k,k);x.fillStyle='#fff';x.strokeStyle=C.ink;x.lineWidth=4;x.beginPath();x.roundRect(-38,-17,76,34,12);x.fill();x.stroke();rect(-22,-8,17,16,C.ink,2);rect(7,-8,17,16,C.ink,2);x.restore();}
function camera(t,i){
 const target=cameras[i],prev=cameras[Math.max(0,i-1)],u=E.inOutCubic(P(t,D.beats[i].start,D.beats[i].start+.95));
 return {cx:H.lerp(prev.cx,target.cx,u),cy:H.lerp(prev.cy,target.cy,u),z:H.lerp(prev.z,target.z,u)};
}
function routeProgress(cursor,ids){return H.clamp((cursor-ids[0])/(ids[ids.length-1]-ids[0]),0,1);}
function drawMap(t,i,local,cam,beatAlpha){
 x.save();x.beginPath();x.rect(64,430,952,824);x.clip();x.translate(540,850);x.scale(cam.z,cam.z);x.translate(-cam.cx,-cam.cy);
 const cur=H.lerp(travel[i][0],travel[i][1],E.inOutCubic(P(local,.32,Math.max(.75,D.beats[i].end-D.beats[i].start-.20))));
 for(const r of routes){
  line(r.pts,C.ink,36,.07);line(r.pts,r.colour,26,.14);
  const u=routeProgress(cur,r.ids),part=H.partial(r.pts,u);line(part,r.colour,34,.16);line(part,r.colour,28);
  // Chevrons are position(t), independent of the sequence of frames drawn.
  if(u>.05){const n=Math.floor(r.pts.length/20);for(let j=0;j<n;j++){const a=((j/n+t*.06)%1);if(a>u)continue;const at=loc(r.pts,a);x.save();x.translate(at.x,at.y);x.rotate(at.a);line([[-8,-7],[0,0],[-8,7]],'#fff',3,.85);x.restore();}}
 }
 if(i>=5){const fu=i===5?E.inOutCubic(P(local,.5,2.3)):1,fa=i===5?P(local,0,.25):1;line(feedback,C.orange,22,.16*fa);line(H.partial(feedback,fu),C.orange,18,.85*fa);}
 for(let j=0;j<nodes.length;j++){
  const n=nodes[j],isActive=active[i].includes(j),arrived=cur>=j-.08;
  const r=(j===0||j===2||j===5||j===7)?27:17;
  if(j===0||j===2||j===5||j===7)ring(...n.p,r,arrived?C.ink:'#b8bac4',5);
  else if(j===4){line([[n.p[0]-24,n.p[1]-24],[n.p[0]+6,n.p[1]+6]],arrived?n.colour:'#b8bac4',11);}
  else if(j===3){line([[n.p[0]-30,n.p[1]],[n.p[0]+10,n.p[1]]],arrived?n.colour:'#b8bac4',11);}
  else{line([[n.p[0],n.p[1]-30],[n.p[0],n.p[1]+10]],arrived?n.colour:'#b8bac4',11);}
  if(isActive){
   // Labels counter-scale to remain legible. Final overview keeps only three names.
   const wasActive=i>0&&active[i-1].includes(j),willActive=i<D.beats.length-1&&active[i+1].includes(j);
   const aIn=(i===0||wasActive)?1:P(local,.68,.92),aOut=(i===D.beats.length-1||willActive)?1:1-P(t,D.beats[i].end-.22,D.beats[i].end);
   const fs=54/cam.z,upper=[0,1,4,6,7].includes(j);
   const lx=j===4?n.p[0]-95/cam.z:j===3?n.p[0]-135/cam.z:n.p[0];
   const ly=j===4?n.p[1]-45/cam.z:j===3?n.p[1]+18/cam.z:n.p[1]+(upper?-62:90)/cam.z;
   const sx=540+(lx-cam.cx)*cam.z,sy=850+(ly-cam.cy)*cam.z;
   if(sx>=150&&sx<=930&&sy>=465&&sy<=1235){
    x.save();x.globalAlpha=Math.min(aIn,aOut);
    halo(n.name,lx,ly,fs,C.ink,'center');
    x.restore();
   }
  }
 }
 let rr=routes.find(r=>cur>=r.ids[0]&&cur<=r.ids[r.ids.length-1])||routes[2];
 vehicle(loc(rr.pts,routeProgress(cur,rr.ids)),cam.z);
 x.save();x.globalAlpha=Math.min(P(local,.48,.76),beatAlpha);
 if(i===1){
  const a=nodes[0].p;halo('WHO?',a[0]-190,a[1]+160,44/cam.z,C.blue,'center');halo('WHAT?',a[0]+190,a[1]+160,44/cam.z,C.blue,'center');
  line([[a[0]-230,a[1]+205],[a[0]+230,a[1]+205]],C.blue,4,.35);
 }
 if(i===3){
  // Three timelines share the same playhead: no independently drifting clocks.
  const a=1000,b=600,w=250,h=65,head=(t*90)%w;
  [C.red,C.blue,C.green].forEach((col,k)=>{line([[a,b+k*h],[a+w,b+k*h]],col,17,.85);});
  line([[a+head,b-30],[a+head,b+2*h+30]],C.ink,5);
 }
 if(i===4){
  for(let k=0;k<3;k++){const a=-100+k*110,b=2050;rect(a,b,90,70,C.paper,4);x.strokeStyle=C.ink;x.lineWidth=4;x.strokeRect(a,b,90,70);line([[a+15,b+48],[a+35,b+23],[a+53,b+41],[a+75,b+14]],C.green,4);}
 }
 x.restore();
 x.restore();
}

const GLYPHS={
 A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01110',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',Y:'10001/10001/01010/00100/00100/00100/00100',0:'01110/10001/10011/10101/11001/10001/01110',1:'00100/01100/00100/00100/00100/00100/01110',2:'01110/10001/00001/00010/00100/01000/11111',3:'11110/00001/00001/01110/00001/00001/11110',4:'00010/00110/01010/10010/11111/00010/00010',5:'11111/10000/10000/11110/00001/00001/11110',6:'01110/10000/10000/11110/10001/10001/01110',7:'11111/00001/00010/00100/01000/01000/01000',8:'01110/10001/10001/01110/10001/10001/01110',9:'01110/10001/10001/01111/00001/00001/01110'
};
let paper,board;
function led(value,alpha=1){
 x.drawImage(board,150,1280);const pitch=11,step=pitch*6,total=(value.length*6-1)*pitch,start=(1080-total)/2;
 x.save();x.globalAlpha=alpha;
 for(let k=0;k<value.length;k++){
  const rows=(GLYPHS[value[k]]||'00000/00000/00000/00000/00000/00000/00000').split('/');
  for(let r=0;r<7;r++)for(let col=0;col<5;col++)if(rows[r][col]==='1'){
   const a=start+k*step+col*pitch,b=1315+r*pitch;
   x.fillStyle='#ffb21e20';x.beginPath();x.arc(a,b,6.0,0,Math.PI*2);x.fill();
   x.fillStyle=C.led;x.beginPath();x.arc(a,b,3.6,0,Math.PI*2);x.fill();
   x.fillStyle='#ffe1a6';x.beginPath();x.arc(a-.7,b-.7,1.2,0,Math.PI*2);x.fill();
  }
 }
 x.restore();
}
function checkMarks(t,i,local,beatAlpha){
 if(i!==5)return;
 x.save();x.globalAlpha=Math.min(P(local,.62,.88),beatAlpha);
 for(let k=0;k<3;k++){
  const a=270+k*270,b=1110,done=local>.75+k*.45;
  ring(a,b,28,done?C.green:C.muted,4);
  if(done)line([[a-14,b],[a-3,b+12],[a+17,b-14]],C.green,6);
  text(['FRAMES','TEXT','AUDIO'][k],a,b+73,28,C.ink,700,'center');
 }
 x.restore();
}
window.__renderFrame=t=>{
 x.reset();
 let i=0;for(let k=0;k<D.beats.length;k++)if(t>=D.beats[k].start)i=k;
 const beat=D.beats[i],local=Math.max(0,t-beat.start),cam=camera(t,i);
 x.drawImage(paper,0,0);window.__audit=[];
 // Fixed typography provides an anchor while the printed network moves beneath it.
 [C.blue,C.red,C.green].forEach((col,k)=>rect(86+k*34,112,26,9,col));
 text('VIDEO / BY CODE',86,175,29,C.ink,800);
 const colour=i<3?C.blue:i<5?C.red:C.green;
 const fadeIn=i===0?1:P(local,0,.20),fadeOut=i===D.beats.length-1?1:1-P(t,beat.end-.20,beat.end),beatAlpha=Math.min(fadeIn,fadeOut);
 x.save();x.globalAlpha=beatAlpha;
 text(`${String(i+1).padStart(2,'0')} / 07`,950,175,29,C.muted,600,'right');
 beat.title.forEach((s,k)=>text(s,86,283+k*104,99,k===1?colour:C.ink,800,'left',true));
 x.restore();
 drawMap(t,i,local,cam,beatAlpha);checkMarks(t,i,local,beatAlpha);
 let v=['ROUTE','BRIEF','86','SYNC','30FPS','CHECK','READY'][i];
 if(i===2)v=String(Math.round(86*E.outCubic(P(local,.15,1.65))));
 led(v,beatAlpha);
 x.save();x.globalAlpha=beatAlpha;
 text(['THE COMPLETE JOURNEY','A QUESTION WORTH ANSWERING','STYLE RECIPES, NOT FINISHED FILMS','VOICE + SCENES + CAPTIONS','EXACT MOMENTS → FRAMES','INSPECT THE ENCODED RESULT','HUMANS DIRECT / AGENTS BUILD'][i],540,1450,24,C.muted,600,'center');
 beat.lines.forEach((s,k)=>text(s,520,1554+k*68,48,C.ink,500,'center',true));
 if(i===6)text('README → RUNBOOK → RECIPES',540,1720,32,C.green,800,'center');
 x.restore();
 rect(80,1492,880,4,colour);
 if(i<6){x.save();x.globalAlpha=i===5?fadeOut:1;text('A PRACTICAL GUIDE FOR HUMANS + AGENTS',540,1720,24,C.muted,600,'center');x.restore();}
 rect(80,1785,880,3,'#d7d6d0');rect(80,1785,880*H.clamp(t/D.duration,0,1),3,colour);
};
window.scoreSound=k=>{
 D.beats.forEach((b,i)=>{k.play('tock',b.start+.10,{gain:.10,minor:true,f:460+i*45});});
 for(let j=0;j<3;j++)k.tone(D.beats[6].start+.5+j*.12,{f:[523.25,659.25,783.99][j],dur:.32,gain:.045});
};
window.__ready=document.fonts.ready.then(()=>{
 paper=H.paperTexture(1080,1920,{seed:'metro-tour',tone:C.paper,fiber:.15,grain:.12,blotch:.06});
 board=H.offscreen('metro-board',780,142,(q)=>{
  q.fillStyle='#2e313c';q.fillRect(0,0,780,142);q.fillStyle='#121317';q.fillRect(7,7,766,128);
  q.fillStyle='#ffb21e13';for(let a=15;a<775;a+=11)for(let b=12;b<135;b+=11){q.beginPath();q.arc(a,b,2.6,0,Math.PI*2);q.fill();}
 });
});
})();
