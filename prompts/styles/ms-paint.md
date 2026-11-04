---
id: ms-paint
name: Bitmap Paint Window
family: Retro digital
fonts: [Patrick Hand, Inter]
best_for: comic, self-aware or deadpan explainers, "someone is making this live" feel, before/after and wrong-then-right sequences, step lists, jokes at the expense of jargon, anything that wins by being proudly crude
avoid_for: premium, luxury or serious tone, fine data, anything that needs smooth gradients or realism
---

# Bitmap Paint Window

The viewer believes they are screen-recording someone painting on a 1990s-2000s desktop bitmap editor: a grey application window with a title bar, menus, a toolbox of 16 square buttons, a 28-colour palette and a scrolling white canvas. Every mark is a hard-edged pixel from a real tool (pencil, brush, line, ellipse, bucket, airbrush, text box, eraser) driven by a visible mouse cursor. The sell is the crudeness itself: wobbly mouse lines, a flood fill that leaks, shapes drawn twice.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (canvas) | #ffffff | the bitmap; also the colour of the eraser and of opaque text boxes |
| Window face | #c0c0c0 | all chrome |
| Bevel highlight / light | #ffffff, #dfdfdf | top-left edges of raised parts |
| Bevel shadow / dark | #808080, #000000 | bottom-right edges |
| Title bar | #000080 to #1084d0 | horizontal gradient, 16px tall (buffer px) |
| Primary ink | #000000 | outlines, arrows, plain words |
| Accent | #ffff00 | fills of the main object; also the airbrush sparkle |
| Label ink | #000080 | names and captions |
| Alarm / wrong | #ff0000 | the fat brush X, the corrective arrow, the emphasis circle; use rarely |
| Right / result | #008000 | check, the climbing line, the corrected word |
| Fill colours | #ff8040, #804000, #ff80c0, #ff00ff, #00ff00, #00ffff, #0000ff | one flat fill per object |

Use only the classic 28 swatches: row 1 #000000 #808080 #800000 #808000 #008000 #008080 #000080 #800080 #808040 #004040 #0080ff #004080 #8000ff #804000; row 2 #ffffff #c0c0c0 #ff0000 #ffff00 #00ff00 #00ffff #0000ff #ff00ff #ffff80 #00ff80 #80ffff #8080ff #ff0080 #ff8040. No gradients, no alpha, no anti-aliasing anywhere.

## Ground and surface
Everything is drawn on a 640x360 buffer and shown 3x with `imageSmoothingEnabled = false`. All sizes below are buffer pixels (x3 on screen).
1. Chrome, cached with `H.offscreen('chrome', 640, 360, fn)`: fill #c0c0c0. Title bar at (2,2) 636x16 with the gradient, a 12x11 palette icon, the document name in white Inter 700 9px, three bevelled 14x12 buttons at the right. Menu row baseline y 30 (File, Edit, View, Image, Colors, Help, first letter underlined), then a 1px #808080 line over a 1px white line at y 35-36.
2. Toolbox: 2 columns x 8 rows of 25x25 buttons from (4,40); each has a raised bevel and a 16x16 pixel icon (select, eraser, bucket, picker, magnifier, pencil, brush, airbrush, text, line, curve, rectangle, polygon, ellipse, rounded rectangle). Under it a 42x62 options box.
3. Canvas well: a sunken field at (58,38), 580x262. The bitmap shows through a 540x230 window at (62,42). Below it, a 16px scrollbar with two arrow buttons, a dithered track (alternating #fff and #c0c0c0 pixels) and a raised thumb.
4. Palette row at y 304: a 30x32 colour-in-use box and the 14x2 swatches, 16x16 each with a sunken bevel. Status bar at y 342 with a hint string and a live coordinate readout.
5. Bevels: raised = outer white/black, inner #dfdfdf/#808080; pressed = reversed; field = #808080/white outer, #000000/#dfdfdf inner; thin = #808080 and white lines. Cached; per frame only the pressed tool (with a dithered checker background), colour box, scrollbar thumb, coordinates and the cursor change.
6. The bitmap itself is 2100x230 (nearly four screens wide), a `Uint32Array` rebuilt every frame by replaying the timeline of tool operations up to `t`.

## Mark-making
Every operation has `{t0, dur, tool, colour, draw(p, rng), pen(p)}` where `p` is 0-1 progress; replaying them with `p` clamped makes the frame pure in `t`. Write pixels with `plot(x, y, c)` after rounding; never use canvas strokes or fills.
- **Line**: Bresenham from point to point. Width 1 = one pixel; width 2+ stamps a filled disc of diameter `w` at each step. Typical widths: hairlines 1, outlines 2, arrows 3, emphasis strokes 4-5.
- **Mouse hand** (pencil and brush): densify the path to a point every 6px, offset each point by `rng.gauss() * jitter` (0.5 for tidy, 1.0-1.4 for brush, 2.2 for a long curve), draw only the leading `p` fraction.
- **Shapes** (rubber band): a rectangle outline grows from its top-left corner as `(w*p, h*p)`; an ellipse's radii scale by `p` with its box corner anchored. Draw rectangles twice, the second offset about (+3, -3) and slightly larger, as if the first was wrong. Optional gap: skip an ellipse arc of about 0.12 rad so the shape is not closed.
- **Bucket**: exact scanline flood fill on pixel colour equality, applied in one frame (`dur` 0.001); a gap in an outline lets the colour leak into the neighbouring region, which is the comic beat. Fill after outlining, outer regions first.
- **Airbrush**: `n` points scattered in a disc, radius `r*sqrt(rng())`, count growing with `p`; 14-70 dots per puff, radius 5-12, alternating the colour and white or two colours for cloud and spark effects.
- **Eraser**: white 8x8 or 14x50 squares stepped along a path.
- **Pencil dots**: a single pixel or 2x2 block for eyes and details.
- **Paste**: in one frame, an opaque white card with a 1px black outline and its drawing (a crude icon is 3-6 primitives: a large ellipse, a few hand strokes, two stamped dots), a flood fill and a label. Each copy lands offset (+16, +8) from the last, 0.14 s apart, with a dashed selection rectangle around the newest.
- **Selection / text box ants**: a dashed rectangle of 1px dots, alternating #000000 and #ffffff every other pixel.

## Type and numbers
- Document text: Patrick Hand 400, rasterised on a scratch canvas and copied into the bitmap with a hard alpha threshold of 105-120, so edges are jagged. Headline 44 buffer px (132px on screen), second-level 34, key number 52 (156 on screen), story label 18-24 (54-72 on screen, never below 18), UI labels Inter 9px.
- Text arrives from a text box: draw an opaque white rectangle behind it (pad 4px) if it sits on top of art, reveal `floor(p * length)` characters over 0.1-0.35 s (about 25 chars/s for a headline), show the dashed text box and a 1px caret blinking at 1 Hz (`floor(t*2) % 2`) at the end of the typed text.
- Numbers are retyped: the whole numeral is redrawn in an opaque white-backed box every frame it changes. Counts ease in-out over 1.2-1.5 s with thousand separators; percentages step 1 at a time.
- Emphasis on a number: after it lands, an ellipse-tool circle in #ff0000, 3px, drawn on in 0.2 s, then "!!" typed beside it in red.
- A title may be typed large at the centre, selected, then dragged and shrunk (44 to 24px) to the top-left over 0.6 s as a floating selection, then stamped down for good.

## Diagrams: arrows, labels, charts
- Arrow: line tool at width 3 from tail to head (0.15 s), then two 14px head strokes at +-0.5 rad appear in the same frame the shaft ends. Curve tool: a quadratic bezier with 30 samples, same head. Never filled triangles.
- Label: typed in Patrick Hand beside or inside a pasted card, in #000080, after the picture is filled.
- Chart: two 2px axes (the x axis with an arrow head), a wobbly 3px #008000 pencil curve (jitter 2.2) grown over 0.85 s toward a retyped number box, axis labels typed.
- Knobs and sliders: 13px-radius circles with a 10px pointer line, redrawn at a new angle in 3 steps 0.12 s apart while the pointer line turns red.
- Wrong: two fat #ff0000 brush slashes (width 5, jitter 1.0, 0.12 s each) across the thing. Right: erase the wrong thing with the eraser, type the right word in #008000, add a 5px check (3 points).

## Motion
- Everything happens at mouse speed on one sequential timeline: strokes 0.1-0.35 s, bucket fills 1 frame, text 0.1-0.35 s, pastes every 0.14 s. A gap of 0.05-0.2 s separates actions.
- The cursor is always visible. While an operation runs it sits on the operation's pen position; in the gap before the next action it glides to the next start with `H.ease.inOutCubic`, and the tool and colour swap at the gap's midpoint. Cursors: crosshair for brush, line, shapes and airbrush (black with a white shadow pixel, 5px arms), I-beam for text, a pencil with a yellow body, a bucket, a hollow square for the eraser.
- The toolbox highlights the active tool; the colour box and status coordinates follow the pen.
- The "camera" is the canvas scroll, never a zoom or tilt.

## Scene changes
Scroll the canvas sideways, as a user would with the scrollbar: eased `H.ease.inOutCubic` over 0.55-0.6 s, positions rounded to whole pixels, the scrollbar thumb sliding with it (`thumbX = 16 + (trackWidth - thumbWidth) * scroll / (docWidth - viewWidth)`, thumbWidth = trackWidth * view / doc). Hold each screen for at least 3 s, with 7-9 mouse-wheel notches (see Sound) timed denser in the middle of the move. A new idea is a new screen of the same long bitmap, so earlier drawings stay behind. For a quick correction, erase in place instead.

## Finishing passes (run every frame, same strength)
The style has no filters; the hardness is the finish. Check each:
1. Render to the 640x360 buffer, then `drawImage` to 1920x1080 with smoothing off, so every buffer pixel is an exact 3x3 block.
2. Text and lines are thresholded or Bresenham, never canvas-anti-aliased; the bitmap is written pixel by pixel.
3. Bevels are 1px lines; selected buttons are dithered checkers, not gradients.
4. Blink and ants: caret at 1 Hz, dashed selection ants alternating each other pixel, coordinate readout updating every frame.
5. Do not add grain, vignette, blur or glow. Optional: a one-pixel drop shadow (#808080) under a pasted card.

## Sound palette
The sound is the person's hardware. `down(t)` = `k.noise(t, {filter: 'bandpass', f: 2600, q: 1.6, dur: 0.01, gain: 0.26, a: 0.0005})` + a 230 to 150 Hz `k.tone` (dur 0.035, gain 0.08). `up(t)` = a 3100 Hz bandpass click (dur 0.008, gain 0.13), minor. `slide` = `k.noise` pink, bandpass 650 Hz, q 0.8, gain 0.09, over the drag length (mouse on its pad), minor.
- element appears: `down` on the operation's start, a `slide` over its draw-on length, `up` on release; paste = a `key` 0.03 s ahead of a dull triangle thump (340 to 190 Hz, dur 0.07, gain 0.11).
- label lands: `down` then one `k.play('key', t, {gain: 1.3})` per character, thinned to at most 10 keys a second.
- arrow completes: the line-tool drag (down, slide, up) is the whole sound.
- drawing / writing: the slide covers the drag; for a long curve, `slide` gain 1.1 for the full length.
- scene change: 7-9 wheel notches, each `k.noise` bandpass at 1500 Hz, q 3, dur 0.012, gain 0.2, plus a 180 Hz tone (dur 0.02, gain 0.05); notch times follow the scroll speed (sparse, dense, sparse).
- wrong / right: wrong = two `down` clicks at gain 1.3, a pink 0.13 s swoosh (bandpass 700 Hz, gain 0.22), `k.play('thud', t, {f: 120, gain: 0.7})` and a falling triangle D3 to A2 (146 to 110 Hz, dur 0.4, gain 0.18). Right = the check drag, then `k.play('success', t, {f: 'C5', gain: 0.4})`. A bucket fill is `down` plus a triangle bloop 260 to 520 Hz (dur 0.12, gain 0.12).
- key number (the biggest hit): two heavy `k.play('key', t, {gain: 1.4})` 0.03 s apart, `k.play('impact', t, {f: 110, gain: 1.0})`, then a triangle chord C4 E4 G4 C5 E5 staggered 0.05 s (dur 1.3, gain 0.2).
- takeaway: triangle G4 (dur 0.25, gain 0.12), then C5 and C3 together at +0.1 s (dur 1.0, gain 0.14); an airbrush hiss under any final sparkle (bandpass 1800 Hz, q 0.7, dur 0.32, gain 0.07).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.35})` plus `k.bed(0, DURATION, {kind: 'hum', gain: 0.35})`, a tower humming in a quiet room. No music.

## Signature moves
- The flood fill that leaks into the wrong region, once.
- A rectangle drawn twice, the second a little off.
- Copy-paste pile: eight cards stacking with a keystroke each.
- The title typed big, selected, dragged to a corner and shrunk.
- Numbers retyped in a white-backed text box; a red hand-drawn circle plus "!!" on the biggest one.
- The scrollbar thumb sliding as the only camera move.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Smooth, anti-aliased lines | Bresenham and hard-threshold text; smoothing off at the upscale |
| Perfect geometry | rubber-band shapes, jittered hand paths, deliberate gaps, doubled rectangles |
| Fills appear gradually | bucket is instant; spray accumulates; fills never animate |
| No cursor | cursor is always on screen, with the right icon per tool |
| Window chrome too clean | all bevels as 1px lines, pressed tool with dithered checker, live status coordinates |
| Fifth colour, tints or shadows | stay in the 28 swatches |

## Hero frame recipe
1. Cached chrome: title bar, menus, toolbox with the brush selected, palette, status bar, 3x upscale.
2. In the canvas: a headline in Patrick Hand 44px, black, on white.
3. One subject: a hand-drawn blob outline (brush, 2px, jitter 1.0) bucket-filled in #ffff00, labelled in #000080 at 18px.
4. A black line-tool arrow (3px, two head strokes) to a second shape filled #ff8040, with a typed word.
5. A fat red X or a red ellipse around one thing.
6. Cursor (crosshair) at the end of the last stroke; scrollbar thumb at its start position.
7. Zoom screenshot to 300%: every edge must be a staircase of exact pixels, and no pixel may be semi-transparent.
