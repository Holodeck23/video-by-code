---
id: gouache-poster
name: Matte Gouache Poster
family: Painterly
fonts: [Bebas Neue, Oswald]
best_for: places, journeys and systems told as scenery, progress and growth stories, friendly technology, culture, energy, optimistic pitches, anything that suits a mid-century poster
avoid_for: dense tables, small print, anything that needs fine gradients or photographic realism, grim or clinical subjects
---

# Matte Gouache Poster

The viewer believes they are watching a mid-century poster being hand-painted on cream hardboard in opaque gouache. Six flat, matte colours are laid on one pass at a time with a wide brush; every edge is slightly ragged where the brush ran dry, and a bold lettering band is painted across the bottom. Nothing is gradient and nothing is glossy: depth comes from stacking flat values.

## Palette
Six paints plus tints made by mixing toward cream. Use only these.
| Role | Hex | Notes |
|---|---|---|
| Ground (board, "cream") | #f3e7cc | also the paint for lettering, snow, borders and the scene-change coat |
| Primary ink (navy) | #1e3442 | lettering band, outlines, labels, crosses |
| Structure (teal) | #2f7f83 | the main subject, bars, "right" ticks; tints #9bb8ab, #b4c6b5, #81aba2; shade #265a62 |
| Accent (orange) | #e0612b | the single most important thing: starbursts, the last bar, a beacon; shade #754838 |
| Highlight (mustard) | #f2b440 | arrows, belts, window lights; tints #f3d08d, #f2c672, #f3daa8 |
| Warm (rose) | #eaa58a | skies and loop-back arrows; tints #edbca1, #efcbb0, #f1d6bc; with navy at 0.62, #6c5f5d for a wrong answer |

A poster uses one dominant hue family for sky and ground, navy for the band, and orange once or twice. Never add a hue.

## Ground and surface
1. Board: fill `#f3e7cc`. Optionally draw the artist's pencil layout underneath: rgba(90,80,70,0.38), 1.5px, round caps, horizon lines, ridge outlines, a sun circle and rectangles where text will go. The paint buries it; it only shows in unpainted cream.
2. Bake these value-noise fields once at full size with `H.rng(seed)` and smoothstep interpolation, cached with `H.offscreen`, cells given as (along x, along y): `hS` 69x3.3 (long horizontal streaks), `hS2` 180x9 (broad), `vS` 3.6x60 (vertical streaks), `eF` 10.5x7.5 (near isotropic, for ragged edges), `bH` 135x13.5 and `bV` 13.5x135 (wide brush bands), `ch` 39x33 (chalky blotches).
3. Static board grain, added once per frame to all pixels: `9*(rng-0.5) + 4*(hS2-0.5)` plus a pixel-scale `H.noise` term of amplitude 3, to red and green, and 0.92 of it to blue, so the board is faintly warm.
4. Work on one `Uint8ClampedArray` RGBA buffer, repainted every frame (`putImageData` at the end). Finished passes are cached: record each finished pass as (pixel index, colour, coverage) lists under a key and replay them; when every background pass of a poster is done, snapshot the whole buffer instead.
5. Layout of every poster at 1920x1080: sky from the top to y 705, ground to y 858, a navy lettering band from y 858 to 1080, a 13px cream rule at y 840, a 30px cream border (hand-trimmed, ragged, cached).

## Mark-making
Everything is a `paint(colour, bbox, drawFn, {edge, rag, dir, tex, p})` pass: one colour, one brush sweep. Draw the shape in white on a scratch canvas, blur it by `edge` px, then convert to coverage per pixel inside the padded bbox.
- Ragged edge: threshold `thr = min(0.88, 0.5 + ((eF-0.5)*0.65 + (brushField-0.5)*0.35) * rag * 0.7)`; coverage = clamp((blurred - thr)/0.08 + 0.5). `rag` 0.2-0.4 on small shapes, 0.6-1.0 on skies and large fields. `edge` (blur) 0.9px on tiny lettering, 1.5-3px on shapes, 6px on skies, 9px on the scene-change coat. `brushField` is `hS` for horizontal, `vS` for upright shapes (`dir: 'v'`), and for slopes `dir: 'd'` reads `hS` along a shear (y + 0.42x).
- Body tone: `v = 1 + (hS2-0.5)*tex*0.65 + (bandField-0.5)*tex*0.5 + (brushField-0.5)*tex*0.25` with `tex` 0.07; `bandField` is `bH` or `bV`. Pile-up at the rim: where `(blurred - thr) < 0.3`, darken by up to 6% toward the edge. Multiply by the chalk bloom `1 + 0.03*smoothstep(0.6, 0.85, ch)`. Final pixel = lerp(old, colour * v, coverage). Opaque: coverage hides what is below.
- Brush on the move: for `p < 1` the paint is mid-sweep. Sweep position is x/w for horizontal (left to right) or `1 - y/h` for upright (bottom to top); `front = p*1.15 - sweep + (brushField-0.5)*0.1`; coverage x= min(1, front/0.035), a ragged dry front.
- Build a subject colour by colour, never with outlines: mid colour first, then its lighter plane, then its darker plane, then navy details, then cream highlights, then one orange accent. Each is its own pass with its own `p` window. Order within a poster: sky, two extra sky values, far range, near range (receding values, `dir: 'd'`), ground, subject, band, lettering, border.
- Receding layers: far ridges light (tint 0.5-0.7), near ridges dark (shade 0.25-0.5); snow or highlights are small cream polygons painted last on peaks.
- Poster props are simple polygons, circles and bars (a sun with 4 horizontal cut bars of 4.5-10px in the sky colour; windows as mustard 18px rectangles). Repeating small things (windows, puffs, belts) animate by recomputing the pass from `t`; do not cache those.

## Type and numbers
- Bebas Neue 400: title 210px (letter-spacing 9px), band lettering 144px (letter-spacing 4.5px, never below 126px), key answer word 180px, key number 165px.
- Oswald 400 for labels: 45px (never below 42px), letter-spacing 3px, navy on a cream or mustard arrow.
- Every piece of text is painted as cream (on navy) or navy (on cream) with `paint`, `rag` 0.3-0.6, so letters look brushed: edge softness at 1.8px and mild dryness.
- Lettering band: navy first (a 0.5s sweep), then cream text left-aligned at x 78, baseline y 1020, painted over 0.45s left to right.
- The opening title paints in navy at centre, then over 0.7s shrinks to 0.32 scale and flies to a navy tab at the top left (the tab paints first; the text is repainted in cream).
- Numbers are repainted: each changed value re-runs the cream pass in the band, with the value rounded (thousands for counts, integers for percentages). Big counts ease in with `H.ease.inQuad`; percentages with `H.ease.outQuad`. Key numbers get an orange starburst painted behind them.

## Diagrams: arrows, labels, charts
- Arrow: a flat block arrow polygon: shaft 51px thick, head triangle 90px wide x 117px tall; painted in cream, mustard or rose in one pass (0.35-0.45s, horizontal sweep); label in navy Oswald 45px painted on after, 15px clear. A loop-back arrow is a single bent polygon of the same thickness.
- Cards and objects: a cream square painted first, the picture colour by colour on top, a navy label strip below with cream Oswald text.
- Chart: a navy axis 12px thick, bars 96px wide with 33px gaps painted upward (`dir: 'v'`, 0.3s each, 0.15s stagger), tint ramp from `mix(teal, cream, 0.15)` to teal, the latest bar orange; a Bebas value above the band's top; axis label in Oswald 45px.
- Wrong: an orange starburst (28 points, radii 225 and 315 x 0.6-1.0, drawn 15% wider than tall) painted in 0.15s, a navy cross of two 33px bars at +-0.7 rad (360px long) across it, the wrong word in `#6c5f5d`, then a cream banner with the correction in Bebas 69px. Right: teal 33px check with round caps.

## Motion
- Every pass animates through `p = H.ease.inOutCubic(H.prog(t, a, a + dur))`, 0.3-0.6s long; neighbouring passes overlap by 0.05-0.1s so layers build like a stack of cut paper.
- Parallax: far layers still, mid layers drift 6px/s, near layers 14px/s (birds and belts faster); vehicles and conveyors move at 90px/s.
- Alive between beats: a sun rising 99px over 4s, steam or smoke puffs bobbing (`sin(t*1.5)*6px`), windows blinking on in rows, a beacon pulsing radius +-1.8px at 4 rad/s.
- Camera: none during painting; the finished poster pushes in 1.0 to 1.035 over 6s with `H.ease.inOutCubic` (the cream border stays put as the poster edge).

## Scene changes
A fresh coat of cream: `paint(cream, whole sky and ground, ..., {edge: 9, rag: 1.4, p})` over 0.45s, left to right, covering everything above the lettering band; the band stays. The next poster then paints on top of the cream, starting 0.5s later with its sky. Never cross-fade; if the next idea only adds to the current poster, paint the new elements in and keep going.

## Finishing passes (run every frame, same strength)
1. All cached passes replay at full strength; nothing gets blur or glow.
2. Border pass last (cream, `edge: 3`, `rag: 0.9`): the frame is hand-trimmed.
3. Board grain addition (see Ground), every frame, identical; it does not animate.
4. Optional `H.vignette(ctx, {strength: 0.08, color: '#5a4628', inner: 0.7})`.
5. Nothing else: no film grain, no bloom, no shadows. Flatness is the medium.

## Sound palette
Brushes on board and a light mid-century pad.
- element appears (passes of paint): a flat brush drag per pass: a 40 ms brown lowpass knock (f 450, gain 0.2), then pink bandpass grains (f 650-1000, q 0.7, gain 0.13, dur 0.06-0.09) every 35-55ms across the sweep, panned left to right, plus `k.play('stroke', t, {dur: sweepLength, gain: 0.9, minor: true})`.
- label lands: a short drag (0.3s, gain 0.6) with a 40 ms bandpass dab (f 950, q 1, gain 0.3) and a 170 Hz `k.tone` (50 ms, gain 0.08).
- arrow completes: the drag at gain 1.0, panned along the arrow's x.
- drawing / writing: the drag matched to the sweep time, quieter (gain 0.6-0.7) for lettering.
- scene change (cream coat): the same drag at gain 2.0 sweeping pan -0.7 to 0.7, plus brown lowpass noise (f 300, gain 0.14) under it, not minor.
- wrong / right: wrong: `k.play('slap', t, {gain: 0.55})`, `k.play('thud', t, {f: 120, gain: 0.4})`, then triangle `k.tone` A3 and F3 (gain 0.18). Right: `k.play('success', t, {f: 'G5', gain: 0.5})`.
- key number (biggest hit): `k.play('impact', t, {gain: 0.9})` with `k.play('slap', t, {gain: 0.9})`, `k.play('ding', t + 0.03, {f: 'E5', gain: 0.5})`, and two sustained `k.tone` C5, G5 (dur 1.2, gain 0.07).
- takeaway: `k.play('ding', t, {f: 'C5', gain: 0.45})` and tones E5 G5 C6 staggered 0.05s (gain 0.06, dur 1.2).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})` and `k.music(0, DURATION, {mood: 'calm', bpm: 64, key: 'C', gain: 0.3})`. Bars: one `tock` per bar at f 260 + 12i (gain 0.36) plus a rising pink bandpass swell (0.25s, gain 0.16).

## Signature moves
- Every poster is built colour by colour, with a visible brush front sweeping across each shape.
- A fresh coat of cream wipes the whole picture before the next poster begins.
- An orange starburst stamps the key moment behind its number.
- Receding flat ridges in stacked tints, with tiny cream snow highlights.
- The title shrinks into a navy tab and the lettering band narrates.
- Numbers are repainted in the band, never counted smoothly.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Crisp vector edges | blur the mask 1.5-3px and threshold with the `eF` and `hS` noise |
| Gradients or shading | only flat tints; depth is stacked values |
| Uniform flat fill | 7% body-tone variation, 6% rim darkening, chalk bloom |
| Every shape appears at once | one colour per pass, sweeping brush front, staggered 0.05-0.1s |
| Outlines around shapes | none: shapes are made of adjacent colour planes; use navy only for details |
| More than six paints | tint toward cream or mix toward navy; the hue stays |
| Clean board | grain on every frame and the pencil layout peeking through unpainted areas |

## Hero frame recipe
1. Board `#f3e7cc` with pencil layout (optional) and the fields above.
2. Sky: a #9bb8ab band to y 705, a #b4c6b5 band from y 375 to 705, one orange disc (radius 168) with 4 cut bars; far ridge #81aba2 (`dir: 'd'`), near ridge #609995, ground #265a62.
3. Subject in the middle ground: teal body plane, #265a62 shade plane, cream details, one orange accent.
4. Cream hand-trimmed border (30px), navy band from y 858, a 13px rule at y 840.
5. Band text "TWO OR THREE WORDS" in Bebas Neue 144px, cream, x 78, baseline 1020, letter-spacing 4.5px, plus a 9px orange underline.
6. One mustard block arrow with an Oswald 45px navy label.
7. Add board grain; compare: edges ragged by about 3px, no gradient anywhere.
