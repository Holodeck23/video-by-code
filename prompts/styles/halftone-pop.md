---
id: halftone-pop
name: Pop Comic Panel
family: Print
fonts: [Bangers]
best_for: loops with a guess-check-fix rhythm, big surprising numbers, "how does it actually work" explainers, anything told as a sequence of dramatic beats, playful or punchy tone
avoid_for: quiet or sombre subjects, dense tables, small-print detail, luxury tone, anything that needs soft gradients or realism
---

# Pop Comic Panel

The viewer believes they are reading a vintage comic printed on cheap newsprint with a four-colour press: fat black brush outlines, flat primary fills and mechanical dot screens. A camera reads the strip one boxed panel at a time. Every colour is a flat plate that sits slightly off the black line plate, and every shade is a field of dots, never a gradient.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #fbf6ea | warm white; everything is drawn on it, never pure white |
| Key ink | #141210 | all outlines, lettering, hard shadows, tick marks |
| Dot ink A | #1f5fbf | blue screens: backgrounds, eye shadow, cool fills |
| Dot ink B | #e2231a | red screens: skin tones, warm fields, the WRONG burst fill |
| Flat fill | #ffd51f | caption boxes, fat arrows, hero object, sunburst rays |
| Water tint | #5fa3ef | one-off light blue for a single drop or tear; never a screen |
| Paper age | multiplier, see Finishing | not a drawn colour |

Four inks plus paper. Colour meaning is fixed: blue is calm or neutral, red is heat or error, yellow is "look here". Never mix a fifth hue and never use a gradient.

## Ground and surface
The paper is flat; the page is built from panels on a strip.
1. A panel is 1800x990 with a 66px gutter. Lay panels left to right in world space at pitch 1866px. Only panels intersecting the camera window are drawn.
2. Each panel starts with a flat base (paper, or yellow for loud panels) plus one dot field over it (see Ben-Day dots). Alternate panels between paper+blue and yellow+red so neighbours contrast.
3. Panel border: 14px key line, a rectangle stroked after the clip is released so nothing spills past it. On the opening panel it draws itself on in 0.4 s with `setLineDash([perimeter*u, perimeter])`.
4. Draw every scene twice into two transparent layers of the same size: a colour layer (fills and dots only) and a key layer (every black line, black shape and black letter). They are combined only at the end (see Finishing). A shape's fill goes to the colour layer and its outline to the key layer.
5. Static parts (the dot fields that do not animate, the paper-ageing multiplier) go in `H.offscreen`; layers that change are redrawn each frame at full size.

## Mark-making
**Ben-Day dots** `dots(layer, ink, pitch, radius, rect, seed, gain)`: a diamond lattice. Rows are `pitch*0.5` apart and every odd row shifts `pitch*0.5` sideways. Per dot: `rad = radius * gain(x,y) * (1 + (r()-0.5)*0.08)`, centre jitter +-0.3px, skip when `rad < 0.6`. Put every dot in one path and fill once. `r/pitch` of 0.30 gives about 57% ink, 0.18 about 20%.
- Fields: backgrounds pitch 26, radius 8 (blue or red); skin and large shading pitch 24, radius 5.5; shade bands on a yellow shell pitch 18, radius 5; small eye-shadow caps pitch 15, radius 5; bar shading pitch 12, radius 3.3 in black.
- `gain` makes tone without gradients. Directional: `0.72 + 0.32*H.smoothstep(300, 1800, x + y*0.4)`. Spotlight: `1 - H.smoothstep(75, 1050, dist(x,y,focus))`, so the screen swells toward the focus and thins away from it.
- Wave-on: `gain *= H.clamp((u*2850 - x - y*0.5)/240, 0, 1)` makes the field pop on as a diagonal sweep over 0.7 s; the same idea with `(u*1050 - (y + 495))/105` washes a field down a face top to bottom in 0.5 s. Dots grow from nothing; they never fade.
- A face or sky is a clip path filled with paper, then dotted. Highlights are paper-coloured holes left in the field, never white paint.

**Brush outlines** (key layer): round caps and joins, two passes per contour.
1. Main stroke 19px.
2. The same path translated (+7, +6) at 15px. The pair reads as one fat, slightly uneven brush line. Inner contours use 14px and 9px with the second pass at (-6, +4).
3. Tapered strokes (brows, lashes, flicks) are filled shapes: out along a quadratic with a bulge, back along a second quadratic whose control sits 33px further, so the middle is fat and the tips are 9px.

**Black shapes**: hard reflection or shadow areas are solid key fills clipped inside the form (a vertical sliver down one side, a lens across the top). No hatching, no tone, just black. Add paper-coloured specks (ellipse 14x10px, tilted -0.5 rad) on dark areas for gloss. Rivets and joints: solid dots 10px.

**Devices**
- Caption box: yellow fill, 9px key border, top-left, slides in from the left by one box width with `H.ease.outBack` in 0.25 s. Text Bangers 45px, letter-spacing 2px.
- Speech balloon: paper ellipse, 12px outline, a tail drawn as a thin triangle from the ellipse edge to the speaker (base +-0.22 rad). Fill the ellipse and tail together before stroking so no line crosses the join. It scales from its centre with `outBack` over 0.25 s.
- Explosion burst: 14 points, 28 vertices alternating outer radius `R*r.range(0.92,1.12)` and inner `R*r.range(0.6,0.72)` from a fixed seed, miter joins, 12px outline. Fill paper (neutral news), yellow (good news) or red (bad news).
- Fat arrow: a quadratic centreline, 24 samples, half-width tapering from 0.6w to 1.0w with `w = 51px`, then a triangular head of half-width 1.1w. Yellow fill, 9px key outline, drawn on by progress (shaft ends at 86% of the curve, the head makes up the rest). One label is lettered next to every arrow.
- Speed lines: 3 to 4 horizontal 4.5px key lines of random length (50-100% of 180px) trailing anything that flies in.
- Emanata: 5 short radial ticks (8px wide, 80-100px long) around a shocked subject; they pulse length x1.12 on a 6 fps clock.
- Drop shadows do not exist. Depth is overlap only.

## Type and numbers
- Font: Bangers 400 only, key ink, `letterSpacing` 2-3px.
- Balloon headline 126px (never below 99px); second line 138px; caption and tags 45px (never below 42px); burst caption 54px.
- Key number: 225px inside a red or yellow burst; supporting number 102px in a paper burst.
- Lettering over busy dots gets a knockout halo first: stroke the text in paper colour at 15-18px (round joins) on BOTH layers, then fill the black on the key layer. The dots break around every glyph.
- Words slam in: scale starts at 1.3 and settles to 1.0 over 0.16 s with `H.ease.outQuad`; one word or phrase per beat, 0.25-0.3 s apart. Tilt a line by -0.1 to +0.25 rad when it is an exclamation.
- Counters: counts over 100 follow `value = target * u^2.3` with thousands separators, 2.4 s long; percentages and small numbers ease in-out over 1.4 s. On landing the number pops to 1.25 and settles in 0.2 s while its burst flashes to red and swells x1.12.
- Whole-frame effects letter themselves: a sound word in a burst ("WHIRR!", "WOW!") that alternates scale 1 and 1.08 on a 12 fps clock.

## Diagrams: arrows, labels, charts
- Flow is always fat yellow arrows with a single capitalised verb beside them (GUESS, CHECK, ADJUST). A loop is two arrows that meet; a travelling black dot (r 13px) runs the loop on a 0.6 s period.
- Labels are caption boxes (rectangular, top-left of the panel) for narration, balloons for speech and thought, and a plain key-ink tag with a paper halo for names on objects.
- Photo or card props: paper rectangle 6px key border, a yellow strip along the bottom third for the caption, a blue dot cap on top.
- Chart: a paper board with 10px border, L-shaped axes at 7px, bars alternating yellow and red, each with the right 36% shaded by black dots (pitch 12) and a 7px outline. Bars spring up with `outBack`, staggered by 1/8 of the move. The headline value sits in a burst above, and on the final bar a yellow sunburst of 16 thin rays rotates at 0.4 rad/s behind the board.
- Wrong: a red burst with the word WRONG! tilted -0.1 rad, shaking by `sin(t*90)*9` px for 0.45 s, plus a black X of 21px strokes that grows from 0 in 0.2 s. Right: a blue disc with a paper tick (19px stroke).

## Motion
- Everything uses overshoot: `H.ease.outBack` for entrances (0.25 s), `H.ease.outQuad` for the settle. Nothing glides in linearly.
- Dots grow in waves; shapes scale from their own centre; panels never fade.
- The camera moves only between panels: 0.8 s `H.ease.inOutCubic` along x, with a pull-back dip `z = 1 - 0.2*sin(pi*u)` so the gutters show mid-move. Once landed, hold and let the panel perform.
- Held frames stay alive on twos (6 fps) rather than smoothly: question marks hop 9px, emanata throb, a mouth chews on `abs(sin(t*9))`. Add a 2% push-in over the last 3 s of a held beat, centred on the subject.
- Pace: a beat every 0.3 s inside a panel, a new panel every 3-5 s.

## Scene changes
The change is the camera crossing the gutter to the next panel. Start the move 0.4 s before the new panel's first element appears; the new panel's border is already drawn, its dots wave on after the camera lands.
- Opening: the border draws on, then dots, then the subject springs up from below the frame (720px low, rotated 0.25 rad extra, settling with `outBack` in 0.5 s).
- Stay in one panel when the next beat extends the same picture (add a burst or arrow). Use a new panel only for a new idea.

## Finishing passes (run every frame, same strength)
1. Plate misregistration: paste the colour layer onto a paper-filled canvas at (+4, -2) px, then draw the key layer on top with `globalCompositeOperation = 'multiply'` at (0,0). The yellow and dots sit visibly off the black lines.
2. Paper age: a cached multiplier canvas via `H.offscreen`: from a 160x90 field sampled as `n.fbm2(x*0.055, y*0.055, 3)` (with `n = H.noise(41)`), stretched to full size, `age = 1 - 0.06*(1 - H.smoothstep(0, 240, edgeDistance)) - 0.025*n`; channels R `age`, G `age-0.01`, B `age-0.045`, each multiplied by `1 + (r()-0.5)*0.05` (blue 0.06) per pixel from `H.rng(5)`. Draw it with `multiply` after step 1. It is static, so the paper does not shimmer.
3. Hold the grain static: no `H.grain`. The print looks printed because only the picture moves.
4. Optional `H.vignette(ctx, {strength: 0.12, color: '#6b4a20', inner: 0.7})` to warm the corners for a nostalgic read.

## Sound palette
Make it a comic read aloud: every letter slams, every arrow zips.
- element appears (lettering lands, "punch"): `k.tone(t, {f: 210, glideTo: 70, dur: 0.14, gain: 0.42})` plus `k.noise(t, {filter: 'bandpass', q: 0.9, f: 1150, dur: 0.06, gain: 0.34, a: 0.001})` and a 15 ms highpass tick (f 2600, gain 0.14).
- label lands (caption box): `k.play('slap', t, {gain: 0.3})`; balloon inflating: `k.play('pop', t, {f: 330, gain: 0.6})` at the point where its scale crosses 1.
- arrow completes: `k.noise(t, {dur: drawLen, color: 'pink', filter: 'bandpass', f: 900, q: 1.1, gain: 0.22, a: drawLen*0.55})`, a zip as long as the draw.
- drawing / writing: no pen sounds; ink does not scratch here. Photos or cards flying in each get a 0.16 s zip at gain 0.13.
- scene change (camera move): `k.noise(tBeat - 0.4, {color: 'brown', filter: 'lowpass', f: 450, a: 0.38, dur: 0.85, gain: 0.2})`, a soft slide over the page.
- wrong: BAM (below) at gain 1.15, `k.play('buzz', t + 0.13, {dur: 0.3, gain: 0.8, f: 92})`, then bandpass rattles (f 700, 0.04 s, gain 0.16) every 0.07 s for the 0.45 s shake. right: `k.play('success', t, {f: 'C5', gain: 0.5})` as the tick lands.
- key number (the biggest hit): counter clicks (`k.noise` bandpass f 2300, q 1.6, 0.02 s, gain 0.26, `minor: true`) at 5-11 per second, accelerating with the count; on landing BAM at gain 1.4, `k.play('impact', t, {gain: 1})` and `k.tone(t, {f: 75, glideTo: 38, dur: 0.7, gain: 0.5})`.
- BAM (burst opens): `k.play('thud', t, {gain: 0.9, f: 120})`, `k.noise(t, {color: 'pink', filter: 'lowpass', f: 1400, dur: 0.42, gain: 0.34, a: 0.002})`, `k.noise(t, {filter: 'bandpass', q: 0.8, f: 1400, dur: 0.05, gain: 0.3, a: 0.001})`.
- takeaway: four `k.play('ding', ...)` notes C5, E5, G5, C6 stacked 0.07 s apart, gain starting at 0.38 and dropping 0.05 per note, as an ascending chime under the last word.
- bed: `k.bed(0, DURATION, {kind: 'room', gain: 0.18})`. Pan every sound to its panel-local x (-0.6 to 0.6).

## Signature moves
- Dots swell onto a blank panel as a diagonal wave.
- Lettering slams in at 130% and shrinks to fit, one phrase per beat.
- A burst carries the big number, then flashes red and throbs when it lands.
- WRONG! shakes in a red burst, then a fat yellow arrow loops back for the fix.
- The camera pulls back to show the gutter, crosses it, and pushes in on the next panel.
- The colour plate sits 4px off the black linework the whole time.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Dots on a square grid, or blurry | diamond lattice, one path per field, radius jitter 4%, never smoothed |
| Gradients or soft shadows | tone is dot radius only; depth is overlap and hard black shapes |
| Outline too thin or too clean | 19px main pass plus the offset 15px second pass; tapered fills for brows and flicks |
| Colour perfectly inside the lines | keep the (+4, -2) plate offset in every frame |
| Pure white and pure black look digital | use #fbf6ea and #141210 plus the paper-age multiplier |
| Text is tidy and static | halo knockout, slam from 130%, tilt exclamations |
| Camera drifts constantly | camera moves only between panels, with the dip; otherwise hold |
| More than four inks | blue, red, yellow and black only, with fixed meanings |

## Hero frame recipe
1. Paper-age multiplier and a paper-filled base; clip to one 1800x990 panel inset 45px from the frame edge.
2. Colour layer: blue dots (pitch 26, radius 8, directional gain, a bit denser toward the right), then the main subject in flat yellow with a red dot band down its lit-away side (pitch 18, radius 5) and a paper face region dotted red (pitch 24, radius 5.5).
3. Key layer: the doubled 19px and 15px outline around the subject, a hard black reflection sliver inside the shell, rivets, brows as tapered fills, two paper specks on dark areas.
4. Yellow caption box top-left (45px Bangers) and a speech balloon left of the subject with two lines of 126px lettering, each with a 16px paper halo.
5. A 14-point burst or a single water-tint drop (#5fa3ef) as the one surprise, with emanata around the subject.
6. Composite: colour layer at (+4, -2) on paper, key layer multiplied, paper-age multiplier on top.
7. Zoom 1.02 about the subject. Check at thumbnail size: the dots should read as a flat tint and the black line should dominate.
