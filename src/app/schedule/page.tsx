'use client'
// src/app/schedule/page.tsx

import { useState } from 'react'
import CalendarView from '@/components/schedule/CalendarView'
import CandidateGenerator from '@/components/schedule/CandidateGenerator'
import WeeklyTemplate from '@/components/schedule/WeeklyTemplate'
import BlockedDates from '@/components/schedule/BlockedDates'
import EventModal from '@/components/schedule/EventModal'
import type { ScheduleEvent } from '@/types'

type Tab = 'calendar' | 'settings'

export default function SchedulePage() {
  const [tab, setTab]           = useState<Tab>('calendar')
  const [modalOpen, setModal]   = useState(false)
  const [editing, setEditing]   = useState<ScheduleEvent | null>(null)
  const [addDate, setAddDate]   = useState<string | undefined>()
  const [calKey, setCalKey]     = useState(0)

  function openAdd(date: string) {
    setEditing(null)
    setAddDate(date)
    setModal(true)
  }

  function openEdit(ev: ScheduleEvent) {
    setEditing(ev)
    setAddDate(undefined)
    setModal(true)
  }

  function onSaved() {
    setModal(false)
    setCalKey(k => k + 1)
  }

  return (
    <main className="shell">
      <header className="header">
        <h1 className="title">📅 調整</h1>
        <p className="subtitle">スケジュール管理・候補日生成</p>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          カレンダー
        </button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          空き時間設定
        </button>
      </div>

      {tab === 'calendar' && (
        <div className="stack">
          <CalendarView refreshKey={calKey} onAdd={openAdd} onEdit={openEdit} />
          <CandidateGenerator />
        </div>
      )}

      {tab === 'settings' && (
        <div className="stack">
          <WeeklyTemplate />
          <BlockedDates />
        </div>
      )}

      {modalOpen && (
        <EventModal
          event={editing}
          defaultDate={addDate}
          onSave={onSaved}
          onClose={() => setModal(false)}
        />
      )}

      <style jsx>{`
        .shell { max-width: 680px; margin: 0 auto; padding: 20px 16px 100px; }
        .header { margin-bottom: 16px; }
        .title    { margin: 0 0 3px; font-size: 22px; font-weight: 800; }
        .subtitle { margin: 0; font-size: 12px; color: var(--color-muted); }
        .tabs {
          display: flex; gap: 0; border-radius: 12px; overflow: hidden;
          border: 1.5px solid var(--color-border); margin-bottom: 16px;
        }
        .tab {
          flex: 1; padding: 10px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; background: var(--color-bg-subtle);
          color: var(--color-muted); transition: all .15s;
        }
        .tab.active { background: #0d9488; color: #fff; }
        .stack { display: flex; flex-direction: column; gap: 14px; }
      `}</style>
    </main>
  )
}
