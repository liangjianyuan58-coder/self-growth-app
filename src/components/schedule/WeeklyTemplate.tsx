'use client'
// src/components/schedule/WeeklyTemplate.tsx

import { useEffect, useState } from 'react'
import type { DayAvailability, TimeSlot, WeeklyTemplate } from '@/types'

const DAYS = [
  { label: '月', dow: 1 },
  { label: '火', dow: 2 },
  { label: '水', dow: 3 },
  { label: '木', dow: 4 },
  { label: '金', dow: 5 },
  { label: '土', dow: 6 },
  { label: '日', dow: 0 },
]

const SLOTS: { key: TimeSlot; label: string; sub: string }[] = [
  { key: 'morning',   label: '午前', sub: '〜12時' },
  { key: 'afternoon', label: '午後', sub: '12〜18時' },
  { key: 'evening',   label: '夜',   sub: '18時〜' },
]

function defaultTemplate(): WeeklyTemplate {
  return Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map(d => [String(d), { enabled: false, slots: [] }])
  )
}

export default function WeeklyTemplate() {
  const [template, setTemplate] = useState<WeeklyTemplate>(defaultTemplate())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/schedule/settings')
      .then(r => r.json())
      .then(({ weekly_template }) => {
        if (weekly_template) setTemplate(weekly_template)
      })
  }, [])

  function toggleDay(dow: number) {
    setTemplate(prev => {
      const key = String(dow)
      const cur = prev[key] ?? { enabled: false, slots: [] }
      return { ...prev, [key]: { ...cur, enabled: !cur.enabled, slots: cur.enabled ? [] : cur.slots } }
    })
    setSaved(false)
  }

  function toggleSlot(dow: number, slot: TimeSlot) {
    setTemplate(prev => {
      const key = String(dow)
      const cur: DayAvailability = prev[key] ?? { enabled: true, slots: [] }
      const slots = cur.slots.includes(slot)
        ? cur.slots.filter(s => s !== slot)
        : [...cur.slots, slot]
      return { ...prev, [key]: { ...cur, slots } }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/schedule/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly_template: template }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <section className="card">
      <h2 className="section-title">週間の空き時間</h2>
      <p className="section-desc">繰り返し空いている曜日と時間帯を設定</p>

      <div className="days">
        {DAYS.map(({ label, dow }) => {
          const day = template[String(dow)] ?? { enabled: false, slots: [] }
          const isWeekend = dow === 0 || dow === 6
          return (
            <div key={dow} className={`day-row ${day.enabled ? 'active' : ''} ${isWeekend ? 'weekend' : ''}`}>
              <button
                className={`day-toggle ${day.enabled ? 'on' : 'off'}`}
                onClick={() => toggleDay(dow)}
              >
                {label}
              </button>

              {day.enabled && (
                <div className="slots">
                  {SLOTS.map(({ key, label: slotLabel, sub }) => (
                    <button
                      key={key}
                      className={`slot-btn ${day.slots.includes(key) ? 'on' : 'off'}`}
                      onClick={() => toggleSlot(dow, key)}
                      title={sub}
                    >
                      {slotLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="save-btn" onClick={save} disabled={saving || saved}>
        {saving ? '保存中…' : saved ? '✓ 保存済み' : '保存'}
      </button>

      <style jsx>{`
        .card { background: var(--color-bg-card); border-radius: 14px; padding: 20px; border: 1px solid var(--color-border); }
        .section-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: var(--color-text); }
        .section-desc  { margin: 0 0 16px; font-size: 12px; color: var(--color-muted); }
        .days { display: flex; flex-direction: column; gap: 8px; }
        .day-row { display: flex; align-items: center; gap: 10px; min-height: 38px; }
        .day-toggle {
          width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; transition: all .15s;
          flex-shrink: 0;
        }
        .day-toggle.off { background: var(--color-bg-subtle); color: var(--color-muted); }
        .day-toggle.on  { background: #0d9488; color: #fff; }
        .weekend .day-toggle.off { background: #f0f9ff; color: #93c5fd; }
        @media (prefers-color-scheme: dark) {
          .weekend .day-toggle.off { background: #0c2a3a; color: #38bdf8; }
        }
        .slots { display: flex; gap: 6px; flex-wrap: wrap; }
        .slot-btn {
          padding: 5px 10px; border-radius: 20px; border: 1.5px solid; cursor: pointer;
          font-size: 12px; font-weight: 600; transition: all .15s;
        }
        .slot-btn.off { background: transparent; border-color: var(--color-border); color: var(--color-muted); }
        .slot-btn.on  { background: #ccfbf1; border-color: #0d9488; color: #0d9488; }
        @media (prefers-color-scheme: dark) {
          .slot-btn.on { background: #042f2e; border-color: #2dd4bf; color: #2dd4bf; }
        }
        .save-btn {
          margin-top: 16px; width: 100%; padding: 10px; border-radius: 10px; border: none;
          background: #0d9488; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: opacity .15s;
        }
        .save-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </section>
  )
}
