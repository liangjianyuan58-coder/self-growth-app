'use client'
// src/app/schedule/page.tsx

import WeeklyTemplate from '@/components/schedule/WeeklyTemplate'
import BlockedDates from '@/components/schedule/BlockedDates'
import CandidateGenerator from '@/components/schedule/CandidateGenerator'
import { useState } from 'react'

export default function SchedulePage() {
  const [genKey, setGenKey] = useState(0)

  return (
    <main className="shell">
      <header className="header">
        <h1 className="title">📅 調整</h1>
        <p className="subtitle">人と時間を取りやすくする</p>
      </header>

      <div className="stack">
        <WeeklyTemplate />
        <BlockedDates />
        <CandidateGenerator onGenerate={() => setGenKey(k => k + 1)} />
      </div>

      <style jsx>{`
        .shell {
          max-width: 680px;
          margin: 0 auto;
          padding: 20px 16px 90px;
        }
        .header { margin-bottom: 20px; }
        .title  { margin: 0 0 4px; font-size: 22px; font-weight: 800; }
        .subtitle { margin: 0; font-size: 13px; color: var(--color-muted); }
        .stack { display: flex; flex-direction: column; gap: 14px; }
      `}</style>
    </main>
  )
}
