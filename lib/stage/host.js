// Host presenter coordinator ("One Host"): computes open-stage layout (35-45% of
// frame height, no webcam box by default), mouth shapes, seeded blinks, pose/side
// transitions, and pixel dissolve, then dispatches to the active host layer plugin.
(function (root) {
  'use strict';

  const HOST_MOODS = ['neutral', 'excited', 'focused', 'skeptical', 'warm'];
  const HOST_POSES = ['idle', 'present', 'point'];
  const MOUTH_SHAPES = ['c', 'm', 'a', 'o', 'e'];

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

  /** Lists all host layer ids currently registered in VBC_PLUGINS. */
  function registeredHosts() {
    const plugins = root.VBC_PLUGINS || {};
    const names = [];
    for (const [key, plugin] of Object.entries(plugins)) {
      const isHostLayer =
        plugin?.slot === 'host' ||
        (key.startsWith('layer/host-') && typeof plugin?.draw === 'function');
      if (isHostLayer) {
        const rawId = plugin.id || key.replace(/^layer\//, '');
        const shortId = rawId.startsWith('host-') ? rawId.slice(5) : rawId;
        names.push(shortId);
      }
    }
    return [...new Set(names)].sort();
  }

  /** Resolves a host plugin by id or throws an error listing all registered hosts. */
  function resolveHostPlugin(variant) {
    const id = String(variant ?? '').trim();
    const plugins = root.VBC_PLUGINS || {};
    if (id) {
      const key = id.startsWith('host-') ? `layer/${id}` : `layer/host-${id}`;
      const plugin = plugins[key] || plugins[`layer/${id}`];
      if (plugin && typeof plugin.draw === 'function') {
        return plugin;
      }
    }
    const available = registeredHosts();
    const listStr = available.length ? available.join(', ') : 'none';
    throw new Error(`unknown host "${id || '(missing)'}" (registered hosts: ${listStr})`);
  }

  /** Computes the content region and open-stage host box (38-42% of frame height). */
  function computeContentRect(width, height, hostSide = 'left', hasCaptions = true, options = {}) {
    const isVertical = height > width;
    const showHost = options.showHost !== false;
    const padLeft = isVertical ? Math.max(84, Math.round(width * 0.08)) : 64;
    const padRight = isVertical ? Math.max(124, Math.round(width * 0.115)) : 64;
    const topY = isVertical ? Math.max(194, Math.round(height * 0.102)) : 64;
    const bottomMargin = hasCaptions
      ? isVertical
        ? Math.max(360, Math.round(height * 0.19))
        : 136
      : isVertical
        ? 284
        : 64;
    const availH = height - topY - bottomMargin;
    const hostH = Math.round(height * (isVertical ? 0.37 : 0.42));
    const hostW = isVertical ? Math.round(width * 0.44) : Math.round(width * 0.24);

    if (isVertical) {
      const contentH = showHost ? Math.max(360, availH - hostH - 16) : availH;
      return {
        x: padLeft,
        y: topY,
        width: width - padLeft - padRight,
        height: contentH,
        hostBox: {
          x: hostSide === 'right' ? width - padRight - hostW : padLeft,
          y: topY + availH - hostH,
          width: hostW,
          height: hostH,
        },
      };
    }

    const gap = Math.round(width * 0.025);
    const hostX = hostSide === 'right' ? width - padRight - hostW : padLeft;
    if (!showHost || options.composition === 'center-stage') {
      return {
        x: padLeft,
        y: topY,
        width: width - padLeft - padRight,
        height: availH,
        hostBox: {
          x: hostX,
          y: topY + availH - hostH,
          width: hostW,
          height: hostH,
        },
      };
    }
    const contentW = width - padLeft - padRight - hostW - gap;
    const contentX = hostSide === 'right' ? padLeft : padLeft + hostW + gap;
    return {
      x: contentX,
      y: topY,
      width: contentW,
      height: availH,
      hostBox: {
        x: hostX,
        y: topY + availH - hostH,
        width: hostW,
        height: hostH,
      },
    };
  }

  /** Samples the active mouth shape ('c'|'m'|'a'|'o'|'e') and voice level at time t. */
  function sampleMouth(mouth, t) {
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
  function isBlinking(t, seed = 'host') {
    const windowIdx = Math.floor(t / 2.6);
    const offset = 0.4 + seededUnit(`${seed}:blink:${windowIdx}`) * 1.8;
    const blinkStart = windowIdx * 2.6 + offset;
    const blinkDur = 0.11;
    return t >= blinkStart && t <= blinkStart + blinkDur;
  }

  /** Resolves host pose, side, mood, and pixel-dissolve progress at time t from beats. */
  function resolveHostState(beats, t, options = {}) {
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
      pose = dt < 2.6 ? explicitPose : 'idle';
    } else if (dt < 2.4 && cur.type !== 'host') {
      pose = activeIdx % 2 === 0 ? 'present' : 'point';
    }
    const moodRaw = cur.content?.mood || options.mood || 'neutral';
    const mood = HOST_MOODS.includes(moodRaw) ? moodRaw : 'neutral';

    let dissolve = 1;
    let drawSide = curSide;
    let outgoingDissolve = 0;
    const dissolveWindow = 0.54;
    if (prev && prevSide !== curSide && dt < dissolveWindow) {
      const u = dt / dissolveWindow;
      outgoingDissolve = 1 - u;
      dissolve = u;
      drawSide = u < 0.5 ? prevSide : curSide;
    }
    return {
      side: drawSide,
      prevSide,
      targetSide: curSide,
      pose,
      mood,
      dissolve,
      outgoingDissolve,
      beatIndex: activeIdx,
      beatElapsed: dt,
    };
  }

  function drawFramingOption(ctx, box, framing, palette) {
    if (!framing || framing === 'none') {
      return;
    }
    ctx.save();
    ctx.fillStyle = palette.surface || 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = palette.accent || '#38bdf8';
    ctx.lineWidth = 2.5;
    if (framing === 'badge') {
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.width, box.height, 24);
      ctx.fill();
      ctx.stroke();
    } else if (framing === 'pedestal') {
      ctx.beginPath();
      ctx.ellipse(
        box.x + box.width * 0.5,
        box.y + box.height - 14,
        box.width * 0.42,
        16,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Draws the host presenter by delegating to the registered host layer plugin. */
  function drawHost(ctx, params) {
    const {
      variant,
      box,
      t = 0,
      mouth = { shapes: 'c', fps: 12 },
      mood = 'neutral',
      pose = 'idle',
      side = 'left',
      dissolve = 1,
      framing = 'none',
      palette = {},
      seed = 'vbc-host',
    } = params || {};
    const plugin = resolveHostPlugin(variant);
    if (!box || dissolve <= 0.01) {
      return;
    }
    const dir = side === 'left' ? 1 : -1;
    const { shape, level } = sampleMouth(mouth, t);
    const blink = isBlinking(t, `${seed}:${variant}`);
    const scale = box.height / 440;

    ctx.save();
    if (dissolve < 0.999) {
      ctx.globalAlpha = Math.max(0, Math.min(1, dissolve));
      const cell = Math.max(6, Math.round(14 * scale));
      ctx.beginPath();
      const cols = Math.ceil(box.width / cell);
      const rows = Math.ceil(box.height / cell);
      const clipThreshold = Math.min(1, dissolve * 0.75 + 0.25);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const threshold = seededUnit(`dissolve:${r}:${c}:${variant}`);
          if (threshold <= clipThreshold) {
            ctx.rect(box.x + c * cell, box.y + r * cell, cell + 1, cell + 1);
          }
        }
      }
      ctx.clip();
    }

    drawFramingOption(ctx, box, framing, palette);

    plugin.draw(ctx, {
      box,
      t,
      shape,
      level,
      blink,
      mood,
      pose,
      side,
      dir,
      palette,
      seed,
    });
    ctx.restore();
  }

  root.VBC_HOST = {
    HOST_MOODS,
    HOST_POSES,
    MOUTH_SHAPES,
    registeredHosts,
    resolveHostPlugin,
    computeContentRect,
    sampleMouth,
    isBlinking,
    resolveHostState,
    drawHost,
  };
})(typeof window !== 'undefined' ? window : globalThis);
