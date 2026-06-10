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
     2. FAQ アコーディオン（JS制御の高さアニメ。他LPと同一方式）
        - <button> + aria-expanded、クリック / Enter / Space
        - panel.style.height を 0⇄scrollHeight で制御し CSS transition で補間
        - 開いたら height:auto に戻して内容変化に追従
        - 排他（同時に1つだけ開く）、reduced-motion 尊重
        旧 <details>+grid 方式は modern Chromium の ::details-content が
        閉時に content-visibility:hidden へ即切替するため閉アニメが効かず
        （スナップ）、height 方式に統一して開閉とも滑らかにした。
     ------------------------------------------------------- */
  var faqTriggers = Array.prototype.slice.call(document.querySelectorAll('.faq-item__q'));

  // 高さ変化を確定させるための強制リフロー（intentを明示）
  function faqReflow(el) { return el.offsetHeight; }

  // 登録中の transitionend リスナをトグルのたびに必ず除去する。
  // 開アニメ中に閉じると transitioncancel になり旧リスナが残留し、
  // 閉アニメ完了の transitionend で height:auto に戻して開いてしまうため。
  function faqClearDone(panel) {
    if (panel._faqDone) {
      panel.removeEventListener('transitionend', panel._faqDone);
      panel._faqDone = null;
    }
  }
  function faqClosePanel(panel) {
    faqClearDone(panel);
    panel.style.height = panel.scrollHeight + 'px';
    faqReflow(panel);
    panel.style.height = '0px';
  }
  function faqOpenPanel(panel) {
    faqClearDone(panel);
    panel.style.height = panel.scrollHeight + 'px';
    if (prefersReducedMotion) {
      panel.style.height = 'auto';
    } else {
      // トランジション後に auto へ戻し、内容変化やリサイズに追従
      var done = function () {
        panel.style.height = 'auto';
        faqClearDone(panel);
      };
      panel._faqDone = done;
      panel.addEventListener('transitionend', done);
    }
  }

  var faqPairs = [];

  faqTriggers.forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    faqPairs.push({ trigger: trigger, panel: panel });

    function toggle() {
      var isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        faqClosePanel(panel);
        return;
      }
      // 排他: 開く前に他の開いているものを閉じる
      faqPairs.forEach(function (p) {
        if (p.trigger !== trigger && p.trigger.getAttribute('aria-expanded') === 'true') {
          p.trigger.setAttribute('aria-expanded', 'false');
          faqClosePanel(p.panel);
        }
      });
      trigger.setAttribute('aria-expanded', 'true');
      faqOpenPanel(panel);
    }

    trigger.addEventListener('click', toggle);

    // ネイティブ<button>でも Enter/Space を確実に処理（既定clickは抑止して二重発火回避）
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // リサイズ時、開いているパネルの高さを auto に保ち直す（折返し変化に追従）
  if (faqPairs.length) {
    window.addEventListener('resize', function () {
      faqPairs.forEach(function (p) {
        if (p.trigger.getAttribute('aria-expanded') === 'true') {
          p.panel.style.height = 'auto';
        }
      });
    });
  }

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
    // JS有効時のみブラウザ標準の検証を無効化し、独自バリデーションに切り替える
    // （HTML側に novalidate を直書きすると、JS無効時に未検証のまま送信されてしまうため）
    form.setAttribute('novalidate', 'novalidate');

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
