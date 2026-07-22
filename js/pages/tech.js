// Render: Building technician page.
function renderTechDeepDiveHTML(current, m, opt, container) {
    const t = current.tech;
    const YEARLY_INSTALL_TARGET = 2640;
    const YEARLY_AREA_TARGET = 792000;
    const DAMAGE_LIMIT_PERCENT = 1;

    const currentIndex = dashboardData.findIndex(d => d.id === current.id);
    const ytdData = dashboardData.slice(0, currentIndex + 1);

    const ytdInstalls = t.installs.ytd != null ? t.installs.ytd : ytdData.reduce((sum, d) => sum + d.tech.installs.actual, 0);
    const ytdArea = t.area.ytd != null ? t.area.ytd : ytdData.reduce((sum, d) => sum + d.tech.area.actual, 0);
    const ytdDamageValue = t.damage.ytd != null ? t.damage.ytd : ytdData.reduce((sum, d) => sum + d.tech.damage.totalValue, 0);
    const ytdBuildingSales = ytdData.reduce((sum, d) => sum + (d.gfs.actual || 0) + (d.mhl.actual || 0), 0);
    const ytdDamagePercentSales = ytdBuildingSales > 0 ? (ytdDamageValue / ytdBuildingSales) * 100 : 0;
    const isYtdDamageOverLimit = ytdDamagePercentSales > DAMAGE_LIMIT_PERCENT;

    const ytdInstallPercent = YEARLY_INSTALL_TARGET > 0 ? (ytdInstalls / YEARLY_INSTALL_TARGET) * 100 : 0;
    const ytdAreaPercent = YEARLY_AREA_TARGET > 0 ? (ytdArea / YEARLY_AREA_TARGET) * 100 : 0;
    const installProgress = t.installs.target > 0 ? (t.installs.actual / t.installs.target) * 100 : 0;
    const areaProgress = t.area.target > 0 ? (t.area.actual / t.area.target) * 100 : 0;
    const avgInstallsPerTeam = t.teams > 0 ? (t.installs.actual / t.teams) : 0;
    const avgAreaPerTeam = t.teams > 0 ? (t.area.actual / t.teams) : 0;
    const buildingSales = (current.gfs.actual || 0) + (current.mhl.actual || 0);
    const damagePercentSales = buildingSales > 0 ? (t.damage.totalValue / buildingSales) * 100 : 0;
    const bounded = value => Math.max(0, Math.min(value, 100));
    const baht = value => formatBaht(value);

    container.innerHTML = `
        <section class="tech-v2" aria-label="ทีมช่างติดตั้ง อาคาร">
            <div class="tech-page-head">
                <div class="tech-title-row">
                    <button type="button" id="tech-sidebar-toggle" class="tech-sidebar-toggle" onclick="toggleDesktopSidebar()" aria-label="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}" title="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}">
                        <i id="tech-sidebar-toggle-icon" data-lucide="${isDesktopSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'}" class="w-5 h-5"></i>
                    </button>
                    <div class="tech-title-block">
                        <h2>ทีมช่างติดตั้ง (อาคาร)</h2>
                    </div>
                </div>
                <div class="page-head-actions">
                    <label class="tech-week-select">
                        <i data-lucide="calendar-days" class="w-5 h-5"></i>
                        <select onchange="handleWeekChange(event)" aria-label="เลือกสัปดาห์">${opt}</select>
                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </label>
                    ${renderFullscreenButton()}
                </div>
            </div>

            <div class="tech-kpi-grid">
                <article class="tech-kpi-card is-blue">
                    <div class="tech-ytd-badge"><i data-lucide="calendar-check" class="w-4 h-4"></i> สะสมรายปี 2026</div>
                    <div class="tech-kpi-icon"><i data-lucide="clipboard" class="w-7 h-7"></i></div>
                    <div class="tech-kpi-body">
                        <h3>จำนวนงานติดตั้งสะสม</h3>
                        <div class="tech-kpi-value">${formatCurrency(ytdInstalls)} <span>งาน</span></div>
                        <div class="tech-progress"><span style="width:${bounded(ytdInstallPercent)}%"></span></div>
                        <div class="tech-kpi-meta"><span>เป้าหมาย ${formatCurrency(YEARLY_INSTALL_TARGET)}</span><b>${ytdInstallPercent.toFixed(1)}%</b></div>
                    </div>
                </article>

                <article class="tech-kpi-card is-green">
                    <div class="tech-ytd-badge"><i data-lucide="calendar-check" class="w-4 h-4"></i> สะสมรายปี 2026</div>
                    <div class="tech-kpi-icon"><i data-lucide="layers" class="w-7 h-7"></i></div>
                    <div class="tech-kpi-body">
                        <h3>พื้นที่ติดตั้งสะสม</h3>
                        <div class="tech-kpi-value">${formatCurrency(ytdArea)} <span>ตร.ม.</span></div>
                        <div class="tech-progress"><span style="width:${bounded(ytdAreaPercent)}%"></span></div>
                        <div class="tech-kpi-meta"><span>เป้าหมาย ${formatCurrency(YEARLY_AREA_TARGET)}</span><b>${ytdAreaPercent.toFixed(1)}%</b></div>
                    </div>
                </article>

                <article class="tech-kpi-card is-red">
                    <div class="tech-ytd-badge"><i data-lucide="calendar-check" class="w-4 h-4"></i> สะสมรายปี 2026</div>
                    <div class="tech-kpi-icon"><i data-lucide="alert-triangle" class="w-7 h-7"></i></div>
                    <div class="tech-kpi-body">
                        <h3>มูลค่าความเสียหายสะสม</h3>
                        <div class="tech-kpi-value tech-damage-value">
                            <span class="tech-damage-amount">${baht(ytdDamageValue)}</span>
                            ${isYtdDamageOverLimit ? `
                                <span class="tech-damage-alert"><i data-lucide="triangle-alert" class="w-4 h-4"></i> เกินเกณฑ์ ${DAMAGE_LIMIT_PERCENT}%</span>
                            ` : ''}
                        </div>
                        <p class="tech-damage-note">คิดเป็น <b>${ytdDamagePercentSales.toFixed(2)}%</b> ของยอดขายสะสม</p>
                    </div>
                </article>
            </div>

            <div class="tech-section-title">
                <span></span>
                <h3>ผลงานประจำสัปดาห์ (WEEKLY PERFORMANCE)</h3>
                <i></i>
            </div>

            <div class="tech-week-grid">
                <article class="tech-week-card is-blue">
                    <div class="tech-week-head">
                        <div class="tech-week-icon"><i data-lucide="clipboard-check" class="w-6 h-6"></i></div>
                        <div>
                            <h4>งานติดตั้งเสร็จสิ้น</h4>
                            <p>สัปดาห์นี้</p>
                        </div>
                    </div>
                    <div class="tech-week-value">${formatCurrency(t.installs.actual)} <span>งาน</span></div>
                    <div class="tech-progress"><span style="width:${bounded(installProgress)}%"></span></div>
                    <div class="tech-kpi-meta"><span>เป้า ${formatCurrency(t.installs.target)}</span><b>${installProgress.toFixed(1)}%</b></div>
                    <div class="tech-split-grid">
                        <div><span>GFS</span><b>${formatCurrency(t.installs.gfs)}</b></div>
                        <div><span>MHL</span><b>${formatCurrency(t.installs.mhl)}</b></div>
                    </div>
                </article>

                <article class="tech-week-card is-green">
                    <div class="tech-week-head">
                        <div class="tech-week-icon"><i data-lucide="layers" class="w-6 h-6"></i></div>
                        <div>
                            <h4>พื้นที่ติดตั้งรวม</h4>
                            <p>สัปดาห์นี้</p>
                        </div>
                    </div>
                    <div class="tech-week-value">${formatCurrency(t.area.actual)} <span>ตร.ม.</span></div>
                    <div class="tech-progress"><span style="width:${bounded(areaProgress)}%"></span></div>
                    <div class="tech-kpi-meta"><span>เป้า ${formatCurrency(t.area.target)}</span><b>${areaProgress.toFixed(1)}%</b></div>
                    <div class="tech-split-grid">
                        <div><span>GFS</span><b>${formatCurrency(t.area.gfs)}</b></div>
                        <div><span>MHL</span><b>${formatCurrency(t.area.mhl)}</b></div>
                    </div>
                </article>

                <article class="tech-week-card is-purple">
                    <div class="tech-week-head">
                        <div class="tech-week-icon"><i data-lucide="users" class="w-6 h-6"></i></div>
                        <div>
                            <h4>ประสิทธิภาพทีม</h4>
                            <p>จำนวน ${formatCurrency(t.teams)} ทีม</p>
                        </div>
                    </div>
                    <div class="tech-eff-list">
                        <div><span>เฉลี่ย งาน/ทีม</span><b>${avgInstallsPerTeam.toFixed(1)} <small>งาน</small></b></div>
                        <div><span>เฉลี่ย ตร.ม./ทีม</span><b>${formatCurrency(avgAreaPerTeam)} <small>ตร.ม.</small></b></div>
                    </div>
                </article>

                <article class="tech-week-card is-red">
                    <div class="tech-week-head">
                        <div class="tech-week-icon"><i data-lucide="alert-triangle" class="w-6 h-6"></i></div>
                        <div>
                            <h4>ควบคุมความเสียหาย</h4>
                            <p>${damagePercentSales.toFixed(2)}% ของยอดขาย</p>
                        </div>
                    </div>
                    <div class="tech-damage-box">
                        <span>มูลค่าความเสียหาย</span>
                        <b>${baht(t.damage.totalValue)}</b>
                    </div>
                    <div class="tech-split-grid">
                        <div><span>ลูกค้า</span><b>${baht(t.damage.byTech)}</b></div>
                        <div><span>งานฟิล์ม</span><b>${baht(t.damage.byFilm)}</b></div>
                    </div>
                </article>
            </div>

            <div class="tech-bottom-grid">
                <article class="tech-chart-card">
                    <div class="tech-chart-head">
                        <h3><i data-lucide="trending-up" class="w-5 h-5"></i> แนวโน้มงานติดตั้งอาคาร (ทุก Week ปีนี้)</h3>
                        <div class="tech-filter-pills">
                            <button onclick="changeTechTrendFilter('total')" class="${techTrendFilter === 'total' ? 'is-active' : ''}">ภาพทั้งหมด</button>
                            <button onclick="changeTechTrendFilter('gfs')" class="${techTrendFilter === 'gfs' ? 'is-active is-gfs' : ''}">GFS</button>
                            <button onclick="changeTechTrendFilter('mhl')" class="${techTrendFilter === 'mhl' ? 'is-active is-mhl' : ''}">MHL</button>
                        </div>
                    </div>
                    <div class="tech-chart-wrap"><canvas id="techTrendChartCanvas"></canvas></div>
                </article>
            </div>
        </section>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('techTrendChartCanvas')?.getContext('2d');
        if (!ctx) return;
        if (charts['techTrend']) charts['techTrend'].destroy();

        const availableWeeks = dashboardData
            .filter(d => d.tech.installs.actual > 0 || d.tech.damage.totalValue > 0 || d.tech.installs.target > 0);

        const colorMap = { total: '#1464f4', gfs: '#2563eb', mhl: '#7c3aed' };
        const labelMap = { total: 'งานติดตั้งรวม', gfs: 'งานติดตั้ง GFS', mhl: 'งานติดตั้ง MHL' };
        const installData = availableWeeks.map(d => {
            if (techTrendFilter === 'gfs') return d.tech.installs.gfs;
            if (techTrendFilter === 'mhl') return d.tech.installs.mhl;
            return d.tech.installs.actual;
        });
        const damageData = availableWeeks.map(d => d.tech.damage.totalValue);

        const techValueLabels = {
            id: 'techValueLabels',
            afterDatasetsDraw: (chart) => {
                const { ctx: chartCtx, data } = chart;
                const barMeta = chart.getDatasetMeta(1);
                chartCtx.save();
                chartCtx.textAlign = 'center';
                chartCtx.textBaseline = 'bottom';
                chartCtx.font = '800 13px Sarabun';
                barMeta.data.forEach((bar, index) => {
                    const actual = data.datasets[1].data[index] || 0;
                    if (actual <= 0) return;
                    chartCtx.fillStyle = '#1464f4';
                    chartCtx.fillText(formatCurrency(actual), bar.x, Math.max(bar.y - 8, 14));
                });
                chartCtx.restore();
            }
        };

        charts['techTrend'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: availableWeeks.map(d => d.week),
                datasets: [
                    {
                        type: 'line',
                        label: 'ความเสียหาย',
                        data: damageData,
                        borderColor: '#ff1f2d',
                        backgroundColor: '#fff',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.34,
                        yAxisID: 'y1',
                        order: 0
                    },
                    {
                        type: 'bar',
                        label: labelMap[techTrendFilter],
                        data: installData,
                        backgroundColor: colorMap[techTrendFilter],
                        borderRadius: 3,
                        barPercentage: 0.58,
                        categoryPercentage: 0.7,
                        yAxisID: 'y',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 18, right: 8, left: 2, bottom: 0 } },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            color: '#304260',
                            font: { family: 'Sarabun', weight: '800', size: 12 },
                            usePointStyle: true,
                            boxWidth: 9,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { family: 'Sarabun', weight: '800' },
                        bodyFont: { family: 'Sarabun', weight: '700' },
                        callbacks: {
                            label: (context) => {
                                const value = context.raw || 0;
                                if (context.dataset.label.includes('ความเสียหาย')) return `ความเสียหาย: ${baht(value)}`;
                                return `${context.dataset.label}: ${formatCurrency(value)} งาน`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            autoSkip: false,
                            color: '#304260',
                            font: { family: 'Sarabun', weight: '800', size: 12 },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        grace: '28%',
                        grid: { color: '#edf2f7', drawTicks: false },
                        border: { display: false },
                        title: { display: true, text: 'งาน', color: '#304260', font: { family: 'Sarabun', weight: '800', size: 12 } },
                        ticks: { color: '#304260', padding: 8, font: { family: 'Sarabun', weight: '700', size: 12 } }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        grace: '22%',
                        grid: { drawOnChartArea: false },
                        border: { display: false },
                        title: { display: false },
                        ticks: {
                            color: '#ff1f2d',
                            padding: 8,
                            font: { family: 'Sarabun', weight: '700', size: 12 },
                            callback: value => value >= 1000 ? `${value / 1000}k` : value
                        }
                    }
                }
            },
            plugins: [techValueLabels]
        });
    }, 50);
}
