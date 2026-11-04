---
id: patent-drawing
name: Inventor Folio
family: Illustration
fonts: [Libre Baskerville, IBM Plex Mono]
best_for: mechanisms, parts, assembly, technical history, clear sectional explanations
avoid_for: soft atmosphere, rapid action, colourful categorical charts
---

# Inventor Folio

An inked invention drawing on a folio sheet. The outline describes the object; shading explains its surfaces; numbered leaders connect each claim to a visible part.

## Palette

| Role | Hex | Use |
|---|---|---|
| Stock | #eee4cc | lightly aged sheet |
| Ink | #26221e | ruling pen and type |
| Wash | #c9b78f | paper wear only |
| Review pencil | #a53e35 | one correction or emphasis |

## Ground and surface

Cache H.paperTexture with seed 33, tone #eee4cc, fiber 0.35, grain 0.2 and blotch 0.12.
Use a double border inset 54px and 63px, with 2px and 1px strokes.
Place decorative folio metadata at the edge; never imitate a real issued patent or inventor signature.
Keep the paper texture fixed in sheet coordinates during camera motion.

## Mark-making

Draw the external silhouette in 4px ink and internal details at 2px.
Make every structural curve an explicit sampled polyline so H.partial can reveal it.
Hatch sectioned material with 45-degree lines spaced 12px apart, clipped to the cut surface.
Shade rounded surfaces with longitudinal lines whose spacing decreases toward the edge.
Use stipple only in small cast-shadow regions: seeded points with 1-2px radius.
Reserve solid black for narrow gaps and reference numerals; do not fill whole objects as silhouettes.

## Type and numbers

Libre Baskerville at 90px supplies the topic heading; part names use 46px.
Reference numerals use IBM Plex Mono at 48px and must remain readable after camera moves.
A key value uses 114px serif figures in a plain ruled box.
Draw numeral annotations after their parts have been outlined, not before.

## Diagrams: arrows, labels, charts

Leaders begin at the named part, curve with two control points and stop 16px before the numeral.
Use a small terminal dot for a leader and a filled head only for directional arrows.
Exploded views align parts along one axis, with faint projection lines linking them.
Sectional views repeat the same part number and label the cut plane explicitly.

## Motion

Reveal outlines first over 1.2s, then details over 0.8s, then hatching over 0.6s.
Give one working part a slow analytic rotation, such as angle=0.3*t; align teeth or linkages plausibly.
Pan between folio figures over 0.8s using H.ease.inOutCubic, holding each explanation for at least 2s.
Cache static pen marks; reconstruct their reveal from t rather than retaining prior strokes.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Travel along the sheet to the next labelled figure; retain a projection line as a visual bridge.
For a revised design, use a single red pencil strike and replace only the changed part.
Avoid erasing every label between adjacent mechanism steps.

## Finishing passes (run every frame, same strength)

1. Composite stock texture, thin border, object lines, hatching and labels.
2. Add sparse 0.4px ink spread at 0.12 alpha beneath the line layer.
3. Use H.grain at strength 0.012, cell 2, seed 33 and fps 12.
4. Add a red pencil ring only around the decisive part or value.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('click', t, { f: 650, gain: 0.2 }).
- Label lands: k.play('tick', t, { gain: 0.12, minor: true }).
- Arrow completes: k.play('click', t, { gain: 0.15 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('paper', t0, { dur: 0.35, gain: 0.25, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('stamp', t, { gain: 0.5 }); this is the strongest accent in the sequence.
- Takeaway: k.play('ding', t, { gain: 0.3 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- Outline, internal construction and hatch arrive in separate passes.
- Curved leaders attach readable numerals to specific parts.
- An exploded view becomes an assembled mechanism.
- A red pencil correction changes one visible consequence.

## Pitfalls

| Failure | Repair |
|---|---|
| Hatching resembles decoration | Clip it to the actual cut surface and vary spacing with shape. |
| Reference numbers are tiny | Use 48px for story-critical identifiers. |
| Invention looks mechanically impossible | Validate geometry and motion before adding patina. |
| Faux legal metadata implies a real document | Use clearly fictional folio labels or omit them. |

## Hero frame recipe

1. Prepare a clean bordered folio with a simple topic heading.
2. Draw a topic-specific mechanism with one sectional cut and one exploded component.
3. Use different weights for outer profile, inner details and projection guides.
4. Add three curved leaders and 48px part numbers.
5. Place a short claim in a 114px value box and one red pencil ring.
6. Reduce the preview to phone size and check part identification before animation.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
