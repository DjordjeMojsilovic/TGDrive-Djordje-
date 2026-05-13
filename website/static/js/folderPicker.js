// Move-to-folder picker modal.
// `openMovePicker(sources, onPicked)`:
//   - `sources` is an array of paths the user is moving FROM (one or many).
//   - `onPicked(destinationPath)` is invoked once the user confirms a folder.
//
// We filter out the source items themselves (and their descendants for
// folder sources) so the user can't pick an invalid destination.

(function () {
    'use strict';

    let _onPickedCallback = null;
    let _selectedPath = null;
    let _allFolders = [];

    function normalisePath(p) {
        return ('/' + (p || '').replace(/^\/+|\/+$/g, '')).replace(/\/+/g, '/');
    }

    function isDescendantOrSelf(targetPath, sourcePath) {
        const t = normalisePath(targetPath);
        const s = normalisePath(sourcePath);
        if (t === s) return true;
        return t.startsWith(s + '/');
    }

    function shouldDisable(folderPath, sources) {
        for (const src of sources) {
            if (isDescendantOrSelf(folderPath, src)) return true;
        }
        return false;
    }

    function openModal() {
        const bg = document.getElementById('bg-blur');
        const modal = document.getElementById('move-picker-modal');
        bg.style.zIndex = '2';
        bg.style.opacity = '0.1';
        modal.style.zIndex = '3';
        modal.style.opacity = '1';
    }

    function closeModal() {
        const bg = document.getElementById('bg-blur');
        const modal = document.getElementById('move-picker-modal');
        bg.style.opacity = '0';
        setTimeout(() => { bg.style.zIndex = '-1'; }, 300);
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.zIndex = '-1'; }, 300);
        _selectedPath = null;
    }

    function renderList(sources) {
        const list = document.getElementById('move-picker-list');
        if (!list) return;
        list.innerHTML = '';

        const entries = [];
        // Synthetic root entry first
        entries.push({ id: 'root', name: 'Djordje Drive', path: '/', depth: 0, has_password: false });

        for (const f of _allFolders) {
            entries.push(f);
        }

        entries.forEach((entry) => {
            const row = document.createElement('div');
            row.className = 'move-picker-row';
            row.setAttribute('data-path', entry.path);
            row.setAttribute('data-id', entry.id);
            row.setAttribute('data-has-password', entry.has_password ? 'true' : 'false');
            row.style.paddingLeft = (12 + (entry.depth || 0) * 16) + 'px';

            const ico = document.createElement('span');
            ico.className = 'material-icons';
            ico.textContent = 'folder';
            row.appendChild(ico);

            const label = document.createElement('span');
            label.textContent = entry.name;
            row.appendChild(label);

            if (entry.has_password) {
                const lock = document.createElement('span');
                lock.className = 'lock-badge';
                lock.textContent = '🔒';
                row.appendChild(lock);
            }

            if (shouldDisable(entry.path, sources)) {
                row.classList.add('disabled');
            } else {
                row.addEventListener('click', () => {
                    list.querySelectorAll('.move-picker-row.selected').forEach((r) => r.classList.remove('selected'));
                    row.classList.add('selected');
                    _selectedPath = entry.path;
                });
            }

            list.appendChild(row);
        });
    }

    async function fetchFolders() {
        const json = await postJson('/api/getAllFolders', {});
        if (json.status === 'ok') {
            _allFolders = json.data || [];
        } else {
            _allFolders = [];
        }
    }

    async function openMovePicker(sources, onPicked) {
        _onPickedCallback = onPicked;
        _selectedPath = null;
        await fetchFolders();
        renderList(sources || []);
        openModal();
    }

    function pickerConfirm() {
        if (!_selectedPath) {
            alert('Bitte einen Zielordner auswählen.');
            return;
        }
        const destPath = _selectedPath;
        // Find the row to check has_password
        const row = document.querySelector(`.move-picker-row[data-path="${destPath}"]`);
        const isLocked = row && row.getAttribute('data-has-password') === 'true';
        const destId = row ? row.getAttribute('data-id') : null;

        const cb = _onPickedCallback;
        closeModal();

        if (isLocked && destId && destId !== 'root') {
            // Check if already unlocked (hash in sessionStorage)
            const hash = (typeof getFolderUnlockHash === 'function') ? getFolderUnlockHash(destId) : null;
            if (hash) {
                if (cb) cb(destPath);
            } else if (typeof showFolderPasswordModal === 'function') {
                showFolderPasswordModal(destId, destPath, () => {
                    if (cb) cb(destPath);
                });
            } else {
                if (cb) cb(destPath);
            }
        } else {
            if (cb) cb(destPath);
        }
    }

    function init() {
        const cancelBtn = document.getElementById('move-picker-cancel');
        const confirmBtn = document.getElementById('move-picker-confirm');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (confirmBtn) confirmBtn.addEventListener('click', pickerConfirm);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose
    window.openMovePicker = openMovePicker;
})();
