/* Independent navigation shell; no dashboard data or state is loaded here. */
(() => {
    'use strict';
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menu-toggle');
    const backdrop = document.getElementById('menu-backdrop');
    const main = document.getElementById('main-content');
    const mobile = matchMedia('(max-width: 1023px)');
    let collapsed = false, open = false;
    function updateMenu() {
        const visible = mobile.matches ? open : !collapsed;
        document.body.classList.toggle('menu-collapsed', !mobile.matches && collapsed);
        document.body.classList.toggle('menu-open', mobile.matches && open);
        sidebar.inert = !visible;
        main.inert = mobile.matches && open;
        backdrop.hidden = !(mobile.matches && open);
        toggle.setAttribute('aria-expanded', String(visible));
        toggle.setAttribute('aria-label', visible ? 'ซ่อนเมนู' : 'แสดงเมนู');
        toggle.title = visible ? 'ซ่อนเมนู' : 'แสดงเมนู';
        toggle.innerHTML = `<i data-lucide="${visible ? 'panel-left-close' : 'panel-left-open'}"></i>`;
        window.lucide?.createIcons();
    }
    function closeMenu() { open = false; updateMenu(); toggle.focus(); }
    toggle.addEventListener('click', () => {
        if (mobile.matches) open = !open; else collapsed = !collapsed;
        updateMenu();
        if (mobile.matches && open) document.getElementById('menu-close').focus();
    });
    backdrop.addEventListener('click', closeMenu);
    document.getElementById('menu-close').addEventListener('click', closeMenu);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && open) closeMenu(); });
    mobile.addEventListener('change', () => { open = false; updateMenu(); });
    const fullscreen = document.getElementById('fullscreen');
    fullscreen.hidden = !document.fullscreenEnabled;
    fullscreen.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
        } catch { fullscreen.title = 'เบราว์เซอร์ไม่อนุญาตให้เปิดเต็มจอ'; }
    });
    document.addEventListener('fullscreenchange', () => {
        fullscreen.querySelector('span').textContent = document.fullscreenElement ? 'ออกจากเต็มจอ' : 'เต็มจอ';
    });
    updateMenu();
})();
