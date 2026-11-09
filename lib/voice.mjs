// Voice stage: script.md -> per-paragraph narration with a content-addressed cache, an assembled
// master track and a stage product (build/voice.json) that downstream timing products must match.
//
// Layout inside the explicit production directory (never inside the code checkout):
//   script.md  brief.md  say.json                 source files you edit
//   build/voice.json                              this stage's product (published last)
//   build/audio/narration.wav                     assembled master voice track
//   build/cache/voice/<fingerprint>.wav           one file per paragraph take, reused when inputs match
//   build/rerolls.json                            { paragraphId: takeNumber } written by --redo
//   build/{words,mouth,cues,captions}.json        later stages; each records sources.voice
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fingerprint } from './contracts.mjs';
import { readWav, writeWav } from './wav.mjs';

/** Bump when assembly or fingerprint semantics change: every cached take is then re-keyed. */
export const VOICE_STAGE_VERSION = 1;
export const FIT_CAP = 1.25;
const CJK = new Set(['ja', 'zh', 'yue']);
const DOWNSTREAM = ['words', 'mouth', 'cues', 'captions'];

export function langCode(lang) {
  return String(lang || 'en').trim().toLowerCase().split(/[-_]/)[0] || 'en';
}

/** Splits `{shown|spoken}` markup once. `\{ \} \|` escape literals. Throws on unbalanced braces. */
export function parseMarkup(raw) {
  const sentinel = { '{': '\u0001', '}': '\u0002', '|': '\u0003' };
  const restore = (s) => s.replace(/[\u0001\u0002\u0003]/g, (c) => ({ '\u0001': '{', '\u0002': '}', '\u0003': '|' })[c]);
  const guarded = raw.replace(/\\([{}|])/g, (_, ch) => sentinel[ch]);
  const display = guarded.replace(/\{([^{}|]*)\|([^{}]*)\}/g, '$1');
  const spoken = guarded.replace(/\{([^{}|]*)\|([^{}]*)\}/g, '$2');
  if (/[{}]/.test(display) || /[{}]/.test(spoken)) {
    throw new Error(`unbalanced {shown|spoken} markup in: ${raw.slice(0, 80)}`);
  }
  const clean = (s) => restore(s).replace(/\s+/g, ' ').trim();
  return { display: clean(display), spoken: clean(spoken) };
}

/** Number of comparable speech units (words, or characters for ja/zh). 0 means nothing to say. */
export function comparableCount(spoken, lang) {
  const folded = spoken.normalize('NFKC');
  if (CJK.has(langCode(lang))) {
    return [...folded.replace(/[^\p{L}\p{N}\p{M}]/gu, '')].length;
  }
  return folded.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/**
 * Parses script.md into paragraphs. Blank lines separate paragraphs; `# Heading` lines name
 * the section and are not spoken. A leading `[[id]]` fixes the paragraph id (use it whenever the
 * same paragraph exists in several languages); otherwise the id derives from the text, with `-2`,
 * `-3` for repeats, so inserting a paragraph elsewhere never renames the others.
 */
export function parseScript(text, lang = 'en') {
  const paragraphs = [];
  let section = '';
  let buf = [];
  const flush = () => {
    if (!buf.length) {
      return;
    }
    let body = buf.join('\n');
    buf = [];
    let explicit = null;
    const m = /^\[\[([a-z0-9-]+)\]\]\s*/.exec(body);
    if (m) {
      explicit = m[1];
      body = body.slice(m[0].length);
    }
    const { display, spoken } = parseMarkup(body);
    paragraphs.push({ explicit, section, display, spoken, raw: body });
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      section = heading[1].trim();
    } else if (!line.trim()) {
      flush();
    } else {
      buf.push(line);
    }
  }
  flush();
  const seen = new Map();
  const taken = new Set();
  paragraphs.forEach((p, i) => {
    if (p.explicit) {
      if (taken.has(p.explicit)) {
        throw new Error(`duplicate paragraph id [[${p.explicit}]]`);
      }
      p.id = p.explicit;
      taken.add(p.id);
    }
    p.index = i + 1;
  });
  for (const p of paragraphs) {
    if (!p.id) {
      const base = `p-${createHash('sha256').update(p.raw).digest('hex').slice(0, 8)}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      p.id = n === 1 ? base : `${base}-${n}`;
      if (taken.has(p.id)) {
        throw new Error(`generated paragraph id ${p.id} collides with an explicit id`);
      }
      taken.add(p.id);
    }
    delete p.explicit;
    delete p.raw;
    if (!comparableCount(p.spoken, lang)) {
      throw new Error(`paragraph ${p.id} (#${p.index}) has no comparable narration tokens for language '${lang}'`);
    }
  }
  if (!paragraphs.length) {
    throw new Error('script has no paragraphs');
  }
  return paragraphs;
}

/** Reads loose `key: value` lines from brief.md (leading bullets allowed). */
export function parseBrief(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:[-*]\s*)?([A-Za-z][A-Za-z ]*?):\s*(.+?)\s*$/.exec(line);
    if (m) {
      out[m[1].toLowerCase().replace(/\s+/g, '-')] = m[2];
    }
  }
  return out;
}

/** Replaces written forms by spoken forms: whole-word where the key starts/ends with a word char, longest first. */
export function applySayMap(text, map) {
  let out = text;
  for (const key of Object.keys(map).sort((a, b) => b.length - a.length)) {
    let pat = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/^\w/.test(key)) {
      pat = `(?<!\\w)${pat}`;
    }
    if (/\w$/.test(key)) {
      pat = `${pat}(?!\\w)`;
    }
    out = out.replace(new RegExp(pat, 'g'), () => map[key]);
  }
  return out;
}

export async function loadVoiceProvider(rootDir, id) {
  const entry = join(rootDir, 'plugins', 'provider', id, 'index.js');
  if (!existsSync(entry)) {
    throw new Error(`unknown voice provider '${id}' (no plugins/provider/${id}); run: vbc plugin list`);
  }
  await import(pathToFileURL(entry).href);
  const plugin = globalThis.VBC_PLUGINS?.[`provider/${id}`];
  if (!plugin || plugin.modality !== 'voice' || typeof plugin.synthesize !== 'function') {
    throw new Error(`provider/${id} is not a voice provider (needs modality 'voice' and synthesize())`);
  }
  return plugin;
}

function checkLanguage(provider, lang) {
  const code = langCode(lang);
  const supported = provider.languages ?? [];
  if (!supported.includes(code)) {
    throw new Error(`provider '${provider.id}' does not support language '${code}' (supported: ${supported.join(', ')})`);
  }
}

/** Runs `fn` while holding <prod>/.vbc.lock so two builds can never write one production. */
export async function withProductionLock(prod, fn) {
  const lock = join(prod, '.vbc.lock');
  for (let attempt = 0; ; attempt += 1) {
    try {
      await writeFile(lock, `${process.pid}\n`, { flag: 'wx' });
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      const pid = Number.parseInt(await readFile(lock, 'utf8').catch(() => ''), 10);
      let alive = false;
      if (pid) {
        try {
          process.kill(pid, 0);
          alive = true;
        } catch (killErr) {
          alive = killErr.code === 'EPERM';
        }
      }
      if (alive || attempt > 0) {
        throw new Error(`another vbc build holds ${lock} (pid ${pid || 'unknown'}); wait for it or remove the lock if that process is gone`);
      }
      await unlink(lock).catch(() => {});
    }
  }
  try {
    return await fn();
  } finally {
    await unlink(lock).catch(() => {});
  }
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

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function samplesSha(samples) {
  return sha256(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
}

async function assertOutsideCheckout(prod, rootDir) {
  const p = await realpath(prod);
  const root = await realpath(rootDir);
  const rel = relative(root, p);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error(`production directory ${p} is inside the code checkout; use a folder outside ${root}`);
  }
}

/**
 * Builds or refreshes the voice stage.
 * opts: { prod, rootDir, provider?, voice?, lang?, speed?, gap?, leadIn?, redo?, master? }
 * Returns { voice, synthesized, reused, stale } where synthesized/reused list paragraph ids.
 */
export async function buildVoice(opts) {
  const rootDir = resolve(opts.rootDir);
  if (!opts.prod) {
    throw new Error('--prod DIR is required: name the production folder explicitly (outside the checkout)');
  }
  const prod = resolve(opts.prod);
  if (!existsSync(join(prod, 'script.md'))) {
    throw new Error(`no script.md in ${prod}`);
  }
  await assertOutsideCheckout(prod, rootDir);
  const brief = existsSync(join(prod, 'brief.md')) ? parseBrief(await readFile(join(prod, 'brief.md'), 'utf8')) : {};
  const lang = langCode(opts.lang ?? brief.language ?? 'en');
  const voiceSpec = opts.voice ?? brief.voice ?? 'kokoro:af_heart';
  const [providerFromSpec, ...voiceParts] = voiceSpec.includes(':') ? voiceSpec.split(':') : [voiceSpec, ''];
  const providerId = opts.provider ?? providerFromSpec;
  const voiceName = voiceParts.join(':') || undefined;
  const baseSpeed = Number(opts.speed ?? brief.speed ?? 0.89);
  const gap = Number(opts.gap ?? 0.75);
  const leadIn = Number(opts.leadIn ?? 0.4);
  const provider = await loadVoiceProvider(rootDir, providerId);
  checkLanguage(provider, lang);
  const master = opts.master ? await loadMaster(opts.master, lang) : null;

  return withProductionLock(prod, async () => {
    const build = join(prod, 'build');
    const cacheDir = join(build, 'cache', 'voice');
    await mkdir(cacheDir, { recursive: true });
    await mkdir(join(build, 'audio'), { recursive: true });

    const paragraphs = parseScript(await readFile(join(prod, 'script.md'), 'utf8'), lang);
    const sayMap = await readJson(join(prod, 'say.json'), {});
    const rerolls = await readJson(join(build, 'rerolls.json'), {});
    if (opts.redo !== undefined && opts.redo !== null) {
      const target = /^\d+$/.test(String(opts.redo))
        ? paragraphs[Number(opts.redo) - 1]
        : paragraphs.find((p) => p.id === String(opts.redo));
      if (!target) {
        throw new Error(`--redo ${opts.redo}: no such paragraph (ids: ${paragraphs.map((p) => p.id).join(', ')})`);
      }
      rerolls[target.id] = (rerolls[target.id] ?? 0) + 1;
    }
    if (master) {
      assertMasterMatches(master, paragraphs);
    }

    const synthesized = [];
    const reused = [];
    let rate = null;
    const identity = provider.identity ? await provider.identity({ rootDir, voice: voiceName }) : { provider: provider.id };

    // Takes are keyed on what changes the sound; the written dictionary only matters where it rewrote text.
    async function take(p, speed) {
      const text = applySayMap(p.spoken, sayMap);
      const t = rerolls[p.id] ?? 0;
      const fp = fingerprint({ stage: 'voice', v: VOICE_STAGE_VERSION, text, lang, provider: identity, voice: voiceName ?? null, speed, take: t });
      const file = join(cacheDir, `${fp.slice(0, 32)}.wav`);
      let audio;
      if (existsSync(file)) {
        try {
          audio = await readWav(file);
          reused.push(p.id);
        } catch {
          await unlink(file).catch(() => {});
        }
      }
      if (!audio) {
        const out = await provider.synthesize({ text, lang, voice: voiceName, speed, take: t, rootDir, workDir: cacheDir, helpers: { readWav } });
        if (!out?.samples?.length || !out.rate) {
          throw new Error(`provider '${providerId}' returned no audio for paragraph ${p.id}`);
        }
        await writeWav(file, out.samples, out.rate);
        // Read the take back so a fresh synthesis and a cached reuse are the same 16-bit samples (same hashes).
        audio = await readWav(file);
        synthesized.push(p.id);
      }
      if (rate && audio.rate !== rate) {
        throw new Error(`paragraph ${p.id} is ${audio.rate} Hz but earlier paragraphs are ${rate} Hz; one provider must use one rate`);
      }
      rate = audio.rate;
      return { ...audio, fp, file, text, speed, take: t };
    }

    const takes = [];
    for (const p of paragraphs) {
      takes.push(await take(p, baseSpeed));
    }

    const failures = [];
    let slots = null;
    if (master) {
      slots = [];
      for (let i = 0; i < paragraphs.length; i += 1) {
        const own = takes[i].samples.length / rate;
        const m = master.paragraphs.find((x) => x.id === paragraphs[i].id);
        let current = takes[i];
        if (own > m.duration + 1e-6) {
          const factor = own / m.duration;
          if (factor > FIT_CAP) {
            failures.push(`${paragraphs[i].id}: ${own.toFixed(2)}s vs master ${m.duration.toFixed(2)}s needs x${factor.toFixed(2)} (cap x${FIT_CAP})`);
            slots.push(null);
            continue;
          }
          current = await take(paragraphs[i], Number((baseSpeed * factor * 1.01).toFixed(4)));
          if (current.samples.length / rate > m.duration + 1e-6) {
            failures.push(`${paragraphs[i].id}: still ${(current.samples.length / rate).toFixed(2)}s after speeding up x${factor.toFixed(2)}; master allows ${m.duration.toFixed(2)}s`);
            slots.push(null);
            continue;
          }
        }
        takes[i] = current;
        slots.push(Math.round(m.duration * rate));
      }
    }
    if (failures.length) {
      throw new Error(`language fit failed (nothing published):\n  ${failures.join('\n  ')}`);
    }

    // Assemble: lead-in, then each paragraph in its slot (padded to the master slot when fitted), gaps between.
    const lead = master ? master.leadIn : leadIn;
    const gapS = master ? master.gap : gap;
    const parts = [];
    let pos = Math.round(lead * rate);
    parts.push(new Float32Array(pos));
    const rows = paragraphs.map((p, i) => {
      const t = takes[i];
      const slot = slots ? slots[i] : t.samples.length;
      const padded = new Float32Array(slot);
      padded.set(t.samples.subarray(0, slot));
      const start = pos / rate;
      parts.push(padded);
      pos += slot;
      const end = pos / rate;
      if (i < paragraphs.length - 1) {
        const g = Math.round(gapS * rate);
        parts.push(new Float32Array(g));
        pos += g;
      }
      return {
        id: p.id,
        index: p.index,
        section: p.section,
        display: p.display,
        spoken: t.text,
        fingerprint: t.fp,
        audioSha256: samplesSha(t.samples),
        file: relative(build, t.file).split('\\').join('/'),
        take: t.take,
        speed: t.speed,
        start: Number(start.toFixed(6)),
        end: Number(end.toFixed(6)),
        duration: Number((t.samples.length / rate).toFixed(6)),
      };
    });
    const all = new Float32Array(pos);
    let o = 0;
    for (const part of parts) {
      all.set(part, o);
      o += part.length;
    }
    const narration = join(build, 'audio', 'narration.wav');
    await writeWav(narration, all, rate);

    const voice = {
      schemaVersion: 1,
      stage: 'voice',
      language: lang,
      provider: identity,
      voice: voiceName ?? null,
      speed: baseSpeed,
      sampleRate: rate,
      leadIn: lead,
      gap: gapS,
      duration: Number((pos / rate).toFixed(6)),
      narration: { file: 'audio/narration.wav', sha256: sha256(await readFile(narration)) },
      paragraphs: rows,
    };
    voice.fingerprint = voiceFingerprint(voice);
    await writeJsonAtomic(join(build, 'rerolls.json'), rerolls);
    await writeJsonAtomic(join(build, 'voice.json'), voice);
    return { voice, synthesized: [...new Set(synthesized)], reused: [...new Set(reused)], stale: await staleProducts(prod) };
  });
}

/** Identity of the assembled voice: audio content and timeline of every paragraph. Timing products record it. */
export function voiceFingerprint(voice) {
  return fingerprint({
    language: voice.language,
    rate: voice.sampleRate,
    paragraphs: voice.paragraphs.map((p) => [p.id, p.audioSha256, p.start, p.duration]),
  });
}

async function loadMaster(path, lang) {
  const file = path.endsWith('.json') ? path : join(path, 'build', 'voice.json');
  const doc = await readJson(file);
  if (doc.stage !== 'voice' || !Array.isArray(doc.paragraphs)) {
    throw new Error(`${file} is not a voice stage product`);
  }
  if (doc.language === lang) {
    throw new Error(`master voice is already '${lang}'; --master fits a translated take to the master timeline`);
  }
  return doc;
}

function assertMasterMatches(master, paragraphs) {
  const own = paragraphs.map((p) => p.id);
  const theirs = master.paragraphs.map((p) => p.id);
  const missing = theirs.filter((id) => !own.includes(id));
  const extra = own.filter((id) => !theirs.includes(id));
  if (missing.length || extra.length) {
    throw new Error(
      'paragraph ids differ from the master, so the languages cannot be fitted paragraph by paragraph. ' +
        `Give each paragraph a matching [[id]] in both scripts. Missing: ${missing.join(', ') || 'none'}; unexpected: ${extra.join(', ') || 'none'}`,
    );
  }
}

/**
 * Lists timing products that no longer match the current voice. A product is fresh only when its
 * sources.voice equals build/voice.json's fingerprint; products without it are treated as stale.
 */
export async function staleProducts(prod) {
  const build = join(resolve(prod), 'build');
  const voice = await readJson(join(build, 'voice.json'), null);
  if (!voice) {
    return [];
  }
  const stale = [];
  for (const name of DOWNSTREAM) {
    const doc = await readJson(join(build, `${name}.json`), null);
    if (!doc) {
      continue;
    }
    const built = doc.sources?.voice;
    if (built !== voice.fingerprint) {
      stale.push({ product: `${name}.json`, reason: built ? `built from voice ${built.slice(0, 8)}, current ${voice.fingerprint.slice(0, 8)}` : 'records no sources.voice' });
    }
  }
  return stale;
}

/** Throws when any named product is stale; renderers and the assembler call this before using them. */
export async function assertFresh(prod, names = DOWNSTREAM) {
  const stale = (await staleProducts(prod)).filter((s) => names.includes(s.product.replace(/\.json$/, '')));
  if (stale.length) {
    throw new Error(`stale products (rebuild them): ${stale.map((s) => `${s.product} (${s.reason})`).join('; ')}`);
  }
}
