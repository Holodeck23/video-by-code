---
id: constructivist
name: Agitprop Litho Poster
family: Design movements
fonts: [Anton, Russo One, Oswald]
best_for: manifestos, calls to act, big claims, campaigns, history of ideas, anything that should sound loud and certain, with short slogans and few numbers
avoid_for: gentle or intimate tones, subtle trade-offs, long explanations, anything that needs more than two colours to carry meaning
---

# Agitprop Litho Poster

The viewer believes they are watching a 1920s agitprop poster being slapped together on cheap stock in red and black litho ink. Everything is flat plates, hard diagonals and heavy condensed capitals set on a slant, with one halftone photo cut-out pasted in. Motion is staccato: shapes punch on in two or three held poses, not smooth tweens.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (stock) | #e9dcbc | cream, darkens toward the edges to #b99a62 |
| Primary ink | #1d1a17 | bars, dots, shadow copy of lettering, tick marks |
| Accent | #c8281e | the disc, the key word or number, wedge, arrows. Multiplies on stock to #b72316 |
| Alarm / wrong | #c8281e | a stamped cross; use rarely, it is the same red |
| Lettering on bars | #e9dcbc | the paper colour, set into a black or red bar |
| Cut-out rim | #efe5cc | the white border round a pasted photo |
| Worn scratches | #faf4e4 | 35% alpha |

Only red, black and cream. No greys apart from the photo's own tones, which become dots.

## Ground and surface
1. Paper, cached with `H.offscreen`: per pixel, lerp #e9dcbc toward #b99a62 by `k = 0.4*edge + 0.16*max(0, lo)`, then multiply by `1 + fib*0.04 + (white - 0.5)*0.05`. `edge = (1 - clamp(min(ex*4, ey*3) + lo*0.2, 0, 1))^3`, with `ex` and `ey` the distance to the nearest left/right and top/bottom border as a fraction of the size, so the rim looks aged. `lo` is a grid field on 33 px cells (`H.noise(41).fbm2` at 0.35 per cell, 4 octaves, bilinear), `fib` is 3 px cells with the noise stretched 4x across and 0.5x down (horizontal fibres, 2 octaves).
2. Ink noise, cached once as arrays: `n1` on 6 px cells (3 octaves), `n2` on 54 px cells (3 octaves), plus a white table from `H.rng`. Used by the ink pass in Mark-making.
3. Per frame the sheet is stacked in this order: paper, pasted photo cut-outs, the flat plate layer multiplied on top, the wedge layer, scratches, grain, vignette.

## Mark-making
**Flat plates.** All red, black and cream shapes go onto one transparent layer, then the ink pass wears it. Pass: `alpha *= clamp(1 - mottle*max(0, n1*1.7 + n2*1.1))` with `mottle = 0.26`; where `white < 0.006*(0.3 + 4*max(0, n2))`, `alpha *= 0.2` (pinholes cluster in the patches). Draw the layer onto the sheet with `multiply`, so red over black stays black and the paper shows through the thin parts. The wedge layer (see Scene changes) is worn lighter: mottle 0.12, pinholes 0.004.

**Bars and slabs.** A slab is a slanted rectangle with lettering: measure the text, pad 21 px sideways and 15 px vertically (12 and 7.5 for small labels), fill black or red, set cream capitals in it at `letterSpacing` 4.5 px. It grows to its width, then the text appears: nothing fades. Lettering baselines are always rotated, -0.12 rad for calm blocks and -0.2 to -0.24 rad for loud ones. Under a main bar run a thin red bar, 33 px high, parallel and a little longer.

**Beams.** Triangles from a focal point: apex at the point, two far corners at angle +-half-width, length 2100-2250 px (off canvas), half-widths 0.02-0.16 rad. Alternate red and black. A fan of 4 to 7 beams. They punch out in two held poses: `p = clamp(floor((t - start)*15)/2, 0, 1)`, starts 0.08-0.1 s apart. While held, the fan pulses on a beat: widths x`1 + 0.22*exp(-((t - t0) % 0.5)*9)`.

**Disc.** A red circle of radius 345-350 px, rolling in from 960 px left with `H.ease.outQuad` over 0.4-0.7 s. It sits behind the main subject and bars, off-centre.

**Halftone photo cut-out.** Draw the subject once as a greyscale picture on an offscreen layer, from 3 to 6 gradient-filled shapes per form: shadow side 50-70, lit side 210-245, specular dots 250, black details 20-30. Then:
1. Screen it with a 45 degree dot grid at pitch 9.3 px. Per grid point, read `lum` under it (skip where alpha < 0.5), and draw a black (#1d1a17) circle of radius `9.3*0.62*sqrt((1 - lum)^0.9) + 0.5`. Small pastes use pitch 16.5 and `lum^0.7` to open midtones. Ink-wear the dots with the same pass (mottle 0.18, pinholes 0.004).
2. Build a silhouette from the picture's alpha, filled #efe5cc. Draw it 8 times offset by (+-6, 0), (0, +-6), (+-4.5, +-4.5), then once centred: a cream cut-out border.
3. Over it, the picture at 18% alpha with `multiply` (a tone wash), then the dots with `multiply` offset (+2.25, -1.5) px, a deliberate misregistration.
Cache the screened layers; slide, scale and rotate them as a whole. They sit under the plates.

**Props.** Hard shapes only: cogs with trapezoid teeth and a hole (black, one red), crosses (two 210x42 px bars at 45 degrees), a tick (a 45x105 px upright bar and a 165x45 px foot bar), scribble rings (black ellipse 360x180 px, 18 px stroke, drawn over 0.3 s).

## Type and numbers
- Anton for words that slam (255 px hook, 198 px slogan, 180 px shout), Russo One for bar slogans (96-144 px, labels 45 px), Oswald 700 for small labels (45 px, tracking 4.5 px). All capitals.
- Slogan word: red, with a black copy 6 px right and down beneath it. It slams in from 1.6x scale to 1 in three held poses: `k = clamp(floor(dt*15)/3, 0, 1)`, `scale = 1 + 0.6*(1 - k)`.
- Words are punched, not typed, except a ticker line (Oswald 700, 27 px, tracking 7.5 px) that types at 40 characters per second.
- Counter: a black slanted box (900x177 px, rotated -0.12 rad) with Anton 150 px numerals in cream and a red 45 px caption. Value `max * u^3`, redrawn in whole each frame; the box draws out first.
- Key number: Anton 315 px in a black box (630x360 px) in cream; on landing it turns red and a burst of 12 alternating beams (half-width 0.08 rad, length 690 px) grows behind it over 0.2 s.
- Never lower-case, never smaller than 45 px for anything the viewer must read.

## Diagrams: arrows, labels, charts
- Arrow: a heavy rectangular shaft, 30-42 px thick (15 px for small links), stopping before the end; a solid wedge head with length 2.6x and half-width 1.4x the thickness. It grows with `H.ease.outQuad` over 0.3-0.4 s in red; links in black.
- Label: a slab beside its object, 0.1-0.15 s after it lands.
- Loop of three stages: three slabs in a slanted row joined by small black arrows; the active stage turns red; after the loop closes the highlight cycles three times per second.
- Chart: bars on a baseline tilted -0.12 rad (1050x21 px): 84 px wide, 114 px pitch, height `(value - 45) * 11.25` px, alternating red and black with the final bar red; they rise in sequence with `outQuad`.
- Wrong: a red cross stamped (arms grow from the centre over 0.15 s) and a black scribble ring, then a red slab saying what is right. Right: a black tick.

## Motion
- Time is quantised: `tq = floor(t*15)/15`. Entrances use `tq` or a stepped `floor(dt*15)/N`, so every punch holds poses for two or three frames.
- Order matters: disc, beams, bars, words. Each element starts 0.07-0.15 s after the last.
- Between beats the beams pulse with the beat (0.5 s period). Photo slides in over 0.6 s (`outQuad`, from 630 px left and 250 px down).
- Cogs turn with `inOutQuad` for 0.85 s, then idle at 0.8 rad/s; the smaller one counter-turns at 1.5x.

## Scene changes
A red wedge drives across the sheet. Apex at (tx, 540); the base 3600 px behind it, running from y -2100 to y 3180; `tx` goes from -150 to 5850 with `H.ease.inOutQuad` over 0.95 s. A thin black sliver rides its upper edge (30-45 px off the red). The scene underneath swaps 0.5 s after the wedge starts, when the red covers the frame. The new scene's first element lands the next tick. Stay on the same scene, with just a new slab, when a beat only adds one idea.

## Finishing passes (run every frame, same strength)
1. The ink pass on every plate (mottle, pinholes) and the multiply onto the stock.
2. Scratches: 40 cream lines from `H.rng(88)`, 1.5 px wide, 6-45 px long, random angle, `rgba(250,244,228,0.35)`.
3. `H.grain(ctx, t, {strength: 0.08, cell: 3, fps: 12, mono: true})`.
4. `H.vignette(ctx, {strength: 0.25, color: '#321e0a', inner: 0.5})`.

## Sound palette
A print works: slams, a ram, brass shouts.
- element appears (slab or slogan): combine a slap at gain 0.5 with a 115Hz thud at gain 0.45; schedule the landing on the next 15fps pose boundary.
- label lands: the same slam at 0.5-0.6 gain inside `k.minor`.
- arrow completes: a 0.4 s `k.noise` (brown, lowpass, f 350, gain 0.2) under the growth; no ding.
- drawing / writing: for the ticker, `k.play('typing', t, {dur: textLength/40, gain: 0.4})`.
- beams: a 90 ms `k.noise` bandpass (f 1200, q 0.8, gain 0.22), one per beam, 0.07 s apart.
- shout: two sawtooth `k.tone` per note (f at x1 and x1.012, dur 0.4-0.7, gain 0.035, `a: 0.02`), a short minor or major cluster; major for correct, minor for wrong.
- scene change (wedge): a 0.95 s brown-noise lowpass `k.noise` (f 500, gain 0.45, `a: 0.4`), a pink bandpass `k.noise` from +0.2 s (f 900, gain 0.16), and a sawtooth `k.tone` gliding 45 to 72 Hz (`glideTo`, gain 0.1).
- wrong / right: wrong is `k.play('stamp', t, {gain: 1.0})` plus a low brass shout on C3 and Db3; right is a stamp at 0.5 plus a major shout on C4, E4, G4.
- key number: use one impact at gain 0.8, supported by a low 75Hz thud at gain 0.45 and a stamp at gain 0.4. An optional short C-minor chord follows; leave headroom and inspect the offline peak.
- takeaway: `k.play('stamp', t, {gain: 0.6})`, a short shout on F3, A3, C4, then a resolving shout on C3, G3, C4, E4.
- bed or music: `k.bed(0, DURATION, {kind: 'hum', gain: 0.35})` and `k.bed(0, DURATION, {kind: 'room', gain: 0.4})`; counter digits are 30 ms bandpass `k.noise` ticks (f 1500) with a 130 Hz `k.tone`, spacing 0.16 s shrinking to 0.085 s.

## Signature moves
- Beams fanning out from a focal point two poses at a time.
- The red wedge crossing the sheet as the scene change.
- Slogans slamming in at 1.6x and shrinking onto slanted bars.
- Halftone cut-out with a cream border and dots a hair off register.
- Counters and numbers in black boxes at a slant.
- A stamped red cross, and a burst of beams behind the key number.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Smooth easing | quantise to 15 fps and hold poses |
| Perfectly flat colour | ink pass: mottle and pinhole clusters on every plate |
| Level text | every baseline rotated at least 0.06 rad |
| More than three colours | red, black, cream only; photo tones become dots |
| Photo looks pasted-on digitally | cream border, 18% tone wash, dots offset |
| Fade transitions | the wedge, with the swap while covered |
| Weak type | caps only, Anton for words that must hit |

## Hero frame recipe
1. Cached paper with aged edge; ink noise arrays ready.
2. Photo layer: a screened cut-out near the left, rim and tone wash, dots offset (+2.25, -1.5).
3. Plate layer: a red disc (r 345 px) at (540, 450); a fan of 5 beams from a point at the cut-out's focal edge, alternating colours, one pulsed 22% wider.
4. A black bar (1230x138 px) rotated -0.24 rad near (975, 870) with a thin red bar under it; Russo One 57 px cream lettering in the bar; Anton 198 px red word above with a black copy at (+6, +6).
5. Ink pass on the layer, multiply it, add scratches, `H.grain` 0.08 at 12 fps, vignette 0.25.
6. Check: red reads as brick (#b72316) not neon, black dots are broken and patchy, edges of the sheet are visibly browner.
