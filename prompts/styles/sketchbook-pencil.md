---
id: sketchbook-pencil
name: Spiral Pencil Study
family: Hand-drawn
fonts: [Caveat]
best_for: how things work, anatomy of an idea, design and invention stories, process and iteration, before/after learning, anything that should feel studied, careful and human
avoid_for: bright or loud brands, glossy tech, dense tables, any topic where the viewer must see colour-coded data
---

# Spiral Pencil Study

The viewer believes someone is drawing in a spiral-bound sketchbook under a desk lamp, in soft graphite on toothy cream paper. Faint construction lines come first, firm contours follow, directional hatching builds the form, a kneaded eraser lifts the highlight, and a red coloured pencil marks corrections. The quality that sells it is the paper: pencil only catches the peaks of the grain, so light strokes are broken and heavy ones fill.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #efe6d2 | warm cream; tooth and fibre described below |
| Primary ink (graphite) | #26262C | every mark; alpha carries the value, 0.08 (construction) to 0.86 (lettering) |
| Accent (red pencil) | #b8322e | corrections, a ring around the key thing, the wrong-mark; the single most important thing on screen; rare |
| Alarm / wrong | #b8322e | the same red; no second colour |
| Desk | #2a2420 to #3b332c | a strip left of the binding only |
| Binding | #f2f2f2, #9a9ca0, #3e3f42 | wire gradient; holes #2b2520 |
| Lamp | rgba(255,250,235,0.18) to rgba(70,50,20,0.16) | radial warm falloff over the page |
| Binding shade | rgba(90,70,40,0.28) | fades over 135px from the spine |
| Pencil (tool) | #2c2c30 lead, #f1d9b0 / #b98e5a wood, #5f8c6a / #2f5a3c / #16301f body | only while drawing |
| Eraser crumbs | #e9d7cf to #a99791 | 8-9 small chips |

Everything is graphite. Right answers, key numbers and takeaways are graphite too; only corrections and emphasis go red.

## Ground and surface
1. Page: `H.paperTexture(W, H, {seed: 31, tone: '#efe6d2', fiber: 0.25, grain: 0.35, blotch: 0.2})`, cached. For a camera that travels, bake one big page (about 3x the screen) and draw it under the camera transform.
2. Binding: desk strip 111px wide at the left with a dark shadow strip 15px beside it; coil rings every 51px: a punched hole (ellipse 9x11, #2b2520, light rim at 35% white), a coil shadow (7px, rgba(40,30,20,0.25)), the wire (6px, vertical gradient, plus a 1.5px white highlight at 70%).
3. Page curve near the spine: a horizontal gradient rgba(90,70,40,0.28) to 0 over 135px. Lamp radial gradient over the whole page.
4. Tooth, cached once: a 512x512 float tile, `0.4 * hash noise + 0.6 * smoothed noise`; index it by page coordinates times 1.4 so the grain travels with the page and camera, not the screen.
5. Page history (static, page-anchored, never animates): 2-3 faint dust smears (elliptical radial gradients, rgba(38,38,44,0.035-0.07), 200-260px wide, near the binding); an erased earlier attempt (a 1.6px line at 7.5% graphite inside a 12px streak of rgba(255,252,240,0.2)); a page number in Caveat 45px at 45% alpha.
6. Layers per frame, bottom to top: paper, history, tone layer (stump shading, cast shadows), smudge ghost, graphite layer, red layer, eraser crumbs, lamp, tool, grain.

## Mark-making
**Graphite line:** resample each path about every 4.5px, then use H.wobble at 1-1.5px amplitude. Draw short overlapping segments with round joins and butt ends. Taper pressure at both endpoints using the smaller of the start and end ramps, then lift that pressure into the 0.25-1 range with a square-root curve. Modulate opacity with low-amplitude seeded noise and width from 55% to 100% of its chosen weight. Reveal the resampled path using H.partial.

**Pressure.** In a closed shape, strokes are heavier on the lower-right (shadow) side: multiply alpha and width by `0.8 + 0.24*side + 0.14*noise`, where `side` runs -1 to 1 across the shape from top-left to bottom-right.

**Construction pass** (always first, per shape): a light line, alpha 0.17, 1.7px, offset (+2.4, -2), overshooting the ends 14-27px, wobble amp 2.7 (1.0 on short lines), drawn at 2.2x the speed of the contour, so it ghosts in ahead. For a circle, three overlapping attempts: centres +-6px, radii +-9-12px, alpha 0.2, 1.7px, each running 10% past a full turn. Add a vertical and a horizontal axis through the centre at alpha 0.11-0.15 and a diagonal at 0.08.

**Contour** (the confident pass): alpha 0.75, 3-4.2px, taper-in 0.08, taper-out 0.15; then a second pass shifted (+1.2, +0.9)px, 0.6x width, 0.4-0.55x alpha, wobble amp 2. Add a heavier accent stroke (4.2px) along the shadow-side arc.

**Hatching driven by a light model.** Light `L = (-0.55, -0.62, 0.56)`. Shade `s = 1 - max(0, N dot L)` for a sphere-like form (or any `shade(x, y)` you define), minus a reflected-light term of 0.28 near the lower-right rim. Make 3 passes, each a family of parallel lines through a pivot, spaced `sp * (0.8 + 0.4r)`: angle -0.85 rad, sp 10.5px, keep where `s > 0.34`; angle 0.32, sp 11.7px, keep above 0.6; angle -1.4, sp 12.75px, keep above 0.8. Alpha 0.5, width 2.1-2.25px. Test `s > threshold + noise(x*0.013, y*0.013) * 0.06` every 4.5px; split each kept run into flicks of 40-115px, each shifted by up to +-2.2px, alpha x0.75-1.15, taper-in 0.1, taper-out 0.45 (a quick start and a long lift-off). Reveal each pass by sweeping its offset across the form over 0.7-0.9 s.

**Crescent hatching** for closed shapes: fill the band between the outline and the outline shifted (-33, -28)px, then a second band for shift (-13, -12)px; two crossing passes (angle -0.82, sp 7.8px, alpha 0.46; angle 0.3, sp 8.4px, alpha 0.42; width 1.9px) clipped to the band. Sweep in from the top-left behind a diagonal front over 0.4 s once the outline is done.

**Tone (stump blending).** Radial gradient clipped to the form, centre offset up-left, stops: 0 at 0, 0.1 at 0.55, 0.32 at 0.85, 0.2 at 1. Cast shadow: an ellipse squashed to 13% height at the lower-right of the base, radial alpha 0.5, 0.22 at 0.6, 0; radius 330px. Soft card shadows: a 14px blur of the shape at 20%, offset (+10, +13)px.

**Smudge ghost:** draw a quarter-resolution copy of the graphite layer, offset (+3, +4.5)px, at 12% alpha under the sharp lines.

**Eraser (kneaded).** Highlight: a `destination-out` ellipse (ry 0.45 rx, rotated -0.7 rad, radius 70px) at the light-facing spot, radial alpha 0.92 to 0. Rubbed passes: round-cap strokes 21-27px wide, 90-135px long, alpha 0.55-0.78, slightly curved, each leaving a blurred (4px) 1.4x-wide graphite smear at 7% alpha along their edges. 8 crumbs near the work, 14-27px long, with a soft shadow.

**Paper tooth, applied to every graphite and tone pixel.** `need = 1 - min(1, 1.4 * alpha)`; `k = clamp((tooth - 0.75*need) * 3.2 + 0.15)`; `alpha *= 0.3 + 0.7*k`. Light strokes break up; heavy strokes stay solid. Static shapes can be baked into cached sprites with the tooth already applied.

**Red pencil.** Draw on its own layer, then recolour with `source-in` #b8322e; same line model, a little heavier and waxier (alpha 0.9-1.0).

## Type and numbers
- Caveat only. Titles Caveat 700 132px (never below 66px), tilted -0.015 rad; labels Caveat 400 71px (floor 45px); margin notes 400 51px at 72% alpha, tilted -0.05 rad; key number Caveat 700 181px.
- Written glyph by glyph (`H.typeOn(text, u)`) over 0.15-0.25 s per word: each glyph jittered +-1.5px vertical, +-0.03 rad, alpha 0.82-1.05 of 0.86.
- Numbers are re-pencilled: snap the displayed value to a 12 fps clock (`floor(t*12)/12`) and re-write the whole numeral with fresh jitter. Large counts move through log space; percentages ease out as `1 - (1-u)^2.2`. The finished figure is graphite, circled in red.
- A title gets a confident underline stroke after it is written; labels hang beside objects with a tag outline (5-point, open at the corner).

## Diagrams: arrows, labels, charts
- Arrow: a hand-curved shaft of one stroke (0.15-0.45 s), then an open two-stroke head 27-36px long at +-0.5 rad. Never a filled head.
- Shapes: boxes 9px radius, closed with a small overshoot; cards get a soft shadow and crescent hatching along their lower-right.
- Chart: axes as one two-segment line with two hand-drawn heads; a curve drawn in one slow stroke (0.8-1.2 s), with a seeded dip on early points that smooths out; beneath it, a tone gradient (alpha 0.2 at the line fading to 0.02 at the baseline) and hatching whose density rises toward the line (angle -0.85, sp 11px, threshold 0.2, alpha 0.34; angle 0.42, sp 12px, threshold 0.62), revealed left to right with the curve.
- Emphasis: a red ellipse, 270x135px, 6px, drawn once and overshooting; wrong = two red 9px slashes; right = a graphite tick 12px wide.
- A speech bubble or a card grid is outlined in graphite, then filled with crescent hatching.

## Motion
- Strictly sequential: construction, contour, hatching, eraser, notes. Pen lifts of 0.05-0.2 s between marks; strokes 0.1-0.5 s, hatching sweeps 0.7-0.9 s.
- Easing: draw-on is linear in length; camera `H.ease.inOutCubic` with zoom interpolated in log space.
- Camera follows the pencil tip across one wide spread (2-3 screens), zoom 0.9-1.04, glide 0.6-0.8 s, hold 3-4 s. Open with a slow pull-back, scale `1 + 0.05 * (1 - inOut)` over 5 s.
- The pencil tool (tip at the stroke end, 450x24px body at 0.72 rad, blurred shadow offset (33, 39)px) shows while anything is being drawn and is hidden otherwise. Between beats only the grain flickers; nothing else moves.

## Scene changes
Turn the page over 0.65s with H.ease.inOutCubic. Move an oblique fold from right to left, its top edge lagging the bottom by up to 300px. Freeze the outgoing illustration at the turn's start and reflect it across the fold at about 8% show-through. Shade the flap with a broad warm light/dark gradient and a 10px soft shadow. Draw the incoming sheet beneath the flap. Use this between chapters, while related additions stay on the same spread.

## Finishing passes (run every frame, same strength)
1. Paper tooth on graphite and tone (above), page-anchored.
2. Smudge ghost at 12%.
3. Lamp gradient over the finished page: rgba(255,250,235,0.14) at the centre-left to rgba(70,50,20,0.16).
4. `H.grain(ctx, t, {strength: 0.03, cell: 2, fps: 12, mono: true, seed: 3 + floor(t*12) % 3})`: three-frame cycle, so the paper breathes.
5. `H.vignette(ctx, {strength: 0.22, color: '#281c0a', inner: 0.55})`.

## Sound palette
Soft graphite on toothy paper; the drawing sits well under the hits (scale every stroke by 0.45).
- element appears (point lands): `k.noise(t, {f: 1100, filter: 'bandpass', dur: 0.018, q: 1.3, gain: 0.3, a: 0.001})` plus `k.tone(t, {f: 190, dur: 0.03, gain: 0.05})`, the knock through the pad.
- drawing / writing: graphite grains, one `k.noise` every 0.03-0.05 s for the stroke's duration (f 3100-4700, filter bandpass, q 0.7, dur 0.03-0.07, gain 0.07-0.16, pan +-0.1) over a soft pink bed (f 650, q 0.8, gain 0.08, a 0.015). Text: one stroke per word, timed by its character position. Red pencil: lower (f 800, `k.play('chalk', t, {dur: d, gain: 0.5})`, bed f 480).
- label lands: same stroke, no accent; a dot or tap = `k.noise(t, {f: 1300, filter: 'bandpass', dur: 0.02, q: 1.5, gain: 0.18})`.
- arrow completes: a short stroke for the head (0.07-0.12 s); nothing more.
- hatching: flicks every 0.05-0.07 s, `k.noise(t, {f: 3000-3900, filter: 'bandpass', q: 1.1, dur: 0.035, gain: 0.07, a: 0.006})`, pan alternating +-0.08, fading by half across the pass.
- scene change: a paper rustle starts the turn; a low pink-noise band follows the fold for about 0.6s at gain 0.2, then a soft slap and low brown-noise thump mark the landing. Use the visual fold's completion time for those final contacts.
- wrong / right: wrong = two hard red strokes at gain 1.8 plus `k.play('error', t, {f: 'E3', gain: 0.55})`; right = `k.play('success', t, {f: 'A5', gain: 0.75})` with the tick.
- key number (biggest hit): re-pencil ticks `k.play('tick', t, {f: 2600 to 3600, gain: 1.1})`, at most 12 per second, slowing as the value settles; on the frame the final value first appears, `k.play('impact', t, {gain: 1.0})` and `k.play('ding', t + 0.01, {f: 'C6', gain: 0.42})`, then the red ring.
- takeaway: `k.play('success', t, {f: 'G5', gain: 0.7})` as the underline ends, then `k.play('tock', t + 0.3, {f: 380, gain: 0.6})`, a pencil laid down.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`; a gear or dial turning is a `click` (f 900, gain 0.5) every ~0.27 rad.

## Signature moves
- Faint construction circles and axes that ghost in ahead of every shape, then firm up.
- Hatching that breaks on the paper tooth and sweeps across the shadow side.
- The kneaded eraser lifting a highlight and leaving crumbs on the page.
- A red coloured pencil that appears only to correct or emphasise.
- Numbers re-pencilled at 12 fps.
- A physical page turn to start a new chapter.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Uniform vector lines | taper, flicker, wobble 1.5px, two contour passes, pressure by side |
| Solid hatching | broken flicks of 40-115px, thresholds from a light model |
| No grain | the tooth pass on all graphite and tone, anchored to page space |
| Perfect shapes | construction first, overshoot ends, three-attempt circles |
| Colourful | graphite plus red only; no other hue |
| Clean page | history: ghosts, smears, crumbs, page number |
| Page turn is a wipe | real fold with reflected flap, shadow and show-through |

## Hero frame recipe
1. Page: cached paper, binding on the left, lamp, spine shade, three smears, an erased ghost line, "p. 14" at 45px.
2. Title in Caveat 700 132px at (195, 156), tilted -0.025, written fully, with a graphite underline stroke (3px) and a subtitle in Caveat 400 39px at 50% alpha.
3. Focal object (a sphere-like form with a base) at the centre: three construction circles, axes, then the contour (two passes), then three hatching passes, tone layer, kneaded highlight.
4. A smaller study at the top right, half-finished (construction plus a partial contour), and two thumbnail variants on the left, each with a letter label.
5. A margin note in Caveat 51px with a hand arrow pointing at the form; a five-step value scale at the bottom.
6. Eraser passes and 8 crumbs; the pencil tool at the last stroke tip.
7. Smudge ghost, lamp, grain, vignette. Check: zoom to 200%; light lines must be broken by the grain and the darkest strokes solid.
