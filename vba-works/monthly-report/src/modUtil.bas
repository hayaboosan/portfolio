Attribute VB_Name = "modUtil"
Option Explicit
'=====================================================================
' modUtil : 共通ユーティリティ
'---------------------------------------------------------------------
' 高速化スイッチ（画面更新OFFなど）とシート操作のヘルパを提供する。
' SpeedUp / RestoreAppState は必ず対で呼ぶこと（エラー時も含む）。
'=====================================================================

' SpeedUp 前の計算モードを退避しておく（RestoreAppState で戻す）
Private mPrevCalculation As XlCalculation
Private mIsSpeedUp As Boolean

'---------------------------------------------------------------------
' 高速化モードON：画面更新・自動計算・イベントを止める
'---------------------------------------------------------------------
Public Sub SpeedUp()
    If mIsSpeedUp Then Exit Sub          ' 二重呼び出しで計算モードを壊さない
    mPrevCalculation = Application.Calculation
    With Application
        .ScreenUpdating = False
        .EnableEvents = False
        .DisplayAlerts = False
        .Calculation = xlCalculationManual
    End With
    mIsSpeedUp = True
End Sub

'---------------------------------------------------------------------
' 高速化モードOFF：アプリ状態を元に戻す
'---------------------------------------------------------------------
Public Sub RestoreAppState()
    With Application
        .Calculation = IIf(mIsSpeedUp, mPrevCalculation, xlCalculationAutomatic)
        .ScreenUpdating = True
        .EnableEvents = True
        .DisplayAlerts = True
        .StatusBar = False
    End With
    mIsSpeedUp = False
End Sub

'---------------------------------------------------------------------
' シートの存在チェック
'---------------------------------------------------------------------
Public Function SheetExists(ByVal sheetName As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    SheetExists = Not ws Is Nothing
End Function

'---------------------------------------------------------------------
' シートを取得（無ければ末尾に新規作成）し、中身をクリアして返す
'---------------------------------------------------------------------
Public Function PrepareSheet(ByVal sheetName As String) As Worksheet
    Dim ws As Worksheet
    If SheetExists(sheetName) Then
        Set ws = ThisWorkbook.Worksheets(sheetName)
        ws.Cells.Clear
        ' 前回実行時の図形（グラフなど）も消しておく
        Dim shp As Shape
        For Each shp In ws.Shapes
            shp.Delete
        Next shp
    Else
        Set ws = ThisWorkbook.Worksheets.Add( _
            After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = sheetName
    End If
    Set PrepareSheet = ws
End Function

'---------------------------------------------------------------------
' 範囲に格子罫線を引く（レポート表用）
'---------------------------------------------------------------------
Public Sub DrawTableBorders(ByVal target As Range)
    With target.Borders
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(160, 160, 160)
    End With
    target.BorderAround LineStyle:=xlContinuous, Weight:=xlMedium
End Sub

'---------------------------------------------------------------------
' 表ヘッダ行の書式（青地・白文字・中央揃え）
'---------------------------------------------------------------------
Public Sub FormatHeaderRow(ByVal target As Range)
    With target
        .Interior.Color = COLOR_HEADER_BG
        .Font.Color = vbWhite
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
    End With
End Sub
