// Shared expense lookup/provenance for the combined Monthly sales chart.
// Join by year-month, never by array position; do not add expenses to sales.
(function (root) {
    'use strict';
    const money = value => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    const safe = value => escapeHTML(String(value));
    const yearMonths = year => BBExpenseData.snapshot().months.filter(month => month.year === year);
    const lookup = key => BBExpenseData.snapshot().months.find(month => month.key === key);
    const value = key => { const month = lookup(key); return month?.hasData ? month.total : null; };

    function combine(salesMonths, year) {
        const months = new Map(salesMonths.map(month => [month.key, month]));
        for (const expense of yearMonths(year)) {
            if (!expense.hasData || months.has(expense.key)) continue;
            months.set(expense.key, {
                key: expense.key, year: expense.year, month: expense.month, label: expense.label,
                expenseOnly: true, sales: { actual: null, target: null },
                coverage: { chartData: {}, unconfirmedWeeks: [] }
            });
        }
        return [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
    }
    function cell(key) {
        const month = lookup(key);
        return month?.hasData
            ? `<td class="monthly-expense-value">${money(month.total)}${month.warnings.length ? ' <span title="ตรวจสอบต้นทาง">⚠</span>' : ''}</td>`
            : '<td class="monthly-expense-value"><span title="ยังไม่มีข้อมูลค่าใช้จ่าย">—</span></td>';
    }
    function difference(month) {
        const expense = value(month.key);
        const sales = month.sales?.actual;
        if (expense === null || !Number.isFinite(sales) || month.expenseOnly || month.coverage?.hasPlanDerived) return null;
        // Preserve source precision and round only the resulting baht difference.
        return Math.round((sales - expense) * 100) / 100;
    }
    function differenceCell(month) {
        const result = difference(month);
        if (result === null) return '<td class="monthly-expense-difference"><span title="ข้อมูลยอดขายหรือค่าใช้จ่ายยังไม่พร้อมคำนวณ">—</span></td>';
        const sign = result > 0 ? '+' : result < 0 ? '−' : '';
        return `<td class="monthly-expense-difference">${sign}${money(Math.abs(result))}${lookup(month.key)?.warnings.length ? ' <span title="ตรวจสอบค่าใช้จ่ายต้นทาง">⚠</span>' : ''}</td>`;
    }
    function summarize(months) {
        const sum = values => {
            const available = values.filter(Number.isFinite);
            return available.length ? available.reduce((total, item) => total + item, 0) : null;
        };
        const sales = sum(months.map(month => month.sales?.actual));
        const target = sum(months.map(month => month.sales?.target));
        const expenses = sum(months.map(month => value(month.key)));
        const matched = months.filter(month => difference(month) !== null);
        const comparableTarget = months.length > 0 && months.every(month =>
            Number.isFinite(month.sales?.actual) && Number.isFinite(month.sales?.target)
            && !month.coverage?.hasPlanDerived && !month.coverage?.isFuture && !month.coverage?.hasFutureActual);
        return {
            count: months.length, sales, target, expenses, matched,
            expenseCount: months.filter(month => value(month.key) !== null).length,
            difference: months.length && matched.length === months.length ? Math.round((sales - expenses) * 100) / 100 : null,
            variance: comparableTarget && target > 0 ? (sales / target - 1) * 100 : null
        };
    }
    function renderTotals(months) {
        if (!months.length) return '';
        const total = summarize(months);
        const number = value => value === null ? '—' : money(value);
        const signed = value => value === null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value))}`;
        const row = (summary, label, scope) => {
            const variance = summary.variance === null ? '—' : `${summary.variance > 0 ? '+' : summary.variance < 0 ? '−' : ''}${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(Math.abs(summary.variance))}%`;
            return `<tr data-total-scope="${scope}"><th scope="row">${label}<small class="monthly-total-note">${summary.count} เดือน · ตามข้อมูลในตาราง</small></th><td>${number(summary.target)}</td><td class="monthly-sales-value">${number(summary.sales)}</td><td class="monthly-expense-value">${number(summary.expenses)}${summary.expenseCount < summary.count ? `<small class="monthly-total-note">มีข้อมูล ${summary.expenseCount}/${summary.count} เดือน</small>` : ''}</td><td class="monthly-expense-difference">${signed(summary.difference)}${summary.difference === null ? '<small class="monthly-total-note">ข้อมูลยังไม่ครบสำหรับคำนวณ</small>' : ''}</td><td>${variance}<small class="monthly-total-note">${summary.variance === null ? 'ข้อมูลยังไม่พร้อมเทียบเป้า' : 'คำนวณจากยอดรวม'}</small></td></tr>`;
        };
        return `<tfoot class="monthly-summary-totals">${row(total, 'รวมตามตาราง', 'all')}${total.matched.length > 0 && total.matched.length < total.count ? row(summarize(total.matched), 'รวมเดือนที่มียอดขายและค่าใช้จ่าย', 'matched') : ''}</tfoot>`;
    }
    function renderNotes(year) {
        const state = BBExpenseData.snapshot();
        const months = yearMonths(year);
        const ready = state.status === 'ready' && months.length > 0;
        const warnings = months.flatMap(month => month.warnings.map(warning => `${month.label} — ${warning}`));
        const readAt = state.updatedAt ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(state.updatedAt)) : '';
        const source = `<span>${readAt ? `อ่านค่าใช้จ่ายล่าสุด ${safe(readAt)} · ` : ''}<a href="${BBExpenseData.source.url}" target="_blank" rel="noopener noreferrer">ดูชีตค่าใช้จ่าย ↗</a></span>`;
        let notice = '';
        if (ready && warnings.length) {
            notice = `<div class="monthly-expense-notice" role="note"><strong>มีค่าใช้จ่ายต้นทางที่ควรตรวจสอบ</strong>${warnings.map(warning => `<p>${safe(warning)}</p>`).join('')}</div>`;
        } else if (!ready) {
            const message = state.status === 'error' ? state.error : state.status === 'ready' ? `ยังไม่มีข้อมูลค่าใช้จ่ายปี ${year} ในชีต` : state.status === 'loading' ? 'กำลังโหลดค่าใช้จ่ายจากชีต…' : 'ยังไม่ได้โหลดข้อมูลค่าใช้จ่าย';
            notice = `<div class="monthly-expense-load-status" role="status"><span>${safe(message)}</span>${state.status !== 'loading' ? '<button type="button" class="monthly-button" onclick="BBMonthlyExpenses.reload()">โหลดค่าใช้จ่ายอีกครั้ง</button>' : ''}</div>`;
        }
        return `${notice}<div class="monthly-expense-source"><span>ค่าใช้จ่าย: แถว TOTAL · “—” = ยังไม่มีข้อมูล · แท่งซ้อนฐานเดียวกัน ไม่บวกยอดรวม</span>${source}</div>`;
    }
    async function reload() {
        const request = BBExpenseData.load();
        if (currentPage === 'monthly') updateDashboardUI();
        await request;
        if (currentPage === 'monthly') updateDashboardUI();
    }
    root.BBMonthlyExpenses = Object.freeze({ combine, value, lookup, cell, difference, differenceCell, summarize, renderTotals, money, renderNotes, reload });
})(window);
