---
id: tech-glow
name: Neon Interface Motion
family: Light & imaging
fonts: [Space Grotesk, Inter]
best_for: AI, software and data explainers, system and pipeline diagrams, product launches, anything that should feel current, fast and well funded
avoid_for: warm or handmade topics, long reading passages, print-minded or nostalgic tones, content that must look sober or archival
---

# Neon Interface Motion

The viewer believes they are watching a premium tech-channel motion graphic: a deep indigo void with slow coloured light drifting through it, a faint floor grid rolling toward them, and glass-dark cards and icon tiles wired together by hairline circuits. Light pulses race along the wires, and every bright thing blooms. The quality that sells it is depth: one smooth camera, parallax between layers, and light that is added, never painted.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground stops | `#03041a`, `#080a2d` (0.55), `#120b3c` (1) | linear gradient from (0,0) to (0.5W, H) |
| Cyan | `#3fe3ff` | lead light colour, first stop of most gradients, pulses `#9ff0ff` |
| Blue | `#3d7bff` | data, inputs |
| Violet | `#8f5bff` | the model or system, second stop of most gradients |
| Magenta | `#e04dff` | secondary accent, "changed" states |
| Indigo | `#4b3bff` | ambient glow only |
| Right / result | `#3cf0b4` | accent for the single most important thing on screen once it has landed |
| Alarm / wrong | `#ff4f7a` | error pulse, failed state; use rarely |
| Text white / muted | `#eef2ff` / `#9aa3d8` | body copy / axis and caption text |
| Card fill | `rgba(22,26,72,0.8)` to `rgba(8,9,32,0.86)` | top to bottom; tile fill `#171b4d` to `#090a28` |
| Headline gradient | `#ffffff #c8f4ff #7fdcff #9a78ff` | number gradient `#7ff0ff #5d9bff #a77bff` |

Every colour except text is a light: composite glows, pulses, rings and halos with `lighter`.

## Ground and surface
Per frame, all from `t` (a `lvl` fade-in multiplier, 0.45 to 1 over the first 0.8 s, scales every alpha below):
1. Gradient fill (stops above).
2. Five additive blobs (blue, violet, cyan, magenta, indigo): centres (0.16,0.24), (0.82,0.18), (0.6,0.95), (1.0,0.72), (0.42,0.62) of the frame, radii 780, 840, 660, 570, 840 px, peak alpha 0.24, 0.30, 0.17, 0.17, 0.12. Each drifts by +-5% W (`sin(0.21t + 1.9i)`) and +-6% H (`cos(0.17t + 2.7i)`) and breathes +-7% in radius. Radial stops: peak at 0, 38% of peak at 0.4, 0 at 1.
3. Dot field over the top 56% of the frame: 3 px squares every 60 px, `rgba(150,170,255,a)` with `a = 0.09 * y / (0.56H)`, so it fades to nothing at the top. It slides at 0.3 of the camera x.
4. Floor grid, horizon at `y = 0.6H` (648 px), vanishing point `x = W/2` (moves 0.25 of camera x). 69 spokes from `(vx + i*18, horizon)` to `(vx + i*285, H + 390)` for i in -34..34, plus 26 rungs at `y = horizon + 345/d`, where `d = k + 1 - fract(0.35t)`, so rungs stream toward the viewer. One 1.5 px stroke with a vertical gradient: 0 alpha at the horizon, 0.07 at 0.3, 0.22 at the bottom (`rgb(110,140,255)` to `rgb(140,170,255)`). A 3 px haze strip on the horizon, horizontal gradient clear, `rgba(120,180,255,0.18)`, clear.
5. Particles: 90 seeded from `H.rng(77)`, each with x, y, size 0.9-3.2 px, rise speed 0.004-0.018 H/s, phase, depth z 0.3-1, colour from cyan, violet, white, blue. Position wraps with fract; alpha `z * (0.2 + 0.275 * (1 + sin(1.7t + 3*phase)))`, additive. Particles over 2.5 px get a halo of radius 9 x size at 35% alpha.
Nothing here is cached; the whole ground is cheap and must move.

## Mark-making
**Card.** Rounded rect, radius 33 px, shadow `rgba(0,0,12,0.6)` blur 66 offset-y 27. Fill the vertical card gradient, then clip and add two inner glows: radial at (x + 0.25w, y), radius 0.8 x max(w,h), accent one at 17%; radial at the bottom-right corner, radius 0.7 x max(w,h), accent two at 14%. Border 2.25 px, diagonal gradient: accent one 95%, accent two 40% at 0.4, white 7% at 0.72, accent two 60%. Top highlight: 1.5 px line 2 px inside the top edge, clear to `rgba(200,240,255,0.5)` at 0.3 to clear at 0.65. A "flash" is a 4.5 px additive border in a state colour plus 8% fill, decaying as `exp(-k * dt)`.

**Icon tile** (size s, 195-255 px; radius 0.26s). Order: additive halo (radial from 0.25s to 1.15s, accent one at `min(0.5, 0.2*glow)`, accent two at 0.07*glow at the midpoint, 0 at the rim); shadowed tile body; clipped inner glows (accent one 30% at (-0.25s,-0.35s), accent two 26% at (0.3s,0.4s)); rim stroke of width `max(2.4, 0.022s)` from accent one mixed 20% to white across to accent two; a 1.5 px hairline `rgba(255,255,255,0.09)` inset 9 px. Icon: single-weight line art in a +-1 box scaled by 0.3s, stroke width `max(2.7, 0.042s)`, round caps and joins, gradient from accent one 45% toward white to accent two 15% toward white. Draw it on with a dash of `draw * s * 2.4`. `glow` is 1.3 at rest, spikes by `+1.5*exp(-5*dt)` when the tile lands, and idles with `+0.3*sin(3t)`.

**Wire (connector).** A cubic path (`H.bezier`, 48 points, usually leaving and arriving horizontally). Passes: a 13 px additive underglow at 8% in accent one; a 2.7 px core with a gradient from accent one 75% to accent two 75%; end caps as 6 px hollow circles (fill `#0b0d30`, 2.4 px ring) that appear only when the wire completes; while drawing on (`H.partial`) a glow dot of radius 24 rides the head.

**Light pulse.** A comet of 8 sub-segments covering 16% of the wire length behind the head, alpha `0.85*(1 - i/8)` and width `5.1 - 0.45i` px, additive in `#9ff0ff`, with a glow dot (white core, accent at 16% and 45% stops, radius 27) at the head. Run 2 or 3 pulses at once, phase `fract((t - t0) * 0.7 + k/3)`. A wrong or reverse signal is the same comet in alarm red, 30% long, running from end to start.

**Node graph.** Nodes are 20 px rings; edges are 1.5 px wires coloured by weight. A wave front sweeps across at a set x and places a glow dot (radius 12 + 10 x weight) on every edge it crosses where the weight exceeds 0.28. When values change, the edges re-interpolate over 0.6 s with the card flashing magenta.

**Pill.** Height 1.62 x font size, width text + 1.3 x font size, full-round, fill `rgba(10,12,42,0.88)`, 2 px gradient border (accent one 90%, accent two 70%), optional status dot of radius 0.17 x size. Text Inter 600 white.

## Type and numbers
- Headline: Space Grotesk 700, 120 px (96 px second level), one gradient (headline stops) across the whole line. Eyebrow: Inter 600 30-42 px, caps, letter-spacing 4.5 px, with a glowing 5 px dot in front.
- Labels in pills: Inter 600, 42-45 px (never below 42). Captions and axis text: Inter 500, 28-33 px, `#9aa3d8`.
- Reveal: word by word, each rising 0.45 x size while fading in, `outQuad`, staggered about 1 word per 0.12 s. All words share the line's single gradient, so the colour does not restart per word.
- Key number: Space Grotesk 700, 132-144 px, number gradient. It counts up with large values on `p^2.2` and percentages on `H.ease.outQuad`. On landing: scale `1 + 0.06*exp(-4dt)`, a cyan glow dot of radius 360 at 25%, gradient switches to white-mint (`#ffffff #c4f8ff #a8ffe4`), two expanding rings (radius 120 + 390u, 3 px, alpha `0.7(1-u)`) 0.12 s apart.
- Title hand-off: the headline scales to 0.45 and glides to the top-left (84, 105) over 0.7 s, then a 3 px cyan-to-clear underline grows beneath it.

## Diagrams: arrows, labels, charts
- There are no arrowheads: direction is the pulse. A wire without a moving pulse is decoration. Loop-backs are arcs with a small 3 px open chevron at the end.
- Labels are pills under or beside their object, scaling 0.9 to 1 and fading in over 0.3 s after the object lands. Section tags are eyebrows.
- Process chips: 306 x 87 px capsules with a numbered disc (radius 25). Active state mixes fill toward `#1d4fd8` / `#6a2fe0`, thickens the border by 1.5 px and adds a radial cyan halo (radius 195, 30%). Only one is active at a time.
- Chart: a dark card with 1.5 px gridlines at `rgba(150,170,255,0.12)`, tick text 33 px, a 6 px line stroked violet to blue to cyan left to right, an area fill from cyan 28% to clear below it, a glowing head dot (radius 39 plus a 6 px white core). Early points carry a small ripple `2.2*sin(37u)*(1-u)` that dies out as the value settles.

## Motion
- Easing: `H.ease.inOutCubic` for moves, `outQuad` for reveals, `outBack` (default overshoot) for pops. Tiles pop in 0.45-0.55 s; wires draw over 0.3-0.55 s; cards slide 40 px while fading over 0.3 s.
- Camera: every layer lives under a slow sway, `scale` easing from 1.06 to 1.0 over the first 4 s, plus a drift of +-6 px x and +-4.5 px y (`sin(0.55t)`, `cos(0.47t)`). Background layers take a fraction of camera x for parallax (glows 0.1, dots 0.3, grid 0.25).
- Stagger repeated items 0.08-0.21 s apart. Items riding a wire shrink to 35% over their last 22% so they seem absorbed, and the target flashes (`exp(-7dt)`) on each arrival.

## Scene changes
Stay on one continuous camera and hand objects across the cut.
- Pan: translate the world by about one screen and a half (2025 px) over 0.55 s with `inOutCubic`; the incoming content starts offset by the same amount, so the two scenes touch.
- Push-through: scale the hub about its centre by `1 + 9 * inQuad(u)` over 0.65 s while it fades out over the last 50% of that time. Meanwhile 46 additive streaks radiate from it (start radius 90-390 + 600u, length 120-510, width 1.5-4.5 px, transparent to colour at 50%, envelope `sin(pi u)`), and a radial flash of radius 1050 peaks at 50% for 0.12 s. The next scene's card grows from 20% at the hub position.
- Pull-back: the chart card scales to 0.62 and rises to the top while captions counter-scale so they stay readable; the takeaway sits below it.

## Finishing passes (run every frame, same strength)
1. Bloom, on the finished frame: copy to a 480 x 270 scratch canvas with a canvas filter of brightness 0.9, contrast 2.6, saturation 1.4 (keeps only the brights); blur that copy 3.75 px; blur a 240 x 135 copy 6 px. Draw back full-frame with `lighter` at 0.45 and 0.5. Make the scratch canvases once outside `__renderFrame`, they change every frame so they are not `H.offscreen`.
2. `H.vignette(ctx, {strength: 0.45, color: '#020310', inner: 0.55})`.
3. Optional `H.grain(ctx, t, {strength: 0.015, cell: 2, fps: 12, mono: true})` to break up gradient banding.

## Sound palette
Clean, glassy, low-register. Nothing above 2 kHz except the shimmer. Minor sounds go inside `k.minor(fn)`.
- element appears (tile pops): glass blip, `k.tone(t, {f: 'A4', dur: 0.5, gain: 0.13, a: 0.003})`, plus `f: 'A5'` (dur 0.18, gain 0.035) and `f: 'A3'` triangle (dur 0.12, gain 0.08). Pick a different note per tile, pans from -0.6 to 0.6.
- label lands: the same blip at gain 0.06, minor.
- arrow completes (a wire or pulse): `k.tone(t, {f: 260, glideTo: 620, dur: wireDur, gain: 0.05, a: wireDur * 0.4})` per pulse run.
- drawing / writing (word reveal): `k.play('whoosh', t, {gain: 0.4})` at the start of each headline, nothing per word.
- scene change: `k.play('whoosh', t, {gain: 0.7})` for a pan; for the push-through add `k.play('thud', t + 0.45, {f: 85, gain: 0.45})` at the flash.
- wrong / right: wrong is two triangle notes `'G4'` then `'D#4'` 0.13 s later (gain 0.12) plus `k.play('thud', t, {f: 110, gain: 0.5})`, and a sawtooth `k.tone` gliding 640 to 180 under the red pulse (gain 0.034). Right is a rising trio `'C5'`, `'G5'`, `'C6'` 0.08 s apart, gain 0.12.
- counter ticks: `k.noise(t, {f: 1700, q: 3, filter: 'bandpass', gain: 0.36, a: 0.001, dur: 0.016, pan: 0.15})`, at most one per 0.085 s, raising `f` as the number nears its target.
- key number (the biggest hit): `k.play('riser', t - 0.85, {dur: 0.85, gain: 0.35})`, then `k.tone(t, {f: 72, glideTo: 38, gain: 0.7, a: 0.004, dur: 1.3})`, `k.play('thud', t, {f: 105, gain: 0.8})`, and a shimmer of `'E5'`, `'B5'`, `'E6'`, `'G#6'` 0.045 s apart (a 0.02, dur 1.6, gain 0.032, pans spread).
- takeaway: a held chord `'A3'`, `'E4'`, `'A4'`, `'C#5'`, held 1.7 s, gain 0.085, a 0.015.
- bed or music: `k.music(0, DURATION, {mood: 'dreamy', bpm: 64, key: 'A', gain: 0.45})`.

## Signature moves
- Light pulses chase each other along the wires, and a red one runs backwards when something is wrong.
- The hero object flies in, then the camera dives through it into a deeper layer with light-speed streaks.
- Headlines rise word by word under one continuous gradient.
- Counters detonate on landing: scale pop, bloom, mint recolour and two shock rings.
- Cards and tiles flash a state colour at their border, never their fill.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Glows look like grey smoke | composite every light with `lighter` over the near-black ground |
| Flat rectangles instead of glass | keep gradient fill, shadow, two inner glows, gradient border and top highlight |
| Wires are dead lines | always run at least one pulse once a wire completes |
| No bloom, so nothing feels lit | run the bloom pass last, before the vignette, at full strength |
| Everything is the same cyan | cyan leads, violet is the system, green only for the result, red only for errors |
| Floor grid is static | roll the rungs at `fract(0.35t)` and shift spokes with camera x |
| Text pops in whole | reveal word by word with a rise; keep one gradient across the line |

## Hero frame recipe
1. Ground: gradient, five blobs at `lvl` 1, dot field, floor grid, 90 particles.
2. A hub tile (234 px, icon drawn at 100%, glow 1.5) at (1370, 540), with a halo and two slow expanding rings (radius 140 + 180u, 35% fading to 0) around it.
3. Three input tiles (130 px) at x = 1000, y = 295, 540, 785, each with a 42 px pill below, wired to the hub by 2.7 px gradient wires carrying one pulse each.
4. Headline at left, 120 px, three lines, under the headline gradient; eyebrow above it in 36 px caps.
5. A dark card behind the headline block with the border gradient and top highlight.
6. Finish with bloom, the vignette and a hint of grain. Check that a squint leaves only glows, pulses and the headline visible.
