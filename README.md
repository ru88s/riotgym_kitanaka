# キックボクシング タイマー

キックボクシングやボクシングの練習用に作られた、シンプルで使いやすいWebタイマーアプリです。

## 機能

- **ラウンドタイマー**: 設定したラウンド数とラウンド時間で自動的にカウントダウン
- **休憩タイマー**: ラウンド間の休憩時間を自動管理
- **準備時間**: トレーニング開始前のウォーミングアップ時間
- **呼び鈴音**: ラウンド開始・終了時に自動で音が鳴る（Web Audio API使用）
- **警告音**: ラウンド終了10秒前に警告音（オプション）
- **設定保存**: ブラウザのLocalStorageに設定を自動保存
- **レスポンシブデザイン**: スマートフォンでも使いやすい
- **キーボードショートカット**: スペースキーでスタート/一時停止、Rキーでリセット

## 使い方

### 基本操作

1. **スタートボタン**をクリックしてタイマーを開始
2. **一時停止ボタン**で一時停止・再開
3. **リセットボタン**でタイマーを初期状態に戻す
4. **⚙️ 設定ボタン**で各種設定を変更

### 設定項目

- **ラウンド数**: 1〜12ラウンド
- **ラウンド時間**: 1〜10分
- **休憩時間**: 10〜300秒（10秒刻み）
- **準備時間**: 0〜60秒（5秒刻み）
- **音声を有効にする**: ベル音のオン/オフ
- **終了10秒前に警告音**: 警告音のオン/オフ

### キーボードショートカット

- **スペースキー**: スタート / 一時停止 / 再開
- **Rキー**: リセット

## ローカルでの実行

1. リポジトリをクローン
```bash
git clone <your-repo-url>
cd riotgym_kitanaka
```

2. ブラウザで `index.html` を開く
```bash
open index.html  # macOS
# または
start index.html  # Windows
# または
xdg-open index.html  # Linux
```

## Cloudflare Pagesへのデプロイ

### 方法1: Wrangler CLIを使用

1. Wrangler CLIをインストール
```bash
npm install -g wrangler
```

2. Cloudflareにログイン
```bash
wrangler login
```

3. プロジェクトをデプロイ
```bash
wrangler pages deploy . --project-name=boxing-timer
```

### 方法2: GitHubと連携（推奨）

1. GitHubにリポジトリをプッシュ

2. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン

3. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

4. リポジトリを選択

5. ビルド設定:
   - **Build command**: （空欄のまま）
   - **Build output directory**: `/`

6. **Save and Deploy**をクリック

数分でデプロイが完了し、`https://boxing-timer.pages.dev`のようなURLでアクセスできます。

### 方法3: ダイレクトアップロード

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン

2. **Workers & Pages** → **Create application** → **Pages** → **Upload assets**

3. 以下のファイルをアップロード:
   - `index.html`
   - `style.css`
   - `script.js`

4. プロジェクト名を入力して **Deploy**

## 技術スタック

- **HTML5**: セマンティックマークアップ
- **CSS3**: レスポンシブデザイン、グラデーション、アニメーション
- **Vanilla JavaScript**: フレームワーク不要のシンプルな実装
- **Web Audio API**: リアルタイム音声生成
- **LocalStorage API**: 設定の永続化

## ブラウザ対応

- Chrome / Edge（最新版）
- Firefox（最新版）
- Safari（最新版）
- モバイルブラウザ対応

## カスタマイズ

### 色のカスタマイズ

`style.css` の `:root` セクションでカラー変数を変更できます：

```css
:root {
    --primary-color: #e74c3c;     /* メインカラー */
    --secondary-color: #3498db;    /* セカンダリカラー */
    --success-color: #2ecc71;      /* 成功カラー */
    --warning-color: #f39c12;      /* 警告カラー */
    --dark-bg: #1a1a2e;            /* 背景色 */
    --card-bg: #16213e;            /* カード背景色 */
}
```

### 音声のカスタマイズ

`script.js` の `createBellSound()` と `createBeepSound()` メソッドで音の周波数や長さを調整できます。

## ライセンス

MIT License

## 作者

Created for RIOT GYM Kitanaka

## フィードバック・バグレポート

問題や改善提案がある場合は、GitHubのIssuesでお知らせください。
