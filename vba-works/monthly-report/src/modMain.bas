Attribute VB_Name = "modMain"
Option Explicit
'=====================================================================
' modMain : エントリポイント
'---------------------------------------------------------------------
' 処理の流れ:
'   1. CSV一括取込 (modImport)   … フォルダ内の日次売上CSVを全件読込
'   2. 月次集計    (modAggregate)… Dictionaryで支店/カテゴリ/商品別に集計
'   3. レポート生成 (modReport)  … A4印刷用の月次レポートシートを組立
' ボタンからは GenerateMonthlyReport を、外部自動実行（COM等）からは
' RunReport を呼ぶ。実行時間は操作パネルに記録する。
'=====================================================================

' 直近のエラー内容（COM自動実行側からも参照できるように保持）
Private mLastError As String

'---------------------------------------------------------------------
' 操作パネルの［月次レポート生成］ボタンから実行される
'---------------------------------------------------------------------
Public Sub GenerateMonthlyReport()
    Dim elapsed As Double
    elapsed = RunReport()
    If elapsed >= 0 Then
        MsgBox "月次レポートを生成しました。" & vbCrLf & vbCrLf & _
               "処理時間: " & Format$(elapsed, "0.00") & " 秒", _
               vbInformation, APP_TITLE
        ThisWorkbook.Worksheets(SHEET_REPORT).Activate
    Else
        MsgBox "処理を中断しました。" & vbCrLf & vbCrLf & mLastError, _
               vbExclamation, APP_TITLE
    End If
End Sub

'---------------------------------------------------------------------
' レポート生成の本体
'   戻り値: 処理時間（秒）。エラー時は -1
'   ※MsgBoxを出さないため、COM自動実行からはこちらを直接呼べる
'---------------------------------------------------------------------
Public Function RunReport() As Double
    Dim startTime As Single
    startTime = Timer
    mLastError = ""

    On Error GoTo ErrHandler
    SpeedUp

    ' 1) CSV一括取込
    Dim fileCount As Long, rowCount As Long
    Dim rawData As Variant
    rawData = ImportAllCsv(fileCount, rowCount)

    ' 2) 月次集計
    Aggregate rawData

    ' 3) レポート生成
    BuildReport fileCount, rowCount

    RestoreAppState

    ' 実行結果を操作パネルに記録
    Dim elapsed As Double
    elapsed = Timer - startTime
    If elapsed < 0 Then elapsed = elapsed + 86400   ' 日付またぎ対策
    WriteResultToMenu fileCount, rowCount, elapsed

    RunReport = elapsed
    Exit Function

ErrHandler:
    ' MsgBoxはここでは出さない（COM自動実行時にダイアログで止まるのを防ぐ）
    mLastError = Err.Description
    RestoreAppState
    RunReport = -1
End Function

'---------------------------------------------------------------------
' 直近のエラー内容を返す（正常時は空文字）
'---------------------------------------------------------------------
Public Function LastError() As String
    LastError = mLastError
End Function

'---------------------------------------------------------------------
' 操作パネルへ前回実行結果を書き込む
'---------------------------------------------------------------------
Private Sub WriteResultToMenu(ByVal fileCount As Long, ByVal rowCount As Long, _
                              ByVal elapsed As Double)
    If Not SheetExists(SHEET_MENU) Then Exit Sub
    With ThisWorkbook.Worksheets(SHEET_MENU).Range(MENU_RESULT_CELL)
        .Value = "前回実行: " & Format$(Now, "yyyy/mm/dd hh:nn") & _
                 "　CSV " & fileCount & " ファイル・" & Format$(rowCount, "#,##0") & " 行を取込" & _
                 "　処理時間 " & Format$(elapsed, "0.00") & " 秒"
        .Font.Color = COLOR_NOTE
    End With
End Sub
