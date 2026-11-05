import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {
  LAYER_SLOTS,validate,schemaFor,fingerprint,bundleErrors,publishBundle,
  parseCueAnchor,resolveCues,resolveLook,rendererErrors,bindStageToPage,releaseErrors
} from '../lib/contracts.mjs';
const hash='a'.repeat(64);
const bundle=()=>({schemaVersion:1,inputsDigest:hash,format:'instrumental',narrated:false,width:1920,height:1080,fps:30,duration:10,look:{id:'pilot',fingerprint:hash,resolved:{}},beats:[{id:'one',type:'title',start:0,end:10,content:{text:'Pilot'}}],words:[],mouth:{fps:12,shapes:''},music:{beats:[],downbeats:[],sections:[]},captions:[],tracks:[],score:[]});
test('bundle accepts fixture and rejects each missing required field',async()=>{
 const s=await schemaFor('bundle');assert.deepEqual(validate(s,bundle()),[]);
 for(const k of s.required){const b=bundle();delete b[k];assert.ok(validate(s,b).length,k);}
});
test('unknown versions/types and corrupt track hashes fail',async()=>{
 const s=await schemaFor('bundle');
 for(const mutate of [b=>b.schemaVersion=2,b=>b.beats[0].type='unknown',b=>b.tracks.push({id:'x',kind:'music',asset:'x.wav',sha256:'bad',offset:0,gain:1,language:'und'})]){const b=bundle();mutate(b);assert.ok(validate(s,b).length);}
});
test('bad timeline and empty narrated film fail semantic checks',()=>{
 const b=bundle();b.beats[0].end=11;assert.ok(bundleErrors(b).length);b.beats[0].end=0;assert.ok(bundleErrors(b).length);b.beats=[];b.format='explainer';b.narrated=true;assert.ok(bundleErrors(b).length);
});
test('fingerprints ignore key order and change with content/language/model',()=>{
 const a={text:'hello',language:'en',model:'v1'};assert.equal(fingerprint(a),fingerprint({model:'v1',text:'hello',language:'en'}));
 for(const [k,v] of [['text','reroll'],['language','ja'],['model','v2']])assert.notEqual(fingerprint(a),fingerprint({...a,[k]:v}));
});
test('invalid assembly preserves last good bundle',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'vbc-contracts-')),path=join(dir,'bundle.json');
 try{await publishBundle(path,bundle());const before=await readFile(path,'utf8'),bad=bundle();bad.duration=-1;await assert.rejects(publishBundle(path,bad));assert.equal(await readFile(path,'utf8'),before);}finally{await rm(dir,{recursive:true,force:true});}
});
test('cue schema and compiler resolve forward phrases, explicit #N occurrences and music anchors',async()=>{
 const s=await schemaFor('cue');
 const doc={schemaVersion:1,cues:[
  {id:'c1',line:1,anchor:'@ cold open',type:'title',content:{text:'One'}},
  {id:'c2',line:3,anchor:'@ cold open',type:'big',content:{text:'Two'}},
  {id:'c3',line:5,anchor:'@bar 2',type:'list',content:{items:['a']}},
  {id:'c4',line:7,anchor:'@beat 4',type:'flow',content:{nodes:[]}},
  {id:'c5',line:9,anchor:'@section drop',type:'custom',content:{}}
 ]};
 assert.deepEqual(validate(s,doc),[]);
 const words=[
  {text:'Cold',spoken:'cold',start:0.5,end:0.8,confidence:1},
  {text:'open,',spoken:'open',start:0.8,end:1.2,confidence:1},
  {text:'bridge',spoken:'bridge',start:1.5,end:1.9,confidence:1},
  {text:'cold',spoken:'cold',start:2.0,end:2.3,confidence:1},
  {text:'open!',spoken:'open',start:2.3,end:2.7,confidence:1}
 ];
 const music={beats:[1,2,3,5.5],downbeats:[1,4],sections:[{name:'drop',start:7}]};
 const beats=resolveCues(doc,{words,music,duration:10});
 assert.deepEqual(beats.map(b=>[b.id,b.start,b.end]),[['c1',0.5,2],['c2',2,4],['c3',4,5.5],['c4',5.5,7],['c5',7,10]]);
 const explicit=resolveCues({schemaVersion:1,cues:[{id:'only2',line:2,anchor:'@ cold open #2',type:'title',content:{}}]},{words,music,duration:10});
 assert.equal(explicit[0].start,2);
});
test('cue compiler rejects missing, ambiguous and backward anchors with candidate timestamps',()=>{
 const words=[
  {text:'first',spoken:'first',start:1,end:1.4,confidence:1},
  {text:'repeat',spoken:'repeat',start:2,end:2.4,confidence:1},
  {text:'repeat',spoken:'repeat',start:2,end:2.4,confidence:1},
  {text:'later',spoken:'later',start:4,end:4.5,confidence:1}
 ];
 const music={beats:[1,2],downbeats:[1],sections:[{name:'dup',start:1},{name:'dup',start:3}]};
 assert.throws(()=>resolveCues({cues:[{id:'m',line:4,anchor:'@ nowhere',type:'title',content:{}}]},{words,music,duration:6}),/line 4.*missing phrase "nowhere".*candidates:/);
 assert.throws(()=>resolveCues({cues:[{id:'a',line:6,anchor:'@ repeat',type:'title',content:{}}]},{words,music,duration:6}),/line 6.*ambiguous phrase "repeat".*2\.00s/);
 assert.throws(()=>resolveCues({cues:[{id:'b1',line:1,anchor:'@ later',type:'title',content:{}},{id:'b2',line:2,anchor:'@ first #1',type:'big',content:{}}]},{words,music,duration:6}),/line 2.*moves backwards/);
 assert.throws(()=>resolveCues({cues:[{id:'s',line:8,anchor:'@section dup',type:'title',content:{}}]},{words,music,duration:6}),/line 8.*ambiguous @section dup/);
 assert.throws(()=>parseCueAnchor('bad anchor'),/must start with @/);
});
test('layer resolver enforces 10 slots, locked identity layers, supported overrides and requires/provides coupling',()=>{
 const catalog={};
 for(const slot of LAYER_SLOTS)catalog[`${slot}/base-${slot}`]={schemaVersion:1,id:`base-${slot}`,slot,requires:[],provides:slot==='ground'?['light-map']:[],draw(){}};
 catalog['marks/base-marks'].requires=['light-map'];catalog['marks/base-marks'].provides=['emissive'];
 catalog['palette/risograph']={schemaVersion:1,id:'risograph',slot:'palette',requires:[],provides:[],draw(){}};
 catalog['ground/flat-paper']={schemaVersion:1,id:'flat-paper',slot:'ground',requires:[],provides:['matte'],draw(){}};
 const look={
  id:'neon-sign',
  slots:Object.fromEntries(LAYER_SLOTS.map(s=>[s,`base-${s}`])),
  identitySlots:['marks','finish'],
  supportedOverrides:{palette:['risograph'],ground:['flat-paper']}
 };
 const ok=resolveLook(look,{palette:'risograph'},catalog);
 assert.equal(ok.slots.palette,'risograph');
 assert.ok(ok.capabilities.includes('emissive'));
 assert.throws(()=>resolveLook(look,{marks:'other'},catalog),/locked identity layer/);
 assert.throws(()=>resolveLook(look,{motion:'other'},catalog),/not supported/);
 assert.throws(()=>resolveLook(look,{ground:'flat-paper'},catalog),/requires missing capability "light-map"/);
});
test('renderer schema and stage instance contract isolate multi-tile instances and bind page globals',async()=>{
 const s=await schemaFor('renderer');
 const spec={schemaVersion:1,mode:'export',width:1920,height:1080,fps:30,duration:10,from:0,to:10,audio:'bundle',pinnedEnv:true};
 assert.deepEqual(validate(s,spec),[]);assert.deepEqual(rendererErrors(spec),[]);
 assert.ok(rendererErrors({...spec,width:1921}).length);assert.ok(rendererErrors({...spec,from:5,to:5}).length);
 const createStage=({seed})=>{let disposed=false;return {ready:Promise.resolve(seed),renderFrame:t=>{if(disposed)throw new Error('disposed');return `${seed}:${t.toFixed(3)}`;},dispose:()=>{disposed=true;}};};
 const tileA=createStage({seed:'A'}),tileB=createStage({seed:'B'}),win={};
 const unbind=bindStageToPage(win,tileA,bundle());
 assert.equal(win.DURATION,10);assert.equal(win.__renderFrame(1.5),'A:1.500');assert.equal(tileB.renderFrame(1.5),'B:1.500');
 unbind();assert.equal(tileB.renderFrame(1.5),'B:1.500');assert.throws(()=>win.__renderFrame(1.5),/disposed/);
 assert.throws(()=>bindStageToPage({},null,bundle()),/stage instance must expose/);
});
test('release rejects empty/unresolved scopes, stale or absent approvals',()=>{
 const e={id:'pilot',launch:true,status:'accepted',approval:{reviewer:'David',date:'2026-11-05',evidence:['landscape','vertical'].map(aspect=>({aspect,clip:aspect+'.webm',moving:true,sound:true})),fingerprint:hash}},m={scopeFrozen:true,unresolvedSources:[],entries:[e]};
 assert.deepEqual(releaseErrors(m,{pilot:hash}),[]);
 for(const bad of [{...m,entries:[]},{...m,scopeFrozen:false},{...m,unresolvedSources:['missing']},{...m,entries:[{...e,approval:undefined}]}])assert.ok(releaseErrors(bad,{pilot:hash}).length);
 assert.ok(releaseErrors(m,{pilot:'b'.repeat(64)}).length);
});
test('manifest and layer validate; unknown schema vocabulary fails loudly',async()=>{
 const m=JSON.parse(await readFile(new URL('../looks/manifest.json',import.meta.url),'utf8'));assert.deepEqual(validate(await schemaFor('manifest'),m),[]);assert.ok(releaseErrors(m,{}).length);
 const s=await schemaFor('layer'),layer={schemaVersion:1,id:'glass',slot:'marks',requires:['light-map'],provides:['emissive']};assert.deepEqual(validate(s,layer),[]);assert.ok(validate(s,{...layer,slot:'unknown'}).length);assert.throws(()=>validate({unsupported:true},{}));
});
test('CLI smoke: manifest passes, unsupported commands and broken inputs fail',()=>{
 const cli=new URL('../bin/vbc.mjs',import.meta.url).pathname,run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
 assert.equal(run('--help').status,0);assert.equal(run('validate','manifest',new URL('../looks/manifest.json',import.meta.url).pathname).status,0);
 assert.equal(run('make','pilot').status,1);assert.equal(run('validate','bundle').status,1);assert.equal(run('validate','manifest','/does-not-exist').status,1);
});
test('unknown inherited-name fields cannot bypass strict schemas',async()=>{
 const s=await schemaFor('bundle');for(const k of ['constructor','toString','__proto__']){const b=bundle();Object.defineProperty(b,k,{value:'unexpected',enumerable:true});assert.ok(validate(s,b).length,k);}
});
test('absolute and parent-traversing media paths fail',()=>{
 for(const asset of ['/private/song.wav','../song.wav','C:/song.wav']){const b=bundle();b.tracks=[{asset}];assert.ok(bundleErrors(b).length,asset);}
});
test('a single still cannot count as release evidence; silent explainers remain supported',()=>{
 const m={scopeFrozen:true,unresolvedSources:[],entries:[{id:'pilot',launch:true,status:'accepted',approval:{reviewer:'David',date:'2026-11-05',fingerprint:hash,evidence:['still.png']}}]};assert.ok(releaseErrors(m,{pilot:hash}).length);
 const b=bundle();b.format='explainer';assert.deepEqual(bundleErrors(b),[]);
});
