'use client'
// src/components/journal/JournalFeed.tsx

import { useEffect, useState, useCallback } from 'react'
import type { Journal, MoneyMetadata, InputMetadata } from '@/types'

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
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid var(--color-accent, #7c6af7);
          color: var(--color-accent, #7c6af7);
          background: transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: background .15s, color .15s, border-color .15s;
        }
        .copy-btn:hover { background: var(--color-accent, #7c6af7); color: #fff; }
      `}</style>
    </button>
  )
}

const CATEGORY_LABEL: Record<string, string> = {
  journal: '日記',
  money:   '支出',
  input:   'インプット',
  goal:    '目標',
}

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😄']

interface Props {
  refreshKey?: number
}

export default function JournalFeed({ refreshKey = 0 }: Props) {
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/journal')
    const json = await res.json()
    setJournals(json.journals ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  if (loading) return <div className="feed-loading">読み込み中…</div>
  if (journals.length === 0) return <div className="feed-empty">まだログがありません</div>

  return (
    <div className="feed">
      {journals.map(j => (
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
          </div>

          <p className="entry-body">{j.body}</p>

          {/* money サブ情報 */}
          {j.category === 'money' && (() => {
            const m = j.metadata as MoneyMetadata
            return m.amount ? (
              <div className="entry-money">
                <span className="money-amount">¥{m.amount.toLocaleString()}</span>
                <span className="money-cat">{m.expense_category}</span>
              </div>
            ) : null
          })()}

          {/* input サブ情報 */}
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
                {m.highlight && (
                  <p className="input-highlight">{m.highlight}</p>
                )}
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

      <style jsx>{`
        .feed { display: flex; flex-direction: column; gap: 12px; }
        .feed-loading, .feed-empty {
          text-align: center;
          padding: 32px 0;
          color: var(--color-muted, #9ca3af);
          font-size: 14px;
        }
        .entry {
          padding: 14px 16px;
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px;
        }
        .entry-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .entry-cat {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 20px;
        }
        [data-cat="journal"] { background:#ede9fe; color:#5b21b6; }
        [data-cat="money"]   { background:#fef3c7; color:#92400e; }
        [data-cat="input"]   { background:#d1fae5; color:#065f46; }
        [data-cat="goal"]    { background:#dbeafe; color:#1e3a8a; }
        .entry-date {
          font-size: 11px;
          color: var(--color-muted, #9ca3af);
        }
        .entry-mood { font-size: 14px; }
        .entry-body {
          font-size: 14px;
          line-height: 1.65;
          color: var(--color-text, #1a1a1a);
          white-space: pre-wrap;
          margin: 0 0 8px;
        }
        .entry-money {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .money-amount {
          font-size: 15px;
          font-weight: 600;
          color: #92400e;
        }
        .money-cat {
          font-size: 11px;
          color: var(--color-muted, #9ca3af);
        }
        .entry-input-wrap { margin-bottom: 6px; }
        .entry-input {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .input-type {
          font-size: 10px;
          background: #d1fae5;
          color: #065f46;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .input-title {
          font-size: 12px;
          color: var(--color-text-sub, #4b5563);
        }
        .input-highlight {
          font-size: 13px;
          color: var(--color-text-sub, #4b5563);
          line-height: 1.6;
          margin: 0 0 8px;
          padding-left: 10px;
          border-left: 2px solid var(--color-border, #e5e7eb);
        }
        .output-draft {
          padding: 10px 12px;
          background: var(--color-bg-subtle, #f9fafb);
          border-left: 2px solid var(--color-accent, #7c6af7);
          border-radius: 0 8px 8px 0;
        }
        .draft-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .draft-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-accent, #7c6af7);
          text-transform: uppercase;
          letter-spacing: .05em;
        }
        .draft-text {
          font-size: 13px;
          color: var(--color-text, #1a1a1a);
          margin: 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .entry-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .etag {
          font-size: 11px;
          color: var(--color-muted, #9ca3af);
        }
      `}</style>
    </div>
  )
}
