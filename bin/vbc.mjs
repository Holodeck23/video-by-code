#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { schemaFor, validate, bundleErrors, rendererErrors } from '../lib/contracts.mjs';

const [command, kind, file, ...extra] = process.argv.slice(2);

const HELP_TEXT = [
  'vbc — video-by-code',
  '',
  'Phase 0:',
  '  vbc validate bundle|cue|layer|renderer|manifest FILE',
  '  vbc look list',
  '',
  'Pilot commands follow: new, make, voice, music, words, cues, stills, preview, render, check.',
].join('\n');

try {
  if (!command || ['help', '--help', '-h'].includes(command)) {
    console.log(HELP_TEXT);
  } else if (command === 'validate') {
    if (!file || extra.length) {
      throw new Error('usage: vbc validate bundle|cue|layer|renderer|manifest FILE');
    }
    const doc = JSON.parse(await readFile(file, 'utf8'));
    const schema = await schemaFor(kind);
    const errors = validate(schema, doc);
    if (!errors.length && kind === 'bundle') {
      errors.push(...bundleErrors(doc));
    }
    if (!errors.length && kind === 'renderer') {
      errors.push(...rendererErrors(doc));
    }
    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
    const suffix = kind === 'manifest' ? ' (not release approval)' : '';
    console.log(`PASS: ${kind} structure${suffix}`);
  } else if (command === 'look' && kind === 'list' && !file) {
    const manifestUrl = new URL('../looks/manifest.json', import.meta.url);
    const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
    for (const entry of manifest.entries) {
      console.log(`${entry.id}\t${entry.kind}\t${entry.status}`);
    }
    const scopeState = manifest.scopeFrozen ? 'frozen' : 'provisional';
    const remaining = manifest.unresolvedSources.length;
    console.log(`Scope ${scopeState}; ${remaining} source groups remain.`);
  } else {
    throw new Error(`${command}: unavailable in phase 0; run vbc --help`);
  }
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exitCode = 1;
}
