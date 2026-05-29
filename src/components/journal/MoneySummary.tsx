'use client'
// src/components/journal/MoneySummary.tsx
// 「今月あと○円使える」一行サマリー

import { useEffect, useState, useCallback } from 'react'

interface MoneyData {
  budget: number
  spent: number
  remaining: number
  month: string
}

interface Props {
  refreshKey?: number
}

export default function MoneySummary({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<MoneyData | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/money')
      const json = await res.json()
      if (res.ok) setData(json as MoneyData)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  if (!data) return null

  const over = data.remaining < 0
  const ratio = data.budget > 0
    ? Math.min(100, Math.round((data.spent / data.budget) * 100))
    : 0

  return (
    <div className={`money-summary ${over ? 'over' : ''}`}>
      <div className="money-line">
        <span className="money-label">今月</span>
        {over ? (
          <span className="money-main">
            予算を <strong>¥{Math.abs(data.remaining).toLocaleString()}</strong> オーバー
          </span>
        ) : (
          <span className="money-main">
            あと <strong>¥{data.remaining.toLocaleString()}</strong> 使える
          </span>
        )}
        <span className="money-sub">
          ¥{data.spent.toLocaleString()} / ¥{data.budget.toLocaleString()}
        </span>
      </div>
      <div className="money-bar-wrap">
        <div className="money-bar" style={{ width: `${ratio}%` }} />
      </div>

      <style jsx>{`
        .money-summary {
          padding: 12px 14px;
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px;
        }
        .money-summary.over {
          border-color: #ef4444;
        }
        .money-line {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .money-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-muted, #9ca3af);
        }
        .money-main {
          font-size: 15px;
          color: var(--color-text, #1a1a1a);
        }
        .money-main strong {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-accent, #7c6af7);
        }
        .money-summary.over .money-main strong { color: #ef4444; }
        .money-sub {
          font-size: 12px;
          color: var(--color-muted, #9ca3af);
          margin-left: auto;
        }
        .money-bar-wrap {
          height: 6px;
          background: var(--color-border, #e5e7eb);
          border-radius: 3px;
          overflow: hidden;
        }
        .money-bar {
          height: 100%;
          background: var(--color-accent, #7c6af7);
          border-radius: 3px;
          transition: width .4s ease;
        }
        .money-summary.over .money-bar { background: #ef4444; }
      `}</style>
    </div>
  )
}
