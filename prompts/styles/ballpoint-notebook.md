---
id: ballpoint-notebook
name: Ballpoint Doodle Page
family: Hand-drawn
fonts: [Fredoka, Gloria Hallelujah]
best_for: friendly explainers that feel like a student's margin notes, how-it-works stories with several small diagrams, humour, personal and informal tone, shading-heavy subjects (volumes, shadows, depth)
avoid_for: luxury or corporate tone, precise data, anything needing more than two ink colours, very long text
---

# Ballpoint Doodle Page

The viewer believes someone is doodling in blue ballpoint on one long sheet of college-ruled paper, with a real pen tip visible in the frame. The pen is cheap: lines swell and fade with pressure, blobs of ink gather where it lands, a stroke occasionally skips. Darks are never filled, they are built from many crossed hatching layers; letters are hollow bubbles with a hatched shadow. The one quality that sells it is pressure-varied line plus layered crosshatch.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #fbfaf5 | with a faint tooth, never pure white |
| Primary ink (blue ballpoint) | #1e2e96 | everything drawn; drawn with `multiply`, so overlaps darken |
| Accent / alarm (red pen) | #b21c26 | the second pen: wrong answers, rings, the key number; use rarely |
| Rule lines | #6ea0d7 | at 0.75 alpha; a second 1.2px line at 0.18 under each |
| Margin line | #e15f69 | 2.4px at 0.8 alpha plus a 1.5px 0.3 alpha companion |
| Desk (through punched holes) | #5a3e2a to #7a5638 | vertical gradient |
| Pen barrel | #ffffff to #c9c9c2 | clear plastic with an ink window in the current ink colour |
| Tooth | #786c58 | at 1.6-3.4% alpha |

Two inks only: blue and red. Never a green or yellow highlight.

## Ground and surface
1. Paper: `H.paperTexture(W, H, {seed: 12, tone: '#fbfaf5', fiber: 0.4, grain: 0.3, blotch: 0.15})`, cached.
2. Light falloff: a diagonal gradient from transparent at the top left to rgba(120,110,90,0.10) at the bottom right.
3. Rules: from y = 156 every 45px, 1.8px of #6ea0d7 at 0.75 alpha plus 1.2px below at 0.18. Vertical margin at x = 252.
4. Tooth: a tileable 512px tile drawn from 3 periodic value-noise octaves (long horizontal fibres, mid fibres, slow mottle) plus speckle, in #786c58 at 1.6-3.4% alpha, and 70 stray fibres (0.8-1.5px, alpha 0.08-0.2); tiled over the page. All cached.
5. Hole punches: three or four circles of 26px radius at x = 81, every 360px, showing the desk gradient, with a 9px inner shadow top-left (rgba(0,0,0,0.35)) and a bright rim arc (rgba(255,255,255,0.8)) on the upper-left edge.
6. For a long story, bake the page at world size (about 6000x3600) with `H.offscreen` and move a camera over it.

## Mark-making
**Ballpoint stroke** `bp(points, seed, w, a)`. Always `multiply`, round caps. Resample points to 3.75px with `H.resample`, offset with `H.wobble(pts, noise, {amp: 1.2, freq: 0.02, seed})` plus a second octave at 6x frequency and 0.3 amplitude. Draw in 2-sample segments; for segment `i` at fraction `u`:
- pressure `pr = 0.55 + 0.45 * (0.5 + 0.5*(0.75*n2(i*0.022) + 0.25*sin(0.19 i + seed)))`: a slow swell plus a quick wobble, so a long line fades and darkens along its length.
- alpha `a * pr * taper`, width `w * (0.7 + 0.42 pr)`, with `taper = min(1, 6*(1-u) + 0.35)` so the end thins out.
- 25% of strokes skip 2-3 segments somewhere in the middle (a dry ball).
- Landing blob: 70-80% of strokes get an ellipse at the start, radius `w * (1.0..1.8)`, alpha 0.9; 40% of finished strokes get a smaller one at the end.
Widths at 1920: contour 2.2-2.6px, interior detail 1.5-2px, hatch lines 1.4-1.9px, emphasis 5-8px. Draw-on uses the leading `u` fraction (`H.partial`).
**Double trace**: outlines of main shapes are drawn twice: pass 2 uses a different seed, wobble amp +0.6px, width 0.55x, alpha 0.6; small details once.
**Shapes**: rounded rectangles overshoot by 9px at the start corner and do not close; circles run 1.05 to 1.2 turns; every closed shape is made of 2-3 strokes (never one polyline).

**Crosshatch from a tone map.** Keep a hidden greyscale render of the subject (white = light, black = dark) at page size. Then lay up to six hatch layers, each at its own angle, spacing, and darkness threshold:
| layer | angle (rad) | spacing px | draws where tone is above | alpha |
|---|---|---|---|---|
| 1 | -0.85 | 7.5 | 0.16 | 0.70 |
| 2 | 0.72 | 7.2 | 0.40 | 0.70 |
| 3 | -0.12 | 6.3 | 0.58 | 0.75 |
| 4 | 1.32 | 5.7 | 0.74 | 0.80 |
| 5 | -0.50 | 4.8 | 0.84 | 0.85 |
| 6 | 0.25 | 4.2 | 0.90 | 0.90 |
Each line is spacing * (0.85-1.15) from the last; walk along it every 3.75px, sample the tone map plus `0.05 * noise`, and where the tone passes the threshold collect a run. Cut each run into chunks of 12-36 samples (overlap one sample either side), shift each chunk by +-1.2px, draw each chunk as a `bp` stroke with width 1.4-1.9px. Sweep the layer in over 0.5-0.8 s by revealing offsets in order; stagger layers 0.25-0.4 s apart. Dark areas end up with all six.
**Quick shading without a tone map**: three layers inside a closed shape: 45 degrees at 9px spacing (alpha 0.34, from the lit corner's 22% to the far corner), a -45 degree layer past 55% (6.4 -> 9.6px), and a darker near-horizontal layer in the shadow corner for shapes over 90px; strokes 33-105px long in three alpha groups (x0.75, x0.95, x1.15). Leave any inner shape or word as bare paper.
**Hatched drop shadow**: for a box or letters, build a mask of the shape shifted by (13,13) minus the shape itself, fill it with 45 degree lines (6.6px spacing, 1.9px, alpha 0.62), and sweep it in during the 0.35 s after the outline finishes.

**Pen tool**: while drawing, show the pen at the tip: tilt 0.85 rad, 420px long, a 39px cone tip, a barrel gradient, an ink window (a 5px line in the active ink colour, so it turns red with the red pen), a darker cap; blurred shadow (blur 9px, offset (27, 33), 25%). When no stroke is in progress the pen is absent.

## Type and numbers
- Headings and big numerals: Fredoka 700 bubble letters, 138px (never below 99px); each letter is an outline only: stroke text 3px at alpha 1.0, then a second pass shifted (+1.2, -0.9)px at 1.8px and alpha 0.8; letters placed one by one with jitter (dy +-4.5px, rotation +-0.05 rad, spacing +9px); the whole line tilted -0.03 rad; each letter appears 0.075 s after the last. Its shadow is the offset glyph shape minus the glyph, offset 0.08 em down-right, hatched with 5.4px spacing lines.
- Labels and notes: Gloria Hallelujah 400, 57-60px (never below 45px), ink at 0.9 alpha, tilted -0.012 rad, appearing glyph by glyph; for a small side note 42px.
- Key number: bubble numerals 165px, blue while counting and red when it lands, with a red ring around it.
- Counters are re-inked: snap to a 12 fps clock and redraw the whole numeral each tick with fresh wobble. Large counts ease in log space; percentages ease out (`1 - (1-u)^2.2`).

## Diagrams: arrows, labels, charts
- Arrow: a shaft stroke (0.15-0.45 s) then a two-stroke open head of 30-36px at +-0.5 rad.
- Label: written after its object, 18px of clear space; a tag is a five-point outline plus a word.
- Boxes: rounded rectangle 4-6px, hatched drop shadow, a small tag hanging off the corner.
- Chart: two axes with open heads, a wobbly line (small dips in early points fade as the value settles), area under it hatched at 6.6px spacing in three alpha groups (0.2/0.26/0.32), clipped to the area and revealed as the line is drawn; value written in bubble numerals above.
- Wrong: red pen: two slashes of 12px (0.08 s each), then a red ring of 7.5px that overshoots (1.05 turns); a blue single strike on the wrong word and the right word in bubble letters, a blue tick (12px). A red dot (20px) travels back along a red return arrow for "feedback".
- Margin doodles: a five-point star traced 4-5 times, a Necker-cube with a hatched face, two spirals, a zigzag arrow, small sparkles; each drawn in 0.3-0.45 s whenever the pen is idle on the page, never over the subject.

## Motion
- Strokes follow a sequence: stroke `k` starts `dt` after the previous (0.02-0.17 s), lasting twice `dt` so strokes overlap; hatching starts as soon as outlines finish.
- Easing: linear along each stroke; camera uses `H.ease.inOutCubic` between keyframes, zoom interpolated in log space (0.88-1.05).
- Camera: scroll along the page to the next area, then down; hold while a group is drawn; during a move, draw a connector stroke with a label ("repeat") that leads the camera.
- Idle life: grain steps 12 times per second; the pen tip hovers within 3px of the last point; margin doodles keep getting retraced.

## Scene changes
No cut. The page is one continuous sheet: the pen draws a connector arrow while the camera scrolls to the next region (0.8-1.2 s). Use a new region of the page rather than erasing; when the page is full, scroll further down.

## Finishing passes (run every frame, same strength)
1. Tooth layer (static) multiplied under the ink.
2. Light falloff gradient (static).
3. `H.grain(ctx, t, {strength: 0.022, cell: 2, fps: 12, mono: true})`.
4. `H.vignette(ctx, {strength: 0.12, color: '#3c3228', inner: 0.6})`.

## Sound palette
- element appears (stroke starts): a 16 ms bandpass tick at 2100 Hz (q 1.8, `gain: 0.34 * 0.45`) plus a 30 ms 210 Hz `k.tone` knock (gain 0.05); red pen: 1700 Hz and 170 Hz.
- drawing / writing: `k.play('pencil', t, {dur: drawLength, gain: 0.7})` plus a pink bandpass bed at 950 Hz (q 0.9, gain 0.07) for the same duration. For writing, give each word its own stroke, placed at the word's offset within the write window.
- label lands: one short stroke, gain 0.5, `minor`.
- hatching: quick flicks, a 28 ms bandpass noise at 3300-4000 Hz every 36-50 ms (gain 0.06, fading about 40% over the sweep), alternating pan +-0.06.
- arrow completes: a final 0.1 s stroke for the head.
- scene change (scroll): a long connector stroke at gain 1.6 and `k.play('swish', t, {dur: 0.8, gain: 0.2})`.
- wrong: two hard red strokes at gain 1.9 then `k.play('error', t, {f: 'F3', gain: 0.55})`; right: a blue tick and `k.play('success', t, {f: 'A5', gain: 0.6})`.
- counter: `k.play('count', ...)` per 12 fps tick with `f` 2500 rising 120 per step, then `k.play('tock', t, {f: 560, gain: 0.45})` at the end value.
- key number (biggest hit): `k.play('tick', ...)` per changed value with `f` 2500 + 25 per percent; at the end value `k.play('impact', t, {gain: 1.0})` and `k.play('ding', t + 0.01, {f: 'D6', gain: 0.42})`.
- takeaway: `k.play('success', t, {f: 'G5', gain: 0.7})` as the underline finishes.
- bed: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`; no music.

## Signature moves
- A visible ballpoint pen: the tip is the camera's leader.
- Crosshatched darks built from six layers, each at its own angle.
- Bubble letters with a hatched drop shadow, drawn letter by letter.
- A star or spiral in the margin that gets traced over again and again.
- A red pen that enters only to cross out and ring the wrong answer.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Even vector lines | pressure swell and taper, wobble, skips, landing blobs |
| Solid fills for darks | layered crosshatch only, never a fill |
| Hatch lines are mechanical | per-chunk jitter, 12-36 sample breaks, spacing varied +-15% |
| A third ink colour | blue and red only |
| Text appears whole | glyph by glyph, tilted, with jitter |
| Flat white page | tooth, rules with companion lines, light falloff, hole punches |

## Hero frame recipe
1. Cached paper, tooth, rules, margin, hole punches, light falloff.
2. Hidden tone map of one main object lit from the upper left (body gradient, one dark side, a pale highlight edge) and a few background puffs.
3. Outlines in blue (2.4px, double-traced), details once; a pen tip and barrel at the last point.
4. Six hatch layers per the table, the last two only in the deepest shadows.
5. A bubble-letter heading at the top (138px, hollow outlines, hatched shadow), a Gloria Hallelujah note at the bottom right.
6. Margin doodles left of the red line: a star traced 5 times, a Necker cube, a spiral.
7. `H.grain` 0.022, vignette 0.12. Zoom to 100%: the darks must be built of visible crossing lines, the line weight must vary along each stroke.
