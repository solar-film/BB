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
  // Let Google show its consent UI when a user granted only some required scopes.
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  try {
    requireFeedbackUser_(false);
    const page = text_(e && e.parameter && e.parameter.page) || 'entry';
    if (!['entry', 'presentation', 'report'].includes(page)) throw feedbackError_('INVALID_PAGE', 'ไม่พบหน้าที่ต้องการ');
    const template = HtmlService.createTemplateFromFile(page);
    template.appUrl = ScriptApp.getService().getUrl();
    return template.evaluate().setTitle('BB Customer Feedback')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    return jsonOutput_(feedbackFailure_(error));
  }
}

// Mutations are accepted only through the authenticated HTML-service RPC bridge.
// Legacy cross-origin form POSTs must never write, even with a logged-in cookie.
function doPost() {
  return jsonOutput_({ ok: false, code: 'AUTH_REQUIRED', error: 'กรุณาเปิดแอปและลงชื่อเข้าใช้ก่อนบันทึก' });
}

function requireFeedbackUser_(write) {
  const email = text_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!email) throw feedbackError_('AUTH_REQUIRED', 'กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ที่ได้รับอนุญาต');
  const properties = PropertiesService.getScriptProperties();
  const users = (key) => String(properties.getProperty(key) || '').split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  const writers = users('FEEDBACK_WRITERS');
  const readers = users('FEEDBACK_READERS');
  if (!writers.includes(email) && (write || !readers.includes(email))) {
    throw feedbackError_('FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์ดำเนินการ กรุณาติดต่อเจ้าของระบบ');
  }
  return email;
}

function feedbackRead(kind) {
  try {
    requireFeedbackUser_(false);
    if (kind === 'source') {
      const sheet = SpreadsheetApp.openById(FEEDBACK_SPREADSHEET_ID).getSheetByName('Our-DATA');
      if (!sheet) throw feedbackError_('SCHEMA_MISMATCH', 'ไม่พบชีต Our-DATA');
      const rows = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 29).getDisplayValues();
      const required = { 4: 'ID', 8: 'ชื่อลูกค้า', 9: 'บริษัท', 13: 'เบอร์ติดต่อ', 16: 'ข้อมูลเพิ่มเติม', 19: 'หน้ากระจก (ตรฟ.)', 21: 'หน่วย', 25: 'เดือนติดตั้ง', 26: 'วันที่ติดตั้ง', 27: 'ฝ่ายขาย', 28: 'ทีมช่าง ติดตั้ง' };
      if (Object.keys(required).some((column) => text_(rows[0][column]).replace(/\s+/g, ' ') !== required[column])) {
        throw feedbackError_('SCHEMA_MISMATCH', 'หัวตาราง Our-DATA เปลี่ยนไป กรุณาตรวจสอบก่อนใช้งาน');
      }
      return { ok: true, rows: rows.slice(1) };
    }
    if (kind !== 'records') throw feedbackError_('INVALID_ACTION', 'คำขอไม่ถูกต้อง');
    const sheet = getFeedbackSheet_();
    const count = sheet.getLastRow() - 1;
    if (count < 1) return { ok: true, rows: [], records: [] };
    const range = sheet.getRange(2, 1, count, FEEDBACK_HEADERS.length);
    const rows = range.getDisplayValues(), values = range.getValues(), formulas = range.getFormulas();
    return { ok: true, rows, records: rows.map((row, index) => recordFromRow_(row, version_(values[index], formulas[index]))).reverse() };
  } catch (error) { return feedbackFailure_(error); }
}

function feedbackSave(payload) {
  let lock;
  try {
    requireFeedbackUser_(true);
    validateFeedback_(payload);
    lock = LockService.getScriptLock();
    lock.waitLock(15000);
    const sheet = getFeedbackSheet_();
    const existingRow = findRecordRow_(sheet, payload.recordId);
    if (payload.action === 'update') {
      if (!existingRow) throw feedbackError_('NOT_FOUND', 'ไม่พบรายการที่ต้องการแก้ไข');
      const before = readRecord_(sheet, existingRow);
      if (text_(payload.sourceId) !== before.record.sourceId) throw feedbackError_('CONFLICT', 'รหัสงานไม่ตรงกับรายการเดิม');
      const fields = buildFeedbackRow_(payload).slice(15);
      // A response may be lost after a successful write. Return the same committed result.
      if (sameValues_(before.values.slice(15), fields)) return { ok: true, duplicate: true, record: before.record };
      if (payload.expectedVersion !== before.record.version) throw feedbackError_('CONFLICT', 'มีผู้แก้ไขรายการนี้แล้ว กรุณาเปิดข้อมูลล่าสุดก่อนบันทึก');
      // Preserve the customer snapshot, original timestamp, extra columns and formulas elsewhere.
      sheet.getRange(existingRow, 16, 1, fields.length).setValues([fields]);
      SpreadsheetApp.flush();
      const after = readRecord_(sheet, existingRow);
      if (!sameValues_(after.values.slice(15), fields)) throw feedbackError_('VERIFY_FAILED', 'ยังยืนยันผลบันทึกไม่ได้ กรุณาลองส่งรายการเดิมอีกครั้ง');
      return { ok: true, updated: true, record: after.record };
    }
    if (existingRow) {
      const before = readRecord_(sheet, existingRow);
      if (!sameValues_(before.values, buildFeedbackRow_(payload))) throw feedbackError_('CONFLICT', 'รหัสรายการนี้ถูกใช้แล้ว กรุณาตรวจรายการล่าสุดก่อนส่งใหม่');
      return { ok: true, duplicate: true, record: before.record };
    }
    const row = buildFeedbackRow_(payload);
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    const rowNumber = findRecordRow_(sheet, payload.recordId);
    if (!rowNumber) throw feedbackError_('VERIFY_FAILED', 'ยังยืนยันผลบันทึกไม่ได้ กรุณาลองส่งรายการเดิมอีกครั้ง');
    const after = readRecord_(sheet, rowNumber);
    if (!sameValues_(after.values, row)) throw feedbackError_('VERIFY_FAILED', 'ข้อมูลที่อ่านกลับไม่ตรง กรุณาตรวจรายการล่าสุด');
    return { ok: true, record: after.record };
  } catch (error) { return feedbackFailure_(error); }
  finally { if (lock) { try { lock.releaseLock(); } catch (_) {} } }
}

function feedbackError_(code, message) { const error = new Error(message); error.code = code; return error; }
function feedbackFailure_(error) {
  if (!error.code) console.error('Feedback server failure: ' + String(error.message || error));
  return { ok: false, code: error.code || 'SERVER_ERROR', error: error.code ? error.message : 'ระบบไม่สามารถดำเนินการได้ กรุณาลองใหม่หรือติดต่อเจ้าของระบบ' };
}
function version_(values, formulas) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([values, formulas]), Utilities.Charset.UTF_8)
    .map((byte) => (byte & 255).toString(16).padStart(2, '0')).join('');
}
function sameValues_(left, right) {
  // Sheet text storage removes the apostrophe used to prevent formula execution.
  const value = (item) => text_(item).replace(/^'(?=[=+\-@])/, '');
  return left.length === right.length && left.every((item, index) => value(item) === value(right[index]));
}
function readRecord_(sheet, row) {
  const range = sheet.getRange(row, 1, 1, FEEDBACK_HEADERS.length);
  const values = range.getValues()[0];
  return { values, record: recordFromRow_(range.getDisplayValues()[0], version_(values, range.getFormulas()[0])) };
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

function getFeedbackSheet_() {
  const sheet = SpreadsheetApp.openById(FEEDBACK_SPREADSHEET_ID).getSheetByName(FEEDBACK_SHEET_NAME);
  if (!sheet) throw feedbackError_('SCHEMA_MISMATCH', 'ไม่พบชีต Feedback-BB-Week กรุณาติดต่อเจ้าของระบบ');
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length).getDisplayValues()[0];
  const matches = FEEDBACK_HEADERS.every(function(header, index) { return current[index] === header; });
  if (!matches) throw feedbackError_('SCHEMA_MISMATCH', 'โครงสร้างหัวตาราง Feedback-BB-Week ไม่ตรง กรุณาตรวจสอบก่อนบันทึก');
}

function validateFeedback_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw feedbackError_('INVALID_INPUT', 'ข้อมูลไม่ถูกต้อง');
  if (!['create', 'update'].includes(payload.action)) throw feedbackError_('INVALID_ACTION', 'คำขอไม่ถูกต้อง');
  if (JSON.stringify(payload).length > 50000) throw feedbackError_('INVALID_INPUT', 'ข้อความยาวเกินไป');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.inquiryDate || '')) throw feedbackError_('INVALID_INPUT', 'วันที่สอบถามไม่ถูกต้อง');
  if (payload.action === 'update' && !/^[a-f0-9]{64}$/.test(payload.expectedVersion || '')) throw feedbackError_('CONFLICT', 'กรุณาเปิดรายการล่าสุดก่อนแก้ไข');
  if (payload.action === 'create' && (!Number.isInteger(payload.sourceRow) || payload.sourceRow < 2 || !/^\d{4}-\d{2}-\d{2}T/.test(payload.savedAt || ''))) throw feedbackError_('INVALID_INPUT', 'ข้อมูลต้นทางหรือเวลาบันทึกไม่ถูกต้อง');
  const missing = [];
  if (!text_(payload.recordId)) missing.push('recordId');
  if (!text_(payload.sourceId)) missing.push('sourceId');
  if (!text_(payload.customerName)) missing.push('customerName');
  if (!text_(payload.bbWeek)) missing.push('bbWeek');
  if (!text_(payload.inquiryDate)) missing.push('inquiryDate');
  if (missing.length) throw feedbackError_('INVALID_INPUT', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
}

function findRecordRow_(sheet, recordId) {
  if (!recordId || sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(recordId))
    .matchEntireCell(true)
    .matchCase(true)
    .useRegularExpression(false)
    .findNext();
  return match ? match.getRow() : 0;
}

function recordFromRow_(row, version) {
  return {
    version, recordId: row[0], savedAt: row[1], sourceId: row[2], sourceRow: row[3],
    customerName: row[4], company: row[5], phone: row[6], channel: row[7], lineAt: row[8],
    address: row[9], installMonth: row[10], installDate: row[11], glassArea: row[12], unit: row[13],
    sales: row[14], bbWeek: row[15], inquiryDate: row[16], salesComment: row[17],
    salesFeedback: row[18], techComment: row[19], techFeedback: row[20], suggestions: row[21],
    technicianNames: row[22], note: row[23]
  };
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
