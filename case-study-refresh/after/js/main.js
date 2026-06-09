/* =========================================================
   わかば整骨院  |  main.js  （改修後 / After）
   Vanilla JS — no libraries
   1) header state  2) mobile nav  3) smooth scroll
   4) IntersectionObserver reveal   5) hero parallax
   6) accessible form validation
   すべて progressive enhancement：JS無効でも全コンテンツは利用可能。
   ========================================================= */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ---------------------------------------------------------
     1) HEADER state on scroll（影を濃くするだけ）
     --------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 30);
  }
  updateHeader();

  /* ---------------------------------------------------------
     2) MOBILE NAV drawer
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
    if (navToggle.getAttribute('aria-expanded') === 'true') closeNav();
    else openNav();
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
     3) SMOOTH SCROLL for in-page anchors（＋フォーカス移動）
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

      // アクセシビリティ：見出しへフォーカスを移す
      var focusTarget = target.querySelector('h1, h2, h3, [tabindex]') || target;
      var injected = false;
      if (!focusTarget.hasAttribute('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
        injected = true;
      }
      focusTarget.focus({ preventScroll: true });
      if (injected) {
        focusTarget.addEventListener('blur', function onBlur() {
          focusTarget.removeAttribute('tabindex');
          focusTarget.removeEventListener('blur', onBlur);
        });
      }
    });
  });

  /* ---------------------------------------------------------
     4) INTERSECTION OBSERVER reveal
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
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
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------------
     5) UNIFIED SCROLL HANDLER (header + hero parallax)
        rAFでスロットルした単一リスナーで両方を処理。
     --------------------------------------------------------- */
  var heroImg = document.getElementById('heroImg');
  var enableParallax = heroImg && !prefersReducedMotion;

  function updateParallax() {
    if (!enableParallax) return;
    var offset = Math.min(window.scrollY * 0.15, 36);
    heroImg.style.transform = 'translateY(' + offset + 'px)';
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateHeader();
      updateParallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  updateParallax();

  /* ---------------------------------------------------------
     6) FORM validation + demo submit（実送信なし）
     --------------------------------------------------------- */
  var form = document.getElementById('reserveForm');
  if (form) {
    var nameInput = document.getElementById('name');
    var telInput = document.getElementById('tel');
    var emailInput = document.getElementById('email');
    var successMsg = document.getElementById('formSuccess');

    // 緩めの形式チェック。サーバ側検証の代わりにはならない簡易確認。
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // 日本の電話番号：ハイフン許容、数字10〜11桁を想定した緩いチェック。
    var telRe = /^[0-9０-９+\-（）()\s]{10,17}$/;

    function setError(input, message) {
      var errEl = document.getElementById(input.getAttribute('aria-describedby'));
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
      if (!v) { setError(nameInput, 'お名前をご入力ください。'); return false; }
      setError(nameInput, '');
      return true;
    }
    function validateTel() {
      var v = telInput.value.trim();
      if (!v) { setError(telInput, '電話番号をご入力ください。'); return false; }
      if (!telRe.test(v)) { setError(telInput, '電話番号の形式をご確認ください（例 090-1234-5678）。'); return false; }
      setError(telInput, '');
      return true;
    }
    function validateEmail() {
      var v = emailInput.value.trim();
      if (!v) { setError(emailInput, ''); return true; } // 任意項目
      if (!emailRe.test(v)) { setError(emailInput, 'メールアドレスの形式をご確認ください。'); return false; }
      setError(emailInput, '');
      return true;
    }

    // 一度エラーになった項目は入力中に再検証
    nameInput.addEventListener('input', function () {
      if (nameInput.classList.contains('is-invalid')) validateName();
    });
    telInput.addEventListener('input', function () {
      if (telInput.classList.contains('is-invalid')) validateTel();
    });
    emailInput.addEventListener('input', function () {
      if (emailInput.classList.contains('is-invalid')) validateEmail();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = [validateName(), validateTel(), validateEmail()].every(Boolean);

      if (!ok) {
        if (successMsg) successMsg.hidden = true;
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // デモ：実ネットワーク送信は行わない
      form.reset();
      setError(nameInput, '');
      setError(telInput, '');
      setError(emailInput, '');
      if (successMsg) {
        successMsg.hidden = false;
        if (successMsg.focus) successMsg.focus();
        successMsg.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    });
  }
})();
