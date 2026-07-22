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
    const channelRateLabel = (installed, contacted) => contacted > 0 ? `${Math.round((installed / contacted) * 100)}%` : '—';
    
    const tech = cd.tech;
    const technicianCount = tech.teamSize || 0;
    const installsPerTechnician = technicianCount > 0 ? totalInstalls / technicianCount : 0;
    const totalDamageValue = tech.techIssueValue + tech.filmIssueValue;
    const totalDamageCount = tech.filmIssueCount + tech.techIssueCount;
    const techDamagePercentSales = sales.actual > 0 ? (tech.techIssueValue / sales.actual) * 100 : 0;
    const damagePercentSales = sales.actual > 0 ? (totalDamageValue / sales.actual) * 100 : 0;
    const isDamageOverLimit = techDamagePercentSales > 5;

    let insightType = 'good';
    if (isDamageOverLimit) insightType = 'high_damage';
    else if (!isSalesOverTarget) insightType = 'low_sales';

    container.innerHTML = `
        <div class="car-sales-dashboard">
        <div class="car-page-head">
            <div class="car-title-row">
                <button type="button" id="car-sidebar-toggle" class="car-sidebar-toggle" onclick="toggleDesktopSidebar()" aria-label="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}" title="${isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู'}">
                    <i id="car-sidebar-toggle-icon" data-lucide="${isDesktopSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'}" class="w-5 h-5"></i>
                </button>
                <div class="car-title-block">
                    <h2>ฝ่ายขาย ฟิล์มรถยนต์</h2>
                    <p>สรุปประสิทธิภาพฝ่ายขายฟิล์มรถยนต์รายสัปดาห์</p>
                </div>
            </div>
        <div class="page-head-actions">
            <label class="car-week-select">
                <i data-lucide="calendar-days" class="w-5 h-5"></i>
                <select onchange="handleWeekChange(event)" aria-label="เลือกสัปดาห์">${opt}</select>
                <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </label>
            ${renderFullscreenButton()}
        </div>
        </div>
        <!-- Filter Section -->
        <div class="car-sales-filter flex items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <i data-lucide="filter" class="w-5 h-5 text-slate-400 ml-2"></i>
            <span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span>
            <select onchange="handleWeekChange(event)" class="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700 text-base font-bold rounded-xl p-2 w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">${opt}</select>
        </div>

        <section class="car-reference-summary">
            <article class="car-reference-kpi is-week">
                <div class="car-reference-kpi-head"><h3>ยอดขายรายสัปดาห์ <span>(Current Week)</span></h3><i data-lucide="bar-chart-3"></i></div>
                <strong>${formatBaht(sales.actual)}</strong>
                <div class="car-reference-progress"><span style="width:${Math.min(salesProgress, 100)}%"></span></div>
                <div class="car-reference-kpi-meta"><b>↑ ผลงาน ${salesProgress.toFixed(1)}%</b><span>เป้า ${formatBaht(sales.target)}</span></div>
            </article>
            <article class="car-reference-kpi is-month">
                <div class="car-reference-kpi-head"><h3>ยอดขายรายเดือน <span>(Current Month) ${monthGroup}</span></h3><i data-lucide="calendar-days"></i></div>
                <strong>${formatBaht(monthlyCarActual)}</strong>
                <div class="car-reference-progress"><span style="width:${Math.min(monthlyCarProgress, 100)}%"></span></div>
                <div class="car-reference-kpi-meta"><b>${monthlyCarActual >= monthlyCarTarget ? '↑' : '↓'} ผลงาน ${monthlyCarProgress.toFixed(1)}%</b><span>เป้า ${formatBaht(monthlyCarTarget)}</span></div>
            </article>
            <article class="car-reference-kpi is-ytd">
                <div class="car-reference-kpi-head"><h3>ยอดขายสะสมปีนี้ <span>(TOTAL YTD)</span></h3><i data-lucide="crown"></i></div>
                <strong>${formatBaht(ytdCarActual)}</strong>
                <div class="car-reference-progress"><span style="width:${Math.min(ytdProgressVsYearly, 100)}%"></span></div>
                <div class="car-reference-kpi-meta"><b>↑ ผลงาน ${ytdProgressVsYearly.toFixed(1)}%</b><span>เป้า ${formatBaht(YEARLY_CAR_TARGET)}</span></div>
            </article>
        </section>

        <section class="car-reference-performance">
            <div class="car-reference-section-head"><h2>ประสิทธิภาพฝ่ายขาย <span>(Sales Performance)</span></h2></div>
            <div class="car-reference-performance-grid">
                <article class="car-reference-performance-card">
                    <h3><i data-lucide="megaphone"></i> 1. การติดต่อลูกค้า</h3>
                    <strong>${formatNumber(contacts.total)} <small>คน</small></strong>
                    <div class="car-reference-mini-grid"><span><span class="car-reference-mini-label is-line"><i data-lucide="message-circle"></i>LINE OA</span><b>${formatNumber(contacts.line)}</b></span><span><span class="car-reference-mini-label is-facebook"><i data-lucide="messages-square"></i>Facebook</span><b>${formatNumber(contacts.fb)}</b></span><span><span class="car-reference-mini-label is-phone"><i data-lucide="phone"></i>โทรเข้า</span><b>${formatNumber(contacts.tel)}</b></span></div>
                </article>
                <article class="car-reference-performance-card">
                    <h3><i data-lucide="car"></i> 2. ปริมาณรถติดตั้งใหม่</h3>
                    <div class="car-reference-split-value"><strong>${formatNumber(totalInstalls)} <small>คัน</small></strong><span>% ความสำเร็จ <b>${formatPercent(convRate)}</b></span></div>
                    <div class="car-reference-mini-grid"><span><span class="car-reference-mini-label is-line"><i data-lucide="message-circle"></i>LINE OA</span><div class="car-reference-channel-value"><b>${formatNumber(installs.line)}</b><em>${channelRateLabel(installs.line, contacts.line)}</em></div></span><span><span class="car-reference-mini-label is-facebook"><i data-lucide="messages-square"></i>Facebook</span><div class="car-reference-channel-value"><b>${formatNumber(installs.fb)}</b><em>${channelRateLabel(installs.fb, contacts.fb)}</em></div></span><span><span class="car-reference-mini-label is-phone"><i data-lucide="phone"></i>โทรเข้า</span><div class="car-reference-channel-value"><b>${formatNumber(installs.tel)}</b><em>${channelRateLabel(installs.tel, contacts.tel)}</em></div></span><span><span class="car-reference-mini-label is-walkin"><i data-lucide="user-round"></i>Walk-In</span><div class="car-reference-channel-value"><b>${formatNumber(installs.walkin)}</b><em>—</em></div></span></div>
                </article>
                <article class="car-reference-performance-card">
                    <h3><i data-lucide="wrench"></i> 3. ประสิทธิภาพช่าง</h3>
                    <div class="car-reference-tech-count"><strong>${formatNumber(technicianCount)} <small>คน</small></strong></div>
                    <div class="car-reference-tech-average">เฉลี่ย ${installsPerTechnician.toFixed(1)} คัน ต่อช่าง 1 คน</div>
                </article>
                <article class="car-reference-performance-card is-analysis">
                    <h3><i data-lucide="line-chart"></i> 4. วิเคราะห์ยอดขาย</h3>
                    <strong>${formatBaht(Math.abs(sales.actual - sales.target))}</strong>
                    <p>แนะนำให้วิเคราะห์จำนวนลูกค้าจาก Marketing หรือเพิ่มโปรโมชั่นเพื่อกระตุ้นการตัดสินใจ</p>
                </article>
            </div>
        </section>

        <section class="car-reference-bottom-grid">
            <article class="car-reference-panel car-reference-monthly-panel">
                <div class="car-reference-panel-head"><h2><i data-lucide="trending-up"></i> ยอดขายรายเดือนเทียบเป้า</h2><span>รายเดือน</span></div>
                <div class="car-reference-monthly-chart-wrap"><canvas id="carReferenceMonthlyChartCanvas"></canvas></div>
            </article>

            <article class="car-reference-panel car-reference-damage-panel">
                <div class="car-reference-panel-head"><h2><i data-lucide="alert-triangle"></i> การวิเคราะห์ความเสียหาย</h2></div>
                <div class="car-reference-damage-kpis">
                    <div><span><i data-lucide="triangle-alert"></i> รถเคลม</span><strong>${formatNumber(tech.claims)} <small>คัน</small></strong></div>
                    <div><span><i data-lucide="triangle-alert"></i> ความเสียหายรวม</span><strong>${damagePercentSales.toFixed(2)}%</strong></div>
                </div>
                <div class="car-reference-damage-cards">
                    <article class="car-reference-damage-card">
                        <span>จากฟิล์ม</span>
                        <strong>${formatNumber(tech.filmIssueCount)} <small>งาน</small></strong>
                        <b>${formatBaht(tech.filmIssueValue)}</b>
                    </article>
                    <article class="car-reference-damage-card is-red">
                        <span>จากช่าง</span>
                        <strong>${formatNumber(tech.techIssueCount)} <small>งาน</small></strong>
                        <b>${formatBaht(tech.techIssueValue)}</b>
                    </article>
                    <article class="car-reference-damage-card is-total">
                        <span>รวมความเสียหาย</span>
                        <strong>${formatNumber(totalDamageCount)} <small>งาน</small></strong>
                        <b>${formatBaht(totalDamageValue)}</b>
                    </article>
                </div>
            </article>

            <article class="car-reference-panel car-reference-channel-panel">
                <div class="car-reference-panel-head"><h2><i data-lucide="pie-chart"></i> รถติดตั้งใหม่แต่ละช่องทาง</h2></div>
                <div class="car-reference-channel-chart-wrap"><canvas id="carReferenceInstallChannelChartCanvas"></canvas></div>
            </article>
        </section>

        <!-- Section 1: YTD Hero Cards -->
        <div class="car-sales-section-title flex items-center gap-3 mb-6 shrink-0 mt-2">
            <h3 class="font-black text-slate-800 text-2xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="target" class="text-emerald-600 w-7 h-7"></i> เป้าหมายสะสมปีนี้ (YTD Goals)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <div class="car-sales-hero-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
            <!-- 0. Monthly Sales vs Target -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="calendar" class="w-40 h-40 text-violet-600"></i></div>
                <div class="flex justify-between items-center mb-1 relative z-10">
                    <p class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><i data-lucide="calendar" class="w-4 h-4 text-violet-500"></i> ยอดขายรายเดือน</p>
                    <span class="px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-sm font-black border border-violet-100">${monthGroup}</span>
                </div>
                <h3 class="text-4xl lg:text-5xl font-black ${isMonthlyOverTarget ? 'text-emerald-500' : 'text-violet-600'} mt-2 mb-1 relative z-10 tracking-tighter">${isMonthlyOverTarget ? '⭐ ' : ''}${formatPercent(monthlyCarProgress)}</h3>
                <p class="text-2xl font-black text-slate-800 mb-3 relative z-10">${formatBaht(monthlyCarActual)}</p>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative z-10 mb-4">
                    <div class="${isMonthlyOverTarget ? 'bg-emerald-500' : 'bg-violet-500'} h-full rounded-full transition-all" style="width:${Math.min(monthlyCarProgress, 100)}%"></div>
                </div>
                <div class="flex justify-between items-center border-t border-slate-100 pt-3 relative z-10">
                    <div>
                        <p class="text-xs text-slate-400 font-bold uppercase mb-0.5">เป้าเดือนนี้</p>
                        <p class="text-base font-black text-slate-700">${formatBaht(monthlyCarTarget)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 font-bold uppercase mb-0.5">${monthlyCarActual >= monthlyCarTarget ? 'ทะลุเป้า' : 'ขาดอีก'}</p>
                        <p class="text-base font-black ${isMonthlyOverTarget ? 'text-emerald-500' : 'text-rose-500'}">${formatBaht(Math.abs(monthlyCarTarget - monthlyCarActual))}</p>
                    </div>
                </div>
            </div>

            <!-- 1. YTD Sales -->
            <div class="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center relative overflow-hidden text-white">
                <div class="absolute -right-4 -bottom-4 opacity-10 pointer-events-none"><i data-lucide="wallet" class="w-40 h-40"></i></div>
                <p class="text-sm font-bold text-emerald-200 uppercase tracking-widest mb-1 flex items-center gap-2 relative z-10"><i data-lucide="wallet" class="w-5 h-5 text-emerald-300"></i> ยอดขายสะสม (Total YTD)</p>
                <h2 class="text-5xl lg:text-6xl font-black mt-2 mb-4 relative z-10 tracking-tighter">${formatBaht(ytdCarActual)}</h2>
                <div class="w-full bg-black/20 h-2 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="bg-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" style="width:${Math.min(ytdProgressVsTarget, 100)}%"></div>
                </div>
                <div class="flex justify-between items-center text-sm font-bold relative z-10">
                    <span class="text-emerald-100">เป้าสะสม: ${formatBaht(ytdCarTarget)}</span>
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

        <div class="car-sales-section-title flex items-center gap-3 mb-6 shrink-0 mt-4">
            <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="car" class="text-teal-500 w-6 h-6"></i> ผลงานประจำสัปดาห์ (Weekly Performance)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <!-- Section 2: Weekly Deep Dive (Grid) -->
        <div class="car-sales-week-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 shrink-0">
            
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
                    <h3 class="text-4xl font-black text-slate-900 tracking-tighter">${formatBaht(sales.actual)}</h3>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="${isSalesOverTarget ? 'bg-emerald-500' : 'bg-slate-400'} h-full rounded-full" style="width:${Math.min(salesProgress, 100)}%"></div>
                </div>
                <div class="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2 relative z-10">
                    <span>เป้า: ${formatBaht(sales.target)}</span>
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
                            <p class="text-sm font-bold text-rose-500">${formatBaht(tech.filmIssueValue)}</p>
                        </div>
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p class="text-xs font-bold text-slate-500 uppercase mb-1">จากช่าง</p>
                            <p class="text-xl font-black text-slate-800 mb-1">${formatCurrency(tech.techIssueCount)} <span class="text-sm font-normal">บาน</span></p>
                            <p class="text-sm font-bold text-rose-500">${formatBaht(tech.techIssueValue)}</p>
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
        <div class="car-sales-chart-grid grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 shrink-0 mt-4">
            <!-- Chart -->
            <div class="car-sales-chart-card lg:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col shrink-0">
                <div class="flex items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                    <div class="flex items-center gap-4 shrink-0">
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0 flex items-center"><i data-lucide="trending-up" class="w-5 h-5 text-blue-700 mr-2"></i> ยอดขายรายเดือนเทียบเป้า</h3>
                    </div>
                    <span class="car-chart-mode-pill">รายเดือน</span>
                </div>
                <div class="flex-1 w-full min-h-[350px] relative"><canvas id="carTrendChartCanvas"></canvas></div>
            </div>
            
            <!-- Executive Insights -->
            <div class="car-sales-insights-card bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
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
                            <p class="text-2xl font-black ${isSalesOverTarget ? 'text-emerald-600' : 'text-red-600'}">${isSalesOverTarget ? '+' : '-'}${formatBaht(Math.abs(sales.actual - sales.target))}</p>
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
                            : `ยอดขายสัปดาห์นี้ยังต่ำกว่าเป้าหมาย <b class="text-amber-600">${formatBaht(sales.target - sales.actual)}</b> แนะนำให้ตรวจสอบจำนวนคนทักจาก Marketing หรือเพิ่มโปรโมชั่นกระตุ้นการตัดสินใจ (Conversion Rate: ${convRate.toFixed(1)}%)`)}
                </div>
            </div>
        </div>
        <section class="car-sales-year-weekly-card bg-white border border-slate-200 shadow-sm">
            <div class="car-sales-year-weekly-head">
                <h3><i data-lucide="bar-chart-3" class="w-5 h-5 text-blue-700"></i> ยอดขายราย Week ปีนี้</h3>
                <span>ยอดขายจริงเทียบเป้าหมายรายสัปดาห์</span>
            </div>
            <div class="car-sales-year-weekly-wrap">
                <canvas id="carYearWeeklyChartCanvas"></canvas>
            </div>
        </section>
        </div>
    `;
    setTimeout(() => {
        const ctx = document.getElementById('carTrendChartCanvas')?.getContext('2d');
        if(!ctx) return;
        if (charts['carTrend']) charts['carTrend'].destroy();
        let labels = [];
        let actualData = [];
        let targetData = [];
        let actualLabel = 'ยอดขายจริง';
        let targetLabel = 'เป้าหมายสัปดาห์';

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
            actualLabel = 'ยอดขายจริงรายเดือน';
            targetLabel = 'เป้าหมายรายเดือน';
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
                    { type: 'bar', label: actualLabel, data: actualData, backgroundColor: '#2563eb', borderRadius: 4, barPercentage: 0.6, order: 2 },
                    { type: 'line', label: targetLabel, data: targetData, borderColor: '#93c5fd', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#93c5fd', tension: 0.1, order: 1 }
                ] 
            },
            options: { 
                layout: { padding: { top: 30 } },
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatBaht(c.parsed.y)}` } } },
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { family: 'Sarabun', size: 12, weight: '700' } } },
                    y: { type: 'linear', position: 'left', beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { family: 'Sarabun', size: 12, weight: '700' }, callback: (v) => v >= 1000 ? (v/1000)+'k' : v } }
                }
            },
            plugins: [createProgressPlugin(false)]
        });

        const referenceMonthlyCtx = document.getElementById('carReferenceMonthlyChartCanvas')?.getContext('2d');
        if (referenceMonthlyCtx) {
            if (charts['carReferenceMonthly']) charts['carReferenceMonthly'].destroy();

            const referenceMonthlyMap = {};
            dashboardData.forEach(d => {
                if (!d.carDetail?.sales) return;
                const label = extractMonthGroup(d.dateRange);
                if (!referenceMonthlyMap[label]) {
                    referenceMonthlyMap[label] = { label, actual: 0, target: 0 };
                }
                referenceMonthlyMap[label].actual += d.carDetail.sales.actual || 0;
                referenceMonthlyMap[label].target += d.carDetail.sales.target || 0;
            });
            const referenceYear = String(current.dateRange || '').match(/20\d{2}|25\d{2}/)?.[0] || String(new Date().getFullYear());
            const referenceMonthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
                .map(month => `${month} ${referenceYear}`);
            const referenceMonthlyData = referenceMonthLabels.map(label => referenceMonthlyMap[label] || { label, actual: 0, target: 0 });

            charts['carReferenceMonthly'] = new Chart(referenceMonthlyCtx, {
                type: 'bar',
                data: {
                    labels: referenceMonthlyData.map(d => d.label),
                    datasets: [
                        { type: 'bar', label: 'ยอดขายจริงรายเดือน', data: referenceMonthlyData.map(d => d.actual), backgroundColor: '#2563eb', borderRadius: 2, barPercentage: 0.58, order: 2 },
                        { type: 'line', label: 'เป้าหมายรายเดือน', data: referenceMonthlyData.map(d => d.target), borderColor: '#93c5fd', backgroundColor: 'transparent', borderWidth: 2, borderDash: [4, 4], pointBackgroundColor: '#93c5fd', tension: 0.1, order: 1 }
                    ]
                },
                options: {
                    layout: { padding: { top: 28, left: 2, right: 2 } },
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', size: 12, weight: '700' }, usePointStyle: true, boxWidth: 9 } },
                        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatBaht(c.parsed.y)}` } }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 35, minRotation: 35, font: { family: 'Sarabun', size: 11, weight: '700' } } },
                        y: { beginAtZero: true, grace: '20%', grid: { color: '#eef2f7', drawBorder: false }, ticks: { font: { family: 'Sarabun', size: 11, weight: '700' }, callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v } }
                    }
                },
                plugins: [createProgressPlugin(false)]
            });
        }

        const installChannelCtx = document.getElementById('carReferenceInstallChannelChartCanvas')?.getContext('2d');
        if (installChannelCtx) {
            if (charts['carInstallChannels']) charts['carInstallChannels'].destroy();

            const installChannels = [
                { label: 'LINE OA', value: installs.line || 0, color: '#16a34a' },
                { label: 'Facebook', value: installs.fb || 0, color: '#1877f2' },
                { label: 'โทรเข้า', value: installs.tel || 0, color: '#1d4ed8' },
                { label: 'Walk-In', value: installs.walkin || 0, color: '#7c3aed' },
                { label: 'ShowRoom', value: installs.showroom || 0, color: '#f59e0b' },
                { label: 'อื่นๆ', value: installs.other || 0, color: '#94a3b8' }
            ];

            charts['carInstallChannels'] = new Chart(installChannelCtx, {
                type: 'pie',
                data: {
                    labels: installChannels.map(channel => channel.label),
                    datasets: [{
                        data: installChannels.map(channel => channel.value),
                        backgroundColor: installChannels.map(channel => channel.color),
                        borderColor: '#fff',
                        borderWidth: 3,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { family: 'Sarabun', size: 11, weight: '700' }, usePointStyle: true, boxWidth: 9, padding: 10 }
                        },
                        tooltip: {
                            callbacks: {
                                label: context => `${context.label}: ${formatNumber(context.parsed)} คัน`
                            }
                        }
                    }
                }
            });
        }

        const yearWeeklyCtx = document.getElementById('carYearWeeklyChartCanvas')?.getContext('2d');
        if (yearWeeklyCtx) {
            if (charts['carYearWeekly']) charts['carYearWeekly'].destroy();

            const currentYear = String(current.dateRange || '').match(/\b20\d{2}\b/)?.[0] || '';
            const yearWeeklyData = dashboardData
                .filter(d => {
                    if (!d.carDetail?.sales) return false;
                    if (!currentYear) return true;
                    const range = String(d.dateRange || '');
                    return !/\b20\d{2}\b/.test(range) || range.includes(currentYear);
                })
                .map(d => ({
                    label: d.week,
                    actual: d.carDetail.sales.actual || 0,
                    target: d.carDetail.sales.target || 0
                }))
                .filter(d => d.actual + d.target > 0);

            charts['carYearWeekly'] = new Chart(yearWeeklyCtx, {
                type: 'bar',
                data: {
                    labels: yearWeeklyData.map(d => d.label),
                    datasets: [
                        { type: 'bar', label: 'ยอดขายจริง', data: yearWeeklyData.map(d => d.actual), backgroundColor: '#2563eb', borderRadius: 4, barPercentage: 0.58, order: 2 },
                        { type: 'line', label: 'เป้าหมายราย Week', data: yearWeeklyData.map(d => d.target), borderColor: '#93c5fd', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#93c5fd', tension: 0.1, order: 1 }
                    ]
                },
                options: {
                    layout: { padding: { top: 30 } },
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', size: 13, weight: '700' }, usePointStyle: true, boxWidth: 10 } },
                        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatBaht(c.parsed.y)}` } }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { family: 'Sarabun', size: 12, weight: '700' } } },
                        y: { beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { family: 'Sarabun', size: 12, weight: '700' }, callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v } }
                    }
                },
                plugins: [createProgressPlugin(false)]
            });
        }
    }, 50);
}

// ==========================================
// RENDER: MARKETING (Redesigned - Modern & Clean Layout)
// ==========================================
