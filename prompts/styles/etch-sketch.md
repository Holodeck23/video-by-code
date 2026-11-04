---
id: etch-sketch
name: Scrape Toy
family: Hand-drawn
fonts: []
best_for: processes drawn as one continuous path, step-by-step builds, nostalgic or playful tone, counting up, anything that benefits from "watch it get made" at time-lapse speed
avoid_for: photographic subjects, smooth curves and organic shapes, colour-coded data, long paragraphs of text, serious or premium tone
---

# Scrape Toy

The viewer believes they are watching a glossy red plastic drawing toy on a desk. One stylus scrapes a single grey-dark groove through silver powder on the screen, and it never lifts: every word, picture and arrow is part of one connected path, travel lines included. Two white knurled knobs below the screen turn in step with the line (left knob = horizontal travel, right knob = vertical). No web fonts are used; the lettering is drawn by the stylus itself.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Desk (centre / mid / edge) | #46585a / #2c3a3c / #151d1e | radial, behind the toy |
| Plastic body (top to bottom) | #f1403f, #de2228 (0.06), #cc171e (0.55), #b01118 (0.9), #8e0b12 | vertical gradient on the rounded shell |
| Bezel recess | #7c0a10 to #a3121a to #e2353a | dark at the top, lit at the bottom (the lip slopes in) |
| Screen powder | #d2d1cb / #c4c3bc / #adaca5 | diagonal gradient, stops 0 / 0.5 / 1 |
| Line groove | #484a4e | the one ink |
| Line core | #2a2b2e | at 50% inside the groove |
| Powder ridge / lit edge | #e8e7e0 / #f6f5ef | beside the groove |
| Knob plastic | #fffefa, #ebe7dc, #bdb7a8 | side ring; top dome #ffffff, #f3f0e8, #d6d1c4 |
| Accent | none | emphasis is geometry (double trace, double box, bigger glyphs), never a second colour |
| Alarm | none | wrongness is a scribble |

## Ground and surface
Toy coordinates equal canvas coordinates at camera 1x. Geometry at 1920x1080: body (18,12)-(1902,1071) radius 93; bezel (117,60)-(1803,912) radius 39; screen (138,81) size 1644x810; knobs at (156,992) and (1764,992), radius 61.5.
1. Desk: radial gradient from (960,450) radius 150 to (960,540) radius 1650 with the three desk colours (stops 0 / 0.6 / 1); overscan it so camera moves never show the edge.
2. Body (cache with `H.offscreen`, it never changes): drop shadow rgba(0,0,0,0.6) blur 54 offset-y 24; fill the vertical gradient above; radial highlight rgba(255,140,120) 32% to 0 from (450,135) radius 1140; edge roll: a 21px inner stroke rgba(80,0,8) 35% shifted +4px down-right (shade) and a 4.5px stroke rgba(255,190,180) 35% on the top-left rim.
3. Hard specular streaks, each three passes (width x3.5 at 18%, x1.8 at 35%, x1 at 100%, white, gradient 0 / a at 0.18 / 0.8a at 0.75 / 0): top edge (165,28)-(1725,28) width 3.3, a 0.75; left edge x=38, y 165-840, width 3.6, a 0.5; right edge x=1882, y 210-780, width 2.4, a 0.22; bottom edge y=1047, x 390-1530, width 2.1, a 0.2. Add two corner glint arcs (white 85% and 40%, 4px) and a skewed pale quad (rgba(255,235,230) 13%) near the top-right.
4. Screen base (cache, build at 2x the screen size so a 2x camera push still shows real grain): diagonal gradient above; a 140x70 map of `H.noise(31).fbm2` (0.06 across, 0.09 down, 3 octaves) turned into white/black blotches (alpha |v|*90), laid over at 30%; per-pixel grain +-17 on every channel (blue 4% less, so it reads warm-grey); metallic flakes at 1% of pixel count, 2x2 specks (30% are 2x3), 60% brighter by 34 and 40% darker by 26.
5. Per frame: screen content (line, ghosts, stylus tip), then the screen finishing passes, then the knobs.

## Mark-making
**The groove** (the only mark; stroke the same polyline three times): ridge 9.9px rgba(232,231,224) at 40%; groove 4.8px rgba(72,74,78) at 95% with a hard light drop-edge offset 1.4px down-right in rgba(246,245,239) at 70% (shadowBlur 0); core 2.1px rgba(42,43,46) at 50%. Miter joins (limit 3), square caps. All lines are the same weight: scale never changes.

**One polyline, built by a pen object.** Operations: move to, arc, text, arrow, mark(name), fast() and slow(). Everything appended is one growing point list, beginning where the previous page's stylus stopped.
- Axis rule: only horizontal and vertical segments are true. A diagonal (both deltas over 0.9px) becomes a stair: n = max(1, round(min delta / 5), ceil(max delta / 24)) steps, each one a horizontal run then a vertical run, step positions j = (i + (r - 0.5)*0.55)/n so they are slightly uneven. Seed `r` from the rounded endpoints in canonical (left-to-right) order, so a retrace walks exactly the same steps.
- Curves: sample an arc every 13px and run each chord through the stair rule. Circles read as rounded octagons made of steps.
- Travel: to get from one drawn thing to the next the stylus moves along a visible straight run, often retracing a stem. Retraces use `fast()`: their length counts 0.38 in the timing budget, so the line scurries back and crawls forward.
- Pictures are out-and-back: leave a junction, draw, return along the same route. Closed shapes overshoot nothing; they simply end where they began.
- Timing: effort[i] = effort[i-1] + dist * weight. Pin named marks to times; the stylus position at `t` is found by piecewise-linear interpolation of effort through those pins, a binary search to the last reached vertex, and a lerp to the next. Draw points 0..n and then the tip. Pure in `t`.

**Lettering** (single-stroke blocky capitals and digits, y up). Grid 3 units wide, 6 tall (M and W 4 wide, I and 1 two wide), advance = width*1.15 + 1.4 units. Every glyph starts and ends on the baseline, so letters chain into one line; branches are retraced. H: up the left stem, back to mid-height, across, up the right stem, then straight down the right stem to the baseline. T: up the stem, along the bar left then right, back to the stem, down. Rounded letters (O, 0, D) are octagons with 1-unit chamfers; a % is a diagonal plus two small boxes. Right-to-left writing reverses the glyph paths and the order, used to write a second copy backward.

**Stylus tip:** a dot r 3.9px rgba(30,31,34) at 90% with a 1.4px white speck at 50%, at the live point. Nothing is drawn beyond it.

## Type and numbers
- Sizes are set by the unit (px per glyph unit; cap height = 6 units): headline 11px (cap 66px), takeaway lines 13px (cap 78px), section labels 7.8px (cap 47px, never below 7.2), small numbers on chart treads 7.2px (cap 43px), counters 13px, key number 24.75px (cap 148px).
- All caps. Words are written left to right at time-lapse speed (about 12 glyphs per second for a title, 6-8 for labels). Text sits level; the toy is rigid.
- Numbers grow as they are written: a long number gains one group of glyphs per beat, the pen pausing a hair at each comma. Treads of a rising staircase carry their own value, written at the tread height; the final value is written large, then re-traced right-to-left shifted 6px right and 6px up (a double trace), then boxed twice (second box 9px larger on all sides).

## Diagrams: arrows, labels, charts
- Arrow: a shaft run (axis-aligned where possible), then the head as two barbs: step back by the head length (24-30px) and sideways by 0.62 of it, return to the tip, repeat on the other side. Never lift.
- Label: stands on two short stubs (40px) above or below a box edge, or is written along a speech-bubble tail or edge; the same pen continues afterwards. Labels ride arrows: shaft, then a stop to write beside it, then on.
- Emphasis: the double box or a double-traced word. Wrong: a zigzag of 18px pitch spanning the word's height plus 10%, then a large X of two stair diagonals. Right: a short down-stroke then a long up-stroke (a tick).
- Chart: an L-shaped axis with an arrow on each arm; a staircase of risers and treads with values on the treads; no fills, no bars.
- Pictures: boxes with rounded steps, face-like icons from arcs; keep every picture to one path.

## Motion
- Pen speed is time-lapse: a title in 1.3 s, a labelled picture in 2-3 s, a whole page 5-7 s. Linear in effort, never eased, except the camera.
- Knobs: left angle = x * 0.0083 rad, right angle = -y * 0.0083 rad (ref was 0.0125 per 1280px). Rotate the knurl ridges and the sprue mark with the angle; the highlight stays fixed. At angular speed above 22 rad/s fade the knurling to 25% and add a pale ring (rgba(200,193,178), width 0.15r).
- Camera: one `camAt` per page from a keyframe list [time, centre x, centre y, zoom], `H.ease.inOutCubic`, 0.25-0.8 s moves. Open at 2x on the headline, pull back to 1x, nudge to 1.2-1.3x on a detail, return. Clamp the view to the desk.
- Between beats nothing else moves: the stylus waits, the knobs are still.

## Scene changes
Shake the toy to clear the page (0.65 s), then the line starts again from the same spot. Do not cut.
- Pose: per frame u = progress. envelope e = max(0, sin(pi*u))^0.55; offset x 51*e*sin(2pi*5.6*q), y 30*e*sin(2pi*7.1*q + 0.8); rotation 0.045*e*sin(2pi*4.4*q + 1.4); scale 1 + 0.025e, about (960,570). Draw the toy into a scratch canvas once and composite it three times at q, q-1/90, q-2/90 with alpha 1, 0.5, 0.34 (motion blur).
- Erase mask (cache once at half resolution): warp x by 30px times a slow `n2` sample (0.01 per px across, 0.02 down); value = 60% of a 3-octave `fbm2` of the warped position (0.006 per px across, 0.06 down, so it streaks horizontally) + 40% of a 2-octave `fbm2` (0.02 per px both ways) + 0.25 times the height offset from the middle; rank-normalise to 0-1 so the coverage is even. The top clears first.
- Fade the page per pixel: threshold = smoothstep(0.08, 0.92, u)*1.3 - 0.16; m = clamp((mask - threshold)/0.12); alpha *= 0.075 + 0.925*m. Patches clear unevenly and 7.5% always remains.
- Over the shake, 7 soft pale bands (rgba(225,224,218) up to 22%, 15-75px tall, re-rolled at 30 fps) wash over the screen.
- Ghosts: once a page is shaken, redraw its polyline with the same groove at 4% (the last one) or 1.2% (older ones).
- Skip the shake when a new idea extends what is already on the screen; the pen just keeps going.

## Finishing passes (run every frame, same strength)
1. Sheen on the screen (clip to the screen): diagonal gradient (210,0)-(840,810), white 0 / 0.10 at 0.42 / 0.16 at 0.5 / 0.08 at 0.58 / 0.
2. Lip shadows inside the screen: top 33px rgba(40,10,10) 42% to 0; left 27px 30% to 0; bottom 12px white 0 to 30% (a light catch).
3. Knobs, drawn last, each with a cast shadow on the plastic (rgba(70,0,6) 55%, blur 21, offset 9,14), knurl: 40 ridges between 0.82r and 0.985r, each a dark line (rgba(120,110,92), 18% + 35% on the shaded side, 3.3px) and a light line (white, 25% + 50% lit side, 1.8px) 0.045 rad on; dome at 0.79r; fixed specular ellipse (white 85%, 0.22r x 0.1r, tilt -0.6) at (-0.33r, -0.42r).
No film grain or vignette is needed: the powder is the grain. For opening shots a light `H.vignette(ctx, {strength: 0.25})` is fine.

## Sound palette
- element appears / drawing: scrape grit scheduled from the pen path. Sample the stylus every 1/60 s. For each axis (left knob x, right knob y; pan -0.55 and +0.55) with speed v px/s over 45: if r < min(1, v/2100), emit `k.noise(t, {dur: 0.022-0.042, filter: 'bandpass', f: 800-1900, q: 1.3, gain: 0.1*level, a: 0.003, pan})`, where level = min(1, v/3900)^0.6; half of the time add a brown lowpass thump (f 420, dur 0.05, gain 0.09*level). Wrap the loop in `k.minor`.
- label lands: nothing extra (the grit is the sound). At the end of a finished picture: `k.play('tock', t, {gain: 0.32, f: 430, minor: true})`.
- arrow completes: the same soft tock.
- scene change (shake): pink highpass noise f 2200, gain 0.16, dur = shake + 0.25, plus a bandpass f 1000 q 0.7 gain 0.08; at each reversal (11.2 per second, weighted by e) a body knock `k.play('tock', t, {f: 300-380, gain: 0.5*e, pan: alternating +-0.3})` and 5 micro-rattles (8ms, bandpass f 1800-3200, q 3, gain 0.22*e).
- wrong / right: wrong = `k.play('error', t, {f: 'G3', gain: 0.75})` as the scribble starts, a `tock` f 300 gain 0.45 when the X lands. right = triangle arpeggio C4 E4 G4 (step 0.075 s, dur 0.55, gain 0.16, plus an octave-up sine at gain 0.04) and `k.play('pop', t, {f: 330, gain: 0.35})`.
- key number: `k.play('thud', t, {f: 120, gain: 1.0})`, two bandpass noise knocks (50ms at 1100 Hz, gain 0.45, q 1.8; then 30ms at 600 Hz, gain 0.35, q 2, 12ms later), triangle chord C3 G3 C4 E4 (dur 1.4, gain 0.07, spread pan). Zero groups tick: `k.play('tock', t, {f: 560-760, gain: 0.26, minor: true})`.
- takeaway: arpeggio G3 C4 E4 G4 (step 0.09, gain 0.9x) and `k.play('ding', t + 0.28, {f: 'C5', gain: 0.35})`.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.3})`; no music.

## Signature moves
- The line never lifts: travel lines and retraces stay on screen.
- Knobs turn with the line, the left one for horizontal and the right one for vertical motion.
- A shake clears the screen in patches and leaves a faint ghost.
- Labels and arrows are written in the same stroke as the picture they belong to.
- Numbers grow glyph by glyph; the key one is double-traced and double-boxed.
- Camera opens tight on the first words, then pulls back to the whole toy.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Smooth diagonals and arcs | stair-step everything, seeded by the endpoints so retraces match |
| Text in a web font | single-stroke glyphs drawn by the pen |
| Line lifts between shapes | one polyline, visible travel runs, fast weighted retraces |
| Static knobs | angles from stylus x and y; ridges rotate, highlight fixed |
| Flat grey screen | gradient, blotches, per-pixel grain, flakes, sheen, lip shadows |
| Erase fades uniformly | rank-normalised streaky mask, 7.5% residue, ghost left behind |
| Second colour for emphasis | geometry only: double trace, double box |

## Hero frame recipe
1. Desk gradient, then the cached body with streaks and glints at 1x.
2. Screen base with grain and flakes; a 1.2% ghost of an older drawing on it.
3. Headline at 11px/unit near (240,150) in one groove, followed by a travel run down-left to a picture: a rounded stair-stepped box with a label on two stubs and an arrow to a second box.
4. Stylus tip at the last point, line drawn to there.
5. Sheen, lip shadows, then both knobs rotated to match the tip (left angle = x*0.0083, right = -y*0.0083). Check: diagonals must look like uneven stairs, and the line must be one unbroken path.
