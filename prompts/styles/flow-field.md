---
id: flow-field
name: Streamline Braids
family: Generative & type
fonts: [Space Mono]
best_for: systems, models and networks explained as flow, data moving through a process, feedback and learning loops, "order emerging from noise", abstract or technical topics with a premium look
avoid_for: warm human stories, cute or playful tone, anything that needs literal objects, dense text, cheap-feeling budgets of motion
---

# Streamline Braids

The viewer believes they are looking at a scientific visualisation of a fluid: thousands of hairline streamlines that bend around one unseen, perfectly dark core and pile into glowing braids on near-black paper, colour changing along a refined gradient. The core is the subject; everything else is the current that reveals its shape. The one quality that sells it is additive hairlines: nothing is filled, light only builds up where lines overlap.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (centre) | #16182a | radial, centred near 55% x and 48% y, radius 0.75 W |
| Ground (edge) | #08090e | |
| Gradient stop 1 to 3 | #123a4a, #1c6f78, #5fb3a6 | cool end: deep teal to sea green |
| Gradient stop 4 to 5 | #cde3cf, #f3e6c8 | pale middle: sage to ivory |
| Gradient stop 6 to 9 | #edbb73, #de7a52, #a8384e, #5a1e44 | warm end: amber to coral to plum |
| Primary ink (text, rims) | #ece4d2 | at 0.45-0.98 alpha; never pure white |
| Accent (coral) | #de7a52 | the counter-current, wrong outcomes, one highlighted tag |
| Accent (teal) | #5fb3a6 | the matching correct outcome |
| Core | #1a1c28 / #0d0e15 / #06070a | disc stops: centre-left lit, edge near black |

Colour is looked up with `H.mixRGB` along the nine stops; one line = one colour. Gradient position comes from the line's streamfunction value, so neighbouring lines share hue and braids read as bands.

## Ground and surface
1. Ground: the radial gradient above, cached with `H.offscreen`.
2. Streamfunction field per frame on a 6px grid (7.5px if tight on time): `psi = pot + (swell + eddies) * away + 0.1*(y - H/2)` where
   - `pot = dy * (1 - Rc^2 / r^2)` is flow past a cylinder with centre (cx, cy) and radius Rc (168 at 1920, 138 with captions), `away = H.smoothstep(1.05 Rc, 2.1 Rc, r)` so all disturbance dies at the core,
   - `swell = fbm3(x*0.00173, y*0.00173, 0.06 t, 3) * 285`, `detail = n3(x*0.004, y*0.004, 0.12 t) * 39` (use `H.noise`; the slow z-axis drift makes the field breathe),
   - `eddies`: 4 Gaussian vortices downstream of the core at (+360, +105), (+630, -105), (+915, +99), (+1170, -78) from the core, strengths +142, -158, +128, -105, each `g * 0.5 * ln(d^2 + 2025) * exp(-d^2 / (2*225^2))`.
   Velocity is `(dpsi/dy, -dpsi/dx)` by central differences: divergence-free, so streamlines never cross the core or each other.
3. Sampling uses bilinear lookup in precomputed `vx`, `vy`, `psi` grids.
4. Per frame everything is recomputed from `t` (nothing carried over). Cache only the ground and the sparse seed table.

## Mark-making
**Seeding.** `H.rng(91)`: draw 10000 points uniformly over the frame plus a 30px margin, drop those inside the core. Keep a seed only if `rng() < 0.18 + dens^2 * 1.4`, with `dens = 0.5 + 0.5*n3(x*0.0027, y*0.006, 7.3)`: dense braids separated by quiet gaps, anisotropic (stretched in y so braids run along the flow).
**Trace.** From each seed walk both directions up to 170 steps of 3.3px with a midpoint (RK2) step on the normalised velocity so spacing is even; stop at the core edge (0.98 Rc) or off the grid. Join the two halves into one polyline with the seed index marked.
**Colour.** `u = clamp((psi + 480)/960 + 0.22*n2(x*0.0023, y*0.0023) + 0.02*gauss)`, put each line into one of 28 colour buckets.
**Draw (additive).** On a transparent layer, `globalCompositeOperation = 'lighter'`, round caps: for each bucket one `beginPath`, add every line of the bucket, stroke once at 1.0px and alpha 0.10-0.16 (0.12 + 0.04*order in the ordered phase). A line appears as if it grows out of its seed: with `grow = H.ease.outCubic(clamp((t - birth)/1.6))` draw only the slice from `seed - ceil(grow*170)` to `seed + ceil(grow*170)`, where `birth = 0.35 + 1.5*(x/W) + 0.8*rng()`: a wave left to right.
**Bloom.** Blur a quarter-size copy by 4.5px, add it back at 0.55-0.6 alpha (`lighter`), then add the sharp layer on top. Where lines pile up the colour clips toward the pale stops.
**Sparks.** Choose about 5% of long lines (170 of them; 90 in the explainer). Each has a head at `((t*speed + phase*len) mod (len + 300)) / 3.3` steps, speed 90-180px/s, and a tail 22 steps behind (a gradient stroke from the line colour at alpha 0 to the colour mixed 50% with #fffaeb at 0.6, width 1.8px, fading in from 2.6 s over 1.2 s).
**Core** (`coreBody`): draw in order: warm halo (rgba(255,230,190,0.07) to 0 from 0.9 Rc to 1.5 Rc, `lighter`); contact ring (rgba(4,4,8,0.75) at 0.96 Rc, 0.4 at 45%, 0 at +10px); disc with a radial gradient lit from the upper left (centre offset (-0.35 Rc, -0.4 Rc)), stops #1a1c28 / #0d0e15 at 0.6 / #06070a; inside the clip an upper-left rim light (rgba(243,230,200) up to 0.13) and a faint teal counter-light (rgba(95,179,166,0.06)) bottom right. Finally a 1.2px ivory rim at 0.4 alpha, drawn clockwise from the top as the core appears (0.9 s).
**Particles** (scripted, for the story): a soft glow disc (radius 4x, colour at 0.9, `lighter`) plus an ivory core point (0.6 r) and a 10-14 sample trail whose alpha ramps up 0 to 0.8, line 2.4px.

## Type and numbers
- Space Mono only; letter-spacing 5px on a big title, 3px when docked.
- Title: 700, 90px (never below 66px), centred on a rgba(8,9,14,0.65) plate; after the field fills it shrinks to 45px and docks top-left over 0.8 s.
- Labels: 700, 42-48px (never below 42px), colour of the thing named (coral, teal, ivory), attached by a hairline leader (1.5px, 0.6 alpha) with a 3px end ring.
- Key number: 700, 132px, ivory, right-aligned; counters 111px; units and captions 400, 42px at 0.7 alpha.
- Step strip ("a → b → c"): 700, 45px, the active step 0.98 alpha with a 4.5px underline, others 0.35.
- Small footer caption: 700 16px with typed-on letters (22 characters per second) and a secondary line at 0.45 alpha (decorative, never carries the story).
- Numbers count on `H.ease.inOutCubic`; large counts in log space; the final value locks while a coloured underline draws under it (0.4 s, 255px).

## Diagrams: arrows, labels, charts
- Flow is the arrow: a scripted particle with a trail follows a Catmull-Rom path; its glow is the arrowhead.
- Entry: inputs spiral in, `r = lerp(r0, 0.95 Rc, u^0.8)`, `theta = theta0 + 2.6 u^2`.
- Fork: a tracked particle passes above or below the core (path through 7 points around it at +-0.75 Rc and +-(Rc + 39)) and leaves by one of two exits, each marked by a hairline gate ring (13px) and a label.
- Wrong: the exit ring grows from 18 to 87px and fades; a coral dashed return line (4.5px, dash [15, 9], offset moving at 90px/s) runs back along the path to the core.
- Learning: flip the circulation term `(swirl + circ) * ln(r/Rc)` from -82 to +82 over 0.9 s so the next particle goes the other way; turbulence `swell` amplitude falls from 285 to 39 as order rises.
- Chart: a hairline sparkline (1.5px, ivory 0.8) with baseline and ticks every 45px, a glowing end dot (r 3.6px, glow 15px), its big number beside it.

## Motion
- Start dark; the core fades in first (0.9 s), then the wave of lines; sparks begin once the field is full.
- Camera: keyframes with `H.ease.inOutCubic`; push to zoom 1.18 centred 165px right of the core in 0.8 s for the key moment, return in 0.8 s. Apply the camera to the hairline layer, keep hairline width constant on screen (0.7px / zoom world units).
- Particles move on `H.ease.inOutCubic` over 1.2-2.4 s; groups are staggered by random start times over 3-4 s.
- Between beats the field breathes: the noise z-axis advances at 0.06 per second, so braids slowly shift.

## Scene changes
No cuts. Use a field state change: the swirl, circulation and turbulence parameters change smoothly while captions fade in 0.3 s and out 0.3 s (labels never overlap). When the topic changes, ease the camera back to the wide shot (0.8 s), let the new caption type on, then push in again.

## Finishing passes (run every frame, same strength)
1. Bloom (above): quarter-res blur copy added at 0.55-0.6.
2. Ground gradient already dark; no vignette needed. Optional: `H.vignette(ctx, {strength: 0.2, color: '#04050a', inner: 0.6})`.
3. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 12, mono: true, blend: 'overlay'})`.

## Sound palette
This style sounds like air, not objects.
- element appears: a soft sine note (`k.tone`, 0.9 s, gain 0.09, `a: 0.03`) with a 0.25 s pink bandpass puff at 1.2 kHz (gain 0.025).
- label lands: the same note quieter (gain 0.07), `minor`; pitch from the set D3, F#3, A3, D4, E4 (a D major pentatonic).
- arrow / particle passes: `k.noise` swells, pink bandpass, 6 slices over the path, panned left to right with the particle, brightest in the middle (f from 500 to 1500, `gain: 0.07`).
- drawing / writing: typed captions are silent; counters use 20 ms pink bandpass grains at 1.4 kHz (gain 0.16), at most 12 per second.
- scene change: a broad slow breath, pink bandpass (300 to 800 to 350 Hz over 1.0 s, gain 0.13).
- wrong: a falling pair, `k.tone` D4 (0.5 s) then Bb3 (0.9 s, gain 0.13) with a rising bandpass puff; right: a chord D4, A4, F#4 (1.4 s, gain 0.11).
- key number (the biggest hit): `k.play('impact', t, {gain: 0.45})`, `k.tone(t, {f: 'D2', dur: 2.2, gain: 0.22})`, then `k.play('ding', t + 0.1, {f: 'D4', gain: 0.45})` and A4 70 ms later.
- takeaway: the chord D3, A3, F#4, A4, staggered 90 ms, 1.5 s, gain 0.1.
- bed or music: `k.music(0, DURATION, {mood: 'dreamy', bpm: 64, key: 'D', gain: 0.5})`; the field as breath: a 0.95 s pink bandpass burst every 0.5 s, f 700-1200 Hz, `gain 0.05`, rougher (low q) when turbulence is high, smoother when ordered.

## Signature moves
- The core appears first, then a wave of braids sweeps left to right, growing from the seeds outward.
- Bright sparks riding currents along a few lines.
- Particles spiral into the core and exit one side or the other.
- A coral dashed counter-current carries the error back.
- The field re-combs: turbulence falls and braids smooth into parallel order.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Lines look like wool | width 1.0px, alpha 0.1-0.16, one colour per bucket, additive |
| Even density | thin seeds by low-frequency noise (`dens^2`) |
| Streamlines cross the core | use a streamfunction with `away` falloff; stop at 0.98 Rc |
| Flat colours | colour from psi along nine stops, with jitter |
| No glow | quarter-res bloom plus pale-clipping where lines stack |
| Heavy captions | mono, hairline, thin leaders, one caption at a time |

## Hero frame recipe
1. Ground gradient; core at (0.40 W, 0.47 H) radius 168.
2. Streamfunction at t = 6.8 with the four downstream vortices; 10000 seeds thinned by `dens`.
3. Trace, bucket into 28 colours, draw at 1.0px/0.10 alpha, additive.
4. Bloom, sharp layer, then 170 sparks.
5. Core body and the ivory rim.
6. Footer caption (16px) typed, a secondary line, and a small number at right.
7. Grain 0.035. Compare to a long-exposure photograph: the braids should glow, the core should be the darkest thing on screen, and no line should end abruptly inside the frame.
