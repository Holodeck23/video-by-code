# Third-party notices

The kit's own code and docs are MIT-licensed (see `LICENSE`). Some files adapt ideas and
code from other MIT-licensed work; their notices are reproduced here as that licence requires.

## pdoom-video (MIT)

Source: https://github.com/mexicat/pdoom-video

Adapted in this kit:
- `tools/render/parallel-ws-render.mjs`: multi-worker headless-Chrome capture into one
  ffmpeg process with in-order reassembly, a bounded reorder buffer and disk spool, sub-frame
  shutter sampling, and cut-boundary contact sheets.
- `lib/webgl-post.js`: parts of the staged post-processing approach (HDR accent, bloom,
  grade and grain passes).

```
MIT License

Copyright (c) 2026 Giacomo Magnanini

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Not bundled, used at run time

These are installed or loaded by the user and keep their own licences: Playwright
(Apache-2.0), FFmpeg (LGPL/GPL depending on build), Google Fonts loaded by example pages
(mostly SIL OFL), Kokoro TTS model and kokoro-onnx (Apache-2.0), whisper.cpp / Whisper
(MIT), Demucs (MIT), librosa (ISC), Three.js (MIT) when a page loads it. Check each
licence, plus font, music and voice-model terms, for your production.
