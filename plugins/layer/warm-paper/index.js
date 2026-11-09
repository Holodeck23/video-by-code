// warm-paper: warm cream fibrous sketchbook paper via H.paperTexture, ruled grid, and faint pencil marginalia.
(function (root) {
  'use strict';

  function draw(ctx, { width, height, palette = {} }) {
    const H = root.H;
    const base = palette.bg || '#f4efe4';

    ctx.save();
    if (H && typeof document !== 'undefined') {
      const tex = H.paperTexture(width, height, {
        seed: 7,
        tone: base,
        fiber: 0.45,
        grain: 0.38,
        blotch: 0.28,
      });
      ctx.drawImage(tex, 0, 0);
    } else {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle sketchbook dot/rule lines
    ctx.strokeStyle = '#d6cbb5';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.34;
    const step = 48;
    for (let y = step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(36, y);
      ctx.lineTo(width - 36, y);
      ctx.stroke();
    }

    // Vertical sketchbook margin rule
    ctx.strokeStyle = '#e11d48';
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 2;
    const marginX = height > width ? 68 : 84;
    ctx.beginPath();
    ctx.moveTo(marginX, 28);
    ctx.lineTo(marginX, height - 28);
    ctx.stroke();

    // Faint erased pencil construction notes in background corners (like study.js whiteboard)
    ctx.globalAlpha = 0.065;
    ctx.fillStyle = '#292524';
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2.5;
    ctx.font = '700 38px "Chalkboard SE", "Marker Felt", cursive, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('f(t) -> frame', width - 54, 72);
    ctx.beginPath();
    ctx.arc(width - 110, 120, 42, 0.2, Math.PI * 1.35);
    ctx.stroke();

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/warm-paper'] = {
    kind: 'layer',
    id: 'warm-paper',
    slot: 'ground',
    provides: ['light-ground', 'paper-tooth', 'matte'],
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
