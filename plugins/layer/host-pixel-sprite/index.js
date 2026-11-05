// True pixel-art presenter plugin (64x64 integer grid upscaled nearest-neighbour,
// limited 8-colour palette, 6 fps frame-stepped animation).
(function (root) {
  'use strict';

  const PALETTE = {
    outline: '#090d16',
    skin: '#fbd38d',
    skinShade: '#dd6b20',
    hood: '#0284c7',
    hoodHi: '#38bdf8',
    tunic: '#1e293b',
    belt: '#f43f5e',
    white: '#ffffff',
  };

  function putRect(px, gx, gy, gw, gh, col) {
    px(gx, gy, gw, gh, col);
  }

  function drawMouth64(px, shape, pal) {
    if (shape === 'c') {
      putRect(px, 28, 26, 8, 1, pal.outline);
    } else if (shape === 'm') {
      putRect(px, 28, 25, 8, 3, pal.outline);
      putRect(px, 29, 26, 6, 1, pal.belt);
    } else if (shape === 'a') {
      putRect(px, 27, 24, 10, 6, pal.outline);
      putRect(px, 28, 25, 8, 1, pal.white);
      putRect(px, 28, 26, 8, 3, pal.belt);
    } else if (shape === 'o') {
      putRect(px, 30, 24, 5, 5, pal.outline);
      putRect(px, 31, 25, 3, 3, pal.belt);
    } else {
      putRect(px, 26, 25, 12, 4, pal.outline);
      putRect(px, 27, 26, 10, 2, pal.white);
    }
  }

  function draw(ctx, state) {
    const { box, t = 0, shape = 'c', blink = false, mood = 'neutral', pose = 'idle', dir = 1 } =
      state;
    const grid = 64;
    const stepFrame = Math.floor(t * 6);
    const bounce = stepFrame % 2 === 0 ? 0 : 1;
    const capeWave = (stepFrame % 3) - 1;

    const cell = Math.max(3, Math.floor(Math.min(box.width, box.height) / grid));
    const drawW = cell * grid;
    const drawH = cell * grid;
    const ox = Math.round(box.x + (box.width - drawW) * 0.5);
    const oy = Math.round(box.y + box.height - drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const px = (gx, gy, gw, gh, color) => {
      const rx = dir >= 0 ? gx : grid - gx - gw;
      ctx.fillStyle = color;
      ctx.fillRect(ox + rx * cell, oy + (gy + bounce) * cell, gw * cell, gh * cell);
    };

    // Boots & pixelated shadow on stage floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(ox + 14 * cell, oy + 59 * cell, 36 * cell, 3 * cell);
    putRect(px, 21, 52 - bounce, 7, 8, PALETTE.outline);
    putRect(px, 35, 52 - bounce, 7, 8, PALETTE.outline);
    putRect(px, 22, 53 - bounce, 5, 6, PALETTE.hood);
    putRect(px, 36, 53 - bounce, 5, 6, PALETTE.hood);

    // Flowing pixel cape behind torso
    putRect(px, 14 + capeWave, 30, 8, 22, PALETTE.outline);
    putRect(px, 15 + capeWave, 31, 6, 20, PALETTE.belt);

    // Compact RPG tinkerer torso + belt buckle
    putRect(px, 19, 31, 26, 22, PALETTE.outline);
    putRect(px, 21, 32, 22, 19, PALETTE.tunic);
    putRect(px, 24, 33, 16, 6, PALETTE.hood);
    putRect(px, 20, 44, 24, 4, PALETTE.belt);
    putRect(px, 29, 43, 6, 6, PALETTE.skin);

    // Asymmetric shoulder pauldron (left)
    putRect(px, 15, 29, 8, 8, PALETTE.outline);
    putRect(px, 16, 30, 6, 6, PALETTE.hoodHi);

    // Hooded pixel head & headset visor
    putRect(px, 17, 7, 30, 25, PALETTE.outline);
    putRect(px, 19, 8, 26, 23, PALETTE.hood);
    putRect(px, 21, 9, 22, 5, PALETTE.hoodHi);
    putRect(px, 22, 13, 20, 17, PALETTE.skin);
    putRect(px, 22, 27, 20, 3, PALETTE.skinShade);

    // Ear-cup & antenna pixel sprite
    putRect(px, 15, 14, 3, 10, PALETTE.belt);
    putRect(px, 16, 4, 2, 10, PALETTE.hoodHi);
    if (stepFrame % 2 === 0) {
      putRect(px, 15, 2, 4, 3, PALETTE.belt);
    }

    // Pixel eyes & mood brows
    const browY = mood === 'excited' ? 14 : mood === 'focused' ? 16 : 15;
    putRect(px, 25, browY, 5, 1, PALETTE.outline);
    putRect(px, 35, browY, 5, 1, PALETTE.outline);
    if (blink) {
      putRect(px, 25, 19, 5, 1, PALETTE.outline);
      putRect(px, 35, 19, 5, 1, PALETTE.outline);
    } else {
      putRect(px, 25, 17, 5, 5, PALETTE.outline);
      putRect(px, 35, 17, 5, 5, PALETTE.outline);
      putRect(px, 27, 18, 2, 2, PALETTE.white);
      putRect(px, 37, 18, 2, 2, PALETTE.white);
    }

    drawMouth64(px, shape, PALETTE);

    // Frame-stepped gesture arm (right/leading side)
    if (pose === 'point') {
      putRect(px, 43, 30, 11, 5, PALETTE.outline);
      putRect(px, 44, 31, 9, 3, PALETTE.hoodHi);
      putRect(px, 53, 29, 7, 5, PALETTE.skin);
      if (stepFrame % 2 === 0) {
        putRect(px, 60, 27, 3, 3, PALETTE.belt);
        putRect(px, 61, 31, 2, 2, PALETTE.white);
      } else {
        putRect(px, 61, 28, 2, 2, PALETTE.hoodHi);
      }
    } else if (pose === 'present') {
      putRect(px, 43, 32, 8, 6, PALETTE.outline);
      putRect(px, 44, 33, 6, 4, PALETTE.hood);
      putRect(px, 49, 26, 8, 8, PALETTE.outline);
      putRect(px, 50, 27, 6, 6, PALETTE.skin);
      // Floating pixel holocube above open palm
      const cubeY = 17 + (stepFrame % 3);
      putRect(px, 50, cubeY, 6, 6, PALETTE.belt);
      putRect(px, 51, cubeY + 1, 4, 4, PALETTE.hoodHi);
    } else {
      putRect(px, 43, 33, 6, 14, PALETTE.outline);
      putRect(px, 44, 34, 4, 10, PALETTE.hood);
      putRect(px, 44, 44, 4, 3, PALETTE.skin);
    }

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/host-pixel-sprite'] = {
    kind: 'layer',
    id: 'host-pixel-sprite',
    slot: 'host',
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
