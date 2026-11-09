// paper-grain: light-ground paper grain overlay and warm sepia vignette via H.grain / H.vignette.
(function (root) {
  'use strict';

  function draw(ctx, { width, height, t = 0 }) {
    const H = root.H;
    ctx.save();
    if (H && typeof document !== 'undefined') {
      H.grain(ctx, t, { strength: 0.028, cell: 2, seed: 11, fps: 12 });
      H.vignette(ctx, { strength: 0.22, color: '#5a3c1e', inner: 0.62 });
    } else {
      ctx.strokeStyle = 'rgba(120, 98, 68, 0.24)';
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, width, height);
    }
    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/paper-grain'] = {
    kind: 'layer',
    id: 'paper-grain',
    slot: 'finish',
    requires: ['light-ground', 'ink-marks'],
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
