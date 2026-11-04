---
id: bauhaus
name: Workshop Geometry
family: Design movements
fonts: [Space Grotesk, Syne]
best_for: mechanisms, modular systems, strong cause-and-effect, visual categorisation
avoid_for: delicate realism, long quotations, emotional naturalism
---

# Workshop Geometry

A workshop demonstration assembled from printed geometric components. The composition follows a visible underlying grid, while a little uneven ink coverage keeps the result physical.

## Palette

| Role | Hex | Use |
|---|---|---|
| Paper | #eee6d4 | uncoated ivory |
| Black | #20211f | type and structural rules |
| Red | #ce3f32 | the decisive component |
| Yellow | #e8b638 | secondary plane |
| Blue | #285b8a | one contrasting group |

## Ground and surface

Cache a 1920x1080 stock texture with H.paperTexture using seed 73, tone #eee6d4, fiber 0.25, grain 0.3 and blotch 0.16.
Divide the sheet into twelve columns inside 96px margins; expose only two or three rules, never the whole construction grid.
Keep broad areas empty so a circle or diagonal can carry the composition.
Use one faint 38px fold band with opposite light/dark edges at 0.06 alpha.

## Mark-making

Build objects from rectangles, discs, quarter-discs and triangles with edges on a 24px module.
Prefer a recognisable silhouette of five to nine pieces to a complicated geometric decoration.
Print each colour into a separate cached canvas; shift red by [1.2,0.7]px and blue by [-0.7,1.1]px.
Subtract sparse seeded pinholes at 0.07 alpha from filled ink areas; keep type almost intact.
Use 6px structural strokes, square ends and no gradient shading.
Where colours overlap, choose either an intentional knockout or multiply at 0.85 alpha; keep that decision consistent.

## Type and numbers

Use Space Grotesk 700 at 108px for headlines and 48px for labels. Syne 800 is suitable for a single 150px result.
Set headlines flush left on the grid, with short lines and 0.95 line spacing.
Construct a few large initial letters from the same geometric pieces; keep ordinary explanatory text typeset.
A value lands as a solid type block, counts at 10 updates/s for 1.1s, then locks.

## Diagrams: arrows, labels, charts

Route arrows as straight 8px rules ending in a solid triangular head 28px long.
Labels sit on rectangular strips aligned to the same grid as their subjects, with 18px inset.
A comparison uses matched rectangles; a process uses the geometric component moving between them.
Bars are solid, 54px wide with 24px gaps, and share one clear baseline.

## Motion

Use H.ease.outBack for component placement over 0.32s, limited to 6% overshoot.
Neighbouring pieces arrive 0.09s apart, each landing on an event in the shared cue table.
Use H.ease.inOutCubic over 0.75s for a pan between groups.
After a build, move only one relevant component: a disc travels, a lever rotates or a bar changes.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Extend a rule across the sheet and let it carry the eye into the next construction over 0.7s.
For a true new argument, a solid printed rectangle covers the old group in 0.45s; reveal its replacement when coverage is complete.
Preserve the active component when the next beat is a consequence of the last.

## Finishing passes (run every frame, same strength)

1. Composite paper, colour plates, then black structure and type.
2. Apply a cached low-frequency ink-density mask at 0.035 alpha inside each plate.
3. Add H.grain with strength 0.018, cell 2, seed 73 and fps 12.
4. Keep shadows, bloom and bevels out of the final image.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('stamp', t, { f: 430, gain: 0.35 }).
- Label lands: k.play('click', t, { gain: 0.15, minor: true }).
- Arrow completes: k.play('stroke', t, { gain: 0.12 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('paper', t0, { dur: 0.35, gain: 0.3, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('impact', t, { gain: 0.65 }); this is the strongest accent in the sequence.
- Takeaway: k.play('success', t, { gain: 0.45 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- Primary-colour pieces visibly assemble a mechanism.
- A black rule becomes the route into the next explanation.
- One oversized initial is made of the same parts as the diagram.
- The final result snaps to the grid as a solid type block.

## Pitfalls

| Failure | Repair |
|---|---|
| Geometry looks arbitrary | Assign each shape a stable role and reuse its meaning. |
| Fake vintage damage hides the lesson | Reduce paper wear before shrinking type. |
| Every beat bounces | Use overshoot for placement only; a working mechanism moves deliberately. |
| Primary colours compete | Let red carry the result and keep most of the sheet unprinted. |

## Hero frame recipe

1. Place a 144px headline in the left four columns.
2. Assemble a topic-specific component in the middle five columns from seven geometric parts.
3. Show one input, one output and a single black route between them.
4. Attach two 48px labels with clean alignment and generous breathing room.
5. Place the key value in a red rectangle at bottom right.
6. Apply slight plate offsets and ink density, then verify the silhouette at phone size.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
