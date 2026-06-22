(() => {
    'use strict';

    const SPREADSHEET_ID = '1HaOmTLOl1YaaEIf_9WatknaAwIJGI8AZI1H-QO7CvHM';
    const SOURCE_SHEET = 'Our-DATA';
    const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SOURCE_SHEET)}`;
    const FEEDBACK_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Feedback-BB-Week')}`;
    const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsArGYvGXKS7Q2oj8i1ynI5p86tsOMdsSV8HG15GsH3almHCh0RcCivbkVU_Fw_v7sLw/exec';
    const SOURCE_CACHE_KEY = 'bb-feedback-source-cache-v1';
    const RECENT_CACHE_KEY = 'bb-feedback-recent-v1';
    const PAGE_STEP = 40;

    const state = { jobs: [], filtered: [], selected: null, visible: PAGE_STEP, recent: [], activeTab: 'jobs', editingRecordId: '' };
    const el = (id) => document.getElementById(id);
    const clean = (value) => String(value ?? '').trim();
    const escapeHTML = (value) => clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const numberValue = (value) => Number(clean(value).replace(/,/g, '').replace(/[^\d.-]/g, '')) || 0;
    const numberFormat = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

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

    function parseDate(value) {
        const match = clean(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (!match) return new Date(0);
        let year = Number(match[3]);
        if (year < 100) year += 2000;
        if (year > 2400) year -= 543;
        return new Date(year, Number(match[2]) - 1, Number(match[1]));
    }

    function mapJob(row, index) {
        const installDate = clean(row[26]);
        return {
            sourceRow: index + 2,
            id: clean(row[4]) || clean(row[0]) || `ROW-${index + 2}`,
            customerName: clean(row[8]) || 'ไม่ระบุชื่อลูกค้า',
            company: clean(row[9]) || 'ไม่ระบุ',
            phone: clean(row[13]),
            channel: clean(row[10]),
            lineAt: clean(row[11]),
            address: clean(row[16]) || clean(row[7]),
            installMonth: clean(row[25]) || clean(row[1]),
            installDate,
            glassArea: numberValue(row[19]),
            unit: clean(row[21]) || 'ตรฟ.',
            sales: clean(row[27]) || clean(row[5]),
            technicianFromSource: clean(row[28]),
            sortDate: parseDate(installDate)
        };
    }

    async function loadSource() {
        el('refresh-source').classList.add('loading');
        try {
            const response = await fetch(`${SOURCE_URL}&_=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const rows = parseCSV(await response.text());
            state.jobs = rows.slice(1).map(mapJob).filter((job) => job.id && job.customerName).sort((a, b) => b.sortDate - a.sortDate || b.sourceRow - a.sourceRow);
            localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), jobs: state.jobs }));
            setSourceStatus(`Our-DATA · ${state.jobs.length.toLocaleString('th-TH')} งาน`, true);
        } catch (error) {
            const cached = readJSON(SOURCE_CACHE_KEY);
            state.jobs = cached?.jobs?.map((job) => ({ ...job, sortDate: new Date(job.sortDate) })) || [];
            setSourceStatus(state.jobs.length ? 'แสดงข้อมูลสำรองล่าสุด' : 'เชื่อมต่อไม่สำเร็จ', false);
        } finally {
            populateSourceFilters();
            filterJobs();
            el('refresh-source').classList.remove('loading');
            el('loading-overlay').classList.add('done');
        }
    }

    function populateSourceFilters() {
        fillSelect('month-filter', state.jobs.map((job) => job.installMonth));
        populateDayFilter();
    }

    function populateDayFilter() {
        const selectedMonth = el('month-filter').value;
        const currentDay = el('day-filter').value;
        const jobs = selectedMonth ? state.jobs.filter((job) => job.installMonth === selectedMonth) : state.jobs;
        fillSelect('day-filter', jobs.map((job) => job.installDate), currentDay);
    }

    function fillSelect(id, values, selectedValue = '') {
        const select = el(id);
        const first = select.options[0].outerHTML;
        const unique = [...new Set(values.filter(Boolean))].sort((a, b) => {
            if (id === 'day-filter') return parseDate(b) - parseDate(a);
            if (id === 'month-filter') return parseThaiMonth(b) - parseThaiMonth(a);
            return a.localeCompare(b, 'th');
        });
        select.innerHTML = first + unique.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('');
        if (unique.includes(selectedValue)) select.value = selectedValue;
    }

    function parseThaiMonth(value) {
        const months = {
            'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
            'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
            'ม.ค': 0, 'ก.พ': 1, 'มี.ค': 2, 'เม.ย': 3, 'พ.ค': 4, 'มิ.ย': 5,
            'ก.ค': 6, 'ส.ค': 7, 'ก.ย': 8, 'ต.ค': 9, 'พ.ย': 10, 'ธ.ค': 11
        };
        const match = clean(value).match(/(ม\.ค\.?|ก\.พ\.?|มี\.ค\.?|เม\.ย\.?|พ\.ค\.?|มิ\.ย\.?|ก\.ค\.?|ส\.ค\.?|ก\.ย\.?|ต\.ค\.?|พ\.ย\.?|ธ\.ค\.?)\s*(\d{2,4})?/);
        if (!match) return new Date(0);
        let year = Number(match[2]) || new Date().getFullYear();
        if (year < 100) year += 2000;
        if (year > 2400) year -= 543;
        return new Date(year, months[match[1]], 1);
    }

    function filterJobs(reset = true) {
        if (reset) state.visible = PAGE_STEP;
        const query = clean(el('job-search').value).toLocaleLowerCase('th');
        const month = el('month-filter').value;
        const day = el('day-filter').value;
        const hasFilter = Boolean(query || month || day);
        if (!hasFilter) {
            state.filtered = [];
            renderJobs(false);
            return;
        }
        state.filtered = state.jobs.filter((job) => {
            const haystack = [job.id, job.customerName, job.company, job.phone, job.lineAt, job.sales, job.address].join(' ').toLocaleLowerCase('th');
            return (!query || haystack.includes(query)) && (!month || job.installMonth === month) && (!day || job.installDate === day);
        });
        renderJobs(true);
    }

    function renderJobs(hasSearch = Boolean(clean(el('job-search').value) || el('month-filter').value || el('day-filter').value)) {
        const shown = state.filtered.slice(0, state.visible);
        el('job-count').textContent = hasSearch
            ? `พบ ${state.filtered.length.toLocaleString('th-TH')} จาก ${state.jobs.length.toLocaleString('th-TH')} งาน`
            : `พร้อมค้นหาจาก ${state.jobs.length.toLocaleString('th-TH')} งาน`;
        el('job-list').innerHTML = !hasSearch
            ? '<div class="search-prompt"><span>⌕</span><strong>ค้นหางานที่ต้องการ</strong><p>พิมพ์คำค้นหา หรือเลือกเดือนและวันที่ติดตั้งด้านบน</p></div>'
            : shown.length ? shown.map((job) => `
            <button class="job-card ${state.selected?.sourceRow === job.sourceRow ? 'selected' : ''}" type="button" data-row="${job.sourceRow}">
                <span class="job-card-top"><span class="company-tag">${escapeHTML(job.company)}</span><span class="job-date">${escapeHTML(job.installDate || 'ไม่ระบุวันที่')}</span></span>
                <h3>${escapeHTML(job.customerName)}</h3><p>${escapeHTML(job.id)} · ${escapeHTML(job.address || 'ไม่ระบุที่อยู่')}</p>
                <span class="job-card-meta"><span>ฝ่ายขาย <strong>${escapeHTML(job.sales || '—')}</strong></span><span>${job.glassArea ? `${numberFormat.format(job.glassArea)} ${escapeHTML(job.unit)}` : 'ไม่ระบุพื้นที่'}</span></span>
            </button>`).join('') : '<div class="empty-mini">ไม่พบงานที่ตรงกับคำค้นหา</div>';
        el('load-more').classList.toggle('hidden', !hasSearch || state.visible >= state.filtered.length);
        document.querySelectorAll('.job-card').forEach((button) => button.addEventListener('click', () => selectJob(Number(button.dataset.row))));
    }

    function selectJob(sourceRow) {
        state.selected = state.jobs.find((job) => job.sourceRow === sourceRow);
        if (!state.selected) return;
        state.editingRecordId = '';
        el('record-id').value = '';
        clearFeedbackFields(true);
        showSelectedJob();
        updateFormMode();
    }

    function showSelectedJob() {
        const job = state.selected;
        el('source-id').value = job.id;
        el('source-row').value = job.sourceRow;
        el('selected-customer').textContent = job.customerName;
        el('selected-company').textContent = job.company;
        el('selected-source-id').textContent = job.id;
        const items = [
            ['ชื่อลูกค้า', job.customerName], ['บริษัท', job.company], ['เบอร์โทรติดต่อ', phoneLink(job.phone)], ['ช่องทาง', job.channel || '—'],
            ['Line @', job.lineAt || '—'], ['ที่อยู่', job.address || '—', true], ['เดือนติดตั้ง', job.installMonth || '—'], ['วันที่ติดตั้ง', job.installDate || '—'],
            ['พื้นที่กระจก', job.glassArea ? numberFormat.format(job.glassArea) : '—'], ['หน่วย', job.unit], ['ฝ่ายขาย', job.sales || '—']
        ];
        el('source-grid').innerHTML = items.map(([label, value, wide]) => `<div class="source-item ${wide ? 'wide' : ''}"><small>${label}</small><strong>${value}</strong></div>`).join('');
        el('empty-selection').classList.add('hidden');
        el('feedback-form').classList.remove('hidden');
        el('job-panel').classList.add('has-selection');
        hideFormStatus();
        renderJobs();
        if (window.innerWidth <= 760) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateFormMode() {
        const editing = Boolean(state.editingRecordId);
        el('form-mode-label').textContent = editing ? 'EDITING SAVED FEEDBACK' : 'SELECTED CUSTOMER';
        el('edit-mode-badge').classList.toggle('hidden', !editing);
        el('submit-button').querySelector('span').textContent = editing ? 'อัปเดต Feedback-BB-Week' : 'บันทึกลง Feedback-BB-Week';
        el('clear-feedback').textContent = editing ? 'ยกเลิกการแก้ไข' : 'ล้างเฉพาะ Feedback';
    }

    function phoneLink(phone) {
        if (!phone) return '—';
        const safe = escapeHTML(phone);
        const dial = clean(phone).replace(/[^\d+]/g, '');
        return `<a href="tel:${escapeHTML(dial)}">${safe}</a>`;
    }

    function setupWeeks() {
        el('bb-week').innerHTML = '<option value="">เลือก BB Week</option>' + Array.from({ length: 53 }, (_, index) => {
            const week = index + 1;
            return `<option value="Week ${week}">Week ${week} (${getBBWeekDateRange(week)})</option>`;
        }).join('');
        el('inquiry-date').value = todayISO();
        el('bb-week').value = `Week ${weekOfYear(new Date())}`;
    }

    function todayISO() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function weekOfYear(date) {
        const weekOneStart = new Date(2025, 11, 27);
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return Math.min(53, Math.max(1, Math.floor((target - weekOneStart) / (7 * 86400000)) + 1));
    }

    function getBBWeekDateRange(week) {
        const start = new Date(2025, 11, 27);
        start.setDate(start.getDate() + (week - 1) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${formatThaiShortDate(start)} – ${formatThaiShortDate(end)}`;
    }

    function formatThaiShortDate(date) {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }

    function collectPayload() {
        const job = state.selected;
        const editing = Boolean(state.editingRecordId);
        return {
            action: editing ? 'update' : 'create', recordId: editing ? state.editingRecordId : createRecordId(), savedAt: new Date().toISOString(),
            sourceId: job.id, sourceRow: job.sourceRow, customerName: job.customerName, company: job.company,
            phone: job.phone, channel: job.channel, lineAt: job.lineAt, address: job.address,
            installMonth: job.installMonth, installDate: job.installDate, glassArea: job.glassArea,
            unit: job.unit, sales: job.sales, bbWeek: el('bb-week').value, inquiryDate: el('inquiry-date').value,
            salesComment: clean(el('sales-comment').value), salesFeedback: clean(el('sales-feedback').value),
            techComment: clean(el('tech-comment').value), techFeedback: clean(el('tech-feedback').value),
            suggestions: clean(el('suggestions').value), technicianNames: clean(el('technician-names').value), note: clean(el('note').value)
        };
    }

    function validatePayload(payload) {
        if (!state.selected) return 'กรุณาเลือกงานจาก Our-DATA';
        if (!payload.bbWeek) return 'กรุณาเลือก BB Week';
        if (!payload.inquiryDate) return 'กรุณาระบุวันที่สอบถาม';
        const feedbackFields = ['salesComment', 'salesFeedback', 'techComment', 'techFeedback', 'suggestions', 'note'];
        if (!feedbackFields.some((key) => payload[key])) return 'กรุณากรอก Feedback อย่างน้อย 1 ช่อง';
        return '';
    }

    async function submitFeedback(event) {
        event.preventDefault();
        const scriptUrl = getScriptUrl();
        const payload = collectPayload();
        const validation = validatePayload(payload);
        if (validation) { showFormStatus(validation, true); return; }
        const button = el('submit-button');
        const isEditing = payload.action === 'update';
        button.disabled = true;
        button.querySelector('span').textContent = isEditing ? 'กำลังอัปเดต...' : 'กำลังบันทึก...';
        showFormStatus(isEditing ? 'กำลังอัปเดตแถวเดิมใน Feedback-BB-Week...' : 'กำลังส่งข้อมูลไปยังชีต Feedback-BB-Week...', false);
        try {
            await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const verified = await verifySavedFeedback(payload);
            if (!verified) throw new Error('VERIFY_FAILED');
            addRecent(payload);
            showFormStatus(isEditing ? 'อัปเดตข้อมูลเดิมเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว', false, true);
            showToast(`${isEditing ? 'อัปเดต' : 'บันทึก'} ${payload.customerName} · ${payload.bbWeek}`);
            if (!isEditing) clearFeedbackFields(false);
        } catch (error) {
            showFormStatus(isEditing && error.message === 'VERIFY_FAILED'
                ? 'ยังอัปเดตไม่สำเร็จ กรุณา Deploy Apps Script เวอร์ชันใหม่ที่รองรับการแก้ไข'
                : 'ส่งข้อมูลไม่สำเร็จ กรุณาตรวจสอบ Apps Script แล้วลองอีกครั้ง', true);
        } finally {
            button.disabled = false;
            updateFormMode();
        }
    }

    async function verifySavedFeedback(payload) {
        for (let attempt = 0; attempt < 6; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 900 : 1300));
            try {
                const response = await fetch(`${FEEDBACK_SHEET_URL}&_=${Date.now()}`, { cache: 'no-store' });
                if (!response.ok) continue;
                const rows = parseCSV(await response.text()).slice(1);
                const row = rows.find((item) => clean(item[0]) === payload.recordId);
                if (!row) continue;
                const matches = clean(row[15]) === clean(payload.bbWeek)
                    && normalizeDate(row[16]) === normalizeDate(payload.inquiryDate)
                    && clean(row[17]) === clean(payload.salesComment)
                    && clean(row[18]) === clean(payload.salesFeedback)
                    && clean(row[19]) === clean(payload.techComment)
                    && clean(row[20]) === clean(payload.techFeedback)
                    && clean(row[21]) === clean(payload.suggestions)
                    && clean(row[22]) === clean(payload.technicianNames)
                    && clean(row[23]) === clean(payload.note);
                if (matches) return true;
            } catch (_) { /* Retry while Google Sheets refreshes. */ }
        }
        return false;
    }

    function createRecordId() {
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        return `FB-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }

    function addRecent(payload) {
        state.recent = [payload, ...state.recent.filter((item) => item.recordId !== payload.recordId)].slice(0, 500);
        localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(state.recent));
        populateRecentWeekFilter();
        renderRecent();
    }

    function renderRecent() {
        const query = clean(el('recent-search')?.value).toLocaleLowerCase('th');
        const selectedWeek = el('recent-week-filter')?.value || '';
        const records = state.recent.filter((item) => (!selectedWeek || item.bbWeek === selectedWeek) && (!query || [item.customerName, item.company, item.sourceId, item.bbWeek, item.inquiryDate, item.sales, item.technicianNames].join(' ').toLocaleLowerCase('th').includes(query)));
        el('recent-count').textContent = state.recent.length;
        el('recent-empty').classList.toggle('hidden', records.length > 0);
        el('recent-list').innerHTML = records.map((item) => `
            <button type="button" class="recent-card" data-record-id="${escapeHTML(item.recordId)}"><strong>${escapeHTML(item.customerName)}</strong><p>${escapeHTML(item.company)} · ${escapeHTML(item.sourceId)}</p><footer><span>${escapeHTML(item.bbWeek)} · ${formatThaiDate(item.inquiryDate)}</span><b>แก้ไข ›</b></footer></button>`).join('');
        document.querySelectorAll('.recent-card[data-record-id]').forEach((button) => button.addEventListener('click', () => editSavedFeedback(button.dataset.recordId)));
    }

    async function syncRecent() {
        const scriptUrl = getScriptUrl();
        if (!scriptUrl) return;
        try {
            const response = await fetch(`${scriptUrl}?action=list&limit=500&_=${Date.now()}`, { cache: 'no-store' });
            const result = await response.json();
            if (result.ok && Array.isArray(result.records)) {
                state.recent = result.records;
                localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(state.recent));
                populateRecentWeekFilter();
                renderRecent();
            }
        } catch (_) { /* Keep local recent records when Apps Script response is blocked. */ }
    }

    function populateRecentWeekFilter() {
        const select = el('recent-week-filter');
        if (!select) return;
        const current = select.value;
        const weeks = [...new Set(state.recent.map((item) => clean(item.bbWeek)).filter(Boolean))]
            .sort((a, b) => feedbackWeekRank(b) - feedbackWeekRank(a));
        select.innerHTML = '<option value="">ทุก Week</option>' + weeks.map((week) => `<option value="${escapeHTML(week)}">${escapeHTML(week)}</option>`).join('');
        if (weeks.includes(current)) select.value = current;
    }

    function feedbackWeekRank(value) {
        const numbers = [...clean(value).matchAll(/\d+/g)].map((match) => Number(match[0]));
        return numbers.length ? Math.max(...numbers) : -1;
    }

    function editSavedFeedback(recordId) {
        const record = state.recent.find((item) => item.recordId === recordId);
        if (!record) return;
        state.editingRecordId = record.recordId;
        el('record-id').value = record.recordId;
        state.selected = state.jobs.find((job) => clean(job.id) === clean(record.sourceId)) || {
            id: record.sourceId, sourceRow: Number(record.sourceRow) || 0, customerName: record.customerName,
            company: record.company, phone: record.phone, channel: record.channel, lineAt: record.lineAt,
            address: record.address, installMonth: record.installMonth, installDate: record.installDate,
            glassArea: numberValue(record.glassArea), unit: record.unit, sales: record.sales, technicianFromSource: record.technicianNames
        };
        showSelectedJob();
        setSelectValue('bb-week', record.bbWeek);
        el('inquiry-date').value = normalizeDate(record.inquiryDate);
        setSelectValue('sales-comment', record.salesComment);
        el('sales-feedback').value = clean(record.salesFeedback);
        setSelectValue('tech-comment', record.techComment);
        el('tech-feedback').value = clean(record.techFeedback);
        el('suggestions').value = clean(record.suggestions);
        el('technician-names').value = clean(record.technicianNames);
        el('note').value = clean(record.note);
        updateFormMode();
        hideFormStatus();
    }

    function setSelectValue(id, value) {
        const select = el(id);
        const target = clean(value);
        if (target && ![...select.options].some((option) => option.value === target)) {
            select.add(new Option(target, target));
        }
        select.value = target;
    }

    function clearFeedbackFields(resetTechnician = true) {
        ['sales-comment', 'sales-feedback', 'tech-comment', 'tech-feedback', 'suggestions', 'note'].forEach((id) => { el(id).value = ''; });
        if (resetTechnician) el('technician-names').value = state.selected?.technicianFromSource || '';
        el('inquiry-date').value = todayISO();
        el('bb-week').value = `Week ${weekOfYear(new Date())}`;
    }

    function handleClearFeedback() {
        if (state.editingRecordId) {
            state.editingRecordId = '';
            el('record-id').value = '';
        }
        clearFeedbackFields(true);
        hideFormStatus();
        updateFormMode();
    }

    function changeCustomer() {
        state.selected = null;
        state.editingRecordId = '';
        el('record-id').value = '';
        el('feedback-form').classList.add('hidden');
        el('empty-selection').classList.remove('hidden');
        el('job-panel').classList.remove('has-selection');
        updateFormMode();
        renderJobs();
    }

    function switchTab(tab) {
        state.activeTab = tab;
        el('jobs-tab').classList.toggle('active', tab === 'jobs');
        el('recent-tab').classList.toggle('active', tab === 'recent');
        el('jobs-view').classList.toggle('hidden', tab !== 'jobs');
        el('recent-view').classList.toggle('hidden', tab !== 'recent');
        if (tab === 'recent') syncRecent();
    }

    function getScriptUrl() { return DEFAULT_SCRIPT_URL; }

    function setSourceStatus(text, online) { el('source-status').textContent = text; el('source-dot').classList.toggle('online', online); }
    function showFormStatus(message, error = false, success = false) { el('form-status').textContent = message; el('form-status').className = `form-status${error ? ' error' : success ? ' success' : ''}`; }
    function hideFormStatus() { el('form-status').classList.add('hidden'); }
    function showToast(message) { el('toast-message').textContent = message; el('toast').classList.remove('hidden'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el('toast').classList.add('hidden'), 3500); }
    function formatThaiDate(value) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? clean(value) : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date); }
    function normalizeDate(value) {
        const input = clean(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
        const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (!match) return input;
        let year = Number(match[3]);
        if (year < 100) year += 2000;
        if (year > 2400) year -= 543;
        return `${year}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
    }
    function readJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } }

    function bindEvents() {
        let debounce;
        el('job-search').addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => filterJobs(true), 180); });
        el('month-filter').addEventListener('change', () => { populateDayFilter(); filterJobs(true); });
        el('day-filter').addEventListener('change', () => filterJobs(true));
        el('load-more').addEventListener('click', () => { state.visible += PAGE_STEP; renderJobs(); });
        el('refresh-source').addEventListener('click', loadSource);
        el('jobs-tab').addEventListener('click', () => switchTab('jobs'));
        el('recent-tab').addEventListener('click', () => switchTab('recent'));
        el('recent-search').addEventListener('input', renderRecent);
        el('recent-week-filter').addEventListener('change', renderRecent);
        el('change-customer').addEventListener('click', changeCustomer);
        el('clear-feedback').addEventListener('click', handleClearFeedback);
        el('feedback-form').addEventListener('submit', submitFeedback);
        el('inquiry-date').addEventListener('change', () => { const date = new Date(`${el('inquiry-date').value}T00:00:00`); if (!Number.isNaN(date.getTime())) el('bb-week').value = `Week ${weekOfYear(date)}`; });
    }

    state.recent = readJSON(RECENT_CACHE_KEY) || [];
    setupWeeks();
    populateRecentWeekFilter();
    renderRecent();
    bindEvents();
    loadSource();
    syncRecent();
})();
