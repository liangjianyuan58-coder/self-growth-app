'use client'
// src/components/goals/GoalTree.tsx

import { useCallback, useEffect, useState } from 'react'
import type { Goal, GoalPeriodType } from '@/types'

// ── Types ─────────────────────────────────────────────────

interface GoalNode extends Goal {
  children: GoalNode[]
}

// ── Constants ─────────────────────────────────────────────

const PERIOD_LABEL: Record<GoalPeriodType, string> = {
  big:     '大目標',
  annual:  '年間',
  monthly: '月間',
  weekly:  '週間',
  daily:   '日次',
}

const CHILD_TYPE: Partial<Record<GoalPeriodType, GoalPeriodType>> = {
  big:     'annual',
  annual:  'monthly',
  monthly: 'weekly',
  weekly:  'daily',
}

const PERIOD_STYLE: Record<GoalPeriodType, { bg: string; fg: string; border: string }> = {
  big:     { bg: '#ede9fe', fg: '#5b21b6', border: '#c4b5fd' },
  annual:  { bg: '#dbeafe', fg: '#1e3a8a', border: '#93c5fd' },
  monthly: { bg: '#d1fae5', fg: '#065f46', border: '#6ee7b7' },
  weekly:  { bg: '#fef3c7', fg: '#78350f', border: '#fcd34d' },
  daily:   { bg: '#fce7f3', fg: '#831843', border: '#f9a8d4' },
}

const INDENT = 20 // px per depth

// ── Helpers ───────────────────────────────────────────────

function localISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function toMonday(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return localISO(d)
}

function formatPeriod(type: GoalPeriodType, label: string | null): string {
  if (!label) return ''
  const JP = ['日','月','火','水','木','金','土']
  switch (type) {
    case 'annual': return `${label}年`
    case 'monthly': {
      const [y, m] = label.split('-')
      return `${y}年${Number(m)}月`
    }
    case 'weekly': {
      const s = new Date(label + 'T00:00:00')
      const e = new Date(s); e.setDate(s.getDate() + 6)
      return `${s.getMonth()+1}/${s.getDate()}〜${e.getMonth()+1}/${e.getDate()}の週`
    }
    case 'daily': {
      const d = new Date(label + 'T00:00:00')
      return `${d.getMonth()+1}月${d.getDate()}日(${JP[d.getDay()]})`
    }
    default: return ''
  }
}

function defaultLabel(type: GoalPeriodType): string {
  const now = new Date()
  switch (type) {
    case 'annual':  return String(now.getFullYear())
    case 'monthly': return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    case 'weekly':  return toMonday(localISO(now))
    case 'daily':   return localISO(now)
    default:        return ''
  }
}

function buildTree(flat: Goal[]): GoalNode[] {
  const map = new Map<string, GoalNode>(flat.map(g => [g.id, { ...g, children: [] }]))
  const roots: GoalNode[] = []
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  const sort = (nodes: GoalNode[]) => {
    nodes.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (a.status !== 'done' && b.status === 'done') return -1
      // period_label がある場合は期間順
      if (a.period_label && b.period_label) return a.period_label.localeCompare(b.period_label)
      return a.created_at.localeCompare(b.created_at)
    })
    nodes.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

// 共通フォームフィールドスタイル（styled-jsx スコープをまたがないようにインラインで定義）
const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--color-border, #e5e7eb)',
  background: 'var(--color-bg-card, #fff)',
  fontSize: '14px',
  color: 'var(--color-text, #1a1a1a)',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const FIELD_TA: React.CSSProperties = { ...FIELD, resize: 'none' }

// ── PeriodInput ───────────────────────────────────────────

function PeriodInput({
  type, value, onChange,
}: { type: GoalPeriodType; value: string; onChange: (v: string) => void }) {
  if (type === 'annual') {
    return (
      <div>
        <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '0 0 4px' }}>西暦（年）</p>
        <input
          type="number"
          style={FIELD}
          min={2020} max={2099}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    )
  }
  if (type === 'monthly') {
    return (
      <div>
        <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '0 0 4px' }}>対象月</p>
        <input
          type="month"
          style={FIELD}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    )
  }
  if (type === 'weekly') {
    const monLabel = value ? formatPeriod('weekly', toMonday(value)) : ''
    return (
      <div>
        <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '0 0 4px' }}>
          週（任意の日を選ぶと月曜始まりに自動修正）
        </p>
        <input
          type="date"
          style={FIELD}
          value={value}
          onChange={e => e.target.value && onChange(toMonday(e.target.value))}
        />
        {monLabel && (
          <p style={{ fontSize: 11, color: '#0d9488', margin: '4px 0 0' }}>{monLabel}</p>
        )}
      </div>
    )
  }
  if (type === 'daily') {
    return (
      <div>
        <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '0 0 4px' }}>日付</p>
        <input
          type="date"
          style={FIELD}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    )
  }
  return null
}

// ── AddForm ───────────────────────────────────────────────

function AddForm({
  periodType, parentId, onDone,
}: {
  periodType: GoalPeriodType
  parentId: string | null
  onDone: () => void
}) {
  const [title,  setTitle]  = useState('')
  const [desc,   setDesc]   = useState('')
  const [label,  setLabel]  = useState(defaultLabel(periodType))
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: desc.trim() || null,
        parent_id: parentId,
        period_type: periodType,
        period_label: label || null,
      }),
    })
    setSaving(false)
    onDone()
  }

  return (
    <div className="aform">
      <p className="aform-head">{PERIOD_LABEL[periodType]}を追加</p>
      {periodType !== 'big' && (
        <PeriodInput type={periodType} value={label} onChange={setLabel} />
      )}
      <input
        style={FIELD}
        placeholder="タイトル *"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      <textarea
        style={FIELD_TA}
        placeholder="メモ（任意）"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        rows={2}
      />
      <div className="aform-acts">
        <button className="aform-cancel" onClick={onDone}>キャンセル</button>
        <button
          className="aform-save"
          onClick={submit}
          disabled={!title.trim() || saving}
        >
          {saving ? '…' : '追加'}
        </button>
      </div>

      <style jsx>{`
        .aform {
          padding: 12px 14px;
          background: var(--color-bg-subtle, #f9fafb);
          border-radius: 10px;
          border: 1px solid var(--color-border, #e5e7eb);
          display: flex; flex-direction: column; gap: 8px;
          margin: 4px 0 8px;
        }
        .aform-head {
          font-size: 11px; font-weight: 700;
          color: var(--color-muted); margin: 0;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .aform-acts { display: flex; justify-content: flex-end; gap: 8px; }
        .aform-cancel {
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: transparent; font-size: 12px; cursor: pointer;
          color: var(--color-muted, #9ca3af);
        }
        .aform-save {
          padding: 6px 14px; border-radius: 8px; border: none;
          background: var(--color-accent, #7c6af7); color: #fff;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .aform-save:disabled { opacity: .4; cursor: default; }
      `}</style>
    </div>
  )
}

// ── GoalItem ──────────────────────────────────────────────

function GoalItem({
  node, depth, onRefresh,
}: {
  node: GoalNode
  depth: number
  onRefresh: () => void
}) {
  const [open,     setOpen]     = useState(depth < 1)
  const [adding,   setAdding]   = useState(false)
  const [delConf,  setDelConf]  = useState(false)
  const [toggling, setToggling] = useState(false)

  const childType  = CHILD_TYPE[node.period_type]
  const doneCount  = node.children.filter(c => c.status === 'done').length
  const totalCount = node.children.length
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : -1
  const ps         = PERIOD_STYLE[node.period_type]
  const isDone     = node.status === 'done'
  const isArchived = node.status === 'archived'

  async function toggleDone() {
    setToggling(true)
    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: node.id, status: isDone ? 'active' : 'done' }),
    })
    setToggling(false)
    onRefresh()
  }

  async function remove() {
    await fetch('/api/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: node.id }),
    })
    onRefresh()
  }

  function handleAdd() {
    setAdding(true)
    setOpen(true)
  }

  const periodText = node.period_label
    ? formatPeriod(node.period_type, node.period_label)
    : null

  return (
    <div style={{ marginLeft: depth > 0 ? INDENT : 0, position: 'relative' }}>
      {/* Vertical guide line for non-root nodes */}
      {depth > 0 && (
        <div style={{
          position: 'absolute',
          left: -INDENT + 8,
          top: 0, bottom: 0,
          width: 1,
          background: 'var(--color-border, #e5e7eb)',
        }} />
      )}

      {/* Node row */}
      <div className={`row ${isDone || isArchived ? 'faded' : ''}`}>
        {/* Expand toggle */}
        <button
          className="exp"
          style={{ visibility: totalCount > 0 ? 'visible' : 'hidden' }}
          onClick={() => setOpen(v => !v)}
        >
          {open ? '▾' : '▸'}
        </button>

        {/* Period badge */}
        <span
          className="badge"
          style={{ background: ps.bg, color: ps.fg, borderColor: ps.border }}
        >
          {PERIOD_LABEL[node.period_type]}
          {periodText && <> · {periodText}</>}
        </span>

        {/* Content */}
        <div className="content">
          <span className={`title ${isDone ? 'strike' : ''}`}>{node.title}</span>
          {node.description && <span className="note">{node.description}</span>}
          {progress >= 0 && (
            <div className="prog-row">
              <div className="prog-bg">
                <div className="prog-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="prog-txt">{doneCount}/{totalCount} 完了</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="acts">
          {childType && !isDone && (
            <button className="act a-add" onClick={handleAdd} title={`${PERIOD_LABEL[childType]}を追加`}>
              +
            </button>
          )}
          <button
            className={`act a-chk ${isDone ? 'on' : ''}`}
            onClick={toggleDone}
            disabled={toggling}
            title={isDone ? '未達成に戻す' : '達成にする'}
          >
            ✓
          </button>
          {delConf ? (
            <>
              <span className="del-warn">
                {totalCount > 0 ? `配下${totalCount}件も削除` : '削除する？'}
              </span>
              <button className="act a-del-ok" onClick={remove}>削除</button>
              <button className="act a-del-no" onClick={() => setDelConf(false)}>✕</button>
            </>
          ) : (
            <button className="act a-del" onClick={() => setDelConf(true)} title="削除">
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Inline add form */}
      {adding && childType && (
        <div style={{ marginLeft: INDENT }}>
          <AddForm
            periodType={childType}
            parentId={node.id}
            onDone={() => { setAdding(false); onRefresh() }}
          />
        </div>
      )}

      {/* Children */}
      {open && node.children.map(child => (
        <GoalItem key={child.id} node={child} depth={depth + 1} onRefresh={onRefresh} />
      ))}

      <style jsx>{`
        .row {
          display: flex; align-items: flex-start; gap: 7px;
          padding: 8px 4px; border-radius: 10px; margin-bottom: 2px;
          transition: background .1s;
        }
        .row:hover { background: var(--color-bg-subtle, #f9fafb); }
        .row.faded { opacity: .55; }
        .exp {
          background: none; border: none; cursor: pointer;
          font-size: 11px; color: var(--color-muted); padding: 2px 1px;
          flex-shrink: 0; margin-top: 3px; line-height: 1;
        }
        .badge {
          font-size: 10px; font-weight: 700; padding: 2px 7px;
          border-radius: 20px; border: 1px solid;
          white-space: nowrap; flex-shrink: 0;
          margin-top: 2px; letter-spacing: .02em; line-height: 1.5;
        }
        .content {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 3px;
        }
        .title {
          font-size: 14px; font-weight: 600;
          color: var(--color-text, #1a1a1a); line-height: 1.4;
        }
        .title.strike { text-decoration: line-through; }
        .note { font-size: 11px; color: var(--color-muted, #9ca3af); line-height: 1.4; }
        .prog-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
        .prog-bg {
          flex: 1; height: 4px; max-width: 100px;
          background: var(--color-border, #e5e7eb);
          border-radius: 2px; overflow: hidden;
        }
        .prog-fill { height: 100%; background: #10b981; border-radius: 2px; transition: width .3s; }
        .prog-txt { font-size: 10px; color: var(--color-muted); white-space: nowrap; }
        .acts {
          display: flex; gap: 2px; flex-shrink: 0;
          align-items: center; flex-wrap: wrap; justify-content: flex-end;
        }
        .act {
          background: none; border: none; cursor: pointer;
          font-size: 13px; padding: 4px 5px; border-radius: 6px;
          color: var(--color-muted, #9ca3af); transition: all .12s;
          line-height: 1;
        }
        .act:hover:not(:disabled) { background: var(--color-bg-subtle, #f9fafb); }
        .a-add:hover { color: #0d9488; }
        .a-chk:hover { color: #10b981; }
        .a-chk.on { color: #10b981; }
        .a-del:hover { color: #ef4444; }
        .del-warn {
          font-size: 10px; color: #ef4444; white-space: nowrap; font-weight: 600;
        }
        .a-del-ok {
          background: #ef4444; border: none; cursor: pointer;
          font-size: 11px; padding: 3px 7px; border-radius: 6px;
          color: #fff; font-weight: 700; transition: opacity .12s;
        }
        .a-del-ok:hover { opacity: .8; }
        .a-del-no {
          background: none; border: 1px solid var(--color-border); cursor: pointer;
          font-size: 11px; padding: 3px 6px; border-radius: 6px;
          color: var(--color-muted); transition: opacity .12s;
        }
      `}</style>
    </div>
  )
}

// ── GoalTree (root) ────────────────────────────────────────

export default function GoalTree() {
  const [roots,   setRoots]   = useState<GoalNode[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)

  const load = useCallback(async () => {
    const res  = await fetch('/api/goals')
    const json = await res.json() as { goals: Goal[] }
    setRoots(buildTree(json.goals ?? []))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <p className="loading">読み込み中…</p>

  return (
    <div className="wrap">
      {/* 凡例 */}
      <div className="legend">
        {(Object.keys(PERIOD_LABEL) as GoalPeriodType[]).map(t => (
          <span
            key={t}
            className="leg"
            style={{
              background: PERIOD_STYLE[t].bg,
              color: PERIOD_STYLE[t].fg,
              border: `1px solid ${PERIOD_STYLE[t].border}`,
            }}
          >
            {PERIOD_LABEL[t]}
          </span>
        ))}
      </div>

      {/* 大目標を追加 */}
      {adding ? (
        <AddForm
          periodType="big"
          parentId={null}
          onDone={() => { setAdding(false); load() }}
        />
      ) : (
        <button className="add-big" onClick={() => setAdding(true)}>
          + 大きな目標を追加
        </button>
      )}

      {/* ツリー */}
      {roots.length === 0 && !adding && (
        <p className="empty">
          大きな目標を追加して、<br />年間 → 月間 → 週間 → 日次へ細分化しましょう
        </p>
      )}
      <div className="tree">
        {roots.map(node => (
          <div key={node.id} className="root-wrap">
            <GoalItem node={node} depth={0} onRefresh={load} />
          </div>
        ))}
      </div>

      <style jsx>{`
        .wrap { display: flex; flex-direction: column; gap: 10px; }
        .loading { text-align: center; color: var(--color-muted); font-size: 14px; padding: 40px 0; }
        .legend { display: flex; flex-wrap: wrap; gap: 6px; }
        .leg {
          font-size: 10px; font-weight: 700; padding: 2px 8px;
          border-radius: 12px; letter-spacing: .02em;
        }
        .add-big {
          align-self: flex-start;
          padding: 10px 18px; border-radius: 10px;
          border: 1.5px dashed var(--color-accent, #7c6af7);
          background: transparent; color: var(--color-accent, #7c6af7);
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: background .15s;
        }
        .add-big:hover { background: #ede9fe; }
        .empty {
          text-align: center; color: var(--color-muted);
          font-size: 14px; padding: 32px 0; line-height: 1.8;
        }
        .tree { display: flex; flex-direction: column; gap: 4px; }
        .root-wrap {
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 14px;
          padding: 12px 12px 8px;
        }
      `}</style>
    </div>
  )
}
