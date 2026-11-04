---
id: y2k-chrome
name: Liquid Chrome Gloss
family: Dimensional
fonts: [Fredoka, Space Grotesk]
best_for: AI and product launches, apps, music and fashion, playful tech, optimistic futurism, big hero words and numbers
avoid_for: serious, legal, medical or archival topics, dense text, dark or gritty tones, anything that needs matte restraint
---

# Liquid Chrome Gloss

The viewer believes they are inside a glossy millennium-era interface: a pale lilac-ice stage with a blob of liquid mercury that stretches and re-forms to wherever the story goes, chrome bubble letters that inflate like balloons, frosted-glass panels that swoosh past, soap bubbles drifting up and starburst glints. The quality that sells it is real reflection: every chrome surface looks up an environment map using its own surface normal, so the sky, a dark horizon band and soft boxes slide across it.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Stage gradient | `#eef3ff` 0, `#cfdcff` 0.45, `#c6b6f4` 1 | linear from (0,0) to (0.4W, H) |
| Stage glows | `rgba(255,255,255,0.7)`, `rgba(190,160,255,0.45)`, `rgba(160,230,255,0.5)` | radius 630 near upper right (drifts +-90 px, `sin(0.3t)`), 570 lower left, 450 upper left |
| Env sky | `#f4f8ff` (low) to `#7fa8f5` (high) | what chrome reflects above the horizon |
| Env horizon band / ground | `#1a1d45`, then `#cbb8ff` to `#5a4a9a` | the dark stripe is what makes metal read as metal |
| Film (iridescence) | `#7ff3ff #c9a6ff #ff9ee6 #b8f7ff` | cyclic, thin-film tint |
| Ink (labels, rims) | `#2c2a6b` text, `#4b3fa8` axis text, `#3b2f8f` halo, `#5a3fa8` shadow | indigo, never black |
| Accent (ribbon) | `#9ff0ff #c4a6ff #ff9be3` | used for the single most important thing on screen |
| Right | `#c8ffe6`, `#2fd39a`, `#14946a` | badge ramp, light to dark |
| Alarm / wrong | `#ffc8d8`, `#ff3d6e`, `#c0153f` | badge ramp; use rarely |

## Ground and surface
1. Gradient fill, then three radial glows (white, lilac, ice-blue) fading to clear.
2. A grid of 1.5 px lines `rgba(120,110,200,0.08)` every 48 px; the vertical lines scroll left at 18 px/s, wrapping.
3. Contact shadow under each blob: a blurred (33 px) ellipse `rgba(90,60,170,0.25)` centred 1.5R below it, rx `1.6R`, ry `0.25R`.
4. Three ambient soap bubbles (radius 30-51 px) rising at 24-36 px/s with +-12 px sway, wrapping; see Mark-making.
All of it is per frame and cheap. Panels, ribbons and chrome sit on top.

## Mark-making
**Chrome (the core technique).** Any chrome shape is a height field shaded per pixel through an environment map. Work in a bounding box around the shape, with `getImageData` and `putImageData`:
1. **Height** `z` and coverage: a blob uses metaballs; text uses the glyph silhouette (below). Coverage `a = clamp(signedDistance + 0.5)`, where `signedDistance = (field - threshold) / |gradient of field|`, so edges are anti-aliased.
2. **Normal**: central differences of `z` (scale 1) give `dz/dx`, `dz/dy`; the normal is `normalize(-dzx, -dzy - tilt, 1)`. `tilt = 0.32` for letters, 0 for blobs, so flat tops of letters look up into the sky.
3. **Reflection**: view vector (0,0,-1). `rx = 2 nz nx + slide`, `ry = 2 nz ny`, `rz = 2 nz^2 - 1`; elevation `e = -ry`. `slide = -0.1 + 0.06 sin(0.5t)` slowly pans the reflection.
4. **Environment lookup** by `e`: above 0.04 is sky, blending from low to high sky with `u = ((e - 0.04)/0.9)^0.55`; paint a white soft box where `0.42 < e < 0.8` and `|rx + 0.25| < 0.22`, and a smaller 85% soft box where `0.15 < e < 0.3` and `0.35 < rx < 0.7`. Between the horizon floor (-0.06) and 0.04 is the dark band: take `k = (|u - 0.62| / 0.62)^2.4` with `u` running across the band and blend the dark colour toward rgb(210,200,255) by `0.6k`, so its edges are pale. Below the floor is ground, light to dark with `u = ((floor - e)/0.85)^0.7`. Average five taps of `e` (spacing 0.015) near the band edges so they read as clean liquid lines, not jaggies.
5. **Thin film**: `f = (1 - nz)^1.6`; palette position `fract(0.9 rx + 0.6 ry + 1.4 f + 0.06t) * 4`, interpolated around the four film colours; mix it in at `0.18 + 0.45 f`, so edges are rainbow and centres are silver.
6. **Specular**: add `255 * max(0, dot(R, L))^90` to all channels, with `L = normalize(-0.45, -0.65, 0.62)`.
7. Write the colour into the frame, weighted by coverage. If it is slow, shade at half resolution and scale up; the lookup is smooth.

**Blob (liquid mercury).** Metaball field: sum over balls of `(r^2 / (d^2 + 1))^2`; inside where the sum exceeds 1. Height `z = weightedRadius * sqrt(1 - 1/sqrt(sum))`. Box-blur `z` twice with radius 6 px so no creases tear the horizon line. Ball set: main ball R; satellites 0.48R at (+0.8R, -0.7R), 0.5R at (-0.75R, +0.65R), 0.32R at (+0.95R, +0.55R); each orbits with amplitude 6-10 px x `wob` at phase `0.9t`. `wob` is 1 at rest, 4 while moving, 5 when something is "adjusting" (add a bonus ball below that swings with `sin(9t)`).

**Bubble letters.** (1) Draw the glyphs sharp in white on a scratch layer the size of the text plus 90 px padding: Fredoka 700, letter-spacing 12-18 px, 7.5 px white stroke to fatten. Draw each letter scaled about its own mid-height so it can inflate alone. (2) Blur the layer 6 px, take its alpha `A`, box-blur `A` three times (radius 3-4 px). (3) Height `z = sqrt(clamp((A - 0.5)/0.5)) * (0.45 * fontSize)`; smooth `z` another 3 px for glyphs under 100 px. (4) Before shading, draw a lilac shadow (`#5a3fa8`, 55%, blur 18 px, offset (12, 27)) and a thin indigo rim (`#3b2f8f`, 60%, blur 1.5 px) so the chrome reads on a pale stage. (5) Shade as above.

**Frosted glass panel.** Shadow `rgba(80,60,160,0.25)` blur 36 px, offset-y 15 px; fill a vertical gradient `rgba(255,255,255,0.72)`, `rgba(245,248,255,0.45)` at 0.5, `rgba(230,220,255,0.55)`; a gloss band `min(90, 0.4h)` tall inset 9 px, white 80% fading to clear; 3 px inner rim white 95%; 1.5 px outer rim `rgba(110,100,190,0.35)`. Pills use the same recipe, height `1.8 x fontSize`, full radius; an active pill gets an inner gradient (accent colours) inset 4.5 px with a 50% white gloss.

**Candy emblem** (inside cards): a radial gradient from the upper left (light tint, mid, deep shade of one hue) with a white 70% highlight ellipse at the top left and flat indigo eyes or details. No outlines.

**Soap bubble** (radius r): a clear body (white 4% at the centre, `rgba(220,235,255,0.1)` at 0.75, white 45% at 0.93, then clear); a conic-gradient ring at 0.93r, width `max(3, 0.09r)`, 55% alpha, rotating at 0.4t through cyan, lilac, pink, gold, mint; a second arc at 0.84r, 0.22r wide, 2.2 rad long at 25%; a white highlight arc at 0.72r from 1.08pi to 1.42pi and a small white ellipse at (0.42r, 0.45r).

**Starburst glint**: an additive soft spot (white 90%, pale blue 35% at 0.3, clear at 0.6 of the size), then two long lens slivers (length `s`, width `0.09s`) crossing at 90 degrees and two short ones (0.45s, 0.06s) at 45 degrees. Twinkle by `0.6 + 0.4 sin(3t + k)`.

## Type and numbers
- Hero words and key numbers are chrome bubble letters: Fredoka 700, headlines 180-198 px, counters 144 px, key number 255 px. Inflation: each letter scales with `H.ease.outBack(u)` over 0.3 s, 0.05 s apart.
- UI text: Space Grotesk 700 in `#2c2a6b`, pill labels 42-45 px (never below 42), annotations 48 px, axis text 36 px, letter-spacing 1.5 px on pills.
- Plain-colour exceptions (for long phrases): Space Grotesk 700 96 px with a gradient (`#4fb8ff`, `#8a5cff`, `#ff5cc8`) and a 12 px white stroke under the fill.
- Counters re-shade every frame as the integer changes (easing `H.ease.inOutQuad` over 2.6 s), so the chrome never sticks to old digits.
- At the key value: an iridescent ring (conic gradient, 12 px) springs out as an ellipse 345 x 210 px with `outBack` over 0.35 s, a sparkle (size 30-120 px) appears at its upper right, and a caption pill sits below.

## Diagrams: arrows, labels, charts
- Ribbon arrow: a quadratic curve sampled at 40 points, drawn on over 0.3-0.45 s. Passes: a `rgba(90,70,170,0.18)` shadow band (width + 12 px), the accent gradient body (12-21 px), a white 85% highlight stroke at 0.25 x width offset 0.2 x width upward, then on completion a filled triangle head (length 21 px, wings 33 px at +-2.4 rad) in `#ff9be3` with a 3 px white outline. Small ribbons (width 8 px) join process pills.
- Labels are frosted pills 18 px beside their object. Examples are frosted cards (210 x 240 px, radius 33) holding a candy emblem and a pill.
- Chart: on a large frosted panel; gridlines 2 px `rgba(80,70,160,0.18)`; the line is 14 px accent gradient over a 24 px shadow band, with a glossy sphere head (radius 24 px, radial from white through pale blue to indigo).
- Wrong or right: a glossy sphere badge (radius 45-60 px) with the ok or alarm ramp, a 4.5 px white rim, a white check or cross at 0.22r thick, and a white 60% gloss ellipse at the upper left.

## Motion
- Everything moves on `H.ease.inOutQuad` or `outQuad` with soft overshoot on pops (`outBack`). Panels glide 0.45 s; chrome inflates 0.3 s; ribbons draw 0.3-0.45 s.
- The blob is a character: its wobble grows with its speed, and it watches the action by sitting beside it.
- Between beats keep it alive: the reflection slide, film phase, bubbles rising, glints twinkling, blob satellites orbiting.

## Scene changes
Liquid morph plus panel swoosh, together, 0.5-0.6 s.
- The blob moves to its new anchor and size with `inOutQuad` (hero 188 px radius down to about 63-83 px when parked in a corner), with `wob` 4 while it moves.
- The outgoing panel slides left by 1350 px with `H.ease.inQuad` over 0.45 s; the new one glides in from the right with `outQuad` over 0.45 s, 0.2 s later.
- Intro and big moments: four drops fly in from 630 x 450 px away at staggered 0.12 s, shrinking from radius 60 and merging into the blob.
- Title letters deflate (`inQuad`, 0.35 s) into a persistent frosted header pill that slides in from the left.

## Finishing passes (run every frame, same strength)
1. All chrome is shaded with the moving reflection (`slide`) and film phase, so highlights travel across surfaces.
2. Starburst glints: one on the main blob's highlight, others near the key number and in corners, twinkling out of phase.
3. Ambient bubbles.
4. `H.grain(ctx, t, {strength: 0.025, cell: 2, fps: 12, mono: true})`. No vignette: this look is high-key.

## Sound palette
Glossy, rounded, watery. Minor sounds go inside `k.minor(fn)`.
- element appears (a plip): `k.tone(t, {f: 520, glideTo: 1100, dur: 0.07, gain: 0.16, a: 0.002})` (rise about 2.1x in 45 ms), with a 1.8 kHz bandpass `k.noise` tick (dur 0.012, gain 0.08).
- label lands: `k.tone` `'E5'` (dur 0.5, gain 0.06) plus a fifth above at 0.3 of the gain.
- arrow completes: a shimmer, `k.noise(t, {color: 'pink', filter: 'bandpass', f: 1100, q: 2.5, gain: 0.05, dur: drawLen + 0.05, a: drawLen * 0.6})`.
- drawing / writing: letters inflate with `k.play('pop', t, {f: 480 + 20 * i, gain: 0.4})` per letter.
- scene change (liquid morph): a wobbling low sine (`k.tone` around 140-220 Hz, gain 0.06, dur = morph length) with brown-noise slosh (`k.noise` lowpass 300 Hz, gain 0.1) and a soft panel glide (pink bandpass 500 Hz, q 0.7, gain 0.07).
- wrong / right: wrong is a triangle `k.tone` falling 340 to 110 Hz (`glideTo: 110`, dur 0.45, gain 0.3), a sine twin at 360 to 116 (gain 0.2) and `k.play('thud', t, {f: 100, gain: 0.85})`. Right is a rising pair `'C5'`, `'G5'` (gain 0.1), 0.08 s apart.
- counters: `k.play('pop', t, {f: 520, gain: 0.45})` at most 40 per second, `f` rising to 560 near the end.
- key number (the biggest hit): `k.play('impact', t, {f: 90, gain: 0.85})` and a triangle chord `'D4'`, `'A4'`, `'C#5'`, `'E5'`, `'F#5'` staggered 0.05 s (dur 1.5, gain 0.09, pans -0.4 to 0.4).
- takeaway: `'D3'` triangle (dur 1.3, gain 0.16) under the last letter.
- bed or music: `k.music(0, DURATION, {mood: 'bright', bpm: 90, key: 'D', gain: 0.42})`.

## Signature moves
- A single mercury blob that wobbles, morphs to each new layout and carries a sparkle on its highlight.
- Chrome letters that inflate one by one with overshoot, reflecting a sliding sky.
- Frosted panels that swoosh across and blur what is behind them.
- Iridescent ribbons that draw on as arrows.
- A ring and sparkle burst around the one hero number.

## Pitfalls
| Looks fake | Fix |
|---|---|
| "Chrome" is a grey gradient | height field, normals, env map with a dark horizon band, specular exponent 90 |
| Jagged reflection edges | average five elevation taps near the band edges; blur `z` |
| Rainbow everywhere | film mix `0.18 + 0.45 f` so only grazing edges go prismatic |
| Chrome vanishes on the pale stage | the thin indigo rim and the lilac drop shadow |
| Static highlights | slide `slide` and film phase every frame |
| Dark, moody scene | keep the stage pale and high-key; chrome carries all the contrast |

## Hero frame recipe
1. Stage gradient, three glows, grid, three ambient bubbles.
2. Blob: R 188 px at (1440, 495), satellites on, contact shadow below; shade it (chrome pipeline).
3. Headline in chrome bubble letters, 198 px Fredoka, left half, two lines; shadow and rim first.
4. A frosted header pill (45 px label) top-left, an accent ribbon from the headline toward the blob.
5. Sparkle on the blob highlight (size 96 px), one at the top right (size 36 px).
6. Grain at 0.025. Check that sky, a dark band and the soft box all show somewhere inside each letter.
