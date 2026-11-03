// Interactive scripts for developer card portfolio

document.addEventListener('DOMContentLoaded', () => {

    // Browser-local counters. A shared total requires a configured server-side counter service.
    const pokeCountElement = document.getElementById('poke-count-text');
    const visitCountElement = document.getElementById('visit-count-text');
    const pokeButton = document.getElementById('btn-poke');
    const counterStatus = document.getElementById('counter-status');
    const pokeStorageKey = 'portfolio-pokes';
    const visitStorageKey = 'portfolio-visits';
    let pokeCount = 0;
    let counterStatusTimer;

    function readStoredCount(key) {
        const storedValue = localStorage.getItem(key);
        if (storedValue === null) return 0;

        const count = Number(storedValue);
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error(`Invalid stored counter value for ${key}.`);
        }
        return count;
    }

    function formatCount(count) {
        return new Intl.NumberFormat().format(count);
    }

    function showCounterStatus(message) {
        counterStatus.textContent = message;
    }

    try {
        pokeCount = readStoredCount(pokeStorageKey);
        const visitCount = readStoredCount(visitStorageKey) + 1;
        if (!Number.isSafeInteger(visitCount)) {
            throw new RangeError('The visit counter has reached its maximum value.');
        }

        localStorage.setItem(visitStorageKey, String(visitCount));
        pokeCountElement.textContent = `${formatCount(pokeCount)} pokes`;
        visitCountElement.textContent = `Visits on this browser: ${formatCount(visitCount)}`;
    } catch (error) {
        console.error('Unable to initialize the portfolio counters:', error);
        showCounterStatus('Counters unavailable in this browser.');
        pokeButton.disabled = true;
    }

    pokeButton.addEventListener('click', () => {
        try {
            if (!Number.isSafeInteger(pokeCount + 1)) {
                throw new RangeError('The poke counter has reached its maximum value.');
            }

            pokeCount += 1;
            localStorage.setItem(pokeStorageKey, String(pokeCount));
            pokeCountElement.textContent = `${formatCount(pokeCount)} pokes`;
            showCounterStatus('Thanks for the poke!');
            pokeButton.classList.remove('is-poked');
            void pokeButton.offsetWidth;
            pokeButton.classList.add('is-poked');
            window.clearTimeout(counterStatusTimer);
            counterStatusTimer = window.setTimeout(() => {
                showCounterStatus('');
                pokeButton.classList.remove('is-poked');
            }, 1200);
        } catch (error) {
            window.clearTimeout(counterStatusTimer);
            console.error('Unable to save the portfolio poke:', error);
            showCounterStatus('Unable to save your poke in this browser.');
            pokeButton.disabled = true;
        }
    });

    // 0. Avatar image lightbox
    const avatarTrigger = document.getElementById('avatar-trigger');
    const avatar = document.getElementById('profile-avatar');
    const lightbox = document.getElementById('avatar-lightbox');
    const lightboxImage = document.getElementById('avatar-lightbox-image');
    const lightboxClose = document.getElementById('avatar-lightbox-close');
    let lightboxIsOpen = false;
    let avatarBounds;

    if (avatarTrigger && avatar && lightbox && lightboxImage && lightboxClose) {
        let closeTimer;

        function setImageBounds(bounds) {
            lightboxImage.style.left = `${bounds.left}px`;
            lightboxImage.style.top = `${bounds.top}px`;
            lightboxImage.style.width = `${bounds.width}px`;
            lightboxImage.style.height = `${bounds.height}px`;
        }

        function getExpandedBounds() {
            const naturalWidth = lightboxImage.naturalWidth || avatar.naturalWidth;
            const naturalHeight = lightboxImage.naturalHeight || avatar.naturalHeight;
            const aspectRatio = naturalWidth / naturalHeight;
            const maxWidth = window.innerWidth * 0.9;
            const maxHeight = window.innerHeight * 0.84;
            const width = Math.min(maxWidth, maxHeight * aspectRatio);
            const height = width / aspectRatio;

            return {
                left: (window.innerWidth - width) / 2,
                top: (window.innerHeight - height) / 2,
                width,
                height
            };
        }

        function openLightbox() {
            if (lightboxIsOpen) return;
            lightboxIsOpen = true;
            clearTimeout(closeTimer);

            avatarBounds = avatar.getBoundingClientRect();
            lightboxImage.src = avatar.currentSrc || avatar.src;
            lightbox.setAttribute('aria-hidden', 'false');
            lightbox.classList.add('is-visible');
            lightboxImage.style.objectFit = 'cover';
            setImageBounds(avatarBounds);
            document.body.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                lightbox.classList.add('is-open');
                lightboxImage.style.objectFit = 'contain';
                setImageBounds(getExpandedBounds());
                lightboxClose.focus();
            });
        }

        function closeLightbox() {
            if (!lightboxIsOpen) return;
            lightboxIsOpen = false;

            lightbox.classList.remove('is-open');
            lightboxImage.style.objectFit = 'cover';
            setImageBounds(avatarBounds);
            document.body.style.overflow = '';
            avatarTrigger.focus();

            closeTimer = window.setTimeout(() => {
                lightbox.classList.remove('is-visible');
                lightbox.setAttribute('aria-hidden', 'true');
            }, 330);
        }

        avatarTrigger.addEventListener('click', openLightbox);
        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox || event.target === lightboxImage) {
                closeLightbox();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && lightboxIsOpen) closeLightbox();
        });
    }

    // Highlight the section selected from the sticky navigation or header brand
    const headerElement = document.querySelector('header');
    if (headerElement) {
        let highlightTimer;
        let highlightedSection;

        headerElement.addEventListener('click', (event) => {
            const link = event.target.closest('a[href^="#"]');
            if (!link) return;

            const targetId = link.hash.slice(1);
            if (!targetId) return;

            const section = document.getElementById(targetId);
            if (!section) return;

            if (highlightedSection) highlightedSection.classList.remove('section-highlight');
            void section.offsetWidth; // Trigger reflow to restart animation
            section.classList.add('section-highlight');
            highlightedSection = section;

            clearTimeout(highlightTimer);
            highlightTimer = window.setTimeout(() => {
                if (highlightedSection) {
                    highlightedSection.classList.remove('section-highlight');
                    highlightedSection = null;
                }
            }, 1850);
        });
    }

    // 1. Live Time Ticker (matching local time format)
    const timeElement = document.getElementById('live-time');
    function updateTime() {
        if (!timeElement) return;
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        timeElement.innerHTML = `<span class="text-zinc-500 font-mono">🕒</span> ${timeString} <span class="text-zinc-500 text-xs">// local time</span>`;
    }
    updateTime();
    setInterval(updateTime, 1000);

    // 2. Copy Email Button Handler
    const copyBtn = document.getElementById('btn-copy-email');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const emailText = "kaynekaido99@gmail.com";
            navigator.clipboard.writeText(emailText).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = "<span>Copied!</span>";
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            });
        });
    }

    // 3. Floating blue particle background (profile row)
    const pCanvas = document.getElementById('particle-bg');
    if (pCanvas) {
        const ctx = pCanvas.getContext('2d');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const TAU = Math.PI * 2;
        const LOOP = 14; // seconds; every motion is periodic over this, so it loops seamlessly
        let w = 0, h = 0, particles = [], running = true, raf;

        function rand(a, b) { return a + Math.random() * (b - a); }

        function build() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const rect = pCanvas.getBoundingClientRect();
            w = rect.width; h = rect.height;
            pCanvas.width = Math.round(w * dpr);
            pCanvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.max(40, Math.min(110, Math.round(w * h / 2600)));
            particles = Array.from({ length: count }, () => {
                const depth = Math.random();                 // 0 = far, 1 = near
                return {
                    x: Math.random() * w,
                    y0: Math.random(),                       // phase along the rise
                    r: 0.6 + depth * 2.4,
                    cycles: 1 + Math.floor(depth * 2),       // whole rises per loop
                    swayAmp: rand(6, 26),
                    swayCycles: 1 + Math.floor(Math.random() * 3),
                    phase: Math.random() * TAU,
                    twinkle: 1 + Math.floor(Math.random() * 3),
                    hue: rand(195, 225),
                    depth
                };
            });
        }

        // Dynamic Time-Based Greeting
        function updateGreeting() {
            const greetingElement = document.getElementById('greeting-text');
            if (!greetingElement) return;

            const currentHour = new Date().getHours();
            let greeting = "Good evening!"; // Default for night (18:00 - 04:59)

            if (currentHour >= 5 && currentHour < 12) {
                greeting = "Good morning!";
            } else if (currentHour >= 12 && currentHour < 18) {
                greeting = "Good afternoon!";
            }

            greetingElement.textContent = greeting;
        }

        // Run it immediately when the script loads
        updateGreeting();

        function frame(ms) {
            const t = reduceMotion ? 4 : (ms / 1000) % LOOP;
            const u = t / LOOP;
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'lighter';

            // soft shimmering wave lines (digital-signature feel)
            ctx.lineWidth = 1;
            for (let k = 0; k < 2; k++) {
                ctx.beginPath();
                for (let x = 0; x <= w; x += 6) {
                    const y = h * (0.62 + k * 0.08)
                        + Math.sin((x / w) * TAU * (1.5 + k) + u * TAU * (k + 1)) * 14
                        + Math.sin((x / w) * TAU * 4 - u * TAU * 2) * 5;
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.10 - k * 0.04})`;
                ctx.stroke();
            }

            for (const p of particles) {
                const prog = (p.y0 + u * p.cycles) % 1;      // 0 bottom -> 1 top
                const y = h + 10 - prog * (h + 20);
                const x = p.x + Math.sin(p.phase + u * TAU * p.swayCycles) * p.swayAmp;
                const edge = Math.sin(prog * Math.PI);       // fade in/out at the ends
                const tw = 0.55 + 0.45 * Math.sin(p.phase + u * TAU * p.twinkle);
                const a = edge * tw * (0.35 + p.depth * 0.65);
                if (a <= 0.01) continue;

                const glow = p.r * 6;
                const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
                g.addColorStop(0, `hsla(${p.hue}, 100%, 75%, ${a})`);
                g.addColorStop(0.25, `hsla(${p.hue}, 100%, 60%, ${a * 0.45})`);
                g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(x, y, glow, 0, TAU); ctx.fill();

                // sparkle cross on the brightest, nearest particles
                if (p.depth > 0.7 && tw > 0.85) {
                    const s = p.r * 5 * tw;
                    ctx.strokeStyle = `hsla(${p.hue}, 100%, 90%, ${a * 0.8})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
                    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
                    ctx.stroke();
                }
            }
            ctx.globalCompositeOperation = 'source-over';
            if (running && !reduceMotion) raf = requestAnimationFrame(frame);
        }

        build();
        raf = requestAnimationFrame(frame);
        window.addEventListener('resize', () => { build(); if (reduceMotion) requestAnimationFrame(frame); });

        // Pause when scrolled out of view or tab hidden
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !document.hidden) {
                if (!running) { running = true; raf = requestAnimationFrame(frame); }
            } else { running = false; cancelAnimationFrame(raf); }
        }).observe(pCanvas);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { running = false; cancelAnimationFrame(raf); }
            else if (!running) { running = true; raf = requestAnimationFrame(frame); }
        });
    }

    // 4. Photos / Videos gallery modal + single media viewer
    const galleryModal = document.getElementById('gallery-modal');
    const galleryTitle = document.getElementById('gallery-title');
    const galleryClose = document.getElementById('gallery-close');
    const viewer = document.getElementById('media-viewer');
    const viewerStage = document.getElementById('viewer-stage');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerClose = document.getElementById('viewer-close');
    const viewerPrev = document.getElementById('viewer-prev');
    const viewerNext = document.getElementById('viewer-next');

    if (galleryModal && viewer && viewerStage) {
        const titles = { photos: 'Photos', videos: 'Videos' };
        let activeKind = null;
        let activeItems = [];
        let viewerIndex = 0;
        let galleryTrigger = null;
        let viewerTrigger = null;

        function syncScrollLock() {
            const anyOpen = galleryModal.classList.contains('is-visible') || viewer.classList.contains('is-visible');
            document.body.style.overflow = anyOpen ? 'hidden' : '';
        }

        function showModal(modal) {
            modal.classList.add('is-visible');
            modal.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => modal.classList.add('is-open'));
            syncScrollLock();
        }

        function hideModal(modal) {
            modal.classList.remove('is-open');
            window.setTimeout(() => {
                if (modal.classList.contains('is-open')) return; // reopened meanwhile
                modal.classList.remove('is-visible');
                modal.setAttribute('aria-hidden', 'true');
                syncScrollLock();
            }, 230);
        }

        function openGallery(kind, trigger) {
            activeKind = kind;
            galleryTrigger = trigger;
            galleryTitle.textContent = titles[kind];
            galleryModal.querySelectorAll('.gallery-grid').forEach((grid) => {
                grid.hidden = grid.dataset.gallery !== kind;
            });
            activeItems = Array.from(galleryModal.querySelectorAll(`.gallery-grid[data-gallery="${kind}"] .gallery-item`));
            showModal(galleryModal);
            galleryClose.focus();
        }

        function closeGallery() {
            if (viewer.classList.contains('is-visible')) closeViewer();
            hideModal(galleryModal);
            if (galleryTrigger) galleryTrigger.focus();
        }

        function renderViewer() {
            const item = activeItems[viewerIndex];
            const media = item.querySelector('img, video');
            const src = media.getAttribute('src');
            viewerStage.textContent = '';

            let el;
            if (activeKind === 'videos') {
                el = document.createElement('video');
                el.controls = true;
                el.playsInline = true;
                el.preload = 'auto';
                el.muted = false;          // make sure sound is on
                el.defaultMuted = false;
                el.volume = 1;

                // Explicit MP4 source (H.264 video + AAC audio plays everywhere)
                const source = document.createElement('source');
                source.src = src;
                source.type = 'video/mp4';
                el.appendChild(source);

                // Started from the user's click, so playing with sound is allowed.
                // If a browser still blocks it, the controls stay visible to press play.
                el.addEventListener('loadeddata', () => {
                    const p = el.play();
                    if (p && p.catch) p.catch(() => {});
                }, { once: true });

                // Warn if the file really has no audio track
                el.addEventListener('playing', () => {
                    window.setTimeout(() => {
                        const noAudio =
                            el.mozHasAudio === false ||
                            (typeof el.webkitAudioDecodedByteCount === 'number' && el.webkitAudioDecodedByteCount === 0) ||
                            (el.audioTracks && el.audioTracks.length === 0);
                        if (noAudio && !viewerStage.querySelector('.viewer-note')) {
                            const note = document.createElement('p');
                            note.className = 'viewer-note font-mono';
                            note.textContent = 'This MP4 has no audio track.';
                            viewerStage.appendChild(note);
                        }
                    }, 1200);
                }, { once: true });
            } else {
                el = document.createElement('img');
                el.src = src;
                el.alt = media.alt || `Photo ${viewerIndex + 1}`;
            }
            viewerStage.appendChild(el);
            viewerCounter.textContent = `${viewerIndex + 1} / ${activeItems.length}`;
            const multiple = activeItems.length > 1;
            viewerPrev.hidden = viewerNext.hidden = !multiple;
        }

        function openViewer(index, trigger) {
            viewerIndex = index;
            viewerTrigger = trigger;
            viewer.setAttribute('aria-label', activeKind === 'videos' ? 'Video viewer' : 'Photo viewer');
            renderViewer();
            showModal(viewer);
            viewerClose.focus();
        }

        function closeViewer() {
            const video = viewerStage.querySelector('video');
            if (video) { video.pause(); video.querySelectorAll('source').forEach((x) => x.remove()); video.removeAttribute('src'); video.load(); }
            hideModal(viewer);
            if (viewerTrigger) viewerTrigger.focus();
        }

        function step(dir) {
            viewerIndex = (viewerIndex + dir + activeItems.length) % activeItems.length;
            const video = viewerStage.querySelector('video');
            if (video) video.pause();
            renderViewer();
        }

        document.querySelectorAll('[data-gallery-open]').forEach((btn) => {
            btn.addEventListener('click', () => openGallery(btn.dataset.galleryOpen, btn));
        });

        galleryModal.addEventListener('click', (event) => {
            if (event.target === galleryModal) { closeGallery(); return; }
            const item = event.target.closest('.gallery-item');
            if (item) openViewer(activeItems.indexOf(item), item);
        });
        galleryClose.addEventListener('click', closeGallery);

        viewer.addEventListener('click', (event) => {
            if (event.target === viewer || event.target === viewerStage) closeViewer();
        });
        viewerClose.addEventListener('click', closeViewer);
        viewerPrev.addEventListener('click', () => step(-1));
        viewerNext.addEventListener('click', () => step(1));

        document.addEventListener('keydown', (event) => {
            if (viewer.classList.contains('is-open')) {
                if (event.key === 'Escape') closeViewer();
                else if (event.key === 'ArrowLeft') step(-1);
                else if (event.key === 'ArrowRight') step(1);
            } else if (event.key === 'Escape' && galleryModal.classList.contains('is-open')) {
                closeGallery();
            }
        });
    }

});
