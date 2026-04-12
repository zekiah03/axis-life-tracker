import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'biz.solnova.axis',
  appName: 'TeleLog',
  // webDir はリモート URL を使うので実質ダミー。cap init に必要
  webDir: 'public',
  server: {
    // Vercel の本番デプロイを WebView で読み込む。push するたびに全ユーザーに即反映。
    url: 'https://v0-life-tracker-app-zeta.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
