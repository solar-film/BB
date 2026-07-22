// Render: Building film sales page.
function renderBuildingSalesHTML(current, m, opt, container) {
    const b = current.buildingSales;
    if(!b) { container.innerHTML = `<div class="p-8 text-center text-slate-500 text-lg">ยังไม่มีข้อมูลสำหรับสัปดาห์นี้</div>`; return; }

    const YEARLY_BUILDING_TARGET = 90000000;
    const cIdx = dashboardData.findIndex(d => d.id === current.id);
    const ytdData = dashboardData.slice(0, cIdx + 1);
    
    // ยอดขายสะสมปีนี้ (YTD) = ผลรวมยอดขายทุกเดือน (รวมทุก Week ของ GFS + MHL)
    const ytdActual = ytdData.reduce((sum, d) => sum + d.gfs.actual + d.mhl.actual, 0);
    
    // เป้ายอดขายปีนี้ 90 ล้าน
    const ytdProgressVsYearly = (ytdActual / YEARLY_BUILDING_TARGET) * 100;

    const weeklyActual = current.gfs.actual + current.mhl.actual;
    const weeklyTarget = current.gfs.target + current.mhl.target;
    const weeklyProgress = weeklyTarget > 0 ? (weeklyActual / weeklyTarget) * 100 : 0;

    const getWeeklyYtdSales = (key) => ytdData.reduce((sum, d) => sum + (d.buildingSales?.[key]?.sales || 0), 0);
    const getPreviousSheetYtd = (key) => [...ytdData]
        .slice(0, -1)
        .reverse()
        .find(d => (d.buildingSales?.[key]?.ytd || 0) > 0)
        ?.buildingSales?.[key]?.ytd || 0;
    // ใช้ YTD จาก Sheet โดยตรง (ถ้ามี), ถ้าไม่มี fallback เป็นผลรวมรายสัปดาห์
    const getYtd = (key) => {
        const sheetYtd = b[key]?.ytd || 0;
        const previousSheetYtd = getPreviousSheetYtd(key);
        const weeklySales = b[key]?.sales || 0;

        if (sheetYtd > 0 && sheetYtd >= previousSheetYtd) return sheetYtd;
        if (previousSheetYtd > 0) return previousSheetYtd + weeklySales;
        return getWeeklyYtdSales(key);
    };

    const reps = [
        { id: 'BOM', title: 'Sales Representative', data: { ...b.bom, ytd: getYtd('bom') }, c: 'blue', icon: 'briefcase-business', nameColor: '#075985' },
        { id: 'Jay', title: 'Sales Representative', data: { ...b.jay, ytd: getYtd('jay') }, c: 'blue', icon: 'megaphone', nameColor: '#1748ad' },
        { id: 'Saifha', title: 'Sales Representative', data: { ...b.saifha, ytd: getYtd('saifha') }, c: 'blue', icon: 'crown', nameColor: '#5b21b6' },
        { id: 'Kat', title: 'Sales Representative', data: { ...b.kat, ytd: b.kat?.ytd || 0 }, c: 'blue', icon: 'rocket', nameColor: '#0f4c5c' },
        { id: 'Image', title: 'Sales Representative', data: { ...b.image, ytd: getYtd('image') }, c: 'blue', icon: 'sparkles', nameColor: '#9d174d' }
    ].sort((a,b) => b.data.sales - a.data.sales); 
    
    const projects = [
        { id: 'YA', title: 'Sales Project', data: { ...b.projYa, ytd: getYtd('projYa') }, c: 'amber' },
        { id: 'Tung', title: 'Sales Project', data: { ...b.projTung, ytd: getYtd('projTung') }, c: 'amber' },
        { id: 'Tukta', title: 'Sales Project', data: { ...b.projTukta, ytd: getYtd('projTukta') }, c: 'amber' }
    ].sort((a,b) => b.data.sales - a.data.sales);

    const allSalesPeople = [...reps, ...projects];
    const topSalesPerson = allSalesPeople.filter(r => r.data.sales > 0).sort((a,b) => b.data.sales - a.data.sales)[0] || null;
    const topYtdSalesPerson = allSalesPeople.filter(r => r.data.ytd > 0).sort((a,b) => b.data.ytd - a.data.ytd)[0] || null;
    const weeklyChartPeople = [...allSalesPeople].sort((a, b) => b.data.sales - a.data.sales);
    const ytdChartPeople = [...allSalesPeople].sort((a, b) => b.data.ytd - a.data.ytd);
    const weeklyPeopleSales = weeklyChartPeople.reduce((sum, person) => sum + (person.data.sales || 0), 0);
    const weeklyShareColors = ['#2057e0', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#14b8a6'];

    container.innerHTML = `
        <div class="building-sales-dashboard">
        <div class="building-page-head">
            <div class="building-title-row">
                <button type="button" id="building-sidebar-toggle" class="building-sidebar-toggle" onclick="toggleDesktopSidebar()" aria-label="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}" title="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}">
                    <i id="building-sidebar-toggle-icon" data-lucide="${isDesktopSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'}" class="w-5 h-5"></i>
                </button>
                <div class="building-title-block">
                    <h2>ฝ่ายขาย ฟิล์มอาคาร</h2>
                    <p>สรุปประสิทธิภาพงานขายฟิล์มอาคารรายสัปดาห์</p>
                </div>
            </div>
            <div class="page-head-actions">
                <label class="building-week-select">
                    <i data-lucide="calendar-days" class="w-5 h-5"></i>
                    <select onchange="handleWeekChange(event)" aria-label="เลือกสัปดาห์">${opt}</select>
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </label>
                ${renderFullscreenButton()}
            </div>
        </div>
        <div class="building-sales-filter flex items-center gap-2 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0"><i data-lucide="filter" class="w-5 h-5 text-slate-400"></i><span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span><select onchange="handleWeekChange(event)" class="ml-auto bg-blue-50 border border-blue-200 text-blue-700 text-base rounded-xl p-2 w-72 cursor-pointer font-bold">${opt}</select></div>
        <h3 class="font-black text-slate-800 flex items-center gap-3 text-2xl uppercase tracking-tight leading-none mb-6 shrink-0"><i data-lucide="target" class="text-blue-500 w-7 h-7"></i>ยอดขายทีมอาคาร (Team Sales Performance))</h3>
        
        <div class="building-hero-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
            <!-- การ์ด 1: ยอดขายสัปดาห์นี้ = ยอดรวมแต่ละแผนก -->
            <div class="bg-blue-50 rounded-[2rem] p-6 border border-blue-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-10"><i data-lucide="wallet" class="w-32 h-32 text-blue-600"></i></div>
                <p class="text-sm font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5 relative z-10"><i data-lucide="wallet" class="w-5 h-5"></i> ยอดขายสัปดาห์นี้ (Weekly Sales)</p>
                <h3 class="text-4xl lg:text-5xl font-black text-blue-700 leading-none mt-2 mb-4 relative z-10">${formatBaht(b.totalRepSales + b.totalProjSales + b.totalAdminSales)}</h3>
                <div class="relative z-10 space-y-1.5 border-t border-blue-200/50 pt-3">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-500">👤 Sales Representative</span>
                        <span class="text-sm font-black text-blue-700">${formatBaht(b.totalRepSales)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-500">💼 Sales Project</span>
                        <span class="text-sm font-black text-blue-700">${formatBaht(b.totalProjSales)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-500">🖥️ Sales Admin</span>
                        <span class="text-sm font-black text-blue-700">${formatBaht(b.totalAdminSales)}</span>
                    </div>
                </div>
            </div>
            
            <!-- การ์ด 2: 🏆 Top Sales สัปดาห์นี้ -->
            <div class="building-top-sales-card building-top-sales-week bg-white rounded-[2rem] p-6 border border-amber-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <span class="building-winner-sticker building-winner-sticker-week">🏆 MVP WEEK</span>
                <div class="absolute -right-4 -bottom-4 opacity-5"><i data-lucide="trophy" class="w-32 h-32 text-amber-500"></i></div>
                <p class="text-sm font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="trophy" class="w-5 h-5"></i> Top Sales สัปดาห์นี้</p>
                <div class="flex items-center gap-4 mb-4 relative z-10">
                    <div class="building-winner-person building-winner-person-week rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><i data-lucide="trophy" class="building-winner-person-icon"></i></div>
                    <div>
                        <h4 class="building-winner-name text-2xl font-black text-slate-800">${topSalesPerson ? topSalesPerson.id : '-'}</h4>
                        <p class="text-sm text-slate-500 font-bold">${topSalesPerson ? topSalesPerson.title : ''}</p>
                    </div>
                </div>
                <div class="relative z-10 border-t border-amber-100 pt-3">
                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">ยอดขายสัปดาห์</p>
                    <p class="text-3xl font-black text-amber-600">${topSalesPerson ? formatBaht(topSalesPerson.data.sales) : '0 บ.'}</p>
                </div>
            </div>

            <!-- การ์ด 3: 🌟 Top Sales สะสม YTD -->
            <div class="building-top-sales-card building-top-sales-ytd bg-white rounded-[2rem] p-6 border border-indigo-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <span class="building-winner-sticker building-winner-sticker-ytd">👑 YTD ตัวตึง</span>
                <div class="absolute -right-4 -bottom-4 opacity-5"><i data-lucide="star" class="w-32 h-32 text-indigo-500"></i></div>
                <p class="text-sm font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="star" class="w-5 h-5"></i> Top Sales สะสม YTD</p>
                <div class="flex items-center gap-4 mb-4 relative z-10">
                    <div class="building-winner-person building-winner-person-ytd rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><i data-lucide="crown" class="building-winner-person-icon"></i></div>
                    <div>
                        <h4 class="building-winner-name text-2xl font-black text-slate-800">${topYtdSalesPerson ? topYtdSalesPerson.id : '-'}</h4>
                        <p class="text-sm text-slate-500 font-bold">${topYtdSalesPerson ? topYtdSalesPerson.title : ''}</p>
                    </div>
                </div>
                <div class="relative z-10 border-t border-indigo-100 pt-3">
                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">ยอดขายสะสม YTD</p>
                    <p class="text-3xl font-black text-indigo-600">${topYtdSalesPerson ? formatBaht(topYtdSalesPerson.data.ytd) : '0 บ.'}</p>
                </div>
            </div>
        </div>
        
        <h3 class="font-black text-slate-800 flex items-center gap-3 text-2xl uppercase tracking-tight leading-none mb-6 shrink-0"><i data-lucide="users" class="text-blue-500 w-7 h-7"></i>ฝ่ายขาย (Sales Representative)</h3>
        <div class="building-rep-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 shrink-0">
            ${reps.map((r, repIndex) => {
                const rate = Math.max(0, Math.min(Number(r.data.sr) || 0, 100));
                return `
            <div class="building-rep-card bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden"><span class="building-rep-rank">${String(repIndex + 1).padStart(2, '0')}</span><div class="absolute -right-4 -top-4 opacity-5"><i data-lucide="user" class="w-32 h-32 text-${r.c}-600"></i></div><div class="building-rep-header flex justify-between items-center mb-4 border-b border-slate-100 pb-4 relative z-10"><div class="building-rep-header-main flex items-center gap-3"><div class="building-rep-person w-12 h-12 rounded-full bg-${r.c}-100 text-${r.c}-600 flex items-center justify-center shrink-0"><i data-lucide="user-round" class="building-rep-person-icon"></i></div><div><h4 class="building-rep-name font-black text-slate-800 text-xl leading-none" style="color:${r.nameColor}!important">${r.id}</h4><p class="text-sm text-slate-500 font-bold">YTD: ${formatBaht(r.data.ytd)}</p></div></div><div class="building-rep-week text-right"><p class="text-sm text-slate-400 font-bold uppercase tracking-widest">ยอดขายสัปดาห์</p><p class="text-3xl font-black text-${r.c}-600">${formatBaht(r.data.sales)}</p></div></div>
            <div class="building-rep-metrics grid grid-cols-2 gap-3 mb-4 relative z-10"><div class="bg-slate-50 p-3 rounded-lg border border-slate-100"><p class="text-xs text-slate-500 font-bold mb-1"><i data-lucide="user-round"></i>พบลูกค้า</p><p class="text-lg font-black text-slate-800">${formatNumber(r.data.meets)} <span class="text-sm font-normal">ราย</span></p></div><div class="bg-slate-50 p-3 rounded-lg border border-slate-100"><p class="text-xs text-slate-500 font-bold mb-1"><i data-lucide="wrench"></i>ติดตั้ง</p><p class="text-lg font-black text-slate-800">${formatNumber(r.data.installs)} <span class="text-sm font-normal">งาน</span></p></div></div>
            <div class="space-y-3 mt-auto relative z-10"><div class="flex justify-between items-center text-sm p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-medium"><span>🆕 ลค.ใหม่ (พบ/ติด): ${r.data.newMeets}/${r.data.newInstalls}</span><span class="font-bold text-base">${formatCurrency(r.data.newSales)}</span></div><div class="flex justify-between items-center text-sm p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-medium"><span>🔙 ลค.เก่า (พบ/ติด): ${r.data.oldMeets}/${r.data.oldInstalls}</span><span class="font-bold text-base">${formatCurrency(r.data.oldSales)}</span></div><div class="flex justify-between items-center text-sm p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 font-medium cursor-pointer hover:bg-red-100 hover:border-red-300 transition-colors select-none" onclick="openNoInstallPopup('${r.id}')" title="คลิกเพื่อดูเหตุผลงานไม่ติดตั้ง"><span>❌ ไม่ติดตั้ง: ${r.data.noInstalls} งาน</span><span class="font-bold text-base flex items-center gap-1">${formatCurrency(r.data.noInstallSales)}<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></div></div>
            <div class="building-rep-rate relative z-10"><span class="building-rep-rate-label">% สำเร็จติดตั้ง/พบ</span><div class="building-rep-gauge"><svg viewBox="0 0 170 100" aria-hidden="true"><path class="building-rep-gauge-track" d="M15 85 A70 70 0 0 1 155 85" pathLength="100"></path><path class="building-rep-gauge-value" d="M15 85 A70 70 0 0 1 155 85" pathLength="100" style="stroke-dasharray:${rate} 100"></path></svg><strong>${r.data.sr.toFixed(1)}%</strong></div></div></div>`;
            }).join('')}
        </div>
        <h3 class="font-black text-slate-800 flex items-center gap-3 text-2xl uppercase tracking-tight leading-none mb-6 shrink-0"><i data-lucide="briefcase" class="text-amber-500 w-7 h-7"></i>ฝ่ายโครงการ (Sales Project)</h3>
        <div class="building-project-grid grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
            ${projects.map(r => {
                const mRatio = r.data.targetMeets > 0 ? (r.data.meets/r.data.targetMeets)*100 : 0;
                return `<div class="building-project-card bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden"><div class="absolute -right-4 -top-4 opacity-5"><i data-lucide="briefcase" class="w-32 h-32 text-${r.c}-600"></i></div><div class="building-project-header flex justify-between items-center mb-4 border-b border-slate-100 pb-4 relative z-10"><div class="building-project-header-main flex items-center gap-3"><div class="building-project-person w-12 h-12 rounded-full bg-${r.c}-100 text-${r.c}-600 flex items-center justify-center font-black text-lg"><i data-lucide="briefcase-business" class="building-project-person-icon"></i></div><div class="building-project-name-line"><h4 class="building-project-name font-black text-slate-800 text-xl leading-none">${r.id}</h4><p class="building-project-ytd" style="color:#8190a5!important;font-size:1rem!important;font-weight:600!important;line-height:1!important;margin-top:0!important">YTD: ${formatBaht(r.data.ytd)}</p></div></div><div class="building-project-week text-right"><p class="text-sm text-slate-400 font-bold uppercase tracking-widest">ยอดขายสัปดาห์</p><p class="text-3xl font-black text-${r.c}-600">${formatBaht(r.data.sales)}</p></div></div>
                <div class="building-project-main-stat grid grid-cols-2 gap-4 mb-4 relative z-10"><div class="building-project-stat-card building-project-install-card bg-slate-50 p-4 rounded-xl border border-slate-100 text-center"><p class="building-project-stat-label text-sm text-slate-500 font-bold mb-1 uppercase tracking-widest"><i data-lucide="wrench"></i>จำนวนติดตั้ง</p><p class="text-4xl font-black text-slate-800">${r.data.installs} <span class="text-base font-normal">งาน</span></p></div><div class="building-project-stat-card building-project-meet-card bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center"><p class="building-project-stat-label text-sm text-slate-500 font-bold mb-1 flex justify-between"><span><i data-lucide="users-round"></i>พบลูกค้า</span><span class="${mRatio>=100?'text-emerald-500':'text-red-500'}">${mRatio.toFixed(0)}%</span></p><p class="text-3xl font-black text-slate-800">${r.data.meets} <span class="text-base font-normal text-slate-500">/ ${r.data.targetMeets} ราย</span></p><div class="building-project-progress w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden"><div class="bg-amber-500 h-full" style="width:${Math.min(mRatio,100)}%"></div></div></div></div>
                <div class="building-project-customer-split flex gap-4 relative z-10 mt-auto"><div class="building-project-customer-card building-project-new flex-1 p-3 bg-blue-50 border border-blue-100 rounded-lg text-center"><div class="building-project-customer-icon"><i data-lucide="user-round-plus"></i></div><div><p class="text-sm font-bold text-blue-600 mb-1">ลค.ใหม่</p><p class="text-xl font-black text-slate-800">${r.data.newMeets} <span class="text-base font-normal">ราย</span></p></div></div><div class="building-project-customer-card building-project-old flex-1 p-3 bg-purple-50 border border-purple-100 rounded-lg text-center"><div class="building-project-customer-icon"><i data-lucide="user-round"></i></div><div><p class="text-sm font-bold text-purple-600 mb-1">ลค.เก่า</p><p class="text-xl font-black text-slate-800">${r.data.oldMeets} <span class="text-base font-normal">ราย</span></p></div></div></div></div>`;
            }).join('')}
        </div>
        <div class="building-weekly-breakdown-grid">
            <div class="building-weekly-sales-chart">
                <div class="building-weekly-panel-head">
                    <h3><i data-lucide="bar-chart-3"></i>ยอดขายรายบุคคล (YTD)</h3>
                    <span>YTD</span>
                </div>
                <div class="building-weekly-sales-chart-wrap"><canvas id="buildingWeeklySalesChartCanvas"></canvas></div>
            </div>
            <div class="building-weekly-analysis-card building-weekly-share-card">
                <div class="building-weekly-panel-head">
                    <h3><i data-lucide="pie-chart"></i>สัดส่วนยอดขาย Week นี้</h3>
                    <span>${current.week}</span>
                </div>
                <div class="building-weekly-share-chart-wrap"><canvas id="buildingWeeklySalesShareCanvas"></canvas></div>
            </div>
        </div>
        <div class="building-bottom-grid grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 shrink-0">
            <div class="building-trend-card lg:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col shrink-0">
                <div class="flex items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                    <div class="flex items-center gap-6 shrink-0">
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0"><i data-lucide="trending-up" class="w-5 h-5 text-blue-500 inline mr-2"></i> แนวโน้มยอดขายฟิล์มอาคาร (ทุก Week ปีนี้ )</h3>
                        <div class="flex gap-2 shrink-0">
                            <button onclick="changeBuildingTrendFilter('total')" class="px-4 py-1.5 rounded-full text-sm font-black transition-all ${buildingTrendFilter === 'total' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">รวมทั้งหมด</button>
                            <button onclick="changeBuildingTrendFilter('gfs')" class="px-4 py-1.5 rounded-full text-sm font-black transition-all ${buildingTrendFilter === 'gfs' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">GFS</button>
                            <button onclick="changeBuildingTrendFilter('mhl')" class="px-4 py-1.5 rounded-full text-sm font-black transition-all ${buildingTrendFilter === 'mhl' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">MHL</button>
                        </div>
                    </div>
                </div>
                <div class="flex-1 w-full min-h-[350px] relative"><canvas id="buildingTrendChartCanvas"></canvas></div>
            </div>
            
            <!-- Executive Insights Section (Redesigned) -->
            <div class="building-insight-card bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="lightbulb" class="w-64 h-64 text-blue-600"></i></div>
                <h3 class="font-black text-slate-800 flex items-center gap-2 text-xl uppercase tracking-tight mb-6 relative z-10">
                    <i data-lucide="lightbulb" class="text-amber-500 w-6 h-6"></i> วิเคราะห์ประสิทธิภาพ
                </h3>
                
                <div class="flex flex-col gap-4 relative z-10 mb-6 flex-1">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">สำเร็จเทียบเป้าสัปดาห์</p>
                            <p class="text-xl font-black ${weeklyProgress >= 100 ? 'text-emerald-600' : 'text-slate-700'}">${formatPercent(weeklyProgress)}</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${weeklyProgress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'} flex items-center justify-center shrink-0"><i data-lucide="target" class="w-6 h-6"></i></div>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">🏆 Top Sales สัปดาห์นี้</p>
                            <p class="text-xl font-black text-blue-600">${topSalesPerson ? topSalesPerson.id : '-'}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-black text-slate-800">${topSalesPerson ? formatBaht(topSalesPerson.data.sales) : '0 บ.'}</p>
                        </div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">🌟 Top Sales สะสม YTD</p>
                            <p class="text-xl font-black text-indigo-600">${topYtdSalesPerson ? topYtdSalesPerson.id : '-'}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-black text-slate-800">${topYtdSalesPerson ? formatBaht(topYtdSalesPerson.data.ytd) : '0 บ.'}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-auto p-5 ${weeklyProgress >= 100 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} rounded-2xl border text-sm leading-relaxed text-slate-800 font-medium relative z-10 flex flex-col justify-center">
                    <b class="${weeklyProgress >= 100 ? 'text-emerald-600' : 'text-blue-600'} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์:</b> 
                    ${weeklyProgress >= 100 
                        ? 'ยอดขายสัปดาห์นี้ทำได้ทะลุเป้าหมายที่ตั้งไว้ ยอดเยี่ยมมาก! ⭐' 
                        : `ยอดขายรวมสัปดาห์นี้ยังต่ำกว่าเป้าหมาย <b class="text-red-600">${formatBaht(weeklyTarget - weeklyActual)}</b>`}
                </div>
            </div>
        </div>

        <!-- กราฟรายบุคคล (รายเดือน/รายสัปดาห์) -->
        <div class="building-rep-chart bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col shrink-0 mb-8">
            <div class="flex items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                <div class="flex items-center gap-6 shrink-0">
                    <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0"><i data-lucide="line-chart" class="w-5 h-5 text-indigo-500 inline mr-2"></i> ${repChartTimeframe === 'monthly' ? 'เปรียบเทียบยอดขายรายบุคคล (รายเดือน)' : 'เปรียบเทียบยอดขายรายบุคคล (12 สัปดาห์ล่าสุด)'}</h3>
                </div>
                <div class="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0 ml-auto">
                    <button onclick="changeRepChartTimeframe('monthly')" class="px-4 py-2 rounded-lg text-sm font-black transition-all ${repChartTimeframe === 'monthly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}">รายเดือน (ปีนี้)</button>
                    <button onclick="changeRepChartTimeframe('weekly')" class="px-4 py-2 rounded-lg text-sm font-black transition-all ${repChartTimeframe === 'weekly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}">รายสัปดาห์ (12 สัปดาห์)</button>
                </div>
            </div>
            <div class="flex-1 w-full min-h-[400px] relative"><canvas id="repTrendChartCanvas"></canvas></div>
        </div>
        </div>
    `;
    setTimeout(() => {
        const ctx = document.getElementById('buildingTrendChartCanvas')?.getContext('2d');
        if(!ctx) return;
        if (charts['buildingTrend']) charts['buildingTrend'].destroy();
        
        let recentData = [];
        let dLabelAct = '', dLabelTar = '', dAct = [], dTar = [], cBg = '', cLine = '';

        if (buildingTrendFilter === 'total') {
            recentData = dashboardData.filter(d => (d.gfs.actual + d.mhl.actual) > 0);
            dLabelAct = 'ยอดขายรวม (GFS+MHL)'; dLabelTar = 'เป้าหมายรวม';
            dAct = recentData.map(d => d.gfs.actual + d.mhl.actual);
            dTar = recentData.map(d => d.gfs.target + d.mhl.target);
            cBg = '#2057e0'; cLine = '#cbd5e1';
        } else if (buildingTrendFilter === 'gfs') {
            recentData = dashboardData.filter(d => d.gfs.actual > 0);
            dLabelAct = 'ยอดขายจริง GFS'; dLabelTar = 'เป้าหมาย GFS';
            dAct = recentData.map(d => d.gfs.actual);
            dTar = recentData.map(d => d.gfs.target);
            cBg = '#2057e0'; cLine = '#93c5fd';
        } else if (buildingTrendFilter === 'mhl') {
            recentData = dashboardData.filter(d => d.mhl.actual > 0);
            dLabelAct = 'ยอดขายจริง MHL'; dLabelTar = 'เป้าหมาย MHL';
            dAct = recentData.map(d => d.mhl.actual);
            dTar = recentData.map(d => d.mhl.target);
            cBg = '#f59e0b'; cLine = '#fcd34d'; 
        }

        charts['buildingTrend'] = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels: recentData.map(d => d.week), 
                datasets: [
                    { type: 'bar', label: dLabelAct, data: dAct, backgroundColor: cBg, borderRadius: 4, order: 2, barPercentage: 0.6 }, 
                    { type: 'line', label: dLabelTar, data: dTar, borderColor: cLine, backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: cLine, tension: 0.1, order: 1 }
                ] 
            },
            options: { 
                layout: { padding: { top: 30 } },
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } },
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatBaht(c.parsed.y)}` } }
                },
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } },
                    y: { 
                        type: 'linear', display: true, position: 'left',
                        beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, 
                        ticks: { font: { weight: 'bold' }, callback: (v) => v >= 1000000 ? (v/1000000)+'M' : (v>=1000?(v/1000)+'k':v) } 
                    }
                }
            },
            plugins: [createProgressPlugin(false)]
        });

        const weeklySalesCtx = document.getElementById('buildingWeeklySalesChartCanvas')?.getContext('2d');
        if (weeklySalesCtx) {
            if (charts['buildingWeeklySales']) charts['buildingWeeklySales'].destroy();

            const weeklyBarValueLabels = {
                id: 'buildingWeeklyBarValueLabels',
                afterDatasetsDraw: (chart) => {
                    const meta = chart.getDatasetMeta(0);
                    const values = chart.data.datasets[0].data;
                    const maxValue = Math.max(...values);
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.fillStyle = '#17345f';
                    ctx.font = '800 13px Sarabun';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    meta.data.forEach((bar, index) => {
                        ctx.fillText(formatCurrency(values[index]), bar.x, Math.max(bar.y - 8, 16));
                        if (values[index] > 0 && values[index] === maxValue) {
                            ctx.font = '18px "Segoe UI Emoji", sans-serif';
                            ctx.fillText('🏆', bar.x, Math.max(bar.y - 27, 16));
                            ctx.font = '800 13px Sarabun';
                        }
                    });
                    ctx.restore();
                }
            };

            charts['buildingWeeklySales'] = new Chart(weeklySalesCtx, {
                type: 'bar',
                data: {
                    labels: ytdChartPeople.map(person => person.id),
                    datasets: [{
                        label: 'ยอดขายสะสม YTD',
                        data: ytdChartPeople.map(person => person.data.ytd || 0),
                        backgroundColor: ytdChartPeople.map(person => person.title === 'Sales Project' ? '#f59e0b' : '#2057e0'),
                        borderColor: ytdChartPeople.map(person => person.title === 'Sales Project' ? '#c66a00' : '#1748ad'),
                        borderWidth: 1,
                        borderRadius: 8,
                        maxBarThickness: 58
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 28, left: 6, right: 8, bottom: 0 } },
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => `ยอดขาย YTD: ${formatBaht(c.parsed.y)}` } }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { family: 'Sarabun', weight: '800', size: 14 }, color: '#17345f' } },
                        y: {
                            beginAtZero: true,
                            grace: '18%',
                            grid: { color: '#e8eef7', drawBorder: false },
                            ticks: { font: { family: 'Sarabun', weight: '700' }, callback: (v) => v >= 1000000 ? `${v / 1000000}M` : (v >= 1000 ? `${v / 1000}k` : v) }
                        }
                    }
                },
                plugins: [weeklyBarValueLabels]
            });
        }

        const weeklyShareCtx = document.getElementById('buildingWeeklySalesShareCanvas')?.getContext('2d');
        if (weeklyShareCtx) {
            if (charts['buildingWeeklySalesShare']) charts['buildingWeeklySalesShare'].destroy();
            const sharePeople = weeklyChartPeople.filter(person => person.data.sales > 0);

            if (sharePeople.length > 0) {
                const weeklyPieLabels = {
                    id: 'buildingWeeklyPieLabels',
                    afterDraw: (chart) => {
                        const meta = chart.getDatasetMeta(0);
                        const values = chart.data.datasets[0].data;
                        const total = values.reduce((sum, value) => sum + value, 0);
                        const ctx = chart.ctx;

                        const chartArea = chart.chartArea;
                        const labelGap = 38;
                        const labelTop = chartArea.top + 22;
                        const labelBottom = chartArea.bottom - 22;
                        const labelItems = meta.data.map((arc, index) => {
                            const angle = (arc.startAngle + arc.endAngle) / 2;
                            const directionX = Math.cos(angle);
                            const directionY = Math.sin(angle);
                            const isRight = directionX >= 0;
                            const share = total > 0 ? (values[index] / total) * 100 : 0;
                            return {
                                arc,
                                index,
                                angle,
                                directionX,
                                directionY,
                                isRight,
                                desiredY: arc.y + directionY * (arc.outerRadius + 24),
                                share,
                                label: chart.data.labels[index],
                                color: chart.data.datasets[0].backgroundColor[index]
                            };
                        });

                        const placeLabels = (items) => {
                            items.sort((a, b) => a.desiredY - b.desiredY);
                            items.forEach((item, itemIndex) => {
                                item.labelY = itemIndex === 0
                                    ? Math.max(item.desiredY, labelTop)
                                    : Math.max(item.desiredY, items[itemIndex - 1].labelY + labelGap);
                            });
                            if (items.length && items[items.length - 1].labelY > labelBottom) {
                                items[items.length - 1].labelY = labelBottom;
                                for (let itemIndex = items.length - 2; itemIndex >= 0; itemIndex -= 1) {
                                    items[itemIndex].labelY = Math.min(items[itemIndex].labelY, items[itemIndex + 1].labelY - labelGap);
                                }
                            }
                            if (items.length && items[0].labelY < labelTop) {
                                const shift = labelTop - items[0].labelY;
                                items.forEach(item => { item.labelY += shift; });
                            }
                        };

                        placeLabels(labelItems.filter(item => !item.isRight));
                        placeLabels(labelItems.filter(item => item.isRight));

                        ctx.save();
                        ctx.lineWidth = 1.4;
                        labelItems.forEach(item => {
                            const { arc, index, angle, directionX, directionY, isRight, labelY, share, label, color } = item;
                            const startX = arc.x + directionX * (arc.outerRadius - 1);
                            const startY = arc.y + directionY * (arc.outerRadius - 1);
                            const labelX = isRight
                                ? Math.min(chart.width - 8, arc.x + arc.outerRadius + 42)
                                : Math.max(8, arc.x - arc.outerRadius - 42);
                            const lineEndX = labelX + (isRight ? -6 : 6);

                            ctx.strokeStyle = color;
                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(lineEndX, labelY);
                            ctx.stroke();

                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(startX + directionX * 7 + directionY * 4, startY + directionY * 7 - directionX * 4);
                            ctx.lineTo(startX + directionX * 7 - directionY * 4, startY + directionY * 7 + directionX * 4);
                            ctx.closePath();
                            ctx.fill();

                            ctx.textAlign = isRight ? 'left' : 'right';
                            ctx.fillStyle = '#17345f';
                            ctx.font = '800 11px Sarabun';
                            ctx.fillText(label, labelX, labelY - 2);
                            ctx.fillStyle = '#52627f';
                            ctx.font = '700 10px Sarabun';
                            ctx.fillText(`${formatCurrency(values[index])} · ${share.toFixed(1)}%`, labelX, labelY + 11);
                        });
                        ctx.restore();
                    }
                };

                charts['buildingWeeklySalesShare'] = new Chart(weeklyShareCtx, {
                    type: 'pie',
                    data: {
                        labels: sharePeople.map(person => person.id),
                        datasets: [{
                            data: sharePeople.map(person => person.data.sales),
                            backgroundColor: sharePeople.map(person => weeklyShareColors[weeklyChartPeople.indexOf(person)]),
                            borderColor: '#ffffff',
                            borderWidth: 3,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 32, right: 58, bottom: 16, left: 58 } },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (c) => {
                                        const total = c.dataset.data.reduce((sum, value) => sum + value, 0);
                                        const share = total > 0 ? (c.parsed / total) * 100 : 0;
                                        return `${c.label}: ${formatBaht(c.parsed)} (${share.toFixed(1)}%)`;
                                    }
                                }
                            }
                        }
                    },
                    plugins: [weeklyPieLabels]
                });
            }
        }

        const repCtx = document.getElementById('repTrendChartCanvas')?.getContext('2d');
        if(repCtx) {
            if (charts['repTrend']) charts['repTrend'].destroy();
            
            let repLabels = [];
            let repDataList = [];

            if (repChartTimeframe === 'monthly') {
                const monthlyRepDataMap = {};
                const monthsOrderRep = [];

                dashboardData.forEach(d => {
                    const monthGroup = extractMonthGroup(d.dateRange);
                    if (!monthlyRepDataMap[monthGroup]) {
                        monthlyRepDataMap[monthGroup] = { label: monthGroup, bom: 0, jay: 0, saifha: 0, kat: 0, image: 0, projYa: 0, projTung: 0 };
                        monthsOrderRep.push(monthGroup);
                    }
                    if (d.buildingSales) {
                        monthlyRepDataMap[monthGroup].bom += d.buildingSales.bom.sales || 0;
                        monthlyRepDataMap[monthGroup].jay += d.buildingSales.jay.sales || 0;
                        monthlyRepDataMap[monthGroup].saifha += d.buildingSales.saifha.sales || 0;
                        monthlyRepDataMap[monthGroup].kat += d.buildingSales.kat.sales || 0;
                        monthlyRepDataMap[monthGroup].image += d.buildingSales.image.sales || 0;
                        monthlyRepDataMap[monthGroup].projYa += d.buildingSales.projYa.sales || 0;
                        monthlyRepDataMap[monthGroup].projTung += d.buildingSales.projTung.sales || 0;
                    }
                });

                repDataList = monthsOrderRep.map(m => monthlyRepDataMap[m]).filter(d => (d.bom + d.jay + d.saifha + d.kat + d.image + d.projYa + d.projTung) > 0);
                repLabels = repDataList.map(d => d.label);
            } else {
                repDataList = dashboardData.map(d => {
                    return {
                        label: d.week,
                        bom: d.buildingSales?.bom?.sales || 0,
                        jay: d.buildingSales?.jay?.sales || 0,
                        saifha: d.buildingSales?.saifha?.sales || 0,
                        kat: d.buildingSales?.kat?.sales || 0,
                        image: d.buildingSales?.image?.sales || 0,
                        projYa: d.buildingSales?.projYa?.sales || 0,
                        projTung: d.buildingSales?.projTung?.sales || 0
                    };
                }).filter(d => (d.bom + d.jay + d.saifha + d.kat + d.image + d.projYa + d.projTung) > 0).slice(-12);
                repLabels = repDataList.map(d => d.label);
            }

            const dsConfigs = [
                { label: 'BOM', key: 'bom', color: '#2057e0' },
                { label: 'Jay', key: 'jay', color: '#10b981' },
                { label: 'Saifha', key: 'saifha', color: '#f59e0b' },
                { label: 'Kat', key: 'kat', color: '#8b5cf6' },
                { label: 'Image', key: 'image', color: '#ec4899' },
                { label: 'Proj YA', key: 'projYa', color: '#f97316', dash: [5,5] },
                { label: 'Proj Tung', key: 'projTung', color: '#eab308', dash: [5,5] }
            ];

            const repDatasets = dsConfigs.map(conf => ({
                type: 'line',
                label: conf.label,
                data: repDataList.map(d => d[conf.key]),
                borderColor: conf.color,
                backgroundColor: conf.color,
                borderWidth: 2,
                borderDash: conf.dash || [],
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }));

            charts['repTrend'] = new Chart(repCtx, {
                type: 'line',
                data: {
                    labels: repLabels,
                    datasets: repDatasets
                },
                options: {
                    layout: { padding: { top: 10 } },
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } },
                        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatBaht(c.parsed.y)}` } }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } },
                        y: { 
                            beginAtZero: true, grace: '10%', grid: { color: '#f1f5f9', drawBorder: false }, 
                            ticks: { font: { weight: 'bold' }, callback: (v) => v >= 1000000 ? (v/1000000)+'M' : (v>=1000?(v/1000)+'k':v) } 
                        }
                    }
                }
            });
        }
    }, 50);
}

// ==========================================
// RENDER: CAR DEEP DIVE (Redesigned - Modern & Clean Layout)
// ==========================================
