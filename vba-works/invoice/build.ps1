# ============================================================================
# build.ps1 ： 架空マクロ「請求書作成.xlsm」のデモブックを組み立てる
# ----------------------------------------------------------------------------
# ポートフォリオ納品文書見本（解読レポート・変更内容書）に登場する
# 架空の請求書作成マクロの「実物」を、Excel COM で自動生成するスクリプト。
#
#   1. シート4枚（受注一覧(2026)／請求書テンプレ／設定／処理済み）と
#      架空のサンプルデータ・ボタン3個を組み立てる
#   2. src\after\ の VBA ソース（修正後版）を VBProject に注入して
#      dist\invoice-demo.xlsm として保存
#   3. マクロ CreateInvoiceSelected を実行して請求書PDFを実際に生成（実行時間を計測）
#   4. Range.CopyPicture ＋ Chart.Export で assets\ にスクリーンショットPNGを出力
#   5. src\before\（修正前版）を別ブックに注入し、変更内容書見本のとおり
#      「実行時エラー 9」が実際に起きることを確認する
#
# 【前提】
#   - Windows ＋ デスクトップ版 Excel
#   - 「VBAプロジェクト オブジェクト モデルへのアクセスを信頼する」が有効
#     （無効の場合、このスクリプトは設定を変更せず、マクロ無しのシェルブックを
#      作成して docs\manual-import.md の手動インポート手順に案内します）
#
# 【実行】  pwsh -File build.ps1
#           （PowerShell 5.1 でも動作するよう UTF-8 BOM 付きで保存しています）
#
# ※このブック・データはすべて見本用の架空のものです。
# ============================================================================
[CmdletBinding()]
param(
    [switch]$SkipBeforeCheck    # 修正前コードのエラー再現チェックを飛ばす
)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcAfter  = Join-Path $root 'src\after'
$srcBefore = Join-Path $root 'src\before'
$distDir   = Join-Path $root 'dist'
$assetsDir = Join-Path $root 'assets'
$xlsmPath  = Join-Path $distDir 'invoice-demo.xlsm'
$pdfBase   = Join-Path $distDir '請求書PDF'

foreach ($d in $distDir, $assetsDir, $pdfBase) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null }
}

function Write-Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

# ----------------------------------------------------------------------------
# セルの Value2 を設定する（リフレクション経由）
#   PowerShell の COM バインダは同名プロパティへの代入で型ルールをキャッシュ
#   するため、string と double を混在させると InvalidCastException になる。
#   それを避けて IDispatch 経由で直接 PROPERTYPUT する。
# ----------------------------------------------------------------------------
function Set-Val($obj, $value) {
    [void]$obj.GetType().InvokeMember('Value2', [System.Reflection.BindingFlags]::SetProperty, $null, $obj, @($value))
}

# ----------------------------------------------------------------------------
# .bas / .cls からエクスポート形式のヘッダ行を取り除いてコード本体を返す
# （AddFromString で注入するため。Attribute 行等は VBE が管理する）
# ----------------------------------------------------------------------------
function Get-VbaBody([string]$Path) {
    $lines = [System.IO.File]::ReadAllLines($Path)   # UTF-8 として読む
    $body = New-Object System.Collections.Generic.List[string]
    $inHeader = $true
    foreach ($ln in $lines) {
        if ($inHeader -and $ln -match '^(VERSION |BEGIN\s*$|END\s*$|\s+MultiUse|Attribute )') { continue }
        $inHeader = $false
        $body.Add($ln)
    }
    return ($body -join "`r`n")
}

# ----------------------------------------------------------------------------
# VBA ソース一式（Module1 / Module2 / ThisWorkbook）をブックに注入する
# ----------------------------------------------------------------------------
function Add-VbaCode($wb, [string]$srcDir) {
    $vbc = $wb.VBProject.VBComponents
    foreach ($name in 'Module1', 'Module2') {
        $comp = $vbc.Add(1)      # 1 = vbext_ct_StdModule
        $comp.Name = $name
        $cm = $comp.CodeModule
        # VBEの「変数の宣言を強制する」設定で自動挿入される Option Explicit を
        # 消してから注入する（ソース側にもあるため重複するとコンパイルエラー）
        if ($cm.CountOfLines -gt 0) { $cm.DeleteLines(1, $cm.CountOfLines) }
        $cm.AddFromString((Get-VbaBody (Join-Path $srcDir "$name.bas")))
    }
    $cm = $vbc.Item('ThisWorkbook').CodeModule
    if ($cm.CountOfLines -gt 0) { $cm.DeleteLines(1, $cm.CountOfLines) }
    $cm.AddFromString((Get-VbaBody (Join-Path $srcDir 'ThisWorkbook.cls')))
}

# ----------------------------------------------------------------------------
# 範囲を PNG に書き出す（Range.CopyPicture → 空グラフに貼付け → Chart.Export）
# ----------------------------------------------------------------------------
function Export-RangePng($ws, [string]$addr, [string]$pngPath) {
    $ws.Activate()
    $rg = $ws.Range($addr)
    $w = [double]$rg.Width + 4
    $h = [double]$rg.Height + 4
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $null = $rg.CopyPicture(1, 2)      # xlScreen, xlBitmap
        Start-Sleep -Milliseconds 300
        $co = $ws.ChartObjects().Add(10, [double]$rg.Top + [double]$rg.Height + 40, $w, $h)
        try { $co.Chart.ChartArea.Format.Line.Visible = 0 } catch { }   # 枠線を消す
        # グラフをアクティブにしてから貼り付ける（非アクティブだと空のまま
        # エクスポートされてしまうことがある）
        $co.Activate() | Out-Null
        $co.Chart.Paste()
        Start-Sleep -Milliseconds 400
        $null = $co.Chart.Export($pngPath, 'PNG')
        $co.Delete()
        try { $excel.CutCopyMode = 0 } catch { }
        if ((Test-Path $pngPath) -and ((Get-Item $pngPath).Length -gt 5KB)) { break }
        Write-Host "    出力が不完全のため再試行します（$attempt 回目）"
        Start-Sleep -Milliseconds 600
    }
    Write-Host "    PNG: $pngPath"
}

# ----------------------------------------------------------------------------
# シート4枚＋サンプルデータ＋ボタンを組み立てる（戻り値：受注一覧シート）
#   ※サンプルデータの会社名・住所・金額はすべて架空（見本・想定値）
# ----------------------------------------------------------------------------
function Build-DemoBook($excel, $wb) {

    $GREEN      = 4353821    # RGB(29,111,66)  #1D6F42
    $GREEN_PALE = 15791598   # RGB(238,245,240) #EEF5F0
    $WHITE      = 16777215

    $today = (Get-Date).Date
    $cm  = $today.AddDays(1 - $today.Day)    # 当月1日
    $pm  = $cm.AddMonths(-1)                 # 前月1日
    $ppm = $cm.AddMonths(-2)                 # 前々月1日

    # --- 受注一覧(2026) ------------------------------------------------------
    $wsO = $wb.Worksheets.Item(1)
    $wsO.Name = '受注一覧(2026)'

    $headers = @('受注日','顧客名','住所','品目','数量','金額（税抜）','発行日','請求書No')
    for ($c = 1; $c -le 8; $c++) { Set-Val $wsO.Cells.Item(1, $c) ($headers[$c - 1]) }
    $hdr = $wsO.Range('A1:H1')
    $hdr.Interior.Color = $GREEN
    $hdr.Font.Color = $WHITE
    $hdr.Font.Bold = $true
    $hdr.HorizontalAlignment = -4108   # xlCenter

    # 架空のサンプルデータ（iss/no 無し＝未発行行。amt 無し＝金額未確定の行）
    $rows = @(
        @{ d=$pm.AddDays(11);  c='株式会社あおば事務機';   a='サンプル県みほん市中央1-2-3'; i='コピー用紙 A4（2,500枚×5箱）'; q=5;  amt=12000; iss=$pm.AddDays(14); no=1020 }
        @{ d=$pm.AddDays(19);  c='ひまわり印刷株式会社';   a='サンプル県みほん市大通2-4-6'; i='名刺印刷（100枚×10名分）';     q=10; amt=35000; iss=$pm.AddDays(24); no=1021 }
        @{ d=$cm;              c='株式会社ことり雑貨';     a='サンプル県かもめ市港町3-1-9'; i='ラベルシール（50面×20袋）';    q=20; amt=19000; iss=$cm;             no=1022 }
        @{ d=$cm;              c='オフィスさくら株式会社'; a='見本県つばき市本町4-5-6';     i='事務用チェア';                 q=4;  amt=74000; iss=$cm;             no=1023 }
        @{ d=$cm.AddDays(1);   c='株式会社やまびこ企画';   a='見本県あさひ市旭町7-8';       i='会議用テーブル（W1800）';      q=2;  amt=92000 }
        @{ d=$cm.AddDays(1);   c='合同会社みなみ書房';     a='サンプル県みほん市南町9-10';  i='ノートPCスタンド';             q=6;  amt=27000 }
        @{ d=$cm.AddDays(1);   c='株式会社あおば事務機';   a='サンプル県みほん市中央1-2-3'; i='デスクマット（大）';           q=3;  amt=16200 }
        @{ d=$cm.AddDays(1);   c='ひまわり印刷株式会社';   a='サンプル県みほん市大通2-4-6'; i='封筒印刷（長3・1,000枚）';     q=1;  amt=28000 }
        @{ d=$cm.AddDays(1);   c='株式会社ことり雑貨';     a='サンプル県かもめ市港町3-1-9'; i='パーテーション（見積中）';     q=1 }
    )

    $r = 2
    $targetRows = @()   # マクロ実行対象（未発行かつ金額あり）の行番号
    foreach ($row in $rows) {
        Set-Val $wsO.Cells.Item($r, 1) ($row.d.ToOADate())
        Set-Val $wsO.Cells.Item($r, 2) ($row.c)
        Set-Val $wsO.Cells.Item($r, 3) ($row.a)
        Set-Val $wsO.Cells.Item($r, 4) ($row.i)
        Set-Val $wsO.Cells.Item($r, 5) ($row.q)
        if ($row.ContainsKey('amt')) { Set-Val $wsO.Cells.Item($r, 6) ($row.amt) }
        if ($row.ContainsKey('iss')) {
            Set-Val $wsO.Cells.Item($r, 7) ($row.iss.ToOADate())
            Set-Val $wsO.Cells.Item($r, 8) ($row.no)
        } elseif ($row.ContainsKey('amt')) {
            $targetRows += $r
        }
        $r++
    }
    $lastRow = $r - 1

    $wsO.Range("A2:A$lastRow").NumberFormat = 'yyyy/mm/dd'
    $wsO.Range("G2:G$lastRow").NumberFormat = 'yyyy/mm/dd'
    $wsO.Range("F2:F$lastRow").NumberFormat = '#,##0'
    $wsO.Range("E2:E$lastRow").HorizontalAlignment = -4108
    $wsO.Range("H2:H$lastRow").HorizontalAlignment = -4108
    $wsO.Range("A1:H$lastRow").Borders.LineStyle = 1

    $widths = @{ A=11; B=24; C=28; D=30; E=6; F=12; G=11; H=10; J=10; K=10; L=10 }
    foreach ($k in $widths.Keys) { $wsO.Columns.Item("$k").ColumnWidth = $widths[$k] }

    # ボタン3個（フォームコントロール）
    $btnDefs = @(
        @{ addr='J2:L3'; text='選択した行の請求書を作成'; macro='CreateInvoiceSelected' }
        @{ addr='J5:L6'; text='今月分をまとめて作成';     macro='CreateInvoicesMonthly' }
        @{ addr='J8:L9'; text='発行済みの行を整理';       macro='ArchiveIssuedRows' }
    )
    foreach ($def in $btnDefs) {
        $rg = $wsO.Range($def.addr)
        $b = $wsO.Buttons().Add([double]$rg.Left, [double]$rg.Top, [double]$rg.Width, [double]$rg.Height)
        $b.Text = $def.text
        $b.OnAction = $def.macro
    }

    # --- 請求書テンプレ --------------------------------------------------------
    $wsT = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wsO)
    $wsT.Name = '請求書テンプレ'
    $tw = @{ A=2; B=18; C=16; D=16; E=8; F=12; G=14; H=2 }
    foreach ($k in $tw.Keys) { $wsT.Columns.Item("$k").ColumnWidth = $tw[$k] }

    $t = $wsT.Range('B2:G2'); $t.Merge()
    Set-Val $t ('請　求　書')
    $t.Font.Size = 20; $t.Font.Bold = $true
    $t.HorizontalAlignment = -4108
    $eb = $t.Borders.Item(9)   # xlEdgeBottom
    $eb.LineStyle = 1; $eb.Weight = 4; $eb.Color = $GREEN

    Set-Val $wsT.Range('F3') ('請求書番号')
    Set-Val $wsT.Range('F4') ('発行日')
    $wsT.Range('F3:F4').Font.Size = 9
    $wsT.Range('G3:G4').HorizontalAlignment = -4152   # xlRight
    $wsT.Range('G4').NumberFormat = 'yyyy/mm/dd'

    $n = $wsT.Range('B5:E5'); $n.Merge()
    $n.Font.Size = 12; $n.Font.Bold = $true
    $n.Borders.Item(9).LineStyle = 1
    $ad = $wsT.Range('B6:E6'); $ad.Merge(); $ad.Font.Size = 9

    Set-Val $wsT.Range('B8') ('ご請求金額（税込）')
    $wsT.Range('B8').Font.Bold = $true
    $g = $wsT.Range('D8:E8'); $g.Merge()
    $g.NumberFormat = '¥#,##0'
    $g.Font.Size = 16; $g.Font.Bold = $true
    $g.Borders.Item(9).LineStyle = -4119   # xlDouble

    $wsT.Range('B10:D10').Merge(); Set-Val $wsT.Range('B10') ('品目')
    Set-Val $wsT.Range('E10') ('数量')
    Set-Val $wsT.Range('F10') ('単価')
    Set-Val $wsT.Range('G10') ('金額')
    $th = $wsT.Range('B10:G10')
    $th.Interior.Color = $GREEN_PALE; $th.Font.Bold = $true; $th.HorizontalAlignment = -4108
    $wsT.Range('B11:D11').Merge()
    $wsT.Range('B12:D12').Merge()
    $wsT.Range('E11:E12').HorizontalAlignment = -4108
    $wsT.Range('F11:G12').NumberFormat = '#,##0'
    $wsT.Range('B10:G12').Borders.LineStyle = 1

    Set-Val $wsT.Range('F13') ('小計')
    Set-Val $wsT.Range('F14') ('消費税（10%）')
    Set-Val $wsT.Range('F15') ('合計金額')
    $wsT.Range('F15:G15').Font.Bold = $true
    $wsT.Range('G13:G15').NumberFormat = '#,##0'
    $wsT.Range('F13:G15').Borders.LineStyle = 1

    $bk = $wsT.Range('B18:G20'); $bk.Merge()
    $bk.WrapText = $true
    $bk.VerticalAlignment = -4160   # xlTop
    $bk.Font.Size = 9
    $bk.BorderAround(1, 2) | Out-Null
    $wsT.Rows.Item('18:20').RowHeight = 22   # 差し込み文言4行が収まる高さ

    $wsT.PageSetup.PrintArea = '$A$1:$H$21'
    $wsT.PageSetup.Orientation = 1
    $wsT.PageSetup.Zoom = $false
    $wsT.PageSetup.FitToPagesWide = 1
    $wsT.PageSetup.FitToPagesTall = 1

    $wsT.Activate()
    $excel.ActiveWindow.DisplayGridlines = $false

    # --- 設定 -----------------------------------------------------------------
    $wsS = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wsT)
    $wsS.Name = '設定'
    $wsS.Columns.Item('A').ColumnWidth = 28
    $wsS.Columns.Item('B').ColumnWidth = 64
    Set-Val $wsS.Range('A1') ('設定')
    $wsS.Range('A1').Font.Bold = $true
    $wsS.Range('A1').Font.Size = 12
    Set-Val $wsS.Range('A2') ('次の請求書番号')
    Set-Val $wsS.Range('B2') (1024)
    Set-Val $wsS.Range('A3') ('PDFの保存先フォルダ')
    Set-Val $wsS.Range('B3') ($pdfBase)
    Set-Val $wsS.Range('A4') ('差し込み文言（自社名・振込先）')
    Set-Val $wsS.Range('B4') ("みどり事務用品株式会社（架空）`n〒000-0000　サンプル県みほん市みどり町1-1-1　TEL 000-0000-0000`nお振込先：みほん銀行 本店 普通 1234567`n※お手数ですが振込手数料はご負担をお願いいたします。")
    $wsS.Range('B4').WrapText = $true
    $wsS.Rows.Item(4).RowHeight = 68
    $wsS.Range('A2:A4').Interior.Color = $GREEN_PALE
    $wsS.Range('A2:B4').Borders.LineStyle = 1

    # --- 処理済み ---------------------------------------------------------------
    $wsD = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wsS)
    $wsD.Name = '処理済み'
    for ($c = 1; $c -le 8; $c++) { Set-Val $wsD.Cells.Item(1, $c) ($headers[$c - 1]) }
    $dh = $wsD.Range('A1:H1')
    $dh.Interior.Color = $GREEN; $dh.Font.Color = $WHITE; $dh.Font.Bold = $true
    $dh.HorizontalAlignment = -4108
    foreach ($k in 'A','B','C','D','E','F','G','H') { $wsD.Columns.Item($k).ColumnWidth = $widths[$k] }
    # 過去分の見本1行
    Set-Val $wsD.Cells.Item(2, 1) ($ppm.AddDays(14).ToOADate())
    Set-Val $wsD.Cells.Item(2, 2) ('ひまわり印刷株式会社')
    Set-Val $wsD.Cells.Item(2, 3) ('サンプル県みほん市大通2-4-6')
    Set-Val $wsD.Cells.Item(2, 4) ('ポスター印刷（B2・10枚）')
    Set-Val $wsD.Cells.Item(2, 5) (10)
    Set-Val $wsD.Cells.Item(2, 6) (30000)
    Set-Val $wsD.Cells.Item(2, 7) ($ppm.AddDays(19).ToOADate())
    Set-Val $wsD.Cells.Item(2, 8) (1019)
    $wsD.Range('A2').NumberFormat = 'yyyy/mm/dd'
    $wsD.Range('G2').NumberFormat = 'yyyy/mm/dd'
    $wsD.Range('F2').NumberFormat = '#,##0'
    $wsD.Range('A1:H2').Borders.LineStyle = 1

    $wsO.Activate()
    $wsO.Range('A1').Select() | Out-Null

    return @{ Orders = $wsO; Template = $wsT; TargetRows = $targetRows; LastRow = $lastRow }
}

# ============================================================================
# メイン処理
# ============================================================================
$excel = $null
$summary = New-Object System.Collections.Generic.List[string]
$summary.Add("invoice-demo ビルド記録  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$summary.Add(('=' * 60))

try {
    Write-Step 'Excel を起動しています…'
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $true
    $excel.DisplayAlerts = $false
    $origSheets = $excel.SheetsInNewWorkbook
    $excel.SheetsInNewWorkbook = 1
    $summary.Add("Excel バージョン: $($excel.Version)")

    # --- VBAプロジェクトへのアクセス（AccessVBOM）を確認：変更はしない ---------
    Write-Step 'VBAプロジェクト オブジェクト モデルへのアクセス設定を確認しています…'
    $secKey = "HKCU:\Software\Microsoft\Office\$($excel.Version)\Excel\Security"
    $accessVBOM = 0
    if (Test-Path $secKey) {
        $prop = Get-ItemProperty -Path $secKey -ErrorAction SilentlyContinue
        if ($null -ne $prop -and $null -ne $prop.PSObject.Properties['AccessVBOM']) {
            $accessVBOM = $prop.AccessVBOM
        }
    }
    $summary.Add("AccessVBOM: $accessVBOM")

    if ($accessVBOM -ne 1) {
        # ------------------------------------------------------------------
        # フォールバック：設定は変更せず、マクロ無しのシェルブックだけ作成
        # ------------------------------------------------------------------
        Write-Host ''
        Write-Host '【報告】「VBAプロジェクト オブジェクト モデルへのアクセスを信頼する」が無効のため、' -ForegroundColor Yellow
        Write-Host '        コードの自動注入は行いません（設定は変更していません）。' -ForegroundColor Yellow
        Write-Host '        シート・データ・ボタンだけ組み立てた invoice-demo-shell.xlsm を作成します。' -ForegroundColor Yellow
        Write-Host '        続きは docs\manual-import.md（.bas 手動インポート手順書）を参照してください。' -ForegroundColor Yellow

        $wb = $excel.Workbooks.Add()
        $built = Build-DemoBook $excel $wb
        $shellPath = Join-Path $distDir 'invoice-demo-shell.xlsm'
        $wb.SaveAs($shellPath, 52)
        $wb.Close($false)
        $summary.Add('結果: AccessVBOM 無効のためシェルブックのみ作成（フォールバック）')
        $summary.Add("出力: $shellPath")
        return
    }

    # --- 1) ブックの組み立て ---------------------------------------------------
    Write-Step 'デモブックを組み立てています（シート4枚＋サンプルデータ＋ボタン3個）…'
    $wb = $excel.Workbooks.Add()
    $built = Build-DemoBook $excel $wb
    $wsO = $built.Orders
    $wsT = $built.Template

    # --- 2) 修正後版（src\after）のコードを注入して保存 -------------------------
    Write-Step 'VBAコード（修正後版 src\after）を注入しています…'
    Add-VbaCode $wb $srcAfter
    $wb.SaveAs($xlsmPath, 52)   # 52 = xlOpenXMLWorkbookMacroEnabled
    Write-Host "    保存: $xlsmPath"
    $summary.Add("xlsm: $xlsmPath")

    # --- 3) 受注一覧（実行前）のスクリーンショット ------------------------------
    Write-Step 'スクリーンショット（受注一覧・実行前）を出力しています…'
    Export-RangePng $wsO "A1:L$($built.LastRow)" (Join-Path $assetsDir 'orders-sheet.png')

    # --- 4) マクロを実行して請求書PDFを生成（実行時間を計測） --------------------
    Write-Step "マクロ CreateInvoiceSelected を実行しています（対象 $($built.TargetRows.Count) 行）…"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    foreach ($r in $built.TargetRows) {
        $wsO.Activate()
        $wsO.Cells.Item($r, 2).Select() | Out-Null
        $excel.Run('CreateInvoiceSelected') | Out-Null
        Write-Host "    行 $r → 請求書No $($wsO.Cells.Item($r, 8).Value2) を発行"
    }
    $sw.Stop()
    $count = $built.TargetRows.Count
    $perInvoice = [math]::Round($sw.Elapsed.TotalSeconds / [math]::Max($count,1), 2)
    Write-Host ("    実行時間: {0:N2} 秒（{1}件 / 1件あたり {2} 秒）" -f $sw.Elapsed.TotalSeconds, $count, $perInvoice)
    $summary.Add(("マクロ実行: {0}件 / 合計 {1:N2} 秒 / 1件あたり {2} 秒" -f $count, $sw.Elapsed.TotalSeconds, $perInvoice))

    $ym = Get-Date -Format 'yyyy-MM'
    $pdfs = @(Get-ChildItem -Path (Join-Path $pdfBase $ym) -Filter '*.pdf' -ErrorAction SilentlyContinue)
    Write-Host "    生成PDF: $($pdfs.Count) 件（$pdfBase\$ym）"
    foreach ($p in $pdfs) { $summary.Add("PDF: $($p.FullName)") }

    # --- 5) 実行後のスクリーンショット ------------------------------------------
    Write-Step 'スクリーンショット（実行後）を出力しています…'
    Export-RangePng $wsO "A1:L$($built.LastRow)" (Join-Path $assetsDir 'orders-sheet-after-run.png')
    Export-RangePng $wsT 'A1:H21' (Join-Path $assetsDir 'invoice-sheet.png')

    # ブックは「実行前」の状態のまま残したいので、保存せずに閉じる
    # （発行日・請求書Noの書き込みとスクリーンショット用の一時グラフは破棄）
    $wb.Close($false)

    # --- 6) 修正前版（src\before）で実行時エラー9が起きることを確認 --------------
    if (-not $SkipBeforeCheck) {
        Write-Step '修正前版コードで「実行時エラー 9」が再現することを確認しています…'
        $wb2 = $excel.Workbooks.Add()
        $ws2 = $wb2.Worksheets.Item(1)
        $ws2.Name = '受注一覧(2026)'   # 変更内容書見本のとおり、シート名は変更後の状態
        Set-Val $ws2.Range('A1') ('受注日')
        Set-Val $ws2.Range('A2') ((Get-Date).Date.ToOADate())
        Set-Val $ws2.Range('B2') ('テスト商店')
        Set-Val $ws2.Range('F2') (1000)
        Add-VbaCode $wb2 $srcBefore

        # 実行時エラーのダイアログで止まらないよう、エラーを捕捉して文字列で
        # 返すチェック用関数を別モジュールとして注入し、それを実行する
        $harness = @(
            'Public Function ZZ_CheckBeforeError() As String'
            '    On Error Resume Next'
            '    CreateInvoiceSelected'
            '    If Err.Number = 0 Then'
            '        ZZ_CheckBeforeError = "（想定外）エラーは発生しませんでした"'
            '    Else'
            '        ZZ_CheckBeforeError = "実行時エラー " & Err.Number & "：" & Err.Description'
            '    End If'
            'End Function'
        ) -join "`r`n"
        $chk = $wb2.VBProject.VBComponents.Add(1)
        $chk.Name = 'ZZ_Check'
        if ($chk.CodeModule.CountOfLines -gt 0) { $chk.CodeModule.DeleteLines(1, $chk.CodeModule.CountOfLines) }
        $chk.CodeModule.AddFromString($harness)

        $ws2.Activate()
        $ws2.Range('B2').Select() | Out-Null
        $beforeMsg = ''
        try {
            $beforeMsg = [string]$excel.Run("'$($wb2.Name)'!ZZ_CheckBeforeError")
        } catch {
            $ex = $_.Exception
            while ($null -ne $ex.InnerException) { $ex = $ex.InnerException }
            $beforeMsg = $ex.Message.Trim()
        }
        $wb2.Close($false)
        Write-Host "    修正前版の実行結果: $beforeMsg"
        $summary.Add("修正前版の実行結果: $beforeMsg")
    }

    $summary.Add('結果: 正常終了')
    Write-Host ''
    Write-Host 'ビルド完了。' -ForegroundColor Green
}
finally {
    if ($null -ne $excel) {
        try { $excel.SheetsInNewWorkbook = $origSheets } catch { }
        # 保存確認ダイアログで居残らないよう、開いているブックを保存せずに全部閉じる
        try {
            $excel.DisplayAlerts = $false
            while ($excel.Workbooks.Count -gt 0) { $excel.Workbooks.Item(1).Close($false) }
        } catch { }
        try { $excel.Quit() } catch { }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
        $excel = $null
        [GC]::Collect(); [GC]::WaitForPendingFinalizers()
        [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    }
    [System.IO.File]::WriteAllLines((Join-Path $distDir 'build-summary.txt'), $summary, [System.Text.UTF8Encoding]::new($true))
}
