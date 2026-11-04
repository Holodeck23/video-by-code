---
id: holographic-foil
name: Rainbow Foil Cards
family: Light & imaging
fonts: [Russo One, Inter]
best_for: product and tech explainers told as collectible cards, stats, rankings, before/after, "level up" stories, anything with a hero object that should feel precious
avoid_for: sombre, medical or legal subjects, long paragraphs of text, anything that needs calm flat colour
---

# Rainbow Foil Cards

The viewer believes they are looking down at a dark desk where physical trading cards and die-cut vinyl stickers are being dealt, flipped and slapped down. The cards are printed on cracked-ice holographic foil: a rainbow that slides across the surface as the light angle drifts, with glints that flare on the foil but never on the printed ink. The one quality that sells it is the light moving under everything, continuously.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (desk, centre) | #26282f | radial gradient centre, slightly off the middle |
| Ground (desk, edge) | #0a0b0f | radial stop 1 |
| Foil cycle (8 stops, loops) | #ff46cd, #9664ff, #4696ff, #32ebff, #6effc8, #ffe464, #ff965a, #ff5fa0 | spaced at 0, .13, .27, .41, .53, .65, .79, .9 along a 0..1 hue axis; first = last |
| Foil base (silver) | 35% to 60% grey | mixed under the rainbow |
| Printed ink (panel) | #0e1228 | 86% alpha so foil glows through |
| Ink type | #141838 | text on paper panels; secondary #2a2e50 |
| Paper panel | #ece8dc | 95% alpha stat areas, cream, never white |
| Sticker vinyl | #ffffff to #dcd9d2 | diagonal border gradient |
| Accent | foil rainbow itself | the single most important thing is the foil-lit element |
| Alarm / wrong | #ff1e1e | 70% tint over a foil sticker |
| Right / result | #1ec850 | 75% tint over a foil sticker, with #0b3d1a text |
| Glint core | #ffffff | the hot highlight, 42-50% alpha |

Never a plain HSL wheel for the rainbow: the yellow-green band turns muddy against silver. Use the eight-stop cycle above, blended with a smoothstep between stops, baked into a 256-entry lookup table.

## Ground and surface
1. **Desk** (cached, `H.offscreen('desk', W, H, fn)`): radial gradient from (900, 500) r=90 to r=1350 across #26282f to #0a0b0f. Then in `screen` mode with `filter = 'blur(60px)'` paint two rainbow spills at 11% alpha: an ellipse 345x105 near the top-right and one 300x75 at the bottom-left, filled with a diagonal gradient through the foil cycle. Finally add per-pixel noise of +-4.5 levels (blue channel 1.1x) from `H.rng(5151)`.
2. **Foil tiles** (cached): bake 8 seamless tiles of 480x480, one per phase k = 0..7. Build a height field first from two ridged-noise layers of `H.noise(11).n2` (ridge = 1 minus the absolute value): a coarse layer at 0.01 cycles per pixel and a fine layer at 2.3x that frequency, offset so they do not align. Square each ridge, weight coarse 0.75 and fine 0.35, and scale the sum by 3.4. Squared ridges give faceted "cracked ice" creases. Make the tile wrap by blending four copies shifted by one tile with smoothstep edge weights. The height field is the same for all 8 phases; only hue and band change.
3. Shade each tile per pixel (`getImageData`/`putImageData`). Normal = `normalize(-dh/dx*2.2, -dh/dy*2.2, 1)` from central differences (wrapping at the edges). Light L = (-0.6, -0.8, 1.3) normalised, half vector H = normalise(L + (0,0,1)).
   - diffuse = `0.55 + 0.45*max(0, N.L)`; specular = `max(0, N.H)^60`.
   - sheen band: `u = (x + y)/tile`, distance to `k/8` wrapped to -0.5..0.5, band = `exp(-d*d/0.09)`.
   - hue = `k/8 + u + nx*0.38 + ny*0.26 + small sine ripple (amp 0.08)`; look up RGB in the table.
   - rainbow weight is 0.45 plus 0.55 times the band; the silver base starts at 0.35, gains 0.25 times the band, and a faint ripple of 0.08 is added.
   - channel = `(silver*(1 - rainbow*0.75) + lutChannel*rainbow*0.95)*diffuse + spec*1.1`.
   - glitter: 0.35% of pixels get a random bright hue at 75% lightness added at 0.6 to 1.2 strength.
4. Phase `p` (0..1, advanced slowly: `p = t*0.11 + offset`, offsets differ per object) picks tile `floor(p*8)` and crossfades into the next with alpha `fract(p*8)`, so the rainbow drifts and loops seamlessly. Use `ctx.createPattern(tile, 'repeat')` for fills.
5. **Sunburst relief** (cached, 480x480): height = `max(0, sin(angle*36))` with a smoothstep from r=9 to r=60 and a slow linear ramp; light it with a fixed normal dot to make a grey emboss map (128 = flat). Lay it over the foil in `hard-light` at 60%, then tint with a vertical `rgba(20,30,110,.55)` to `rgba(70,10,90,.5)` wash to form the "art window" texture.
6. Per frame: desk, objects back to front, finishing.

## Mark-making
**Foil fill** `foilPaint(ctx, phase, paintFn)`: set `fillStyle = strokeStyle = pattern[k]`, call the paint, then if `fract(p*8) > 0.03` set alpha to `fract` and paint again with pattern `k+1`.

**Card** (corner radius 21px, sizes 315x441 small, 510x714 model, 1500x810 hero): in order
1. Shadow: three rounded rects offset by `3k` px (k = 3,2,1) plus `lift` down, black 16% each; `lift` is 9px resting and up to 45px while in flight.
2. Clip to the rounded rect; foil-fill the whole card.
3. Face art (cached per phase bucket in `H.offscreen`, then drawn with the same crossfade).
4. Gloss edge: a 4.5px black 35% stroke inset by 1.5px, then outside the clip a 3px stroke of white at 40%. Brighter top-left, darker bottom-right.
5. Optional glint, below.

**Printed ink frame:** fill the card with #0e1228 at 86% alpha, then a 6px foil stroke inset 12px with 14px radius; this is the "knocked-out foil line".

**Art window:** rounded rect, clip, draw the pre-baked window texture (see Ground) scaled to 1.15x the long side, then a 4.5px black 55% inner rim and a 2px white 35% outer rim, so it reads as sunken.

**Embossed lettering** `emboss(text, x, y, font, phase)`: (1) black 60% copy at (+3, +3), (2) white 70% copy at (-1.8, -1.8), (3) the same text filled with foil. Letters look pressed into the surface.

**Die-cut sticker:** shape (rounded rect, circle, arrow, or speech bubble with a tail), 12px white vinyl border (diagonal gradient #ffffff to #dcd9d2) with a 40% black shadow offset (7, 10); inside, a clip with foil fill, optional 28-75% tint, a 4.5px black 25% inner stroke shifted by (2, 2), then a dark ink label.

**Glint:** over the card, in `screen` mode a diagonal gradient 360px wide (magenta 22%, blue 30%, white 42%, gold 30%, orange 20%, ends 0), then a 120px `color-dodge` strip with a 50% white core. Slide it with `g = prog(t, a, b)` from -225 to width+225 px. Dodge flares foil and barely shows on ink.

## Type and numbers
- Titles and hero numbers: Russo One 400, embossed foil. Headline 87-114px (never below 66px), card title 87px, key number 255px.
- Stickers and labels: Russo One 45-99px (never below 42px), in ink #141838 on the vinyl; on an ink panel, embossed foil.
- Small print inside a card: Inter 800 at 42px for stat names, 600 at 24px for fine detail only.
- Numbers are embossed foil digits. Counting: ease the exponent (`value = round(10^(6*u))`) and format with thousands commas; the digits are redrawn each frame in place. When a number lands, run a glint across it (0.7 s).
- Stat bars: 27px tall, a translucent ink track at 15% over paper, the fill is foil-painted with a 2px ink outline.

## Diagrams: arrows, labels, charts
- Arrow: a die-cut arrow sticker (shaft 55% of the height, head 115%), word inside it in ink; slapped down pointing the right way.
- Label: a sticker or a cream panel inside a card, never floating text. Speech-bubble stickers carry answers.
- Chart: a stat card. Bars grow in order with a `tock` per bar; the big percentage is embossed beside them and a bar of progress runs under it.
- Right and wrong: a circle sticker with a bold stroked cross or check (19px wide, round caps, a dark shadow stroke offset 4px under a white one) on a red or green tint.
- Group of examples: dealt cards stacked in a pile with tiny random offsets (+-20px) and rotations (+-0.12 rad).

## Motion
- Easing: `H.ease.outCubic` for dealing, `H.ease.inOutCubic` for sliding, `H.ease.outBack` for sticker slaps, `H.ease.inQuad` for sweeping away.
- Deal: a card flies from off-screen (-300, 1230) at rot -1.2 to its pile spot over 0.32 s with lift decaying from 45 to 9px; twelve cards at 0.26 s spacing.
- Flip: scale X from 1 to 0.02 over the first half, swap the face at edge-on, scale back; 0.35 to 0.45 s, shadow lift +30px at mid-flip.
- Slap: a sticker enters at 1.6x scale and alpha ramps in over a third of the duration, settling with `outBack` in 0.2 s. A wrong mark then rattles: `6*sin(t*90)` px for 0.35 s.
- Sweep: everything slides 900px off to the right with `inQuad` in 0.3 s when a stage ends.
- Alive between beats: the foil phase advances continuously, so the rainbow always moves; cards rest on a very slight tilt (-0.05..0.03 rad).

## Scene changes
Flip the hero card to its other face (0.45 s), or sweep the old stack off the desk and deal a new one. The flip is the chapter break: the stats side is "progress", the back is "the moral". Stay continuous (just the glint) when the next idea is the same object.

## Finishing passes (run every frame, same strength)
1. Desk and objects as described.
2. Rainbow spill: a blurred (30px) linear gradient through the foil cycle at 16% on the desk near the hero card, phase shifted with `p`.
3. Contact shadow under the hero card: black 65%, `blur(27px)`, offset down.
4. `H.vignette(ctx, {strength: 0.45, color: '#000', inner: 0.55})`.
5. `H.grain(ctx, t, {strength: 0.025, cell: 2, seed: 77, fps: 30, mono: true, blend: 'overlay'})`.
Without the vignette and grain the desk looks like a flat game table; the foil needs the dark surround.

## Sound palette
Physical cards on a table, quiet and crisp.
- element appears (card dealt): a 60 ms bandpass `k.noise` swish (centre 2400 Hz sliding to 1100, q 1.2, gain 0.2), then on landing a 35 ms bandpass tap at 1000 Hz (gain 0.3) with a `k.tone` thump of 190 Hz gliding to 90 (`glideTo`, 60 ms, gain 0.16).
- label lands (sticker): four 8 ms bandpass ticks at random 1300-2200 Hz just before impact (the peel), then `k.play('slap', t, {gain: 0.5})` with a 120 ms brown-noise lowpass at 600 Hz (gain 0.12).
- arrow completes: same as a label, one peel, `k.play('tock', t, {f: 520, gain: 0.4})`.
- drawing / writing: none; foil text just appears with the card face.
- scene change (flip): a 40 ms snap at 1700 Hz, a pink-noise puff through the turn (bandpass swelling 500 to 1100 Hz and back, gain 0.1), and a tap on landing; sweeps use a 0.4 s pink slide at gain 0.08 and the same pink swell.
- wrong / right: wrong is `k.play('thud', t, {f: 120, gain: 0.6})` plus a 0.35 s sawtooth 'Bb2' (gain 0.06) and a rattle noise; right is `k.play('success', t, {f: 'G4', gain: 0.7})`.
- key number (the biggest hit): `k.play('thud', t, {f: 90, gain: 1.1})`, a 0.7 s pink swell (700 to 2300 Hz, gain 0.22), then a triangle chord 'C4', 'G4', 'C5', 'E5' (1.0 s, gain 0.045 each, stereo spread), with tick sounds (`k.play('tick', ..., {f: 2800, gain: 0.9})`) on the counter.
- takeaway: a soft chord 'F3', 'C4', 'A4', 'E5' staggered 0.04 s, 1.4 s, gain 0.05 falling by 0.006 per voice, under a glint sweep.
- glint: a 0.5 s high pink-noise band (q 3, 800 to 2000 Hz, gain 0.05) with two quiet triangle notes (for example 'G4' and 'D5', gain 0.018).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.5})`.

## Signature moves
- The rainbow slides continuously because the foil phase is time-driven.
- Embossed lettering: dark offset, light offset, then foil fill.
- A diagonal prismatic glint wipes across a card, flaring on foil only.
- Stickers slap down with a 1.6x overshoot; a wrong mark rattles.
- Cards flip to reveal the next stage; numbers are embossed foil digits.
- A dealt pile of cards, each slightly rotated, shows "many examples".

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat rainbow gradient | per-pixel shading from a height field, hue driven by normal and position |
| Hue wheel gives muddy green | eight-stop lookup cycle over silver |
| Foil stops moving between beats | advance the phase continuously and crossfade tiles |
| Seams where tiles repeat | blend four shifted copies so the tile wraps |
| Text is flat | three-pass emboss and keep the foil on the type |
| Glints wash out the ink | `color-dodge` core so only foil flares |
| No desk, no depth | vignette, contact shadows, spill, grain |

## Hero frame recipe
1. Cached desk: radial #26282f to #0a0b0f, two blurred rainbow spills, +-4.5 noise.
2. A 510x714 card centred at (960, 555), tilted -0.04 rad, foil phase 0.35, three-layer shadow with 27px blur beneath.
3. Face: ink frame #0e1228 at 86% with a 6px foil line; art window in the top 42% with sunburst relief and the navy to violet wash; title "WORD" embossed at 87px at the top.
4. Cream panel in the lower 42% with three stat rows (42px labels, foil bars with ink outlines).
5. One arrow sticker at (975, 495) and a speech-bubble sticker top right, tilted +0.04 rad, tinted green for the correct answer.
6. A glint band halfway across the card, then the desk spill and contact shadow.
7. `H.vignette` 0.45, `H.grain` 0.025. Compare to a photo of a real holo card: the rainbow should be broken into facets, never a smooth gradient.
