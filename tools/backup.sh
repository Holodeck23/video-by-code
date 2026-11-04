#!/usr/bin/env bash
# Preserve history for a local-only checkout. Destination supplied explicitly.
# Usage: bash tools/backup.sh /absolute/backup/directory
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
dest=${1:?Supply an absolute backup directory outside the checkout and brain/vault evidence folders}
[[ "$dest" == /* ]] || { echo 'Backup destination must be absolute' >&2; exit 2; }
case "$dest/" in "$repo/"*|/Users/Shared/second-brain/*|/Users/zod/vault/*) echo 'Choose a code-backup location outside this repo and the brain/vault' >&2; exit 2;; esac
mkdir -p "$dest"
commit=$(git -C "$repo" rev-parse --short HEAD)
target="$dest/video-by-code-$commit.bundle"
git -C "$repo" bundle create "$target" --all
git -C "$repo" bundle verify "$target"
echo "Source history: $target"
