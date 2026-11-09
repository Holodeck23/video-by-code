// Finish layer: neon-bloom (atmospheric HDR halo + scanline finish, requires emissive, provides hdr-bloom).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'layer',
    id: 'neon-bloom',
    slot: 'finish',
    requires: ['emissive'],
    provides: ['hdr-bloom'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {} } = state;
      ctx.save();
      // Subtle atmospheric scanlines
      ctx.fillStyle = palette.accent || '#22d3ee';
      ctx.globalAlpha = 0.025;
      const offset = Math.floor(t * 24) % 6;
      for (let y = offset; y < height; y += 6) {
        ctx.fillRect(0, y, width, 1);
      }
      // Edge frame glow
      ctx.strokeStyle = palette.accent2 || '#f472b6';
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/neon-bloom'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
