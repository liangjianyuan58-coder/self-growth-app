'use client'
// src/app/setup/page.tsx
// DBマイグレーションをワンタップで実行するセットアップ画面

import { useState } from 'react'

interface MigResult {
  name: string
  ok: boolean
  error?: string
}

export default function SetupPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<MigResult[]>([])
  const [dbReady, setDbReady] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  async function checkReady() {
    setChecking(true)
    const res  = await fetch('/api/setup')
    const json = await res.json() as { ready: boolean; message: string }
    setDbReady(json.ready)
    setChecking(false)
  }

  async function runMigrations() {
    setStatus('running')
    setResults([])
    const res  = await fetch('/api/setup', { method: 'POST' })
    const json = await res.json() as { results: MigResult[]; success: boolean }
    setResults(json.results ?? [])
    setStatus(json.success ? 'done' : 'error')
  }

  return (
    <main className="page">
      <h1 className="title">⚙️ セットアップ</h1>
      <p className="sub">Supabase のデータベーステーブルを作成します。<br />初回または未適用のマイグレーションがある場合に実行してください。</p>

      {/* Step 1: DATABASE_URL 確認 */}
      <div className="card">
        <p className="card-title">STEP 1 — DATABASE_URL の確認</p>
        <p className="card-body">
          まだ設定していない場合:
        </p>
        <ol className="steps">
          <li>Supabase ダッシュボード → <strong>Settings</strong> → <strong>Database</strong></li>
          <li><strong>Connection String</strong> セクションの <strong>URI</strong> をコピー</li>
          <li>Vercel → プロジェクト → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
          <li><code>DATABASE_URL</code> として貼り付けて保存</li>
          <li>Vercel で <strong>Redeploy</strong></li>
        </ol>
        <button className="check-btn" onClick={checkReady} disabled={checking}>
          {checking ? '確認中…' : '設定を確認する'}
        </button>
        {dbReady === true  && <p className="ok">✅ DATABASE_URL が設定されています</p>}
        {dbReady === false && <p className="ng">❌ DATABASE_URL が未設定です。上の手順で設定してください。</p>}
      </div>

      {/* Step 2: 実行 */}
      <div className="card">
        <p className="card-title">STEP 2 — マイグレーション実行</p>
        <p className="card-body">
          すべてのテーブル作成・カラム追加を実行します。<br />
          何度実行しても安全です（既存データは消えません）。
        </p>
        <button
          className={`run-btn ${status}`}
          onClick={runMigrations}
          disabled={status === 'running' || dbReady === false}
        >
          {status === 'running' ? '実行中…'
            : status === 'done'    ? '✅ 完了（再実行する）'
            : status === 'error'   ? '⚠️ 一部エラー（再実行する）'
            : '▶ マイグレーションを実行'}
        </button>
      </div>

      {/* 結果 */}
      {results.length > 0 && (
        <div className="card results">
          <p className="card-title">実行結果</p>
          {results.map(r => (
            <div key={r.name} className={`result-row ${r.ok ? 'ok' : 'fail'}`}>
              <span className="result-icon">{r.ok ? '✅' : '❌'}</span>
              <span className="result-name">{r.name}</span>
              {!r.ok && r.error && (
                <span className="result-err">{r.error}</span>
              )}
            </div>
          ))}
          {status === 'done' && (
            <p className="done-msg">
              🎉 すべて完了！<br />
              <a href="/journal" className="go-link">アプリに戻る →</a>
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .page {
          max-width: 600px; margin: 0 auto;
          padding: 32px 16px 100px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .title { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
        .sub { margin: 0; font-size: 13px; color: var(--color-muted); line-height: 1.7; }
        .card {
          padding: 18px; border-radius: 14px;
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          display: flex; flex-direction: column; gap: 10px;
        }
        .card-title { font-size: 14px; font-weight: 700; margin: 0; }
        .card-body { font-size: 13px; color: var(--color-text-sub, #4b5563); margin: 0; line-height: 1.6; }
        .steps {
          margin: 0; padding-left: 20px;
          font-size: 13px; color: var(--color-text-sub, #4b5563);
          display: flex; flex-direction: column; gap: 4px; line-height: 1.7;
        }
        code {
          background: var(--color-bg-subtle, #f3f4f6);
          padding: 1px 6px; border-radius: 4px;
          font-size: 12px; font-family: monospace;
        }
        .check-btn {
          padding: 10px 18px; border-radius: 10px;
          border: 1.5px solid var(--color-accent, #7c6af7);
          background: transparent; color: var(--color-accent, #7c6af7);
          font-size: 14px; font-weight: 600; cursor: pointer;
          align-self: flex-start; transition: background .15s;
        }
        .check-btn:disabled { opacity: .5; cursor: default; }
        .check-btn:hover:not(:disabled) { background: #ede9fe; }
        .ok { margin: 0; font-size: 13px; color: #10b981; font-weight: 600; }
        .ng { margin: 0; font-size: 13px; color: #ef4444; font-weight: 600; }
        .run-btn {
          padding: 13px; border-radius: 12px; border: none;
          background: var(--color-accent, #7c6af7); color: #fff;
          font-size: 15px; font-weight: 700; cursor: pointer;
          transition: opacity .15s;
        }
        .run-btn:disabled { opacity: .5; cursor: default; }
        .run-btn.done  { background: #10b981; }
        .run-btn.error { background: #f59e0b; }
        .results { gap: 8px; }
        .result-row {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 6px 10px; border-radius: 8px;
          font-size: 13px;
        }
        .result-row.ok   { background: #f0fdf4; }
        .result-row.fail { background: #fef2f2; }
        .result-icon { flex-shrink: 0; }
        .result-name { font-family: monospace; font-size: 12px; flex: 1; }
        .result-err  { font-size: 11px; color: #ef4444; word-break: break-all; }
        .done-msg {
          margin: 4px 0 0; font-size: 14px;
          text-align: center; line-height: 2;
        }
        .go-link {
          color: var(--color-accent, #7c6af7); font-weight: 700;
          text-decoration: none;
        }
      `}</style>
    </main>
  )
}
