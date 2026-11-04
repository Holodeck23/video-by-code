---
id: cosmic
name: Star Atlas
family: Cosmic
fonts: [Cormorant Garamond, Libre Baskerville, Syne]
best_for: big-picture or "how it works" explainers, systems with a centre and satellites, learning and growth stories, awe, science and technology with a poetic tone
avoid_for: tight business reporting, small-print tables, cheerful kids' content, anything that needs a realistic human setting
---

# Star Atlas

The viewer believes a deep-space photograph has been engraved over by a cartographer. Glowing gas, a lit ringed planet and a sharp-spiked star sit in the dark, and on top of them a fine gold and pale-cyan chart is inked: dotted orbits, degree rings, ring markers and small-caps labels. Ideas are bodies in space; relationships are chart lines between them.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (deep space) | #03040b | the sky texture ends at about #030410 at the top, a touch bluer in the middle |
| Nebula teal / violet | #1496a5 / #6232b2 | the two main gas colours |
| Nebula rose / gold | #de467c / #f2b660 | rose blends into violet; gold only in the thickest cores |
| Chart ink | #e6c680 | hairlines, degree ring, primary labels |
| Chart ink, bright | #ffe2a8 | the thing that is currently true or chosen |
| Chart ink, cool | #a0e2ec | second system, a second orbit, secondary quantity |
| Cream | #f8f0e0 | headlines, italic notes, big numbers |
| Alarm / wrong | #ff564a | line, ring marker and cross for an error; rare |
| Halo shadow | #02030e | behind every piece of text |

Two chart inks only (gold family and cyan family), red for wrong. Stars are tinted #fff6e8, #d4e4ff, #ffe2ba, #c8f0f6, #ffd4de.

## Ground and surface
All cached (`H.offscreen`); only twinkle and drift change per frame.
1. **Nebula texture**, 640x450 per-pixel, drawn about 4.5x up. Domain-warped fbm with `H.noise(7713)`: `u = x*3.2, v = y*2.25`; two warp fields `qx, qy = fbm3(u,v,0.1,3)` (second offset by 5.2, 1.3); layer one `n = fbm3(u+1.5qx, v+1.5qy, 1.7, 5)`, layer two a 1.25x-scale, offset copy at z 4.4. The gas lives in a winding diagonal river: `dist = y - (0.84 - 0.62x) - 0.07 sin(6.5x + 1)`, `band = exp(-dist^2 / 0.0578)`, strength `0.12 + 0.88 band`.
2. Colour: layer one smoothstepped (0.44-0.8) into a violet-to-rose mix driven by a slow third fbm; layer two (0.47-0.82) is teal at 95%, stronger toward the right; gold where layer one exceeds 0.62 and the hue is rosy. Multiply gas by `0.55 + 0.75*smoothstep(.5,.9,n)` so it glows from inside, scale everything 1.3, add a diffuse river glow `(40,22,70)*band*0.35`. Dark dust lanes: a fifth-frequency fbm smoothstepped (0.53-0.7), darkening up to 85%, mostly inside the river.
3. **Distant spiral galaxy**: a 300px per-pixel sprite (log spiral, 2 arms, disk `exp(-4.5r)`, core `exp(-70r^2)`, cream centre to blue edge), drawn squashed (y x0.28), rotated -0.38 rad, additive at 75%.
4. **Stars**, three parallax layers: far (5200 specks 0.75-2.4px baked once, denser along the river), mid (620, `0.7-3.6px`, twinkle `0.62 + 0.38 sin(t*w + ph)`, w 0.8-3.8 rad/s), near (60 bright ones, 9-39px glow sprites). Camera parallax 0.05 / 0.3 / 0.6; zoom response 0.15 / 0.5 / 1.0 of the camera zoom, nebula 0.12 parallax and 0.22 zoom.
5. **Glow sprite**: a 128px radial gradient with stops 0: 1, 0.07: 0.85, 0.2: 0.28, 0.45: 0.07, 1: 0, tinted per use; every glow in the frame is this sprite drawn additively.

## Mark-making
**Spiked star.** Three glows (tint at 8x radius 55%, blue #96c8ff at 3.6x 50%, white core), then 8 spikes through the centre: four long (9x radius, width 0.1x) and four short (3.4x, 0.06x) at 45 degrees, each a thin triangle with a gradient white 95%/55%, tint 45%/22% at 0.2, pale blue 12%/5% at 0.6, 0. Add a faint ring at 2.4x radius, 14%. Base radius 24px; a flare briefly multiplies it by 2.5.

**Ringed planet** (per-pixel sprite, radius 280px at hero scale, cached): bands from an 8-colour ramp (#f0e0c2, #deb270, #b86e48, #ecd2a4, #a0748e, #d09862, #f4e8ce, #96a0aa) smoothly interpolated along `lat*6.2 + 0.75*fbm`, with `fbm` of (cos lon, sin lon, lat*11); fine ripples `1 + 0.07 sin(48 lat)`; polar caps blended 70% to #7684a0; one storm oval at lat -0.38 in #c45c3c with a pale rim. Light from the upper right and front (0.74, -0.46, 0.48): day factor `smoothstep(-0.1,0.32,d) * (0.3 + 0.7 d^0.7)`, a warm band at the terminator, a violet night fill, limb darkening `0.55 + 0.45 n^0.6`, the rings' shadow ray-traced onto the clouds (80%), an atmospheric edge glow `(110,190,240) * (1-n)^2.6` on the lit side, and an outside halo. Rings 1.34-1.96 radii, tilt 0.3 rad, ellipse ratio 0.27, density `0.6 + 0.17 sin(47u) + 0.12 sin(131u + 1.3) + 0.08 sin(289u + 0.4)` with a gap at u 0.6-0.68; dim to 10% where the planet shadows them. Back half behind the planet, front half over it.

**Moons**: 80px per-pixel spheres with 16 craters (dark floor x0.78-0.9, bright rim +16%), same light, edge glow 35%. Draw those on the far half of an orbit behind the planet (0.92 scale), the near half in front.

**Comet.** Head: three additive glows (110px #aae6ff 70%, 44px #c8fff0 50%, 24px white). Dust tail: sample 20-30 points back along the path, then stroke six strands segment by segment, additively: widths 34/22/14/10/3/2px x(0.3 + 1.6f) with alphas 3/4/5/10/22/12%, fanning sideways by `f^2 * 46px`, fading `(1-f)^1.4`. Ion tail: a straight 345px line, 10px at 12% and 2.4px at 50%, gradient #8cd2ff to transparent.

**Chart work** (all hairlines 1.5px, drawn on by progress):
- Orbit: dots (radius 1.9px) every 7px along an ellipse, sliding at 9-10 px/s so the orbit crawls; 3-4 open chevrons (10px, +-2.6 rad) along it; far half hidden behind the planet disk.
- Line: solid, quadratic bend optional, a 6x-wide additive glow beneath at 18% when it is a "beam"; open chevron head 14px. Dotted variant: dashes `[2.2, 9]`.
- Degree ring: circle plus a second at +7px at 50%; ticks every 2 degrees (6px), 10 (12px), 30 (20px); numerals every 30 degrees in Cormorant 600 21px at +25px. It sweeps round from -0.95 pi.
- Ring marker: circle, 2.7px centre dot, four cardinal ticks from +4 to +14px.
- Constellation icon: 9-13 stars joined by hairlines that stop 5px short of each star, stars are small glow sprites with a 1.8-4px core.

## Type and numbers
- Labels: Cormorant Garamond 600, CAPS, tracking 0.16em, 39-54px, gold #e6c680 (cyan for the second system, red for wrong). Behind every label a 4px stroke in rgba(2,3,14,.6) and a 21px shadow blur in #02030e.
- Secondary notes: Libre Baskerville italic 400, no caps, 45px, cream.
- Headlines: Syne 800, 105px at the hook (shrinks to 54px and moves to the top-left over 0.8 s), takeaway 96px. Each glyph fades in over a 0.8 s sweep with 15px rise; the title has 12px tracking that tightens to 0 as it settles.
- Key number: Syne 800 174px cream, label above in caps, an italic "from <start value>" note below in cyan. On landing the fill shifts to #ffe2a8 and an additive 60px glow decays (exp(-2t)).
- Counts: Syne 800 108px cream, with a graduated rule below (60 ticks over 730px, long every 10th) and a gold pointer sliding along it in log position.
- Graduated rule under headlines: 1px gold, ticks every 12px, long tick every 60px.

## Diagrams: arrows, labels, charts
- Label with leader: ring marker on the thing, a 1.5px line out to the label, label in caps, one italic note beneath.
- Arrows are dotted chart lines with a chevron head, curved through a control point; a "beam" is a solid line with glow, a tip glow while it grows, then a ring marker on arrival.
- Wrong: the beam colour lerps to red over 0.12 s, the target ring marker (42px) pulses +50% and decays over 0.4 s with a red additive glow, a cross (20px, 3.6px) appears beside. The return path is a red dotted curve with a glowing tip. Right: gold ring marker, gold glow 0.7 decaying, a check beside it.
- A change of state is drawn as a gold arc with a chevron head around the thing that turns, and the old orbit stays as a 35% red dotted ghost.
- Chart: an atlas plate. Curved gridlines (quadratic, cyan 16%), graduated axes (tick per unit 6px, per 5: 12px, per 10: 21px), axis numerals 36px. Data points are bright stars connected by gold hairlines; a dotted cyan best-fit sits behind at 50%; the last point flares with a spiked star, a ring that expands to 390px while fading, and the number landing.

## Motion
- Easing: `H.ease.inOutCubic` for camera and drawing on, `H.ease.outCubic` for arrivals. Comet paths use `u*(0.55 + 0.45u)` to accelerate.
- The camera drifts in: zoom 0.62 to 1 over 2.9 s, plus a continuous sideways drift of the sky at 8px/s (so stars slide at their parallax rates).
- Items arrive as comets along curved paths with a faint dotted path ahead of them; the arrival makes an additive flash (180px) and an expanding ring marker.
- Stagger: comets 0.3 s apart; chart stars one every 0.12 s.
- The frame never rests: twinkle, crawling orbit dots, slowly orbiting moons (0.1-0.4 rad/s).

## Scene changes
A warp jump (0.85 s). For 0.4 s the stars streak outward from the centre (mid stars by `warp*(0.18 + 0.5m)` of their distance from centre, near stars `0.9*warp`), four extra copies of the nebula at 7% steps are added at 18%, the camera zoom rises 0.6, and the old scene scales up 3.2x around its centre while fading. At the midpoint, a radial flash (#d2ebff 75% to #785adc 30% at 0.5 to 0, radius 1050px, gaussian in time, width 0.09 s). Then the new scene scales from 0.55 to 1 over 0.45 s. For a related next beat, tilt the camera vertically instead (scenes stacked 1080px apart, 0.7 s, the sky moves with it).

## Finishing passes (run every frame, same strength)
1. `H.vignette(ctx, {strength: 0.55, color: '#010208', inner: 0.55})`.
2. Optional `H.grain(ctx, t, {strength: 0.025, cell: 2, fps: 12, mono: true, blend: 'overlay'})` to hide banding in the gas.
3. Every glow additive (`lighter`); every text gets its halo. No pass changes strength between scenes.

## Sound palette
- element appears: a "radar ping": `k.tone(t, {f: 'E5', dur: 0.9, gain: 0.12, a: 0.004})` plus a fifth above (1.5x, in Hz) at dur 0.35, gain 0.03, panned with the object; minor unless it is the headline label.
- label lands: a ping, gain 0.6-1.0, pitch A4 to E5, never a chime.
- arrow completes: a rising sine glide `k.tone(t, {f: 'A3', glideTo: 'E4', dur: drawLength, gain: 0.06, a: 0.2})` as the beam draws, then a ping at the end.
- drawing / writing: for orbits and degree rings, a very quiet narrow pink-noise scan (`k.noise` bandpass f 600, q 3, gain 0.04, dur matched).
- scene change: a sub rumble `k.tone(t, {f: 55, glideTo: 28, dur: 1.2, gain: 0.42, a: 0.4})`, brown noise swelling to the flash (lowpass f 400, gain 0.4), a pink bandpass streak (f 1000, gain 0.12), then a soft `'A2'` bloom at the flash.
- wrong: three detuned saws `'Bb2'`, `'B2'`, `'F3'` (gain 0.07, dur 1.1, pan 0.5) plus a thump `k.tone(t, {f: 90, glideTo: 60, dur: 0.6, gain: 0.3})`. right: a warm chord D3, A3, F#4, A4 (triangle, dur 1.5, a 0.06) plus a high ping `'A5'`.
- key number (biggest hit): `'C2'` swell (dur 2.6, gain 0.32), thump (70 to 45 Hz, gain 0.35), a four-note pad, a shimmer of five rising sines E5, G5, B5, C6, E6 (0.07 s apart, gain 0.025, dur 1.4).
- takeaway: a resolving pad F2, C3, A3, E4 plus a ping C5 then G5.
- bed or music: `k.bed(0, DURATION, {kind: 'night', gain: 0.4})`, optional `k.music(0, DURATION, {mood: 'dreamy', bpm: 60, key: 'A', gain: 0.25})`; a low drone `'A1'` fading in over 1.5 s. Counting ticks: bandpass noise f 1100, q 4, dur 0.02, gain 0.22, at most every 0.1 s. Chart stars: pings climbing an A-minor pentatonic scale, one per star.

## Signature moves
- The key star flares with spikes before anything is explained.
- The planet lights from one side; its moons are the parts that matter.
- The chart "engraves itself": degree ring sweeps, orbits dot on and crawl.
- Examples arrive as comets with a small constellation icon at the head.
- A warp streak between scenes; a vertical tilt up to the atlas plate.
- A rising measurement is drawn as a constellation that forms star by star and flares at its last point.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat purple gradient sky | domain-warped fbm in a river, dust lanes, three star layers with parallax |
| Planet is a striped circle | per-pixel lighting, terminator, rim scatter, ring shadow, front/back ring split |
| Chart lines feel like UI | hairlines at 1.5px, dotted orbits that crawl, chevrons not triangles, small-caps labels |
| Text unreadable on the nebula | 4px dark stroke plus a 21px blur halo behind every label |
| Everything glows | only the key star, the comets and the final number glow; chart ink stays crisp |
| Too many colours | gold family, cyan family, cream, red for wrong |

## Hero frame recipe
1. Cached nebula, galaxy, far stars; sky at full brightness, camera zoom 1.08.
2. Spiked star at (1730, 170), radius 24, tint #ffe8c4, rotated 0.12.
3. Planet at (1110, 675), radius 280; two moons on 680x186 and 495x321 ellipses (one behind, one in front); halo.
4. Chart: degree ring radius 757 at 62%, two crawling orbits, ring markers on the moons, two labelled leader lines (caps 39px gold and cyan, italic 29px notes).
5. A comet crossing from the left with dust and ion tail; a three-star constellation icon bottom-left.
6. Title "Chart I" small-caps 27px at (108, 138), headline Syne 800 96px cream at (102, 240), graduated rule 705px long under it.
7. Vignette and grain. Check: label letters must stay legible over the brightest gas.
