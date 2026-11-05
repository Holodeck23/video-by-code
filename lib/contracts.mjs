import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
// Evaluates only the keywords used in our provisional schemas; not a general JSON Schema implementation.
const keys=new Set(['$schema','type','const','enum','required','properties','additionalProperties','items','minimum','maximum','exclusiveMinimum','minLength','pattern']);
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
  if(!['bundle','manifest','layer'].includes(kind))throw new Error('expected bundle, manifest or layer');
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
