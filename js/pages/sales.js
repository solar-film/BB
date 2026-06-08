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
        { id: 'BOM', title: 'Sales Representative', data: { ...b.bom, ytd: getYtd('bom') }, c: 'blue' },
        { id: 'Jay', title: 'Sales Representative', data: { ...b.jay, ytd: getYtd('jay') }, c: 'blue' },
        { id: 'Saifha', title: 'Sales Representative', data: { ...b.saifha, ytd: getYtd('saifha') }, c: 'blue' },
        { id: 'Kat', title: 'Sales Representative', data: { ...b.pat, ytd: getYtd('pat') }, c: 'blue' },
        { id: 'Image', title: 'Sales Representative', data: { ...b.image, ytd: getYtd('image') }, c: 'blue' }
    ].sort((a,b) => b.data.sales - a.data.sales); 
    
    const projects = [
        { id: 'YA', title: 'Sales Project', data: { ...b.projYa, ytd: getYtd('projYa') }, c: 'amber' },
        { id: 'Tung', title: 'Sales Project', data: { ...b.projTung, ytd: getYtd('projTung') }, c: 'amber' },
        { id: 'Tukta', title: 'Sales Project', data: { ...b.projTukta, ytd: getYtd('projTukta') }, c: 'amber' }
    ].sort((a,b) => b.data.sales - a.data.sales);

    const allSalesPeople = [...reps, ...projects];
    const topSalesPerson = allSalesPeople.filter(r => r.data.sales > 0).sort((a,b) => b.data.sales - a.data.sales)[0] || null;
    const topYtdSalesPerson = allSalesPeople.filter(r => r.data.ytd > 0).sort((a,b) => b.data.ytd - a.data.ytd)[0] || null;

    container.innerHTML = `
        <div class="flex items-center gap-2 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0"><i data-lucide="filter" class="w-5 h-5 text-slate-400"></i><span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span><select onchange="handleWeekChange(event)" class="ml-auto bg-blue-50 border border-blue-200 text-blue-700 text-base rounded-xl p-2 w-72 cursor-pointer font-bold">${opt}</select></div>
        <h3 class="font-black text-slate-800 flex items-center gap-3 text-2xl uppercase tracking-tight leading-none mb-6 shrink-0"><i data-lucide="target" class="text-blue-500 w-7 h-7"></i>ยอดขายทีมอาคาร (Team Sales Performance))</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
            <!-- การ์ด 1: ยอดขายสัปดาห์นี้ = ยอดรวมแต่ละแผนก -->
            <div class="bg-blue-50 rounded-[2rem] p-6 border border-blue-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-10"><i data-lucide="wallet" class="w-32 h-32 text-blue-600"></i></div>
                <p class="text-sm font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5 relative z-10"><i data-lucide="wallet" class="w-5 h-5"></i> ยอดขายสัปดาห์นี้ (Weekly Sales)</p>
                <h3 class="text-4xl lg:text-5xl font-black text-blue-700 leading-none mt-2 mb-4 relative z-10">฿${formatCurrency(b.totalRepSales + b.totalProjSales + b.totalAdminSales)}</h3>
                <div class="relative z-10 space-y-1.5 border-t border-blue-200/50 pt-3">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-500">👤 Sales Representative</span>
                        <span class="text-sm font-black text-blue-700">฿${formatCurrency(b.totalRepSales)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-500">💼 Sales Project</span>
                        <span class="text-sm font-black text-blue-700">฿${formatCurrency(b.totalProjSales)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-500">🖥️ Sales Admin</span>
                        <span class="text-sm font-black text-blue-700">฿${formatCurrency(b.totalAdminSales)}</span>
                    </div>
                </div>
            </div>
            
            <!-- การ์ด 2: 🏆 Top Sales สัปดาห์นี้ -->
            <div class="bg-white rounded-[2rem] p-6 border border-amber-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5"><i data-lucide="trophy" class="w-32 h-32 text-amber-500"></i></div>
                <p class="text-sm font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="trophy" class="w-5 h-5"></i> Top Sales สัปดาห์นี้</p>
                <div class="flex items-center gap-4 mb-4 relative z-10">
                    <div class="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xl shrink-0">${topSalesPerson ? topSalesPerson.id.substring(0,2).toUpperCase() : '-'}</div>
                    <div>
                        <h4 class="text-2xl font-black text-slate-800">${topSalesPerson ? topSalesPerson.id : '-'}</h4>
                        <p class="text-sm text-slate-500 font-bold">${topSalesPerson ? topSalesPerson.title : ''}</p>
                    </div>
                </div>
                <div class="relative z-10 border-t border-amber-100 pt-3">
                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">ยอดขายสัปดาห์</p>
                    <p class="text-3xl font-black text-amber-600">฿${topSalesPerson ? formatCurrency(topSalesPerson.data.sales) : '0'}</p>
                </div>
            </div>

            <!-- การ์ด 3: 🌟 Top Sales สะสม YTD -->
            <div class="bg-white rounded-[2rem] p-6 border border-indigo-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5"><i data-lucide="star" class="w-32 h-32 text-indigo-500"></i></div>
                <p class="text-sm font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="star" class="w-5 h-5"></i> Top Sales สะสม YTD</p>
                <div class="flex items-center gap-4 mb-4 relative z-10">
                    <div class="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl shrink-0">${topYtdSalesPerson ? topYtdSalesPerson.id.substring(0,2).toUpperCase() : '-'}</div>
                    <div>
                        <h4 class="text-2xl font-black text-slate-800">${topYtdSalesPerson ? topYtdSalesPerson.id : '-'}</h4>
                        <p class="text-sm text-slate-500 font-bold">${topYtdSalesPerson ? topYtdSalesPerson.title : ''}</p>
                    </div>
                </div>
                <div class="relative z-10 border-t border-indigo-100 pt-3">
                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">ยอดขายสะสม YTD</p>
                    <p class="text-3xl font-black text-indigo-600">฿${topYtdSalesPerson ? formatCurrency(topYtdSalesPerson.data.ytd) : '0'}</p>
                </div>
            </div>
        </div>
        
        <h3 class="font-black text-slate-800 flex items-center gap-3 text-2xl uppercase tracking-tight leading-none mb-6 shrink-0"><i data-lucide="users" class="text-blue-500 w-7 h-7"></i>ฝ่ายขาย (Sales Representative)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 shrink-0">
            ${reps.map(r => `
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden"><div class="absolute -right-4 -top-4 opacity-5"><i data-lucide="user" class="w-32 h-32 text-${r.c}-600"></i></div><div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4 relative z-10"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full bg-${r.c}-100 text-${r.c}-600 flex items-center justify-center font-black text-lg">${r.id.substring(0,2).toUpperCase()}</div><div><h4 class="font-black text-slate-800 text-xl leading-none">${r.id}</h4><p class="text-sm text-slate-500 font-bold">YTD: ฿${formatCurrency(r.data.ytd)}</p></div></div><div class="text-right"><p class="text-sm text-slate-400 font-bold uppercase tracking-widest">ยอดขายสัปดาห์</p><p class="text-3xl font-black text-${r.c}-600">฿${formatCurrency(r.data.sales)}</p></div></div>
            <div class="grid grid-cols-2 gap-3 mb-4 relative z-10"><div class="bg-slate-50 p-3 rounded-lg border border-slate-100"><p class="text-xs text-slate-500 font-bold mb-1">🏃 พบลูกค้า</p><p class="text-lg font-black text-slate-800">${formatNumber(r.data.meets)} <span class="text-sm font-normal">ราย</span></p></div><div class="bg-slate-50 p-3 rounded-lg border border-slate-100"><p class="text-xs text-slate-500 font-bold mb-1">🛠️ ติดตั้ง</p><p class="text-lg font-black text-slate-800">${formatNumber(r.data.installs)} <span class="text-sm font-normal">งาน</span></p></div></div>
            <div class="space-y-3 mt-auto relative z-10"><div class="flex justify-between items-center text-sm p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-medium"><span>🆕 ลค.ใหม่ (พบ/ติด): ${r.data.newMeets}/${r.data.newInstalls}</span><span class="font-bold text-base">฿${formatCurrency(r.data.newSales)}</span></div><div class="flex justify-between items-center text-sm p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-medium"><span>🔙 ลค.เก่า (พบ/ติด): ${r.data.oldMeets}/${r.data.oldInstalls}</span><span class="font-bold text-base">฿${formatCurrency(r.data.oldSales)}</span></div><div class="flex justify-between items-center text-sm p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 font-medium cursor-pointer hover:bg-red-100 hover:border-red-300 transition-colors select-none" onclick="openNoInstallPopup('${r.id}')" title="คลิกเพื่อดูเหตุผลงานไม่ติดตั้ง"><span>❌ ไม่ติดตั้ง: ${r.data.noInstalls} งาน</span><span class="font-bold text-base flex items-center gap-1">฿${formatCurrency(r.data.noInstallSales)}<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></div></div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center"><span class="text-sm font-bold text-slate-500 uppercase">% สำเร็จติดตั้ง/พบ</span><span class="text-base font-black text-blue-600">${r.data.sr.toFixed(1)}%</span></div></div>`).join('')}
        </div>
        <h3 class="font-black text-slate-800 flex items-center gap-3 text-2xl uppercase tracking-tight leading-none mb-6 shrink-0"><i data-lucide="briefcase" class="text-amber-500 w-7 h-7"></i>ฝ่ายโครงการ (Sales Project)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
            ${projects.map(r => {
                const mRatio = r.data.targetMeets > 0 ? (r.data.meets/r.data.targetMeets)*100 : 0;
                return `<div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden"><div class="absolute -right-4 -top-4 opacity-5"><i data-lucide="briefcase" class="w-32 h-32 text-${r.c}-600"></i></div><div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4 relative z-10"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full bg-${r.c}-100 text-${r.c}-600 flex items-center justify-center font-black text-lg">${r.id}</div><div><h4 class="font-black text-slate-800 text-xl leading-none">${r.id}</h4><p class="text-sm text-slate-500 font-bold">YTD: ฿${formatCurrency(r.data.ytd)}</p></div></div><div class="text-right"><p class="text-sm text-slate-400 font-bold uppercase tracking-widest">ยอดขายสัปดาห์</p><p class="text-3xl font-black text-${r.c}-600">฿${formatCurrency(r.data.sales)}</p></div></div>
                <div class="grid grid-cols-2 gap-4 mb-4 relative z-10"><div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center"><p class="text-sm text-slate-500 font-bold mb-1 uppercase tracking-widest">จำนวนติดตั้ง</p><p class="text-4xl font-black text-slate-800">${r.data.installs} <span class="text-base font-normal">งาน</span></p></div><div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center"><p class="text-sm text-slate-500 font-bold mb-1 flex justify-between"><span>พบลูกค้า</span><span class="${mRatio>=100?'text-emerald-500':'text-red-500'}">${mRatio.toFixed(0)}%</span></p><p class="text-3xl font-black text-slate-800">${r.data.meets} <span class="text-base font-normal text-slate-500">/ ${r.data.targetMeets} ราย</span></p><div class="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden"><div class="bg-amber-500 h-full" style="width:${Math.min(mRatio,100)}%"></div></div></div></div>
                <div class="flex gap-4 relative z-10 mt-auto"><div class="flex-1 p-3 bg-blue-50 border border-blue-100 rounded-lg text-center"><p class="text-sm font-bold text-blue-600 mb-1">ลค.ใหม่</p><p class="text-xl font-black text-slate-800">${r.data.newMeets} <span class="text-base font-normal">ราย</span></p></div><div class="flex-1 p-3 bg-purple-50 border border-purple-100 rounded-lg text-center"><p class="text-sm font-bold text-purple-600 mb-1">ลค.เก่า</p><p class="text-xl font-black text-slate-800">${r.data.oldMeets} <span class="text-base font-normal">ราย</span></p></div></div></div>`;
            }).join('')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 shrink-0">
            <div class="lg:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col shrink-0">
                <div class="flex items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                    <div class="flex items-center gap-6 shrink-0">
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0"><i data-lucide="trending-up" class="w-5 h-5 text-blue-500 inline mr-2"></i> แนวโน้มยอดขายฟิล์มอาคาร (12 สัปดาห์)</h3>
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
            <div class="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
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
                            <p class="text-lg font-black text-slate-800">฿${topSalesPerson ? formatCurrency(topSalesPerson.data.sales) : '0'}</p>
                        </div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">🌟 Top Sales สะสม YTD</p>
                            <p class="text-xl font-black text-indigo-600">${topYtdSalesPerson ? topYtdSalesPerson.id : '-'}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-black text-slate-800">฿${topYtdSalesPerson ? formatCurrency(topYtdSalesPerson.data.ytd) : '0'}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-auto p-5 ${weeklyProgress >= 100 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} rounded-2xl border text-sm leading-relaxed text-slate-800 font-medium relative z-10 flex flex-col justify-center">
                    <b class="${weeklyProgress >= 100 ? 'text-emerald-600' : 'text-blue-600'} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์:</b> 
                    ${weeklyProgress >= 100 
                        ? 'ยอดขายสัปดาห์นี้ทำได้ทะลุเป้าหมายที่ตั้งไว้ ยอดเยี่ยมมาก! ⭐' 
                        : `ยอดขายรวมสัปดาห์นี้ยังต่ำกว่าเป้าหมาย <b class="text-red-600">฿${formatCurrency(weeklyTarget - weeklyActual)}</b>`}
                </div>
            </div>
        </div>

        <!-- กราฟรายบุคคล (รายเดือน/รายสัปดาห์) -->
        <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col shrink-0 mb-8">
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
    `;
    setTimeout(() => {
        const ctx = document.getElementById('buildingTrendChartCanvas')?.getContext('2d');
        if(!ctx) return;
        if (charts['buildingTrend']) charts['buildingTrend'].destroy();
        
        let recentData = [];
        let dLabelAct = '', dLabelTar = '', dAct = [], dTar = [], cBg = '', cLine = '';

        if (buildingTrendFilter === 'total') {
            recentData = dashboardData.filter(d => (d.gfs.actual + d.mhl.actual) > 0).slice(-12);
            dLabelAct = 'ยอดขายรวม (GFS+MHL)'; dLabelTar = 'เป้าหมายรวม';
            dAct = recentData.map(d => d.gfs.actual + d.mhl.actual);
            dTar = recentData.map(d => d.gfs.target + d.mhl.target);
            cBg = '#3b82f6'; cLine = '#cbd5e1'; 
        } else if (buildingTrendFilter === 'gfs') {
            recentData = dashboardData.filter(d => d.gfs.actual > 0).slice(-12);
            dLabelAct = 'ยอดขายจริง GFS'; dLabelTar = 'เป้าหมาย GFS';
            dAct = recentData.map(d => d.gfs.actual);
            dTar = recentData.map(d => d.gfs.target);
            cBg = '#3b82f6'; cLine = '#93c5fd'; 
        } else if (buildingTrendFilter === 'mhl') {
            recentData = dashboardData.filter(d => d.mhl.actual > 0).slice(-12);
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
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)} ฿` } }
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
                        monthlyRepDataMap[monthGroup] = { label: monthGroup, bom: 0, jay: 0, saifha: 0, pat: 0, image: 0, projYa: 0, projTung: 0 };
                        monthsOrderRep.push(monthGroup);
                    }
                    if (d.buildingSales) {
                        monthlyRepDataMap[monthGroup].bom += d.buildingSales.bom.sales || 0;
                        monthlyRepDataMap[monthGroup].jay += d.buildingSales.jay.sales || 0;
                        monthlyRepDataMap[monthGroup].saifha += d.buildingSales.saifha.sales || 0;
                        monthlyRepDataMap[monthGroup].pat += d.buildingSales.pat.sales || 0;
                        monthlyRepDataMap[monthGroup].image += d.buildingSales.image.sales || 0;
                        monthlyRepDataMap[monthGroup].projYa += d.buildingSales.projYa.sales || 0;
                        monthlyRepDataMap[monthGroup].projTung += d.buildingSales.projTung.sales || 0;
                    }
                });

                repDataList = monthsOrderRep.map(m => monthlyRepDataMap[m]).filter(d => (d.bom + d.jay + d.saifha + d.pat + d.image + d.projYa + d.projTung) > 0);
                repLabels = repDataList.map(d => d.label);
            } else {
                repDataList = dashboardData.map(d => {
                    return {
                        label: d.week,
                        bom: d.buildingSales?.bom?.sales || 0,
                        jay: d.buildingSales?.jay?.sales || 0,
                        saifha: d.buildingSales?.saifha?.sales || 0,
                        pat: d.buildingSales?.pat?.sales || 0,
                        image: d.buildingSales?.image?.sales || 0,
                        projYa: d.buildingSales?.projYa?.sales || 0,
                        projTung: d.buildingSales?.projTung?.sales || 0
                    };
                }).filter(d => (d.bom + d.jay + d.saifha + d.pat + d.image + d.projYa + d.projTung) > 0).slice(-12);
                repLabels = repDataList.map(d => d.label);
            }

            const dsConfigs = [
                { label: 'BOM', key: 'bom', color: '#3b82f6' },
                { label: 'Jay', key: 'jay', color: '#10b981' },
                { label: 'Saifha', key: 'saifha', color: '#f59e0b' },
                { label: 'Kat', key: 'pat', color: '#8b5cf6' },
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
                        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ฿${formatCurrency(c.parsed.y)}` } }
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
