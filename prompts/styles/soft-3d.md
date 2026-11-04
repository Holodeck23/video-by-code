---
id: soft-3d
name: Puffy Clay
family: Dimensional
fonts: [Fredoka]
best_for: friendly product and concept explainers, onboarding, "how it works" for non-experts, wellness, education, app and AI topics aimed at a general audience
avoid_for: serious or sombre subjects, dense data, technical diagrams that need precision, anything where toy-like softness undercuts trust
---

# Puffy Clay

The viewer believes they are watching a set of soft matte clay toys on a seamless lavender studio sweep, lit by a big window. Every object has chunky rounded edges, a darker body behind its lit face, a bright rim of bounce light and a wet-looking highlight blob. It all squishes, bobs and springs, and the camera dollies past with real depth of field.

## Palette
Each clay colour is five values in order: face light, face mid, face dark, side light, side dark.
| Role | Hex | Notes |
|---|---|---|
| Ground (sweep) | #f3ecff, #e8dffb, #dccff5, #e6dcf9, #efe7fe | vertical gradient, stops 0, 0.5, 0.62, 0.78, 1 |
| Ink on pale clay | #4a3a8a | text on white, peach, mint; on butter use #8a5a1f |
| Lavender (default object) | #e6e0ff, #b9abff, #9a88f5, #8f7cf0, #5d48c2 | the main solid |
| White | #ffffff, #f7f3ff, #e2d9fb, #d4c8f5, #9a87de | cards, bases, neutral pills |
| Peach | #fff0e6, #ffcfb3, #ffad8a, #f79d7a, #cf6b4f | warm secondary |
| Mint | #e6fff6, #b3eedb, #86d7bf, #7fcbb3, #4f9f8a | confirmed, positive |
| Blue | #e3f1ff, #b4d6ff, #8fbaf5, #86b0ee, #5a7fc7 | bars, cool secondary |
| Pink | #ffe3ea, #ffb1c2, #ff8fa8, #f57f9b, #cc4f72 | pointers, decoration |
| Butter | #fffbe0, #ffe58f, #f7c45e, #f2b955, #d98f3a | number badges only |
| Accent / alarm (coral) | #ffd9d2, #ff8f7e, #f2675a, #e85d4f, #b23a33 | the single most important thing; also the wrong state (mix an object's face colours 60% toward #ff8f7e) |
| Shadow / light | rgba(110,80,170,a), rgba(255,214,120,a) | contact shadows are violet, never black; key-light glow is warm |

## Ground and surface
1. Cache with `H.offscreen('sweep', W, H, fn)`: the vertical gradient above, then a radial glow centred (50%, 35%), radius 60 to 1050px, `rgba(255,250,255,0.8)` to 0. The sweep has no visible horizon; the darker 0.62 band only suggests one.
2. Objects stand on an invisible floor line at y = 915. Every object gets a contact shadow on it (see Mark-making).
3. Far layer: 12-16 small spheres (radius 18-50px) and one gear scattered along the set in pale butter, mint, lavender and pink, drawn with a parallax factor of 0.6. Draw them onto a scratch canvas each frame and composite with `filter = 'blur(4.5px)'`.
4. World: a set about 2.5 screens wide. All props use world coordinates through `translate(W/2,H/2); scale(zoom); translate(-camX, -camY)`.
5. Per prop, a warm key-light glow behind it as it arrives: radial, radius 480-690px, `rgba(255,214,120,0.26*a)`, 0.11 at 45%, 0 at the edge, `a` following the prop's spring.

## Mark-making
Everything is a "puffy" solid built in four steps. Never draw a clay object with a plain fill.
- **Rounded polygon**: a vertex list `[x, y, r]`; start at the midpoint of the last edge, then for each vertex `arcTo(vertex, midpoint of next edge, r)`. Use big radii (a third of the smaller side or more). Pills use `r = h/2`; cards 21-75px.
- **1 Extrusion**: offset vector `(ex, ey)` points down-right: small chips (4.5, 9), cards and pills (7.5, 13.5), hero objects (15-18, 27-33). Draw `n = ceil(hypot(ex,ey)*1.5)` copies from the farthest to the nearest, copy `i` at `(ex*k, ey*k)` with `k = i/n`, colour by depth: k above 0.86 blends from side-dark up to a bounce colour (side-light mixed 35% toward white, so the far rim glows); k from 0.25 to 0.86 runs side-light to side-dark; below 0.25 it blends face-dark into side-light. Composite the stack with a 2px blur so the steps vanish. Small items may skip the blur.
- **2 Face**: the same path, a 3-stop linear gradient across the bounding box from top-left (face light) through 0.5 (face mid) to bottom-right (face dark).
- **3 Inner shadows**, all clipped to the shape (fill a huge rectangle-minus-shape with the casting fill pushed 5000px off canvas so only the shadow lands): core shadow in side-dark at 50% alpha, blur 60, offset (-24,-30), which darkens the lower-right; edge falloff in side-light at 35%, blur 21, offset 0; soft highlight `rgba(255,255,255,0.72)`, blur 39, offset (18,21), which lights the upper-left. Scale all by the object's scale.
- **4 Specular**: a white radial gradient (0.95 at the centre, 0.45 at 35%, 0 at the edge) clipped to the shape and squashed to an ellipse (rx 130, ry 60 for hero solids), centred in the upper-left quarter.
- **Sphere** (`sphere(x, y, r, light, mid, dark)`): radial gradient from (-0.35r, -0.4r) at 0.05r to (0, 0) at 1.05r, light / mid at 0.55 / dark; a lighter inner rim shadow (blur 0.12r, offset (-0.05r, -0.06r)); a white blob of radius 0.42r at (-0.38r, -0.45r) fading from 90% to 0.
- **Contact shadow**: two blurred ellipses at the floor: outer `rgba(110,80,170,a)` (a 0.22-0.35), blur 12-27px; inner at 55% x 45% size, `rgba(90,60,150,0.8a)`, blur 0.4 of the outer. Draw before the object; scale with the prop's spring so it grows as the object lands.
- **Tube** (arrows): four strokes along one curve, stopping at 93% of progress: a shadow stroke `rgba(90,60,150,0.18)` offset (4.5,10), a body stroke in side-dark, a lit stroke 72% as wide in face-mid offset (-0.1w, -0.12w), a white 75% stroke 0.2w wide offset (-0.2w, -0.25w). Width w is 21-27px. The head is a puffy rounded triangle (vertices `[1.3w,0]`, `[-0.9w,-1.15w]`, `[-0.9w,1.15w]`, radius 0.35w) rotated to the tip direction.
- **Coral ring** for emphasis: a coral torus built from five strokes of the same ellipse, 18px shadow `rgba(110,70,160,0.13)` offset (7,21); 16px #c8483e offset (0,6); 14px #ff7a68; 7px `rgba(255,186,170,0.75)`; 3px white 60%. It sweeps 0 to 2 pi in 0.45 s while the radius shrinks from 1.25x to 1x.

## Type and numbers
- Fredoka 700 throughout. Hook headline 72px in a lavender speech bubble (white text with a pressed-in shadow `rgba(70,45,170,0.35)` offset (4,6)), shrinking over 0.7 s into a corner header pill (lavender clay, white 42px text, height 81px).
- Labels: clay pills, Fredoka 700 at 42px, height `1.8*fontSize`, width = text + `1.5*fontSize`, with a 4.5px extrusion. White text on saturated clay (with the pressed-in shadow), `#4a3a8a` on pale clay with a debossed 55% white copy 5px below.
- Key number: a butter pill 810x174px, 102px digits in #8a5a1f, unit text 51px beside it. At the target value it flips to coral with white digits and pops `1 + 0.18*Math.sin(Math.PI * min(1, (t - t0)/0.4))`.
- Counting: `Math.floor(1e6 * H.ease.outCubic(u) ** 1.6)` with thousands separators; percentages ease `H.ease.inOutSine`. If the camera zooms out, counter-scale the readout by `max(1, 0.93/zoom)` so it stays above 64px.
- A small decorative footer caption (Fredoka 600 30px, `rgba(85,62,165,0.78)`, letter-spacing 1px) steps aside when the takeaway arrives.

## Diagrams: arrows, labels, charts
- Arrow: a clay tube drawn on over 0.4-0.9 s with `H.ease.inOutCubic`, ending in a blobby head. A small clay sphere (r 22) rolls along a coral tube to carry an error.
- Label: a pill that springs on at the object's side, 0.7 s after the object lands, then squashes away (scale to 0 over 0.4 s) before the next beat.
- Verdict: a clay ball (radius 57) with a 13px white round-capped glyph, bouncing on at a shoulder of the object it judges. A wrong object also shakes `6*Math.sin(70*t)` px for 0.4 s.
- Sliders and dials: clay knobs gliding on a track over 0.7 s, with a slight jitter `0.03*Math.sin(40*t)` while they move.
- Chart: rounded clay bars 84px wide, 33px gap, height `(value - 50) * 10.5`, corner radius `min(39, h/2)`, colours alternating blue and mint, the newest bar coral, sitting on a white clay base pill. Each springs up in 0.8 s, 0.2 s apart. A butter number pill rides above the newest bar.
- Celebration: 14 clay spheres in pink, butter and mint burst outward 90-270px over 1 s (`H.rng(5)`).

## Motion
- Everything arrives on a spring: `p = clamp((t - t0)/d)`, scale `1 - Math.exp(-6.5p) * Math.cos(10p)`, with `d` 0.6-0.9 s. Squash and stretch: `st = (1-p)**2 * Math.sin(13p) * 0.22`, the width is `k - k*st` while the height is `k + k*st`; it also drops from 105px above and eases in over the first 60% of `p`.
- Stagger arrivals by 0.15-0.4 s. Items in a pile arrive one after another and their shared shadow widens.
- Idle: each prop bobs `Math.sin(1.6*t + phase)*amp`, amp 9-16px, different phase per prop so nothing moves in unison. A pointer that taps squashes the target by 3% for 0.1 s.
- Camera: keyframes `[t, camX, camY, zoom]` with `H.ease.inOutCubic`, 0.9-1.0 s moves, 2.5-3.5 s holds, zoom 1 except the final pull-back to 0.44. Parallax: far layer 0.6, foreground blob 0.04.

## Scene changes
No cuts. The camera dollies along the set to the next prop while a tube from the last object finishes and its pills squash away. The opening hook bubble shrinks into the header. The close pulls the camera back (zoom 0.44) and springs the takeaway pill (1290px wide, 150px tall, 69px text) in at the bottom.

## Finishing passes (run every frame, same strength)
1. Cached sweep and glow, then the far layer with its blur.
2. Contact shadows, key-light glows, props (nearest last).
3. Lavender vignette: radial from (50%, 45%), radii `0.45H` to `0.78W`, `rgba(120,90,200,0)` to 0.11.
4. Foreground out-of-focus sphere: bake once (radius 150, light #f3eeff, mid #d4c8ff, dark #a998ec) and blur 13px; place at bottom-right, bobbing 4.5px.
5. `H.grain(ctx, t, {strength: 0.018, cell: 2, fps: 12, mono: true})`.

## Sound palette
- element appears (squish): `k.tone(t, {f: 0.7*f, glideTo: 1.18*f, dur: 0.06, gain: 0.26, a: 0.006})`, then `k.tone(t + 0.05, {f: 1.18*f, glideTo: 0.92*f, dur: 0.14, gain: 0.26})`, a wobble `k.tone(t + 0.13, {f: f, dur: 0.13, gain: 0.08})` and a pink lowpass puff `k.noise` (f 900, `dur: 0.05`, `gain: 0.18`). Hero objects f 170-300, labels 340-460 (gain 0.4), numbers 360. Pan to the screen position.
- label lands: the squish at f 340-460, gain 0.4, inside `k.minor`.
- arrow completes: a pink bandpass `k.noise` swelling over the draw (f 440, q 1.4, `gain: 0.07`, long attack), then a small puff.
- drawing / writing: none.
- scene change (dolly): pink bandpass `k.noise` (f 380, q 0.7, `gain: 0.045`, attack and release half the move).
- wrong / right: wrong = `k.play('error', t, {f: 'G3', gain: 0.8})` + a low squish (f 220); right = `k.play('success', t, {f: 'Eb5', gain: 0.42})` + squish (f 300). Sliders: three bandpass noises (f 380, 440, 500, q 3, `dur: 0.6`, `gain: 0.07`), a squish when they settle.
- counting: `k.play('tick', t, {f: 2400, gain: 0.75})`, at most 12 per second, skipped within 0.3 s of a squish.
- key number: `k.play('impact', t, {gain: 1.0})`, squish f 240 gain 1.4, four dings 'Eb4', 'G4', 'Bb4', 'Eb5' staggered 30 ms (gain 0.4 falling 0.05), and six rising confetti chirps every 70 ms.
- takeaway: squish f 260, then dings 'Bb4', 'Eb5' 90 ms apart (gain 0.3 falling 0.05), plus a low `k.tone` ('Eb3', triangle, 1.2 s, gain 0.12).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.22})`, `k.music(0.2, DURATION, {mood: 'dreamy', bpm: 100, key: 'Eb', gain: 0.3})`.

## Signature moves
- Clay drops from above, overshoots, squashes and settles while its contact shadow grows beneath it.
- A pill label springs onto an object and squashes away after the beat.
- A puffy tube snakes between props and ends in a blobby head.
- The camera slides past with a blurred far layer and a blurred foreground sphere.
- A butter number badge flips coral when the value lands, with clay confetti.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Gradient-filled flat shapes | stack the extrusion, then the face, the three inner shadows and a specular blob |
| Visible stair steps on the side | `1.5` copies per px of offset, plus a 2px blur on the stack |
| Black or grey shadows | violet `rgba(110,80,170)`, blurred, two layers |
| Everything at one depth | far layer blurred at 0.6 parallax, a soft foreground blob |
| Static at rest | bob each prop with its own phase |
| Hard outlines | none; edges come from light and the inner falloff |

## Hero frame recipe
1. Cached sweep and glow, far layer (three blurred spheres and a gear) at 0.6 parallax.
2. A lavender speech bubble, centre (960, 460), extrusion (18, 33), spec ellipse upper-left, two lines of 72px white text with pressed-in shadow.
3. A white card pill at left and a mint sphere at right, each with a contact shadow.
4. A coral clay cursor pointing at the bubble with a 5-stroke highlight.
5. Key-light glow behind the bubble.
6. Vignette, blurred foreground sphere, `H.grain`.
7. Check: the lit edge is top-left, the far rim glows, the lower-right is darker, no shadow is black.
