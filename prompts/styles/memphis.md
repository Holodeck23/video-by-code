---
id: memphis
name: Confetti Workshop
family: Design movements
fonts: [Fredoka, Rubik Mono One]
best_for: playful launches, approachable explanations, short upbeat comparisons
avoid_for: solemn testimony, dense data, quiet naturalistic storytelling
---

# Confetti Workshop

A playful graphic set made from patterned cutouts and bold black edges. Its energy comes from contrasting scale and rhythm, with the main message isolated from the surrounding confetti.

## Palette

| Role | Hex | Use |
|---|---|---|
| Pink | #efb4c5 | main field |
| Mint | #a7d4bf | large opposing plane |
| Ink | #202026 | outlines and hard shadows |
| Lemon | #f2d554 | key message |
| Blue | #4267c5 | secondary geometry |
| Coral | #e96a50 | sparse accent |

## Ground and surface

Split the ground with a large diagonal mint wedge across a pink field.
Cache 160 tiny dark dashes using H.rng(91), spaced at least 36px from all text zones.
Reserve a calm central patch occupying at least 45% of the frame.
Pattern a few large shapes individually instead of spreading every pattern over everything.

## Mark-making

Use 8px near-black outlines with round joins.
Offset each major cutout shadow by [14,12]px; the shadow is solid, not blurred.
Build a squiggle from a sampled sine curve with amplitude 16px and wavelength 70px.
Use dots 7px across on a 24px lattice, and terrazzo chips made of five-point seeded polygons.
Clip each pattern inside its own shape so it moves with the cutout.
Combine one semicircle, one triangular wedge and one striped bar around the lesson, leaving label routes clear.

## Type and numbers

Fredoka 700 at 108px supplies headlines; labels use 48px at weight 600.
Rubik Mono One at 144px is reserved for a short value or final word.
Put the main message on an opaque lemon panel with 28px internal padding.
Word groups land together; avoid unreadable character-by-character bouncing.

## Diagrams: arrows, labels, charts

Arrows are broad 14px strokes with exaggerated 42px heads, outlined in black.
Labels live on slightly rotated tabs at angles between -4 and 4 degrees.
A chart uses three to five fat patterned columns sharing one straight baseline.
Keep the numerical geometry accurate even when the outer frame is playful.

## Motion

Quantise decorative movement to 12fps using floor(t*12)/12.
Let a panel arrive over 0.3s with H.ease.outBack; briefly scale x to 1.08 and y to 0.94.
Small cutouts bob by at most 6px at independent frequencies between 0.4 and 0.8Hz.
Stop decorative bobbing during the final reading hold.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

A striped bar at -15 degrees sweeps across the image in 0.55s; change the content only when the bar covers it.
For related beats, retain the main panel and replace one part rather than repeating the wipe.
Give the takeaway a plain 1.2s hold after its initial pop.

## Finishing passes (run every frame, same strength)

1. Draw background patterns behind foreground cutouts.
2. Composite hard shadows before the shapes that cast them.
3. Add H.grain with strength 0.025, cell 2, seed 91 and fps 12.
4. Keep the headline edges solid and the shadow offsets constant.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('pop', t, { f: 420, gain: 0.35 }).
- Label lands: k.play('tock', t, { gain: 0.18, minor: true }).
- Arrow completes: k.play('ding', t, { gain: 0.25 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('swish', t0, { dur: 0.35, gain: 0.3, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('impact', t, { gain: 0.65 }); this is the strongest accent in the sequence.
- Takeaway: k.play('success', t, { gain: 0.5 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- One oversized message panel squashes as it lands.
- Patterned geometry frames a deliberately quiet reading zone.
- A striped diagonal changes the subject.
- The key number gets one short confetti burst, then stillness.

## Pitfalls

| Failure | Repair |
|---|---|
| Every inch is patterned | Protect a large untextured region for the lesson. |
| All objects bounce identically | Assign weight: large panels settle slower than chips. |
| Charts become decorative | Keep axes and comparisons mathematically honest. |
| Hard shadows look randomly lit | Use the same offset on every cutout. |

## Hero frame recipe

1. Make the pink/mint split and cache the peripheral dash pattern.
2. Place a lemon message panel at the centre with its offset black shadow.
3. Set a short two-line headline at 108px.
4. Arrange three related diagram pieces below, linked by one broad arrow.
5. Place one striped semicircle and one dot-filled triangle near opposing corners.
6. Check the reading order before adding the light print finish.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
