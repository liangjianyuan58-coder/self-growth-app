'use client'
// src/components/schedule/BlockedDates.tsx

import { useEffect, useState } from 'react'
import { ScheduleBlock } from '@/types'

const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatLabel(iso: string): string {
  // YYYY-MM-DD → M月D日(X)
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日(${JP_DAYS[d.getDay()]})`
}

export default function BlockedDates() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [inputDate, setInputDate] = useState('')
  const [adding, setAdding] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  async function load() {
    const res = await fetch('/api/schedule/blocks')
    const { blocks: data } = await res.json()
    setBlocks(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!inputDate || inputDate < today) return
    setAdding(true)
    await fetch('/api/schedule/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: inputDate }),
    })
    setInputDate('')
    await load()
    setAdding(false)
  }

  async function remove(id: string) {
    await fetch('/api/schedule/blocks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <section className="card">
      <h2 className="section-title">予定あり・ブロック日</h2>
      <p className="section-desc">この日は候補から除外される</p>

      {blocks.length === 0 ? (
        <p className="empty">設定なし</p>
      ) : (
        <div className="list">
          {blocks.map(b => (
            <div key={b.id} className="block-item">
              <span className="block-label">{formatLabel(b.blocked_date)}</span>
              <button className="remove-btn" onClick={() => remove(b.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="add-row">
        <input
          type="date"
          className="date-input"
          min={today}
          value={inputDate}
          onChange={e => setInputDate(e.target.value)}
        />
        <button
          className="add-btn"
          onClick={add}
          disabled={!inputDate || adding}
        >
          {adding ? '追加中…' : '+ 追加'}
        </button>
      </div>

      <style jsx>{`
        .card { background: var(--color-bg-card); border-radius: 14px; padding: 20px; border: 1px solid var(--color-border); }
        .section-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; }
        .section-desc  { margin: 0 0 14px; font-size: 12px; color: var(--color-muted); }
        .empty { font-size: 13px; color: var(--color-muted); margin: 0 0 12px; }
        .list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .block-item {
          display: flex; align-items: center; gap: 6px;
          background: #fef2f2; border: 1px solid #fca5a5; border-radius: 20px;
          padding: 5px 10px 5px 12px;
        }
        @media (prefers-color-scheme: dark) {
          .block-item { background: #2d0a0a; border-color: #dc2626; }
        }
        .block-label { font-size: 13px; font-weight: 600; color: #dc2626; }
        @media (prefers-color-scheme: dark) { .block-label { color: #f87171; } }
        .remove-btn {
          background: none; border: none; cursor: pointer; font-size: 11px;
          color: #dc2626; padding: 0; line-height: 1;
        }
        .add-row { display: flex; gap: 8px; align-items: center; }
        .date-input {
          flex: 1; padding: 9px 12px; border-radius: 10px;
          border: 1.5px solid var(--color-border); background: var(--color-bg-subtle);
          color: var(--color-text); font-size: 14px;
        }
        .date-input:focus { outline: none; border-color: #0d9488; }
        .add-btn {
          padding: 9px 16px; border-radius: 10px; border: none;
          background: #0d9488; color: #fff; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap; transition: opacity .15s;
        }
        .add-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </section>
  )
}
