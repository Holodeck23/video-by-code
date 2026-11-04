---
id: impasto-oil
name: Impasto Oil Canvas
family: Painterly
fonts: [Fraunces]
best_for: dramatic, emotional or awe-led topics; science and space, night, nature, history, big ideas told as one slow journey
avoid_for: small text, tables, fast or technical content, anything that needs light backgrounds or precise alignment
---

# Impasto Oil Canvas

A thick painted surface catches light from the upper-left. Thousands of curved, pigment-heavy dabs follow the ground's flow field; each carries a light ridge, a darker lower edge and broken colour within its body. Paint the arrows and type with the same loaded brush so the explanation belongs to the surface.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground | #122260 | deep night blue; mid #284e9e, light band #568cc4, pale swirl #bed6d6 |
| Primary ink | #f4e8c4 | cream paint for arrows, labels, axes |
| Accent | #f4ce48 | chrome yellow; the single most important thing, plus every bright light |
| Alarm / wrong | #d6462e | vermilion; the wrong mark, the final number, the corrective arrow |
| Warm mid | #d6963c | ochre; glows and warm halos |
| Cool light | #6ea0d2 | sky blue; secondary labels |
| Right | #5abe5a | the check mark only |
| Land | #18343c | dark teal ground; green bands #406242 |
| Undercoat | #d6c8ac | primed canvas, only visible as warmth between strokes |
| Paint shadow | #050819 | mixed into every stroke's lower-right edge |

## Ground and surface
Build once, as one long canvas 5100 x 1080 in `H.offscreen`, and move the camera along it.
1. Prime with the undercoat #d6c8ac.
2. Thin underpainting: sample the colour function on a 12 px grid, draw that tiny image scaled up with 6 px blur at 90% alpha. This fills the gaps between strokes with a close tone.
3. Make a second canvas, the height map, same size, filled with grey 58.
4. Flow field: a stream function `psi(x, y) = 0.9 y + 20 sin(0.004 x + 0.0027 y) + 36 * H.noise(seed).fbm2(x * 0.0027, y * 0.0027, 2) + sum over vortices of s * R * 1.6 * exp(-d^2 / (2 R^2))`, with 5 vortices, R 130-160 px, s of alternating sign 1.4-1.8. Sample it on a 9 px grid, look it up bilinearly. Stroke direction is `atan2(-dpsi/dx, dpsi/dy)`, so strokes run along the isolines. Land follows the terrain slope plus a little noise.
5. Colour at a point: vertical gradient dark to mid; `band = sin(psi * 0.085)`: where band > 0.35, mix toward the light blue by 0.45 + 0.3 x (closeness to a vortex); band > 0.75 near a vortex, mix toward pale by up to 0.5; band < -0.6, back toward dark by 0.5. Add haze toward #6490a5 near the horizon. Bright objects get concentric rings in chrome yellow and pale yellow-green.
6. Place about 30,000 strokes (below), then light the relief once (see Finishing). The static sheet is cached; no per-frame work except the camera blit.

## Mark-making
**Ground stroke.** Choose points on a jittered grid (step 15 x 12.75 px, jitter +/-6 and +/-4.5 px), shuffled with `H.rng` so strokes overlap randomly. For each point:
- Trace the flow forward and backward 3 steps each from the point. This gives 7 points and a gentle curve, length `len`.
- Sky: len 18-27 plus up to 12 more where the flow is strong, width 8-10.5; 13% are long sweeps, len 42-60, width 10-13; strokes beside a bright object are short, len 10-17, width 7.5-10. Land: len 30-51, width 9-12. Dark vertical flame shapes use len 30-45, width 6-9.
- Colour: region colour jittered by gauss 9 per channel. Second colour `mix(colour, cream or deep blue, 0.25)`, drawn as a streak of width 0.3 w, shifted sideways by up to 0.25 w, stopping short of the ends. This is the broken colour.
- Height: draw the stroke in grey `100 + 50 r + 3 w` (fatter strokes stand higher) at full width, then a ridge of width 0.42 w in `body + 50 + 40 r`, shifted half as far sideways as the colour streak.
- Dry brush (5% of strokes): four thin streaks (0.12-0.24 w wide) spread across the stroke, low height (92-122), so the layer below shows between them.
A second pass adds small strokes (len 13-22, width 4-8) around bright objects, over figures and over the lettering, in tight grids (5 x 5.4 px), which is what lets detail read inside a coarse medium.

**Daub (for anything that is not canvas: arrows, rings, axes, chart lines).** Four passes over the same polyline, round caps, width `w`:
1. Shadow: colour mixed 55% toward #050819, offset (0.16 w + 1, 0.2 w + 1.2) down-right.
2. Body: the colour.
3. Streak: width 0.22 w, colour mixed 22% toward cream or dark violet, offset (0.18 w, -0.05 w).
4. Ridge: width 0.3 w, colour mixed 50% toward near-white, offset (-0.18 w, -0.22 w) up-left, starting from the second point.
**Painted arrow.** Chain daubs along the path: every second point, slice 4 points, offset the slice by +/-0.14 w sideways, width `w * (0.8 to 1.2)`, colour jitter 12. Arrow heads are two daubs from the tip at +/-0.55 rad, 3 w long, width 0.9 w. Draw on by taking the leading fraction of points. Rings are the same chain around an ellipse for 1.06 turns.
**Painted shapes (icons, pictures).** Make a mask silhouette, then fill it with short daubs (len 15-21, width 7-10, step 6-9) whose angle follows a field you choose (concentric around the centre of a head, parallel to a frame edge). Never fill with a flat colour.

## Type and numbers
Fraunces 900 italic only. Title 144 px (settles at 58% = 84 px), counters 96 px, key number 114 px, labels 48-63 px, big answer words 129 px, takeaway 84 px. Labels below 48 px disappear into the strokes.
- Bake each string once: draw it three times (shadow colour offset `(2.4 e, 3 e)`, cream-mixed highlight offset `(-e, -e)`, body), `e = max(1.8, size / 27)`; then 1 stroke per `1.2 * size` px^2 of random short light or dark streaks over the glyphs (`source-atop`, length 0.15-0.4 size, width 1 to size / 22, mixed 12-30%).
- Under each string put a dark glaze: blur the text silhouette (size / 11, at least 5 px) at 8 offsets on a ring of radius size / 18, tint rgba(12,16,44,0.82). It separates letters from the busy sky.
- Reveal: clip left to right, the glaze reveals feathered by 26 px. Numbers count in cream or chrome yellow and go vermilion when final.

## Diagrams: arrows, labels, charts
- Arrows: painted arrows, width 15-23 px, cream for flow, chrome yellow for the main path, vermilion for correction.
- Labels: painted text beside the object, with the glaze, never inside a box. No panels.
- Wrong: two vermilion daubs crossing (width 22), then a ring in chrome yellow (width 14) around the thing.
- Chart: axes as chains of short cream daubs with a 2 px wobble; the data line is a dense chain in chrome yellow (width 16); dots are single daubs; final value ringed.
- Pictures: painted shapes on a small cast shadow (`rgba(8,12,36,0.35)`, offset 8, 10).

## Motion
- Brush strokes are dragged out: length grows from 35% to 100% over 0.18 s with `H.ease.outQuad`. Laying in a whole painting staggers births over 2.7 s, top bias: `birth = 0.5 + 2.2 * (0.6 * index / count + 0.4 * y / height)`.
- Daubs and rings draw on in 0.3-0.5 s; words in 0.3-0.7 s; staggered 0.1-0.2 s.
- Life between beats: re-seed the sideways offsets of the story daubs every 1/12 s (`H.rng(1000 + floor(t * 12))`) so edges shimmer like wet paint. Pulse rings around bright points by moving the ring phase: `ring = sin((d - r0) * k - 1.6 t)`. Rotate the flow slowly near a main vortex: add `0.08 t * exp(-d^2 / 30000)` to the stroke angle (only re-laid in a cropped, re-lit region).
- Glow: radial gradient with `screen`, rgba(255,214,110, 0.55), radius 2.2 x object radius, one pulse of 1.1 s when something changes.

## Scene changes
The camera travels along the long canvas: `H.ease.inOutCubic` over 0.9 s, whole pixels, pan distances 1140 and 1950 px. Stops share one continuous sky, so there are no cuts. Use a hard cut only to a new canvas, with the first strokes laid in over 1.5 s.

## Finishing passes (run every frame, same strength)
The lit relief is baked once per canvas and costs nothing per frame. It is what makes it paint, so never skip it:
1. Blur the height map 1 px.
2. For every pixel, `gx = h[x+1] - h[x-1]`, `gy = h[y+1] - h[y-1]`, `lam = 0.0055 * (gx + gy)`; multiply colour by `1 + lam`; where `lam > 0.25` add `(lam - 0.25) * 140` to all channels (wet specular).
3. In valleys (height < 120) darken a weave: every 6th row and column -4, elsewhere +2.
4. Add noise `(rand - 0.5) * 5` to each channel.
5. Per frame, on top: `screen` glow gradients (alpha 0.18-0.3, radius 75-180 px, breathing `0.85 + 0.15 sin(2.2 t)`) around lights, then `H.vignette(ctx, { strength: 0.35, color: '#080a1e', inner: 0.55 })`.
Story daubs sit above the lit sheet; they carry their own shadow and ridge, so they need no lighting pass.

## Sound palette
- element appears (daub): `k.noise(t, { gain: 0.24, q: 1.3, a: 0.006, f: 560, color: 'pink', filter: 'bandpass', dur: 0.09 })` plus `k.tone(t, { gain: 0.09, glideTo: 85, f: 150, dur: 0.08 })`. A short, sticky smack.
- label lands: one `k.play('stroke', t, { gain: 1.1, dur })` per word, a daub at its start, `minor: true`.
- arrow completes: no extra hit; the drag is the sound.
- drawing / writing: `k.play('stroke', a, { dur: b - a, gain: 1.1 })`, then a daub every 0.09 s (first one at full gain, the rest at 0.55), at most 11 a second.
- scene change: a palette knife scrapes twice, first left and then right. Use bandpass noise near 1.4kHz for about 0.2s per scrape, underlaid with a quiet 400Hz brown-noise layer. Finish with a dry high tock about 0.6s after the first scrape.
- wrong / right: wrong is two knife scrapes (gain 1.4) plus `k.play('thud', t, { gain: 0.5, f: 110 })`, and falling triangle tones Ab3 then F3 (gain 0.17). Right is `k.play('success', t, { gain: 0.45, f: 'G5' })`.
- key number: `k.play('impact', t, { gain: 0.85 })`, `k.play('slap', t, { gain: 0.5 })`, two daubs at double gain, `k.play('ding', t, { f: 'Bb4', gain: 0.5 })`, tones Eb5 and G5 (dur 1.3, gain 0.07).
- takeaway: brushed words, then `k.play('ding', t, { gain: 0.45, f: 'Eb4' })` and a rolled chord G4, Bb4, Eb5.
- bed or music: `k.bed(0, D, { kind: 'room', gain: 0.45 })`, `k.music(0, D, { mood: 'dreamy', key: 'Eb', bpm: 64, gain: 0.3 })`.
- counter ticks: daubs at gain 0.6, at most 12 per second.

## Signature moves
- The whole canvas is laid in stroke by stroke at the start, as a build-up.
- Halo rings around bright points pulse outward as concentric lit strokes.
- Each arrow, ring and word is painted with a shadow edge, a body and a ridge, in chrome yellow and vermilion against blue.
- The camera drifts along one unbroken swirling canvas.
- A glow breathes around the one object that matters.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Strokes look flat, like stickers | Keep the height map and the lighting pass; ridges need the upper-left highlight |
| Random stroke angles | Direction from the stream function, never `rng` |
| Uniform strokes | Vary length and width by region; 13% long sweeps, 5% dry brush |
| Text unreadable | Glaze under the text, 48 px minimum, cream or chrome on dark only |
| Light direction flips | Highlight offsets always up-left, shadows always down-right |
| Banding in the sky | Underpainting plus colour jitter of 9 per channel |
| Slow render | Bake the sheet once; per frame only blit, glows and story daubs |

## Hero frame recipe
1. Create a 1920 x 1080 canvas, prime #d6c8ac, underpaint the colour function at 12 px blur 6.
2. Define two vortices (R about 150) and one bright focal point at upper left; compute `psi`.
3. Lay 18,000 strokes across the frame (sky: len 18-27, width 8-10.5); a dark land band at the bottom (len 30-51).
4. Add a halo around the focal point: chrome-yellow disc, then 3 rings of short strokes, `ring = sin((d - r0) * 0.24 - 1.6 t)`.
5. Run the relief light pass, then the `screen` glow and the vignette.
6. Paint the headline at 144 px in chrome yellow with its dark glaze, an arrow in cream (width 17), and one vermilion ring.
