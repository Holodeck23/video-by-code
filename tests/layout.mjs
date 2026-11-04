// Check rendered text bounds over every frame in the worked examples.
// node tests/layout.mjs [--json /absolute/receipt.json]
import { openPage } from '../starter/lib-render/page.mjs';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const results=[];
for(const name of ['narrated-explainer','vertical-short','repo-tour/film']){
  const file=fileURLToPath(new URL(`../examples/${name}.html`,import.meta.url));
  const {browser,page,meta}=await openPage(file);
  try{
    const result=await page.evaluate(({duration,fps,width,height})=>{
      const proto=CanvasRenderingContext2D.prototype,original=proto.fillText;
      let t=0,draws=0,criticalDraws=0;const bad=[];
      proto.fillText=function(s,x,y,...rest){
        if(this.canvas.id==='c'&&this.globalAlpha>.05){
          draws++;const m=this.measureText(s),tr=this.getTransform();
          const a=x-m.actualBoundingBoxLeft,b=x+m.actualBoundingBoxRight;
          const c=y-m.actualBoundingBoxAscent,d=y+m.actualBoundingBoxDescent;
          const p=[[a,c],[b,c],[a,d],[b,d]].map(([x,y])=>({x:tr.a*x+tr.c*y+tr.e,y:tr.b*x+tr.d*y+tr.f}));
          if(p.some(q=>q.x<0||q.y<0||q.x>width||q.y>height)){
            if(bad.length<20)bad.push({t:Number(t.toFixed(3)),text:String(s),bounds:p});
          }
        }
        return original.call(this,s,x,y,...rest);
      };
      const frames=Math.round(duration*fps);
      try{
        for(let i=0;i<frames;i++){
          t=i/fps;window.__renderFrame(t);
          if(typeof window.__textBounds==='function'){
            for(const b of window.__textBounds()){
              if(!b.critical)continue;
              criticalDraws++;
              if(b.left<80||b.right>width-120||b.top<190||b.bottom>height-280){
                if(bad.length<20)bad.push({t:Number(t.toFixed(3)),text:b.text,safeBox:b});
              }
            }
          }
        }
      }
      finally{proto.fillText=original;}
      return{frames,textDraws:draws,criticalDraws,violations:bad};
    },meta);
    results.push({page:name,...result});
  }finally{await browser.close();}
}
const report={status:results.every(r=>r.violations.length===0)?'PASS':'FAIL',
  scope:'fillText ink bounds against canvas on every frame (plus __textBounds critical safe-area bounds when exposed); does not prove contrast, visual hierarchy, overlaps or platform UI safety',results};
const at=process.argv.indexOf('--json');if(at>=0)writeFileSync(process.argv[at+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='PASS'?0:1;
