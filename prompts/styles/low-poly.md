---
id: low-poly
name: Flat-Shaded Facets
family: Dimensional
fonts: [Space Grotesk]
best_for: journeys through a space (a valley, a city, a landscape), systems with stations, growth and progress charts, calm and optimistic tech topics
avoid_for: dense text, fine detail, human faces, topics that need realism or a documentary tone
---

# Flat-Shaded Facets

The viewer believes they are flying a camera through a small world built from a few thousand flat triangles, lit by one warm low sun, fading into peach haze. Every surface is a single colour per face, so edges and facets carry all the form. Information sits on cut-corner tags pinned to objects in that world.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Sky stops (top to horizon) | #1c2452, #4b3f86, #bf6b94, #ffb38c | at 0, 0.38, 0.7, 1 of the sky band (62% of frame height) |
| Sun light / ambient | #ffe2be / #686296 | warm key against cool violet fill |
| Fog near / high | #eda498 / #b690c0 | distance blend; the higher the face, the more violet |
| Ground low / mid / rock / snow | #56a070 to #3c8060, #6e7078, #766e80, #f4eef8 | by face elevation; sand #d6c496 at the waterline |
| Water | #6078be | flat triangles with a faint glint |
| Primary ink (tag text, outlines) | #2a1f4f | dark indigo, never black |
| Accent | #ff7060 | the single most important thing: a key tag, the tallest bar |
| Alarm / wrong | #ff5a4a | rarely: wrong answer badge, error ribbon |
| Right | #3ccf9a | confirmation badge |
| Tag fill | #fff6f0 | a lighter facet #ffffff at 50% on the top half |

## Ground and surface
Everything below is built from seeds and cached as module data, never from `t`.
1. Sky: vertical `createLinearGradient` over the sky band with the four stops above. 90 star points from `H.rng(77)`, alpha `(1 - y/240) * r * 0.8`, only in the top 240px.
2. Sun: a 14-wedge triangle fan (radius 75px, wedge shade `0.5 + 0.5*cos(angle - 2.3)` mixed between #ffd49a and #fff4d8) over a radial halo (r 45 to 480px, #ffd6a0 at 50% to 0). Fix the sun in world space, far away, so it shifts slightly as the camera moves.
3. Terrain: a jittered grid, cell 4.4 world units over 240 by 250, vertices nudged by up to 0.38 of a cell (not on the border). Height = `fbm2(x*0.045, z*0.045, 4)*7` plus a valley bowl (`(|x - 4*sin(0.035 z)| / 55)^1.7 * 22`) plus a rise toward the far end, flattened to a fixed height under any landmark by `lerp(flat, h, smoothstep(r0, r1, dist))`. Split every cell into two triangles, flipping the diagonal on `(i + j) % 2` so no grain direction shows.
4. Face colour from average elevation (bands in the palette); faces steeper than 0.55 mix 60% toward rock grey. Triangles under water level are replaced by flat water triangles with 0.35 noise bump.
5. Scenery: 220 conifers by rejection sampling (altitude 0.6-12, noise mask, none on landmark plateaus): two 5-sided cones stacked (second one 25% lighter), random rotation, green from #286e5a to #468c64.
6. Props (cards, pedestals, bars, a gem) are generated as triangle lists too and merged into the same list each frame.

## Mark-making
A tiny software pipeline on the 2D canvas, run every frame.
- Camera: position, yaw, pitch. Project `x' = W/2 + f*x_c/z_c`, `y' = H/2 - f*y_c/z_c` with `f = 1140` at 1920 wide. Discard triangles with any vertex behind 0.5 or fully off screen (+30px).
- Normal = normalised cross product; terrain and water normals are forced upward; props are flipped to face away from their own centre; cards and signs are two-sided.
- Back-face cull (`dot(n, camera - centre) <= 0`) except two-sided faces.
- Shade per face (one colour, no interpolation): `rgb = base * (ambient*0.85 + sun*max(0, n.L)*0.95)` with `L = normalise(0.75, 0.55, 0.45)`. Pillars get a cool fill from `(-0.55, 0.6, -0.6)` at 45%. Near-camera sliver faces (long edge > 90px with thin area ratio) are damped to 15-100% key so they do not flash as white streaks.
- Fog: per face, `k = smoothstep(40, 260, depth)^1.15 * 0.9`, mix toward the fog colour (violet with height). Emissive things (sign screens, gem) get only 30% of it.
- Sort all triangles far to near (painter's) by mean depth. Fill, then stroke with the same colour at 0.9px, round joins; that seals hairline gaps between faces.
- Gem: an icosahedron, each face split in four, new midpoints pulled in to 0.93 of the radius so facets look cut. Untrained: each face random from 5 jewel colours (#ff8070 #6ec8d2 #ffc878 #967cf0 #ec8cc8). Trained: all faces blend toward a coherent violet-to-rose ramp by normal. Key light plus cool fill, two specular terms (power 20 and 24), a rim term, and a lighter 1-2px outline per facet. Add an additive halo with `globalCompositeOperation = 'lighter'`.

## Type and numbers
- Font: Space Grotesk 700 only.
- Hook title: 99px, white, with a 4px shadow in rgba(30,20,60,0.35), and a two-tone coral underline (#ff7060 then #ffb08a, slanted ends). Within 1.2 s it shrinks to 42px and docks into a cut-corner header tag (#2a1f4f at 82%).
- Tags: 42px minimum (story-critical text never below 42px); counters 99 to 105px inside a tag 150px tall; key number 105px.
- Text appears with its tag: the tag scales up with `H.ease.outBack` over 0.3 s (anchor at its bottom centre), the text never fades alone.
- Counter: `v = max * H.ease.outQuad(p)^1.6`, with thousands separators, in a tag above the object it measures. When it lands, the tag turns accent coral and swells 20% then relaxes (0.35 s).

## Diagrams: arrows, labels, charts
- Tag: a six-point shape with two opposite corners cut at 0.32 of its height; width = text width + 1.3 * font size, height = 1.75 * font size; shadow = same shape offset (+6,+6) at 35% alpha; top half a facet 50% toward white.
- Pin: the tag floats 1.5 to 3 world units above its object, projected each frame, scaled by distance (clamped 0.5-1), hidden when too small.
- Arrow: a ribbon of 7 segments along a quadratic arc; each segment split down its middle into a lit half (30% toward white) and a dark half (25% toward #28144a); head is two triangles in the same pair; the last segment is shortened 35% so the head seats cleanly. Grows along the arc with eased progress.
- Chart: 5-sided prisms on a flat plateau, one per step, rising 0.4 s each with 0.2 s stagger; colour mixes from blue to green by index and the last is accent; value tags ride the newest bar.
- Verdict badge: a hexagon (24px radius) with a white check or cross (5px, mitred), a 25% white quarter facet, tilted 0.12 rad.
- Emphasis: a 10-sided polygon ring (not a smooth circle) in accent, 4px, pulsing alpha by `0.55 + 0.45*sin(12t)`.

## Motion
- The camera is the main actor: keyframes `[t, x, y, z, yaw, pitch]`, interpolated with `H.ease.inOutCubic`, 1 to 1.5 s between stations, then 2 to 4 s held with a slight drift of 1 world unit.
- Moves in this order: high overview, dive, level fly-in, sideways move to the next station, rise and pull back for the closing view. Pitch 0.13 for travel, 0.4 when looking down at a chart.
- Objects enter by scaling up (`outBack`) or rising from the terrain (prisms grow from y = plateau height).
- Gem hovers on `sin(1.6 t) * 0.6` and spins at 0.45 rad per second; a correction adds 1.2 rad of spin.
- A wrong guess shakes its sign: `sin(80 t) * 0.25` world units for 0.4 s.

## Scene changes
Prefer one continuous flight. Cross-fade nothing. Between stations fly, and let the closing tag of one beat shrink away (0.3 to 0.4 s) while the camera is already moving. Hard cut only after a pull-back, using a fog fade to #eda498 over 0.4 s if needed.

## Finishing passes (run every frame, same strength)
1. Per-face fog (above) so the far valley dissolves into the horizon colour.
2. Same-colour 0.9px stroke on every triangle, to prevent seams.
3. Additive halo on glowing objects (radial, #ffc8e6 at 25% to 0, radius 1.6 times the object).
4. No grain, no blur, no outline pass. Flat colour is the finish; do not add `H.grain`.

## Sound palette
- element appears (tag): faceted knock, `k.play('tock', t, {f: 470-640, gain: 0.45})` plus `k.noise(t, {dur: 0.02, filter: 'bandpass', f: knockF * 2.6, q: 3, gain: 0.18, a: 0.001})`.
- label lands: the same knock with `pan` toward the object's side, gain 0.4.
- arrow completes: `k.noise(t, {dur: 1.0, color: 'pink', filter: 'bandpass', f: 900, q: 1.2, gain: 0.06, a: 0.5, minor: true})` swell over the draw.
- drawing / writing: a soft gust, 5 overlapping pink-noise bandpass swells (f 260, 420, 610, 470, 300, gain 0.04, each lasting 1.9 slots) timed to each camera move.
- scene change (camera move): that gust, plus `k.bed(t, t + dur, {kind: 'wind', gain: 0.15})` while flying.
- wrong: `k.play('thud', t, {f: 120, gain: 0.7})` and `k.play('error', t + 0.02, {f: 'G3', gain: 0.85})`. right: a glass strike at D5 and `k.play('success', t, {f: 'D5', gain: 0.45})`.
- key number (biggest hit): `k.play('impact', t, {gain: 1.1})` then four glass strikes D4 A4 D5 F#5, 0.03 s apart, gain falling from 1.7.
- takeaway: two glass strikes A4 then D5 (0.09 s apart) over `k.tone(t, {f: 'D3', type: 'triangle', dur: 1.2, gain: 0.12})`.
- Glass strike: `k.tone(t, {f, type: 'triangle', dur: 0.9, gain: 0.09, a: 0.003})` plus `k.tone(t, {f: f * 2.32, dur: 0.45, gain: 0.03})`.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.2})` and `k.music(0, DURATION, {mood: 'dreamy', bpm: 96, key: 'D', gain: 0.25})`.

## Signature moves
- A flight that never cuts: one valley, one camera.
- Two-tone ribbon arrows, lit half and shaded half.
- Cut-corner tags that pop onto objects with a knock.
- A gem whose random facets realign into one colour ramp when the model learns.
- A pillar chart rising on a flat plateau, one pillar per step.
- Hexagonal verdict badge stamped on a wrong or right answer.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Smooth gradients on surfaces | one flat colour per triangle, no vertex interpolation |
| Visible cracks between triangles | stroke each face 0.9px in its own colour |
| Regular grid diagonals | jitter vertices, alternate diagonals |
| Flat, close-up world | fog by depth, warm to violet with height |
| White streaks near the camera | damp the key light for long, thin faces |
| Labels floating dead | pin them to world positions, scale with distance |

## Hero frame recipe
1. Sky gradient, 90 stars, faceted sun with halo at about (840, 350).
2. Build the terrain mesh and conifers, camera at (0, 22, -18) pitch 0.13, f = 1170.
3. Shade, cull, project, sort, fill + stroke all faces.
4. Add a hero prop on a flat plateau 40 units out (a gem on a pedestal, a pad, a tower), shaded the same way.
5. Pin one tag at 42px reading a short word above the prop, and a ribbon arrow from a second object toward it.
6. Add the additive glow behind the prop. No grain.
