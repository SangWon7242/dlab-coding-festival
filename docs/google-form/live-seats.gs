/**
 * 디랩 메이커 데이 — 회차별 남은 자리를 구글폼과 홈페이지에 실시간으로 보여 주기
 *
 * 하는 일
 *  · 신청이 들어올 때마다 회차(1~4회) × 체험(3가지) 별로 신청 수를 센다. 한 칸 정원은 4가족.
 *  · 폼의 회차 선택지 글자를 "1회 10:00 · 레고 놀이기구 — 남은 자리 3" 처럼 바꾼다.
 *    다 찬 칸은 "— 마감 (대기 접수)" 로 바뀐다. (대기로 고를 수는 있다)
 *  · 같은 숫자를 홈페이지(dcf.dlabansan.com)가 읽어 가서 '남은 자리' 표에 보여 준다.
 *
 * 처음 한 번만 설정 (10분)
 *  1. 지금 쓰는 예약 구글폼을 편집 화면으로 연다 → 오른쪽 위 [⋮] → [Apps Script].
 *  2. 이 파일 내용을 전부 붙여 넣고 저장(💾)한다.
 *  3. 위쪽 함수 목록에서 setupLiveSeats 를 고르고 [실행]. 처음엔 구글 계정 권한 허용 창이 뜬다.
 *     - 기존 '원하는 회차에 체험을 골라 주세요'(표 모양 문항)에 이미 들어온 신청 수를 먼저 기억해 두고,
 *       그 문항을 '남은 자리가 보이는 선택 목록'으로 바꾼다. 응답 시트에 있던 기존 응답은 그대로 남는다.
 *     - 신청이 들어올 때마다, 그리고 5분마다 자동으로 다시 세도록 설정한다.
 *  4. 오른쪽 위 [배포] → [새 배포] → 유형 [웹 앱]
 *     - 실행 사용자: 나 / 액세스 권한: 모든 사용자 → [배포]
 *     - 나오는 '웹 앱 URL'(https://script.google.com/macros/s/…/exec)을 복사해서
 *       홈페이지 main.js 의 FESTIVAL.seatsUrl 에 넣는다. (또는 Claude 에게 주소를 보내 주면 넣어 줌)
 *     - 이 주소로 공개되는 건 칸별 남은 자리 숫자뿐이다. 이름·연락처는 나가지 않는다.
 *
 * 운영 중
 *  · 취소가 생기면 폼 [응답] 탭에서 그 응답을 삭제한다 → 1분 안에 홈페이지와 폼 선택지에 자리가 다시 열린다.
 *    (홈페이지가 숫자를 읽어 갈 때마다 다시 세기 때문. 아무도 홈페이지를 보지 않을 때는 5분마다 다시 센다)
 *  · 바로 반영하려면 refreshSeats 를 한 번 [실행].
 *
 * 이 파일을 고쳐 붙여 넣은 뒤에는 [배포] → [배포 관리] → 연필 → 버전 '새 버전' → [배포] 를 해야
 * 홈페이지 주소에 반영된다. (주소는 그대로)
 *  · 정원·시간을 바꾸려면 아래 CAP · ROUNDS 를 고치고 refreshSeats 실행.
 */

const CAP = 4;   // 한 회차 · 한 체험의 정원 (가족 수)
const ROUNDS = [
  { no: 1, time: '10:00' },
  { no: 2, time: '10:45' },
  { no: 3, time: '11:30' },
  { no: 4, time: '12:15' },
];
const LABS = ['아두이노', '레고 놀이기구', 'AI 몬스터'];
// 옛 표 모양 문항의 열 이름에서 체험을 알아보는 낱말
const LAB_WORDS = [['아두이노'], ['레고'], ['몬스터', '엔트리', 'AI']];

const PICK_TITLE = '회차와 체험 고르기 (남은 자리 실시간)';
const PICK_HELP = '선택지 끝의 숫자가 지금 남은 자리예요. 이어지는 두 회차에서 서로 다른 체험 2개까지 골라 주세요. 예) 1회 레고 + 2회 AI 몬스터\n' +
  '"마감 (대기 접수)" 칸을 고르면 대기 순서대로 연락드려요.';

/* ---------- 처음 한 번 ---------- */
function setupLiveSeats() {
  const form = FormApp.getActiveForm();
  const props = PropertiesService.getScriptProperties();

  // 1) 이미 만들어 둔 선택 목록이 있으면 그대로 쓴다
  let pick = findPickItem_(form);
  if (!pick) {
    // 2) 옛 표 모양(그리드) 문항의 신청 수를 기억해 두고 그 자리에 선택 목록을 만든다
    const grid = form.getItems(FormApp.ItemType.GRID)[0];
    const base = emptyCounts_();
    let index = form.getItems().length;
    if (grid) {
      const rows = grid.asGridItem().getRows();
      form.getResponses().forEach(r => {
        const ir = r.getResponseForItem(grid);
        if (!ir) return;
        (ir.getResponse() || []).forEach((col, rowIdx) => {
          const lab = labOf_(col);
          const round = roundOfText_(rows[rowIdx]) ?? rowIdx;
          if (col && lab !== -1 && round !== -1 && round < ROUNDS.length) base[round][lab]++;
        });
      });
      index = grid.getIndex();
    }
    props.setProperty('base', JSON.stringify(base));

    pick = form.addCheckboxItem().setTitle(PICK_TITLE).setHelpText(PICK_HELP).setRequired(true);
    pick.setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(2).setHelpText('체험은 2개까지 고를 수 있어요.').build());
    form.moveItem(pick.getIndex(), index);
    if (grid) form.deleteItem(grid);
  }
  props.setProperty('pickId', String(pick.getId()));

  // 3) 자동으로 다시 세기: 신청이 들어올 때 + 5분마다
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'refreshSeats') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('refreshSeats').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('refreshSeats').timeBased().everyMinutes(5).create();

  const data = refreshSeats();
  Logger.log('설정 완료. 지금 남은 자리: ' + data.left + ' / ' + data.total);
  Logger.log('다음: [배포] → [새 배포] → 웹 앱 (실행 사용자: 나, 액세스: 모든 사용자)');
}

/* ---------- 다시 세기 (신청할 때마다·5분마다 자동) ---------- */
function refreshSeats() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const form = FormApp.getActiveForm();
    const props = PropertiesService.getScriptProperties();
    const pick = findPickItem_(form);
    if (!pick) throw new Error('먼저 setupLiveSeats 를 실행해 주세요.');
    const counts = countSeats_(form, pick);

    // 폼 선택지 글자에 남은 자리 표시
    const choices = [];
    ROUNDS.forEach((rd, i) => LABS.forEach((lab, j) => {
      const left = Math.max(0, CAP - counts[i][j]);
      choices.push(`${rd.no}회 ${rd.time} · ${lab} — ` + (left > 0 ? `남은 자리 ${left}` : '마감 (대기 접수)'));
    }));
    const item = pick.asCheckboxItem();
    item.setChoices(choices.map(c => item.createChoice(c)));

    // 홈페이지가 읽어 갈 숫자
    const data = seatData_(counts);
    props.setProperty('seats', JSON.stringify(data));
    CacheService.getScriptCache().put('seats', JSON.stringify(data), 15);
    return data;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 홈페이지용 주소 (웹 앱으로 배포) ---------- */
// 읽어 갈 때마다 응답 수를 다시 센다 (응답을 지워도 1분 안에 반영). 여러 사람이 동시에 봐도 15초에 한 번만 센다.
// 숫자가 달라졌으면 폼 선택지 글자도 같이 고친다.
function doGet(e) {
  const cache = CacheService.getScriptCache();
  let json = cache.get('seats');
  if (!json) {
    const form = FormApp.getActiveForm();
    const pick = findPickItem_(form);
    const prev = JSON.parse(PropertiesService.getScriptProperties().getProperty('seats') || 'null');
    let data = pick ? seatData_(countSeats_(form, pick)) : refreshSeats();
    if (!prev || JSON.stringify(prev.rounds) !== JSON.stringify(data.rounds)) data = refreshSeats();
    json = JSON.stringify(data);
    cache.put('seats', json, 15);
  }
  const cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$.]{0,60}$/.test(cb)) {
    return ContentService.createTextOutput(`${cb}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 도우미 ---------- */
function countSeats_(form, pick) {
  const counts = JSON.parse(PropertiesService.getScriptProperties().getProperty('base') || 'null') || emptyCounts_();
  form.getResponses().forEach(r => {
    const ir = r.getResponseForItem(pick);
    if (!ir) return;
    (ir.getResponse() || []).forEach(label => {
      const k = keyOf_(label);
      if (k) counts[k.round][k.lab]++;
    });
  });
  return counts;
}
function seatData_(counts) {
  const rounds = ROUNDS.map((rd, i) => ({ no: rd.no, time: rd.time, left: LABS.map((_, j) => Math.max(0, CAP - counts[i][j])) }));
  const left = rounds.reduce((s, r) => s + r.left.reduce((a, b) => a + b, 0), 0);
  return { cap: CAP, labs: LABS, rounds, left, total: CAP * ROUNDS.length * LABS.length, updated: new Date().toISOString() };
}
function emptyCounts_() {
  return ROUNDS.map(() => LABS.map(() => 0));
}
function findPickItem_(form) {
  const id = PropertiesService.getScriptProperties().getProperty('pickId');
  if (id) { const it = form.getItemById(Number(id)); if (it) return it; }
  return form.getItems(FormApp.ItemType.CHECKBOX).find(it => it.getTitle() === PICK_TITLE) || null;
}
function labOf_(text) {
  if (!text) return -1;
  return LAB_WORDS.findIndex(words => words.some(w => String(text).indexOf(w) !== -1));
}
function roundOfText_(text) {
  const m = /^(\d)회/.exec(String(text || ''));
  return m ? Number(m[1]) - 1 : null;
}
// "2회 10:45 · 레고 놀이기구 — 남은 자리 3" → { round: 1, lab: 1 }  (남은 자리 숫자가 바뀌어도 같은 칸으로 센다)
function keyOf_(label) {
  const m = /^(\d)회 [0-9:]+ · (.+?) — /.exec(String(label || ''));
  if (!m) return null;
  const round = Number(m[1]) - 1, lab = LABS.indexOf(m[2]);
  return round >= 0 && round < ROUNDS.length && lab !== -1 ? { round, lab } : null;
}
