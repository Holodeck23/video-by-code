#!/usr/bin/env python3
"""Make the narrated example's disposable local voice fixture (macOS say + ffmpeg).

python3 examples/make-narration.py /absolute/production/audio [--voice VOICE]
For production, record or generate an approved voice, then retime the scenes to it.
This is a smoke-test voice, not a quality benchmark. Captions are phrase-level slot cues.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

SCRIPT = [
    'A video is a sequence of drawings. Each frame asks what the scene looks like now.',
    'Keep picture, sound, and captions on one timeline. Changing the timing should change them together.',
    'Reveal cause before effect. Move the object that matters, then hold the result long enough to read.',
    'Check the finished file for missing frames, clipped labels, wrong colours, and sound that drifts.',
    'Save the source, timing, media, and checks. A team can reproduce the film and improve the next one.',
]
SLOT = 7.2

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('outdir', type=Path)
    ap.add_argument('--voice', help='Installed macOS voice name; omit for system default')
    a = ap.parse_args()
    for name in ['say', 'ffmpeg', 'ffprobe']:
        if not shutil.which(name):
            ap.error(f'{name} is required; supply your own narration.wav instead on this platform')
    a.outdir.mkdir(parents=True, exist_ok=True)
    target = a.outdir / 'narration.wav'
    if target.exists():
        ap.error(f'{target} already exists; choose a fresh output directory')
    cues = []
    with tempfile.TemporaryDirectory(prefix='vbc-voice-') as temp:
        p = Path(temp)
        for i, line in enumerate(SCRIPT):
            src, dst = p / f'{i}.aiff', p / f'{i}.wav'
            cmd = ['say', '-r', '170', '-o', str(src)]
            if a.voice:
                cmd += ['-v', a.voice]
            run(cmd + [line])
            duration = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(src)]))
            if duration > SLOT - .35:
                raise SystemExit(f'Voice cue {i} is {duration:.2f}s; exceeds its slot. Increase speech rate or retime the film.')
            run(['ffmpeg', '-v', 'error', '-i', str(src), '-af', f'adelay=200:all=1,apad=whole_dur={SLOT},atrim=end={SLOT}',
                 '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(dst)])
            cues.append({'start': round(i * SLOT + .2, 3), 'end': round(i * SLOT + .2 + duration, 3),
                         'text': line, 'timing': 'synthesis-slot; not word-aligned'})
        (p / 'concat.txt').write_text(''.join(f"file '{i}.wav'\n" for i in range(5)))
        run(['ffmpeg', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(p/'concat.txt'), '-c', 'copy', str(target)])
    (a.outdir/'script.txt').write_text('\n\n'.join(SCRIPT)+'\n')
    (a.outdir/'narration.json').write_text(json.dumps({'duration': 36, 'voice': a.voice or 'system default',
        'purpose': 'local functional fixture; not approved production voice',
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'cues': cues}, indent=2)+'\n')
    def stamp(t):
        ms=round(t*1000); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
    (a.outdir/'narration.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(cues))+'\n')
    print(target)

if __name__ == '__main__':
    main()
