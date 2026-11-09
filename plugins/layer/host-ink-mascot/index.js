// Hand-drawn editorial ink presenter plugin with 8 fps 3-state line-boil,
// double-inked imperfect strokes, off-register marker wash, and cross-hatching.
(function (root) {
  'use strict';

  function jitter(seed, boil, amp) {
    const n = Math.sin(seed * 12.9898 + boil * 78.233) * 43758.5453;
    return (n - Math.floor(n) - 0.5) * 2 * amp;
  }

  function sketchyPoly(ctx, pts, boil, amp, close = true) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const jx = jitter(i * 3 + pass * 17, boil, amp);
        const jy = jitter(i * 7 + pass * 29, boil, amp);
        const px = pts[i][0] + jx;
        const py = pts[i][1] + jy;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      if (close) {
        ctx.closePath();
      }
      if (pass === 0 && close) {
        ctx.fill();
      }
      ctx.stroke();
    }
  }

  function sketchyEllipse(ctx, cx, cy, rx, ry, boil, amp, fillCol) {
    const steps = 20;
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    if (fillCol) {
      // Off-register marker wash fill before double ink stroke
      ctx.save();
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(cx + amp * 1.4, cy + amp * 1.2, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(cx + amp * 1.4, cy + amp * 1.2, rx * 0.97, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0)';
    sketchyPoly(ctx, pts, boil, amp, true);
  }

  function drawInkMouth(ctx, x, y, s, shape, boil, ink, accent) {
    const amp = 1.4 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.4 * s;
    if (shape === 'c') {
      sketchyPoly(
        ctx,
        [
          [-16 * s, 1 * s],
          [-2 * s, 6 * s],
          [16 * s, -2 * s],
        ],
        boil,
        amp,
        false
      );
    } else if (shape === 'm') {
      sketchyEllipse(ctx, 0, 2 * s, 15 * s, 6.5 * s, boil, amp, accent);
    } else if (shape === 'a') {
      sketchyEllipse(ctx, 0, 6 * s, 19 * s, 14 * s, boil, amp, accent);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-11 * s, -5 * s, 22 * s, 5 * s);
    } else if (shape === 'o') {
      sketchyEllipse(ctx, 2 * s, 3 * s, 11 * s, 12 * s, boil, amp, accent);
    } else {
      sketchyEllipse(ctx, 0, 3 * s, 20 * s, 9 * s, boil, amp, '#ffffff');
      sketchyPoly(
        ctx,
        [
          [-18 * s, 3 * s],
          [18 * s, 3 * s],
        ],
        boil,
        amp,
        false
      );
    }
    ctx.restore();
  }

  function draw(ctx, state) {
    const { box, t = 0, shape = 'c', blink = false, mood = 'neutral', pose = 'idle', dir = 1 } =
      state;
    const s = box.height / 440;
    const cx = box.x + box.width * 0.5;
    const baseY = box.y + box.height - 20 * s;
    const boil = Math.floor(t * 8) % 3;
    const amp = 1.8 * s;

    const ink = '#1c1917';
    const paper = '#fffdf7';
    const wash = '#fde68a';
    const smock = '#fed7aa';
    const scarf = '#e11d48';
    const cobalt = '#2563eb';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 252, 240, 0.65)';
    ctx.shadowBlur = 10 * s;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.6 * s;

    // Cross-hatched ink floor shadow
    for (let i = -4; i <= 4; i++) {
      sketchyPoly(
        ctx,
        [
          [cx + i * 15 * s - 10 * s, baseY + 4 * s],
          [cx + i * 15 * s + 10 * s, baseY - 5 * s],
        ],
        boil,
        amp * 0.5,
        false
      );
    }

    // Sketchy artist smock / jacket torso (off-register wash + double ink lines)
    ctx.fillStyle = smock;
    ctx.beginPath();
    ctx.moveTo(cx - 52 * s + 4 * s, baseY - 178 * s + 4 * s);
    ctx.lineTo(cx + 56 * s + 4 * s, baseY - 178 * s + 4 * s);
    ctx.lineTo(cx + 72 * s + 4 * s, baseY);
    ctx.lineTo(cx - 68 * s + 4 * s, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0)';
    sketchyPoly(
      ctx,
      [
        [cx - 52 * s, baseY - 178 * s],
        [cx + 56 * s, baseY - 178 * s],
        [cx + 70 * s, baseY],
        [cx - 66 * s, baseY],
      ],
      boil,
      amp,
      true
    );

    // Jacket lapel & pocket detail
    sketchyPoly(
      ctx,
      [
        [cx, baseY - 165 * s],
        [cx + dir * 8 * s, baseY - 12 * s],
      ],
      boil,
      amp * 0.6,
      false
    );

    // Cross-hatching on smock side
    for (let k = 0; k < 5; k++) {
      const hy = baseY - 146 * s + k * 24 * s;
      sketchyPoly(
        ctx,
        [
          [cx - dir * 48 * s, hy],
          [cx - dir * 20 * s, hy + 12 * s],
        ],
        boil,
        amp * 0.5,
        false
      );
    }

    // Flowing red editorial scarf
    ctx.fillStyle = scarf;
    sketchyPoly(
      ctx,
      [
        [cx - 46 * s, baseY - 190 * s],
        [cx + 48 * s, baseY - 186 * s],
        [cx + 42 * s, baseY - 158 * s],
        [cx - dir * 24 * s, baseY - 112 * s],
        [cx - 48 * s, baseY - 162 * s],
      ],
      boil,
      amp,
      true
    );

    // Hand-inked head
    const headX = cx + dir * 6 * s;
    const headY = baseY - 268 * s;
    sketchyEllipse(ctx, headX, headY, 66 * s, 74 * s, boil, amp, paper);

    // Warm cheek wash
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(headX - 35 * s, headY + 14 * s, 13 * s, 0, Math.PI * 2);
    ctx.arc(headX + 35 * s, headY + 14 * s, 13 * s, 0, Math.PI * 2);
    ctx.fill();

    // Inked hair curls on crown with cobalt highlight fill
    for (let c = -2; c <= 2; c++) {
      sketchyEllipse(
        ctx,
        headX + c * 21 * s,
        headY - 70 * s + Math.abs(c) * 5 * s,
        18 * s,
        14 * s,
        boil,
        amp,
        c % 2 === 0 ? ink : cobalt
      );
    }

    // Crooked oversized round spectacles with bridge
    const leftEyeX = headX - 25 * s + dir * 4 * s;
    const rightEyeX = headX + 27 * s + dir * 4 * s;
    const eyeY = headY - 14 * s;
    ctx.strokeStyle = scarf;
    sketchyEllipse(ctx, leftEyeX, eyeY, 21 * s, 19 * s, boil, amp * 0.65, '#ffffff');
    sketchyEllipse(ctx, rightEyeX, eyeY - 2 * s, 22 * s, 20 * s, boil, amp * 0.65, '#ffffff');
    sketchyPoly(
      ctx,
      [
        [leftEyeX + 19 * s, eyeY - 2 * s],
        [rightEyeX - 19 * s, eyeY - 3 * s],
      ],
      boil,
      amp * 0.5,
      false
    );
    ctx.strokeStyle = ink;

    // Ink pupils & expressive brows
    for (const [ex, ey, side] of [
      [leftEyeX, eyeY, -1],
      [rightEyeX, eyeY - 2 * s, 1],
    ]) {
      if (blink) {
        sketchyPoly(
          ctx,
          [
            [ex - 10 * s, ey],
            [ex + 10 * s, ey],
          ],
          boil,
          amp * 0.5,
          false
        );
      } else {
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(ex + dir * 4 * s, ey, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + dir * 2 * s, ey - 2 * s, 2.2 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      const browLift = mood === 'excited' ? -9 * s : mood === 'focused' ? 3 * s : -3 * s;
      sketchyPoly(
        ctx,
        [
          [ex - 15 * s, ey - 23 * s + browLift + side * 2 * s],
          [ex + 15 * s, ey - 25 * s + browLift - side * 3 * s],
        ],
        boil,
        amp * 0.65,
        false
      );
    }

    drawInkMouth(ctx, headX + dir * 6 * s, headY + 34 * s, s, shape, boil, ink, scarf);

    // Expressive sleeved gesture arm + fountain-pen nib pointer
    const shX = cx + dir * 44 * s;
    const shY = baseY - 152 * s;
    const handX =
      pose === 'point'
        ? shX + dir * 66 * s
        : pose === 'present'
          ? shX + dir * 54 * s
          : shX + dir * 22 * s;
    const handY =
      pose === 'point'
        ? shY - 44 * s
        : pose === 'present'
          ? shY - 16 * s
          : shY + 58 * s;
    const midX = (shX + handX) * 0.5 - dir * 10 * s;
    const midY = (shY + handY) * 0.5 + 24 * s;

    ctx.lineWidth = 7 * s;
    sketchyPoly(
      ctx,
      [
        [shX, shY],
        [midX, midY],
        [handX, handY],
      ],
      boil,
      amp,
      false
    );
    ctx.lineWidth = 3.5 * s;
    sketchyEllipse(ctx, handX, handY, 12 * s, 10 * s, boil, amp * 0.7, paper);

    // Fountain pen held in hand
    const nibX = handX + dir * 32 * s;
    const nibY = handY - 16 * s;
    ctx.strokeStyle = scarf;
    ctx.lineWidth = 4.5 * s;
    sketchyPoly(
      ctx,
      [
        [handX - dir * 8 * s, handY + 5 * s],
        [nibX, nibY],
      ],
      boil,
      amp * 0.5,
      false
    );
    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/host-ink-mascot'] = {
    kind: 'layer',
    id: 'host-ink-mascot',
    slot: 'host',
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
