// 메인 상단 영상: 재생/일시정지 버튼, 동작 줄이기 설정 존중

(function () {
  const video = document.querySelector(".hero__video");
  const button = document.querySelector(".hero__control");
  if (!video || !button) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function render() {
    const paused = video.paused;
    button.textContent = paused ? "▶" : "❚❚";
    button.setAttribute("aria-label", paused ? "영상 재생" : "영상 일시정지");
  }

  if (reduceMotion) {
    video.removeAttribute("autoplay");
    video.pause();
  } else {
    // 일부 모바일 브라우저는 autoplay 속성만으로 시작하지 않아 한 번 더 요청한다
    video.play().catch(() => {});
  }

  button.addEventListener("click", () => {
    if (video.paused) video.play();
    else video.pause();
  });

  video.addEventListener("play", render);
  video.addEventListener("pause", render);
  render();
})();
