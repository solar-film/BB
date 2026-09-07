const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV, monthKey, recordsFromCSV, filterRecords } = require('../js/lost-jobs.js');

test('CSV retains commas, quoted text, multiline reasons and trailing empty cells', () => {
    assert.deepEqual(parseCSV('\uFEFFa,"b,b","line 1\n""line 2""",\r\n'), [['a', 'b,b', 'line 1\n"line 2"', '']]);
    assert.throws(() => parseCSV('a,"broken'), /CSV/);
});
test('months remain distinct across years and support Thai source dates', () => {
    assert.equal(monthKey(' มิ.ย. 26', '30/6/26'), '2026-06');
    assert.equal(monthKey('มิ.ย. 25', '30/6/26'), '2025-06');
    assert.equal(monthKey('มิ.ย. 2569', ''), '2026-06');
    assert.equal(monthKey('', '30/6/26'), '2026-06');
    assert.equal(monthKey('', '2026-06-30'), '2026-06');
    assert.equal(monthKey('', ''), 'unknown');
    assert.equal(monthKey('ตรวจสอบเดือน', '30/6/26'), 'other:ตรวจสอบเดือน');
});
test('selects only exact status X and uses Sale E, not installation Sale AA', () => {
    const header = Array(43).fill(''); header[4] = 'Sale'; header[23] = 'สถานะ'; header[42] = 'สาเหตุ';
    const row = (status, person, month) => {
        const r = Array(43).fill(''); r[0] = month; r[4] = person; r[23] = status; r[26] = 'Different salesperson'; return r;
    };
    const csv = [['note'], ['group heading'], header, row(' ไม่ติดตั้ง ', 'Kat', 'มิ.ย. 26'), row('ติดตั้งแล้ว', 'Kat', 'มิ.ย. 26'), row('รอไม่ติดตั้ง', 'Kat', 'มิ.ย. 26'), row('ไม่ติดตั้ง', 'Jay', 'มิ.ย. 26'), row('ไม่ติดตั้ง', 'Kat', 'มิ.ย. 25')].map(r => r.join(',')).join('\r\n');
    const records = recordsFromCSV(csv);
    assert.equal(records.length, 3);
    assert.equal(filterRecords(records, 'Kat', '2026-06').length, 1);
    assert.equal(filterRecords(records, 'Kat', '').length, 2);
    assert.equal(filterRecords(records, '', '2026-06').length, 2);
    assert.equal(filterRecords(records, 'Missing', '').length, 0);
    assert.throws(() => recordsFromCSV('<html>Sign in</html>'), /CUSTOMER_ALL/);
});
const {filterPeriod} = require('../js/lost-jobs.js');
test('period presets handle year boundaries, exact months and undated records', () => {
    const rows = ['2025-07','2025-08','2025-11','2025-12','2026-01','2026-02','2026-03','unknown'].map(month => ({month}));
    const months = p => filterPeriod(rows,p,'2026-01').map(r=>r.month);
    assert.deepEqual(months('this-month'), ['2026-01']);
    assert.deepEqual(months('last-month'), ['2025-12']);
    assert.deepEqual(months('3-months'), ['2025-11','2025-12','2026-01']);
    assert.deepEqual(months('6-months'), ['2025-08','2025-11','2025-12','2026-01']);
    assert.deepEqual(months('this-year'), ['2026-01']);
    assert.equal(months('').length, rows.length);
    assert.deepEqual(months('2025-12'), ['2025-12']);
    assert.deepEqual(filterPeriod(rows,'this-year','2026-02').map(r=>r.month), ['2026-01','2026-02']);
});
