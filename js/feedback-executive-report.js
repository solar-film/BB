(() => {
    'use strict';

    const SPREADSHEET_ID = '1HaOmTLOl1YaaEIf_9WatknaAwIJGI8AZI1H-QO7CvHM';
    const SHEET_NAME = 'Feedback-BB-Week';
    const DATA_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const CACHE_KEY = 'bb-feedback-executive-report-cache-v1';
    const state = { records: [], weeks: [], selectedWeeks: [], sentiment: 'all' };
    const el = (id) => document.getElementById(id);
    const clean = (value) => String(value ?? '').trim();
    const escapeHTML = (value) => clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

    function parseCSV(text) {
        const rows = [];
        let row = [], field = '', quoted = false;
        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (quoted) {
                if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
                else if (char === '"') quoted = false;
                else field += char;
            } else if (char === '"') quoted = true;
            else if (char === ',') { row.push(field); field = ''; }
            else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
            else if (char !== '\r') field += char;
        }
        if (field || row.length) { row.push(field); rows.push(row); }
        return rows;
    }

    function mapRecord(row) {
        return {
            recordId: clean(row[0]), sourceId: clean(row[2]), customerName: clean(row[4]), company: clean(row[5]),
            address: clean(row[9]), installDate: clean(row[11]), sales: clean(row[14]), week: clean(row[15]), inquiryDate: clean(row[16]),
            salesComment: clean(row[17]), salesFeedback: clean(row[18]), techComment: clean(row[19]), techFeedback: clean(row[20]),
            suggestions: clean(row[21]), technicians: clean(row[22]), note: clean(row[23])
        };
    }

    async function loadReport() {
        el('report-error').classList.add('hidden');
        el('report-loading').classList.remove('done');
        try {
            const response = await fetch(`${DATA_URL}&_=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Google Sheets ตอบกลับด้วยรหัส ${response.status}`);
            const records = parseCSV(await response.text()).slice(1).map(mapRecord).filter((record) => record.recordId && record.week);
            if (!records.length) throw new Error('ยังไม่มีข้อมูล Week ในชีต Feedback-BB-Week');
            state.records = records;
            localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), records }));
        } catch (error) {
            const cached = readCache();
            if (!cached?.records?.length) {
                el('error-message').textContent = error.message;
                el('report-error').classList.remove('hidden');
                return;
            }
            state.records = cached.records;
            el('source-note').textContent = 'Source: Feedback-BB-Week · ใช้ข้อมูลสำรองล่าสุด';
        } finally {
            if (state.records.length) initializeWeeks();
            el('report-loading').classList.add('done');
        }
    }

    function readCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (_) { return null; }
    }

    function initializeWeeks() {
        state.weeks = [...new Set(state.records.map((record) => record.week).filter(Boolean))].sort((a, b) => weekRank(b) - weekRank(a));
        state.selectedWeeks = state.selectedWeeks.filter((week) => state.weeks.includes(week));
        if (!state.selectedWeeks.length) state.selectedWeeks = [state.weeks[0]];
        renderWeekOptions();
        renderReport();
    }

    function renderWeekOptions() {
        el('week-options').innerHTML = state.weeks.map((week) => `
            <label class="week-option"><input type="checkbox" value="${escapeHTML(week)}" ${state.selectedWeeks.includes(week) ? 'checked' : ''}><span>${escapeHTML(week)}</span></label>`).join('');
        updateWeekButton();
    }

    function updateWeekButton() {
        const selected = state.selectedWeeks;
        el('week-filter-button').textContent = selected.length === 1 ? selected[0] : selected.length === state.weeks.length ? `ทุก Week (${selected.length})` : `${selected[0]} +${selected.length - 1}`;
    }

    function weekRank(value) {
        const numbers = [...clean(value).matchAll(/\d+/g)].map((match) => Number(match[0]));
        return numbers.length ? Math.max(...numbers) : -1;
    }

    function renderReport() {
        const records = state.records
            .filter((record) => state.selectedWeeks.includes(record.week))
            .filter(recordMatchesSentiment)
            .sort((a, b) => dateValue(b.inquiryDate) - dateValue(a.inquiryDate));
        const metrics = calculateMetrics(records);
        el('week-range').textContent = dateRange(records);
        const weekLabel = state.selectedWeeks.length === 1 ? state.selectedWeeks[0] : `${state.selectedWeeks.length} Week`;
        const sentimentLabel = ({ all: 'คำชมและคอมเพลนทั้งหมด', praise: 'เฉพาะคำชม', complaint: 'เฉพาะคอมเพลน' })[state.sentiment];
        el('report-subtitle').textContent = `${weekLabel} · ${sentimentLabel} · ${dateRange(records)} · ${records.length.toLocaleString('th-TH')} งาน`;
        el('generated-date').textContent = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date());
        renderExecutiveSummary(metrics);
        renderKpis(metrics);
        renderSentiment(metrics);
        renderPeople(metrics);
        renderDetails(records);
        el('source-note').textContent = `Source: Feedback-BB-Week · ${weekLabel} · ${sentimentLabel} · ${records.length.toLocaleString('th-TH')} งาน`;
    }

    function recordMatchesSentiment(record) {
        if (state.sentiment === 'all') return true;
        const moods = [mood(record.salesComment), mood(record.techComment)];
        if (state.sentiment === 'praise') return moods.some((value) => value === 'praise' || value === 'mixed');
        if (state.sentiment === 'complaint') return moods.some((value) => value === 'complaint' || value === 'mixed');
        return true;
    }

    function calculateMetrics(records) {
        const roleEntries = records.flatMap((record) => [
            { role: 'ฝ่ายขาย', owner: record.sales || 'ไม่ระบุฝ่ายขาย', comment: record.salesComment, feedback: record.salesFeedback, record },
            { role: 'ทีมช่าง', owner: record.technicians || 'ไม่ระบุรายชื่อช่าง', comment: record.techComment, feedback: record.techFeedback, record }
        ]).map((entry) => ({ ...entry, mood: mood(entry.comment) }));
        const companyCounts = records.reduce((acc, record) => {
            const company = clean(record.company).toUpperCase();
            const key = company.includes('GFS') ? 'GFS' : company.includes('MHL') ? 'MHL' : 'อื่นๆ';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, { GFS: 0, MHL: 0, 'อื่นๆ': 0 });
        const uniqueCompanies = new Set(records.map((record) => clean(record.company)).filter(Boolean));
        const praiseEntries = roleEntries.filter((entry) => entry.mood === 'praise' || entry.mood === 'mixed');
        const complaintEntries = roleEntries.filter((entry) => entry.mood === 'complaint' || entry.mood === 'mixed');
        return {
            records, roleEntries, companyCounts, companyTotal: uniqueCompanies.size,
            praiseEntries, complaintEntries,
            praisedPeople: countPeople(praiseEntries), complaintPeople: countPeople(complaintEntries),
            withFeedback: records.filter((record) => record.salesComment || record.techComment || record.salesFeedback || record.techFeedback).length,
            suggestions: records.filter((record) => record.suggestions || record.note).length
        };
    }

    function countPeople(entries) {
        const counts = new Map();
        entries.forEach((entry) => {
            const key = `${entry.role} : ${entry.owner}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
    }

    function mood(value) {
        const text = clean(value);
        const hasPraise = text.includes('คำชม');
        const hasComplaint = text.includes('คอมเพลน');
        if (hasPraise && hasComplaint) return 'mixed';
        if (hasComplaint) return 'complaint';
        if (hasPraise) return 'praise';
        if (text.includes('แนะนำ')) return 'recommend';
        return 'empty';
    }

    function renderExecutiveSummary(metrics) {
        const total = metrics.records.length;
        const coverage = total ? Math.round(metrics.withFeedback / total * 100) : 0;
        const complaintMessage = metrics.complaintEntries.length
            ? `<strong>มี ${metrics.complaintEntries.length.toLocaleString('th-TH')} ประเด็นคอมเพลนที่ควรติดตาม</strong> จาก ${metrics.complaintPeople.length.toLocaleString('th-TH')} ฝ่ายขาย/ทีมช่าง โดยมีรายละเอียดพร้อมผู้เกี่ยวข้องในตารางด้านล่าง`
            : '<strong>ไม่พบคอมเพลนใน Week นี้</strong> ควรรักษามาตรฐานบริการและใช้คำชมเป็นตัวอย่างการทำงานที่ดี';
        el('executive-summary').innerHTML = `
            <li><strong>ได้รับ Feedback จากลูกค้า ${total.toLocaleString('th-TH')} งาน</strong> ครอบคลุม ${metrics.companyTotal.toLocaleString('th-TH')} บริษัท — GFS ${metrics.companyCounts.GFS.toLocaleString('th-TH')} งาน และ MHL ${metrics.companyCounts.MHL.toLocaleString('th-TH')} งาน</li>
            <li><strong>พบคำชม ${metrics.praiseEntries.length.toLocaleString('th-TH')} ประเด็น</strong> เทียบกับคอมเพลน ${metrics.complaintEntries.length.toLocaleString('th-TH')} ประเด็น จากการนับแยกฝ่ายขายและทีมช่าง</li>
            <li>${complaintMessage}</li>
            <li><strong>ความครบถ้วนของการบันทึกอยู่ที่ ${coverage}%</strong> (${metrics.withFeedback.toLocaleString('th-TH')} จาก ${total.toLocaleString('th-TH')} งานมีข้อความหรือประเภท Feedback)</li>`;
    }

    function renderKpis(metrics) {
        const total = metrics.records.length;
        const percent = (value) => total ? `${Math.round(value / total * 100)}% ของงาน` : '0% ของงาน';
        el('kpi-total').textContent = total.toLocaleString('th-TH');
        el('kpi-companies').textContent = `${metrics.companyTotal.toLocaleString('th-TH')} บริษัท`;
        el('kpi-gfs').textContent = metrics.companyCounts.GFS.toLocaleString('th-TH');
        el('kpi-gfs-share').textContent = percent(metrics.companyCounts.GFS);
        el('kpi-mhl').textContent = metrics.companyCounts.MHL.toLocaleString('th-TH');
        el('kpi-mhl-share').textContent = percent(metrics.companyCounts.MHL);
        el('kpi-praise').textContent = metrics.praiseEntries.length.toLocaleString('th-TH');
        el('kpi-complaint').textContent = metrics.complaintEntries.length.toLocaleString('th-TH');
    }

    function renderSentiment(metrics) {
        const roles = ['ฝ่ายขาย', 'ทีมช่าง'];
        const labels = { praise: 'คำชม', complaint: 'คอมเพลน', mixed: 'ชม/คอมเพลน', recommend: 'แนะนำ', empty: 'ไม่ระบุ' };
        const order = ['praise', 'complaint', 'mixed', 'recommend', 'empty'];
        const rows = roles.map((role) => {
            const entries = metrics.roleEntries.filter((entry) => entry.role === role);
            const counts = Object.fromEntries(order.map((key) => [key, entries.filter((entry) => entry.mood === key).length]));
            const bars = order.filter((key) => counts[key] > 0).map((key) => `<span class="sentiment-bar ${key}" style="flex:${counts[key]}" title="${labels[key]} ${counts[key]} รายการ">${counts[key]}</span>`).join('');
            return `<div class="sentiment-row"><strong>${role}</strong><div class="sentiment-bars">${bars || '<span class="sentiment-bar empty" style="flex:1">0</span>'}</div></div>`;
        }).join('');
        const legend = order.map((key) => `<span style="--legend:${colorForMood(key)}">${labels[key]}</span>`).join('');
        el('sentiment-chart').innerHTML = `${rows}<div class="legend">${legend}</div>`;
        el('sentiment-total').textContent = `${metrics.roleEntries.length.toLocaleString('th-TH')} ประเด็น`;
    }

    function colorForMood(key) {
        return ({ praise: '#16765b', complaint: '#ba2636', mixed: '#a86d00', recommend: '#8267df', empty: '#b7bac5' })[key];
    }

    function renderPeople(metrics) {
        el('praised-people').innerHTML = peopleHTML(metrics.praisedPeople, 'ยังไม่มีรายชื่อที่ได้รับคำชม');
        el('complaint-people').innerHTML = peopleHTML(metrics.complaintPeople, 'ไม่พบรายชื่อที่มีคอมเพลน');
    }

    function peopleHTML(rows, emptyText) {
        if (!rows.length) return `<p class="empty-person">${emptyText}</p>`;
        return rows.map((row) => `<div class="person-row"><span>${escapeHTML(row.name)}</span><b>${row.count.toLocaleString('th-TH')} ครั้ง</b></div>`).join('');
    }

    function renderDetails(records) {
        el('detail-count').textContent = `${records.length.toLocaleString('th-TH')} งาน`;
        el('detail-rows').innerHTML = records.map((record, index) => {
            const feedback = `
                <div class="feedback-line sales-feedback-line ${mood(record.salesComment)}"><b>ฝ่ายขาย:</b><span>${escapeHTML(record.salesFeedback || '—')}</span></div>
                <div class="feedback-line tech-feedback-line ${mood(record.techComment)}"><b>ทีมช่าง:</b><span>${escapeHTML(record.techFeedback || '—')}</span></div>
                ${record.suggestions ? `<div class="feedback-line suggestion-feedback-line"><b>ข้อแนะนำ:</b><span>${escapeHTML(record.suggestions)}</span></div>` : ''}
                ${record.note ? `<div class="feedback-line note-feedback-line"><b>หมายเหตุ:</b><span>${escapeHTML(record.note)}</span></div>` : ''}`;
            return `<tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHTML(record.customerName || 'ไม่ระบุชื่อ')}</strong><small>${escapeHTML(record.company || '—')} · ${escapeHTML(record.sourceId)}</small><small class="customer-address"><b>ที่อยู่:</b> ${escapeHTML(record.address || 'ไม่ระบุที่อยู่')}</small></td>
                <td><strong>ติดตั้ง ${escapeHTML(formatDate(record.installDate))}</strong><small>สอบถาม ${escapeHTML(formatDate(record.inquiryDate))}</small></td>
                <td><strong>${escapeHTML(record.sales || '—')}</strong><small>${moodTag(record.salesComment)}</small></td>
                <td><strong>${escapeHTML(record.technicians || 'ไม่ระบุ')}</strong><small>${moodTag(record.techComment)}</small></td>
                <td><div class="feedback-snippet">${feedback}</div></td>
            </tr>`;
        }).join('');
    }

    function moodTag(comment) {
        const key = mood(comment);
        const label = ({ praise: '★ คำชม', complaint: '⚠ คอมเพลน', mixed: '⚠ คำชม/คอมเพลน', recommend: '✦ แนะนำ', empty: '— ไม่ระบุ' })[key];
        return `<span class="mood-tag ${key}">${label}</span>`;
    }

    function parseDate(value) {
        const text = clean(value);
        if (!text) return null;
        const match = text.match(/(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})/);
        if (!match) return null;
        let a = Number(match[1]), b = Number(match[2]), c = Number(match[3]);
        let year, month, day;
        if (a > 31) { year = a; month = b; day = c; } else { day = a; month = b; year = c; }
        if (year > 2400) year -= 543;
        if (year < 100) year += 2000;
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function dateValue(value) { return parseDate(value)?.getTime() || 0; }

    function formatDate(value) {
        const date = parseDate(value);
        return date ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : clean(value) || '—';
    }

    function dateRange(records) {
        const dates = records.map((record) => parseDate(record.inquiryDate)).filter(Boolean).sort((a, b) => a - b);
        if (!dates.length) return state.selectedWeeks.join(', ') || '—';
        const formatter = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        return dates.length === 1 ? formatter.format(dates[0]) : `${formatter.format(dates[0])} – ${formatter.format(dates.at(-1))}`;
    }

    function truncate(value, maxLength) {
        const text = clean(value);
        return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
    }

    el('week-filter-button').addEventListener('click', () => {
        const popover = el('week-filter-popover');
        const willOpen = popover.classList.contains('hidden');
        popover.classList.toggle('hidden');
        el('week-filter-button').setAttribute('aria-expanded', String(willOpen));
    });
    el('select-latest-week').addEventListener('click', () => {
        el('week-options').querySelectorAll('input').forEach((input, index) => { input.checked = index === 0; });
    });
    el('select-all-weeks').addEventListener('click', () => {
        const inputs = [...el('week-options').querySelectorAll('input')];
        const shouldSelect = inputs.some((input) => !input.checked);
        inputs.forEach((input) => { input.checked = shouldSelect; });
        el('select-all-weeks').textContent = shouldSelect ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด';
    });
    el('apply-week-filter').addEventListener('click', () => {
        const selected = [...el('week-options').querySelectorAll('input:checked')].map((input) => input.value);
        if (!selected.length) return;
        state.selectedWeeks = selected.sort((a, b) => weekRank(b) - weekRank(a));
        updateWeekButton();
        el('week-filter-popover').classList.add('hidden');
        el('week-filter-button').setAttribute('aria-expanded', 'false');
        renderReport();
    });
    el('sentiment-filter').addEventListener('change', (event) => { state.sentiment = event.target.value; renderReport(); });
    document.addEventListener('click', (event) => {
        if (!el('week-multi-select').contains(event.target)) {
            el('week-filter-popover').classList.add('hidden');
            el('week-filter-button').setAttribute('aria-expanded', 'false');
        }
    });
    el('refresh-report').addEventListener('click', loadReport);
    el('retry-report').addEventListener('click', loadReport);
    el('print-report').addEventListener('click', () => window.print());
    loadReport();
})();
