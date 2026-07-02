Attribute VB_Name = "Module1"
'==========================================================================
' Module1 ： 請求書作成（メイン処理）
'--------------------------------------------------------------------------
' 【このブックの役割】
'   「受注一覧(2026)」シートに入力した受注データから、お客様ごとの
'   請求書を「請求書テンプレ」シートで組み立て、PDFとして保存します。
'
' 【シート構成】
'   ・受注一覧(2026) … 受注データの入力表（A:受注日 〜 H:請求書No）
'   ・請求書テンプレ … 請求書のレイアウト（転記先は B5〜G20 付近）
'   ・設定           … B2:次の請求書番号 / B3:PDF保存先 / B4:差し込み文言
'   ・処理済み       … 発行済みの行の保管場所（Module2 で使用）
'
' 【ボタンとの対応（受注一覧シート上）】
'   ・「選択した行の請求書を作成」 → CreateInvoiceSelected
'   ・「今月分をまとめて作成」     → CreateInvoicesMonthly
'   ・「発行済みの行を整理」       → ArchiveIssuedRows（Module2）
'
' ※このマクロはポートフォリオ見本用に作成した架空のものです。
'   登場する会社名・住所・金額はすべて架空の見本データです。
'==========================================================================
Option Explicit

'--------------------------------------------------------------------------
' シート名の定数
'   受注一覧シートの名前はこの1行だけで管理する。
'   シート名を変更した場合は、この定数を書き換えれば全処理に反映される。
'   （2026-06-13 修正：シート名の直書きをやめ、ここに集約した）
'--------------------------------------------------------------------------
Public Const SHEET_ORDERS As String = "受注一覧(2026)"

'--- 受注一覧の列位置（列を挿入・削除すると転記がずれるので変更不可） ------
Private Const COL_ORDER_DATE As Long = 1      ' A列：受注日
Private Const COL_CUSTOMER   As Long = 2      ' B列：顧客名
Private Const COL_ADDRESS    As Long = 3      ' C列：住所
Private Const COL_ITEM       As Long = 4      ' D列：品目
Private Const COL_QTY        As Long = 5      ' E列：数量
Private Const COL_AMOUNT     As Long = 6      ' F列：金額（税抜）
Private Const COL_ISSUED     As Long = 7      ' G列：発行日
Private Const COL_INVOICE_NO As Long = 8      ' H列：請求書No

'--- その他の定数 -----------------------------------------------------------
Private Const FIRST_DATA_ROW As Long = 2      ' 受注一覧のデータ開始行
Private Const TAX_RATE As Double = 0.1        ' 消費税率（10%）
Private Const APP_TITLE As String = "請求書作成"

'--------------------------------------------------------------------------
' 【使い方（ふだんの運用）】
'   1. 受注が入ったら受注一覧シートの末尾に1行追加する
'   2. 月末に「今月分をまとめて作成」ボタンを押す
'   3. 作成されたPDF（保存先は設定シートB3＋年月フォルダ）を確認して送付する
'   4. 月初に「発行済みの行を整理」ボタンで一覧を整理する
'
' 【運用メモ】
'   ・請求書番号は「設定」シートB2の1か所で管理している。
'     手で書き換えると番号が重複するため触らないこと。
'   ・PDFの保存先（設定シートB3）が存在しないPCに移した場合は、
'     先にフォルダを作るか、B3のパスを実在する場所に直すこと。
'   ・受注一覧のフィルタはブックを開いたときに自動で当月分になる
'     （ThisWorkbook の Workbook_Open）。全件を見たいときはフィルタ解除。
'
' 【変更履歴】
'   2026-05-08 新規作成
'   2026-06-13 シート名の直書き（"受注一覧"）をやめ、定数 SHEET_ORDERS に
'              集約。定数を現在のシート名「受注一覧(2026)」に設定
'              （詳細は納品時の「変更内容書」を参照）
'--------------------------------------------------------------------------

'==========================================================================
' 選択した行の請求書を作成
'   ボタン「選択した行の請求書を作成」から実行（メイン処理）
'--------------------------------------------------------------------------
'   1) 選択中の行が請求書を作れる行か確認
'   2) 「設定」シートから次の請求書番号を取得
'   3) 「請求書テンプレ」シートに顧客名・住所・明細・合計金額を転記
'   4) テンプレシートをPDFとして出力（設定シートのフォルダ＋年月フォルダ）
'   5) 受注一覧の「発行日」「請求書No」列に記録
'   6) 「設定」シートの請求書番号を1つ進める
'==========================================================================
Public Sub CreateInvoiceSelected()

    Dim wsOrders As Worksheet
    Set wsOrders = ThisWorkbook.Worksheets(SHEET_ORDERS)

    ' --- 受注一覧シート上で実行されているかを確認 ------------------------
    If Not ActiveSheet Is wsOrders Then
        MsgBox "このマクロは「" & wsOrders.Name & "」シート上で実行してください。", _
               vbExclamation, APP_TITLE
        Exit Sub
    End If

    Dim r As Long
    r = ActiveCell.Row

    ' --- 1) 選択行のチェック ---------------------------------------------
    If r < FIRST_DATA_ROW Or wsOrders.Cells(r, COL_ORDER_DATE).Value = "" Then
        MsgBox "請求書を作りたい受注の行を選択してから実行してください。", _
               vbExclamation, APP_TITLE
        Exit Sub
    End If

    If Not IsRowReady(wsOrders, r) Then
        MsgBox "顧客名または金額が空欄のため、請求書を作成できません。" & vbLf & _
               "（" & r & " 行目）", vbExclamation, APP_TITLE
        Exit Sub
    End If

    ' --- 発行済みの行は確認してから再発行する ----------------------------
    If wsOrders.Cells(r, COL_ISSUED).Value <> "" Then
        If MsgBox("この行は発行済みです（発行日：" & _
                  Format$(wsOrders.Cells(r, COL_ISSUED).Value, "yyyy/mm/dd") & "）。" & vbLf & _
                  "再発行しますか？", vbYesNo + vbQuestion, APP_TITLE) <> vbYes Then
            Exit Sub
        End If
    End If

    ' --- 2)〜6) 請求書の作成本体 -----------------------------------------
    CreateInvoiceForRow wsOrders, r

    Application.StatusBar = "請求書 No." & _
        Format$(wsOrders.Cells(r, COL_INVOICE_NO).Value, "0000") & " を作成しました。"

End Sub

'==========================================================================
' 今月分をまとめて作成
'   ボタン「今月分をまとめて作成」から実行
'--------------------------------------------------------------------------
'   受注一覧を上から順に見て「当月」かつ「発行日が空欄」の行を探し、
'   見つかった行ごとに CreateInvoiceForRow（1件作成と同じ処理）を実行する。
'   発行済みの行はスキップされるため、同じ月に2回実行しても重複しない。
'   （ただし発行日を手で消すと同じ請求が再発行されるので注意）
'==========================================================================
Public Sub CreateInvoicesMonthly()

    Dim wsOrders As Worksheet
    Set wsOrders = ThisWorkbook.Worksheets(SHEET_ORDERS)

    Dim lastRow As Long
    lastRow = wsOrders.Cells(wsOrders.Rows.Count, COL_ORDER_DATE).End(xlUp).Row

    Dim r As Long
    Dim madeCount As Long

    For r = FIRST_DATA_ROW To lastRow
        If IsMonthlyTarget(wsOrders, r) Then
            CreateInvoiceForRow wsOrders, r
            madeCount = madeCount + 1
        End If
    Next r

    MsgBox madeCount & " 件作成しました。", vbInformation, APP_TITLE

End Sub

'==========================================================================
' 請求書の作成本体（1行分）
'   CreateInvoiceSelected / CreateInvoicesMonthly の両方から呼ばれる共通処理
'--------------------------------------------------------------------------
'   引数  wsOrders … 受注一覧シート
'         r        … 対象の行番号
'==========================================================================
Public Sub CreateInvoiceForRow(wsOrders As Worksheet, r As Long)

    ' --- 2) 「設定」シートから次の請求書番号を取得 ------------------------
    Dim invNo As Long
    invNo = NextInvoiceNo()

    ' --- 3) 「請求書テンプレ」シートへ転記 --------------------------------
    FillTemplate wsOrders, r, invNo

    ' --- 4) テンプレシートをPDFとして出力 ---------------------------------
    ExportInvoicePdf CStr(wsOrders.Cells(r, COL_CUSTOMER).Value), invNo

    ' --- 5) 受注一覧に発行日と請求書Noを記録 ------------------------------
    wsOrders.Cells(r, COL_ISSUED).Value = Date
    wsOrders.Cells(r, COL_INVOICE_NO).Value = invNo

    ' --- 6) 「設定」シートの請求書番号を1つ進める --------------------------
    ThisWorkbook.Worksheets("設定").Range("B2").Value = invNo + 1

End Sub

'==========================================================================
' 請求書テンプレへの転記
'   転記先は「請求書テンプレ」シートの B5〜G20 付近。
'   レイアウトを変更する場合は、このプロシージャの修正とセットで行うこと。
'==========================================================================
Private Sub FillTemplate(wsOrders As Worksheet, r As Long, invNo As Long)

    Dim wsTpl As Worksheet
    Set wsTpl = ThisWorkbook.Worksheets("請求書テンプレ")

    ' --- 金額の計算（税抜金額 → 消費税 → 税込合計） -----------------------
    Dim amount As Currency        ' 税抜金額
    Dim tax As Currency           ' 消費税
    amount = wsOrders.Cells(r, COL_AMOUNT).Value
    tax = Int(amount * TAX_RATE)  ' 円未満切り捨て

    ' --- 数量（空欄なら1件扱い） ------------------------------------------
    Dim qty As Long
    qty = 1
    If IsNumeric(wsOrders.Cells(r, COL_QTY).Value) Then
        qty = CLng(wsOrders.Cells(r, COL_QTY).Value)
    End If
    If qty < 1 Then qty = 1

    With wsTpl
        .Range("G3").Value = "No. " & Format$(invNo, "0000")   ' 請求書番号
        .Range("G4").Value = Date                              ' 発行日
        .Range("B5").Value = wsOrders.Cells(r, COL_CUSTOMER).Value & "　御中"
        .Range("B6").Value = wsOrders.Cells(r, COL_ADDRESS).Value
        .Range("D8").Value = amount + tax                      ' ご請求金額（税込）

        ' 明細（このブックは1受注＝1明細の運用）
        .Range("B11").Value = wsOrders.Cells(r, COL_ITEM).Value
        .Range("E11").Value = qty
        .Range("F11").Value = amount / qty                     ' 単価
        .Range("G11").Value = amount

        .Range("G13").Value = amount                           ' 小計
        .Range("G14").Value = tax                              ' 消費税（10%）
        .Range("G15").Value = amount + tax                     ' 合計金額

        ' 差し込み文言（自社名・振込先。「設定」シートB4で変更できる）
        .Range("B18").Value = ThisWorkbook.Worksheets("設定").Range("B4").Value
    End With

End Sub

'==========================================================================
' 請求書PDFの出力
'   保存先：「設定」シートB3のフォルダ ＋「年月」フォルダ（例 2026-07）
'   ※保存先フォルダ（B3）が存在しない場合はエラーで止まる。
'     （年月フォルダのみ自動作成する。B3のフォルダ自体は自動作成しない）
'==========================================================================
Private Sub ExportInvoicePdf(customerName As String, invNo As Long)

    Dim baseDir As String
    baseDir = ThisWorkbook.Worksheets("設定").Range("B3").Value

    ' 末尾の \ があれば取り除いて揃える
    If Right$(baseDir, 1) = "\" Then baseDir = Left$(baseDir, Len(baseDir) - 1)

    ' --- 年月フォルダ（なければ作る） -------------------------------------
    Dim monthDir As String
    monthDir = baseDir & "\" & Format$(Date, "yyyy-mm")
    If Dir$(monthDir, vbDirectory) = "" Then
        MkDir monthDir    ' ※baseDir が存在しないときはここで実行時エラーになる
    End If

    ' --- ファイル名：請求書_番号_顧客名.pdf -------------------------------
    Dim pdfPath As String
    pdfPath = monthDir & "\請求書_" & Format$(invNo, "0000") & "_" & customerName & ".pdf"

    ThisWorkbook.Worksheets("請求書テンプレ").ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=pdfPath, _
        Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, _
        OpenAfterPublish:=False

End Sub

'==========================================================================
' 次の請求書番号の取得
'   「設定」シートB2の1か所で管理。手で書き換えると番号が重複するので注意。
'==========================================================================
Private Function NextInvoiceNo() As Long
    NextInvoiceNo = CLng(ThisWorkbook.Worksheets("設定").Range("B2").Value)
End Function

'==========================================================================
' 行チェック：請求書を作れる行か（顧客名・金額が入っているか）
'==========================================================================
Private Function IsRowReady(wsOrders As Worksheet, r As Long) As Boolean
    IsRowReady = (wsOrders.Cells(r, COL_CUSTOMER).Value <> "" And _
                  wsOrders.Cells(r, COL_AMOUNT).Value <> "")
End Function

'==========================================================================
' 行チェック：「今月分をまとめて作成」の対象行か
'   当月の受注で、発行日が空欄で、顧客名・金額が入っている行
'==========================================================================
Private Function IsMonthlyTarget(wsOrders As Worksheet, r As Long) As Boolean

    IsMonthlyTarget = False

    ' 受注日が日付でなければ対象外
    If Not IsDate(wsOrders.Cells(r, COL_ORDER_DATE).Value) Then Exit Function

    ' 当月以外は対象外
    Dim orderDate As Date
    orderDate = wsOrders.Cells(r, COL_ORDER_DATE).Value
    If Year(orderDate) <> Year(Date) Or Month(orderDate) <> Month(Date) Then Exit Function

    ' 発行済み（発行日あり）はスキップ
    If wsOrders.Cells(r, COL_ISSUED).Value <> "" Then Exit Function

    ' 顧客名・金額が空欄の行はスキップ
    If Not IsRowReady(wsOrders, r) Then Exit Function

    IsMonthlyTarget = True

End Function
