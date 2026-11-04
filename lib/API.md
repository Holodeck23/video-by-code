# Kit API contract

Every page, helper and style card in this kit follows this contract. If code and this file disagree, fix one of them in the same commit.

## 1. The page contract (what the renderer expects)

A video is one HTML page that draws any moment on request.

| Item | Required | Meaning |
|---|---|---|
| `<canvas id="c" width="1920" height="1080">` | yes | The frame. 1920x1080 for landscape, 1080x1920 for vertical. The renderer reads the canvas size. |
| `window.DURATION` | yes | Length in seconds. |
| `window.__renderFrame(t)` | yes | Draws the frame at absolute time `t` (seconds). Synchronous. Pure: same `t` gives the same pixels, in any order. |
| `window.__ready` | yes | A Promise that resolves once fonts, images and cached textures are ready. The renderer awaits it before frame 0. |
| `window.scoreSound(k)` | optional | Schedules sound effects on a `SOUND` kit `k` (see 3). The same times the picture uses. |
| `window.FPS` | optional | Preferred frame rate (default 30). |

Rules a page must keep:
- No `requestAnimationFrame` driving the story, no `Date.now()`, no `performance.now()`, no `Math.random()` in drawing. Randomness comes from `H.rng(seed)` / `H.noise(seed)`.
- No state carried from the previous frame. Anything with history (particles, simulations) is either closed-form in `t` or re-simulated from a fixed step and checkpoints.
- Static textures may be cached (`H.offscreen`), because they do not depend on `t`.
- A preview player (play/pause/scrub) is optional and must call the same `__renderFrame(t)`.

## 2. `H` helper library (`lib/harness.js`, global `window.H`)

Randomness and noise
- `H.rng(seed)` returns `r()` in [0,1), plus `r.range(a,b)`, `r.int(a,b)` (inclusive), `r.pick(arr)`, `r.chance(p)`, `r.gauss()`. `seed` may be a number or a string.
- `H.noise(seed)` returns `{ n2(x,y), n3(x,y,z), fbm2(x,y,oct=4), fbm3(x,y,z,oct=4) }`, output roughly -1..1.

Math and timing
- `H.clamp(v,a,b)`, `H.lerp(a,b,u)`, `H.invLerp(a,b,v)`, `H.remap(v,a,b,c,d)` (clamped), `H.smoothstep(a,b,x)`.
- `H.prog(t, start, end)`: 0 before `start`, 1 after `end`, linear between. The workhorse for beats.
- `H.ease.{linear, inQuad, outQuad, inOutQuad, outCubic, inOutCubic, outQuart, outExpo, inOutSine, outBack(u, s=1.7), outElastic}`.
- `H.shake(t, seed, amp)` returns `[dx, dy]`, smooth noise-based, deterministic.

Colour
- `H.hex('#rrggbb')` returns `[r,g,b]` (0-255). `H.rgba([r,g,b], a)` returns a CSS string. `H.mixRGB(a, b, u)` returns `[r,g,b]`.

Textures and finishing (cached where static)
- `H.offscreen(key, w, h, drawFn(ctx, w, h))` returns a cached canvas; `drawFn` runs once per key.
- `H.paperTexture(w, h, { seed, tone: '#f4efe4', fiber: 0.5, grain: 0.5, blotch: 0.3 })` returns a cached canvas.
- `H.grain(ctx, t, { strength: 0.06, cell: 2, seed: 1, fps: 30, mono: true, blend: 'overlay' })`: animated film grain, changes per frame index, deterministic.
- `H.vignette(ctx, { strength: 0.35, color: '#000', inner: 0.55 })`.

Lines and shapes
- `H.bezier(p0, p1, p2, p3, n = 48)` returns points. `H.resample(pts, step)` returns evenly spaced points. `H.pathLength(pts)`.
- `H.partial(pts, u)` returns the leading fraction `u` of a polyline by length (draw-on).
- `H.wobble(pts, noise, { amp: 1.5, freq: 0.012, seed: 0 })` offsets points along their normals (hand-drawn wobble).
- `H.strokePath(ctx, pts)` traces a polyline (`beginPath` + `moveTo`/`lineTo`); the caller sets style and calls `stroke()`.

Type
- `H.loadFonts(['600 64px Inter', ...])` returns a Promise (wraps `document.fonts.load` for each spec, then `document.fonts.ready`).
- `H.fitFont(ctx, text, maxWidth, sizeToSpec, maxPx, minPx)` returns the largest px size in range whose width fits; `sizeToSpec(px)` builds the CSS font string.
- `H.typeOn(text, u)` returns the first `round(u * length)` characters.

## 3. `SOUND` kit (`lib/sound.js`, global `window.SOUND`)

Synthesised with Web Audio only. No audio files.

- `SOUND.kit(audioCtx, { voiceover = false })` returns `k`:
  - `k.play(name, t, { gain = 1, pan = 0, f, dur, minor = false })`: a preset at time `t`.
  - `k.tone(t, { f = 440, dur = 0.2, type = 'sine', gain = 0.5, pan = 0, a = 0.005, r = 0.1, glideTo, minor })`. `f` may be a number in Hz or a note name such as `'E5'`.
  - `k.noise(t, { dur = 0.2, color = 'white'|'pink'|'brown', filter = 'lowpass'|'highpass'|'bandpass', f = 2000, q = 0.7, gain = 0.3, pan = 0, a = 0.005, r = 0.05, minor })`.
  - `k.bed(t0, t1, { kind = 'room'|'hum'|'vinyl'|'wind'|'tape'|'night', gain = 0.15 })`: a quiet ambience under everything. Dropped in voiceover mode.
  - `k.music(t0, t1, { mood = 'calm'|'bright'|'tense'|'dreamy', bpm = 96, key = 'C', gain = 0.4 })`: a simple procedural pad and pulse. Dropped in voiceover mode.
  - `k.minor(fn)`: everything scheduled inside `fn` counts as minor.
- Voiceover mode: beds and music are dropped, minor sounds play at about 60%, and everything sits about 4 dB lower so narration stays on top.
- Presets for `k.play` (each has sensible defaults; `dur` matters for the ones marked *):
  `tock, pop, thud, ding, bell, impact, slap, click, tick, key, press, stamp, paper, tape, roller, success, error, buzz, count, blip, select, coin, powerup, sparkle, glitch, neon, whoosh, swish, riser*, stroke*, pencil*, chalk*, erase*, typing*`.
  `stroke` is a marker or pen scratch; `pencil` and `chalk` are drier, grittier variants; `typing` is a run of key clicks.
- `SOUND.live(scoreFn, fromT, opts)` starts real-time playback from `fromT` and returns `stop()`.
- `SOUND.renderOffline(scoreFn, duration, sampleRate = 48000, opts)` returns a Promise of an interleaved stereo `Float32Array`.
- `SOUND.toWav(interleaved, sampleRate)` returns WAV bytes as a `Uint8Array`.

## 4. `FEATURES` audio-analysis & lyric loader (`lib/features.js`, global `window.FEATURES`)

Loads offline stem analysis (`analysis.json` + binary `features.f32` from `tools/timing/analyze-stems.py`) and word-aligned lyrics/captions (`words.json` from `tools/timing/align-words.py`) for deterministic frame lookup at any timestamp `t`:

- `await FEATURES.load(analysisJsonUrl, featuresBinUrl)` returns feature controller `f`:
  - `f.cursorAt(t, out)`: writes interpolated 120 Hz stem channels (`full`, `drums`, `bass`, `guitar`, `piano`, `other`, `vocals`, each with `.level`, `.env`, `.onset`, `.bright`), plus `beatPhase`, `barPhase`, `beatIdx`, `barIdx`, `isDownbeat`, `inSilence`, `section`, and monotone musical time `tau` into `out`.
  - Auto-gates absent Demucs stems (`span < 0.04`) to `0` so stem bleed never triggers visual transients.
  - `f.sinceLast(name, t)`: seconds elapsed since the most recent refractory-gated onset peak on channel `name`.
  - `f.pulseAt(name, t, attack = 0.012, decay = 0.22)`: shaped `[0..1]` transient envelope for channel `name` at time `t`.
  - `f.tau(t)`: strictly non-decreasing musical time integral.
- `await FEATURES.loadLyrics(wordsJsonUrl)` returns `{ lines, words, duration }`:
  - Applies `FEATURES.fixFirstWord(data, maxDur = 0.45)` automatically so pre-vocal silence is never attached to word 0.
  - `FEATURES.lineAt(lyrics, t, { leadIn = 0.18, tailOut = 0.35 })` returns `{ active, prev, next, word, wordIndex, lineProgress, wordProgress }`.

## 5. `INK` hand-drawn doodle & camera plate kit (`lib/ink-doodle.js`, global `window.INK`)

Deterministic whiteboard/notebook drawing and Ken Burns plate camera helpers:

- `INK.setBoil(t, seed = 1)`: quantizes hand-drawn wobble phase to 8 fps (`floor(t * 8)`).
- Primitives: `INK.line(ctx, x1, y1, x2, y2, opts)`, `INK.curve(ctx, pts, opts)`, `INK.box(ctx, x, y, w, h, opts)`, `INK.circle(ctx, cx, cy, r, opts)`, `INK.under(ctx, x, y, w, opts)`, `INK.arrow(ctx, x1, y1, x2, y2, opts)`, `INK.thought(ctx, cx, cy, rx, ry, opts)`.
- `INK.marker(ctx, text, x, y, opts)`: ALL-CAPS marker typography with left-anchored write-on (`u` in `0..1`) so centered labels never shift horizontally while typing on.
- `INK.plate(ctx, img, tLocal, dur, cam, opts)`: cover-fit Ken Burns camera with normalized Points of Interest (`fx, fy` in `0..1`), zoom, roll, pan (`k0 -> k1`), `INK.glow`, and `INK.flicker`.

## 6. Three.js WebGL post-processing pipeline (`lib/webgl-post.js`, ES module `createPost`)

4-stage deterministic composer (`RenderPass -> FxOverShader -> UnrealBloomPass -> FinalGradeShader`) for Three.js scenes:

- `createPost(THREE, { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass }, renderer, scene, camera, width, height)` returns `{ composer, fxOver, bloom, finalPass, setSize(w, h), update(params), render() }`.
- `FxOverShader`: selective warm/saturated HDR push so neutral white typography does not bloom.
- `FinalGradeShader`: ACES tone mapping with light-ground `paperMode` soft-knee bypass, luma-only impact inversion (`col + (1 - 2Y)`), radial chromatic aberration, hash-band glitch, camera shake, deterministic 2×2 film grain, scanlines, vignette, and crisp 2D UI overlay texture (`tUI`).

## 7. Renderers (`starter/render.mjs` & `tools/render/`)

```
node starter/render.mjs <page.html> --out out.mp4 [--fps 30] [--from 0] [--to <DURATION>]
               [--audio none|page|<file.wav>] [--voice narration.wav] [--crf 18]
```
- `--audio page` renders `window.scoreSound` offline through `SOUND.renderOffline` and muxes it.
- `--voice` mixes a narration track over the effects; the page's sound is rendered in voiceover mode.
- The canvas size sets the output size. Frame `n` is drawn at `t = from + n / fps`.
- High-throughput / specialized renderers in `tools/render/`:
  - `node tools/render/parallel-ws-render.mjs`: multi-worker headless Chrome GPU WebSocket capture with RFC 6455 continuation-frame reassembly (`> 128 KB`), RAM/disk spool caps, subframe motion blur (`--samples`), and 4-frame cut contact sheets (`--cuts`).
  - `uv run tools/render/workbook-render.py`: browserless Python + Pillow + FFmpeg `rawvideo rgb24` renderer with BT.709 conversion/tags, `.srt`, `poster.png`, and `qa/storyboard.png`.
  - `bash tools/render/codex-imagegen.sh`: parallel batch storyboard plate generator locked to a reference PNG.

## 8. Export limits and reproducibility

- Video output is H.264, 8-bit yuv420p, limited-range BT.709 with AAC when audio is present. It is a compatibility export, not a 4:4:4 archival master.
- Ranges must satisfy `0 <= from < to <= DURATION`. Output contains `round((to-from)*fps)` frames; choose frame-aligned durations for an exact requested length. Frame 0 samples `from`; the endpoint `to` is exclusive.
- `--stills t0,t1` with `--outdir DIR`, and `--sheet N --out sheet.jpg`, use the same drawing function. Still times may include the page endpoint for inspection.
- Audio and narration files are timed from page time zero. Range exports trim all tracks by `from`, then pad/trim to the exact frame-derived duration. `--voice` also uses page effects in voiceover mode unless `--audio` is explicitly set.
- Noise and score choices are seeded. Native Web Audio processing can differ by tiny floating-point rounding across runs or browser versions. Compare waveform tolerance; do not promise byte-identical PCM. Video seek determinism is tested in the same browser/font environment; cross-machine pixel hashes are not promised.
- Renderer owns its headless Chrome and ffmpeg children and closes them on errors. It does not manage other sessions or browsers.
