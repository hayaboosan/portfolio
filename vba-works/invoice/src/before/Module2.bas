Attribute VB_Name = "Module2"
'==========================================================================
' Module2 ： 発行済みの行の整理
'--------------------------------------------------------------------------
'   ボタン「発行済みの行を整理」から実行。
'   発行日が入っている行を「処理済み」シートの末尾へ移動し、
'   受注一覧から削除する（コピーが終わってから削除する）。
'
'   ※このマクロはボタンのあるシート（受注一覧）上で実行される前提で、
'     ActiveSheet を対象にしている。
'
'   【処理の順番】
'     1) 発行日が入っている行をまとめて「処理済み」シートの末尾へコピー
'     2) コピーが終わってから、受注一覧側の該当行を削除
'   コピーより先に削除しないのは、途中でエラーが起きても
'   データが消えないようにするため。
'==========================================================================
Option Explicit

Public Sub ArchiveIssuedRows()

    ' ボタンのあるシート（受注一覧）が対象
    Dim wsOrders As Worksheet
    Set wsOrders = ActiveSheet

    Dim wsDone As Worksheet
    Set wsDone = ThisWorkbook.Worksheets("処理済み")

    Dim lastRow As Long
    lastRow = wsOrders.Cells(wsOrders.Rows.Count, 1).End(xlUp).Row

    If lastRow < 2 Then
        MsgBox "整理する行がありません。", vbInformation, "請求書作成"
        Exit Sub
    End If

    ' --- 1) 発行済みの行を「処理済み」シートの末尾へコピー ----------------
    Dim destRow As Long
    destRow = wsDone.Cells(wsDone.Rows.Count, 1).End(xlUp).Row + 1

    Dim r As Long
    Dim movedCount As Long

    For r = 2 To lastRow
        If wsOrders.Cells(r, 7).Value <> "" Then    ' G列：発行日あり＝発行済み
            wsOrders.Range(wsOrders.Cells(r, 1), wsOrders.Cells(r, 8)).Copy _
                Destination:=wsDone.Cells(destRow, 1)
            destRow = destRow + 1
            movedCount = movedCount + 1
        End If
    Next r

    If movedCount = 0 Then
        MsgBox "発行済みの行はありませんでした。", vbInformation, "請求書作成"
        Exit Sub
    End If

    ' --- 2) コピーが終わってから、受注一覧側の行を削除（下から上へ） ------
    For r = lastRow To 2 Step -1
        If wsOrders.Cells(r, 7).Value <> "" Then
            wsOrders.Rows(r).Delete
        End If
    Next r

    MsgBox movedCount & " 件を「処理済み」シートへ移動しました。", _
           vbInformation, "請求書作成"

End Sub
