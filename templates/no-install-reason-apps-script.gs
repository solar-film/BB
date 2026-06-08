const NO_INSTALL_SPREADSHEET_ID = '12BRnIWVT227cltrdeukIAOIEJ_qrL3OH0Aw6a7gIDIo';
const NO_INSTALL_SHEET_NAME = 'เหตุผลงานไม่ติดตั้ง';
const NO_INSTALL_HEADERS = [
  'ID',
  'วันที่บันทึก',
  'Week',
  'ฝ่ายขาย',
  'จำนวนงานไม่ติดตั้ง',
  'อธิบายเหตุผลที่งานไม่ติดตั้ง'
];

function doGet() {
  return jsonOutput_({
    ok: true,
    spreadsheetId: NO_INSTALL_SPREADSHEET_ID,
    sheetName: NO_INSTALL_SHEET_NAME
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const sheet = SpreadsheetApp.openById(NO_INSTALL_SPREADSHEET_ID).getSheetByName(NO_INSTALL_SHEET_NAME);
    if (!sheet) throw new Error(`Sheet not found: ${NO_INSTALL_SHEET_NAME}`);
    ensureHeaders_(sheet);

    if (payload.action === 'update') return updateRow_(sheet, payload);
    return createRow_(sheet, payload);
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function createRow_(sheet, payload) {
  const row = [
    text_(payload.id) || createNoInstallId_(),
    text_(payload.recordDate),
    text_(payload.week),
    text_(payload.salesOwner),
    Number(payload.noInstallCount),
    text_(payload.reason)
  ];
  validateRow_(payload, row);
  sheet.appendRow(row);
  return jsonOutput_({ ok: true, id: row[0], rowNumber: sheet.getLastRow() });
}

function updateRow_(sheet, payload) {
  if (!payload.id) throw new Error('Missing id for update');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((r, i) => i > 0 && String(r[0]) === String(payload.id));
  if (rowIndex === -1) throw new Error(`ID not found: ${payload.id}`);
  const row = [
    payload.id,
    text_(payload.recordDate),
    text_(payload.week),
    text_(payload.salesOwner),
    Number(payload.noInstallCount),
    text_(payload.reason)
  ];
  validateRow_(payload, row);
  sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
  return jsonOutput_({ ok: true, id: payload.id, rowNumber: rowIndex + 1 });
}

function validateRow_(payload, row) {
  const missing = [];
  if (!row[1]) missing.push('recordDate');
  if (!row[2]) missing.push('week');
  if (!row[3]) missing.push('salesOwner');
  if (payload.noInstallCount === undefined || payload.noInstallCount === null || payload.noInstallCount === '') missing.push('noInstallCount');
  if (!row[5]) missing.push('reason');
  if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, NO_INSTALL_HEADERS.length).getValues()[0];
  const hasHeaders = NO_INSTALL_HEADERS.every((header, index) => current[index] === header);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, NO_INSTALL_HEADERS.length).setValues([NO_INSTALL_HEADERS]);
  }
}

function text_(value) {
  return String(value || '').trim();
}

function createNoInstallId_() {
  return `NIR-${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss')}`;
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
