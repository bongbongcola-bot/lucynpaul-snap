# 루시앤폴스냅 포트폴리오 (LucynPaulSnap)

돌스냅 포트폴리오 웹사이트입니다. HTML, CSS, JavaScript로만 만들었고 빌드 도구가 없습니다.

## 실행

`index.html`을 브라우저로 열면 됩니다. 로컬 서버로 보려면 아래 명령을 씁니다.

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 페이지

| 파일 | 내용 |
| --- | --- |
| `index.html` | 메인: 상단 영상, 소개, 대표작, 촬영 특징, 함께한 장소, 문의 |
| `dol-snap.html` | 돌스냅 갤러리: 장소별 필터, 사진 확대 보기 |
| `about.html` | 작가 소개 |
| `contact.html` | 문의: 카카오톡 채널, 전화, 인스타그램, 블로그 |
| `reservation.html` | 예약: 절차, 예약 마감 달력, 신청서 링크, 변경·취소·환불 규정 |
| `products.html` | 상품 안내: 앨범세트·싱글앨범·데이터 구성, 비교표, 추가 상품, 할인, 촬영·보정 안내 (가격은 상담 시 안내) |

## 폴더 구조

```
css/
  base.css        색, 글꼴, 초기화
  layout.css      헤더, 메뉴, 섹션, 푸터, 모바일 메뉴
  components.css  버튼, 상단 영상, 소개, 문의 카드
  gallery.css     사진 격자, 필터, 확대 보기
js/
  gallery-data.js 갤러리 사진 목록 (사진을 바꿀 때 이 파일만 고치면 됨)
  gallery.js      사진 격자와 장소 필터 그리기
  lightbox.js     사진 확대 보기 (키보드, 스와이프)
  nav.js          모바일 메뉴
  video.js        상단 영상 재생/일시정지
assets/
  images/dol-snap/full   확대 보기용 사진 (1080x1350)
  images/dol-snap/thumb  격자용 사진 (720x900)
  images/products/       상품 사진 (기존 홈페이지 상품 이미지)
  video/hero.mp4         메인 상단 영상
scripts/
  optimize-images.sh     원본 사진을 웹용으로 줄이기
  make-hero-video.sh     상단 영상 만들기
  montage-video.swift    여러 영상 구간을 페이드로 이어 붙이기
  google/reservation-setup.gs  예약 신청서·접수 시트·마감 달력을 만드는 Apps Script
docs/
  reservation-workflow.md      예약 업무 흐름과 카카오톡 안내 문구
```

## 사진 바꾸기

1. 원본 사진(4:5 세로, 서명 포함)을 한 폴더에 모읍니다.
2. `scripts/optimize-images.sh <폴더>`를 실행하면 `dol-01.jpg`부터 차례로 저장됩니다.
3. `js/gallery-data.js`에 사진마다 한 줄씩 적습니다. `featured: true`를 붙이면 메인 페이지에도 나옵니다.

## 예약 접수 구조

사이트는 정적 페이지라서 예약 데이터는 lucynpaulsnap 구글 계정에 둡니다.

- 신청서(구글 폼) → 응답 시트 '루시앤폴스냅 예약 접수'에 자동 기록, 작가 메일로 알림
- 시트 '상태'를 **확정**으로 바꾸면 공개 달력 '루시앤폴스냅 촬영 일정'에 '예약 마감'이 자동 표시
- 상태를 **취소**로 바꾸면 그 날짜에 다른 확정 예약이 없을 때 마감 표시가 지워짐
- 달력에는 고객 정보를 넣지 않습니다.

## 사용한 외부 자원

- 글꼴: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond), [Noto Serif KR](https://fonts.google.com/noto/specimen/Noto+Serif+KR) (Google Fonts, OFL), [Pretendard](https://github.com/orioncactus/pretendard) (OFL)
- 사진과 영상의 저작권은 루시앤폴스냅에 있습니다. 무단 사용을 금합니다.
