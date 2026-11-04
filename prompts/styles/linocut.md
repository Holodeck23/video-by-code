---
id: linocut
name: Two-Block Linocut
family: Print
fonts: [Archivo Black, Caveat, Kalam]
best_for: bold claims, before/after and cause/effect stories, history and politics, manifestos, anything that benefits from a few blunt shapes and one loud second colour
avoid_for: fine detail, many-series charts, soft or luxurious tones, dense text, anything needing more than two colours of meaning
---

# Two-Block Linocut

The viewer believes they are watching a printmaker pull proofs of hand-cut lino blocks onto cream rice paper: a dense black key block with shapes gouged away, plus a vermilion block printed slightly off-register. Every beat is a freshly carved block pulled as a new proof; the quality that sells it is ink that is rich but imperfect, with salt-speckled blacks, rough edges and paper tooth showing through.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #f0e8d4 | rice paper, with fibres and grain; never pure white |
| Primary ink (key block) | #1a1716 | solid black, composited straight over the paper |
| Accent (red block) | #c43a26 | multiplies the paper colour (paper shows through); the single thing to look at |
| Alarm / wrong | #c43a26 | same block: a mistake is a red X, a red return channel |
| Paper fibres, light | #fffcf0 | 65% of fibres, alpha 0.25-0.6 |
| Paper fibres, dark | #96805a | 35% of fibres, alpha 0.08-0.2 |
| Graphite | #4e4842 | printmaker's pencil on paper; #82807a where it crosses ink |
| Edge warmth | #5a4628 | only in the final vignette |

Two inks only. Anything that is not black or red is paper.

## Ground and surface
1. Paper (static, cache with `H.offscreen`): fill #f0e8d4, then 520 fibre strokes with `H.rng(12)`: start anywhere in the frame (+-60px beyond), angle 0-2 PI, length 45-255px, width 0.75-2.4px, round caps, each a bezier with its two control points pushed 15-20px sideways. Optionally start from `H.paperTexture(1920, 1080, {seed: 12, tone: '#f0e8d4', fiber: 0.6, grain: 0.3, blotch: 0.15})`.
2. Two noise fields baked once from `H.noise(seed).fbm2` and enlarged with smoothing: a broad field (160x90 grid, frequency 0.09, 3 octaves, x1.7, clamped; seed 31) giving ink-load drift; a tooth field (426x240 grid, frequency 0.35; seed 57) giving the salt. Store three channels per field: base, a streak variant stretched along y (frequency x2.3 across, x0.6 down), and a fine variant (3x frequency).
3. Per-pixel grain on the paper: scale each pixel by 1 plus four small terms: hash noise of +-2.5%, tooth 1.5%, streak 1.8%, broad 1.2% (all signed fields). The hash is a fixed integer hash of (x, y), never `Math.random`.
4. The printed block sits inside a margin of at least 96px left and right, 51px at the top and 190px below (the pencil line lives there). Block area at 1920: x 96 to 1824, y 51 to 879.

## Mark-making
Everything is a mask, then ink. Two off-screen alpha masks are drawn each beat: KEY (black block) and RED. A cut is `destination-out`; a mark left standing is `source-over`.
- Block: fill the slab (edges wobbling +-2.2px at 10px steps via `H.noise`). Cut an inner border line 6px wide inset 21px.
- Tapered gouge (the basic cut): sample N points along any parametric path, offset each side by half of `width * profile(s)`, fill the polygon. Profiles: lens `sin(PI*s)^0.6` (chips, rays, flicks); tail `min(1, 7s) * (1-s)^0.9` (carved contour lines, wedges); arrow shaft `min(1, 8s) * (0.7 + 0.3s)`.
- Tone is carving density: parallel lens cuts in groups of 6-9, spacing 14-18px, width tapering 11 to 3px, leave an uncut rim of 10px (strong outline). More carving means a lighter area. Fills under a curve: red solid, plus 30 hatch cuts every 20px, 7-9px thick, clipped to the shape.
- Rays and bursts: 44-48 alternating gouges around a focal shape: long (width 24-32px, 1.5-3x the shape's radius, a slight bend) and short (55% width, half length). Plus 120 scattered chips (7-18px long, 3-6px wide) in empty black, and ring chatter: 60-70 echo nicks (18-45px long, 4.5-9px wide) just outside carved shapes, and 35-45 clearing cuts along the inside of the border.
- Reduction red: the red block is cut so it prints under or beside the black. Where red must sit alone, clear the black over it first. Letters on red are cut out of the red block so they print as paper.
- Registration: blur KEY 1.7px; blur RED 2px and shift it (+4.5, -3). The red edge must peek beside the black edge.
- Print the masks (this is where the ragged edge comes from). Edge: threshold = 0.5 + 0.25 x fine + 0.12 x (hash - 0.5); coverage = clamp(4.5 x (maskAlpha - threshold) + 0.5). Black density starts at 0.95, drifts by 6% of broad and 4% of streak, and shimmers +-0.04 per 12 fps step. Salt score = 0.75 x tooth + 0.7 x (hash - 0.5) + 0.35 x max(0, broad); above 0.7 the density drops to 15%, above 0.55 to 70%. Red density starts at 0.8, drifts 14% of broad, shimmers +-0.09, and falls to 25% where tooth + 0.9 x (hash - 0.5) exceeds 0.62. Black blends toward #1a1716; red multiplies the paper by (196, 58, 38)/255.
- Cheap route when per-pixel work is too slow: draw ink as a layer, `destination-in` the blurred mask, then `destination-out` a cached salt layer (the tooth field thresholded at 0.55-0.7).

## Type and numbers
- Archivo Black, letter-spacing 4-12px. Band headline 87px, carved label 45-48px (never below 42px), key numeral 285px, title glyph 405px.
- Carved text is drawn glyph by glyph with jitter: y +-2px, rotation +-0.03 rad, seeded per piece. Headlines print as paper letters cut from the red band; labels are cut out of the black block as paper letters; large numerals are cut from black.
- Numbers are re-cut on twos: derive the value from `stepT = floor(t*12)/12`, so the numeral changes at 12 per second with a fresh shimmer. Large counts rise by `u^2.3`, percentages ease with `H.ease.inOutCubic`.
- Pencil (never printed): Caveat 51px for titles and notes, Kalam 36px for "proof 3/5" labels, written on by a clip rect sweeping left to right (0.25-0.8s). Margin line sits at y about 948, left; proof number right-aligned at x 1818.

## Diagrams: arrows, labels, charts
- Arrow: a gouged channel, the arrow shaft profile at width 18px (error or return paths 33px, printed red as well: cut in KEY, a 45px round-cap stroke in RED). Head: filled triangle, size 2.4 x width, wings at +-2.4 rad, cut at the end of the draw-on (0.35-0.5s, `H.ease.outCubic`).
- Label: carved Archivo Black 45px, 18px clear of the thing, appearing the step after the arrow finishes.
- Chart: the area under the line is red with hatch cuts, the line itself a gouge whose width swells from 0 to 18px at the start, axes 9px wide cuts, an uncut border; label carved below, value in the huge numeral.
- Emphasis, wrong, right: the printmaker's pencil does it, not the block: a loose ellipse circle (7.5px graphite, 7.2 rad of travel, 5% radius wobble, 0.4s) and a margin note in Caveat. A wrong answer also gets a red X (33px stroke, 100px wide, scale 0 to 1 with `H.ease.outBack` in 0.15s); a right answer a red check.

## Motion
- Everything lives on a 12 fps clock for geometry and density shimmer, with the print-pull and camera on true time.
- Draw-ons: outCubic, 0.25-0.5s. Counters run 2 s or more. Elements are cut in on a 0.3s stagger. Tile or card inserts shrink 1.0 to 0.55 while sliding on a curve.
- Keep life between beats: only the density shimmer, the glint and the pencil, no camera drift; the block stays fixed like paper on a table. At the end, a very slow zoom of 1.0 to 1.03.

## Scene changes
A new proof is pulled over the old one, in 0.8s with `H.ease.inOutCubic`. A diagonal front `u = 0.85x + 0.55y` travels from -225 to 2850; pixels with `u < front` show the new proof, the rest the old. Just ahead of the front, inside the block area, darken the paper by 14% with a Gaussian band (centre 21px ahead, sigma 33px) as the lifting sheet's shadow. Always pull, never cross-fade; if the next idea only adds one thing, cut it into the current block on the next 12 fps step instead.

## Finishing passes (run every frame, same strength)
1. Paper with fibres and grain multiplier (no other grain; the paper is the grain).
2. Peel shadow band (only during a pull).
3. Red layer, multiplied; then the black layer, each through the salt, edge and shimmer rules above.
4. Pencil layer: graphite alpha = mask x (0.45 + 0.45*hash), x0.6 on tooth, x(1 - 0.68*inkCoverage) over ink, colour #4e4842 on paper and #82807a over ink.
5. Raking glint on wet black: add brightness `26 * exp(-(d/105)^2) * (0.6 + 0.4*tooth)` to ink pixels only, `d = (0.8x + 0.6y - pos)`, with pos sweeping 3 s on the title and end card only.
6. `H.vignette(ctx, {strength: 0.12, color: '#5a4628', inner: 0.6})`.

## Sound palette
A print shop bench. Dry, wooden, no tonal music.
- element appears (carved piece, tile): a nick: a 30 ms bandpass `k.noise` knock (f 1300-1600, q 1.6, gain 0.3, a 0.001) with a low `k.tone` under it (f 190, 40 ms, gain 0.08). Snap times up to the next 1/12 s step.
- label lands: the same nick at gain 0.8, panned to the label's x.
- arrow completes / drawing: a V-gouge scrape over the stroke length: bandpass grains (dur 0.03, f 1000-1700, q 1.3, gain 0.2) every 16-28ms, a brown lowpass body (f 420, gain 0.22, across `dur`) and, as the cutter lifts, a 25 ms chip flick (bandpass, q 1.5, f 1900, gain 0.18). Wide return channels at gain 1.2.
- writing: `k.play('pencil', t, {dur, gain: 0.7, minor: true})`.
- scene change: pulling a proof: a soft `press` release at the start (gain 0.3), then `k.play('paper', ...)` 0.14s later across 0.64s at gain 0.7, under pink bandpass noise (f 650, q 0.8, gain 0.12, 0.8s), and tack crackle: 6 ms bandpass ticks (f 1500-2400) every 8-28ms enveloped by `sin(PI*x/0.8)`.
- wrong / right: wrong: `k.play('stamp', t, {gain: 0.8})` then `k.play('error', t + 0.12, {f: 'E3', gain: 0.75})`. Right: `k.play('tock', t, {f: 300, gain: 0.5})` then `k.play('success', t + 0.2, {f: 'C5', gain: 0.45})`.
- key number (biggest hit): counter nicks accelerating to 11 per second (gain 0.6 to 0.9), then `k.play('impact', t, {gain: 1.2})` with `k.play('press', t, {gain: 0.9})` as the press comes down.
- takeaway: four `k.play('ding', ...)` at 0.06s apart: C4, G4, C5, E5, gain 0.36 falling by 0.05 each.
- bed or music (optional): `k.bed(0, DURATION, {kind: 'room', gain: 0.22})`.

## Signature moves
- Each beat is a newly pulled proof peeling diagonally over the last, with a soft shadow at the lifting edge.
- White gouge strokes with swelling-and-tapering ends define every shape.
- Red printed just out of register beside the black.
- Numbers re-carved on twos instead of counting smoothly.
- Pencil circles, margin notes and a signature in graphite on the paper margin.
- A raking glint slides across the wet black on the title and the end card.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Black is a flat digital fill | salt holes, 6% density drift, ragged threshold edges, 12 fps shimmer |
| Strokes with equal width and round ends | tapered gouges with lens or tail profiles, flat outline rims |
| Red and black perfectly aligned | shift RED (+4.5, -3), blur 2px, let a sliver of paper show |
| Smooth anti-aliased lettering | glyph jitter, spacing 4-12px, cut from the block, mask threshold |
| Pencil as clean overlay text | grainy alpha on paper tooth, lighter over ink, wiped on left to right |
| Crossfades between scenes | pull the next proof diagonally with the lifting-sheet shadow |

## Hero frame recipe
1. Paper #f0e8d4 with 520 fibres, grain multiplier, vignette 0.12.
2. Block slab 1728x828 at (96, 51), wobbly edges, border cut 21px in.
3. One big shape, centred, left as paper (cut away), with its rim left standing as a 10px black line; around it 46 alternating long and short rays and 120 chips.
4. Red: a disc under the shape, offset (+4.5, -3), plus a red band across the bottom with the headline cut out of it in Archivo Black 87px, letter-spacing 8px.
5. Mask the print: ragged edges, salt, density drift.
6. Pencil margin text in Caveat 51px at (100, 948), a proof number right-aligned, one loose circle in graphite.
7. Add the glint at mid-frame, then check that black has visible white specks and red shows paper through it.
