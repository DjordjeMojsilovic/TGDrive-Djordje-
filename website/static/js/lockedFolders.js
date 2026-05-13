// Locked Folders feature for Djordje Drive

// ── Session-level unlock tracking ──

function isFolderUnlocked(folderId) {
    return sessionStorage.getItem('unlocked_' + folderId) === '1';
}

function markFolderUnlocked(folderId) {
    sessionStorage.setItem('unlocked_' + folderId, '1');
}

// ── SHA-256 hash helper ──

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Folder password modal ──

let _pwdModalSuccessCallback = null;
let _pwdModalFolderId = null;

function showFolderPasswordModal(folderId, folderPath, onSuccess) {
    _pwdModalSuccessCallback = onSuccess;
    _pwdModalFolderId = folderId;

    document.getElementById('folder-password-input').value = '';
    document.getElementById('folder-password-error').textContent = '';
    document.getElementById('folder-password-error').style.display = 'none';

    // Store path for the API call
    document.getElementById('folder-password-modal').setAttribute('data-path', folderPath);

    document.getElementById('bg-blur').style.zIndex = '2';
    document.getElementById('bg-blur').style.opacity = '0.1';
    document.getElementById('folder-password-modal').style.zIndex = '3';
    document.getElementById('folder-password-modal').style.opacity = '1';

    setTimeout(() => document.getElementById('folder-password-input').focus(), 300);
}

function closeFolderPasswordModal() {
    document.getElementById('bg-blur').style.opacity = '0';
    setTimeout(() => { document.getElementById('bg-blur').style.zIndex = '-1'; }, 300);
    document.getElementById('folder-password-modal').style.opacity = '0';
    setTimeout(() => { document.getElementById('folder-password-modal').style.zIndex = '-1'; }, 300);
}

document.getElementById('folder-password-cancel').addEventListener('click', closeFolderPasswordModal);

async function confirmFolderPassword() {
    const pw = document.getElementById('folder-password-input').value;
    const errorEl = document.getElementById('folder-password-error');

    if (!pw) {
        errorEl.textContent = 'Bitte ein Passwort eingeben.';
        errorEl.style.display = 'block';
        return;
    }

    const hash = await sha256(pw);
    const folderPath = document.getElementById('folder-password-modal').getAttribute('data-path');

    try {
        const res = await fetch('/api/checkFolderPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: folderPath, password_hash: hash })
        });
        const json = await res.json();

        if (json.status === 'ok') {
            markFolderUnlocked(_pwdModalFolderId);
            closeFolderPasswordModal();
            if (_pwdModalSuccessCallback) {
                _pwdModalSuccessCallback(_pwdModalFolderId);
            }
        } else {
            errorEl.textContent = 'Falsches Passwort.';
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = 'Verbindungsfehler.';
        errorEl.style.display = 'block';
    }
}

document.getElementById('folder-password-confirm').addEventListener('click', confirmFolderPassword);

document.getElementById('folder-password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmFolderPassword();
});
