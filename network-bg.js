/*!
 * network-bg.js — click-to-spawn network topology background
 *
 * Click anywhere in the side margins and a small network cluster (nodes,
 * links, CIDR label, travelling data packets) fades in at that spot. It stays
 * for a few seconds, glows teal when the cursor is near it, then fades away.
 * No dependencies. Idle pages cost zero CPU (the animation loop only runs
 * while clusters exist).
 *
 *   <script src="network-bg.js" defer></script>
 *
 * Optional (put BEFORE the script tag):
 *   <script>window.NETWORK_BG_OPTIONS = { accent:'#1091b9', contentWidth:960 };</script>
 */
(() => {
  'use strict';
  if (window.__networkBg) return;

  const DEFAULTS = {
    accent: 'rgb(56 189 248 / 0.7)',     // glow colour
    contentWidth: 960,     // px width of your centred content; clusters spawn in the side margins
    contentSelector: '',   // optional CSS selector of the content box; when set, its real edges are used
    // (handy when pages/views have different widths)
    narrow: false,         // also spawn (faint) clusters on narrow screens where there are no margins
    ignore: 'a,button,input,textarea,select,summary,label,[role="button"],[role="dialog"],dialog,[contenteditable]',
    zIndex: 0,             // use -1 if your <body> has no solid background colour
    labelPrefix: '10.24.', // first two octets shown in the CIDR labels
    labels: true,
    life: 6000,            // ms a cluster stays before fading (hovering it keeps it alive)
    fadeIn: 500,           // ms
    fadeOut: 1800,         // ms
    maxClusters: 9,        // oldest fades first when exceeded
    glow: true             // faint teal glow in the top corners
  };
  const O = Object.assign({}, DEFAULTS, window.NETWORK_BG_OPTIONS || {});

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  const hex = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ACC = hex(O.accent);
  const GRAY = [150, 160, 176];
  const TEAL = [Math.round(ACC[0] * 0.8), Math.round(ACC[1] * 0.85), Math.round(ACC[2] * 0.85)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const TAU = Math.PI * 2;

  /* ---------- DOM ---------- */
  const style = document.createElement('style');
  style.textContent = `.nbg-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:${O.zIndex}}`;
  document.head.appendChild(style);

  const canvas = document.createElement('canvas');
  canvas.className = 'nbg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  if (O.glow) {
    const g = (x) => `radial-gradient(560px 280px at ${x}% 0%, ${rgba(ACC, 0.09)}, transparent 70%)`;
    canvas.style.background = `${g(8)}, ${g(92)}`;
  }
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  /* ---------- state ---------- */
  let vw = 0, vh = 0, dpr = 1;
  let clusters = [];
  let px = -9999, py = -9999, active = false;
  let raf = 0, last = 0;

  /* ---------- cluster generation: star / polygon / diamond ---------- */
  function makeCluster(cx, cy, R, rnd, scale, now) {
    const nodes = [], edges = [], leaves = [];
    const seen = new Set();
    const N = (x, y, hub) => {
      nodes.push({ bx: x, by: y, x, y, ph: rnd() * 6.28, hub: !!hub, rad: hub ? 5.2 : 4.6 });
      return nodes.length - 1;
    };
    const E = (a, b, dashed) => {
      const k = a < b ? a + '-' + b : b + '-' + a;
      if (a === b || seen.has(k)) return;
      seen.add(k); edges.push([a, b, !!dashed]);
    };
    const Lf = (p, ang, len) => leaves.push({ p, ox: Math.cos(ang) * len, oy: Math.sin(ang) * len, x: 0, y: 0 });

    const type = ['star', 'polygon', 'diamond'][Math.floor(rnd() * 3)];

    if (type === 'star') {
      const h = N(cx, cy, true);
      const n = 4 + Math.floor(rnd() * 4);
      const base = rnd() * TAU;
      const outer = [];
      for (let i = 0; i < n; i++) {
        const ang = base + (i / n) * TAU + (rnd() - 0.5) * 0.6;
        const r = R * (0.55 + rnd() * 0.45);
        const k = N(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        outer.push(k);
        E(h, k, false);
        if (rnd() < 0.6) Lf(k, ang + (rnd() - 0.5) * 0.8, 12 + rnd() * 12);
      }
      if (rnd() < 0.5) E(outer[0], outer[1], false);
      if (rnd() < 0.4) E(outer[2 % n], outer[3 % n], true);
    } else if (type === 'polygon') {
      const n = 5 + Math.floor(rnd() * 2);
      const base = rnd() * TAU;
      const ids = [];
      for (let i = 0; i < n; i++) {
        const ang = base + (i / n) * TAU + (rnd() - 0.5) * 0.35;
        const r = R * (0.8 + rnd() * 0.2);
        ids.push(N(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
      }
      for (let i = 0; i < n; i++) E(ids[i], ids[(i + 1) % n], false);
      for (let i = 0; i < 2; i++) E(ids[Math.floor(rnd() * n)], ids[Math.floor(rnd() * n)], true);
      if (rnd() < 0.5) { nodes[ids[0]].hub = true; nodes[ids[0]].rad = 5.2; }
      const lc = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < lc; i++) {
        const k = ids[Math.floor(rnd() * n)];
        Lf(k, Math.atan2(nodes[k].by - cy, nodes[k].bx - cx), 12 + rnd() * 10);
      }
    } else { // diamond: two hubs in the middle, four outer nodes, radial leaf dots
      const h1 = N(cx - R * 0.14, cy - R * 0.12, true);
      const h2 = N(cx + R * 0.16, cy + R * 0.14, true);
      E(h1, h2, false);
      const base = rnd() * 0.6;
      for (let i = 0; i < 4; i++) {
        const ang = base + (i / 4) * TAU + (rnd() - 0.5) * 0.4;
        const r = R * (0.75 + rnd() * 0.25);
        const k = N(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        E(k, i % 2 === 0 ? h1 : h2, false);
        if (i % 2 === 0) E(k, h2, false);
        Lf(k, ang, 14 + rnd() * 10);
      }
    }

    const adj = nodes.map(() => []);
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

    const packets = [];
    const pc = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < pc; i++) {
      let from = Math.floor(rnd() * nodes.length);
      if (!adj[from].length) from = 0;
      packets.push({ from, to: adj[from][Math.floor(rnd() * adj[from].length)], t: rnd() });
    }

    const maxY = Math.max(...nodes.map((n) => n.by), ...leaves.map((l) => nodes[l.p].by + l.oy));
    const label = `${O.labelPrefix}${Math.floor(rnd() * 256)}.0/${[22, 24, 26, 28][Math.floor(rnd() * 4)]}`;

    return {
      cx, cy, R, scale, nodes, edges, adj, leaves, packets, label,
      born: now, expireAt: now + O.life, dying: false,
      vis: 0, hot: 0, ph: rnd() * 6.28, dx: 0, dy: 0, ly: maxY + 22
    };
  }

  /* ---------- spawning ---------- */
  function contentEdges() {
    if (O.contentSelector) {
      const el = document.querySelector(O.contentSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) return [r.left, r.right];
      }
    }
    const m = (vw - O.contentWidth) / 2;
    return [m, vw - m];
  }

  function spawn(x, y) {
    const [L, Rt] = contentEdges();
    const leftW = L, rightW = vw - Rt;
    const rnd = rng((Math.random() * 1e9) | 0);
    const now = performance.now();
    let cx, cy, R, scale = 1;

    if (Math.max(leftW, rightW) >= 110) {
      if (x > L && x < Rt) return;                          // clicks on the content column do nothing
      const side = x <= L ? leftW : rightW;
      if (side < 110) return;                               // that margin is too small for a cluster
      R = clamp(side / 2 - 14, 34, 84);
      const lo = R + 12, hi = side - R - 12;
      cx = x <= L ? clamp(x, lo, hi) : vw - clamp(vw - x, lo, hi);
    } else {                                                // narrow screens: no margins to use
      if (!O.narrow) return;
      R = 46; scale = 0.4;
      cx = clamp(x, R, vw - R);
    }
    cy = clamp(y, R + 10, vh - R - 30);

    const c = makeCluster(cx, cy, R, rnd, scale, now);
    if (reduce) c.vis = 1;
    clusters.push(c);

    const live = clusters.filter((k) => !k.dying);
    if (live.length > O.maxClusters) {
      const oldest = live.reduce((a, b) => (a.born < b.born ? a : b));
      oldest.expireAt = 0;
    }
    ensureLoop();
  }

  /* ---------- update + draw ---------- */
  const ease = (cur, target, dt, up, down) =>
    cur + (target - cur) * (1 - Math.exp(-dt / (target > cur ? up : down)));

  function update(c, now, dt) {
    const d = active ? Math.hypot(px - c.cx, py - c.cy) : Infinity;
    const tHot = active ? 1 - smooth(c.R * 0.5, c.R * 1.7, d) : 0;
    c.hot = ease(c.hot, tHot, dt, 200, 1100);

    if (c.hot > 0.3 && now < c.expireAt + 1) c.expireAt = Math.max(c.expireAt, now + 2500); // hovering keeps it alive
    const alive = now < c.expireAt;
    if (!alive) c.dying = true;
    c.vis = reduce && alive ? 1 : ease(c.vis, alive ? 1 : 0, dt, O.fadeIn, O.fadeOut);

    const mv = reduce ? 0 : 1;
    c.dx = Math.sin(now * 0.00015 + c.ph) * 4 * mv;
    c.dy = Math.cos(now * 0.00012 + c.ph) * 4 * mv;
    for (const nd of c.nodes) {
      nd.x = nd.bx + c.dx + Math.sin(now * 0.0006 + nd.ph) * 1.4 * mv;
      nd.y = nd.by + c.dy + Math.cos(now * 0.0005 + nd.ph) * 1.4 * mv;
    }
    for (const l of c.leaves) {
      const p = c.nodes[l.p];
      l.x = p.x + l.ox; l.y = p.y + l.oy;
    }
    if (reduce) return;
    const v = 0.03 + 0.06 * c.hot; // px per ms
    for (const pk of c.packets) {
      const a = c.nodes[pk.from], b = c.nodes[pk.to];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      pk.t += (dt * v) / len;
      if (pk.t >= 1) {
        const prev = pk.from;
        pk.from = pk.to;
        const opts = c.adj[pk.from];
        let next = opts[Math.floor(Math.random() * opts.length)];
        if (next === prev && opts.length > 1) next = opts[(opts.indexOf(next) + 1) % opts.length];
        pk.to = next; pk.t = 0;
      }
    }
  }

  function draw(c) {
    const V = c.vis * c.scale, h = c.hot;
    if (V < 0.01) return;
    const col = mix(GRAY, TEAL, h);

    ctx.lineWidth = 1.2;
    for (const [ai, bi, dashed] of c.edges) {
      const a = c.nodes[ai], b = c.nodes[bi];
      ctx.setLineDash(dashed ? [4, 4] : []);
      ctx.strokeStyle = rgba(col, (0.34 + 0.5 * h) * V);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const l of c.leaves) {
      const p = c.nodes[l.p];
      ctx.strokeStyle = rgba(col, (0.3 + 0.3 * h) * V);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(l.x, l.y); ctx.stroke();
      ctx.fillStyle = rgba(col, (0.6 + 0.3 * h) * V);
      ctx.beginPath(); ctx.arc(l.x, l.y, 2.2, 0, TAU); ctx.fill();
    }

    for (const nd of c.nodes) {
      if (nd.hub) {
        const g = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, 17);
        g.addColorStop(0, rgba(ACC, (0.32 + 0.38 * h) * V));
        g.addColorStop(1, rgba(ACC, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 17, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(ACC, (0.78 + 0.22 * h) * V);
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.rad, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(3,8,16,${0.95 * V})`;
        ctx.strokeStyle = rgba(col, (0.75 + 0.25 * h) * V);
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.rad, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    ctx.lineWidth = 1;

    if (!reduce) {
      for (const pk of c.packets) {
        const a = c.nodes[pk.from], b = c.nodes[pk.to];
        const x = a.x + (b.x - a.x) * pk.t, y = a.y + (b.y - a.y) * pk.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, rgba(ACC, (0.6 + 0.4 * h) * V));
        g.addColorStop(1, rgba(ACC, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(225,255,238,${V})`;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      }
    }

    if (O.labels) {
      ctx.font = '11px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(GRAY, 0.55 * V);
      ctx.fillText(c.label, c.cx + c.dx, c.ly + c.dy);
    }
  }

  function frame(now) {
    const dt = Math.min(48, now - (last || now));
    last = now;
    ctx.clearRect(0, 0, vw, vh);
    for (const c of clusters) { update(c, now, dt); draw(c); }
    clusters = clusters.filter((c) => !(c.dying && c.vis < 0.01));
    if (clusters.length) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0; last = 0;
      ctx.clearRect(0, 0, vw, vh);
    }
  }
  function ensureLoop() {
    if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function resize() {
    vw = innerWidth; vh = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = vw * dpr; canvas.height = vh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clusters = [];            // positions depend on viewport size; they're short-lived anyway
    ctx.clearRect(0, 0, vw, vh);
  }

  /* ---------- events ---------- */
  let touchTimer = 0;
  const onMove = (e) => { px = e.clientX; py = e.clientY; active = true; clearTimeout(touchTimer); };
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target;
    if (t && t.closest && O.ignore && t.closest(O.ignore)) return;
    px = e.clientX; py = e.clientY; active = true;
    spawn(e.clientX, e.clientY);
  };
  const onUp = (e) => {
    if (e.pointerType === 'touch') touchTimer = setTimeout(() => { active = false; }, 700);
  };
  const onLeave = () => { active = false; };
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(resize, 120); };
  const onVis = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (clusters.length) ensureLoop();
  };

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  resize();

  window.__networkBg = {
    spawn,   // window.__networkBg.spawn(x, y) — spawn one programmatically
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      canvas.remove(); style.remove();
      delete window.__networkBg;
    }
  };
})();
