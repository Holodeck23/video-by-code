// neon-tube: multi-pass bent glass neon tubes, hardware mounting clips, electrode boots,
// 40 Hz ignition flicker, segmented chase arrows, and open-brick neon beat signs.
(function (root) {
  'use strict';

  const NEON_PINK = '#ff2a85';
  const CORE_PINK = '#ffecf6';
  const NEON_CYAN = '#00e5ff';
  const CORE_CYAN = '#e4ffff';
  const NEON_GOLD = '#ffc845';
  const CORE_GOLD = '#fffae4';
  const NEON_MINT = '#22f2a6';
  const CORE_MINT = '#e6fff5';

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  /** Deterministic 40 Hz fluorescent strike-on stutter over `dur` seconds. */
  function ignitionPower(t, t0, dur = 0.26) {
    const dt = t - t0;
    if (dt <= 0) return 0;
    if (dt >= dur) return 1;
    const u = dt / dur;
    const wave = Math.sin(u * 251.3) * Math.cos(u * 97.4);
    return wave > -0.18 + (1 - u) * 0.72 ? 0.92 : 0.14;
  }

  /** Draws a physical bent-glass neon tube path with contact shadow, unlit glass, 3-pass halo, and white core. */
  function drawGlassTube(ctx, pathFn, color, coreColor, width = 8, power = 1, alpha = 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Contact shadow on the brick wall (+6, +11)
    ctx.save();
    ctx.translate(6, 11);
    ctx.globalAlpha = 0.62 * alpha;
    ctx.strokeStyle = '#06050a';
    ctx.lineWidth = width + 5;
    pathFn();
    ctx.stroke();
    ctx.restore();

    // 2. Physical smoky glass tube + upper specular highlight
    ctx.globalAlpha = 0.92 * alpha;
    ctx.strokeStyle = '#2c2430';
    ctx.lineWidth = width + 3.5;
    pathFn();
    ctx.stroke();

    ctx.globalAlpha = 0.22 * alpha;
    ctx.strokeStyle = '#cfc6d8';
    ctx.lineWidth = Math.max(1.2, width * 0.25);
    pathFn();
    ctx.stroke();

    // 3. Multi-pass luminous gas discharge + near-white core
    if (power > 0.04) {
      const p = clamp01(power) * alpha;
      const passes = [
        [34, 0.22, width * 2.4],
        [14, 0.56, width * 1.35],
        [0, 0.95, width],
      ];
      for (const [blur, a, lw] of passes) {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.globalAlpha = a * p;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        pathFn();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = p;
      ctx.strokeStyle = coreColor || '#ffffff';
      ctx.lineWidth = Math.max(2, width * 0.34);
      pathFn();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Draws steel mounting standoff brackets and rubber electrode boots OVER the tubes. */
  function drawHardwareClips(ctx, points, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const [px, py, horiz] of points) {
      const w = horiz ? 22 : 12;
      const h = horiz ? 12 : 22;
      ctx.fillStyle = '#15121c';
      ctx.beginPath();
      ctx.roundRect(px - w * 0.5, py - h * 0.5, w, h, 3);
      ctx.fill();
      ctx.fillStyle = '#635b6c';
      ctx.fillRect(px - (horiz ? 6 : 2), py - (horiz ? 2 : 6), horiz ? 12 : 2, horiz ? 2 : 12);
    }
    ctx.restore();
  }

  /** Renders a neon tube text string with brick contact shadow, multi-layer glow, and bright core. */
  function drawNeonText(ctx, text, x, y, sizePx, color, coreColor, align = 'left', power = 1, alpha = 1, fontFam = '"Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif') {
    const str = String(text ?? '');
    if (!str) return;
    ctx.save();
    ctx.font = `700 ${sizePx}px ${fontFam}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';

    // Contact shadow on brick
    ctx.fillStyle = 'rgba(5, 4, 10, 0.78)';
    ctx.globalAlpha = alpha;
    ctx.fillText(str, x + 5, y + 9);

    // Unlit glass base
    ctx.strokeStyle = '#2c2430';
    ctx.lineWidth = Math.max(4, sizePx * 0.11);
    if (typeof ctx.strokeText === 'function') {
      ctx.strokeText(str, x, y);
    }

    if (power > 0.04) {
      const p = clamp01(power) * alpha;
      const passes = [
        [36, 0.32, Math.max(3, sizePx * 0.08)],
        [14, 0.68, Math.max(2, sizePx * 0.05)],
        [4, 0.96, Math.max(1.5, sizePx * 0.03)],
      ];
      for (const [blur, a, lw] of passes) {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.globalAlpha = a * p;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        if (typeof ctx.strokeText === 'function') {
          ctx.strokeText(str, x, y);
        }
        ctx.fillStyle = color;
        ctx.fillText(str, x, y);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = p;
      ctx.fillStyle = coreColor || '#ffffff';
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  }

  /** Fits font size down (never below minPx) so text fits maxW without ugly ellipsis truncation. */
  function chooseFontSize(ctx, text, maxW, targetPx, minPx = 34, fontFam = '"Arial Rounded MT Bold", Arial, sans-serif') {
    let px = targetPx;
    while (px > minPx) {
      ctx.font = `700 ${px}px ${fontFam}`;
      if (ctx.measureText(String(text ?? '')).width <= maxW) {
        return px;
      }
      px -= 2;
    }
    return minPx;
  }

  function draw(ctx, { width, height, t = 0 }) {
    const isVert = height > width;
    const streetY = Math.round(height * (isVert ? 0.86 : 0.83));
    const flicker = 0.93 + 0.07 * Math.sin(t * 43.0);

    // Ambient architectural neon sign brackets & top crown rail on the brick wall
    const m = isVert ? 48 : 38;
    drawGlassTube(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(m, m + 44);
        ctx.lineTo(m, m);
        ctx.lineTo(m + 96, m);
        ctx.moveTo(width - m - 96, m);
        ctx.lineTo(width - m, m);
        ctx.lineTo(width - m, m + 44);
      },
      NEON_PINK,
      CORE_PINK,
      6,
      flicker,
      0.85
    );
    drawHardwareClips(ctx, [
      [m + 42, m, false],
      [width - m - 42, m, false],
      [m, m + 24, true],
      [width - m, m + 24, true],
    ]);

    // Transformer box & power conduit on lower-right brick wall above curb
    const tx = width - (isVert ? 130 : 148);
    const ty = streetY - 58;
    ctx.save();
    ctx.strokeStyle = '#07070c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tx + 36, ty - 48);
    ctx.lineTo(tx + 36, ty);
    ctx.stroke();
    ctx.fillStyle = '#17151f';
    ctx.strokeStyle = '#383246';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, 84, 38, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCard(ctx, { x, y, width, height, t = 0, alpha = 1 }) {
    const power = 0.94 + 0.06 * Math.sin(t * 37.7);
    drawGlassTube(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 26);
      },
      NEON_CYAN,
      CORE_CYAN,
      8,
      power,
      alpha
    );
    drawHardwareClips(
      ctx,
      [
        [x + 64, y, false],
        [x + width - 64, y, false],
        [x, y + height * 0.35, true],
        [x + width, y + height * 0.35, true],
        [x, y + height * 0.72, true],
        [x + width, y + height * 0.72, true],
      ],
      alpha
    );
  }

  /** Renders the active beat natively as a wall-mounted multi-tube neon sign. */
  function drawBeat(ctx, { beat, rect, t, u, palette, recordText, words = [] }) {
    const content = beat.content || {};
    const title = content.title || content.text || beat.id;
    const sub = content.subtitle || '';
    const kicker = content.kicker ? String(content.kicker).toUpperCase() : '';
    const items = Array.isArray(content.items) ? content.items : [];
    const lanes = Array.isArray(content.lanes) ? content.lanes : [];
    const power = ignitionPower(t, beat.start, 0.28) * (0.94 + 0.06 * Math.sin(t * 41.2));

    // Subtle dark smoked-glass backing (alpha 0.38) so the lit brick wall stays visible through the sign
    ctx.save();
    ctx.globalAlpha = u * 0.38;
    ctx.fillStyle = '#090812';
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 28);
    ctx.fill();
    ctx.restore();

    // Outer bent-glass cyan neon frame with open gap at top-left for kicker sign
    drawCard(ctx, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, t, alpha: u * power });

    const innerX = rect.x + 38;
    const innerW = rect.width - 76;
    let cursorY = rect.y + 56;

    // 1. Kicker neon tube + 5-segment sequential chase arrow
    if (kicker) {
      const kSize = 34;
      drawNeonText(ctx, kicker, innerX, cursorY, kSize, NEON_GOLD, CORE_GOLD, 'left', power, u, 'Courier, monospace');
      recordText(kicker, innerX, cursorY, kSize, 'left', false);

      // 5-segment chase light arrow to the right of kicker
      ctx.font = `700 ${kSize}px Courier, monospace`;
      const kw = ctx.measureText(kicker).width;
      const chaseStart = innerX + kw + 28;
      const activeSeg = Math.floor(t * 6) % 5;
      for (let s = 0; s < 5; s += 1) {
        const sx = chaseStart + s * 22;
        const sy = cursorY - 12;
        if (sx + 20 < innerX + innerW) {
          const segPower = s === activeSeg ? 1 : s === (activeSeg + 4) % 5 ? 0.55 : 0.15;
          drawGlassTube(
            ctx,
            () => {
              ctx.beginPath();
              ctx.moveTo(sx, sy - 8);
              ctx.lineTo(sx + 10, sy);
              ctx.lineTo(sx, sy + 8);
            },
            NEON_GOLD,
            CORE_GOLD,
            4,
            segPower * power,
            u
          );
        }
      }
      cursorY += 62;
    } else {
      cursorY += 16;
    }

    // 2. Main Neon Headline (Hot Pink bent glass script/display, >= 56px)
    const titleSize = chooseFontSize(ctx, title, innerW, 60, 56);
    ctx.font = `700 ${titleSize}px "Arial Rounded MT Bold", Arial, sans-serif`;
    const titleWords = String(title).split(/\s+/);
    const titleLines =
      ctx.measureText(title).width > innerW && titleWords.length > 2
        ? [
            titleWords.slice(0, Math.ceil(titleWords.length * 0.5)).join(' '),
            titleWords.slice(Math.ceil(titleWords.length * 0.5)).join(' '),
          ]
        : [String(title)];
    for (let li = 0; li < titleLines.length; li += 1) {
      const ln = titleLines[li];
      drawNeonText(ctx, ln, innerX, cursorY, titleSize, NEON_PINK, CORE_PINK, 'left', power, u);
      recordText(ln, innerX, cursorY, titleSize, 'left', true);
      if (li < titleLines.length - 1) cursorY += titleSize + 6;
    }
    cursorY += 44;

    // Glowing violet underline tube with mounting clips
    drawGlassTube(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(innerX, cursorY - 22);
        ctx.lineTo(innerX + Math.min(innerW * 0.72, 560), cursorY - 22);
      },
      '#a855f7',
      '#f3e8ff',
      5,
      power,
      u
    );
    drawHardwareClips(
      ctx,
      [
        [innerX + 40, cursorY - 22, false],
        [innerX + Math.min(innerW * 0.72, 560) - 40, cursorY - 22, false],
      ],
      u
    );

    // 3. Subtitle in electric cyan
    if (sub) {
      const subSize = chooseFontSize(ctx, sub, innerW, 36, 34);
      drawNeonText(ctx, sub, innerX, cursorY + 14, subSize, NEON_CYAN, CORE_CYAN, 'left', power, u * 0.92);
      recordText(sub, innerX, cursorY + 14, subSize, 'left', false);
      cursorY += 52;
    } else {
      cursorY += 12;
    }

    const remainH = Math.max(120, rect.y + rect.height - cursorY - 28);

    // 4. Lyric mode: neon karaoke marquee + equalizer tubes
    if (beat.type === 'lyric') {
      const activeWords = words.filter((w) => w.end > beat.start && w.start < beat.end);
      const activeWord =
        activeWords.find((w) => t >= w.start && t < w.end) ||
        activeWords.filter((w) => w.start <= t).pop() ||
        activeWords[0];
      const highlightTxt = activeWord ? String(activeWord.text).toUpperCase() : String(content.text || title).toUpperCase();
      const panelH = Math.max(108, Math.floor(remainH * 0.5));
      drawGlassTube(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(innerX, cursorY, innerW, panelH, 20);
        },
        NEON_GOLD,
        CORE_GOLD,
        6,
        power,
        u
      );
      const lSize = chooseFontSize(ctx, highlightTxt, innerW - 48, 60, 56);
      const cx = innerX + Math.round(innerW * 0.5);
      const cy = cursorY + Math.round(panelH * 0.62);
      drawNeonText(ctx, highlightTxt, cx, cy, lSize, NEON_GOLD, CORE_GOLD, 'center', power, u);
      recordText(highlightTxt, cx, cy, lSize, 'center', true);

      // Vertical neon equalizer tubes
      const barY = cursorY + panelH + 22;
      const barH = Math.max(54, remainH - panelH - 28);
      const count = 20;
      const step = innerW / count;
      for (let i = 0; i < count; i += 1) {
        const amp = 0.25 + 0.75 * Math.abs(Math.sin(t * 4.5 + i * 0.42) * Math.cos(t * 2.1 - i * 0.19));
        const h = Math.max(12, barH * amp);
        const bx = innerX + i * step + step * 0.5;
        drawGlassTube(
          ctx,
          () => {
            ctx.beginPath();
            ctx.moveTo(bx, barY + barH);
            ctx.lineTo(bx, barY + barH - h);
          },
          i % 2 === 0 ? NEON_CYAN : NEON_PINK,
          i % 2 === 0 ? CORE_CYAN : CORE_PINK,
          5,
          power,
          u * 0.9
        );
      }
      return;
    }

    // 5. Mounted Neon Sign Modules for Lanes, Items, or Callouts (zero truncation!)
    const rows =
      lanes.length > 0
        ? lanes.map((l, i) => ({
            badge: `0${i + 1}`,
            label: l.label,
            metric: l.metric || '',
            detail: l.detail || '',
            progress: Number(l.progress ?? 0.88),
            col: l.state === 'blocked' ? NEON_PINK : i % 2 === 0 ? NEON_CYAN : NEON_MINT,
            core: l.state === 'blocked' ? CORE_PINK : i % 2 === 0 ? CORE_CYAN : CORE_MINT,
          }))
        : items.length > 0
          ? items.map((it, i) => ({
              badge: typeof it === 'object' && it.badge ? it.badge : `0${i + 1}`,
              label: typeof it === 'string' ? it : it.text || '',
              metric: typeof it === 'object' && it.value ? it.value : '',
              detail: '',
              progress: 0.9,
              col: i % 2 === 0 ? NEON_CYAN : NEON_PINK,
              core: i % 2 === 0 ? CORE_CYAN : CORE_PINK,
            }))
          : [
              {
                badge: content.statLabel || 'STAGE',
                label: content.callout || 'Deterministic Frame Clock',
                metric: content.stat || '30 FPS',
                detail: '',
                progress: 0.95,
                col: NEON_CYAN,
                core: CORE_CYAN,
              },
              {
                badge: 'GATE',
                label: content.point2 || '10-Slot Look Resolver',
                metric: content.badge || 'VERIFIED',
                detail: '',
                progress: 1.0,
                col: NEON_GOLD,
                core: CORE_GOLD,
              },
            ];

    const gap = 16;
    const rowH = Math.max(78, Math.floor((remainH - gap * (rows.length - 1)) / rows.length));
    rows.forEach((r, idx) => {
      const rowT0 = beat.start + 0.14 + idx * 0.18;
      const rowPow = ignitionPower(t, rowT0, 0.24) * power;
      if (rowPow <= 0.02) return;
      const ry = cursorY + idx * (rowH + gap);

      // Dark smoked backing per module
      ctx.save();
      ctx.globalAlpha = u * 0.52;
      ctx.fillStyle = '#0c0b16';
      ctx.beginPath();
      ctx.roundRect(innerX, ry, innerW, rowH, 16);
      ctx.fill();
      ctx.restore();

      // Bent neon tube border around module
      drawGlassTube(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(innerX, ry, innerW, rowH, 16);
        },
        r.col,
        r.core,
        5.5,
        rowPow,
        u
      );
      drawHardwareClips(
        ctx,
        [
          [innerX + 28, ry, false],
          [innerX + innerW - 28, ry, false],
        ],
        u
      );

      const textY = ry + Math.round(rowH * (r.detail ? 0.44 : 0.6));

      // Neon badge on left
      drawNeonText(ctx, String(r.badge), innerX + 24, textY, 34, NEON_GOLD, CORE_GOLD, 'left', rowPow, u, 'Courier, monospace');

      // Neon metric on right (measured first so label never collides or truncates)
      let metricW = 0;
      if (r.metric) {
        const mStr = String(r.metric);
        const mSize = chooseFontSize(ctx, mStr, 260, 36, 34);
        ctx.font = `700 ${mSize}px "Arial Rounded MT Bold", Arial, sans-serif`;
        metricW = ctx.measureText(mStr).width + 32;
        drawNeonText(ctx, mStr, innerX + innerW - 24, textY, mSize, NEON_GOLD, CORE_GOLD, 'right', rowPow, u);
        recordText(mStr, innerX + innerW - 24, textY, mSize, 'right', true);
      }

      // Main label in crisp glowing tube
      const labelX = innerX + 148;
      const availLabelW = Math.max(180, innerW - 172 - metricW);
      const lSize = chooseFontSize(ctx, r.label, availLabelW, 36, 34);
      drawNeonText(ctx, r.label, labelX, textY, lSize, '#ffffff', '#ffffff', 'left', rowPow, u);
      recordText(r.label, labelX, textY, lSize, 'left', true);

      if (r.detail && rowH >= 88) {
        const detY = ry + Math.round(rowH * 0.8);
        const dSize = chooseFontSize(ctx, r.detail, innerW - 156, 34, 34);
        drawNeonText(ctx, r.detail, labelX, detY, dSize, r.col, r.core, 'left', rowPow * 0.85, u * 0.9);
        recordText(r.detail, labelX, detY, dSize, 'left', false);
      }
    });
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/neon-tube'] = {
    kind: 'layer',
    id: 'neon-tube',
    slot: 'marks',
    requires: ['dark-ground', 'light-map'],
    provides: ['neon-emissive'],
    draw,
    drawCard,
    drawBeat,
  };
})(typeof window !== 'undefined' ? window : globalThis);
