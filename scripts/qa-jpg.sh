#!/usr/bin/env bash
# qa-jpg.sh <faza> <png...> — pretvara odabrane screenshotove u JPG (≤ 300 KB) za commit.
set -euo pipefail
faza="$1"; shift
for f in "$@"; do
  out="qa/faza-${faza}/$(basename "${f%.png}").jpg"
  q=78; w=1600
  while :; do
    sips -s format jpeg -s formatOptions "$q" --resampleWidth "$w" "$f" --out "$out" >/dev/null 2>&1 || sips -s format jpeg -s formatOptions "$q" "$f" --out "$out" >/dev/null
    size=$(stat -f%z "$out")
    if [ "$size" -le 300000 ] || [ "$q" -le 40 ]; then break; fi
    q=$((q - 8)); w=$((w - 200))
  done
  echo "$out $((size / 1024)) KB"
done
