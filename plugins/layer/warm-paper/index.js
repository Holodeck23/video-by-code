// Ground layer: warm-paper (matte notebook paper with ruled blue lines, red margin rule and fiber flecks, provides matte).
(function (root) {
  'use strict';
  function hash(n) {
    let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    return ((Math.imul(x, 0xc2b2ae35) ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  const plugin = {
    kind: 'layer',
    id: 'warm-paper',
    slot: 'ground',
    requires: [],
    provides: ['matte'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, palette = {} } = state;
      ctx.save();
      ctx.fillStyle = palette.bg || '#f4efe4';
      ctx.fillRect(0, 0, width, height);

      // Warm notebook ruled lines
      ctx.strokeStyle = 'rgba(59, 110, 165, 0.18)';
      ctx.lineWidth = 1.5;
      const ruleStep = 48;
      for (let y = 96; y < height - 48; y += ruleStep) {
        ctx.beginPath();
        ctx.moveTo(32, y);
        ctx.lineTo(width - 32, y);
        ctx.stroke();
      }

      // Vertical red notebook margin line
      const marginX = height > width ? 74 : 104;
      ctx.strokeStyle = 'rgba(217, 70, 70, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, 0);
      ctx.lineTo(marginX, height);
      ctx.stroke();

      // Deterministic paper fibers
      ctx.fillStyle = palette.muted || '#57534e';
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 48; i++) {
        const fx = Math.round(hash(i * 17 + 1) * width);
        const fy = Math.round(hash(i * 31 + 2) * height);
        ctx.fillRect(fx, fy, 4 + (i % 5), 2);
      }
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/warm-paper'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
