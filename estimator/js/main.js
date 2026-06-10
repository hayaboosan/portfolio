/* =========================================================
   結（ゆい）リフォーム  |  見積もりシミュレーター  main.js
   Vanilla JS — no libraries.

   設計:
   - DATA: 箇所(room) / グレード(grade) / オプション / スライダー の静的定義
   - STATE: 選択状態を単一オブジェクトで保持し、URLハッシュにエンコード/復元
   - RENDER: STATE から DOM を生成（箇所トグル・詳細・明細）
   - CALC:  小計 → 諸経費(10%) → (小計+諸経費)に消費税(10%) → 合計
   - 合計は数値トゥイーン（prefers-reduced-motion 時は即時）
   - キーボード完全操作 / aria-live で合計通知
   ========================================================= */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ---------------------------------------------------------
     1) DATA — 料金・係数はすべて説明用の例示
     --------------------------------------------------------- */
  var GRADES = [
    { id: 'standard', name: 'スタンダード', mult: 1.0 },
    { id: 'high',     name: 'ハイグレード', mult: 1.5 },
    { id: 'premium',  name: 'プレミアム',   mult: 2.0 }
  ];
  var GRADE_BY_ID = {};
  GRADES.forEach(function (g) { GRADE_BY_ID[g.id] = g; });

  // SVGアイコン（住まい系）
  var ICONS = {
    kitchen: '<path d="M3 11h18"/><path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M6 11v9"/><path d="M18 11v9"/><path d="M9 7h2"/>',
    bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M5 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2"/><path d="M9 6h.01"/><path d="M7 19l-1 2"/><path d="M18 19l1 2"/>',
    toilet: '<path d="M6 3h8v6a4 4 0 0 1-4 4H8a2 2 0 0 1-2-2z"/><path d="M8 13v3a4 4 0 0 0 4 4"/><path d="M14 6h4"/>',
    washroom: '<rect x="5" y="3" width="14" height="7" rx="1.5"/><path d="M5 13h14v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M12 6h.01"/>',
    interior: '<path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 9h18"/><path d="M9 21V13h6v8"/>',
    wall: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v6"/><path d="M15 9v6"/><path d="M9 15v6"/>',
    check: '<polyline points="20 6 9 17 4 12"/>'
  };

  // 箇所定義。base = スタンダード基準工事費（税抜）。
  // type 'fixed' は基準額×係数、'area' は ㎡単価×係数×面積。
  var ROOMS = [
    {
      id: 'kitchen', name: 'キッチン', icon: 'kitchen', type: 'fixed', base: 600000,
      options: [
        { id: 'dishwasher', name: '食器洗い乾燥機', price: 120000 },
        { id: 'ihcooktop', name: 'IHクッキングヒーター', price: 90000 },
        { id: 'cabinet', name: '吊戸棚・収納拡張', price: 60000 }
      ]
    },
    {
      id: 'bath', name: '浴室', icon: 'bath', type: 'fixed', base: 700000,
      options: [
        { id: 'dryer', name: '浴室暖房乾燥機', price: 110000 },
        { id: 'handrail', name: '手すり設置', price: 30000 },
        { id: 'insulation', name: '高断熱浴槽', price: 80000 }
      ]
    },
    {
      id: 'toilet', name: 'トイレ', icon: 'toilet', type: 'fixed', base: 200000,
      options: [
        { id: 'washlet', name: '温水洗浄便座', price: 60000 },
        { id: 'autoflush', name: '自動開閉・自動洗浄', price: 45000 },
        { id: 'handrail', name: '手すり設置', price: 25000 }
      ]
    },
    {
      id: 'washroom', name: '洗面所', icon: 'washroom', type: 'fixed', base: 250000,
      options: [
        { id: 'mirror', name: '三面鏡・LED照明', price: 40000 },
        { id: 'tallcabinet', name: 'トールキャビネット', price: 55000 }
      ]
    },
    {
      id: 'interior', name: '内装（壁紙・床）', icon: 'interior', type: 'area', unit: 4500,
      area: { min: 5, max: 80, step: 1, def: 30, label: '床面積', unitLabel: '㎡' },
      options: [
        { id: 'floorheat', name: '床暖房（部分）', price: 180000 },
        { id: 'soundproof', name: '防音・遮音シート', price: 70000 }
      ]
    },
    {
      id: 'wall', name: '外壁（塗装）', icon: 'wall', type: 'area', unit: 3200,
      area: { min: 20, max: 250, step: 5, def: 120, label: '外壁面積', unitLabel: '㎡' },
      options: [
        { id: 'waterproof', name: '防水・シーリング打替', price: 120000 },
        { id: 'highdurable', name: '高耐久塗料グレードUP', price: 90000 }
      ]
    }
  ];
  var ROOM_BY_ID = {};
  ROOMS.forEach(function (r) {
    r.optById = {};
    r.options.forEach(function (o) { r.optById[o.id] = o; });
    ROOM_BY_ID[r.id] = r;
  });

  var OVERHEAD_RATE = 0.10; // 諸経費
  var TAX_RATE = 0.10;      // 消費税

  /* ---------------------------------------------------------
     2) STATE
        state[roomId] = { grade, options:{optId:true}, area } | undefined(=未選択)
     --------------------------------------------------------- */
  var state = {};

  function defaultRoomState(room) {
    var s = { grade: 'standard', options: {} };
    if (room.type === 'area') s.area = room.area.def;
    return s;
  }

  /* ---------------------------------------------------------
     3) URL ENCODE / DECODE  (hash: #r=kitchen.high.0a1~interior.standard.30.0 ...)
        room := id "." grade "." optBits ["." area]
        optBits は options を 0/1 の文字列で表現
     --------------------------------------------------------- */
  function encodeState() {
    var parts = [];
    ROOMS.forEach(function (room) {
      var s = state[room.id];
      if (!s) return;
      var bits = room.options.map(function (o) {
        return s.options[o.id] ? '1' : '0';
      }).join('');
      var seg = room.id + '.' + s.grade + '.' + bits;
      if (room.type === 'area') seg += '.' + s.area;
      parts.push(seg);
    });
    return parts.join('~');
  }

  function decodeState(hash) {
    var next = {};
    if (!hash) return next;
    hash = hash.replace(/^#/, '');
    // 期待形式: r=...
    var m = /(?:^|&)r=([^&]*)/.exec(hash);
    // 不正な%エンコードで decodeURIComponent が URIError を投げても画面を壊さない
    var payload = ''; if (m) { try { payload = decodeURIComponent(m[1]); } catch (e) { payload = ''; } }
    if (!payload) return next;

    payload.split('~').forEach(function (seg) {
      var f = seg.split('.');
      var room = ROOM_BY_ID[f[0]];
      if (!room) return;
      var s = defaultRoomState(room);
      // grade
      if (f[1] && GRADE_BY_ID[f[1]]) s.grade = f[1];
      // option bits
      var bits = f[2] || '';
      room.options.forEach(function (o, i) {
        s.options[o.id] = bits.charAt(i) === '1';
      });
      // area
      if (room.type === 'area') {
        var a = parseInt(f[3], 10);
        if (!isNaN(a)) {
          a = Math.max(room.area.min, Math.min(room.area.max, a));
          // step に合わせて丸める
          var steps = Math.round((a - room.area.min) / room.area.step);
          s.area = room.area.min + steps * room.area.step;
        }
      }
      next[room.id] = s;
    });
    return next;
  }

  var suppressHashWrite = false;
  var hashWriteTimer = null;
  // 即時にURLへ反映する版。コピー直前など「今の状態のURL」が必要な場面で使う
  function writeHashNow() {
    if (suppressHashWrite) return;
    window.clearTimeout(hashWriteTimer);
    var enc = encodeState();
    var newHash = enc ? '#r=' + encodeURIComponent(enc) : '';
    // 履歴を汚さず置換
    var url = location.pathname + location.search + newHash;
    try {
      history.replaceState(null, '', url);
    } catch (e) {
      // file:// などで失敗する場合のフォールバック
      if (location.hash !== newHash) location.hash = newHash;
    }
  }
  function writeHash() {
    if (suppressHashWrite) return;
    // スライダー連続入力で Safari の replaceState 回数制限(100回/30秒)に
    // 達しないようデバウンス。状態は発火時点で読むため、デバウンス中に
    // 戻る/進むが起きても現在のURLと同一内容の置換になり安全。
    window.clearTimeout(hashWriteTimer);
    hashWriteTimer = window.setTimeout(writeHashNow, 250);
  }

  /* ---------------------------------------------------------
     4) CALC
        各箇所: 工事費 = base(or unit*area) * gradeMult
                + オプション合計（オプションはグレード非依存）
        小計 = Σ各箇所
        諸経費 = 小計 * 10%
        税    = (小計 + 諸経費) * 10%
        合計  = 小計 + 諸経費 + 税
     --------------------------------------------------------- */
  function roomBaseCost(room, s) {
    var grade = GRADE_BY_ID[s.grade] || GRADES[0];
    if (room.type === 'area') {
      return Math.round(room.unit * s.area * grade.mult);
    }
    return Math.round(room.base * grade.mult);
  }

  function roomOptionsCost(room, s) {
    var sum = 0;
    room.options.forEach(function (o) {
      if (s.options[o.id]) sum += o.price;
    });
    return sum;
  }

  function calc() {
    var subtotal = 0;
    var lines = [];
    ROOMS.forEach(function (room) {
      var s = state[room.id];
      if (!s) return;
      var baseCost = roomBaseCost(room, s);
      var optCost = roomOptionsCost(room, s);
      subtotal += baseCost + optCost;
      var optLines = [];
      room.options.forEach(function (o) {
        if (s.options[o.id]) optLines.push({ name: o.name, amount: o.price });
      });
      lines.push({
        room: room,
        grade: GRADE_BY_ID[s.grade],
        area: room.type === 'area' ? s.area : null,
        baseCost: baseCost,
        optLines: optLines
      });
    });
    var overhead = Math.round(subtotal * OVERHEAD_RATE);
    var tax = Math.round((subtotal + overhead) * TAX_RATE);
    var total = subtotal + overhead + tax;
    return {
      lines: lines, subtotal: subtotal, overhead: overhead,
      tax: tax, total: total
    };
  }

  /* ---------------------------------------------------------
     5) FORMAT
     --------------------------------------------------------- */
  function yen(n) { return '¥' + Math.round(n).toLocaleString('ja-JP'); }
  function yenPlain(n) { return Math.round(n).toLocaleString('ja-JP') + '円'; }

  /* ---------------------------------------------------------
     6) DOM refs
     --------------------------------------------------------- */
  var elRoomToggles = document.getElementById('roomToggles');
  var elRoomDetails = document.getElementById('roomDetails');
  var elDetailsEmpty = document.getElementById('detailsEmpty');
  var elDetailHint = document.getElementById('detailHint');
  var elLines = document.getElementById('estimateLines');
  var elEmpty = document.getElementById('estimateEmpty');
  var elSummary = document.getElementById('estimateSummary');
  var elSubtotal = document.getElementById('sumSubtotal');
  var elOverhead = document.getElementById('sumOverhead');
  var elTax = document.getElementById('sumTax');
  var elTotal = document.getElementById('sumTotal');
  var elLive = document.getElementById('estimateLive');
  var elCopyBtn = document.getElementById('copyBtn');
  var elPrintBtn = document.getElementById('printBtn');
  var elResetBtn = document.getElementById('resetBtn');
  var elCopyStatus = document.getElementById('copyStatus');
  var elSheetCopyStatus = document.getElementById('sheetCopyStatus');

  var elMobileBar = document.getElementById('mobileBar');
  var elMobileTotal = document.getElementById('mobileTotal');
  var elMobileBarToggle = document.getElementById('mobileBarToggle');
  var elMobileSheet = document.getElementById('mobileSheet');
  var elMobileSheetBody = document.getElementById('mobileSheetBody');
  var elMobileSheetClose = document.getElementById('mobileSheetClose');
  var elApp = document.getElementById('app');
  var elHeader = document.querySelector('.app-header');
  var elFooter = document.querySelector('.app-footer');

  /* small helper to create elements */
  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }
  function svgIcon(name, size) {
    size = size || 22;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" width="' + size + '" height="' + size +
      '" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  /* ---------------------------------------------------------
     7) RENDER — room toggles
     --------------------------------------------------------- */
  function renderToggles() {
    elRoomToggles.innerHTML = '';
    ROOMS.forEach(function (room) {
      var pressed = !!state[room.id];
      var btn = el('button', 'room-toggle', {
        type: 'button',
        'aria-pressed': String(pressed),
        'data-room': room.id
      });
      var baseLabel = room.type === 'area'
        ? '¥' + room.unit.toLocaleString('ja-JP') + ' / ㎡〜'
        : yen(room.base) + '〜';
      btn.innerHTML =
        '<span class="room-toggle__check">' + svgIcon('check', 12) + '</span>' +
        '<span class="room-toggle__icon">' + svgIcon(room.icon, 22) + '</span>' +
        '<span class="room-toggle__name">' + room.name + '</span>' +
        '<span class="room-toggle__base">' + baseLabel + '</span>';
      btn.addEventListener('click', function () { toggleRoom(room.id); });
      elRoomToggles.appendChild(btn);
    });
  }

  function toggleRoom(roomId) {
    var room = ROOM_BY_ID[roomId];
    if (state[roomId]) {
      delete state[roomId];
    } else {
      state[roomId] = defaultRoomState(room);
    }
    // トグルの見た目だけ更新（全再描画は避ける）
    var btn = elRoomToggles.querySelector('[data-room="' + roomId + '"]');
    if (btn) btn.setAttribute('aria-pressed', String(!!state[roomId]));
    renderDetails();
    update();
  }

  /* ---------------------------------------------------------
     8) RENDER — detail cards (grade / options / slider)
     --------------------------------------------------------- */
  function renderDetails() {
    // 既存の詳細カードを消す（empty placeholder は別管理）
    Array.prototype.slice.call(
      elRoomDetails.querySelectorAll('.detail-card')
    ).forEach(function (n) { n.remove(); });

    var selectedRooms = ROOMS.filter(function (r) { return !!state[r.id]; });

    if (!selectedRooms.length) {
      elDetailsEmpty.hidden = false;
      elDetailHint.textContent = '上で箇所を選ぶと、グレード・オプション・広さの設定がここに表示されます。';
      return;
    }
    elDetailsEmpty.hidden = true;
    elDetailHint.textContent = '選択中：' + selectedRooms.map(function (r) { return r.name; }).join('・');

    selectedRooms.forEach(function (room) {
      elRoomDetails.appendChild(buildDetailCard(room));
    });
  }

  function buildDetailCard(room) {
    var s = state[room.id];
    var card = el('div', 'detail-card', { 'data-detail': room.id });

    var head = el('div', 'detail-card__head');
    head.innerHTML =
      '<span class="detail-card__icon">' + svgIcon(room.icon, 18) + '</span>' +
      '<span class="detail-card__name">' + room.name + '</span>';
    card.appendChild(head);

    var body = el('div', 'detail-card__body');

    /* --- grade (radios) --- */
    var gradeGroup = el('div', 'detail-group');
    var gradeLabel = el('span', 'detail-group__label');
    gradeLabel.id = 'grade-label-' + room.id;
    gradeLabel.textContent = 'グレード';
    gradeGroup.appendChild(gradeLabel);

    var gradeOpts = el('div', 'grade-options', {
      role: 'radiogroup',
      'aria-labelledby': gradeLabel.id
    });
    GRADES.forEach(function (g) {
      var id = 'grade-' + room.id + '-' + g.id;
      var label = el('label', 'grade-option');
      var input = el('input', 'grade-option__input', {
        type: 'radio',
        name: 'grade-' + room.id,
        id: id,
        value: g.id
      });
      input.checked = (s.grade === g.id);
      input.addEventListener('change', function () {
        if (input.checked) { s.grade = g.id; update(); }
      });
      var face = el('span', 'grade-option__face');
      face.innerHTML =
        '<span class="grade-option__name">' + g.name + '</span>' +
        '<span class="grade-option__mult">×' + g.mult.toFixed(1) + '</span>';
      label.appendChild(input);
      label.appendChild(face);
      gradeOpts.appendChild(label);
    });
    gradeGroup.appendChild(gradeOpts);
    body.appendChild(gradeGroup);

    /* --- slider (area rooms) --- */
    if (room.type === 'area') {
      var sliderGroup = el('div', 'detail-group slider-field');
      var sLabelId = 'area-label-' + room.id;
      var sValId = 'area-val-' + room.id;
      var slabel = el('span', 'detail-group__label', { id: sLabelId });
      slabel.textContent = room.area.label;
      sliderGroup.appendChild(slabel);

      var readout = el('div', 'slider-readout');
      readout.innerHTML =
        '<span class="slider-readout__value" id="' + sValId + '">' + s.area +
        '<span class="slider-readout__unit">' + room.area.unitLabel + '</span></span>' +
        '<span class="slider-readout__unit">単価 ¥' + room.unit.toLocaleString('ja-JP') + ' / ' + room.area.unitLabel + '</span>';
      sliderGroup.appendChild(readout);

      var slider = el('input', 'slider-input', {
        type: 'range',
        min: String(room.area.min),
        max: String(room.area.max),
        step: String(room.area.step),
        value: String(s.area),
        'aria-labelledby': sLabelId,
        'aria-valuetext': s.area + room.area.unitLabel
      });
      var valEl = readout.querySelector('#' + sValId);
      function paintSlider() {
        var pct = (s.area - room.area.min) / (room.area.max - room.area.min) * 100;
        slider.style.backgroundSize = pct + '% 100%';
      }
      slider.addEventListener('input', function () {
        s.area = parseInt(slider.value, 10);
        valEl.innerHTML = s.area + '<span class="slider-readout__unit">' + room.area.unitLabel + '</span>';
        slider.setAttribute('aria-valuetext', s.area + room.area.unitLabel);
        paintSlider();
        update();
      });
      sliderGroup.appendChild(slider);

      var scale = el('div', 'slider-scale');
      scale.innerHTML = '<span>' + room.area.min + room.area.unitLabel + '</span><span>' +
        room.area.max + room.area.unitLabel + '</span>';
      sliderGroup.appendChild(scale);
      body.appendChild(sliderGroup);
      // 初期塗り
      window.requestAnimationFrame(paintSlider);
    }

    /* --- options (checkboxes) --- */
    if (room.options.length) {
      var optGroup = el('div', 'detail-group');
      var optLabelId = 'opt-label-' + room.id;
      var optLabel = el('span', 'detail-group__label', { id: optLabelId });
      optLabel.textContent = 'オプション';
      optGroup.appendChild(optLabel);

      var optList = el('div', 'opt-list', {
        role: 'group',
        'aria-labelledby': optLabelId
      });
      room.options.forEach(function (o) {
        var id = 'opt-' + room.id + '-' + o.id;
        var label = el('label', 'opt-toggle');
        var input = el('input', 'opt-toggle__input', {
          type: 'checkbox',
          id: id
        });
        input.checked = !!s.options[o.id];
        input.addEventListener('change', function () {
          s.options[o.id] = input.checked;
          update();
        });
        var box = el('span', 'opt-toggle__box');
        box.innerHTML = svgIcon('check', 13);
        var text = el('span', 'opt-toggle__text');
        text.innerHTML =
          '<span class="opt-toggle__name">' + o.name + '</span>' +
          '<span class="opt-toggle__price">+' + yen(o.price) + '</span>';
        label.appendChild(input);
        label.appendChild(box);
        label.appendChild(text);
        optList.appendChild(label);
      });
      optGroup.appendChild(optList);
      body.appendChild(optGroup);
    }

    card.appendChild(body);
    return card;
  }

  /* ---------------------------------------------------------
     9) RENDER — estimate lines + summary
     --------------------------------------------------------- */
  function buildLinesMarkup(result) {
    if (!result.lines.length) return '';
    var html = '';
    result.lines.forEach(function (ln) {
      html += '<div class="estimate__group">';
      html += '<div class="estimate__group-head">' +
        '<span class="estimate__group-name">' + ln.room.name +
        '<span class="estimate__group-grade">' + ln.grade.name + '</span></span>' +
        '<span class="estimate__line-amount">' + yen(ln.baseCost + ln.optLines.reduce(function (a, o) { return a + o.amount; }, 0)) + '</span>' +
        '</div>';
      // base detail line (area rooms show 単価×面積)
      if (ln.area != null) {
        html += '<div class="estimate__line">' +
          '<span class="estimate__line-name">' + ln.room.name +
          '（¥' + ln.room.unit.toLocaleString('ja-JP') + '×' + ln.area +
          ln.room.area.unitLabel + '×' + ln.grade.mult.toFixed(1) + '）</span>' +
          '<span class="estimate__line-amount">' + yen(ln.baseCost) + '</span></div>';
      } else {
        html += '<div class="estimate__line">' +
          '<span class="estimate__line-name">本体工事（' + ln.grade.name + '・×' +
          ln.grade.mult.toFixed(1) + '）</span>' +
          '<span class="estimate__line-amount">' + yen(ln.baseCost) + '</span></div>';
      }
      ln.optLines.forEach(function (o) {
        html += '<div class="estimate__line">' +
          '<span class="estimate__line-name estimate__line-name--sub">' + o.name + '</span>' +
          '<span class="estimate__line-amount">' + yen(o.amount) + '</span></div>';
      });
      html += '</div>';
    });
    return html;
  }

  // 現在トゥイーン中の値を保持
  var displayed = { subtotal: 0, overhead: 0, tax: 0, total: 0 };
  var tweenRAF = null;

  function setSummaryInstant(result) {
    if (tweenRAF) { cancelAnimationFrame(tweenRAF); tweenRAF = null; }
    elSubtotal.textContent = yen(result.subtotal);
    elOverhead.textContent = yen(result.overhead);
    elTax.textContent = yen(result.tax);
    elTotal.textContent = yen(result.total);
    if (elMobileTotal) elMobileTotal.textContent = yen(result.total);
    displayed = {
      subtotal: result.subtotal, overhead: result.overhead,
      tax: result.tax, total: result.total
    };
  }

  function tweenSummary(result) {
    if (prefersReducedMotion) { setSummaryInstant(result); return; }
    if (tweenRAF) cancelAnimationFrame(tweenRAF);
    var from = {
      subtotal: displayed.subtotal, overhead: displayed.overhead,
      tax: displayed.tax, total: displayed.total
    };
    var to = {
      subtotal: result.subtotal, overhead: result.overhead,
      tax: result.tax, total: result.total
    };
    var duration = 420;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      ['subtotal', 'overhead', 'tax', 'total'].forEach(function (k) {
        displayed[k] = Math.round(from[k] + (to[k] - from[k]) * eased);
      });
      elSubtotal.textContent = yen(displayed.subtotal);
      elOverhead.textContent = yen(displayed.overhead);
      elTax.textContent = yen(displayed.tax);
      elTotal.textContent = yen(displayed.total);
      if (elMobileTotal) elMobileTotal.textContent = yen(displayed.total);
      if (p < 1) {
        tweenRAF = requestAnimationFrame(step);
      } else {
        setSummaryInstant(result);
        tweenRAF = null;
      }
    }
    tweenRAF = requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------
     10) UPDATE — recompute + repaint + persist
     --------------------------------------------------------- */
  // 合計のSR通知：スライダー連続入力で polite 領域が洪水化しないよう
  // デバウンスし、合計が実際に変わったときだけ書き込む
  var liveTimer = null;
  var lastAnnounced = null;
  function announceTotal(hasAny, total) {
    if (!elLive) return;
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(function () {
      if (!hasAny) {
        if (lastAnnounced !== 0) { elLive.textContent = ''; lastAnnounced = 0; }
        return;
      }
      if (total === lastAnnounced) return;
      lastAnnounced = total;
      elLive.textContent = 'お見積もり合計（税込）' + yenPlain(total);
    }, 600);
  }

  var lastResult = null;
  function update() {
    var result = calc();
    lastResult = result;
    var hasAny = result.lines.length > 0;

    // lines
    if (hasAny) {
      elEmpty.hidden = true;
      elLines.innerHTML = buildLinesMarkup(result);
      elSummary.hidden = false;
    } else {
      elLines.innerHTML = '';
      elLines.appendChild(elEmpty);
      elEmpty.hidden = false;
      elSummary.hidden = true;
    }

    // summary：選択ありはトゥイーン、0 への戻り（リセット/全解除）は即時にして
    // 隠れた要素やモバイル合計バーへ ¥… → ¥0 のカウントダウンが走るのを防ぐ
    if (hasAny) tweenSummary(result); else setSummaryInstant(result);

    // aria-live で穏やかに通知（合計のみ・デバウンス＋実変化時のみ）
    announceTotal(hasAny, result.total);

    // mobile bar 表示制御
    if (elMobileBar) elMobileBar.hidden = !hasAny;
    // モバイルシートが開いていれば中身を同期
    if (elMobileSheet && !elMobileSheet.hidden) syncMobileSheet(result);

    // URL 保存
    writeHash();
  }

  /* ---------------------------------------------------------
     11) ACTIONS — copy / reset / print
     --------------------------------------------------------- */
  function buildPlainText(result) {
    var lines = [];
    lines.push('【結（ゆい）リフォーム お見積もり（概算）】');
    lines.push('');
    result.lines.forEach(function (ln) {
      lines.push('■ ' + ln.room.name + '（' + ln.grade.name + '）');
      if (ln.area != null) {
        lines.push('  本体工事 ' + ln.room.area.label + ' ' + ln.area +
          ln.room.area.unitLabel + '：' + yenPlain(ln.baseCost));
      } else {
        lines.push('  本体工事：' + yenPlain(ln.baseCost));
      }
      ln.optLines.forEach(function (o) {
        lines.push('   ＋' + o.name + '：' + yenPlain(o.amount));
      });
    });
    lines.push('');
    lines.push('工事費小計：' + yenPlain(result.subtotal));
    lines.push('諸経費(10%)：' + yenPlain(result.overhead));
    lines.push('消費税(10%)：' + yenPlain(result.tax));
    lines.push('───────────────');
    lines.push('合計（税込）：' + yenPlain(result.total));
    lines.push('');
    lines.push('※ 本見積もりは概算です。実際の金額は現地調査のうえ確定します。');
    lines.push('共有URL：' + location.href);
    return lines.join('\n');
  }

  function showCopyStatus(msg, isErr) {
    var cls = 'estimate__copy-status' + (isErr ? ' estimate__copy-status--err' : '');
    [elCopyStatus, elSheetCopyStatus].forEach(function (n) {
      if (n) { n.textContent = msg; n.className = cls; }
    });
    window.clearTimeout(showCopyStatus._t);
    showCopyStatus._t = window.setTimeout(function () {
      [elCopyStatus, elSheetCopyStatus].forEach(function (n) {
        if (n) { n.textContent = ''; n.className = 'estimate__copy-status'; }
      });
    }, 3200);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function doCopy() {
    if (!lastResult || !lastResult.lines.length) {
      showCopyStatus('箇所を選んでからコピーしてください。', true);
      return;
    }
    // デバウンス待ちの変更を共有URLへ即時反映してからコピー文面を作る
    writeHashNow();
    var text = buildPlainText(lastResult);
    var labelSpan = elCopyBtn.querySelector('.btn__label');
    function onOk() {
      showCopyStatus('明細をクリップボードにコピーしました。');
      elCopyBtn.classList.add('is-copied');
      if (labelSpan) labelSpan.textContent = 'コピーしました';
      window.clearTimeout(doCopy._t);
      doCopy._t = window.setTimeout(function () {
        elCopyBtn.classList.remove('is-copied');
        if (labelSpan) labelSpan.textContent = elCopyBtn.getAttribute('data-default-label');
      }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onOk, function () {
        if (fallbackCopy(text)) onOk();
        else showCopyStatus('コピーに失敗しました。明細を選択してコピーしてください。', true);
      });
    } else {
      if (fallbackCopy(text)) onOk();
      else showCopyStatus('コピーに失敗しました。', true);
    }
  }

  function doReset() {
    state = {};
    suppressHashWrite = true;
    renderToggles();
    renderDetails();
    update();
    suppressHashWrite = false;
    writeHash();
    showCopyStatus('選択をリセットしました。');
  }

  if (elCopyBtn) elCopyBtn.addEventListener('click', doCopy);
  if (elResetBtn) elResetBtn.addEventListener('click', doReset);
  if (elPrintBtn) elPrintBtn.addEventListener('click', function () { window.print(); });

  /* ---------------------------------------------------------
     12) MOBILE SHEET
     --------------------------------------------------------- */
  function syncMobileSheet(result) {
    if (!elMobileSheetBody) return;
    var html = '<div class="estimate__lines">' +
      (result.lines.length ? buildLinesMarkup(result)
        : '<p class="estimate__empty">箇所を選ぶと、ここに明細が表示されます。</p>') +
      '</div>';
    if (result.lines.length) {
      html += '<dl class="estimate__summary">' +
        '<div class="estimate__row"><dt>工事費小計</dt><dd class="estimate__amount">' + yen(result.subtotal) + '</dd></div>' +
        '<div class="estimate__row"><dt>諸経費（小計の10%）</dt><dd class="estimate__amount">' + yen(result.overhead) + '</dd></div>' +
        '<div class="estimate__row"><dt>消費税（10%）</dt><dd class="estimate__amount">' + yen(result.tax) + '</dd></div>' +
        '<div class="estimate__row estimate__row--total"><dt>合計（税込）</dt><dd class="estimate__total">' + yen(result.total) + '</dd></div>' +
        '</dl>';
      // シートからもコピーできるようにして、操作の行き止まりを防ぐ
      html += '<div class="mobile-sheet__actions">' +
        '<button type="button" class="btn btn--primary" data-sheet-copy>この明細をコピー</button>' +
        '</div>';
    }
    elMobileSheetBody.innerHTML = html;
  }

  var lastFocusBeforeSheet = null;
  // シート展開中は背景を不活性化し、aria-modal の約束（背景に到達しない）を満たす
  function setBackgroundInert(on) {
    [elApp, elHeader, elFooter, elMobileBar].forEach(function (n) {
      if (!n) return;
      if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert');
    });
  }
  function openSheet() {
    if (!elMobileSheet) return;
    lastFocusBeforeSheet = document.activeElement;
    syncMobileSheet(lastResult || calc());
    elMobileSheet.hidden = false;
    setBackgroundInert(true);
    elMobileBarToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    elMobileSheetClose.focus();
    document.addEventListener('keydown', onSheetKeydown);
  }
  function closeSheet() {
    if (!elMobileSheet) return;
    elMobileSheet.hidden = true;
    setBackgroundInert(false);
    elMobileBarToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onSheetKeydown);
    if (lastFocusBeforeSheet && lastFocusBeforeSheet.focus) lastFocusBeforeSheet.focus();
  }
  function onSheetKeydown(e) {
    if (e.key === 'Escape') { closeSheet(); return; }
    // 簡易フォーカストラップ
    if (e.key === 'Tab') {
      var focusables = elMobileSheet.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (elMobileBarToggle) elMobileBarToggle.addEventListener('click', openSheet);
  if (elMobileSheetClose) elMobileSheetClose.addEventListener('click', closeSheet);
  if (elMobileSheet) {
    elMobileSheet.addEventListener('click', function (e) {
      if (e.target === elMobileSheet) closeSheet();
    });
  }
  if (elMobileSheetBody) {
    elMobileSheetBody.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sheet-copy]');
      if (!b) return;
      doCopy();
    });
  }
  // デスクトップ幅(>700px)に広がったらシートはCSSで非表示になるため、
  // 開いたままだと body.overflow=hidden が残ってスクロール不能になる。確実に閉じる。
  window.addEventListener('resize', function () {
    if (elMobileSheet && !elMobileSheet.hidden && window.innerWidth > 700) {
      closeSheet();
    }
  });

  /* ---------------------------------------------------------
     13) hashchange（ブラウザの戻る/進む・外部からの貼り付け）
     --------------------------------------------------------- */
  window.addEventListener('hashchange', function () {
    // ページ内アンカー（#app / #configurator）は状態URLではないので無視し、
    // 上書きされた '#r=' 状態をURLに復元する（replaceStateなのでスクロールには影響しない）
    var h = location.hash.replace(/^#/, '');
    if (h && !/(?:^|&)r=/.test(h)) { writeHash(); return; }
    var next = decodeState(location.hash);
    // 文字列比較で実質変更があるときだけ再描画
    var encNext = (function () {
      var saved = state; state = next; var e = encodeState(); state = saved; return e;
    })();
    if (encNext === encodeState()) return;
    state = next;
    suppressHashWrite = true;
    renderToggles();
    renderDetails();
    update();
    suppressHashWrite = false;
  });

  /* ---------------------------------------------------------
     14) INIT
     --------------------------------------------------------- */
  function init() {
    var appEl = document.getElementById('app');
    if (appEl) appEl.hidden = false;

    state = decodeState(location.hash);
    suppressHashWrite = true;
    renderToggles();
    renderDetails();
    update();
    suppressHashWrite = false;
  }

  init();
})();
