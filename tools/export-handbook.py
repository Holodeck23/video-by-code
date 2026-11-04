# /// script
# requires-python = ">=3.10"
# dependencies = ["Markdown==3.7"]
# ///
"""Export a readable offline handbook and a clean source ZIP.

uv run tools/export-handbook.py --out /absolute/delivery/directory
No node_modules, caches, reference exports or generated media are packaged.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import zipfile
import markdown

ROOT=Path(__file__).resolve().parent.parent

def git(*args):
    return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',type=Path,required=True)
    a=ap.parse_args();out=a.out.resolve()
    if out==ROOT or ROOT in out.parents:ap.error('export outside the code checkout')
    out.mkdir(parents=True,exist_ok=True)
    files=[ROOT/'README.md',ROOT/'RUNBOOK.md',*sorted((ROOT/'docs').glob('[0-9][0-9]-*.md')),
           *sorted((ROOT/'docs/recipes').glob('*.md')),ROOT/'examples/README.md',ROOT/'lib/API.md',
           ROOT/'prompts/README.md',ROOT/'PROVENANCE.md',ROOT/'VALIDATION.md']
    for f in files:
        if not f.is_file():ap.error(f'missing required book section: {f.relative_to(ROOT)}')
    anchors={f.resolve():'section-'+str(i+1) for i,f in enumerate(files)}
    parts=['# Video by Code — field handbook\n\nRead in a browser or hand this kit to a human–agent team. '
           'The accompanying source ZIP includes the full 86-card catalog and runnable tools.\n']
    nav=[]
    for f in files:
        s=f.read_text();anchor=anchors[f.resolve()]
        title=re.search(r'^# (.+)$',s,re.M).group(1)
        nav.append((anchor,title))
        def link(m):
            target=m.group(2)
            if '://' in target or target.startswith('#'):return m.group(0)
            dest=(f.parent/target.split('#')[0]).resolve()
            if dest in anchors:return f'[{m.group(1)}](#{anchors[dest]})'
            if dest==ROOT/'prompts/styles/INDEX.md':return f'{m.group(1)} (see source ZIP: prompts/styles/INDEX.md)'
            try:label=str(dest.relative_to(ROOT))
            except ValueError:label=target
            return f'{m.group(1)} (source ZIP: `{label}`)'
        s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,s)
        parts.append(f'\n<a id="{anchor}"></a>\n\n'+s+'\n\n---\n')
    book='\n'.join(parts)
    (out/'video-by-code-handbook.md').write_text(book)
    body=markdown.markdown(book,extensions=['fenced_code','tables','toc','sane_lists'])
    menu=''.join(f'<a href="#{anchor}">{html.escape(title)}</a>' for anchor,title in nav)
    page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Video by Code — field handbook</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f0e8;color:#192c36;font:17px/1.65 system-ui,sans-serif}
nav{position:fixed;inset:0 auto 0 0;width:295px;overflow:auto;background:#182c36;color:#eee;padding:28px 20px}nav strong{display:block;font-size:22px;margin-bottom:20px}nav a{display:block;color:#cfdee2;padding:7px 0;text-decoration:none;font-size:14px;line-height:1.45}nav a:hover{color:#a9e4ba}
main{max-width:1120px;margin-left:295px;padding:54px 70px 100px}h1{line-height:1.13;font-size:38px;margin-top:55px}h2{font-size:26px;margin-top:42px}h3{font-size:21px;margin-top:32px}a{color:#1658a4}pre{overflow:auto;padding:22px;background:#122630;color:#e3eee8;border-radius:8px;font-size:13px;line-height:1.6}code{font-family:ui-monospace,monospace;font-size:.88em}p code,li code,td code{background:#e1e5df;padding:2px 5px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:14px;margin:22px 0}td,th{border:1px solid #c5ceca;padding:11px;text-align:left;vertical-align:top}th{background:#e0e7df}hr{border:0;border-top:2px solid #c6ceca;margin:70px 0}blockquote{border-left:4px solid #187659;margin-left:0;padding-left:22px}a[id]{scroll-margin-top:30px}
@media(max-width:900px){nav{position:static;width:auto;max-height:280px}main{margin-left:0;padding:20px 24px 70px}h1{font-size:31px}table{display:block;overflow:auto}}@media print{nav{display:none}main{margin:0;padding:0;max-width:none}pre{white-space:pre-wrap;color:#111;background:#eee}h1,h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><nav><strong>VIDEO / BY CODE</strong><small>Offline field handbook<br>Use browser Find to search.</small>'''+menu+'</nav><main>'+body+'</main></body></html>'
    (out/'video-by-code-handbook.html').write_text(page)
    names=git('ls-files','-co','--exclude-standard','-z').split('\0')
    exclude={'.mp4','.mov','.wav','.aiff','.m4a','.png','.jpg','.jpeg','.pyc','.bundle'}
    archive=out/'video-by-code-kit.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for name in sorted(set(names)):
            p=ROOT/name
            if not name or not p.is_file() or p.is_symlink() or p.suffix.lower() in exclude:continue
            if any(x in p.parts for x in ['node_modules','__pycache__','.git']):continue
            z.write(p,'video-by-code/'+name)
        z.write(out/'video-by-code-handbook.html','video-by-code/handbook.html')
        z.write(out/'video-by-code-handbook.md','video-by-code/HANDBOOK.md')
    manifest={'source_commit':git('rev-parse','HEAD'),'working_tree_dirty':bool(git('status','--porcelain')),
              'book_sections':len(files),'archive':archive.name,'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
              'includes':'source, docs,86-card catalog, templates, examples; no installed dependencies or source media'}
    (out/'export.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))

if __name__=='__main__':main()
