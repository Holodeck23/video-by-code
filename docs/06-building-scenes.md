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

Validate coverage once during initialization. If you render a still at exactly `DURATION`, clamp that diagnostic request just inside the final scene or handle the final state explicitly. Exported frames lie before the exclusive end.

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

## Compute motion from time

For an event beginning at `start` and settling at `end`, use normalized progress:

```js
const u = H.prog(t, start, end);
const x = H.lerp(x0, x1, H.ease.outCubic(u));
```

Use easing to express weight and intent. A utility label often needs a restrained ease-out; a playful object may overshoot. Do not apply elastic motion to every number, caption and frame edge.

For a reversible envelope, combine entry and exit explicitly:

```js
const enter = H.ease.outCubic(H.prog(t, start, start + 0.35));
const leave = H.prog(t, end - 0.25, end);
const alpha = enter * (1 - leave);
```

The film remains readable only if the interval between entry and exit is long enough. Make the hold a deliberate part of the shot table.

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

Grain is a finishing choice with an encoding cost. Fine per-pixel grain raises bitrate and can damage small type. A small amount of larger-cell grain can retain texture with less compression stress. Keep text above heavy texture where necessary.

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

For hand-drawn character, use seeded spatial wobble along the normal of the path. Keep the wobble coherent over time unless the chosen style specifically calls for boiling lines. Randomly changing every point each frame creates jitter, not an authored pen stroke.

Position an arrowhead using the tangent near the revealed endpoint. Keep it hidden until there is enough path to establish direction. Labels should arrive after or with the relationship they describe, then hold.

## Text is layout, not a last-minute overlay

Load the exact font before measuring. A fallback font may fit differently, changing wrapping and ruining a frame. `H.loadFonts` waits for requested fonts, but the production still needs the actual font files or a consciously accepted system fallback.

Use a scale with separate roles: hero headline, body, caption and label. `H.fitFont` can fit a short line inside a width, but it is not a multi-line layout engine. Give it a minimum approved size. If text still does not fit, change the wording or composition.

For active-word typography, measure the entire phrase once and keep positions stable. Use individual measured word widths plus gaps. Highlight or reveal words without re-centering the line every time; otherwise the sentence swims under the reader's eye.

Align labels to the geometry they name. Add explicit collision bounds, including shadow or stroke. Inspect the longest labels and dense frames at delivery scale. Captions need their own reserved region; see [chapter 5](05-narration-and-captions.md).

## Show state and consequence

For a queue, define job arrival times and completion times. At time `t`, derive the state from those events:

```js
const jobs = [
  {id: 'a', arrived: 1, completed: 5},
  {id: 'b', arrived: 2, completed: 7},
  {id: 'c', arrived: 3, completed: 9},
];
const waiting = t => jobs.filter(j => j.arrived <= t && t < j.completed);
```

Do not remove a job by mutating the list when a frame crosses its completion time. A later seek backward would then lose it. A visible action should leave the appropriate state afterward, even when that later frame is drawn first.

History-dependent simulations are a special case. If you truly need one, use a fixed-step simulation from a seed and initial state, or reproducible checkpoints. Define what a seek does. A variable `dt` from wall time is unsuitable for offline output.

## Transitions, cuts and motion blur

Plan continuity in screen position, scale, colour and direction. When a job becomes a result, keep an identifiable feature through the transition. A cut between near-identical camera framings can feel like a jump rather than a new shot.

Test the frames immediately before and after every boundary. For a cut at `tc`, inspect `tc - 1/fps`, `tc` and `tc + 1/fps`, plus a short continuous clip. A centre-frame contact sheet will miss a one-frame flash.

When mapping a fractional cut time to an output frame, choose the first sampled frame on or after the cut: `nCut = Math.ceil((tc - from) * fps)`. This is a different operation from rounding a requested output duration to a frame count. Using `round` for the cut can switch scenes one sample early. Prefer authored integer-frame boundaries when exact edit placement matters, and test the actual samples around the boundary rather than only the analytic camera path.

The included renderer samples one picture per output frame. It has no built-in multi-sample motion blur flag. If adding blur in a custom engine, average subframes within the current shot's interval and avoid sampling across a hard cut. Global frame blending can leave ghosts from the previous shot.

For stepped animation, quantize only the intended layer's time, for example `Math.floor(t * 12) / 12`, while captions and camera moves may remain smooth. Verify that this is a chosen craft effect rather than accidental choppiness.

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
