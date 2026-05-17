// Utility helpers shared across all dashboard pages.
function parseCSV(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) { if (s && l === p) row[i] += l; s = !s; }
        else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) { if ('\r' === p) row[i] = row[i].slice(0, -1); row = ret[++r] = [l = '']; i = 0; }
        else row[i] += l; p = l;
    }
    return ret;
}

function formatCurrency(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value); }
function cleanNumber(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
}

function normalizeSalesRepData(rep) {
    const derivedMeets = (rep.newMeets || 0) + (rep.oldMeets || 0);
    const derivedInstalls = (rep.newInstalls || 0) + (rep.oldInstalls || 0);
    const derivedSales = (rep.newSales || 0) + (rep.oldSales || 0) + (rep.noInstallSales || 0);
    const meets = derivedMeets > 0 ? derivedMeets : rep.meets;
    const installsLooksLikeSales = rep.installs > 1000 && derivedInstalls > 0;
    const installs = installsLooksLikeSales ? derivedInstalls : rep.installs;
    const sales = rep.sales > 0 ? rep.sales : derivedSales;

    return {
        ...rep,
        meets,
        installs,
        sales,
        sr: meets > 0 ? (installs / meets) * 100 : 0
    };
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

const escapeAttr = escapeHTML;

function extractMonthGroup(dateRangeStr) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    let foundMonth = '';
    const tokens = dateRangeStr.split(/[\s\-–]+/);
    for (let i = tokens.length - 1; i >= 0; i--) { if (months.includes(tokens[i].trim())) { foundMonth = tokens[i].trim(); break; } }
    if (foundMonth) {
        const yearMatch = dateRangeStr.match(/(20\d{2}|25\d{2})/);
        return `${foundMonth} ${yearMatch ? yearMatch[0] : '2026'}`;
    }
    return dateRangeStr; 
}

function destroyAllCharts() {
    Object.values(charts).forEach(c => { if (c) c.destroy(); });
    charts = {};
}

function calculateMetrics(current) {
    const YEARLY_TARGET = 100000000;
    let ytdActual = dashboardData.reduce((s, d) => s + d.gfs.actual + d.mhl.actual + d.car.actual, 0);
    const monthGroup = extractMonthGroup(current.dateRange);
    let mTarget = 0, mActual = 0;
    dashboardData.forEach(d => {
        if (extractMonthGroup(d.dateRange) === monthGroup) {
            mTarget += (d.gfs.target + d.mhl.target + d.car.target);
            mActual += (d.gfs.actual + d.mhl.actual + d.car.actual);
        }
    });
    const cIdx = dashboardData.findIndex(d => d.id === selectedId);
    const prev = cIdx > 0 ? dashboardData[cIdx - 1] : null;
    const wA = current.gfs.actual + current.mhl.actual + current.car.actual;
    const pA = prev ? (prev.gfs.actual + prev.mhl.actual + prev.car.actual) : 0;
    const growth = pA > 0 ? ((wA - pA) / pA) * 100 : 0;
    const mkS = current.marketing.gfs.actual + current.marketing.mhl.actual + current.marketing.car.actual;
    
    return { ytd: { t: YEARLY_TARGET, a: ytdActual, p: (ytdActual/YEARLY_TARGET)*100 }, monthly: { t: mTarget, a: mActual, p: mTarget > 0 ? (mActual/mTarget)*100 : 0, label: monthGroup }, weekly: { t: current.gfs.target+current.mhl.target+current.car.target, a: wA, p: (wA/(current.gfs.target+current.mhl.target+current.car.target || 1))*100, g: growth, r: mkS > 0 ? (wA/mkS).toFixed(1) : 0 } };
}

function getStatusBadge(prog) {
    const color = prog >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200';
    return `<span class="px-2 py-0.5 ${color} border rounded-lg text-sm font-black">${prog.toFixed(1)}%</span>`;
}

function checkSentiment(text) {
    if (!text) return 'neutral';
    const pos = text.match(/ดี|ประทับใจ|เยี่ยม|ok|ตรงเวลา|เรียบร้อย|สุภาพ|รวดเร็ว|ไว|แนะนำ|พอใจ/i);
    const neg = text.match(/แย่|คอมเพลน|ตำหนิ|ปัญหา|แก้ไข|ช้า|ปรับปรุง|ไม่ดี|รอนาน/i);
    if (neg) return 'negative';
    if (pos) return 'positive';
    return 'neutral';
}

function getSentimentIcon(type, size = 'w-5 h-5') {
    if (type === 'positive') return `<i data-lucide="smile" class="${size} text-emerald-500"></i>`;
    if (type === 'negative') return `<i data-lucide="frown" class="${size} text-red-500"></i>`;
    return `<i data-lucide="meh" class="${size} text-slate-400"></i>`;
}
