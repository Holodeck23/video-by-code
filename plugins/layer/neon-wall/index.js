// Ground layer: neon-wall (dark masonry wall + wet-asphalt reflection plane, provides light-map).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'layer',
    id: 'neon-wall',
    slot: 'ground',
    requires: [],
    provides: ['light-map'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {} } = state;
      const bg = palette.bg || '#090714';
      const surface = palette.surface || '#151029';
      const accent = palette.accent || '#22d3ee';
      const accent2 = palette.accent2 || '#f472b6';
      ctx.save();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Staggered dark brick courses
      const brickH = 44;
      const brickW = 108;
      const horizonY = Math.round(height * 0.84);
      ctx.strokeStyle = surface;
      ctx.lineWidth = 1.5;
      for (let y = 0, row = 0; y < horizonY; y += brickH, row++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        const offset = (row % 2) * (brickW * 0.5);
        for (let x = offset; x < width; x += brickW) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, Math.min(horizonY, y + brickH));
          ctx.stroke();
        }
      }

      // Emissive light-map bounce pools on masonry
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.4);
      ctx.globalAlpha = 0.14 * pulse;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(Math.round(width * 0.28), Math.round(height * 0.42), Math.round(height * 0.36), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent2;
      ctx.beginPath();
      ctx.arc(Math.round(width * 0.74), Math.round(height * 0.38), Math.round(height * 0.34), 0, Math.PI * 2);
      ctx.fill();

      // Wet asphalt reflection plane along lower frame
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#05040c';
      ctx.fillRect(0, horizonY, width, height - horizonY);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();

      for (let i = 1; i <= 5; i++) {
        const ry = horizonY + i * Math.round((height - horizonY) / 6);
        const shift = Math.sin(t * 1.8 + i * 1.1) * 28;
        ctx.strokeStyle = i % 2 === 0 ? accent2 : accent;
        ctx.globalAlpha = 0.18 * (1 - i / 7);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width * 0.12 + shift, ry);
        ctx.lineTo(width * 0.88 + shift, ry);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/neon-wall'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
