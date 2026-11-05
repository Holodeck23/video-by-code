// Stage Core ("One Engine"): renders any frame from a validated bundle.json
// as a pure, synchronous function of time t. Supports multi-tile isolation
// via createStage({ canvas, bundle, assets }) and single-page globals.

import {
  computeContentRect,
  resolveHostState,
  drawHost,
} from './host.js';

const DEFAULT_PALETTES = {
  'studio-dark': {
    bg: '#0c111d',
    surface: '#161f33',
    body: '#233252',
    face: '#f4efe6',
    ink: '#0f172a',
    text: '#f8fafc',
    muted: '#94a3b8',
    accent: '#38bdf8',
    accent2: '#f43f5e',
    mouthFill: '#fb7185',
  },
  'warm-editorial': {
    bg: '#f4efe4',
    surface: '#e7dfd0',
    body: '#2b3a4a',
    face: '#fffdf9',
    ink: '#1c1917',
    text: '#1c1917',
    muted: '#57534e',
    accent: '#d97706',
    accent2: '#dc2626',
    mouthFill: '#e11d48',
  },
  'neon-night': {
    bg: '#090714',
    surface: '#151029',
    body: '#261b47',
    face: '#e2e8f0',
    ink: '#090714',
    text: '#f8fafc',
    muted: '#a78bfa',
    accent: '#22d3ee',
    accent2: '#f472b6',
    mouthFill: '#f43f5e',
  },
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(u) {
  const x = clamp01(u);
  return 1 - Math.pow(1 - x, 3);
}

/** Finds the active beat at time t (or falls back to the closest beat). */
export function activeBeatAt(beats, t) {
  if (!Array.isArray(beats) || !beats.length) {
    return null;
  }
  for (const beat of beats) {
    if (t >= beat.start && t < beat.end) {
      return beat;
    }
  }
  return t < beats[0].start ? beats[0] : beats[beats.length - 1];
}

/** Finds the active caption at time t. */
export function activeCaptionAt(captions, t) {
  if (!Array.isArray(captions)) {
    return null;
  }
  for (const cap of captions) {
    if (t >= cap.start && t < cap.end) {
      return cap;
    }
  }
  return null;
}

function recordText(boundsList, ctx, text, x, y, sizePx, align = 'left', critical = true) {
  const str = String(text ?? '');
  if (!str) {
    return;
  }
  const m = ctx.measureText(str);
  const w = m.width || str.length * sizePx * 0.55;
  let left = x;
  if (align === 'center') {
    left = x - w * 0.5;
  } else if (align === 'right') {
    left = x - w;
  }
  const ascent = m.actualBoundingBoxAscent || sizePx * 0.78;
  const descent = m.actualBoundingBoxDescent || sizePx * 0.22;
  boundsList.push({
    text: str,
    critical,
    left: Math.round(left),
    right: Math.round(left + w),
    top: Math.round(y - ascent),
    bottom: Math.round(y + descent),
  });
}

function drawBeatContent(ctx, beat, rect, t, palette, boundsList) {
  if (!beat) {
    return;
  }
  const u = easeOutCubic((t - beat.start) / 0.35);
  const slideY = (1 - u) * 18;
  const content = beat.content || {};
  const title = content.title || content.text || beat.id;
  const sub = content.subtitle || '';
  const items = Array.isArray(content.items) ? content.items : [];

  ctx.save();
  ctx.globalAlpha = 0.2 + 0.8 * u;
  // Content card plate
  ctx.fillStyle = palette.surface;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y + slideY, rect.width, rect.height, 20);
  ctx.fill();
  ctx.stroke();

  const innerX = rect.x + 44;
  let cursorY = rect.y + slideY + 78;

  if (content.kicker) {
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'left';
    ctx.fillText(String(content.kicker).toUpperCase(), innerX, cursorY);
    recordText(boundsList, ctx, content.kicker, innerX, cursorY, 24, 'left', true);
    cursorY += 48;
  }

  ctx.font = '700 46px Arial, sans-serif';
  ctx.fillStyle = palette.text;
  ctx.textAlign = 'left';
  ctx.fillText(String(title), innerX, cursorY);
  recordText(boundsList, ctx, title, innerX, cursorY, 46, 'left', true);
  cursorY += 52;

  if (sub) {
    ctx.font = '400 28px Arial, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText(String(sub), innerX, cursorY);
    recordText(boundsList, ctx, sub, innerX, cursorY, 28, 'left', false);
    cursorY += 54;
  }

  if (beat.type === 'list' || beat.type === 'flow' || items.length > 0) {
    items.forEach((item, idx) => {
      const itemDelay = beat.start + 0.25 + idx * 0.35;
      const iu = easeOutCubic((t - itemDelay) / 0.3);
      if (iu <= 0.02) {
        return;
      }
      const iy = cursorY + idx * 62 + (1 - iu) * 12;
      ctx.save();
      ctx.globalAlpha = iu;
      ctx.fillStyle = palette.accent2;
      ctx.beginPath();
      ctx.arc(innerX + 14, iy - 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '700 32px Arial, sans-serif';
      ctx.fillStyle = palette.text;
      const label = typeof item === 'string' ? item : item.text || '';
      ctx.fillText(label, innerX + 38, iy);
      recordText(boundsList, ctx, label, innerX + 38, iy, 32, 'left', true);
      ctx.restore();
    });
  } else if (beat.type === 'code' && Array.isArray(content.lines)) {
    ctx.font = '400 26px Courier, monospace';
    content.lines.forEach((line, idx) => {
      const ly = cursorY + idx * 42;
      ctx.fillStyle = idx === content.highlight ? palette.accent : palette.text;
      ctx.fillText(String(line), innerX, ly);
      recordText(boundsList, ctx, line, innerX, ly, 26, 'left', true);
    });
  }
  ctx.restore();
}

function drawCaptionBar(ctx, caption, width, height, palette, boundsList) {
  if (!caption || !caption.text) {
    return;
  }
  const isVertical = height > width;
  const fontSize = isVertical ? 36 : 38;
  ctx.save();
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  const text = String(caption.text);
  const measuredW = ctx.measureText(text).width;
  const boxW = Math.min(width - 160, Math.max(360, measuredW + 64));
  const boxH = fontSize + 34;
  const boxX = Math.round((width - boxW) * 0.5);
  const boxY = height - (isVertical ? 280 : 128);

  ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const textY = boxY + Math.round(boxH * 0.68);
  ctx.fillText(text, Math.round(width * 0.5), textY);
  recordText(boundsList, ctx, text, Math.round(width * 0.5), textY, fontSize, 'center', true);
  ctx.restore();
}

/** Creates an isolated stage instance for a tile, live preview, or capture export. */
export function createStage({ canvas, bundle, assets = {} }) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('createStage requires a Canvas element');
  }
  if (!bundle || typeof bundle.duration !== 'number') {
    throw new Error('createStage requires a valid bundle object');
  }
  const ctx = canvas.getContext('2d');
  let disposed = false;
  let lastBounds = [];

  const resolvedLook = bundle.look?.resolved || {};
  const paletteKey = resolvedLook.palette || 'studio-dark';
  const palette = {
    ...(DEFAULT_PALETTES[paletteKey] || DEFAULT_PALETTES['studio-dark']),
    ...(resolvedLook.colors || {}),
  };
  const hostVariant = resolvedLook.hostVariant || resolvedLook.host || 'geometric-bot';
  const showHost = resolvedLook.showHost !== false;

  const ready = Promise.resolve(assets.ready || null);

  function renderFrame(t) {
    if (disposed) {
      throw new Error('stage instance is disposed');
    }
    const time = Math.max(0, Math.min(bundle.duration, Number(t) || 0));
    const width = canvas.width;
    const height = canvas.height;
    lastBounds = [];

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle deterministic grid ground
    ctx.strokeStyle = palette.surface;
    ctx.lineWidth = 1;
    const step = 64;
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const beat = activeBeatAt(bundle.beats, time);
    const hostState = resolveHostState(bundle.beats, time, resolvedLook);
    const hasCaptions = Array.isArray(bundle.captions) && bundle.captions.length > 0;
    const layout = computeContentRect(width, height, hostState.side, hasCaptions);

    if (typeof assets.customDraw === 'function' && beat?.type === 'custom') {
      assets.customDraw(ctx, { t: time, beat, layout, palette, boundsList: lastBounds });
    } else {
      drawBeatContent(ctx, beat, layout, time, palette, lastBounds);
    }

    if (showHost) {
      drawHost(ctx, {
        variant: hostVariant,
        box: layout.hostBox,
        t: time,
        mouth: bundle.mouth,
        mood: hostState.mood,
        pose: hostState.pose,
        side: hostState.side,
        dissolve: hostState.dissolve,
        palette,
        seed: `${bundle.look?.id || 'stage'}:${hostVariant}`,
      });
    }

    const cap = activeCaptionAt(bundle.captions, time);
    drawCaptionBar(ctx, cap, width, height, palette, lastBounds);
    ctx.restore();
    return lastBounds;
  }

  function dispose() {
    disposed = true;
    lastBounds = [];
  }

  return {
    ready,
    renderFrame,
    dispose,
    textBounds: () => lastBounds.slice(),
  };
}

if (typeof window !== 'undefined') {
  window.VBC_STAGE = {
    createStage,
    activeBeatAt,
    activeCaptionAt,
  };
}
