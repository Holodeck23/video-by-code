// Storyboard parser, production template generator, and self-contained stage HTML builder.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCueAnchor } from './contracts.mjs';
import { discoverPlugins } from './registry.mjs';

function unquote(val) {
  const s = String(val ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseKvTokens(str) {
  const out = {};
  const re = /([a-zA-Z0-9_-]+)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+)/g;
  for (let m; (m = re.exec(str)) !== null; ) {
    const key = m[1];
    const raw = unquote(m[2]);
    if (raw === 'true') out[key] = true;
    else if (raw === 'false') out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) out[key] = Number(raw);
    else out[key] = raw;
  }
  return out;
}

/**
 * Parses storyboard.txt into a cue schema document ({ schemaVersion: 1, cues }).
 *
 * Supported block syntax:
 *   == <type> [id=<id>] [title="..."] [subtitle="..."] [kicker="..."] [side=left|right] [mood=...]
 *   @ <anchor>
 *   - item 1 | value
 *   | lane label | metric | fast|blocked | 0.85 | detail
 */
export function parseStoryboard(text) {
  const lines = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const cues = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    if (!current.anchor) {
      throw new Error(`storyboard line ${current.line} (${current.id}): missing @ anchor line`);
    }
    parseCueAnchor(current.anchor);
    cues.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('//')) {
      continue;
    }
    const headerMatch = /^==\s+([a-z0-9-]+)(?:\s+(.*))?$/i.exec(trimmed);
    if (headerMatch) {
      flush();
      const type = headerMatch[1].toLowerCase();
      const kv = parseKvTokens(headerMatch[2] || '');
      const id = String(kv.id || `cue-${cues.length + 1}`);
      delete kv.id;
      current = {
        id,
        line: lineNo,
        anchor: null,
        type,
        content: { ...kv },
      };
      continue;
    }
    if (trimmed.startsWith('@')) {
      if (!current) {
        current = {
          id: `cue-${cues.length + 1}`,
          line: lineNo,
          anchor: trimmed,
          type: 'title',
          content: {},
        };
      } else if (!current.anchor) {
        current.anchor = trimmed;
      } else {
        flush();
        current = {
          id: `cue-${cues.length + 1}`,
          line: lineNo,
          anchor: trimmed,
          type: 'title',
          content: {},
        };
      }
      continue;
    }
    if (!current) {
      continue;
    }
    if (trimmed.startsWith('- ')) {
      const itemRaw = trimmed.slice(2).trim();
      const parts = itemRaw.split('|').map((s) => s.trim());
      if (!Array.isArray(current.content.items)) {
        current.content.items = [];
      }
      if (parts.length >= 2) {
        current.content.items.push({
          text: parts[0],
          value: parts[1],
          ...(parts[2] ? { badge: parts[2] } : {}),
        });
      } else {
        current.content.items.push(parts[0]);
      }
      continue;
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cols = trimmed
        .slice(1, -1)
        .split('|')
        .map((s) => s.trim());
      if (cols[0]) {
        if (!Array.isArray(current.content.lanes)) {
          current.content.lanes = [];
        }
        current.content.lanes.push({
          label: cols[0],
          metric: cols[1] || '',
          state: cols[2] || 'fast',
          progress: cols[3] ? Number(cols[3]) : 0.85,
          detail: cols[4] || '',
        });
      }
      continue;
    }
    const kvLine = /^([a-zA-Z0-9_-]+):\s*(.+)$/.exec(trimmed);
    if (kvLine) {
      const k = kvLine[1];
      const v = unquote(kvLine[2]);
      if (k === 'type') {
        current.type = v;
      } else if (k === 'id') {
        current.id = v;
      } else {
        current.content[k] = v;
      }
    }
  }
  flush();
  if (!cues.length) {
    throw new Error('storyboard has no cues');
  }
  return { schemaVersion: 1, cues };
}

/** Generates starter brief.md, script.md, and storyboard.txt for `vbc new`. */
export function defaultProductionFiles(opts = {}) {
  const format = opts.format || (opts.vertical ? 'vertical-short' : 'explainer');
  const look = opts.look || 'neon-sign';
  const host = opts.host !== undefined ? Boolean(opts.host) : format === 'explainer' || format === 'vertical-short';
  const hostVariant = opts.hostVariant || 'ink-mascot';
  const voice = opts.voice || 'kokoro:af_heart';
  const lang = opts.lang || 'en';
  const aspect = opts.vertical || format === 'vertical-short' ? 'vertical' : 'landscape';

  const brief = [
    `# ${opts.slug || 'pilot-film'}`,
    '',
    `- format: ${format}`,
    `- look: ${look}`,
    `- host: ${host ? 'on' : 'off'}`,
    `- host-variant: ${hostVariant}`,
    `- voice: ${voice}`,
    `- language: ${lang}`,
    `- aspect: ${aspect}`,
    '',
  ].join('\n');

  if (format === 'instrumental') {
    const storyboard = [
      '== title id=intro title="Chromatic Pulse" subtitle="Audio-Reactive Visual Study" kicker="INSTRUMENTAL"',
      '@bar 1',
      '',
      '== chart id=groove title="Harmonic Spectrum" subtitle="Locked to Downbeat Grid" kicker="BAR 2"',
      '@bar 2',
      '| Sub Bass Envelope | 48 Hz | fast | 0.92 | Locked to kick transient |',
      '| Glass Chord Array | 440 Hz | fast | 0.84 | Sidechain shimmer |',
      '| High Hat Lattice | 8.2 kHz | fast | 0.76 | Crisp sixteenth pulse |',
      '',
      '== big id=drop title="Full Field Resonance" subtitle="Peak Energy Section" kicker="DROP" stat="120 BPM"',
      '@section drop',
      '',
    ].join('\n');
    return { brief, script: null, storyboard };
  }

  if (format === 'lyric') {
    const script = [
      '# Verse',
      '',
      '[[v1]] Neon wires hum through the quiet night.',
      '',
      '[[v2]] Every pulse of sound turns the shadow bright.',
      '',
      '[[v3]] Hold the signal steady until the dawn arrives.',
      '',
    ].join('\n');
    const storyboard = [
      '== lyric id=line1 title="Neon wires hum through the quiet night" subtitle="Verse 01" kicker="LYRIC STAGE"',
      '@ neon wires',
      '',
      '== lyric id=line2 title="Every pulse of sound turns the shadow bright" subtitle="Chorus Lift" kicker="LYRIC STAGE"',
      '@ every pulse',
      '',
      '== lyric id=line3 title="Hold the signal steady until the dawn arrives" subtitle="Final Cadence" kicker="LYRIC STAGE"',
      '@ hold the signal',
      '',
    ].join('\n');
    return { brief, script, storyboard };
  }

  const script = [
    '# Intro',
    '',
    '[[p1]] Every frame starts with a clear visual contract and {24|twenty four} locked layers.',
    '',
    '[[p2]] Voice timings drive the presenter mouth while beats land cleanly on the stage.',
    '',
    '[[p3]] When the final check passes, the bundle ships with deterministic precision.',
    '',
  ].join('\n');

  const storyboard = [
    '== title id=beat-intro title="One-Colour Stage Engine" subtitle="Deterministic Code-Driven Video" kicker="PHASE 1 PILOT" side=left mood=excited',
    '@ every frame',
    '- Layer Resolver | 10 Slots | 01',
    '- Pure Frame Clock | 30 FPS | 02',
    '- Atomic Bundle | SHA-256 | 03',
    '',
    '== flow id=beat-voice title="Voice & Mouth Sync" subtitle="Per-Paragraph Cache & Mora Alignment" kicker="TIMING PIPELINE" side=left mood=focused',
    '@ voice timings',
    '| Script Markup | 24 Layers | fast | 0.95 | Shown vs spoken split |',
    '| Mouth Track | 12 FPS | fast | 0.88 | Five vowel/labial shapes |',
    '',
    '== big id=beat-close title="Deterministic Release Gate" subtitle="Verified Audio, Bounds & Cut Smoothness" kicker="CHECKPOINT" stat="100% PASS" side=right mood=excited',
    '@ final check',
    '',
  ].join('\n');

  return { brief, script, storyboard };
}

/** Writes self-contained build/vbc-runtime.js, build/audio-assets.js, and build/index.html. */
export async function buildStageHtml({ bundle, rootDir, prodDir }) {
  const buildDir = join(prodDir, 'build');
  const registry = await discoverPlugins(rootDir);
  const runtimeFiles = [
    join(rootDir, 'lib', 'harness.js'),
    join(rootDir, 'lib', 'ink-doodle.js'),
    join(rootDir, 'lib', 'features.js'),
    join(rootDir, 'lib', 'sound.js'),
    ...registry.entries
      .filter((e) => ['layer', 'beat', 'look', 'finish'].includes(e.kind))
      .map((e) => join(e.dir, e.entry || 'index.js'))
      .filter((p) => existsSync(p)),
    join(rootDir, 'lib', 'stage', 'host.js'),
    join(rootDir, 'lib', 'stage', 'index.js'),
    join(rootDir, 'lib', 'player.js'),
  ];

  const chunks = [];
  for (const file of runtimeFiles) {
    if (existsSync(file)) {
      chunks.push(`// --- ${file.slice(rootDir.length + 1)} ---\n${await readFile(file, 'utf8')}`);
    }
  }
  await writeFile(join(buildDir, 'vbc-runtime.js'), chunks.join('\n\n') + '\n', 'utf8');

  const wavMap = {};
  for (const tr of bundle.tracks || []) {
    const assetPath = join(buildDir, tr.asset);
    if (existsSync(assetPath)) {
      const bytes = await readFile(assetPath);
      wavMap[tr.asset] = bytes.toString('base64');
    }
  }
  await writeFile(
    join(buildDir, 'audio-assets.js'),
    `window.__VBC_TRACK_WAV_B64 = ${JSON.stringify(wavMap)};\n`,
    'utf8'
  );

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>vbc — ${bundle.look?.id || 'stage'} (${bundle.format})</title>
  <style>
    html, body { margin: 0; padding: 0; background: #07090e; overflow: hidden; }
    canvas#c { display: block; width: ${bundle.width}px; height: ${bundle.height}px; }
  </style>
</head>
<body>
  <canvas id="c" width="${bundle.width}" height="${bundle.height}"></canvas>
  <script src="audio-assets.js"></script>
  <script src="vbc-runtime.js"></script>
  <script>
    window.VBC_BUNDLE = ${JSON.stringify(bundle)};
    const canvas = document.getElementById('c');
    const stage = window.VBC_STAGE.createStage({
      canvas,
      bundle: window.VBC_BUNDLE,
      assets: { wavBase64: window.__VBC_TRACK_WAV_B64 || {} }
    });
    window.VBC_STAGE.bindStageToPage(window, stage, window.VBC_BUNDLE);
  </script>
</body>
</html>
`;
  await writeFile(join(buildDir, 'index.html'), html, 'utf8');
}

/** Synthesizes a deterministic multi-bar procedural backing track and feature curves. */
export function synthesizeProceduralMusic({ bpm = 120, duration = 9.6, rate = 24000 }) {
  const totalSamples = Math.max(1, Math.round(duration * rate));
  const samples = new Float32Array(totalSamples);
  const beatDur = 60 / bpm;
  const barDur = beatDur * 4;
  const chords = [
    [110, 164.81, 220, 261.63],
    [87.31, 130.81, 174.61, 220],
    [130.81, 196.0, 261.63, 329.63],
    [98.0, 146.83, 196.0, 246.94],
  ];

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / rate;
    const beatPos = (t % beatDur) / beatDur;
    const barIdx = Math.floor(t / barDur);
    const chord = chords[barIdx % chords.length];
    const kickEnv = Math.exp(-beatPos * 14);
    const kickFreq = 48 + 90 * Math.exp(-beatPos * 28);
    const kick = Math.sin(2 * Math.PI * kickFreq * (t % beatDur)) * kickEnv * 0.38;
    const bassEnv = 0.55 + 0.45 * Math.sin(Math.PI * ((t % (beatDur * 0.5)) / (beatDur * 0.5)));
    const bass = Math.tanh(Math.sin(2 * Math.PI * chord[0] * t) * 1.6) * bassEnv * 0.22;
    let pad = 0;
    for (let c = 1; c < chord.length; c += 1) pad += Math.sin(2 * Math.PI * chord[c] * t) * 0.07;
    const sixteenthIdx = Math.floor(t / (beatDur * 0.25));
    const arpFreq = chord[sixteenthIdx % chord.length] * 2;
    const arpLocal = (t % (beatDur * 0.25)) / (beatDur * 0.25);
    const arp = Math.sin(2 * Math.PI * arpFreq * t) * Math.exp(-arpLocal * 6) * 0.1;
    const fade = Math.min(1, t / 0.15, (duration - t) / 0.25);
    samples[i] = Math.max(-0.95, Math.min(0.95, (kick + bass + pad + arp) * Math.max(0, fade)));
  }

  const beats = [];
  const downbeats = [];
  for (let b = 0, t = 0; t < duration - 1e-4; b += 1, t = Number((b * beatDur).toFixed(4))) {
    beats.push(t);
    if (b % 4 === 0) downbeats.push(t);
  }
  const sections = [
    { name: 'intro', start: downbeats[0] ?? 0 },
    { name: 'groove', start: downbeats[Math.min(1, downbeats.length - 1)] ?? 0 },
    { name: 'drop', start: downbeats[Math.min(2, downbeats.length - 1)] ?? 0 },
  ].filter((sec, idx, arr) => idx === 0 || sec.start > arr[idx - 1].start);

  const featRate = 100;
  const frames = Math.max(1, Math.round(duration * featRate));
  const feat = new Float32Array(frames * 2);
  for (let f = 0; f < frames; f += 1) {
    const t = f / featRate;
    feat[f] = Math.exp(-((t % beatDur) / beatDur) * 6);
    feat[frames + f] = 0.4 + 0.35 * Math.sin(t * 2.5);
  }
  return { samples, rate, duration, beats, downbeats, sections, feat, featRate };
}

/** Builds procedural sound score events at beat transitions. */
export function buildProceduralScore(beats, duration, narrated) {
  const score = [
    {
      name: 'bed',
      time: 0.02,
      options: { end: Number(Math.max(0.4, duration - 0.05).toFixed(3)), freq: 55, gain: narrated ? 0.06 : 0.12 },
    },
  ];
  beats.forEach((beat, idx) => {
    const t = Number(Math.max(0, beat.start).toFixed(3));
    if (idx === 0) {
      score.push({ name: 'chime', time: t, options: { freq: 523.25, gain: 0.14 } });
    } else {
      score.push({ name: 'whoosh', time: Number(Math.max(0, t - 0.05).toFixed(3)), options: { dur: 0.2, gain: 0.12 } });
      score.push({ name: 'tick', time: t, options: { freq: 880, gain: 0.1 } });
    }
  });
  return score;
}
