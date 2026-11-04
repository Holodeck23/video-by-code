---
id: psychedelic
name: Acid Litho Poster
family: Cosmic
fonts: [Shrikhand, Righteous]
best_for: music, culture, brain and mind topics, anything about feedback loops, learning or transformation; high-energy openers and short explainers
avoid_for: dense numeric tables, serious finance or health, long reading passages, anything that needs a calm tone
---

# Acid Litho Poster

The viewer is watching a 1960s concert poster that has come alive: flat full-strength litho inks, printed slightly off register on warm cream stock, with liquid ring bands that never stop churning. The quality that sells it is vibration: complementary hues side by side, thick dark key lines, and lettering that melts and wobbles like hot wax.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #fbefd2 | warm cream, never white; the paper shows through every panel |
| Key line / ink | #22072b | blackened plum; every outline, every shadow edge |
| Hot pink | #ff1a8c | vibrating pair with acid green; the default band colour |
| Acid green | #a4f01a | pair of hot pink; "right / yes" colour |
| Orange | #ff6a00 | second pair with electric blue |
| Electric blue | #1b3dff | pair of orange; drop shadows under yellow type |
| Purple | #6d17c8 | band line colour, depth, petals |
| Yellow | #ffe11a | headline fill, arrows, the single most important thing on screen |
| Alarm red | #ec1c24 | wrong marks, clash state only |
| Soft pink | #ff9ad5 | one-off label tint |
| Highlight white | #fffaf0 | eyes, daisies, sparks |

Rule: fills are always two inks that fight (pink/acid, orange/blue, purple/yellow). Never a tint, never a gradient except inside lettering and one chart area.

## Ground and surface
- Base: fill #fbefd2. Under every scene run the liquid band field (below) full frame; paper only shows as the border of panels and in the finishing pass.
- Liquid ring bands: computed per pixel into a 960x540 buffer (half resolution, upscaled with smoothing), rewritten every frame from `t`. Allocate the buffer once with `H.offscreen('liq', 960, 540, () => {})` and `putImageData` into it each frame.
  - Centre-relative coordinates scaled by 1/540. Warp them 4 times: coordinate A moves by `(warp/i)*sin(i*1.6*B + t*0.7 + i*1.9)`, coordinate B by `(warp/i)*cos(i*1.4*A - t*0.55 + i*0.6)`, for i = 1..4. Start `warp` 0.24 to 0.32.
  - Ring value `p = hypot(A,B)*freq + phase - t*speed`; `freq` 7 to 9 rings per unit, `speed` 0.55 to 0.9 (calm), 2.5 (clash). Band index is `floor(p)` mod colour count (2 colours calm, 3 to 6 on a payoff).
  - The key line is where `p mod 1 < 0.1` (0.16 for the hero frame). Paint colours first with 3-tap anti-aliasing (samples at `p`, `p +/- 0.35*gradient`), then the line plate offset about 2px right and 1.5px down so it reads as a second press pass.
  - Optional fold: replace the angle with a mirror fold into `n` wedges (`n` 10 to 12), blend factor 0 (liquid) to 1 (mandala), rotating slowly with `t*0.15..0.3`.
  - Optional flood: inside a growing circle use a second colour pair and line colour; the circle edge is stroked 27px ink then 13px yellow. This is the "colour ripples out from a point" opener, 1.35 s ease in-out to radius 2250.
- Cached: the paper and speck layers (see Finishing). Per frame: the band buffer only.

## Mark-making
Every shape is flat fill plus ink key line; nothing is shaded.

**inkFill(path, fill, lw, off)**: (1) fill the path translated by `off` (default 4px right, 3px down; panels 8px, 8px) in the same fill; (2) fill again in place; (3) stroke `lw` in #22072b, `lineJoin` round. `lw` 4 to 9px. The offset sliver is the misregistration.

**Blob**: a circle whose radius is `1 + amp*sin(angle*lobes + phase)`, 90 points. Lobes 5 to 16, `amp` 0.025 to 0.07, `phase` = `t*1.5..4` so every disc, bubble and panel breathes. Use it instead of circles and rounded boxes wherever you can.

**Petal rosette (hub motif)**: 12 outer petals around a centre of radius R (273px hero, 225px mid, 138px small), alternating two inks. Petal = bezier lens from radius 0.3R, widest at 68% of its length, tip slightly rounded; width 0.21R. Length is `R*(0.5 + 0.48*weight)`, so a 12-number array draws a value per petal. A smaller inner petal (72% length, half width) in a contrast ink sits on each, and a cream dot caps the tip. 12 more short petals (0.4R) sit between, offset half a step. The whole thing rotates `t*0.06` rad/s. Opening: each petal pops with `H.ease.outBack` staggered by 0.05 of the open progress.

**Eye option (centre of the rosette)**: cream blob ring 0.5R with 16 pink dots; white disc 0.4R with 9 red vein polylines (alpha 0.75, 2 to 4px, 5 jittered points each, clipped to the disc); iris = three concentric discs 0.64 of the disc radius (blue, acid, orange) with 20 short radial ticks (#22072b, alpha 0.55); pupil 0.4 of the iris in ink; two white highlights. The gaze offset is up to 0.28 of the disc radius and follows `sin/cos(t*0.7..0.9)`.

**Sunburst**: 32 flame-tongue rays behind the hub, alternating long (1.0) and short (0.8) with inner radius 0.4, tips curling by `0.1*sin(t*2.2 + i*1.7)`; fills alternate two hot inks, 5px ink outline. A "gauge" version lights only the first `lit` fraction and leaves the rest dark violet (#4a1a63 / #35104a).

**Striped ribbon**: one path drawn 5 times: ink 81px, fill A 66px, ink 42px, fill B 33px, dashed highlight 12px (dash 18/22, offset `-t*160`) in cream. Objects ride it with `u = (t - spawn)/1.45`.

**Daisy / spark**: 8 white petals, yellow centre r 0.32, orange core; sparks are 4-point stars alternating white/yellow. Corner fillers that rotate `t*0.4`.

## Type and numbers
- Display: Shrikhand. Poster title 207px, scene title 150px, headline 90px. Labels and axes: Righteous 45px minimum (banner text 51px). Key number 156px; counters 105px.
- Lettering is rendered once offscreen (cache by string, size, style) as five layers: drop shadow (12px, blue or purple or mag), outer cream stroke (9px), ink outline (8 to 12px), gradient fill (yellow, yellow, orange top to bottom), inline stroke in pink inside the glyphs (clip with `source-atop`, 9px then 4.5px).
- Draw it in 3px vertical slices. Each slice gets `dy = amp*sin(x*freq + phase)` (amp 3 to 10px, freq 0.011 to 0.04, phase `t*3`) and a vertical swell `1 + bulge*sin(pi*u)` (bulge 0.12 to 0.4). Melt-in: `melt` 0.9 to 0 over 1.3 s with `H.ease.outCubic`; slices stretch downward by up to `melt*height` in a drip pattern (two multiplied sines, squared), amp starts +30px and decays to 3px, alpha fades in over the first 0.5 s.
- Label pill: cream rounded pill, height 1.6x the type, 7px pink or blue offset shadow, 7px ink outline, Righteous text still wobbling (amp 1.5px). The active pill gets a ring: 28px ink then 18px accent ink under it, and scales 1.08.
- Numbers: counter in a cream blob cartouche; count `n = target * prog^2.2` with thousands separators, tocking per integer step. When it lands, scale 1.18 settling to 1 in 0.3 s. A percentage hits as a burst (see Sound).

## Diagrams: arrows, labels, charts
- Arrow: 56 points along any curve, offset along the normal by `wob*sin(u*2pi*waves - t*7)` damped to 0 at both ends (`wob` 6 to 10px, 2 to 4 waves). Draw ink at width+13px, then colour at width 18 to 21px, optional cream core 0.3 wide. Head: concave kite (curved sides) with `inkFill`, length 1.9x width. Draws on by `prog`.
- Labels attach by a 13px ink / 6px cream tendril from the pill to a dot on the thing, dot r 10px.
- Wrong mark: two curved strokes, ink 31px under red 21px, scribbled ring beside it. Right mark: tick, ink under acid green. Both pop in with 1.8x scale easing to 1.
- Chart: cream panel, 60px corner radius, 10px ink border, 10px offset shadow, tilted 0.015 rad. Area fill gradient acid to yellow with diagonal pink stripes (alpha 0.5, 9px, 39px pitch); line ink 20px under pink 9px; point markers 14px in blue / orange / purple / yellow cycling with ink rings. Axis ink 7px. Never a grid.

## Motion
- Easing: `H.ease.outBack` for pops and petals, `inOutCubic` for floods and wipes, `outCubic` for melts. Entrances are 0.3 to 0.6 s.
- Everything is always slightly moving: band field, blob phases, wobble phases, hub rotation, gaze. Nothing is ever static for more than a beat.
- Wrong beat: swap band colours at 15 fps between {red, pink, acid} and {pink, orange, blue}, raise `speed` to 2.5 and `warp` +0.22, shake the whole frame +/-10 x 7px (seeded by `floor(t*15)` via `H.rng`), jitter petal angles +/-0.12 rad.
- Right beat: ease `fold` 0 to 1 over 0.6 s, colours settle to purple / yellow, petals tidy to uniform weights.
- Objects spawn on a ribbon with accelerating intervals (0.42 s shrinking 0.03 per item to a floor of 0.17 s).

## Scene changes
Three, each 0.5 to 0.7 s. Render outgoing and incoming scenes to two cached full-frame canvases (`H.offscreen`) and composite.
1. Kaleidoscope turn (0.7 s): mirror the source into 10 wedges, alternate wedges flipped, rotation `(p-0.5)*2.4`, zoom `1 + 0.45*sin(pi*p)`, overlay alpha eased in and out at the edges, 7px ink seams. The scene swaps at p = 0.5.
2. Liquid melt (0.7 s): the next scene is clipped to everything above a moving wave edge: level `inOutCubic(p)*(1080+330) - 170`, plus two sines (27px/0.009, 15px/0.023) and 7 to 10 drip tongues (width 16 to 36px, length 60 to 255px, grown over the first 45% of the move, round tips). Edge stroked ink 30px (+6px down), pink 13px, yellow 4px (-6px).
3. Iris ripple (0.5 s): blob circle clip growing to radius 1230; rings stroked outward: ink 51px, yellow 39px, ink 9px, pink 18px, ink 8px at offsets 0, 6, 24, 33, 48.
Stay continuous (just recolour the band field) between beats of the same idea.

## Finishing passes (run every frame, same strength)
1. Paper: `H.paperTexture(1920, 1080, { seed: 77, tone: '#fff9ec', fiber: 0.6, grain: 0.5, blotch: 0.3 })` composited with `multiply`. It tints everything cream-warm, including the inks.
2. Worn-ink specks: three cached layers, each 2600 tiny cream ellipses (0.6 to 2.2px, alpha 0.25 to 0.75) plus 26 dropout clusters (14 dots, gaussian spread 9x6px, alpha 0.12 to 0.3). Draw layer `floor(t*8) % 3` at alpha 0.5 so the wear crawls at 8 fps.
3. `H.vignette(ctx, { strength: 0.3, color: '#3c0a28', inner: 0.55 })`.
4. Payoff flash: a cream wash (#fffadc) at alpha 0.42 fading over 0.35 s on the key-number hit.

## Sound palette
Warm organ drone, round bass plucks, phaser sweeps. Keys: E dorian.
- element appears: a round pluck, `k.tone(t,{f:'G2',gain:0.34,type:'triangle',a:0.004,r:0.3,dur:0.5})` plus a sine sub one octave down (`f:'G1'`, gain 0.22, dur 0.35); vary the note per label (E2, G2, A2, B2, D3).
- label lands: the pluck on a different note, `gain` 0.25 to 0.3, pan to the label's x.
- arrow completes: a soft swell, `k.noise(t,{f:700,filter:'bandpass',q:2,color:'pink',gain:0.08,a:0.2,dur:0.4})`, inside `k.minor`.
- drawing / writing (melt-in): a rising triangle tone from 98 Hz to 165 Hz (`glideTo`), slow attack `a` 0.5, 1.1 s long, gain 0.16, under a phaser whoosh of the same length.
- scene change: phaser = two pink bandpass noises 0.03 s apart (`f` 500 and 1300, `q` 5 and 7, `dur` 0.85, `a` 0.4, gain 0.3 and 0.2); melt adds `k.tone(t,{f:330,glideTo:98,dur:0.75,gain:0.14})` and three drip blips (f 520, 460, 400 gliding to 200, dur 0.1, pan -0.5, 0, 0.5).
- wrong: three sawtooth tones at 233, 247 and 175 Hz, `glideTo` 0.62x, `dur` 0.9, `gain` 0.09, plus `k.play('thud',t,{f:110,gain:0.7})`. Under the clash, two detuned sawtooth tones at 117 and 168 Hz, gain 0.03, `dur` 1.7.
- right: E3, G#3, B3, E4 triangle tones, `dur` 1.3, `a` 0.12, gain 0.07, each doubled with a sine +2.5 Hz; plus a low pluck.
- key number: `k.play('impact',t,{gain:1.15})`, six detuned chord tones (E2 to E4, +/-3 Hz, dur 1.6, gain 0.065), `k.noise` pink bandpass f 2000, dur 1.2, gain 0.08. Counting before it: `k.play('tock',t,{f:380..640,gain:0.6})` per integer step, 60 to 120 ms apart, getting faster.
- takeaway: E major triad (E3, G#3, B3) triangle `dur` 1.05, gain 0.08, then a low pluck on the last word.
- bed: three drone layers from 0 to the end: `k.tone(0,{f:82.4,type:'sawtooth',dur:D,gain:0.022,a:0.6})`, `k.tone(0,{f:85.6,type:'triangle',dur:D,gain:0.05,a:0.6})`, `k.tone(0,{f:41.6,dur:D,gain:0.03,a:0.6})`. Re-voice the chord each scene (E3/G3/B3, A2/E3/C#4, E3/G#3/B3).

## Signature moves
- Colour floods out of a point as an expanding wobbly circle with a double edge.
- Headline melts down into place on sliced, wavy lettering.
- A value arrives as a petal: a 12-petal rosette whose lengths are the data.
- The wrong beat is loud: palette flips at 15 fps and the frame shakes.
- Correction folds the field into a mirrored mandala.
- Key number bursts into a sunburst with a cream flash.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Pastels or gradients | only the 11 inks; fills are flat, pairs are complementary |
| No misregistration | always draw the offset fill (3 to 8px) and the 2px line-plate offset |
| Static bands | `speed` is never 0; keep `t*0.55..0.9` always running |
| Clean white paper | multiply paper and specks; vignette in plum, not black |
| Text is a plain font | five-layer lettering, then slice-wave it |
| Per-pixel pass too slow | 960x540 buffer, never full-res; 640x360 for previews |

## Hero frame recipe
1. Fill #fbefd2. Draw the band field full frame: pink / acid, line #6d17c8 at 0.16, `freq` 8.5, `warp` 0.24, centre (960, 645).
2. Sunburst, R 460, rays orange and blue, 32 rays. Rosette on top, R 273, outer petals pink / acid, inner petals orange / blue, eye with gaze at (+0.3, +0.1) and pupil breathing +/-8%.
3. Four daisies at the corners (r 93 and 69), rotating.
4. Title, 207px Shrikhand, five-layer, blue shadow, centred at (960, 180) with a faint wave (amp 8px). Banner at (960, 1002), 345px half-width, pink with folded tails, 51px Righteous text in ink.
5. Finish: paper multiply, speck layer 0, plum vignette.
