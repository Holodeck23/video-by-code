// webgl-post.js: 4-stage Three.js / WebGL post-processing pipeline used in dark-ground lyric films:
//   1. 3D world render pass
//   2. Selective HDR type/FX pass (pushes only warm/accent pixels past 1.0 so white type never blooms into a blob)
//   3. UnrealBloomPass
//   4. Final grade shader: ACES tonemapping (or light-ground paper roll-off), radial chromatic aberration,
//      hash-seeded horizontal glitch tears, camera shake, 2x2-pixel encoder-friendly film grain, scanlines,
//      vignette, luma-only impact inversion (`col + (1 - 2Y)`), and crisp UI overlay above bloom.
//
// Usage (ES module with Three.js):
//   import { createPost } from './lib/webgl-post.js';
//   const post = createPost(THREE, { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass }, renderer, world, fxCanvas, uiCanvas);

export const FxOverShader = {
  uniforms: {
    tDiffuse: { value: null },
    tFx: { value: null },
    uGain: { value: 2.0 },
    uPaperMode: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tFx;
    uniform float uGain, uPaperMode;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec4 fx = texture2D(tFx, vUv);
      // Dark world: push warm (ember/hot) pixels into HDR; white/steel type stays crisp below bloom threshold.
      // Paper world: push saturated accent hue into HDR so ink and paper never bloom.
      float warm = clamp((fx.r - fx.b) * 1.6, 0.0, 1.0);
      float sat = max(fx.r, max(fx.g, fx.b)) - min(fx.r, min(fx.g, fx.b));
      float mask = mix(warm * smoothstep(0.3, 1.0, fx.r), sat, uPaperMode);
      vec3 lit = fx.rgb * (1.0 + (uGain - 1.0) * mask);
      gl_FragColor = vec4(base.rgb * (1.0 - fx.a) + lit * fx.a, 1.0);
    }
  `,
};

export const FinalGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tUi: { value: null },
    uResolution: { value: [1920, 1080] },
    uTime: { value: 0 },
    uFrame: { value: 0 },
    uCA: { value: 0.002 },
    uGlitch: { value: 0 },
    uGlitchSeed: { value: 0 },
    uShake: { value: [0, 0] },
    uFlash: { value: 0 },
    uLumaInvert: { value: 0 },
    uPaperMode: { value: 0 },
    uExposure: { value: 1.0 },
    uGrain: { value: 0.07 },
    uVignette: { value: 0.9 },
    uFade: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tUi;
    uniform vec2 uResolution, uShake;
    uniform float uTime, uFrame, uCA, uGlitch, uGlitchSeed, uFlash, uLumaInvert, uPaperMode, uExposure, uGrain, uVignette, uFade;
    varying vec2 vUv;

    float h(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
    // Paper-mode soft highlight roll-off above 0.90 (skips ACES so warm paper does not turn grey).
    vec3 paperRollOff(vec3 x) {
      vec3 lo = min(x, vec3(0.90));
      vec3 hi = max(x - vec3(0.90), vec3(0.0));
      return clamp(lo + 0.10 * (hi / (hi + 0.10)), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    void main() {
      vec2 uv = vUv + uShake;
      float band = floor(uv.y * 38.0);
      float pick = step(0.72, h(vec2(band, uGlitchSeed)));
      uv.x += (h(vec2(band * 1.7, uGlitchSeed + 3.0)) - 0.5) * 0.12 * uGlitch * pick;

      vec2 dir = uv - 0.5;
      float ca = uCA + uGlitch * 0.012 * pick;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      vec3 exposed = col * uExposure + uFlash;
      col = mix(aces(exposed), paperRollOff(exposed), uPaperMode);

      // Luma-only inversion (col + (1 - 2Y)): paper goes black, ink goes white, accent keeps its hue.
      if (uLumaInvert > 0.0) {
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        vec3 inv = clamp(col + vec3(1.0 - 2.0 * Y), 0.0, 1.0);
        col = mix(col, inv, uLumaInvert);
      }

      vec4 ui = texture2D(tUi, vUv + uShake * 0.35);
      col = mix(col, ui.rgb, ui.a);

      float v = smoothstep(1.15, 0.25, length(dir * vec2(1.0, 0.82)));
      col *= mix(1.0, v, uVignette * (1.0 - uPaperMode));

      // 2x2-pixel grain: reads as film and costs libx264 far less bitrate than 1x1 pixel noise.
      vec2 grainGrid = uResolution * 0.5;
      col += (h(floor(vUv * grainGrid) + uFrame * 7.13) - 0.5) * uGrain;
      col *= 0.96 + 0.04 * sin(vUv.y * uResolution.y * 3.14159);

      gl_FragColor = vec4(toSRGB(clamp(col * uFade, 0.0, 1.0)), 1.0);
    }
  `,
};

export function createPost(THREE, passes, renderer, world, fxCanvas, uiCanvas, width = 1920, height = 1080) {
  const { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass } = passes;
  const size = new THREE.Vector2(width, height);
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(world.scene, world.camera));

  const fxTex = new THREE.CanvasTexture(fxCanvas);
  fxTex.colorSpace = THREE.SRGBColorSpace;
  const uiTex = new THREE.CanvasTexture(uiCanvas);
  uiTex.colorSpace = THREE.SRGBColorSpace;

  const over = new ShaderPass(FxOverShader);
  over.uniforms.tFx.value = fxTex;
  composer.addPass(over);

  const bloom = new UnrealBloomPass(size, 0.5, 0.4, 1.0);
  composer.addPass(bloom);

  const fin = new ShaderPass(FinalGradeShader);
  fin.uniforms.tUi.value = uiTex;
  fin.uniforms.uResolution.value = [width, height];
  composer.addPass(fin);

  function render(p = {}) {
    fxTex.needsUpdate = true;
    uiTex.needsUpdate = true;
    const shake = Array.isArray(p.shake) ? p.shake : [0, 0];
    over.uniforms.uGain.value = p.fxGain ?? 2.0;
    over.uniforms.uPaperMode.value = p.paperMode ? 1.0 : 0.0;
    bloom.strength = p.bloom ?? 0.5;
    const u = fin.uniforms;
    u.uFrame.value = (p.frame ?? 0) % 997;
    u.uCA.value = p.ca ?? 0.002;
    u.uGlitch.value = p.glitch ?? 0;
    u.uGlitchSeed.value = p.glitchSeed ?? 0;
    u.uShake.value = [shake[0] || 0, shake[1] || 0];
    u.uFlash.value = p.flash ?? 0;
    u.uLumaInvert.value = p.lumaInvert ?? 0;
    u.uPaperMode.value = p.paperMode ? 1.0 : 0.0;
    u.uExposure.value = p.exposure ?? 1.0;
    u.uGrain.value = p.grain ?? 0.07;
    u.uVignette.value = p.vignette ?? 0.9;
    u.uFade.value = p.fade ?? 1.0;
    composer.render();
  }

  return { composer, bloom, over, fin, render };
}
