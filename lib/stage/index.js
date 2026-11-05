// Stage Core ("One Engine"): renders any frame from a validated bundle.json
// as a pure, synchronous function of time t. Supports multi-tile isolation,
// dynamic beat/layer plugins, and >=56px titles / >=34px body text at 1080p.
(function (root) {
  'use strict';

  const {
    computeContentRect,
    resolveHostState,
    drawHost,
  } = root.VBC_HOST;

  const DEFAULT_PALETTES = {
    'studio-dark': {
      bg: '#0b101e',
      surface: '#131c31',
      cardBg: 'rgba(19, 28, 49, 0.92)',
      body: '#233252',
      face: '#f4efe6',
      ink: '#0f172a',
      text: '#f8fafc',
      muted: '#94a3b8',
      accent: '#38bdf8',
      accent2: '#f43f5e',
      good: '#34d399',
      mouthFill: '#fb7185',
    },
    'warm-editorial': {
      bg: '#f4efe4',
      surface: '#e6decb',
      cardBg: 'rgba(238, 231, 215, 0.94)',
      body: '#2b3a4a',
      face: '#fffdf9',
      ink: '#1c1917',
      text: '#1c1917',
      muted: '#57534e',
      accent: '#d97706',
      accent2: '#e11d48',
      good: '#059669',
      mouthFill: '#e11d48',
    },
    'neon-night': {
      bg: '#090714',
      surface: '#151029',
      cardBg: 'rgba(21, 16, 41, 0.92)',
      body: '#261b47',
      face: '#e2e8f0',
      ink: '#090714',
      text: '#f8fafc',
      muted: '#a78bfa',
      accent: '#22d3ee',
      accent2: '#f472b6',
      good: '#34d399',
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
  function activeBeatAt(beats, t) {
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
  function activeCaptionAt(captions, t) {
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
    const w = m.width || str.length * sizePx * 0.52;
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
      fontSize: sizePx,
      role: sizePx >= 56 ? 'title' : 'body',
      left: Math.round(left),
      right: Math.round(left + w),
      top: Math.round(y - ascent),
      bottom: Math.round(y + descent),
    });
  }

  function drawLanesDiagram(ctx, lanes, x, y, width, availH, t, beatStart, palette, boundsList) {
    const rowH = Math.min(132, Math.floor((availH - 16) / Math.max(1, lanes.length)));
    lanes.forEach((lane, idx) => {
      const iu = easeOutCubic((t - (beatStart + 0.18 + idx * 0.22)) / 0.35);
      if (iu <= 0.02) {
        return;
      }
      const ry = y + idx * (rowH + 14);
      const isBlocked = lane.state === 'blocked' || lane.state === 'loss';
      const fastCol = lane.state === 'fast' ? palette.good : palette.accent;
      const barCol = isBlocked ? palette.accent2 : fastCol;
      const frac = Math.max(0.12, Math.min(1, Number(lane.progress ?? 0.85) * iu));

      ctx.save();
      ctx.globalAlpha = iu;
      ctx.fillStyle = palette.bg;
      ctx.strokeStyle = barCol;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, ry, width, rowH, 16);
      ctx.fill();
      ctx.stroke();

      // Animated progress fill inside lane
      ctx.fillStyle = barCol;
      ctx.globalAlpha = iu * 0.22;
      ctx.beginPath();
      ctx.roundRect(x + 4, ry + 4, Math.max(24, (width - 8) * frac), rowH - 8, 12);
      ctx.fill();
      ctx.globalAlpha = iu;

      ctx.font = '700 36px Arial, sans-serif';
      ctx.fillStyle = palette.text;
      ctx.textAlign = 'left';
      const labelY = ry + Math.round(rowH * 0.46);
      ctx.fillText(String(lane.label), x + 28, labelY);
      recordText(boundsList, ctx, lane.label, x + 28, labelY, 36, 'left', true);

      if (lane.metric) {
        ctx.font = '700 36px Arial, sans-serif';
        ctx.fillStyle = barCol;
        ctx.textAlign = 'right';
        ctx.fillText(String(lane.metric), x + width - 28, labelY);
        recordText(boundsList, ctx, lane.metric, x + width - 28, labelY, 36, 'right', true);
      }

      if (lane.detail) {
        ctx.font = '400 34px Arial, sans-serif';
        ctx.fillStyle = palette.muted;
        ctx.textAlign = 'left';
        const detY = ry + Math.round(rowH * 0.84);
        ctx.fillText(String(lane.detail), x + 28, detY);
        recordText(boundsList, ctx, lane.detail, x + 28, detY, 34, 'left', false);
      }
      ctx.restore();
    });
  }

  function drawBeatContent(ctx, beat, rect, t, palette, boundsList, isLastBeat = false) {
    if (!beat) {
      return;
    }
    const enterU = easeOutCubic((t - beat.start) / 0.42);
    const exitU = isLastBeat ? 1 : easeOutCubic((beat.end - t) / 0.28);
    const u = Math.min(enterU, exitU);
    if (u <= 0.01) {
      return;
    }
    const plugin = root.VBC_PLUGINS?.[`beat/${beat.type}`];
    if (plugin && typeof plugin.draw === 'function') {
      ctx.save();
      ctx.globalAlpha = u;
      plugin.draw(ctx, {
        beat,
        rect,
        t,
        u,
        palette,
        boundsList,
        recordText: (txt, x, y, sz, align, crit) =>
          recordText(boundsList, ctx, txt, x, y, sz, align, crit),
      });
      ctx.restore();
      return;
    }

    const slideY = (1 - enterU) * 14;
    const content = beat.content || {};
    const title = content.title || content.text || beat.id;
    const sub = content.subtitle || '';
    const items = Array.isArray(content.items) ? content.items : [];
    const lanes = Array.isArray(content.lanes) ? content.lanes : [];

    ctx.save();
    ctx.globalAlpha = u;
    ctx.fillStyle = palette.cardBg || palette.surface;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y + slideY, rect.width, rect.height, 24);
    ctx.fill();
    ctx.stroke();

    const innerX = rect.x + 44;
    const innerW = rect.width - 88;
    let cursorY = rect.y + slideY + 64;

    if (content.kicker) {
      ctx.font = '700 34px Arial, sans-serif';
      ctx.fillStyle = palette.accent;
      ctx.textAlign = 'left';
      const kickerStr = String(content.kicker).toUpperCase();
      ctx.fillText(kickerStr, innerX, cursorY);
      recordText(boundsList, ctx, kickerStr, innerX, cursorY, 34, 'left', false);
      cursorY += 68;
    } else {
      cursorY += 18;
    }

    // Title >= 56px at 1080p (default 60px bold)
    const titleSize = 60;
    ctx.font = `700 ${titleSize}px Arial, sans-serif`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'left';
    ctx.fillText(String(title), innerX, cursorY);
    recordText(boundsList, ctx, title, innerX, cursorY, titleSize, 'left', true);
    cursorY += 56;

    if (sub) {
      ctx.font = '400 36px Arial, sans-serif';
      ctx.fillStyle = palette.muted;
      ctx.fillText(String(sub), innerX, cursorY);
      recordText(boundsList, ctx, sub, innerX, cursorY, 36, 'left', false);
      cursorY += 44;
    }

    const remainH = rect.y + rect.height - cursorY - 32;
    if (lanes.length > 0) {
      drawLanesDiagram(
        ctx,
        lanes,
        innerX,
        cursorY,
        innerW,
        remainH,
        t,
        beat.start,
        palette,
        boundsList
      );
    } else if (items.length > 0) {
      const cardH = Math.min(118, Math.floor((remainH - 16) / items.length));
      items.forEach((item, idx) => {
        const itemDelay = beat.start + 0.2 + idx * 0.26;
        const iu = easeOutCubic((t - itemDelay) / 0.3);
        if (iu <= 0.02) {
          return;
        }
        const iy = cursorY + idx * (cardH + 14);
        ctx.save();
        ctx.globalAlpha = u * iu;
        ctx.fillStyle = palette.bg;
        ctx.strokeStyle = idx === 0 ? palette.accent : palette.accent2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(innerX, iy, innerW, cardH, 14);
        ctx.fill();
        ctx.stroke();

        const label = typeof item === 'string' ? item : item.text || '';
        const badge = typeof item === 'object' && item.badge ? item.badge : `0${idx + 1}`;
        ctx.font = '700 34px Courier, monospace';
        ctx.fillStyle = palette.accent;
        const textBaseY = iy + Math.round(cardH * 0.62);
        ctx.fillText(badge, innerX + 24, textBaseY);

        ctx.font = '700 38px Arial, sans-serif';
        ctx.fillStyle = palette.text;
        ctx.fillText(label, innerX + 112, textBaseY);
        recordText(boundsList, ctx, label, innerX + 112, textBaseY, 38, 'left', true);

        if (typeof item === 'object' && item.value) {
          ctx.font = '700 38px Arial, sans-serif';
          ctx.fillStyle = palette.good || palette.accent;
          ctx.textAlign = 'right';
          const valX = innerX + innerW - 28;
          ctx.fillText(String(item.value), valX, textBaseY);
          recordText(boundsList, ctx, item.value, valX, textBaseY, 38, 'right', true);
        }
        ctx.restore();
      });
    }
    ctx.restore();
  }

  function drawCaptionBar(ctx, caption, t, width, height, palette, boundsList) {
    if (!caption || !caption.text) {
      return;
    }
    const enterAlpha = clamp01((t - caption.start) / 0.24);
    const exitAlpha = clamp01((caption.end - t) / 0.24);
    const alpha = Math.min(enterAlpha, exitAlpha);
    if (alpha <= 0.01) {
      return;
    }
    const isVertical = height > width;
    const fontSize = isVertical ? 36 : 36;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    const text = String(caption.text);
    const measuredW = ctx.measureText(text).width;
    const boxW = Math.min(width - 140, Math.max(420, measuredW + 64));
    const boxH = fontSize + 34;
    const boxX = Math.round((width - boxW) * 0.5);
    const boxY = height - (isVertical ? 260 : 120);

    ctx.fillStyle = palette.surface;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';
    const textY = boxY + Math.round(boxH * 0.68);
    ctx.fillText(text, Math.round(width * 0.5), textY);
    recordText(boundsList, ctx, text, Math.round(width * 0.5), textY, fontSize, 'center', true);
    ctx.restore();
  }

  /** Creates an isolated stage instance for a tile, live preview, or capture export. */
  function createStage({ canvas, bundle, assets = {} }) {
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
    const hostFraming = resolvedLook.hostFraming || 'none';
    const marksLayerId = resolvedLook.marks || null;
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

      // Subtle architectural grid lines
      ctx.strokeStyle = palette.surface;
      ctx.lineWidth = 1;
      const step = 72;
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

      if (marksLayerId) {
        const marksPlugin = root.VBC_PLUGINS?.[`layer/${marksLayerId}`];
        if (marksPlugin && typeof marksPlugin.draw === 'function') {
          marksPlugin.draw(ctx, { width, height, t: time, palette });
        }
      }

      const beat = activeBeatAt(bundle.beats, time);
      const hostState = resolveHostState(bundle.beats, time, resolvedLook);
      const hasCaptions = Array.isArray(bundle.captions) && bundle.captions.length > 0;
      const layout = computeContentRect(width, height, hostState.targetSide, hasCaptions);
      const isLastBeat =
        Array.isArray(bundle.beats) &&
        bundle.beats.length > 0 &&
        beat === bundle.beats[bundle.beats.length - 1];

      if (typeof assets.customDraw === 'function' && beat?.type === 'custom') {
        assets.customDraw(ctx, { t: time, beat, layout, palette, boundsList: lastBounds });
      } else {
        drawBeatContent(ctx, beat, layout, time, palette, lastBounds, isLastBeat);
      }

      if (showHost) {
        if (hostState.outgoingDissolve > 0.01) {
          const prevLayout = computeContentRect(width, height, hostState.prevSide, hasCaptions);
          drawHost(ctx, {
            variant: hostVariant,
            box: prevLayout.hostBox,
            t: time,
            mouth: bundle.mouth,
            mood: hostState.mood,
            pose: 'idle',
            side: hostState.prevSide,
            dissolve: hostState.outgoingDissolve,
            framing: hostFraming,
            palette,
            seed: `${bundle.look?.id || 'stage'}:${hostVariant}`,
          });
        }
        drawHost(ctx, {
          variant: hostVariant,
          box: layout.hostBox,
          t: time,
          mouth: bundle.mouth,
          mood: hostState.mood,
          pose: hostState.pose,
          side: hostState.targetSide,
          dissolve: hostState.dissolve,
          framing: hostFraming,
          palette,
          seed: `${bundle.look?.id || 'stage'}:${hostVariant}`,
        });
      }

      const cap = activeCaptionAt(bundle.captions, time);
      drawCaptionBar(ctx, cap, time, width, height, palette, lastBounds);
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

  /** Binds a stage instance to window globals expected by capture renderers. */
  function bindStageToPage(win, stage, bundle) {
    win.DURATION = bundle.duration;
    win.FPS = bundle.fps || 30;
    win.__ready = stage.ready;
    win.__renderFrame = (t) => stage.renderFrame(t);
    win.__textBounds = () => stage.textBounds();
    return () => stage.dispose();
  }

  root.VBC_STAGE = {
    createStage,
    bindStageToPage,
    activeBeatAt,
    activeCaptionAt,
  };
})(typeof window !== 'undefined' ? window : globalThis);
