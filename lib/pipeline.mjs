// End-to-end pilot pipeline stages: new, music, words, cues, make, stills, preview, render, check.
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, extname, join, resolve } from 'node:path';
import {
  bundleErrors,
  fingerprint,
  publishBundle,
  resolveCues,
  schemaFor,
  validate,
} from './contracts.mjs';
import { discoverPlugins, resolveLookSpec } from './registry.mjs';
import {
  buildProceduralScore,
  buildStageHtml,
  defaultProductionFiles,
  parseStoryboard,
  synthesizeProceduralMusic,
} from './storyboard.mjs';
import {
  assertFresh,
  assertOutsideCheckout,
  buildVoice,
  langCode,
  parseBrief,
  parseScript,
  withProductionLock,
} from './voice.mjs';
import { readWav, writeWav } from './wav.mjs';
import { openPage } from '../starter/lib-render/page.mjs';

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function writeJsonAtomic(path, value) {
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    await rename(tmp, path);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

function requireProd(opts) {
  if (!opts?.prod) {
    throw new Error('--prod DIR is required: name the production folder explicitly (outside the checkout)');
  }
  return resolve(opts.prod);
}

/** `vbc new`: scaffolds brief.md, script.md, and storyboard.txt in an explicit production folder. */
export async function initProduction(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);
  await mkdir(prod, { recursive: true });

  const slug = opts.slug || basename(prod);
  const files = defaultProductionFiles({ ...opts, slug });
  await writeFile(join(prod, 'brief.md'), files.brief, 'utf8');
  if (files.script !== null) {
    await writeFile(join(prod, 'script.md'), files.script, 'utf8');
  }
  await writeFile(join(prod, 'storyboard.txt'), files.storyboard, 'utf8');
  return { prod, slug, format: opts.format || (opts.vertical ? 'vertical-short' : 'explainer') };
}

/** `vbc music`: builds build/audio/music.wav, build/audio/features.f32, and build/music.json. */
export async function buildMusic(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);

  return withProductionLock(prod, async () => {
    const build = join(prod, 'build');
    await mkdir(join(build, 'audio'), { recursive: true });
    const voice = await readJson(join(build, 'voice.json'), null);
    const bpm = Number(opts.bpm ?? 120);
    const targetDur = Number(opts.duration ?? (voice ? voice.duration : 9.6));

    const synth = synthesizeProceduralMusic({ bpm, duration: targetDur });
    const wavPath = join(build, 'audio', 'music.wav');
    await writeWav(wavPath, synth.samples, synth.rate);
    const wavBytes = await readFile(wavPath);

    const featPath = join(build, 'audio', 'features.f32');
    const featBytes = Buffer.from(synth.feat.buffer, synth.feat.byteOffset, synth.feat.byteLength);
    await writeFile(featPath, featBytes);

    const musicDoc = {
      schemaVersion: 1,
      stage: 'music',
      bpm,
      duration: Number(targetDur.toFixed(6)),
      beats: synth.beats,
      downbeats: synth.downbeats,
      sections: synth.sections,
      features: {
        asset: 'audio/features.f32',
        sha256: sha256(featBytes),
        rate: synth.featRate,
      },
      track: {
        id: 'music-main',
        kind: 'music',
        asset: 'audio/music.wav',
        sha256: sha256(wavBytes),
        offset: Number(opts.offset ?? 0),
        gain: Number(opts.gain ?? (voice ? 0.26 : 0.85)),
        language: 'zxx',
      },
    };
    musicDoc.fingerprint = fingerprint({
      stage: 'music',
      sha256: musicDoc.track.sha256,
      beats: musicDoc.beats,
      downbeats: musicDoc.downbeats,
      sections: musicDoc.sections,
      offset: musicDoc.track.offset,
      gain: musicDoc.track.gain,
    });
    await writeJsonAtomic(join(build, 'music.json'), musicDoc);
    return { music: musicDoc };
  });
}

function shapeForToken(spoken) {
  const s = String(spoken || '').toLowerCase();
  if (/[mbp]|ま|み|む|め|も|ば|び|ぶ|べ|ぼ|ぱ|ぴ|ぷ|ぺ|ぽ/.test(s)) return 'm';
  if (/[ou]|お|う|く|す|つ|ぬ|ふ|む|ゆ|る|こ|そ|と|の|ほ|も|よ|ろ/.test(s)) return 'o';
  if (/[ei]|え|い|き|し|ち|に|ひ|み|り|け|せ|て|ね|へ|め|れ/.test(s)) return 'e';
  return 'a';
}

function deterministicAlignFromVoice(voice) {
  const words = [];
  const captions = [];
  const isCjk = ['ja', 'zh', 'yue'].includes(langCode(voice.language));

  for (const p of voice.paragraphs) {
    const segs = Array.isArray(p.segments) && p.segments.length
      ? p.segments
      : [[p.display, p.spoken]];
    const tokens = [];
    for (const [shown, spoken] of segs) {
      if (shown !== spoken) {
        tokens.push({ text: shown, spoken });
      } else if (isCjk && !/\s/.test(shown)) {
        for (const ch of [...shown].filter((c) => /[\p{L}\p{N}]/u.test(c))) {
          tokens.push({ text: ch, spoken: ch });
        }
      } else {
        const shownParts = shown.split(/\s+/).filter(Boolean);
        for (const sp of shownParts) {
          tokens.push({ text: sp, spoken: sp });
        }
      }
    }
    if (!tokens.length) continue;
    const span = Math.max(0.12, p.duration - 0.04);
    const step = span / tokens.length;
    tokens.forEach((tok, idx) => {
      const start = Math.floor((p.start + idx * step) * 1000) / 1000;
      const rawEnd = Math.min(p.end, start + Math.max(0.04, step * 0.92));
      const end = Math.min(voice.duration, Math.max(Number((start + 0.02).toFixed(3)), Math.floor(rawEnd * 1000) / 1000));
      words.push({
        text: tok.text,
        spoken: tok.spoken,
        start,
        end,
        confidence: 1,
      });
    });
    captions.push({
      text: p.display,
      start: Math.floor(p.start * 1000) / 1000,
      end: Math.min(voice.duration, Math.floor(p.end * 1000) / 1000),
    });
  }

  const fps = 12;
  const totalFrames = Math.max(1, Math.ceil(voice.duration * fps));
  const shapes = new Array(totalFrames).fill('c');
  for (const w of words) {
    const f0 = Math.max(0, Math.floor(w.start * fps));
    const f1 = Math.min(totalFrames - 1, Math.ceil(w.end * fps));
    const primary = shapeForToken(w.spoken);
    for (let f = f0; f <= f1; f += 1) {
      shapes[f] = (f - f0) % 3 === 2 ? 'm' : primary;
    }
  }
  return { words, captions, mouth: { fps, shapes: shapes.join('') } };
}

/** `vbc words`: aligns words, builds mouth track and captions, recording sources.voice. */
export async function buildWords(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);

  return withProductionLock(prod, async () => {
    const build = join(prod, 'build');
    await mkdir(build, { recursive: true });
    const voice = await readJson(join(build, 'voice.json'), null);
    if (!voice) {
      throw new Error(`no build/voice.json in ${prod}; run vbc voice first`);
    }

    const useMock =
      opts.backend === 'mock' ||
      voice.provider?.provider === 'mock-voice' ||
      voice.provider?.id === 'mock-voice';

    let words = [];
    let captions = [];
    let mouth = { fps: 12, shapes: 'c' };

    if (useMock) {
      ({ words, captions, mouth } = deterministicAlignFromVoice(voice));
    } else {
      const cuesIn = join(build, 'align-input.json');
      const alignOut = join(build, 'align-raw.json');
      const mouthOut = join(build, 'mouth-raw.json');
      const audioPath = join(build, voice.narration.file);
      const alignInput = {
        cues: voice.paragraphs.map((p) => ({
          id: p.id, start: p.start, end: p.end, text: p.spoken, segments: p.segments,
        })),
      };
      await writeFile(cuesIn, JSON.stringify(alignInput, null, 2), 'utf8');
      const backend = opts.backend || 'whisper-cli';
      const alignTool = join(rootDir, 'tools', 'timing', 'align-words.py');
      const alignArgs = ['run', '--python', '3.12', alignTool, cuesIn, audioPath, alignOut, '--backend', backend, '--lang', voice.language, '--force'];
      const alignRes = spawnSync('uv', alignArgs, { encoding: 'utf8' });
      if (alignRes.status !== 0) {
        throw new Error(`align-words.py failed: ${alignRes.stderr || alignRes.stdout}`);
      }
      const spokenScript = join(build, 'spoken-script.txt');
      await writeFile(spokenScript, voice.paragraphs.map((p) => p.spoken).join('\n\n') + '\n', 'utf8');
      const verifyTool = join(rootDir, 'tools', 'verify', 'verify-narration.py');
      const verifyRes = spawnSync('python3', [verifyTool, spokenScript, audioPath, '--lang', voice.language], { encoding: 'utf8' });
      if (verifyRes.status !== 0) {
        throw new Error(`verify-narration.py failed: ${verifyRes.stderr || verifyRes.stdout}`);
      }
      const mouthTool = join(rootDir, 'tools', 'timing', 'mouth-track.py');
      const mouthArgs = ['run', '--python', '3.12', mouthTool, audioPath, alignOut, mouthOut, '--lang', voice.language, '--force'];
      const mouthRes = spawnSync('uv', mouthArgs, { encoding: 'utf8' });
      if (mouthRes.status !== 0) {
        throw new Error(`mouth-track.py failed: ${mouthRes.stderr || mouthRes.stdout}`);
      }
      const alignDoc = await readJson(alignOut);
      const mouthRaw = await readJson(mouthOut);
      const maxDur = Math.floor(voice.duration * 1000) / 1000;
      let cursor = 0;
      for (const line of alignDoc.lines || []) {
        for (const w of line.words || []) {
          const rawStart = Math.max(cursor, Number(w.start) || 0);
          const start = Math.min(Number((maxDur - 0.02).toFixed(3)), Math.floor(rawStart * 1000) / 1000);
          const rawEnd = Number(w.end) || start + 0.08;
          const end = Math.min(maxDur, Math.max(Number((start + 0.01).toFixed(3)), Math.floor(rawEnd * 1000) / 1000));
          if (end > start) {
            words.push({
              text: String(w.w),
              spoken: String(w.spoken || w.w),
              ...(w.reading ? { reading: String(w.reading) } : {}),
              start,
              end,
              confidence: w.src === 'asr' ? 0.95 : 0.75,
            });
            cursor = start;
          }
        }
      }
      captions = voice.paragraphs.map((p) => ({
        text: p.display,
        start: Math.floor(p.start * 1000) / 1000,
        end: Math.min(voice.duration, Math.floor(p.end * 1000) / 1000),
      }));
      mouth = {
        fps: Number(mouthRaw.fps || 12),
        shapes: String(mouthRaw.shapes || 'c'),
      };
    }

    const sources = { voice: voice.fingerprint };
    const wordsDoc = {
      schemaVersion: 1,
      stage: 'words',
      language: voice.language,
      sources,
      words,
      fingerprint: fingerprint({ stage: 'words', voice: voice.fingerprint, words }),
    };
    const mouthDoc = {
      schemaVersion: 1,
      stage: 'mouth',
      sources,
      fps: mouth.fps,
      shapes: mouth.shapes,
      fingerprint: fingerprint({ stage: 'mouth', voice: voice.fingerprint, mouth }),
    };
    const captionsDoc = {
      schemaVersion: 1,
      stage: 'captions',
      sources,
      captions,
      fingerprint: fingerprint({ stage: 'captions', voice: voice.fingerprint, captions }),
    };

    await writeJsonAtomic(join(build, 'words.json'), wordsDoc);
    await writeJsonAtomic(join(build, 'mouth.json'), mouthDoc);
    await writeJsonAtomic(join(build, 'captions.json'), captionsDoc);
    return { words: wordsDoc, mouth: mouthDoc, captions: captionsDoc };
  });
}

/** Computes the canonical bundle inputsDigest from stage products on disk. */
export function computeBundleInputsDigest({ format, width, height, fps, lookFingerprint, voice, music, words, mouth, cues }) {
  return fingerprint({
    format,
    width,
    height,
    fps,
    look: lookFingerprint,
    voice: voice?.fingerprint ?? null,
    music: music?.fingerprint ?? null,
    words: words?.fingerprint ?? null,
    mouth: mouth?.fingerprint ?? null,
    cues: cues?.fingerprint ?? null,
  });
}

/** `vbc cues`: resolves storyboard cues + look slots and atomically publishes build/bundle.json. */
export async function buildCues(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);
  await assertFresh(prod, ['words', 'mouth', 'captions']);

  return withProductionLock(prod, async () => {
    const build = join(prod, 'build');
    await mkdir(build, { recursive: true });

    const briefText = existsSync(join(prod, 'brief.md'))
      ? await readFile(join(prod, 'brief.md'), 'utf8')
      : '';
    const brief = parseBrief(briefText);
    const storyboardPath = join(prod, 'storyboard.txt');
    if (!existsSync(storyboardPath)) {
      throw new Error(`no storyboard.txt in ${prod}`);
    }
    const cueDoc = parseStoryboard(await readFile(storyboardPath, 'utf8'));
    const registry = await discoverPlugins(rootDir);
    const cueSchema = await schemaFor('cue', { registry });
    const cueErrors = validate(cueSchema, cueDoc);
    if (cueErrors.length) {
      throw new Error(cueErrors.join('\n'));
    }

    const voice = await readJson(join(build, 'voice.json'), null);
    const music = await readJson(join(build, 'music.json'), null);
    const wordsDoc = await readJson(join(build, 'words.json'), null);
    const mouthDoc = await readJson(join(build, 'mouth.json'), null);
    const captionsDoc = await readJson(join(build, 'captions.json'), null);

    const format = opts.format || brief.format || 'explainer';
    const isVertical =
      opts.vertical ||
      brief.aspect === 'vertical' ||
      format === 'vertical-short';
    const width = Number(opts.width || (isVertical ? 1080 : 1920));
    const height = Number(opts.height || (isVertical ? 1920 : 1080));
    const fps = Number(opts.fps || brief.fps || 30);
    const duration = Number(
      opts.duration ||
        voice?.duration ||
        music?.duration ||
        brief.duration ||
        9.6
    );

    let lookSpec = opts.look || brief.look || 'neon-sign';
    const hostVariant = opts.hostVariant || brief['host-variant'];
    if (hostVariant && !lookSpec.includes('host=')) {
      const normalizedHost = hostVariant.startsWith('host-') ? hostVariant : `host-${hostVariant}`;
      lookSpec = `${lookSpec} + host=${normalizedHost}`;
    }
    const resolvedLook = await resolveLookSpec(lookSpec, registry, rootDir);
    const hostOn =
      opts.host !== undefined
        ? Boolean(opts.host)
        : brief.host
          ? brief.host !== 'off' && brief.host !== 'false'
          : format === 'explainer' || format === 'vertical-short';

    const words = wordsDoc?.words || [];
    const musicGrid = music
      ? {
          beats: music.beats,
          downbeats: music.downbeats,
          sections: music.sections,
          ...(music.features ? { features: music.features } : {}),
        }
      : { beats: [], downbeats: [], sections: [] };

    const beats = resolveCues(cueDoc, { words, music: musicGrid, duration });
    const cuesStageDoc = {
      schemaVersion: 1,
      stage: 'cues',
      sources: {
        ...(voice ? { voice: voice.fingerprint } : {}),
        ...(music ? { music: music.fingerprint } : {}),
      },
      beats,
    };
    cuesStageDoc.fingerprint = fingerprint({
      stage: 'cues',
      sources: cuesStageDoc.sources,
      beats,
    });
    await writeJsonAtomic(join(build, 'cues.json'), cuesStageDoc);

    const tracks = [];
    if (voice?.narration) {
      tracks.push({
        id: 'narration-main',
        kind: 'narration',
        asset: voice.narration.file,
        sha256: voice.narration.sha256,
        offset: Number(opts.narrationOffset ?? brief['narration-offset'] ?? 0),
        gain: Number(opts.narrationGain ?? brief['narration-gain'] ?? 1),
        language: voice.language || 'en',
      });
    }
    if (music?.track) {
      tracks.push({
        ...music.track,
        offset: Number(opts.musicOffset ?? brief['music-offset'] ?? music.track.offset ?? 0),
        gain: Number(opts.musicGain ?? brief['music-gain'] ?? music.track.gain ?? (voice ? 0.26 : 0.85)),
      });
    }

    const narrated = Boolean(voice && words.length > 0 && format !== 'instrumental');
    const score = buildProceduralScore(beats, duration, narrated);
    const inputsDigest = computeBundleInputsDigest({
      format,
      width,
      height,
      fps,
      lookFingerprint: resolvedLook.fingerprint,
      voice,
      music,
      words: wordsDoc,
      mouth: mouthDoc,
      cues: cuesStageDoc,
    });

    const bundle = {
      schemaVersion: 1,
      inputsDigest,
      format,
      width,
      height,
      fps,
      duration,
      look: {
        id: resolvedLook.id,
        fingerprint: resolvedLook.fingerprint,
        resolved: {
          ...resolvedLook.slots,
          hostVariant: resolvedLook.slots.host.replace(/^host-/, ''),
          showHost: hostOn,
        },
      },
      beats,
      words,
      mouth: mouthDoc
        ? { fps: mouthDoc.fps, shapes: mouthDoc.shapes }
        : { fps: 12, shapes: 'c' },
      music: musicGrid,
      captions: captionsDoc?.captions || [],
      tracks,
      score,
      narrated,
    };

    const bundlePath = join(build, 'bundle.json');
    await publishBundle(bundlePath, bundle, { registry });
    await buildStageHtml({ bundle, rootDir, prodDir: prod });
    return { bundle, cues: cuesStageDoc };
  });
}

/** Verifies that all timing products AND build/bundle.json match current stage products on disk. */
export async function assertBundleFresh(prod) {
  const prodDir = resolve(prod);
  await assertFresh(prodDir);
  const build = join(prodDir, 'build');
  const bundle = await readJson(join(build, 'bundle.json'), null);
  if (!bundle) {
    throw new Error(`no build/bundle.json in ${prodDir}; run vbc make or vbc cues first`);
  }
  const voice = await readJson(join(build, 'voice.json'), null);
  const music = await readJson(join(build, 'music.json'), null);
  const words = await readJson(join(build, 'words.json'), null);
  const mouth = await readJson(join(build, 'mouth.json'), null);
  const cues = await readJson(join(build, 'cues.json'), null);

  const expectedDigest = computeBundleInputsDigest({
    format: bundle.format,
    width: bundle.width,
    height: bundle.height,
    fps: bundle.fps,
    lookFingerprint: bundle.look?.fingerprint,
    voice,
    music,
    words,
    mouth,
    cues,
  });
  if (bundle.inputsDigest !== expectedDigest) {
    throw new Error(
      `stale bundle.json (inputsDigest ${bundle.inputsDigest.slice(0, 8)} != current stage products ${expectedDigest.slice(0, 8)}); rebuild before rendering`
    );
  }
  return bundle;
}

/** `vbc make`: runs voice/music -> words -> cues in sequence. */
export async function makeProduction(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);
  const briefText = existsSync(join(prod, 'brief.md'))
    ? await readFile(join(prod, 'brief.md'), 'utf8')
    : '';
  const brief = parseBrief(briefText);
  const format = opts.format || brief.format || 'explainer';
  const hasScript = existsSync(join(prod, 'script.md'));

  if (format !== 'instrumental' && hasScript) {
    await buildVoice({
      prod,
      rootDir,
      lang: opts.lang || brief.language,
      voice: opts.voice || brief.voice,
      provider: opts.provider,
      speed: opts.speed || brief.speed,
    });
  }
  if (format === 'instrumental' || format === 'lyric' || opts.music || brief.music === 'on') {
    await buildMusic({
      prod,
      rootDir,
      bpm: opts.bpm || brief.bpm || 120,
      duration: opts.duration || brief.duration,
      offset: opts.musicOffset || brief['music-offset'] || 0,
    });
  }
  if (format !== 'instrumental' && hasScript) {
    await buildWords({
      prod,
      rootDir,
      backend: opts.backend,
    });
  }
  return buildCues({ ...opts, prod, rootDir, format });
}

/** `vbc render` and `vbc stills`: renders MP4 or contact sheet/stills after verifying bundle freshness. */
export async function renderProduction(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);
  const bundle = await assertBundleFresh(prod);

  const build = join(prod, 'build');
  const pagePath = join(build, 'index.html');
  const mode = opts.mode || 'video';
  const outPath = resolve(
    opts.out ||
      join(build, mode === 'sheet' ? 'contact-sheet.jpg' : 'render.mp4')
  );
  await assertOutsideCheckout(outPath, rootDir);

  const renderScript = join(rootDir, 'starter', 'render.mjs');
  const args = [renderScript, pagePath];
  if (opts.from !== undefined) args.push('--from', String(opts.from));
  if (opts.to !== undefined) args.push('--to', String(opts.to));
  if (opts.fps !== undefined) args.push('--fps', String(opts.fps));

  if (mode === 'sheet') {
    args.push('--sheet', String(opts.sheet || 12), '--out', outPath);
  } else if (mode === 'stills') {
    args.push('--stills', String(opts.stills || '0,1,2'), '--outdir', resolve(opts.outdir || build));
  } else {
    args.push('--audio', 'bundle', '--out', outPath);
  }

  const res = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`render failed: ${res.stderr || res.stdout}`);
  }
  return { outPath, bundle, stdout: res.stdout };
}

/** `vbc check`: verifies freshness, bundle contract, determinism, text bounds, and video/cut/look gates. */
export async function checkProduction(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);
  const bundle = await assertBundleFresh(prod);

  const build = join(prod, 'build');
  const pagePath = join(build, 'index.html');
  const registry = await discoverPlugins(rootDir);
  const schema = await schemaFor('bundle', { registry });
  const errors = [...validate(schema, bundle), ...bundleErrors(bundle, registry)];
  if (errors.length) {
    throw new Error(`bundle contract errors:\n${errors.join('\n')}`);
  }

  const gates = {
    freshness: 'PASS',
    bundleContract: 'PASS',
  };

  if (!opts.skipBrowser) {
    const detScript = join(rootDir, 'starter', 'determinism.mjs');
    const detRes = spawnSync(process.execPath, [detScript, pagePath], { encoding: 'utf8' });
    if (detRes.status !== 0 || !detRes.stdout.includes('DETERMINISTIC')) {
      throw new Error(`determinism gate failed:\n${detRes.stderr || detRes.stdout}`);
    }
    gates.determinism = 'PASS';

    const { browser, page, meta } = await openPage(pagePath);
    try {
      const bad = await page.evaluate(({ duration, fps, width, height }) => {
        const frames = Math.max(1, Math.round(duration * fps));
        const step = Math.max(1, Math.floor(fps / 6));
        const violations = [];
        for (let i = 0; i < frames; i += step) {
          const t = i / fps;
          window.__renderFrame(t);
          if (typeof window.__textBounds === 'function') {
            for (const b of window.__textBounds()) {
              if (!b.critical) continue;
              const minL = width < height ? 80 : 60;
              const maxR = width < height ? width - 120 : width - 60;
              const minT = width < height ? 190 : 60;
              const maxB = width < height ? height - 280 : height - 60;
              if (b.left < minL || b.right > maxR || b.top < minT || b.bottom > maxB) {
                if (violations.length < 5) violations.push({ t, text: b.text, box: b });
              }
            }
          }
        }
        return violations;
      }, meta);
      if (bad.length) {
        throw new Error(`textBounds gate failed: ${JSON.stringify(bad[0])}`);
      }
      gates.textBounds = 'PASS';
    } finally {
      await browser.close();
    }
  }

  const mp4Path = resolve(opts.video || join(build, 'render.mp4'));
  if (existsSync(mp4Path)) {
    const verifyTool = join(rootDir, 'tools', 'verify', 'verify-video.py');
    const verifyArgs = [
      'run', '--python', '3.12', verifyTool, mp4Path,
      '--expect-seconds', String(bundle.duration),
      '--fps', String(bundle.fps),
      '--width', String(bundle.width),
      '--height', String(bundle.height),
    ];
    const verifyRes = spawnSync('uv', verifyArgs, { encoding: 'utf8' });
    if (verifyRes.status !== 0) {
      throw new Error(`verify-video gate failed:\n${verifyRes.stderr || verifyRes.stdout}`);
    }
    gates.verifyVideo = 'PASS';

    const cutsTool = join(rootDir, 'tools', 'verify', 'cut-harshness.py');
    const cutsRes = spawnSync('uv', ['run', '--python', '3.12', cutsTool, mp4Path], { encoding: 'utf8' });
    if (cutsRes.status !== 0) {
      throw new Error(`cut-harshness gate failed:\n${cutsRes.stderr || cutsRes.stdout}`);
    }
    gates.cutHarshness = 'PASS';

    const lookTool = join(rootDir, 'tools', 'verify', 'measure-look.py');
    const lookArgs = ['run', '--python', '3.12', lookTool, mp4Path, '--json', join(build, 'look-metrics.json')];
    const lookRes = spawnSync('uv', lookArgs, { encoding: 'utf8' });
    if (lookRes.status !== 0) {
      throw new Error(`measure-look gate failed:\n${lookRes.stderr || lookRes.stdout}`);
    }
    gates.measureLook = 'PASS';
  }

  const report = {
    status: 'PASS',
    look: bundle.look?.id,
    format: bundle.format,
    dimensions: `${bundle.width}x${bundle.height}`,
    duration: bundle.duration,
    inputsDigest: bundle.inputsDigest,
    gates,
  };
  await writeJsonAtomic(join(build, 'check.json'), report);
  return report;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

/** `vbc preview`: serves <prod>/build over HTTP after verifying bundle freshness. */
export async function previewProduction(opts) {
  const rootDir = resolve(opts.rootDir);
  const prod = requireProd(opts);
  await assertOutsideCheckout(prod, rootDir);
  await assertBundleFresh(prod);

  const build = join(prod, 'build');
  const port = Number(opts.port ?? 0);
  const server = createServer(async (req, res) => {
    try {
      const cleanPath = (req.url || '/').split('?')[0];
      const rel = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
      if (rel.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const file = join(build, rel);
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(file)] || 'application/octet-stream',
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise((resolveListen) => server.listen(port, '127.0.0.1', resolveListen));
  const actualPort = server.address().port;
  const url = `http://127.0.0.1:${actualPort}/`;
  if (opts.once) {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
  return { url, server: opts.once ? null : server };
}
