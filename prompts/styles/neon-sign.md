---
id: neon-sign
name: Neon Tube Wall
family: Light & imaging
fonts: [Gloria Hallelujah, Poiret One]
best_for: punchy talks, product and tech explainers, nightlife, "how it works" in short beats; confident, slightly moody tone
avoid_for: long paragraphs of text, dense charts, daylight or gentle topics; anything where the glow would hide small print
---

# Neon Tube Wall

The viewer believes they are walking along a brick wall at night after rain, past a row of hand-bent glass neon signs. Each sign buzzes on in a stutter, throws coloured light on the bricks, and smears down into the wet pavement. The quality that sells it is that the light is real: it is added on top of the picture, it tints the wall, and it reflects.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Wall ambient (unlit) | `#1e2234` | the multiply base of the light map; the wall is almost black until a sign lights it |
| Brick albedo | `#e66a4c #c85a42 #f5825c #b4604e #dc785a #8c4c3e` | six brick tones, picked per brick; mortar `#beb6ac` |
| Pavement | `#15171c`, curb lip `#363840` | cold grey with a blue cast |
| Unlit glass | `#2c2430` | every tube is visible when dark; highlight `rgba(170,160,180,0.2)` |
| Blockout paint | `#0d0b0e` | painted-black tube that joins separate letters |
| Pink tube / glow / core | `#ff46a5` / `#ff197d` / `#ffecf6` | main word colour |
| Cyan tube / glow / core | `#46e4ff` / `#0096ff` / `#e4ffff` | thin labels, frames, axes |
| Warm tube / glow / core | `#ffbe46` / `#ff780f` / `#fffae4` | accent for the single most important thing on screen |
| Violet | `#af6eff` | secondary frames and underlines |
| Alarm / wrong | `#ff3024` | blinking X and the ring around a wrong answer |
| Right | `#5aff78` | check mark and a correct value |

## Ground and surface
1. **Brick albedo**, cached with `H.offscreen('brick', 1932, 900, ...)`: bricks 138 x 45 px, mortar 7.5 px, running bond (every second row shifted by half a brick). Each brick takes one of the six tones with a multiplier `0.85 + 0.3 * rnd` and a slow stain term from `H.noise(4402).n3(cos(a) * 3, sin(a) * 3, y * 0.012)` where `a = x / width * 2pi`, so the tile repeats seamlessly in x. Add per-pixel grain of +/-15%, about 1.5% pits at 55% brightness, a lighter 4 px strip on each brick top (x 1.15) and a darker one on the bottom (x 0.75). Mortar edges are jittered by +/-1.5 px per 4-px column so they look chipped.
2. **Pavement** below y = 894: a cached tile of dark concrete with 2 px speckle (`rgba(200,200,220,0.1)`), the lip at the top 18 px lighter, and a second tile holding puddle alpha from `H.noise` with the x scale about 4 times wider than y, so puddles are long and shallow.
3. The wall tile and pavement tile are drawn offset by the camera x (modulo tile width). Everything else is drawn in world coordinates with `ctx.translate(-cam, 0)` onto per-frame scratch canvases (created once, cleared each frame).
4. Draw only signs whose world x is within 1.5 screen widths of the camera.

## Mark-making
Every shape in the video is a glass tube: a path, a width, a colour and an ignition value `k` from 0 to 1.

**Tube (all passes use the same path).**
1. Unlit glass, always, onto the "glass" canvas: stroke `#2c2430` at width `w` (10 px normal, 7.5 for details, 12 for heavy), then a highlight stroke `rgba(170,160,180,0.2)` at `0.3w` shifted (-1.5, -2.25).
2. If `k > 0`: stroke the tube colour at width `w`, alpha `k`, onto the additive "colour" canvas. Stroke the core (tube colour mixed 82% toward white with `H.mixRGB`) at `0.36w` onto the additive "core" canvas.
3. For text, strokes alone are not enough: fill and stroke each glyph in the same colour (stroke 4.5 to 6.5 px) so a thin font looks like tube. Build the core by eroding the glyph: draw the glyph mask again with `destination-in` at 8 offsets around a circle of radius 3 px (7.5 px for the fat script font), so only the middle remains.

**Ignition.** `lit(t, t0, len = 0.3)`: 0 before `t0`; for `len` seconds the tube is on or off per 1/40 s slot, on when `H.rng('slot' + floor(t * 40) + ':' + t0)()` is above 0.42; then 1. Same function everywhere (picture and sound) so the buzz matches the flicker.

**Letters.** Light a word letter by letter: letter `i` at `t0 + i * 0.09` for big script, `i * 0.04` for a long line. Each letter is a separate `lit` call.

**Failing tube.** One letter flickers for the whole video: at 14 Hz pick `r = H.rng('f' + floor(t * 14))()`; before 0.65 s after its strike, level is 1 if `r > 0.55`, 0.3 if `r > 0.3`, else 0; afterwards it is 1 except 0.3 when `r > 0.74`. When partly lit, swap its colours to a darker pink (`#be1969`).

**Hum.** Multiply every tube by `0.97 + 0.03 * rnd` per 30 Hz slot.

**Hardware (always drawn).** Mounting clips: 7.5 x 24 px dark `rgba(30,28,34,0.92)` rounded rects with a 1.5 px light stripe, every 150 to 250 px along a tube and at corners, drawn after the glow. Electrode housings: 33 x 18 px `#0d0c0f` rounded rects with a pale top stripe where a tube ends. Blockout: where one word ends and the next starts, a tube path dips 30 to 60 px below the baseline and is stroked `#0d0b0e` at 10.5 px with a faint pink highlight; it never glows.

**Shapes.** Frames are rounded-rectangle tubes (radius 21 px). Icons are single-line outlines. A speech bubble is a rounded rect with a tail, in one stroke.

## Type and numbers
- Hero word: Gloria Hallelujah 240 px (second line 180 px; short words in bubbles 117 px), pink, letter by letter. Thin labels: Poiret One at 111 px for a headline, 69 px for labels, 57 px for captions, cyan or warm, letter-spacing 9 px for small caps.
- Key number: Gloria Hallelujah 225 px for percentages (counter in Poiret One at 99 px). Colour pink while changing, green when it hits the target.
- Numbers are neon digits: whenever the integer changes, drop the number to 12% for 50 ms (two slots) and re-light it, at most 11 changes per second.
- At the target value: flash 1, 0.2, 1, 0.2 at 10 Hz for 0.5 s, then draw a warm ellipse tube (rx 285, ry 158, slightly tilted) around it that ignites with a 0.35 s stutter.
- Text is never typed; it is struck on, letter by letter or whole line.

## Diagrams: arrows, labels, charts
- **Chase arrow:** split a quadratic curve into 10 to 14 separate tubes with 1.2% gaps. Segment `i` is on once progress `p * n > i + 0.5`. Lit segments run a travelling pulse: brightness `0.45 + 0.55 * (((i - t * 14) mod 4) < 1.4 ? 1 : 0)`. The arrowhead is two 33 px strokes at +/-2.5 rad from the heading and lights only when `p = 1`.
- **Label:** short text in a thin font, with its own small outline pill (cyan, 5 px) when it names a thing; place it 20 to 40 px above or below the object.
- **Chart:** axes are cyan tubes (an L shape, 7.5 px). The curve is a warm polyline revealed by progress with `H.partial`, nodes as pink ring tubes (radius 10 px) that ignite as the line passes. Caption under the x axis in Poiret One 57 px.
- **Emphasis:** a red tube. A blinking X (on at `floor(t * 7)` odd for 0.75 s, then solid) inside a red ring, or a red ellipse around a number.
- **Compare:** two signs side by side, each its own colour; the better one stays lit, the other dims to unlit glass.

## Motion
- The camera is a horizontal pan along one wall: 1920 px per beat, `H.ease.inOutCubic`, 0.65 to 0.8 s. Pan on every beat; between pans the frame is still except for flicker, hum and puddle ripples.
- Signs strike on 0.05 to 0.25 s after the pan settles. Earlier signs stay lit and remain on the wall behind.
- Stagger: frames 0.17 s apart, letters 0.04 to 0.09 s, arrows 0.3 to 0.6 s to draw on.
- Wet ripples: nine rings expand at 0.8 cycles per second, radius `6 + 39 * ph` px, height 0.22 of the width, alpha `0.18 * (1 - ph)`, tinted by the nearest sign.

## Scene changes
The whip-pan is the only scene change: the camera slides along the wall to the next sign and the signs already lit slide out with it. Optional: a 0.1 s dip of the whole light map to 60% at the middle of the pan. No dissolves. Stay on one sign for the whole beat; if the content needs a second thing, add it to the same wall segment.

## Finishing passes (run every frame, same strength)
1. Light map at 1/8 resolution: fill `#1e2234`, add the colour canvas blurred 120 px twice and 36 px once at alpha 0.9 (`ctx.filter = 'blur(...)'` on the small canvas). Multiply it over the brick albedo at full size. This is what makes bricks glow pink or cyan near a sign.
2. Contact shadow: the glass canvas blurred 6 px, drawn with `multiply` at 0.6, offset (+7, +13) px. Tubes sit off the wall.
3. Glass canvas, then the additive halo stack (draw each blurred at reduced resolution with `saturate()` so the rim stays deep colour): blur 90 px, saturate 1.6, alpha 0.55; blur 27 px, saturate 1.8, alpha 0.75; blur 7.5 px, saturate 2.2, alpha 0.6; then the sharp colour canvas at 1; then the core canvas at 1; then the core blurred 4 px at 0.5. All with `globalCompositeOperation = 'lighter'`.
4. Reflection: for each 3 px row below the wall, copy a blurred (9 px) 3.3x-stretched row of the colour canvas, mirrored about y = 894, offset in x by `sin(y * 0.23 + t * 6) * (2 + gy * 0.05) + sin(y * 0.07 - t * 2.3) * (1.5 + gy * 0.045)`. Draw it additive at 0.22 everywhere, add a vertical-smear copy (squash to 15 px high, blur 2, stretch back) at 0.45, and a full-strength copy at 0.6 only through the puddle alpha.
5. Haze: the colour canvas blurred 180 px at 1/16 scale, `screen`, alpha 0.35.
6. `H.vignette(ctx, { strength: 0.55, color: '#04020a', inner: 0.55 })`, then `H.grain(ctx, t, { strength: 0.045, cell: 2, seed: 31, fps: 24, mono: true, blend: 'overlay' })`.

## Sound palette
Night street: low transformer hum, drizzle-like air, and real ignition noises timed to the picture's flicker slots.
- element appears: `k.play('neon', t0, { gain: 0.6 })`, then for each lit slot of `lit()` a `k.play('buzz', slotStart, { f: 120, dur: 0.025, gain: 0.25 })`. Letter-by-letter sounds go inside `k.minor(...)`.
- label lands: `k.play('click', t0, { gain: 0.4 })` plus a short `k.play('buzz', t0 + 0.05, { f: 120, dur: 0.18, gain: 0.2 })`.
- arrow completes: one `k.play('tick', ti, { f: 1500 + 25 * i, gain: 0.22, minor: true })` per segment, throttled to 0.08 s, then a `'neon'` at gain 0.4 on the head.
- drawing / writing (matched to draw-on length): the same ticks spread across the draw-on; chart line adds `k.tone(t, { type: 'sawtooth', dur: 1.3, f: 120, glideTo: 240, gain: 0.04, minor: true })`.
- scene change: `k.play('whoosh', t, { dur: 0.7, gain: 0.5 })` across the pan, plus `k.tone(t + 0.15, { f: 112, glideTo: 138, type: 'sawtooth', dur: 0.4, gain: 0.05 })` for the sign hum passing.
- wrong / right: wrong is `k.play('buzz', t, { f: 98, dur: 0.14, gain: 1 })` per blink plus `k.play('thud', t, { f: 140, gain: 0.5 })`; right is `k.play('success', t, { f: 'G4', gain: 0.7 })` with a `'neon'` strike on the green tick.
- key number: `k.play('thud', t, { f: 90, gain: 1.1 })` at the first flash, three buzz bursts at the flash times, `k.play('neon', t + 0.05, { gain: 1 })` on the ring.
- takeaway: a held chord of four sines on 240, 300, 360, 480 Hz fading in over 0.2 s under the last line.
- bed or music: `k.bed(0, DURATION, { kind: 'hum', gain: 0.5 })` and `k.bed(0, DURATION, { kind: 'night', gain: 0.3 })`.

## Signature moves
- A whip-pan along one brick wall, every beat a new sign.
- Letters strike on one by one in a stutter; one letter never quite catches and keeps flickering.
- Segmented chase-light arrows that ignite toward their target.
- A number whose digits go dark and re-light each time they change.
- A red blinking X inside a ring for the wrong answer.
- Coloured light sliding over bricks and shivering in a puddle below.

## Pitfalls
| Looks cheap because | Fix |
|---|---|
| Glow is a single blur | Stack three blurs plus sharp tube plus thin white core, all additive |
| Core is as fat as the colour | Core width 0.36 of tube; erode glyph masks |
| Wall is lit evenly | Multiply a low-res light map over a nearly black albedo |
| Unlit tubes vanish | Always draw the dark glass and its highlight |
| Reflection is a flipped copy | Stretch 3.3x, ripple per row, mirror fully only in puddles |
| Everything on at once | Strike tube by tube; keep the flicker slots deterministic |
| Tubes float on the wall | Add clips, electrodes, blockout runs and the contact shadow |

## Hero frame recipe
1. Wall: cached brick tile at cam = 0, pavement from y = 894.
2. Place a pink script word 240 px at (700, 560), a cyan outline frame (rounded rect 650 x 111, radius 33) at (880, 640) containing a cyan Poiret One line at 60 px with 9 px letter spacing.
3. Strike everything on (`k = 1`), except one letter of the word at level 0.3.
4. Add unlit-glass pass, blockout dips between words, electrodes at tube ends, clips every 200 px.
5. Light map multiply, contact shadow, halo stack, sharp tubes, cores.
6. Reflection with puddle alpha, nine ripple rings, haze.
7. Vignette and grain.
