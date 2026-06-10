/* =========================================================
   焙煎所 茜 -AKANE ROASTERY-  /  main.js
   バニラJS（ライブラリ不使用）
   1. ヘッダーのスクロール状態
   2. モバイルナビ開閉
   3. FAQアコーディオン（クリック + Enter/Space）
   4. ページ内アンカーのスムーズスクロール
   5. IntersectionObserver でセクション表示アニメ
   6. 数字のカウントアップ
   7. 申込フォームのクライアントバリデーション + デモ送信
   prefers-reduced-motion を全面的に尊重
   ========================================================= */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* -----------------------------------------------------
     1. ヘッダー: スクロールで .scrolled を付与
     ----------------------------------------------------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (window.scrollY > 24) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* -----------------------------------------------------
     2. モバイルナビ開閉
     ----------------------------------------------------- */
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");

  // backdrop を生成
  var backdrop = document.createElement("div");
  backdrop.className = "nav-backdrop";
  document.body.appendChild(backdrop);

  function openNav() {
    navMenu.classList.add("open");
    backdrop.classList.add("show");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "メニューを閉じる");
    document.body.classList.add("nav-open");
  }
  function closeNav() {
    navMenu.classList.remove("open");
    backdrop.classList.remove("show");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "メニューを開く");
    document.body.classList.remove("nav-open");
  }
  function toggleNav() {
    if (navToggle.getAttribute("aria-expanded") === "true") {
      closeNav();
    } else {
      openNav();
    }
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", toggleNav);
    backdrop.addEventListener("click", closeNav);
    // メニュー内リンクで閉じる
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    // Escで閉じる
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navMenu.classList.contains("open")) {
        closeNav();
        navToggle.focus();
      }
    });
    // 画面が広くなったら状態リセット
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* -----------------------------------------------------
     3. FAQ アコーディオン
        クリック / Enter / Space（buttonなのでネイティブ対応だが明示）
        aria-expanded を更新、高さアニメ
     ----------------------------------------------------- */
  var triggers = document.querySelectorAll(".acc-trigger");

  // 各パネルに登録中の transitionend リスナを保持し、トグルのたびに必ず除去する。
  // これにより、開→閉→開と素早く連打しても、前回のリスナが後から発火して
  // hidden を誤って付与する／max-height を誤って none にする競合を防ぐ。
  function clearPanelListener(panel) {
    if (panel._accOnEnd) {
      panel.removeEventListener("transitionend", panel._accOnEnd);
      panel._accOnEnd = null;
    }
  }

  function closePanel(panel) {
    clearPanelListener(panel);
    panel.classList.remove("open");

    if (prefersReducedMotion) {
      panel.style.maxHeight = "0px";
      panel.hidden = true; // display:none に戻し、AT/キーボードから到達不可に
      return;
    }

    // 現在の高さを明示してから 0 へ遷移（max-height:none のままだとアニメしない）
    panel.style.maxHeight = panel.scrollHeight + "px";
    // 強制リフロー後に 0 へ
    void panel.offsetHeight;
    requestAnimationFrame(function () {
      panel.style.maxHeight = "0px";
    });

    var onEnd = function (e) {
      // padding 由来の二重発火を排除（max-height の遷移完了時のみ確定）
      if (e.propertyName !== "max-height") return;
      panel.hidden = true; // display:none に戻す
      clearPanelListener(panel);
    };
    panel._accOnEnd = onEnd;
    panel.addEventListener("transitionend", onEnd);
  }

  function openPanel(panel) {
    clearPanelListener(panel);
    panel.hidden = false; // display:none を解除してから測定・アニメ
    panel.classList.add("open");

    if (prefersReducedMotion) {
      panel.style.maxHeight = "none";
      return;
    }

    // hidden 解除直後は height 計測のためリフローを挟む
    void panel.offsetHeight;
    panel.style.maxHeight = panel.scrollHeight + "px";

    // 開ききった後は none に（中身が動的に変わっても崩れないように）
    var onEnd = function (e) {
      if (e.propertyName !== "max-height") return;
      panel.style.maxHeight = "none";
      clearPanelListener(panel);
    };
    panel._accOnEnd = onEnd;
    panel.addEventListener("transitionend", onEnd);
  }

  triggers.forEach(function (trigger) {
    var panelId = trigger.getAttribute("aria-controls");
    var panel = document.getElementById(panelId);
    if (!panel) return;

    trigger.addEventListener("click", function () {
      var expanded = trigger.getAttribute("aria-expanded") === "true";
      if (expanded) {
        trigger.setAttribute("aria-expanded", "false");
        closePanel(panel);
      } else {
        trigger.setAttribute("aria-expanded", "true");
        openPanel(panel);
      }
    });

    // Space はデフォルトでスクロールしないように（Enterはボタンが処理）
    trigger.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        trigger.click();
      }
    });
  });

  /* -----------------------------------------------------
     4. ページ内アンカーのスムーズスクロール
        （CSS scroll-behavior を補完。reduced-motion時は瞬時）
     ----------------------------------------------------- */
  var headerHeight = function () {
    return header ? header.offsetHeight : 0;
  };
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var targetId = anchor.getAttribute("href");
      if (targetId === "#" || targetId.length < 2) return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      var top =
        target.getBoundingClientRect().top +
        window.scrollY -
        headerHeight() +
        1;
      window.scrollTo({
        top: top,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      // フォーカス移動（アクセシビリティ）。
      // 大きなブロックに太い可視枠が出るのを避けるため focus-target クラスで outline を抑制し、
      // blur 時に付与した tabindex を必ず除去して残置しないようにする。
      target.setAttribute("tabindex", "-1");
      target.classList.add("focus-target");
      target.addEventListener(
        "blur",
        function onBlur() {
          target.removeAttribute("tabindex");
          target.classList.remove("focus-target");
          target.removeEventListener("blur", onBlur);
        },
        { once: true }
      );
      target.focus({ preventScroll: true });
    });
  });

  /* -----------------------------------------------------
     5. IntersectionObserver でセクション表示アニメ
        + 6. 数字カウントアップ（ビューポート進入時）
     ----------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
    // カウントアップは最終値を即表示
    document.querySelectorAll(".stat-num").forEach(function (el) {
      el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          // 同一グリッド内のstagger
          var siblings = Array.prototype.slice.call(
            el.parentElement.querySelectorAll(":scope > .reveal")
          );
          var index = siblings.indexOf(el);
          if (index > -1) {
            el.style.setProperty("--reveal-delay", index * 0.08 + "s");
          }
          el.classList.add("is-visible");
          obs.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) {
      revealObserver.observe(el);
    });

    // カウントアップ
    var countEls = document.querySelectorAll(".stat-num");
    // HTMLはJS無効時に備えて最終値を静的表示しているため、観測開始前に0へリセット
    // （リセットしないと表示済みの最終値が0に戻るフラッシュが起きる）
    countEls.forEach(function (el) {
      el.textContent = "0" + (el.getAttribute("data-suffix") || "");
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
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(eased * target);
      el.textContent = value + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  /* -----------------------------------------------------
     7. 申込フォーム: クライアントバリデーション + デモ送信
     ----------------------------------------------------- */
  var form = document.getElementById("contactForm");
  var successMsg = document.getElementById("formSuccess");

  function setError(input, errorEl, message) {
    input.setAttribute("aria-invalid", "true");
    errorEl.textContent = message;
  }
  function clearError(input, errorEl) {
    input.removeAttribute("aria-invalid");
    errorEl.textContent = "";
  }

  function validateField(input) {
    var errorEl = document.getElementById("err-" + input.id);
    if (!errorEl) return true;
    var value = input.value.trim();

    if (input.hasAttribute("required") && value === "") {
      setError(input, errorEl, "この項目は必須です。");
      return false;
    }
    if (input.type === "email" && value !== "") {
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value)) {
        setError(input, errorEl, "メールアドレスの形式が正しくありません。");
        return false;
      }
    }
    clearError(input, errorEl);
    return true;
  }

  if (form) {
    // JS有効時のみブラウザ標準検証を切り、独自バリデーションに切り替える
    // （静的に novalidate を置くと、JS無効時に標準検証まで失われるため）
    form.setAttribute("novalidate", "novalidate");

    var fields = [
      document.getElementById("name"),
      document.getElementById("email"),
      document.getElementById("message")
    ].filter(Boolean);

    // 「月替わりの定期便を始める」: 離脱させずご用件を定期便にプリセットして記入継続
    var presetBtn = document.getElementById("presetSubscription");
    var topicSelect = document.getElementById("topic");
    if (presetBtn && topicSelect) {
      presetBtn.addEventListener("click", function () {
        topicSelect.value = "subscription";
        var messageEl = document.getElementById("message");
        if (messageEl) messageEl.focus();
      });
    }

    // 入力中にエラー解除
    fields.forEach(function (input) {
      input.addEventListener("blur", function () {
        validateField(input);
      });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") {
          validateField(input);
        }
        if (successMsg && !successMsg.hidden) successMsg.hidden = true;
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var allValid = true;
      var firstInvalid = null;

      fields.forEach(function (input) {
        var ok = validateField(input);
        if (!ok && !firstInvalid) firstInvalid = input;
        if (!ok) allValid = false;
      });

      if (!allValid) {
        if (successMsg) successMsg.hidden = true;
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // 実送信はしない: デモ成功メッセージ
      if (successMsg) {
        successMsg.hidden = false;
      }
      form.reset();
      fields.forEach(function (input) {
        input.removeAttribute("aria-invalid");
      });
      // 成功メッセージへフォーカス（スクリーンリーダー通知 role="status"）
      if (successMsg) {
        successMsg.setAttribute("tabindex", "-1");
        successMsg.focus({ preventScroll: true });
      }
    });
  }

  /* -----------------------------------------------------
     8. スティッキーCTA: CTAセクション表示中は退避
        フォーム送信ボタンとの重なり・タップ衝突を回避
     ----------------------------------------------------- */
  var stickyCta = document.querySelector(".sticky-cta");
  var ctaSection = document.getElementById("cta");
  if (stickyCta && ctaSection && "IntersectionObserver" in window) {
    var stickyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // CTAセクションが少しでも見えたらスティッキーCTAを隠す
          stickyCta.classList.toggle("is-hidden", entry.isIntersecting);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    stickyObserver.observe(ctaSection);
  }
})();
