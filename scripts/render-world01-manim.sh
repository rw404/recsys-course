#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIM_BIN="${MANIM_BIN:-manim}"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"
MEDIA_DIR="${ROOT_DIR}/.manim-media"
SOURCE_DIR="${MEDIA_DIR}/videos/world01_signals/888p30"

"${MANIM_BIN}" \
  --resolution 1920,888 \
  --fps 30 \
  --format mp4 \
  --media_dir "${MEDIA_DIR}" \
  --disable_caching \
  "${ROOT_DIR}/scripts/manim/world01_signals.py" \
  -a

shopt -s nullglob
videos=("${SOURCE_DIR}"/W01_*.mp4)
if (( ${#videos[@]} == 0 )); then
  printf 'No rendered clips found in %s\n' "${SOURCE_DIR}" >&2
  exit 1
fi

for source in "${videos[@]}"; do
  filename="$(basename "${source}")"
  concept_index="${filename#W01_}"
  concept_index="${concept_index%%_*}"
  concept_directories=("${ROOT_DIR}/content/theory/world01/${concept_index}-"*)
  if (( ${#concept_directories[@]} != 1 )); then
    printf 'Expected one concept folder for index %s, found %s\n' "${concept_index}" "${#concept_directories[@]}" >&2
    exit 1
  fi
  target="${concept_directories[0]}"
  cp "${source}" "${target}/screen.mp4"
  "${FFMPEG_BIN}" \
    -loglevel error \
    -y \
    -i "${target}/screen.mp4" \
    -an \
    -c:v libvpx-vp9 \
    -crf 27 \
    -b:v 0 \
    -deadline good \
    -cpu-used 2 \
    -row-mt 1 \
    "${target}/screen.webm"
done

node "${ROOT_DIR}/scripts/build-theory-content.mjs"
printf 'Rendered %s World 01 Manim clips into repository concept folders\n' "${#videos[@]}"
