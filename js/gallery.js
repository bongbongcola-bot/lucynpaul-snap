// 사진 격자 그리기: js/gallery-data.js의 GALLERY_PHOTOS를 읽어 화면에 넣는다
//
// <div class="gallery" data-gallery>                  전체 사진
// <div class="gallery" data-gallery data-featured>    featured: true인 사진만 (메인 페이지)
// <div class="filters" data-gallery-filters>          장소 필터 버튼을 만들 자리

(function () {
  const IMAGE_DIR = "assets/images/dol-snap";
  const photos = window.GALLERY_PHOTOS || [];

  function toItem(photo) {
    return {
      src: `${IMAGE_DIR}/full/${photo.file}`,
      thumb: `${IMAGE_DIR}/thumb/${photo.file}`,
      alt: photo.alt || "루시앤폴스냅 돌스냅",
      place: photo.place || "",
    };
  }

  function createTile(item, onOpen) {
    const li = document.createElement("li");
    li.className = "gallery__item";
    li.dataset.place = item.place;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery__button";
    button.setAttribute("aria-label", `${item.place ? item.place + " " : ""}사진 크게 보기`);
    button.addEventListener("click", onOpen);

    const img = document.createElement("img");
    img.className = "gallery__img";
    img.src = item.thumb;
    img.alt = item.alt;
    img.loading = "lazy";
    img.decoding = "async";

    button.appendChild(img);
    li.appendChild(button);

    if (item.place) {
      const place = document.createElement("span");
      place.className = "gallery__place";
      place.textContent = item.place;
      li.appendChild(place);
    }
    return li;
  }

  // 화면에 들어온 사진만 서서히 나타나게 한다
  const revealer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -40px 0px" })
    : null;

  function reveal(el) {
    if (revealer) revealer.observe(el);
    else el.classList.add("is-visible");
  }

  function renderGallery(container) {
    const source = "featured" in container.dataset ? photos.filter((p) => p.featured) : photos;
    const items = source.map(toItem);

    if (!items.length) {
      container.outerHTML = '<p class="gallery-empty">사진을 준비하고 있습니다.</p>';
      return;
    }

    container.setAttribute("role", "list");
    const tiles = items.map((item) => {
      const tile = createTile(item, () => {
        // 필터로 숨긴 사진은 확대 보기 넘김에서도 뺀다
        const visible = tiles.filter((t) => !t.hidden);
        Lightbox.open(visible.map((t) => t._item), visible.indexOf(tile));
      });
      tile._item = item;
      tile.setAttribute("role", "listitem");
      container.appendChild(tile);
      reveal(tile);
      return tile;
    });

    const filterBox = document.querySelector("[data-gallery-filters]");
    if (filterBox) renderFilters(filterBox, tiles);
  }

  function renderFilters(box, tiles) {
    const places = [...new Set(tiles.map((t) => t.dataset.place).filter(Boolean))];
    if (places.length < 2) return;

    const buttons = ["전체", ...places].map((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filters__btn";
      btn.textContent = label;
      btn.setAttribute("aria-pressed", String(label === "전체"));
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        tiles.forEach((tile) => {
          tile.hidden = label !== "전체" && tile.dataset.place !== label;
          if (!tile.hidden) tile.classList.add("is-visible");
        });
      });
      box.appendChild(btn);
      return btn;
    });
  }

  document.querySelectorAll("[data-gallery]").forEach(renderGallery);
})();
