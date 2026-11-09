// Finish layer: paper-grain (warm print registration marks and paper edge wash, requires matte).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'layer',
    id: 'paper-grain',
    slot: 'finish',
    requires: ['matte'],
    provides: [],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, palette = {} } = state;
      ctx.save();
      ctx.strokeStyle = palette.ink || '#1c1917';
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, width - 36, height - 36);
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/paper-grain'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
