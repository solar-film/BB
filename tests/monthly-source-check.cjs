// Read the authorized BB-2026 CSV on stdin; no source data is saved to disk.
// PowerShell: $response.Content | node tests/monthly-source-check.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const csv = fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '');
const COMPANIES = ['gfs', 'mhl', 'car'];
const BUILDING_COMPANIES = ['gfs', 'mhl'];
const CONTACT_CHANNELS = ['line', 'fb', 'tel'];
const INSTALL_CHANNELS = [...CONTACT_CHANNELS, 'walkin', 'showroom', 'other'];
const REPS = ['bom', 'jay', 'saifha', 'kat', 'image', 'tung'];
const PROJECTS = ['projYa', 'projTukta'];
const REP_FIELDS = ['sales', 'meets', 'installs', 'newMeets', 'oldMeets', 'newSales', 'oldSales', 'newInstalls', 'oldInstalls', 'noInstalls', 'noInstallSales'];
const PROJECT_FIELDS = ['sales', 'meets', 'installs', 'targetMeets', 'newMeets', 'oldMeets'];
const FORBIDDEN_KEYS = new Set(['ytd', 'teams', 'teamSize', 'installTarget', 'areaTarget', 'damagePercent', 'projMoos']);
const n = value => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const sum = (rows, read) => rows.reduce((total, row) => total + n(read(row)), 0);
const ratio = (numerator, denominator, scale = 1) => denominator > 0 ? numerator / denominator * scale : null;
const totalActual = row => {
    const companies = COMPANIES.reduce((total, key) => total + n(row[key]?.actual), 0);
    return typeof row.salesActualTotal === 'number' && Number.isFinite(row.salesActualTotal)
        && (row.salesActualTotal > 0 || companies === 0) ? row.salesActualTotal : companies;
};
const totalTarget = row => {
    const companies = COMPANIES.reduce((total, key) => total + n(row[key]?.target), 0);
    return typeof row.salesTargetTotal === 'number' && Number.isFinite(row.salesTargetTotal)
        && (row.salesTargetTotal > 0 || companies === 0) ? row.salesTargetTotal : companies;
};
function near(actual, expected, label) {
    if (expected === null) assert.equal(actual, null, label);
    else assert.ok(typeof actual === 'number' && Number.isFinite(actual) && Math.abs(actual - expected) < 0.01, `${label}: ${actual} !== ${expected}`);
}
function assertNoUnsafeKeys(value, location = 'month') {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
        assert.equal(FORBIDDEN_KEYS.has(key), false, `${location}.${key} must not be modeled monthly`);
        assertNoUnsafeKeys(child, `${location}.${key}`);
    }
}
const context = vm.createContext({
    console, Intl, Date,
    document: { getElementById: () => ({ classList: { add() {}, remove() {} } }) },
    fetch: async () => ({ ok: true, text: async () => csv }),
    window: { addEventListener() {} }
});
for (const file of ['js/helpers.js', 'js/data.js', 'js/app.js', 'js/monthly-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
vm.runInContext('updateDashboardUI = () => {}; loadFeedbackData = async () => {};', context);

(async () => {
    await vm.runInContext('loadData()', context);
    assert.equal(vm.runInContext('isUsingMock', context), false, 'Original loader must read real CSV, not fallback');
    const before = vm.runInContext('JSON.stringify(dashboardData)', context);
    const selected = vm.runInContext('selectedId', context);
    const rows = JSON.parse(before);
    const model = context.window.BBMonthlyData.build(vm.runInContext('dashboardData', context));
    assert.ok(model.months.length, 'Monthly periods must be present');
    assert.equal(model.skipped.length, 0, 'All source week date ranges must parse');
    let checkedWeeks = 0;
    for (const month of model.months) {
        const ids = new Set(month.entries.map(entry => entry.id));
        const sourceRows = rows.filter(row => ids.has(String(row.id || '')));
        assert.equal(sourceRows.length, month.entries.length, `${month.key}: source weeks must be unique and recoverable`);
        for (const entry of month.entries) {
            context.weekId = entry.id;
            const legacy = vm.runInContext('selectedId = weekId; calculateMetrics(dashboardData.find(row => row.id === selectedId)).monthly', context);
            assert.ok(Math.abs(legacy.a - month.sales.actual) < 0.01, `${month.key}: actual must match existing Monthly KPI`);
            assert.ok(Math.abs(legacy.t - month.sales.target) < 0.01, `${month.key}: target must match existing Monthly KPI`);
            checkedWeeks++;
        }
        const total = month.entries.reduce((sum, entry) => sum + entry.salesActual, 0);
        assert.ok(Math.abs(total - month.sales.actual) < 0.01, 'Week table and monthly card must reconcile');

        // Sales and Marketing: sum raw weekly flow fields, never model snapshots.
        near(month.sales.actual, sum(sourceRows, totalActual), `${month.key} sales.actual`);
        near(month.sales.target, sum(sourceRows, totalTarget), `${month.key} sales.target`);
        near(month.sales.progress, ratio(month.sales.actual, month.sales.target, 100), `${month.key} sales.progress`);
        for (const company of COMPANIES) {
            const expectedSalesActual = sum(sourceRows, row => row[company]?.actual);
            const expectedSalesTarget = sum(sourceRows, row => row[company]?.target);
            near(month.sales.companies[company].actual, expectedSalesActual, `${month.key} ${company} sales.actual`);
            near(month.sales.companies[company].target, expectedSalesTarget, `${month.key} ${company} sales.target`);
            for (const field of ['actual', 'target', 'google', 'fb']) {
                near(month.marketing.companies[company][field], sum(sourceRows, row => row.marketing?.[company]?.[field]), `${month.key} ${company} marketing.${field}`);
            }
            near(month.marketing.companies[company].roas,
                ratio(expectedSalesActual, month.marketing.companies[company].actual), `${month.key} ${company} marketing.roas`);
            near(month.marketing.companies[company].budgetProgress,
                ratio(month.marketing.companies[company].actual, month.marketing.companies[company].target, 100), `${month.key} ${company} marketing.budgetProgress`);
        }
        near(month.marketing.actual, COMPANIES.reduce((total, key) => total + month.marketing.companies[key].actual, 0), `${month.key} marketing.actual`);
        near(month.marketing.target, COMPANIES.reduce((total, key) => total + month.marketing.companies[key].target, 0), `${month.key} marketing.target`);
        near(month.marketing.roas, ratio(month.sales.actual, month.marketing.actual), `${month.key} marketing.roas`);

        // Admin: building totals and channel detail only. CAR duplicates are intentionally absent.
        near(month.admin.contacts, sum(sourceRows, row => row.admin?.contacts?.total), `${month.key} admin.contacts`);
        near(month.admin.leads, sum(sourceRows, row => row.admin?.leads?.actual), `${month.key} admin.leads`);
        near(month.admin.installs, sum(sourceRows, row => row.admin?.sales?.totalInstalls), `${month.key} admin.installs`);
        near(month.admin.sales, sourceRows.reduce((total, row) => total + (n(row.admin?.sales?.totalSales) || n(row.buildingSales?.totalAdminSales)), 0), `${month.key} admin.sales`);
        near(month.admin.details.leadsTarget, sum(sourceRows, row => row.admin?.leads?.target), `${month.key} admin.leadsTarget`);
        assert.deepEqual(Object.keys(month.admin.details.contacts).sort(), [...BUILDING_COMPANIES].sort(), `${month.key}: no duplicate CAR contacts in Admin`);
        assert.deepEqual(Object.keys(month.admin.details.leads).sort(), [...BUILDING_COMPANIES].sort(), `${month.key}: no duplicate CAR leads in Admin`);
        for (const company of BUILDING_COMPANIES) {
            for (const channel of CONTACT_CHANNELS) {
                near(month.admin.details.contacts[company][channel], sum(sourceRows, row => row.admin?.contacts?.[company]?.[channel]), `${month.key} admin ${company} contacts.${channel}`);
                near(month.admin.details.leads[company][channel], sum(sourceRows, row => row.admin?.leads?.[company]?.[channel]), `${month.key} admin ${company} leads.${channel}`);
            }
            for (const field of ['newSales', 'oldSales', 'newInstalls', 'oldInstalls']) {
                near(month.admin.details[field][company], sum(sourceRows, row => row.admin?.sales?.[field]?.[company]), `${month.key} admin ${field}.${company}`);
            }
        }
        near(month.admin.conversion, ratio(month.admin.leads, month.admin.contacts, 100), `${month.key} admin.conversion`);
        near(month.admin.closeRate, ratio(month.admin.installs, month.admin.leads, 100), `${month.key} admin.closeRate`);

        // Building: only GFS + MHL business flows and the roster already shown by Weekly.
        near(month.building.actual, sum(sourceRows, row => n(row.gfs?.actual) + n(row.mhl?.actual)), `${month.key} building.actual`);
        near(month.building.target, sum(sourceRows, row => n(row.gfs?.target) + n(row.mhl?.target)), `${month.key} building.target`);
        near(month.building.progress, ratio(month.building.actual, month.building.target, 100), `${month.key} building.progress`);
        assert.deepEqual(Array.from(month.building.reps, person => person.key), REPS, `${month.key}: Weekly rep roster`);
        assert.deepEqual(Array.from(month.building.projects, person => person.key), PROJECTS, `${month.key}: Weekly project roster without projMoos`);
        for (const [people, keys, fields] of [[month.building.reps, REPS, REP_FIELDS], [month.building.projects, PROJECTS, PROJECT_FIELDS]]) {
            for (const key of keys) {
                const person = people.find(item => item.key === key);
                for (const field of fields) near(person[field], sum(sourceRows, row => row.buildingSales?.[key]?.[field]), `${month.key} ${key}.${field}`);
                near(person.closeRate, ratio(person.installs, person.meets, 100), `${month.key} ${key}.closeRate`);
            }
        }
        near(month.building.repSales, month.building.reps.reduce((total, person) => total + person.sales, 0), `${month.key} building.repSales`);
        near(month.building.projectSales, month.building.projects.reduce((total, person) => total + person.sales, 0), `${month.key} building.projectSales`);
        near(month.building.meets, [...month.building.reps, ...month.building.projects].reduce((total, person) => total + person.meets, 0), `${month.key} building.meets`);
        near(month.building.installs, [...month.building.reps, ...month.building.projects].reduce((total, person) => total + person.installs, 0), `${month.key} building.installs`);
        near(month.building.closeRate, ratio(month.building.installs, month.building.meets, 100), `${month.key} building.closeRate`);

        // CAR: sales, outcomes, source channels and issue flows. Never use legacy damagePercent/teamSize.
        near(month.car.actual, sum(sourceRows, row => row.carDetail?.sales?.actual), `${month.key} car.actual`);
        near(month.car.target, sum(sourceRows, row => row.carDetail?.sales?.target), `${month.key} car.target`);
        const expectedCarInstalls = sourceRows.reduce((total, row) => {
            const sourceTotal = row.carDetail?.installs?.total;
            return total + (typeof sourceTotal === 'number' && Number.isFinite(sourceTotal)
                ? sourceTotal : INSTALL_CHANNELS.reduce((subtotal, key) => subtotal + n(row.carDetail?.installs?.[key]), 0));
        }, 0);
        near(month.car.installs, expectedCarInstalls, `${month.key} car.installs`);
        for (const channel of INSTALL_CHANNELS) near(month.car.installChannels[channel], sum(sourceRows, row => row.carDetail?.installs?.[channel]), `${month.key} car installs.${channel}`);
        near(month.car.contacts, sum(sourceRows, row => row.carDetail?.contacts?.total), `${month.key} car.contacts`);
        for (const channel of CONTACT_CHANNELS) near(month.car.contactChannels[channel], sum(sourceRows, row => row.carDetail?.contacts?.[channel]), `${month.key} car contacts.${channel}`);
        for (const field of ['claims', 'filmIssueCount', 'filmIssueValue', 'techIssueCount', 'techIssueValue']) {
            near(month.car[field], sum(sourceRows, row => row.carDetail?.tech?.[field]), `${month.key} car.${field}`);
        }
        near(month.car.damage, month.car.filmIssueValue + month.car.techIssueValue, `${month.key} car.damage`);
        near(month.car.progress, ratio(month.car.actual, month.car.target, 100), `${month.key} car.progress`);
        near(month.car.damageRate, ratio(month.car.damage, month.car.actual, 100), `${month.key} car.damageRate`);

        // Building technician: verified flows and breakdowns; targets/snapshots are forbidden.
        near(month.tech.installs, sum(sourceRows, row => row.tech?.installs?.actual), `${month.key} tech.installs`);
        near(month.tech.area, sum(sourceRows, row => row.tech?.area?.actual), `${month.key} tech.area`);
        near(month.tech.damage, sum(sourceRows, row => row.tech?.damage?.totalValue), `${month.key} tech.damage`);
        for (const company of BUILDING_COMPANIES) {
            near(month.tech.details.installs[company], sum(sourceRows, row => row.tech?.installs?.[company]), `${month.key} tech installs.${company}`);
            near(month.tech.details.area[company], sum(sourceRows, row => row.tech?.area?.[company]), `${month.key} tech area.${company}`);
        }
        for (const field of ['byTech', 'byFilm', 'claims', 'filmArea']) near(month.tech.details[field], sum(sourceRows, row => row.tech?.damage?.[field]), `${month.key} tech damage.${field}`);
        near(month.tech.damageRate, ratio(month.tech.damage, month.building.actual, 100), `${month.key} tech.damageRate`);

        assertNoUnsafeKeys(month);
        assert.equal(Object.prototype.hasOwnProperty.call(month.admin, 'car'), false, `${month.key}: legacy Admin CAR duplicate absent`);
    }
    context.originalSelection = selected;
    vm.runInContext('selectedId = originalSelection', context);
    assert.equal(vm.runInContext('JSON.stringify(dashboardData)', context), before);
    console.log(JSON.stringify({ status: 'passed', source: 'BB-2026', sourceRows: checkedWeeks, monthCount: model.months.length, skipped: model.skipped.length, planDerived: model.months.some(month => month.coverage.hasPlanDerived), checkGroups: ['loader/dates/immutability', 'sales/marketing', 'admin/details', 'building/people', 'CAR/details', 'tech/details', 'ratios/unsafe-absence'] }));
})().catch(error => { console.error(error); process.exitCode = 1; });
