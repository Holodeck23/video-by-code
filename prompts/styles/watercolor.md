---
id: watercolor
name: Watercolor Sketchbook
family: Painterly
fonts: [Caveat]
best_for: gentle, curious, human-scale topics; learning, nature, health, craft, story-led explainers where warmth matters more than precision
avoid_for: dense dashboards, exact numbers that must be compared at a glance, hard-edged technical or financial content
---

# Watercolor Sketchbook

The viewer is watching someone paint in a sketchbook: a faint pencil drawing first, then transparent pigment floods into it, dries darker at its edges and blooms where water was dropped in. One long sheet of cold-press paper sits behind everything and the camera slides along it. The thing that sells it is transparency: every colour is a stack of pale layers that lets the paper tooth show through, and the lights are paper left bare.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #fbf8f0 | warm off-white; never pure white. Edges gather a faint tan (#e8d6b6 at 55% on the top and bottom 18%) |
| Primary ink | #2c3470 | indigo; headline, labels, counters, main arrows |
| Pencil | #464448 | underdrawing, leader lines, small captions (#504e54 for pencil lettering) |
| Accent | #be283c | alizarin red; the one thing that matters on screen, circled or crossed |
| Alarm / wrong | #be283c | same red, hard slashes; right is sap green #46823c |
| Wash warm | #deb876 | ochre ground wash; glaze #ce965c; drop-in #b0603e |
| Wash cool | #7eb2d6 | cerulean sky wash; glaze #466aac; drop-in #5054a8, rose #c87896 |
| Light | #fad65a | aureolin yellow for glow; warm core #f6963c |
| Line blue | #3c78be | cerulean for chart lines |
| Shadow | #7a6eb0 | violet cast shadow under objects |

## Ground and surface
Build one sheet 5100 x 1080 (three screens wide) once with `H.offscreen('sheet', 5100, 1080, draw)`. The camera draws a 1920 x 1080 window of it.
1. Height map: sum three value-noise layers with `H.noise` (feature size 3, 10.5 and 60 px, weights 0.3, 0.5, 0.2). Keep this array; granulation reads it later.
2. Fill #fbf8f0, then light each pixel by `1 + (heightUpLeft - height) * 0.1` so the tooth looks raked from the top left.
3. Multiply a vertical gradient: tan #e8d6b6 at 55% at the top edge, #faf0de at 20% at 18% and 80%, #e4d0ac at 60% at the bottom edge.
4. Multiply 14 big soft ghost stains (radial gradient, 210-480 px wide, 105-255 px tall, random positions, seed 404): half warm #ecd6aa at 20%, half cool #d6d6e2 at 16%. They keep the sheet from looking digital.
Nothing here changes per frame. Round the camera x to a whole pixel before drawing the sheet or the tooth swims during pans.

## Mark-making
**Wash (every filled shape).** Write a `deform(points, rng, depth, amt)`: repeat `depth` times, inserting between each pair of neighbours a midpoint pushed by `rng.gauss() * segmentLength * amt * v`, where `v` is a weight stored on each point (0.3 for an edge that should stay straight, 1.0 normal, 1.4 for a loose edge). Then:
```
for i in 0..layers:                      // 22-30 layers
  c.globalAlpha = alpha * (0.6 + 0.8*r)  // alpha 0.05, so one layer is nearly invisible
  fill(deform(shape, rng, 3, 0.15))      // a new ragged outline every layer
```
Overlaps stack into a soft tonal range inside, and the outlines wander, which gives the edge. Large loose washes use amt 0.15-0.2, tight objects 0.06-0.1 with depth 2. A second glaze is the same shape, smaller, in the darker glaze colour, 15 layers at alpha 0.038: the overlap shows a hard inner edge, like wet on dry.

**Bake each wash, then finish it** (in `H.offscreen`, once, at its own size):
1. Mottle: multiply alpha by `0.5 + 0.5 * m`, where `m` is two random alpha grids (48 x 27 in 0.55-1, 160 x 90 in 0.75-1) scaled up with smoothing and combined. Pigment load varies without blotches.
2. Drying edge: blur a copy of the alpha channel (12 px big washes, 6 px small), then `alpha += max(0, alpha - blurred) * pool` with pool 2.2-3.0. Edges come out dark and pooled.
3. Granulation: `alpha *= 1 + k * ((0.5 - height) * 2 * (0.18 + 0.7*blue) + speck)`, k 0.45-0.8, `blue = max(0, (B - R) / 120)`, `speck` adds `(s - 0.88) * 4 * (0.2 + blue)` for about 12% of pixels. Blues and violets granulate into the paper pits; yellows stay smooth.
4. Feather the canvas border by 60 px so a wash never ends on a straight cut.
Draw baked washes on the frame with `globalCompositeOperation = 'multiply'`.

**Wet-in-wet.** A second pigment as soft radial blobs (rx 100-240 px, ry 40-100 px, alpha 0.2-0.34, gradient stops 1, 0.7, 0), painted with `source-atop` so it tints only where the wash already exists.

**Bloom (cauliflower).** A ragged round hole (9 points, v 1.4, depth 2-3, amt 0.35-0.5) erased with `destination-out`: 10-14 layers at alpha strength / 5, strength 0.45-0.7. Blooms belong in the middle of big washes. Animate them late: radius `r0 + 24 * H.smoothstep(2, 6, t)`.

**Bare-paper lights.** Highlights and halos are erased from the wash, never painted white: `destination-out`, 10 layers, alpha 0.35-0.5, ragged crescents rather than ellipses.

**Pencil.** `rgba(70,68,72, 0.1 to 0.3)`, width 1.6 px, round caps. Draw each line 2-3 times with a whole-line offset of `gauss * 2` px and per-point jitter of 0.7 px. Construction lines (centre cross, horizon) sit at alpha 0.1. Draw pencil after the wash bake, so it is not pooled. Pencil appears before its wash and stays visible around it.

**Round brush stroke** (arrows, underlines, rings, chart line). Build a ribbon along the path: half-width `w * (0.35 + 0.65 * sin(...)) / 2`, widest around the middle, tapered at both ends (chart line: constant, small sine variation). Fill at alpha 0.75 in `multiply`, then stroke the same outline 1.8 px at alpha 0.45, which makes the darker rim. Arrow head: two round-capped strokes from the tip, back at +/-0.5 rad, length 2.6 w, width 0.55 w. Draw-on is the leading fraction of the path's points.

## Type and numbers
Caveat 700 for every word. Headline 165 px (shrinks to 70 px as a corner title), counters and key numbers 100-105 px, labels 57-60 px, pencil lettering (Caveat 400) 51-57 px, never below 45 px.
- Colour: indigo for statements, #504e54 for pencil captions, alizarin only for the emphasis word or number.
- Bake each string once into a cache canvas: fill at alpha 0.85, fill again offset (2 px, 1.5 px) at alpha 0.25, then run the drying-edge step (pool 2.4, blur 4 px). Draw it with `multiply`.
- Reveal by clipping the cached canvas left to right over 0.3-0.5 s (about 0.06 s per character for a title).
- Counters are re-lettered as they change: cache each shown value, clear the cache past 300 entries. At the end the value turns alizarin and gets a ring.

## Diagrams: arrows, labels, charts
- Arrows are round-brush strokes, width 12-14 px, in indigo (flow in sienna #aa5a32 at alpha 0.45). Curved bezier paths from `H.bezier`, 30-60 points.
- Labels sit beside the thing, joined by a short pencil leader. Paint the label after its arrow lifts.
- Wrong guess: two alizarin slashes (width 15 px, alpha 0.85, 0.15 s each) plus a ring around the wrong word. Correct: a sap-green tick, 3 points.
- Chart: pencil axes (alpha 0.5, width 2 px), a cerulean brush line (13 px, alpha 0.8, not tapered) pulled along the data with dots every third point. The last value gets a ring in alizarin, 36 px radius.
- Boxed pictures: a washed square in `multiply`, a thin pencil frame (alpha 0.45), a pencil tick at one corner.

## Motion
- Washes enter 1.0-1.4 s with `H.ease.inOutCubic`. Draw a cached wash through a radial alpha mask: radius `0.55 * diagonal * H.ease.outQuad(p)`, inner stop at 60%, and `globalAlpha = min(1, p * 1.5)`. It reads as water spreading from the middle.
- For one hero wash you can instead redraw live: scale its outline from 0.55 to 1.0 around the centroid, layer count from 25% to 100%, pool strength times `p^2`. Edges darken only as it dries. Use the same seeds each frame.
- Strokes 0.4-0.6 s, text 0.3-0.5 s, pencil 0.4-0.5 s. Stagger items 0.1-0.2 s.
- Splatter dots pop in with `H.ease.outBack` over 0.12 s, 0.003 s apart.
- Between beats: blooms creep outward, pencil lines keep drawing, a warm glow (blur 20 px, alpha 0.35, multiply) pulses once when something changes.

## Scene changes
Pan along the sheet: camera x eases with `H.ease.inOutCubic` over 0.9-1.0 s; the next wash starts flooding in 0.1 s before the pan ends. The first pan is about 1140 px, the next about 1980 px. Build washes only when their rectangle intersects the camera window. Stay on one screen when a sequence is only a few seconds long.

## Finishing passes (run every frame, same strength)
1. Paper window: draw the baked sheet at the rounded camera x.
2. World layer: translate by minus camera x; washes (multiply), pencil, brush marks, text.
3. Granulation and the paper tooth were baked into each wash, so they move with the paper. Do not add a second noise layer on top.
4. Optional `H.vignette(ctx, { strength: 0.1, color: '#8a6f45', inner: 0.6 })`. No film grain.

## Sound palette
- element appears (a wash floods in): a slow wet swell of two noise layers: `k.noise(t, { gain: 0.09, f: 500, q: 0.7, filter: 'bandpass', color: 'pink', a: d * 0.4, r: d * 0.4, dur: d })` and, 0.03 s later, `k.noise(t + 0.03, { gain: 0.08, a: d * 0.3, color: 'brown', f: 380, filter: 'lowpass', dur: d * 0.7 })`.
- label lands: per word, a wet touch-down, `k.noise(a, { gain: 0.16, a: 0.008, dur: 0.05, f: 700, filter: 'lowpass', color: 'pink' })`, then `k.play('stroke', a, { dur: b - a, gain: 1.0 })`, with `a`, `b` set by the word's character span in the reveal.
- arrow completes: the same brush call with `dur` equal to the draw-on time; no extra hit.
- drawing / writing: `k.play('stroke', t, { dur })` for brush, `k.play('pencil', t, { dur, gain: 0.5 })` for pencil.
- scene change: a brush rinse: four `k.noise` bandpass swishes (pink, f 700, q 1.6, gain 0.13, dur 0.2, alternate pan -0.2/0.2) spaced 0.1 s, two water drops `k.tone(t, { f: 330, glideTo: 560, dur: 0.08, gain: 0.07 })`, then `k.play('tock', t + 0.5, { f: 900, gain: 0.45 })` on the pan.
- wrong / right: wrong is two loud strokes (gain 1.9) with a falling pair of soft triangle notes, `k.tone(t, { type: 'triangle', f: 'A3', gain: 0.2, dur: 0.22 })` then `k.tone(t + 0.18, { type: 'triangle', f: 'F3', gain: 0.2, dur: 0.4 })` and `k.play('thud', t, { f: 120, gain: 0.35 })`. Right is `k.play('success', t, { f: 'A5', gain: 0.48 })`.
- counter ticks: soft brush dab, `k.minor(() => k.noise(t, { f: 1250, q: 1.1, filter: 'bandpass', gain: 0.26, color: 'pink', dur: 0.035 }))`, at most 12 per second.
- key number: `k.play('thud', t, { f: 95, gain: 0.8 })`, `k.play('impact', t, { gain: 0.55 })`, `k.play('ding', t, { f: 'C5', gain: 0.5 })`, plus two soft tones (F4, A5, dur 1.3, gain 0.08).
- takeaway: brush the line, then a rolled chord one beat after: `k.play('ding', t, { f: 'F4', gain: 0.42 })` and A4, C5, F5 tones 0.06 s apart.
- bed or music: `k.bed(0, D, { kind: 'room', gain: 0.45 })`, `k.music(0, D, { mood: 'dreamy', bpm: 64, gain: 0.35 })`.

## Signature moves
- The title is brushed in letter by letter and then slides to the corner at 42% size.
- Every important shape starts as pencil, then colour floods into the outline.
- Each wash drops a second pigment into itself while still wet.
- A hard alizarin ring or cross for emphasis; nothing else is red.
- Number counters re-letter themselves as they climb, then the final value turns red and gets a ring.
- The camera moves along the sheet like a hand moving the page.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat, opaque fills | At most 0.05 alpha per layer, 22+ layers, `multiply` onto paper |
| Perfect circle or smooth polygon edges | `deform` every layer with a fresh random outline |
| No dark rim | Run the drying-edge pass (pool 2.2+) on every baked wash |
| White painted highlights | Erase them out of the wash with `destination-out` |
| Texture swims during pans | Round camera x; bake tooth into the sheet and the washes |
| Per-frame random jitter | Seed everything with `H.rng(seed)`; same `t`, same pixels |
| Small thin Caveat | 51 px minimum for pencil, 57 px for labels |

## Hero frame recipe
1. Draw the sheet (paper, tan edges, ghost stains) at camera x 0.
2. Pencil one rounded subject near the left third: outline 3 passes, centre cross at alpha 0.1, a horizon line.
3. Wash a cerulean sky around it (ragged loose polygon, 22 layers, glaze in #466aac on the top third, drop-ins of #5054a8 and rose), then erase a halo around the subject for the bare paper glow (two ragged circles).
4. Wash the subject itself in aureolin (30 layers), drop a warm core into it with `source-atop`, erase two crescent highlights, add a cool cerulean reflection on the shadow side.
5. Ground: ochre wash and a violet cast shadow ellipse (blur 10 px).
6. Add two blooms in the sky and one in the subject, then a splatter of 40-70 small dots in three of the palette colours.
7. Letter a headline in indigo at 165 px, an alizarin ring around the key word, and a pencil caption at 51 px.
