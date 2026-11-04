---
id: collage-zine
name: Photocopy Zine
family: Paper & craft
fonts: [Anton, Abril Fatface, Bebas Neue, Archivo Black, Playfair Display, Special Elite, Courier Prime, UnifrakturMaguntia, Rubik Mono One, Shrikhand, DM Serif Display, Oswald, Black Ops One, Permanent Marker]
best_for: critique, protest and counter-culture angles, "what is really going on" explainers, questions and verdicts, anything that should feel urgent, homemade and a little dangerous
avoid_for: corporate trust, soft or reassuring tone, medical or financial advice, long smooth data trends, anything the audience must read comfortably for minutes
---

# Photocopy Zine

The viewer believes someone is building a zine on a desk and running every spread through a worn photocopier: torn magazine scraps, letters cut from different headlines and pasted one at a time, masking tape, staples. The copier crushes everything to harsh black toner, and a single fluorescent pink ink prints over it slightly out of line. The picture moves in steps, like stop-motion, and nothing is ever clean.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (paper) | #f4f2ec | page and scrap stock |
| Scrap highlight | #f6f4ee | letter tiles, speech scraps, labels' white |
| Typed strip | #ece9e1 | slightly greyer paper for typewritten labels |
| Toner ink | #111111 | all black: text, marker, outlines, black tiles |
| Spot ink (accent) | #ff2f6d | fluorescent pink, second plate; the single most important thing, plus every "wrong" slash |
| Tape | rgba(120,116,105,0.42) | translucent masking tape over everything |
| Copier shadow | rgba(0,0,0,0.5-0.75) | hard offset drop under every scrap |

One spot colour only. Pink means emphasis or error; everything else is black on paper. No greys except tape, shadows and halftone screens.

## Ground and surface
Two plates are drawn into two transparent full-frame layers every frame: BW (toner, paper-filled) and SPOT (pink only).
1. BW starts as a flat #f4f2ec fill. SPOT starts empty.
2. Every opaque scrap does two things: it prints its fill and outline on BW, and it erases its own polygon from SPOT with `destination-out`, so pink never shows through paper laid on top. A pink scrap prints paper on BW, then fills pink on SPOT.
3. New pages are sheets: a polygon covering the lower part of the frame (from y = -30 or y = 144 to the bottom, 2040px wide), only its top edge torn (amp 10px), rotated +-0.01 rad, with a 4px outline and a hard copier shadow offset (4, 6) at 60%. A sheet may carry a back pattern: a diamond screen of #555 dots (pitch 16, radius 2) or ruled lines every 45px in #6a6a6a (2px) with a margin line at x = 78.
4. Halftone images are cached with `H.offscreen`: write a luminance function of the subject (soft ellipses and gradients), then screen it at 45 degrees. For each pixel rotate into the screen grid (cell 8-10px), take the distance to the cell centre, and print ink where `distance < cell*0.74*sqrt(darkness)`, antialiased by 1px. Draw it clipped inside a torn scrap.
5. Static toner smudges: 5 radial blobs (radius 45-135px, `H.rng(909)`, black 32% to 0) on BW before the crush.
6. The copier crush and the spot-ink grain are per-frame passes (see Finishing).

## Mark-making
**Scrap polygon** `scrap(seed, centre, w, h, rot, torn[top,right,bottom,left], amp)`: walk each edge in steps (3-5px for a torn edge, 27px for a scissor edge); torn offset along the normal = `H.noise(seed).fbm2(along*0.035 + e*10, 0, 4) * amp * 2.2 + (r()-0.5)*2.4`, scissor offset = +-1px. Typical amp 6px (paper scraps), 3px (tape and strips), 10px (whole sheets). Rotate the polygon by `rot` (+-0.12 rad).
- A scrap is drawn: copier shadow at (+4, +3) in black 70%, paper fill, 2.4px outline in black 75%, then its contents clipped to the polygon.
- Photos are halftone scraps with two torn and two cut edges, 255px square, rotated +-0.1 rad, a typed label strip under them, and a piece of tape on one edge.
- Dark scrap (a diagram or board): #111 fill with #eee line art, 4.5px lines, small round pads at line ends; draw it last in its group so things "disappear into it".

**Ransom letters** (the main headline device): one tile per character.
1. Font per letter from the list in the frontmatter with `r.pick`, size = base * `r.range(0.82, 1.1)`; 25% of capitals become lower case.
2. Tile = glyph box + padding (x 8-15px, y 8-14px), cut with scissor edges, rotated `r.range(-0.12, 0.12)` plus a stop-motion jitter of +-0.02 rad and +-3px that is re-rolled every 8 fps step (`H.rng(1000 + step)`).
3. Tile style per letter: white tile with black glyph (50%), black tile with paper glyph (33%), pink tile with black glyph (17%, printed on SPOT). Each tile gets a copier shadow (3, 3) at 75%.
4. Tiles sit on a baseline wandering +-9px, spaced -5 to +6px; word gaps 0.35 * size.
5. Seed the pick per phrase (`H.rng(phraseSeed)`) so the same letters come back every frame; only the jitter boils.

**Marker.** Black toner or pink: a 24-sample quadratic path with +-1.5px jitter, 12-14px wide, round caps and joins, revealed by quantised progress (steps of 1/8 s). The arrow head is two 39px strokes at +-2.5 rad from the end direction, drawn only when the shaft is complete. Pink slashes for errors are 33px wide.

**Tape.** Torn short ends, 120-225 x 40-70px, rotated 0.6-0.75 rad across a scrap's corner. Fill rgba(120,116,105,0.42), 900 fibre flecks (1.8px; half white 35%, half black 35%), 14 faint sheen lines (white 5-12%, 2-4px tall), an outline offset (3, 3) at 50%. Draw all tape AFTER the crush so it stays translucent grey; each piece is cached as a sprite (keyed by seed and size) and also knocks 35% out of SPOT. Drop a tape if a later scrap covers its centre.

**Stamps and staples.** Rubber stamp: a word in Black Ops One 69px inside a 7px box 285x96px, rotated -0.12 rad. Staple: a 60x9px bar with a white / #9a9a9a / #333 vertical gradient, dark ends and a shadow bar under it; staples land at the very end.

## Type and numbers
- Titles: ransom letters, 156px on line one, 177px on line two; story headlines never below 99px.
- Labels: Special Elite 45-51px on a typed strip (#ece9e1, 20px side padding, cut edges, rotated +-0.03 rad), or a marker scrawl in Permanent Marker 45-57px, tilted -0.12 to +0.03 rad. Never below 42px.
- Key number: ransom letters at 144-160px. It is re-cut on every change: the seed is `base + (value mod 997)`, so every digit gets new fonts, tiles and tilt whenever the value ticks. At 8 fps that makes the number flicker like a hand rebuilding it.
- Counts over 1000 follow `value = target * u^2`, with separators, over 2.6 s, quantised to 8 fps. Small numbers and percentages step linearly over 1.5-2 s. When the final value lands, ring it with a pink hand-drawn loop.
- Appearance: letters are glued on one after another at 1/16 s intervals (two per 8 fps frame). Whole typed strips just appear on a step. Nothing fades or slides.

## Diagrams: arrows, labels, charts
- Arrow: black marker curve with a two-stroke head; label beside it as a marker scrawl. Flow between blocks is always this.
- Labels attach to the thing with a typed strip pasted across its lower edge, or a ransom word taped to it. The tape piece is part of the label.
- Chart: a photocopied graph-paper scrap (24px grid at 35% black) with tape on two corners. Bars are torn strips (87px wide, ragged on all four edges, amp 3px). Strips alternate: black with a coarse 45-degree white dot screen cut out (tile 15px, dot radius 2px), and pink strips printed on SPOT with the same screen knocked out. The key bar is pink. Bars grow over 0.25 s in 8 fps steps.
- Wrong: two heavy crossing slashes in pink (33px, 0.25 s each, 0.125 s apart), then a "CHECK" or "NO" rubber stamp; fix by pasting a fresh scrap over the wrong one with the correct ransom word and a black tick (18px).

## Motion
- Everything lives on the 8 fps grid: `ts = floor(t*8)/8`. Every event appears on the first step at or after its time; there is no tweening between steps. Loops step in fives or fours: a bobbing photo alternates 0 and 6px.
- Entrance (the "slap"): during the first 0.12 s a new object is scaled 1.08 and rotated 0.04 rad about its centre, then snaps to rest. Big objects trigger the copier flash.
- Objects that travel (photos along an arrow) move at 630px/s and are re-posed each step.
- There is no camera. The frame is a fixed desk; any scene is a stack of sheets.
- Spot plate registration: at t = 0 the pink is offset (+24, -18)px from black and eases out (`H.ease.outQuad`, 2.5 s) to (+6, -4.5), then wobbles +-1.5px per step forever.

## Scene changes
A cut is a new sheet slapped over the old one: a torn-top page from 300 to 144px below the top, with a flash. Hold each sheet 3-4 s.
- Stack sheets with a visible strip of the old page above (top at y = 144) when the new idea continues; cover it fully (top at -30) when it is a new topic.
- Add the copier flash, a full-frame fill `rgba(255,255,250,0.22)`, only on frames within 0.12 s of a sheet slap, plus the slap scale and tilt on everything on that sheet.
- Finish with a takeaway strip slapped lower than the rest, taped at two corners and stapled at 0.5 s after the last word.

## Finishing passes (run every frame, same strength)
1. Toner smudges and the BW plate as above, then the crush: for each BW pixel `L = lum/255 + (rn()-0.5)*0.22 + bias`, where `rn` is `H.rng(31 + step)` (grain boils per step) and `bias` is a cached field: `H.noise(13).n2(x*0.008, y*0.008)*0.06`, minus 9 fixed vertical drum streaks (1-6px wide, 5-16% each), minus lead-edge darkening (top 60px 25%, bottom 75px 20%, left 45px 30%).
2. High-contrast curve: `v = H.smoothstep(0.32, 0.62, L)`; of the bright pixels 0.25% drop to 0.1 (toner specks), of the dark ones 1% rise to 0.7 (dropouts); final `v = 0.06 + 0.9*v`, with channels (v, 0.995v, 0.975v) for a faint warm paper.
3. SPOT grain: scale each SPOT pixel's alpha by `clamp(0.82 + n2(x*0.013+40, y*0.013)*0.2 + (rn()-0.5)*0.35)`, so the pink is blotchy like a worn drum.
4. Composite: BW on the canvas, then SPOT with `multiply` at the registration offset from Motion.
5. Tape sprites, drawn on BW after step 2 and before compositing.
6. Copier flash on impact frames. No `H.vignette`, no smooth grain: the crush is the grain.

## Sound palette
Quantise every time to the 8 fps grid: `q(s) = ceil(s*8 - 1e-6)/8`.
- element appears (a pasted scrap, "pat"): `k.noise(q(t), {filter: 'bandpass', f: 1450, q: 1, dur: 0.025, gain: 0.22, a: 0.001, minor: true})` plus `k.noise(q(t), {color: 'brown', filter: 'lowpass', f: 520, dur: 0.06, gain: 0.3, minor: true})`; one per two letters of a ransom word.
- label lands (typed strip or scrawl): a pat at gain 0.6; scrawls add `k.play('stroke', t, {dur: 0.12, gain: 0.9})`.
- arrow completes: `k.play('stroke', t, {dur: drawLen, gain: 1.1})` over the stepped reveal.
- drawing / writing: a photo taped on is `k.play('tape', t, {gain: 1.4, dur: 0.2, minor: true})`; a changing counter gets one scissor snip per change (two bandpass ticks, f 2100 q 2 dur 0.018, then f 1500 q 1.6 dur 0.03 at +0.022 s, gain 0.22).
- scene change (new sheet): `k.play('slap', t, {gain: 1.05})`, `k.play('thud', t, {gain: 0.75, f: 105})`, `k.noise(t + 0.03, {filter: 'bandpass', f: 260, q: 1.2, color: 'brown', dur: 0.35, gain: 0.16, a: 0.04})`, the copier's ka-chunk.
- wrong: two `k.play('stroke', ..., {dur: 0.25, gain: 1.5})` slashes then `k.tone(t, {type: 'triangle', f: 'D3', gain: 0.2, dur: 0.16})` and the lower `'A2'` (dur 0.32) 0.16 s later; `k.play('stamp', t + 0.125, {gain: 0.85})` for the stamp. right: `k.play('success', t, {f: 'G5', gain: 0.45})` with the tick.
- key number (biggest hit): `k.play('impact', t, {gain: 1.1})` with `k.play('stamp', t, {gain: 0.7})` as the pink ring starts to draw.
- takeaway: `k.play('press', t, {gain: 0.32})` per staple with a 20 ms bandpass tick (f 1900, q 3); then a soft three-note `ding` at C4, G4, E5 stepping 0.07 s with gain 0.34 falling 0.03.
- bed: `k.bed(0, DURATION, {kind: 'room', gain: 0.3})` plus `k.bed(0, DURATION, {kind: 'hum', gain: 0.1})` for the idling machine.

## Signature moves
- Ransom-letter headlines pasted one tile at a time, jittering at 8 fps.
- A new sheet slapped over the old with a copier flash.
- Pink plate sliding into near-register during the opening two seconds.
- Counters that rebuild from different fonts on every change.
- A pink slash, a rubber stamp, then a clean scrap pasted over the mistake.
- Tape and staples landing as the last beat.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Edges straight and perfect | torn edges from fbm plus random, scissor edges still +-1px; rotate every scrap |
| Smooth motion or fades | quantise to 8 fps; objects pop on a step with the slap kick |
| Same font for every letter | 14+ fonts, 25% lower case, varying sizes and tile colours |
| Everything pure black and white | keep paper #f4f2ec, toner floor 0.06, specks and dropouts |
| Pink perfectly aligned | keep the (+6, -4.5) offset and wobble; pink only in multiply |
| Tape opaque or crushed | draw it after the crush, 42% grey, and cull it if covered |
| Grain static | reseed the crush noise per step so the toner boils |
| Too many pink things | pink means emphasis or error; at most two pink elements on a sheet |

## Hero frame recipe
1. BW fill #f4f2ec; SPOT empty. Slide the SPOT offset in from (+24, -18).
2. A big torn pink strip (2250 x 315px, rotated -0.12 rad, torn on two ends): paper on BW, pink on SPOT, with two tape pieces across its ends.
3. Title in ransom letters, 156px, on the strip, two lines, phrase seeded; mix white, black and pink tiles.
4. One halftone photo scrap, 255px square, rotated -0.07 rad, torn left and right, with a taped corner and a typed strip "label" at 45px under it.
5. A dark scrap with white line art in the top-right, a typed note scrap bottom-left with a staple on each of its top corners.
6. Toner smudges, crush, spot grain; composite SPOT with multiply at (+6, -4.5), tape sprites on top, copier flash on the slap frame.
7. Check: the pink tiles must look slightly offset from their black outlines and the black must be harsh, with speckled paper and no mid greys.
