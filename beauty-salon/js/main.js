/* =========================================================
   月白 -Tsukishiro- アトリエ  |  main.js
   Vanilla JS — no libraries
   1) mobile nav   2) FAQ accordion   3) smooth scroll
   4) IntersectionObserver reveal     5) form validation
   ========================================================= */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ---------------------------------------------------------
     1) HEADER: transparent -> filled on scroll
     --------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  // NOTE: the single, rAF-throttled scroll handler that drives both the header
  // state and the hero parallax is registered once at the end of this module
  // (see "UNIFIED SCROLL HANDLER"). updateHeader() is called there.
  updateHeader();

  /* ---------------------------------------------------------
     2) MOBILE NAV toggle
     --------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');

  // backdrop element
  var backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  document.body.appendChild(backdrop);

  function openNav() {
    navMenu.classList.add('is-open');
    backdrop.classList.add('is-active');
    document.body.classList.add('nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'メニューを閉じる');
  }
  function closeNav() {
    navMenu.classList.remove('is-open');
    backdrop.classList.remove('is-active');
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
  }
  function toggleNav() {
    if (navToggle.getAttribute('aria-expanded') === 'true') {
      closeNav();
    } else {
      openNav();
    }
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', toggleNav);
    backdrop.addEventListener('click', closeNav);

    // close on link click
    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    // close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

    // reset nav state if resized to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760 && navMenu.classList.contains('is-open')) {
        closeNav();
      }
    });
  }

  /* ---------------------------------------------------------
     3) FAQ ACCORDION (click + Enter/Space, aria-expanded)
     --------------------------------------------------------- */
  var triggers = document.querySelectorAll('.accordion__trigger');

  // Force a synchronous reflow so the next height change animates. Named so the
  // intent is explicit rather than a bare `panel.offsetHeight;` expression.
  function forceReflow(el) {
    return el.offsetHeight;
  }

  // Remove the panel's pending transitionend listener, if any. An interrupted
  // open (quick re-click before the 0.5s transition finishes) fires
  // transitioncancel — not transitionend — so the stale handler would survive
  // and set height:auto when the close transition completes, snapping the
  // panel open while its trigger still shows aria-expanded="false".
  function clearPanelListener(panel) {
    if (panel._accDone) {
      panel.removeEventListener('transitionend', panel._accDone);
      panel._accDone = null;
    }
  }

  function closePanel(panel) {
    clearPanelListener(panel);
    panel.style.height = panel.scrollHeight + 'px';
    forceReflow(panel);
    panel.style.height = '0px';
  }
  function openPanel(panel) {
    clearPanelListener(panel);
    panel.style.height = panel.scrollHeight + 'px';
    // after transition, set to auto so it adapts to content
    var done = function () {
      panel.style.height = 'auto';
      clearPanelListener(panel);
    };
    if (prefersReducedMotion) {
      panel.style.height = 'auto';
    } else {
      panel._accDone = done;
      panel.addEventListener('transitionend', done);
    }
  }

  // Track trigger/panel pairs so a single resize handler can service them all
  // instead of registering one resize listener per accordion item.
  var accordionPairs = [];

  triggers.forEach(function (trigger) {
    var panelId = trigger.getAttribute('aria-controls');
    var panel = document.getElementById(panelId);
    if (!panel) return;

    accordionPairs.push({ trigger: trigger, panel: panel });

    function toggle() {
      var isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        closePanel(panel);
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        openPanel(panel);
      }
    }

    trigger.addEventListener('click', toggle);

    // Native <button> handles Enter/Space, but guard for robustness
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Single resize handler: keep every open panel's height correct.
  if (accordionPairs.length) {
    window.addEventListener('resize', function () {
      accordionPairs.forEach(function (pair) {
        if (pair.trigger.getAttribute('aria-expanded') === 'true') {
          pair.panel.style.height = 'auto';
        }
      });
    });
  }

  /* ---------------------------------------------------------
     4) SMOOTH SCROLL for in-page anchors
     (respects reduced motion; native smooth otherwise)
     --------------------------------------------------------- */
  var anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });

      // Move focus for accessibility. Prefer a small focusable element (the
      // section heading) over the large section/main itself so the focus ring
      // does not wrap an entire viewport-sized block.
      var focusTarget =
        target.querySelector('h1, h2, h3, [tabindex]') || target;

      // Only inject a temporary tabindex when the element is not already
      // focusable, and remove it on blur so no DOM trace remains and the Tab
      // order is unaffected afterwards.
      var injectedTabindex = false;
      if (!focusTarget.hasAttribute('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
        injectedTabindex = true;
      }
      focusTarget.focus({ preventScroll: true });
      if (injectedTabindex) {
        focusTarget.addEventListener('blur', function onBlur() {
          focusTarget.removeAttribute('tabindex');
          focusTarget.removeEventListener('blur', onBlur);
        });
      }
    });
  });

  /* ---------------------------------------------------------
     5) SPLIT TEXT (per-character heading reveal)
     --------------------------------------------------------- */
  var splitEls = document.querySelectorAll('[data-split]');
  splitEls.forEach(function (el) {
    if (prefersReducedMotion) return;
    var text = el.textContent;
    // Preserve the original text as the accessible name so screen readers,
    // copy/paste, browser translation and SEO see the intact heading rather
    // than a string of single-character spans.
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    var visibleIndex = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === ' ' || ch === '　') {
        frag.appendChild(document.createTextNode(ch));
        continue;
      }
      var span = document.createElement('span');
      span.className = 'char';
      // Hide the decorative per-character spans from assistive tech; the
      // aria-label on the parent carries the real text.
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch;
      span.style.setProperty('--char-delay', visibleIndex * 50 + 'ms');
      frag.appendChild(span);
      visibleIndex++;
    }
    el.appendChild(frag);
  });

  /* ---------------------------------------------------------
     6) INTERSECTION OBSERVER reveal
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('[data-reveal], [data-split]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var delay = parseInt(el.getAttribute('data-delay'), 10) || 0;
            if (delay) {
              setTimeout(function () {
                el.classList.add('is-visible');
              }, delay);
            } else {
              el.classList.add('is-visible');
            }
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------------
     7) UNIFIED SCROLL HANDLER (header state + hero parallax)
        A single rAF-throttled scroll listener services every
        scroll-driven effect, instead of registering one listener
        per feature.
     --------------------------------------------------------- */
  var heroImg = document.getElementById('heroImg');
  var enableParallax = heroImg && !prefersReducedMotion;

  function updateParallax() {
    if (!enableParallax) return;
    var offset = Math.min(window.scrollY * 0.18, 40);
    heroImg.style.transform = 'translateY(' + offset + 'px)';
  }

  var scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      updateHeader();
      updateParallax();
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  // run once on init so initial state/transform are correct
  updateParallax();

  /* ---------------------------------------------------------
     8) FORM validation + demo submit (no real send)
     --------------------------------------------------------- */
  var form = document.getElementById('reserveForm');
  if (form) {
    var nameInput = document.getElementById('name');
    var emailInput = document.getElementById('email');
    var successMsg = document.getElementById('formSuccess');

    // Lightweight client-side sanity check only. This pattern is deliberately
    // loose: it accepts values like "a@b.c" and rejects some valid addresses
    // (e.g. internationalized/IDN domains). It pairs with the native
    // type="email" check and must NOT be treated as authoritative — the real
    // address validity has to be confirmed by server-side validation before
    // any reservation is accepted.
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(input, message) {
      var errId = input.getAttribute('aria-describedby');
      var errEl = document.getElementById(errId);
      if (message) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (errEl) errEl.textContent = message;
      } else {
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        if (errEl) errEl.textContent = '';
      }
    }

    function validateName() {
      var v = nameInput.value.trim();
      if (!v) {
        setError(nameInput, 'お名前をご入力ください。');
        return false;
      }
      setError(nameInput, '');
      return true;
    }
    function validateEmail() {
      var v = emailInput.value.trim();
      if (!v) {
        setError(emailInput, 'メールアドレスをご入力ください。');
        return false;
      }
      if (!emailRe.test(v)) {
        setError(emailInput, 'メールアドレスの形式をご確認ください。');
        return false;
      }
      setError(emailInput, '');
      return true;
    }

    // live re-validation once a field has been touched
    nameInput.addEventListener('input', function () {
      if (nameInput.classList.contains('is-invalid')) validateName();
    });
    emailInput.addEventListener('input', function () {
      if (emailInput.classList.contains('is-invalid')) validateEmail();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var okName = validateName();
      var okEmail = validateEmail();

      if (!okName || !okEmail) {
        if (successMsg) successMsg.hidden = true;
        // focus first invalid field
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // demo success — no real network request
      form.reset();
      setError(nameInput, '');
      setError(emailInput, '');
      if (successMsg) {
        successMsg.hidden = false;
        successMsg.focus({ preventScroll: true });
        successMsg.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    });
  }

  /* ---------------------------------------------------------
     9) Footer year (keeps copyright fresh)
     --------------------------------------------------------- */
  // (Static 2026 in markup; left intentionally for portfolio.)
})();
