'use client'
// src/components/schedule/CandidateGenerator.tsx

import { useState } from 'react'
import type { CandidateDate } from '@/types'

const NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

function buildCopyText(candidates: CandidateDate[]): string {
  const lines = candidates.map((c, i) =>
    `${NUMBERS[i]} ${c.dayLabel}　${c.rangeLabels.join(' / ')}`
  )
  return ['【候補日】', ...lines, '', 'ご都合の良い日時をお知らせください🙏'].join('\n')
}

export default function CandidateGenerator() {
  const [candidates, setCandidates] = useState<CandidateDate[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [empty, setEmpty] = useState(false)

  async function generate() {
    setLoading(true)
    setCopied(false)
    setEmpty(false)
    const res = await fetch('/api/schedule/candidates?count=5')
    const { candidates: data } = await res.json()
    setCandidates(data ?? [])
    setEmpty((data ?? []).length === 0)
    setLoading(false)
  }

  async function copy() {
    const text = buildCopyText(candidates)

    // 1. Clipboard API（HTTPS + 対応ブラウザ）
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
        return
      } catch { /* フォールバックへ */ }
    }

    // 2. execCommand フォールバック（iOS Safari など）
    const el = document.createElement('textarea')
    el.value = text
    // 画面外に置いてスクロールさせない
    el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;'
    document.body.appendChild(el)
    el.focus()
    el.setSelectionRange(0, el.value.length) // iOS 用
    try {
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } finally {
      document.body.removeChild(el)
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">候補日を出す</h2>
      <p className="section-desc">空き時間設定から直近5日分を生成</p>

      <button className="gen-btn" onClick={generate} disabled={loading}>
        {loading ? '生成中…' : '📅 候補日を生成'}
      </button>

      {empty && (
        <p className="empty-msg">空き日が見つかりません。「空き時間設定」タブで時間帯を設定してください。</p>
      )}

      {candidates.length > 0 && (
        <>
          <div className="candidates">
            {candidates.map((c, i) => (
              <div key={c.date} className="row">
                <span className="num">{NUMBERS[i]}</span>
                <div className="info">
                  <span className="day-label">{c.dayLabel}</span>
                  <div className="tags">
                    {c.rangeLabels.map(r => (
                      <span key={r} className="tag">{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="copy-btn" onClick={copy}>
            {copied ? '✓ コピーしました' : '📋 テキストをコピー'}
          </button>

          <div className="preview">
            <p className="preview-label">
              コピー内容プレビュー
              <span className="preview-hint">（長押し or タップで全選択）</span>
            </p>
            <textarea
              className="preview-text"
              readOnly
              rows={candidates.length + 3}
              value={buildCopyText(candidates)}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
              onFocus={e => e.target.select()}
            />
          </div>
        </>
      )}

      <style jsx>{`
        .card { background: var(--color-bg-card); border-radius: 14px; padding: 20px; border: 1px solid var(--color-border); }
        .section-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; }
        .section-desc  { margin: 0 0 14px; font-size: 12px; color: var(--color-muted); }
        .gen-btn {
          width: 100%; padding: 12px; border-radius: 12px; border: none;
          background: #0d9488; color: #fff; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: opacity .15s;
        }
        .gen-btn:disabled { opacity: .5; cursor: default; }
        .empty-msg { margin: 14px 0 0; font-size: 13px; color: var(--color-muted); text-align: center; }
        .candidates { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
        .row { display: flex; align-items: flex-start; gap: 12px; }
        .num { font-size: 18px; flex-shrink: 0; color: #0d9488; font-weight: 700; margin-top: 1px; }
        .info { display: flex; flex-direction: column; gap: 4px; }
        .day-label { font-size: 15px; font-weight: 700; }
        .tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .tag {
          padding: 2px 9px; border-radius: 12px; font-size: 12px; font-weight: 600;
          background: #ccfbf1; color: #0d9488;
        }
        @media (prefers-color-scheme: dark) { .tag { background: #042f2e; color: #2dd4bf; } }
        .copy-btn {
          margin-top: 16px; width: 100%; padding: 10px; border-radius: 10px;
          border: 1.5px solid #0d9488; background: transparent;
          color: #0d9488; font-size: 14px; font-weight: 700; cursor: pointer;
        }
        .copy-btn:active { background: #ccfbf1; }
        .preview { margin-top: 14px; }
        .preview-label {
          margin: 0 0 6px; font-size: 11px; color: var(--color-muted);
          display: flex; align-items: center; gap: 6px;
        }
        .preview-hint {
          font-size: 10px; color: var(--color-muted); opacity: .7;
        }
        .preview-text {
          display: block; width: 100%; margin: 0; padding: 12px;
          border-radius: 10px; box-sizing: border-box;
          background: var(--color-bg-subtle); border: 1px solid var(--color-border);
          font-size: 13px; line-height: 1.8; white-space: pre-wrap;
          font-family: inherit; color: var(--color-text-sub);
          resize: none; outline: none; cursor: text;
          /* タップで全選択しやすくする */
          -webkit-user-select: all; user-select: all;
        }
        .preview-text:focus { border-color: #0d9488; }
      `}</style>
    </section>
  )
}
