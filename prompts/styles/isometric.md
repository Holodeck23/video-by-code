---
id: isometric
name: Isometric Diorama
family: Dimensional
fonts: [Inter]
best_for: systems and pipelines, "where does X happen" tours, supply chains, infrastructure, growth stories, anything that reads as a place with stations along a route
avoid_for: close emotional storytelling, dense text, topics with no physical or spatial metaphor, anything that needs a human face
---

# Isometric Diorama

The viewer believes they are looking down at a toy city built on a floating slab of lacquered card, seen through a locked 30-degree camera. Every object is a clean matte solid in three soft tones with a long violet shadow, and tiny people give it scale. Pale pastels carry the whole frame and a single coral accent marks the one thing that matters.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (page) | #f6efe8 / #efeaf4 / #e4e3f3 | diagonal gradient, stops 0 / 0.55 / 1 |
| Floor top | #fbf8f3 | the walkable surface of the slab |
| Slab side / underlayer | #cfc6ea / #b9addf | slab body and the inset soil layer under it |
| Primary ink | #2d3058 | headlines, tag text, number digits |
| Quiet ink | #7b7aa3 | sub-labels, small captions |
| Structure blue | #aab6e8 | machines, bars, main solids; also #dbe3f6 (pale buildings), #8e97c9 (belts, rails) |
| Dark panel | #4a5488 | screens' bezels, inset panel faces, connector colour (at 75%) |
| Accent (coral) | #ff6b5b | the single most important thing on screen; tints #ff8a7a, #ffc2b4, #ffd9cf |
| Right / result | #3ccf9a | success badge only; foliage uses #7fc8a8, #a3dcc0, #c4ecd6 |
| Alarm / wrong | #ff6b5b on #ffe3df | same coral, used rarely; it is also the accent, so do not use coral for anything else on a wrong beat |
| Shade tint | #5c5896 | what side faces are mixed toward; shadow colour rgb(110,96,170) |

## Ground and surface
Steps 1-3 are static: bake them with `H.offscreen('ground', W, H, fn)`. Steps 4-6 move with the camera and are drawn each frame (a handful of polygons).
1. Fill a diagonal linear gradient from (0,0) to (W,H) using the three ground stops.
2. Dot lattice: 3px squares every 42px, odd rows shifted 21px, `rgba(120,110,170,0.10)`.
3. Glow: radial gradient centred near (990,570), radii 60 to 930, white 70% fading to 0.
4. Projection: `P(x,y,z)` returns screen x = 960 + (x-fx - (y-fy)) * 0.866 * s, and screen y = 585 + (x-fx + y-fy) * s/2 - (z-fz) * s + bob. Here (fx,fy,fz) is the camera focus in world units, `s` is px per world unit (36 wide shot, 52 normal, 70-100 close-up) and `bob = 4.5*Math.sin(1.2*t)`. +x runs down-right, +y down-left, z up. The whole slab bobs; nothing else sways with it.
5. Slab, bottom to top: inset underlayer box (0.3 units in from every side, 0.6 deep, #b9addf), main box 0.9 deep in #cfc6ea (no edge strokes), floor polygon #fbf8f3, paving lines every 1 world unit at `rgba(170,160,205,0.2)`, 1.5px.
6. Zone tints: flat polygons on the floor (`rgba(255,214,196,0.35)` peach, `rgba(205,240,224,0.45)` mint) behind a station. Painted floor text is Inter 800 at `rgba(150,140,200,0.55)`, laid in the floor plane with `ctx.transform(0.866, 0.5, -0.866, 0.5, ox, oy)` and scaled by `s/35`. Finish the slab with a 2px white 95% stroke along its two front top edges.
A long soft shadow of the whole slab sits below it: the footprint shifted +2.2 units in x and `3.2*s` px down, blurred `0.5*s` px, `rgb(90,80,150)` at 14%.

## Mark-making
Everything is a filled polygon; there are no dark outlines. Light edges stand in for linework.

**Shading `shade(base, k=1)`** returns four colours: top = base mixed 42% toward white (`H.mixRGB`), left face (+y side) = 8% toward white, right face (+x side) = 28% toward #5c5896, edge = 75% toward white at 90% alpha. Three tones per solid, always: light top, mid left, dark right.

**Box** `box(x,y,z,w,d,h,shade,edges)`, passes in order:
1. Contact strip (only when it stands on the floor and is taller than 6px): three strokes along the two front base edges, widths 12 / 6 / 3px (capped at 0.3 / 0.15 / 0.07 of a unit) at alphas 0.07 / 0.10 / 0.14 in `rgb(60,50,110)`. The faces drawn next cover the inner half, leaving a soft dark seam.
2. Right face polygon, then left face polygon.
3. Tonal falloff over both side faces in one fill: vertical gradient, white 13% at the top edge, 0 at 40%, `rgba(60,50,110,0.10)` at the floor. Skip below 10px tall.
4. Top face polygon.
5. Edge light: 1.5px round-joined strokes along the front two top edges and the near vertical edge, in the edge colour.
Detail goes onto a face by mapping local coordinates through `P` at that face's plane: inset panels one shade darker, window bands (#a9b8e6 with a slanted 55% white glint), vent slits (`rgba(110,105,170,0.35)`, 0.12 units tall), a 0.3-unit coral signage strip.

**Cylinder** `cylinder(cx,cy,z,r,h,base)`: ellipse radii `rx = r*s*Math.sqrt(1.5)` and `ry = r*s*Math.sqrt(0.5)`. Body = lower half-ellipse, vertical edges, upper half-ellipse; fill with a horizontal gradient (0: base +15% white, 0.35: +30%, 0.55: base, 1: 32% toward #5c5896). Cap = full ellipse at 50% white. Add two band arcs (`rgba(90,150,140,0.35)`, 2px) and a darker inner cap ellipse at 0.45 radius.

**Shadows, one layer for the whole scene.** For each solid, take its footprint and the same footprint shifted by `(1.1h, 0.12h)` in world units, run both through `P` at z=0 and fill their convex hull black on a scratch canvas created once outside `__renderFrame` and cleared each frame. Then `destination-in` the slab polygon, `source-in` fill `rgb(110,96,170)`, and draw it at 16% under all objects. One layer means overlaps never double up. Shadow height `h` is the object's visible height times its entrance ease.

**Tubes and pipes**: three passes along the same polyline: body in the colour mixed 30% toward #5c5896 at 9-13px, lighter core 60% as wide lifted 0.15*width, white 70% highlight 1.8px lifted 0.3*width, plus flange discs at inner joints.

**Foliage and tiny people.** A tree is a 4.5px trunk plus three stacked circles (#7fc8a8, then #a3dcc0 up-left at 0.72 radius, then #c4ecd6 at 0.25 radius) and a crescent of `rgba(80,120,140,0.18)` clipped inside. A person is about 0.95 units tall: two 4px legs in #4a4f78, a rounded torso 13x(0.42 body) in one pastel with a white 35% strip down its left, a skin-tone head of radius 5.7px, a hair arc, and a 9x4px ellipse shadow at 18%. Never more than four per scene.

## Type and numbers
- Font Inter. Hook headline 800 at 99px, in #2d3058, sitting on a translucent floor-coloured wash that fades out as it shrinks into a corner header (45px, 800, inside a white pill: 21px pad, radius 21px) between 1.5 and 2.4 s. A 60x10px coral bar sits above its first letters.
- Tags: Inter 700-800 at 42px minimum, a white pill of height `1.75*fontSize`, side padding `0.7*fontSize` (`2.4*fontSize` with a dot icon: coral circle of radius `0.3*fontSize`), shadow `rgba(80,70,140,0.2)` blur 21 offsetY 6.
- Tag variants: white/ink (default), #4a5488 with white text (action), coral with white text (alert or key), #ffe3df with coral text (soft error), mint with white text (confirmed).
- Number tag: a white rounded rectangle 177px tall, radius 39px, shadow blur 33 offsetY 9. Quiet 42px sub-label on top, 800 digits at 99px below. At the target value it flips coral with white digits and the sub-label goes white at 85%.
- Counting: large values `Math.round(max * H.ease.outCubic(u)**1.6)` with thousands separators; percentages ease with `H.ease.inOutCubic`. Update every frame; the box never resizes mid-count (measure the final string once).
- Painted floor words are the only low-contrast text; they label zones, never carry the story.

## Diagrams: arrows, labels, charts
- Connector: a cubic from `H.bezier(a, c1, c2, b)` whose control points lift 1-2.2 units above the higher end, drawn with `H.partial(pts, u)`, round caps, 3px, `rgba(74,84,136,0.75)`. Flow connectors are dashed [9,9] with `lineDashOffset = -t*45`; decision connectors are solid 3.75px in ink. The head is a small filled triangle (16px long, 16px wide) at the current tip, rotated to the last segment, never a stroked chevron.
- Draw-on takes 0.5-0.9 s on `H.ease.inOutCubic`. The label pops onto the midpoint (lifted 0.75 units) as it finishes.
- Pinned label: a 2px leader line of #4a4f78 from a 5px dot (white 2px centre) on the object, rising then turning, 0.4 s, then the tag scales in with `H.ease.outBack` 0.4 s.
- Travelling data: dots (r 4.5, coral, halo r 10 at 25%) at `u = ((t - t0)*0.3 + i/3) % 1`, three per connector.
- Emphasis: a coral ellipse ring 4.5px wide sweeping 0 to 2pi in 0.45 s while its radius shrinks from 1.4x to 1x of the target, alpha pulsing between 0.2 and 1.0, `0.6 + 0.4*Math.sin(10*t)`. On an error beat add a 0.2 s full-frame coral wash at 25%.
- Verdict badge: a 28px-radius disc (coral cross or mint tick) with a 6px white round-capped glyph, `H.ease.outBack` scale in 0.3 s, pinned to a corner of the thing it judges. A wrong screen also shakes: `dx = 0.06*Math.sin(t*90)` world units for 0.4 s.
- Chart: bars are real solids, 0.5 x 0.6 units footprint, 0.72-unit pitch, colour mixed from #aab6e8 to #8fd9bd by index, the newest bar coral. Each rises over 0.35 s on `H.ease.outQuad`, 0.22 s apart. A tag with the current value rides the newest bar on a 63px stem. A comparison is two slabs side by side with different heights, never a split screen.

## Motion
- Entrance: every object scales from its base point with `H.ease.outBack(u, 1.7)` over 0.5 s, staggered 0.15-0.2 s, while its shadow grows with the same ease. The slab itself rises from 165px below with `H.ease.outQuad` over 1.1 s and fades in over 0.45 s.
- Camera: keyframes `[t, fx, fy, fz, s]`, interpolated linearly in value with `H.ease.inOutCubic` between them. Moves take 0.8-1.1 s; holds last 3-4 s. Open wide (s 36), dive to station one (s 69), travel along the long axis, finish pulled back to the whole floor.
- Idle life between beats: LEDs `on = Math.sin(t*rate + phase) > -0.2` with per-unit `H.rng` rates 2-6 and phases 0-10; fans spin `rotate(t*6)` with the plane squashed to `scale(1,0.577)`; belt slats slide `(t*2.2) % 0.5` units; cubes rise on `phase = (t*0.45 + i/6) % 1` with alpha `sin(pi*phase)`; trees sway 1.8px; a person walks 3 units in 3 s.

## Scene changes
Continuity first: the camera slides along the slab to the next station (0.8-1.1 s, `H.ease.inOutCubic`) while a connector from the previous object finishes drawing and its tag is still on screen. Tags of the old station fade over 0.3 s. For a true topic change, sink the slab 165px with `H.ease.inQuad` in 0.6 s and rise a new one with the entrance above. End on the wide shot with the takeaway pill rising from y=960, 60px, `H.ease.outBack`, 0.5 s.

## Finishing passes (run every frame, same strength)
1. Cached ground (gradient, lattice, glow), then the slab shadow.
2. Single scene shadow layer at 16%, under objects.
3. Contact strips and face falloff, inside `box`.
4. Glass sheen on screens and panels: diagonal gradient, white 0 / 32% at 0.4 / 8% at 0.5 / 0 at 0.56, plus an inner top shade `rgba(60,50,110,0.10)` fading out by 18%.
5. Accent halo: a radial of radius 90, `rgba(255,120,100,0.35)` to 0, on top of the one coral object.
6. Light edges and the slab front highlight.
7. No grain and no vignette; the look is airy. If the gradient bands on a given encoder, add `H.grain(ctx, t, {strength: 0.008, cell: 2, fps: 12, mono: true})`.

## Sound palette
- element appears: `k.play('pop', t, {f: 430-680, gain: 0.8, pan})` then `k.play('tock', t + 0.004, {f: 0.9*f, gain: 0.35, pan})`; pan = screen x mapped to -0.6..0.6. A soft wooden block snapping in, never squeaky.
- label lands: the same pair at f 560-600, gain 0.8 (key labels), or 0.5 (minor labels, inside `k.minor`).
- arrow completes: five `k.noise` dabs spaced along the eased draw-on (`filter: 'bandpass', f: 1800, q: 1.4, dur: 0.025, gain: 0.12, a: 0.002`), then the label pop.
- drawing / writing: none; connectors are dabs, tags are pops.
- scene change (camera glide): a pink bandpass `k.noise` starting at the move's start, f 380, q 0.7, gain 0.045, attack and release each half the move length, total length a bit longer than the move. No whoosh. A belt or machine under a beat: `k.tone(t0, {f: 72, type: 'sawtooth', dur: d, gain: 0.025, a: 0.3})`.
- wrong / right: wrong = `k.play('thud', t, {f: 120, gain: 0.7})` + `k.play('error', t + 0.02, {f: 'A3', gain: 0.85})`; right = `k.tone(t, {type: 'triangle', f: 'C5', gain: 0.1, dur: 0.15})` + `k.play('success', t + 0.06, {f: 'C5', gain: 0.8})`. Dials and ratchets: five `k.play('click', ...)` 0.145 s apart, f 1100-1340, gain 0.7.
- counting: `k.play('tick', t, {f: 3400, gain: 0.9})` plus a tiny `k.tone` an octave-and-a-half under it (f 425, 30 ms, gain 0.05), at most 12 per second, spaced wider when the value is moving slowly. Bars: pentatonic `k.tone` at 262, 294, 330, 392, 440, 523, 587, 659 Hz (`glideTo` 0.75x, dur 0.12, gain 0.16), one per bar.
- key number: `k.play('impact', t, {gain: 0.75})` plus four `k.play('ding', ...)` at f 'C5', 'E5', 'G5', 'C6', 30 ms apart, gain 0.42 falling 0.05 each, and a ring shimmer (`k.noise`, bandpass f 1800, q 2, dur 0.6, gain 0.04, a 0.05).
- takeaway: the pop pair at f 470, then dings 'G4', 'C5', 'E5' 80 ms apart (gain 0.35 falling 0.06) and a low `k.tone` ('C3', triangle, 1.2 s, gain 0.12, a 0.02).
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.25})`, `k.music(0, DURATION, {mood: 'calm', bpm: 100, key: 'C', gain: 0.3})`.

## Signature moves
- The slab rises into frame and its pieces arrive one at a time with a springy overshoot, shadows swelling beneath each.
- Pinned white tags with a leader line and a coral dot, landing on objects as the camera reaches them.
- A dashed connector arcing between stations with small coral dots riding along it.
- A tag riding the newest bar upward and flipping coral when the number lands, ring expanding from it.
- A glide along one long floor from station to station, then a pull back to the whole slab.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Dark outlines around solids | none; use the light edge strokes and three face tones |
| Black or grey shadows | one layer in rgb(110,96,170) at 16%, clipped to the slab |
| Two faces share a colour | top lightest, left +8% white, right toward #5c5896 |
| Wrong overlap order | sort by footprint-centre `x + y` ascending before drawing |
| Shadows darker where they overlap | draw all hulls into one layer, then composite once |
| Coral everywhere | coral marks one thing per beat; the rest stays pastel blue |
| Camera speed is constant | inOutCubic moves with real holds between them |

## Hero frame recipe
1. Cached ground (gradient, lattice, glow), then the blurred slab shadow.
2. Slab: underlayer, body, floor polygon, paving grid, two zone tints, the front highlight.
3. Scene shadow layer at 16%.
4. Three solids sorted by `x + y`: one wide pale-blue box with a window band and a coral strip, one cylinder, one tall box with an inset panel and three LEDs; plus two trees and one person.
5. A white tag (42px, ink) on the tall box with a leader line and coral dot; a dashed connector arc between two solids with two coral dots on it.
6. Headline at 99px in the top-left with the 60px coral bar above it.
7. Accent halo behind the coral object, glass sheen on the panel. Check against a toy-diorama render: every face must show a different tone and no shadow should be black.
