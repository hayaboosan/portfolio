Attribute VB_Name = "modReport"
Option Explicit
'=====================================================================
' modReport : 月次レポートシートの生成
'---------------------------------------------------------------------
' modAggregate の集計結果をもとに、A4縦1枚に収まる月次レポートを組み立てる。
'   ・サマリー（当月売上／前月売上／前月比／販売数量）
'   ・支店別売上表（前月比・構成比つき）
'   ・カテゴリ別売上表
'   ・売上上位商品 Top10
'   ・支店別売上の当月・前月比較グラフ
' 印刷設定（A4縦・1ページ収め）もここで行う。
'=====================================================================

' レポートの列構成（A〜F の6列を使う）
Private Const REPORT_LAST_COL As Long = 6

'---------------------------------------------------------------------
' レポート生成のエントリポイント
'---------------------------------------------------------------------
Public Sub BuildReport(ByVal fileCount As Long, ByVal rowCount As Long)
    Dim ws As Worksheet
    Set ws = PrepareSheet(SHEET_REPORT)

    Dim ymT As String, ymP As String
    ymT = TargetMonth()
    ymP = PrevMonth()

    ' --- 列幅（A4縦に収まるよう固定値で指定） ---
    ws.Columns("A").ColumnWidth = 4.5     ' 順位
    ws.Columns("B").ColumnWidth = 24      ' 名称（商品名など）
    ws.Columns("C").ColumnWidth = 14      ' 当月売上／商品コード
    ws.Columns("D").ColumnWidth = 16.5    ' 前月売上／カテゴリ
    ws.Columns("E").ColumnWidth = 10      ' 前月比／数量
    ws.Columns("F").ColumnWidth = 10.5    ' 構成比／売上金額

    Dim rowPos As Long
    rowPos = WriteTitle(ws, ymT, fileCount, rowCount)
    rowPos = WriteSummary(ws, rowPos, ymT, ymP)
    rowPos = WriteBreakdownTable(ws, rowPos, "支店別売上", BranchNamesSorted(), ymT, ymP, True)
    rowPos = WriteBreakdownTable(ws, rowPos, "カテゴリ別売上", CategoryNamesSorted(), ymT, ymP, False)
    rowPos = WriteTopProducts(ws, rowPos, ymT)
    WriteBranchChart ws, rowPos, ymT, ymP

    SetupPrintLayout ws, rowPos + 13      ' グラフの下端までを印刷範囲に

    ' 仕上げ（枠線非表示・先頭セル選択）。自動実行環境で失敗しても続行する
    On Error Resume Next
    ws.Activate
    ActiveWindow.DisplayGridlines = False
    ws.Range("A1").Select
    On Error GoTo 0
End Sub

'---------------------------------------------------------------------
' タイトル帯と注記
'---------------------------------------------------------------------
Private Function WriteTitle(ByVal ws As Worksheet, ByVal ymT As String, _
                            ByVal fileCount As Long, ByVal rowCount As Long) As Long
    With ws.Range(ws.Cells(1, 1), ws.Cells(1, REPORT_LAST_COL))
        .Merge
        .Value = COMPANY_NAME & "　月次売上レポート　" & FormatYm(ymT)
        .Interior.Color = COLOR_TITLE_BG
        .Font.Color = vbWhite
        .Font.Bold = True
        .Font.Size = 15
        .HorizontalAlignment = xlCenter
        .RowHeight = 28
    End With

    With ws.Range(ws.Cells(2, 1), ws.Cells(2, REPORT_LAST_COL))
        .Merge
        .Value = "生成日時: " & Format$(Now, "yyyy/mm/dd hh:nn") & _
                 "　／　取込: " & fileCount & " ファイル・" & Format$(rowCount, "#,##0") & " 行" & _
                 "　※本レポートの社名・数値はすべて架空の見本値です"
        .Font.Size = 8
        .Font.Color = COLOR_NOTE
        .HorizontalAlignment = xlCenter
    End With

    WriteTitle = 4   ' 次の書き込み開始行
End Function

'---------------------------------------------------------------------
' サマリー帯（KPI 4項目を横並びで表示）
'---------------------------------------------------------------------
Private Function WriteSummary(ByVal ws As Worksheet, ByVal rowPos As Long, _
                              ByVal ymT As String, ByVal ymP As String) As Long
    Dim totalT As Double, totalP As Double, qtyT As Double
    totalT = MonthTotal(ymT)
    totalP = MonthTotal(ymP)
    qtyT = MonthQty(ymT)

    ' ラベル行・値行のペアを 2列ずつ×3項目 ＋ 前月比で構成
    Dim labels As Variant, values As Variant
    labels = Array("当月売上合計", "前月売上合計", "前月比", "販売数量合計")
    values = Array(Format$(totalT, "#,##0") & " 円", _
                   IIf(totalP = 0, "―", Format$(totalP, "#,##0") & " 円"), _
                   RatioText(totalT, totalP), _
                   Format$(qtyT, "#,##0") & " 点")

    ' 4項目を A:F の6列に割り付ける: (A-B)(C)(D)(E-F) の変則割り
    Dim blocks As Variant
    blocks = Array(Array(1, 2), Array(3, 3), Array(4, 4), Array(5, 6))

    Dim i As Long
    For i = 0 To 3
        Dim c1 As Long, c2 As Long
        c1 = blocks(i)(0): c2 = blocks(i)(1)
        With ws.Range(ws.Cells(rowPos, c1), ws.Cells(rowPos, c2))
            .Merge
            .Value = labels(i)
            .Interior.Color = COLOR_HEADER_BG
            .Font.Color = vbWhite
            .Font.Bold = True
            .Font.Size = 9
            .HorizontalAlignment = xlCenter
        End With
        With ws.Range(ws.Cells(rowPos + 1, c1), ws.Cells(rowPos + 1, c2))
            .Merge
            .NumberFormat = "@"     ' 「+7.6%」等が数値に自動変換され符号が消えるのを防ぐ
            .Value = values(i)
            .Interior.Color = COLOR_BAND_BG
            .Font.Bold = True
            .Font.Size = 12
            .HorizontalAlignment = xlCenter
            .RowHeight = 22
            ' 前月比はプラス緑・マイナス赤で強調
            If i = 2 And totalP > 0 Then
                .Font.Color = IIf(totalT >= totalP, COLOR_POSITIVE, COLOR_NEGATIVE)
            End If
        End With
    Next i
    DrawTableBorders ws.Range(ws.Cells(rowPos, 1), ws.Cells(rowPos + 1, REPORT_LAST_COL))

    WriteSummary = rowPos + 3
End Function

'---------------------------------------------------------------------
' 内訳表（支店別／カテゴリ別で共通）
'   names        : 表示する名称一覧（当月売上の降順で受け取る）
'   isBranch     : True=支店集計 / False=カテゴリ集計
'---------------------------------------------------------------------
Private Function WriteBreakdownTable(ByVal ws As Worksheet, ByVal rowPos As Long, _
                                     ByVal caption As String, ByVal names As Variant, _
                                     ByVal ymT As String, ByVal ymP As String, _
                                     ByVal isBranch As Boolean) As Long
    ' 見出し
    ws.Cells(rowPos, 1).Value = "■ " & caption
    ws.Cells(rowPos, 1).Font.Bold = True
    ws.Cells(rowPos, 1).Font.Size = 11
    rowPos = rowPos + 1

    ' 表ヘッダ（名称列はA:Bの2列分を使う）
    ws.Cells(rowPos, 1).Resize(1, 2).Merge
    ws.Cells(rowPos, 1).Value = IIf(isBranch, "支店", "カテゴリ")
    ws.Cells(rowPos, 3).Value = "当月売上"
    ws.Cells(rowPos, 4).Value = "前月売上"
    ws.Cells(rowPos, 5).Value = "前月比"
    ws.Cells(rowPos, 6).Value = "構成比"
    FormatHeaderRow ws.Range(ws.Cells(rowPos, 1), ws.Cells(rowPos, REPORT_LAST_COL))
    Dim headerRow As Long
    headerRow = rowPos
    rowPos = rowPos + 1

    ' 明細行
    Dim grandT As Double
    grandT = MonthTotal(ymT)
    Dim i As Long
    For i = LBound(names) To UBound(names)
        Dim amtT As Double, amtP As Double
        If isBranch Then
            amtT = BranchTotal(CStr(names(i)), ymT)
            amtP = BranchTotal(CStr(names(i)), ymP)
        Else
            amtT = CategoryTotal(CStr(names(i)), ymT)
            amtP = CategoryTotal(CStr(names(i)), ymP)
        End If

        ws.Cells(rowPos, 1).Resize(1, 2).Merge
        ws.Cells(rowPos, 1).Value = names(i)
        ws.Cells(rowPos, 3).Value = amtT
        ws.Cells(rowPos, 4).Value = IIf(amtP = 0, "―", amtP)
        ' 前月比は数値のまま書き、符号つき書式（+0.0%;-0.0%）は列単位で後掛けする
        If amtP > 0 Then
            ws.Cells(rowPos, 5).Value = amtT / amtP - 1
            ws.Cells(rowPos, 5).Font.Color = IIf(amtT >= amtP, COLOR_POSITIVE, COLOR_NEGATIVE)
        Else
            ws.Cells(rowPos, 5).Value = "―"
        End If
        If grandT > 0 Then ws.Cells(rowPos, 6).Value = amtT / grandT
        rowPos = rowPos + 1
    Next i

    ' 合計行
    ws.Cells(rowPos, 1).Resize(1, 2).Merge
    ws.Cells(rowPos, 1).Value = "合計"
    ws.Cells(rowPos, 3).Value = MonthTotal(ymT)
    ws.Cells(rowPos, 4).Value = IIf(MonthTotal(ymP) = 0, "―", MonthTotal(ymP))
    If MonthTotal(ymP) > 0 Then
        ws.Cells(rowPos, 5).Value = MonthTotal(ymT) / MonthTotal(ymP) - 1
    Else
        ws.Cells(rowPos, 5).Value = "―"
    End If
    ws.Cells(rowPos, 6).Value = 1
    With ws.Range(ws.Cells(rowPos, 1), ws.Cells(rowPos, REPORT_LAST_COL))
        .Font.Bold = True
        .Interior.Color = COLOR_TOTAL_BG
    End With

    ' 書式（数値・パーセント・罫線）
    With ws.Range(ws.Cells(headerRow + 1, 3), ws.Cells(rowPos, 4))
        .NumberFormat = "#,##0"
    End With
    ws.Range(ws.Cells(headerRow + 1, 5), ws.Cells(rowPos, 5)).NumberFormat = "+0.0%;-0.0%;0.0%"
    ws.Range(ws.Cells(headerRow + 1, 6), ws.Cells(rowPos, 6)).NumberFormat = "0.0%"
    ws.Range(ws.Cells(headerRow + 1, 5), ws.Cells(rowPos, 5)).HorizontalAlignment = xlRight
    DrawTableBorders ws.Range(ws.Cells(headerRow, 1), ws.Cells(rowPos, REPORT_LAST_COL))

    WriteBreakdownTable = rowPos + 2
End Function

'---------------------------------------------------------------------
' 売上上位商品 Top10
'---------------------------------------------------------------------
Private Function WriteTopProducts(ByVal ws As Worksheet, ByVal rowPos As Long, _
                                  ByVal ymT As String) As Long
    ws.Cells(rowPos, 1).Value = "■ 売上上位商品 Top" & TOP_PRODUCT_COUNT
    ws.Cells(rowPos, 1).Font.Bold = True
    ws.Cells(rowPos, 1).Font.Size = 11
    rowPos = rowPos + 1

    Dim headers As Variant
    headers = Array("順位", "商品名", "商品コード", "カテゴリ", "数量", "売上金額")
    ws.Cells(rowPos, 1).Resize(1, REPORT_LAST_COL).Value = headers
    FormatHeaderRow ws.Cells(rowPos, 1).Resize(1, REPORT_LAST_COL)
    Dim headerRow As Long
    headerRow = rowPos
    rowPos = rowPos + 1

    Dim tops As Variant
    tops = TopProducts(TOP_PRODUCT_COUNT)

    Dim i As Long
    For i = 1 To UBound(tops, 1)
        ws.Cells(rowPos, 1).Value = i                   ' 順位
        ws.Cells(rowPos, 2).Value = tops(i, 2)          ' 商品名
        ws.Cells(rowPos, 3).Value = tops(i, 1)          ' 商品コード
        ws.Cells(rowPos, 4).Value = tops(i, 3)          ' カテゴリ
        ws.Cells(rowPos, 5).Value = tops(i, 4)          ' 数量
        ws.Cells(rowPos, 6).Value = tops(i, 5)          ' 金額
        rowPos = rowPos + 1
    Next i

    With ws.Range(ws.Cells(headerRow + 1, 5), ws.Cells(rowPos - 1, 6))
        .NumberFormat = "#,##0"
    End With
    ws.Range(ws.Cells(headerRow + 1, 1), ws.Cells(rowPos - 1, 1)).HorizontalAlignment = xlCenter
    DrawTableBorders ws.Range(ws.Cells(headerRow, 1), ws.Cells(rowPos - 1, REPORT_LAST_COL))

    WriteTopProducts = rowPos + 1
End Function

'---------------------------------------------------------------------
' 支店別売上の当月・前月比較グラフ
'---------------------------------------------------------------------
Private Sub WriteBranchChart(ByVal ws As Worksheet, ByVal rowPos As Long, _
                             ByVal ymT As String, ByVal ymP As String)
    ' グラフ用の元データを非表示領域（H列以降）に書き出す
    Dim names As Variant
    names = BranchNamesSorted()

    Dim srcRow As Long, i As Long
    Const SRC_COL As Long = 8   ' H列
    ws.Cells(1, SRC_COL).Value = "支店"
    ws.Cells(1, SRC_COL + 1).Value = FormatYm(ymT)
    ws.Cells(1, SRC_COL + 2).Value = FormatYm(ymP) & "（前月）"
    srcRow = 2
    For i = LBound(names) To UBound(names)
        ws.Cells(srcRow, SRC_COL).Value = names(i)
        ws.Cells(srcRow, SRC_COL + 1).Value = BranchTotal(CStr(names(i)), ymT)
        ws.Cells(srcRow, SRC_COL + 2).Value = BranchTotal(CStr(names(i)), ymP)
        srcRow = srcRow + 1
    Next i
    ' 元データ列は印刷範囲外（A:F の外）なので隠さなくても印刷には出ない

    Dim co As ChartObject
    Set co = ws.ChartObjects.Add( _
        Left:=ws.Cells(rowPos, 1).Left, _
        Top:=ws.Cells(rowPos, 1).Top, _
        Width:=ws.Range(ws.Cells(rowPos, 1), ws.Cells(rowPos, REPORT_LAST_COL)).Width, _
        Height:=220)
    co.Name = CHART_NAME_BRANCH

    With co.Chart
        .SetSourceData Source:=ws.Range(ws.Cells(1, SRC_COL), ws.Cells(srcRow - 1, SRC_COL + 2))
        .ChartType = xlColumnClustered
        .HasTitle = True
        .ChartTitle.Text = "支店別売上　当月・前月比較（見本値）"
        .ChartTitle.Font.Size = 11
        .Axes(xlValue).TickLabels.NumberFormat = "#,##0,""千"""
        .Legend.Position = xlLegendPositionBottom
    End With
End Sub

'---------------------------------------------------------------------
' A4縦1ページに収める印刷設定
' （プリンタ未接続環境で PageSetup が失敗しても処理は止めない）
'---------------------------------------------------------------------
Private Sub SetupPrintLayout(ByVal ws As Worksheet, ByVal lastRow As Long)
    On Error Resume Next
    With ws.PageSetup
        .PaperSize = xlPaperA4
        .Orientation = xlPortrait
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .LeftMargin = Application.CentimetersToPoints(1.2)
        .RightMargin = Application.CentimetersToPoints(1.2)
        .TopMargin = Application.CentimetersToPoints(1.2)
        .BottomMargin = Application.CentimetersToPoints(1.2)
        .CenterHorizontally = True
        .PrintArea = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, REPORT_LAST_COL)).Address
    End With
    On Error GoTo 0
End Sub

'---------------------------------------------------------------------
' "YYYYMM" -> "YYYY年M月度" の表示変換
'---------------------------------------------------------------------
Private Function FormatYm(ByVal ym As String) As String
    FormatYm = CLng(Left$(ym, 4)) & "年" & CLng(Right$(ym, 2)) & "月度"
End Function

'---------------------------------------------------------------------
' 前月比の表示文字列（前月データが無ければ "―"）
'---------------------------------------------------------------------
Private Function RatioText(ByVal current As Double, ByVal prev As Double) As String
    If prev = 0 Then
        RatioText = "―"
    Else
        RatioText = Format$(current / prev - 1, "+0.0%;-0.0%;±0.0%")
    End If
End Function
