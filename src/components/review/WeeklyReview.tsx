'use client'
// src/components/review/WeeklyReview.tsx

import { useEffect, useState } from 'react'
import type { WeeklyReview as WR } from '@/types'

function getMondayISO(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7)
  return d.toISOString().slice(0, 10)
}

export default function WeeklyReview() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [review, setReview]         = useState<WR | null>(null)
  const [loading, setLoading]       = useState(false)
  const [generating, setGenerating] = useState(false)

  const weekStart = getMondayISO(weekOffset)

  async function load() {
    setLoading(true)
    const res  = await fetch(`/api/summary?week=${weekStart}`)
    const json = await res.json()
    setReview(json.review ?? null)
    setLoading(false)
  }

  async function regenerate() {
    setGenerating(true)
    const res  = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekStart }),
    })
    const json = await res.json()
    setReview(json.review ?? null)
    setGenerating(false)
  }

  useEffect(() => { load() }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const p = review?.patterns

  return (
    <div className="wr-wrap">
      {/* ヘッダー */}
      <div className="wr-header">
        <button className="week-nav" onClick={() => setWeekOffset(o => o - 1)}>←</button>
        <span className="week-label">
          {weekStart} の週
          {weekOffset === 0 && <span className="week-this">今週</span>}
        </span>
        <button
          className="week-nav"
          onClick={() => setWeekOffset(o => o + 1)}
          disabled={weekOffset >= 0}
        >→</button>
        <button
          className="regen-btn"
          onClick={regenerate}
          disabled={generating}
        >
          {generating ? '生成中…' : '再生成'}
        </button>
      </div>

      {loading && <p className="wr-loading">読み込み中…</p>}

      {!loading && !review && (
        <p className="wr-empty">この週のデータがありません。ログを書いてから「再生成」を押してください。</p>
      )}

      {!loading && review && (
        <div className="wr-body">
          {/* サマリー文 */}
          <p className="wr-summary">{review.summary}</p>

          {/* 統計ミニカード */}
          {p && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">ログ数</span>
                <span className="stat-value">{p.entry_count}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">気分平均</span>
                <span className="stat-value">{p.mood_avg > 0 ? p.mood_avg.toFixed(1) : '-'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">支出合計</span>
                <span className="stat-value">¥{p.money_total.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">インプット</span>
                <span className="stat-value">{p.inputs.length} 件</span>
              </div>
            </div>
          )}

          {/* 支出内訳 */}
          {p && Object.keys(p.money_breakdown).length > 0 && (
            <div className="breakdown">
              <h4 className="section-title">支出内訳</h4>
              {Object.entries(p.money_breakdown).map(([cat, amount]) => (
                <div key={cat} className="breakdown-row">
                  <span className="breakdown-cat">{cat}</span>
                  <div className="breakdown-bar-wrap">
                    <div
                      className="breakdown-bar"
                      style={{ width: `${Math.round((amount / p.money_total) * 100)}%` }}
                    />
                  </div>
                  <span className="breakdown-amount">¥{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* strengths / struggles */}
          {p && (p.strengths.length > 0 || p.struggles.length > 0) && (
            <div className="insights">
              {p.strengths.length > 0 && (
                <div className="insight-block">
                  <h4 className="section-title">うまくいったこと</h4>
                  <ul className="insight-list">
                    {p.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {p.struggles.length > 0 && (
                <div className="insight-block">
                  <h4 className="section-title">課題・気になったこと</h4>
                  <ul className="insight-list struggles">
                    {p.struggles.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* インプット一覧 */}
          {p && p.inputs.length > 0 && (
            <div className="inputs-list">
              <h4 className="section-title">今週のインプット</h4>
              {p.inputs.map((inp, i) => (
                <div key={i} className="input-row">
                  <span className="input-type">{inp.source_type}</span>
                  <span className="input-title">{inp.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .wr-wrap { width: 100%; }
        .wr-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .week-nav {
          padding: 4px 10px;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text, #1a1a1a);
        }
        .week-nav:disabled { opacity: .3; cursor: default; }
        .week-label {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
          color: var(--color-text, #1a1a1a);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .week-this {
          font-size: 10px;
          background: var(--color-accent, #7c6af7);
          color: #fff;
          padding: 1px 6px;
          border-radius: 20px;
        }
        .regen-btn {
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid var(--color-accent, #7c6af7);
          color: var(--color-accent, #7c6af7);
          background: transparent;
          font-size: 12px;
          cursor: pointer;
        }
        .wr-loading, .wr-empty {
          text-align: center;
          padding: 24px 0;
          font-size: 14px;
          color: var(--color-muted, #9ca3af);
        }
        .wr-summary {
          font-size: 14px;
          line-height: 1.7;
          color: var(--color-text, #1a1a1a);
          margin-bottom: 16px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .stat-card {
          padding: 12px;
          background: var(--color-bg-subtle, #f9fafb);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-label { font-size: 11px; color: var(--color-muted, #9ca3af); }
        .stat-value { font-size: 18px; font-weight: 600; color: var(--color-text, #1a1a1a); }
        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-muted, #9ca3af);
          text-transform: uppercase;
          letter-spacing: .06em;
          margin: 0 0 8px;
        }
        .breakdown { margin-bottom: 20px; }
        .breakdown-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .breakdown-cat { font-size: 12px; width: 60px; color: var(--color-text-sub, #4b5563); }
        .breakdown-bar-wrap {
          flex: 1;
          height: 6px;
          background: var(--color-border, #e5e7eb);
          border-radius: 3px;
          overflow: hidden;
        }
        .breakdown-bar {
          height: 100%;
          background: var(--color-accent, #7c6af7);
          border-radius: 3px;
          transition: width .4s ease;
        }
        .breakdown-amount { font-size: 12px; width: 72px; text-align: right; color: var(--color-text, #1a1a1a); }
        .insights { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
        .insight-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .insight-list li { font-size: 13px; padding-left: 12px; position: relative; color: var(--color-text, #1a1a1a); }
        .insight-list li::before { content: '·'; position: absolute; left: 0; color: #10b981; }
        .insight-list.struggles li::before { color: #f59e0b; }
        .inputs-list { margin-bottom: 8px; }
        .input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }
        .input-type {
          font-size: 10px;
          background: #d1fae5;
          color: #065f46;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .input-title { font-size: 13px; color: var(--color-text, #1a1a1a); }
      `}</style>
    </div>
  )
}
