'use client'
// src/components/journal/JournalInput.tsx
// 「今日のログ」メインの入力コンポーネント

import { useState, useRef, useEffect } from 'react'
import type { AnalysisResult } from '@/types'

const CATEGORY_LABEL: Record<string, string> = {
  journal: '日記',
  money:   '支出',
  input:   'インプット',
  goal:    '目標',
}

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😄']

interface Props {
  onSaved?: () => void
}

export default function JournalInput({ onSaved }: Props) {
  const [body, setBody]             = useState('')
  const [status, setStatus]         = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [analysis, setAnalysis]     = useState<AnalysisResult | null>(null)
  const [addedTasks, setAddedTasks] = useState<string[]>([])
  const [addedEvents, setAddedEvents] = useState<string[]>([])
  const [aiError, setAiError]       = useState<string | null>(null)
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)

  // テキストエリアの高さ自動調整
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || status === 'saving') return

    setStatus('saving')
    setAnalysis(null)
    setAddedTasks([])
    setAddedEvents([])
    setAiError(null)

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setAnalysis(json.analysis as AnalysisResult)
      setAddedTasks(json.addedTasks ?? [])
      setAddedEvents(json.addedEvents ?? [])
      setAiError(json.aiError ?? null)
      setStatus('done')
      setBody('')
      onSaved?.()

      setTimeout(() => { setStatus('idle'); setAnalysis(null); setAddedTasks([]); setAddedEvents([]); setAiError(null) }, 8000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const charCount = body.length
  const canSubmit = body.trim().length > 0 && status === 'idle'

  return (
    <div className="journal-input-wrap">
      <form onSubmit={handleSubmit}>
        <div className="textarea-wrap">
          <textarea
            ref={textareaRef}
            className="journal-textarea"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="今日のログを書く…&#10;金額を書けば支出に、本やアニメのメモはインプットに自動分類されます"
            rows={4}
            disabled={status === 'saving'}
          />
          <div className="input-footer">
            <span className="char-count">{charCount} 字</span>
            <button
              type="submit"
              className={`submit-btn ${status}`}
              disabled={!canSubmit}
            >
              {status === 'saving' ? (
                <span className="spinner" />
              ) : status === 'done' ? (
                '保存済み ✓'
              ) : status === 'error' ? (
                'エラー'
              ) : (
                '保存'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* AIエラーバナー */}
      {aiError && (
        <div className="ai-error-banner">
          ⚠️ AI分類エラー（日記として保存されました）<br />
          <span className="ai-error-detail">{aiError}</span>
        </div>
      )}

      {/* AI分析結果バナー */}
      {analysis && !aiError && (
        <div className="analysis-banner">
          <div className="analysis-row">
            <span className="category-badge" data-cat={analysis.category}>
              {CATEGORY_LABEL[analysis.category] ?? analysis.category}
            </span>
            <span className="mood-badge">{MOOD_EMOJI[analysis.mood]}</span>
            <span className="summary-line">{analysis.summary_line}</span>
          </div>
          <div className="tags-row">
            {analysis.tags.map(tag => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
          {'output_draft' in (analysis.metadata as Record<string, unknown>) && (
            <div className="output-draft">
              <span className="draft-label">発信草稿</span>
              <p className="draft-text">
                {(analysis.metadata as { output_draft: string }).output_draft}
              </p>
            </div>
          )}

          {/* 自動追加されたタスク */}
          {addedTasks.length > 0 && (
            <div className="auto-added">
              <span className="auto-label">✅ タスクに追加</span>
              {addedTasks.map(t => <span key={t} className="auto-item">{t}</span>)}
            </div>
          )}

          {/* 自動追加された予定 */}
          {addedEvents.length > 0 && (
            <div className="auto-added">
              <span className="auto-label">📅 予定に追加</span>
              {addedEvents.map(e => <span key={e} className="auto-item">{e}</span>)}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .journal-input-wrap {
          width: 100%;
        }
        .textarea-wrap {
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color .15s;
        }
        .textarea-wrap:focus-within {
          border-color: var(--color-accent, #7c6af7);
        }
        .journal-textarea {
          width: 100%;
          min-height: 100px;
          padding: 16px;
          font-size: 15px;
          line-height: 1.7;
          resize: none;
          border: none;
          outline: none;
          background: transparent;
          color: var(--color-text, #1a1a1a);
          font-family: inherit;
        }
        .input-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }
        .char-count {
          font-size: 12px;
          color: var(--color-muted, #9ca3af);
        }
        .submit-btn {
          padding: 6px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--color-accent, #7c6af7);
          color: var(--color-accent, #7c6af7);
          background: transparent;
          cursor: pointer;
          transition: background .15s, color .15s;
          min-width: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .submit-btn:hover:not(:disabled) {
          background: var(--color-accent, #7c6af7);
          color: #fff;
        }
        .submit-btn:disabled {
          opacity: .4;
          cursor: default;
        }
        .submit-btn.done {
          border-color: #10b981;
          color: #10b981;
        }
        .submit-btn.error {
          border-color: #ef4444;
          color: #ef4444;
        }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin .6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* AIエラーバナー */
        .ai-error-banner {
          margin-top: 12px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          font-size: 13px;
          color: #b91c1c;
          line-height: 1.6;
        }
        .ai-error-detail {
          font-size: 11px;
          color: #ef4444;
          word-break: break-all;
        }

        /* 分析バナー */
        .analysis-banner {
          margin-top: 12px;
          padding: 12px 14px;
          background: var(--color-bg-subtle, #f9fafb);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px;
          animation: fadeIn .25s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } }
        .analysis-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .category-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          letter-spacing: .02em;
        }
        [data-cat="journal"] { background:#ede9fe; color:#5b21b6; }
        [data-cat="money"]   { background:#fef3c7; color:#92400e; }
        [data-cat="input"]   { background:#d1fae5; color:#065f46; }
        [data-cat="goal"]    { background:#dbeafe; color:#1e3a8a; }
        .mood-badge { font-size: 16px; }
        .summary-line {
          font-size: 13px;
          color: var(--color-text-sub, #4b5563);
        }
        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .tag {
          font-size: 11px;
          color: var(--color-muted, #9ca3af);
        }
        .output-draft {
          margin-top: 8px;
          padding: 8px 10px;
          background: #fff;
          border-left: 2px solid var(--color-accent, #7c6af7);
          border-radius: 0 6px 6px 0;
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
          color: var(--color-text-sub, #4b5563);
          margin: 4px 0 0;
          line-height: 1.5;
        }
        .auto-added {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .auto-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-muted, #9ca3af);
          white-space: nowrap;
        }
        .auto-item {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          color: var(--color-text-sub, #4b5563);
        }
      `}</style>
    </div>
  )
}
