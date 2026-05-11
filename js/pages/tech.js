// Render: Building technician page.
function renderTechDeepDiveHTML(current, m, opt, container) {
    const t = current.tech;
    const YEARLY_INSTALL_TARGET = 2640;
    const YEARLY_AREA_TARGET = 792000;
    
    const cIdx = dashboardData.findIndex(d => d.id === current.id);
    const prev = cIdx > 0 ? dashboardData[cIdx - 1] : null;
    const ytdData = dashboardData.slice(0, cIdx + 1);
    
    const ytdInstalls = ytdData.reduce((sum, d) => sum + d.tech.installs.actual, 0);
    const ytdArea = ytdData.reduce((sum, d) => sum + d.tech.area.actual, 0);
    const ytdDamageValue = ytdData.reduce((sum, d) => sum + d.tech.damage.totalValue, 0);
    
    const ytdInstallPercent = (ytdInstalls / YEARLY_INSTALL_TARGET) * 100;
    const ytdAreaPercent = (ytdArea / YEARLY_AREA_TARGET) * 100;
    
    const installProgress = t.installs.target > 0 ? (t.installs.actual / t.installs.target) * 100 : 0;
    const areaProgress = t.area.target > 0 ? (t.area.actual / t.area.target) * 100 : 0;
    const isInstallOverTarget = t.installs.actual >= t.installs.target;
    
    const avgInstallsPerTeam = t.teams > 0 ? (t.installs.actual / t.teams) : 0;
    const avgAreaPerTeam = t.teams > 0 ? (t.area.actual / t.teams) : 0;
    
    const buildingSales = current.gfs.actual + current.mhl.actual;
    const damagePercentSales = buildingSales > 0 ? (t.damage.totalValue / buildingSales) * 100 : 0;
    const isDamageOverLimit = damagePercentSales > 1;

    // Metrics for insights
    const prevInstalls = prev ? prev.tech.installs.actual : 0;
    const installGrowth = prevInstalls > 0 ? ((t.installs.actual - prevInstalls) / prevInstalls) * 100 : 0;
    const prevDamage = prev ? prev.tech.damage.totalValue : 0;
    const damageGrowth = prevDamage > 0 ? ((t.damage.totalValue - prevDamage) / prevDamage) * 100 : 0;
    
    let insightType = 'good';
    if (isDamageOverLimit) insightType = 'high_damage';
    else if (!isInstallOverTarget) insightType = 'low_install';

    container.innerHTML = `
        <!-- Filter Section -->
        <div class="flex items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <i data-lucide="filter" class="w-5 h-5 text-slate-400 ml-2"></i>
            <span class="text-base font-bold text-slate-600 mr-2">เลือกสัปดาห์:</span>
            <select onchange="handleWeekChange(event)" class="ml-auto bg-sky-50 border border-sky-200 text-sky-700 text-base font-bold rounded-xl p-2 w-72 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">${opt}</select>
        </div>
        
        <!-- Section 1: YTD Hero Cards -->
        <div class="flex items-center gap-3 mb-6 shrink-0 mt-2">
            <h3 class="font-black text-slate-800 text-2xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="target" class="text-sky-600 w-7 h-7"></i> เป้าหมายสะสมปีนี้ (YTD Goals)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
            <!-- 1. YTD Installs -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="maximize" class="w-32 h-32 text-blue-600"></i></div>
                <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2 relative z-10"><i data-lucide="maximize" class="w-5 h-5 text-blue-500"></i> จำนวนงานติดตั้งสะสม</p>
                <h2 class="text-5xl font-black text-slate-900 mt-2 mb-3 relative z-10">${formatCurrency(ytdInstalls)} <span class="text-lg text-slate-500 font-bold">งาน</span></h2>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="bg-blue-500 h-full rounded-full" style="width:${Math.min(ytdInstallPercent, 100)}%"></div>
                </div>
                <div class="flex justify-between items-center text-sm font-bold relative z-10">
                    <span class="text-slate-500">เป้าทั้งปี: ${formatCurrency(YEARLY_INSTALL_TARGET)}</span>
                    <span class="text-blue-600">${ytdInstallPercent.toFixed(1)}%</span>
                </div>
            </div>

            <!-- 2. YTD Area -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="layers" class="w-32 h-32 text-emerald-600"></i></div>
                <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2 relative z-10"><i data-lucide="layers" class="w-5 h-5 text-emerald-500"></i> พื้นที่ติดตั้งสะสม</p>
                <h2 class="text-5xl font-black text-slate-900 mt-2 mb-3 relative z-10">${formatCurrency(ytdArea)} <span class="text-lg text-slate-500 font-bold">ตร.ฟ.</span></h2>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 relative z-10">
                    <div class="bg-emerald-500 h-full rounded-full" style="width:${Math.min(ytdAreaPercent, 100)}%"></div>
                </div>
                <div class="flex justify-between items-center text-sm font-bold relative z-10">
                    <span class="text-slate-500">เป้าทั้งปี: ${formatCurrency(YEARLY_AREA_TARGET)}</span>
                    <span class="text-emerald-600">${ytdAreaPercent.toFixed(1)}%</span>
                </div>
            </div>

            <!-- 3. YTD Damage -->
            <a href="https://docs.google.com/spreadsheets/d/1yl5Y7hNoe_meEUBwep9A2foUYGAG8GB-okewcp_e6dA/edit?gid=809669814#gid=809669814" target="_blank" rel="noopener noreferrer" class="bg-gradient-to-br from-rose-50 to-white rounded-[2rem] p-8 border border-rose-100 shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-rose-100 group" title="เปิดแหล่งข้อมูลมูลค่าความเสียหายสะสม">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="alert-triangle" class="w-32 h-32 text-rose-600"></i></div>
                <p class="text-sm font-bold text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-2 relative z-10"><i data-lucide="alert-triangle" class="w-5 h-5"></i> มูลค่าความเสียหายสะสม <i data-lucide="external-link" class="w-4 h-4 opacity-70 group-hover:opacity-100"></i></p>
                <h2 class="text-5xl font-black text-rose-600 mt-2 relative z-10 tracking-tighter">฿${formatCurrency(ytdDamageValue)}</h2>
                <p class="text-sm font-bold text-slate-500 mt-3 border-t border-rose-100 pt-3 relative z-10">ควบคุมไม่ให้เกิน 1% ของยอดขาย</p>
            </a>
        </div>

        <div class="flex items-center gap-3 mb-6 shrink-0 mt-4">
            <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight flex items-center gap-3"><i data-lucide="wrench" class="text-sky-500 w-6 h-6"></i> ผลงานประจำสัปดาห์ (Weekly Performance)</h3>
            <div class="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        <!-- Section 2: Weekly Deep Dive (Grid) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
            
            <!-- 1. Installs (Weekly) -->
            <div class="bg-white rounded-[2rem] p-6 border ${isInstallOverTarget ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'} shadow-sm flex flex-col">
                <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                    <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black shrink-0"><i data-lucide="check-square" class="w-5 h-5"></i></div>
                    <div>
                        <h4 class="font-black text-slate-800 text-base leading-none">งานติดตั้งเสร็จสิ้น</h4>
                        <p class="text-xs text-slate-400 font-bold uppercase mt-1">สัปดาห์นี้</p>
                    </div>
                </div>
                <div class="mb-4 text-center">
                    <h3 class="text-4xl font-black text-slate-900">${formatCurrency(t.installs.actual)} <span class="text-sm text-slate-500 font-bold">งาน</span></h3>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                    <div class="${isInstallOverTarget ? 'bg-blue-500' : 'bg-slate-400'} h-full rounded-full" style="width:${Math.min(installProgress, 100)}%"></div>
                </div>
                <div class="flex justify-between text-xs font-bold uppercase text-slate-500 mb-4">
                    <span>เป้า: ${t.installs.target}</span>
                    <span class="${isInstallOverTarget ? 'text-blue-600' : ''}">${installProgress.toFixed(1)}%</span>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-auto">
                    <div class="bg-slate-50 p-2 rounded-lg text-center"><p class="text-[10px] font-bold text-slate-400 uppercase">GFS</p><p class="text-sm font-black text-slate-700">${formatCurrency(t.installs.gfs)}</p></div>
                    <div class="bg-slate-50 p-2 rounded-lg text-center"><p class="text-[10px] font-bold text-slate-400 uppercase">MHL</p><p class="text-sm font-black text-slate-700">${formatCurrency(t.installs.mhl)}</p></div>
                </div>
            </div>

            <!-- 2. Area (Weekly) -->
            <div class="bg-white rounded-[2rem] p-6 border ${areaProgress >= 100 ? 'border-emerald-300 ring-2 ring-emerald-50' : 'border-slate-200'} shadow-sm flex flex-col">
                <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                    <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black shrink-0"><i data-lucide="layers" class="w-5 h-5"></i></div>
                    <div>
                        <h4 class="font-black text-slate-800 text-base leading-none">พื้นที่ติดตั้งรวม</h4>
                        <p class="text-xs text-slate-400 font-bold uppercase mt-1">สัปดาห์นี้</p>
                    </div>
                </div>
                <div class="mb-4 text-center">
                    <h3 class="text-4xl font-black text-slate-900">${formatCurrency(t.area.actual)} <span class="text-sm text-slate-500 font-bold">ตร.ฟ.</span></h3>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                    <div class="${areaProgress >= 100 ? 'bg-emerald-500' : 'bg-slate-400'} h-full rounded-full" style="width:${Math.min(areaProgress, 100)}%"></div>
                </div>
                <div class="flex justify-between text-xs font-bold uppercase text-slate-500 mb-4">
                    <span>เป้า: ${t.area.target}</span>
                    <span class="${areaProgress >= 100 ? 'text-emerald-600' : ''}">${areaProgress.toFixed(1)}%</span>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-auto">
                    <div class="bg-slate-50 p-2 rounded-lg text-center"><p class="text-[10px] font-bold text-slate-400 uppercase">GFS</p><p class="text-sm font-black text-slate-700">${formatCurrency(t.area.gfs)}</p></div>
                    <div class="bg-slate-50 p-2 rounded-lg text-center"><p class="text-[10px] font-bold text-slate-400 uppercase">MHL</p><p class="text-sm font-black text-slate-700">${formatCurrency(t.area.mhl)}</p></div>
                </div>
            </div>

            <!-- 3. Efficiency -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col">
                <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                    <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black shrink-0"><i data-lucide="users" class="w-5 h-5"></i></div>
                    <div>
                        <h4 class="font-black text-slate-800 text-base leading-none">ประสิทธิภาพทีม</h4>
                        <p class="text-xs text-slate-400 font-bold uppercase mt-1">ทั้งหมด ${t.teams} ทีม</p>
                    </div>
                </div>
                <div class="space-y-4 mt-auto flex-1 flex flex-col justify-center">
                    <div>
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-sm font-bold text-slate-500 uppercase tracking-widest">เฉลี่ย งาน/ทีม</span>
                            <span class="text-2xl font-black text-indigo-600">${avgInstallsPerTeam.toFixed(1)} <span class="text-sm text-slate-500 font-bold">งาน</span></span>
                        </div>
                    </div>
                    <div class="border-t border-slate-50 pt-4">
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-sm font-bold text-slate-500 uppercase tracking-widest">เฉลี่ย พื้นที่/ทีม</span>
                            <span class="text-2xl font-black text-indigo-600">${formatCurrency(avgAreaPerTeam)} <span class="text-sm text-slate-500 font-bold">ตร.ฟ.</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. Damage Control -->
            <div class="bg-white rounded-[2rem] p-6 border ${isDamageOverLimit?'border-red-300 ring-4 ring-red-50':'border-red-100'} shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-2 -bottom-2 opacity-5 pointer-events-none"><i data-lucide="shield-alert" class="w-24 h-24 text-rose-600"></i></div>
                <div class="flex items-center gap-3 mb-4 border-b border-red-100 pb-4 relative z-10">
                    <div class="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black shrink-0"><i data-lucide="alert-triangle" class="w-5 h-5"></i></div>
                    <div>
                        <h4 class="font-black text-red-700 text-base leading-none">ควบคุมความเสียหาย</h4>
                        <p class="text-xs text-red-500 font-bold uppercase mt-1">${damagePercentSales.toFixed(2)}% ของยอดขาย</p>
                    </div>
                </div>
                <div class="mb-3 relative z-10 text-center">
                    <p class="text-xs text-red-500 font-bold uppercase tracking-widest mb-0.5">มูลค่าความเสียหาย</p>
                    <h3 class="text-3xl font-black text-red-600 tracking-tighter">฿${formatCurrency(t.damage.totalValue)}</h3>
                    <a href="https://docs.google.com/spreadsheets/d/1yl5Y7hNoe_meEUBwep9A2foUYGAG8GB-okewcp_e6dA/edit?gid=809669814#gid=809669814" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 border border-red-100 hover:bg-red-100 transition-colors">
                        ดูรายละเอียดเพิ่มเติม
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-auto relative z-10">
                    <div class="bg-red-50/60 p-2.5 rounded-lg border border-red-100">
                        <p class="text-[10px] font-bold text-red-400 uppercase mb-0.5">จากช่าง</p>
                        <p class="text-sm font-black text-red-700">฿${formatCurrency(t.damage.byTech)}</p>
                    </div>
                    <div class="bg-red-50/60 p-2.5 rounded-lg border border-red-100">
                        <p class="text-[10px] font-bold text-red-400 uppercase mb-0.5">จากฟิล์ม</p>
                        <p class="text-sm font-black text-red-700">฿${formatCurrency(t.damage.byFilm)}</p>
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
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-base whitespace-nowrap m-0 flex items-center"><i data-lucide="trending-up" class="w-5 h-5 text-sky-500 mr-2"></i> แนวโน้มงานติดตั้งอาคาร (12 สัปดาห์)</h3>
                        <div class="flex gap-2 shrink-0 ml-4">
                            <button onclick="changeTechTrendFilter('total')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${techTrendFilter === 'total' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">รวมทั้งหมด</button>
                            <button onclick="changeTechTrendFilter('gfs')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${techTrendFilter === 'gfs' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">GFS</button>
                            <button onclick="changeTechTrendFilter('mhl')" class="px-4 py-1.5 rounded-full text-xs lg:text-sm font-black transition-all ${techTrendFilter === 'mhl' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">MHL</button>
                        </div>
                    </div>
                </div>
                <div class="flex-1 w-full min-h-[350px] relative"><canvas id="techTrendChartCanvas"></canvas></div>
            </div>
            
            <!-- Executive Insights -->
            <div class="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="lightbulb" class="w-64 h-64 text-sky-600"></i></div>
                <h3 class="font-black text-slate-800 flex items-center gap-2 text-xl uppercase tracking-tight mb-6 relative z-10">
                    <i data-lucide="lightbulb" class="text-amber-500 w-6 h-6"></i> วิเคราะห์งานช่างอาคาร
                </h3>
                
                <div class="flex flex-col gap-4 relative z-10 mb-6 flex-1">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-sky-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">เทียบเป้าหมายติดตั้ง</p>
                            <p class="text-2xl font-black ${isInstallOverTarget ? 'text-emerald-600' : 'text-slate-700'}">${installProgress.toFixed(1)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${isInstallOverTarget ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'} flex items-center justify-center shrink-0"><i data-lucide="target" class="w-6 h-6"></i></div>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-sky-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">% ความเสียหาย (ยอดขาย)</p>
                            <p class="text-2xl font-black ${isDamageOverLimit ? 'text-red-600' : 'text-emerald-600'}">${damagePercentSales.toFixed(2)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${isDamageOverLimit ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center shrink-0"><i data-lucide="alert-triangle" class="w-6 h-6"></i></div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-sky-200 transition-colors">
                        <div>
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">งานติดตั้ง (เทียบวีคก่อน)</p>
                            <p class="text-2xl font-black ${installGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}">${installGrowth >= 0 ? '↑' : '↓'} ${Math.abs(installGrowth).toFixed(1)}%</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${installGrowth >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="trending-${installGrowth >= 0 ? 'up' : 'down'}" class="w-6 h-6"></i></div>
                    </div>
                </div>

                <div class="mt-auto p-5 ${insightType === 'good' ? 'bg-emerald-50/50 border-emerald-100' : (insightType === 'high_damage' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100')} rounded-2xl border text-sm leading-relaxed text-slate-800 font-medium relative z-10 flex flex-col justify-center">
                    <b class="${insightType === 'good' ? 'text-emerald-600' : (insightType === 'high_damage' ? 'text-red-600' : 'text-amber-600')} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์:</b> 
                    ${insightType === 'good' 
                        ? `ยอดเยี่ยม! ทีมช่างอาคารสามารถจบงานได้ทะลุเป้าหมาย <b class="text-emerald-700">(${installProgress.toFixed(1)}%)</b> และควบคุมความเสียหายได้ดีเยี่ยมอยู่ในเกณฑ์ปกติ <b class="text-emerald-700">(${damagePercentSales.toFixed(2)}%)</b>` 
                        : (insightType === 'high_damage' 
                            ? `แจ้งเตือน! อัตราความเสียหายเกินเกณฑ์มาตรฐาน 1% โดยสัปดาห์นี้อยู่ที่ <b class="text-red-600">${damagePercentSales.toFixed(2)}%</b> มูลค่ารวม <b class="text-red-600">฿${formatCurrency(t.damage.totalValue)}</b> แนะนำให้ตรวจสอบสาเหตุด่วน (จากช่างหรือจากฟิล์ม)`
                            : `จำนวนงานติดตั้งสัปดาห์นี้ยังต่ำกว่าเป้าหมาย <b class="text-amber-600">(${installProgress.toFixed(1)}%)</b> ขาดอีก ${t.installs.target - t.installs.actual} งาน แต่อัตราควบคุมความเสียหายยังอยู่ในเกณฑ์ที่รับได้`)}
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('techTrendChartCanvas')?.getContext('2d');
        if(!ctx) return;
        if (charts['techTrend']) charts['techTrend'].destroy();
        
        let recentData = [];
        let dLabelAct = '', dAct = [], cBg = '';
        
        if (techTrendFilter === 'total') {
            recentData = dashboardData.filter(d => d.tech.installs.actual > 0).slice(-12);
            dLabelAct = 'งานติดตั้งรวม'; dAct = recentData.map(d => d.tech.installs.actual); cBg = '#0284c7'; // sky-600
        } else if (techTrendFilter === 'gfs') {
            recentData = dashboardData.filter(d => d.tech.installs.gfs > 0).slice(-12);
            dLabelAct = 'งานติดตั้ง GFS'; dAct = recentData.map(d => d.tech.installs.gfs); cBg = '#2563eb'; // blue-600
        } else if (techTrendFilter === 'mhl') {
            recentData = dashboardData.filter(d => d.tech.installs.mhl > 0).slice(-12);
            dLabelAct = 'งานติดตั้ง MHL'; dAct = recentData.map(d => d.tech.installs.mhl); cBg = '#f59e0b'; // amber-500
        }

        let datasets = [{ type: 'bar', label: dLabelAct, data: dAct, backgroundColor: cBg, order: 2, borderRadius: 4, barPercentage: 0.6, yAxisID: 'y' }];

        if (techTrendFilter === 'total') {
            datasets.push({ type: 'line', label: 'เป้าหมายรวม (งาน)', data: recentData.map(d => d.tech.installs.target), borderColor: '#94a3b8', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], tension: 0.1, order: 1, yAxisID: 'y' });
        }

        datasets.push({ type: 'line', label: 'ความเสียหาย (฿)', data: recentData.map(d => d.tech.damage.totalValue), borderColor: '#f43f5e', backgroundColor: '#fef1f2', borderWidth: 2, tension: 0.4, order: 0, yAxisID: 'y1', fill: false });

        charts['techTrend'] = new Chart(ctx, {
            type: 'bar',
            data: { labels: recentData.map(d => d.week), datasets: datasets },
            options: { 
                layout: { padding: { top: 30 } },
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top', labels: { font: { family: 'Sarabun', weight: 'bold' }, usePointStyle: true, boxWidth: 10 } },
                    tooltip: { 
                        callbacks: { 
                            label: (c) => {
                                let val = c.parsed.y;
                                if (c.dataset.label.includes('ความเสียหาย')) return `ความเสียหาย: ฿${formatCurrency(val)}`;
                                return `${c.dataset.label}: ${formatCurrency(val)} งาน`;
                            } 
                        } 
                    }
                },
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { family: 'Sarabun' } } },
                    y: { type: 'linear', position: 'left', beginAtZero: true, grace: '25%', grid: { color: '#f1f5f9' }, ticks: { font: { weight: 'bold' } } },
                    y1: { type: 'linear', position: 'right', beginAtZero: true, grace: '25%', grid: { drawOnChartArea: false }, ticks: { font: { family: 'Sarabun' }, color: '#f43f5e', callback: (v) => v >= 1000 ? (v/1000)+'k' : v } }
                }
            },
            plugins: [createProgressPlugin(false)]
        });
    }, 50);
}

// ==========================================
// RENDER: ADMIN (Redesigned)
// ==========================================
