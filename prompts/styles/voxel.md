---
id: voxel
name: Toy-Block Diorama
family: Dimensional
fonts: [Silkscreen, Fredoka]
best_for: systems made of zones and stations, build-up and growth stories, pipelines and loops with a verdict, counters and rankings, friendly or playful tech topics, games and education
avoid_for: anything photographic, human drama, dense paragraphs, topics where toy colours would undercut seriousness
---

# Toy-Block Diorama

The viewer believes they are watching a tiny diorama assembled from thousands of identical cubes on a warm peach studio sweep. Every object, arrow and caption is made of cubes: they rain from above and click into place, faces are three flat tones, creases are darker, shadows lean away from one soft light. A slow camera trucks along a long floating island, one zone per idea.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (sweep) | #ffe6c9, #fbd6b8, #f2c3a6 | vertical gradient at 0, 0.6, 1; plus a centre radial glow rgba(255,248,236,0.85) to 0, radius 960px |
| Grass | #9fcb55 to #b9d65e | topmost layer, mixed by noise |
| Soil, strata | #d08a4f / #c27c4a (layers 1-2), #bd7548 / #a9653e (3-5), #8d5a44 / #7a4c3d (deeper) | random mix per voxel; one darker course every third layer |
| Foliage, trunk | #6fb04a, #86c35a, #5f9f42; autumn #ffad3b, #ff9a2e, #ffc14d; trunk #8a5a3b | pick per voxel |
| Water, sand, stone | #5ec7dc / #7fd6e3, #f2d49a, #e9dcc4 | water sits one voxel lower than grass |
| Prop neutrals | #f4ead8, #e3d6c0, #b9b3ad, #8f8a86, #5b5468, #4a4458, #2b2d42 | body, trim, joints, dark screens |
| Tag paper and ink | #fff4e2, #74432d | caption plates and their text |
| Accent | #ff8a3d | the single most important thing: the key number, the changed part |
| Alarm / wrong | #ff5a4f; plate #ffd2cc with #c2382a text | rarely |
| Right / result | #3ccf9a; board tint #d8f5e6 | |
| Emissive | #7ff9ff, #ffd23f, #ff5a4f | lit voxels: eyes, indicators, bars |
| Shadow tints | #605496 (cast), #503c6e (crease), #463246 (underside) | cool violet, never black |

## Ground and surface
1. Sweep: vertical gradient plus the radial glow above. Cached with `H.offscreen('sweep', 1920, 1080, fn)`.
2. Voxel world: a `Map` keyed by integer (x, y, z), built once outside `__renderFrame`; each voxel stores colour, an emissive flag and an `appear` time. Per frame only the landed ones occlude.
3. Terrain: footprint is a superellipse, `e = (|x-cx|/hw)^6 + (|y-cy|/hh)^4 + 0.18*noise`, kept where `e < 1`. Walk down from the top: layer k exists only while `e < 1 - 0.13k` (beyond layer 1), so the underside tapers into a rocky cone. A square island (32x32, radius about 12.6 jittered by `2.2*noise` around the rim) can instead taper with radius `R*(1 - (k/12.5)^1.35)`. Add a one-voxel hill where an `H.noise(4).fbm2` field is high. Colours by layer as in the palette, drawn with `H.mixRGB(a, b, r())` and `H.rng(8)`.
4. Dressing: trees (trunk 2-4 voxels, canopy a jittered sphere of radius 1.6-3.4, `H.rng` radius jitter +-0.35), 26-40 flower voxels on grass only, ponds cut one deep with a sand ring, stone slabs, a conveyor or board per zone. Props are stacks of box fills `box(x0,x1,y0,y1,z0,z1,colour)`.
5. Floating islets: three 2x2 chunks of soil and grass bobbing whole voxels (`round(0.6*sin(1.6t + 2i))`), so they hop, not glide.
6. Floor shadow: far below the island, a blurred ellipse (blur 39px, fill #965046, alpha 0.26), drawn before voxels, cached via `H.offscreen`, offset away from the light.

## Mark-making
**Projection** (orthographic, dimetric). Camera holds a focus `(fx,fy,fz)`, scale `S` (14px per voxel overview, 34px close-up, 27px for a still) and `yaw` 0.48-0.70 rad. With elevation 30 degrees: `sx = 960 + (dx*cos(yaw) - dy*sin(yaw))*S`, `sy = 570 + bob + (dx*sin(yaw) + dy*cos(yaw))*0.5*S - dz*0.866*S`, `bob = 4.5*sin(1.4t)`. Sort voxels far to near by `(dx*sin(yaw) + dy*cos(yaw))*0.866 + dz*0.5` and cull any whose centre is more than 2S outside the frame.

**Faces.** Draw only the three that face the camera, and only when the neighbouring voxel is empty. Brightness and tint multiply the voxel colour: top 1.0 and (1.00, 0.98, 0.93); the +y face 0.80 and (0.97, 0.95, 1.00); the +x face 0.64 and (0.92, 0.92, 1.04). Fill and stroke with the same colour (0.6px) so seams never show.

**Corner ambient occlusion.** For each face corner, look at the two edge neighbours and the diagonal neighbour in the layer in front of the face: `ao = 3` if both edges are solid, else `edgeA + edgeB + diagonal`. A face with any occlusion is cut into a 4x4 grid; each cell bilinearly blends the corner values, `k = 1 - 0.13*ao`, colour `mixRGB(base*k, #503c6e, (1-k)*0.35)`. An unoccluded face is one flat quad.

**Cast shadow.** Light direction towards the sun is (-0.42, -0.62, 0.66), back-left and high. For every face that looks toward the light, march from its centre in 0.5-voxel steps (max 44, stop above z=40); a hit means shade: base times 0.7, mixed 18% towards #605496. Falling voxels neither cast nor receive.

**Depth tone.** Voxels below z=8 mix toward #463246 by `(8 - z)/16 * 0.5`, as if bounce light faded with depth.

**Emissive voxels.** Skip shading, brighten 25% on top faces and 5% on sides. After all opaque voxels, switch to `lighter` and add a radial glow at each lit front or top face: radius 1.3S, colour at 0.5 alpha to 0.

**Drop-in.** A voxel's `appear` is set per zone; from `appear` to `appear + 0.32 s` it falls from 7 voxels above with `H.ease.outCubic`, flat shaded, then joins the solid set. Order matters: ground builds from the underside up (deep layers `0.05 + (5-k)*0.15`, the grass layer at 0.95), plus `0.35*hash` (a per-voxel hash of the coordinates) and `0.006*|x - xmid|` for a gentle sweep. Props stack bottom-up at `0.045 s` per layer plus `0.1*hash`.

**Block tags** (the caption plates). A front rectangle in the plate colour; a darker right face (x0.62) and bottom face (x0.78) extruded by `d` = 6-12px as parallelograms; a soft shadow on the front only (rgba(90,50,30,0.35), blur 18, offset (3,9)); a 2px white rim at 45% on the top and left edges; text centred. Plates pop with `H.ease.outBack` over 0.3 s; they leave by shrinking, not fading.

**Pictograms.** 5x5 bitmaps (strings of X and dots) placed as one-voxel-thick slabs on a 7x7 card, face 1 voxel in white-cream; verdict signs (cross, tick) are emissive bitmaps landing column by column, 0.02 s apart.

## Type and numbers
- Information type: Silkscreen 400. Tag labels 42px (never below), counter 81px on a 129px-tall plate, key number 90px on a 141px plate; Fredoka 700 66px for the takeaway sentence on a 123px plate.
- Pixel title: rasterise the string with Silkscreen 8px to a small offscreen bitmap (alpha above 110 counts), then draw each lit pixel as a block of 11px (5.4px when shrunk into a header). Extrude with oblique edges `0.42*block`, only where the neighbour pixel is missing (right edge x0.62, bottom x0.78). Front colour runs top #8a5236 to bottom #ff7a2f by row; a 14% white highlight strip on any top edge. Title letters come out 60-77px tall.
- Reveal: `prog = floor(ease*18)/18` stepping column by column, 0.15 to 0.9 s; letters pop with a 26px drop over 0.24 s, delayed by `0.016*x`.
- Numbers tick at 12 fps (`floor(t*12)/12`). Large counters: thousands follow `outCubic^1.6`, low digits spin randomly until the final value, which lands exactly. Percentages step in 36 increments, easing in-out.
- Hook title centred first (blocks 11px), then moves and shrinks into a header plate (#fff4e2 with a #b89a80 offset shadow of 8px) over 1 s.

## Diagrams: arrows, labels, charts
- Arrow: a chain of 10-16 small cubes (0.55 voxel; the last 0.9 as a head) along a parabolic arc `z += sin(pi*u)*lift` (lift 3-5 voxels). Reveal count is stepped: `floor(ease*N)`, so cubes click on one by one. Brown #74432d for flow, #ff5a4f for error return.
- A packet riding a chain is a single 1.2-voxel cube with its own shadow.
- Stage tags: numbered plates ("1 NAME") above the object, anchored by projecting the object's top centre, offset 15px up.
- Emphasis: four L-shaped brackets (33px long, 9px thick, #ff5a4f) close from padding 51px to 12px over 0.3 s, blinking every 0.125 s for the first 0.5 s, then steady.
- Chart: a bar chart of voxel columns (2x2 footprint) on a slab; height is `(value-50)/50*14` voxels; column i starts at `start + 0.2i`, each block 0.035 s after the last; colours alternate #9fd8f0 / #7fc8e8, the final column #ff8a3d. A value plate rides the newest block.
- Text on a surface: map unit text into the face plane with `ctx.transform` using the projected edge vectors, font size in voxel units.

## Motion
- Everything lands with a 0.32 s drop; nothing slides except the camera, plates (pop) and ground shadow.
- Camera: keyframes of focus, scale and yaw, interpolated with `H.ease.inOutCubic`, 0.9-1.2 s between zones. Overview (S 14px) opens, pushes to a zone (S 34px), trucks along the island, and pulls back at the end.
- The scene never rests: camera bob 4.5px, islets hop, emissive voxels flicker (toggle colour every 0.1 s while something is processing), and a waving arm or flag swaps voxel poses on the sign of a 0.8 Hz sine.

## Scene changes
Truck the camera. When the focus has covered about 40% of the move, the next zone's voxels begin dropping in; the old zone's plates have already shrunk away over 0.3 s. Zones stay on the same island, so there is never a cut. To reset, pull back to the overview (S 14px, yaw 0.62) and truck again.

## Finishing passes (run every frame, same strength)
1. Floor shadow under the island (see Ground).
2. Emissive glow pass in `lighter` mode, after voxels and before tags.
3. `H.vignette(ctx, {strength: 0.18, color: '#783c28', inner: 0.55})`.
4. Static speckle, cached once with `H.offscreen('speck', 1920, 1080, fn)` from `H.rng(3)`: per pixel `n = (r - 0.5)*0.025*255`; light grains white with alpha `|n|*5`, dark grains black with alpha `|n|*1.1`; one `drawImage`, never animated.

## Sound palette
- element appears (a block lands): a hollow plastic knock made of a 26 ms `k.noise` burst (bandpass, f 600-1400, q 2.2, gain 0.26, 1 ms attack) and a 45 ms triangle `k.tone` thump at a fifth of that frequency (gain 0.12); mark `minor`.
- shower of voxels: one 16 ms bandpass grain per landing (f 500-2000, `q: 1.8`, `gain: 0.11`), thinned to 16-22 grains/s with 0.6-1.4x random spacing.
- stack lands: `k.play('tock', t, {gain: 0.55, f: 260})` plus a 70 ms brown-noise lowpass thud (f 900, gain 0.3).
- label lands: one block click and `k.play('pop', t, {f: 480, gain: 0.5})` for the big plates.
- arrow completes: a click per cube with `f` rising 900 + 40n, last at gain 1.0.
- drawing / writing: title columns each a block click at 1150-1330 Hz, thinned to 65 ms.
- scene change (camera): soft pink noise swell pink noise through a bandpass near 380 Hz (q 0.7, gain 0.045) whose attack is half the move length, so it swells and fades with the truck.
- wrong: `k.play('error', t, {f: 'A3', gain: 0.8})`, `k.play('thud', t + 0.2, {f: 110, gain: 0.45})`, the cross lands as five clicks. right: `k.play('success', t, {f: 'F5', gain: 0.42})`.
- key number: ticks at 12/s `k.play('tick', t, {f: 3200, gain: 0.85})` while it counts, skipping moments near a block click; then `k.play('impact', t, {gain: 1.25})` and four stacked `ding` notes ('F4', 'A4', 'C5', 'F5'), 30 ms apart, then six clicks on the burst ring (12 square blocks, 12px, radius 60 to 150px, fading over 0.8 s).
- takeaway: `k.play('ding', t, {f: 'C5', gain: 0.3})` then 'F5' 90 ms later, and a held triangle `k.tone` on 'F3' for 1.4 s at gain 0.1.
- bed or music: `k.bed(0, D, {kind: 'room', gain: 0.25})` and `k.music(0.4, D, {mood: 'bright', bpm: 104, key: 'F', gain: 0.28})`.

## Signature moves
- Everything rains in, cube by cube, ground first and details last.
- Arrows are chains of little cubes clicking on one at a time.
- Counters spin their low digits at 12 fps until the number lands, on an extruded plate.
- A lit-voxel gauge (a bar or equaliser) re-levels when something changes.
- A verdict drawn as a voxel pictogram, with blinking corner brackets.
- The key number's burst: a ring of 12 square blocks.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat isometric boxes | three tones and tints, corner AO, cast shadows from one fixed light |
| Black shadows | tint with #605496 and #503c6e |
| Smooth moves | whole-voxel steps for bobbing, stepped arrow reveal, 12 fps counters |
| Seams between faces | stroke each face with its fill colour, 0.6px |
| Soft text over a hard world | use Silkscreen on extruded plates; Fredoka only for sentences |
| Everything appears at once | per-voxel jittered `appear` times, bottom-up |
| Grey, flat ground | warm sweep, glow, floor shadow, vignette |

## Hero frame recipe
1. Cached sweep and glow, floor shadow ellipse at the bottom.
2. A floating island: 32x32 footprint, top at z=10, tapered strata, a pond, three trees, flowers, stones.
3. One character or machine from box fills, with two emissive voxels.
4. Render at `yaw 0.62`, `S 27px`, focus at the island centre; shadow ray on, AO on.
5. Glow pass on the emissive voxels.
6. A pixel title at 11px blocks near the top-left, and a numbered tag plate on the main object.
7. Vignette and static speckle. Check: the creases between stacked voxels must read darker, and every shadow must lean toward the front-right.
