// Resume modal: opens "Resume/My Resume.pdf" in the site's modal theme.
//
// Desktop browsers show the PDF in the native viewer (<iframe>).
// Phones/tablets (and any browser without an inline PDF viewer) can't render a PDF inside an
// <iframe> - Chrome on Android only shows a "My Resume.pdf [Open]" placeholder - so there the
// pages are drawn onto <canvas> elements with PDF.js instead.
(function () {
    const trigger = document.getElementById('resume-trigger');
    const modal = document.getElementById('resume-modal');
    const closeBtn = document.getElementById('resume-close');
    const frame = document.getElementById('resume-frame');
    const pages = document.getElementById('resume-pages');
    const status = document.getElementById('resume-status');
    const openLink = document.getElementById('resume-open');
    if (!trigger || !modal || !closeBtn || !frame) return;

    const PDFJS_SOURCES = [
        {
            lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        },
        {
            lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
            worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
        }
    ];

    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac
    const usePdfJs = !!pages && (isMobile || navigator.pdfViewerEnabled === false);
    const pdfUrl = new URL((frame.dataset.src || '').split('#')[0], document.baseURI).href;

    let isOpen = false;
    let started = false;
    let pdfDoc = null;
    let renderToken = 0;
    let renderedWidth = 0;
    let needsRerender = false;

    /* ---------- PDF.js loading ---------- */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Could not load ' + src));
            document.head.appendChild(s);
        });
    }

    let pdfJsPromise = null;
    function loadPdfJs() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (!pdfJsPromise) {
            pdfJsPromise = (async () => {
                for (const source of PDFJS_SOURCES) {
                    try {
                        await loadScript(source.lib);
                        if (window.pdfjsLib) {
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = source.worker;
                            return window.pdfjsLib;
                        }
                    } catch (err) { console.warn(err); }
                }
                throw new Error('PDF.js could not be loaded.');
            })().catch((err) => { pdfJsPromise = null; throw err; });
        }
        return pdfJsPromise;
    }

    /* ---------- Rendering (phones) ---------- */
    function showFailure() {
        if (status) status.textContent = 'Couldn\u2019t preview the PDF here. Use Download Resume above, or open it in a new tab.';
        if (openLink) openLink.hidden = false;
    }

    async function renderPages() {
        if (!pdfDoc) return;
        const available = pages.clientWidth -
            parseFloat(getComputedStyle(pages).paddingLeft) - parseFloat(getComputedStyle(pages).paddingRight);
        if (available <= 0) { needsRerender = true; return; }

        const token = ++renderToken;
        renderedWidth = available;
        needsRerender = false;
        pages.textContent = '';
        pages.classList.remove('is-ready');

        const ratio = Math.min(window.devicePixelRatio || 1, 3); // crisp text, bounded memory
        for (let n = 1; n <= pdfDoc.numPages; n++) {
            const page = await pdfDoc.getPage(n);
            if (token !== renderToken) return; // a newer render started
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: (available / base.width) * ratio });

            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Resume page ' + n + ' of ' + pdfDoc.numPages);
            pages.appendChild(canvas);

            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            if (token !== renderToken) return;
            if (n === 1) pages.classList.add('is-ready'); // reveal as soon as page 1 is drawn
        }
    }

    async function startPdfJs() {
        if (status) status.textContent = 'Loading resume\u2026';
        frame.hidden = true; // the native iframe would only show Chrome's "Open" placeholder
        try {
            const lib = await loadPdfJs();
            pdfDoc = await lib.getDocument({ url: pdfUrl }).promise;
            await renderPages();
        } catch (err) {
            console.error('Resume preview failed:', err);
            if (!pages.classList.contains('is-ready')) {
                started = false; // let the next open try again
                showFailure();
            }
        }
    }

    function startPreview() {
        if (started) return;
        started = true;
        if (usePdfJs) startPdfJs();
        else if (!frame.getAttribute('src')) frame.setAttribute('src', frame.dataset.src); // load once, on first open
    }

    // Phone rotated / window resized: redraw the pages to the new width
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        if (!usePdfJs || !pdfDoc) return;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (!isOpen) { needsRerender = true; return; }
            if (Math.abs(pages.clientWidth - 24 - renderedWidth) > 24) renderPages();
        }, 250);
    });

    /* ---------- Modal open / close ---------- */
    function open() {
        if (isOpen) return;
        isOpen = true;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('is-visible');
        document.body.classList.add('modal-open');
        startPreview(); // after the modal is displayed, so the width can be measured
        if (usePdfJs && pdfDoc && needsRerender) renderPages();
        requestAnimationFrame(() => {
            modal.classList.add('is-open');
            closeBtn.focus();
        });
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        modal.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
        trigger.focus();
        setTimeout(() => { if (!isOpen) modal.classList.remove('is-visible'); }, 240);
    }

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });
})();
