// ink-boil: 8 fps 3-state line-boil hand-drawn sketchbook marks, marker underlines,
// wobbly double-inked note cards, thought clouds, and curved arrows on open paper.
(function (root) {
  'use strict';

  const HAND_FONT = '"Chalkboard SE", "Marker Felt", "Bradley Hand", "Helvetica Neue", Arial, sans-serif';
  const MONO_FONT = '"Courier New", Courier, monospace';

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function smoothstep(u) {
    const x = clamp01(u);
    return x * x * (3 - 2 * x);
  }

  function jitter(seed, boil, amp) {
    const n = Math.sin(seed * 12.9898 + boil * 78.233) * 43758.5453;
    return (n - Math.floor(n) - 0.5) * 2 * amp;
  }

  function wobblyStroke(ctx, pts, boil, amp = 2.2, close = false) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 1) {
        const px = pts[i][0] + jitter(i * 5 + pass * 19, boil, amp);
        const py = pts[i][1] + jitter(i * 11 + pass * 31, boil, amp);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      if (close) ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  function wobblyBox(ctx, x, y, w, h, boil, fillCol, strokeCol, lw = 3.2, amp = 2.2) {
    ctx.save();
    if (fillCol) {
      // Off-register warm marker wash fill
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, w, h, 10);
      ctx.fill();
    }
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = lw;
    const pts = [
      [x, y],
      [x + w * 0.5, y - 1.5],
      [x + w, y],
      [x + w + 1.5, y + h * 0.5],
      [x + w, y + h],
      [x + w * 0.5, y + h + 1.5],
      [x, y + h],
      [x - 1.5, y + h * 0.5],
    ];
    wobblyStroke(ctx, pts, boil, amp, true);
    ctx.restore();
  }

  function wobblyCircle(ctx, cx, cy, rx, ry, boil, fillCol, strokeCol, lw = 3.2) {
    ctx.save();
    if (fillCol) {
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(cx + 3, cy + 3, rx, ry, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(cx + 3, cy + 3, rx, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = lw;
    const pts = [];
    const steps = 20;
    for (let i = 0; i < steps; i += 1) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    wobblyStroke(ctx, pts, boil, 1.8, true);
    ctx.restore();
  }

  function chooseFontSize(ctx, text, maxW, targetPx, minPx = 34, fontFam = HAND_FONT) {
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

  function draw(ctx, { width, height, t = 0, palette = {} }) {
    const INK = root.INK;
    if (INK && typeof INK.setBoil === 'function') {
      INK.setBoil(t);
    }
    const boil = Math.floor(t * 8) % 3;
    const ink = palette.ink || '#1c1917';
    const accent = palette.accent2 || '#e11d48';

    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.8;
    // Hand-drawn corner crop marks on the sketchbook sheet
    const m = 28;
    const L = 44;
    wobblyStroke(ctx, [[m, m + L], [m, m], [m + L, m]], boil, 1.6, false);
    wobblyStroke(ctx, [[width - m - L, m], [width - m, m], [width - m, m + L]], boil, 1.6, false);
    wobblyStroke(ctx, [[m, height - m - L], [m, height - m], [m + L, height - m]], boil, 1.6, false);
    wobblyStroke(ctx, [[width - m - L, height - m], [width - m, height - m], [width - m, height - m - L]], boil, 1.6, false);

    // Small hand-drawn registration star in top-right margin
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    const sx = width - 68;
    const sy = 56;
    wobblyStroke(ctx, [[sx - 12, sy], [sx + 12, sy]], boil, 1.4, false);
    wobblyStroke(ctx, [[sx, sy - 12], [sx, sy + 12]], boil, 1.4, false);
    ctx.restore();
  }

  function drawCard(ctx, { x, y, width, height, t = 0, palette = {}, alpha = 1 }) {
    const boil = Math.floor(t * 8) % 3;
    ctx.save();
    ctx.globalAlpha = alpha;
    wobblyBox(ctx, x, y, width, height, boil, '#fffdf8', palette.ink || '#1c1917', 3.5, 2.4);
    ctx.restore();
  }

  /** Renders the active beat directly onto the open sketchbook paper (no giant bounding box!). */
  function drawBeat(ctx, { beat, rect, t, u, palette, recordText, words = [] }) {
    const INK = root.INK;
    if (INK && typeof INK.setBoil === 'function') {
      INK.setBoil(t);
    }
    const boil = Math.floor(t * 8) % 3;
    const ink = '#1c1917';
    const graphite = '#44403c';
    const crimson = '#d92638';
    const cobalt = '#1f4fc2';
    const emerald = '#15803d';
    const highlighter = '#fde047';
    const warmNote = '#fffdf7';

    const content = beat.content || {};
    const title = content.title || content.text || beat.id;
    const sub = content.subtitle || '';
    const kicker = content.kicker ? String(content.kicker).toUpperCase() : '';
    const items = Array.isArray(content.items) ? content.items : [];
    const lanes = Array.isArray(content.lanes) ? content.lanes : [];

    const innerX = rect.x + 20;
    const innerW = rect.width - 40;
    let cursorY = rect.y + 48;

    ctx.save();
    ctx.globalAlpha = u;

    // 1. Kicker with off-register yellow highlighter slash + hand-sketched arrow
    if (kicker) {
      const kSize = 34;
      ctx.font = `700 ${kSize}px ${MONO_FONT}`;
      const kw = ctx.measureText(kicker).width;
      wobblyBox(ctx, innerX - 6, cursorY - 30, kw + 28, 40, boil, highlighter, ink, 2.6, 1.6);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(kicker, innerX + 8, cursorY);
      recordText(kicker, innerX + 8, cursorY, kSize, 'left', false);

      // Hand-drawn curved arrow from kicker toward headline
      if (INK && typeof INK.arrow === 'function') {
        INK.arrow(ctx, innerX + kw + 38, cursorY - 12, innerX + kw + 118, cursorY + 8, smoothstep((t - beat.start) / 0.35), {
          color: crimson,
          w: 3.5,
          curve: -14,
          seed: 19,
        });
      } else {
        ctx.strokeStyle = crimson;
        ctx.lineWidth = 3;
        wobblyStroke(ctx, [[innerX + kw + 36, cursorY - 10], [innerX + kw + 110, cursorY - 10]], boil, 1.5, false);
      }
      cursorY += 66;
    } else {
      cursorY += 16;
    }

    // 2. Bold hand-lettered marker headline on open paper (>= 56px) + double marker underline
    const titleSize = chooseFontSize(ctx, title, innerW, 60, 56, HAND_FONT);
    ctx.font = `700 ${titleSize}px ${HAND_FONT}`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const titleWords = String(title).split(/\s+/);
    const titleLines = [];
    if (ctx.measureText(title).width > innerW && titleWords.length > 2) {
      const mid = Math.ceil(titleWords.length * 0.5);
      titleLines.push(titleWords.slice(0, mid).join(' '), titleWords.slice(mid).join(' '));
    } else {
      titleLines.push(String(title));
    }
    let titleW = 0;
    for (let li = 0; li < titleLines.length; li += 1) {
      const ln = titleLines[li];
      ctx.fillText(ln, innerX, cursorY);
      recordText(ln, innerX, cursorY, titleSize, 'left', true);
      titleW = Math.max(titleW, Math.min(innerW, ctx.measureText(ln).width));
      if (li < titleLines.length - 1) cursorY += titleSize + 6;
    }

    const underProg = smoothstep((t - beat.start - 0.08) / 0.38);
    if (underProg > 0.02) {
      const ux1 = innerX + titleW * underProg;
      ctx.strokeStyle = crimson;
      ctx.lineWidth = 6;
      wobblyStroke(ctx, [[innerX, cursorY + 12], [ux1, cursorY + 10]], boil, 2.0, false);
      ctx.strokeStyle = cobalt;
      ctx.lineWidth = 3;
      wobblyStroke(ctx, [[innerX + 8, cursorY + 19], [ux1 - 6, cursorY + 18]], boil, 1.6, false);
    }
    cursorY += 52;

    // 3. Subtitle in warm graphite
    if (sub) {
      const subSize = chooseFontSize(ctx, sub, innerW, 36, 34, HAND_FONT);
      ctx.font = `700 ${subSize}px ${HAND_FONT}`;
      ctx.fillStyle = graphite;
      ctx.fillText(sub, innerX, cursorY);
      recordText(sub, innerX, cursorY, subSize, 'left', false);
      cursorY += 42;
    }

    const remainH = Math.max(120, rect.y + rect.height - cursorY - 18);

    // 4. Lyric Beat: hand-drawn thought cloud + sketchy ink waveform
    if (beat.type === 'lyric') {
      const activeWords = words.filter((w) => w.end > beat.start && w.start < beat.end);
      const activeWord =
        activeWords.find((w) => t >= w.start && t < w.end) ||
        activeWords.filter((w) => w.start <= t).pop() ||
        activeWords[0];
      const highlightTxt = activeWord ? String(activeWord.text).toUpperCase() : String(content.text || title).toUpperCase();
      const panelH = Math.max(116, Math.floor(remainH * 0.52));

      if (INK && typeof INK.thought === 'function') {
        INK.thought(ctx, innerX + innerW * 0.5, cursorY + panelH * 0.5, innerW * 0.46, panelH * 0.44, 1, {
          fill: warmNote,
          stroke: ink,
          w: 3.5,
          bumps: 12,
          seed: 31,
        });
      } else {
        wobblyBox(ctx, innerX, cursorY, innerW, panelH, boil, warmNote, ink, 3.5, 2.4);
      }

      const lSize = chooseFontSize(ctx, highlightTxt, innerW - 72, 60, 56, HAND_FONT);
      const cx = innerX + Math.round(innerW * 0.5);
      const cy = cursorY + Math.round(panelH * 0.58);
      ctx.font = `700 ${lSize}px ${HAND_FONT}`;
      ctx.fillStyle = crimson;
      ctx.textAlign = 'center';
      ctx.fillText(highlightTxt, cx, cy);
      recordText(highlightTxt, cx, cy, lSize, 'center', true);

      // Sketchy ink waveform strokes below thought cloud
      const waveY = cursorY + panelH + 20;
      const waveH = Math.max(52, remainH - panelH - 24);
      const bars = 22;
      const step = innerW / bars;
      for (let i = 0; i < bars; i += 1) {
        const amp = 0.22 + 0.78 * Math.abs(Math.sin(t * 4.2 + i * 0.39) * Math.cos(t * 1.8 - i * 0.23));
        const bh = Math.max(12, waveH * amp);
        const bx = innerX + i * step + step * 0.5;
        ctx.strokeStyle = i % 3 === 0 ? crimson : i % 2 === 0 ? cobalt : ink;
        ctx.lineWidth = 4.5;
        wobblyStroke(ctx, [[bx, waveY + waveH], [bx, waveY + waveH - bh]], boil, 1.5, false);
      }
      ctx.restore();
      return;
    }

    // 5. Sketchbook Diagram Note Cards for Lanes, Items, or Callouts (zero truncation!)
    const rows =
      lanes.length > 0
        ? lanes.map((l, i) => ({
            badge: `0${i + 1}`,
            label: l.label,
            metric: l.metric || '',
            detail: l.detail || '',
            accent: l.state === 'blocked' ? crimson : i % 2 === 0 ? cobalt : emerald,
            wash: i % 2 === 0 ? '#fffdf7' : '#fef9c3',
          }))
        : items.length > 0
          ? items.map((it, i) => ({
              badge: typeof it === 'object' && it.badge ? it.badge : `0${i + 1}`,
              label: typeof it === 'string' ? it : it.text || '',
              metric: typeof it === 'object' && it.value ? it.value : '',
              detail: '',
              accent: i === 0 ? cobalt : i === 1 ? crimson : emerald,
              wash: i % 2 === 0 ? '#fffdf7' : '#fef3c7',
            }))
          : [
              {
                badge: content.statLabel || '01',
                label: content.callout || 'Deterministic Frame Clock',
                metric: content.stat || '30 FPS',
                detail: '',
                accent: cobalt,
                wash: '#fffdf7',
              },
              {
                badge: '02',
                label: content.point2 || '10-Slot Look Resolver',
                metric: content.badge || 'VERIFIED',
                detail: '',
                accent: emerald,
                wash: '#fef3c7',
              },
            ];

    const gap = 18;
    const rowH = Math.max(78, Math.floor((remainH - gap * (rows.length - 1)) / rows.length));
    rows.forEach((r, idx) => {
      const iu = smoothstep((t - (beat.start + 0.14 + idx * 0.18)) / 0.34);
      if (iu <= 0.02) return;
      const ry = cursorY + idx * (rowH + gap);

      ctx.save();
      ctx.globalAlpha = u * iu;

      // Wobbly hand-inked note card with off-register warm wash
      wobblyBox(ctx, innerX, ry, innerW, rowH, boil, r.wash, ink, 3.2, 2.2);

      // Diagonal hand-hatched accent margin on left of card
      ctx.strokeStyle = r.accent;
      ctx.lineWidth = 2.5;
      for (let h = 10; h < rowH - 10; h += 12) {
        wobblyStroke(ctx, [[innerX + 8, ry + h], [innerX + 20, ry + h - 8]], boil, 1.0, false);
      }

      const textY = ry + Math.round(rowH * (r.detail ? 0.44 : 0.6));

      // Hand-circled badge number
      const badgeCx = innerX + 64;
      const badgeCy = textY - 12;
      wobblyCircle(ctx, badgeCx, badgeCy, 32, 22, boil, highlighter, r.accent, 2.8);
      ctx.font = `700 34px ${MONO_FONT}`;
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.fillText(String(r.badge), badgeCx, textY);

      // Metric pill circled in crimson/cobalt on the right (never truncated!)
      let metricW = 0;
      if (r.metric) {
        const mStr = String(r.metric);
        const mSize = chooseFontSize(ctx, mStr, 260, 36, 34, HAND_FONT);
        ctx.font = `700 ${mSize}px ${HAND_FONT}`;
        const mw = ctx.measureText(mStr).width;
        metricW = mw + 48;
        const mCx = innerX + innerW - 28 - mw * 0.5;
        wobblyCircle(ctx, mCx, textY - 12, mw * 0.5 + 16, 22, boil, '#ffffff', r.accent, 2.6);
        ctx.fillStyle = r.accent;
        ctx.textAlign = 'right';
        ctx.fillText(mStr, innerX + innerW - 28, textY);
        recordText(mStr, innerX + innerW - 28, textY, mSize, 'right', true);
      }

      // Main note label
      const labelX = innerX + 116;
      const availLabelW = Math.max(180, innerW - 144 - metricW);
      const lSize = chooseFontSize(ctx, r.label, availLabelW, 36, 34, HAND_FONT);
      ctx.font = `700 ${lSize}px ${HAND_FONT}`;
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      ctx.fillText(r.label, labelX, textY);
      recordText(r.label, labelX, textY, lSize, 'left', true);

      if (r.detail && rowH >= 88) {
        const detY = ry + Math.round(rowH * 0.8);
        const dSize = chooseFontSize(ctx, r.detail, innerW - 148, 34, 34, HAND_FONT);
        ctx.font = `700 ${dSize}px ${HAND_FONT}`;
        ctx.fillStyle = graphite;
        ctx.fillText(r.detail, labelX, detY);
        recordText(r.detail, labelX, detY, dSize, 'left', false);
      }

      ctx.restore();
    });

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/ink-boil'] = {
    kind: 'layer',
    id: 'ink-boil',
    slot: 'marks',
    requires: ['light-ground', 'paper-tooth', 'matte'],
    provides: ['ink-marks'],
    draw,
    drawCard,
    drawBeat,
  };
})(typeof window !== 'undefined' ? window : globalThis);
