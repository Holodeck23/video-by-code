---
id: pointillism
name: Divisionist Dabs
family: Painterly
fonts: [Playfair Display]
best_for: warm, human, optimistic explainers; learning, growth and discovery stories; soft sunlit subjects; anything where a gentle, craft-made look signals care
avoid_for: dense data, fast cuts, tiny text, hard technical or alarming topics, anything that needs crisp UI or exact numbers at small size
---

# Divisionist Dabs

The viewer believes they are watching a painter build a sunlit canvas out of thousands of small touches of pure, unmixed pigment. Colours never blend on the surface; neighbouring dabs of complementary hues do the mixing in the eye, and the woven canvas shows through between them. Because each dab can re-choose its hue a little, everything softly vibrates like light on water.

## Palette
Thirteen pigments, all used pure. There is no black and no grey: darks are blues and violets, lights are creams and lemons.
| Role | Hex | Notes |
|---|---|---|
| Ground (canvas) | #e8dec6 | warm primed linen |
| Weave thread | #968264 | at 10-16% alpha, only to draw the weave |
| Primary ink | #2c3ea8 | ultramarine; with #24225c deep ultramarine and #7e52a8 violet it forms the "ink" mix for text and lines |
| Accent | #d6422c | vermilion; the single most important thing; mixes with #f0962e orange and #e88a9c rose |
| Right / growth | #249460 | emerald; with #9ec43e yellow-green and #1c5442 deep viridian |
| Light | #f8d840 | lemon; with #faf6e6 lead white and #cc9648 ochre for sunlit areas and gold |
| Cool mid | #4a92d6 | cerulean; skies, water, glints of cool |
| Dab shadow | rgba(52,38,74,0.42) | a hard shadow under every dab |

Complement table (index of the opposite pigment), used for the "vibration": lemon-violet, orange-cerulean or ultramarine, vermilion-emerald, rose-yellow-green, viridian-vermilion, ochre-ultramarine, deep ultramarine-ochre, lead white-itself.

## Ground and surface
1. Canvas, cached with `H.offscreen`: fill #e8dec6, then 1px horizontal threads every 4px in #968264 at 16% alpha and vertical threads every 4px at 10%.
2. The dab field is fixed, built once from `H.rng(2025)`. Lay a staggered grid at pitch 8.4px (odd rows shifted half a pitch, row step 0.87 x pitch, jitter +-2.4px horizontally and +-2px vertically), about 34,000 dabs at 1920x1080. Each dab stores: position, radius `rng.range(3.9, 5.1)`, an angle, and a stable random `q` in 0..1.
3. Angle follows a slow flow field: `-0.6 + 0.5 * H.noise(2026).n2(x*0.0027, y*0.0027) + r.range(-0.18, 0.18)`. Every dab is an ellipse with minor/major ratio 0.6, so strokes seem to follow a brush hand and about 60% of the canvas is covered.
4. The colour study: a hidden canvas (half resolution, 960x540, is enough) painted with soft gradients as a smooth, ordinary picture of the scene. Dabs never show it; they sample it at their centres. Rules for painting it: sky cool at top fading to warm cream at the horizon, grass lit yellow-green fading to viridian in shade, cast shadows a blurred violet (`rgba(96,70,150,0.55)`, blur 15px) thrown down and away from the light, a warm halo around anything cool and glowing. Use no black: shadows are violet, deep blue or deep green.
5. Text and diagram labels sit on feathered pale-peach patches in the study (rgb(250,232,214), blur 20px, no hard edge) so the dabs thin and lighten behind them.
6. Static study elements are cached with `H.offscreen`; animated ones (things drifting or swaying) are drawn into the study each frame, and the dabs follow them.

## Mark-making
**Optical mixing, per cell.** Divide the canvas into 12px cells; each cell keeps a running sum of the pigment RGB already placed (`acc`) and a count `n`. Visit dabs in a fixed order. For each dab:
```
T  = study colour at the dab centre
want = T * (n + 1) - acc[cell]            // what this dab must add to keep the cell on target
cost(p) = squaredColourDistance(P, want, greenWeight=1.2) + seededTieBreak(q,p)*2600
if dark(T) (r+g+b < 330): cost *= 0.78 for violet, ultramarine, deep ultramarine
best = argmin cost, second = runner-up
pick = best; if (q*7919)%1 < 0.16 then second; else if (q*7919)%1 > 0.93 then complement(best)
acc[cell] += pick.rgb; n++
```
The per-dab stable term in `cost` replaces random noise so the field is identical every frame.

**Shimmer.** After the pick, each frame flips about 5% of dabs between their best and second pigment, chosen from `H.rng(7000 + floor(t*6))` (a new draw 6 times a second). The scene's average colour holds, but the surface vibrates slowly.

**Rendering dabs.** Group dabs by pigment; for each pigment build ellipses in chunks of 600 sub-paths and fill each chunk once, with `shadowColor` rgba(52,38,74,0.42) and shadow offset (1.8, 2.4), so every dab throws a hard small shadow toward the lower right (light from the upper left). Optional relief pass: lighten the upper-left rim of each dab by 20% and darken the lower-right rim by 17%.

**Fine dabs** (text, arrows, rings, numbers): the same medium with a smaller, round-ish brush.
- Letter dabs: rasterise each glyph once (cached per character and size), sample it on a grid of step `max(2, size/30)` px with +-0.75px jitter, keep samples with alpha above 110, radius `step * rng.range(0.72, 0.92)`. Each dab picks a pigment at random from a mix: ink mix `[ultramarine x4, deep ultramarine x2, violet, ultramarine, vermilion-free]`, red mix `[vermilion x3, orange, rose, vermilion]`, green mix `[emerald x2, deep viridian x2, yellow-green, violet-free]`, gold mix `[lemon x2, orange, white, ochre]` (pick by index, no fixed order).
- Path dabs: every 3.6px along a path place `max(1, round(width/3.6))` dabs across its width, offset jitter +-1px, radius 1.6-2.2px, pigment from the colour mix.
- Arrow head: two arms at +-0.55 rad from the reverse direction, length `3.2 x width`, a dab every 3.3px, two per step.
- Ring: an ellipse path starting at -0.6 rad running 1.08 turns (overshoots its start), 50 points, 10px wide.

**Border.** 2600 dabs scattered within 3-24px of the frame edge (cached), pigments from `[ultramarine x3, deep ultramarine x2, violet, orange, vermilion]`, radius 3-4.2px, drawn with the same shadow; then a 1.5px keyline inset 29px in rgba(40,40,90,0.35).

## Type and numbers
- Font: Playfair Display 800 italic, built from dabs. All sizes are for the glyph raster.
- Opening question: 126px, centred; it dabs on left to right (reveal 1.1 s, each letter popping in as the sweep reaches it), then shrinks to a corner header of 66px at (54, 99) over 0.9 s with `H.ease.inOutCubic`.
- Labels: 48px (never below 42px). Big single-word answers: 132px. Key number: 144px. Counters: 99px, percentages 102px, in ink; the final value dabs in the red mix.
- Writing: letters sweep on left to right; a dab appears when its `q` is below the letter's reveal value, so letters thicken from sparse to solid.
- Numbers update by redrawing the whole numeral as dabs at a change (cached per character); step them at most 12 times a second, with separators; large counts ease in (`H.ease.inQuad`) over 2.5 s, percentages ease out.

## Diagrams: arrows, labels, charts
- Arrows: path dabs 8-10px wide with the arrow head; ink mix for flow, red mix for return or correction. Reveal by progress along the path (0.3-0.7 s).
- Labels: dab text beside the object, placed on a peach patch in the study.
- Emphasis: a dabbed red ring (above); two crossing slashes of 18px for "wrong"; a green-mix tick 17px for "right".
- Chart: a filled region in the study (warm lemon-orange gradient, violet shadow offset 24px) with the dabs doing the fill. The outline is a path-dab line 9px wide that draws left to right; axes are 6px lines. A lone highlight glow (radial cream) on the final point.

## Motion
- Dabs do all the moving: when a thing in the study moves (drift 18px/s, sway of 0.05 rad), the dabs under it re-pick their hue as it passes, so it seems to shimmer across the canvas.
- Entrance: dabs pop in with `H.ease.outBack`, radius from 0 to full over 0.09 s. A scene builds top-down: each dab starts at `0.12 + 2.7*(0.45*q + 0.55*y/H)` seconds.
- Fine dabs reveal along their direction of travel; text left to right, paths from start to end.
- Everything else is slow: the 6 fps shimmer, a 0.9 s header move, nothing faster.

## Scene changes
Replace the old painting with a diagonal front of new dabs over 0.8s. Move the front smoothly from beyond the upper-left to beyond the lower-right; evaluate each dot's signed distance from that front using x plus 0.35 times y.
- `d > 0` (behind the front): the dab samples the NEW study, and within the first 135px behind the front its radius pops with `outBack` (a bright band of new dabs).
- `-75 < d < 0` (just ahead): the dab shrinks to 50% of its size.
- Fine dabs are clipped to the same slanted line: old overlay ahead of the front, new overlay behind it.
- Use it for every change of subject. Stay in one scene if it only adds items.

## Finishing passes (run every frame, same strength)
1. Canvas weave first (cached), dabs second with their hard shadows.
2. The border dabs and keyline on top.
3. Optional relief pass on the dab layer (upper-left rim +20%, lower-right rim -17%).
4. No grain, no vignette, no blur: the weave and dab shadows are the texture. The only live element is the 6 fps hue shimmer.

## Sound palette
Soft, wooden taps: one dab is a small touch of brush on canvas. All of these are minor.
- element appears (a dab "patter"): `k.noise(t, {filter: 'bandpass', q: 1.4, f: 750 + r()*650, dur: 0.018, gain: 0.28, a: 0.002, minor: true})` plus `k.noise(t, {color: 'brown', filter: 'lowpass', f: 450, dur: 0.025, gain: 0.2, minor: true})`; fire taps along a path at 8-18 per second, spaced `(0.6 + r()*0.8)/rate`, gain 0.55-1.05, panned along the path's x.
- label lands: patter at 12/s for the text window, gain 0.6-1.
- arrow completes: patter at 14/s over the draw time, panned from start to end.
- drawing / writing: same patter, rate 12/s for text and 14/s for lines.
- scene change (re-dab sweep): a dense patter at 34/s over the sweep, panned -0.8 to 0.8, plus `k.noise(a, {color: 'pink', filter: 'bandpass', f: 600, q: 0.7, dur: d, gain: 0.09, a: d*0.45})`.
- wrong: heavy patter at 30/s (gain 1.6) over each slash, `k.play('thud', t, {gain: 0.45, f: 115})`, then triangle `k.tone(t, {type: 'triangle', f: 'A3', gain: 0.17, dur: 0.2})` and `k.tone(t + 0.18, {type: 'triangle', f: 'F#3', gain: 0.17, dur: 0.38})`. right: `k.play('success', t, {f: 'G5', gain: 0.45})`.
- key number (biggest hit): `k.play('impact', t, {gain: 0.85})`, a 40/s patter for 0.18 s at gain 1.6, `k.play('ding', t + 0.02, {f: 'D5', gain: 0.5})`, and two held `k.tone` notes G4 and B4 (dur 1.3, gain 0.07).
- takeaway: `k.play('ding', t, {f: 'G4', gain: 0.45})` and a held B4, D5, G5 chord (dur 1.2, gain 0.065, 0.06 s apart).
- bed: `k.bed(0, DURATION, {kind: 'room', gain: 0.4})` and `k.music(0, DURATION, {mood: 'calm', bpm: 64, key: 'G', gain: 0.3})` for a slow sunny pad. Counter changes get one firmer tap each (`f` 900, gain 1.1), at most 12 per second.

## Signature moves
- A scene paints itself top-down from sparse dabs to a full canvas.
- A diagonal sweep re-dabs the whole frame into the next scene.
- Complementary dabs vibrate side by side while the average colour holds.
- Letters and arrows appear as fine dots sweeping along their path.
- A red dotted ring closes around the number that matters.
- The dotted border paints itself clockwise as the last touch.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Dots are a uniform grid | stagger rows, jitter +-2.4px, ellipses with a flow-field angle |
| Colours blended or averaged into mud | pure pigments only; use the cell target `want = T*(n+1) - acc` |
| Flat colour, no vibration | 16% runner-up picks, 7% complements, 5% per-frame flips at 6 fps |
| Shadows are black or grey | violet and deep blue in the study; dab shadows #34264a at 42% |
| Text unreadable | glyph dabs of 2px on a peach patch, minimum 48px labels, 126px headlines |
| Canvas looks like plain beige | weave threads every 4px at 10-16% alpha, visible between dabs |
| Shimmer too fast or noisy | flip at 6 fps and only 5% of dabs |
| Moving objects look pasted on | move them in the study and let the dabs under them re-pick |

## Hero frame recipe
1. Cached canvas weave; fixed dab field; study at 960x540.
2. Study: a cool sky to cream horizon; a distant band of hazy violet-green; water in cerulean with cream glints; sunlit yellow-green grass with a pooled violet shadow thrown away from the light; one warm halo around a cool glowing object.
3. Run the optical-mixing pass over all dabs with the stable cost term and the 16% / 7% rules; fill by pigment with dab shadows.
4. Add fine dab lettering: a 126px italic title in the ink mix, left to right, sitting on a peach patch.
5. Add the border dabs and the keyline.
6. Check at thumbnail size: the picture must read as smooth colour and, at full size, as individual dots with canvas showing between them. Re-check frame to frame: only about one dab in twenty changes hue.
