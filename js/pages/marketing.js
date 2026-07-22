// Render: Marketing online page.
function renderMarketingDeepDiveHTML(current, m, opt, container) {
    const totalBudget = current.marketing.gfs.target + current.marketing.mhl.target + current.marketing.car.target;
    const totalSpend = current.marketing.gfs.actual + current.marketing.mhl.actual + current.marketing.car.actual;
    const totalContacts = current.admin.contacts.total + (current.carDetail ? current.carDetail.contacts.total : 0);
    const totalLeads = current.admin.leads.actual + (current.admin.leads.car || 0);
    const totalSales = getTotalSalesActual(current);

    const costPerContact = totalContacts > 0 ? totalSpend / totalContacts : 0;
    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const totalRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const spendPercent = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
    const isOverTotal = totalSpend > totalBudget;

    const currentIndex = dashboardData.findIndex(d => d.id === current.id);
    const prev = currentIndex > 0 ? dashboardData[currentIndex - 1] : null;
    const prevSpend = prev ? prev.marketing.gfs.actual + prev.marketing.mhl.actual + prev.marketing.car.actual : 0;
    const prevSales = prev ? getTotalSalesActual(prev) : 0;
    const prevRoas = prevSpend > 0 ? prevSales / prevSpend : 0;
    const roasDiff = totalRoas - prevRoas;

    const clamp = value => Math.max(0, Math.min(value, 100));
    const money = value => formatBaht(value);
    const safePercent = value => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
    const weeklyTrendFilter = typeof marketingWeeklyTrendFilter === 'undefined' ? 'total' : marketingWeeklyTrendFilter;

    const companyConfig = {
        gfs: { code: 'GFS', name: 'Goodfilm (GFS)', className: 'is-gfs', iconTone: 'blue' },
        mhl: { code: 'MHL', name: 'Maholan (MHL)', className: 'is-mhl', iconTone: 'orange' },
        car: { code: 'CAR', name: 'ฟิล์มรถยนต์ (CAR)', className: 'is-car', iconTone: 'green' }
    };

    const companyData = Object.keys(companyConfig).map(key => {
        const mk = current.marketing[key];
        const target = mk.target || 0;
        const actual = mk.actual || 0;
        const sales = current[key]?.actual || 0;
        const contacts = key === 'car'
            ? (current.carDetail ? current.carDetail.contacts.total : 0)
            : ((current.admin.contacts[key]?.line || 0) + (current.admin.contacts[key]?.fb || 0) + (current.admin.contacts[key]?.tel || 0));
        const leads = key === 'car'
            ? (current.admin.leads.car || 0)
            : ((current.admin.leads[key]?.line || 0) + (current.admin.leads[key]?.fb || 0) + (current.admin.leads[key]?.tel || 0));
        const platformTotal = (mk.google || 0) + (mk.fb || 0);
        const googlePercent = platformTotal > 0 ? (mk.google / platformTotal) * 100 : 0;
        const fbPercent = platformTotal > 0 ? (mk.fb / platformTotal) * 100 : 0;
        const companyRoas = actual > 0 ? sales / actual : 0;
        const salesRatio = sales > 0 ? (actual / sales) * 100 : 0;

        return {
            key,
            ...companyConfig[key],
            mk,
            target,
            actual,
            sales,
            contacts,
            leads,
            progress: target > 0 ? (actual / target) * 100 : 0,
            isOver: target > 0 && actual > target,
            googlePercent,
            fbPercent,
            roas: companyRoas,
            salesRatio,
            cpa: leads > 0 ? actual / leads : 0,
            cpc: contacts > 0 ? actual / contacts : 0
        };
    });
    const companyShareColors = { gfs: '#2878ff', mhl: '#ff7a00', car: '#059669' };

    const metricCards = [
        {
            icon: 'wallet',
            tone: 'blue',
            prominent: true,
            label: 'งบโฆษณารวม (TOTAL SPEND)',
            value: money(totalSpend),
            bar: true,
            metaLeft: `งบที่ตั้งไว้ ${money(totalBudget)}`,
            metaRight: `${isOverTotal ? 'เกินงบ' : 'อยู่ในงบ'} (${safePercent(spendPercent)})`,
            metaState: isOverTotal ? 'bad' : 'good'
        },
        {
            icon: 'bar-chart-3',
            tone: 'green',
            label: 'ผลตอบแทนรวม (TOTAL ROAS)',
            value: `${totalRoas.toFixed(1)}x`,
            valueClass: 'is-green',
            footer: `ยอดขายรวม ${money(totalSales)}`
        },
        {
            icon: 'user',
            tone: 'blue',
            label: 'ต้นทุน / 1 ติดต่อ',
            value: money(costPerContact),
            footer: `จากทั้งหมด ${formatCurrency(totalContacts)} ติดต่อ`
        },
        {
            icon: 'user-plus',
            tone: 'purple',
            label: 'ต้นทุน / 1 ลูกค้าใหม่',
            value: money(costPerLead),
            footer: `ได้มาทั้งหมด ${formatCurrency(totalLeads)} ราย`
        }
    ];

    container.innerHTML = `
        <div class="marketing-v3">
            <div class="marketing-page-head">
                <div class="marketing-title-row">
                    <button type="button" id="marketing-sidebar-toggle" class="marketing-sidebar-toggle" onclick="toggleDesktopSidebar()" aria-label="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}" title="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}">
                        <i id="marketing-sidebar-toggle-icon" data-lucide="${isDesktopSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'}" class="w-5 h-5"></i>
                    </button>
                    <div class="marketing-title-block">
                        <h2>MARKETING ONLINE</h2>
                        <p>วิเคราะห์งบโฆษณา การเข้าถึง และความคุ้มค่า (ROAS)</p>
                    </div>
                </div>
                <div class="page-head-actions">
                    <label class="marketing-week-select">
                        <i data-lucide="calendar-days" class="w-5 h-5"></i>
                        <select onchange="handleWeekChange(event)" aria-label="เลือกสัปดาห์">${opt}</select>
                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </label>
                    ${renderFullscreenButton()}
                </div>
            </div>

            <section class="marketing-kpi-grid">
                ${metricCards.map(card => `
                    <article class="marketing-kpi-card is-${card.tone} ${card.prominent ? 'is-primary' : ''}">
                        <div class="marketing-kpi-icon is-${card.tone}">
                            <i data-lucide="${card.icon}" class="w-6 h-6"></i>
                        </div>
                        <div class="marketing-kpi-body">
                            <p>${card.label}</p>
                            <strong class="${card.valueClass || ''}">${card.value}</strong>
                            ${card.bar ? `
                                <div class="marketing-progress-track">
                                    <span class="${isOverTotal ? 'is-red' : 'is-blue'}" style="width:${clamp(spendPercent)}%"></span>
                                </div>
                                <div class="marketing-kpi-meta">
                                    <span>${card.metaLeft}</span>
                                    <b class="is-${card.metaState}">
                                        <i data-lucide="${card.metaState === 'good' ? 'check-circle-2' : 'alert-triangle'}" class="w-4 h-4"></i>
                                        ${card.metaRight}
                                    </b>
                                </div>
                            ` : `<span class="marketing-kpi-footer">${card.footer}</span>`}
                        </div>
                    </article>
                `).join('')}
            </section>

            <section class="marketing-company-grid">
                ${companyData.map(company => `
                    <article class="marketing-company-card ${company.className}">
                        <div class="marketing-company-head">
                            <div class="marketing-company-title">
                                <span class="marketing-company-brand" aria-label="${company.name}">${company.code}</span>
                                <h3>${company.name}</h3>
                            </div>
                            <div class="marketing-company-status">
                                <small>ใช้ไป ${safePercent(company.progress)}</small>
                                <b class="${company.isOver ? 'is-bad' : 'is-good'}">
                                    <i data-lucide="${company.isOver ? 'alert-triangle' : 'check-circle-2'}" class="w-4 h-4"></i>
                                    ${company.isOver ? 'เกินงบ' : 'ในงบ'}
                                </b>
                            </div>
                        </div>

                        <div class="marketing-company-spend">
                            <strong>${money(company.actual)}</strong>
                            <span>/ ${money(company.target)}</span>
                        </div>
                        <div class="marketing-progress-track">
                            <span style="width:${clamp(company.progress)}%"></span>
                        </div>

                        <div class="marketing-platform-row">
                            <div>
                                <span><i class="marketing-dot is-google"></i> Google (${company.googlePercent.toFixed(0)}%)</span>
                                <b>${money(company.mk.google || 0)}</b>
                            </div>
                            <div>
                                <span>FB (${company.fbPercent.toFixed(0)}%)</span>
                                <b>${money(company.mk.fb || 0)}</b>
                            </div>
                        </div>

                        <div class="marketing-mini-grid">
                            <div class="is-contact">
                                <div class="marketing-mini-label"><i data-lucide="message-square" class="w-5 h-5"></i><span>ติดต่อ</span></div>
                                <strong>${formatCurrency(company.contacts)} ติดต่อ</strong>
                            </div>
                            <div>
                                <div class="marketing-mini-label"><i data-lucide="users" class="w-5 h-5"></i><span>ลูกค้า</span></div>
                                <strong>${formatCurrency(company.leads)} ราย</strong>
                            </div>
                            <div>
                                <div class="marketing-mini-label"><i data-lucide="bar-chart-3" class="w-5 h-5"></i><span>ROAS</span></div>
                                <strong class="is-green">${company.roas.toFixed(1)}x</strong>
                            </div>
                            <div>
                                <div class="marketing-mini-label"><i data-lucide="gauge" class="w-5 h-5"></i><span>เทียบยอดขาย</span></div>
                                <strong>${company.salesRatio.toFixed(1)}%</strong>
                            </div>
                        </div>

                        <div class="marketing-company-foot">
                            <span>${company.contacts > 0 ? `<strong>${formatCurrency(company.cpc)}</strong> <em>บาท</em>` : '-'} <b>/ ติดต่อ</b></span>
                            <i></i>
                            <span>${company.leads > 0 ? `<strong>${formatCurrency(company.cpa)}</strong> <em>บาท</em>` : '-'} <b>/ ลูกค้า</b></span>
                        </div>
                    </article>
                `).join('')}
            </section>

            <section class="marketing-bottom-grid">
                <article class="marketing-chart-card">
                    <div class="marketing-chart-head">
                        <h3><i data-lucide="trending-up" class="w-5 h-5"></i> แนวโน้มค่าโฆษณาปีนี้ (รายเดือน)</h3>
                        <div class="marketing-filter-pills">
                            <button onclick="changeMarketingTrendFilter('total')" class="${marketingTrendFilter === 'total' ? 'is-active is-total' : ''}">รวมทั้งหมด</button>
                            <button onclick="changeMarketingTrendFilter('gfs')" class="${marketingTrendFilter === 'gfs' ? 'is-active is-gfs' : ''}">GFS</button>
                            <button onclick="changeMarketingTrendFilter('mhl')" class="${marketingTrendFilter === 'mhl' ? 'is-active is-mhl' : ''}">MHL</button>
                            <button onclick="changeMarketingTrendFilter('car')" class="${marketingTrendFilter === 'car' ? 'is-active is-car' : ''}">CAR</button>
                        </div>
                        <div class="marketing-chart-legend">
                            <span><i class="legend-bar"></i> จ่ายจริง</span>
                            <span><i class="legend-line"></i> งบรวม</span>
                        </div>
                    </div>
                    <div class="marketing-chart-wrap">
                        <canvas id="marketingSpendCanvas"></canvas>
                    </div>
                </article>

                <article class="marketing-company-share-card">
                    <div class="marketing-share-head">
                        <h3><i data-lucide="pie-chart" class="w-5 h-5"></i> สัดส่วนค่าใช้จ่ายแต่ละบริษัท</h3>
                    </div>
                    <div class="marketing-share-body">
                        <div class="marketing-share-chart-wrap">
                            <canvas id="marketingCompanyShareCanvas"></canvas>
                            <div class="marketing-share-center">
                                <span>ใช้จ่ายรวม</span>
                                <strong>${formatCurrency(totalSpend)}</strong>
                                <small>บาท</small>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section class="marketing-weekly-section">
                <article class="marketing-chart-card marketing-weekly-card">
                    <div class="marketing-chart-head">
                        <h3><i data-lucide="calendar-range" class="w-5 h-5"></i> แนวโน้มค่าโฆษณาปีนี้ (ราย Week)</h3>
                        <div class="marketing-filter-pills">
                            <button onclick="changeMarketingWeeklyTrendFilter('total')" class="${weeklyTrendFilter === 'total' ? 'is-active is-total' : ''}">รวมทั้งหมด</button>
                            <button onclick="changeMarketingWeeklyTrendFilter('gfs')" class="${weeklyTrendFilter === 'gfs' ? 'is-active is-gfs' : ''}">GFS</button>
                            <button onclick="changeMarketingWeeklyTrendFilter('mhl')" class="${weeklyTrendFilter === 'mhl' ? 'is-active is-mhl' : ''}">MHL</button>
                            <button onclick="changeMarketingWeeklyTrendFilter('car')" class="${weeklyTrendFilter === 'car' ? 'is-active is-car' : ''}">CAR</button>
                        </div>
                        <div class="marketing-chart-legend">
                            <span><i class="legend-bar"></i> ค่าโฆษณาที่ใช้จริง</span>
                            <span><i class="legend-line"></i> งบรวม</span>
                        </div>
                    </div>
                    <div class="marketing-chart-wrap marketing-weekly-chart-wrap">
                        <canvas id="marketingWeeklySpendCanvas"></canvas>
                    </div>
                </article>
            </section>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('marketingSpendCanvas')?.getContext('2d');
        if (!ctx) return;
        if (charts.marketingSpend) charts.marketingSpend.destroy();

        const monthlyDataMap = {};
        const monthsOrder = [];
        dashboardData.forEach(d => {
            const monthGroup = extractMonthGroup(d.dateRange);
            if (!monthlyDataMap[monthGroup]) {
                monthlyDataMap[monthGroup] = {
                    label: monthGroup,
                    gfs: { actual: 0, target: 0 },
                    mhl: { actual: 0, target: 0 },
                    car: { actual: 0, target: 0 }
                };
                monthsOrder.push(monthGroup);
            }
            monthlyDataMap[monthGroup].gfs.actual += d.marketing.gfs.actual;
            monthlyDataMap[monthGroup].gfs.target += d.marketing.gfs.target;
            monthlyDataMap[monthGroup].mhl.actual += d.marketing.mhl.actual;
            monthlyDataMap[monthGroup].mhl.target += d.marketing.mhl.target;
            monthlyDataMap[monthGroup].car.actual += d.marketing.car.actual;
            monthlyDataMap[monthGroup].car.target += d.marketing.car.target;
        });

        const chartRows = monthsOrder
            .map(month => monthlyDataMap[month])
            .filter(d => {
                const keys = marketingTrendFilter === 'total' ? ['gfs', 'mhl', 'car'] : [marketingTrendFilter];
                return keys.some(key => d[key].actual + d[key].target > 0);
            });

        const keys = marketingTrendFilter === 'total' ? ['gfs', 'mhl', 'car'] : [marketingTrendFilter];
        const actualData = chartRows.map(row => keys.reduce((sum, key) => sum + row[key].actual, 0));
        const targetData = chartRows.map(row => keys.reduce((sum, key) => sum + row[key].target, 0));
        const percentData = actualData.map((actual, index) => targetData[index] > 0 ? (actual / targetData[index]) * 100 : 0);
        const colors = { total: '#2563eb', gfs: '#2878ff', mhl: '#7c3aed', car: '#ef4444' };
        const activeColor = colors[marketingTrendFilter] || colors.total;
        const budgetLineColor = '#0f3f9e';

        const percentLabelPlugin = {
            id: 'marketingPercentLabels',
            afterDatasetsDraw(chart) {
                const { ctx: chartCtx } = chart;
                const barMeta = chart.getDatasetMeta(0);
                const budgetMeta = chart.getDatasetMeta(1);
                chartCtx.save();
                chartCtx.font = '900 12px Sarabun';
                chartCtx.textAlign = 'center';
                chartCtx.textBaseline = 'bottom';
                barMeta.data.forEach((point, index) => {
                    const percent = percentData[index] || 0;
                    const budgetPoint = budgetMeta.data[index];
                    const highestPoint = Math.min(point.y, budgetPoint?.y ?? point.y);
                    const labelY = Math.max(chart.chartArea.top + 14, highestPoint - 10);
                    chartCtx.fillStyle = percent <= 100 ? '#059669' : '#dc2626';
                    chartCtx.fillText(`${Math.round(percent)}%`, point.x, labelY);
                });
                chartCtx.restore();
            }
        };

        charts.marketingSpend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartRows.map(row => row.label),
                datasets: [
                    {
                        type: 'bar',
                        label: 'จ่ายจริง',
                        data: actualData,
                        backgroundColor: activeColor,
                        borderRadius: 5,
                        barPercentage: 0.58,
                        categoryPercentage: 0.7,
                        order: 2,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'งบรวม',
                        data: targetData,
                        borderColor: budgetLineColor,
                        backgroundColor: '#ffffff',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: budgetLineColor,
                        pointBorderWidth: 2,
                        tension: 0.25,
                        order: 1,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 20, right: 8, left: 0, bottom: 0 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { family: 'Sarabun', weight: '800' },
                        bodyFont: { family: 'Sarabun', weight: '700' },
                        callbacks: {
                            label(context) {
                                const percent = percentData[context.dataIndex] || 0;
                                if (context.dataset.type === 'bar') return `จ่ายจริง: ${formatBaht(context.raw)} (${percent.toFixed(1)}%)`;
                                return `งบรวม: ${formatBaht(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#24345d', font: { family: 'Sarabun', weight: '800', size: 12 } }
                    },
                    y: {
                        beginAtZero: true,
                        grace: '18%',
                        grid: { color: '#edf2f7', drawTicks: false },
                        border: { display: false },
                        ticks: {
                            color: '#24345d',
                            font: { family: 'Sarabun', weight: '700', size: 11 },
                            callback: value => value >= 1000 ? `${value / 1000}k` : value
                        },
                        title: {
                            display: true,
                            text: 'บาท',
                            color: '#435373',
                            font: { family: 'Sarabun', weight: '800', size: 11 }
                        }
                    }
                }
            },
            plugins: [percentLabelPlugin]
        });

        const companyShareCtx = document.getElementById('marketingCompanyShareCanvas')?.getContext('2d');
        if (companyShareCtx) {
            if (charts.marketingCompanyShare) charts.marketingCompanyShare.destroy();
            const shareValues = companyData.map(company => company.actual);
            const companyShareLabelPlugin = {
                id: 'marketingCompanyShareLabels',
                afterDatasetsDraw(chart) {
                    const { ctx: chartCtx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    const total = shareValues.reduce((sum, value) => sum + value, 0);
                    chartCtx.save();
                    chartCtx.font = '900 11px Sarabun';
                    meta.data.forEach((arc, index) => {
                        const { x, y, startAngle, endAngle, innerRadius, outerRadius } = arc.getProps(
                            ['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'],
                            true
                        );
                        const angle = (startAngle + endAngle) / 2;
                        const portion = total > 0 ? shareValues[index] / total : 0;
                        const isSmall = portion < 0.13;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const radius = isSmall ? outerRadius + 18 : (innerRadius + outerRadius) / 2;
                        const labelX = x + cos * radius;
                        const labelY = y + sin * radius;

                        if (isSmall) {
                            const lineStart = outerRadius + 3;
                            chartCtx.strokeStyle = companyShareColors[companyData[index].key];
                            chartCtx.lineWidth = 1.5;
                            chartCtx.beginPath();
                            chartCtx.moveTo(x + cos * lineStart, y + sin * lineStart);
                            chartCtx.lineTo(x + cos * (outerRadius + 13), y + sin * (outerRadius + 13));
                            chartCtx.stroke();
                        }

                        chartCtx.fillStyle = isSmall ? '#111a3b' : '#ffffff';
                        chartCtx.textAlign = isSmall ? (cos >= 0 ? 'left' : 'right') : 'center';
                        chartCtx.textBaseline = 'middle';
                        chartCtx.fillText(companyData[index].code, labelX, labelY);
                    });
                    chartCtx.restore();
                }
            };

            charts.marketingCompanyShare = new Chart(companyShareCtx, {
                type: 'doughnut',
                data: {
                    labels: companyData.map(company => company.code),
                    datasets: [{
                        data: shareValues,
                        backgroundColor: companyData.map(company => companyShareColors[company.key]),
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        hoverOffset: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '67%',
                    layout: { padding: 18 },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { family: 'Sarabun', weight: '800' },
                            bodyFont: { family: 'Sarabun', weight: '700' },
                            callbacks: {
                                label(context) {
                                    const value = context.raw || 0;
                                    const share = totalSpend > 0 ? (value / totalSpend) * 100 : 0;
                                    return `ใช้จ่าย: ${formatBaht(value)} (${share.toFixed(1)}%)`;
                                }
                            }
                        }
                    }
                },
                plugins: [companyShareLabelPlugin]
            });
        }

        const weeklyCtx = document.getElementById('marketingWeeklySpendCanvas')?.getContext('2d');
        if (!weeklyCtx) return;
        if (charts.marketingWeeklySpend) charts.marketingWeeklySpend.destroy();

        const weeklyKeys = weeklyTrendFilter === 'total' ? ['gfs', 'mhl', 'car'] : [weeklyTrendFilter];
        const weeklyRows = dashboardData.filter(row => weeklyKeys.some(key => {
            const marketing = row.marketing[key];
            return marketing && (marketing.actual + marketing.target > 0);
        }));
        const weeklyActualData = weeklyRows.map(row => weeklyKeys.reduce((sum, key) => sum + row.marketing[key].actual, 0));
        const weeklyTargetData = weeklyRows.map(row => weeklyKeys.reduce((sum, key) => sum + row.marketing[key].target, 0));
        const weeklyPercentData = weeklyActualData.map((actual, index) => weeklyTargetData[index] > 0 ? (actual / weeklyTargetData[index]) * 100 : 0);
        const weeklyColor = colors[weeklyTrendFilter] || colors.total;

        const weeklyPercentLabelPlugin = {
            id: 'marketingWeeklyPercentLabels',
            afterDatasetsDraw(chart) {
                const { ctx: chartCtx } = chart;
                const barMeta = chart.getDatasetMeta(0);
                const budgetMeta = chart.getDatasetMeta(1);
                chartCtx.save();
                chartCtx.font = '900 10px Sarabun';
                chartCtx.textAlign = 'center';
                chartCtx.textBaseline = 'bottom';
                barMeta.data.forEach((point, index) => {
                    const percent = weeklyPercentData[index] || 0;
                    const budgetPoint = budgetMeta.data[index];
                    const highestPoint = Math.min(point.y, budgetPoint?.y ?? point.y);
                    const labelY = Math.max(chart.chartArea.top + 12, highestPoint - 9);
                    chartCtx.fillStyle = percent <= 100 ? '#059669' : '#dc2626';
                    chartCtx.fillText(`${Math.round(percent)}%`, point.x, labelY);
                });
                chartCtx.restore();
            }
        };

        charts.marketingWeeklySpend = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: weeklyRows.map(row => row.week),
                datasets: [
                    {
                        type: 'bar',
                        label: 'ค่าโฆษณาที่ใช้จริง',
                        data: weeklyActualData,
                        backgroundColor: weeklyColor,
                        borderRadius: 4,
                        barPercentage: 0.7,
                        categoryPercentage: 0.82,
                        order: 2,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'งบรวม',
                        data: weeklyTargetData,
                        borderColor: budgetLineColor,
                        backgroundColor: '#ffffff',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: budgetLineColor,
                        pointBorderWidth: 2,
                        tension: 0.22,
                        order: 1,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 18, right: 8, left: 0, bottom: 0 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { family: 'Sarabun', weight: '800' },
                        bodyFont: { family: 'Sarabun', weight: '700' },
                        callbacks: {
                            title(items) {
                                const row = weeklyRows[items[0]?.dataIndex];
                                return row ? `${row.week} | ${row.dateRange}` : '';
                            },
                            label(context) {
                                const percent = weeklyPercentData[context.dataIndex] || 0;
                                if (context.dataset.type === 'bar') return `จ่ายจริง: ${formatBaht(context.raw)} (${percent.toFixed(1)}%)`;
                                return `งบรวม: ${formatBaht(context.raw)}`;
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
                            color: '#24345d',
                            font: { family: 'Sarabun', weight: '800', size: 10 },
                            maxRotation: 0,
                            minRotation: 0,
                            callback: (value, index) => {
                                const label = weeklyRows[index]?.week || '';
                                return index % 3 === 0 || index === weeklyRows.length - 1
                                    ? label.replace('Week ', 'W')
                                    : '';
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grace: '18%',
                        grid: { color: '#edf2f7', drawTicks: false },
                        border: { display: false },
                        ticks: {
                            color: '#24345d',
                            font: { family: 'Sarabun', weight: '700', size: 11 },
                            callback: value => value >= 1000 ? `${value / 1000}k` : value
                        },
                        title: {
                            display: true,
                            text: 'บาท',
                            color: '#435373',
                            font: { family: 'Sarabun', weight: '800', size: 11 }
                        }
                    }
                }
            },
            plugins: [weeklyPercentLabelPlugin]
        });
    }, 50);
}
