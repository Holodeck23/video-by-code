---
id: blueprint
name: Cyanotype Sheet
family: Hand-drawn
fonts: [Space Mono, IBM Plex Mono]
best_for: how-it-works explainers, systems and mechanisms, engineering, hardware, process and pipeline stories; precise, analytical tone
avoid_for: emotional or human stories, anything that needs more than one hue to be understood, party or lifestyle content
---

# Cyanotype Sheet

The viewer believes they are watching a plotter draw an engineering sheet onto old blue-print paper. Everything is one pale ink on mottled Prussian blue: orthographic views, hatched sections, dimension chains, leaders, a title block, with fold creases across the paper. The quality that sells it is that nothing is coloured: emphasis comes from weight, dashes and rings, and the white line is slightly uneven, as if exposed through a negative.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (base paper) | `#163a70` | mottle moves it between `#122e5a` and `#1a4686` |
| Ground, sun-faded corner | `#1f4886` | top-left, a radial lift of up to +16% |
| Primary ink | `#eef4ff` | every line and letter; alpha 0.95 |
| Centre line | `#eef4ff` at alpha 0.7 | dash `[27, 6, 5, 6]`, 1.2 px |
| Accent | `#eef4ff`, 6 px | the one most important thing: heavier, dashed `[24, 10]` if it is a leader or ring |
| Alarm / wrong | `#eef4ff`, 6 px, struck through | no second hue exists in a cyanotype; wrong is a heavy cross or strike |
| Grid | `rgba(200,220,255,0.045)` | every 5th line at 0.10 |
| Crease shadow / light | `rgba(0,10,30,0.22)` / `rgba(190,210,240,0.22)` | fold lines |
| Vignette | `#000819` | strength 0.3 |

## Ground and surface
1. Cache a half-resolution paper plate with H.offscreen and H.noise(88). Start at #163a70; modulate its brightness with three independent noise bands: broad mottling at 0.008 frequency and 0.2 amplitude, fine variation at 0.05 and 0.06 amplitude, and sparse positive blotches at 0.004 and 0.5 amplitude. Add a gentle warm radial lift near the upper-left, then darken the outer 12% of the sheet by up to 30%.
2. Speckle: 1600 flecks of 1 to 3 px, 70% light `rgba(160,190,230,a)` and 30% dark `rgba(5,20,50,a)`, `a` 0.05 to 0.25 (light) or 0.1 to 0.3 (dark), seeded with `H.rng(4)`. Cache this with the paper.
3. Grid: 1 px lines every 30 px at 0.045 alpha, every fifth at 0.10. Drawn over the ink (it is part of the paper).
4. For a moving camera the sheet is a large world-space page (about 2.7 screens wide, 2 tall) with the paper cached at that size; speckle as a 1536 px repeating tile.

## Mark-making
All ink is drawn onto one transparent "line layer", then finished (see Finishing). Colour `#eef4ff`, round caps and joins.

| Line type | Width | Dash |
|---|---|---|
| Object outline | 3.3 to 5 px | solid |
| Inner detail | 2.4 px | solid |
| Hidden edge | 2 px | `[10, 6]` |
| Centre line | 1.2 px | `[27, 6, 5, 6]`, extends 30 px past the part |
| Dimension, extension, leader | 1.4 px | solid |
| Section cut line | 2 px, ends 4.5 px | `[33, 8, 6, 8]` |

- **Orthographic views:** draw front and side views from the same measurements and align features horizontally; connect them with projection lines at alpha 0.35, dash `[3, 8]`. Rounded rectangles for housings (radius 15 to 27 px), circles for holes and rotating parts, a ground line with 45-degree tick hatching every 18 px underneath.
- **Hatching:** clip to the cut shape (outer path plus inner path, `evenodd`) and draw 45-degree lines every 9 px at 1.4 px; solid cores use a cross-hatch every 10 px. Draw the outline on top.
- **Dimension chain:** two extension lines starting 6 px from the part and running 9 px past the dimension line; a dimension line between them with a filled arrowhead at each end (16 px long, 9 px wide); text centred on a knocked-out gap (draw the text box with `destination-out` first, then the text). Vertical dimensions run their text rotated -90 degrees.
- **Leader:** a dot (radius 4 px) on the part, a straight line to a shelf, a horizontal shelf of 45 px, then the label beside the shelf end.
- **Border and zones:** double rule, outer 3.6 px and inner 1.5 px, 15 px apart; tick marks across the gap into 6 columns and 4 rows; tiny numbers and letters in the gap (decorative, 13 px).
- **Title block:** bottom-right rectangle, a header row (title, 39 px bold) and two rows of cells, each with a tiny caption (14 px) and a value (23 px).
- **Mechanisms:** gears are a closed path with 4 points per tooth (root, rise, tip, fall) at radius `r` and `0.82r`; a smaller gear meshes at -1.38 times the speed; dials are a circle with 7 ticks over a half-turn and a needle line. These are the only moving parts.

## Type and numbers
- Titles: Space Mono 700, uppercase, 113 px for the main title, 93 px for chart values. Labels: IBM Plex Mono 600 uppercase at 49 px. Number callouts: Space Mono 700 at 108 px (counter) and 157 px (the key percentage). Smallest story text 44 px; decorative fine print (zones, title block cells) may be 13 to 23 px.
- Text is typed on at the plotter's speed: `H.typeOn(text.toUpperCase(), u)`, a character every 1/20 s at most, baseline slightly rotated (-0.015 rad) for a title written by hand.
- Numbers tick over on a 12 fps grid (the display only changes on grid frames), and sit inside a thin rectangle callout (1.5 px, alpha 0.6, 21 px padding). The final value gets a dashed ring.

## Diagrams: arrows, labels, charts
- **Arrow:** a drafted leader: a line of 5 px drawn on with `H.partial`, finishing with a filled triangle head 24 px long and 18 px wide (build it from the last segment's direction).
- **Label:** short uppercase mono text near the thing, optionally in a tag (a pentagon with a point on the right, 3 px line) hung from a card's corner.
- **Chart:** an L of two 5 px lines with small arrowheads, caption centred below (44 px), the curve drawn 6 px thick with a gradual draw-on over 1.2 s, value text above. Add the number in a box.
- **Emphasis:** a dashed `[24, 10]` ellipse around the key number, 6 px; wrong things are crossed with an X of two 8 px strokes drawn 0.08 s apart.
- **Connectors between sheet regions:** a dashed leader drawn while the camera travels, with a short caption on it.
- **Moving data:** small outlined squares (39 px, shrinking to half) travelling along an arrow at 0.9 loops per second.

## Motion
- Everything on the sheet is drawn by a plotter: each primitive has a `[t0, t1]` window, a polyline resampled with `H.resample(pts, 4)` and revealed with `H.partial(pts, H.prog(t, t0, t1))`. Use 0.08 to 0.3 s for short lines, 0.3 to 1.2 s for long ones; stagger neighbours 0.085 to 0.17 s.
- Plotter head: at the tip of whatever is being drawn show a ring (radius 14 px), four gapped crosshair ticks (7 to 27 px), a radial glow of 39 px (`rgba(230,245,255,0.8)` to 0), and two full-frame dashed alignment lines at alpha 0.35.
- Camera: keyframes `[t, x, y, zoom]` with `H.ease.inOutCubic` between them and zoom interpolated in log space. Hold at each station for 2 to 4 s, travel in 0.7 to 0.8 s. Zoom stays between 0.84 and 1.05 so line weights stay sharp.
- Alive between beats: a very slow drift (scale 1.05 settling to 1.0 over 4.6 s) on stills; the plotter head moving; gears and dials turning when a value is being adjusted (ease the angle `H.ease.inOutCubic` over 0.55 s).

## Scene changes
No cuts. The camera tracks along the same sheet to the next region (across, then down). While it travels the plotter draws a connector leader to the next region with a caption on it. Optionally develop a large group with a wipe: a soft 90 px gradient mask moving across the group (`destination-in`) over 0.5 to 1.3 s. Stay continuous at all times; a new region is only a new place on the same paper.

## Finishing passes (run every frame, same strength)
1. Cache an exposure mask in sheet coordinates. Mix 74% constant opacity with 26% smooth noise remapped into [0,1], then reduce opacity by 0.3 in a seeded 7% subset of 2px cells. Use destination-in to apply it to the line layer under the camera transform.
2. Bleed: draw the line layer blurred 3.75 px at alpha 0.45, then blurred 0.75 px at alpha 0.95 over it (`ctx.filter`), so the white sinks slightly into the blue.
3. Fold creases (static, cached along strips): at 1/3 and 2/3 of the sheet width and at the vertical middle. Across 80 px: transparent, `rgba(0,10,30,0.22)` at 0.48, `rgba(190,210,240,0.22)` at 0.50, `rgba(190,210,240,0.06)` at 0.56, transparent. Add 700 abraded fibres per crease (1 to 3 px, alpha 0.1 to 0.45, gaussian 2.7 px spread) and a radial 39 px wear spot (alpha 0.28) where two creases cross.
4. `H.grain(ctx, t, { strength: 0.04, cell: 2, seed: 6, fps: 12, mono: true, blend: 'overlay' })`, then `H.vignette(ctx, { strength: 0.3, color: '#000819', inner: 0.55 })`.

## Sound palette
Sound suggests a drafting machine: a small contact tick starts a stroke, a low motor note follows the travel, and a quieter release ends it.
- element appears / pen down: `k.play('click', t, { f: 1300, gain: 0.3, minor: true })`, and at pen up `k.play('tick', t1, { f: 1900, gain: 0.12, minor: true })`.
- label lands: letter-by-letter ticks: `k.play('tick', t, { f: 1500, gain: 0.2, minor: true })` per character, at most 20 per second, with a short stepper blip at 220 to 340 Hz.
- arrow completes: a final `k.play('click', t, { gain: 0.35 })` at the arrowhead.
- drawing / writing (matched to draw-on length): `k.play('pencil', t0, { dur: t1 - t0, gain: 0.2 })` plus `k.tone(t0, { type: 'square', f: 200 + 25 * pick, dur: t1 - t0, gain: 0.03, minor: true })` and a triangle at half the pitch (`gain: 0.05`). Pick a new pitch (200 to 350 Hz) for every move. Keep all of it at half level (x0.5) under hits.
- scene change (camera travel): a long carriage run: `k.tone(t, { type: 'square', f: 180, glideTo: 320, dur: 0.45, gain: 0.04, minor: true })`.
- wrong / right: wrong is two hard strokes (gain x2) with `k.play('error', t, { f: 'F3', gain: 0.55 })`; right is `k.play('success', t, { f: 'A5', gain: 0.6 })`.
- key number: during counting, `k.play('count', t, { gain: 1.4, f: 2000 + 100 * i, minor: true })` on each grid change; on the target `k.play('impact', t, { gain: 1 })` and `k.play('ding', t + 0.01, { f: 'C6', gain: 0.42 })`.
- takeaway: `k.play('success', t, { f: 'G5', gain: 0.7 })` as the line completes, then one `k.play('tock', t + 0.6, { f: 300, gain: 0.35, minor: true })` as the head parks.
- bed or music: `k.bed(0, DURATION, { kind: 'room', gain: 0.35 })` and `k.bed(0, DURATION, { kind: 'hum', gain: 0.25 })`.

## Signature moves
- Lines are plotted stroke by stroke, with a crosshair head riding the tip.
- Front view, side view and a hatched section, tied by dashed projection lines.
- Dimension chains with knocked-out text and filled arrowheads.
- A camera that travels across and then down one big sheet, a connector drawn on the way.
- Numbers ticking in a rectangular callout; the final value ringed.
- Gears and dials that turn when something is adjusted.

## Pitfalls
| Looks cheap because | Fix |
|---|---|
| Flat blue and crisp white | Add paper mottle, speckle, exposure mask and the 3.75 px bleed |
| Colours for emphasis | Keep one ink; use weight, dashes, rings and crosses |
| One line width everywhere | Use the width table; outlines 3x thicker than dimensions |
| Text sits on lines | Knock a gap out behind dimension text |
| Camera zoom blurs the lines | Keep zoom in 0.84 to 1.05, draw at final scale |
| Grain flickers too fast | 12 fps grain with 4 variants, not 60 |
| Creases are drawn as lines | Use the two-tone gradient plus fibres, not a stroke |

## Hero frame recipe
1. Paper (cached), grid, then on the line layer the double border with zone ticks.
2. Front view of a housing at (400, 540): outline rounded rect 186 x 129 (radius 21) with an inner detail rect, two circles, a centre line through it, a hidden dashed rect inside, a ground line below with tick hatching.
3. A hatched section to the right: outer rounded rect 372 x 264, inner offset by 18 px, hatched at 45 degrees.
4. Three dimensions (one horizontal below, one vertical left, one on the section) and two leaders with labels (49 px).
5. Title block bottom-right with a 39 px header and two cell rows.
6. Exposure mask, 3.75 px bleed, creases, grain, vignette; plotter head crosshair at the end of the last line.
