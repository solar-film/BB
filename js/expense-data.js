// Read-only monthly totals from the expense tab; independent of Weekly sales.
(function (root) {
    'use strict';
    const SOURCE = Object.freeze({
        name: 'ค่าใช้จ่าย',
        url: 'https://docs.google.com/spreadsheets/d/12BRnIWVT227cltrdeukIAOIEJ_qrL3OH0Aw6a7gIDIo/edit?gid=152606837#gid=152606837',
        csv: 'https://docs.google.com/spreadsheets/d/12BRnIWVT227cltrdeukIAOIEJ_qrL3OH0Aw6a7gIDIo/export?format=csv&gid=152606837'
    });
    const SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const text = value => String(value ?? '').replace(/^\uFEFF/, '').trim();
    const normalized = value => text(value).replace(/[.\s]/g, '').toLowerCase();
    const exactMoney = value => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    function amount(value) {
        const raw = text(value).replace(/,/g, '');
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
        const result = Number(raw);
        return Number.isFinite(result) ? result : null;
    }
    function period(value) {
        const match = text(value).match(/^(.+?)\s+(\d{2}|\d{4})$/);
        if (!match) return null;
        const month = SHORT.findIndex((name, index) => [name, FULL[index]].some(label => normalized(label) === normalized(match[1]))) + 1;
        let year = Number(match[2]);
        if (match[2].length === 2) year += 2000;
        if (year >= 2400) year -= 543;
        if (!month || year < 1900 || year > 2200) return null;
        return { key: `${year}-${String(month).padStart(2, '0')}`, year, month, shortLabel: SHORT[month - 1], label: `${FULL[month - 1]} ${year}` };
    }
    function columnName(index) {
        let name = '';
        for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
        return name;
    }
    function parse(rows) {
        const headerIndex = rows.findIndex(row => normalized(row[0]) === 'เดือน');
        const totalIndexes = rows.map((row, index) => normalized(row[0]) === 'total' ? index : -1).filter(index => index > headerIndex);
        if (headerIndex < 0 || totalIndexes.length !== 1) throw new Error('ไม่พบหัวเดือนและแถว TOTAL ที่ชัดเจนในชีตค่าใช้จ่าย');
        const totalIndex = totalIndexes[0];
        const components = rows.slice(headerIndex + 1, totalIndex)
            .map((row, index) => ({ row, rowNumber: headerIndex + index + 2 })).filter(item => text(item.row[0]));
        const seen = new Set();
        const months = [];
        rows[headerIndex].forEach((header, column) => {
            if (column === 0 || !text(header) || normalized(header) === 'total') return;
            const date = period(header);
            if (!date) throw new Error(`อ่านหัวเดือนไม่ได้ที่ ${columnName(column)}${headerIndex + 1}`);
            if (seen.has(date.key)) throw new Error(`พบเดือนซ้ำ: ${date.label}`);
            seen.add(date.key);
            const total = amount(rows[totalIndex][column]);
            const hasEntries = components.some(item => text(item.row[column]) !== '');
            // SUM(blank, blank) produces zero in the source, not a recorded zero expense.
            const hasData = total !== null && (total !== 0 || hasEntries || !components.length);
            const warnings = [];
            if (total === null && (hasEntries || text(rows[totalIndex][column]))) warnings.push('ยอด TOTAL ว่างหรือไม่ใช่ตัวเลข กรุณาตรวจสอบต้นทาง');
            months.push({ ...date, total, hasData, sourceCell: `${columnName(column)}${totalIndex + 1}`, column, warnings });
        });
        if (!months.length) throw new Error('ไม่พบคอลัมน์เดือนในชีตค่าใช้จ่าย');
        months.sort((a, b) => a.key.localeCompare(b.key));
        // Flag a possible pasted cumulative value, but never replace or omit source totals.
        months.forEach(month => {
            const earlierTotals = months.filter(item => item.year === month.year && item.month < month.month && item.hasData && item.total > 0).map(item => item.total);
            if (month.hasData && earlierTotals.length >= 3 && month.total > Math.max(...earlierTotals) * 4) {
                month.warnings.push(`ยอด TOTAL ${exactMoney(month.total)} บาท สูงกว่าค่าสูงสุดของเดือนก่อนหน้ามากกว่า 4 เท่า กรุณาตรวจสอบ ${month.sourceCell} (แสดงตามชีต ไม่ปรับยอดเอง)`);
            }
            components.forEach(({ row, rowNumber }) => {
                const value = amount(row[month.column]);
                const previous = months.filter(item => item.year === month.year && item.month < month.month)
                    .map(item => amount(row[item.column])).filter(item => item !== null);
                const sum = previous.reduce((result, item) => result + item, 0);
                if (previous.length >= 3 && value > 0 && value > Math.max(...previous) * 2 && Math.abs(value - sum) < .01) {
                    month.warnings.push(`ตรวจสอบ ${columnName(month.column)}${rowNumber}: ตัวเลข ${exactMoney(value)} บาท เท่ากับผลรวมเดือนก่อนหน้าในแถวเดียวกัน (กราฟยังใช้ยอด TOTAL ตามชีต)`);
                }
            });
        });
        months.forEach(month => { delete month.column; });
        return { months, totalRow: totalIndex + 1 };
    }
    let state = { status: 'idle', months: [], updatedAt: null, error: null };
    let pending = null;
    function snapshot() { return state; }
    function load() {
        if (pending) return pending;
        state = { status: 'loading', months: [], updatedAt: null, error: null };
        pending = (async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            try {
                const response = await fetch(SOURCE.csv, { cache: 'no-store', signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const csv = await response.text();
                if (/^\s*</.test(csv)) throw new Error('ได้รับหน้าเว็บแทนข้อมูลค่าใช้จ่าย');
                state = { ...parse(parseCSV(csv)), status: 'ready', updatedAt: new Date().toISOString(), error: null };
            } catch (error) {
                state = { status: 'error', months: [], updatedAt: null, error: 'โหลดชีตค่าใช้จ่ายไม่สำเร็จ กรุณาลองอีกครั้ง หรือตรวจสอบสิทธิ์อ่านชีต' };
                console.warn('Expense source unavailable; no sample or stale amounts are displayed.', error);
            } finally {
                clearTimeout(timeout);
            }
            return state;
        })().finally(() => { pending = null; });
        return pending;
    }
    root.BBExpenseData = Object.freeze({ source: SOURCE, parse, snapshot, load });
})(window);
