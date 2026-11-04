---
id: math-anim
name: Black-Field Vector Math
family: Data & information
fonts: [STIX Two Text]
best_for: maths, algorithms, machine learning, optimisation, anything with an equation, a curve, a network or a number that must be understood step by step
avoid_for: warm, human or emotional stories, product marketing, anything that needs texture, photography or a hand-made feel
---

# Black-Field Vector Math

The viewer believes they are watching a mathematician's program construct an idea on an endless black field: equations are written out stroke by stroke, axes and curves are traced into existence, and a bright dot slides along a graph while a key term is boxed and pulsed in yellow. Everything is razor-crisp vector geometry; the one quality that sells it is a single smooth sigmoid ease on every move.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground | #000000 | pure black, refilled every frame, nothing behind it |
| Primary ink | #ffffff | axes, equations, node outlines, tick numbers |
| Secondary ink | #bbbbbb | captions, subtitles, de-emphasised words |
| Muted ink | #888888 | loop-back arrows, idle stages |
| Structure blue | #58c4dd | the main curve, "the model", positive weights |
| Deep blue | #236b8e | fills inside blue shapes, never lines |
| Teal | #5cd0b3 | a parameter or constant you can tune |
| Accent (yellow) | #ffff00 | the single most important thing on screen: moving dot, boxed term, pulse |
| Soft gold | #f7d96f | history: ghost dots and hop arrows |
| Alarm / wrong | #fc6255 | wrong guesses, negative weights; use rarely |
| Right / result | #83c167 | correct answers, tangent lines, the metric that climbs |

One colour per meaning for the whole video. A word is coloured once in its first appearance and keeps that colour in every later equation.

## Ground and surface
There is no surface. Each frame starts with `fillRect` in #000 over the whole canvas; no texture, no gradient, no cached layer. Moving content sits on a "world" that is larger than the frame: bake nothing, just apply `ctx.translate(960,540); ctx.scale(z,z); ctx.translate(-camX,-camY)` before drawing world items, and draw fixed items (title, header, the headline number, the takeaway) after `ctx.restore()` in screen space. Lay out the frame on a loose grid: header at the top-left (66px), working area centred, one chart or diagram on the right half, takeaway low and central.

## Mark-making
All lines are `lineCap = 'round'`, `lineJoin = 'round'`, no blur, no shadow, no alpha-stacking tricks. Draw-on is a helper of your own, `part(pts, a, b)`: it computes cumulative length with `H.pathLength`, then strokes only the slice from fraction `a` to `b` (`H.partial` for a leading slice). Every reveal is a slice whose end runs 0 to 1 on the sigmoid ease (see Motion).

- **Axes:** two arrows from the origin, 4px white, tip 21px long. The shaft draws first, ticks follow in order: each tick is 20px long (10 either side), 3px wide, grows from 0 to full length over 0.25 of the axis time, staggered across the first 80% of it. Numbers beside the ticks fade in after, drifting 15px into place.
- **Curve:** a polyline of 160 samples, 6px #58c4dd, drawn on as a slice. A second curve (the thing that improves) is 6px #83c167.
- **Moving dot:** radius 15px, #ffff00, grows from 0 on its own `smooth` ease. Under it a dashed drop line to the axis (14px dash, 12px gap, 3px wide, white at 70%). A tangent line through it: 5px green, grows from the centre to 225px each side.
- **Ghost dot:** where the dot was. Fill #000 at 20%, then gold at 22%, then a 3px gold ring at full alpha. Linked to the next position by a curved arrow: quadratic arc bending 30% of its length, 4.5px gold, tip 22px.
- **Surrounding rectangle:** a stroke around the key term, padding 21px at the sides, 75px above, 36px below the baseline. It is drawn as a slice of the path starting top-right, going left, down, right, back up. 4.5px yellow.
- **Brace:** a filled tapered brace opening upward under a group, 24px deep, grows outward from its centre; white.
- **Node-link diagram:** nodes are 30px-radius circles with a 3.3px white outline; the fill alpha is the activation (0 to 1). Edges are straight lines whose colour is the sign (#58c4dd positive, #fc6255 negative), width `1 + 5.4*|w|` px, alpha `0.25 + 0.75*|w|`. Edges stagger on by layer plus a seeded offset from `H.rng`.
- **Flash:** a bright 25 to 40% slice of a path travelling along it (slice from `b-w` to `b`, `b` running 0 to 1+w), 4.5-9px yellow. It shows data or error moving, and is the style's only "glow".
- **Wrong mark:** two 7.5px red strokes forming a cross, 22px arms; right mark is a 7.5px green three-point check.

## Type and numbers
- Font: STIX Two Text. Maths: variables are *italic* 400, words and digits upright 400. Subscripts are 0.62 size, dropped 0.22 em; operators have a thin space either side.
- Sizes at 1920x1080: title and header 66-78px (never smaller), equations 78px, story labels 54px (never below 42px), tick numbers 40px, key number 204px at weight 600 shrinking to 156px once landed, counter 105px.
- Written-on (the "write"): split text into glyphs and give each a sub-animation. Stroke-trace its outline using `setLineDash([d*L, L*30])` (line width `0.028*size`) for the first half, then cross-fade to the solid fill for the second half. Glyphs start staggered with lag ratio `min(4/n, 0.2)` of the whole duration, so long equations are fast and short words are slow. Typical: a title 1.0 s, a 14-glyph equation 1.1 s.
- Transform (matching): glyphs that share a key (same character role) fly to their new place, resizing and recolouring on one ease; unmatched glyphs fade out while shrinking toward the group and new ones fade in from the same offset. Use it to turn a question into a header, a guess word with a "?" into the answer word, one axis label into the next.
- Numbers: a counter is a plain re-rendered integer with commas; ease the progress with `u^2.4` for large counts so it accelerates, and `smooth` for percentages. Never animate digits with blur or roll. Landing: the number is highlighted with the indicate pulse (below).

## Diagrams: arrows, labels, charts
- Arrow: shaft 4-5px and a solid triangular head 27px long, half-width 13px. It grows from tail to head: the head rides the tip, length scaling in over the first 66% of progress.
- Curved arrow: quadratic arc, head aligned to the last 85% of the head length on the path.
- Labels sit 15-20px from the thing in the same colour as the thing, written on after it is drawn. Equations are the labels: put the variable next to the object it names, and colour-match the two.
- Indicate: a term scales to 120% about its centre and mixes toward #ffff00 and back (a there-and-back sigmoid, 0.45 s). Pair it with the surrounding rectangle.
- Chart: axes then ticks then numbers then curve. Relabel axes by transforming the old words into the new ones while tick numbers cross-fade with a 20px vertical slide. A target level is a dashed 50% green line from the axis to the curve tip.
- Sampled grid: a square grid of cells (cell 15px, grey level as alpha on white, 16% white grid lines, 3px white frame) whose cells shrink to 7px squares and fly into the nodes they feed, staggered in reading order, fading out on arrival.

## Motion
- The ease: `smooth(x) = (sig(10*(x-0.5)) - sig(-5)) / (1 - 2*sig(-5))` with `sig(v) = 1/(1+e^-v)`, clamped. Every move, draw-on, fade and camera uses it; nothing is linear and nothing bounces. Use `H.clamp` and `H.prog` to feed it a 0..1 beat.
- Durations: a write 0.6-1.2 s, a curve 1.0 s, a transform 0.65 s, a dot hop 0.5 s, a camera pan 0.7 s, an indicate 0.45 s. Items overlap; the next write starts while the previous trace is still filling.
- Entrances: write or draw-on; objects without a path fade in while sliding 15px. Exits: fade while sliding 100px left and the next content takes the room.
- Camera: one scene, the world slides. Pan by 640 world px while zoom eases in log space between 0.84 and 1.1. Hold still while anything is being written.
- Between beats nothing wiggles; the frame is perfectly still except for a flash or a dot in motion.

## Scene changes
There is no cut. A scene changes by transforming the header, panning the camera to a new chart that was waiting off-screen, and sliding the old group 80-100px left while fading (0.4 s). The next idea always reuses a variable or colour from the last. Between sections that share no object, fade everything out over 0.3 s to pure black, hold 0.2 s, then write the new title.

## Finishing passes (run every frame, same strength)
Restraint is the finish. In order:
1. Black fill, no residue from the previous frame.
2. World content, then fixed content, all at integer-plus-half pixel positions for 4px and 6px lines (so strokes stay crisp).
3. Never `H.grain`, never `H.vignette`, never blur or shadow. The only light effects are the yellow flash slice, the indicate pulse, and node fill alpha.
Check: zoom into any frame at 400%: edges are clean, no halo, no gradient anywhere.

## Sound palette
Gentle, warm and sparse, like a quiet score under a lecture; nothing percussive.
- element appears (node, curve, axis): a muted pluck, `k.tone` on 'D4' (triangle wave, 0.55 s long, gain 0.1, 4 ms attack, 0.35 s release) plus a quiet octave partial on 'D5' (0.22 s, gain 0.025); a node column steps up 'A3', 'D4', 'E4', 'F#4' at 0.18 s spacing inside `k.minor(...)`.
- label lands: a 20 ms bandpass `k.noise` tick (centre 1300 Hz, q 2.2, gain 0.16), one per 2-3 glyphs spread across the write (6 ticks for a title), centre jittered between 1100 and 1370 Hz.
- arrow completes: a single `k.tone` 'A4', `dur: 0.3`, `gain: 0.06`.
- drawing / writing: the same soft ticks; curves also get a whisper: pink `k.noise` for the draw length, bandpass at 700 Hz, q 0.8, gain 0.05, 0.3 s attack.
- scene change (transform, pan): one airy swish, pink `k.noise` lasting the move, bandpass at 900 Hz, q 0.7, gain 0.13, attack half the move length.
- wrong: two soft falling triangles, 'F3' then 'C#3' 0.16 s later (`dur 0.5 and 0.8`, `gain: 0.14`); never `buzz` or `error`. right: a rising 'D4', 'F#4', 'A4' trio, 0.1 s apart.
- key number (the biggest hit): tick the counter at 11-12 per second (bandpass noise at f 1200, gain 0.14) while it climbs, then `k.tone` 'D2' sine `dur: 2.0`, `gain: 0.3`, with a chord 'A3', 'D4', 'F#4', 'A4' over it (`dur: 1.8`, `gain: 0.07`, 0.05 s stagger, panned -0.45 to +0.45).
- takeaway: a five-note 'D3', 'A3', 'D4', 'F#4', 'A4' chord, 0.06 s stagger, `dur: 2.2`, `gain: 0.075`, over 'D2' at 0.16.
- bed or music: `k.music(0, DURATION, {mood: 'calm', bpm: 60, key: 'D', gain: 0.35})`. No bed.

## Signature moves
- Outline-then-fill writing of every equation, with glyphs staggered.
- Transform-matching: a question morphs into the header; shared glyphs fly, the rest fade.
- A bright yellow slice runs down a curve or along edges to show where data or error is travelling.
- Gradient-descent hops: a gold ghost dot stays behind and a curved arrow links it to the next dot position.
- The surrounding rectangle draws round the key term, then the term pulses to 120% in yellow.
- A number counts up with soft ticks and lands as a huge percentage that is boxed.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Text just fades in | trace the glyph outline with the dash trick, then fill |
| Linear or bouncy motion | one sigmoid ease on everything; no overshoot |
| Glows, gradients or grain on the black | none; the only light is the flash slice and node alpha |
| Colours used decoratively | one meaning per colour; yellow only for what you want looked at |
| Equations that restart from nothing | reuse glyphs with Transform so continuity is visible |
| Thin 1px lines at 1080p | 4px axes, 6px curves, 3px ticks |
| Too many things moving at once | one write or one flash at a time; keep the frame still otherwise |

## Hero frame recipe
1. Fill #000. Header "Word word" in STIX Two Text 78px white, centred at y=117, with a 3px white underline 1680px wide at y=156.
2. Axes with origin near (165, 918): x axis 6 units of 156px, y axis 4 units of 150px, 4px white, 27px heads, ticks and numbers at 40px.
3. A 6px #58c4dd curve through 160 samples; a 15px yellow dot on it, a dashed drop line to the axis, a 5px green tangent through the dot.
4. Two gold ghost dots earlier on the curve with 4.5px curved arrows linking them to the dot.
5. On the right, an equation at 78px centred near (1478, 480): the term to look at in yellow, boxed by a 4.5px yellow rectangle, with a white brace and a 54px word beneath.
6. Below it, a blue readout "f(x) = 0.61" at 69px, the number in white. Nothing else; no grain, no vignette. Compare at 400% zoom: every edge is crisp.
