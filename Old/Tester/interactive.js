// Interactive credentials marquee (moved from interactive.html). Inline handlers in index.html use the window.* exports below.
(function () {
    // Initial Credentials Data
    const defaultCredentials = [
      { id: 1, title: 'PMP® Certification', issuer: 'PMI Institute', icon: 'ph-certificate', color: 'emerald' },
      { id: 2, title: 'Cloud Architect', issuer: 'Google Cloud', icon: 'ph-cloud', color: 'sky' },
      { id: 3, title: 'Deep Learning Specialization', issuer: 'NVIDIA Academy', icon: 'ph-cpu', color: 'purple' },
      { id: 4, title: 'LLM & Prompt Eng', issuer: 'OpenAI / Claude', icon: 'ph-brain', color: 'amber' },
      { id: 5, title: 'Cyber Security Lead', issuer: 'CISSP Certified', icon: 'ph-shield-check', color: 'rose' },
      { id: 6, title: 'Full-Stack Developer', issuer: 'Meta Frontend', icon: 'ph-code', color: 'sky' },
      { id: 7, title: 'DevOps Professional', issuer: 'AWS Certified', icon: 'ph-cloud', color: 'purple' },
      { id: 8, title: 'Agile Scrum Master', issuer: 'Scrum.org', icon: 'ph-trophy', color: 'emerald' }
    ];

    let credentialsList = [...defaultCredentials];
    let scrollDuration = 30; // Seconds
    let isReversed = false;
    let isPlaying = true;
    let pauseOnHover = true;

    // Color Maps for Dynamic Styling
    const colorStyles = {
      sky: { border: 'hover:border-sky-500/50', icon: 'text-sky-400', bg: 'bg-sky-500/10', glow: 'hover:shadow-sky-500/20' },
      emerald: { border: 'hover:border-emerald-500/50', icon: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'hover:shadow-emerald-500/20' },
      purple: { border: 'hover:border-purple-500/50', icon: 'text-purple-400', bg: 'bg-purple-500/10', glow: 'hover:shadow-purple-500/20' },
      amber: { border: 'hover:border-amber-500/50', icon: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'hover:shadow-amber-500/20' },
      rose: { border: 'hover:border-rose-500/50', icon: 'text-rose-400', bg: 'bg-rose-500/10', glow: 'hover:shadow-rose-500/20' }
    };

    const marqueeTrack = document.getElementById('marqueeTrack');
    const marqueeContainer = document.getElementById('marqueeContainer');

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Render Badge Card HTML
    function createBadgeCardHTML(item) {
      const theme = colorStyles[item.color] || colorStyles.sky;
      return `
        <div class="glass-badge flex items-center gap-3.5 px-5 py-3.5 rounded-2xl cursor-pointer select-none group min-w-[240px] ${theme.border} ${theme.glow}" data-badge-title="${esc(item.title)}" data-badge-issuer="${esc(item.issuer)}">
          <div class="w-10 h-10 rounded-xl ${theme.bg} flex items-center justify-center ${theme.icon} text-xl shrink-0 group-hover:scale-110 transition-transform">
            <i class="ph-bold ${item.icon}"></i>
          </div>
          <div class="flex flex-col">
            <span class="text-white font-semibold text-sm tracking-tight group-hover:text-sky-300 transition-colors">${esc(item.title)}</span>
            <span class="text-xs text-gray-400 font-medium">${esc(item.issuer)}</span>
          </div>
          <div class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
            <i class="ph-bold ph-arrow-up-right text-xs"></i>
          </div>
        </div>
      `;
    }

    // Build Marquee Track with Duplicate Items for Continuous Loop
    function renderMarquee() {
      // Clear track
      marqueeTrack.innerHTML = '';

      // Generate items HTML
      const itemsHTML = credentialsList.map(item => createBadgeCardHTML(item)).join('');

      // We duplicate the dataset twice to create a perfectly seamless scroll reset
      marqueeTrack.innerHTML = itemsHTML + itemsHTML;

      // Update Marquee Dynamic CSS Keyframes / Animations
      applyKeyframes();

      // Update badge count
      document.getElementById('badgeCounter').innerText = `Total Badges: ${credentialsList.length}`;
    }

    // Inject Custom Keyframe animation based on current track width & settings
    function applyKeyframes() {
      // Remove existing dynamic style tag if exists
      const existingStyle = document.getElementById('dynamicMarqueeStyle');
      if (existingStyle) existingStyle.remove();

      const directionKey = isReversed ? 'marqueeReverse' : 'marqueeNormal';
      const fromPos = isReversed ? '-50%' : '0%';
      const toPos = isReversed ? '0%' : '-50%';

      const style = document.createElement('style');
      style.id = 'dynamicMarqueeStyle';
      style.innerHTML = `
        @keyframes ${directionKey} {
          0% { transform: translateX(${fromPos}); }
          100% { transform: translateX(${toPos}); }
        }
        
        .marquee-track {
          animation: ${directionKey} ${scrollDuration}s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // Controls Logic
    function togglePlayPause() {
      isPlaying = !isPlaying;
      const playIcon = document.getElementById('playIcon');
      const playText = document.getElementById('playText');
      const statusLabel = document.getElementById('statusLabel');

      if (isPlaying) {
        marqueeContainer.classList.remove('paused');
        playIcon.className = 'ph-bold ph-pause text-sky-400';
        playText.innerText = 'Pause';
        statusLabel.innerText = 'RUNNING';
        statusLabel.className = 'text-emerald-400 font-bold';
      } else {
        marqueeContainer.classList.add('paused');
        playIcon.className = 'ph-bold ph-play text-sky-400';
        playText.innerText = 'Play';
        statusLabel.innerText = 'PAUSED';
        statusLabel.className = 'text-amber-400 font-bold';
      }
    }

    function toggleDirection() {
      isReversed = !isReversed;
      document.getElementById('dirValueLabel').innerText = isReversed ? 'REVERSED' : 'NORMAL';
      applyKeyframes();
      showToast(isReversed ? 'Marquee direction reversed' : 'Marquee set to normal direction');
    }

    function updateSpeed(val) {
      scrollDuration = val;
      document.getElementById('sliderValDisplay').innerText = `${val}s`;
      document.getElementById('speedValueLabel').innerText = `${val}s`;
      applyKeyframes();
    }

    function togglePauseOnHoverSetting(enabled) {
      pauseOnHover = enabled;
      if (pauseOnHover) {
        marqueeContainer.addEventListener('mouseenter', handleMouseEnter);
        marqueeContainer.addEventListener('mouseleave', handleMouseLeave);
      } else {
        marqueeContainer.removeEventListener('mouseenter', handleMouseEnter);
        marqueeContainer.removeEventListener('mouseleave', handleMouseLeave);
        if (isPlaying) marqueeContainer.classList.remove('paused');
      }
    }

    function handleMouseEnter() {
      if (pauseOnHover && isPlaying) {
        marqueeContainer.classList.add('paused');
      }
    }

    function handleMouseLeave() {
      if (pauseOnHover && isPlaying) {
        marqueeContainer.classList.remove('paused');
      }
    }

    // Add New Badge Form Handler
    function handleBadgeSubmit(e) {
      e.preventDefault();
      const title = document.getElementById('badgeTitleInput').value.trim();
      const issuer = document.getElementById('badgeIssuerInput').value.trim();
      const icon = document.getElementById('badgeIconSelect').value;
      const color = document.getElementById('badgeColorSelect').value;

      if (!title || !issuer) return;

      const newBadge = {
        id: Date.now(),
        title,
        issuer,
        icon,
        color
      };

      credentialsList.push(newBadge);
      renderMarquee();

      // Reset Form
      document.getElementById('badgeTitleInput').value = '';
      document.getElementById('badgeIssuerInput').value = '';

      showToast(`Added "${title}" badge!`);
    }

    function resetDefaultBadges() {
      credentialsList = [...defaultCredentials];
      renderMarquee();
      showToast('Reset to default credentials');
    }

    function showBadgeDetails(title, issuer) {
      showToast(`Selected: ${title} (${issuer})`);
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.innerText = msg;
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 2500);
    }

    // Initialization on Page Load
    renderMarquee();
    marqueeContainer.addEventListener('mouseenter', handleMouseEnter);
    marqueeContainer.addEventListener('mouseleave', handleMouseLeave);
    marqueeTrack.addEventListener('click', (e) => {
      const c = e.target.closest('[data-badge-title]');
      if (c) showBadgeDetails(c.dataset.badgeTitle, c.dataset.badgeIssuer);
    });

  window.togglePlayPause = togglePlayPause;
  window.toggleDirection = toggleDirection;
  window.updateSpeed = updateSpeed;
  window.togglePauseOnHoverSetting = togglePauseOnHoverSetting;
  window.handleBadgeSubmit = handleBadgeSubmit;
  window.resetDefaultBadges = resetDefaultBadges;
})();
