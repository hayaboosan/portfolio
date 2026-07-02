Attribute VB_Name = "modImport"
Option Explicit
'=====================================================================
' modImport : 日次売上CSVの一括取込
'---------------------------------------------------------------------
' 指定フォルダ内の sales_*.csv を全件読み込み、
'   1) 2次元配列として呼び出し元へ返す（集計用）
'   2) 「生データ」シートへ一括書き出し（確認用）
'   3) 「取込ログ」シートへファイルごとの取込結果を記録
' セルへの書き込みは配列を組み立ててから一括で行う（1セルずつ書かない）。
'=====================================================================

'---------------------------------------------------------------------
' CSVフォルダ内の全ファイルを取り込む
'   戻り値      : 取込データの2次元配列 (1 To N, 1 To CSV_COL_COUNT)
'   fileCount   : 取り込んだファイル数（参照渡しで返す）
'   rowCount    : 取り込んだデータ行数（参照渡しで返す）
'---------------------------------------------------------------------
Public Function ImportAllCsv(ByRef fileCount As Long, ByRef rowCount As Long) As Variant
    Dim folderPath As String
    folderPath = ResolveCsvFolder()
    If Len(folderPath) = 0 Then
        Err.Raise vbObjectError + 513, , _
            "CSVフォルダが見つかりませんでした。処理を中止します。"
    End If

    ' --- ファイル名を列挙してソート（取込順を安定させる） ---
    Dim files() As String
    files = ListCsvFiles(folderPath, fileCount)
    If fileCount = 0 Then
        Err.Raise vbObjectError + 514, , _
            "取込対象のCSV（" & CSV_FILE_PATTERN & "）が見つかりませんでした。" & vbCrLf & _
            "フォルダ: " & folderPath
    End If

    ' --- 取込バッファ（全ファイル分をまとめて保持） ---
    Dim dataBuf() As Variant
    ReDim dataBuf(1 To MAX_RAW_ROWS, 1 To CSV_COL_COUNT)

    ' --- 取込ログ用バッファ（ファイル名 / 行数 / スキップ行数） ---
    Dim logBuf() As Variant
    ReDim logBuf(1 To fileCount, 1 To 3)

    Dim i As Long
    rowCount = 0
    For i = LBound(files) To UBound(files)
        Application.StatusBar = "CSV取込中... (" & i + 1 & "/" & fileCount & ") " & files(i)
        Dim skipped As Long, readRows As Long
        readRows = ReadOneCsv(folderPath & "\" & files(i), dataBuf, rowCount, skipped)
        logBuf(i + 1, 1) = files(i)
        logBuf(i + 1, 2) = readRows
        logBuf(i + 1, 3) = skipped
    Next i

    ' --- バッファを実サイズに詰め替え ---
    Dim result() As Variant
    ReDim result(1 To rowCount, 1 To CSV_COL_COUNT)
    Dim r As Long, c As Long
    For r = 1 To rowCount
        For c = 1 To CSV_COL_COUNT
            result(r, c) = dataBuf(r, c)
        Next c
    Next r

    ' --- シートへ書き出し ---
    WriteRawSheet result, rowCount
    WriteLogSheet logBuf, fileCount, rowCount, folderPath

    Application.StatusBar = False
    ImportAllCsv = result
End Function

'---------------------------------------------------------------------
' CSVフォルダのパスを決定する
'   既定: ブックと同じ階層の CSV_FOLDER_RELATIVE
'   見つからない場合はフォルダ選択ダイアログにフォールバック
'---------------------------------------------------------------------
Private Function ResolveCsvFolder() As String
    Dim defaultPath As String
    defaultPath = ThisWorkbook.Path & "\" & CSV_FOLDER_RELATIVE

    If Len(Dir(defaultPath, vbDirectory)) > 0 Then
        ResolveCsvFolder = defaultPath
        Exit Function
    End If

    ' 既定フォルダが無い場合はユーザーに選ばせる
    With Application.FileDialog(msoFileDialogFolderPicker)
        .Title = "日次売上CSVが入ったフォルダを選択してください"
        If .Show = -1 Then ResolveCsvFolder = .SelectedItems(1)
    End With
End Function

'---------------------------------------------------------------------
' フォルダ内の対象CSVファイル名一覧を昇順で返す
'   count: 見つかったファイル数（参照渡しで返す。0件チェックは呼び出し元）
'---------------------------------------------------------------------
Private Function ListCsvFiles(ByVal folderPath As String, ByRef count As Long) As String()
    Dim names() As String
    ReDim names(0 To 511)
    Dim f As String
    count = 0
    f = Dir(folderPath & "\" & CSV_FILE_PATTERN)
    Do While Len(f) > 0
        names(count) = f
        count = count + 1
        f = Dir()
    Loop
    If count > 0 Then
        ReDim Preserve names(0 To count - 1)
        SortStrings names       ' ファイル名＝日付順になる命名なので単純ソートでOK
    End If
    ListCsvFiles = names
End Function

'---------------------------------------------------------------------
' 文字列配列の単純挿入ソート（昇順）
'---------------------------------------------------------------------
Private Sub SortStrings(ByRef arr() As String)
    Dim i As Long, j As Long, tmp As String
    For i = LBound(arr) + 1 To UBound(arr)
        tmp = arr(i)
        j = i - 1
        Do While j >= LBound(arr)
            If StrComp(arr(j), tmp, vbTextCompare) <= 0 Then Exit Do
            arr(j + 1) = arr(j)
            j = j - 1
        Loop
        arr(j + 1) = tmp
    Next i
End Sub

'---------------------------------------------------------------------
' CSVを1ファイル読み込み、バッファへ追記する
'   戻り値  : このファイルから取り込んだ行数
'   skipped : 列数不一致などでスキップした行数
'---------------------------------------------------------------------
Private Function ReadOneCsv(ByVal filePath As String, _
                            ByRef dataBuf() As Variant, _
                            ByRef rowCount As Long, _
                            ByRef skipped As Long) As Long
    Dim fno As Integer
    fno = FreeFile
    skipped = 0

    Dim startRow As Long
    startRow = rowCount

    Open filePath For Input As #fno
    Dim lineText As String
    Dim isHeader As Boolean
    isHeader = True
    Do While Not EOF(fno)
        Line Input #fno, lineText
        If isHeader Then
            isHeader = False            ' 1行目はヘッダなので読み飛ばす
        ElseIf Len(Trim$(lineText)) > 0 Then
            Dim parts() As String
            parts = Split(lineText, ",")
            If UBound(parts) = CSV_COL_COUNT - 1 Then
                If rowCount >= MAX_RAW_ROWS Then
                    Close #fno
                    Err.Raise vbObjectError + 515, , _
                        "取込行数が上限（" & Format$(MAX_RAW_ROWS, "#,##0") & "行）を超えました。"
                End If
                rowCount = rowCount + 1
                dataBuf(rowCount, 1) = CDate(parts(0))          ' 日付
                dataBuf(rowCount, 2) = parts(1)                 ' 支店
                dataBuf(rowCount, 3) = parts(2)                 ' カテゴリ
                dataBuf(rowCount, 4) = parts(3)                 ' 商品コード
                dataBuf(rowCount, 5) = parts(4)                 ' 商品名
                dataBuf(rowCount, 6) = CLng(parts(5))           ' 数量
                dataBuf(rowCount, 7) = CLng(parts(6))           ' 単価
                dataBuf(rowCount, 8) = CDbl(parts(7))           ' 金額
            Else
                skipped = skipped + 1   ' 列数が合わない行は捨てて件数だけ記録
            End If
        End If
    Loop
    Close #fno

    ReadOneCsv = rowCount - startRow
End Function

'---------------------------------------------------------------------
' 「生データ」シートへ一括書き出し
'---------------------------------------------------------------------
Private Sub WriteRawSheet(ByRef data() As Variant, ByVal rowCount As Long)
    Dim ws As Worksheet
    Set ws = PrepareSheet(SHEET_RAW)

    Dim headers As Variant
    headers = Array("日付", "支店", "カテゴリ", "商品コード", "商品名", "数量", "単価", "金額")
    ws.Range("A1").Resize(1, CSV_COL_COUNT).Value = headers
    FormatHeaderRow ws.Range("A1").Resize(1, CSV_COL_COUNT)

    ' 配列を一括貼り付け（ループでセルに書かない）
    ws.Range("A2").Resize(rowCount, CSV_COL_COUNT).Value = data

    With ws
        .Columns("A").NumberFormat = "yyyy/mm/dd"
        .Columns("F:H").NumberFormat = "#,##0"
        .Columns("A:H").EntireColumn.AutoFit
        .Range("A1").AutoFilter
    End With
End Sub

'---------------------------------------------------------------------
' 「取込ログ」シートへ結果を書き出し
'---------------------------------------------------------------------
Private Sub WriteLogSheet(ByRef logBuf() As Variant, _
                          ByVal fileCount As Long, _
                          ByVal rowCount As Long, _
                          ByVal folderPath As String)
    Dim ws As Worksheet
    Set ws = PrepareSheet(SHEET_LOG)

    ws.Range("A1").Value = "CSV取込ログ"
    ws.Range("A1").Font.Bold = True
    ws.Range("A1").Font.Size = 12
    ws.Range("A2").Value = "取込フォルダ: " & folderPath
    ws.Range("A3").Value = "取込日時: " & Format$(Now, "yyyy/mm/dd hh:nn:ss")
    ws.Range("A2:A3").Font.Color = COLOR_NOTE

    Dim headers As Variant
    headers = Array("ファイル名", "取込行数", "スキップ行数")
    ws.Range("A5").Resize(1, 3).Value = headers
    FormatHeaderRow ws.Range("A5").Resize(1, 3)

    ws.Range("A6").Resize(fileCount, 3).Value = logBuf

    ' 合計行
    Dim totalRow As Long
    totalRow = 6 + fileCount
    ws.Cells(totalRow, 1).Value = "合計 " & fileCount & " ファイル"
    ws.Cells(totalRow, 2).Value = rowCount
    ws.Range(ws.Cells(totalRow, 1), ws.Cells(totalRow, 3)).Font.Bold = True
    ws.Range(ws.Cells(totalRow, 1), ws.Cells(totalRow, 3)).Interior.Color = COLOR_TOTAL_BG

    ws.Columns("B:C").NumberFormat = "#,##0"
    DrawTableBorders ws.Range(ws.Cells(5, 1), ws.Cells(totalRow, 3))
    ws.Columns("A:C").EntireColumn.AutoFit
    ' A2のフォルダパスに合わせてA列が広がりすぎないよう上限を設ける
    If ws.Columns("A").ColumnWidth > 30 Then ws.Columns("A").ColumnWidth = 30
End Sub
