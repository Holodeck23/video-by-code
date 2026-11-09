// neon-wall: running-bond brick wall, 1/8-res colored light map, and wet asphalt reflection plane.
(function (root) {
  'use strict';

  const BRICK_TONES = ['#e66a4c', '#c85a42', '#f5825c', '#b4604e', '#dc785a', '#8c4c3e'];

  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function beatPulse(music, t) {
    const beats = music?.beats;
    if (!Array.isArray(beats) || !beats.length) {
      return 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    }
    let last = 0;
    for (let i = 0; i < beats.length; i += 1) {
      if (beats[i] <= t) last = beats[i];
      else break;
    }
    return Math.exp(-Math.max(0, t - last) * 5.5);
  }

  function renderBrickWall(g, width, height, streetY) {
    const H = root.H;
    const rng = H ? H.rng(16) : () => 0.5;
    const noise = H ? H.noise(16) : null;

    g.fillStyle = '#14121d';
    g.fillRect(0, 0, width, height);

    const bw = 156;
    const bh = 52;
    const mortar = 4;
    const rows = Math.ceil(streetY / bh) + 1;
    const cols = Math.ceil(width / bw) + 2;

    for (let r = 0; r < rows; r += 1) {
      const y = r * bh;
      const offset = (r % 2) * (bw * 0.5);
      // Horizontal mortar joint
      g.fillStyle = 'rgba(190, 182, 172, 0.08)';
      g.fillRect(0, y, width, mortar);

      for (let c = -1; c < cols; c += 1) {
        const x = Math.round(c * bw + offset);
        const idx = Math.floor(rng() * BRICK_TONES.length);
        const tone = BRICK_TONES[idx];
        const stain = noise ? noise.fbm2(c * 0.35, r * 0.35, 3) : (hash(r * 31 + c * 17) - 0.5) * 0.3;
        const alpha = Math.max(0.08, Math.min(0.24, 0.16 + stain * 0.08));

        g.save();
        g.globalAlpha = alpha;
        g.fillStyle = tone;
        g.beginPath();
        g.roundRect(x + mortar, y + mortar, bw - mortar * 2, bh - mortar * 2, 3);
        g.fill();

        // Top highlight bevel & bottom shadow bevel on each brick
        g.fillStyle = 'rgba(255, 228, 210, 0.22)';
        g.fillRect(x + mortar + 2, y + mortar + 1, bw - mortar * 2 - 4, 2);
        g.fillStyle = 'rgba(0, 0, 0, 0.48)';
        g.fillRect(x + mortar + 2, y + bh - mortar - 3, bw - mortar * 2 - 4, 3);
        g.restore();
      }
    }
  }

  function draw(ctx, { width, height, t = 0, music }) {
    const H = root.H;
    const isVert = height > width;
    const streetY = Math.round(height * (isVert ? 0.86 : 0.83));
    const pulse = beatPulse(music, t);
    const hum = 0.94 + 0.06 * Math.sin(t * 37.7);

    ctx.save();
    // 1. Brick wall base (cached offscreen in browser, direct fallback in mock canvas)
    if (H && typeof document !== 'undefined') {
      const wall = H.offscreen('neon-brick-wall', width, height, (g, w, h) => {
        renderBrickWall(g, w, h, streetY);
      });
      ctx.drawImage(wall, 0, 0);
    } else {
      ctx.fillStyle = '#12111b';
      ctx.fillRect(0, 0, width, height);
      const bw = 160;
      const bh = 54;
      for (let r = 0; r < Math.ceil(streetY / bh); r += 1) {
        const off = (r % 2) * 80;
        for (let c = -1; c < Math.ceil(width / bw) + 1; c += 1) {
          ctx.fillStyle = BRICK_TONES[(r + c + 6) % BRICK_TONES.length];
          ctx.globalAlpha = 0.14;
          ctx.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
        }
      }
      ctx.globalAlpha = 1;
    }

    // 2. Dynamic Light Map over brick wall (bricks glow pink/cyan/gold only where neon tubes light them)
    if (typeof ctx.createRadialGradient === 'function') {
      const pools = [
        [width * 0.56, streetY * 0.44, width * 0.46, 'rgba(255, 42, 133, 0.20)', 'rgba(255, 42, 133, 0)'],
        [width * 0.72, streetY * 0.62, width * 0.42, 'rgba(0, 229, 255, 0.18)', 'rgba(0, 229, 255, 0)'],
        [width * 0.34, streetY * 0.32, width * 0.32, 'rgba(255, 196, 69, 0.11)', 'rgba(255, 196, 69, 0)'],
      ];
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, streetY);
      ctx.clip();
      for (const [gx, gy, gr, c0, c1] of pools) {
        const grad = ctx.createRadialGradient(gx, gy, 8, gx, gy, gr * (0.95 + 0.08 * pulse));
        grad.addColorStop(0, c0);
        grad.addColorStop(1, c1);
        ctx.globalAlpha = hum;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, streetY);
      }
      ctx.restore();
    }

    // 3. Wet asphalt street plane below streetY + curb lip
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(0, streetY, width, height - streetY);
    ctx.fillStyle = '#383a45';
    ctx.fillRect(0, streetY, width, 4);
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, streetY + 4, width, 3);

    // 4. Stretched, row-rippled wet pavement neon reflections + rain ripples
    const streetH = height - streetY;
    const reflColors = ['#ff2a85', '#00e5ff', '#ffc845', '#a855f7'];
    for (let row = 6; row < streetH; row += 5) {
      const y = streetY + row;
      const depth = row / streetH;
      const ripple = Math.sin(row * 0.28 - t * 4.2) * (6 + depth * 18);
      for (let k = 0; k < 4; k += 1) {
        const rx = width * (0.24 + k * 0.19) + ripple;
        const rw = (90 + k * 28) * (1 - depth * 0.35);
        ctx.fillStyle = reflColors[k];
        ctx.globalAlpha = (0.16 - depth * 0.11) * (0.85 + 0.25 * pulse);
        ctx.fillRect(rx - rw * 0.5, y, rw, 3);
      }
    }

    // 5. Expanding rain ripple ellipses on wet asphalt
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i += 1) {
      const phase = ((t * 0.55 + i * 0.37) % 1);
      const rx = width * (0.14 + ((i * 0.105) % 0.78));
      const ry = streetY + streetH * (0.24 + ((i * 0.23) % 0.65));
      const radX = 18 + phase * 82;
      const radY = radX * 0.11;
      ctx.strokeStyle = i % 2 === 0 ? '#00e5ff' : '#ff2a85';
      ctx.globalAlpha = (1 - phase) * 0.22;
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(rx, ry, radX, radY, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(rx, ry, radX * 0.25, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/neon-wall'] = {
    kind: 'layer',
    id: 'neon-wall',
    slot: 'ground',
    provides: ['dark-ground', 'light-map', 'wet-reflection'],
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
