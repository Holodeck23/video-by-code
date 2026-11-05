# 13. Animated-Host Explainers: Stage Gates, Cue-Word Storyboards and Lip Sync

A faceless explainer with a drawn presenter (a sprite or illustrated host who talks, blinks and turns toward
what is on screen) is the most demanding narrated format in this kit. The voice drives everything: the mouth,
the beats, the subtitles, the chapter cards. This chapter sets out the production method that keeps such a
film on schedule: a voice-first pipeline with a human check between stages, a storyboard written as text and
anchored to spoken words, a mouth track computed from the real take, and a look that can be swapped without
touching the scenes.

The method follows the order classic cel animation used, because the problem is the same one: drawings must
land on syllables that were recorded first.

| Classic studio step | Code equivalent | Artifact |
|---|---|---|
| Record dialogue before drawing | Synthesise or record the voice per paragraph | `voice.wav` + per-paragraph takes |
| Exposure (dope) sheet | Word timings and a mouth shape per step | `words.json`, `mouth.json` |
| Story reel timed to the track | Storyboard compiled against word times | `cues.md` table |
| Pencil test | One still per beat on a contact sheet | `stills/sheet_*.jpg` |
| Sweatbox review | Live browser preview with sound | preview URL |
| Ink and paint | Frame-exact headless render + encode | final MP4 |

---

## 1. One stage, one artifact, one check

Each stage reads the previous stage's file, writes one main file, and stops. A person (or the agent, for
mechanical checks) inspects that file before the next stage starts. The gate is what stops one mispronounced
name from surviving into a finished render, where fixing it costs a re-voice, a re-time and a re-render.

| Stage | Reads | Writes | Gate |
|---|---|---|---|
| 1. Voice | brief, script | joined take + per-paragraph clips | Listen to the whole take; re-roll single paragraphs |
| 2. Words | the take | word timings, mouth track, script-vs-heard diff | Read the diff; fix spellings in the script, not in the timings |
| 3. Storyboard | storyboard text, word timings | timed beat table | Read the table before any scene code; short beats flagged |
| 4. Animation | beat table, scene code, style | contact sheets, live preview | Agent reads every sheet; human watches with sound |
| 5. Render | everything above | master, phone copy, description draft | Human picks title and thumbnail; nothing publishes |

Rules that make the gates hold:

- Never start a stage while the previous gate is open.
- Fix timing in the storyboard text, never by nudging numbers inside scene code.
- Keep one folder per video holding every artifact from brief to render, so any stage can be re-run alone.

## 2. Script markup for a voice you can re-roll

- **A paragraph is one synthesis call.** Cache each paragraph's clip by the hash of its text and voice
  settings. Editing one paragraph re-synthesises one clip; a `--redo N` style flag re-rolls a single bad take
  without touching the rest.
- **Headings are chapters.** A `# ` line starts a section; the joiner inserts a longer gap before it, and the
  delivery step turns sections into YouTube chapters.
- **Display text and spoken text can differ.** Write `{CLAUDE.md|Claude dot M D}`: the subtitle shows the left
  side, the voice reads the right side. The same mechanism fixes kanji a voice misreads, by giving the reading.
  This generalises the kit's `say.json` pronunciation map to per-occurrence control.
- **Delivery directions** such as `[excited]` belong in the script only for voice models that honour them;
  strip them before models that would read them aloud.
- **Lines starting with `>`** are notes to the editor and never reach the voice.
- **Let the human rewrite the draft script.** An agent-drafted script read by a synthetic voice is the fastest
  route to a film that feels generated. The rewrite is the single highest-value human minute in the pipeline.

## 3. The exposure sheet: words and mouths from the real take

Time everything from the audio that was actually produced, not from the synthesiser's estimate. Run speech
recognition with word timestamps on the joined take (`tools/timing/align-words.py`), then diff the heard words
against the script and list every disagreement. Digits written in the script will always show as
disagreements; listen and accept them if they sound right. A wrong name is fixed by respelling it the way it
sounds, then re-voicing only that paragraph.

From the word timings and the WAV, build the mouth track:

```sh
uv run tools/timing/mouth-track.py "$PROD/audio/voice.wav" "$PROD/analysis/words.json" \
  "$PROD/analysis/mouth.json"
```

`mouth-track.py` writes one mouth drawing per step (default 12 per second, the cadence of animation on twos)
from two signals combined:

1. **What is being said.** Letters are spread evenly across each word's span and classed: *a/i* open, *o/u/w*
   round, *e/y* wide, *m/b/p* lips together, everything else mid. When two sounds share a step, the most open
   one wins, so fast speech does not flicker shut.
2. **How loud it is.** Per-step RMS is normalised to the 90th percentile of voiced steps. Below 0.14 the mouth
   closes; below 0.42 it half-opens (or rounds for an *o*); above that it takes the vowel shape. Silence and
   breaths therefore always read as closed, and a quiet aside never gapes.

It also writes a 30 fps level curve for a waveform bar, a glow or a speaking indicator. For Japanese, convert the
text to kana and spread morae instead of letters; vowel classes map directly (あ open, お/う round, え/い wide).

Five shapes are enough for a pixel or flat-illustration host. Add blinks on a seeded random schedule (every
2–6 s, 3–4 frames long) and let the beat's mood pick the eye set.

## 4. The cue-word storyboard

Write the storyboard as plain text, one block per picture change, each anchored to the words where it begins.
The compiler finds those words in the word timings and turns the text into a timed table before a single frame
is drawn. Moving a beat means editing a phrase, not a timestamp, so re-voicing a paragraph never breaks the
board. The template is [`templates/storyboard.txt`](../templates/storyboard.txt).

```
== list title="Three checks"
@ before you ship anything
- the voice @ listen to the whole take
- the timing @ read the table
- the frames @ look at every sheet
```

Useful beat types, each drawn by a shared scene kit:

| Type | Picture | Content |
|---|---|---|
| host | Presenter large, optional short text beside | text lines |
| title | Section card | title + subtitle |
| big | One statement, a highlighted word | text with `*word*` |
| list | Items appear on their own cue words | `- item @ cue` |
| flow | Steps with arrows, one active | `- step @ cue` |
| screen | A real file in a window, highlight moves to a line on cue | `file=`, `- 20 @ cue` |
| image | A picture with a slow push-in | `src=`, caption |
| custom | A one-off function in the video's scene file | `name=` |

Every beat can also set the host's mood, position and a sound effect. The compiled table lists start, length,
type and cue words; the compiler flags any beat shorter than 1.2 s and stops on a cue phrase it cannot find.

## 5. Laying out a talking host

- **Content owns the region beside the host.** Compute the free rectangle once per beat from the host's
  position and the subtitle box; titles, lists, steps and file windows size themselves to that rectangle.
  Nothing sits on the face or under the subtitles.
- **Alternate sides at each chapter** so long videos do not feel static; allow a per-beat override.
- **Turn toward new content.** When a content beat starts, swap to a presenting or pointing pose toward it for
  about two seconds, still lip-synced, then return to the idle pose.
- **Move by transition, not slide.** When the host changes place between beats, dissolve out and back in (a
  pixel-dissolve suits sprite hosts) rather than animating across the frame.
- **One sound effect per beat at most,** chosen from a small fixed set (blip, pop, shimmer, whoosh, type).

## 6. Swappable looks, explored in rounds

Put everything visual that is not the host or the content in a style file: palette, fonts, background plates,
card and bullet treatments, subtitle box, section label, text entrance (rise, type-on, pop), beat transition,
and how the host is presented (hologram, solid, sticker cut-out, framed). The host's sprites never change with
the style.

Allow a style to extend another and override a few keys. Then explore looks in rounds: render six frames per
candidate style straight from the live player (seconds, no encode), lay all candidates on one numbered sheet,
pick one, and branch the next round from the pick. This is the kit's three-design-stills rule
([chapter 3](03-design-before-code.md)) applied to a whole look library.

## 7. Several languages on one timeline

A master language sets the timeline: its beats, its chapter times, its length. Every other voice is fitted
onto that timeline so all renders share length and beat frames, and a viewer can switch language at any
second.

1. Translate paragraph for paragraph, keeping each paragraph's sentence count identical to the master.
2. Pin each beat's speech start to the master's beat start. Within the beat, every sentence runs at its natural speed.
3. If a beat's speech overruns its slot, shrink the pauses between sentences first (cap them, step the cap
   down), and only then speed the speech up with a pitch-preserving stretch (for example FFmpeg's
   `rubberband` filter).
4. Report every beat's stretch factor. Above about 1.12× the voice starts to sound hurried; above 1.25×
   rewrite the line shorter instead of stretching. In Japanese, every 、 is a pause: fewer commas fit better.

On-screen text for each language lives in a strings file keyed by the master text, with an optional cue word
so a list item appears when its word is spoken in that language. A missing string stops the compile and writes
the missing keys to a file for the translator.

**Subtitles from the voice.** Build subtitle cues from the take's own word timing, snapped to sound onsets:
one sentence per cue, split at commas, at most about 46 characters a line for English and 22 for Japanese.
For a foreign-voice, English-subtitle cut, show each English sentence over the span of the sentence it
translates. A Japanese voice with English subtitles and English on-screen text is a proven default for this
format.

## 8. The sweatbox: preview is the render

The live browser preview must call the same frame function the renderer calls, so what the reviewer sees at
2:10 is the frame the encoder writes at 2:10. Give the preview transport keys (play, language swap, subtitle
toggle) and a printed link; never open windows on the user's screen. Notes come back as timestamps ("2:10, card
bigger"), and the fix lands in the storyboard text or the scene file before the next reload.

Before the human watches, the agent renders one labelled still per beat onto contact sheets
(`tools/verify/contact-sheet.py`), reads every sheet, and fixes text over the host, text off the edge, text
too small for its time on screen, and empty frames.

## 9. A consistent character

Generate a host with an image model as a set of candidates; pick one. Produce poses as edits of the chosen
base image on a flat chroma-green background, then separate mouth and eye parts. A preparation script keys the
green, scales every part, snaps all parts to one pixel grid and quantises to one palette, so every pose and
mouth composites without seams. Never retouch sprites by hand: change the generation prompt and rerun the
preparation, so the character can be regenerated in a new pose next month and still match.

## 10. Craft rules for this format

- **Show, do not restate.** The subtitles already carry the sentence. The picture adds evidence instead: the
  actual file, the live page, the measured figure, the object itself. Never set the spoken line as on-screen text.
- **Real over drawn.** Prefer headless captures of real public pages and real files over illustrated stand-ins.
- **Few words, large type.** Each on-screen phrase must be readable in the time it is shown.
- **Facts are real.** No invented numbers, quotes or screenshots.
- **The human owns the title and thumbnail.** Nothing in the pipeline uploads or publishes.

## 11. Render and delivery for a hosted explainer

- Two render workers on a laptop; a reported pace for this format is roughly 10–15 frames a second, so budget
  15–40 minutes for a 5–7 minute film. Use range renders (`--from/--to`) for spot checks.
- Mix voice, a low music bed (around −19 dB under the voice) and the beat sound effects; normalise the mix to
  −14 LUFS ([chapter 5](05-narration-and-captions.md)).
- Deliver a 1080p master, a 720p phone copy, per-language files and sidecar subtitles, plus a description
  draft whose chapters come from the script's section headings.
- A 5-minute film costs well under a dollar in voice and transcription API calls at current list prices.

## 12. When a shot belongs to a video model instead

Code-drawn hosts suit explainers. When a moment needs live footage transformed (a prop that turns into a
product, a lighting change on a beat), a video-to-video model can do it, and the same voice-first timing
applies. Write the edit as a trigger and one change:

```
Right after the speaker says "<trigger word>" at <t> seconds, <one visible change>, and change nothing else.
```

Name the spoken trigger, give its timestamp, ask for exactly one change, and cut on the trigger so the seam is
hidden by the speech. Generate at the model's draft resolution first and keep the source clip untouched.
