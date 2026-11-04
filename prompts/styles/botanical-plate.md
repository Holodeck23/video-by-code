---
id: botanical-plate
name: Naturalist's Folio
family: Illustration
fonts: [Cormorant Garamond, Libre Baskerville]
best_for: taxonomies, life cycles, growth stages, "specimens" of an idea, scholarly or museum tone, anything that rewards a numbered figure and a Latin-style caption
avoid_for: fast energy, humour, anything that needs bold flat colour, UI walkthroughs, dense tables
---

# Naturalist's Folio

The viewer believes they are turning the pages of an old natural-history folio. Each scene is one plate, pulled fresh from a copper engraving onto foxed rag paper, then tinted by hand with loose transparent watercolour. Every form is modelled in swelling engraved lines that follow its surface. The quality that sells it is the offset: thin black line work with colour laid slightly beside it, never inside it.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (rag paper) | #efe5cf | warm cream with fibre; toned darker at the edges |
| Edge toning | rgb(160,115,50) | radial, 0 to 30% alpha toward the corners |
| Primary ink | #261e18 | warm brown-black, rgb(38,30,24); lines are drawn black and lifted to this |
| Plate mark brown | rgb(110,80,40) | pressed edge, 35% alpha |
| Foxing | rgb(160,100,45) | spots, 20-50% alpha, multiply |
| Accent (colourist's red) | #b8382c | rings and crosses; the single most important thing per plate |
| Alarm / wrong | #b82e24 | slashes only; use rarely |
| Right / result | #4f8a3c | ring in the corrected state; banner #9fbf7a |
| Foliage wash | #6d8c45 | alpha 0.55-0.6 |
| Rose wash / pooled base | #c94f66 / #a83a52 / #7a2a48 | petals; the base pool at 26% alpha |
| Brass / parchment / gilt | #c8a25a / #e9d9a8 / #d6a046 | instruments, cartouches and ribbons (#efe0b0), traced metal |
| Earth washes | #c99a4e #a8784e #5e3f28 #7a5a34 | fur, wood, handles |

Limit a plate to three or four washes. Colour sits beside the ink, translucent, and never fully opaque.

## Ground and surface
Build once and cache with `H.offscreen('plate', 1920, 1080, fn)`.
1. Paper: `H.paperTexture(1920, 1080, {seed: 19, tone: '#efe5cf', fiber: 0.4, grain: 0.45, blotch: 0.3})`.
2. Toning: radial gradient from the centre, r450 to r1200, rgba(160,115,50,0) to rgba(160,115,50,0.30).
3. Plate area: a rectangle inset 66px left and right, 45px top, 39px bottom, filled rgba(150,120,80,0.06).
4. Foxing: 110 spots from `H.rng(1847)`; 55% of them within 300px of the left or right edge; radius 1.5-6px (12% reach 18px); radial gradient rgba(160,100,45, 0.2-0.5) to 0, `multiply`. Baked into the paper so the washes tint over them.
5. Plate mark: a 2.25px rectangle rgba(110,80,40,0.35) on the plate area, a 3px light line rgba(255,250,235,0.55) outside it by 3px, and a 6px rgba(110,80,40,0.12) line inside it by 4.5px, so the edge looks pressed.
6. Printed furniture on the ink layer: a 2px frame inset 93px/63px and a 1px frame 7px inside it; running head "Vol. III." left and plate number "Pl. XXV." right in Libre Baskerville 20px at y 93.
7. Per frame: two layers per plate. `ink` (black, drawn with `destination-out` knockouts) and `tint` (washes). Recompose every frame as in Finishing.

## Mark-making
**Swelling line** `engrave(ctx, lines, maxW, thr, gamma)`: each line is a list of `[x, y, shade]`. Width = `maxW * clamp((shade - thr)/(1 - thr))^gamma`, with maxW 1.4-1.7px, thr 0.25-0.3, gamma 0.8. Draw each run as one filled ribbon: offset every point by +-`w/2` along its normal, end points at 35% width. Where width falls below 0.2px, break the line, so highlights are open paper.
**Form-following lines.** Describe a surface as `S(u, v)` (u along the length, v across, -1 to 1). Draw 13-30 iso-lines along u with `shade(u, v)`: darker on the lower-right side, at the base (`(1-u)^3.5`), and at the edges (`|v|^4`). In the deepest shadow add a second set along v with the shade lowered by 0.3 (cross-hatch). A leaf or petal outline: width `wid * sin(pi * u^0.7)^0.85`, centreline bent by `bend * len * u^2`.
**Flat hatching** inside a clipped shape: parallel lines every 3.6-4.8px at an angle, 24 samples per line, weight from a shade function. Use 0 rad for backgrounds and about 1.05 rad for the second pass.
**Contour** (outline): a ribbon with width 0.8-3px, heavier where the outward normal points down-right (`k = clamp(0.5 + 0.5*(0.6*nx + 0.8*ny))`, light from the upper left).
**Stipple**: 0.7-0.9px dots clipped to the shape with a density falling off from the darkest point, count about 400 per unit scale squared.
**Midrib**: a tapered ribbon along the centreline, 2.4px at the base to 0.6px at the tip.
**Knock-out**: before engraving any form, `destination-out` fill its outline on the ink layer, so forms in front hide the lines behind. Draw back to front.
**Hollow trace** (a metal inlay): stroke the line 3-8px wide in ink, `destination-out` a stroke at 45% width through it, and lay a gilt line (rgba(214,160,70,0.85), 4px, shifted +1.5px right) on the tint layer.
**Wash** `wash(tint, outline, colour, alpha, mis)`: fill at alpha 0.5-0.7 offset by the misregistration `(2.25, -1.5)`px (up to `(3.75,-2.25)` on large shapes), then stroke the outline at 4.5px with alpha x 0.9, so the pigment pools at the edge. Add a second smaller wash at 26% alpha over the first 45% of a form for a darker pooled base.
**Figures**: an oval frame (two concentric contour lines 6px apart) with hatched background, the subject modelled inside with contour rings that thicken toward the shaded flank, a caption in Cormorant Garamond italic 600, and a small figure number ("1.", "a.") in Libre Baskerville italic 22px at the upper left.

## Type and numbers
- Title: Cormorant Garamond italic 400, 144px, centred, then it shrinks to a running head (42px at y 108) in 0.6s. Revealed left to right as a clip rectangle, as if cut, over 1.0s. A thin rule (1.2px, 60% of the width) is cut under it.
- Plate labels (stage names): Cormorant Garamond 600 upper-case, 66px; captions italic 600, 48-60px; story-critical never below 42px.
- Key number lives in a cartouche: a superelliptical oval (x `* (1 - 0.06|sin a|^6)`, y `* (1 + 0.05 cos 4a)`) knocked out, washed #e9d9a8, contour 1.2-3.3px, inner ring 9px inside, with a scroll flourish on each side (a tapered curl rising 45px and 39px from the middle with a 4.5px dot). Label italic 54px over the number in 600 at 108-165px, centred.
- Counts: totals climb log-wise (`10^(1 + 5e)` with `e = inOut`), percentages ease out `1 - (1-p)^2.3`. The numerals change in place with no tween.
- Ribbon banner: a six-point scroll shape, tinted, text cut into it with a clip that opens left to right over 0.35s.

## Diagrams: arrows, labels, charts
- Arrow: a tapered ribbon (0.5w to w, w 3.6-5px) revealed by `H.partial` along a quadratic curve; two pairs of tail barbs 9px apart at +-0.6 rad (13.5px); a barbed head (tip 9px beyond, wings 27px at +-2.7 rad, notch 6px behind the tip) appears only when complete. An italic label (48px) sits above the apex once the arrow is half drawn.
- Label: an italic caption below the figure with a hairline leader (1.2px, curved) to the thing named.
- Emphasis: a hand-painted ring on the tint layer: two passes (9 and 4, so 13.5px and 6px) in rgba(184,56,44,0.75), 1.08 turns starting at -0.6 rad, radius wobble `1 + 0.03*sin(5a + k)`, drawn on over 0.35s.
- Wrong: two slashes in red wash 20px wide, 0.125s each. Right: a green ring, the ribbon rewashed #9fbf7a.
- Chart: growth stages along a ruled baseline (1.8px, hatched below), the same figure drawn larger at each stage (four steps, scale 0.55 up to 1.15), a value under each, and one long engraved arrow rising across them.
- Instruments: a brass dial is an oval washed #c8a25a with 45-degree hatching, a 0.72R inner ring, 12 tick marks, and a needle ribbon.

## Motion
- Everything is revealed in the engraver's order: the ink first, then the tints bloom 0.3-1.0s later.
- Tint bloom: a mask on the tint layer, per pixel `alpha = clamp((R*1.25*H.ease.outQuad(clamp((t-t0)/1.0)) + 51*fbm - d)/21)` with `d` the distance to the bloom centre; bake at one quarter resolution and scale up. Several blooms, one per figure.
- Items sliding along an arrow shrink as they go (scale `0.42*(1 - 0.5u)`), spacing 0.18 of the path.
- Hanging or standing forms sway `sin(1.1*t) * 0.04` rad about their base.
- Needles and wheels step at 12 fps (`floor(t*12)/12`) so they tick like engraved brass.
- Stagger figure appearances 0.12s; arrows 0.35-0.5s each.

## Scene changes
The press pull: the next plate is printed over the last. A vertical front travels left to right across 0.55s with `H.ease.inOutCubic`, from -120px to 2040px; the new plate is clipped to x < front. A roller shadow 180px wide rides the front: a gradient from front-135 to front+45 with stops 0 rgba(60,40,20,0), 0.6 rgba(60,40,20,0.2), 0.8 rgba(255,250,235,0.25), 1 rgba(60,40,20,0). Each scene is a new plate with a new number. Stay on one plate when the idea only adds a figure.

## Finishing passes (run every frame, same strength)
1. Compose the washed tint onto the paper with `multiply` and `filter: blur(1.2px)`. Before it, mask the tint layer with a granulation alpha (`destination-in`): `0.7 + 0.42*S + 0.14*G`, where S is 3-octave `fbm2` noise at about 1/83 cycles per pixel (sampled on a 4.5px grid and interpolated) and G is fine `n2` grit at about 0.23 cycles per pixel.
2. Ink: draw it blurred 1.35px at alpha 0.25 (bleed), then sharp at alpha 0.92.
3. `lighten` fill rgb(38,30,24): the blacks become warm brown-black, with nothing darker.
4. Foxing (cached in the paper) and the plate mark.
5. `H.grain(ctx, t, {strength: 0.045, cell: 2, fps: 12, mono: true})`. Quite visible; it is the paper.

## Sound palette
Define `burin(t0, d, g, pan)`: one `k.noise` grain every 26-46ms (use `H.rng(7)`), each grain `dur: 0.04`, `a: 0.006`, bandpass between 1700 and 2600Hz with q 1.8, loudness `0.13*g` scaled by a random 0.7-1.2; plus one pink `k.noise` bandpass centred at 700Hz (q 1, `0.05*g`) under the whole cut. Define `wash(t, d, g, pan)`: a 40ms pink noise touch through a 1kHz bandpass (q 0.8, `0.16*g`), and `k.play('stroke', t, {dur: d, gain: 1.2*g})`. Pan with x.
- element appears: `burin` over the engrave time (a figure 0.06s, a title 1.0s); a heavy form starts with `k.play('press', t, {gain: 0.2})`.
- label lands: a short `burin` (0.3s, gain 0.8) while the clip opens; no chime.
- arrow completes: `burin` over its draw time, gain 0.8, no extra tone.
- drawing / writing: `burin`, split into 3-4 bursts across a title with slight pan steps.
- scene change: `k.play('paper', t, {dur: 0.22, gain: 0.35})`, `k.play('roller', t+0.04, {dur: 0.5, gain: 0.55})`, three brown lowpass pulses (f 260, 0.22s, gain 0.32) at 25/50/75% of the pull, and `k.play('thud', t+d, {f: 85, gain: 0.25})`.
- wrong / right: wrong is two `wash` slashes (gain 1.4) with `k.play('error', t, {f: 'E3', gain: 0.5})` and a ring `wash`; right is a ring `wash` plus `k.play('success', t, {f: 'F5', gain: 0.55})`.
- counters: a numbering wheel tick, `k.noise` bandpass at 1.5kHz (q 2, 25ms, gain 0.26) plus a 270Hz triangle `k.tone` (35ms, gain 0.06); 4 to 12 ticks per second by the speed; end with `k.play('tock', t, {f: 560, gain: 0.6})` and a low thud.
- key number (biggest hit): `k.play('impact', t, {gain: 1.3})`, `k.play('ding', t, {f: 'C5', gain: 0.45})`, then the ring `wash` 0.02s later.
- takeaway: engraved `burin`, then `k.play('ding', ...)` at F4, C5, A5, 0.08s apart, gain 0.4, 0.33, 0.26.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.35})`, `k.music(0.4, DURATION, {mood: 'calm', bpm: 64, key: 'F', gain: 0.3})`.

## Signature moves
- The print is pulled: the plate appears behind a roller that sweeps across.
- Ink first, then the colour blooms in, offset from the lines.
- Swelling lines that follow a form and vanish in the highlights.
- The colourist's red ring painted around the key number.
- A cartouche with scroll flourishes that holds the counter.
- A title that is cut in left to right, then shrinks to the running head.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Even-width outlines | swelling ribbons driven by shade, contour heavier on the lower right |
| Colour filled exactly inside lines | offset the wash 2.25px, pooled edge, granulation mask |
| Pure black ink | `lighten` to rgb(38,30,24), bleed pass at 0.25 |
| Clean white paper | tone, fibre, foxing, plate mark, grain 0.045 |
| Everything outlined | knock-out and open highlights so paper shows |
| Too many washes | three to four per plate |
| Modern sans type | Cormorant italic for captions, Libre Baskerville for furniture |

## Hero frame recipe
1. Cached paper with toning, foxing, plate mark and frame.
2. Title in Cormorant italic 144px centred near y 190, plus a thin rule under it, "Pl. XXV." top right.
3. One main specimen at the left: an organic form of 3-5 blades plus a stem, knocked out, engraved with 20 iso-lines per blade and a cross-hatch in the shadow, washed in two greens and a rose pool.
4. Three small oval figures in a row at the right with hatched grounds and italic captions (48px).
5. One engraved arrow with a barbed head, label above in italic 48px.
6. A cartouche lower right with a 108px number and a red ring partly painted (1.08 turns).
7. Compose: tint with granulation, ink bleed, lighten, grain 0.045. Check: colour peeks beyond lines by about 2px, highlights are paper-white.
