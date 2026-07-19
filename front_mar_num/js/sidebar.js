/**
 * Sidebar & Responsive — Tienda Mar & Num
 * Maneja el menú lateral móvil y ajustes responsivos globales
 * para todas las páginas del panel de administración.
 *
 * DEPENDENCIA: se espera que el HTML tenga un <aside id="sidebar">
 * y una <div class="topbar">.
 */

function initResponsive() {
    const sidebar = document.getElementById('sidebar');
    const topbar = document.querySelector('.topbar');

    if (sidebar && topbar && !document.querySelector('.mobile-menu-btn')) {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>';

        topbar.prepend(menuBtn);

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });

        const style = document.createElement('style');
        style.innerHTML = `
            .mobile-menu-btn {
                display: none;
                background: transparent;
                border: none;
                color: var(--espresso, #4A342A);
                cursor: pointer;
                padding: 4px;
                margin-right: 8px;
                flex-shrink: 0;
            }
            .mobile-menu-btn svg { width: 26px; height: 26px; }
            .sidebar-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(44,26,18,0.5);
                backdrop-filter: blur(2px);
                z-index: 90;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            .sidebar-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            @media (max-width: 768px) {
                .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
                .topbar { padding: 0 12px !important; gap: 8px !important; }
                .topbar .btn-primary { font-size: 0 !important; padding: 8px !important; gap: 0 !important; }
                .topbar .btn-primary svg { margin: 0; width: 20px; height: 20px; }
                .topbar-title h2 { font-size: 1.1rem !important; }
                .topbar-title p { font-size: 0.7rem !important; }

                .main-content { padding: 16px !important; }

                .panel-header { flex-direction: column; align-items: flex-start; gap: 10px; }
                .panel-header > div { width: 100%; }
                .panel-header .total-badge, .panel-header button { align-self: flex-start; margin-top: 6px; }

                .toolbar { flex-direction: column; align-items: stretch !important; gap: 12px; }
                .search-box { max-width: 100% !important; width: 100%; }
                .filter-select, .toolbar .btn-primary { width: 100%; justify-content: center; font-size: 0.875rem !important; }

                .modal { margin: 16px; width: calc(100% - 32px) !important; max-width: none !important; }

                .pagination { flex-direction: column; align-items: center; gap: 16px; }
            }

            @media (max-width: 500px) {
                .stats-grid, .stats-mini, .panels-row { grid-template-columns: 1fr !important; }
            }
        `;
        document.head.appendChild(style);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResponsive);
} else {
    initResponsive();
}
