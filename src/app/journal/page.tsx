'use client'
// src/app/journal/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import JournalInput  from '@/components/journal/JournalInput'
import JournalFeed   from '@/components/journal/JournalFeed'
import MoneyDashboard from '@/components/journal/MoneyDashboard'

export default function JournalPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <main className="page">
      <header className="page-header">
        <div className="title-row">
          <div>
            <h1 className="page-title">今日のログ</h1>
            <p className="page-sub">書いたら自動で分類されます</p>
          </div>
          <Link href="/setup" className="setup-link" title="セットアップ">⚙️</Link>
        </div>
      </header>

      <section className="money-section">
        <MoneyDashboard refreshKey={refreshKey} />
      </section>

      <section className="input-section">
        <JournalInput onSaved={() => setRefreshKey(k => k + 1)} />
      </section>

      <section className="feed-section">
        <h2 className="feed-heading">最近のログ</h2>
        <JournalFeed refreshKey={refreshKey} />
      </section>

      <style jsx>{`
        .page {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 80px;
        }
        .page-header { margin-bottom: 24px; }
        .title-row {
          display: flex; align-items: flex-start; justify-content: space-between;
        }
        .page-title {
          font-size: 22px;
          font-weight: 600;
          color: var(--color-text, #1a1a1a);
          margin: 0 0 4px;
        }
        .page-sub {
          font-size: 13px;
          color: var(--color-muted, #9ca3af);
          margin: 0;
        }
        .setup-link {
          font-size: 22px; text-decoration: none; padding: 4px;
          opacity: .5; transition: opacity .15s;
        }
        .setup-link:hover { opacity: 1; }
        .money-section { margin-bottom: 16px; }
        .input-section { margin-bottom: 32px; }
        .feed-heading {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted, #9ca3af);
          text-transform: uppercase;
          letter-spacing: .06em;
          margin: 0 0 12px;
        }
      `}</style>
    </main>
  )
}
