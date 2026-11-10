/**
 * 디랩 코딩 페스티벌 · 우리 아이 첫 메이커 데이 — 예약 신청 구글폼 만들기
 *
 * 쓰는 법
 *  1. https://script.google.com 에서 [새 프로젝트]를 연다.
 *  2. 이 파일 내용을 전부 붙여 넣고 저장한다.
 *  3. 위쪽 함수 목록에서 createFestivalForm 을 고르고 [실행]을 누른다.
 *     (처음 한 번은 구글 계정 권한 허용 창이 뜬다)
 *  4. [실행 로그]에 찍힌 "응답 주소"를 main.js 의 FESTIVAL.reserveUrl 에 넣는다.
 *
 * 응답은 같이 만들어지는 구글 시트에 쌓인다. 문항·문구는 폼 편집 화면에서 언제든 고칠 수 있다.
 * ※ 개인정보 보유 기간 등 동의 문구는 예시이니 캠퍼스 운영 기준에 맞게 확인한다.
 */
function createFestivalForm() {
  const SLOTS = [
    '1회 10:00 ~ 10:35',
    '2회 10:45 ~ 11:20',
    '3회 11:30 ~ 12:05',
    '4회 12:15 ~ 12:50',
  ];
  const LABS = [
    '체험 1 · 아두이노 생활 속 문제 해결',
    '체험 2 · 레고 움직이는 놀이기구',
    '체험 3 · 몬스터 잡는 엔트리와 AI',
  ];

  const form = FormApp.create('디랩 코딩 페스티벌 · 우리 아이 첫 메이커 데이 예약 신청');
  form
    .setDescription([
      '직접 만들고 움직이고 코딩하는, 우리 아이 첫 메이커 데이',
      '',
      '· 일시: 11/28(토) 오전 10시',
      '· 장소: 디랩코딩 안산캠퍼스 (경기 안산시 단원구 광덕동로 41 로진프라자 203호)',
      '· 모든 체험 무료 · 선착순 예약 · 조기 마감 시 대기 접수',
      '· 아이와 보호자 1명이 짝꿍이 되어 함께 만들어요. 아이는 직접 만들고, 보호자는 옆에서 읽어 주고 질문해요.',
      '· 체험 하나는 35분이에요.',
      '· 가족당 체험 2개까지, 이어지는 두 회차로 순서대로 체험해요.',
      '',
      '신청 후 자리가 확정되면 문자로 알려 드려요.',
    ].join('\n'))
    .setConfirmationMessage(
      '예약 신청이 접수됐어요!\n' +
      '자리가 확정되면 문자로 알려 드리고, 하루 전에 한 번 더 알려 드려요.\n' +
      '마감된 회차를 고르셨다면 대기 순서를 문자로 안내해 드려요.\n\n' +
      '11/28(토) 10분 일찍 오셔서 입구에서 스탬프 여권을 받아 주세요.'
    )
    .setProgressBar(true)
    .setAllowResponseEdits(false)
    .setCollectEmail(false);

  /* ---------- 1. 보호자 정보 ---------- */
  form.addSectionHeaderItem()
    .setTitle('보호자 정보')
    .setHelpText('예약 확정 문자를 받을 분의 정보를 적어 주세요.');

  form.addTextItem()
    .setTitle('보호자 성함')
    .setRequired(true);

  form.addTextItem()
    .setTitle('연락처')
    .setHelpText('예: 010-1234-5678')
    .setRequired(true)
    .setValidation(
      FormApp.createTextValidation()
        .requireTextMatchesPattern('^01[016789]-?[0-9]{3,4}-?[0-9]{4}$')
        .setHelpText('휴대폰 번호를 010-1234-5678 형식으로 적어 주세요.')
        .build()
    );

  form.addMultipleChoiceItem()
    .setTitle('아이와의 관계')
    .setChoiceValues(['엄마', '아빠', '조부모님'])
    .showOtherOption(true)
    .setRequired(true);

  /* ---------- 2. 아이 정보 ---------- */
  form.addPageBreakItem()
    .setTitle('아이 정보')
    .setHelpText('학년에 맞는 체험을 안내해 드릴게요.');

  form.addTextItem()
    .setTitle('아이 이름')
    .setRequired(true);

  form.addListItem()
    .setTitle('학년 (2026년 기준)')
    .setChoiceValues(['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('코딩 경험')
    .setChoiceValues(['처음이에요', '조금 해 봤어요', '꾸준히 배우고 있어요'])
    .setRequired(true);

  /* ---------- 3. 체험·회차 선택 ---------- */
  form.addPageBreakItem()
    .setTitle('체험과 회차 고르기')
    .setHelpText([
      '추천 학년 · 체험 1 초4 ~ 중등 / 체험 2 초1 ~ 초3 / 체험 3 초3 ~ 초6',
      '체험별로 회차마다 4가족씩, 선착순이에요.',
    ].join('\n'));

  form.addGridItem()
    .setTitle('원하는 회차에 체험을 골라 주세요')
    .setHelpText('이어지는 두 회차에 서로 다른 체험 2개까지 골라 주세요. 예) 1회 체험 2 + 2회 체험 3. 쉬는 회차는 비워 두세요.')
    .setRows(SLOTS)
    .setColumns(LABS)
    .setValidation(
      FormApp.createGridValidation()
        .setHelpText('같은 체험은 한 번만 고를 수 있어요.')
        .requireLimitOneResponsePerColumn()
        .build()
    );

  form.addMultipleChoiceItem()
    .setTitle('고른 회차가 마감되면')
    .setChoiceValues(['대기 접수할게요 (취소 자리가 나면 연락 주세요)', '다른 회차로 안내해 주세요', '신청하지 않을게요'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('키캡에 새길 아이 이니셜 (선택)')
    .setHelpText('체험 2개를 하면 이니셜 키캡을 드려요. 영문 대문자 3자까지, 예: JK')
    .setValidation(
      FormApp.createTextValidation()
        .requireTextMatchesPattern('^[A-Za-z]{1,3}$')
        .setHelpText('영문 1 ~ 3자로 적어 주세요.')
        .build()
    );

  form.addListItem()
    .setTitle('총 방문 예정 인원')
    .setHelpText('체험하는 아이와 보호자를 포함한 인원이에요. 체험하지 않는 가족은 라운지에서 기다릴 수 있어요. 예) 아이 · 엄마 · 아빠 · 할머니 → 4명')
    .setChoiceValues(['2명 (체험하는 아이와 보호자만)', '3명', '4명', '5명', '6명 이상'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('미리 알려 주실 내용 (선택)')
    .setHelpText('알레르기, 도움이 필요한 부분, 궁금한 점 등');

  /* ---------- 4. 동의 ---------- */
  form.addPageBreakItem()
    .setTitle('개인정보 수집·이용 동의');

  form.addCheckboxItem()
    .setTitle('개인정보 수집·이용에 동의해 주세요 (필수)')
    .setHelpText([
      '· 수집 항목: 보호자 성함, 연락처, 아이 이름·학년',
      '· 이용 목적: 메이커 데이 예약 확인, 일정·대기 안내 문자 발송',
      '· 보유 기간: 행사 종료 후 1개월 이내 파기',
      '동의하지 않으실 수 있으나, 이 경우 예약이 어려워요.',
    ].join('\n'))
    .setChoiceValues(['동의합니다'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('디랩코딩 안산캠퍼스 겨울학기(12/1 개강) 소식을 문자로 받아 보시겠어요? (선택)')
    .setChoiceValues(['네, 받을게요', '아니요']);

  /* ---------- 응답 시트 연결 ---------- */
  const sheet = SpreadsheetApp.create('메이커 데이 예약 응답');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  const responseUrl = form.getPublishedUrl();
  Logger.log('응답 주소 (main.js reserveUrl 에 넣기): ' + responseUrl);
  Logger.log('짧은 주소 (카톡·문자용): ' + form.shortenFormUrl(responseUrl));
  Logger.log('폼 편집 주소: ' + form.getEditUrl());
  Logger.log('응답 시트: ' + sheet.getUrl());
}
