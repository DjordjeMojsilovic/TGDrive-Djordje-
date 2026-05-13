// Grid view rendering for the directory list.
// Reads localStorage.viewMode ('list' or 'grid'). Called from main.js after
// showDirectory() paints rows, and from navbar.js when the user toggles the
// view button.

(function () {
    'use strict';

    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const VIDEO_EXTS = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'ts', 'ogv'];

    function getExt(name) {
        if (!name) return '';
        const dot = name.lastIndexOf('.');
        if (dot < 0) return '';
        return name.slice(dot + 1).toLowerCase();
    }

    // Single shared IntersectionObserver — re-created each applyViewMode call
    // since rows are replaced when the directory re-renders.
    let _observer = null;

    function ensureObserver() {
        if (_observer) return _observer;
        _observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const realSrc = el.getAttribute('data-src');
                if (!realSrc) {
                    _observer.unobserve(el);
                    return;
                }
                if (el.tagName === 'IMG') {
                    el.src = realSrc;
                } else if (el.tagName === 'VIDEO') {
                    const source = el.querySelector('source');
                    if (source) {
                        source.src = realSrc;
                        try { el.load(); } catch (e) { /* ignore */ }
                    }
                }
                el.removeAttribute('data-src');
                _observer.unobserve(el);
            });
        }, { rootMargin: '200px' });
        return _observer;
    }

    function buildThumb(row) {
        const isFolder = row.classList.contains('folder-tr');
        const name = row.getAttribute('data-name') || '';
        const id = row.getAttribute('data-id') || '';
        const dataPath = row.getAttribute('data-path') || '/';

        const thumb = document.createElement('div');
        thumb.className = 'thumb';

        if (isFolder) {
            const isLocked = row.getAttribute('data-locked') === 'true';
            thumb.innerHTML = '<span class="material-icons folder-icon">folder</span>'
                + (isLocked ? '<span class="lock-badge">🔒</span>' : '');
            return thumb;
        }

        // File
        const ext = getExt(name);
        const filePath = (dataPath.endsWith('/') ? dataPath : dataPath + '/') + id;
        const normalised = filePath.replace(/\/+/g, '/');
        const src = '/file?path=' + normalised;

        if (IMAGE_EXTS.indexOf(ext) >= 0) {
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = name;
            img.setAttribute('data-src', src);
            thumb.appendChild(img);
            ensureObserver().observe(img);
        } else if (VIDEO_EXTS.indexOf(ext) >= 0) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            const source = document.createElement('source');
            // Use #t=0.5 fragment so the browser shows a frame as poster.
            video.setAttribute('data-src', src + '#t=0.5');
            video.appendChild(source);
            thumb.appendChild(video);
            ensureObserver().observe(video);
        } else {
            const ico = document.createElement('span');
            ico.className = 'material-icons';
            ico.textContent = 'insert_drive_file';
            thumb.appendChild(ico);
        }
        return thumb;
    }

    function decorateGridRow(row) {
        // Inside the first <td>, replace the td-align content with the thumb +
        // a name block. We KEEP the original .td-align and just adjust its DOM.
        const firstTd = row.querySelector('td:first-child');
        if (!firstTd) return;
        const align = firstTd.querySelector('.td-align');
        if (!align) return;
        // Don't double-decorate
        if (align.querySelector('.thumb')) return;

        const name = row.getAttribute('data-name') || '';
        align.innerHTML = '';
        align.appendChild(buildThumb(row));
        const nameEl = document.createElement('div');
        nameEl.className = 'grid-name';
        nameEl.textContent = name;
        align.appendChild(nameEl);
    }

    function clearGridDecoration(row) {
        // When switching back to list: nothing to do — main.js re-renders rows
        // from scratch on every navigation. For toggles without navigation,
        // we re-render via the existing showDirectory() pipeline by simply
        // forcing a refresh of the listing.
    }

    function applyViewMode() {
        const mode = localStorage.getItem('viewMode') || 'list';
        const dir = document.querySelector('.directory');
        if (!dir) return;
        if (mode === 'grid') {
            dir.classList.add('grid-view');
            // Disconnect any previous observer — rows were replaced.
            if (_observer) {
                try { _observer.disconnect(); } catch (e) {}
                _observer = null;
            }
            document.querySelectorAll('tr.body-tr').forEach((row) => {
                decorateGridRow(row);
            });
        } else {
            dir.classList.remove('grid-view');
            if (_observer) {
                try { _observer.disconnect(); } catch (e) {}
                _observer = null;
            }
            // Best-effort revert: trigger a re-render via getCurrentDirectory
            // if available — keeps list rows consistent.
            if (typeof getCurrentDirectory === 'function') {
                try { getCurrentDirectory(); } catch (e) { /* ignore */ }
            }
        }
    }

    // Expose globally
    window.applyViewMode = applyViewMode;
})();
