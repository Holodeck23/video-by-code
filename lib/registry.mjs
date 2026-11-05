import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, schemaFor, fingerprint, LAYER_SLOTS } from './contracts.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** All addable plugin kinds in the one-colour expansion architecture. */
export const PLUGIN_KINDS = [
  'look',
  'layer',
  'beat',
  'format',
  'anchor',
  'provider',
  'analyser',
  'finish',
];

const BASE_BEAT_TYPES = [
  'host',
  'title',
  'big',
  'list',
  'flow',
  'screen',
  'image',
  'chart',
  'code',
  'quote',
  'lyric',
  'custom',
];

const BASE_FORMATS = ['explainer', 'lyric', 'instrumental', 'vertical-short'];
const BASE_ANCHORS = ['bar', 'beat', 'section'];
const REQUIRED_PLUGIN_FILES = [
  'plugin.json',
  'index.js',
  'schema.json',
  'storyboard.txt',
  'README.md',
  'plugin.test.mjs',
];

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Loads the canonical capability vocabulary from schemas/capabilities.json. */
export async function loadCapabilities(rootDir = DEFAULT_ROOT) {
  const raw = await readFile(join(rootDir, 'schemas', 'capabilities.json'), 'utf8');
  return JSON.parse(raw);
}

/** Discovers and validates all plugin folders under plugins/<kind>/<id>/. */
export async function discoverPlugins(rootDir = DEFAULT_ROOT) {
  const pluginsRoot = join(rootDir, 'plugins');
  const pluginSchema = await schemaFor('plugin');
  const entries = [];
  const byKind = Object.fromEntries(PLUGIN_KINDS.map((k) => [k, []]));
  const byKey = {};
  const errors = [];

  if (await pathExists(pluginsRoot)) {
    const kindDirs = (await readdir(pluginsRoot, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const kind of kindDirs) {
      if (!PLUGIN_KINDS.includes(kind)) {
        errors.push(`plugins/${kind}: unknown plugin kind "${kind}"`);
        continue;
      }
      const kindPath = join(pluginsRoot, kind);
      const idDirs = (await readdir(kindPath, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

      for (const id of idDirs) {
        const dir = join(kindPath, id);
        for (const reqFile of REQUIRED_PLUGIN_FILES) {
          if (!(await pathExists(join(dir, reqFile)))) {
            errors.push(`plugins/${kind}/${id}: missing required file ${reqFile}`);
          }
        }
        const metaPath = join(dir, 'plugin.json');
        if (!(await pathExists(metaPath))) {
          continue;
        }
        const meta = JSON.parse(await readFile(metaPath, 'utf8'));
        const metaErrors = validate(pluginSchema, meta, `plugins/${kind}/${id}/plugin.json`);
        errors.push(...metaErrors);
        if (meta.kind !== kind || meta.id !== id) {
          errors.push(`plugins/${kind}/${id}: plugin.json kind/id must match folder path`);
        }
        if (kind === 'layer' && !meta.slot) {
          errors.push(`plugins/${kind}/${id}: layer plugin must declare a slot`);
        }
        let contentSchema = { type: 'object' };
        const schemaPath = join(dir, 'schema.json');
        if (await pathExists(schemaPath)) {
          contentSchema = JSON.parse(await readFile(schemaPath, 'utf8'));
        }
        const record = {
          ...meta,
          dir,
          contentSchema,
        };
        entries.push(record);
        byKind[kind].push(record);
        byKey[`${kind}/${id}`] = record;
      }
    }
  }

  const beatTypes = [...new Set([...BASE_BEAT_TYPES, ...byKind.beat.map((p) => p.id)])];
  const formats = [...new Set([...BASE_FORMATS, ...byKind.format.map((p) => p.id)])];
  const anchors = [...new Set([...BASE_ANCHORS, ...byKind.anchor.map((p) => p.id)])];
  const layerSlots = [...LAYER_SLOTS];

  return {
    entries,
    byKind,
    byKey,
    enums: { beatTypes, formats, anchors, layerSlots },
    errors,
  };
}

/** Builds a dynamic schema with enums populated from the discovered plugin registry. */
export function buildDynamicSchema(kind, baseSchema, registry) {
  const clone = JSON.parse(JSON.stringify(baseSchema));
  if (!registry?.enums) {
    return clone;
  }
  if (kind === 'bundle') {
    if (clone.properties?.format) {
      clone.properties.format.enum = registry.enums.formats;
    }
    if (clone.properties?.beats?.items?.properties?.type) {
      clone.properties.beats.items.properties.type.enum = registry.enums.beatTypes;
    }
  } else if (kind === 'cue') {
    if (clone.properties?.cues?.items?.properties?.type) {
      clone.properties.cues.items.properties.type.enum = registry.enums.beatTypes;
    }
  }
  return clone;
}

/** Validates plugin-specific beat content schemas and bundle.ext.<analyserId> schemas. */
export function validateBundleExtensions(bundle, registry) {
  const errors = [];
  if (!registry) {
    return errors;
  }
  for (let i = 0; i < (bundle.beats ?? []).length; i++) {
    const beat = bundle.beats[i];
    const plugin = registry.byKey?.[`beat/${beat.type}`];
    if (plugin?.contentSchema) {
      const subErrors = validate(
        plugin.contentSchema,
        beat.content ?? {},
        `$.beats[${i}].content`
      );
      errors.push(...subErrors);
    }
  }
  if (bundle.ext && typeof bundle.ext === 'object') {
    for (const [extId, payload] of Object.entries(bundle.ext)) {
      const analyser = registry.byKey?.[`analyser/${extId}`];
      if (!analyser) {
        errors.push(`$.ext.${extId}: unknown analyser plugin "${extId}"`);
      } else if (analyser.contentSchema) {
        errors.push(...validate(analyser.contentSchema, payload, `$.ext.${extId}`));
      }
    }
  }
  return errors;
}

/** Lints all plugin and layer requires/provides against the capability registry. */
export function lintCapabilities(registry, capabilitiesDoc) {
  const errors = [];
  const known = new Set(Object.keys(capabilitiesDoc?.capabilities ?? {}));
  for (const entry of registry.entries ?? []) {
    for (const req of entry.requires ?? []) {
      if (!known.has(req)) {
        errors.push(`${entry.kind}/${entry.id}: unknown required capability "${req}"`);
      }
    }
    for (const prov of entry.provides ?? []) {
      if (!known.has(prov)) {
        errors.push(`${entry.kind}/${entry.id}: unknown provided capability "${prov}"`);
      }
    }
  }
  return errors;
}

/** Computes a scoped look fingerprint covering only the engine and layers the look uses. */
export async function scopedLookFingerprint(lookDef, registry, rootDir = DEFAULT_ROOT) {
  const fileHashes = {};
  const coreFiles = ['lib/stage/index.js', ...(lookDef.dependencies ?? [])];
  for (const slot of LAYER_SLOTS) {
    const optId = lookDef.slots?.[slot];
    if (!optId) {
      continue;
    }
    const plugin =
      registry?.byKey?.[`layer/${optId}`] ||
      registry?.byKey?.[`layer/${slot}-${optId}`] ||
      registry?.byKey?.[`finish/${optId}`];
    if (plugin) {
      const codeRel = `plugins/${plugin.kind}/${plugin.id}/index.js`;
      coreFiles.push(codeRel);
      for (const dep of plugin.dependencies ?? []) {
        coreFiles.push(dep);
      }
    }
  }
  for (const relPath of [...new Set(coreFiles)].sort()) {
    const absPath = resolve(rootDir, relPath);
    if (await pathExists(absPath)) {
      const content = await readFile(absPath, 'utf8');
      fileHashes[relPath] = fingerprint(content);
    }
  }
  return fingerprint({
    lookId: lookDef.id,
    slots: lookDef.slots,
    files: fileHashes,
  });
}

/** Evaluates whether an accepted look's approval carries over after a dependency update. */
export function evaluateApprovalCarryOver(
  entry,
  newFingerprint,
  prevFrameHashes = [],
  nextFrameHashes = []
) {
  if (!entry.approval || entry.status !== 'accepted') {
    return {
      carriedOver: false,
      needsReview: true,
      status: entry.status,
      approval: entry.approval ?? null,
    };
  }
  if (entry.approval.fingerprint === newFingerprint) {
    return {
      carriedOver: true,
      needsReview: false,
      status: 'accepted',
      approval: entry.approval,
    };
  }
  const sameCount =
    prevFrameHashes.length > 0 && prevFrameHashes.length === nextFrameHashes.length;
  const pixelIdentical =
    sameCount && prevFrameHashes.every((hash, idx) => hash === nextFrameHashes[idx]);
  if (pixelIdentical) {
    return {
      carriedOver: true,
      needsReview: false,
      status: 'accepted',
      approval: {
        ...entry.approval,
        carriedOverFrom: entry.approval.fingerprint,
        fingerprint: newFingerprint,
      },
    };
  }
  return {
    carriedOver: false,
    needsReview: true,
    status: 'clip-passed',
    approval: entry.approval,
  };
}

/** Builds a layer catalog for resolveLook() from discovered layer plugins. */
export function catalogFromRegistry(registry) {
  const catalog = {};
  for (const layer of registry?.byKind?.layer ?? []) {
    const item = {
      schemaVersion: 1,
      id: layer.id,
      slot: layer.slot,
      requires: layer.requires,
      provides: layer.provides,
    };
    catalog[`${layer.slot}/${layer.id}`] = item;
    catalog[layer.id] = item;
  }
  return catalog;
}

/** Scaffolds a new plugin folder under plugins/<kind>/<id>/ in the lab lane. */
export async function scaffoldPlugin(rootDir, kind, id, options = {}) {
  if (!PLUGIN_KINDS.includes(kind)) {
    throw new Error(`unknown plugin kind "${kind}"`);
  }
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`invalid plugin id "${id}": use lowercase letters, digits and hyphens`);
  }
  const dir = join(rootDir, 'plugins', kind, id);
  if (await pathExists(dir)) {
    throw new Error(`plugin folder already exists: plugins/${kind}/${id}`);
  }
  await mkdir(dir, { recursive: true });

  const meta = {
    schemaVersion: 1,
    kind,
    id,
    version: '0.1.0',
    lane: 'lab',
    status: 'lab',
    ...(kind === 'layer' ? { slot: options.slot || 'marks' } : {}),
    requires: options.requires || [],
    provides: options.provides || [],
  };
  await writeFile(join(dir, 'plugin.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');

  const contentSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string', minLength: 1 },
      note: { type: 'string' },
    },
    required: ['title'],
  };
  await writeFile(join(dir, 'schema.json'), JSON.stringify(contentSchema, null, 2) + '\n', 'utf8');

  const codeLines = [
    `// Plugin ${kind}/${id} (scaffolded by vbc add).`,
    '(function (root) {',
    "  'use strict';",
    '  const plugin = {',
    `    kind: '${kind}',`,
    `    id: '${id}',`,
    '    draw(ctx, state) {',
    '      if (!ctx || !state) return;',
    '    },',
    '  };',
    '  root.VBC_PLUGINS = root.VBC_PLUGINS || {};',
    `  root.VBC_PLUGINS['${kind}/${id}'] = plugin;`,
    '})(typeof window !== "undefined" ? window : globalThis);',
    '',
  ];
  await writeFile(join(dir, 'index.js'), codeLines.join('\n'), 'utf8');

  const storyboard = `== ${kind === 'beat' ? id : 'title'} title="${id} demo"\n@ start\n`;
  await writeFile(join(dir, 'storyboard.txt'), storyboard, 'utf8');

  const readme = `# ${id} (${kind} plugin)\n\nStatus: \`lab\` (does not block release).\n`;
  await writeFile(join(dir, 'README.md'), readme, 'utf8');

  const testCode = [
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { readFile } from 'node:fs/promises';",
    "import './index.js';",
    '',
    `test('${kind}/${id} plugin metadata and runtime hook load cleanly', async () => {`,
    "  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));",
    `  assert.equal(meta.kind, '${kind}');`,
    `  assert.equal(meta.id, '${id}');`,
    "  assert.equal(meta.lane, 'lab');",
    `  assert.ok(globalThis.VBC_PLUGINS?.['${kind}/${id}']);`,
    '});',
    '',
  ];
  await writeFile(join(dir, 'plugin.test.mjs'), testCode.join('\n'), 'utf8');
  return dir;
}
