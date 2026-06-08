/* =========================================================
   Atelier Lumen — main.js (vanilla, no libraries)
   1. モバイルナビ開閉
   2. FAQ アコーディオン（クリック + Enter/Space, aria-expanded）
   3. ページ内アンカーのスムーズスクロール
   4. IntersectionObserver でスクロール表示アニメ
   5. 申込フォームのクライアントバリデーション + 成功メッセージ
   + ヘッダーのスクロール状態 / スクロール進捗バー / ヒーロー光ライン描画
   ========================================================= */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------
     1. モバイルナビ開閉
     ------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var primaryNav = document.getElementById('primaryNav');

  function closeNav() {
    if (!primaryNav || !navToggle) return;
    primaryNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
  }
  function openNav() {
    if (!primaryNav || !navToggle) return;
    primaryNav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'メニューを閉じる');
  }

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      if (expanded) { closeNav(); } else { openNav(); }
    });

    // ナビ内リンク押下で閉じる
    primaryNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { closeNav(); }
    });

    // Escapeで閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && primaryNav.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

    // 画面幅が広がったらメニュー状態をリセット
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) { closeNav(); }
    });
  }

  /* -------------------------------------------------------
     2. FAQ アコーディオン（<details>ベース）
        - クリックはネイティブで動作
        - aria-expanded を summary に同期
        - Enter / Space を確実に処理
        - 排他（同時に1つだけ開く）
     ------------------------------------------------------- */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));

  faqItems.forEach(function (item) {
    var summary = item.querySelector('summary');
    if (!summary) return;

    var contentId = 'faq-panel-' + Math.random().toString(36).slice(2, 8);
    var panel = item.querySelector('.faq-item__a');
    if (panel) { panel.id = contentId; }

    // role="button" は付与しない: details/summary はネイティブで
    // disclosure ロールを持つため、上書きすると SR の意味を弱める。
    summary.setAttribute('aria-expanded', item.hasAttribute('open') ? 'true' : 'false');
    if (panel) { summary.setAttribute('aria-controls', contentId); }

    // open状態が変わるたびに aria-expanded を同期
    item.addEventListener('toggle', function () {
      summary.setAttribute('aria-expanded', item.hasAttribute('open') ? 'true' : 'false');

      // 排他: 開いたら他を閉じる
      if (item.hasAttribute('open')) {
        faqItems.forEach(function (other) {
          if (other !== item && other.hasAttribute('open')) {
            other.removeAttribute('open');
          }
        });
      }
    });

    // Enter / Space で確実にトグル（ブラウザ差異の保険）
    summary.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (item.hasAttribute('open')) {
          item.removeAttribute('open');
        } else {
          item.setAttribute('open', '');
        }
      }
    });
  });

  /* -------------------------------------------------------
     3. ページ内アンカーのスムーズスクロール
        （CSS scroll-behavior と併用。reduced-motion 尊重）
     ------------------------------------------------------- */
  var anchors = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));
  anchors.forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      var behavior = prefersReducedMotion ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior: behavior, block: 'start' });

      // フォーカスを移してアクセシビリティを担保。
      // tabindex は一時的に付与し、フォーカスが外れたら除去して
      // セクションがキーボードのフォーカス順に残留しないようにする。
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', function onBlur() {
          target.removeAttribute('tabindex');
        }, { once: true });
      }
      target.focus({ preventScroll: true });

      // URL を更新（履歴は汚さない）
      if (history.replaceState) { history.replaceState(null, '', href); }
    });
  });

  /* -------------------------------------------------------
     4. IntersectionObserver でスクロール表示アニメ（stagger 80ms）
     ------------------------------------------------------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;

        // 同一の親グループ内の順番で stagger を付ける
        var siblings = el.parentElement
          ? Array.prototype.slice.call(el.parentElement.querySelectorAll(':scope > .reveal'))
          : [el];
        var index = siblings.indexOf(el);
        var delay = index > 0 ? index * 80 : 0;

        setTimeout(function () { el.classList.add('is-visible'); }, delay);
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------
     5. 申込フォームのバリデーション + 成功メッセージ（実送信なし）
     ------------------------------------------------------- */
  var form = document.getElementById('contactForm');
  var success = document.getElementById('formSuccess');

  function setError(field, input, message) {
    var wrap = field;
    var errorEl = wrap.querySelector('.field__error');
    if (message) {
      wrap.classList.add('has-error');
      input.setAttribute('aria-invalid', 'true');
      if (errorEl) { errorEl.textContent = message; }
    } else {
      wrap.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
      if (errorEl) { errorEl.textContent = ''; }
    }
  }

  function validateField(input) {
    var field = input.closest('.field');
    if (!field) return true;
    var value = (input.value || '').trim();

    if (input.hasAttribute('required') && value === '') {
      setError(field, input, 'この項目は必須です。');
      return false;
    }
    if (input.type === 'email' && value !== '') {
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value)) {
        setError(field, input, '正しいメールアドレスの形式で入力してください。');
        return false;
      }
    }
    setError(field, input, '');
    return true;
  }

  if (form) {
    var validatable = Array.prototype.slice.call(
      form.querySelectorAll('input[required], textarea[required], input[type="email"]')
    );

    // 入力中にエラーを解消（一度エラーが出た項目のみ）
    validatable.forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field && field.classList.contains('has-error')) { validateField(input); }
      });
      input.addEventListener('blur', function () { validateField(input); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstInvalid = null;
      var allValid = true;
      validatable.forEach(function (input) {
        var ok = validateField(input);
        if (!ok && !firstInvalid) { firstInvalid = input; }
        if (!ok) { allValid = false; }
      });

      if (!allValid) {
        if (success) { success.hidden = true; }
        if (firstInvalid) {
          // focus() の既定スクロールは固定ヘッダー(72px)を考慮しないため、
          // フォーカス後に明示的に中央へスクロールしてヘッダー裏に隠れないようにする
          firstInvalid.focus({ preventScroll: true });
          var firstInvalidField = firstInvalid.closest('.field') || firstInvalid;
          firstInvalidField.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'center'
          });
        }
        return;
      }

      // 実送信はしない（デモ）。成功メッセージを表示
      if (success) {
        success.hidden = false;
        success.focus && success.setAttribute('tabindex', '-1');
        success.focus && success.focus({ preventScroll: true });
        success.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
      form.reset();
    });
  }

  /* -------------------------------------------------------
     + 外部画像の読み込み失敗フォールバック
        picsum.photos などの外部画像が（ネットワーク遮断や
        社内プロキシで）取得できなくても、壊れた画像アイコンを
        出さず、装飾的なプレースホルダ背景に切り替える。
     ------------------------------------------------------- */
  var images = Array.prototype.slice.call(document.querySelectorAll('img'));
  images.forEach(function (img) {
    function handleError() {
      img.classList.add('img--failed');
      // alt は視認できるよう残すが、空 src の壊れアイコンは抑止
      img.removeAttribute('src');
      img.removeAttribute('srcset');
    }
    // 既に失敗していた場合（キャッシュ済みエラー）も拾う
    if (img.complete && img.naturalWidth === 0) {
      handleError();
    } else {
      img.addEventListener('error', handleError, { once: true });
    }
  });

  /* -------------------------------------------------------
     + ヘッダーのスクロール状態 & スクロール進捗バー
     ------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  var scrollBar = document.getElementById('scrollBar');
  var ticking = false;

  function onScroll() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (header) {
      if (scrollTop > 20) { header.classList.add('is-scrolled'); }
      else { header.classList.remove('is-scrolled'); }
    }

    if (scrollBar) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollBar.style.width = progress + '%';
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* -------------------------------------------------------
     + ヒーローの金の光ライン描画アニメ（stroke-dashoffset）
     ------------------------------------------------------- */
  var lumenPaths = Array.prototype.slice.call(document.querySelectorAll('.lumen-path'));
  var lumenDot = document.querySelector('.lumen-dot');

  if (lumenPaths.length) {
    if (prefersReducedMotion) {
      lumenPaths.forEach(function (p) { p.style.strokeDashoffset = '0'; p.style.strokeDasharray = 'none'; });
      if (lumenDot) { lumenDot.style.opacity = '1'; }
    } else {
      lumenPaths.forEach(function (p, i) {
        var len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        // 強制リフローで初期値を確定
        // eslint-disable-next-line no-unused-expressions
        p.getBoundingClientRect();
        p.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) ' + (i * 0.2) + 's';
        p.style.strokeDashoffset = '0';
      });
      if (lumenDot) {
        lumenDot.style.transition = 'opacity 0.5s ease 1.1s';
        window.requestAnimationFrame(function () { lumenDot.style.opacity = '1'; });
      }
    }
  }
})();
