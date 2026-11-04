---
id: claymation
name: Clay Stop-Motion
family: Paper & craft
fonts: [Fredoka]
best_for: friendly explanations for a general audience, counting up to a big number, guess-and-correct loops, bar-style progress, kids-and-family tone, anything where "someone placed these by hand" is charming
avoid_for: dense text, fine data, sleek or corporate tone, long sentences (clay letters are slow and heavy), anything that must feel precise or technical
---

# Clay Stop-Motion

The viewer believes they are watching a locked-off plasticine set photographed one frame at a time. Every thing on screen is a soft lump of modelling clay with a waxy glow, thumbprints and tool grooves, put in place by an invisible animator's hands. The one quality that sells it: everything moves on twos (12 poses a second), so motion is stepped, squashy and slightly boiling, never smooth.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (wall, base) | #3f8593 | teal backdrop before the clay layer |
| Ground (wall, lit clay) | #4f9fae | the sculpted wall, slightly out of focus |
| Table | #d0703f | terracotta slab along the bottom third |
| Clay yellow | #f2c14e | numbers, the main object, headlines |
| Clay coral | #f07b5a | action words, second-level labels |
| Clay cream | #f6efe3 | arrows, plain text, cards, header |
| Clay pink | #ef8fb0 | the "thinking" object, soft emphasis |
| Clay mint | #a8dd8a | units and sub-labels |
| Clay sky | #7fd0e0 | alternate bars, cool contrast |
| Accent | #f2c14e | the single most important thing on screen, plus a squash and a star |
| Alarm / wrong | #d9473b | a slapped-on X, a correcting arrow; use rarely |
| Right / result | #4f9a52 | check mark, a landed answer |
| Dark text | #2e3760 | words on cream clay (speech bubbles) |
| Shadow | rgb(40,20,10) | all cast shadows; never pure black |

Letters cycle through the six clay colours (yellow, coral, cream, pink, mint, sky) so a headline is a mixed box of clay; a label that names one thing takes that thing's colour.

## Ground and surface
The set is one locked frame with no camera move. Build once, bake with `H.offscreen('set', 1920, 1080, fn)`:
1. Fill #3f8593. Bake the wall as a clay slab (technique below, dome 0, lump amplitude 4.8px, spec 0.12, groove width param 14) in #4f9fae, with 12 big thumbprints (radius about 45px), then draw it blurred 2.4px so the back of the set is soft.
2. Radial pool of light centred near (930, 330), radii 45 to 1140: rgba(255,240,200,0.22) at 0 to rgba(10,20,30,0.35) at the edge.
3. Table: bake a slab from y about 750 down. Its top edge is a wavy line, y = 9 + `H.noise(8).n2(x*0.0067, 3)` * 12, sampled every 30px. Colour #d0703f, soft radius 33px, dome 1.0, lump 3.6px, 7 thumbprints, 6 tool grooves 75-165px long. Draw it with an upward shadow (rgba(40,20,10,0.35), blur 45px, offset y -15).
4. Front falloff: linear gradient over y 900 to 1080, rgba(60,20,10,0) to rgba(60,20,10,0.35).
5. Contact shadow sprite, cached once: a 360x150 canvas with a blurred (15px) ellipse of rgb(70,20,5). Scale it under anything that rests on the table at alpha 0.3 to 0.7; flatten it to ry 9-14px, rx about 0.6 of the object's width.
Everything above is static. Per frame you only draw props, the lens passes and grain.

## Mark-making
**The clay bake.** Every shape is a 2D silhouette inflated into a lit lump, rendered once per sprite and cached (`H.offscreen(key, w+pad*2, h+pad*2, fn)`; key includes the boil phase 0-2 for big pieces). Steps for a sprite with softness `R` (21px typical, 6-12 for letters and eyes, 33 for the table):
1. Draw the silhouette white on a mask. Blur a copy at 1/3 scale by `R/3` px, scale it back up. Remap blurred alpha a to `ap = clamp((a - 0.42)/0.58)`.
2. Height = `sqrt(1 - (1-ap)^2) * R * dome` (dome 1.1 default; 1.3-1.4 for eyes and letters; 0.6-0.7 for flat slabs). This gives a pillowy rim with a flat top.
3. Add low lump noise `H.noise(seed).n2(x*0.017+s, y*0.017) * lump` (lump 1.2-2.4px; 0.8 for letters) and fine skin noise `n2(x*0.073 + boil*1.7, y*0.073+s) * 0.5`. The fine noise is the part that boils.
4. Thumbprints: a partial whorl inside radius `r` (27-36px on props, 0.18 x font size on big letters). Ripple height `sin(d*1.07 + warp) * 0.33 * (1-d/r)^1.5`, where `d` is the elliptical distance (y stretched 1.45), `warp = n2(dx*0.04, dy*0.04) * 2.5`, masked by `smoothstep(-0.6, 0.4, cos(angle - 2*rot))` so only a wedge of the print shows. One or two per big piece, none on tiny ones.
5. Tool grooves: line segments 45-110px long (random angle). Height change `taper * (-depth*exp(-d²/w) + 0.4*depth*exp(-(d-5)²/3))` with depth 0.8-1.6, `w` 3-5 (14-16 for wall and table), taper = `sin(pi*u)`. A soft trench with a raised lip.
6. Shade per pixel from the height field's normal. Light from upper left, front: L = normalize(-0.5, -0.66, 0.58); half vector H' = normalize(L + (0,0,1)). Diffuse term `clamp((n·L + 0.42)/1.42)`; highlight `(n·H')^26 * 0.3` (use 0.9 on glossy eyes, 0.12 on the wall). Brightness is `0.3 + 0.86*diff`, multiplied by a rim factor `0.72 + 0.28*min(1, ap*1.4)` that darkens the thin edge. Final colour = base * brightness * (1 + (sss-1)*(1-diffuse)) + spec*(255,245,230), with `sss = [1.12, 0.92, 0.85]` (shadows go warm and red, the waxy glow); cream and grey clay use `[1.04, 1, 1]`.
7. Cast shadow at draw time: shadowColor rgba(40,20,10,0.4), blur 15px, offset (9, 10.5). Small pieces use blur 7, offset (4, 5).

**Rolled coils.** Arrows and bars are strokes baked the same way: line width 24px (18 for short links), round caps and joins, followed by a filled triangle head whose tip is 33px past the end and whose barbs are 39px at +-2.3 rad from the direction of travel. Coil curves are quadratic bezier (`H.bezier` with repeated control point, 21 samples).

**Letters.** Each glyph is its own baked sprite (Fredoka 700), dome 1.3, soft radius `max(6, 0.075*size)`. Place with a per-glyph tilt of +-0.07 rad from `H.rng(charCode*7+i)()`; shadow blur `0.09*size`, offset `(0.05, 0.07)*size`.

## Type and numbers
- Fredoka 700 only, as pressed clay letters. Headline 156-180px (never below 99px), second-level 96px, header strip 66px, story label 66-78px (never below 60px), small caption 66px.
- Key number: 192px, cream while changing, coral or yellow once landed.
- Words arrive one glyph per tick: `step` 1/12 s for headlines, 1/24 s for small labels. A word with `step` 0 pops all at once.
- Numbers: the displayed value changes only on the 12 fps tick, each change swapping to freshly baked digit sprites; there is no smooth counting. Large counts ease like `u²` (slow start, fast finish); percentages step toward each new value over 0.25 s, then hold. Add thousands separators.
- Landing: the final number swells `[1.25, 1.12, 1.05, 1]` over four 1/6 s steps and turns to the accent colour.

## Diagrams: arrows, labels, charts
- Arrow: a clay coil that pops on (squash, see Motion) anchored at its tail. Cream by default, red when it means "go back and fix".
- Label: clay letters set beside or under the thing, never touching it, in that thing's colour. Sticker-like cards are slabs of cream clay with the label letters pressed on, baked into one sprite.
- Chart: bars are rounded slabs (width 105px, radius 33px, height = value * 5.1px) standing on the table with a contact shadow, alternating yellow and sky; the last bar takes the accent colour. Bars rise with a squash-and-stretch rise from the table: five poses held 1/12 s each, 0.25 s between bars, anchored at the base: nearly flat and wide (1.25 across, 0.2 tall), then 1.12 by 0.55, overshoot to 0.95 by 1.08, settle at 1.03 by 0.97, rest at 1 by 1.
- Wrong: a red clay X (stroke 42px, round caps, 130px square) slapped on tilted 0.1 rad, and its host shakes sideways +-13px, flipping direction every tick for 0.5 s. Right: a green check (stroke 39px, 3 points) set on in the same spot.

## Motion
- Master clock: `tq = Math.floor(t*12)/12`. Every position, scale and sprite choice is computed from `tq`, so the picture is held for two or three render frames and then jumps. Use `H.ease` only to decide a target, then quantise it to 4-6 steps.
- Pop-on: five poses of 1/6 s each, anchored at the piece's base: a small dot (half width, 0.42 tall), a wide splat (1.16 across, 0.8 tall), a stretch (0.9 across, 1.14 tall), a small rebound (1.04 by 0.97), then rest at 1 by 1.
- Leave by falling: `dy = 3600*d²`, `d` = time since release + 1/12 s, rotation = `(seedHash - 0.5) * d * 5`; drop it once dy > 1350. Letters of one word are released 1/24 s apart.
- Leave by sliding: `dx = +-3900*d²`, same clock, so heavy pieces shove off like they were pushed.
- Resting life ("boil"): the fine skin noise offset moves every third frame (3 cached variants), and small pieces hop 5-8px on alternate ticks while they travel across the table.
- Pieces travelling across the table move at about 900px/s, advancing every tick.
- Nothing is easy-in/easy-out smooth, and nothing rotates continuously.

## Scene changes
Clear the stage by knocking the pieces off, not by cutting. The wall and table never change. Headlines fall (staggered 1/24 s per letter) just before the next idea's first piece pops on; a working group slides off to the side in one shove; a mascot or card gets squashed first (1/6 s) then released. Keep the table pieces that carry over to the next beat; only the beat's own words and arrows leave. Overlap 0.15-0.3 s of exit with the next entrance.

## Finishing passes (run every frame, same strength)
1. Warm and cool grade: `globalCompositeOperation = 'soft-light'`, linear gradient (0,0) to (1920,1080), rgba(255,220,170,0.5) to rgba(40,60,90,0.4).
2. `H.vignette(ctx, {strength: 0.42, color: '#140c08'})`.
3. Exposure flicker, once per tick: `f = (H.rng(900 + tickIndex)() - 0.5) * 0.06`; if f > 0 fill the frame rgba(255,240,220,f), otherwise rgba(0,0,0,-f). This is the sound of a lamp that is not quite steady.
4. `H.grain(ctx, t, {strength: 0.03, cell: 3, fps: 12, mono: true})`.
5. Depth of field is baked in: wall at 2.4px blur, back-row props at 1.2px, an optional foreground object 5px.

## Sound palette
A "plop" is the base voice (helper): `k.tone(t, {f: 270, glideTo: 120, dur: 0.11, gain: 0.3})` + `k.noise(t, {color: 'brown', filter: 'lowpass', f: 700, dur: 0.05, gain: 0.28, a: 0.002})` + a 40 ms bandpass tap centred at 520 Hz with q 1.5 at gain 0.1. A "squelch" is `k.noise(t, {color: 'pink', filter: 'bandpass', f: 450, q: 2, dur: 0.14, a: 0.02, gain: 0.3})` + `k.tone(t, {f: 90, glideTo: 130, dur: 0.14, gain: 0.12})`. Quantise every sound start to the tick grid (`Math.ceil(s*12 - 1e-6)/12`).
- element appears: plop (f 150-230 by size, gain 0.4-1.0) then a squelch one tick later for big pieces; pan from the piece's x.
- label lands: one plop per tick on which new letters appear, `gain` 0.2-0.3 (minor), f 190-240.
- arrow completes: plop gain 0.6 + squelch 0.4 as it lands; no separate head sound.
- drawing / writing: none; clay is placed, not drawn.
- scene change: pieces landing off-screen are 4-5 brown lowpass thuds (f 260, dur 0.09, 0.07 s apart, gain 0.32 falling 8% each, pans alternating); slides use a 0.45 s brown bandpass smear (f 400, q 1.3) plus a quiet tick per frame.
- wrong / right: wrong = `k.play('slap', t, {gain: 0.7})` + big plop + `k.tone` D3 then A2 (triangle, dur 0.16 and 0.32, gain 0.22). Right = plop + `k.play('success', t, {f: 'G5', gain: 0.55})`.
- key number (the biggest hit): `k.play('impact', t, {gain: 1.45})`, a plop at f 95 gain 2.1, a squelch, `k.play('ding', t, {f: 'E5', gain: 0.6})`.
- takeaway: `k.play('ding', ...)` at C4, G4, E5, 80 ms apart, gain 0.45 falling.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.45})`. No music.

## Signature moves
- Pop-on with squash-and-stretch, five poses, every piece.
- Letters knocked off one by one and falling out of frame.
- Numbers re-pressed from fresh clay digits on the 12 fps tick.
- Red clay X slapped on while the bubble shakes.
- Bars squeezed up from the table and landing with a wobble.
- A cast of thumbprints that boil every third frame.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat vector shapes with a drop shadow | do the height-field bake: dome, lump noise, normal lighting, subsurface tint |
| Perfectly smooth motion | quantise to `tq`, stepped squash poses, no eased tweens between ticks |
| Clean textures | thumbprints and grooves on every big piece, boil the fine noise every third frame |
| Pure black shadows | rgb(40,20,10) shadows plus the warm sss tint |
| Everything sharp | blur the back wall and back props; keep text and key objects crisp |
| Too many things at once | keep to 5-9 pieces; clay reads best when each has room on the table |
| Long sentences | 2-4 word phrases, headlines of 2 lines max |

## Hero frame recipe
1. Cached set: teal wall with grooves and 2.4px blur, warm light pool, terracotta table with a wavy edge, front falloff.
2. Headline in 156px Fredoka clay letters, two lines, centred around y 330 and 580, each glyph tilted +-0.07 rad, colours cycling through the six clay colours.
3. One hero object (a lumpy 420x320px blob in pink, dome 1.1, two thumbprints, three grooves) sitting on the table with a contact ellipse beneath it.
4. A cream coil arrow (24px) curving toward a second, smaller object; a 78px label under each, in the object's colour.
5. Soft-light grade, vignette 0.42, a one-tick exposure flicker, grain at 0.03.
6. Compare against a macro photo of plasticine: highlights are small and soft, shadows are warm, silhouettes are lumpy, and no edge is straight.
