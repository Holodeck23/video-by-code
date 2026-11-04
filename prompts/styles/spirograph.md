---
id: spirograph
name: Engraved Rosette Ledger
family: Generative & type
fonts: [Cormorant Garamond, IBM Plex Mono]
best_for: cycles, precision, verification, layered systems, gradual convergence
avoid_for: busy photographic stories, casual handwritten notes, real currency imitation
---

# Engraved Rosette Ledger

An engraved diagram built from nested rosettes and interwoven fine curves. The density suggests security printing, but every significant ring has a labelled role in the explanation.

## Palette

| Role | Hex | Use |
|---|---|---|
| Paper | #e9e4ca | fibred stock |
| Teal ink | #356f69 | main rosettes |
| Blue ink | #435b83 | secondary bands |
| Red ink | #ac4b44 | serial and final emphasis |
| Dark ink | #283d39 | readable labels |

## Ground and surface

Cache H.paperTexture with seed 212, tone #e9e4ca, fiber 0.4, grain 0.15 and blotch 0.08.
Draw a double ornamental border inset 60px and 78px, leaving 70px clear inside it for labels.
Add a faint static wave underprint with 28px spacing at 0.08 alpha.
Use fictional ledger headings; omit real denominations, seals and official identifiers.

## Mark-making

For a hypotrochoid use x=(R-r)cos(a)+d*cos((R-r)*a/r), y=(R-r)sin(a)-d*sin((R-r)*a/r).
Choose integer ratios such as R=180, r=70, d=85 and sample until the curve closes.
Draw 18 neighbouring passes with 0.9px strokes and small radial offsets.
Blend teal toward blue along path length using 32 clipped colour segments, with overlaps to prevent gaps.
Resample the finished path at 3px and reveal with H.partial.
Make a separate 3px outline for story-critical boundaries; fine mesh must not carry the only meaning.

## Type and numbers

Cormorant Garamond 700 at 108px gives the heading and 144px gives the key value.
Use IBM Plex Mono at 46px for serial-like counters and part labels.
An engraved title can use a 1px displaced light edge beneath its dark fill.
Keep microtype decorative and never rely on it to communicate a claim.

## Diagrams: arrows, labels, charts

Use double-rule arrows with lines 4px apart and a small 20px head.
Attach labels outside the rosette with short radial leaders and opaque paper backing.
Represent one changing parameter by bringing selected rosette passes into alignment.
A comparison uses matched rosettes with the same scale and labels identifying the different setting.

## Motion

Trace the main rosette over 1.6s with H.ease.inOutCubic.
Bring displaced passes into register over 0.8s; keep any residual motion below 0.02rad/s.
Counters update at 8fps and stop before a red verification mark lands.
Avoid continual large rotations: they turn fine mesh into visual interference.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Move along a ledger strip from one labelled diagram to the next over 0.8s.
Keep the same main ring when showing refinement of one system.
For a new section, slide a paper band over the old label while its rosette recedes.

## Finishing passes (run every frame, same strength)

1. Composite paper, pale wave underprint, coloured meshes and readable dark labels.
2. Add a subtle 0.7px overprint offset to one coloured plate only.
3. Apply H.grain at strength 0.012, cell 2, seed 212 and fps 12.
4. Test the encode: widen fine lines if chroma subsampling removes them.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('click', t, { f: 520, gain: 0.18 }).
- Label lands: k.play('tick', t, { gain: 0.1, minor: true }).
- Arrow completes: k.play('ding', t, { gain: 0.18 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('paper', t0, { dur: 0.35, gain: 0.22, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('stamp', t, { gain: 0.5 }); this is the strongest accent in the sequence.
- Takeaway: k.play('bell', t, { gain: 0.35 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'hum', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- A rosette traces itself as a sequence of precise pen passes.
- Coloured line bundles converge into registration.
- A red serial-like counter locks before the verification mark.
- Fine underprint stays behind a clear dark information layer.

## Pitfalls

| Failure | Repair |
|---|---|
| The mesh becomes an unreadable knot | Reduce pass count and separate important rings. |
| Fine colour lines disappear in MP4 | Widen them and compare decoded channels. |
| The design resembles a real banknote | Use original layout, fictional headings and no real currency marks. |
| Everything rotates without purpose | Map motion to one named parameter and hold the result. |

## Hero frame recipe

1. Prepare the fibred ledger sheet and double border.
2. Place one closed hypotrochoid at right with 18 fine teal-blue passes.
3. Add a simpler labelled ring at left for comparison.
4. Set a 108px heading and a 144px result on quiet paper.
5. Add a short red serial and one restrained verification box.
6. Inspect a delivery encode to ensure the fine lines survive.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
