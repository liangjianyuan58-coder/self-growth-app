'use client'
// src/app/tasks/page.tsx

import TaskList from '@/components/tasks/TaskList'

export default function TasksPage() {
  return (
    <main className="shell">
      <header className="header">
        <h1 className="title">✅ タスク</h1>
        <p className="subtitle">やることとできたかのチェック</p>
      </header>

      <TaskList />

      <style jsx>{`
        .shell { max-width: 680px; margin: 0 auto; padding: 20px 16px 100px; }
        .header { margin-bottom: 20px; }
        .title    { margin: 0 0 3px; font-size: 22px; font-weight: 800; }
        .subtitle { margin: 0; font-size: 12px; color: var(--color-muted); }
      `}</style>
    </main>
  )
}
