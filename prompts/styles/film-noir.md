---
id: film-noir
name: Nitrate Noir
family: Light & imaging
fonts: [Oswald, Anton, Courier Prime, Special Elite, Limelight, Playfair Display, UnifrakturMaguntia]
best_for: stories of cause and consequence, mysteries, "how it really works" reveals, security, money, systems with a hidden mechanism, anything that wants tension and gravity
avoid_for: cheerful onboarding, children's topics, colour-coded data, anything whose meaning lives in hue
---

# Nitrate Noir

The viewer believes they are watching a worn 1940s release print: a black-and-white newsreel and B-picture montage projected in a dark room. Everything is greyscale light. Hard slatted window light, hanging smoke and one lamp are the only illumination, and the projector's weave, flicker, grain and dust are always present. The one quality that sells it is contrast: deep crushed blacks, a few blown whites, silver midtones.

## Palette
Greyscale only; hues never appear. Colour the whole finished frame at the very end with a faint warm silver (R 255, G 252, B 246 times luminance).
| Role | Hex | Notes |
|---|---|---|
| Ground (void) | #0e0e0e | scene fill; deepest scenes #0a0a0a |
| Plaster / wall mid | #969696 | albedo of lit surfaces, kept low and lifted only by light |
| Object dark | #2e2e2e to #080808 | silhouettes, cabinets, shadows |
| Primary ink | #fafafa | all newsreel lettering and arrows, always with a black keyline |
| Keyline | #000000 | stroke under every white mark, 0.16 x font size wide |
| Accent (hit) | #ffffff | the one brightest thing: key number, stamp, headline flash |
| Paper | #f0f0f0 to #c4c4c4 | newspaper and print stock, diagonal gradient |
| Alarm / wrong | #f2f2f2 on #0a0a0a | no hue exists: wrongness is a slammed stamp, a buzzer and a skew, never a colour |

## Ground and surface
Each scene is built in greyscale on an offscreen layer, then run through the film finish. Cached with `H.offscreen`: plaster, smoke, cork, halftone pattern.
1. Fill `#0e0e0e`. Add a soft light pool: a radial gradient (white, alpha 0.16 centre, 0.07 at half radius, 0 edge) in `screen` mode, an ellipse about 930 x 630px. Pools sit under the main subject; spill elsewhere is 0.05-0.08.
2. Plaster overlay (cached at 960x540, drawn up to full size, `overlay`, alpha 0.55-0.7): 128 + `fbm2(x*0.012, y*0.012, 3)*30` + `n2(x*0.1, y*0.1)*8` + (`rng`-0.5)*12. It makes lit bands look like a wall, not a plain gradient.
3. Slat light (the signature): venetian-blind bands drawn at half resolution as parallelograms. Period 51px, lit band 26px, every edge climbing 0.5px per px to the right, from `x0` to beyond the frame. Blur 6-10px for a real penumbra. Fade the leading edge with a 255px `destination-in` gradient so the patch has a window-frame edge. Cut one mullion shadow: a 13px line, slope 0.55, with `destination-out`. Slide the bands with `sway = t*9` (calm) or `sin(t)*6` (static end card). Alpha 0.2 as dim spill, 0.85 as the hard key.
4. Smoke haze (cached at 960x540): `q = n2(x*0.0027, y*0.0067)*1.6`, density = clamp((`fbm2(x*0.0047+q, y*0.0133, 4)`+0.15)*1.5). Draw white at that alpha, scrolling `t*7` px, masked by the slat layer (`destination-in`) so smoke only shows inside beams; screen at alpha 0.35-0.5.
5. Hanging lamp scenes: a blurred (7px) cone polygon from a 120px shade, gradient alpha 0.7 at the shade, 0.32 at 35%, 0.1 at the floor, plus 44 dust motes (radius 1-2px, alpha 0.35-0.8) rising at 16px/s inside the cone.
6. Table or floor: a dark gradient, a lit front edge (3px, grey 150), and a flat elliptical pool beneath the lamp.
Cork or board backdrop for specimen scenes: 112 + `n2(x*0.0133, y*0.0133)*16` + (`rng`-0.5)*46, with 4% of pixels at -40.

## Mark-making
Nothing is painted; it is lit.
- Objects: gradients only. Metal cabinets are a vertical ramp (grey 118 to 35) with a 4px lit top-left bevel (grey 185) and a 4px dark bottom-right edge (grey 14). Rivets are 5px radial discs. Dials have a chrome bezel gradient (200 to 55) and a 4px curved glint arc at alpha 0.45.
- Cast shadow: every object and card gets `shadowColor rgba(0,0,0,0.65)`, blur 20, offset (12, 15). The key light is upper left, so shadows fall right and down.
- Silhouettes: fill grey 8; add a hard rim light on the side facing the light: draw the shape in white, `destination-out` a copy shifted (-9, +5), mask with 0.35 + slat light, `screen` it. Cut the silhouette's own shadow out of the slat layer (blurred 4.5px, offset (-195, 60), alpha 0.85).
- Emissive screens: a radial gradient from grey 215-255 to 120, scanlines of 1px black at alpha 0.12 every 4px, and a glow on nearby surfaces `0.55 / (1 + d^2 / 58500)` added to their light. Warm-up: a bright horizontal line opens vertically into the raster over 0.3s.
- Print stock (newspaper, placards): diagonal gradient 240 to 196, a fold valley (60px band, black 0.13) with a lit ridge beside it (white 0.18), a halftone texture (6x12px tile of 3px dots at alpha 0.16, cached pattern) over any photo.
- Smoke wisps: 5 polylines of 70 steps rising 6px per step, sideways drift `n2(s*7 + u*3, s + 0.3*t)` scaled by (3 + 10u), white at alpha 0.32 falling 0.04 per strand, widths 3 to 21px, blurred 5px, screened.

## Type and numbers
- Newsreel lettering (labels, headlines, arrows): Oswald 700 caps, labels 45-60px, headlines 90-120px. Draw `strokeText` first (black, `lineWidth` = 0.16 x size, round joins), then the white fill #fafafa. Fade in over 0.3s as a flash (alpha = min(1, 2p)). Never lowercase for story labels.
- Title cards: Limelight 100-130px #f2f2f2, black shadow blur 18, a word at a time on 0.22s offsets, each fading in over 0.45s; a Playfair Display italic 36px connector word between lines.
- Masthead: UnifrakturMaguntia 81px; banner headline Anton 114px; Courier Prime 21px dateline; two rules (4px and 1.5px) under the masthead.
- Typed tape or console: Special Elite 78px on a paper strip, or VT323 38px #fafafa on an emissive screen, revealed with `H.typeOn(text, u)` at 13 characters per second, with a block cursor (20x30px) blinking at 2 Hz.
- Key number: a mechanical odometer, drum height 108px or more, Courier Prime 700 at 0.8 x drum height, in a bevelled enamel housing (grey 92 to 18 gradient, 8px bezel). Drums scroll continuously: digit d and d+1 stacked, offset by the fractional part, only the last drum rolls smoothly and higher drums roll in the last 10% before a carry. Shade each drum 120-240-120 vertically and overlay a glass band (black 0.35 at top, white 0.22 at 12%, clear by 30%, black 0.3 at the bottom). Big counts ease in log space (10^(6 * u)), percentages ease out with `H.ease.outCubic`.

## Diagrams: arrows, labels, charts
- Arrow: a quadratic curve sampled to about 28 points, stroked twice with round caps, black 20px under white 10px. Draw it on over 0.3-0.4s with `H.partial`. The head appears once the shaft is complete: a filled triangle, tip 21px beyond the end, wings 33px at +-2.4 rad, black version 7px larger under the white one.
- Label: newsreel caps placed 12px clear of the object, fading in 0.1s after the arrow lands. For named things use a placard: an upright print (width 240px, ratio 1:1.25) with border gradient 248 to 205, a 4-grey icon on a top-lit backdrop (150 to 82), a black plate (grey 22) across the lower fifth holding the name in Oswald 700 48px and a Courier Prime serial. Add a curled bottom-right corner (a lit triangle 41px, shadow beneath) and a 9px steel push pin.
- Chart: black-void ground, hairline grid lines (grey 90, 1.5px), white 6px axes, a data line with the same two-pass black/white stroke plus a faint glow (shadowBlur 18, white at 0.6) on the white pass, and an odometer for the live value.
- Compare/verdict: a rubber stamp (below), not a tick or cross. Optionally a large "X" or check at 100px in newsreel style beside it.
- Stamp: white 9px outline box inset 9px inside a black pad (alpha 0.7), Oswald 700 80px caps, tilted -0.16 rad; scale 2.2 to 1.0 with `H.ease.outCubic` over 0.12s, alpha min(1, 1.5p).

## Motion
- Easing: `H.ease.outCubic` for landings, `H.ease.inOutCubic` for wipes; the odometer and spin are the only mechanical motions.
- Headline reveal ("spinning paper"): the sheet scales 0.04 to 1 and rotates `(1-p)*5*PI` rad with `p = H.ease.outCubic(H.prog(t, t0, t0+1.0))`, ending with a flat slap. Use for the opening and for the biggest result.
- Counters and cards enter in rhythm: slap-ins staggered 0.28s, each scaling 1.4 to 1.0 over 0.15s.
- Punch-in: zoom 1 to 1.45 over 0.25s, hold, back out over 0.2s, on one decisive moment only.
- Idle life (never freeze): slat sway, smoke scroll, dial needles, lamp flicker (`1 + n2(t*9, 4.4)*0.05` on exposure), dust motes.

## Scene changes
Use period transitions, 0.35-0.5s each, rotating through them:
- Iris: black frame; the incoming or outgoing scene is clipped to a circle radius 1110 x (1 - `inQuad(u)`) to close, 1110 x `outCubic(u)` to open, over 0.4s. Centre on the subject.
- Hard wipe: a vertical edge sweeps left to right in 0.45s (`inOutCubic`) with a 5px white line on the edge.
- Clock wipe: a pie clip from 12 o'clock around 2 PI in 0.4s, radius 1350.
- Spin-in headline: the paper spins over the previous scene (see Motion) and holds 0.6s.
Stay in one scene when the next idea extends it (add objects, punch in) instead of cutting.

## Finishing passes (run every frame, same strength, in this order)
1. Draw the composed scene onto a black canvas shifted by the gate weave: `dx = n2(t*3.1, 0.3)*3.3`, `dy = n2(0.7, t*2.7)*4.2`.
2. Soften: draw the frame over itself blurred 1.2px at alpha 1 (lens softness).
3. Tone curve on luminance, after multiplying by the flicker: below 0.5, `0.5*(2v)^1.5`; above, `1 - 0.5*(2-2v)^1.3`. Precompute a 256-entry table once; apply by `getImageData`. Write back as silver (v*255, v*252, v*246).
4. Grain per film frame: `H.grain(ctx, t, {strength: 0.14, cell: 2, fps: 24, mono: true})`, heavy and chunky. Midtones should grain more than blacks and whites.
5. Halation: downsample to quarter size, blur 9px, brightness 1.2, `screen` at 0.25 over the frame.
6. `H.vignette(ctx, {strength: 0.7, color: '#000', inner: 0.5})`.
7. Dust, seeded per frame with `H.rng(7000 + floor(t*24))`: 70 specks, 60% white at alpha 0.4-0.9 and 40% black at 0.5-0.9, radius 0.9-2.7px (10% reach 3-6px), plus 3 short hair scratches (bezier, 1-2px, alpha 0.3-0.6).
8. Two vertical scratches, white 1.8px at alpha 0.3 and 0.2, x about 450 and 1565, wandering `sin(t*6)*5` plus noise; one dark line at x 960, alpha 0.4.
9. Letterbox: solid black bars 81px at top and bottom, drawn last.

## Sound palette
Newsreel track; the clatter is the room.
- bed: `k.bed(0, D, {kind: 'vinyl', gain: 0.5})` as optical-track crackle, `{kind: 'tape', gain: 0.3}` as projector whirr, `{kind: 'room', gain: 0.25}`; `hum` under lamp scenes at 0.4. Optional sprocket: `k.play('tick', t, {f: 150, gain: 0.05})` every 1/12 s.
- element appears (card, placard): `k.play('slap', t + 0.12, {pan: -0.6 to 0.6, gain: 0.32})`, one per item.
- label lands: `k.play('tock', t, {f: 700, gain: 0.35})`; tape or console text: `k.play('typing', t, {dur: 0.4, gain: 0.7})`.
- arrow completes / draws: `k.play('pencil', t, {dur: drawLength, gain: 1.0})`.
- spinning paper: pink bandpass `k.noise` flaps (dur 0.09, f 1600, q 0.8, gain 0.22 x (0.35 + 0.18h)) at each half turn, plus `k.play('whoosh', t0, {dur: 0.85, gain: 0.5})`.
- scene change: iris is three staggered pink bandpass bursts (f 2400, 1400, 700, dur 0.2, gain 0.16), reversed to open; hard wipe is `k.play('swish', t, {dur: 0.4, gain: 0.6})`; clock wipe is five `tock` at f 1100 + 120i every 0.08s plus `whoosh`.
- wrong: `k.play('stamp', t + 0.12, {gain: 0.85})` then `k.play('buzz', t + 0.24, {dur: 0.28, gain: 0.85, f: 98})`. right: `stamp`, then `k.play('bell', t + 0.2, {f: 'A6', gain: 0.9})`.
- key number: odometer `k.play('tock', ...)` per digit change throttled to one per 0.09s (f 1500, gain 0.32); lock with `tock` f 520 gain 0.9; for the biggest moment `k.play('impact', t, {gain: 1.3})` + `press` 0.8 + `slap` 0.7 + a brass chord.
- takeaway: the resolving chord: two `k.tone` sawtooth voices a few Hz apart per note (C3 G3 E4 C5, gain 0.04 each, a: 0.03, r: 0.5, dur 0.9) plus a triangle under it at 0.1.
- brass sting: same recipe, short (dur 0.12, twice) then a held major triad; it marks headlines and the end card.

## Signature moves
- Blind-slat light dragged across everything, with smoke visible only inside the beams.
- A paper sheet spins out of the dark and slaps flat to announce a result.
- Iris closes on the subject and opens on the next scene.
- A rubber stamp slams down at 2.2x scale to give a verdict.
- A mechanical odometer for every live number.
- Rim light on a black silhouette, from an emissive screen or lamp.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Grey filter over a normal scene | build scenes in light: dark albedo, pools, slat light, then the S-curve |
| Perfect, static light bars | sway, blur 6-10px, soft leading edge, mullion shadow, haze inside the beam |
| Clean digital text | white fill with a black keyline, 0.3s flash-in, grain and halation on top |
| Weave looks like camera shake | 3-4px smooth noise only, never random jitter |
| Grain that is flat noise | luminance-dependent, per 24 fps frame, midtones stronger |
| Colour creeping in | one silver tone applied last; no hue anywhere else |
| Too many transitions | one per scene, and rotate iris, wipe, clock |

## Hero frame recipe
1. Ground `#0e0e0e`, one light pool (alpha 0.16, 930 x 630px) behind the subject.
2. Slat layer: x0 570, period 51, lit 26, blur 9, edge 255, alpha 0.85, mullion at x 960; `screen` at 0.78. Plaster overlay at 0.55, smoke haze at 0.4.
3. A near-black silhouette (grey 8) right of centre, its shadow cut out of the slat layer, its rim lit on the left edge.
4. Title at upper left in Limelight 120px #f2f2f2 with a black shadow, a Playfair italic 36px connector, a second line at 120px.
5. A white newsreel label (Oswald 700 54px, keyline) and one arrow in the lit area.
6. Run the finish: weave, soften, S-curve, grain 0.14, halation, vignette 0.7, dust, scratches, 81px bars.
7. Check: blacks should be near zero, whites clipped in the beams, and a visible grain structure when paused.
