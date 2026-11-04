---
id: cut-paper
name: Paper Diorama
family: Paper & craft
fonts: [Archivo Black]
best_for: journeys and pipelines, before/after stories, staged explanations with a clear left-to-right flow, warm friendly tone, kids-to-adults education, product walkthroughs with a few big pieces
avoid_for: dense tables, fine print, long paragraphs, anything that must look precise, clinical or high-tech
---

# Paper Diorama

The viewer believes they are looking into a shadow-box built from stiff cardstock. Every shape is its own scissor-cut sheet with visible fibre, a lit edge on one side and a dark edge on the other, resting on the sheet behind it with a soft shadow. The one quality that sells it is depth: shadows grow with each layer's height, and background layers slide slower than foreground ones.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (backboard) | #2b2d5a | deep indigo, the far wall; flat, no rim |
| Paper cream | #f3ecdc | letter backings, torn cores, chart axes |
| Tag paper | #fbf6ea | label tags, banners, speech shapes |
| Ink on paper | #2b2d5a | text on cream or tag paper |
| Accent (coral) | #e8604a | the headline and the one key number |
| Flow (saffron) | #f2b545 | arrows, emphasis rings, sunburst, counters |
| Support (teal) | #58b0a6 | secondary letters, bars, small labels; deep teal #2f7f86 for panels |
| Alarm / wrong | #d9473b | crosses, error arrows; use rarely |
| Right / result | #5fae6a | check marks |
| Far ridge / mid ridge | #4c5590 / #3d5f7a | cooler and lighter the further back |
| Ground sheet / snips / front strip | #2f6b66 / #285f5a / #163a3a | nearer is darker |
| Shadow ink | rgb(14,10,30) | never pure black |

Keep the backboard dark and the pieces saturated so every sheet reads against it. One colour per meaning for the whole video.

## Ground and surface
1. Backboard: a flat `#2b2d5a` sheet the size of the frame, with the fibre texture and no edge rim and no shadow (depth 0). Optional confetti punched into it: 60 five-point stars, radius 4.5-10px, `#f6e7bf`, upper 60% of the frame, depth 0.25 (cached).
2. Fibre tile, built once with `H.offscreen('fibre', 768, 768, fn)`: (a) a 96x96 low-res mottle from `H.noise(77).fbm2(i*5/96, j*5/96, 3)`, made seamless by blending four wrapped samples weighted by distance to the tile edges; white where the value is positive, black where negative, alpha `min(1, |v|*0.47)`, stretched to full size; (b) speckle: on half the pixels a white or black fleck at alpha `|r-0.5|*0.24`; (c) about 2500 curved fibres, 6-33px long, bend +-7px, width 0.6-1.6px, 55% white at alpha 0.08-0.22 and 45% black at alpha 0.05-0.14, each drawn at the 9 wrapped offsets so the tile repeats cleanly.
3. Layer stack, back to front, each a wide sheet cached once and drawn at its own parallax factor: far ridge 0.3 (depth 1.0), mid ridge 0.6 (depth 1.15, with small cut trees glued on), working ground 1.0 (depth 1.3), a dark foreground strip 1.25 (depth 1.6, over everything but under the finishing).
4. The world is longer than the screen: 2-4 screens (1920px each). Story pieces live in world space; the ridge layers and strips move with `cam * factor`.
5. Cached: fibre tile, every sprite, every layer. Per frame: placement, drop-ins, arrows being drawn, counters, light, grain.

## Mark-making
**Sheet** (every object, cached per sprite): paint one flat colour with no gradient and no outline, then
1. Fibre: fill the sheet with the fibre tile as a pattern (`source-atop`), pattern offset by `r()*768` and rotated `r.range(-30,30)` degrees from a per-sheet seed, so no two sheets share a grain.
2. Lit edge: copy the sheet, tint it `rgba(255,247,232,0.38)` (`source-in`), erase it with the sheet shifted (+2, +2.4)px (`destination-out`), and stamp the remaining crescent back onto the sheet (`source-atop`). It leaves a bright sliver on the top-left cut edges.
3. Shadowed edge: the same with `rgba(0,0,0,0.28)` and the shift (-1.6, -2): a dark sliver on the bottom-right edges.

**Drop shadow** (when drawing a sheet at height `d`): two passes. Soft: `shadowColor rgba(14,10,30,0.5)`, blur `9 + 10.5d`, offset `(2.25 + 3.6d, 3 + 5.4d)`. Then a contact pass of the same image: `rgba(10,6,20,0.38)`, blur 3.75, offset (1.2, 2.1). Heights: backboard 0, tiny pieces 0.2-0.4, tags and letters 0.6-0.8, main subjects 1-1.4, near layers 1.3-1.6. While a piece is in the air, add `lift * 3` to `d` so its shadow separates.

**Scissor-cut outlines.** Never a clean vector curve. Circles and blobs: 22px segments (at least 18 vertices), start angle random, each vertex angle +-0.2 of a step, radius `+ r.gauss()*0.9`, so the shape is faceted and slightly lumpy. Straight edges: split every run into about 33px pieces and nudge the interior vertices by `r.gauss()*1` px. Ridges: x steps of 18-45px following a sine sum, vertex jitter 0.9px.

**Compound sprites.** Build anything with parts as 3-6 stacked sheets, each with its own seed and its own depth (base 0, details 0.3-0.55, small features 0.12-0.25), flattened into one cached sprite. Never one flat shape with a drawn highlight.

**Torn edge** (the ground's top edge): two polylines sampled every 3.75px, a core line `y = base + 18 sin(x*0.0033+1.3) + 10 sin(x*0.0127) + fbm2(x*0.02, 0.5, 4)*7.5` and a coloured sheet whose top is `core + 4.5 + |n2(x*0.03,3.1)|*10.5 + |n2(x*0.2,7.7)|*3`. Fill below the core with cream `#f3ecdc`, then draw the green sheet from the lower line, so a ragged cream band shows. On 55% of core points add a short hair (2-8px, 0.6-1.4px wide, up +-0.9 rad, `rgba(248,244,236,0.95)`) for the fluffy fibres. Cut notches into the sheet as small dark triangles (2-4 blades, 10px apart, 15-33px tall).

## Type and numbers
- Archivo Black 400 only. Letters are cut one by one: a cream backing sheet (text stroked with round joins at `lineWidth = 1.6 * margin` plus a fill, margin 14-27px) with the coloured letter as a second sheet on top at depth 0.45, so the letter sits raised on a cut-out outline.
- Headline 138-192px (never below 99px), cycling coral / saffron / teal per letter, each letter tilted +-0.06 rad, +-4px vertical. Titles drop in letter by letter, 0.06s apart.
- Labels are tags: 45-66px (never below 42px) Archivo Black in `#2b2d5a` or `#d9473b` on a `#fbf6ea` backing (margin 15px), tilted +-0.05 to 0.1 rad. A hanging tag has a clipped corner and a punched 6px hole (`destination-out`).
- Key number: tiles 96-108px. Each digit is its own sprite on a 15px cream backing; advance by tile width minus 36px, tilt `(r()-0.5)*0.08` seeded by the character and its slot. A changing digit is a swapped tile, never a cross-fade. Counts ease as `u^2.2`; a percentage rounds each frame.
- Pinned header: the opening question reappears small (45px, cream on a coral tag) at the top-left once the camera moves on.

## Diagrams: arrows, labels, charts
- Arrow: a strip 20px wide with butt caps along a quadratic curve sampled at 40 points, revealed to fraction `p`. The head is a solid triangle: tip 21px past the end, wings 33px away at +-2.5 rad from the travel direction, shaft stopped 18px short. Rebuild it as a sheet each frame while it grows (depth 0.6) and cache it when `p = 1`. Saffron for flow, red for error.
- Label: a tag dropped onto what it names, ending 12-20px beside the object, tilted.
- Emphasis: a saffron ring (an even-odd ellipse pair, outer 217x165px, inner 187x138px) springs up behind the thing with `H.ease.outBack` from scale 0.7; for a climax, a 32-point sunburst (radii 150 / 252px) pops behind the number from scale 0.2 and turns at 0.3 rad/s.
- Wrong: a red cross (two 144x33px bars crossed at 45 degrees) slapped on, 0.25s drop. Right: a green check (a 6-point polygon) replaces it.
- Chart: two cream strips for axes (18px thick), bars as cut rectangles (84px wide, 111px pitch, height = value x 5.1px), clipped so they rise from behind the ground sheet. Bars alternate saffron and teal; the final bar is coral.

## Motion
- Drop-in is the atomic move: `u = H.prog(t, st, st+du)` with `du` 0.3-0.45s, position `dy = -(1-H.ease.outBack(u)) * dist` (dist 60-135px), scale `1 + (1-H.ease.outQuad(u))*0.08`, extra shadow lift, alpha `min(1, u*4)`. It lands at `u` of about 0.37, where the overshoot first touches rest.
- Camera: one long diorama. Pans take 0.6-1.0s with `H.ease.inOutCubic` and move the layers at 0.3 / 0.6 / 1 / 1.25 times the pan. After the set is built, a slow push to 1.035 over 2.8s around (0.52W, 0.5H).
- Alive between beats: hanging pieces sway `sin(t*1.7)*0.03` rad; riders on a belt bob `sin(t*9+phase)*3`px and tilt `sin(t*5+phase)*0.03`; a piece that receives something swells by `0.05 * exp(-((t - tHit)*9)^2)`; dial hands jitter `sin(t*40)*0.08` rad while turning.
- Stagger items 0.05-0.3s apart; nothing arrives with its neighbour.

## Scene changes
Pan, do not cut. The camera slides to the next station over 0.6-1.0s with the layers parallaxing; the new pieces drop in 0.2-0.4s after the pan settles. For a hard topic change, let every sheet of the old station slide down off screen 0.4s, nearest layers first, then drop the new ones. A hinge piece (a banner or tag) may overlap the pan. Stay continuous when the next idea extends the current station.

## Finishing passes (run every frame, same strength)
1. Key light: `soft-light` radial gradient from (390,90) r60 to (630,300) r1650, stops 0 `rgba(255,236,200,1)`, 0.5 `rgba(255,230,200,0.25)`, 1 `rgba(0,0,20,0.6)`. Warm in the upper left, cool in the far corner.
2. Lamp pool: a second `soft-light` radial centred on the stage (about (1080,495)), r30 to 840, `rgba(255,214,160,0.42)` to 0.
3. `H.vignette(ctx, {strength: 0.42, color: '#0a0618', inner: 0.55})`.
4. `H.grain(ctx, t, {strength: 0.03, cell: 2, fps: 12, mono: true})`; a touch of grain makes the cached sheets feel photographed.

## Sound palette
Define a card tap `tap(t, g, pan, f)`: a snap, `k.noise(t, {gain: 0.26*g, pan, f: 1100*f, q: 0.9, filter: 'bandpass', a: 0.001, dur: 0.045})`; a thump of body, `k.noise(t, {gain: 0.3*g, pan, color: 'brown', f: 650, filter: 'lowpass', a: 0.002, dur: 0.09})`; and a falling blip, `k.tone(t, {pan, gain: 0.16*g, dur: 0.09, glideTo: 85, f: 160*f})`. `f` 0.8 for big pieces, 1.2 for small tags. Pan with the piece: `clamp((worldX - cam)/1920*2 - 1, -1, 1) * 0.6`.
- element appears: `tap` at the landing moment (`st + 0.37*du`), not at the start; gain 0.4-1.1 by size. Wrap small ones in `k.minor`.
- label lands: `tap(t, 0.6, pan, 1.2)`; no chime.
- arrow completes: a dry slide while it grows, `k.noise(t0, {gain: 0.09, a: d*0.3, q: 0.8, f: 1200, filter: 'bandpass', dur: d})`, then `tap(t1, 0.55, pan, 1.2)`.
- drawing / writing: none; letters drop (15 letters = 15 taps, gain 0.42-0.56, panned left to right).
- scene change: a layer slide, `k.noise(t, {gain: 0.16, color: 'pink', a: d*0.45, pan: 0.15, f: 420, q: 0.6, filter: 'bandpass', dur: d})` plus a brown lowpass (f 380, gain 0.14) delayed 0.05 and panned -0.15.
- wrong / right: wrong is `k.play('slap', t, {gain: 0.6})`, a heavy `tap`, then `k.tone` triangle D3 (0.16s, gain 0.2) and A2 (0.3s, gain 0.22) 0.16s later; right is `tap` plus `k.play('success', t, {f: 'G5', gain: 0.6})`.
- counter: a 22ms tile flick (a `k.noise` bandpass at 1.8 kHz, q 1.4, gain 0.22, plus a 30ms `k.tone` at 220Hz, gain 0.06), 8/s speeding up to 12/s, then one firm `tap(t, 1.1, pan, 1.3)` at the end.
- key number (biggest hit): `k.play('impact', t, {gain: 1.3})`, a pink bandpass noise burst (0.12s, f 1100, gain 0.3), and `k.play('ding', t, {f: 'E5', gain: 0.65})` as the sunburst springs.
- takeaway: banner `tap(t, 1.0, 0, 0.8)`, then `k.play('ding', ...)` at C4, G4, E5, 0.09s apart from +0.16s, gain 0.48, 0.44, 0.40.
- bed: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`.

## Signature moves
- Letters drop one at a time onto the backboard, each with its own tap and lifted shadow.
- The camera pans station to station while ridge layers slide at different speeds like a pop-up book.
- Counters swap cut-out digit tiles, each slightly tilted.
- Arrows grow as paper strips and finish with a solid wide head.
- A flipped card: scale x by `|cos(pi*u)|` and swap the face at the midpoint.
- Bars and sunbursts spring up from behind a layer.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Shapes look like vector clip-art | flat fill plus fibre, both edge slivers, and 22px faceted outlines |
| Shadows identical everywhere | depth per layer, 0 for backboard to 1.6 for foreground; add lift while falling |
| Drop shadow is a black blur | rgb(14,10,30) at 0.5 plus the tight contact pass |
| Fibre repeats visibly | random offset and rotation per sheet, different seeds per layer in a sprite |
| Parallax is all one speed | 0.3 / 0.6 / 1 / 1.25 and a push of 3.5% |
| Text is plain on the dark board | every word on its own cream backing, tilted |
| Everything appears at once | stagger 0.05-0.3s and land with a tap |

## Hero frame recipe
1. Cached backboard `#2b2d5a`, 60 stars, then far ridge (y about 510), mid ridge with trees (y about 680), torn ground (y about 840), foreground strip (y about 990), each with its depth shadow.
2. A two-line headline, 138px and 192px, centred near y 375 and 600, letters alternating coral, saffron, teal on cream backings, tilted +-0.06 rad, depth 0.8.
3. One main subject in the centre made of 4-5 stacked sheets, depth 1-1.4, with a small teal tag (45px) tilted -0.08 rad beside it.
4. One saffron arrow with a solid head curving from the subject to a second piece, grown to `p = 1`.
5. A coral number in 108px digit tiles with its sunburst turning behind it.
6. Finishing: key light, lamp pool, vignette, grain 0.03.
7. Check: bright slivers on top-left edges, dark slivers on bottom-right, shadows longer for the near layers, ragged cream band on the ground.
