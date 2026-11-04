---
id: letterpress
name: Press Proof
family: Print
fonts: [Anton, Abril Fatface, Rubik Mono One, Bebas Neue]
best_for: announcements, history and craft topics, rules and principles, lists of steps, anything with a confident, old-world, "this is official" tone and short punchy words
avoid_for: long sentences, dense numeric detail, soft or playful tones, subjects that need photographic imagery
---

# Press Proof

The viewer believes each beat is a fresh sheet of cream rag paper pulled from a hand press, printed in two inks from loose wood and metal type. Every letter is its own block that took ink a little differently, the solids show wood grain and tiny voids, the ink is pushed out to the rims, and the type is bitten into the paper. Each new sheet is laid on the bed while the finished one is lifted away.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (stock) | #eee2c6 | warm cream, cloudy, with fibres |
| Primary ink (black) | #1e1b1a | opaque; covers anything under it |
| Accent (red) | #ce3a24 | transparent like real ink: over the stock it lands as #c0331c; the one word or number that matters |
| Alarm / wrong | #ce3a24 | the same red, as a rubber stamp; use rarely |
| Press bed | #26221e | only seen while sheets swap |
| Fibre dark / light | #785f3c / #fffaeb | 260 fibres at 10-30% alpha |
| Foxing and vignette | #966432 / #785528 | 22% spots; vignette 0.18 |

Two inks, never a third. Red is for emphasis and corrections; black carries structure.

## Ground and surface
Build once; cache with `H.offscreen`, then keep the pixels as an array.
1. Paper tone: multiply #eee2c6 per pixel by `1 + cloud*0.045 + mid*0.018 + streak*0.022 + (white - 0.5)*0.035`. `cloud` is 4-octave `H.noise(17).fbm2` at 0.004 per px; `mid` is `fbm2` at (0.023, 0.019 per px, 2 octaves); `streak` is `n2` at (0.107, 0.023) times a patch mask `0.5 + 0.5*n2(x*0.0067 + 40, y*0.0067)`, so fibre streaks are patchy. Evaluate the low fields on a 6 px grid and interpolate bilinearly. Warm drift: add `cloud*6` to red, `cloud*2.4` to green, subtract `cloud*3.6` from blue.
2. Fibres: 260 short curves from `H.rng(2026)`: random start and angle, length 6-33 px, one `quadraticCurveTo` bent 0.5 rad, half dark `rgba(120,95,60)` and half light `rgba(255,250,235)`, alpha 0.1-0.3, width 0.6-1.65 px.
3. Foxing: 14 radial spots, radius 3-13 px, #966432 from 22% to 0. Then `H.vignette(ctx, {strength: 0.18, color: '#785528', inner: 0.55})`.
4. Ink fields on a 427x240 grid (each cell 4.5 px, read nearest): `broad`: 3-octave `fbm2`, 0.05 per cell on both axes, for patchy ink. `fine`: 2 octaves at 0.6 per cell, for edge wear. `warp`: 2 octaves, 0.012 per cell across and 0.35 down (stretched, so it drifts the grain sideways). Plus a white-noise table from `H.rng` for dot-level randomness.
5. Everything per frame is the two formes and the compositor below. A finished sheet that is only waiting is static: cache it too.

## Mark-making
**Formes.** Two offscreen layers, black and red. Every item is a block drawn with `fillStyle = rgb(1, density*255, phase*255)`: alpha is the shape, green is how much ink the block took (letters 0.72-1.0, rules 0.85-1.0, ornaments 0.8-1.0), blue is the wood-grain phase (random 30-255 for big letters and cut blocks, 0 for small caps, rules, ornaments, stamps). Read the layers with `getImageData`.

**Setting type.** Type is fitted to the measure. Measure the cap height of "H" and every glyph width at a 200 px probe, then scale x by `targetWidth / (sum of widths + tracking)` and y by `capHeight / probeCap`. Each glyph is its own block with a baseline jitter of +-2.4 px and a tilt of +-0.006 rad (+-0.003 for small caps). Tracking 15 px for display, 45 px for wide mono caps.

**Registration.** Draw the red layer onto a second canvas rotated about the centre by +-0.0009-0.0015 rad (alternate the sign per sheet) and offset (+3.75, -2.25) px. Black stays put.

**Edge and ink pass (per pixel, for each forme, red first then black).** Blur the forme's own alpha by 2.4 px to get `ab`.
- Worn edge: coverage `clamp((min(a, 1.15*ab) - thr)*2.6 + 0.5)` where `thr = 0.5 + fine*0.45 + (white - 0.5)*0.2`.
- Density: `(0.25 + 0.85*blockDensity) * (0.97 + 0.22*broad) + (white2 - 0.5)*0.08`.
- Rim squeeze: `rim = clamp((a - ab)*3.5)`; `dens = dens*(1 - 0.5*rim) + 0.5*rim*max(dens, 1.06) + 0.12*rim`. Edges print solid and a touch heavy even when the face is grainy.
- Wood grain (blocks with phase): `g = sin((y + warp*60 + phase*45)*0.6 + sin(x*0.0067 + phase*9)*2.5)`; `dens *= 1 - 0.32*H.smoothstep(0.55, 1, g*0.5 + n2(x*0.0027 + phase*7, y*0.147)*0.8)`; stripes about 10 px apart.
- Voids: a pixel loses 75% of its density when a white value falls below a threshold of 0.004, raised by 0.35 times how far `broad` sits under -0.15 and by 0.2 times how far `fine` sits over 0.3.
- Result `cov * clamp(dens)`. Red multiplies the stock: `c *= 1 - cov*(1 - ink/255)`. Black blends: `c = c*(1 - cov) + ink*cov`.

**Deboss (before inks).** Blur the two formes' combined alpha by 3.3 px. `gA` is its value 12 px down-right minus 12 px up-left. Scale the pixel by `1 - max(gA,0)/255*0.14 - min(gA,0)/255*0.04`, then by `1 - 0.05*alpha`. The upper-left wall of every block goes 14% dark, the lower-right edge catches 4% light, the inside sits 5% lower. On an opening sheet ramp the whole effect from 35% to 100% over 3.4 s.

**Rules and ornaments.** A heavy rule 12 px with a thin rule 3.75 px sitting 9 px away, black, across the measure (x 87 to 1833) top and bottom of every sheet. Ornaments: a diamond (width 0.7 of height), a ten-point star (inner radius 0.42), cast wheels with spokes cut out with `destination-out`. A border of 17 diamonds, 51 px apart, sizes alternating 7.5 and 12 px.

## Type and numbers
- Four faces, one job each: Anton for the loud black word (cap height 285 px, a 1350 px measure), Abril Fatface in red for the second line (cap 225 px, 1230 px measure), Rubik Mono One for wide spaced captions and the running head (cap 45 px, tracking 33 px), Bebas Neue for labels (cap 45-69 px, tracking 12 px; font size is cap divided by 0.7).
- Everything is capitals except the display serif. One line, one measure; never wrap.
- Counter: Anton, cap 120 px, red or black, about 63 px of measure per character. It is re-set six times a second: rebuild the whole numeral at `floor(u*6)/6` steps with new random density, so it re-stamps rather than rolls. Value `max * u^2.3` with thousands separators.
- Key number: Anton cap 300 px on a 570 px measure, black; red rules (15 px and 4.5 px, 570 px long) bite in below it when it lands, with four red stars (radius 33 px) at the corners.
- Text arrives letter by letter, 0.025 s apart for long lines, 0.07-0.09 s for display words.

## Diagrams: arrows, labels, charts
- Arrow: 12 short rectangles set along a curve, each covering 62% of its slot, 10.5 px thick, locking in one after another over 0.3-0.55 s. The head is a solid triangle: tip 2.4x the thickness past the end, base 1.6x behind and 2.2x to each side.
- Label: Bebas Neue 45-69 px above or below the thing, in red for names, in black for verbs; always a block that kisses in 0.1 s after its object.
- Cut block (a picture): a solid rounded square 210-255 px (small conveyor items 60-90 px) with the drawing cut out in negative (`destination-out`), a border line 5% of the width cut 7% in from the edge, and a few thin lines left standing for detail.
- Chart: stacked blocks (75x42 px, 51 px vertical pitch, 96 px column pitch), one column every 0.17 s, each block 0.022 s after the last; the final two columns in red; a 7.5 px baseline rule.
- Wrong: a rubber-stamp frame (570x186 px, 15 px outline) holding wide mono caps (138 px), red, rotated -0.14 rad, landing at about 1.07x and settling to 0.75x scale in 0.2 s. It is stamped directly, no wood grain. Right: a red 24 px tick, butt caps, mitre joins.
- Loops: a return arrow set from rule pieces along the bottom, with a label.

## Motion
- Everything is a landing. A block is absent until its time, then appears at 1.14x scale and settles to 1 over 0.1 s (`H.ease.outQuad`).
- Order on a sheet: rules, black word, red word, ornaments, closing rules. Whole sheet in 1.5-2.5 s.
- Idle: ornament wheels rotate slowly (0.3-1.6 rad/s, neighbours counter-rotating). A conveyor of small cut blocks steps along an arrow five times a second, reset on each step.
- An opening sheet may push in 1 to 1.025 over 2 s (`H.ease.inOutSine`). There is no other camera.

## Scene changes
A new sheet per beat, 0.6 s. The press bed (#26221e) fills the frame. The finished sheet, frozen with all blocks landed, lifts off: `u = H.ease.inQuad(p)`, slides to (-2250*u, -390*u) relative to centre, tilts -0.12*u rad, grows to 1 + 0.04*u, with a shadow `rgba(0,0,0,0.45)`, blur `45*u + 6`, offset `27*u + 3`. A fresh blank sheet is already on the bed and settles from 0.97 to 1 (`outQuad`). Its first block lands 0.36 s after the swap starts. Use a continuous sheet only when a beat adds one more block.

## Finishing passes (run every frame, same strength)
1. Paper, deboss, edge, ink and grain are the compositor above; they run on every pixel.
2. Stray specks: 40 black dots, radius 0.75-2.4 px, alpha 0.2-0.6, scattered by `H.rng` (fixed seed), above everything.
3. No `H.grain`; the paper is the grain.

## Sound palette
A print shop. A "kiss" is the platen biting one block: `k.tone(t, {f: 150, glideTo: 72, dur: 0.08, gain: 0.3})`, a 40 ms bandpass `k.noise` burst at 650 Hz (q 1.2, gain 0.3, `a: 0.001`), and a 10 ms click `k.noise` at 1800 Hz, gain 0.08. Scale gains by block size.
- element appears: one kiss, pan from the block's x. Rule pieces: a 15 ms bandpass tick at 1500 Hz, q 1.5, gain 0.22.
- label lands: a small kiss at 0.4-0.5 gain inside `k.minor`.
- arrow completes: ticks on every second piece, then a kiss at 0.55 at the head.
- drawing / writing: one kiss per letter, 0.06-0.09 s apart, panned along the word, in `k.minor`.
- scene change: 14 tiny `k.noise` ticks over 0.16 s (bandpass 1700, gain 0.14 fading) for the tacky peel, a `paper` rustle 0.05 s later (dur 0.45, gain 1.1), a pink-noise lowpass sweep (f 600, gain 0.16), and a soft `slap` 0.24 s in (gain 0.3) as the new sheet settles.
- wrong / right: `k.play('stamp', t, {gain: 0.95})` then `k.play('error', t + 0.18, {f: 'E3', gain: 0.7})`; `k.play('success', t, {f: 'C5', gain: 0.55})`.
- key number (biggest hit): `k.play('impact', t, {gain: 1.1})` plus `k.play('press', t, {gain: 1.0})`, then four small kisses 0.06 s apart.
- takeaway: `k.play('press', t, {gain: 0.6})` then `k.play('ding', ...)` on C4, G4, C5, E5, 0.06 s apart, gain 0.36 falling by 0.05.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.22})`. Counter re-stamps: a kiss at 0.5 on each sixth of a second.

## Signature moves
- Letters thump in one by one at 1.14x and settle, with the paper dented beside each.
- The big red word out of register by a few pixels against the black.
- Counters that are re-stamped six times a second.
- Rule-piece arrows locking up piece by piece.
- Sheets lifted off and carried away, a fresh one dropped on the bed.
- A rubber-stamp WRONG-style correction at an angle, red, oversized then shrunk.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Letters look like a font | per-glyph density, jitter, wood grain on the big ones, rim squeeze |
| Ink is flat black | density below 1 on faces, solid 1.06 rim, voids |
| No sense of pressure | the deboss pass, shadow upper-left |
| Red sits perfectly on black | 3.75 px offset and a small rotation on the red forme |
| Type is neatly kerned | fit each line to a measure with a stretched glyph scale |
| Scene change is a fade | lift the sheet off the bed with shadow |
| Colours beyond red and black | emphasis only in red; the stock is not a third ink |

## Hero frame recipe
1. Cached paper, fibres, foxing, vignette and ink fields; press bed behind.
2. Black layer: heavy and thin rules at the top (y 60 and 81), a word in Anton cap 285 px on a 1350 px measure at baseline 450, a spaced Bebas Neue caption below it (cap 80 px, measure 1200 px, tracking 27 px).
3. Red layer: a small Rubik Mono caption (cap 38 px) over the word, a line of Abril Fatface cap 147 px at baseline 672, a row of 17 diamonds at y 885, rules at the bottom.
4. Offset red by (+3.75, -2.25) px with 0.0015 rad rotation.
5. Compute deboss, then red, then black passes; add 40 specks.
6. Check against a real print: the black letters have paler grainy faces with darker rims, the red does not line up with the black, a shadow runs along the upper-left of every letter.
