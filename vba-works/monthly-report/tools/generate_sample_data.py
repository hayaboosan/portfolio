# -*- coding: utf-8 -*-
"""
架空の雑貨卸「コトリ商事」日次売上CSV ジェネレータ
====================================================
月次売上レポート自動集計ツール（VBAポートフォリオ）用のサンプルデータを生成する。

- 出力先 : ../sample-data/csv/sales_YYYYMMDD.csv
- 期間   : 2026/05/01〜2026/06/30（当月6月30日分 ＋ 前月比算出用に前月5月31日分）
- 文字コード: cp932（Shift_JIS）… VBA の Open/Line Input でそのまま読める形式
- 乱数はシード固定（再実行しても同じデータになる）

※ 登場する社名・支店・商品・数値はすべて架空の見本値です。
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 20260630
OUT_DIR = Path(__file__).resolve().parents[1] / "sample-data" / "csv"

# ---------------------------------------------------------------
# マスタ定義（すべて架空）
# ---------------------------------------------------------------

# 支店名, 規模係数, 6月の伸び係数（前月比に変化をつける）
BRANCHES = [
    ("東京本店",   1.60, 1.09),
    ("大阪支店",   1.30, 1.05),
    ("名古屋支店", 1.10, 1.12),
    ("福岡支店",   0.95, 1.03),
    ("札幌支店",   0.85, 0.94),   # 6月は前月割れさせる
    ("仙台支店",   0.80, 1.07),
]

# 商品コード, 商品名, カテゴリ, 卸単価(円), 基準ロット数, 人気度
PRODUCTS = [
    ("KT-001", "木製カッティングボード",     "キッチン雑貨",     1480, 14, 1.1),
    ("KT-002", "ホーロー保存容器 3点セット", "キッチン雑貨",     1980, 12, 1.3),
    ("KT-003", "シリコン調理スプーン",       "キッチン雑貨",      520, 30, 1.0),
    ("KT-004", "リネンキッチンクロス 2枚組", "キッチン雑貨",      780, 24, 1.2),
    ("ST-001", "真鍮ボールペン",             "ステーショナリー",  980, 18, 1.4),
    ("ST-002", "活版印刷メモパッド",         "ステーショナリー",  420, 40, 1.2),
    ("ST-003", "リネン表紙ノート A5",        "ステーショナリー",  680, 28, 1.5),
    ("ST-004", "マスキングテープ 12色セット","ステーショナリー", 1250, 16, 1.1),
    ("IN-001", "アロマキャンドル",           "インテリア小物",    880, 22, 1.3),
    ("IN-002", "ガラスフラワーベース",       "インテリア小物",   1650, 10, 1.0),
    ("IN-003", "ラタン小物かご",             "インテリア小物",    950, 18, 0.9),
    ("IN-004", "陶器の一輪挿し",             "インテリア小物",    720, 16, 0.8),
    ("BS-001", "オーガニックコットンタオル", "バス・サニタリー", 1180, 20, 1.2),
    ("BS-002", "陶器のソープディッシュ",     "バス・サニタリー",  640, 18, 0.9),
    ("BS-003", "バスソルト 3種セット",       "バス・サニタリー", 1380, 14, 1.1),
    ("BS-004", "ヒノキの入浴剤 10包",        "バス・サニタリー",  920, 20, 1.0),
    ("GD-001", "テラコッタ植木鉢 S",         "ガーデン雑貨",      560, 26, 1.0),
    ("GD-002", "ブリキのじょうろ",           "ガーデン雑貨",     1750, 10, 0.9),
    ("GD-003", "ガーデンピック 3本組",       "ガーデン雑貨",      480, 30, 0.8),
    ("GD-004", "多肉植物用ミニポット",       "ガーデン雑貨",      380, 34, 1.1),
    ("GF-001", "クラフト紙ギフトバッグ 10枚","ラッピング用品",    650, 36, 1.3),
    ("GF-002", "サテンリボン 5色セット",     "ラッピング用品",    540, 30, 1.0),
    ("GF-003", "ギフトボックス 小 5個組",    "ラッピング用品",    880, 24, 1.2),
    ("GF-004", "和紙包装紙 20枚入",          "ラッピング用品",   1150, 18, 0.9),
]

HEADER = ["日付", "支店", "カテゴリ", "商品コード", "商品名", "数量", "単価", "金額"]


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def main() -> None:
    rng = random.Random(SEED)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    month_total = {}   # "YYYYMM" -> 金額合計（検証用）
    file_count = 0
    row_count = 0

    for day in daterange(date(2026, 5, 1), date(2026, 6, 30)):
        # 土日は出荷が少ない（卸のため受注は平日中心という設定）
        weekday_factor = 0.35 if day.weekday() >= 5 else 1.0
        rows = []

        for branch, scale, june_factor in BRANCHES:
            month_factor = june_factor if day.month == 6 else 1.0
            for code, name, category, price, base_lot, popularity in PRODUCTS:
                # その日にその支店で受注があったかどうか（人気商品ほど頻度が高い）
                hit_prob = min(0.85, 0.45 * popularity * weekday_factor + 0.10)
                if rng.random() > hit_prob:
                    continue
                qty = max(1, round(
                    base_lot * scale * month_factor * weekday_factor
                    * popularity * rng.uniform(0.55, 1.45)
                ))
                amount = qty * price
                rows.append([
                    day.strftime("%Y/%m/%d"), branch, category,
                    code, name, qty, price, amount,
                ])
                ym = day.strftime("%Y%m")
                month_total[ym] = month_total.get(ym, 0) + amount

        out_file = OUT_DIR / f"sales_{day.strftime('%Y%m%d')}.csv"
        with out_file.open("w", encoding="cp932", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(HEADER)
            writer.writerows(rows)
        file_count += 1
        row_count += len(rows)

    print(f"生成完了: {file_count} ファイル / {row_count} 行 -> {OUT_DIR}")
    for ym in sorted(month_total):
        print(f"  {ym} 売上合計: {month_total[ym]:,} 円")
    if len(month_total) == 2:
        keys = sorted(month_total)
        ratio = month_total[keys[1]] / month_total[keys[0]] - 1
        print(f"  前月比: {ratio:+.1%}")


if __name__ == "__main__":
    main()
