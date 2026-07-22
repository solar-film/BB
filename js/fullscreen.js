// Shared fullscreen control used by every dashboard and feedback page.
function renderFullscreenButton(extraClass = '') {
    return `
        <button type="button" class="dashboard-fullscreen-button ${extraClass}" data-fullscreen-toggle onclick="toggleDashboardFullscreen(event)" aria-label="ขยายเต็มจอ" title="ขยายเต็มจอ">
            <span class="fullscreen-button-icon" aria-hidden="true">⛶</span>
            <span class="fullscreen-button-label">เต็มจอ</span>
        </button>
    `;
}

function updateFullscreenButtons() {
    const isFullscreen = Boolean(document.fullscreenElement);
    document.querySelectorAll('[data-fullscreen-toggle]').forEach((button) => {
        const label = isFullscreen ? 'ออกจากเต็มจอ' : 'ขยายเต็มจอ';
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        const text = button.querySelector('.fullscreen-button-label');
        if (text) text.textContent = isFullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ';
    });
}

async function toggleDashboardFullscreen(event) {
    event?.preventDefault();
    try {
        if (document.fullscreenElement) await document.exitFullscreen?.();
        else await document.documentElement.requestFullscreen?.();
    } catch (error) {
        console.warn('Fullscreen mode is unavailable in this browser.', error);
    }
    updateFullscreenButtons();
}

window.toggleDashboardFullscreen = toggleDashboardFullscreen;
document.addEventListener('fullscreenchange', updateFullscreenButtons);
document.addEventListener('DOMContentLoaded', updateFullscreenButtons);
