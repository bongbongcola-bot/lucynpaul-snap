# lucynpaul-snap

루시앤폴스냅 돌스냅 포트폴리오 사이트. 순수 HTML/CSS/JS, 빌드 도구 없음.

## 실행과 배포

- 로컬: `python3 -m http.server 8000` 후 http://localhost:8000
- 배포: `main`에 푸시하면 GitHub Pages(https://bongbongcola-bot.github.io/lucynpaul-snap/)에 1~2분 뒤 반영된다. `gh api repos/bongbongcola-bot/lucynpaul-snap/pages/builds/latest`로 빌드 상태를 확인한다.
- 테스트 도구는 없다. 바꾼 페이지를 브라우저에서 PC(1440px)와 모바일(390px)로 열어 확인한다.

## 먼저 읽을 것

- `docs/HANDOFF.md`: 지금까지 한 일, 다음 할 일, 결정해 둔 것
- `CLAUDE.local.md`: 계정, 예약 시트·캘린더 주소, 마이박스 위치 등 비공개 메모 (로컬에만 있음)

## 규칙

- 페이지마다 헤더와 푸터 마크업이 복제되어 있다. 메뉴를 바꾸면 HTML 6개를 모두 고친다.
- 갤러리 사진은 `js/gallery-data.js`가 유일한 목록이다. `fetch`를 쓰지 않아 파일을 직접 열어도 동작한다.
- 사진은 사진 안에 서명(Lucy & Paul 로고나 문구)이 있는 4:5 세로 사진만 쓴다. 격자가 4:5로 잘라 보여 주므로 다른 비율은 서명이 잘린다.
- 원본 사진·영상은 `_work/`에 두며 저장소에 올리지 않는다.
- 사진 원본 출처: 네이버 마이박스 `인스타그램`, `InstarGram` 폴더.
- 상품은 앨범세트·싱글앨범·데이터 3개이며 예약 신청서 선택지와 같아야 한다. 가격은 사이트에 쓰지 않는다.
- 데이터 상품의 스케치 영상은 초상권 활용 동의 시에만 포함된다.
- 예약은 구글 폼·시트·캘린더(lucynpaulsnap 계정)와 Apps Script 트리거로 처리한다. 코드는 `scripts/google/reservation-setup.gs`, 업무 흐름은 `docs/reservation-workflow.md`.
- 공개 저장소이므로 커밋 메시지와 파일에 고객·아이 이름, 연락처, 계좌번호를 넣지 않는다.
