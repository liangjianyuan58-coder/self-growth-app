'use client'
// src/components/schedule/WeeklyTemplate.tsx

import { useEffect, useState } from 'react'
import type { TimeRange, WeeklyTemplate } from '@/types'

const DAYS = [
  { label: '月', dow: 1 },
  { label: '火', dow: 2 },
  { label: '水', dow: 3 },
  { label: '木', dow: 4 },
  { label: '金', dow: 5 },
  { label: '土', dow: 6 },
  { label: '日', dow: 0 },
]

type LocalTemplate = Record<string, { enabled: boolean; ranges: TimeRange[] }>

const SLOT_MAP: Record<string, TimeRange> = {
  morning:   { from: '09:00', to: '12:00' },
  afternoon: { from: '13:00', to: '18:00' },
  evening:   { from: '19:00', to: '22:00' },
}

function normalize(raw: Record<string, unknown>): { enabled: boolean; ranges: TimeRange[] } {
  if (Array.isArray(raw.ranges)) return { enabled: Boolean(raw.enabled), ranges: raw.ranges as TimeRange[] }
  const slots = (raw.slots as string[] | undefined) ?? []
  return { enabled: Boolean(raw.enabled), ranges: slots.map(s => SLOT_MAP[s]).filter(Boolean) }
}

function defaultTemplate(): LocalTemplate {
  return Object.fromEntries([0,1,2,3,4,5,6].map(d => [String(d), { enabled: false, ranges: [] }]))
}

export default function WeeklyTemplate() {
  const [tmpl, setTmpl] = useState<LocalTemplate>(defaultTemplate())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/schedule/settings')
      .then(r => r.json())
      .then(({ weekly_template }) => {
        if (!weekly_template) return
        const normalized = Object.fromEntries(
          Object.entries(weekly_template).map(([k, v]) => [k, normalize(v as Record<string, unknown>)])
        )
        setTmpl(normalized)
      })
  }, [])

  function toggleDay(dow: number) {
    setTmpl(prev => {
      const k = String(dow)
      const cur = prev[k] ?? { enabled: false, ranges: [] }
      return { ...prev, [k]: { ...cur, enabled: !cur.enabled } }
    })
    setSaved(false)
  }

  function addRange(dow: number) {
    setTmpl(prev => {
      const k = String(dow)
      const cur = prev[k] ?? { enabled: true, ranges: [] }
      return { ...prev, [k]: { ...cur, ranges: [...cur.ranges, { from: '09:00', to: '18:00' }] } }
    })
    setSaved(false)
  }

  function updateRange(dow: number, idx: number, field: 'from' | 'to', val: string) {
    setTmpl(prev => {
      const k = String(dow)
      const ranges = [...(prev[k]?.ranges ?? [])]
      ranges[idx] = { ...ranges[idx], [field]: val }
      return { ...prev, [k]: { ...prev[k], ranges } }
    })
    setSaved(false)
  }

  function removeRange(dow: number, idx: number) {
    setTmpl(prev => {
      const k = String(dow)
      const ranges = (prev[k]?.ranges ?? []).filter((_, i) => i !== idx)
      return { ...prev, [k]: { ...prev[k], ranges } }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/schedule/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly_template: tmpl }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <section className="card">
      <h2 className="section-title">週間の空き時間</h2>
      <p className="section-desc">曜日ごとに開始・終了時刻を分単位で設定</p>

      <div className="days">
        {DAYS.map(({ label, dow }) => {
          const day = tmpl[String(dow)] ?? { enabled: false, ranges: [] }
          const isWeekend = dow === 0 || dow === 6
          return (
            <div key={dow} className={`day-block ${isWeekend ? 'weekend' : ''}`}>
              <div className="day-header">
                <button
                  className={`day-toggle ${day.enabled ? 'on' : 'off'}`}
                  onClick={() => toggleDay(dow)}
                >
                  {label}
                </button>
                {day.enabled && (
                  <button className="add-range" onClick={() => addRange(dow)}>
                    + 時間帯を追加
                  </button>
                )}
              </div>

              {day.enabled && (
                <div className="ranges">
                  {day.ranges.length === 0 && (
                    <p className="no-range">「時間帯を追加」で時刻を設定</p>
                  )}
                  {day.ranges.map((r, i) => (
                    <div key={i} className="range-row">
                      <input
                        type="time"
                        className="time-input"
                        value={r.from}
                        onChange={e => updateRange(dow, i, 'from', e.target.value)}
                      />
                      <span className="range-sep">〜</span>
                      <input
                        type="time"
                        className="time-input"
                        value={r.to}
                        onChange={e => updateRange(dow, i, 'to', e.target.value)}
                      />
                      <button className="del-range" onClick={() => removeRange(dow, i)}>✕</button>
                    </div>
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
        .section-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; }
        .section-desc  { margin: 0 0 16px; font-size: 12px; color: var(--color-muted); }
        .days { display: flex; flex-direction: column; gap: 10px; }
        .day-block { border-radius: 10px; overflow: hidden; border: 1px solid var(--color-border); }
        .day-header {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; background: var(--color-bg-subtle);
        }
        .day-toggle {
          width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; flex-shrink: 0; transition: all .15s;
        }
        .day-toggle.off { background: var(--color-bg-card); color: var(--color-muted); border: 1.5px solid var(--color-border); }
        .day-toggle.on  { background: #0d9488; color: #fff; border: none; }
        .weekend .day-toggle.off { color: #60a5fa; border-color: #60a5fa; }
        .add-range {
          font-size: 12px; color: #0d9488; background: none; border: none; cursor: pointer;
          font-weight: 600; padding: 4px 8px; border-radius: 6px;
        }
        .add-range:active { background: #ccfbf1; }
        .ranges { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
        .no-range { margin: 0; font-size: 12px; color: var(--color-muted); }
        .range-row { display: flex; align-items: center; gap: 6px; }
        .time-input {
          flex: 1; padding: 7px 8px; border-radius: 8px; border: 1.5px solid var(--color-border);
          background: var(--color-bg); color: var(--color-text); font-size: 14px;
          min-width: 0;
        }
        .time-input:focus { outline: none; border-color: #0d9488; }
        .range-sep { font-size: 13px; color: var(--color-muted); flex-shrink: 0; }
        .del-range {
          background: none; border: none; cursor: pointer; color: var(--color-muted);
          font-size: 13px; padding: 4px; flex-shrink: 0;
        }
        .del-range:hover { color: #ef4444; }
        .save-btn {
          margin-top: 16px; width: 100%; padding: 11px; border-radius: 10px; border: none;
          background: #0d9488; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: opacity .15s;
        }
        .save-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </section>
  )
}
