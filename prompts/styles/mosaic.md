---
id: mosaic
name: Tessera Wall Mosaic
family: Illustration
fonts: [Libre Baskerville, Cormorant Garamond]
best_for: heritage, craft, history, culture, durability and "built to last" ideas, formal explainers, anything that should feel monumental, patient and precious
avoid_for: fast or playful content, dense data, small type, anything with more than about 8 words per screen, real-time or technical dashboards
---

# Tessera Wall Mosaic

The viewer believes a wall is being built by hand, one chip of stone and glass at a time, on a bed of wet lime. Tiles are laid in rows that hug every contour, grouted with dark mortar, bevelled so each one catches the light, and the gold ground glints piece by piece as the light rakes past. The one quality that sells it: rows follow the shapes, so the picture is made of the same material everywhere.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (gold smalti) | #CCA246 | field and halo (#D6AE50); every gold tile is drawn from the pool below |
| Gold pool | #C69A3C #D6AC4C #E2BC5C #BA8E34 #EECC70 #CEA040 | picked per tile; 5% of tiles #96702A |
| Primary ink (outline) | #26242C | contours, pupils, lines, borders, the wrong-mark |
| Accent (deep red) | #9E2E22 | arrows, key shapes; lettering #7C1E1A, small text #5C1412; the single most important thing on screen |
| Cream | #E2D6BE | inscription plaques, text halos, border band; #E8DEC4 for plaque faces |
| Blue | #223668 and #405E9C | one large mass and its fold highlights |
| Right / result | #347C42 | tick, confirmed answer; #1f6a34 for a landed number |
| Neutrals | #A6B4BC / #788896 | stone-grey surfaces and shadow side |
| Accents | #40ACC0 teal, #B26838 copper, #C48C46 tan | small details only |
| Grout | #7A7060 | all mortar; multiplied by 0.75-0.95 |
| Bare bed | #CEC2AA | lime before any tile is set; red-ochre underdrawing #A8543A |
| Flash | rgba(255,220,140,0.5) | gold glint on key moments |

Real mosaic has few colours: do not add more than six hues to a scene.

## Ground and surface
The whole wall is computed once per scene (in `window.__ready`, cached; each scene gets its own key), then every frame only decides which tiles exist at time `t`. Expect a couple of seconds per scene at 1920x1080.
1. **Label map.** Paint the scene as flat shapes on a scratch canvas via `H.offscreen('labels-' + id, W, H, fn)`: every region (background, border, plaque, arrow, letters, shape) gets its own unique flat RGB key and a tile size. Read the pixels once; edge pixels that match no key take the label of their left neighbour (or the one above in column 0).
2. **Distance field.** For each pixel, the distance to the nearest region boundary: seed boundary pixels at 0.5, then a two-pass chamfer (orthogonal step 1, diagonal 1.4142). Where d > 2px, add `noise.n2(x*0.03, y*0.03) * 2.4` (`H.noise(4)`) so rows wander like a hand-laid course.
3. **Rows.** With tile size `s`, `row = floor(d / s)` and `fr = d / s - row`: rows are iso-distance bands, so they run parallel to each contour. Exception: the open gold ground. Beyond two rows from any edge (d >= 2s), switch to straight horizontal courses: `rv = (y + noise*4.5) / s`. The seam between the two systems counts as grout.
4. **Seeds.** Walk the pixels; where `|fr - 0.5| * s <= 0.9` (the band centre line) place a seed unless one of the same region and row lies within `s * (0.82 + 0.3 * r())`. Bucket seeds on a 24px grid. Give each seed a distance weight of 0.88-1.14 so tiles differ in size.
5. **Tile ownership.** Each pixel belongs to the nearest seed of the same region and same row (distance times weight); if none is close, fall back to the nearest seed of another row.
6. **Grout and bevel.** `edge = min(row-edge distance = min(fr, 1-fr)*s, (second-nearest minus nearest) / 2, d, zone seam)`. Grout where `edge < g`, with `g = 1.6 + 0.5 * noise` (px). Elsewhere a bevel: `k = clamp(1 - (edge - g) / 4)`; brightness = `1 + k*k * dot(n, L) * 0.3 - 0.06*k + noise*0.03`, with `n` the unit vector from seed to pixel and light `L = (-0.6, -0.8)` (upper left). Multiply by a per-tile tone of 0.94-1.06 from a hash of the seed position. Grout brightness `0.75 + 0.2*noise + 0.1*(edge/g)`.
7. **Tile colours.** Gold tiles come from the gold pool. Other regions: base colour times `1 + gauss*0.06`, plus `gauss*6` per channel. About 14% of gold tiles are "glinters" with a random phase 0-6.28.
8. **Bare bed** (before a tile is set, and under the not-yet-laid parts): #CEC2AA times `0.88 + 0.07*n(x*0.04, y*0.04) + 0.05*n(x*0.33, y*0.33)`, plus faint trowel-drag bands (`0.04 * sin(tr*9 + 0.23*y)`, `tr` a slow noise), 3% darker specks, 1.5% lighter grains. Pixels within 2.5px of any contour show red-ochre #A8543A: the underdrawing, visible until tiles cover it.

Tile sizes (px at 1920): open gold field 20, haloes and large forms 14-17, details and outlines 9-12, lettering 8. Compose with at most 25 regions per scene.

## Mark-making
**Per-frame tile pass.** Build one `ImageData`; per pixel: no tile yet (`t < laidAt[tile]`) gives bed; else grout or tile colour times brightness. Wet mortar: for 0.2 s after a tile is set, add `(1 - age/0.2) * 0.3` brightness (grout darkens by a third of that). Glint: `sp = max(0, sin(1.4*t + phase + x*0.0027))^10`; add `sp * 120 * (1 - 0.5*k)` to R, 0.92 of that to G, 0.6 to B, and give glinters `+0.12` brightness. The result is a band of light that rakes across the wall every ~4.5 s and makes single tiles flash in turn.

**Laying times.** One float per tile, `laidAt = elementTime + modeOffset + r()*0.04`. Modes: solid (all at once), sweep along x (`(x - x0)/(wallWidth) * 0.7 s`), radial from a point (`dist/390 * 0.45`), bottom-up inside an element (`(H - y)/H * 0.5`), short sweep (`* 0.25`). Pressed-in elements (plaques, shapes): solid or radial; arrows and bars: sweep or bottom-up so they grow tile by tile along their length.

**Plaque.** Ink rounded rectangle (radius 21px), 9px cream-bordered inside it at radius 15px, then the lettering. Plaques are how text gets a clean ground.

**Frame.** Ink fill, cream band inset 21px, red lozenge row (66px wide, 36px high, every 96px along the top and bottom; tall ones down the sides), deep-red keyline inset 72px, gold field inset 84px. Repeat on every scene so the wall feels like one object.

**Live tesserae** (counters, needles, anything that changes): lay them on a regular grid, not through the pipeline. Draw the glyph or shape into a canvas of `w/cell x h/cell` pixels; each cell with alpha >= 110/255 becomes a square tile: grout square #766C5C filling the cell, the tile inset 1.2px with +-0.6px jitter, tone 0.88-1.10 by `H.rng(seed)`, a 1.8px pale edge (white 22%) top and left, a 1.8px dark edge (black 22%) bottom and right. Cell 9px for numerals, 9px for needles. Re-seed per 12 fps tick (`H.rng(floor(t*12))` as the jitter seed) so the number visibly re-sets tile by tile.

**Flash.** At a key moment: a radial `screen` gradient rgba(255,220,140,0.5), radius 330-450px, up in 0.15 s, out in 0.4-0.5 s, over the thing that landed.

## Type and numbers
- Libre Baskerville 700 for all lettering (Cormorant Garamond 600 for an opening title). Headline 168px (never below 66px), plaque labels 45-60px, floor 45px, key number 168px.
- Stems must span at least two tile rows: stroke the text with `lineWidth = min(7px, size * 0.045)` below 60px and `size * 0.065` above, and fill it; fit to the plaque width by shrinking, never below 45px.
- On gold ground, add a halo: the same text stroked first in cream with `lineWidth = max(24px, size * 0.2)`, round joins, so the letters sit in a contour of pale tesserae. On a cream plaque, no halo.
- Lettering colour: #7C1E1A (large) or #5C1412 (small); the confirmed answer in #347C42.
- Numbers are live tesserae: grid cell 9px, bold serif, 168px, stroke 6.75px. Large counts move through log space (`10^(1 + 5e)`, `e` eased with `H.ease.inOutQuad`); percentages ease out as `1 - (1-u)^2.3`. On landing: a pop `1 + 0.15*(1-u)^2` over 0.3 s, colour #7C1E1A switching to #1f6a34 when the target is reached, plus a flash.
- Text is pressed in a line at a time (solid mode); never typed.

## Diagrams: arrows, labels, charts
- Arrow: a round-capped polyline 24-27px wide in deep red, plus a filled triangular head (tip 1.6 widths past the end, wings 2 widths back at +-2.3 rad). One region, laid by sweep so tiles appear along its length.
- Label: text on a cream plaque next to its object, or directly on the gold with a halo; never over a busy area.
- Chart: bars are rectangles, 75px wide, 105px pitch, the last one in red, the others in the blue pair; axes are 18px ink bars. Bars rise bottom-up over 0.2-0.5 s each, 0.18 s apart, laid solid colour with the grid tile pipeline.
- Dials, needles, counters: live tesserae on a grid.
- Wrong: a 16px ink cross laid over the item with a gold flash and a dull thud. Right: replace the item in a second layer (the label map of the first stays whole) with green text and a green tick.

## Motion
- Everything is a laying event. Elements arrive 0.1-0.25 s apart; the field sweep takes 0.7 s across the full width; a plaque or shape is pressed in all at once; a radial element fills out from its centre in 0.4 s.
- The wall itself does not move; there is no camera. Life between beats: the raking glint band, wet-tile brightening, and the 12 fps re-setting of live tiles.
- Hold each scene 3-4.5 s with the new element appearing every 0.3-0.6 s, so the viewer always sees something being laid.

## Scene changes
Prise the wall up and re-lay. The outgoing scene gets a removal time per tile `sceneRem + (x - x0) / wallWidth * 0.55 s`, so a front clears left to right over about 0.55 s, while the next scene's field is laid in the same direction over 0.7 s, starting 0.05 s later. Composite scenes newest first: for each pixel, the first scene whose tile there is laid and not yet removed wins; otherwise the next older one; otherwise bare bed. Re-use the frame, title plaque and gold ground so only the content changes. Replace a single item (a plaque) in place without prising the whole wall by laying the new tiles in a second layer over it.

## Finishing passes (run every frame, same strength)
1. Raking light: a diagonal linear gradient across the canvas (top-left to bottom-right): rgba(255,240,200,0.10) at 0, transparent at 0.6, rgba(20,10,0,0.18) at 1.
2. `H.vignette(ctx, {strength: 0.42})`.
3. `H.grain(ctx, t, {strength: 0.035, cell: 2, fps: 12, mono: true})`: a stone-dust texture over everything.
4. Gold flash overlays (above) for key moments, drawn before the three passes.

## Sound palette
Mosaicist's workshop: dry stone clacks, a trowel scrape, a small stone-room reverb. No high pings.
- element appears (pressed in at once): four clacks within 40 ms plus a thunk `k.tone(t, {f: 190, glideTo: 110, dur: 0.07, gain: 0.12})`, pan by the element's x. A clack is two noise bursts: `k.noise(t, {f: 1500 to 2800, filter: 'bandpass', q: 2.5, dur: 0.014, gain: 0.32, a: 0.0008})` and `k.noise(t, {f: 0.38 * that, filter: 'bandpass', q: 3, dur: 0.022, gain: 0.24, a: 0.001})`.
- label lands: a `set` at gain 0.5-0.8; no ding.
- arrow completes: 3 clacks spread across the sweep (0.05-0.3 s), nothing at the head.
- drawing / writing (a front being laid over d seconds): n clacks at randomised times (gain 0.55-1.05, pan following x) plus `k.noise(t, {color: 'pink', f: 480, filter: 'bandpass', q: 0.8, dur: d + 0.05, gain: 0.07, a: min(0.08, 0.3d)})`, a trowel smear.
- scene change (prise up): `k.noise(t, {filter: 'bandpass', f: 1100, q: 1.6, dur: 0.55, gain: 0.12, a: 0.06})` plus 10 loose clacks scattered across the front; then the re-lay as above.
- wrong / right: wrong = `set` at gain 1.6, `k.play('thud', t, {f: 100, gain: 0.55})`, `k.play('error', t, {f: 'E3', gain: 0.45})`, and a pink bandpass shimmer (f 1100, q 4, dur 0.5, gain 0.05) for the flash. Right = `k.play('success', t, {f: 'G4', gain: 0.6})`.
- counter: one clack per re-set tick (at most 12 per second, speeding up mid-count), `f` rising 1500 to 2200, gain 0.5-0.85.
- key number (biggest hit): `k.play('impact', t, {gain: 1.0})`, a `set` at gain 1.6, then `k.play('ding', t + 0.02, {f: 'C5', gain: 0.45})` and `{f: 'G4', gain: 0.35}`.
- takeaway: three `ding` at C4, G4, E5, 0.1 s apart, gain 0.55 falling 0.05 each.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.4})`; no music.

## Signature moves
- Rows that echo every contour, switching to straight courses on the open gold.
- Gold tiles that flash in turn as a band of light rakes across.
- The wall is pried up in a left-to-right front and re-laid for the next idea.
- Numbers built from live tiles that re-set at 12 fps and land with a gold flash.
- Bare lime and red-ochre underdrawing visible before the tiles arrive.
- Arrows that grow tile by tile along their length.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Flat Voronoi cells (cobbles, stained glass) | rows from the distance field, seeds along row centres, owner in same row only |
| Uniform gold | six-colour pool, 5% dark tiles, per-tile tone, glinters |
| Rows ignore shapes | iso-distance rows; straight courses only on open ground |
| Tiles have no depth | bevel from the up-left light, plus grout 1.6-2.1px |
| Text unreadable | stems of two or more rows, 45px floor, cream halo on gold or a plaque |
| Scene cuts or fades | prise up and re-lay in a sweeping front |
| Static wall between beats | glint band, wet-tile brightening, live counters |
| Too many colours | at most six hues per scene |

## Hero frame recipe
1. Label map: ink fill, cream band, red lozenge border, red keyline, gold field (tile 20px), with the focal motif (any icon) roughly centred, in at most 8 regions with tile sizes 9-16px.
2. Distance field, rows, seeds, ownership, grout, bevel as above; bare bed with underdrawing for any tile not yet laid.
3. Set `t` so the field and the motif are fully laid; one cream plaque with a two-word label in Libre Baskerville 700 60px #7C1E1A, 45px minimum.
4. Gold glint pass at a phase where a diagonal band of tiles is lit; a flash if it is a key beat.
5. Raking-light gradient, vignette 0.42, grain 0.035. Check: zoom to 200%: individual tiles with dark grout, a lit upper-left edge, and rows that curve around the motif.
