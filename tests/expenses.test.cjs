const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function harness(fetcher) {
    const context = vm.createContext({ console: { warn() {} }, AbortController, setTimeout, clearTimeout, fetch: fetcher });
    context.window = context;
    for (const file of ['js/helpers.js', 'js/expense-data.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    return context;
}
const header = ['เดือน', ' ม.ค. 26', ' ก.พ. 26', ' มี.ค. 26', ' เม.ย. 26', ' พ.ค. 26', ' มิ.ย. 26', ' ก.ค. 26', ' ส.ค. 26', ' ก.ย. 26', ' ต.ค. 26', ' พ.ย. 26', ' ธ.ค. 26', 'Total'];
// Synthetic values mirror the observed header/TOTAL layout, not business records.
const fixture = () => [header.slice(), ['ค่าใช้จ่ายรวมทั้งหมด (อาคาร)', '1,000.25', '2,000', '3,000', '6,000.25'], ['ค่าใช้จ่ายรวมทั้งหมด (รถยนต์)', '100.50', '0', '500', ''], ['TOTAL', '1,100.75', '2,000', '3,500', '6,000.25', '', '', '', '', '', '0.00', '0.00', '0.00', '999,999.99']];
const csv = rows => rows.map(row => row.map(cell => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');

test('TOTAL alone controls the 12 monthly amounts; annual Total is excluded', () => {
    const { BBExpenseData } = harness();
    const rows = fixture();
    rows[3][1] = '9,999.25'; // Deliberately differs from component sum; never recalculate it.
    const before = JSON.stringify(rows);
    const data = BBExpenseData.parse(rows);
    assert.equal(data.months.length, 12);
    assert.equal(data.months[0].total, 9999.25);
    assert.equal(data.months[0].sourceCell, 'B4');
    assert.equal(data.months[0].label, 'มกราคม 2026');
    assert.equal(data.months.at(-1).key, '2026-12');
    assert.equal(JSON.stringify(rows), before);
});
test('zero with entries is real; formula zeros over empty inputs are missing', () => {
    const rows = fixture();
    rows[1][2] = '0'; rows[3][2] = '0';
    const months = harness().BBExpenseData.parse(rows).months;
    assert.equal(months[1].total, 0);
    assert.equal(months[1].hasData, true);
    assert.equal(months[9].total, 0);
    assert.equal(months[9].hasData, false);
    assert.equal(months[5].total, null);
});
test('row insertion, Thai Buddhist/full month headers, and ordering remain safe', () => {
    const rows = [['note'], ['เดือน', 'กุมภาพันธ์ 2569', 'มกราคม 2026', 'Total'], ['อาคาร', 2, 1], [''], ['TOTAL', 2, 1, 3]];
    const result = harness().BBExpenseData.parse(rows);
    assert.equal(result.totalRow, 5);
    assert.equal(result.months[0].key, '2026-01');
    assert.equal(result.months[0].sourceCell, 'C5');
});
test('duplicate months, multiple TOTAL rows and unexpected headers fail closed', () => {
    const { parse } = harness().BBExpenseData;
    assert.throws(() => parse([['เดือน', 'ม.ค. 26', 'ม.ค. 2026'], ['TOTAL', 1, 2]]), /เดือนซ้ำ/);
    assert.throws(() => parse([['เดือน', 'ม.ค. 26'], ['TOTAL', 1], ['TOTAL', 2]]), /TOTAL/);
    assert.throws(() => parse([['เดือน', 'unknown'], ['TOTAL', 1]]), /หัวเดือน/);
    assert.throws(() => parse([['<html>login']]), /TOTAL/);
});
test('formula errors are never turned into zero or plotted as amounts', () => {
    const rows = fixture(); rows[3][1] = '#REF!';
    const month = harness().BBExpenseData.parse(rows).months[0];
    assert.equal(month.total, null);
    assert.equal(month.hasData, false);
    assert.equal(month.warnings.length, 1);
});
test('possible cumulative paste retains the source amount with a cell-specific warning', () => {
    const month = harness().BBExpenseData.parse(fixture()).months[3];
    assert.equal(month.total, 6000.25);
    assert.equal(month.hasData, true);
    assert.match(month.warnings[0], /E2/);
});
test('large source outliers remain plotted with an explicit review note', () => {
    const rows = fixture(); rows[3][4] = '50,000';
    const month = harness().BBExpenseData.parse(rows).months[3];
    assert.equal(month.total, 50000);
    assert.equal(month.hasData, true);
    assert.match(month.warnings[0], /4 เท่า.*E4/);
});
test('CSV loader uses expense gid, deduplicates in-flight loads, supports refresh', async () => {
    const calls = [];
    const context = harness(async (...args) => { calls.push(args); return { ok: true, text: async () => csv(fixture()) }; });
    const data = context.BBExpenseData;
    const first = data.load();
    assert.equal(data.snapshot().status, 'loading');
    assert.equal(data.load(), first);
    await first;
    assert.equal(data.snapshot().status, 'ready');
    assert.equal(data.snapshot().months[0].total, 1100.75);
    assert.match(calls[0][0], /gid=152606837/);
    assert.equal(calls[0][1].cache, 'no-store');
    await data.load();
    assert.equal(calls.length, 2);
});
test('network, HTML and invalid source failures have no mock or stale fallback', async () => {
    for (const response of [{ ok: false, status: 403 }, { ok: true, text: async () => '<html>login</html>' }, { ok: true, text: async () => 'unrecognized csv' }]) {
        let current = { ok: true, text: async () => csv(fixture()) };
        const data = harness(async () => current).BBExpenseData;
        await data.load();
        current = response;
        await data.load();
        assert.equal(data.snapshot().status, 'error');
        assert.equal(data.snapshot().months.length, 0);
        assert.equal(data.snapshot().updatedAt, null);
    }
});
