// Render: Marketing online page.
function renderMarketingDeepDiveHTML(current, m, opt, container) {
    const tBud = current.marketing.gfs.target + current.marketing.mhl.target + current.marketing.car.target;
    const tSpend = current.marketing.gfs.actual + current.marketing.mhl.actual + current.marketing.car.actual;
    const tCont = current.admin.contacts.total + (current.carDetail ? current.carDetail.contacts.total : 0);
    const tLeads = current.admin.leads.actual + (current.admin.leads.car || 0);
    const tSales = current.gfs.actual + current.mhl.actual + current.car.actual;
    
    const costCont = tCont > 0 ? (tSpend / tCont) : 0;
    const costLead = tLeads > 0 ? (tSpend / tLeads) : 0;
    const totalRoas = tSpend > 0 ? (tSales / tSpend).toFixed(1) : 0;
    const spdBud = tBud > 0 ? (tSpend / tBud) * 100 : 0;

    const isOverTotal = tSpend > tBud;

    // คำนวณข้อมูลย้อนหลังสำหรับ Insight
    const cIdx = dashboardData.findIndex(d => d.id === current.id);
    const prev = cIdx > 0 ? dashboardData[cIdx - 1] : null;
    let prevSpend = 0, prevSales = 0, prevRoas = 0;
    if (prev) {
        prevSpend = prev.marketing.gfs.actual + prev.marketing.mhl.actual + prev.marketing.car.actual;
        prevSales = prev.gfs.actual + prev.mhl.actual + prev.car.actual;
        prevRoas = prevSpend > 0 ? (prevSales / prevSpend).toFixed(1) : 0;
    }
    const roasDiff = totalRoas - prevRoas;

    container.innerHTML = `
        <!-- Filter -->
        <div class="flex items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <i data-lucide="filter" class="w-5 h-5 text-slate-400 ml-2"></i>
            <span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span>
            <select onchange="handleWeekChange(event)" class="ml-auto bg-orange-50 border border-orange-200 text-orange-700 text-base font-bold rounded-xl p-2 w-72 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">${opt}</select>
        </div>
        
        <!-- Section 1: Top KPI Cards (4 กล่อง) -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 shrink-0">
            <!-- Total Spend Card (Hero) -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="megaphone" class="w-40 h-40 text-orange-600"></i></div>
                <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2"><i data-lucide="wallet" class="w-5 h-5 text-orange-500"></i> งบโฆษณารวม (Total Spend)</p>
                <div class="flex items-baseline gap-2 mt-2 mb-3 relative z-10">
                    <h2 class="text-5xl font-black text-slate-900 tracking-tighter">฿${formatCurrency(tSpend)}</h2>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="${isOverTotal ? 'bg-red-500' : 'bg-orange-500'} h-full rounded-full transition-all duration-1000" style="width:${Math.min(spdBud,100)}%"></div>
                </div>
                <div class="flex justify-between items-center text-sm font-bold relative z-10">
                    <span class="text-slate-500">งบตั้งไว้: ฿${formatCurrency(tBud)}</span>
                    <span class="${isOverTotal ? 'text-red-500' : 'text-emerald-500'}">${isOverTotal ? '⚠️ ใช้เกินงบ' : '⭐ อยู่ในงบ'} (${spdBud.toFixed(1)}%)</span>
                </div>
            </div>

            <!-- ROAS Card -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2"><i data-lucide="bar-chart-3" class="w-5 h-5 text-emerald-500"></i> ผลตอบแทน (Total ROAS)</p>
                <h2 class="text-5xl font-black text-emerald-600 mt-2 tracking-tighter">${totalRoas}x</h2>
                <p class="text-sm font-bold text-slate-500 mt-3 border-t border-slate-100 pt-3">ยอดขายรวม: ฿${formatCurrency(tSales)}</p>
            </div>

            <!-- Cost per Contact Card -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2"><i data-lucide="message-circle" class="w-5 h-5 text-blue-500"></i> ต้นทุน / 1 ติดต่อ</p>
                <h2 class="text-5xl font-black text-slate-900 mt-2 tracking-tighter">฿${formatCurrency(costCont)}</h2>
                <p class="text-sm font-bold text-slate-500 mt-3 border-t border-slate-100 pt-3">จากทั้งหมด ${formatCurrency(tCont)} ติดต่อ</p>
            </div>

            <!-- Cost per Lead Card -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2"><i data-lucide="users" class="w-5 h-5 text-purple-500"></i> ต้นทุน / 1 ลูกค้าใหม่</p>
                <h2 class="text-5xl font-black text-slate-900 mt-2 tracking-tighter">฿${formatCurrency(costLead)}</h2>
                <p class="text-sm font-bold text-slate-500 mt-3 border-t border-slate-100 pt-3">ได้มาทั้งหมด ${formatCurrency(tLeads)} ราย</p>
            </div>
        </div>

        <div class="flex items-center gap-3 mb-6 shrink-0">
            <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight">แยกรายบริษัท (Company Breakdown) สัปดาห์นี้</h3>
            <div class="h-px bg-slate-200 flex-1"></div>
        </div>

        <!-- Section 2: Company Breakdown (3 คอลัมน์) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
            ${['gfs','mhl','car'].map(k => {
                const mk = current.marketing[k]; 
                const tNames = { gfs: 'Goodfilm (GFS)', mhl: 'Maholan (MHL)', car: 'ฟิล์มรถยนต์ (CAR)' }; 
                const c = k==='gfs'?'blue':k==='mhl'?'amber':'emerald'; 
                const p = mk.target>0?(mk.actual/mk.target)*100:0; 
                const isOver = mk.actual>mk.target && mk.target>0;
                
                const companySales = current[k].actual;
                const cCont = k==='car'?(current.carDetail ? current.carDetail.contacts.total : 0):(current.admin.contacts[k]?.line+current.admin.contacts[k]?.fb+current.admin.contacts[k]?.tel||0); 
                const cLead = k==='car'?(current.admin.leads.car||0):(current.admin.leads[k]?.line+current.admin.leads[k]?.fb+current.admin.leads[k]?.tel||0);
                
                const coRoas = mk.actual > 0 ? (companySales / mk.actual).toFixed(1) : 0;
                const coCpa = cLead > 0 ? (mk.actual / cLead) : 0;
                const coCpc = cCont > 0 ? (mk.actual / cCont) : 0;
                const coSalesRatio = companySales > 0 ? (mk.actual / companySales) * 100 : 0;

                // คำนวณ % Ad Split
                const totalAds = mk.google + mk.fb;
                const pGoogle = totalAds > 0 ? (mk.google / totalAds) * 100 : 0;
                const pFb = totalAds > 0 ? (mk.fb / totalAds) * 100 : 0;

                return `
                <div class="bg-white rounded-[2rem] p-6 xl:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                    <div class="absolute -right-4 -top-4 opacity-5 pointer-events-none"><i data-lucide="building-2" class="w-32 h-32 text-${c}-600"></i></div>
                    
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-6 relative z-10">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-${c}-50 text-${c}-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border border-${c}-100">${k.toUpperCase()}</div>
                            <h4 class="font-black text-slate-800 text-lg whitespace-nowrap overflow-hidden text-ellipsis">${tNames[k]}</h4>
                        </div>
                    </div>
                    
                    <!-- Spend vs Budget -->
                    <div class="mb-6 relative z-10">
                        <div class="flex items-baseline gap-2 mb-3">
                            <h3 class="text-4xl font-black text-slate-900 tracking-tighter">฿${formatCurrency(mk.actual)}</h3>
                            <span class="text-base font-bold text-slate-400">/ ฿${formatCurrency(mk.target)}</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                            <div class="bg-${c}-500 h-full rounded-full transition-all duration-1000" style="width:${Math.min(p,100)}%"></div>
                        </div>
                        <div class="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                            <span>ใช้ไป ${p.toFixed(1)}%</span>
                            <span class="${isOver?'text-red-500':'text-emerald-500'}">${isOver?'⚠️ เกินงบ':'⭐ ในงบ'}</span>
                        </div>
                    </div>

                    <!-- Ad Platform Split Bar -->
                    <div class="mb-6 relative z-10">
                        <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-blue-500"></div>Google (${pGoogle.toFixed(0)}%)</span>
                            <span class="flex items-center gap-1.5">FB (${pFb.toFixed(0)}%)<div class="w-2 h-2 rounded-full bg-indigo-500"></div></span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                            <div class="bg-blue-500 h-full" style="width:${pGoogle}%"></div>
                            <div class="bg-indigo-500 h-full" style="width:${pFb}%"></div>
                        </div>
                        <div class="flex justify-between text-sm font-black text-slate-800 mt-1">
                            <span>฿${formatCurrency(mk.google)}</span>
                            <span>฿${formatCurrency(mk.fb)}</span>
                        </div>
                    </div>
                    
                    <!-- Detail Grid -->
                    <div class="grid grid-cols-2 gap-3 mt-auto relative z-10 border-t border-slate-100 pt-5">
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">จำนวนลูกค้า</p>
                            <p class="text-lg font-black text-slate-800">${formatCurrency(cLead)} ราย</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">จำนวนติดต่อ</p>
                            <p class="text-lg font-black text-slate-800">${formatCurrency(cCont)} ติดต่อ</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">ผลตอบแทน</p>
                            <p class="text-lg font-black text-emerald-600">ROAS ${coRoas}x</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">% เทียบยอดขาย</p>
                            <p class="text-lg font-black text-slate-800">${coSalesRatio.toFixed(1)}%</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">จ่าย / ลูกค้า</p>
                            <p class="text-lg font-black text-slate-800">${cLead > 0 ? `฿${formatCurrency(coCpa)}` : '-'}</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-400 uppercase mb-0.5">จ่าย / ติดต่อ</p>
                            <p class="text-lg font-black text-slate-800">${cCont > 0 ? `฿${formatCurrency(coCpc)}` : '-'}</p>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <!-- Section 3 & 4: Charts and Insights (ให้อยู่แถวเดียวกัน) -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8 shrink-0">
            
            <!-- Chart Section (ซ้าย: กว้าง 2 ส่วน) -->
            <div class="xl:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col shrink-0">
                <!-- HEADER กราฟ: ทั้งหมดในบรรทัดเดียวกันแบบ scroll ได้ถ้าจอกว้างไม่พอ -->
                <div class="flex items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                    <div class="flex items-center gap-6 shrink-0">
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-lg whitespace-nowrap m-0">
                            ${activeMarketingChartTab === 'trend' ? 'แนวโน้มค่าโฆษณาย้อนหลัง 12 สัปดาห์' : 'แนวโน้มค่าโฆณาปีนี้ (รายเดือน)'}
                        </h3>
                        <div class="flex gap-2 shrink-0">
                            <button onclick="changeMarketingTrendFilter('total')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${marketingTrendFilter === 'total' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">รวมทั้งหมด</button>
                            <button onclick="changeMarketingTrendFilter('gfs')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${marketingTrendFilter === 'gfs' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">GFS</button>
                            <button onclick="changeMarketingTrendFilter('mhl')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${marketingTrendFilter === 'mhl' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">MHL</button>
                            <button onclick="changeMarketingTrendFilter('car')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${marketingTrendFilter === 'car' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">CAR</button>
                        </div>
                    </div>
                    <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0 ml-auto">
                        <button onclick="changeMarketingChartTab('yearly')" class="px-4 py-2 rounded-lg text-sm font-black transition-all ${activeMarketingChartTab === 'yearly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}">แนวโน้มปีนี้ (รายเดือน)</button>
                        <button onclick="changeMarketingChartTab('trend')" class="px-4 py-2 rounded-lg text-sm font-black transition-all ${activeMarketingChartTab === 'trend' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}">ย้อนหลัง 12 สัปดาห์</button>
                    </div>
                </div>
                
                <div class="flex-1 w-full min-h-[550px] relative">
                    <canvas id="marketingYearlyCanvas" class="${activeMarketingChartTab === 'yearly' ? '' : 'hidden'}"></canvas>
                    <canvas id="marketingTrendCanvas" class="${activeMarketingChartTab === 'trend' ? '' : 'hidden'}"></canvas>
                </div>
            </div>

            <!-- Executive Insights Section (ขวา: กว้าง 1 ส่วน จัดแนวตั้ง) -->
            <div class="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="lightbulb" class="w-64 h-64 text-orange-600"></i></div>
                <h3 class="font-black text-slate-800 flex items-center gap-2 text-xl uppercase tracking-tight mb-6 relative z-10">
                    <i data-lucide="lightbulb" class="text-amber-500 w-6 h-6"></i> วิเคราะห์การตลาด
                </h3>
                
                <div class="flex flex-col gap-4 relative z-10 mb-6">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-orange-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">เทียบงบสัปดาห์นี้</p>
                            <p class="text-xl font-black ${isOverTotal ? 'text-red-600' : 'text-emerald-600'}">${isOverTotal ? '+' : '-'}${formatCurrency(Math.abs(tSpend - tBud))} ฿</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl ${isOverTotal ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center shrink-0"><i data-lucide="wallet" class="w-5 h-5"></i></div>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-orange-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">ROAS (เทียบวีคก่อน)</p>
                            <p class="text-xl font-black ${roasDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}">${roasDiff >= 0 ? '↑' : '↓'} ${Math.abs(roasDiff).toFixed(1)}x</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl ${roasDiff >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="trending-${roasDiff >= 0 ? 'up' : 'down'}" class="w-5 h-5"></i></div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-orange-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">ต้นทุน / ลูกค้าใหม่</p>
                            <p class="text-xl font-black text-blue-600">฿${formatCurrency(costLead)}</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><i data-lucide="users" class="w-5 h-5"></i></div>
                    </div>
                </div>

                <div class="mt-auto p-5 ${!isOverTotal && roasDiff >= 0 ? 'bg-emerald-50/50 border-emerald-100' : (isOverTotal ? 'bg-red-50/50 border-red-100' : 'bg-orange-50/50 border-orange-100')} rounded-2xl border text-sm leading-relaxed text-slate-800 font-medium relative z-10 flex flex-col justify-center">
                    <b class="${!isOverTotal && roasDiff >= 0 ? 'text-emerald-600' : (isOverTotal ? 'text-red-600' : 'text-orange-600')} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์:</b> 
                    ${!isOverTotal 
                        ? `คุมงบได้เยี่ยม <b class="text-emerald-700">อยู่ในงบ (${spdBud.toFixed(1)}%)</b> ROAS <b class="text-emerald-700">${totalRoas}x</b> ${roasDiff >= 0 ? 'เติบโตดี รักษามาตรฐานไว้' : 'ควรปรับคอนเทนต์ให้ ROAS เพิ่ม'}` 
                        : `ใช้งบโฆษณา <b class="text-red-600">เกินเป้า ${formatCurrency(tSpend - tBud)} ฿</b> CPL อยู่ที่ <b class="text-red-600">฿${formatCurrency(costLead)}</b> ตรวจสอบด่วน`}
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        if (activeMarketingChartTab === 'yearly') {
            const ctx = document.getElementById('marketingYearlyCanvas')?.getContext('2d');
            if(ctx) {
                if (charts['marketingYearly']) charts['marketingYearly'].destroy();
                
                // Group by month
                const monthlyDataMap = {};
                const monthsOrder = [];
                dashboardData.forEach(d => {
                    const monthGroup = extractMonthGroup(d.dateRange);
                    if (!monthlyDataMap[monthGroup]) {
                        monthlyDataMap[monthGroup] = { label: monthGroup, gfs: { actual: 0, target: 0 }, mhl: { actual: 0, target: 0 }, car: { actual: 0, target: 0 } };
                        monthsOrder.push(monthGroup);
                    }
                    monthlyDataMap[monthGroup].gfs.actual += d.marketing.gfs.actual;
                    monthlyDataMap[monthGroup].gfs.target += d.marketing.gfs.target;
                    monthlyDataMap[monthGroup].mhl.actual += d.marketing.mhl.actual;
                    monthlyDataMap[monthGroup].mhl.target += d.marketing.mhl.target;
                    monthlyDataMap[monthGroup].car.actual += d.marketing.car.actual;
                    monthlyDataMap[monthGroup].car.target += d.marketing.car.target;
                });
                const recentData = monthsOrder.map(m => monthlyDataMap[m]).filter(d => (d.gfs.actual + d.mhl.actual + d.car.actual) > 0);

                let dLabelAct = '', dLabelTar = '', dAct = [], dTar = [], cLine = '', cBg = '', cBorder = '';

                if (marketingTrendFilter === 'total') {
                    dLabelAct = 'จ่ายจริงรวม'; dLabelTar = 'งบรวม';
                    dAct = recentData.map(d => d.gfs.actual + d.mhl.actual + d.car.actual);
                    dTar = recentData.map(d => d.gfs.target + d.mhl.target + d.car.target);
                    cLine = '#f97316'; cBg = '#ffedd5'; cBorder = '#fdba74'; 
                } else if (marketingTrendFilter === 'gfs') {
                    dLabelAct = 'จ่ายจริง GFS'; dLabelTar = 'งบ GFS';
                    dAct = recentData.map(d => d.gfs.actual);
                    dTar = recentData.map(d => d.gfs.target);
                    cLine = '#3b82f6'; cBg = '#dbeafe'; cBorder = '#93c5fd'; 
                } else if (marketingTrendFilter === 'mhl') {
                    dLabelAct = 'จ่ายจริง MHL'; dLabelTar = 'งบ MHL';
                    dAct = recentData.map(d => d.mhl.actual);
                    dTar = recentData.map(d => d.mhl.target);
                    cLine = '#f59e0b'; cBg = '#fef3c7'; cBorder = '#fcd34d'; 
                } else if (marketingTrendFilter === 'car') {
                    dLabelAct = 'จ่ายจริง CAR'; dLabelTar = 'งบ CAR';
                    dAct = recentData.map(d => d.car.actual);
                    dTar = recentData.map(d => d.car.target);
                    cLine = '#10b981'; cBg = '#d1fae5'; cBorder = '#6ee7b7'; 
                }

                charts['marketingYearly'] = new Chart(ctx, { 
                    type: 'bar', 
                    data: { 
                        labels: recentData.map(d => d.label), 
                        datasets: [
                            { type: 'bar', label: dLabelAct, data: dAct, backgroundColor: cLine, borderRadius: 4, barPercentage: 0.6, order: 2 }, 
                            { type: 'line', label: dLabelTar, data: dTar, borderColor: cBorder, backgroundColor: 'transparent', borderWidth: 2, borderDash: [5,5], pointBackgroundColor: cBorder, tension: 0.1, order: 1 }
                        ] 
                    }, 
                    options: { 
                        layout: { padding: { top: 30 } },
                        responsive: true, maintainAspectRatio: false, 
                        plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } }, tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + formatCurrency(c.parsed.y) + ' ฿' } } }, 
                        scales: { x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } }, y: { beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { weight: 'bold' }, callback: (v) => v >= 10000 ? (v/1000)+'k' : v } } } 
                    },
                    plugins: [createProgressPlugin(true)] 
                });
            }
        } else if (activeMarketingChartTab === 'trend') {
            const ctx = document.getElementById('marketingTrendCanvas')?.getContext('2d');
            if(ctx) {
                if (charts['marketingTrend']) charts['marketingTrend'].destroy();
                
                let recentData = [];
                let dLabelAct = '', dLabelTar = '', dAct = [], dTar = [], cLine = '', cBg = '', cBorder = '';

                if (marketingTrendFilter === 'total') {
                    recentData = dashboardData.filter(d => (d.marketing.gfs.actual + d.marketing.mhl.actual + d.marketing.car.actual) > 0).slice(-12);
                    dLabelAct = 'จ่ายจริงรวม'; dLabelTar = 'งบรวม';
                    dAct = recentData.map(d => d.marketing.gfs.actual + d.marketing.mhl.actual + d.marketing.car.actual);
                    dTar = recentData.map(d => d.marketing.gfs.target + d.marketing.mhl.target + d.marketing.car.target);
                    cLine = '#f97316'; cBg = '#ffedd5'; cBorder = '#fdba74'; 
                } else if (marketingTrendFilter === 'gfs') {
                    recentData = dashboardData.filter(d => d.marketing.gfs.actual > 0).slice(-12);
                    dLabelAct = 'จ่ายจริง GFS'; dLabelTar = 'งบ GFS';
                    dAct = recentData.map(d => d.marketing.gfs.actual);
                    dTar = recentData.map(d => d.marketing.gfs.target);
                    cLine = '#3b82f6'; cBg = '#dbeafe'; cBorder = '#93c5fd'; 
                } else if (marketingTrendFilter === 'mhl') {
                    recentData = dashboardData.filter(d => d.marketing.mhl.actual > 0).slice(-12);
                    dLabelAct = 'จ่ายจริง MHL'; dLabelTar = 'งบ MHL';
                    dAct = recentData.map(d => d.marketing.mhl.actual);
                    dTar = recentData.map(d => d.marketing.mhl.target);
                    cLine = '#f59e0b'; cBg = '#fef3c7'; cBorder = '#fcd34d'; 
                } else if (marketingTrendFilter === 'car') {
                    recentData = dashboardData.filter(d => d.marketing.car.actual > 0).slice(-12);
                    dLabelAct = 'จ่ายจริง CAR'; dLabelTar = 'งบ CAR';
                    dAct = recentData.map(d => d.marketing.car.actual);
                    dTar = recentData.map(d => d.marketing.car.target);
                    cLine = '#10b981'; cBg = '#d1fae5'; cBorder = '#6ee7b7'; 
                }

                charts['marketingTrend'] = new Chart(ctx, { 
                    type: 'bar', 
                    data: { 
                        labels: recentData.map(d => d.week), 
                        datasets: [
                            { type: 'bar', label: dLabelAct, data: dAct, backgroundColor: cLine, borderRadius: 4, barPercentage: 0.6, order: 2 }, 
                            { type: 'line', label: dLabelTar, data: dTar, borderColor: cBorder, backgroundColor: 'transparent', borderWidth: 2, borderDash: [5,5], pointBackgroundColor: cBorder, tension: 0.1, order: 1 }
                        ] 
                    }, 
                    options: { 
                        layout: { padding: { top: 30 } },
                        responsive: true, maintainAspectRatio: false, 
                        plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } }, tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + formatCurrency(c.parsed.y) + ' ฿' } } }, 
                        scales: { x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } }, y: { beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { weight: 'bold' }, callback: (v) => v >= 10000 ? (v/1000)+'k' : v } } } 
                    },
                    plugins: [createProgressPlugin(true)] 
                });
            }
        }
    }, 50);
}

// ==========================================
// RENDER: TECH TEAM (Redesigned - Modern & Clean Layout)
// ==========================================
