// Top navbar wiring: hamburger (sidebar toggle), view mode toggle,
// management mode toggle, avatar logout.
// All four buttons were dead before this file existed.

(function () {
    'use strict';

    // ── Sidebar collapse (hamburger) ──

    function applySidebarState() {
        const collapsed = localStorage.getItem('sidebarCollapsed') === '1';
        const sidebar = document.querySelector('.sidebar');
        const container = document.querySelector('.container');
        if (!sidebar || !container) return;
        if (collapsed) {
            sidebar.classList.add('collapsed');
            container.classList.add('sidebar-collapsed');
            document.body.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            container.classList.remove('sidebar-collapsed');
            document.body.classList.remove('sidebar-collapsed');
        }
    }

    function toggleSidebar() {
        const current = localStorage.getItem('sidebarCollapsed') === '1';
        localStorage.setItem('sidebarCollapsed', current ? '0' : '1');
        applySidebarState();
    }

    // ── Helpers to find the two icon-buttons by their inner icon name ──

    function findIconButton(iconName) {
        const buttons = document.querySelectorAll('.navbar-right .icon-btn');
        for (const btn of buttons) {
            const ico = btn.querySelector('.material-icons');
            if (ico && ico.textContent.trim() === iconName) return btn;
        }
        return null;
    }

    // We need to identify the view-toggle button even after its icon text
    // changes (view_module ↔ view_list). Tag it on first-find for stability.
    function getViewToggleBtn() {
        let btn = document.querySelector('.navbar-right .icon-btn[data-nav-role="view-toggle"]');
        if (btn) return btn;
        // First-time: locate by initial icon. May be either view_module (list mode) or view_list (grid mode).
        const initial = localStorage.getItem('viewMode') === 'grid' ? 'view_list' : 'view_module';
        btn = findIconButton(initial) || findIconButton('view_module') || findIconButton('view_list');
        if (btn) btn.setAttribute('data-nav-role', 'view-toggle');
        return btn;
    }

    function getMgmtToggleBtn() {
        let btn = document.querySelector('.navbar-right .icon-btn[data-nav-role="mgmt-toggle"]');
        if (btn) return btn;
        btn = findIconButton('settings');
        if (btn) btn.setAttribute('data-nav-role', 'mgmt-toggle');
        return btn;
    }

    // ── View mode (list / grid) ──

    function updateViewToggleIcon() {
        const btn = getViewToggleBtn();
        if (!btn) return;
        const ico = btn.querySelector('.material-icons');
        if (!ico) return;
        const mode = localStorage.getItem('viewMode') || 'list';
        // When in grid mode, show view_list (the icon to switch BACK to list).
        ico.textContent = (mode === 'grid') ? 'view_list' : 'view_module';
        btn.classList.toggle('active', mode === 'grid');
    }

    function toggleViewMode() {
        const current = localStorage.getItem('viewMode') || 'list';
        const next = (current === 'grid') ? 'list' : 'grid';
        localStorage.setItem('viewMode', next);
        updateViewToggleIcon();
        if (typeof applyViewMode === 'function') {
            try { applyViewMode(); } catch (e) { console.error(e); }
        }
    }

    // ── Management mode (multi-select) ──

    function updateMgmtToggleIcon() {
        const btn = getMgmtToggleBtn();
        if (!btn) return;
        btn.classList.toggle('active', document.body.classList.contains('management-mode'));
    }

    function toggleMgmtMode() {
        const active = document.body.classList.contains('management-mode');
        if (active) {
            if (typeof exitMgmtMode === 'function') exitMgmtMode();
            else document.body.classList.remove('management-mode');
        } else {
            if (typeof enterMgmtMode === 'function') enterMgmtMode();
            else document.body.classList.add('management-mode');
        }
        updateMgmtToggleIcon();
    }

    // ── Avatar logout ──

    function handleLogout() {
        const ok = window.confirm('Wirklich abmelden?');
        if (!ok) return;
        try { localStorage.removeItem('password'); } catch (e) {}
        window.location.href = '/';
    }

    // ── Wire-up ──

    function init() {
        // Hamburger
        const hamburger = document.querySelector('.hamburger-btn');
        if (hamburger) {
            hamburger.addEventListener('click', toggleSidebar);
        }
        applySidebarState();

        // View toggle
        const viewBtn = getViewToggleBtn();
        if (viewBtn) {
            viewBtn.addEventListener('click', toggleViewMode);
        }
        updateViewToggleIcon();

        // Management toggle
        const mgmtBtn = getMgmtToggleBtn();
        if (mgmtBtn) {
            mgmtBtn.addEventListener('click', toggleMgmtMode);
        }
        updateMgmtToggleIcon();

        // Avatar
        const avatar = document.querySelector('.avatar');
        if (avatar) {
            avatar.style.cursor = 'pointer';
            avatar.addEventListener('click', handleLogout);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose a few helpers in case other modules want to read state
    window.navbarUpdateMgmtIcon = updateMgmtToggleIcon;
    window.navbarUpdateViewIcon = updateViewToggleIcon;
})();
