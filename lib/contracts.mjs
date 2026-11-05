import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';

// Evaluates only the keywords used in our provisional schemas;
// not a general JSON Schema implementation.
const ALLOWED_SCHEMA_KEYS = new Set([
  '$schema',
  'type',
  'const',
  'enum',
  'required',
  'properties',
  'additionalProperties',
  'items',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'minLength',
  'pattern',
]);

/** The ten required layer slots in every resolved look composition. */
export const LAYER_SLOTS = [
  'palette',
  'ground',
  'marks',
  'type',
  'composition',
  'progression',
  'motion',
  'transitions',
  'finish',
  'host',
];

/** Validates a value against one of our restricted JSON schemas. */
export function validate(schema, value, at = '$') {
  for (const key of Object.keys(schema)) {
    if (!ALLOWED_SCHEMA_KEYS.has(key)) {
      throw new Error(`unsupported schema keyword ${key}`);
    }
  }
  const errors = [];
  const fail = (msg) => {
    errors.push(`${at}: ${msg}`);
  };
  if ('const' in schema && value !== schema.const) {
    fail('wrong constant');
  }
  if (schema.enum && !schema.enum.includes(value)) {
    fail('unknown value');
  }
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const typeMatches = schema.type === 'integer' ? Number.isInteger(value) : type === schema.type;
  if (schema.type && !typeMatches) {
    return [...errors, `${at}: expected ${schema.type}`];
  }
  if (type === 'number') {
    if (!Number.isFinite(value)) {
      fail('must be finite');
    }
    if ('minimum' in schema && value < schema.minimum) {
      fail('below minimum');
    }
    if ('maximum' in schema && value > schema.maximum) {
      fail('above maximum');
    }
    if ('exclusiveMinimum' in schema && value <= schema.exclusiveMinimum) {
      fail('below exclusive minimum');
    }
  }
  if (type === 'string') {
    if (schema.minLength && [...value].length < schema.minLength) {
      fail('empty string');
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      fail('invalid pattern');
    }
  }
  if (type === 'array' && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validate(schema.items, item, `${at}[${index}]`));
    });
  }
  if (type === 'object') {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        fail(`missing ${key}`);
      }
    }
    for (const [key, propVal] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) {
        errors.push(...validate(schema.properties[key], propVal, `${at}.${key}`));
      } else if (schema.additionalProperties === false) {
        fail(`unknown field ${key}`);
      }
    }
  }
  return errors;
}

/** Loads a parsed JSON schema by contract kind. */
export async function schemaFor(kind) {
  const validKinds = ['bundle', 'cue', 'layer', 'renderer', 'manifest'];
  if (!validKinds.includes(kind)) {
    throw new Error('expected bundle, cue, layer, renderer or manifest');
  }
  const url = new URL(`../schemas/${kind}.schema.json`, import.meta.url);
  return JSON.parse(await readFile(url, 'utf8'));
}

function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => [key, canonical(value[key])]);
    return Object.fromEntries(entries);
  }
  return value;
}

/** Computes a key-order-independent SHA-256 hex digest for dependency inputs. */
export function fingerprint(inputs) {
  const payload = JSON.stringify(canonical(inputs));
  return createHash('sha256').update(payload).digest('hex');
}

/** Checks semantic invariants on a bundle document after schema validation. */
export function bundleErrors(bundle) {
  const errors = [];
  for (const key of ['beats', 'words', 'captions']) {
    let lastStart = -Infinity;
    let lastEnd = -Infinity;
    const ids = new Set();
    for (const item of bundle[key]) {
      const overlapsPrev = key === 'beats' ? item.start < lastEnd : item.start < lastStart;
      if (overlapsPrev || item.end <= item.start || item.end > bundle.duration) {
        errors.push(`${key}: invalid range/order`);
      }
      if (item.id && ids.has(item.id)) {
        errors.push(`${key}: duplicate id`);
      }
      ids.add(item.id);
      lastStart = item.start;
      lastEnd = item.end;
    }
  }
  if (bundle.width % 2 || bundle.height % 2) {
    errors.push('dimensions must be even');
  }
  const hasNarrationTrack = bundle.tracks.some((track) => track.kind === 'narration');
  if (bundle.narrated && (!bundle.words.length || !hasNarrationTrack)) {
    errors.push('explainer needs words and narration');
  }
  const assets = [
    ...bundle.tracks.map((track) => track.asset),
    ...(bundle.music.features ? [bundle.music.features.asset] : []),
  ];
  for (const asset of assets) {
    const isInvalidPath =
      asset.startsWith('/') ||
      asset.includes('\\') ||
      asset.includes(':') ||
      asset.split('/').includes('..');
    if (isInvalidPath) {
      errors.push('asset must be a portable relative path');
    }
  }
  return errors;
}

/** Validates and atomically writes bundle.json via a temporary file rename. */
export async function publishBundle(path, bundle) {
  const schema = await schemaFor('bundle');
  const errors = validate(schema, bundle);
  if (!errors.length) {
    errors.push(...bundleErrors(bundle));
  }
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(bundle, null, 2) + '\n', { flag: 'wx' });
    await rename(tmp, path);
  } finally {
    await unlink(tmp).catch((err) => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    });
  }
}

function normTok(str) {
  return String(str ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '');
}

/** Parses a storyboard cue anchor (@ phrase, @ phrase #N, @bar N, @beat N, @section NAME). */
export function parseCueAnchor(anchor) {
  const trimmed = String(anchor ?? '').trim();
  if (!trimmed.startsWith('@')) {
    throw new Error(`invalid cue anchor "${anchor}": must start with @`);
  }
  const body = trimmed.slice(1).trim();
  let match = body.match(/^(bar|beat)\s+([1-9][0-9]*)$/);
  if (match) {
    return { kind: match[1], index: Number(match[2]) };
  }
  match = body.match(/^section\s+(\S+)$/);
  if (match) {
    return { kind: 'section', name: match[1] };
  }
  match = body.match(/^(.*?)(?:\s+#([1-9][0-9]*))?$/);
  const phrase = (match?.[1] ?? '').trim();
  if (!phrase) {
    throw new Error(`empty cue anchor "${anchor}"`);
  }
  return {
    kind: 'phrase',
    phrase,
    occurrence: match?.[2] ? Number(match[2]) : null,
  };
}

/** Resolves cue anchors against aligned words and music grid into [start, end) beats. */
export function resolveCues(doc, { words = [], music = {}, duration }) {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('resolveCues requires positive duration');
  }
  const beatsGrid = music.beats ?? [];
  const downbeatsGrid = music.downbeats ?? [];
  const sections = music.sections ?? [];
  const toks = words.map((word, index) => ({
    ...word,
    index,
    norm: normTok(word.text || word.spoken),
  }));
  const resolved = [];
  let cursor = 0;
  let lastTime = -Infinity;

  for (const cue of doc.cues ?? []) {
    const anchor = parseCueAnchor(cue.anchor);
    let start = 0;
    if (anchor.kind === 'bar' || anchor.kind === 'beat') {
      const grid = anchor.kind === 'bar' ? downbeatsGrid : beatsGrid;
      if (anchor.index > grid.length) {
        const msg = `@${anchor.kind} ${anchor.index} out of range (max ${grid.length})`;
        throw new Error(`line ${cue.line} (${cue.id}): ${msg}`);
      }
      start = grid[anchor.index - 1];
    } else if (anchor.kind === 'section') {
      const hits = sections.filter((sec) => sec.name === anchor.name);
      if (hits.length !== 1) {
        const cands =
          sections.map((sec) => `${sec.name}@${sec.start.toFixed(2)}s`).join(', ') || 'none';
        const kindLabel = hits.length ? 'ambiguous' : 'missing';
        const msg = `${kindLabel} @section ${anchor.name} (candidates: ${cands})`;
        throw new Error(`line ${cue.line} (${cue.id}): ${msg}`);
      }
      start = hits[0].start;
    } else {
      const query = anchor.phrase.split(/\s+/).map(normTok).filter(Boolean);
      if (!query.length) {
        throw new Error(`line ${cue.line} (${cue.id}): phrase has no comparable tokens`);
      }
      const allMatches = [];
      for (let i = 0; i <= toks.length - query.length; i++) {
        const matchesAll = query.every((tok, offset) => toks[i + offset].norm === tok);
        if (matchesAll) {
          const text = words
            .slice(i, i + query.length)
            .map((word) => word.text)
            .join(' ');
          allMatches.push({
            wordIndex: i,
            start: toks[i].start,
            end: toks[i + query.length - 1].end,
            text,
          });
        }
      }
      const formatCandidates = (list) =>
        list.map((m, idx) => `#${idx + 1} "${m.text}"@${m.start.toFixed(2)}s`).join(', ') ||
        'none';
      if (anchor.occurrence !== null) {
        const hit = allMatches[anchor.occurrence - 1];
        if (!hit) {
          const cands = formatCandidates(allMatches);
          const msg = `missing "${anchor.phrase} #${anchor.occurrence}" (candidates: ${cands})`;
          throw new Error(`line ${cue.line} (${cue.id}): ${msg}`);
        }
        if (hit.wordIndex < cursor || hit.start < lastTime) {
          const atTime = hit.start.toFixed(2);
          const prevTime = lastTime.toFixed(2);
          const ref = `"${anchor.phrase} #${anchor.occurrence}"@${atTime}s`;
          throw new Error(
            `line ${cue.line} (${cue.id}): ${ref} moves backwards before ${prevTime}s`
          );
        }
        start = hit.start;
        cursor = hit.wordIndex + query.length;
      } else {
        const forwardMatches = allMatches.filter(
          (m) => m.wordIndex >= cursor && m.start >= lastTime
        );
        if (!forwardMatches.length) {
          const fromTime = Math.max(0, lastTime).toFixed(2);
          const cands = formatCandidates(allMatches);
          const msg = `missing phrase "${anchor.phrase}" from ${fromTime}s (candidates: ${cands})`;
          throw new Error(`line ${cue.line} (${cue.id}): ${msg}`);
        }
        if (forwardMatches.length > 1 && forwardMatches[0].start === forwardMatches[1].start) {
          const cands = formatCandidates(forwardMatches);
          const msg = `ambiguous phrase "${anchor.phrase}" (candidates: ${cands})`;
          throw new Error(`line ${cue.line} (${cue.id}): ${msg}`);
        }
        start = forwardMatches[0].start;
        cursor = forwardMatches[0].wordIndex + query.length;
      }
    }
    if (start < lastTime) {
      const curStr = start.toFixed(2);
      const prevStr = lastTime.toFixed(2);
      throw new Error(
        `line ${cue.line} (${cue.id}): cue at ${curStr}s precedes previous cue at ${prevStr}s`
      );
    }
    lastTime = start;
    resolved.push({ id: cue.id, type: cue.type, start, content: cue.content });
  }
  return resolved.map((beat, idx) => ({
    ...beat,
    end: idx + 1 < resolved.length ? resolved[idx + 1].start : duration,
  }));
}

/** Resolves a 10-slot look with overrides and verifies requires/provides coupling. */
export function resolveLook(look, overrides = {}, catalog = {}) {
  const errors = [];
  for (const slot of LAYER_SLOTS) {
    if (!look.slots?.[slot]) {
      errors.push(`look ${look.id}: missing slot ${slot}`);
    }
  }
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const identity = new Set(look.identitySlots ?? []);
  const allowed = look.supportedOverrides ?? {};
  const selected = { ...look.slots };

  for (const [slot, optId] of Object.entries(overrides)) {
    if (!LAYER_SLOTS.includes(slot)) {
      errors.push(`unknown override slot ${slot}`);
    } else if (identity.has(slot)) {
      errors.push(`slot ${slot} is a locked identity layer on ${look.id}`);
    } else if (!allowed[slot] || (Array.isArray(allowed[slot]) && !allowed[slot].includes(optId))) {
      errors.push(`override ${slot}=${optId} is not supported by ${look.id}`);
    } else {
      selected[slot] = optId;
    }
  }

  const layers = [];
  const provided = new Set();
  for (const slot of LAYER_SLOTS) {
    const id = selected[slot];
    const layer = catalog[`${slot}/${id}`] ?? catalog[id];
    if (!layer) {
      errors.push(`missing layer definition for ${slot}/${id}`);
    } else {
      if (layer.slot !== slot) {
        errors.push(`layer ${id} belongs to ${layer.slot}, not ${slot}`);
      }
      if (layer.draw && typeof layer.draw !== 'function') {
        errors.push(`layer ${id}: draw must be a function`);
      }
      layers.push(layer);
      for (const cap of layer.provides ?? []) {
        provided.add(cap);
      }
    }
  }

  for (const layer of layers) {
    for (const req of layer.requires ?? []) {
      if (!provided.has(req)) {
        errors.push(`layer ${layer.slot}/${layer.id} requires missing capability "${req}"`);
      }
    }
  }
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  return {
    id: look.id,
    slots: selected,
    capabilities: [...provided].sort(),
    fingerprint: fingerprint({ look: look.id, slots: selected }),
  };
}

/** Checks semantic invariants on a renderer invocation spec. */
export function rendererErrors(spec) {
  const errors = [];
  if (spec.width % 2 || spec.height % 2) {
    errors.push('renderer dimensions must be even');
  }
  if (spec.from < 0 || spec.from >= spec.to || spec.to > spec.duration) {
    errors.push('renderer range must satisfy 0 <= from < to <= duration');
  }
  return errors;
}

/** Binds a createStage instance to the page globals expected by capture renderers. */
export function bindStageToPage(win, stage, bundle) {
  const isValidStage =
    stage &&
    typeof stage.ready?.then === 'function' &&
    typeof stage.renderFrame === 'function' &&
    typeof stage.dispose === 'function';
  if (!isValidStage) {
    throw new Error('stage instance must expose {ready: Promise, renderFrame(t), dispose()}');
  }
  win.DURATION = bundle.duration;
  win.FPS = bundle.fps;
  win.__ready = stage.ready;
  win.__renderFrame = (t) => stage.renderFrame(t);
  return () => stage.dispose();
}

/** Checks whether the look manifest meets all release-gate requirements. */
export function releaseErrors(manifest, currentFingerprints) {
  const errors = [];
  if (!manifest.scopeFrozen || manifest.unresolvedSources.length) {
    errors.push('launch scope is not frozen/complete');
  }
  const uniqueIds = new Set(manifest.entries.map((entry) => entry.id));
  if (uniqueIds.size !== manifest.entries.length) {
    errors.push('duplicate manifest id');
  }
  const launch = manifest.entries.filter((entry) => entry.launch);
  if (!launch.length) {
    errors.push('empty launch scope');
  }
  for (const entry of launch) {
    const approval = entry.approval;
    const hasMeta =
      entry.status === 'accepted' &&
      approval?.reviewer &&
      approval?.date &&
      approval?.evidence?.length;
    if (!hasMeta) {
      errors.push(`${entry.id}: missing approval/evidence`);
    }
    for (const aspect of ['landscape', 'vertical']) {
      const hasAspectClip = approval?.evidence?.some(
        (ev) => ev.aspect === aspect && ev.clip && ev.moving === true && ev.sound === true
      );
      if (!hasAspectClip) {
        errors.push(`${entry.id}: missing moving/sound ${aspect} evidence`);
      }
    }
    if (!currentFingerprints[entry.id] || approval?.fingerprint !== currentFingerprints[entry.id]) {
      errors.push(`${entry.id}: stale approval`);
    }
  }
  return errors;
}
