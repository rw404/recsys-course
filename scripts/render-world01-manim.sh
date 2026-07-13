#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIM_BIN="${MANIM_BIN:-manim}"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"
MEDIA_DIR="${ROOT_DIR}/.manim-media"
OUTPUT_DIR="${ROOT_DIR}/public/video/manim/world01"

"${MANIM_BIN}" \
  --resolution 1920,888 \
  --fps 30 \
  --format mp4 \
  --media_dir "${MEDIA_DIR}" \
  --disable_caching \
  "${ROOT_DIR}/scripts/manim/world01_signals.py" \
  -a

mkdir -p "${OUTPUT_DIR}"
find "${MEDIA_DIR}/videos/world01_signals/888p30" -maxdepth 1 -name 'W01_*.mp4' -exec cp {} "${OUTPUT_DIR}/" \;

for video in "${OUTPUT_DIR}"/W01_*.mp4; do
  "${FFMPEG_BIN}" \
    -loglevel error \
    -y \
    -i "${video}" \
    -an \
    -c:v libvpx-vp9 \
    -crf 27 \
    -b:v 0 \
    -deadline good \
    -cpu-used 2 \
    -row-mt 1 \
    "${video%.mp4}.webm"
done

printf 'Rendered World 01 Manim clips to %s\n' "${OUTPUT_DIR}"
