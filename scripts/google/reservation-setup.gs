/**
 * 루시앤폴스냅 예약 접수 도구 (Google Apps Script)
 *
 * lucynpaulsnap@gmail.com 계정의 script.google.com 새 프로젝트에 붙여 넣고 setup()을 한 번 실행한다.
 * 만드는 것:
 *   1. 구글 폼 "루시앤폴스냅 돌스냅 예약 신청서"
 *   2. 응답이 쌓이는 시트 "루시앤폴스냅 예약 접수" (+ 상태·예약금 입금일·메모 열)
 *   3. 캘린더 "루시앤폴스냅 촬영 일정" (사이트에 공개할 마감 달력)
 *   4. 트리거: 신청서가 들어오면 메일 알림, 시트에서 상태를 "확정"으로 바꾸면 달력에 "예약 마감" 표시
 *
 * 달력에는 고객 정보를 넣지 않는다. 공개 달력이기 때문이다.
 */

const NAMES = {
  form: '루시앤폴스냅 돌스냅 예약 신청서',
  sheet: '루시앤폴스냅 예약 접수',
  calendar: '루시앤폴스냅 촬영 일정',
};
const PRODUCTS = ['데이터', '싱글앨범', '앨범세트'];
const EXTRAS = ['초상권 활용 동의 (사진·영상을 포트폴리오에 사용)', '촬영 후기 작성', '짝꿍(지인 소개)'];
const STATUS = ['접수', '확정', '촬영완료', '납품완료', '취소'];
const BUSY_TITLE = '예약 마감';

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
  form.setDescription([
    '상담을 마친 뒤 작성해 주세요.',
    '신청서 작성과 예약금 입금이 모두 끝나면 예약이 확정됩니다. 입금 전에는 날짜가 잡히지 않습니다.',
    '1인 작가가 직접 촬영하므로 같은 날 같은 시간에는 한 가족만 촬영합니다.',
  ].join('\n'));
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
  const r = {};
  e.response.getItemResponses().forEach((ir) => (r[ir.getItem().getTitle()] = ir.getResponse()));
  const body = Object.keys(r).map((k) => k + ': ' + [].concat(r[k]).join(', ')).join('\n');
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[예약 신청] ' + r['촬영 날짜'] + ' ' + r['아기 이름'], body);
}

// 시트에서 상태를 "확정"으로 바꾸면 촬영 날짜에 "예약 마감" 종일 일정을 만든다.
// "취소"로 바꾸면 그 날짜의 마감 표시를 지운다.
function onSheetEdit_(e) {
  const sheet = e.range.getSheet();
  if (e.range.getRow() < 2 || e.range.getNumColumns() !== 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers[e.range.getColumn() - 1] !== '상태') return;

  const row = sheet.getRange(e.range.getRow(), 1, 1, headers.length).getValues()[0];
  const date = row[headers.indexOf('촬영 날짜')];
  if (!(date instanceof Date)) return;

  const cal = CalendarApp.getCalendarById(PropertiesService.getScriptProperties().getProperty('CALENDAR_ID'));
  const existing = cal.getEventsForDay(date).filter((ev) => ev.getTitle() === BUSY_TITLE);
  if (e.value === '확정' && existing.length === 0) cal.createAllDayEvent(BUSY_TITLE, date);
  if (e.value === '취소' && !hasOtherConfirmed_(sheet, headers, date, e.range.getRow())) {
    existing.forEach((ev) => ev.deleteEvent());
  }
}

// 같은 날짜에 확정된 다른 예약이 있으면 마감 표시를 남긴다.
function hasOtherConfirmed_(sheet, headers, date, editedRow) {
  const dateCol = headers.indexOf('촬영 날짜');
  const statusCol = headers.indexOf('상태');
  const key = date.toDateString();
  return sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), headers.length).getValues()
    .some((r, i) => i + 2 !== editedRow && r[statusCol] === '확정' && r[dateCol] instanceof Date && r[dateCol].toDateString() === key);
}
