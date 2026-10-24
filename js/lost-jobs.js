/* Standalone, read-only CUSTOMER_ALL viewer. Does not load dashboard modules. */
(function () {
    'use strict';
    const SOURCE = 'https://docs.google.com/spreadsheets/d/1Ag7yh0SFSqGfm3LTNinHwlwV6h5Xa4M2yIuf03mq2uc/export?format=csv&gid=949197576';
    const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const clean = value => String(value ?? '').trim();
    function parseCSV(text) {
        const rows = []; let row = [], field = '', quoted = false;
        text = text.replace(/^\uFEFF/, '');
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                if (quoted && text[i + 1] === '"') { field += '"'; i++; }
                else quoted = !quoted;
            } else if (char === ',' && !quoted) { row.push(field); field = ''; }
            else if ((char === '\n' || char === '\r') && !quoted) {
                if (char === '\r' && text[i + 1] === '\n') i++;
                row.push(field); rows.push(row); row = []; field = '';
            } else field += char;
        }
        if (quoted) throw new Error('รูปแบบ CSV ไม่สมบูรณ์');
        if (field || row.length) { row.push(field); rows.push(row); }
        return rows;
    }
    function year(value) { const y = Number(value); return y > 2400 ? y - 543 : y < 100 ? 2000 + y : y; }
    function dateParts(value) {
        const s = clean(value);
        // Google Sheets may export a date as a serial number, with fractional time.
        if (/^\d{5}(?:\.\d+)?$/.test(s)) {
            const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
            return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
        }
        let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s|$|T)/);
        if (m) return [year(m[1]), Number(m[2]), Number(m[3])];
        m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s|$)/);
        return m ? [year(m[3]), Number(m[2]), Number(m[1])] : null;
    }
    function formatDate(value) {
        const parts = dateParts(value);
        if (!parts) return '—';
        const [y, m, d] = parts;
        const check = new Date(Date.UTC(y, m - 1, d));
        if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return '—';
        return d + '/' + m + '/' + y;
    }
    function monthKey(month, date) {
        const s = clean(month), d = dateParts(date);
        const thai = s.match(/^(\S+)\s+(\d{2,4})$/);
        let y, m;
        if (thai && MONTHS.includes(thai[1])) { y = year(thai[2]); m = MONTHS.indexOf(thai[1]) + 1; }
        else {
            const numeric = s.match(/^(\d{1,2})[\/-](\d{2,4})$/);
            const iso = s.match(/^(\d{4})-(\d{1,2})$/);
            if (numeric) { y = year(numeric[2]); m = Number(numeric[1]); }
            else if (iso) { y = year(iso[1]); m = Number(iso[2]); }
            else if (!s && d) [y, m] = d;
        }
        return y && m >= 1 && m <= 12 ? `${y}-${String(m).padStart(2, '0')}` : s ? `other:${s}` : 'unknown';
    }
    function monthLabel(key) {
        if (key === 'unknown') return 'ไม่ระบุเดือน';
        if (key.startsWith('other:')) return key.slice(6);
        const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`;
    }
    function recordsFromCSV(text) {
        const rows = parseCSV(text);
        const header = rows.findIndex(r => clean(r[23]) === 'สถานะ' && clean(r[4]) === 'Sale');
        if (header < 0 || clean(rows[header][42]) !== 'สาเหตุ') throw new Error('โครงสร้างคอลัมน์ CUSTOMER_ALL ไม่ตรงกับที่กำหนด');
        return rows.slice(header + 1).filter(r => clean(r[23]) === 'ไม่ติดตั้ง').map(r => ({
            date: clean(r[25]), month: monthKey(r[24], r[25]), person: clean(r[4]) || 'ไม่ระบุฝ่ายขาย',
            customer: clean(r[7]), company: clean(r[8]), site: clean(r[6]), type: clean(r[13]), area: clean(r[18]), quote: clean(r[17]), reason: clean(r[42])
        })).sort((a, b) => b.month.localeCompare(a.month) || (dateParts(b.date)?.[2] || 0) - (dateParts(a.date)?.[2] || 0));
    }
    function filterRecords(records, person, month) { return records.filter(r => (!person || r.person === person) && (!month || r.month === month)); }
    const PERIODS = [['this-month', 'เดือนนี้'], ['last-month', 'เดือนที่ผ่านมา'], ['3-months', '3 เดือน'], ['6-months', '6 เดือน'], ['this-year', 'ปีนี้'], ['', 'ทั้งหมด']];
    function filterPeriod(records, period, currentMonth) {
        if (!period) return records;
        if (!PERIODS.some(([value]) => value === period)) return filterRecords(records, '', period);
        const ordinal = month => { const [y, m] = month.split('-').map(Number); return y * 12 + m - 1; };
        const end = ordinal(currentMonth);
        const start = period === 'this-year' ? Math.floor(end / 12) * 12
            : end - ({ 'this-month': 0, 'last-month': 1, '3-months': 2, '6-months': 5 }[period]);
        const last = period === 'last-month' ? end - 1 : end;
        return records.filter(r => /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) && ordinal(r.month) >= start && ordinal(r.month) <= last);
    }
    if (typeof module !== 'undefined' && module.exports) { module.exports = { formatDate, parseCSV, monthKey, recordsFromCSV, filterRecords, filterPeriod }; return; }
    const $ = id => document.getElementById(id);
    const todayParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit'
    }).formatToParts(new Date());
    const currentMonth = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}`;
    let selectedPeriod = 'this-month';
    for (const [value, label] of PERIODS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.dataset.period = value;
        button.setAttribute('aria-pressed', String(value === selectedPeriod));
        button.addEventListener('click', () => {
            selectedPeriod = value;
            $('month').value = '';
            page = 1;
            render();
        });
        $('period-buttons').append(button);
    }
    let records = [], page = 1; const pageSize = 50;
    function options(id, values, label) {
        const previous = $(id).value;
        $(id).replaceChildren(new Option(id === 'person' ? 'ทุกคน' : 'ทุกเดือน', ''));
        for (const value of values) $(id).add(new Option(label(value), value));
        $(id).value = values.includes(previous) ? previous : '';
    }
    function render() {
        for (const button of $('period-buttons').children) button.setAttribute('aria-pressed', String(button.dataset.period === selectedPeriod));
        const monthRecords = filterPeriod(records, selectedPeriod, currentMonth);
        const personCounts = new Map();
        for (const row of monthRecords) personCounts.set(row.person, (personCounts.get(row.person) || 0) + 1);
        $('sales-summary-period').textContent = PERIODS.find(([value]) => value === selectedPeriod)?.[1] || monthLabel(selectedPeriod);
        $('sales-summary').replaceChildren();
        for (const [person, count] of [...personCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'))) {
            const item = document.createElement('li');
            const top = document.createElement('div'); top.className = 'sales-person-top';
            const name = document.createElement('span'); name.className = 'sales-person-name';
            const share = document.createElement('span'); share.className = 'sales-person-share';
            const percentage = count / monthRecords.length * 100;
            share.textContent = `${Math.round(percentage)}%`;
            share.title = `${percentage.toFixed(1)}% ของงานหลุดในช่วงที่เลือก`;
            const value = document.createElement('div'); value.className = 'sales-person-value';
            const amount = document.createElement('strong');
            const unit = document.createElement('span'); unit.textContent = 'งาน';
            const track = document.createElement('div'); track.className = 'sales-person-track'; track.setAttribute('aria-hidden', 'true');
            const fill = document.createElement('span'); fill.className = 'sales-person-fill'; fill.style.width = `${percentage}%`;
            track.append(fill);
            name.textContent = person;
            amount.textContent = count.toLocaleString('th-TH');
            top.append(name, share); value.append(amount, unit);
            item.append(top, value, track);
            $('sales-summary').append(item);
        }
        $('sales-summary-empty').hidden = personCounts.size > 0;
        $('sales-summary-empty').textContent = 'ไม่พบงานหลุดในช่วงเวลาที่เลือก';
        options('person', [...new Set(monthRecords.map(r => r.person))].sort((a, b) => a.localeCompare(b, 'th')), v => v);
        const filtered = filterRecords(monthRecords, $('person').value, '');
        $('count').textContent = filtered.length.toLocaleString('th-TH');
        $('people-count').textContent = new Set(filtered.filter(r => r.person !== 'ไม่ระบุฝ่ายขาย').map(r => r.person)).size;
        $('reason-count').textContent = filtered.filter(r => !r.reason).length.toLocaleString('th-TH');
        $('summary-scope').textContent = $('person').value ? `สรุปของ ${$('person').value} (รายการ)` : 'สรุปภาพรวมจากทุกฝ่ายขาย (รายการ)';
        $('people-caption').textContent = `จากฝ่ายขายในช่วงนี้ ${[...personCounts.keys()].filter(p => p !== 'ไม่ระบุฝ่ายขาย').length} คน`;
        $('reason-caption').textContent = filtered.length ? `คิดเป็น ${(filtered.filter(r => !r.reason).length / filtered.length * 100).toFixed(1)}% ของทั้งหมด` : 'ไม่มีงานหลุดในช่วงที่เลือก';
        // Compare an equal number of calendar months, keeping the salesperson filter.
        const toOrdinal = key => { const [y, m] = key.split('-').map(Number); return y * 12 + m - 1; };
        const now = toOrdinal(currentMonth);
        const span = selectedPeriod === '3-months' ? 3 : selectedPeriod === '6-months' ? 6 : selectedPeriod === 'this-year' ? Number(currentMonth.slice(5)) : 1;
        const end = selectedPeriod === 'last-month' ? now - 1 : /^\d{4}-\d{2}$/.test(selectedPeriod) ? toOrdinal(selectedPeriod) : now;
        const prior = records.filter(r => /^\d{4}-\d{2}$/.test(r.month) && toOrdinal(r.month) >= end - 2 * span + 1 && toOrdinal(r.month) <= end - span && (!$('person').value || r.person === $('person').value));
        $('comparison').hidden = !selectedPeriod || !prior.length;
        if (selectedPeriod && prior.length) {
            const delta = (filtered.length - prior.length) / prior.length * 100;
            $('comparison-value').textContent = `${delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : ''}${delta.toFixed(0)}%`;
            $('comparison-value').classList.toggle('increase', delta > 0);
            $('comparison-label').textContent = span === 1 ? 'จากเดือนก่อน' : `จาก ${span} เดือนก่อนหน้า`;
        }
        const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.min(page, pages);
        $('rows').replaceChildren();
        const groupCounts = new Map();
        for (const row of filtered) groupCounts.set(row.person, (groupCounts.get(row.person) || 0) + 1);
        // Rank by the full filtered count before pagination; preserve newest-first within each group.
        const groupedRows = [...filtered].sort((a, b) => groupCounts.get(b.person) - groupCounts.get(a.person) || a.person.localeCompare(b.person, 'th'));
        const offset = (page - 1) * pageSize;
        let lastPerson = null;
        for (const row of groupedRows.slice(offset, page * pageSize)) {
            if (row.person !== lastPerson) {
                const headingRow = document.createElement('tr');
                headingRow.className = 'sales-group-heading';
                const heading = document.createElement('th');
                heading.colSpan = 9;
                const continued = lastPerson === null && offset > 0 && groupedRows[offset - 1].person === row.person;
                heading.textContent = `${row.person} · ${groupCounts.get(row.person).toLocaleString('th-TH')} งาน${continued ? ' (ต่อจากหน้าก่อน)' : ''}`;
                headingRow.append(heading);
                $('rows').append(headingRow);
                lastPerson = row.person;
            }
            const tr = document.createElement('tr');
            for (const [i, value] of [formatDate(row.date), row.person, row.customer, row.site, row.type, row.area, row.quote, 'ไม่ติดตั้ง', row.reason].entries()) {
                const td = document.createElement('td');
                if (i === 0) {
                    const date = document.createElement('div');
                    date.textContent = value;
                    td.append(date);
                    if (row.company) {
                        const company = document.createElement('span');
                        const brand = clean(row.company).toUpperCase();
                        company.className = 'company-tag' + (brand === 'GFS' ? ' company-tag-gfs' : brand === 'MHL' ? ' company-tag-mhl' : '');
                        company.textContent = row.company;
                        td.append(company);
                    }
                }
                else if (i === 6) {
                    const quote = document.createElement('span');
                    quote.className = 'quote-number';
                    quote.textContent = value || '—';
                    quote.title = value || '';
                    td.append(quote);
                }
                else if (i === 7) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = value; td.append(badge); }
                else td.textContent = value || '—';
                tr.append(td);
            }
            $('rows').append(tr);
        }
        if (!filtered.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 9; td.className = 'empty'; td.textContent = 'ไม่พบงานหลุดตามตัวกรองที่เลือก'; tr.append(td); $('rows').append(tr); }
        $('page-info').textContent = `หน้า ${page} / ${pages} · ${filtered.length.toLocaleString('th-TH')} รายการ · หน้าละ ${pageSize} รายการ`;
        $('previous').disabled = page <= 1; $('next').disabled = page >= pages;
    }
    async function load() {
        for (const button of $('period-buttons').children) button.disabled = true;
        for (const id of ['refresh', 'person', 'month', 'reset', 'previous', 'next']) $(id).disabled = true;
        $('status').hidden = false;
        $('status').className = 'status'; $('status').textContent = 'กำลังโหลดข้อมูลจาก Google Sheets…';
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(SOURCE, { cache: 'no-store', signal: controller.signal });
            if (!response.ok) throw new Error(`Google Sheets ตอบกลับ ${response.status}`);
            records = recordsFromCSV(await response.text());
            const months = [...new Set([currentMonth, ...records.map(r => r.month)])].sort().reverse();
            const individualMonths = document.createElement('optgroup');
            individualMonths.label = 'เลือกเดือน / ปี';
            for (const month of months) individualMonths.append(new Option(monthLabel(month), month));
            $('month').replaceChildren(new Option('เลือกเดือน / ปี', ''), individualMonths);
            if (!PERIODS.some(([value]) => value === selectedPeriod) && !months.includes(selectedPeriod)) selectedPeriod = 'this-month';
            $('month').value = months.includes(selectedPeriod) ? selectedPeriod : '';
            page = 1; render();
            $('status').textContent = '';
            $('status').hidden = true;
            $('updated').textContent = 'อัปเดต ' + new Date().toLocaleString('th-TH');
            $('summary-date').textContent = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short', year: 'numeric' });
        } catch (error) {
            records = []; render();
            $('sales-summary-empty').textContent = 'ไม่สามารถโหลดข้อมูลสรุปได้';
            for (const id of ['count', 'people-count', 'reason-count']) $(id).textContent = '—';
            for (const id of ['people-caption', 'reason-caption', 'summary-date']) $(id).textContent = '—';
            $('comparison').hidden = true;
            $('rows').firstChild.firstChild.textContent = 'ไม่สามารถแสดงข้อมูลได้ กรุณาลองโหลดใหม่';
            $('updated').textContent = '';
            $('status').className = 'status error';
            $('status').textContent = 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตและสิทธิ์อ่านชีต แล้วกดโหลดข้อมูลใหม่ · ' + (error.name === 'AbortError' ? 'การเชื่อมต่อหมดเวลา' : error.message);
        } finally {
            clearTimeout(timeout);
            for (const button of $('period-buttons').children) button.disabled = false;
            for (const id of ['refresh', 'person', 'month', 'reset']) $(id).disabled = false;
        }
    }
    $('person').addEventListener('change', () => { page = 1; render(); });
    $('month').addEventListener('change', () => { selectedPeriod = $('month').value; page = 1; render(); });
    $('reset').addEventListener('click', () => { $('person').value = ''; $('month').value = ''; selectedPeriod = ''; page = 1; render(); });
    $('refresh').addEventListener('click', load);
    $('previous').addEventListener('click', () => { page--; render(); });
    $('next').addEventListener('click', () => { page++; render(); });
    load();
})();
