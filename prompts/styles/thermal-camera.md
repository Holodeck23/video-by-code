---
id: thermal-camera
name: Infrared Camera
family: Light & imaging
fonts: [Inter, IBM Plex Mono]
best_for: activity, load and flow, hidden problems, monitoring and diagnostics, "what is really happening inside", error signals, energy and performance topics
avoid_for: warm emotional or human stories, long copy, anything whose meaning depends on true colour, children's or soft-tone content
---

# Infrared Camera

The viewer believes they are holding a handheld thermal imager and watching its live screen. The world is a soft, low-resolution field of heat shown in the ironbow palette: hot things glow yellow-white, cool things sink to violet and black. The camera's own overlay (spot meter, measurement box, colour scale, readouts) does the explaining. Heat is activity; a cold wave is an error.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ramp: cold end | #000006, #100440, #480682 | lut stops 0, 0.08, 0.20; ambient background sits near here |
| Ramp: middle | #8c0c8c, #c42260, #e84628 | stops 0.33, 0.46, 0.58; living and working things |
| Ramp: hot end | #f8780c, #fcb818, #fee86e, #ffffec | stops 0.70, 0.82, 0.92, 1.0; only the single hottest item |
| Overlay ink | #ffffff | all overlay lines and text, over a 55-60% black copy offset 2px down-right |
| Accent / alarm | #ff3b2a | measurement box on a wrong result, the hottest-point marker; use rarely |
| Right / result | #7dff8a | a confirmed value, tick, box on success |
| Cold signal | #8fd3ff, #28a8ff | the error wave arrow, the cold-spot marker |
| Data trace | #ffd23a | line profile / chart line |
| Panel | rgba(0,0,0,0.38) to 0.5 | overlay plates; readout plates use rgba(8,0,18,0.7) |

Colour on screen comes only from the ramp plus these six overlay colours.

## Ground and surface
Nothing is drawn in colour. The scene is painted as temperature, then converted.
1. Sensor field: one 640x360 canvas created once at load and cleared every frame. Author the scene in 1920x1080 coordinates and apply `scale(1/3)`. A temperature maps to grey with `v = clamp((T - 16)/56) * 255`. Paint with `fillStyle = grey(T)`, and use `rgba(v,v,v,a)` for soft heat.
2. Room: vertical gradient 24 C at the top, 21.5 C at 65%, 20 C at the bottom; a 26.5 C ceiling-light strip 45px tall; a cooler floor band starting at y=906 (21.2 to 19.6 C) with a 22.6 C seam 9px tall at its top edge.
3. Handheld shake: translate the whole field by `(noise.n2(0.8*t, 50)*7.5, noise.n2(60, 0.7*t)*5.3)` px (`H.noise(17)`). Overlay text stays steady; tags anchored to objects add the same offset so they stay stuck on them.
4. Mottling: a baked `Float32Array` (640 x 408) of the product 5.4 * `fbm2(0.02*x, 0.02*y, 3)`, added in float to the blurred field and scrolled down 2.5 px per second by row offset and linear blend. Skip this and the image looks like clean vector art.
5. Optics and palette are described under Finishing passes; they run on the field after everything above is painted.

## Mark-making
Paint temperatures, not looks. Reference values in C:
- Ambient walls and floor 20-24; clothing and cloth 27-30; skin and animals 33-37 (eyes and inner corners hottest); hair and fur 27-28 (insulating, cooler than skin); machinery and lids 25-30 idle, 40-47 working; a hot liquid surface 52-57.
- Glass and polished metal read cold (11-26 C) because they reflect the room: fill them cool and add one soft ellipse of 17 C at 60% alpha as a reflection.
- Soft heat: radial gradients from `grey(T)` at alpha 0.6-0.95 to 0, never hard-edged blobs. A warm object leaves a conducted halo on its surface (ellipse at 30-31 C, alpha 0.5-0.85) and may leave a fading ghost of itself (26.5 C, alpha 0.75).
- Plumes (exhaust, steam, breath): 6 to 110 overlapping radial puffs of radius 10-40px, centre 46 C cooling to 30 C and alpha 0.2 shrinking with height, x position wandering `sin(u*5.2 + 1.3*t)*(6 + 34u)` plus noise; density thins toward the top.
- Hot spots in a diagram: radial blob radius about 40px, centre `grey(32 + heat*6)`, 29 C at 55%, fade to 0. Rounded plates (cards, housings) are flat greys at 25-28 C with an inner plate 2 C cooler and 27 C card faces holding a 41 C symbol.
- Links are lines at `22 + 20*w` C, width `4.5 + 9*w` px where `w` is 0-1 strength; an active signal is a moving radial puff of radius 24-36px at 44 C (forward) or 14 C (cold wave, backward), `u = clamp(u0*1.35 - offset)`.
- Moving belts or tracks: a 33px band at 23 C with 18x27px slats at 25.5 C every 78px, sliding at 570 px per second and wrapping.
- Silhouettes are built from ellipses and a few bezier bodies, then blurred by the optics. Interior detail is a 2-6 C change, never a line.

## Type and numbers
- Inter 600-800 for everything on the overlay; IBM Plex Mono 600 at 24px for the timestamp.
- Big question: Inter 600, 84px, centred, typed at 22 characters per second from 0.35 s; it then docks into the top-left plate at 42px, left-aligned (0.7 s, `H.ease.inOutCubic`).
- Tags riding objects: Inter 800, 42px, white on a 50% black rectangle 126x54px, with a 24px leader tick under it. Section labels 36px 600 at 85% white; sub-labels never below 36px.
- Key number: Inter 800, 96-102px. Counters run in log space, `Math.round(10 ** (6*p))` with `p = H.smoothstep(a, b, t)`, formatted with thousands separators; percentages `61 + 36*H.ease.outCubic(u)`. Value text turns #7dff8a when it reaches its target.
- Readout plate (dark rgba(8,0,18,0.7)) sits over the chart line so numerals stay legible.
- Small readouts jitter plausibly: add `0.1*Math.sin(3.1*t)` to a displayed temperature.

## Diagrams: arrows, labels, charts
All of it is overlay, drawn crisp in screen space over the finished image.
- Overlay line: draw twice, a black copy 3px wide at 55% then a white 3px line, with `H.partial` for draw-on. Arrows are 3.75px polylines (or 24-segment curves) with the head added when the shaft has finished: two 21px strokes at +-2.6 rad from the end direction.
- Spot meter: a four-armed crosshair, arms from 14px to 45px with a 14px gap, plus a 2px ring in the centre, reading beside it (+54px, -33px) in 600 30px. It glides to the next target in 0.8 s on `H.ease.inOutCubic`, reading the sensor's temperature underneath.
- Measurement box: a rectangle that starts at the top-middle and runs round in 0.3 s, label "Bx1" 24px above the top-left corner, a red up-triangle at the hottest sampled point (scan at 4px steps) and a blue down-triangle at a cold spot. A box on a wrong answer flashes `Math.floor(t*8) % 2` for 0.65 s in #ff3b2a, then holds solid; on success it is #7dff8a. A cross or tick of 69px sits at its right.
- Top-left table: a 38% black plate listing `Sp1`, `Bx1 Max` rows at 33px with right-aligned values. Top right: `ε 0.95   IRONBOW` 24px, a battery glyph and a blinking `REC` dot at 2 Hz.
- Right-edge colour scale: a 33px bar from y=168 to 900 filled with the exact ramp, with its hot value above and cold value below at 30px, unit `°C`. Its numbers match the fixed span (lo 19.5, hi 47) used in the pipeline.
- Chart: a line profile. White axes (3px), caption `LINE PROFILE · <what>` at 30px, the data line 4.5px #ffd23a growing with `H.partial`, an exponential approach curve with 1.2% ripple, and a red triangle on its last point.

## Motion
- Handheld drift only (see Ground, step 3); nothing else shakes. Whole-frame zoom is not used.
- Overlay elements are timed: lines 0.25-0.5 s, panels fade in over 0.3 s, readouts tick live every frame.
- Things the camera sees move slowly and continuously: mottling scroll, a plume's sway, a moving belt, signal puffs travelling along links over 0.3 s per hop.
- Heat builds with time: use `heat = smoothstep(start, end, t)` to raise a plate's temperature by 3 C and a housing's exhaust gradient by 6 C so the image warms, not just the labels.

## Scene changes
The camera's own shutter calibration: the image drops to a flat field for 0.22 s, with a centred `NUC` label (33px, 85% white). In that window set the normalised level to 0.36 plus a 2% left-to-right ramp, `0.02*(x/W - 0.5)`, plus noise (all HUD except the label hidden), then rebuild the next scene. The new scene fades its contrast in with `cont = 0.3 + 0.7*H.smoothstep(t0, t0 + 0.6, t)` and `n = 0.4 + (n - 0.4)*cont`, the camera's auto-gain settling. Open the video on one. Stay continuous when the next idea is a deeper look at the same object: move the spot meter and draw a new box instead.

## Finishing passes (run every frame, same strength)
1. Blur: copy the sensor field and blur it 3px (canvas filter on the 640x360 copy).
2. Add mottling in float, then clamp to 0-254.99.
3. Edge map from the sharp field: Sobel magnitude over 90, clamped to 1.
4. Plateau histogram equalisation of the blurred field: clip each of 256 bins at `640*360/70`, build the cumulative curve, then blend `n = 0.4*equalised + 0.6*linear`, with `linear = (T - 19.5) / 27.5`.
5. Apply auto-gain settle, the calibration flat field if active, then add `edge*0.05`, per-column fixed pattern noise `(rng-0.5)*0.012 + 0.002*Math.sin(x*0.9)` (seed once), triangular pixel noise `(r()+r()-1)*0.02` and per-row noise `(r()-0.5)*0.006`. Use `H.rng(5000 + Math.floor(t*30))` for the per-frame values.
6. Look up `n` in a 1024-entry ramp table built once from the stops above, writing into an ImageData with bilinear sampling from the sensor to 1920x1080.
7. `H.vignette(ctx, {strength: 0.35, color: '#00000a', inner: 0.55})`.
8. Overlay layer on top, never filtered.
No `H.grain`: the sensor noise is the grain.

## Sound palette
- element appears (tag, plate): a short square `k.tone` beep at 880-1180 Hz, `dur: 0.05`, `gain: 0.05`, in `k.minor`; plus `k.noise` bandpass tick (f 1700, q 3, `dur: 0.012`, `gain: 0.2`).
- label lands: `k.tone(t, {f: 1050, type: 'square', dur: 0.09, gain: 0.055})`; never a bell.
- arrow completes: a triangle `k.tone` rising from 420 to 570 Hz (`glideTo`, `gain: 0.03`) for the draw length, then a 0.05 s beep at 940.
- drawing / writing: ticks from the bandpass `k.noise` every second character at 22-40 chars per second (a typed label), `gain: 0.2`, minor.
- scene change: shutter clack at both ends of the 0.22 s flat field: `k.noise` (bandpass 2100, q 1.1, `dur: 0.018`, `gain: 0.4`), `k.tone` 260 Hz gliding to 110 (`dur: 0.05`, `gain: 0.26`), a rattle `k.noise` at +0.022 s (f 1600, q 2, `gain: 0.14`), and a bandpass hum at f 900, q 3, `gain: 0.03` between.
- wrong / right: wrong = `k.play('thud', t, {f: 110, gain: 0.6})` and paired beeps 620 + 930 Hz (`dur: 0.1`) on each flash of the box; right = `k.play('success', t, {f: 'C5', gain: 0.7})`. Forward heat swell: brown lowpass `k.noise` (f 450, `gain: 0.35`, long attack) plus a 90-to-140 Hz `k.tone`; cold wave: pink bandpass noise f 1400 and a falling `k.tone` 1800 to 500 Hz.
- key number: `k.play('thud', t, {f: 85, gain: 1.0})`, a shutter clack, a 0.5 s pink lowpass sweep, then box-flash beeps at 784 + 1175 Hz at t, t + 0.225, t + 0.475 with gain falling 1.9 to 1.3.
- takeaway: typing ticks, then a snapshot (two clacks 80 ms apart with a 40 ms noise between) and a save tone, G4 (0.5 s) then C5 and E5 (0.85 s, gain 0.13 / 0.06).
- bed or music: `k.bed(0, DURATION, {kind: 'tape', gain: 0.4})` for sensor hiss, `k.bed(0, DURATION, {kind: 'hum', gain: 0.2})` for electronics. No music. Counter ticks: `k.play('tick', t, {gain: 1.0, f: 2300})` at most 11 per second.

## Signature moves
- Calibration click between scenes, then contrast pulling in as auto-gain settles.
- A heat wave crossing a diagram forward in yellow, and a cold wave running back in blue when something is wrong.
- Spot-meter crosshair gliding onto the subject and reading its temperature live.
- Red measurement box flashing at 8 Hz round a wrong answer, then turning green.
- The question typed in big, then docking into the measurement table as the header.
- Heat builds across a scene: plates and plumes warm as the work proceeds.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Colour painted directly into a gradient | paint grey temperature, then apply the ramp table per pixel |
| Crisp edges | blur the 640x360 copy 3px, upscale bilinear, keep only a faint Sobel edge |
| Flat clean image | mottling, fixed-pattern columns, row noise, per-pixel noise |
| Everything hot | keep ambient 20-24 C; use the hot end for one item |
| Overlay is blurred or tinted | draw it after the palette pass, in white with a black shadow |
| Scene cuts without ceremony | use the calibration flat field with its two clacks |

## Hero frame recipe
1. 640x360 field: room gradient, ceiling strip and floor seam, hot subject plates at 27-41 C, one hot plume.
2. Add mottling, blur a copy, take edges, equalise, blend and noise, map through the 1024-entry ramp.
3. Vignette at 0.35.
4. Overlay: top-left table, `ε 0.95   IRONBOW` status, scale bar at the right edge, a crosshair on the hottest subject with its reading.
5. One tag at 42px on a 50% plate with a tick, one box on the hot subject with a red up-triangle.
6. Timestamp bottom-left in Plex Mono 24px at 85%.
7. Compare to a real imager still: no colour should appear that is not on the ramp.
