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
import {
  initProduction,
  buildMusic,
  buildWords,
  buildCues,
  makeProduction,
  renderProduction,
  checkProduction,
  previewProduction,
} from '../lib/pipeline.mjs';

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
  '  vbc new [SLUG] --prod DIR [--format FMT] [--look SPEC] [--host on|off] [--voice ID] [--vertical]',
  '  vbc voice --prod DIR [--lang ja] [--voice kokoro:af_heart] [--provider ID] [--redo ID|N]',
  '            [--master DIR|voice.json] [--speed 0.89] [--gap 0.75]',
  '  vbc music --prod DIR [--bpm 120] [--duration SEC] [--offset SEC] [--gain NUM]',
  '  vbc words --prod DIR [--backend whisper-cli|acoustic|mock]',
  '  vbc cues --prod DIR [--look SPEC] [--format FMT] [--host on|off] [--vertical]',
  '  vbc make --prod DIR [--format FMT] [--look SPEC] [--provider ID] [--backend ID] [--vertical]',
  '  vbc stills --prod DIR [--sheet 12] [--stills T1,T2] [--out FILE] [--from SEC] [--to SEC]',
  '  vbc preview --prod DIR [--port N] [--once]',
  '  vbc render --prod DIR [--out FILE] [--from SEC] [--to SEC] [--fps N]',
  '  vbc check --prod DIR [--video FILE] [--skip-browser]',
].join('\n');

function parseCommandFlags(args, valueFlags, boolFlags = [], allowPositionalSlug = false) {
  const knownVal = new Set(valueFlags);
  const knownBool = new Set(boolFlags);
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      if (allowPositionalSlug && !opts.slug) {
        opts.slug = token;
        continue;
      }
      throw new Error(`unknown argument ${token}`);
    }
    const name = token.slice(2);
    if (knownBool.has(name)) {
      if (args[i + 1] && !args[i + 1].startsWith('--') && ['on', 'off', 'true', 'false'].includes(args[i + 1])) {
        opts[name] = args[i + 1] === 'on' || args[i + 1] === 'true';
        i += 1;
      } else {
        opts[name] = true;
      }
      continue;
    }
    if (!knownVal.has(name)) {
      throw new Error(`unknown argument ${token}`);
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

const tailArgs = [sub, arg3, ...extra].filter((x) => x !== undefined);

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
      errors.push(...bundleErrors(doc, registry));
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
  } else if (command === 'new') {
    const opts = parseCommandFlags(
      tailArgs,
      ['prod', 'slug', 'format', 'look', 'host-variant', 'voice', 'lang'],
      ['host', 'vertical'],
      true
    );
    const res = await initProduction({
      ...opts,
      hostVariant: opts['host-variant'],
      rootDir: ROOT_DIR,
    });
    console.log(`PASS: created ${res.format} production '${res.slug}' at ${res.prod}`);
  } else if (command === 'voice') {
    const opts = parseCommandFlags(
      tailArgs,
      ['prod', 'lang', 'voice', 'provider', 'redo', 'master', 'speed', 'gap']
    );
    const { voice, synthesized, reused, stale } = await buildVoice({ ...opts, rootDir: ROOT_DIR });
    console.log(
      `PASS: voice ${voice.language} ${voice.duration.toFixed(2)}s, ${voice.paragraphs.length} paragraphs ` +
        `(synthesized ${synthesized.length}: ${synthesized.join(', ') || 'none'}; reused ${reused.length})`
    );
    for (const item of stale) {
      console.log(`STALE: ${item.product} (${item.reason}); rebuild it before render`);
    }
  } else if (command === 'music') {
    const opts = parseCommandFlags(tailArgs, ['prod', 'bpm', 'duration', 'offset', 'gain']);
    const { music } = await buildMusic({ ...opts, rootDir: ROOT_DIR });
    console.log(
      `PASS: music ${music.bpm} bpm, ${music.duration.toFixed(2)}s (${music.beats.length} beats, ${music.downbeats.length} bars)`
    );
  } else if (command === 'words') {
    const opts = parseCommandFlags(tailArgs, ['prod', 'backend']);
    const { words, mouth } = await buildWords({ ...opts, rootDir: ROOT_DIR });
    console.log(
      `PASS: words (${words.words.length} tokens) and mouth (${mouth.shapes.length} frames @ ${mouth.fps} fps)`
    );
  } else if (command === 'cues') {
    const opts = parseCommandFlags(
      tailArgs,
      ['prod', 'look', 'format', 'host-variant', 'duration', 'narration-offset', 'music-offset'],
      ['host', 'vertical']
    );
    const { bundle } = await buildCues({
      ...opts,
      hostVariant: opts['host-variant'],
      narrationOffset: opts['narration-offset'],
      musicOffset: opts['music-offset'],
      rootDir: ROOT_DIR,
    });
    console.log(
      `PASS: cues resolved (${bundle.beats.length} beats, look ${bundle.look.id}, ${bundle.width}x${bundle.height}, ${bundle.duration.toFixed(2)}s)`
    );
  } else if (command === 'make') {
    const opts = parseCommandFlags(
      tailArgs,
      [
        'prod',
        'format',
        'look',
        'host-variant',
        'voice',
        'provider',
        'lang',
        'speed',
        'backend',
        'bpm',
        'duration',
        'narration-offset',
        'music-offset',
      ],
      ['host', 'vertical', 'music']
    );
    const { bundle } = await makeProduction({
      ...opts,
      hostVariant: opts['host-variant'],
      narrationOffset: opts['narration-offset'],
      musicOffset: opts['music-offset'],
      rootDir: ROOT_DIR,
    });
    console.log(
      `PASS: built ${bundle.format} bundle (${bundle.look.id}, ${bundle.width}x${bundle.height}, ${bundle.duration.toFixed(2)}s)`
    );
  } else if (command === 'stills') {
    const opts = parseCommandFlags(tailArgs, ['prod', 'sheet', 'stills', 'out', 'outdir', 'from', 'to', 'fps']);
    const mode = opts.stills ? 'stills' : 'sheet';
    const { outPath } = await renderProduction({ ...opts, mode, rootDir: ROOT_DIR });
    console.log(`PASS: stills written to ${outPath}`);
  } else if (command === 'render') {
    const opts = parseCommandFlags(tailArgs, ['prod', 'out', 'from', 'to', 'fps']);
    const { outPath, bundle } = await renderProduction({ ...opts, mode: 'video', rootDir: ROOT_DIR });
    console.log(`PASS: rendered ${bundle.width}x${bundle.height} video to ${outPath}`);
  } else if (command === 'check') {
    const opts = parseCommandFlags(tailArgs, ['prod', 'video'], ['skip-browser']);
    const report = await checkProduction({
      ...opts,
      skipBrowser: Boolean(opts['skip-browser']),
      rootDir: ROOT_DIR,
    });
    console.log(
      `PASS: check ${report.look} (${report.format}, ${report.dimensions}, ${report.duration.toFixed(2)}s) — ${Object.entries(report.gates)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')}`
    );
  } else if (command === 'preview') {
    const opts = parseCommandFlags(tailArgs, ['prod', 'port'], ['once']);
    const { url } = await previewProduction({ ...opts, rootDir: ROOT_DIR });
    console.log(`PASS: preview serving ${url}`);
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
    throw new Error(`${command}: unknown command; run vbc --help`);
  }
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exitCode = 1;
}
