// Render: Overview page.
function renderOverviewHTML(current, m, opt, container) {
    overviewTimeframe = 'monthly';

    const mktSpend = current.marketing.gfs.actual + current.marketing.mhl.actual + current.marketing.car.actual;
    const mktBud = current.marketing.gfs.target + current.marketing.mhl.target + current.marketing.car.target;
    const adminContacts = current.admin.contacts.total;
    const adminLeads = current.admin.leads.actual;
    const leadConv = adminContacts > 0 ? (adminLeads / adminContacts) * 100 : 0;

    const weeklySales = {
        gfs: current.gfs.actual,
        mhl: current.mhl.actual,
        car: current.car.actual
    };
    const monthSalesByCompany = dashboardData
        .filter(d => extractMonthGroup(d.dateRange) === m.monthly.label)
        .reduce((sum, d) => ({
            gfs: sum.gfs + d.gfs.actual,
            mhl: sum.mhl + d.mhl.actual,
            car: sum.car + d.car.actual
        }), { gfs: 0, mhl: 0, car: 0 });

    const currentIndex = dashboardData.findIndex(d => d.id === current.id);
    const ytdSalesByCompany = dashboardData.slice(0, currentIndex + 1)
        .reduce((sum, d) => ({
            gfs: sum.gfs + d.gfs.actual,
            mhl: sum.mhl + d.mhl.actual,
            car: sum.car + d.car.actual
        }), { gfs: 0, mhl: 0, car: 0 });

    const buildingSales = current.gfs.actual + current.mhl.actual;
    const buildingTarget = current.gfs.target + current.mhl.target;
    const buildingProgress = buildingTarget > 0 ? (buildingSales / buildingTarget) * 100 : 0;
    const buildingInstalls = current.tech.installs.actual;
    const buildingDamageValue = current.tech.damage.totalValue;
    const damagePercent = buildingSales > 0 ? (buildingDamageValue / buildingSales) * 100 : 0;

    const progress = (actual, target) => target > 0 ? (actual / target) * 100 : 0;
    const clamp = (value) => Math.max(0, Math.min(value, 100));
    const currency = (value) => formatBaht(value);
    const weekLabel = `${current.week} (${current.dateRange})`;

    const statusPill = (value, goodAt = 100) => {
        const isGood = value >= goodAt;
        return `
            <span class="overview-status-pill ${isGood ? 'is-good' : 'is-bad'}">
                <i data-lucide="${isGood ? 'arrow-up' : 'arrow-down'}" class="w-4 h-4"></i>
                ผลงาน ${value.toFixed(1)}%
            </span>
        `;
    };

    const companyRows = (sales) => {
        const total = Math.max(sales.gfs + sales.mhl + sales.car, 1);
        const rows = [
            { key: 'GFS', value: sales.gfs, color: 'blue' },
            { key: 'MHL', value: sales.mhl, color: 'orange' },
            { key: 'CAR', value: sales.car, color: 'green' }
        ];
        return rows.map(row => `
            <div class="overview-company-row">
                <span class="overview-dot is-${row.color}"></span>
                <span class="overview-company-name">${row.key}</span>
                <span class="overview-mini-track">
                    <span class="overview-mini-fill is-${row.color}" style="width:${clamp((row.value / total) * 100)}%"></span>
                </span>
                <strong>${currency(row.value)}</strong>
            </div>
        `).join('');
    };

    const kpiCard = ({ tone, icon, ringIcon, title, value, target, percent, sales }) => `
        <article class="overview-kpi-card is-${tone}" style="--ring:${clamp(percent)}">
            <div class="overview-kpi-top">
                <div class="overview-kpi-title">
                    <span class="overview-kpi-icon"><i data-lucide="${icon}" class="w-5 h-5"></i></span>
                    <span>${title}</span>
                </div>
                <div class="overview-ring">
                    <div><i data-lucide="${ringIcon}" class="w-8 h-8"></i></div>
                </div>
            </div>
            <div class="overview-kpi-value">${currency(value)}</div>
            <div class="overview-kpi-meta">
                ${statusPill(percent)}
                <span>เป้า&nbsp; ${currency(target)}</span>
            </div>
            <div class="overview-company-list">${companyRows(sales)}</div>
        </article>
    `;

    const pulseCard = ({ tone, icon, title, subtitle, value, unit, leftLabel, leftValue, rightLabel, rightValue, progressValue, progressTone }) => `
        <article class="overview-pulse-card is-${tone}">
            <div class="overview-pulse-head">
                <span class="overview-pulse-icon"><i data-lucide="${icon}" class="w-7 h-7"></i></span>
                <div>
                    <h4>${title}</h4>
                    <p>${subtitle}</p>
                </div>
            </div>
            <div class="overview-pulse-value">${value}${unit ? `<span>${unit}</span>` : ''}</div>
            <div class="overview-pulse-divider"></div>
            <div class="overview-pulse-foot">
                <div>
                    <p>${leftLabel}</p>
                    <strong>${leftValue}</strong>
                </div>
                <div>
                    <p>${rightLabel}</p>
                    <strong class="${progressTone || ''}">${rightValue}</strong>
                </div>
            </div>
            ${progressValue === undefined ? '' : `
                <div class="overview-pulse-progress">
                    <span style="width:${clamp(progressValue)}%"></span>
                </div>
            `}
        </article>
    `;

    container.innerHTML = `
        <section class="overview-v2">
            <div class="overview-page-head">
                <div class="overview-title-row">
                    <button type="button" class="overview-sidebar-toggle" onclick="toggleDesktopSidebar()" aria-label="ซ่อน/แสดงเมนู" title="ซ่อน/แสดงเมนู">
                        <i data-lucide="panel-left-close" class="w-5 h-5"></i>
                    </button>
                    <h2>ภาพรวมธุรกิจ (Overview)</h2>
                </div>
                <div class="page-head-actions">
                    <label class="overview-week-select">
                        <i data-lucide="calendar-days" class="w-5 h-5"></i>
                        <select onchange="handleWeekChange(event)" aria-label="เลือกสัปดาห์">${opt}</select>
                    </label>
                    ${renderFullscreenButton()}
                </div>
            </div>

            <div class="overview-kpi-grid">
                ${kpiCard({
                    tone: 'blue',
                    icon: 'bar-chart-3',
                    ringIcon: 'bar-chart-3',
                    title: 'ยอดขายสัปดาห์นี้ (WEEKLY SALES)',
                    value: m.weekly.a,
                    target: m.weekly.t,
                    percent: progress(m.weekly.a, m.weekly.t),
                    sales: weeklySales
                })}
                ${kpiCard({
                    tone: 'indigo',
                    icon: 'calendar-days',
                    ringIcon: 'calendar',
                    title: `ยอดขายเดือนนี้ (MONTHLY SALES) ${m.monthly.label}`,
                    value: m.monthly.a,
                    target: m.monthly.t,
                    percent: m.monthly.p,
                    sales: monthSalesByCompany
                })}
                ${kpiCard({
                    tone: 'purple',
                    icon: 'crown',
                    ringIcon: 'crown',
                    title: 'ยอดขายรวมปีนี้ (YEARLY SALES)',
                    value: m.ytd.a,
                    target: m.ytd.t,
                    percent: m.ytd.p,
                    sales: ytdSalesByCompany
                })}
            </div>

            <div class="overview-section-title">
                <h3>ประสิทธิภาพรายแผนก (DEPARTMENT PULSE)</h3>
                <span></span>
            </div>

            <div class="overview-pulse-grid">
                ${pulseCard({
                    tone: 'orange',
                    icon: 'megaphone',
                    title: '1. การตลาด',
                    subtitle: 'ออนไลน์',
                    value: currency(mktSpend),
                    leftLabel: 'งบตั้งไว้',
                    leftValue: currency(mktBud),
                    rightLabel: 'ROAS',
                    rightValue: `${m.weekly.r}x`,
                    progressTone: 'is-orange'
                })}
                ${pulseCard({
                    tone: 'blue',
                    icon: 'user-round',
                    title: '2. แอดมิน(อาคาร)',
                    subtitle: 'ติดต่อ/นัดลูกค้า',
                    value: formatCurrency(adminContacts),
                    unit: 'คน',
                    leftLabel: 'ส่งต่องานให้เซลล์',
                    leftValue: `${formatCurrency(adminLeads)} งาน`,
                    rightLabel: 'Conversion',
                    rightValue: `${leadConv.toFixed(1)}%`
                })}
                ${pulseCard({
                    tone: 'green',
                    icon: 'building-2',
                    title: '3. ฝ่ายขาย (อาคาร)',
                    subtitle: 'ปิดยอดขาย',
                    value: currency(buildingSales),
                    leftLabel: 'เป้า',
                    leftValue: currency(buildingTarget),
                    rightLabel: '',
                    rightValue: `ผลงาน ${buildingProgress.toFixed(1)}%`,
                    progressValue: buildingProgress,
                    progressTone: buildingProgress >= 100 ? 'is-good-badge' : 'is-bad-badge'
                })}
                ${pulseCard({
                    tone: 'red',
                    icon: 'wrench',
                    title: '4. ช่างติดตั้ง (อาคาร)',
                    subtitle: 'ติดตั้งงาน',
                    value: formatCurrency(buildingInstalls),
                    unit: 'งาน',
                    leftLabel: 'มูลค่าความเสียหาย',
                    leftValue: currency(buildingDamageValue),
                    rightLabel: '% เสียหาย',
                    rightValue: `${damagePercent.toFixed(2)}%`,
                    progressTone: damagePercent > 1 ? 'is-red' : 'is-green'
                })}
            </div>

            <div class="overview-bottom-grid">
                <article class="overview-chart-card">
                    <div class="overview-chart-head">
                        <h3>แนวโน้มรายได้รายเดือน ปี 2026</h3>
                        <div class="overview-chart-legend">
                            <span><i class="legend-line"></i>เป้ายอดขาย</span>
                            <span><i class="legend-bar"></i>ผลงานรายเดือน</span>
                        </div>
                        <div class="overview-chart-tabs">
                            ${['total','gfs','mhl','car'].map(t => `<button onclick="changeChartTab('${t}')" class="${activeChartTab === t ? 'is-active' : ''}">${t.toUpperCase()}</button>`).join('')}
                        </div>
                    </div>
                    <div class="overview-chart-wrap"><canvas id="trendChartCanvas"></canvas></div>
                </article>

                <article class="overview-chart-card overview-donut-card">
                    <h3>สัดส่วนรายได้สัปดาห์นี้</h3>
                    <div class="overview-donut-layout">
                        <div class="overview-donut-wrap"><canvas id="donutTopCanvas"></canvas></div>
                        <div class="overview-donut-list">
                            <div><span><i class="overview-dot is-blue"></i>GFS (อาคาร)</span><strong>${currency(current.gfs.actual)}</strong></div>
                            <div><span><i class="overview-dot is-orange"></i>MHL (อาคาร)</span><strong>${currency(current.mhl.actual)}</strong></div>
                            <div><span><i class="overview-dot is-green"></i>CAR (รถยนต์)</span><strong>${currency(current.car.actual)}</strong></div>
                        </div>
                    </div>
                </article>
            </div>

            <article class="overview-chart-card overview-weekly-trend-card">
                <div class="overview-chart-head overview-weekly-chart-head">
                    <h3>แนวโน้มรายได้ราย Week ปีนี้</h3>
                    <div class="overview-chart-legend">
                        <span><i class="legend-line"></i>เป้ายอดขายราย Week</span>
                        <span><i class="legend-bar"></i>ผลงานราย Week</span>
                    </div>
                    <div class="overview-chart-tabs">
                        ${['total','gfs','mhl','car'].map(t => `<button onclick="changeChartTab('${t}')" class="${activeChartTab === t ? 'is-active' : ''}">${t.toUpperCase()}</button>`).join('')}
                    </div>
                </div>
                <div class="overview-wide-chart-wrap"><canvas id="weeklyTrendCanvas"></canvas></div>
            </article>
        </section>
    `;

    setTimeout(() => {
        const donutCanvas = document.getElementById('donutTopCanvas');
        if (donutCanvas) {
            charts.donutTop = new Chart(donutCanvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['GFS', 'MHL', 'CAR'],
                    datasets: [{
                        data: [current.gfs.actual, current.mhl.actual, current.car.actual],
                        backgroundColor: ['#1464f4', '#fb8c00', '#00b451'],
                        borderColor: '#ffffff',
                        borderWidth: 4,
                        cutout: '64%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${currency(context.raw)}`
                            }
                        }
                    }
                }
            });
        }
        renderBasicTrendChart(current);
        renderOverviewWeeklyTrendChart(current);
    }, 50);
}
