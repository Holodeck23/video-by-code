---
id: light-painting
name: Long-Exposure Light Trails
family: Light & imaging
fonts: [Caveat]
best_for: wonder, discovery and "how it works" stories, networks and connections, handwritten words with weight, one big emotional number, night-time and tech-magic tone
avoid_for: daylight or cheerful tone, dense or small text, anything that needs colour-coded fills, long lists (light trails are slow to draw and cannot be erased)
---

# Long-Exposure Light Trails

The viewer believes they are looking at a long-exposure photograph taken on a tripod in a dark field, while a person draws in the air with glowing wands and LED tubes. Nothing is ever erased: light only accumulates, hot white at the centre of every trail and coloured at the fringe. Each scene is a new exposure; between scenes the camera is swung hard and every trail smears sideways.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (sky top) | #02030a | near black; light must be the only brightness |
| Ground (sky mid) | #060a1c | gradient stop at 60% of the horizon height |
| Ground (horizon haze) | #151a2e | lowest sky stop |
| Land silhouette | #04050a | hills and grass |
| Primary light | #3cdcff | cyan: structure, headlines, the first layer of anything |
| Secondary light | #aa5aff | violet: middle layers, links |
| Accent | #ff46be | hot pink: the single most important word or number |
| Warm light | #ffb43c | amber: counters, underlines, arrows that mean "go" |
| Alarm / wrong | #ff3228 | strike-throughs, "fix it" arrows; use rarely |
| Right / result | #50ff78 | the corrected answer, a landed number |
| Plain text | #ebf0ff | small labels |
| Hot core | white mixed 75-85% into the trail's colour | the centre line of every trail |

Light adds, it never covers (`'lighter'`). One colour per meaning, held for the whole video.

## Ground and surface
Bake one wide plate, 3x the frame width (5760x1080), with `H.offscreen('night', 5760, 1080, fn)`, and slide it at 0.6x the camera's travel when the camera swings (parallax).
1. Horizon at y = 840. Sky: linear gradient #02030a (0), #060a1c (0.6), #151a2e (1.0) down to the horizon.
2. 1500 stars from `H.rng(3131)`. Magnitude `m = r()^5`; radius 0.9 + 2*m px; alpha `0.25 + 0.75*m`, scaled by `1 - 0.8*smoothstep(horizon-240, horizon, y)` so stars die near the glow. Colours picked from white, (200,215,255), (255,230,200).
3. Land: fill #04050a below a wobbly ridge: `y = 840 - 21 - 24*sin(x*0.0027 + 1.2) - max(0, fbm2(x*0.02, 2.2, 3)) * 69 - max(0, n2(x*0.053, 5)) * 15`, sampled every 4px. Draw 7000 tiny grass blades (3-12px, rgba(30,36,48,0.2-0.6)) below the ridge, denser toward the bottom.
4. Horizon bokeh: 26 flat discs (radius 12-36px) at y 825-870, additive, colours picked from #ffaa5a, #ffc878 and #aad2ff. Each is a radial gradient with a brighter rim: alpha 0.16 at the centre, 0.28 at 85% of the radius, 0 at the edge.
5. Optional figure of the painter, off to one side, baked once (see Finishing).
Per frame: the light layers, ground spill, smear, noise. The plate is static.

## Mark-making
Keep two transparent layers, both composited with `'lighter'`: a colour layer and a core layer. Clear both when an exposure ends.

**Wand trail** `pen(seed, pts, colourA, colourB, width, prog)`: resample the path, offset every point by `H.noise(seed).n2(u*9, ...) * 3.3px` (hand shake), draw segment by segment up to `prog`:
1. Speed `sp = 0.65 + 0.35 * n2(u*4, 3)`. Slow stretches are brighter and thicker.
2. Colour layer: colour = `H.mixRGB(colourA, colourB, u)`, alpha `0.6*sp`, width `w*(0.8 + 0.4*sp)`, round caps.
3. Core layer: same segment, the colour mixed 75% toward white, alpha `0.55*sp`, width `0.38*w`.
4. Optional "gap" mode for fine links: skip the segment where `n2(u*6, 11) > 0.45`, so thin lines flicker like a wand pointed away for a moment.
5. The tip: a radial gradient of radius 51px at the leading point, white at 0.95, the trail colour at 0.6 by 15% of the radius, to zero. Only while a stroke is in progress and the camera is not swinging.
Widths at 1920: network links 3.9px, nodes 6px, arrows 6px, orbs 10px, rings 7.5px, chart axes 5px, chart strands 3px.

**Handwriting** (Caveat 700): the glyphs are laid in three times in the colour layer: one fill at 66% alpha, plus two copies at 32% alpha each shifted by `n2 * 2.7px` (and 3px), so the falloff looks shaky. The core layer carries an eroded copy: draw the text white on a scratch canvas, keep only pixels that survive eight copies offset by `max(2.2, 0.03*size)` px (`destination-in`), tint it 85% toward white at 95% alpha, then knock out 9px-wide columns wherever `n2(x*0.013, 11) > 0.35` (alpha `min(0.75, (n-0.35)*2.5)`), so the core dims where the wand turned. Add a pale copy of the full text at 35% alpha under it. Cache the eroded core per word with `H.offscreen`. Reveal by clipping left to right with `prog`; the tip wobbles at `y - 0.3*size + sin(prog*50)*0.2*size`.

**Shapes.** Rings and nodes are two-turn spirals: `a = u*4.3*pi - 1.2`, radius `r*(1 + 0.07*sin(a*0.5)) + 0.03*i`, overshooting their start. Doodles are single-line icons, revealed by a vertical clip sweeping left to right over 0.28-0.4 s, with the tip bobbing `sin(prog*30)*0.6*r`. Never a filled shape.

**Light tube ribbon** (the hero accent): sweep a flat RGB tube round an ellipse and twist it. For 170-900 samples `u` in 0 to 1: angle `a = pi*(0.62 + 1.72u)`; centre = the ellipse point (rx 495, ry 320, 1.5x those for a full-frame sweep) plus a tilt `-cos(a)*skew` (skew 36-45px) plus `n2(u*6)*9px` of wobble. Twist: `tw = cos(u*pi*twists + 0.4)` (3-3.4 twists); the tube's visible cross-section is `len*tw` (len 130-170px), perpendicular to the path's tangent after squashing the tangent's y by 0.4-0.65. Fill the quad between consecutive cross-sections with a gradient across it: hue `175 + 150u`, then +45 at the middle (alpha x0.55), then +95 at the far edge, saturation 1, lightness 0.55-0.6. Alpha = `gain * clamp(0.13/(|tw| + 0.15), 0.12, 0.75)`. So the tube is bright and dense where it turns edge-on and thin and airy where it faces us. Add 4-10 parallel hairlines (1.35px, lightness 0.7, alpha `min(0.5, dens*0.55)`) between the cross-section ends, and two bright edge lines (2.7px, lightness 0.8, alpha 0.5*gain). While sweeping, add a white 4.5px line across the leading cross-section. A finished ribbon is static, so cache it.

## Type and numbers
- Caveat 700 only, drawn as light writing, never as fill. Headline 144px, hero word 225px, second-level 150px, story label 81px (never below 66px), chart label 69px.
- Colours: headlines cyan or pink, labels plain #ebf0ff, "wrong" red, "right" green.
- Writing speed: a short word 0.3-0.4 s, a two-word headline 0.6-0.8 s (`H.smoothstep` window on `prog`).
- Key numbers come from a pixel-stick: a 5x7 dot matrix. Dot pitch 16px (numeral 112px tall, dot radius 0.36*pitch in colour at 85% alpha, a white inner dot of 0.16*pitch at 70%), advance 6 pitches per character. Colour amber while counting, green when the target is reached. Big counts run in log space `10^(6p)`; percentages ease out.
- Numbers never type on; the whole matrix is re-lit each frame.

## Diagrams: arrows, labels, charts
- Arrow: a shaft pen with an amber-to-white gradient, then a head of two separate strokes of 36px at +-2.5 rad from the direction of travel.
- Label: written in Caveat beside the thing, 30px clear, after the thing is done. A tag is nothing more than a word.
- Network: layers of ring nodes (cyan, violet, amber by layer) joined by gap-mode links, each link fading in over 0.5 s with its start staggered 0.03 s per link.
- Chart: two white axes (5px), a rainbow bundle of seven strands for the curve (each offset 4.5px, hue 180 + 25k to 300 + 15k, lightness 0.6, 3px), drawn by the tube in 1.2 s.
- Emphasis: a pink-to-amber elliptical ring around the key number plus a spark burst of 24 rays (radius 270 growing 60px, length 45-99px, amber to white, 3.75px), visible for 0.45 s.
- Wrong: two hard red slashes of 10px across the thing, 0.1 s each, then a ring and a word. Right: a green tick of three points (10px).

## Motion
- Everything is a timed stroke on the exposure's timeline: strokes 0.1-0.5 s, gaps 0.05-0.3 s, shafts 0.25-0.3 s, a whole network 0.75 s.
- Easing: `H.smoothstep(a, b, t)` for reveal windows; ribbons use `H.ease.inOutCubic`.
- Light never fades or moves within an exposure. What keeps the frame alive: the tip glow, the shimmer of the shaky offset, the figure fading up over 1.7 s (0 to 0.65 alpha), the star plate sliding on swings.
- Hold the finished picture 0.5-1.0 s before the next swing so it can be read.

## Scene changes
A whip-pan swings the camera 840px in 0.45 s (`smoothstep`). At the midpoint, clear both light layers and start the next exposure. During the swing, draw the finished scene 28 times shifted left by `k*smear*39 + smear*120` px each (k 0 to 27), additive, alpha `0.14*(1 - k/28)`, where `smear = sin(pi*u)`; hide the tip glow. Stay in one exposure when the next idea extends the last drawing.

## Finishing passes (run every frame, same strength)
1. Glow blooms from the colour layer, blurred at low resolution and added: 51px blur at alpha 0.5, 13px blur at 0.8, then the sharp colour and core layers, then a 4.5px blur of the core at 0.6.
2. Ground spill: draw the blurred glow flipped about the horizon, squashed to 35% height, at quarter size, masked by a cached patchy mask `(1 - y/h)^1.25 * clamp(0.6 + 0.75*fbm2(x*0.03, y*0.2, 3), 0, 1)`. The light pools on wet grass.
3. Painter's ghost (optional): silhouette drawn twice (60% and a copy shifted -12px at 25%), blurred 2-3px, then multiply at 45%, an additive dim body tint (rgb(150,110,120) to rgb(30,30,60)) at 32%, and a rim of colour on the edge facing the trails (silhouette minus its own copy shifted 9px, gradient rgb(255,200,170), rgb(150,120,255), rgb(70,160,220)) at 50%.
4. `H.vignette(ctx, {strength: 0.55, color: '#000004'})`.
5. Sensor noise: per pixel from `H.rng(frameSeed)`, amplitude `(1 - luma)*9 + 2`, with extra independent noise on red and blue so shadows speckle with colour. Cheap fallback: `H.grain(ctx, t, {strength: 0.05, cell: 2, fps: 30, mono: false})`.

## Sound palette
Shutter and wand are the voice. A wand gesture is `k.noise(t, {color: 'pink', filter: 'bandpass', f: 380-600, q: 1.3, dur: 0.14-0.24, gain: 0.08, a: 0.45*dur, pan: +-0.15})`, a run of them covering the draw-on length.
- element appears: a shutter open click `k.noise(t, {filter: 'bandpass', f: 1800, q: 1.5, dur: 0.015, gain: 0.25})` plus a 300 to 160 Hz thump (`k.tone` with `glideTo`, dur 0.04, gain 0.12).
- label lands: nothing beyond the wand run; at most `k.play('tick', t, {f: 2400, gain: 0.5})`.
- arrow completes: wand run only.
- drawing / writing (matched to draw-on length): the gesture run, gain 1.0-1.2 for headlines, 0.35-0.6 for links and nodes; a one-shot orb flight is a pink bandpass at f 900, q 2, gain 0.045 ending in a soft landing pair: `k.tone(t, {gain: 0.07, dur: 0.5, f: 'A3'})` over an E4 at gain 0.03.
- scene change: shutter close (1500 Hz click at gain 0.3 plus a 200 to 90 Hz knock, `dur: 0.08`, gain 0.22), then a brown bandpass drag (f 240, q 1.4, gain 0.32, dur = pan length) and a pink bandpass at 750 Hz (gain 0.09), then shutter open at 80%.
- wrong / right: wrong = two pink slashes (f 800, q 1.1, gain 0.34, dur 0.12) with a 150 to 70 Hz tone and a sour triangle pair D3 and Ab3 (dur 0.45, gain 0.1). Right = `k.play('success', t, {f: 'A4', gain: 0.6})`.
- key number (the biggest hit): `k.play('thud', t, {f: 90, gain: 1.1})`, a 0.5 s pink lowpass whoosh (f 1200, gain 0.28), 25 tiny crackle bursts (6-12 ms bandpass at 1200-2500 Hz, gain 0.35-0.7 falling, random pan), and a C4, E4, G4, C5 triangle chord (dur 1.0, gain 0.05, lowpass).
- takeaway: shutter close plus a warm chord C3, G3, E4, B4 (dur 0.58, gain 0.08).
- bed or music: `k.bed(0, DURATION, {kind: 'night', gain: 0.3})` and `k.music(0, DURATION, {mood: 'dreamy', bpm: 64, key: 'A', gain: 0.22})`. Pixel-stick counts tick as `k.play('click', t, {gain: 1.5, f: 1500})`, throttled to one per 0.09 s.

## Signature moves
- A hot white core inside every coloured trail, with a glowing tip at the leading edge.
- The twisting RGB ribbon sweeping once round the main subject.
- A dot-matrix pixel-stick numeral instead of a written number.
- The whip-pan: every trail smeared into streaks between ideas.
- A spark burst around the final number.
- The faint ghost of the painter filling in as the exposure builds.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Neon lines with a uniform glow | two layers (colour and white-ish core), shaky offsets, per-segment speed that changes width and alpha |
| Perfect text | write it three times with offsets and an eroded, flickering core |
| Pure black ground | the sky gradient, stars, horizon bokeh and grass spill; noise in the shadows |
| Things fade in or out | light only accumulates; end a scene with a whip-pan |
| Everything is bright | keep half the frame dark; leave 40% of the layers dim |
| Text too thin to read | 66px minimum, cyan or white, never over a bright ribbon |

## Hero frame recipe
1. Cached night plate: sky gradient, 1500 stars, ridge, grass, 26 bokeh discs.
2. A two-line headline in Caveat 144px and 225px, cyan then pink, written fully (prog 1) with the three-pass colour layer and the eroded core.
3. One main subject: a 3-layer network (3, 4, 2 nodes), spiral rings at 6px and gap-mode links at 3.9px, in cyan, violet and amber.
4. A twisting ribbon (4 twists, 170px, hue 175 to 325) swept round the whole thing at 0.65 gain.
5. A short amber arrow (shaft plus two head strokes) to a label in #ebf0ff at 81px.
6. Blooms, ground spill, ghost at 0.6, vignette 0.55, sensor noise.
7. Compare against a real long exposure: cores nearly white, colour only at the fringe, the bottom fifth of the frame faintly lit with the same hues.
