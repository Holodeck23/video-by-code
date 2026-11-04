---
id: sticky-notes
name: Cork Board
family: Paper & craft
fonts: [Permanent Marker, Kalam, Caveat, Gloria Hallelujah]
best_for: brainstorms, plans, "how it fits together" overviews, cause and effect chains, workshops, friendly and human topics
avoid_for: precise data, formal or luxury tone, anything where handwriting undermines authority
---

# Cork Board

The viewer believes they are looking at a real cork wall covered in sticky notes, index cards and tape, linked with red yarn from pin to pin, written by hand with a felt marker. Things are slapped onto the wall one by one with a small bounce; a warm lamp lights it from the upper left, and the camera travels from one cluster to the next along the yarn.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Cork light / dark | #d6aa70 / #b0804e | pore colour #784e28 |
| Frame wood | #7a4e2a, #9a6a3c, #5a361b | gradient stops 0 / 0.4 / 1 |
| Note yellow | #fbe36a | the default note |
| Note pink / orange / green / blue | #ff8db5 / #ffb04f / #b6e27a / #86d0f2 | variety only; colour carries no meaning |
| Index card | #fbfaf3 | cards, chart paper; instant photo #f7f5ee |
| Primary ink | #1b1f29 | all main handwriting |
| Annotation blue | #1f3c8f | side remarks and units |
| Accent / alarm | #c3202a | strikes, rings, arrows that matter, the single most important thing on screen |
| Right | #1d7a33 | corrected word, tick, final value |
| Yarn | #a8121b body, #d8323a core | red thread |
| Pins | #d22b2b, #2a62c9, #f0c419, #f2f2ee, #3fae4a | any, as variety |
| Tape | rgba(232,218,170,0.62) | translucent |

## Ground and surface
Bake once with `H.offscreen('cork', 3200, 1600, fn)` and draw it at scale 1.5 times the camera zoom. Per pixel (seed `H.noise(12)` and `H.rng(9)`):
1. `g1 = n2(x*0.21, y*0.21)`, `g2 = n2(x*0.55+40, y*0.55)`; `v = clamp(0.5 + 0.8*g1 + 0.45*g2 + (rand - 0.5)*0.3)`. Colour is the lerp of #b0804e to #d6aa70 by v.
2. Pores: where g2 > 0.42, mix toward #784e28 by `clamp((g2 - 0.42) * 5) * 0.85`; also 5% of pixels get a 0.6 mix at random.
3. Luminance scale `1 + 0.1*n2(x*0.006, y*0.006) + (rand - 0.5)*0.12`, so the board has slow warm and cool patches and 1px granules.
4. 260 old pin holes at random: radius 0.9-1.8px, dark rgba(40,20,5,0.6), plus a tiny highlight rgba(255,230,190,0.18) offset up-left.
5. Frame: 26px strips (top, bottom, sides) in a 3-stop wood gradient across their width, with 10 wavy grain lines (rgba(60,30,10,0.35), 0.9px), then an inner shadow along the cork edge (8px stroke rgba(20,10,0,0.35), blur 5px).
Per frame, only the notes, yarn and lamp are drawn.

## Mark-making
**Sticky note.** A square 118-250 board units (about 180-375px at working zoom), rotated by `rot` of +-0.03 to 0.12 rad. Passes, in order, all inside the note's own transform:
1. Soft shadow: the note's outline offset by (+3, +5), widening toward the bottom by 6 and 10 times `lift`, blur 7px, rgba(40,20,5,0.42). A tight second shadow, blur 1.5px at alpha 0.3, along the top edge.
2. Paper: top edge straight, bottom edge a shallow curve that rises by `5 * lift` at the corner (`lift` is 0.5-1.4 times 1.35). Fill the note colour.
3. Clip to the shape: paper grain (a 160px tile of 200 +- 25 grey with horizontal streaks from `n2(x*0.4, y*0.05)`) multiplied at 0.16; an adhesive band over the top 20%, a slightly darker band (rgba(90,60,0,0.07) down to 0.05, with a pale rgba(255,255,255,0.10) lower edge); curl shading over the lower half (a gradient 0, pale rgba(255,255,240) at `0.14*lift` at 55%, dark rgba(60,30,0) at `0.1*lift` at 85%, `0.2*lift` at the edge); a corner lift radial at the bottom right (rgba(60,30,0, 0.16*lift) fading by 0.45 of the width); a lamp falloff diagonal from rgba(255,255,255,0.10) to rgba(0,0,0,0.06).
4. Outline rgba(80,50,10,0.18), 1.2px. If a pin is used, shift the writing down 8 units.

**Handwriting.** Per word: baseline jitter +-2 units, rotation +-0.045 rad, line start jitter +-4; word spaces at 90% of a space. Draw each word twice, a ghost at 35% alpha offset (0.7, 0.5) for marker bleed, then the word at 93%. Seeds come from `H.rng(seed)` so a line never changes between frames.

**Marker line.** Round caps and joins, alpha 0.9, each point offset by +-0.8 from a seeded `H.rng`; widths 3-4px for doodles, 7-10px for arrows, 6-9px for strikes and rings. Doodles are simple, made of a few of these lines, never filled.

**Index card.** #fbfaf3 rectangle, shadow blur 6px at 0.4 offset (4, 8), grain multiply 0.12, a red margin rule at 40px from the top (rgba(220,60,70,0.7), 1.4px) and blue rules every 19px (rgba(80,140,210,0.5), 1px). Hold it with two tape pieces at the top corners and one at the bottom.

**Tape.** A 78-90 x 26-30 strip rotated +-0.55-0.7 rad, its short ends jagged (8 points, each pulled in 0-3.5px). Shadow offset (2, 3) blur 2px at 0.18, fill rgba(232,218,170,0.62), 40 pale streaks (4-18 x 1px, alpha up to 0.12), and a gradient from rgba(255,255,255,0.25) to 0 to rgba(120,90,30,0.12).

**Pin.** Head: a collar of radius 16 (radial gradient: colour mixed 35% to white at the top-left, the colour, then 50% black), a dome of radius 11 at (-1.5, -3) with a white 95% specular. Shadow: a blurred ellipse (blur 3px, rgba(30,15,0,0.45)) offset (13, 18), plus a short needle shadow (1.6px, blur 1px) running down-right.

**Yarn.** A quadratic curve between two pin centres with a sag of 40-90 units. Passes: shadow (blur 4px, rgba(30,10,0,0.4), offset (5, 9)), body #a8121b at 5px, core #d8323a at 3px offset (-0.4, -0.5), pale twist dashes rgba(255,150,140,0.75) (1.5px, dash 3 on 5 off), dark twist dashes rgba(90,0,0,0.5) offset by half a period, and six stray fibres 4-6px long. The sag swings +-2.5px on `sin(1.6t + k)` so the yarn breathes.

## Type and numbers
- Titles and key words: Permanent Marker. Small-note titles 34-42 board units (about 51-63px at working zoom), card titles 54-62 units, hero numbers 80-116 units (never below 96px on screen). Annotations in blue: Kalam 700 or Caveat 700 at 34-48 units. Side remarks: Gloria Hallelujah at 22-26 units, at most one per note.
- Story-critical labels never fall below 42px on screen at their zoom: units >= `42 / (1.5 * zoom)`.
- Write-on: reveal a clipped rectangle left to right over 0.25-0.55 s, like a marker moving.
- Numbers are crossed out and rewritten: keep the last two or three values stacked, the older ones small (28 units, 60% alpha) with a red strike (7px, +-3 degrees of tilt), the newest big, written on in 0.25-0.3 s. The final value is in green and gets a red ring.
- A word is wrong: two slashes of 9px red, then the corrected word in green with a three-point tick.

## Diagrams: arrows, labels, charts
- Arrow: a marker polyline with 20 points, drawn on by point count over 0.3-0.4 s; the head, two 33px strokes at +-0.54 rad off the line, appears after the shaft ends. Red arrows for important flows, ink for ordinary ones.
- Link between regions: yarn between pins, drawn over 0.8-0.9 s while the camera starts to travel.
- Label: written on the note itself, never floating, one note per concept.
- Chart: a ruled card with two marker axes (5px, with heads), a red curve drawn point by point over 1.4 s, with round dots every eighth of the way, axis values in Kalam at the ends; a separate sticky note holds the live value.
- Emphasis: a red ellipse of marker, 1.05 turns, drawn over 0.3-0.35 s, overshooting the start.
- Sliders and dials: re-posed on the 12 fps clock with tiny marker ticks at the ends of the knob while it moves.

## Motion
- Slap: `scale = 1 + 0.32 * (1 - H.ease.outBack(a))` over 0.3 s, `a` from 0 to 1. While big the note is "in the air": its shadow blur grows by `(scale - 1) * 40px` and moves down-right by `(scale - 1) * (50, 70)px`, and its alpha drops. It touches the wall at about 0.11 s.
- Pin: lands 0.32 s after its note; the head scales from 1.9 to 1 with a quadratic ease over 0.14 s.
- Sequences: a group of small notes slaps on 0.1-0.13 s apart; a big card 0.3 s before its pin.
- Camera: a big board (3200 x 1600 units); keys `[time, cx, cy, zoom]` with zoom 0.56 to 1.25; zoom is interpolated in log space, position linearly, `H.ease.inOutCubic`, moves of 0.8-1.3 s, holds of 1.5-4 s, centre clamped so the frame never leaves the cork. Zoom out to 0.56 only for the final reveal.
- Idle: yarn sag swing, a note or two with a lift that swings 0.6 +- 0.3 on `sin(2t)`, grain.

## Scene changes
No cuts and no erasing. Pull yarn from the last pin of one cluster to the first pin of the next; the camera starts moving as the yarn starts and arrives as the first new note slaps down. Old clusters stay on the wall, which is what builds the finished picture. The last move pulls back to show the whole board and slaps one big takeaway note in the middle.

## Finishing passes (run every frame, same strength)
1. Lamp (screen space): radial gradient from (0.26W, 0.17H) r 75 to (0.31W, 0.28H) r 1650: rgba(255,240,210,0.18) to 0 at 50% to rgba(40,20,0,0.3).
2. `H.vignette(ctx, {strength: 0.35, color: '#1e0f00', inner: 0.55})`.
3. `H.grain(ctx, t, {strength: 0.04, cell: 2, fps: 12, mono: true})`. The warm, visible grain is part of the look.
4. Note shadows, pin shadows and yarn shadows are live and drawn with their parts, not as a final pass.

## Sound palette
Office with a cork wall; pan follows the object's screen x, at most +-0.6.
- element appears (note slap, at slap start + 0.11): `k.play('slap', t, {gain: 0.3 + 0.2*size})` plus pink lowpass `k.noise` (f 450 + 250*size, dur 0.08, gain 0.25 + 0.2*size) and a `k.tone` thud from 150 Hz to 65 (use `glideTo`), dur 0.1; size 0 for small notes and 1 for a big card.
- label lands (pin seats, slap start + 0.14): bandpass `k.noise` f 1300 q 1.6 dur 0.035 gain 0.3 plus `k.tone` 260 with `glideTo: 140`, dur 0.07, gain 0.16.
- arrow completes: a marker stroke at gain 0.8-1.1.
- drawing / writing: touch-down tick (bandpass f 1500 dur 0.02 gain 0.18) then `k.play('stroke', t, {dur: strokeLength})`, one stroke per word, timed by the word's position inside the write window. Tape: `k.play('tape', t, {dur: 0.12, gain: 0.5})`.
- scene change (yarn pulled): pink bandpass `k.noise` f 700 q 0.9 gain 0.08 across the yarn time; at the end a triangle `k.tone` A2 (0.35 s, gain 0.12) plus a sine A3 (0.2 s, gain 0.03).
- wrong: two slashes as marker strokes at gain 1.6, `k.play('error', t, {f: 'F3', gain: 0.55})`.
- right: `k.play('success', t, {f: 'G5', gain: 0.6})` as the tick completes.
- key number: `k.play('impact', t, {gain: 1.35})`, `k.play('ding', t + 0.03, {f: 'E5', gain: 0.45})`, and a marker tap `k.play('tock', t, {f: 300, gain: 0.45})` for a full stop.
- takeaway: `k.play('ding', ...)` at C5, E5, G5, 0.08 s apart, gains 0.38, 0.32, 0.26.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`.
- Never start a noise at exactly a sample boundary (a click can spike): add a quarter of a sample, `(Math.round(t * 48000) + 0.25) / 48000`.

## Signature moves
- Notes slap on large and settle with a bounce, shadow shrinking as they land.
- Red yarn unspools between pins, and the camera follows it to the next cluster.
- Numbers get struck out and rewritten by hand, with the newest giant.
- A red marker ring closes around the key moment and overshoots.
- A taped index card for the title, ruled and with a red margin line.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Notes are flat squares | curl bottom edge, adhesive band, curl shading and corner lift on every note |
| Handwriting is a clean font | per-word jitter, a 35% ghost pass, a seeded rhythm |
| Cork is a brown gradient | per-pixel granules, pores, slow luminance patches, old pin holes |
| Shadows are identical | bigger and softer while a note is in the air |
| Yarn is a red line | five passes: shadow, body, core, twist dashes, fibres |
| Everything the same yellow | five note colours, rotations of up to 0.12 rad |
| Marker strokes look vector | seeded 0.8px jitter and 0.9 alpha |

## Hero frame recipe
1. Cached cork at 3200 x 1600 with pores, pin holes and a wood frame; lamp radial over it.
2. A taped index card (330 x 190 units, rotated -0.02 rad), title in Permanent Marker 30 units, one blue Caveat line below, a red underline.
3. Six sticky notes around it in five colours, rotated between -0.07 and 0.12 rad, each with a short Permanent Marker title and one doodle; two with a pin and a lifted corner.
4. Three yarn links between pins with 40-55 unit sag and a second yarn half drawn.
5. One note mid-slap at scale 1.2 with a large soft shadow; one red ring half-closed around a word.
6. Vignette 0.35, grain 0.04; compare with a photograph of a real board: the shadows under the notes must differ by lift.
