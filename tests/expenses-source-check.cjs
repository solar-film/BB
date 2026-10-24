// Read an authorized CSV export on stdin; never save source business records.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console });
context.window = context;
for (const file of ['js/helpers.js', 'js/expense-data.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const rows = context.parseCSV(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
const result = context.BBExpenseData.parse(rows);
let checked = 0;
for (const month of result.months) {
    const cell = month.sourceCell.match(/^([A-Z]+)(\d+)$/);
    const column = [...cell[1]].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
    const raw = String(rows[Number(cell[2]) - 1][column] ?? '').replace(/,/g, '').trim();
    if (raw && Number.isFinite(Number(raw))) {
        assert.equal(month.total, Number(raw), month.sourceCell);
        checked++;
    } else assert.equal(month.total, null, month.sourceCell);
}
assert.ok(checked > 0, 'At least one source total must be verified');
assert.equal(new Set(result.months.map(month => month.key)).size, result.months.length);
console.log(JSON.stringify({ source: 'ค่าใช้จ่าย / TOTAL', months: result.months.length, verifiedNumericCells: checked, recordedMonths: result.months.filter(month => month.hasData).length, missingMonths: result.months.filter(month => !month.hasData).map(month => month.key), reviewMonths: result.months.filter(month => month.warnings.length).map(month => month.key) }, null, 2));
