'use client'
// src/components/schedule/CandidateGenerator.tsx

import { useState } from 'react'
import { CandidateDate } from '@/types'

const NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

function buildCopyText(candidates: CandidateDate[]): string {
  const lines = candidates.map((c, i) => {
    const slots = c.slotLabels.join('・')
    return `${NUMBERS[i]} ${c.dayLabel}　${slots}`
  })
  return ['【候補日】', ...lines, '', 'ご都合の良い日時をお知らせください🙏'].join('\n')
}

export default function CandidateGenerator({ onGenerate }: { onGenerate?: () => void }) {
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
    onGenerate?.()
  }

  async function copy() {
    const text = buildCopyText(candidates)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: show alert
      alert(text)
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">候補日を出す</h2>
      <p className="section-desc">設定に基づいて直近5日分を生成</p>

      <button className="gen-btn" onClick={generate} disabled={loading}>
        {loading ? '生成中…' : '📅 候補日を生成'}
      </button>

      {empty && (
        <p className="empty-msg">
          空き日が見つかりません。週間テンプレートを設定してください。
        </p>
      )}

      {candidates.length > 0 && (
        <>
          <div className="candidates">
            {candidates.map((c, i) => (
              <div key={c.date} className="candidate-row">
                <span className="num">{NUMBERS[i]}</span>
                <div className="info">
                  <span className="day-label">{c.dayLabel}</span>
                  <div className="slot-tags">
                    {c.slotLabels.map(s => (
                      <span key={s} className="slot-tag">{s}</span>
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
            <p className="preview-label">コピー内容プレビュー</p>
            <pre className="preview-text">{buildCopyText(candidates)}</pre>
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
        .candidate-row { display: flex; align-items: center; gap: 12px; }
        .num { font-size: 18px; flex-shrink: 0; color: #0d9488; font-weight: 700; }
        .info { display: flex; flex-direction: column; gap: 4px; }
        .day-label { font-size: 15px; font-weight: 700; color: var(--color-text); }
        .slot-tags { display: flex; gap: 6px; }
        .slot-tag {
          padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
          background: #ccfbf1; color: #0d9488;
        }
        @media (prefers-color-scheme: dark) {
          .slot-tag { background: #042f2e; color: #2dd4bf; }
        }
        .copy-btn {
          margin-top: 16px; width: 100%; padding: 10px; border-radius: 10px;
          border: 1.5px solid #0d9488; background: transparent;
          color: #0d9488; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: all .15s;
        }
        .copy-btn:active { background: #ccfbf1; }
        .preview { margin-top: 14px; }
        .preview-label { margin: 0 0 6px; font-size: 11px; color: var(--color-muted); }
        .preview-text {
          margin: 0; padding: 12px; border-radius: 10px;
          background: var(--color-bg-subtle); border: 1px solid var(--color-border);
          font-size: 13px; line-height: 1.8; white-space: pre-wrap;
          font-family: inherit; color: var(--color-text-sub);
        }
      `}</style>
    </section>
  )
}
