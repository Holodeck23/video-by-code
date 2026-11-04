# 6. Build scenes that can draw any moment

Implement the approved shot map as data plus small drawing functions. Each function receives an explicit time and returns a complete picture or layer. It should not need to know which frame was drawn previously.

## Organize the film

A practical separation is:

```text
timeline       scene intervals, word cues, events and feature curves
style          colours, fonts, type sizes, margins and material choices
primitives     arrows, labels, nodes, charts, textures and transitions
scenes         one file or function per distinct story beat
film           chooses scene, clears frame, composes layers
score          schedules effects at the same event times
```

Keep the page contract in [lib/API.md](../lib/API.md). The included helpers are globals in a plain browser script; loading them does not require a bundler. For a larger film, modules or a build tool may help, but the exported page must still provide the same interface.

Use half-open scene intervals `[start, end)`. Adjacent scenes should meet exactly. A selector should not silently fall back to a title screen if the timeline has a gap:

```js
const scenes = [
  { start: 0, end: 4, draw: drawProblem },
  { start: 4, end: 9, draw: drawMechanism },
  { start: 9, end: 12, draw: drawOutcome },
];
function sceneAt(t) {
  const s = scenes.find(s => t >= s.start && t < s.end);
  if (!s) throw new Error(`No scene covers ${t}`);
  return s;
}
```

Validate coverage once during initialization: the first scene starts at 0, each `end` equals the next `start`, and the last `end` equals `DURATION`. Cover instrumental stretches and the tail too. If you render a still at exactly `DURATION`, clamp that diagnostic request just inside the final scene or handle the final state explicitly. Exported frames lie before the exclusive end.

Repeated structures are one module with an index, not copies: a chorus scene takes `chorusIndex` and changes state with it (a larger counter, more damage, a warmer accent), so the repeat carries a consequence. An insert (a close-up cut into a running shot) declares its own `[from, to)` window and leaves the underlying shot's clock untouched, so cutting back lands where the shot would have been.

### Fanning scene work out to several agents

Scene modules parallelise well when the shared parts are frozen first. The rules below come from a film built by several agents at once:

1. **Lock the shared layer before fan-out.** Primitives (2D and 3D helpers, interface chrome), the timeline file and the data files (`analysis.json`, words, sections) are written and reviewed first. Agents import them; they never edit them.
2. **Parameterise repeats** (`chorusIndex`, `verseIndex`) so one agent owns a repeated structure.
3. **Give each agent one or two scene files**, with a strict list of the files it may touch.
4. **Keep each scene file to roughly 260 to 380 lines.** Asking one agent to write three 600-line scene files in a single turn failed: the third file write (about 10,000 output tokens) was dropped by a streaming timeout, and the turn looked complete until the file was opened.
5. **Gate the merge**, before any long render:
   - a typecheck or syntax check (`npx tsc --noEmit` for a TypeScript engine, `node --check file.js` for plain scripts);
   - a whole-film sheet: `node starter/render.mjs film.html --sheet 36 --out "$PROD/qa/sheet-36.jpg"`;
   - a look audit on stills from every scene: `node starter/render.mjs film.html --stills 8,31,54,77,100 --outdir "$PROD/qa/stills"`, then `uv run tools/verify/measure-look.py "$PROD/qa/stills" --compare "$PROD/references/stills"`;
   - `node starter/determinism.mjs film.html`.

A whole-film sheet proves coverage and palette drift. It does not prove transitions or motion; those need the boundary checks later in this chapter.

## Start every frame from a known baseline

Reset transforms, opacity and compositing before clearing. Balance every `save()` with a `restore()`, including early returns. Clip regions are part of state; a forgotten clip can hide every later scene even when each scene's geometry is correct.

```js
function resetFrame(ctx, width, height, ground) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);
}
```

This reset does not undo an already leaked clipping region. The real fix is a balanced state stack. A useful structure is a top-level `save()`/`restore()` around each scene, with helpers following the same discipline.

Canvas path state also needs care: call `beginPath()` before unrelated shapes. Set fonts, alignment, baseline, line caps and stroke widths where a helper depends on them, rather than inheriting them accidentally from an earlier helper.

In WebGL the equivalent of a leaked state is a pass that fails to clear. If a background shader fails to compile (for example because it references a colour constant the shared shader prelude never declared), its pass draws nothing, the target is not cleared, and earlier scenes ghost underneath later ones. Treat any shader compile error in the console as a failed frame, and assert in the render harness that the page logged no errors.

## Compute motion from time

For an event beginning at `start` and settling at `end`, use normalized progress:

```js
const u = H.prog(t, start, end);
const x = H.lerp(x0, x1, H.ease.outCubic(u));
```

Use easing to express weight and intent. A utility label often needs a restrained ease-out; a playful object may overshoot. Do not apply elastic motion to every number, caption and frame edge. Destruction and burn effects that the audience should watch use linear progress: an eased burn front races through most of its distance early and finishes before the eye catches it.

For a reversible envelope, combine entry and exit explicitly:

```js
const enter = H.ease.outCubic(H.prog(t, start, start + 0.35));
const leave = H.prog(t, end - 0.25, end);
const alpha = enter * (1 - leave);
```

The film remains readable only if the interval between entry and exit is long enough. Make the hold a deliberate part of the shot table.

Smooth fast control curves before they move global position or scale. Small rapid movements driven straight from an onset curve read as jitter in a close shot. Use the follower envelopes (`<stem>.env`) or `f.pulseAt(events, t, halfLife)` rather than raw onset strength for anything that moves the whole frame.

## Deterministic randomness and texture

Generate static random parameters once from a fixed seed:

```js
const rand = H.rng('queue-background-v1');
const dots = Array.from({length: 80}, () => ({
  x: rand.range(0, 1920),
  y: rand.range(0, 1080),
  speed: rand.range(8, 24),
  phase: rand.range(0, Math.PI * 2),
}));
function drawDots(ctx, t) {
  for (const d of dots) {
    const y = ((d.y - d.speed * t) % 1080 + 1080) % 1080;
    ctx.beginPath();
    ctx.arc(d.x + 8 * Math.sin(t + d.phase), y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

Do not advance a shared random generator inside each frame. Even a seeded generator becomes history-dependent if different render orders consume different values. Use precomputed immutable parameters, deterministic indexed hashes or a seed derived from the event identity.

Cache expensive static textures using `H.offscreen` or `H.paperTexture`. Make cache keys describe all input choices that affect the image. Two differently coloured textures sharing one key will incorrectly reuse the first. Avoid caching something that is supposed to change with `t` under a static key.

Grain is a finishing choice with an encoding cost. High-strength per-pixel animated grain made one 41-second pilot about 1 GB; coarser 2×2 grain at lower strength with CRF 18 brought the later master to about 399 MB (different passes, not a controlled benchmark). `H.grain(ctx, t, { cell: 2 })` draws cell-sized grain that changes per frame index. Fine grain also damages small type; keep text above heavy texture where necessary.

## State with history: three deterministic patterns

Anything that "remembers" must still be a function of `t`. Pick the simplest pattern that fits; test it by rendering timestamps out of order (`node starter/determinism.mjs page.html` visits twelve times in a scrambled order and compares hashes).

### 1. Closed form

Position is an equation of time. A crowd walking a lane is `x = wrap(phase + speed * t)`; a drone that falls when hit is a free fall from the hit time, `y = y0 + 0.5 * g * (t - tHit)²` for `t >= tHit`, and it stays where it lands. Use this whenever an equation exists.

### 2. The world as dated events

Model the story as events with times. The state at `t` is "every event at or before `t`", computed from `t` alone. The world remembers (what was destroyed stays destroyed) and every frame still renders out of order.

```js
const EVENTS = [
  { t: 42.0, kind: 'crack', pos: [610, 380] },
  { t: 61.5, kind: 'sweep', origin: [960, 540], speed: 900 },  // px per second
];
const signs = [{ id: 'a', pos: [300, 220] }, { id: 'b', pos: [1500, 700] }];
const sweep = EVENTS.find(e => e.kind === 'sweep');
// When the sweep reaches a sign: t0 + distance / speed. Derived, never stored.
const killedAt = s => sweep.t + Math.hypot(s.pos[0] - sweep.origin[0], s.pos[1] - sweep.origin[1]) / sweep.speed;
const isDark = (s, t) => t >= killedAt(s);
const cracksAt = t => EVENTS.filter(e => e.kind === 'crack' && t >= e.t);
```

Do not remove a job, sign or particle by mutating a list when a frame crosses its time. A later seek backward would lose it. The same pattern handles a queue:

```js
const jobs = [
  {id: 'a', arrived: 1, completed: 5},
  {id: 'b', arrived: 2, completed: 7},
  {id: 'c', arrived: 3, completed: 9},
];
const waiting = t => jobs.filter(j => j.arrived <= t && t < j.completed);
```

### 3. Fixed-step simulation with checkpoints

Fluids, flocking and advected particles have no closed form. Simulate once at load, with a fixed step from a seeded initial state, and save checkpoints. A frame restores the nearest earlier checkpoint and replays forward to `t`.

```js
const STEP = 1 / 120, EVERY = 2;                 // seconds per step, seconds per checkpoint
const checkpoints = [];                          // checkpoints[k] = state at k * EVERY
window.__ready = (async () => {
  let s = initialState(H.rng('flock-v1'));
  for (let k = 0; k * EVERY <= DURATION; k++) {
    checkpoints.push(structuredClone(s));
    for (let i = 0; i < Math.round(EVERY / STEP); i++) s = step(s, STEP);   // step() returns a new state
  }
})();
function stateAt(t) {
  const k = Math.min(checkpoints.length - 1, Math.floor(t / EVERY));
  let s = structuredClone(checkpoints[k]);
  for (let i = 0, n = Math.round((t - k * EVERY) / STEP); i < n; i++) s = step(s, STEP);
  return s;
}
```

A variable `dt` from wall time is unsuitable for offline output. A seek must restore a checkpoint and replay, never inherit the previous preview frame's state.

## Draw-on lines and handmade marks

Describe a path as points. Reveal it by path length, rather than drawing a varying count of widely spaced control points:

```js
const curve = H.bezier([120, 540], [450, 200], [880, 850], [1300, 540], 64);
const path = H.resample(curve, 5);
function drawArrowLine(ctx, t, start) {
  const u = H.ease.inOutCubic(H.prog(t, start, start + 0.8));
  ctx.save();
  ctx.strokeStyle = '#1b2530';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  H.strokePath(ctx, H.partial(path, u));
  ctx.stroke();
  ctx.restore();
}
```

For hand-drawn character, use seeded spatial wobble along the normal of the path. Keep the wobble coherent over time unless the chosen style specifically calls for boiling lines. Randomly changing every point each frame creates jitter, not an authored pen stroke. When boil is wanted, quantise it: `INK.setBoil(t)` steps the wobble through three states at 8 per second, which reads as drawn animation; boiling at 30 or 60 fps looks like electrical noise.

Position an arrowhead using the tangent near the revealed endpoint. Keep it hidden until there is enough path to establish direction. Labels should arrive after or with the relationship they describe, then hold.

## Text is layout, not a last-minute overlay

Load the exact font before measuring. A fallback font may fit differently, changing wrapping and ruining a frame. `H.loadFonts` waits for requested fonts, but the production still needs the actual font files or a consciously accepted system fallback.

Use a scale with separate roles: hero headline, body, caption and label. `H.fitFont` can fit a short line inside a width, but it is not a multi-line layout engine, and when nothing fits it returns the minimum size you passed without telling you. Measure again at the returned size; if text still does not fit, change the wording or composition.

### Fit-to-width must know the alignment

The room a row has depends on where it is anchored. One global maximum width is wrong for every row that is not centred on the frame:

```js
// safe = { left, right } in canvas pixels
function roomFor(align, x, safe) {
  if (align === 'left') return safe.right - x;
  if (align === 'right') return x - safe.left;
  return 2 * Math.min(x - safe.left, safe.right - x);   // centre: twice the distance to the nearer margin
}
function fitRow(ctx, fullText, x, align, safe, spec, maxPx, minPx) {
  const room = roomFor(align, x, safe);
  const px = H.fitFont(ctx, fullText, room, spec, maxPx, minPx);
  ctx.font = spec(px);
  if (ctx.measureText(fullText).width > room) throw new Error(`"${fullText}" does not fit ${room}px at ${px}px`);
  ctx.textAlign = align;                                  // the renderer must honour right alignment
  return px;
}
```

Failures this prevents, all observed:

- A fit that ignored alignment produced a collision that read as one garbled word across two rows.
- A renderer with only left and centre modes silently centred "right-aligned" rows on their anchor and pushed them off the frame.
- Fitting each row to the words sung so far changed its size every word. Fit the row once using its **full eventual text**, then reveal words inside that layout.

### Stack rows; do not pair them

Two lyric rows that share a baseline (one left, one right) collide as soon as each is fitted properly. Stack rows vertically instead. Lay out each lyric line as its own row and wrap within that row only; flowing a multi-line lyric as one word stream breaks lines mid-phrase.

### Active words

For active-word typography, measure the entire phrase once and keep positions stable. Use individual measured word widths plus gaps. Highlight or reveal words without re-centring the line every time; otherwise the sentence swims under the reader's eye. The highlight never runs ahead of the voice: drive it from measured word starts (`FEATURES.lineAt(lyrics, t)` returns the active line), not from interpolated character counts. Use a pale tint of the accent for the active word rather than white, which blows out under bloom, and keep panel glow multipliers around 1 to 2.

Write-on lettering has the same rule. Slicing a centred string (`textAlign = 'center'`, `text.slice(0, n)`) shifts every drawn letter left as each new letter arrives. Measure the full string once, compute the left edge, and draw the prefix left-aligned from there; `INK.marker(ctx, text, x, y, { p })` does this for marker lettering.

### Placement and safe areas

Align labels to the geometry they name. Add explicit collision bounds, including shadow or stroke. Inspect the longest labels and dense frames at delivery scale. Captions need their own reserved region; see [chapter 5](05-narration-and-captions.md).

Watch for two subtle Canvas text measurement traps found in production:

1. **System font weight snapping:** On macOS Chrome, system fonts such as `Arial` only provide weights `400` and `700`. Requesting `600 48px Arial,sans-serif` snaps to Bold (`700`), which can widen a long caption line by 8–10% and push it past the horizontal safe zone. Test `measureText(s)` using the exact resolved weight on the target machine.
2. **Glyph overhang and descenders vs. anchor coordinates:** `actualBoundingBoxLeft` and `actualBoundingBoxDescent` extend beyond the nominal `x` and `y` passed to `fillText`. Leave at least 6–8 px of margin inside your target safe box (for example, anchor left-aligned headlines at `x >= 86` when the safe zone begins at `x = 80`, and keep caption baselines at `y <= 1622` when the safe zone ends at `y = 1640`). Expose a `window.__textBounds()` array from your scene so automated checks can distinguish **story-critical text** (checked against strict safe-area margins) from **ambient chrome** (checked against the full canvas).

For 3D type, size planes from the camera frustum rather than by eye; the formula and safe values are in [chapter 12](12-advanced-engines-and-benchmarks.md#4-3d-typography-frustum-math--raymarched-sdf-rules).

## Light, bloom and layering

These rules come from the first style pass of an HDR pipeline (scene, then a type layer pushed selectively into HDR, then bloom, then a final grade). `lib/webgl-post.js` implements the pipeline; `createPost(...).render({ bloom, fxGain, flash, lumaInvert, paperMode, exposure, grain })` sets each frame's values.

### Dark ground

| Symptom | Cause | Rule |
|---|---|---|
| Bloom swallows the type | White type pushed past the bloom threshold | Push only accent-coloured pixels into HDR; set the bloom threshold at true overexposure, 1.0; keep white and neutral type below it |
| A white blob sits at the lens | Particles in the near field, uncapped size | Cap point size, keep emitters out of the near field, moderate additive intensity |
| Busy backgrounds kill legibility | Type over detail | A dark halo (shadow blur) behind display type, and dim the background layer during text-heavy shots |
| An impact flash reads as a grey frame | A long additive flash before tone mapping | Keep impact flashes short and strong |
| A dialog hides its own words | Opaque chrome composited above the type layer | Put opaque props on the type layer beneath the words; erase chrome rather than painting black over it |
| A burn finishes before anyone sees it | Eased progress | Linear progress for destruction the viewer should watch |

The kit's selective pass (`FxOverShader`) scales a pixel by `fxGain` (default 2.0) only where it is warm (red well above blue) and bright, so neutral white and steel-blue type stays below the bloom pass's threshold of 1.0 (bloom strength 0.5 and radius 0.4 by default).

Dark worlds also fail by being too bright: a small background mix in linear RGB lifts the whole frame. Calibration values are in [chapter 12](12-advanced-engines-and-benchmarks.md#3-quantitative-look-luminance--color-benchmarks). Measure, do not judge by eye on a bright monitor.

### Paper or light ground

Light-ground systems need their own versions of the same rules:

- **No filmic tone mapping.** ACES turns warm cream paper dull grey. `paperMode: true` skips ACES and rolls off only values above 0.90.
- **Only the accent hue goes into HDR.** Select it by hue, for example `blue − max(red, green)` for a blue accent, so ink and paper never bloom. The kit's paper mode uses saturation for the same purpose.
- **Halos behind type are ground-coloured, not dark.** Small mono labels need a ground-coloured halo too, or texture eats them.
- **Noise and static go on the world layer under the type**, never in the final pass over the words.
- **Inversion is luma-only.** An impact flash or dark section uses `col + (1 − 2Y)`: paper goes black, ink goes white and the accent keeps its hue. A full RGB negative turns a blue accent yellow and breaks the one-accent rule. Set `lumaInvert` between 0 and 1.
- **Additive light disappears on white.** Beams or lasers need a darkened section; the darkness arriving can itself be the story beat.

## Transitions, cuts and motion blur

Plan continuity in screen position, scale, colour and direction. When a job becomes a result, keep an identifiable feature through the transition.

Test the frames immediately before and after every boundary. For a cut at `tc`, inspect `tc - 1/fps`, `tc` and `tc + 1/fps`, plus a short continuous clip. A centre-frame contact sheet will miss a one-frame flash. The multi-worker renderer makes a four-frame sheet around every boundary (−0.1 s, −1/fps, +1/fps, +0.1 s) when the page exposes its shot starts as `window.__engine.timeline` or `window.TOUR.beats` (entries with a `start`):

```sh
node tools/render/parallel-ws-render.mjs film.html --cuts "$PROD/qa/cuts-sheet.png" --fps 60
```

### Frame index of a cut

When mapping a fractional cut time to an output frame, choose the first sampled frame on or after the cut: `nCut = Math.ceil((tc - from) * fps)`. This is a different operation from rounding a requested output duration to a frame count. Using `round` for the cut can switch scenes one sample early, and in a renderer with shutter interpolation it assigns the cut key to the previous shot so the blur sweeps between two cameras. Use the same `ceil` for the outgoing shot's last frame and the incoming shot's first frame, so there is neither a gap nor an overlap. Prefer authored integer-frame boundaries when exact edit placement matters, and test the actual samples around the boundary rather than only the analytic camera path.

### Camera continuity at shot boundaries

One pilot changed camera position, aim point and lens at about 4.57 s between two very similar framings. It read as a glitch. Deterministic seeking and regular frame timestamps both passed; neither test can see a badly authored transition.

1. **Make shot boundaries explicit** with an intent: continuous move, or cut. A continuous move needs continuous position, orientation, lens and focus; check velocity too. A cut may jump, but should have a readable editorial purpose.
2. **Compare camera states on both sides of every boundary**, and flag near-matching views with an abrupt change: the classic jump cut.

```js
// cam(t) -> { pos: [x,y,z], aim: [x,y,z] unit vector, fov: degrees }
const deg = (a, b) => Math.acos(Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2])) * 180 / Math.PI;
function suspiciousCut(a, b, { sameViewDeg = 12, sameFov = 6, moveTol = 0.25 } = {}) {
  const similarView = deg(a.aim, b.aim) < sameViewDeg && Math.abs(a.fov - b.fov) < sameFov;
  const moved = Math.hypot(a.pos[0]-b.pos[0], a.pos[1]-b.pos[1], a.pos[2]-b.pos[2]) > moveTol;
  return similarView && (moved || a.fov !== b.fov);
}
for (const tc of cuts) {
  const n = Math.ceil(tc * FPS);
  if (suspiciousCut(cam((n - 1) / FPS), cam(n / FPS))) console.warn(`review cut at ${tc}`);
}
```

The thresholds are diagnostics for one production, not cinematography rules. Tune them so they flag the case below.

3. **Keep a regression case from the real failed poses.** Paste the two camera states that read as a glitch into a test and assert that the gate flags them. Without it, a later threshold tweak can silently stop catching the known mistake.

```js
const failedPair = { a: { pos: [/* recorded */], aim: [/* recorded */], fov: 35 },
                     b: { pos: [/* recorded */], aim: [/* recorded */], fov: 28 } };
console.assert(suspiciousCut(failedPair.a, failedPair.b), 'camera gate no longer catches the known jump');
```

4. **Render paired boundary frames and a contiguous motion probe** across each risky transition before the long render. Check worker and chunk seams the same way. A whole-film board proves coverage, not transition quality.
5. **Label partial previews.** One assembled work-in-progress kept only seven frames of a shot before jumping to a later excerpt and was mistaken for a pacing problem. Cut previews at shot boundaries or keep them contiguous.

In continuous-camera styles (such as `transit-map`, where the camera pans across a world canvas instead of cutting), never start a beat's camera interpolation at `beat[i].start - preRoll` if the active beat index `i` only increments when `t >= beat[i].start`. Doing so holds the camera at `beat[i - 1]` until `t = beat[i].start` and then jumps instantaneously to `preRoll / moveDuration` on the boundary frame, creating a one-frame luma spike in `cut-harshness.py`. Start the camera move at `beat[i].start` (or evaluate a global camera keyframe table independent of `i`), fade beat-local callout cards over 0.18–0.22 s, and delay station-specific overlays until the camera settles (`local > 0.45`) so labels do not collide with moving routes during the pan. When zooming out to an overview (`z <= 0.30`) inside a clipped viewport card, verify that counter-scaled labels (`size / Math.pow(z, 0.78)`) on outer nodes still clear the clip rectangle on the very first and last frames.

### Motion blur, never across a cut

`starter/render.mjs` samples one picture per output frame. `tools/render/parallel-ws-render.mjs` can request sub-frames: with `--samples N` and `--shutter S` (fraction of a frame, default 0.5) it calls `window.__still(t, samples, shutter)` when the page defines it, and `__renderFrame(t)` otherwise. The page owns the averaging, so it can keep every sub-sample inside the current shot:

```js
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const acc = document.createElement('canvas');                // accumulation buffer, not a cached texture
acc.width = canvas.width; acc.height = canvas.height;
const actx = acc.getContext('2d');
window.__still = (t, samples = 1, shutter = 0.5) => {
  if (samples <= 1) return window.__renderFrame(t);
  const shot = sceneAt(t), span = shutter / (window.FPS || 30);
  for (let i = 0; i < samples; i++) {
    const ts = t - span / 2 + span * (i + 0.5) / samples;
    const clamped = Math.min(Math.max(ts, shot.start), shot.end - 1e-4);   // never sample the other shot
    window.__renderFrame(clamped);
    actx.globalAlpha = 1 / (i + 1);                            // running average: equal weights
    actx.drawImage(canvas, 0, 0);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(acc, 0, 0);
};
```

In WebGL, accumulate sub-frames in linear HDR before tone mapping for correct highlights. For a camera with shutter blur, sample shutter-time transforms: bake or sample the motion, interpolate rotations as quaternions with consistent signs (flip a quaternion whose dot product with its neighbour is negative) so Euler wrapping cannot spin the camera, and disable shutter blur around discontinuities. Whole-film frame blending is not a substitute: in one film a `tmix` blend made the worst cut harsher (luma delta 90 to 120) and left ghosts of the previous shot.

When a camera path is baked into keys, audit the baked path at fractional frames on both sides of each cut **without calling the analytic camera function**. The analytic evaluator can overwrite a faulty baked camera during the audit and make a broken shutter path look correct. In the observed regression, the baked path was off by about 5.4 metres at the cut; explicit linear keys and corrected cut indices brought the audited error to about 0.000058 metres. Those values describe that scene, not portable tolerances.

### Fast small objects strobe without blur

A code review once recorded, accurately and in advance, that only the camera, focus, lens and hero position carried shutter keys and other moving geometry had no blur. The render was approved anyway. The unblurred geometry was small fast debris, which strobes at 24 fps: three of six viewer "glitch" reports were exactly that, in the shots with the densest debris. Writing a limitation into a review does not discharge it. Fix it, or get it accepted by the person who will watch the film, by name, before the long render starts.

Check before shipping: extract three consecutive frames from the densest motion, crop and magnify:

```sh
ffmpeg -v error -ss 83.40 -i "$PROD/renders/pass/film.mp4" -frames:v 3 \
  -vf "crop=480:270:1180:420,scale=1440:-1:flags=neighbor" "$PROD/qa/strobe-%02d.png"
```

Smooth motion shows small displacements with softened leading edges. Strobing shows large displacements with perfectly crisp edges. Repairs, in order of preference: blur those objects with sub-frames, slow them or make them fewer and larger, or lower their contrast.

### Harsh cuts and stepped animation

A hard cut can pass every correctness check and still read as a glitch when its brightness change is many times the film's frame-to-frame baseline. In one film the baseline mean luma difference was 1.8 and the cuts viewers reported sat at 29 to 90. Run `uv run tools/verify/cut-harshness.py film.mp4` (it flags spikes above 10× the film's mean) and treat each flag as a decision: keep it as a deliberate slam, or soften it with a three-to-four-frame dissolve. See [chapter 8](08-verification.md).

For stepped animation, quantize only the intended layer's time, for example `Math.floor(t * 12) / 12`, while captions and camera moves may remain smooth. Verify that this is a chosen craft effect rather than accidental choppiness.

## Engine traps that look like art problems

| Symptom | Cause | Check |
|---|---|---|
| Previous scenes ghost under the current one | A shader referenced an undeclared constant, failed to compile and never cleared the target | Fail the render on any console error |
| Post stage crashes on some scenes | A scene returned `undefined` for a value the post pass destructures (a shake tuple) | Always return concrete values or omit the key; `createPost` treats a non-array `shake` as `[0, 0]` |
| A grade boost never appears | The same key declared twice in one object literal (`exposure: 1.35`, later `exposure: 1`); the second silently wins | Lint for duplicate keys |
| A batch of stills are all the opening frame | A render command ignored an unknown flag and rendered `t=0` | Check the timestamps in the output names or labels |
| Black frames from a rooftop camera | The camera looked through its own building's roof | Check line of sight against nearby geometry, not only the target |

## Sound uses the same event table

Schedule meaningful events with `window.scoreSound(k)` and the [sound API](../lib/API.md). Use fixed times shared with the animation:

```js
window.scoreSound = k => {
  k.play('paper', 0.45, {gain: 0.3});
  k.play('pop', 4.0, {gain: 0.2});
  k.play('success', 9.0, {gain: 0.25});
};
```

Keep the score independent of which frames are drawn. Do not play audio from inside `__renderFrame`, which can be called repeatedly and out of order. Preview and offline score rendering should use the same scheduled events.

Run the determinism check and a representative export after each meaningful scene change. Continue to [rendering](07-rendering.md).
