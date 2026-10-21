#!/bin/sh
# Generates the synthetic demo video: six 8-second scenes of flat colour,
# simple shapes and on-screen titles, plus a running timecode. No external
# media is used. Requires ffmpeg built with libx264 and libfreetype.
#
#   sh scripts/generate-demo-media.sh
#
# FONT can point at any TrueType/OpenType font; the default is a macOS
# system font.
set -eu

FFMPEG="${FFMPEG:-ffmpeg}"
FONT="${FONT:-/System/Library/Fonts/Helvetica.ttc}"
OUT="${OUT:-demo/public/media/demo.mp4}"
W=960
H=540

bg() { # colour start end
  printf "drawbox=x=0:y=0:w=iw:h=ih:color=%s:t=fill:enable='between(t,%s,%s)'," "$1" "$2" "$3"
}
box() { # x y w h colour start end
  printf "drawbox=x=%s:y=%s:w=%s:h=%s:color=%s:t=fill:enable='between(t,%s,%s)'," "$1" "$2" "$3" "$4" "$5" "$6" "$7"
}
title() { # text size y start end
  printf "drawtext=fontfile='%s':text='%s':fontsize=%s:fontcolor=white:x=(w-text_w)/2:y=%s:enable='between(t,%s,%s)'," "$FONT" "$1" "$2" "$3" "$4" "$5"
}

FILTER=""
# 1. Intro (0-8)
FILTER="$FILTER$(bg 0x1d2440 0 8)"
FILTER="$FILTER$(box 430 150 100 100 0xe0e4f5 0 8)"
FILTER="$FILTER$(title '0-0 demo' 64 290 0 8)"
FILTER="$FILTER$(title 'A short tour of colour and shape' 30 375 0 8)"
# 2. Red square (8-16)
FILTER="$FILTER$(bg 0xc0392b 8 16)"
FILTER="$FILTER$(box 380 130 200 200 white 8 16)"
FILTER="$FILTER$(title 'Red - the square' 40 390 8 16)"
# 3. Blue stripes (16-24)
FILTER="$FILTER$(bg 0x2457c5 16 24)"
for i in 0 1 2 3 4; do
  FILTER="$FILTER$(box $((240 + i * 100)) 110 50 240 0xdfe8ff 16 24)"
done
FILTER="$FILTER$(title 'Blue - stripes and rhythm' 40 390 16 24)"
# 4. Green grid (24-32)
FILTER="$FILTER$(bg 0x1e8449 24 32)"
for r in 0 1 2; do
  for c in 0 1 2 3; do
    FILTER="$FILTER$(box $((300 + c * 95)) $((90 + r * 95)) 75 75 0xd5f5e3 24 32)"
  done
done
FILTER="$FILTER$(title 'Green - a grid of tiles' 40 390 24 32)"
# 5. Mixing (32-40): three overlapping translucent squares
FILTER="$FILTER$(bg 0x202020 32 40)"
FILTER="$FILTER$(box 330 110 190 190 0xe74c3c@0.75 32 40)"
FILTER="$FILTER$(box 440 110 190 190 0x3498db@0.75 32 40)"
FILTER="$FILTER$(box 385 200 190 190 0x2ecc71@0.75 32 40)"
FILTER="$FILTER$(title 'Mixing - where colours overlap' 40 420 32 40)"
# 6. Outro (40-48)
FILTER="$FILTER$(bg 0x1d2440 40 48)"
FILTER="$FILTER$(title 'Thanks for watching' 56 220 40 48)"
FILTER="$FILTER$(title 'Synthetic demo media - generated with ffmpeg' 26 310 40 48)"
# Timecode on every frame.
FILTER="${FILTER}drawtext=fontfile='$FONT':text='%{pts\\:hms}':fontsize=22:fontcolor=white@0.85:box=1:boxcolor=black@0.4:boxborderw=6:x=16:y=16"

mkdir -p "$(dirname "$OUT")"
"$FFMPEG" -hide_banner -loglevel error -y \
  -f lavfi -i "color=c=black:s=${W}x${H}:r=24:d=48" \
  -vf "$FILTER" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 28 \
  -g 48 -movflags +faststart -an "$OUT"

ls -l "$OUT"
