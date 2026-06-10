# Web制作ポートフォリオ

副業でのWeb制作受注に向けて制作した、**架空ブランドのランディングページ（LP）5作品**、**既存サイトのビフォーアフター改修事例2件**、**よくある小修正のデモ集**、**リアルタイム計算する見積もりWebアプリ**、そして**条件で絞り込める賃貸物件検索UI**をまとめたポートフォリオです。
いずれもフレームワーク・ライブラリを一切使わず、**vanilla な HTML / CSS / JavaScript** のみで実装しています。スクロール型のLPだけでなく、状態を持つ「動くツール」やデータ駆動の「一覧×絞り込み」まで、ページの種類そのものに幅を持たせています。

トップ（ハブ）ページ [`index.html`](./index.html) から、各作品へ相対パスでアクセスできます。

> ⚠️ 掲載しているブランド・店舗・サービス・お客様の声・実績数値はすべて**架空のサンプル**です。実在の企業・サービスとは関係ありません。

---

## 収録作品

| # | 作品 | ジャンル | キャッチコピー | 配色（主要色） | フォルダ |
|---|------|----------|----------------|----------------|----------|
| 01 | **Atelier Lumen（アトリエ・ルーメン）** | 少人数制オンライン創造学校 | 学びを、灯す。 | 紺 `#1B2A4A` × 金 `#E8B04B` / 地 `#F7F4EC` | [`./online-school/`](./online-school/) |
| 02 | **焙煎所 茜（AKANE ROASTERY）** | スペシャルティコーヒー焙煎所 | 一杯に、夜明けの色を。 | 焦茶 `#3A2A1E` × 茜色 `#C2632B` / 地 `#F4EDE2` | [`./cafe/`](./cafe/) |
| 03 | **月白（Tsukishiro Atelier）** | 完全予約制プライベートサロン | 肌が、静かに目を覚ます。 | 墨緑 `#1F2A28` × 金茶 `#A88B6A` / 地 `#F4F1EB` | [`./beauty-salon/`](./beauty-salon/) |
| 04 | **臨界 -RINKAI-** | 完全予約制パーソナルジム | 2ヶ月で、別人の自分へ。 | 漆黒 `#17171B` × 電光ライム `#C8FF00` / 地 `#101015` | [`./personal-gym/`](./personal-gym/) |
| 05 | **そよかぜ歯科・矯正歯科** | 歯科クリニック | 歯医者さんを、好きになる。 | ソフトブルー `#1577A8` × ミント `#0C7A6E` / 地 `#EEF6FB` | [`./dental-clinic/`](./dental-clinic/) |

### 01. Atelier Lumen ｜ オンラインスクール
1クラス最大12名の少人数制オンライン創造学校という設定のLP。現役プロの伴走と週次の個別添削を強みに据え、**信頼感のある紺×金**で「静かに灯る学びの場」を表現しました。ヒーロー／特徴（5つの約束）／料金プラン3種／受講生の声／FAQ／申込フォームまでの一連の構成と、スクロール進捗バー・出現アニメーションを実装しています。

### 02. 焙煎所 茜 ｜ コーヒー焙煎所
スペシャルティコーヒーと自家製焼き菓子を扱う焙煎所という設定のLP。**焦茶×茜色**の配色と立ちのぼる湯気のSVGアニメーション、数字のカウントアップ演出で、早朝の焙煎所の香りと温度感を演出しました。一杯／セット／月替わり定期便のメニュー構成、モバイル用スティッキーCTAを備えています。

### 03. 月白 ｜ ビューティーサロン
表参道の路地裏にある完全予約制プライベートサロンという設定のLP。**墨緑×金茶**の落ち着いた配色と大きな余白、縦長ヒーローで「静かな美容」のラグジュアリーで上質な世界観を構築しました。料金プラン（単発・120分・会員制）、アコーディオンFAQ、OGP設定、`prefers-reduced-motion` 対応などアクセシビリティにも配慮しています。

### 04. 臨界 -RINKAI- ｜ パーソナルジム
恵比寿の完全予約制パーソナルジムという設定のLP。既存3作品の落ち着いた和テイストとはあえて対照的に、**漆黒×電光ライム**の大胆でエネルギッシュな配色と力強い見出し書体で「データで結果まで伴走する」高揚感を表現しました。数字のカウントアップ、ビフォーアフター実績（架空）、料金プラン、トレーナー紹介、アコーディオンFAQ、体験予約フォーム、モバイル用スティッキーCTAを実装。ネオン×ダークの配色でも全テキストが WCAG AA コントラストを満たすよう調整しています。

### 05. そよかぜ歯科・矯正歯科 ｜ 歯科クリニック
駅近の地域歯科医院という設定のLP。既存4作品のダーク／和テイスト寄りの配色とはあえて対照的に、**白×ソフトブルー／ミントに暖色を効かせた明るく清潔なトーン**で「歯医者さんを、好きになる」親しみやすさと安心感を表現しました。丸みのある書体（Zen Maru Gothic）で怖さを和らげ、選ばれる理由・診療案内6カード・院長/スタッフ紹介・料金の目安・患者さんの声・**曜日×午前午後の○×診療時間表**・自作SVGのアクセス地図・アコーディオンFAQ・Web予約フォーム・モバイル用スティッキーCTAを実装。明るい配色でも本文・ボタン文字が WCAG AA を満たすよう、装飾用の明るい暖色とテキスト用の濃い暖色を分けて調整しています。

---

## サイト改修事例（ビフォーアフター）2件

LP制作だけでなく、**既存サイトの修正・改修**も主要な対応領域です。古い作りのサイトを現行標準へ作り直す過程を、業種の異なる2つの事例にまとめています。「なぜその変更が来院・来店・問い合わせにつながるのか」を一つひとつ言語化することを重視しました。

### ① 整骨院（医療・店舗系） — `case-study-refresh/`
- **題材（架空）**：地域の整骨院「わかば整骨院」の2008年当時の作りのサイト
- **Before**：[`./case-study-refresh/before/`](./case-study-refresh/before/) — 固定幅テーブルレイアウト・スマホ非対応・12pxの小さな文字・低コントラスト・marquee等の古い演出・電話番号がタップ発信不可
- **After**：[`./case-study-refresh/after/`](./case-study-refresh/after/) — モバイルファースト・セマンティックHTML5・WCAG AA・`tel:` リンク・24時間受付フォーム・OGP整備
- **事例ページ**：[`./case-study-refresh/`](./case-study-refresh/)（Before→After対応表・測定できる改善つき）。詳しい解説は [`case-study-refresh/README.md`](./case-study-refresh/README.md)

### ② 個人食堂（飲食店系） — `case-study-restaurant/`
- **題材（架空）**：昔ながらの大衆食堂「ますだ食堂」の2008年当時の作りのサイト
- **Before**：[`./case-study-restaurant/before/`](./case-study-restaurant/before/) — お品書きが画像1枚（読めない・更新できない）・固定幅で横スクロール必須・営業時間が低コントラスト・電話のみ／地図なし
- **After**：[`./case-study-restaurant/after/`](./case-study-restaurant/after/) — 価格つきの読めるHTMLメニュー・モバイルファースト・営業時間テーブル＋定休日明記・`tel:` リンク＋24時間予約フォーム・自作SVGのアクセス地図・OGP整備
- **事例ページ**：[`./case-study-restaurant/`](./case-study-restaurant/)（Before→After対応表・測定できる改善つき）。詳しい解説は [`case-study-restaurant/README.md`](./case-study-restaurant/README.md)

---

## よくある小修正デモ集 — `quick-fixes/`

クラウドソーシングで件数の多い**単発の小修正案件**に直結する内容を、[`./quick-fixes/`](./quick-fixes/) に「実際に触って違いが分かる Before→After デモ」としてまとめています。扱う修正：

- **スマホ対応化**（固定幅レイアウトの横スクロール解消）
- **問い合わせフォーム設置**（純正JSのクライアントバリデーション・`aria-invalid`/`aria-describedby`）
- **表示速度・画像最適化**（`width`/`height`・`loading="lazy"`・`aspect-ratio` による CLS 解消）
- **文字の可読性・コントラスト改善**（WCAG AA 配色への切り替え実演）
- **電話番号の `tel:` リンク化**（タップ発信＋44px以上のタップ領域）
- **デザイン崩れ・レイアウト修正**（はみ出し・重なりの解消）

各デモは `iframe srcdoc` やクラス切り替えで自己完結し、JavaScript 無効時も Before / After の双方が見えるようにフォールバックしています。

---

## 見積もりWebアプリ — `estimator/`

スクロール型のLPとは別ジャンルとして、**状態を持つ1画面完結のアプリ風ツール**を [`./estimator/`](./estimator/) に収録しています。架空の工務店「結（ゆい）リフォーム」のリフォーム見積もりシミュレーターです。

- **リアルタイム計算**：箇所（キッチン・浴室・トイレ・洗面・内装・外壁）×グレード×オプション×広さを選ぶと、明細・工事費小計・諸経費（10%）・消費税（10%）・税込合計を即時計算（数値はトゥイーンで更新）
- **URLに状態保存**：選択内容を URL ハッシュにエンコードし、ブックマーク・共有リンクからそのまま完全復元（`history.replaceState` で履歴を汚さず保存）
- **アクセシビリティ**：ネイティブの radio / checkbox / range によるキーボード完全操作、`:focus-visible`、`role=radiogroup`、合計の `aria-live` 通知（デバウンス）、コントロール枠の非テキストコントラスト 3:1、グレード選択の非色インジケータ、モバイル明細シートの背景 `inert` 化
- **JS無効フォールバック**：計算にJSが必要なため、無効時は空白にせず「JavaScriptを有効に」の案内＋**基本工事費の早見表**を表示
- **見積もりのコピー / 印刷 / リセット**、モバイルでは画面下部のスティッキー合計バー＋明細シート

UIフレームワークも状態管理ライブラリも使わず、素のJSで状態モデル・URL同期・計算・描画を実装した、「LPだけでなくプロダクトUIも作れる」ことを示す一本です。

---

## 賃貸物件検索UI — `catalog/`

LP（マーケティング）・見積もりアプリ（ツール）に続く第3のジャンルとして、**たくさんの項目を条件で絞り込む「一覧×絞り込み」のデータUI**を [`./catalog/`](./catalog/) に収録しています。架空の不動産会社「まどり不動産」の賃貸物件検索画面です。

- **多軸の絞り込み（ファセット検索）**：フリーワード／家賃上限／間取り（複数）／専有面積／駅徒歩／築年数／エリア（駅・複数）／こだわり条件（複数）／お気に入りのみ。**該当件数はリアルタイムに更新**
- **並べ替え**：おすすめ／家賃安・高／面積広／駅近／築浅／新着順（DOMノードを並べ替え）
- **アクティブ条件のチップ**：効いている条件をタグ表示し、個別「×」解除・「すべて解除」に対応
- **URLに状態保存**：絞り込み・並べ替え・表示形式を URL クエリ文字列（`URLSearchParams`）に保存し、共有リンク・ページ内アンカーと両立したまま完全復元
- **お気に入り保存**：ハートで `localStorage` に永続化し、「お気に入りのみ表示」で絞り込み／リスト・グリッド表示の切り替え
- **プログレッシブエンハンスメント**：物件データの「正」は静的HTML。**JS無効でも全21件をそのまま一覧**でき（SEO・スクリーンリーダー対応）、JS有効時だけ `data-*` を読んで絞り込みを上乗せ。「2階以上」は所在階、「南向き」は方角という**実データから派生条件を判定**し、表示と絞り込みの食い違いを防止
- **アクセシビリティ**：件数変更の `role=status` 通知、モバイル絞り込みドロワーの `role=dialog`/`aria-modal`・**フォーカストラップ**・背景 `inert`・Esc・フォーカス復帰、カスタムチェックボックス/セレクトの `:focus-visible`、本文4.5:1・枠/大文字3:1 のコントラスト

「マーケティングのLP」「状態を持つツール」「データ駆動の一覧UI」と、Webページの主要な3ジャンルを一通り作れることを示す一本です。

---

## 技術構成

- **言語 / 構成**: HTML5 + CSS3 + 素の JavaScript（ES5〜ES6相当）
- **フレームワーク / ライブラリ**: 不使用（React・Vue・jQuery・Bootstrap 等は一切なし）
- **ビルドツール**: なし（バンドル・トランスパイル工程なし。ファイルを開けばそのまま動作）
- **CSS設計**: BEM風のクラス命名、CSS カスタムプロパティ（変数）でブランド配色を管理、`clamp()` による流体タイポグラフィ
- **レイアウト**: CSS Grid / Flexbox によるレスポンシブ対応（スマートフォン〜ワイド画面）
- **演出**: `IntersectionObserver` によるスクロール出現、カウントアップ、CSS アニメーション
- **アクセシビリティ**: スキップリンク、ARIA属性、キーボード操作対応、`prefers-reduced-motion` への配慮
- **フォント**: Google Fonts（Shippori Mincho B1 / Zen Kaku Gothic New / Noto Sans JP / Cormorant Garamond など）
- **画像**: ヒーロー等の写真は [picsum.photos](https://picsum.photos)、お客様の声などの人物アバターは**自作SVG（イニシャル/シルエット）**、美容サロンのヒーロー背景とカフェの装飾は**自作のインラインSVG**（各 `assets/` 配下）を使用

### ディレクトリ構成

```text
portfolio/
├── index.html              ← ポートフォリオのトップ（ハブ）ページ（単一ファイル完結）
├── README.md               ← このファイル
├── online-school/          ← 01. Atelier Lumen
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── cafe/                   ← 02. 焙煎所 茜
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   └── assets/beans.svg    ← 自作の装飾SVG
├── beauty-salon/           ← 03. 月白
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   └── assets/hero.svg     ← 自作のヒーロー背景SVG
├── personal-gym/           ← 04. 臨界 -RINKAI-
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   └── assets/hero.svg
├── dental-clinic/          ← 05. そよかぜ歯科・矯正歯科
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   └── assets/             ← 自作のヒーロー背景SVG・アクセス地図SVG
├── case-study-refresh/     ← サイト改修事例①（整骨院）
│   ├── index.html          ← 事例トップ（Before / After 比較）
│   ├── README.md           ← 改修内容の解説
│   ├── before/             ← 改修前（2008年当時の作り）
│   └── after/              ← 改修後（現行標準）
├── case-study-restaurant/  ← サイト改修事例②（個人食堂）
│   ├── index.html          ← 事例トップ（Before / After 比較）
│   ├── README.md           ← 改修内容の解説
│   ├── before/             ← 改修前（2008年当時の作り）
│   └── after/              ← 改修後（現行標準）
├── quick-fixes/            ← よくある小修正デモ集
│   └── index.html          ← Before→After デモ（単一ファイル完結）
├── estimator/              ← 見積もりWebアプリ（1画面完結のアプリ風ツール）
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
└── catalog/                ← 賃貸物件検索UI（データ駆動の絞り込みカタログ）
    ├── index.html          ← 静的な物件一覧（21件）＋絞り込みUI
    ├── css/style.css
    ├── js/main.js
    └── README.md
```

> ハブページ `index.html` は CSS / JS をすべて `<style>` / `<script>` に内包した**単一ファイル完結**です。各作品は `css/` `js/` に分離した構成になっています。

---

## ローカルでの見方

### 方法A：ファイルを直接開く（最も手軽）
`portfolio/index.html` をダブルクリック、またはブラウザにドラッグ＆ドロップするだけで表示できます。
各作品へのリンクは相対パス（`./online-school/` など）のため、そのまま遷移できます。

### 方法B：ローカルサーバーで開く（推奨）
`file://` ではなく `http://` で開くと、より本番に近い挙動で確認できます。`portfolio` フォルダの中で以下のいずれかを実行してください。

```bash
# Python（標準で入っていることが多い）
python -m http.server 8000
#  → ブラウザで http://localhost:8000/ を開く

# Node.js（npx 経由・インストール不要）
npx serve .
#  → 表示された http://localhost:3000/ などを開く

# VS Code を使う場合
# 拡張機能「Live Server」を入れ、index.html を右クリック →「Open with Live Server」
```

PowerShell（Windows）でも同じく `python -m http.server 8000` で起動できます。

---

## デプロイ手順

どちらも**ビルド不要の静的サイト**としてそのまま公開できます。

### A. Vercel へのデプロイ

#### A-1. CLI で公開（最短）
```bash
# 1. Vercel CLI を導入（初回のみ）
npm i -g vercel

# 2. portfolio フォルダ内でデプロイ
vercel

#   初回はログイン → 対話に答える（設定は基本そのままEnterでOK）：
#     Set up and deploy? → Y
#     Which scope?        → 自分のアカウント
#     Link to existing project? → N
#     Project name?       → portfolio など
#     In which directory is your code located? → ./（そのまま）
#   ※ ビルド設定を聞かれても空（None）でOK。静的ファイルがそのまま配信されます。

# 3. 本番URLとして公開する
vercel --prod
```
完了すると `https://<プロジェクト名>.vercel.app` のURLが発行されます。

#### A-2. GitHub 連携で公開（自動デプロイ）
1. このフォルダをGitHubリポジトリにプッシュする（下記「GitHubへの初回プッシュ」を参照）。
2. [vercel.com](https://vercel.com) にGitHubアカウントでログイン。
3. **Add New… → Project** から対象リポジトリを **Import**。
4. Framework Preset は **Other**（静的サイト）、Build Command と Output Directory は**空のまま**で **Deploy**。
5. 以降は `main` ブランチへ push するたびに自動で再デプロイされます。

### B. GitHub Pages へのデプロイ

#### B-1. GitHubへの初回プッシュ
```bash
# portfolio フォルダ内で
git init
git add .
git commit -m "Add portfolio hub page and three sample LPs"
git branch -M main

# 事前に GitHub 上で空のリポジトリ（例：portfolio）を作成しておく
git remote add origin https://github.com/<ユーザー名>/portfolio.git
git push -u origin main
```

#### B-2. Pages を有効化
1. GitHubのリポジトリ画面で **Settings → Pages** を開く。
2. **Build and deployment → Source** を **Deploy from a branch** に設定。
3. **Branch** で `main` / `/ (root)` を選び **Save**。
4. 数十秒〜数分後、`https://<ユーザー名>.github.io/portfolio/` で公開されます。

> GitHub Pages では各作品が `https://<ユーザー名>.github.io/portfolio/online-school/` のように**サブパス配下**で公開されます。本ポートフォリオのリンクはすべて相対パス（`./online-school/` など）なので、サブパスでも問題なく動作します。

---

## ライセンス / 注意事項

- 本リポジトリは制作スキルを示すためのポートフォリオです。
- 掲載ブランド・実績・口コミ・価格はすべて架空であり、商用利用を目的としたものではありません。
- フォントは Google Fonts、写真は picsum.photos の規約に従います。お客様の声などの人物アバター（イニシャル/シルエットの自作SVG）と装飾SVGは本ポートフォリオのために制作したオリジナルです。
