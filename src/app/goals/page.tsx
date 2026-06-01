'use client'
// src/app/goals/page.tsx

import GoalTree from '@/components/goals/GoalTree'

export default function GoalsPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">目標</h1>
        <p className="page-sub">大きな目標を立てて、年間・月間・週間・日次に細分化しよう</p>
      </header>

      <GoalTree />

      <style jsx>{`
        .page {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 100px;
        }
        .page-header { margin-bottom: 20px; }
        .page-title {
          font-size: 22px;
          font-weight: 700;
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
