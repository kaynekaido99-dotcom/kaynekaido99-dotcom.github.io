// Entrance animations (GSAP core only). Runs after the page has loaded.
(function () {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!window.gsap || reduce) { root.classList.remove('anim-pending'); return; }

    // ---- Tunables -------------------------------------------------------
    const COUNTER_TO = 99999;   // morphing counter target (val)
    const COUNTER_TIME = 2;     // morphing counter duration (s)
    const CONTACT_LOOP = true;  // gentle infinite slide on the contact buttons
    // ---------------------------------------------------------------------

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const CLEAR = 'opacity,visibility,transform';

    // Scrambled "decode" text: reveals `text` left to right while the rest flickers with `chars`
    function scramble(el, text, { chars = '01', speed = 1, duration = 1.5, ease = 'none' } = {}) {
        const s = { p: 0 };
        let last = -1;
        let tail = [];
        const rnd = () => chars[Math.floor(Math.random() * chars.length)];
        return gsap.to(s, {
            p: 1, duration, ease,
            onUpdate() {
                const n = Math.floor(s.p * text.length);
                const now = gsap.ticker.time;
                if (now - last > 0.045 / speed || !tail.length) {
                    last = now;
                    tail = Array.from(text, (c) => (c === ' ' ? ' ' : rnd()));
                }
                el.textContent = text.slice(0, n) + tail.slice(n).join('');
            },
            onComplete() { el.textContent = text; }
        });
    }

    // Typewriter across one or more text nodes (keeps <strong> etc. intact)
    function typeText(nodes, texts, duration, caretEl) {
        const total = texts.reduce((a, t) => a + t.length, 0);
        const s = { p: 0 };
        return gsap.to(s, {
            p: 1, duration, ease: 'none',
            onStart() { if (caretEl) caretEl.classList.add('typing-caret'); },
            onUpdate() {
                let n = Math.round(s.p * total);
                nodes.forEach((nd, i) => {
                    const k = Math.min(n, texts[i].length);
                    nd.nodeValue = texts[i].slice(0, k);
                    n -= k;
                });
            },
            onComplete() { if (caretEl) caretEl.classList.remove('typing-caret'); }
        });
    }

    // Morphing counter: 00,000 -> COUNTER_TO, then morphs into the real text
    const fmt = (n) => { const s = String(Math.round(n)).padStart(5, '0'); return s.slice(0, -3) + ',' + s.slice(-3); };
    function morph(el) {
        const final = el.textContent.trim();
        el.textContent = '00,000';
        el.style.fontFamily = 'monospace';
        const s = { v: 0 };
        const m = gsap.timeline();
        m.to(s, { v: COUNTER_TO, duration: COUNTER_TIME, ease: 'power2.out', onUpdate() { el.textContent = fmt(s.v); } });
        m.add(scramble(el, final, { chars: '0123456789', duration: 0.5 }));
        m.add(() => { el.style.fontFamily = ''; });
        return m;
    }

    // Wrap the first non-empty text node of an element in a span
    function wrapText(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) if (node.nodeValue.trim()) break;
        const text = node.nodeValue.replace(/\s+/g, ' ').trim();
        const span = document.createElement('span');
        span.textContent = text;
        node.parentNode.replaceChild(span, node);
        return { span, text };
    }

    function init() {
        const main = $('main');
        if (!main) { root.classList.remove('anim-pending'); return; }
        root.classList.add('anim-run'); // stop off-screen slides from causing a horizontal scrollbar
        const [profile, projects, socials, about, contact] = Array.from(main.children);
        const entrance = []; // { el, tl }

        // ---------- Header ----------
        const brand = $('header a[href="#profile"]');
        const navLinks = $$('header nav a');
        gsap.set(brand, { x: -80, autoAlpha: 0 });
        gsap.set(navLinks, { display: 'inline-block', x: 60, autoAlpha: 0 });
        const headerTl = gsap.timeline({ paused: true })
            .to(brand, { x: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', clearProps: CLEAR })
            .to(navLinks, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1, clearProps: CLEAR }, 0.15);

        // ---------- 1. Profile card ----------
        {
            const pokes = $(':scope > div:first-child > span:first-child', profile);
            const avatarBtn = $('#avatar-trigger');
            const avatarImg = $('#profile-avatar');
            const h1 = $('h1', profile);
            const sub = $('h1 + p', profile);
            const grid = $(':scope > .grid', profile);
            const rows = $$(':scope > div > *', grid);
            const actions = $$(':scope > div:last-child > *', profile);

            gsap.set(profile, { autoAlpha: 0 });
            const pokesMorph = morph(pokes);

            // skeleton avatar
            avatarBtn.style.position = 'relative';
            const sk = document.createElement('div');
            sk.className = 'skeleton';
            sk.setAttribute('aria-hidden', 'true');
            avatarBtn.appendChild(sk);
            gsap.set(avatarImg, { autoAlpha: 0 });

            // decoded name + subtitle
            const { span: nameEl, text: nameText } = wrapText(h1);
            const BLOCKS = '▓▒░█';
            nameEl.textContent = Array.from(nameText, (_, i) => BLOCKS[i % 4]).join('');
            const subText = sub.textContent.replace(/\s+/g, ' ').trim();
            sub.textContent = Array.from(subText, (c) => (c === ' ' ? ' ' : Math.round(Math.random()))).join('');

            gsap.set(rows, { x: -40, autoAlpha: 0 });
            gsap.set(actions, { y: 30, autoAlpha: 0 });

            const tl = gsap.timeline({ paused: true });
            tl.to(profile, { autoAlpha: 1, duration: 0.8, ease: 'power2.out', clearProps: 'opacity,visibility' })
                .add(pokesMorph, 0.3)
                .to(sk, { autoAlpha: 0, duration: 0.4, ease: 'power1.out' }, 1.2)
                .to(avatarImg, { autoAlpha: 1, duration: 0.5, clearProps: 'opacity,visibility' }, 1.2)
                .add(() => sk.remove(), 1.7)
                .add(scramble(nameEl, nameText, { chars: 'XO!#', duration: 1.5 }), 0.5)
                .add(scramble(sub, subText, { chars: '01', speed: 0.3, duration: 2.5 }), 0.7)
                .to(rows, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.12, clearProps: CLEAR }, 0.9)
                .to(actions, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.15, clearProps: CLEAR }, 1.5);
            entrance.push({ el: profile, tl });
        }

        // ---------- 2. Projects + services ----------
        {
            const h2 = $('h2', projects);
            const cards = $$(':scope > .grid > a', projects);
            const services = $('#services', projects);
            const heads = $$('h3', services);
            const chips = $$('span.inline-flex', services);
            const galleryBtns = $$(':scope > button', services);

            gsap.set(projects, { autoAlpha: 0 });
            const h2Morph = morph(h2);
            gsap.set(cards, { autoAlpha: 0 });

            const typers = heads.map((h) => {
                const { span, text } = wrapText(h);
                const tn = span.firstChild;
                tn.nodeValue = '';
                return typeText([tn], [text], Math.max(0.6, text.length * 0.045), span);
            });

            gsap.set(chips, { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%' });
            gsap.set(galleryBtns, { y: 30, autoAlpha: 0 });

            const tl = gsap.timeline({ paused: true });
            tl.to(projects, { autoAlpha: 1, duration: 0.7, ease: 'power2.out', clearProps: 'opacity,visibility' })
                .add(h2Morph, 0.2)
                .to(cards, { autoAlpha: 1, duration: 0.5, stagger: 0.15, clearProps: 'opacity,visibility' }, 0.6)
                .add(typers[0], 1.3)
                .add(typers[1], '>')
                .to(chips, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', stagger: 0.06, clearProps: CLEAR }, '>-0.1')
                .to(galleryBtns, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.15, clearProps: CLEAR }, '>-0.2');
            entrance.push({ el: projects, tl });
        }

        // ---------- 3. Socials ----------
        {
            const h2 = $('h2', socials);
            const links = $$('.grid > a', socials); // GitHub, Facebook, LinkedIn, Instagram
            gsap.set(socials, { autoAlpha: 0 });
            const h2Morph = morph(h2);
            links.forEach((a, i) => gsap.set(a, { x: i % 2 === 0 ? -60 : 60, autoAlpha: 0 }));

            const tl = gsap.timeline({ paused: true });
            tl.to(socials, { autoAlpha: 1, duration: 0.7, ease: 'power2.out', clearProps: 'opacity,visibility' })
                .add(h2Morph, 0.2);
            links.forEach((a, i) => {
                tl.to(a, { x: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', clearProps: CLEAR }, 0.6 + i * 0.18);
            });
            entrance.push({ el: socials, tl });
        }

        // ---------- 4. About ----------
        {
            const greeting = $('#greeting-text', about);
            const items = $$('ul > li', about);
            gsap.set(about, { autoAlpha: 0 });
            const greetMorph = morph(greeting);

            const typed = items.map((li) => {
                li.style.minHeight = li.offsetHeight + 'px'; // hold the layout while typing
                const nodes = [];
                const texts = [];
                const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
                let n;
                while ((n = walker.nextNode())) {
                    texts.push(n.nodeValue.replace(/\s+/g, ' '));
                    nodes.push(n);
                    n.nodeValue = '';
                }
                gsap.set(li, { autoAlpha: 0 });
                return { li, tween: typeText(nodes, texts, 4, li) };
            });

            const tl = gsap.timeline({ paused: true });
            tl.to(about, { autoAlpha: 1, duration: 0.7, ease: 'power2.out', clearProps: 'opacity,visibility' })
                .add(greetMorph, 0.2);
            typed.forEach(({ li, tween }, i) => {
                tl.set(li, { autoAlpha: 1 }, i === 0 ? 1.0 : '>')
                    .add(tween, '<')
                    .add(() => { li.style.minHeight = ''; }, '>');
            });
            entrance.push({ el: about, tl });
        }

        // ---------- 5. Contact ----------
        {
            const h3 = $('h3', contact);
            const buttons = $$('.flex > a', contact);
            gsap.set(contact, { autoAlpha: 0 });
            const h3Morph = morph(h3);
            gsap.set(buttons, { x: 140, autoAlpha: 0 });

            const tl = gsap.timeline({ paused: true });
            tl.to(contact, { autoAlpha: 1, duration: 0.7, ease: 'power2.out', clearProps: 'opacity,visibility' })
                .add(h3Morph, 0.2)
                .to(buttons, { x: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', stagger: 0.15, clearProps: 'opacity,visibility' }, 0.6);
            if (CONTACT_LOOP) {
                tl.add(() => {
                    gsap.to(buttons, { x: -6, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.2 });
                });
            }
            entrance.push({ el: contact, tl });
        }

        // Everything is in its start state: reveal the page, then play once loaded
        root.classList.remove('anim-pending');

        let remaining = entrance.length;
        entrance.forEach(({ tl }) => tl.eventCallback('onComplete', () => {
            if (--remaining === 0) root.classList.remove('anim-run');
        }));

        const loaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise((r) => window.addEventListener('load', r, { once: true }));
        const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        const ready = Promise.race([Promise.all([loaded, fonts]), new Promise((r) => setTimeout(r, 4000))]);

        ready.then(() => {
            headerTl.play();
            const io = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    const item = entrance.find((x) => x.el === e.target);
                    if (item) item.tl.play();
                    io.unobserve(e.target);
                });
            }, { threshold: 0.1 });
            entrance.forEach(({ el }) => io.observe(el));
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
