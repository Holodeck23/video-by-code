---
id: origami
name: Origami Table
family: Paper & craft
fonts: [Space Grotesk, Space Mono]
best_for: explainers about structure, parts and assemblies, step-by-step builds, quiet and precise topics, calm product or science tone
avoid_for: gritty or chaotic tone, hand-drawn warmth, dense text, anything that needs a handmade wobble
---

# Origami Table

The viewer believes a camera is dollying along one long table in a bright studio, where every object is folded from a single sheet of paper. Nothing has an outline: form comes from flat facets, each lit a slightly different amount, with crisp crease lines between them and soft shadows on a seamless paper sweep. Things appear by unfolding from flat.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Sweep top | #c9d3cf | seamless backdrop, gradient stop 0 |
| Sweep mid | #dde3de | stop 0.45 |
| Horizon band | #e6e6de | stop 0.62 |
| Table near | #d8d5ca | stop 1 |
| Cream paper | #f6f2e9 | cards and plain arrows; card front #f8f5ee, back #ece7dc |
| Ink | #23242a | main printed text |
| Accent (coral red) | #e45a3e | printed key words, the single most important thing on screen |
| Structure | #2ca096 (teal), #3a5296 (indigo) | parts of the system; teal text #3a8f86 |
| Quantity / path | #f1b644 | counter arrows, stars, dials |
| Alarm / wrong | #d64a3a | wrong marks and return arrows; text #d4473a; rarely |
| Right / result | #5caa68 | tick marks; text #2f8a5a |
| Organic form | #f08a7e | faceted blob objects; darker shade #cd585c |
| Underside | #f4d678 | example two-tone sheet; every facet can carry a second colour for when it faces down |

One colour per meaning for the whole video; secondary text is #6a6a70.

## Ground and surface
Cache with `H.offscreen('sweep', W, H, fn)`; it never changes.
1. Vertical gradient with the four sweep stops above.
2. Key-light pool: radial gradient from (0.44W, 0.46H) r 60 to (0.47W, 0.53H) r 1170, rgba(255,252,240,0.6) to 0.
3. Paper fibre tile, 256px, also cached: per-pixel noise (`H.rng(5)`; pixel white or black, alpha `|n - 0.5| * 34/255`, up to 7%), then 260 short strokes of length 3-14px and width 0.6-1.4px, round caps, drawn nine times (tile offsets) so it wraps. 60% are white at alpha 0.06-0.16, 40% brown rgba(60,40,20) at 0.04-0.09. Lay it over the sweep at alpha 0.6.
No horizon line: table and wall are one curved sheet. Per frame only the paper layer, the shadows and the finishing run.

## Mark-making
There are no strokes, only facets. Build a small face list and render it in the camera, as in a tiny flat-shaded 3D renderer (plain canvas maths).

**Camera.** Pin-hole, focal length 1770px, centre (960, 558). Eye height 2.35 units, 7.7 back from the table, aimed at height 0.85 (low angle, about 11 degrees). One unit is about 230px on screen at the working framing.

**Facet colour.** Flip each normal to face the camera, then intensity `I = 0.36 + 0.7*max(0, n.key) + 0.16*max(0, n.fill) + 0.1*max(0, -n.y)`, with key (-0.55, 1.0, 0.55) and fill (0.9, 0.25, 0.35), both normalised. Multiply the channels by (1.04, 1.0, 0.95). A facet whose normal points down (n.y < -0.08) switches to its second colour (two-tone paper).

**Facet fill.** Sort far to near by mean depth. Fill each facet with a linear gradient along the screen light direction (-0.6, -0.8): 105% brightness at the lit side to 94% on the far side. Then stroke the facet edge in its own colour (1px) to hide the seams, plus a pale edge line, colour (255,255,250), alpha `0.05 + 0.08*I`, 0.9px wide.

**Creases.** Index facet edges by rounded endpoints. For an edge shared by two facets, test the neighbour's centre against this facet's plane: in front means a valley (stroke the edge in the facet colour at 55% brightness, alpha 0.55, 1.35px); behind means a mountain (pale line, colour (255,250,242), alpha `0.1 + 0.2*clamp(I - 0.5)`, 1.2px). Coplanar edges get nothing.

**Forms.** Everything is triangles and quads: pleated columns (12 sides, radius alternating 0.24 and 0.2 so folds alternate out and in, cap as a shallow fan with a raised centre), ten-point stars (alternating radius ratio 0.42, two faces on each side, 0.3 deep), pinwheels (four triangles on a thin pole, alternate shades 80%), faceted organic blobs (an icosphere at subdivision 1 or 2, vertices pushed by 7-12% with `H.noise(41).n3` plus 3% jitter from `H.rng(43).gauss()`). A flat panel can take one diagonal crease by splitting it in two facets with the ridge 0.045 forward.

**Paper layer.** Draw facets and text onto a separate scratch canvas, then composite the fibre tile onto it with `source-atop` at alpha 0.9, so only paper picks up fibre. Draw this layer onto the frame after the shadows.

**Shadows.** Project every facet along the key light onto the table (y = 0) and fill black on a half-resolution layer; a second layer holds the footprints of facets lower than 0.22 units. Multiply into the frame: the soft pass blurred 18px at 40%, the contact pass blurred 7px at 60%.

## Type and numbers
- Space Grotesk 700 for everything printed; Space Mono 400 for the small episode line (about 17 print px).
- Printed through an affine map from a flat print space onto the facet, so lettering foreshortens with the card and follows it as it folds.
- Headline on a title card: two lines, ink then coral on the key word, each line 34-42% of the card face height, never below 110px on screen. Tag cards (word only): 55-70px on screen, card sized so its height is 1.4 times the text. Key number: 0.4-0.55 of card height, at least 100px, with its caption in the quantity colour.
- Numbers are live prints on a tent card, redrawn every frame: a count to a large value is `final * clamp(u)^2.2` with commas; a percentage steps through its columns. When it lands, switch its colour to coral.
- Fit rule: shrink a line to 90% of the card width if it overflows.

## Diagrams: arrows, labels, charts
- Arrow: a creased strip lying on the table, half-width 0.22 units, centre crease raised 0.05, head 0.55 long and 2.2 half-widths wide with a slight ridge. It grows tail to head in 0.5-0.7 s (eased `p`). A label is printed on the half facing the camera.
- Label: a tent card next to the thing named; it folds up in 0.3-0.4 s from flat (hinge angle `atan2(h, 0.34) * u`, back panel 3% darker, ridge at the top).
- Chart: pleated columns, 0.62 apart, heights `value * 2.25`, one every 0.25 s, each easing out in 0.3 s; alternate teal and mustard, the final one coral; a flat cream arrow lies under them as the axis with a tag card.
- Right and wrong are paper strips: two red strips crossing in an X (0.07 wide, the second 0.03 forward), or two green strips bent into a tick. A panel can flip about its vertical axis to swap a wrong word for the right one.

## Motion
- Unfolding: each vertex starts at a flat footprint (the model's centre plus its offset times 1.05, spread outward by 0.55 times its height, y about 0.006). Per vertex progress `u = clamp((t - start - dur*0.45*h)/(dur*0.55))`, `h` the vertex's normalised height, then `H.ease.outBack(u, 1.4)`. The base opens first and the top last, so the paper blooms upward. Durations 0.45-1.6 s. A lone sheet drops in instead: from (-0.6, +2.2, +0.4) units away with `H.ease.outQuad`.
- Dolly: the camera x moves on the table in `H.ease.inOutCubic` moves of 0.7-1.0 s with 1-2 s holds. Push-in for a wrong guess: eye 1.2 units toward the target, down 0.2, in 1.3, over 0.45 s, back over 0.5 s.
- Hopping figures: height `|sin(7t)| * 0.18` units, one tap each landing. A hovering prop bobs `sin(2.4t) * 0.09` with blades turning at 22 rad/s and a translucent disc (rgba(255,255,250,0.16) fill, 0.28 line) once airborne.
- A wrong-guess panel shakes: `sin(55t) * 0.05 * decay` for 0.45 s.
- Key light drifts slowly: x offset +0.16 across 5 s, z swings by 0.1 on `sin(0.8t)`.

## Scene changes
No cuts. The table is one long strip: dolly to the next area while the last item of the old beat folds flat or slides out. Items that would end up clipped at the frame edge must fold down before the dolly passes them. Flare the key light only for the wrong guess and the final number. Stay on the same stretch when an idea builds on the last one.

## Finishing passes (run every frame, same strength)
1. Light flare: `screen` fill rgba(255,240,215, `0.18 * exp(-((t - t0) * 5)^2)`) at each flagged moment.
2. `H.vignette(ctx, {strength: 0.28, color: '#1e2828', inner: 0.55})`.
3. `H.grain(ctx, t, {strength: 0.022, cell: 2, fps: 24, mono: true})`.
4. Shadows and paper layer as above; the order is sweep, shadows, paper, flare, vignette, grain.

## Sound palette
Paper on a quiet table; panning follows the object's screen x, at most +-0.6.
- element appears (fold): over the fold time, pink bandpass `k.noise` (f 900, q 0.6, gain 0.095, a 55% of the fold), three 18 ms crackles (bandpass f 1750, gain 0.07), then the crease.
- crease: bandpass `k.noise` f 1700 q 1.1 dur 0.028 gain 0.55 plus brown lowpass f 520 dur 0.07 gain 0.42.
- label lands: fold plus crease at gain 0.6, small.
- arrow completes: bandpass f 850 q 0.7 gain 0.08 across the grow time (attack 40% of it), ending in a crease at 0.45.
- drawing / writing: none, text is printed. Count ticks: bandpass f 1500 q 1.6 dur 0.02 gain 0.26 plus `k.tone` 240 Hz (dur 0.03, gain 0.05), every 0.15 s tightening to 0.095 s; end on a crease and a soft triangle tone G3.
- scene change (dolly): brown lowpass `k.noise` f 320 gain 0.09, length of the move.
- wrong: `k.play('slap', t, {gain: 0.55})`, `k.play('thud', t, {f: 120, gain: 0.55})`, triangle `k.tone` D3 then A2 (0.16 s, 0.32 s), `k.play('paper', t, {dur: 0.35, gain: 0.3})`.
- right: crease at 1.3 plus `k.play('success', t, {f: 'G5', gain: 0.6})`.
- key number: `k.play('impact', t, {gain: 1.25})`, a short pink sweep, `k.play('ding', t, {f: 'E5', gain: 0.65})`.
- takeaway: `k.play('ding', ...)` at C4, G4, E5, 0.09 s apart.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.3})` and `k.music(0.3, DURATION - 0.2, {mood: 'calm', bpm: 64, gain: 0.24})`.

## Signature moves
- Every object blooms from a flat footprint, base first, with a small overshoot.
- Lettering is printed on cards and arrows and foreshortens with them.
- Valley and mountain creases drawn between facets, two-tone undersides.
- A pleated column chart rising one fold at a time.
- A single warm light flare, only on the mistake and the result.
- A hovering prop with spinning paper blades and a translucent disc.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Facets have outlines or black edges | fill and edge in the same colour, plus a faint pale edge line |
| Everything the same brightness | per-facet intensity from key, fill and bounce; two-tone undersides |
| Paper looks plastic | fibre tile through `source-atop` on the paper layer only |
| Shadows float | add the tight contact pass under every low facet |
| Items pop in | bloom from flat with a height-delayed wave |
| Lettering looks pasted on | affine-map it onto the facet |

## Hero frame recipe
1. Cached sweep: four-stop gradient, light pool, fibre at 0.6.
2. A tent title card (5.2 units wide, 1.55 high) at the left, two lines, the second in coral, 120px on screen.
3. A faceted model centre, about 1.4 units tall, in teal with indigo accents, every facet shaded, two crease kinds visible.
4. A mustard arrow lying toward a small tag card; a row of pleated columns on the right.
5. Soft and contact shadows multiplied; paper layer with fibre; then vignette 0.28 and grain 0.022.
6. Check against a photograph of folded card: facets must differ in brightness, creases must be crisp lines.
