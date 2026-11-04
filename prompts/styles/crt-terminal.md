---
id: crt-terminal
name: Green-Screen Terminal
family: Retro digital
fonts: [VT323, Space Mono]
best_for: software, data, AI and systems explainers, logs and pipelines, step-by-step command flows, hacker or retro-computing tone, counters and status readouts
avoid_for: warm human stories, luxury or soft emotional tone, long paragraphs, anything with photographs or many colours
---

# Green-Screen Terminal

The viewer believes they are looking at a real green-phosphor monitor in a dim room: a curved glass tube set into a moulded plastic case, text glowing with halation, scanlines bowed by the curvature, red and blue fringing creeping in at the corners, and a faint hum bar rolling up the glass. The story is a live session. Everything is a character cell or a thin vector line drawn in a single intensity, so the monitor itself does the colouring.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (unlit tube) | #070d09 | the tube at zero signal, never pure black |
| Primary ink (phosphor) | #3af860 | what a full-intensity pixel becomes after the tint; draw the source in white |
| Hot core | #b8ffc4 | where bloom stacks over text, and the power LED |
| Accent | inverse video | ink as an 80% slab with the glyphs cut out; used for the single most important thing on screen |
| Alarm / wrong | brightness flash | whole-tube gain x1.45 for 0.2 s plus blinking inverse label; no second colour exists |
| Case | #3b3934, #2c2a26, #1d1c19 | top, middle, bottom of the housing gradient |
| Recess and well | #0e0d0b to #4a463e; #050605 | bevel (dark top, lit lower lip) and the black gap round the glass |
| Badge print | #8d877a, #5f5a50 | model name, spec line, knob marks |
| Room light on glass | rgba(200,220,210,0.07) | sheen and reflections only |

One hue for the whole picture. Hierarchy is brightness (100%, 80%, 60%, 45%) and inverse video, never a second colour.

## Ground and surface
Build in this order; the case is static and cached with `H.offscreen`.
1. Tube geometry at 1920x1080: glass 1632x864 at (144, 69), corner radius 51px, soft 9px edge. Everything on screen is first painted flat onto a same-size source canvas (black fill, white ink), later warped into the glass.
2. Case (cached): vertical gradient #3b3934 / #2c2a26 at 0.5 / #1d1c19. Moulded-plastic grain: multiply every pixel by 1 plus three small terms, all seeded: white noise from `H.rng` (+-3%), a fine `H.noise` n2 at about one-pixel pitch (+-2.5%) and a broad n2 with a wavelength near 80px (+-3%). Key light from upper left: radial rgba(255,238,205,0.13) fading to 0.04 at 45% then 0; a lower-right falloff to rgba(0,0,0,0.28). Edge highlights: 2px inset 9px at rgba(255,240,210,0.08), top and left at 0.10.
3. Recess round-rect (45px margin left and right, 42 above, 45 below, radius 57): gradient #0e0d0b / #1a1916 at 0.85 / #4a463e, a 3px light shadow below it, a lower-lip highlight 0.16, a 4px dark line under the top lip. Black well #050605 21px bigger than the glass, radius 45.
4. Badge row under the glass (y = glass bottom + 66): model name Space Mono 700 22px #8d877a over a 1px black copy, spec line 17px #5f5a50, power LED radius 6 #b8ffc4 with a 33px radial glow rgba(90,255,120,0.55), two knobs radius 16 (radial #5a564e to #151412) with a 3px tick. A green spill rgba(40,140,60,0.18) fading over 45px onto the lip, `screen`.
5. Per frame: paint source, bloom, per-pixel warp, glass, then `H.grain`.

## Mark-making
Everything is drawn white on the source canvas with `shadowColor #fff, shadowBlur 3-5` (text) or 9 (big text, traces). Alpha is the only tonal control.
- **Text**: VT323, drawn per cell; secondary lines alpha 0.6-0.8, oldest log lines 0.45.
- **Line drawing**: 3px lines (4.5px for arrows, 6px for an X); boxes are four-sided polylines drawn on by `H.partial` over 0.3-0.4 s; corner-bracket frames use 27px arms.
- **Inverse video**: fill a rectangle (text width plus 6px each side) at alpha 0.8, then `destination-out` the same string and a hairline `strokeText` to keep the thin glyphs; read only the green channel of the source later.
- **Block bars**: stacked 9px-high dashes on a 12px pitch, 60px wide, alpha 0.7; no solid fills.
- **Trace**: a polyline sampled every 3px of x: `sin(x*0.07 + t*6)` plus `noise.n2(x*0.04, t)`, amplitude easing from 9px to 80px, drawn to the sweep position; a dotted 25% grid behind it.
- **Marching arrow**: a row of four ">" glyphs 33px apart; the lit one steps each 1/12 s.
- **Block cursor**: 0.55 of the line height wide, full line height tall, blinking at 2.2 Hz (`Math.floor(t*2.2) % 2`).

## Type and numbers
- VT323 only for content. Log and filler 39px (texture, never story-critical); labels 48-57px; command lines 45px; takeaway 84px.
- Echoed headline: 186px, all caps, typed at 30 characters per second; a row of 44 "=" at 48px, alpha 0.8, under it.
- Key number: 165px (percent 180px). Big counts: `value = total * clamp(u)^2` (ease-in), whole units, thousands separators. Percentages ease out.
- Typing: `H.typeOn(text, u)`; commands 70 characters per second, questions 32, takeaways 55. A block cursor follows the last character, then blinks.
- Landing a number: the numerals flip to inverse video blinking at 8 Hz for 0.5 s, then stay inverse; add a 0.15 s brightness flash x1.3.
- Status line (always on): inverse slab 45px tall from 54px inside each side edge, letter-spacing 1.5px, text knocked out: product, the question asked once (it scrolls into the line), current phase word.

## Diagrams: arrows, labels, charts
- Arrow: one 4.5px line drawn on over 0.4 s, two 20px barbs at +-2.5 rad from the end direction; a model or step is a box with an inverse-video tag centred on its top edge.
- Label: a lowercase word 12px above or below the item at alpha 0.9; a filename-like ID next to a tag in a log is texture only.
- Data log: a new line every 0.085 s, 7 lines visible, line pitch 54px, brightness `0.45 + 0.07*k` from oldest to newest; each line starts with an inverse tag word.
- Weights or values: digits re-roll at 20 fps with +-0.2 noise from `H.rng(floor(t*20))` while changing, then settle.
- Wrong: a 6px X over the output, an inverse blinking "WRONG" label (6 Hz for 0.7 s), and a whole-tube flash. Right: a 6px three-point tick and an inverse "[ OK ]".
- Chart: axes in 3px lines, tick labels in 42px, stacked-dash bars rising over 0.4 s each, staggered 0.12 s.

## Motion
- Easing: `H.ease.inOutCubic` for rolls and scrolls; typing and draw-on are linear.
- Pace: 1.5-4 s of reading time per screen; things appear typed or drawn, never faded in.
- Phase scroll: the text block shifts up 450px over 0.5 s to make room, the question dropping into the status line.
- Between beats: cursor blink, a hum bar crossing the glass (its centre climbs 0.18 glass-heights per second and wraps on a 1.3-height cycle that starts 0.15 below the glass), a whole-tube gain flicker of +-2.5% as `sin(t*2*PI*13)` (keep it off multiples of the frame rate, or it aliases to nothing), the trace jitter.

## Scene changes
V-hold roll: the current screen slides up by glassHeight + 90px while the next rises from below, `H.ease.inOutCubic`, 0.45 s; a 96px black blanking bar rides the seam. Use it once per major phase. Inside a phase, scroll or clear lines instead; never dissolve. Opening: power-on (below).
- Power-on (about 1 s): 0-0.1 s a dim horizontal line widening from a dot (half-height 0.7% of the glass); at 0.1 s it snaps open to full height over 0.28 s (`H.ease.outQuad`) with a white flash of +1.5 that decays to 0 by 0.65 s; brightness warms from 45% to 100% between 0.3 s and 0.9 s.
- Boot log: 200 characters per second, a 14-character pause at each line end; dotted leaders ("....") to a status word (OK, DONE); a 24-cell progress bar of full blocks and middots, alpha 0.62.

## Finishing passes (run every frame, same strength)
1. Bloom from the source: blur 4.5px at quarter size plus blur 6px at eighth size added with `lighter` at 0.9; sampled into the output as `glow * 0.85`.
2. Per-pixel warp with the tube coordinates (u, v in -1..1, r2 = u*u + v*v): sample at `(u,v) * (1 + 0.065*r2)`, scaled 0.985 and 0.99; red reads at `+0.0016*r2*2.2` further out, blue the same amount further in. The lookup table never changes, so compute it once.
3. Scanlines belong to the pre-warp image, so the curvature bends them: `0.42 + 0.58*cos(PI*sy/4.5)^2` (a 4.5px period), `sy` in source pixels.
4. Hum bar: x `1 + 0.07*exp(-((sy - humY)/105)^2)`.
5. Phosphor tint: `R = 7 + (0.2*r^1.6)*255`, `G = 13 + min(1.15, g)*235`, `B = 9 + (0.34*b^1.6)*255`; hot cores drift toward white-green above 0.8. Vignette factor `clamp(1 - r2*0.28)^1.4` on top.
6. Glass: radial edge darkening to rgba(0,0,0,0.55); soft top-left sheen 0.07; a blurred 54px window reflection patch at 69-90% of the width, peak 0.04; a 4.5px specular arc along the top, rgba(255,255,255,0.12), blur 3px.
7. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 12, mono: true})`; optional `H.vignette(ctx, {strength: 0.25, color: '#000', inner: 0.6})` over the case.

## Sound palette
- element appears (line typed by the machine): `k.noise(t, {filter: 'bandpass', f: 1200, q: 3, dur: 0.012, gain: 0.12, a: 0.001, minor: true})` every 0.09 s across the print window.
- label lands: a status blip `k.tone(t, {f: 'A3', type: 'square', dur: 0.06, gain: 0.04, a: 0.002})`; tags on boxes use D3 or G3 at 0.05.
- arrow completes: a beam crackle for the draw: `k.noise(t, {dur: drawLen, filter: 'bandpass', f: 1700, q: 3, gain: 0.07, a: drawLen * 0.2})`, panned from the tube x of the start to the end.
- drawing / writing: operator typing = `k.play('typing', t0, {dur: typedLen, gain: 0.7})`; heavier variant per key: bandpass noise f 2300 (gain 0.22, dur 0.02) plus brown lowpass f 600 (gain 0.3, dur 0.05) plus `k.tone` 150 Hz (dur 0.04, gain 0.08), 0.07-0.11 s apart. Enter: the same at 1.4x plus a brown f 400 thump.
- scene change (roll): `k.tone(t, {f: 62, glideTo: 44, type: 'sawtooth', dur: 0.53, gain: 0.08, a: 0.14})`, pink bandpass noise f 1000 q 1.1 gain 0.08 across the roll, `k.play('thud', t + 0.45, {gain: 0.25, f: 85})`. Scroll: a brown lowpass noise sweep f 400, dur 0.5, gain 0.12.
- wrong: square tones A3 and Bb3 together (dur 0.32, gains 0.1 and 0.08), then a flash zap: highpass noise f 1800 (dur 0.14, gain 0.16) plus `k.play('thud', t, {gain: 0.55, f: 90})`. right: two terminal bells (E4 then A4, 0.1 s apart): `k.tone` triangle, dur 0.5, gain 0.16, plus an octave partial dur 0.25, gain 0.04.
- key number: counter ticks `k.noise` bandpass f 2000 (dur 0.016, gain 0.13) at a gap shrinking from 0.25 s to 1/12 s; at landing a zap at 1.6x, a bell chord C4 E4 G4 plus C5 0.08 s later, and `k.tone(t, {f: 'C2', gain: 0.28, dur: 0.8})`.
- takeaway: typed, then two soft bells (G3 then C4, 0.12 s later, gains 0.11 and 0.14).
- bed or music: `k.bed(0, DURATION, {kind: 'hum', gain: 0.5})` plus `k.bed(0, DURATION, {kind: 'room', gain: 0.5})`; a relay clunk `k.play('tock', t, {gain: 0.45, f: 260})` on each new log example.

## Signature moves
- The typed question scrolls up and survives as the inverse-video status line for the whole video.
- A V-hold roll with a black blanking bar carries the story to the next screen.
- Numbers land as blinking inverse video with a phosphor flash and a bell.
- The tube powers on: dot, line, flash, raster, warm-up.
- Real barrel distortion with red-blue fringing at the corners, scanlines that bow.
- A box-drawn tag in inverse video names every component.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Green overlay on a flat screen | paint white, then tint per channel through the warp |
| Straight scanlines | apply them before the warp so the curvature bends them |
| Text with no glow | `shadowBlur` 3-9 plus both bloom layers |
| Extra colours (red errors, blue links) | brightness, blink and inverse video only |
| Fade-ins and bounces | type, draw on, roll; nothing eases in softly |
| Mono grain too strong | 0.035, mono, 12 fps |

## Hero frame recipe
1. Cached case, recess and badge row.
2. Source canvas: 39px boot lines left (dotted leaders, OK flags, 24-cell bar), a 186px headline under them with its row of "=", a block cursor after it.
3. Right panel: bracket frame, dotted grid, a swept trace at 60% progress, a caption with a counting percentage.
4. Inverse-video status line at the bottom of the glass.
5. Bloom, warp with fringing, scanlines, hum bar at about 40% height, tint, vignette factor.
6. Glass sheen, reflection, specular arc, LED and knobs, grain 0.035. Check: text edges glow, corners fringe, and no pixel is pure black.
