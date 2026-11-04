---
id: cross-stitch
name: Counted Cross-Stitch on Aida
family: Paper & craft
fonts: []
best_for: gentle, human, step-by-step explanations; checklists, growth over time, bar charts that "get built"; cosy, patient, giftable tone; anything where making things slowly is the point
avoid_for: fast, urgent or high-tech topics, fine detail or small text, big photographic subjects, anything needing smooth curves or gradients
---

# Counted Cross-Stitch on Aida

The viewer believes they are watching a sampler being stitched on cream aida cloth stretched in a wooden embroidery hoop. Every pixel of the design is a real X of two-strand floss, all top legs leaning the same way, with dark backstitch lines laid hole to hole. A steel needle hovers at the newest stitch with its thread trailing, and the cloth slides through the hoop to reveal the next motif. Quality that sells it: stitches are small physical objects with shadow, sheen and twist, never flat squares.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (aida) | #eee6d3 | multiplied by the weave texture; holes darken it ~40% |
| Primary ink (backstitch outline, axes) | #3d3548 | also #2a2433 for the darkest lines and face details |
| Accent (key number, "the system") | #c43a46 | red floss; the single most important thing |
| Blue floss | #2e3760 | titles, secondary text |
| Teal floss | #5fb3a9 | shadow side #3f8c86; labels, bars |
| Gold | #f2c14e | numbers while counting, alternate bars |
| Orange / brown | #ef8a3c / #a8673c | warm motifs; dark brown #5e3a22 |
| Pink | #e98aa0 | shadow #c4566f |
| Green (right) | #4f9a52 | ticks, "correct" |
| Grey | #dfe3e8 / #9aa0a8 | highlights, quiet axis words |
| Wood | #d9b07a to #ecc994 | hoop ring; edge tones #a8794a, #9b6b3e |
| Cast shadow | rgba(40,25,10,0.3-0.5) | warm brown, never black |

Colours keep a fixed meaning per video. No gradients inside a motif: only flat floss colours, because that is how a chart works.

## Ground and surface
Work on a chart grid of 18px cells (106 x 60 cells on 1920x1080); every motif, letter and bar is placed in cell coordinates and converted with `x = col*18 - cam`, `y = row*18`. Hoop: centre (960, 558), inner radius 822, rim width 45, so the cloth fills the frame and only the left and right rim show.
1. **Aida tile** (cached): an 18x18 brightness tile repeated across the cloth. With `dx`, `dy` the distance in px from each pixel to the nearest cell edge: `hole = exp(-(dx*dx+dy*dy)/4.3)`, `groove = 0.5*exp(-dx*dx/2) + 0.5*exp(-dy*dy/2)`, brightness `1 - 0.42*hole - 0.13*groove + 0.06*thread`. Holes sit at cell corners. Each cell has four 9px quadrants; thread runs horizontal in two diagonal quadrants and vertical in the others (basket weave), as a cosine stripe of period 4.5px plus a weak 9px ripple. Bake a strip 1944px wide (108 cells) with `H.offscreen`, adding per-cell tone noise `H.rng(2024).gauss()*0.018`; tint every pixel by `#eee6d3`.
2. **Scrolling:** draw the strip twice at `-(cam mod 1944)` and `+1944` so a long sampler never shows a seam.
3. **Loose fabric outside the hoop** (cached, screen space, never scrolls): multiply by `0.78 + 0.11*fold - min(0.14, (r - 822)*0.00047)`, `fold = 0.5*sin(angle*38 + 4*noise) + 0.6*noise2` using `H.noise(11)` at scales 0.0067 and 0.004; this gives radial puckers.
4. **Light:** each frame a radial gradient from (705 + 18t, 420, r 75) to (960, 558, r 990): rgba(255,250,235,0.18) to rgba(60,40,20,0.12).
5. **Order per frame:** cloth, light, stitches, backstitch (clipped to the circle r = 816), floss and needle, cached hoop, vignette, grain.

## Mark-making
**Cross stitch (one cell).** Two legs, each drawn with the same recipe; the under leg `/` first at 90% brightness, the top leg `\` second, always in that direction. Legs run from 1.5px inside one cell corner to 1.5px inside the opposite corner. Pseudo-code per leg:
```
shadow: stroke p0->p1 offset (1.05, 1.65), rgba(40,25,10,.32), 8.7px, round caps
for s in [-1, +1]:                       // two strands
  o = normal * s * 1.9
  gradient along the leg: 0 -> rgb*.55, .22 -> rgb*1.08, .5 -> (s<0 ? rgb*1.22+18 : rgb*1.08), .78 -> rgb*1.08, 1 -> rgb*.55
  stroke p0+o -> p1+o with it, 4.35px
  twist: every 3.45px from 3.3 + 2.25*r(), a 1.05px slash +-1.95 across, +-1.2 along, white at 0.12-0.26
```
The dark ends are the thread dipping into the holes; the lit middle is the bulge. Each stitch gets 1 of 5 variants (`H.rng` seeded by colour and variant), brightness 0.96-1.04, position jitter +-0.4px. Cache every colour/variant/half combination with `H.offscreen`.

**Half stitch.** For the first 0.06 s after a cell's time only the under leg exists, then the top leg completes it: a stitch is visibly made in two moves.

**Backstitch** (outlines, axes, arrows, rings). Each segment is one cell edge or one diagonal long, inset 3px at both ends so the hole shows between neighbours. Passes: (1) shadow rgba(20,10,5,0.3), 5.4px, offset (1.2, 1.95); (2) two parallel strands at +-1.2px, first pass 4.65px in colour*0.6, second 3.15px in the floss colour; (3) twist slashes every 3.9px, 1.05px, rgba(0,0,0,0.22); (4) sheen: one 1.1px line on the lit strand (offset -1.5px) in the colour mixed 55% to white at 80% alpha; for metallic floss break that line into dashes (4.5 on, 6 off).

**Running stitch** (emphasis ring): the same backstitch segments, every second one skipped, around an ellipse of 30 segments (322 x 202px), starting at -2 rad.

**Fills** are stitched cell by cell in chart order, never flat: large blocks run a forward pass of under legs (left to right) and a return pass of top legs (right to left) per row. Text and icons run column by column; bars run bottom to top.

## Type and numbers
- No web font. Letters are stitched from bitmap charts: a 5x7 sampler capital (headlines, 126px tall; A-Z, ? and comma) and a 3x5 font for labels and numerals (90px tall; A-Z, 0-9, % ? , >; M and W are 5 wide, N 4 wide). One empty column between glyphs. The key number uses the 3x5 font at scale 2 (each pixel is 2x2 cells, 180px tall).
- Colour by meaning: headline red then blue; labels teal; counting numbers gold; landed number red.
- A word is stitched in about 0.3-0.75 s at 130-200 cells per second, column by column.
- Numbers are re-stitched: snap the value to a 6 fps clock (`Math.floor(t*6)/6`), draw the whole numeral as already-finished stitches (time 0) every tick, so digits visibly change. Large counts: `n = 1e6 * u^2` with commas; percentages in half-point steps.

## Diagrams: arrows, labels, charts
- Arrow: a straight backstitch shaft one cell per segment, revealed one stitch at a time (0.3-0.6 s), then a chevron head of three corner-to-corner points drawn as two or three diagonal stitches.
- Label: 3x5 text stitched under or beside the motif after the motif completes, 1-2 cells of clear space.
- Chart: axes as backstitch polylines (#3d3548); bars 4 cells wide, 2 cells apart, height `value*0.22` cells, stitched bottom up in 0.24 s each, alternating gold and teal, the last bar in red. Axis words in 3x5 teal and grey.
- Loop: backstitch arrows between labelled motifs and a backstitch rounded rectangle for a bubble.
- Wrong: a 7x5 red X motif plus a red running-stitch ring around the guess, then a red return arrow. Right: a 9x5 green tick.
- Emphasis on a final value: 8 radial rays of backstitch (258-300px by 111-138px from its centre) appearing at 24 per second.

## Motion
- Nothing tweens. Every mark has a start time; the frame shows exactly the stitches whose time has passed. Ease only the cloth slide.
- Outlines are revealed like a clock hand: a silhouette edge cell shows when `t >= t0 + angle/(2*pi)*(t1 - t0)`, angle measured around the shape's centre starting at the top, over 0.65 s.
- Needle: the newest stitch (largest time already passed) is the anchor. Floss runs from its corner as a cubic curve (control points 54px right and 90px down, then 54px right and 105px down of the needle) to the needle eye 96px along the needle. Needle at (anchor + 96, anchor + 45), angle -0.5 rad, 114px long, tip down.
- Between beats: the light drifts (centre x moves 18px per second), grain runs at 12 fps.

## Scene changes
Slide the cloth: `cam` eases with `H.ease.inOutCubic` by exactly one screen of chart (1800px = 100 cells) in 0.5-0.7 s, rounded to whole pixels; stitches outside r = 816 are not drawn, so motifs travel under the hoop rim. Start the next motif 0.05-0.1 s after the slide settles. Cut the thread (see Sound) only at the very end. Stay in the same view when the next idea extends what is stitched.

## Finishing passes (run every frame, same strength)
1. Cached hoop overlay: cast shadow on loose fabric (blur 27, offset (7.5, 13.5), 45% brown), inner shadow on the taut cloth (black 60px stroke at r 852 clipped inside, blur 33, offset (9, 15), 50%), wood ring with a radial gradient (#a8794a, #d9b07a 0.15, #ecc994 0.45, #d2a46c 0.8, #9b6b3e), 70 grain arcs (0.75-2.4px, 70% dark brown at 12-30%, 30% cream at 15-30%, 0.2-1.4 rad long with a 1.8px wobble), a lit top edge (arc 0.95 pi to 1.75 pi, rgba(255,240,210,0.6), 1.8px), inner rim line rgba(90,55,25,0.7), 2.25px.
2. `H.vignette(ctx, {strength: 0.35, color: '#321e0a'})`.
3. `H.grain(ctx, t, {strength: 0.02, cell: 1, fps: 12, mono: true})`.
4. Stitch shadows and sheen are already baked in the sprites; do not add a global glow.

## Sound palette
Needle and floss, cloth, wood. Count stitching sounds per window, not per cell.
- element appears / drawing: a needle pass every 0.1 s (merge overlapping windows, minimum spacing 0.085 s): `k.noise(t, {filter: 'bandpass', f: 950, q: 1.4, dur: 0.02, gain: 0.34, a: 0.001, minor: true})`, `k.noise(t, {color: 'brown', filter: 'lowpass', f: 420, dur: 0.035, gain: 0.24, a: 0.001, minor: true})`, then floss `k.noise(t + 0.025, {filter: 'bandpass', f: 1400, q: 0.9, dur: 0.075, gain: 0.2, a: 0.04, minor: true})`. Pan by the stitch's screen x: `clamp(x/1920*2 - 1, -1, 1)*0.6`. Backstitch uses `f` x0.8.
- label lands: one pass at gain 0.7.
- arrow completes: one pass, gain 0.9.
- scene change: cloth drag, `k.noise(t, {color: 'pink', filter: 'bandpass', f: 560, q: 0.6, dur: d + 0.1, gain: 0.13, a: d*0.45})` plus brown lowpass at 300 Hz (gain 0.09).
- wrong: a brief 1300Hz bandpass thread pull at gain 0.25 and 0.15s duration, followed by a quiet hoop knock. Under it use a triangle D3, then A2 after 0.12s. The corrected stitch gets k.play('success', t, {gain: 0.45}).
- key number: re-stitch ticks as single passes (at most 6 per second, gain 0.5), then the hoop knock: `k.tone(t, {f: 150, glideTo: 80, dur: 0.2, gain: 0.35})` with `k.noise` bandpass 600 Hz, q 2, dur 0.05, gain 0.25, then `k.play('impact', t, {gain: 1.2})` and `k.play('ding', t, {f: 'E5', gain: 0.6})`.
- takeaway: scissor snip, two 25-35 ms bandpass noises at 2300 Hz then 1800 Hz (0.04 s apart, gain 0.3), then `k.play('ding', ...)` on C4, G4, E5, 0.09 s apart, gain 0.46 falling by 0.04.
- bed or music: `k.bed('room', 0, DURATION, {gain: 0.4})` and `k.music(0.2, DURATION - 0.2, {mood: 'dreamy', bpm: 60, key: 'F', gain: 0.22})`.

## Signature moves
- The needle sits on the newest stitch and the floss trails behind it.
- Each cross is made in two moves: the under leg appears, then the top leg.
- A backstitch outline sweeps round a finished motif like a clock hand.
- Numbers are re-stitched at 6 fps instead of counting smoothly.
- The cloth slides through a fixed hoop from motif to motif.
- A red running-stitch ring marks the wrong answer; the thread is snipped at the end.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat coloured squares | the full leg recipe: shadow, two strands, end darkening, twist |
| Top legs lean both ways | every top leg is `\`, every under leg `/` |
| Clean vector outlines | backstitch with 3px gaps between stitches, strands and shadow |
| Plain white or beige background | aida tile with holes, grooves, basket weave, per-cell tone |
| Hoop looks pasted on | cast shadow on the loose cloth and an inner shadow on the taut cloth |
| Smooth tweens | time-stamped stitches; only the cloth slide eases |
| Tiny unreadable text | use the 3x5 font at 18px cells (90px tall) or scale 2 |

## Hero frame recipe
1. Cached strip of aida at cam 0, loose-fabric shading outside r 822, light gradient.
2. A 5x7 headline in red then blue across cell rows 8-14, fully stitched.
3. Below it a 24 x 18-cell motif of 4-5 flat floss colours, completed top to bottom, with a half-finished last row (under legs only).
4. A backstitch outline in #3d3548 half-way round the motif and a 3x5 teal label under it.
5. Needle and floss anchored at the last stitch.
6. Hoop overlay, vignette, grain. Check: one stitch zoomed to 400% shows two strands, a dark end at each hole, a bright middle and tiny twist ticks.
