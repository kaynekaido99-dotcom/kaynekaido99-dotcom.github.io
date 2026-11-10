// Resume modal: opens "Resume/My Resume.pdf" in the site's modal theme.
(function () {
    const trigger = document.getElementById('resume-trigger');
    const modal = document.getElementById('resume-modal');
    const closeBtn = document.getElementById('resume-close');
    const frame = document.getElementById('resume-frame');
    if (!trigger || !modal || !closeBtn || !frame) return;

    let isOpen = false;

    function open() {
        if (isOpen) return;
        isOpen = true;
        if (!frame.getAttribute('src')) frame.setAttribute('src', frame.dataset.src); // load once, on first open
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('is-visible');
        document.body.classList.add('modal-open');
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
