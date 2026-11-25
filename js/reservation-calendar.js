// 예약 마감 달력: Apps Script 웹 앱(doGet)에서 마감 날짜·시간대를 받아 월 달력으로 그린다.
// 데이터 원본은 구글 캘린더 '루시앤폴스냅 촬영 일정'이고, 코드는 scripts/google/reservation-setup.gs에 있다.

(function () {
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbzUiwJfOL2mN7eGveF-eEUKd4GeXL9k0KlRXrbgXzvzQdIDBBZTcePpapBq4QHnRJU/exec";
  const KAKAO_URL = "https://pf.kakao.com/_xgerAG/chat";
  const MONTHS_AHEAD = 12;
  const SLOT_LABEL = { am: "오전", pm: "오후" };
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  const root = document.getElementById("busy-calendar");
  if (!root) return;

  const pad = (n) => String(n).padStart(2, "0");
  const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // 방문자 기기 시간대와 상관없이 한국 날짜를 오늘로 본다.
  const todayParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date()).split("-").map(Number);
  const today = key(todayParts[0], todayParts[1] - 1, todayParts[2]);
  const first = { y: todayParts[0], m: todayParts[1] - 1 };
  let offset = 0;
  let busy = new Map();

  root.innerHTML = '<p class="bcal__status">예약 일정을 불러오는 중이에요…</p>';

  fetch(ENDPOINT)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((data) => {
      busy = new Map();
      data.busy.forEach(({ date, slot }) => {
        if (!busy.has(date)) busy.set(date, new Set());
        busy.get(date).add(slot);
      });
      render();
    })
    .catch(() => {
      root.innerHTML =
        '<p class="bcal__status">예약 일정을 불러오지 못했어요. ' +
        `<a href="${KAKAO_URL}" target="_blank" rel="noopener">카카오톡으로 문의</a>해 주세요.</p>`;
    });

  function render() {
    const y = first.y + Math.floor((first.m + offset) / 12);
    const m = (first.m + offset) % 12;
    const startDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();

    let cells = "";
    for (let i = 0; i < startDay; i++) cells += '<div class="bcal__day is-empty"></div>';
    for (let d = 1; d <= days; d++) {
      const k = key(y, m, d);
      const slots = busy.get(k) || new Set();
      const classes = ["bcal__day"];
      if (k < today) classes.push("is-past");
      if (k === today) classes.push("is-today");
      const chips = ["am", "pm"].filter((s) => slots.has(s))
        .map((s) => `<span class="bcal__chip bcal__chip--${s}">${SLOT_LABEL[s]}<span class="bcal__chip-suffix"> 마감</span></span>`)
        .join("");
      cells += `<div class="${classes.join(" ")}"><span class="bcal__num">${d}</span>${chips}</div>`;
    }

    root.innerHTML = `
      <div class="bcal__head">
        <button class="bcal__nav" type="button" data-step="-1" aria-label="이전 달" ${offset === 0 ? "disabled" : ""}>&#8249;</button>
        <p class="bcal__title" aria-live="polite">${y}년 ${m + 1}월</p>
        <button class="bcal__nav" type="button" data-step="1" aria-label="다음 달" ${offset === MONTHS_AHEAD ? "disabled" : ""}>&#8250;</button>
      </div>
      <div class="bcal__grid">
        ${WEEKDAYS.map((w) => `<div class="bcal__weekday">${w}</div>`).join("")}
        ${cells}
      </div>
      <div class="bcal__legend">
        <span><i class="bcal__swatch bcal__chip--am"></i>오전 마감 (10:00~14:00)</span>
        <span><i class="bcal__swatch bcal__chip--pm"></i>오후 마감 (15:00~20:00)</span>
      </div>`;
  }

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".bcal__nav");
    if (!btn || btn.disabled) return;
    offset = Math.min(MONTHS_AHEAD, Math.max(0, offset + Number(btn.dataset.step)));
    render();
  });
})();
