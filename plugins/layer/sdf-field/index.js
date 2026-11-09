// Ground layer: sdf-field (procedural signed-distance-field contour field reactive to music beat phase, provides light-map + audio-reactive).
(function (root) {
  'use strict';
  function beatPhaseAt(music, t) {
    const beats = music?.beats;
    if (Array.isArray(beats) && beats.length >= 2) {
      for (let i = 0; i < beats.length - 1; i++) {
        if (t >= beats[i] && t < beats[i + 1]) {
          return (t - beats[i]) / Math.max(0.05, beats[i + 1] - beats[i]);
        }
      }
    }
    return (t * 2.0) % 1;
  }

  const plugin = {
    kind: 'layer',
    id: 'sdf-field',
    slot: 'ground',
    requires: [],
    provides: ['light-map', 'audio-reactive'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {}, music = {} } = state;
      const phase = beatPhaseAt(music, t);
      const pulse = Math.exp(-phase * 3.2);
      ctx.save();
      ctx.fillStyle = palette.bg || '#060913';
      ctx.fillRect(0, 0, width, height);

      // Perspective SDF horizon grid
      const horizon = Math.round(height * 0.62);
      ctx.strokeStyle = palette.surface || '#131c31';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const y = horizon + Math.round(u * u * (height - horizon));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let i = -6; i <= 6; i++) {
        const topX = Math.round(width * 0.5 + i * 70);
        const botX = Math.round(width * 0.5 + i * 240);
        ctx.beginPath();
        ctx.moveTo(topX, horizon);
        ctx.lineTo(botX, height);
        ctx.stroke();
      }

      // Smooth-minimum SDF iso-contour rings around two orbiting attractors
      const cx1 = width * 0.34 + Math.cos(t * 0.9) * 110;
      const cy1 = height * 0.44 + Math.sin(t * 1.2) * 65;
      const cx2 = width * 0.66 + Math.cos(t * 0.7 + 2.1) * 110;
      const cy2 = height * 0.46 + Math.sin(t * 1.1 + 1.4) * 65;
      for (let r = 1; r <= 6; r++) {
        const rad = 52 * r + pulse * 18;
        ctx.strokeStyle = r % 2 === 0 ? (palette.accent || '#38bdf8') : (palette.accent2 || '#f43f5e');
        ctx.globalAlpha = 0.08 + (6 - r) * 0.025;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx1, cy1, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx2, cy2, rad * 0.92, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/sdf-field'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
