/**
 * Beat Plugin: metric-compare (plugins/beat/metric-compare/index.js)
 *
 * Side-by-side metric and latency bar comparison beat for 1080p explainers.
 * Enforces >= 56px titles and >= 34px body text with full-height column bars.
 */
(function initMetricComparePlugin(root) {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function toneColor(tone, palette) {
    if (tone === 'danger') {
      return palette.accent2 || '#f43f5e';
    }
    if (tone === 'accent') {
      return palette.good || '#34d399';
    }
    return palette.accent || '#38bdf8';
  }

  function drawColumn(ctx, col, box, progress, palette, recordText) {
    const color = toneColor(col.tone, palette);
    ctx.fillStyle = palette.bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.text;
    ctx.font = '700 38px Arial, sans-serif';
    const nameText = String(col.name || 'Protocol');
    const nameY = box.y + 52;
    ctx.fillText(nameText, box.x + 24, nameY);
    recordText(nameText, box.x + 24, nameY, 38, 'left', true);

    ctx.fillStyle = color;
    ctx.font = '700 56px Courier, monospace';
    const metricText = String(col.metric || '0 ms');
    const metricY = box.y + 122;
    ctx.fillText(metricText, box.x + 24, metricY);
    recordText(metricText, box.x + 24, metricY, 56, 'left', true);

    const barX = box.x + 24;
    const barY = box.y + 150;
    const barW = box.w - 48;
    const barH = 34;
    ctx.fillStyle = palette.surface;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.fill();

    const ratio = clamp(Number(col.barRatio ?? 0.5), 0.08, 1);
    const fillRatio = clamp(ratio * clamp(progress * 1.4, 0.25, 1), 0.08, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.round(barW * fillRatio), barH, 10);
    ctx.fill();

    const rows = Array.isArray(col.rows) ? col.rows : [];
    for (let i = 0; i < Math.min(rows.length, 3); i += 1) {
      const ry = box.y + 204 + i * 56;
      ctx.fillStyle = palette.surface;
      ctx.beginPath();
      ctx.roundRect(barX, ry, barW, 46, 8);
      ctx.fill();

      ctx.fillStyle = palette.text;
      ctx.font = '700 34px Arial, sans-serif';
      const rText = String(rows[i]);
      const rY = ry + 34;
      ctx.fillText(rText, barX + 16, rY);
      recordText(rText, barX + 16, rY, 34, 'left', false);
    }

    if (col.status) {
      const sy = box.y + box.h - 24;
      ctx.fillStyle = color;
      ctx.font = '700 34px Courier, monospace';
      const sText = String(col.status);
      ctx.fillText(sText, barX, sy);
      recordText(sText, barX, sy, 34, 'left', true);
    }
  }

  /**
   * Renders the metric-compare beat inside state.rect.
   */
  function draw(ctx, state) {
    const beat = state.beat || {};
    const content = beat.content || beat;
    const rect = state.rect || { x: 80, y: 80, width: 1120, height: 800 };
    const rw = rect.width || rect.w || 1120;
    const rh = rect.height || rect.h || 800;
    const t = Number(state.t || 0);
    const palette = state.palette || {};
    const recordText = state.recordText || (() => {});

    ctx.save();
    ctx.fillStyle = palette.cardBg || palette.surface;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rw, rh, 24);
    ctx.fill();
    ctx.stroke();

    const pad = 40;
    const innerX = rect.x + pad;
    const innerW = rw - pad * 2;
    let curY = rect.y + 62;

    const badge = content.badge || content.kicker;
    if (badge) {
      ctx.font = '700 34px Courier, monospace';
      const badgeText = String(badge).toUpperCase();
      ctx.fillStyle = palette.accent;
      ctx.textAlign = 'left';
      ctx.fillText(badgeText, innerX, curY);
      recordText(badgeText, innerX, curY, 34, 'left', false);
      curY += 64;
    }

    const title = content.title || beat.id || 'Comparison';
    ctx.font = '700 60px Arial, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'left';
    ctx.fillText(String(title), innerX, curY);
    recordText(String(title), innerX, curY, 60, 'left', true);
    curY += 36;

    const footer = content.footer;
    const footerReserve = footer ? 58 : 0;
    const colH = Math.max(280, rect.y + rh - curY - pad - footerReserve);
    const gap = 24;
    const colW = Math.floor((innerW - gap) / 2);
    const dur = Math.max(0.1, Number(beat.end) - Number(beat.start));
    const progress = clamp((t - Number(beat.start)) / dur, 0, 1);

    const leftCol = content.leftColumn || {
      name: 'TCP / HTTP/2',
      metric: '240 ms stall',
      barRatio: 0.92,
      tone: 'danger',
      rows: ['1 shared TCP stream', 'Pkt #42 blocks all'],
      status: 'BLOCKED: 3 lanes waiting'
    };
    const rightCol = content.rightColumn || {
      name: 'QUIC / HTTP/3',
      metric: '18 ms clear',
      barRatio: 0.18,
      tone: 'accent',
      rows: ['3 independent UDP lanes', 'S2 & S3 deliver now'],
      status: 'READY: 0 ms cascade stall'
    };

    drawColumn(
      ctx,
      leftCol,
      { x: innerX, y: curY, w: colW, h: colH },
      progress,
      palette,
      recordText
    );
    drawColumn(
      ctx,
      rightCol,
      { x: innerX + colW + gap, y: curY, w: colW, h: colH },
      progress,
      palette,
      recordText
    );

    if (footer) {
      const fy = rect.y + rh - 34;
      ctx.fillStyle = palette.muted;
      ctx.font = '600 34px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(footer), innerX, fy);
      recordText(String(footer), innerX, fy, 34, 'left', false);
    }

    ctx.restore();
  }

  const plugin = {
    id: 'metric-compare',
    kind: 'beat',
    draw
  };

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['beat/metric-compare'] = plugin;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = plugin;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
