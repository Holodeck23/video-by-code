---
id: kawaii
name: Kawaii Cel Pastel
family: Illustration
fonts: [Fredoka, Zen Maru Gothic]
best_for: friendly beginner explainers, product intros for a young or casual audience, habits, learning, small wins, anything with a mascot who reacts
avoid_for: serious, legal, medical, financial or grief-adjacent content; dense data where outlines and bounce would fight the numbers
---

# Kawaii Cel Pastel

The viewer is watching a flat 2D anime-style cartoon animated "on twos": a round chibi mascot with huge glossy eyes reacts to every beat inside a pastel candy world. Nothing is soft-focus or textured. The look is sold by three things together: one even plum outline, exactly one shade tone per shape, and a bouncy spring on everything that appears.

## Palette
Each hue has three values: light (fill), shade (the single cel tone), deep (accents, text outlines, arrows).
| Role | Hex | Notes |
|---|---|---|
| Outline | #5a3659 | plum, every shape, even width; never black |
| Face dark | #3b2342 | eyes, brows, mouth lines |
| Pink | #ffbfd2 / #f597b7 / #ff6f9c | light / shade / deep; mascot body, hearts |
| Mint | #bff0dc / #86d6b9 / #3fb98e | light / shade / deep; "right", panels |
| Butter | #fff0a6 / #f5d06a / #ffd84d | light / shade / deep; highlights, stars |
| Lavender | #ded2ff / #b7a2f2 / #8f74e6 | light / shade / deep; connectors, chart labels |
| Sky | #c6e7ff / #8cc6f2 / #5aa9ea | light / shade / deep |
| Cream | #fffaf4 / #e4d8f6 | head, cards (shade is lilac) |
| Accent | #ff6b8a | the single most important thing: the error mark, the key number |
| Alarm / wrong | #ff6b8a | with shade #e2486c, used rarely |

Backgrounds (base / dot / accent): pink #ffe7ef / #ffd3e1 / #fff3b0 (dots); mint #ddf6ec / #c4ecdb / #fff1a0 (stars); lavender #efe8ff / #e0d4ff / #ffd0e0 (clouds); butter #fff6d8 / #ffeab0 / #ffc4d6 (hearts). One background per scene.

## Ground and surface
Fully flat, redrawn each frame (cheap shapes, no caching needed).
1. Fill the scene's base colour.
2. 3 drifting white clouds (6 on lavender), alpha 0.7 (0.95 on lavender), width 300-550 px, speed 12-24 px/s, wrapping across the frame.
3. Staggered dot grid, spacing 99 x 72 px, odd rows shifted half a step, dot radius 12 in the dot colour. On star and heart scenes odd rows carry accent-coloured stars (radius 15) or hearts (radius 14) instead. The whole grid drifts (18, 10.5) px/s, wrapping by two cells.
4. 7-10 twinkle sparkles at seeded positions (`H.rng`), 4-point stars radius 14-27, white or butter, size follows `max(0, sin(t * speed + phase))` with speed 2.5-4.5. Skip positions that sit behind content.
No shadows under the scene itself. Characters get a soft contact ellipse `rgba(90,54,89,0.13)` that shrinks when they hop.

## Mark-making
Every shape is a Path2D (rounded rects, ellipses, rounded polygons with `arcTo`, 5-point stars with ratio 0.5, hearts from 4 bezier curves, 4-point sparkles with concave quadratic sides).

**Outline.** `lineWidth = 7 / currentScale` (so a small prop keeps the same weight as a large one), plum, round joins and caps.

**Cel fill** (the whole look). In order:
```
fill(path, shadeColour)                  // whole shape in the shade tone
clip(path); translate(-dx, -dy)          // dx = dy = about 5% of shape width (large), 8-10% (small props), min 4 px
fill(path, lightColour)                  // light copy, shifted up-left: shade survives bottom-right
stroke(path, outline)
```
Exactly one shade tone per shape, light from the top left, always. No gradients on bodies.

**Union outline** for a shape built from parts (speech bubble + tail, thought cloud): stroke every part at twice the outline width, then fill every part flat. The seams vanish and only the silhouette keeps its outline.

**Highlight.** A white ellipse at alpha 0.95 rotated -0.6 rad, about 10% of the shape's width, in the upper-left; a second tiny round dot beside it on big shapes.

**Glossy eye** (draw in this order): dark ellipse; iris with a vertical gradient (dark at the top, 35% mixed toward the iris colour in the middle, 45% mixed to white at the bottom); a large near-black pupil at 42% of the eye width; a pale crescent along the bottom of the iris; two white highlights (large at upper-left, 34% x 28% of the eye; small at lower-right, 14%); a thick lash arc over the top (angles 1.13 pi to 1.87 pi, width 0.22 of eye radius). Eye proportions: each eye is 26% of the head width and 47% of the head height, centred at 20% of the head width either side and halfway down.
**Other eyes (the reaction vocabulary):** happy `^` (quadratic arc, width 0.32 r), blink (inverted arc), squeezed `>` / `<` for effort, swirl (spiral, 5.2 pi turns, width 0.17 r) for confusion, star (butter star with outline and a white dot) for triumph, shock (white eye with a small dot).
**Mouth and cheeks.** Tiny: width about 11% of the head. Kinds: open smile with inner `#b8456f` and a pink tongue ellipse clipped inside, `w` for cats, `o` and `O` ovals, flat line, wobble line. Blush: ellipse `rgba(255,135,170,0.55)` plus three short slanted hatch lines `rgba(255,95,145,0.85)`, centred at 35% of head width and 75% down.

**Chibi proportions.** Head is wider than the body (head 276 x 204, body 172 x 132, in design units; multiply by about 1.4 for a hero mascot at 1920 wide). Stubby ellipse arms, feet barely visible. Secondary characters follow the same recipe: one big head shape, simple ears, a small nose, a short body or none.

**Dotted arrow.** Dots of radius 9 every 33-36 px along a bezier (`H.bezier`, `H.resample`), drawn on by `H.partial`, ending in a chunky rounded triangle head (size 30, cel-filled, outline 6 px). Colour is the scene's deep tone.

**Emotes.** Sweat drop (cel-filled sky teardrop with a highlight), anger cross, impact lines (8-14 short radial dashes, width 9, expanding over 0.3 s and fading to 40%), hearts floating up while swaying.

**Confetti.** 30-46 pieces in six candy colours (rounded rect, circle, star, heart), closed-form: `p = origin + dir * v * tau * 0.8`, plus `780 * tau^2` of gravity (px), `v` 570-1230 px/s, scale y by `cos(tau * 9 + i)` for the flutter, gone after 2.4 s.

## Type and numbers
Fredoka 700 for everything. Title 120 px, key number 234 px, counters 123 px, labels 60-78 px, small tags 42-48 px at minimum, bubble words 90 px.
- Sticker lettering: stroke outer plum (`lineWidth = 0.37 * size`), stroke the colour (`0.24 * size`, soft shadow plum at 32%, blur `0.12 * size`, offset-y `0.07 * size`), then fill white. Colour is the scene's deep tone; the key number uses #ff6b8a.
- Titles appear per letter: each glyph runs its own pop, 0.04 s apart, hopping up 18% of its size in the first 0.25 s and wobbling `0.02 * sin(6t + 1.3 i)` rad.
- Numbers count with an ease-out power curve and bump 8% in scale each time a related thing lands. Short sound-word stickers (Japanese onomatopoeia in Zen Maru Gothic 900, or "boing!" in Fredoka) sit near the character, rotated 0.1-0.18 rad, shown about 1.2 s. For kana, make sure the font's kana subset is loaded before frame 0 (add the glyphs to a hidden element and wait on `H.loadFonts`).
- Tags are pill shapes (height 1.5 x text size), cel-filled, plum text.

## Diagrams: arrows, labels, charts
- Connectors are dotted candy arrows. A loop is three dotted arcs between pill badges; the active badge lights up, scales 1.08 and carries a pulsing sparkle; inactive ones are white with 62% text.
- Labels are pills that pop onto the thing they name (plum text on a light fill).
- Charts: rounded-top bars in cycling pastels with a highlight stripe (width 8 px) and the mascot hopping bar to bar, climbing a scale of notes. The final value gets a spinning butter 14-point star behind it, impact lines (14), confetti.
- Result: a before-and-after pill (old value in plum, new value in #ff6b8a, a short dotted arrow between).
- Wrong guess grammar: red disc with a white X stamped on the answer, swirl eyes, wobble mouth, "!?" sticker, a sweat drop sliding down, 8% punch-in zoom with a two-frame horizontal shake of 10 px.

## Motion
- Everything runs on twos: at the top of `__renderFrame`, snap the time with `t = Math.floor(t / (1 / 15) + 1e-6) * (1 / 15)`. Set `window.FPS = 30` so each pose holds two frames.
- Pop-in spring: `s = 1 - exp(-9u) * cos(18u)`, `stretch = exp(-8u) * sin(18u) * 0.28`, then `sx = s * (1 + stretch)`, `sy = s * (1 - stretch)` (u in seconds since the start). Everything uses it; settle is about 0.4 s. Pop-out: linear 0.2 s scale to zero.
- Landing squash: `[1 + q, 1 - q]` with `q = exp(-7u) * cos(16u) * 0.26`, anchored at the feet.
- Idle: bob `sin(2 pi * 0.85 t) * 12` px, blink 0.14 s every few seconds, arms waving `2.3 + 0.45 sin(9t)` rad on joy.
- Hops: `y -= abs(sin(pi * u * 2)) * 93`, squash on contact, 1.1 s for 8 hops.

## Scene changes
Star or heart iris wipe, 0.5 s: scene B is drawn inside a clip path that grows from a point (star: radius `2700 * e^2`, ratio 0.52, rotating 0.9 rad over the wipe; heart: `2850 * e^2`), where `e = smoothstep(u)`. Draw a thick rim on the edge: plum 51 px, then butter (star) or pink (heart) 36 px, then white 9 px at alpha 0.8. Use the opposite shape each scene. Cuts are never plain. Within a scene, pop things in and out instead.

## Finishing passes (run every frame, same strength)
Flat means no grain, no vignette, no glow. The finishing is discipline:
1. The even outline weight (scale-compensated) on every shape.
2. The single cel shade tone with the same light direction everywhere.
3. A white highlight on every glossy or round object.
4. Time quantized to 15 fps.
5. Drifting dot grid and twinkles on every scene so the frame never sits still.
Do not add `H.grain` or `H.vignette`.

## Sound palette
All tonal parts stay under about 1.6 kHz so it sounds soft.
- element appears (bloop): `k.tone(t, { glideTo: f * 1.35, f: f * 0.7, gain: 0.2, dur: 0.11 })` with f 420-780 rising for each word or letter group, plus a 12 ms bandpass click (`k.noise`, f 1600, gain 0.05).
- label lands: the same bloop, one pitch step higher, `minor: true`.
- arrow completes: for a dotted arrow, six tock ticks, `k.play('tock', t + 0.09 * i, { gain: 0.3, f: 1500 })`.
- drawing / writing (matched to draw-on length): ticks as above, one per 3 dots.
- scene change: `k.tone(t, { f: 262, glideTo: 784, type: 'sine', dur: 0.55, gain: 0.06, a: 0.3 })`, `k.noise(t, { color: 'pink', filter: 'bandpass', f: 1000, q: 0.8, gain: 0.14, dur: 0.5, a: 0.35 })`, then 3 bell tones (G5, C6, E6, 0.06 s apart, gain 0.05) as it opens.
- wrong / right: wrong is `k.play('thud', t, { gain: 0.55, f: 120 })`, a bloop at 300 and two falling triangle notes (E4 to D#4, then C4 to A3, gain 0.07, dur 0.32 and 0.6). Right is a rising bell arpeggio C5, E5, G5, C6, 0.07 s apart, plus a twinkle.
- key number: `k.play('impact', t, { gain: 0.55, f: 110 })`, chord of four bells (C5 E5 G5 C6, gain 0.17, dur 1.7), a `C3` triangle tone, 18 tiny bandpass noise ticks (f 1800-3200) as confetti, twinkle.
- takeaway: a resolving chord G4 C5 E5 G5 at 0.05 s spacing with a low `C3` under it.
- bed or music: `k.music(0, D, { mood: 'bright', bpm: 120, key: 'C', gain: 0.42 })`.
- counter ticks: `k.play('tock', t, { gain: 0.42, f: 1250 })` rising to 1600, at most 11 per second, thinning as it settles.

## Signature moves
- The mascot drops from above, lands with a squash, and the title letters pop in one by one.
- A wrong guess: swirl eyes, sweat drop, "!?" and a 8% punch-in; the fix makes the eyes squint, then the right answer shows star eyes and confetti.
- Star and heart iris wipes with a candy rim.
- Bars pop up on twos while the mascot hops from bar to bar.
- Pills and badges that scale 1.08 when active, with a sparkle beside them.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Black or thin varying outlines | Plum, 7 px divided by the current transform scale |
| Gradients on bodies | One shade tone via the clip-and-shift trick |
| Smooth 60 fps motion | Quantize `t` to 1/15 s |
| Everything appears with a plain fade | Use the spring pop with squash and stretch |
| Eyes small and dull | 26% of head width, 47% of head height, two highlights |
| Muddy pastels | Keep fills at the light values; keep deep tones for small accents and text |
| Seams in a bubble | Union outline, not separate outlines |

## Hero frame recipe
1. Fill #ffe7ef, add three drifting clouds and the dot grid (#ffd3e1, spacing 99 x 72).
2. Mascot at the centre, head 380 px wide: body in pink with cel shade, cream head with a lilac shade, two glossy eyes, blush, tiny smile, one small accessory on top of the head.
3. Two smaller friends left and right, built the same way, bobbing out of phase.
4. Floating hearts (4) and sparkles (5), a sound-word sticker beside the mascot.
5. Title above: 120 px Fredoka in white with pink stroke, per-letter wobble.
6. Quantize `t` to 1/15 s before drawing, then check the outline weight is the same on the small sparkle and the big head.
