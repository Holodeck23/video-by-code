---
id: deep-sea
name: Abyssal Glow
family: Light & imaging
fonts: [Fraunces, Space Grotesk, IBM Plex Mono]
best_for: how a system learns or flows, neural or network ideas, progress that climbs, "turning on the lights" reveals, calm science and wonder-toned explainers
avoid_for: dense tables, anything that must feel bright, corporate or urgent, print-first deliverables, topics where dark low-contrast frames hurt legibility
---

# Abyssal Glow

The viewer believes they are inside a submersible's lamp-less window, sinking through deep water where the only light is alive. Everything on screen is additive light on near-black: glass-clear animals that glow along their veins, drifting particles that catch the light, and words that assemble out of swarming plankton. Depth is the one quality that sells it: layers at different distances, soft focus on the far ones, and a camera that always sinks.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Water top / mid / bottom | #0c2c4a / #041428 / #000206 | vertical gradient; at full depth the top becomes #030c1a and the mid #01060f |
| Haze tint | #14466a | cloud layer, alpha 11-16% |
| Primary light (the subject) | #50e8ff | the thing the story is about; hot centre mixes 60% white |
| Flow / data in motion | #28e6c3 | currents, counters, axis dots |
| Secondary class | #9678ff | the other category, the dim state of a chain |
| Far field | #468cff | out-of-focus background animals only |
| Correction / error signal | #ff50cd | the one thing that travels backward or changes the weights |
| Attention / uncertain / lure | #ffac46 | the only warm light; a guess, a lamp, a question |
| Wrong | #ff4a3c | rarely; strokes and a flash ring |
| Right | #6effbe | outcome, check |
| Label glow | #8cf2ff | secondary labels, 45% cyan toward #bafaff |
| Particle snow | #b2cee4 | floating specks |

Every colour is only ever added (`lighter`), never painted over. One meaning per hue for the whole video.

## Ground and surface
1. Water: vertical linear gradient (top 0, mid 0.5, bottom 1) from the three colours above, mixed toward the deep set by a `depth` value (0.25 at the start, 0.95 after the last descent). Cached bands are not needed; this is 3 stops per frame.
2. Haze: a 160x90 noise map baked once with `H.offscreen('haze', 160, 90, fn)` from `H.noise(5150)` fbm (4 octaves, sampled at 0.025 per pixel across and 0.04 down), value v = clamp(fbm*0.7+0.45), pixel #14466a with alpha v squared. Draw it additively stretched to canvas + 180px, alpha max(0.11, 0.16*(1 - 0.55*depth)), drifting on a slow ellipse (x +-60px at 0.13 rad/s, y +-30px at 0.1 rad/s).
3. Leftover daylight: top 55% gradient rgba(14,52,84) at 20%, 7% at 0.45, 0 at 1. It gives volume instead of flat black.
4. Light shafts (only while near the top, amount `rays` fades 1 to 0 as depth grows): 7 slanted quads, centre x = 135 + 285i + sin(0.35t + 2.1i)*52, half-width 27 + 24*(i%3), length 540 + 180*(i%2), lean right by 0.22 of the length, vertical gradient rgba(110,195,225) at 7.5% * flicker to 0, flicker = 0.55 + 0.45 sin(0.9t + 1.7i). Four wavy surface lines at the very top, 1.8px, 5% alpha.
5. Marine snow, three parallax layers (positions wrap; every one is a pure function of `t` and the camera depth `camY`):
   - specks: 390 of them, z 0.3, radius 0.75-1.7px, alpha 0.14-0.38, settle 4.5-12 px/s
   - flecks: 165, z 0.65, radius 1.35-2.85px, alpha 0.28-0.58, settle 9-20 px/s
   - bokeh discs: 24, z 1.6, radius 10-33px, alpha 0.035-0.09, settle 15-33 px/s, out of focus
   y = wrap(p.y + t*v - camY*z), x = wrap(p.x + sin(0.2..0.7*t + phase)*3..13px - camX*z); wrap span is canvas + 180px. Near light sources, a particle brightens by k*(1 - d/r)^2 and takes the light's colour. When the camera is moving fast, replace each speck by a vertical streak of length speed*z*0.07, width 1.3*radius.
6. Glow sprites: all light is `drawImage` of a cached 64px radial sprite per colour. "soft": hot centre (colour mixed 60% to white) 1.0, colour 0.75 at 0.12, 0.22 at 0.35, 0.05 at 0.65, 0 at 1. "core": white 1.0, hot 0.9 at 0.1, colour 0.35 at 0.3, 0.08 at 0.6, 0 at 1. "bokeh": 0.45 centre, 0.55 at 0.7, 0.8 at 0.88, 0 at 1 (a rimmed disc). Cache each with `H.offscreen`.
7. Depth of field on the cheap: far animals are drawn once into a sprite at half size, blurred 1.4px, then only moved and breathed per frame. Alpha 35-45%, colour #468cff / #28e6c3 / #9678ff, size one fifth of the hero.

## Mark-making
Every shape is a glass outline (thin and bright) over a wide, faint underlay of the same path. Set `globalCompositeOperation = 'lighter'` once per creature.

**Glow stroke** (checks, crosses, rings): three passes of one path: width 4.5*lw at 16%, 2*lw at 40%, 1*lw at 100% in the colour mixed 60% to white; lw 4-7px, round caps and joins.

**Bell creature** (a node-network vehicle; half-width s, 300px hero, 225-270px working, 35-50px far). Draw in this order:
1. Pulse c = sin^2(2pi(0.45t + phase)). Width w = s(1 - 0.12c), height h = 0.8s(1 + 0.08c), centre rises 0.04*s*c.
2. Tentacles behind the bell: 14-16 from the rim at u in [-0.92, 0.92], length 0.6-1.0 of 2s (hero 630px), 25 points each, x sway sin(1.6t - 6.5f + 1.9i)*0.11s*f, f the 0-1 fraction down. Two strokes with a vertical gradient (colour 50% to 22% to 0): 7.5px at 18%, then 1.6px at 100%. One soft dot (r 12px, 75%) rides each, fraction (0.42t + hash)%1, fading as it goes down.
3. Four oral ribbons under the bell, 0.42 of tentacle length, colour mixed 35% to magenta: 0.09s wide at 6%, then 2px at 20%.
4. Bell: two cubic curves for the dome, a 16-scallop rim. Fill: radial gradient from (x, y-0.42h) to 1.08w, alpha 7% / 10% at 0.6 / 24% at 0.86 / 0, so the edge is brighter than the centre (glass). Inner dome outline at 0.7 scale, 1.8px 16%; nine radial canals, 1.5px 10%.
5. Rim: 15px at 10% plus 2.7px at 60% in the hot colour; back-rim ellipse (ry = 0.12h) lower half 1.8px 18%, front half 3px 50%.
6. Rim lights: 27 dots, radius 7.5 + 12*p, alpha 0.35 + 0.65p, p = max(0, sin(5u - 4t + 9*phase))^6 so a pulse chases around the margin; every fifth dot is magenta.
7. Network (the story graph): node rings of 3, 5 and 7 at 0.30 / 0.56 / 0.80 of the bell (angles 0.3 to pi-0.3, +-0.06 jitter) plus a hub just above the rim centre. Edges: hub to ring 1, each node to its two nearest on the next ring, a lateral link on about half. Edge weight w in 0.12-1 drives look: underlay width 4.5 + 9w at alpha 0.22*(0.2 + 0.6w), core width 0.9 + 3.3w (colour mixed 35% to white) at 0.2 + 0.6w. Node: halo radius 21 + 39*act, alpha 0.3 + 0.7*act; core dot radius 7.5 + 6*act. A signal is a 21px core dot at fraction u along an edge.
8. Halo: one soft dot of radius 2.1w at 9% behind everything.

**Chain** (a progress or rank vehicle). N = 15 points on a curve. Stem 9px at 12% plus 1.8px at 40%. Each bead: ellipse 22x15px (scale sc), radial fill 32% to 10% to 0, arc outline 2px at 65% (hot colour, open at the back), inner ring at 55% size, two dangling filaments of 8 short segments (about 7.5px each, wavering 4.5px sideways) at 22% alpha. A bead's lit amount L blends violet to cyan and sets alpha 0.35 + 0.65L; add glow dot 39sc*(1 + 0.8L) and core 10sc.

**Plankton text.** See Type. **Rainbow ripple ornament** (optional second creature): an ellipse rx 0.62s, ry s with faint fill; six meridians of 15 beads, each bead radius 4.5 + 9w, w = (0.5 + 0.5 sin(7*theta - 8t + 0.9*row))^3, hue = 110*theta - 260t + 45*row degrees, light 0.62.

**Lure.** A warm light that is the sole source for an object: soft dot r 180 amber at 55%, core 51, white-hot 18; anything it lights is a black silhouette whose fill runs from #8c603c at the lure to #030509 by 270px, plus a 3px amber rim at 85% fading with distance.

## Type and numbers
- Fonts: titles Fraunces 600 (hero lines italic 600, 126px), hook 99px, header 66px; labels Space Grotesk 700 at 48-60px (never under 45px); key number Fraunces 700 198px; counters 120px; HUD IBM Plex Mono 400 22px.
- Glow type: additive pass shadowBlur 2.6*b fill 55%, additive pass shadowBlur 1.1*b fill 60%, then a flat core fill in the colour mixed 62% to white. b = 24-27px for titles, 18-21px for labels. Nothing is flat white; the core is tinted.
- Plankton assembly: bake the string once into points (`H.offscreen` a 1920x300 scratch, scan every 4.5px, keep where alpha > 120, jitter +-0.4 cell via `H.rng(key)`); mark edge points (any 4-neighbour empty). Per point: delay r*0.42 of the window, q = `H.ease.inOutCubic(H.clamp((p - r*0.42)/0.58, 0, 1))`, start = target + polar offset (225-780px across, 165-390px up/down) or a source cloud, sideways swerve sin(pi*q)*105*(rand-0.5) normal to travel, twinkle 0.6 + 0.4 sin(t*(4+6d) + 5a). Edge points draw "core" radius 8, interior "soft" radius 7.5 at 40%. Hold 1.1-1.5s total, then crossfade to crisp glow text over 0.5s while the plankton layer drops to 15-20%.
- Numbers: counters ease in log space (10^(6*eased) - 1) while ticking; a landing number pops 1 + 0.16*exp(-5s)*sin(14s) and flashes (colour mixed toward white by exp(-3s)*0.6, blur grows by 30px).
- HUD, always on: "DEPTH 0180 m" (zero-padded, rising with `camY`), "TEMP 4.6 C" falling, a ladder with ticks every 22px scrolling at 0.6*depth, a 6px red dot blinking at 2 Hz. Colour rgb(150,220,235) at 72% / 45%. Top right, 51px in.

## Diagrams: arrows, labels, charts
- Arrow ("current"): a cubic curve (`H.bezier`, resampled every 6px) with a 3px line at 20%, then beads every 18px (radius 10px, "core"), brightness wave pow(0.5 + 0.5 sin(0.03s - 8t), 4) running along it. A drifting head lamp r 33 sits at the tip while it draws; the head is two arms of 3 beads at +-0.6 rad (13px apart) plus a bright bead at the tip. A signal pulse is six trailing cores (radii 39 down to 24).
- Label: glow type, lands over 0.3s with a 24px drop and fade (alpha and dy eased), always beside the thing it names, in the thing's colour.
- Wrong: two red glow strokes (66px long) forming a cross, the offending word shakes 9px at 70 rad/s decaying over 0.35s, a red ring grows 135 to 240px as it fades. Right: a green three-point check and a green ring.
- Chart: no bars. Use the chain: beads on an ease-out curve (1 - exp(-3.2f)); a bead lights when the value passes it; axis is a dotted line of teal cores every 21px; the head bead carries a 105px halo and the big number sits beside it.
- Error ripple: a magenta ring expanding from the point of failure to 400px at 55% over 0.7s; nodes it crosses flash magenta (act + 1.5*exp(-6r)) and their edge weights ease toward new values.

## Motion
- Easing: `H.ease.inOutCubic` for camera and travelling things, `H.ease.outCubic` for arrivals and fades, `H.ease.inQuad` for light wipes. Everything breathes: bell pulse at 0.45 Hz, tentacle sway, 3-6 px drift on chain beads.
- Camera sinks at 10px/s always, plus an eased drop of 1650px over 1s at each new section. Content moves with `camY` times its z: far animals 0.14, mid 0.6-0.8, near bokeh 1.6.
- Things switch on, they do not fade: a stepped 24 Hz flicker whose chance of being lit rises from 35% to 95% across 0.3-0.6s, then holds.
- Arrivals rise from 840px below with `H.ease.outCubic` over 0.8s; exits float up with the parallax.

## Scene changes
Three ways, all made of light. Pick by relationship between ideas.
1. Descent (default): the eased 1650px drop over 1s; snow turns to streaks, rays fade, the old group rises out of frame, the next group rises in from below.
2. Bloom wipe (when two things are compared or one follows the other): a front sweeps left to right, -300 to W+300 in 0.65s, inOut. Old scene clipped to the right of the front, new to the left. Behind the front: a 450px additive band rgba(60,220,240) at 22%, plus 340 motes (radius 4.5-12, offset |gauss|*165px, wavy x, twinkle sin(16t + phase)), 46% cyan, 46% teal, 8% magenta.
3. Lure reveal (for the final act): the scene dims over 0.3s (snow to 70%), the lure flickers on (5 flicks in 0.3s), then a radial mask grows from the lure out to 2550px over 0.7s with `H.ease.inQuad`, opaque to 0.6 then transparent, uncovering the new scene.
Stay continuous when the next idea extends the current subject: just glide the camera.

## Finishing passes (run every frame, same strength)
1. `H.vignette(ctx, {strength: 0.6, color: '#000004', inner: 0.55})`, drawn before the header so the header keeps full glow.
2. Header and HUD on top.
3. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 24, mono: true})`.
Draw every scene to its own scratch canvas (created once, cleared each frame) and composite additively, so wipes and masks cost nothing extra.

## Sound palette
- element appears: a low triangle `k.tone(t, {type: 'triangle', f: 'D3', gain: 0.07, a: 0.2, dur: 1.4})` plus five 35ms brown-noise ticks (bandpass f 420, q 2, gain 0.14) every 55ms for the flicker.
- label lands: `k.play('pop', t, {f: 340, gain: 0.65, minor: true})`; the title's sonar ping `k.tone(t, {f: 'A4', dur: 1.5, gain: 0.1, a: 0.006})` with an echo 0.38s later at 30% gain, opposite pan.
- arrow completes: pink noise murmur, bandpass f 450, q 1.6, gain 0.1, dur = draw time, `a` 0.3 of dur (minor), no ding.
- drawing / writing (plankton assembling): shimmer: sine tones from [587, 698, 880, 988, 1175, 784] Hz, dur 0.45, gain 0.022, every 0.06-0.11s through the window, plus pink bandpass f 1100 gain 0.025 under it.
- scene change: a swell (brown lowpass f 400, dur 0.9-1.4, gain 0.5, `a` 0.5 of dur) and, on a descent, seven bubble bloops (`k.tone`, f 220-480 with `glideTo` 2.1x, dur 0.075, gain 0.13) over 0.8s; the bloom wipe adds shimmer at 1.5x.
- wrong / right: wrong = two triangle tones (233 to 208 Hz dur 0.2, then 185 to 150 Hz at +0.18 dur 0.34, gain 0.2) plus `k.play('thud', t, {f: 90, gain: 0.35})`. right = ping 'A4', tone 'E5' at +0.09 dur 1.3 gain 0.08, triangle 'A3' dur 1.2 gain 0.06.
- key number: sub tone `{f: 98, glideTo: 55, dur: 0.9, gain: 0.4}`, `k.play('thud', t, {f: 80, gain: 0.6})`, a swell, a chord D3 A3 D4 F#4 A4 (dur 1.6, gain 0.066 each, pans spread), then shimmer at 1.6x. Counter ticks before it: `k.play('tock', t, {f: 620, pan: -0.3, gain: 0.55, minor: true})`, at most every 0.09s.
- takeaway: chord G2 D3 B3 D4 G4 (dur 1.4) with ping 'B4' at gain 0.5.
- bed: `k.bed(0, DURATION, {kind: 'night', gain: 0.5})`, `k.music(0, DURATION, {mood: 'dreamy', bpm: 60, key: 'D', gain: 0.4})`, plus a brown lowpass rumble f 90 gain 0.16.

## Signature moves
- Words assemble out of swarming plankton, then sharpen into glow type.
- A creature lights up piece by piece: rim, veins, nodes, each flickering on.
- The correction signal rippling backward through the glowing network in magenta.
- A chain of beads that lights one by one up a curve to show a rising number.
- A warm lure flickering on in the dark and opening the next scene from its own light.
- A bloom of sparkling plankton as the wipe between ideas.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Glow as a flat blur | stack underlay 4.5x at 16%, 2x at 40%, 1x core; additive only |
| Black is pure #000 everywhere | keep the 3-stop water gradient plus haze and leftover daylight |
| All particles move the same | three layers with z 0.3 / 0.65 / 1.6, the near one out of focus |
| Whole frame equally bright | one hero light, everything else 35-45% and blurred |
| Text just fades in | assemble from points with stagger and swerve, crossfade to glow |
| Lights ease on smoothly | stepped 24 Hz flicker that settles |
| HUD missing | it is the detail that says "submersible"; keep it, subtle |

## Hero frame recipe
1. Water at depth 0.5, haze at 14%, 7 shafts at 40% strength, leftover daylight.
2. Snow: all three layers; a bokeh disc near the lower left.
3. Far layer: two blurred bell creatures at 40% in #468cff and #28e6c3, right and left edges.
4. A chain down the right edge, 24 beads, lit about two thirds of the way in cyan, rest violet.
5. Hero bell at about (1035, 450), s 307, tentacles 630px, network fully lit, one magenta node per ring, rim pulse caught mid-run.
6. Title in two lines of 126px italic Fraunces at (495, 495) and (495, 633), glow type, plankton still hovering at 15%.
7. HUD top right, vignette 0.6, grain 0.035. Check: the bell centre should be darker than its rim, and nothing should be flat white.
