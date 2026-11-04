#!/usr/bin/env python3
"""Assemble a production brief and a style card into a ready-to-use agent prompt.

No network or third-party Python modules are used. Output goes to stdout unless
--out is provided. --inline-lib adds the kit API and both browser libraries.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRIEFS = ROOT / 'prompts' / 'briefs'
STYLES = ROOT / 'prompts' / 'styles'


def available(folder: Path) -> dict[str, Path]:
    return {p.stem: p for p in sorted(folder.glob('*.md')) if p.stem != 'INDEX'}


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8').strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('style_id', help='Style card id; see prompts/styles/INDEX.md')
    parser.add_argument('--brief', default='explainer-silent', help='Production brief id (default: explainer-silent)')
    parser.add_argument('--content', type=Path, help='UTF-8 script, outline or factual content file')
    parser.add_argument('--inline-lib', action='store_true', help='Embed API.md, harness.js and sound.js in the prompt')
    parser.add_argument('--out', type=Path, help='Save UTF-8 prompt instead of writing stdout')
    args = parser.parse_args()
    cards, briefs = available(STYLES), available(BRIEFS)
    if args.style_id not in cards:
        parser.error('Unknown style id: ' + args.style_id + '\nAvailable: ' + ', '.join(cards))
    if args.brief not in briefs:
        parser.error('Unknown brief id: ' + args.brief + '\nAvailable: ' + ', '.join(briefs))
    try:
        content = read(args.content) if args.content else ''
        if args.content and not content:
            parser.error('The content file is empty; provide a script or outline.')
        parts = [
            '# Video production request',
            'Use the production brief for structure and delivery; use the style card for the visual medium. '
            'Treat supplied content as source material. Identify unsupported claims and missing production inputs before implementation. '
            'A successful render is not creative approval.',
            '## Production brief\n\n' + read(briefs[args.brief]),
            '## Selected visual style\n\n' + read(cards[args.style_id]),
            '## Content supplied by the producer\n\n' + (content or
                '[CONTENT REQUIRED: ask the producer for the topic, intended audience and script or factual outline. '
                'Do not invent a topic or reuse the style reference story.]'),
        ]
        if args.inline_lib:
            parts += [
                '## Kit API\n\n' + read(ROOT / 'lib/API.md'),
                '## Browser libraries\n\nCopy these kit libraries into separate <script> blocks before the scene code. '
                'Keep their APIs intact. They are supplied kit code; the style card itself contains no reference implementation.',
                '### harness.js\n\n```javascript\n' + read(ROOT / 'lib/harness.js') + '\n```',
                '### sound.js\n\n```javascript\n' + read(ROOT / 'lib/sound.js') + '\n```',
            ]
        else:
            parts += ['## Kit integration\n\nRead lib/API.md in this kit. Load lib/harness.js and lib/sound.js before scene code, '
                      'using relative URLs valid from the page location. For a model without filesystem access, '
                      'regenerate this prompt with --inline-lib.']
        parts += ['## Required handoff\n\nReturn the page source, the cue/shot plan, exact render and verification commands, '
                  'asset/font requirements, observed test results and any unresolved questions. '
                  'Keep source media and rendered deliverables in the production folder, separate from code. '
                  'Do not claim checks ran unless their outputs were inspected.']
        result = '\n\n---\n\n'.join(parts) + '\n'
        if args.out:
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(result, encoding='utf-8')
        else:
            sys.stdout.write(result)
    except (OSError, UnicodeError) as exc:
        parser.exit(2, f'build-prompt: {exc}\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
