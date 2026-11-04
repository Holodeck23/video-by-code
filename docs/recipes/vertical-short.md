# Recipe: a 12-second vertical short

**Result:** 1080×1920, 30 fps, 360 frames, no external media and procedural effects.
The layout is separately composed for vertical viewing. It is a concise technical
example, not a claim that a social channel will accept it or that the style is approved.

## 1. Define the visible idea

The hook is “ONE CLOCK. EVERY FRAME.” The large clock is the hero, three bands show the
outputs it governs, and the ending resolves the rule. Text stays inside a wide margin.
For a destination app, take a screenshot of its current UI and define real safe areas;
the sample's margins do not certify all platform overlays.

## 2. Preview and test

Run from the kit root after `cd starter && npm ci`:

```sh
PROD="/absolute/path/to/short-production"
mkdir -p "$PROD/renders" "$PROD/stills" "$PROD/checks"
node starter/determinism.mjs examples/vertical-short.html
node starter/render.mjs examples/vertical-short.html \
  --stills 1.5,4.5,8.5,11.5 --outdir "$PROD/stills"
node starter/render.mjs examples/vertical-short.html \
  --out "$PROD/renders/short.mp4" --fps 30 --audio page
uv run tools/verify/verify-video.py "$PROD/renders/short.mp4" \
  --expect-seconds 12 --fps 30 --width 1080 --height 1920
uv run tools/verify/contact-sheet.py "$PROD/renders/short.mp4" \
  "$PROD/checks/short-sheet.jpg" --n 12 --cols 4 --tile-width 270
```

The effects are sparse, so integrated loudness can be below a continuous voice/music
target. Listen and decide whether that is intentional; do not blindly amplify isolated
clicks to make the whole-file average equal a continuous narration target. True peak
must still stay within the chosen ceiling.

## 3. Inspect motion and legibility

View at 360×640. Every word must remain readable without pausing. Review the moment the
three bands appear and the ending overlay arrives. Check at least the frame before,
at and after each event. Scan all actual title/caption bounds when adapting the text;
a long replacement headline can fail despite the original fitting.

The live preview uses a wall/audio clock to ask for absolute-time frames. Export asks
for `t = n / 30`. The output never records a screen playing in real time. A preview
stutter therefore does not prove the rendered file drops frames; inspect its exact
frame count and play the encoded result.

## 4. Add narration or make a longer short

Record the complete thought, align it, then edit the scene durations. Group captions
into stable phrases rather than replacing the whole screen on every word. Leave a
deliberate ending hold and ensure the final spoken syllable survives encoding. Use
`--voice /path/to/voice.wav --audio page` to mix narration with the page score. The
page's score enters voiceover mode, suppressing beds/music and lowering minor effects.
That is a baseline mix choice; production ducking and approved voice quality require
listening. A new topic and voice need their own measured timings and review.
