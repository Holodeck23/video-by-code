---
id: papercraft
name: Papercraft Kit
family: Paper & craft
fonts: [Fredoka, Space Mono, Space Grotesk]
best_for: how-things-are-built explainers, systems made of parts, guess-check-adjust loops, growth in steps, friendly technical topics
avoid_for: fast kinetic montage, photographic or gritty tone, long paragraphs of text, anything that needs fluid or organic motion
---

# Papercraft Kit

The viewer believes they are watching a printed cardstock kit being assembled on a green self-healing cutting mat, shot in stop-motion on twos. Every object is a flat printed net that folds itself into a boxy model, and carries dotted fold lines, glue tabs and a thin gap at one seam. One warm key light shades each face differently, and the camera slides over a single long mat.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Card stock (front) | #f5f0e4 | every printed face base |
| Card back | #e8e0cf | unprinted reverse of a face |
| Glue tab | #ece5d4 | tab hatching in #e3dac6 |
| Mat top | #2d6c4e | cutting-mat vinyl; its rolled lip is #23573f |
| Desk beneath | #a8754c | walnut, only visible past the mat edge |
| Primary ink | #22252d | text on cards, outlines on prints |
| Structure / system | #2f6db3 | deep shade #1f4f8a; the thing being explained |
| Input / source | #ee6b2d | things that go in; underline bars on cards |
| Quantity / path | #f4b630 | counters and arrow strips |
| Alarm / wrong | #d83a2e | the wrong guess and the correction path; rarely |
| Right / result | #2e9a57 | the flag that flips, the final score; the single most important thing is landed in this colour |
| Secondary | #279c8e, #ea8a39, #f7e6c8, #c3c8cd | chart variety, cream trim, steel tools |

One colour per meaning, held across the video. Printed faces never use a gradient; only the lighting pass shades them.

## Ground and surface
Units: 1 world unit = 1 cm. The mat is 290 x 100 cm; the camera slides along it. Cached steps (bake once with `H.offscreen('mat', 2500, 1500, fn)` at 5 px per cm; `H.rng(77)` for every scatter):
1. Desk: rows 2px tall along x, colour rgb(168,117,76) times `1 + 0.22 * noise` (`H.noise(31).n2`, slow plus fine octaves). Planks 19 cm wide alternate +8/+5 in red/green. 260 long grain strokes (0.6-2px, alpha 0.05-0.14, half dark rgb(70,40,20), half light rgb(230,190,140)). A dark seam line (alpha 0.45) at each plank edge.
2. Mat: soft shadow (blur 10px, rgba(20,10,0,0.55), offset 6,8), lip #23573f, body #2d6c4e with 12px rounded corners.
3. Inside the mat clip: 520 mottles (radius 20-120px, alpha 0.03-0.09, half light rgb(120,190,150), half dark rgb(10,40,25)); 9,000 one-pixel specks at 18-20% alpha; 420 healed knife cuts (30-380px, 0.5-1.2px, alpha 0.08-0.2; 60% on 0, 45 or 90 degrees within 0.03 rad, rest free; mostly pale, 30% dark).
4. 46 paper offcuts in the palette colours (triangles and slivers, 0.35-1.0 cm), each with a 35% dark shadow offset 2px.
5. Numerals every 5 cm along the far and left edges: Space Grotesk 700, 1.7 cm tall, rgba(214,232,180,0.75).

Per frame the floor is drawn in perspective by scanlines: for each pair of screen rows 2px apart, find the mat depth they hit and blit the matching strip of the baked texture, stretched to full width. Then draw the live grid in projected lines: 1 cm lines rgba(205,230,170,0.2) at 1.35px, every 5 cm rgba(222,238,184,0.42) at 2px, and 45-degree guides every 50 cm at alpha 0.22. Finally, depth of field: a half-resolution blurred copy of the frame (blur 3px) is masked by a vertical alpha ramp (1 at the top, 0.6 at 36%, 0 from 55% to 85%, 0.65 at the bottom) and laid back over it.

## Mark-making
There are no strokes. Everything is a printed face in a small 3D face engine. Build it on plain canvas maths, no helper needed.

**Face.** An origin, two edge axes, a flat polygon (in cm), a front colour, an optional back colour and a print function drawn at 10 print px per cm. At the standard framing 1 cm is about 23 screen px, so 1 print px is about 2.3 screen px. A child face hinges on a parent edge: its angle runs from 0 (flat template) to 90 degrees (standing). Projection: a camera with focal length 1500 px, elevation 0.55 rad above the mat, no roll, no yaw.

**Box from a cross net.** Four walls hang off the top face and fold down in a staggered sequence: wall i opens its angle by `90 * ease(clamp((f - 0.09i)/0.62))`, with f the fold progress. Side tabs (trapezoids, hatched at 3.2px spacing, rgba(120,100,70,0.35)) fold under with a delay (window 0.12 to 0.7). The bottom closes last (0.72 to 1). The top rises by `1.4 * sin(pi * f)` cm mid-fold, so it hops while folding. Leave one wall 4-7% short of closed after f = 0.85 for a hairline seam gap. Fold times: large body 0.8-1.2 s, small box 0.4 s.

**Tent card.** Two panels meeting at a fold line with 1.1 cm feet, standing at 64 degrees (1.12 rad). It folds up in 0.55-0.65 s. Use it for titles, tags, counters and banners. Titles are 30-40 cm wide, tags 11-13 cm by 6 cm.

**Print on a face.** Card base, a colour band across the top 17% with a row of white 70% perforation dots (r 0.9, every 7 print px), the word or number, a tiny Space Mono part number (4-9 print px, 55% ink) in a corner. On any hinged face, a dotted fold line 1.2 print px inside the hinge: rgba(60,45,30,0.42), 0.9px, dash 4 on 3.5 off.

**Paper fibre.** A 256px tile cached with `H.offscreen`: 2,200 curved hairs 2-9px long (alpha 0.05-0.16, 30% warm rgb(150,120,90), else rgb(120,115,105)) and 2,500 specks (alpha 0.04-0.12). Multiply it over every face at 90%, pattern scale 0.45, offset per face group so adjacent faces never tile in step.

**Lighting per face.** Key light direction (-0.55, 1.0, -0.5) normalised. With `lam = max(0, n.L)`, shade `s = 0.6 + 0.08 * n.y + 0.52 * lam`. If s < 1, multiply by a warm tint (r = s*(1+0.05 lam), g = s*0.985, b = s*(0.94+0.1(1-lam))). If s >= 1, instead screen-blend a warm cream (255,232,195) at alpha 0.7 times (s - 1). Walls that touch the mat get ambient occlusion: a gradient from rgb(90,100,90) at the mat to white 2.5 cm up, multiplied at 45%. Outline every face with a pale cut-edge line, colour (255,247,230), alpha `0.22 + 0.4 * lam`, 1.6px wide, round joins.

**Sort and shadows.** Flat pieces first, then shadows, then standing faces sorted far to near (back faces of closed solids are skipped). Shadow: project each model's vertices along the light onto the mat and fill the convex hull on a half-resolution layer in #06140c, then draw it at 42% with blur 10px; add a tight contact shadow (the lowest vertices offset 0.25, 0.35 cm; blur 3px, 50%).

**Stop-motion.** Quantise time for every model: `q = Math.floor(t * 12) / 12`. At each tick nudge each model by `H.rng(id * 977 + tick * 13)`: +-0.04 cm in x and z, +-0.005 rad of yaw. Models hold still between ticks. The camera is not quantised.

## Type and numbers
- Fredoka 700 for words, 600 for secondary lines; Space Mono 700 for kit labels; Space Grotesk 700 for ruler digits.
- Headline on a tent card: 50-58 print px (about 115-130 screen px), split into two colours at the key word. Tag word: 30-34 print px (about 70-78 screen px, never below 42). Key number: 58-66 print px (about 135-150 screen px, at least 96).
- Small caption bar on each card: Space Mono 8-9 print px in white on a colour band, uppercase, e.g. a kit number and "fold on dotted line".
- Text never fades: it is printed on the card, so it appears when its card folds up or drops.
- Numbers live on tent cards and are re-posed on the 12 fps tick: each change is a new print. Counts ease in log space over about 1.4 s (`10^(6u)`), thousands separated by commas; a percentage steps through its values as bars rise. The final value turns green with a tick mark (stroke 0.22 of its height, round caps).

## Diagrams: arrows, labels, charts
- Arrow: a strip of coloured card 2.2-2.6 cm wide lying on the mat, with an accordion of 3 cm segments alternating crease height 0.07 and 0.55 cm, a flat triangular head 2.8-3.4 cm long and 1.15 times the strip's half-width. It unrolls by arc length over 0.5-0.6 s. Print: solid colour with a white 45% dashed centre line (3 on, 3 off).
- Label: a tent tag dropped from 10 cm above, landing beside the object it names. Fall height `h * (1 - u^2)` over 0.25 s.
- Counter or score: one tent card per quantity, 22-30 cm wide, with a colour band and a caption.
- Chart: boxes of equal footprint (4.6 cm) with heights from the values, each folded up in 0.4 s at 0.24 s spacing, on a base card with an ink baseline. A flat card face carries the value.
- Wrong: a pole in a cube base, with a two-sided flag. The red face (white cross) pops in with `H.ease.outBack` and a 30 Hz wobble of 6% for 0.25 s. Later the flag spins 180 degrees to its green face (white tick).

## Motion
- Easing: `H.ease.inOutCubic` for folds and slides, `H.ease.outBack` (about c = 1.9) for small parts snapping in, linear in arc length for strips.
- Camera keyframes `[time, x, z, distance, elevation]`; the camera orbits nothing, it only slides. Distance 46-86 cm, elevation 0.5-0.63 rad. Hold 1-2 s on a work area, then slide 0.7-1.0 s with `H.ease.inOutCubic` to the next. For the wrong guess, push in from distance 70 to 46 over 0.4 s, hold, then ease back.
- Parts hop: a lifted part follows `lerp(a, b, u) + sin(pi*u) * 7` cm in height over 0.35 s.
- Between beats nothing is truly still: stop-motion jitter, grain, and a slow drift of the key-light pool keep the frame alive.

## Scene changes
Slide, do not cut. The camera glides along the mat while the next beat's net lies flat in front of it, then folds up on arrival. A previous model stays where it stood and slides out of frame; a card that no longer matters is laid flat (tent angle back to 0 over 0.35 s), then slid off sideways in 0.5 s. Use a push-in only for a mistake. Stay in one framing when the new idea extends what is already built.

## Finishing passes (run every frame, same strength)
1. Key-light pool: radial gradient centred (0.38W, 0.35H), inner radius 60px, outer 0.75W, rgba(255,214,150,0.16) to 0.04 at 0.6 to 0, composited with `soft-light`.
2. `H.vignette(ctx, {strength: 0.42, color: '#140c04', inner: 0.55})`.
3. `H.grain(ctx, t, {strength: 0.03, cell: 2, fps: 12, mono: true})`. Grain shifts on the same twos as the models.
4. Depth of field and shadows as described under ground and mark-making; they run per frame.

## Sound palette
Cardstock on vinyl: every cue time is snapped up to the 1/12 s grid. Pan follows the object's screen x, at most +-0.6.
- element appears (fold): bend as pink bandpass `k.noise` (f 700, q 0.7, gain 0.08, a = half the fold time) plus 3-4 crease hits (below) spaced across the fold.
- crease (the core hit): `k.noise` bandpass f 2600 dur 0.014 gain 0.22, then bandpass f 1500 q 1.1 dur 0.03 gain 0.5, then brown lowpass f 480 dur 0.06 gain 0.38.
- label lands: a tap, `k.noise` brown lowpass f 650 dur 0.045 gain 0.4 plus bandpass f 1100 dur 0.018 gain 0.12, at touchdown.
- arrow completes: scrape (bandpass f 1300, gain 0.07, dur = unroll time) with a crease at every accordion step, ending on a crease gain 0.6.
- drawing / writing: none; text is printed. Counter ticks are card flicks: `k.noise` bandpass f 1700 q 1.6 dur 0.02 gain 0.24, thinning from 12/s to 6/s near the end.
- scene change: slide as brown lowpass `k.noise` (f 280, gain 0.1) over the slide length.
- wrong: `k.play('thud', t, {f: 110, gain: 0.85})`, `k.play('slap', t + 0.01, {gain: 0.35})`, then triangle `k.tone` D3 (0.18 s) and A2 (0.36 s) at gain 0.16.
- right: `k.play('success', t, {f: 'G5', gain: 0.22})` plus a crease as the flag lands.
- key number: `k.play('impact', t, {gain: 1.25})` and `k.play('ding', t + 0.01, {f: 'E5', gain: 0.55})`.
- takeaway: three `k.play('ding', ...)` at C4, G4, E5, 0.1 s apart.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`.

## Signature moves
- Flat net folds into a model on twos, walls staggered 0.09 apart, with a hop mid-fold.
- A part is set down from 10-14 cm and lands with a tap.
- Strip arrows unroll in accordion creases along the mat.
- Numbers are tent cards that are re-posed, never counted smoothly.
- The red flag pops after a push-in and spins to green later.
- Flat sheets with the net's shape cut out of them, mat showing through.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Faces are flat colour with no shading | run the per-face lighting, fibre and cut-edge line on every face |
| Models slide smoothly | quantise to 12 fps and jitter each tick |
| Box edges are perfectly sealed | one wall stays 4-7% open, seam shows |
| Mat is a flat green rectangle | cached mottle, healed cuts, offcuts, perspective grid and depth of field |
| Shadows are black blobs | wide soft hull at 42% plus a tight contact shadow |
| Text fades or typewriters in | text is printed on cards; cards fold or drop in |
| Camera swings or rolls | slide only; no roll or yaw |

## Hero frame recipe
1. Bake the mat (desk, mat, mottle, cuts, offcuts, numerals), then draw it in perspective at elevation 0.55, distance 66, with the 1 cm and 5 cm grid and the depth-of-field ramp.
2. Place a tent title card (40 x 15 cm, blue band, 56 print px two-colour headline) standing at the back left.
3. In the middle, a box model 14 x 11 x 12 cm, fully folded, one wall 7% open, a smaller head box hopped on top, with a blue chest print and an orange band.
4. One yellow strip arrow curving to it; one tent tag (12 x 6 cm, 32 print px word, orange band) beside the item it names.
5. Props at the edges: a ruler, a craft knife and a glue stick.
6. Shadows, lighting and fibre on each face, then the key-light pool, vignette (0.42) and grain (0.03).
7. Check: faces must differ in brightness by direction, seams must show hairlines, and nothing should look perfectly smooth.
