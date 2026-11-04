---
id: manga-panel
name: Inked Comic Page
family: Illustration
fonts: [Archivo Black, Patrick Hand, Dela Gothic One]
best_for: stories with cause and effect, shocks and reveals, tension, "what happens when" explainers, tech and gaming audiences
avoid_for: calm reflective topics, long data tables, soft or luxury brands, anything that needs colour coding
---

# Inked Comic Page

The viewer is flipping through a black-and-white manga printed on cheap cream paper. Every panel is inked with tapered brush lines and shaded only with printed screentone dots, never a smooth grey. The quality that sells it is impact: panels slam in on twos (12 drawings a second), focus lines boil, and sound-effect lettering shakes.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #fbfaf6 | warm off-white, multiplied with a paper texture |
| Primary ink | #000000 | all lines, solid shadows, text |
| Screentone dots | #111111 | all grey is dots of this ink |
| Accent | #ffffff | knock-out white: borders round SFX, inner stroke of marks, the white disc that clears focus lines; the key number gets the only full focus-line burst |
| Alarm / wrong | #000000 | a giant solid X with a white inner stroke; never red |
| Layout pencil | #6eaad7 | unlinked panels only (non-photo blue), alpha 0.4 to 0.75 |
| Desk (behind pages) | #d9d6cf | visible only during page turns |
| Page back | #d8d4ca / #f6f3ec / #e4e0d6 | curl gradient |

No colour at all. If a second ink is needed, use dot density, not hue.

## Ground and surface
- Page: fill #fbfaf6, panels are quadrilaterals with 36px outer margin and 24px gutters. Gutters are slanted: shift a panel edge 40 to 80px across the full page height, or 55px across a half-height row. Make at least half the panels non-rectangular; row heights unequal (for example 40% / 60%).
- Panel frame: 5px black stroke, rounded joins.
- Screentone is built in two steps. (1) Per panel, paint a density map on an offscreen canvas (`H.offscreen`): black = no dots, white = full ink; use radial gradients (dark around a bright subject), linear gradients (backdrop sweep) and flat fills (desks, shadows). (2) Place dots on a 45 degree lattice, pitch 8.1px: `x = (i + j) * pitch * 0.7071`, `y = (j - i) * pitch * 0.7071`. Sample the map at each dot, skip density < 0.03, set radius `min(0.72 * pitch, pitch * sqrt(density / pi))` so ink area equals density. Build the dot list once, then each frame fill it clipped to the panel polygon in #111111 as one path.
- Flat tones (0.12 to 0.45) are a cached 16 x 16-cell tile used as a canvas pattern; jitter each dot radius x0.86 to 1.1 and its position +/-0.45px so it looks printed.
- Gradation tone: density lerps from `d0` to `d1` along one axis and falls to 0 across a second axis; radius jitter x0.88 to 1.08. Cache per size and values.
- Dots never move with the camera; they scale only during a panel slam.
- Unlinked panels (not yet landed): the same quadrilateral in pencil blue (1.8px): two overshooting passes (overshoot 12 to 21px, offset +/-3px), two or three loose gesture ovals, two perspective diagonals, an empty balloon oval and a few hatch strokes. Draw it with `H.rng` seeded from the panel so it is stable.

## Mark-making
**Brush stroke `brush(pts, w, profile)`**: offset the polyline left and right by `w * profile(u) / 2 + 0.4px` and fill the polygon. Default profile `sin(pi*u)^0.55` (tapered both ends); flicks use `1 - u`; lashes and hair use `0.45 + 0.55*sin(pi*u)`. Weights 3 to 15px.

**Closed ink loop `inkLoop(pts, w)`**: for each point compute the outward normal and `lit = clamp(nx*0.55 + ny*0.83, -1, 1)`. Outer offset `w * (0.62 + 0.38*lit) / 2 + 0.45`, inner offset 0.85 of that; jitter each point +/-1.2px with a rng reseeded at 8 fps (the line "boils"). Fill outer ring minus inner ring with `evenodd`. The line is thick on the lower-right (shadow side) and thin on the upper-left. Weights: body outline 12px, features 6 to 9px.

**Solid shadow**: fill the silhouette white, clip to it, then fill the same shape black shifted 10px down; the white rim left on top is the rim light. Hard drop shadows for UI shapes: a black copy offset 9px right and 12px down under a white shell.

**Hatching**: tapered strokes 5px wide, 8 to 20px pitch, along the form on the shadow side.

**Focus lines**: 160 to 230 slivers. Each: random angle, inner radius `r0 * (1 to 1.6)`, outer `r1`, base width 0.6 to 6.5px (15% double width), a thin triangle. Fill black as one path. Reseed from `floor(t*8)` so they flicker. Always paint a white disc over the middle first (radius about 1.05 of `r0`) so the subject stays clean. Variants: speed lines (tapered parallel slivers 120 to 390px long, 1 to 4px wide) and shock lines (vertical slivers 60 to 156px long from the top edge, width 2.7 to 5.4px).

**SFX lettering**: render each sound word three times at the same spot: black stroke at `lineWidth = 2 * (outline + 3)`, white stroke at `2 * outline`, then the black fill. `outline` 11 to 15px. Font Dela Gothic One (katakana) at 105 to 140px, skewed -0.2 to -0.25 (`ctx.transform(1, 0, skew, 1, 0, 0)`), each glyph rotated -0.2 to +0.15 rad and stepped diagonally (down 138px per letter for a rumble). For Latin sound words use Archivo Black. Tremble: offset +/-3.3px by `sin(t*50)`, `cos(t*47)`.

**Face of a mascot (optional)**: three primitives. Happy = two brush arcs for eyes and a half-moon mouth; shock = two white ovals (33 x 39px) with tiny pupils and a small round mouth; think = two solid ovals plus a flat dash. A white glare polygon on the screen/eye adds shine.

**Marks**: a giant X or check is two strokes drawn twice: black 51px under white 24px. Vibration marks are three concentric arcs (21px apart, 4.5px line). A sweat drop is a white teardrop with a black outline and a small black ellipse.

## Type and numbers
- Balloons and narration boxes: Patrick Hand, all caps, 45px minimum (hero question 69px), black on white, line height 1.07.
- Impact words ("!?", a number): Archivo Black with a white 13px stroke under the black fill. Key number 180px; counter 108px; its caption 45px.
- Balloon: 60-point ellipse with a three-lobed radius wobble (3%), a curved tail triangle, 4px black stroke. Narration box: sharp rectangle, 4px stroke, same text.
- Everything pops: scale 1.6 to 1 over 0.17 s with `(1-k)^2`.
- Numbers count in a caption box and redraw on the 12 fps grid. Large counts use `10^(6u)` eased with `H.ease.inOutCubic`; percentages use `start + range * (1 - (1-u)^2.3)`. The final value gets a 1.3x pop over 0.25 s and a burst of focus lines behind its box.

## Diagrams: arrows, labels, charts
- Arrow: an outlined white shape. Width 27 to 39px, outline 6px black, head width 2.4x the shaft, length 1.6x; follows a bezier and grows by progress.
- Labels: square narration tags (white, 4px outline) in the panel's corner, ALL CAPS, 42px minimum. Cause and effect is stated with a sound word beside it.
- Cards and pictures: white card, 4.5px outline, 3px inner picture frame filled with tone 0.12; label tag with a notched end.
- Chart: black axes 7px with a 30px overshoot, a brush curve 13px with a 0.35 tone fill under it, a gradation tone in the empty sky fading toward the axis, 46 rising speed hatches (90 to 300px long) crossing it. Value goes in a hard-shadow box (outline 7px, offset 13px, wobbly edges +/-2px, a hairline rule under the heading).
- Unclear step order: number the panels or use one outlined arrow between them; never rely on position alone.

## Motion
- Quantise time: `tq = floor(t*12)/12` for every animated value. Line boil at 8 fps (`floor(t*8)`).
- Panel slam, 0.34 s from the panel's landing time: scale `1 + 0.14*(1-k)^2` and shake `10px*(1-k)^2` along `sin(tq*90)`, `cos(tq*77)`, all around the panel centre.
- Panels land in reading order every 0.7 to 1.2 s; the content of a panel pops 0.1 to 0.3 s after its frame.
- Gesture of a hit: the next panel gets focus lines, a hard cut to a close-up and an SFX word within 0.17 s.
- Idle: boil, SFX tremble, and a 12 fps blink of any cursor.

## Scene changes
- Within a page: slam the next panel; its pencil rough was already on the page.
- Between pages: page turn, 0.5 s. Render both pages to offscreen canvases. Page A is clipped to `x < fx` with `fx = 1920 * (1 - H.ease.inOutCubic(p))`; a curl strip of width `min(fx, (1920 - fx) * 0.5)` is mirrored at the fold with a gradient (#d8d4ca, #f6f3ec at 50%, #e4e0d6); a 60px shadow gradient (alpha 0.35 to 0) falls on page B right of the fold. The desk colour #d9d6cf shows behind.
- Stay inside one page for one idea; turn only when the story changes place or time.

## Finishing passes (run every frame, same strength)
1. `multiply` a cached paper layer: 9px cells of low-frequency `H.noise` brightness 246 to 255 with a slight warm cast (+4, +2, -3), blurred 4px; 1400 fibres (6 to 24px, alpha 0.06 to 0.16, half dark #78625f, half white); 160 ink specks (r 0.4 to 1.4px, alpha 0.35). Or `H.paperTexture(1920, 1080, { seed: 32, tone: '#fbfaf6', fiber: 0.5, grain: 0.4, blotch: 0.2 })`.
2. `H.grain(ctx, t, { strength: 0.035, cell: 2, seed: 9, fps: 8 })`.
3. No vignette, no glow, no colour grading: this is print.

## Sound palette
Each SFX word is also a sound. Everything lands on the next 12 fps frame after its time.
- element appears (panel slam): `k.play('slap', t, { gain: 0.45 })` plus `k.play('thud', t, { f: 120, gain: 0.4 })`; balloons and captions `k.play('pop', t, { f: 280, gain: 0.5 })`.
- label lands: `k.play('pop', t, { f: 340, gain: 0.35 })`, in `k.minor`.
- arrow completes: pink noise swell, `k.noise(t,{color:'pink',filter:'bandpass',f:900,q:0.8,dur:0.25,gain:0.16,a:0.08})`.
- drawing / writing: not used; the page does not scribble. Counters use ticks instead (below).
- scene change (page turn): `k.play('paper', t, { dur: 0.18, gain: 0.45 })`, a pink bandpass swish from t+0.08 (dur 0.36, gain 0.3, a 0.16), `k.play('paper', t + 0.42, { dur: 0.1, gain: 0.3 })`.
- wrong / right: wrong = `k.play('impact', t, { gain: 0.95 })` then `k.play('buzz', t + 0.2, { f: 98, dur: 0.55, gain: 1 })`. Right = a two-note chime: `E5` then `C5` 0.2 s later, triangle tones, dur 0.5 and 0.9, gain 0.22, each doubled one octave up at gain 0.04.
- sound words: rumble (one hit per glyph, 0.12 s apart): `k.tone(t,{f:90,glideTo:48,dur:0.3,gain:0.26})` plus `k.noise(t,{color:'brown',filter:'lowpass',f:380,dur:0.22,gain:0.28})`; ratchet = `k.play('click', t, { f: 1000 or 1160, gain: 0.7 })` per frame; surge = bandpass noise swell plus a rising triangle tone over the draw time.
- key number: `k.play('impact', t, { gain: 1.25 })` plus `k.play('stamp', t, { gain: 0.5 })`. Counter ticks before it: `k.noise(t,{filter:'bandpass',f:2000,q:1.4,dur:0.03,gain:0.3})` per redraw, thinning at both ends.
- takeaway: rising arpeggio G4, C5, E5, G5, 0.07 s apart, triangle, gain 0.13.
- bed: `k.bed(0, DURATION, { kind: 'room', gain: 0.3 })`.

## Signature moves
- Panel slams in with a zoom-and-shake, after showing its blue pencil layout.
- A reveal cuts to an extreme close-up on one feature, with shock lines from the top.
- The key number lands in a hard-shadow box with a white-cleared focus-line burst.
- Sound words are lettered with a white knock-out border and tremble.
- Page turn curls the whole page off to the left.
- Halftone gradients replace every shade of grey.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Smooth grey gradients | all grey = dot density; build the density map, then dots |
| Dots too fine or on an axis grid | pitch about 8px, 45 degree lattice |
| Uniform line weight | `inkLoop` with lit/shadow weight, taper brushes |
| SFX without border | black, white, black three passes |
| Focus lines over the subject | white disc first, keep the subject centre clear |
| Smooth motion | quantise to 12 fps; only boil and tremble run at higher rates |
| Lines too clean | per-point jitter reseeded at 8 fps |

## Hero frame recipe
1. Page fill #fbfaf6; three panels: wide top (36,36 to 1884,528 with a slanted lower edge), two below with a slanted gutter between them.
2. Top panel density map: radial from the subject (0 at the centre to 0.9 at the edge); dots on the lattice; 200 focus lines from the subject with a white disc cleared.
3. Subject: white fill, `inkLoop` 12px outline, shadow-side solid black, hatching.
4. SFX: three rumble glyphs at 130px, white knock-out, trembling.
5. Lower panels: a card and a balloon in Patrick Hand 45px caps; one narration box in a corner.
6. Paper multiply, `H.grain` at 8 fps.
