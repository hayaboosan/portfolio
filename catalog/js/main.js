/* ============================================================
   まどり不動産 — 賃貸物件検索UI
   プログレッシブエンハンスメント：
   物件データは静的HTMLが正（JS無効でも全件読める）。
   JSは data-* を読み、絞り込み・並べ替え・URL状態・お気に入りを担う。
   フレームワーク不使用 / vanilla JS。
   ============================================================ */
(function () {
  'use strict';

  var FAV_KEY = 'madori_favs';

  // ----- ラベル辞書（チップ表示用） -----
  var AREA_LABEL = {
    midorino: 'みどり野駅', sakura: '桜並木駅', gakuen: '学園前駅',
    kawabe: '川辺町駅', takadai: '高台駅', tsukimi: '月見ヶ丘駅',
    chuo: '中央公園前駅', minatomi: '港見駅',
  };
  var FEAT_LABEL = {
    sep: 'バス・トイレ別', auto: 'オートロック', wash: '独立洗面台',
    deli: '宅配ボックス', park: '駐車場あり', pet: 'ペット相談可',
    corner: '角部屋', reform: 'リフォーム済', '2f': '2階以上', south: '南向き',
  };

  // ----- DOM -----
  var form = document.getElementById('filters');
  var listEl = document.getElementById('resultList');
  var chipsEl = document.getElementById('activeChips');
  var emptyEl = document.getElementById('resultEmpty');
  var countEl = document.getElementById('resultCount');
  var applyCountEl = document.getElementById('applyCount');
  var statusEl = document.getElementById('countStatus');
  var sortSelect = document.getElementById('sortSelect');
  var fFavOnly = document.getElementById('fFavOnly');
  if (!form || !listEl) return;

  // ----- 物件データを DOM から1度だけ読む -----
  var items = Array.prototype.map.call(listEl.querySelectorAll('.bukken'), function (el, i) {
    return {
      el: el,
      id: el.getAttribute('data-id'),
      name: el.getAttribute('data-name') || '',
      order: i,
      rent: parseInt(el.getAttribute('data-rent'), 10),
      size: parseFloat(el.getAttribute('data-size')),
      walk: parseInt(el.getAttribute('data-walk'), 10),
      floor: parseInt(el.getAttribute('data-floor'), 10),
      age: parseInt(el.getAttribute('data-age'), 10),
      area: el.getAttribute('data-area'),
      dir: el.getAttribute('data-dir') || '',
      layout: el.getAttribute('data-layout'),
      listed: parseInt(el.getAttribute('data-listed'), 10),
      feat: (el.getAttribute('data-feat') || '').split(' ').filter(Boolean),
      search: (el.getAttribute('data-search') || '').toLowerCase(),
    };
  });

  // ----- お気に入り（localStorage） -----
  var favs = loadFavs();
  function loadFavs() {
    try {
      var raw = window.localStorage.getItem(FAV_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveFavs() {
    try { window.localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
  }
  function isFav(id) { return favs.indexOf(id) !== -1; }

  // 各カードのお気に入りボタンを初期化
  items.forEach(function (it) {
    var btn = it.el.querySelector('.bukken__fav');
    if (!btn) return;
    syncFavBtn(btn, it.id, it.name);
    btn.addEventListener('click', function () {
      var idx = favs.indexOf(it.id);
      if (idx === -1) favs.push(it.id); else favs.splice(idx, 1);
      saveFavs();
      syncFavBtn(btn, it.id, it.name);
      if (fFavOnly && fFavOnly.checked) apply(); // お気に入りのみ表示中なら即反映
    });
  });
  function syncFavBtn(btn, id, name) {
    var on = isFav(id);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', '「' + name + '」をお気に入り' + (on ? 'から外す' : 'に追加'));
  }

  // ----- 現在の絞り込み条件を form から読む -----
  function readState() {
    var checked = function (name) {
      return Array.prototype.map.call(
        form.querySelectorAll('input[name="' + name + '"]:checked'),
        function (n) { return n.value; }
      );
    };
    var val = function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value : '';
    };
    return {
      q: (val('q') || '').trim(),
      rmax: val('rmax') ? parseInt(val('rmax'), 10) : null,
      lay: checked('layout'),
      smin: val('smin') ? parseFloat(val('smin')) : null,
      wmax: val('wmax') ? parseInt(val('wmax'), 10) : null,
      amax: val('amax'),
      area: checked('area'),
      feat: checked('feat'),
      fav: !!(fFavOnly && fFavOnly.checked),
      sort: sortSelect ? sortSelect.value : '',
    };
  }

  // ----- 1件が条件に合うか -----
  function matches(it, s) {
    if (s.q) {
      var q = s.q.toLowerCase();
      if (it.search.indexOf(q) === -1) return false;
    }
    if (s.rmax !== null && it.rent > s.rmax) return false;
    if (s.smin !== null && it.size < s.smin) return false;
    if (s.wmax !== null && it.walk > s.wmax) return false;
    if (s.amax) {
      if (s.amax === 'new') { if (it.age !== 0) return false; }
      else if (it.age > parseInt(s.amax, 10)) return false;
    }
    if (s.lay.length && s.lay.indexOf(it.layout) === -1) return false;
    if (s.area.length && s.area.indexOf(it.area) === -1) return false;
    if (s.feat.length) {
      for (var i = 0; i < s.feat.length; i++) {
        var f = s.feat[i];
        if (f === '2f') { if (it.floor < 2) return false; }
        else if (f === 'south') { if (it.dir.indexOf('南') === -1) return false; }
        else if (it.feat.indexOf(f) === -1) return false;
      }
    }
    if (s.fav && !isFav(it.id)) return false;
    return true;
  }

  // ----- 並べ替え -----
  var SORTERS = {
    rent_asc: function (a, b) { return a.rent - b.rent; },
    rent_desc: function (a, b) { return b.rent - a.rent; },
    size_desc: function (a, b) { return b.size - a.size; },
    walk_asc: function (a, b) { return a.walk - b.walk; },
    age_asc: function (a, b) { return a.age - b.age; },
    new: function (a, b) { return b.listed - a.listed; },
  };
  function applySort(s) {
    var cmp = SORTERS[s.sort];
    var ordered = items.slice();
    if (cmp) {
      ordered.sort(function (a, b) {
        var r = cmp(a, b);
        return r !== 0 ? r : a.order - b.order; // 同値は元の並びで安定化
      });
    } else {
      ordered.sort(function (a, b) { return a.order - b.order; });
    }
    var frag = document.createDocumentFragment();
    ordered.forEach(function (it) { frag.appendChild(it.el); });
    listEl.appendChild(frag);
  }

  // ----- 適用（絞り込み＋件数＋空状態＋チップ＋URL） -----
  var lastSort = null;
  function apply(opts) {
    var s = readState();
    if (s.sort !== lastSort) { applySort(s); lastSort = s.sort; }

    var visible = 0;
    items.forEach(function (it) {
      var ok = matches(it, s);
      it.el.classList.toggle('is-hidden', !ok);
      if (ok) visible++;
    });

    if (countEl) countEl.textContent = String(visible);
    if (applyCountEl) applyCountEl.textContent = String(visible);
    if (statusEl) statusEl.textContent = visible + '件の物件';
    if (emptyEl) emptyEl.hidden = visible !== 0;
    listEl.hidden = visible === 0;

    renderChips(s);
    if (!opts || opts.url !== false) writeURL(s);
  }

  // ----- アクティブ条件チップ -----
  function renderChips(s) {
    if (!chipsEl) return;
    var chips = [];
    if (s.q) chips.push(['q', '', '「' + s.q + '」']);
    if (s.rmax !== null) chips.push(['rmax', '', '〜' + (s.rmax / 10000) + '万円']);
    s.lay.forEach(function (v) { chips.push(['lay', v, v]); });
    if (s.smin !== null) chips.push(['smin', '', s.smin + '㎡以上']);
    if (s.wmax !== null) chips.push(['wmax', '', '徒歩' + s.wmax + '分以内']);
    if (s.amax) chips.push(['amax', '', s.amax === 'new' ? '新築のみ' : '築' + s.amax + '年以内']);
    s.area.forEach(function (v) { chips.push(['area', v, AREA_LABEL[v] || v]); });
    s.feat.forEach(function (v) { chips.push(['feat', v, FEAT_LABEL[v] || v]); });
    if (s.fav) chips.push(['fav', '', '★ お気に入り']);

    chipsEl.innerHTML = '';
    if (!chips.length) { chipsEl.hidden = true; return; }
    chipsEl.hidden = false;

    chips.forEach(function (c) {
      var chip = document.createElement('span');
      chip.className = 'chip';
      var label = document.createElement('span');
      label.textContent = c[2];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip__remove';
      btn.setAttribute('data-kind', c[0]);
      btn.setAttribute('data-value', c[1]);
      btn.setAttribute('aria-label', c[2] + ' の条件を外す');
      btn.innerHTML = '&times;';
      chip.appendChild(label);
      chip.appendChild(btn);
      chipsEl.appendChild(chip);
    });

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'chip chip--clear';
    clear.id = 'chipClearAll';
    clear.textContent = 'すべて解除';
    chipsEl.appendChild(clear);
  }

  function removeFilter(kind, value) {
    if (kind === 'q') setVal('q', '');
    else if (kind === 'rmax') setVal('rmax', '');
    else if (kind === 'smin') setVal('smin', '');
    else if (kind === 'wmax') setVal('wmax', '');
    else if (kind === 'amax') setVal('amax', '');
    else if (kind === 'fav') { if (fFavOnly) fFavOnly.checked = false; }
    else { // lay / area / feat（チェックボックス）
      var box = form.querySelector('input[name="' + kind + '"][value="' + value + '"]');
      if (box) box.checked = false;
    }
    apply();
  }
  function setVal(name, v) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el) el.value = v;
  }

  chipsEl.addEventListener('click', function (e) {
    var rm = e.target.closest('.chip__remove');
    if (rm) { removeFilter(rm.getAttribute('data-kind'), rm.getAttribute('data-value')); return; }
    if (e.target.closest('#chipClearAll')) resetAll();
  });

  // ----- リセット -----
  function resetAll() {
    form.reset();              // ネイティブのリセット → 'reset' イベントで apply が1回走る
    if (sortSelect) sortSelect.value = '';
    setView('list', false);    // 並び・表示も初期状態へ（URLは後続の apply が書き換える）
  }
  // すべてのリセット経路（フッター/空状態/チップ全解除）を resetAll に集約。
  // form.reset() 後は値が戻るのが次tickのため setTimeout で再計算する。
  form.addEventListener('reset', function () {
    window.setTimeout(apply, 0);
  });
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
  var emptyReset = document.getElementById('emptyReset');
  if (emptyReset) emptyReset.addEventListener('click', resetAll);

  // ----- URL 状態 -----
  function writeURL(s) {
    var p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.rmax !== null) p.set('rmax', String(s.rmax));
    if (s.lay.length) p.set('lay', s.lay.join(','));
    if (s.smin !== null) p.set('smin', String(s.smin));
    if (s.wmax !== null) p.set('wmax', String(s.wmax));
    if (s.amax) p.set('amax', s.amax);
    if (s.area.length) p.set('area', s.area.join(','));
    if (s.feat.length) p.set('feat', s.feat.join(','));
    if (s.fav) p.set('fav', '1');
    if (s.sort) p.set('sort', s.sort);
    if (view === 'grid') p.set('view', 'grid');
    var str = p.toString();
    var url = str ? '#' + str : location.pathname + location.search;
    history.replaceState(null, '', url);
  }
  function readURL() {
    var hash = location.hash.replace(/^#/, '');
    if (!hash) return;
    var p = new URLSearchParams(hash);
    var setBoxes = function (name, csv) {
      if (!csv) return;
      csv.split(',').forEach(function (v) {
        var box = form.querySelector('input[name="' + name + '"][value="' + v + '"]');
        if (box) box.checked = true;
      });
    };
    if (p.get('q')) setVal('q', p.get('q'));
    if (p.get('rmax')) setVal('rmax', p.get('rmax'));
    setBoxes('layout', p.get('lay'));
    if (p.get('smin')) setVal('smin', p.get('smin'));
    if (p.get('wmax')) setVal('wmax', p.get('wmax'));
    if (p.get('amax')) setVal('amax', p.get('amax'));
    setBoxes('area', p.get('area'));
    setBoxes('feat', p.get('feat'));
    if (p.get('fav') === '1' && fFavOnly) fFavOnly.checked = true;
    if (p.get('sort') && sortSelect) sortSelect.value = p.get('sort');
    if (p.get('view') === 'grid') setView('grid', false);
  }

  // ----- 入力で即時適用 -----
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  // フリーワードのみデバウンス（input）。select/checkbox は change で即時1回だけ適用。
  var t;
  var kwInput = form.querySelector('[name="q"]');
  if (kwInput) kwInput.addEventListener('input', function () {
    window.clearTimeout(t);
    t = window.setTimeout(apply, 160);
  });
  form.addEventListener('change', apply);
  if (sortSelect) sortSelect.addEventListener('change', apply);

  // ----- 表示切替（リスト / グリッド） -----
  var view = 'list';
  var viewListBtn = document.getElementById('viewList');
  var viewGridBtn = document.getElementById('viewGrid');
  function setView(v, write) {
    view = v;
    listEl.classList.toggle('bukken-list--grid', v === 'grid');
    if (viewListBtn) { viewListBtn.classList.toggle('is-active', v === 'list'); viewListBtn.setAttribute('aria-pressed', v === 'list' ? 'true' : 'false'); }
    if (viewGridBtn) { viewGridBtn.classList.toggle('is-active', v === 'grid'); viewGridBtn.setAttribute('aria-pressed', v === 'grid' ? 'true' : 'false'); }
    if (write !== false) writeURL(readState());
  }
  if (viewListBtn) viewListBtn.addEventListener('click', function () { setView('list'); });
  if (viewGridBtn) viewGridBtn.addEventListener('click', function () { setView('grid'); });

  // ----- モバイル ドロワー -----
  var openBtn = document.getElementById('filterOpen');
  var closeBtn = document.getElementById('filterClose');
  var applyBtn = document.getElementById('applyBtn');
  var overlay = document.getElementById('filterOverlay');
  var bgEls = [document.querySelector('.cat-header'), document.querySelector('.catalog__intro'), document.getElementById('results'), document.querySelector('.cat-footer')];
  var drawerOpen = false;

  function setInert(on) {
    bgEls.forEach(function (el) {
      if (!el) return;
      if ('inert' in HTMLElement.prototype) el.inert = on;
      else if (on) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
    });
  }
  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    overlay.hidden = false;
    // hidden(display:none)解除を確定させてからクラス付与＝トランジションを確実に発火
    void overlay.offsetWidth;
    form.classList.add('is-open');
    overlay.classList.add('is-open');
    // ドロワー化したときだけダイアログのセマンティクスを付与
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');
    form.setAttribute('aria-labelledby', 'filtersTitle');
    document.body.style.overflow = 'hidden';
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    setInert(true);
    if (closeBtn) closeBtn.focus();
    document.addEventListener('keydown', onEsc);
    document.addEventListener('keydown', onTrap, true);
  }
  function closeDrawer(returnFocus) {
    if (!drawerOpen) return;
    drawerOpen = false;
    form.classList.remove('is-open');
    overlay.classList.remove('is-open');
    form.removeAttribute('role');
    form.removeAttribute('aria-modal');
    form.removeAttribute('aria-labelledby');
    document.body.style.overflow = '';
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    setInert(false);
    document.removeEventListener('keydown', onEsc);
    document.removeEventListener('keydown', onTrap, true);
    window.setTimeout(function () { if (!drawerOpen) overlay.hidden = true; }, 300);
    // 復帰先が非表示（デスクトップ幅へのリサイズ等）なら無理にフォーカスしない
    if (returnFocus !== false && openBtn && openBtn.offsetParent !== null) openBtn.focus();
  }
  function onEsc(e) { if (e.key === 'Escape') closeDrawer(); }
  // フォーカストラップ：ドロワー内で Tab/Shift+Tab を循環させる
  function onTrap(e) {
    if (e.key !== 'Tab' || !drawerOpen) return;
    var nodes = form.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    var list = Array.prototype.filter.call(nodes, function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  if (applyBtn) applyBtn.addEventListener('click', closeDrawer);
  // 画面を広げたらドロワーを必ず解除
  var mq = window.matchMedia('(min-width: 901px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function (e) {
    if (e.matches && drawerOpen) closeDrawer(false);
  });

  // ----- 初期化 -----
  readURL();
  apply({ url: false }); // 初期描画はURLを書き換えない
})();
