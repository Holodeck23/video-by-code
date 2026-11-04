---
id: napkin-sketch
name: Felt-Tip on Tissue
family: Hand-drawn
fonts: [Permanent Marker]
best_for: pitches, ideas worked out quickly, startup and money topics, problem-to-solution stories, "I worked this out over coffee" explanations
avoid_for: precise data, technical documentation, formal or institutional tone, anything that needs the viewer to trust exact numbers to the decimal
---

# Felt-Tip on Tissue

The viewer believes someone is scrawling an idea with a fat black felt-tip pen on a quilted paper napkin lying on a warm wood-plank table in a cafe. The ink soaks into the tissue and grows a soft furry edge while the sheet stays slightly crumpled and creased; when a napkin fills up, a fresh one is slapped on top of the pile. The one quality that sells it is ink that visibly bleeds into paper fibres.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (table, base) | #764a2a | per plank tint +-12 levels; plank joints darkened to 35% |
| Napkin tissue | #f6f5f0 | warm off-white, never pure white |
| Primary ink | #16141c | every stroke, word and number by default |
| Accent / alarm (red pen) | #c41c24 | wrong guesses, the adjust loop, emphasis rings, the key number; the only second colour |
| Emboss shadow | #8f8a80 | 35%, offset (1.7, 2) px |
| Emboss highlight | #ffffff | 90%, offset (-1.5, -1.7) px |
| Crease shadow | rgb(70,64,58) | alpha from slope |
| Coffee stain | #78461e | ring edge 55%, interior #aa783c at 7-12% |
| Pen body | #5a5a62, #2a2a30, #0c0c10 | vertical gradient, tip #111114, ferrule #d8d8de to #6a6a72 |
| Red pen body | #e05058, #b8202a, #5a0a10 | same pen, red tip #9a1018 |

Ink is black and red only. Red means "this matters or this is wrong"; reserve it for 3 to 5 moments.

## Ground and surface
All static layers are cached (`H.offscreen`); build in this order.
1. **Table** (render at half resolution, scale up): planks 276px tall in full-res terms. Per pixel, per plank: ring phase `sin(2*PI*(py*0.07 + warp + plankOffset*3))` where `warp = H.noise(3).fbm2(x*0.0025 + plank*7, py*0.012 + plank, 3) * 5.5`; fine grain from two stretched `n2` calls (x freq 0.012, y freq 0.55 and x 0.05, y 1.3, weights 0.6 and 0.25); value `v = 0.5 + 0.16*sign(ring)*|ring|^0.4 + 0.14*fine + slow drift 0.12`. Colour = base * `(0.75 + 0.5*v)` (blue channel `0.78 + 0.45*v`). Two-pixel dark seams between planks. Over it a diagonal varnish gradient: rgba(255,230,190,0.16) at 0, 0.02 at 0.4, rgba(20,8,0,0.25) at 1.
2. **Napkin sheet** (900x864 for a hero shot; 1650x1050 when several sheets share a world): deckled outline (edges displaced by `H.noise` n2 at 9 cycles per edge, amp 3.3px, plus a fine layer at 60 cycles amp 1.2px), fill #f6f5f0, then 3,500 tissue fibres from `H.rng(21)`: 4-15px long, 1px wide, half rgba(180,175,165,0.08), half rgba(255,255,255,0.35).
3. **Quilted emboss**: draw a black mask, then stamp it twice (shadow, highlight, values in Palette). Mask contents: three inset frames at 24, 30 and 78px (2px lines, the middle one 1.2px); along the border every 51px a four-petal knot (four 7.5x4.5 ellipses rotated 90 degrees apart, centre dot); corner rosettes radius 13; and in the field a dot grid, spacing 24px, odd rows shifted 12px, dot radius 1.4px. Finally multiply the mask in at 5%.
4. **Coffee ring**: three slightly offset ring gradients (each ring 24px thick, bright edge at 92% of the radius), radius 90px, plus a faint second ring; multiply onto the sheet, with a conic mask removing a 25% wedge so the cup looks tilted.
5. **Crumple**: bake a height map (cell 3px). Height = `H.noise(64).fbm2` at 0.006 cycles/px scaled by 11, plus squared ridged noise at 0.012 (x4.5) and 0.028 (x1.2), a vertical fold ridge (+8, 33px each side) and horizontal fold valley (-7, 30px), seven random creases (length 120-390px, 21px wide, +-2 to 5), and an edge curl (+6 within 60px). Light from the top-left (-0.55, -0.6, 0.58): shade = `(lambert - 0.58)*1.35`; negative values paint rgb(70,64,58) at that alpha, positive paint white at that alpha. Bake once; per frame draw shade at multiply 50% and highlight at 50%.
6. Per frame: table, sheet shadow, napkin (cached), ink with feathering, crumple shading, props, finishing.

## Mark-making
**Felt-tip stroke**: resample the path every 3.75px, then wobble with `H.wobble(pts, noise, {amp: 2.2, freq: 0.008, seed})` plus a faint 6x-frequency layer at 30% amp, so lines tremble at two scales. Draw only the grown fraction with `H.partial`. Width 6-9px with round caps and joins; heavy outlines 9px, arrow shafts 7.5px, hairline detail 5px. Colour #16141c. A stroke takes `length / 2850 + 0.025` seconds, minimum 0.05 s, strokes run back to back with a 0.025 s lift between.

**Feathering** (this is the style; run it on every sheet each frame, after the core strokes are drawn into an ink layer clipped to the napkin):
1. Soak value `s` rises with time since the stroke began, `H.smoothstep(0.3, buildEnd + 1.2, t)`.
2. Halo: blur the ink layer at half resolution, radius `1.8 + 3.3*s` px (draw it twice to give it body). Mask this blurred copy with a cached **fibre mask** (about 90,000 random 2-8px, 1.3px wide lines from `H.rng(44)` over the sheet, so the bleed follows fibre directions). Composite at 20% + 30%*s.
3. Tighter bleed: blur 3.3px, composite at 85%.
4. Core: the sharp ink at 92%, with an absorption-speckle mask punched out of it: 13,500 rectangles 1.5-4.5px at 5-30% alpha, `destination-out`.
5. The ink layer gets the crumple shade multiplied on top so ink follows creases.

**Shapes** are imperfect: boxes are rounded rectangles that overshoot their start by 9px, circles run 0.3 radian past a full turn, emphasis rings use an ellipse 6.6 radians long, underlines are two crossing strokes (6.8px and 6px, 20px apart), strike-outs are a 13-point zigzag at +-14px, 5px wide. Never close a path exactly.

**Pen**: while a stroke is in progress draw the pen at the tip, tilted about 0.3 radian down-right: nib ellipse (10x6) in #111114, nickel ferrule, a 450px barrel with the dark gradient and a 3.7px white specular line, a cap posted on the back, and a blurred shadow (blur 12px, offset 36px, 45px, 35%). Swap to the red pen while a red stroke is active. When a sheet is complete, lay the pen down on the table with its cap beside it.

## Type and numbers
- Font: Permanent Marker 400 only; there is no second typeface.
- Sizes at 1920x1080: headline 116-126px (never below 99px), second-level 93px, labels 57-63px (never below 42px), counters 114px, key number 165px.
- Words are written glyph by glyph at 0.034 s per character with a per-glyph jitter from `H.rng(seed)`: vertical +-2.3px, rotation +-0.05 rad, spacing -1.5 to +2.3px. Lines tilt -0.01 to -0.03 rad.
- Numbers are re-scrawled, not animated: snap `t` to a 12 fps clock and redraw the whole numeral with fresh jitter each tick. Counts ease in log space (`10^(6u)`), percentages ease out `1 - (1-u)^2.2`. A key number is written in red (or black until it lands, then circled in red).
- All text feathers like the lines; there is no separate text pass.

## Diagrams: arrows, labels, charts
- Arrow: shaft (7.5px, one slight curve), then a two-stroke head: a V at +-0.55 radian, 27-36px long, 7.5px wide, drawn as a single separate stroke after the shaft.
- Label: written beside the thing (20px clear), tag-shaped hand outlines for category tags (a 5-point pennant with a word).
- Chart: an L-shaped axis in one stroke with two small heads; a hockey-stick or rising curve wobbles on early points (amp 3% of height) and settles; a red ring around the final number.
- Wrong: a red X of two 12px strokes, then a ring; the word is struck with a zigzag and the right word is written underneath, with a red check (three points, 12px).
- Loop: a red curved arrow that starts at the answer and returns to the source, carrying a small solid dot that travels backward along it.

## Motion
- Draw-on is linear in length; camera uses `H.ease.inOutCubic`, zoom interpolated in log space.
- Camera: start tight (zoom 1.45 to 1.5) on the first scrawl, pull back to 0.84 over 0.85 s as soon as the title is written, drift between sheets. Zoom never below 0.84 or above 1.5.
- New sheet: enters from the top right 1650px right and 1050px up, rotated +0.6 radian, easing over 0.4 s with a damped-cosine curve (one minus the cube of (1-u), times a cosine running 4.5 radians across the move), so it settles with a small overshoot; the shadow blur starts at 53px and tightens to 12px while its offset goes from (120, 165) to (12, 18).
- While nothing is being drawn the sheet breathes: shift 1-2px and rotate 0.002 radian on a slow sine of `t`.
- Steam from the cup curls on a 3 s loop (see Finishing).

## Scene changes
Slap a new napkin onto the pile. The old sheet stays visible beneath it and the camera slides to the new sheet in the same 0.4 s. Re-draw a recurring object (the "model" drawing) on the new sheet instead of moving it. Stay on the same sheet when the next idea extends what is drawn; add red-pen items to a sheet that already has black.

## Finishing passes (run every frame, same strength)
1. Table, then napkin sheets back to front, each with shadow and crumple shading.
2. Cup and saucer in the top right (saucer 237px radius, cup 135px, coffee 114px, a faint heart in cream, soft shadow blur 21px), with five steam wisps: `life = fract(t*0.35 + k/5)`, alpha `0.65*sin(life*PI)`, width `15 + 27*life`, sway `sin(4u + 1.6t + phase)` times `15 + 39u`, drawn with `blur(13px)`.
3. Diagonal warm wash over the whole frame: rgba(255,230,190,0.12) to rgba(20,8,0,0.22).
4. `H.vignette(ctx, {strength: 0.3, color: '#190a00', inner: 0.55})`.
5. `H.grain(ctx, t, {strength: 0.028, cell: 2, seed: 8, fps: 12, mono: true, blend: 'overlay'})`, cycling a few seeds so it does not crawl.

## Sound palette
- element appears (stroke start): a 30 ms bandpass `k.noise` at 700 Hz (q 1, gain 0.16, `a: 0.002`) plus a 50 ms `k.tone` at 120 Hz (gain 0.07): the felt tip pressing onto wood.
- drawing / writing: `k.play('stroke', t, {dur: strokeLen, gain: 0.42})` (red 0.5), under it a pink lowpass `k.noise` at 520 Hz, gain 0.07; a sentence is voiced as separate stroke sounds, each starting where that word's first letter falls inside the write window.
- label lands: a single 25 ms bandpass dab at 900 Hz (gain 0.22), the pen tapping.
- arrow completes: the head stroke only, `k.play('stroke', t, {dur: 0.1, gain: 0.5})`.
- scene change (new napkin): pink `k.noise` bandpass 260 to 800 Hz for the flight (gain 0.2), then at landing `k.play('slap', t, {gain: 0.7})`, `k.play('thud', t, {f: 85, gain: 0.4})`, and `k.play('paper', t + 0.01, {gain: 0.35, dur: 0.16})`.
- wrong / right: wrong is `k.play('error', t, {f: 'F3', gain: 0.55})` with the red slashes; the adjust loop is seven `click` at f 950 (gain 0.5) spread across the return arrow; right is `k.play('success', t, {f: 'A5', gain: 0.6})`.
- key number (the biggest hit): `k.play('count', ...)` ticks at 12/s with f rising from 2000 (+100 each), `k.play('tock', t, {f: 470, gain: 0.45})` when a count lands; for the big percentage `k.play('impact', t, {gain: 1.2})` and `k.play('ding', t + 0.01, {f: 'D6', gain: 0.42})`.
- takeaway: `k.play('success', t, {f: 'G5', gain: 0.7})` as the underline finishes.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.5})`; `k.play('pop', 0.03, {gain: 0.45, f: 300})` (cap off) at the start and `k.play('click', end, {f: 700, gain: 1.0})` (cap on) at the end; an occasional cup clink, a 0.5 s `k.tone` at gain 0.025.

## Signature moves
- Ink bleeding into the tissue: halo, fibre-shaped bleed, speckled core, growing over a second or two.
- Numbers re-scrawled at 12 fps.
- A fresh napkin slapped onto the pile with an overshooting whip-in.
- Red pen enters only for the wrong guess, the return loop and the final number.
- The pen on screen at the stroke tip, then laid down with its cap.
- Steam curling off a cup in the corner while the camera pulls back.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Crisp black lines on a white sheet | feather: halo, fibre mask, speckled core |
| A flat white napkin | fibres, emboss pattern, crumple shading, coffee ring |
| Perfectly straight boxes | two-scale wobble and overshoot at the start and end |
| Wood is a brown rectangle | plank rings, warp noise, joints and varnish gradient |
| Too many pen colours | black and red only |
| Counting numbers smoothly | re-scrawl at 12 fps |
| Camera stays flat | tight start, pull back, slide to each new sheet |

## Hero frame recipe
1. Cached table: planks, ring noise, seams, varnish gradient.
2. Napkin sheet 900x864 at about (822, 552), rotated -0.06 radian, deckled outline, soft shadow blur 15px offset (10, 15).
3. Quilted emboss: border knots, three frames, dot grid; coffee ring top right of the sheet with a wedge removed.
4. Title "WORD WORD" in Permanent Marker 126px near the top, two crossing underlines; below it a few boxes, a simple stick figure, a speech bubble, an arrow into a box, a hockey-stick chart with a red ring.
5. Ink feathering: halo, fibre bleed, speckled core; then the crumple shade over it.
6. Cup and saucer top right, five steam wisps, the pen resting with its cap on the table.
7. Warm wash, `H.vignette` 0.3 in brown, `H.grain` 0.028. The ink edges must look furry at 200% zoom and ink centres must be near-black, never grey.
