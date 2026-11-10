// 사진 확대 보기: 이전/다음, 키보드(←, →, Esc), 모바일 좌우 스와이프

window.Lightbox = (function () {
  const ICONS = {
    close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8"/></svg>',
  };

  let root, img, caption, count;
  let items = [];
  let index = 0;
  let returnFocus = null;
  let touchStartX = null;

  function build() {
    root = document.createElement("div");
    root.className = "lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "사진 크게 보기");
    root.innerHTML = `
      <p class="lightbox__count" aria-live="polite"></p>
      <figure class="lightbox__figure">
        <img class="lightbox__img" alt="">
        <figcaption class="lightbox__caption"></figcaption>
      </figure>
      <button class="lightbox__btn lightbox__prev" type="button" aria-label="이전 사진">${ICONS.prev}</button>
      <button class="lightbox__btn lightbox__next" type="button" aria-label="다음 사진">${ICONS.next}</button>
      <button class="lightbox__btn lightbox__close" type="button" aria-label="닫기">${ICONS.close}</button>`;
    document.body.appendChild(root);

    img = root.querySelector(".lightbox__img");
    caption = root.querySelector(".lightbox__caption");
    count = root.querySelector(".lightbox__count");

    root.querySelector(".lightbox__close").addEventListener("click", close);
    root.querySelector(".lightbox__prev").addEventListener("click", () => show(index - 1));
    root.querySelector(".lightbox__next").addEventListener("click", () => show(index + 1));

    // 사진 바깥 어두운 영역을 누르면 닫는다
    root.addEventListener("click", (event) => {
      if (event.target === root || event.target.classList.contains("lightbox__figure")) close();
    });

    root.addEventListener("touchstart", (event) => {
      touchStartX = event.touches[0].clientX;
    }, { passive: true });

    root.addEventListener("touchend", (event) => {
      if (touchStartX === null) return;
      const dx = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });

    document.addEventListener("keydown", onKey);
  }

  function onKey(event) {
    if (!root.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft") show(index - 1);
    else if (event.key === "ArrowRight") show(index + 1);
    else if (event.key === "Tab") trapFocus(event);
  }

  function trapFocus(event) {
    const buttons = [...root.querySelectorAll("button")];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function show(next) {
    index = (next + items.length) % items.length;
    const item = items[index];
    img.src = item.src;
    img.alt = item.alt;
    caption.textContent = item.place || "";
    count.textContent = `${index + 1} / ${items.length}`;

    // 다음 사진을 미리 받아 넘김을 빠르게 한다
    const nextItem = items[(index + 1) % items.length];
    if (nextItem) new Image().src = nextItem.src;
  }

  function open(list, startIndex) {
    if (!root) build();
    items = list;
    returnFocus = document.activeElement;
    show(startIndex);
    root.classList.add("is-open");
    document.body.style.overflow = "hidden";
    root.querySelector(".lightbox__close").focus();
  }

  function close() {
    root.classList.remove("is-open");
    document.body.style.overflow = "";
    if (returnFocus) returnFocus.focus();
  }

  return { open };
})();
