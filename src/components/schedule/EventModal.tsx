'use client'
// src/components/schedule/EventModal.tsx

import { useState } from 'react'
import type { ScheduleEvent } from '@/types'

interface Props {
  event: ScheduleEvent | null    // null = 新規追加
  defaultDate?: string           // 新規時のデフォルト日付
  onSave: () => void
  onClose: () => void
}

function hhmm(t: string | null | undefined) { return t ? t.slice(0, 5) : '' }

export default function EventModal({ event, defaultDate, onSave, onClose }: Props) {
  const [title,     setTitle]     = useState(event?.title ?? '')
  const [date,      setDate]      = useState(event?.event_date ?? defaultDate ?? '')
  const [startTime, setStartTime] = useState(hhmm(event?.start_time))
  const [endTime,   setEndTime]   = useState(hhmm(event?.end_time))
  const [note,      setNote]      = useState(event?.note ?? '')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true)
    const body = {
      title: title.trim(),
      date,
      start_time: startTime || null,
      end_time:   endTime   || null,
      note:       note.trim() || null,
    }
    await fetch('/api/schedule/events', {
      method: event ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event ? { id: event.id, ...body } : body),
    })
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
            {saving ? '保存中…' : '保存'}
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
          font-family: inherit; width: 100%;
        }
        .input:focus { outline: none; border-color: #0d9488; }
        .input.textarea { resize: none; }
        .time-row { display: flex; align-items: center; gap: 8px; }
        .input.time { flex: 1; min-width: 0; }
        .sep { font-size: 14px; color: var(--color-muted); flex-shrink: 0; }
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
