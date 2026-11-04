---
id: kinetic-type
name: Type Slam
family: Generative & type
fonts: [Anton, Inter, Space Mono]
best_for: hooks, manifestos, product and idea explainers with strong claims, anything that wants a music-video or title-sequence energy, numbers that must hit hard, short beat-driven stories
avoid_for: nuance, long sentences, delicate or intimate subjects, dense diagrams, anything that needs more than one idea per screen
---

# Type Slam

The viewer believes they are watching a title sequence cut to a 120 bpm track: words, not pictures, carry the story. Huge condensed capitals fill the frame edge to edge with almost no gap between rows, slam in on the beat with a shake and a stretch, then pulse and echo until the next word arrives. The frame is strictly two colours, so contrast between filled, outlined, inverted and knocked-out is the only vocabulary.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground | #0c0c0b | near-black; the only background |
| Primary ink | #e6ff2e | acid yellow-green; all fills, outlines, rules, tags |
| Echo ink | #e6ff2e at 18-24% | strobe copies behind a moving word, never a new colour |
| Accent | inverted block | an ink-filled tag with ground-coloured mono text; used for the single most important thing on screen |
| Alarm / wrong | one-frame inversion | `difference` fill with #ffffff for 1/30 s, which swaps to #f3f3f4 ground and #1900d1 ink; use on 2-3 hits per video |
| Knock-out | transparent | cut speed lines and letter cut-outs that show the ground through the ink |

Nothing else. Right and wrong differ by shape (tick vs. X) and by weight, never hue.

## Ground and surface
1. Flat #0c0c0b fill every frame. No gradient, no texture, no vignette.
2. Layout is on a 0.5 s beat grid (120 bpm). A word lands on a beat or an off-beat (0.25 s); nothing lands between.
3. Rows are sized by cap height, not font size. Measure `H` in Anton once at 200px (`actualBoundingBoxAscent / 200`) to get a cap ratio, then `size = cap / ratio`. Typical caps at 1920x1080: 192px for a small row, 393px for the dominant row, 450px for a one-word hook. Row gap is 18px; top margin 24px.
4. Width is fitted on the ink box, not the advance width: `actualBoundingBoxLeft + actualBoundingBoxRight`. Fit with `H.fitFont(ctx, text, maxWidth, px => '400 ' + px + 'px Anton', maxPx, minPx)`, then stretch horizontally with `ctx.scale(sx, 1)` so the word bleeds about 6-22px past each frame edge (translate by -6px first). Divide outline width by `sx` so strokes stay even.
5. Static, cacheable with `H.offscreen`: halftone dot screens and any word-sized scratch layers.

## Mark-making
- **Filled word**: Anton 400, solid ink, `lineJoin: 'miter'`.
- **Outline word**: `strokeText` only, 4.8px (3px for echoes and small labels); pairs with a filled neighbour to make rhythm.
- **Strobe echoes**: 2-3 outline copies behind the word at alpha `0.18 * (4 - e)`, each shifted +36px right and -6px up per step while the word moves, then fanned upward 45px per step once it settles; multiply their alpha by `0.6 + 0.4 * kick` where `kick = exp(-((t*2) % 1) * 6)`, so they pulse each beat.
- **Speed lines**: three horizontal knock-outs (`destination-out`) through the lower third of a filled word at 20%, 24.5% and 29% of cap height above the baseline, 6px, 4.5px and 3px tall.
- **Slice glitch**: on a heavy word, cut a band at 60% of cap height (42px tall), shift it sideways by `33 + 39*kick` px, and add two hairline rules (3px tall) beside it: one 18px under the band, length `shift - 18`, one 10px above, length `0.6 * shift`.
- **Inverted tag**: an ink rectangle (text width + 24px, font size + 18px tall) with Space Mono 700 text in ground colour; the hollow variant is a ground rectangle with a 3px ink border and ink text.
- **Block shadow box**: an ink rectangle offset (14, 14) behind a ground-coloured face with a 4.5-6px ink stroke; use it for a labelled container or a card.
- **Halftone fill**: dots on a 45 degree screen, step 13.5px, radius `sqrt(brightness) * step * 0.62`; skip dots under 0.5px. Mask a stretched word with it (`destination-in`), then add a 3.6px outline so the letters hold their shape.
- **Hatch fill**: for bars, 4.5px stripes on a 9px pitch inside a 3px rule, alternating with solid bars.

## Type and numbers
- Anton 400 for every word and number. Headline caps 270-450px; a key word 225-345px; a counter cap 96px; the hero number cap 375px.
- Space Mono 700 for tags and metadata: story-critical tags 42px, 3px letter-spacing for a header at 42px, timecodes and decoration 27px only.
- Inter 800 only for a rotated tab word (138px, knocked out of an ink tab 156px wide).
- Words appear whole, on a beat: pop-in scale `1 + 0.4 * (1 - H.ease.outQuad(u))^2` over 0.16-0.2 s, or a slide (below). Never typed, faded or one-letter-at-a-time.
- Counters: big counts in log space, `10^(6 * H.ease.inOutCubic(u))`, percentages with `H.ease.inOutCubic`; whole numbers with separators. On landing, punch scale `1 + 0.18 * exp(-(t - t0) * 10)`, speed-line knock-outs, and a one-frame inversion. The unit word beside it is an outline word with two echoes.
- Never lowercase except tags.

## Diagrams: arrows, labels, charts
- Arrow: a heavy rule as a filled polygon (shaft 9-39px thick, head 1.1x the shaft length at 60% of the head width), drawn on over 0.3 s; the big takeaway arrow is 39px thick, 105px head, with three outline echoes 39px apart and two knocked-out speed lines.
- Loop icon: a heavy circular arrow, stroke 9px, arc from -0.35 PI to 1.25 PI with a filled triangular head.
- Process path: dashed line, dash `[24, 15]`, 7.5px, `lineDashOffset = t * 120` so it marches; ends in a filled head.
- Label: an inverted tag that drops onto its target from 90px above with `H.ease.outBack(u)` over 0.25 s, landing exactly on the beat after the target appears.
- Wrong: an X from two 30px butt-cap strokes, 0.12 s each, plus the one-frame inversion; the label changes to hollow. Right: a three-point tick, 24px, square caps, 0.2 s.
- Chart: 6px baseline, 12 bars on a 65px pitch, heights ease-out over 0.3 s staggered 0.12 s, alternating solid and hatched; the key value sits in an inverted tag above the tallest bar; the emphasis box draws a 9px perimeter around the key number over 0.25 s.

## Motion
- One idea per beat. Hold 1-2 beats, then the next word hits.
- Camera shake: on every slam, `amp * sum(exp(-(t - c_i) * 14))` with amp 18px, offset by `H.shake`-style jitter from `H.rng(floor(t*30) + seed)`; decays in about 0.25 s.
- Slam from below: offset 630px easing out over 0.2 s; on landing, vertical scale `1 / (1 + 0.06 * exp(-(t - t0) * 20))` for two frames.
- Whip from the right: offset 1350px, `H.ease.outQuad` over 0.26 s, echoes trailing at 3x the offset while moving.
- Springy stretch for a single big word: vertical scale `H.ease.outBack(u)` so it overshoots its box.
- Between beats: echoes pulse on `kick`, slice offset breathes with `kick`, a tab crosshair grows 9 to 13px with `kick`.

## Scene changes
- Slice-glitch tear (0.4 s): split the old scene into 9 bands of 120px; even bands exit left and odd bands right, each travelling `p * W` times 1.1, 1.45 or 1.8 (cycling with the band index), with `p = H.ease.inQuad(u)`; each strip carries a ground-coloured backing, so the new scene underneath is revealed as the strips leave.
- Whip-pan (0.3 s, `H.ease.inOutCubic`): old scene slides left by `1.2 W * p` with three copies at alpha 0.18, 90px apart; the new scene enters from the right.
- Corner shrink: after a hook, the stacked title scales to 7% and moves to the top-left as the running header with a 6px underline and a 3px short one.
- Cut on the beat, always; never dissolve.

## Finishing passes (run every frame, same strength)
1. Camera shake wrapper around all drawing (see Motion).
2. One-frame inversion: on hit frames only, `globalCompositeOperation = 'difference'`, `fillStyle '#fff'`, full-canvas rect, one frame at 30 fps.
3. `H.grain(ctx, t, {strength: 0.04, cell: 2, fps: 12, mono: true, seed: 91})`. Mono, so the picture stays two-colour.
4. Nothing else: no blur, no glow, no vignette, no drop shadows (the block shadow is hard-edged).

## Sound palette
- element appears (word slam): kick `k.tone(t, {f: 160, glideTo: 46, dur: 0.26, gain: 0.42, a: 0.002})`, snap `k.noise(t, {filter: 'bandpass', f: 1800, q: 0.8, dur: 0.06, gain: 0.22, a: 0.001})`, body `k.noise(t, {color: 'brown', filter: 'lowpass', f: 400, dur: 0.12, gain: 0.2})`; pan toward the word's x.
- label lands: `k.play('tock', t, {f: 650, gain: 0.32, minor: true})` at the settle moment of the drop.
- arrow completes: a band-passed whip `k.noise(t, {filter: 'bandpass', f: 1300, q: 1.5, dur: 0.3, gain: 0.07, a: 0.15, minor: true})`.
- drawing / writing: none; words hit, they are not written. Dashed paths: 6 square blips (`k.tone`, type square, dur 0.03, gain 0.04) spread along the path.
- scene change: tear = `k.play('glitch', t, {gain: 1.1})`; whip-pan = `k.play('whoosh', t, {dur: 0.34, gain: 0.8})`. Drop the music for the transition.
- wrong: slam at gain 1.3, a low stab (A#2 E3 A3 as three sawtooth tones, dur 0.45), an X-stroke noise swipe 0.12 s before. right: slam plus stab C4 E4 G4, then G4 C5 0.2 s later.
- key number: counter blips `k.tone` square f rising 700 to 1200, at most 10/s; at landing slam gain 1.6, `k.play('impact', t, {gain: 0.9})`, a stab A3 C#4 E4 A4 (dur 0.7, gain 1.4x), and a rising band-passed noise under the box draw.
- takeaway: three slams on consecutive off-beats (gains 0.85, 0.7, 0.95), then a long resolved chord C3 G3 C4 E4 G4, dur 0.65.
- bed or music: `k.music(0, DURATION, {mood: 'tense', bpm: 120, key: 'A', gain: 0.45})`, cut for 0.5 s at every tear or whip; stabs are two saw tones per note, the second 0.5% sharp.

## Signature moves
- Words crop the frame edge to edge with 18px between rows.
- A filled word beside an outline word with trailing echoes that pulse on the kick.
- The slice band: one strip of a heavy word shoved sideways with hairline ticks.
- One-frame inversion flash on the biggest hits.
- A stretched word filled with a developing halftone picture.
- Labels are inverted tags that drop onto their targets.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Letters float with air around them | size by cap height, stretch on the ink box, 6-22px bleed |
| Third colour sneaks in (grey, soft shadow) | alpha of the one ink only; mono grain |
| Everything eases softly | outQuad slam, hard cut on the beat |
| Static between hits | echoes, slice and crosshair breathing on `kick` |
| Flash lasts too long | exactly one frame; at most 3 per video |
| Shake smears the text | 18px, 0.25 s decay, jitter per frame |

## Hero frame recipe
1. #0c0c0b ground. Row 1: a small light word and an outline word, caps 192px, stretched to bleed 9px each side, with 3 echoes behind the second.
2. Row 2: one dominant filled word, cap 393px, stretched edge to edge, three speed-line knock-outs and a shoved slice band with two hairlines.
3. Row 3: a rotated ink tab 156px wide with a knocked-out word, and a stretched final word masked by a halftone picture (step 13.5px) with a 3.6px outline.
4. Shake offset from the last slam, grain 0.04. Compare: delete the grain and the frame must still read in exactly two colours.
