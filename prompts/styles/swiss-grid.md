---
id: swiss-grid
name: Modular Red Ledger
family: Design movements
fonts: [Inter, Space Grotesk]
best_for: clear systems, data-led arguments, formal announcements, disciplined comparisons
avoid_for: decorative storytelling, soft organic illustration, long lyrical passages
---

# Modular Red Ledger

A precise information poster organised by a modular grid. Large type, asymmetry and one red gesture make the hierarchy; every rule and label earns its position.

## Palette

| Role | Hex | Use |
|---|---|---|
| Paper | #f2f0e8 | quiet neutral white |
| Black | #202121 | type and diagram |
| Red | #c63d31 | single decisive element |

## Ground and surface

Use a flat paper field with a faint cached texture at 0.015 alpha.
Set 96px margins, twelve columns and 24px gutters; calculate every position from those values.
Use a 24px baseline rhythm and record it alongside the shot plan.
Expose only the rules needed to separate information; the invisible grid does most of the work.

## Mark-making

Draw flat discs, rectangles and concentric arc segments with no shadows or gradients.
Use 3px fine rules and 8px directional strokes.
Constrain arc angles to multiples of 15 degrees, with a consistent radial gap of 24px.
Limit red coverage to about one fifth of the image unless a red panel carries the final takeaway.
Use a cached 0.02-alpha ink-density mask only within large solid areas.
Treat every small geometry change as a change in information, rather than decorative drift.

## Type and numbers

Inter 800 at 138px is the principal headline; labels use Inter 500 at 48px.
Set the key number at 168px, aligning its left edge and baseline to the chart.
Use tight headline leading around 0.94, then generous separation before labels.
Shorten copy before condensing or shrinking it; maintain measured line width with H.fitFont.

## Diagrams: arrows, labels, charts

Use single-weight routes, solid arrowheads and direct labels instead of a legend where possible.
Place labels consistently above a rule or beside a marker with 18px clearance.
Charts use one numerical scale, honest zero baselines where appropriate and explicit units.
A red disc identifies the subject, while black structure explains its relationships.

## Motion

Reveal headlines upward through baseline masks over 0.38s, staggering lines by 0.12s.
Draw rules over 0.4s using H.partial and H.ease.inOutCubic.
A red arc may rotate 45 degrees into alignment over 0.65s, then stop.
Avoid spring effects; intentional placement and long reading holds create confidence.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Use a column wipe: twelve red strips enter 0.035s apart, covering the old information before revealing the next.
For a continuous argument, retain the heading and move only the changed metric.
Never repeat a transition when a direct numerical update communicates more clearly.

## Finishing passes (run every frame, same strength)

1. Composite the paper and flat graphics.
2. Add a very slight ink-density variation to solid red areas.
3. Keep small rules and type crisp, with no grain over their edges.
4. Check shared baselines and margins at delivery size.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('tock', t, { f: 300, gain: 0.22 }).
- Label lands: k.play('click', t, { gain: 0.1, minor: true }).
- Arrow completes: k.play('tick', t, { gain: 0.13 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('paper', t0, { dur: 0.35, gain: 0.25, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('thud', t, { gain: 0.5 }); this is the strongest accent in the sequence.
- Takeaway: k.play('ding', t, { gain: 0.3 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- A huge flush-left heading docks to the running header.
- Concentric segments rotate once into a fixed modular alignment.
- Red columns cover and uncover a new argument.
- The final value shares its baseline with its evidence.

## Pitfalls

| Failure | Repair |
|---|---|
| The grid is visible but alignment is careless | Calculate all positions from shared modules. |
| Tiny footnotes contain the actual lesson | Promote meaningful copy to 48px labels. |
| Red highlights everything | Reserve it for one conclusion or variable. |
| Sparse composition feels empty | Increase the scale of the evidence, not decoration. |

## Hero frame recipe

1. Lay out twelve columns inside 96px margins.
2. Set a two-line 138px heading across the left seven columns.
3. Place a red disc and three black arc segments in the remaining field.
4. Build one direct-labelled chart beneath the headline.
5. Align a 168px result with the chart baseline and add a thin separating rule.
6. Remove any element whose role cannot be explained in one sentence.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
