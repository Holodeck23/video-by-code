---
id: win95
name: Beige-Box Desktop
family: Retro digital
fonts: [Inter]
best_for: software, AI and tech explainers, "how a system works" told as an app, process steps as tabs and dialogs, jokes about crashes and installs, nostalgic or ironic tone
avoid_for: organic, emotional or luxury topics, long prose, anything that needs smooth motion or real photography
---

# Beige-Box Desktop

The viewer believes they are watching a mid-90s PC screen recorded off a CRT-free desktop: teal wallpaper, chunky grey windows, navy title bars, and an arrow cursor that clicks things. Every pixel is a hard square, text is bitmap, nothing blends or fades, and the explanation happens inside one pretend application. The quality that sells it is pixel discipline: one pixel size, flat colours, 2px bevels, no antialiasing anywhere.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Wallpaper | #008080 | solid teal, no texture |
| Face (all chrome) | #c0c0c0 | windows, buttons, taskbar, group boxes |
| Highlight | #ffffff | lit bevel edge, fields, paper |
| Light | #dfdfdf | second bevel line on raised edges |
| Shadow | #808080 | inner shade edge, inactive title bar, disabled text |
| Black | #000000 | outer shade edge, text, 1px icon outlines |
| Title / selection / progress | #000080 | active title bar, selected labels, progress blocks, links |
| Alarm | #ff0000 | error icons, "wrong" text (#c00000), error arrows; use rarely |
| Right | #00a000 | check icons; chart lines #008000 |
| Tooltip | #ffffe1 | 1px black border |
| Beige hardware | #c8c4b4 | icons only |

No other UI colours. Flat fills only; a dithered gradient is allowed in one place (banner panels).

## Ground and surface
All drawing happens on a **640x360 pixel buffer**, a canvas you create once, with `imageSmoothingEnabled = false`. Every coordinate is an integer. At the end the buffer is blitted to the 1920x1080 frame at exactly 3x with smoothing off (zoom 1). Sizes below are buffer pixels (multiply by 3 for screen px).
1. Fill the buffer #008080.
2. Desktop icons down the left edge at x 6, spaced 56px: a 32x32 pixel icon at x+14, a one- or two-line label centred under it (bitmap font, white). A selected icon puts a #000080 box behind its label (text width + 4, 11px tall).
3. Windows (see Mark-making), a 24px taskbar along the bottom: face fill, 1px #dfdfdf then 1px #fff along the top, a raised Start button (54x19, bold label, tiny four-pane flag icon), one raised 130-150px button per open window (the active one is pressed with a checkerboard of #fff and #c0c0c0 pixels), a sunken clock tray 76px wide at the right.
4. Nothing is cached except glyph atlases and thresholded text; the buffer is cleared and fully repainted every frame, so drawing stays a pure function of `t`.

## Mark-making
**Bevels** are two 1px rings, drawn as four rect calls per ring (top, left, bottom, right), never gradients:
| Kind | Outer TL / BR | Inner TL / BR |
|---|---|---|
| window | #dfdfdf / #000 | #fff / #808080 |
| button | #fff / #000 | #dfdfdf / #808080 |
| pressed | #000 / #fff | #808080 / #dfdfdf |
| field (sunken) | #808080 / #fff | #000 / #dfdfdf |
| thin (status panel) | #808080 / #fff | none |

**Window frame:** face fill plus `window` bevel; a 16px title bar inset 3px, solid #000080 when active and solid #808080 when not (no gradient: that came later); bold white caption starting 17px in after an optional 14px icon; right-aligned 14x12 raised buttons (close = two 2px diagonals, minimise = 6x2 bar at the bottom, maximise = 9x8 box with a 2px top). Client area inset 4px.

**Controls:**
- Button 72x22 with `button` bevel, centred 9px label. Default button gets a 1px black ring outside the bevel and a dotted focus rectangle inset 4px (every second pixel). Pressed: `pressed` bevel and the label shifted (+1, +1).
- Sunken field: white fill, `field` bevel. Group box: etched line (1px #808080 then 1px #fff) with the caption on a face-colour patch breaking the top edge, 8px in.
- Property-sheet tabs: 74px wide, 14px tall inactive, 18px active and raised 2px so it merges with the page; the page has #fff top/left and #000 / #808080 bottom/right.
- Progress bar: sunken field 16px tall; #000080 blocks 7px wide on a 9px pitch, inset 3px. Trackbar: 4px sunken groove, ticks every 10% below, a 10x17 raised thumb.
- Status bar: thin-bevelled panels 15-16px tall holding live text and a progress bar.
- Message box: 32px icon left, text right, centred default OK button. Icons are rect-built: 1px black outline, flat fill, one light row and one dark row; the error icon is a #ff0000 disc with a diagonal white X and a grey drop shadow one pixel lower right.
- Cursor: an 11x17 pixel arrow, black outline and white fill, built from row strings; an hourglass for waiting.

**Pixel sprites:** small character grids (12x12 to 18x12, 3-5 colours plus black outline) drawn with `fillRect` at scale 2 inside 34x34 sunken thumbnails, scale 6-8 for a hero sprite.

**Dithered banner:** an 8-band navy to teal ramp (#000080, #0000a8, #0040c0, #0070b0, #008080, #10a0a0) where each pixel picks the lower or upper band by comparing the fractional position to a 2x2 matrix `[[0, 0.5], [0.75, 0.25]]`.

**Dotted pixel arrow:** 2x2 dots every 4px along the path (corners allowed), drawn only to the current fraction; when complete, a 7-row triangular arrowhead of 1px pixels. Colour #000080 for flow, #ff0000 for error, #808080 for a return loop.

## Type and numbers
- **Chrome text** is a hand-built bitmap font: glyphs as `#`/`.` row strings, caps 8 rows tall, x-height 6, descenders 2, widths 3-7, 1px tracking. Bold is the same glyph struck twice, 1px apart. Render each colour into an atlas once (`H.offscreen`) and blit glyph by glyph. On screen it is 27px: decoration only (menus, status text, button captions).
- **Display text** is Inter 800 drawn on a scratch canvas, then every pixel with alpha above 120 is forced to opaque colour and the rest cleared: hard aliased edges. Cache the thresholded result per string, font and colour.
- Sizes (buffer px, screen px in brackets): headline 22 (66), story label 14-15 (42-45), key number 32-34 (96-102), counter 22 (66). Anything the viewer must read uses display text or a camera push, not the 9px bitmap.
- Text never fades or types: it is present or absent, at the frame it should appear. Lists of items pop in one by one every 0.06 s.
- Counters sit in a sunken field or a group box: `n = round(end * ease)` with `toLocaleString`, redrawn each frame; the same number repeats in the status bar sentence. A percentage that lands inverts: white text on a #000080 box.

## Diagrams: arrows, labels, charts
- Arrows are the dotted pixel arrows above; a caption in bold #000080 sits 10px above the shaft once the head appears.
- Labels are bitmap or display text on the face colour, in group-box captions or under thumbnails.
- Flow: cards (34x34, black 1px border) travel along an arrow in 12 discrete steps with a 40px sine arc, one released every 0.16 s.
- Chart: sunken white plot, dotted grey gridlines (1px dots every 3px), y labels right-aligned in bitmap, points added one at a time, joined by 2px stepped lines in #008000 with 5x5 square markers. The end value gets a tooltip (#ffffe1) and a 13px red square that blinks at 6 Hz.
- Loop or pipeline: raised buttons in a row, the active one becomes default plus pressed; dotted arrows between, and a grey return path.
- Wrong: red text, an error icon, a caption "Wrong - ..." and a red frame that blinks at 8 Hz, then stays on.
- Sliders (weights) move in six discrete steps.

## Motion
- No easing except the cursor and the camera: cursor positions interpolate with `H.ease.inOutCubic` between keyframes and are rounded to whole pixels; hold a keyframe 0.2-0.4 s before clicking.
- Click = the target button draws `pressed` for 0.1-0.15 s, then the next thing appears in the same frame. Blink with `Math.floor(t*8) % 2`.
- Stepped motion: quantise progress to the pixel grid, e.g. `Math.floor(p*12)/12`; bars grow by whole blocks, then freeze (stalled install) for a beat.
- Camera: crop the buffer with `ctx.drawImage(buf, sx, sy, 640/z, 360/z, 0, 0, W, H)`, smoothing off. Zoom z of 1 shows the whole desktop (3x); 1.5 frames the working area; 2 pushes in on the key number. Keyframe `z` and centre; round `sx`, `sy`; move 0.3-0.4 s with `inOutCubic`; pull back to 1 for each window or tab change.

## Scene changes
- **Outline zoom:** three nested 2px #c0c0c0 rectangles interpolate from the source (a taskbar button, a dialog) to the target window over 0.25 s, each lagging 0.12 of progress behind the last; the window appears when they land.
- **Tab click:** cursor travels to the next tab, presses, and the entire page swaps in one frame. Use this for every beat after the first.
- **Dialog to app:** a question dialog, OK pressed at 0.15 s, zoom from the dialog rectangle to the full app window.
- **Payoff:** a message box pops over the app in one frame; the app title bar turns #808080.
- **Hung window smear:** start a dialog 75px left and 45px below its resting spot and drag it home in 5 jerky hops, 15px right and 9px up each, firing at 0, 100, 280, 380 and 600 ms after the drag begins. Nothing is erased: every earlier position stays painted as an inactive copy, building a diagonal stair, and only the newest copy is active.

## Finishing passes (run every frame, same strength)
This style is finished by restraint:
1. Repaint the whole buffer; no previous frame is reused.
2. Nearest-neighbour blit at exactly 3x (or the camera crop at 4.5x, 6x).
3. Round all draw coordinates and crop origins to integers.
4. No grain, glow, vignette or blur. If the frame feels dead, fix timing and ornament, not post-processing.

## Sound palette
- element appears: `k.noise(t, {filter: 'bandpass', f: 1400, q: 2, dur: 0.014, gain: 0.2, a: 0.0008, minor: true})`, on every other item for pop-in lists.
- label lands / button state change: the same soft click.
- arrow completes: soft click at `f: 1100`, gain 0.18.
- click (mouse): `k.noise(t, {filter: 'bandpass', f: 2600, q: 1.6, dur: 0.012, gain: 0.32, a: 0.0005})`, `k.tone(t, {f: 240, glideTo: 150, dur: 0.04, gain: 0.1})`, release `k.noise(t + 0.09, {filter: 'bandpass', f: 3200, q: 1.6, dur: 0.008, gain: 0.16})`.
- drawing / loading: disk chatter for the length of a bar: every 0.03-0.10 s (`H.rng`), 22% a brown bandpass thunk (f 420, q 2, dur 0.03, gain 0.5), else an 8 ms tick at f 1700-2600 (q 4, gain 0.16); one tick per progress block (f 2300, gain 0.13).
- scene change (outline zoom): `k.noise(t, {color: 'pink', filter: 'bandpass', f: 600, q: 0.8, dur: d + 0.08, gain: 0.07, a: d * 0.6})`; a descending two-note chime `E5` then `B4` for a question dialog.
- wrong: `k.play('error', t, {f: 'E3', gain: 1.0})` plus `k.play('thud', t, {f: 110, gain: 0.45})`. right: a three-note chime `C5 E5 G5` (sine, gain 0.13, dur 1.1, gap 0.08, plus a triangle at double pitch, gain 0.025, dur 0.35).
- key number: `k.play('impact', t, {f: 120, gain: 0.9})`, then an arpeggio `C4 E4 G4 C5` (0.06 s apart, sawtooth gain 0.06, dur 0.9, with a second saw 0.5% sharp), plus a triangle `C3` (gain 0.28, dur 1.1). Chart points: 16 ms ticks rising from f 1500 by 45 Hz each, gain fading from 0.15.
- takeaway: chime `G4` then `C5` (gap 0.12), a quiet triangle `C4` (gain 0.08, dur 1.3) under it.
- slider notch: `k.play('tock', t, {f: 900 + 40*step, gain: 0.35, minor: true})`.
- bed or music: `k.bed('room', 0, DURATION, {gain: 0.6})`, `k.bed('hum', 0, DURATION, {gain: 0.45})`, a very low pink-noise fan (bandpass at 520 Hz, q 0.7, `gain: 0.025`, minor).

## Signature moves
- The cursor does the storytelling: it travels, hesitates, clicks, and the page changes.
- Tabs as beats: each step is a property-sheet page swapped in one frame.
- Outline-zoom rectangles open every window.
- A stalled progress bar, then a crash dialog dragged into a stair of copies.
- Counters inside status bars and group boxes, dotted pixel arrows carrying examples.
- The final point lands as a classic message box with one OK button.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Soft, blurry upscale | `imageSmoothingEnabled = false` on both canvases, integer coordinates |
| Smooth antialiased text | bitmap font for chrome, thresholded alpha for display text |
| Gradient title bars, shadows, rounded corners | solid navy, 2px bevels, square corners |
| Fades and eased slides | pop in one frame; only cursor and camera ease |
| Wrong grey shades | #c0c0c0 face, #dfdfdf, #808080, #000 and #fff only |
| Text too small to read | display type at 14+ buffer px, camera at 1.5x or 2x |

## Hero frame recipe
1. Buffer filled #008080; three desktop icons down the left, one selected.
2. A large window (628x328 at 4,4): navy active title bar with caption, close/maximise/minimise buttons, a three-tab row with the first active.
3. Inside the page: two group boxes with captions, thumbnail sprites in sunken fields on the left, a hero sprite at scale 6 on the right, a dotted #000080 arrow between them with a bold caption.
4. A sunken counter field with a 22px number and a bitmap caption under it; a status bar with text and 14 progress blocks.
5. Raised taskbar with Start, one pressed task button, and a clock; an arrow cursor over the tab.
6. Blit at 3x with smoothing off; check that every edge is a hard square and that no pixel is a blend.
