// Marks layer: neon-tube (multi-pass glowing glass neon tubes + electrode mounts, requires light-map, provides emissive).
(function (root) {
  'use strict';
  function drawNeonRail(ctx, x1, y1, x2, y2, color, coreColor, flicker) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.22 * flicker;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.globalAlpha = 0.58 * flicker;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = coreColor || '#f0fdfa';
    ctx.globalAlpha = 0.92 * flicker;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Rubber electrode boots at ends
    ctx.fillStyle = '#1e1b2e';
    ctx.globalAlpha = 0.95;
    ctx.fillRect(x1 - 5, y1 - 5, 10, 10);
    ctx.fillRect(x2 - 5, y2 - 5, 10, 10);
    ctx.restore();
  }

  const plugin = {
    kind: 'layer',
    id: 'neon-tube',
    slot: 'marks',
    requires: ['light-map'],
    provides: ['emissive'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {} } = state;
      const accent = palette.accent || '#22d3ee';
      const accent2 = palette.accent2 || '#f472b6';
      const flicker = 0.94 + 0.06 * Math.sin(t * 19.0) * Math.cos(t * 7.3);
      const pad = 32;
      drawNeonRail(ctx, pad, pad, pad + 180, pad, accent, '#e0f2fe', flicker);
      drawNeonRail(ctx, pad, pad, pad, pad + 120, accent, '#e0f2fe', flicker);
      drawNeonRail(ctx, width - pad - 180, pad, width - pad, pad, accent2, '#fce7f3', flicker);
      drawNeonRail(ctx, width - pad, pad, width - pad, pad + 120, accent2, '#fce7f3', flicker);
    },
    drawCard(ctx, card) {
      if (!ctx || !card) return;
      const { x, y, width, height, t = 0, palette = {}, alpha = 1 } = card;
      const accent = palette.accent || '#22d3ee';
      const accent2 = palette.accent2 || '#f472b6';
      const flicker = (0.95 + 0.05 * Math.sin(t * 17.0)) * alpha;
      ctx.save();
      ctx.globalAlpha = 0.92 * alpha;
      ctx.fillStyle = palette.cardBg || 'rgba(15, 11, 31, 0.92)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 22);
      ctx.fill();

      // Outer halo stroke
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.26 * flicker;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 22);
      ctx.stroke();

      // Crisp glass tube border
      ctx.globalAlpha = 0.88 * flicker;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 22);
      ctx.stroke();

      // Secondary magenta accent rail along top & bottom
      drawNeonRail(ctx, x + 36, y, x + Math.min(width - 36, 320), y, accent2, '#fdf2f8', flicker);
      drawNeonRail(ctx, x + width - Math.min(width - 36, 260), y + height, x + width - 36, y + height, accent, '#f0fdfa', flicker);
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/neon-tube'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
