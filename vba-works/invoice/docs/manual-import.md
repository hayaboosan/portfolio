# .bas 手動インポート手順書（フォールバック用）

`build.ps1` は、Excel の「**VBAプロジェクト オブジェクト モデルへのアクセスを信頼する**」
設定が無効な環境では、セキュリティ設定を勝手に変更せず、
**マクロ無しのシェルブック** `dist\invoice-demo-shell.xlsm` だけを作成して終了します。
（シート4枚・サンプルデータ・ボタン3個は設定済み。VBAコードだけが入っていません）

その場合は、以下の手順で `src\after\` のソースを手動でインポートしてください。

## 0. 前提

- Windows ＋ デスクトップ版 Excel
- `build.ps1` を一度実行して `dist\invoice-demo-shell.xlsm` ができていること

## 1. .bas を Shift_JIS（CP932）に変換する

このリポジトリの `.bas` / `.cls` は GitHub 等で読めるよう **UTF-8** で保存しています。
VBE の「ファイルのインポート」は ANSI（日本語環境では CP932）を前提とするため、
そのままインポートすると日本語コメントが文字化けします。
PowerShell で次を実行すると、変換済みコピーが `%TEMP%\vba-import` にできます。

```powershell
$src = 'src\after'   # このフォルダ（invoice\）で実行する場合
$out = Join-Path $env:TEMP 'vba-import'
New-Item -ItemType Directory -Force $out | Out-Null
Get-ChildItem $src -Include *.bas,*.cls -Recurse | ForEach-Object {
    $text = [System.IO.File]::ReadAllText($_.FullName)
    [System.IO.File]::WriteAllText((Join-Path $out $_.Name), $text,
        [System.Text.Encoding]::GetEncoding(932))
}
Invoke-Item $out
```

## 2. 標準モジュールをインポートする

1. `dist\invoice-demo-shell.xlsm` を開く（マクロの警告が出たら「コンテンツの有効化」）
2. `Alt` + `F11` で VBE（Visual Basic Editor）を開く
3. メニュー「ファイル」→「ファイルのインポート」で、`%TEMP%\vba-import` の
   **Module1.bas** と **Module2.bas** を順にインポート

## 3. ThisWorkbook のコードを貼り付ける

`ThisWorkbook.cls` は「ファイルのインポート」では ThisWorkbook に入りません
（新しいクラスモジュールになってしまう）。次の手順で貼り付けます。

1. VBE 左側のプロジェクト エクスプローラーで「ThisWorkbook」をダブルクリック
2. `%TEMP%\vba-import\ThisWorkbook.cls` をメモ帳で開き、
   `Attribute` で始まる行より**下**（`'====` のコメント行から最後まで）をコピー
3. ThisWorkbook のコードウィンドウに貼り付け
   （既に `Option Explicit` の行がある場合は、重複しないよう1つだけ残す）

## 4. 保存して動作確認

1. `F12`（名前を付けて保存）→ ファイルの種類「**Excel マクロ有効ブック (*.xlsm)**」で
   `invoice-demo.xlsm` として保存
2. 「設定」シート B3 の PDF保存先フォルダが実在するパスになっているか確認
   （存在しないとPDF出力時にエラーで止まります。これは意図した仕様です →
   納品文書見本「解読レポート」5章参照）
3. ブックを開き直す → 受注一覧が当月分に絞り込まれれば `Workbook_Open` が動いています
4. 受注一覧で未発行の行（発行日が空欄の行）のどこかを選択 →
   「選択した行の請求書を作成」ボタン → PDFが生成されればOK

## （参考）自動注入を使いたい場合

「ファイル」→「オプション」→「トラスト センター」→「トラスト センターの設定」→
「マクロの設定」→「**VBAプロジェクト オブジェクト モデルへのアクセスを信頼する**」
にチェックを入れると、`build.ps1` がコード注入まで自動で行えるようになります。
セキュリティ設定の変更はご自身の判断で行ってください（このスクリプトは変更しません）。
