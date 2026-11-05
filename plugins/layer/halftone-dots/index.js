/**
 * Layer Plugin: halftone-dots (plugins/layer/halftone-dots/index.js)
 *
 * Deterministic halftone dot field for the 'marks' layer slot.
 */
(function initHalftoneDotsPlugin(root) {
  'use strict';

  /**
   * Renders a subtle modulated halftone dot grid across the stage ground.
   */
  function draw(ctx, state) {
    const width = Number(state.width || 1920);
    const height = Number(state.height || 1080);
    const t = Number(state.t || 0);
    const params = state.params || {};
    const spacing = Number(params.spacing || 48);
    const baseRadius = Number(params.radius || 2.2);
    const opacity = Number(params.opacity ?? 0.14);

    ctx.save();
    ctx.fillStyle = (state.palette && state.palette.accent) || '#38bdf8';
    ctx.globalAlpha = opacity;

    for (let y = spacing * 0.5; y < height; y += spacing) {
      const rowIdx = Math.floor(y / spacing);
      const offsetX = (rowIdx % 2) * (spacing * 0.5);
      for (let x = spacing * 0.5 + offsetX; x < width; x += spacing) {
        const wave = Math.sin(x * 0.004 + y * 0.004 + t * 0.6) * 0.5 + 0.5;
        const r = baseRadius * (0.65 + wave * 0.55);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const plugin = {
    id: 'halftone-dots',
    kind: 'layer',
    slot: 'marks',
    draw
  };

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/halftone-dots'] = plugin;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = plugin;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
