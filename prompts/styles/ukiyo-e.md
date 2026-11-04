---
id: ukiyo-e
name: Woodblock Print Scroll
family: Print
fonts: [Noto Serif JP]
best_for: Calm, authoritative explainers with a journey, flow or growth theme; processes drawn as water, paths and loops; history, nature, systems, craft; one big number and a verdict.
avoid_for: Fast comparison tables, dense dashboards, anything needing photographic detail or more than five or six flat colours per scene.
---

# Woodblock Print Scroll

The viewer is looking at a hand-printed Edo-style woodblock print that has become a horizontal scroll. Every shape is a flat block of pigment inside a carved black outline, a little out of register with it, printed on fibrous paper with wood grain showing through the ink. The one quality that sells it is the graded colour (bokashi): water and sky fade from deep blue to nothing in one smooth wipe, while everything else stays strictly flat.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (washi paper) | #ecdfc2 | Also the "white" of every printed shape's margin. |
| Sky plate | #e3d2ab | Ochre wash over the top 80%; pale band #efe5cc at the horizon. |
| Primary ink (keyblock) | #1b2236 | Every outline, text and cube edge. Never pure black. |
| Water deep / mid / light | #16304f / #24507e / #4d7ca6 | Plus light #93b4cc and pale #c9d6d6 for highlights. |
| Foam / paper white | #f1e8d2 | Foam, snowcaps, print margins. |
| Accent (vermilion) | #c4432d | Seals, the sun disc, the ring round the key number. One per scene. |
| Alarm / wrong | #a8331f | Error thread, wrong ring and text. Rare. |
| Cartouche paper | #e8d49a | Label slips; light slip #f4ecd8 fading to #e9dcbc. |
| Earth set | #7d3f2c, #d2a75c, #9aa8b0, #7a9a6a, #6d84a0 | Hull-brown, ochre, grey, green, distant blue-grey for secondary shapes. |
| Gold mist | #d4b25a core, #ece0bc edge | Scroll dividers and top/bottom edge bands. |

## Ground and surface
1. Fill paper #ecdfc2.
2. Sky plate: vertical gradient #e3d2ab to y = 490, easing to #e7d8b4 at 82% of the sky height and #efe5cc at the horizon, across the whole scroll width (the world is 5 screens wide).
3. Top bokashi: a navy-slate gradient from rgba(46,62,84,0.85) at y = 0 to transparent at y = 300.
4. The lower water band shifts from pale blue to deep navy toward the scroll's foot. Layer six pale 2.4px wave strokes about 27px apart. Their analytic phase combines horizontal position, row index and absolute time; keep displacement under 5px. Finish with a 3px dark waterline and a few widely spaced foam hooks.
5. Gold mist bands 45 px tall along the top and bottom of the frame (gradient #cfac55 to transparent). Drawn last inside the scroll, before the finish.
6. Scene dividers: scalloped gold cloud banks (see Mark-making), cached per x with `H.offscreen`.
Everything above except the wave motion and sun position is static and can be cached per panel.

## Mark-making
**Keyline.** Stroke the shape path twice with round joins and caps: once at width `w` in #1b2236, then at 0.6 `w`, alpha 0.5, translated (1, 0.75) px. The doubled stroke reads as an uneven carved line. `w`: 2.7 px for small shapes, 4 to 5 px for large bodies.

**Flat fill.** Fill the shape in its colour translated (2.2, 1.5) px from the keyline, then draw the keyline. The visible gap and overlap is the mis-registration; keep it identical on every shape.

**Bokashi.** One linear gradient inside a block: the darker end at the edge, fading to the lighter colour over 30 to 60% of the block. Use it on the sky, on water, on mountains (#16304f at the top, #6d84a0 at 55%, #93b4cc at the foot), on label slips and on the dais of any figure. Never use more than two stops of hue.

**Contour veins** (water, hills, clouds): take the outline polyline (`H.bezier` or `H.resample` through control points, ~6 px spacing). For `k` in 0..12: offset the outline inward by `45 + 28*k` px plus a random +-4 px and a sine wobble `2.5*sin(0.07*i + k)`. Between two chosen sample indices (start 8 to 40% along, end 92 to 99%) stroke it in segments of 6 samples, round caps, cream rgba(241,232,210,0.92), width tapering 1.8 px to 4.5 px and fading in over the first 8%. On every even `k` first stroke a lighter band (#4d7ca6 at 55%) 0.62 x the spacing wide beneath it. Clip to the body.

**Foam claw.** The signature mark. A set of 3 to 4 fingers at one spot, each a closed bezier shape: base width 0.22 x its length, curve outward along the normal then hook forward along the tangent, tip at `0.75 L` out and `0.75 L` along, control points at (0.9, 0.2) out/along on the way up and (0.45, 0.55) on the way back. Each finger is 80% of the previous, spaced 0.24 L apart along the tangent. Fill #f1e8d2, stroke 2.4 px key ink. One claw every 65 px along a crest, `L` growing 39 to 78 px toward the lip.

**Foam band.** Offset the crest polyline along its normal by `39*ramp + 10*abs(sin(0.45*i))` px, fill #f1e8d2, stroke the inner edge 2.4 px.

**Spray block.** Small isometric cube, half-size 8 to 21 px: top #f1e8d2, left #c9d6d6, right #93b4cc, edges key ink at `max(1.5, 0.12*s)`. Drift down `((t*0.25 + r) % 1) * 90` px with `r` from `H.rng`.

**Seal.** Square 105 px, #c4432d, rotated +-0.05 to 0.08 rad, a cream (#efe2c6) inset border at 80% of the size, then a glyph (X, check, or one bold character) in cream. Use only for verdicts and emphasis.

**Label slips.** Cartouche: text width + 1.1 x size wide, 1.7 x size tall, vertical gradient from cream-lightened (+35%) to the base to 7% darker, 3 px key outline, a 1.5 px inner border inset 6 px. Hanging slip (tanzaku): 2 px cord 18 px long into a #f4ecd8 to #e9dcbc strip, 2 px keyline.

## Type and numbers
- Noto Serif JP 700, key ink #1b2236, on cartouches. Headline 84 to 90 px; story labels 42 to 54 px; key number 144 px (900 weight for single glyph seals). Small captions 39 px minimum.
- Cartouche slides in as a fade (alpha `min(1, 1.5*p)` over 0.3 s); the text is never typed.
- Numbers sit in their own cartouche and re-cut as they climb: cubic ramp `p^3 * N` for orders of magnitude, `H.lerp` for percents. Format with thousands separators.
- The key number lands inside a cartouche with a seal at its corner and a red ellipse ring (7.5 px, vermilion) brushed round it: sweep angle `1.9*pi*p` over 0.35 s.
- Optional decorative side cartouche: a narrow vertical slip (78 x 340) with characters stacked at 1.27 x size pitch; skip it unless the characters are real and checked.

## Diagrams: arrows, labels, charts
- Arrows are currents: three parallel strokes at offsets -12, 0, +12 px (side lines #4d7ca6, 3 px; centre #24507e, 7.5 px), drawn on with `H.partial` and ending in a foam claw (39 px) as the head.
- Labels attach as hanging slips (tanzaku) on a short cord, or as cartouches beside the thing.
- A loop is a whirlpool: disc r 255 with radial gradient #16304f, #24507e at 45%, #4d7ca6; two spiral strokes `r = 243 - 9a` (cream, 4.5 px) and `232 - 9a` (#24507e, 7.5 px) for `a` up to 26 rad, rotating at 0.9 rad/s; 18 claws around the rim; step labels on the disc at r 150, 120 degrees apart, the active one tinted #e8b07a; currents chase round the rim between them.
- A chart is a mountain ridge: profile from the data, filled with a vertical gradient #7a9a6a to #24507e, five contour lines offset down in 39 px steps, 3.6 px keyline, revealed left to right by a clip rect; a vermilion sun disc (r 63) rides the leading edge.
- Wrong or right: a seal comes down on the item, plus a ring for emphasis. A correction is a thin vermilion thread (5 px) drawn on back to its source.

## Motion
- Easing: `H.ease.outCubic` for arrivals (0.3 to 0.6 s), `inOutCubic` for slides. Seals stamp in at scale 1.8 to 1 and alpha `min(1, 2p)` over 0.15 s.
- Objects float on the water: bob `12*sin(9u + i)` px and tilt 0.05 rad; items are consumed by shrinking to 0 with `H.ease.inQuad` in the last 18% of their path.
- The camera is the scroll: the world is panel k at x = -k * 1920; pan by `H.lerp(a, b, H.ease.inOutCubic(u))` over 0.7 to 0.9 s. A pinned title cartouche stays in screen space and shrinks to 50% into a corner.
- Between beats: wave lines drift, the big water form leans `8*sin(0.9*t)` px, spray falls, a whirlpool turns. Do not move the paper.

## Scene changes
| Change | Timing |
|---|---|
| Scroll | Pan right to left, 0.8 s `inOutCubic`; a gold cloud bank sits on each panel boundary and slides across the seam, hiding it |
| Print-run reveal (opening or a new chapter) | Fresh paper, then 6 impressions: key 0.35 s, sky/ochre 1.0, pale blue 1.5, mid blue 2.0, vermilion 2.45, deep blue 2.9, then the bokashi wipe from 3.25 s top-down over 0.45 s (offset `0.0018*y` s per row). Each plate lands in 0.16 s (5 frames) |
Build the print-run reveal by rendering the scene twice onto scratch canvases (`H.offscreen`): a colour pass, and a key pass where only key-ink fills and strokes print while every other fill erases beneath it. Per pixel: key alpha above 110 means key plate; paper-like means key-plate fade; red-dominant means vermilion plate; warm (r >= b) means sky plate; cool by luminance (above 0.55 pale blue, above 0.36 mid blue, else deep). Output = paper + (colour - paper) * plate progress. Stay on the scroll for everything else.

## Finishing passes (run every frame, same strength)
1. Build once, at 1920x1080, four noise fields with `H.noise(seed).fbm2`: a wood-warp field (cell 30 px, 3 octaves), a fine stretched streak field (cell 2 px, x scale 0.15, y scale 2.2), a paper tooth field (cell 3, x scale 2.5, y 0.6), and a blotch field (cell 40, 4 octaves).
2. For each pixel, estimate luminance with green weighted most strongly. Derive two clamped masks: a darker ink mask and a broader plate mask. Combine fine seeded texture with a sinusoidal woodgrain whose phase bends gently in x; keep the grain attached to the paper.
3. Modulate pigment channels by the woodgrain, increasing its effect in dark ink areas. Add a little paper-tooth variation and sparse blotch attenuation, then warm unprinted paper slightly by lifting red and reducing blue. Keep these variations subtle enough that the engraved outline stays continuous.
4. Washi fibres: 300 hairs 15 to 60 px long, 0.5 to 1.1 px wide, as quadratic curves, half cream rgba(255,250,235,0.24), half brown rgba(120,95,60,0.13). Cache with `H.offscreen`; draw on top.
5. `H.vignette(ctx, { strength: 0.25, color: '#5a3c1e', inner: 0.55 })`.
Paper margins get tooth only; pigment blocks get the wood grain. That difference is the look.

## Sound palette
Koto plucks, wooden clappers and paper. Scale: D, Eb, G, A, Bb (an Edo-style In scale).
- element appears: `k.play('paper', t, { dur: 0.12, gain: 0.25, minor: true })`.
- label lands: a koto pluck on `D4`, `A4`, `G4` etc. via `k.tone(t, { f: 'D4', type: 'triangle', dur: 1.0, gain: 0.12, a: 0.002 })` plus a quieter sawtooth twin at +1.2% pitch gliding to the note over 0.05 s (`dur: 1.3, gain: 0.05`).
- arrow completes: `k.noise(t, { dur: d + 0.15, color: 'pink', filter: 'bandpass', f: 700, q: 1.1, gain: 0.08, a: d * 0.5, minor: true })` for the length of the current.
- drawing / writing: a soft stroke preset follows a painted line. For carved numbers, use a short 1.6kHz noise contact with a quieter low wooden tone, repeating about every 0.16s and accelerating only to roughly 0.09s. Treat the repeated contacts as minor sounds under narration.
- scene change: `k.noise(t, { dur: 0.9, color: 'brown', filter: 'bandpass', f: 220, q: 1, gain: 0.18, a: 0.35 })` plus `k.play('paper', t + 0.2, { dur: 0.6, gain: 0.75 })`.
- wrong / right: every verdict is `k.play('stamp', t, { gain: 0.6 })`. Wrong adds `k.play('thud', t, { f: 75, gain: 0.5 })` and a pluck on `Eb4` that glides down (`glideTo: 277`). Right adds plucks `G4`, `A4`, `D5` at 0.1 s steps.
- key number: `k.play('impact', t, { gain: 1.3 })`, `k.play('thud', t, { f: 62, gain: 0.9 })`, a stamp, then plucks `D3 A3 D4 G4` at 0.03 s steps.
- takeaway: five plucks `D3 A3 D4 Eb4 G4`, 0.07 s apart, gain falling 0.85 to 0.5, ending on a stamp.
- bed: optional quiet room ambience at gain 0.2. Water can add a still quieter lowpassed pink-noise bed near 450Hz, with a one-second fade-in; omit both beneath voiceover when they obscure speech.

## Signature moves
- The print-run reveal: black keyblock lands first, colour plates press in one by one, the sky bokashi is wiped on last.
- Water, flow and arrows end in hooked foam claws.
- Every judgement is a vermilion seal stamped down with a thud; the key number gets a hand-brushed ring.
- The scroll slides right to left past gold cloud banks between scenes.
- Progress is a ridge line printed in left to right with a sun riding its edge.
- A whirlpool turns for any loop.

## Pitfalls
| Problem | Fix |
|---|---|
| Looks like vector flat design | Keep the keyline offset from the fill by (2.2, 1.5) px and run the grain pass; both are required |
| Gradients everywhere | Bokashi only on water, sky and mountains; everything else flat |
| Pure black lines | Use #1b2236 and the second 0.6-width pass at 50% alpha |
| Clean white paper | Fill with #ecdfc2, never #fff; add fibres and tooth |
| Foam is blobs | Use hooked finger claws that lean forward along the crest, never circles |
| Text too small | Labels 42 px or more; captions never under 39 px |
| Grain pass too slow | Build the noise fields once; cache every static layer and keep the per-pixel loop to one pass |
| Print-run flat | Press plates in order with 0.16 s landings and a bokashi wipe last, not a fade of everything |

## Hero frame recipe
1. Paper #ecdfc2, sky plate to y = 490, navy-slate bokashi at the top, water band from y = 900.
2. One big curling water form from `H.bezier` points on the left, filled with a #24507e to #16304f gradient, with 13 contour veins, a foam band along the back, 14 claws along the crest and 6 hanging over the lip.
3. A vermilion sun disc r 135 behind a distant blue-grey mountain with a cream cap, both keylined.
4. A title cartouche (#e8d49a, 87 px) at top right with a 105 px seal at its lower corner; 8 spray blocks drifting.
5. Gold cloud bank on the right edge; mist bands top and bottom.
6. Finishing: wood grain pass, fibres, vignette.
