// YT-DLP URL Import

document.getElementById('ytdlp-url-import-btn').addEventListener('click', openYtdlpModal);

function openYtdlpModal() {
    document.getElementById('ytdlp-url-input').value = '';
    document.getElementById('ytdlp-progress-area').style.display = 'none';
    document.getElementById('ytdlp-error-text').style.display = 'none';
    document.getElementById('ytdlp-error-text').textContent = '';
    document.getElementById('ytdlp-import-btn').disabled = false;
    document.getElementById('ytdlp-progress-bar').style.width = '0%';
    document.getElementById('ytdlp-status-text').textContent = 'Wird heruntergeladen...';

    document.getElementById('bg-blur').style.zIndex = '2';
    document.getElementById('bg-blur').style.opacity = '0.1';
    document.getElementById('ytdlp-import-modal').style.zIndex = '3';
    document.getElementById('ytdlp-import-modal').style.opacity = '1';

    setTimeout(() => {
        document.getElementById('ytdlp-url-input').focus();
    }, 300);
}

function closeYtdlpModal() {
    document.getElementById('bg-blur').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('bg-blur').style.zIndex = '-1';
    }, 300);
    document.getElementById('ytdlp-import-modal').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('ytdlp-import-modal').style.zIndex = '-1';
    }, 300);
}

document.getElementById('ytdlp-cancel-btn').addEventListener('click', closeYtdlpModal);

document.getElementById('ytdlp-import-btn').addEventListener('click', async () => {
    const url = document.getElementById('ytdlp-url-input').value.trim();
    if (!url) {
        showYtdlpError('Bitte eine URL eingeben.');
        return;
    }

    document.getElementById('ytdlp-import-btn').disabled = true;
    document.getElementById('ytdlp-error-text').style.display = 'none';
    document.getElementById('ytdlp-progress-area').style.display = 'flex';
    document.getElementById('ytdlp-status-text').textContent = 'Wird vorbereitet...';

    try {
        const response = await postJson('/api/ytdlp-import', {
            url: url,
            path: getCurrentPath()
        });

        if (response.status !== 'ok') {
            showYtdlpError(response.status || 'Fehler beim Starten des Imports.');
            return;
        }

        pollYtdlpProgress(response.id);

    } catch (e) {
        showYtdlpError('Verbindungsfehler: ' + e.message);
    }
});

function showYtdlpError(msg) {
    document.getElementById('ytdlp-import-btn').disabled = false;
    document.getElementById('ytdlp-progress-area').style.display = 'none';
    document.getElementById('ytdlp-error-text').textContent = msg;
    document.getElementById('ytdlp-error-text').style.display = 'block';
}

function pollYtdlpProgress(id) {
    const interval = setInterval(async () => {
        try {
            const response = await postJson('/api/ytdlp-import-progress', { id });
            if (response.status !== 'ok') return;

            const data = response.data;
            const phase = data[0];

            if (phase === 'downloading') {
                const current = data[1] || 0;
                const total = data[2] || 0;
                document.getElementById('ytdlp-status-text').textContent = total > 0
                    ? `Wird heruntergeladen... ${ytdlpFmtBytes(current)} / ${ytdlpFmtBytes(total)}`
                    : 'Wird heruntergeladen...';
                if (total > 0) {
                    document.getElementById('ytdlp-progress-bar').style.width =
                        Math.min((current / total) * 100, 100) + '%';
                }

            } else if (phase === 'processing') {
                document.getElementById('ytdlp-status-text').textContent = 'Wird verarbeitet...';
                document.getElementById('ytdlp-progress-bar').style.width = '0%';

            } else if (phase === 'uploading' || phase === 'running') {
                const current = data[1] || 0;
                const total = data[2] || 0;
                document.getElementById('ytdlp-status-text').textContent = total > 0
                    ? `Wird hochgeladen... ${ytdlpFmtBytes(current)} / ${ytdlpFmtBytes(total)}`
                    : 'Wird hochgeladen...';
                if (total > 0) {
                    document.getElementById('ytdlp-progress-bar').style.width =
                        Math.min((current / total) * 100, 100) + '%';
                }

            } else if (phase === 'completed') {
                clearInterval(interval);
                document.getElementById('ytdlp-status-text').textContent = 'Erfolgreich importiert!';
                document.getElementById('ytdlp-progress-bar').style.width = '100%';
                setTimeout(() => {
                    closeYtdlpModal();
                    window.location.reload();
                }, 1500);

            } else if (phase === 'error') {
                clearInterval(interval);
                showYtdlpError('Fehler: ' + (data[1] || 'Unbekannter Fehler'));
            }
        } catch (_) {
            // Network hiccup — keep polling
        }
    }, 2000);
}

function ytdlpFmtBytes(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}
