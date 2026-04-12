# Android (ネイティブ) ビルド手順

このリポジトリは Capacitor でラップされており、WebView から Vercel の本番URLを読み込む構成です。ネイティブ版をビルドすると Health Connect 経由で歩数などの端末データを取得できます。

## 前提

- Windows / macOS / Linux のいずれか
- Node.js 20+ (既にOK)
- **Android Studio** (Koala以降推奨) — SDK含む
- **Java 17** — Android Studio 同梱のJDKで問題なし
- Android 14 以降の実機 or エミュレータ (Health Connect はAndroid 14+ が基本)

## 初回セットアップ (所要時間 30分〜1時間)

### 1. Android Studio インストール

1. https://developer.android.com/studio から Windows 版をダウンロード
2. インストーラ実行、標準設定で進める
3. 初回起動時に **SDK Platform 34 (Android 14)** と **SDK Platform-Tools** をダウンロード (自動で促される)
4. Tools → SDK Manager から **Android 14 (API 34)** 以上にチェック

### 2. 環境変数設定 (Windows)

システム環境変数に追加:

```
ANDROID_HOME = C:\Users\user\AppData\Local\Android\Sdk
Path += %ANDROID_HOME%\platform-tools
```

確認:
```bash
echo $ANDROID_HOME
# /c/Users/user/AppData/Local/Android/Sdk が表示されればOK
```

### 3. Health Connect アプリのインストール

Android 13以前の端末、または一部の14端末では Google Play Store から「Health Connect by Android」を手動インストールする必要があります。

## 日常のビルドフロー

### Web 側の変更を反映

コード(Next.js)を変更して `vercel --prod` でデプロイするだけ。Capacitor は **リモートURL** を読み込む設定なので、アプリの再ビルドは不要で、次回起動時に自動で最新版が表示されます。

### ネイティブ側の変更 (プラグイン追加など) を反映

```bash
npx cap sync android
```

### Android Studio で開く

```bash
npx cap open android
```

または Android Studio を開いて `android/` フォルダを選択。

### 実機にインストール

1. 端末を USB デバッグモードで接続 (開発者オプションをONにして「USBデバッグ」許可)
2. Android Studio の Run ボタン (▶) を押す
3. 初回はビルドに 3〜10 分かかる
4. インストール完了後、端末に AXIS アプリアイコンが現れる

## ヘルスデータの使い方 (アプリ側)

1. オンボーディング画面で「歩数」「心拍数」「SpO2」など、ネイティブ対応プリセットを選択
2. 歩数タブを開く
3. 「Health Connect から同期」カードが表示される
4. 「直近7日を取得」ボタンをタップ
5. 権限ダイアログで許可 → 過去7日分が取り込まれる

## トラブルシューティング

### 「アプリに互換性がありません」と Health Connect が言う
- Android 14+ の端末で試してください
- Google Play Protect が AXIS アプリの署名を認識していない場合があります

### リモートURLが読み込まれない
- `capacitor.config.ts` の `server.url` が正しいか確認
- `npx cap sync android` を再実行
- 端末のネットワーク接続を確認

### ビルドエラー
- Android Studio の File → Invalidate Caches → Invalidate and Restart
- `android/` フォルダを削除して `npx cap add android` からやり直し

## 対応プリセット

以下のメトリクスに `healthSource` が紐付いており、ネイティブアプリで「直近7日を取得」ボタンが表示されます:

- 歩数 → Steps
- 心拍数 → Resting Heart Rate
- 体温 → Body Temperature
- SpO2 → Oxygen Saturation
- 有酸素運動 → Exercise Time
- 消費カロリー → Total Calories

他のプリセット (水分・気分・勉強など) は手動入力専用です。

## iOS 対応について

将来 iOS に対応する場合は:

```bash
npx cap add ios
```

ただし macOS + Xcode + Apple Developer アカウント (¥12,800/年) が必要です。Windows からはビルドできません。
