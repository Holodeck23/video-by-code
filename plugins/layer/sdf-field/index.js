// sdf-field: real WebGL GLSL raymarched 3D Signed Distance Field world (smooth-union metaballs,
// twisting torus, orbiting octahedra, volumetric glow, and ACES tonemapping) driven by time & beat pulse.
(function (root) {
  'use strict';

  const VERT_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uPulse;

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }

    float sdOctahedron(vec3 p, float s) {
      p = abs(p);
      return (p.x + p.y + p.z - s) * 0.57735027;
    }

    vec3 palette(float t) {
      vec3 a = vec3(0.45, 0.52, 0.68);
      vec3 b = vec3(0.45, 0.42, 0.38);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.00, 0.33, 0.67);
      return a + b * cos(6.28318 * (c * t + d));
    }

    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

    float map(vec3 p) {
      vec3 q = p;
      q.xz *= rot(uTime * 0.38);
      q.xy *= rot(uTime * 0.24);

      float torus = sdTorus(q, vec2(1.18 + 0.14 * uPulse, 0.24));

      vec3 octP = p;
      octP.xy *= rot(-uTime * 0.52);
      octP.yz *= rot(uTime * 0.31);
      float oct = sdOctahedron(octP, 0.88 + 0.16 * uPulse);

      float d = smin(torus, oct, 0.42);

      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float ang = uTime * (0.65 + fi * 0.12) + fi * 1.5708;
        vec3 orb = vec3(
          cos(ang) * (1.45 + 0.2 * sin(uTime + fi)),
          sin(ang * 1.3) * 0.75,
          sin(ang) * (1.45 + 0.2 * cos(uTime + fi))
        );
        float sph = length(p - orb) - (0.34 + 0.08 * uPulse);
        d = smin(d, sph, 0.48);
      }
      return d;
    }

    vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.002, -0.002);
      return normalize(
        e.xyy * map(p + e.xyy) +
        e.yyx * map(p + e.yyx) +
        e.yxy * map(p + e.yxy) +
        e.xxx * map(p + e.xxx)
      );
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      // Offset the SDF sculpture slightly right-of-center so open-stage typography & host balance cleanly
      vec2 camUv = uv - vec2(0.12, -0.03);

      vec3 ro = vec3(0.0, 0.0, 4.2);
      vec3 rd = normalize(vec3(camUv, -1.35));

      // Deep space domain-warped background field
      float r = length(camUv);
      vec3 bg = mix(vec3(0.025, 0.04, 0.09), vec3(0.01, 0.015, 0.035), clamp(r * 0.9, 0.0, 1.0));
      float grid = abs(sin(uv.x * 28.0) * sin(uv.y * 28.0));
      bg += vec3(0.02, 0.05, 0.10) * smoothstep(0.96, 1.0, grid) * 0.35;

      float t = 0.0;
      float glow = 0.0;
      float hit = 0.0;
      vec3 p;
      for (int i = 0; i < 56; i++) {
        p = ro + rd * t;
        float d = map(p);
        glow += 0.018 / (0.045 + d * d);
        if (d < 0.002) {
          hit = 1.0;
          break;
        }
        t += d * 0.85;
        if (t > 9.0) break;
      }

      vec3 col = bg;
      vec3 glowCol = palette(uTime * 0.08 + r * 0.45);
      col += glowCol * glow * (0.28 + 0.22 * uPulse);

      if (hit > 0.5) {
        vec3 n = calcNormal(p);
        vec3 l1 = normalize(vec3(1.4, 1.8, 1.5));
        vec3 l2 = normalize(vec3(-1.6, -1.2, 0.8));
        float diff1 = max(dot(n, l1), 0.0);
        float diff2 = max(dot(n, l2), 0.0);
        float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 h1 = normalize(l1 - rd);
        float spec = pow(max(dot(n, h1), 0.0), 36.0);

        vec3 baseCol = palette(length(p) * 0.35 - uTime * 0.12);
        col = baseCol * (0.18 + 0.72 * diff1 + 0.28 * diff2);
        col += vec3(0.22, 0.82, 1.0) * fres * (0.85 + 0.35 * uPulse);
        col += vec3(1.0, 0.92, 0.98) * spec * 0.75;
        col += glowCol * glow * 0.14;
      }

      col = aces(col * 1.15);
      col = pow(col, vec3(1.0 / 2.2));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  let glState = null;

  function getWebGL(width, height) {
    if (typeof document === 'undefined') return null;
    // Render SDF shader at half resolution and upscale smoothly for fast deterministic 30fps capture
    const rw = Math.max(320, Math.round(width * 0.5));
    const rh = Math.max(180, Math.round(height * 0.5));
    if (glState && glState.rw === rw && glState.rh === rh) {
      return glState;
    }
    const canvas = document.createElement('canvas');
    canvas.width = rw;
    canvas.height = rh;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return null;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    glState = {
      canvas,
      gl,
      prog,
      rw,
      rh,
      uRes: gl.getUniformLocation(prog, 'uRes'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uPulse: gl.getUniformLocation(prog, 'uPulse'),
    };
    return glState;
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
    return Math.exp(-Math.max(0, t - last) * 6.0);
  }

  function draw(ctx, { width, height, t = 0, music }) {
    const pulse = beatPulse(music, t);
    const state = getWebGL(width, height);

    ctx.save();
    if (state) {
      const { gl, prog, canvas, rw, rh, uRes, uTime, uPulse } = state;
      gl.viewport(0, 0, rw, rh);
      gl.useProgram(prog);
      gl.uniform2f(uRes, rw, rh);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uPulse, pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(canvas, 0, 0, width, height);
    } else {
      // Fallback for Node mock canvas tests
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, width, height);
      const cx = width * 0.58;
      const cy = height * 0.48;
      for (let i = 5; i >= 1; i -= 1) {
        const r = (56 + i * 44) * (1 + 0.08 * pulse);
        ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#f43f5e';
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['layer/sdf-field'] = {
    kind: 'layer',
    id: 'sdf-field',
    slot: 'ground',
    provides: ['dark-ground', 'sdf-world', 'audio-reactive'],
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
