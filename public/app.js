// app.js — Modal + Android highlight + safe guards + keyboard close
(function () {
  // Helper to run when DOM ready if script not deferred
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // Responsive hamburger menu (<=524px) — toggle + outside click + keyboard
  (function () {
    function ready(fn) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
      else fn();
    }

    ready(function () {
      const toggle = document.getElementById('navToggle');
      const menu = document.getElementById('mobileMenu');

      if (!toggle || !menu) return;

      function openMenu() {
        toggle.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        menu.classList.add('open');
        menu.setAttribute('aria-hidden', 'false');
        // move focus to first menu item for a11y
        const first = menu.querySelector('a');
        if (first) first.focus();
      }
      function closeMenu() {
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
        // return focus to toggle
        toggle.focus();
      }

      toggle.addEventListener('click', function (e) {
        const isOpen = toggle.classList.contains('open');
        if (isOpen) closeMenu(); else openMenu();
      });

      // close when clicking outside
      document.addEventListener('click', function (e) {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) {
          if (menu.classList.contains('open')) closeMenu();
        }
      });

      // close on Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
      });

      // on resize: if viewport >524, ensure menu closed and desktop nav visible
      window.addEventListener('resize', function () {
        if (window.matchMedia('(min-width: 525px)').matches) {
          // force close if open
          if (menu.classList.contains('open')) closeMenu();
        }
      }, { passive: true });
    });
  })();


  ready(function () {
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modalImg');
    const closeBtn = document.getElementById('modalClose');

    /* -------------------------
       Mobile-detect highlight for Android download button
       ------------------------- */
    (function () {
      function findAndroidButton() {
        let btn = document.getElementById('download-android');
        if (btn) return btn;
        btn = document.querySelector('a[href*="android" i]');
        if (btn) return btn;
        btn = document.querySelector('.btn.outline');
        return btn;
      }

      function updateAndroidHighlight() {
        const btn = findAndroidButton();
        if (!btn) return;
        const isMobile = window.matchMedia('(max-width: 800px)').matches;
        if (isMobile) {
          btn.classList.add('android-highlight');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', 'Download CloudBeatz for Android — recommended for mobile');
        } else {
          btn.classList.remove('android-highlight');
          btn.removeAttribute('aria-pressed');
          btn.removeAttribute('aria-label');
        }
      }

      // initial + reactive
      updateAndroidHighlight();
      window.addEventListener('resize', () => requestAnimationFrame(updateAndroidHighlight));
      window.addEventListener('orientationchange', () => setTimeout(updateAndroidHighlight, 200));
    })();

    /* -------------------------
       Modal behaviour (safe)
       ------------------------- */
    function openModal(src) {
      if (!modal || !modalImg) return;
      modalImg.src = src || '';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      // lock background scroll
      document.documentElement.style.overflow = 'hidden';
      // move focus to close button for keyboard users
      const close = document.getElementById('modalClose');
      if (close) close.focus();
    }

    function closeModal() {
      if (!modal || !modalImg) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      modalImg.src = '';
      document.documentElement.style.overflow = '';
      // restore focus to last interactive element is left as an exercise (you can store it)
    }

    // attach click listeners to images (if they exist)
    const imgs = document.querySelectorAll('.screens-grid img, .scroller-track img');
    if (imgs && imgs.length) {
      imgs.forEach(img => {
        // protect against images that don't exist or have no src
        img.addEventListener('click', () => {
          const src = img.dataset.full || img.src;
          if (src) openModal(src);
        });
      });
    }

    // close handlers (if elements exist)
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        // clicking backdrop closes modal (but not clicks on the image)
        if (e.target === modal) closeModal();
      });
    }

    // keyboard escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
        closeModal();
      }
    });

    /* -------------------------
       Smooth-scroll for anchors
       ------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

    /* -------------------------
       Optional: image fallback replacement for broken images
       ------------------------- */
    document.querySelectorAll('.screens-grid img, .scroller-track img, .mockup-img').forEach(img => {
      img.addEventListener('error', () => {
        // if already replaced, skip
        if (img.dataset.replaced === '1') return;
        const wrapper = document.createElement('div');
        wrapper.className = 'ss-card fallback-card';
        wrapper.innerHTML = `
          <div class="fallback" role="img" aria-label="Preview unavailable">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="opacity:.95;margin-right:10px">
              <rect width="24" height="24" rx="4" fill="rgba(255,255,255,0.04)"></rect>
              <path d="M6 14l3-3 2 2 4-5 3 4" stroke="white" stroke-opacity="0.6" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <div style="font-weight:700;color:#e6eef6">Preview unavailable</div>
              <div style="color:var(--muted);font-size:13px">image missing</div>
            </div>
          </div>`;
        img.replaceWith(wrapper);
        img.dataset.replaced = '1';
      });
    });
  }); // ready end
})();
