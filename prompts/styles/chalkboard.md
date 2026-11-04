---
id: chalkboard
name: Slate and Chalk
family: Hand-drawn
fonts: [Kalam, Patrick Hand]
best_for: teaching, step-by-step logic, maths and science, process walk-throughs, anything told as a lesson with a visible hand
avoid_for: luxury or high-tech brands, fast-cut hype, dense photographic content, small print
---

# Slate and Chalk

The viewer is watching a teacher write on a real school slate. A stick of chalk is visible at the end of every stroke, the line is built from a few dry passes that break wherever the slate's tooth catches it, and old wiped lessons ghost through the surface. The quality that sells it is the grain: chalk is never a clean line.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (slate) | #2c4639 | dark green, never black |
| Slate shadow | #000a05 | vignette and lighting falloff |
| Primary chalk (white) | #f0f2ec | titles, axes, arrows, body labels |
| Accent yellow | #f6de78 | underlines, the line that matters, the thing being tracked |
| Alarm / emphasis pink | #f496af | wrong marks, rings around key moments |
| Cool blue | #96cdf0 | secondary notes, dashed helper lines |
| Result green-white | #cdfabe | a final right answer only |
| Ghost writing | #e8eee6 | old lessons, drawn at alpha 0.07 |
| Oak | #80542e | frame; ledge top #96663a, lip #6e4624, deep shade #3e2510 |

Chalk colours are used as pigments: do not tint them toward the ground. Keep at most three per scene.

## Ground and surface
Built once, cached with `H.offscreen`; only the dust and chalk layers change per frame.
1. Slate: `H.paperTexture(1920, 1080, { seed: 17, tone: '#2c4639', fiber: 0.1, grain: 0.3, blotch: 0.4 })`. This is the low-frequency mottle.
2. Ghost lessons: write four to eight scraps of unrelated old board writing (a formula, a due date, a circle, a triangle) in Kalam 400 60px, colour #e8eee6, blur 2px, alpha 0.08. Scatter them away from where the story happens.
3. Eraser smears, seed `H.rng(12)`: 26 elliptical arcs (radius 90 to 255px, minor/major 0.3 to 0.7, tilt +/-0.4 rad, sweep 1.5 to 3.5 rad, width 68 to 120px, `rgba(215,228,215)` at alpha 0.035 to 0.075) plus 10 straight passes (225 to 540px long, 75 to 105px wide, alpha 0.03 to 0.05). Blur the sum 10px.
4. Felt streaks: 260 hairlines per screen (1.2 to 3px, 90 to 210px long, slight bend, alpha 0.015 to 0.04) over the smears. About 700 settled dust specks (1.2 to 2.7px, alpha 0.04 to 0.2).
5. Tooth: a seamless 256px tile of 1 to 2px speckle, light or dark at random, alpha up to 0.09, laid over the board as a repeating pattern in world space (so it stays put when the camera moves).
6. Lighting: radial gradient from (840, 390) r150 to (960, 540) r1350: inner `rgba(120,150,130,0.10)`, outer `rgba(0,10,5,0.35)`.
7. Long-board option: build the slate once as a 7200 x 2100 world canvas; a camera transform picks the visible 1920x1080.

Oak ledge and frame: a `wood(x, y, w, h, horizontal, seed, base)` routine fills the base, adds 70 to 90 grain lines (60% dark `rgba(60,34,14,0.1-0.35)`, 40% light `rgba(210,160,100,0.06-0.18)`, 0.9 to 3.3px, sine drift amp 0.75 to 4.5px plus `H.noise` wander), then a bevel gradient (top `rgba(255,220,170,0.25)`, middle clear, bottom `rgba(30,15,5,0.4)`). Ledge: 45px top face with a dust gradient and about 1400 chalk crumbs per screen width, 90px front face, 1.5px highlight on the lip, three or four chalk stubs (60 to 140px long) and a felt eraser (255 x 33px). Frame rails 45px. Everything scrolls with the camera.

## Mark-making
**Chalk stroke** (every line, curve, box, arrow, ring):
1. Resample the path to 3.75px steps, then `H.wobble(pts, noise, { amp: 2, freq: 0.008, seed })` and a second `H.wobble` at amp 0.5, freq 0.05 so the line never runs ruler-straight.
2. Draw four parallel sub-strokes (the flat side of the stick): offsets `(k/3 - 0.5) * width * 0.7` plus +/-0.75px jitter; each `lineWidth` is `width * 0.5..0.72`; each alpha is `pressure * 0.75..1`.
3. Cut each sub-stroke into 6-point runs and set each run's alpha to `base * (0.7 + 0.3 * noise)` so the density breathes along the line.
4. Widths at 1920x1080: hairline 6px, label stroke 9 to 12px, axis or arrow 12 to 15px, hero curve 15 to 17px, ring 10px. Pressure 0.85 (normal), 0.95 (hero curve), 0.6 (underline flicks).
5. Draw all chalk into one cleared scratch canvas per frame (`H.offscreen('chalk', 1920, 1080, () => {})`, `clearRect` each frame), never straight onto the board.

**Grain pass** (the look): after all strokes, loop over the scratch canvas pixels. For each pixel with alpha `a`, build a tooth value `g = 0.5 * hash(x, y) + 0.5 * (H.noise(seed).n2(x * 0.12, y * 0.12) * 0.5 + 0.5)`, then keep a fraction of the pixel: threshold `th = (1 - a) * 0.95 + 0.06`, `keep = clamp(3 * (g - th), 0, 1)`, new alpha `a * 1.15 * keep`. Light passes (low `a`) break into speckle; dense passes stay solid. When a camera moves, hash the world coordinate, not the screen pixel, or the grain swims.

**Dust halo**: draw the grained chalk canvas twice onto the board: first blurred 6px at alpha 0.22, then crisp.

**Boxes and rings**: a box overshoots its start corner by 9px; a ring runs 1.05 turns so its end passes its start. An emphasis ring is an ellipse 15 to 30% larger than the target, tilted a few degrees, drawn pink in 0.3 s.

**Dashed helper**: 12-point dashes every 21 points, drawn in sequence, blue, 9px.

**Chalk stick in hand**: while anything is being drawn, place a 129 x 24px stick at the tip, angle 0.8 rad, vertical gradient #ffffff, #ecece4, #a9aaa2, rounded 9px end, a soft shadow (blur 9px, alpha 0.4) offset 24px right and 30px down. Hide it between strokes.

## Type and numbers
- Kalam 700 for titles: hero 126px, section 93px. Patrick Hand 400 for labels: 51px minimum, 57px for loop labels. Key number: Kalam 700 at 165px.
- Writing is per character. Each glyph gets alpha 0.8 to 1, vertical jitter +/-2.25px, tilt +/-0.04 rad, advance -0.75 to +1.5px; the whole line is rotated -0.015 to -0.04 rad (a hand writing slightly uphill). Reveal with `H.typeOn(text, u)`; the stick tip sits at the end of the revealed substring. Time: 0.05 to 0.065 s per character.
- Underline after a title: yellow, 9px, drawn in 0.25 s, starting under the first letter.
- Numbers are re-chalked, not animated: quantise `t` to 1/12 s and redraw the whole figure each step. Counts use a log-like climb (`10^(6u)`); percentages use `start + range * (1 - (1-u)^2.2)`. When it settles it turns #cdfabe and gets a second pass 1.2px right and 0.9px up (pressed harder). A pink ring follows 0.1 s later.

## Diagrams: arrows, labels, charts
- Arrow: a lightly curved chalk stroke, 12 to 15px; the head is two 27px barbs at +/-0.5 rad to the direction of the last 5 points, drawn one after the other (0.05 s each). Accent arrows in yellow, flow arrows in white, error-return arrows in pink.
- Labels: Patrick Hand 51px, 15px off the thing they name, no boxes. A tag is a pentagon outline (pointed end) hanging off the corner of an item, text inside in the same chalk.
- Bubble: a rounded rect, corner radius 60px, with a three-point tail.
- Chart: two perpendicular axes with arrowheads at the ends, no grid, no ticks. One hero curve in yellow, a label per axis, the key value written beside it and ringed in pink. A bouncing marker is a 3-pass yellow dot (r 16, 12, 7px) that lands at each step, with a small arc drawn to the next one.
- Cards: 177px rounded boxes (radius 18px) in white with a picture inside in 4.5px strokes.

## Motion
- Everything is made by hand: nothing fades or scales in. Elements appear because a stroke draws on over their path. Use `H.partial(pts, u)` with `u = H.ease.inOutCubic` for long curves, linear for short strokes.
- Durations: short stroke 0.12 to 0.2 s, arrow 0.3 s, box 0.15 s, big curve 0.5 s, ring 0.3 s. Consecutive strokes overlap by about 0.05 s.
- Repeated items (cards, steps) land every 0.17 to 0.2 s.
- Idle life: 60 dust motes (0.9 to 2.1px, alpha 0.1 to 0.35) falling 8 to 22px/s with 12px sine sway, seeded; film grain stepping at 12 fps.
- Dust at the tip: each frame, 22 to 26 specks (1.2 to 3px, alpha 0.15 to 0.5) within 18px sideways and 0 to 45px below the tip, seeded by `floor(t*30)`.

## Scene changes
Default: do not cut. The story lives on one long board and a camera moves along it. The next stretch of board is empty slate. The camera tracks the hand.
- Pan: 0.7 to 0.8 s, `H.ease.inOutCubic` on position, zoom interpolated in log space between 0.88 and 1.05. Hold between keyframes.
- Bridge: a chalk arrow with a short label (yellow) is drawn across the gap (0.45 s) while the camera starts to move, so the viewer follows the hand into the next part.
- Hard topic change (optional): an eraser wipe, 0.6 s: a soft-edged band (120px feather) sweeps left to right, fading the chalk canvas to zero behind it and leaving a pale haze (blurred 10px, alpha 0.06) on the slate.

## Finishing passes (run every frame, same strength)
1. Slate, tooth, lighting (cached), then the chalk canvas with the grain pass and halo.
2. Oak ledge and frame (cached), air dust motes, then `H.vignette(ctx, { strength: 0.35, color: '#000804', inner: 0.55 })`.
3. Tip dust and the chalk stick.
4. `H.grain(ctx, t, { strength: 0.03, cell: 2, seed: 5 + (floor(t*12) % 4), fps: 12 })`. Do not skip: it removes the digital look.

## Sound palette
A quiet classroom: room tone, dry chalk drags, dull knocks.
- element appears (stroke start): knock = `k.tone(t,{f:150,glideTo:90,dur:0.07,gain:0.1})` plus `k.noise(t,{f:900,filter:'bandpass',q:1.2,dur:0.025,gain:0.15,a:0.001})`, inside `k.minor`.
- label lands: chalk drag, one `k.play('chalk', t, { dur: wordDuration, gain: 0.4 })` per word, with the knock under its first frame.
- arrow completes: `k.play('chalk', t, { dur: 0.3, gain: 0.45 })`, then a 0.06 s head stroke.
- drawing / writing: `k.play('chalk', start, { dur: drawDuration, gain: 0.43 })`; drag length equals the draw-on length.
- scene change (pan or wipe): a long `k.play('chalk', t, { dur: 0.45, gain: 0.65 })`, or `k.play('erase', t, { dur: 0.6, gain: 0.5 })` for a wipe.
- wrong / right: wrong = two hard slashes (`chalk`, gain 0.8, 0.08 s each) with a dust puff and `k.play('error', t, { f: 'F3', gain: 0.55 })`; right = `k.play('success', t, { f: 'A5', gain: 0.6 })`.
- key number: per number change, `k.play('tick', t, { f: 1900 + step * 20, gain: 1.1 })` on the 12 fps grid; the settle gets `k.play('impact', t, { gain: 1 })` and `k.play('ding', t + 0.01, { f: 'D6', gain: 0.42 })`.
- takeaway: written line with `chalk` per word, `k.play('success', t, { f: 'G5', gain: 0.7 })` when it resolves, and a dust puff: a 0.45 s pink-noise breath through a wide bandpass near 1.4 kHz (`q` 0.5), gain 0.05, soft attack `a` 0.12.
- bed: `k.bed(0, DURATION, { kind: 'room', gain: 0.5 })`.

## Signature moves
- Stick in hand: the chalk stick always travels with the stroke being drawn, trailing dust.
- Strokes break up over the slate's tooth; hard pressure stays solid, light pressure goes to speckle.
- Numbers are re-chalked in steps of 1/12 s, never smoothly counted.
- Pink ring round the key moment, drawn in 0.3 s.
- The camera follows the hand along one long board; the hook is left behind a pan.
- Old wiped lessons ghost through the slate.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Clean vector lines | wobble twice, four sub-strokes, run-by-run alpha, then the grain pass |
| Grain swims on camera moves | hash world coordinates, not screen pixels |
| Black or flat green board | mottle, smears, tooth tile, radial lighting |
| Chalk glows | no outer glow; only a 6px blur at alpha 0.22 under the crisp copy |
| Fades and scale-ins | everything draws on; no opacity tweens |
| Text too neat | per-glyph jitter, tilt, uneven advance |

## Hero frame recipe
1. Slate with ghost lessons, smears, tooth and lighting; oak rails 45px; ledge at y 969.
2. Title in white Kalam 126px at (126, 162), tilt -0.015 rad; yellow underline across it, 9px.
3. Two axes from (255, 885), left arrow up to y 285 and right to x 1200, white 12px with barbs.
4. A hero curve in white, 15px, pressure 0.95; a dashed blue helper line at the left end; a yellow marker dot where the story starts, a pink 10px ring round the key point with a 66px pink label.
5. Chalk canvas through the grain pass and halo; ledge dust; vignette; stick at the last stroke tip; grain.
