'use client'
// src/components/schedule/EventModal.tsx

import { useState } from 'react'
import type { ScheduleEvent } from '@/types'

interface Props {
  event: ScheduleEvent | null    // null = 新規追加
  defaultDate?: string
  defaultStartTime?: string
  defaultEndTime?: string
  onSave: () => void
  onClose: () => void
}

function hhmm(t: string | null | undefined) { return t ? t.slice(0, 5) : '' }

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

export default function EventModal({ event, defaultDate, defaultStartTime, defaultEndTime, onSave, onClose }: Props) {
  const [title,      setTitle]      = useState(event?.title ?? '')
  const [date,       setDate]       = useState(event?.event_date ?? defaultDate ?? '')
  const [startTime,  setStartTime]  = useState(hhmm(event?.start_time) || defaultStartTime || '')
  const [endTime,    setEndTime]    = useState(hhmm(event?.end_time)   || defaultEndTime   || '')
  const [note,       setNote]       = useState(event?.note ?? '')
  const [repeatType, setRepeatType] = useState<'' | 'weekly' | 'monthly'>('')
  const [repeatCount, setRepeatCount] = useState(4)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const isNew = !event

  function buildDates(): string[] {
    if (!isNew || !repeatType || repeatCount <= 1) return [date]
    const dates = [date]
    for (let i = 1; i < repeatCount; i++) {
      dates.push(repeatType === 'weekly' ? addWeeks(date, i) : addMonths(date, i))
    }
    return dates
  }

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true)
    const body = {
      title:      title.trim(),
      start_time: startTime || null,
      end_time:   endTime   || null,
      note:       note.trim() || null,
    }

    if (!isNew) {
      // 編集時は1件だけ更新
      await fetch('/api/schedule/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, date, ...body }),
      })
    } else {
      // 新規（繰り返し含む）
      for (const dt of buildDates()) {
        await fetch('/api/schedule/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dt, ...body }),
        })
      }
    }
    setSaving(false)
    onSave()
  }

  async function del() {
    if (!event) return
    setDeleting(true)
    await fetch('/api/schedule/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id }),
    })
    setDeleting(false)
    onSave()
  }

  const repeatLabel = repeatType === 'weekly'
    ? `毎週 × ${repeatCount}回（${repeatCount}週間）`
    : repeatType === 'monthly'
    ? `毎月 × ${repeatCount}回（${repeatCount}ヶ月）`
    : ''

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">{event ? '予定を編集' : '予定を追加'}</span>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <div className="fields">
          <label className="field">
            <span className="label">タイトル *</span>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: ミーティング、飲み会"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="label">日付 *</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </label>

          <div className="field">
            <span className="label">時間</span>
            <div className="time-row">
              <input
                type="time"
                className="input time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              <span className="sep">〜</span>
              <input
                type="time"
                className="input time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <label className="field">
            <span className="label">メモ</span>
            <textarea
              className="input textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="任意"
              rows={2}
            />
          </label>

          {/* 繰り返し（新規のみ） */}
          {isNew && (
            <div className="field">
              <span className="label">繰り返し</span>
              <div className="repeat-row">
                <select
                  className="input select"
                  value={repeatType}
                  onChange={e => setRepeatType(e.target.value as '' | 'weekly' | 'monthly')}
                >
                  <option value="">繰り返しなし</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
                {repeatType && (
                  <select
                    className="input select"
                    value={repeatCount}
                    onChange={e => setRepeatCount(Number(e.target.value))}
                  >
                    {[2,3,4,6,8,12].map(n => (
                      <option key={n} value={n}>{n}回</option>
                    ))}
                  </select>
                )}
              </div>
              {repeatLabel && (
                <span className="repeat-hint">{repeatLabel}</span>
              )}
            </div>
          )}
        </div>

        <div className="actions">
          {event && (
            <button className="del-btn" onClick={del} disabled={deleting}>
              {deleting ? '削除中…' : '削除'}
            </button>
          )}
          <button
            className="save-btn"
            onClick={save}
            disabled={!title.trim() || !date || saving}
          >
            {saving ? '保存中…' : isNew && repeatType && repeatCount > 1 ? `${repeatCount}件を登録` : '保存'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 200;
          display: flex; align-items: flex-end;
        }
        .modal {
          width: 100%; max-width: 680px; margin: 0 auto;
          background: var(--color-bg-card); border-radius: 20px 20px 0 0;
          padding: 20px 20px max(20px, env(safe-area-inset-bottom));
          max-height: 90vh; overflow-y: auto;
        }
        .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .modal-title { font-size: 16px; font-weight: 800; }
        .close { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--color-muted); padding: 4px; }
        .fields { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .label { font-size: 12px; font-weight: 700; color: var(--color-muted); }
        .input {
          padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--color-border);
          background: var(--color-bg-subtle); color: var(--color-text); font-size: 15px;
          font-family: inherit; width: 100%; box-sizing: border-box;
        }
        .input:focus { outline: none; border-color: #0d9488; }
        .input.textarea { resize: none; }
        .time-row { display: flex; align-items: center; gap: 8px; }
        .input.time { flex: 1; min-width: 0; }
        .sep { font-size: 14px; color: var(--color-muted); flex-shrink: 0; }
        .input.select { appearance: auto; padding-right: 8px; }
        .repeat-row { display: flex; gap: 8px; }
        .repeat-row .input.select { flex: 1; }
        .repeat-hint { font-size: 11px; color: #0d9488; font-weight: 600; }
        .actions { margin-top: 20px; display: flex; gap: 10px; }
        .save-btn {
          flex: 1; padding: 12px; border-radius: 12px; border: none;
          background: #0d9488; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
          transition: opacity .15s;
        }
        .save-btn:disabled { opacity: .5; cursor: default; }
        .del-btn {
          padding: 12px 20px; border-radius: 12px; border: 1.5px solid #ef4444;
          background: transparent; color: #ef4444; font-size: 14px; font-weight: 700; cursor: pointer;
        }
        .del-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  )
}
