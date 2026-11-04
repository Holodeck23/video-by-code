---
id: synthwave
name: Retro Grid Horizon
family: Retro digital
fonts: [Orbitron, Caveat]
best_for: tech, gaming, music, futurism and speed topics, countdowns, anything with a journey toward a goal, confident late-night energy
avoid_for: gentle, handmade or earnest topics, dense tables, small print, daylight or medical subjects
---

# Retro Grid Horizon

The viewer believes they are looking through the windscreen of a car driving a glowing road at night, toward a striped sun that sits on a horizon of wireframe mountains, with a chrome-lettered title floating in the sky and neon tubes mounted on the dashboard. The quality that sells it is single-point perspective: everything lives on one road, scrolls toward the viewer at one steady speed, and is lit by additive pink and cyan light.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Sky stops | `#05021a` 0, `#1c0640` 0.45, `#5a0f6e` 0.78, `#c41a7e` 0.94, `#ff4fa0` 1 | vertical gradient from the top to the horizon |
| Sun stops | `#fff6a0`, `#ffd23f` 0.3, `#ff8a3d` 0.55, `#ff3d7f` 0.8, `#d4147f` | from the top of the disc to 60% below its centre |
| Floor | `#2a0838` 0, `#12041f` 0.15, `#07010f` 1 | below the horizon; road surface `#1a0830` to `#0b0418` |
| Hot pink (primary tube) | `#ff4fd8`, script `#ff2fb6`, glow `#ff1fa8` | main neon, curves, headline script |
| Cyan | `#4ff3ff` | road edges, axes, frames, labels; wireframe peaks |
| Accent (gold) | `#ffe066` | used for the single most important thing on screen |
| Violet / lilac | `#b02cff`, `#c86bff`, `#b9a2ff` | wireframe lines, focal object, secondary labels |
| Right | `#5cffb0` | correct state |
| Alarm / wrong | `#ff2020` tube, `#ff3d7f` text | X marks and a full-frame red flash at alpha 0.25 |
| Unlit glass | `rgba(255,120,220,0.08)` fill, `rgba(255,150,210,0.28)` rim | every tube is visible before it ignites |

## Ground and surface
World projection (1920 x 1080): horizon `HZ = 657`, vanishing point `VPX = 960`, focal length 630, camera height 1.25. A point at lateral `x`, height `h`, depth `z` lands at `(960 + x/z*630, 657 + (1.25 - h)/z*630)`. Road half-width 2.4 units.
1. **Sky**: the gradient above, down to the horizon. Stars from `H.rng(404)`: 220 points, `y = r^1.6 * 0.8 * HZ`, size 0.9-2.7 px, colour `rgba(255, 200-255, 255, (0.35 + 0.6r) * twinkle)`, twinkle `0.55 + 0.45*sin(t * rate + i)` with rate 1-4 and a 0.25 s fade-in at a random start in the first 1.4 s. Stars above 2.5 px in the upper half get a cross glint: two 1.5 px lines `18 + size` long, `rgba(200,240,255,0.5 * twinkle)`.
2. **Sun** (centre (960, 528), radius 264, redrawn per frame on a scratch layer): an additive halo radial from 0.6R to 2.1R (`rgba(255,90,150,0.55)`, `rgba(255,40,140,0.15)` at 0.5, then clear), the disc with the sun gradient, then slice it with `destination-out` bars. Bars start at `cy - 0.18R` and repeat every 33 px, scrolling down 15 px/s; bar height `3 + f * 16.5` where `f` grows from 0 to 1 over the lower body of the disc, so bars thicken toward the bottom.
3. **Mountains**: a height field on a grid of x in [-64, 64] step 2.6 and z from 80 down to 26 step 2.4, height `ridge * peaks * back * front`. `ridge = H.smoothstep(4.5, 15, |x|)` keeps the road corridor flat; `peaks = 2 + 36 * pow(n, 1.6)` where `n` is `fbm2` mapped to 0..1 from `H.noise(19)`, sampled with 4 octaves at x frequency 0.075 (shifted by 3) and z frequency 0.09. Cache the projected mesh; per quad fill from `#120531` toward `#3a0f63` by `height/26`, then stroke 1.65 px in violet-to-cyan (`#b02cff` to `#4ff3ff` as height passes 55%), alpha `(0.3 + 0.6 * nearness) * density`, plus one diagonal at about half that alpha. `density = clamp((quadHeightPx - 1.5) / 10.5)` hides flat quads. During the intro scale heights `hs` from 0 to 1 over 1.3 s.
4. **Floor and road** (per frame, clipped by the reveal): fill the floor gradient. Grid in three additive passes (9 px `rgba(255,30,170,0.12)`, 4 px `rgba(255,50,190,0.35)`, 1.65 px `rgba(255,150,230,0.9)`): spokes at `x = 2.4 + 2.6k` on both sides, z 0.5 to 74; rungs every 2.6 units, offset by `(7t mod 2.6)`, drawn only outside the road. Road trapezoid with the road gradient; a sun-reflection wedge from (960 +- 4.5, HZ) to (960 +- 225, H), `rgba(255,120,120,0.55)`, `rgba(255,60,160,0.15)` at 0.35, clear; cyan edge lines in three passes (15 px 0.12, 6 px 0.35, 2.4 px 1, `rgba(80,240,255,a)`); centre dashes 0.16 wide, 1.5 long, every 3.2 units, `rgba(255,240,200,0.85)`, scrolling at the same 7 units/s.
5. **Horizon flare**: a 4 px horizontal gradient (clear, `rgba(255,200,230,0.95)` centre, clear) at HZ, plus a 60 px haze band peaking at `rgba(255,60,160,0.35)` at 30% of its height. Intro: the flare opens from the centre outward over 0.5 s, then the grid reveal `y = HZ + u^2.2 * (H - HZ)` races toward the viewer over about 1 s.

## Mark-making
**Neon stroke** `neon(path, colour, w)`, all three passes additive, round caps and joins: wide halo at `5w`, alpha 0.18; body at `2.2w`, alpha 0.45; white core at `max(1.5, 0.7w)`. Base `w` is 3 px for arrows and arcs, 2.4 px for fine detail, 6 px for heavy marks.

**Neon text** (any word set in a tube colour): (1) dark backing so it separates from sun and grid: fill `rgba(20,0,44,0.6)` at 55% alpha with a `rgba(14,0,34,0.9)` shadow, blur 18; (2) fill in the colour with `shadowBlur` 33, again with 12; (3) a hot core, a stroke of the colour mixed 62% to white (`H.mixRGB`), 90% alpha, width `max(1.2, 0.04 * size)`; (4) a 22% fill of the colour mixed 45% to white. Before a tube is lit, draw it as unlit glass: faint fill, a 2.7 px rim at 60% in its own colour, and a cold 1 px highlight offset (-0.9, -1.2).

**Ignition (flicker)**: for 0.32 s after `t0`, step through ten levels, one per 32 ms: full, off, full, 30%, off, full, full, 50%, full, full. Then hold at full. Everything lights this way, never a fade. The same function times the buzz.

**Arrows** are neon polylines drawn on to `prog` and finished with two 24 px head strokes at plus and minus 0.5 rad from the last segment, only at `prog = 1`. Lane chevrons on the road are pink V shapes (half-width 0.9 unit), five of them spaced 2.6 units, width `max(1.2, 9/z)`, alpha fading out by z = 14.

**Wireframe sphere** (a focal object on the horizon, radius 111): a dark radial disc behind it, a circle, five latitude ellipses (`ry = 0.28 rx`) and six meridian ellipses whose widths follow `|R cos(a + 0.6t)|` so it spins. Colour `#c86bff`, blending to white for 0.2 s (`1 - (t mod 0.35)/0.2`) each time something is absorbed.

**Chrome lettering** `chrome(text, cx, baseline, size)`: Orbitron 800, letter-spacing 6 px, whole line skewed by `-0.22`. Order: 14 extrusion copies, back to front, each offset (+0.83, +1.35) px more, filled from `#ff2fb0` toward `#1a0533`; a 13.5 px `#12032a` outline; the chrome gradient from `baseline - 0.74*size` to `baseline + 2` (`#0e2a6b` 0, `#3d7fd6` 0.18, `#d9f2ff` 0.42, `#ffffff` 0.5, `#2a0a2e` 0.505, `#5a1d3a` 0.58, `#d0602a` 0.75, `#ffc06a` 0.9, `#fff1c8` 1: note the hard break at the horizon line); a bevel layer on a scratch canvas (3 px white 95% stroke shifted (-1.5,-2), 3 px `rgba(40,0,60,0.55)` shifted (+1.5,+2.5), clipped to the glyph, then the interior removed so only a rim remains); and a 1.2 px `rgba(255,170,240,0.55)` outer rim.

**Glint**: a radial white spot of radius `s/2`, plus two thin diamond slivers (horizontal `s` long and 3 px tall, vertical `0.7s`), additive.

## Type and numbers
- Titles: chrome Orbitron 800, 156-168 px (running header 84 px). Tube headlines and labels: Orbitron 800, 42 px (never below 39). Script line: Caveat 700, 111 px, rotated -0.09 rad, flickers on, with a 6 px pink underline that draws on over 0.35 s as a dash of length `630 * progress`.
- Key number: chrome Orbitron 800, 138 px, same chrome recipe, with the unit smaller.
- Counter: a nine-window odometer (735 x 132 px, 81 px per digit cell, 33 px for commas) in a chrome bezel (`#9aa6d8 #2a2448 #120c26 #3a2a5a #c28ad8`) with a smoked window. Digits Orbitron 800 96 px, `#aaffff` with a cyan blur 24 glow; only the last digit rolls (vertical offset `frac * 108`), the rest hold. Drum look: fade the top and bottom 36% to near-black, an inner shadow, and a diagonal glass glare at 10%. Counts ease with `H.ease.inOutCubic`.
- Text is never typed or written. It slams in (chrome) or ignites (tubes).

## Diagrams: arrows, labels, charts
- Labels are neon tubes beside their object, ignited by the flicker, 21 px of clear space. A callout is a tube plus a short neon arrow.
- Wrong: a red X tube (4.5 px, 69 px square), a gold ellipse circling the correct answer (drawn on over 0.3 s), a red flash. Right: a `#5cffb0` check tube (three-point stroke) and the same word set in green.
- Chart: a small sky chart with four cyan gridlines at 18%, cyan L-shaped axes, ticks 33 px, a pink neon curve (3.6 px) with a soft gradient wash beneath it (`rgba(255,79,216,0.22)` to clear) like phosphor, and a white-hot head dot with a radius-33 halo that rides the curve.
- Dashboard: a slab along the bottom (polygon (0,852) (180,810) (1740,810) (1920,852) down to the frame edge) with a near-black gradient, a cyan neon top edge, a chrome bevel line 4.5 px lower, and recessed panels (rounded 15 px) holding the process tubes, the odometer and knobs. Knobs are 37 px radius domes with 11 ticks on a 270 degree arc; a lit tick is cyan, or pink while the value is changing; the pointer is a 2.4 px neon line.

## Motion
- Everything on the road moves at one speed, 7 units/s (rungs, dashes, chevrons); the sun scroll and the glint sweep are the only other constant motion.
- Entries are slams: scale from `1 + 1.5(1-u)^3` to 1 over 0.4 s with alpha `clamp(4u)`, plus a flash. Other elements ignite.
- Camera: rigid, except a tilt of 450 px with `H.ease.inOutCubic`. Perspective does the rest.
- Items riding the road shrink with depth by the projection alone; the focal object's pulse is the only reaction when they arrive (every 0.35 s).

## Scene changes
- **Slam and flash**: a new title lands with a full-frame additive `rgba(255,200,255,0.35 * exp(-8dt))` and a radial flash of radius 780 at 70%, decaying with `exp(-7dt)`. Overlays from the previous beat fade out over 0.25 s.
- **Tilt**: the world drops 450 px over 0.7 s, exposing 120 extra stars (`H.rng(77)`, 2 px, alpha 0.3-0.9) in a `#05021a` sky; the dashboard slides down 285 px in 0.35 s first. Tilt back over 0.5 s.
- Stay continuous along the road between beats; only the overlay set changes.

## Finishing passes (run every frame, same strength)
1. Bloom on the finished frame: a quarter-resolution blurred copy (480 x 270, blur 4 px) drawn full-frame with `screen` at 0.3 (0.55 for title-only shots). Use a scratch canvas created once, not `H.offscreen`.
2. CRT scanlines: 1.5 px lines of `rgba(0,0,0,0.12)` every 4.5 px, phase `floor(20t) mod 3` steps so they crawl.
3. `H.grain(ctx, t, {strength: 0.04, cell: 2, fps: 12, mono: true})`.
4. `H.vignette(ctx, {strength: 0.5, color: '#060014', inner: 0.55})`.

## Sound palette
80s, gated and analog. Minor sounds go inside `k.minor(fn)`.
- element appears (tube ignites): a 120 Hz sawtooth buzz `k.tone` of 34 ms per flicker step, gain `0.16 * level`, plus a 2.2 kHz `k.noise` tick (dur 0.008, gain 0.22, bandpass q 1.5) at each re-strike, then a 0.35 s hum tail at gain 0.07.
- label lands: the same ignition, gain halved, `minor`.
- arrow completes: analog zap, sawtooth `k.tone` gliding 300 to 1100 Hz (`glideTo`) over 0.3 s, gain 0.06.
- drawing / writing: none for text; the underline swash is a quiet `k.play('swish', t, {gain: 0.4})`.
- scene change: `k.play('riser', t - 0.4, {dur: 0.42, gain: 0.5})` into a gated snare at the slam (`k.noise` pink bandpass 1700 Hz, q 0.6, dur 0.24, gain 0.32, plus a 230 to 160 Hz `k.tone` dur 0.12 gain 0.22) and `k.play('thud', t, {f: 90, gain: 0.7})`. Tilt: `k.play('whoosh', t, {gain: 0.6})`.
- wrong / right: wrong is a red flash, `k.play('thud', t, {f: 80, gain: 0.75})` and three falling sawtooth notes `'A3'`, `'D#4'`, `'A#4'` (dur 0.55, gain 0.07). Right is triangle `'G4'` then `'C5'` 0.1 s later, gain 0.1.
- key number (the biggest hit): gated snare at gain 1.3, `k.play('impact', t, {f: 70, gain: 1})`, a saw chord stab, and a pink noise glint at 1.2 to 2.2 kHz.
- counters: 40 clicks per second while the odometer runs, `k.noise` bandpass 1800 Hz, q 3, dur 0.012, gain 0.17; knobs click 10 per second at 1500 Hz.
- takeaway: triangle `'B4'` then `'C5'` 0.18 s later (dur 1.2, gain 0.12) over a low `'C3'` sawtooth.
- bed or music: `k.music(0, DURATION, {mood: 'tense', bpm: 100, key: 'A', gain: 0.42})` under the road, `mood: 'dreamy'` while tilted; `k.bed(0, DURATION, {kind: 'tape', gain: 0.4})`.

## Signature moves
- The grid races from the horizon toward the camera on the first beat.
- A chrome title slams in from the camera with a flash and a sweeping glint.
- A pink script line flickers on like a failing tube, then an underline swash draws on.
- The camera tilts up into the starfield for the chart and drops back for the payoff.
- A dashboard with a rolling odometer and glowing knobs carries every number.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Grid is a static texture | rungs scroll at `7t mod 2.6`, spokes meet at the single vanishing point |
| Neon is flat colour | three additive passes and a white core, always |
| Chrome reads as a gradient text | hard break at the horizon line, bevel rim, extrusion, outline |
| Everything fades in | ignite with the flicker table; slam titles with a flash |
| Sun is a plain circle | stripes that thicken toward the bottom and scroll |
| Too many pinks | pink for the main tube, cyan for structure, gold for one focus |

## Hero frame recipe
1. Sky gradient, 220 stars; sun at (960, 528) with stripes and halo; mountain mesh at full height.
2. Floor, grid (three passes), road with cyan edges and dashes, sun wedge, horizon flare.
3. Title in chrome at 168 px around y = 250, skewed, with extrusion and rim; one glint on it.
4. A pink script line under it, rotated -0.09 rad, lit, with the underline swash.
5. The dashboard slab at the bottom with the cyan edge and one tube label lit.
6. Bloom 0.3, scanlines, grain 0.04, vignette. Check the sun halo and the road wedge bleed into each other.
