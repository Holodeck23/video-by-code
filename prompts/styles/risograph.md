---
id: risograph
name: Three-Plate Spot Print
family: Print
fonts: [Archivo Black, Space Mono]
best_for: zine-like explainers, loops (guess, check, adjust), counters that climb, before/after, youth, indie and culture topics, anything that gains from loud flat colour and visible craft
avoid_for: photographic realism, dense tables, finance or legal trust, topics that need subtle gradients or more than three colour meanings
---

# Three-Plate Spot Print

The viewer believes a single sheet of cream stock is being fed through a drum duplicator three times, once per ink. Every colour is one of three fluorescent spot inks, so any other hue exists only where plates overprint. The plates never sit exactly on top of each other, solids are grainy and patchy, and tints are made of visible dots. Registration slop and ink grain sell the medium.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (stock) | #f2ede0 | warm, never pure white; paper shows through every knockout |
| Plate 1, yellow | #ffe200 | prints first; large flat shapes, discs, bands, glints. Accent: the single disc behind the key number |
| Plate 2, pink | #ff48b0 | shading tints, the offset copy of type, motion strokes. Alarm: crosses, error arrows, scribble rings |
| Plate 3, blue (primary ink) | #3255a4 | all line work, all text, flow arrows, labels |
| Overprint yellow + pink | #f23b00 | emerges where plates cross; do not draw it |
| Overprint yellow + blue | #2f4600 | dark olive; reads as a near-black edge |
| Overprint pink + blue | #2f1663 | deep violet; the shadow side of tinted shapes |

These are the exact multiply results of the three inks on the stock. Three plates stacked reach #2f1400. A fourth hue is never drawn.

## Ground and surface
The sheet is built per pixel inside one compositor (see Mark-making), not with a fill. Cached once with `H.offscreen`, then read back to flat arrays:
1. Mottle field: a 96x54 grid; each cell holds three channels of `H.noise(5).fbm2(x*0.11 + offset, y*0.11 + offset, 3)`, scaled by 1.6, clamped to +-1 (offsets 0, 40, 80 on x and 0, 9, 31 on y per channel). Upscale to 1920x1080 with smoothing on, `getImageData`, keep the array. One channel per plate drives patchy ink density.
2. Fine field: same recipe, 320x180 grid, frequency 0.22, seed 9. Drives paper fibre unevenness and a little density wobble.
3. White-noise tables: three Float32Arrays of 1920x1080 values filled once from `H.rng` (seeds 7, 50, 90): paper speckle, dot-edge ragged threshold, per-frame ink grain. Read the grain table at offset `step * 7919` (wrapping) so it reshuffles whenever `step = floor(t*8)` changes.
4. Column streaks, one 1920-length array per plate (seeds 14, 25, 36): start at 1, lose 0.2 times the absolute value of 3-octave `fbm2` sampled along x at 0.012 per px (fixed row 0.3), lose 0.05 times the shifted `n2` sampled at 0.09 per px, then subtract six narrow dips (centre `H.rng` over the width, sigma 1.5-6 px, depth 0.15-0.35). These are roller lines running down the sheet.
5. Stock per pixel: `#f2ede0` times `1 + fineField*0.018 + (speckle-0.5)*0.035` for red and green, 0.022 and 0.04 for blue. 0.15% of pixels are fibre flecks at x0.9 (x0.88 on blue).

## Mark-making
Nothing is drawn in colour. Each plate has its own offscreen at 1920x1080, filled white, and the plate's marks are drawn in black on it. Pure black means full ink, black at alpha `a` means tint `a`, white means paper. Redraw the three plates every frame; they are cheap vector work.

**Who prints what.** Yellow: big flat shapes, discs, bands, sparkles, a knockout under any pink or blue subject. Pink: shade tints, the offset copy of type, motion hairlines, alarm marks. Blue: every outline, detail, word and arrow. A subject is a yellow block, a pink tint on its shadow side and a blue outline on top.

**Registration.** Before drawing a plate, translate it about the sheet centre: yellow (-7.5, +9) rotated -0.002 rad, pink (+9, -4.5) rotated +0.003 rad, blue (0, 0). Every 8 fps step add +-1.5 px of jitter from `H.rng(1000 + step)` to yellow and pink only. Knockouts follow the exact subject outline (grow blobs and clouds by 6 px). With the offsets this leaves slivers of paper beside the outline and darker doubled-ink edges on the other side. Keep both.

**Tints.** Shade with gradients clipped to the shape, alpha stepping from 0.12 to 0.28 to 0.45 to 0.72 (a sharp shadow side may reach 0.78). Light from top-left, dense toward bottom-right. Flat grey is only for quiet backgrounds at 0.12-0.2. A small dome or button gets a radial gradient: 0.35 at the highlight, solid by 75% of the radius.

**Halftone (per pixel).** With density `d = 1 - plateGrey/255`:
- `d > 0.96` is solid, coverage 1; `d < 0.01` is skipped.
- Otherwise rotate the pixel by the plate screen angle (yellow 0.26 rad, pink 1.31, blue 0.79), pitch 7.8 px: `u = (x*cosA + y*sinA)*2*PI/7.8`, `v = (-x*sinA + y*cosA)*2*PI/7.8`.
- `screen = 0.5 + 0.25*(cos u + cos v)`, `thr = screen*0.72 + dotTable*0.28`, then coverage is 5 times (1.05*d minus thr), plus 0.5, clamped to 0..1. The noise term ragged-edges every dot.

**Ink transfer.** `dens = 0.88 + mottle*0.15 + fine*0.07 + (grain - 0.5)*0.16`, then `dens *= streak[x]`. Starve the tail of the sheet: subtract `max(0, y/1080 - 0.55) * 0.12` (0.07 for yellow and pink). Pinholes: where a table value is under `0.012 + max(0, -mottle)*0.04`, `dens *= 0.35`. Then `cov *= clamp(dens)`.

**Multiply.** Per channel, in order yellow, pink, blue: `c *= 1 - cov*(1 - ink/255)`, ink being that plate's rgb. Write the result to the frame with `putImageData`. At 2 million pixels x 3 plates this is the whole cost of the style; if previews crawl, run it at 1280x720 and scale up with smoothing on.

**Line work.** Blue outlines 9-16 px, detail 7 px, hairlines 4.5 px, round caps and joins. Fills sit on another plate and drift, so the outline never hugs its fill; that is intended. Small spot marks: a dozen pink dots (radius 4-8 px, `H.rng(77)`), blue plus signs (arms 14 px, stroke 6 px), yellow four-point sparkles (radius 24-50 px, inner radius 20%).

## Type and numbers
- Archivo Black for display, Space Mono 700 for captions and fine print. Everything legible is blue.
- Cover word 375 px (tracking -15 px), hook title 192 px (-6 px), running header 66 px (-2 px). Two-plate type: blue copy on top, a pink copy 16 px right and 14 px down underneath. A yellow bar (516x60 px) or disc sits behind the kicker.
- Verb labels in Archivo Black 45 px caps; captions Space Mono 42 px, tracking 4.5 px. Fine print is 26 px and never carries the story.
- Counter: Archivo Black 117 px, pink copy +7.5 px, a Space Mono caption above it. Value `max * u^2.2` with thousands separators; digits redraw whole each frame like a numbering machine, never roll. A 10 px pink underline prints when the count lands.
- Key number: 225 px, tracking -9 px. Pink fill, 4.5 px blue outline (round joins), on a yellow disc radius 225 px with a radial gradient: solid to 62% of the radius, 0.8 at 80%, 0.5 at the rim, so the rim dissolves into dots.
- Text never types or fades; it is simply on the plate from the frame the plate is on the sheet.

## Diagrams: arrows, labels, charts
- Flow arrow (blue): a quadratic curve drawn on in 30 segments with `H.ease.outQuad` over 0.4-0.6 s, round-cap dots (width 13.5 px, dash [3, 27]), then a filled triangle head, size 3.2 x width, wings at +-2.5 rad from the travel direction, tip 0.6 of that size past the end.
- Error or return arrow (pink): dashed [27, 21], width 13.5 px, along a bottom path back to its origin. A 24 px pulse dot rides it once; after, six 10 px dots circulate at 0.9 laps per second.
- Label: verb in Archivo Black 45 px beside the arrow midpoint, 18 px clear, 0.25 s after the arrow starts.
- Bubble: rounded box radius 39 px with a three-point tail. Pink plate fills it white (knockout), yellow adds a 0.05 to 0.5 diagonal tint, blue outlines it at 10 px.
- Wrong: a pink cross, 100 px across, 24 px strokes, popped with `H.ease.outBack`, plus a pink scribble ring: 1.15 turns from -2.2 rad, radius times `1 + 0.06*sin(i*0.5)`, 10 px. Right: a blue tick (3 points, 18 px stroke) on a yellow disc of radius 66 px.
- Chart: blue axes 10 px with filled heads, Space Mono 36 px ticks, area under the curve a 0.3 blue tint, the curve a 15 px pink line ending in a 21 px dot. Early points carry a damped ripple (`sin(u*40)*2.2*(1-u)` in value units).
- Takeaway band: a yellow bar 150 px tall at y 900 that prints left to right in 0.4 s; two blue phrases in Archivo Black 69 px, 135 px apart, joined by a short blue arrow.

## Motion
- The sheet itself never moves; there is no camera. Life comes from the boil: each 8 fps step reshuffles the ink grain and re-jitters yellow and pink. All object motion runs at the full frame rate underneath.
- Easing: draw-on `outQuad`; pops `outBack` (0.3-0.6 s; an object may rise 600 px into place); a dot travelling along an arrow `inOutQuad`.
- Streams of items accelerate: gap `max(0.13, 0.36 - 0.02*i)` seconds.
- Idle: sparkles breathe +-15% (`sin(t*5)`); flickering shapes scale by `1 + 0.08*sin(t*23) + 0.05*sin(t*37 + 1)`; a drifting hero object creeps 15 px per second.
- Intro: plate k (yellow, pink, blue) starts at `k*0.18` s and takes 0.55 s. A wavy edge (`sin(x*0.031 + 2k)*7.5`, 27 px feather) runs down the sheet from y -30 to y 1140 and the plate only exists above it; each plate also settles 60 px upward. The hook title then shrinks to 30% and glides to the top-left header over 0.85 s (`inOutCubic`).

## Scene changes
Re-register the plates. For a change at time T, plate k (yellow 0, pink 1, blue 2) starts at `T - 0.3 + 0.11*k` and runs 0.6 s. First half: the old scene's plate slides left by `inQuad(2u) * 2200` px. Second half: the new scene's plate slides in from the right, `(1 - outQuad(2u - 1)) * 2200` px. The new scene enters at 1.1x scale about the centre and settles to 1. For a moment the sheet shows ghost combinations, such as old blue lines over a new yellow field. The running header and its underline stay put. Stay continuous when the next beat only adds to the diagram.

## Finishing passes (run every frame, same strength)
1. Stock speckle, fibre flecks, mottle, streaks, pinholes and ink grain, all inside the compositor above.
2. Toner haze: a vertical gradient `rgba(50,85,164,0.06)` to 0 over the top 45 px, drawn after `putImageData`.
3. No `H.grain` on top: the ink grain is the grain, and film noise breaks the print illusion.

## Sound palette
Duplicator: rollers, sheet feeds, registration clacks. Wrap small sounds in `k.minor(fn)`.
- element appears: `k.play('press', t, {gain: 0.38})` as it lands; items in a stream get a 50 ms `k.noise` bandpass burst (f 2000 to 2600, q 0.8, gain 0.2), panned to where they enter.
- label lands: `k.play('tock', t, {f: 820, gain: 0.35})`.
- arrow completes: dots tick one by one, a 30 ms `k.noise` bandpass (f 2600, q 1.1, gain 0.32) plus `k.tone` at f 360, 35 ms, gain 0.1, timed when the eased progress passes each dot; eight dots for 0.6 s, panned along the path.
- drawing / writing: `k.play('stroke', t, {dur: drawLength, gain: 0.4-0.7})` for chart lines and scribbles.
- scene change: `k.play('roller', T - 0.3, {dur: 0.86, gain: 0.45})`, `k.play('paper', T - 0.3, {dur: 0.3, gain: 0.3})`, then `k.play('tock', ...)` as each plate lands at `T + 0.3 + 0.11k`, f 470, 590, 700, gain 0.6, pan -0.2, 0.2, 0. The intro repeats this and closes with one extra `press` at 0.91 s (gain 0.38) when the last plate is down.
- wrong / right: `k.play('stamp', t, {gain: 0.65})` with `k.play('error', t, {f: 'A3', gain: 0.7})`; `k.play('stamp', t, {gain: 0.5})` with `k.play('success', t, {f: 'C6', gain: 0.8})`.
- counter ticks: each digit change is a `k.noise` bandpass (f 3800, q 1.5, 25 ms, gain 0.34) with a triangle `k.tone` (f 836, 30 ms, gain 0.08); spacing shrinks from 0.17 s to 0.083 s as the count nears its end.
- key number: `k.play('stamp', t, {gain: 0.7})` as a counter lands; the biggest hit is `k.play('impact', t, {gain: 1.25})`.
- takeaway: `k.play('roller', t, {dur: 0.42, gain: 0.55})` as the band prints, then `k.play('ding', ...)` on C5, G5, E6 spaced 0.07 s, gain 0.42, 0.35, 0.28.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.2})` and `k.bed(0, DURATION, {kind: 'hum', gain: 0.12})`, an idling machine.

## Signature moves
- Each ink arrives separately, rolling down the sheet or sliding in on a scene change.
- A visible gap between yellow fill and blue outline on every shape.
- An 8 fps boil in grain and plate position while everything else glides.
- Blue type with a pink copy offset beneath it.
- Dotted blue flow arrows that tick dot by dot, with pink dashed arrows for corrections.
- A yellow disc behind the key number, ringed by a pink scribble.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Colours are smooth, digital gradients | tints go through the dot screen; density gets mottle, streaks, pinholes |
| Plates line up perfectly | keep the 7-10 px offsets and the per-step jitter |
| Too many hues | three inks only; every other colour comes from overprint |
| Black text | all text blue; shade with pink, never black |
| Frozen grain | reshuffle the grain table every 8 fps step |
| Film grain stacked on top | skip `H.grain`; the compositor is the texture |
| Paper is white | multiply on #f2ede0 and keep the 3.5% speckle |
| Scene change is a plain slide | plates leave and arrive one ink at a time, 0.11 s apart |

## Hero frame recipe
1. Cached mottle, fine fields, tables and streaks; compositor ready.
2. Yellow plate: a disc of radius 372 px at (1400, 457), a 516x60 px bar at (90, 96), three sparkles. Knock the disc out under the main subject.
3. Pink plate: the title copy at (+16, +14), a 0 to 0.78 diagonal tint on the subject's lower right, 20 specks, a 9 px rule under the title.
4. Blue plate: a 375 px cover word and two 168 px lines in Archivo Black, the subject's outline at 10 px with two detail strokes, a few Space Mono 26 px lines of fine print.
5. Apply registration offsets, run the halftone, transfer and multiply pass; add the 45 px toner haze at the top.
6. Check the look: a sliver of paper beside at least one yellow edge, dots visible in every tint, orange where pink meets yellow, a few pinholes in the solids.
