import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
// Evaluates only the keywords used in our provisional schemas; not a general JSON Schema implementation.
const keys=new Set(['$schema','type','const','enum','required','properties','additionalProperties','items','minimum','maximum','exclusiveMinimum','minLength','pattern']);
export const LAYER_SLOTS=['palette','ground','marks','type','composition','progression','motion','transitions','finish','host'];
export function validate(schema,value,at='$') {
  for(const k of Object.keys(schema)) if(!keys.has(k)) throw new Error(`unsupported schema keyword ${k}`);
  const errors=[], fail=m=>errors.push(`${at}: ${m}`);
  if('const' in schema && value!==schema.const) fail('wrong constant');
  if(schema.enum && !schema.enum.includes(value)) fail('unknown value');
  const type=Array.isArray(value)?'array':value===null?'null':typeof value;
  if(schema.type && !(schema.type==='integer'?Number.isInteger(value):type===schema.type))return [...errors,`${at}: expected ${schema.type}`];
  if(type==='number') {
    if(!Number.isFinite(value))fail('must be finite');
    if('minimum' in schema && value<schema.minimum)fail('below minimum');
    if('maximum' in schema && value>schema.maximum)fail('above maximum');
    if('exclusiveMinimum' in schema && value<=schema.exclusiveMinimum)fail('below exclusive minimum');
  }
  if(type==='string') {
    if(schema.minLength && [...value].length<schema.minLength)fail('empty string');
    if(schema.pattern && !new RegExp(schema.pattern).test(value))fail('invalid pattern');
  }
  if(type==='array' && schema.items)value.forEach((v,i)=>errors.push(...validate(schema.items,v,`${at}[${i}]`)));
  if(type==='object') {
    for(const k of schema.required??[])if(!Object.hasOwn(value,k))fail(`missing ${k}`);
    for(const [k,v] of Object.entries(value)) {
      if(schema.properties && Object.hasOwn(schema.properties,k))errors.push(...validate(schema.properties[k],v,`${at}.${k}`));
      else if(schema.additionalProperties===false)fail(`unknown field ${k}`);
    }
  }
  return errors;
}
export async function schemaFor(kind) {
  if(!['bundle','cue','layer','renderer','manifest'].includes(kind))throw new Error('expected bundle, cue, layer, renderer or manifest');
  return JSON.parse(await readFile(new URL(`../schemas/${kind}.schema.json`,import.meta.url),'utf8'));
}
function canonical(v) {
  if(Array.isArray(v))return v.map(canonical);
  if(v && typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
  return v;
}
export const fingerprint=inputs=>createHash('sha256').update(JSON.stringify(canonical(inputs))).digest('hex');
export function bundleErrors(b) {
  const errors=[];
  for(const key of ['beats','words','captions']) {
    let last=-Infinity;const ids=new Set();
    for(const item of b[key]) {
      if(item.start<last || item.end<=item.start || item.end>b.duration)errors.push(`${key}: invalid range/order`);
      if(item.id && ids.has(item.id))errors.push(`${key}: duplicate id`);
      ids.add(item.id);last=item.start;
    }
  }
  if(b.width%2 || b.height%2)errors.push('dimensions must be even');
  if(b.narrated && (!b.words.length || !b.tracks.some(t=>t.kind==='narration')))errors.push('explainer needs words and narration');
  for(const asset of [...b.tracks.map(t=>t.asset),...(b.music.features?[b.music.features.asset]:[])]) {
    if(asset.startsWith('/') || asset.includes('\\') || asset.includes(':') || asset.split('/').includes('..'))errors.push('asset must be a portable relative path');
  }
  return errors;
}
export async function publishBundle(path,bundle) {
  const errors=validate(await schemaFor('bundle'),bundle);
  if(!errors.length)errors.push(...bundleErrors(bundle));
  if(errors.length)throw new Error(errors.join('\n'));
  const tmp=`${path}.${randomUUID()}.tmp`;
  try {await writeFile(tmp,JSON.stringify(bundle,null,2)+'\n',{flag:'wx'});await rename(tmp,path);}
  finally {await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
const normTok=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu,'');
export function parseCueAnchor(anchor) {
  const s=String(anchor??'').trim();
  if(!s.startsWith('@'))throw new Error(`invalid cue anchor "${anchor}": must start with @`);
  const body=s.slice(1).trim();
  let m=body.match(/^(bar|beat)\s+([1-9][0-9]*)$/);
  if(m)return {kind:m[1],index:Number(m[2])};
  m=body.match(/^section\s+(\S+)$/);
  if(m)return {kind:'section',name:m[1]};
  m=body.match(/^(.*?)(?:\s+#([1-9][0-9]*))?$/);
  const phrase=(m?.[1]??'').trim();
  if(!phrase)throw new Error(`empty cue anchor "${anchor}"`);
  return {kind:'phrase',phrase,occurrence:m?.[2]?Number(m[2]):null};
}
export function resolveCues(doc,{words=[],music={beats:[],downbeats:[],sections:[]},duration}) {
  if(!Number.isFinite(duration) || duration<=0)throw new Error('resolveCues requires positive duration');
  const toks=words.map((w,i)=>({...w,i,norm:normTok(w.text||w.spoken)})),resolved=[];
  let cursor=0,lastTime=-Infinity;
  for(const cue of doc.cues??[]) {
    const a=parseCueAnchor(cue.anchor);
    let start=0;
    if(a.kind==='bar' || a.kind==='beat') {
      const grid=a.kind==='bar'?music.downbeats:music.beats;
      if(a.index>grid.length)throw new Error(`line ${cue.line} (${cue.id}): @${a.kind} ${a.index} out of range (max ${grid.length})`);
      start=grid[a.index-1];
    } else if(a.kind==='section') {
      const hits=(music.sections??[]).filter(s=>s.name===a.name);
      if(hits.length!==1) {
        const cands=(music.sections??[]).map(s=>`${s.name}@${s.start.toFixed(2)}s`).join(', ')||'none';
        throw new Error(`line ${cue.line} (${cue.id}): ${hits.length?'ambiguous':'missing'} @section ${a.name} (candidates: ${cands})`);
      }
      start=hits[0].start;
    } else {
      const q=a.phrase.split(/\s+/).map(normTok).filter(Boolean);
      if(!q.length)throw new Error(`line ${cue.line} (${cue.id}): phrase has no comparable tokens`);
      const all=[];
      for(let i=0;i<=toks.length-q.length;i++) {
        if(q.every((t,k)=>toks[i+k].norm===t))all.push({wordIndex:i,start:toks[i].start,end:toks[i+q.length-1].end,text:words.slice(i,i+q.length).map(w=>w.text).join(' ')});
      }
      const fmt= list=>list.map((m,idx)=>`#${idx+1} "${m.text}"@${m.start.toFixed(2)}s`).join(', ')||'none';
      if(a.occurrence!==null) {
        const hit=all[a.occurrence-1];
        if(!hit)throw new Error(`line ${cue.line} (${cue.id}): missing "${a.phrase} #${a.occurrence}" (candidates: ${fmt(all)})`);
        if(hit.wordIndex<cursor || hit.start<lastTime)throw new Error(`line ${cue.line} (${cue.id}): "${a.phrase} #${a.occurrence}"@${hit.start.toFixed(2)}s moves backwards before ${lastTime.toFixed(2)}s`);
        start=hit.start;cursor=hit.wordIndex+q.length;
      } else {
        const fwd=all.filter(m=>m.wordIndex>=cursor && m.start>=lastTime);
        if(!fwd.length)throw new Error(`line ${cue.line} (${cue.id}): missing phrase "${a.phrase}" from ${Math.max(0,lastTime).toFixed(2)}s (candidates: ${fmt(all)})`);
        if(fwd.length>1 && fwd[0].start===fwd[1].start)throw new Error(`line ${cue.line} (${cue.id}): ambiguous phrase "${a.phrase}" (candidates: ${fmt(fwd)})`);
        start=fwd[0].start;cursor=fwd[0].wordIndex+q.length;
      }
    }
    if(start<lastTime)throw new Error(`line ${cue.line} (${cue.id}): cue at ${start.toFixed(2)}s precedes previous cue at ${lastTime.toFixed(2)}s`);
    lastTime=start;
    resolved.push({id:cue.id,type:cue.type,start,content:cue.content});
  }
  return resolved.map((r,i)=>({...r,end:i+1<resolved.length?resolved[i+1].start:duration}));
}
export function resolveLook(look,overrides={},catalog={}) {
  const errors=[];
  for(const slot of LAYER_SLOTS)if(!look.slots?.[slot])errors.push(`look ${look.id}: missing slot ${slot}`);
  if(errors.length)throw new Error(errors.join('\n'));
  const identity=new Set(look.identitySlots??[]),allowed=look.supportedOverrides??{};
  const selected={...look.slots};
  for(const [slot,optId] of Object.entries(overrides)) {
    if(!LAYER_SLOTS.includes(slot))errors.push(`unknown override slot ${slot}`);
    else if(identity.has(slot))errors.push(`slot ${slot} is a locked identity layer on ${look.id}`);
    else if(!allowed[slot] || (Array.isArray(allowed[slot]) && !allowed[slot].includes(optId)))errors.push(`override ${slot}=${optId} is not supported by ${look.id}`);
    else selected[slot]=optId;
  }
  const layers=[],provided=new Set();
  for(const slot of LAYER_SLOTS) {
    const id=selected[slot],layer=catalog[`${slot}/${id}`]??catalog[id];
    if(!layer)errors.push(`missing layer definition for ${slot}/${id}`);
    else {
      if(layer.slot!==slot)errors.push(`layer ${id} belongs to ${layer.slot}, not ${slot}`);
      if(layer.draw && typeof layer.draw!=='function')errors.push(`layer ${id}: draw must be a function`);
      layers.push(layer);
      for(const cap of layer.provides??[])provided.add(cap);
    }
  }
  for(const layer of layers)for(const req of layer.requires??[])if(!provided.has(req))errors.push(`layer ${layer.slot}/${layer.id} requires missing capability "${req}"`);
  if(errors.length)throw new Error(errors.join('\n'));
  return {id:look.id,slots:selected,capabilities:[...provided].sort(),fingerprint:fingerprint({look:look.id,slots:selected})};
}
export function rendererErrors(spec) {
  const errors=[];
  if(spec.width%2 || spec.height%2)errors.push('renderer dimensions must be even');
  if(spec.from<0 || spec.from>=spec.to || spec.to>spec.duration)errors.push('renderer range must satisfy 0 <= from < to <= duration');
  return errors;
}
export function bindStageToPage(win,stage,bundle) {
  if(!stage || typeof stage.ready?.then!=='function' || typeof stage.renderFrame!=='function' || typeof stage.dispose!=='function') {
    throw new Error('stage instance must expose {ready: Promise, renderFrame(t), dispose()}');
  }
  win.DURATION=bundle.duration;win.FPS=bundle.fps;win.__ready=stage.ready;
  win.__renderFrame=t=>stage.renderFrame(t);
  return ()=>stage.dispose();
}
export function releaseErrors(m,current) {
  const errors=[];
  if(!m.scopeFrozen || m.unresolvedSources.length)errors.push('launch scope is not frozen/complete');
  if(new Set(m.entries.map(e=>e.id)).size!==m.entries.length)errors.push('duplicate manifest id');
  const launch=m.entries.filter(e=>e.launch);
  if(!launch.length)errors.push('empty launch scope');
  for(const e of launch) {
    if(e.status!=='accepted' || !e.approval?.reviewer || !e.approval?.date || !e.approval?.evidence?.length)errors.push(`${e.id}: missing approval/evidence`);
    for(const aspect of ['landscape','vertical'])if(!e.approval?.evidence?.some(v=>v.aspect===aspect && v.clip && v.moving===true && v.sound===true))errors.push(`${e.id}: missing moving/sound ${aspect} evidence`);
    if(!current[e.id] || e.approval?.fingerprint!==current[e.id])errors.push(`${e.id}: stale approval`);
  }
  return errors;
}
