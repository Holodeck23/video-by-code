---
id: newsprint
name: Broadsheet Newsprint
family: Print
fonts: [UnifrakturMaguntia, Oswald, Libre Baskerville, Playfair Display]
best_for: "how it works" reporting, history, explainers told as news, step-by-step diagrams, statistics, explanations that gain from a sober, trustworthy, slightly nostalgic voice
avoid_for: playful or very modern tones, colour-coded data, content that needs more than one spot colour, tiny mobile viewing of long text
---

# Broadsheet Newsprint

The viewer believes they are reading one physical 1950s front page and its inside science spread, held up close under a lamp: yellowed pulp, thin uneven black ink, greyed halftone dots, the other side of the page faintly showing through. A camera moves over the sheet like a reader's eye; a red grease pencil is the only colour. The quality that sells it is ink that sits in the paper rather than on top of it.

## Palette
Two inks and a paper; every grey is made from dots.
| Role | Hex | Notes |
|---|---|---|
| Ground (pulp) | #e4d6b2 | aged towards #d9c79e at the page edges |
| Primary ink | #1e1c1b | all type, rules, diagrams, halftones |
| Accent (grease pencil) | #c42622 | used by the "reader" for the one thing to notice: rings, an underline |
| Alarm / wrong | #c42622 | the same pencil; wrongness is a ring plus a struck X in black ink |
| Desk (off-page) | #26201c | dark surround when the camera leaves the sheet; falls to #0b0a09 at the corners |
| Back-side ink | #1e1c1b at 7.5% | show-through, never above 8% |

## Ground and surface
Work in page space 1920x1080 (the page is the frame at camera zoom 1.0). Two layers: INK (black on transparent) and PAPER (computed). Every noise value is hashed by page coordinates, so grain stays glued to the sheet while the camera moves.
1. Baked fields (cache with `H.offscreen`): `m` is `H.noise(9).fbm2` on a 320x180 grid at frequency 0.03, 4 octaves, for blotches; `f` is the same noise at 0.125, 3 octaves, offset +50, for fibre. Stretch them over the page.
2. Pulp colour per pixel: base #e4d6b2 reduced by `age = 0.07*(1 - clamp(edgeDistance/180)) + 0.035*m + 0.015*f` (top edge distance x1.3), applied as red x(1 - 0.7*age), green x(1 - age), blue x(1 - 1.6*age), so age yellows rather than greys. Add +-6 levels of per-pixel hash noise. In 0.25% of 2x2 blocks subtract 40 for dark flecks.
3. Optional fold: a horizontal crease at y 705 (waving +-3px): darken 7% in a Gaussian 4px wide, lighten 5% in a ridge 3px below.
4. Show-through: lay out the reverse side (a headline, a big ad block with knocked-out lettering, six greeked columns), mirror it horizontally, blur 1.8px, and darken the paper by 7.5% x its alpha (red x(1-b), green x(1-1.05b), blue x(1-1.1b)). Cached once; it never moves relative to the page.
5. Thumb smudge: a radial rgba(40,36,30,0.10), radius 69px, squashed ellipse 69x51 at the lower right.
6. Off-page desk: wherever the camera sees beyond the sheet, fill #26201c with +-3 noise and darken 50% along the page edge with falloff `exp(-distance/15px)` for a cast shadow.

## Mark-making
Everything is drawn black on the INK layer, then printed.
- Print function (the core look), per pixel: threshold `t = 0.5 + 0.35*(hash-0.5) + 0.15*f`; coverage = clamp(3*(alpha - t) + 0.5) x 0.65 + alpha x 0.35; density = 0.86 + 0.12*m + 0.12*(hash2-0.5), with 2.5% of pixels dropped to 45% (pinholes); coverage x= density; paper = lerp(paper, #1e1c1b, coverage). Edges go slightly ragged and solids a little thin, as ink soaks into pulp.
- Halftone photo: any greyscale source (soft gradients plus shapes, blurred 2px) is screened at 45 degrees: step through a rotated grid, cell 6.9px (large photo 7.8px, small thumbnails 4.2px), dot radius `0.62*cell*sqrt(max(0, 1.08*dark - 0.02))` where `dark = 1 - clamp((luma - 0.06)/0.86)`; skip dots under 0.45px. Black dots on the INK layer, 1.5px frame. A source can be animated (blinking lamps seeded by `floor(t*4)`, rotating reels); re-screen it each frame.
- Greeked body columns: grid left 72, right 1848, six columns 276px wide, 24px gutters; hairline 1px rules between. Fill each column with justified pseudo-words built from about 60 syllables with `H.rng`: 1-3 syllables (15% single), 3% numbers, 9% full stops (next word capitalised), 7% commas. Libre Baskerville 15.6px on 18.9px leading; last line of a paragraph left-aligned (8% of lines end a paragraph; 30% after a full stop); first line indented 15px. Add a bold dateline run-in on lead stories, and a centred bold subhead after about 1 in 5 paragraphs.
- Rules: 4.8px over 1.5px under the masthead, 1.5px then 3.9px under the dateline, 1.95px under decks, 1px column rules. All crisp, nothing hand-wobbled.
- Boxes: 2-3px frame; a reverse bar (solid black, title knocked out with `destination-out`, Libre Baskerville 700 22px with 3px letter-spacing, bar 51px tall).
- Smear (optional, once on the front page): six copies of the headline INK shifted (3.3, 0.6) per step, blurred 3px, darken 35% in a sine-windowed patch.

## Type and numbers
Sizes are page space; the camera usually magnifies 1.3-2.0x, so on-screen label size = page size x zoom (must stay >= 42px, headlines >= 66px, key number >= 96px).
- Masthead: UnifrakturMaguntia 135px, centred. Ears either side: 285x105px boxes, italic 20px.
- Banner headline: Oswald 700 156px, condensed by horizontal scaling to the full measure (1776px); deck under it in Libre Baskerville italic 28.5px.
- Section headline: Oswald 700 69px; script heading Playfair Display italic 60px.
- Labels and diagram words: Oswald 700 30-39px, 3px letter-spacing, caps; diagram steps numbered ("1. GUESS").
- Answer word: Playfair Display italic 114px; margin remark Libre Baskerville italic 42px.
- Key number: Oswald 700 100px (percentages 99px) in a 3px box with a 25px Oswald caption above it.
- Pull quote: Playfair Display italic 66px, set left to right: a rule draws in 0.25s, then a clip rectangle reveals the text over 0.5s, then a second rule.
- Numbers tick: counts rise as `u^2.3`, formatted with thousand separators, at no more than 11 changes per second; percentages follow `H.ease.inOutCubic` with a tiny wobble `sin(37u)*1.8*(1-u)` in the data curve.

## Diagrams: arrows, labels, charts
- Arrow: a quadratic path drawn on (0.25-0.4s, `H.ease.outCubic`), 5.25px, butt cap, hairline-crisp; a solid triangle head, tip 21px beyond the end, wings 19.5px at +-2.6 rad, drawn with the shaft.
- Label: Oswald caps placed 10px clear of the object. Where a rule crosses a label, cut a 16px halo around the lettering from the INK layer with `destination-out` before filling it (paste-up look).
- Objects: halftone pictures with a one-word Oswald caption underneath.
- Chart: dashed gridlines (1px, dash 3/6) with 17px numerals, 2px axes, a 5.25px data line with round joins and a 7.5px dot at its tip, axis title in Oswald caps, a "Source:" line in italic 15px; the key figure sits in its own 3px box.
- Wrong / right: a struck X (13.5px strokes, scale 0 to 1 with `H.ease.outBack`, 0.15s) and a margin remark; later a check with mitred joins. Red pencil ring around the wrong answer, 0.35s.
- Emphasis: red grease pencil in page space, drawn above the print: 3 passes at alpha 0.55 / 0.43 / 0.31, widths 5.4 / 4.2 / 3px, each offset by its own +-3px jitter, an ellipse run through 2.25 PI starting at -2.4 rad with 4% radius wobble `sin(0.7i + pass)`; the underline is a 4.5px curve drawn in 0.3s.

## Motion
- Camera over a static sheet: keyframes (time, page x, page y, zoom) with `H.ease.inOutCubic` between them and zoom interpolated in log space: headline at zoom 1.3-1.55, track down 0.6s to a graphic at 1.35-1.4, pull back to 0.92 before a page turn, then 1.6-2.0 on each section of the inside page, finish at 1.0.
- Hold each shot 1.5-3.5s; pencil marks and counters fire inside the hold. Slow push of 1.0 to 1.04 over 3s when nothing else moves.
- Alive between beats: lamps blink at 4 Hz, reels rotate, counters tick, pencil rings draw on.
- Opener (optional): the whole page spins out of dark, rotating `(1 - e)*-4.2*PI` and scaling 0.04 to 1 (`e = H.ease.outCubic(H.prog(t, 0, 1.45))`), over a radial #2b2622 to #0b0a09 backdrop (radius 1140), with 4 ghost copies at `t - 0.018k`, alpha 0.14, and a 60px-blur shadow offset 18px.

## Scene changes
Turn the page: 0.7s with `H.ease.inOutCubic`. Draw the destination sheet fully; draw the old sheet over it, scaled horizontally by `c = cos(PI*u)` about the left edge (spine) so it swings over; while `c > 0` darken it by `0.35*(1-c)`, once `c < 0` show its reverse as plain pulp darkened by (20,22,26). Add lift: shear `sin(PI*u)*33px*zoom`. Cast a shadow on the lower sheet: a gradient from rgba(0,0,0,0.35) to 0, width `210*(1-|c|) + 15` px beside the moving edge. Within a sheet, change topics by moving the camera, not by cutting.

## Finishing passes (run every frame, same strength)
1. Paper and show-through, then the printed INK layer (the print function above).
2. Fold crease (if used) and thumb smudge baked into the paper.
3. Grease pencil on top, in page space.
4. `H.vignette(ctx, {strength: 0.25, color: '#1a1410', inner: 0.6})` only when the camera is on-sheet at zoom below 1.1; the desk shadow covers other shots.
5. Do not add film grain: the hash noise in the paper is already the grain. At most `H.grain(ctx, t, {strength: 0.012, cell: 2, fps: 12, mono: true})`.

## Sound palette
A person reading the morning paper.
- element appears (picture or label): a 30ms bandpass tap centred near 1.1kHz, at gain 0.2 and Q about 1.3, panned toward the item's horizontal location.
- label lands: use a quieter version of that tap. Counter changes get an 18ms noise tick around 2kHz, with Q 1.5 and gain 0.18, limited to eleven changes per second.
- arrow completes / drawing: `k.play('stroke', t, {dur: drawLength, gain: 1.2, minor: true})`; for the data curve across its whole draw, gain 0.8.
- writing: `k.play('typing', t, {dur: 0.5, gain: 0.55, minor: true})` for the pull quote, as a burst of linotype.
- grease pencil: `k.play('chalk', t, {dur: 0.33, gain: 0.9})`; heavier for the key number (1.1).
- scene change (page turn): `k.play('paper', t0, {dur: 0.7, gain: 0.9})`, pink bandpass noise (f 600, q 0.7, gain 0.32, dur 0.8), then `k.play('slap', t0 + 0.66, {gain: 0.35})` as the leaf lands. Rustles between shots: `k.play('paper', t, {dur: 0.4, gain: 0.2, minor: true})`.
- wrong / right: wrong: `k.play('stamp', t, {gain: 0.85})` and `k.play('error', t + 0.14, {f: 'E3', gain: 0.65})`. Right: a knock then `k.play('success', t + 0.2, {f: 'C5', gain: 0.5})`. A knock is `k.tone(t, {f: 160, glideTo: 85, dur: 0.1, gain: 0.32})` plus a 50 ms pink bandpass at 700 Hz.
- key number (biggest hit): `k.play('impact', t, {gain: 1.1})`, a knock at gain 1.1 and a heavy grease ring.
- takeaway: four `k.play('ding', ...)` at 0.06s apart (C4, G4, C5, E5; gain 0.34 falling 0.05 each).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.24})`; no music.

## Signature moves
- Ink soaked into pulp: ragged thresholded edges, density drift and pinholes, with the reverse page ghosting through.
- Coarse 45-degree halftone pictures whose lamps and reels still animate.
- The camera reads the page: headline, graphic, a physical page turn, a diagram, a chart, a pull quote.
- A reader's red grease pencil circles the one thing that matters and underlines the takeaway.
- A single wrong answer: struck X, red ring, margin remark; then the corrected one.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Black text on a beige rectangle | print every ink pixel through the threshold, density and pinhole rule |
| Paper tint is a flat colour | age gradient towards the edges, mottling, flecks, fibre noise |
| Greeked text looks like lorem ipsum code | justified lines, indents, run-in datelines, subheads, rules between columns |
| Photos are smooth grey | 45-degree dots with dot gain, plus a 1px frame |
| Grain slides while the camera moves | hash by page coordinates, not screen coordinates |
| Many colours | one red pencil only |
| Page cuts | turn the page in 0.7s with a lifting shadow |

## Hero frame recipe
1. Pulp #e4d6b2 with age edges, mottling, a fold at y 705 and the mirrored reverse at 7.5%.
2. INK layer: the masthead at 135px, rules, dateline, banner headline at 156px stretched to 1776px, an italic deck; a three-column halftone box on the left; two greeked columns on the right with run-in datelines.
3. Print the INK layer through the threshold, density and pinhole rule.
4. Camera at (960, 300), zoom 1.3, so the headline fills the width.
5. Red grease ring around one headline word (3 passes), plus a thumb smudge lower right.
6. Check: black solids show tiny paper pinholes, halftone dots touch each other in dark areas, and the reverse page is visible in the light areas.
