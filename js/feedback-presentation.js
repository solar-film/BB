(() => {
    'use strict';

    const SPREADSHEET_ID = '1HaOmTLOl1YaaEIf_9WatknaAwIJGI8AZI1H-QO7CvHM';
    const SHEET_NAME = 'Feedback-BB-Week';
    const DATA_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const CACHE_KEY = 'bb-feedback-presentation-cache-v1';
    const AUTO_PLAY_MS = 12000;
    const state = { records: [], weeks: [], selectedWeek: '', slides: [], activeSlide: 0, timer: null };
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
            address: clean(row[9]), installDate: clean(row[11]), sales: clean(row[14]), week: clean(row[15]), inquiryDate: clean(row[16]), salesComment: clean(row[17]),
            salesFeedback: clean(row[18]), techComment: clean(row[19]), techFeedback: clean(row[20]),
            suggestions: clean(row[21]), technicians: clean(row[22]), note: clean(row[23])
        };
    }

    async function loadData() {
        stopAutoPlay();
        el('presentation-error').classList.add('hidden');
        el('presentation-loading').classList.remove('done');
        try {
            const response = await fetch(`${DATA_URL}&_=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Google Sheets ตอบกลับด้วยรหัส ${response.status}`);
            const records = parseCSV(await response.text()).slice(1).map(mapRecord).filter((record) => record.recordId && record.week);
            if (!records.length) throw new Error('ยังไม่มีข้อมูล Week ใน Feedback-BB-Week');
            state.records = records;
            localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), records }));
            el('data-status').textContent = `${records.length.toLocaleString('th-TH')} รายการ · ล่าสุด`;
        } catch (error) {
            const cached = readCache();
            if (!cached?.records?.length) {
                el('error-message').textContent = error.message;
                el('presentation-error').classList.remove('hidden');
                return;
            }
            state.records = cached.records;
            el('data-status').textContent = `${state.records.length.toLocaleString('th-TH')} รายการ · ข้อมูลสำรอง`;
        } finally {
            if (state.records.length) initializeWeeks();
            el('presentation-loading').classList.add('done');
        }
    }

    function initializeWeeks() {
        state.weeks = [...new Set(state.records.map((record) => record.week).filter(Boolean))].sort((a, b) => weekRank(b) - weekRank(a));
        const previous = state.selectedWeek;
        state.selectedWeek = state.weeks.includes(previous) ? previous : state.weeks[0];
        el('week-select').innerHTML = state.weeks.map((week) => `<option value="${escapeHTML(week)}">${escapeHTML(week)}</option>`).join('');
        el('week-select').value = state.selectedWeek;
        buildSlides();
    }

    function weekRank(value) {
        const numbers = [...clean(value).matchAll(/\d+/g)].map((match) => Number(match[0]));
        return numbers.length ? Math.max(...numbers) : -1;
    }

    function weekNumbers(value) {
        return [...clean(value).matchAll(/\d+/g)].map((match) => Number(match[0]));
    }

    function weekDateRange(week) {
        const numbers = weekNumbers(week);
        if (!numbers.length) return '';
        const start = weekStart(Math.min(...numbers));
        const end = weekStart(Math.max(...numbers));
        end.setDate(end.getDate() + 6);
        return `${shortThaiDate(start)} – ${shortThaiDate(end)} 2026`;
    }

    function weekStart(week) {
        const date = new Date(2025, 11, 27);
        date.setDate(date.getDate() + (week - 1) * 7);
        return date;
    }

    function shortThaiDate(date) {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }

    function buildSlides() {
        const records = state.records
            .filter((record) => record.week === state.selectedWeek)
            .sort((a, b) => dateValue(b.inquiryDate) - dateValue(a.inquiryDate));
        state.slides = [overviewSlide(records)];
        state.slides.push(...records.map((record, index) => jobSlide(record, index, records.length)));
        state.activeSlide = 0;
        el('week-range').textContent = weekDateRange(state.selectedWeek);
        renderSlides();
    }

    function jobSlide(record, index, total) {
        const salesText = record.salesFeedback || 'ไม่มีข้อความ Feedback ฝ่ายขาย';
        const techText = record.techFeedback || 'ไม่มีข้อความ Feedback ทีมช่าง';
        const suggestionText = record.suggestions || record.note || 'ไม่มีข้อแนะนำเพิ่มเติม';
        return `
            <article class="slide job-slide ${overallMoodClass(record)}" data-slide-label="JOB ${index + 1}/${total}">
                <header class="job-slide-header">
                    <div class="install-date-highlight">
                        <small>วันที่ติดตั้ง</small>
                        <strong>${escapeHTML(formatShortDate(record.installDate))}</strong>
                    </div>
                    <div class="job-title">
                        <span class="job-field-label">ชื่อลูกค้า</span>
                        <h2>${escapeHTML(record.customerName || 'ไม่ระบุชื่อลูกค้า')}</h2>
                        <div class="job-meta">
                            <span class="company-chip">${escapeHTML(record.company || '—')}</span>
                            <span>${escapeHTML(record.sourceId)}</span>
                            <span>สอบถาม ${escapeHTML(formatThaiDate(record.inquiryDate))}</span>
                        </div>
                    </div>
                    <div class="job-location">
                        <span class="job-field-label">สถานที่ติดตั้ง</span>
                        <strong>${escapeHTML(record.address || 'ไม่ระบุสถานที่ติดตั้ง')}</strong>
                    </div>
                    <div class="job-position"><strong>${index + 1}</strong><span>จาก ${total} งาน</span></div>
                </header>
                <div class="job-feedback-grid">
                    <section class="job-feedback-card ${moodClass(record.salesComment)}">
                        <div class="job-card-heading"><div class="job-heading-main"><i class="role-symbol sales-role">${roleIcon('sales')}</i><div class="job-heading-copy"><span>ฝ่ายขาย : <b>${escapeHTML(record.sales || '—')}</b></span><small>Customer feedback</small></div></div></div>
                        <div class="feedback-body"><span class="feedback-status ${moodClass(record.salesComment)}">${moodIcon(record.salesComment)} ${escapeHTML(moodLabel(record.salesComment))}</span><blockquote class="${record.salesFeedback ? feedbackLengthClass(record.salesFeedback) : 'empty-feedback'}">${escapeHTML(truncate(salesText, 420))}</blockquote></div>
                    </section>
                    <section class="job-feedback-card ${moodClass(record.techComment)}">
                        <div class="job-card-heading"><div class="job-heading-main"><i class="role-symbol tech-role">${roleIcon('tech')}</i><div class="job-heading-copy"><span>ทีมช่าง : <b>${escapeHTML(record.technicians || 'ไม่ระบุรายชื่อช่าง')}</b></span><small>Installation team feedback</small></div></div></div>
                        <div class="feedback-body"><span class="feedback-status ${moodClass(record.techComment)}">${moodIcon(record.techComment)} ${escapeHTML(moodLabel(record.techComment))}</span><blockquote class="${record.techFeedback ? feedbackLengthClass(record.techFeedback) : 'empty-feedback'}">${escapeHTML(truncate(techText, 420))}</blockquote></div>
                    </section>
                    ${record.suggestions || record.note ? `<section class="job-notes-card">
                        <div><span>ข้อแนะนำอื่นๆ</span><small>Suggestions & notes</small></div>
                        <p>${escapeHTML(truncate(suggestionText, 360))}</p>
                    </section>` : ''}
                </div>
            </article>`;
    }

    function dateValue(value) {
        const input = clean(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(`${input}T00:00:00`).getTime();
        const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (!match) return 0;
        let year = Number(match[3]);
        if (year < 100) year += 2000;
        if (year > 2400) year -= 543;
        return new Date(year, Number(match[2]) - 1, Number(match[1])).getTime();
    }

    function formatThaiDate(value) {
        const timestamp = dateValue(value);
        if (!timestamp) return clean(value) || '—';
        return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp));
    }

    function formatShortDate(value) {
        const timestamp = dateValue(value);
        if (!timestamp) return clean(value) || '—';
        return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp));
    }

    function overviewSlide(records) {
        const praise = records.filter((record) => hasMood(record, 'คำชม')).length;
        const complaints = records.filter((record) => hasMood(record, 'คอมเพลน')).length;
        const companies = new Set(records.map((record) => record.company).filter(Boolean)).size;
        const gfsCount = records.filter((record) => record.company.toUpperCase() === 'GFS').length;
        const mhlCount = records.filter((record) => record.company.toUpperCase() === 'MHL').length;
        const responseRate = records.length ? Math.round(praise / records.length * 100) : 0;
        const praisedPeople = peopleByMood(records, 'คำชม');
        const complainedPeople = peopleByMood(records, 'คอมเพลน');
        const moods = ['คำชม', 'คอมเพลน', 'คำชม/คอมเพลน', 'แนะนำ'];
        const moodCounts = moods.map((mood) => ({
            mood,
            value: records.filter((record) => (record.techComment || record.salesComment) === mood).length
        }));
        const moodMax = Math.max(1, ...moodCounts.map((item) => item.value));
        return `
            <article class="slide overview-slide" data-slide-label="OVERVIEW">
                <div class="overview-copy">
                    <span class="slide-kicker">BB CUSTOMER VOICE / WEEKLY REVIEW</span>
                    <h1>เสียงจากลูกค้า<br><span style="color:var(--purple)">${escapeHTML(state.selectedWeek)}</span></h1>
                    <p class="slide-subtitle">ภาพรวม Feedback ที่บันทึกในสัปดาห์ล่าสุด</p>
                    <div class="week-badge">${escapeHTML(weekDateRange(state.selectedWeek))}<span>${records.length.toLocaleString('th-TH')} รายการ</span></div>
                </div>
                <div class="overview-metrics">
                    <div class="big-stat accent company-breakdown">
                        <div class="total-feedback-stat"><small>ลูกค้าที่ให้ Feedback</small><strong>${records.length.toLocaleString('th-TH')}</strong><span>${companies} บริษัท</span></div>
                        <div class="company-feedback-stat gfs-feedback-stat"><small>GFS</small><strong>${gfsCount.toLocaleString('th-TH')}</strong><span>งาน</span></div>
                        <div class="company-feedback-stat mhl-feedback-stat"><small>MHL</small><strong>${mhlCount.toLocaleString('th-TH')}</strong><span>งาน</span></div>
                    </div>
                    <div class="big-stat people-stat praise-people"><small>★ ผู้ที่ได้รับคำชม</small><div class="people-list ${peopleListClass(praisedPeople)}">${peopleListHTML(praisedPeople, 'ยังไม่มีรายชื่อผู้ได้รับคำชม')}</div><span>${praisedPeople.length} รายชื่อ / ทีม</span></div>
                    <div class="big-stat people-stat complaint-people"><small>⚠ ผู้ที่มีคอมเพลน</small><div class="people-list ${peopleListClass(complainedPeople)}">${peopleListHTML(complainedPeople, 'ไม่มีรายการที่ต้องติดตาม')}</div><span>${complainedPeople.length} รายชื่อ / ทีม</span></div>
                    <div class="overview-sentiment">
                        <div class="panel-title"><strong>ประเภทคำติชม</strong><span>${records.length} รายการ</span></div>
                        <div class="sentiment-list">${moodCounts.map((item) => `<div class="sentiment-row"><span>${moodIcon(item.mood)} ${item.mood}</span><div class="sentiment-track"><i style="width:${item.value / moodMax * 100}%"></i></div><b>${item.value}</b></div>`).join('')}</div>
                    </div>
                </div>
            </article>`;
    }

    function feedbackSlide(type, records) {
        const isTech = type === 'tech';
        const commentKey = isTech ? 'techComment' : 'salesComment';
        const feedbackKey = isTech ? 'techFeedback' : 'salesFeedback';
        const title = isTech ? 'Feedback ทีมช่าง' : 'Feedback ฝ่ายขาย';
        const moods = ['คำชม', 'คอมเพลน', 'คำชม/คอมเพลน', 'แนะนำ'];
        const counts = moods.map((mood) => ({ mood, value: records.filter((record) => record[commentKey] === mood).length }));
        const max = Math.max(1, ...counts.map((item) => item.value));
        const quotes = records.filter((record) => record[feedbackKey]).slice(0, 4);
        return `
            <article class="slide content-slide ${isTech ? 'tech-slide' : 'sales-slide'}" data-slide-label="${isTech ? 'TECHNICIAN' : 'SALES'} FEEDBACK">
                <header class="slide-header"><span class="slide-kicker">${escapeHTML(state.selectedWeek)} / CUSTOMER EXPERIENCE</span><h2>${title}</h2><p class="slide-subtitle">สรุปประเภทคำติชมและเสียงสะท้อนจากลูกค้า</p></header>
                <div class="content-grid">
                    <section class="sentiment-panel"><div class="panel-title"><strong>ประเภทคำติชม</strong><span>${records.length} รายการ</span></div><div class="sentiment-list">${counts.map((item) => `<div class="sentiment-row"><span>${item.mood}</span><div class="sentiment-track"><i style="width:${item.value / max * 100}%"></i></div><b>${item.value}</b></div>`).join('')}</div></section>
                    <section class="quote-panel"><div class="panel-title"><strong>Customer Voice</strong><span>${quotes.length} เสียงสะท้อน</span></div>${quotes.length ? `<div class="quote-list">${quotes.map((record) => quoteCard(record, feedbackKey, isTech)).join('')}</div>` : '<div class="empty-slide-data"><div><span>—</span>ไม่มีข้อความ Feedback ในสัปดาห์นี้</div></div>'}</section>
                </div>
            </article>`;
    }

    function quoteCard(record, key, isTech) {
        const meta = isTech ? record.technicians : record.sales;
        return `<article class="quote-card"><blockquote>${escapeHTML(truncate(record[key], 165))}</blockquote><footer><strong>${escapeHTML(record.customerName || 'ลูกค้า')}</strong> · ${escapeHTML(record.company)}${meta ? ` · ${escapeHTML(meta)}` : ''}</footer></article>`;
    }

    function suggestionSlide(records) {
        const items = records.filter((record) => record.suggestions || record.note).slice(0, 6);
        return `
            <article class="slide content-slide suggestion-slide" data-slide-label="SUGGESTIONS">
                <header class="slide-header"><span class="slide-kicker">${escapeHTML(state.selectedWeek)} / OPPORTUNITIES</span><h2>ข้อแนะนำจากลูกค้า</h2><p class="slide-subtitle">ประเด็นที่นำไปปรับปรุงประสบการณ์ลูกค้าได้ทันที</p></header>
                <div class="suggestion-grid">${items.map((record) => `<article class="suggestion-card"><p>${escapeHTML(truncate(record.suggestions || record.note, 185))}</p><footer>${escapeHTML(record.customerName)} · ${escapeHTML(record.company)}</footer></article>`).join('')}</div>
            </article>`;
    }

    function recordsSlide(records, index, total) {
        return `
            <article class="slide content-slide records-slide" data-slide-label="RESPONSES ${index + 1}/${total}">
                <header class="slide-header"><span class="slide-kicker">${escapeHTML(state.selectedWeek)} / RESPONSE LIST</span><h2>รายการ Feedback</h2><p class="slide-subtitle">รายละเอียดผู้ตอบและประเภทคำติชม${total > 1 ? ` · หน้า ${index + 1}/${total}` : ''}</p></header>
                <div class="records-table"><div class="records-row"><span>ลูกค้า</span><span>บริษัท</span><span>ฝ่ายขาย</span><span>ฝ่ายขาย</span><span>ทีมช่าง</span></div>${records.map((record) => `<div class="records-row"><strong>${escapeHTML(record.customerName)}</strong><span>${escapeHTML(record.company)}</span><span>${escapeHTML(record.sales || '—')}</span>${moodPill(record.salesComment)}${moodPill(record.techComment)}</div>`).join('')}</div>
            </article>`;
    }

    function moodPill(value) {
        const mood = clean(value) || '—';
        const cls = mood.includes('คอมเพลน') ? 'complaint'
            : mood.includes('คำชม') ? 'praise'
            : mood.includes('แนะนำ') ? 'recommend'
            : 'neutral';
        return `<span class="mood-pill ${cls}"><i>${moodIcon(mood)}</i>${escapeHTML(mood)}</span>`;
    }

    function moodIcon(value) {
        const mood = clean(value);
        if (mood.includes('คอมเพลน')) return '⚠';
        if (mood.includes('คำชม')) return '★';
        if (mood.includes('แนะนำ')) return '✦';
        return '−';
    }

    function roleIcon(role) {
        if (role === 'sales') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5L19 15.4a2.5 2.5 0 1 1-3.5 3.5l-6.7-6.7a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5"/></svg>';
    }

    function moodLabel(value) {
        return clean(value) || 'ไม่มีคำติชม';
    }

    function moodClass(value) {
        const mood = clean(value);
        if (mood.includes('คอมเพลน')) return 'mood-complaint';
        if (mood.includes('คำชม')) return 'mood-praise';
        if (mood.includes('แนะนำ')) return 'mood-recommend';
        return 'mood-empty';
    }

    function overallMoodClass(record) {
        const moods = `${clean(record.salesComment)} ${clean(record.techComment)}`;
        if (moods.includes('คอมเพลน')) return 'mood-complaint';
        if (moods.includes('คำชม')) return 'mood-praise';
        if (moods.includes('แนะนำ')) return 'mood-recommend';
        return 'mood-empty';
    }

    function feedbackLengthClass(value) {
        const length = clean(value).length;
        if (length > 300) return 'very-long-feedback';
        if (length > 170) return 'long-feedback';
        return '';
    }

    function hasMood(record, mood) {
        return record.salesComment.includes(mood) || record.techComment.includes(mood);
    }

    function peopleByMood(records, mood) {
        const people = [];
        records.forEach((record) => {
            if (record.salesComment.includes(mood) && record.sales) people.push(`ฝ่ายขาย : ${record.sales}`);
            if (record.techComment.includes(mood) && record.technicians) people.push(`ทีมช่าง : ${record.technicians}`);
        });
        return [...new Set(people)];
    }

    function peopleListHTML(people, emptyText) {
        if (!people.length) return `<em>${escapeHTML(emptyText)}</em>`;
        return people.map((person) => `<b>${escapeHTML(person)}</b>`).join('');
    }

    function peopleListClass(people) {
        if (people.length > 10) return 'dense';
        if (people.length > 4) return 'compact';
        return '';
    }

    function renderSlides() {
        el('slide-stage').innerHTML = state.slides.join('');
        el('slide-dots').innerHTML = state.slides.map((_, index) => `<button type="button" data-slide="${index}" aria-label="ไปสไลด์ ${index + 1}"></button>`).join('');
        el('slide-dots').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => goToSlide(Number(button.dataset.slide))));
        updateActiveSlide();
    }

    function goToSlide(index) {
        state.activeSlide = (index + state.slides.length) % state.slides.length;
        updateActiveSlide();
    }

    function updateActiveSlide() {
        document.querySelectorAll('.slide').forEach((slide, index) => slide.classList.toggle('active', index === state.activeSlide));
        el('slide-dots').querySelectorAll('button').forEach((dot, index) => dot.classList.toggle('active', index === state.activeSlide));
        el('slide-counter').textContent = `${state.activeSlide + 1} / ${state.slides.length}`;
    }

    function toggleAutoPlay() {
        if (state.timer) stopAutoPlay();
        else {
            state.timer = setInterval(() => goToSlide(state.activeSlide + 1), AUTO_PLAY_MS);
            el('play-slides').textContent = 'Ⅱ หยุดเล่น';
        }
    }

    function stopAutoPlay() {
        if (state.timer) clearInterval(state.timer);
        state.timer = null;
        if (el('play-slides')) el('play-slides').textContent = '▶ เล่นอัตโนมัติ';
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    }

    function truncate(value, max) {
        const text = clean(value);
        return text.length > max ? `${text.slice(0, max).trim()}…` : text;
    }

    function chunk(items, size) {
        const chunks = [];
        for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
        return chunks;
    }

    function readCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (_) { return null; }
    }

    el('week-select').addEventListener('change', () => { state.selectedWeek = el('week-select').value; stopAutoPlay(); buildSlides(); });
    el('previous-slide').addEventListener('click', () => goToSlide(state.activeSlide - 1));
    el('next-slide').addEventListener('click', () => goToSlide(state.activeSlide + 1));
    el('play-slides').addEventListener('click', toggleAutoPlay);
    el('fullscreen-button').addEventListener('click', toggleFullscreen);
    el('refresh-button').addEventListener('click', loadData);
    el('retry-button').addEventListener('click', loadData);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') goToSlide(state.activeSlide + 1);
        else if (event.key === 'ArrowLeft') goToSlide(state.activeSlide - 1);
        else if (event.key === ' ') { event.preventDefault(); toggleAutoPlay(); }
        else if (event.key.toLowerCase() === 'f') toggleFullscreen();
        else if (event.key === 'Escape') stopAutoPlay();
    });

    loadData();
})();
