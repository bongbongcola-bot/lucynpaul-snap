#!/bin/bash
# 메인 상단 영상을 만든다 (macOS 기본 도구만 사용, 설치 필요 없음)
#
# 사용법: scripts/make-hero-video.sh <원본 영상> [시작 초] [길이 초]
#   예: scripts/make-hero-video.sh sketch.mp4 64 26
#   결과: assets/video/hero.mp4 (1280x720, 2Mbps, 소리 없음, 약 6MB)
#   avconvert 기본 프리셋은 같은 길이에 15~24MB가 나와서 비트레이트를 직접 정한다.
set -euo pipefail

SRC="${1:?원본 영상을 지정하세요}"
START="${2:-0}"
DURATION="${3:-26}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/assets/video"

swift "$ROOT/scripts/encode-video.swift" "$SRC" "$ROOT/assets/video/hero.mp4" "$START" "$DURATION" 1280 2000000
ls -lh "$ROOT/assets/video/hero.mp4"
echo "첫 화면 정지 이미지(assets/images/hero-poster.jpg)는 영상 첫 장면을 캡처해 직접 바꿔 주세요."
