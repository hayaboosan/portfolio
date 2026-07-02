Attribute VB_Name = "modConfig"
Option Explicit
'=====================================================================
' modConfig : 定数集約モジュール
'---------------------------------------------------------------------
' シート名・フォルダ名・色などの「変わりうる値」をここに集約する。
' 仕様変更（シート名変更・フォルダ移動など）はこのモジュールの修正
' だけで済むようにしておく。
'=====================================================================

'--- アプリ情報 -------------------------------------------------------
Public Const APP_TITLE As String = "月次売上レポート自動集計ツール"
Public Const COMPANY_NAME As String = "コトリ商事"   ' 架空の雑貨卸

'--- シート名 ---------------------------------------------------------
Public Const SHEET_MENU As String = "操作パネル"
Public Const SHEET_RAW As String = "生データ"
Public Const SHEET_LOG As String = "取込ログ"
Public Const SHEET_REPORT As String = "月次レポート"

'--- CSV取込設定 ------------------------------------------------------
' ブックと同じ階層から見た相対パス（見つからない場合はフォルダ選択にフォールバック）
Public Const CSV_FOLDER_RELATIVE As String = "sample-data\csv"
Public Const CSV_FILE_PATTERN As String = "sales_*.csv"
Public Const CSV_COL_COUNT As Long = 8        ' 日付,支店,カテゴリ,商品コード,商品名,数量,単価,金額
Public Const MAX_RAW_ROWS As Long = 200000    ' 取込バッファの上限行数

'--- レポート設定 -----------------------------------------------------
Public Const TOP_PRODUCT_COUNT As Long = 10   ' 上位商品の表示件数
Public Const CHART_NAME_BRANCH As String = "chartBranch"

'--- 色定数（RGB値は Const にできないため Long 直値で保持） -----------
Public Const COLOR_TITLE_BG As Long = 6898214     ' RGB(38, 66, 105)   紺
Public Const COLOR_HEADER_BG As Long = 12874308   ' RGB(68, 114, 196)  青
Public Const COLOR_BAND_BG As Long = 15983321     ' RGB(217, 226, 243) 薄青
Public Const COLOR_TOTAL_BG As Long = 15263976    ' RGB(232, 232, 232) 薄灰
Public Const COLOR_POSITIVE As Long = 25600       ' RGB(0, 100, 0)     緑（前月比プラス）
Public Const COLOR_NEGATIVE As Long = 192         ' RGB(192, 0, 0)     赤（前月比マイナス）
Public Const COLOR_NOTE As Long = 8421504         ' RGB(128, 128, 128) 注記グレー

'--- 実行結果の書き込み先（操作パネル上） -----------------------------
Public Const MENU_RESULT_CELL As String = "B8"    ' 前回実行結果を表示するセル
