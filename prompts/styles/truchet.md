---
id: truchet
name: Interlocking Arc Field
family: Generative & type
fonts: [Rubik Mono One, Space Grotesk]
best_for: networks, local rules, emergent structure, routing, systems across scales
avoid_for: dense prose, naturalistic objects, data needing exact spatial comparison
---

# Interlocking Arc Field

A printed tile field whose quarter-circle paths connect at cell edges. Local rotations create a continuous pattern, while a small set of coloured enclosed regions reveal the important shape.

## Palette

| Role | Hex | Use |
|---|---|---|
| Paper | #e9dfc5 | light tile regions |
| Deep ink | #253d49 | dark path regions |
| Ochre | #c68b43 | selected enclosed regions |

## Ground and surface

Use a base tile size of 180px and a hierarchy of halves down to 45px.
Seed each tile orientation from its integer location and size; do not depend on traversal order.
Cache the complete settled pattern and paper field.
Reserve an opaque paper label strip, or let the pattern occupy only the diagram area.

## Mark-making

Each square contains quarter-circle arcs centred on opposing corners; rotate the tile by 90 degrees to change the connections.
Keep edge connection positions identical across neighbours of the same scale.
At scale boundaries, subdivide the larger cell before connecting finer paths.
Use strokes at one quarter of the tile width and clip them exactly to the cell.
For selected closed regions, flood-fill a binary mask once and store component ids.
Colour only whole components whose samples fall mostly inside an original symbol mask; never recolour half a closed cell arbitrarily.

## Type and numbers

Use Rubik Mono One at 108px for the heading and 156px for the result.
Space Grotesk 600 at 48px supplies direct labels.
A large word may emerge from coloured regions, but repeat its meaning in ordinary readable type.
Do not rely on hidden-letter recognition for an essential fact.

## Diagrams: arrows, labels, charts

Show a route by tracing one continuous path with a 12px contrasting overlay.
Attach labels to junctions using short straight leaders on paper backing.
A scale comparison uses the same field before and after subdivision.
For quantities, place an ordinary chart beside the pattern rather than treating tile density as an unexplained measure.

## Motion

Lay coarse cells in a diagonal sequence over 0.65s, then subdivide selected cells over 0.5s per level.
Flip orientations in small groups with a 0.18s interval, preserving the route the viewer is following.
Pull the ochre plate across over 0.6s, starting 5px out of register and settling to 1px.
Keep a finished network still while its relationship is explained.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

A diagonal tile relay replaces a genuinely new field in 0.7s.
For a refinement, subdivide the current field and preserve its selected route.
Use the same seed on either side of a camera move so settled regions do not jump.

## Finishing passes (run every frame, same strength)

1. Draw paper, deep-ink paths and selected ochre components.
2. Add an ink-density mask at 0.025 alpha.
3. Use H.grain with strength 0.018, cell 2, seed 310 and fps 12.
4. Inspect seams at every scale boundary and remove any one-pixel gaps.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('tock', t, { f: 400, gain: 0.2 }).
- Label lands: k.play('click', t, { gain: 0.1, minor: true }).
- Arrow completes: k.play('ding', t, { gain: 0.18 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('paper', t0, { dur: 0.35, gain: 0.25, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('stamp', t, { gain: 0.5 }); this is the strongest accent in the sequence.
- Takeaway: k.play('success', t, { gain: 0.35 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- A coarse tile field gains structure through visible subdivision.
- Whole enclosed regions receive a separate colour plate.
- One route stays continuous through a local orientation change.
- The final word is suggested by the field and confirmed by readable type.

## Pitfalls

| Failure | Repair |
|---|---|
| Tiles do not connect at scale changes | Subdivide neighbours before joining finer paths. |
| Accent leaks through open regions | Flood-label the settled binary mask and colour whole components. |
| The result looks like random wallpaper | Follow one named route and one explanatory change. |
| Pattern hides all typography | Protect a quiet paper strip for the message. |

## Hero frame recipe

1. Build a 180px tile field with two local refinement levels.
2. Use stable coordinate-based seeds for every tile orientation.
3. Choose one connected route and trace it in a clear contrasting overlay.
4. Tint a few closed regions ochre to suggest an original simple symbol.
5. Place the heading and a 156px result on a quiet paper band.
6. Check tile seams and label legibility before adding print texture.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
