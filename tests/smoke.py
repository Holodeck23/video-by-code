#!/usr/bin/env python3
"""Exercise the real browser/encoder and prove the verifier rejects known failures.
Usage: python3 tests/smoke.py /absolute/evidence/output/folder
Requires the starter's Playwright dependency, system Chrome, ffmpeg, ffprobe and uv.
Writes tiny generated fixture media only in the supplied folder. Reuses that folder on rerun.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None
if OUT is None:
    raise SystemExit(__doc__)
OUT.mkdir(parents=True, exist_ok=True)
rows = []

def check(label, args, expected=0):
    p = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=90)
    (OUT / f'{label}.log').write_text(p.stdout + p.stderr)
    ok = p.returncode == expected
    rows.append({'test': label, 'command': args, 'expected_exit': expected, 'actual_exit': p.returncode, 'pass': ok})
    print(label, 'PASS' if ok else 'FAIL')
    if not ok:
        print((p.stdout+p.stderr)[-1500:])
    return p

page = OUT / 'contract.html'
page.write_text('''<!doctype html><canvas id="c" width="320" height="180"></canvas>
<script src="''' + (ROOT/'lib/sound.js').as_uri() + '''"></script><script>
window.DURATION=2;window.FPS=30;window.__ready=Promise.resolve();
window.__renderFrame=t=>{const x=document.querySelector('canvas').getContext('2d');x.fillStyle='#e7e4da';x.fillRect(0,0,320,180);x.fillStyle='#2b4e95';x.fillRect(20+t*80,50,60,80)};
window.scoreSound=k=>{k.play('paper',0.1);k.play('tock',0.7);k.noise(1.2,{dur:0.25,color:'pink'})};</script>''')
broken = OUT / 'broken.html'
broken.write_text('<canvas id="c"></canvas><script>throw new Error("intentional broken fixture")</script>')
render = ['node', 'starter/render.mjs']
verify = ['uv', 'run', 'tools/verify/verify-video.py']
check('browser-contract', ['node', 'tests/runtime-contract.mjs'])
check('render-page-sound', render+[str(page),'--audio','page','--out',str(OUT/'scored.mp4')])
check('verify-scored', verify+[str(OUT/'scored.mp4'),'--expect-seconds','2','--fps','30','--width','320','--height','180'])
check('render-range-silent', render+[str(page),'--from','0.5','--to','1.5','--out',str(OUT/'range.mp4')])
check('verify-range', verify+[str(OUT/'range.mp4'),'--expect-seconds','1','--fps','30','--width','320','--height','180','--allow-silent'])
check('reject-wrong-duration', verify+[str(OUT/'scored.mp4'),'--expect-seconds','3','--fps','30','--json',str(OUT/'wrong-duration.json')],1)
check('reject-missing-audio', verify+[str(OUT/'range.mp4'),'--expect-seconds','1','--fps','30','--json',str(OUT/'missing-audio.json')],1)
check('reject-broken-page', render+[str(broken),'--out',str(OUT/'never.mp4')],1)
check('reject-bad-range', render+[str(page),'--to','3','--out',str(OUT/'never.mp4')],1)
check('reject-missing-flag-value', render+[str(page),'--audio','--out',str(OUT/'never.mp4')],2)
check('contact-sheet', ['uv','run','tools/verify/contact-sheet.py',str(OUT/'scored.mp4'),str(OUT/'contact.jpg'),'--n','4','--cols','2'])
check('measure-look', ['uv','run','tools/verify/measure-look.py',str(OUT/'scored.mp4'),'--samples','3','--json',str(OUT/'look.json')])
check('cut-harshness', ['uv','run','tools/verify/cut-harshness.py',str(OUT/'scored.mp4'),'--json',str(OUT/'cuts.json')])
check('channel-self', ['uv','run','tools/verify/channel-ssim.py',str(OUT/'scored.mp4'),str(OUT/'scored.mp4'),'--json',str(OUT/'self-channels.json')])
check('channel-truncated', ['uv','run','tools/verify/channel-ssim.py',str(OUT/'scored.mp4'),str(OUT/'range.mp4'),'--json',str(OUT/'truncated-channels.json')],1)
(OUT/'smoke-results.json').write_text(json.dumps({'status':'PASS' if all(r['pass'] for r in rows) else 'FAIL','tests':rows},indent=2)+'\n')
raise SystemExit(0 if all(r['pass'] for r in rows) else 1)
