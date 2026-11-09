// neon-bloom: atmospheric halation bloom, wet-street reflection glints, vignette, and 2x2 film grain.
(function (root) {
  'use strict';

  function draw(ctx, { width, height, t = 0 }) {
    const H = root.H;
    const isVert = height > width;
    const streetY = Math.round(height * (isVert ? 0.86 : 0.83));
    const flicker = 0.92 + 0.08 * Math.sin(t * 37.7) * Math.cos(t * 17.3);

    ctx.save();
    if (typeof ctx.createRadialGradient === 'function') {
      const g1 = ctx.createRadialGradient(
        width * 0.52,
        streetY * 0.45,
        10,
        width * 0.52,
        streetY * 0.45,
        width * 0.48
      );
      g1.addColorStop(0, 'rgba(255, 42, 133, 0.08)');
      g1.addColorStop(0.5, 'rgba(0, 229, 255, 0.04)');
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = flicker;
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);
    }

    if (H && typeof document !== 'undefined') {
      H.vignette(ctx, { strength: 0.56, inner: 0.38 });
      H.grain(ctx, t, { strength: 0.032, cell: 2, seed: 55 });
    } else {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.lineWidth = 24;
      ctx.strokeRect(0, 0, width, height);
    }
    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/neon-bloom'] = {
    kind: 'layer',
    id: 'neon-bloom',
    slot: 'finish',
    requires: ['dark-ground', 'neon-emissive'],
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
