/* Video gallery — vanilla JS. Data lives in VIDEOS below. */
(function () {
    'use strict';

    /* ------------------------------------------------------------------
       1. DATA
       Add a video by pasting its normal URL (YouTube watch / youtu.be /
       shorts / embed, or Facebook reel / watch / video). You can also paste a
       full <iframe ...> snippet into `url`; the src is extracted for you.
       Optional: thumbnail, duration ("3:45"), orientation ("portrait" | "landscape").
       YouTube thumbnails are generated automatically; Facebook previews are stored locally.
       ------------------------------------------------------------------ */
    const VIDEOS = [
        {
            title: 'Fast Edit. Pixels and precision',
            description: '',
            category: 'Content',
            tags: ['designinspo'],
            url: 'https://www.facebook.com/reel/1521173076246654/',
            thumbnail: 'VideoThumbnails/1521173076246654.avif'
        },
        {
            title: 'Happy Birthday itay Poli 🎂',
            description: '',
            category: 'Content',
            tags: ['birthday'],
            url: 'https://www.facebook.com/reel/1296162862678409/',
            thumbnail: 'VideoThumbnails/1296162862678409.jpg'
        },
        {
            title: 'From terminal setup to full gesture control. 💻🔥 Gesture 3D Particles System',
            description: 'Gesture-controlled 3D particle system, built from a bare terminal setup.',
            category: 'Content',
            tags: ['VibeCoders', 'BlockboxCLI', 'BlackboxAI', 'VSc'],
            url: 'https://www.facebook.com/reel/1035400622485143/',
            thumbnail: 'VideoThumbnails/1035400622485143.jpg'
        },
        {
            title: "Web application interface design for Myra's Laundry Shop is officially locked in 🍳🌐🔥 (Part 1)",
            description: '2 weeks in progress. UX/UI design.',
            category: 'Content',
            tags: ['UX/UI Design'],
            url: 'https://www.facebook.com/reel/929360400131941/',
            thumbnail: 'VideoThumbnails/929360400131941.jpg'
        },
        {
            title: 'manual updates ❎️ automation update ✅️',
            description: 'Vanilla JS function.',
            category: 'Content',
            tags: ['Vanilla JS'],
            url: 'https://www.facebook.com/reel/2513146219199860/',
            thumbnail: 'VideoThumbnails/2513146219199860.jpg'
        },
        {
            title: 'Testing AI Design Hack',
            description: '',
            category: 'Facebook',
            tags: ['gemini', 'canva', 'SunoAI'],
            url: 'https://www.facebook.com/reel/2110659696502803/',
            thumbnail: 'VideoThumbnails/2110659696502803.jpg',
            orientation: 'landscape'
        },
        {
            title: '💳 Testing Payment Gateway Integration | Xendit 🚀',
            description: '',
            category: 'Content',
            tags: ['vscode', 'ffmpeg', 'Xendit'],
            url: 'https://www.facebook.com/reel/1016996078127323/',
            thumbnail: 'VideoThumbnails/1016996078127323.jpg',
            orientation: 'landscape'
        },
        {
            title: 'Updating Windows (25H2, updated Feb 2026) using Google Remote Desktop on an Android phone 📱',
            description: 'Google Remote Desktop, Windows 11 25H2.',
            category: 'YouTube',
            tags: ['Google Remote Desktop', 'Windows 11'],
            url: 'https://www.youtube.com/embed/793uH68oMsc'
        },
        {
            title: 'Creating a basic calculator using HTML, CSS and JavaScript with GitHub Copilot',
            description: '',
            category: 'YouTube',
            tags: ['HTML', 'CSS', 'JavaScript', 'GitHub Copilot'],
            url: 'https://www.youtube.com/embed/DHNpOnAHVrQ'
        },
        {
            title: 'How does a comment section work? (Comment section function)',
            description: 'A custom development with full control over the HTTP POST request.',
            category: 'YouTube',
            tags: ['HTTP POST', 'Custom development'],
            url: 'https://www.youtube.com/embed/C9Iw8T9rLkI'
        }
    ];

    /* ------------------------------------------------------------------
       2. PARSING: any URL / iframe  ->  { platform, id, embedUrl, watchUrl, thumbnail, orientation }
       ------------------------------------------------------------------ */
    const YT_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?(?:[^#]*&)?v=))([\w-]{11})/i;

    function extractSrc(input) {
        const s = String(input || '').trim();
        const m = s.match(/<iframe[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i);
        if (!m) return { src: s, w: 0, h: 0 };
        const num = (name) => {
            const r = s.match(new RegExp('\\s' + name + '\\s*=\\s*["\']?(\\d+)', 'i'));
            return r ? Number(r[1]) : 0;
        };
        return { src: m[1].replace(/&amp;/g, '&'), w: num('width'), h: num('height') };
    }

    function parseMedia(input, forced) {
        const { src, w, h } = extractSrc(input);
        let orientation = forced || (w && h ? (h > w ? 'portrait' : 'landscape') : '');

        const yt = src.match(YT_RE);
        if (yt) {
            const id = yt[1];
            return {
                platform: 'youtube',
                id,
                orientation: orientation || (/\/shorts\//i.test(src) ? 'portrait' : 'landscape'),
                watchUrl: 'https://www.youtube.com/watch?v=' + id,
                thumbnail: 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg',
                embedUrl: 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1'
            };
        }

        if (/(?:^|\/\/|\.)(?:facebook\.com|fb\.watch)\b/i.test(src)) {
            let href = src;
            try {
                const u = new URL(src);
                if (/\/plugins\/video\.php$/i.test(u.pathname) && u.searchParams.get('href')) {
                    href = u.searchParams.get('href'); // already URL-decoded
                }
            } catch (e) { /* keep src */ }
            const idMatch = href.match(/\/(?:reel|videos|watch)\/(?:\?v=)?(\d+)|[?&]v=(\d+)/i);
            orientation = orientation || (/\/reel\//i.test(href) ? 'portrait' : 'landscape');
            const portrait = orientation === 'portrait';
            return {
                platform: 'facebook',
                id: idMatch ? (idMatch[1] || idMatch[2]) : href,
                orientation,
                watchUrl: href,
                thumbnail: '',
                embedUrl: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(href) +
                    '&show_text=false&t=0&autoplay=true&width=' + (portrait ? 360 : 800) + '&height=' + (portrait ? 640 : 450)
            };
        }

        return { platform: 'other', id: src, orientation: orientation || 'landscape', watchUrl: src, thumbnail: '', embedUrl: src };
    }

    const items = VIDEOS.map((v, i) => {
        const m = parseMedia(v.url, v.orientation);
        return Object.assign({
            id: 'v' + i,
            title: 'Untitled',
            description: '',
            category: 'Content',
            tags: [],
            duration: ''
        }, v, m, { thumbnail: v.thumbnail || m.thumbnail });
    });

    /* ------------------------------------------------------------------
       3. HELPERS
       ------------------------------------------------------------------ */
    const $ = (s, c = document) => c.querySelector(s);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const PLATFORM_LABEL = { youtube: 'YouTube', facebook: 'Facebook', other: 'Video' };
    const key = (s) => String(s).trim().toLowerCase();

    function highlight(text, terms) {
        const safe = esc(text);
        if (!terms.length) return safe;
        const re = new RegExp('(' + terms.map((t) => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
        return safe.replace(re, '<mark>$1</mark>');
    }

    const ICON = {
        play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
        youtube: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2C.5 9 .5 12 .5 12s0 3 .5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.8.5-4.8.5-4.8s0-3-.5-4.8zM9.8 15.2V8.8l5.7 3.2-5.7 3.2z"/></svg>',
        facebook: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8c-.3 0-1.3-.2-2.4-.2-2.5 0-4.1 1.5-4.1 4.2v2.7H7.6v3.3h2.8V22h3.1z"/></svg>',
        other: ''
    };

    /* ------------------------------------------------------------------
       4. FILTER STATE + RENDER
       ------------------------------------------------------------------ */
    const state = { tab: 'all', query: '' };
    const tabsEl = $('#tabs');
    const gridEl = $('#grid');
    const emptyEl = $('#empty');
    const countEl = $('#result-count');
    const searchEl = $('#search');

    // Tabs are built from the data: All + every category + every platform (deduped, case-insensitive)
    const ORDER = ['content', 'facebook', 'youtube'];
    function buildTabs() {
        const map = new Map();
        const add = (label) => { const k = key(label); if (k && !map.has(k)) map.set(k, label); };
        items.forEach((v) => { add(v.category); add(PLATFORM_LABEL[v.platform]); });
        const tabs = Array.from(map, ([k, label]) => ({ k, label: label === 'Youtube' ? 'YouTube' : label }));
        tabs.sort((a, b) => {
            const ia = ORDER.indexOf(a.k), ib = ORDER.indexOf(b.k);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.label.localeCompare(b.label);
        });
        tabs.unshift({ k: 'all', label: 'All' });

        tabsEl.innerHTML = tabs.map((t) => {
            const n = t.k === 'all' ? items.length : items.filter((v) => matchesTab(v, t.k)).length;
            return '<button type="button" role="tab" class="tab" id="tab-' + esc(t.k.replace(/\W+/g, '-')) + '" data-tab="' + esc(t.k) +
                '" aria-selected="false" aria-controls="grid" tabindex="-1">' + esc(t.label) +
                '<span class="tab-count">' + n + '</span></button>';
        }).join('');
    }

    function matchesTab(v, k) {
        return k === 'all' || key(v.category) === k || v.platform === k;
    }

    function matchesQuery(v, terms) {
        if (!terms.length) return true;
        const hay = (v.title + ' ' + v.tags.join(' ') + ' ' + v.description + ' ' + v.category + ' ' + v.platform).toLowerCase();
        return terms.every((t) => hay.includes(t));
    }

    function terms() {
        return state.query.toLowerCase().replace(/#/g, ' ').split(/\s+/).filter(Boolean);
    }

    function visible() {
        const t = terms();
        return items.filter((v) => matchesTab(v, state.tab) && matchesQuery(v, t));
    }

    function thumbHTML(v) {
        const placeholder =
            '<span class="vph"><span class="vph-frame" data-orient="' + v.orientation + '">' +
            ICON.play + '</span></span>';
        if (!v.thumbnail) return placeholder;
        // If the image fails to load, swap in the placeholder
        return '<img src="' + esc(v.thumbnail) + '" alt="" loading="lazy" decoding="async" data-fallback="' + esc(placeholder) + '">';
    }

    function cardHTML(v, t) {
        const label = PLATFORM_LABEL[v.platform];
        const tags = v.tags.map((x) => '<span class="chip">#' + highlight(x.replace(/^#/, ''), t) + '</span>').join('');
        return '<li><button type="button" class="vcard" data-id="' + v.id + '" aria-haspopup="dialog" aria-label="Play ' + esc(v.title) + ' (' + label + ')">' +
            '<span class="vthumb">' + thumbHTML(v) +
            '<span class="vshade"></span>' +
            '<span class="vplay"><span>' + ICON.play + '</span></span>' +
            '<span class="vbadge" data-platform="' + v.platform + '">' + ICON[v.platform] + esc(label) + '</span>' +
            (v.duration ? '<span class="vdur">' + esc(v.duration) + '</span>' : '') +
            '</span>' +
            '<span class="vbody">' +
            '<span class="vtitle">' + highlight(v.title, t) + '</span>' +
            (v.description ? '<span class="vdesc">' + esc(v.description) + '</span>' : '') +
            (tags ? '<span class="vtags">' + tags + '</span>' : '') +
            '</span></button></li>';
    }

    let shown = [];
    function render() {
        const t = terms();
        shown = visible();
        gridEl.innerHTML = shown.map((v) => cardHTML(v, t)).join('');
        emptyEl.hidden = shown.length > 0;
        countEl.textContent = shown.length + (shown.length === 1 ? ' video' : ' videos');
        tabsEl.querySelectorAll('.tab').forEach((b) => {
            const on = b.dataset.tab === state.tab;
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
        });
    }

    // Broken thumbnail -> placeholder (error events don't bubble, so capture)
    gridEl.addEventListener('error', (e) => {
        const img = e.target;
        if (img.tagName !== 'IMG' || !img.dataset.fallback) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = img.dataset.fallback;
        img.replaceWith(tmp.firstElementChild);
    }, true);

    // Tabs: click + arrow keys
    tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('.tab');
        if (!b) return;
        state.tab = b.dataset.tab;
        render();
    });
    tabsEl.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const list = Array.from(tabsEl.querySelectorAll('.tab'));
        const i = list.indexOf(document.activeElement);
        if (i < 0) return;
        const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
        next.focus();
        next.click();
        next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        e.preventDefault();
    });

    // Live search
    searchEl.addEventListener('input', () => { state.query = searchEl.value.trim(); render(); });
    $('#reset').addEventListener('click', () => {
        state.tab = 'all'; state.query = ''; searchEl.value = ''; render(); searchEl.focus();
    });

    /* ------------------------------------------------------------------
       5. PLAYER MODAL
       ------------------------------------------------------------------ */
    const player = $('#player');
    const panel = $('#player-panel');
    const stage = $('#player-stage');
    let current = -1;     // index within `shown`
    let lastFocus = null;
    let closeTimer = 0;

    function mountIframe(v) {
        stage.textContent = '';
        const spin = document.createElement('span');
        spin.className = 'spinner';
        stage.appendChild(spin);

        const f = document.createElement('iframe');
        f.title = v.title;
        f.src = v.embedUrl;
        f.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        f.setAttribute('scrolling', 'no');
        f.addEventListener('load', () => spin.remove(), { once: true });
        stage.appendChild(f);
    }

    // Removing the iframe from the DOM stops playback (and audio) immediately
    function unmountIframe() {
        const f = stage.querySelector('iframe');
        if (f) { f.src = 'about:blank'; f.remove(); }
        stage.textContent = '';
    }

    function fill(i) {
        const v = shown[i];
        if (!v) return;
        current = i;
        panel.dataset.orient = v.orientation;
        $('#player-meta').textContent = PLATFORM_LABEL[v.platform] + ' / ' + v.category;
        $('#player-title').textContent = v.title;
        $('#player-desc').textContent = v.description;
        $('#player-tags').innerHTML = v.tags.map((x) => '<span class="chip">#' + esc(x.replace(/^#/, '')) + '</span>').join('');
        const open = $('#player-open');
        open.href = v.watchUrl;
        open.hidden = !/^https?:/i.test(v.watchUrl);
        $('#player-prev').disabled = i <= 0;
        $('#player-next').disabled = i >= shown.length - 1;
        mountIframe(v);
    }

    function openPlayer(id) {
        const i = shown.findIndex((v) => v.id === id);
        if (i < 0) return;
        clearTimeout(closeTimer);
        lastFocus = document.activeElement;
        fill(i);
        player.hidden = false;
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => player.classList.add('is-open'));
        $('#player-close').focus();
    }

    function closePlayer() {
        if (player.hidden) return;
        unmountIframe();                       // stop audio right now
        player.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        closeTimer = setTimeout(() => { player.hidden = true; }, 220);
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
        current = -1;
    }

    function step(d) {
        const n = current + d;
        if (n >= 0 && n < shown.length) fill(n);
    }

    gridEl.addEventListener('click', (e) => {
        const c = e.target.closest('.vcard');
        if (c) openPlayer(c.dataset.id);
    });
    $('#player-close').addEventListener('click', closePlayer);
    $('#player-prev').addEventListener('click', () => step(-1));
    $('#player-next').addEventListener('click', () => step(1));
    // Backdrop click: only when the click lands on the overlay itself, not the panel
    player.addEventListener('mousedown', (e) => { if (e.target === player) closePlayer(); });

    document.addEventListener('keydown', (e) => {
        if (player.hidden) return;
        if (e.key === 'Escape') { closePlayer(); return; }
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'Tab') {                 // keep focus inside the dialog
            const f = Array.from(player.querySelectorAll('button:not([disabled]), a[href]:not([hidden])'));
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
            else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
        }
    });

    // Leaving the page (or bfcache restore) must never leave audio running
    window.addEventListener('pagehide', unmountIframe);

    buildTabs();
    render();
})();
