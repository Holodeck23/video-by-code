---
id: vaporwave
name: Worn Tape Dreamscape
family: Retro digital
fonts: [VT323, Noto Serif JP, Inter]
best_for: dreamy or ironic explainers, tech nostalgia, pop-culture and internet topics, "the 90s future" tone, ideas told as a sequence of channels or chapters
avoid_for: serious data work, anything medical or financial, long text blocks, audiences who need a clean and neutral look
---

# Worn Tape Dreamscape

The viewer believes they are watching a pastel, over-played VHS tape of an imaginary 1990s dreamworld: a striped sunset over a glowing perspective grid, palm silhouettes, a pale marble statue on a chequered plinth, Japanese captions, pop-up windows. The one thing that sells it is the tape itself: soft smeared colour, wobble, a tracking band that crawls down, and VCR on-screen text that stays on top.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Sky (top to horizon) | #1b0b3f, #4a1d7a (0.32), #b03aa8 (0.62), #ff7ac0 (0.86), #ffc0d8 | vertical gradient down to the horizon |
| Sun (top to bottom) | #fff27a, #ffa45c (0.45), #ff4f9a (0.75), #d9208e | clipped disc |
| Floor | #2a0a52, #1a0538 (0.5), #0e0224 | below the horizon |
| Grid passes | #ff3cc8 / #78f0ff / #c8ffff | wide glow, mid line, hot core |
| Palm silhouettes | #2a0b4c far, #1a0634 near | flat fills |
| Chroma split pair | #00f0ff and #ff2bd6 | text and glitches only |
| Text | #fff4fb (body), #ffe9f6 (subtitle), #2a0b4c (ink on pastel) | |
| Accent (neon line) | #7ff8ff | the single most important line or ring |
| Pop-up surface | #e9ddff with #6a4a9a shadow edge; title gradient #ff71ce to #01cdfe | |
| Error / right | #ff2b6a / #00c896 | rarely |
| Loop line | #b9a2ff | |
| Marble | #fbf6fb, #e6dcea (0.45), #a996c4 (0.8), #6f5a9e | statue lighting, left to right |
| Plinth | #111, #f4f0f6 checks; top #d8cfe6; side #3a2066 | |
| Tape blue | #1f33d6 | the VCR no-signal screen |

## Ground and surface
The picture is a pastel world drawn clean, then the whole frame goes through the tape pass. At 1920x1080 the horizon sits at y = 678.
1. Sky: vertical gradient above. Stars: 90 specks (2.25px) in the top 55% of the sky, `H.rng(77)` positions, alpha (0.2-0.8) * (0.6 + 0.4 sin(3t + i)).
2. Sun (disc radius 315, centre y = 573, x per scene): gradient fill, then cut slices with `destination-out` on a scratch layer: gap k starts at centre - 0.42R + 36k + scroll, thickness 2.25 + 18f where f rises 0 to 1 from 0.45R above the centre to 0.3R below it; scroll = (21t) mod 39 (the slices creep downward). Behind it a radial glow from 0.8R to 1.6R, rgba(255,170,120) 45% to rgba(255,100,180) 0.
3. Floor: vertical gradient; horizon haze band from 45px above to 90px below the horizon, rgba(255,140,210) peaking at 55% at stop 0.35. Grid in true perspective: vanishing point x = 960, focal length 390, camera height 1. Lengthwise lines at world x = 0.9i for i in -26..26 from depth 0.35 to 60; crosswise lines at depth 0.4 + 0.9k minus a scroll of (1.6t mod 0.9), y = horizon + 390/depth. Stroke three additive passes: 10.5px rgba(255,60,200) 22%, 4.5px rgba(120,240,255) 35%, 1.8px rgba(200,255,255) 90%. Finish with a 105px fade of rgba(255,150,215) 85% to 0 over the horizon so the lines melt into haze.
4. Palms: segmented tapering trunk (22 segments, half-width 5.5% to 2.8% of height, curved by `lean`), three coconuts, 9 fronds fanned over 1.55 pi with random jitter +-0.12 rad, each a quadratic rib plus 16 leaflet pairs of length 0.11h*sin(u*pi) + 0.02h. Far pair at (262, horizon+60) h 390 lean -0.12 and (1680, horizon+75) h 375 lean 0.16 in #2a0b4c; near pair at (105, horizon+180) h 600 lean 0.28 and (1837, horizon+210) h 645 lean -0.3 in #1a0634.
5. Statue and plinth (cache each scale with `H.offscreen`): carve one pale silhouette path, clip, fill the marble gradient left to right; paint soft radial form blobs (lilac shadow rgba(76,46,124) 48-58% in sockets and under protrusions, white 35-60% on catch-lights); 7 vein polylines (40 steps of 7px following `H.noise` angle, stroke 0.6-1.8px rgba(120,100,150) 18-40%); a pink rim, 16px rgba(255,120,200) 55%, blurred 6px, offset -10px. Last, two knock-out edges: a crisp #fff6ff rim at 75% (copy offset +3.2,+2.4 removed) and a #4a2a7e core shadow at 40% (offset -2.6,-3.4), so it reads carved. Plinth: 8x4 chequer, top face a 39px-deep parallelogram, side face with 18% white check hints.

## Mark-making
**Chroma text:** draw three times, cyan at (+off, +0.6off), magenta at (-off, -0.4off), the body colour on top. off is 3-9px, rising to 9-15px with a 30 rad/s jitter on a hit. Behind pale text on busy ground add a legibility underlay: aubergine rgba(30,0,60) shadow blur 21 plus three strokeText passes rgba(40,0,70) 50%, width 6-12px.
**Neon line:** progress along a polyline (`H.partial`); stroke twice: coloured, width 4.5px, shadowBlur 24 in the same colour; then a white core at 0.35 of the width, 80%. Finished arrows get two barbs 27px long at +-0.5 rad. Charts use 12px lines, errors 6px.
**Pop-up window:** a hard 12,15px shadow rgba(40,0,80) 35%, body #e9ddff, 3px white top/left bevel and #6a4a9a bottom/right, a 39px title bar with the pink-to-cyan gradient and a 36px VT323 title, a close box. Pill buttons: 225x84 rounded fully, active #ff71ce, resting rgba(40,0,80) 60%, 3px white outline.
**Photo card:** #fbf6ff, 138x168 with a 114px pastel gradient window (#ffb3e6 to #c9a6ff or #9ff0ff to #ffd6a5), a dark #2a0b4c silhouette, caption in VT323 54px below, shadow blur 21 offset-y 9 rgba(40,0,80) 45%, small tilt +-0.15 rad.
**Glitch composite:** render the object to a scratch layer. Add two tinted copies at 40% `lighter`: cyan shifted -15*g px, magenta +13*g px (fill each with `source-in`). Then redraw the layer in horizontal slices of random height 6-60px, re-rolled at 8 Hz via `H.rng(floor(t*8) + seed)`, each slice displaced +-60*g with 15-18% chance. While an object materialises, skip a fading share of slices: probability 0.7 * clamp((t0 + 0.35 - t)/0.35).

## Type and numbers
- Hook line: Inter 600 87px, letter-spacing 18px, chroma text; typed on at 0.035s per character, with a 45px horizontal shake in the last 0.35s. Subtitle line: Noto Serif JP 700 45px under it (Japanese rendering of the idea, appears when the line completes).
- Headlines and takeaways: Inter 600 84px, spacing 9px, two lines typed at 0.03s per character, with a Japanese line in Noto Serif JP 700 48px below.
- Labels and OSD: VT323 400, 51-72px, white with a 3px black drop shadow (rgba(0,0,0,0.7)).
- Counters: VT323 120px (a tape counter); key number Noto Serif JP 900 195px chroma text, off jittering 9-15px for a beat when it lands.
- Katakana stamps: one glyph per 0.11s, chroma offset 6 + 21*exp(-8*age) px.
- The persistent header becomes a VCR menu after the opening: "▶ TITLE" VT323 54px at (60, 87), and a chapter line "CH n - NAME" VT323 45px below it.

## Diagrams: arrows, labels, charts
- Arrows: neon lines (see above); on the floor they are rows of chevrons projected with the grid (`depth` 1.35), each 4 strokes of 9px #7ff8ff with blur 21, sliding at 0.9 world units/s.
- Items travelling to an object slide along the floor as photo cards: position eased with `H.ease.inOutCubic`, lifted by sin(p*pi)*90px, scale 1.7 to 0.45, fade out over the last 20%.
- Labels: Inter or VT323 on a dark OSD plate (rgba(20,0,40,0.62), 1.5px outline rgba(255,190,240,0.45), radius 12) when it sits on busy ground.
- Loop: three pills in a row (active one pink), connected by a returning neon line in #b9a2ff.
- Chart: a panel rgba(30,5,60,0.55) over the sky, 5 horizontal gridlines rgba(255,255,255,0.45) 2px, a 12px pink neon line, white dots every fourth point, axis label in VT323 63px.
- Wrong: a hard red ✕ with chroma split plus an ellipse stroked on over 0.3s. Right: a green ✓ and a word.

## Motion
- Easing: `H.ease.outCubic` for arrivals, `H.ease.inOutCubic` for travel. Sun rises 390px over 1.6s, palms slide in from 540px and 390px outside the frame over 1.0s. The grid always scrolls; the sun's stripes always creep; the star twinkle never stops.
- Nothing stays pixel-still: wobble and the tracking band move everything slightly (see Finishing).
- Objects arrive by glitching in, not by sliding into place.

## Scene changes
A tape cut, 0.5s:
1. The pad music slows to a stop 0.28s before the cut.
2. A 0.12s no-signal screen: #1f33d6 fill with 50 pale scanline streaks (height 1.5-6px, alpha 0.05-0.4, re-rolled at 24 fps) and a "▶▶" in the corner.
3. The new picture rolls into lock: vertical offset = 0.85 * frame height * (1 - `H.ease.outCubic`(clamp((since - 0.12)/0.38))), with a black bar of 33px at the seam while it rolls.
4. A final sticky thump marks lock. Between related beats stay continuous and only move the sun and objects.

## Finishing passes (run every frame, same strength)
Order: picture, then headline text, then 1, 2, 3, 4, then OSD stamps, then vignette.
1. Tape pass, per pixel row on the whole canvas: luma stays sharp; chroma is low-passed (box window of +-7px, 42% mix, delayed 3px right); red sampled 4.5px right and blue 4.5px left; row wobble = `H.noise` n2(row*0.05, t*2)*3.3px; odd rows at 90% (scanlines). Bottom 14 rows: head-switch skew, shift left by 9 + 39*s^2 (s rises 0 to 1) + random 9, with 8% white specks.
2. Tracking band: height 90px, moves top to bottom, y = frac(0.21t + 0.3) * (H + 160) - 80. Inside, weight b = sin(pi * position): extra row jitter +-36*b, white streaks up to 570*b px, 5% white specks, 6% desaturation. Reduce b to 15% over rows where text must stay readable.
3. Blue screen (only on a cut) and the roll offset from Scene changes.
4. `H.grain(ctx, t, {strength: 0.07, cell: 2, fps: 24, mono: true})`, 0.16 for the opening second.
5. OSD stamps, crisp on top: "PLAY ▶" at (W-255, 87), tape counter "SP 0:mm:ss" at (W-345, H-51), date line at (60, H-51), VT323 51px.
6. `H.vignette(ctx, {strength: 0.45, color: '#140028', inner: 0.55})`.
Cost: this is 2M pixels per frame; reuse typed arrays and if needed run the pass at 960x540 and scale up.

## Sound palette
- element appears: crackle, `k.noise(t, {dur: 0.05, filter: 'bandpass', f: 1800, q: 0.7, gain: 0.07})`, every third typed glyph.
- label lands: soft e-piano bell: `k.tone(t, {f: 'C5', dur: 1.4, gain: 0.12, a: 0.006})` plus the octave up at gain 0.03, dur 0.4.
- arrow completes: neon draw: a 30ms zap (bandpass f 1200, q 1.5, gain 0.12), a sawtooth tone at 120 Hz for the line's length (gain 0.07), `k.play('neon', t, {dur: drawTime, gain: 0.8})`.
- drawing / writing: typed text crackles; counters tick at most 12/s: `k.noise` 12ms bandpass f 1900 q 3 gain 0.16, pan -0.5.
- scene change (tape cut): two sawtooth tones sliding down to about 30% of their pitch over 0.28s (gain 0.07 and 0.05), `k.play('thud', c, {f: 85, gain: 0.45})`, a 15ms clunk at f 1300 gain 0.3, a 0.14s whirring noise (bandpass f 1800, q 3, gain 0.1), a 0.4s pink lowpass slide (f 900, gain 0.09) from c+0.12, and a brown thump at c+0.5 (f 400, gain 0.25, minor).
- wrong / right: wrong = three sawtooth tones E4, Bb3, F3 with `glideTo` 82% of start, dur 0.6, gain 0.06, plus `k.play('thud', t, {f: 90, gain: 0.6})` and a loud crackle. right = a four-note major-seventh arpeggio F4 A4 C5 E5 at 0.07s steps, bell voice.
- key number: `k.play('impact', t, {f: 80, gain: 0.9})`, a five-note sawtooth chord F3 C4 E4 G4 A4 (dur 1.6, gain 0.05, spread pan), then bells C5 and G5 at +0.05 and +0.2.
- takeaway: bells F4 C5 E5 A5 at 0.1s steps (gain falling from 0.9) plus a low triangle F2 (dur 1.8, gain 0.16).
- bed or music: `k.bed(0, DURATION, {kind: 'tape', gain: 0.5})`, `k.bed(0, DURATION, {kind: 'hum', gain: 0.2})`, and per scene `k.music(t0, t1, {mood: 'dreamy', bpm: 60, key: 'F', gain: 0.5})` ended 0.25s before each cut.

## Signature moves
- The sunset sun whose stripes creep downward forever.
- Objects glitch into existence slice by slice with a cyan/magenta ghost.
- Every cut is a tape cut: blue screen, then a vertical roll into lock.
- The header becomes the VCR's on-screen menu; the counter is tape-counter digits.
- Pop-up windows and pill buttons doing the explaining, in pastel Windows-95 style.
- Japanese captions with chroma split under every important line.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Colours stay sharp and clean | the per-row tape pass with chroma low-pass and red/blue offset |
| Flat gradient sunset | slices that creep, a glow ring, the horizon haze |
| Text is plain | three-layer chroma text plus a dark underlay when it sits on busy ground |
| Band covers the story | weight the band down to 15% over readable text rows |
| Static grid | scroll the crosswise lines, keep perspective maths honest |
| Too many neon colours | pink, cyan and violet only; green and red for right and wrong |

## Hero frame recipe
1. Sky with stars, sun at centre x 705, grid floor, horizon haze.
2. Far palms and near palms in the corners.
3. Statue on the plinth near x 1260, glitch composite at g about 0.6.
4. Hook line typed in Inter 87px with chroma split near (960, 450), Japanese subtitle below, then the VCR menu line.
5. Tape pass, grain 0.07, OSD stamps, vignette. Check: edges must smear horizontally, and the tracking band must cross the picture once every few seconds.
