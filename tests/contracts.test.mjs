import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validate,schemaFor,fingerprint,bundleErrors,publishBundle,releaseErrors} from '../lib/contracts.mjs';
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
