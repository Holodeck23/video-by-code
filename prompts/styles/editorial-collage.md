---
id: editorial-collage
name: Cut-Paper Collage
family: Paper & craft
fonts: [Anton, Oswald, Libre Baskerville]
best_for: opinion-essay explainers, history and culture, news-flavoured topics, how-it-works stories with a clear question and answer, anything that benefits from "evidence pinned to a desk"
avoid_for: dense technical diagrams, precise data dashboards, calm minimalist or luxury tone, anything that needs a clean continuous camera
---

# Cut-Paper Collage

The viewer believes they are watching a documentary editor shoot a desk of physical paper: torn halftone photographs with white borders, newspaper scraps, flat colour sheets and masking tape, all lying at slightly different heights. The camera glides smoothly over the desk, but each scrap lands on a choppy 12-steps-per-second hand-animation clock. That smooth-versus-stepped split is the one quality that sells it.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (desk paper) | #f0e9d9 | warm cream; fibre texture multiplied over it |
| Primary ink | #1a1816 | headlines, rules, route lines, black paper sheets |
| Accent (red paper and marker) | #b8483a | the big flat colour sheet behind everything, rings, the error trace |
| Highlighter | rgba(255,226,38,0.84) | multiplied; used for the single most important phrase on screen |
| Card paper | #f5f1e7 | label strips, chart cards, number strips |
| Newsprint | #e9e1cb | clippings and "quote" strips |
| Print border | #f8f5ee | white border of photographs |
| Kraft | #c9a878 | a torn sheet to sit a pile of items on |
| Halftone dark / light | #1e1b19 / #eee7d6 | the two ends of every photograph |
| Graph grid | rgba(70,90,110,0.13) | 1px lines every 30px on chart and diagram cards |
| Shadow | rgba(40,28,15,a) | warm brown, never black |

Black, red and cream carry the whole frame; yellow appears only as the highlighter.

## Ground and surface
1. Fill the frame with #f0e9d9.
2. Fibre sheet, built once with `H.offscreen('fibre', 3000, 1650, fn)`: start white. Paint a 250x138 low-resolution field with grey `g = 244 + 22 * (0.6 * fbm2(x*0.05, y*0.05) + 0.4 * n2(x*0.3, y*0.3))` (blue channel 6 lower than red, so it is warm) and stretch it to full size. Add 2600 short curved fibres (6-30px long, 0.9-2px wide) from `H.rng(31)`: 55% dark rgba(120,100,70,0.05-0.13), 45% white at 0.2-0.5 alpha. Add 900 specks 1.2-3.3px, rgba(80,60,40,0.08-0.28).
3. Draw the fibre sheet over the ground with `multiply` at parallax depth 0.2 so it drifts slowly against the cutouts.
4. Every cutout multiplies the same sheet into itself (alpha 0.35 photo borders, 0.45 strips and cards, 0.55 flat sheets, 0.8 newsprint) so all paper shares one grain.
5. Cached: fibre sheet, all cutout sprites, grain tiles. Per frame: the camera transform, stepped arrivals, tape, highlighter, marker, whip blur, finishing.

## Mark-making
**Cutout sprite.** Every item is an offscreen sprite (cached by key) with 50px of padding for its shadow. Build its outline with `edgePoly(w, h, torn[4], seed, amp)`: jitter the four corners +-3px; a straight side stays straight (scissor cut); a torn side is resampled every 3.75px and offset along its normal by `fbm2(...)*amp*1.7 + r.range(-0.15,0.15)*amp - 0.25*amp`, fading to zero over 15px at each corner. amp: photo 13, clipping 7.5, strip 6, sheet 9. Tear two or three sides, never all four on a photo; vary which ones from item to item.
Shadow, two fills in one go: soft (blur 22px, offset 6,12, rgba(40,28,15,0.4)) then contact (blur 3px, offset 0,1.5, 0.25).

**Halftone photograph.** Paint any greyscale scene (lit gradient wall, one subject, a darker floor band) into a layer, then convert pixel by pixel:
1. Blur 1.5px. Darken towards the edges: `L *= 1 - 1.1*(u^2+v^2)`; add noise `(r()+r()+r()-1.5)*0.11`; contrast `(L-0.5)*1.25+0.5`.
2. Rotate coordinates 45 degrees, snap to a 6px grid (7px for large prints). Dot radius `0.74*cell*sqrt(1-L) - dist + 0.9`, clamped 0-1.
3. Coverage = 0.62 * dot + 0.38 * (1-L): a third of the tone stays continuous under the dots. Mix #eee7d6 to #1e1b19 by coverage.
4. Dust: one speck per 1100px^2, 60% cream rgba(245,240,228,0.8), 40% dark rgba(20,18,16,0.5), radius 0.7-2.5px; plus one hairline scratch (cream 0.45, 1.2px) running top to bottom as a bezier.
5. Mount it on a #f8f5ee border 18px wide; the image keeps a 1.5px rgba(0,0,0,0.12) keyline.

**Newsprint clipping** (#e9e1cb): an age stain, radial from 0 alpha at 0.3w to rgba(180,150,90,0.18) at 0.8w; kicker in Oswald 20px with a 3px rule and a 1px rule 6px below; headline Libre Baskerville 700 51px, line height 1.18; italic deck 29px at 1.4 with the key phrase marked for the highlighter; hairline rule; then greeked columns: random "words" of 1-8 letters drawn from "etaoinshrdlucmfwypvbg" (weighted by `r()^1.6`), 5px word gaps, rgba(52,47,41,0.85), last line cut at 30-80%.

**Strip** (label slip): padding 0.2 x font height sideways, 0.15 above and below. Light slips use #f5f1e7; emphasis slips use #1a1816 with cream #f3efe5 text.

**Tape**: 165x48px rectangle with 7-point zigzag short ends (+-3px plus +-1.5 jitter), rgba(228,216,186,0.8), shadow blur 5px y 2, five faint white lines at 0.22 alpha, 3px bands of rgba(150,130,90,0.12) top and bottom. Stuck across photo corners at +-0.4 to 0.6 rad.

**Highlighter**: `multiply`, band height = text cap height, rgba(255,226,38,0.84). Top and bottom edges wobble by `n2` (7-8% of the height), the band tilts +-6% of height over its length, the leading end bulges 8% past the text. Four felt streaks along it (alternating rgba(235,190,20,0.22) and rgba(255,240,150,0.3), 5-11% of the height), and an ink pool at the start (ellipse 0.18h x 0.55h, rgba(230,180,10,0.3)) which is repeated at the end once complete.

**Red marker**: two passes of the same polyline: 90% alpha, 10px, round caps; then 35% alpha, 4px, shifted (+1.8,-1.5)px. A ring is 1.12 turns of an ellipse with radius growing 7% plus noise 6%, so it overshoots. A cross is two 12px strokes. A tick is a 5-point stroke in ink.

## Type and numbers
- Headlines: Anton 400, 168px (never below 117px), uppercase, one slip per line, each slip tilted -0.025 to +0.016 rad and offset like pasted-up lines.
- Labels: Oswald 700, 45px (never below 42px) on small ink slips.
- Quoted words ("answer" words): Libre Baskerville 700, 87px on a newsprint slip with two torn ends.
- Key number: Anton 252px centred on a card strip, ink, with the highlighter swept across it as it lands.
- Counters: Anton 126px right-aligned on a strip that is rebuilt (cached per digit count) so it grows leftwards as digits are added. Show an integer snapped to multiples of 7 under `H.ease.inOutCubic` so the last digits look re-cut; a small italic unit word (51px) sits right of it.
- Text never fades or types: a slip drops in whole.

## Diagrams: arrows, labels, charts
- Route line: ink, 4.5px, round, dashed [15,10], drawn on with `H.partial`; a filled arrowhead (length 9 + 3*width px, +-155 degrees from the heading) appears when it completes. Return or error paths use the same line in red.
- Label: an ink slip dropped 15px from its object, a few degrees off level, after the object lands.
- Pin: a 24px grey stalk, a 12px red head with a white 40% glint and a small elliptical shadow; drops in with the 'slideD' step.
- Chart: a cream card with the 30px grid; axes 3.75px ink with open ends; tick labels Oswald 33px, axis title 700 39px; the series is a red marker line, dots of 7px on every fifth sample, a pin on the live point; a few early samples jitter by 4% of the height and settle.
- Wrong: red ring round the item, then a red cross (two 0.12 s strokes); the right answer arrives as a new slip with the highlighter and an ink tick.

## Motion
- Stepped arrivals on a 12 fps clock `tq = floor(t*12)/12`, four poses: drop = scale [1.16, 1.05, 0.985, 1], rotation [0.05, 0.015, -0.006, 0] rad; slide = offset [450, 165, 39, 0] px from a side with rotation +-0.04 -> 0. Nothing is visible before its start time; nothing eases.
- Camera, depth and speed are smooth in real `t`: each layer has a parallax depth `p` (zoom `z^p`, shift `cam*p`): ground fibre 0.2, flat sheets 0.45-0.55, back clippings 0.65-0.8, prints 0.85-0.95, headlines and strips 1.0-1.1, one blurred foreground scrap 1.5.
- Idle drift 14px/s sideways and +4% zoom over 2.5 s. A push-in onto the active area is 0.7 s of `H.ease.inOutCubic` to zoom 1.4.
- Highlighter and marker use real `t` (smooth), so smooth ink sits on top of choppy paper.

## Scene changes
Whip pan. Over 0.3 s the camera accelerates with `u^3` through about 1725px sideways (or 1350px vertically); the new scene is swapped in at the peak of the blur and decelerates in with a cubic ease-out. Blur from speed: `clamp((speed_px_s - 700) / 420, 0, 22)`.
- Render the scene to a scratch layer, blur it by `0.35 * blur`px, then composite 7 copies spread along the motion direction at offsets `(i/6 - 0.5) * blur * 2.6`, each at alpha `1/(i+1)`, over a cream fill.
- Alternative for the last scene: a new torn-top sheet slides up 1170px in 0.23 s with an upward shadow (rgba(40,28,15,0.45), blur 36px, y -9), the next scene drawn inside it.
- Stay continuous (just a push-in) when the next idea adds to the same desk.

## Finishing passes (run every frame, same strength)
1. Grain: four cached 256px tiles of `128 + (r()+r()+r()-1.5)*150` grey; pick tile `frame % 4` at a random offset, `overlay`, alpha 0.26, changing at 12 fps (`H.grain(ctx, t, {strength: 0.2, cell: 2, fps: 12, mono: true, blend: 'overlay'})`).
2. Warm vignette: `H.vignette(ctx, {strength: 0.28, color: '#4a3d30', inner: 0.45})`; corners end near rgb(228,225,219), never black.
3. Whip blur composite (above), only while the camera is fast.

## Sound palette
- element appears (a cutout is set down, 1-3 frames after it shows): a 70 ms brown-noise thump through a 650 Hz lowpass (`k.noise`, gain 0.32), a falling `k.tone` from 150 to 70 Hz (gain 0.1, 90 ms), and a bandpass 1.7 kHz paper tap (gain 0.07, 18 ms).
- slide in: `k.play('swish', t, {dur: 0.25, gain: 0.5})` or pink lowpass noise (f 800, gain 0.2, a = 35% of dur).
- label lands: the same set-down at gain 0.45, marked `minor`.
- tape stuck: a 0.22 s `k.play('tape', t, {gain: 1.0})` preceded by a 22 ms bandpass tick at 1.5 kHz.
- arrow / drawing: a 24 ms bandpass `k.noise` touch-down near 1.4 kHz (q 1.2, quiet, gain 0.24), then `k.play('stroke', t, {dur: drawLength, gain: 0.6})`; highlighter: `k.noise` pink bandpass f 1000 (gain 0.2, dur = sweep) under `k.play('stroke', t, {dur, gain: 0.45})`, soft and without squeak.
- scene change: `k.play('whoosh', cut - 0.38, {dur: 0.72, gain: 0.5})` peaking on the cut.
- wrong: `k.play('thud', t, {f: 95, gain: 0.45})`, `k.play('error', t + 0.12, {f: 'D3', gain: 0.32})`; right: highlighter plus `k.play('ding', t, {f: 'D5', gain: 0.32})`.
- key number: one `k.play('tick', ...)` per visible step at 12/s with `f` 2800 rising 12 Hz per percent, then `k.play('impact', t, {gain: 0.7})` and `k.play('ding', t + 0.01, {f: 'A4', gain: 0.35})`.
- takeaway: `k.play('success', t, {f: 'D5', gain: 0.4})` as the final highlight ends.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.35})`, `k.music(0, DURATION, {mood: 'calm', bpm: 70, key: 'D', gain: 0.22})`.

## Signature moves
- Cutouts land in four stepped poses while the camera never stutters.
- Yellow highlighter sweep across the one phrase that matters, then a red ring if something is wrong.
- A whip pan with a seven-copy blur hides every cut.
- A halftone print with torn edges and tape on two corners.
- Parallax: a deep red sheet, mid clippings, a blurred foreground scrap.
- Numbers as condensed digits on a paper strip that grows as digits are added.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Items fade or scale smoothly in | four-frame stepped pose on the 12 fps clock |
| Flat vector rectangles | torn `edgePoly`, two-layer shadow, fibre multiplied into every sprite |
| Photos are plain greyscale | rotated 45 degree halftone, vignette, dust and a scratch |
| Black drop shadows | warm brown rgba(40,28,15,a) only |
| Camera stutters with the paper | camera in real `t`; only arrivals use `tq` |
| Whip is a simple slide | blur, 7-copy streak and the scene swap at the peak |
| Highlighter is a flat rectangle | wobbled edges, streaks, pooled ends, `multiply` |

## Hero frame recipe
1. Ground #f0e9d9 plus the multiplied fibre sheet at depth 0.2.
2. A torn red sheet (#b8483a, 930x1350, right edge torn) at depth 0.5 on the right.
3. One halftone print (about 840x570 inside its border), torn right and bottom, rotated -0.022 rad, with two tape pieces on its top corners.
4. A newsprint clipping overlapping it at depth 0.95, rotated +0.03, with its deck phrase highlighted two thirds across.
5. Two Anton 168px strips at the lower left, the first ink-on-cream inverted, the second with a highlighter band.
6. A blurred foreground scrap (blur 7px) in the top corner at depth 1.5, and a red marker ring around one detail of the print.
7. Finish: grain at 0.2, warm vignette. Compare it to a photographed desk of paper: every edge casts a soft brown shadow and no edge is perfectly straight.
