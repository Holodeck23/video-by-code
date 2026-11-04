---
id: string-art
name: Nail and Thread
family: Generative & type
fonts: [Caveat]
best_for: networks and graphs, weights and connections, geometry, "curves from straight lines", counting and progress, maker or workshop tone, anything that is literally a set of points joined by links
avoid_for: photographic realism, dense text, tiny or fine detail, fast comedic energy, anything that needs smooth gradients
---

# Nail and Thread

The viewer believes the diagram is physically strung on a long stained walnut board: brass nails are the points, taut cotton thread is every link, and every curve is an envelope that emerges from straight chords. Thread floats a little above the wood, so each line carries a soft shadow and a bright sheen. Labels are kraft tags nailed on and big words are burned into the wood with a hot pen.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (walnut) | #321b0e / #744627 / #ba804e | dark, mid, light ends of the grain ramp |
| Seam and shadow | rgb(15,6,2) | butt joints at 55% alpha, thread shadows 10% and 30% |
| Primary thread | #efe3c8 | links and arrows; network threads #f4ead2 |
| Silver thread | #c9ccd2 / #d4d7dc | scaffolding, axes, bases |
| Accent (gold thread) | #ffc93a | the active path, counters and the single most important thing |
| Glow orange | #ff8c2a / #e8702e | secondary wound layers and bloom |
| Alarm / wrong | #d8322a | red thread rings and error paths; red kraft #d0503a to #b23a28 |
| Right / result | #ffc93a | the corrected path turns gold; its tag is red kraft with a check |
| Brass nail | #fff6dc, #d8c08a, #8c6d3a, #3d2c14 | head gradient stops 0, 0.25, 0.7, 1 |
| Kraft tag | #d4b27a to #c09858 | tag text #2a1307; picture card #ead9b4 |
| Burn | #1c0a03 core, rgb(214,150,80) toast, rgb(40,16,4) halo | pyrography |

## Ground and surface
Bake one 1920x1080 board strip with `H.offscreen('board', 1920, 1080, fn)` (the world repeats it, with a 4.5px seam of rgba(20,8,2,0.55) at every join).
1. Three planks, boundaries at y 0, 354, 729, 1080, tone multipliers 0.95 / 1.05 / 0.9. Edges bevel: within 4.5px of a seam the shade ramps 0.45 to 0.9, within 10px up to 1.
2. Flat-sawn grain per plank. Distance `g` from the plank's centre line, plus `(x - px)^2 * 0.00073` (arches around a pith at x 570 / 1350 / 840), plus warp `45*n2(x*0.00093, y*0.0053) + 3.75*n2(x*0.004, y*0.0133) + 60*n2(x*0.00047, y*0.002)` from `H.noise`. Ring coordinate `|g| * 0.037 * rate + 0.6*sin(g*0.0087 + plank)`, with `rate = 0.8 + 0.45*(0.5 + 0.5*n2)` so the rings bunch and spread.
3. Each ring is asymmetric: `H.smoothstep` from `lw-0.22` to 0.95 darkening into latewood, then a sharp stop at 0.965; width `lw` and strength both random per ring (hash the ring index). Add fine streaks along the grain (noise at x 0.01 per px, y 0.47 per px), short pore flecks, and long colour streaks.
4. Shade `k = 0.47 + 0.46*fig + 0.09*streak - 0.27*ring - 0.1*fine - pore*(0.1 + 0.1*ring)`, clamped; ramp dark to mid to light by `k`. Add +-2% per-pixel noise. If this is slow, compute at half size, upscale, then add the noise at full size.
5. Satin sheen: radial gradient at (495, 180), r60 to r1350, rgba(255,220,170,0.14) to 0.
6. Per frame: threads, nails, tags, burn, camera, vignette, grain. The board never changes.

## Mark-making
**Thread** `thread(ctx, segs, colour, alpha, w)`: `segs` is a list of `[a, b]` chords, all in one path per pass, round caps, five passes:
1. Soft shadow: offset (4.2, 5.4), rgba(15,6,2,0.1), width `3.4w`.
2. Tight shadow: offset (2.4, 3.3), rgba(15,6,2,0.3), width `1.5w`.
3. Under-edge: offset (0.5, 0.7), the colour mixed 55% toward #2a1408, alpha x 0.5, width `1.05w`, so pale thread separates from wood.
4. Body: colour at `alpha`, width `w`.
5. Sheen: offset (-0.45, -0.45), colour mixed 65% toward white, alpha `min(1, 0.65*alpha)`, width `0.38w`.
Widths at 1920: 1.4-2px for links, 5px for the active path, 1.6px for fine fills.

**Winding** `wind(list, p)`: the first `floor(p*n)` chords are complete and one chord is drawn partway. Wind linearly. Wind layers in sequence (halo first, centre curves, then fine detail).

**Wraps = weight.** A link with weight `w` is `1 + round(5w)` parallel chords, offset by 2.25px each across the normal; show learning by adding or removing chords.

**Chord envelopes.** Put N nails on a circle (N 40-120). Chord `i -> (m*i) mod N`: m=2 gives a cardioid, m=3 a nephroid. Chord `i -> i+k` leaves a hollow with an inner circle of radius `R*cos(pi*k/N)`: use k of 0.28N for a glowing ring. A rounded shape is always chords, never an arc.

**Nail**: radius 3.6-6.3px, drawn after the threads so thread wraps under the head.
- Contact shadow: radial gradient at (+5.25, +6.75), radius 2.4r, rgba(10,4,0,0.55) to 0.
- Head: radial gradient focus (-0.4r, -0.45r) plus random +-0.9px, stops listed in the palette; outline rgba(30,18,6,0.7), 0.9px.
- Nails appear by being tapped in: radius `r*(1 + 0.35(1-u)^2)` over 0.1s, staggered 0.012s along the outline.

**Pyrography** (burned words): `H.offscreen`-cached layers per string. (a) toast: the glyph mask blurred 18px tinted rgb(214,150,80), `screen` at alpha 0.5; (b) halo: blurred 7.5px tinted rgb(40,16,4), alpha 0.5; (c) core: the glyphs in #1c0a03 with a 4px-cell mottle of rgba(120,62,24, min(0.55, 1.1v)) from `H.noise(5)` (0.03 and 0.11 cycles per px), alpha 0.95. Reveal left to right with a mask whose right edge is the pen; the ember at that edge is a `lighter` radial (r51: 0 rgba(255,225,150,1), 0.18 rgba(255,170,70,0.75), 0.45 rgba(255,100,25,0.32), 1 transparent) at y `+ sin(t*40) * 0.25 * fontSize`, with a faint smoke radial (rgba(220,210,200,0.14), r60) 66px above.

## Type and numbers
- Caveat 700 only. Burned headline 165-195px (never below 99px), stacked lines offset left and right by 30-60px; the pen takes 0.65s per line, the second line starting 0.05s before the first ends.
- Tags: Caveat 700, 42-57px (never below 42px), `width = text + size`, `height = 1.5*size + 15`.
- Counter: nail-and-thread seven-segment digits. Each digit has six nails at the corners and middle of a 45 x 96px box (key number: 135 x 300px); a lit segment is five parallel chords offset (k*2.4, k*1.8) for k -2..2; thread #ffc93a alpha 0.95, width 2.7px; digit advance 1.45 of the width; a comma is one nail; '%' is a diagonal of three chords plus two eight-nail rings. Counts change in 30 (small) or 18 (big) quantised steps, each step re-stringing the digits.
- A number lands as the final step; show the nails first, then the thread.

## Diagrams: arrows, labels, charts
- Arrow: a doubled shaft chord (offset 1.5px) grown by `p`, then two barbs 27px long at +-0.5 rad appear at completion; nails at the start, the tip and both barb ends (r 3.9-4.5px). Cream.
- Label: a kraft tag nailed at its top centre (nail r 4.2px), shadow offset (6, 9) alpha 0.35, clipped upper corners (12px), vertical gradient between the two kraft colours. It drops in with `H.ease.outBack` over 0.28s from 90px above, rotated 0.25 rad that settles to 0.
- Picture tags: a #ead9b4 card with a brown ink doodle at 3% line weight, a caption underneath.
- Emphasis: a red thread wound round a ring of 14-18 nails (ellipse), two chords per nail (`k -> k+1` and `k -> k+2`), nails appearing 0.02s apart, 0.35-0.4s total.
- Wrong: red ring and a red tag ("x"), the wrong path in red. Right: re-wind the correct path in gold, then a red kraft tag with a check.
- Chart: axes of silver thread between three nails, points as nails (r 5.4px) joined by a line of three wraps (offset 2.25px) in gold, one nail per point appearing as the line reaches it.

## Motion
- Everything is wound or nailed in sequence; chords at a steady pace, never faded in.
- Camera: one long board in 1920px stations; travel 0.6s with `H.ease.inOutCubic`; a gentle breathing zoom `1 + 0.012*sin(0.7t)`; zoom to 1.08 inside a busy station. A hero push of 3% over 7s.
- Pieces riding a thread move linearly along it.
- Active path: thick gold thread 5px; when it is judged wrong it is overlaid by a red one and unwound; the corrected path is wound in 0.4s.
- Stagger tags 0.1-0.2s. Nails 0.012s.

## Scene changes
The camera travels along the board to the next station; the seam between boards slides past. New tags drop in 0.15-0.3s after arrival. For a hard cut of topic, unwind the old threads at triple speed (0.4s) while the camera begins to move. Stay put when the next idea adds to the same graph.

## Finishing passes (run every frame, same strength)
1. Glow: a `screen` radial gradient at the centre of lit threads, r400, rgba(255,205,120,0.34) to rgba(255,150,60,0), plus a blurred copy of the gold and orange chords (blur 6px) drawn `lighter` at alpha 0.35. Cache when the winding is finished.
2. `H.vignette(ctx, {strength: 0.42, color: '#140802', inner: 0.55})`.
3. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 12, mono: true})`.

## Sound palette
Define `tap(t, g, pan)`: `k.noise(t, {dur: 0.02, filter: 'bandpass', f: 2300, q: 5, gain: 0.22*g, a: 0.001, pan})`, `k.tone(t, {f: 1150, dur: 0.05, gain: 0.05*g, a: 0.001, pan})`, `k.tone(t, {f: 210, glideTo: 140, dur: 0.08, gain: 0.22*g, a: 0.001, pan})`. Define `pluck(t, f, g, pan)`: `k.tone(t, {f, type: 'triangle', dur: 0.28, gain: 0.12*g, a: 0.002, r: 0.2, pan})` and a 15ms bandpass noise at 1.2kHz (gain 0.06*g).
- element appears: `tap` per nail, at most one every 0.07s in a run (gain 0.6); wrap in `k.minor`.
- label lands: `tap(t_land, 0.75, pan)`, where `t_land = st + 0.37*0.28`.
- arrow completes: a short winding rub then `tap(t, 0.5, pan)` at the tip.
- drawing / writing (winding): `k.noise(t0, {dur: d, color: 'pink', filter: 'bandpass', f: 900, q: 0.9, gain: 0.07, a: 0.1})` plus a `pluck` per chord, at most 4-9 per second, pitch `f*(1 + 0.06*(i%3))` with f 165-262Hz. Burning: pink bandpass at 2.2kHz (gain 0.05) plus 8ms crackle grains (f 1400-2300, gain 0.07-0.15) every 50-120ms from `H.rng`.
- scene change: `k.noise(t, {dur: d, color: 'brown', filter: 'lowpass', f: 380, gain: 0.16, a: d*0.45})`.
- wrong / right: wrong is two detuned sawtooth tones (98Hz and 139Hz, `glideTo` 94% of each, 0.5s, gain 0.08) plus `k.play('thud', t, {f: 110, gain: 0.5})`; right is a taut thrum, three triangle tones C3, G3, E4 (1.1s each, 35ms apart, gain 0.077) plus `tap`.
- key number (biggest hit): `tap(t, 1.5, pan)`, `k.play('impact', t, {gain: 1.1})`, a four-note thrum C3 G3 C4 E4 (gain 0.11) 0.02s later.
- takeaway: burn sizzle, then thrums F2 C3 A3 C4 and C3 G3 C4 E4 0.25s apart.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.35})`.

## Signature moves
- Curves emerge from straight chords: a cardioid or glowing ring winds up chord by chord.
- A weight is the number of wraps on a thread.
- A red thread wound round a ring of nails for emphasis.
- Counters strung as nail-and-thread seven-segment digits.
- Words burned in left to right with a travelling ember.
- Kraft tags drop and are nailed at their top.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Thread is a flat 1px line | five passes: two shadows, under-edge, body, sheen |
| Curves drawn as arcs | build them from chords; the envelope is the point |
| Wood looks like a repeating texture | per-plank pith, wandering ring rate, asymmetric rings, +-2% noise |
| Nails under the thread | draw nails after thread; contact shadow offset (5.25, 6.75) |
| Everything appears at once | wind linearly; nails 0.012s apart |
| Text looks printed | burn it: toast, halo, mottled core, ember |
| Thread vanishes on dark wood | silver and cream thread, an under-edge, and the bloom |

## Hero frame recipe
1. Cached board with seams and sheen.
2. A ring of 120 nails at about (705, 450), R 258px; wind a cream cardioid (`i -> 2i`) and a gold ring (`i -> i+34`) over it, with an orange second ring (skip 47, every other chord).
3. Under the ring, a column of two nail rows (10 nails each) cross-hatched in silver thread; a short fan of five or six gold rays (four nails each, six wraps) above.
4. Pyrography: a two-line title (138px Caveat) to the right at about (1500, 480) with a dark core and toast.
5. A kraft tag nailed top left (45px) and one red kraft tag.
6. Glow, vignette, grain 0.035.
7. Check: threads visibly float above the wood, the nails cast shadows, the burn sits in a paler patch.
