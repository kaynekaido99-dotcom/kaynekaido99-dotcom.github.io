/*!
 * project-modal.js — opens a project card as a modal with pictures + a video.
 *
 * Add  data-project-modal="payment-history"  to any card <a>; the card's own
 * href stays as the fallback (middle-click / no JavaScript open it normally).
 * Edit the PROJECTS list below to change the pictures / video.
 */
(function () {
    'use strict';

    /* ================= EDIT HERE ================= */
    const PROJECTS = {
        'payment-history': {
            label: 'Project',
            title: 'Payment History',
            subtitle: "Myra's Laundry Shop",
            items: [
                { type: 'image', src: 'Photos/Blured.jpg', title: 'Payment History', caption: 'Payment history screen app' },
                { type: 'image', src: 'Photos/Landing.jpg', title: 'Landing Page' },
                { type: 'image', src: 'Photos/Login.jpg', title: 'Login' },
                // Video: use the full file name (e.g. 'Videos/payment.mp4'). If you give the path WITHOUT an
                // extension, .mp4 / .webm / .mov / .m4v are tried in that order. 'poster' is optional;
                // without it, <same path>.jpg/.jpeg/.png/.webp is used when it exists.
                { type: 'video', src: 'VideoThumbnails/Payment History.mp4', title: 'Payment History Demo', caption: 'Screen recording', poster: '' }
            ]
        }
    };
    /* ============================================= */

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const html = document.documentElement;
    const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v'];
    const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
    const extOf = (s) => (s.match(/\.([a-z0-9]+)$/i) || [])[1] || '';
    const stripExt = (s) => s.replace(/\.[a-z0-9]+$/i, '');

    let ui = null;          // built lazily on first open
    let current = null;     // { key, project, index, trigger }
    let closeTimer = 0;
    let swipe = null;
    const posterCache = new Map();

    /* ---------- helpers ---------- */
    function videoSources(item) {
        const e = extOf(item.src).toLowerCase();
        return VIDEO_EXTS.includes(e) ? [item.src] : VIDEO_EXTS.map((x) => item.src + '.' + x);
    }

    function probeImage(urls) {
        return new Promise((resolve) => {
            let i = 0;
            (function next() {
                if (i >= urls.length) return resolve('');
                const im = new Image();
                im.onload = () => resolve(urls[i]);
                im.onerror = () => { i++; next(); };
                im.src = urls[i];
            })();
        });
    }

    function posterFor(item) {
        if (item.poster) return Promise.resolve(item.poster);
        if (!posterCache.has(item)) {
            const base = VIDEO_EXTS.includes(extOf(item.src).toLowerCase()) ? stripExt(item.src) : item.src;
            posterCache.set(item, probeImage(IMG_EXTS.map((x) => base + '.' + x)));
        }
        return posterCache.get(item);
    }

    function el(tag, cls, attrs) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
        return n;
    }

    /* ---------- build the modal once ---------- */
    function build() {
        const overlay = el('div', 'pm-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pm-title' });
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="pm-panel" tabindex="-1">' +
            '  <div class="pm-head">' +
            '    <div style="min-width:0">' +
            '      <p class="pm-label"></p>' +
            '      <h2 class="pm-title" id="pm-title"></h2>' +
            '      <p class="pm-sub"></p>' +
            '    </div>' +
            '    <button type="button" class="pm-close" aria-label="Close">&times;</button>' +
            '  </div>' +
            '  <div class="pm-stage">' +
            '    <div class="pm-media" aria-live="polite"></div>' +
            '    <button type="button" class="pm-nav pm-prev" aria-label="Previous">&lsaquo;</button>' +
            '    <button type="button" class="pm-nav pm-next" aria-label="Next">&rsaquo;</button>' +
            '  </div>' +
            '  <div class="pm-info">' +
            '    <span class="pm-caption"></span>' +
            '    <span class="pm-meta"><span class="pm-count"></span>' +
            '      <a class="pm-open" target="_blank" rel="noopener noreferrer">Open &nearrow;</a></span>' +
            '  </div>' +
            '  <div class="pm-thumbs" role="tablist" aria-label="Project media"></div>' +
            '</div>';
        document.body.appendChild(overlay);

        ui = {
            overlay,
            panel: overlay.querySelector('.pm-panel'),
            label: overlay.querySelector('.pm-label'),
            title: overlay.querySelector('.pm-title'),
            sub: overlay.querySelector('.pm-sub'),
            close: overlay.querySelector('.pm-close'),
            stage: overlay.querySelector('.pm-stage'),
            media: overlay.querySelector('.pm-media'),
            prev: overlay.querySelector('.pm-prev'),
            next: overlay.querySelector('.pm-next'),
            caption: overlay.querySelector('.pm-caption'),
            count: overlay.querySelector('.pm-count'),
            open: overlay.querySelector('.pm-open'),
            thumbs: overlay.querySelector('.pm-thumbs')
        };

        ui.close.addEventListener('click', close);
        ui.prev.addEventListener('click', () => go(-1));
        ui.next.addEventListener('click', () => go(1));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', onKey);

        // swipe left / right on the stage (touch + pen)
        ui.stage.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' || e.target.closest('video')) return;
            swipe = { x: e.clientX, y: e.clientY };
        });
        ui.stage.addEventListener('pointerup', (e) => {
            if (!swipe) return;
            const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
            swipe = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        });
        ui.stage.addEventListener('pointercancel', () => { swipe = null; });
    }

    /* ---------- thumbnails ---------- */
    function buildThumbs(project) {
        ui.thumbs.textContent = '';
        project.items.forEach((item, i) => {
            const b = el('button', 'pm-thumb', {
                type: 'button', role: 'tab', 'aria-selected': 'false',
                'aria-label': (item.type === 'video' ? 'Video: ' : 'Photo: ') + (item.title || i + 1)
            });
            if (item.type === 'image') {
                const im = el('img', '', { src: item.src, alt: '', loading: 'lazy', decoding: 'async' });
                b.appendChild(im);
            } else {
                b.appendChild(el('span', 'pm-thumb-play')).textContent = '\u25B6';
                b.appendChild(el('span', 'pm-thumb-tag')).textContent = 'VIDEO';
                posterFor(item).then((url) => { if (url) b.style.backgroundImage = 'url("' + encodeURI(url) + '")'; });
            }
            b.addEventListener('click', () => show(i));
            ui.thumbs.appendChild(b);
        });
    }

    /* ---------- show one item ---------- */
    function stopVideo() {
        const v = ui.media.querySelector('video');
        if (v) { v.pause(); v.removeAttribute('src'); v.querySelectorAll('source').forEach((s) => s.remove()); v.load(); }
    }

    function message(html) {
        const m = el('div', 'pm-msg');
        m.innerHTML = html;
        ui.media.appendChild(m);
    }

    function show(i) {
        const project = current.project;
        const n = project.items.length;
        i = (i + n) % n;
        current.index = i;
        const item = project.items[i];

        stopVideo();
        ui.media.textContent = '';

        if (item.type === 'image') {
            const sk = el('div', 'pm-skeleton');
            const img = el('img', '', { alt: item.title || '', decoding: 'async' });
            img.addEventListener('load', () => { img.classList.add('pm-loaded'); sk.remove(); });
            img.addEventListener('error', () => {
                sk.remove(); img.remove();
                message('<strong>Image not found</strong><span>' + item.src + '</span>');
            });
            ui.media.append(sk, img);
            img.src = item.src;
            ui.open.href = item.src;
            ui.open.hidden = false;
        } else {
            const srcs = videoSources(item);
            const v = el('video', '', { controls: '', playsinline: '', preload: 'metadata' });
            const failed = () => {
                if (current && current.project.items[current.index] !== item) return;
                v.remove();
                message('<strong>Video not found</strong><span>Looked for: ' + item.src +
                    (VIDEO_EXTS.includes(extOf(item.src).toLowerCase()) ? '' : '.mp4 / .webm / .mov / .m4v') +
                    '</span><span>Set the exact file name in project-modal.js</span>');
            };
            srcs.forEach((s, k) => {
                const so = el('source');
                so.src = s;
                if (k === srcs.length - 1) so.addEventListener('error', failed);
                v.appendChild(so);
            });
            v.addEventListener('error', failed);
            v.addEventListener('loadedmetadata', () => { ui.open.href = v.currentSrc || srcs[0]; });
            ui.open.href = srcs[0];
            ui.open.hidden = false;
            posterFor(item).then((url) => { if (url && v.isConnected) v.poster = url; });
            ui.media.appendChild(v);
        }

        ui.caption.textContent = item.caption || item.title || '';
        ui.count.textContent = (i + 1) + ' / ' + n;
        Array.from(ui.thumbs.children).forEach((t, k) => {
            const on = k === i;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) t.scrollIntoView({ block: 'nearest', inline: 'center' });
        });

        // warm up the neighbouring pictures
        [i - 1, i + 1].forEach((k) => {
            const nb = project.items[(k + n) % n];
            if (nb && nb.type === 'image') new Image().src = nb.src;
        });
    }

    const go = (d) => { if (current) show(current.index + d); };

    /* ---------- open / close ---------- */
    function open(key, trigger) {
        const project = PROJECTS[key];
        if (!project) return false;
        if (!ui) build();
        clearTimeout(closeTimer);

        current = { key, project, index: 0, trigger };
        ui.label.textContent = project.label || 'Project';
        ui.title.textContent = project.title;
        ui.sub.textContent = project.subtitle || '';
        ui.sub.hidden = !project.subtitle;
        ui.overlay.classList.toggle('pm-single', project.items.length < 2);
        buildThumbs(project);

        const sbw = window.innerWidth - html.clientWidth; // keep the layout from jumping when the scrollbar goes
        html.classList.add('pm-lock');
        if (sbw > 0) html.style.paddingRight = sbw + 'px';

        ui.overlay.hidden = false;
        show(0);
        requestAnimationFrame(() => {
            ui.overlay.classList.add('pm-show');
            ui.close.focus({ preventScroll: true });
        });
        return true;
    }

    function close() {
        if (!current) return;
        const trigger = current.trigger;
        current = null;
        stopVideo();
        ui.overlay.classList.remove('pm-show');
        const done = () => {
            ui.overlay.hidden = true;
            ui.media.textContent = '';
            html.classList.remove('pm-lock');
            html.style.paddingRight = '';
            if (trigger && trigger.focus) trigger.focus({ preventScroll: true });
        };
        if (reduce) done(); else closeTimer = setTimeout(done, 200);
    }

    /* ---------- keyboard: Esc, arrows, focus trap ---------- */
    function onKey(e) {
        if (!current) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        const inVideo = document.activeElement && document.activeElement.tagName === 'VIDEO';
        if (!inVideo && e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
        if (!inVideo && e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
        if (e.key === 'Tab') {
            const f = Array.from(ui.overlay.querySelectorAll('button, a[href], video[controls]'))
                .filter((x) => !x.hidden && x.offsetParent !== null);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (!ui.overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    /* ---------- wire up the cards ---------- */
    document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('[data-project-modal]');
        if (!a || e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" work
        if (open(a.getAttribute('data-project-modal'), a)) e.preventDefault();
    });

    window.ProjectModal = { open, close, projects: PROJECTS };
})();
