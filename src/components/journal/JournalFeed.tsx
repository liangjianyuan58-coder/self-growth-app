'use client'
// src/components/journal/JournalFeed.tsx

import { useEffect, useState, useCallback } from 'react'
import type { Journal, MoneyMetadata, InputMetadata, Category } from '@/types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button type="button" className="copy-btn" onClick={copy}>
      {copied ? 'コピー済み ✓' : 'コピー'}
      <style jsx>{`
        .copy-btn {
          font-size: 11px; padding: 3px 10px; border-radius: 6px;
          border: 1px solid var(--color-accent, #7c6af7);
          color: var(--color-accent, #7c6af7); background: transparent;
          cursor: pointer; white-space: nowrap;
          transition: background .15s, color .15s;
        }
        .copy-btn:hover { background: var(--color-accent, #7c6af7); color: #fff; }
      `}</style>
    </button>
  )
}

// ── 編集モーダル ──────────────────────────────────────────────────
const EXPENSE_CATS = ['食費', '交通費', '娯楽', '仕事', '健康', 'その他']

function EditModal({ journal, onSave, onClose }: {
  journal: Journal
  onSave: () => void
  onClose: () => void
}) {
  const [category,  setCategory]  = useState<Category>(journal.category ?? 'journal')
  const [mood,      setMood]      = useState<number>(journal.mood ?? 3)
  const [body,      setBody]      = useState(journal.body)
  const [amount,    setAmount]    = useState(String((journal.metadata as MoneyMetadata).amount ?? ''))
  const [expCat,    setExpCat]    = useState((journal.metadata as MoneyMetadata).expense_category ?? '食費')
  const [saving,    setSaving]    = useState(false)
  const [delConf,   setDelConf]   = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  async function save() {
    setSaving(true)
    const metadata: Record<string, unknown> = { ...(journal.metadata as Record<string, unknown>) }
    if (category === 'money') {
      metadata.amount = Number(amount) || 0
      metadata.expense_category = expCat
    }
    await fetch('/api/journal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: journal.id, category, mood, body, metadata }),
    })
    setSaving(false)
    onSave()
  }

  async function del() {
    setDeleting(true)
    await fetch('/api/journal', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: journal.id }),
    })
    setDeleting(false)
    onSave()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mhead">
          <span className="mtitle">ログを修正</span>
          <button className="mclose" onClick={onClose}>✕</button>
        </div>

        <div className="fields">
          {/* 本文 */}
          <label className="field">
            <span className="flabel">本文</span>
            <textarea
              className="finput"
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </label>

          {/* カテゴリ */}
          <div className="field">
            <span className="flabel">カテゴリ</span>
            <div className="cat-btns">
              {(['journal','money','input','goal'] as Category[]).map(c => (
                <button
                  key={c}
                  className={`cat-btn ${category === c ? 'active' : ''}`}
                  data-cat={c}
                  onClick={() => setCategory(c)}
                >
                  {{ journal:'日記', money:'支出', input:'インプット', goal:'目標' }[c]}
                </button>
              ))}
            </div>
          </div>

          {/* 支出の場合の金額・カテゴリ */}
          {category === 'money' && (
            <>
              <label className="field">
                <span className="flabel">金額（円）</span>
                <input
                  type="number"
                  className="finput"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="1000"
                />
              </label>
              <div className="field">
                <span className="flabel">支出カテゴリ</span>
                <div className="excat-btns">
                  {EXPENSE_CATS.map(ec => (
                    <button
                      key={ec}
                      className={`excat-btn ${expCat === ec ? 'active' : ''}`}
                      onClick={() => setExpCat(ec)}
                    >
                      {ec}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 気分 */}
          <div className="field">
            <span className="flabel">気分</span>
            <div className="mood-btns">
              {(['😔','😕','😐','🙂','😄'] as const).map((em, idx) => (
                <button
                  key={idx}
                  className={`mood-btn ${mood === idx + 1 ? 'active' : ''}`}
                  onClick={() => setMood(idx + 1)}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mactions">
          {delConf ? (
            <>
              <span className="del-confirm">本当に削除？</span>
              <button className="del-yes" onClick={del} disabled={deleting}>
                {deleting ? '削除中…' : '削除する'}
              </button>
              <button className="del-no" onClick={() => setDelConf(false)}>キャンセル</button>
            </>
          ) : (
            <>
              <button className="del-btn" onClick={() => setDelConf(true)}>削除</button>
              <button className="save-btn" onClick={save} disabled={saving || !body.trim()}>
                {saving ? '保存中…' : '保存'}
              </button>
            </>
          )}
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
        .mhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .mtitle { font-size: 16px; font-weight: 800; }
        .mclose { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--color-muted); }
        .fields { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .flabel { font-size: 12px; font-weight: 700; color: var(--color-muted); }
        .finput {
          padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--color-border);
          background: var(--color-bg-subtle); color: var(--color-text);
          font-size: 15px; font-family: inherit; width: 100%; box-sizing: border-box;
          resize: vertical;
        }
        .finput:focus { outline: none; border-color: var(--color-accent); }
        .cat-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .cat-btn {
          padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
          border: 1.5px solid var(--color-border); background: transparent;
          color: var(--color-muted); cursor: pointer; transition: all .15s;
        }
        .cat-btn[data-cat="journal"].active { background:#ede9fe; color:#5b21b6; border-color:#ede9fe; }
        .cat-btn[data-cat="money"].active   { background:#fef3c7; color:#92400e; border-color:#fef3c7; }
        .cat-btn[data-cat="input"].active   { background:#d1fae5; color:#065f46; border-color:#d1fae5; }
        .cat-btn[data-cat="goal"].active    { background:#dbeafe; color:#1e3a8a; border-color:#dbeafe; }
        .excat-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .excat-btn {
          padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
          border: 1.5px solid var(--color-border); background: transparent;
          color: var(--color-muted); cursor: pointer;
        }
        .excat-btn.active { background: #fef3c7; color: #92400e; border-color: #fef3c7; }
        .mood-btns { display: flex; gap: 8px; }
        .mood-btn {
          font-size: 22px; background: none; border: 2px solid transparent;
          border-radius: 8px; padding: 2px 4px; cursor: pointer; opacity: .4;
          transition: all .15s;
        }
        .mood-btn.active { opacity: 1; border-color: var(--color-accent); }
        .mactions { margin-top: 20px; display: flex; gap: 10px; align-items: center; }
        .save-btn {
          flex: 1; padding: 12px; border-radius: 12px; border: none;
          background: var(--color-accent, #7c6af7); color: #fff;
          font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .15s;
        }
        .save-btn:disabled { opacity: .5; cursor: default; }
        .del-btn {
          padding: 12px 18px; border-radius: 12px;
          border: 1.5px solid #ef4444; background: transparent;
          color: #ef4444; font-size: 14px; font-weight: 700; cursor: pointer;
        }
        .del-confirm { font-size: 13px; color: #ef4444; font-weight: 600; white-space: nowrap; }
        .del-yes {
          padding: 10px 16px; border-radius: 10px; border: none;
          background: #ef4444; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .del-no {
          padding: 10px 16px; border-radius: 10px;
          border: 1.5px solid var(--color-border); background: transparent;
          color: var(--color-muted); font-size: 13px; cursor: pointer;
        }
      `}</style>
    </div>
  )
}

// ── メインフィード ────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  journal: '日記', money: '支出', input: 'インプット', goal: '目標',
}

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😄']

const TABS = [
  { key: '',        label: 'すべて' },
  { key: 'journal', label: '日記' },
  { key: 'money',   label: '支出' },
  { key: 'input',   label: 'インプット' },
  { key: 'goal',    label: '目標' },
]

interface Props {
  refreshKey?: number
}

export default function JournalFeed({ refreshKey = 0 }: Props) {
  const [journals,   setJournals]   = useState<Journal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('')
  const [editing,    setEditing]    = useState<Journal | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/journal')
    const json = await res.json()
    setJournals(json.journals ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  function onEditSave() {
    setEditing(null)
    load()
  }

  const filtered = activeTab
    ? journals.filter(j => (j.category ?? 'journal') === activeTab)
    : journals

  if (loading) return <div className="feed-loading">読み込み中…</div>

  return (
    <div>
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="feed-empty">
          {activeTab ? `${CATEGORY_LABEL[activeTab]}のログはありません` : 'まだログがありません'}
        </div>
      ) : (
        <div className="feed">
          {filtered.map(j => (
            <article key={j.id} className="entry">
              <div className="entry-meta">
                <span className="entry-cat" data-cat={j.category ?? 'journal'}>
                  {CATEGORY_LABEL[j.category ?? 'journal']}
                </span>
                <span className="entry-date">
                  {new Date(j.created_at).toLocaleString('ja-JP', {
                    month: 'numeric', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {j.mood && <span className="entry-mood">{MOOD_EMOJI[j.mood]}</span>}
                <button className="edit-btn" onClick={() => setEditing(j)}>編集</button>
              </div>

              <p className="entry-body">{j.body}</p>

              {j.category === 'money' && (() => {
                const m = j.metadata as MoneyMetadata
                return m.amount ? (
                  <div className="entry-money">
                    <span className="money-amount">¥{m.amount.toLocaleString()}</span>
                    <span className="money-cat">{m.expense_category}</span>
                  </div>
                ) : null
              })()}

              {j.category === 'input' && (() => {
                const m = j.metadata as InputMetadata
                if (!m.title && !m.output_draft) return null
                return (
                  <div className="entry-input-wrap">
                    {m.title && (
                      <div className="entry-input">
                        <span className="input-type">{m.source_type}</span>
                        <span className="input-title">『{m.title}』</span>
                      </div>
                    )}
                    {m.highlight && <p className="input-highlight">{m.highlight}</p>}
                    {m.output_draft && (
                      <div className="output-draft">
                        <div className="draft-head">
                          <span className="draft-label">発信草稿</span>
                          <CopyButton text={m.output_draft} />
                        </div>
                        <p className="draft-text">{m.output_draft}</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {j.tags.length > 0 && (
                <div className="entry-tags">
                  {j.tags.map(t => <span key={t} className="etag">#{t}</span>)}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {editing && (
        <EditModal journal={editing} onSave={onEditSave} onClose={() => setEditing(null)} />
      )}

      <style jsx>{`
        .tabs {
          display: flex; gap: 6px; margin-bottom: 14px;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          scrollbar-width: none; padding-bottom: 2px;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab {
          flex-shrink: 0; padding: 5px 14px; border-radius: 20px;
          border: 1.5px solid var(--color-border, #e5e7eb);
          background: transparent; color: var(--color-muted, #9ca3af);
          font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s;
          white-space: nowrap;
        }
        .tab.active {
          background: var(--color-accent, #7c6af7);
          border-color: var(--color-accent, #7c6af7); color: #fff;
        }
        .feed { display: flex; flex-direction: column; gap: 12px; }
        .feed-loading, .feed-empty {
          text-align: center; padding: 32px 0;
          color: var(--color-muted, #9ca3af); font-size: 14px;
        }
        .entry {
          padding: 14px 16px; background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb); border-radius: 10px;
        }
        .entry-meta {
          display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
        }
        .entry-cat {
          font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 20px;
        }
        [data-cat="journal"] { background:#ede9fe; color:#5b21b6; }
        [data-cat="money"]   { background:#fef3c7; color:#92400e; }
        [data-cat="input"]   { background:#d1fae5; color:#065f46; }
        [data-cat="goal"]    { background:#dbeafe; color:#1e3a8a; }
        .entry-date { font-size: 11px; color: var(--color-muted, #9ca3af); }
        .entry-mood { font-size: 14px; }
        .edit-btn {
          margin-left: auto; font-size: 11px; padding: 2px 8px; border-radius: 6px;
          border: 1px solid var(--color-border); background: transparent;
          color: var(--color-muted); cursor: pointer; flex-shrink: 0;
          transition: color .15s, border-color .15s;
        }
        .edit-btn:hover { color: var(--color-accent); border-color: var(--color-accent); }
        .entry-body {
          font-size: 14px; line-height: 1.65; color: var(--color-text, #1a1a1a);
          white-space: pre-wrap; margin: 0 0 8px;
        }
        .entry-money { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .money-amount { font-size: 15px; font-weight: 600; color: #92400e; }
        .money-cat { font-size: 11px; color: var(--color-muted, #9ca3af); }
        .entry-input-wrap { margin-bottom: 6px; }
        .entry-input { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .input-type {
          font-size: 10px; background: #d1fae5; color: #065f46;
          padding: 1px 6px; border-radius: 4px;
        }
        .input-title { font-size: 12px; color: var(--color-text-sub, #4b5563); }
        .input-highlight {
          font-size: 13px; color: var(--color-text-sub, #4b5563);
          line-height: 1.6; margin: 0 0 8px; padding-left: 10px;
          border-left: 2px solid var(--color-border, #e5e7eb);
        }
        .output-draft {
          padding: 10px 12px; background: var(--color-bg-subtle, #f9fafb);
          border-left: 2px solid var(--color-accent, #7c6af7); border-radius: 0 8px 8px 0;
        }
        .draft-head {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;
        }
        .draft-label {
          font-size: 10px; font-weight: 600; color: var(--color-accent, #7c6af7);
          text-transform: uppercase; letter-spacing: .05em;
        }
        .draft-text {
          font-size: 13px; color: var(--color-text, #1a1a1a);
          margin: 0; line-height: 1.6; white-space: pre-wrap;
        }
        .entry-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .etag { font-size: 11px; color: var(--color-muted, #9ca3af); }
      `}</style>
    </div>
  )
}
