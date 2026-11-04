---
id: shadow-puppet
name: Shadow Puppet Screen
family: Paper & craft
fonts: [IM Fell English, Libre Baskerville]
best_for: Stories with a cause and effect, a character, a journey or a lesson; warm, slightly formal, fable-like explainers; short counts and one big number.
avoid_for: Dense data, fine UI detail, small print, anything that needs more than two or three colours on screen at once.
---

# Shadow Puppet Screen

The viewer is watching a lit cloth screen from the audience side. Flat hide figures with pierced lace-like holes are held against the cloth on thin rods, and a flickering lamp behind them makes the cloth glow. The holes are the point: light pours through them, and a few are filled with coloured gel. Everything is a silhouette, so the look is sold by the warm light, the cut-work and the cloth weave.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ink (every puppet) | #140804 | Warm near-black, never #000. Rods, strings, text holes all use it. |
| Lamp core | #ffe8a8 | Centre of the glow. |
| Lamp mid | #ee842e | At 42% of the glow radius. |
| Screen edge | #260a04 | Where the gradient ends, red-brown dark. |
| Accent gel (the key thing) | #ffd660 | Warm gold behind the one hole that matters. |
| Gel cool | #5cce96 | Secondary light in eyes or windows. |
| Gel rose | #ec7060 | Neutral third gel for cards. |
| Alarm / wrong | #f03c2e | Wrong badge, and a full-screen red wash at 75% alpha for 0.4 s. |
| Right | #6edc78 | Right badge only. |
| Moon / highlight | #fff6d6 | Pale lit disc. |

## Ground and surface
Build the glow every frame, everything else once.
1. Fill black, then one radial gradient centred at (960 + 18 * `H.noise(1).n2(t*0.9, 5)`, 480 + 14 * `n2(7, t*0.8)`) with radius 1290. Stops: 0 #ffe8a8, 0.16 #ffc868, 0.42 #ee842e, 0.68 #a83c14, 0.88 #541809, 1 #260a04.
2. Multiply every stop colour by a brightness `b`. `b` = a flicker term times a fade-in of `H.smoothstep(0, 0.9, t)`. Flicker is 1 plus 4.5% of a slow noise (rate 6.1 per second, second coordinate 0.3) plus 2.5% of a fast noise (rate 17.3, second coordinate 2.2).
3. Light-up at the start: for the first 0.7 s dip `b` by up to 35% with `max(0, n2(t*23, 3))`, fading out, so the lamp sputters alight.
4. Flare (for the biggest moment): add `flare` 0..0.32, decaying `exp(-dt*3)`. It pushes each stop 70% toward white and grows the radius by 300 px.
5. Cached cloth weave via `H.offscreen('weave', 1920, 1080, ...)`: threads on a 4 px pitch in both directions. Per row, brightness steps through 1, 0.5, 0.15, 0 on `y % 4`, scaled by a per-row random 0.6..1.4 and by `0.7 + 0.3*sin(x*0.033 + r*9)` so threads look slubby. Same for columns. Pixel value = `255*(1 - 0.075*warp - 0.06*weft)`, green x0.985, blue x0.97. Do not rescale it.
6. On the weave, multiply a 160x90 noise map stretched to full size (soft vertical folds: 7% darkening from 3-octave `fbm2` sampled with x scaled by 0.05 and y by 0.012, so it varies fast across and slowly down), and a seam at x = 320: a 10 px band of (232,226,220) with a 3 px line of (200,190,180) in the middle.
7. Stage furniture, cached as strips and laid on the silhouette layer every frame: a scalloped valance along the top (21 px bar, scallops of 24 px radius on a 48 px pitch, a hanging tassel every 96 px, punched dots in the bar), and a filigree ground strip at the bottom (21 px bar plus thin curved blades 20 to 70 px tall, curls and small rosettes).

## Mark-making
Every figure is built on its own scratch canvas, then composited, so holes can be punched. Make the scratch canvases once with `H.offscreen(key, 1920, 1080, () => {})` and clear them at the start of each draw call; they carry no state between frames.

**Silhouette pass.** Fill ink. Punch with `globalCompositeOperation = 'destination-out'`. Lay the finished scratch canvas on the shadow layer `S` with `drawImage`, at alpha 0.92 to 1, with `ctx.filter = 'blur(Npx)'` where N says how far the piece is from the screen: 0 against the screen, 1.5 to 2.5 for pieces held back, 10 for a leaf held near the lamp, up to 39 for something flying at the lamp.

**Cut-work vocabulary** (punched, so light shows):
| Motif | Values |
|---|---|
| Pierced border | Ink dots r 8 px every 20 px centred on the edge (scalloped lace edge), plus a row of holes r 3 to 3.5 px every 15 px, 24 px inside |
| Keyline | Stroked rounded rect, 3 to 4.5 px line, 12 to 21 px inset |
| Petal rows | Teardrops 20 px long, 10 px wide, rows of 6, 5, 4 at 30 px pitch |
| Eyelash ring | 18 strokes 5 px wide from r 58 to r 80 around a round window; skip the 110 degrees facing inward |
| Outline echo | 36 holes r 4.5 px on an ellipse 27 px inside the body edge |
| Gear | Four points per tooth, tooth depth 20% of radius; spokes as five curved wedge holes |

A teardrop helper (round end, pointed far end, two quadratic curves) makes leaves, claws, feathers and slits. Reuse it for everything.

**Pins and joints.** A joint is a punched ring r 12 px with an ink rivet r 6.6 px inside. Limbs are drawn inside a `translate(pin) rotate(angle)`, parent first, so child parts swing about the pin. Wings, heads, hands and arms all work this way.

**Gel.** Wherever a hole should glow in colour, fill the same shape on a second layer `G` in the gel colour (1.5 px larger than the hole). `G` is multiplied onto the lit cloth before `S` is laid over it, so only the openings are tinted.

**Rods.** At each joint a rod anchor is recorded in screen space. After all figures: a line from each anchor down to y = 1140, drifting outward `x + (x - 960)*0.14 + 27`, 3.9 to 5.4 px wide, round cap, with a knob r 1.2x the width at the anchor. Draw them on one layer, blur 2 px, alpha 0.9, onto `S`. Rods fade with their figure.

**Vine (the arrow).** Sample a cubic `H.bezier` to progress `u` (60 samples max), stroke 10.5 px ink, round caps. Start with a spiral curl 24 px across. Leaves (teardrops 39 x 16 px, alternate sides, 52 degrees off the tangent) at five stations along the path (u from 0.18 to 0.8, about 0.16 apart), each growing from 0 to full over the 0.12 of path after the tip passes, with a 2 px vein punched along it. Tip: a spade head 45 px long and 28 px half-width, a 5 px hole in it. Draw-on is `H.ease.inOutCubic` over 0.5 s.

## Type and numbers
- Headline: IM Fell English 400 at 111 px, second line italic 114 px, punched out of a hanging card so the letters are glowing holes. Card 660 to 1410 px wide, 285 to 405 px high.
- Label plaque: IM Fell English italic 400, 54 to 69 px (never below 54). Plaque width = text width + 1.1 x size, height = 1.5 x size, corner radius 0.28 x height, a lug dot at each end, a 3 px keyline 9 px inside.
- Numbers: Libre Baskerville 400. Counter board 132 px, scaled down to fit 540 px wide. Key number 255 px, ink on the cloth (not punched), so it lands as a heavy black shape.
- Number behaviour: counts with `Math.round(10 ** (6 * H.smoothstep(a, b, t)))` for orders of magnitude, linear for percentages; a pop of `1 + 0.1*exp(-dt*8)` at the end. The key number hits at `1 + 0.14*exp(-dt*5)` and triggers the flare.
- Never type text on. Cards drop in with the words already cut in them.

## Diagrams: arrows, labels, charts
- Arrows are vines. Each vine gets a plaque label that drops from above (starts 90 px off-screen, `outCubic`, 0.25 s) a beat after the vine starts, hanging from a 3 px string 330 px long, then swings.
- A label attached to a thing hangs from a pivot on that thing; a free label hangs from the top edge.
- A verdict is a round badge: ink disc r 60, 12 dots r 10.5 around the rim, a hole r 46 filled with a gel (alarm or right), and a thick ink X or check (16 px, round caps) across it. Badge scale uses `H.ease.outBack`.
- Counters and charts: a board on two strings with the number cut or inked on it. A bar or ladder is a row of rungs 88 px wide with a figure climbing rung by rung (hop 33 px, 0.3 s each); the lit fraction of a moon or lamp disc shows progress by sliding an ink disc across it under a clip.

## Motion
- Easing: `H.ease.outCubic` for arrivals, `inOutCubic` for repositioning. Arrivals take 0.5 to 0.9 s from off-screen.
- Hanging things swing with `amp * exp(-k*dt) * sin(w*dt)`: amp 0.05 to 0.12 rad, k 2 to 3, w 6 to 9. It lasts about 1.2 s.
- Walking in: x eased over 0.8 to 1.3 s with a hop `abs(sin(u*pi*3)) * 39 * (1 - u)`. Wings or arms flap `(0.55 + 0.45*sin(15*t)) * (1 - smoothstep)` while moving, then settle.
- Between beats keep it alive: lamp flicker and wander (above), idle sway `0.03*sin(2*t)` rad on figures, blinks as 0.16 s triangles at chosen times, stepped gear turns `floor(t*3)*0.26` plus a quick smooth step.
- Depth: keep a big, very soft leaf silhouette (blur 10 px, alpha 0.85) in a bottom corner, rotated by `0.5 + 0.03*sin(0.8*t)` rad. Cache its blurred sprite once; only rotate it per frame.
- No camera moves. The screen is fixed; the world moves on rods.

## Scene changes
All three keep the page pure: the scene is chosen from `t`, and the swap happens while the screen is covered.
| Change | Timing |
|---|---|
| Lamp dip | `b *= 1 - 0.93*sin(pi*H.prog(t, t0, t0 + 0.5))`; swap at the midpoint. Fastest, best between beats |
| Fly at the lamp | A figure scales 0.86 to 7.2 over 0.6 s (`q^1.2`), blur 1 + 39*q px, full-screen ink at alpha 0.93 from q 0.25 to 0.42 in, out by 0.72; swap under the ink |
| Curtains | Two ink panels with wavy inner edges close to the centre in 0.3 s, hold 0.15, part in 0.35 s; diamond holes (10 px) in columns 105 px apart, a petal fringe every 36 px. Use for a chapter end |
Stay continuous when the next beat uses the same figure: slide pieces out on their rods and bring new ones in.

## Finishing passes (run every frame, same strength)
1. `S` onto the cloth with `blur(1px)`, alpha 0.97 (everything gets a soft edge).
2. Multiply the cached weave over the whole frame.
3. Diffusion: copy the frame to a 480x270 canvas with `blur(7px)`, draw back up with `screen` at 0.13 alpha, so glow bleeds into shadows around holes.
4. `H.grain(ctx, t, { strength: 0.06, cell: 2, seed: 5, fps: 12, mono: true, blend: 'overlay' })`.
5. `H.vignette(ctx, { strength: 0.38, color: '#140502', inner: 0.55 })`.

## Sound palette
Wood, hide and bronze. Rod taps are `tock` plus a short bandpass click; bronze is four sine partials.
- element appears: `k.play('paper', t, { dur: 0.3, gain: 0.6 })`, then at landing `k.play('tock', t + drop, { f: 520, gain: 0.7 })`.
- label lands: `k.play('tock', t, { f: 820, gain: 0.45 })`.
- arrow completes: tap on the plaque 0.3 s after the vine ends, f 760, gain 0.6.
- drawing / writing: `k.play('stroke', t, { dur: 0.5, gain: 0.7, minor: true })`, dur equal to the vine's draw-on length.
- scene change: lamp dip `k.noise(t, { color: 'brown', filter: 'lowpass', gain: 0.35, a: 0.25, f: 300, dur: 0.5 })`; fly `k.noise(t, { gain: 0.4, a: 0.3, color: 'pink', filter: 'bandpass', q: 0.8, f: 600, dur: 0.75 })` then `k.play('thud', t + 0.65, { f: 70, gain: 0.35 })`; curtains two panned (+-0.7) pink bandpass bursts of 0.32 s plus `thud` f 110.
- wrong / right: wrong is a clashing bronze pair (Eb4 + E4) with a low A2 and `k.play('thud', t, { f: 170, gain: 0.55 })`; right is bronze A4 then D5, 0.12 s apart.
- key number: gong. `k.play('thud', t, { gain: 0.7, f: 90 })`, `k.tone(t, { f: 98, glideTo: 95, dur: 3.6, gain: 0.36, a: 0.012 })`, a second tone at 99.2 gliding to 96 (gain 0.16), tones at 202 (0.1) and 277 (0.05), and brown lowpass noise at 450 Hz, gain 0.3.
- takeaway: bronze D4, A4, D5 at 0.14 s steps, with `k.tone(t, { f: 'D3', dur: 2, gain: 0.12 })` under it.
- bronze note (helper, hz in Hz): tones at `hz` (gain 0.13, dur 1.9), `hz*1.007` (0.07, 1.6), `hz*2.01` (0.04, 0.55), plus `k.noise` 0.02 s bandpass click.
- counter ticks: tock f 1150, gain 0.36, at most 11 per second.
- bed: `k.bed(0, DURATION, { kind: 'hum', gain: 0.45 })` and `k.bed(0, DURATION, { kind: 'room', gain: 0.4 })`.

## Signature moves
- The lamp sputters alight, then breathes for the whole video.
- Title and label cards drop from the top on strings and swing to a stop.
- A red gel slides in front of the lamp for a wrong answer; the whole screen turns red for 0.4 s.
- Arrows grow as vines with leaves unfurling behind the tip.
- A jointed figure flies at the lamp and its shadow swells to cover the frame as the cut.
- The key number lands with a gong and the flame flares.

## Pitfalls
| Problem | Fix |
|---|---|
| Flat, sticker-like silhouettes | Warm ink (#140804), 1 px blur on the layer, holes that show the glow, bloom pass on |
| Cut-work disappears | No hole smaller than 3 px radius or 3 px line width; blur and bloom close small holes |
| Labels unreadable | Cut text at 54 px or larger, weight 400; never italic below 54 |
| Everything equally sharp | Vary blur by distance: back pieces 1.5 to 2.5 px, near-lamp leaf 10 px |
| Gel colour on ink or outside holes | Fill gel only under holes, on `G`, multiplied before `S` is laid |
| Figures float | Always add a rod per figure; keep rods blurred and slightly splayed |
| Hard cut between scenes | Swap only while a dip, ink flood or curtain covers the frame |
| Weave moire or shimmer | Build it at native 1920x1080, cache it, never scale or move it |
| Slow render from blur | Blur only what needs it; cache static blurred sprites in `H.offscreen` |

## Hero frame recipe
1. Lamp gradient at b = 1, flare 0. Multiply the gel layer (empty for now).
2. Valance and ground strip onto `S`.
3. A title card (870 x 285 px) hanging from two strings, rotated 0.05 rad, headline 111 px with an italic second line at 114 px cut out of it.
4. A jointed figure standing on the ground strip: oval body with outline-echo holes and three petal rows, one round window with an eyelash ring (gel #5cce96 on `G`), two pinned wings, rods from both wing tips and the base.
5. A vine from the figure to a plaque (label 57 px, italic), growing at u = 0.8.
6. Near-lamp leaf in the bottom-left corner, blur 10, alpha 0.85.
7. Run the finishing passes in order, with the weave and diffusion before grain and vignette.
