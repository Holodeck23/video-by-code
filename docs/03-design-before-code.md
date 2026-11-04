# 3. Design before code

The most expensive failure is a technically successful film whose pictures do not communicate. Prevent it by deciding what the audience should see and understand before building a renderer or scene library.

This failure has a recognisable shape. In two observed productions the geometry, simulation and camera were authored first and the treatment was written afterwards to describe whatever the engine produced. Both passed every technical gate. Both drew the same verdict from the person watching: it does not look like anything. In the second case the treatment named a protagonist that nobody could find in a frame sample, because no frame had ever been composed to carry it. An engine-first film has no referent, so "does it look right" cannot be answered and every check collapses into "does it render", which always passes.

The order in this chapter exists to give the film a referent before the engine runs:

1. Write the brief and recover what the piece means.
2. Pull and measure the exact reference.
3. Write the story beats and make a target still for each.
4. Approve a hero frame at delivery size.
5. State the visual leap and the numbers you will be held to.
6. Pilot the riskiest shot, compare it with the reference, then scale.

## Write a production brief

Capture these decisions in a page the whole team can read ([templates/brief.md](../templates/brief.md) is a starting form):

| Decision | Useful answer |
|---|---|
| Audience | Who is watching, what they already know, and on what screen |
| Promise | One sentence explaining what they gain by watching |
| Format | Landscape explainer, vertical short, lyric film, instrumental or other |
| Length | An actual duration or range, with room for the closing beat |
| Audio | Approved take, hash, timing origin and whether speech may change |
| Tone | Concrete adjectives with visual consequences: restrained, tactile, urgent |
| Reference | Exact clip/version (video ID), timestamps and frames used |
| Look numbers | Reference median luma, share of pixels above 128, ground and accent colours |
| Pace | Reference cut or sub-plate rate, and your own target |
| Visual language | Ground, accent, type roles, mark-making, light and material |
| Visual leap | What this film does that the previous one from the same team did not |
| Exclusions | Specific patterns to avoid, based on this production |
| Delivery | Size, fps, audio, codec, captions and review requirements |

"Make it premium" is not enough. "One warm paper ground, black monoline diagrams, one red accent, generous margins and no simulated dashboard panels" is implementable.

### Recover the meaning before choosing the metaphor

Use the selected recording or script, the lyric sheet, the latest clarifications and the production history. Separate three things: the subject, the speaker's perspective and the change the audience should feel. If the piece adapts a lesson or transcript, establish the teaching before literalising any line. Label an uncertain source as uncertain.

Write the visible action and its consequence, not only the explanatory message. Test the ending against the premise: a small object appearing at the end is not automatically a satisfying demonstration of mastery or agency.

## Study the exact reference

### Pull the actual reference, never a sibling

When someone names a video as the bar, download that exact video before any study and write its video ID at the top of the study notes. Similar titles, the same creator's other films and a shared genre are not interchangeable. In one team's history, three consecutive films were studied against a sibling video from the same creator because the named target had never been downloaded. Every comparison in those studies measured the wrong bar.

Record, as separate columns:

- what the creator credits (tools, collaborators, engine);
- what is visible on screen;
- what implementation you infer.

One creator may use different engines on different films, and a public repository with a similar style is not the reference's source code. Any claim about how the reference was built is reconstruction unless it is read off its frames or credits. A video-only download cannot establish sound-to-edit relationships; fetch the audio too, or state that limit.

Save the frames you actually compare against beside your notes, within your rights to use them. When a downloader is used, print the ID it resolved rather than trusting the URL you typed, for example `yt-dlp --print "%(id)s %(title)s" URL`.

### Two sampling rates, two jobs

| Sheet | How | What it answers |
|---|---|---|
| Whole film, 1 frame per 5 s | `uv run tools/verify/contact-sheet.py "$PROD/references/ref.mp4" "$PROD/references/ref-every5.jpg" --every 5 --cols 8` | Where the useful passages are; palette and composition drift over the film |
| Excerpt, 1 frame per second | `uv run tools/verify/contact-sheet.py "$PROD/references/ref.mp4" "$PROD/references/ref-1fps.jpg" --every 1 --from 60 --to 120 --cols 10` | Cut and sub-plate rate; how long a composition holds |

Each tile is labelled with its timestamp and frame number. The 1 fps sheet over a 30 to 60 second excerpt is the measuring instrument for pace (see below). Then watch one representative short passage in motion, with sound, several times. Sparse frames miss performance, transitions and musical phrasing.

### Detector counts are floors, and a silenced filter reads as zero

Automatic scene detection counts luminance and colour change. It does not count a new graphic plate laid on the same ground.

- On a dark-ground lyric film, `select='gt(scene,0.15)'` found 19 changes in 305 seconds, a mean gap of 15 seconds. The film actually switches sub-plates every 2 to 4 seconds; it simply holds one near-black ground across them. On dark motion graphics, treat a scene-score count as a lower bound.
- `showinfo` logs at the `info` level. Adding `-v error` (or `-loglevel error`) suppresses its output completely, and an empty result looks exactly like "no cuts". Keep the default log level when you use it:

```sh
ffmpeg -hide_banner -nostats -i "$PROD/references/ref.mp4" -an \
  -vf "select='gt(scene,0.15)',showinfo" -f null - 2>&1 | grep -c pts_time
```

- The threshold is film-specific. A brightly illustrated explainer measured sensibly at a much lower threshold (8 on ffmpeg's 0 to 100 scene scale) because its plates differ strongly in colour. Do not carry one threshold between styles.

Mark semantic visual changes by watching, and confirm them on the 1 fps sheet.

### What to record

Break the reference into measurable and perceptual properties:

- **Composition:** subject size, calm ground, alignment, depth and focal hierarchy.
- **Palette:** ground, main ink, accent, brightness range and how often accents appear.
- **Type:** display versus labels, weight, line length, reveal, active-word treatment.
- **Motion:** what moves, what rests, speed, easing, camera behaviour and transition grammar.
- **Structure:** opening promise, evidence, variation, escalation, return and payoff.
- **Sound:** voice delivery, silence, effects and which visual events get emphasis.

For the passage you study in motion, keep a compact timecoded table:

| Record | What to establish |
|---|---|
| Shot and sound | In/out, duration, phrase or accent, whether the cut anticipates or follows it |
| Composition | Hero subject, silhouette, scale, lens, foreground/background, negative space |
| Action | Anticipation, contact, resistance, follow-through, settle; what changes and why |
| Surface and light | Shape detail, roughness, contact shadows, reflections, light direction |
| Edit and reveal | Where attention starts, where it lands, transition motivation, setup and payoff |

Extract a few transferable techniques and apply them to an original shot. Do not copy a channel's signature layout wholesale, and do not replace analysis with adjectives such as "cinematic". If inspection was limited to stills, say so and leave motion conclusions unverified. A contact sheet can show palette and composition. It cannot show whether a transition is elegant, a camera move jolts, a caption is readable long enough or a sound arrives late.

## Put numbers on the look

"It doesn't look right" becomes actionable once both films are measured the same way. `tools/verify/measure-look.py` scales each frame to 480×270 and reports the median Rec.709 luma (0 to 255), the share of pixels above 128, the three most common colours after quantising each channel to 16 levels (the ground) and the mean of the 400 most saturated pixels (the accent).

Measure about 15 frames spread across the reference, then measure your own stills against it:

```sh
uv run tools/verify/measure-look.py "$PROD/references/ref.mp4" --samples 15 --json "$PROD/references/look.json"
uv run tools/verify/measure-look.py "$PROD/qa/stills" --compare "$PROD/references/stills" \
  --json "$PROD/qa/look-vs-reference.json"
```

With `--compare`, the tool exits 1 when the candidate's mean median falls outside the reference range ± `--tol-median` (default 5), its hot-pixel share outside ± `--tol-hot` (1.5 percentage points), its accent further than `--tol-accent` (60, RGB distance) or its top ground colour further than `--tol-ground` (40) from the nearest reference ground.

A measured dark-ground benchmark, from the chorus frames of a dark-ground lyric-film reference:

| Measure | Reference | A draft that "felt wrong" |
|---|---|---|
| Median luma | 18 to 24 | 34 |
| Pixels above 128 | 1.8% to 4.6% | 14.3% |
| Ground | blue-dominant near-black, `#000010` to `#101020` | green-dominant |
| Accent | one saturated colour | several competing colours |

The draft was roughly twice as bright with three to eight times the hot pixels. Nobody could say why it felt wrong until those two numbers sat side by side.

The gate: before shipping a look, state your numbers and the reference's numbers next to each other in the review note. A common cause of failing it is mixing background colours in linear RGB, which lifts dark frames to a median of 34 to 55; the calibration values are in [chapter 12](12-advanced-engines-and-benchmarks.md#3-quantitative-look-luminance--color-benchmarks).

Light grounds need their own reference numbers. Paper scenes in the same productions measured medians of 229 to 235, and the lyric reference's own "light world" was a warm grey-white, not cream. Measure the light reference rather than assuming a paper colour.

The numbers are a gate, not a goal. A frame can hit every figure and still have no subject.

## Design a visual sentence for every story beat

An explainer picture should demonstrate the sentence, not merely decorate it. For "small delays accumulate", let several timed delays stack into a visible total. For "one source, many outputs", branch from one origin and keep that origin visible. For "verify the result", show the actual observed result and the check that proves it.

For music, choose a recurring subject, visual rules and a progression. A chorus may return to the same subject with a changed state: more signals, less control, a larger counter, a damaged surface or an altered perspective. Repetition with a consequence is stronger than a succession of unrelated effects. A cut with a separate pun for every line feels like slides when nothing carries over; continuity can come from a character, a recurring object, connected places or consequences that persist.

### Key stills before the engine

Invert the engine-first order:

1. **Write the story as specific beats**: eight to twelve for a five-minute film. Each beat states what the viewer must understand at that moment, not what the geometry does.
2. **Make a target still for each beat** before any engine work, with an image model, a sketch or a paint-over. These fix subject, scale, framing, palette and what the shot is about, while a change of mind costs minutes.
3. **Review the stills as a strip against the audio.** If the story does not read as eight stills, it will not read as five minutes of motion. Fix it here, where a fix is one regenerated image.
4. **Build the engine to reproduce those frames.** Each target still is the acceptance test for its shot.
5. **Verify every shot against its own target still**, side by side. Inspecting a render on its own terms passes every time and answers a question nobody asked.

The target stills are direction, not footage. They need not appear in the film and the render need not match them exactly. They exist so that "right" is defined by something outside the renderer before the renderer runs. A generated direction board records intended composition, not achieved construction: for a physical interaction, inspect the actual rendered frames before, at and after contact.

### The shot table

```text
start   end    meaning                  hero/action             transition
0.00    3.20   establish the problem    queue fills              jobs carry over
3.20    7.80   show the cause           one worker bottleneck   follow one job
7.80   12.00   show the improvement     parallel workers        same job finishes
12.00  15.00   prove the outcome        measured wait shrinks   return to overview
```

This is authored direction. Timing tools measure cues; they do not choose the metaphor.

Every row should answer: what is the focal object, what changes, why now, and what remains changed afterward? If those answers are missing, the scene often becomes generic animated wallpaper. Cover every second, including instrumental stretches and the tail, so nothing falls through to an accidental fallback. Give each row an optional style-frame time for its key reveal; [chapter 6](06-building-scenes.md) turns that into a whole-film sheet.

## Set pace as a number

Cut density is a target, not a feeling. Measure the reference's rate from the 1 fps sheet, state your own, and compare both before building past the pilot.

How to measure from a 1 fps sheet of a 60-second excerpt:

1. Walk the tiles in order and mark each tile whose hero subject, plate or framing differs from the previous one. Count graphic sub-plate changes on an unchanged ground.
2. Mean shot length = excerpt seconds ÷ (changes + 1).
3. Do the same on your pilot's sheet. Write both numbers in the review note.

A 1 fps sheet cannot resolve shots shorter than a second; for fast explainers, confirm a few passages at 2 to 4 frames per second (`--every 0.25`).

| Format | Measured pace | Notes |
|---|---|---|
| Dark-ground lyric film | a sub-plate change every 2 to 4 s | The ground stays constant; scene detection under-counts badly |
| Lyric film, whole edit | 54 sub-plates over 260 s (mean 4.8 s) in 12 sections | An accepted edit; section structure plus sub-plates, not one plate per section |
| Illustrated "doodle" explainer | a new shot every 1.6 to 1.9 s | 81 shots in 150 s: mean 1.85 s, median 1.63 s, min 0.53 s, max 7.87 s |
| Story-world music video | sparse reference sampling suggested 3 to 5 s | A first pass averaged about 7 s per shot, some over 14 s, and felt slow |
| Vertical short | one scene per spoken sentence; big visual changes on spoken cues | Captions must hold at least 0.5 s + 0.3 s per word |

Consequences worth knowing early:

- A 26-second lyric pilot built as two held screens failed regardless of how good each screen was.
- At 1.85 s per shot, an 11-minute illustrated explainer needs roughly 300 to 400 distinct images. In the measured explainer, shots were nearly static inside; sequences changed the character's pose or expression between consecutive images rather than animating. One illustrated pilot averaged 3.35 s over 223 shots, well short of its own 1.6 to 1.9 s target.
- Image volume is then the bottleneck. One hosted image service returned rate-limit errors after 14 images; another produced 26 before its usage window closed, and 10 remaining shots became procedural overlays and camera moves. A practical plan is a small asset library per film (a character pose sheet, about 10 backgrounds and about 30 props) composed and animated in code, giving 40 to 60 generated images instead of 350. See [chapter 12](12-advanced-engines-and-benchmarks.md#6-hand-drawn-doodle--narrated-storyboard-rules-libink-doodlejs) for the batch tool.
- More cuts are not progression. About 30 inserts took one 188-second film from 27 to about 57 cuts and did not solve its quality gap. Inserts with an explicit `[from, to)` window keep the underlying shot's clock continuous when you cut back.

## Approve a hero frame

Choose the most representative difficult frame and draw it at final resolution. Include final typography and a meaningful subject. Resist coding a general engine until this frame works.

Check it at full size and at likely viewing size. For a vertical 1080×1920 production, a 360×640 view is a useful working check; the platform's actual overlays must still be tested separately. A 72 px label becomes 24 px at one-third scale. A hairline may disappear entirely.

Make hierarchy explicit:

1. The first thing noticed should be the thing the story is about.
2. A second layer should explain the relationship or consequence.
3. Small labels should reward attention without carrying indispensable meaning.

Reserve caption space in the design rather than placing text on top at the end.

### One accent, one rare alarm

Keep one dominant accent role: active word, warning, selected object or current event. A draft frame carrying green, white, amber and red cards at once read as a rainbow; the reference held a single accent per world and spent its alarm colour once. Hold the alarm back for the moment it means something. The accent can carry the arc (cold before a turn, warm after), and in a lyric film the hot colour is best reserved for the word being sung. If every surface glows, the accent no longer directs attention.

Check: run `measure-look.py` on the hero frame and on a dense frame. The accent it reports should be your accent; if it reports an alarm colour on an ordinary frame, the alarm is being overspent.

### Negative space and one hero mechanism

Pick one hero visual mechanism and give it bold negative space: 60 to 80% of the frame as calm ground, so every change reads at a glance. One rejected frame stacked a displaced core, a segmented shell, spinning rings, about 700 flying debris shards, floor rings, corner interface text and an oscilloscope. It read as screensaver noise.

Check at delivery scale: cover the frame with a 4×4 grid and count cells that are calm ground (no edges, no text, no moving particles). Fewer than 10 of 16 calm cells means the frame is busier than this target. Then ask someone to name the subject after a one-second look.

### Readability outranks the gag

On one draft frame, a speech-bubble gag covered the hero lyric word at the exact moment it was sung. Every sung or spoken line stays readable, and a karaoke highlight never runs ahead of the voice. When a joke and a word compete for the same pixels, the word wins.

## State the visual leap: reuse plumbing, never the previous visual kit

When a team makes a series, separate engine plumbing from visual vocabulary.

| Reuse freely (plumbing) | Do not carry over (vocabulary) |
|---|---|
| Deterministic `__renderFrame(t)` clock and page contract | The previous film's characters, cards, stamps and window chrome |
| Capture and encode pipeline, GPU flags | Its signature layout and interface frame |
| Audio identity, analysis files, timing tools | Its palette and ground |
| Look and pace gates, verification scripts | Its hero metaphor and silhouette |

In one observed series, a new film was built by copying the previous film's codebase. It added three new set-pieces but kept the previous film's character drawings, terminal-window cards, rubber stamps and wireframe boxes on the same near-black ground. The verdict was immediate: the same style as the last one; good, but every attempt should move the needle.

Before writing scene code, write one sentence naming the leap: what this film does that the previous one did not, suited to the material. Examples of leaps: a raymarched or volumetric world driven by measured spectra, thousands of instanced reactive objects, a cel-shaded or architectural world, diegetic type projected into space instead of a card deck. Then prove that leap in the pilot.

A rejected metaphor stays rejected when the renderer changes. Rewriting a scene from offline 3D to a real-time shader does not change the film if both show the same rejected premise. The viewer judges the subject on screen, not the pipeline behind it. After a rejection, discard the metaphor, silhouette and palette, not only the code.

## Use style cards as production instructions

The [style-card index](../prompts/styles/INDEX.md) describes many visual approaches. A card is useful when its instructions translate into visible choices: palette values, ground construction, line behaviour, type sizes, motion rules, sound treatment and a hero-frame recipe.

Choose a card because its visual grammar serves the subject. A terminal can support sequential computation; paper can support explanation and revision; isometric space can show a system; a print poster can make a forceful claim. Change a card when its conventions hurt clarity.

Rewriting a reference means extracting principles and creating fresh execution. Change the imagery, wording, geometry, arrangement and signature details. A mechanical overlap check (`python3 tools/verify/check-lift.py REFERENCE.txt CANDIDATE.txt`, which fails on any shared substantive 3-word run) can identify shared word runs, but cannot establish originality or permission. Retain provenance, avoid copying distinctive compositions, and verify any third-party code or asset licence separately.

For illustrated explainers, devices that carry meaning cheaply include a single recurring character, "concept" frames with one object and two to four hand-lettered words, a red cross over the wrong object, a tick-versus-cross comparison, a timeline with pins and labelled arrows. Code can beat a still-image reference on motion: subtle camera moves, parallax, blinks, text that writes on, arrows that draw and timed sound. A thumbnail follows the same economy: two to four words, one accent colour, one big subject.

## Build motion from purpose

Use motion to reveal order, cause, comparison, focus or change of state. Before adding motion, state its job. A label that bobs forever usually has no informational purpose. A label that settles after its object arrives tells the viewer that the relationship is established.

A useful motion phrase has anticipation, action and a readable hold. The hold is part of the animation. Do not spend most of a two-second shot entering and exiting before the audience can read it. Destruction or burn effects the audience should watch read better with linear progress; an eased burn finishes before the eye catches it.

Choose a small grammar of transitions: match position, carry an object forward, draw a boundary, fold or wipe with a meaningful shape. A dissolve is appropriate when continuity matters; a cut can be appropriate on a clear beat. Whole-frame blur or accumulated frame blending can smear the subject or create ghosts across cuts. A cut between near-identical framings reads as a glitch rather than a new shot ([chapter 6](06-building-scenes.md#camera-continuity-at-shot-boundaries)).

For still-image films, a camera move should expose or focus something specific. Plan the point of interest and crop path. Vary scale and framing by story function rather than applying the same slow zoom to every image. Close-ups of tactile objects (a screen, hands on keys, a lamp catching, ink being written) give a world scale that wide shots alone do not.

## Pilot the riskiest shot before scaling

Choose a representative shot that exposes the biggest risk: character acting, a tactile interaction, a hard transition, or type integrated with motion. A quiet logo loop is a poor proxy for a film whose promise is physical comedy. A few seconds may be enough for one action; an arc or a visual leap usually needs 20 to 30 seconds or neighbouring sections. Avoid padding to a fixed length.

Make the pilot with real audio and export it. Then:

1. Make a 1 fps sheet of the pilot and of the matching reference passage; state both cut rates.
2. Run `measure-look.py --compare` against the reference stills; state both sets of numbers.
3. Put each shot beside its target still.
4. Watch it at delivery size, at speed, with sound.

Ask:

- Does the subject read immediately, and does the stated visual leap show?
- Can someone explain the visible cause and effect on mute?
- Does the chosen visual system have enough range for the full duration?
- Is the motion smooth and intentional at the chosen frame rate?
- Does typography remain readable after encoding?
- Does sound support the message without masking it?

Keep each pass to a stated hypothesis, a bounded excerpt and an observable comparison. If the pilot is rejected as cheap or the wrong direction, stop expanding that direction. Diagnose the missing craft and change the premise, assets or action before another costly render. More inserts, stronger colour or a renderer change did not rescue the observed rejected films.

### Feedback that can be implemented

Every note should carry four parts:

| Part | Example |
|---|---|
| Where | 0:42.3 to 0:44.0, the counter on the left wall |
| Preserve | the slow push-in and the timing of the reveal |
| One change | drop the counter's glow so the active word is the brightest thing |
| How to tell it worked | the word measures brighter than the counter; the counter still reads at 360 px wide |

"Too bright in the lower half at 4.2 s; the label loses contrast" is actionable. "Needs more energy" is a discussion prompt, not an implementation specification.

Bind exported notes to the source-audio hash and any caption offset, and save them beside the production; browser storage in a review page is convenient but is not the archive. Render reviewer text as text, never as raw HTML. When reports arrive as a list of timestamps, cluster them before fixing anything: in one review, seven "glitch" reports collapsed into two mechanical classes (hard brightness cuts and strobing debris), and fixing the classes fixed the list.

Keep states separate in the log: pilot built, checks passed, exported, watched with sound, accepted. A liked pilot does not accept a later full export or a different direction. Then establish the audio and timing in [chapter 4](04-music-audio-and-timing.md).
