// Multi-select "management mode" — checkboxes on every row + floating action bar.
// Wired by navbar.js when the user clicks the settings cog.

(function () {
    'use strict';

    const selectedIds = new Set();

    function updateCountLabel() {
        const el = document.getElementById('mgmt-count');
        if (el) el.textContent = String(selectedIds.size);
    }

    function getRowForId(id) {
        return document.querySelector(`tr.body-tr[data-id="${id}"]`);
    }

    function buildSourcePathForRow(row) {
        if (!row) return null;
        const id = row.getAttribute('data-id');
        const basePath = row.getAttribute('data-path') || '/';
        const joined = (basePath.endsWith('/') ? basePath : basePath + '/') + id;
        return ('/' + joined).replace(/\/+/g, '/');
    }

    function ensureCheckboxOnRow(row) {
        const firstTd = row.querySelector('td:first-child');
        if (!firstTd) return;
        const align = firstTd.querySelector('.td-align');
        if (!align) return;
        if (align.querySelector('.row-check')) return;

        const id = row.getAttribute('data-id');
        const wrap = document.createElement('span');
        wrap.className = 'row-check';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('data-id', id);
        checkbox.checked = selectedIds.has(id);
        checkbox.addEventListener('click', (e) => e.stopPropagation());
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selectedIds.add(id);
            else selectedIds.delete(id);
            updateCountLabel();
        });
        wrap.appendChild(checkbox);

        // Insert at start of td-align
        align.insertBefore(wrap, align.firstChild);
    }

    function decorateRowsWithCheckboxes() {
        document.querySelectorAll('tr.body-tr').forEach(ensureCheckboxOnRow);
        updateCountLabel();
    }

    function clearCheckboxesFromRows() {
        document.querySelectorAll('.row-check').forEach((el) => el.remove());
    }

    function enterMgmtMode() {
        document.body.classList.add('management-mode');
        decorateRowsWithCheckboxes();
        if (typeof window.navbarUpdateMgmtIcon === 'function') {
            window.navbarUpdateMgmtIcon();
        }
    }

    function exitMgmtMode() {
        document.body.classList.remove('management-mode');
        clearCheckboxesFromRows();
        selectedIds.clear();
        updateCountLabel();
        if (typeof window.navbarUpdateMgmtIcon === 'function') {
            window.navbarUpdateMgmtIcon();
        }
    }

    function getSelectedPaths() {
        const paths = [];
        for (const id of selectedIds) {
            const row = getRowForId(id);
            const p = buildSourcePathForRow(row);
            if (p) paths.push(p);
        }
        return paths;
    }

    // ── Bulk Move ──

    async function bulkMove() {
        const paths = getSelectedPaths();
        if (paths.length === 0) {
            alert('Bitte zuerst Elemente auswählen.');
            return;
        }
        if (typeof openMovePicker !== 'function') {
            alert('Move picker not available.');
            return;
        }
        openMovePicker(paths, async (destinationPath) => {
            await callBulkMove(paths, destinationPath);
        });
    }

    async function callBulkMove(paths, destinationPath) {
        const json = await postJson('/api/bulkMove', {
            sources: paths,
            destination_path: destinationPath,
        });
        if (json.status === 'locked' && typeof withFolderUnlock === 'function') {
            withFolderUnlock(json.folder_id, '/' + json.folder_id,
                () => callBulkMove(paths, destinationPath));
            return;
        }
        if (json.status !== 'ok') {
            alert('Fehler: ' + json.status);
            return;
        }
        if (json.errors && json.errors.length) {
            alert(`Verschoben: ${json.moved}. Fehler: ${json.errors.length}.`);
        }
        window.location.reload();
    }

    // ── Bulk Delete (move to trash) ──

    async function bulkDelete() {
        const paths = getSelectedPaths();
        if (paths.length === 0) {
            alert('Bitte zuerst Elemente auswählen.');
            return;
        }
        const ok = window.confirm(`${paths.length} Elemente in den Papierkorb verschieben?`);
        if (!ok) return;
        await callBulkDelete(paths);
    }

    async function callBulkDelete(paths) {
        const json = await postJson('/api/bulkDelete', { paths: paths });
        if (json.status === 'locked' && typeof withFolderUnlock === 'function') {
            withFolderUnlock(json.folder_id, '/' + json.folder_id,
                () => callBulkDelete(paths));
            return;
        }
        if (json.status !== 'ok') {
            alert('Fehler: ' + json.status);
            return;
        }
        if (json.errors && json.errors.length) {
            alert(`In Papierkorb: ${json.deleted}. Fehler: ${json.errors.length}.`);
        }
        window.location.reload();
    }

    // ── Bulk Pack Into New Folder ──

    function bulkPackIntoNewFolder() {
        const paths = getSelectedPaths();
        if (paths.length === 0) {
            alert('Bitte zuerst Elemente auswählen.');
            return;
        }
        // Open the dedicated name modal
        const modal = document.getElementById('pack-folder-modal');
        const bg = document.getElementById('bg-blur');
        const input = document.getElementById('pack-folder-name');
        input.value = '';
        bg.style.zIndex = '2';
        bg.style.opacity = '0.1';
        modal.style.zIndex = '3';
        modal.style.opacity = '1';
        setTimeout(() => input.focus(), 200);

        // Store the paths on the modal for the confirm handler
        modal.setAttribute('data-paths', JSON.stringify(paths));
    }

    function closePackModal() {
        const modal = document.getElementById('pack-folder-modal');
        const bg = document.getElementById('bg-blur');
        bg.style.opacity = '0';
        setTimeout(() => { bg.style.zIndex = '-1'; }, 300);
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.zIndex = '-1'; }, 300);
    }

    async function callBulkPack(paths, name, parentPath) {
        const json = await postJson('/api/bulkPackIntoNewFolder', {
            paths: paths,
            new_folder_name: name,
            parent_path: parentPath,
        });
        if (json.status === 'locked' && typeof withFolderUnlock === 'function') {
            withFolderUnlock(json.folder_id, '/' + json.folder_id,
                () => callBulkPack(paths, name, parentPath));
            return;
        }
        if (json.status !== 'ok') {
            alert('Fehler: ' + json.status);
            return;
        }
        if (json.errors && json.errors.length) {
            alert(`Eingepackt: ${json.moved}. Fehler: ${json.errors.length}.`);
        }
        window.location.reload();
    }

    // ── Wire-up DOM ──

    function init() {
        const moveBtn = document.getElementById('mgmt-move-btn');
        const deleteBtn = document.getElementById('mgmt-delete-btn');
        const packBtn = document.getElementById('mgmt-pack-btn');
        const cancelBtn = document.getElementById('mgmt-cancel-btn');
        if (moveBtn) moveBtn.addEventListener('click', bulkMove);
        if (deleteBtn) deleteBtn.addEventListener('click', bulkDelete);
        if (packBtn) packBtn.addEventListener('click', bulkPackIntoNewFolder);
        if (cancelBtn) cancelBtn.addEventListener('click', exitMgmtMode);

        const packCancel = document.getElementById('pack-folder-cancel');
        const packConfirm = document.getElementById('pack-folder-confirm');
        if (packCancel) packCancel.addEventListener('click', closePackModal);
        if (packConfirm) {
            packConfirm.addEventListener('click', async () => {
                const modal = document.getElementById('pack-folder-modal');
                const input = document.getElementById('pack-folder-name');
                const name = (input.value || '').trim();
                if (!name) { alert('Name darf nicht leer sein.'); return; }
                const pathsRaw = modal.getAttribute('data-paths') || '[]';
                let paths = [];
                try { paths = JSON.parse(pathsRaw); } catch (e) {}
                closePackModal();
                await callBulkPack(paths, name, getCurrentPath());
            });
        }
        // Enter to confirm
        const packInput = document.getElementById('pack-folder-name');
        if (packInput) {
            packInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (packConfirm) packConfirm.click();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API
    window.enterMgmtMode = enterMgmtMode;
    window.exitMgmtMode = exitMgmtMode;
    window.decorateRowsWithCheckboxes = decorateRowsWithCheckboxes;
})();
