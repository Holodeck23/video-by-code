---
id: topographic
name: Survey Quadrangle
family: Data & information
fonts: [Libre Baskerville, Inter]
best_for: anything with a landscape metaphor (optimisation, search, risk, progress toward a low point or a summit), journeys along a path, "where are we on the terrain" stories, serious but curious tone
avoid_for: fast comparisons, many small unrelated facts, cheerful or high-energy tone, content with no spatial idea
---

# Survey Quadrangle

The viewer believes they are reading a printed, slightly aged government survey sheet: brown contour lines, grey hillshade, green woodland tint and a blue lake, each printed from its own plate, inside a black neatline with a full collar of scale bar, north arrow and small print. A red dashed route walks across it. The frame is a map, so every idea becomes a place, a height or a route.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #eee5cb | warm survey stock, never white |
| Primary ink (black plate) | #1e1a16 | neatline, collar, place names |
| Contour brown | #a2643a | minor contours; index contours #965830 |
| Contour numerals | #8c502a | uphill-reading numbers on index lines |
| Water blue | #3f7fa6 | lining; shoreline and streams #346c92; plate fill #a8ccd6 |
| Woodland | #c8dba8 | at 69% over the paper |
| Hillshade | #ffffff to #9b8c7f | a grey multiply plate |
| Accent / alarm / wrong | #b5352a | the route, the hiker, red tint grid at 28%, the single claim; labels on it #8e2a22 |
| Lake label | #2c6d96 | italic water names, "right" marks |

Five plates only: black, brown, blue, green, grey, plus the one red.

## Ground and surface
Everything below is built once (`H.offscreen` or per-pixel layers in `__ready`); the sheet never regenerates per frame.
1. Paper: `H.paperTexture(W, H, {seed: 21, tone: '#eee5cb', fiber: 0.5, grain: 0.3, blotch: 0.2})`.
2. Neatline rectangle from (54, 45) to (1866, 930); collar 150px below; header strip 45px above.
3. **Heightfield** on a 4.5px grid inside the neatline, from `H.noise`: warp the sample point by 120px of 3-octave fbm (frequency 0.002), then `h = 560 + 620*fbm(warped * 0.0016, 5 oct)` plus a ridge term `260*(1 - |fbm2| - 0.6)` plus two massifs by gaussians (1300*(0.45 + 0.75*ridge) at (1290, 330) radii (375, 285); 650*(0.5 + 0.6*ridge) at (1680, 675) radii (225, 210)) minus a basin `640` at (495, 600) radii (345, 225), plus fine texture `18*fbm(x*0.02)`. Water level = height at the basin centre + 170.
4. **Separate map plates:** water fills elevations below the chosen level, woodland combines a low-frequency noise mask with an altitude cutoff, and hillshade follows the terrain gradient under a fixed upper-left light. Compute each surface normal from the height derivatives, dot it with the light vector and clamp the resulting shade to avoid crushed relief. Blend water at about 92% and woodland around 69%, preserving readable contours above both.
5. **Contours**: marching squares across the grid for every level from the water level up in 40m steps; collect segments per level; every 5th level (200m) is an index contour. Strokes are batched per level.
6. **Index numerals**: for each index level try 140 random segments, accept at most 3 where the line is straight (the gradient direction at +-21px along it agrees 93%+), slope is moderate, and it is at least 165px from another label or reserved box; rotate along the line, flipped so the digits read uphill. Cut a knockout for each numeral (rotated box, `evenodd` clip) so contours break around it.
7. **Trail**: start 40px from the summit; each 3px step turns the downhill direction by `side*(1.15*steep + 0.25)` (steep = `H.smoothstep(1.2, 4.5, slope)`), adds a 0.45 pull toward the lake, and smooths `dir = 0.8*dir + 0.2*target`; flip `side` every 70 to 130px (shorter on steep ground); stop at the water. Store the polyline.
8. **Streams**: steepest descent with momentum 0.75 from 4 springs at least 330px apart that reach the lake.
9. **Age** (runs on top at the end, see Finishing).

## Mark-making
- **Contour**: a 1px line at 72% (minor) or 2.2px at 95% in index brown; line caps round. No fills between lines.
- **Shoreline** 2px #346c92; **water lining**: six more contours below the level, at -3, -9, -17, -28, -42, -60 m, 0.9px, alpha 75% falling 10% each; they ripple outward by starting 0.12 s apart.
- **Streams**: width grows 0.8 to 2.3px along the path, #346c92 at 90%; skip every third 4-sample run in the first 22% (intermittent springs).
- **Route**: dashed 2.6px #b5352a, dash `[9, 6]`, butt caps, round joins, a 4px start dot. The **walker** is a 6.6px cream disc with a 4.5px red disc inside.
- **Hand marks** (the only wobbly lines): a red "x" in two 3.3px strokes with 15px arms; a spiral ring `r = 30 + 1.8 sin(0.4k) + 0.12k` (x stretched 1.15), 7 radians, 3.3px; a closing red ring around the goal (swept from -1.4 rad through 6.6 rad, radius wobble 2%).
- **Survey points**: ink "x" marks, arm 6px, 2.4px stroke, placed at random positions in the neatline; shown count `N * (inQuad(u))^0.7`; once the story moves on they fade to 15% and turn #6b5a48.
- **Spot heights**: "x" plus a 15px numeral at 5 points above the water.
- **Plate register**: the woodland plate slides in from a 10px offset (+x, -6px y) to zero as it fades in; that is the one deliberate misregistration.

## Type and numbers
- Survey furniture (graticule coordinates, collar credits, contour numerals): Inter 400/600 at 13-15px. Decorative only, never story text.
- Place names: Libre Baskerville 700 CAPS with tracking 4.5px, 19-45px, with a 4.5px cream halo stroke (`rgba(238,229,203,.9)`) behind. Water names: Baskerville italic 21px, #2c6d96, tracking 2px.
- Story labels: Baskerville italic 700, at least 42px on screen (when the camera is at 2.3x, set them to 20px in map space), with the cream halo.
- Cartouches (inset boxes): title 42px caps, tracking 1.5px; count 99px; key number 120px Baskerville 700 ink, turning #b5352a when it lands with a red underline growing 285px over 0.3 s.
- Counts rise in log-ish fashion with `inQuad(u)^0.8` formatted with thousands separators; percentages ease with `H.ease.inOutCubic`. Numbers never roll; they step as integers.

## Diagrams: arrows, labels, charts
- **Cartouche**: a screen-fixed box in `rgba(238,229,203,.97)` with a double rule (2.4px, then a 0.7px rule 10px inside), text in caps. One per beat; never more than one on screen.
- **Slope arrow**: a solid 3px red line drawn on along the route direction, ending in a filled triangle (9px long, +-2.5 rad), with an italic label in red.
- **Claims** ("guess", "check", "adjust"): small italic labels beside the walker, crossfaded as the walker moves; a step-strip cartouche highlights the active word in red with a 4.5px underline.
- **Chart** (progress): inside a cartouche, axes at 40% ink, a 4.5px red curve `1 - exp(-4u)`, italic axis label right-aligned beneath.
- **Wrong / right**: red "x" plus a spiral ring, versus a #2c6d96 check (3.6px, 3 points). A conclusion is a red ring drawn round a map feature (the lake, the summit).
- Anything numeric about the story is shown as an elevation figure or a cartouche, never a floating chart.

## Motion
- Easing: `H.ease.inOutCubic` for camera and route walk; `H.ease.outCubic` for plate slides; linear for the dashes.
- Printing sequence (opening, 3.5 s): black frame and collar 0 to 0.6 s; grey plate 0.3 to 1.0 (85%); green 0.6 to 1.3; blue 0.9 to 1.5; contours rise from the shore up by level over 1.2 to 3.4 s (the newest 2.5 intervals fade in from 35%); water lining ripples at +0.12 s per ring; red section grid 2.4 to 3.0; streams trace downhill 2.6 to 3.8; names 3.2 to 3.7; route walks 3.5 to 5.0.
- Camera: a very slow push of 2% over the whole shot; on action beats a keyframed zoom of 2.3x centred on the walker or the subject, then back out to 1.0 to show the lot (1.2 s moves).
- The walker leads the route as it draws; later it steps along it in stages that follow the eased progress, never gliding.

## Scene changes
The medium's change is the next printing plate. Between beats of the same map, move the camera and swap the cartouche over 0.3 s. To change to a new idea, print the next sheet: fade the plates out in reverse order (blue, green, brown, grey) over 0.8 s while the neatline and collar remain, then reprint the new terrain using the opening sequence at 1.5x speed. The collar title block receives the question: a large cartouche docks into it over 0.9 s (`inOutCubic`), shrinking from 96px to 42px while sliding bottom-right.

## Finishing passes (run every frame, same strength)
1. Fold crease: a 30px vertical gradient at the centre, white 18% at 0.45, `rgba(90,70,40,.10)` at 0.55, transparent.
2. Foxing: 7 radial blotches (seed `H.rng(77)`, radius 45-210px, `rgba(180,150,100,.10)` to 0 at 80%), `multiply`.
3. `H.vignette(ctx, {strength: 0.18, color: '#503c1e', inner: 0.55})`.
4. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 12, mono: true})`.
All four sit above the map and below nothing; the cartouches are inside the sheet.

## Sound palette
- element appears (survey point): a short draughting-pen tap, a bandpass noise tick near 2 kHz (14-18 ms, gain 0.16) followed by a second tick 30 ms later; throttle to 12 per second, gain rising slowly; minor.
- label lands: a soft wooden note, `k.tone(t, {f: 'D3', dur: 0.5, gain: 0.07, a: 0.006})` with a quiet 4th harmonic (dur 0.08, gain 0.012); pitch varies D3/G3/E3 by cartouche.
- arrow completes: `k.play('pencil', t, {dur: drawLength, gain: 0.9})` for each red mark, plus a tick at the start.
- drawing / writing: a pen stroke for the route and for hand rings, `k.play('stroke', t, {dur: drawLength, gain: 1.0})` matched to the draw time.
- scene change: a slow pink bandpass whoosh (f 400, dur 0.9, gain 0.09) for camera moves; reprinting uses the terrain swell.
- terrain rising: use a quiet lowpass brown-noise swell near 250Hz that lasts through the roughly four-second reveal. Give it a long attack, then stop it before the map labels land. The lake can add sparse soft 500-680Hz lapping bursts.
- walker steps: a gravel crunch (pink bandpass noise near 850 Hz, 80 ms, gain 0.2, plus a quiet bandpass at 1800 Hz and a 95 to 55 Hz thump) once per route stage, spaced by the eased progress at no more than 9 per second.
- wrong: `k.play('error', t, {f: 'D3', gain: 0.5})` then a lower `'A2'` triangle tone. right: `k.play('ding', t, {f: 'G4', gain: 0.4})` then `'D5'` 80 ms later.
- key number: `k.play('impact', t, {gain: 0.8})`, `k.play('ding', t + 0.02, {f: 'D5', gain: 0.6})`, water noise for 0.9 s.
- takeaway: three-note `ding` D4, A4, F#5, 0.09 s apart, gains 0.36, 0.3, 0.24.
- bed or music: `k.bed(0, DURATION, {kind: 'wind', gain: 0.3})`; no music.

## Signature moves
- The map prints plate by plate, with the green plate sliding into register.
- Brown contours rise from the lake shore like a tide, the newest ring still pale.
- A red dashed route is drawn by a walker who leads it, then steps along it.
- Numbers are lettered as elevation figures and cartouches.
- A question docks into the collar's title block.
- The camera pushes in on the walker, then pulls out to show the whole terrain.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Contours look like blurry noise rings | true marching squares on a heightfield, one line per level |
| Terrain is a uniform bumpy field | massifs, ridges, a basin; contours must crowd on slopes and open on plains |
| Everything perfectly clean | paper texture, plate registration offset, fold crease, foxing |
| Labels clash with lines | knock out contours around numerals; cream halo behind names |
| Collar text too small to read | collar text is decorative only; story text lives in cartouches >= 42px |
| Route is a smooth curve | switchbacks that flip side, dashes, a walker that steps |

## Hero frame recipe
1. Cached paper; neatline (54, 45)-(1866, 930); collar with scale bar, north arrow, title block right-aligned.
2. Grey, green, blue plates at full strength; green offset 0.
3. All contours; six water-lining rings; shoreline; two streams.
4. Index numerals with knockouts; summit triangle with a 19px spaced name and its elevation; lake name italic 21px.
5. Red route from summit to lake, walker 60% down.
6. A cartouche at (75, 66), 705x264px: caps title 42px, key number 120px.
7. Fold crease, foxing, vignette, grain. Check: the numerals read uphill and lines break around them.
