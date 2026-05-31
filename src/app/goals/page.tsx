'use client'
// src/app/goals/page.tsx

import GoalList from '@/components/goals/GoalList'

export default function GoalsPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">目標</h1>
        <p className="page-sub">やりたいこと・なりたい姿を記録しよう</p>
      </header>

      <GoalList />

      <style jsx>{`
        .page {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 80px;
        }
        .page-header { margin-bottom: 24px; }
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
      `}</style>
    </main>
  )
}
