// Component Playground: live-edit badges, marquee, theme, sliders and grid in one stage.
(function () {
    const root = document.getElementById('pg');
    if (!root) return;
    const $ = (s) => root.querySelector(s);
    const KEY = 'pg-state-v1';
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const toast = (m) => { if (typeof showToast === 'function') showToast(m); };

    const D = {
        mode: 'night', accent: '#38bdf8', radius: 14, glow: 40, font: 'sans',
        bText: 'Verified', bVar: 'glass', bShape: 'pill', bTilt: true,
        mText: 'React, Tailwind, GSAP, Node.js, Figma, Supabase', mSpeed: 22, mGap: 20, mDir: 'normal', mTwo: true, mHover: true,
        sThick: 6, sTip: false,
        gLayout: 'bento', gCols: 4, gGap: 12
    };
    let S = { ...D };
    try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage unavailable */ }

    const stage = $('#pg-stage'), modeBtn = $('#pg-mode');
    const T = {
        night: { bg: '#09090b', sf: '#18181b', tx: '#f4f4f5', mu: '#a1a1aa', bd: '#3f3f46' },
        day: { bg: '#f8fafc', sf: '#ffffff', tx: '#0f172a', mu: '#64748b', bd: '#cbd5e1' }
    };
    const FF = { sans: "'Inter',system-ui,sans-serif", mono: "'JetBrains Mono',monospace", serif: "Georgia,'Times New Roman',serif" };
    const SW = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#f97316'];
    const B = { likes: 12, follow: false, gone: false };
    let order = [0, 1, 2, 3, 4, 5, 6, 7];
    const TILES = [['layout', 'Hero'], ['chart-bar', 'Stats'], ['chart-line', 'Chart'], ['newspaper', 'Feed'], ['map-pin', 'Map'], ['chat-circle', 'Chat'], ['check-square', 'Tasks'], ['note', 'Notes']];

    const hsl = (h, s, l) => {
        s /= 100; l /= 100;
        const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
        const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
    };

    /* ---------- Custom slider: single, dual-handle or stepped, pointer + keyboard ---------- */
    function slider(host, { min, max, step = 1, v, range = false, ticks = false, fmt = (x) => x, on }) {
        let vals = range ? [...v] : [v];
        host.classList.add('pg-sl');
        host.innerHTML = '<i class="pg-fill"></i>' + vals.map(() => '<b class="pg-th" tabindex="0" role="slider"><em></em></b>').join('');
        if (ticks) {
            const n = (max - min) / step;
            host.insertAdjacentHTML('afterbegin', Array.from({ length: n + 1 }, (_, i) => `<s style="left:${(i / n) * 100}%"></s>`).join(''));
        }
        const th = [...host.querySelectorAll('.pg-th')], fill = host.querySelector('.pg-fill');
        const pct = (x) => ((x - min) / (max - min)) * 100;
        const snap = (x) => Math.min(max, Math.max(min, Math.round((x - min) / step) * step + min));
        function draw() {
            th.forEach((t, i) => {
                t.style.left = pct(vals[i]) + '%';
                t.setAttribute('aria-valuemin', min); t.setAttribute('aria-valuemax', max); t.setAttribute('aria-valuenow', vals[i]);
                t.firstChild.textContent = fmt(vals[i]);
            });
            const a = range ? pct(vals[0]) : 0, b = pct(vals[vals.length - 1]);
            fill.style.left = a + '%'; fill.style.width = (b - a) + '%';
        }
        function set(i, x) {
            x = snap(x);
            if (range) x = i ? Math.max(x, vals[0]) : Math.min(x, vals[1]);
            vals[i] = x; draw();
            if (on) on(range ? [...vals] : vals[0]);
        }
        const at = (e) => { const r = host.getBoundingClientRect(); return min + ((e.clientX - r.left) / r.width) * (max - min); };
        let act = 0;
        host.addEventListener('pointerdown', (e) => {
            const x = at(e);
            act = range && Math.abs(x - vals[1]) < Math.abs(x - vals[0]) ? 1 : 0;
            host.setPointerCapture(e.pointerId); host.classList.add('drag');
            th[act].focus({ preventScroll: true }); set(act, x); e.preventDefault();
        });
        host.addEventListener('pointermove', (e) => { if (host.classList.contains('drag')) set(act, at(e)); });
        ['pointerup', 'pointercancel'].forEach((n) => host.addEventListener(n, () => host.classList.remove('drag')));
        th.forEach((t, i) => t.addEventListener('keydown', (e) => {
            const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 10, PageDown: -step * 10 }[e.key];
            if (d != null) set(i, vals[i] + d);
            else if (e.key === 'Home') set(i, min);
            else if (e.key === 'End') set(i, max);
            else return;
            e.preventDefault();
        }));
        draw();
        return { set(nv) { vals = range ? [...nv] : [nv]; draw(); } };
    }

    /* ---------- Stage rendering ---------- */
    function theme() {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(S.accent.slice(i, i + 2), 16));
        const lum = (r * 299 + g * 587 + b * 114) / 1000;
        const v = {
            '--ac': `${r} ${g} ${b}`, '--on': lum > 150 ? '#0b1220' : '#ffffff', '--r': S.radius + 'px', '--glow': S.glow,
            '--ff': FF[S.font], '--th': S.sThick + 'px', '--mq': S.mSpeed + 's', '--mg': S.mGap + 'px', '--dir': S.mDir,
            '--dir2': S.mDir === 'normal' ? 'reverse' : 'normal', '--gc': S.gCols, '--gg': S.gGap + 'px'
        };
        Object.entries(T[S.mode]).forEach(([k, x]) => { v['--' + k] = x; });
        for (const k in v) stage.style.setProperty(k, v[k]);
        Object.assign(stage.dataset, {
            bv: S.bVar, bs: S.bShape, bt: S.bTilt ? 1 : 0, mh: S.mHover ? 1 : 0, tip: S.sTip ? 'on' : 'off', mode: S.mode,
            gl: S.gLayout === 'bento' && S.gCols < 3 ? 'grid' : S.gLayout
        });
        const day = S.mode === 'day';
        modeBtn.setAttribute('aria-checked', day);
        modeBtn.querySelector('i').className = 'ph-bold ph-' + (day ? 'sun' : 'moon');
    }

    function badges() {
        const ic = (n) => `<i class="ph-bold ph-${n}"></i>`;
        $('#pg-badges').innerHTML = [
            `<span class="pg-badge" data-tilt>${ic('seal-check')}${esc(S.bText)}</span>`,
            `<button type="button" class="pg-badge" data-act="like" data-tilt>${ic('heart')}<b>${B.likes}</b></button>`,
            `<button type="button" class="pg-badge" data-act="follow" aria-pressed="${B.follow}" data-tilt>${ic(B.follow ? 'check' : 'plus')}${B.follow ? 'Following' : 'Follow'}</button>`,
            `<span class="pg-badge" data-tilt><i class="pg-dot"></i>Available</span>`,
            B.gone ? '' : `<span class="pg-badge">#design <button type="button" data-act="x" aria-label="Dismiss tag">${ic('x')}</button></span>`
        ].join('');
    }

    function marquee() {
        const items = S.mText.split(',').map((s) => s.trim()).filter(Boolean);
        if (!items.length) items.push('Add some items');
        const one = items.map((t) => `<span class="pg-mi">${esc(t)}</span>`).join('').repeat(items.length < 4 ? 4 : 2);
        const row = (c) => `<div class="pg-mq"><div class="pg-track ${c}">${one}${one}</div></div>`;
        $('#pg-marquee').innerHTML = row('') + (S.mTwo ? row('b') : '');
    }

    function grid() {
        $('#pg-grid').innerHTML = order.map((n, i) =>
            `<div class="pg-tile" draggable="true" data-i="${i}" style="--h:${70 + ((n * 41) % 70)}px"><i class="ph-bold ph-${TILES[n][0]}"></i><span>${TILES[n][1]}</span></div>`).join('');
    }

    function code() {
        const t = T[S.mode];
        $('#pg-code').textContent =
`:root {
  --accent: ${S.accent};
  --radius: ${S.radius}px;
  --glow: ${S.glow}%;
  --font: ${FF[S.font]};
  --bg: ${t.bg}; --surface: ${t.sf}; --text: ${t.tx}; --muted: ${t.mu}; --border: ${t.bd};
}

/* badge */
<span class="badge" data-variant="${S.bVar}" data-shape="${S.bShape}">${S.bText}</span>

/* marquee */
.track { display: flex; width: max-content; animation: scroll ${S.mSpeed}s linear infinite ${S.mDir}; }
.track > * { margin-right: ${S.mGap}px; }
@keyframes scroll { to { transform: translateX(-50%); } }

/* ${S.gLayout} layout */
.grid { display: grid; grid-template-columns: repeat(${S.gCols}, 1fr); gap: ${S.gGap}px; }`;
    }

    function update(k) {
        theme();
        if (k === 'bText') badges();
        if (k === 'mText' || k === 'mTwo') marquee();
        if (k === 'gLayout') grid();
        code();
        try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    }

    /* ---------- Control panel (built from config) ---------- */
    const sync = [];
    const CFG = {
        theme: [
            ['color', 'accent', 'Accent color'],
            ['rng', 'radius', 'Corner radius', 0, 28, 1, 'px'],
            ['rng', 'glow', 'Glow intensity', 0, 100, 1, '%'],
            ['seg', 'font', 'Typeface', [['sans', 'Sans'], ['mono', 'Mono'], ['serif', 'Serif']]]
        ],
        badges: [
            ['text', 'bText', 'Label'],
            ['seg', 'bVar', 'Style', [['solid', 'Solid'], ['outline', 'Outline'], ['glass', 'Glass'], ['glow', 'Glow']]],
            ['seg', 'bShape', 'Shape', [['pill', 'Pill'], ['round', 'Rounded'], ['square', 'Square']]],
            ['tog', 'bTilt', '3D tilt on hover']
        ],
        marquee: [
            ['text', 'mText', 'Items (comma separated)'],
            ['rng', 'mSpeed', 'Loop duration', 4, 60, 1, 's'],
            ['rng', 'mGap', 'Gap', 4, 64, 1, 'px'],
            ['seg', 'mDir', 'Direction', [['normal', 'Forward'], ['reverse', 'Backward']]],
            ['tog', 'mTwo', 'Second lane, opposite way'],
            ['tog', 'mHover', 'Pause on hover']
        ],
        sliders: [
            ['rng', 'sThick', 'Track thickness', 2, 16, 1, 'px'],
            ['tog', 'sTip', 'Always show value tooltip']
        ],
        grid: [
            ['seg', 'gLayout', 'Layout', [['grid', 'Grid'], ['bento', 'Bento'], ['masonry', 'Masonry']]],
            ['rng', 'gCols', 'Columns', 1, 6, 1, ''],
            ['rng', 'gGap', 'Gap', 0, 32, 1, 'px'],
            ['btn', () => { order.sort(() => Math.random() - 0.5); grid(); }, 'Shuffle tiles']
        ]
    };

    function ctl([t, k, l, ...a]) {
        const f = document.createElement('div');
        f.className = 'pg-f';
        if (t === 'btn') {
            f.innerHTML = `<button type="button" class="player-btn self-start">${l}</button>`;
            f.firstChild.onclick = k;
            return f;
        }
        const set = (v) => { S[k] = v; update(k); };
        f.innerHTML = `<div class="pg-lab"><span>${l}</span><span class="pg-val"></span></div>`;
        const val = f.querySelector('.pg-val');
        if (t === 'rng') {
            const [min, max, step, u] = a, h = document.createElement('div');
            f.append(h);
            const sl = slider(h, { min, max, step, v: S[k], on: (x) => { S[k] = x; val.textContent = x + u; update(k); } });
            sync.push(() => { sl.set(S[k]); val.textContent = S[k] + u; });
        } else if (t === 'seg') {
            const w = document.createElement('div');
            w.className = 'pg-seg';
            w.innerHTML = a[0].map(([v, n]) => `<button type="button" data-v="${v}">${n}</button>`).join('');
            f.append(w);
            const sy = () => w.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === S[k]));
            w.onclick = (e) => { const b = e.target.closest('button'); if (b) { set(b.dataset.v); sy(); } };
            sync.push(sy);
        } else if (t === 'tog') {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'pg-tog'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', l);
            f.append(b);
            const sy = () => { b.setAttribute('aria-checked', !!S[k]); val.textContent = S[k] ? 'ON' : 'OFF'; };
            b.onclick = () => { set(!S[k]); sy(); };
            sync.push(sy);
        } else if (t === 'text') {
            const i = document.createElement('input');
            i.className = 'pg-in'; i.maxLength = 120; i.setAttribute('aria-label', l);
            f.append(i);
            i.oninput = () => set(i.value);
            sync.push(() => { if (document.activeElement !== i) i.value = S[k]; });
        } else if (t === 'color') {
            f.insertAdjacentHTML('beforeend', `<div class="pg-sw"><input type="color" aria-label="${l}">${SW.map((c) => `<button type="button" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>`);
            const c = f.querySelector('input'), w = f.querySelector('.pg-sw');
            const sy = () => { c.value = S[k]; val.textContent = S[k]; };
            c.oninput = () => { set(c.value); val.textContent = S[k]; };
            w.onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { set(b.dataset.c); sy(); } };
            sync.push(sy);
        }
        return f;
    }

    const tabs = $('#pg-tabs'), panels = $('#pg-panels');
    Object.entries(CFG).forEach(([n, list], i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pg-tab'; b.dataset.n = n; b.textContent = n[0].toUpperCase() + n.slice(1);
        b.setAttribute('aria-pressed', i === 0);
        const p = document.createElement('div');
        p.hidden = i > 0; p.dataset.n = n;
        list.forEach((c) => p.append(ctl(c)));
        tabs.append(b); panels.append(p);
    });
    tabs.addEventListener('click', (e) => {
        const b = e.target.closest('.pg-tab');
        if (!b) return;
        tabs.querySelectorAll('.pg-tab').forEach((x) => x.setAttribute('aria-pressed', x === b));
        panels.querySelectorAll(':scope > [data-n]').forEach((p) => { p.hidden = p.dataset.n !== b.dataset.n; });
        const s = $('#pg-sec-' + b.dataset.n);
        if (s) { s.classList.remove('pg-focus'); void s.offsetWidth; s.classList.add('pg-focus'); }
    });

    /* ---------- Stage interactions ---------- */
    const bd = $('#pg-badges');
    bd.addEventListener('pointermove', (e) => {
        if (stage.dataset.bt !== '1') return;
        const b = e.target.closest('[data-tilt]');
        if (!b) return;
        const r = b.getBoundingClientRect();
        b.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 28 + 'deg');
        b.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 28 + 'deg');
    });
    bd.addEventListener('pointerout', (e) => {
        const b = e.target.closest('[data-tilt]');
        if (b && !b.contains(e.relatedTarget)) { b.style.removeProperty('--rx'); b.style.removeProperty('--ry'); }
    });
    bd.addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]');
        if (!a) return;
        const k = a.dataset.act;
        if (k === 'like') B.likes++;
        else if (k === 'follow') B.follow = !B.follow;
        else B.gone = true;
        badges();
        if (k === 'like') bd.querySelector('[data-act=like]').classList.add('pop');
    });

    const gd = $('#pg-grid');
    let drag = null;
    gd.addEventListener('dragstart', (e) => { const t = e.target.closest('.pg-tile'); if (t) { drag = +t.dataset.i; e.dataTransfer.effectAllowed = 'move'; } });
    gd.addEventListener('dragover', (e) => e.preventDefault());
    gd.addEventListener('drop', (e) => {
        e.preventDefault();
        const t = e.target.closest('.pg-tile');
        if (!t || drag == null) return;
        order.splice(+t.dataset.i, 0, order.splice(drag, 1)[0]);
        drag = null; grid();
    });

    // Slider showcase
    function demo(id, opts, f) {
        const out = $('#' + id + 'o');
        out.textContent = f(opts.v);
        slider($('#' + id), { ...opts, on: (x) => { out.textContent = f(x); } });
    }
    demo('pg-s1', { min: 0, max: 100, v: 50 }, (x) => x + '%');
    demo('pg-s2', { min: 0, max: 1000, step: 10, v: [200, 700], range: true, fmt: (x) => '$' + x }, (x) => `$${x[0]}-${x[1]}`);
    const Q = ['Draft', 'Good', 'Great', 'Ultra', 'Max'];
    demo('pg-s3', { min: 1, max: 5, v: 3, ticks: true, fmt: (x) => Q[x - 1] }, (x) => Q[x - 1]);

    /* ---------- Header actions ---------- */
    modeBtn.onclick = () => { S.mode = S.mode === 'night' ? 'day' : 'night'; update('mode'); };
    const all = () => { theme(); badges(); marquee(); grid(); sync.forEach((f) => f()); code(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
    $('#pg-random').onclick = () => {
        const r = (a) => a[(Math.random() * a.length) | 0];
        Object.assign(S, { accent: hsl(Math.random() * 360, 75, 60), radius: r([2, 8, 14, 20, 28]), glow: (Math.random() * 100) | 0, font: r(['sans', 'mono', 'serif']), bVar: r(['solid', 'outline', 'glass', 'glow']), bShape: r(['pill', 'round', 'square']) });
        all();
    };
    $('#pg-reset').onclick = () => { S = { ...D }; Object.assign(B, { likes: 12, follow: false, gone: false }); order = [0, 1, 2, 3, 4, 5, 6, 7]; all(); toast('Playground reset'); };
    $('#pg-copy').onclick = () => {
        const t = $('#pg-code').textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Theme CSS copied'), () => toast('Copy failed, select the text instead'));
    };

    all();
})();
