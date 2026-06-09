# Web制作ポートフォリオ

副業でのWeb制作受注に向けて制作した、**架空ブランドのランディングページ（LP）4作品**と、**既存サイトのビフォーアフター改修事例**をまとめたポートフォリオです。
いずれもフレームワーク・ライブラリを一切使わず、**vanilla な HTML / CSS / JavaScript** のみで実装しています。

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

### 01. Atelier Lumen ｜ オンラインスクール
1クラス最大12名の少人数制オンライン創造学校という設定のLP。現役プロの伴走と週次の個別添削を強みに据え、**信頼感のある紺×金**で「静かに灯る学びの場」を表現しました。ヒーロー／特徴（5つの約束）／料金プラン3種／受講生の声／FAQ／申込フォームまでの一連の構成と、スクロール進捗バー・出現アニメーションを実装しています。

### 02. 焙煎所 茜 ｜ コーヒー焙煎所
スペシャルティコーヒーと自家製焼き菓子を扱う焙煎所という設定のLP。**焦茶×茜色**の配色と立ちのぼる湯気のSVGアニメーション、数字のカウントアップ演出で、早朝の焙煎所の香りと温度感を演出しました。一杯／セット／月替わり定期便のメニュー構成、モバイル用スティッキーCTAを備えています。

### 03. 月白 ｜ ビューティーサロン
表参道の路地裏にある完全予約制プライベートサロンという設定のLP。**墨緑×金茶**の落ち着いた配色と大きな余白、縦長ヒーローで「静かな美容」のラグジュアリーで上質な世界観を構築しました。料金プラン（単発・120分・会員制）、アコーディオンFAQ、OGP設定、`prefers-reduced-motion` 対応などアクセシビリティにも配慮しています。

### 04. 臨界 -RINKAI- ｜ パーソナルジム
恵比寿の完全予約制パーソナルジムという設定のLP。既存3作品の落ち着いた和テイストとはあえて対照的に、**漆黒×電光ライム**の大胆でエネルギッシュな配色と力強い見出し書体で「データで結果まで伴走する」高揚感を表現しました。数字のカウントアップ、ビフォーアフター実績（架空）、料金プラン、トレーナー紹介、アコーディオンFAQ、体験予約フォーム、モバイル用スティッキーCTAを実装。ネオン×ダークの配色でも全テキストが WCAG AA コントラストを満たすよう調整しています。

---

## サイト改修事例（ビフォーアフター）

LP制作だけでなく、**既存サイトの修正・改修**も主要な対応領域です。`case-study-refresh/` に、古い作りのサイトを現行標準へ作り直す過程をまとめた事例を収録しています。

- **題材（架空）**：地域の整骨院「わかば整骨院」の2008年当時の作りのサイト
- **Before**：[`./case-study-refresh/before/`](./case-study-refresh/before/) — 固定幅テーブルレイアウト・スマホ非対応・12pxの小さな文字・低コントラスト・marquee等の古い演出・電話番号がタップ発信不可
- **After**：[`./case-study-refresh/after/`](./case-study-refresh/after/) — モバイルファースト・セマンティックHTML5・WCAG AA・`tel:` リンク・24時間受付フォーム・OGP整備
- **事例ページ**：[`./case-study-refresh/`](./case-study-refresh/)（Before→After対応表・測定できる改善つき）。改修内容の詳しい解説は [`case-study-refresh/README.md`](./case-study-refresh/README.md)

「なぜその変更が来院・問い合わせにつながるのか」を一つひとつ言語化することを重視した、実際の改修案件を想定した事例です。

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
- **画像**: ヒーロー等の写真は [picsum.photos](https://picsum.photos)、お客様の声のアバターは [randomuser.me](https://randomuser.me) の人物写真、美容サロンのヒーロー背景とカフェの装飾は**自作のインラインSVG**（各 `assets/` 配下）を使用

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
└── case-study-refresh/     ← サイト改修ビフォーアフター事例
    ├── index.html          ← 事例トップ（Before / After 比較）
    ├── README.md           ← 改修内容の解説
    ├── before/             ← 改修前（2008年当時の作り）
    └── after/              ← 改修後（現行標準）
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
- フォントは Google Fonts、写真は picsum.photos / randomuser.me の各規約に従います。装飾SVGは本ポートフォリオのために制作したオリジナルです。
