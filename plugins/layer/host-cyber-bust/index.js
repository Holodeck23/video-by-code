// Holographic wireframe sculpture presenter plugin with 3D vertex projection,
// additive cyan/magenta glow, horizontal CRT scanlines, and rising particles.
(function (root) {
  'use strict';

  function project3D(vx, vy, vz, yaw, pitch, scale, cx, cy) {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = vx * cosY + vz * sinY;
    const z1 = -vx * sinY + vz * cosY;
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const y2 = vy * cosP - z1 * sinP;
    const z2 = vy * sinP + z1 * cosP;
    const persp = 320 / (320 - z2);
    return [cx + x1 * scale * persp, cy + y2 * scale * persp];
  }

  function drawHoloMouth(ctx, cx, cy, s, shape, level, cyan, magenta) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = shape === 'c' ? cyan : magenta;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.28)';
    ctx.lineWidth = 2.4 * s;

    if (shape === 'c') {
      ctx.beginPath();
      ctx.moveTo(-22 * s, 0);
      ctx.lineTo(22 * s, 0);
      ctx.stroke();
    } else if (shape === 'm') {
      ctx.beginPath();
      ctx.moveTo(-22 * s, 0);
      ctx.lineTo(0, -6 * s);
      ctx.lineTo(22 * s, 0);
      ctx.lineTo(0, 6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'a') {
      ctx.beginPath();
      ctx.moveTo(-24 * s, -6 * s);
      ctx.lineTo(0, -10 * s);
      ctx.lineTo(24 * s, -6 * s);
      ctx.lineTo(16 * s, 16 * s);
      ctx.lineTo(0, 20 * s);
      ctx.lineTo(-16 * s, 16 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'o') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * 12 * s;
        const py = Math.sin(a) * 14 * s;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(-26 * s, -6 * s, 52 * s, 12 * s);
      ctx.fill();
      ctx.stroke();
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 8 * s, -6 * s);
        ctx.lineTo(k * 8 * s, 6 * s);
        ctx.stroke();
      }
    }
    if (level > 0.05) {
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.arc(0, 2 * s, (26 + level * 14) * s, 0, Math.PI * 2);
      ctx.stroke();
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
    const emitterY = box.y + box.height - 22 * s;
    const hoverY = box.y + box.height * 0.44 + Math.sin(t * 2.2) * 6 * s;

    const cyan = '#22d3ee';
    const magenta = '#f472b6';
    const deepGlow = 'rgba(34, 211, 238, 0.14)';

    ctx.save();
    // Base projector ring & projection cone
    ctx.fillStyle = deepGlow;
    ctx.beginPath();
    ctx.moveTo(cx - 52 * s, emitterY);
    ctx.lineTo(cx - 112 * s, hoverY - 120 * s);
    ctx.lineTo(cx + 112 * s, hoverY - 120 * s);
    ctx.lineTo(cx + 52 * s, emitterY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = cyan;
    ctx.lineWidth = 2.8 * s;
    ctx.beginPath();
    ctx.ellipse(cx, emitterY, 68 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = magenta;
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.ellipse(cx, emitterY, 44 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3D-projected wireframe bust vertices
    const yaw = dir * (0.22 + (pose === 'point' ? 0.12 : 0)) + Math.sin(t * 1.5) * 0.08;
    const pitch = Math.cos(t * 1.9) * 0.05;
    const p3 = (x, y, z) => project3D(x, y, z, yaw, pitch, s, cx, hoverY);

    const verts = {
      crown: p3(0, -138, 0),
      templeL: p3(-56, -98, 22),
      templeR: p3(56, -98, 22),
      cheekL: p3(-64, -28, 38),
      cheekR: p3(64, -28, 38),
      nose: p3(0, -34, 66),
      jawL: p3(-44, 34, 28),
      jawR: p3(44, 34, 28),
      chin: p3(0, 54, 46),
      neckL: p3(-26, 76, 8),
      neckR: p3(26, 76, 8),
      shL: p3(-92, 112, -10),
      shR: p3(92, 112, -10),
      chest: p3(0, 148, 34),
    };

    const faces = [
      ['crown', 'templeL', 'nose'],
      ['crown', 'nose', 'templeR'],
      ['templeL', 'cheekL', 'nose'],
      ['templeR', 'nose', 'cheekR'],
      ['cheekL', 'jawL', 'chin', 'nose'],
      ['cheekR', 'nose', 'chin', 'jawR'],
      ['jawL', 'neckL', 'chest', 'chin'],
      ['jawR', 'chin', 'chest', 'neckR'],
      ['neckL', 'shL', 'chest'],
      ['neckR', 'chest', 'shR'],
    ];

    ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 2.0 * s;
    for (const face of faces) {
      ctx.beginPath();
      face.forEach((key, idx) => {
        const [px, py] = verts[key];
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Wireframe eyes + mood brow vectors
    const browSlope = mood === 'excited' ? -0.18 : mood === 'focused' ? 0.24 : 0;
    for (const side of [-1, 1]) {
      const [ex, ey] = p3(side * 28, -56, 52);
      ctx.strokeStyle = magenta;
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath();
      ctx.moveTo(ex - 16 * s, ey - (16 + side * browSlope * 18) * s);
      ctx.lineTo(ex + 16 * s, ey - (16 - side * browSlope * 18) * s);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = cyan;
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex - 12 * s, ey);
        ctx.lineTo(ex + 12 * s, ey);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(ex - 12 * s, ey);
        ctx.lineTo(ex, ey - 8 * s);
        ctx.lineTo(ex + 12 * s, ey);
        ctx.lineTo(ex, ey + 8 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    const [mx, my] = p3(0, 12, 54);
    drawHoloMouth(ctx, mx, my, s, shape, level, cyan, magenta);

    // Floating holographic gauntlet & targeting reticle on present/point
    const handX =
      pose === 'point'
        ? cx + dir * 116 * s
        : pose === 'present'
          ? cx + dir * 94 * s
          : cx + dir * 68 * s;
    const handY =
      pose === 'point'
        ? hoverY - 38 * s
        : pose === 'present'
          ? hoverY + 8 * s
          : hoverY + 78 * s;
    const [shAnchorX, shAnchorY] = dir >= 0 ? verts.shR : verts.shL;

    ctx.strokeStyle = magenta;
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(shAnchorX, shAnchorY);
    ctx.lineTo((shAnchorX + handX) * 0.5, (shAnchorY + handY) * 0.5 + 24 * s);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Rotating polyhedral reticle around active hand
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(t * 2.4 * dir);
    ctx.strokeStyle = cyan;
    ctx.strokeRect(-12 * s, -12 * s, 24 * s, 24 * s);
    ctx.restore();

    // Horizontal CRT scanlines across hologram volume
    const scanOffset = (t * 48) % 10;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
    ctx.lineWidth = 1;
    for (let y = hoverY - 145 * s + scanOffset; y < emitterY; y += 8 * s) {
      ctx.beginPath();
      ctx.moveTo(cx - 96 * s, y);
      ctx.lineTo(cx + 96 * s, y);
      ctx.stroke();
    }

    // Deterministic rising data particles
    ctx.fillStyle = cyan;
    for (let i = 0; i < 18; i++) {
      const seedA = Math.sin(i * 41.7 + 1.3) * 1000;
      const u = ((t * 0.45 + (seedA - Math.floor(seedA))) % 1 + 1) % 1;
      const px = cx + Math.sin(i * 19.1 + t * 1.4) * 76 * s;
      const py = emitterY - u * 270 * s;
      const sz = (1 - u) * 4.5 * s;
      ctx.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
    }

    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/host-cyber-bust'] = {
    kind: 'layer',
    id: 'host-cyber-bust',
    slot: 'host',
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);

