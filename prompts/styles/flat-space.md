---
id: flat-space
name: Flat Cosmos
family: Cosmic
fonts: [Nunito]
best_for: science, technology and how-it-works explainers told through scale (zoom out to millions, dive into one part); friendly, curious, family-safe tone
avoid_for: sober finance, legal or medical content; dense tables; anything that needs a realistic or gritty feel
---

# Flat Cosmos

The viewer believes they are watching a children's science show drawn in vector software and lit in outer space. Every object is a smooth ball or pill with no outlines, shaded by two flat crescents and a bright rim. The quality that sells it is consistency: one light direction (upper left), one gradient recipe, one glow recipe, repeated on everything.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground, top-left | `#090b2c` | start of the sky gradient |
| Ground, middle | `#18134f` | at stop 0.5 |
| Ground, bottom-right | `#3a1a6c` | end of the gradient |
| Label ink / UI dark | `#141846` | text on white pills; shadows use `rgba(10,8,46,a)` |
| Hero body ramp | `#a4fbef` / `#3ccbdc` / `#1d64b0` | light / mid / shadow; every body is a 3-colour ramp |
| Warm body ramp | `#ffcc7a` / `#ff8d3f` / `#d24a2a` | second character or planet |
| Sand body ramp | `#ffe9be` / `#ecb676` / `#b4723c` | third character or moon-like prop |
| Planet ramp | `#ffa0c4` / `#de4b93` / `#4e1670` | big background planet, glow `#ff5fa8` |
| Accent | `#ffd23f` | the single most important word, number or label |
| Arrow / data | `#7ff0ff` | dotted arrows and flowing dots |
| Alarm / wrong | `#ff3b5c` | rare; error flash, wrong badge |
| Right | `#38e08e` | check badge, correct label |
| Support | `#ff5d8f` pink, `#8b5cff` violet, `#56e8ff` cyan | tags, thought marks, secondary pills |

## Ground and surface
1. Cache with `H.offscreen('sky', 1920, 1080, ...)`: a linear gradient from (0,0) to (0.3W, H) with stops 0 `#090b2c`, 0.5 `#18134f`, 1 `#3a1a6c`.
2. Same cached canvas, three soft nebula glows (radial, stops `a`, `0.4a` at 0.35, `0` at 1): (0.86W, 0.12H) r 1050 `#7b34c6` a 0.34; (0.05W, H) r 930 `#2448b4` a 0.40; (0.45W, 0.6H) r 780 `#4a2a9c` a 0.16.
3. Stars are redrawn every frame from a fixed list built once with `H.rng(77)`: 620 dots in a 2520x1680 wrapped field, depth `d` from {0.15, 0.3, 0.55, 1}, with 0.3 twice as likely, radius 0.9 to 3 px times `(0.7 + 0.35d)`, colours `#ffffff #cfe4ff #ffe9c7 #dccbff`. Twinkle: `alpha = (0.55 + 0.45 * sin(t * speed + phase)) * (0.45 + 0.55d)`, speed 0.8 to 2.6.
4. Sixteen four-point sparkles (size 9 to 20 px, depth 0.3 to 0.9) with a `#bfa8ff` glow of radius 2.2x size at alpha `0.25 * twinkle`.
5. Parallax: each star shifts by `camera * d` and, when the camera zooms, scales about the frame centre by `exp(ln(zoom) * d * 0.6)`. Near stars move most. A slow constant drift of 20 to 33 px/s keeps the sky alive.

## Mark-making
There are no outlines anywhere. Form comes from gradients, crescents and glows.

**Shaded ball (the unit of everything).** Light angle -2.25 rad, `L = [cos, sin]`.
```js
grad = linear(cx + L.x*r, cy + L.y*r  ->  cx - L.x*r, cy - L.y*r)   // lit side to far side
stops: 0 = ramp[0], 0.45 = ramp[1], 1 = mix(ramp[1], ramp[2], 0.6)    // H.mixRGB
fillCircle(grad)
drawInner()                      // bands, patches, craters, clipped to the circle
crescent(shift =  L * r * 0.30,  ramp[2], alpha 0.50)    // shadow 1
crescent(shift =  L * r * 0.66,  ramp[2], alpha 0.225)   // shadow 2, deeper, same side
crescent(shift = -L * r * 0.075, '#ffffff', alpha 0.42)  // thin rim on the lit edge
```
`crescent` clips to the circle, then fills with the `evenodd` rule a path made of a big rect plus the same circle moved by `shift` (radius x 1.02). What is left is the part the moved circle does not cover. Moving the circle toward the light leaves a shadow on the far side. Moving it away leaves a rim on the lit side.

**Glow.** Radial gradient with stops `a`, `0.4a` at 0.35, `0` at 1. Put one behind every planet (radius 1.7r, a 0.32), every character that matters (radius 2r to 2.4r, a 0.22 to 0.5) and every pop (radius 40 to 90 px).

**Banded planet.** Draw a halo glow, the back half of the ring, the ball with bands inside, a limb, then the front half of the ring.
- Bands are polygons between two latitudes `v0` and `v1` (in radius units), bowed by `0.13 * (1 - u^2)` across `u` from -1 to 1 so they read as curved. Alpha 0.4 to 0.6, lighter and darker tints of the planet colour. 3 to 4 bands.
- Ring: two ellipses filled with `evenodd` per band (rx 1.75r, ry 0.5r, tilt -0.2 rad, 2 or 3 bands in warm gold and orange, alpha 0.8 to 0.95). Clip to the upper half for the back pass (alpha x 0.75) and the lower half for the front pass, wide enough that ring ends are never cut.
- Limb: four stacked arc strokes at radius `r`, widths `0.05r, 0.028r, 0.014r, max(3, 0.006r)` at alpha `0.08, 0.16, 0.3, 0.6`, stroked with a gradient from bright on the lit side to 8% on the far side.

**Four-point sparkle.** Four quadratic curves from the top point through the centre to each next point. Used for stars, bursts, takeaway glitter.

**Burst.** On any success: 18 sparkles (size 10 to 24 px, white, `#ffe28a`, `#9ff7ff`, `#ffb0d0`) flying out to 45 to 100% of a spread radius with `outCubic` over 0.9 s while shrinking to 0 by 1.4 s. Seed with `H.rng`.

**Big-eyed character.** A shaded ball body plus pieces drawn inside or on top: eye radius 0.25r (white), pupil 0.56 of the eye in `#141638`, a white catch-light at the pupil's upper left (0.32 of the pupil) and a tiny one lower right. Pupils shift up to 0.36 eye radius toward what the character looks at. Blink every 3.3 s (phase per character) by scaling the eye's height to 8% for 0.14 s. Mouth is one rounded stroke, width 0.05r. Ears or limbs are plain flat shapes, with no outline.

## Type and numbers
- Font Nunito, weight 900 for everything the viewer must read; 700 to 800 for units and small captions.
- Title 126 px, white, one word in `#ffd23f`. Takeaway lines 102 px. Header pill text 42 px. Pill and label text 42 to 57 px (never below 42 px). Key number 225 px. Running counter 117 px with its unit at 57 px, colour `#bfe9ff`.
- Every text is drawn twice: first a flat shadow `rgba(10,8,46,0.55)` offset (0.03 x size, 0.07 x size), then the fill. On white bubbles the shadow is off.
- Pill label: full-radius rounded rect, width `textWidth + 1.15 * size`, height `1.6 * size`, white (or an accent colour), a drop shadow `rgba(10,8,46,0.4)` shifted down 0.2 x size, a highlight strip of white at alpha 0.35 across the top (height 0.16 of the pill), text in `#141846`. A small triangle pointer under it when it labels something.
- Words enter one by one 0.13 s apart: scale from 0 with `H.ease.outBack(u, 1.2)` over 0.4 s while sliding up 60 px.
- Counters run `value = target * progress^2.3` (slow start, fast finish), formatted with thousands separators. When it reaches the target it turns `#ffd23f`, pops `1 + 0.2 * sin(pi * u)` over 0.35 s and fires a burst. Percentages tick whole numbers.

## Diagrams: arrows, labels, charts
- **Arrow:** a cubic path drawn on by progress. Stroke width 14 px, round caps and joins, dash pattern `[0.01, 1.9 * width]` so it becomes a string of round dots, colour `#7ff0ff` at alpha 0.75. The head is a solid triangle (size 1.5 x width, rounded join) that appears once progress passes 0.08 and grows to full size by 0.2. Use `H.bezier` for the points and `H.partial` for draw-on.
- **Flow dots:** 6 small glowing dots (radius 6 px, glow 27 px) travel along an arrow at 0.32 path-lengths per second, evenly spaced.
- **Cycle diagram:** three pills on an ellipse (rx 1.25 x ry), dotted arc arrows between them. The active pill is coloured, scaled 1.08, wrapped in a glow of radius 135 px, and bumps `1 + 0.18 * sin(pi * u)` when it takes over. Inactive pills are `rgba(235,240,255,0.9)` at scale 0.92. Errors run in red along the same path.
- **Ring chart:** a planet whose ring is the progress bar. Track: ring annulus `rgba(150,140,240,0.4)`. Fill: the same annulus from angle 90 degrees to `90 + 360 * value`, gradient `#ff8d3f` to `#ffd23f` to `#fff1a8`. Split into back and front halves so the planet passes in front of the far side. Add a glow behind (radius 1.8r, `#4fc9ff`, 0.3).
- **Bar chart:** rounded bars, 33 px wide, 10 px gap, fully rounded ends, vertical gradient `#ffe680` to `#ff8d3f`, drop shadow `rgba(10,8,46,0.4)`. Each bar grows with `outBack`, one after another.
- **Counting crowds:** objects that stand for examples spawn on a path at a shrinking interval (0.38 s down to 0.18 s), then the camera pulls back until each is a dot in a spiral galaxy (2600 dots, 3 arms, seeded with `H.rng(901)`, y squashed to 0.52).

## Motion
- Easing: `H.ease.inOutCubic` for camera and travel, `H.ease.outBack(u, 1.5)` for every pop-in (1.2 for large objects, 2.2 for badges), `H.ease.outQuad` for the opening pull-back.
- Everything alive bobs: `sin(t * 1.8) * 13 px` for the main character, `sin(t * 3 + i) * 12 px` for crowds, small tilt `sin(t * 2) * 0.12 rad`. Glows pulse at 3 rad/s. A flame or flicker uses two sines (29 and 13.7 rad/s) so it never repeats.
- Camera moves are scale moves: interpolate zoom in log space (`s = exp(lerp(0, ln(target), eased))`), keep the subject anchored while everything else scales around it. Opening: start at 2.8x and settle to 1x over 1.4 s. A pull-back to 6% over 1.25 s turns crowds into texture.
- Planets drift sideways 6 to 9 px/s at different speeds for depth.

## Scene changes
- **Planet sweep:** a giant planet (radius 1320 px, warm ramp, glow 0.4) travels from x = W + 1470 to x = -1470 in 0.9 s with `inOutCubic`, y rising slightly. Swap scenes when its centre passes x = 960, while it covers the frame.
- **Dive:** over 0.8 s a radial gradient over the whole frame fades in (`#fff6d0` centre, `#8ff0ff` at 0.5, `#6a4cff` at the edge, alpha 1 to 0.9) while the camera zooms 16x with an ease-in; fade out over 0.4 s on the new scene.
- **Tilt up:** for a takeaway, slide the sky down 260 px and bring in a huge planet (radius 1170) from below as a horizon.
- Stay continuous when one subject moves through a story; use sweeps only between acts.

## Finishing passes (run every frame, same strength)
1. A static mottling layer, cached with `H.offscreen('mottle', 480, 270, ...)`: a base grey of 128, plus slow fractal noise (`fbm2`, 4 octaves, 0.035 per cell, amplitude 70) from `H.noise(88)`, plus fine noise (`n2`, 0.22 per cell, amplitude 14). Stretch to the frame and draw with `overlay` at alpha 0.12.
2. `H.grain(ctx, t, { strength: 0.09, cell: 2, seed: 4242, fps: 24, mono: true, blend: 'overlay' })`.
3. These two passes break up gradient banding on the large sky; without them the sky shows stripes after video compression.

## Sound palette
Soft, rounded, marimba-and-boop. Minor notes while things are unresolved, major at payoffs.
- element appears: boop, `k.tone(t, { f: 520, glideTo: 750, dur: 0.2, gain: 0.17, a: 0.008, minor: true })`; large objects add a lower triangle tone at half pitch.
- label lands: a pluck at the pop's peak: `k.tone(t, { f: 'E4', dur: 0.9, gain: 0.2, a: 0.003 })` plus a short knock (`f` x 4, `dur` 0.09, `gain` 0.04) and a triangle octave (`dur` 0.32, `gain` 0.045).
- arrow completes: `k.play('tock', t, { f: 520 + 40 * i, gain: 0.35, minor: true })` at 5 evenly spaced points along the draw-on.
- drawing / writing: no scratch sounds; this style animates by popping. Counters tick with `k.play('tock', ...)` at `f` 760 to 920, 12 ticks per second at most.
- scene change: `k.play('whoosh', t, { gain: 0.5, dur: 0.9 })` for a sweep, plus `k.noise(t + 0.1, { color: 'brown', filter: 'lowpass', f: 250, gain: 0.3, dur: 0.75 })` and a falling `k.tone` from 70 to 46 Hz.
- wrong / right: wrong is two low triangle tones (`'E3'` then `'C3'`, 0.26 s and 0.5 s) with `k.play('thud', t, { f: 95, gain: 0.3 })`. Right is a rising pluck triad `'C4' 'G4' 'C5'` 0.09 s apart.
- key number: `k.play('impact', t, { gain: 0.75 })`, a six-note chord (`'A2' 'E3' 'A3' 'C4' 'E4' 'B4'`, triangle, `dur` 2.4, `gain` 0.07 each) and `k.play('sparkle', t + 0.08, { gain: 0.8 })`. Add a pink-noise swell ending at the hit.
- takeaway: a chord on `'C3' 'G3' 'C4' 'E4' 'G4' 'D5'` and a `'C4'` pluck as the last line lands.
- bed or music: `k.music(0, DURATION, { mood: 'dreamy', bpm: 64, key: 'A', gain: 0.45 })`.

## Signature moves
- Pull back from the subject until a counted crowd of objects becomes a spiral galaxy.
- A giant planet crosses the frame as the wipe between acts.
- Dive through a glowing part of the character and come out in the next scene.
- A ringed planet whose ring fills as the progress bar, with the number above it.
- Success pops: burst of four-point sparkles plus a warm rising triad.
- Dotted chunky arrows that grow dot by dot with a solid head.

## Pitfalls
| Looks cheap because | Fix |
|---|---|
| Outlines or thin strokes on shapes | Remove them; define edges only with crescents and the rim |
| Light direction changes between objects | One angle (-2.25 rad) for every ball, glow offset and shadow |
| Flat single-colour fills | Use the 3-stop ramp and the two shadow crescents on everything |
| Banding in the sky | Keep both finishing passes, never lower grain below 0.06 |
| Static glows | Pulse or flicker at least the focal one |
| Pops with no overshoot | `outBack` on every entrance; it is the style's personality |
| Text without the offset shadow | Add it back; it separates text from the busy sky |
| Too many accent yellows | Yellow is for exactly one thing per beat |

## Hero frame recipe
1. Draw the cached sky (gradient plus three nebula glows), then 620 stars and 16 sparkles at `t = 4.6`.
2. Place a big planet lower right: centre (1600, 860), r 320. Glow r 544 `#ff5fa8` a 0.32, back ring half, ball with `#ffa0c4 #de4b93 #4e1670`, four bands, limb, front ring half. Add a small moon (r 45) top right and a small warm planet (r 54) at left.
3. Place the main character at (960, 630), r 160: three-stop ball, glass or screen on its head, two big eyes looking up-left, glow behind r 350.
4. A dotted `#7ff0ff` arrow, width 14 px, curves from the bottom-left corner toward the character, with two small characters (r 60 to 70) riding along it and a white pill tag above each (42 px text).
5. Title top-left in Nunito 900, 111 px: two words white, last word `#ffd23f`, with the long shadow.
6. A speech bubble upper right (300x150, `#ffffff`) holding one word at 81 px, with a green check badge at its corner.
7. Finish: mottling overlay 0.12, `H.grain` 0.09 at 24 fps.
