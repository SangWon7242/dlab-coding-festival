/*
 * 디랩 코딩 페스티벌 화면 스크립트.
 * 위 FESTIVAL 만 고치면 날짜·예약 링크가 바뀐다. reserveUrl 이 비어 있으면 큰 예약 단추는 "곧 열려요" 상태로 둔다.
 * 장면 넘김(GSAP ScrollTrigger)은 맨 아래. 움직임 줄이기 설정이거나 GSAP 를 못 불러오면 평범한 세로 페이지로 보인다.
 */
const FESTIVAL = {
  date: "11/28(토)",
  reserveUrl: "https://forms.gle/8bHkkiPaHuo6ct6r7",   // 예약 신청 구글폼 (응답 주소)
  // 회차별 남은 자리: docs/google-form/live-seats.gs 를 웹 앱으로 배포한 주소 (https://script.google.com/macros/s/…/exec)
  // 비어 있으면 표는 '곧 실시간으로 보여 드려요' 상태로 둔다
  seatsUrl: "https://script.google.com/macros/s/AKfycbyd-6LV4rzxUa7s4cTIAG4Y_QFMYWjBzfGutfIcH9s3VbKFaK9ykUcHUH6KI0WZN1pO/exec",
};
const ROUNDS = [{ no: 1, time: "10:00" }, { no: 2, time: "10:45" }, { no: 3, time: "11:30" }, { no: 4, time: "12:15" }];
const SEAT_CAP = 4;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 예약 단추 ---------- */
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
if (FESTIVAL.reserveUrl && reserveNote) reserveNote.textContent = "신청서는 새 창에서 열려요 · 마감되면 대기 접수로 안내해 드려요";

/* ---------- 회차별 남은 자리 ---------- */
const board = document.querySelector("[data-board]");
const seatStatus = document.querySelector("[data-seats-status]");
const seatSummary = document.querySelector("[data-seats-summary]");
// 표의 줄은 한 번만 만들고, 숫자만 바꾼다 (화면에 들어올 때 올라오는 움직임이 그대로 남도록)
ROUNDS.forEach((r) => {
  const row = document.createElement("div");
  row.className = "board__row";
  row.setAttribute("role", "row");
  row.innerHTML = `<span class="board__time" role="rowheader"><b>${r.no}회</b><span>${r.time}</span></span>` +
    [0, 1, 2].map(() => `<div class="cell is-wait" role="cell"><span class="cell__dots">${"<b></b>".repeat(SEAT_CAP)}</span><span class="cell__num">—</span></div>`).join("");
  board.appendChild(row);
});
const cells = [...board.querySelectorAll(".cell")];
const LAB_NAMES = ["아두이노", "레고 놀이기구", "AI 몬스터"];

function paintSeats(data) {
  ROUNDS.forEach((r, i) => {
    const round = data.rounds.find((x) => x.no === r.no);
    [0, 1, 2].forEach((j) => {
      const cell = cells[i * 3 + j];
      const cap = data.cap || SEAT_CAP;
      const left = Math.max(0, Math.min(cap, Number(round ? round.left[j] : cap)));
      cell.className = "cell" + (left === 0 ? " is-full" : left === 1 ? " is-low" : "");
      [...cell.querySelectorAll(".cell__dots b")].forEach((b, k) => b.classList.toggle("is-taken", k >= left));
      cell.querySelector(".cell__num").innerHTML = left === 0 ? "마감<small>대기 접수</small>" : `${left}<small>자리</small>`;
      cell.setAttribute("aria-label", `${r.no}회 ${r.time} ${LAB_NAMES[j]}: ${left === 0 ? "마감, 대기 접수 가능" : `${left}자리 남음`}`);
    });
  });
  const total = data.total || ROUNDS.length * 3 * SEAT_CAP;
  const time = new Date(data.updated || Date.now());
  const hhmm = time.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  seatStatus.textContent = `실시간 · ${hhmm} 기준 · 전체 ${total}자리 중 ${data.left}자리 남음`;
  if (seatSummary) seatSummary.innerHTML = data.left > 0 ? `지금 남은 자리 <b>${data.left}</b> / ${total}` : "전 회차 마감 · 대기 접수 중";
}

// 구글 앱스 스크립트 웹 앱은 다른 주소라서 JSONP(스크립트 태그)로 읽는다
function loadSeats() {
  if (!FESTIVAL.seatsUrl) {
    seatStatus.textContent = "남은 자리는 곧 여기에서 실시간으로 보여 드려요";
    return;
  }
  const cb = `__seats${Date.now()}`;
  const tag = document.createElement("script");
  const done = () => { delete window[cb]; tag.remove(); clearTimeout(timer); };
  const timer = setTimeout(() => { done(); if (seatStatus.textContent.startsWith("실시간 현황")) seatStatus.textContent = "현황을 불러오지 못했어요 · 예약 페이지에서 확인해 주세요"; }, 10000);
  window[cb] = (data) => { done(); if (data && Array.isArray(data.rounds)) paintSeats(data); };
  tag.src = `${FESTIVAL.seatsUrl}${FESTIVAL.seatsUrl.includes("?") ? "&" : "?"}callback=${cb}`;
  tag.onerror = () => { done(); seatStatus.textContent = "현황을 불러오지 못했어요 · 예약 페이지에서 확인해 주세요"; };
  document.head.appendChild(tag);
}
loadSeats();
setInterval(() => { if (!document.hidden) loadSeats(); }, 60000);
// 화면 확인용: 주소 끝에 ?seats=demo 를 붙이면 예시 숫자로 칠해 본다
if (new URLSearchParams(location.search).get("seats") === "demo") {
  paintSeats({ cap: 4, left: 29, total: 48, updated: new Date().toISOString(), rounds: [
    { no: 1, left: [0, 1, 2] }, { no: 2, left: [3, 0, 2] }, { no: 3, left: [4, 2, 1] }, { no: 4, left: [4, 4, 4] }] });
}

/* ---------- 체험 그림: SVG 를 문서 안에 넣어 페이지 글꼴을 쓰게 (실패하면 img 그대로) ---------- */
const svgLoads = [...document.querySelectorAll("[data-svg]")].map(async (box) => {
  try {
    const res = await fetch(box.dataset.svg);
    if (!res.ok) return;
    const text = await res.text();
    if (text.trim().startsWith("<svg")) box.innerHTML = text;
  } catch { /* file:// 로 열면 img 로 둔다 */ }
});

/* ---------- 이니셜 키캡: 이름 이니셜이 바뀌며 찍힌다 ---------- */
const keycapText = document.getElementById("keycap-text");
if (keycapText && !reduceMotion) {
  const names = ["JK", "SY", "MH", "DL", "YJ"];
  let n = 0;
  setInterval(() => {
    n = (n + 1) % names.length;
    const word = names[n];
    keycapText.textContent = "";
    [...word].forEach((ch, i) => setTimeout(() => { keycapText.textContent += ch; }, 160 * (i + 1)));
  }, 2400);
}

/* ---------- 움직임 ---------- */
if (!window.gsap || !window.ScrollTrigger) document.documentElement.classList.remove("js-motion");

if (window.gsap && window.ScrollTrigger && !reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // 맨 위 진행 막대
  gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* 장면 1: 첫 화면이 한 번에 쏟아져 들어온다 */
  const SPOTS = [
    { xPercent: 0, yPercent: 0, rotation: -3, zIndex: 3 },
    { xPercent: 10, yPercent: 9, rotation: 4, zIndex: 2 },
    { xPercent: 16, yPercent: 18, rotation: -1, zIndex: 1 },
  ];
  const shots = gsap.utils.toArray(".shot");
  shots.forEach((s, i) => gsap.set(s, SPOTS[i]));   // CSS 의 겹침 배치는 .js-motion 이 없을 때만 쓰인다

  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(".hero__date", { autoAlpha: 0, y: 20, duration: 0.6 })
    .from(".hero__sub > span", { autoAlpha: 0, y: 30, duration: 0.6, stagger: 0.12 }, "-=0.3")
    .from(".hero__big .nb", { autoAlpha: 0, yPercent: 60, duration: 0.9, stagger: 0.14 }, "-=0.35")
    .from(".chips li", { autoAlpha: 0, scale: 0.7, duration: 0.5, stagger: 0.08, ease: "back.out(2)" }, "-=0.5")
    .from(".hero .btn--big", { autoAlpha: 0, y: 24, duration: 0.6 }, "-=0.3")
    .from(shots, { autoAlpha: 0, y: 120, rotation: 18, duration: 1, stagger: 0.12 }, 0.35);

  // 맨 앞 그림이 옆으로 빠져 맨 뒤로 가고, 나머지가 한 칸씩 앞으로 (광고 컷 넘기기)
  let order = [...shots];
  const cycle = () => {
    const front = order.shift();
    order.push(front);
    gsap.timeline()
      .to(front, { xPercent: -70, yPercent: -8, rotation: -16, autoAlpha: 0, duration: 0.45, ease: "power2.in" })
      .set(front, { ...SPOTS[2], zIndex: 0 })
      .to(front, { autoAlpha: 1, duration: 0.3 });
    order.forEach((s, i) => { if (s !== front) gsap.to(s, { ...SPOTS[i], duration: 0.6, ease: "power3.out", delay: 0.15 }); });
    gsap.delayedCall(0.5, () => order.forEach((s, i) => gsap.set(s, { zIndex: SPOTS[i].zIndex })));
  };
  let cycleTimer = setInterval(cycle, 2600);
  document.addEventListener("visibilitychange", () => {
    clearInterval(cycleTimer);
    if (!document.hidden) cycleTimer = setInterval(cycle, 2600);
  });

  // 스크롤하면 첫 화면 글은 위로 물러나고 그림은 다가온다
  gsap.to(".hero__copy", { yPercent: -18, autoAlpha: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__stage", { yPercent: -10, scale: 1.08, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // 흐르는 띠: 빨리 스크롤하면 잠깐 빨라진다
  const tickerRow = document.querySelector(".ticker__row");
  const tickerAnim = tickerRow.getAnimations ? tickerRow.getAnimations()[0] : null;
  if (tickerAnim) {
    let calm;
    ScrollTrigger.create({
      onUpdate: (self) => {
        tickerAnim.playbackRate = 1 + Math.min(Math.abs(self.getVelocity()) / 400, 5);
        clearTimeout(calm);
        calm = setTimeout(() => { tickerAnim.playbackRate = 1; }, 160);
      },
    });
  }

  const mm = gsap.matchMedia();
  // 화면이 너무 낮으면(가로로 눕힌 휴대폰) 장면 고정 없이 세로로 쌓는다. style.css 의 같은 조건과 짝
  mm.add("(min-height: 560px)", () => {
    /* 장면 2: 질문이 물러나고 → '따라 만들기'에 줄이 그어지고 → 오렌지가 번지며 답이 나온다 */
    gsap.from(".ask__q .ask__line", { autoAlpha: 0, y: 50, duration: 0.9, stagger: 0.18, ease: "power3.out", scrollTrigger: { trigger: ".ask", start: "top 65%" } });
    const aLines = gsap.utils.toArray(".ask__a .ask__line");
    gsap.set(aLines, { autoAlpha: 0, y: 70 });
    gsap.set(".ask__a s", { "--strike": 0, "--ask-strike": "#ff542a" });   // 줄 색을 처음부터 적어 둔다 (안 적으면 투명에서 시작)
    gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: { trigger: ".ask", start: "top top", end: "+=160%", pin: true, scrub: 0.6, anticipatePin: 1 },
    })
      .to({}, { duration: 0.2 })
      .to(".ask__q", { autoAlpha: 0, y: -90, scale: 0.94, duration: 1 })
      .to(aLines[0], { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.3")
      .to(".ask__a s", { "--strike": 1, duration: 0.5, ease: "power1.inOut" }, "-=0.2")
      .fromTo(".ask__flood", { clipPath: "circle(0% at 50% 58%)" }, { clipPath: "circle(120% at 50% 58%)", duration: 1.4, ease: "power2.inOut" })
      .to(".ask__a s", { color: "rgba(23,23,23,0.55)", "--ask-strike": "#171717", duration: 0.5 }, "<0.4")
      .to(aLines[1], { autoAlpha: 1, y: 0, duration: 1 }, "<0.2")
      .from(".ask__big b", { scale: 0.6, duration: 0.8, ease: "back.out(2)" }, "<0.3")
      .to({}, { duration: 0.4 });

    /* 장면 3: 제목은 그냥 스크롤로 지나가고, 카드 세 장만 고정한다.
       첫 카드는 바로 보이고, 다음 카드가 아래에서 올라와 덮는 전환은 두 번뿐. 스냅 없이 스크롤 그대로 따라간다 */
    gsap.from(".labs__head > *", { autoAlpha: 0, y: 60, duration: 0.9, stagger: 0.12, ease: "power4.out", scrollTrigger: { trigger: ".labs__head", start: "top 75%" } });
    const cards = gsap.utils.toArray(".labs .lab");
    gsap.set(cards.slice(1), { yPercent: 100 });
    const labs = gsap.timeline({
      scrollTrigger: {
        trigger: ".labs__stack",
        start: "top top",
        end: () => `+=${(cards.length - 1) * window.innerHeight * 0.85}`,
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    // fromTo 로 시작·끝 값을 모두 적는다 (invalidateOnRefresh 때 from 은 숨긴 값을 끝 값으로 다시 읽어 버린다)
    cards.slice(1).forEach((card, i) => {
      const at = i * 1.25;
      labs
        .fromTo(card, { yPercent: 100 }, { yPercent: 0, ease: "power1.inOut", duration: 1 }, at)
        .fromTo(card.querySelectorAll(".lab__text > *, .lab__art"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, at + 0.55);
    });
    labs.to({}, { duration: 0.25 });   // 마지막 카드를 잠깐 보여 주고 풀린다
    // 첫 카드는 고정 전에 화면에 들어올 때 한 번 올라온다
    gsap.from(cards[0].querySelectorAll(".lab__text > *, .lab__art"), { autoAlpha: 0, y: 50, duration: 0.7, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: ".labs__stack", start: "top 70%" } });

    /* 장면 4: 운전석과 조수석이 양쪽에서 들어와 만난다 */
    gsap.timeline({ scrollTrigger: { trigger: ".pair", start: "top 80%", end: "center 55%", scrub: 0.6 } })
      .from(".pair .kicker", { autoAlpha: 0, y: 30, duration: 0.4 })
      .from(".seat--kid", { xPercent: -70, autoAlpha: 0, duration: 1 }, 0)
      .from(".seat--parent", { xPercent: 70, autoAlpha: 0, duration: 1 }, 0)
      .from(".pair__plus", { scale: 0, rotation: -180, autoAlpha: 0, duration: 0.6 }, 0.5)
      .from(".pair__foot", { autoAlpha: 0, y: 30, duration: 0.5 }, 0.8);

    /* 장면 6: 키캡이 돌면서 떨어져 내려앉는다 */
    gsap.fromTo(".keycap", { rotateZ: -80, y: -220, autoAlpha: 0 }, {
      rotateZ: -28, y: 0, autoAlpha: 1, ease: "none", stagger: 0.15,
      scrollTrigger: { trigger: ".gift", start: "top 85%", end: "center center", scrub: 0.6 },
    });

    /* 장면 7: 날짜가 화면을 꽉 채우며 다가온다 */
    gsap.fromTo(".reserve__date", { scale: 0.55, autoAlpha: 0.2 }, {
      scale: 1, autoAlpha: 1, ease: "none",
      scrollTrigger: { trigger: ".reserve", start: "top 90%", end: "center center", scrub: 0.6 },
    });
  });

  /* 숫자 세 개: 0 → 숫자로 올라간다 */
  gsap.utils.toArray(".facts__list li").forEach((li, i) => {
    const num = li.querySelector("[data-count]");
    const target = Number(num.dataset.count);
    const counter = { v: target === 0 ? 99 : 0 };
    gsap.timeline({ scrollTrigger: { trigger: ".facts", start: "top 75%" }, delay: i * 0.15 })
      .from(li, { autoAlpha: 0, y: 60, duration: 0.7, ease: "power3.out" })
      .to(counter, { v: target, duration: 1, ease: "power2.out", onUpdate: () => { num.textContent = Math.round(counter.v); } }, 0);
  });

  /* 나머지: 화면에 들어오면 한 번 올라온다 */
  const reveal = ".seats__head > *, .board__row, .seats__foot > *, .gift__copy > *, .gift__steps li, .reserve .kicker, .reserve__time, .reserve .btn--huge, .reserve__note, .faq__title, .faq details, .visit__info > *, .map";
  gsap.set(reveal, { autoAlpha: 0, y: 36 });
  ScrollTrigger.batch(reveal, {
    start: "top 90%",
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, overwrite: true }),
  });

  // 체험 그림이 문서 안에 들어오면 높이가 바뀔 수 있어 위치를 다시 잰다
  Promise.all(svgLoads).then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
