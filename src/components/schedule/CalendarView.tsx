'use client'
// src/components/schedule/CalendarView.tsx

import { useCallback, useEffect, useState } from 'react'
import type { ScheduleEvent } from '@/types'

const JP_SHORT = ['月', '火', '水', '木', '金', '土', '日']
const JP_DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

function toISO(d: Date) {
  // toISOString() は UTC を返すためタイムゾーンずれが生じる → ローカル日付パーツを使用
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日(${JP_DAY_NAMES[d.getDay()]})`
}

function hhmm(t: string | null) { return t ? t.slice(0, 5) : '' }

// 月グリッド生成（月〜日順）
function getGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let startDow = first.getDay() // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1 // Mon=0

  const days: Date[] = []
  for (let i = startDow; i > 0; i--) {
    const d = new Date(first); d.setDate(d.getDate() - i); days.push(d)
  }
  for (let n = 1; n <= last.getDate(); n++) days.push(new Date(year, month, n))
  while (days.length % 7 !== 0) {
    const prev = days[days.length - 1]
    const d = new Date(prev); d.setDate(d.getDate() + 1); days.push(d)
  }
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

interface Props {
  refreshKey: number
  onAdd: (date: string) => void
  onEdit: (ev: ScheduleEvent) => void
}

export default function CalendarView({ refreshKey, onAdd, onEdit }: Props) {
  const now = new Date()
  const todayISO = toISO(now)

  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selected, setSelected] = useState<string | null>(todayISO)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)

  const load = useCallback(async (y: number, m: number) => {
    const ym = `${y}-${String(m + 1).padStart(2, '0')}`
    const res = await fetch(`/api/schedule/events?month=${ym}`)
    const { events: data } = await res.json()
    setEvents(data ?? [])
  }, [])

  useEffect(() => { load(year, month) }, [year, month, refreshKey, load])

  useEffect(() => {
    fetch('/api/schedule/sync/google')
      .then(r => r.json())
      .then(({ connected }) => setGoogleConnected(connected))
  }, [])

  async function syncFromGoogle() {
    setSyncing(true)
    setSyncMsg(null)
    const month_str = `${year}-${String(month + 1).padStart(2, '0')}`
    const res = await fetch('/api/schedule/sync/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: month_str }),
    })
    const { created, updated, error } = await res.json()
    if (error) {
      setSyncMsg('同期失敗')
    } else {
      setSyncMsg(`+${created} 件追加、${updated} 件更新`)
      await load(year, month)
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 3000)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const byDate = events.reduce<Record<string, ScheduleEvent[]>>((acc, e) => {
    acc[e.event_date] = [...(acc[e.event_date] ?? []), e]
    return acc
  }, {})

  const weeks = getGrid(year, month)
  const selEvents = selected ? (byDate[selected] ?? []) : []

  return (
    <div className="wrap">
      {/* ナビ */}
      <div className="nav">
        <div className="nav-left">
          <button className="nav-btn" onClick={prevMonth}>‹</button>
          <span className="nav-title">{year}年{month + 1}月</span>
          <button className="nav-btn" onClick={nextMonth}>›</button>
        </div>
        {googleConnected && (
          <div className="sync-area">
            {syncMsg && <span className="sync-msg">{syncMsg}</span>}
            <button className="sync-btn" onClick={syncFromGoogle} disabled={syncing}>
              {syncing ? '同期中…' : '🔄 Google'}
            </button>
          </div>
        )}
      </div>

      {/* 曜日ヘッダー */}
      <div className="header-row">
        {JP_SHORT.map((d, i) => (
          <div key={d} className={`hcell ${i === 5 ? 'sat' : i === 6 ? 'sun' : ''}`}>{d}</div>
        ))}
      </div>

      {/* グリッド */}
      <div className="grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="week">
            {week.map((date, di) => {
              const iso = toISO(date)
              const inMonth = date.getMonth() === month
              const isToday = iso === todayISO
              const isSel = iso === selected
              const count = byDate[iso]?.length ?? 0
              const dow = date.getDay() // 0=Sun
              return (
                <button
                  key={di}
                  className={`dcell ${!inMonth ? 'out' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''} ${dow === 6 ? 'sat' : dow === 0 ? 'sun' : ''}`}
                  onClick={() => setSelected(iso === selected ? null : iso)}
                >
                  <span className="dnum">{date.getDate()}</span>
                  {count > 0 && (
                    <div className="dots">
                      {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                        <span key={k} className="dot" />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* 選択日の詳細 */}
      {selected && (
        <div className="detail">
          <div className="detail-head">
            <span className="detail-title">{formatLabel(selected)}</span>
            <button className="add-btn" onClick={() => onAdd(selected)}>+ 追加</button>
          </div>
          {selEvents.length === 0 ? (
            <p className="no-ev">予定なし</p>
          ) : (
            <div className="ev-list">
              {[...selEvents].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')).map(ev => (
                <button key={ev.id} className="ev-item" onClick={() => onEdit(ev)}>
                  <span className="ev-time">
                    {ev.start_time ? hhmm(ev.start_time) : '終日'}
                    {ev.end_time ? `〜${hhmm(ev.end_time)}` : ''}
                  </span>
                  <span className="ev-title">{ev.title}</span>
                  {ev.note && <span className="ev-note">{ev.note}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .wrap { background: var(--color-bg-card); border-radius: 14px; border: 1px solid var(--color-border); overflow: hidden; }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; gap: 8px; }
        .nav-left { display: flex; align-items: center; }
        .nav-title { font-size: 16px; font-weight: 800; }
        .nav-btn { background: none; border: none; cursor: pointer; font-size: 22px; color: var(--color-text-sub); padding: 0 6px; line-height: 1; }
        .sync-area { display: flex; align-items: center; gap: 6px; }
        .sync-btn {
          padding: 5px 10px; border-radius: 8px; border: 1.5px solid var(--color-border);
          background: transparent; color: var(--color-text-sub); font-size: 12px; cursor: pointer;
        }
        .sync-btn:disabled { opacity: .5; cursor: default; }
        .sync-msg { font-size: 11px; color: #0d9488; font-weight: 600; }
        .header-row { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 8px; }
        .hcell { text-align: center; font-size: 11px; font-weight: 700; color: var(--color-muted); padding: 4px 0 6px; }
        .hcell.sat { color: #60a5fa; }
        .hcell.sun { color: #f87171; }
        .grid { padding: 0 8px 8px; display: flex; flex-direction: column; gap: 2px; }
        .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dcell {
          aspect-ratio: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 2px; border-radius: 8px; border: none; cursor: pointer;
          background: transparent; transition: background .1s;
        }
        .dcell:active { background: var(--color-bg-subtle); }
        .dcell.out .dnum { color: var(--color-border); }
        .dcell.today .dnum {
          background: var(--color-accent); color: #fff; border-radius: 50%;
          width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
        }
        .dcell.sel { background: #ccfbf1; }
        @media (prefers-color-scheme: dark) { .dcell.sel { background: #042f2e; } }
        .dcell.sat .dnum { color: #60a5fa; }
        .dcell.sun .dnum { color: #f87171; }
        .dcell.today.sat .dnum, .dcell.today.sun .dnum { color: #fff; }
        .dnum { font-size: 13px; font-weight: 600; }
        .dots { display: flex; gap: 2px; }
        .dot { width: 4px; height: 4px; border-radius: 50%; background: #0d9488; }
        /* detail */
        .detail { border-top: 1px solid var(--color-border); padding: 14px 16px; }
        .detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .detail-title { font-size: 14px; font-weight: 700; }
        .add-btn {
          padding: 5px 12px; border-radius: 8px; border: 1.5px solid #0d9488;
          background: transparent; color: #0d9488; font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .no-ev { margin: 0; font-size: 13px; color: var(--color-muted); }
        .ev-list { display: flex; flex-direction: column; gap: 6px; }
        .ev-item {
          display: flex; align-items: baseline; gap: 8px; padding: 9px 12px;
          background: var(--color-bg-subtle); border-radius: 10px; border: none; cursor: pointer;
          text-align: left; width: 100%;
        }
        .ev-time { font-size: 12px; font-weight: 700; color: #0d9488; flex-shrink: 0; }
        .ev-title { font-size: 14px; font-weight: 600; color: var(--color-text); flex: 1; }
        .ev-note { font-size: 11px; color: var(--color-muted); }
      `}</style>
    </div>
  )
}
