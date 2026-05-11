// Global dashboard state, navigation handlers, and page controller.
let dashboardData = [];
let feedbackData = [];
let selectedId = '';
let selectedFeedbackWeek = '';
let isUsingMock = false;
let errorMessage = null;
let currentPage = 'overview'; // เปลี่ยนค่าเริ่มต้นเป็น overview
let charts = {};

let overviewTimeframe = 'monthly';
let activeChartTab = 'total';

let activeMarketingChartTab = 'yearly';
let marketingTrendFilter = 'total'; 

let buildingTrendFilter = 'total'; 
let adminTrendFilter = 'total';
let techTrendFilter = 'total'; 
let repChartTimeframe = 'monthly'; 

let isDesktopSidebarCollapsed = false;


function openMobileMenu() {
    const sidebar = document.getElementById('mobile-sidebar');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    backdrop.classList.remove('hidden');
    document.body.classList.add('mobile-menu-open');
    lucide.createIcons();
}

function closeMobileMenu() {
    const sidebar = document.getElementById('mobile-sidebar');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    backdrop.classList.add('hidden');
    document.body.classList.remove('mobile-menu-open');
}

window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;

function updateDesktopSidebarUI() {
    const sidebar = document.getElementById('desktop-sidebar');
    const toggleButton = document.getElementById('desktop-sidebar-toggle');
    const toggleIcon = document.getElementById('desktop-sidebar-toggle-icon');
    if (!sidebar || !toggleButton || !toggleIcon) return;

    sidebar.classList.toggle('lg:flex', !isDesktopSidebarCollapsed);
    sidebar.classList.toggle('lg:hidden', isDesktopSidebarCollapsed);
    toggleButton.setAttribute('aria-label', isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู');
    toggleButton.setAttribute('title', isDesktopSidebarCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู');
    toggleIcon.setAttribute('data-lucide', isDesktopSidebarCollapsed ? 'panel-left-open' : 'panel-left-close');
    lucide.createIcons();
}

window.toggleDesktopSidebar = () => {
    isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed;
    updateDesktopSidebarUI();
};

window.handleWeekChange = (e) => { selectedId = e.target.value; updateDashboardUI(); };
window.handleFeedbackWeekChange = (e) => { selectedFeedbackWeek = e.target.value; updateDashboardUI(); };
window.changeOverviewTimeframe = (t) => { overviewTimeframe = t; updateDashboardUI(); };
window.changeChartTab = (t) => { activeChartTab = t; updateDashboardUI(); };
window.changeMarketingChartTab = (t) => { activeMarketingChartTab = t; updateDashboardUI(); };
window.changeMarketingTrendFilter = (t) => { marketingTrendFilter = t; updateDashboardUI(); };
window.changeBuildingTrendFilter = (t) => { buildingTrendFilter = t; updateDashboardUI(); };
window.changeAdminTrendFilter = (t) => { adminTrendFilter = t; updateDashboardUI(); };
window.changeTechTrendFilter = (t) => { techTrendFilter = t; updateDashboardUI(); };
window.changeRepChartTimeframe = (t) => { repChartTimeframe = t; updateDashboardUI(); };

window.changePage = (page) => {
    currentPage = page;
    updateDashboardUI();
    
    const menus = ['overview', 'sales', 'car', 'marketing', 'tech', 'admin', 'feedback'];
    menus.forEach(m => {
        ['menu-', 'mobile-menu-'].forEach(prefix => {
            const el = document.getElementById(prefix + m);
            if (el) el.className = `flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold ${m === page ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`;
        });
    });

    closeMobileMenu();
};

function updateDashboardUI() {
    if (currentPage === 'feedback') {
        document.getElementById('error-banner-container').innerHTML = '';
        destroyAllCharts();
        renderFeedbackHTML(document.getElementById('dashboard-content'));
        lucide.createIcons();
        return;
    }

    const current = dashboardData.find(d => d.id === selectedId);
    if (!current) return;
    const m = calculateMetrics(current);
    const opt = dashboardData.map(d => `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${d.week} (${d.dateRange})</option>`).join('');
    
    // อัปเดต Title ให้แสดง Week ปัจจุบันด้วย
    const pageInfo = {
        'overview': { title: 'ภาพรวมธุรกิจ (Overview)', sub: 'สรุปข้อมูลสถิติรายสัปดาห์' },
        'sales': { title: 'ฝ่ายขาย ฟิล์มอาคาร', sub: 'ประสิทธิภาพการขายของ Sales Reps และ Projects' },
        'car': { title: 'ฝ่ายขาย ฟิล์มรถยนต์', sub: 'เจาะลึกยอดขาย การติดต่อ และทีมช่างฟิล์มรถยนต์' },
        'marketing': { title: 'MARKETING Online', sub: 'วิเคราะห์งบโฆษณา การเข้าถึง และความคุ้มค่า (ROAS)' },
        'tech': { title: 'ทีมช่างติดตั้ง (อาคาร)', sub: 'วิเคราะห์ประสิทธิภาพงานติดตั้งและบริหารความเสียหาย' },
        'admin': { title: 'SALES ADMIN', sub: 'เจาะลึกการประสานงาน ปริมาณติดต่อ และยอดขายแอดมิน' }
    };
    document.getElementById('header-title').innerText = pageInfo[currentPage].title;
    document.getElementById('header-subtitle').innerText = `${pageInfo[currentPage].sub} (ข้อมูลประจำ ${current.week})`;

    const bannerContainer = document.getElementById('error-banner-container');
    bannerContainer.innerHTML = isUsingMock ? `<div class="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3"><i data-lucide="alert-triangle" class="text-amber-500 w-5 h-5 flex-shrink-0"></i><p class="text-amber-800 text-base"><strong>โหมดสาธิต:</strong> ข้อมูลจำลอง (${errorMessage})</p></div>` : '';

    destroyAllCharts();
    const contentDiv = document.getElementById('dashboard-content');

    if (currentPage === 'overview') renderOverviewHTML(current, m, opt, contentDiv);
    else if (currentPage === 'sales') renderBuildingSalesHTML(current, m, opt, contentDiv);
    else if (currentPage === 'car') renderCarDeepDiveHTML(current, m, opt, contentDiv);
    else if (currentPage === 'admin') renderAdminDeepDiveHTML(current, m, opt, contentDiv);
    else if (currentPage === 'marketing') renderMarketingDeepDiveHTML(current, m, opt, contentDiv);
    else if (currentPage === 'tech') renderTechDeepDiveHTML(current, m, opt, contentDiv);
    else renderOverviewHTML(current, m, opt, contentDiv);

    lucide.createIcons(); 
}


window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
});

window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) closeMobileMenu();
});

window.onload = () => {
    updateDesktopSidebarUI();
    loadData();
};
