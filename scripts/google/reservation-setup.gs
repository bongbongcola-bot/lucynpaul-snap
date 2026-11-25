/**
 * 루시앤폴스냅 예약 접수 도구 (Google Apps Script)
 *
 * lucynpaulsnap@gmail.com 계정의 script.google.com 새 프로젝트에 붙여 넣고 setup()을 한 번 실행한다.
 * 만드는 것:
 *   1. 구글 폼 "루시앤폴스냅 돌스냅 예약 신청서"
 *   2. 응답이 쌓이는 시트 "루시앤폴스냅 예약 접수" (+ 상태·예약금 입금일·메모 열)
 *   3. 캘린더 "루시앤폴스냅 촬영 일정" (사이트에 공개할 마감 달력)
 *   4. 트리거: 신청서가 들어오면 고객 영수증 문서를 만들고 메일 알림, 시트에서 상태를 "확정"으로 바꾸면 달력에 "오전/오후 예약 마감" 표시
 *
 * 하루 두 팀(오전·오후)까지 촬영한다. 마감 표시도 시간대별로 한다.
 * 달력에는 고객 정보를 넣지 않는다. 공개 달력이기 때문이다.
 *
 * 영수증은 드라이브 "고객영수증안내" 폴더(공유하지 않음)에 구글 문서로 쌓인다. 문자·카톡으로 복사해 보내는 용도다.
 * 예약금 계좌는 공개 저장소에 올리지 않도록 스크립트 속성 DEPOSIT_ACCOUNT에 넣는다. (예: OO은행 000-0000-0000 예금주)
 * 기존 신청의 영수증은 createReceiptsForExisting()을 한 번 실행해 만든다.
 *
 * 사이트 예약 달력은 doGet()을 웹 앱(실행: 나, 액세스: 모든 사용자)으로 배포한 주소에서 마감 날짜·시간대만 읽는다.
 *
 * 이미 만든 폼에 시간대 질문을 넣을 때는 addSlotQuestion()을, 기존 종일 마감 일정을 바꿀 때는 migrateToSlots()를 한 번 실행한다.
 */

const NAMES = {
  form: '루시앤폴스냅 돌스냅 예약 신청서',
  sheet: '루시앤폴스냅 예약 접수',
  calendar: '루시앤폴스냅 촬영 일정',
  receiptFolder: '고객영수증안내',
};
const POLICY_URL = 'https://bongbongcola-bot.github.io/lucynpaul-snap/reservation.html';
const PRODUCTS = ['데이터', '싱글앨범', '앨범세트'];
const EXTRAS = ['초상권 활용 동의 (사진·영상을 포트폴리오에 사용)', '촬영 후기 작성', '짝꿍(지인 소개)'];
const STATUS = ['접수', '확정', '촬영완료', '납품완료', '취소'];
const SLOT_ITEM = '촬영 시간대';
const SLOTS = [
  { label: '오전 (10:00~14:00)', title: '오전 예약 마감', start: '10:00', end: '14:00' },
  { label: '오후 (15:00~20:00)', title: '오후 예약 마감', start: '15:00', end: '20:00' },
];
const LEGACY_BUSY_TITLE = '예약 마감';
const TZ = 'Asia/Seoul';
const FORM_DESCRIPTION = [
  '상담을 마친 뒤 작성해 주세요.',
  '신청서 작성과 예약금 입금이 모두 끝나면 예약이 확정됩니다. 입금 전에는 날짜가 잡히지 않습니다.',
  '1인 작가가 직접 촬영하며, 하루 두 가족(오전 10:00~14:00, 오후 15:00~20:00)까지 촬영합니다.',
].join('\n');

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('FORM_ID')) throw new Error('이미 만들었습니다. 다시 만들려면 스크립트 속성을 지우세요.');

  const form = buildForm_();
  const ss = SpreadsheetApp.create(NAMES.sheet);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  const sheet = addManagementColumns_(ss);

  const cal = CalendarApp.createCalendar(NAMES.calendar, {
    timeZone: 'Asia/Seoul',
    summary: '루시앤폴스냅 예약 마감 날짜 (고객 정보 없음)',
  });

  props.setProperties({ FORM_ID: form.getId(), SHEET_ID: ss.getId(), CALENDAR_ID: cal.getId() });
  ScriptApp.newTrigger('onFormSubmit_').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('onSheetEdit_').forSpreadsheet(ss).onEdit().create();

  Logger.log('FORM_EDIT=' + form.getEditUrl());
  Logger.log('FORM_PUBLIC=' + form.getPublishedUrl());
  Logger.log('SHEET=' + ss.getUrl() + ' (응답 탭: ' + sheet.getName() + ')');
  Logger.log('CALENDAR_ID=' + cal.getId());
}

function buildForm_() {
  const form = FormApp.create(NAMES.form);
  form.setDescription(FORM_DESCRIPTION);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setConfirmationMessage(
    '신청서가 접수되었습니다. 카카오톡으로 예약금 안내를 드립니다.\n' +
    '예약금 입금 시 입금자명에 아기 이름을 붙여 주세요. (예: 홍길동_아기이름)'
  );

  form.addTextItem().setTitle('예약자 성함').setRequired(true);
  form.addTextItem().setTitle('연락처').setHelpText('예: 010-1234-5678').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextMatchesPattern('^0\\d{1,2}-?\\d{3,4}-?\\d{4}$')
      .setHelpText('휴대폰 번호 형식으로 적어 주세요.').build());
  form.addTextItem().setTitle('아기 이름').setRequired(true);
  form.addDateItem().setTitle('촬영 날짜').setRequired(true);
  addSlotItem_(form);
  form.addTimeItem().setTitle('촬영 시작 시간').setHelpText('행사 시작 시간이 아니라 촬영을 시작할 시간입니다.').setRequired(true);
  form.addTextItem().setTitle('촬영 장소').setHelpText('지역과 장소 이름 (예: 청주 메리다컨벤션)').setRequired(true);
  form.addMultipleChoiceItem().setTitle('상품').setChoiceValues(PRODUCTS).setRequired(true);
  form.addCheckboxItem().setTitle('추가 신청').setHelpText('해당하는 항목을 모두 골라 주세요. 할인 혜택은 상담 때 안내드립니다.')
    .setChoiceValues(EXTRAS);
  form.addParagraphTextItem().setTitle('요청 사항').setHelpText('행사 순서, 꼭 담고 싶은 장면 등');
  form.addCheckboxItem().setTitle('예약 규정 확인')
    .setChoiceValues(['예약 절차와 변경·취소·환불 규정을 확인했습니다.']).setRequired(true);
  return form;
}

function addSlotItem_(form) {
  return form.addMultipleChoiceItem().setTitle(SLOT_ITEM).setChoiceValues(SLOTS.map((s) => s.label)).setRequired(true);
}

// 이미 만든 폼에 "촬영 시간대" 질문을 "촬영 날짜" 바로 아래에 넣고 안내 문구를 고친다. 한 번만 실행한다.
function addSlotQuestion() {
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  form.setDescription(FORM_DESCRIPTION);
  if (form.getItems().some((it) => it.getTitle() === SLOT_ITEM)) return Logger.log('이미 있습니다.');
  const dateItem = form.getItems().find((it) => it.getTitle() === '촬영 날짜');
  const item = addSlotItem_(form);
  form.moveItem(item.getIndex(), dateItem.getIndex() + 1);
  Logger.log('추가했습니다.');
}

function addManagementColumns_(ss) {
  const sheet = ss.getSheets().find((s) => s.getFormUrl()) || ss.getSheets()[0];
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = ['상태', '예약금 입금일', '메모'];
  sheet.getRange(1, lastCol + 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build();
  sheet.getRange(2, lastCol + 1, 999, 1).setDataValidation(statusRule);
  sheet.setFrozenRows(1);
  return sheet;
}

function onFormSubmit_(e) {
  const r = answers_(e.response);
  const body = Object.keys(r).map((k) => k + ': ' + [].concat(r[k]).join(', ')).join('\n');
  const slot = slotOfAnswers_(r);
  const subject = ['[예약 신청]', r['촬영 날짜'], slot ? slot.label.split(' ')[0] : '', r['아기 이름']].filter(String).join(' ');
  let receipt;
  try {
    receipt = '고객 영수증: ' + createReceipt_(r).getUrl();
  } catch (err) {
    receipt = '고객 영수증을 만들지 못했습니다: ' + err.message;
  }
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, receipt + '\n\n' + body);
}

function answers_(response) {
  const r = {};
  response.getItemResponses().forEach((ir) => (r[ir.getItem().getTitle()] = ir.getResponse()));
  return r;
}

// 폼 답으로 시간대를 정한다. 시간대 질문이 없던 예전 응답은 촬영 시작 시간이 14시 전이면 오전으로 본다.
function slotOfAnswers_(r) {
  const answered = SLOTS.find((s) => s.label === r[SLOT_ITEM]);
  if (answered) return answered;
  const hour = parseInt(String(r['촬영 시작 시간']), 10);
  return isNaN(hour) ? null : hour < 14 ? SLOTS[0] : SLOTS[1];
}

// 신청 내용을 고객에게 그대로 보낼 수 있는 영수증 문서로 만든다. 같은 이름의 문서가 있으면 그것을 돌려준다.
function createReceipt_(r) {
  const folder = receiptFolder_();
  const slot = slotOfAnswers_(r);
  const day = new Date(r['촬영 날짜'] + 'T00:00:00+09:00');
  const name = [Utilities.formatDate(day, TZ, 'yyMMdd'), slot ? slot.label.split(' ')[0] : '', r['아기 이름'], '(' + r['예약자 성함'] + ')']
    .filter(String).join(' ');
  const existing = folder.getFilesByName(name);
  if (existing.hasNext()) return existing.next();

  const doc = DocumentApp.create(name);
  doc.getBody().setText(receiptText_(r, day, slot));
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  return file;
}

function receiptFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('RECEIPT_FOLDER_ID');
  if (id) {
    try {
      const folder = DriveApp.getFolderById(id);
      if (!folder.isTrashed()) return folder;
    } catch (err) {
      // 폴더가 지워졌으면 새로 만든다.
    }
  }
  const folder = DriveApp.createFolder(NAMES.receiptFolder);
  props.setProperty('RECEIPT_FOLDER_ID', folder.getId());
  return folder;
}

function receiptText_(r, day, slot) {
  const weekday = '월화수목금토일'[Number(Utilities.formatDate(day, TZ, 'u')) - 1];
  const or = (v) => ([].concat(v || []).join(', ') || '없음');
  const account = PropertiesService.getScriptProperties().getProperty('DEPOSIT_ACCOUNT');
  return [
    '[루시앤폴스냅 예약 신청 확인]',
    '안녕하세요, 루시앤폴스냅입니다.',
    '예약 신청서가 접수되었습니다. 아래 내용을 확인해 주세요.',
    '',
    '▶ 예약자: ' + r['예약자 성함'],
    '▶ 연락처: ' + r['연락처'],
    '▶ 아기 이름: ' + r['아기 이름'],
    '▶ 촬영 날짜: ' + Utilities.formatDate(day, TZ, 'yyyy년 M월 d일') + ' (' + weekday + ')',
    '▶ 촬영 시간대: ' + (slot ? slot.label : '상담 때 확인'),
    '▶ 촬영 시작 시간: ' + r['촬영 시작 시간'],
    '▶ 촬영 장소: ' + r['촬영 장소'],
    '▶ 상품: ' + r['상품'],
    '▶ 추가 신청: ' + or(r['추가 신청']),
    '▶ 요청 사항: ' + or(r['요청 사항']),
    '',
    '■ 예약금 안내',
    '예약금 10만 원을 아래 계좌로 입금해 주세요.',
    account || '(계좌는 카카오톡으로 안내드립니다)',
    '입금자명: ' + r['예약자 성함'] + '_' + r['아기 이름'],
    '예약금은 상품 금액에서 차감됩니다.',
    '',
    '신청서 작성과 예약금 입금이 모두 확인되면 예약이 확정됩니다.',
    '입금 전에는 날짜가 따로 잡히지 않아요.',
    '변경·취소 규정: ' + POLICY_URL,
  ].join('\n');
}

// 이미 들어온 신청서의 영수증을 만든다. 이미 있는 영수증은 건너뛴다.
function createReceiptsForExisting() {
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  form.getResponses().forEach((res) => Logger.log(createReceipt_(answers_(res)).getName()));
}

// 시트에서 상태를 "확정"으로 바꾸면 촬영 날짜의 해당 시간대에 "오전/오후 예약 마감" 일정을 만든다.
// "취소"로 바꾸면 같은 날 같은 시간대에 확정된 다른 예약이 없을 때 그 일정을 지운다.
function onSheetEdit_(e) {
  const sheet = e.range.getSheet();
  if (e.range.getRow() < 2 || e.range.getNumColumns() !== 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers[e.range.getColumn() - 1] !== '상태') return;
  if (e.value !== '확정' && e.value !== '취소') return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    const row = rows[e.range.getRow() - 2];
    const slot = slotOf_(row, headers);
    const date = row[headers.indexOf('촬영 날짜')];
    if (!slot || !(date instanceof Date)) return;

    const cal = calendar_();
    const existing = busyEvents_(cal, date, slot);
    if (e.value === '확정' && existing.length === 0) createBusy_(cal, date, slot);
    if (e.value === '취소' && !hasOtherConfirmed_(rows, headers, date, slot, e.range.getRow() - 2)) {
      existing.forEach((ev) => ev.deleteEvent());
    }
    CacheService.getScriptCache().remove(BUSY_CACHE_KEY);
  } finally {
    lock.releaseLock();
  }
}

// 기존 종일 "예약 마감" 일정을 지우고, 시트의 확정 건으로 시간대 일정을 다시 만든다. 한 번만 실행한다.
function migrateToSlots() {
  const props = PropertiesService.getScriptProperties();
  const cal = calendar_();
  const legacy = cal.getEvents(new Date('2020-01-01T00:00:00+09:00'), new Date('2035-01-01T00:00:00+09:00'))
    .filter((ev) => ev.getTitle() === LEGACY_BUSY_TITLE);
  legacy.forEach((ev) => ev.deleteEvent());

  const ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  const sheet = ss.getSheets().find((s) => s.getFormUrl()) || ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  let created = 0;
  rows.forEach((row) => {
    const date = row[headers.indexOf('촬영 날짜')];
    const slot = slotOf_(row, headers);
    if (row[headers.indexOf('상태')] !== '확정' || !slot || !(date instanceof Date)) return;
    if (busyEvents_(cal, date, slot).length === 0) {
      createBusy_(cal, date, slot);
      created++;
    }
  });
  CacheService.getScriptCache().remove(BUSY_CACHE_KEY);
  Logger.log('종일 마감 ' + legacy.length + '개 삭제, 시간대 마감 ' + created + '개 생성');
}

const BUSY_CACHE_KEY = 'busy';

// 사이트 달력용 웹 앱. 고객 정보 없이 마감 날짜와 시간대만 내보낸다. 5분 동안 캐시한다.
function doGet() {
  const cache = CacheService.getScriptCache();
  let json = cache.get(BUSY_CACHE_KEY);
  if (!json) {
    const now = Date.now();
    const busy = calendar_().getEvents(new Date(now - 40 * 864e5), new Date(now + 400 * 864e5))
      .map((ev) => {
        const slot = SLOTS.find((s) => s.title === ev.getTitle());
        return slot && { date: Utilities.formatDate(ev.getStartTime(), TZ, 'yyyy-MM-dd'), slot: slot === SLOTS[0] ? 'am' : 'pm' };
      })
      .filter(Boolean);
    json = JSON.stringify({ busy });
    cache.put(BUSY_CACHE_KEY, json, 300);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function calendar_() {
  return CalendarApp.getCalendarById(PropertiesService.getScriptProperties().getProperty('CALENDAR_ID'));
}

// "촬영 시간대" 답으로 정한다. 답이 없는 예전 응답은 "촬영 시작 시간"이 14시 전이면 오전, 아니면 오후로 본다.
function slotOf_(row, headers) {
  const answered = SLOTS.find((s) => s.label === row[headers.indexOf(SLOT_ITEM)]);
  if (answered) return answered;
  const time = row[headers.indexOf('촬영 시작 시간')];
  if (time instanceof Date) return Number(Utilities.formatDate(time, TZ, 'H')) < 14 ? SLOTS[0] : SLOTS[1];
  const hour = parseInt(String(time), 10);
  return isNaN(hour) ? null : hour < 14 ? SLOTS[0] : SLOTS[1];
}

function slotRange_(date, slot) {
  const day = Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
  return [new Date(day + 'T' + slot.start + ':00+09:00'), new Date(day + 'T' + slot.end + ':00+09:00')];
}

function busyEvents_(cal, date, slot) {
  const [start, end] = slotRange_(date, slot);
  return cal.getEvents(start, end).filter((ev) => ev.getTitle() === slot.title);
}

function createBusy_(cal, date, slot) {
  const [start, end] = slotRange_(date, slot);
  cal.createEvent(slot.title, start, end);
}

// 같은 날 같은 시간대에 확정된 다른 예약이 있으면 마감 표시를 남긴다.
function hasOtherConfirmed_(rows, headers, date, slot, editedIndex) {
  const dateCol = headers.indexOf('촬영 날짜');
  const statusCol = headers.indexOf('상태');
  const key = Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
  return rows.some((r, i) => i !== editedIndex && r[statusCol] === '확정' && r[dateCol] instanceof Date
    && Utilities.formatDate(r[dateCol], TZ, 'yyyy-MM-dd') === key && slotOf_(r, headers) === slot);
}
