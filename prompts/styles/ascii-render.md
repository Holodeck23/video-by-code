---
id: ascii-render
name: Text-Mode Demo Screen
family: Retro digital
fonts: [IBM Plex Mono, Press Start 2P]
best_for: software, hacking, networks, data and algorithms, retro-tech nostalgia, anything that can be told as one long terminal document with boxes, bars and block letters
avoid_for: soft or organic subjects, emotional storytelling, photographic detail, anything where fine curves matter
---

# Text-Mode Demo Screen

The viewer believes they are watching a 1990s PC demo running in a text-mode terminal: every single mark on screen is one character in a strict monospace grid, coloured like a demo-scene intro, and the whole screen glows like a CRT with scanlines. A 3D solid is "rendered" into characters, box-drawing frames hold the labels, and the document scrolls row by row. The one quality that sells it is that nothing ever sits between character cells.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground | #05040a | near-black with a hint of violet |
| Primary ink | #3bc2ce | panel text, axes, quiet frames (cyan at 52% lightness, 60% saturation) |
| Structure cyan | #0ddff2 | boxes, model frames, arrows |
| Cyan dim | #0ab3c2 | frame edges of panels |
| Reverse-video bar | #088691 | the background behind a white box title |
| Accent (amber) | #ffd633 | the single most important thing: current stage, guess arrows, key labels, node dots |
| Alarm / wrong | #ff3333 | errors, the error path, crossed-out answers; label text #ff6666 |
| Right / result | #25f447 | correct answers, check marks |
| Magenta | #ff3399 | title caps, shade-block end pieces |
| Violet | #d147d1 | picture frames; drop shadow of block letters #8a0f8a |
| Plasma (dim) | #140c3b to #981f84 | backdrop characters only, 60-90% alpha |
| Scan highlight | #99eeff | the row that is currently being drawn |
| Copper bars | #6a0f7a to #9d2fd0 | very dark bands, lightness 6-28% |

All colours are specified as HSL in the build (cyan hue 185, amber 48, red 0, green 130, violet 260-310); the hex values above are the midpoints. One accent hue per meaning.

## Ground and surface
There is no paper or panel: the whole frame is a grid. At 1920x1080 use a cell of 12x18 px, so 160 columns by 60 rows (a "screen" is 60 rows).
1. Fill the canvas #05040a.
2. **Grid model**: an array of `cols*rows` cells, each `[char, colour, background?]`, rebuilt every frame by pure functions of `t`. Helper `set(col, row, ch, colour, bg)` ignores out-of-range cells. `put(col, row, string, colour)` writes characters in a row. A document row index `worldRow` maps to a screen row by subtracting the scroll offset.
3. **Plasma backdrop** (only dim characters): for each cell, `v = sin(9x + t) + sin(7y - 0.7t) + sin(6(x+y) + 0.5t)` (add a radial term `sin(14*dist - 1.3t)` on a title shot), `k = (v+3)/6`. Draw nothing below k = 0.5. Above it pick the character from `. · : +` by intensity and colour it hue `250 + 60k`, saturation 66%, lightness `14 + 22u`, alpha 0.6-0.9. On the opening, the threshold falls from 1 to 0.45 over 0.8 s so the plasma thickens in.
4. **Block characters are drawn as pixel tiles, not font glyphs** (web fonts have none): build tiles at 8x12 and scale 1.5x with smoothing off. Full block fills the cell; lower-half block fills the bottom half; dark shade is solid except one pixel in a staggered grid (rows 0, 2, 4.. every fourth column); medium shade is a 2px checkerboard; light shade is sparse staggered 2px dots. Cache each tile per glyph and colour with `H.offscreen`.
5. Other characters: IBM Plex Mono 600 at 18px, top-aligned at the cell origin.

## Mark-making
**Shaded solid** (the hero object, any signed-distance shape such as a torus): for each cell, sample 2x2 sub-points; ray-march each (80 steps, hit at 0.002, stop at 22); take the normal by central differences; light = Lambert + Blinn highlight + soft shadow (shadow ray with `min(res, 8*h/d)` over 40 steps). Average over the hits, scale by coverage (`0.55 + 0.45*hits/4`) and map to the ramp ` .,-~:;=!*#$@` by `round(lum*(len-1))`, never index 0. Colour: hue `245 + 55*sin(angle + 0.6t)` plus `20*lum`, saturation 90%, lightness `18 + 62*lum + 30*spec` capped at 96. A checker floor under it uses the shorter ramp ` .:-=+` with hue `290 + 40*lum`, light-fog by distance and soft shadows. Slowly rotate by `t` on two axes. Evaluate only the cells in the object's bounding area.

**Scan-in**: rows are revealed top to bottom over 1.2 s, and the current row shows `▄` on every second cell in #99eeff.

**Figlet block letters**: render the text once to a tiny canvas with Press Start 2P 8px, read its alpha, and treat each lit bitmap pixel as one grid cell: the top 55% of rows use the full block, the rest the dark shade, hue from 48 (amber) at the top to -20 (red) at the bottom (cyan variant 185 to 260), lightness `62 - 10*(y/8)`. Cells one right and one down of a lit cell, if unlit, get a light shade in #8a0f8a: a hard drop shadow. Each letter is 96px wide and 180px tall at 1920. Reveal left to right by cutting at `floor(width*u)` columns. On the loudest moment add +25 lightness for 0.12 s.

**Double-size text**: a VT100-style 2x2 line (each character 24x36 px, IBM Plex Mono 600 at 42px, centred in its 2x2 block); use for small labels and reverse-video buttons. Clear the cells it covers first.

**Box drawing**: single line (`┌─┐│└┘`) for models and cards, double line (`╔═╗║╚╝`) for the title panel. Draw the perimeter cell by cell clockwise from the top-left, progress `u` selects how many cells. A box title is reverse video: white on #088691, with a space either side.

**Arrows**: a run of `─` with `►` at the head, or an axis-aligned path of `─` and `│` with a travelling `●` and an end cap `▲ ◄ ►`. Diagonals use `╲ ╱` doubled, two cells wide.

**Network**: nodes are `O` in amber; connections are dotted `· .` lines in cyan (strong ones brighter); when "learning" re-roll 40% of connections to red at 12 Hz from `H.rng`.

**Bars**: each bar is 4 cells wide: left column dark shade, right column medium shade, middle full blocks, top cell `▄`; hue `260 - 8*i`, lightness `45 + 1.2*row` with alternate rows 6% darker.

## Type and numbers
- Every glyph is on the 12x18 grid. Body text is IBM Plex Mono 600 at 18px (never used as story text); story labels are double-size 42px; figlet headlines are 180px; key figlet numbers are 180px (never smaller than 96px).
- Text appears by typing: one character per tick, a block cursor `█` blinking at 2.5 Hz while the line is active. Reverse-video labels (black on amber, red or green) are the only filled backgrounds besides box titles.
- Numbers are figlet digits with thousands commas; counters ease `u^2.2` toward millions and update on whole characters, so digits flip in place. Percentages count up with the bars and end in a flash.
- Small technical captions (`obj ...... name`) use dotted leaders and are typed one line per 0.08 s.

## Diagrams: arrows, labels, charts
- Pipeline: boxes joined by arrow runs; examples march along the arrow cell by cell (one cell per frame step), each a small box with an ASCII picture (3 rows of 7 characters) and a reverse-video word.
- Label: double-size text above or below the arrow, centred on its midpoint.
- Loop: three reverse-video stage names in a row; the active one inverts to black on amber; a return line goes under them with `▲` and "repeat".
- Chart: `│` and `└──` axes with percentage labels, 16 bars growing one after the other every 0.09 s, the final value in figlet digits inside a red double-line box that blinks 3 Hz.
- Wrong / right: reverse-video red "X" banner and a diagonal cross over the answer; right is green banner and a block-drawn check.

## Motion
- Nothing moves smoothly except the plasma, the object and the sine scroller. Everything else steps in whole cells and whole rows.
- Scroll: the document moves up in whole-row steps, `floor(H.ease.inOutCubic(u) * 60)` rows over 0.5 to 0.6 s, between beats. A pinned header (4 rows) stays at the top.
- Reveal timing: typed lines 10-20 characters per second, boxes 40 cells per 0.5 s, arrows 0.4-0.6 s.
- Idle: plasma drifts, the object spins, a spinner glyph cycles `| / - \` at 10 Hz, cursors blink.

## Scene changes
Scroll to the next block of the document (0.5 s). The old content moves off the top; the pinned header changes its beat counter ("2/4 learn loop"). For a hard change flash the whole palette +25 lightness for 0.12 s on a beat. The intro is a boot: plasma, then the object scans in, then the title prints, then the copper bars open.

## Finishing passes (run every frame, same strength)
1. Compose the grid into a glyph layer (backgrounds, then characters) with full-frame transparent background.
2. Additive glow: draw the glyph layer over the ground with `lighter`, 80% alpha and `blur(9px)`, then the crisp layer on top.
3. Wide bloom: a quarter-resolution blurred copy (blur 3.5px at that size) composited with `lighter` at 35%.
4. Scanlines and aperture grille: one cached multiply layer. Every third pixel row is multiplied by 0.72. Pixel columns cycle through red, green and blue: the two other channels in that column are dimmed 12%. Compute it once per output size.
5. `H.vignette(ctx, {strength: 0.55, color: '#000', inner: 0.55})`.
The sine scroller, if used, is drawn between steps 2 and 4: 33px IBM Plex Mono 700 letters spaced 24px, moving left at 390px/s, y offset `27*sin(0.008*x + 3t)`, hue `0.27*x + 120t` mod 360 at lightness 66 with a hue-matched shadow (lightness 22, offset (3, 4.5)) and a 15px glow.

## Sound palette
Terminal clicks and a chip tune; square waves and a noise channel, nothing smooth.
- element appears (a box starts drawing): a short 40 ms `k.tone` square 'E3' at gain 0.04, then 'A3'.
- label lands: one click: a 12 ms bandpass `k.noise` at 1500 Hz (q 2.5, gain 0.2) with a 190 Hz square thump of 18 ms (gain 0.03).
- arrow completes: `k.play('blip', t, {gain: 0.3})` when the head is placed.
- drawing / writing: typing clicks as above at about 14 per second across the write; text of N characters gets N clicks in the write window (cap 14/s).
- scene change (scroll): a 10 ms bandpass click at 900 Hz (gain 0.16) every 4 rows scrolled, a square `k.tone` falling 700 to 110 Hz (`glideTo`, gain 0.04) and a pink `k.noise` sliding 1800 to 400 Hz (gain 0.08).
- wrong / right: wrong is a detuned buzz (two squares 'A2' and 'A#2', 0.35 s, gain 0.09 and 0.07) with `k.play('glitch', t, {gain: 1.0})` and a short noise crash; right is a rising 'D5', 'F#5', 'A5' arpeggio (60 ms apart) with a low 'D3' triangle.
- key number (the biggest hit): a five-note square chord 'C4', 'E4', 'G4', 'C5', 'E5' (0.8 s, gain 0.055), triangle 'C2' (gain 0.32), `k.play('thud', t, {f: 120, gain: 0.7})`, and a 0.5 s lowpassed noise crash at 3.5 kHz (gain 0.26).
- takeaway: a 'G4' blip then a 'C5', 'E5', 'G5' chord (0.6 s, gain 0.026) over a 'C3' triangle.
- bed or music: `k.bed(0, DURATION, {kind: 'tape', gain: 0.5})` and `k.music(0, DURATION, {mood: 'bright', bpm: 125, key: 'A', gain: 0.35})`, dropped under the scroll sweeps.

## Signature moves
- A 3D shape rendered live into characters through a brightness ramp, with colour banding around it.
- Block-letter headlines built from a bitmap font, with a magenta drop shadow.
- Box-drawing diagrams that draw themselves cell by cell.
- A reverse-video stage list where the active step inverts.
- The whole document scrolls up by whole rows; the header stays pinned.
- Copper bars open behind a rainbow sine scroller.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Smooth gradients and anti-aliased shapes | everything is a cell; block glyphs as pixel tiles |
| Block characters rendered with a font fallback look like flat rectangles | draw them yourself on the 8x12 tile grid |
| Text that slides pixel by pixel | step in whole cells and rows |
| No CRT feel | glow, wide bloom, scanlines, aperture grille, vignette |
| One flat colour | hue by position or angle, lightness by brightness, separate accents |
| Plasma too bright | keep it at 14-36% lightness and sparse |
| Headline is body-sized | headline is 180px figlet |

## Hero frame recipe
1. Fill #05040a; build a 160x60 grid; plasma at full threshold (0.5) in dim violet.
2. Figlet headline "WORD" at column 6, row 4, 180px tall, amber-to-red with the magenta shadow.
3. Double-line panel under it (50 columns, 3 rows): `╚═╝` frame in cyan, light-shade caps in magenta, white spaced letters typed with a block cursor.
4. A shaded 3D object rasterised to the right (about 70 by 50 cells): ramp characters, hue banded cyan to violet, a floor beneath it.
5. A cyan info panel `┌─[ LABEL ]──┐` with four dotted lines and a spinner under it; copper bars near the bottom with a rainbow scroller crossing them.
6. Glow, bloom, scanlines and grille, vignette. At 100% zoom you should be able to count one character per cell and nothing in between.
