// Render: Sales admin page.
function renderAdminDeepDiveHTML(current, m, opt, container) {
    const cIdx = dashboardData.findIndex(d => d.id === current.id);
    const prev = cIdx > 0 ? dashboardData[cIdx - 1] : null;

    const currentAdminSales = current.admin.sales.totalSales || current.buildingSales?.totalAdminSales || 0;
    const prevAdminSales = prev ? (prev.admin.sales.totalSales || prev.buildingSales?.totalAdminSales || 0) : 0;
    const adminGrowth = prevAdminSales > 0 ? ((currentAdminSales - prevAdminSales) / prevAdminSales) * 100 : 0;

    const convRate = current.admin.contacts.total > 0 ? ((current.admin.leads.actual / current.admin.contacts.total) * 100) : 0;
    const closeRate = current.admin.leads.actual > 0 ? ((current.admin.sales.totalInstalls / current.admin.leads.actual) * 100) : 0;
    const leadTargetProgress = current.admin.leads.target > 0 ? ((current.admin.leads.actual / current.admin.leads.target) * 100) : 0;

    const insightType = convRate < 25 ? 'low_conv' : (closeRate < 35 ? 'low_close' : 'good');

    const gfsContacts = current.admin.contacts.gfs.line + current.admin.contacts.gfs.fb + current.admin.contacts.gfs.tel;
    const gfsLeads = current.admin.leads.gfs.line + current.admin.leads.gfs.fb + current.admin.leads.gfs.tel;

    const mhlContacts = current.admin.contacts.mhl.line + current.admin.contacts.mhl.fb + current.admin.contacts.mhl.tel;
    const mhlLeads = current.admin.leads.mhl.line + current.admin.leads.mhl.fb + current.admin.leads.mhl.tel;

    const totalNewSales = current.admin.sales.newSales.gfs + current.admin.sales.newSales.mhl;
    const totalOldSales = current.admin.sales.oldSales.gfs + current.admin.sales.oldSales.mhl;
    const totalNewInstalls = current.admin.sales.newInstalls.gfs + current.admin.sales.newInstalls.mhl;
    const totalOldInstalls = current.admin.sales.oldInstalls.gfs + current.admin.sales.oldInstalls.mhl;

    const pct = (part, total) => total > 0 ? Math.max(0, Math.min(100, (part / total) * 100)) : 0;
    const channelRow = (type, label, leads, contacts) => {
        const rowConvRate = contacts > 0 ? (leads / contacts) * 100 : 0;
        const rowIcon = type === 'line'
            ? '<span class="admin-brand-badge is-line"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i></span>'
            : type === 'facebook'
                ? '<span class="admin-brand-badge is-facebook">f</span>'
                : '<span class="admin-brand-badge is-phone"><i data-lucide="phone" class="w-3.5 h-3.5"></i></span>';

        return `
            <div class="admin-channel-row is-${type}">
                <span>${rowIcon}<b>${label}</b></span>
                <div class="admin-channel-stats">
                    <strong><small>ติดต่อ</small>${formatNumber(contacts)}</strong>
                    <strong class="admin-channel-leads"><small>ส่งงาน</small>${formatNumber(leads)}</strong>
                    <strong class="admin-channel-percent">${Math.round(rowConvRate)}%</strong>
                </div>
            </div>
        `;
    };

    const companyCard = (company, tone, leads, contacts, values) => `
            <article class="admin-card admin-company-card is-${tone}">
                <div class="admin-company-head">
                    <div class="admin-company-title">
                        <span class="admin-company-code">${company}</span>
                        <h3>ฟิล์มอาคาร</h3>
                    </div>
                    <div class="admin-company-total-grid">
                        <div>
                            <span>ติดต่อ</span>
                            <strong>${formatNumber(contacts)}</strong>
                        </div>
                        <div class="is-leads">
                            <span>ส่งงาน</span>
                            <strong>${formatNumber(leads)}</strong>
                            <em>${Math.round(pct(leads, contacts))}%</em>
                        </div>
                    </div>
                </div>
                <div class="admin-channel-list">
                    ${channelRow('line', 'LINE OA', values.lineLead, values.lineContact)}
                    ${channelRow('facebook', 'Facebook', values.fbLead, values.fbContact)}
                    ${channelRow('phone', 'โทรเข้า', values.telLead, values.telContact)}
                </div>
            </article>
        `;

    const insightClass = insightType === 'good' ? 'is-good' : (insightType === 'low_close' ? 'is-warn' : 'is-bad');
    const growthDirection = adminGrowth >= 0 ? 'up' : 'down';
    const growthLabel = `${adminGrowth >= 0 ? '↑' : '↓'} ${Math.abs(adminGrowth).toFixed(1)}%`;

    container.innerHTML = `
        <section class="admin-v2">
            <div class="admin-page-head">
                <div class="admin-title-row">
                    <button type="button" id="admin-sidebar-toggle" class="admin-sidebar-toggle" onclick="toggleDesktopSidebar()" aria-label="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}" title="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}">
                        <i id="admin-sidebar-toggle-icon" data-lucide="${isDesktopSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'}" class="w-5 h-5"></i>
                    </button>
                    <div class="admin-title-block">
                        <h2>SALES ADMIN</h2>
                        <p>สรุปประสิทธิภาพงานแอดมินรายสัปดาห์</p>
                    </div>
                </div>
                <div class="page-head-actions">
                    <label class="admin-week-select">
                        <i data-lucide="calendar-days" class="w-5 h-5"></i>
                        <select onchange="handleWeekChange(event)" aria-label="เลือกสัปดาห์">${opt}</select>
                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </label>
                    ${renderFullscreenButton()}
                </div>
            </div>

            <div class="admin-kpi-grid">
                <article class="admin-card admin-kpi-card is-blue is-contact-support">
                    <div class="admin-contact-art" aria-hidden="true">
                        <i data-lucide="messages-square" class="w-11 h-11"></i>
                        <i data-lucide="phone-call" class="w-9 h-9"></i>
                    </div>
                    <div class="admin-kpi-icon"><i data-lucide="message-square" class="w-6 h-6"></i></div>
                    <div>
                        <h3>ปริมาณการติดต่อ</h3>
                        <strong>${formatNumber(current.admin.contacts.total)}</strong>
                        <p>ลูกค้าทักแชท / โทรเข้า</p>
                    </div>
                </article>

                <article class="admin-card admin-kpi-card is-indigo is-lead-hero">
                    <div class="admin-send-art" aria-hidden="true">
                        <i data-lucide="send" class="w-12 h-12"></i>
                        <i data-lucide="sparkles" class="w-8 h-8"></i>
                    </div>
                    <div class="admin-kpi-icon"><i data-lucide="send" class="w-6 h-6"></i></div>
                    <div class="admin-kpi-split">
                        <div>
                            <h3>ส่งงานให้เซลล์</h3>
                            <strong>${formatNumber(current.admin.leads.actual)}</strong>
                            <p>เป้า ${formatNumber(current.admin.leads.target)} งาน</p>
                            <div class="admin-kpi-target-line" aria-label="ส่งงานเทียบเป้า ${Math.round(leadTargetProgress)}%">
                                <i style="width:${leadTargetProgress}%"></i>
                            </div>
                            <small class="admin-kpi-target-label">${Math.round(leadTargetProgress)}% ของเป้า</small>
                        </div>
                        <div class="admin-kpi-rate">
                            <span>Conversion</span>
                            <b>${formatPercent(convRate)}</b>
                        </div>
                    </div>
                </article>

                <article class="admin-revenue-card is-revenue-secondary">
                    <div class="admin-money-art" aria-hidden="true">
                        <i data-lucide="coins" class="w-9 h-9"></i>
                        <i data-lucide="banknote" class="w-11 h-11"></i>
                        <i data-lucide="badge-dollar-sign" class="w-8 h-8"></i>
                    </div>
                    <div class="admin-revenue-icon"><i data-lucide="award" class="w-8 h-8"></i></div>
                    <div>
                        <h3>ยอดขายจากแอดมิน</h3>
                        <strong>${formatBaht(currentAdminSales)}</strong>
                        <p>ยอดขายจากงานแอดมินปิดเอง</p>
                    </div>
                </article>
            </div>

            <div class="admin-mid-grid">
                ${companyCard('GFS', 'blue', gfsLeads, gfsContacts, {
                    lineLead: current.admin.leads.gfs.line,
                    lineContact: current.admin.contacts.gfs.line,
                    fbLead: current.admin.leads.gfs.fb,
                    fbContact: current.admin.contacts.gfs.fb,
                    telLead: current.admin.leads.gfs.tel,
                    telContact: current.admin.contacts.gfs.tel
                })}

                ${companyCard('MHL', 'amber', mhlLeads, mhlContacts, {
                    lineLead: current.admin.leads.mhl.line,
                    lineContact: current.admin.contacts.mhl.line,
                    fbLead: current.admin.leads.mhl.fb,
                    fbContact: current.admin.contacts.mhl.fb,
                    telLead: current.admin.leads.mhl.tel,
                    telContact: current.admin.contacts.mhl.tel
                })}

                <article class="admin-card admin-quality-card">
                    <div class="admin-panel-head">
                        <span class="admin-panel-icon is-indigo"><i data-lucide="award" class="w-5 h-5"></i></span>
                        <div>
                            <h3>คุณภาพยอดขายจากแอดมิน</h3>
                            <p>แตกยอดขายรวมด้านบนตามลูกค้าใหม่/เก่า</p>
                        </div>
                    </div>

                    <div class="admin-quality-total-grid">
                        <div>
                            <span>ติดตั้ง</span>
                            <strong>${formatNumber(totalNewInstalls + totalOldInstalls)}</strong>
                        </div>
                        <div>
                            <span>ลูกค้าใหม่</span>
                            <strong>${formatPercent(pct(totalNewSales, currentAdminSales))}</strong>
                        </div>
                        <div>
                            <span>ลูกค้าเก่า</span>
                            <strong>${formatPercent(pct(totalOldSales, currentAdminSales))}</strong>
                        </div>
                    </div>

                    <div class="admin-quality-list">
                        <div class="admin-quality-row is-new">
                            <div>
                                <span><em>NEW</em> ลูกค้าใหม่ (New)</span>
                                <p>ติดตั้งแล้ว <b class="admin-install-count">${formatNumber(totalNewInstalls)}</b> งาน</p>
                            </div>
                        <strong>${formatBaht(totalNewSales)}</strong>
                            <div class="admin-progress"><i style="width:${pct(totalNewSales, currentAdminSales)}%"></i></div>
                        </div>

                        <div class="admin-quality-row is-old">
                            <div>
                                <span><i data-lucide="users" class="w-4 h-4"></i> ลูกค้าเก่า (Old)</span>
                                <p>ติดตั้งแล้ว <b class="admin-install-count">${formatNumber(totalOldInstalls)}</b> งาน</p>
                            </div>
                        <strong>${formatBaht(totalOldSales)}</strong>
                            <div class="admin-progress"><i style="width:${pct(totalOldSales, currentAdminSales)}%"></i></div>
                        </div>
                    </div>
                </article>
            </div>

            <div class="admin-bottom-grid">
                <div class="admin-monthly-row">
                    <article class="admin-card admin-chart-card admin-monthly-chart-card">
                        <div class="admin-chart-head">
                            <h3><i data-lucide="bar-chart-3" class="w-4 h-4"></i> แนวโน้มการทำงานรายเดือน</h3>
                            <div class="admin-chart-tabs">
                                <button onclick="changeAdminTrendFilter('total')" class="${adminTrendFilter === 'total' ? 'is-active' : ''}">รวมทั้งหมด</button>
                                <button onclick="changeAdminTrendFilter('gfs')" class="${adminTrendFilter === 'gfs' ? 'is-active' : ''}">GFS</button>
                                <button onclick="changeAdminTrendFilter('mhl')" class="${adminTrendFilter === 'mhl' ? 'is-active' : ''}">MHL</button>
                            </div>
                        </div>
                        <div class="admin-chart-wrap admin-monthly-chart-wrap"><canvas id="adminMonthlyTrendChartCanvas"></canvas></div>
                    </article>

                    <article class="admin-card admin-source-card">
                        <div class="admin-chart-head">
                            <h3><i data-lucide="pie-chart" class="w-4 h-4"></i> ที่มาของงานส่งฝ่ายขาย (สะสมรายปี)</h3>
                        </div>
                        <div class="admin-source-wrap"><canvas id="adminLeadSourceChartCanvas"></canvas></div>
                        <div id="adminLeadSourceLegend" class="admin-source-legend"></div>
                    </article>
                </div>

                <article class="admin-card admin-chart-card">
                    <div class="admin-chart-head">
                        <h3><i data-lucide="trending-up" class="w-4 h-4"></i> แนวโน้มการทำงานรายสัปดาห์ (ทั้งหมดปีนี้)</h3>
                    </div>
                    <div class="admin-chart-wrap"><canvas id="adminTrendChartCanvas"></canvas></div>
                </article>
            </div>
        </section>
    `;

    setTimeout(() => {
        const adminCtx = document.getElementById('adminTrendChartCanvas')?.getContext('2d');
        const adminMonthlyCtx = document.getElementById('adminMonthlyTrendChartCanvas')?.getContext('2d');
        const adminSourceCtx = document.getElementById('adminLeadSourceChartCanvas')?.getContext('2d');
        if (!adminCtx || !adminMonthlyCtx || !adminSourceCtx) return;
        if (charts['adminTrend']) charts['adminTrend'].destroy();
        if (charts['adminMonthlyTrend']) charts['adminMonthlyTrend'].destroy();
        if (charts['adminLeadSource']) charts['adminLeadSource'].destroy();

        const yearData = dashboardData.filter(d => d.admin.contacts.total > 0 || d.admin.sales.totalSales > 0 || d.buildingSales?.totalAdminSales > 0);
        const recentData = yearData.length ? yearData : dashboardData;

        const getAdminPoint = (d) => {
            if (adminTrendFilter === 'gfs') {
                return {
                    sales: d.admin.sales.newSales.gfs + d.admin.sales.oldSales.gfs,
                    contacts: d.admin.contacts.gfs.line + d.admin.contacts.gfs.fb + d.admin.contacts.gfs.tel,
                    leads: d.admin.leads.gfs.line + d.admin.leads.gfs.fb + d.admin.leads.gfs.tel,
                    color: '#2563eb'
                };
            }

            if (adminTrendFilter === 'mhl') {
                return {
                    sales: d.admin.sales.newSales.mhl + d.admin.sales.oldSales.mhl,
                    contacts: d.admin.contacts.mhl.line + d.admin.contacts.mhl.fb + d.admin.contacts.mhl.tel,
                    leads: d.admin.leads.mhl.line + d.admin.leads.mhl.fb + d.admin.leads.mhl.tel,
                    color: '#f59e0b'
                };
            }

            return {
                sales: d.admin.sales.totalSales || d.buildingSales?.totalAdminSales || 0,
                contacts: d.admin.contacts.total,
                leads: d.admin.leads.actual,
                color: '#4f46e5'
            };
        };

        const getLeadSources = (d) => {
            if (adminTrendFilter === 'gfs') {
                return {
                    line: d.admin.leads.gfs.line,
                    facebook: d.admin.leads.gfs.fb,
                    phone: d.admin.leads.gfs.tel
                };
            }

            if (adminTrendFilter === 'mhl') {
                return {
                    line: d.admin.leads.mhl.line,
                    facebook: d.admin.leads.mhl.fb,
                    phone: d.admin.leads.mhl.tel
                };
            }

            return {
                line: d.admin.leads.gfs.line + d.admin.leads.mhl.line,
                facebook: d.admin.leads.gfs.fb + d.admin.leads.mhl.fb,
                phone: d.admin.leads.gfs.tel + d.admin.leads.mhl.tel
            };
        };

        const chartColor = getAdminPoint(recentData[0] || current).color;
        const weeklySeries = recentData.map(d => ({ label: d.week, ...getAdminPoint(d) }));
        const referenceYear = String(current.dateRange || recentData[0]?.dateRange || '').match(/(20\d{2}|25\d{2})/)?.[0] || '2026';
        const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
            .map(month => `${month} ${referenceYear}`);
        const monthlyMap = new Map(monthLabels.map(label => [label, { label, sales: 0, contacts: 0, leads: 0, hasData: false }]));
        recentData.forEach((d) => {
            const label = extractMonthGroup(d.dateRange || d.week);
            if (!monthlyMap.has(label)) monthlyMap.set(label, { label, sales: 0, contacts: 0, leads: 0 });
            const target = monthlyMap.get(label);
            const point = getAdminPoint(d);
            target.sales += point.sales;
            target.contacts += point.contacts;
            target.leads += point.leads;
            target.hasData = true;
        });
        const monthlySeries = monthLabels.map(label => {
            const item = monthlyMap.get(label) || { label, sales: 0, contacts: 0, leads: 0, hasData: false };
            return item.hasData ? item : { label, sales: null, contacts: null, leads: null };
        });
        const sourceTotals = recentData.reduce((acc, d) => {
            const sources = getLeadSources(d);
            acc.line += sources.line;
            acc.facebook += sources.facebook;
            acc.phone += sources.phone;
            return acc;
        }, { line: 0, facebook: 0, phone: 0 });
        const sourceTotal = sourceTotals.line + sourceTotals.facebook + sourceTotals.phone;
        const sourceLegendEl = document.getElementById('adminLeadSourceLegend');
        if (sourceLegendEl) {
            sourceLegendEl.innerHTML = [
                { label: 'LINE OA', value: sourceTotals.line, color: '#19c069' },
                { label: 'Facebook', value: sourceTotals.facebook, color: '#1d6fe7' },
                { label: 'โทรเข้า', value: sourceTotals.phone, color: '#52627a' }
            ].map((item) => {
                const percent = sourceTotal > 0 ? Math.round((item.value / sourceTotal) * 100) : 0;
                return `
                    <div class="admin-source-legend-item" style="--source-color:${item.color}">
                        <i></i>
                        <span>${item.label}</span>
                        <strong>${formatNumber(item.value)} <small>งาน</small></strong>
                        <em>${percent}%</em>
                    </div>
                `;
            }).join('');
        }

        const compactSalesLabel = (value) => {
            const num = Number(value) || 0;
            if (num >= 1000) return `${formatNumber(num / 1000)}k`;
            return formatNumber(num);
        };

        const adminBarValueLabels = {
            id: 'adminBarValueLabels',
            afterDatasetsDraw: (chart) => {
                const { ctx, data } = chart;
                const barMeta = chart.getDatasetMeta(0);
                if (!barMeta || barMeta.hidden) return;

                const dense = (data.labels || []).length > 18;
                ctx.save();
                ctx.font = `900 ${dense ? 10 : 12}px Sarabun`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(255, 255, 255, .96)';
                ctx.fillStyle = '#07183f';

                barMeta.data.forEach((bar, index) => {
                    const value = Number(data.datasets[0].data[index]) || 0;
                    if (value <= 0) return;
                    const text = compactSalesLabel(value);
                    const y = Math.max(bar.y - 7, 14);
                    ctx.strokeText(text, bar.x, y);
                    ctx.fillText(text, bar.x, y);
                });
                ctx.restore();
            }
        };

        const makeAdminTrendChart = (ctx, series, chartKey, maxTicksLimit, showAllTicks = false) => {
            charts[chartKey] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: series.map(d => d.label),
                datasets: [
                    { type: 'bar', label: 'ยอดขาย', data: series.map(d => d.sales), backgroundColor: chartColor, borderRadius: 3, yAxisID: 'y', order: 3, barPercentage: 0.48, categoryPercentage: 0.72 },
                    { type: 'line', label: 'ติดต่อรวม', data: series.map(d => d.contacts), borderColor: '#f59e0b', backgroundColor: '#f59e0b', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2, tension: 0.42, yAxisID: 'y1', order: 2, fill: false },
                    { type: 'line', label: 'ส่งงาน', data: series.map(d => d.leads), borderColor: '#06b6d4', backgroundColor: '#06b6d4', borderWidth: 2, borderDash: [5, 5], pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2, tension: 0.42, yAxisID: 'y1', order: 1, fill: false }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 18, right: 8, bottom: 0, left: 0 } },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#334155',
                            font: { family: 'Sarabun', size: 13, weight: 'bold' },
                            usePointStyle: true,
                            boxWidth: 10,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (c) => c.datasetIndex === 0 ? `${c.dataset.label}: ${formatBaht(c.parsed.y)}` : `${c.dataset.label}: ${formatNumber(c.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            autoSkip: !showAllTicks,
                            maxRotation: 0,
                            maxTicksLimit,
                            color: '#64748b',
                            font: { family: 'Sarabun', size: 12, weight: 'bold' }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        grace: '20%',
                        grid: { color: '#eef2f7' },
                        border: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Sarabun', size: 12, weight: 'bold' }, callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        grace: '20%',
                        grid: { drawOnChartArea: false },
                        border: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Sarabun', size: 12, weight: 'bold' } }
                    }
                }
            },
            plugins: [adminBarValueLabels]
            });
        };

        makeAdminTrendChart(adminMonthlyCtx, monthlySeries, 'adminMonthlyTrend', 12, true);
        makeAdminTrendChart(adminCtx, weeklySeries, 'adminTrend', window.innerWidth < 900 ? 8 : 18);

        const leadSourceLabelsPlugin = {
            id: 'adminLeadSourceLabels',
            afterDraw: (chart) => {
                const { ctx } = chart;
                const values = chart.data.datasets[0].data;
                const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
                const meta = chart.getDatasetMeta(0);
                const firstArc = meta.data[0];
                if (!firstArc) return;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#07183f';
                ctx.font = '900 24px Sarabun';
                ctx.fillText(formatNumber(total), firstArc.x, firstArc.y - 7);
                ctx.fillStyle = '#64748b';
                ctx.font = '800 12px Sarabun';
                ctx.fillText('งานส่งฝ่ายขาย', firstArc.x, firstArc.y + 15);
                ctx.restore();
            }
        };

        charts['adminLeadSource'] = new Chart(adminSourceCtx, {
            type: 'doughnut',
            data: {
                labels: ['LINE OA', 'Facebook', 'โทรเข้า'],
                datasets: [{
                    data: [sourceTotals.line, sourceTotals.facebook, sourceTotals.phone],
                    backgroundColor: ['#19c069', '#1d6fe7', '#52627a'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '58%',
                layout: { padding: 8 },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed || 0;
                                const percent = sourceTotal > 0 ? Math.round((value / sourceTotal) * 100) : 0;
                                return `${context.label}: ${formatNumber(value)} งาน (${percent}%)`;
                            }
                        }
                    }
                }
            },
            plugins: [leadSourceLabelsPlugin]
        });
    }, 50);
}
