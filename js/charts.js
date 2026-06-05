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

    const dLabelAct = activeChartTab === 'total' ? 'ยอดขายจริงรวม' : `ยอดขายจริง ${activeChartTab.toUpperCase()}`;
    const dLabelTar = activeChartTab === 'total' ? 'เป้าหมายรวม' : `เป้าหมาย ${activeChartTab.toUpperCase()}`;

    const cols = { total: '#6366f1', gfs: '#3b82f6', mhl: '#f59e0b', car: '#10b981' };
    const lines = { total: '#818cf8', gfs: '#93c5fd', mhl: '#fcd34d', car: '#6ee7b7' };

    charts['barTrend'] = new Chart(bCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { type: 'bar', label: dLabelAct, data: dAct, backgroundColor: cols[activeChartTab], borderRadius: 4, barPercentage: 0.6, order: 2 },
                { type: 'line', label: dLabelTar, data: dTar, borderColor: lines[activeChartTab], backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: lines[activeChartTab], tension: 0.1, order: 1 }
            ]
        },
        options: { 
            layout: { padding: { top: 30 } }, responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } } },
            scales: { 
                x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } }, 
                y: { beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { weight: 'bold' }, callback: (v) => v >= 1000000 ? (v/1000000)+'M' : (v>=1000?(v/1000)+'k':v) } } 
            }
        },
        plugins: [createProgressPlugin(false)]
    });
}

// ==========================================
// RENDER: OVERVIEW 
// ==========================================
