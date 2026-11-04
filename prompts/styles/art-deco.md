---
id: art-deco
name: Lacquer and Gilt
family: Design movements
fonts: [Limelight, Poiret One]
best_for: grand, formal or aspirational subjects, rankings, milestones and "rise" stories, launches, finance, hotels and venues, anything that should feel like a title sequence from the 1920s
avoid_for: casual or playful topics, dense text, small captions, warm human stories, anywhere that needs red as a meaning
---

# Lacquer and Gilt

The viewer believes they are watching a poster from a 1920s picture palace come alive: black lacquer, and every drawn mark is stamped gold foil that catches one slow glint. Compositions are strictly symmetrical and built from stepped setbacks, fans and chevrons. Text is cream. Between scenes, heavy gold elevator doors close and open.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (lacquer) | #221a10, #0f0c08, #050403 | radial, centre of mass at (960, 630), radius 1230; stops 0, 0.5, 1 |
| Plaque black | #1a140c, #0d0a06, #070504; wheel #16120c | label plates, door panels, odometer wheels |
| Foil ramp | #6b4a16, #c99a3e, #f6e2a0, #fff6d2, #d6a948, #7d5719, #b8863a, #f3d98c, #fff3c8, #c08f36, #6e4c16 | 11 equal stops, two bright bands per frame |
| Dim gold ink | #c08a34 at 0.85 alpha | flat sunburst rays, behind everything |
| Plaque hairlines | #d9ab52, rgba(201,154,62,0.55), studs #e2b860 | outer rule, inner rule, diamond studs |
| Primary type | cream #efe3c4 | all words, needles, LEDs, digits |
| Accent / alarm | warm amber #ffcf8a | the single most important thing, the active step, a wrong answer; deco has no red |
| Bevel | rgba(0,0,0,0.85) below, #fff4cf above | emboss copies of every gold shape |

## Ground and surface
1. Lacquer: the radial gradient above across the full frame. Cache with `H.offscreen('lacquer', 1920, 1080, fn)`.
2. Foil base (cached once with `H.offscreen('foil', 1920, 1080, fn)`): a linear gradient from (0,0) to (1056, 1404) through the eleven foil stops; then brush it: multiply every row by `1 + 0.06*H.noise(6).n2(0.5, y*0.35)` and every pixel by `1 + (H.rng(6)() - 0.5)*0.09`. The foil never changes, it is only revealed through masks.
3. Two mask layers, cleared each frame: `M` (full foil) and `D` (dim rays). Everything gold is drawn as white shapes into these; nothing is drawn gold directly.
4. Static ornament, cached as a mask with `H.offscreen`: the stepped frame and corner fans (see Mark-making).

## Mark-making
**Gilding pass** (the whole look; run in this order each frame):
1. Lacquer ground.
2. `D` tinted #c08a34, drawn at alpha 0.85.
3. `M` tinted rgba(0,0,0,0.85), offset (+2, +3): the stamped-in shadow.
4. Foil base plus the moving sheen band, cut by `M` with `destination-in`. The sheen is a linear gradient 660px wide, from rgba(255,248,220,0) through 0.45 at its centre to 0, whose centre x travels from -600 to 2520 over 1.3 s with `H.ease.inOutCubic` (it ends just below the top, tilted: y range 0 to 432). Use it once on the opening title and once on the key moment; otherwise keep it off-screen.
5. Bevel light: `M` tinted #fff4cf, drawn at (-1.2, -1.2) with `screen` at 0.3 alpha.
6. Cream layer (text, LEDs, needles) on top, unstamped.

**Border.** A rectangle stepped at each corner: s = 51px, notch 0.4s. Two frames as one closed path each: outer inset 30px with a 4.5px line, inner inset 45px with a 1.8px line; reveal with `ctx.setLineDash([len*u, big])` over 1.1 s (inner frame 0.15 s later). Corner fans: three 2px arcs at radius 87, 105, 123 over a quarter circle, seven ticks from 87 to 123, one 9px diamond inside the fan. Diamond studs (10px) at the middle of each side. Pilasters either side of the centre (x = centre +- 705): triple fluted lines (6px centre bar, 2px side lines), a stepped capital and base, a fan crown of three arcs and seven blades, a diamond finial, five 5px beads; they grow upward from their base.

**Sunburst.** 40 wedges across the upper half circle from a point on the ground line, each 42% of its pitch wide, radius 1350, filled with a radial alpha ramp (0.55 at r=420, 0.22 at 0.6 of the way, 0.04 at 1140) drawn into `D`, with a disc of radius 450 knocked out of the centre. Opening: scale every wedge angle about straight up by `open` (inOut over 1.1 s), so the fan opens like a hand fan.

**Halo.** Four arcs at r = 375 + 27k (4.5px) and one at 495 (2.3px), each inscribed from both ends and meeting at the top over 0.8 s, each 0.08 s after the last. Twelve small blade triangles (r 456 to 495) pop on in mirrored pairs from the outside in, 0.07 s apart.

**Tiered tower** (the hero object, any subject made of repeated units). Six tiers, width `n*111 + 18` for n = 6 down to 1, heights 126, 117, 108, 102, 93, 84. Each tier: knock its body out of `D` and `M` first so rays stop at its edge; 4.5px outline; vertical pilaster bars (6px) between bays; fine lines every 13.5px inside each bay (1.8px); a stepped seven-point crown on the roof; three nested chevrons per side on each ledge. Tiers rise bottom-first from their own base (clip), 0.17 s apart, 0.22 s each with `H.ease.outCubic`. A spire (base 42px, height 99px) extends after, with four tick bars, topped by an eight-point star (arm lengths 33 and 18 alternating) that pulses `0.6 + 0.4 sin(3t)`.

**Lights.** On the right edge of each bay, one LED per fine line. Re-roll every 0.2 s (`step = floor(t*5)`): `H.rng(id*977 + step*13)` decides on (72%) and warm (25% amber, rest cream). Core 4.5px square, plus an additive 10px radial glow (alpha 0.4 cream, 0.55 amber).

## Type and numbers
- Titles: Limelight 126px, letter spacing 0.08em, cream or foil, one glyph at a time (0.05 s apart, 0.15 s fade). Second-level 69-90px.
- Labels: Poiret One at 45px (never below 42), spaced 0.18em, upper case, cream with a 0.035em stroke so the hairline face stays legible. Label plate: width text + 1.15em, height 1.25em, vertical gradient from the plaque blacks, #d9ab52 1.5px outline, inner rule at 4.5px, diamond studs 6px at both ends, shadow offset (2,4) at 55%.
- Key number: Limelight 144px, cream, centred above a plate holding two or three caption lines.
- Odometer for counts: 7 wheels, cell 105px tall and 65px wide, 9px gaps and a 24px gap per thousands comma, digits Limelight 0.82 of the cell. Each wheel is a #16120c box, digit and its successor drawn at `y - off*cell`; the units wheel turns continuously, higher wheels turn only in the last 10% of the cycle below (smoothstep 0.9 to 1). Leading zeros at 25% alpha. A top and bottom shade (black 0.6 to 0 at 30% and 70%). Frame: double gold rule, 3.5px and 1.5px, padded 12 and 21px. Value follows `u^3 * target` (slow then rushing), locked on arrival.
- Everything is centred or mirrored; never flush-left.

## Diagrams: arrows, labels, charts
- Arrow: a flat 6px shaft and three stacked miter chevrons (21px deep, half height 18px, 4.5px line, 13.5px apart), shaft stops 27px short of the tip. Grows with `H.ease.outCubic` over 0.4 s. Never a filled triangle.
- Cameo (an item in a list): octagon of radius 99px, 4.5px outline and a second at 0.86r (1.8px), a line-drawn pictogram in miter joins at stroke max(2.3, 0.06r). It rides a double gold rail (4.5px and 1.5px) with a 3px stem to the rail and a name plate under it; it shrinks to nothing over the last 15% of the rail.
- Steps in a loop: three 114px medallions (double circle, 3px and 1.5px) laid on an arc, each popping with `H.ease.outBack` 0.15 s apart; the active one thickens to 6px and its label goes amber.
- Gauge: 30 trapezoid rays between r=252 and r=480; unlit rays at 18% alpha; outer arc 4.5px at r+21, inner arc 2.3px at 234, baseline; scale marks 50 / 75 / 100 outside; a cream number inside the dial.
- Dial with needle: semicircle arc, nine ticks, baseline; cream needle 4.5px with a dot hub; while a value changes the needle goes amber and trembles `0.03*sin(30t)`.
- Wrong: a 39px medallion ring with a heavy cross (7.5px), a spotlight ellipse (3px) drawn round the guess over 0.45 s, amber label. Right: the same medallion with a tick.
- Signal travelling a path: a 39px additive radial bead (cream centre, amber edge) riding a quadratic curve for 0.55 s.

## Motion
- Everything gold enters by growing or inscribing: lines draw on, tiers rise, fans open, rings close; ease-out (`H.ease.outCubic`) for objects, ease in-out for fans, arcs and cameras of light, `H.ease.outBack` for medallions.
- The frame is always symmetrical: if something grows on the left, its mirror grows at the same moment.
- Idle: LEDs re-roll at 5 Hz, the beacon pulses, the odometer wheels creep, nothing else. The camera is fixed.

## Scene changes
Gold elevator doors. Two black panels (#0d0a06) close from the sides to the centre in 0.5 s (`H.ease.inOutCubic`), the scene underneath is swapped at the moment they meet (start + 0.55 s), then they open 0.65 to 1.15 s after the start. Each panel carries foil ornament cut from its own mask: a double frame inset 30px (4.5px) and 48px (1.8px), a fan of nine rays (length 345) anchored on the meeting edge, three arcs at r = 375 + 24k (3px), and six stacked chevrons top and bottom at 27px pitch. Gild them with the same foil, no sheen. Use doors for every change of idea; within a scene, build rather than cut.

## Finishing passes (run every frame, same strength)
1. The gilding pass: shadow, foil with sheen, bevel light.
2. Additive glows (LEDs, beacon, bead, flash) in `lighter` mode.
3. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 12, mono: true})`: lacquer grain.
4. `H.vignette(ctx, {strength: 0.45, color: '#000', inner: 0.55})`.

## Sound palette
- element appears: harp pluck = triangle `k.tone` at the note (pentatonic: C4 D4 E4 G4 A4 C5 D5 E5), `dur: 0.9`, `gain: 0.14`, `a: 0.002`, plus a sine an octave up for 0.25 s at gain 0.03; mark `minor`.
- label lands: a soft felt tap, 50 ms pink noise bandpass at 900 Hz, `gain: 0.24`; or a vibraphone note (sine, 1.4 s, gain 0.13, plus a copy at x1.003 for shimmer).
- arrow completes: `k.play('click', t, {f: 900, gain: 0.8})`.
- drawing: a 0.5 s brown-noise swell for something rising, a harp glissando across the notes for fans and halos, timed to the ease.
- scene change (doors): closing = 0.5 s brown-noise lowpass swell (f 250 then 600 then 250 in three chained bursts, gain 0.4) with a bandpass tick (700 Hz, q 3, 30 ms) every 55 ms; at contact `k.play('thud', t, {f: 85, gain: 0.45})` and `k.play('tock', t, {f: 260, gain: 0.3})`; at the reopen `k.play('ding', t + 0.65, {f: 'E5', gain: 0.6})` as the lift chime, then the same swell at 0.8.
- wrong: muted brass stab, three sawtooth `k.tone` pairs (detuned 0.5% apart) on C3, Gb3, Bb3, `dur: 0.45`, `gain: 0.03`, with `k.play('thud', t, {f: 100, gain: 0.5})`. right: four rising vibraphone notes (C4 E4 G4 C5) 60 ms apart.
- count (odometer): a tick per step = 20 ms bandpass noise at 2400 Hz (`q: 2`, `gain: 0.24`) and a triangle at 420 Hz for 30 ms, spacing `0.16 - 0.075*progress`.
- key number (the biggest hit): `k.play('impact', t, {gain: 1.7})`, `k.play('thud', t, {f: 70, gain: 0.7})`, five vibraphone notes (C3 G3 C4 E4 G4) 15 ms apart, a brass chord and 1.4 s of highpass noise at 5 kHz (`gain: 0.05`) as cymbal shimmer.
- takeaway: harp glissando up, then five vibraphone notes (C3 G3 E4 B4 D5) that resolve on the last word.
- bed or music: `k.bed(0, D, {kind: 'room', gain: 0.35})`, `k.music(0, D, {mood: 'calm', bpm: 76, key: 'C', gain: 0.45})`.

## Signature moves
- The foil glint: a single wide band sweeping across everything gold once.
- Stepped tower rising tier by tier while its LEDs wake.
- A sunburst that opens like a fan from straight up, with halo arcs closing at the top.
- Gold elevator doors between scenes.
- An odometer that rolls to the final number and locks.
- A gauge of 30 rays lighting up to the value, then a beacon flash.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Gold is a yellow fill | foil ramp with two bright bands, brushing, bevel pair |
| Everything glints at once | the glint is one band, used once per key moment |
| Off-centre layout | mirror every element about the vertical axis |
| Soft, rounded shapes | miter joins, stepped edges, chevrons, octagons |
| Red for wrong | amber label, medallion, brass tritone |
| Flat black | radial lacquer gradient, grain, 0.45 vignette |
| Text in foil everywhere | gild ornament and titles, keep body labels cream on black plates |

## Hero frame recipe
1. Lacquer radial ground.
2. Sunburst (40 wedges, open = 1) from a centre line at y = 810, halo arcs and twelve blades.
3. A six-tier tower on that line, spire and star.
4. Stepped double frame, corner fans, studs, two side pilasters.
5. Title in Limelight 114px, spacing 9px, centred at y = 942, with a rule and diamonds above it; a cream Poiret One 45px subtitle spaced 30px below.
6. Gilding pass with the sheen centred at x = 960 (halfway), then cream LEDs with glow and the beacon.
7. Grain and vignette. Check: the tower body must hide the rays, gold edges must show a dark shadow under and a thin light edge above.
