---
id: product-launch
name: Keynote Reveal
family: Light & imaging
fonts: [Inter]
best_for: product-style explainers, "introducing" stories, one central system with spec callouts, a single hero number, confident premium or tech tone
avoid_for: playful or handmade topics, dense text, many equal-weight objects, anything that needs a warm or human feel
---

# Keynote Reveal

The viewer believes they are watching a launch film shot in a dark studio: one machined, glass-topped hero object floats over a glossy floor while a slow camera orbits it. Light does the storytelling (rim light finds it, a key light rises, a highlight crosses the glass), and every fact arrives as huge tight-set type or a hairline callout. The stage is almost black, so every glow reads as expensive.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (stage) | #030304 | near black, never pure #000 |
| Key pool | #2c2f3c to #14151c | radial light behind the object, fades to ground |
| Floor pool | #464a5c | flattened ellipse of light under the object |
| Primary ink | #f5f5f7 | headlines, hairlines at reduced alpha |
| Secondary ink | #a1a1a6 / #6e6e73 | sub-labels / tertiary text |
| Accent gradient A | #b69cff, #e879f9, #ff9a4d | violet to fuchsia to orange: the hero number, the ring, eyebrow words |
| Accent gradient B | #5eead4, #38bdf8, #6d7cff | teal to blue: counts, forward signal |
| Right | #7cf0b8 to #2dd4bf (check disc #2fd6a0) | a landed answer |
| Alarm / wrong | #ff453a | strike lines only; backward signal #ff8c50 |
| White stage | #e4e4e9, #ffffff, #dcdce2 | closing scene; text #1d1d1f, arrows #86868b |

Gradients never run flat: always two or three stops, left to right across the word or line.

## Ground and surface
1. Fill `#030304`. Over it a radial gradient centred 0.9 object-units above the floor point, outer radius 1230px: `rgba(44,47,60,.9)` at 0, `rgba(20,21,28,.8)` at 0.45, transparent at 1, all multiplied by the key-light level.
2. Floor pool: an ellipse (scale y 0.24, radius 2.6 object-units) with a radial `rgba(70,74,92,.42)` to 0, under the object.
3. Bokeh: six soft discs from `H.rng(404)`, radius 60-165px, alpha 2.5-5% in violet, orange or sky (120,110,255 / 255,140,90 / 90,200,255), stops 1, 0.6, 0. Drift each by `sin(t*0.2+i)*21px` and shift by -15% of the camera's x so they parallax behind the object.
4. The stage is redrawn per frame (it follows the camera and the key level); only the grain tile and sprites are cached.

## Mark-making
**Faux-3D camera.** Keep a camera `{cx, cy, s, yaw, pitch}` where (cx, cy) is the floor point under the object. With focal `F = s*2850` and distance 7: rotate (x,z) by yaw, tilt by pitch, project to `cx + X*k, cy - up*k` where `k = F/(7 - depth)`. One object-unit is `F/7` px (about 407*s). Every shape on and around the object goes through this function.

**Hero body** (default: a rounded square slab, half-width 1, corner radius 0.27, thickness 0.12, 48 segments per corner, hovering at height 0.36 + 0.015*sin(1.2t)). Draw only forward-facing wall segments; for each outline segment take its normal and light it:
- brightness `v = 14 + 62*lambert*key + 140*min(1, 0.85*spec + 0.3*sheen)*key + 120*rimLight*rim`, with lambert from light dir (-0.6, 0.8), spec = (n . (-0.25, 0.97))^18, sheen = the same dot ^4, rim = max(0, n.x)^3. Tint `rgb(v*.96, v*.98, v*1.05+3)`.
- split each wall face into pieces under 60px long, so the gradient follows perspective; fill each with a linear gradient running perpendicular to the top edge, stops 0: 1.32v, 0.3: 1.05v, 0.52: 0.62v, 0.74: 0.82v, 1: 0.42v (softbox reflection, dark studio horizon, floor bounce). Stroke the same gradient at 1.4px to hide seams.
- a 1.8px `rgba(0,0,0,.6)` crease along the bottom edge.

**Glass top.** Fill a vertical gradient #1d2028 to #08090c, clip to the outline, then layer: a white softbox gradient (16% at the top, 3.5% at 0.35, 0 at the bottom); a fixed diagonal streak (peak 11% key-scaled); an inset panel (half-width 0.66, radius 0.12) filled `rgba(4,5,8,.92)`; a micro-grid on the panel every 0.08 units, 0.9px, 6-11% alpha.

**Whatever the topic's structure is** (nodes, lanes, layers) is etched on the panel as thin lines and dots resting at 5-30% alpha. A signal is a gaussian pulse (width factor 3) travelling across the layout: lines under it rise to 85% in `rgb(140,230,255)` going forward or `rgb(255,140,80)` going backward, each node under it gets a 4x-radius glow at 50%. Lines carry a per-item weight (width 1-4.5px) that can morph between two sets to show a change.

**Specular sweep.** A diagonal gradient across the glass whose centre u travels -0.25 to 1.25 over 1.8 s: stops u-0.16: 0, u-0.05: 0.08, u: 0.42*key, u+0.02: 0.18, u+0.1: 0.

**Edge ring.** A conic gradient (violet, fuchsia, orange, teal, blue, violet) rotating at 0.25-0.3 rad/s, stroked round the panel outline at 3.3px with `shadowBlur` 24 and shadow `rgba(200,130,255,.9)`, then a 1.2px white hairline at 50% on top. Ring level = 0.85 once lit, plus 0.9*exp(-(t - pulse)*5) at every pulse (each beat of the story pulses it).

**Top chamfer.** Stroke the top outline at 2.2px in `rgb(235,238,255)`, alpha = back^1.2*0.95*rim + front*0.45*key + 0.06, so the far edge is rim-lit and the near edge key-lit.

**Floor.** Contact shadow: flattened radial (y scale max 0.18, sin(pitch)*0.8), radius 1.45 units, black .75 / .3 at 0.6 / 0. Coloured spill with `lighter`: radius 1.9 units, violet 16% then orange 5% at 0.5, scaled by ring level. Reflection: draw the body mirrored (y negated, walls 0.9v, no top) to a scratch layer each frame, mask with `destination-in` using a vertical gradient from the floor point to +0.75 units (alpha 1 to 0), composite at 45% * key (22% on white).

## Type and numbers
- Inter 800 for headlines and numbers, 600 for labels, 400 for sub-labels. Tracking is -0.035em for any size >= 40px.
- Hook headline 162px, then it scales to 66px and moves to a top-left header (x 84, y 123) over 0.75 s. Statement headline 132px. White-stage tagline 99px. Eyebrow word 39px in gradient A.
- Words arrive one at a time, 0.25 s apart: `H.ease.outCubic` over 0.6 s, alpha 0 to 1, blur 15px to 0, rising 0.28*size from below. Word gap = space + 0.08*size. A gradient word spans only its own run (or a chosen span of words).
- Key number: Inter 800, 300px, gradient A, glow `shadowBlur` 75 at 50-90% violet, filled twice (glow pass, then clean pass). On landing the glow swells to about 165px and decays as exp(-2.2*dt), scale 1.05 then settles to 1.035.
- Counts in log space: `round(10^(6*ease))` formatted with thousands separators, 120px gradient B with a 45px blue glow, small unit word beneath in 45px #a1a1a6. Percentages ease out (`1 - (1-u)^2.2`) with a small wobble `sin(23u)*2.2*(1-u)*u`.
- Gleam: after landing, copy the number in white to a scratch layer, keep only the lit band (`source-in` with a 270px linear gradient peaking at 85%), slide it across in 0.5 s.

## Diagrams: arrows, labels, charts
- **Callout** (the signature label): anchor dot 5.4px at the feature with a 1px ring expanding 8 to 17px; then a 1.5px white line at 70% draws elbow-first (draw-on eased inOutCubic from 10% to 75% of the callout's progress); the label (600, 42px, white) and a sub-label (400, 32px, #a1a1a6) slide 15px into place at 60-100%. Lines are always horizontal after one elbow.
- **Arrow:** a 2px bezier at 32-60% white, drawn on, with an open two-line head (15px, +-0.45 rad). Never filled.
- **Wrong:** the word gets a 10px `#ff453a` strike drawn across in 0.25 s with a 20px red glow, then a ringed X (ring 5px, mark 5px) beside it. The error signal leaves as a small comet (tail 7 samples, orange head glow 27px) along a bezier back to the object while the struck word casts a 20% red underglow. Right: the new word in gradient green, a filled #2fd6a0 disc with a 6px dark check, glow 36px decaying.
- **Chart:** one hairline baseline (18% white), a 4.5px gradient-A line with a 21px glow, a gradient-fill area beneath (22% fuchsia to 0), a white-orange head orb (radius 33px) riding the tip. No gridlines, no legend.
- **Satellite sprites** (photos, tokens, cards) are pre-rendered to cached sprites at blur levels 0, 2, 5, 9px and picked by distance from focus, so items arrive soft, sharpen as they cross the middle, and shrink out of focus into the object.

## Motion
- Easing: `H.ease.inOutCubic` for everything camera and callout; `H.ease.outCubic` for words. Nothing bounces.
- One camera, five set-ups interpolated between keyframes (cx, cy, s, yaw, pitch): wide low three-quarter (960, 960, 0.58, -0.8, 0.30); object to the right third, closer (1290, 780, 0.8, -0.32, 0.42); near top-down for process diagrams (870, 750, 0.76, 0.06, 0.72); object to the left third for the number (450, 780, 0.64, -0.3, 0.42); centred again for the tagline (960, 885, 0.7, 0.3, 0.36). Moves take 0.8-1.2 s and always overlap a text beat.
- Light is animated, not just the camera: key level smoothstep over 1.2 s, rim light earlier (0.9 s), ring ignition last.
- Between beats the hover bob, ring rotation, bokeh drift and the looping signal pulse (every 0.72 s) keep the frame alive.

## Scene changes
A sweep of light. A vertical-edged wipe travels left to right over 0.45 s (`H.ease.inOutCubic`, from x -390 to W+390). Behind its edge the whole scene is redrawn on the white stage; ahead of it the dark scene remains, clipped by the edge. Over the edge add a 570px gradient with `lighter` (0 to 90% at 0.7 to 55% at 0.85 to 0). Use it once, to the closing tagline. All other changes are camera moves plus text swapped word by word; the object never leaves.
White stage: fill #e4e4e9, radial #ffffff (0) #f4f4f7 (0.55) #dcdce2 (1) centred above the object, radius 1350px; shadows lighter (32% contact shadow), no vignette.

## Finishing passes (run every frame, same strength)
1. `H.vignette(ctx, {strength: 0.55, color: '#000', inner: 0.55})` on the dark stage only.
2. `H.grain(ctx, t, {strength: 0.06, cell: 2, fps: 24, mono: true, blend: 'soft-light'})`, 4% on the white stage.
3. Glows are drawn by `shadowBlur` or `lighter` radial gradients; nothing is a hard-edged coloured shape except the hairlines.

## Sound palette
- element appears (word): a tiny "click" made of a 14 ms bandpass burst (`k.noise` at 2.3 kHz, q 1.6, gain 0.2) and a 40 ms blip dropping 420 to 260 Hz (`k.tone` with `glideTo`, gain 0.07); mark it minor; pan the words from -0.2 to 0.2 across a line.
- label lands: the same click at gain 0.6 as the callout text finishes; no chime.
- arrow completes: click at gain 0.7, panned toward the arrow's end.
- drawing / writing: for each signal pass, one soft pink-noise glide, `k.noise(t, {color: 'pink', filter: 'bandpass', q: 1.2, f: 1200, dur: 0.45, a: 0.3, gain: 0.08})`, minor; no scratches.
- scene change: two `k.noise` pink bandpass whooshes (f 1500, q 0.8, dur 0.5 and 0.4, gain 0.26 and 0.18, pan -0.4 and 0.5) plus a sub-boom.
- camera move: `k.play('whoosh', t, {gain: 0.35, dur: 0.9})`, never `minor`.
- sub-boom ("bwoom"), the reveal hit: `k.tone(t, {f: 99, glideTo: 42, dur: 1.4, gain: 0.5, a: 0.012})`, a sine at 116 Hz (dur 0.6, gain 0.07), and a 0.6 s brown-noise thump (`k.noise` lowpass at 300 Hz, gain 0.22). Scale all three by importance (0.35 to 1.35).
- wrong: a strike noise (bandpass f 1600, dur 0.26, gain 0.13) then two muted triangles, `'E3'` (0.22 s) and `'C3'` (0.45 s) at gain 0.2, pan 0.45. right: a three-note triangle chord D4, F#4, A4 (dur 1.1, gain 0.045 each) plus a sub-boom.
- key number: a riser (`k.play('riser', t0, {dur: 1.5, gain: 0.5})`) into the biggest sub-boom (gain 1.35, f 99 to 42 over 2.2 s) and a five-note triangle chord D3, A3, D4, F#4, A4 (dur 1.8, each paired with a second tone at 1.003x Hz) plus lowpassed pink noise (f 2000, dur 0.9, gain 0.16). Counting ticks: a click at gain 0.55 whenever the displayed value changes, 85 ms apart at most.
- takeaway: a six-note resolving chord from D2 up to E4 (dur 1.45) with a sub-boom at gain 0.6.
- bed or music: `k.music(0.2, 2.65, {mood: 'dreamy', bpm: 64, key: 'D', gain: 0.32})`, `mood: 'calm'` at 0.26 under the middle, dreamy again at 0.3 for the resolve.

## Signature moves
- Before anything else is visible, a thin edge of light traces the object out of the black.
- A highlight glides across the glass and the edge ring ignites in colour.
- Headlines land word by word, each from blur, with the keyword in gradient.
- Hairline callouts: dot, elbow, spec label, always aligned to a common baseline.
- A giant gradient number with a glow bloom, then a gleam passing through it.
- One bright wipe carries the picture onto a clean white stage for the last line.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Object is a flat gradient box | split walls into strips with the five-stop gradient; add chamfer rim light and floor reflection |
| Stage is pure black and flat | key pool, floor pool and bokeh; ground stays #030304, not #000 |
| Text fades in as a whole line | word by word, blur from 15px, rise 0.28*size |
| Glow looks like a cheap neon | draw glow plus a clean second pass; keep its alpha 50-90% only at the key moment |
| Callout lines at random angles | one elbow, then horizontal; all labels on shared baselines |
| Camera snaps between views | keyframes with inOutCubic, overlapping text beats |
| Too many gradients | gradient A for the hero, B for counts, flat white elsewhere |

## Hero frame recipe
1. Stage: #030304, key pool, floor pool, six bokeh discs.
2. Camera `{cx: 960, cy: 858, s: 0.74, yaw: -0.42, pitch: 0.42}`, key 1, rim 1, ring 1.7, specular sweep at u 0.6.
3. Object: slab with five-stop walls, glass top, inset panel with micro-grid and a faint etched diagram, conic ring, chamfer; contact shadow, violet spill, 45% reflection.
4. Headline: eyebrow "word" in gradient A at (960, 138), 39px, centred; a three-word statement at y 264 in 132px #f5f5f7 with -0.035em tracking.
5. Three callouts left and right at y 450 and 885: dot, elbow, 42px label, 32px sub-label.
6. Vignette 0.55, grain 0.06 soft-light. Check: the near edge has a thin bright line, the far edge a rim line, the floor shows a faded copy.
