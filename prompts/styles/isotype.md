---
id: isotype
name: Pictorial Statistics
family: Data & information
fonts: [Space Grotesk]
best_for: quantities, growth, comparisons between groups, "how many" and "how much" stories, rankings, before/after counts, anything where a number should be seen as a crowd of identical things
avoid_for: abstract ideas with nothing to count, emotional or intimate stories, continuous curves and precise decimals, dense multi-series charts
---

# Pictorial Statistics

The viewer believes they are looking at a mid-century picture-statistics poster printed by lithography on warm paper stock: every quantity is a row of identical flat pictograms, one symbol equals a fixed amount, and leftovers are shown as a cut-off symbol. Three muted inks plus black sit on a strict grid. Things arrive as if a rubber stamp is thumped down on a sheet, in steps, never in glides.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #efe7d4 | warm cream stock, lightly mottled |
| Primary ink | #26231f | text, rules, arrows, neutral blocks, hairlines |
| Ink 1 (blue) | #294c63 | the first category (people, the "from" side) |
| Ink 2 (red) | #c2432c | the second category, errors, the number that matters most |
| Ink 3 (ochre) | #d49a33 | the central axis band, a third category, highlight band |
| Highlight band | rgba(212,154,51,0.35) | printed behind the winning row late in the sequence |

Colour = category, held for the whole video. Inks never overlap or blend; there is no transparency except the one-frame impression of a fresh stamp and a 16% ghost for the missing part of a partial symbol.

## Ground and surface
1. Paper: `H.paperTexture(W, H, {seed: 11, tone: '#efe7d4', fiber: 0.2, grain: 0.2, blotch: 0.15})`, cached. It stays under all ink.
2. Mottle, cached with `H.offscreen`: sample `H.noise(4).fbm2(x*0.004, y*0.004, 3)` on 6px cells; where `v > 0.05` write rgb(150,120,80) with alpha `(v - 0.05) * 0.06`; draw upscaled with smoothing, using `multiply`. No squares, no motion.
3. Layout is a strict grid on one long sheet. The default is a butterfly layout: a central axis column (ochre, 168px wide) holding labels such as years or categories; symbols grow outward from it, one side per series. Symbol pitch 54px, row height 99px, first row at y = 321, title block above, footer rule below. Keep every symbol on the same pitch and baseline.
4. Rows are separated by 1.5px hairlines in rgba(38,35,31,0.18) that run outward from the axis as the row starts.
5. A multi-panel story is one sheet three screens wide (1920px per panel); panels share the paper and mottle.
6. All ink goes into a separate transparent ink layer, cleared and redrawn each frame; paper and mottle stay outside it. The ink layer is worn, then printed (see Finishing).

## Mark-making
**Pictograms** are flat single-colour silhouettes, drawn as one `Path2D` fill each, no outlines, no gradients, no shading.
- Draw each on a fixed box (a figure 39x66px, a device 48x66px, a building 50x66px) with the same baseline and cap height as its neighbours. Detail is negative space: details cut by painting paper colour over the ink (eyes, a screen, a slit between legs 2px wide, a prompt line).
- A human figure: circle head 15px radius at the top, the torso and both arms as one rounded-shoulder silhouette, arms separated from the body by a thin gap, legs split by a slit. Objects follow the same economy: a body block, one signature feature, a foot.
- Draw every symbol from a function `symbol(ctx, x, y, scale, paperColour)` so the same shape is used everywhere: key, row, arrow load.
- One symbol is a fixed quantity (state it in the key). A remainder is the same symbol clipped to its fraction: clip a rectangle of `frac * width`, and clip from the OUTER end of the row so the part nearest the axis shows. For ticks and other tallies the missing part is repeated as a ghost at 16% ink.

**Stamping.** Run all appearance logic on a stepped clock `ts = floor(t*12)/12`. A symbol with start time `s`: invisible while `ts < s`; for one step (`ts < s + 1/12`) it is the impression, scaled 1.14 about its centre at 80% alpha; then it settles at scale 1, 100%. Rows stamp outward from the axis at 0.042 s per symbol, rows in sequence with a 0.05 s pause: `rowStart += ceil(max symbols in row) * 0.042 + 0.05`.

**Flat arrow** `flatArrow(ctx, p0, p1, w, progress, control)`: sample 30 points on a line or quadratic; butt-capped shaft of width `w` that stops `0.9w` before the end; separate filled triangle head with half-width `1.25w` and length `1.8w`. Progress shows only the leading part. `w` = 45px for main flow, 36px for a branch, 18px for a connector between boxes, 27px for a curved return. Never taper or outline.

**Blocks and verdict marks.** A process block is a 360x99px rectangle: active = ink with paper text, inactive = 12% ink with ink text. Verdict marks are 7px-stroke polylines with butt caps and miter joins, scaled 2.5: a tick (3 points) in blue or a cross (2 strokes) in red, stamped like any symbol.

## Type and numbers
- Font: Space Grotesk 700, caps, drawn character by character with positive tracking (`spaced`): measure each glyph, advance `width + track`.
- Opening question: 126px, tracking 12px, centred at y = 510. Then it glides (0.8 s, `H.ease.inOutCubic`, smooth time) to the top-left: 45px, tracking 4.5px, at (60, 90), and the rule under it draws to 840px.
- Sheet title in a static layout: 66px, tracking 7.5px, centred, over a 900px ink rule (3px) that draws in 0.45 s.
- Labels: 42-51px, tracking 3-6px, in ink (or the colour of the category). Key lines ("each symbol = N"): 36px regular, never story-critical text. Year or category labels in the axis: 39-45px, tracking 2px, centred.
- Key number: 144px bold, tracking 4.5px, ink; the hero percentage or count in red, 108px, right-aligned to its panel edge.
- Numbers are stamped, not animated: the displayed value is quantised to the symbol's unit (`round(n/unit)*unit`) and changes only on 12 fps steps, with thousands separators; a count rises as `target * smoothProgress`, ending on the exact value. A percentage may jump through a fixed list of rising values, one per row.
- Appearance of text: it is not typed; it appears whole on a step, with the one-step 1.14 impression. Title lines may fade in over 0.3 s, since they are the page itself, not a stamp.

## Diagrams: arrows, labels, charts
- Arrows are flat, one colour (ink; red for the return path of an error), and always meet block edges with 6px of paper between.
- Labels sit directly under or beside the symbol group, in caps, with a short key line ("each symbol = N units") under the column head.
- Charts are the butterfly layout: axis column, symbols growing outward. A comparison of categories uses two colours of symbols side by side in rows; a count to 10 uses tick-mark symbols in rows with partial ticks.
- A flow of items along an arrow: 3 small symbols (scale 0.85) travel on a loop `u = ((ts - start) * 1.6 + k/3) % 1`, drawn in category colour.
- Process steps: 3 blocks in a row joined by 18px arrows; the active block is inverted ink. Each step shows its own symbols under it.
- Wrong: a red cross stamped on the item; the next row prints the right answer; then a blue tick stamped over it. Highlight the winning row with the ochre band (35%).

## Motion
- Two clocks: the stamping clock steps at 12 fps (`ts`); the camera and glides use smooth time `t`.
- Entrances are stamps only: no slides, no scales other than the impression frame, no bounces.
- Camera: one long sheet; pan between panels in 0.7 s with `H.ease.inOutCubic` along x (1920px per panel). Hold for 3-4 s between pans. Stamping may begin during the last 0.3 s of a pan.
- Rules and axis bands wipe on with `H.ease.outQuad` in 0.4-0.5 s, left to right or top to bottom.
- Held frames stay alive only through paper grain re-seeded at 8 fps and the ink wear; do not add camera drift.

## Scene changes
Slide the whole sheet to the next panel, never cut. Keep the paper and header continuous; replace panel content only because the sheet moved it off-screen.
- Stamp the first element of the new panel (a header block) while the sheet is still sliding; the rest follows after the landing.
- A last "takeaway" block (ink, 1800x138px, paper text at 69px, tracking 4.5px) stamps in with the 1.15 impression after the final panel's content settles.

## Finishing passes (run every frame, same strength)
1. Paper and mottle underneath (cached).
2. Ink wear on the ink layer, then print: apply a cached wear layer to the ink canvas with `destination-out`, and draw the ink canvas onto the paper. Build wear once with `H.offscreen`: (a) coarse drift on a 4px grid, `a = max(0, v*0.5 + 0.1) * 0.34 + max(0, f)*0.07 + r()*0.035` with `v = fbm2(i*0.04, j*0.04, 3)` and `f = n2(i*0.45 + 40, j*0.45)`; (b) pinholes: `W*H*0.0016` of them, radius `0.75 + r()*r()*2.1`px, alpha 0.25-0.8; (c) 140 horizontal roller streaks, 30-165px long, 1.2-2.4px tall, alpha 0.09.
3. Mottle `multiply` over the print.
4. `H.grain(ctx, t, {strength: 0.05, cell: 2, seed: 9, fps: 8, mono: true, blend: 'overlay'})`, the only element that changes in a hold.
5. No vignette, no gloss, no drop shadows.

## Sound palette
A chart sheet on a table, printed with rubber stamps. Quantise every time to the 12 fps grid: `sf(s) = ceil(s*12 - 1e-6)/12`.
- element appears (a symbol): `k.noise(sf(t), {filter: 'bandpass', q: 0.9, f: 950, dur: 0.04, gain: 0.3, a: 0.002, minor: true})` plus `k.tone(sf(t), {f: 150, glideTo: 70, dur: 0.08, gain: 0.22, minor: true})`; vary gain +-25% symbol to symbol, pan to the symbol's screen x (-0.6 to 0.6).
- label lands (a stamped block): `k.play('stamp', sf(t), {gain: 0.55})`; a small label gets a symbol pat at gain 0.6.
- arrow completes: `k.noise(sf(t0), {filter: 'bandpass', q: 1.4, f: 330, color: 'brown', dur: t1 - t0, gain: 0.25, a: 0.04, minor: true})`, a soft brayer pass as long as the draw.
- drawing / writing: none; a numeral advance is `k.noise(t, {filter: 'bandpass', f: 2100, q: 1.8, dur: 0.022, gain: 0.26, minor: true})` plus a triangle `k.tone(t, {type: 'triangle', f: 410, gain: 0.06, dur: 0.03, minor: true})`, once per displayed change.
- scene change (sheet slides): `k.noise(t0, {color: 'brown', filter: 'bandpass', f: 300, q: 0.6, dur: panDur + 0.1, gain: 0.22, a: panDur * 0.45})`.
- wrong: `k.play('stamp', sf(t), {gain: 0.72})` on the cross, then `k.tone(sf(t), {type: 'triangle', f: 'D3', gain: 0.22, dur: 0.26})` and `k.tone(sf(t) + 0.15, {type: 'triangle', f: 'A2', gain: 0.2, dur: 0.18})`. right: stamp plus `k.play('success', sf(t), {f: 'E5', gain: 0.45})`.
- key number (biggest hit): `k.play('stamp', sf(t), {gain: 0.55})`, `k.play('impact', sf(t), {gain: 0.6})`, `k.play('ding', sf(t) + 0.02, {f: 'C5', gain: 0.45})`; a `k.play('roller', sf(t2), {gain: 0.35, dur: 0.3, minor: true})` as the highlight band prints.
- takeaway: the full-width block is `k.play('stamp', sf(t), {gain: 0.66})` with `k.play('press', sf(t) + 0.08, {gain: 0.3})`, then three `ding` notes F4, C5, A5, 0.08 s apart, gain 0.38 dropping 0.06 each.
- bed: `k.bed(0, DURATION, {kind: 'room', gain: 0.4})`.

## Signature moves
- A row of identical symbols stamps out from the centre axis, two per step.
- A cut-off last symbol shows the remainder; a ghost tick shows what is missing.
- The title glides from huge and centred into a small caption in the corner.
- The numeral is re-stamped in chunks of the symbol's unit rather than counting smoothly.
- The sheet slides sideways between panels; the paper never changes.
- A single inverted ink block marks the active step.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Symbols with outlines or shading | flat fills only; detail is negative space in paper colour |
| A partial symbol scaled down | clip it at the fraction, from the outer end |
| More than three inks or blended colours | blue, red, ochre plus black, one colour per category |
| Symbols bounce, scale or fade in | stamp on 12 fps steps, with the one-step 1.14 impression |
| Perfectly clean flat colour | wear layer (pinholes, drift, streaks), mottle and 8 fps grain |
| Irregular spacing | one pitch (54px), one row height (99px), same baseline |
| Numbers counting smoothly | quantise to the symbol unit, update on steps |
| Headline too small once placed | opening question 126px, corner caption 45px, key lines never story-critical |

## Hero frame recipe
1. Paper texture and mottle; empty ink layer.
2. Title 66px, tracking 7.5px, centred at y = 130, with a 3px ink rule 900px wide beneath it and a 36px subtitle line.
3. Column heads: a blue symbol at 0.62 scale left of the axis with its caption ("each symbol = N") and a red symbol right of it, 36px key lines.
4. Ochre axis band 168px wide, six rows tall, with row labels centred in 42px bold.
5. Rows: blue symbols growing left (counts rising slowly from about 4.5 to 10.5) and red symbols growing right (from 0.25, accelerating past the left side to about 13.5), every last symbol clipped to its fraction; hairlines between rows.
6. Footer rule in ink 3px, a footnote at 33px and a source tag at the right.
7. Print through the wear layer, mottle on top, then grain at 0.05. Compare against a real print: flat colour must have tiny pinholes and uneven density, and nothing may have an outline.
