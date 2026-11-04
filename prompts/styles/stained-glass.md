---
id: stained-glass
name: Leaded Glass Window
family: Painterly
fonts: [UnifrakturMaguntia, Cormorant Garamond]
best_for: cycles and loops, stage-by-stage processes, "before, during, after" stories, heritage, craft, faith, learning and slow-burn ideas told as a walk through three or four panels
avoid_for: fast comparisons, dense tables, small print, anything that needs bright flat clarity or a modern, clinical tone
---

# Leaded Glass Window

The viewer believes they are walking down a dim stone nave past tall lit windows. Every shape is a hand-cut piece of streaky, bubbly antique glass held in thick dark lead came, details are painted on in brown grisaille, and the daylight behind it blooms, spills warm light onto the wall, and drifts down in dusty shafts. The one quality that sells it: glass glows from its middle and goes near-black beside every lead line.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (nave wall) | #2e2620 | ashlar base; blocks #3e342c, each scaled 0.8-1.2 |
| Lead came | #14100e | every outline; shoulder highlight rgba(255,240,220,0.10) |
| Stone reveal | #766656 | window surround, highlight rgba(220,190,150,0.25) |
| Primary glass (field) | #1c3496 | cobalt; variants #162878, #283ca0; teal #145a78 and violet #3c288c for other windows |
| Accent | #f0be40 | gold glass; used for the single most important thing on screen and its ring |
| Alarm / wrong | #a81a28 | ruby glass; strikes, rings round the answer, corrections |
| Right / result | #289660 | green glass check only |
| Banner glass | #eedca6 | pale cream pane that carries every word |
| Grisaille ink | #3a2216 | painted text; ruby ink #82141e for a landed number or warning |
| Support glass | #682c8a, #1e8058, #c4d2de, #ec8c32 | purple, green, pale white, amber for the subject's own parts |
| Light | #ffecb4, #ffd68c, #96aaff, #ffbe96 | glow, warm ray, cool ray, rose ray |

One glass colour per meaning, held for the whole video.

## Ground and surface
Static layers are baked once with `H.offscreen`; per-frame work is only what moves.
1. Nave wall, world size about 6300x1080 (one 2100px step per window; bake at half resolution if memory is tight): fill #2e2620; ashlar rows 96px high, blocks 270px pitch, alternate rows shifted 135px, each block inset 4.5px with colour #3e342c times `r.range(0.8,1.2)` from `H.rng(5)`. Speckle at 1/6 resolution, stretched up: 1px dots, half black and half warm white (255,240,220), alpha up to 0.12.
2. Warm spill behind each window: radial gradient from radius 300 to 1350 at the window centre, rgba(255,200,140,0.22) fading to 0. Then the stone reveal: arch stroke 45px #766656 (round joins), plus a 12px highlight shifted (-9,-9).
3. Window glass, one cached canvas per window, about 1680x990, arch-topped (straight sides to 225px below the apex, two quadratic curves to the point). Build it per pixel:
   - Region map: draw the arch in a flat id colour, an inner arch inset 39px with another id (field vs. border), read it with `getImageData`.
   - Cut the glass: jittered Voronoi, one seed per grid cell placed at 0.15-0.85 of the cell from `H.rng(seed)`; cell 87px in the field, 33px in the border; nearest of the nine neighbouring seeds wins. Every pixel gets a piece id.
   - Lead: mark pixels whose right or lower neighbour has another id, blur that mask 3.6px (came) and 12px (proximity).
   - Colour: per piece, pick from the window palette (`r.pick`), scale 0.84-1.12, random streak angle. Luminance = (0.9 + 0.3 * `noise.n2(u*0.008, v*0.06 + id%997)`) times (1 - 0.4 * proximity) times (0.95 + 0.15 * (1 - y/h)), where (u,v) is the pixel rotated by the streak angle, so streaks run long and thin and each pane darkens toward its lead.
   - Came: where the blurred mask passes 0.07, ramp to full at 0.21 and blend to near-black (16 + 12 * mask, slightly warm); the upper-left shoulder, found with a 1px gradient of the blurred mask, adds up to +20 so it reads as round metal.
   - Seeds: about 1100 bubbles per window, ellipses 1.2-3.6px, rgba(255,255,240,0.3).
   - Finally a 12px #14100e stroke around the arch.
4. Streak sheet for later-placed glass (cached at world size): per-pixel thickness shift of +-12% from two noise octaves (long, nearly horizontal), pale where positive and blue-black where negative; plus 2000 bubbles (1px dark ring rgba(10,6,20,0.38), 0.5-radius highlight rgba(255,252,236,0.55)).
5. Per frame: camera crop of the wall, the windows, dynamic glass, then the light passes.

## Mark-making
**Cut piece** `piece(path, colour, k, leadW=10.5)`: fill with `H.mixRGB([10,8,14], colour, k)` (k = 0-1 fade-in from darkness, never alpha, so the wall never shows through); clip to the path and stroke 9px #14100e with `shadowBlur 33` rgba(14,6,18,0.62), which darkens the glass edge; unclipped 10.5px came stroke; a 2.25px highlight stroke shifted by -0.16 * leadW in x and y.

**Glass strip (arrow, rule, check)**: path as a polyline; the leading fraction by `H.partial`. Passes: lead stroke at `w + 13.5`; a rim highlight 13% white shifted (-2,-2); glass at width `w` in 72% colour, `0.72w` in 88%, `0.4w` in 100% (reads as a rounded tube); cross-lead bars every fifth sample, 6px, perpendicular to the path. Width `w` 21-24px for arrows and rings, 12px for underlines.

**Arrowhead**: a separate glass piece, a triangle with tip 1.6w ahead of the end and wings 1.9w out at +-2.3 rad from the direction, drawn only once the shaft is complete.

**Grisaille** (all text and fine drawing): three layers per string: a matt halo in 62% of the ink at 22% alpha offset (+2,+3); the body in full ink; a thin darker outline (`size * 0.028`) at 40%. Details on glass (folds, hatching, rivets) use `multiply` with rgba(52,34,26,a), a=0.25-0.6, 2-3px lines, plus 12-18px blurred smears at a=0.3 for shading.

**Banner**: rounded rectangle (radius 12) in #eedca6 as a piece, text painted on top. 78-84px tall for one line.

**Bars and solids**: arched-top glass (shoulders 39px rounded), with 6px lead lines every 66px, each tilted 8px, so a tall bar looks like stacked leaded quarries.

## Type and numbers
- Title: UnifrakturMaguntia 400, 138px, on a banner 1230x225 that shrinks to half scale and moves to the top-left corner (0.7 s) after the hook.
- Labels and counters: Cormorant Garamond 600, 48-54px (never below 42px); counter label 60px.
- Key number: Cormorant Garamond 700, 120px, in ink while counting, ruby ink once it lands.
- Takeaway: Cormorant Garamond 600, 78px, on a wide banner at the bottom, set in screen space after the light passes so it stays crisp.
- Painting on: clip to a rectangle that grows left to right over 0.3-0.45 s (about 40 characters per second). Banner appears first (fade up from darkness, 0.3 s), text starts 0.1 s later.
- Numbers repaint in whole steps on a static panel: thousands for big counts (`H.ease.inQuad` over about 2.6 s), whole percents (`1-(1-u)^2` style ease-out). Land with a ruby underline strip (8px, 0.3 s).

## Diagrams: arrows, labels, charts
- Arrow: a gold or white strip along a `H.bezier` path (30 points), 0.3-0.6 s, then its glass head. Never a thin line.
- Label: a banner next to the object, 18px clear space, set in as the object finishes. Short words only.
- Emphasis: a ruby ring strip (12px, ellipse from the top, 0.4 s) plus a glow gradient (radius 390, 0.35 alpha, sine pulse over 0.9 s).
- Wrong: two ruby strips, 24px, crossing at 45 degrees (0.15 s each) plus the ring; the corrected word is painted in green or ruby ink on a blush banner (#f4c8c4).
- Right: three-point green check strip, 24px, 0.25 s.
- Chart: a thick lead baseline (18px), arched glass bars 90px wide on a 129px pitch, heights from `(value - floor) * 8`, rising over 0.35 s staggered 0.15 s; alternate two blues, final bar gold; value banner above, axis words painted below.

## Motion
- Easing: `H.ease.inOutCubic` for banners, panes and camera; draw-on is linear in path length.
- Camera: a nave 2-4 windows long. Hold a window 4-5 s, then walk 0.95 s to the next (2100px). Windows are pre-lit; the first opens in the dark.
- Opening light-on: each piece has a birth time = 0.3 + 2.3 * min(1, distance from focus / 930) + `r()*0.35`; its brightness is `s = smoothstep(birth, birth+0.3, t)` times `(1 + 0.25*sin(s*PI))`, so each piece flares as it catches; unlit glass is 7% of its colour plus a dim blue-black (14,15,20).
- Between beats: a daylight band crosses the glass, centre `x + 0.6y = 450 + sweep*1350`, `sweep = 0.5 + 0.5 sin(0.9t - 2.4)`, width 390, +14% luminance; focal glow pulses `0.25 + 0.1 sin(4t)`.

## Scene changes
Walk, do not cut. During the 0.95 s camera step the previous window's glow dims by 30% and the next brightens; strips and banners belong to their own window and slide away with it. Use a lead-in strip ("the next panel") only when the story needs a connector. Stay in one window when the next idea extends what is already leaded.

## Finishing passes (run every frame, same strength)
1. Bloom: draw the finished frame to a 192x108 scratch canvas (create once), draw it back full-size with smoothing, `screen` at alpha 0.35 (0.45 for a blurred 24px copy on a still).
2. Glows: radial gradients rgba(255,236,180,a) at active focal points, radius 330-450, a 0.25-0.6.
3. Rays: 3-5 slanted trapezoids from y=300 to 1140 (top 105px wide, foot 255px wide, 45 degree slant), gradient 1.6a at the top, 0.6a at 60%, 0 at the foot, a=0.10-0.16, colours #ffd68c, #96aaff, #ffbe96; blur 9px; each drifts `sin(t*0.5 + k) * 30`px and shifts with the camera at 8%.
4. Dust: 90-140 motes, radius 0.9-2.4px, rgba(255,240,210) alpha 0.15-0.5, y = `((r*1080 - t*15*(0.5+r)) mod 1080 + 1080) mod 1080`, sway `sin(0.5t + k) * 12`.
5. `H.vignette(ctx, {strength: 0.5, color: '#0a0604', inner: 0.5})`.
6. `H.grain(ctx, t, {strength: 0.03, cell: 2, fps: 12, mono: true})`. Banner text drawn last so bloom never blurs it.

## Sound palette
Glass fundamentals stay under 600 Hz, a D-dorian set (D4 E4 F4 G4 A4 C5 D5); everything minor except the big hits.
- element appears (a pane set in): pink `k.noise` bandpass f 550, dur 0.25, a 0.1, gain 0.07, then a glass piece (A3) 0.25 s later.
- glass piece (the base unit): brown lowpass `k.noise` f 600, dur 0.03, gain 0.16, plus `k.tone` at the scale note, dur 0.55, gain 0.09, plus a bell partial at 2.32x the frequency, dur 0.22, gain 0.03.
- label lands: `k.play('stroke', t, {dur: paintLen, gain: 0.5-0.8})` for the painted text; no ding.
- arrow completes: one glass piece per cross-lead, 4-6 per strip, stepping up the scale across the draw, pan -0.8 to 0.
- scene change (walk): three `k.play('thud', t, {gain: 0.3, f: 80})` footsteps, pan alternating -0.25 / 0.25, brown lowpass `k.noise` f 350 gain 0.22 under each, and a slow `k.tone` swell on D3 and A3.
- wrong: two low glass knocks (Eb3 then D3, 0.15 s apart, gain 1.4), `k.play('thud', t, {f: 100, gain: 0.35})`, two triangle `k.tone` D3 and Eb3 dur 0.8 gain 0.11. right: `k.play('ding', t, {f: 'A4', gain: 0.45})` plus a D5 `k.tone` dur 1.2 gain 0.05.
- key number: `k.play('tock', t, {gain: 0.4, f: 1200})` ticks at 8-12/s while counting, then `k.play('impact', t, {gain: 0.75})`, a D4 piece at gain 2.2x, `k.play('ding', t + 0.02, {f: 'D4', gain: 0.8})`, and a four-note light swell (D3 A3 F4 A4, dur 1.6, attack 35% of dur).
- takeaway: pane, painted stroke 0.7 s, `k.play('ding', t, {f: 'F4', gain: 0.5})`, resolving swell D3 A3 D4 F4.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.6})` and `k.music(0, DURATION, {mood: 'dreamy', bpm: 64, key: 'D', gain: 0.3})`.

## Signature moves
- The window lights piece by piece, spreading outward from the focus, each piece flaring as it catches.
- Arrows are glass strips with cross-lead and a leaded glass head.
- The camera walks the nave: one idea per window.
- Words are grisaille painted onto pale banner glass, never floating text.
- A wrong answer is struck with two ruby strips and a red flare; the fix is a green glass check.
- The biggest number lands with a gold ring and a swell of light through the nearest pieces.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat coloured shapes with black outlines | per-piece colour scale, streak luminance, darkening toward the lead (proximity blur) |
| Lead is a uniform stroke | blur the boundary mask and shade the upper-left shoulder; swell it slightly along its length |
| Text floats over the glass | paint it on a banner in three grisaille layers |
| Glass looks transparent or washed out | fade pieces up from near-black; keep the wall under about 35% of full brightness |
| Light is a flat overlay | bloom + glows + slanted rays + dust, all four |
| Everything on one panel | one idea per window, camera walk between |

## Hero frame recipe
1. Cached wall: #2e2620 ashlar with speckle, warm spill and #766656 reveal.
2. One cached window: arch, border cut at 33px in ruby/gold/green, field cut at 87px in four cobalts, lead and bubbles.
3. A rose of 12 alternating ruby/gold segments (outer radius 225) with a gold square at the heart, as the subject, drawn as pieces.
4. One banner "label" at 54px beside it and a gold strip arrow with head leading to a second banner.
5. A ruby ring strip around one element and a glow gradient behind it.
6. Streak sheet over all dynamic glass, then bloom, glows, three rays, dust, vignette.
7. Title banner in the corner at half scale. Check: the middle of every pane must be clearly brighter than the pane beside the lead.
