// Marks layer: sdf-forms (audio-reactive smooth-minimum SDF metaball/torus forms + harmonic HUD framing).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'layer',
    id: 'sdf-forms',
    slot: 'marks',
    requires: ['audio-reactive'],
    provides: ['emissive'],
    draw(ctx, state) {
      if (!ctx || !state) return;
      const { width, height, t = 0, palette = {}, music = {} } = state;
      const beats = music?.beats || [];
      let beatPulse = 0.5 + 0.5 * Math.sin(t * 4.0);
      for (let i = 0; i < beats.length; i++) {
        const dt = t - beats[i];
        if (dt >= 0 && dt < 0.45) {
          beatPulse = Math.max(beatPulse, Math.exp(-dt * 6.0));
        }
      }
      const cx = Math.round(width * 0.5);
      const cy = Math.round(height * 0.48);
      const baseR = Math.min(width, height) * (0.14 + 0.025 * beatPulse);

      ctx.save();
      // Orbiting SDF lobes with smooth-minimum bridge filaments
      const lobes = 5;
      for (let i = 0; i < lobes; i++) {
        const ang = (i * Math.PI * 2) / lobes + t * 0.65;
        const dist = baseR * (1.15 + 0.22 * Math.sin(t * 1.7 + i));
        const lx = cx + Math.cos(ang) * dist;
        const ly = cy + Math.sin(ang) * dist * 0.68;
        const lr = baseR * (0.36 + 0.08 * Math.cos(t * 2.3 + i));

        ctx.strokeStyle = i % 2 === 0 ? (palette.accent || '#38bdf8') : (palette.accent2 || '#f43f5e');
        ctx.fillStyle = palette.surface || '#131c31';
        ctx.globalAlpha = 0.42;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rim-lit inner core
        ctx.fillStyle = i % 2 === 0 ? (palette.accent || '#38bdf8') : (palette.good || '#34d399');
        ctx.globalAlpha = 0.28 + 0.22 * beatPulse;
        ctx.beginPath();
        ctx.arc(lx - lr * 0.18, ly - lr * 0.18, lr * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    drawCard(ctx, card) {
      if (!ctx || !card) return;
      const { x, y, width, height, t = 0, palette = {}, alpha = 1 } = card;
      ctx.save();
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillStyle = palette.cardBg || 'rgba(11, 16, 30, 0.88)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 20);
      ctx.fill();

      ctx.strokeStyle = palette.accent || '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 20);
      ctx.stroke();

      // Inner iso-contour ring + audio-reactive frequency ticks along bottom edge
      ctx.strokeStyle = palette.accent2 || '#f43f5e';
      ctx.globalAlpha = alpha * 0.45;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x + 8, y + 8, width - 16, height - 16, 14);
      ctx.stroke();

      const bars = 24;
      const barSpan = Math.min(width - 96, 480);
      const step = barSpan / bars;
      ctx.fillStyle = palette.good || '#34d399';
      ctx.globalAlpha = alpha * 0.55;
      for (let i = 0; i < bars; i++) {
        const bh = 6 + Math.round(14 * Math.abs(Math.sin(t * 3.8 + i * 0.45)));
        ctx.fillRect(x + width - barSpan - 36 + i * step, y + height - 12 - bh, Math.max(3, step - 4), bh);
      }
      ctx.restore();
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/sdf-forms'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
