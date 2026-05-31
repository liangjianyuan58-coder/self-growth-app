'use client'
// src/components/tasks/TaskList.tsx

import { useEffect, useRef, useState } from 'react'
import type { Task } from '@/types'

export default function TaskList() {
  const [tasks, setTasks]       = useState<Task[]>([])
  const [input, setInput]       = useState('')
  const [adding, setAdding]     = useState(false)
  const [showDone, setShowDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch('/api/tasks')
    const { tasks: data } = await res.json()
    setTasks(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!input.trim()) return
    setAdding(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.trim() }),
    })
    setInput('')
    await load()
    setAdding(false)
    inputRef.current?.focus()
  }

  async function toggle(task: Task) {
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, done: !task.done }),
    })
    await load()
  }

  async function remove(id: string) {
    await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const todo = tasks.filter(t => !t.done)
  const done = tasks.filter(t =>  t.done)

  return (
    <div className="wrap">
      {/* 追加フォーム */}
      <div className="add-row">
        <input
          ref={inputRef}
          className="add-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="やることを入力..."
        />
        <button className="add-btn" onClick={add} disabled={!input.trim() || adding}>
          追加
        </button>
      </div>

      {/* 未完了 */}
      {todo.length === 0 ? (
        <p className="empty">やることはありません 🎉</p>
      ) : (
        <ul className="list">
          {todo.map(t => (
            <TaskItem key={t.id} task={t} onToggle={toggle} onDelete={remove} />
          ))}
        </ul>
      )}

      {/* 完了済み */}
      {done.length > 0 && (
        <div className="done-section">
          <button className="done-toggle" onClick={() => setShowDone(v => !v)}>
            {showDone ? '▾' : '▸'} できた ({done.length})
          </button>
          {showDone && (
            <ul className="list done-list">
              {done.map(t => (
                <TaskItem key={t.id} task={t} onToggle={toggle} onDelete={remove} />
              ))}
            </ul>
          )}
        </div>
      )}

      <style jsx>{`
        .wrap { display: flex; flex-direction: column; gap: 0; }
        .add-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .add-input {
          flex: 1; padding: 11px 14px; border-radius: 12px;
          border: 1.5px solid var(--color-border); background: var(--color-bg-card);
          color: var(--color-text); font-size: 15px; font-family: inherit;
        }
        .add-input:focus { outline: none; border-color: var(--color-accent); }
        .add-btn {
          padding: 11px 18px; border-radius: 12px; border: none;
          background: var(--color-accent); color: #fff;
          font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap;
          transition: opacity .15s;
        }
        .add-btn:disabled { opacity: .4; cursor: default; }
        .empty { margin: 32px 0; text-align: center; font-size: 14px; color: var(--color-muted); }
        .list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .done-section { margin-top: 20px; }
        .done-toggle {
          background: none; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; color: var(--color-muted);
          padding: 4px 0; margin-bottom: 8px;
        }
        .done-list { opacity: .6; }
      `}</style>
    </div>
  )
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
}) {
  return (
    <li className={`item ${task.done ? 'done' : ''}`}>
      <button className="check" onClick={() => onToggle(task)} aria-label="チェック">
        {task.done ? '✓' : ''}
      </button>
      <span className="title">{task.title}</span>
      <button className="del" onClick={() => onDelete(task.id)} aria-label="削除">✕</button>

      <style jsx>{`
        .item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px; border-radius: 12px;
          background: var(--color-bg-card); border: 1px solid var(--color-border);
          transition: opacity .15s;
        }
        .check {
          width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
          border: 2px solid var(--color-border); background: transparent;
          cursor: pointer; font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          transition: all .15s; color: #fff;
        }
        .done .check { background: var(--color-accent); border-color: var(--color-accent); }
        .title { flex: 1; font-size: 15px; color: var(--color-text); }
        .done .title { text-decoration: line-through; color: var(--color-muted); }
        .del {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: var(--color-border); padding: 4px;
          flex-shrink: 0; transition: color .15s;
        }
        .del:hover { color: #ef4444; }
      `}</style>
    </li>
  )
}
