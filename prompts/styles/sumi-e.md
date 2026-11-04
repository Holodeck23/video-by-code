---
id: sumi-e
name: Rice-Paper Ink Wash
family: Painterly
fonts: [Cormorant Garamond, Noto Serif JP]
best_for: reflective or philosophical explainers, journeys and progress told as a landscape, calm science and nature topics, anything that gains from silence and negative space
avoid_for: fast comparisons, dense lists, bright consumer or playful tone, anything needing many colours or precise small print
---

# Rice-Paper Ink Wash

The viewer believes a master is painting on a long handscroll of fibrous rice paper with one stick of black ink and one red seal. Every mark is a single loaded-brush sweep that starts wet and runs dry as it travels; dilute washes soak into the paper and fade to mist; most of the frame is left empty on purpose. Ink and paper are the whole world, so the one quality that sells it is dry-bristle breakup at the end of every stroke.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (rice paper) | #efe7d6 | warm, never white |
| Primary ink | #161413 | the only dark; every grey is this ink at lower alpha |
| Accent (vermilion) | #b8322a | the single most important thing: a wrong cross, the key number, the seal |
| Paper fibre, light | #fffdf6 | mottle highlights and floating fibres |
| Paper fibre, dark / sizing stain | #b0a080 | mottle shadows at 0.1-0.45 alpha |
| Mist | #efe7d6 | same as the ground, drawn with `screen` |
| Slip paper | #f8f4e9 | small torn labels lying on the scroll |
| Glow (optional) | #cdeef2 | one cool light for a single live element; the only non-ink light |

Ink strength by distance: far washes 0.36, middle 0.55, near 0.62, texture strokes 0.26-0.42. Vermilion never touches a wash.

## Ground and surface
Build with `H.offscreen('paper', W, H, fn)`; for a handscroll bake it long (5100x1080) and pan a 1920 window over it.
1. Fill #efe7d6.
2. Mottle: a grid with one cell per 30px, each sampled from 3-octave fbm at 0.12 cycles per cell (`H.noise`); a positive value `v` becomes rgba(255,252,242, 0.8v), a negative one rgba(176,160,128, 0.45|v|). Stretch smoothly to full size.
3. Flocculation: a second grid at one cell per 9px, 3-octave fbm at 0.11 cycles per cell shifted by (40, 17): light rgb(255,253,246) up to 35% alpha, dark rgb(170,152,120) up to 16%.
4. Pulp grain: add `(r()-0.5)*9` to every pixel and, on 0.4% of pixels, darken by up to 26.
5. Fibres: 900 per screen (2600 on a 5100px scroll), 15-105px long, a quadratic bend of `r.gauss()*0.6` rad, 0.6-2px wide; 45% dark rgba(150,130,100,0.07-0.2), 55% light rgba(255,253,246,0.12-0.3). Keep the light ones faint so they read as fibre, not scratches.
6. Per frame: the painting, the mist, the final fibre pass (260 faint `screen` hairs, rgba(90,84,74,0.06-0.16)).

## Mark-making
**Brush stroke** `brush(ctx, controlPoints[x,y,pressure], {w, ink, dry, seed, tone, pool, rim, prog})`. Spline the points (Catmull-Rom), resample to 3px, then:
1. Body: polygon along the path, half-width `w * pressure * 0.5 * (1 + 0.16 * n2)`; while still travelling (prog < 1) taper the head over the last 5 samples. Fill #161413 at `0.9 * ink * tone`.
2. Rim: 1.6px outline at alpha `rim` (0.3), so the edge is darker than the wet interior.
3. Pool: at the start, an ellipse (0.48w by 0.4w) at alpha `pool` (0.35), where the loaded tip first sat.
4. Dry bristles: `nb = clamp(round(0.93 * w), 4, 64)` bristle lines spread across the width. For bristle `b` at offset `off` in [-1,1]: `dryness = start + s*rate + 0.4*n2`, where `s` is the fraction along the stroke, `start = 0.25*r() + 0.6*(1-ink)` and the per-bristle `rate = dry * (0.5 + 1.1*off^2 + 0.9*r())`. Wherever dryness > 0.5, erase a hairline (`destination-out`, width `(w/nb)*(0.5..1.4)`, alpha `(dryness-0.5)*3`, drawn in runs of 8 samples). Edges dry first, centre last, tail most.
5. Press into the paper: draw the layer onto the page with `multiply`: five offset copies (1.5-2.4px away, alpha 0.17 each) for the wicking bleed, then the sharp copy.
Draw into a scratch layer and only touch the bounding box; draw the stroke head-first using `H.partial`-style fractions of the resampled path for `prog`.
Typical widths at 1920: main stroke 24px (ink 1.25, dry 0.75), big circle 39px (ink 1.3, dry 0.5), connector 9px (ink 1.1, dry 1.0), axis 4.5px (ink 0.8, dry 1.4, tone 0.6), texture stroke 4-6px (ink 0.6, dry 1.3).

**Ridge wash** (distant forms): for each column, with `top(x)` the ridge height built from summed Gaussians plus `fbm2` roughness: alpha = `(0.32 + 0.68*exp(-dy/fade)) * smoothstep(mist band) * edgeFade`, fade 165-195px, then dissolved into mist by a band of 90-120px whose centre wobbles with `n2`. Pass 2: erase 16 soft ellipses (rx 45-135, ry 15-60, rotation +-0.6, alpha 0.15-0.45) for uneven water, add 5 wobbly blooms. Pass 3: blur a copy 4px and keep `max(a, 0.9*blur) + 0.25*(a - blur)` so a darker tide-line sits at the wet edge. Multiply it in. To grow it, reach down `45 + prog^2 * 780`px with a 60px soft front.
**Texture strokes**: along slopes draw 16-30 hair strokes 55-130px long, w 4-6px, tone 0.26-0.42; add dots (short dabs, w 6-12px, pool 0.6) along ledges.
**Seal**: a #b8322a square 87px with 10 jittered points per side (gauss 1.3px); knock out two stacked glyphs (38px, Noto Serif JP 700), an inner 3px frame, 160 specks (r 0.5-2px) and one 35% smudge ellipse; stamp with `multiply` at 0.92 alpha, scale 1.25 settling to 1 in 0.15 s.
**Flowing band wash**: between two wobbly banks, alpha `0.075 + 0.13*exp(-e/6.5) + 0.05*exp(-e/24)` (e = distance inside the bank), modulated by streaks and mottle, revealed left to right behind a 240px soft wet front.

## Type and numbers
- Title: Cormorant Garamond italic 400, 156px (never below 120px); once written it shrinks to 0.45 and drifts to a corner.
- Labels: Cormorant italic 400, 54-60px (never below 42px), beside the thing they name.
- Key number: Cormorant 600 upright, 132px; vermilion at the moment it lands.
- Takeaway: italic 87px along the bottom.
- Vertical calligraphy column: Noto Serif JP 900, 84px, pitch 93px, per-glyph jitter (position gauss 3.75px, rotation gauss 0.04 rad), each glyph revealed top-down over 0.12 s, staggered 0.12 s; then erase ~420 streaks (12-33px long, 0.75-2.2px wide, alpha 0.25-0.85) and add a 2.4px blurred bleed copy at 0.35 alpha.
- Writing: clip-reveal left to right under `H.ease.inOutCubic` over 0.3-0.7 s; draw a blurred halo (2px, alpha 0.3 of the ink) beneath the crisp fill at 0.92 alpha, so ink wicks into the paper. Counters step in thousands with the number written in place, and finish with a dry underline.

## Diagrams: arrows, labels, charts
- Arrow: one brush stroke 9px wide along a loose curve, then two 7px head strokes of 36px at about +-0.6 rad that taper to pressure 0.2. No filled heads.
- Label: written after the stroke it names, with a hairline leader (3px, pressure 0.5 to 0.2) when far away; vermilion for the wrong state.
- Chart: two dry axis strokes, a single ridge stroke for the series (15px, ink 1.25, dry 0.6, pressure varying 0.6-1.0 point to point), the area under it a pooled wash that is densest right under the stroke and fades toward the baseline and the right end; a small dark mark rides the stroke tip as it climbs; a vermilion ring or seal marks the summit.
- Wrong: two 16px vermilion slashes (0.15 s each) and a vermilion ring (13px, 1.9 pi sweep). A vermilion return stroke shows an error travelling back.
- Ripple: a ring of dilute ink growing from 30px past an object's edge to 135px, with a darker outer tide-line, fading as it spreads.

## Motion
- Each stroke is laid in one sweep: `prog` runs with `H.ease.inOutCubic` over 0.25-0.9 s (the big circle 0.9 s, connectors 0.4 s, axes 0.3 s). Nothing fades in.
- Scroll camera: world x eases in discrete moves of 0.95 s (`inOutCubic`) between beats, one scene width (1170 or 1950px) at a time; hold still while painting.
- Idle life: mist ellipses drift at 24px/s with parallax 1 + 0.2*k per layer; small birds as two V strokes with a flap offset `sin(t*7)*4.5px`; the optional glow breathes `0.75 + 0.25*sin(2.6 t)`.

## Scene changes
Mist, not cuts. Over about 1.4 s a bank of seven large ellipses (rx 330-630px, ry 45-105px, #efe7d6 at 0.45-0.75 alpha, `screen`, blur 39px) swells with `sin(pi * u)`, covers the frame at its peak, and the scroll glides during that cover. Use a wash dissolving the old content instead when the next idea stays on the same scene. Keep one stroke of continuity (a river, ridge or ring) crossing the join.

## Finishing passes (run every frame, same strength)
1. Bleed: every ink layer is pressed with the five-copy offset (above), `multiply`.
2. Mist drift (`screen`, blur 39px, 8 ellipses, alpha 0.3-0.55).
3. Floating fibres (260 hairs) in `screen`.
4. Optional: `H.grain(ctx, t, {strength: 0.02, cell: 2, fps: 12, mono: true})`; `H.vignette(ctx, {strength: 0.12, color: '#8a7a5c', inner: 0.7})`.
Never add outlines or drop shadows to ink; flat digital strokes are the first thing that gives the look away.

## Sound palette
- element appears (a stroke starts): soft brown-noise press, 60 ms, lowpass at 600 Hz, `gain: 0.3`.
- drawing / writing: `k.play('stroke', t0, {dur: 0.7 * sweep, gain: 1.2})` per stroke; in the last 55% of the sweep add bandpass rasps (`k.noise`, f 1500-2200, q 0.9, dur 0.035, gain about 0.07) every 30-60 ms, sparser as it ends. Text: one stroke per word, timed by character position.
- label lands: a shortened stroke at gain 0.7, `minor`.
- arrow completes: the second head stroke at 0.1 s, gain 0.9.
- scene change: pink bandpass noise swelling 300 to 900 Hz over the mist (`gain: 0.075`, a = half the length) plus a brown lowpass slide at 500 Hz (`gain: 0.12`).
- wrong: `k.play('thud', t, {f: 105, gain: 0.55})` under two vermilion slashes at gain 2.0; right: a singing bowl on A4 (below, gain 0.35).
- counter ticks: the 'tock' preset at 1150 Hz, gain 0.32, at most 12 per second (`k.play('tock', t, {gain: 0.32, f: 1150})`); the landing is a firmer one at 640 Hz, gain 0.6.
- key number / seal (the biggest hit): `k.play('stamp', t, {gain: 1.0})`, `k.play('impact', t, {f: 80, gain: 0.8})`, a pink lowpass sweep from 1400 to 250 Hz (1.2 s, gain 0.16), and a bowl on D4.
- bowl: `k.tone(t, {f: 'D4', dur: 3.2, gain: 0.16, a: 0.01})` plus a partial at 2.71x (dur 2.0, gain 0.05) and a second tone 0.3% sharp (gain 0.08).
- takeaway: written strokes plus a low bowl on D3 then A3.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.4})`; `k.music(0, DURATION, {mood: 'calm', bpm: 64, key: 'D', gain: 0.3})`.

## Signature moves
- A single circle in one breath, dry at the tail, as the central object.
- Vermilion seal stamped beside the key moment, with its scale settling.
- Distant hills painted as washes that dissolve into mist, with far paler than near.
- The chart as one ridge stroke with a mark riding its tip.
- Negative space: fewer than five elements on screen at a time.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Uniform strokes with round ends | width follows pressure, head taper, bristle erase from edges inward |
| Greys from `rgba` fills of other colours | one ink at lower alpha only |
| Hard digital shadows or outlines | no shadows; bleed copies and rim only |
| Ink laid on flat paper | mottle, flocculation, grain, fibres, all four |
| Text fades | clip-reveal left to right with a bleed halo |
| Crowded frame | at most five elements, empty space is the point |
| Vermilion everywhere | only the wrong cross, the key number, the seal |

## Hero frame recipe
1. Cached paper (mottle, flocculation, grain, 900 fibres).
2. A far ridge wash (tone 0.36, fade 195px, mist band at y=660) and a middle range wash (tone 0.55) from the left edge, both multiplied in.
3. Contour and slope texture strokes on the ridges (w 6px, tone 0.4, dry 1.3).
4. A foreground ledge: one 24px stroke (ink 1.25, dry 0.75) with a dropping face stroke 30px wide, then 20 dots on top.
5. A vertical calligraphy column at the right, a vermilion seal below it, a small italic 30px caption with wide letter-spacing.
6. Mist ellipses between the ranges; light fibres and 260 hairs on top.
7. Compare with a scanned scroll: the darkest ink must feather at its edges, and the lower third should dissolve into pale paper.
