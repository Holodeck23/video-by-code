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
      ctx.ellipse(cx + amp * 1.4, cy + amp * 1.2, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0)';
    sketchyPoly(ctx, pts, boil, amp, true);
  }

  function drawInkMouth(ctx, x, y, s, shape, boil, ink, accent) {
    const amp = 1.6 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5 * s;
    if (shape === 'c') {
      sketchyPoly(
        ctx,
        [
          [-18 * s, 2 * s],
          [-4 * s, 6 * s],
          [16 * s, -2 * s],
        ],
        boil,
        amp,
        false
      );
    } else if (shape === 'm') {
      sketchyEllipse(ctx, 0, 2 * s, 16 * s, 7 * s, boil, amp, accent);
    } else if (shape === 'a') {
      sketchyEllipse(ctx, 0, 6 * s, 20 * s, 16 * s, boil, amp, accent);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-12 * s, -6 * s, 24 * s, 6 * s);
    } else if (shape === 'o') {
      sketchyEllipse(ctx, 2 * s, 3 * s, 11 * s, 13 * s, boil, amp, accent);
    } else {
      sketchyEllipse(ctx, 0, 3 * s, 22 * s, 10 * s, boil, amp, '#ffffff');
      sketchyPoly(
        ctx,
        [
          [-20 * s, 3 * s],
          [20 * s, 3 * s],
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
    const amp = 2.0 * s;

    const ink = '#1c1917';
    const paper = '#fffdf7';
    const wash = '#fde68a';
    const smock = '#fed7aa';
    const scarf = '#e11d48';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.8 * s;

    // Cross-hatched ink floor shadow
    for (let i = -4; i <= 4; i++) {
      sketchyPoly(
        ctx,
        [
          [cx + i * 16 * s - 12 * s, baseY + 4 * s],
          [cx + i * 16 * s + 12 * s, baseY - 6 * s],
        ],
        boil,
        amp * 0.6,
        false
      );
    }

    // Sketchy artist smock / apron torso (off-register wash + double ink lines)
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

    // Cross-hatching on smock side
    for (let k = 0; k < 6; k++) {
      const hy = baseY - 150 * s + k * 22 * s;
      sketchyPoly(
        ctx,
        [
          [cx - dir * 48 * s, hy],
          [cx - dir * 18 * s, hy + 14 * s],
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
        [cx - dir * 24 * s, baseY - 110 * s],
        [cx - 48 * s, baseY - 162 * s],
      ],
      boil,
      amp,
      true
    );

    // Pear-shaped hand-inked head
    const headX = cx + dir * 6 * s;
    const headY = baseY - 268 * s;
    sketchyEllipse(ctx, headX, headY, 68 * s, 76 * s, boil, amp, paper);

    // Warm cheek wash
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(headX - 36 * s, headY + 14 * s, 14 * s, 0, Math.PI * 2);
    ctx.arc(headX + 36 * s, headY + 14 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();

    // Wild inked hair curls on crown
    for (let c = -2; c <= 2; c++) {
      sketchyEllipse(
        ctx,
        headX + c * 22 * s,
        headY - 72 * s + Math.abs(c) * 5 * s,
        18 * s,
        14 * s,
        boil,
        amp,
        ink
      );
    }

    // Crooked oversized round spectacles
    const leftEyeX = headX - 26 * s + dir * 4 * s;
    const rightEyeX = headX + 28 * s + dir * 4 * s;
    const eyeY = headY - 14 * s;
    ctx.strokeStyle = scarf;
    sketchyEllipse(ctx, leftEyeX, eyeY, 22 * s, 20 * s, boil, amp * 0.7, null);
    sketchyEllipse(ctx, rightEyeX, eyeY - 3 * s, 23 * s, 21 * s, boil, amp * 0.7, null);
    ctx.strokeStyle = ink;

    // Ink pupils & expressive brows
    for (const [ex, ey, side] of [
      [leftEyeX, eyeY, -1],
      [rightEyeX, eyeY - 3 * s, 1],
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
      }
      const browLift = mood === 'excited' ? -10 * s : mood === 'focused' ? 4 * s : -3 * s;
      sketchyPoly(
        ctx,
        [
          [ex - 16 * s, ey - 24 * s + browLift + side * 2 * s],
          [ex + 16 * s, ey - 26 * s + browLift - side * 3 * s],
        ],
        boil,
        amp * 0.7,
        false
      );
    }

    drawInkMouth(ctx, headX + dir * 6 * s, headY + 34 * s, s, shape, boil, ink, scarf);

    // Rubber-hose inked gesture arm + fountain-pen nib pointer
    const shX = cx + dir * 48 * s;
    const shY = baseY - 154 * s;
    const handX =
      pose === 'point'
        ? shX + dir * 96 * s
        : pose === 'present'
          ? shX + dir * 78 * s
          : shX + dir * 24 * s;
    const handY =
      pose === 'point'
        ? shY - 52 * s
        : pose === 'present'
          ? shY - 18 * s
          : shY + 72 * s;
    const midX = (shX + handX) * 0.5 - dir * 14 * s;
    const midY = (shY + handY) * 0.5 + 32 * s;

    ctx.lineWidth = 6 * s;
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
    sketchyEllipse(ctx, handX, handY, 13 * s, 11 * s, boil, amp * 0.8, paper);

    // Fountain pen held in hand
    const nibX = handX + dir * 38 * s;
    const nibY = handY - 18 * s;
    ctx.strokeStyle = scarf;
    sketchyPoly(
      ctx,
      [
        [handX - dir * 8 * s, handY + 6 * s],
        [nibX, nibY],
      ],
      boil,
      amp * 0.6,
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

