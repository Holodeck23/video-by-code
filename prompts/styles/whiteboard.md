---
id: whiteboard
name: Dry-Erase Board
family: Hand-drawn
fonts: [Permanent Marker, Kalam]
best_for: step-by-step explanations, processes and loops, feedback cycles, before/after reasoning, anything a teacher would sketch live
avoid_for: dense data tables, luxury or cinematic tone, topics where the "quick sketch" feeling undercuts trust
---

# Dry-Erase Board

The viewer believes a person is drawing the explanation live on a glossy whiteboard with chisel-tip markers. A marker nib travels along every stroke, wet ink pools where it lands, and a ghost of an older, half-erased lesson shows through the gloss. One big board is the whole world; the camera glides across it.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (board, light end) | #f6f8f7 | top-left of the diagonal gradient |
| Ground (board, mid) | #ecefee | gradient stop 0.55 |
| Ground (board, shadow end) | #dfe4e3 | bottom-right, stop 1 |
| Primary ink | #1d1f26 | outlines, arrows, main words |
| Accent (blue) | #1f4fc2 | structures, titles' underline, "the system" |
| Alarm / wrong | #d4262f | errors, loops that fix something, emphasis rings; use rarely |
| Right / result | #16884a | outcomes, checks, a number that has landed |
| Ghost ink | #30343c | old lesson, drawn at 11% alpha only |
| Residue haze | rgb(120,128,135) | eraser smears, 1-3% alpha |
| Tool metal | #c9ccd0 to #9ea3a8 | marker barrel, aluminium rim |

One colour per meaning, held for the whole video. Never a fifth marker colour.

## Ground and surface
Build in this order; steps 1-3 are static and cached with `H.offscreen('board', W, H, fn)` (for a travelling camera, bake the board at world size, about 5400x2100, at half resolution).
1. Fill a linear gradient from (0,0) to (W,H) with the three board stops above.
2. Cleaner blotches: 14 radial gradients (40 for a large world), radius 120-390px, colour rgb(150,160,165) fading from 1.5-4.5% alpha to 0, positions from `H.rng(5)`.
3. Ghost lesson: draw old words and sketches in #30343c (a heading in Permanent Marker 78px, bullets in Kalam 700 51px, a pie, a line chart, a formula, a box, all 10px line width) onto a scratch layer. Build a mask of 70 to 230 curved eraser swipes (`H.rng(77)`: width 6-39px, length 225-630px, alpha 0.15-0.8) and apply with `destination-in` so the old ink survives only in streaky bands. Draw the result at `globalAlpha` 0.11 with `blur(0.7px)`. Smear 5-9 haze strokes (width 45-90px, blur 6px, rgb(120,128,135) at 1.2-3% alpha) over each old lesson. Scatter old lessons into the empty parts of the board so every camera position has some.
4. Per frame: the live drawing, the sheen and reflections (see Finishing), the marker, the grain.

## Mark-making
**Marker stroke** `marker(ctx, pts, colour, w, seed, prog)`: `pts` = `H.wobble(H.resample(points, 3.75), noise, {amp: 2.4, freq: 0.0075, seed})`, then draw only the leading `prog` of it (`H.partial`). Passes, in order:
1. Underlay: round caps, `w` wide, colour at 30% alpha.
2. Body: split the stroke into 10-point chunks; each chunk at width 0.96w, butt caps, alpha swinging between 0.16 and 0.38 under `noise.n2(i*0.03, seed)`, so wet and dry patches drift along the length.
3. Pooled edges: 7 parallel offsets across the width (offset = u * 0.84w, u from -0.5 to 0.5), each `w/7*1.5` wide, alpha `(0.08 + 0.5 * |2u|^2.2) * r.range(0.65,1.35)`. Edges end up dark, centre pale.
4. Dry streaks: 4 hairlines (0.9-1.8px) in the board colour at 14-34% alpha, offset +-0.3w, each covering 30-90% of the length from a random start.
5. Ink pools: a radial gradient of radius 0.62w at the first point (42% alpha) and, once finished, the last point (25%).

Stroke widths at 1920: heavy outline 10-12px, normal 8px, links and fine detail 5px, hairlines 4px. Draw heavy and light strokes with different seeds so no two look cloned.

**Shapes.** Boxes are 5-point paths that overshoot their corners by 6-12px and do not quite close; draw them twice, the second pass inset 5px and shifted (+4,-3), 70% of the width, amp 3.6. Circles run past 360 degrees by 10-20% with a slow radius growth (2-6%) so the end misses the start. Cylinders, nodes and doodles are several short separate strokes, never one tidy path.

**Fills** are never flat. Mark scribble hatching instead: 4-6 parallel strokes at 6-8px spacing, 45 degrees, 5px wide, 60% of normal alpha.

**Hand and tool.** While anything is mid-draw, show the marker: a chisel nib in the ink colour at the stroke tip, a white-to-grey barrel (gradient #ffffff, #e4e6e8, #9ea3a8) 345px long, 42px thick, tilted 0.95 rad, a cap band in the ink colour, and a blurred shadow (blur 8px, 21px right and 27px down, 25% alpha). Nothing is drawn while the tip is away.

## Type and numbers
- Titles and key numbers: Permanent Marker 400. Headline 100-126px (never below 99px), second-level 80px.
- Labels: Kalam 700, 57px (never below 45px), in the colour of the thing they name.
- Key number: Permanent Marker 165px, ink while counting, green when landed.
- Written-on: `H.typeOn(text, p)` reveals glyphs one by one over 0.25-0.5 s (about 14 characters per second for a title). Each glyph is jittered per `H.rng(seed)`: vertical +-2px, rotation +-0.035 rad, spacing +-1px. Fill at 80-90% alpha, then a 2px stroke of the same colour at 70% so the rim is darker than the middle.
- Whole lines sit tilted by -0.01 to -0.03 rad; a line is never perfectly horizontal.
- Numbers are re-scrawled: snap the displayed value to a 12 fps clock (`Math.floor(t*12)/12`) and redraw the whole numeral with fresh jitter each tick, so it looks rewritten, not animated. Large counts ease in log space; percentages ease out (`1 - (1-u)^2.2`).

## Diagrams: arrows, labels, charts
- Arrow: shaft as one stroke (0.22 s), then two separate head strokes of 0.12 s each, 36px long at +-0.5 rad from the shaft's end direction. Heads are never a filled triangle.
- Label: written beside the object after the object finishes, 12px of clear space, in Kalam. A tag is a hand-drawn five-sided outline plus a word.
- Emphasis: an ellipse ring 6-9px wide, 0.3 s, in red, run once around the thing, overshooting its start. Underlines are two slightly different strokes in blue.
- Chart: two axes, hand-drawn heads, a wobbly polyline with small dips on early points that fade as the value settles (amp 2% of the chart height), axis label under, value label above. Highlighted bars are scribble-hatched, not filled.
- Wrong: two hard slashes of 12px red across the thing, struck word replaced by the right one in green with a check (three-point stroke, 12px).

## Motion
- Everything is a timed stroke on one sequential timeline: pen lifts between items, 0.05-0.2 s gaps, strokes 0.1-0.5 s (arrows 0.46 s total, a 30-link web 0.9 s).
- Easing: draw-on is linear in length (a hand moves steadily); camera uses `H.ease.inOutCubic`, zoom interpolated in log space.
- Camera: one large board, 2-3 screens wide. Hold on the working area, glide 0.8-1.5 s to the next area while the pen finishes a connector arrow with a label on it. Zoom range 0.88-1.05; push in slightly for the key number.
- Between beats the frame breathes: sheen offset moves `t*6` px, reflections slide at 15% of camera x (parallax), the ghost never moves.

## Scene changes
Erase, do not cut. A felt eraser (dark #6a7480 to #2c323a rounded block, 240x100px with a lighter top edge and a shadow) sweeps back and forth over the area to clear: 8 passes over 0.65 s, band height 200px, passes stepped down by 100px.
- Draw the erasable content on its own scratch layer; wipe it with `destination-out`: a 200px stroke at 95% alpha plus 16 felt-fibre strokes (width 7-28px, dy +-88px, alpha 0.45-0.95) so some bands go clean and others leave faint residue.
- After the wipe, fade in haze (16 smears, width 60-135px, blur 6px, 0.7-1.6% alpha) over the cleared area.
- Cache the finished wipe mask once at half resolution; only the in-progress wipe is computed per frame.
- Skip the erase and only glide the camera when the following idea extends what is already drawn.

## Finishing passes (run every frame, same strength)
1. Sheen: a diagonal linear gradient, offset by `t*6` px, white at 0 / 0 (stop 0.36-0.4) / 0.26 (0.43) / 0.12 (0.47) / 0.3 (0.5) / 0 (0.58). It sits over the ink too.
2. Ceiling reflections: 2 to 4 wide ellipses (rx 345-390px, ry 33-39px, y about 100px), radial 55% white to 18% at the half to 0, spaced 825px apart.
3. Falloff: a bottom gradient, rgb(60,70,80) from 0 to 7-8% over the last 360px.
4. Optional rim for opening and closing shots: aluminium strips (#f4f5f6, #c6cace, #e7e9eb, #a3a8ae, #7c8187), 39px, a 12px inner shadow on the top and left, a tray with a marker and an eraser lying in it.
5. `H.grain(ctx, t, {strength: 0.018, cell: 2, fps: 12, mono: true})`. Faint; it only breaks up the banding.

## Sound palette
- element appears (stroke start): a 22 ms bandpass `k.noise` burst at the touch-down moment (`gain: 0.22`, `a: 0.001`, centred at 1.5 kHz with `q: 1.4`), the felt tip landing.
- drawing / writing: `k.play('stroke', t, {dur: drawDuration, gain: 0.7-1.0})` per stroke; for text, one stroke per word, timed by the word's character position inside the write window.
- label lands: `k.play('stroke', t, {gain: 0.7, dur: 0.15})` only; never add a "ding" to labels.
- arrow completes: a short `stroke` for each head (0.1 s, gain 0.9).
- scene change (erase): 8 pink-noise bandpass passes (f 650 to 890, q 0.7, gain 0.3, pan alternating) plus `k.play('erase', t0, {dur: 0.65, gain: 0.6})`.
- wrong: two hard `stroke` slashes at gain 1.7, `k.play('error', t, {f: 'F3', gain: 0.6})`. right: `k.play('success', t, {gain: 0.8})` with the check mark.
- key number (biggest hit): `k.play('count', ...)` ticks at 12/s with rising `f` from 3800 (+180 each), then `k.play('impact', t, {gain: 0.85})` and `k.play('ding', t + 0.01, {f: 'E6', gain: 0.55})`.
- takeaway: `k.play('success', t, {f: 'G5', gain: 0.7})` as the underline finishes.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.5})`; a cap-off `pop` (f 330, gain 0.45) at 0.03 s and a cap-on `click` at the end.

## Signature moves
- The tip of the marker is on screen, and the camera follows it.
- Pen lifts: the nib vanishes between strokes, so the viewer sees a hand working.
- Re-scrawl: numbers are rewritten at 12 fps instead of counting smoothly.
- The eraser sweep, with streaks of ghost left behind, to open space for the next idea.
- A red loop that draws itself back to the start to show feedback.
- Two-colour underline written after the headline.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Uniform, vector-clean lines | all five marker passes, wobble amp 2-3.6px, per-stroke seeds |
| Perfect circles and closed boxes | overshoot corners, open ends, double-trace |
| Text fades in | write it glyph by glyph with jitter |
| Gloss is a flat white overlay | keep the sheen band narrow and moving, plus ellipse reflections |
| Eraser leaves a clean slate | keep 1-5% ghost and haze; keep the old lesson visible |
| Too many colours | four marker colours with fixed meanings |

## Hero frame recipe
1. Cached board: three-stop diagonal gradient, 14 blotches, ghost lesson at 11% with swipe-mask and haze.
2. Title "WORD WORD" in Permanent Marker 126px, ink, rotated -0.012 rad, at about (120, 190), written fully (p = 1).
3. Two blue underline strokes: widths 12px and 10px, 8px apart, amp 3.3, 0.35 and 0.3 s.
4. One main subject below it: a rounded box in ink (heavy, double-traced), a Kalam 57px label under it, a blue arrow with two head strokes leading to a second box in green.
5. A red ring around one element, a tilted red tick beside the title.
6. Sheen band, two ceiling ellipses, bottom falloff, then the marker tip (blue) at the last point of the ring with its blurred shadow.
7. `H.grain` at 0.018. Compare against a photo of a real board: the ink centres must look lighter than their rims.
