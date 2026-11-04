---
id: wireframe-terrain
name: Phosphor Vector Terrain
family: Dimensional
fonts: [Space Mono, IBM Plex Mono]
best_for: optimisation, search and descent, journeys over a landscape of possibilities, systems and data topics, anything that can be a flight over terrain with a HUD
avoid_for: warm human stories, food, children's topics, anything that needs colour variety or soft shapes
---

# Phosphor Vector Terrain

The viewer believes they are looking through a flight-console display that draws a 3D landscape as glowing cyan vector lines on a deep navy night. Every ridge hides the lines behind it, a bright scan row sweeps across the mesh, and HUD brackets, readouts and tags lock onto features. The one quality that sells it is true hidden-line removal under a soft phosphor bloom.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (night) | #050a22 | the fill used to hide lines behind nearer ones |
| Sky top | #02051a | gradient to #081440 at 75% and #0f2160 at the horizon |
| Haze (distance) | #0e1e58 | far rows blend toward this |
| Mesh line, low | #28c8ff | lowest ground |
| Mesh line, high | #d2faff | peaks and ridges |
| HUD cyan | #7feaff | frames, ticks, tags, default readouts |
| Readout white | #e8fbff | big numbers and titles |
| Accent (amber) | #ffd36b | the single most important thing: the moving marker, its path, its tag |
| Alarm / wrong | #ff5a6e | errors, downhill vector, sphere tint |
| Right / result | #5dffb0 | success, lowest point, final number |
| Panel fill | #03081e | at 86-88% alpha behind any text |
| Scan highlight | #ffffff | the sweeping row, blended into the line colour |

Cyan is the world, amber is "you are here", red is "wrong", green is "solved". Never a fifth hue.

## Ground and surface
1. **Sky** (cached with `H.offscreen`, re-drawn only when the horizon moves, otherwise per frame): vertical gradient from the top to horizon + 60px with the three sky stops; a fade of the gradient to #050a22 from horizon -15px to horizon +180px; 160 stars (`H.rng(3)`, 1.5px squares, rgba(190,240,255) at 0-0.7 alpha) only above the horizon.
2. **Height field**: define `height(x, z)` on a world of 300 by 200 units, grid step 2.5 (120 by 80 quads). Use `H.noise(12)`: (a) ridged noise `1 - |n2|` raised to the power 2.2, scaled 11, at frequency 0.04; (b) `fbm2` at 0.08 scaled 3; (c) the walls rise toward both x edges as `(|x|/70)^1.6 * 9`; (d) damp (a) and (b) near the centre line with `H.smoothstep(4, 40, |x|)`; (e) a far ridge range beyond z=105 faded in with `H.smoothstep(105, 175, z)`, up to 16-32 high; (f) one carved basin: subtract `10 * exp(-d^2/160)` around a chosen (x, z). Everything is a function of position only, so it is deterministic.
3. **Camera**: a pinhole with yaw and pitch. Focal length 1140px, centre (960, 540). Project every vertex once per frame; skip quads with any vertex closer than depth 1. Horizon row = `540 - 1140*tan(pitch)`.
4. **Hidden-line mesh** (the whole look): draw rows from the farthest to the nearest. Within a row draw tiles from the most lateral outward-in (sort by distance from the camera x, farthest first). For every quad: `fill` its four projected corners in the row's night colour (night blended to haze by distance), then `stroke` its outline. Nearer rows paint over farther rows, so anything behind a ridge disappears.
   - fog = `H.smoothstep(45, 200, z - camZ)`; fill = night mixed toward haze by fog.
   - line colour: mix #28c8ff to #d2faff by `0.8 * clamp((h + 2)/16)`; alpha `(1 - 0.85*fog) * (0.55 + 0.45*hk)`; width `clamp(2.4 - depth/60, 0.7, 2.4)` px, round joins.
   - Tiles the route has crossed: fill mixed 22% toward rgb(120,84,20) and the line 55% toward amber.
5. **Far edge haze**: when pitch exceeds 0.25 rad, fade the last 45 world units of mesh into the haze colour and add a faint blue band (rgba(70,170,255,0.14), 135px tall) at the edge row.
6. **Horizon glow**: a 135px tall gradient, rgba(40,140,255) peaking at 10%, centred on the horizon row.

## Mark-making
- **Scan row**: a gaussian band over world z, `exp(-((z - scanZ)/2.2)^2)` with a peak of 0.72-0.8 (1.0 and sigma 3.5 during the first build-in). It mixes the line colour to white and adds 1.8px to the line width. During build-in `scanZ` leads the reveal front, which moves from 18 to 198 units with `H.ease.inOutCubic`; afterwards the scan loops forward at 26 units per second (a 5.8 s cycle).
- **Wireframe sphere**: draw only the front hemisphere. Fill a disc in #040a26 first so mesh behind it is hidden. Latitude lines every 15 degrees (-75..75), longitude lines every 15, each sampled every 8 degrees, tilt 0.42 rad, spin `0.25*t`. A segment is skipped if both ends face away; alpha is `0.15 + 0.6*clamp(meanZ + 0.25)`; width 1.5px; colour #6eebff mixed toward #ff5a6e by the error amount. Rim circle 2.4px at 95% in #96f5ff. A radial halo from 0.9R to 2.2R in rgba(80,220,255,0.18).
- **Marker (amber ring)**: radius 24px at pulse `1 + 0.2*sin(6t)`, 3.75px line with a 24px amber glow, a 7.5px centre dot, four cross ticks from 27 to 42px.
- **Route and path**: sample the visited route every 0.75 units, project at height + 0.35. Draw it twice: 9px at 55% amber with an 18px glow, then a 3.75px #fff1c4 core.
- **Downhill vector**: dashed 15/9, 3.75px, red, glow 15px, grown along its points; the head is two 27px strokes at +-0.5 rad.
- **Locked-on feature**: a ring (13.5px) plus dot, four ticks that start 45px out and close to 21px as it locks (0.4 s); a leader line out at 45 degrees then horizontal; the tag types on at its end.
- **Peak tag**: a vertical stem 51px, a 9px square (blinking at 20 Hz until it settles), and a tag with a dark scrim rgba(3,8,30,0.72).

## Type and numbers
- Space Mono 700 for titles and readouts, IBM Plex Mono 600 for tags and labels. Never a proportional font.
- Sizes at 1920x1080: title 90px collapsing to 45px at the top-left header (never below 66px for the opening hero), key readouts 102-120px, tags 42px (never below 42px), unit labels 33px, decorative micro text 21px.
- Text appears by typing: `H.typeOn(text, u)` over 0.25 to 0.5 s with a blinking block cursor (6px gap, width 0.5 em, 4 Hz) while the line is active.
- Big numbers: a bold readout inside a HUD panel, ticking at 12 fps; a counter eases `u^1.6` up to millions; percentages step by integers with green glow (blur 30px) once they exceed the target. A tag may carry a unit line below in 33px cyan at 80%.

## Diagrams: arrows, labels, charts
- Panel (`hudBox`): fill #03081e at 86%, 1.8px border in the accent at 45%, a 6px solid bar on the left edge, bracket notches 18px at the right corners in the accent at 2.25px; it opens by growing its width from the left.
- Tag: a dark box with a 2.25px outline in the accent at 80%, type inside at 42px, padded 21px; opens in 0.15 s, text types after.
- Arrow: the dashed vector above. Numbered tags ("1 STEP", "2 STEP") sit at arrow ends.
- Chart: a thin cyan line chart in a panel with a green trace and tick labels; a rising line draws left to right and the end value pulses.
- Feed list: rows of tiny polygon line icons (2px strokes, miter joins) with a 42px label, scrolling upward at 210px/s inside a clipped panel.
- Wrong / right: the whole panel's accent switches to red, border flashes 4 times at 8 Hz, a 9px cross; then green with a 9px check and a green glow.

## Motion
- Easing: `H.ease.inOutCubic` for camera and panel opens, `H.ease.outCubic` for locks and tag reveals. Nothing bounces.
- Camera flight: keyframes of position (x, y, z), yaw and pitch, eased between keys, 1.0 to 3.3 s apart. Pitch from 0.02 (level) to 0.55 (looking down into the basin). Fly forward 4-8 world units per second; never roll.
- Steps along a route: the marker moves in short 0.3 s eased hops with 0.3 s between hops.
- Frame alive: the scan row loops forever, stars are fixed, the compass heading drifts at 3 degrees per second, the marker pulses, HUD cursors blink.

## Scene changes
Panels fold shut (width back to zero over 0.4 s) while the camera glides to the next area of the terrain; a new tag types onto the feature. Never cut: the landscape is continuous. For a hard section break, run a one-off bright scan row over the whole mesh (build-in settings) and re-type the header.

## Finishing passes (run every frame, same strength)
1. Everything above, drawn back to front.
2. Bloom: draw the frame into a half-resolution scratch canvas with `filter = 'blur(9px)'`, then composite it back over the full frame with `globalCompositeOperation = 'lighter'` at alpha 0.5. This is what turns thin lines into phosphor.
3. HUD: corner brackets 39px arms, 2.25px, inset 42px (they start 18px further in and step out in three 18px increments over 0.3 s; power-on flicker: off to 0.05 s, on to 0.12, off to 0.17, then stable); a top compass ribbon with ticks every 8px (long 15px with a 3-digit label at multiples of 10, medium 9px at 5s, short 4.5px), a triangle pointer under the centre, a radial scrim rgba(2,5,26,0.75) behind the title block.
4. Scanlines: a 1px band of rgba(0,0,0,0.12) every 4 rows.
5. `H.vignette(ctx, {strength: 0.45, color: '#00000a', inner: 0.55})`.

## Sound palette
A quiet flight console: beeps, type-on chatter, a low hum, never percussion.
- element appears (panel opens): `k.tone` with `glideTo` from 220 to 660 Hz (triangle, over the open time, gain 0.05) and `k.play('click', t, {f: 1500, gain: 0.5})` as it locks.
- label lands (tag types on): a 22 ms square `k.tone` at 'E5' (gain 0.035) for each character, throttled to at most 12 per second and skipping spaces.
- arrow completes: a scanner beep, `k.tone(t, {f: 'A5', dur: 0.05, gain: 0.05})`; vectors draw with a 0.7 s pink `k.noise` sweep (bandpass 700 Hz, q 5, gain 0.04).
- drawing / writing: none for lines; a sphere or vector reveal gets one `k.tone` sawtooth gliding 110 to 220 Hz (`glideTo`), gain 0.03, kept very quiet.
- scene change (camera flight): pink `k.noise` bandpass near 250 Hz, `dur` the flight time, gain 0.05 with a slow attack, over a sawtooth `k.tone` drifting 70 to 95 Hz (gain 0.03).
- wrong / right: wrong is `k.play('error', t, {f: 'A3', gain: 1.0})`; right is `k.play('success', t, {f: 'D5', gain: 0.5})`.
- key number (the biggest hit): `k.play('impact', t, {gain: 0.65})` with `k.tone` 'D3' triangle `dur: 1.0`, `gain: 0.14`; a tick sound per step of the counter, `k.play('tick', ..., {f: 3200, gain: 0.6})`.
- takeaway: a 'D3' triangle `dur: 1.0`, `gain: 0.1`, and a click as the panel closes.
- bed or music: `k.bed(0, DURATION, {kind: 'hum', gain: 0.35})`; `k.music(0.3, DURATION, {mood: 'tense', bpm: 90, key: 'D', gain: 0.24})`; a faint radar pass every 5.8 s, pink `k.noise` 1.4 s at bandpass 1000 Hz, q 6, gain 0.03.

## Signature moves
- Hidden-line removal: back-to-front quads each filled with night, then stroked.
- A bright scan row sweeps the mesh and reveals it from the camera to the horizon on the opening.
- HUD brackets power on with a flicker; a compass ribbon draws from the centre out.
- Markers lock on with closing ticks and a leader line, and tags type on.
- The camera flies the landscape; the descent is a glowing amber route draped on the surface.
- A wireframe sphere spins in the sky and tints red while wrong.

## Pitfalls
| Looks fake | Fix |
|---|---|
| All lines visible through ridges | fill each quad with the night colour before stroking, far to near |
| Mesh looks flat and uniform | colour by height, fade by fog, scan row on top |
| No glow | blurred copy, `lighter`, 0.5 |
| Clean digital rectangle | scanlines and vignette on every frame |
| Many colours | cyan world, amber you, red wrong, green solved |
| Labels pop in | type on with a cursor and a scrim behind |
| Camera is static | keyframed flight with eased yaw and pitch |

## Hero frame recipe
1. Sky gradient to #0f2160 at the horizon (row 640 for a level camera), 160 stars, horizon glow.
2. Hidden-line mesh: 120 by 80 quads, height field with valley, side walls, far ridge and a basin; fog to haze; line colour by height; a scan row about two thirds into the distance.
3. Wireframe sphere upper right (radius 156px), halo, tilt 0.42.
4. An amber ring marker on the basin floor with a leader line and a tag "LABEL" in 42px IBM Plex Mono; a dashed red vector running away from it.
5. Title block upper left in Space Mono 700 51px, panels at 86% #03081e with a 6px cyan bar.
6. Corner brackets, compass ribbon, scrim; bloom at 0.5; scanlines; `H.vignette` 0.45. Compare: lines behind a ridge must be completely absent, not dimmed.
