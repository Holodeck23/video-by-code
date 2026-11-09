// Stage Core ("One Engine"): renders any frame from a validated bundle.json
// as a pure, synchronous function of time t. Supports multi-tile isolation,
// dynamic beat/layer plugins, and >=56px titles / >=34px body text at 1080p.
(function (root) {
  'use strict';

  const {
    computeContentRect,
    resolveHostPlugin,
    resolveHostState,
    drawHost,
  } = root.VBC_HOST;

  const DEFAULT_PALETTES = {
    'studio-dark': { bg: '#0b101e', surface: '#131c31', cardBg: 'rgba(19, 28, 49, 0.92)', body: '#233252', face: '#f4efe6', ink: '#0f172a', text: '#f8fafc', muted: '#94a3b8', accent: '#38bdf8', accent2: '#f43f5e', good: '#34d399', mouthFill: '#fb7185' },
    'warm-editorial': { bg: '#f4efe4', surface: '#e6decb', cardBg: 'rgba(238, 231, 215, 0.94)', body: '#2b3a4a', face: '#fffdf9', ink: '#1c1917', text: '#1c1917', muted: '#57534e', accent: '#d97706', accent2: '#e11d48', good: '#059669', mouthFill: '#e11d48' },
    'neon-night': { bg: '#090714', surface: '#151029', cardBg: 'rgba(21, 16, 41, 0.92)', body: '#261b47', face: '#e2e8f0', ink: '#090714', text: '#f8fafc', muted: '#a78bfa', accent: '#22d3ee', accent2: '#f472b6', good: '#34d399', mouthFill: '#f43f5e' },
    risograph: { bg: '#f7f1e3', surface: '#e8dec6', cardBg: 'rgba(247, 241, 227, 0.94)', body: '#1e3a8a', face: '#fffbeb', ink: '#172554', text: '#172554', muted: '#475569', accent: '#ef4444', accent2: '#2563eb', good: '#0d9488', mouthFill: '#ef4444' },
    'cyber-amber': { bg: '#0c0a09', surface: '#1c1917', cardBg: 'rgba(28, 25, 23, 0.92)', body: '#292524', face: '#fef3c7', ink: '#0c0a09', text: '#fef3c7', muted: '#a8a29e', accent: '#f59e0b', accent2: '#10b981', good: '#34d399', mouthFill: '#f59e0b' },
    'monochrome-ink': { bg: '#f5f5f4', surface: '#e7e5e4', cardBg: 'rgba(245, 245, 244, 0.95)', body: '#292524', face: '#fafaf9', ink: '#0c0a09', text: '#0c0a09', muted: '#57534e', accent: '#1c1917', accent2: '#44403c', good: '#1c1917', mouthFill: '#44403c' },
  };

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function smoothstep(u) {
    const x = clamp01(u);
    return x * x * (3 - 2 * x);
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

  /** Fits text to maxW so no line overflows the safe area. */
  function fitText(ctx, text, maxW) {
    const str = String(text ?? '');
    if (!str || !maxW || maxW <= 0) {
      return str;
    }
    if (ctx.measureText(str).width <= maxW) {
      return str;
    }
    let lo = 1;
    let hi = str.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) * 0.5);
      const cand = `${str.slice(0, mid)}…`;
      if (ctx.measureText(cand).width <= maxW) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return `${str.slice(0, Math.max(1, lo))}…`;
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

  function drawFittedText(boundsList, ctx, text, x, y, maxW, sizePx, align = 'left', critical = true) {
    const fitted = fitText(ctx, text, maxW);
    ctx.textAlign = align;
    ctx.fillText(fitted, x, y);
    recordText(boundsList, ctx, fitted, x, y, sizePx, align, critical);
  }

  function drawLanesDiagram(ctx, lanes, x, y, width, availH, t, beatStart, u, palette, boundsList) {
    const count = Math.max(1, lanes.length);
    const gap = 18;
    const rowH = Math.max(84, Math.floor((availH - gap * (count - 1)) / count));
    lanes.forEach((lane, idx) => {
      const iu = smoothstep((t - (beatStart + 0.14 + idx * 0.18)) / 0.38);
      const alpha = u * iu;
      if (alpha <= 0.02) {
        return;
      }
      const ry = y + idx * (rowH + gap);
      const isBlocked = lane.state === 'blocked' || lane.state === 'loss';
      const fastCol = lane.state === 'fast' ? palette.good : palette.accent;
      const barCol = isBlocked ? palette.accent2 : fastCol;
      const frac = Math.max(0.12, Math.min(1, Number(lane.progress ?? 0.85) * iu));
      const fillW = Math.max(24, (width - 8) * frac);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette.bg;
      ctx.strokeStyle = barCol;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, ry, width, rowH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = barCol;
      ctx.globalAlpha = alpha * 0.22;
      ctx.beginPath();
      ctx.roundRect(x + 4, ry + 4, fillW, rowH - 8, 12);
      ctx.fill();
      ctx.globalAlpha = alpha;

      ctx.font = '700 36px Arial, sans-serif';
      ctx.fillStyle = palette.text;
      const labelY = ry + Math.round(rowH * 0.42);
      drawFittedText(boundsList, ctx, lane.label, x + 28, labelY, width - 220, 36, 'left', true);

      if (lane.metric) {
        ctx.font = '700 36px Arial, sans-serif';
        ctx.fillStyle = barCol;
        drawFittedText(boundsList, ctx, lane.metric, x + width - 28, labelY, 180, 36, 'right', true);
      }

      if (lane.detail) {
        ctx.font = '400 34px Arial, sans-serif';
        ctx.fillStyle = palette.muted;
        const detY = ry + Math.round(rowH * 0.78);
        drawFittedText(boundsList, ctx, lane.detail, x + 28, detY, width - 56, 34, 'left', false);
      }
      ctx.restore();
    });
  }

  /** Fills the lower composition region when a beat has no explicit list or lane items. */
  function drawCompositionFill(ctx, beat, x, y, width, availH, t, u, palette, boundsList, words = []) {
    const content = beat.content || {};
    const dur = Math.max(0.2, beat.end - beat.start);
    const prog = clamp01((t - beat.start) / dur);

    if (beat.type === 'lyric') {
      // Karaoke word highlight + audio-reactive harmonic bars filling the stage
      const activeWords = words.filter((w) => w.end > beat.start && w.start < beat.end);
      const panelH = Math.max(120, Math.min(220, Math.floor(availH * 0.48)));
      ctx.save();
      ctx.globalAlpha = u;
      ctx.fillStyle = palette.bg;
      ctx.strokeStyle = palette.accent2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, width, panelH, 18);
      ctx.fill();
      ctx.stroke();

      const activeWord =
        activeWords.find((w) => t >= w.start && t < w.end) ||
        activeWords.filter((w) => w.start <= t).pop() ||
        activeWords[0];
      const highlightTxt = activeWord ? String(activeWord.text).toUpperCase() : String(content.text || content.title || '');
      ctx.font = '700 56px Arial, sans-serif';
      ctx.fillStyle = palette.accent;
      drawFittedText(boundsList, ctx, highlightTxt, x + Math.round(width * 0.5), y + Math.round(panelH * 0.56), width - 64, 56, 'center', true);

      // Harmonic visualizer bars in the lower half of availH
      const waveY = y + panelH + 24;
      const waveH = Math.max(72, availH - panelH - 32);
      const bars = 28;
      const step = width / bars;
      for (let i = 0; i < bars; i++) {
        const amp = 0.25 + 0.75 * Math.abs(Math.sin(t * 4.2 + i * 0.38) * Math.cos(t * 1.9 - i * 0.21));
        const bh = Math.max(14, Math.round(waveH * amp));
        ctx.fillStyle = i % 3 === 0 ? palette.accent2 : palette.accent;
        ctx.globalAlpha = u * (0.45 + 0.45 * amp);
        ctx.beginPath();
        ctx.roundRect(x + i * step + 3, waveY + waveH - bh, Math.max(6, step - 6), bh, 6);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (beat.type === 'code' || beat.type === 'screen') {
      const lines = Array.isArray(content.lines)
        ? content.lines
        : [
            content.code || 'vbc make --prod /tmp/my-film',
            content.detail || 'voice -> words -> mouth -> cues -> bundle.json',
            content.result || 'PASS: deterministic stage verified (30 fps)',
          ];
      ctx.save();
      ctx.globalAlpha = u;
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, availH, 16);
      ctx.fill();
      ctx.stroke();

      const rowH = Math.max(58, Math.floor((availH - 36) / Math.max(1, lines.length)));
      lines.forEach((ln, idx) => {
        const ly = y + 24 + idx * rowH;
        if (idx === lines.length - 1) {
          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = u * 0.16;
          ctx.fillRect(x + 12, ly - 8, width - 24, rowH - 8);
          ctx.globalAlpha = u;
        }
        ctx.font = '700 34px Courier, monospace';
        ctx.fillStyle = idx === lines.length - 1 ? palette.good : '#e2e8f0';
        drawFittedText(boundsList, ctx, `${idx + 1}  ${ln}`, x + 28, ly + Math.round(rowH * 0.48), width - 56, 34, 'left', true);
      });
      ctx.restore();
      return;
    }

    // Default composition fill for title, big, flow, chart, quote, host, image:
    // 3 structured stage callout / telemetry cards filling the lower half of the content region.
    const cards = Array.isArray(content.cards)
      ? content.cards
      : [
          {
            badge: content.statLabel || 'STAGE',
            label: content.callout || content.point1 || 'Pure function of time __renderFrame(t)',
            metric: content.stat || `${Math.round(prog * 100)}%`,
          },
          {
            badge: 'COUPLED',
            label: content.point2 || '10-slot look resolver + capability check',
            metric: content.badge || 'VERIFIED',
          },
        ];
    const gap = 18;
    const cardH = Math.max(84, Math.floor((availH - gap * (cards.length - 1)) / cards.length));
    cards.forEach((c, idx) => {
      const iu = smoothstep((t - (beat.start + 0.14 + idx * 0.18)) / 0.36);
      if (iu <= 0.02) return;
      const cy = y + idx * (cardH + gap);
      ctx.save();
      ctx.globalAlpha = u * iu;
      ctx.fillStyle = palette.bg;
      ctx.strokeStyle = idx === 0 ? palette.accent : palette.accent2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, cy, width, cardH, 16);
      ctx.fill();
      ctx.stroke();

      const fillW = Math.max(32, Math.round((width - 12) * Math.min(1, 0.35 + 0.65 * iu)));
      ctx.fillStyle = idx === 0 ? palette.accent : palette.accent2;
      ctx.globalAlpha = u * iu * 0.16;
      ctx.beginPath();
      ctx.roundRect(x + 6, cy + 6, fillW, cardH - 12, 12);
      ctx.fill();
      ctx.globalAlpha = u * iu;

      const baseY = cy + Math.round(cardH * 0.58);
      ctx.font = '700 34px Courier, monospace';
      ctx.fillStyle = idx === 0 ? palette.accent : palette.accent2;
      ctx.textAlign = 'left';
      ctx.fillText(String(c.badge || `0${idx + 1}`), x + 24, baseY);

      ctx.font = '700 36px Arial, sans-serif';
      ctx.fillStyle = palette.text;
      drawFittedText(boundsList, ctx, c.label, x + 168, baseY, width - 340, 36, 'left', true);

      if (c.metric) {
        ctx.font = '700 36px Arial, sans-serif';
        ctx.fillStyle = palette.good || palette.accent;
        drawFittedText(boundsList, ctx, c.metric, x + width - 28, baseY, 150, 36, 'right', false);
      }
      ctx.restore();
    });
  }

  function drawBeatContent(ctx, beat, rect, t, palette, boundsList, isLastBeat = false, options = {}) {
    if (!beat) {
      return;
    }
    const enterU = smoothstep((t - beat.start) / 0.48);
    const exitU = isLastBeat ? 1 : smoothstep((beat.end - t) / 0.42);
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
    const marksPlugin = options.marksPlugin;
    if (marksPlugin && typeof marksPlugin.drawBeat === 'function') {
      ctx.save();
      marksPlugin.drawBeat(ctx, {
        beat,
        rect: { ...rect, y: rect.y + slideY },
        t,
        u,
        enterU,
        palette,
        boundsList,
        words: options.words || [],
        music: options.music,
        recordText: (txt, x, y, sz, align, crit) =>
          recordText(boundsList, ctx, txt, x, y, sz, align, crit),
      });
      ctx.restore();
      return;
    }

    const content = beat.content || {};
    const title = content.title || content.text || beat.id;
    const sub = content.subtitle || '';
    const items = Array.isArray(content.items) ? content.items : [];
    const lanes = Array.isArray(content.lanes) ? content.lanes : [];

    ctx.save();
    ctx.globalAlpha = u;
    if (marksPlugin && typeof marksPlugin.drawCard === 'function') {
      marksPlugin.drawCard(ctx, {
        x: rect.x,
        y: rect.y + slideY,
        width: rect.width,
        height: rect.height,
        t,
        palette,
        alpha: u,
      });
    } else {
      ctx.fillStyle = palette.cardBg || palette.surface;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y + slideY, rect.width, rect.height, 24);
      ctx.fill();
      ctx.stroke();
    }

    const innerX = rect.x + 40;
    const innerW = rect.width - 80;
    let cursorY = rect.y + slideY + 62;

    if (content.kicker) {
      ctx.font = '700 34px Arial, sans-serif';
      ctx.fillStyle = palette.accent;
      const kickerStr = String(content.kicker).toUpperCase();
      drawFittedText(boundsList, ctx, kickerStr, innerX, cursorY, innerW, 34, 'left', false);
      cursorY += 66;
    } else {
      cursorY += 18;
    }

    const titleSize = 58;
    ctx.font = `700 ${titleSize}px Arial, sans-serif`;
    ctx.fillStyle = palette.text;
    drawFittedText(boundsList, ctx, title, innerX, cursorY, innerW, titleSize, 'left', true);
    cursorY += 54;

    if (sub) {
      ctx.font = '400 36px Arial, sans-serif';
      ctx.fillStyle = palette.muted;
      drawFittedText(boundsList, ctx, sub, innerX, cursorY, innerW, 36, 'left', false);
      cursorY += 42;
    }

    const remainH = Math.max(120, rect.y + rect.height - cursorY - 34);
    if (lanes.length > 0) {
      drawLanesDiagram(ctx, lanes, innerX, cursorY, innerW, remainH, t, beat.start, u, palette, boundsList);
    } else if (items.length > 0) {
      const gap = 18;
      const cardH = Math.max(82, Math.floor((remainH - gap * (items.length - 1)) / items.length));
      items.forEach((item, idx) => {
        const itemDelay = beat.start + 0.16 + idx * 0.22;
        const iu = smoothstep((t - itemDelay) / 0.34);
        if (iu <= 0.02) {
          return;
        }
        const iy = cursorY + idx * (cardH + gap);
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
        const textBaseY = iy + Math.round(cardH * 0.58);
        ctx.textAlign = 'left';
        ctx.fillText(badge, innerX + 24, textBaseY);

        const hasVal = typeof item === 'object' && item.value;
        ctx.font = '700 36px Arial, sans-serif';
        ctx.fillStyle = palette.text;
        drawFittedText(boundsList, ctx, label, innerX + 108, textBaseY, innerW - (hasVal ? 260 : 136), 36, 'left', true);

        if (hasVal) {
          ctx.font = '700 36px Arial, sans-serif';
          ctx.fillStyle = palette.good || palette.accent;
          drawFittedText(boundsList, ctx, item.value, innerX + innerW - 28, textBaseY, 130, 36, 'right', true);
        }
        ctx.restore();
      });
    } else {
      drawCompositionFill(ctx, beat, innerX, cursorY, innerW, remainH, t, u, palette, boundsList, options.words);
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
    const fontSize = 34;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    const maxTextW = isVertical ? width - 252 : width - 200;
    const rawText = String(caption.text).trim();
    const words = rawText.split(/\s+/);
    const lines =
      ctx.measureText(rawText).width > maxTextW && words.length > 2
        ? [
            fitText(ctx, words.slice(0, Math.ceil(words.length * 0.5)).join(' '), maxTextW),
            fitText(ctx, words.slice(Math.ceil(words.length * 0.5)).join(' '), maxTextW),
          ]
        : [fitText(ctx, rawText, maxTextW)];
    const measuredW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW = Math.min(isVertical ? width - 216 : width - 140, Math.max(360, measuredW + 52));
    const boxH = lines.length === 2 ? fontSize * 2 + 36 : fontSize + 30;
    const boxX = isVertical ? Math.round(88 + (width - 216 - boxW) * 0.5) : Math.round((width - boxW) * 0.5);
    const boxY = height - (isVertical ? (lines.length === 2 ? 378 : 352) : 120);

    ctx.fillStyle = palette.surface;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.text;
    const textX = Math.round(boxX + boxW * 0.5);
    ctx.textAlign = 'center';
    lines.forEach((ln, idx) => {
      const textY = boxY + 38 + idx * (fontSize + 6);
      ctx.fillText(ln, textX, textY);
      recordText(boundsList, ctx, ln, textX, textY, fontSize, 'center', true);
    });
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
    const paletteKey = resolvedLook.palette || bundle.look?.slots?.palette || 'studio-dark';
    const palette = {
      ...(DEFAULT_PALETTES[paletteKey] || DEFAULT_PALETTES['studio-dark']),
      ...(resolvedLook.colors || {}),
    };
    const hostVariant =
      resolvedLook.hostVariant || resolvedLook.host || bundle.look?.slots?.host || 'ink-mascot';
    const hostFraming = resolvedLook.hostFraming || 'none';
    const groundLayerId = resolvedLook.ground || bundle.look?.slots?.ground || null;
    const marksLayerId = resolvedLook.marks || bundle.look?.slots?.marks || null;
    const finishLayerId = resolvedLook.finish || bundle.look?.slots?.finish || null;
    const composition = resolvedLook.composition || bundle.look?.slots?.composition || 'split-stage';
    const showHost =
      resolvedLook.showHost !== undefined
        ? Boolean(resolvedLook.showHost)
        : bundle.format !== 'lyric' && bundle.format !== 'instrumental';
    if (showHost) {
      resolveHostPlugin(hostVariant);
    }

    const loadedTracks = Array.isArray(assets.tracks) ? assets.tracks.slice() : [];
    const ready = (async () => {
      if (assets.ready) {
        await assets.ready;
      }
      if (
        !loadedTracks.length &&
        Array.isArray(bundle.tracks) &&
        bundle.tracks.length > 0 &&
        root.SOUND?.decodeWav
      ) {
        const b64Map = assets.wavBase64 || root.__VBC_TRACK_WAV_B64 || {};
        for (const tr of bundle.tracks) {
          let buf = null;
          if (b64Map[tr.asset] && typeof atob === 'function') {
            const bin = atob(b64Map[tr.asset]);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i += 1) {
              bytes[i] = bin.charCodeAt(i);
            }
            buf = bytes.buffer;
          } else if (typeof fetch === 'function') {
            const url = assets.baseUrl ? new URL(tr.asset, assets.baseUrl).href : tr.asset;
            const res = await fetch(url);
            if (!res.ok) {
              throw new Error(`failed to load audio track ${tr.asset} (${res.status})`);
            }
            buf = await res.arrayBuffer();
          }
          if (buf) {
            const pcm = root.SOUND.decodeWav(buf);
            loadedTracks.push({ ...tr, pcm });
          }
        }
      }
      return null;
    })();

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

      const groundPlugin = groundLayerId ? root.VBC_PLUGINS?.[`layer/${groundLayerId}`] : null;
      if (groundPlugin && typeof groundPlugin.draw === 'function') {
        groundPlugin.draw(ctx, { width, height, t: time, palette, music: bundle.music });
      } else {
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, width, height);
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
      }

      const marksPlugin = marksLayerId ? root.VBC_PLUGINS?.[`layer/${marksLayerId}`] : null;
      if (marksPlugin && typeof marksPlugin.draw === 'function') {
        marksPlugin.draw(ctx, { width, height, t: time, palette, music: bundle.music });
      }

      const beat = activeBeatAt(bundle.beats, time);
      const hostState = resolveHostState(bundle.beats, time, resolvedLook);
      const hasCaptions = Array.isArray(bundle.captions) && bundle.captions.length > 0;
      const layout = computeContentRect(width, height, hostState.targetSide, hasCaptions, {
        showHost,
        composition,
      });
      const isLastBeat =
        Array.isArray(bundle.beats) &&
        bundle.beats.length > 0 &&
        beat === bundle.beats[bundle.beats.length - 1];

      if (typeof assets.customDraw === 'function' && beat?.type === 'custom') {
        assets.customDraw(ctx, { t: time, beat, layout, palette, boundsList: lastBounds });
      } else {
        drawBeatContent(ctx, beat, layout, time, palette, lastBounds, isLastBeat, {
          marksPlugin,
          words: bundle.words || [],
        });
      }

      if (showHost) {
        if (hostState.outgoingDissolve > 0.01) {
          const prevLayout = computeContentRect(width, height, hostState.prevSide, hasCaptions, {
            showHost,
            composition,
          });
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

      const finishPlugin = finishLayerId ? root.VBC_PLUGINS?.[`layer/${finishLayerId}`] : null;
      if (finishPlugin && typeof finishPlugin.draw === 'function') {
        finishPlugin.draw(ctx, { width, height, t: time, palette, music: bundle.music });
      }

      ctx.restore();
      return lastBounds;
    }

    function scoreSound(k) {
      for (const tr of loadedTracks) {
        if (tr.pcm && typeof k.track === 'function') {
          k.track(tr.pcm, tr.offset || 0, { gain: tr.gain != null ? tr.gain : 1, kind: tr.kind });
        }
      }
      for (const ev of bundle.score || []) {
        const opts = ev.options || {};
        if (ev.name === 'bed') {
          k.bed(ev.time, opts.end ?? ev.time + (opts.dur || 2), opts);
        } else if (ev.name === 'music') {
          k.music(ev.time, opts.end ?? ev.time + (opts.dur || 4), opts);
        } else if (ev.name === 'tone') {
          k.tone(ev.time, opts);
        } else if (ev.name === 'noise') {
          k.noise(ev.time, opts);
        } else {
          k.play(ev.name, ev.time, opts);
        }
      }
    }
    scoreSound.voiceover =
      Boolean(bundle.narrated) ||
      (Array.isArray(bundle.tracks) && bundle.tracks.some((tr) => tr.kind === 'narration'));

    function dispose() {
      disposed = true;
      lastBounds = [];
    }

    return {
      ready,
      renderFrame,
      scoreSound,
      loadedTracks,
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
    if (typeof stage.scoreSound === 'function') {
      win.scoreSound = stage.scoreSound;
    }
    return () => stage.dispose();
  }

  root.VBC_STAGE = {
    createStage,
    bindStageToPage,
    activeBeatAt,
    activeCaptionAt,
  };
})(typeof window !== 'undefined' ? window : globalThis);
