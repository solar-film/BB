// Render: Car film page.
function renderCarDeepDiveHTML(current, m, opt, container) {
    const cd = current.carDetail;
    if(!cd) return;
    const YEARLY_CAR_TARGET = 10000000;
    const cIdx = dashboardData.findIndex(d => d.id === current.id);
    const prev = cIdx > 0 ? dashboardData[cIdx - 1] : null;
    const ytdData = dashboardData.slice(0, cIdx + 1);
    
    const ytdCarActual = ytdData.reduce((sum, d) => sum + d.carDetail.sales.actual, 0);
    const ytdCarTarget = ytdData.reduce((sum, d) => sum + d.carDetail.sales.target, 0);
    const ytdProgressVsTarget = ytdCarTarget > 0 ? (ytdCarActual / ytdCarTarget) * 100 : 0;
    const ytdProgressVsYearly = (ytdCarActual / YEARLY_CAR_TARGET) * 100;

    // Monthly car sales (เดือนตามสัปดาห์ที่เลือก)
    const monthGroup = extractMonthGroup(current.dateRange);
    const monthlyCarData = dashboardData.filter(d => extractMonthGroup(d.dateRange) === monthGroup);
    const monthlyCarActual = monthlyCarData.reduce((sum, d) => sum + d.carDetail.sales.actual, 0);
    const monthlyCarTarget = monthlyCarData.reduce((sum, d) => sum + d.carDetail.sales.target, 0);
    const monthlyCarProgress = monthlyCarTarget > 0 ? (monthlyCarActual / monthlyCarTarget) * 100 : 0;
    const isMonthlyOverTarget = monthlyCarActual >= monthlyCarTarget;

    const sales = cd.sales;
    const salesProgress = sales.target > 0 ? (sales.actual / sales.target) * 100 : 0;
    const isSalesOverTarget = sales.actual >= sales.target;
    
    const prevSales = prev ? prev.carDetail.sales.actual : 0;
    const salesGrowth = prevSales > 0 ? ((sales.actual - prevSales) / prevSales) * 100 : 0;

    const installs = cd.installs;
    const totalInstalls = installs.total || (installs.line + installs.fb + installs.tel + installs.walkin + installs.showroom + installs.other);
    const contacts = cd.contacts;
    const convRate = contacts.total > 0 ? (totalInstalls / contacts.total) * 100 : 0;
    
    const tech = cd.tech;
    const totalDamageValue = tech.techIssueValue + tech.filmIssueValue;
    const techDamagePercentSales = sales.actual > 0 ? (tech.techIssueValue / sales.actual) * 100 : 0;
    const damagePercentSales = sales.actual > 0 ? (totalDamageValue / sales.actual) * 100 : 0;
    const isDamageOverLimit = techDamagePercentSales > 5;

    let insightType = 'good';
    if (isDamageOverLimit) insightType = 'high_damage';
    else if (!isSalesOverTarget) insightType = 'low_sales';

    container.innerHTML = `
        <!-- Filter Section -->
        <div class="flex items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <i data-lucide="filter" class="w-5 h-5 text-slate-400 ml-2"></i>
            <span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span>
            <select onchange="handleWeekChange(event)" class="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700 text-base font-bold rounded-xl p-2 w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">${opt}</select>
        </div>
        
        <!-- Section 1: YTD Hero Cards -->
        <div class="flex items-center gap-3 mb-6 shrink-0 mt-2">
            <h3 class="font-black text-slate-800 text-2xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="target" class="text-emerald-600 w-7 h-7"></i> เป้าหมายสะสมปีนี้ (YTD Goals)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
            <!-- 0. Monthly Sales vs Target -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="calendar" class="w-40 h-40 text-violet-600"></i></div>
                <div class="flex justify-between items-center mb-1 relative z-10">
                    <p class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><i data-lucide="calendar" class="w-4 h-4 text-violet-500"></i> ยอดขายรายเดือน</p>
                    <span class="px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-sm font-black border border-violet-100">${monthGroup}</span>
                </div>
                <h3 class="text-4xl lg:text-5xl font-black ${isMonthlyOverTarget ? 'text-emerald-500' : 'text-violet-600'} mt-2 mb-1 relative z-10 tracking-tighter">${isMonthlyOverTarget ? '⭐ ' : ''}${formatPercent(monthlyCarProgress)}</h3>
                <p class="text-2xl font-black text-slate-800 mb-3 relative z-10">฿${formatCurrency(monthlyCarActual)}</p>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative z-10 mb-4">
                    <div class="${isMonthlyOverTarget ? 'bg-emerald-500' : 'bg-violet-500'} h-full rounded-full transition-all" style="width:${Math.min(monthlyCarProgress, 100)}%"></div>
                </div>
                <div class="flex justify-between items-center border-t border-slate-100 pt-3 relative z-10">
                    <div>
                        <p class="text-xs text-slate-400 font-bold uppercase mb-0.5">เป้าเดือนนี้</p>
                        <p class="text-base font-black text-slate-700">฿${formatCurrency(monthlyCarTarget)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 font-bold uppercase mb-0.5">${monthlyCarActual >= monthlyCarTarget ? 'ทะลุเป้า' : 'ขาดอีก'}</p>
                        <p class="text-base font-black ${isMonthlyOverTarget ? 'text-emerald-500' : 'text-rose-500'}">฿${formatCurrency(Math.abs(monthlyCarTarget - monthlyCarActual))}</p>
                    </div>
                </div>
            </div>

            <!-- 1. YTD Sales -->
            <div class="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center relative overflow-hidden text-white">
                <div class="absolute -right-4 -bottom-4 opacity-10 pointer-events-none"><i data-lucide="wallet" class="w-40 h-40"></i></div>
                <p class="text-sm font-bold text-emerald-200 uppercase tracking-widest mb-1 flex items-center gap-2 relative z-10"><i data-lucide="wallet" class="w-5 h-5 text-emerald-300"></i> ยอดขายสะสม (Total YTD)</p>
                <h2 class="text-5xl lg:text-6xl font-black mt-2 mb-4 relative z-10 tracking-tighter">฿${formatCurrency(ytdCarActual)}</h2>
                <div class="w-full bg-black/20 h-2 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="bg-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" style="width:${Math.min(ytdProgressVsTarget, 100)}%"></div>
                </div>
                <div class="flex justify-between items-center text-sm font-bold relative z-10">
                    <span class="text-emerald-100">เป้าสะสม: ฿${formatCurrency(ytdCarTarget)}</span>
                    <span class="text-emerald-300">${ytdProgressVsTarget >= 100 ? '⭐ ทะลุเป้า' : ''} ${ytdProgressVsTarget.toFixed(1)}%</span>
                </div>
            </div>

            <!-- 2. Yearly Goal -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="flag" class="w-40 h-40 text-blue-600"></i></div>
                <div class="flex justify-between items-center mb-1 relative z-10">
                    <p class="text-sm font-black text-slate-400 uppercase tracking-widest">% ยอดขายเทียบเป้าทั้งปี</p>
                    <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-black border border-slate-200">เป้า 10 ล้าน</span>
                </div>
                <h3 class="text-6xl font-black text-blue-600 mt-2 mb-4 relative z-10 tracking-tighter">${ytdProgressVsYearly.toFixed(1)}%</h3>
                <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
                    <div class="bg-blue-500 h-full rounded-full" style="width:${Math.min(ytdProgressVsYearly,100)}%"></div>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-3 mb-6 shrink-0 mt-4">
            <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="car" class="text-teal-500 w-6 h-6"></i> ผลงานประจำสัปดาห์ (Weekly Performance)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <!-- Section 2: Weekly Deep Dive (Grid) -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 shrink-0">
            
            <!-- 1. Weekly Sales -->
            <div class="bg-white rounded-[2rem] p-6 border ${isSalesOverTarget ? 'border-emerald-300 ring-2 ring-emerald-50' : 'border-slate-200'} shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none"><i data-lucide="award" class="w-24 h-24 text-emerald-600"></i></div>
                <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4 relative z-10">
                    <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black shrink-0 border border-emerald-100"><i data-lucide="award" class="w-5 h-5"></i></div>
                    <div>
                        <h4 class="font-black text-slate-800 text-base leading-none">ยอดขายสัปดาห์นี้</h4>
                        <p class="text-xs text-slate-400 font-bold uppercase mt-1">ฟิล์มรถยนต์</p>
                    </div>
                </div>
                <div class="mb-4 text-center relative z-10">
                    <h3 class="text-4xl font-black text-slate-900 tracking-tighter">฿${formatCurrency(sales.actual)}</h3>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="${isSalesOverTarget ? 'bg-emerald-500' : 'bg-slate-400'} h-full rounded-full" style="width:${Math.min(salesProgress, 100)}%"></div>
                </div>
                <div class="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2 relative z-10">
                    <span>เป้า: ฿${formatCurrency(sales.target)}</span>
                    <span class="${isSalesOverTarget ? 'text-emerald-600' : ''}">${salesProgress.toFixed(1)}%</span>
                </div>
            </div>

            <!-- 2. Contacts (Redesigned) -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col">
                <h4 class="font-black text-slate-700 text-lg mb-4 flex items-center gap-2">
                    <i data-lucide="message-circle" class="w-5 h-5 text-blue-500"></i> การติดต่อของลูกค้า
                </h4>
                <div class="bg-[#eff6ff] rounded-2xl p-6 flex flex-col items-center justify-center mb-6 border border-blue-100">
                    <p class="text-sm font-black text-blue-600 mb-1">ปริมาณการติดต่อรวม</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-4xl lg:text-5xl font-black text-blue-600 tracking-tighter">${formatNumber(contacts.total)}</span>
                        <span class="text-sm font-bold text-blue-500">ติดต่อ</span>
                    </div>
                </div>
                <div class="space-y-3 mt-auto">
                    <div class="flex justify-between items-center px-4 py-3 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-50">
                        <span class="flex items-center gap-3 text-base font-bold text-slate-600"><i data-lucide="phone" class="w-4 h-4 text-slate-500"></i> โทรเข้า</span>
                        <span class="text-2xl font-black text-slate-900">${formatCurrency(contacts.tel)}</span>
                    </div>
                    <div class="flex justify-between items-center px-4 py-3 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-50">
                        <span class="flex items-center gap-3 text-base font-bold text-slate-600"><div class="w-3 h-3 rounded-full bg-emerald-500"></div> Line OA</span>
                        <span class="text-2xl font-black text-slate-900">${formatCurrency(contacts.line)}</span>
                    </div>
                    <div class="flex justify-between items-center px-4 py-3 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-50">
                        <span class="flex items-center gap-3 text-base font-bold text-slate-600"><div class="w-3 h-3 rounded-full bg-blue-500"></div> FB Chat</span>
                        <span class="text-2xl font-black text-slate-900">${formatCurrency(contacts.fb)}</span>
                    </div>
                </div>
            </div>

            <!-- 3. Installs Source Grid (Redesigned) -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col">
                <h4 class="font-black text-slate-700 text-lg mb-6 flex items-center gap-2">
                    <i data-lucide="car" class="w-5 h-5 text-indigo-500"></i> ปริมาณรถติดตั้งใหม่
                </h4>
                <div class="flex justify-between items-start mb-8 px-2">
                    <div>
                        <p class="text-sm font-black text-slate-400 mb-1 tracking-widest">ติดตั้งรวม</p>
                        <p class="text-4xl font-black text-slate-900">${formatCurrency(totalInstalls)} <span class="text-base font-bold text-slate-800">คัน</span></p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black text-slate-400 mb-1 tracking-widest">% ความสำเร็จ</p>
                        <p class="text-xl lg:text-2xl font-black ${convRate >= 25 ? 'text-emerald-600' : 'text-amber-600'}">${formatPercent(convRate)}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 mt-auto">
                    <div class="bg-slate-50 px-4 py-3.5 rounded-xl flex justify-between items-center"><span class="text-sm font-bold text-slate-700 flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> LINE</span><span class="text-xl font-black text-slate-900">${formatCurrency(installs.line)}</span></div>
                    <div class="bg-slate-50 px-4 py-3.5 rounded-xl flex justify-between items-center"><span class="text-sm font-bold text-slate-700 flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Facebook</span><span class="text-xl font-black text-slate-900">${formatCurrency(installs.fb)}</span></div>
                    <div class="bg-slate-50 px-4 py-3.5 rounded-xl flex justify-between items-center"><span class="text-sm font-bold text-slate-700 flex items-center gap-2"><i data-lucide="phone" class="w-4 h-4 text-slate-400"></i> โทร</span><span class="text-xl font-black text-slate-900">${formatCurrency(installs.tel)}</span></div>
                    <div class="bg-slate-50 px-4 py-3.5 rounded-xl flex justify-between items-center"><span class="text-sm font-bold text-slate-700 flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4 text-slate-400"></i> Walk-In</span><span class="text-xl font-black text-slate-900">${formatCurrency(installs.walkin)}</span></div>
                    <div class="bg-slate-50 px-4 py-3.5 rounded-xl flex justify-between items-center"><span class="text-sm font-bold text-slate-700 flex items-center gap-2"><i data-lucide="store" class="w-4 h-4 text-slate-400"></i> ShowRoom</span><span class="text-xl font-black text-slate-900">${formatCurrency(installs.showroom)}</span></div>
                    <div class="bg-slate-50 px-4 py-3.5 rounded-xl flex justify-between items-center"><span class="text-sm font-bold text-slate-700 flex items-center gap-2"><i data-lucide="more-horizontal" class="w-4 h-4 text-slate-400"></i> อื่นๆ</span><span class="text-xl font-black text-slate-900">${formatCurrency(installs.other)}</span></div>
                </div>
            </div>

            <!-- 4. Damage Control -->
            <div class="bg-white rounded-[2rem] p-6 border ${isDamageOverLimit?'border-red-300 ring-4 ring-red-50':'border-slate-200'} shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -top-4 opacity-5"><i data-lucide="wrench" class="w-32 h-32 text-slate-600"></i></div>
                <h4 class="text-base font-black text-slate-700 flex items-center justify-between mb-6 relative z-10">
                    <span class="flex items-center gap-2"><i data-lucide="wrench" class="w-5 h-5"></i> ❶ ช่างติดตั้ง</span>
                    <span class="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-black"><i data-lucide="users" class="w-4 h-4 inline"></i> ${tech.teamSize || 0} คน</span>
                </h4>
                <div class="flex items-center gap-4 mb-6 relative z-10">
                    <div class="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <i data-lucide="alert-triangle" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <p class="text-sm font-black text-slate-500 uppercase mb-1">รถเคลม</p>
                        <p class="text-3xl font-black text-slate-900">${formatCurrency(tech.claims)} <span class="text-base font-bold text-slate-500">คัน</span></p>
                    </div>
                </div>
                <div class="space-y-4 relative z-10">
                    <p class="text-sm font-black text-slate-500 uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-4 h-4 text-amber-500"></i> ความเสียหาย</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-500 uppercase mb-1">จากฟิล์ม</p>
                            <p class="text-xl font-black text-slate-800 mb-1">${formatCurrency(tech.filmIssueCount)} <span class="text-sm font-normal">บาน</span></p>
                            <p class="text-sm font-bold text-rose-500">฿${formatCurrency(tech.filmIssueValue)}</p>
                        </div>
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-500 uppercase mb-1">จากช่าง</p>
                            <p class="text-xl font-black text-slate-800 mb-1">${formatCurrency(tech.techIssueCount)} <span class="text-sm font-normal">บาน</span></p>
                            <p class="text-sm font-bold text-rose-500">฿${formatCurrency(tech.techIssueValue)}</p>
                        </div>
                    </div>
                </div>
                <div class="relative z-10 mt-auto pt-6">
                    <div class="bg-${isDamageOverLimit?'red':'emerald'}-50 p-4 rounded-xl border ${isDamageOverLimit?'border-red-200':'border-emerald-200'}">
                        <span class="text-xs font-bold ${isDamageOverLimit?'text-red-600':'text-emerald-700'} uppercase block mb-1">% ความเสียหายจากช่าง</span>
                        <span class="text-xl font-black ${isDamageOverLimit?'text-red-600':'text-emerald-600'}">${techDamagePercentSales.toFixed(2)}%</span>
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
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0 flex items-center"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-500 mr-2"></i> ${carTrendTimeframe === 'monthly' ? 'ยอดขายรายเดือนเทียบเป้า' : 'แนวโน้มยอดขายฟิล์มรถยนต์ (12 สัปดาห์)'}</h3>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 bg-slate-100 p-1 rounded-full">
                        <button onclick="changeCarTrendTimeframe('weekly')" class="px-4 py-1.5 rounded-full text-sm font-black transition-all ${carTrendTimeframe === 'weekly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">12 สัปดาห์</button>
                        <button onclick="changeCarTrendTimeframe('monthly')" class="px-4 py-1.5 rounded-full text-sm font-black transition-all ${carTrendTimeframe === 'monthly' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}">รายเดือนเทียบเป้า</button>
                    </div>
                </div>
                <div class="flex-1 w-full min-h-[350px] relative"><canvas id="carTrendChartCanvas"></canvas></div>
            </div>
            
            <!-- Executive Insights -->
            <div class="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="lightbulb" class="w-64 h-64 text-emerald-600"></i></div>
                <h3 class="font-black text-slate-800 flex items-center gap-2 text-xl uppercase tracking-tight mb-6 relative z-10">
                    <i data-lucide="lightbulb" class="text-amber-500 w-6 h-6"></i> วิเคราะห์ฟิล์มรถยนต์
                </h3>
                
                <div class="flex flex-col gap-4 relative z-10 mb-6 flex-1">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-emerald-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Growth (เทียบวีคก่อน)</p>
                            <p class="text-xl lg:text-2xl font-black ${salesGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}">${salesGrowth >= 0 ? '↑' : '↓'} ${formatPercent(Math.abs(salesGrowth))}</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${salesGrowth >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="trending-${salesGrowth >= 0 ? 'up' : 'down'}" class="w-6 h-6"></i></div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-emerald-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">ส่วนต่างเป้าสัปดาห์นี้</p>
                            <p class="text-2xl font-black ${isSalesOverTarget ? 'text-emerald-600' : 'text-red-600'}">${isSalesOverTarget ? '+' : '-'}${formatCurrency(Math.abs(sales.actual - sales.target))} ฿</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${isSalesOverTarget ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="target" class="w-6 h-6"></i></div>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-emerald-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">% ความเสียหาย (ยอดขาย)</p>
                            <p class="text-xl lg:text-2xl font-black ${isDamageOverLimit ? 'text-red-600' : 'text-emerald-600'}">${techDamagePercentSales.toFixed(2)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${isDamageOverLimit ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center shrink-0"><i data-lucide="shield-alert" class="w-6 h-6"></i></div>
                    </div>
                </div>

                <div class="mt-auto p-5 ${insightType === 'good' ? 'bg-emerald-50/50 border-emerald-100' : (insightType === 'high_damage' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100')} rounded-2xl border text-sm leading-relaxed text-slate-800 font-medium relative z-10 flex flex-col justify-center">
                    <b class="${insightType === 'good' ? 'text-emerald-600' : (insightType === 'high_damage' ? 'text-red-600' : 'text-amber-600')} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์:</b> 
                    ${insightType === 'good' 
                        ? `ยอดเยี่ยม! ฟิล์มรถยนต์สามารถทำยอดขายได้ทะลุเป้าหมาย <b class="text-emerald-700">(${salesProgress.toFixed(1)}%)</b> โดยมีอัตราการเปลี่ยนลูกค้า (Conversion) อยู่ที่ <b class="text-emerald-700">${convRate.toFixed(1)}%</b> และควบคุมความเสียหายได้ดี` 
                        : (insightType === 'high_damage' 
                            ? `แจ้งเตือน! อัตราความเสียหายเกินเกณฑ์ 5% โดยสัปดาห์นี้อยู่ที่ <b class="text-red-600">${techDamagePercentSales.toFixed(2)}%</b> แนะนำให้เร่งตรวจสอบมาตรฐานงานติดตั้งของทีมช่างฟิล์มรถยนต์`
                            : `ยอดขายสัปดาห์นี้ยังต่ำกว่าเป้าหมาย <b class="text-amber-600">${formatCurrency(sales.target - sales.actual)} ฿</b> แนะนำให้ตรวจสอบจำนวนคนทักจาก Marketing หรือเพิ่มโปรโมชั่นกระตุ้นการตัดสินใจ (Conversion Rate: ${convRate.toFixed(1)}%)`)}
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        const ctx = document.getElementById('carTrendChartCanvas')?.getContext('2d');
        if(!ctx) return;
        if (charts['carTrend']) charts['carTrend'].destroy();
        let labels = [];
        let actualData = [];
        let targetData = [];
        let actualLabel = 'ยอดขายจริง (฿)';
        let targetLabel = 'เป้าหมายสัปดาห์ (฿)';

        if (carTrendTimeframe === 'monthly') {
            const monthlyDataMap = {};
            const monthsOrder = [];

            dashboardData.forEach(d => {
                if (!d.carDetail?.sales) return;
                const monthGroup = extractMonthGroup(d.dateRange);
                if (!monthlyDataMap[monthGroup]) {
                    monthlyDataMap[monthGroup] = { label: monthGroup, actual: 0, target: 0 };
                    monthsOrder.push(monthGroup);
                }
                monthlyDataMap[monthGroup].actual += d.carDetail.sales.actual || 0;
                monthlyDataMap[monthGroup].target += d.carDetail.sales.target || 0;
            });

            const monthlyData = monthsOrder
                .map(month => monthlyDataMap[month])
                .filter(d => (d.actual + d.target) > 0);

            labels = monthlyData.map(d => d.label);
            actualData = monthlyData.map(d => d.actual);
            targetData = monthlyData.map(d => d.target);
            actualLabel = 'ยอดขายจริงรายเดือน (฿)';
            targetLabel = 'เป้าหมายรายเดือน (฿)';
        } else {
            const recentData = dashboardData.filter(d => d.carDetail?.sales?.actual > 0).slice(-12);
            labels = recentData.map(d => d.week);
            actualData = recentData.map(d => d.carDetail.sales.actual);
            targetData = recentData.map(d => d.carDetail.sales.target);
        }

        charts['carTrend'] = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [
                    { type: 'bar', label: actualLabel, data: actualData, backgroundColor: '#10b981', borderRadius: 4, barPercentage: 0.6, order: 2 }, 
                    { type: 'line', label: targetLabel, data: targetData, borderColor: '#94a3b8', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#94a3b8', tension: 0.1, order: 1 }
                ] 
            },
            options: { 
                layout: { padding: { top: 30 } },
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ฿${formatCurrency(c.parsed.y)}` } } },
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } }, 
                    y: { type: 'linear', position: 'left', beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { weight: 'bold' }, callback: (v) => v >= 1000 ? (v/1000)+'k' : v } } 
                }
            },
            plugins: [createProgressPlugin(false)]
        });
    }, 50);
}

// ==========================================
// RENDER: MARKETING (Redesigned - Modern & Clean Layout)
// ==========================================
