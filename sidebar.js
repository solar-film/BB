const CAR_CRM_NAV = [
    { href: 'index.html', label: 'รายการคิวจอง', icon: '▦', color: 'blue' },
    { href: 'calendar.html', label: 'ปฏิทินคิวจอง', icon: '◷', color: 'sky' },
    { href: 'sales-dashboard.html', label: 'ราคาขายเดือนนี้', icon: '฿', color: 'amber' },
    { href: 'install-summary.html', label: 'สรุปงานฟิล์ม', icon: 'Σ', color: 'emerald' },
    { href: 'damage.html', label: 'ความเสียหาย', icon: '!', color: 'rose' },
    { href: 'other-damage.html', label: 'ความเสียหายอื่นๆ', icon: '+', color: 'indigo' }
];

const CAR_CRM_ADMIN_URL = 'https://www.appsheet.com/start/80996d9a-92c8-4534-ba3e-04ee20708ec7';

const CAR_CRM_TITLES = {
    'index.html': 'รายการคิวจอง',
    'calendar.html': 'ปฏิทินคิวจอง',
    'sales-dashboard.html': 'ราคาขายเดือนนี้',
    'sunroof.html': 'Sunroof',
    'install-summary.html': 'สรุปงานฟิล์ม',
    'damage.html': 'ความเสียหาย',
    'other-damage.html': 'ความเสียหายอื่นๆ'
};

function currentCarCrmPage() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    return page === '' ? 'index.html' : page;
}

function iconColorClass(color, isActive) {
    if (isActive) return 'bg-white text-blue-600 shadow-sm';

    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        sky: 'bg-sky-50 text-sky-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
        indigo: 'bg-indigo-50 text-indigo-600'
    };

    return colors[color] || 'bg-slate-100 text-slate-500';
}

function navItemHtml(item, activePage) {
    const isActive = item.href === activePage;

    const linkClass = isActive
        ? 'flex items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm'
        : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900';

    const iconClass = `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold ${iconColorClass(item.color, isActive)}`;

    return `
        <a href="${item.href}" class="${linkClass}">
            <span class="${iconClass}">${item.icon}</span>
            <span class="flex-1">${item.label}</span>
        </a>
    `;
}

function renderCarCrmSidebar() {
    const host = document.querySelector('[data-car-crm-sidebar]');
    if (!host) return;

    const activePage = currentCarCrmPage();
    const pageTitle = CAR_CRM_TITLES[activePage] || 'CAR CRM';
    const navLinks = CAR_CRM_NAV.map(item => navItemHtml(item, activePage)).join('');

    host.innerHTML = `
        <button type="button" data-sidebar-open class="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur lg:hidden">
            <span>☰</span>
            เมนู
        </button>

        <div data-sidebar-overlay class="fixed inset-0 z-40 hidden bg-slate-900/20 backdrop-blur-sm lg:hidden"></div>

        <aside data-sidebar-panel class="fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-slate-200 bg-white/85 text-slate-900 shadow-xl backdrop-blur-2xl transition-transform duration-200 lg:z-40 lg:translate-x-0 lg:shadow-none">
            
            <div class="px-5 py-6">
                <div class="flex items-center gap-3">
                    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-extrabold text-white shadow-sm">
                        CRM
                    </div>

                    <div class="min-w-0">
                        <div class="truncate text-lg font-extrabold leading-tight text-slate-900">CAR CRM</div>
                        <div class="mt-0.5 text-xs font-medium text-slate-500">จัดการคิวติดตั้งฟิล์ม</div>
                    </div>

                    <button type="button" data-sidebar-close class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden">
                        ×
                    </button>
                </div>
            </div>

            <div class="mx-5 h-px bg-slate-200"></div>

            <nav class="flex-1 overflow-y-auto px-4 py-5">
                <div>
                    <div class="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Main
                    </div>

                    <div class="space-y-1">
                        ${navLinks}
                    </div>
                </div>

                <div class="mt-7 border-t border-slate-200 pt-5">
                    <div class="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Operations
                    </div>

                    <a href="${CAR_CRM_ADMIN_URL}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold text-indigo-600">↗</span>
                        <span class="flex-1">Admin Panel</span>
                    </a>

                    <a href="https://solar-film.github.io/BB/" target="_blank" rel="noopener noreferrer" class="mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-base font-bold text-sky-600">BB</span>
                        <span class="flex-1">BB meeting</span>
                    </a>
                </div>
            </nav>

            <div class="m-4 rounded-2xl border border-slate-200 bg-blue-50/80 p-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        i
                    </div>
                    <div class="min-w-0">
                        <div class="text-sm font-bold text-slate-900">ผู้ดูแลระบบ</div>
                        <div class="mt-0.5 truncate text-xs text-slate-500">เชื่อมต่อข้อมูล Google Sheets</div>
                    </div>
                </div>
            </div>
        </aside>

        <header class="bg-white/90 px-4 py-4 pl-28 text-slate-900 shadow-sm ring-1 ring-slate-200 backdrop-blur lg:hidden">
            <div class="text-lg font-bold">${pageTitle}</div>
        </header>
    `;

    const panel = host.querySelector('[data-sidebar-panel]');
    const overlay = host.querySelector('[data-sidebar-overlay]');
    const openButton = host.querySelector('[data-sidebar-open]');
    const closeButton = host.querySelector('[data-sidebar-close]');

    const openSidebar = () => {
        panel.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    const closeSidebar = () => {
        panel.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    openButton?.addEventListener('click', openSidebar);
    closeButton?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    host.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) closeSidebar();
        });
    });

    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSidebar();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            overlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        } else {
            panel.classList.add('-translate-x-full');
        }
    });
}

document.addEventListener('DOMContentLoaded', renderCarCrmSidebar);
