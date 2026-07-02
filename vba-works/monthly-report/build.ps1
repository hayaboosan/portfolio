# =====================================================================
# build.ps1 : monthly-report-demo.xlsm 組み立てスクリプト
# ---------------------------------------------------------------------
# Excel COM オートメーションで以下を行う。
#   フェーズ1: ブック組み立て＋デモ実行
#     1. VBE アクセス（AccessVBOM）が許可されているか確認
#        ※未許可の場合、レジストリは変更せず手動手順（docs\manual-import.md）を案内して終了
#     2. src\*.bas を cp932 に変換して VBAProject へインポート
#     3. 操作パネルシート＋実行ボタンを作成し .xlsm として保存
#     4. -SkipDemo 指定がなければマクロを実行してレポート生成＋実行時間計測
#   フェーズ2: ポートフォリオ用PNG（assets\）の書き出し
#     ※マクロを実行した同一セッション内で CopyPicture → Paste すると
#       OLE の遅延レンダリングが処理されず白紙PNGになるため（本環境で実測）、
#       別の Excel セッション（読み取り専用・マクロ無効）で行う。
#
# 使い方:  pwsh -File build.ps1          … ビルド＋デモ実行＋PNG出力
#          pwsh -File build.ps1 -SkipDemo … ビルドのみ
# =====================================================================
param(
    [switch]$SkipDemo
)

$ErrorActionPreference = 'Stop'

# --- パス定義 --------------------------------------------------------
$root      = $PSScriptRoot
$srcDir    = Join-Path $root 'src'
$assetsDir = Join-Path $root 'assets'
$xlsmPath  = Join-Path $root 'monthly-report-demo.xlsm'
$tempDir   = Join-Path $env:TEMP ("kotori-bas-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))

# --- 1. AccessVBOM の事前チェック（レジストリは読み取りのみ・変更しない） ---
$vbomEnabled = $false
foreach ($ver in '16.0', '15.0') {
    $key = "HKCU:\Software\Microsoft\Office\$ver\Excel\Security"
    $val = (Get-ItemProperty -Path $key -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
    if ($val -eq 1) { $vbomEnabled = $true; break }
}
if (-not $vbomEnabled) {
    Write-Host '[NG] VBE へのプログラムアクセス（AccessVBOM）が許可されていません。' -ForegroundColor Yellow
    Write-Host '     セキュリティ設定のため、このスクリプトからレジストリは変更しません。'
    Write-Host '     docs\manual-import.md の手順で .bas を手動インポートしてください。'
    exit 1
}
Write-Host '[OK] AccessVBOM 有効を確認'

# --- 2. .bas を cp932 に変換（VBE のインポートは ANSI 前提のため） ---
$cp932 = [System.Text.Encoding]::GetEncoding(932)
New-Item -ItemType Directory -Path $tempDir | Out-Null
$basFiles = Get-ChildItem -Path $srcDir -Filter '*.bas' | Sort-Object Name
if ($basFiles.Count -eq 0) { throw "src に .bas が見つかりません: $srcDir" }
foreach ($f in $basFiles) {
    $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText((Join-Path $tempDir $f.Name), $text, $cp932)
}
Write-Host "[OK] $($basFiles.Count) 個の .bas を cp932 へ変換"

# =====================================================================
# フェーズ1: ブック組み立て＋デモ実行
# =====================================================================
$excel = $null
$wb = $null
$elapsed = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $true
    $excel.DisplayAlerts = $false

    $wb = $excel.Workbooks.Add(-4167)  # xlWBATWorksheet: 1シートのみのブック

    # --- VBProject へ実際にアクセスできるか最終確認（グループポリシー等の保険） ---
    try {
        $null = $wb.VBProject.VBComponents.Count
    } catch {
        Write-Host '[NG] レジストリ上は有効ですが VBProject にアクセスできませんでした。' -ForegroundColor Yellow
        Write-Host '     docs\manual-import.md の手順で手動インポートしてください。'
        $wb.Close($false); $excel.Quit()
        exit 1
    }

    # --- モジュールのインポート ---
    foreach ($f in $basFiles) {
        $null = $wb.VBProject.VBComponents.Import((Join-Path $tempDir $f.Name))
        Write-Host "  import: $($f.Name)"
    }

    # --- 操作パネルシートの作成 ---
    $ws = $wb.Worksheets.Item(1)
    $ws.Name = '操作パネル'

    $title = $ws.Range('A1:F1')
    [void]$title.Merge()
    $title.Value2 = 'コトリ商事　月次売上レポート自動集計ツール'
    $title.Interior.Color = 6898214      # RGB(38,66,105) 紺
    $title.Font.Color = 16777215         # 白
    $title.Font.Bold = $true
    $title.Font.Size = 14
    $title.HorizontalAlignment = -4108   # xlCenter
    $title.RowHeight = 28

    $note = $ws.Range('A2:F2')
    [void]$note.Merge()
    $note.Value2 = '※架空の雑貨卸を題材にしたポートフォリオ用デモです。社名・数値はすべて見本値です。'
    $note.Font.Size = 9
    $note.Font.Color = 8421504           # グレー

    $ws.Range('A4').Value2 = '使い方'
    $ws.Range('A4').Font.Bold = $true
    $ws.Range('A5').Value2 = '  1. sample-data\csv フォルダに日次売上CSV（sales_YYYYMMDD.csv）を置く'
    $ws.Range('A6').Value2 = '  2. 下の［月次レポート生成］ボタンをクリックする'
    $ws.Range('A7').Value2 = '  ※ 取込 → 月次集計 → A4印刷用レポート生成まで自動で行われます'
    $ws.Range('A7').Font.Color = 8421504
    $ws.Range('A1').ColumnWidth = 3

    # --- 実行ボタン（角丸四角形にマクロを割り当て） ---
    $anchor = $ws.Range('B10')
    $btn = $ws.Shapes.AddShape(5, $anchor.Left, $anchor.Top, 180, 40)  # 5 = 角丸四角形
    $btn.Name = 'btnGenerate'
    $btn.Fill.ForeColor.RGB = 12874308   # RGB(68,114,196) 青
    $btn.Line.Visible = 0
    $tr = $btn.TextFrame2.TextRange
    $tr.Text = '月次レポート生成'
    $tr.Font.Size = 13
    $tr.Font.Bold = -1
    $tr.Font.Fill.ForeColor.RGB = 16777215
    $tr.ParagraphFormat.Alignment = 2            # 中央揃え
    $btn.TextFrame2.VerticalAnchor = 3           # 上下中央
    $btn.OnAction = 'GenerateMonthlyReport'

    # --- .xlsm として保存 ---
    if (Test-Path $xlsmPath) { Remove-Item $xlsmPath -Force }
    $wb.SaveAs($xlsmPath, 52)            # 52 = xlOpenXMLWorkbookMacroEnabled
    Write-Host "[OK] 保存: $xlsmPath"

    # --- デモ実行（マクロ実行＋実行時間計測） ---
    if (-not $SkipDemo) {
        Write-Host '--- デモ実行: RunReport ---'
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $elapsed = $excel.Run('RunReport')
        $sw.Stop()
        if ($elapsed -lt 0) {
            $lastErr = $excel.Run('LastError')
            throw "マクロがエラーで中断しました: $lastErr"
        }
        Write-Host ("[OK] レポート生成 完了  マクロ内計測: {0:N2} 秒 / 外側計測: {1:N2} 秒" -f $elapsed, $sw.Elapsed.TotalSeconds)
        $wb.Save()
    }
}
finally {
    # --- 後片付け（Excel プロセスを残さない） ---
    if ($wb) { $wb.Close($false) }
    if ($excel) { $excel.Quit() }
    foreach ($obj in $wb, $excel) {
        if ($obj) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) }
    }
    $wb = $null; $excel = $null
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
}

# =====================================================================
# フェーズ2: ポートフォリオ用PNGの書き出し（別セッション・マクロ無効）
# =====================================================================
if (-not $SkipDemo) {
    Write-Host '--- アセット出力 (Range.CopyPicture + Chart.Export) ---'
    $excel2 = $null
    $wb2 = $null
    try {
        $excel2 = New-Object -ComObject Excel.Application
        $excel2.Visible = $true
        $excel2.DisplayAlerts = $false
        $excel2.AutomationSecurity = 3          # マクロ無効で開く（画像化だけ行う）
        $wb2 = $excel2.Workbooks.Open($xlsmPath, 0, $true)   # 読み取り専用

        function Export-RangePng([object]$sheet, [string]$addr, [string]$outPath) {
            [void]$sheet.Activate()
            $rng = $sheet.Range($addr)
            [void]$rng.CopyPicture(1, -4147)    # xlScreen, xlPicture（先にコピー）
            $co = $sheet.ChartObjects().Add(0, 0, $rng.Width, $rng.Height)
            [void]$co.Activate()
            $co.Chart.Paste()
            Start-Sleep -Milliseconds 800       # 貼り付け描画の完了待ち
            $co.Border.LineStyle = -4142        # 一時グラフの枠線を消してから書き出す
            [void]$co.Chart.Export($outPath, 'PNG')
            $co.Delete()
        }

        # 公開用スクリーンショットでは個人フォルダのフルパスを短縮表示にする
        # （ブックは読み取り専用で開いており、この変更は保存されない）
        $wsLog = $wb2.Worksheets.Item('取込ログ')
        $wsLog.Range('A2').Value2 = '取込フォルダ: ...\monthly-report\sample-data\csv'
        Export-RangePng $wsLog 'A1:C31' (Join-Path $assetsDir '01_csv-import-log.png')
        Export-RangePng $wb2.Worksheets.Item('生データ') 'A1:H26' (Join-Path $assetsDir '02_raw-data.png')

        $wsRep = $wb2.Worksheets.Item('月次レポート')
        $printArea = $wsRep.PageSetup.PrintArea
        if (-not $printArea) { $printArea = 'A1:F58' }
        Export-RangePng $wsRep $printArea (Join-Path $assetsDir '03_monthly-report.png')

        [void]$wsRep.Activate()
        [void]$wsRep.ChartObjects('chartBranch').Chart.Export((Join-Path $assetsDir '04_branch-chart.png'), 'PNG')

        Get-ChildItem $assetsDir -Filter '*.png' | ForEach-Object {
            Write-Host ("  {0}  ({1:N0} KB)" -f $_.Name, ($_.Length / 1KB))
        }
    }
    finally {
        if ($wb2) { $wb2.Close($false) }        # 読み取り専用なので変更は保存しない
        if ($excel2) { $excel2.Quit() }
        foreach ($obj in $wb2, $excel2) {
            if ($obj) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) }
        }
        [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    }
}

Write-Host ''
Write-Host '=== ビルド完了 ==='
Write-Host "  ブック : $xlsmPath"
Write-Host "  アセット: $assetsDir"
