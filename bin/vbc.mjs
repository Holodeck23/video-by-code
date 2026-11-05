#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { schemaFor,validate,bundleErrors } from '../lib/contracts.mjs';
const [command,kind,file,...extra]=process.argv.slice(2);
try {
  if(!command || ['help','--help','-h'].includes(command))console.log('vbc — video-by-code\n\nPhase 0:\n  vbc validate bundle|manifest|layer FILE\n  vbc look list\n\nPilot commands follow: new, make, voice, music, words, cues, stills, preview, render, check.');
  else if(command==='validate') {
    if(!file || extra.length)throw new Error('usage: vbc validate bundle|manifest|layer FILE');
    const doc=JSON.parse(await readFile(file,'utf8')),errors=validate(await schemaFor(kind),doc);
    if(!errors.length && kind==='bundle')errors.push(...bundleErrors(doc));
    if(errors.length)throw new Error(errors.join('\n'));
    console.log(`PASS: ${kind} structure${kind==='manifest'?' (not release approval)':''}`);
  } else if(command==='look' && kind==='list' && !file) {
    const m=JSON.parse(await readFile(new URL('../looks/manifest.json',import.meta.url),'utf8'));
    for(const e of m.entries)console.log(`${e.id}\t${e.kind}\t${e.status}`);
    console.log(`Scope ${m.scopeFrozen?'frozen':'provisional'}; ${m.unresolvedSources.length} source groups remain.`);
  } else throw new Error(`${command}: unavailable in phase 0; run vbc --help`);
}catch(e){console.error(`FAIL: ${e.message}`);process.exitCode=1;}
