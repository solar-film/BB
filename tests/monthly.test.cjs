const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sandbox = { console };
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
for (const file of ['js/helpers.js', 'js/monthly-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const monthly = context.BBMonthlyData;
assert.ok(monthly, 'Monthly model must expose BBMonthlyData as a browser global');

function merge(base, override) {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        result[key] = value && typeof value === 'object' && !Array.isArray(value)
            ? merge(base[key] || {}, value)
            : value;
    }
    return result;
}

function week(id, dateRange, override = {}) {
    return merge({
        id,
        week: `Week ${id}`,
        dateRange,
        salesActualTotal: 0,
        salesTargetTotal: 0,
        gfs: { actual: 0, target: 0 },
        mhl: { actual: 0, target: 0 },
        car: { actual: 0, target: 0 },
        marketing: {
            gfs: { actual: 0, target: 0 },
            mhl: { actual: 0, target: 0 },
            car: { actual: 0, target: 0 }
        },
        admin: {
            contacts: { total: 0 },
            leads: { actual: 0 },
            sales: { totalInstalls: 0, totalSales: 0 }
        },
        tech: {
            installs: { actual: 0, target: 0 },
            area: { actual: 0, target: 0 },
            damage: { totalValue: 0 }
        }
    }, override);
}

function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

function near(actual, expected, message) {
    assert.ok(Number.isFinite(actual), `${message || 'value'} must be finite`);
    assert.ok(Math.abs(actual - expected) < 1e-9, `${message || 'value'}: ${actual} !== ${expected}`);
}

function build(rows, today = '2026-02-01') {
    return monthly.build(rows, { today, sourceYear: 2026 });
}

const periodCases = [
    ['1–7 ม.ค. 2026', '2026-01', '2026-01-01', '2026-01-07', false],
    ['1-7 ม.ค. 2026', '2026-01', '2026-01-01', '2026-01-07', false],
    ['1 ม.ค. – 7 ม.ค. 2026', '2026-01', '2026-01-01', '2026-01-07', false],
    ['27 เม.ย. – 3 พ.ค. 2026', '2026-05', '2026-04-27', '2026-05-03', true],
    ['29 ธ.ค. 2025 – 4 ม.ค. 2026', '2026-01', '2025-12-29', '2026-01-04', true],
    ['1–7 ม.ค. 2569', '2026-01', '2026-01-01', '2026-01-07', false],
    ['1–7 ม.ค.', '2026-01', '2026-01-01', '2026-01-07', false],
    ['1 มิ.ย.– 5 มิ.ย.\n5 วัน', '2026-06', '2026-06-01', '2026-06-05', false],
    ['23–29 ก.พ. 2024', '2024-02', '2024-02-23', '2024-02-29', false]
];

for (const [text, key, start, end, crossMonth] of periodCases) {
    test(`parsePeriod: ${JSON.stringify(text)}`, () => {
        const result = monthly.parsePeriod(text, 2026);
        assert.ok(result);
        assert.equal(result.key, key);
        assert.equal(result.start, start);
        assert.equal(result.end, end);
        assert.equal(result.crossMonth, crossMonth);
        assert.equal(result.year, Number(key.slice(0, 4)));
        assert.equal(result.month, Number(key.slice(5)));
        assert.ok(result.label);
    });
}

test('parsePeriod honors explicit source year for a yearless period', () => {
    const result = monthly.parsePeriod('1–7 ม.ค.', 2027);
    assert.equal(result.key, '2027-01');
    assert.equal(result.start, '2027-01-01');
});

for (const value of ['', '-', 'ไม่ทราบวันที่', '1–7 Unknown 2026', '31–32 ม.ค. 2026', '23–29 ก.พ. 2026', '31 เม.ย. – 3 พ.ค. 2026']) {
    test(`parsePeriod rejects unknown or impossible date: ${JSON.stringify(value)}`, () => {
        assert.equal(monthly.parsePeriod(value, 2026), null);
    });
}

test('build sums source fields and recomputes weighted ratios from monthly totals', () => {
    const rows = [
        week('1', '1–7 ม.ค. 2026', {
            salesActualTotal: 100, salesTargetTotal: 200,
            gfs: { actual: 70, target: 140 }, mhl: { actual: 20, target: 40 }, car: { actual: 10, target: 20 },
            marketing: { gfs: { actual: 10, target: 20 } },
            admin: { contacts: { total: 2 }, leads: { actual: 1 }, sales: { totalInstalls: 1, totalSales: 100 } },
            tech: { installs: { actual: 1, target: 2 }, area: { actual: 100, target: 200 }, damage: { totalValue: 9 } }
        }),
        week('2', '8–14 ม.ค. 2026', {
            salesActualTotal: 900, salesTargetTotal: 1800,
            gfs: { actual: 630, target: 1260 }, mhl: { actual: 180, target: 360 }, car: { actual: 90, target: 180 },
            marketing: { gfs: { actual: 300, target: 400 } },
            admin: { contacts: { total: 90 }, leads: { actual: 9 }, sales: { totalInstalls: 9, totalSales: 900 } },
            tech: { installs: { actual: 9, target: 18 }, area: { actual: 900, target: 1800 }, damage: { totalValue: 81 } }
        })
    ];
    const result = build(rows).months[0];
    assert.equal(result.sales.actual, 1000);
    assert.equal(result.sales.target, 2000);
    near(result.sales.progress, 50, 'sales progress');
    assert.deepEqual(plain(result.sales.companies), {
        gfs: { actual: 700, target: 1400 },
        mhl: { actual: 200, target: 400 },
        car: { actual: 100, target: 200 }
    });
    assert.equal(result.marketing.actual, 310);
    assert.equal(result.marketing.target, 420);
    near(result.marketing.roas, 1000 / 310, 'ROAS');
    assert.equal(result.admin.contacts, 92);
    assert.equal(result.admin.leads, 10);
    assert.equal(result.admin.installs, 10);
    assert.equal(result.admin.sales, 1000);
    near(result.admin.conversion, 10 / 92 * 100, 'lead conversion');
    near(result.admin.closeRate, 100, 'close rate');
    assert.equal(result.tech.installs, 10);
    assert.equal('installTarget' in result.tech, false);
    assert.equal(result.tech.area, 1000);
    assert.equal('areaTarget' in result.tech, false);
    assert.equal(result.tech.damage, 90);
    near(result.tech.damageRate, 10, 'damage as share of building sales');
    assert.equal(result.entries.length, 2);
    assert.equal(result.entries[0].salesActual, 100);
    assert.equal(result.entries[0].salesTarget, 200);
    assert.equal(result.entries[0].marketingActual, 10);
});

test('build preserves authoritative weekly total and helper fallback semantics', () => {
    const row = week('1', '1–7 ม.ค. 2026', {
        salesActualTotal: 500, salesTargetTotal: 700,
        gfs: { actual: 100, target: 200 }, mhl: { actual: 100, target: 200 }, car: { actual: 100, target: 200 }
    });
    let result = build([row]).months[0];
    assert.equal(result.sales.actual, 500);
    assert.equal(result.sales.target, 700);
    const fallbackRow = { ...row };
    delete fallbackRow.salesActualTotal;
    delete fallbackRow.salesTargetTotal;
    result = build([fallbackRow]).months[0];
    assert.equal(result.sales.actual, 300);
    assert.equal(result.sales.target, 600);
});

test('future targets remain in full-month target and zero weeks remain visible', () => {
    const rows = [
        week('1', '1–7 ม.ค. 2026', { salesActualTotal: 80, salesTargetTotal: 100 }),
        week('2', '8–14 ม.ค. 2026', { salesActualTotal: 90, salesTargetTotal: 100 }),
        week('3', '15–21 ม.ค. 2026', { salesTargetTotal: 100 }),
        week('4', '22–28 ม.ค. 2026', { salesTargetTotal: 100 }),
        week('5', '1–7 ก.พ. 2026', { salesTargetTotal: 100 })
    ];
    const result = build(rows, '2026-01-15');
    const january = result.months[0];
    assert.equal(january.sales.actual, 170);
    assert.equal(january.sales.target, 400);
    assert.equal(january.coverage.weekCount, 4);
    assert.equal(january.coverage.elapsedWeekCount, 2);
    assert.equal(january.coverage.isOpen, true);
    assert.equal(january.coverage.hasFutureActual, false);
    assert.equal(result.months[1].sales.actual, 0);
    assert.equal(result.months[1].coverage.isFuture, true);
    assert.equal(result.months[1].coverage.elapsedWeekCount, 0);
    assert.equal(result.defaultMonthKey, '2026-01');
});

test('future reported actuals are preserved and flagged, not silently filtered', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { salesActualTotal: 80 }),
        week('2', '15–21 ม.ค. 2026', { salesActualTotal: 90 })
    ], '2026-01-10').months[0];
    assert.equal(result.sales.actual, 170);
    assert.equal(result.coverage.weekCount, 2);
    assert.equal(result.coverage.elapsedWeekCount, 1);
    assert.equal(result.coverage.hasFutureActual, true);
});

test('reported actuals in an already-started open week are not future-dated actuals', () => {
    const result = build([
        week('1', '8–14 ม.ค. 2026', { salesActualTotal: 90 })
    ], '2026-01-10').months[0];
    assert.equal(result.sales.actual, 90);
    assert.equal(result.coverage.elapsedWeekCount, 0);
    assert.equal(result.coverage.isOpen, true);
    assert.equal(result.coverage.hasFutureActual, false);
});

test('elapsed week includes a week ending on the as-of date', () => {
    const result = build([week('1', '1–7 ม.ค. 2026')], '2026-01-07').months[0];
    assert.equal(result.coverage.elapsedWeekCount, 1);
});

test('past zero-activity weeks with targets remain real zero rows and are flagged only for confirmation', () => {
    const rows = deepFreeze([
        week('1', '1–7 ม.ค. 2026', { salesTargetTotal: 100 }),
        week('2', '8–14 ม.ค. 2026', { salesActualTotal: 80, salesTargetTotal: 100 })
    ]);
    const original = JSON.stringify(rows);
    const result = build(rows, '2026-02-01').months[0];
    assert.deepEqual(Array.from(result.coverage.unconfirmedWeeks), ['Week 1']);
    assert.equal(result.coverage.weekCount, 2);
    assert.equal(result.coverage.elapsedWeekCount, 2);
    assert.equal(result.sales.actual, 80);
    assert.equal(result.sales.target, 200);
    assert.equal(result.entries[0].salesActual, 0);
    assert.equal(result.entries[0].hasActivity, false);
    assert.equal(JSON.stringify(rows), original);
});

test('confirmation flag checks planned core metrics independently from other department activity', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { marketing: { gfs: { target: 20 } } }),
        week('2', '1–7 ม.ค. 2026'),
        week('3', '1–7 ม.ค. 2026', { salesTargetTotal: 100, admin: { sales: { totalInstalls: 2 } } }),
        week('4', '15–21 ม.ค. 2026', { salesTargetTotal: 100 })
    ], '2026-01-10').months[0];
    assert.deepEqual(Array.from(result.coverage.unconfirmedWeeks), ['Week 1', 'Week 3']);
    assert.equal(result.entries.length, 4);
    assert.equal(result.sales.target, 200);
    assert.equal(result.marketing.target, 20);
});

test('build sorts months chronologically and assigns crossing week exactly once', () => {
    const rows = [
        week('3', '1–7 มี.ค. 2026', { salesActualTotal: 30 }),
        week('1', '29 ธ.ค. 2025 – 4 ม.ค. 2026', { salesActualTotal: 10 }),
        week('2', '26 ม.ค. – 1 ก.พ. 2026', { salesActualTotal: 20 })
    ];
    const result = build(rows, '2026-04-01');
    assert.deepEqual(Array.from(result.months, month => month.key), ['2026-01', '2026-02', '2026-03']);
    assert.equal(result.months.reduce((sum, month) => sum + month.sales.actual, 0), 60);
    assert.equal(result.months.flatMap(month => month.entries).length, 3);
    assert.equal(result.months[0].entries[0].crossMonth, true);
    assert.equal(result.months[1].entries[0].crossMonth, true);
});

test('invalid dates are excluded with skipped-row reporting', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { salesActualTotal: 10 }),
        week('2', 'ไม่ทราบวันที่', { salesActualTotal: 100 }),
        week('3', '23–29 ก.พ. 2026', { salesActualTotal: 1000 })
    ]);
    assert.equal(result.skipped.length, 2);
    assert.equal(result.months.length, 1);
    assert.equal(result.months[0].sales.actual, 10);
});

test('plan-derived rows are retained but visibly identifiable in model provenance', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { salesActualTotal: 100, salesTargetTotal: 100, sourceMode: 'row-weekly-plan' })
    ]).months[0];
    assert.equal(result.sales.actual, 100);
    assert.equal(result.coverage.hasPlanDerived, true);
    assert.equal(result.entries[0].planDerived, true);
    assert.equal(result.coverage.chartData.sales, false);
});

test('chart coverage records only non-zero reported results for each chart subject', () => {
    const [sales, marketing, admin, tech, targetOnly] = build([
        week('1', '1–7 ม.ค. 2026', { salesActualTotal: 10, gfs: { actual: 6 }, mhl: { actual: 4 }, carDetail: { sales: { actual: 3 } } }),
        week('5', '1–7 ก.พ. 2026', { marketing: { gfs: { actual: 5 } } }),
        week('9', '1–7 มี.ค. 2026', { admin: { contacts: { total: 2 } } }),
        week('13', '1–7 เม.ย. 2026', { tech: { area: { actual: 25 } } }),
        week('17', '1–7 พ.ค. 2026', { salesTargetTotal: 100, gfs: { target: 60 }, mhl: { target: 40 } })
    ]).months;
    assert.deepEqual({ ...sales.coverage.chartData }, { sales: true, marketing: false, admin: false, building: true, car: true, tech: false });
    assert.deepEqual({ ...marketing.coverage.chartData }, { sales: false, marketing: true, admin: false, building: false, car: false, tech: false });
    assert.deepEqual({ ...admin.coverage.chartData }, { sales: false, marketing: false, admin: true, building: false, car: false, tech: false });
    assert.deepEqual({ ...tech.coverage.chartData }, { sales: false, marketing: false, admin: false, building: false, car: false, tech: true });
    assert.deepEqual({ ...targetOnly.coverage.chartData }, { sales: false, marketing: false, admin: false, building: false, car: false, tech: false });
});

test('installation-only weeks count as reported activity without requiring sales', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { admin: { sales: { totalInstalls: 3 } } })
    ]).months[0];
    assert.equal(result.admin.installs, 3);
    assert.equal(result.entries[0].hasActivity, true);
    assert.equal(result.coverage.nonZeroWeekCount, 1);
    assert.equal(result.coverage.lastActivityWeek, 'Week 1');
});

test('fallback-admin-sales-only weeks count as reported activity', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { buildingSales: { totalAdminSales: 250 } })
    ]).months[0];
    assert.equal(result.admin.sales, 250);
    assert.equal(result.entries[0].hasActivity, true);
    assert.equal(result.coverage.nonZeroWeekCount, 1);
    assert.equal(result.coverage.lastActivityWeek, 'Week 1');
});

test('missing nested fields produce safe zero totals and null undefined ratios', () => {
    const result = build([{ id: '1', week: 'Week 1', dateRange: '1–7 ม.ค. 2026' }]).months[0];
    assert.equal(result.sales.actual, 0);
    assert.equal(result.sales.target, 0);
    assert.equal(result.sales.progress, null);
    assert.equal(result.marketing.actual, 0);
    assert.equal(result.marketing.target, 0);
    assert.equal(result.marketing.roas, null);
    assert.equal(result.admin.contacts, 0);
    assert.equal(result.admin.leads, 0);
    assert.equal(result.admin.installs, 0);
    assert.equal(result.admin.sales, 0);
    assert.equal(result.admin.conversion, null);
    assert.equal(result.admin.closeRate, null);
    assert.equal(result.tech.installs, 0);
    assert.equal(result.tech.area, 0);
    assert.equal(result.tech.damage, 0);
    assert.equal(result.tech.damageRate, null);
    assert.equal(result.coverage.weekCount, 1);
});

test('negative adjustments and decimal precision are not rounded or clamped during aggregation', () => {
    const result = build([
        week('1', '1–7 ม.ค. 2026', { gfs: { actual: 100.25, target: 200.75 }, marketing: { gfs: { actual: 20.5, target: 30.5 } } }),
        week('2', '8–14 ม.ค. 2026', { gfs: { actual: -10.1, target: 0 }, marketing: { gfs: { actual: -2.25, target: 0 } } })
    ]).months[0];
    near(result.sales.actual, 90.15);
    near(result.sales.target, 200.75);
    near(result.marketing.actual, 18.25);
    near(result.marketing.roas, 90.15 / 18.25);
});

test('frozen input is not sorted, annotated or mutated and output is independently allocated', () => {
    const rows = deepFreeze([
        week('2', '8–14 ม.ค. 2026', { gfs: { actual: 20 }, tech: { teams: 5, installs: { ytd: 220 } }, carDetail: { tech: { teamSize: 7 } } }),
        week('1', '1–7 ม.ค. 2026', { gfs: { actual: 10 }, tech: { teams: 4, installs: { ytd: 100 } }, carDetail: { tech: { teamSize: 6 } } })
    ]);
    const before = JSON.stringify(rows);
    const first = build(rows);
    const second = build(rows);
    assert.equal(JSON.stringify(rows), before);
    assert.deepEqual(plain(first), plain(second));
    first.months[0].sales.companies.gfs.actual = 999;
    assert.equal(rows[0].gfs.actual, 20);
    assert.equal(second.months[0].sales.companies.gfs.actual, 30);
    assert.equal('ytd' in first.months[0], false);
    assert.equal('ytd' in first.months[0].tech, false);
    assert.equal('teams' in first.months[0].tech, false);
    assert.equal('teamSize' in first.months[0].tech, false);
    assert.equal('installTarget' in first.months[0].tech, false);
    assert.equal('areaTarget' in first.months[0].tech, false);
});

test('empty input is a safe empty result', () => {
    const result = build([]);
    assert.equal(result.months.length, 0);
    assert.equal(result.skipped.length, 0);
    assert.ok(!result.defaultMonthKey);
});

function comparisonMonth(key, actual, coverage = {}) {
    return {
        key,
        year: Number(key.slice(0, 4)),
        month: Number(key.slice(5)),
        sales: { actual },
        coverage: { isOpen: false, isFuture: false, ...coverage }
    };
}

test('compare reports adjacent-month amount and percent', () => {
    const result = monthly.compare(comparisonMonth('2026-02', 150), comparisonMonth('2026-01', 100));
    assert.equal(result.amount, 50);
    near(result.percent, 50);
    assert.equal(result.partial, false);
});

test('compare accepts December to January across a year boundary', () => {
    const result = monthly.compare(comparisonMonth('2026-01', 90), comparisonMonth('2025-12', 100));
    assert.equal(result.amount, -10);
    near(result.percent, -10);
});

test('compare rejects missing and nonadjacent prior months', () => {
    assert.equal(monthly.compare(comparisonMonth('2026-03', 150), null), null);
    assert.equal(monthly.compare(comparisonMonth('2026-03', 150), comparisonMonth('2026-01', 100)), null);
    assert.equal(monthly.compare(comparisonMonth('2026-03', 150), comparisonMonth('2026-03', 100)), null);
});

test('compare does not calculate growth percentage from zero or negative baseline', () => {
    for (const baseline of [0, -100]) {
        const result = monthly.compare(comparisonMonth('2026-02', 150), comparisonMonth('2026-01', baseline));
        assert.equal(result.amount, 150 - baseline);
        assert.equal(result.percent, null);
    }
});

test('compare marks either open or future comparison period as partial', () => {
    for (const field of ['isOpen', 'isFuture']) {
        assert.equal(monthly.compare(comparisonMonth('2026-02', 150, { [field]: true }), comparisonMonth('2026-01', 100)).partial, true);
        assert.equal(monthly.compare(comparisonMonth('2026-02', 150), comparisonMonth('2026-01', 100, { [field]: true })).partial, true);
    }
});

test('compare treats either month awaiting zero-week confirmation as partial without altering amounts', () => {
    const current = comparisonMonth('2026-02', 150);
    const previous = comparisonMonth('2026-01', 100);
    for (const side of ['current', 'previous']) {
        const selectedCurrent = side === 'current' ? { ...current, coverage: { ...current.coverage, unconfirmedWeeks: ['Week 6'] } } : current;
        const selectedPrevious = side === 'previous' ? { ...previous, coverage: { ...previous.coverage, unconfirmedWeeks: ['Week 1'] } } : previous;
        const result = monthly.compare(selectedCurrent, selectedPrevious);
        assert.equal(result.partial, true);
        assert.equal(result.amount, 50);
        assert.equal(result.percent, 50);
    }
    assert.equal(monthly.compare(
        { ...current, coverage: { ...current.coverage, unconfirmedWeeks: [] } },
        { ...previous, coverage: { ...previous.coverage, unconfirmedWeeks: [] } }
    ).partial, false);
});
