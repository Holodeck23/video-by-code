// Code-drawn presenter ("One Host") with 4 distinct variants for Checkpoint 2.
// Pure function of absolute time t, bundle mouth track, beat state, and look palette.
// Works both as an ES module and as a browser script exposing window.VBC_HOST.

export const HOST_VARIANTS = ['pixel-sprite', 'geometric-bot', 'ink-mascot', 'cyber-bust'];
export const HOST_MOODS = ['neutral', 'excited', 'focused', 'skeptical', 'warm'];
export const HOST_POSES = ['idle', 'present', 'point'];
export const MOUTH_SHAPES = ['c', 'm', 'a', 'o', 'e'];

function hash32(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed) {
  let a = (hash32(seed) + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Computes the free content rectangle beside the host and above captions. */
export function computeContentRect(width, height, hostSide = 'left', hasCaptions = true) {
  const isVertical = height > width;
  const padX = isVertical ? Math.round(width * 0.08) : Math.round(width * 0.05);
  const topY = isVertical ? Math.round(height * 0.1) : Math.round(height * 0.09);
  const bottomMargin = hasCaptions
    ? Math.round(height * (isVertical ? 0.22 : 0.18))
    : Math.round(height * 0.08);
  const availH = height - topY - bottomMargin;
  if (isVertical) {
    const hostH = Math.round(availH * 0.34);
    return {
      x: padX,
      y: topY,
      width: width - padX * 2,
      height: availH - hostH - 24,
      hostBox: {
        x: hostSide === 'right' ? width - padX - 280 : padX,
        y: topY + availH - hostH,
        width: 280,
        height: hostH,
      },
    };
  }
  const hostW = Math.round(width * 0.24);
  const gap = Math.round(width * 0.03);
  const contentW = width - padX * 2 - hostW - gap;
  const hostX = hostSide === 'right' ? width - padX - hostW : padX;
  const contentX = hostSide === 'right' ? padX : padX + hostW + gap;
  return {
    x: contentX,
    y: topY,
    width: contentW,
    height: availH,
    hostBox: {
      x: hostX,
      y: topY + Math.round(availH * 0.08),
      width: hostW,
      height: Math.round(availH * 0.88),
    },
  };
}

/** Samples the active mouth shape ('c'|'m'|'a'|'o'|'e') and voice level at time t. */
export function sampleMouth(mouth, t) {
  if (!mouth || !mouth.shapes || t < 0) {
    return { shape: 'c', level: 0 };
  }
  const fps = mouth.fps || 12;
  const idx = Math.floor(t * fps);
  const raw = idx >= 0 && idx < mouth.shapes.length ? mouth.shapes[idx] : 'c';
  const shape = MOUTH_SHAPES.includes(raw) ? raw : 'c';
  let level = shape === 'c' ? 0 : shape === 'm' ? 0.35 : 0.8;
  if (Array.isArray(mouth.level) && mouth.level.length > 0) {
    const lfps = mouth.level_fps || 30;
    const lidx = Math.min(mouth.level.length - 1, Math.max(0, Math.floor(t * lfps)));
    level = Number(mouth.level[lidx]) || 0;
  }
  return { shape, level };
}

/** Deterministic blink state (true during a 3-4 frame blink every 2.2-5.4 seconds). */
export function isBlinking(t, seed = 'host') {
  const windowIdx = Math.floor(t / 2.6);
  const offset = 0.4 + seededUnit(`${seed}:blink:${windowIdx}`) * 1.8;
  const blinkStart = windowIdx * 2.6 + offset;
  const blinkDur = 0.11;
  return t >= blinkStart && t <= blinkStart + blinkDur;
}

/** Resolves host pose, side, mood, and pixel-dissolve progress at time t from beats. */
export function resolveHostState(beats, t, options = {}) {
  const list = Array.isArray(beats) ? beats : [];
  let activeIdx = 0;
  for (let i = 0; i < list.length; i++) {
    if (t >= list[i].start && t < list[i].end) {
      activeIdx = i;
      break;
    }
  }
  const cur = list[activeIdx] || { start: 0, end: 10, content: {} };
  const prev = activeIdx > 0 ? list[activeIdx - 1] : null;
  const curSide = cur.content?.side || (activeIdx % 2 === 0 ? 'left' : 'right');
  const defaultPrevSide = (activeIdx - 1) % 2 === 0 ? 'left' : 'right';
  const prevSide = prev ? prev.content?.side || defaultPrevSide : curSide;
  const dt = Math.max(0, t - cur.start);
  const explicitPose = cur.content?.pose;
  let pose = 'idle';
  if (explicitPose && HOST_POSES.includes(explicitPose)) {
    pose = dt < 2.2 ? explicitPose : 'idle';
  } else if (dt < 2.0 && cur.type !== 'host') {
    pose = activeIdx % 2 === 0 ? 'present' : 'point';
  }
  const moodRaw = cur.content?.mood || options.mood || 'neutral';
  const mood = HOST_MOODS.includes(moodRaw) ? moodRaw : 'neutral';

  let dissolve = 1;
  let drawSide = curSide;
  const dissolveWindow = 0.36;
  if (prev && prevSide !== curSide && dt < dissolveWindow) {
    const u = dt / dissolveWindow;
    if (u < 0.5) {
      drawSide = prevSide;
      dissolve = 1 - u * 2;
    } else {
      drawSide = curSide;
      dissolve = (u - 0.5) * 2;
    }
  }
  return {
    side: drawSide,
    targetSide: curSide,
    pose,
    mood,
    dissolve,
    beatIndex: activeIdx,
    beatElapsed: dt,
  };
}

function drawMouthPrimitive(ctx, cx, cy, scale, shape, colors, style) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = colors.ink;
  ctx.fillStyle = colors.mouthFill || colors.accent;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (style === 'pixel') {
    const p = Math.max(2, Math.round(4 * scale));
    const fillPix = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(gx * p), Math.round(gy * p), Math.round(gw * p), Math.round(gh * p));
    };
    if (shape === 'c') {
      fillPix(-4, 0, 8, 1, colors.ink);
    } else if (shape === 'm') {
      fillPix(-4, -1, 8, 3, colors.ink);
      fillPix(-3, 0, 6, 1, colors.accent);
    } else if (shape === 'a') {
      fillPix(-4, -2, 8, 6, colors.ink);
      fillPix(-3, -1, 6, 4, colors.accent2);
      fillPix(-3, -2, 6, 1, '#ffffff');
    } else if (shape === 'o') {
      fillPix(-2, -2, 5, 5, colors.ink);
      fillPix(-1, -1, 3, 3, colors.accent);
    } else {
      fillPix(-5, -1, 10, 4, colors.ink);
      fillPix(-4, 0, 8, 2, '#ffffff');
    }
    ctx.restore();
    return;
  }

  if (shape === 'c') {
    ctx.beginPath();
    ctx.moveTo(-16 * scale, 0);
    ctx.quadraticCurveTo(0, 3 * scale, 16 * scale, 0);
    ctx.stroke();
  } else if (shape === 'm') {
    ctx.beginPath();
    ctx.roundRect(-16 * scale, -5 * scale, 32 * scale, 10 * scale, 5 * scale);
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'a') {
    ctx.beginPath();
    ctx.moveTo(-18 * scale, -6 * scale);
    ctx.lineTo(18 * scale, -6 * scale);
    ctx.quadraticCurveTo(16 * scale, 16 * scale, 0, 16 * scale);
    ctx.quadraticCurveTo(-16 * scale, 16 * scale, -18 * scale, -6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'o') {
    ctx.beginPath();
    ctx.ellipse(0, 2 * scale, 10 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.roundRect(-22 * scale, -6 * scale, 44 * scale, 13 * scale, 6 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18 * scale, 0);
    ctx.lineTo(18 * scale, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function browTiltForMood(mood) {
  if (mood === 'excited') return -0.18;
  if (mood === 'focused') return 0.22;
  if (mood === 'skeptical') return 0.3;
  if (mood === 'warm') return -0.1;
  return 0;
}

function drawEyesAndBrows(ctx, cx, cy, scale, blink, mood, dir, colors, isPixel) {
  const sep = 26 * scale;
  const gaze = dir * 4 * scale;
  const tilt = browTiltForMood(mood);
  for (const side of [-1, 1]) {
    const ex = cx + side * sep + gaze;
    const ey = cy;
    ctx.save();
    ctx.translate(ex, ey);
    if (isPixel) {
      const p = Math.max(2, Math.round(4 * scale));
      ctx.fillStyle = colors.ink;
      if (blink) {
        ctx.fillRect(-2 * p, 0, 4 * p, p);
      } else {
        ctx.fillRect(-2 * p, -2 * p, 4 * p, 4 * p);
        ctx.fillStyle = colors.eyeHighlight || '#ffffff';
        ctx.fillRect((dir >= 0 ? 0 : -1) * p, -1 * p, p, p);
      }
      ctx.fillStyle = colors.accent;
      const by = Math.round((-4 + side * tilt * 4) * p);
      ctx.fillRect(-2 * p, by, 4 * p, p);
    } else {
      ctx.strokeStyle = colors.ink;
      ctx.fillStyle = colors.ink;
      ctx.lineWidth = Math.max(2, 3 * scale);
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(-10 * scale, 0);
        ctx.lineTo(10 * scale, 0);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.eyeHighlight || '#ffffff';
        ctx.beginPath();
        ctx.arc(2.5 * scale * dir, -3 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      const browAngle = mood === 'skeptical' && side === -1 ? -0.25 : side * tilt;
      ctx.rotate(browAngle);
      ctx.strokeStyle = colors.ink;
      ctx.beginPath();
      ctx.moveTo(-11 * scale, -16 * scale);
      ctx.lineTo(11 * scale, -16 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGestureArm(ctx, shoulderX, shoulderY, scale, dir, pose, t, colors, variant) {
  const bob = Math.sin(t * 3.2) * 4 * scale;
  let wristX = shoulderX + dir * 24 * scale;
  let wristY = shoulderY + 62 * scale + bob;
  if (pose === 'present') {
    wristX = shoulderX + dir * 74 * scale;
    wristY = shoulderY + 12 * scale + bob * 0.6;
  } else if (pose === 'point') {
    wristX = shoulderX + dir * 92 * scale;
    wristY = shoulderY - 18 * scale + Math.sin(t * 6) * 2 * scale;
  }
  const elbowX = (shoulderX + wristX) * 0.5 - dir * 10 * scale;
  const elbowY = (shoulderY + wristY) * 0.5 + 18 * scale;

  ctx.save();
  ctx.strokeStyle = variant === 'cyber-bust' ? colors.accent : colors.ink;
  ctx.lineWidth = Math.max(3, (variant === 'pixel-sprite' ? 10 : 7) * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.quadraticCurveTo(elbowX, elbowY, wristX, wristY);
  ctx.stroke();

  ctx.fillStyle = colors.accent;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = Math.max(2, 2.5 * scale);
  ctx.beginPath();
  ctx.arc(wristX, wristY, 10 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (pose === 'point' || pose === 'present') {
    const tipX = wristX + dir * (pose === 'point' ? 24 : 16) * scale;
    const tipY = wristY + (pose === 'point' ? -6 : -10) * scale;
    ctx.beginPath();
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    if (pose === 'point') {
      ctx.fillStyle = colors.accent2;
      ctx.beginPath();
      ctx.arc(tipX + dir * 6 * scale, tipY - 2 * scale, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draws the host presenter inside hostBox using the selected variant and state. */
export function drawHost(ctx, params) {
  const {
    variant = 'geometric-bot',
    box,
    t = 0,
    mouth = { shapes: 'c', fps: 12 },
    mood = 'neutral',
    pose = 'idle',
    side = 'left',
    dissolve = 1,
    palette = {},
    seed = 'vbc-host',
  } = params;
  if (!box || dissolve <= 0.01) {
    return;
  }
  const colors = {
    bg: palette.surface || '#182032',
    body: palette.body || '#24324d',
    face: palette.face || '#f5efe6',
    ink: palette.ink || '#111622',
    accent: palette.accent || '#38bdf8',
    accent2: palette.accent2 || '#f43f5e',
    mouthFill: palette.mouthFill || '#fb7185',
    eyeHighlight: '#ffffff',
  };
  const scale = Math.min(box.width / 260, box.height / 340);
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.48 + Math.sin(t * 2.4) * 4 * scale;
  const dir = side === 'left' ? 1 : -1;
  const { shape, level } = sampleMouth(mouth, t);
  const blink = isBlinking(t, `${seed}:${variant}`);

  ctx.save();
  if (dissolve < 0.999) {
    const cell = Math.max(8, Math.round(18 * scale));
    ctx.beginPath();
    const cols = Math.ceil(box.width / cell);
    const rows = Math.ceil(box.height / cell);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const threshold = seededUnit(`dissolve:${r}:${c}:${variant}`);
        if (threshold <= dissolve) {
          ctx.rect(box.x + c * cell, box.y + r * cell, cell + 1, cell + 1);
        }
      }
    }
    ctx.clip();
  }

  // Backdrop pedestal / badge
  ctx.fillStyle = colors.bg;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath();
  ctx.roundRect(
    cx - 108 * scale,
    cy - 135 * scale,
    216 * scale,
    270 * scale,
    variant === 'pixel-sprite' ? 4 * scale : 24 * scale
  );
  ctx.fill();
  ctx.stroke();

  // Voice level aura ring
  if (level > 0.05) {
    ctx.save();
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = Math.min(0.75, level * 0.65);
    ctx.lineWidth = (2 + level * 6) * scale;
    ctx.beginPath();
    ctx.arc(cx, cy - 18 * scale, (78 + level * 14) * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (variant === 'pixel-sprite') {
    const p = Math.max(3, Math.round(5 * scale));
    ctx.fillStyle = colors.body;
    ctx.fillRect(cx - 11 * p, cy + 6 * p, 22 * p, 14 * p);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(cx - 13 * p, cy - 12 * p, 26 * p, 4 * p);
    ctx.fillRect(cx - 14 * p, cy - 8 * p, 3 * p, 9 * p);
    ctx.fillRect(cx + 11 * p, cy - 8 * p, 3 * p, 9 * p);
    ctx.fillStyle = colors.face;
    ctx.fillRect(cx - 11 * p, cy - 10 * p, 22 * p, 16 * p);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(2, 2 * scale);
    ctx.strokeRect(cx - 11 * p, cy - 10 * p, 22 * p, 16 * p);
    drawEyesAndBrows(ctx, cx, cy - 18 * scale, scale, blink, mood, dir, colors, true);
    drawMouthPrimitive(ctx, cx, cy + 12 * scale, scale, shape, colors, 'pixel');
  } else if (variant === 'geometric-bot') {
    ctx.fillStyle = colors.body;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(2, 3.5 * scale);
    ctx.beginPath();
    ctx.roundRect(cx - 64 * scale, cy + 36 * scale, 128 * scale, 76 * scale, 18 * scale);
    ctx.fill();
    ctx.stroke();
    // Antenna
    ctx.beginPath();
    ctx.moveTo(cx, cy - 86 * scale);
    ctx.lineTo(cx, cy - 112 * scale);
    ctx.stroke();
    ctx.fillStyle = level > 0.2 ? colors.accent2 : colors.accent;
    ctx.beginPath();
    ctx.arc(cx, cy - 116 * scale, (7 + level * 4) * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Monitor head
    ctx.fillStyle = colors.face;
    ctx.beginPath();
    ctx.roundRect(cx - 68 * scale, cy - 84 * scale, 136 * scale, 108 * scale, 22 * scale);
    ctx.fill();
    ctx.stroke();
    drawEyesAndBrows(ctx, cx, cy - 36 * scale, scale, blink, mood, dir, colors, false);
    drawMouthPrimitive(ctx, cx, cy + 2 * scale, scale, shape, colors, 'vector');
  } else if (variant === 'ink-mascot') {
    const boil = Math.floor(t * 8) % 3;
    const jx = (boil - 1) * 1.2 * scale;
    const jy = ((boil + 1) % 3 - 1) * 1.2 * scale;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(3, 5 * scale);
    // Sticker halo + torso
    ctx.beginPath();
    ctx.roundRect(cx - 58 * scale + jx, cy + 32 * scale + jy, 116 * scale, 82 * scale, 24 * scale);
    ctx.fillStyle = colors.body;
    ctx.fill();
    ctx.stroke();
    // Head
    ctx.fillStyle = colors.face;
    ctx.beginPath();
    ctx.ellipse(cx + jx, cy - 26 * scale + jy, 64 * scale, 58 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Editorial glasses
    ctx.strokeStyle = colors.accent2;
    ctx.lineWidth = Math.max(2, 3.2 * scale);
    ctx.strokeRect(cx - 44 * scale + jx, cy - 48 * scale + jy, 34 * scale, 24 * scale);
    ctx.strokeRect(cx + 10 * scale + jx, cy - 48 * scale + jy, 34 * scale, 24 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 10 * scale + jx, cy - 36 * scale + jy);
    ctx.lineTo(cx + 10 * scale + jx, cy - 36 * scale + jy);
    ctx.stroke();
    drawEyesAndBrows(ctx, cx + jx, cy - 36 * scale + jy, scale, blink, mood, dir, colors, false);
    drawMouthPrimitive(ctx, cx + jx, cy + 6 * scale + jy, scale, shape, colors, 'ink');
  } else {
    // cyber-bust: faceted wire-glass hologram presenter
    ctx.fillStyle = colors.body;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = Math.max(2, 2.5 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 72 * scale, cy + 108 * scale);
    ctx.lineTo(cx - 54 * scale, cy + 34 * scale);
    ctx.lineTo(cx + 54 * scale, cy + 34 * scale);
    ctx.lineTo(cx + 72 * scale, cy + 108 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.face;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 92 * scale);
    ctx.lineTo(cx + 62 * scale, cy - 52 * scale);
    ctx.lineTo(cx + 52 * scale, cy + 18 * scale);
    ctx.lineTo(cx, cy + 36 * scale);
    ctx.lineTo(cx - 52 * scale, cy + 18 * scale);
    ctx.lineTo(cx - 62 * scale, cy - 52 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawEyesAndBrows(ctx, cx, cy - 34 * scale, scale, blink, mood, dir, colors, false);
    drawMouthPrimitive(ctx, cx, cy + 6 * scale, scale, shape, colors, 'cyber');
  }

  drawGestureArm(
    ctx,
    cx + dir * 48 * scale,
    cy + 48 * scale,
    scale,
    dir,
    pose,
    t,
    colors,
    variant
  );
  ctx.restore();
}

if (typeof window !== 'undefined') {
  window.VBC_HOST = {
    HOST_VARIANTS,
    HOST_MOODS,
    HOST_POSES,
    MOUTH_SHAPES,
    computeContentRect,
    sampleMouth,
    isBlinking,
    resolveHostState,
    drawHost,
  };
}
