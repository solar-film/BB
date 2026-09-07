const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console });
context.window = context;
for (const file of ['js/helpers.js', 'js/monthly-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const model = context.BBMonthlyData;
const plain = value => JSON.parse(JSON.stringify(value));
const sumMonth = rows => model.build(rows, { today: '2026-02-28' }).months[0];
const week = (id, fields = {}) => ({ id: String(id), week: `Week ${id}`, dateRange: id === 2 ? '8–14 ม.ค. 2026' : '1–7 ม.ค. 2026', ...fields });
function near(value, expected) {
    assert.ok(Number.isFinite(value));
    assert.ok(Math.abs(value - expected) < 1e-9, `${value} != ${expected}`);
}
function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
}

test('marketing companies sum original budget/channel fields and recompute weighted ratios', () => {
    const month = sumMonth([
        week(1, { gfs: { actual: 1000 }, mhl: { actual: 500 }, car: { actual: 300 }, marketing: {
            gfs: { actual: 100, target: 200, google: 80, fb: 20 },
            mhl: { actual: 50, target: 100, google: 30, fb: 20 },
            car: { actual: 20, target: 40, google: 5, fb: 15 }
        } }),
        week(2, { gfs: { actual: 2000 }, mhl: { actual: 50 }, car: { actual: 100 }, marketing: {
            gfs: { actual: 900, target: 800, google: 700, fb: 200 },
            mhl: { actual: 5, target: 10, google: 3, fb: 2 },
            car: { actual: 10, target: 20, google: 5, fb: 5 }
        } })
    ]);
    assert.deepEqual(plain(month.marketing.companies.gfs), { actual: 1000, target: 1000, google: 780, fb: 220, roas: 3, budgetProgress: 100 });
    near(month.marketing.companies.mhl.roas, 10);
    near(month.marketing.companies.car.roas, 400 / 30);
    assert.equal(month.marketing.actual, 1085);
    assert.equal(month.marketing.target, 1170);
    assert.equal(month.sales.actual, 3950);
    near(month.marketing.roas, 3950 / 1085);
});

test('admin separates company channels and new/old flows without reinterpreting authoritative totals', () => {
    const month = sumMonth([week(1, { admin: {
        contacts: { total: 100, gfs: { line: 1, fb: 2, tel: 3 }, mhl: { line: 4, fb: 5, tel: 6 }, car: 99999 },
        leads: { actual: 30, target: 40, gfs: { line: 7, fb: 8, tel: 9 }, mhl: { line: 10, fb: 11, tel: 12 }, car: 99999 },
        sales: { totalSales: 500, totalInstalls: 5, newSales: { gfs: 100, mhl: 200 }, oldSales: { gfs: 30, mhl: 40 }, newInstalls: { gfs: 1, mhl: 2 }, oldInstalls: { gfs: 3, mhl: 4 } }
    } }), week(2, { admin: {
        contacts: { total: 900, gfs: { line: 10, fb: 20, tel: 30 }, mhl: { line: 40, fb: 50, tel: 60 } },
        leads: { actual: 90, target: 100, gfs: { line: 70, fb: 80, tel: 90 }, mhl: { line: 100, fb: 110, tel: 120 } },
        sales: { totalSales: 2500, totalInstalls: 15, newSales: { gfs: 1000, mhl: 2000 }, oldSales: { gfs: 300, mhl: 400 }, newInstalls: { gfs: 10, mhl: 20 }, oldInstalls: { gfs: 30, mhl: 40 } }
    } })]);
    assert.equal(month.admin.contacts, 1000);
    assert.equal(month.admin.sales, 3000);
    assert.equal(month.admin.details.leadsTarget, 140);
    assert.equal(month.admin.details.carLeads, 99999);
    assert.deepEqual(plain(month.admin.details.contacts.gfs), { line: 11, fb: 22, tel: 33 });
    assert.deepEqual(plain(month.admin.details.leads.mhl), { line: 110, fb: 121, tel: 132 });
    assert.deepEqual(plain(month.admin.details.newSales), { gfs: 1100, mhl: 2200 });
    assert.deepEqual(plain(month.admin.details.oldInstalls), { gfs: 33, mhl: 44 });
    near(month.admin.conversion, 12);
    near(month.admin.closeRate, 20 / 120 * 100);
    assert.equal('car' in month.admin.details.contacts, false);
    assert.equal('car' in month.admin.details.leads, false);
});

test('building people use weekly normalized flows and exclude all cumulative summary mappings', () => {
    const month = sumMonth([week(1, {
        gfs: { actual: 1000, target: 2000 }, mhl: { actual: 500, target: 600 },
        buildingSales: {
            totalRepSales: 900000, totalProjSales: 800000,
            bom: { sales: 300, meets: 2, installs: 1, newMeets: 1, oldMeets: 1, newSales: 100, oldSales: 150, newInstalls: 1, oldInstalls: 0, noInstalls: 1, noInstallSales: 50, ytd: 1000000, sr: 999 },
            projYa: { sales: 200, meets: 8, installs: 2, targetMeets: 10, newMeets: 3, oldMeets: 5, ytd: 2000000 },
            projMoos: { sales: 999999, meets: 999, installs: 999 }
        }
    }), week(2, {
        gfs: { actual: 2000, target: 3000 }, mhl: { actual: 700, target: 800 },
        buildingSales: {
            bom: { sales: 700, meets: 18, installs: 3, newMeets: 8, oldMeets: 10, newSales: 500, oldSales: 150, newInstalls: 2, oldInstalls: 1, noInstalls: 2, noInstallSales: 50, ytd: 2000000, sr: 999 },
            projYa: { sales: 600, meets: 12, installs: 4, targetMeets: 20, newMeets: 7, oldMeets: 5, ytd: 3000000 },
            projTukta: { sales: 100, meets: 2, installs: 1 }
        }
    })]);
    assert.equal(month.building.actual, 4200);
    assert.equal(month.building.target, 6400);
    near(month.building.progress, 4200 / 6400 * 100);
    assert.deepEqual(plain(month.building.reps.map(person => person.name)), ['BOM', 'Jay', 'Saifha', 'Kat', 'Image', 'Tung']);
    assert.deepEqual(plain(month.building.projects.map(person => person.name)), ['YA', 'Tukta']);
    assert.deepEqual(plain(month.building.reps[0]), { key: 'bom', name: 'BOM', sales: 1000, meets: 20, installs: 4, newMeets: 9, oldMeets: 11, newSales: 600, oldSales: 300, newInstalls: 3, oldInstalls: 1, noInstalls: 3, noInstallSales: 100, closeRate: 20 });
    assert.equal(month.building.repSales, 1000);
    assert.equal(month.building.projectSales, 900);
    assert.equal(month.building.projects[0].targetMeets, 30);
    assert.equal(month.building.projects[0].closeRate, 30);
    assert.equal(month.building.meets, 42);
    assert.equal(month.building.installs, 11);
    near(month.building.closeRate, 11 / 42 * 100);
    assert.equal(JSON.stringify(month.building).includes('ytd'), false);
    assert.equal(JSON.stringify(month.building).includes('Moos'), false);
});

test('CAR preserves independent detail sales and explicit zero installs; sums channels only when total is absent', () => {
    const month = sumMonth([week(1, { car: { actual: 9000, target: 10000 }, carDetail: {
        sales: { actual: 1000, target: 2000 }, installs: { total: 0, line: 3, fb: 4 },
        contacts: { total: 20, line: 5, fb: 10, tel: 5 },
        tech: { claims: 1, filmIssueCount: 2, filmIssueValue: 10, techIssueCount: 3, techIssueValue: 20, damagePercent: 500, teamSize: 10 }
    } }), week(2, { car: { actual: 8000, target: 9000 }, carDetail: {
        sales: { actual: 3000, target: 5000 }, installs: { line: 1, fb: 2, tel: 3, walkin: 4, showroom: 5, other: 6 },
        contacts: { total: 80, line: 15, fb: 25, tel: 40 },
        tech: { claims: 4, filmIssueCount: 5, filmIssueValue: 30, techIssueCount: 6, techIssueValue: 40, damagePercent: 800, teamSize: 15 }
    } })]);
    assert.equal(month.sales.companies.car.actual, 17000);
    assert.equal(month.car.actual, 4000);
    assert.equal(month.car.target, 7000);
    near(month.car.progress, 4000 / 7000 * 100);
    assert.equal(month.car.installs, 21);
    assert.deepEqual(plain(month.car.installChannels), { line: 4, fb: 6, tel: 3, walkin: 4, showroom: 5, other: 6 });
    assert.equal(month.car.contacts, 100);
    assert.deepEqual(plain(month.car.contactChannels), { line: 20, fb: 35, tel: 45 });
    assert.equal(month.car.claims, 5);
    assert.equal(month.car.filmIssueCount, 7);
    assert.equal(month.car.techIssueCount, 9);
    assert.equal(month.car.damage, 100);
    assert.equal(month.car.damageRate, 2.5);
    assert.equal('damagePercent' in month.car, false);
    assert.equal('teamSize' in month.car, false);
});

test('tech splits preserve authoritative monthly totals, omit cumulative targets and headcounts', () => {
    const month = sumMonth([week(1, { gfs: { actual: 1000 }, mhl: { actual: 1000 }, tech: {
        installs: { actual: 10, gfs: 3, mhl: 4, ytd: 99999, target: 99999 },
        area: { actual: 200, gfs: 70, mhl: 80, ytd: 99999, target: 99999 },
        teams: 99, damage: { totalValue: 100, byTech: 20, byFilm: 30, claims: 2, filmArea: 8, ytd: 99999 }
    } }), week(2, { tech: {
        installs: { actual: 20, gfs: 5, mhl: 6 }, area: { actual: 300, gfs: 90, mhl: 100 },
        damage: { totalValue: 200, byTech: 40, byFilm: 50, claims: 3, filmArea: 12 }
    } })]);
    assert.equal(month.tech.installs, 30);
    assert.equal(month.tech.area, 500);
    assert.equal(month.tech.damage, 300);
    assert.equal(month.tech.damageRate, 15);
    assert.deepEqual(plain(month.tech.details), { installs: { gfs: 8, mhl: 10 }, area: { gfs: 160, mhl: 180 }, byTech: 60, byFilm: 80, claims: 5, filmArea: 20 });
    assert.equal(/ytd|target|teams/.test(JSON.stringify(month.tech)), false);
});

test('new metrics preserve finite negative adjustments and decimals without a second normalization', () => {
    const month = sumMonth([week(1, {
        marketing: { gfs: { actual: -1.25, google: -1.25, fb: 0 } },
        admin: { sales: { oldSales: { mhl: -20.75 } } },
        buildingSales: { bom: { sales: -100.25, meets: -2, installs: -1, newSales: 900 }, projYa: { sales: -50.5 } },
        carDetail: { sales: { actual: 1000, target: 100 }, installs: { total: -1 }, tech: { filmIssueValue: -2.25, techIssueValue: 3.75 } },
        tech: { damage: { byTech: -10.5 } }
    })]);
    assert.equal(month.marketing.companies.gfs.actual, -1.25);
    assert.equal(month.marketing.companies.gfs.roas, null);
    assert.equal(month.admin.details.oldSales.mhl, -20.75);
    assert.equal(month.building.repSales, -100.25);
    assert.equal(month.building.projectSales, -50.5);
    assert.equal(month.building.reps[0].closeRate, null);
    assert.equal(month.car.installs, -1);
    assert.equal(month.car.damage, 1.5);
    assert.equal(month.car.damageRate, 0.15);
    assert.equal(month.tech.details.byTech, -10.5);
});

test('missing or non-finite detail numbers do not contaminate totals, and unavailable ratios stay null', () => {
    const month = sumMonth([week(1, {
        marketing: { gfs: { google: '100', fb: Infinity } },
        admin: { leads: { target: NaN, gfs: { line: '5', tel: Infinity } }, sales: { newSales: { mhl: NaN } } },
        buildingSales: { bom: { sales: NaN, meets: Infinity, installs: '5' } },
        carDetail: { sales: { actual: '1000', target: Infinity }, installs: { total: NaN, line: 2, fb: Infinity }, contacts: { total: '50' }, tech: { filmIssueValue: NaN } },
        tech: { area: { gfs: '100' }, damage: { byTech: Infinity } }
    })]);
    assert.equal(month.marketing.companies.gfs.google, 0);
    assert.equal(month.marketing.companies.gfs.fb, 0);
    assert.equal(month.marketing.companies.gfs.roas, null);
    assert.equal(month.marketing.companies.gfs.budgetProgress, null);
    assert.equal(month.admin.details.leadsTarget, 0);
    assert.equal(month.admin.details.leads.gfs.line, 0);
    assert.equal(month.building.repSales, 0);
    assert.equal(month.building.closeRate, null);
    assert.equal(month.car.actual, 0);
    assert.equal(month.car.installs, 2);
    assert.equal(month.car.contacts, 0);
    assert.equal(month.car.progress, null);
    assert.equal(month.car.damageRate, null);
    assert.equal(month.tech.details.byTech, 0);
    const empty = sumMonth([week(1)]);
    assert.equal(empty.car.installs, 0);
    assert.equal(empty.building.reps.length, 6);
    assert.equal(empty.building.projects.length, 2);
    assert.ok(empty.building.reps.every(person => person.closeRate === null));
});

const departmentActivityCases = [
    ['marketing channel', { marketing: { gfs: { google: 1 } } }],
    ['admin contact channel', { admin: { contacts: { mhl: { line: 1 } } } }],
    ['admin lead channel', { admin: { leads: { gfs: { tel: 1 } } } }],
    ['admin new/old sales', { admin: { sales: { oldSales: { gfs: -1 } } } }],
    ['admin new/old installs', { admin: { sales: { newInstalls: { mhl: 1 } } } }],
    ['building rep', { buildingSales: { image: { noInstallSales: 1 } } }],
    ['building project', { buildingSales: { projTukta: { meets: 1 } } }],
    ['CAR detail sale', { carDetail: { sales: { actual: 1 } } }],
    ['CAR installation', { carDetail: { installs: { total: 1 } } }],
    ['CAR installation channel', { carDetail: { installs: { total: 0, showroom: 1 } } }],
    ['CAR contact', { carDetail: { contacts: { total: 1 } } }],
    ['CAR contact channel', { carDetail: { contacts: { fb: 1 } } }],
    ['CAR claim', { carDetail: { tech: { claims: 1 } } }],
    ['CAR film issue', { carDetail: { tech: { filmIssueValue: -1 } } }],
    ['CAR tech issue', { carDetail: { tech: { techIssueCount: 1 } } }],
    ['building tech installation split', { tech: { installs: { gfs: 1 } } }],
    ['building tech area split', { tech: { area: { mhl: 1 } } }],
    ['building tech damage', { tech: { damage: { byTech: 1 } } }]
];
for (const [label, fields] of departmentActivityCases) {
    test(`activity detection includes ${label} without needing global sales`, () => {
        const result = model.build([week(1, { dateRange: '1–7 ม.ค. 2026', gfs: { actual: 10 } }), week(2, {
            ...fields, dateRange: '1–7 ก.พ. 2026', salesTargetTotal: 100
        })], { today: '2026-03-01' });
        const month = result.months[1];
        assert.equal(month.sales.actual, 0);
        assert.equal(month.coverage.nonZeroWeekCount, 1);
        assert.equal(month.entries[0].hasActivity, true);
        assert.deepEqual(plain(month.coverage.unconfirmedWeeks), ['Week 2']);
        assert.equal(result.defaultMonthKey, '2026-02');
    });
}

test('department activity cannot hide missing sales and marketing actuals or enable a complete MoM comparison', () => {
    const result = model.build([
        week(1, {
            dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 100,
            marketing: { gfs: { actual: 10, target: 10 } }
        }),
        week(2, {
            dateRange: '1–7 ก.พ. 2026', salesTargetTotal: 200,
            marketing: { gfs: { target: 20 } },
            tech: { installs: { actual: 7 } },
            buildingSales: { bom: { sales: 50 } }
        })
    ], { today: '2026-03-01' });
    const [january, february] = result.months;
    assert.equal(february.entries[0].hasActivity, true);
    assert.equal(february.coverage.nonZeroWeekCount, 1);
    assert.deepEqual(plain(february.coverage.unconfirmedWeeks), ['Week 2']);
    const comparison = model.compare(february, january);
    assert.equal(comparison.partial, true);
    assert.equal(comparison.amount, -100);
    assert.equal(comparison.percent, -100);
});

test('targets, legacy duplicate CAR fields, ratios, snapshots and headcounts never masquerade as reported activity', () => {
    const month = sumMonth([week(1, {
        gfs: { target: 100 },
        marketing: { car: { target: 100 } },
        admin: { contacts: { car: 100 }, leads: { target: 100, car: 100 } },
        buildingSales: { totalRepSales: 100, totalProjSales: 100, bom: { ytd: 100, sr: 100 }, projYa: { targetMeets: 100, ytd: 100 }, projMoos: { sales: 100 } },
        carDetail: { sales: { target: 100 }, tech: { damagePercent: 100, teamSize: 100 } },
        tech: { installs: { ytd: 100, target: 100 }, area: { ytd: 100, target: 100 }, teams: 100, damage: { ytd: 100 } }
    })]);
    assert.equal(month.entries[0].hasActivity, false);
    assert.equal(month.coverage.nonZeroWeekCount, 0);
    assert.deepEqual(plain(month.coverage.unconfirmedWeeks), ['Week 1']);
    assert.equal(month.building.projects[0].targetMeets, 100);
});

test('department-only future actuals are still retained and clearly flagged', () => {
    const month = model.build([week(1, { dateRange: '1–7 มี.ค. 2026', carDetail: { contacts: { total: 2 } } })], { today: '2026-02-28' }).months[0];
    assert.equal(month.car.contacts, 2);
    assert.equal(month.coverage.isFuture, true);
    assert.equal(month.coverage.hasFutureActual, true);
});

test('department model accepts frozen source and independently allocates every nested output', () => {
    const source = deepFreeze([week(1, { buildingSales: { bom: { sales: 10 } }, marketing: { gfs: { google: 2 } }, carDetail: { installs: { line: 1 } } }), week(2, { dateRange: '1–7 ก.พ. 2026' })]);
    const before = JSON.stringify(source);
    const first = model.build(source, { today: '2026-03-01' });
    const second = model.build(source, { today: '2026-03-01' });
    first.months[0].building.reps[0].sales = 12345;
    first.months[0].marketing.companies.gfs.google = 12345;
    first.months[0].admin.details.contacts.gfs.line = 12345;
    first.months[0].car.installChannels.line = 12345;
    first.months[0].tech.details.area.gfs = 12345;
    assert.equal(second.months[0].building.reps[0].sales, 10);
    assert.equal(second.months[0].marketing.companies.gfs.google, 2);
    assert.equal(first.months[0].admin.details.contacts.mhl.line, 0);
    assert.equal(first.months[0].admin.details.leads.gfs.line, 0);
    assert.equal(first.months[1].tech.details.area.gfs, 0);
    assert.equal(JSON.stringify(source), before);
});
