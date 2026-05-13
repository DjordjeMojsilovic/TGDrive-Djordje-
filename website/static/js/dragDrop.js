// Drag & Drop feature for Djordje Drive

function initDragDrop() {
    const path = getCurrentPath();
    // Disable drag-drop in special views
    if (path.startsWith('/trash') || path.startsWith('/search') || path.startsWith('/share')) {
        return;
    }

    const rows = document.querySelectorAll('tr.body-tr');
    rows.forEach(row => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', onDragStart);
        row.addEventListener('dragend', onDragEnd);
    });

    const folderRows = document.querySelectorAll('tr.folder-tr');
    folderRows.forEach(row => {
        row.addEventListener('dragover', onDragOver);
        row.addEventListener('dragleave', onDragLeave);
        row.addEventListener('drop', onDropOnFolder);
    });

    // Table body drop (dropping to current directory — no-op unless cross-folder)
    const tbody = document.getElementById('directory-data');
    if (tbody) {
        tbody.addEventListener('dragover', e => e.preventDefault());
        tbody.addEventListener('drop', onDropOnTable);
    }

    // Root drop zone
    setupRootDropZone();

    // Touch events for mobile
    initTouchDragDrop();
}

let draggedEl = null;
let draggedPath = null;

function onDragStart(e) {
    draggedEl = this;
    draggedPath = (this.getAttribute('data-path') + '/' + this.getAttribute('data-id')).replaceAll('//', '/');
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedPath);
}

function onDragEnd(e) {
    if (draggedEl) {
        draggedEl.style.opacity = '';
    }
    draggedEl = null;
    draggedPath = null;
    // Remove all drag-over highlights
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedEl !== this) {
        this.classList.add('drag-over');
    }
}

function onDragLeave(e) {
    this.classList.remove('drag-over');
}

async function onDropOnFolder(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');

    if (!draggedEl || draggedEl === this) return;

    const srcPath = draggedPath;
    const destFolderPath = (this.getAttribute('data-path') + this.getAttribute('data-id')).replaceAll('//', '/');

    if (!srcPath || !destFolderPath) return;

    // Don't move if dropping into itself
    if (srcPath === destFolderPath) return;

    await doMove(srcPath, destFolderPath);
}

async function onDropOnTable(e) {
    e.preventDefault();
    // Dropped on table (not on a folder row) — no meaningful move needed
}

function setupRootDropZone() {
    const path = getCurrentPath();
    // Only show root drop zone if we are NOT at root
    if (path === '/' || path === '') return;

    const existingZone = document.getElementById('root-drop-zone');
    if (existingZone) existingZone.remove();

    const zone = document.createElement('div');
    zone.id = 'root-drop-zone';
    zone.className = 'root-drop-zone';
    zone.textContent = 'Nach Root verschieben /';

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', async e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (!draggedPath) return;
        await doMove(draggedPath, '/');
    });

    // Insert below the .directory div
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.appendChild(zone);
    }
}

async function doMove(sourcePath, destPath) {
    try {
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: getPassword(),
                source_path: sourcePath,
                destination_path: destPath
            })
        });
        const json = await response.json();
        if (json.status === 'ok') {
            window.location.reload();
        } else {
            alert('Fehler beim Verschieben: ' + json.status);
        }
    } catch (e) {
        alert('Verbindungsfehler beim Verschieben.');
    }
}

// ── Touch Drag & Drop (mobile) ──

let touchDraggedEl = null;
let touchDraggedPath = null;
let touchHighlightedEl = null;

function initTouchDragDrop() {
    const path = getCurrentPath();
    if (path.startsWith('/trash') || path.startsWith('/search') || path.startsWith('/share')) {
        return;
    }

    const rows = document.querySelectorAll('tr.body-tr');
    rows.forEach(row => {
        row.addEventListener('touchstart', onTouchStart, { passive: true });
        row.addEventListener('touchmove', onTouchMove, { passive: false });
        row.addEventListener('touchend', onTouchEnd);
    });
}

function onTouchStart(e) {
    touchDraggedEl = this;
    touchDraggedPath = (this.getAttribute('data-path') + '/' + this.getAttribute('data-id')).replaceAll('//', '/');
    this.style.opacity = '0.5';
}

function onTouchMove(e) {
    if (!touchDraggedEl) return;
    e.preventDefault();

    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);

    // Find nearest folder-tr ancestor
    const folderRow = el ? el.closest('tr.folder-tr') : null;

    // Clear previous highlight
    if (touchHighlightedEl && touchHighlightedEl !== folderRow) {
        touchHighlightedEl.classList.remove('drag-over');
    }

    if (folderRow && folderRow !== touchDraggedEl) {
        folderRow.classList.add('drag-over');
        touchHighlightedEl = folderRow;
    } else {
        touchHighlightedEl = null;
    }
}

async function onTouchEnd(e) {
    if (!touchDraggedEl) return;

    touchDraggedEl.style.opacity = '';

    if (touchHighlightedEl) {
        touchHighlightedEl.classList.remove('drag-over');
        const destFolderPath = (touchHighlightedEl.getAttribute('data-path') + touchHighlightedEl.getAttribute('data-id')).replaceAll('//', '/');
        if (touchDraggedPath && destFolderPath && touchDraggedPath !== destFolderPath) {
            await doMove(touchDraggedPath, destFolderPath);
        }
    }

    touchDraggedEl = null;
    touchDraggedPath = null;
    touchHighlightedEl = null;
}
