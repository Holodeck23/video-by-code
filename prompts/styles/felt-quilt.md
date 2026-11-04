---
id: felt-quilt
name: Felt and Patchwork
family: Paper & craft
fonts: [Fredoka]
best_for: friendly explainers, networks of connected things (buttons as nodes, thread as links), processes with a few big steps, learning and growth stories, children's or community tone, anything that should feel handmade and warm
avoid_for: dense data, precision engineering, anything cold, urgent, corporate or high-tech; long text blocks
---

# Felt and Patchwork

The viewer believes the whole explanation is sewn onto one long patchwork quilt. Cut felt shapes with fuzzy edges are dropped onto printed cotton, outlined in blanket stitch, tied together with running-stitch thread, and held by sewn-on buttons. The quality that sells it is softness: every contact has a dull cushioned shadow, every edge has fuzz, and the padding under the cotton slowly swells and relaxes.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (quilt prints) | #c9634d #e2b24a #8fae84 #d98f86 #5f7ea3 #e9dcc2 #6f9a8a #b9563f | eight print bases; pair each with a pale partner (#f3eadb, #f7efdc, #eee4cf, #f6d9cf, #8aa3c2, #d8c8aa, #f1ecdf, #f1d4bf) |
| Quilt mute | #d6c8b2 | every print is mixed 30% toward it so felt stays louder than the cloth |
| Cream felt / label cloth | #f3ecdc | backing plates, tags, speech shapes |
| Primary felt (blue) | #2f5f9a | main word colour on cream, structures |
| Accent (coral) | #d9564a | the one key number or object, nothing else |
| Mustard / sage / pink | #e8b04a / #6fb3a6 / #ef9aa6 | secondary felt and buttons |
| Thread: cream / gold | #f4ead2 / #f2c14e | blanket stitch, quilting, orbit lines |
| Thread: red | #c8443a | links, arrows, wrong-answer X, tag borders |
| Right / result | #4f9a52 | check stitch, "landed" values |
| Ink | #3d3548 | axis thread, dark text |
| Shadow | rgb(40,20,10) | warm brown, never black |

## Ground and surface
1. Cotton grid: patches 240px square (offset the grid by -45px vertically). Choose a print per patch from the eight, never repeating a left or upper neighbour. Print recipes (px at 1920): gingham 21px checks, shade = both axes dark / one axis 55% mix / none; dots on a 30px lattice, every other row shifted 15px, dot radius 6.7px; stripes period 27 (10.5 print, 3 mix, 13.5 pale); floral on a 39px lattice with a #fff5e6 centre (r 3.4) and four pale petals (r 4.2 at 6px); denim as diagonal 7.5px bands; linen flat. Warp each print's coordinates by up to 1.8px using `H.noise(21)` (`n2` at 0.02 cycles per pixel, a second sample offset by 9 for the other axis).
2. Weave: bake per pixel in 4px cells, alternating over and under: +5% on the line of the cell, -2% elsewhere, -6% at the cell's corner pixel, plus random +-3%.
3. Padding: let `e` be the distance to the nearest patch edge, `u, v` the offsets inside the patch. Lit term `A = (0.95 + 0.08*((120-u)+(120-v))/240) * (1 - seam)`, sink term `B = 0.36*exp(-e/21) * (1 - seam)`, seam `= 0.45*exp(-e*e/5.6)`. Final shade `A - B*breathe`.
4. Uneven light: multiply by `0.9 + 0.1*fbm2` from `H.noise(77)` at about 1/450 and 1/290 per px, 3 octaves, sampled every 12px and interpolated.
5. Quilting thread: running stitches in #f4ead6 along every seam, 13.5px inside the edge, dash 15px, gap 10.5px, 3.6px wide (see Mark-making).
6. Cache: bake `base * A` once as a strip 3840px wide for a panning quilt (sample noise on a cylinder so the wrap has no seam; draw it twice offset by `cam % 3840`). Bake the sink term as a black layer with alpha `B/A`. Per frame draw it at `globalAlpha = 1 + 0.12*sin(t*1.4 - 1.5)` so the edges deepen and soften slowly.

## Mark-making
**Felt piece** (cached sprite per shape): polygon filled flat, then
1. Fuzz: walk the outline every 2.4px; at each step a hair 0.75-3.9px long in the felt's own colour, 0.75-1.65px wide, starting 2.25px inside, pointing outward with a twist of +-0.8.
2. Felt grain (`source-atop`): a 384px tile built once with `H.offscreen`: half the pixels white or black at alpha `|n-0.5|*0.27`, plus 1400 curved hairs 3-10px long, 0.6-1.35px wide, 50% white alpha 0.08-0.2 and 50% black 0.08-0.18, wrapped at the 9 offsets. Random pattern offset per sprite.
3. Soft rim: blur 4.5px, stroke the outline 10.5px wide in rgba(0,0,0,0.22) inside the shape, then shift (-3,-3) and stroke 6px in rgba(255,255,255,0.12). Dark soft edge, light top-left shoulder.
Details (an inset stitch rectangle, a face, a vein) go on top as thread.

**Felt letters**: Fredoka 700. Draw a darker edge first (stroke 4.5px, the colour at 60% brightness, alpha 0.6), then fill 26 times at alpha 0.18, each pass jittered by `r.gauss()*2.1`px, then once solid; apply the grain; shade with a blurred (3.75px) stroke rgba(30,15,5,0.3) and a light stroke rgba(255,250,235,0.22) shifted (-2.25,-2.25). For contrast, put the word on a backing felt: the same glyphs dilated by `0.14*px` through 18 jittered passes at alpha 0.2, grained, with a darker inner band (rgba(70,45,25,0.42), blur 3px), and let the top layer cast a small shadow (blur 6, offset (2.25,3.75), alpha 0.45).

**Thread stitch** `stitch(a, b, colour, w)`: shadow line first (rgba(40,25,15,0.38), width `w+1.8`, offset (1.2,1.8)); body in round caps with a gradient along its length (colour at 65% brightness, then `1.1x + 10` at the middle, back to 65%); one white hairline 1px at alpha 0.35 along 20-70% of the length, nudged half a pixel off axis; two dark pin-holes (r 1.65, alpha 0.45) at the ends where it enters the cloth.
- Running stitch: alternating drawn and skipped segments (dash 15-21px, gap 10.5px), each drawn as its own `stitch`; reveal by cumulative path length `u`.
- Blanket stitch around an outline: every second outline point a spoke from 22px inside to 3px outside the edge, plus a short link from the previous outer point to this one. Outline wobble: radius `* (1 + 0.02*n2)`.
- Satin stitch (X marks, check marks, heavy words): a 19.5px band; shadow (blur 2.25), an underlay at 55% brightness, then slanted stitches every 3.15px across the band at 35% of the width: dark 3.5px, light 1.8px shifted (-0.6,-0.9), a white 0.9px highlight on the upper half.

**Buttons**: radius 22-45px. Radial gradient from (-0.35R,-0.4R): colour `1.25x + 20`, 0.7 stop the colour, edge 70%. Shadow blur 12, offset (4.5,7.5), alpha 0.5. A dished ring at 0.72R (2.25px, colour at 60%, alpha 0.6), four holes at (+-0.24R, +-0.24R) radius 0.09R, thread crossing as an X (cream on red or pink, red on others), a white glint ellipse at (-0.45R,-0.5R) 0.18R x 0.08R tilted -0.6. Two-hole variant: a single bar.

## Type and numbers
- Fredoka 700 only. Headline 150-174px (never below 99px), felt letters on a cream plate, spaced +9px, each rotated +-0.06 rad.
- Labels are woven tags: cloth #f3ecdc, width = text width + 1.4 * px, height `1.75 * px`, font 42-69px (never below 42px) in satin-stitched ink (diagonal alternating hairlines every 3px, white 0.28 / rgba(0,0,30,0.25)). Twill lines every 4.5px at rgba(120,100,70,0.12); two red bars (3.75px) near top and bottom; folded-under ends as 18px gradients rgba(90,60,30,0.3) to 0; stitched down at both ends with 9px red stitches.
- Counter: 144px felt digits on a navy plate (#2f4f7a), each digit its own sprite, advance minus 9px; a digit change re-cuts the sprite, never cross-fades. Count follows `u^2`.
- Key number: 195px felt on a cream backing; blue while moving, coral when landed; on landing it bounces `1 + 0.18*sin(pi*u)` over 0.35s.

## Diagrams: arrows, labels, charts
- Arrow: a running-stitch shaft (red, 21px dash, 10.5px gap, 5px wide) along a quadratic curve, sewn on by length; when finished add two head stitches 36px long at +-2.5 rad.
- Link between buttons: the same stitch along a curve whose control point is lifted 42-66px; stagger starts by 0.6 of a link's duration so the net knits itself.
- Label: a tag dropped 12-20px from the thing it names, tilted +-0.05 rad.
- Emphasis ring: a wobbly ellipse in blanket stitch, red, sewn around the thing over 0.5s.
- Wrong: a satin X (two 120px diagonals, 21px wide), second stroke 0.1s after the first. Right: a satin check in #4f9a52.
- Chart: axis as dark running stitch; bars are felt rectangles 93px wide, 135px pitch, height = value x 5.4px, alternating mustard and sage, final bar coral, an inset 12px cream stitch rectangle on each; a ten-point felt star (radii 90/39px) on the peak.
- Changing a button's value (a dial, a setting, a weight): rotate its thread X by 1.1-1.6 rad over 0.7s with `H.ease.inOutCubic`.

## Motion
- Drop-on: 0.45s. `u = H.prog(t, st, st+0.45)`, `lift = 1 - H.ease.outQuad(u)`: scale `1 + 0.14*lift`, y `-45*lift`, alpha `min(1, 5u)`, shadow blur `15 + 39*lift`, offset `(6 + 27*lift, 9 + 39*lift)`, alpha `0.45 - 0.2*lift`. From u 0.45 to 1 squash `0.04*sin(pi*(u-0.45)/0.55)` wider and shorter. It touches down at `st + 0.2`.
- Buttons pop on with `H.ease.outBack` from scale 0.15, 0.35s, 0.07-0.1s apart.
- Thread is sewn by length at a steady pace (about 0.12s per stitch); never fades in.
- Pieces riding a stitched path move at about 960px/s, bob by rotating `sin(t*6+i)*0.03`, and shrink to nothing over the final 195px as the target takes them in.
- Camera: pans 0.7s with `H.ease.inOutCubic`, distance about 1900px; the quilt breathes in between (see Ground). The header tag shrinks to the top-left corner after the first pan.
- A wrong answer shakes sideways `sin(t*70)*10`px for 0.45s.

## Scene changes
Pan along the quilt; the new station is simply the next stretch of cloth. Each station keeps its own drops. For a hard change, pull the old pieces up (reverse of the drop, 0.3s, shadow growing) before the pan starts. Stay continuous when the next idea builds on what is sewn down.

## Finishing passes (run every frame, same strength)
1. Studio light: `soft-light` radial gradient, centre drifting `(570 + t*15, 285)` r90 to (900,540) r1350, stops 0 `rgba(255,245,220,0.6)`, 1 `rgba(30,20,10,0.62)`.
2. `H.vignette(ctx, {strength: 0.5, color: '#231409', inner: 0.55})`.
3. `H.grain(ctx, t, {strength: 0.025, cell: 2, fps: 12, mono: true})`.

## Sound palette
Define `fump(t, g, pan)`: `k.noise(t, {pan, a: 0.006, color: 'brown', dur: 0.09, f: 420, filter: 'lowpass', gain: 0.42*g})`, a thin `k.noise` pink bandpass (f 700, q 0.8, dur 0.05, gain 0.1*g) and `k.tone(t, {pan, gain: 0.12*g, glideTo: 70, f: 120, dur: 0.09})`. Define `pass(t, g, pan)`: a 25ms bandpass noise (gain 0.26*g, centred at 800Hz with q 1.3), then 0.03s later a 0.08s bandpass noise (f 1100, q 0.9, gain 0.15*g). Pan with the piece's world x.
- element appears: `fump` at the landing moment (`st + 0.2`), gain 0.5-1.3 by size; buttons: a `tock` at 520Hz (`k.play('tock', t, {gain: 0.8, f: 520})`) plus a brief brown noise.
- label lands: `fump(t, 0.55, pan)`; no chime.
- arrow completes: sewing, one `pass` every 0.115-0.135s across the draw time, gain 0.6-0.75.
- drawing / writing: same `pass` loop; felt letters are one `fump` each, at least 0.09s apart, gain 0.55, panned left to right.
- scene change: `k.noise` pink bandpass (f 500, q 0.6, gain 0.1) and brown lowpass (f 280, gain 0.075), both as long as the pan; `a` = 45% of it.
- wrong / right: wrong is a thread yank `k.noise` (bandpass f 1100, 0.2s, gain 0.32), `k.play('thud', t, {f: 110, gain: 0.6})`, `k.play('error', t, {f: 'D3', gain: 0.4})`; right is two `pass` calls 0.12s apart plus `k.play('success', t, {f: 'G5', gain: 0.45})`.
- counter: brown lowpass tick (f 600, 0.04s, gain 0.3) plus a 20ms bandpass (f 1100, gain 0.1), spacing 0.15s down to 0.09s; ends with a heavy `fump`.
- key number (biggest hit): `k.play('impact', t, {gain: 1.55})`, `k.play('ding', t, {f: 'E5', gain: 0.6})`, `fump(t+0.2, 1.6)`, a button tock.
- takeaway: `fump(t, 1.3)`, then `k.play('ding', ...)` at C4, G4, E5 from +0.32s, 0.09s apart, gain 0.38, 0.35, 0.32.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.4})` and `k.music(0.2, DURATION-0.2, {mood: 'calm', bpm: 62, key: 'C', gain: 0.22})`.

## Signature moves
- Felt drops with a lifted shadow and a soft squash, landing as a dull fump.
- Blanket stitch sewn round a shape, spoke by spoke.
- Buttons joined by a net of red running stitch that knits itself.
- A digit counter whose felt tiles are re-cut.
- A button whose thread X rotates when its value changes.
- The quilt breathing: seams deepen and relax under the whole scene.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Shapes look like flat vector blobs | fuzz hairs, grain, soft rim, drop shadow in brown |
| Thread is a plain dashed line | per-stitch shadow, gradient body, pin-holes, sewn on by length |
| Cotton looks like wallpaper | weave cells, seam sink, uneven light, 30% mute |
| Print competes with the felt | muted prints, saturated felt, cream plates behind words |
| Black shadows | rgb(40,20,10) |
| Pieces fade in | drop with a lift and squash |
| Text on busy cloth is hard to read | felt letters on a cream felt plate, or a woven tag |

## Hero frame recipe
1. Bake the cotton: eight prints, 240px patches, weave, padding, uneven light, quilting stitch.
2. A large felt blob (organic outline, 400px across) in blue, with fuzz, grain, soft rim, brown drop shadow.
3. Blanket stitch around it in cream (22px spokes), a few smaller felt shapes (a heart, a star, a leaf) with inset stitches.
4. Five to nine buttons of 22-45px linked by red running stitch curves.
5. A woven tag with satin text (54px) tilted -0.05 rad at the lower right.
6. Studio light, vignette, grain at 0.025.
7. Check: shadows soft and warm, the fuzz visible at 100% zoom, stitches have holes at both ends.
