'use client'
// src/components/goals/GoalList.tsx

import { useEffect, useState } from 'react'
import type { Goal } from '@/types'

type GoalStatus = 'active' | 'done' | 'archived'

export default function GoalList() {
  const [goals, setGoals]         = useState<Goal[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Goal | null>(null)
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [dueDate, setDueDate]     = useState('')
  const [saving, setSaving]       = useState(false)

  async function load() {
    const res  = await fetch('/api/goals')
    const json = await res.json()
    setGoals(json.goals ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null); setTitle(''); setDesc(''); setDueDate('')
    setShowForm(true)
  }

  function openEdit(goal: Goal) {
    setEditing(goal)
    setTitle(goal.title)
    setDesc(goal.description ?? '')
    setDueDate(goal.due_date ?? '')
    setShowForm(true)
  }

  async function submit() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const body = { title, description, due_date: dueDate || null }
      if (editing) {
        await fetch('/api/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...body }),
        })
      } else {
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: GoalStatus) {
    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await load()
  }

  async function remove(id: string) {
    const res = await fetch('/api/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setGoals(prev => prev.filter(g => g.id !== id))
  }

  const active   = goals.filter(g => g.status === 'active')
  const done     = goals.filter(g => g.status === 'done')
  const archived = goals.filter(g => g.status === 'archived')

  if (loading) return <p className="loading">読み込み中…</p>

  return (
    <div className="wrap">
      {!showForm && (
        <button className="add-btn" onClick={openNew}>+ 目標を追加</button>
      )}

      {showForm && (
        <div className="form">
          <input
            className="form-input"
            placeholder="目標のタイトル"
            value={title}
            onChange={e => setTitle(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <textarea
            className="form-textarea"
            placeholder="詳細・メモ（任意）"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={3}
          />
          <label className="form-label">
            期日（任意）
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setShowForm(false)}>キャンセル</button>
            <button
              className="save-btn"
              onClick={submit}
              disabled={!title.trim() || saving}
            >
              {saving ? '保存中…' : editing ? '更新' : '追加'}
            </button>
          </div>
        </div>
      )}

      {active.length === 0 && !showForm && (
        <p className="empty">目標がありません。追加してみましょう！</p>
      )}

      <div className="goal-list">
        {active.map(g => (
          <GoalCard
            key={g.id}
            goal={g}
            onEdit={openEdit}
            onComplete={() => updateStatus(g.id, 'done')}
            onArchive={() => updateStatus(g.id, 'archived')}
            onDelete={remove}
          />
        ))}
      </div>

      {done.length > 0 && (
        <details className="section">
          <summary className="section-label">✅ 達成済み ({done.length})</summary>
          <div className="goal-list muted">
            {done.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={openEdit}
                onComplete={() => updateStatus(g.id, 'active')}
                onArchive={() => updateStatus(g.id, 'archived')}
                onDelete={remove}
                isDone
              />
            ))}
          </div>
        </details>
      )}

      {archived.length > 0 && (
        <details className="section">
          <summary className="section-label">📦 アーカイブ ({archived.length})</summary>
          <div className="goal-list muted">
            {archived.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={openEdit}
                onComplete={() => updateStatus(g.id, 'active')}
                onArchive={() => updateStatus(g.id, 'active')}
                onDelete={remove}
                isArchived
              />
            ))}
          </div>
        </details>
      )}

      <style jsx>{`
        .wrap { display: flex; flex-direction: column; gap: 16px; }
        .loading { text-align: center; color: var(--color-muted); font-size: 14px; padding: 32px 0; }
        .add-btn {
          align-self: flex-start;
          padding: 10px 18px;
          border-radius: 10px;
          border: 1.5px dashed var(--color-accent, #7c6af7);
          background: transparent;
          color: var(--color-accent, #7c6af7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s;
        }
        .add-btn:hover { background: #ede9fe; }
        .form {
          display: flex; flex-direction: column; gap: 10px;
          padding: 16px;
          background: var(--color-bg-subtle, #f9fafb);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
        }
        .form-input, .form-textarea {
          width: 100%; padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-bg-card, #fff);
          font-size: 15px; color: var(--color-text, #1a1a1a);
          font-family: inherit; resize: vertical; box-sizing: border-box;
        }
        .form-input:focus, .form-textarea:focus {
          outline: none; border-color: var(--color-accent, #7c6af7);
        }
        .form-label {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 12px; color: var(--color-muted, #9ca3af);
        }
        .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .cancel-btn {
          padding: 8px 14px; border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: transparent; font-size: 13px; cursor: pointer;
          color: var(--color-muted, #9ca3af);
        }
        .save-btn {
          padding: 8px 18px; border-radius: 8px; border: none;
          background: var(--color-accent, #7c6af7); color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .save-btn:disabled { opacity: .4; cursor: default; }
        .goal-list { display: flex; flex-direction: column; gap: 8px; }
        .goal-list.muted { opacity: .7; }
        .empty { text-align: center; color: var(--color-muted); font-size: 14px; padding: 24px 0; }
        .section { margin-top: 4px; }
        .section-label {
          font-size: 13px; font-weight: 600;
          color: var(--color-muted, #9ca3af);
          cursor: pointer; padding: 6px 0;
          list-style: none; user-select: none;
        }
        .section-label::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  )
}

function GoalCard({
  goal, onEdit, onComplete, onArchive, onDelete, isDone, isArchived,
}: {
  goal: Goal
  onEdit: (g: Goal) => void
  onComplete: () => void
  onArchive: () => void
  onDelete: (id: string) => void
  isDone?: boolean
  isArchived?: boolean
}) {
  const today    = new Date().toISOString().slice(0, 10)
  const isOverdue = !isDone && !isArchived && !!goal.due_date && goal.due_date < today

  return (
    <div className={`card ${isDone ? 'done' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <div className="top">
        <div className="info">
          <span className="card-title">{goal.title}</span>
          {goal.due_date && (
            <span className={`due ${isOverdue ? 'late' : ''}`}>
              {isOverdue ? '⚠️ ' : '📅 '}{goal.due_date}
            </span>
          )}
        </div>
        <div className="actions">
          {!isDone && !isArchived && (
            <button className="act done-act" onClick={onComplete} title="達成にする">✓</button>
          )}
          {(isDone || isArchived) && (
            <button className="act" onClick={onComplete} title="進行中に戻す">↩</button>
          )}
          {!isDone && !isArchived && (
            <>
              <button className="act" onClick={() => onEdit(goal)} title="編集">✏️</button>
              <button className="act" onClick={onArchive} title="アーカイブ">📦</button>
            </>
          )}
          <button className="act del-act" onClick={() => onDelete(goal.id)} title="削除">✕</button>
        </div>
      </div>
      {goal.description && <p className="desc">{goal.description}</p>}

      <style jsx>{`
        .card {
          padding: 14px;
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
          transition: border-color .15s;
        }
        .card.done    { border-color: #10b981; }
        .card.overdue { border-color: #ef4444; }
        .top { display: flex; align-items: flex-start; gap: 10px; }
        .info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .card-title { font-size: 15px; font-weight: 600; color: var(--color-text, #1a1a1a); line-height: 1.4; }
        .done .card-title { text-decoration: line-through; color: var(--color-muted); }
        .due { font-size: 11px; color: var(--color-muted, #9ca3af); }
        .due.late { color: #ef4444; font-weight: 600; }
        .actions { display: flex; gap: 4px; flex-shrink: 0; }
        .act {
          background: none; border: none; cursor: pointer;
          font-size: 14px; padding: 4px 6px; border-radius: 6px;
          color: var(--color-muted, #9ca3af);
          transition: background .15s, color .15s;
        }
        .act:hover { background: var(--color-bg-subtle, #f9fafb); color: var(--color-text, #1a1a1a); }
        .done-act { color: #10b981; }
        .del-act:hover { color: #ef4444; }
        .desc { margin: 8px 0 0; font-size: 13px; color: var(--color-text-sub, #4b5563); line-height: 1.5; }
      `}</style>
    </div>
  )
}
