// Flat-vector three-quarter character plugin (zero outlines, layered geometric planes,
// articulated two-segment IK arm + multi-finger hand, torso lean, and capsule visor head).
(function (root) {
  'use strict';

  function drawVectorMouth(ctx, x, y, s, shape, colors) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = colors.mouth;
    if (shape === 'c') {
      ctx.beginPath();
      ctx.roundRect(-14 * s, -2 * s, 28 * s, 4 * s, 2 * s);
      ctx.fill();
    } else if (shape === 'm') {
      ctx.beginPath();
      ctx.roundRect(-16 * s, -6 * s, 32 * s, 12 * s, 6 * s);
      ctx.fill();
    } else if (shape === 'a') {
      ctx.beginPath();
      ctx.moveTo(-20 * s, -8 * s);
      ctx.lineTo(20 * s, -8 * s);
      ctx.quadraticCurveTo(18 * s, 18 * s, 0, 18 * s);
      ctx.quadraticCurveTo(-18 * s, 18 * s, -20 * s, -8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colors.tongue;
      ctx.beginPath();
      ctx.arc(0, 10 * s, 9 * s, Math.PI, 0);
      ctx.fill();
    } else if (shape === 'o') {
      ctx.beginPath();
      ctx.arc(0, 1 * s, 11 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.visor;
      ctx.beginPath();
      ctx.arc(0, 1 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(-22 * s, -7 * s, 44 * s, 14 * s, 7 * s);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-18 * s, -5 * s, 36 * s, 4 * s);
    }
    ctx.restore();
  }

  function draw(ctx, state) {
    const {
      box,
      t = 0,
      shape = 'c',
      level = 0,
      blink = false,
      mood = 'neutral',
      pose = 'idle',
      dir = 1,
    } = state;
    const s = box.height / 440;
    const cx = box.x + box.width * 0.5;
    const baseY = box.y + box.height - 16 * s;
    const breathe = Math.sin(t * 2.5) * 4 * s;
    const lean = (pose === 'point' ? 0.08 : pose === 'present' ? 0.05 : 0.01) * dir;

    const colors = {
      coat: '#f59e0b',
      coatShadow: '#d97706',
      lapel: '#0284c7',
      trousers: '#1e293b',
      visor: '#0f172a',
      head: '#f8fafc',
      headShade: '#cbd5e1',
      eye: '#38bdf8',
      mouth: '#f43f5e',
      tongue: '#fb7185',
      hand: '#38bdf8',
    };

    ctx.save();
    // Ground contact ellipse
    ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 84 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Three-quarter standing legs & boots (flat vector shapes, no stroke)
    ctx.fillStyle = colors.trousers;
    ctx.beginPath();
    ctx.roundRect(cx - 38 * s, baseY - 128 * s, 26 * s, 122 * s, 12 * s);
    ctx.roundRect(cx + 10 * s, baseY - 128 * s, 26 * s, 122 * s, 12 * s);
    ctx.fill();

    ctx.fillStyle = colors.lapel;
    ctx.beginPath();
    ctx.roundRect(cx - 44 * s, baseY - 24 * s, 38 * s, 22 * s, 10 * s);
    ctx.roundRect(cx + 8 * s, baseY - 24 * s, 38 * s, 22 * s, 10 * s);
    ctx.fill();

    // Articulated upper body with subtle pose lean
    ctx.translate(cx, baseY - 120 * s);
    ctx.rotate(lean);

    // Back arm (off-side)
    ctx.fillStyle = colors.coatShadow;
    ctx.beginPath();
    ctx.roundRect(-dir * 66 * s, -138 * s + breathe, 24 * s, 106 * s, 12 * s);
    ctx.fill();

    // Tapered architect coat torso + diagonal shadow plane
    ctx.fillStyle = colors.coat;
    ctx.beginPath();
    ctx.moveTo(-58 * s, -162 * s + breathe);
    ctx.lineTo(58 * s, -162 * s + breathe);
    ctx.lineTo(46 * s, 12 * s);
    ctx.lineTo(-46 * s, 12 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.coatShadow;
    ctx.beginPath();
    ctx.moveTo(0, -162 * s + breathe);
    ctx.lineTo(-dir * 58 * s, -162 * s + breathe);
    ctx.lineTo(-dir * 46 * s, 12 * s);
    ctx.lineTo(-dir * 6 * s, 12 * s);
    ctx.closePath();
    ctx.fill();

    // Geometric lapel & chest core badge
    ctx.fillStyle = colors.lapel;
    ctx.beginPath();
    ctx.moveTo(-26 * s, -162 * s + breathe);
    ctx.lineTo(26 * s, -162 * s + breathe);
    ctx.lineTo(dir * 12 * s, -68 * s + breathe);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.eye;
    ctx.beginPath();
    ctx.arc(dir * 22 * s, -116 * s + breathe, (8 + level * 5) * s, 0, Math.PI * 2);
    ctx.fill();

    // Neck cylinder + tilted capsule head
    const headY = -238 * s + breathe;
    const headTilt = (pose === 'point' ? 0.06 : Math.sin(t * 1.8) * 0.03) * dir;
    ctx.save();
    ctx.translate(dir * 6 * s, headY);
    ctx.rotate(headTilt);

    ctx.fillStyle = colors.headShade;
    ctx.beginPath();
    ctx.roundRect(-58 * s, -64 * s, 116 * s, 118 * s, 38 * s);
    ctx.fill();

    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.roundRect(-52 * s, -64 * s, 108 * s, 114 * s, 36 * s);
    ctx.fill();

    // Wrap-around dark visor plate
    ctx.fillStyle = colors.visor;
    ctx.beginPath();
    ctx.roundRect(-42 * s + dir * 8 * s, -42 * s, 86 * s, 48 * s, 20 * s);
    ctx.fill();

    // Luminous pill eyes & floating vector brows
    const browShift = mood === 'excited' ? -6 * s : mood === 'focused' ? 4 * s : 0;
    for (const side of [-1, 1]) {
      const ex = side * 20 * s + dir * 10 * s;
      const ey = -18 * s;
      ctx.fillStyle = colors.eye;
      if (blink) {
        ctx.fillRect(ex - 9 * s, ey - 1.5 * s, 18 * s, 3 * s);
      } else {
        ctx.beginPath();
        ctx.roundRect(ex - 7 * s, ey - 10 * s, 14 * s, 20 * s, 7 * s);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(ex, ey - 20 * s + browShift);
      const tilt = mood === 'focused' ? side * 0.22 : mood === 'excited' ? -side * 0.14 : 0;
      ctx.rotate(tilt);
      ctx.fillStyle = colors.coat;
      ctx.beginPath();
      ctx.roundRect(-11 * s, -3 * s, 22 * s, 5 * s, 2.5 * s);
      ctx.fill();
      ctx.restore();
    }

    drawVectorMouth(ctx, dir * 10 * s, 24 * s, s, shape, colors);
    ctx.restore();

    // Two-segment articulated gesture arm (shoulder -> elbow -> wrist + multi-finger hand)
    const shX = dir * 44 * s;
    const shY = -142 * s + breathe;
    let elX = shX + dir * 18 * s;
    let elY = shY + 58 * s;
    let wrX = elX + dir * 16 * s;
    let wrY = elY + 46 * s;

    if (pose === 'present') {
      elX = shX + dir * 34 * s;
      elY = shY + 34 * s;
      wrX = elX + dir * 56 * s;
      wrY = elY - 18 * s + Math.sin(t * 4) * 4 * s;
    } else if (pose === 'point') {
      elX = shX + dir * 48 * s;
      elY = shY + 12 * s;
      wrX = elX + dir * 64 * s;
      wrY = elY - 28 * s + Math.sin(t * 5) * 3 * s;
    }

    ctx.strokeStyle = colors.coat;
    ctx.lineWidth = 22 * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.lineTo(elX, elY);
    ctx.lineTo(wrX, wrY);
    ctx.stroke();

    // Articulated flat-vector palm and fingers
    ctx.fillStyle = colors.hand;
    ctx.beginPath();
    ctx.arc(wrX, wrY, 12 * s, 0, Math.PI * 2);
    ctx.fill();
    if (pose === 'point' || pose === 'present') {
      ctx.strokeStyle = colors.hand;
      ctx.lineWidth = 7 * s;
      ctx.beginPath();
      ctx.moveTo(wrX, wrY);
      ctx.lineTo(wrX + dir * 24 * s, wrY - 6 * s);
      ctx.moveTo(wrX, wrY - 4 * s);
      ctx.lineTo(wrX + dir * 12 * s, wrY - 18 * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/host-geometric-bot'] = {
    kind: 'layer',
    id: 'host-geometric-bot',
    slot: 'host',
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
