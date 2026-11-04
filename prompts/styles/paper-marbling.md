---
id: paper-marbling
name: Paper Marbling
family: Paper & craft
fonts: [Libre Baskerville]
best_for: flow, mixing, influence and adjustment stories, systems where one thing drags another, gentle craft or heritage tone, abstract "chaos into order"
avoid_for: precise quantities, fast technical walkthroughs, anything that needs sharp geometric diagrams
---

# Paper Marbling

The viewer believes they are watching a marbler work a shallow bath: pigments are floated onto thickened water, a stylus and a comb drag them into veins, and a sheet of laid paper has been pressed on to pick the pattern up. The one quality that sells it is that nothing is drawn as a pattern: every drop, drag and comb pass is a real geometric displacement of everything that came before, so veins are always continuous.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (bath, light) | #efe3c4 | cream; the floating surface in working scenes |
| Ground (bath, finished sheet) | #d9bf86 | sand, behind a dense stone pattern |
| Indigo | #1d2a5e | main cool pigment |
| Ochre | #d89c2c | main warm pigment |
| Madder red | #a6252b | the accent: probes, rings, alarms; the one thing to look at |
| Teal / slate / sky | #21807c / #3f5470 / #7ea6c4 | supporting cool pigments |
| Rose / green / ink | #cf6f5e / #4f6b3a / #1b1d27 | accents; green only for stems and leaves |
| Label paper | #f3ead2 | bookbinder label; red variant #f6e6d6 |
| Label ink | #2a2018 | label text, rules, arrows; red label ink #a6252b |

Pigments are never pure: each fill carries the granulation below, so #1d2a5e reads as a speckled dark blue.

## Ground and surface
1. Fill the bath colour, then a diagonal gradient from (0,0) to (W,H): `rgba(255,250,236,.35)` at 0, 0 at 0.55, `rgba(150,120,70,.12)` at 1. The bare bath is never flat.
2. **Laid paper** (cached `H.offscreen`, multiplied over the finished frame): per pixel `k = 0.93 + 0.07*grainNoise + cockle + laid + random(+-0.02)` where grainNoise is two octaves of `H.noise` (0.08 and 0.35 frequency per px at 1280; scale by 2/3 at 1920), laid = -0.025 on every 4th column and -0.03 on a 2px chain line every 96px, cockle = a broad `fbm2` at 0.003 frequency x 0.11. Draw with `multiply`.
3. **Cockle**, from the wet sheet drying: a 240x135 field of three-octave `fbm2` sampled at 0.035 per cell; positive values become white, negative black, alpha `min(1, |v|*0.43)`; draw it scaled up over everything with `soft-light`.
4. **Pigment granulation**: one 512px tileable noise tile per pigment colour (`0.9 + 0.16*(1.6*noise + random*0.5)`, clamped 0 to 1.05, multiplied into the hex). Fill polygons with `createPattern(tile, 'repeat')`. The granulation lives only inside pigment, never on the bare bath.
5. All of the above is cached except the pigment polygons, which are rebuilt per frame.

## Mark-making
There is no stroke primitive. Everything is a closed polygon (a floated colour) and a list of transforms applied in order to every polygon that already exists. Coordinates at 1920x1080.

**Pure replay.** Each frame, start from an empty list and replay the whole schedule up to `t` (drops with time-derived radius, ops with time-derived strength). Keep it fast: cull polygons that leave the sheet by more than 330px; keep maximum segment length at 4.8-6px; for long scenes cache the polygon state at 0.25 s checkpoints with `H.offscreen`-style keys and replay from the nearest one.

**Drop** at centre c, radius r (the ink-drop transform): every vertex p moves to `c + (p - c) * sqrt(1 + r^2 / |p - c|^2)`, and a new circle of radius r (about `max(48, min(360, 2*pi*r/3))` points) is pushed on top. A drop landing eases its radius out with `H.ease.outCubic` over 0.3 s, so neighbours are shoved aside as it blooms.

**Tine** (a stylus pulled along a line through point o with unit direction M, strength a, sharpness l): each vertex p with distance d to the line moves by `a * l / (d + l)` along M. Small `l` (24 to 36px) is a sharp scratch; large `l` (60px) a broad drag. Positive and negative `a` give a pull and a counter-pull.

**Comb**: a periodic set of tines every S px along one axis, with alternating push direction; sum the tine effect of the 7 nearest lines. Coarse rake S 120, a 105, l 33. Fine comb S 68, a 33, l 18. A **wave**: `p.x += A * sin(2 pi y / L + phase)` with A 27, L 390 gives soft chevrons.

**Re-subdivision**: after each operation, any polygon edge longer than the max segment length is split at its midpoint (sampling the transform at the pre-image midpoint, depth 5), so stretched veins stay smooth.

**Render each polygon**: fill with its pigment tile; if freshly dropped (under 0.7 s) clip to it and stroke a 9px inner halo in `mixRGB(colour, #fff6e2, 0.35)` at 38%; then stroke 1.5px in the same colour at 66% brightness, 72% alpha (pigment pools at the rim). Soften the whole canvas at the end with one `blur(0.9px)` resample.

**Flow-dragged speckle.** Multiply a fine luminance speckle (amplitude +-12%) over the pigment, sampled at the pre-comb position, so the freckles are dragged by the rake: for a vertical comb, shift lookup row by `-combShift(x)`, one value per column.

**The recipes.** *Stone*: 270 drops (radius 42-96px, positions over the sheet plus 120px margin, colours cycling indigo, sand, sky, indigo, cream, teal, indigo, slate, sky, indigo, sand, ochre) landing over 2.1 s with cadence `(i/270)^0.9`; 160 tiny eyes (radius 4-17px, cream, ochre, ink); then the rake and wave; then 40 tiny dark drops. *Ring flower*: 21 concentric drops at one point (first radius 51px, the rest 36px, 0.045 s apart, colours ochre, red, cream, red, cream, ochre, cream, red, ink, cream, red, cream, teal ...), then one tine pulled straight through its centre (a 390, l 24) to fold the rings into a pointed petal; smaller side flowers (9 rings, radius 22-30px) pulled the opposite way (a 180, l 15); stems are a column of 14px drops every 36px, leaves two 36px green drops pulled diagonally.

## Type and numbers
- Only Libre Baskerville 700, upright for names and numbers, italic for notes. Letter-spacing 1px.
- Story labels never below 42px; running header 42px italic; section words 48-54px; key number 180px; counts 96px; every piece of text lives on a paper label (below), never straight on the bath.
- A label eases in with `H.ease.outCubic` over 0.25 s, sliding down 27px; a title label pops with `H.ease.outBack` over 0.35 s.
- Numbers count in log space (`floor(10^(6u))`, `inOutCubic`) on a left-aligned label; a percentage rises on its label with a quick punch (scale 1.12 decaying over 0.15 s) when it lands, and a hand-inked red ellipse closes round it (overshooting by 10%, 0.25 s).

## Diagrams: arrows, labels, charts
- **Bookbinder label**: rectangle in #f3ead2, width = text + 1.4 x size, height 2 x size; shadow rect offset (4, 6) `rgba(30,20,10,.25)`; double rule inset 6px (2.4px) and 10px (0.9px) in label ink. Red variant for alarms and the key claim.
- **Arrow**: an inked stylus stroke, 6px (9px for emphasis) round caps, drawn on linear in length; the head is a filled tapered shape, length `4.5 x width`, with a slightly concave back. Colour label ink, or red for an error or correction.
- **Attachments**: a label sits 60-90px above or beside the thing it names; never a leader line.
- **Chart**: a label-paper card with double rule, ink axes at 1.5px, one red stylus-drawn line with the arrow head; axis label in italic 42px beneath. No fills, no gridlines.
- **Process words** ("step - step - step") are labels joined by short arrows; the active one flips to the red variant.
- Anything that moves is a ring-drop displaced by a tine: a "probe" is five concentric drops alternating red and cream (radius 60px then 28px); drag it along with a tine through its row (a 450, l 60) and counter-drag to send it back; a coarse comb pass is how things get put in order.

## Motion
- Easing: `H.ease.outCubic` for blooms and labels, `H.ease.inOutCubic` for drags and combs. Tine strength is `a * ease(u)` over 0.4-0.7 s, so the bath visibly flows.
- Drops rain at a rate that accelerates then thins; the first four are 0.1 s apart, later ones 0.16 s.
- Camera: a very slow push, scale 1.08 to 1.02 over the first 2.4 s of a scene, then still. Nothing else moves while a comb is being pulled.
- Between beats, a wet sheen (a diagonal 520px band of `rgba(255,250,235,.13)`, `screen`) glides across the finished bath in 1.3 s.

## Scene changes
Peel the printed sheet off the bath. Over 0.55 s (`H.ease.inOutCubic`) a vertical peel edge sweeps left to right from x -120 to W+200. The next scene is drawn first; the old scene is drawn on top only to the right of the edge plus a 135px curl. At the edge: a 60px shadow strip `rgba(20,10,0,.35)`, then a 135px strip of the paper's back, a horizontal gradient `#d9ccad`, `#f5ecd6` at 0.55, `#bfae8a`. Render the old scene to an offscreen layer once at the cut moment. Between related beats do not peel; comb instead.

## Finishing passes (run every frame, same strength)
1. Soft resample: draw the canvas over itself at 50% offset by 0.75px (a cheap `blur(0.9px)`).
2. Laid-paper multiply, then cockle soft-light (cached layers).
3. `H.vignette(ctx, {strength: 0.2, color: '#281909', inner: 0.55})`.
No `H.grain`: paper tooth does that job.

## Sound palette
- element appears (a drop landing): a low bubble, `k.tone(t, {f: 400, glideTo: 840, dur: 0.075, gain: 0.13, a: 0.002})` plus a body `k.tone(t, {f: 140, glideTo: 90, dur: 0.08, gain: 0.1})` and a 30 ms lowpassed noise tick (700 Hz cutoff, gain 0.08). Pitch `520 - 2*radius`, pan from x (-0.7 to 0.7); throttle 0.16 s; mark them minor.
- label lands: a paper tap 60 ms after the label starts, made of a 50 ms bandpass noise burst around 1 kHz (low q, gain 0.12) under a 50 ms sine at 150 Hz (gain 0.07); minor.
- arrow completes: `k.play('stroke', t, {dur: 0.2, gain: 1.4, minor: true})` in sync with the red ring, never a ding.
- drawing / dragging: six overlapping pink `k.noise` bandpass pieces across the drag (f 380-760 rising then falling, q 1.6, gain 0.13 shaped by a sine envelope, pan travelling with the stylus).
- scene change (peel): pink bandpass noise `f: 800, q: 0.9, dur: 0.6, gain: 0.12` plus 15-20 tiny noise ticks (f 700-1500, q 1.2) panning -0.7 to 0.7, ending with a brown-noise thump 0.5 s in (120 ms, lowpass at 300 Hz, gain 0.12) as the last of the sheet lets go.
- comb pass: a pink lowpass swish `f: 700, dur: pass + 0.1, gain: 0.13`, plus riffle ticks every 0.045-0.075 s.
- wrong: two `k.play('tock', t, {f: 300, gain: 0.7})` and `{f: 225}` 0.16 s later plus `k.play('thud', t, {f: 100, gain: 0.45})`. right: `k.play('ding', t, {f: 'G4', gain: 0.5})` then `'D5'` 0.09 s later.
- key number: `k.play('impact', t, {gain: 1.0})`, a deep plop (`f: 180, gain: 0.29`), and a four-note triangle chord D3, A3, F#4, A4 (dur 1.3, gain 0.07, 0.03 s apart).
- takeaway: five-note triangle chord G2, D3, B3, D4, G4, 0.05 s apart, plus a label tap.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.3})` and `k.music(0, DURATION, {mood: 'calm', bpm: 64, key: 'D', gain: 0.35})`. Counter ticks: eight per second, a `tock` pitched near 700 Hz at gain 0.38, minor, skipped within 0.07 s of a drop.

## Signature moves
- A ring of concentric drops is pulled by one stylus stroke into a petal.
- Drops land and shove earlier colour into veins; nothing is placed, it is displaced.
- A comb pass turns chaos to order.
- A probe drop is dragged, struck, and counter-dragged.
- The printed sheet peels off the bath to change scene.
- Each text item is a bookbinder label with a double rule.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Swirls look like a hand-drawn texture | use the exact drop and tine transforms, with re-subdivision, never a noise displacement |
| Clean vector edges | 1.5px darker rim, granulation tiles, final 0.9px soften |
| Flat cream background | diagonal tone drift, laid-paper lines, cockle |
| Stretched veins look jagged | split edges above 6px each operation |
| Too many pigments in one scene | six at most; red only for the accent |
| Frame-to-frame jitter | replay the schedule purely from `t`, seeded `H.rng` |

## Hero frame recipe
1. Bath #d9bf86 with diagonal drift; cached laid paper and cockle.
2. Stone: 270 drops, 160 eyes, rake (S 120, a 105, l 33) at full strength, wave A 27.
3. 21 ring drops at (960, 375), then a tine through it (a 390, l 24) for the petal; two side flowers at (495, 630) and (1425, 630); stem and two leaves.
4. Granulation on every fill, flow-dragged speckle, 0.9px soften, multiply paper, soft-light cockle.
5. A label: 96px italic "WORD WORD" centre-top on a #f3ead2 label with double rule and a shadow; a red-variant 48px label below it.
6. Sheen band mid-way, vignette 0.2.
