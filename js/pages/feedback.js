// Render: Customer feedback page.
function renderFeedbackHTML(container) {
    const sourceUrl = 'https://docs.google.com/spreadsheets/d/1HaOmTLOl1YaaEIf_9WatknaAwIJGI8AZI1H-QO7CvHM/edit?gid=1571209798#gid=1571209798';
    const html = escapeHTML;
    const attr = escapeAttr;
    const weeks = [...new Set(feedbackData.map(d => d.week).filter(Boolean))];
    const getWeekNum = s => parseInt((s.match(/\d+/) || [0])[0]);
    const sortedWeeks = weeks.sort((a, b) => getWeekNum(b) - getWeekNum(a));

    if (selectedFeedbackWeek === '' && sortedWeeks.length > 0) {
        selectedFeedbackWeek = sortedWeeks[0];
    }

    const filtered = selectedFeedbackWeek === 'All' ? feedbackData : feedbackData.filter(d => d.week === selectedFeedbackWeek);
    const getFeedbackSentiment = (comment, followUp = '') => {
        const primary = (comment || '').trim();
        const fallback = (followUp || '').trim();
        const text = primary || fallback;
        if (!text) return 'neutral';

        if (/คำชม|ดี|ประทับใจ|เยี่ยม|ตรงเวลา|เรียบร้อย|สุภาพ|รวดเร็ว|ไว|แนะนำ|พอใจ|ขอบคุณ/i.test(text)) return 'positive';
        if (/คอมเพลน|ร้องเรียน|ตำหนิ|แย่|ปัญหา|ไม่ดี|รอนาน|ล่าช้า|ช้า|เสียหาย|ไม่เรียบร้อย|ไม่พอใจ|ยังไม่ได้|ยังไม่จบ/i.test(text)) return 'negative';
        return 'neutral';
    };

    let salesPos = 0, salesNeg = 0, techPos = 0, techNeg = 0, suggestionsCount = 0;
    const salesStats = {}, techStats = {}, companyStats = {};

    filtered.forEach(d => {
        const sSent = getFeedbackSentiment(d.salesComments, d.salesFeedback);
        const tSent = getFeedbackSentiment(d.techComments, d.techFeedback);

        if (sSent === 'positive') salesPos++;
        if (sSent === 'negative') salesNeg++;
        if (tSent === 'positive') techPos++;
        if (tSent === 'negative') techNeg++;
        if (d.suggestions && d.suggestions !== '-' && d.suggestions.trim() !== '') suggestionsCount++;

        const entity = d.company && d.company !== '-' ? d.company : (d.customerName || 'ไม่ระบุ');
        if (!companyStats[entity]) companyStats[entity] = { total: 0, pos: 0, neg: 0 };
        companyStats[entity].total++;
        if (sSent === 'positive' || tSent === 'positive') companyStats[entity].pos++;
        if (sSent === 'negative' || tSent === 'negative') companyStats[entity].neg++;

        if (d.salesName && d.salesName !== '-') {
            if (!salesStats[d.salesName]) salesStats[d.salesName] = { total: 0, pos: 0, neg: 0 };
            salesStats[d.salesName].total++;
            if (sSent === 'positive') salesStats[d.salesName].pos++;
            if (sSent === 'negative') salesStats[d.salesName].neg++;
        }

        if (d.technicians && d.technicians !== '-') {
            const techs = d.technicians.split(',').map(t => t.trim()).filter(Boolean);
            techs.forEach(tech => {
                if (!techStats[tech]) techStats[tech] = { total: 0, pos: 0, neg: 0 };
                techStats[tech].total++;
                if (tSent === 'positive') techStats[tech].pos++;
                if (tSent === 'negative') techStats[tech].neg++;
            });
        }
    });

    const salesPct = filtered.length > 0 ? Math.round((salesPos / filtered.length) * 100) : 0;
    const techPct = filtered.length > 0 ? Math.round((techPos / filtered.length) * 100) : 0;
    const positiveTotal = salesPos + techPos;
    const negativeTotal = salesNeg + techNeg;
    const voiceTotal = filtered.length * 2;
    const overallPct = voiceTotal > 0 ? Math.round((positiveTotal / voiceTotal) * 100) : 0;
    const activeStatsWeek = selectedFeedbackWeek === 'All' ? sortedWeeks[0] : selectedFeedbackWeek;
    const activeWeekNumber = getWeekNum(activeStatsWeek || '');
    const activeDashboardWeek = dashboardData.find(d => d.week === activeStatsWeek)
        || dashboardData.find(d => getWeekNum(d.week || '') === activeWeekNumber)
        || null;
    const weeklyCompletedInstalls = activeDashboardWeek?.tech?.installs?.actual || 0;
    const weeklyReachedCalls = feedbackData.filter(d => d.week === activeStatsWeek).length;
    const reachedCallPct = weeklyCompletedInstalls > 0 ? Math.round((weeklyReachedCalls / weeklyCompletedInstalls) * 100) : 0;

    const statRows = (stats, accent) => {
        const rows = Object.entries(stats)
            .sort((a, b) => (b[1].pos - b[1].neg) - (a[1].pos - a[1].neg) || b[1].total - a[1].total)
            .slice(0, 8);

        if (rows.length === 0) {
            return `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">ยังไม่มีข้อมูลในช่วงเวลานี้</div>`;
        }

        return rows.map(([name, stat], index) => {
            return `
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <div class="flex items-center gap-3">
                        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent.rank} text-xs font-black">${index + 1}</span>
                        <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-black text-slate-800">${html(name)}</p>
                            <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-slate-500">รวม ${stat.total}</span>
                                <span class="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">ชม ${stat.pos}</span>
                                <span class="rounded-md bg-red-50 px-2 py-0.5 text-red-700">ติ ${stat.neg}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    const sentimentPill = type => {
        if (type === 'positive') return '<span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><i data-lucide="smile" class="h-4 w-4"></i> ดี</span>';
        if (type === 'negative') return '<span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700"><i data-lucide="frown" class="h-4 w-4"></i> ต้องติดตาม</span>';
        return '<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"><i data-lucide="meh" class="h-4 w-4"></i> กลาง</span>';
    };

    const panelTone = (type, normal) => {
        if (type === 'negative') {
            return {
                wrap: 'border-red-200 bg-red-50/80 ring-1 ring-red-100',
                heading: 'text-red-700',
                icon: 'bg-red-100 text-red-700',
                name: 'border-red-100 bg-red-100 text-red-800',
                quote: 'border-red-300 bg-white text-red-950',
                feedback: 'bg-white border-red-100 text-red-950',
                label: 'text-red-700'
            };
        }
        return normal;
    };

    document.getElementById('header-title').innerText = 'Feedback ลูกค้า(อาคาร)';
    document.getElementById('header-subtitle').innerText = `เสียงตอบรับจากผู้ใช้บริการ ประจำ${selectedFeedbackWeek === 'All' ? 'ทุกสัปดาห์' : selectedFeedbackWeek}`;

    container.innerHTML = `
        <section class="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-white shadow-sm shrink-0">
            <div class="absolute inset-0 bg-gradient-to-br from-sky-700 via-cyan-600 to-teal-600 opacity-95"></div>
            <div class="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/20"></div>
            <div class="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-cyan-300/20"></div>
            <div class="relative z-10 grid grid-cols-1 gap-6 p-6 text-white lg:grid-cols-[1fr_auto] lg:p-8">
                <div class="max-w-3xl">
                    <div class="flex flex-wrap items-center gap-3">
                        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                            <i data-lucide="messages-square" class="h-7 w-7"></i>
                        </span>
                        <div>
                            <h2 class="text-2xl font-black leading-tight sm:text-3xl">เสียงลูกค้าที่ต้องเห็นก่อนตัดสินใจ</h2>
                            <p class="mt-1 text-sm font-bold text-white/80 sm:text-base">สรุปคำชม จุดที่ต้องติดตาม และข้อเสนอแนะจากงานติดตั้งอาคาร</p>
                        </div>
                    </div>
                    <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div class="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                            <p class="text-xs font-black uppercase text-white/70">ติดตั้งเสร็จ</p>
                            <p class="mt-1 text-3xl font-black">${formatCurrency(weeklyCompletedInstalls)}</p>
                            <p class="mt-1 text-xs font-bold text-white/70">${html(activeStatsWeek || '-')}</p>
                        </div>
                        <div class="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                            <p class="text-xs font-black uppercase text-white/70">โทรได้</p>
                            <p class="mt-1 text-3xl font-black">${formatCurrency(weeklyReachedCalls)}</p>
                        </div>
                        <div class="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                            <p class="text-xs font-black uppercase text-white/70">% โทรได้</p>
                            <p class="mt-1 text-3xl font-black">${reachedCallPct}%</p>
                        </div>
                        <div class="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                            <p class="text-xs font-black uppercase text-white/70">ต้องติดตาม</p>
                            <p class="mt-1 text-3xl font-black">${negativeTotal}</p>
                        </div>
                        <div class="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                            <p class="text-xs font-black uppercase text-white/70">ข้อเสนอแนะ</p>
                            <p class="mt-1 text-3xl font-black">${suggestionsCount}</p>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col justify-end gap-3 lg:w-80">
                    <label class="text-sm font-black text-white/80">เลือกสัปดาห์ Feedback</label>
                    <select onchange="handleFeedbackWeekChange(event)" class="w-full rounded-2xl border border-white/30 bg-white px-4 py-3 text-base font-black text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-white/30">
                        <option value="All" ${selectedFeedbackWeek === 'All' ? 'selected' : ''}>สัปดาห์ทั้งหมด (All)</option>
                        ${sortedWeeks.map(w => `<option value="${attr(w)}" ${w === selectedFeedbackWeek ? 'selected' : ''}>${html(w)}</option>`).join('')}
                    </select>
                    <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition-colors hover:bg-slate-800">
                        <i data-lucide="external-link" class="h-5 w-5"></i>
                        แหล่งข้อมูล Feedback
                    </a>
                </div>
            </div>
        </section>

        <section class="grid grid-cols-1 gap-5 shrink-0 md:grid-cols-3">
            <div class="rounded-[1.75rem] border border-blue-100 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-black text-blue-600">ความพึงพอใจฝ่ายขาย</p>
                        <p class="mt-2 text-5xl font-black text-slate-900">${salesPct}%</p>
                    </div>
                    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><i data-lucide="briefcase" class="h-7 w-7"></i></div>
                </div>
                <div class="mt-5 h-3 rounded-full bg-blue-50"><div class="h-full rounded-full bg-blue-500" style="width:${Math.min(salesPct, 100)}%"></div></div>
                <p class="mt-3 text-sm font-bold text-slate-500">ชม ${salesPos} รายการ / ต้องติดตาม ${salesNeg} รายการ</p>
            </div>
            <div class="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-black text-emerald-600">ความพึงพอใจทีมช่าง</p>
                        <p class="mt-2 text-5xl font-black text-slate-900">${techPct}%</p>
                    </div>
                    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><i data-lucide="wrench" class="h-7 w-7"></i></div>
                </div>
                <div class="mt-5 h-3 rounded-full bg-emerald-50"><div class="h-full rounded-full bg-emerald-500" style="width:${Math.min(techPct, 100)}%"></div></div>
                <p class="mt-3 text-sm font-bold text-slate-500">ชม ${techPos} รายการ / ต้องติดตาม ${techNeg} รายการ</p>
            </div>
            <div class="rounded-[1.75rem] border border-amber-100 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-black text-amber-600">ข้อเสนอแนะที่ควรอ่าน</p>
                        <p class="mt-2 text-5xl font-black text-slate-900">${suggestionsCount}</p>
                    </div>
                    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><i data-lucide="lightbulb" class="h-7 w-7"></i></div>
                </div>
                <p class="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">ใช้ดูประเด็นปรับปรุงหน้างานและการสื่อสารกับลูกค้า</p>
            </div>
        </section>

        <section class="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shrink-0">
            <button type="button" class="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50" onclick="
                const panel = document.getElementById('feedback-mentions-panel');
                const label = document.getElementById('feedback-mentions-label');
                const icon = document.getElementById('feedback-mentions-icon');
                const isHidden = panel.classList.toggle('hidden');
                label.innerText = isHidden ? 'แสดงรายละเอียด' : 'ซ่อนรายละเอียด';
                icon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-up');
                lucide.createIcons();
            ">
                <div class="flex items-center gap-3">
                    <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><i data-lucide="users-round" class="h-6 w-6"></i></span>
                    <div>
                        <h3 class="text-lg font-black text-slate-900">ลูกค้าพูดถึงใครบ้าง</h3>
                        <p class="mt-1 text-sm font-bold text-slate-500">สรุปฝ่ายขาย ทีมช่าง และบริษัทที่ถูกพูดถึงในช่วงเวลานี้</p>
                    </div>
                </div>
                <span class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">
                    <span id="feedback-mentions-label">แสดงรายละเอียด</span>
                    <i id="feedback-mentions-icon" data-lucide="chevron-down" class="h-4 w-4"></i>
                </span>
            </button>
            <div id="feedback-mentions-panel" class="hidden border-t border-slate-100 bg-slate-50/70 p-5">
                <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div class="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                        <div class="mb-4 flex items-center gap-3">
                            <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><i data-lucide="trophy" class="h-5 w-5"></i></span>
                            <h4 class="text-base font-black text-slate-900">ฝ่ายขาย</h4>
                        </div>
                        <div class="max-h-[360px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">${statRows(salesStats, { rank: 'bg-blue-100 text-blue-700', text: 'text-blue-600', bar: 'bg-blue-500' })}</div>
                    </div>
                    <div class="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div class="mb-4 flex items-center gap-3">
                            <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><i data-lucide="shield-check" class="h-5 w-5"></i></span>
                            <h4 class="text-base font-black text-slate-900">ทีมช่าง</h4>
                        </div>
                        <div class="max-h-[360px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">${statRows(techStats, { rank: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', bar: 'bg-emerald-500' })}</div>
                    </div>
                    <div class="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <div class="mb-4 flex items-center gap-3">
                            <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><i data-lucide="building-2" class="h-5 w-5"></i></span>
                            <h4 class="text-base font-black text-slate-900">บริษัท / ลูกค้าหลัก</h4>
                        </div>
                        <div class="max-h-[360px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">${statRows(companyStats, { rank: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-600', bar: 'bg-indigo-500' })}</div>
                    </div>
                </div>
            </div>
        </section>

        ${feedbackErrorMessage ? `
            <section class="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800 shrink-0">
                โหลดข้อมูล Feedback ไม่สำเร็จ: ${html(feedbackErrorMessage)}
            </section>
        ` : ''}

        <section>
            <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3 class="text-2xl font-black text-slate-900">รายละเอียดคำติชม</h3>
                    <p class="mt-1 text-sm font-bold text-slate-500">${filtered.length} รายการในช่วงเวลาที่เลือก</p>
                </div>
                <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                    <i data-lucide="table" class="h-4 w-4"></i>
                    เปิดตารางต้นทาง
                </a>
            </div>
            <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
                ${filtered.length === 0 ? '<div class="col-span-full rounded-[1.5rem] border border-slate-200 bg-white p-12 text-center font-bold text-slate-400">ไม่พบข้อมูล Feedback ในช่วงเวลาที่เลือก</div>' : ''}
                ${filtered.map((row, idx) => {
                    const sSent = getFeedbackSentiment(row.salesComments, row.salesFeedback);
                    const tSent = getFeedbackSentiment(row.techComments, row.techFeedback);
                    const hasComplaint = sSent === 'negative' || tSent === 'negative';
                    const cardShell = hasComplaint ? 'border-red-200 shadow-red-100/70 ring-2 ring-red-50' : 'border-slate-200 shadow-slate-200/60';
                    const cardHeader = hasComplaint ? 'bg-red-50/80 border-red-100' : 'bg-slate-50 border-slate-100';
                    const salesTone = panelTone(sSent, {
                        wrap: 'border-blue-100 bg-blue-50/40',
                        heading: 'text-blue-700',
                        icon: 'bg-blue-100 text-blue-700',
                        name: 'border-blue-100 bg-white text-slate-700',
                        quote: 'border-blue-300 bg-white text-slate-800',
                        feedback: 'bg-blue-50 border-blue-100 text-blue-950',
                        label: 'text-blue-600'
                    });
                    const techTone = panelTone(tSent, {
                        wrap: 'border-emerald-100 bg-emerald-50/40',
                        heading: 'text-emerald-700',
                        icon: 'bg-emerald-100 text-emerald-700',
                        name: 'border-emerald-100 bg-white text-slate-700',
                        quote: 'border-emerald-300 bg-white text-slate-800',
                        feedback: 'bg-emerald-50 border-emerald-100 text-emerald-950',
                        label: 'text-emerald-600'
                    });

                    return `
                        <article class="overflow-hidden rounded-[1.75rem] border-2 ${cardShell} bg-white shadow-lg">
                            <div class="h-2 ${hasComplaint ? 'bg-red-500' : 'bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500'}"></div>
                            <div class="border-b ${cardHeader} p-5">
                                <div class="flex flex-wrap items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hasComplaint ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'} text-2xl font-black shadow-md">${idx + 1}</span>
                                            <h4 class="truncate text-xl font-black ${hasComplaint ? 'text-red-900' : 'text-slate-900'}">${html(row.customerName || 'ไม่ระบุชื่อ')}</h4>
                                            ${hasComplaint ? '<span class="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white"><i data-lucide="alert-triangle" class="h-4 w-4"></i> มีคอมเพลน</span>' : '<span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><i data-lucide="check-circle" class="h-4 w-4"></i> ปกติ</span>'}
                                        </div>
                                        <p class="mt-2 text-sm font-bold text-slate-500">${html(row.company || '-')} · ${html(row.week || '-')}</p>
                                    </div>
                                    <span class="rounded-xl bg-white px-3 py-2 text-xs font-black ${hasComplaint ? 'text-red-700 border border-red-100' : 'text-slate-600'} shadow-sm">วันที่ติดตั้ง : ${html(row.installDate || '-')}</span>
                                </div>
                                <p class="mt-3 flex items-start gap-2 text-base font-bold text-slate-500"><i data-lucide="map-pin" class="mt-0.5 h-4 w-4 shrink-0"></i>${html(row.address || '-')}</p>
                            </div>

                            <div class="grid grid-cols-1 gap-4 bg-white p-4 lg:grid-cols-2">
                                <div class="rounded-[1.35rem] border p-5 ${salesTone.wrap}">
                                    <div class="mb-4 flex items-center justify-between gap-3 border-b border-white/70 pb-3">
                                        <p class="flex items-center gap-2 text-base font-black ${salesTone.heading}"><span class="flex h-9 w-9 items-center justify-center rounded-xl ${salesTone.icon}"><i data-lucide="briefcase" class="h-5 w-5"></i></span> ฝ่ายขาย</p>
                                        ${sentimentPill(sSent)}
                                    </div>
                                    <p class="inline-flex rounded-xl border px-3 py-2 text-sm font-black ${salesTone.name}">${html(row.salesName || '-')}</p>
                                    <blockquote class="mt-4 rounded-2xl border-l-4 p-4 text-base font-bold leading-relaxed ${salesTone.quote}">${row.salesComments && row.salesComments.trim() !== '' ? html(row.salesComments) : 'ไม่มีข้อมูลคำติชม'}</blockquote>
                                    ${row.salesFeedback ? `<p class="mt-4 rounded-2xl border p-4 text-base font-bold leading-relaxed ${salesTone.feedback}"><span class="mb-1 block text-base font-black ${salesTone.label}">Feedback / การแก้ไข</span>${html(row.salesFeedback)}</p>` : ''}
                                </div>
                                <div class="rounded-[1.35rem] border p-5 ${techTone.wrap}">
                                    <div class="mb-4 flex items-center justify-between gap-3 border-b border-white/70 pb-3">
                                        <p class="flex items-center gap-2 text-base font-black ${techTone.heading}"><span class="flex h-9 w-9 items-center justify-center rounded-xl ${techTone.icon}"><i data-lucide="wrench" class="h-5 w-5"></i></span> ทีมช่าง</p>
                                        ${sentimentPill(tSent)}
                                    </div>
                                    <p class="inline-flex rounded-xl border px-3 py-2 text-sm font-black ${techTone.name}">${html(row.technicians || '-')}</p>
                                    <blockquote class="mt-4 rounded-2xl border-l-4 p-4 text-base font-bold leading-relaxed ${techTone.quote}">${row.techComments && row.techComments.trim() !== '' ? html(row.techComments) : 'ไม่มีข้อมูลคำติชม'}</blockquote>
                                    ${row.techFeedback ? `<p class="mt-4 rounded-2xl border p-4 text-base font-bold leading-relaxed ${techTone.feedback}"><span class="mb-1 block text-base font-black ${techTone.label}">Feedback / การแก้ไข</span>${html(row.techFeedback)}</p>` : ''}
                                </div>
                            </div>

                            ${row.suggestions && row.suggestions !== '-' ? `
                                <div class="border-t border-amber-100 bg-amber-50 p-5">
                                    <p class="mb-2 flex items-center gap-2 text-sm font-black text-amber-700"><i data-lucide="message-circle" class="h-5 w-5"></i> ข้อเสนอแนะเพิ่มเติม</p>
                                    <p class="text-base font-bold leading-relaxed text-slate-800">${html(row.suggestions)}</p>
                                </div>
                            ` : ''}

                            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs font-bold text-slate-400">
                                <span>วันที่สำรวจ: ${html(row.surveyDate || '-')}</span>
                                <span>แหล่งข้อมูล: Feedback Sheet</span>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        </section>
    `;
    lucide.createIcons();
}
