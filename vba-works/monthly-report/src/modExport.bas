Attribute VB_Name = "modExport"
Option Explicit
'=====================================================================
' modExport : シート／グラフのPNG書き出し（ポートフォリオ掲載用）
'---------------------------------------------------------------------
' Range.CopyPicture でセル範囲を画像化し、同サイズの一時グラフに
' 貼り付けて Chart.Export でPNG保存する定番パターン。
' 埋め込みグラフは Chart.Export で直接書き出す。
'
' 【既知の制約】環境によっては、マクロ実行中の Paste は OLE の
' 遅延レンダリングが処理されず白紙PNGになることがある（DoEvents や
' Sleep では回避できないケースを確認済み）。その場合は、COM呼び出しの
' 合間に Excel がアイドルになる外部オートメーションから同じ手順を
' 実行すると確実（本リポジトリでは build.ps1 がその方式で assets\ を
' 生成している）。
'=====================================================================

' Win32 Sleep（貼り付け後の描画完了待ちに使用）
#If VBA7 Then
    Private Declare PtrSafe Sub SleepApi Lib "kernel32" Alias "Sleep" (ByVal milliseconds As Long)
#Else
    Private Declare Sub SleepApi Lib "kernel32" Alias "Sleep" (ByVal milliseconds As Long)
#End If

'---------------------------------------------------------------------
' セル範囲をPNGとして保存する
'---------------------------------------------------------------------
Public Sub ExportRangeAsPng(ByVal ws As Worksheet, ByVal rangeAddress As String, _
                            ByVal outPath As String)
    Dim rng As Range
    Set rng = ws.Range(rangeAddress)

    ws.Activate                      ' CopyPicture は対象シートを表示した状態で行う

    ' 範囲と同じサイズの一時グラフを先に作っておく
    Dim co As ChartObject
    Set co = ws.ChartObjects.Add(Left:=0, Top:=0, Width:=rng.Width, Height:=rng.Height)
    co.Chart.Parent.Border.LineStyle = xlLineStyleNone

    ' コピー → グラフをアクティブにして貼り付け
    ' ・Format は xlPicture（メタファイル）を使う。xlBitmap は画面に
    '   表示されていない範囲で実行時エラー1004になるため使わない
    ' ・非アクティブのまま Paste すると空のPNGになる環境があるため
    '   co.Activate してから貼り付ける
    Dim attempt As Long
    On Error Resume Next
    For attempt = 1 To 3
        Err.Clear
        rng.CopyPicture Appearance:=xlScreen, Format:=xlPicture
        If Err.Number = 0 Then Exit For
        DoEvents                     ' クリップボード競合などの一時的な失敗に備える
    Next attempt
    On Error GoTo 0
    co.Activate
    co.Chart.Paste

    ' 貼り付けの完了を待つ
    Dim retry As Long
    Do While co.Chart.Pictures.Count = 0 And retry < 50
        DoEvents
        SleepApi 100
        retry = retry + 1
    Loop
    ' 描画が終わる前に Export すると白紙PNGになるため、ひと呼吸置く
    DoEvents
    SleepApi 500
    DoEvents
    co.Chart.Export Filename:=outPath, FilterName:="PNG"

    co.Delete                        ' 一時グラフは必ず削除
    Application.CutCopyMode = False
    ws.Range("A1").Select            ' グラフ選択状態を解除しておく
End Sub

'---------------------------------------------------------------------
' 埋め込みグラフをPNGとして保存する
'---------------------------------------------------------------------
Public Sub ExportChartAsPng(ByVal ws As Worksheet, ByVal chartName As String, _
                            ByVal outPath As String)
    ws.Activate
    ws.ChartObjects(chartName).Chart.Export Filename:=outPath, FilterName:="PNG"
End Sub

'---------------------------------------------------------------------
' ポートフォリオ用アセット一式を書き出す
'   outFolder: 出力先フォルダ（末尾の \ は不要）
'   ※レポート生成済みの状態で呼ぶこと
'---------------------------------------------------------------------
Public Sub ExportDemoAssets(ByVal outFolder As String)
    If Len(Dir(outFolder, vbDirectory)) = 0 Then MkDir outFolder

    ' 1) 取込ログ（CSVファイル一覧に相当）… 先頭25ファイル分
    ExportRangeAsPng ThisWorkbook.Worksheets(SHEET_LOG), "A1:C31", _
                     outFolder & "\01_csv-import-log.png"

    ' 2) 生データシートの先頭部分
    ExportRangeAsPng ThisWorkbook.Worksheets(SHEET_RAW), "A1:H26", _
                     outFolder & "\02_raw-data.png"

    ' 3) 月次レポート全体（印刷範囲）
    Dim wsReport As Worksheet
    Set wsReport = ThisWorkbook.Worksheets(SHEET_REPORT)
    Dim printArea As String
    printArea = wsReport.PageSetup.printArea
    If Len(printArea) = 0 Then printArea = "A1:F60"
    ExportRangeAsPng wsReport, printArea, outFolder & "\03_monthly-report.png"

    ' 4) 支店別グラフ単体
    ExportChartAsPng wsReport, CHART_NAME_BRANCH, outFolder & "\04_branch-chart.png"
End Sub
