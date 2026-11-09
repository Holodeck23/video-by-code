// sdf-post: chromatic aberration edge fringe, scanline micro-modulation, vignette, and 2x2 film grain.
(function (root) {
  'use strict';

  function draw(ctx, { width, height, t = 0 }) {
    const H = root.H;
    ctx.save();

    // Subtle scanline micro-modulation
    ctx.fillStyle = 'rgba(2, 6, 17, 0.14)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1);
    }

    // Radial chromatic rim fringe
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 2.8);
    ctx.strokeStyle = '#f43f5e';
    ctx.strokeRect(4, 2, width - 8, height - 4);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(2, 4, width - 4, height - 8);

    if (H && typeof document !== 'undefined') {
      H.vignette(ctx, { strength: 0.42, inner: 0.52 });
      H.grain(ctx, t, { strength: 0.028, cell: 2, seed: 77 });
    } else {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, width, height);
    }
    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/sdf-post'] = {
    kind: 'layer',
    id: 'sdf-post',
    slot: 'finish',
    requires: ['dark-ground', 'sdf-world', 'sdf-marks'],
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
