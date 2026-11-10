/*
 * 디랩 코딩 페스티벌 화면 스크립트.
 * 위 FESTIVAL 만 고치면 날짜·예약 링크가 바뀐다. reserveUrl 이 비어 있으면 큰 예약 단추는 "곧 열려요" 상태로 둔다.
 */
const FESTIVAL = {
  date: "11/28(토)",   // 오전 10시는 화면 문구에 들어 있다
  reserveUrl: "https://forms.gle/8bHkkiPaHuo6ct6r7",   // 예약 신청 구글폼 (응답 주소)
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 날짜·예약 단추 ---------- */
document.querySelectorAll('[data-fest="date"]').forEach((el) => { el.textContent = FESTIVAL.date; });
document.querySelectorAll("[data-reserve]").forEach((btn) => {
  if (FESTIVAL.reserveUrl) {
    btn.href = FESTIVAL.reserveUrl;
    btn.target = "_blank";
    btn.rel = "noopener";
  } else if (btn.closest(".reserve")) {
    btn.textContent = "예약이 곧 열려요";
    btn.setAttribute("aria-disabled", "true");
    btn.removeAttribute("href");
  }
});
const reserveNote = document.querySelector("[data-reserve-note]");
if (FESTIVAL.reserveUrl && reserveNote) reserveNote.textContent = "신청서는 새 창에서 열려요. 원하는 회차가 마감되었다면 대기 접수를 남겨 주세요.";

/* ---------- 시간표 자리: 0자리면 대기 접수로 안내 ---------- */
document.querySelectorAll("[data-seats]").forEach((cell) => {
  const total = 4;
  const left = Number(cell.dataset.seats);
  const seats = Array.from({ length: total }, (_, i) => `<span class="seat${i >= left ? " is-taken" : ""}"></span>`).join("");
  let label = "예약 전";
  if (FESTIVAL.reserveUrl) label = left > 0 ? `${left}자리 남음` : "마감 · 대기 접수";
  const full = FESTIVAL.reserveUrl && left === 0 ? " seats--full" : "";
  cell.innerHTML = `<span class="seats${full}" aria-label="${label}">${seats}<span class="seats__count">${label}</span></span>`;
});

/* ---------- 모바일 탭 ---------- */
const selectTab = (tabs, index) => {
  [...tabs.children].forEach((b, i) => b.setAttribute("aria-selected", String(i === index)));
};

// 체험 소개: 탭을 누르면 카드로 넘어가고, 카드를 옆으로 밀면 탭이 따라온다
const labTabs = document.querySelector('[data-tabs="labs"]');
const labTrack = document.querySelector(".labs__track");
const labCards = [...labTrack.querySelectorAll(".lab")];
labTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const index = [...labTabs.children].indexOf(btn);
  selectTab(labTabs, index);
  labTrack.scrollTo({ left: labCards[index].offsetLeft - labTrack.offsetLeft - parseFloat(getComputedStyle(labTrack).paddingLeft), behavior: reduceMotion ? "auto" : "smooth" });
  // 카드 아래쪽을 읽던 중이면 카드 머리로 올려 준다
  const top = labTrack.getBoundingClientRect().top;
  const stickyBottom = labTabs.getBoundingClientRect().bottom;
  if (top < stickyBottom - 1) window.scrollBy({ top: top - stickyBottom, behavior: reduceMotion ? "auto" : "smooth" });
});
let labScrollTimer;
labTrack.addEventListener("scroll", () => {
  clearTimeout(labScrollTimer);
  labScrollTimer = setTimeout(() => {
    const center = labTrack.scrollLeft + labTrack.clientWidth / 2;
    let nearest = 0;
    labCards.forEach((card, i) => {
      if (Math.abs(card.offsetLeft - labTrack.offsetLeft + card.offsetWidth / 2 - center) < Math.abs(labCards[nearest].offsetLeft - labTrack.offsetLeft + labCards[nearest].offsetWidth / 2 - center)) nearest = i;
    });
    selectTab(labTabs, nearest);
  }, 80);
}, { passive: true });

// 시간표: 탭을 누르면 그 체험의 네 회차만 보인다
const scheduleTabs = document.querySelector('[data-tabs="schedule"]');
const servers = document.querySelector(".servers");
scheduleTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const index = [...scheduleTabs.children].indexOf(btn);
  selectTab(scheduleTabs, index);
  servers.dataset.lab = String(index + 1);
});

/* ---------- 이니셜 키캡 ---------- */
const initials = document.getElementById("initials");
const keycapText = document.getElementById("keycap-text");
initials.addEventListener("input", () => {
  const v = initials.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  initials.value = v;
  keycapText.textContent = v || "JK";
  if (!reduceMotion && window.gsap) gsap.fromTo(".keycap--name", { y: -12 }, { y: 0, duration: 0.4, ease: "bounce.out" });
});

/* ---------- 체험 그림: SVG 를 문서 안에 넣어 페이지 글꼴을 쓰게 (실패하면 img 그대로) ---------- */
document.querySelectorAll("[data-svg]").forEach(async (box) => {
  try {
    const res = await fetch(box.dataset.svg);
    if (!res.ok) return;
    const text = await res.text();
    if (text.trim().startsWith("<svg")) box.innerHTML = text;
  } catch { /* file:// 로 열면 img 로 둔다 */ }
});

/* ---------- 다섯 단계: 화면에 들어오면 01 → 05 순서로 오렌지가 채워진다 ---------- */
const steps = [...document.querySelectorAll(".process li")];
const stepIo = new IntersectionObserver((entries) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  stepIo.disconnect();
  steps.forEach((li, i) => setTimeout(() => li.classList.add("is-on"), reduceMotion ? 0 : i * 220));
}, { threshold: 0.6 });
if (steps.length) stepIo.observe(steps[0].parentElement);

/* ---------- 움직임 ---------- */
// GSAP 를 못 불러왔으면 <head> 에서 숨겨 둔 챕터 머리 선을 다시 보이게 한다
if (!window.gsap || !window.ScrollTrigger) document.documentElement.classList.remove("js-motion");

if (window.gsap && window.ScrollTrigger && !reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);

  // 첫 화면: 헤드라인이 한 줄씩, 일정표가 한 행씩 올라온다
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from(".hero .eyebrow", { opacity: 0, y: 12, duration: 0.4 })
    .from(".hero__line", { opacity: 0, y: 28, duration: 0.6, stagger: 0.12 }, "-=0.2")
    .from([".hero__lead", ".hero__cta"], { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, "-=0.3")
    .from(".sheet > div", { opacity: 0, x: 24, duration: 0.4, stagger: 0.06 }, 0.3)
    .from(".hero__free", { opacity: 0, duration: 0.4 }, "-=0.1");

  // 챕터 전환 1: 챕터 머리 선이 그어지고, 제목과 내용이 화면에 들어오는 순서대로 한 번 올라온다
  document.querySelector(".hero .eyebrow").classList.add("is-in");
  ScrollTrigger.batch("main > section:not(.hero) .eyebrow", {
    start: "top 88%",
    once: true,
    onEnter: (els) => els.forEach((el) => el.classList.add("is-in")),
  });
  const reveal = [
    "main > section:not(.hero) .eyebrow", ".band .h2", ".labs .h2", ".band .lead",
    ".process li", ".keyline", ".paper-block .wrap > *", ".rows li",
    ".servers__head", ".servers__row", ".band .note",
    ".initials", ".keycaps", ".badges li",
    ".steps li", ".reserve__cta", ".faq",
    ".visit address", ".visit__tel", ".visit__links", ".map",
  ].join(", ");
  gsap.set(reveal, { opacity: 0, y: 28 });
  ScrollTrigger.batch(reveal, {
    start: "top 90%",
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, overwrite: true }),
  });

  // 챕터 전환 2: 밝은 구역은 경계에서 툭 바뀌지 않고, 들어올 때 어두운 색 → 밝은 색, 나갈 때 다시 어두운 색으로 물든다
  const DARK = { "--p-bg": "#171717", "--p-ink": "#ffffff", "--p-muted": "#9a9a9a", "--p-line": "#2e2e2e", "--p-card": "#242424" };
  const PAPER = { "--p-bg": "#fafaf8", "--p-ink": "#171717", "--p-muted": "#5c5c5c", "--p-line": "#e2e1dc", "--p-card": "#ffffff" };
  const paperZones = [
    { el: ".paper-block", enter: ["top 90%", "top 50%"], leave: ["bottom 30%", "bottom top"] },
    { el: ".band--paper", enter: ["top 85%", "top 35%"], leave: ["bottom 65%", "bottom 15%"] },
  ];
  paperZones.forEach(({ el, enter, leave }) => {
    gsap.fromTo(el, DARK, { ...PAPER, ease: "none", scrollTrigger: { trigger: el, start: enter[0], end: enter[1], scrub: true } });
    gsap.fromTo(el, PAPER, { ...DARK, ease: "none", immediateRender: false, scrollTrigger: { trigger: el, start: leave[0], end: leave[1], scrub: true } });
  });

  const mm = gsap.matchMedia();
  // 넓고 충분히 높은 화면: 세 가지 체험을 고정해 두고 옆으로 넘긴다 (style.css 의 세로 쌓기 조건과 반대)
  mm.add("(min-width: 921px) and (min-height: 700px)", () => {
    const track = document.querySelector(".labs__track");
    const distance = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".labs",
        start: "top top",
        end: () => `+=${distance()}`,
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  });

  // 키캡: 화면에 들어오면 스크롤에 맞춰 돌며 내려앉는다
  gsap.fromTo(".keycap", { rotateZ: -70, y: 90 }, {
    rotateZ: -28,
    y: 0,
    ease: "none",
    stagger: 0.1,
    scrollTrigger: { trigger: ".reward", start: "top bottom", end: "center center", scrub: true },
  });
}
