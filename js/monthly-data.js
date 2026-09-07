// Read-only Monthly projection. Never replace or mutate Weekly data/state.
(function (root) {
    'use strict';

    const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const FULL_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const MONTH_PATTERN = [...MONTHS, ...FULL_MONTHS].map(value => value.replace(/\./g, '\\.')).join('|');
    const ENDPOINT = new RegExp(`^(\\d{1,2})\\s*(${MONTH_PATTERN})?\\s*((?:20|25)\\d{2})?$`);
    const number = value => typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const ratio = (actual, total, scale = 1) => total > 0 ? actual / total * scale : null;
    const yearNumber = value => Number(value) >= 2400 ? Number(value) - 543 : Number(value);
    const pad = value => String(value).padStart(2, '0');
    const COMPANIES = ['gfs', 'mhl', 'car'];
    const BUILDING_COMPANIES = ['gfs', 'mhl'];
    const CONTACT_CHANNELS = ['line', 'fb', 'tel'];
    const INSTALL_CHANNELS = [...CONTACT_CHANNELS, 'walkin', 'showroom', 'other'];
    const REP_FIELDS = ['sales', 'meets', 'installs', 'newMeets', 'oldMeets', 'newSales', 'oldSales', 'newInstalls', 'oldInstalls', 'noInstalls', 'noInstallSales'];
    const PROJECT_FIELDS = ['sales', 'meets', 'installs', 'targetMeets', 'newMeets', 'oldMeets'];
    const zeros = keys => Object.fromEntries(keys.map(key => [key, 0]));
    const companyChannels = () => Object.fromEntries(BUILDING_COMPANIES.map(key => [key, zeros(CONTACT_CHANNELS)]));

    function addFields(destination, source, keys, activity) {
        for (const key of keys) {
            const value = number(source?.[key]);
            destination[key] += value;
            if (activity) activity.push(value);
        }
    }

    function emptyPeople(people, fields) {
        return people.map(([key, name]) => ({ key, name, ...zeros(fields), closeRate: null }));
    }

    function dateKey(year, month, day) {
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
            ? `${year}-${pad(month)}-${pad(day)}` : null;
    }

    function endpoint(value) {
        const match = value.trim().match(ENDPOINT);
        if (!match) return null;
        const index = MONTHS.indexOf(match[2]);
        const fullIndex = FULL_MONTHS.indexOf(match[2]);
        return { day: Number(match[1]), month: index >= 0 ? index + 1 : fullIndex >= 0 ? fullIndex + 1 : null, year: match[3] ? yearNumber(match[3]) : null };
    }

    function parsePeriod(value, sourceYear = 2026) {
        // BB-2026 appends working-day counts on a second line; they are not dates.
        const parts = String(value || '').split(/\r?\n/)[0].trim().split(/\s*[-–—]\s*/);
        if (!parts.length || parts.length > 2) return null;
        const left = endpoint(parts[0]);
        const right = endpoint(parts[1] || parts[0]);
        if (!left || !right || (!left.month && !right.month)) return null;
        const startMonth = left.month || right.month;
        const endMonth = right.month || left.month;
        const endYear = right.year || (left.year ? left.year + (endMonth < startMonth ? 1 : 0) : yearNumber(sourceYear));
        const startYear = left.year || endYear - (startMonth > endMonth ? 1 : 0);
        const start = dateKey(startYear, startMonth, left.day);
        const end = dateKey(endYear, endMonth, right.day);
        if (!start || !end || start > end) return null;
        return {
            key: `${endYear}-${pad(endMonth)}`, label: `${FULL_MONTHS[endMonth - 1]} ${endYear}`,
            year: endYear, month: endMonth, start, end, crossMonth: start.slice(0, 7) !== end.slice(0, 7)
        };
    }

    function bangkokToday() {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const part = type => parts.find(item => item.type === type).value;
        return `${part('year')}-${part('month')}-${part('day')}`;
    }

    function emptyMonth(period, today) {
        const thisMonth = today.slice(0, 7);
        return {
            key: period.key, label: period.label, year: period.year, month: period.month, entries: [],
            sales: { actual: 0, target: 0, progress: null, companies: { gfs: { actual: 0, target: 0 }, mhl: { actual: 0, target: 0 }, car: { actual: 0, target: 0 } } },
            marketing: { actual: 0, target: 0, roas: null, companies: Object.fromEntries(COMPANIES.map(key => [key, { actual: 0, target: 0, google: 0, fb: 0, roas: null, budgetProgress: null }])) },
            admin: { contacts: 0, leads: 0, installs: 0, sales: 0, conversion: null, closeRate: null, details: {
                leadsTarget: 0, carLeads: 0, contacts: companyChannels(), leads: companyChannels(),
                newSales: zeros(BUILDING_COMPANIES), oldSales: zeros(BUILDING_COMPANIES),
                newInstalls: zeros(BUILDING_COMPANIES), oldInstalls: zeros(BUILDING_COMPANIES)
            } },
            building: { actual: 0, target: 0, progress: null,
                reps: emptyPeople([['bom', 'BOM'], ['jay', 'Jay'], ['saifha', 'Saifha'], ['kat', 'Kat'], ['image', 'Image'], ['tung', 'Tung']], REP_FIELDS),
                projects: emptyPeople([['projYa', 'YA'], ['projTukta', 'Tukta']], PROJECT_FIELDS),
                repSales: 0, projectSales: 0, meets: 0, installs: 0, closeRate: null
            },
            car: { actual: 0, target: 0, progress: null, installs: 0, installChannels: zeros(INSTALL_CHANNELS),
                contacts: 0, contactChannels: zeros(CONTACT_CHANNELS), claims: 0,
                filmIssueCount: 0, filmIssueValue: 0, techIssueCount: 0, techIssueValue: 0, damage: 0, damageRate: null
            },
            // Legacy tech targets overlap cumulative mappings; only verified flow fields here.
            tech: { installs: 0, area: 0, damage: 0, damageRate: null, details: {
                installs: zeros(BUILDING_COMPANIES), area: zeros(BUILDING_COMPANIES), byTech: 0, byFilm: 0, claims: 0, filmArea: 0
            } },
            coverage: {
                weekCount: 0, elapsedWeekCount: 0, nonZeroWeekCount: 0,
                lastActivityWeek: '', lastActivityEnd: '',
                isFuture: period.key > thisMonth, isOpen: period.key === thisMonth,
                hasPlanDerived: false, hasFutureActual: false, unconfirmedWeeks: [],
                chartData: { sales: false, marketing: false, admin: false, building: false, car: false, tech: false }
            }
        };
    }

    function build(rows, options = {}) {
        const today = /^\d{4}-\d{2}-\d{2}$/.test(options.today || '') ? options.today : bangkokToday();
        const groups = new Map();
        const skipped = [];
        for (const row of Array.isArray(rows) ? rows : []) {
            const period = parsePeriod(row?.dateRange, options.sourceYear || 2026);
            if (!period) {
                skipped.push({ id: String(row?.id || ''), week: String(row?.week || ''), dateRange: String(row?.dateRange || '') });
                continue;
            }
            if (!groups.has(period.key)) groups.set(period.key, emptyMonth(period, today));
            const month = groups.get(period.key);
            const actual = number(getTotalSalesActual(row));
            const target = number(getTotalSalesTarget(row));
            let marketingActual = 0;
            let marketingTarget = 0;
            const departmentActivity = [];
            month.sales.actual += actual;
            month.sales.target += target;
            for (const company of ['gfs', 'mhl', 'car']) {
                month.sales.companies[company].actual += number(row[company]?.actual);
                month.sales.companies[company].target += number(row[company]?.target);
                const spend = number(row.marketing?.[company]?.actual);
                const spendTarget = number(row.marketing?.[company]?.target);
                marketingActual += spend;
                marketingTarget += spendTarget;
                month.marketing.actual += spend;
                month.marketing.target += spendTarget;
                addFields(month.marketing.companies[company], row.marketing?.[company], ['actual', 'google', 'fb'], departmentActivity);
                month.marketing.companies[company].target += spendTarget;
            }
            month.admin.contacts += number(row.admin?.contacts?.total);
            month.admin.leads += number(row.admin?.leads?.actual);
            month.admin.details.carLeads += number(row.admin?.leads?.car);
            month.admin.installs += number(row.admin?.sales?.totalInstalls);
            month.admin.sales += number(row.admin?.sales?.totalSales) || number(row.buildingSales?.totalAdminSales);
            month.tech.installs += number(row.tech?.installs?.actual);
            month.tech.area += number(row.tech?.area?.actual);
            month.tech.damage += number(row.tech?.damage?.totalValue);
            month.admin.details.leadsTarget += number(row.admin?.leads?.target);
            for (const company of BUILDING_COMPANIES) {
                addFields(month.admin.details.contacts[company], row.admin?.contacts?.[company], CONTACT_CHANNELS, departmentActivity);
                addFields(month.admin.details.leads[company], row.admin?.leads?.[company], CONTACT_CHANNELS, departmentActivity);
                month.building.actual += number(row[company]?.actual);
                month.building.target += number(row[company]?.target);
            }
            for (const key of ['newSales', 'oldSales', 'newInstalls', 'oldInstalls']) {
                addFields(month.admin.details[key], row.admin?.sales?.[key], BUILDING_COMPANIES, departmentActivity);
            }
            // These are the already-normalized weekly people shown by Weekly. Never add
            // YTD/snapshot totals or normalize again (which could erase adjustments).
            for (const person of month.building.reps) {
                addFields(person, row.buildingSales?.[person.key], REP_FIELDS, departmentActivity);
            }
            for (const person of month.building.projects) {
                addFields(person, row.buildingSales?.[person.key], PROJECT_FIELDS.filter(key => key !== 'targetMeets'), departmentActivity);
                person.targetMeets += number(row.buildingSales?.[person.key]?.targetMeets);
            }
            addFields(month.car, row.carDetail?.sales, ['actual'], departmentActivity);
            month.car.target += number(row.carDetail?.sales?.target);
            addFields(month.car.installChannels, row.carDetail?.installs, INSTALL_CHANNELS, departmentActivity);
            const carInstalls = typeof row.carDetail?.installs?.total === 'number' && Number.isFinite(row.carDetail.installs.total)
                ? row.carDetail.installs.total : INSTALL_CHANNELS.reduce((sum, key) => sum + number(row.carDetail?.installs?.[key]), 0);
            month.car.installs += carInstalls;
            const carContacts = number(row.carDetail?.contacts?.total);
            month.car.contacts += carContacts;
            departmentActivity.push(carInstalls, carContacts);
            addFields(month.car.contactChannels, row.carDetail?.contacts, CONTACT_CHANNELS, departmentActivity);
            addFields(month.car, row.carDetail?.tech, ['claims', 'filmIssueCount', 'filmIssueValue', 'techIssueCount', 'techIssueValue'], departmentActivity);
            for (const key of ['installs', 'area']) {
                addFields(month.tech.details[key], row.tech?.[key], BUILDING_COMPANIES, departmentActivity);
            }
            addFields(month.tech.details, row.tech?.damage, ['byTech', 'byFilm', 'claims', 'filmArea'], departmentActivity);
            const hasActivity = [actual, marketingActual, number(row.admin?.contacts?.total), number(row.admin?.leads?.actual), number(row.admin?.sales?.totalSales), number(row.buildingSales?.totalAdminSales), number(row.admin?.sales?.totalInstalls), number(row.tech?.installs?.actual), number(row.tech?.area?.actual), number(row.tech?.damage?.totalValue), ...COMPANIES.map(key => number(row[key]?.actual)), ...departmentActivity].some(value => value !== 0);
            const entry = {
                id: String(row.id || ''), week: String(row.week || ''), dateRange: String(row.dateRange || ''),
                start: period.start, end: period.end, crossMonth: period.crossMonth,
                salesActual: actual, salesTarget: target, marketingActual, hasActivity,
                planDerived: row.sourceMode === 'row-weekly-plan'
            };
            // Chart coverage tracks non-zero reported results per subject. A target or
            // a plan-derived row must not create an otherwise empty month on a chart.
            if (!entry.planDerived) {
                const adminSales = number(row.admin?.sales?.totalSales) || number(row.buildingSales?.totalAdminSales);
                month.coverage.chartData.sales ||= actual !== 0;
                month.coverage.chartData.marketing ||= marketingActual !== 0;
                month.coverage.chartData.admin ||= [
                    number(row.admin?.contacts?.total), number(row.admin?.leads?.actual),
                    number(row.admin?.sales?.totalInstalls), adminSales
                ].some(value => value !== 0);
                month.coverage.chartData.building ||= BUILDING_COMPANIES.some(company => number(row[company]?.actual) !== 0);
                month.coverage.chartData.car ||= number(row.carDetail?.sales?.actual) !== 0;
                month.coverage.chartData.tech ||= [
                    number(row.tech?.installs?.actual), number(row.tech?.area?.actual),
                    number(row.tech?.damage?.totalValue)
                ].some(value => value !== 0);
            }
            month.entries.push(entry);
            month.coverage.weekCount++;
            if (period.end <= today) month.coverage.elapsedWeekCount++;
            if (hasActivity) {
                month.coverage.nonZeroWeekCount++;
                if (period.end >= month.coverage.lastActivityEnd) {
                    month.coverage.lastActivityEnd = period.end;
                    month.coverage.lastActivityWeek = entry.week;
                }
            }
            if (entry.planDerived) month.coverage.hasPlanDerived = true;
            if (period.start > today && hasActivity) month.coverage.hasFutureActual = true;
            // Activity from another department cannot confirm that sales/marketing
            // figures are complete. Flag each started row once when a planned core
            // metric still reports zero; retain the row and every department value.
            const salesAwaitingConfirmation = target > 0 && actual === 0;
            const marketingAwaitingConfirmation = marketingTarget > 0 && marketingActual === 0;
            if (period.start <= today && (salesAwaitingConfirmation || marketingAwaitingConfirmation)) {
                month.coverage.unconfirmedWeeks.push(entry.week);
            }
        }

        const months = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
        for (const month of months) {
            month.entries.sort((a, b) => a.end.localeCompare(b.end) || a.start.localeCompare(b.start));
            month.sales.progress = ratio(month.sales.actual, month.sales.target, 100);
            month.marketing.roas = ratio(month.sales.actual, month.marketing.actual);
            month.admin.conversion = ratio(month.admin.leads, month.admin.contacts, 100);
            month.admin.closeRate = ratio(month.admin.installs, month.admin.leads, 100);
            month.tech.damageRate = ratio(month.tech.damage, month.sales.companies.gfs.actual + month.sales.companies.mhl.actual, 100);
            for (const company of COMPANIES) {
                const marketing = month.marketing.companies[company];
                marketing.roas = ratio(month.sales.companies[company].actual, marketing.actual);
                marketing.budgetProgress = ratio(marketing.actual, marketing.target, 100);
            }
            month.building.progress = ratio(month.building.actual, month.building.target, 100);
            month.building.repSales = month.building.reps.reduce((sum, person) => sum + person.sales, 0);
            month.building.projectSales = month.building.projects.reduce((sum, person) => sum + person.sales, 0);
            for (const person of [...month.building.reps, ...month.building.projects]) {
                person.closeRate = ratio(person.installs, person.meets, 100);
                month.building.meets += person.meets;
                month.building.installs += person.installs;
            }
            month.building.closeRate = ratio(month.building.installs, month.building.meets, 100);
            month.car.progress = ratio(month.car.actual, month.car.target, 100);
            month.car.damage = month.car.filmIssueValue + month.car.techIssueValue;
            month.car.damageRate = ratio(month.car.damage, month.car.actual, 100);
        }
        const active = months.filter(month => !month.coverage.isFuture && month.entries.some(entry => entry.hasActivity && entry.start <= today));
        const past = months.filter(month => !month.coverage.isFuture);
        const initial = active[active.length - 1] || past[past.length - 1] || months[0];
        return { months, skipped, defaultMonthKey: initial?.key || '' };
    }

    function compare(current, previous) {
        if (!current || !previous) return null;
        const previousDate = new Date(Date.UTC(current.year, current.month - 2, 1));
        const expected = `${previousDate.getUTCFullYear()}-${pad(previousDate.getUTCMonth() + 1)}`;
        if (previous.key !== expected) return null;
        const amount = current.sales.actual - previous.sales.actual;
        return {
            amount, percent: ratio(amount, previous.sales.actual, 100),
            partial: Boolean(current.coverage.isOpen || previous.coverage.isOpen || current.coverage.isFuture || previous.coverage.isFuture || current.coverage.unconfirmedWeeks?.length || previous.coverage.unconfirmedWeeks?.length)
        };
    }

    root.BBMonthlyData = Object.freeze({ parsePeriod, build, compare });
})(window);
