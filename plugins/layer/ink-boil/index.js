// Marks layer: ink-boil (8 fps 3-state hand-drawn line boil, wobbled ink borders and highlighter swipes).
(function (root) {
  'use strict';
  function jitter(seed, idx, boilFrame, amp) {
    let h = Math.imul((seed + idx * 37 + boilFrame * 131) ^ 0x6d2b79f5, 0x85ebca6b);
    h = (h ^ (h >>> 13)) >>> 0;
    return ((h / 4294967296) * 2 - 1) * amp;
  }

  function wobbledRect(ctx, x, y, w, h, boilFrame, seed, amp = 2.8) {
    const steps = 8;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const px = x + (w * i) / steps + jitter(seed, i, boilFrame, amp);
      const py = y + jitter(seed + 10, i, boilFrame, amp);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = 1; i <= steps; i++) {
      ctx.lineTo(x + w + jitter(seed + 20, i, boilFrame, amp), y + (h * i) / steps + jitter(seed + 30, i, boilFrame, amp));
    }
    for (let i = steps - 1; i >= 0; i--) {
      ctx.lineTo(x + (w * i) / steps + jitter(seed + 40, i, boilFrame, amp), y + h + jitter(seed + 50, i, boilFrame, amp));
    }
    for (let i = steps - 1; i >= 0; i--) {
      ctx.lineTo(x + jitter(seed + 60, i, boilFrame, amp), y + (h * i) / steps + jitter(seed + 70, i, boilFrame, amp));
    }
    ctx.closePath();
  }

  const plugin = {
    kind: 'layer',
    id: 'ink-boil',
    slot: 'marks',
    requires: ['matte'],
    provides: ['ink-boil'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {} } = state;
      const boil = Math.floor(t * 8) % 3;
      ctx.save();
      ctx.strokeStyle = palette.ink || '#1c1917';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.35;
      // Notebook binder holes along top or left
      const holes = 6;
      for (let i = 0; i < holes; i++) {
        const hy = Math.round(height * 0.14 + (i * height * 0.72) / (holes - 1));
        ctx.beginPath();
        ctx.arc(38 + jitter(99, i, boil, 1.2), hy + jitter(199, i, boil, 1.2), 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
    drawCard(ctx, card) {
      if (!ctx || !card) return;
      const { x, y, width, height, t = 0, palette = {}, alpha = 1 } = card;
      const boil = Math.floor(t * 8) % 3;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Offset drop-shadow wash
      ctx.fillStyle = 'rgba(28, 25, 23, 0.09)';
      wobbledRect(ctx, x + 8, y + 10, width, height, boil, 11, 2.2);
      ctx.fill();

      // Warm paper card fill
      ctx.fillStyle = palette.face || '#fffdf9';
      wobbledRect(ctx, x, y, width, height, boil, 29, 2.5);
      ctx.fill();

      // Highlighter swipe across header band
      ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
      ctx.fillRect(x + 28, y + 26 + jitter(41, 1, boil, 1.5), Math.min(width - 56, 420), 26);

      // Double-pass fountain-pen wobbled border
      ctx.strokeStyle = palette.ink || '#1c1917';
      ctx.lineWidth = 3.2;
      wobbledRect(ctx, x, y, width, height, boil, 29, 2.6);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = 1.6;
      wobbledRect(ctx, x + 2, y + 2, width - 4, height - 4, (boil + 1) % 3, 73, 2.2);
      ctx.stroke();

      // Masking-tape strips at top-left and top-right corners
      ctx.globalAlpha = alpha * 0.72;
      ctx.fillStyle = '#e7dec8';
      ctx.fillRect(x - 10, y + 14, 52, 18);
      ctx.fillRect(x + width - 42, y + 14, 52, 18);
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/ink-boil'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
