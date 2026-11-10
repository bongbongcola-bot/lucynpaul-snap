#!/bin/bash
# 원본 사진을 웹용으로 줄인다 (macOS 기본 도구 sips 사용, 설치 필요 없음)
#
# 사용법: scripts/optimize-images.sh <원본 폴더>
#   원본 폴더의 jpg를 이름순으로 dol-01.jpg, dol-02.jpg ... 로 바꿔
#   assets/images/dol-snap/full  (긴 변 1350px, 확대 보기용. 인스타그램 원본 크기라 키우지 않음)
#   assets/images/dol-snap/thumb (긴 변 900px, 격자용) 에 저장한다.
set -euo pipefail

SRC="${1:?원본 폴더를 지정하세요}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/images/dol-snap"
mkdir -p "$OUT/full" "$OUT/thumb"

n=0
while IFS= read -r -d '' file; do
  n=$((n + 1))
  name=$(printf "dol-%02d.jpg" "$n")
  sips -s format jpeg -s formatOptions 82 -Z 1350 "$file" --out "$OUT/full/$name" >/dev/null
  sips -s format jpeg -s formatOptions 78 -Z 900 "$file" --out "$OUT/thumb/$name" >/dev/null
  echo "$name <- $(basename "$file")"
done < <(find "$SRC" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 | sort -z)

echo "완료: ${n}장"
