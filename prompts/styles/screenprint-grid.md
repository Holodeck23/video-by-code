---
id: screenprint-grid
name: Edition Wall
family: Print
fonts: [Anton, Space Grotesk]
best_for: comparison, variants of one idea, repeated trials, short punchy evidence
avoid_for: many unrelated subjects, fine pale detail, long readable paragraphs
---

# Edition Wall

A wall of repeated prints made from the same image plate. Each panel has its own colour pull and imperfect registration, so the repeated subject ties the argument together while the evidence changes.

## Palette

| Role | Hex | Use |
|---|---|---|
| Paper | #f0e2c5 | sheet underprint |
| Black screen | #25221e | common image plate |
| Pink plate | #d65c86 | panel one |
| Cyan plate | #39a4b6 | panel two |
| Lemon plate | #dfcb43 | panel three |
| Orange plate | #e0863e | one emphatic result |

## Ground and surface

Lay out six panels in a 3x2 wall with 24px gutters and 72px outer margins.
Cache a low-frequency H.paperTexture field for the whole sheet.
Assign each panel a colour pair; keep the same black image plate in all six.
Allow the flood colour to stop 5-12px short of a panel edge in one or two places.

## Mark-making

Prepare an original grayscale subject and convert it into a black screen using a fixed 5px dot lattice.
Map darkness to dot radius from 0 to 3.5px; preserve a recognisable silhouette before introducing screen wear.
Make colour shapes broader than the black details, as if cut from a loose mask.
Offset each panel colour plate by a seeded 2-6px translation while leaving the black plate stable.
During a print, reveal the plate behind a straight squeegee edge with a 10px irregular ink bead.
Cache mesh dropout and two broad 0.08-alpha streaks per panel.

## Type and numbers

Anton at 102px gives a panel headline; Space Grotesk 700 at 48px labels a comparison.
Use 144px solid figures for a key result.
Put labels outside the darkest image areas, or knock out a clean paper rectangle.
Keep all captions free of screen holes even when the image has deliberate wear.

## Diagrams: arrows, labels, charts

Paint arrows across gutters using 12px strokes and a 36px head.
Each repeated panel changes exactly one labelled variable; list the fixed conditions in a readable common legend.
Use matched crops and camera angles so the visual comparison is meaningful.
A chart can occupy one panel, with the same plate colour and black screen treatment.

## Motion

Print each panel in three events: flood at t0, colour at t0+0.18s, black pull over the next 0.6s.
Pan from panel to panel over 0.65s and hold each result at least 1.5s.
A completed print stays still; do not let texture swim.
Pull back to the full wall only once the panels have been individually explained.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

The camera crosses the gutter as the next panel begins its print.
For a correction within the same trial, overprint a new small plate instead of replacing the whole panel.
Do not use a flashing colour cycle to substitute for a factual contrast.

## Finishing passes (run every frame, same strength)

1. Composite paper, flood, loose colour masks and common black screen in that order.
2. Apply cached mesh wear to image regions, not type.
3. Use H.grain at strength 0.02, cell 2, seed 140 and fps 12.
4. Check that black plates remain registered across all repeated subjects.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('stamp', t, { f: 320, gain: 0.3 }).
- Label lands: k.play('click', t, { gain: 0.12, minor: true }).
- Arrow completes: k.play('tock', t, { gain: 0.18 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('paper', t0, { dur: 0.35, gain: 0.3, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('impact', t, { gain: 0.6 }); this is the strongest accent in the sequence.
- Takeaway: k.play('success', t, { gain: 0.4 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- A common image is pulled repeatedly in different colour pairs.
- The ink bead travels with the squeegee reveal.
- An arrow crosses a real gutter between two related trials.
- A final wall view shows the accumulated comparison.

## Pitfalls

| Failure | Repair |
|---|---|
| Panels are merely recoloured duplicates | Give each a labelled evidence change. |
| Wear makes every face or object unreadable | Recover the silhouette before adding dropout. |
| Misregistration resembles bad alignment | Keep the black image stable; offset only broad colour. |
| All six panels are too small to read | Tour them individually before the overview. |

## Hero frame recipe

1. Create a wall with six equal panels and generous gutters.
2. Use one original subject silhouette for all six black image plates.
3. Assign three contrasting colour pairs, each used twice.
4. Add one large label and one value in the foreground panel.
5. Show the squeegee edge halfway across an unfinished adjacent panel.
6. Inspect common plate alignment and clean text before applying the print wear.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
