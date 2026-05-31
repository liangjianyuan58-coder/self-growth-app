#!/usr/bin/env node
/**
 * Google Calendar 連携セットアップスクリプト（一度だけ実行）
 *
 * 使い方:
 *   node scripts/google-auth.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * 事前準備:
 *   1. https://console.cloud.google.com/ でプロジェクトを作成
 *   2. 「APIとサービス」→「ライブラリ」→ "Google Calendar API" を有効化
 *   3. 「認証情報」→「+ 認証情報を作成」→「OAuth クライアント ID」
 *      種類: デスクトップアプリ
 *      名前: 任意（例: self-growth-app）
 *   4. 作成後、クライアントIDとシークレットをこのスクリプトに渡す
 */

import { createServer } from 'node:http'

const [,, clientId, clientSecret] = process.argv

if (!clientId || !clientSecret) {
  console.error('\n使い方: node scripts/google-auth.mjs <CLIENT_ID> <CLIENT_SECRET>\n')
  process.exit(1)
}

const REDIRECT_URI = 'http://localhost:3001/callback'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPE)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Google Calendar 認証セットアップ')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('\n以下のURLをブラウザで開いてください：\n')
console.log(authUrl.toString())
console.log('\n認証後、自動でリフレッシュトークンを取得します...\n')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3001')
  if (url.pathname !== '/callback') { res.end(); return }

  const code = url.searchParams.get('code')
  if (!code) {
    res.end('<h1>エラー: code が見つかりません</h1>')
    return
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end('<html><body><h2>✅ 認証完了！ターミナルを確認してください</h2><p>このページは閉じて構いません。</p></body></html>')

  if (tokens.refresh_token) {
    console.log('✅ 認証成功！.env.local に以下を追加してください：\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`GOOGLE_CLIENT_ID=${clientId}`)
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log(`GOOGLE_CALENDAR_ID=primary`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n※ GOOGLE_CALENDAR_ID は "primary" (メインカレンダー) か')
    console.log('   特定カレンダーのIDを指定してください\n')
  } else {
    console.error('❌ リフレッシュトークンの取得に失敗しました')
    console.error(tokens)
  }

  server.close()
})

server.listen(3001, () => {
  console.log('(ローカルサーバー起動中 → ポート 3001)\n')
})
