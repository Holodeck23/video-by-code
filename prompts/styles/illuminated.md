---
id: illuminated
name: Gilded Vellum
family: Illustration
fonts: [Grenze Gotisch, IM Fell English, UnifrakturMaguntia]
best_for: stories told in chapters or stages, cycles and rules, lineages, "how it was learned" explanations, rankings and progress that end in one triumphant number, anything that should feel old, patient and precious
avoid_for: fast tech demos, dense numeric tables, small body copy, topics that need a neutral or clinical tone
---

# Gilded Vellum

The viewer believes a scribe is working a late-medieval prayer-book leaf in real time. Warm, mottled calfskin; iron-gall ink laid by a quill whose tip is always visible; pigment that floods into pen outlines; and raised gold leaf that shares one travelling glint, so every gilt object on the page flashes in the same sweep. Pages turn like leaves in a codex.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (vellum) | #ead9b4 | multiplied by noise, darker toward the edges (see below) |
| Primary ink | #2b1a0f | text, outlines, hairlines; wet ink #100906 for the freshest letters |
| Accent: burnished gold | #68400f, #a26c20, #d09a34, #eec662, #fde698 | ramp stops 0 / .3 / .56 / .8 / 1; bole under it #7c3818; glint peak #fffade; used for the single most important thing |
| Rubric / alarm | #c63b1c, dark #8c2210 | headings, key words, strikes and corrections; rarely more than 15% of the page |
| Lapis | #233f8f, dark #14265c, light #4d6fc2 | big grounds, structure, bar panels |
| Rose | #b45a6c, dark #7a2c3e | the second ground colour, always paired with lapis |
| Malachite (right / result) | #2f7d55, dark #1b4f35, light #5ea67a | ticks, outcomes, leafwork |
| Ochre, cream, white lead | #c8994f, #efe3c6, #f8f1e2 | skin tones, banners, filigree, highlights |

Pigments are flat colours with a dark edge; only gold has a gradient.

## Ground and surface
Cache with `H.offscreen('vellum', 1920, 1080, fn)`; every page is the same cached sheet, mirrored on the back of a leaf.
1. At 960x540, per pixel, lightness `L = 1 + 0.075*fbm(x*0.006, y*0.009, 4) + 0.03*fbm(x*0.035, y*0.06, 3) + 0.018*cockle - 0.13*edge^2`, using `H.noise(41)` and a second field `H.noise(97)`. `cockle` is a slow sine product (x*0.014 plus noise warp, times sin(y*0.01+1.3)); `edge = 1 - clamp(min(ex*7, ey*6))` with ex, ey the distances to the sides as fractions. Colour = #ead9b4 times L, plus a stain field that shifts red +5, green +1, blue -9 and, at the edge, blue another -14. Stretch to 1920x1080 with smoothing.
2. 3200 flecks 1-3px, rgb(95-135, 62-92, 36), alpha 0.04-0.2. 90 follicle triads: three dots (r 1-1.7px) within 6px of each other, rgba(85,58,34,0.25). 26 scraped patches, radius 30-120px, radial: half lighter rgba(250,240,215,0.18), half darker rgba(150,110,60,0.07), fading to 0.
3. Show-through: mirrored ghost lines of blackletter, UnifrakturMaguntia 45px, 13 lines at 66px pitch, rgba(70,44,24,0.02) with 1.8px blur.
4. Ruling, faded in over 0.5 s: hairlines rgba(150,108,72,0.2), 1.5px; horizontals every 66px from y=198 to 975 between x=162 and 1839; four verticals at x=156, 165, 1836, 1845. Pricking holes down x=1881 at the same pitch: dark 2x1.6px ellipse rgba(70,45,25,0.55) plus a cream dot 1.5px below-right.
5. Per frame: gold gradient, then everything else (see below).

## Mark-making
**Shared gold gradient.** Once per frame build one linear gradient from (0,0) to (1920,1080) and use it as `fillStyle` for every gilt shape. Base: a ramp position centred on 0.52 and pushed around by three sines over the gradient length, given as (cycles, amplitude, phase): (8.6, 0.30, 0.5), (21.3, 0.16, 2.1), (47, 0.06, 0.7). Look that position up in the five gold stops and sample at 57 points, so dark brown and near-white bands sit close together. Glint at position `p`: add dense stops (offsets +-0.006 to +-0.05) and mix toward #fffade by `boost*(1.3*exp(-((u-p)/0.015)^2) + 0.25*exp(-((u-p)/0.05)^2))`. Idle glint: p drifts 0.2-0.25 per second, wrapping across a 1.7 range so it is sometimes off the page, boost 0.55. Cued sweeps (an initial, a reveal, the climax): p runs from -0.08 to 1.08 in 0.7-1.4 s at boost 0.8-1.4.

**Gilt shape** (`gilt`), in order: (1) fill with bole #7c3818 casting a shadow, offset (2, 3), blur 3, rgba(60,28,6,0.55); (2) fill with the gold gradient; (3) clip and multiply a 240px burnish tile (value 228 +- 40 fbm and +-11 noise, tinted x0.96 x0.88, nine 1px brown scratches) at 0.45; (4) gesso dome clipped to the shape: screen a highlight, multiply a shade. A boss gets a radial light at (-0.38,-0.42) of its radius (rgba(255,240,185,0.55) to 0.15 at 0.45 to 0) and a lower-right shade up to rgba(110,58,14,0.6). A long bar gets a cross-section ramp across its short axis (0.12, 0.5 at 0.3, 0 at 0.62) plus a shade from 0.6. A ring gets a crest at 42% of its width (0.38) plus an upper-left wash. Skip the dome under 9px and give the shape a cream dot (r*0.28, alpha 0.85, at -0.35r,-0.35r) instead; (5) an inner rim stroke rgba(80,40,10,0.35), 1.8-3px; (6) outline rgba(38,22,8,0.9), 1.5px.

**Gold lettering**: shadow copy in #6a3014 at (+2.4,+3.3); gold fill; overlay rgba(236,168,40,0.5) so it stays rich, not khaki; screen a top-lit gradient from y-0.78*px to y-0.18*px (0.5, 0.12, 0); multiply a foot gradient over the last 30% (0 to 0.45, rgba(150,80,14)); bevel copies at (+d,+d) multiply rgba(140,80,22,0.4) and (-d,-d) screen rgba(255,238,180,0.4) with `d = max(1.2, px*0.012)`; 2px ink outline.

**Pigment fill** (`paint`): flat colour; clip; multiply a 192px granulation tile (236 +- fbm 26, 6% dark specks to -60) at 0.6; stroke the outline in rgba(30,15,10) at alpha 0.3, 6px wide, clipped inside, so edges pool darker. Optional 2px ink outline on top.

**Reveal by flood.** Pigment never fades in. Clip to a wobbly blob grown from a seed point (40 vertices, radius `r*(1 + 0.09 sin(3a+seed) + 0.05 sin(7a+2.3 seed))`, ease-out up to 1.2-1.6x the shape's radius). Ink underdrawing is revealed by clipping to a pie sector sweeping clockwise from 12 o'clock (the pen "goes round"), then colour floods in 0.2-0.4 s later.

**Figures** are lists of [path, colour] layers (gold shapes use `gilt`), each outlined in ink at `max(1.5, 0.033*size)`, then an ink-detail pass for hatching, whiskers, eyes, folds. Volume only on metal: a radial shade (cream 0.35 at the light, clear mid, brown 0.45 at the far rim). Micro-motion: ears, eyes, antennae, gears move on slow sines.

**Quill.** A feather 495px long, tilt -0.98 rad plus 0.04 sin(13t), hand jitter 2.2px at 23 rad/s; gradient #fbf7ee, #e6dccb, #b9ab93; barb hairlines every 10px (rgba(120,100,80,0.45), 1px); shaft #a8916a 3px; nib #1a0f08; a copy offset (27,39) at rgba(60,35,15,0.16) as shadow. Its tip sits at the head of the text being written; nothing else draws a pointer.

## Type and numbers
- Body and labels: Grenze Gotisch 400, 51px on a 66px line pitch, lines wrapped around the big initial (shorter lines beside it, full width below). Headlines 700 at 126px (hero 150px); second-level 114px; labels 54-75px; takeaway 87px. Never below 42px.
- Rubrics: whole words in #c63b1c; a pilcrow before each new thought, alternating vermilion and lapis. Numerals and italic captions in IM Fell English (italic 54px).
- Writing: reveal text with a clip that follows the fractional character count (`H.typeOn` for the count). Each glyph gets a second pass at 0.75px offset, black at 0.22, for ink pooling; letters in the last 1.8em are repainted in wet ink at 0.55 so the nib end is darker. Headlines write at 15-25 characters per second (0.7-1.0 s for a title); a body line sweeps across in about 0.26 s, stepped one line after another.
- Champ initials: a square of 130-300px, split on the diagonal (upper-right lapis, lower-left rose), an inset white-lead box at 4%, 26 white curls and dot triads (arcs of 4.2 rad at radius 3.5% of the square, dots 0.6%) and a gold IM Fell letter at 0.84 of the square. Timeline: ground floods 0.32 s, letter fades in from 0.2, filigree from 0.32. Two or three tendril sprays burst from its corners.
- Key number: IM Fell English 276px, ink, +0.8px black echo for pooling; unit word beside it in vermilion 63px. Counts ease in log space (`(10^(4u) - 1)/(10^4 - 1) * target`), formatted with commas, 10 ticks a second; percentages count in whole numbers.

## Diagrams: arrows, labels, charts
- Arrow: shaft is a cubic `H.bezier`, 4.8px in its colour, drawn on by `H.partial`. Along it, every fourth sample a hairline ink hook (1.2px, 10px high, alternating sides). The head appears only at completion: a barbed, concave fleur 27px long, filled in the shaft colour, 1.5px ink outline. Cycles are the same on arcs, with the head tangent.
- Label: written in Grenze 700 after its object finishes. Cycle stages start with a small champ initial (84px) and finish in Grenze 69px.
- Speech banner: top and bottom edges wave `6*sin(5.5u)`, parchment #f5ecd6 with granulation 0.4, a brown shade strip along the bottom, rolled ends (ellipses 13px wide, #d9c9a4 with an inner #a58c62). It unrolls with ease-out; two ink hairlines run from the speaker.
- Cartouche for a big figure: fill rgba(248,238,214,0.55), vermilion frame 4.5px with a second frame 1.8px at 9px inset, four gold bezants popping on the corners.
- Wrong: a 6.8px vermilion strike, a vermilion double ring (6px and 2px, overshooting its start), the correction written above in vermilion, a 9px malachite tick.
- Chart: ruled vermilion box (4.5px plus 1.8px), hairline gridlines rgba(140,100,66,0.35); bars are gilt (75px wide) with an inset lapis/rose panel and white-lead dots every 24px, a bezant on top, Roman numerals under; an ink progress line above the tops with a fleur head.

## Motion
- Pigment, bezants and pops use `H.ease.outCubic`; shrinks and turns use `H.ease.inOutCubic`. Everything else is writing, on a strict sequence of 0.1-0.5 s items.
- Border (rinceaux) on the first page: stems 1.8px, drawn over 0.45 of the timeline; tendrils 3.6px steps with curvature `curl*(0.015 + 0.2u^2)`, each 39-60px, drawn in 7% windows staggered along the stem; their ends (55% gold bezant r 5-7px with three hairline whiskers, 45% leaf 16-24px in gold, lapis, vermilion, malachite or rose) pop with ease-out in the next 5%.
- A hook headline starts large and centred, then shrinks to 0.4 scale into a running head at the top-left in 0.6 s.
- Idle life: the gold glint drifts, the quill jitters, marginal creatures and gears turn slowly, a creature walks at 3px/s. Nothing else moves; the camera is locked.

## Scene changes
Turn the leaf; never cut. A fold line tilted 0.32 rad sweeps right to left over 0.7-0.8 s (inOutCubic, fold point from x=W+570 to x=-630). Render outgoing and incoming pages to two scratch canvases each frame. Clip the outgoing page to one side and the incoming page to the other, with a fold shadow on the incoming page (rgba(50,28,10,0.45) to 0 over 210px). The flap is the outgoing page reflected about the fold, drawn as a blank verso: fill rgb(226,208,170), the vellum at 0.9, the page ghosted at 0.1, shadow blur 45 rgba(40,20,5,0.45), plus a highlight near the fold. The new page arrives with ruling on and border mostly drawn. Alternate recto and verso.

## Finishing passes (run every frame, same strength)
1. The shared gold gradient with idle or cued glint, set before any gilt draw.
2. Warm vignette: `H.vignette(ctx, {strength: 0.26, color: '#3c230a', inner: 0.55})`, so the corners go brown.
3. Optional, very faint: `H.grain(ctx, t, {strength: 0.012, cell: 2, fps: 12, mono: true, blend: 'multiply'})`.
Nothing else: no glow on the ink, no drop shadow under text.

## Sound palette
- element appears (pigment): `k.play('stroke', t, {dur: 0.16, gain: 0.6})`, panned toward the shape.
- label lands: one quill stroke per word (below), plus a gold shimmer for initials.
- arrow completes: quill stroke the length of the shaft, then `k.play('tock', t, {f: 520, gain: 0.35})`.
- drawing / writing: quill = three layers per stroke of length `d`: a 20 ms bandpass `k.noise` tick at 2 kHz (`q: 1.3`, `gain: 0.1`, `a: 0.002`) for the nib landing, `k.play('stroke', t, {dur: d, gain: 1.0})` for the scratch, and a quiet pink-noise body underneath (`color: 'pink'`, bandpass near 1.6 kHz, `q: 0.8`, `gain: 0.05`, same length). Text: one quill stroke per word, timed by its position in the write window; mark the quiet ones `minor`.
- gold shimmer (laid or burnished): two pink bandpass noises at f 700 and 1250, `a` = 0.4 of the length, gain 0.09, over 0.3-0.6 s; two soft sines `k.tone(t, {f: 'A4', dur: d + 0.7, gain: 0.022, a: d * 0.5})` and the same at `'E5'`, gain 0.014.
- scene change (leaf): `k.play('paper', t0, {dur: 0.65, gain: 0.6})`, two lowpass pink-noise swells (`gain: 0.14`, `a: 0.3`) at f 450 then f 1100 for the lift and the sweep, and `k.play('slap', t1 - 0.06, {gain: 0.22})` as it settles.
- wrong: strike as a loud `stroke` (gain 1.6) with `k.play('thud', t, {f: 120, gain: 0.38})` and two triangle tones at 'D3' and 'G#3', dur 0.45, gain 0.12. right: `k.play('success', t, {f: 'D5', gain: 0.4})`.
- key number: ticks `k.play('tick', t, {f: 2100 + 4*value, gain: 0.8})` while it counts, then `k.play('thud', t, {f: 85, gain: 0.75})`, a bell (below) and a shimmer at gain 1.6.
- takeaway: a lower bell at 'G3' as the last word lands.
- bell: five sine partials at ratios 0.5, 1, 1.2, 1.5, 2 of the root (D4 = 294 Hz), gains 0.11, 0.15, 0.07, 0.05, 0.08, decays 3.2 to 1.4 s, `a: 0.004`; add a 30 ms bandpass tick at 1400 Hz.
- bed and music: `k.bed(0, D, {kind: 'room', gain: 0.45})`, `k.music(0, D, {mood: 'calm', bpm: 48, key: 'D', gain: 0.3})`, a monastic drone.

## Signature moves
- Gold leaf laid square by square in a diagonal wave (each square grows from its centre in 0.18 s), then the whole panel gets one sheen.
- One glint crossing every gilt object at once.
- Pigment flooding into the ink outline from a point, not fading.
- The quill tip riding the line being written, wet letters darker.
- The leaf turn with a flap showing blank verso.
- The key number crossfading from ink to gold, ringed in rubric, with rays of glory (24 rays: gilt triangles, r 225 to 330px, alternating with wavy ink lines at 60% length, squashed y x0.72) and a 0.7 s `lighter` burst.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Gold is yellow with a linear gradient | one irregular multi-sine ramp, bole shadow, dome light, burnish tile |
| Parchment is flat beige | noise lightness, edge darkening, flecks, follicles, show-through |
| Colour fades in | flood by wobbly clip; ink first, colour after |
| Text appears whole | clip to character count, wet-ink tail, quill tip |
| Page turn is a slide | tilted fold, reflected blank flap, fold shadow |
| Too many glints at random | one shared gradient, a cued sweep per key moment |
| Modern icon shapes | arrowheads as barbed fleurs, ticks and rings hand-drawn, no rounded-rect cards |

## Hero frame recipe
1. Cached vellum sheet, ruling at 100%, pricking holes, border at p=1 with tendril ends.
2. Champ initial 300px at (186,156): diagonal lapis/rose, filigree, gold letter; two tendril sprays from its corners.
3. Headline beside it in Grenze 700 126px: first words vermilion, the rest ink, at y about 300 and 440, x=732.
4. A body block in Grenze 51px, 66px pitch, wrapped around the initial; one word vermilion; pilcrow in lapis.
5. A roundel of radius 120px lower left: gilt ring, lapis ground with white dot stars, a figure with ink outline and flat pigment.
6. A penwork arrow to a cartouche carrying a 276px ink number.
7. Set the gold gradient with glint at p=0.5 before any gilt shape; quill at the last written letter; vignette.
