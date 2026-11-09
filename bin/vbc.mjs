#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  schemaFor,
  validate,
  bundleErrors,
  rendererErrors,
} from '../lib/contracts.mjs';
import {
  discoverPlugins,
  loadCapabilities,
  lintCapabilities,
  buildDynamicSchema,
  validateBundleExtensions,
  scaffoldPlugin,
} from '../lib/registry.mjs';
import { buildVoice } from '../lib/voice.mjs';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const [command, sub, arg3, ...extra] = process.argv.slice(2);

const HELP_TEXT = [
  'vbc — video-by-code',
  '',
  'Commands:',
  '  vbc validate bundle|cue|layer|renderer|manifest|plugin FILE',
  '  vbc add look|layer|beat|format|anchor|provider|analyser|finish ID [--slot SLOT]',
  '  vbc plugin list',
  '  vbc lint',
  '  vbc look list',
  '  vbc voice --prod DIR [--lang ja] [--voice kokoro:af_heart] [--provider ID] [--redo ID|N]',
  '            [--master DIR|voice.json] [--speed 0.89] [--gap 0.75]',
  '',
  'Pilot commands follow: new, make, music, words, cues, stills, preview, render, check.',
].join('\n');

function parseVoiceFlags(args) {
  const known = new Set(['prod', 'lang', 'voice', 'provider', 'redo', 'master', 'speed', 'gap']);
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i].startsWith('--') ? args[i].slice(2) : null;
    if (!name || !known.has(name)) {
      throw new Error(`unknown argument ${args[i]}`);
    }
    if (args[i + 1] === undefined || args[i + 1].startsWith('--')) {
      throw new Error(`--${name} needs a value`);
    }
    opts[name] = args[i + 1];
    i += 1;
  }
  return opts;
}

function parseFlags(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slot' && args[i + 1]) {
      opts.slot = args[i + 1];
      i += 1;
    } else {
      throw new Error(`unknown argument ${args[i]}`);
    }
  }
  return opts;
}

try {
  if (!command || ['help', '--help', '-h'].includes(command)) {
    console.log(HELP_TEXT);
  } else if (command === 'validate') {
    if (!arg3 || extra.length) {
      throw new Error('usage: vbc validate bundle|cue|layer|renderer|manifest|plugin FILE');
    }
    const doc = JSON.parse(await readFile(arg3, 'utf8'));
    const registry = await discoverPlugins(ROOT_DIR);
    const baseSchema = await schemaFor(sub);
    const schema = buildDynamicSchema(sub, baseSchema, registry);
    const errors = validate(schema, doc);
    if (!errors.length && sub === 'bundle') {
      errors.push(...bundleErrors(doc));
      errors.push(...validateBundleExtensions(doc, registry));
    }
    if (!errors.length && sub === 'renderer') {
      errors.push(...rendererErrors(doc));
    }
    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
    const suffix = sub === 'manifest' ? ' (not release approval)' : '';
    console.log(`PASS: ${sub} structure${suffix}`);
  } else if (command === 'add') {
    if (!sub || !arg3) {
      throw new Error('usage: vbc add <kind> <id> [--slot SLOT]');
    }
    const opts = parseFlags(extra);
    const dir = await scaffoldPlugin(ROOT_DIR, sub, arg3, opts);
    console.log(`PASS: scaffolded ${sub}/${arg3} at ${dir}`);
  } else if (command === 'plugin' && sub === 'list' && !arg3) {
    const registry = await discoverPlugins(ROOT_DIR);
    if (registry.errors.length) {
      throw new Error(registry.errors.join('\n'));
    }
    for (const entry of registry.entries) {
      console.log(`${entry.kind}/${entry.id}\t${entry.lane}\t${entry.status}`);
    }
  } else if (command === 'lint' && !sub) {
    const registry = await discoverPlugins(ROOT_DIR);
    const caps = await loadCapabilities(ROOT_DIR);
    const errors = [...registry.errors, ...lintCapabilities(registry, caps)];
    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
    console.log(`PASS: ${registry.entries.length} plugins and capability vocabulary clean`);
  } else if (command === 'voice') {
    const opts = parseVoiceFlags([sub, arg3, ...extra].filter((x) => x !== undefined));
    const { voice, synthesized, reused, stale } = await buildVoice({ ...opts, rootDir: ROOT_DIR });
    console.log(`PASS: voice ${voice.language} ${voice.duration.toFixed(2)}s, ${voice.paragraphs.length} paragraphs ` +
      `(synthesized ${synthesized.length}: ${synthesized.join(', ') || 'none'}; reused ${reused.length})`);
    for (const item of stale) {
      console.log(`STALE: ${item.product} (${item.reason}); rebuild it before render`);
    }
  } else if (command === 'look' && sub === 'list' && !arg3) {
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
