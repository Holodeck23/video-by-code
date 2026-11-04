---
id: pixel-16bit
name: 16-Bit Console Cutscene
family: Retro digital
fonts: [Press Start 2P]
best_for: stories told as quests, levels and turn-based fights; processes with a loop (try, check, adjust); progress and score reveals; playful, nostalgic tone
avoid_for: serious or sensitive subjects, long paragraphs of text, photographic or data-dense content, anything that needs fine numeric precision on screen
---

# 16-Bit Console Cutscene

The viewer believes they are watching a cutscene from a 1990s console role-playing game: a tiny 320x180 screen, a fixed handful of colours, blown up with hard pixel edges. Nothing is smooth. Everything moves in whole pixels on a 12 Hz clock, backdrops dither into bands, and information arrives in blue dialog windows.

## Palette
Hold the whole video to about 40 colours, defined once as constants. Never compute a new colour except as a mix of two palette entries rounded to integers.

| Role | Hex | Notes |
|---|---|---|
| Sky ramp (11 steps, top to horizon) | #120d38 #1b1448 #2a1a5c #3f2470 #5b2d80 #80377f #a94379 #d15872 #ef7a6c #ffa672 #ffd691 | one dusk ramp, reused by every scene |
| Outline / ink | #0b0720 | every sprite and window edge, near black, never pure black |
| Window ramp (6 steps) | #3f62d6 #3552c0 #2b43a8 #223590 #1a2a7a #132066 | dialog window fill, top to bottom |
| Text white | #f8f8ff | window border and main text |
| Accent (gold) | #ffd57e | the single most important line on screen, selected menu row |
| Info cyan | #6ef0ff | stat headings |
| Alarm / wrong | #ff3a4a (shadow #5a0814) | damage and error text, rarely |
| Right / gain | #6aff8a (shadow #0a4a2a) | hits, gains |
| Far hills / lit rim | #66337a / #b24f80 | parallax layer 1 |
| Near hills / lit rim | #3d2060 / #7a3a74 | parallax layer 2 |
| Cloud (dark / lit / hot) | #7a3478 / #e8687a / #ffb08a | clouds are lit from below |
| Lamp yellow, cyan, pink | #ffd27a, #6ef0ff, #ff6ab0 | lit windows only |

## Ground and surface
The picture is computed, not drawn: every frame fills a `Uint8ClampedArray(320*180*4)` with `put(x, y, rgb)` (integer coordinates, clipped to the buffer), then shows it.
1. Freeze time: `T = Math.floor(t*12)/12`. Every position and animation reads `T`, never `t`. At 30 fps each pixel state holds for 2 to 3 video frames.
2. Sky: for each row, `f = (clamp(y/horizon)^1.2) * 5`; `i = floor(f)`; colour band `i` or band `i+1`, chosen per pixel by ordered dither: `blend > bayer4[(x&3)*4 + (y&3)]` where `bayer4` is a 4x4 Bayer matrix stored column by column (`[0,12,3,15, 8,4,11,7, 2,14,1,13, 10,6,9,5]`) mapped to `(v+0.5)/16` and `blend = smoothstep(0.6, 1, f-i)`. Band edges become checkerboard fades.
3. Distant layers back to front: stars (40 to 50 single pixels from `H.rng`, blinking by `sin(T*3+phase) > -0.3`), a striped sun (disc of radius 24 to 30, hot top fading to orange by dither, lower part cut by horizontal gaps that widen going down), clouds, two hill ranges, a skyline.
4. Target canvas: get a 320x180 canvas with `H.offscreen('lowres', 320, 180, () => {})` and `putImageData` the buffer into it every frame. It is overwritten completely each time, so the frame stays a pure function of `t`. Nothing else is cached.
5. Show it: `ctx.imageSmoothingEnabled = false; ctx.drawImage(lowres, 0, 0, 1920, 1080)`. Scale is an exact 6x; never a fractional factor.

## Mark-making
All marks are pixel routines on the buffer.
- **Hills**: height per column = `base - amp * (abs(fbm2(u, seed)) * 1.6 + 0.35 * n2(u*3.1, seed+9))` rounded, where `u = (x+scroll)*freq` and the noise comes from `H.noise(77)`. Two layers (base 108/118, amp 30/18, freq 0.018/0.03). Rim light: for columns facing the sun, the top 2 rows are the lit colour, rows 2-5 dither toward it at `0.5 - 0.1*depth`.
- **Clouds**: flat ellipses `w` 22 to 40, `h` 2 to 3, edge lumped by `1 + 0.25*sin(x*0.35 + cx)`; bottom 45% hot colour, middle lit, top dark. Drift at 1.5 to 3 px per second, wrapped modulo 380.
- **Skyline**: building width 9 to 18, gap 0 to 3, height from a seeded range; 1 px lit top and right edge; windows on a 2 px grid with 30-35% on, colours from the lamp list; an occasional antenna with a red pixel blinking at `sin(T*4) > 0`.
- **Sprites** are arrays of strings, one character per pixel, `.` transparent, each letter a palette entry (`K` outline, `H` hair, `S` skin ...). Draw with integer scale 2 or 3, optional horizontal flip. Keep a 1 px outline `K` on every sprite. A walk is two frames that swap only the leg rows, flipped at 8 Hz with a 1 px body bob. Idle bob: `Math.round(Math.sin(T*3) * 2)`. Never rotate or smooth a sprite.
- **Floors**: perspective grid by `dz = 48/(y-104)`; horizontal line where `floor(dz)` changes, fading in by dither; converging vertical lines at `x = 160 + k*(y-104)*0.9`.
- **Shadows and glow**: a one-row dark line under an object, or a dithered 50% pool of a lighter palette colour. No gradients, no alpha.

## Type and numbers
- Font: Press Start 2P, rendered into a tiny scratch canvas, then every pixel with alpha > 110 copied into the buffer in the text colour. This removes antialiasing. Add a drop shadow (+1,+1) in the ink colour; for damage and level text also a 1 px ring (3x3 neighbourhood) in ink.
- Sizes in buffer pixels, shown 6x: body label 8 (48px on screen, story-critical minimum), headline and key numbers 16 (96px on screen). Never 12.
- Case: ALL CAPS, short (2 to 3 words per line, 14 characters at size 16 fits a 300 px window).
- Text appears typed, one glyph per tick (about 12 glyphs per second), with a blip per glyph.
- Numbers: counters step on the tick clock and use thousands separators; accelerate with `v = max * prog^2.2`; the final value switches to white or gold the tick it lands. Percentages ease out and tick up one at a time.

## Diagrams: arrows, labels, charts
- Window: 6-step vertical blue ramp, each step blended into the next by dither (`smoothstep(0.7,1,f-i)`); border from the outside in: ink, white, window colour, grey line; corner pixels omitted for a rounded look. Panel, menu, label and counter are all windows.
- Menu: window with three rows, the active row in gold, a white hand sprite (8x5) pointing at it, hopping 1 px at 6 Hz.
- Speech bubble: white rectangle, 1 px ink outline, a 4-row stepped tail.
- Arrow: a 7x9 chevron sprite (ink outline, gold fill) repeated every 40 px and scrolled at 48 px per second along a belt, clipped to the belt.
- Labelled items: a 26x24 card with 1 px ink border, sprite at 2x inside, a coloured tag strip underneath holding a 3-letter word.
- Bars: 1 px ink frame, fill from cyan to green by value, drawn in 4 stepped levels, flashing white on alternate ticks while changing. Bar charts: columns 9 wide, 12 apart, 1 px white cap, fill mixed from purple to green by index.
- Error path: dotted red 2x2 pixels every 3 px along an arc.

## Motion
- Everything snaps: positions `Math.round`, easing quantised to 4-6 steps (`floor(prog*6)/6`).
- Layers rise into place on entrance by offsetting y by `round((1 - H.ease.outQuad(p)) * dist)`, staggered 0.2 s apart back to front (sky first, foreground last).
- Parallax: far hills 1.5 to 2 px per second, near hills 3 to 4, clouds 2 to 3, all integers per tick.
- Hit reaction: target shifts +-2 px each 1/24 s for 0.35 s; the damage word pops up 8 px then settles.
- A character crosses in 0.8 s on the 8 Hz walk cycle.
- Hold frames are never static: a bobbing sprite, a blinking antenna, a drifting cloud always move.

## Scene changes
Three console wipes, each 0.6 s, centred on the cut; build the next scene at the midpoint.
- Mosaic: block size `n = round(16 - |T-c|/0.3 * 15)`; every block takes the colour of its centre pixel.
- Battle swirl: with `k = 1 - |T-c|/0.3`, move row `y` sideways by `40*k*sin(0.25*y + 30*T)` pixels (rounded, wrapping) and mix every pixel toward white by `0.6*k`.
- Iris: everything outside a circle of radius `k*200` becomes ink; move the circle centre at the midpoint so the next scene opens on its subject.
- Also: window slide (a dialog window shrinks into the header over 6 steps), and a 0.1 s screen flash (+120 red, +60 green and blue, clamped) on a hit.
- Opening: 16-level master brightness fade, `lvl = min(15, floor(T/0.8*15))`, each channel times `lvl/15`.

## Finishing passes (run every frame, same strength)
1. Quantise time (`T`) and positions (integers). This is the look.
2. Draw the scene to the 320x180 buffer, then apply the global passes in the buffer: fade (opening only), flash, mosaic or swirl or iris.
3. Upscale exactly 6x with smoothing off.
4. Nothing else: no grain, no blur, no vignette, no scanlines. Anything soft breaks the illusion. `H.grain` is not used.

## Sound palette
Chip sounds are `k.tone` with `type: 'square'` (lead) or `'triangle'` (bass), very short, scheduled on tick times.
- element appears (window opens): triangle steps C5 E5 G5, 0.05 s each, gain 0.12, `minor`, one step per window opening level.
- label lands: `k.play('blip', t, {gain: 0.9, f: 'A5', dur: 0.04})`.
- arrow completes: `k.play('select', t, {gain: 0.7})` as the chevrons start.
- drawing / writing: `k.play('blip', t, {f: 1000, dur: 0.03, gain: 0.5})` per glyph, with `minor`, 12 per second.
- scene change: mosaic = a square tone each tick, `f = 1500/sqrt(n)`, `dur: 0.075`, `gain: 0.04`; swirl = alternating square 300 + 900*k Hz (times 1.26 on odd ticks) plus `k.noise(t, {dur: 0.6, filter: 'bandpass', f: 1500, q: 1.4, gain: 0.14})`; iris = `k.tone(t, {type: 'square', f: 1400, glideTo: 160, gain: 0.045, dur: 0.28})` closing, reversed opening.
- wrong: `k.noise(t, {dur: 0.35, filter: 'lowpass', f: 3200, gain: 0.22})` at the flash, then `k.play('error', t + 0.3, {gain: 0.9})`. right: square arpeggio G5 C6 E6 (0.05 s apart, gain 0.06), held G6, short noise crash.
- key number: `k.play('powerup', t, {gain: 1.4})`, then a held C6 E6 G6 square chord (0.6 s, gain 0.035) over a triangle C4 (gain 0.22), then `k.play('sparkle', t + 0.12, {gain: 0.8})`.
- takeaway: cadence B5 then C6 (square, 0.08 and 0.7 s) over a triangle C4.
- counter ticks: square 1100 to 2400 Hz, 22 ms, gain 0.03, gap of 3, 2, then 1 ticks as it speeds up; `k.play('coin', t)` on landing.
- bed or music: `k.music(t0, t1, {mood: 'bright', bpm: 150, key: 'A', gain: 0.4})` per scene, stopping at each wipe. No ambience bed; the music is the bed.

## Signature moves
- Typed dialog window that snaps up into a title bar.
- Mosaic cut between scenes.
- Cards riding a chevron conveyor into a character, which flashes white as it absorbs each.
- Turn-based battle: command menu with hand cursor, damage word popping off the target, screen flash.
- Level-up screen: score ticking, stepped bar chart, blinking LEVEL UP in gold.
- Opening brightness fade in 16 levels.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Soft, blurry edges | `imageSmoothingEnabled = false`, exact 6x scale |
| Smooth text | threshold glyph alpha at 110 into buffer pixels |
| Gradient fills | ordered dither between two palette colours only |
| Motion on every frame | quantise time to 12 Hz, round positions |
| More than ~40 colours | one shared palette table; mix only between entries |
| Sprites rotated or scaled to odd sizes | integer 2x or 3x, flip only |

## Hero frame recipe
1. Frame at `T = 5.8`; fill the dither-banded sky to a horizon at y = 130.
2. Striped sun at (266, 112), radius 24; two hill ranges; cloud strips at y 26 to 84.
3. A skyline row from y = 128 up, lit windows on a 2 px grid, one blinking antenna.
4. A rooftop strip y 128 to 180 with a 1 px lit rim and a hatch of ink dots; a hero sprite (15x22, 2x) standing on it, a floating drone sprite (11x10, 3x) with a bob.
5. A dialog window at (6, 128, 308, 48) with a portrait sprite and 16 px text typed to the second line.
6. Upscale 6x. Check at 100%: no soft pixel anywhere.
