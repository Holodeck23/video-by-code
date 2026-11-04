---
id: transit-map
name: Metro Diagram
family: Data & information
fonts: [Inter, Libre Baskerville]
best_for: pipelines, journeys, processes with branches and loops, systems with stages that feed each other, progress along a route
avoid_for: emotional or organic topics, a single number with no structure, anything that cannot be reduced to nodes and routes
---

# Metro Diagram

The viewer believes they are reading a printed rail network diagram in the schematic tradition: thick flat-coloured routes, only horizontal, vertical and 45-degree runs, smooth corners, small ticks for stops and white rings where routes meet. The idea is a journey; the camera rides the routes and a small amber LED board announces the numbers.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground | #f7f5ef | warm printed paper |
| Ink | #1b1f3b | labels, ring outlines, title block, vehicle outlines |
| Route A | #0a6cb8 | blue; the input route |
| Route B | #dc2a26 | red; the loop or work route; also wrong marks, used rarely |
| Route C | #00894a | green; results; also the right mark |
| Route D | #f39419 | orange; feedback; slider knobs |
| Route E | #8b4a9c | purple; a crossing side route |
| Water | #bfddeb | river band; its italic label #4b8db0 |
| Secondary text | #6a6d80 | footnotes, symbol captions; on dark use #c9cce0 |
| LED lit | #ffb21e | the amber board; the single most important number on screen |
| Board body | #121317 | bezel #2e313c, slider track #555a78 |

Routes keep their colour for the whole video. A stop is never filled with a route colour except as a tick.

## Ground and surface
1. Fill the frame with #f7f5ef.
2. Paper texture, cached with `H.offscreen('paper', W, H, fn)` and drawn under every ink pass: a quarter-resolution noise field from `H.noise(4242).fbm2`: a broad layer (frequency 0.045 per cell, 4 octaves) weighted 0.75, plus a finer layer (frequency 0.22, 2 octaves, shifted 40 cells in x) weighted 0.35; call the sum v. Where v > 0 write warm grey rgb(104,90,66), else white-cream rgb(255,255,250); alpha `|v| * 25/255` (about 4% at the extremes). Scale up with smoothing. On top, 420 curved fibres (`H.rng(7171)`: length 9-33px, width 0.6-1.4px, 75% dark rgba(90,76,52) at 0.07-0.16, 25% light at 0.3-0.5).
3. An optional river: a rounded band 80px wide in #bfddeb running under the network, entering first (fade 0.6 s), its italic Libre Baskerville label with 4px letter spacing.
Ink is opaque and flat on top; nothing is lit, glossy or shadowed except the LED board.

## Mark-making
Work in screen px at the working zoom (1.0). All coordinates are on a coarse grid (multiples of 50px); every route segment is horizontal, vertical or exactly 45 degrees.

**Route.** Take a polyline of corner points. At each corner, replace it with a curve running from a point `rr = min(0.9 * 70, half of each neighbouring segment)` before the corner to the same distance after it (`H.bezier` with both inner controls moved 55% toward the corner), then `H.resample(pts, 12)` for even sampling and cumulative length. Draw the leading part with `H.partial(pts, u)` and `H.strokePath`. Two passes: (1) ink spread, the same path 3.6px wider at 16% alpha; (2) the solid route, 32px wide, butt caps, round joins. Where routes run side by side, leave a gap of 8px.

**Stop (tick).** A stub at 90 degrees to the route: 14px wide, from the centre line out 34px on the label's side, butt caps, route colour. **Terminus:** a bar across the route, 18px thick, 80px long, centred on the end.

**Interchange.** A white disc, radius 32-52px, outlined in ink at 9px. It pops with `H.ease.outBack` over 0.25 s when the first route reaches it. The biggest interchange is the one the lesson turns on.

**Label halo.** Every label is drawn twice: first stroked in the paper colour (width 0.24 times the font px, round join) to knock the routes out behind it, then filled in ink.

**Vehicle.** A white capsule 88 x 32px, 5px ink outline, 16px corner radius, rotated to the route's tangent. An "error" vehicle fills with ink and carries a red caption.

**Flow marks.** White chevrons at 90% alpha along each drawn route: 5px stroke, round caps, arms 12px at plus and minus 0.8 rad, spaced 120px, drifting at 60px per second in the direction of travel.

**LED board.** A fixed grid with a pitch of 6px (4px for a long sign). Glyphs come from a 5-column by 7-row bitmap set with one blank column between glyphs; each font dot may cover k x k LEDs (k = 1 for captions, 3 for the key number). Build in order: housing #121317 with all LEDs unlit at 8.5% amber; the lit cell mask enlarged to round dots with a soft edge (radial fade from 78% of the radius); a bloom from a quarter-resolution blurred copy (blur 2.4px) added with `lighter`; the lit dots drawn again with `lighter` at 60% for hot cores; a glass gradient (white 6% at top, 0 by 35%, black 12% at the bottom); bezel in #2e313c 9px with a 1.5px inner line in white at 8%. Cache the housing and glass.

## Type and numbers
- Inter 800 for the title, stations that matter and labels on interchanges; Inter 600 for minor stops; Inter 400 uppercase with 0.12em tracking for captions. Libre Baskerville italic only for the river.
- Title block: an ink rectangle with the route-mark (four short coloured bars meeting at a white ring) and a headline in Inter 800 at 100px that settles centre-screen, then docks to the corner at 42px in 0.8 s.
- Station names 44-51px; important names 60-68px; the final value's label 68px. A story-critical label never falls below 42px on screen at any zoom: font = `max(design px, minimum / zoom)`.
- Key number: the board, 3 x 3 LEDs per font dot, about 90px per glyph wide and 126px tall.
- Numbers are LED text redrawn each frame: counts follow `H.ease.inOutCubic` over 1.5-3.3 s, rounded to the nearest thousand with commas; a percentage rounds to an integer. When it lands, outline the digits with a box of lit LEDs 3 cells out.
- A message flips in: characters left of the front are resolved, the rest are random glyphs reseeded 20 times a second; the front moves left to right over 0.6 s.

## Diagrams: arrows, labels, charts
- The route is the arrow: starts with a terminus bar, ends in an interchange or terminus ring. Direction is shown by the chevrons and by a vehicle.
- Label: attached by the tick, placed on one of eight compass sides: ring radius plus 24px from the stop's centre. A cross-route stop gets the larger ring and bold name.
- A loop is a route that returns to its own start, with three stops spaced evenly and a vehicle that circles once.
- Chart: values are stops on a route, evenly spaced, each label above its tick in ascending order, the last stop a ring with the biggest label and an outward pulse. Comparisons: two parallel routes meeting at one interchange.
- Wrong: a white rounded box (3.5px border in ink) holding the guess, a red cross made of two 5px round strokes 44px long beside it, and two red rings pulsing out of the stop (radius 40 + 92f, alpha 0.7(1 - f), f from 0 to 1 over 0.6 s, the second offset by 0.5).
- Right: the same box with a green border and a three-point green tick; a green pulse at the final terminus.
- Side panel: an ink box with orange slider knobs (20 x 34px) on tracks of #555a78, 10px tall, sliding between values in 0.4 s.

## Motion
- Routes draw out from their first terminus with `H.ease.inOutCubic`, 0.9-1.6 s each, starting 0.45-0.5 s apart; a stop appears the instant the drawing head is 12px past it (tick grows over the next 40px of travel).
- Title block fades in and drops from 28px above over 0.6 s.
- Camera: `[time, zoom, world x, world y]` keys. Working zoom 1.0 on the current area, 0.75 along a long route, 0.35 for the final overview. Moves take 0.7 s with `H.ease.inOutCubic`, holds are 1.5-4 s. The camera rides the vehicle's route, never cuts.
- Vehicles move between stops in 0.5 s moves with `H.ease.inOutCubic`, pausing 0.4-0.6 s at each station for its label; passenger items on a route run at 340px per second, 136px apart.
- When the network is complete, vehicles ping-pong along each route at 140-190px per second with cosine easing at the ends.

## Scene changes
There is no cut. The camera pans or zooms along the route, and the next route begins to draw as the camera starts to arrive. The old beat's boxes, bubbles and boards fade over 0.3 s before the move. The last move pulls out to show the whole network, and the board flips to the takeaway. Stay put when the next idea is another stop on the same route.

## Finishing passes (run every frame, same strength)
1. Ink spread and paper texture as in ground and mark-making; they are baked into every stroke and the cache.
2. `H.grain(ctx, t, {strength: 0.018, cell: 2, fps: 12, mono: true})`.
3. No vignette, no shadow, no bevel. Flat colour is the look; glow belongs to the LED board only.

## Sound palette
A quiet station: soft bells, track hum and relay ticks.
- element appears (stop): `k.noise` bandpass f 1500 q 1.5 dur 0.02 gain 0.22 plus `k.tone` f 520 with `glideTo: 300`, dur 0.08, gain 0.12, wrapped in `k.minor`.
- label lands: nothing extra; the stop click covers it.
- arrow completes (a route finishes): `k.play('pop', t, {f: 330, gain: 0.6})` as the end ring opens.
- drawing (a route laying down): brown bandpass `k.noise` f 350 q 1.2 gain 0.2, attack 40% of the draw time, as long as the draw.
- scene change (camera move): pink bandpass `k.noise` f 350 gain 0.08 across the move.
- vehicle: `k.tone` type 'sawtooth' f 70 with `glideTo: 140`, gain 0.07, plus brown lowpass `k.noise` f 400 gain 0.18; every 180px of travel a pair of clacks 45 ms apart (bandpass f 900 q 1.4 dur 0.025 gain 0.22 and `k.tone` f 95 dur 0.05).
- count ticks: bandpass f 2000 q 2.2 dur 0.014 gain 0.2 plus `k.tone` type 'square' f 180 dur 0.018 gain 0.025, at most 12 per second.
- wrong: `k.tone` D4 (0.5 s, gain 0.2) then B3 (0.8 s, 0.23 s later), with a triangle D3 under them (gain 0.08).
- right: three chime tones C5, E5, G5, 0.12 s apart: sine `k.tone` dur 1.4 gain 0.2 plus an octave partial at gain 0.03.
- key number: `k.play('impact', t, {gain: 0.75})` and a chime G4 plus D5.
- takeaway: four chime tones C5, E5, G5, C6 at 0.18 s apart, after a flip clatter of bandpass ticks (f 1600-2200, 22 per second, panning left to right).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`.

## Signature moves
- A route draws itself out and stops appear as the head passes.
- Interchange rings pop with a small overshoot.
- Small white vehicles shuttle between labelled stops, and the camera rides with them.
- An amber LED board counts, outlines the result, and flips letter by letter to the takeaway.
- A red pulse radiates from a stop where the guess went wrong.
- A title that settles centre-screen, then docks to the corner as a title block.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Routes at odd angles | allow only 0, 45 and 90 degrees; round every corner with radius 70px |
| Routes look drawn with a brush | flat opaque colour, one 16% ink-spread pass only |
| Labels collide with routes | knock-out halo in the paper colour on every label |
| Labels too small at zoom | counter-scale the font by zoom so it stays at least 42px |
| LED board looks like a font | real bitmap dots, unlit LEDs visible, bloom and hot cores |
| Every stop is an interchange | ring only where two routes meet; ticks everywhere else |

## Hero frame recipe
1. Paper ground and its cached texture; a pale river band crossing the lower third.
2. Three routes (blue, red, green) at 32px, one horizontal, one with two 45-degree bends, one a loop; corners rounded at 70px; ink-spread pass under each.
3. Ticks along every route, one terminus bar at each start; three interchange rings (r 40, 9px ink outline); labels in Inter 800 at 48px with paper halos.
4. A white vehicle capsule on one route and chevrons along each.
5. Title block in the top right (ink, route mark, headline 42px); a legend box bottom left with swatch bars, a thin ink border and "Key to routes".
6. The amber LED board under the main route showing a number at 3 x 3 LEDs per dot with bloom.
7. `H.grain` at 0.018; check that nothing is shaded.
