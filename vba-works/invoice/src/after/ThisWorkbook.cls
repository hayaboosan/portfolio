VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
'==========================================================================
' ThisWorkbook ： ブックを開いたときの自動処理
'--------------------------------------------------------------------------
'   Workbook_Open：受注一覧の表示を当月分に絞り込む。
'   データを消しているわけではなく、オートフィルタによる絞り込み。
'   （フィルタを解除すればすべての行が表示される）
'
'   すべての行を見たいときは、受注一覧のA列のフィルタボタンから
'   「すべて選択」を選ぶか、データタブの「クリア」を押す。
'==========================================================================
Option Explicit

Private Sub Workbook_Open()

    ' 絞り込みに失敗してもブックが開けなくなるのは避けたいので、
    ' このプロシージャの中のエラーは無視して続行する
    On Error Resume Next

    Dim wsOrders As Worksheet
    Set wsOrders = Worksheets(SHEET_ORDERS)

    Dim lastRow As Long
    lastRow = wsOrders.Cells(wsOrders.Rows.Count, 1).End(xlUp).Row
    If lastRow < 2 Then Exit Sub

    ' 当月の初日〜末日
    Dim firstDay As Date
    Dim lastDay As Date
    firstDay = DateSerial(Year(Date), Month(Date), 1)
    lastDay = DateSerial(Year(Date), Month(Date) + 1, 0)

    ' A列（受注日）を当月分だけに絞り込む
    With wsOrders
        If .AutoFilterMode Then .AutoFilterMode = False
        .Range(.Cells(1, 1), .Cells(lastRow, 8)).AutoFilter _
            Field:=1, _
            Criteria1:=">=" & CLng(firstDay), _
            Operator:=xlAnd, _
            Criteria2:="<=" & CLng(lastDay)
    End With

End Sub
