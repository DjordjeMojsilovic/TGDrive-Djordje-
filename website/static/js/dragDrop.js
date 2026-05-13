// Drag & Drop — event-delegation approach to avoid dragleave flickering

let _draggedEl = null;
let _draggedPath = null;
let _currentDragTarget = null; // the folder-tr currently highlighted

function initDragDrop() {
    const path = getCurrentPath();
    if (path.startsWith('/trash') || path.startsWith('/search') || path.startsWith('/share')) {
        return;
    }

    // Make every row draggable
    document.querySelectorAll('tr.body-tr').forEach(row => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', _onDragStart);
        row.addEventListener('dragend', _onDragEnd);
    });

    // Use event delegation on the TABLE (not individual rows) for over/leave/drop.
    // This avoids dragleave flickering when the mouse crosses child elements.
    const table = document.querySelector('.directory table');
    if (table) {
        table.addEventListener('dragover', _onTableDragOver);
        table.addEventListener('dragleave', _onTableDragLeave);
        table.addEventListener('drop', _onTableDrop);
    }

    // Root drop zone (shown only when not at root)
    _setupRootDropZone();

    // Touch drag for mobile
    _initTouchDrag();
}

// ── Mouse drag ──

function _onDragStart(e) {
    _draggedEl = this;
    _draggedPath = (this.getAttribute('data-path') + '/' + this.getAttribute('data-id')).replaceAll('//', '/');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _draggedPath);
    // Defer opacity so the drag image captures the normal appearance
    setTimeout(() => { if (_draggedEl) _draggedEl.style.opacity = '0.4'; }, 0);
}

function _onDragEnd() {
    if (_draggedEl) _draggedEl.style.opacity = '';
    _draggedEl = null;
    _draggedPath = null;
    _clearDragTarget();
}

function _onTableDragOver(e) {
    e.preventDefault(); // required for drop to fire
    e.dataTransfer.dropEffect = 'move';

    // Find the nearest folder-tr ancestor of the hovered element
    const row = e.target.closest('tr.folder-tr');
    if (row && row !== _draggedEl) {
        if (_currentDragTarget !== row) {
            _clearDragTarget();
            row.classList.add('drag-over');
            _currentDragTarget = row;
        }
    } else if (!row) {
        // Hovering over blank table area — clear highlight
        _clearDragTarget();
    }
}

function _onTableDragLeave(e) {
    // Only clear when the mouse truly leaves the table (not just moves between children)
    if (!e.currentTarget.contains(e.relatedTarget)) {
        _clearDragTarget();
    }
}

async function _onTableDrop(e) {
    e.preventDefault();
    const target = _currentDragTarget;
    _clearDragTarget();

    if (!target || !_draggedPath) return;
    const destPath = (target.getAttribute('data-path') + target.getAttribute('data-id')).replaceAll('//', '/');
    if (_draggedPath === destPath) return;

    await _doMove(_draggedPath, destPath);
}

function _clearDragTarget() {
    if (_currentDragTarget) {
        _currentDragTarget.classList.remove('drag-over');
        _currentDragTarget = null;
    }
}

// ── Root drop zone ──

function _setupRootDropZone() {
    const path = getCurrentPath();
    if (path === '/' || path === '') return; // already at root

    const existing = document.getElementById('root-drop-zone');
    if (existing) existing.remove();

    const zone = document.createElement('div');
    zone.id = 'root-drop-zone';
    zone.className = 'root-drop-zone';
    zone.textContent = '↑ Nach Root verschieben';

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', e => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', async e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (_draggedPath) await _doMove(_draggedPath, '/');
    });

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.appendChild(zone);
}

// ── API call ──

async function _doMove(sourcePath, destPath) {
    try {
        const res = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: getPassword(), source_path: sourcePath, destination_path: destPath })
        });
        const json = await res.json();
        if (json.status === 'ok') {
            window.location.reload();
        } else {
            alert('Fehler beim Verschieben: ' + json.status);
        }
    } catch {
        alert('Verbindungsfehler beim Verschieben.');
    }
}

// ── Touch drag (mobile) ──

let _touchEl = null;
let _touchPath = null;
let _touchTarget = null;

function _initTouchDrag() {
    document.querySelectorAll('tr.body-tr').forEach(row => {
        row.addEventListener('touchstart', _onTouchStart, { passive: true });
        row.addEventListener('touchmove', _onTouchMove, { passive: false });
        row.addEventListener('touchend', _onTouchEnd);
    });
}

function _onTouchStart() {
    _touchEl = this;
    _touchPath = (this.getAttribute('data-path') + '/' + this.getAttribute('data-id')).replaceAll('//', '/');
    setTimeout(() => { if (_touchEl) _touchEl.style.opacity = '0.4'; }, 150);
}

function _onTouchMove(e) {
    if (!_touchEl) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el ? el.closest('tr.folder-tr') : null;
    if (_touchTarget && _touchTarget !== row) {
        _touchTarget.classList.remove('drag-over');
    }
    if (row && row !== _touchEl) {
        row.classList.add('drag-over');
        _touchTarget = row;
    } else {
        _touchTarget = null;
    }
}

async function _onTouchEnd() {
    if (!_touchEl) return;
    _touchEl.style.opacity = '';
    const target = _touchTarget;
    if (target) target.classList.remove('drag-over');
    const src = _touchPath;
    _touchEl = null; _touchPath = null; _touchTarget = null;
    if (target && src) {
        const dest = (target.getAttribute('data-path') + target.getAttribute('data-id')).replaceAll('//', '/');
        if (src !== dest) await _doMove(src, dest);
    }
}
