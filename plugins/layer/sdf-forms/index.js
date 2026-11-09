// sdf-forms: precision orbital reticles, harmonic tick rings, and open-stage kinetic typography +
// translucent glass HUD telemetry that leaves the 3D raymarched SDF world visible.
(function (root) {
  'use strict';

  const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const MONO = 'Menlo, "SF Mono", Consolas, Courier, monospace';
  const CYAN = '#38bdf8';
  const ROSE = '#f43f5e';
  const EMERALD = '#34d399';
  const VIOLET = '#a855f7';

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function smoothstep(u) {
    const x = clamp01(u);
    return x * x * (3 - 2 * x);
  }

  function chooseFontSize(ctx, text, maxW, targetPx, minPx = 34, fontFam = SANS) {
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

  function drawReticleCorner(ctx, x, y, dx, dy, len, col) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  }

  function draw(ctx, { width, height, t = 0, music }) {
    const beats = music?.beats;
    let pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    if (Array.isArray(beats) && beats.length) {
      let last = 0;
      for (let i = 0; i < beats.length; i += 1) {
        if (beats[i] <= t) last = beats[i];
        else break;
      }
      pulse = Math.exp(-Math.max(0, t - last) * 5.0);
    }

    const isVert = height > width;
    const cx = width * (isVert ? 0.5 : 0.62);
    const cy = height * (isVert ? 0.44 : 0.47);
    const orbitR = Math.min(width, height) * (isVert ? 0.34 : 0.36);

    ctx.save();
    // 1. Fine orbital measurement ring around the 3D SDF sculpture
    ctx.strokeStyle = CYAN;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.stroke();

    // 48 radial harmonic ticks around the SDF core
    const ticks = 48;
    for (let i = 0; i < ticks; i += 1) {
      const a = (i / ticks) * Math.PI * 2 + t * 0.12;
      const wave = Math.abs(Math.sin(i * 0.5 + t * 3.2));
      const len = (i % 4 === 0 ? 14 : 6) + wave * 12 * pulse;
      const r0 = orbitR + 6;
      const r1 = r0 + len;
      ctx.strokeStyle = i % 4 === 0 ? ROSE : CYAN;
      ctx.globalAlpha = i % 4 === 0 ? 0.48 : 0.24;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }

    // 2. Outer viewport precision crosshairs
    const m = 34;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    drawReticleCorner(ctx, m, m, 1, 1, 26, CYAN);
    drawReticleCorner(ctx, width - m, m, -1, 1, 26, CYAN);
    drawReticleCorner(ctx, m, height - m, 1, -1, 26, ROSE);
    drawReticleCorner(ctx, width - m, height - m, -1, -1, 26, ROSE);
    ctx.restore();
  }

  function drawCard(ctx, { x, y, width, height, alpha = 1 }) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    drawReticleCorner(ctx, x, y, 1, 1, 24, CYAN);
    drawReticleCorner(ctx, x + width, y, -1, 1, 24, CYAN);
    drawReticleCorner(ctx, x, y + height, 1, -1, 24, ROSE);
    drawReticleCorner(ctx, x + width, y + height, -1, -1, 24, ROSE);
    ctx.restore();
  }

  /** Renders open-stage kinetic typography and minimal glass HUD strips over the 3D SDF world. */
  function drawBeat(ctx, { beat, rect, t, u, recordText, words = [] }) {
    const content = beat.content || {};
    const title = content.title || content.text || beat.id;
    const sub = content.subtitle || '';
    const kicker = content.kicker ? String(content.kicker).toUpperCase() : '';
    const items = Array.isArray(content.items) ? content.items : [];
    const lanes = Array.isArray(content.lanes) ? content.lanes : [];

    // Open-stage reticle corners only — NO opaque background card so the 3D SDF shader stays visible!
    drawCard(ctx, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, alpha: u * 0.75 });

    const innerX = rect.x + 28;
    const innerW = rect.width - 56;
    let cursorY = rect.y + 52;

    ctx.save();
    ctx.globalAlpha = u;

    // 1. Kicker pill tag + glowing reticle vector line
    if (kicker) {
      const kSize = 34;
      ctx.font = `700 ${kSize}px ${MONO}`;
      const kw = ctx.measureText(kicker).width;
      ctx.fillStyle = 'rgba(8, 15, 32, 0.68)';
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(innerX, cursorY - 30, kw + 32, 42, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = CYAN;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(kicker, innerX + 16, cursorY);
      recordText(kicker, innerX + 16, cursorY, kSize, 'left', false);

      // Fine leader line + glowing target node
      const lx0 = innerX + kw + 48;
      const lx1 = Math.min(innerX + innerW, lx0 + 180);
      if (lx1 > lx0 + 20) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx0, cursorY - 10);
        ctx.lineTo(lx1, cursorY - 10);
        ctx.stroke();
        ctx.fillStyle = ROSE;
        ctx.beginPath();
        ctx.arc(lx1, cursorY - 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      cursorY += 68;
    } else {
      cursorY += 16;
    }

    // 2. Open-Stage Kinetic Headline (>= 56px) with dark optical halo so it floats cleanly over the 3D SDF
    const titleSize = chooseFontSize(ctx, title, innerW, 62, 56, SANS);
    ctx.font = `700 ${titleSize}px ${SANS}`;
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
      ctx.save();
      ctx.font = `700 ${titleSize}px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(3, 6, 16, 0.95)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(ln, innerX, cursorY);
      ctx.restore();
      recordText(ln, innerX, cursorY, titleSize, 'left', true);
      if (li < titleLines.length - 1) cursorY += titleSize + 6;
    }
    cursorY += 48;

    // 3. Subtitle in cool silver-cyan
    if (sub) {
      const subSize = chooseFontSize(ctx, sub, innerW, 36, 34, SANS);
      ctx.save();
      ctx.font = `700 ${subSize}px ${SANS}`;
      ctx.shadowColor = 'rgba(3, 6, 16, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#bae6fd';
      ctx.textAlign = 'left';
      ctx.fillText(sub, innerX, cursorY);
      ctx.restore();
      recordText(sub, innerX, cursorY, subSize, 'left', false);
      cursorY += 46;
    } else {
      cursorY += 10;
    }

    const remainH = Math.max(120, rect.y + rect.height - cursorY - 24);

    // 4. Lyric Beat: open-stage kinetic word highlight + harmonic spectrum ribbon
    if (beat.type === 'lyric') {
      const activeWords = words.filter((w) => w.end > beat.start && w.start < beat.end);
      const activeWord =
        activeWords.find((w) => t >= w.start && t < w.end) ||
        activeWords.filter((w) => w.start <= t).pop() ||
        activeWords[0];
      const highlightTxt = activeWord ? String(activeWord.text).toUpperCase() : String(content.text || title).toUpperCase();
      const panelH = Math.max(110, Math.floor(remainH * 0.48));

      // Translucent glassmorphic lyric band
      ctx.fillStyle = 'rgba(7, 12, 26, 0.46)';
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(innerX, cursorY, innerW, panelH, 16);
      ctx.fill();
      ctx.stroke();

      const lSize = chooseFontSize(ctx, highlightTxt, innerW - 48, 62, 56, SANS);
      const cx = innerX + Math.round(innerW * 0.5);
      const cy = cursorY + Math.round(panelH * 0.62);
      ctx.save();
      ctx.font = `700 ${lSize}px ${SANS}`;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(highlightTxt, cx, cy);
      ctx.restore();
      recordText(highlightTxt, cx, cy, lSize, 'center', true);

      // Precision harmonic spectrum filaments below
      const waveY = cursorY + panelH + 22;
      const waveH = Math.max(54, remainH - panelH - 26);
      const bars = 32;
      const step = innerW / bars;
      for (let i = 0; i < bars; i += 1) {
        const amp = 0.2 + 0.8 * Math.abs(Math.sin(t * 4.4 + i * 0.33) * Math.cos(t * 2.0 - i * 0.21));
        const bh = Math.max(10, waveH * amp);
        const bx = innerX + i * step + step * 0.5;
        ctx.strokeStyle = i % 3 === 0 ? ROSE : i % 2 === 0 ? CYAN : EMERALD;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, waveY + waveH);
        ctx.lineTo(bx, waveY + waveH - bh);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // 5. Compact Translucent Glass HUD Telemetry Strips (keeping the 3D SDF sculpture visible!)
    const rows =
      lanes.length > 0
        ? lanes.map((l, i) => ({
            badge: `0${i + 1}`,
            label: l.label,
            metric: l.metric || '',
            detail: l.detail || '',
            progress: Number(l.progress ?? 0.88),
            col: l.state === 'blocked' ? ROSE : i % 2 === 0 ? CYAN : EMERALD,
          }))
        : items.length > 0
          ? items.map((it, i) => ({
              badge: typeof it === 'object' && it.badge ? it.badge : `0${i + 1}`,
              label: typeof it === 'string' ? it : it.text || '',
              metric: typeof it === 'object' && it.value ? it.value : '',
              detail: '',
              progress: 0.92,
              col: i === 0 ? CYAN : i === 1 ? ROSE : EMERALD,
            }))
          : [
              {
                badge: content.statLabel || 'SDF',
                label: content.callout || 'Deterministic Frame Clock',
                metric: content.stat || '30 FPS',
                detail: '',
                progress: 0.95,
                col: CYAN,
              },
              {
                badge: 'SYNC',
                label: content.point2 || '10-Slot Look Resolver',
                metric: content.badge || 'VERIFIED',
                detail: '',
                progress: 1.0,
                col: EMERALD,
              },
            ];

    // Position the HUD strips near the lower portion of the stage with generous air above
    const maxCardH = rows.some((r) => r.detail) ? 96 : 78;
    const gap = 16;
    const totalRowsH = rows.length * maxCardH + (rows.length - 1) * gap;
    const startY = cursorY + Math.max(0, Math.floor((remainH - totalRowsH) * 0.65));
    const rowH = Math.min(maxCardH, Math.max(74, Math.floor((remainH - gap * (rows.length - 1)) / rows.length)));

    rows.forEach((r, idx) => {
      const iu = smoothstep((t - (beat.start + 0.14 + idx * 0.18)) / 0.34);
      if (iu <= 0.02) return;
      const ry = startY + idx * (rowH + gap);

      ctx.save();
      ctx.globalAlpha = u * iu;

      // Semi-transparent glass strip (alpha 0.54) so the 3D SDF world glows behind it
      ctx.fillStyle = 'rgba(7, 11, 24, 0.54)';
      ctx.strokeStyle = r.col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(innerX, ry, innerW, rowH, 12);
      ctx.fill();
      ctx.stroke();

      // Glowing left accent bar + bottom progress filament
      ctx.fillStyle = r.col;
      ctx.fillRect(innerX, ry + 8, 5, rowH - 16);
      ctx.fillRect(innerX + 12, ry + rowH - 3, Math.round((innerW - 24) * r.progress * iu), 2);

      const textY = ry + Math.round(rowH * (r.detail ? 0.44 : 0.62));

      // Monospace HUD badge
      ctx.font = `700 34px ${MONO}`;
      ctx.fillStyle = r.col;
      ctx.textAlign = 'left';
      ctx.fillText(String(r.badge), innerX + 24, textY);

      // Metric value on right (never truncated!)
      let metricW = 0;
      if (r.metric) {
        const mStr = String(r.metric);
        const mSize = chooseFontSize(ctx, mStr, 260, 36, 34, MONO);
        ctx.font = `700 ${mSize}px ${MONO}`;
        metricW = ctx.measureText(mStr).width + 32;
        ctx.fillStyle = r.col === CYAN ? EMERALD : r.col;
        ctx.textAlign = 'right';
        ctx.fillText(mStr, innerX + innerW - 24, textY);
        recordText(mStr, innerX + innerW - 24, textY, mSize, 'right', true);
      }

      // Main HUD label
      const labelX = innerX + 132;
      const availLabelW = Math.max(180, innerW - 156 - metricW);
      const lSize = chooseFontSize(ctx, r.label, availLabelW, 36, 34, SANS);
      ctx.font = `700 ${lSize}px ${SANS}`;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.fillText(r.label, labelX, textY);
      recordText(r.label, labelX, textY, lSize, 'left', true);

      if (r.detail && rowH >= 86) {
        const detY = ry + Math.round(rowH * 0.8);
        const dSize = chooseFontSize(ctx, r.detail, innerW - 156, 34, 34, SANS);
        ctx.font = `400 ${dSize}px ${SANS}`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(r.detail, labelX, detY);
        recordText(r.detail, labelX, detY, dSize, 'left', false);
      }

      ctx.restore();
    });

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/sdf-forms'] = {
    kind: 'layer',
    id: 'sdf-forms',
    slot: 'marks',
    requires: ['dark-ground', 'sdf-world', 'audio-reactive'],
    provides: ['sdf-marks'],
    draw,
    drawCard,
    drawBeat,
  };
})(typeof window !== 'undefined' ? window : globalThis);
