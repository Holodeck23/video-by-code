---
id: oscilloscope
name: Lab Oscilloscope (XY Mode)
family: Retro digital
fonts: [Inter, Space Grotesk]
best_for: tech, engineering, signal and feedback loops, "how it learns or converges" stories, graphs that sweep, nerdy and precise tone, short punchy talks
avoid_for: warm human or family topics, long paragraphs, anything that needs colour coding beyond green/amber/red, dense small print (beam text must stay big)
---

# Lab Oscilloscope (XY Mode)

The viewer believes they are staring at the glass of an analogue bench oscilloscope switched to XY mode, with a single phosphor beam drawing every letter, arrow and curve. Nothing is ever "placed": a glowing dot travels, brighter where it dwells at corners and dimmer where it races between strokes, and a halo blooms around it. The instrument's own knobs, gains and timebase are the only way the scene changes.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Phosphor beam (P31 green) | #7dff4a | body of every trace; the colour of "true / current / the system" |
| White-hot core | #ebffe1 | centre of thin traces, beam head, flares |
| Amber | #ffaa2e | "wrong guess", error signal travelling back, anything in flux |
| Alarm red | #ff542e | only the cross-out and a 15% ghost copy of wrong text; use rarely |
| Glass | #0a100c | radial: #111a14 at the centre, #0a100c at 70%, #040605 at the rim |
| Graticule | #aacdb4 | lines at 22% alpha, centre ticks at 34% |
| Bezel plastic | #2e3032 to #151617 | vertical gradient; inner lip #0b0c0c |
| Panel enamel | #cdcabf to #b3b0a5 | warm grey, top to bottom |
| Panel ink / blue | #22313f / #3d6688 | silkscreen labels and section frames |

One colour per meaning for the whole video. Green is never used for an error, amber never for a success.

## Ground and surface
Canvas 1920x1080. Constants: graticule 10 x 8 divisions of 120px, origin (81, 60), size 1200x960, centre (681, 540); glass rounded rect x42 y33 w1278 h1014 r87; control panel occupies x1353-1920. Cache every static layer with `H.offscreen`; per-frame scratch canvases (beam, two bloom buffers) are made once and cleared each frame.
1. **Panel** (cached): vertical enamel gradient, then 30,000 speckles (`H.rng(31)`, 1.5-3px, black or white at 3.5-6.5% alpha). Bezel: rounded rect x9 y6 w1335 h1068 r51, plastic gradient, drop shadow (black 45%, blur 27, dy 9), 1.5px hairline at 12% white. Inside it a stepped lip, the glass rect grown by 15px, r99, #0b0c0c with a 7% white edge. Four screws r9 in the corners (radial #d8d8d4 to #5c5c58, slotted).
2. **Control panel** (cached, decorative): "XY-2" plate in Space Grotesk 700 45px with a 5px blue rule under it; two outlined sections (VERTICAL 534x348, HORIZONTAL 534x273, blue 2.4px, r12, title tab cut into the frame); an 11-position scale around each big knob (labels Inter 700, 15px, ticks 11-24px long at angle -135 + 27i degrees); three BNC sockets (hex nut r31, brass pin). These labels never carry the story, so small sizes are fine here.
3. **Live panel parts** (every frame): knobs, buttons, LEDs (see Mark-making).
4. **Glass** (cached): rounded rect with the radial fill above plus 58,000 one-pixel specks, `rgba(150,190,150, r()*0.05)`.
5. **Graticule** (cached, drawn over the beam): 1px lines every 120px at half-pixel offsets, 22% alpha; five-step ticks (7.5px) along the centre cross at 34%; dashed lines (3 on, 6 off, 26%) at +-2 and +-2.5 divisions with tiny 100/90/10/0% labels (Inter 600 15px, 40%).
6. **Reflection** (cached): clip to the glass; radial edge darkening from radius 450px (clear) to 900px (black 55%); a triangular window reflection from the top-left corner (780 x 570 gradient, #dcebff at 7.5%, 2.5% at 0.45, 0 at 0.5); a 3px inner rim at `rgba(200,230,210,0.10)`.

## Mark-making
Everything on the glass is a **beam call**: `beam(strokes, {f, a, col, w, timed, dots})` appends to a per-frame buffer of lines, segment batches and dots. `strokes` is a list of polylines; `f` (0-1) is the fraction of their total length traced so far; the buffer is rebuilt from `t` every frame. Default width 3.3px, alpha 1.

**Brightness is inverse beam speed.** Two modes:
- Short figures (letters, boxes, arrows, fewer than 40 points): each stroke's alpha is multiplied by `speed = H.clamp(1.18 - avgSegLen/780, 0.62, 1.08)`. Add dwell dots (radius 0.95w, alpha 0.55a) at both ends and at any vertex where direction turns more than 0.85 rad.
- Long continuous curves (sine, ring, Lissajous, a 1500-point spiral): `timed: true`. For each segment `fac = H.clamp((meanLen/segLen)^0.65, 0.3, 2.2)`, times the point's optional depth value (0.62 far side to 1 near side). Quantise `fac` into 10 buckets and batch each bucket into one stroke call with alpha `a*min(1,fac)` and width `w*(0.75 + 0.22*fac)`; a bucket above 1.2 also gets extra white-hot weight.
- **Retrace:** between two strokes in one call, add a straight line from the previous end to the next start at 9% alpha, width max(1.5, 0.45w). It is the faint "jump" line that proves it is one beam.
- **Head:** while `f < 1`, add a 90px bright tail of the current stroke (alpha 0.8, width 1.5w) and a hot dot (radius 2.3w, alpha 1.3a) at the tip.

**Rendering the buffer** (every frame, on a full-size layer, `globalCompositeOperation = 'lighter'`, round caps and joins):
1. Halo pass: every line at alpha 0.2 of its own, width 3.4w, in the phosphor colour.
2. Core pass: the line at full alpha in `H.mixRGB(col, #ebffe1, 0.55 + 0.25*hot)`. For wide traces (w above 4.5px) keep the green body (mix 0.36-0.52) and add a centre line at 0.42w, alpha 0.75, mixed 82% toward white. Big lettering therefore stays green with a hot centre.
3. Dots: a disc of radius 2.4r at 28% alpha, then a core disc; dwell dots on wide lettering get a small hot centre (0.45r).
4. Bloom: draw the layer into a half-size buffer with `blur(4.5px)` and a quarter-size buffer with `blur(7.5px)`; add them to the glass with `lighter` (quarter at `min(1, 0.9*bloom)`, half at `min(1, 0.85*sqrt(bloom))`), then the sharp layer. If `bloom > 1.05`, add the quarter buffer again enlarged by 12px on every side at `(bloom-1)*0.5`: halation.

**Shapes.** Rings are 28-point ellipses (`H.bezier` or sines); boxes are closed polylines. A 3D wireframe is projected points joined by straight beam lines: rotate about Y, perspective `p = 1/(1 + z/(3.2*size))`, node rings of 18 points, edge width 1.8-4.5px by weight. The spiral-wound sphere is one continuous `timed` curve: `phi = pi/2 + (s-0.5)*pi*e`, `theta = 2*pi*22*s + spin`, 1500 points, a small radial wobble `0.02*sin(5*theta + 3*phi)`, then a tilt of 0.38 rad.

**Live panel parts.** Knob: blurred shadow (+4.5, +9), a dark skirt (r*1.28) with a white notch, 40 knurl ticks at 13% white, a pale cap (r*0.6) with a pointer line. Button: 54x30 rounded box, pressed = 3px lower and darker. LED: a radial glow (r24) plus a lamp disc (r6.75); green for the active mode, orange for power. Knobs turn through `H.ease.outBack` over 0.12 s: a quick detent snap.

## Type and numbers
- All story text is **beam-written vector capitals**: a single-stroke font you build as polylines on a 10-unit cap-height grid (y down), curves from elliptical arcs sampled every 9 degrees. Straight letters are 2-4 vertices; round letters are arcs. Advance = glyph width + 3.4 units, word space 5.5 units. Needed: A-Z, 0-9, `? % . , : - ' / > +`.
- Stroke width = `H.clamp(cap*0.068, 3.2, 7.8)` px. Sizes (cap height, px): title 99, key number 129, takeaway lines 75, labels and loop words 39-45, header strip 45, small CRT readouts 21 at 50% alpha (decoration only).
- Write-on: `f` runs along the whole line's length, so the beam draws the letters in order; a two-line title uses `f1 = clamp(2f)`, `f2 = clamp(2f-1)`. Titles take 1.2 s, labels 0.3-0.4 s, headings 0.55 s.
- Numbers are redrawn every frame from the current integer, never faded. Large counts: `n = round(end * u^2.3)` with comma grouping over about 5.6 s; percentages follow their curve. At the final value draw a box round it (0.2 s) and flare the bloom.
- A heading shrinks to the top-left header strip: cap 99 to 45 and stroke 6.9 to 4 over 0.55 s, the second line starting 0.15 s later.

## Diagrams: arrows, labels, charts
- Arrow: one shaft stroke plus one chevron stroke (barb, tip, barb) with barbs 22-24px long at +-2.55 rad from the reverse direction. Never filled. Draws on in 0.2-0.3 s.
- Label: beam text centred under or beside the object, drawn after it. Inactive items in a list sit at 50% alpha, the active one at 100% inside a beam box (0.15 s, alpha 0.8, 3px).
- Signal pulse: a hot dot (radius 9px) runs along an arrow or wire at the speed of the explanation.
- Chart: needs the timebase (see Scene changes). The beam sweeps left to right; each trace is `timed`; the leading dot (radius 9px) sits on the head. Main trace width 4.5px, secondary 3.3px at 75%. Axis words in beam text, 39px. Noise on a rising trace shrinks as it settles (`H.noise` amplitude 14px times `1 - u`). Highlight the final value with a box.
- Loop: words in a row separated by chevron arrows, a return arc below (sine bulge 63px) ending in a chevron.
- Wrong: tint the text amber, add a ghost copy offset (+3, -1.5)px in #ff542e at 15% alpha, and displace points by `sin(y*0.14 + t*40)*2.25` plus eight horizontal tear bands (25% chance each, +-9px, re-rolled per frame with `H.rng(500 + frame)`). Cross it out with two red strokes (5.4px, 0.22 s), settle the wobble to 30%, write the correction in amber, then rewrite it clean in green with a three-point tick.

## Motion
- Draw-on is linear in length (the beam moves steadily); instrument changes (gain, fade, fold) use `H.ease.inOutCubic`; knob snaps use `outBack`.
- Moving objects leave a persistence trail: draw the same strokes twice more, lagged 0.035 s and 0.07 s, at alpha 0.16 and 0.08.
- Keep the frame alive: a Lissajous curve (ratio 1:2, 168x138px, phase `t*1.3`) drifts in a corner; any ring carries 0.6% ripple (12 lobes, phase `t*5`).
- Intensity flickers each frame: `0.93 + 0.07*H.rng(3000 + frame)()`. No camera; the fixed glass is the camera.
- Old content leaves by amplitude: `(1 - (t - t0)/0.3)^2`, never by a slide.

## Scene changes
Always the instrument's own controls. Each timing is a start value.
1. **Power-on opening:** at 0.12 s a dot blooms at the centre (bloom 1.6 decaying over 0.25 s); the timebase pulls it out into a 2-cycle sine sweep (0.3 s, amplitude rising to 225px); at 1.0 s the X-Y button pops in and each point blends from sweep to ring over 0.6 s (radius 267px, vertical squash 0.38); the ring winds into the spiral sphere over 1 s (`e` from 0 to 1); the title writes in beneath.
2. **Collapse to dot:** scale all points about the centre, `s = 1 - H.ease.inQuad(u)` over 0.3 s, hold a bright dot (radius 4.5 + 7.5(1-s), bloom +0.8) for 0.15 s, swap content, expand with `outQuad` over 0.35 s.
3. **X gain to zero then timebase:** squash x to a vertical line over 0.25 s, relay click, TIME/DIV knob snaps and the X-Y LED goes out; hold the centre line 0.25 s, then sweep a graph left to right (about 1.9 s).
4. **Vertical squeeze, return to the folded view:** squash y to a flat line over 0.25 s, relay, X-Y LED lights, expand into the next picture.
Stay continuous (just add beam strokes) when the next idea extends the figure.

## Finishing passes (run every frame, same strength)
1. Beam render with halo, core, dwell dots and bloom exactly as above, clipped to the glass rounded rect.
2. Phosphor lift: the quarter-size bloom buffer at 0.9*bloom, half-size at 0.85*sqrt(bloom).
3. Graticule over the beam, then the reflection layer.
4. Spill: outside the clip, the quarter buffer at 28% alpha enlarged by 18px lights the bezel lip.
5. `H.vignette(ctx, {strength: 0.35})`.
6. Panel live parts last. No film grain: the glass speckle is static and the flicker is the only noise.

## Sound palette
The picture is the sound. Gains below are relative to the reference mix; scale them together.
- element appears / drawing: `k.tone(t, {f: 'A2', type: 'sawtooth', dur: strokeDur, gain: 0.038, a: min(0.05, dur*0.25), pan: p, minor: true})` plus a partner at `f*1.5`, gain 0.019, pan `-p` (type 'triangle' if the saw is harsh). `p = clamp(x/1350)*1.2 - 0.6`. Alternate A2 and E2 between lines.
- label lands: the same buzz at 0.35 s, gain 0.5x.
- arrow completes: `k.tone(t, {type: 'triangle', f: 'E3', gain: 0.06, dur: 0.15, minor: true})`.
- relay (every control change): `k.noise(t, {filter: 'bandpass', f: 2200, q: 1.5, dur: 0.02, gain: 0.35, a: 0.001, pan: 0.7})`, again at t+0.03 (f 1500, q 2, gain 0.22), plus `k.tone(t, {f: 180, glideTo: 90, dur: 0.07, gain: 0.18})`. Knob detent: 12 ms bandpass tick at 1800 Hz, gain 0.22, minor.
- scene change: collapse `k.tone(t, {f: 220, glideTo: 55, type: 'sawtooth', dur: 0.3, gain: 0.06})` with brown lowpass noise (f 600, gain 0.12); expand reverses the glide.
- wrong: `k.play('buzz', t, {gain: 0.7, f: 73, dur: 0.45})`, pink lowpass noise (f 1200, dur 0.3, gain 0.16), square `Bb2` gliding to `A2` at gain 0.04. right: A major triad `A3 C#4 E4` in triangles (gain 0.07, dur 0.7, 30 ms stagger) over a sine `A2` (gain 0.12).
- key number: `k.play('thud', t, {f: 95, gain: 1.15})`, `A2` and `E3` saws (0.065), `A3 C#4 E4` triangles (0.09), all 1.1 s, plus pink noise (lowpass, f 1000, dur 0.6, gain 0.17). Counter ticks: 12 ms bandpass noise at 1300 Hz, gain 0.1, no more than 11 per second.
- takeaway: `A2 E3 A3 E4` triangles at gain 0.07, dur 1.0, pan spread `(i-1.5)*0.2`, over a sine `A1` (0.14).
- bed: `k.bed('hum', 0, DURATION, {gain: 0.6})` and `k.bed('room', 0, DURATION, {gain: 0.5})`; power-on thump `k.tone(0.12, {f: 60, glideTo: 110, dur: 0.4, gain: 0.14})`.

## Signature moves
- Power-on: dot, bloom, sweep, X-Y press, fold into a ring, wind into a sphere.
- The beam writes text live; the bright head and dwell dots make letters look drawn, not displayed.
- Collapse to a dot and re-expand as the cut between ideas.
- X gain to zero turns a picture into a graph; the sweep draws the curve with its own dot.
- Wrong answers shudder, tint amber, and grow a red ghost; right answers snap clean and green.
- The key number flares the bloom to about 2.9 while the INTENSITY knob jumps.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Neon green lines of equal brightness | the speed model, dwell dots, 9% retrace lines, timed buckets |
| Text is a font | build the stroke font; the beam draws it |
| White blown-out letters | wide traces keep a green body, white only at the centre line |
| No glow | both bloom buffers plus the 12px halation on flares |
| Graticule behind the trace | draw it over the beam, at 22% |
| Crossfade between scenes | collapse, gain squeeze or fade by amplitude, never dissolve |
| Static, steady image | per-frame intensity flicker and the drifting Lissajous |

## Hero frame recipe
1. Cached panel, glass, graticule and reflection; all panel knobs in rest positions.
2. A two-line title, cap 99px, centred at about y 330 and y 475, green with dwell dots, stroke 6.7px.
3. Under it a sine underline: 500 x 24px at 4 cycles, `timed`, width 3.9px.
4. A 3D wireframe or a spiral sphere (radius 267px) above, as the one hero object.
5. CRT readouts top-left at 21px, 50% alpha; mode text bottom-right.
6. Beam head: a hot dot at the last written point.
7. Bloom buffers, graticule, reflection, bezel spill, vignette. Check: stroke centres are near white, edges are green, corners glow brightest.
