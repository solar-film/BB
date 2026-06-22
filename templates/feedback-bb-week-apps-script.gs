const FEEDBACK_SPREADSHEET_ID = '1HaOmTLOl1YaaEIf_9WatknaAwIJGI8AZI1H-QO7CvHM';
const FEEDBACK_SHEET_NAME = 'Feedback-BB-Week';
const FEEDBACK_HEADERS = [
  'Record ID',
  'บันทึกเมื่อ',
  'Our-DATA ID',
  'แถวข้อมูลต้นทาง',
  'ชื่อลูกค้า',
  'บริษัท',
  'เบอร์โทรติดต่อ',
  'ช่องทาง',
  'Line @',
  'ที่อยู่',
  'เดือนติดตั้ง',
  'วันที่ติดตั้ง',
  'พื้นที่กระจก',
  'หน่วย',
  'ฝ่ายขาย',
  'BB Week',
  'วันที่สอบถาม',
  'คำติชม-ฝ่ายขาย',
  'Feedback-ฝ่ายขาย',
  'คำติชม-ทีมช่าง',
  'Feedback-ทีมช่าง',
  'ข้อแนะนำอื่นๆ',
  'รายชื่อช่าง',
  'หมายเหตุ'
];

function doGet(e) {
  try {
    const sheet = getOrCreateFeedbackSheet_();
    const action = text_(e && e.parameter && e.parameter.action);
    if (action === 'list') {
      const limit = Math.min(Math.max(Number(e.parameter.limit) || 50, 1), 1000);
      return jsonOutput_({ ok: true, records: getRecentRecords_(sheet, limit) });
    }
    return jsonOutput_({
      ok: true,
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      sheetName: sheet.getName(),
      columns: FEEDBACK_HEADERS.length
    });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const sheet = getOrCreateFeedbackSheet_();
    validateFeedback_(payload);

    const existingRow = findRecordRow_(sheet, payload.recordId);
    if (payload.action === 'update') {
      if (!existingRow) throw new Error(`Record ID not found: ${payload.recordId}`);
      const updatedRow = buildFeedbackRow_(payload);
      sheet.getRange(existingRow, 1, 1, updatedRow.length).setValues([updatedRow]);
      SpreadsheetApp.flush();
      return jsonOutput_({ ok: true, updated: true, recordId: payload.recordId, rowNumber: existingRow });
    }

    if (existingRow) {
      return jsonOutput_({ ok: true, duplicate: true, recordId: payload.recordId, rowNumber: existingRow });
    }

    const row = buildFeedbackRow_(payload);
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return jsonOutput_({ ok: true, recordId: payload.recordId, rowNumber: sheet.getLastRow() });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function buildFeedbackRow_(payload) {
  return [
    safeText_(payload.recordId),
    safeText_(payload.savedAt),
    safeText_(payload.sourceId),
    Number(payload.sourceRow) || '',
    safeText_(payload.customerName),
    safeText_(payload.company),
    safeText_(payload.phone),
    safeText_(payload.channel),
    safeText_(payload.lineAt),
    safeText_(payload.address),
    safeText_(payload.installMonth),
    safeText_(payload.installDate),
    Number(payload.glassArea) || 0,
    safeText_(payload.unit),
    safeText_(payload.sales),
    safeText_(payload.bbWeek),
    safeText_(payload.inquiryDate),
    safeText_(payload.salesComment),
    safeText_(payload.salesFeedback),
    safeText_(payload.techComment),
    safeText_(payload.techFeedback),
    safeText_(payload.suggestions),
    safeText_(payload.technicianNames),
    safeText_(payload.note)
  ];
}

function authorizeFeedbackApp() {
  const sheet = getOrCreateFeedbackSheet_();
  return `Authorized: ${sheet.getParent().getName()} / ${sheet.getName()}`;
}

function getOrCreateFeedbackSheet_() {
  const spreadsheet = SpreadsheetApp.openById(FEEDBACK_SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(FEEDBACK_SHEET_NAME);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length)
      .setValues([FEEDBACK_HEADERS])
      .setBackground('#5b3fc2')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setWrap(true);
    sheet.setRowHeight(1, 42);
    sheet.autoResizeColumns(1, FEEDBACK_HEADERS.length);
    [5, 10, 18, 19, 20, 21, 22, 23, 24].forEach(function(column) {
      sheet.setColumnWidth(column, 220);
    });
  }
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length).getDisplayValues()[0];
  const matches = FEEDBACK_HEADERS.every(function(header, index) { return current[index] === header; });
  if (!matches && sheet.getLastRow() <= 1) {
    sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length).setValues([FEEDBACK_HEADERS]);
  } else if (!matches) {
    throw new Error('โครงสร้างหัวตาราง Feedback-BB-Week ไม่ตรงกับระบบ กรุณาตรวจสอบก่อนบันทึก');
  }
}

function validateFeedback_(payload) {
  const missing = [];
  if (!text_(payload.recordId)) missing.push('recordId');
  if (!text_(payload.sourceId)) missing.push('sourceId');
  if (!text_(payload.customerName)) missing.push('customerName');
  if (!text_(payload.bbWeek)) missing.push('bbWeek');
  if (!text_(payload.inquiryDate)) missing.push('inquiryDate');
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

function findRecordRow_(sheet, recordId) {
  if (!recordId || sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(recordId))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
}

function getRecentRecords_(sheet, limit) {
  if (sheet.getLastRow() < 2) return [];
  const startRow = Math.max(2, sheet.getLastRow() - limit + 1);
  const values = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, FEEDBACK_HEADERS.length).getDisplayValues();
  return values.reverse().map(function(row) {
    return {
      recordId: row[0], savedAt: row[1], sourceId: row[2], sourceRow: row[3],
      customerName: row[4], company: row[5], phone: row[6], channel: row[7], lineAt: row[8],
      address: row[9], installMonth: row[10], installDate: row[11], glassArea: row[12], unit: row[13],
      sales: row[14], bbWeek: row[15], inquiryDate: row[16], salesComment: row[17],
      salesFeedback: row[18], techComment: row[19], techFeedback: row[20], suggestions: row[21],
      technicianNames: row[22], note: row[23]
    };
  });
}

function text_(value) {
  return String(value == null ? '' : value).trim();
}

function safeText_(value) {
  const text = text_(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
