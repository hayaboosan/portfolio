Attribute VB_Name = "modAggregate"
Option Explicit
'=====================================================================
' modAggregate : 月次集計（ピボット相当の処理）
'---------------------------------------------------------------------
' 取込済みの生データ配列から Dictionary を使って
'   ・月別合計 ・支店×月 ・カテゴリ×月 ・商品×月（金額/数量）
' を集計する。集計結果は本モジュール内に保持し、
' 公開関数（TargetMonth / BranchTotal など）経由でレポート側へ渡す。
' Dictionary は実行時バインディング（CreateObject）で参照設定不要にする。
'=====================================================================

Private mDictMonth As Object        ' key: "YYYYMM"               -> 金額
Private mDictBranch As Object       ' key: "YYYYMM|支店"          -> 金額
Private mDictCategory As Object     ' key: "YYYYMM|カテゴリ"      -> 金額
Private mDictProductAmt As Object   ' key: "YYYYMM|商品コード"    -> 金額
Private mDictProductQty As Object   ' key: "YYYYMM|商品コード"    -> 数量
Private mDictProductInfo As Object  ' key: "商品コード"           -> "商品名|カテゴリ"
Private mDictQtyMonth As Object     ' key: "YYYYMM"               -> 数量合計

Private mTargetMonth As String      ' 集計対象月 "YYYYMM"（データ中の最新月）
Private mPrevMonth As String        ' その前月   "YYYYMM"

Private Const KEY_SEP As String = "|"

'---------------------------------------------------------------------
' 生データ配列 (1 To N, 1 To 8) を集計する
'   列: 1=日付 2=支店 3=カテゴリ 4=商品コード 5=商品名 6=数量 7=単価 8=金額
'---------------------------------------------------------------------
Public Sub Aggregate(ByRef rawData As Variant)
    Set mDictMonth = CreateObject("Scripting.Dictionary")
    Set mDictBranch = CreateObject("Scripting.Dictionary")
    Set mDictCategory = CreateObject("Scripting.Dictionary")
    Set mDictProductAmt = CreateObject("Scripting.Dictionary")
    Set mDictProductQty = CreateObject("Scripting.Dictionary")
    Set mDictProductInfo = CreateObject("Scripting.Dictionary")
    Set mDictQtyMonth = CreateObject("Scripting.Dictionary")

    Dim r As Long
    For r = LBound(rawData, 1) To UBound(rawData, 1)
        Dim ym As String
        ym = Format$(rawData(r, 1), "yyyymm")
        Dim amount As Double, qty As Long
        amount = rawData(r, 8)
        qty = rawData(r, 6)

        AddTo mDictMonth, ym, amount
        AddTo mDictQtyMonth, ym, CDbl(qty)
        AddTo mDictBranch, ym & KEY_SEP & rawData(r, 2), amount
        AddTo mDictCategory, ym & KEY_SEP & rawData(r, 3), amount
        AddTo mDictProductAmt, ym & KEY_SEP & rawData(r, 4), amount
        AddTo mDictProductQty, ym & KEY_SEP & rawData(r, 4), CDbl(qty)

        If Not mDictProductInfo.Exists(CStr(rawData(r, 4))) Then
            mDictProductInfo.Add CStr(rawData(r, 4)), _
                rawData(r, 5) & KEY_SEP & rawData(r, 3)
        End If
    Next r

    ' --- 対象月＝データ中の最新月、前月＝その1か月前 ---
    Dim k As Variant
    mTargetMonth = ""
    For Each k In mDictMonth.Keys
        If k > mTargetMonth Then mTargetMonth = k
    Next k
    mPrevMonth = Format$(DateAdd("m", -1, _
        DateSerial(CLng(Left$(mTargetMonth, 4)), CLng(Right$(mTargetMonth, 2)), 1)), "yyyymm")
End Sub

'---------------------------------------------------------------------
' Dictionary への加算ヘルパ
'---------------------------------------------------------------------
Private Sub AddTo(ByVal dict As Object, ByVal key As String, ByVal value As Double)
    If dict.Exists(key) Then
        dict(key) = dict(key) + value
    Else
        dict.Add key, value
    End If
End Sub

'=====================================================================
' 以下、レポート生成側へ集計結果を渡すための公開関数
'=====================================================================

Public Function TargetMonth() As String
    TargetMonth = mTargetMonth
End Function

Public Function PrevMonth() As String
    PrevMonth = mPrevMonth
End Function

' 月の売上合計（データが無い月は 0）
Public Function MonthTotal(ByVal ym As String) As Double
    If mDictMonth.Exists(ym) Then MonthTotal = mDictMonth(ym)
End Function

' 月の販売数量合計
Public Function MonthQty(ByVal ym As String) As Double
    If mDictQtyMonth.Exists(ym) Then MonthQty = mDictQtyMonth(ym)
End Function

' 支店×月の売上（データが無ければ 0）
Public Function BranchTotal(ByVal branch As String, ByVal ym As String) As Double
    Dim key As String
    key = ym & KEY_SEP & branch
    If mDictBranch.Exists(key) Then BranchTotal = mDictBranch(key)
End Function

' カテゴリ×月の売上（データが無ければ 0）
Public Function CategoryTotal(ByVal category As String, ByVal ym As String) As Double
    Dim key As String
    key = ym & KEY_SEP & category
    If mDictCategory.Exists(key) Then CategoryTotal = mDictCategory(key)
End Function

' 対象月に売上のあった支店名一覧（当月売上の降順）
Public Function BranchNamesSorted() As Variant
    BranchNamesSorted = NamesSortedByAmount(mDictBranch)
End Function

' 対象月に売上のあったカテゴリ名一覧（当月売上の降順）
Public Function CategoryNamesSorted() As Variant
    CategoryNamesSorted = NamesSortedByAmount(mDictCategory)
End Function

'---------------------------------------------------------------------
' "YYYYMM|名前" 形式の Dictionary から対象月の名前一覧を
' 金額降順で取り出す共通処理
'---------------------------------------------------------------------
Private Function NamesSortedByAmount(ByVal dict As Object) As Variant
    Dim names() As String, amounts() As Double
    Dim n As Long
    ReDim names(0 To dict.Count)
    ReDim amounts(0 To dict.Count)

    Dim k As Variant
    For Each k In dict.Keys
        If Left$(k, 6) = mTargetMonth Then
            names(n) = Mid$(k, 8)       ' "YYYYMM|" の後ろが名前
            amounts(n) = dict(k)
            n = n + 1
        End If
    Next k

    ' 金額降順の単純挿入ソート（要素数は支店/カテゴリ程度なので十分）
    Dim i As Long, j As Long
    For i = 1 To n - 1
        Dim tmpName As String, tmpAmt As Double
        tmpName = names(i): tmpAmt = amounts(i)
        j = i - 1
        Do While j >= 0
            If amounts(j) >= tmpAmt Then Exit Do
            names(j + 1) = names(j): amounts(j + 1) = amounts(j)
            j = j - 1
        Loop
        names(j + 1) = tmpName: amounts(j + 1) = tmpAmt
    Next i

    Dim result() As String
    If n = 0 Then
        NamesSortedByAmount = Array()   ' 対象月にデータ無し
        Exit Function
    End If
    ReDim result(0 To n - 1)
    For i = 0 To n - 1
        result(i) = names(i)
    Next i
    NamesSortedByAmount = result
End Function

'---------------------------------------------------------------------
' 対象月の売上上位商品を返す
'   戻り値: 2次元配列 (1 To 件数, 1 To 5)
'           1=商品コード 2=商品名 3=カテゴリ 4=数量 5=金額
'---------------------------------------------------------------------
Public Function TopProducts(ByVal maxCount As Long) As Variant
    ' 対象月の商品だけを配列に抽出
    Dim codes() As String, amounts() As Double
    Dim n As Long
    ReDim codes(0 To mDictProductAmt.Count)
    ReDim amounts(0 To mDictProductAmt.Count)

    Dim k As Variant
    For Each k In mDictProductAmt.Keys
        If Left$(k, 6) = mTargetMonth Then
            codes(n) = Mid$(k, 8)
            amounts(n) = mDictProductAmt(k)
            n = n + 1
        End If
    Next k

    ' 金額降順ソート
    Dim i As Long, j As Long
    For i = 1 To n - 1
        Dim tmpCode As String, tmpAmt As Double
        tmpCode = codes(i): tmpAmt = amounts(i)
        j = i - 1
        Do While j >= 0
            If amounts(j) >= tmpAmt Then Exit Do
            codes(j + 1) = codes(j): amounts(j + 1) = amounts(j)
            j = j - 1
        Loop
        codes(j + 1) = tmpCode: amounts(j + 1) = tmpAmt
    Next i

    Dim outCount As Long
    outCount = n
    If outCount > maxCount Then outCount = maxCount

    Dim result() As Variant
    ReDim result(1 To outCount, 1 To 5)
    For i = 1 To outCount
        Dim info() As String
        info = Split(mDictProductInfo(codes(i - 1)), KEY_SEP)
        result(i, 1) = codes(i - 1)                                     ' 商品コード
        result(i, 2) = info(0)                                          ' 商品名
        result(i, 3) = info(1)                                          ' カテゴリ
        result(i, 4) = mDictProductQty(mTargetMonth & KEY_SEP & codes(i - 1))   ' 数量
        result(i, 5) = amounts(i - 1)                                   ' 金額
    Next i
    TopProducts = result
End Function
