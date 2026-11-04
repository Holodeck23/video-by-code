---
id: glassmorphism
name: Frosted Glass Panels
family: Dimensional
fonts: [Inter]
best_for: product and software explainers, dashboards, data flows between systems, AI and tech topics, anything that should feel modern, live and clean
avoid_for: serious or sombre subjects, print or paper moods, heavy text documents, content that must stay legible without a dark colourful backdrop
---

# Frosted Glass Panels

The viewer believes they are looking at a real interface made of thick frosted glass floating over a living, glowing colour field. Every panel truly blurs whatever is behind it, so the colour behind a card changes the card's tint as the camera or the light drifts. The single quality that sells it is the backdrop: saturated blobs that never stop moving under glass that never stops frosting them.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (base gradient) | #0c0a24 to #170f3a | diagonal, top-left to bottom-right |
| Blob magenta | #ff2bd6 | alpha 0.85-0.95, radius 330-380px |
| Blob orange | #ff7a1a | with a coral middle #ff5a4a and a pink tail #ff2b8a so it never goes muddy |
| Blob blue | #2b6bff | alpha 0.9 |
| Blob violet | #7a2bff | alpha 0.85 |
| Blob cyan / coral | #00d1ff / #ff4d6d | small fills, alpha 0.5-0.6 |
| Ink | #ffffff | headings and numbers; body at 78%, captions at 55-68% alpha |
| Number gradient end | #ffc6f0 | headline and key number run white to this |
| Accent pair | #8a5bff to #ff4fc1 | the one hero gradient: sent bubbles, pills, progress, main connector |
| Positive | #4dffa6 | gradient from #1fbf8f; success glow, chart line, ring |
| Alarm / wrong | #ff3b5c | with warm gradient #ff7a1a to #ff3b5c; used rarely |
| Info tints | #7ad7ff and #ffb35c | category dots only |

One accent gradient does the talking; green means good, red means wrong. Everything else is white at some opacity.

## Ground and surface
Two scratch canvases, created once at load and redrawn every frame (they depend on `t`, so `H.offscreen` does not fit). `BG` is the sharp background; `SRC` is its blurred twin.
1. `BG`: fill the diagonal base gradient. Draw 5-9 blobs as radial gradients (alpha `a` at 0, `a*0.55` at 0.5, 0 at the rim), use `'screen'` compositing so overlaps turn luminous. Radii 300-380px (orange 300). Each drifts by `[sin(0.5*t + i) * 30..45, sin(0.5*t + i + 2) * 20..30]` px. At the opening, bloom: radius and alpha scale `0.35 + 0.65 * H.ease.outQuad` over 0.9 s, staggered 0.12 s.
2. Pools of negative space: two radial fills of the base colour at 0.6 and 0.4 alpha (radius 780 bottom-left, 630 top-right) so the frame is never wall-to-wall colour.
3. 2-3 crisp orbs (radius 90-177px): radial gradient with the highlight offset up-left (-0.4r, -0.45r), stops light / mid / dark, for example #ffd2f4, #ff4fc1, #6a1497 and #c7f2ff, #3aa0ff, #1a2a8a. They give the blur something sharp to smear. Optionally one thick ellipse ring (22px stroke, #7af0ff to #8a5bff).
4. A 72px grid at 3.5% white. If the camera moves, scroll the grid with it and scale its spacing with zoom.
5. Dither: fill `BG` with the frost tile at 5% alpha before blurring, otherwise the gradients band.
6. `SRC`: draw `BG` into a second canvas with `ctx.filter = 'blur(39px) saturate(150%)'`.
7. Frost tile, cached: `H.offscreen('frost', 160, 160, fn)` filled per pixel from `H.rng(99)`: black or white 50/50, alpha random up to 60/255.

Blob positions use parallax: world x mapped as `W/2 + (blobX - camX) * 0.35 * zoom`, so panels arrive over different colour as the camera moves.

## Mark-making
**Glass panel** `glass(ctx, x, y, w, h, r, tint)`, radius 42px for large cards, 27px for chips. In order:
1. Shadow: fill the rounded rectangle in rgb(20,10,50) with `shadowColor` rgba(8,4,30,0.45), blur 75px, offsetY 30px.
2. Clip to the rounded rectangle and draw `SRC` over the full canvas with an identity transform (the blur must match screen position, even under camera zoom).
3. Tint: linear gradient from the top-left to (0.6w, h): white at `tint + 0.08` down to `tint * 0.5`. `tint` is 0.09 for cards, 0.12 for floating chips.
4. Frost grain: the pattern at 22% alpha.
5. Sheen: a diagonal gradient from the top-left to (0.55w, 0.55h): white 0.16 at 0, 0.04 at 0.45, then a hard step to 0 at 0.46, so a faint diagonal edge crosses the glass.
6. Border: 1.5px gradient stroke, top-left to bottom-right: white 0.65 / 0.18 (at 0.35) / 0.08 (at 0.7) / 0.32. Inset half a pixel.
7. Top highlight: a 1.5px line along the top edge, from x+r to x+w-r at y+2, horizontal gradient 0 / 0.55 (at 0.3) / 0.15 (at 0.7) / 0.
Glass over glass: after the cards are drawn, make a new blur (27px) of the composited frame as `SRC` and draw chips with it, so a chip frosts the card behind it.

**Glow connector** `glow(a, control, b, prog, c1, c2)`: quadratic Bézier sampled 40 times up to `prog`, stroke a gradient from `c1` to `c2`, width 4.5px, round caps, `shadowBlur` 21 in `c2`. End cap: a filled notched arrowhead (points at 9, -12, -7.5, -12 along the tangent, +-10px across), same colour. Travelling dots: 4 white discs of radius 5px with 15px glow, phase `((0.7 * t + i / 4) % 1) * prog`.

**Pill** (label): capsule 60px high, fill white 16%, 1.5px border white 35%; or a gradient fill with a coloured shadow (blur 24, the second colour at 40-50%). Optional 6px status dot at the left. Text Inter 600-800 42px. Enters by scale `0.85 + 0.15k` with alpha `min(1, 1.5k)`, `k` = `H.ease.outQuad` over 0.3 s.

**Components inside cards.** Tiles: radius 27px, white 10% fill, 1.5px border white 20%. Progress bar: 9px track at white 12%, fill with the accent gradient, width scaled `u^1.6`. Message bubbles: sent = accent gradient with a pink shadow (rgba(255,60,200,0.35), blur 30, offsetY 9), square tail corner (radii 27, 27, 6, 27); received = white 12% with 1.5px border at 22%; each pops with `H.ease.outBack` scaled from its tail corner over 0.4 s. Typing dots: three 5px discs, alpha `0.35 + 0.65 * max(0, sin(9t - 0.9i))`. Input: a pill at rgba(10,6,40,0.22) with a caret blinking at `sin(6t) > 0`.

**Verdict badge:** 26px disc (green or red) with 27px glow, white 5px glyph (tick or cross), pops with `outBack` over 0.3 s.

## Type and numbers
- Inter only. Card title: 600, uppercase, 32px, tracked 0.04em, white 78%. Headline 90-100px at 800, white to #ffc6f0 gradient across the line width. Body 27-33px at 400, white 68-88%.
- Story-critical labels (pills, step names) 42px at 800; captions 24px at 400 white 55%.
- Key number: Inter 800, 150-192px, gradient white to #ffc6f0; on success shift the end colour to #4dffa6 and add a 36px green glow that fades over 0.8 s, with a 0.35 s swell `1 + 0.12 * sin(pi * u)`.
- Stat chips: number 800 at 54px, caption 400 at 24px.
- Text rises out of a clip mask, 64px of travel, staggered 0.12 s per line (`H.ease.outQuad`, 0.55 s); chat text uses `H.typeOn(text, u)`.
- Numbers count with `H.ease.inOutQuad` over 1.5-2.8 s; large counts use a `u^1.6` curve so the hundreds blur by and the final digits take their time; percentages show one decimal.

## Diagrams: arrows, labels, charts
- Arrows are glow connectors only: a gradient line with a lit head and travelling dots. Labels ride the line's midpoint as pills.
- Sequence steps are numbered pills ("1  Name", "2  Name") with distinct fills: white 22% for neutral, accent gradient for the main path, warm gradient for the error path.
- Line chart on a glass card: gridlines white 12% 1.5px, area gradient mint 35% to 0, line mint 4.5px with 18px glow, white node discs 6px, a head disc 10px with glow; a ring expands from the final point (radius 15 + 60u, alpha `1-u`) when the value lands.
- Ring chart: 9px track at white 15%, arc gradient #4dffa6 to #00d1ff, round caps, sweep with `inOutQuad` over 0.9 s. Sparkline: 13 points, seeded by `H.rng(4)`, a small `sin(0.8i + t)` breathing so it feels live.
- Wrong: card shakes `sin(80t) * 9` px for 0.4 s, red ring with 30px glow pulsing at `0.55 + 0.45 * sin(10t)`, red badge. Right: green bubble and badge.

## Motion
- Easing: `inOutQuad` for camera and counts, `outQuad` for entrances, `outBack` for pops. Panel entrance: rise 60px while alpha runs 0 to 1 over 0.6 s.
- One big dashboard in world space about 3 screens wide; panels separated by at least 105px so colour shows between them. Camera keys `[t, centreX, centreY, zoom]`: holds of 3-4.5 s at zoom 1.3-1.4, glides of 0.9-1.1 s, and a final pull-back to zoom 0.35-0.4 to reveal the whole thing. Interpolate zoom in log space.
- Always moving: blobs (0.5 rad/s), typing dots, caret, dots on connectors, chart sparkline. Nothing is allowed to sit still for more than a second.

## Scene changes
The camera glides to the next panel, and the new panel re-frosts over new colour because the blobs parallax at 35% of the camera's speed. To end a segment, pull back so the whole dashboard sits small, then raise a single wide glass takeaway bar (1350x150px, radius 63px) from the bottom. For a hard topic change, let old cards fall 60px and fade over 0.4 s while the blobs hue-shift (swap the blob colours by mixing with `H.mixRGB` over 1 s) and the new cards rise in.

## Finishing passes (run every frame, same strength)
1. Background dither (5% frost tile) before the blur and saturate.
2. Every glass pass in the order above: shadow, blurred backdrop, tint, grain, sheen, border, top highlight.
3. Chips drawn over a fresh blur of the composited frame.
4. `H.grain(ctx, t, {strength: 0.012, cell: 2, fps: 12, mono: true})` last, only to break banding in the large gradients.

## Sound palette
Soft glass: light taps, airy swells, rounded chimes, a calm pad.
- element appears (panel rises): airy `k.noise(t, {color: 'pink', f: 1100, filter: 'bandpass', gain: 0.06, dur: 0.6, q: 0.8, a: 0.12, pan})`, then a glass tap at t + 0.28.
- label lands: glass tap = `k.play('click', t, {f: 1300, gain: 0.45})` plus `k.tone(t, {f: 1000, dur: 0.16, gain: 0.07, a: 0.002})` and `k.tone(t, {f: 1500, dur: 0.08, gain: 0.025})`, all kept under 2 kHz; pan to the panel's screen position.
- arrow completes (connector draws on): `k.noise(t0, {color: 'pink', f: 1200, filter: 'bandpass', q: 4, gain: 0.05, dur: d + 0.1, a: d * 0.5, minor: true})` plus `k.tone(t0, {f: 450, glideTo: 900, dur: d + 0.1, gain: 0.025, minor: true})`.
- drawing / writing: `k.play('key', t, {gain: 0.4})` per character in a typed bubble, 0.065 s apart.
- scene change: `k.noise(t0, {color: 'pink', f: 400, filter: 'bandpass', q: 0.7, gain: 0.04, dur: d + 0.15, a: d * 0.5})` across the glide.
- wrong / right: wrong = `k.play('error', t, {f: 'A3', gain: 0.7})` plus `k.tone(t, {f: 160, glideTo: 90, dur: 0.3, gain: 0.18})`; right = rising chimes C5 E5 G5, 0.07 s apart, gains 0.75 / 0.63 / 0.51.
- chime = `k.tone(t, {f: n, dur: 1.2, gain: 0.1, a: 0.004})` plus the octave at gain 0.025 for 0.45 of the duration.
- counter: `k.play('tick', t, {f: 3000, gain: 1.0, minor: true})`, rate slowing with the count's speed (gap 0.09-0.4 s), skipped within 0.09 s of a tap.
- key number (biggest hit): `k.play('thud', t, {f: 90, gain: 0.6})`, a 1 s lowpass noise burst (f 1200, gain 0.16), and an arpeggiated chime A4 C5 E5 A5 at 0.03 s steps, gain 1.3 falling by 0.15 per note.
- takeaway: chimes E5 then A5 0.09 s apart, plus `k.tone(t, {f: 'A2', gain: 0.12, dur: 1.2, type: 'triangle', a: 0.02})`.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.18})` and `k.music(0, DURATION, {mood: 'dreamy', bpm: 92, key: 'A', gain: 0.34})`.

## Signature moves
- Cards that visibly blur the moving colour behind them, so the glass re-tints as it passes over a blob.
- A title card that shrinks into a header pill in the corner.
- Glass over glass: stat chips that frost the card beneath.
- Glowing connectors with white dots travelling along them.
- The red shake, glow ring and badge for a wrong answer, and a mint swell for a right one.
- A final pull-back that reveals the whole dashboard.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Plain translucent white boxes | blurred backdrop copy, tint, grain, sheen, border: all seven steps |
| Flat dark background | 5+ drifting blobs, crisp orbs and negative-space pools |
| Banded gradients | dither at 5% and grain at 0.012 |
| Blur that does not match the panel's place | always draw `SRC` with an identity transform inside the clip |
| Muddy colour overlaps | `'screen'` blending, warm blobs with pink tails |
| Text hard to read on a bright blob | tint 0.09-0.12, white ink only, avoid placing text over the brightest orb |
| Still frame | blobs, dots, caret and typing dots always move |

## Hero frame recipe
1. `BG`: base gradient, five blobs (magenta top-centre, orange right, blue bottom, violet top-left, cyan bottom-left), two pools, a pink orb at top-right (radius 177), a blue orb at the bottom, grid at 3.5%, dither. `SRC` = blur 39px + saturate 150%.
2. Left: pill (294x51) with a green dot, 3-line headline at 90px/800 (last line gradient), 27px sub line at 68%.
3. Right: one large glass card (705x780, radius 42) with a title row, a sent bubble and a received bubble with three numbered rows, the input pill at the bottom.
4. New blur of the composited frame; three chips overlap the card edges (a gradient icon plus a 33px number, a mint ring chart, a sparkline).
5. Final pass: `H.grain` 0.012. Check: moving a blob under a card must visibly change the card's colour.
