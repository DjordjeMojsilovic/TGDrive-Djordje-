// Handling New Button On Sidebar Click
const isTrash = getCurrentPath().startsWith('/trash')
const isSearch = getCurrentPath().startsWith('/search')
const isShare = getCurrentPath().startsWith('/share')

if (!isTrash && !isSearch) {
    document.getElementById('new-button').addEventListener('click', () => {
        document.getElementById('new-upload').style.zIndex = '1'
        document.getElementById('new-upload').style.opacity = '1'
        document.getElementById('new-upload').style.top = '80px'
        document.getElementById('new-upload-focus').focus()
    });
}
else {
    document.getElementById('new-button').style.display = 'none'
}

if (isShare) {
    document.getElementById('new-button').style.display = 'none'
    const sections = document.querySelector('.sidebar-menu').getElementsByTagName('a')
    sections[1].remove()
}

// New File Upload Start

function closeNewUploadFocus() {
    setTimeout(() => {
        document.getElementById('new-upload').style.opacity = '0'
        document.getElementById('new-upload').style.top = '40px'
        setTimeout(() => {
            document.getElementById('new-upload').style.zIndex = '-1'
        }, 300)
    }, 200)
}
document.getElementById('new-upload-focus').addEventListener('blur', closeNewUploadFocus);
document.getElementById('new-upload-focus').addEventListener('focusout', closeNewUploadFocus);

document.getElementById('file-upload-btn').addEventListener('click', () => {
    document.getElementById('fileInput').click()
});

// New File Upload End

// New Folder Start

function _resetNewFolderModal() {
    document.getElementById('new-folder-name').value = '';
    document.getElementById('folder-lock-check').checked = false;
    const pwField = document.getElementById('folder-lock-password');
    pwField.value = '';
    pwField.style.display = 'none';
}

document.getElementById('new-folder-btn').addEventListener('click', () => {
    _resetNewFolderModal();
    document.getElementById('bg-blur').style.zIndex = '2';
    document.getElementById('bg-blur').style.opacity = '0.1';
    document.getElementById('create-new-folder').style.zIndex = '3';
    document.getElementById('create-new-folder').style.opacity = '1';
    setTimeout(() => {
        document.getElementById('new-folder-name').focus();
    }, 300);
});

document.getElementById('new-folder-cancel').addEventListener('click', () => {
    _resetNewFolderModal();
    document.getElementById('bg-blur').style.opacity = '0';
    setTimeout(() => { document.getElementById('bg-blur').style.zIndex = '-1'; }, 300);
    document.getElementById('create-new-folder').style.opacity = '0';
    setTimeout(() => { document.getElementById('create-new-folder').style.zIndex = '-1'; }, 300);
});

// Toggle password field when lock checkbox changes
document.getElementById('folder-lock-check').addEventListener('change', function () {
    const pwField = document.getElementById('folder-lock-password');
    if (this.checked) {
        pwField.style.display = 'block';
        setTimeout(() => pwField.focus(), 50);
    } else {
        pwField.style.display = 'none';
        pwField.value = '';
    }
});

// New folder create — handle optional password hash
document.getElementById('new-folder-create').addEventListener('click', async function () {
    const folderName = document.getElementById('new-folder-name').value;
    const path = getCurrentPath();
    if (path === 'redirect') return;

    if (folderName.length === 0) {
        alert('Folder Name Cannot Be Empty');
        return;
    }

    const lockCheck = document.getElementById('folder-lock-check');
    const lockPw = document.getElementById('folder-lock-password').value;

    let passwordHash = null;
    if (lockCheck.checked) {
        if (!lockPw) {
            alert('Bitte ein Passwort eingeben oder die Sperre deaktivieren.');
            return;
        }
        // Compute SHA-256 of the password
        const msgBuffer = new TextEncoder().encode(lockPw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const bodyData = {
        name: folderName,
        path: path,
        password: getPassword()
    };
    if (passwordHash) {
        bodyData.password_hash = passwordHash;
    }

    try {
        const response = await fetch('/api/createNewFolder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const json = await response.json();
        if (json.status === 'ok') {
            window.location.reload();
        } else {
            alert(json.status);
        }
    } catch (err) {
        alert('Error Creating Folder');
    }
});

// New Folder End

// New Url Upload Start

document.getElementById('url-upload-btn').addEventListener('click', () => {
    document.getElementById('remote-url').value = '';
    document.getElementById('bg-blur').style.zIndex = '2';
    document.getElementById('bg-blur').style.opacity = '0.1';

    document.getElementById('new-url-upload').style.zIndex = '3';
    document.getElementById('new-url-upload').style.opacity = '1';
    setTimeout(() => {
        document.getElementById('remote-url').focus();
    }, 300)
})

document.getElementById('remote-cancel').addEventListener('click', () => {
    document.getElementById('remote-url').value = '';
    document.getElementById('bg-blur').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('bg-blur').style.zIndex = '-1';
    }, 300)
    document.getElementById('new-url-upload').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('new-url-upload').style.zIndex = '-1';
    }, 300)
});

document.getElementById('remote-start').addEventListener('click', Start_URL_Upload);

// New Url Upload End