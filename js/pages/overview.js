// Render: Overview page.
function renderOverviewHTML(current, m, opt, container) {
    // คำนวณข้อมูลสำหรับ Pipeline
    const mktSpend = current.marketing.gfs.actual + current.marketing.mhl.actual + current.marketing.car.actual;
    const mktBud = current.marketing.gfs.target + current.marketing.mhl.target + current.marketing.car.target;
    
    // ดึงข้อมูลจาก SALES ADMIN โดยตรงเพื่อให้ตัวเลขตรงกัน
    const adminContacts = current.admin.contacts.total;
    const adminLeads = current.admin.leads.actual;
    const leadConv = adminContacts > 0 ? (adminLeads / adminContacts) * 100 : 0;

    const totalSales = current.gfs.actual + current.mhl.actual + current.car.actual;
    const totalTarget = current.gfs.target + current.mhl.target + current.car.target;
    const totalSalesProgress = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;

    const buildingSales = current.gfs.actual + current.mhl.actual;
    const buildingTarget = current.gfs.target + current.mhl.target;
    const buildingSalesProgress = buildingTarget > 0 ? (buildingSales / buildingTarget) * 100 : 0;
    
    const buildingInstalls = current.tech.installs.actual;
    
    const buildingDamageValue = current.tech.damage.totalValue;
    const damagePercent = buildingSales > 0 ? (buildingDamageValue / buildingSales) * 100 : 0;

    container.innerHTML = `
        <!-- ส่วน Filter สัปดาห์ -->
        <div class="flex items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <i data-lucide="filter" class="w-5 h-5 text-slate-400 ml-2"></i>
            <span class="text-base font-bold text-slate-600 mr-2">ตัวกรองสัปดาห์:</span>
            <select onchange="handleWeekChange(event)" class="ml-auto bg-slate-50 border border-slate-200 text-slate-700 text-base rounded-lg p-2 w-72 cursor-pointer font-bold">${opt}</select>
        </div>

        <!-- 1. ส่วนหัว: KPI หลัก (The Big Picture) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 mb-8">
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-lg text-white relative overflow-hidden flex flex-col justify-center">
                <div class="absolute -right-4 -bottom-4 opacity-10"><i data-lucide="bar-chart-2" class="w-48 h-48"></i></div>
                <div class="relative z-10">
                    <p class="text-slate-300 font-bold tracking-widest uppercase mb-2">ยอดขายสัปดาห์นี้ (Weekly Sales)</p>
                    <h2 class="text-5xl font-black mb-4">฿${formatCurrency(m.weekly.a)}</h2>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 rounded-xl text-sm font-black ${totalSales >= totalTarget ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}">
                            ${totalSales >= totalTarget ? '⭐ ทะลุเป้า' : '⚠️ ต่ำกว่าเป้า'} ${totalSalesProgress.toFixed(1)}%
                        </span>
                        <span class="text-slate-400 text-sm font-bold">เป้า: ฿${formatCurrency(m.weekly.t)}</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                <p class="text-slate-500 font-bold tracking-widest uppercase mb-2 flex items-center gap-2"><i data-lucide="calendar" class="w-5 h-5 text-blue-500"></i> ยอดขายเดือนนี้ (${m.monthly.label})</p>
                <h3 class="text-4xl font-black text-slate-900 mb-3">฿${formatCurrency(m.monthly.a)}</h3>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                    <div class="bg-blue-500 h-full rounded-full" style="width:${Math.min(m.monthly.p,100)}%"></div>
                </div>
                <p class="text-slate-500 text-sm font-bold">เป้าเดือน: ฿${formatCurrency(m.monthly.t)} (${m.monthly.p.toFixed(1)}%)</p>
            </div>

            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                <p class="text-slate-500 font-bold tracking-widest uppercase mb-2 flex items-center gap-2"><i data-lucide="calendar-days" class="w-5 h-5 text-purple-500"></i> ยอดขายสะสมปีนี้ (YTD)</p>
                <h3 class="text-4xl font-black text-slate-900 mb-3">฿${formatCurrency(m.ytd.a)}</h3>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                    <div class="bg-purple-500 h-full rounded-full" style="width:${Math.min(m.ytd.p,100)}%"></div>
                </div>
                <p class="text-slate-500 text-sm font-bold">เป้าปี: ฿${formatCurrency(m.ytd.t)} (${m.ytd.p.toFixed(1)}%)</p>
            </div>
        </div>

        <!-- 2. ส่วนกลาง: ภาพรวมการทำงานทุกแผนก (Business Pipeline) -->
        <div class="flex items-center gap-3 mb-6 shrink-0">
            <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight">ประสิทธิภาพรายแผนก (Department Pulse)</h3>
            <div class="h-px bg-slate-200 flex-1"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0 mb-8">
            <!-- การตลาด -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col group cursor-pointer" onclick="changePage('marketing')">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><i data-lucide="megaphone" class="w-6 h-6"></i></div>
                    <div><h4 class="font-black text-slate-800 text-lg uppercase leading-none">1. การตลาด</h4><p class="text-xs font-bold text-slate-400 mt-1">ออนไลน์</p></div>
                </div>
                <div class="mb-4">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">งบที่ใช้จริง</p>
                    <p class="text-3xl font-black text-slate-900">฿${formatCurrency(mktSpend)}</p>
                </div>
                <div class="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div><p class="text-xs text-slate-400 font-bold mb-0.5">งบตั้งไว้</p><p class="text-sm font-black text-slate-700">฿${formatCurrency(mktBud)}</p></div>
                    <div><p class="text-xs text-slate-400 font-bold mb-0.5">ROAS</p><p class="text-sm font-black text-orange-600">${m.weekly.r}x</p></div>
                </div>
            </div>

            <!-- แอดมิน -->
            <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col group cursor-pointer" onclick="changePage('admin')">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><i data-lucide="headphones" class="w-6 h-6"></i></div>
                    <div><h4 class="font-black text-slate-800 text-lg uppercase leading-none">2. แอดมิน(อาคาร)</h4><p class="text-xs font-bold text-slate-400 mt-1">คัดกรองลูกค้า</p></div>
                </div>
                <div class="mb-4">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ติดต่อรวมทั้งหมด</p>
                    <p class="text-3xl font-black text-slate-900">${formatCurrency(adminContacts)} <span class="text-sm text-slate-500 font-bold">คน</span></p>
                </div>
                <div class="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div><p class="text-xs text-slate-400 font-bold mb-0.5">ส่งต่อให้เซลล์</p><p class="text-sm font-black text-indigo-600">${formatCurrency(adminLeads)} <span class="text-xs font-normal">งาน</span></p></div>
                    <div><p class="text-xs text-slate-400 font-bold mb-0.5">Conversion</p><p class="text-sm font-black text-slate-700">${leadConv.toFixed(1)}%</p></div>
                </div>
            </div>

            <!-- ฝ่ายขาย -->
            <div class="bg-white rounded-[2rem] p-6 border ${buildingSales >= buildingTarget ? 'border-emerald-300 ring-2 ring-emerald-50' : 'border-blue-300 ring-2 ring-blue-50'} shadow-sm hover:shadow-md transition-shadow flex flex-col group cursor-pointer" onclick="changePage('sales')">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 ${buildingSales >= buildingTarget ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><i data-lucide="award" class="w-6 h-6"></i></div>
                    <div><h4 class="font-black text-slate-800 text-lg uppercase leading-none">3. ฝ่ายขาย (อาคาร)</h4><p class="text-xs font-bold text-slate-400 mt-1">ปิดยอดขาย</p></div>
                </div>
                <div class="mb-4">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ยอดขายปิดได้</p>
                    <p class="text-3xl font-black ${buildingSales >= buildingTarget ? 'text-emerald-600' : 'text-blue-600'}">฿${formatCurrency(buildingSales)}</p>
                </div>
                <div class="mt-auto pt-4 border-t border-slate-100 space-y-2">
                    <div class="flex justify-between items-center text-xs font-bold"><span class="text-slate-500">เป้า: ฿${formatCurrency(buildingTarget)}</span><span class="${buildingSales >= buildingTarget ? 'text-emerald-600' : 'text-slate-700'}">${buildingSalesProgress.toFixed(1)}%</span></div>
                    <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div class="${buildingSales >= buildingTarget ? 'bg-emerald-500' : 'bg-blue-500'} h-full rounded-full" style="width:${Math.min(buildingSalesProgress,100)}%"></div></div>
                </div>
            </div>

            <!-- ช่างติดตั้ง (อาคาร) -->
            <div class="bg-white rounded-[2rem] p-6 border ${damagePercent > 1 ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow flex flex-col group cursor-pointer" onclick="changePage('tech')">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 ${damagePercent > 1 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><i data-lucide="wrench" class="w-6 h-6"></i></div>
                    <div><h4 class="font-black text-slate-800 text-lg uppercase leading-none">4. ช่างติดตั้ง (อาคาร)</h4><p class="text-xs font-bold text-slate-400 mt-1">ส่งมอบงาน</p></div>
                </div>
                <div class="mb-4">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">งานติดตั้งสำเร็จ</p>
                    <p class="text-3xl font-black text-slate-900">${formatCurrency(buildingInstalls)} <span class="text-sm text-slate-500 font-bold">งาน</span></p>
                </div>
                <div class="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div><p class="text-xs text-slate-400 font-bold mb-0.5">มูลค่าเสียหาย</p><p class="text-sm font-black ${damagePercent > 1 ? 'text-red-600' : 'text-slate-700'}">฿${formatCurrency(buildingDamageValue)}</p></div>
                    <div><p class="text-xs text-slate-400 font-bold mb-0.5">% เสียหาย</p><p class="text-sm font-black ${damagePercent > 1 ? 'text-red-600' : 'text-emerald-600'}">${damagePercent.toFixed(2)}%</p></div>
                </div>
            </div>
        </div>

        <!-- 3. ส่วนล่าง: กราฟแนวโน้ม และ สัดส่วนยอดขาย -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0 mb-8">
            <!-- กราฟแนวโน้ม -->
            <div class="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col">
                <div class="flex items-center justify-between gap-6 mb-8 pb-4 border-b border-slate-100 overflow-x-auto custom-scrollbar w-full">
                    <div class="flex items-center gap-6 shrink-0">
                        <h3 class="font-black text-slate-800 uppercase tracking-tight text-lg whitespace-nowrap m-0">
                            ${overviewTimeframe === 'monthly' ? 'แนวโน้มรายได้รายเดือน ปี 2026' : 'แนวโน้มรายได้ย้อนหลัง 12 สัปดาห์'}
                        </h3>
                        <div class="flex gap-2 shrink-0">
                            ${['total','gfs','mhl','car'].map(t => `<button onclick="changeChartTab('${t}')" class="px-4 py-1.5 rounded-full text-sm font-black tracking-widest transition-all ${activeChartTab === t ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">${t.toUpperCase()}</button>`).join('')}
                        </div>
                    </div>
                    <div class="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0 ml-auto">
                        <button onclick="changeOverviewTimeframe('monthly')" class="px-4 py-2 rounded-lg text-sm font-black transition-all ${overviewTimeframe === 'monthly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}">รายเดือน (ปีนี้)</button>
                        <button onclick="changeOverviewTimeframe('weekly')" class="px-4 py-2 rounded-lg text-sm font-black transition-all ${overviewTimeframe === 'weekly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}">รายสัปดาห์ (12 สัปดาห์)</button>
                    </div>
                </div>
                <div class="h-[350px] w-full relative"><canvas id="trendChartCanvas"></canvas></div>
            </div>

            <!-- สัดส่วนยอดขาย -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center">
                <h3 class="font-black text-slate-800 uppercase tracking-tight text-lg w-full text-center mb-6">สัดส่วนรายได้สัปดาห์นี้</h3>
                <div class="w-full h-48 relative mb-8"><canvas id="donutTopCanvas"></canvas></div>
                <div class="w-full space-y-4">
                    <div class="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-blue-500"></div><span class="text-sm font-bold text-slate-700">GFS (อาคาร)</span></div>
                        <span class="text-base font-black text-slate-900">฿${formatCurrency(current.gfs.actual)}</span>
                    </div>
                    <div class="flex justify-between items-center bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-amber-500"></div><span class="text-sm font-bold text-slate-700">MHL (อาคาร)</span></div>
                        <span class="text-base font-black text-slate-900">฿${formatCurrency(current.mhl.actual)}</span>
                    </div>
                    <div class="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-emerald-500"></div><span class="text-sm font-bold text-slate-700">CAR (รถยนต์)</span></div>
                        <span class="text-base font-black text-slate-900">฿${formatCurrency(current.car.actual)}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. ส่วนวิเคราะห์ภาพรวม (Executive Insights) -->
        <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm shrink-0 mb-8 relative overflow-hidden">
            <div class="absolute -right-4 -bottom-4 opacity-5 pointer-events-none"><i data-lucide="zap" class="w-64 h-64 text-blue-600"></i></div>
            <h3 class="font-black text-slate-800 flex items-center gap-2 text-xl uppercase tracking-tight mb-6 relative z-10">
                <i data-lucide="lightbulb" class="text-amber-500 w-6 h-6"></i> วิเคราะห์ประสิทธิภาพภาพรวม (Executive Insights)
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                    <div>
                        <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Growth (เทียบสัปดาห์ก่อน)</p>
                        <p class="text-2xl font-black ${m.weekly.g >= 0 ? 'text-emerald-600' : 'text-red-600'}">${m.weekly.g >= 0 ? '↑' : '↓'} ${Math.abs(m.weekly.g).toFixed(1)}%</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl ${m.weekly.g >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="trending-${m.weekly.g >= 0 ? 'up' : 'down'}" class="w-6 h-6"></i></div>
                </div>
                
                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                    <div>
                        <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">ส่วนต่างเป้าหมายสัปดาห์นี้</p>
                        <p class="text-2xl font-black ${(m.weekly.a - m.weekly.t) >= 0 ? 'text-emerald-600' : 'text-red-600'}">${(m.weekly.a - m.weekly.t) >= 0 ? '+' : ''}${formatCurrency(m.weekly.a - m.weekly.t)} ฿</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl ${(m.weekly.a - m.weekly.t) >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center shrink-0"><i data-lucide="target" class="w-6 h-6"></i></div>
                </div>

                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                    <div>
                        <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">ROAS ภาพรวม</p>
                        <p class="text-2xl font-black text-blue-600">${m.weekly.r}x</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><i data-lucide="bar-chart-3" class="w-6 h-6"></i></div>
                </div>
            </div>

            <div class="mt-6 p-5 sm:p-6 ${m.weekly.a >= m.weekly.t ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} rounded-2xl border text-sm lg:text-base leading-relaxed text-slate-800 font-medium relative z-10">
                <b class="${m.weekly.a >= m.weekly.t ? 'text-emerald-600' : 'text-blue-600'} uppercase font-black tracking-widest block mb-2">💡 สรุปสถานการณ์ (Automated Insight):</b> 
                ${m.weekly.a >= m.weekly.t 
                    ? `สัปดาห์นี้ภาพรวมธุรกิจทำยอดขายได้ <b class="text-emerald-700">ทะลุเป้าหมายที่ตั้งไว้</b> ⭐ โดยมีอัตราผลตอบแทนโฆษณา (ROAS) รวมอยู่ที่ <b class="text-emerald-700">${m.weekly.r}x</b> ถือว่ากระบวนการ (Pipeline) ตั้งแต่การทำการตลาด การคัดกรอง ไปจนถึงการปิดการขาย ทำงานร่วมกันได้ดีเยี่ยม ควรรักษาโมเมนตัมนี้ไว้` 
                    : `ภาพรวมสัปดาห์นี้ยอดขายรวมยัง <b class="text-red-600">ต่ำกว่าเป้าหมาย ${formatCurrency(m.weekly.t - m.weekly.a)} ฿</b> แนะนำให้ตรวจสอบคอขวด (Pipeline) ด้านบน ว่าปัญหาหลักเกิดจาก การตลาด (จำนวนคนทักลดลง), แอดมิน (ส่งงานให้เซลล์ได้น้อย), หรือ ฝ่ายขาย (อัตราการปิดการขายต่ำ) เพื่อนำไปแก้ไขจุดนั้นโดยตรง`}
            </div>
        </div>
    `;
    setTimeout(() => {
        const dCtx = document.getElementById('donutTopCanvas');
        if(dCtx) {
            charts['donutTop'] = new Chart(dCtx.getContext('2d'), { 
                type: 'doughnut', 
                data: { labels: ['GFS', 'MHL', 'CAR'], datasets: [{ data: [current.gfs.actual, current.mhl.actual, current.car.actual], backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'], borderWidth: 0, cutout: '75%' }] }, 
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
            });
        }
        renderBasicTrendChart(current);
    }, 50);
}

// ==========================================
// RENDER: FEEDBACK
// ==========================================
