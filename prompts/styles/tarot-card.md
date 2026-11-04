---
id: tarot-card
name: Gilded Tarot Spread
family: Design movements
fonts: [Cormorant Garamond]
best_for: stories told as a reading or a sequence of stages, step-by-step logic, fate, intuition, trust and risk, mythic or reflective tones, anything that can be a "card" with a title and an emblem
avoid_for: fast data, dense charts, modern product UI, humour, topics where an antique mystical frame undercuts credibility
---

# Gilded Tarot Spread

The viewer believes a reader is dealing worn art-nouveau tarot cards onto dark crushed velvet by candlelight. Each idea is a card: it slides in face down, turns over with a flick, and shows a flat, bold-outlined emblem in muted lithograph colours inside a gold-foil frame, on cardstock that is yellowed, scuffed and frayed at the corners. The quality that sells it is the foil: gold that shifts and catches light as the frame breathes.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Velvet shadow / mid / light | `rgb(18,5,14)`, `rgb(74,18,44)`, `rgb(150,66,98)` | the crushed-velvet ramp |
| Card stock | `#eadcbc`, name panel `#efe3c6` | before ageing |
| Outline (all line work) | `#2a1c15` | warm near-black, never pure black |
| Frame band / medallion / plaque | `#4f6a63`, `#2d3a52`, `#1d2744` | teal-green, slate and navy |
| Sky steps (art window) | `#2c3350 #353a58 #41405f #514765 #62506a` | five flat bands, dark to dusty violet |
| Foil gold | `#7a5a22`, `#c9a54e`, `#f3e3a0`, `#c39a44`, `#8d6a2a`, `#c4a050` | gradient stops 0, 0.25, 0.42, 0.55, 0.8, 1 |
| Flat gold / star | `#d9bd6a`, highlight `#e8cf7a`, `#efe0a2` | stars, small ornaments, arrow labels |
| Sunburst rays | `#a78a52` wide, `#7d6a55` narrow | at 55% alpha |
| Accent (burst light) | `rgba(255,226,150,a)` | used for the single most important thing on screen |
| Alarm / wrong | `#8e2a20` | ink red, never bright red |
| Right | `#2f6f4a` | deep green |
| Emblem fills | `#c99a4e #a8784e #6b4a30 #e2cfa8 #6fa39a #a2615b #a3aca6` | animals, gears, scales: 2 to 5 flat colours each |

## Ground and surface
1. **Velvet**, baked once (`H.offscreen('velvet', 480, 270, ...)`, drawn stretched over the frame, then 7% colour grain baked in with `H.grain`). Evaluate each cell at virtual coordinates `X = 1280 u`, `Y = 720 v` (u, v in 0 to 1) with `H.noise(9)`. Fold field: a domain warp `2.4 * fbm2(0.0018 X, 0.0018 Y, 3)` added into two crossing sine waves (`sin(0.0062 X - 0.0035 Y + warp)` weighted 0.65, `sin(0.0024 X + 0.0078 Y + 1.4 warp)` weighted 0.35). Ridge `r = (1 - |f|)^1.6`. Brightness `b` starts at 0.1, adds `0.14 spot` and `0.1 mottle`, and adds `r^2` scaled by `0.55 * (0.5 + 0.5 spot)`, where `spot` is a wide Gaussian centred on (640, 360) with radii 700 and 460, and `mottle = fbm2(0.02 X, 0.02 Y, 3)`. Map `b` through shadow, mid, light with `H.mixRGB`, break at 0.5.
2. **Gold dust** per frame: 90 motes seeded `H.rng(21)` on an ellipse 1.3x wider than tall (radius 330-720 px around the frame centre), drifting +-4 px (`sin(0.6t + k)`), radius 0.75-2.25 px, `rgba(240,210,130, a)` with `a` = a per-mote base from 0.2 to 0.8 times `(0.6 + 0.4 sin(3t + k))`.
3. Optional: two card backs peeking from the sides, rotated -0.3 and +0.26 rad, with a dark gradient (38% to 72%) across each.
4. Cards, plaques and the burst are drawn per frame over the baked ground.

## Mark-making
All sizes below are in card units `u = cardWidth / 364` (a 546 px wide card has `u = 1.5`). Every shape: flat fill, then a dark outline of 2.2 to 3u, round joins. No gradients inside a drawing except gold.

**Foil** `gold(x0, y0, x1, y1, shift)`: a linear gradient with the six stops above, where the middle four stops slide by `shift = (sheen - 0.5) * 0.4` and `sheen = 0.4 + 0.6 * sin(0.9t)`. Every gold stroke and fill uses this one function, so the frame, plaques and arrows catch light together.

**Card face** (draw bottom to top; clip everything to the 16u rounded card):
1. Stock fill; keyline 2u at inset 9u; teal frame band filled from inset 13u; foil rule 2.4u at inset 15u.
2. Foil lozenges (diamonds 6u wide, 10u tall) every 22u down both sides at inset 21u; foil dots (radius 1.7u) every 22u along top and bottom.
3. Inner field at inset 28u in stock colour with a 1.8u keyline. Art window: an arch, 44u side margin, top at `-h/2 + 92u`, bottom at `h/2 - 92u`, shoulders rounded by 30u and a gentle 22u crown.
4. Window contents: the five sky bands; 36 sunburst wedges alternating wide (half-angle 0.045 rad) and narrow (0.02) fanning from a point 20u above the window centre, length 520u, rotating 0.03 rad/s; a dark soft halo (radius 125u, `rgba(50,52,84,0.95)` fading out) to hold the emblem clear; 22 scattered stars (4 or 8 points, 3-7u across, `#d9bd6a`) seeded from the card's title, none within 120u of the centre, twinkling `0.7 + 0.3 sin(3t + k)`. Then the emblem.
5. Window outline 2.4u. Numeral cartouche: ellipse 52u by 20u centred 56u from the top, stock fill, 2u outline, inner foil ellipse 47u by 15.5u at 1.4u. S-shaped whiplash flourishes (3.6u outline) sweep out left and right of it.
6. Four corner medallions (radius 13u, slate fill, foil ring 2.4u), each with one gold symbol: sun dot, crescent, four-point star, small ringed planet.
7. Name panel: 46u tall rect at `h/2 - 82u`, inset 34u each side, fill `#efe3c6`, 2u outline, foil hairline 1.3u at 5u inset; title in outline colour, Cormorant Garamond 600, 30u, shrunk until it fits.
8. Ageing, cached with `H.offscreen` per card size: multiply a radial from `#fff8e8` (centre offset -0.2 on both axes) to `#c8aa78` at the corners; a 14u radial of `rgba(246,238,220,0.9)` at each corner; foxing, six ring-shaped blots (radius 12-44u, a peak of `rgba(150,105,55,0.13)` at 85% of radius); 22 scuff lines (6-30u, `rgba(245,236,214,0.15-0.4)`); fraying: 900 points along the perimeter, dot radius `3.2u * noise + corner * 10u` where `corner` is proximity to a corner within 76u, `rgba(246,238,220,0.5 + 0.4 corner)`; print tooth, grey noise (128 +- 15 plus slow noise +-16) drawn with `overlay` at 55%.
9. Foil sheen: an additive diagonal band (160u wide, `rgba(255,236,190,0.16)` at its core) crossing the card as `sheen` rises.

**Card back**: navy `#1d2744`, foil double border (3 and 1 px at insets 14 and 20), a lattice of 4-point stars (R 5, r 1.6, `#b8954a`, 34 px apart, alternate rows offset 17), a central navy disc (radius 50, foil ring 2.5) holding an 8-point star (R 40, r 10, `#c4a050`).

**Cables, ribbons and tubes**: outline stroke at `w + 4.4`, body at `w`, a pale stripe (`rgba(255,240,210,0.22)`, 0.28w, offset -0.18w both axes), then short gold bands as a dash pattern (2.2 on, 46 off).

## Type and numbers
- Cormorant Garamond 600 throughout; italics for annotations. Plaque headline 66 px, plaque label 42-45 px (never below 42), key number 165 px, card titles at least 30u, corner header 48 px.
- Plaques are navy rounded rects (radius 18 px) with the foil double border, text filled with the foil gradient so numbers shimmer.
- Text is never typed. A plaque is dealt, or flips over like a card, and the new face replaces the old.
- Numbers tick in 12 fps steps on a plaque. The final value pulses once: scale `1 + 0.12 * (1 - u)^2` over 0.3 s.

## Diagrams: arrows, labels, charts
- Arrow: a gold filigree arc. A quadratic curve sampled at 40 points drawn on in 0.35-0.45 s: outline 10 px, foil 5 px, two small gold spirals (radius 9 px, 1.8 revolutions) at 30% and 60% along, a barbed three-point head at 2.5 rad on completion, and an italic label at the midpoint (42 px, `#e8cf7a`), 51 px off the curve.
- Labels live on cards (title panel) or brass plaques. A spread is three to four cards in a row on one baseline at +-0.03 rad.
- Chart: a card whose art window holds a hand-drawn gold axis (`#d9bd6a`, 3u), a curve stroked as outline then foil, small star markers on each interval, and a larger eight-point star rotating at the head.
- Wrong: a tipped balance beam (rotation 0.22 rad over 0.4 s) and a 10u ink-red X in a cream roundel; right: the beam levels and a forest-green check, banner text turns green.

## Motion
- Deal: from below the frame (840 px lower) and rotated 0.25 rad off the rest angle to the rest position with `H.ease.outQuad`, 0.55-0.75 s; stagger a spread by 0.15 s.
- Flip: scale x by `max(0.02, |cos(pi * e)|)` where `e = H.ease.inOutQuad(u)` over 0.5 s; swap back to face at e = 0.5. While flipping, `lift = sin(pi * e)` scales the card 1 + 0.06 lift and grows the shadow (blur 24 + 21 lift px, offset (18 + 45 lift, 30 + 45 lift), alpha 0.7 - 0.25 lift).
- Machinery steps on twos: gears and dials move at 12 fps, never smoothly. Orbiting bodies drift at angle `a0 + 0.2t`.
- The foil `sheen` and the sunburst rotation are the idle motion; everything else is still between deals.

## Scene changes
Cards are gathered, not cut. The cards in the spread slide off together: each moves `(i - 1) * 300` px sideways and 900 px down, eased `inOutQuad` over 0.5 s, while their plaques follow downward. The next card is dealt 0.1 s later. If the next idea extends the previous one, leave the card in place and flip a new face onto it instead. A key plaque can turn over mid-scene (0.5 s flip) to reveal its follow-up.

## Finishing passes (run every frame, same strength)
1. The baked velvet and baked card ageing carry most of the look; do not redo them per frame.
2. Gold burst for the wrong guess and the biggest number: radial `rgba(255,226,150,0.55a)` fading to clear at radius 390 px, plus 24 rotating ray triangles (12 px base, 1.1R long, 25% alpha, turning 0.3 rad/s), alpha ramp in 0.25 s.
3. `H.vignette(ctx, {strength: 0.5, color: '#000', inner: 0.55})`.
4. `H.grain(ctx, t, {strength: 0.03, cell: 2, fps: 12, mono: true})`.

## Sound palette
Candlelit and muffled: slides, taps and low metal. Nothing bright. Minor sounds inside `k.minor(fn)`.
- element appears (card dealt): `k.noise(t, {color: 'pink', filter: 'bandpass', f: 700, q: 0.7, gain: 0.16, a: 0.05, dur: 0.42})` for the slide; at `t + 0.4` a lowpass tap `k.noise` (f 900, dur 0.05, gain 0.17) and a `k.tone` falling 160 to 90 Hz (`glideTo: 90`, dur 0.07, gain 0.08). Pan by card x, up to 0.6.
- flip: a 30 ms bandpass click (gain 0.22, f 1800, q 1.2) at the start, a 0.3 s pink swish (f 1000, q 0.8, gain 0.12) 0.1 s later, a lowpass lay-down tap (f 1100, dur 0.05, gain 0.15) at 0.48 s.
- label lands: a brass tick, `k.noise` bandpass 1400 Hz, q 3, dur 0.03, gain 0.26, plus a 700 Hz triangle `k.tone` (dur 0.06, gain 0.04).
- arrow completes: a breathy shimmer, pink `k.noise` bandpass 1300 Hz, q 3, gain 0.07 over the draw length, and triangle tones `'E4'` (gain 0.035) and `'B4'` (0.3 of the way in, gain 0.025), each dur `draw + 0.5`.
- drawing / writing: none. Gears: one brass tick per 12 fps step, `f` cycling 900, 1040, 1180.
- scene change (gather): `k.noise(t, {color: 'pink', filter: 'bandpass', f: 700, q: 0.6, gain: 0.2, dur: 0.5, a: 0.2})`.
- wrong / right: wrong is a low gong, bell at 87 Hz (gain 1.1) and 123 Hz (gain 0.55) plus `k.play('thud', t, {f: 90, gain: 0.65})`; right is `k.play('success', t, {f: 'A4', gain: 0.55})` with a bell at 220 Hz.
- key number (the biggest hit): `k.play('impact', t, {gain: 1})` and bells at 110, 164.8, 220 Hz staggered 0.02 s.
- takeaway: bells at 220, 277, 330 Hz staggered 0.09 s, gain falling 0.42 to 0.28.
- bell recipe: three `k.tone` partials at 1x (dur 2.2, gain 0.16), 2x (dur 1.2, gain 0.05) and 2.76x (dur 0.6, gain 0.025), a 0.004 attack.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.35})`, `k.music(0.4, DURATION, {mood: 'dreamy', bpm: 60, key: 'A', gain: 0.32})`.

## Signature moves
- Cards are dealt from below, spin edge-on and flip with a lift and a growing shadow.
- The foil gradient slides with a slow sheen, so all the gold shimmers in step.
- Plaques turn over like cards to reveal the next face.
- A gold burst with turning rays marks the one wrong guess and the one key number.
- Gears and dials advance in 12 fps steps.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Card looks like a clean vector | bake ageing: yellowing, foxing, frayed corners, print tooth |
| Gold is a flat yellow | always the six-stop foil with a moving shift |
| Velvet is a plain dark red | fold ridges from crossing sines with a noise warp, plus a central light pool |
| Colours are saturated | muted lithograph tones; ink red `#8e2a20`, never a screen red |
| Cards just fade in | deal with rotation, flip with edge-on squash, add shadow lift |
| Outlines vary | keep one outline colour and 2.2-3u width on every shape |

## Hero frame recipe
1. Velvet ground, 90 gold motes, vignette ready.
2. One card, 546 x 942 px, rest rotation -0.025 rad, centred slightly below the middle, face up (build it with the Card face list and aged layers).
3. In its window: the stepped sky, sunburst, a central emblem in flat colours with a 2.6u outline, and three stars twinkling.
4. A foil plaque beneath it with the headline at 66 px in the foil gradient.
5. Sheen band at `sheen` 0.7 crossing the card; a soft shadow under the card (blur 24, offset (18, 30), alpha 0.7).
6. Vignette and grain. Compare: gold must visibly vary across the frame, and the corners must read worn.
