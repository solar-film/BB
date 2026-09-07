const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Deliberately non-browser regression tests: real application functions and HTML,
// minimal DOM/Chart stubs, no network, no chart-layout or visual claims.
const root = path.resolve(__dirname, '..');
const indexHTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const localScripts = Array.from(indexHTML.matchAll(/<script\s+src="(js\/[^"?]+)(?:\?[^" ]*)?"/g), match => match[1]);
const legacyPages = ['overview', 'sales', 'car', 'admin', 'marketing', 'tech'];

function createHarness() {
    const elements = new Map();
    const warnings = [];
    const scheduled = [];
    const chartInstances = [];
    const scrolls = [];
    const scrollTos = [];
    const focusCalls = [];
    const counters = { fetch: 0, chartDestroyed: 0, icons: 0 };
    let chartMustFail = false;
    let chartDetails = null;
    let reducedMotion = false;
    let document;

    class Element {
        constructor(id = '', tagName = 'div') {
            this.id = id;
            this.tagName = tagName.toUpperCase();
            this.className = '';
            this.innerText = '';
            this.textContent = '';
            this.attributes = {};
            this.style = {};
            this.open = false;
            this.hidden = false;
            this.scrollTop = 0;
            this._listeners = new Map();
            this._html = '';
            this._children = [];
            const classes = () => new Set(this.className.split(/\s+/).filter(Boolean));
            this.classList = {
                add: (...values) => { const list = classes(); values.forEach(value => list.add(value)); this.className = [...list].join(' '); },
                remove: (...values) => { const list = classes(); values.forEach(value => list.delete(value)); this.className = [...list].join(' '); },
                contains: value => classes().has(value),
                toggle: (value, force) => {
                    const enabled = force === undefined ? !classes().has(value) : Boolean(force);
                    this.classList[enabled ? 'add' : 'remove'](value);
                    return enabled;
                }
            };
        }

        set innerHTML(value) {
            this._children.forEach(id => elements.delete(id));
            this._children = [];
            this._html = String(value);
            parseElements(this._html).forEach(element => {
                elements.set(element.id, element);
                this._children.push(element.id);
            });
            if (this.id === 'dashboard-content') {
                chartDetails = this._html.includes('monthly-chart-card') && this._html.includes('<details')
                    ? new Element('', 'details') : null;
            }
        }

        get innerHTML() { return this._html; }
        setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'class') this.className = String(value); }
        getAttribute(name) { return this.attributes[name] ?? null; }
        addEventListener(type, callback, options) {
            const listeners = this._listeners.get(type) || [];
            if (!listeners.some(listener => listener.callback === callback)) listeners.push({ callback, options });
            this._listeners.set(type, listeners);
        }
        dispatch(type) { for (const listener of this._listeners.get(type) || []) listener.callback({ type, target: this }); }
        listenerCount(type) { return (this._listeners.get(type) || []).length; }
        listenerOptions(type) { return (this._listeners.get(type) || []).map(listener => listener.options); }
        getContext() { return { canvas: this }; }
        focus(options) { document.activeElement = this; focusCalls.push({ id: this.id, options }); }
        scrollTo(options) {
            scrollTos.push({ id: this.id, options });
            if (typeof options === 'object' && Number.isFinite(options.top)) this.scrollTop = options.top;
        }
        scrollIntoView(options) { scrolls.push({ id: this.id, options }); }
        querySelector() { return null; }
        querySelectorAll() { return []; }
    }

    function parseElements(html) {
        const found = [];
        for (const match of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
            const id = match[2].match(/\bid=["']([^"']+)["']/)?.[1];
            if (!id) continue;
            const element = new Element(id, match[1]);
            element.className = match[2].match(/\bclass=["']([^"']*)["']/)?.[1] || '';
            element.hidden = /(?:^|\s)hidden(?:\s|=|$)/i.test(match[2]);
            found.push(element);
        }
        return found;
    }

    parseElements(indexHTML).forEach(element => elements.set(element.id, element));
    document = {
        body: new Element('body', 'body'),
        documentElement: new Element('html', 'html'),
        fullscreenElement: null,
        activeElement: null,
        getElementById: id => elements.get(id) || null,
        addEventListener() {},
        querySelector: selector => selector === '.monthly-chart-card details' ? chartDetails : null,
        querySelectorAll: () => [],
        createElement: tag => new Element('', tag)
    };

    class Chart {
        constructor(canvas, config) {
            if (chartMustFail) throw new Error('Synthetic Chart constructor failure');
            this.canvas = canvas;
            this.config = config;
            this.destroyed = false;
            chartInstances.push(this);
        }
        destroy() { this.destroyed = true; counters.chartDestroyed++; }
    }
    Chart.defaults = { font: {} };
    class FixedDate extends Date {
        constructor(...args) { super(...(args.length ? args : ['2026-09-04T06:00:00.000Z'])); }
        static now() { return Date.parse('2026-09-04T06:00:00.000Z'); }
    }
    const sandbox = {
        document,
        AbortController,
        Chart,
        Date: FixedDate,
        console: { log() {}, warn: (...args) => warnings.push(args), error: (...args) => warnings.push(args) },
        lucide: { createIcons: () => counters.icons++ },
        setTimeout: callback => { scheduled.push(callback); return scheduled.length; },
        clearTimeout() {},
        addEventListener() {},
        innerWidth: 1280,
        matchMedia: () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }),
        fetch: () => { counters.fetch++; throw new Error('Network is forbidden in integration tests'); }
    };
    sandbox.window = sandbox;
    const context = vm.createContext(sandbox);
    const run = code => vm.runInContext(code, context);
    for (const file of localScripts) {
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    }

    run(`
        const testBase = generateMockData()[0];
        dashboardData = [
            ['fixture-jan-1', 'Week 1', '1–7 ม.ค. 2026'],
            ['fixture-jan-2', 'Week 2', '8–14 ม.ค. 2026'],
            ['fixture-feb-1', 'Week 5', '1–7 ก.พ. 2026']
        ].map(([id, week, dateRange]) => ({ ...JSON.parse(JSON.stringify(testBase)), id, week, dateRange }));
        selectedId = 'fixture-jan-2';
        selectedFeedbackWeek = 'Week 2';
        isUsingMock = false;
        overviewTimeframe = 'weekly';
        activeChartTab = 'gfs';
        activeMarketingChartTab = 'monthly';
        marketingTrendFilter = 'mhl';
        marketingWeeklyTrendFilter = 'car';
        buildingTrendFilter = 'mhl';
        adminTrendFilter = 'leads';
        techTrendFilter = 'area';
        repChartTimeframe = 'weekly';
        carTrendTimeframe = 'weekly';
        function freezeTestData(value) {
            if (value && typeof value === 'object') {
                Object.values(value).forEach(freezeTestData);
                Object.freeze(value);
            }
            return value;
        }
        freezeTestData(dashboardData);
    `);

    const state = () => run(`JSON.stringify({
        selectedId, selectedFeedbackWeek, dashboardData,
        overviewTimeframe, activeChartTab, activeMarketingChartTab,
        marketingTrendFilter, marketingWeeklyTrendFilter, buildingTrendFilter,
        adminTrendFilter, techTrendFilter, repChartTimeframe, carTrendTimeframe,
        isDesktopSidebarCollapsed,
        metrics: dashboardData.some(row => row.id === selectedId)
            ? calculateMetrics(dashboardData.find(row => row.id === selectedId)) : null
    })`);
    const snapshot = () => ({
        html: elements.get('dashboard-content').innerHTML,
        title: elements.get('header-title').innerText,
        subtitle: elements.get('header-subtitle').innerText,
        headerControl: elements.get('header-week-control').innerHTML,
        headerControlClass: elements.get('header-week-control').className,
        monthlyHeaderControl: elements.get('header-monthly-control').innerHTML,
        monthlyHeaderControlClass: elements.get('header-monthly-control').className,
        shell: elements.get('app-view').className,
        banner: elements.get('error-banner-container').innerHTML
    });
    return {
        context, run, state, snapshot, elements, counters, warnings, scheduled, chartInstances, scrolls, scrollTos, focusCalls,
        content: () => elements.get('dashboard-content').innerHTML,
        monthlyControl: () => elements.get('header-monthly-control').innerHTML,
        details: () => chartDetails,
        failCharts: () => { chartMustFail = true; },
        setReducedMotion: value => { reducedMotion = Boolean(value); }
    };
}

// Synthetic, disjoint values make it possible to prove that every department
// follows the same month selection without relying on live business data.
function installDepartmentFixture(app, { planDerived = false, divergent = false, zeroCarItems = false } = {}) {
    const makeRow = (id, week, dateRange, factor) => ({
        id, week, dateRange,
        ...(planDerived ? { sourceMode: 'row-weekly-plan' } : {}),
        salesActualTotal: 41000 * factor, salesTargetTotal: 50000 * factor,
        gfs: { actual: 11000 * factor, target: 14000 * factor },
        mhl: { actual: 13000 * factor, target: 16000 * factor },
        car: { actual: 17000 * factor, target: 20000 * factor },
        marketing: {
            gfs: { actual: 233 * factor, target: 300 * factor, google: 100 * factor, fb: 133 * factor },
            mhl: { actual: 277 * factor, target: 350 * factor, google: 120 * factor, fb: 157 * factor },
            car: { actual: 311 * factor, target: 400 * factor, google: 150 * factor, fb: 161 * factor, monthlyCustomerCost: week === 'Week 5' ? 777 : 592 }
        },
        admin: {
            contacts: { total: 59 * factor, gfs: { line: 10 * factor, fb: 8 * factor, tel: 6 * factor }, mhl: { line: 7 * factor, fb: 6 * factor, tel: 5 * factor }, car: 17 * factor },
            leads: { actual: 19 * factor, target: 23 * factor, gfs: { line: 3 * factor, fb: 2 * factor, tel: 2 * factor }, mhl: { line: 2 * factor, fb: 2 * factor, tel: 2 * factor }, car: 4 * factor },
            sales: {
                totalSales: 431 * factor, totalInstalls: 7 * factor,
                newSales: { gfs: 100 * factor, mhl: 150 * factor }, oldSales: { gfs: 81 * factor, mhl: 100 * factor },
                newInstalls: { gfs: 2 * factor, mhl: 2 * factor }, oldInstalls: { gfs: 1 * factor, mhl: 2 * factor }
            }
        },
        buildingSales: {
            totalRepSales: 975318642, totalProjSales: 864207531, totalAdminSales: 431 * factor,
            bom: { sales: 557 * factor, meets: 13 * factor, installs: 5 * factor, newMeets: 8 * factor, oldMeets: 5 * factor, newInstalls: 3 * factor, oldInstalls: 2 * factor, newSales: 300 * factor, oldSales: 257 * factor, noInstalls: 1 * factor, noInstallSales: 41 * factor, sr: 753196428, ytd: 753196428 },
            projYa: { sales: 719 * factor, meets: 11 * factor, targetMeets: 17 * factor, installs: 3 * factor, newMeets: 6 * factor, oldMeets: 5 * factor, ytd: 642085317 }
        },
        carDetail: {
            sales: { actual: (divergent ? 17123 : 17000) * factor, target: 20000 * factor },
            installs: { total: 29 * factor, line: 5 * factor, fb: 6 * factor, tel: 4 * factor, walkin: 3 * factor, showroom: (zeroCarItems ? 0 : 7) * factor, other: (zeroCarItems ? 0 : 4) * factor },
            contacts: { total: 37 * factor, line: 13 * factor, fb: (zeroCarItems ? 0 : 11) * factor, tel: 13 * factor },
            tech: { claims: 2 * factor, filmIssueCount: (zeroCarItems ? 0 : 1) * factor, filmIssueValue: (zeroCarItems ? 0 : 43) * factor, techIssueCount: 2 * factor, techIssueValue: 71 * factor, damagePercent: 531974206, teamSize: 420863195 }
        },
        tech: {
            installs: { actual: 17 * factor, gfs: 8 * factor, mhl: 9 * factor, target: 319752084, ytd: 208641973 },
            area: { actual: 1009 * factor, gfs: 499 * factor, mhl: 510 * factor, target: 197530864, ytd: 986421753 },
            teams: 875310642,
            damage: { totalValue: 179 * factor, byTech: 79 * factor, byFilm: 100 * factor, claims: 3 * factor, filmArea: 47 * factor, ytd: 764209531 }
        }
    });
    const rows = [
        makeRow('department-jan-1', 'Week 1', '1–7 ม.ค. 2026', 1),
        makeRow('department-jan-2', 'Week 2', '8–14 ม.ค. 2026', 2),
        makeRow('department-feb-1', 'Week 5', '1–7 ก.พ. 2026', 7)
    ];
    app.run(`dashboardData = freezeTestData(${JSON.stringify(rows)}); selectedId = 'department-jan-2';`);
    return rows;
}

function installBuildingFixture(app, { planDerived = false } = {}) {
    const july = {
        id: 'building-july', week: 'Week 27', dateRange: '1–7 ก.ค. 2026', salesActualTotal: 50000, salesTargetTotal: 100000,
        gfs: { actual: 30000, target: 60000 }, mhl: { actual: 20000, target: 40000 }, car: { actual: 0, target: 0 },
        buildingSales: {
            bom: { sales: 800, meets: 2, installs: 1 }, jay: { sales: 700, meets: 2, installs: 1 }, saifha: { sales: 100, meets: 1, installs: 0 },
            kat: { sales: 400, meets: 2, installs: 0 }, image: { sales: 600, meets: 1, installs: 1 },
            tung: { sales: 1000, meets: 2, installs: 1 },
            projYa: { sales: 900, meets: 3, installs: 1 }, projTung: { sales: 500, meets: 1, installs: 1 }, projTukta: { sales: 300, meets: 1, installs: 0 }
        }
    };
    const august = {
        id: 'building-august', week: 'Week 31', dateRange: '1–7 ส.ค. 2026', salesActualTotal: 150000, salesTargetTotal: 200000,
        ...(planDerived ? { sourceMode: 'row-weekly-plan' } : {}),
        gfs: { actual: 90000, target: 120000 }, mhl: { actual: 60000, target: 80000 }, car: { actual: 0, target: 0 },
        buildingSales: {
            bom: { sales: 8000, meets: 4, installs: 2 }, jay: { sales: 7000, meets: 2, installs: 3 }, saifha: { sales: 0, meets: 0, installs: 0 },
            kat: { sales: 4000, meets: 8, installs: 1 }, image: { sales: 6000, meets: 3, installs: 1 },
            tung: { sales: 2000, meets: 4, installs: 2 },
            projYa: { sales: 9000, meets: 5, installs: 5 }, projTung: { sales: 5000, meets: 4, installs: 0 }, projTukta: { sales: 3000, meets: 0, installs: 2 }
        }
    };
    const rows = [july, august];
    app.run(`dashboardData = freezeTestData(${JSON.stringify(rows)}); selectedId = 'building-july';`);
    return rows;
}

function departmentHTML(html, department) {
    const opening = new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\bid=["']monthly-${department}["'][^>]*>`, 'i').exec(html);
    assert.ok(opening, `Missing Monthly ${department} section`);
    const tag = opening[1];
    const remainder = html.slice(opening.index + opening[0].length);
    const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    let depth = 1;
    for (const match of remainder.matchAll(tags)) {
        depth += match[0].startsWith('</') ? -1 : 1;
        if (depth === 0) return opening[0] + remainder.slice(0, match.index + match[0].length);
    }
    assert.fail(`Unclosed Monthly ${department} section`);
}

const departmentNames = {
    marketing: /Marketing/,
    admin: /Sales Admin/,
    building: /ฝ่ายขายฟิล์มอาคาร/,
    car: /ฝ่ายขายฟิล์มรถยนต์/,
    tech: /ทีมช่างอาคาร/
};

function plainText(html) { return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '); }

function exerciseMonthlyTrophyPlugin(app, visibility = { actual: true, target: true }) {
    const config = app.chartInstances.at(-1).config;
    const plugin = config.plugins?.find(item => item.id === 'monthlyTargetTrophies');
    assert.ok(plugin, 'Trophy renderer must be attached to the Monthly chart config');
    const calls = [];
    const ctx = Object.fromEntries(['save', 'translate', 'scale', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'arc', 'stroke', 'fill', 'closePath', 'restore', 'fillText'].map(method => [method, (...args) => calls.push([method, ...args])]));
    ctx.measureText = value => { calls.push(['measureText', value]); return { width: String(value).length * 6 }; };
    const bars = [0, 1, 2].map(datasetIndex => config.data.labels.map((label, index) => ({ x: (index + 1) * 20 + (datasetIndex ? 3 : -3), y: 60 + datasetIndex * 10, base: 180 })));
    plugin.afterDatasetsDraw({
        ctx, data: config.data, width: 800, chartArea: { top: 0, bottom: 200, left: 0, right: 800 },
        isDatasetVisible: datasetIndex => datasetIndex === 0 ? visibility.actual : datasetIndex === 1 ? visibility.target : visibility.expense !== false,
        getDatasetMeta: datasetIndex => ({ data: bars[datasetIndex] || [] })
    });
    return { calls, config, plugin };
}

for (const page of legacyPages) {
    test(`Weekly ${page} is byte-identical after Monthly navigation and month selection`, () => {
        const app = createHarness();
        app.run(`changePage('${page}')`);
        const before = app.snapshot();
        const stateBefore = app.state();
        assert.ok(before.html.length > 100, 'Actual Weekly renderer produced its HTML');
        app.run("changePage('monthly')");
        assert.match(app.content(), /monthly-dashboard/);
        assert.match(app.monthlyControl(), /value="2026-02" selected/);
        assert.equal(app.state(), stateBefore, 'Entering Monthly changed Weekly data, selection, filters or metrics');
        app.run("BBMonthlyPage.selectMonth('2026-01')");
        assert.match(app.monthlyControl(), /value="2026-01" selected/);
        assert.equal(app.state(), stateBefore, 'Monthly selector changed Weekly data, selection, filters or metrics');
        app.run(`changePage('${page}')`);
        assert.deepEqual(app.snapshot(), before, 'Weekly HTML/header/shell changed after returning');
        assert.equal(app.state(), stateBefore);
        assert.equal(app.counters.fetch, 0);
        assert.equal(app.warnings.length, 0);
        assert.ok(app.counters.chartDestroyed >= 2, 'Monthly chart instances were cleaned up on rerender and exit');
    });
}

for (const page of legacyPages) {
    test(`delayed ${page} chart callbacks cannot replace or damage the Monthly chart`, () => {
        const app = createHarness();
        app.run(`changePage('${page}')`);
        const weeklyCallbacks = [...app.scheduled];
        app.run("changePage('monthly')");
        const before = app.content();
        const monthlyChart = app.chartInstances.at(-1);
        const chartCount = app.chartInstances.length;
        weeklyCallbacks.forEach(callback => assert.doesNotThrow(callback));
        assert.equal(app.content(), before);
        assert.equal(app.chartInstances.length, chartCount);
        assert.equal(monthlyChart.destroyed, false);
        assert.equal(app.run('Object.keys(charts).join(",")'), 'monthlyMarketingTrend,monthlyAdminTrend,monthlyBuildingTrend,monthlyCarTrend,monthlyTechTrend,monthlyCarSources,monthlySales');
        assert.equal(app.warnings.length, 0);
    });
}

test('Monthly renders each department trend with only months that contain reportable chart data', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    const html = app.content();
    for (const key of ['marketing', 'admin', 'building', 'car', 'tech']) {
        assert.match(html, new RegExp(`id="monthly-${key}-trend-chart"`));
    }
    assert.doesNotMatch(plainText(html), /GFS \+ MHL \+ CAR สอดคล้องกับยอดรวมด้านบน/);
    assert.doesNotMatch(plainText(html), /% คำนวณจากยอดรวม ไม่เฉลี่ยเปอร์เซ็นต์รายสัปดาห์/);

    const trends = app.chartInstances.slice(0, 5).map(chart => chart.config);
    assert.equal(trends.length, 5);
    trends.forEach(config => {
        assert.equal(config.type, 'line');
        assert.equal(config.data.labels.length, 2);
        assert.equal(config.data.labels[1], 'ก.พ. •');
        assert.ok(config.data.datasets.every(dataset => dataset.data.every(value => value !== null)));
    });
    assert.deepEqual(Array.from(trends[0].data.datasets[0].data.slice(0, 2)), [2463, 5747]);
    assert.equal(trends[0].data.datasets[0].label, 'ค่าโฆษณา');
    assert.equal(trends[0].data.datasets[0].type, 'bar');
    assert.equal(trends[0].data.datasets[0].pointStyle, 'rectRounded');
    assert.equal(trends[0].data.datasets[1].label, 'งบประมาณ');
    assert.equal(trends[0].data.datasets[1].type, 'line');
    assert.deepEqual(Array.from(trends[0].data.datasets[1].borderDash), [7, 5]);
    assert.deepEqual(Array.from(trends[1].data.datasets[0].data.slice(0, 2)), [177, 413]);
    assert.equal(trends[1].data.datasets.length, 4);
    assert.equal(trends[1].data.datasets[3].label, 'ยอดขาย Admin');
    assert.deepEqual(Array.from(trends[1].data.datasets[3].data.slice(0, 2)), [1293, 3017]);
    assert.equal(trends[1].data.datasets[3].yAxisID, 'ySales');
    assert.equal(trends[1].options.scales.ySales.position, 'right');
    assert.equal(trends[1].options.scales.ySales.title.text, 'บาท');
    assert.equal(trends[1].options.scales.ySales.grid.drawOnChartArea, false);
    assert.deepEqual(Array.from(trends[2].data.datasets[0].data.slice(0, 2)), [72000, 168000]);
    assert.equal(trends[2].data.datasets[0].label, 'ยอดขาย');
    assert.equal(trends[2].data.datasets[0].type, 'bar');
    assert.equal(trends[2].data.datasets[1].label, 'เป้าหมาย');
    assert.equal(trends[2].data.datasets[1].type, 'line');
    assert.equal(trends[2].plugins[0].id, 'monthlyBuildingTrendTargetTrophies');
    assert.deepEqual(Array.from(trends[3].data.datasets[0].data.slice(0, 2)), [51000, 119000]);
    assert.equal(trends[3].data.datasets[0].label, 'ยอดขาย');
    assert.equal(trends[3].data.datasets[0].type, 'bar');
    assert.equal(trends[3].data.datasets[1].label, 'เป้าหมาย');
    assert.equal(trends[3].data.datasets[1].type, 'line');
    assert.equal(trends[3].plugins[0].id, 'monthlyCarTrendTargetTrophies');
    assert.match(html, /แนวโน้มยอดขายฝ่ายขายอาคาร เฉพาะเดือนที่มีข้อมูล ปี 2026 ถ้วยรางวัลแสดงเดือนที่ยอดขายถึงเป้าหมาย/);
    assert.match(html, /แนวโน้มยอดขายฝ่ายขายรถยนต์ เฉพาะเดือนที่มีข้อมูล ปี 2026 ถ้วยรางวัลแสดงเดือนที่ยอดขายถึงเป้าหมาย/);
    assert.deepEqual(Array.from(trends[4].data.datasets[0].data.slice(0, 2)), [51, 119]);
    assert.equal(trends[4].data.datasets.length, 3);
    assert.deepEqual(Array.from(trends[4].data.datasets.map(dataset => dataset.label)), ['งานติดตั้ง', 'พื้นที่ติดตั้ง', 'มูลค่าความเสียหาย']);
    assert.deepEqual(Array.from(trends[4].data.datasets[1].data.slice(0, 2)), [3027, 7063]);
    assert.deepEqual(Array.from(trends[4].data.datasets[2].data.slice(0, 2)), [537, 1253]);
    assert.equal(trends[4].data.datasets[1].yAxisID, 'yArea');
    assert.equal(trends[4].data.datasets[2].yAxisID, 'yDamage');
    assert.equal(trends[4].options.scales.yArea.title.text, 'ตร.ฟุต');
    assert.equal(trends[4].options.scales.yDamage.title.text, 'บาท');
    assert.equal(trends[4].options.scales.yArea.grid.drawOnChartArea, false);
    assert.equal(trends[4].options.scales.yDamage.grid.drawOnChartArea, false);
    assert.ok(app.chartInstances.at(-1).config.plugins.some(plugin => plugin.id === 'monthlyTargetTrophies'));
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('every Monthly chart removes target-only, empty and plan-derived months independently', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [
            { id: 'sales', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 120,
              gfs: { actual: 60, target: 70 }, mhl: { actual: 40, target: 50 }, carDetail: { sales: { actual: 30, target: 40 } } },
            { id: 'marketing', week: 'Week 5', dateRange: '1–7 ก.พ. 2026', marketing: { gfs: { actual: 20, target: 30 } } },
            { id: 'admin', week: 'Week 9', dateRange: '1–7 มี.ค. 2026', admin: { contacts: { total: 5 } } },
            { id: 'tech', week: 'Week 13', dateRange: '1–7 เม.ย. 2026', tech: { installs: { actual: 2 } } },
            { id: 'target-only', week: 'Week 17', dateRange: '1–7 พ.ค. 2026', salesTargetTotal: 500,
              gfs: { target: 300 }, mhl: { target: 200 }, marketing: { gfs: { target: 50 } }, carDetail: { sales: { target: 40 } } },
            { id: 'plan', week: 'Week 21', dateRange: '1–7 มิ.ย. 2026', sourceMode: 'row-weekly-plan', salesActualTotal: 600,
              gfs: { actual: 300 }, mhl: { actual: 300 }, marketing: { gfs: { actual: 60 } },
              admin: { contacts: { total: 6 } }, carDetail: { sales: { actual: 60 } }, tech: { installs: { actual: 6 } } }
        ];
        changePage('monthly');
    `);
    const [marketing, admin, building, car, tech, sales] = app.chartInstances.map(chart => chart.config);
    assert.deepEqual(Array.from(marketing.data.labels), ['ก.พ.']);
    assert.deepEqual(Array.from(admin.data.labels), ['มี.ค.']);
    assert.deepEqual(Array.from(building.data.labels), ['ม.ค.']);
    assert.deepEqual(Array.from(car.data.labels), ['ม.ค.']);
    assert.deepEqual(Array.from(tech.data.labels), ['เม.ย.']);
    assert.deepEqual(JSON.parse(JSON.stringify(sales.data.labels)), [['ม.ค.', '2026']]);
    assert.doesNotMatch(JSON.stringify(app.chartInstances.map(chart => chart.config.data.labels)), /พ.ค.|มิ.ย./);
    assert.equal(app.warnings.length, 0);
});

test('Monthly navigation updates desktop/mobile active menus and closes the mobile drawer', () => {
    const app = createHarness();
    app.run("changePage('overview'); openMobileMenu(); changePage('monthly')");
    assert.equal(app.elements.get('header-monthly-control').classList.contains('hidden'), false);
    assert.match(app.monthlyControl(), /monthly-month-select/);
    for (const prefix of ['menu-', 'mobile-menu-']) {
        assert.match(app.elements.get(`${prefix}monthly`).className, /bg-blue-600\/20/);
        assert.doesNotMatch(app.elements.get(`${prefix}overview`).className, /bg-blue-600\/20/);
    }
    assert.equal(app.elements.get('mobile-sidebar').classList.contains('-translate-x-full'), true);
    assert.equal(app.elements.get('mobile-menu-backdrop').classList.contains('hidden'), true);
    assert.equal(app.context.document.body.classList.contains('mobile-menu-open'), false);
    app.run("changePage('overview')");
    assert.equal(app.elements.get('header-monthly-control').classList.contains('hidden'), true);
    assert.equal(app.monthlyControl(), '');
    for (const prefix of ['menu-', 'mobile-menu-']) {
        assert.doesNotMatch(app.elements.get(`${prefix}monthly`).className, /bg-blue-600\/20/);
        assert.match(app.elements.get(`${prefix}overview`).className, /bg-blue-600\/20/);
    }
    assert.equal(app.counters.fetch, 0);
});

test('Monthly does not require a valid Weekly selectedId', () => {
    const app = createHarness();
    app.run("selectedId = 'missing-week'; changePage('monthly')");
    assert.match(app.content(), /monthly-metrics/);
    assert.match(app.content(), /สัปดาห์ที่นำมารวม/);
    assert.equal(app.run('selectedId'), 'missing-week');
    assert.equal(app.warnings.length, 0);
});

test('empty source renders a recoverable Monthly empty state without fetching', () => {
    const app = createHarness();
    app.run("dashboardData = []; selectedId = ''; changePage('monthly')");
    assert.match(app.content(), /monthly-empty/);
    assert.match(app.content(), /ยังไม่มีข้อมูลเดือนที่แสดงได้/);
    assert.match(app.content(), /กลับ Weekly/);
    assert.doesNotMatch(app.content(), /monthly-metrics/);
    assert.equal(app.monthlyControl(), '');
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('valid zero-only source stays selectable and renders finite data with unavailable ratios', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [{ id: 'zero', week: 'Week 1', dateRange: '1–7 ม.ค. 2026' }];
        selectedId = 'unrelated';
        changePage('monthly');
    `);
    assert.match(app.content(), /monthly-metrics/);
    assert.match(app.monthlyControl(), /value="2026-01" selected/);
    assert.match(app.content(), /—/);
    assert.doesNotMatch(app.content(), /NaN|Infinity|undefined/);
    assert.equal(app.warnings.length, 0);
});

test('invalid Monthly keys and calls while on Weekly are ignored without side effects', () => {
    const app = createHarness();
    app.run("changePage('sales')");
    const weekly = app.snapshot();
    const state = app.state();
    app.run("BBMonthlyPage.selectMonth('2026-01')");
    assert.deepEqual(app.snapshot(), weekly);
    assert.equal(app.state(), state);
    app.run("changePage('monthly')");
    const monthly = app.snapshot();
    app.run("BBMonthlyPage.selectMonth('1999-99')");
    assert.deepEqual(app.snapshot(), monthly);
    assert.equal(app.state(), state);
});

for (const failure of ['missing page module', 'throwing Monthly renderer']) {
    test(`${failure} is contained and Weekly recovers unchanged`, () => {
        const app = createHarness();
        app.run("changePage('overview')");
        const before = app.snapshot();
        const stateBefore = app.state();
        app.run(failure === 'missing page module'
            ? 'delete window.BBMonthlyPage;'
            : "window.BBMonthlyPage = { render() { throw new Error('Synthetic Monthly renderer failure'); } };");
        assert.doesNotThrow(() => app.run("changePage('monthly')"));
        assert.match(app.content(), /Monthly ยังไม่พร้อมแสดงผล/);
        assert.match(app.content(), /กลับ Weekly/);
        assert.equal(app.state(), stateBefore);
        assert.equal(app.warnings.length, 1);
        app.run("changePage('overview')");
        assert.deepEqual(app.snapshot(), before);
        assert.equal(app.state(), stateBefore);
        assert.equal(app.counters.fetch, 0);
    });
}

test('mock fallback is unavailable in Monthly rather than shown as synthetic performance', () => {
    const app = createHarness();
    app.run("isUsingMock = true; errorMessage = 'Synthetic fetch failure'; changePage('monthly')");
    assert.match(app.content(), /Monthly ยังอ่านข้อมูลจริงไม่ได้/);
    assert.match(app.content(), /ข้อมูลจำลอง/);
    assert.doesNotMatch(app.content(), /monthly-metrics|monthly-sales-chart|monthly-table/);
    assert.equal(app.monthlyControl(), '');
    assert.equal(app.chartInstances.length, 0);
    assert.equal(app.counters.fetch, 0);
    app.run("changePage('overview')");
    assert.match(app.snapshot().banner, /โหมดสาธิต/);
    assert.match(app.snapshot().banner, /Synthetic fetch failure/);
    assert.match(app.content(), /overview/);
});

for (const failure of ['constructor throws', 'Chart unavailable']) {
    test(`Monthly chart ${failure} retains numbers and opens the table fallback`, () => {
        const app = createHarness();
        if (failure === 'constructor throws') app.failCharts();
        else app.run('delete window.Chart;');
        assert.doesNotThrow(() => app.run("changePage('monthly')"));
        assert.match(app.content(), /monthly-metrics/);
        assert.match(app.content(), /ตารางยอดขายและค่าใช้จ่ายรายเดือน/);
        assert.match(app.content(), /สัปดาห์ที่นำมารวม/);
        assert.match(app.elements.get('monthly-chart-status').textContent, /กราฟยังแสดงไม่ได้/);
        assert.equal(app.details().open, true);
        assert.equal(app.warnings.length, 2);
        assert.equal(app.counters.fetch, 0);
    });
}

test('Monthly chart draws compact values and signed target results only for non-pending months', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [
            { id: 'below', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 9, salesTargetTotal: 10 },
            { id: 'equal', week: 'Week 5', dateRange: '1–7 ก.พ. 2026', salesActualTotal: 10, salesTargetTotal: 10 },
            { id: 'above', week: 'Week 9', dateRange: '1–7 มี.ค. 2026', salesActualTotal: 12, salesTargetTotal: 10 },
            { id: 'zero-target', week: 'Week 13', dateRange: '1–7 เม.ย. 2026', salesActualTotal: 1, salesTargetTotal: 0 },
            { id: 'plan', week: 'Week 17', dateRange: '1–7 พ.ค. 2026', salesActualTotal: 12, salesTargetTotal: 10, sourceMode: 'row-weekly-plan' },
            { id: 'aug-achieved', week: 'Week 31', dateRange: '1–7 ส.ค. 2026', salesActualTotal: 30, salesTargetTotal: 10 },
            { id: 'aug-unconfirmed', week: 'Week 32', dateRange: '8–14 ส.ค. 2026', salesActualTotal: 0, salesTargetTotal: 10 },
            { id: 'future-actual', week: 'Week 36', dateRange: '8–14 ก.ย. 2026', salesActualTotal: 10, salesTargetTotal: 10 },
            { id: 'future-month', week: 'Week 40', dateRange: '1–7 ต.ค. 2026', salesActualTotal: 10, salesTargetTotal: 10 }
        ];
        changePage('monthly');
    `);
    const { calls, config } = exerciseMonthlyTrophyPlugin(app);
    const labels = calls.filter(call => call[0] === 'fillText').map(call => call[1]);
    assert.deepEqual(labels.slice(0, 7), ['9', '10', '12', '1', '30', '10', '10'], 'Actual values use compact labels');
    assert.deepEqual(labels.slice(7, 14), ['10', '10', '10', '0', '20', '10', '10'], 'Target values use compact labels');
    assert.deepEqual(labels.filter(label => String(label).includes('%')), ['−10%', '0%', '+20%', '+50%'], 'Variance signs are relative to the monthly target without a false sign at zero');
    assert.equal(calls.filter(call => call[0] === 'translate').length, 4, 'One sad face and three trophies are drawn');
    assert.equal(calls.filter(call => call[0] === 'arc').length, 4, 'Only the below-target month uses the four-path sad face');
    assert.equal(config.plugins.filter(plugin => plugin.id === 'monthlyTargetTrophies').length, 1);
    assert.equal(config.data.datasets[0].label, 'ยอดตาม Weekly');
    assert.equal(config.data.datasets[1].label, 'เป้ารวมเดือน');
    assert.equal(config.data.datasets[1].type, 'line');
    assert.deepEqual(Array.from(config.data.datasets[1].borderDash), [8, 5]);
    assert.deepEqual(JSON.parse(JSON.stringify(config.data.labels[0])), ['ม.ค.', '2026']);
    assert.deepEqual(JSON.parse(JSON.stringify(config.data.labels[4])), ['ส.ค. •', '2026', 'รอยืนยัน']);
    assert.equal(config.options.scales.y.title.text, 'บาท');
    assert.doesNotMatch(app.content(), /🏆 ถึงเป้า · ☹ ยังไม่ถึงเป้า|K = พันบาท \/ M = ล้านบาท/);
    assert.match(app.content(), /id="monthly-chart-status"[^>]*hidden/);
    assert.match(app.content(), /<th scope="col">ผลต่างเทียบเป้า \(%\)<\/th>/);
    assert.match(app.content(), /มกราคม 2026[\s\S]*?<td>10<\/td><td class="monthly-sales-value">9<\/td>[\s\S]*?<td>−10%<\/td>/);
    assert.match(app.content(), /กุมภาพันธ์ 2026[\s\S]*?<td>10<\/td><td class="monthly-sales-value">10<\/td>[\s\S]*?<td>0%<\/td>/);
    assert.match(app.content(), /พฤษภาคม 2026 \(จากแผน\)[\s\S]*?<td>10<\/td><td class="monthly-sales-value">12<\/td>[\s\S]*?<td>—<\/td>/);
    const tooltipStatus = config.options.plugins.tooltip.callbacks.afterBody;
    assert.equal(tooltipStatus([{ dataIndex: 0 }]), 'สถานะ: ยังไม่ถึงเป้า (−10% เทียบเป้า)');
    assert.equal(tooltipStatus([{ dataIndex: 1 }]), 'สถานะ: ถึงเป้าแล้ว! (0% เทียบเป้า)');
    assert.equal(tooltipStatus([{ dataIndex: 4 }]), 'สถานะ: ถึงเป้าแล้ว! (+50% เทียบเป้า)');
    assert.equal(tooltipStatus([{ dataIndex: 5 }]), 'สถานะ: รอตรวจสอบข้อมูล');
    assert.equal(app.warnings.length, 0);
});

test('Monthly chart outcome follows actual-series visibility while target labels remain independent', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [{ id: 'open', week: 'Week 36', dateRange: '1–3 ก.ย. 2026', salesActualTotal: 10.004, salesTargetTotal: 10 }];
        changePage('monthly');
    `);
    const visible = exerciseMonthlyTrophyPlugin(app);
    assert.equal(visible.calls.filter(call => call[0] === 'translate').length, 1);
    assert.deepEqual(visible.calls.filter(call => call[0] === 'fillText').map(call => call[1]), ['10', '10', '≈ 0%']);
    assert.equal(visible.config.options.plugins.tooltip.callbacks.afterBody([{ dataIndex: 0 }]), 'สถานะ: ถึงเป้าแล้ว! (≈ 0% เทียบเป้า)');
    const actualHidden = exerciseMonthlyTrophyPlugin(app, { actual: false, target: true });
    assert.deepEqual(actualHidden.calls.filter(call => call[0] === 'fillText').map(call => call[1]), ['10'], 'Target label remains when only actual is hidden');
    assert.equal(actualHidden.calls.filter(call => call[0] === 'translate').length, 0);
    assert.equal(actualHidden.calls.filter(call => call[0] === 'arc').length, 0);
    const targetHidden = exerciseMonthlyTrophyPlugin(app, { actual: true, target: false });
    assert.deepEqual(targetHidden.calls.filter(call => call[0] === 'fillText').map(call => call[1]), ['10', '≈ 0%'], 'Actual label and result remain without the target bars');
    assert.equal(targetHidden.calls.filter(call => call[0] === 'translate').length, 1);
    const bothHidden = exerciseMonthlyTrophyPlugin(app, { actual: false, target: false });
    assert.equal(bothHidden.calls.filter(call => call[0] === 'fillText').length, 0);
    assert.equal(bothHidden.calls.filter(call => call[0] === 'translate').length, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly removes the source footer and installs one passive back-to-top listener across rerenders', () => {
    const app = createHarness();
    const scrollContainer = app.elements.get('dashboard-content');
    app.run("changePage('monthly')");
    let html = app.content();
    assert.doesNotMatch(html, /monthly-source["\s]|แหล่งข้อมูล:\s*BB-2026/);
    assert.match(html, /gid=152606837/, 'Expense source is separate from the removed Weekly footer');
    assert.match(html, /สัปดาห์ที่นำมารวม/);
    const opening = html.match(/<button\b[^>]*\bid="monthly-back-top"[^>]*>/)?.[0] || '';
    assert.match(opening, /aria-label="กลับด้านบน"/);
    assert.match(opening, /title="กลับด้านบน"/);
    assert.equal(app.elements.get('monthly-back-top').hidden, true);
    assert.equal(scrollContainer.listenerCount('scroll'), 1);
    assert.equal(scrollContainer.listenerOptions('scroll')[0]?.passive, true);

    app.run("BBMonthlyPage.selectMonth('2026-01'); BBMonthlyPage.selectMonth('2026-02')");
    html = app.content();
    assert.doesNotMatch(html, /monthly-source["\s]|แหล่งข้อมูล:\s*BB-2026/);
    assert.equal(scrollContainer.listenerCount('scroll'), 1, 'Month rerenders must not accumulate scroll listeners');
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly back-to-top visibility, motion preference, focus and Weekly guard are isolated', () => {
    const app = createHarness();
    app.run("changePage('overview')");
    const weeklyBefore = app.snapshot();
    const stateBefore = app.state();
    app.run("changePage('monthly')");
    const scrollContainer = app.elements.get('dashboard-content');

    scrollContainer.scrollTop = 321;
    scrollContainer.dispatch('scroll');
    assert.equal(app.elements.get('monthly-back-top').hidden, false);
    scrollContainer.scrollTop = 320;
    scrollContainer.dispatch('scroll');
    assert.equal(app.elements.get('monthly-back-top').hidden, true);
    scrollContainer.scrollTop = 900;
    scrollContainer.dispatch('scroll');
    assert.equal(app.elements.get('monthly-back-top').hidden, false);

    app.run('BBMonthlyPage.backToTop()');
    assert.equal(app.scrollTos.at(-1).id, 'dashboard-content');
    assert.equal(app.scrollTos.at(-1).options.top, 0);
    assert.equal(app.scrollTos.at(-1).options.behavior, 'smooth');
    assert.equal(app.context.document.activeElement.id, 'monthly-month-select');
    assert.equal(app.focusCalls.at(-1).id, 'monthly-month-select');
    assert.equal(app.focusCalls.at(-1).options.preventScroll, true);
    assert.equal(app.state(), stateBefore);

    app.setReducedMotion(true);
    scrollContainer.scrollTop = 700;
    app.run('BBMonthlyPage.backToTop()');
    assert.equal(app.scrollTos.at(-1).id, 'dashboard-content');
    assert.equal(app.scrollTos.at(-1).options.top, 0);
    assert.equal(app.scrollTos.at(-1).options.behavior, 'instant');

    const css = fs.readFileSync(path.join(root, 'css/monthly.css'), 'utf8');
    assert.match(css, /\.monthly-back-top\s*\{[^}]*background:\s*linear-gradient\([^}]*rgba\(36, 86, 166, \.72\)[^}]*backdrop-filter:\s*blur\(12px\)/s);

    app.run("changePage('overview')");
    assert.deepEqual(app.snapshot(), weeklyBefore);
    const actionsBeforeGuard = app.scrollTos.length;
    assert.doesNotThrow(() => app.run('BBMonthlyPage.backToTop()'));
    scrollContainer.scrollTop = 800;
    assert.doesNotThrow(() => scrollContainer.dispatch('scroll'));
    assert.equal(app.scrollTos.length, actionsBeforeGuard);
    assert.equal(app.state(), stateBefore);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly selection falls back safely when its selected month disappears after source refresh', () => {
    const app = createHarness();
    app.run("changePage('monthly'); BBMonthlyPage.selectMonth('2026-01')");
    app.run("dashboardData = dashboardData.filter(row => row.dateRange.includes('ก.พ.')); updateDashboardUI();");
    assert.match(app.monthlyControl(), /value="2026-02" selected/);
    assert.doesNotMatch(app.monthlyControl(), /value="2026-01"/);
    assert.equal(app.run('selectedId'), 'fixture-jan-2');
    assert.equal(app.warnings.length, 0);
});

test('Monthly warns about named zero weeks without dropping them or asserting they are missing', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [
            { id: 'jan', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 100 },
            { id: 'feb', week: 'Week 5', dateRange: '1–7 ก.พ. 2026', salesActualTotal: 100, salesTargetTotal: 100 },
            { id: 'zero', week: 'Week 6', dateRange: '8–14 ก.พ. 2026', salesActualTotal: 0, salesTargetTotal: 100 }
        ];
        changePage('monthly');
    `);
    const html = app.content();
    const notice = html.match(/<div class="monthly-notice"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
    assert.match(notice, /Week 6/);
    assert.match(notice, /อาจเป็นศูนย์จริงหรือยังไม่กรอก/);
    assert.match(notice, /โปรดยืนยัน/);
    const comparisonText = html.match(/<p class="monthly-reference-comparison-note">([\s\S]*?)<\/p>/)?.[1] || '';
    assert.match(comparisonText, /ยังไม่สรุป % เปลี่ยนแปลง/);
    assert.match(html, /รวม 2 สัปดาห์/);
    assert.match(html, /monthly-week-number">6<\/span>[\s\S]*?monthly-week-copy"><strong>Week 6<\/strong>[\s\S]*?monthly-week-target">100<\/td><td class="monthly-week-sales">0<\/td><td class="monthly-week-ad">0<\/td><td class="monthly-week-ad-rate"><span>—<\/span>/);
    assert.equal(app.warnings.length, 0);
});

test('an unconfirmed previous month suppresses an apparently complete month-over-month conclusion', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [
            { id: 'jan', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 100 },
            { id: 'zero', week: 'Week 2', dateRange: '8–14 ม.ค. 2026', salesActualTotal: 0, salesTargetTotal: 100 },
            { id: 'feb', week: 'Week 5', dateRange: '1–7 ก.พ. 2026', salesActualTotal: 150, salesTargetTotal: 100 }
        ];
        changePage('monthly');
    `);
    assert.match(app.monthlyControl(), /value="2026-02" selected/);
    const comparisonText = app.content().match(/<p class="monthly-reference-comparison-note">([\s\S]*?)<\/p>/)?.[1] || '';
    assert.match(comparisonText, /ยังไม่สรุป % เปลี่ยนแปลง/);
    assert.doesNotMatch(comparisonText, /\+50%/);
    const chart = app.chartInstances.at(-1).config;
    assert.match(chart.data.labels[0].join(' '), /รอยืนยัน/);
    assert.match(chart.options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }]), /รอยืนยัน/);
});

test('annual chart keeps plan-derived rows in the table but omits them from plotted results', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [
            { id: 'plan', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 100, sourceMode: 'row-weekly-plan' },
            { id: 'actual', week: 'Week 5', dateRange: '1–7 ก.พ. 2026', salesActualTotal: 150, salesTargetTotal: 100 }
        ];
        changePage('monthly');
    `);
    assert.match(app.monthlyControl(), /value="2026-02" selected/);
    assert.match(app.content(), /มกราคม 2026 \(จากแผน\)/);
    const chart = app.chartInstances.at(-1).config;
    assert.equal(chart.data.labels.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(chart.data.labels[0])), ['ก.พ. •', '2026']);
    assert.doesNotMatch(chart.options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }]), /แผน/);
});

test('Monthly excludes technician target fields that are not safe to aggregate', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [{
            id: 'tech', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100,
            tech: { installs: { actual: 3, target: 987654321, ytd: 200 }, area: { actual: 125, target: 876543219, ytd: 9999 }, damage: { totalValue: 10 } }
        }];
        changePage('monthly');
    `);
    const tech = departmentHTML(app.content(), 'tech');
    assert.match(tech, /monthly-tech-kpi-card[\s\S]*?<h4>งานติดตั้งอาคาร<\/h4><strong>3 <small>งาน<\/small><\/strong>/);
    assert.match(tech, /monthly-tech-kpi-card[\s\S]*?<h4>พื้นที่ติดตั้ง<\/h4><strong>125 <small>ตร\.ฟุต<\/small><\/strong>/);
    assert.doesNotMatch(app.content(), /987,654,321|876,543,219|987654321|876543219/);
    const techKeys = app.run('Object.keys(BBMonthlyData.build(dashboardData).months[0].tech).join(",")');
    assert.doesNotMatch(techKeys, /installTarget|areaTarget|ytd|teams/);
});

test('Monthly escapes source strings in notices, source-week rows and skipped-date detail', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [
            { id: 'valid', week: '<img src=x onerror=alert(1)>', dateRange: '1–7 ม.ค. 2026\\n<script>alert(2)</script>', salesActualTotal: 0, salesTargetTotal: 100 },
            { id: 'bad', week: '<svg onload=alert(3)>', dateRange: '<script>alert(4)</script>' }
        ];
        changePage('monthly');
    `);
    const html = app.content();
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
    assert.match(html, /&lt;svg onload=alert\(3\)&gt;/);
    assert.match(html, /&lt;script&gt;alert\(4\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|<img src=x|<svg onload/);
    assert.equal(app.counters.fetch, 0);
});

test('local script order preserves Weekly dependencies and loads Monthly before the controller', () => {
    const expectedLegacy = [
        'js/helpers.js', 'js/fullscreen.js', 'js/charts.js', 'js/data.js',
        'js/pages/overview.js', 'js/pages/feedback.js', 'js/pages/sales.js',
        'js/pages/car.js', 'js/pages/marketing.js', 'js/pages/tech.js',
        'js/pages/admin.js', 'js/app.js'
    ];
    assert.deepEqual(localScripts.filter(file => !file.includes('monthly') && file !== 'js/expense-data.js'), expectedLegacy);
    assert.ok(localScripts.indexOf('js/expense-data.js') < localScripts.indexOf('js/data.js'));
    assert.ok(localScripts.indexOf('js/pages/monthly-expenses.js') < localScripts.indexOf('js/pages/monthly.js'));
    assert.ok(localScripts.indexOf('js/monthly-data.js') > localScripts.indexOf('js/helpers.js'));
    assert.ok(localScripts.indexOf('js/pages/monthly.js') > localScripts.indexOf('js/monthly-data.js'));
    assert.ok(localScripts.indexOf('js/pages/monthly.js') < localScripts.indexOf('js/app.js'));
    const app = createHarness();
    assert.equal(app.run('currentPage'), 'overview');
    assert.equal(app.counters.fetch, 0, 'Loading test modules must not invoke the onload data fetch');
});

async function loadExpenseFixture(app) {
    app.context.fetch = async () => ({ ok: true, text: async () => 'เดือน, ม.ค. 26, ก.พ. 26, มี.ค. 26,Total\nอาคาร,1000.25,0,,1000.25\nรถยนต์,200,0,,200\nTOTAL,1200.25,0,0,1200.25' });
    await app.run('BBExpenseData.load()');
}

test('expense totals overlay the sales chart, match the shared table and leave Weekly intact', async () => {
    const app = createHarness();
    const before = app.state();
    await loadExpenseFixture(app);
    app.run("changePage('monthly'); BBMonthlyPage.selectMonth('2026-01')");
    const expense = app.chartInstances.findLast(chart => chart.canvas.canvas.id === 'monthly-sales-chart');
    assert.ok(expense);
    assert.equal(expense.config.type, 'bar');
    assert.equal(expense.config.data.datasets.length, 3);
    assert.equal(JSON.stringify(expense.config.data.datasets[2].data), '[1200.25,0]');
    assert.equal(expense.config.data.datasets[2].label, 'ค่าใช้จ่ายรวม');
    assert.equal(expense.config.data.datasets[0].grouped, false);
    assert.equal(expense.config.data.datasets[2].grouped, false);
    assert.ok(expense.config.data.datasets[2].barPercentage < expense.config.data.datasets[0].barPercentage);
    assert.ok(expense.config.data.datasets[0].order > expense.config.data.datasets[2].order);
    assert.equal(expense.config.options.scales.x.stacked, false);
    assert.equal(expense.config.options.scales.y.stacked, false);
    assert.equal(expense.config.options.scales.y.beginAtZero, true);
    assert.equal(expense.config.data.labels[0][0], 'ม.ค. •');
    assert.match(app.content(), /1,200\.25/);
    assert.match(app.content(), /ยังไม่มีข้อมูล/);
    assert.match(app.content(), /ค่าใช้จ่ายรวม \(บาท\)/);
    assert.doesNotMatch(app.content(), /monthly-expenses-chart|monthly-expenses-card/);
    const tooltip = expense.config.options.plugins.tooltip.callbacks.label;
    assert.equal(tooltip({ dataset: expense.config.data.datasets[2], datasetIndex: 2, raw: 1200.25 }), 'ค่าใช้จ่ายรวม: 1,200.25 บาท');
    app.run("BBMonthlyPage.selectMonth('2026-02')");
    assert.equal(expense.destroyed, true);
    const refreshed = app.chartInstances.findLast(chart => chart.canvas.canvas.id === 'monthly-sales-chart');
    assert.equal(refreshed.config.data.labels[1][0], 'ก.พ. •');
    assert.equal(app.state(), before);
    app.run("changePage('overview')");
    assert.equal(refreshed.destroyed, true);
    assert.doesNotMatch(app.content(), /monthly-expenses-card/);
});

test('monthly table puts target first, highlights sales/expenses, and subtracts expenses from sales', async () => {
    const app = createHarness();
    await loadExpenseFixture(app);
    app.run("changePage('monthly')");
    const table = app.content().split('id="monthly-sales-details"')[1].split('</table>')[0];
    const headings = [...table.matchAll(/<th scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map(match => plainText(match[1]));
    assert.deepEqual(headings.slice(0, 4), ['เดือน', 'เป้าหมาย (บาท)', 'ยอดตาม Weekly (บาท)', 'ค่าใช้จ่ายรวม (บาท)']);
    assert.match(headings[4], /ส่วนต่าง \(บาท\).*ยอดขาย − ค่าใช้จ่าย/);
    assert.match(table, /<th scope="col" class="monthly-sales-value">/);
    assert.match(table, /<th scope="col" class="monthly-expense-value">/);
    const calculate = (sales, extra = '') => app.run(`BBMonthlyExpenses.difference({key:'2026-01', sales:{actual:${sales}}, coverage:{}, ${extra}})`);
    assert.equal(calculate('2000.50'), 800.25);
    assert.equal(calculate('1000.10'), -200.15);
    assert.equal(calculate('1200.25'), 0);
    assert.equal(calculate('0'), -1200.25);
    assert.equal(calculate('null'), null);
    assert.equal(calculate('100', 'expenseOnly:true'), null);
    assert.equal(calculate('100', 'coverage:{hasPlanDerived:true}'), null);
    assert.equal(app.run("BBMonthlyExpenses.difference({key:'2026-03',sales:{actual:100}})"), null);
    assert.match(app.run("BBMonthlyExpenses.differenceCell({key:'2026-01',sales:{actual:2000.50}})"), /\+800\.25/);
    assert.match(app.run("BBMonthlyExpenses.differenceCell({key:'2026-01',sales:{actual:1000.10}})"), /−200\.15/);
    assert.match(app.run("BBMonthlyExpenses.differenceCell({key:'2026-01',sales:{actual:1200.25}})"), />0\.00</);
    const css = fs.readFileSync(path.join(root, 'css/monthly.css'), 'utf8');
    assert.match(css, /\.monthly-sales-value\s*\{[^}]*background: #ecfdf3/);
    assert.match(css, /\.monthly-expense-value\s*\{[^}]*background: #fff1f2/);
});

test('monthly totals reconcile raw amounts and use weighted target variance with matched expense coverage', async () => {
    const app = createHarness();
    await loadExpenseFixture(app);
    app.run(`var summaryFixture = [
        {key:'2026-01',sales:{actual:100,target:1000},coverage:{}},
        {key:'2026-02',sales:{actual:900,target:1000},coverage:{}},
        {key:'2026-03',sales:{actual:1000,target:800},coverage:{}}
    ];`);
    const summary = JSON.parse(app.run('JSON.stringify(BBMonthlyExpenses.summarize(summaryFixture))'));
    assert.equal(summary.sales, 2000);
    assert.equal(summary.target, 2800);
    assert.equal(summary.expenses, 1200.25);
    assert.equal(summary.expenseCount, 2);
    assert.equal(summary.difference, null);
    assert.ok(Math.abs(summary.variance - ((2000 / 2800 - 1) * 100)) < 1e-9);
    const matched = JSON.parse(app.run('JSON.stringify(BBMonthlyExpenses.summarize(summaryFixture.slice(0,2)))'));
    assert.equal(matched.difference, -200.25);
    assert.equal(matched.variance, -50);
    const html = app.run('BBMonthlyExpenses.renderTotals(summaryFixture)');
    assert.match(html, /data-total-scope="all"/);
    assert.match(html, /data-total-scope="matched"/);
    assert.match(html, /มีข้อมูล 2\/3 เดือน/);
    assert.match(html, /−200\.25/);
    assert.equal((app.run('BBMonthlyExpenses.renderTotals(summaryFixture.slice(0,2))').match(/<tr /g) || []).length, 1);
    assert.equal(app.run('BBMonthlyExpenses.summarize([]).expenses'), null);
    assert.equal(app.run('BBMonthlyExpenses.renderTotals([])'), '');
    app.run("summaryFixture[0].coverage.hasPlanDerived = true");
    assert.equal(app.run('BBMonthlyExpenses.summarize(summaryFixture).variance'), null);
    assert.equal(app.run('BBMonthlyExpenses.summarize(summaryFixture).matched.length'), 1);
    app.run("changePage('monthly')");
    const table = app.content().split('id="monthly-sales-details"')[1].split('</table>')[0];
    assert.match(table, /<tfoot class="monthly-summary-totals">/);
    assert.match(table, /รวมตามตาราง/);
});

test('expense chart failure exposes the table; missing years have no fake values', async () => {
    const app = createHarness();
    await loadExpenseFixture(app);
    app.failCharts();
    app.run("changePage('monthly')");
    assert.equal(app.details().open, true);
    assert.equal(app.elements.get('monthly-chart-status').hidden, false);
    assert.match(app.content(), /1,200\.25/);
    assert.match(app.run("BBMonthlyExpenses.renderNotes(2027)"), /ยังไม่มีข้อมูลค่าใช้จ่ายปี 2027/);
    assert.doesNotMatch(app.run("BBMonthlyExpenses.renderNotes(2027)"), /1,200\.25|<canvas/);
});

test('expense source failure does not affect Monthly sales rendering', async () => {
    const app = createHarness();
    const before = app.state();
    await app.run('BBExpenseData.load()');
    app.run("changePage('monthly')");
    assert.match(app.content(), /โหลดชีตค่าใช้จ่ายไม่สำเร็จ/);
    assert.match(app.content(), /monthly-sales-chart/);
    assert.doesNotMatch(app.content(), /id="monthly-expenses-chart"/);
    assert.equal(app.state(), before);
});

test('combined chart joins by month key, preserves missing months and expense-only periods', async () => {
    const app = createHarness();
    app.context.fetch = async () => ({ ok: true, text: async () => 'เดือน, มี.ค. 26, ม.ค. 26, ก.พ. 26, ม.ค. 27\nอาคาร,7000000,321.75,,999\nTOTAL,7000000,321.75,0,999' });
    await app.run('BBExpenseData.load()');
    app.run("changePage('monthly')");
    const config = app.chartInstances.at(-1).config;
    assert.deepEqual(Array.from(config.data.datasets[2].data), [321.75, null, 7000000]);
    assert.equal(config.data.datasets[0].data[2], null);
    assert.equal(config.data.datasets[1].data[2], null);
    assert.match(config.data.labels[2].join(' '), /มี.ค. 2026 เฉพาะค่าใช้จ่าย/);
    assert.match(app.content(), /มีนาคม 2026 \(ยังไม่มีข้อมูลยอดขาย\)/);
    assert.match(app.content(), /7,000,000\.00/);
    assert.equal(app.run("BBMonthlyExpenses.value('2026-02')"), null);
    const calls = exerciseMonthlyTrophyPlugin(app).calls;
    assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === '7M'));
    const hidden = exerciseMonthlyTrophyPlugin(app, { actual: true, target: true, expense: false });
    assert.equal(hidden.calls.some(call => call[0] === 'fillText' && call[1] === '7M'), false);
});

test('nearby sales/target labels are spaced apart without changing their values', () => {
    const app = createHarness();
    app.run("changePage('monthly')");
    const { calls } = exerciseMonthlyTrophyPlugin(app);
    const labels = calls.filter(call => call[0] === 'fillText' && !String(call[1]).includes('%'));
    assert.ok(Math.abs(labels[0][3] - labels[2][3]) >= 14);
});

test('Monthly CSS selectors cannot match existing Weekly classes or global elements', () => {
    const css = fs.readFileSync(path.join(root, 'css/monthly.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /@import\b/i);
    let checked = 0;
    for (const match of css.matchAll(/([^{}]+)\{/g)) {
        const rule = match[1].trim();
        if (rule.startsWith('@media') || rule.startsWith('@supports') || rule.startsWith('@container')) continue;
        for (const selector of rule.split(',')) {
            assert.match(selector.trim(), /^\.monthly-[\w-]+(?:\b|\s|:|\[|[>+~.#])/, `Unscoped CSS selector: ${selector}`);
            checked++;
        }
    }
    assert.ok(checked > 20, 'All real Monthly stylesheet rules were inspected');
    assert.match(indexHTML, /href="css\/monthly\.css(?:\?[^" ]*)?"/);
});

test('Monthly displays all five departments together with one shared month selector', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    const html = app.content();
    const headerControl = app.monthlyControl();
    assert.equal((html.match(/<select\b/g) || []).length, 0, 'Department content must not introduce its own month filters');
    assert.equal((headerControl.match(/<select\b/g) || []).length, 1, 'All departments must use the single header month filter');
    assert.equal((headerControl.match(/id="monthly-month-select"/g) || []).length, 1);
    for (const [department, name] of Object.entries(departmentNames)) {
        const section = departmentHTML(html, department);
        const heading = section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] || '';
        assert.match(plainText(heading), name);
        assert.match(plainText(heading), /เดือน กุมภาพันธ์ 2026/);
        assert.doesNotMatch(section.match(/^<[^>]+>/)[0], /\bhidden\b|display\s*:\s*none|aria-hidden=["']true/);
        assert.match(html, new RegExp(`BBMonthlyPage\\.jumpTo\\('${department}'\\)`));
    }
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly shared typography starts at the department divider and stops before the back-to-top control', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    const html = app.content();
    const start = html.indexOf('<div id="monthly-reviews" class="monthly-review-scope">');
    const end = html.indexOf('<button id="monthly-back-top"');
    assert.ok(start > html.indexOf('monthly-department-nav'));
    assert.ok(end > start);
    assert.equal((html.match(/id="monthly-reviews"/g) || []).length, 1);
    const scope = html.slice(start, end);
    assert.match(scope, /สรุปผลงานทุกฝ่าย/);
    for (const key of ['marketing', 'admin', 'building', 'car', 'tech']) {
        assert.ok(scope.includes(`id="monthly-${key}"`));
    }
    assert.match(scope, /monthly-weeks-card/);
    assert.doesNotMatch(scope, /monthly-reference-kpi|monthly-sales-chart|monthly-department-nav/);
    assert.match(scope, /<\/div>\s*$/);
    const css = fs.readFileSync(path.join(root, 'css/monthly.css'), 'utf8');
    assert.match(css, /\.monthly-review-scope#monthly-reviews\s*\{/);
    assert.match(css, /--review-heading:/);
    assert.match(css, /--review-card-heading:/);
    assert.match(css, /font-size: var\(--review-kpi\)/);
    assert.equal(app.warnings.length, 0);
});

test('Marketing TOTAL card changes with the month and uses weighted aggregate ROAS', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    const totalCard = html => departmentHTML(html, 'marketing').match(/<article\b[^>]*class="[^"]*\bmonthly-business-total\b[^"]*"[^>]*>([\s\S]*?)<\/article>/)?.[1] || '';

    app.run("changePage('monthly')");
    const february = plainText(totalCard(app.content()));
    const februaryRatios = JSON.parse(app.run(`JSON.stringify((() => {
        const marketing = BBMonthlyData.build(dashboardData).months.find(month => month.key === '2026-02').marketing;
        return { weighted: marketing.roas, summed: Object.values(marketing.companies).reduce((total, company) => total + company.roas, 0) };
    })())`));
    assert.match(february, /รวมทั้งหมด/);
    assert.match(february, /5,747 บาท/);
    assert.match(february, /งบ 7,350 บาท/);
    assert.match(february, /Google 2,590 บาท/);
    assert.match(february, /Facebook 3,157 บาท/);
    assert.match(february, /ROAS 49\.9 เท่า/);
    assert.match(february, /ค่าเฉลี่ย ต่อการติดต่อ 9 บาท \/ ติดต่อ ต่อลูกค้า 36 บาท \/ ลูกค้า/);
    assert.ok(Math.abs(februaryRatios.weighted - (287000 / 5747)) < 1e-9);
    assert.ok(Math.abs(februaryRatios.summed - februaryRatios.weighted) > 90, 'Aggregate ROAS must not equal the sum of company ROAS values');
    assert.doesNotMatch(february, /ROAS 148\.8 เท่า/);

    app.run("BBMonthlyPage.selectMonth('2026-01')");
    const january = plainText(totalCard(app.content()));
    assert.match(january, /2,463 บาท/);
    assert.match(january, /งบ 3,150 บาท/);
    assert.match(january, /Google 1,110 บาท/);
    assert.match(january, /Facebook 1,353 บาท/);
    assert.match(january, /ROAS 49\.9 เท่า/);
    assert.match(january, /ค่าเฉลี่ย ต่อการติดต่อ 9 บาท \/ ติดต่อ ต่อลูกค้า 36 บาท \/ ลูกค้า/);
    assert.doesNotMatch(departmentHTML(app.content(), 'marketing'), /ค่าเฉลี่ยบาท \/ ติดต่อ =|ROAS รวม =/);
    assert.notEqual(january, february);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly CAR marketing card uses the source-defined customer cost', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    const carCard = html => departmentHTML(html, 'marketing').match(/<article\b[^>]*class="[^"]*\bmonthly-business-car\b[^"]*"[^>]*>([\s\S]*?)<\/article>/)?.[1] || '';

    app.run("changePage('monthly')");
    assert.match(plainText(carCard(app.content())), /ต่อลูกค้า 777 บาท \/ ลูกค้า/);
    app.run("BBMonthlyPage.selectMonth('2026-01')");
    assert.match(plainText(carCard(app.content())), /ต่อลูกค้า 592 บาท \/ ลูกค้า/);
    assert.equal(app.warnings.length, 0);
});

test('Monthly top summary keeps only sales while Marketing and technician figures remain below', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    const topSummary = html => html.match(/<div\b[^>]*class="[^"]*\bmonthly-metrics\b[^"]*"[^>]*>([\s\S]*?)<div\b[^>]*class="[^"]*\bmonthly-main-grid\b/)?.[1] || '';
    const metricCount = html => Array.from(html.matchAll(/<article\b([^>]*)>/g)).filter(match => /\bmonthly-metric(?:\s|"|')/.test(match[1])).length;
    const businessRow = (html, key) => {
        const token = `<div class="monthly-company monthly-company-${key}">`;
        const start = html.indexOf(token);
        assert.ok(start >= 0, `Missing ${key.toUpperCase()} business row`);
        const tail = html.slice(start);
        const next = tail.slice(token.length).search(/<div class="monthly-company monthly-company-(?:gfs|mhl|car)">/);
        const caption = tail.indexOf('<p class="monthly-caption">');
        const end = next >= 0 ? token.length + next : caption >= 0 ? caption : tail.length;
        return tail.slice(0, end);
    };
    const assertBusinessRow = (html, key, icon, actual, target, rate) => {
        const row = businessRow(html, key);
        const text = plainText(row);
        assert.match(row, new RegExp(`data-lucide="${icon}"`));
        assert.ok(text.includes(`${actual} บาท`), `${key}: actual`);
        assert.ok(text.includes(`เป้า ${target} บาท`), `${key}: target`);
        assert.ok(text.includes(rate), `${key}: attainment`);
    };

    app.run("changePage('monthly')");
    const february = app.content();
    const februaryTop = topSummary(february);
    const februaryTopText = plainText(februaryTop);
    assert.match(february, /class="monthly-performance-head"/);
    assert.match(plainText(february), /สรุปผลการดำเนินงาน ภาพรวมยอดขายประจำเดือน กุมภาพันธ์ 2026 ติดตามเป้าหมายอย่างชัดเจน เพื่อการเติบโตที่มั่นคง/);
    assert.equal(metricCount(februaryTop), 1);
    assert.match(februaryTop, /monthly-metric[\s\S]*monthly-business-summary/);
    assert.doesNotMatch(februaryTop, /monthly-target-status|monthly-sales-status/);
    assert.doesNotMatch(februaryTop, /monthly-status-progress-copy/);
    assert.match(februaryTop, /monthly-business-summary/);
    assert.match(februaryTop, /id="monthly-department-sales-title">ยอดขายแยกฝ่าย/);
    assert.match(februaryTop, /ยอดขาย Sales Representative[\s\S]*?3,899 <small>บาท<\/small>/);
    assert.match(februaryTop, /ยอดขาย Project Sales Executive[\s\S]*?5,033 <small>บาท<\/small>/);
    assert.match(februaryTop, /ยอดขาย Admin[\s\S]*?3,017 <small>บาท<\/small>/);
    assert.match(februaryTop, /มุมมองผู้รับผิดชอบ · ไม่บวกซ้ำกับยอดรวม/);
    assert.doesNotMatch(februaryTop, /monthly-landscape|<img[^>]+monthly-mountain/);
    assert.match(february, /<div class="monthly-main-grid">\s*<article class="monthly-card monthly-chart-card monthly-chart-card-wide monthly-sales-expenses-card">/);
    assert.match(februaryTopText, /ยอดขายรวมเดือน/);
    assert.match(februaryTopText, /ยอดขายรวมเดือน ภาพรวมผลการดำเนินงานประจำเดือน กุมภาพันธ์ 2026/);
    assert.doesNotMatch(februaryTopText, /เดือนที่เลือก/);
    assert.match(februaryTopText, /287,000/);
    assert.match(februaryTopText, /เป้ารวมเดือน 350,000 บาท/);
    assert.match(februaryTop, /class="monthly-metric-badge" aria-label="ทำได้ 82% ของเป้ารายเดือน">82%<\/span>/);
    assert.match(februaryTop, /<div class="monthly-sales-progress" aria-hidden="true"><span style="width:82%"><\/span><\/div>/);
    assert.doesNotMatch(februaryTop, /monthly-metric-badge[\s\S]*?\+82%/);
    assert.match(februaryTopText, /\+164,000 บาท \(\+133\.3%\) เทียบ มกราคม 2026/);
    assert.match(februaryTop, /monthly-reference-comparison" data-direction="up"/);
    assert.doesNotMatch(februaryTop, /monthly-metric-detail-item|monthly-metric-gap-value/);
    assert.doesNotMatch(februaryTop, /class="monthly-metric-comparison"|<details[^>]*>\s*<summary>เปรียบเทียบเดือนก่อน/);
    assert.doesNotMatch(februaryTop, /ค่าโฆษณารวม|งานติดตั้งอาคาร/);
    assert.match(departmentHTML(february, 'marketing'), /5,747 <small>บาท<\/small>/);
    assert.match(departmentHTML(february, 'tech'), /<h4>งานติดตั้งอาคาร<\/h4><strong>119 <small>งาน<\/small><\/strong>/);
    assert.match(departmentHTML(february, 'tech'), /<h4>พื้นที่ติดตั้ง<\/h4><strong>7,063 <small>ตร\.ฟุต<\/small><\/strong>/);
    assertBusinessRow(february, 'gfs', 'building-2', '77,000', '98,000', '78.6%');
    assertBusinessRow(february, 'mhl', 'layers', '91,000', '112,000', '81.3%');
    assertBusinessRow(february, 'car', 'car-front', '119,000', '140,000', '85%');

    app.run("BBMonthlyPage.selectMonth('2026-01')");
    const january = app.content();
    const januaryTop = topSummary(january);
    const januaryTopText = plainText(januaryTop);
    assert.equal(metricCount(januaryTop), 1);
    assert.match(januaryTopText, /ยอดขายรวมเดือน/);
    assert.match(januaryTopText, /ยอดขายรวมเดือน ภาพรวมผลการดำเนินงานประจำเดือน มกราคม 2026/);
    assert.doesNotMatch(januaryTopText, /เดือนที่เลือก/);
    assert.match(januaryTopText, /123,000/);
    assert.match(januaryTopText, /เป้ารวมเดือน 150,000 บาท/);
    assert.match(januaryTopText, /ไม่มีข้อมูลเดือนก่อนหน้าสำหรับเปรียบเทียบ/);
    assert.doesNotMatch(januaryTop, /ค่าโฆษณารวม|งานติดตั้งอาคาร/);
    assert.match(departmentHTML(january, 'marketing'), /2,463 <small>บาท<\/small>/);
    assert.match(departmentHTML(january, 'tech'), /<h4>งานติดตั้งอาคาร<\/h4><strong>51 <small>งาน<\/small><\/strong>/);
    assert.match(departmentHTML(january, 'tech'), /<h4>พื้นที่ติดตั้ง<\/h4><strong>3,027 <small>ตร\.ฟุต<\/small><\/strong>/);
    assertBusinessRow(january, 'gfs', 'building-2', '33,000', '42,000', '78.6%');
    assertBusinessRow(january, 'mhl', 'layers', '39,000', '48,000', '81.3%');
    assertBusinessRow(january, 'car', 'car-front', '51,000', '60,000', '85%');
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly sales hero caps only the visual bar and suppresses unavailable or plan-derived attainment', () => {
    const cases = [
        { name: 'above target', actual: 150, target: 100, expected: '150%', fill: 100 },
        { name: 'zero target', actual: 10, target: 0, expected: '—', fill: 0 },
        { name: 'plan-derived', actual: 120, target: 100, sourceMode: 'row-weekly-plan', expected: '—', fill: 0 }
    ];
    for (const scenario of cases) {
        const app = createHarness();
        app.run(`
            dashboardData = [{
                id: ${JSON.stringify(scenario.name)}, week: 'Week 1', dateRange: '1–7 ม.ค. 2026',
                salesActualTotal: ${scenario.actual}, salesTargetTotal: ${scenario.target}
                ${scenario.sourceMode ? `, sourceMode: '${scenario.sourceMode}'` : ''}
            }];
            changePage('monthly');
        `);
        const html = app.content();
        const hero = html.match(/<div\b[^>]*class="[^"]*\bmonthly-metrics\b[^"]*"[^>]*>([\s\S]*?)<div\b[^>]*class="[^"]*\bmonthly-main-grid\b/)?.[1] || '';
        const badge = plainText(hero.match(/<span\b[^>]*class="monthly-metric-badge"[^>]*>([\s\S]*?)<\/span>/)?.[1] || '').trim();
        assert.equal(badge, scenario.expected, `${scenario.name}: badge`);
        assert.match(hero, new RegExp(`class="monthly-metric-badge" aria-label="ทำได้ ${scenario.expected} ของเป้ารายเดือน"`), `${scenario.name}: accessible target copy`);
        assert.match(plainText(hero), new RegExp(`เป้ารวมเดือน ${scenario.target} บาท`), `${scenario.name}: target remains visible`);
        assert.match(hero, new RegExp(`<div class="monthly-sales-progress" aria-hidden="true"><span style="width:${scenario.fill}%"><\\/span><\\/div>`), `${scenario.name}: visual fill`);
        assert.doesNotMatch(badge, /^\+/, `${scenario.name}: target attainment is not a growth claim`);
        if (scenario.name === 'above target') assert.match(plainText(hero), /150 บาท[\s\S]*150%/);
        if (scenario.name === 'plan-derived') assert.match(plainText(hero), /ยอดอ้างอิงจาก Weekly/);
        assert.equal(app.counters.fetch, 0);
        assert.equal(app.warnings.length, 0);
    }
});

test('Monthly sales result moves into the main card when the selected month changes', () => {
    const app = createHarness();
    const hero = html => html.match(/<div\b[^>]*class="[^"]*\bmonthly-metrics\b[^"]*"[^>]*>([\s\S]*?)<div\b[^>]*class="[^"]*\bmonthly-main-grid\b/)?.[1] || '';
    app.run(`
        dashboardData = [
            { id: 'exact', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 100 },
            { id: 'below', week: 'Week 5', dateRange: '1–7 ก.พ. 2026', salesActualTotal: 80, salesTargetTotal: 100 }
        ];
        changePage('monthly');
    `);

    const february = hero(app.content());
    const februaryText = plainText(february);
    assert.match(february, /monthly-result-below/);
    assert.match(february, /class="[^"]*monthly-metric[^"]*" data-status="below"/);
    assert.match(february, /class="monthly-reference-result" data-status="below"/);
    assert.match(february, /data-target-icon="frown"/);
    assert.doesNotMatch(february, /monthly-target-status|monthly-sales-status|data-status-icon=/);
    assert.match(februaryText, /ยอดขายรวมเดือน/);
    assert.match(februaryText, /ยอดขายรวมเดือน ภาพรวมผลการดำเนินงานประจำเดือน กุมภาพันธ์ 2026/);
    assert.match(februaryText, /ยังไม่ถึงเป้า/);
    assert.match(februaryText, /ยังขาด 20 บาท/);
    assert.doesNotMatch(february, /monthly-status-detail|monthly-status-note|เทียบเป้าหมายรวมของเดือน/);
    assert.match(februaryText, /−20 บาท \(-20%\) เทียบ มกราคม 2026/);

    app.run("BBMonthlyPage.selectMonth('2026-01')");
    const january = hero(app.content());
    const januaryText = plainText(january);
    assert.match(january, /monthly-result-achieved/);
    assert.match(january, /class="[^"]*monthly-metric[^"]*" data-status="achieved"/);
    assert.match(january, /class="monthly-reference-result" data-status="achieved"/);
    assert.match(january, /data-target-icon="trophy"/);
    assert.doesNotMatch(january, /monthly-target-status|monthly-sales-status|data-status-icon=/);
    assert.match(januaryText, /ยอดขายรวมเดือน/);
    assert.match(januaryText, /ยอดขายรวมเดือน ภาพรวมผลการดำเนินงานประจำเดือน มกราคม 2026/);
    assert.match(januaryText, /ถึงเป้าแล้ว!/);
    assert.match(januaryText, /ยอดขายเท่ากับเป้ารายเดือน/);
    assert.doesNotMatch(january, /monthly-status-detail|monthly-status-note|เทียบเป้าหมายรวมของเดือน/);
    assert.match(januaryText, /ไม่มีข้อมูลเดือนก่อนหน้าสำหรับเปรียบเทียบ/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly sales result distinguishes achieved, below and pending edge cases', () => {
    const cases = [
        { name: 'above', rows: [{ id: 'above', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 125, salesTargetTotal: 100 }], kind: 'achieved', icon: 'trophy', phrases: ['ถึงเป้าแล้ว!', 'เกินเป้า 25 บาท'] },
        { name: 'fractional-gap', rows: [{ id: 'fractional', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 99.6, salesTargetTotal: 100 }], kind: 'below', icon: 'disappointed', phrases: ['ยังไม่ถึงเป้า', 'ยังขาด น้อยกว่า 1 บาท'] },
        { name: 'zero-target', rows: [{ id: 'zero', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 10, salesTargetTotal: 0 }], kind: 'pending', icon: 'pending', phrases: ['ยังไม่มีเป้าหมาย', 'ยังไม่สรุปผลเทียบเป้า'] },
        { name: 'plan-derived', rows: [{ id: 'plan', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 120, salesTargetTotal: 100, sourceMode: 'row-weekly-plan' }], kind: 'pending', icon: 'pending', phrases: ['รอตรวจสอบข้อมูล', 'ยังไม่สรุปผลเทียบเป้า'] },
        { name: 'future-month', rows: [{ id: 'future', week: 'Week 40', dateRange: '1–7 ต.ค. 2026', salesActualTotal: 120, salesTargetTotal: 100 }], kind: 'pending', icon: 'pending', phrases: ['เดือนยังไม่เริ่ม', 'ยังไม่สรุปผลเทียบเป้า'] },
        { name: 'future-actual', rows: [{ id: 'future-actual', week: 'Week 36', dateRange: '8–14 ก.ย. 2026', salesActualTotal: 120, salesTargetTotal: 100 }], kind: 'pending', icon: 'pending', phrases: ['รอตรวจสอบข้อมูล', 'ยังไม่สรุปผลเทียบเป้า'] },
        { name: 'open-achieved', rows: [{ id: 'open', week: 'Week 36', dateRange: '1–3 ก.ย. 2026', salesActualTotal: 100, salesTargetTotal: 100 }], kind: 'achieved', icon: 'trophy', phrases: ['ถึงเป้าแล้ว!', 'ยอดขายเท่ากับเป้ารายเดือน'] },
        { name: 'unconfirmed-achieved', rows: [{ id: 'achieved', week: 'Week 31', dateRange: '1–7 ส.ค. 2026', salesActualTotal: 30, salesTargetTotal: 10 }, { id: 'unconfirmed', week: 'Week 32', dateRange: '8–14 ส.ค. 2026', salesActualTotal: 0, salesTargetTotal: 10 }], kind: 'achieved', icon: 'trophy', phrases: ['ถึงเป้าแล้ว!', 'เกินเป้า 10 บาท'] }
    ];
    for (const scenario of cases) {
        const app = createHarness();
        app.run(`dashboardData = ${JSON.stringify(scenario.rows)}; changePage('monthly');`);
        const html = app.content().match(/<div\b[^>]*class="[^"]*\bmonthly-metrics\b[^"]*"[^>]*>([\s\S]*?)<div\b[^>]*class="[^"]*\bmonthly-main-grid\b/)?.[1] || '';
        const text = plainText(html);
        const targetIcon = { achieved: 'trophy', below: 'frown', pending: 'clock-3' }[scenario.kind];
        assert.match(html, new RegExp(`monthly-result-${scenario.kind}`), `${scenario.name}: hero class`);
        assert.match(html, new RegExp(`data-status="${scenario.kind}"`), `${scenario.name}: status data`);
        assert.match(html, new RegExp('data-target-icon="' + targetIcon + '"'), `${scenario.name}: target icon`);
        assert.doesNotMatch(html, /monthly-target-status|monthly-sales-status|data-status-icon=/, `${scenario.name}: standalone status card removed`);
        assert.doesNotMatch(html, /monthly-status-detail|monthly-status-note/, `${scenario.name}: redundant status footer removed`);
        for (const phrase of scenario.phrases) assert.ok(text.includes(phrase), `${scenario.name}: missing ${phrase}`);
        assert.equal(app.counters.fetch, 0);
        assert.equal(app.warnings.length, 0);
    }
});

test('one month change refreshes every department without mutating frozen Weekly data or filters', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    const stateBefore = app.state();
    assert.equal(app.run(`(function isDeepFrozen(value) {
        return !value || typeof value !== 'object' || (Object.isFrozen(value) && Object.values(value).every(isDeepFrozen));
    })(dashboardData)`), true);
    app.run("changePage('monthly')");
    const february = app.content();
    app.run("BBMonthlyPage.selectMonth('2026-01')");
    const january = app.content();
    const januaryHeader = app.monthlyControl();
    const departmentMonthlyValues = {
        marketing: [1631, 699],
        admin: [3017, 1293],
        building: [3899, 1671],
        car: [119000, 51000],
        tech: [7063, 3027]
    };
    for (const [department, [februaryValue, januaryValue]] of Object.entries(departmentMonthlyValues)) {
        const februarySection = departmentHTML(february, department);
        const januarySection = departmentHTML(january, department);
        assert.notEqual(januarySection, februarySection, `${department} retained a stale month`);
        assert.ok(plainText(februarySection).includes(februaryValue.toLocaleString('th-TH')), `${department} did not show February's aggregate`);
        assert.ok(plainText(januarySection).includes(januaryValue.toLocaleString('th-TH')), `${department} did not show January's aggregate`);
        assert.match(plainText(februarySection.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] || ''), /เดือน กุมภาพันธ์ 2026/);
        assert.match(plainText(januarySection.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] || ''), /เดือน มกราคม 2026/);
    }
    assert.equal(app.state(), stateBefore);
    assert.match(januaryHeader, /value="2026-01" selected/);
    assert.equal(app.context.document.activeElement.id, 'monthly-month-select');
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly Sales Admin keeps grouped channel and customer values when the shared month changes', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    const panel = (html, className) => html.match(new RegExp(`<article\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/article>`))?.[1] || '';
    const groups = html => Array.from(html.matchAll(/<tbody class="monthly-admin-group monthly-admin-(gfs|mhl)">([\s\S]*?)<\/tbody>/g), match => ({ key: match[1], html: match[2] }));
    const row = (html, label, type) => Array.from(html.matchAll(new RegExp(`<tr class="${type}">([\\s\\S]*?)<\\/tr>`, 'g')), match => match[1]).find(value => value.includes(`<strong>${label}</strong>`)) || '';
    const assertChannel = (group, label, contacts, leads, rate, width) => {
        const html = row(group.html, label, 'monthly-admin-channel-row');
        assert.match(html, new RegExp(`<td>${contacts}<\\/td><td>${leads}<\\/td>`));
        assert.match(html, new RegExp(`<div class="monthly-admin-rate"><strong>${rate}<\\/strong><span class="monthly-admin-rate-track" aria-hidden="true"><span style="width:${width}%"><\\/span>`));
    };
    const assertCustomer = (group, label, sales, installs) => {
        const html = row(group.html, label, 'monthly-admin-customer-row');
        assert.match(html, new RegExp(`<td>${sales}<\\/td><td>${installs}<\\/td>`));
    };
    const read = html => {
        const admin = departmentHTML(html, 'admin');
        const trendPosition = admin.indexOf('แนวโน้มการติดต่อ ส่งต่อ ติดตั้ง และยอดขาย');
        assert.ok(trendPosition > admin.indexOf('monthly-admin-contact-panel'));
        assert.ok(trendPosition > admin.indexOf('monthly-admin-customer-panel'));
        const contacts = groups(panel(admin, 'monthly-admin-contact-panel'));
        const customers = groups(panel(admin, 'monthly-admin-customer-panel'));
        assert.deepEqual(contacts.map(group => group.key), ['gfs', 'mhl']);
        assert.deepEqual(customers.map(group => group.key), ['gfs', 'mhl']);
        return { admin, contacts: Object.fromEntries(contacts.map(group => [group.key, group])), customers: Object.fromEntries(customers.map(group => [group.key, group])) };
    };

    app.run("changePage('monthly')");
    const february = read(app.content());
    assertChannel(february.contacts.gfs, 'GFS LINE', 70, 21, '30%', 30);
    assertChannel(february.contacts.mhl, 'MHL โทรศัพท์', 35, 14, '40%', 40);
    assertCustomer(february.customers.gfs, 'GFS ลูกค้าใหม่', 700, 14);
    assertCustomer(february.customers.gfs, 'GFS ลูกค้าเก่า', 567, 7);
    assertCustomer(february.customers.mhl, 'MHL ลูกค้าใหม่', '1,050', 14);
    assertCustomer(february.customers.mhl, 'MHL ลูกค้าเก่า', 700, 14);
    assert.match(february.admin, /monthly-admin-channel-line/);
    assert.match(february.admin, /monthly-admin-channel-fb/);
    assert.match(february.admin, /monthly-admin-channel-phone/);
    assert.match(february.admin, /data-lucide="star"/);
    assert.match(february.admin, /data-lucide="users-round"/);
    assert.match(february.admin, /ผลรวมแยกช่องทางต่างจากยอดรวม Admin/);
    assert.doesNotMatch(february.admin, /อัตราส่งต่อ = Leads ÷ ติดต่อ/);

    app.run("BBMonthlyPage.selectMonth('2026-01')");
    const january = read(app.content());
    assertChannel(january.contacts.gfs, 'GFS LINE', 30, 9, '30%', 30);
    assertChannel(january.contacts.mhl, 'MHL โทรศัพท์', 15, 6, '40%', 40);
    assertCustomer(january.customers.gfs, 'GFS ลูกค้าใหม่', 300, 6);
    assertCustomer(january.customers.gfs, 'GFS ลูกค้าเก่า', 243, 3);
    assertCustomer(january.customers.mhl, 'MHL ลูกค้าใหม่', 450, 6);
    assertCustomer(january.customers.mhl, 'MHL ลูกค้าเก่า', 300, 6);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly Sales Admin conversion bars clamp safely and plan-derived data suppresses rates', () => {
    const app = createHarness();
    app.run(`
        dashboardData = [{
            id: 'admin-guards', week: 'Week 1', dateRange: '1–7 ม.ค. 2026', salesActualTotal: 100, salesTargetTotal: 100,
            admin: {
                contacts: { total: 20, gfs: { line: 0, fb: 10, tel: 10 }, mhl: { line: 0, fb: 0, tel: 0 } },
                leads: { actual: 30, target: 30, gfs: { line: 5, fb: 20, tel: 5 }, mhl: { line: 0, fb: 0, tel: 0 } },
                sales: { totalSales: 100, totalInstalls: 2, newSales: { gfs: 60, mhl: 0 }, oldSales: { gfs: 40, mhl: 0 }, newInstalls: { gfs: 1, mhl: 0 }, oldInstalls: { gfs: 1, mhl: 0 } }
            }
        }];
        changePage('monthly');
    `);
    const channelRow = (html, label) => Array.from(departmentHTML(html, 'admin').matchAll(/<tr class="monthly-admin-channel-row">([\s\S]*?)<\/tr>/g), match => match[1]).find(value => value.includes(`<strong>${label}</strong>`)) || '';
    let html = app.content();
    assert.match(channelRow(html, 'GFS LINE'), /<strong>—<\/strong>[\s\S]*?style="width:0%"/);
    assert.match(channelRow(html, 'GFS Facebook'), /<strong>200%<\/strong>[\s\S]*?style="width:100%"/);
    assert.match(channelRow(html, 'GFS โทรศัพท์'), /<strong>50%<\/strong>[\s\S]*?style="width:50%"/);

    app.run("dashboardData[0].sourceMode = 'row-weekly-plan'; updateDashboardUI()");
    html = departmentHTML(app.content(), 'admin');
    assert.equal((html.match(/<div class="monthly-admin-rate"><strong>—<\/strong>/g) || []).length, 6);
    assert.equal((html.match(/class="monthly-admin-rate-track" aria-hidden="true"><span style="width:0%"/g) || []).length, 6);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('department jumps only scroll and focus within Monthly, preserving the month and Weekly state', () => {
    const app = createHarness();
    app.run("changePage('overview')");
    const weeklyBefore = app.snapshot();
    const stateBefore = app.state();
    app.run("changePage('monthly'); BBMonthlyPage.selectMonth('2026-01')");
    const monthlyBefore = app.snapshot();
    const chartCount = app.chartInstances.length;
    const destroys = app.counters.chartDestroyed;
    for (const department of Object.keys(departmentNames)) {
        app.run(`BBMonthlyPage.jumpTo('${department}')`);
        assert.equal(app.scrolls.at(-1)?.id, `monthly-${department}`);
        assert.equal(app.context.document.activeElement.id, `monthly-heading-${department}`);
        assert.deepEqual(app.snapshot(), monthlyBefore, 'Jump caused a rerender, route or month change');
        assert.equal(app.run('currentPage'), 'monthly');
        assert.equal(app.state(), stateBefore);
    }
    assert.equal(app.chartInstances.length, chartCount);
    assert.equal(app.counters.chartDestroyed, destroys);
    assert.equal(app.counters.fetch, 0);
    app.run("changePage('overview')");
    assert.deepEqual(app.snapshot(), weeklyBefore);
    assert.equal(app.state(), stateBefore);
});

test('unsupported department jumps and jumps while Weekly is active are harmless', () => {
    const app = createHarness();
    app.run("changePage('monthly')");
    const before = app.snapshot();
    const stateBefore = app.state();
    for (const key of ['unknown', 'overview', 'month-select', '', '<img>']) {
        assert.doesNotThrow(() => app.run(`BBMonthlyPage.jumpTo(${JSON.stringify(key)})`));
    }
    assert.deepEqual(app.snapshot(), before);
    assert.equal(app.scrolls.length, 0);
    app.run("changePage('sales')");
    const weeklyBefore = app.snapshot();
    app.run("BBMonthlyPage.jumpTo('marketing')");
    assert.deepEqual(app.snapshot(), weeklyBefore);
    assert.equal(app.scrolls.length, 0);
    assert.equal(app.state(), stateBefore);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('all-department Monthly omits cumulative, snapshot, unsafe technician target and source percentage values', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly'); BBMonthlyPage.selectMonth('2026-01')");
    const text = plainText(app.content());
    const unsafeValues = [975318642, 864207531, 753196428, 642085317, 531974206, 420863195, 319752084, 208641973, 197530864, 986421753, 875310642, 764209531];
    for (const value of unsafeValues) {
        for (const multiplier of [1, 2, 3, 7]) {
            const rendered = value * multiplier;
            assert.equal(text.includes(String(rendered)), false, `Unsafe source value leaked: ${rendered}`);
            assert.equal(text.includes(rendered.toLocaleString('th-TH')), false, `Unsafe formatted source value leaked: ${rendered}`);
        }
    }
    assert.equal(app.warnings.length, 0);
});

test('plan-derived months suppress performance percentages and ROAS in every department', () => {
    const app = createHarness();
    installDepartmentFixture(app, { planDerived: true });
    app.run("changePage('monthly')");
    assert.match(app.content(), /มีข้อมูลจากแผน/);
    for (const department of Object.keys(departmentNames)) {
        const text = plainText(departmentHTML(app.content(), department));
        assert.match(text, /—/, `${department} should show unavailable rates for plan-derived data`);
        assert.doesNotMatch(text, /\d[\d,.]*\s*%|\d[\d,.]*\s*เท่า/, `${department} showed an apparent actual-performance rate from plan data`);
    }
    assert.equal(app.warnings.length, 0);
});

test('department attribution and CAR detail totals remain distinct from top-level sales with visible notes', () => {
    const app = createHarness();
    installDepartmentFixture(app, { divergent: true });
    app.run("changePage('monthly')");
    const car = plainText(departmentHTML(app.content(), 'car'));
    const building = plainText(departmentHTML(app.content(), 'building'));
    assert.match(car, /119,861/, 'CAR detail actual must not be overwritten with root CAR sales');
    assert.match(car, /ต่าง|ไม่ตรง|ไม่เท่า/, 'CAR discrepancy needs a visible source explanation');
    assert.match(app.content(), /119,000/, 'Top-level CAR actual must remain unchanged');
    assert.match(building, /3,899/);
    assert.match(building, /5,033/);
    assert.match(building, /168,000/, 'Building business actual must not become the sum of salesperson attribution');
    assert.match(building, /ต่าง|ไม่ตรง|ไม่เท่า/, 'Attribution discrepancy needs a visible source explanation');
    assert.equal(app.warnings.length, 0);
});

test('Monthly CAR presents sales, new customers, contact channels, customer sources and damage causes', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    const car = departmentHTML(app.content(), 'car');
    const text = plainText(car);

    assert.match(car, /monthly-car-kpi-sales[\s\S]*?<p>ยอดขาย<\/p>[\s\S]*?119,000 <small>บาท/);
    assert.match(car, /monthly-car-kpi-customers[\s\S]*?<p>จำนวนลูกค้าใหม่<\/p>[\s\S]*?203 <small>ราย/);
    assert.match(car, /monthly-car-kpi-contacts[\s\S]*?<p>การติดต่อลูกค้า<\/p>[\s\S]*?259 <small>ครั้ง/);
    assert.match(text, /รวมทั้งหมด 259 ครั้ง LINE LINE 91 ครั้ง 35\.1% f Facebook 77 ครั้ง 29\.7% โทรศัพท์ 91 ครั้ง 35\.1%/);
    assert.match(text, /รวมทั้งหมด 203 ราย LINE LINE 35 ราย f Facebook 42 ราย โทรศัพท์ 28 ราย Walk-in 21 ราย Showroom 49 ราย อื่น ๆ 28 ราย/);
    const sourceChart = app.chartInstances.find(chart => chart.config.type === 'doughnut').config;
    assert.deepEqual(Array.from(sourceChart.data.datasets[0].data), [42, 35, 21, 28, 49, 28]);
    assert.equal(sourceChart.data.datasets[0].data.reduce((sum, value) => sum + value, 0), 203);
    assert.match(text, /Facebook 20\.7% LINE 17\.2% Walk-in 10\.3% โทรศัพท์ 13\.8% Showroom 24\.1% อื่น ๆ 13\.8%/);
    assert.match(text, /จำนวนรถเคลม 14 คัน จำนวนงานแก้ 7 คัน มูลค่าความเสียหายรวม 798 บาท ความเสียหายจากฟิล์ม จำนวนรายการ 7 คัน มูลค่าความเสียหาย 301 บาท ความเสียหายจากช่าง จำนวนรายการ 14 คัน มูลค่าความเสียหาย 497 บาท/);
    assert.doesNotMatch(car, /monthly-car-damage-total/);
    assert.doesNotMatch(car, /ช่องทางติดตั้งและติดต่อ/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly CAR omits zero-valued channel, source and damage-cause items', () => {
    const app = createHarness();
    installDepartmentFixture(app, { zeroCarItems: true });
    app.run("changePage('monthly')");
    const car = departmentHTML(app.content(), 'car');

    assert.doesNotMatch(car, /monthly-car-channel-row-fb/);
    assert.doesNotMatch(car, /monthly-car-source-showroom/);
    assert.doesNotMatch(car, /monthly-car-source-other/);
    assert.doesNotMatch(car, /monthly-car-damage-film/);
    assert.match(car, /monthly-car-channel-row-line/);
    assert.match(car, /monthly-car-source-walkin/);
    assert.match(car, /monthly-car-damage-tech/);
    assert.match(plainText(car), /จำนวนงานแก้ 0 คัน/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly building summary uses the full sales-role labels without changing their amounts', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    const building = departmentHTML(app.content(), 'building');
    assert.match(building, /monthly-building-team-card monthly-building-rep-card[\s\S]*?<span>ยอดขาย Sales Representative<\/span><strong>3,899 <small>บาท<\/small><\/strong>/);
    assert.match(building, /monthly-building-team-card monthly-building-project-card[\s\S]*?<span>ยอดขาย Project Sales Executive<\/span><strong>5,033 <small>บาท<\/small><\/strong>/);
    assert.doesNotMatch(building, /<dt>ยอดขาย Sales Rep<\/dt>|<dt>ยอดขาย Projects<\/dt>/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly building board keeps overview, team totals and person rates source-backed across months', () => {
    const app = createHarness();
    installBuildingFixture(app);
    app.run("changePage('monthly')");
    let building = departmentHTML(app.content(), 'building');
    assert.match(building, /monthly-building-section/);
    assert.match(building, /monthly-building-layout[\s\S]*?monthly-building-overview[\s\S]*?monthly-building-content/);
    assert.equal((building.match(/class="monthly-building-team-card /g) || []).length, 3);
    assert.match(building, /ยอดขายอาคาร GFS \+ MHL[\s\S]*?150,000[\s\S]*?เป้า 200,000 บาท · 75%/);
    assert.match(building, /monthly-building-sales-donut" style="--monthly-building-progress:75%"/);
    assert.match(building, /ยอดขาย Sales Representative<\/span><strong>27,000 <small>บาท/);
    assert.match(building, /ยอดขาย Project Sales Executive<\/span><strong>12,000 <small>บาท/);
    assert.match(building, /monthly-building-conversion-card[\s\S]*?ติดตั้ง \/ เข้าพบ[\s\S]*?16 \/ 26 <small>งาน[\s\S]*?61\.5%/);
    assert.equal((building.match(/monthly-building-person-row/g) || []).length, 8);
    assert.match(building, /monthly-building-person-icon monthly-building-person-icon-rep" aria-hidden="true">J<\/span>/);
    assert.match(building, /monthly-building-person-copy"><strong>Jay<\/strong>[\s\S]*?monthly-building-rate-good"><strong>150%<\/strong>[\s\S]*?style="width:100%"/);
    assert.match(building, /monthly-building-person-copy"><strong>Kat<\/strong>[\s\S]*?monthly-building-rate-low"><strong>12\.5%<\/strong>[\s\S]*?style="width:12\.5%"/);
    assert.match(building, /monthly-building-person-copy"><strong>Saifha<\/strong>[\s\S]*?monthly-building-rate-zero"><strong>—<\/strong>[\s\S]*?style="width:0%"/);
    assert.match(building, /monthly-building-person-copy"><strong>Tung<\/strong>[\s\S]*?monthly-building-role-rep">Sales Rep/);
    assert.doesNotMatch(building, /monthly-building-person-copy"><strong>Tung<\/strong>[\s\S]*?monthly-building-role-project">Projects/);
    assert.match(plainText(building), /ยอดรายบุคคลเป็นมุมมองของฝ่าย/);

    app.run("BBMonthlyPage.selectMonth('2026-07')");
    building = departmentHTML(app.content(), 'building');
    assert.match(building, /ยอดขายอาคาร GFS \+ MHL[\s\S]*?50,000[\s\S]*?เป้า 100,000 บาท · 50%/);
    assert.match(building, /ยอดขาย Sales Representative<\/span><strong>3,600 <small>บาท/);
    assert.match(building, /ยอดขาย Project Sales Executive<\/span><strong>1,200 <small>บาท/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly technician board preserves KPI, business and quality values when the month changes', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    let tech = departmentHTML(app.content(), 'tech');
    assert.match(tech, /monthly-tech-section/);
    assert.match(tech, /monthly-tech-board/);
    assert.equal((tech.match(/monthly-tech-summary monthly-tech-/g) || []).length, 2);
    assert.match(tech, /monthly-tech-install-summary[\s\S]*?ข้อมูลงานติดตั้ง[\s\S]*?งานติดตั้งอาคาร[\s\S]*?พื้นที่ติดตั้ง/);
    assert.match(tech, /monthly-tech-damage-summary[\s\S]*?<h4>ข้อมูลความเสียหายทั้งหมด<\/h4>[\s\S]*?มูลค่าความเสียหาย[\s\S]*?ความเสียหาย \/ ยอดขายอาคาร/);
    assert.match(tech, /monthly-tech-quality-panel[\s\S]*?<h4>ความเสียหายงานอาคาร<\/h4>/);
    assert.match(tech, /แนวโน้มงานติดตั้ง พื้นที่ และความเสียหาย/);
    assert.equal((tech.match(/monthly-tech-kpi-card/g) || []).length, 4);
    assert.doesNotMatch(plainText(tech), /รวมผลงานของเดือนที่เลือก|ไม่รวมพื้นที่สะสม YTD|ตามยอดรวมต้นทาง|ฐานยอดขาย GFS \+ MHL/);
    assert.match(tech, /<h4>งานติดตั้งอาคาร<\/h4><strong>119 <small>งาน/);
    assert.match(tech, /<h4>พื้นที่ติดตั้ง<\/h4><strong>7,063 <small>ตร\.ฟุต/);
    assert.match(tech, /<h4>มูลค่าความเสียหายรวม<\/h4><strong>1,253 <small>บาท/);
    assert.match(tech, /ความเสียหายจากช่าง<\/p><strong>553 <small>บาท/);
    assert.match(tech, /ความเสียหายจากฟิล์ม<\/p><strong>700 <small>บาท/);
    assert.match(tech, /<th scope="row">GFS<\/th>[\s\S]*?<strong>56<\/strong>[\s\S]*?<strong>3,493<\/strong>/);
    assert.match(tech, /<th scope="row">MHL<\/th>[\s\S]*?<strong>63<\/strong>[\s\S]*?<strong>3,570<\/strong>/);
    assert.doesNotMatch(plainText(tech), /ไม่บวกจำนวนทีมและยอดสะสม YTD/);

    app.run("BBMonthlyPage.selectMonth('2026-01')");
    tech = departmentHTML(app.content(), 'tech');
    assert.match(tech, /<h4>งานติดตั้งอาคาร<\/h4><strong>51 <small>งาน/);
    assert.match(tech, /<h4>พื้นที่ติดตั้ง<\/h4><strong>3,027 <small>ตร\.ฟุต/);
    assert.match(tech, /ความเสียหายจากช่าง<\/p><strong>237 <small>บาท/);
    assert.match(tech, /ความเสียหายจากฟิล์ม<\/p><strong>300 <small>บาท/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});

test('Monthly weekly roll-up card keeps every source week and reconciled totals after selection', () => {
    const app = createHarness();
    installDepartmentFixture(app);
    app.run("changePage('monthly')");
    let html = app.content();
    assert.match(html, /monthly-card monthly-weeks-card/);
    assert.match(html, /calendar-range/);
    assert.match(html, /สัปดาห์ \/ ช่วงวันที่[\s\S]*?เป้าหมาย[\s\S]*?ยอดตาม Weekly[\s\S]*?ค่าโฆษณา[\s\S]*?ค่าโฆษณา \/ ยอดขาย/);
    assert.match(html, /monthly-week-number">5<\/span>[\s\S]*?<strong>Week 5<\/strong>[\s\S]*?monthly-week-target">350,000<\/td><td class="monthly-week-sales">287,000<\/td><td class="monthly-week-ad">5,747<\/td><td class="monthly-week-ad-rate"><span>2%<\/span>/);
    assert.match(html, /รวม 1 สัปดาห์[\s\S]*?monthly-week-target">350,000<\/td><td class="monthly-week-sales">287,000<\/td><td class="monthly-week-ad">5,747<\/td><td class="monthly-week-ad-rate"><span>2%<\/span>/);
    assert.doesNotMatch(plainText(html), /ค่าโฆษณา \/ ยอดขาย = ค่าโฆษณา ÷ ยอดตาม Weekly × 100/);

    app.run("BBMonthlyPage.selectMonth('2026-01')");
    html = app.content();
    const weeks = html.match(/<article class="monthly-card monthly-weeks-card">([\s\S]*?)<\/article>/)?.[1] || '';
    assert.match(plainText(weeks), /เดือน มกราคม 2026/);
    assert.equal((weeks.match(/monthly-week-row/g) || []).length, 2);
    assert.match(weeks, /monthly-week-number">1<\/span>[\s\S]*?<strong>Week 1<\/strong>/);
    assert.match(weeks, /monthly-week-number">2<\/span>[\s\S]*?<strong>Week 2<\/strong>/);
    assert.match(weeks, /รวม 2 สัปดาห์[\s\S]*?monthly-week-target">150,000<\/td><td class="monthly-week-sales">123,000<\/td><td class="monthly-week-ad">2,463<\/td><td class="monthly-week-ad-rate"><span>2%<\/span>/);
    assert.equal(app.counters.fetch, 0);
    assert.equal(app.warnings.length, 0);
});
