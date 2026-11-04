---
id: ridgeline
name: Ridge-Plot Print
family: Data & information
fonts: [Space Mono]
best_for: repeated runs that converge, training or iteration stories, noise turning into signal, "many tries, one result" arguments, science and engineering, quiet confident tone
avoid_for: playful or warm topics, branching comparisons, anything that needs colour coding, tables, or more than two or three labels on screen
---

# Ridge-Plot Print

The viewer believes they are looking at an offset print of a chart-recorder plot: dozens of thin cream lines on rough black stock, each one a noisy trace whose black underside hides the trace behind it, so the stack reads as a mountain range. A pen tip sweeps each line into place, and when the stack is complete the peaks breathe like a live signal. The one quality that sells it: the stack is dense, orderly and almost wordless; tiny letter-spaced mono type is the only commentary.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (stock) | #050505 | rough black paper; never pure #000 |
| Primary ink | #f2f0ea | cream; all traces, axes, text |
| Secondary ink | #f2f0ea at 60% / 40% / 24% | captions, inactive labels, empty-stack hairlines |
| Accent | stroke weight | the last trace or the answer line drawn 2x thicker; used for the single most important thing on screen |
| Alarm / wrong | struck marks | a hand-scribbled spiral ring or an X in primary ink; no second colour |
| Print density | 82-100% | per-area ink coverage (see Finishing passes) |
| Stock lift | rgb(5-11, 4-9, 2-5) | warm light added to the black |

One ink on one stock. Never colour; hierarchy is alpha and line weight.

## Ground and surface
1. Fill #050505 every frame.
2. Cached with `H.offscreen`, keyed by canvas size: **ink-density map**, built at 320x180 and stretched to the frame with smoothing: `d = 1 - 0.13*v - 0.06*f` where `v = 0.5 + 0.5 * noise.fbm2(x*0.045, y*0.045, 4)` (broad blotches) and `f = 0.5 + 0.5 * noise.n2(x*0.6, y*0.6)` (speckle); channels `(d, d-0.01, d-0.03)` so the ink is a hair warm.
3. Cached: **stock layer**: black fill; add a warm lift built at 256x144 and stretched: `rgb(5 + 6v, 4 + 5v, 2 + 3v)`, `v` from `fbm2(x*0.03, y*0.03, 4)`; then 900 faint fibres from `H.rng(77)`, each a short curved stroke (length 4.5-21px, bend 0.6 rad, width 0.6-1.5px, colour rgb(c, c-2, c-5) with c 8-20).
4. The plotted block is centred. Stack of N=60 rows, 570px wide, row pitch 9.9px, block height about 584px; optical centre sits 6px low because the peaks rise above their baselines.
5. Per frame: traces, text, then the print pass.

## Mark-making
**Trace** `trace(x0, x1, baseY, k, peaks, noiseAmt, row, sweep, lw)`: sample every 2px along x. For each x:
1. Window: `env = sin(PI * clamp((u - 0.2) / 0.6))^1.6` (u = 0..1 across the trace), zero outside the central 60% so the edges stay flat.
2. Signal: sum of Gaussians, `h * exp(-0.5 * ((x - mu) / s)^2)`, times `env`.
3. Texture: `noise.n3(x*0.32, row*0.9, t*0.8) * (0.9 + env*3.2*noiseAmt)` plus a slow broad term `noise.n3(x*0.06, row*0.45, t*0.3) * env * 9 * noiseAmt` with a second `H.noise` seed.
4. Point is `[x, baseY - max(-3, signal + texture) * k]`.
Peak sets per row come from `H.rng(1000 + row)`: 4-7 peaks, centres `centre + r.gauss() * 54`, widths 6-25px, heights `9 + 78 * r()^1.7`; 45% of rows add a faint side lobe 82-142px off-centre, height 6-24px. For motion: centres drift `sin(t*0.9 + row*0.37 + j) * 4.5` and heights breathe `0.75 + 0.25 sin(t*1.3 + row*0.5 + 2j)`; this is closed-form in `t`.

**Occlusion** (what makes it a ridge): draw rows top to bottom. For each row: close the polygon down to `baseY + 3 * pitch` and fill with #050505, then stroke the polyline in #f2f0ea, 1.9px, round joins. Lower rows therefore hide the feet of upper ones.

**Pen sweep**: row `i` starts at `0.15 + 0.036 * i` s and takes 0.24 s; the visible fraction of points is `H.ease.inOutCubic(u)`; while sweeping, a radial dot at the tip, radius 7.5px, white 0.6 to 0.

**Magnified trace** (acting out a step): same routine, `k = 2` to `3`, width 3.3px, lower noise (0.5), 3 rows 240px apart.

**Dashed target**: a Gaussian drawn as a dashed 3px line (`setLineDash([9, 9])`) at the position the answer should be.

**Scribble ring**: a spiral of 60 points, angle `-1.9 + q/60 * 6.8` rad, radii 81 x 99px growing 0.15% per point, 3px.

## Type and numbers
- Space Mono only. Title 84px bold, tracking 12px, centred; after the hook it shrinks to 36px bold, tracking 4.5px, and docks top-left (0.8 s, `H.ease.inOutCubic`).
- Story-critical labels 42px bold; row labels 45px bold (full alpha when active, 40% otherwise); secondary captions 33px regular at 60%. Decoration-only hairline captions under a still: 15-18px, tracking 4.8 (bold) and 1.8 (regular), never story-critical.
- Counter: 105px bold; key number 126px bold; takeaway 66px bold centred near the bottom. Whole numbers with separators, counted with `H.ease.inOutCubic`; no flash, no colour, no punch.
- Letter-spaced text is drawn per character. Reveal: character `k` of `n` fades in over 0.15 s starting at `t0 + k * 0.5 / n`.
- Everything fades; nothing slides or types.

## Diagrams: arrows, labels, charts
- Arrow: a 3px hairline drawn on over 0.3-0.6 s; the head (two 18px strokes at +-0.45 rad) appears only when 95% done.
- Label: a lower-case word or short quoted phrase in mono, 27px above or beside the thing, at 85% alpha; `error` and similar words sit centred on the arrow, 21px above.
- Wrong: the quoted guess above the peak, a 3px X (33px square) beside it, and the scribble ring around the peak. Right: the answer in quotes plus a three-point tick, 3px, 39px wide.
- Loop marker: a bracket (3px) at the left spanning all rows, with a rotated 36px word "repeat" and a small arrowhead.
- Chart: the stack is the chart. An answer axis under it (1.5px hairline at 40%), tick marks 13px long at named positions, labels 39px bold; row labels at the first and last rows ("round 1", "round 60", 36px, 72%); a readout to the right: caption 33px, number 126px, a 4.5px underline drawn 255px wide over 0.5 s, and a 3px bracket with a two-line note.
- The axis is redrawn after the stack (the black fills cover it).

## Motion
- Traces are drawn, not moved: sweeps of 0.22-0.24 s, starts staggered 0.026-0.036 s, so 60 rows take 1.5-2.3 s.
- Magnified traces morph into the first rows of the stack over 0.8 s (`H.ease.inOutCubic`): x range, baseline, vertical scale 2.0 to 1.35 and line width 3.3px to 2.1px all interpolate; their labels fade out.
- Convergence: for row `c = (i/59)^0.8`, noisy peaks fade from 5 to 0, the wrong-answer peak scales by `(1 - c)`, the right-answer peak grows 22px to 93px and narrows from 0.035 to 0.022 of the width, jitter drops 75%. Noise amount goes from 1 to 0.25 down the stack.
- Between beats: peaks breathe, the tape scrolls 255px per second, the pen glow trails. Hold 2-4 s per idea.
- Key moment: the last trace thickens to 3.9px and the readout underline draws.

## Scene changes
Fade-through, 0.3-0.4 s: the old layer's alpha to 0 while the next begins its sweeps; or a morph where the same traces become the next layout's rows. No wipes or cuts. Between acts the empty stack of 60 hairlines (1px, 24%) can rule itself in over 0.5 s, row delay 0.008 s, to promise the next plot.

## Finishing passes (run every frame, same strength)
1. Ink spread: copy the frame to a half-size and a quarter-size scratch canvas (created once), draw them back at full size with smoothing, `lighter`, alpha 0.22 and 0.07 (about 1px bleed and a 3px halo).
2. Ink density: `multiply` the cached density map. Black stays black; cream becomes 82-100% dense and blotchy.
3. Stock: `lighter` with the cached stock layer.
4. `H.grain(ctx, t, {strength: 0.06, cell: 1, fps: 12, mono: true})`. Same strength on every frame, so it reads as print tooth, not video noise.
5. No vignette, no glow other than the pen tip.

## Sound palette
Quiet laboratory: a stylus, a servo, a few soft low notes. Two answer pitches: A = 196 Hz (G3), B = 294 Hz (D4).
- element appears (a trace sweeps): stylus `k.noise(t, {filter: 'bandpass', f: 1800, q: 1.4, dur: sweepLen, gain: 0.028, a: 0.03})` over a servo `k.tone(t, {f: 92, type: 'triangle', dur: sweepLen, gain: 0.035, a: 0.03})`; each tall peak sounds its answer pitch (0.35 s, gain 0.13) at the moment the pen crosses it.
- label lands: `k.tone(t, {f: 'A3', dur: 0.7, gain: 0.08, a: 0.01, minor: true})`; low labels D3 and B2.
- arrow completes: a quiet band-passed sweep, `k.noise(t, {filter: 'bandpass', f: 1100, q: 1.4, dur: 0.5, gain: 0.04, a: 0.05, minor: true})`.
- drawing / writing: hairline reveals have no sound; scribbles use `k.play('pencil', t, {dur: 0.5, gain: 1.5})`.
- scene change: `k.noise(t, {color: 'brown', filter: 'bandpass', f: 300, q: 0.6, dur: 0.9, gain: 0.12, a: 0.4})`, a low slide.
- wrong: two falling triangle tones, D3 (dur 0.3, gain 0.16) then A2 (dur 0.55, gain 0.17), 0.18 s apart, then the scribble. right: pitch B (dur 1.2, gain 0.14) with its fifth above (1.5x, dur 1, gain 0.09).
- key number: counter ticks `k.noise` bandpass f 1800 (dur 0.014, gain 0.18) plus a 150 Hz `k.tone` (dur 0.02), at most 12/s; three detuned drones glide from 0.78x, 1.22x and 0.93x onto pitch B across the stack plot (`glideTo`); landing: `k.play('impact', t, {gain: 0.55})`, B (dur 2, gain 0.17) and B/2 (gain 0.12).
- takeaway: staggered chord D3 A3 D4 F#4, 0.09 s apart, dur 1.4, gains 0.09 to 0.06.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.3})` and `k.bed(0, DURATION, {kind: 'tape', gain: 0.4})`; no music.

## Signature moves
- Sixty lines sweep in one after another, each hiding the one behind.
- The stack breathes between beats; the peaks are alive.
- Noisy rows converge on one clean ridge as the plot reaches the bottom.
- Three magnified traces act out guess, check, adjust, then fold into the stack.
- A scribble ring and a dashed target mark the miss and the fix.
- Tiny letter-spaced captions fade in character by character under a centred block.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Lines see through each other | fill below each trace in ground colour, draw top to bottom |
| Peaks reach the block edges | zero the signal outside the central 60% |
| Every row alike | per-row `H.rng(1000 + row)`; use the row as a noise coordinate |
| Pure digital white on black | cream ink, density map, spread, stock lift, grain |
| Captions loud | decoration at 15-18px; real labels 42px but rare |
| Axis vanishes under the stack | redraw it after the last row |

## Hero frame recipe
1. Cached density map and stock layer; fill #050505.
2. 60 rows centred, 570px wide, pitch 9.9px, built with the peak and noise recipe; draw top to bottom with fill then 1.9px stroke.
3. Peaks clustered near the centre, a few side lobes; time set after the last sweep so everything is drawn.
4. Two caption lines 72px below the block: bold 18px tracking 4.8 at 82%, regular 15px tracking 1.8 at 42%.
5. Ink spread, density multiply, stock lift, grain 0.06. Check: lines must be visibly softer than a vector render and the ground must not be pure black.
