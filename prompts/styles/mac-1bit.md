---
id: mac-1bit
name: Monochrome Bitmap Desk
family: Retro digital
fonts: [Silkscreen, Inter]
best_for: software processes, editing, files, discrete operations, simple diagram construction
avoid_for: rich colour comparison, subtle gradients, photoreal close-ups
---

# Monochrome Bitmap Desk

A one-bit paint program running on a small monochrome desktop. Every visible pixel belongs to either ink or paper; the tool cursor and selection state explain how each mark was made.

## Palette

| Role | Hex | Use |
|---|---|---|
| White | #ffffff | unmarked pixel |
| Black | #000000 | marked pixel |
| Dither preview | #808080 | design notation only: output uses black/white cells |

## Ground and surface

Draw the complete desktop into a 640x360 logical canvas, then upscale exactly 3x without smoothing.
Create grey with an alternating pixel checker, never a grey fill in the final bitmap.
Cache window borders and an 8x8 pattern catalogue.
Keep decorative menu and tool regions under 15% of the image area.

## Mark-making

Use integer coordinates and one logical pixel for hairlines, two for key outlines.
Represent patterns as eight bytes and sample them in document coordinates so they stick to the drawing.
Dither an optional shaded illustration with Atkinson error diffusion: threshold at 128 and distribute one eighth of the residual to six neighbours.
Cache the resulting bitmap rather than re-dithering during motion.
Rounded window corners use stair-step masks; shadows are a two-pixel hard offset.
A moving selection uses a deterministic alternating border phase floor(t*6), without changing its stored content.

## Type and numbers

Silkscreen headlines at 26 logical pixels produce 78px screen type; labels use 16 logical pixels, or 48px.
Key numbers use 40 logical pixels, giving 120px at delivery size.
Rasterise text once, threshold its alpha mask and copy black pixels into the document.
If the required sentence cannot fit at those sizes, shorten it or show fewer windows.

## Diagrams: arrows, labels, charts

Draw a shaft with the line tool, then two separate head segments; all points snap to logical pixels.
Place a white backing behind labels; never dither story-critical words.
Bars use different 8x8 patterns, each accompanied by a label rather than colour.
A process may move a selected bitmap between two windows while preserving its contents.

## Motion

Use quick cursor moves over 0.2s, then a discrete click followed by a 0.15s hold.
Build pencil strokes from the absolute progress along a precomputed integer polyline.
Window drags update on a 12fps grid and land exactly on integer pixels.
Do not interpolate a one-bit edge through translucent grey.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Select the old diagram, move it aside and paste the next state into the same document over 0.45s.
A new topic may open a new window; its title tells the viewer why the context changed.
Close dialogs only after the answer has been held at least 1s.

## Finishing passes (run every frame, same strength)

1. Composite all logical layers in black and white.
2. Threshold any remaining intermediate alpha before the final enlargement.
3. Enlarge with imageSmoothingEnabled=false.
4. Do not add grain, blur, chromatic offsets or CRT curvature to this style.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('click', t, { f: 900, gain: 0.24 }).
- Label lands: k.play('key', t, { gain: 0.1, minor: true }).
- Arrow completes: k.play('tick', t, { gain: 0.12 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('click', t0, { dur: 0.35, gain: 0.25, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('thud', t, { gain: 0.5 }); this is the strongest accent in the sequence.
- Takeaway: k.play('ding', t, { gain: 0.35 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'room', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- The active tool changes before its corresponding mark appears.
- Dithered illustrations coexist with crisp one-bit labels.
- A marching selection moves an existing idea into a new context.
- A final alert window contains the takeaway.

## Pitfalls

| Failure | Repair |
|---|---|
| Smooth vector outlines break the illusion | Rasterise the logical canvas first. |
| Tiny authentic UI swallows the content | Keep desktop chrome small and zoom the document. |
| Dither crawls during movement | Cache it in object space and use integer translations. |
| Grey text sneaks into output | Threshold all text masks and inspect pixel colours. |

## Hero frame recipe

1. Prepare the 640x360 black/white desktop and one large drawing window.
2. Place an original 150x150 logical-pixel illustration with a dithered shaded region.
3. Add a two-step process drawn with the line and text tools.
4. Show a selection border around the result and a cursor at its corner.
5. Set a 40px logical result inside a plain alert panel.
6. Enlarge 3x and confirm the important labels remain readable at half preview size.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
