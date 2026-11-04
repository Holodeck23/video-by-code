---
id: x-ray
name: Lightbox Radiograph
family: Light & imaging
fonts: [Courier Prime, Caveat, Permanent Marker]
best_for: how a mechanism works inside, hidden structure, diagnostics and "what is really going on", hardware, medicine, safety and inspection topics, before-and-after readings
avoid_for: warm human stories, bright playful tone, long text, topics with no inside to reveal
---

# Lightbox Radiograph

The viewer believes a radiologist has clipped a blue-based film to a wall-mounted light viewer in a dark room and is reading it with a grease pencil. Everything that matters is translucent white on near-black: hollow shells with bright rims, dense pins and bolts, haze around the dense parts. The one quality that sells it is physical lighting: the film is a sheet in front of a bright box, never a dark UI panel.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (room) | #04080f | dark; only the viewer lights it |
| Viewer glare (outside the film) | #fbfbff | near-white, shaded by tubes and edges |
| Film base / unexposed rebate | #c8e6ff | glare times (0.78, 0.90, 1.04) in R, G, B at about 64% transmission |
| Exposed field, empty | #080a10 | transmission 3% |
| Density (bone, steel) | #ffffff | always additive; strength carried by alpha |
| Accent (wax yellow) | #ffe88c | grease pencil: the single most important thing |
| Alarm / wrong | #e1281e | red grease pencil, used rarely |
| Right | #14963c | green on the light rebate; #8cff96 when written over dark field |
| Writing ink on light patches | #181a20 | black pencil on the glare, type on the ID flash |
| Tape | #e8dcb4 | masking tape slip with dark marker text |
| Clip metal | #f2f5f8 to #4b525b | spring clips |

## Ground and surface
The picture is computed per pixel from a density buffer. Cache what does not move with `H.offscreen`; rerun the transmission pass each frame.
1. Density buffer D: a black canvas, composite mode `lighter`, parts drawn in white at low alpha (see Mark-making). Blur 1.6px for unsharpness; add a 21px blur at 12-14% for halation.
2. Masks (two channels, 2px soft): R = the film sheet, G = the exposed field (inset 24-40px, so a rebate frame of unexposed base surrounds it; use 39px insets on big films, 24px on small).
3. Viewer light per column: three tubes at x = W/6, W/2, 5W/6; weight each by `exp(-((x-tx)/495)^2)`; `box = (0.05 + 0.95 * litMix) * (0.86 + 0.07*cos(pi*6*(x-W/2)/W) - 0.08*(|x-W/2|/(W/2))^3)` minus `0.1*((y-H/2)/(H/2))^2`; times 1.22.
4. Film transmission, per pixel: with density `d` (D plus 0.12 of the halation layer) and low-frequency mottle `m` (`H.noise` fbm at 0.016 per 4px cell, amplitude 0.04) plus film grain `g` (three uniform randoms summed, minus 1.5, scaled by 0.05):
   exposed = `0.03 + 0.93*(1 - exp(-3d)) + m*(1-d) + g*(0.5+d)`
   rebate = `0.64 + m + 0.6g`
   inside the film use the exposed value where the G mask is on, otherwise the rebate; outside the film use 1.
   Colour = `box * T * 255 * 1.22 * (0.78*0.98, 0.90, 1.04)` inside the film, white-ish outside.
5. Per frame: tube flicker, development, film overlays, bloom, dark room, camera, finishing.

## Mark-making
All parts go into D at low alpha so overlaps add up like real attenuation.
**Shell (bone, casing)**: a tapered outline (waisted in the middle at 0.36 of the width, flared 0.92 at the ends). Fill alpha 0.11; stroke 13px at 0.08; stroke 4.5px at 0.20. The thin bright rim around a pale interior is what makes it hollow.
**Pin (joint)**: disc at 0.14, ring at 0.62r in 5px at 0.75, centre dot at 0.22r at 0.35.
**Bolt**: a bar 0.8, an elliptical head 0.85 (rx 0.9w, ry 0.45w), threads as 1.5px lines at 0.25 every 4.5px, tilted 1.5px.
**Gear**: toothed polygon (outer radius r, root 0.84r) at density `d` of 0.3-0.32, hub 0.25r at 0.8d.
**Cell, chip, board**: round-rect at 0.08-0.12 with a 4.5px 0.38 stroke; concentric inner outlines at 0.09 for a rolled cell; copper traces 1.8px at 0.1; chips 0.3, pins 0.45.
**Tendon or wire**: 2px at 0.22, run alongside parts with a slight zigzag.
**Lead marker** (a letter or side tag): a faint holder (0.10) with letters at alpha 0.9 in 45px bold sans, source-over so it saturates to white.
**Soft envelope**: the outline of the whole subject at 0.10 alpha, blurred 9px, so there is a faint flesh around the hard parts.
**Scratches and dust**: 9 hairlines per full film (rgba(200,225,255,0.08-0.22), 0.8-1.8px, 60-390px long, near vertical at 1.45 rad +- 0.25, quadratic); 120 dark specks (alpha 0.2-0.6, 0.8-3px); 4 bright pinholes (rgba(215,232,255,0.15-0.35)).
**Grease pencil**: `wax(points, prog, colour, w)` draws the leading `prog` of the path twice (width w, then w-1 shifted by (1, 0.5) with 0.9px wobble); 6% of segments lift the pen, so the line is broken. Width 4.5px; circles run 2.15 pi with radius `63 + 3*sin(7u) + 2*pass` and x stretched 1.1, three passes with widths 3.6, 3.0, 2.4.

## Type and numbers
- Grease-pencil headline: Caveat 700, 177px (never below 120px), yellow, tilted -0.06 rad, revealed by a left-to-right clip over 0.5-0.8 s.
- Labels: Caveat 700, 63-81px (never below 45px) in the colour of the thing they comment on (black on light patches, yellow on film, red for errors).
- Answers: Caveat 700, 126px; a red tick-cross or green check follows.
- Key number: ID-flash block (a patch of rgba(205,222,240,0.92) with type rgba(10,16,30,0.92)): Courier Prime 700, 99px, left-aligned, small caption 24px, unit word 45px. The counter climbs as `10^(6p)`, `p = H.smoothstep(a, b, t)`, so each digit slot is typed as it rolls; it locks exactly on the end value.
- Rewritten numbers: wax strokes over the old value (struck out in red), the new one written beside it in yellow; the final value in #8cff96.
- Header and takeaway: masking-tape slips (zigzag 3px edges, #e8dcb4 at 0.93) with Permanent Marker 51px, dark #1b1d2a, popping in with `H.ease.outBack` from 0.9 to 1 scale over 0.3 s.
- Film edge print (decor only): Courier Prime 20px, rgba(30,40,60,0.55), in the rebate.

## Diagrams: arrows, labels, charts
- Arrow: a wax stroke on a quadratic curve (0.3-0.55 s) plus a two-segment open head of 27px at +-2.6 rad from the heading, drawn when the shaft ends. Black on light areas, red when it carries an error back.
- Label: written beside the part with a short leader; never inside the density.
- Circle: a wax ring around the single part to inspect, overshooting the start by 15%; a double red ring for the result.
- Chart: values written as wax numbers at their positions on a film (no axes), connected by one wax line that climbs; a data point is a handwritten percentage under its label; the biggest is ringed twice in red.
- Abstract network as density: nodes (r 9 to 15px, alpha 0.2 to 0.6) and edges (2-6px at 0.08 to 0.30) that start as a tangle (random positions) and settle into rows as an `order` parameter rises 0 to 1.

## Motion
- Films enter from above: `y = -1140 * (1 - H.ease.outCubic(u))` over 0.35 s; they leave downward with an `inCubic`-style acceleration (`H.ease.inQuad`) to +1170px over 0.3 s. Slight rotations of -0.08 to +0.08 rad, different per film.
- Stagger groups of small films 0.29 s apart; later films overwrite earlier ones (the mask channels are replaced, not blended).
- Gears or dials turn in steps of 1/6 rad, never smoothly.
- Camera: a push-in of 3.5% over 5 s around the point of interest; the viewer's hum flicker is +-0.75% brightness at 30 per second.
- Everything written is wax drawn on over time; nothing fades.

## Scene changes
Pull and slap. The old film is pulled down out of its clips in 0.3 s; 0.05-0.15 s later the new film drops under the clips and settles (0.35 s eased, slight overshoot), with the viewer unchanged behind. Use a dissolve in the development front (below) for the first film of the video. Stay on one film when annotations simply accumulate.
Opening: the three tubes strike one after another (starts at 0.05, 0.20 and 0.32 s; each flickers for 0.3 s between 100% and 15% by a seeded coin toss at 30 per second, then latches). Then the film develops: fog 0.4 to the finished image with a front sweeping top to bottom, `dv = H.smoothstep(0, 0.6, t - 0.75 - 0.95*y/H - 6*m)`, `T = fog + (exposed - fog) * dv`, fog `0.4 + 2m`.

## Finishing passes (run every frame, same strength)
1. Bloom: a quarter-size copy blurred 6-10px, threshold by `H.smoothstep(0.6, 0.95, luma)`, screen it back at 0.55-0.8 alpha, so the glare bleeds across the film edge.
2. Film frame and clips: dark viewer edge 30px (#15181d to #3b4048), two spring clips (102x69, rounded 13, metal gradient stops #f2f5f8, #9aa3ad at 0.25, #4b525b at 0.55, #c8ced5 at 0.8, a #2a2f36 pivot dot r10, a 20% blurred shadow).
3. Dark room: a horizontal multiply gradient per tube lit state: value `12 + 243*lit`, so unlit areas are almost black.
4. Camera push-in (above).
5. `H.vignette(ctx, {strength: 0.22, color: '#04080f', inner: 0.55})`.
6. `H.grain(ctx, t, {strength: 0.03, cell: 2, fps: 30, mono: true})`.

## Sound palette
- element appears: a film slap, `k.play('slap', t, {gain: 0.55})` + a low brown-noise wobble (180-320 Hz, 0.16 s, gain 0.3) for flex + two 20 ms clip snaps (`k.noise`, bandpass 1900 Hz, q 4, gain 0.3) 30 ms and 60 ms later.
- label lands: wax strokes only, `minor`.
- arrow completes: a final 0.1 s wax grain, gain 0.5.
- drawing / writing: grains of pink bandpass noise (f 850-1350 Hz, q 1.1, 40-70 ms each, gain 0.2, one every 30-55 ms) for exactly the draw time, over a brown lowpass 350 Hz bed (gain 0.08).
- scene change: the pull (two clip snaps then flex), 0.05 s apart, then the slap of the next film.
- wrong: a knuckle on the glass: a 170 Hz `thud` (gain 0.55, `k.play`) with a bandpass 1500 Hz tick (q 5) and a 2200 Hz rattle (q 9, 0.12 s); right: two knocks and `k.tone` E4 then A4 (dur 0.6-0.8, gain 0.07).
- key number (the biggest hit): `k.play('key', ...)` per digit change (max 11 per second, gain 0.38), then `k.play('slap', t, {gain: 1.1})`, `k.play('thud', t, {f: 80, gain: 1.2})` and a brown noise falling 900 to 200 Hz (0.6 s).
- takeaway: `k.play('tape', t, {dur: 0.2, gain: 1.5})`, a soft palm press (brown lowpass 600 Hz, gain 0.3), then a quiet chord (A3, E4, A4, C#5, sine, gain 0.05, 1.5 s).
- bed or music: `k.bed(0.05, DURATION, {kind: 'hum', gain: 0.45})` and `k.bed(0, DURATION, {kind: 'room', gain: 0.5})`; each tube strike is a 12 ms bandpass tink (1300 Hz, q 3, gain 0.25) with a 120 Hz sawtooth burst (`k.tone`, 35 ms, gain 0.05).

## Signature moves
- Three tubes stutter on, then the film develops top to bottom from milky fog.
- The subject is hollow: bright thin rims around pale interiors, dense dots at every joint.
- Grease-pencil circle, broken and overshooting, with a handwritten note.
- A numeric ID flash that is typed by the counter.
- Films pulled down and slapped up under spring clips.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Subject drawn dark on light | additive density on black, bright = dense |
| Solid white fills | alpha 0.08-0.2 shells with bright rims, overlaps add |
| Flat black behind | rebate frame, blue base tint, mottle and grain on both |
| UI panel feel | viewer glare, tubes, bloom, dark room, clips |
| Clean pencil lines | double pass, wobble, pen lifts |
| Instant reveal | the top-to-bottom development front |

## Hero frame recipe
1. Density buffer: two views of the subject (front, and a narrower oblique one at 0.5 x 0.8 scale), shells, pins, bolts, gears, a lead marker letter at each field's top-left.
2. Masks: a film sheet 1650x1140 with two exposed fields (915x915 and 513x915) and 70px rebates.
3. Per-pixel transmission with the tint and 12% halation; development complete.
4. Overlays: scratches, dust, an ID flash block at the lower right of the second field, film edge print.
5. Grease pencil: a ring (63px radius) round one joint, a Caveat 60px note beside it, a small leader stroke.
6. Bloom, clips, viewer edge, dark-room gradient.
7. Vignette and grain. Compare with a photographed film on a viewer: the rebate must be mid-grey blue and glare must spill past it.
