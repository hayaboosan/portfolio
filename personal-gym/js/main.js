/* =========================================================
   臨界 -RINKAI- パーソナルジム  |  main.js
   Vanilla JS — no libraries
   1) header scroll state + hero parallax (unified rAF)
   2) mobile nav   3) FAQ accordion   4) smooth scroll
   5) IntersectionObserver reveal (stagger)
   6) number count-up (prefix/suffix)
   7) accessible form validation (demo submit)
   8) mobile sticky CTA (hide over #cta)
   prefers-reduced-motion is fully respected.
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
  // The single rAF-throttled scroll handler that drives both header state and
  // hero parallax is registered once below (see "UNIFIED SCROLL HANDLER").
  updateHeader();

  /* ---------------------------------------------------------
     2) MOBILE NAV toggle
     --------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');

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

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

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

  // Force a synchronous reflow so the next height change animates.
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

  // Track trigger/panel pairs so one resize handler can service them all.
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

    // Native <button> handles Enter/Space; guard Space to avoid page scroll.
    trigger.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggle();
      }
    });
  });

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
     4) SMOOTH SCROLL for in-page anchors (+ focus move)
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

      // Move focus to a small focusable element (heading) rather than the
      // whole section, so the focus ring does not wrap a viewport-sized block.
      var focusTarget =
        target.querySelector('h1, h2, h3, [tabindex]') || target;

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
     5) INTERSECTION OBSERVER reveal (with grid stagger)
     + 6) NUMBER count-up (triggered on view)
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  var countEls = document.querySelectorAll('.stat__num');

  // No-JS fallback: the final value is the static HTML text content, so the page
  // is fully readable without JS. When JS *will* animate (motion allowed +
  // IntersectionObserver), reset each number to its start state up front so the
  // count-up runs from 0 instead of flashing the final value first.
  function startText(el) {
    return (el.getAttribute('data-prefix') || '') + '0' +
      (el.getAttribute('data-suffix') || '');
  }

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
    // Show final numbers immediately (already the static text, but normalize).
    countEls.forEach(function (el) {
      el.textContent =
        (el.getAttribute('data-prefix') || '') +
        el.getAttribute('data-count') +
        (el.getAttribute('data-suffix') || '');
    });
  } else {
    // Reset to start state before observing so the animation begins from 0.
    countEls.forEach(function (el) {
      el.textContent = startText(el);
    });
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          // Stagger reveals within the same parent grid.
          var siblings = Array.prototype.slice.call(
            el.parentElement.querySelectorAll(':scope > [data-reveal]')
          );
          var index = siblings.indexOf(el);
          var explicitDelay = parseInt(el.getAttribute('data-delay'), 10);
          if (!isNaN(explicitDelay)) {
            el.style.setProperty('--reveal-delay', explicitDelay / 1000 + 's');
          } else if (index > 0) {
            el.style.setProperty('--reveal-delay', index * 0.08 + 's');
          }
          el.classList.add('is-visible');
          obs.unobserve(el);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

    var countObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    countEls.forEach(function (el) {
      countObserver.observe(el);
    });
  }

  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1500;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      var value = Math.round(eased * target);
      el.textContent = prefix + value + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------
     7) UNIFIED SCROLL HANDLER (header state + hero parallax)
     --------------------------------------------------------- */
  var heroImg = document.getElementById('heroImg');
  var enableParallax = heroImg && !prefersReducedMotion;

  function updateParallax() {
    if (!enableParallax) return;
    var offset = Math.min(window.scrollY * 0.18, 50);
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
  updateParallax();

  /* ---------------------------------------------------------
     8) FORM validation + demo submit (no real send)
     --------------------------------------------------------- */
  var form = document.getElementById('reserveForm');
  if (form) {
    var nameInput = document.getElementById('name');
    var emailInput = document.getElementById('email');
    var successMsg = document.getElementById('formSuccess');

    // Loose client-side sanity check only — NOT authoritative. Pairs with the
    // native type="email" check; server-side validation must confirm validity.
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(input, message) {
      var errId = input.getAttribute('aria-describedby');
      var errEl = errId ? document.getElementById(errId) : null;
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

    // Live re-validation once a field has been touched.
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
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Demo success — no real network request.
      form.reset();
      setError(nameInput, '');
      setError(emailInput, '');
      if (successMsg) {
        successMsg.hidden = false;
        successMsg.setAttribute('tabindex', '-1');
        successMsg.focus({ preventScroll: true });
        successMsg.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    });
  }

  /* ---------------------------------------------------------
     9) MOBILE STICKY CTA: hide while the #cta section is visible
        to avoid overlapping the form submit button.
     --------------------------------------------------------- */
  var stickyCta = document.querySelector('.sticky-cta');
  var ctaSection = document.getElementById('cta');
  var footerEl = document.querySelector('.footer');
  if (stickyCta && ctaSection && 'IntersectionObserver' in window) {
    // Hide the floating CTA whenever the form section OR the footer is in view,
    // so it never overlaps the form's submit button or the footer links.
    var hideZones = [ctaSection];
    if (footerEl) hideZones.push(footerEl);
    var inView = new Set();

    var stickyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            inView.add(entry.target);
          } else {
            inView.delete(entry.target);
          }
        });
        stickyCta.classList.toggle('is-hidden', inView.size > 0);
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    );
    hideZones.forEach(function (zone) {
      stickyObserver.observe(zone);
    });
  }
})();
