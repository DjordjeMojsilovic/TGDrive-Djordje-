function showDirectory(data) {
    data = data['contents']
    document.getElementById('directory-data').innerHTML = ''
    const isTrash = getCurrentPath().startsWith('/trash')

    let html = ''

    let entries = Object.entries(data);
    let folders = entries.filter(([key, value]) => value.type === 'folder');
    let files = entries.filter(([key, value]) => value.type === 'file');

    folders.sort((a, b) => new Date(b[1].upload_date) - new Date(a[1].upload_date));
    files.sort((a, b) => new Date(b[1].upload_date) - new Date(a[1].upload_date));

    for (const [key, item] of folders) {
        if (item.type === 'folder') {
            const isLocked = item.has_password && !isFolderUnlocked(item.id);
            const lockBadge = isLocked ? '<span class="lock-badge">🔒</span>' : '';
            html += `<tr data-path="${item.path}" data-id="${item.id}" data-name="${item.name}" data-has-password="${item.has_password ? 'true' : 'false'}" data-locked="${isLocked ? 'true' : 'false'}" class="body-tr folder-tr"><td><div class="td-align"><span class="folder-icon-wrapper"><span class="material-icons folder-icon">folder</span>${lockBadge}</span>${item.name}</div></td><td><div class="td-align"></div></td><td><div class="td-align"><a data-id="${item.id}" class="more-btn"><span class="material-icons">more_vert</span></a></div></td></tr>`

            if (isTrash) {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="restore-${item.id}" data-path="${item.path}"><span class="material-icons">restore</span> Restore</div><hr><div id="delete-${item.id}" data-path="${item.path}"><span class="material-icons">delete</span> Delete</div></div>`
            }
            else {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="rename-${item.id}"><span class="material-icons">edit</span> Rename</div><hr><div id="trash-${item.id}"><span class="material-icons">delete</span> Trash</div><hr><div id="folder-share-${item.id}"><span class="material-icons">share</span> Share</div></div>`
            }
        }
    }

    for (const [key, item] of files) {
        if (item.type === 'file') {
            const size = convertBytes(item.size)
            html += `<tr data-path="${item.path}" data-id="${item.id}" data-name="${item.name}" class="body-tr file-tr"><td><div class="td-align"><span class="material-icons file-icon">insert_drive_file</span>${item.name}</div></td><td><div class="td-align">${size}</div></td><td><div class="td-align"><a data-id="${item.id}" class="more-btn"><span class="material-icons">more_vert</span></a></div></td></tr>`

            if (isTrash) {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="restore-${item.id}" data-path="${item.path}"><span class="material-icons">restore</span> Restore</div><hr><div id="delete-${item.id}" data-path="${item.path}"><span class="material-icons">delete</span> Delete</div></div>`
            }
            else {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="rename-${item.id}"><span class="material-icons">edit</span> Rename</div><hr><div id="trash-${item.id}"><span class="material-icons">delete</span> Trash</div><hr><div id="share-${item.id}"><span class="material-icons">share</span> Share</div></div>`
            }
        }
    }
    document.getElementById('directory-data').innerHTML = html

    if (!isTrash) {
        document.querySelectorAll('.folder-tr').forEach(row => {
            const isLockedAttr = row.getAttribute('data-locked') === 'true';
            if (isLockedAttr) {
                row.ondblclick = function () {
                    const folderId = this.getAttribute('data-id');
                    const folderPath = (this.getAttribute('data-path') + this.getAttribute('data-id')).replaceAll('//', '/');
                    showFolderPasswordModal(folderId, folderPath, function (id) {
                        // On success: navigate into the folder
                        openFolder.call(row);
                    });
                };
            } else {
                row.ondblclick = openFolder;
            }
        });
        document.querySelectorAll('.file-tr').forEach(div => {
            div.ondblclick = openFile;
        });
    }

    document.querySelectorAll('.more-btn').forEach(div => {
        div.addEventListener('click', function (event) {
            event.preventDefault();
            openMoreButton(div)
        });
    });

    initDragDrop();
}

document.getElementById('search-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = document.getElementById('file-search').value;
    console.log(query)
    if (query === '') {
        alert('Search field is empty');
        return;
    }
    const path = '/?path=/search_' + encodeURI(query);
    console.log(path)
    window.location = path;
});

// Loading Main Page

document.addEventListener('DOMContentLoaded', function () {
    const inputs = ['new-folder-name', 'rename-name', 'file-search']
    for (let i = 0; i < inputs.length; i++) {
        document.getElementById(inputs[i]).addEventListener('input', validateInput);
    }

    if (getCurrentPath().includes('/share_')) {
        getCurrentDirectory()
    } else {
        if (getPassword() === null) {
            document.getElementById('bg-blur').style.zIndex = '2';
            document.getElementById('bg-blur').style.opacity = '0.1';

            document.getElementById('get-password').style.zIndex = '3';
            document.getElementById('get-password').style.opacity = '1';
        } else {
            getCurrentDirectory()
        }
    }
});
