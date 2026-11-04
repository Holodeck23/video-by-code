---
id: editorial-chart
name: Broadsheet Data Graphic
family: Data & information
fonts: [Libre Baskerville, Inter, Caveat]
best_for: trends over time, one series against its peers, rankings, forecasts, "what changed and why" explainers, anything that should feel reported and checked
avoid_for: playful or childlike topics, product demos, moods that need depth, glow or cinema; dense dashboards with more than one hero series
---

# Broadsheet Data Graphic

The viewer believes they are reading a prestige-newspaper graphic on warm salmon newsprint, and that it is being annotated for them as they read. Everything is flat, ruled and hairline-thin: one deep-claret series carries the story over quiet grey context, labels sit directly on the data, and a pen-and-ink hand adds the notes that explain the cause. Restraint is the whole look: one hero colour, no shadows, no gradients except one soft wash under the hero line.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground (newsprint) | #FFF1E5 | flat; every box and header backing reuses it |
| Primary ink | #33302E | headline, baseline, numerals, boxes, main note |
| Muted ink | #66605C | dek, units, axis words, secondary notes, source line |
| Hero (claret) | #990F3D | the one series, kicker, key number, rings; the single most important thing on screen |
| Context grey | #A79E95 | peer lines; waffle "other" cells use #B9AFA5 |
| Context label | #857D75 | direct labels on grey lines |
| Gridline | rgba(51,48,46,0.16) | 1.5px; the zero baseline is full ink, 2px |
| Forecast band | rgba(51,48,46,0.055) | a flat strip behind the projected stretch |
| Right / confirmed | #2E7D4F | only for a hand-drawn tick, rare |
| Alarm / wrong | #990F3D | the hero colour doubles as the mark for an error; no second red |

Claret means "this is the story". Grey means "context". Nothing else gets a colour.

## Ground and surface
1. Fill the frame #FFF1E5, flat. The flatness is the look; do not add a texture bake unless it feels digital, then `H.paperTexture(W, H, {seed: 3, tone: '#FFF1E5', fiber: 0.15, grain: 0.15, blotch: 0.05})` cached once.
2. Plot rectangle at 1920x1080: left 126, right 1620 (leaves about 270px to the right for direct labels), top 330, bottom 890. Map data with two small functions `X(x)`, `Y(v)`; pick the axis max just above the hero's peak (round to a gridline).
3. Shot-level camera: scale about (W/2, 0.55H) from 1 to 1.018 across the hold, eased with `H.ease.inOutCubic`. Everything below is drawn inside this transform; the sticky header and footer are drawn outside it.
4. Static pieces (forecast band, tick marks) may be cached; everything with a reveal is drawn live from `t`.

## Mark-making
**Masthead rule.** A 5px ink bar from x=126 across 1674px, growing left to right over 0.5 s (`H.ease.outQuad`), with a 69x10 claret tab at its left end that is fully out by 25% of the rule. Every panel of a long story opens with the same rule.

**Gridlines.** Draw bottom first, each over 0.55 s (`H.ease.inOutQuad`), staggered 0.09 s, length = plot width + 36px so they overhang. Value labels sit just above their line (9px gap), left-aligned at the plot edge, Inter 400 30px muted, fading in during the last 70% of their line; the top label carries the unit ("$400bn", "100%"). X ticks: 1.5px ink, 9px long on labelled years and 4.5px on others, labels every second tick 36px below the baseline.

**Context lines.** Quarterly points: Catmull-Rom between annual values, plus seeded noise `r.gauss() * jitter * sqrt(max(1, value))` (jitter 0.12 context, 0.18 hero) so curves read as measured, not fitted. Stroke #A79E95, 3px, round joins and caps. Reveal by clipping a rectangle from the left edge to `L + width * u`, staggered 0.1 s per line, 0.9 s each, `inOutQuad`.

**Direct labels.** No legend, ever. Each grey series is named in 36px Inter 400 #857D75, 16px right of its last point. Sort labels by end height and push any that sit closer than 40px apart down until they clear; where a label moved more than 3px, join it to the line end with a 1.2px #857D75 elbow of 12px. Fade in 2.0-2.4 s after the grey lines land.

**Hero line.** Three layers under the same clip rectangle, 2.0 s long (`inOutQuad`):
1. Wash: linear gradient from plot top to baseline, rgba(153,15,61,0.20) to 0.04, filled down to the baseline.
2. Actuals: #990F3D, 5px, round joins.
3. Projection: same colour, 4.5px, `setLineDash([8, 8])` from the first projected point on.
A drawing head rides the clip edge: 6px claret disc interpolated between the two surrounding samples.

**End marker.** At the finish, a #FFF1E5 disc (radius 10) with a 4.5px claret ring (radius 7.5) pops with `H.ease.outBack` in 0.35 s. Then two pulse rings per 1.4 s, offset half a cycle: radius 9 + 24u, 2px, alpha 0.35*(1-u). The label (name, then value in regular weight) is Inter 800 36px claret, 20px right.

**Hand notes.** Caveat 700, 54px for story notes; ink for the main note, muted for the rest. Write-on = clip rectangle growing left to right across the text (height from ascender to descender), progress `a * 3.2` for the first line and `a * 3.2 - 1.1` for the second (offset 33px below), where `a = clamp((clipX - anchorX) / 165)`: a note starts writing only once the hero line has passed its anchor.

**Leaders.** A quadratic Bézier from the note to the data point, 28 samples, each nudged by `r.gauss() * 0.25 * sin(u * PI) * 1.2` px (seeded, so the same every frame), 2px, round caps. The open arrowhead (two 12px strokes at about +-0.5 rad from the tangent, endpoint jittered 0.3px) appears only once the leader is 97% drawn. Leaders end 6-12px short of the data point.

**Emphasis ring.** 64 steps starting at -2.4 rad, sweeping 2.25 pi so the end overshoots the start, radius multiplied by `1 + 0.06 * sin(k * 0.35) + k * 0.0012`. 3-5px, claret on the key number, muted on a point on the chart.

**Forecast band.** Flat rectangle behind the projected stretch from 9px above the plot top to the baseline, fading in over 0.5 s, with "Forecast" in Libre Baskerville italic 400 30px muted, centred, near the top.

**Boxes.** `strokeRect` 3px ink, no radius, no fill, no shadow. Chips and callouts are claret rectangles with #FFF1E5 text (Inter 600 42px).

## Type and numbers
- Kicker: faux small caps in claret, Inter 600, 30px capitals with lowercase set as capitals at 0.78 scale, tracking 0.12em. Build it per character: capitals and digits at full size, the rest as uppercase at 0.78 size.
- Headline: Libre Baskerville 700, 72px for a single chart, 138px for an opening panel; ink; two lines max. It sets in with a 15px rise and `outQuad` fade over 0.6 s.
- Dek: Libre Baskerville 400 33px (45px on an opening panel), muted. Byline or source: Inter 400 24px, small caps.
- Panel title: Libre Baskerville 700 69px under its own masthead rule; section number as small caps claret 33px.
- Key number: Libre Baskerville 700, 192px claret (126px when it is not the climax), with Inter 400 39px muted unit below. Count it in `inOutQuad` over 1.5-2.7 s with thousands separators; never a flicker of decimals.
- Waffle chart: 20x10 squares, 37px plus 6px gap, empty cells rgba(51,48,46,0.06). Filled count = `floor(200 * easedProgress)` in row-major order; each cell is claret at 0.85 or #B9AFA5, chosen by `H.rng(31).chance(0.52)`. Caption "each square = N" Inter 400 42px muted.
- Nothing is ever centred in a decorative way; set type flush left on x=126.

## Diagrams: arrows, labels, charts
- Arrows are the hand leaders above: wobbly Bézier, open head, 2px. Never a filled block arrow, except a small filled claret triangle (13px) for a connector that carries a signal.
- Signal flows: dashed claret line 5px, `setLineDash([15, 12])`, `lineDashOffset = t * 75`; or 24px squares alternating claret and grey travelling a curve at 0.9 cycles per second, six at a time.
- Step strips: Libre Baskerville 700 51px; the active step is claret with a 5px underline of its own width, others ink at 35% alpha, joined by muted arrows.
- Second chart type: a line over a lower baseline with 5 gridlines; value labels hang in the left margin, right-aligned, centred on their gridline, so the first point never runs through a label. 120 samples, wash 0.18 to 0.03, line 7.5px claret, head disc 10px. Add a `sin(u * 40) * 1.2 * (1 - u)` wiggle so early points look noisy and late points settle.
- Node diagram in the same hairline voice: nodes are 15px discs filled with the ground colour and ringed 3px in ink (claret when active); edges are straight lines whose width is `2 + 3.6 * |weight|` and alpha `0.5 + 0.7 * |weight|`, claret for positive weights and #857D75 for negative, so even near-zero edges stay visible at video size. Put the diagram inside a plain ink box with a small-caps title at its top-left.
- Pictograms: monoline icons, 2.4px ink or claret stroke, round joins, with tiny solid eyes or dots as the only fills; never shaded, never coloured beyond the two inks.
- Wrong: a claret X of two 7px strokes, then a ring; right: a green three-point tick, 9px.

## Motion
- Easing: `inOutQuad` for reveals, `outQuad` for type rising in, `outBack` only for the end marker, `inOutCubic` for page scrolls. Strokes are linear in length.
- Order inside one chart is fixed: masthead rule, headline, dek, gridlines (bottom up), grey context, hero line with wash, end marker, notes (as the line reaches them), footer rule and source. Total about 5-6 s.
- During the hold: the 1.8% push-in, the pulse rings, and marching dashes are the only motion. Do not add parallax.

## Scene changes
The page scrolls, like a long online graphic. Panels sit one screen apart (1080px) in a tall column. Hold each 3.5-4.5 s, then scroll 0.7-0.9 s with `H.ease.inOutCubic`.
- A sticky header docks on the first scroll: 100px of #FFF1E5, a 1.5px rule at rgba(51,48,46,0.35) beneath, story title at left in Libre Baskerville 700 42px, section tabs right-aligned in Inter 600 33px, the current one claret with a 4.5px underline, the rest ink at 42%.
- The header's backing fades in 2.5x faster than its type, so passing text never shows through.
- Between scrolls, the source line sits pinned bottom right in small caps, 28px muted.
- Stay on one panel (no scroll) when the next idea only adds a series or an annotation.

## Finishing passes (run every frame, same strength)
1. Paper tooth: `H.grain(ctx, t, {strength: 0.025, cell: 2, fps: 12, mono: true})`, drawn last, over the header too.
2. Hairline hygiene: every gridline and tick sits on a half pixel (`Math.round(y) + 0.5` for 1px, whole values for 2px) so they stay crisp after the push-in.
3. No vignette, no shadows, no glows. If it looks flat, add more real information, not effects.

## Sound palette
Quiet newsroom: felt pen, page-glide, small key taps.
- element appears (rule, headline, dek): rule `k.noise(t, {dur: 0.5, color: 'pink', filter: 'bandpass', f: 700, gain: 0.06, a: 0.1, q: 0.8, minor: true})`; headline `k.play('tock', t, {f: 300, gain: 0.45})`; dek `k.play('tock', t + 0.5, {f: 380, gain: 0.22})`.
- label lands: `k.play('tock', t, {f: 340, gain: 0.3})` for a box, or nothing for a direct label.
- arrow / leader completes: no extra sound; the pen stroke covers it (`k.noise` 18 ms at 1.6 kHz, `gain: 0.1`, as the nib touches down).
- drawing / writing: `k.play('stroke', t, {dur: writeDuration, gain: 0.6-1.1})` per note, per leader, per ring (gain 1.3); the hero line draws under one long soft stroke at `gain: 0.45`.
- scene change (scroll): one pink bandpass `k.noise` at f 400, q 0.7, gain 0.09, `a` 45% of the scroll length; mouse-wheel notches inside it, one per 180px of eased scroll (time them where eased progress crosses each notch, so they bunch mid-scroll): 12 ms bandpass noise at 1.9 kHz (gain 0.22) plus `k.tone` 330 Hz, 25 ms, gain 0.05, all minor. Header docks with `k.play('click', t, {f: 900, gain: 0.8})`; each tab change `click` gain 0.7.
- wrong / right: wrong is two quick `stroke` slashes (gain 2.0) plus a muted falling pair, `k.tone` D4 then A3 (triangle, 0.24 s then 0.4 s, gain 0.2); right is `k.play('success', t, {f: 'G5', gain: 0.45})` with the tick.
- counter: dry type clicks, one per 1/24 of eased progress and never closer than 1/12 s (`k.noise` 16 ms bandpass 2.3 kHz q 1.6 gain 0.2 plus `k.tone` 240 Hz gain 0.05), inside `k.minor(() => ...)`.
- key number (biggest hit): `k.play('impact', t, {gain: 0.8})` and `k.play('ding', t + 0.02, {f: 'C5', gain: 0.5})` as the count lands, then the ring's stroke.
- takeaway: claret rule as a 0.3 s noise swell (gain 0.07), `tock` f 280 gain 0.5, then three `ding` at F4, C5, A5 spaced 0.08 s, gains 0.4 / 0.33 / 0.26, pan -0.25 / 0 / 0.25.
- bed or music: `k.bed(0, DURATION, {kind: 'room', gain: 0.35})`; no music.

## Signature moves
- Gridlines rule across bottom-first, then the claret line draws with its wash rising behind it and a small head riding the tip.
- Handwritten notes start inking exactly as the line passes their anchor, each with a wobbling leader and an open arrowhead.
- A pulsing ring on the latest value during the hold.
- Direct labels instead of a legend; peer labels nudged apart with short elbows.
- Faux small-caps kicker and source line.
- A long story moves by scrolling one screen at a time, with a pinned serif header whose tabs follow the current section.

## Pitfalls
| Looks fake | Fix |
|---|---|
| Legend box or rainbow of series | direct labels, grey context, one claret hero |
| Lines too smooth and symmetrical | quarterly seeded noise; wobble on leaders and rings |
| Notes appear before the data they explain | gate each note on the clip edge passing its anchor |
| Dark mode, glow, drop shadows | none; flat salmon, ink and one wash |
| Gridlines heavy and fuzzy | 1.5px at 16% ink, half-pixel positions, overhang 36px |
| Block arrows and bubbles | hand leaders with open heads |
| Type too small for video | headline 66px+, labels 36px+, notes 54px, key number 192px |
| Everything on at once | strict reveal order, sticky header only after the first scroll |

## Hero frame recipe
1. Fill #FFF1E5. Draw the masthead rule (126, 60, 1674x5) with the claret tab, kicker "Topic Name" in small caps claret at y=114.
2. Headline in Libre Baskerville 700 72px at y=186; dek 33px muted at y=234; "Annual, years. Figures are illustrative" Inter 24px at y=272.
3. Forecast band over the last year, "Forecast" italic. Grid at 0/100/200/300/400 with the 2px ink baseline; x labels every second year.
4. Four grey series, direct-labelled to the right with nudging; each with seeded quarterly noise.
5. The hero in claret: wash, 5px line, dashed projection; end marker with a value label (series name, then the figure and unit) in Inter 800 36px.
6. Two Caveat 54px notes with leaders, one ringed point, one muted note.
7. Footer hairline at y=972, source in small caps at 28px, credit right-aligned.
8. Push at scale 1.012, `H.grain` at 0.025. Check: gridlines must be barely there, the claret must be the first thing the eye lands on.
