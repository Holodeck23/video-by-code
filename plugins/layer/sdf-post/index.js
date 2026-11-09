// Finish layer: sdf-post (spectral rim bars and deep-space vignette, requires emissive, provides hdr-bloom).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'layer',
    id: 'sdf-post',
    slot: 'finish',
    requires: ['emissive'],
    provides: ['hdr-bloom'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {} } = state;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      ctx.save();
      ctx.strokeStyle = palette.accent || '#38bdf8';
      ctx.globalAlpha = 0.16 + 0.08 * pulse;
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/sdf-post'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
