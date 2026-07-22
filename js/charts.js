// Chart.js defaults and shared chart renderers.
// กำหนดขนาดฟอนต์เริ่มต้นให้กราฟอ่านง่ายขึ้น
Chart.defaults.font.family = 'Sarabun';
Chart.defaults.font.size = 14;
Chart.defaults.color = '#64748b';

function createProgressPlugin(isBudget = false) {
    return {
        id: 'progressPlugin',
        afterDatasetsDraw: (chart) => {
            const { ctx, data } = chart;
            if (data.datasets.length < 2) return;
            
            // ป้องกันไม่ให้ทำงานกับกราฟที่ไม่ได้มีเป้าหมาย 
            const labelStr = data.datasets[1].label || '';
            if (!labelStr.includes('เป้า') && !labelStr.includes('งบ')) return;

            const targetIndex = data.datasets.findIndex(ds => ds.label && (ds.label.includes('เป้า') || ds.label.includes('งบ')));
            const actualIndex = data.datasets.findIndex(ds => ds.label && !ds.label.includes('เป้า') && !ds.label.includes('งบ') && !ds.label.includes('ความเสียหาย'));

            if (actualIndex === -1 || targetIndex === -1) return;

            const actualMeta = chart.getDatasetMeta(actualIndex);
            ctx.save();
            ctx.font = 'bold 13px Sarabun';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            actualMeta.data.forEach((dp, i) => {
                const actual = data.datasets[actualIndex].data[i];
                const target = data.datasets[targetIndex].data[i];
                if (target > 0 && actual !== undefined && !isNaN(actual)) {
                    const percent = (actual / target) * 100;
                    let text = percent.toFixed(0) + '%';
                    let icon = '';
                    if (isBudget) {
                        if (percent <= 100) { ctx.fillStyle = '#10b981'; } 
                        else { ctx.fillStyle = '#ef4444'; icon = '⚠️ '; } 
                    } else {
                        if (percent >= 100) { ctx.fillStyle = '#10b981'; icon = '🏆 '; } 
                        else { ctx.fillStyle = '#64748b'; } 
                    }
                    ctx.fillText(icon + text, dp.x, dp.y - 12);
                }
            });
            ctx.restore();
        }
    };
}

function renderBasicTrendChart(current) {
    const bCtx = document.getElementById('trendChartCanvas');
    if(!bCtx) return;
    if (charts['barTrend']) charts['barTrend'].destroy();

    let labels = [];
    let dAct = [];
    let dTar = [];

    if (overviewTimeframe === 'monthly') {
        // 1. จัดกลุ่มข้อมูลเป็นรายเดือน
        const monthlyDataMap = {};
        const monthsOrder = [];

        dashboardData.forEach(d => {
            const monthGroup = extractMonthGroup(d.dateRange);
            if (!monthlyDataMap[monthGroup]) {
                monthlyDataMap[monthGroup] = {
                    label: monthGroup,
                    total: { actual: 0, target: 0 },
                    gfs: { actual: 0, target: 0 },
                    mhl: { actual: 0, target: 0 },
                    car: { actual: 0, target: 0 }
                };
                monthsOrder.push(monthGroup);
            }
            monthlyDataMap[monthGroup].total.actual += getTotalSalesActual(d);
            monthlyDataMap[monthGroup].total.target += getTotalSalesTarget(d);
            monthlyDataMap[monthGroup].gfs.actual += d.gfs.actual;
            monthlyDataMap[monthGroup].gfs.target += d.gfs.target;
            monthlyDataMap[monthGroup].mhl.actual += d.mhl.actual;
            monthlyDataMap[monthGroup].mhl.target += d.mhl.target;
            monthlyDataMap[monthGroup].car.actual += d.car.actual;
            monthlyDataMap[monthGroup].car.target += d.car.target;
        });

        // 2. ดึงข้อมูลรายเดือนที่มีการดำเนินงาน (ยอดรวม > 0)
        const recentData = monthsOrder.map(m => monthlyDataMap[m]).filter(d => (d.total.actual + d.total.target) > 0);

        labels = recentData.map(d => d.label);
        dAct = recentData.map(d => {
            if(activeChartTab === 'total') return d.total.actual;
            return d[activeChartTab].actual;
        });
        dTar = recentData.map(d => {
            if(activeChartTab === 'total') return d.total.target;
            return d[activeChartTab].target;
        });
    } else {
        // ดึงเฉพาะสัปดาห์ที่มีการดำเนินงาน (12 สัปดาห์ล่าสุด)
        const recentData = dashboardData.filter(d => getTotalSalesActual(d) > 0).slice(-12);
        
        labels = recentData.map(d => d.week);
        dAct = recentData.map(d => {
            if(activeChartTab === 'total') return getTotalSalesActual(d);
            return d[activeChartTab].actual;
        });
        dTar = recentData.map(d => {
            if(activeChartTab === 'total') return getTotalSalesTarget(d);
            return d[activeChartTab].target;
        });
    }

    const dLabelAct = activeChartTab === 'total' ? 'ผลงานรายเดือน' : `ผลงานรายเดือน ${activeChartTab.toUpperCase()}`;
    const dLabelTar = activeChartTab === 'total' ? 'เป้ายอดขาย' : `เป้ายอดขาย ${activeChartTab.toUpperCase()}`;
    const cols = { total: '#2563eb', gfs: '#1464f4', mhl: '#fb8c00', car: '#00b451' };
    const lines = { total: '#2563eb', gfs: '#1464f4', mhl: '#fb8c00', car: '#00b451' };
    const overviewPercentPlugin = {
        id: 'overviewPercentLabels',
        afterDatasetsDraw: (chart) => {
            const { ctx, data } = chart;
            const bars = chart.getDatasetMeta(0);
            ctx.save();
            ctx.font = '800 13px Sarabun';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            bars.data.forEach((bar, index) => {
                const actual = data.datasets[0].data[index] || 0;
                const target = data.datasets[1].data[index] || 0;
                if (target <= 0) return;
                const percent = Math.round((actual / target) * 100);
                const over = percent >= 100;
                ctx.fillStyle = over ? '#07883c' : '#061b4e';
                const text = over ? `↑ ${percent}%` : percent < 75 ? `↓ ${percent}%` : `${percent}%`;
                ctx.fillText(text, bar.x, Math.max(bar.y - 10, 16));
            });
            ctx.restore();
        }
    };

    charts['barTrend'] = new Chart(bCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: dLabelAct,
                    data: dAct,
                    backgroundColor: (context) => {
                        const area = context.chart.chartArea;
                        if (!area) return cols[activeChartTab];
                        const gradient = context.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                        gradient.addColorStop(0, cols[activeChartTab]);
                        gradient.addColorStop(1, '#1d4ed8');
                        return gradient;
                    },
                    borderRadius: 3,
                    barPercentage: 0.58,
                    categoryPercentage: 0.68,
                    order: 2
                },
                {
                    type: 'line',
                    label: dLabelTar,
                    data: dTar,
                    borderColor: lines[activeChartTab],
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.28,
                    order: 1
                }
            ]
        },
        options: { 
            layout: { padding: { top: 22, right: 8, left: 4, bottom: 0 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { family: 'Sarabun', weight: '800' },
                    bodyFont: { family: 'Sarabun', weight: '700' },
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatBaht(context.raw)}`
                    }
                }
            },
            scales: { 
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: '#0f1f46', font: { family: 'Sarabun', weight: '800', size: 12 } }
                }, 
                y: {
                    beginAtZero: true,
                    grace: '28%',
                    grid: { color: '#edf2f7', drawTicks: false },
                    border: { display: false },
                    ticks: {
                        color: '#24345d',
                        padding: 8,
                        font: { family: 'Sarabun', weight: '700', size: 12 },
                        callback: (v) => v >= 1000000 ? (v/1000000)+'M' : (v>=1000?(v/1000)+'k':v)
                    }
                } 
            }
        },
        plugins: [overviewPercentPlugin]
    });
}

function renderOverviewWeeklyTrendChart(current) {
    const ctx = document.getElementById('weeklyTrendCanvas');
    if (!ctx) return;
    if (charts['overviewWeeklyTrend']) charts['overviewWeeklyTrend'].destroy();

    const currentIndex = dashboardData.findIndex(d => d.id === current.id);
    const weeks = dashboardData
        .slice(0, currentIndex >= 0 ? currentIndex + 1 : dashboardData.length)
        .filter(d => getTotalSalesActual(d) > 0 || getTotalSalesTarget(d) > 0);

    const labels = weeks.map(d => d.week);
    const actualData = weeks.map(d => {
        if (activeChartTab === 'total') return getTotalSalesActual(d);
        return d[activeChartTab]?.actual || 0;
    });
    const targetData = weeks.map(d => {
        if (activeChartTab === 'total') return getTotalSalesTarget(d);
        return d[activeChartTab]?.target || 0;
    });
    const chartLabelSuffix = activeChartTab === 'total' ? '' : ` ${activeChartTab.toUpperCase()}`;
    const weeklyPercentLabelsPlugin = {
        id: 'weeklyPercentLabels',
        afterDatasetsDraw: (chart) => {
            const { ctx, data } = chart;
            const bars = chart.getDatasetMeta(0);
            ctx.save();
            ctx.font = '800 11px Sarabun';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            bars.data.forEach((bar, index) => {
                const actual = data.datasets[0].data[index] || 0;
                const target = data.datasets[1].data[index] || 0;
                if (target <= 0 || actual <= 0) return;
                const percent = Math.round((actual / target) * 100);
                ctx.fillStyle = percent >= 100 ? '#07883c' : '#0f3f99';
                ctx.fillText(`${percent}%`, bar.x, Math.max(bar.y - 7, 13));
            });
            ctx.restore();
        }
    };

    charts['overviewWeeklyTrend'] = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: `ผลงานราย Week${chartLabelSuffix}`,
                    data: actualData,
                    backgroundColor: activeChartTab === 'mhl' ? '#fb8c00' : activeChartTab === 'car' ? '#00b451' : '#1464f4',
                    borderRadius: 4,
                    barPercentage: 0.72,
                    categoryPercentage: 0.72,
                    order: 2
                },
                {
                    type: 'line',
                    label: `เป้ายอดขายราย Week${chartLabelSuffix}`,
                    data: targetData,
                    borderColor: activeChartTab === 'mhl' ? '#c96d00' : activeChartTab === 'car' ? '#087a34' : '#0f3f99',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.24,
                    order: 1
                }
            ]
        },
        options: {
            layout: { padding: { top: 24, right: 8, left: 4, bottom: 0 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { family: 'Sarabun', weight: '800' },
                    bodyFont: { family: 'Sarabun', weight: '700' },
                    callbacks: {
                        title: (items) => {
                            const index = items[0]?.dataIndex ?? 0;
                            const week = weeks[index];
                            return week ? `${week.week} (${week.dateRange})` : '';
                        },
                        label: (context) => `${context.dataset.label}: ${formatBaht(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 18,
                        color: '#0f1f46',
                        font: { family: 'Sarabun', weight: '800', size: 11 },
                        maxRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grace: '18%',
                    grid: { color: '#edf2f7', drawTicks: false },
                    border: { display: false },
                    ticks: {
                        color: '#24345d',
                        padding: 8,
                        font: { family: 'Sarabun', weight: '700', size: 12 },
                        callback: (v) => v >= 1000000 ? (v / 1000000) + 'M' : (v >= 1000 ? (v / 1000) + 'k' : v)
                    }
                }
            }
        },
        plugins: [weeklyPercentLabelsPlugin]
    });
}

// ==========================================
// RENDER: OVERVIEW 
// ==========================================
