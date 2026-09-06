// Isolated Monthly screen; Weekly selection, filters, renderers and formulas stay untouched.
(function (root) {
    'use strict';
    let selectedMonthKey = '';
    const scrollContainers = new WeakSet();
    const money = value => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(value);
    const numeric = value => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(value);
    const percent = value => value === null ? '—' : `${numeric(value)}%`;
    const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value))}`;
    const safe = value => escapeHTML(value);
    const shortDate = value => value ? new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00Z`)) : '—';

    function periodNotes(month) {
        return [month.coverage.isOpen ? 'สะสม' : '', month.coverage.isFuture ? 'อนาคต' : '', month.coverage.hasPlanDerived ? 'จากแผน' : '', month.coverage.unconfirmedWeeks.length ? 'รอยืนยัน' : ''].filter(Boolean).map(note => ` (${note})`).join('');
    }

    function reachedTarget(month) {
        return Number.isFinite(month.sales.actual) && Number.isFinite(month.sales.target)
            && month.sales.target > 0 && month.sales.actual >= month.sales.target
            && !month.coverage.hasPlanDerived && !month.coverage.isFuture && !month.coverage.hasFutureActual;
    }

    function salesStatus(month) {
        const { actual, target } = month.sales;
        const coverage = month.coverage;
        if (coverage.hasPlanDerived) return { kind: 'pending', title: 'รอตรวจสอบข้อมูล', detail: 'มีข้อมูลอ้างอิงจากแผน', note: 'ยังไม่สรุปผลจริงเทียบเป้า' };
        if (coverage.isFuture) return { kind: 'pending', title: 'เดือนยังไม่เริ่ม', detail: 'ยังไม่สรุปผลเทียบเป้า', note: '' };
        if (coverage.hasFutureActual) return { kind: 'pending', title: 'รอตรวจสอบข้อมูล', detail: 'พบผลงานในสัปดาห์อนาคต', note: 'ยังไม่สรุปผลเทียบเป้า' };
        if (!Number.isFinite(actual) || !Number.isFinite(target)) return { kind: 'pending', title: 'ข้อมูลยังไม่พร้อม', detail: 'ยังไม่สรุปผลเทียบเป้า', note: '' };
        if (target <= 0) return { kind: 'pending', title: 'ยังไม่มีเป้าหมาย', detail: 'ยังไม่สรุปผลเทียบเป้า', note: 'เป้าหมายต้องมากกว่า 0 บาท' };
        const achieved = reachedTarget(month);
        const difference = Math.abs(actual - target);
        const differenceLabel = difference < 1 ? 'น้อยกว่า 1' : money(difference);
        const note = coverage.isOpen ? 'ยอดสะสม · เดือนยังไม่สิ้นสุด' : coverage.unconfirmedWeeks.length ? 'ตามยอดในชีต · บางสัปดาห์รอยืนยัน' : 'เทียบเป้าหมายรวมของเดือน';
        return achieved
            ? { kind: 'achieved', title: 'ถึงเป้าแล้ว!', detail: difference === 0 ? 'ยอดขายเท่ากับเป้ารายเดือน' : `เกินเป้า ${differenceLabel} บาท`, note }
            : { kind: 'below', title: 'ยังไม่ถึงเป้า', detail: `ยังขาด ${differenceLabel} บาท`, note };
    }

    function statusArtwork(kind) {
        // Code-native artwork remains crisp and consistent across desktop/mobile.
        if (kind === 'achieved') return `<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false" data-status-icon="trophy">
            <circle cx="64" cy="64" r="57" fill="#fff1be"/><g stroke="#a96609" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M42 36H26V46Q26 66 46 66M86 36H102V46Q102 66 82 66" fill="#fcd34d"/><path d="M40 28H88L84 59Q82 78 64 80Q46 78 44 59Z" fill="#fbbf24"/><path d="M47 34H57L58 61Q58 69 63 73Q50 69 49 57Z" fill="#fde68a" stroke="none"/><path d="M64 81V98M52 99H76L81 109H47Z" fill="#f5b623"/><path d="M53 19L55 12M95 77L103 81M21 76L28 72" stroke="#e6b840" stroke-width="3"/></g><path d="M104 16L107 24L115 27L107 30L104 38L101 30L93 27L101 24Z" fill="#f2b82a"/><path d="M22 18L24 23L29 25L24 27L22 32L20 27L15 25L20 23Z" fill="#f2b82a"/>
        </svg>`;
        if (kind === 'below') return `<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false" data-status-icon="disappointed">
            <circle cx="64" cy="64" r="57" fill="#ffe5e9"/><circle cx="64" cy="63" r="43" fill="#fb939c" stroke="#f38894" stroke-width="2"/><path d="M32 40Q42 30 50 31" fill="none" stroke="#ffc2c8" stroke-width="5" stroke-linecap="round"/><g fill="#173b6d"><circle cx="47" cy="58" r="4.5"/><circle cx="81" cy="58" r="4.5"/></g><path d="M47 83Q64 64 81 83" fill="none" stroke="#173b6d" stroke-width="4" stroke-linecap="round"/><ellipse cx="38" cy="71" rx="6" ry="4" fill="#ffc4ce"/><ellipse cx="90" cy="71" rx="6" ry="4" fill="#ffc4ce"/>
        </svg>`;
        return `<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false" data-status-icon="pending"><circle cx="64" cy="64" r="57" fill="#edf2f9"/><circle cx="64" cy="64" r="38" fill="#fff" stroke="#91a6c3" stroke-width="4"/><path d="M64 41V65L80 76" fill="none" stroke="#607b9e" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="64" r="4" fill="#607b9e"/></svg>`;
    }

    function selectMonth(key) {
        if (currentPage !== 'monthly') return;
        const model = BBMonthlyData.build(dashboardData);
        if (!model.months.some(month => month.key === key)) return;
        selectedMonthKey = key;
        updateDashboardUI();
        document.getElementById('monthly-month-select')?.focus();
    }

    function empty(container, title, message) {
        container.innerHTML = `<section class="monthly-dashboard"><div class="monthly-empty" role="status">
            <i data-lucide="calendar-range" aria-hidden="true"></i><h2>${safe(title)}</h2><p>${safe(message)}</p>
            <div class="monthly-actions"><button type="button" class="monthly-button" onclick="loadData()">ลองอ่านข้อมูลอีกครั้ง</button>
            <button type="button" class="monthly-button monthly-button-secondary" onclick="changePage('overview')">กลับ Weekly</button></div>
        </div></section>`;
    }

    function comparisonCopy(month, previous) {
        const comparison = BBMonthlyData.compare(month, previous);
        if (!comparison) return 'ไม่มีข้อมูลเดือนก่อนหน้าสำหรับเปรียบเทียบ';
        if (month.coverage.hasPlanDerived || previous.coverage.hasPlanDerived) return 'ยังไม่เปรียบเทียบผลจริง: มีข้อมูลที่มาจากแผน';
        if (comparison.partial) return `เดือนก่อน ${money(previous.sales.actual)} บาท · ยังไม่สรุป % เปลี่ยนแปลงจนกว่าจะครบเดือนและยืนยันสัปดาห์ที่เป็นศูนย์`;
        const change = comparison.percent === null ? 'ฐานเดือนก่อนเป็นศูนย์หรือติดลบ' : `${comparison.percent > 0 ? '+' : ''}${numeric(comparison.percent)}%`;
        return `${signed(comparison.amount)} บาท (${change}) เทียบ ${safe(previous.label)}`;
    }

    function metricCard({ title, value, target, progress, footer, disabled, status, monthLabel }) {
        // The badge is target attainment, not month-over-month growth. Keep the
        // exact ratio visible even above 100%; only the visual fill is capped.
        const available = !disabled && Number.isFinite(progress);
        const progressLabel = available ? percent(progress) : '—';
        const fill = available ? Math.max(0, Math.min(progress, 100)) : 0;
        const encouragement = status.kind === 'achieved' ? 'ยอดเยี่ยม! เติบโตไปด้วยกัน' : status.kind === 'below' ? 'สู้ต่อไป! ก้าวไปให้ถึงเป้า' : 'ตรวจข้อมูลก่อนสรุปผลงาน';
        const quote = status.kind === 'achieved' ? 'ความสำเร็จวันนี้<br>คือแรงผลักดันให้ก้าวต่อไป' : status.kind === 'below' ? 'ทุกก้าวของวันนี้<br>คือโอกาสที่ดีกว่าในวันพรุ่งนี้' : 'ข้อมูลที่ชัดเจน<br>ช่วยให้ก้าวต่อไปอย่างมั่นใจ';
        return `<article class="monthly-card monthly-metric monthly-tone-blue monthly-result-${status.kind}">
            <div class="monthly-metric-main">
                <div class="monthly-metric-watermark" aria-hidden="true"><i data-lucide="chart-no-axes-combined"></i></div>
                <div class="monthly-metric-title-row"><span class="monthly-metric-title-icon"><i data-lucide="coins" aria-hidden="true"></i></span><h2 class="monthly-metric-heading">${title}</h2></div>
                <div class="monthly-metric-value">${value}<span>บาท</span></div>
                <div class="monthly-metric-attainment">
                    <div class="monthly-sales-progress" aria-hidden="true"><span style="width:${fill}%"></span></div>
                    <span class="monthly-metric-badge" aria-label="ทำได้ ${progressLabel} ของเป้ารายเดือน">${progressLabel}</span>
                </div>
                <div class="monthly-metric-detail"><span class="monthly-metric-detail-item"><i data-lucide="target" aria-hidden="true"></i><span>เป้ารวมเดือน <strong>${target} บาท</strong></span></span><span class="monthly-metric-detail-item monthly-metric-gap"><i data-lucide="chart-no-axes-column" aria-hidden="true"></i><span class="monthly-metric-gap-copy"><span class="monthly-metric-gap-value">${status.kind === 'pending' ? 'ยังไม่สรุปผลเทียบเป้า' : status.detail}</span><span class="monthly-metric-comparison-inline"><strong>เปรียบเทียบเดือนก่อน</strong> ${footer}</span></span></span></div>
            </div>
        </article>
        <article class="monthly-card monthly-target-status monthly-result-${status.kind}">
            <div class="monthly-sales-status" role="status" aria-label="สถานะเป้าหมายเดือน ${safe(monthLabel)}" data-status="${status.kind}">
                <div class="monthly-status-heading"><div class="monthly-status-visual">${statusArtwork(status.kind)}</div><div class="monthly-status-copy"><strong class="monthly-status-title">${status.title}</strong><p class="monthly-status-encouragement">${encouragement}</p></div></div>
                <div class="monthly-status-quote">${quote}</div>
            </div>
        </article>`;
    }

    const DEPARTMENTS = [
        { key: 'marketing', title: 'Marketing', description: 'โฆษณาและงบประมาณ', icon: 'megaphone', tone: 'orange' },
        { key: 'admin', title: 'Sales Admin', description: 'ติดต่อและส่งต่องาน', icon: 'users', tone: 'blue' },
        { key: 'building', title: 'ฝ่ายขายอาคาร', description: 'ยอดขายและ Projects', icon: 'building-2', tone: 'green' },
        { key: 'car', title: 'ฝ่ายขายรถยนต์', description: 'ยอดขายและงานติดตั้ง', icon: 'car-front', tone: 'purple' },
        { key: 'tech', title: 'ทีมช่างอาคาร', description: 'ผลงานและคุณภาพ', icon: 'wrench', tone: 'rose' }
    ];
    const CHANNELS = { line: 'LINE', fb: 'Facebook', tel: 'โทรศัพท์', walkin: 'Walk-in', showroom: 'Showroom', other: 'อื่น ๆ' };
    const sum = values => Object.values(values).reduce((total, value) => total + value, 0);
    const differs = (left, right) => Math.abs(left - right) >= 0.5;
    const ratioValue = (value, total) => total > 0 ? value / total * 100 : null;
    const progressBar = (value, disabled) => `<div class="monthly-progress" aria-hidden="true"><span style="width:${disabled || value === null ? 0 : Math.max(0, Math.min(value, 100))}%"></span></div>`;

    function jumpTo(key) {
        if (currentPage !== 'monthly' || !DEPARTMENTS.some(item => item.key === key)) return;
        document.getElementById(`monthly-${key}`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
        document.getElementById(`monthly-heading-${key}`)?.focus({ preventScroll: true });
    }

    function updateBackToTop() {
        if (currentPage !== 'monthly') return;
        const button = document.getElementById('monthly-back-top');
        if (button) button.hidden = document.getElementById('dashboard-content').scrollTop <= 320;
    }

    function bindBackToTop(container) {
        // The dashboard scroll container is reused across routes. Bind only once;
        // the listener is inert outside Monthly and retains no rendered month data.
        if (!scrollContainers.has(container)) {
            container.addEventListener('scroll', updateBackToTop, { passive: true });
            scrollContainers.add(container);
        }
        updateBackToTop();
    }

    function backToTop() {
        if (currentPage !== 'monthly') return;
        document.getElementById('monthly-month-select')?.focus({ preventScroll: true });
        document.getElementById('dashboard-content')?.scrollTo({
            top: 0,
            behavior: root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
    }

    function departmentHead(key, title, description, month) {
        const index = DEPARTMENTS.findIndex(item => item.key === key);
        const department = DEPARTMENTS[index];
        return `<div class="monthly-department-head"><div class="monthly-department-title"><span class="monthly-icon"><i data-lucide="${department.icon}" aria-hidden="true"></i></span>
            <div><p class="monthly-department-kicker">0${index + 1} / DEPARTMENT REVIEW</p><h3 id="monthly-heading-${key}" tabindex="-1">${title}<span class="monthly-heading-period">เดือน ${safe(month.label)}</span></h3><p>${description}</p></div></div></div>`;
    }

    function stats(items) {
        return `<dl class="monthly-stat-grid">${items.map(([label, value, unit = '', detail = '']) => `<div><dt>${label}</dt><dd>${value}${unit ? ` <small>${unit}</small>` : ''}</dd>${detail ? `<p>${detail}</p>` : ''}</div>`).join('')}</dl>`;
    }

    function departmentTrendCard(key, title, month) {
        const targetOutcome = ['building', 'car'].includes(key) ? ' ถ้วยรางวัลแสดงเดือนที่ยอดขายถึงเป้าหมาย' : '';
        return `<article class="monthly-department-trend" aria-labelledby="monthly-${key}-trend-title">
            <div class="monthly-department-trend-head"><span><i data-lucide="chart-no-axes-combined" aria-hidden="true"></i></span><div><h4 id="monthly-${key}-trend-title">${title}</h4><p>มกราคม – ธันวาคม ${month.year}</p></div></div>
            <div class="monthly-department-trend-wrap" tabindex="0" role="region" aria-label="${title} ตลอดปี ${month.year} เลื่อนแนวนอนเพื่อดูครบ"><div class="monthly-department-trend-plot"><canvas id="monthly-${key}-trend-chart" role="img" aria-label="${title} เดือนมกราคมถึงธันวาคม ${month.year}${targetOutcome}"></canvas></div></div>
            <p id="monthly-${key}-trend-status" class="monthly-department-trend-status" role="status"></p>
        </article>`;
    }

    function channelTable(title, contacts, leads, rate, planDerived) {
        const channelIcon = channel => channel === 'line'
            ? '<span class="monthly-admin-channel-icon monthly-admin-channel-line" aria-hidden="true">LINE</span>'
            : channel === 'fb'
                ? '<span class="monthly-admin-channel-icon monthly-admin-channel-fb" aria-hidden="true">f</span>'
                : '<span class="monthly-admin-channel-icon monthly-admin-channel-phone" aria-hidden="true"><i data-lucide="phone"></i></span>';
        return `<div class="monthly-table-wrap monthly-admin-table-wrap" tabindex="0" role="region" aria-label="${title}"><table class="monthly-table monthly-table-compact monthly-admin-table"><thead><tr><th scope="col">ช่องทาง</th><th scope="col">ติดต่อ (ครั้ง)</th><th scope="col">Leads (งาน)</th><th scope="col">ส่งต่อ / ติดต่อ</th></tr></thead>
            ${['gfs', 'mhl'].map(key => `<tbody class="monthly-admin-group monthly-admin-${key}"><tr class="monthly-admin-business-row"><th scope="rowgroup" colspan="4"><span class="monthly-admin-business-mark" aria-hidden="true"></span><strong>${key.toUpperCase()}</strong><span>ฟิล์มอาคาร</span></th></tr>
                ${['line', 'fb', 'tel'].map(channel => {
                    const conversion = ratioValue(leads[key][channel], contacts[key][channel]);
                    const visualRate = !planDerived && Number.isFinite(conversion) ? Math.max(0, Math.min(conversion, 100)) : 0;
                    return `<tr class="monthly-admin-channel-row"><th scope="row"><span class="monthly-admin-channel"><span class="monthly-admin-channel-tile">${channelIcon(channel)}</span><span class="monthly-admin-channel-copy"><strong>${key.toUpperCase()} ${CHANNELS[channel]}</strong><small>${CHANNELS[channel]}</small></span></span></th><td>${money(contacts[key][channel])}</td><td>${money(leads[key][channel])}</td><td><div class="monthly-admin-rate"><strong>${rate(conversion)}</strong><span class="monthly-admin-rate-track" aria-hidden="true"><span style="width:${visualRate}%"></span></span></div></td></tr>`;
                }).join('')}
            </tbody>`).join('')}
        </table></div>`;
    }

    function renderMarketing(month, rate, planDerived) {
        const marketing = month.marketing;
        const companies = Object.values(marketing.companies);
        const companyContacts = {
            gfs: sum(month.admin.details.contacts.gfs),
            mhl: sum(month.admin.details.contacts.mhl),
            car: month.car.contacts
        };
        const companyCustomers = {
            gfs: sum(month.admin.details.leads.gfs),
            mhl: sum(month.admin.details.leads.mhl),
            car: month.admin.details.carLeads
        };
        const cards = [['total', {
            actual: marketing.actual, target: marketing.target, roas: marketing.roas,
            google: companies.reduce((total, company) => total + company.google, 0),
            fb: companies.reduce((total, company) => total + company.fb, 0),
            budgetProgress: ratioValue(marketing.actual, marketing.target),
            contacts: month.admin.contacts + month.car.contacts,
            customers: month.admin.leads + month.admin.details.carLeads
        }], ...Object.entries(marketing.companies).map(([key, company]) => [key, { ...company, contacts: companyContacts[key], customers: companyCustomers[key] }])];
        const averageBaht = (spend, count) => !planDerived && count > 0 ? money(spend / count) : '—';
        return `<section id="monthly-marketing" class="monthly-department monthly-tone-orange" aria-labelledby="monthly-heading-marketing">
            ${departmentHead('marketing', 'Marketing Online', 'ค่าโฆษณา งบประมาณ และผลตอบแทนแยกธุรกิจ', month)}
            <div class="monthly-company-cards">${cards.map(([key, company]) => `<article class="monthly-business-card monthly-business-${key}">
                <div class="monthly-business-head"><span class="monthly-business-code">${key === 'total' ? 'รวมทั้งหมด' : key.toUpperCase()}</span><span>${key === 'total' ? 'GFS + MHL + CAR' : key === 'car' ? 'ฟิล์มรถยนต์' : 'ฟิล์มอาคาร'}</span></div>
                <p class="monthly-mini-label">ค่าโฆษณาเดือนนี้</p><div class="monthly-business-value">${money(company.actual)} <small>บาท</small></div>
                ${progressBar(company.budgetProgress, planDerived)}<div class="monthly-company-meta"><span>งบ ${money(company.target)} บาท</span><strong>ใช้ ${rate(company.budgetProgress)}</strong></div>
                <dl class="monthly-mini-list"><div><dt>Google</dt><dd>${money(company.google)} <small>บาท</small></dd></div><div><dt>Facebook</dt><dd>${money(company.fb)} <small>บาท</small></dd></div><div><dt>ROAS</dt><dd>${planDerived || company.roas === null ? '—' : `${numeric(company.roas)} <small>เท่า</small>`}</dd></div></dl>
                <div class="monthly-cost-average"><span>ค่าเฉลี่ย</span><dl><div><dt>ต่อการติดต่อ</dt><dd>${averageBaht(company.actual, company.contacts)} <small>บาท / ติดต่อ</small></dd></div><div><dt>ต่อลูกค้า</dt><dd>${averageBaht(company.actual, company.customers)} <small>บาท / ลูกค้า</small></dd></div></dl></div>
                ${differs(company.google + company.fb, company.actual) ? '<p class="monthly-data-note">ยอดแยกช่องทางต่างจากยอดค่าโฆษณา ยังคงยอดรวมตาม Weekly</p>' : ''}
            </article>`).join('')}</div>
            ${departmentTrendCard('marketing', 'แนวโน้มค่าโฆษณารายเดือน', month)}
        </section>`;
    }

    function renderAdmin(month, rate) {
        const admin = month.admin;
        const detail = admin.details;
        const planDerived = month.coverage.hasPlanDerived;
        const detailContacts = sum(detail.contacts.gfs) + sum(detail.contacts.mhl);
        const detailLeads = sum(detail.leads.gfs) + sum(detail.leads.mhl);
        const detailSales = sum(detail.newSales) + sum(detail.oldSales);
        const detailInstalls = sum(detail.newInstalls) + sum(detail.oldInstalls);
        return `<section id="monthly-admin" class="monthly-department monthly-tone-blue" aria-labelledby="monthly-heading-admin">
            ${departmentHead('admin', 'Sales Admin', 'การติดต่อ ส่งต่องาน และยอดขายลูกค้าอาคาร', month)}
            ${stats([
                ['ติดต่อทั้งหมด', money(admin.contacts), 'ครั้ง', `อัตราส่งต่อ ${rate(admin.conversion)}`],
                ['ส่งต่อ / Leads', money(admin.leads), 'งาน', `เป้า ${money(detail.leadsTarget)} งาน`],
                ['ติดตั้งจาก Admin', money(admin.installs), 'งาน', `ติดตั้ง / Leads ${rate(admin.closeRate)}`],
                ['ยอดขาย Admin', money(admin.sales), 'บาท', 'ตามยอดรวมใน Weekly']
            ])}
            ${departmentTrendCard('admin', 'แนวโน้มการติดต่อ ส่งต่อ ติดตั้ง และยอดขาย', month)}
            <div class="monthly-detail-grid monthly-admin-grid"><article class="monthly-detail-panel monthly-admin-panel monthly-admin-contact-panel"><div class="monthly-admin-panel-head"><span class="monthly-admin-panel-icon monthly-admin-panel-icon-blue"><i data-lucide="phone-call" aria-hidden="true"></i></span><div><h4>ช่องทางติดต่อและส่งต่อ</h4><p>GFS + MHL · ไม่รวมงานติดตั้ง CAR เป็น Leads ซ้ำ</p></div></div>
                ${channelTable('ช่องทางติดต่อและ Leads ของ Sales Admin', detail.contacts, detail.leads, rate, planDerived)}
                ${differs(detailContacts, admin.contacts) || differs(detailLeads, admin.leads) ? '<p class="monthly-data-note">ผลรวมแยกช่องทางต่างจากยอดรวม Admin ด้านบน แสดงตามต้นทางทั้งสองชุดโดยไม่ปรับยอด</p>' : ''}
            </article><article class="monthly-detail-panel monthly-admin-panel monthly-admin-customer-panel"><div class="monthly-admin-panel-head"><span class="monthly-admin-panel-icon monthly-admin-panel-icon-pink"><i data-lucide="users" aria-hidden="true"></i></span><div><h4>ลูกค้าใหม่และลูกค้าเก่า</h4><p>ยอดขายและงานติดตั้งตามรายละเอียดลูกค้า</p></div></div>
                <div class="monthly-table-wrap monthly-admin-table-wrap" tabindex="0" role="region" aria-label="ยอดขาย Admin ลูกค้าใหม่และเก่า"><table class="monthly-table monthly-table-compact monthly-admin-table monthly-admin-customer-table"><thead><tr><th scope="col">กลุ่มลูกค้า</th><th scope="col">ยอดขาย (บาท)</th><th scope="col">ติดตั้ง (งาน)</th></tr></thead>
                    ${['gfs', 'mhl'].map(key => `<tbody class="monthly-admin-group monthly-admin-${key}"><tr class="monthly-admin-business-row"><th scope="rowgroup" colspan="3"><span class="monthly-admin-business-mark" aria-hidden="true"></span><strong>${key.toUpperCase()}</strong><span>ฟิล์มอาคาร</span></th></tr>
                        ${[['new', 'ลูกค้าใหม่', 'star'], ['old', 'ลูกค้าเก่า', 'users-round']].map(([kind, label, icon]) => `<tr class="monthly-admin-customer-row"><th scope="row"><span class="monthly-admin-customer"><span class="monthly-admin-customer-icon monthly-admin-customer-${kind}"><i data-lucide="${icon}" aria-hidden="true"></i></span><span><strong>${key.toUpperCase()} ${label}</strong><small>${label}</small></span></span></th><td>${money(detail[`${kind}Sales`][key])}</td><td>${money(detail[`${kind}Installs`][key])}</td></tr>`).join('')}
                    </tbody>`).join('')}
                </table></div>
                ${differs(detailSales, admin.sales) || differs(detailInstalls, admin.installs) ? '<p class="monthly-data-note">ยอดลูกค้าใหม่ + เก่าต่างจากยอดรวม Admin จึงแสดงแยก ไม่ใช้แทนยอดรวม</p>' : ''}
            </article></div>
        </section>`;
    }

    function renderBuilding(month, rate, planDerived) {
        const building = month.building;
        const people = [...building.reps.map(person => ({ ...person, group: 'Sales Rep' })), ...building.projects.map(person => ({ ...person, group: 'Projects' }))].sort((a, b) => b.sales - a.sales);
        const salesVisual = !planDerived && Number.isFinite(building.progress) ? Math.max(0, Math.min(building.progress, 100)) : 0;
        const closeVisual = !planDerived && Number.isFinite(building.closeRate) ? Math.max(0, Math.min(building.closeRate, 100)) : 0;
        return `<section id="monthly-building" class="monthly-department monthly-tone-green monthly-building-section" aria-labelledby="monthly-heading-building">
            ${departmentHead('building', 'ฝ่ายขายฟิล์มอาคาร & Projects', 'ภาพรวม GFS + MHL และผลงานรายบุคคลประจำเดือน', month)}
            <div class="monthly-building-layout">
                <article class="monthly-building-overview"><div class="monthly-building-overview-head"><span class="monthly-building-overview-icon"><i data-lucide="chart-no-axes-combined" aria-hidden="true"></i></span><div><h4>ภาพรวม Performance</h4><p>ยอดขายและประสิทธิภาพการติดตั้งประจำเดือน</p></div></div>
                    <div class="monthly-building-sales-summary"><span class="monthly-building-kpi-label">ยอดขายอาคาร GFS + MHL</span><strong>${money(building.actual)} <small>บาท</small></strong><p>เป้า ${money(building.target)} บาท · ${rate(building.progress)}</p><div class="monthly-building-progress" aria-hidden="true"><span style="width:${salesVisual}%"></span></div></div>
                    <div class="monthly-building-donut monthly-building-sales-donut" style="--monthly-building-progress:${salesVisual}%" role="img" aria-label="ยอดขายเทียบเป้า ${rate(building.progress)}"><span>${rate(building.progress)}</span><small>ของเป้าหมาย</small></div>
                    <div class="monthly-building-overview-message" aria-hidden="true"><strong>พื้นที่ที่ดีกว่า</strong><span>สร้างได้ด้วยกัน</span><i></i><small>BETTER SPACES<br>A BRIGHTER TOMORROW</small></div>
                    <span class="monthly-building-overview-art" aria-hidden="true"><i></i><i></i><i></i></span>
                </article>
                <div class="monthly-building-content"><div class="monthly-building-team-cards">
                    <article class="monthly-building-team-card monthly-building-rep-card"><span class="monthly-building-team-icon monthly-building-rep-icon"><i data-lucide="users-round" aria-hidden="true"></i></span><div class="monthly-building-team-copy"><span>ยอดขาย Sales Representative</span><strong>${money(building.repSales)} <small>บาท</small></strong><p>${building.reps.length} คน · รวมยอดรายสัปดาห์</p></div></article>
                    <article class="monthly-building-team-card monthly-building-project-card"><span class="monthly-building-team-icon monthly-building-project-icon"><i data-lucide="briefcase-business" aria-hidden="true"></i></span><div class="monthly-building-team-copy"><span>ยอดขาย Project Sales Executive</span><strong>${money(building.projectSales)} <small>บาท</small></strong><p>${building.projects.length} คน · รวมยอดรายสัปดาห์</p></div></article>
                    <article class="monthly-building-team-card monthly-building-conversion-card"><span class="monthly-building-team-icon monthly-building-conversion-icon"><i data-lucide="target" aria-hidden="true"></i></span><div class="monthly-building-team-copy"><span>ติดตั้ง / เข้าพบ</span><strong>${money(building.installs)} / ${money(building.meets)} <small>งาน</small></strong><p>อัตราติดตั้งต่อเข้าพบ ${rate(building.closeRate)}</p></div><div class="monthly-building-donut monthly-building-close-donut" style="--monthly-building-progress:${closeVisual}%" role="img" aria-label="อัตราติดตั้งต่อเข้าพบ ${rate(building.closeRate)}"><span>${rate(building.closeRate)}</span><small>Conversion</small></div></article>
                </div>
            <div class="monthly-building-detail-head"><div><span class="monthly-building-detail-icon"><i data-lucide="contact-round" aria-hidden="true"></i></span><h4>ผลงานรายบุคคล</h4></div><span>เรียงตามยอดขายเดือนที่เลือก · ไม่รวม YTD</span></div>
            <div class="monthly-table-wrap monthly-building-table-wrap" tabindex="0" role="region" aria-label="ผลงานรายเดือน Sales Rep และ Projects"><table class="monthly-table monthly-building-table"><thead><tr><th scope="col">ผู้รับผิดชอบ / ทีม</th><th scope="col">ยอดขาย (บาท)</th><th scope="col">เข้าพบ (งาน)</th><th scope="col">ติดตั้ง (งาน)</th><th scope="col">ติดตั้ง / เข้าพบ</th></tr></thead><tbody>
                ${people.map(person => {
                    const role = person.group === 'Sales Rep' ? 'rep' : 'project';
                    const visualRate = !planDerived && Number.isFinite(person.closeRate) ? Math.max(0, Math.min(person.closeRate, 100)) : 0;
                    const rateTone = visualRate >= 50 ? 'good' : visualRate >= 25 ? 'watch' : visualRate >= 10 ? 'low' : visualRate > 0 ? 'critical' : 'zero';
                    const initial = safe(String(person.name || '').trim().charAt(0).toUpperCase() || '—');
                    return `<tr class="monthly-building-person-row monthly-building-person-${role}"><th scope="row"><span class="monthly-building-person"><span class="monthly-building-person-icon monthly-building-person-icon-${role}" aria-hidden="true">${initial}</span><span class="monthly-building-person-copy"><strong>${safe(person.name)}</strong><span class="monthly-building-role-pill monthly-building-role-${role}">${person.group}</span></span></span></th><td class="monthly-emphasis">${money(person.sales)}</td><td>${money(person.meets)}</td><td>${money(person.installs)}</td><td><div class="monthly-building-person-rate monthly-building-rate-${rateTone}"><strong>${rate(person.closeRate)}</strong><span class="monthly-building-person-rate-track" aria-hidden="true"><span style="width:${visualRate}%"></span></span></div></td></tr>`;
                }).join('')}
            </tbody><tfoot><tr><th scope="row"><span class="monthly-building-total-label"><i data-lucide="users-round" aria-hidden="true"></i>รวมรายบุคคล ${people.length} คน</span></th><td>${money(building.repSales + building.projectSales)}</td><td>${money(building.meets)}</td><td>${money(building.installs)}</td><td><div class="monthly-building-person-rate monthly-building-rate-${closeVisual >= 50 ? 'good' : closeVisual >= 25 ? 'watch' : closeVisual >= 10 ? 'low' : closeVisual > 0 ? 'critical' : 'zero'}"><strong>${rate(building.closeRate)}</strong><span class="monthly-building-person-rate-track" aria-hidden="true"><span style="width:${closeVisual}%"></span></span></div></td></tr></tfoot></table></div>
            <p class="monthly-caption">ยอดรายบุคคลเป็นมุมมองของฝ่าย ไม่ใช่ยอดขายเพิ่มจาก GFS + MHL และไม่บวกซ้ำกับยอดบริษัท · ขอบเขตต่างจากยอดขายธุรกิจซึ่งรวมช่องทางอื่น เช่น Admin</p>
                </div>
            </div>
            ${departmentTrendCard('building', 'แนวโน้มยอดขายฝ่ายขายอาคาร', month)}
        </section>`;
    }

    function renderCar(month, rate) {
        const car = month.car;
        const overview = month.sales.companies.car;
        const planDerived = month.coverage.hasPlanDerived;
        const contactChannels = [
            ['line', 'LINE', 'message-circle'],
            ['fb', 'Facebook', 'facebook'],
            ['tel', 'โทรศัพท์', 'phone-call']
        ];
        const customerSources = [
            ['line', 'LINE', 'message-circle'],
            ['fb', 'Facebook', 'facebook'],
            ['tel', 'โทรศัพท์', 'phone-call'],
            ['walkin', 'Walk-in', 'user-round'],
            ['showroom', 'Showroom', 'store'],
            ['other', 'อื่น ๆ', 'ellipsis']
        ];
        const channelRate = (value, total) => ratioValue(value, total);
        const channelWidth = (value, total) => planDerived || total <= 0 ? 0 : Math.max(0, Math.min(value / total * 100, 100));
        const carMismatch = differs(car.actual, overview.actual) || differs(car.target, overview.target);
        const contactMismatch = differs(sum(car.contactChannels), car.contacts);
        const customerMismatch = differs(sum(car.installChannels), car.installs);
        const hasValue = value => Number.isFinite(Number(value)) && Number(value) !== 0;
        const visibleContactChannels = contactChannels.filter(([key]) => hasValue(car.contactChannels[key]));
        const visibleCustomerSources = customerSources.filter(([key]) => hasValue(car.installChannels[key]));
        const damageCauses = [
            ['monthly-car-damage-film', 'panels-top-left', 'ความเสียหายจากฟิล์ม', car.filmIssueValue, car.filmIssueCount],
            ['monthly-car-damage-tech', 'wrench', 'ความเสียหายจากช่าง', car.techIssueValue, car.techIssueCount]
        ].filter(([, , , value, count]) => hasValue(value) || hasValue(count));
        const hasDamageSummary = hasValue(car.damage) || hasValue(car.claims) || hasValue(car.damageRate);
        return `<section id="monthly-car" class="monthly-department monthly-tone-purple monthly-car-section" aria-labelledby="monthly-heading-car">
            ${departmentHead('car', 'ฝ่ายขายฟิล์มรถยนต์', 'ยอดขาย ลูกค้าใหม่ ช่องทางติดต่อ แหล่งที่มา และคุณภาพงาน CAR', month)}
            <div class="monthly-car-kpi-grid">
                <article class="monthly-car-kpi monthly-car-kpi-sales"><span class="monthly-car-kpi-icon"><i data-lucide="badge-dollar-sign" aria-hidden="true"></i></span><div><p>ยอดขาย</p><strong>${money(car.actual)} <small>บาท</small></strong><span>เป้า ${money(car.target)} บาท · ${rate(car.progress)}</span></div></article>
                <article class="monthly-car-kpi monthly-car-kpi-customers"><span class="monthly-car-kpi-icon"><i data-lucide="car-front" aria-hidden="true"></i></span><div><p>จำนวนลูกค้าใหม่</p><strong>${money(car.installs)} <small>ราย</small></strong><span>รถติดตั้งใหม่รวมทุกช่องทาง</span></div></article>
                <article class="monthly-car-kpi monthly-car-kpi-contacts"><span class="monthly-car-kpi-icon"><i data-lucide="messages-square" aria-hidden="true"></i></span><div><p>การติดต่อลูกค้า</p><strong>${money(car.contacts)} <small>ครั้ง</small></strong><span>ลูกค้าใหม่ / ติดต่อ ${rate(ratioValue(car.installs, car.contacts))}</span></div></article>
            </div>
            ${departmentTrendCard('car', 'แนวโน้มยอดขายฝ่ายขายรถยนต์', month)}
            ${carMismatch ? `<p class="monthly-data-note monthly-car-overview-note">ยอดหรือเป้าฝ่าย CAR ต่างจากช่อง CAR ในภาพรวม (${money(overview.actual)} / เป้า ${money(overview.target)} บาท) ส่วนนี้ยึดข้อมูลหน้าฝ่ายรถยนต์ ไม่ปรับให้เท่ากัน</p>` : ''}
            <div class="monthly-car-channel-grid">
                <article class="monthly-car-panel monthly-car-contact-panel"><div class="monthly-car-panel-head"><span><i data-lucide="headset" aria-hidden="true"></i></span><div><h4>การติดต่อลูกค้าแต่ละช่องทาง</h4><p>จำนวนครั้งที่ติดต่อเข้ามาในเดือนนี้</p></div></div>
                    <div class="monthly-car-channel-list">${visibleContactChannels.map(([key, label, icon]) => {
                        const value = car.contactChannels[key];
                        return `<div class="monthly-car-channel-row monthly-car-channel-row-${key}"><span class="monthly-car-channel-icon monthly-car-channel-${key}"><i data-lucide="${icon}" aria-hidden="true"></i></span><div class="monthly-car-channel-copy"><div><strong>${label}</strong><b>${money(value)} <small>ครั้ง</small></b></div><span class="monthly-car-channel-track" aria-hidden="true"><i style="width:${channelWidth(value, car.contacts)}%"></i></span></div><em>${rate(channelRate(value, car.contacts))}</em></div>`;
                    }).join('') || '<p class="monthly-car-empty">ไม่มีช่องทางติดต่อที่มีข้อมูลในเดือนนี้</p>'}</div>
                    ${contactMismatch ? '<p class="monthly-car-data-note"><i data-lucide="info" aria-hidden="true"></i>ผลรวมช่องทางติดต่อต่างจากยอดรวม จึงยึดยอดรวมที่ระบุในต้นทาง</p>' : ''}
                </article>
                <article class="monthly-car-panel monthly-car-source-panel"><div class="monthly-car-panel-head"><span><i data-lucide="map-pinned" aria-hidden="true"></i></span><div><h4>แหล่งที่มาของลูกค้าใหม่</h4><p>อ้างอิงจากช่องทางของรถติดตั้งใหม่</p></div></div>
                    <div class="monthly-car-source-grid">${visibleCustomerSources.map(([key, label, icon]) => {
                        const value = car.installChannels[key];
                        return `<div class="monthly-car-source-card monthly-car-source-${key}"><span class="monthly-car-source-icon monthly-car-channel-${key}"><i data-lucide="${icon}" aria-hidden="true"></i></span><div><span>${label}</span><strong>${money(value)} <small>ราย</small></strong><p>${rate(channelRate(value, car.installs))}</p></div><span class="monthly-car-source-track" aria-hidden="true"><i style="width:${channelWidth(value, car.installs)}%"></i></span></div>`;
                    }).join('') || '<p class="monthly-car-empty">ไม่มีแหล่งที่มาที่มีข้อมูลในเดือนนี้</p>'}</div>
                    ${customerMismatch ? '<p class="monthly-car-data-note"><i data-lucide="info" aria-hidden="true"></i>ผลรวมแหล่งที่มาต่างจากจำนวนลูกค้าใหม่ จึงยึดยอดรวมที่ระบุในต้นทาง</p>' : ''}
                </article>
            </div>
            ${damageCauses.length || hasDamageSummary ? `<article class="monthly-car-damage-panel"><div class="monthly-car-panel-head"><span><i data-lucide="shield-alert" aria-hidden="true"></i></span><div><h4>ความเสียหายจากฟิล์มและช่าง</h4><p>แยกมูลค่าและจำนวนรายการตามสาเหตุ</p></div></div>
                <div class="monthly-car-damage-grid">
                    ${damageCauses.map(([cardClass, icon, label, value, count]) => `<div class="monthly-car-damage-card ${cardClass}"><span class="monthly-car-damage-icon"><i data-lucide="${icon}" aria-hidden="true"></i></span><div><p>${label}</p><strong>${money(value)} <small>บาท</small></strong>${hasValue(count) ? `<span>${money(count)} รายการ</span>` : ''}</div></div>`).join('')}
                    ${hasDamageSummary ? `<div class="monthly-car-damage-total"><span>มูลค่าความเสียหายรวม</span><strong>${money(car.damage)} <small>บาท</small></strong><p>${rate(car.damageRate)} ของยอดขาย${hasValue(car.claims) ? ` · เคลม ${money(car.claims)} รายการ` : ''}</p></div>` : ''}
                </div>
            </article>` : ''}
        </section>`;
    }

    function renderTech(month, rate) {
        const tech = month.tech;
        const installs = tech.details.installs;
        const areas = tech.details.area;
        const installMax = Math.max(0, ...Object.values(installs));
        const areaMax = Math.max(0, ...Object.values(areas));
        const scale = (value, maximum) => maximum > 0 ? Math.max(0, Math.min(value / maximum * 100, 100)) : 0;
        return `<section id="monthly-tech" class="monthly-department monthly-tone-rose monthly-tech-section" aria-labelledby="monthly-heading-tech">
            ${departmentHead('tech', 'ทีมช่างอาคาร', 'ผลงานติดตั้ง พื้นที่ และมูลค่าความเสียหาย', month)}
            <div class="monthly-tech-board">
                <article class="monthly-tech-summary monthly-tech-install-summary">
                    <div class="monthly-tech-summary-head"><span class="monthly-tech-summary-icon"><i data-lucide="chart-no-axes-column-increasing" aria-hidden="true"></i></span><div><h4>ข้อมูลงานติดตั้ง</h4><p>ผลงานและพื้นที่ติดตั้งอาคาร</p></div><span class="monthly-tech-summary-art" aria-hidden="true"><i></i><i></i><i></i></span></div>
                    <div class="monthly-tech-summary-cards">
                        ${[
                            ['clipboard-check', 'งานติดตั้งอาคาร', money(tech.installs), 'งาน', 'monthly-tech-kpi-install'],
                            ['scan', 'พื้นที่ติดตั้ง', money(tech.area), 'ตร.ฟุต', 'monthly-tech-kpi-area']
                        ].map(([icon, label, value, unit, cardClass]) => `<article class="monthly-tech-kpi-card ${cardClass}"><span class="monthly-tech-kpi-icon"><i data-lucide="${icon}" aria-hidden="true"></i></span><div><h4>${label}</h4><strong>${value}${unit ? ` <small>${unit}</small>` : ''}</strong></div><span class="monthly-tech-kpi-decoration" aria-hidden="true"><i></i><i></i><i></i></span></article>`).join('')}
                    </div>
                </article>
                <article class="monthly-tech-summary monthly-tech-damage-summary">
                    <div class="monthly-tech-summary-head monthly-tech-summary-head-alert"><span class="monthly-tech-summary-icon"><i data-lucide="triangle-alert" aria-hidden="true"></i></span><div><h4>ข้อมูลความเสียหาย</h4><p>มูลค่าความเสียหายและสัดส่วนต่อยอดขาย</p></div><span class="monthly-tech-alert-art" aria-hidden="true"><i data-lucide="triangle-alert"></i></span></div>
                    <div class="monthly-tech-summary-cards">
                        ${[
                            ['coins', 'มูลค่าความเสียหาย', money(tech.damage), 'บาท', 'monthly-tech-kpi-damage'],
                            ['chart-pie', 'ความเสียหาย / ยอดขายอาคาร', rate(tech.damageRate), '', 'monthly-tech-kpi-rate']
                        ].map(([icon, label, value, unit, cardClass]) => `<article class="monthly-tech-kpi-card ${cardClass}"><span class="monthly-tech-kpi-icon"><i data-lucide="${icon}" aria-hidden="true"></i></span><div><h4>${label}</h4><strong>${value}${unit ? ` <small>${unit}</small>` : ''}</strong></div><span class="monthly-tech-kpi-decoration" aria-hidden="true"><i></i><i></i><i></i></span></article>`).join('')}
                    </div>
                </article>
                <article class="monthly-tech-panel monthly-tech-install-panel"><div class="monthly-tech-panel-head"><span class="monthly-tech-panel-icon"><i data-lucide="chart-no-axes-column-increasing" aria-hidden="true"></i></span><div><h4>ผลงานติดตั้งแยกธุรกิจ</h4><p>เปรียบเทียบจำนวนงานติดตั้งและพื้นที่ติดตั้งของแต่ละธุรกิจ</p></div><span class="monthly-tech-panel-label" aria-hidden="true">INSTALLATION<br>BY BUSINESS</span></div>
                <div class="monthly-table-wrap monthly-tech-table-wrap" tabindex="0" role="region" aria-label="ผลงานติดตั้งอาคารแยกธุรกิจ"><table class="monthly-table monthly-tech-table"><thead><tr><th scope="col">ธุรกิจ</th><th scope="col">ติดตั้ง (งาน)</th><th scope="col">พื้นที่ (ตร.ฟุต)</th></tr></thead><tbody>
                    ${['gfs', 'mhl'].map(key => `<tr><th scope="row">${key.toUpperCase()}</th><td><div class="monthly-tech-table-metric"><strong>${money(installs[key])}</strong><span aria-hidden="true"><i style="width:${scale(installs[key], installMax)}%"></i></span></div></td><td><div class="monthly-tech-table-metric"><strong>${money(areas[key])}</strong><span aria-hidden="true"><i style="width:${scale(areas[key], areaMax)}%"></i></span></div></td></tr>`).join('')}
                </tbody></table></div>
                ${differs(sum(installs), tech.installs) || differs(sum(areas), tech.area) ? '<p class="monthly-data-note">ยอดแยก GFS / MHL ต่างจากยอดรวมทีมช่าง จึงคงแยกตามต้นทาง</p>' : ''}
                </article>
                <article class="monthly-tech-panel monthly-tech-quality-panel"><div class="monthly-tech-panel-head"><span class="monthly-tech-panel-icon monthly-tech-panel-icon-alert"><i data-lucide="shield-check" aria-hidden="true"></i></span><div><h4>คุณภาพงานติดตั้งอาคาร</h4><p>สรุปมูลค่าความเสียหายแยกตามสาเหตุ</p></div><span class="monthly-tech-panel-label monthly-tech-panel-label-alert" aria-hidden="true">DAMAGE<br>BREAKDOWN</span></div>
                <div class="monthly-tech-quality-cards"><div><span class="monthly-tech-quality-icon"><i data-lucide="wrench" aria-hidden="true"></i></span><p>ความเสียหายจากช่าง</p><strong>${money(tech.details.byTech)} <small>บาท</small></strong></div><div><span class="monthly-tech-quality-icon"><i data-lucide="panels-top-left" aria-hidden="true"></i></span><p>ความเสียหายจากฟิล์ม</p><strong>${money(tech.details.byFilm)} <small>บาท</small></strong></div></div>
                ${differs(tech.details.byTech + tech.details.byFilm, tech.damage) ? '<p class="monthly-data-note">ผลรวมสาเหตุความเสียหายต่างจากยอดรวม แสดงตามข้อมูลต้นทางโดยไม่บวกทับ</p>' : ''}
                </article>
            </div>
            ${departmentTrendCard('tech', 'แนวโน้มงานติดตั้ง พื้นที่ และความเสียหาย', month)}
        </section>`;
    }

    function renderWeeksIncluded(month, coverage) {
        const totalAdSalesRate = coverage.hasPlanDerived ? null : ratioValue(month.marketing.actual, month.sales.actual);
        return `<article class="monthly-card monthly-weeks-card">
            <div class="monthly-weeks-head"><span class="monthly-weeks-head-icon"><i data-lucide="calendar-range" aria-hidden="true"></i></span><div><h3>สัปดาห์ที่นำมารวม</h3><p>เดือน ${safe(month.label)} · ตรวจสอบยอดรายเดือนย้อนกลับกับ Weekly · หน่วยบาท</p></div><div class="monthly-weeks-art" aria-hidden="true"><span><i></i><i></i><i></i></span><em>Weekly</em></div></div>
            <div class="monthly-table-wrap monthly-weeks-table-wrap" tabindex="0" role="region" aria-label="สัปดาห์ที่นำมารวมในเดือนที่เลือก"><table class="monthly-table monthly-weeks-table"><thead><tr><th scope="col"><span><i data-lucide="calendar-days" aria-hidden="true"></i>สัปดาห์ / ช่วงวันที่</span></th><th scope="col"><span><i data-lucide="target" aria-hidden="true"></i>เป้าหมาย</span></th><th scope="col"><span><i data-lucide="chart-no-axes-column-increasing" aria-hidden="true"></i>ยอดตาม Weekly</span></th><th scope="col"><span><i data-lucide="megaphone" aria-hidden="true"></i>ค่าโฆษณา</span></th><th scope="col"><span><i data-lucide="percent" aria-hidden="true"></i>ค่าโฆษณา / ยอดขาย</span></th></tr></thead><tbody>
                ${month.entries.map(entry => {
                    const weekNumber = String(entry.week || '').match(/\d+/)?.[0] || '—';
                    const adSalesRate = entry.planDerived ? null : ratioValue(entry.marketingActual, entry.salesActual);
                    const compactDateRange = String(entry.dateRange || '').replace(/\s*[\r\n]+\s*/g, ' · ');
                    return `<tr class="monthly-week-row"><th scope="row"><span class="monthly-week-number">${safe(weekNumber)}</span><span class="monthly-week-copy"><strong>${safe(entry.week)}</strong><small>${safe(compactDateRange)}${entry.crossMonth ? ' · คร่อมเดือน' : ''}${entry.planDerived ? ' · ข้อมูลจากแผน' : ''}</small></span></th><td class="monthly-week-target">${money(entry.salesTarget)}</td><td class="monthly-week-sales">${money(entry.salesActual)}</td><td class="monthly-week-ad">${money(entry.marketingActual)}</td><td class="monthly-week-ad-rate"><span>${percent(adSalesRate)}</span></td></tr>`;
                }).join('')}
            </tbody><tfoot><tr><th scope="row"><span class="monthly-weeks-total-icon"><i data-lucide="chart-pie" aria-hidden="true"></i></span><strong>รวม ${coverage.weekCount} สัปดาห์</strong></th><td class="monthly-week-target">${money(month.sales.target)}</td><td class="monthly-week-sales">${money(month.sales.actual)}</td><td class="monthly-week-ad">${money(month.marketing.actual)}</td><td class="monthly-week-ad-rate"><span>${percent(totalAdSalesRate)}</span></td></tr></tfoot></table></div>
        </article>`;
    }

    function render(container) {
        document.getElementById('header-title').innerText = 'สรุปรายเดือน (Monthly)';
        document.getElementById('header-subtitle').innerText = 'BB-2026 · ทุกฝ่ายในหน้าเดียว · ข้อมูล Weekly ชุดเดิม';
        document.getElementById('error-banner-container').innerHTML = '';
        if (isUsingMock) {
            empty(container, 'Monthly ยังอ่านข้อมูลจริงไม่ได้', 'Weekly กำลังใช้ข้อมูลจำลอง จึงไม่แสดงตัวเลขจำลองเป็นรายงาน Monthly กรุณารีเฟรชเมื่อเชื่อมต่อชีตได้');
            return;
        }
        const model = BBMonthlyData.build(dashboardData);
        if (!model.months.length) {
            empty(container, 'ยังไม่มีข้อมูลเดือนที่แสดงได้', 'ไม่พบช่วงวันที่รายสัปดาห์ที่อ่านได้ใน BB-2026 การทำงาน Weekly ยังคงเดิม');
            return;
        }
        if (!model.months.some(month => month.key === selectedMonthKey)) selectedMonthKey = model.defaultMonthKey;
        const month = model.months.find(item => item.key === selectedMonthKey);
        const previous = model.months[model.months.indexOf(month) - 1];
        const coverage = month.coverage;
        const planDerived = coverage.hasPlanDerived;
        const status = coverage.isFuture ? 'เดือนในอนาคต' : coverage.isOpen ? 'เดือนปัจจุบัน · ยอดสะสม' : 'เดือนที่ผ่านมา';
        const first = month.entries.reduce((value, entry) => entry.start < value ? entry.start : value, month.entries[0].start);
        const last = month.entries[month.entries.length - 1].end;
        const options = [...model.months].reverse().map(item => `<option value="${item.key}"${item.key === month.key ? ' selected' : ''}>${safe(item.label)}</option>`).join('');
        const crossed = month.entries.filter(entry => entry.crossMonth);
        const companyTotal = Object.values(month.sales.companies).reduce((sum, company) => sum + company.actual, 0);
        const companyTarget = Object.values(month.sales.companies).reduce((sum, company) => sum + company.target, 0);
        const salesDifference = Math.round(companyTotal - month.sales.actual);
        const targetDifference = Math.round(companyTarget - month.sales.target);
        const mismatched = salesDifference !== 0 || targetDifference !== 0;
        const warnings = [
            planDerived ? 'มีข้อมูลจากแผน: ตัวอ่าน Weekly ใช้เป้าหมายเป็นค่าผลงานในบางสัปดาห์ ตัวเลขเดือนนี้จึงเป็นยอดอ้างอิง ไม่ใช่ผลจริงที่ยืนยันแล้ว และไม่แสดงอัตราผลงาน' : '',
            coverage.isOpen ? `ยังไม่ครบเดือน · รวมเป้าของทุกสัปดาห์ในเดือน แต่ยอดผลงานเป็นค่าที่มีในชีต (${coverage.nonZeroWeekCount}/${coverage.weekCount} สัปดาห์มีค่าผลงานที่ไม่เป็นศูนย์)` : '',
            coverage.isFuture ? 'เดือนนี้ยังไม่เริ่ม · ตัวเลขเป้าหมายเป็นแผน ส่วนผลงานแสดงตามค่าที่มีในชีตเท่านั้น' : '',
            coverage.hasFutureActual ? 'พบค่าผลงานในสัปดาห์ที่ยังไม่เริ่ม โปรดตรวจข้อมูลต้นทางก่อนนำเสนอ' : '',
            coverage.unconfirmedWeeks.length ? `${coverage.unconfirmedWeeks.join(', ')} มีเป้าหมาย แต่ยอดขายรวมหรือค่าโฆษณาที่ใช้สรุปยังเป็นศูนย์ อาจเป็นศูนย์จริงหรือยังไม่กรอก โปรดยืนยันก่อนถือเป็นยอดครบเดือน` : '',
            crossed.length ? `มีสัปดาห์คร่อมเดือน: ${crossed.map(entry => entry.week).join(', ')} · นับทั้งสัปดาห์เข้าเดือนวันสิ้นสุด` : '',
            model.skipped.length ? `ไม่ได้รวม ${model.skipped.length} สัปดาห์ที่อ่านวันที่ไม่ได้: ${model.skipped.map(entry => entry.week || entry.id || 'ไม่ระบุชื่อ').join(', ')}` : ''
        ].filter(Boolean);
        const rate = value => planDerived ? '—' : percent(value);
        const yearMonths = model.months.filter(item => item.year === month.year);

        document.getElementById('header-subtitle').innerText = `${month.label} · รวม ${coverage.weekCount} สัปดาห์ · ${shortDate(first)} – ${shortDate(last)} · ${status}`;
        const headerControl = document.getElementById('header-monthly-control');
        headerControl.className = 'monthly-header-controls';
        headerControl.innerHTML = `<label class="monthly-selector" for="monthly-month-select"><i data-lucide="calendar-days" aria-hidden="true"></i>
            <select id="monthly-month-select" aria-label="เลือกเดือนและปี" onchange="BBMonthlyPage.selectMonth(this.value)">${options}</select></label>${renderFullscreenButton()}`;

        container.innerHTML = `<section class="monthly-dashboard" aria-label="สรุปผลงานรายเดือน">
            <nav class="monthly-department-nav" aria-label="ไปยังสรุปแต่ละฝ่ายในหน้านี้">${DEPARTMENTS.map(department => `<button type="button" class="monthly-jump monthly-tone-${department.tone}" aria-label="${department.title}" onclick="BBMonthlyPage.jumpTo('${department.key}')"><span class="monthly-icon"><i data-lucide="${department.icon}" aria-hidden="true"></i></span><span class="monthly-jump-copy"><strong>${department.title}</strong><small>${department.description}</small></span><i data-lucide="chevron-right" aria-hidden="true"></i></button>`).join('')}</nav>
            ${warnings.length ? `<div class="monthly-notice" role="status">${warnings.map(message => `<p>${safe(message)}</p>`).join('')}
                ${model.skipped.length ? `<details><summary>ช่วงวันที่ที่ยังไม่ได้นำมารวม (${model.skipped.length})</summary><ul>${model.skipped.map(entry => `<li>${safe(entry.week || entry.id)}: ${safe(entry.dateRange || 'ไม่ระบุวันที่')}</li>`).join('')}</ul></details>` : ''}
            </div>` : ''}
            <div class="monthly-performance-head">
                <div class="monthly-performance-title"><span class="monthly-performance-icon"><i data-lucide="chart-no-axes-column-increasing" aria-hidden="true"></i></span><div><h2>สรุปผลการดำเนินงาน</h2><p>ภาพรวมยอดขายประจำเดือน</p></div></div>
                <div class="monthly-performance-period"><span class="monthly-performance-calendar"><i data-lucide="calendar-days" aria-hidden="true"></i></span><div><strong>${safe(month.label)}</strong><p>ติดตามเป้าหมายอย่างชัดเจน เพื่อการเติบโตที่มั่นคง</p></div></div>
            </div>
            <div class="monthly-metrics">
                ${metricCard({ title: planDerived ? 'ยอดอ้างอิงจาก Weekly' : 'ยอดขายรวมเดือน', value: money(month.sales.actual), target: money(month.sales.target), progress: month.sales.progress, disabled: planDerived, footer: comparisonCopy(month, previous), status: salesStatus(month), monthLabel: month.label })}
                <article class="monthly-card monthly-business-summary">
                    <div class="monthly-card-heading monthly-panel-heading"><span class="monthly-panel-icon"><i data-lucide="boxes" aria-hidden="true"></i></span><div><h3>ยอดขายแยกธุรกิจ</h3><p>${safe(month.label)} · หน่วยบาท</p></div></div>
                    <div class="monthly-company-list">${Object.entries(month.sales.companies).map(([key, company]) => {
                        const progress = company.target > 0 ? company.actual / company.target * 100 : null;
                        return `<div class="monthly-company monthly-company-${key}"><span class="monthly-company-icon"><i data-lucide="${key === 'gfs' ? 'building-2' : key === 'mhl' ? 'layers' : 'car-front'}" aria-hidden="true"></i></span><div class="monthly-company-content"><div class="monthly-company-top"><div><h4>${key.toUpperCase()}</h4><p>${key === 'car' ? 'ฟิล์มรถยนต์' : 'ฟิล์มอาคาร'}</p></div><strong>${money(company.actual)} <small>บาท</small></strong></div>
                            <div class="monthly-company-progress"><div class="monthly-progress" aria-hidden="true"><span style="width:${planDerived || progress === null ? 0 : Math.max(0, Math.min(progress, 100))}%"></span></div><span class="monthly-company-rate">${rate(progress)}</span></div>
                            <div class="monthly-company-meta"><span>เป้า ${money(company.target)} บาท</span></div></div></div>`;
                    }).join('')}</div>
                    ${mismatched ? `<p class="monthly-data-note">ผลรวมรายธุรกิจต่างจาก Total Sales: ยอดขาย ${signed(salesDifference)} บาท / เป้า ${signed(targetDifference)} บาท · การ์ดยอดรวมยึดต้นทาง ไม่ปรับยอดให้เท่ากัน</p>` : ''}
                </article>
            </div>
            <div class="monthly-main-grid">
                <article class="monthly-card monthly-chart-card monthly-chart-card-wide">
                    <div class="monthly-card-heading monthly-panel-heading"><span class="monthly-panel-icon"><i data-lucide="chart-column-increasing" aria-hidden="true"></i></span><div><h3>ยอดขายเทียบเป้ารายเดือน</h3><p>ปี ${month.year} · หน่วยบาท · รวมตามสัปดาห์ของแต่ละเดือน</p></div></div>
                    <div class="monthly-chart-wrap" tabindex="0" role="region" aria-label="กราฟยอดขายรายเดือน เลื่อนแนวนอนเพื่อดูครบ"><div class="monthly-chart-plot"><canvas id="monthly-sales-chart" role="img" aria-label="กราฟแท่งยอดขายรายเดือนและเส้นเป้าหมาย ถ้วยรางวัลเมื่อถึงเป้า สีหน้าผิดหวังเมื่อยังไม่ถึงเป้า ข้อมูลตัวเลขอยู่ในตารางด้านล่าง"></canvas></div></div>
                    <p id="monthly-chart-status" class="monthly-caption" role="status" hidden></p>
                    <details class="monthly-details"><summary>ดูตัวเลขรายเดือน</summary><div class="monthly-table-wrap" tabindex="0" role="region" aria-label="ตารางยอดขายรายเดือน"><table class="monthly-table"><thead><tr><th scope="col">เดือน</th><th scope="col">ยอดตาม Weekly (บาท)</th><th scope="col">เป้าหมาย (บาท)</th><th scope="col">ผลต่างเทียบเป้า (%)</th></tr></thead><tbody>
                        ${yearMonths.map(item => `<tr${item.key === month.key ? ' class="monthly-selected-row"' : ''}><th scope="row">${safe(item.label)}${periodNotes(item)}${reachedTarget(item) ? ' <span class="monthly-award-note">🏆 ถึงเป้า</span>' : ''}</th><td>${money(item.sales.actual)}</td><td>${money(item.sales.target)}</td><td>${salesStatus(item).kind === 'pending' ? '—' : signedChartPercent(targetVariance(item))}</td></tr>`).join('')}
                    </tbody></table></div></details>
                </article>
            </div>
            <div class="monthly-section-divider"><h2>สรุปผลงานทุกฝ่าย</h2><span>เดือน ${safe(month.label)} · 5 ฝ่าย</span></div>
            ${renderMarketing(month, rate, planDerived)}
            ${renderAdmin(month, rate)}
            ${renderBuilding(month, rate, planDerived)}
            ${renderCar(month, rate)}
            ${renderTech(month, rate)}
            ${renderWeeksIncluded(month, coverage)}
            <button id="monthly-back-top" class="monthly-back-top" type="button" aria-label="กลับด้านบน" title="กลับด้านบน" onclick="BBMonthlyPage.backToTop()" hidden>
                <span class="monthly-back-top-icon"><i data-lucide="arrow-up" aria-hidden="true"></i></span><span class="monthly-back-top-label">กลับด้านบน</span>
            </button>
        </section>`;
        bindBackToTop(container);
        renderDepartmentCharts(yearMonths, month.key);
        renderChart(yearMonths, month.key);
    }

    // Chart contract: monthly actual bars against a connected target benchmark line.
    // Existing Chart.js runtime; zero baseline, baht, chronological order; table fallback.
    // Blue actual bars vs a neutral dashed target line; labels and result artwork are drawn locally.
    const CHART_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const compactChartValue = value => {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return '—';
        const absolute = Math.abs(amount);
        if (absolute >= 1000000) return `${numeric(amount / 1000000)}M`;
        if (absolute >= 1000) return `${numeric(amount / 1000)}K`;
        return numeric(amount);
    };
    const targetVariance = month => month.sales.target > 0
        ? (month.sales.actual / month.sales.target * 100) - 100
        : null;
    const signedChartPercent = value => {
        if (!Number.isFinite(value)) return '—';
        if (value !== 0 && Math.abs(value) < .05) return '≈ 0%';
        return `${value > 0 ? '+' : value < 0 ? '−' : ''}${numeric(Math.abs(value))}%`;
    };

    function drawTrophy(ctx, x, y, size) {
        // Small vector icon stays crisp on every screen without image/font loading.
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size / 24, size / 24);
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#a16207';
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-7, -8); ctx.lineTo(-11, -8); ctx.lineTo(-11, -4);
        ctx.quadraticCurveTo(-11, 0, -5, 0);
        ctx.moveTo(7, -8); ctx.lineTo(11, -8); ctx.lineTo(11, -4);
        ctx.quadraticCurveTo(11, 0, 5, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, -10); ctx.lineTo(7, -10); ctx.lineTo(6, -2);
        ctx.quadraticCurveTo(5, 3, 0, 4);
        ctx.quadraticCurveTo(-5, 3, -6, -2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(6, 11);
        ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    function drawSadFace(ctx, x, y, size) {
        // An outlined face signals a missed target without competing with the bars.
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size / 24, size / 24);
        ctx.strokeStyle = '#df4966';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-3.5, -1.5, 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(3.5, -1.5, 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 6, 4, Math.PI * 1.16, Math.PI * 1.84); ctx.stroke();
        ctx.restore();
    }

    function chartLabel(month, selectedKey) {
        const qualifiers = [
            month.coverage.isOpen ? 'สะสม' : '',
            month.coverage.isFuture ? 'อนาคต' : '',
            month.coverage.hasPlanDerived ? 'จากแผน' : '',
            month.coverage.unconfirmedWeeks.length ? 'รอยืนยัน' : ''
        ].filter(Boolean);
        return [`${CHART_MONTHS[month.month - 1] || month.month}${month.key === selectedKey ? ' •' : ''}`, String(month.year), ...qualifiers];
    }

    function renderDepartmentCharts(months, selectedKey) {
        const year = months[0]?.year;
        const byNumber = new Map(months.map(month => [month.month, month]));
        const slots = Array.from({ length: 12 }, (_, index) => byNumber.get(index + 1) || null);
        const labels = slots.map((month, index) => `${CHART_MONTHS[index]}${month?.key === selectedKey ? ' •' : ''}`);
        const specs = [
            {
                key: 'marketing', axis: 'บาท',
                datasets: [
                    ['ค่าโฆษณา', month => month.marketing.actual, '#ea580c', 'rgba(234, 88, 12, .78)', 'บาท'],
                    ['งบประมาณ', month => month.marketing.target, '#fdba74', 'transparent', 'บาท', [7, 5]]
                ]
            },
            {
                key: 'admin', axis: 'จำนวน',
                extraAxes: {
                    ySales: { label: 'บาท', color: '#a16207', position: 'right', weight: 1 }
                },
                datasets: [
                    ['ติดต่อ', month => month.admin.contacts, '#2563eb', 'rgba(37, 99, 235, .1)', 'ครั้ง'],
                    ['ส่งต่อ / Leads', month => month.admin.leads, '#06b6d4', 'transparent', 'งาน'],
                    ['ติดตั้ง', month => month.admin.installs, '#8b5cf6', 'transparent', 'งาน'],
                    ['ยอดขาย Admin', month => month.admin.sales, '#f59e0b', 'transparent', 'บาท', [], 'ySales']
                ]
            },
            {
                key: 'building', axis: 'บาท', showTargetTrophies: true,
                datasets: [
                    ['ยอดขาย', month => month.building.actual, '#059669', 'rgba(5, 150, 105, .78)', 'บาท'],
                    ['เป้าหมาย', month => month.building.target, '#86d6b6', 'transparent', 'บาท', [7, 5]]
                ]
            },
            {
                key: 'car', axis: 'บาท', showTargetTrophies: true,
                datasets: [
                    ['ยอดขาย', month => month.car.actual, '#7c3aed', 'rgba(124, 58, 237, .78)', 'บาท'],
                    ['เป้าหมาย', month => month.car.target, '#c4b5fd', 'transparent', 'บาท', [7, 5]]
                ]
            },
            {
                key: 'tech', axis: 'งาน',
                // Three source-backed measures use independent axes because their
                // units and magnitudes are not directly comparable.
                extraAxes: {
                    yArea: { label: 'ตร.ฟุต', color: '#2563eb', position: 'right', weight: 1 },
                    yDamage: { label: 'บาท', color: '#b45309', position: 'right', weight: 2 }
                },
                datasets: [
                    ['งานติดตั้ง', month => month.tech.installs, '#e11d48', 'rgba(225, 29, 72, .1)', 'งาน'],
                    ['พื้นที่ติดตั้ง', month => month.tech.area, '#2563eb', 'transparent', 'ตร.ฟุต', [], 'yArea'],
                    ['มูลค่าความเสียหาย', month => month.tech.damage, '#b45309', 'transparent', 'บาท', [7, 5], 'yDamage']
                ]
            }
        ];

        specs.forEach(spec => {
            const canvas = document.getElementById(`monthly-${spec.key}-trend-chart`);
            const status = document.getElementById(`monthly-${spec.key}-trend-status`);
            if (!canvas || typeof Chart === 'undefined') {
                if (status) status.textContent = 'กราฟยังแสดงไม่ได้';
                return;
            }
            try {
                const chartKey = `monthly${spec.key.charAt(0).toUpperCase()}${spec.key.slice(1)}Trend`;
                const targetTrophyPlugins = spec.showTargetTrophies ? [{
                    id: `${chartKey}TargetTrophies`,
                    afterDatasetsDraw(chart) {
                        if (!chart.isDatasetVisible(0)) return;
                        const { ctx, chartArea } = chart;
                        const actualBars = chart.getDatasetMeta(0).data;
                        slots.forEach((month, index) => {
                            if (!month || month.coverage.hasPlanDerived || month.coverage.isFuture) return;
                            const actual = Number(spec.datasets[0][1](month));
                            const target = Number(spec.datasets[1][1](month));
                            if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0 || actual < target) return;
                            const bar = actualBars[index];
                            if (!bar || !Number.isFinite(bar.x) || !Number.isFinite(bar.y)) return;
                            const visualTop = Number.isFinite(bar.base) ? Math.min(bar.y, bar.base) : bar.y;
                            drawTrophy(ctx, bar.x, Math.max(chartArea.top + 11, visualTop - 18), 18);
                        });
                    }
                }] : [];
                charts[chartKey] = new Chart(canvas.getContext('2d'), {
                    type: 'line',
                    plugins: targetTrophyPlugins,
                    data: {
                        labels,
                        datasets: spec.datasets.map(([label, read, borderColor, backgroundColor, unit, borderDash, yAxisID], datasetIndex) => {
                            const isBar = ['marketing', 'building', 'car'].includes(spec.key) && datasetIndex === 0;
                            return {
                                type: isBar ? 'bar' : 'line',
                                label,
                                data: slots.map(month => month ? read(month) : null),
                                unit,
                                yAxisID: yAxisID || 'y',
                                borderColor,
                                backgroundColor,
                                borderDash: borderDash || [],
                                borderWidth: isBar ? 1 : datasetIndex === 0 || yAxisID ? 3 : 2,
                                borderRadius: isBar ? { topLeft: 6, topRight: 6 } : 0,
                                borderSkipped: isBar ? 'bottom' : undefined,
                                barPercentage: isBar ? .58 : undefined,
                                categoryPercentage: isBar ? .72 : undefined,
                                pointStyle: isBar ? 'rectRounded' : 'line',
                                pointRadius: isBar ? 0 : slots.map(month => month?.key === selectedKey ? 5 : month ? 3 : 0),
                                pointHoverRadius: isBar ? 0 : 6,
                                pointBackgroundColor: '#fff',
                                pointBorderColor: borderColor,
                                pointBorderWidth: 2,
                                fill: isBar ? false : datasetIndex === 0 ? 'origin' : false,
                                tension: .28,
                                spanGaps: false
                            };
                        })
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false, animation: false,
                        interaction: { mode: 'index', intersect: false },
                        layout: { padding: { top: 8, right: 8, left: 2 } },
                        plugins: {
                            legend: { display: spec.datasets.length > 1, position: 'top', align: 'end', labels: { usePointStyle: true, padding: 16, font: { family: 'Sarabun', size: 13, weight: '600' } } },
                            tooltip: { callbacks: {
                                title: items => {
                                    const month = slots[items[0].dataIndex];
                                    return month ? `${month.label}${periodNotes(month)}` : `${CHART_MONTHS[items[0].dataIndex]} ${year}`;
                                },
                                label: item => `${item.dataset.label}: ${money(item.raw)} ${item.dataset.unit}`
                            } }
                        },
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: spec.axis, color: '#526982', font: { family: 'Sarabun', size: 13, weight: '700' } }, ticks: { callback: value => compactChartValue(value), color: '#64748b', font: { family: 'Sarabun', size: 12 } }, grid: { color: '#e5ebf3', drawBorder: false } },
                            ...Object.fromEntries(Object.entries(spec.extraAxes || {}).map(([id, axis]) => [id, {
                                beginAtZero: true,
                                position: axis.position,
                                weight: axis.weight,
                                title: { display: true, text: axis.label, color: axis.color, font: { family: 'Sarabun', size: 13, weight: '700' } },
                                ticks: { callback: value => compactChartValue(value), color: axis.color, font: { family: 'Sarabun', size: 12 } },
                                grid: { drawOnChartArea: false, drawBorder: false }
                            }])),
                            x: { grid: { display: false, drawBorder: false }, ticks: { maxRotation: 0, minRotation: 0, color: context => slots[context.index]?.key === selectedKey ? '#173f7a' : '#64748b', font: context => ({ family: 'Sarabun', size: 12, weight: slots[context.index]?.key === selectedKey ? '800' : '600' }), padding: 8 } }
                        }
                    }
                });
            } catch (error) {
                if (status) status.textContent = 'กราฟยังแสดงไม่ได้';
            }
        });
    }

    function renderChart(months, selectedKey) {
        try {
            const canvas = document.getElementById('monthly-sales-chart');
            if (!canvas || typeof Chart === 'undefined') throw new Error('Chart unavailable');
            charts.monthlySales = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                plugins: [{
                    id: 'monthlyTargetTrophies',
                    afterDatasetsDraw(chart) {
                        const { ctx, chartArea } = chart;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.font = "600 11px 'Sarabun', sans-serif";
                        [0, 1].forEach(datasetIndex => {
                            if (!chart.isDatasetVisible(datasetIndex)) return;
                            const meta = chart.getDatasetMeta(datasetIndex);
                            const values = months.map(month => datasetIndex === 0 ? month.sales.actual : month.sales.target);
                            meta.data.forEach((bar, index) => {
                                if (!bar || !Number.isFinite(bar.x) || !Number.isFinite(bar.y) || !Number.isFinite(Number(values[index]))) return;
                                const visualTop = Number.isFinite(bar.base) ? Math.min(bar.y, bar.base) : bar.y;
                                ctx.fillStyle = datasetIndex === 0 ? '#1748ad' : '#526982';
                                ctx.fillText(compactChartValue(values[index]), bar.x, Math.max(chartArea.top + 29, visualTop - 7));
                            });
                        });
                        ctx.restore();

                        // Outcome artwork belongs to actual results: hiding that dataset
                        // hides trophies/faces while target labels can remain visible.
                        if (!chart.isDatasetVisible(0)) return;
                        const actualBars = chart.getDatasetMeta(0).data;
                        const targetVisible = chart.isDatasetVisible(1);
                        const targetBars = targetVisible ? chart.getDatasetMeta(1).data : [];
                        const size = chart.width < 700 ? 15 : 17;
                        months.forEach((month, index) => {
                            const status = salesStatus(month);
                            if (status.kind === 'pending') return;
                            const actualBar = actualBars[index];
                            const targetBar = targetBars[index];
                            if (!actualBar || !Number.isFinite(actualBar.x) || !Number.isFinite(actualBar.y)) return;
                            const visibleBars = [actualBar, targetBar].filter(bar => bar && Number.isFinite(bar.x) && Number.isFinite(bar.y));
                            const groupX = visibleBars.reduce((sum, bar) => sum + bar.x, 0) / visibleBars.length;
                            const highestBar = Math.min(...visibleBars.map(bar => Number.isFinite(bar.base) ? Math.min(bar.y, bar.base) : bar.y));
                            const centerY = Math.max(chartArea.top + size / 2 + 2, highestBar - 38);
                            const varianceLabel = signedChartPercent(targetVariance(month));
                            ctx.save();
                            ctx.font = "700 11px 'Sarabun', sans-serif";
                            const textWidth = ctx.measureText(varianceLabel).width;
                            const totalWidth = size + 5 + textWidth;
                            const iconX = groupX - totalWidth / 2 + size / 2;
                            const textX = groupX - totalWidth / 2 + size + 5;
                            if (reachedTarget(month)) drawTrophy(ctx, iconX, centerY, size);
                            else drawSadFace(ctx, iconX, centerY, size);
                            ctx.fillStyle = reachedTarget(month) ? '#18834d' : '#df4966';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(varianceLabel, textX, centerY + 1);
                            ctx.restore();
                        });
                    }
                }],
                data: {
                    labels: months.map(month => chartLabel(month, selectedKey)),
                    datasets: [
                        { label: 'ยอดตาม Weekly', data: months.map(month => month.sales.actual), backgroundColor: months.map(month => month.key === selectedKey ? '#2464de' : '#3c89f7'), borderColor: months.map(month => month.key === selectedKey ? '#174dac' : '#3478dd'), borderWidth: 1, borderRadius: { topLeft: 7, topRight: 7 }, borderSkipped: 'bottom', pointStyle: 'rectRounded', order: 1, barPercentage: .62, categoryPercentage: .72 },
                        { type: 'line', label: 'เป้ารวมเดือน', data: months.map(month => month.sales.target), borderColor: '#7890ad', backgroundColor: 'transparent', borderWidth: 2.5, borderDash: [8, 5], pointStyle: 'line', pointRadius: months.map(month => month.key === selectedKey ? 5 : 3), pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderColor: '#7890ad', pointBorderWidth: 2, tension: .2, fill: false, spanGaps: false, order: 0 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, animation: false,
                    layout: { padding: { top: 8, right: 8, left: 4 } },
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', align: 'end', labels: { boxWidth: 18, boxHeight: 12, padding: 16, usePointStyle: true, font: { family: 'Sarabun', size: 12 } } },
                        tooltip: { callbacks: {
                            title: items => { const month = months[items[0].dataIndex]; return `${month.label}${periodNotes(month)}`; },
                            label: item => `${item.dataset.label}: ${money(item.raw)} บาท`,
                            afterBody: items => {
                                const month = months[items[0].dataIndex];
                                const status = salesStatus(month);
                                return status.kind === 'pending'
                                    ? `สถานะ: ${status.title}`
                                    : `สถานะ: ${status.title} (${signedChartPercent(targetVariance(month))} เทียบเป้า)`;
                            }
                        } }
                    },
                    scales: {
                        y: { beginAtZero: true, grace: '18%', title: { display: true, text: 'บาท', color: '#526982', font: { family: 'Sarabun', weight: '600' } }, ticks: { padding: 8, callback: value => compactChartValue(value), color: '#64748b', font: { family: 'Sarabun' } }, grid: { color: '#dfe8f1', drawBorder: false } },
                        x: { grid: { display: false, drawBorder: false }, ticks: { maxRotation: 0, minRotation: 0, color: context => context.index !== undefined && months[context.index]?.key === selectedKey ? '#1748ad' : '#64748b', font: context => ({ family: 'Sarabun', size: 11, weight: context.index !== undefined && months[context.index]?.key === selectedKey ? '700' : '500' }), padding: 9 } }
                    }
                }
            });
        } catch (error) {
            const status = document.getElementById('monthly-chart-status');
            if (status) {
                status.hidden = false;
                status.textContent = 'กราฟยังแสดงไม่ได้ กรุณาดูตัวเลขรายเดือนในตารางด้านล่าง';
            }
            const details = document.querySelector('.monthly-chart-card details');
            if (details) details.open = true;
            console.warn('Monthly chart unavailable; the data table remains available.', error);
        }
    }

    root.BBMonthlyPage = Object.freeze({ render, selectMonth, jumpTo, backToTop });
})(window);
