#!/usr/bin/env bash
# Generate a batch of scene plates through Codex's image tool while holding one character/style reference.
#   bash tools/render/codex-imagegen.sh SHOTS.txt OUTDIR REF.png [PARALLEL] [STYLE_PROMPT]
#
# SHOTS.txt: one shot per line, "name|scene description".
# Existing OUTDIR/name.png files are skipped so interrupted batches are safe to rerun.
# Note: The prompt MUST precede `-i "$ref"`, otherwise `-i` consumes the prompt argument.
set -uo pipefail

shots=${1:?Usage: codex-imagegen.sh SHOTS.txt OUTDIR REF.png [PARALLEL] [STYLE_PROMPT]}
out=${2:?Supply an output directory}
ref=${3:?Supply a reference PNG path}
par=${4:-4}
default_style="Use the attached image as the reference for the recurring character and the art style: identical character design, same illustration style, line weight and shading. 16:9 landscape, 1536x1024 or wider. No text, no captions, no letters, no watermark."
style=${5:-$default_style}

mkdir -p "$out"

gen() {
  local name=$1 scene=$2
  [[ -s "$out/$name.png" ]] && { echo "skip $name"; return; }
  ( cd "$out" && codex exec --skip-git-repo-check --sandbox workspace-write \
      "Use your image generation tool to create ONE image. $style Scene: $scene Save the PNG in the current directory as $name.png and print its path." \
      -i "$ref" </dev/null >"$name.log" 2>&1 )
  [[ -s "$out/$name.png" ]] && { echo "ok   $name"; rm -f "$out/$name.log"; } || echo "FAIL $name (see $out/$name.log)"
}

while IFS='|' read -r name scene; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  gen "$name" "$scene" &
  while [[ "$(jobs -rp | wc -l)" -ge "$par" ]]; do sleep 2; done
done <"$shots"
wait
