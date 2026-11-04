#!/usr/bin/env python3
"""Measure source RMS and inject it into examples/instrumental.html (stdlib + ffmpeg).

python3 tools/build-visualizer.py AUDIO --out examples/my-visualizer.html
Output must stay in examples/ so relative library links remain valid. Audio stays outside
the checkout. This is an energy envelope, not a beat/section detector. No source copy is made.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parent.parent

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('audio',type=Path)
    ap.add_argument('--out',type=Path,required=True)
    a=ap.parse_args()
    if not a.audio.is_file():ap.error('audio must be a readable file')
    if a.out.resolve().parent != (ROOT/'examples').resolve():ap.error('--out must be directly inside the kit examples/ directory')
    if a.out.exists():ap.error('output exists; choose a new source filename')
    r=subprocess.run(['ffmpeg','-v','error','-i',str(a.audio),'-map','0:a:0','-ac','1','-ar','12000','-f','f32le','-'],capture_output=True)
    if r.returncode:ap.error(r.stderr.decode(errors='replace')[:500])
    samples=array('f');samples.frombytes(r.stdout)
    if sys.byteorder!='little':samples.byteswap()
    if not samples:ap.error('no decoded samples')
    hop=400
    raw=[math.sqrt(sum(v*v for v in samples[i:i+hop])/len(samples[i:i+hop])) for i in range(0,len(samples),hop)]
    scale=max(sorted(raw)[int(.95*(len(raw)-1))],1e-6)
    envelope=[];last=0.
    for v in raw:
        target=min(1.,v/scale);last+= (.75 if target>last else .22)*(target-last);envelope.append(round(last,5))
    digest=hashlib.sha256()
    with a.audio.open('rb') as f:
        for block in iter(lambda:f.read(1<<20),b''):digest.update(block)
    features={'rate':30,'duration':len(samples)/12000,'source_sha256':digest.hexdigest(),'method':'30Hz RMS; attack/release smoothing; p95 normalisation','rms':envelope}
    template=(ROOT/'examples/instrumental.html').read_text()
    before,rest=template.split('/*FEATURES*/',1);_,after=rest.split('/*END_FEATURES*/',1)
    a.out.write_text(before+'const FEATURES='+json.dumps(features,separators=(',',':'))+';\n'+after)
    print(f'{a.out}: {features["duration"]:.3f}s, {len(envelope)} envelope samples; source sha256 {digest.hexdigest()}')

if __name__=='__main__':main()
