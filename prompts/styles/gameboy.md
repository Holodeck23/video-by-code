---
id: gameboy
name: Green LCD Handheld
family: Retro digital
fonts: [Press Start 2P, Inter]
best_for: playful explainers framed as a game, level-up and score moments, step-by-step "quests", progress that climbs to a big percentage, nostalgic or geeky tone, short punchy phrases
avoid_for: long sentences, photographic or emotional subjects, colour-coded information (only four shades exist), anything that needs a wide canvas or fine detail
---

# Green LCD Handheld

The viewer believes they are looking at the screen of an early handheld console, held flat under a lamp: a 160x144 grid of liquid-crystal cells in exactly four pea-soup greens, each cell a separate square with a gap and a faint shadow on the reflective backing behind it. Nothing on screen is smooth; every pixel is an integer position on the grid, and the picture lags slightly like a real slow panel. The case, bezel and glare around it do half the believing.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Shade 0 (lightest, "paper") | #a4ba30 | page, empty text boxes, highlights |
| Shade 1 | #7f9c22 | mid fills, grass, hover states |
| Shade 2 | #3e6a2c | dark fills, shadows, bar bodies |
| Shade 3 (darkest, "ink") | #14381a | outlines, text, borders |
| Panel backing | #a9bd3a | colour the gaps between cells drift toward |
| Cell shadow | #8ea424 x 0.55 | the shadow cast by a dark cell onto the backing |
| Case | #dcd8d0 to #b9b4aa | off-white plastic, light top-left, shade bottom-right |
| Bezel | #7b798c (top) to #5e5c6e (bottom) | grey-violet plate round the screen |
| Label stripes | #7a1f52 and #26276a | two thin rule lines either side of the caption |
| Label text | #c9c7d6 | caption and "BATTERY" text |
| Recess | #3d3c48, edge #2a2933 | the dark well the LCD sits in |
| Power LED | #ff5050 | the only non-green colour |

The picture itself only ever uses the four shades. The important thing is shown by inversion (shades swapped 0<->3), never by a fifth colour. Alarm is a flash of the inverted palette.

## Ground and surface
All geometry is for a 1920x1080 landscape frame.
1. Case plane, built once with `H.offscreen('case', 1920, 1080, fn)`. Per pixel, `g = 0.55*x/W + 0.45*y/H` blends #dcd8d0 to #b9b4aa, multiplied by `1 + 0.035*fbm2(x*0.0027, y*0.0027, 3) + stipple`, where stipple is 3.5% of uniform random jitter (`H.rng(31)`, centred) plus 2% of a very fine `H.noise(9).n2` term sampled at 0.6 per pixel. Add 7000 two-pixel flecks, half white and half dark brown, at 6% alpha. Key light: radial gradient at (90, 60), radius 1350, rgba(255,252,245,0.22) to 0. Shade: linear from (0.5W, 0.4H) to (W, H), rgba(70,60,50,0) to 0.14.
2. Bezel: bounds x 318, y 27, 1284x1035, rounded 33px at three corners and 180px at bottom right. Shadow first (rgba(60,50,40,0.35), blur 15, y +4.5), then the vertical gradient face, then a top-left white sheen (7%) and a bottom-right dark one (12%), 9000 one-pixel flecks (white 5%, dark 7%). A 2px edge stroke lit at the top-left (rgba(255,255,255,0.28)) and shaded bottom-right (rgba(20,15,35,0.35)).
3. Caption strip near the bezel top: two 300x3px rules (#7a1f52 and #26276a) on both sides of an italic Inter 700 19px caption in #c9c7d6, text your own ("DOT MATRIX DISPLAY" is a safe invention). Power LED at the bezel's left: a 7.5px #ff5050 dot with an 18-27px radial glow and a 2.4px white highlight, "BATTERY" at Inter 600 16px beneath.
4. Screen: 160x144 cells at 6px each = 960x864, placed at (510, 132). Recess: a 9px margin of #3d3c48 round it, 1px #2a2933 border, a pale (16%) line along bottom and right, a dark (35%) line along top and left.
5. Cached: case, bezel, label, LED, recess. Per frame: the LCD panel (below) and the glare.

## Mark-making
Everything is drawn on a 160x144 array of shade indices (`Uint8Array`), one per cell, then the whole array goes through the LCD pass. There is no anti-aliasing.
- `put(x, y, shade)`, `rect(x, y, w, h, shade)`, `spr(rows, x, y, flip, scale)`: sprites are rows of the characters 0-3 with `.` as transparent, 16x16 for large things, 10-11 wide for icons. Outline in shade 3, body in 1-2, highlight in 0.
- Text boxes `tbox(x,y,w,h)`: fill shade 0, 1px border in shade 3, then a second 1px inset line two cells in, which makes the double frame. This is the container for everything.
- Texture is pure ordered dither from a hash, never random: `h = (x*73856093) ^ (y*19349663)`; grass = shade 1 with shade 2 where `h % 29 == 0` and shade 0 where `h % 13 == 0`. Pebbles on paths: `(x*7 + y*13) % 17 == 0`.
- Shading is by dither and two-pixel highlights only: a pond is an ellipse with a shade-3 rim and glints shifted 2 cells every 0.25 s.
- Shadows under characters and cards are a one-cell row of shade 2 beneath them.
- Text: stamp Press Start 2P onto a small scratch canvas at integer sizes (8 and 16 cells), then copy every pixel with alpha > 110 as a shade-3 cell. Cache stamped strings.

## Type and numbers
- Press Start 2P only. Title and key number: 16-cell font (96px on screen). Labels and body: 8-cell font (48px on screen, never smaller). Header strip: 8-cell caps.
- Everything in capitals, 2-3 words per line, a maximum of 18 characters per line at 8 cells (the width of the box).
- Text prints at 12-30 characters per second with a tick per letter; it never fades.
- Numbers re-stamp every game tick with commas; counts run as `1e6 * u^2.2`, percentages as `61 + 36*ease-out(u)`. The final value lands inverted: a shade-3 box with shade-0 digits, blinking at 3 Hz until it settles, then solid.
- A progress bar is a shade-3 frame (60x4 cells) with a 2-cell-high fill in shade 0.

## Diagrams: arrows, labels, charts
- Arrow tiles: a 5x7 sprite repeated every 8 cells along a path, nudged 1 cell right every 0.5 s, so a route reads as a conveyor.
- Link: a dotted line of 2x2-cell dots every 4% of the curve, lifted by `sin(pi*s)*14` cells, drawn on over 0.45 s.
- Label: a card is a `tbox` 28x22 with an 11x10 icon and a strip below filled shade 3 with its name in shade 0.
- Chart: two 1-cell axes in shade 3, bars 6 cells wide at an 8-cell pitch in shade 2 (the last in shade 3), each growing over a tenth of the timeline in 8 cell steps; the label sits in the box above.
- Cursor: a 4x5 triangle sprite beside a menu item; it jumps one row (11 cells) at a time.
- Wrong: the whole screen inverts for 0.08 s, the hit object blinks off and on at 15 Hz and shakes +-2 cells at 30 Hz for 0.3 s, then a text box says what was wrong. Right: a small tick sprite (7x5) beside the item with the right-answer fanfare.

## Motion
- The master clock: `tq = Math.floor(t*60)/60`. All positions are integers in cells.
- Walkers move 1 cell per tick (60 cells/s at most) with a 2-frame cycle toggling at 8 Hz; hovering things bob `round(sin(tq*4)*2)` cells.
- Windows slide in 8-cell steps; they are never eased smoothly.
- Idle life: flower glints every 0.5 s, blinking antenna at 1.5 Hz, grass sway every 0.33 s. Nothing in the frame stays still for more than half a second.
- Timing is sequential: an element appears every 0.3-0.5 s, a held read of 0.5-1.0 s before the next change.

## Scene changes
- Palette fade as a door: 4 steps of 0.06 s, all shades shifted lighter by one step each (to white: step k replaces each shade s by `max(0, s - k)`, for k = 1, 2, 3), a beat of blank, then 4 reverse steps.
- Battle-style transition for a big change: 5 inverted flashes 0.05 s apart (remap `[3,2,1,0]`), then horizontal bands 4 cells tall closing from alternating sides over 0.25 s, then opening from the same stripes.
- A text box that becomes the title: it sits at the bottom, grows to the full width, and steps up to the header strip in four 8-cell steps over 0.4 s; the header text stays for the rest of the video.
- Stay continuous (just print into the box) when the next point extends the last.

## Finishing passes (run every frame, same strength)
Build per cell colours first, then the 960x864 panel pixels.
1. Ghosting: blend the world at t, t-0.1 and t-0.2 s. For each cell `a = now`, `b = max(a, prev1)`, `c = max(a, prev2)`; ink = `0.7a + 0.2b + 0.1c`. Interpolate between the nearest two shades.
2. Cell grid: the last pixel column and row of every 6x6 cell are a gap, blended 55% toward the panel backing #a9bd3a.
3. Backing shadow: if the cell up-left of this pixel (3px offset in each axis) is darker, push this pixel toward the shadow colour by `min(0.3, difference*0.11)`.
4. Falloff: multiply by `colT + rowT`. With `u = x/PW` and `v = y/PH`, `colT = -0.03u - 0.32*(u - 0.5)^2` and `rowT = 1.03 - 0.03v - 0.32*(v - 0.5)^2`. Slightly lighter top-left, darker bottom-right and at the edges.
5. Inner shadow: 39px linear gradient down from the top (rgba(20,30,10,0.35) to 0) and 30px across from the left (0.3 to 0). Then clip to the bezel and add a screen-blended glare: a quadrilateral (498,27) (948,27) (498,807) (258,807) with a linear white gradient 10% to 0.
6. Optional `H.vignette(ctx, {strength: 0.12, color: '#10160a'})` to settle the corners.

## Sound palette
Four voices: two square pulses (text blips, jingles), a triangle (bass, "wave channel"), a noise burst (hits, doors). Keep gains low; the speaker is tiny. Small pans only (-0.2 to 0.3). `pu(t, f, dur, gain)` is a one-line helper over `k.tone(t, {type: 'square', f, gain, dur, a: 0.001, r: 0.02})`, `wv` the same with `type: 'triangle'`, `nz` = `k.noise(t, {filter: 'lowpass', f: 3000, dur, gain, a: 0.001})`.
- element appears: one `pu` blip at 'A4' or 'D5' (dur 0.03, gain 0.045), minor.
- label lands: a text blip per printed letter, alternating 'A4' and 'D5', minor; a menu cursor is `pu('A4', 0.03, 0.05)`.
- arrow completes: a falling run of 6 blips, 900 Hz down by an octave in 0.45 s (dur 0.04, gain 0.04).
- drawing / writing: not used; the tick per letter is the voice.
- scene change: a door: `nz` 0.2 s at gain 0.12 and f 1800, plus two blips 'C5' then 'G4' (going out) or 'G4' then 'C5' (coming in). Battle intro: 5 alternating 'E5' and 'B5' flashes 0.05 s apart, then 8 rising stripe blips from 200 Hz (x2^(i/4)) every 0.05 s over a 0.4 s noise swell.
- wrong / right: wrong = noise crunch (f 2000, dur 0.35, gain 0.34) + a square tone 700 falling to 110 Hz (`glideTo`, dur 0.3, gain 0.1) + triangle 'E2', then a buzzer 'D3' (dur 0.14) and 'A2' (dur 0.25) at gain 0.07. Right = 'C5' 'E5' 'G5' 60 ms apart, 'C6' (dur 0.25), triangle 'C3'.
- key number (the biggest hit): `nz` crash (f 4000, dur 0.3, gain 0.16), then a fanfare of three 'C5' pulses (dur 0.1, 0.11 s apart) and a long 'G5' (0.55 s) at gain 0.085, each doubled by a second pulse at 0.75x frequency, triangle 'C3' then 'G3' at gain 0.28, then six sparkle blips 'E6' 'G6' 'C6' x2 at gain 0.02.
- takeaway: 'B4' (dur 0.1) then 'C5' with 'G4' beneath (dur 0.6, gain 0.04) over a triangle 'C3'.
- bed or music: `k.music(t0, t1, {mood: 'bright', bpm: 132, key: 'G', gain: 0.35})` while building, `{mood: 'tense', bpm: 168, key: 'E', gain: 0.4}` for the conflict beat, silence on title cards. Counters tick with a 20 ms highpass noise click (f 6000, gain 0.07) at intervals shrinking from 0.25 s to 0.083 s.

## Signature moves
- The palette fade that acts as a door.
- The inverted number box that blinks until it lands.
- A text box that prints letter by letter and climbs to become the header.
- A three-item menu with a triangular cursor stepping down the choices.
- A flash-and-stripes transition for the big change.
- A tiny walker crossing a route of arrow tiles.

## Pitfalls
| Looks fake | Fix |
|---|---|
| A flat green screenshot | do all four finishing passes: ghosting, cell gaps, backing shadow, falloff |
| Smooth sub-pixel motion | integer cells only; movement on the 60 Hz tick |
| More than four colours | remap through the 4-entry palette; use inversion for emphasis |
| Anti-aliased text | stamp Press Start 2P at integer sizes and threshold |
| Long lines of text | 2-3 words per line, 18 characters max, print in boxes |
| The screen fills the whole frame | the case, bezel and glare are part of the look; leave them |

## Hero frame recipe
1. Cached case plane with stipple, bezel with shadow and gradient, caption strip, LED, recess.
2. World array: a header box (160x16), a stage in the middle with a hashed grass ground and one 32x32 sprite (2x scale of a 16x16 character), and a dialogue box (160x40) at the bottom.
3. Header: 8-cell caps in shade 3. Dialogue: two lines in 8-cell, a 16-cell key word under them, a blinking 7x4 "more" arrow in the corner.
4. A 28x22 card with an icon, a shade-3 name strip and a one-cell shadow, standing on a dotted-arrow path.
5. LCD pass: ghosting, 6px cells with 1px gaps, backing shadow, falloff, inner shadow, glare.
6. Compare against a macro photo of a real handheld screen: the gaps between cells should be visible and slightly lighter than the cells, and dark pixels should have a faint shadow to the lower right.
