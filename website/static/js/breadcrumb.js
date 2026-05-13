// Breadcrumb navigation for Djordje Drive

async function loadBreadcrumb() {
    const path = getCurrentPath();

    // No breadcrumb for special views
    if (path === 'redirect') return;
    if (path.startsWith('/trash') || path.startsWith('/search') || path.startsWith('/share')) {
        return;
    }

    try {
        const res = await fetch('/api/getPathBreadcrumb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path, password: getPassword() })
        });
        const json = await res.json();

        if (json.status !== 'ok' || !json.data || !json.data.length) return;

        const crumbs = json.data;
        const container = document.getElementById('breadcrumb');
        if (!container) return;

        let html = '';
        crumbs.forEach((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            if (isLast) {
                html += `<span class="breadcrumb-current">${crumb.name}</span>`;
            } else {
                html += `<a class="breadcrumb-link" href="/?path=${crumb.path}">${crumb.name}</a>`;
                html += `<span class="breadcrumb-sep material-icons">chevron_right</span>`;
            }
        });

        container.innerHTML = html;
    } catch (e) {
        console.log('Breadcrumb error:', e);
    }
}

document.addEventListener('DOMContentLoaded', loadBreadcrumb);
