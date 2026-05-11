// Render: Sales admin page.
function renderAdminDeepDiveHTML(current, m, opt, container) {
    const cIdx = dashboardData.findIndex(d => d.id === current.id);
    const prev = cIdx > 0 ? dashboardData[cIdx - 1] : null;
    
    const currentAdminSales = current.admin.sales.totalSales;
    const prevAdminSales = prev ? prev.admin.sales.totalSales : 0;
    const adminGrowth = prevAdminSales > 0 ? ((currentAdminSales - prevAdminSales) / prevAdminSales) * 100 : 0;
    
    const convRate = current.admin.contacts.total > 0 ? ((current.admin.leads.actual / current.admin.contacts.total) * 100) : 0;
    const closeRate = current.admin.leads.actual > 0 ? ((current.admin.sales.totalInstalls / current.admin.leads.actual) * 100) : 0;
    const leadTargetProgress = current.admin.leads.target > 0 ? ((current.admin.leads.actual / current.admin.leads.target) * 100) : 0;

    const insightType = convRate < 25 ? 'low_conv' : (closeRate < 15 ? 'low_close' : 'good');
    
    const gfsContacts = current.admin.contacts.gfs.line + current.admin.contacts.gfs.fb + current.admin.contacts.gfs.tel;
    const gfsLeads = current.admin.leads.gfs.line + current.admin.leads.gfs.fb + current.admin.leads.gfs.tel;
    
    const mhlContacts = current.admin.contacts.mhl.line + current.admin.contacts.mhl.fb + current.admin.contacts.mhl.tel;
    const mhlLeads = current.admin.leads.mhl.line + current.admin.leads.mhl.fb + current.admin.leads.mhl.tel;
    
    const totalNewSales = current.admin.sales.newSales.gfs + current.admin.sales.newSales.mhl;
    const totalOldSales = current.admin.sales.oldSales.gfs + current.admin.sales.oldSales.mhl;
    const totalNewInstalls = current.admin.sales.newInstalls.gfs + current.admin.sales.newInstalls.mhl;
    const totalOldInstalls = current.admin.sales.oldInstalls.gfs + current.admin.sales.oldInstalls.mhl;

    container.innerHTML = `
        <!-- Filter Section -->
        <div class="flex items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <i data-lucide="filter" class="w-5 h-5 text-slate-400 ml-2"></i>
            <span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span>
            <select onchange="handleWeekChange(event)" class="ml-auto bg-indigo-50 border border-indigo-200 text-indigo-700 text-base cursor-pointer font-bold rounded-xl p-2 w-72">${opt}</select>
        </div>
        
        <div class="flex items-center gap-3 mb-6 shrink-0 mt-2">
            <h3 class="font-black text-slate-800 text-2xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="filter" class="text-indigo-600 w-7 h-7"></i> กระบวนการคัดกรอง (Sales Admin Funnel) สัปดาห์นี้</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <!-- Section 1: Funnel KPIs (4 Cards in a row) -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 shrink-0">
            <!-- 1. Contacts -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                <p class="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><i data-lucide="message-square" class="w-5 h-5 text-blue-500"></i> ปริมาณการติดต่อ</p>
                <h3 class="text-5xl font-black text-slate-900">${formatCurrency(current.admin.contacts.total)}</h3>
                <p class="text-sm font-bold text-slate-400 mt-2 border-t border-slate-100 pt-3">ลูกค้าทักแชท / โทรเข้า</p>
            </div>
            
            <!-- 2. Leads (ส่งงาน) -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none"><i data-lucide="send" class="w-32 h-32 text-indigo-600"></i></div>
                <p class="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="send" class="w-5 h-5 text-indigo-500"></i> ส่งงานให้เซลล์</p>
                <h3 class="text-5xl font-black text-indigo-600 relative z-10">${formatCurrency(current.admin.leads.actual)}</h3>
                <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 relative z-10">
                    <span class="text-sm font-bold text-slate-400">เป้าหมาย: ${current.admin.leads.target}</span>
                    <span class="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">Conv. ${convRate.toFixed(1)}%</span>
                </div>
            </div>

            <!-- 3. Installs (ปิดการขาย) -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none"><i data-lucide="check-circle" class="w-32 h-32 text-emerald-600"></i></div>
                <p class="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i> ปิดการขายได้</p>
                <h3 class="text-5xl font-black text-emerald-600 relative z-10">${formatCurrency(current.admin.sales.totalInstalls)}</h3>
                <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 relative z-10">
                    <span class="text-sm font-bold text-slate-400">งานติดตั้ง</span>
                    <span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">Close Rate ${closeRate.toFixed(1)}%</span>
                </div>
            </div>

            <!-- 4. Revenue (ยอดขาย) -->
            <div class="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-center text-white relative overflow-hidden">
                <div class="absolute -right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none"><i data-lucide="award" class="w-32 h-32 text-white"></i></div>
                <p class="text-sm font-black text-indigo-200 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10"><i data-lucide="award" class="w-5 h-5 text-amber-300"></i> ยอดขายจากแอดมิน</p>
                <h3 class="text-4xl lg:text-5xl font-black text-white relative z-10 tracking-tighter">฿${formatCurrency(current.admin.sales.totalSales)}</h3>
                <p class="text-sm font-bold text-indigo-200 mt-3 border-t border-indigo-500/50 pt-3 relative z-10">ยอดขายรวมสัปดาห์นี้</p>
            </div>
        </div>

        <div class="flex items-center gap-3 mb-6 shrink-0 mt-4">
            <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="pie-chart" class="text-blue-500 w-6 h-6"></i> แยกรายบริษัทและคุณภาพงาน (Breakdown)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <!-- Section 2: Channel Breakdown (3 Cards) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
            
            <!-- GFS Card -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col">
                <div class="flex justify-between items-center mb-5 pb-5 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-base border border-blue-100">GFS</div>
                        <div><h4 class="font-black text-slate-800 text-lg leading-none">ฟิล์มอาคาร GFS</h4></div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-0.5">ส่งงาน / ติดต่อ</p>
                        <p class="text-xl font-black text-blue-600">${formatCurrency(gfsLeads)} <span class="text-sm font-bold text-slate-400">/ ${formatCurrency(gfsContacts)}</span></p>
                    </div>
                </div>
                <div class="space-y-3 mt-auto">
                    <div class="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="flex items-center gap-2.5 text-sm font-bold text-slate-700"><div class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div> LINE OA</span>
                        <div class="text-right"><span class="text-base font-black text-slate-900">${formatCurrency(current.admin.leads.gfs.line)}</span> <span class="text-xs text-slate-400 font-bold ml-1">/ ${formatCurrency(current.admin.contacts.gfs.line)}</span></div>
                    </div>
                    <div class="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="flex items-center gap-2.5 text-sm font-bold text-slate-700"><div class="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div> Facebook</span>
                        <div class="text-right"><span class="text-base font-black text-slate-900">${formatCurrency(current.admin.leads.gfs.fb)}</span> <span class="text-xs text-slate-400 font-bold ml-1">/ ${formatCurrency(current.admin.contacts.gfs.fb)}</span></div>
                    </div>
                    <div class="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="flex items-center gap-2.5 text-sm font-bold text-slate-700"><i data-lucide="phone" class="w-4 h-4 text-slate-400"></i> โทรเข้า</span>
                        <div class="text-right"><span class="text-base font-black text-slate-900">${formatCurrency(current.admin.leads.gfs.tel)}</span> <span class="text-xs text-slate-400 font-bold ml-1">/ ${formatCurrency(current.admin.contacts.gfs.tel)}</span></div>
                    </div>
                </div>
            </div>
            
            <!-- MHL Card -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col">
                <div class="flex justify-between items-center mb-5 pb-5 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-base border border-amber-100">MHL</div>
                        <div><h4 class="font-black text-slate-800 text-lg leading-none">ฟิล์มอาคาร MHL</h4></div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-0.5">ส่งงาน / ติดต่อ</p>
                        <p class="text-xl font-black text-amber-600">${formatCurrency(mhlLeads)} <span class="text-sm font-bold text-slate-400">/ ${formatCurrency(mhlContacts)}</span></p>
                    </div>
                </div>
                <div class="space-y-3 mt-auto">
                    <div class="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="flex items-center gap-2.5 text-sm font-bold text-slate-700"><div class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div> LINE OA</span>
                        <div class="text-right"><span class="text-base font-black text-slate-900">${formatCurrency(current.admin.leads.mhl.line)}</span> <span class="text-xs text-slate-400 font-bold ml-1">/ ${formatCurrency(current.admin.contacts.mhl.line)}</span></div>
                    </div>
                    <div class="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="flex items-center gap-2.5 text-sm font-bold text-slate-700"><div class="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div> Facebook</span>
                        <div class="text-right"><span class="text-base font-black text-slate-900">${formatCurrency(current.admin.leads.mhl.fb)}</span> <span class="text-xs text-slate-400 font-bold ml-1">/ ${formatCurrency(current.admin.contacts.mhl.fb)}</span></div>
                    </div>
                    <div class="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="flex items-center gap-2.5 text-sm font-bold text-slate-700"><i data-lucide="phone" class="w-4 h-4 text-slate-400"></i> โทรเข้า</span>
                        <div class="text-right"><span class="text-base font-black text-slate-900">${formatCurrency(current.admin.leads.mhl.tel)}</span> <span class="text-xs text-slate-400 font-bold ml-1">/ ${formatCurrency(current.admin.contacts.mhl.tel)}</span></div>
                    </div>
                </div>
            </div>

            <!-- Quality of Sales Card -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="award" class="w-40 h-40 text-amber-500"></i></div>
                <div class="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100 relative z-10">
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black border border-indigo-100"><i data-lucide="award" class="w-6 h-6"></i></div>
                    <div>
                        <h4 class="font-black text-slate-800 text-lg leading-none mb-1">คุณภาพยอดขาย</h4>
                        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">แบ่งตามประเภทลูกค้า (อาคาร)</p>
                    </div>
                </div>
                <div class="space-y-6 mt-auto relative z-10 flex-1 flex flex-col justify-center">
                    <!-- New Customers -->
                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <div>
                                <span class="text-sm font-black text-slate-700 block mb-0.5">🆕 ลูกค้าใหม่ (New)</span>
                                <span class="text-xs text-slate-500 font-bold">ติดตั้งแล้ว: ${totalNewInstalls} งาน</span>
                            </div>
                            <span class="text-xl font-black text-emerald-600">฿${formatCurrency(totalNewSales)}</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-emerald-500 h-full rounded-full" style="width:${((totalNewSales/currentAdminSales)*100) || 0}%"></div>
                        </div>
                    </div>
                    
                    <!-- Old Customers -->
                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <div>
                                <span class="text-sm font-black text-slate-700 block mb-0.5">🔙 ลูกค้าเก่า (Old)</span>
                                <span class="text-xs text-slate-500 font-bold">ติดตั้งแล้ว: ${totalOldInstalls} งาน</span>
                            </div>
                            <span class="text-xl font-black text-indigo-600">฿${formatCurrency(totalOldSales)}</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-indigo-500 h-full rounded-full" style="width:${((totalOldSales/currentAdminSales)*100) || 0}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 3: Chart & Insights -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 shrink-0 mt-4">
            <!-- Chart -->
            <div class="lg:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col shrink-0">
                <div class="flex items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                    <div class="flex items-center gap-4 shrink-0">
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0 flex items-center"><i data-lucide="trending-up" class="w-5 h-5 text-indigo-500 mr-2"></i> แนวโน้มการทำงาน (12 สัปดาห์)</h3>
                        <div class="flex gap-2 shrink-0 ml-4">
                            <button onclick="changeAdminTrendFilter('total')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${adminTrendFilter === 'total' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">รวมทั้งหมด</button>
                            <button onclick="changeAdminTrendFilter('gfs')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${adminTrendFilter === 'gfs' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">GFS</button>
                            <button onclick="changeAdminTrendFilter('mhl')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${adminTrendFilter === 'mhl' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">MHL</button>
                        </div>
                    </div>
                </div>
                <div class="flex-1 w-full min-h-[350px] relative"><canvas id="adminTrendChartCanvas"></canvas></div>
            </div>
            
            <!-- Executive Insights -->
            <div class="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="lightbulb" class="w-64 h-64 text-indigo-600"></i></div>
                <h3 class="font-black text-slate-800 flex items-center gap-2 text-xl uppercase tracking-tight mb-6 relative z-10">
                    <i data-lucide="lightbulb" class="text-amber-500 w-6 h-6"></i> วิเคราะห์งานแอดมิน
                </h3>
                
                <div class="flex flex-col gap-4 relative z-10 mb-6 flex-1">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">อัตราส่งมอบ (Conversion)</p>
                            <p class="text-2xl font-black text-indigo-600">${convRate.toFixed(1)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><i data-lucide="filter" class="w-6 h-6"></i></div>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">อัตราปิดการขาย (Close Rate)</p>
                            <p class="text-2xl font-black text-emerald-600">${closeRate.toFixed(1)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><i data-lucide="check-circle-2" class="w-6 h-6"></i></div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Growth (เทียบวีคก่อน)</p>
                            <p class="text-2xl font-black ${adminGrowth>=0?'text-emerald-600':'text-red-600'}">${adminGrowth>=0?'↑':'↓'} ${Math.abs(adminGrowth).toFixed(1)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${adminGrowth>=0?'bg-emerald-100 text-emerald-600':'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="trending-${adminGrowth>=0?'up':'down'}" class="w-6 h-6"></i></div>
                    </div>
                </div>

                <div class="mt-auto p-5 ${insightType === 'good' ? 'bg-emerald-50/50 border-emerald-100' : (insightType === 'low_close' ? 'bg-amber-50/50 border-amber-100' : 'bg-red-50/50 border-red-100')} rounded-2xl border text-sm leading-relaxed text-slate-800 font-medium relative z-10 flex flex-col justify-center">
                    <b class="${insightType === 'good' ? 'text-emerald-600' : (insightType === 'low_close' ? 'text-amber-600' : 'text-red-600')} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์:</b> 
                    ${insightType === 'good' 
                        ? `ยอดเยี่ยมมาก! แอดมินสามารถคัดกรองลูกค้าและส่งต่อให้เซลล์ได้สูงถึง <b class="text-emerald-700">${convRate.toFixed(1)}%</b> และมีการปิดการขายได้ถึง <b class="text-emerald-700">${closeRate.toFixed(1)}%</b> แสดงให้เห็นถึงคุณภาพของ Leads ที่แอดมินคุยมาดีมาก` 
                        : (insightType === 'low_close' 
                            ? `แอดมินทำงานได้ดีในการส่งมอบ Leads <b class="text-amber-600">(${convRate.toFixed(1)}%)</b> แต่เซลล์ปิดการขายได้ค่อนข้างต่ำ <b class="text-amber-600">(${closeRate.toFixed(1)}%)</b> แนะนำให้ตรวจสอบว่าปัญหาเกิดจากคุณภาพของ Leads หรือเซลล์ตามงานไม่ทัน`
                            : `ประสิทธิภาพการเปลี่ยน Contact เป็น Leads ต่ำกว่าเกณฑ์ปกติ <b class="text-red-600">(${convRate.toFixed(1)}%)</b> แม้จะมีคนทักมามาก แต่แอดมินไม่สามารถดึงข้อมูลหรือส่งให้เซลล์ได้ ควรเร่งตรวจสอบและปรับปรุงสคริปต์การตอบด่วน`)}
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const adminCtx = document.getElementById('adminTrendChartCanvas')?.getContext('2d');
        if(!adminCtx) return;
        if (charts['adminTrend']) charts['adminTrend'].destroy();
        
        const recentData = dashboardData.filter(d => d.admin.contacts.total > 0).slice(-12);
        let dSales = [], dCont = [], dLeads = [], cBg = '#4f46e5';
        
        if (adminTrendFilter === 'total') {
            dSales = recentData.map(d => d.admin.sales.totalSales);
            dCont = recentData.map(d => d.admin.contacts.total);
            dLeads = recentData.map(d => d.admin.leads.actual);
            cBg = '#4f46e5';
        } else if (adminTrendFilter === 'gfs') {
            dSales = recentData.map(d => d.admin.sales.newSales.gfs + d.admin.sales.oldSales.gfs);
            dCont = recentData.map(d => d.admin.contacts.gfs.line + d.admin.contacts.gfs.fb + d.admin.contacts.gfs.tel);
            dLeads = recentData.map(d => d.admin.leads.gfs.line + d.admin.leads.gfs.fb + d.admin.leads.gfs.tel);
            cBg = '#2563eb';
        } else if (adminTrendFilter === 'mhl') {
            dSales = recentData.map(d => d.admin.sales.newSales.mhl + d.admin.sales.oldSales.mhl);
            dCont = recentData.map(d => d.admin.contacts.mhl.line + d.admin.contacts.mhl.fb + d.admin.contacts.mhl.tel);
            dLeads = recentData.map(d => d.admin.leads.mhl.line + d.admin.leads.mhl.fb + d.admin.leads.mhl.tel);
            cBg = '#f59e0b';
        }

        charts['adminTrend'] = new Chart(adminCtx, {
            type: 'line',
            data: { 
                labels: recentData.map(d => d.week), 
                datasets: [
                    { type: 'bar', label: 'ยอดขาย (฿)', data: dSales, backgroundColor: cBg, borderRadius: 4, yAxisID: 'y', order: 3, barPercentage: 0.6 }, 
                    { type: 'line', label: 'ติดต่อรวม', data: dCont, borderColor: '#f59e0b', backgroundColor: '#fef3c7', borderWidth: 2, tension: 0.4, yAxisID: 'y1', order: 2, fill: false }, 
                    { type: 'line', label: 'ส่งงาน', data: dLeads, borderColor: '#06b6d4', backgroundColor: '#cffafe', borderWidth: 2, borderDash: [5,5], tension: 0.4, yAxisID: 'y1', order: 1, fill: false }
                ] 
            },
            options: { 
                layout: { padding: { top: 30 } },
                responsive: true, maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } }, tooltip: { callbacks: { label: (c) => c.datasetIndex === 0 ? `${c.dataset.label}: ฿${formatCurrency(c.parsed.y)}` : `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } } },
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } },
                    y: { type: 'linear', position: 'left', beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9' }, ticks: { font: { weight: 'bold' }, callback: (v) => v >= 1000 ? (v/1000)+'k' : v } }, 
                    y1: { type: 'linear', position: 'right', beginAtZero: true, grace: '25%', grid: { drawOnChartArea: false }, ticks: { font: { family: 'Sarabun' } } } 
                } 
            }
        });
    }, 50);
}
