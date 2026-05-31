'use client'
// src/components/journal/MoneyDashboard.tsx

import { useEffect, useState, useCallback } from 'react'

interface MoneyData {
  current_balance: number
  monthly_budget: number
  monthly_spent: number
  monthly_remaining: number
  weekly_budget: number
  weekly_spent: number
  weekly_remaining: number
  breakdown: Record<string, number>
  month: string
}

interface Props {
  refreshKey?: number
}

export default function MoneyDashboard({ refreshKey = 0 }: Props) {
  const [data, setData]                 = useState<MoneyData | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [balance, setBalance]           = useState('0')
  const [monthlyBudget, setMonthly]     = useState('100000')
  const [weeklyBudget, setWeekly]       = useState('25000')

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/money')
      const json = await res.json() as MoneyData
      if (res.ok) {
        setData(json)
        setBalance(String(json.current_balance ?? 0))
        setMonthly(String(json.monthly_budget  ?? 100000))
        setWeekly(String(json.weekly_budget    ?? 25000))
      }
    } catch {}
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  async function saveSettings() {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_balance: Number(balance),
          monthly_budget:  Number(monthlyBudget),
          weekly_budget:   Number(weeklyBudget),
        }),
      })
      await load()
      setShowSettings(false)
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null

  const mRatio  = data.monthly_budget > 0
    ? Math.min(100, Math.round((data.monthly_spent / data.monthly_budget) * 100)) : 0
  const wRatio  = data.weekly_budget > 0
    ? Math.min(100, Math.round((data.weekly_spent  / data.weekly_budget)  * 100)) : 0
  const mOver   = data.monthly_remaining < 0
  const wOver   = data.weekly_remaining  < 0

  const breakdown = Object.entries(data.breakdown).sort((a, b) => b[1] - a[1])
  const maxAmt    = breakdown[0]?.[1] ?? 1

  return (
    <div className="dashboard">
      {/* 所持金 */}
      <div className="balance-row">
        <div className="balance-info">
          <span className="balance-label">所持金</span>
          <span className="balance-amount">¥{data.current_balance.toLocaleString()}</span>
        </div>
        <button
          className="gear-btn"
          onClick={() => setShowSettings(v => !v)}
          aria-label="設定"
        >
          ⚙️
        </button>
      </div>

      {/* 月予算 */}
      <BudgetRow
        label="今月"
        spent={data.monthly_spent}
        budget={data.monthly_budget}
        remaining={data.monthly_remaining}
        ratio={mRatio}
        over={mOver}
        barColor={mOver ? '#ef4444' : 'var(--color-accent, #7c6af7)'}
      />

      {/* 週予算 */}
      <BudgetRow
        label="今週"
        spent={data.weekly_spent}
        budget={data.weekly_budget}
        remaining={data.weekly_remaining}
        ratio={wRatio}
        over={wOver}
        barColor={wOver ? '#ef4444' : '#10b981'}
      />

      {/* カテゴリ別グラフ */}
      {breakdown.length > 0 && (
        <div className="chart">
          <p className="chart-title">カテゴリ別（今月）</p>
          {breakdown.map(([cat, amt]) => (
            <div key={cat} className="chart-row">
              <span className="chart-cat">{cat}</span>
              <div className="chart-bar-wrap">
                <div
                  className="chart-bar"
                  style={{ width: `${Math.round((amt / maxAmt) * 100)}%` }}
                />
              </div>
              <span className="chart-amt">¥{amt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* 設定パネル */}
      {showSettings && (
        <div className="settings">
          <p className="settings-title">設定</p>
          <label className="field-label">
            所持金（円）
            <input
              type="number"
              className="field-input"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </label>
          <label className="field-label">
            月予算（円）
            <input
              type="number"
              className="field-input"
              value={monthlyBudget}
              onChange={e => setMonthly(e.target.value)}
            />
          </label>
          <label className="field-label">
            週予算（円）
            <input
              type="number"
              className="field-input"
              value={weeklyBudget}
              onChange={e => setWeekly(e.target.value)}
            />
          </label>
          <div className="settings-actions">
            <button className="cancel-btn" onClick={() => setShowSettings(false)}>
              キャンセル
            </button>
            <button className="save-btn" onClick={saveSettings} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard {
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px;
          background: var(--color-bg-card, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
        }
        .balance-row {
          display: flex; align-items: center; gap: 8px;
        }
        .balance-info { flex: 1; display: flex; align-items: baseline; gap: 8px; }
        .balance-label { font-size: 12px; font-weight: 600; color: var(--color-muted, #9ca3af); }
        .balance-amount { font-size: 20px; font-weight: 700; color: var(--color-text, #1a1a1a); }
        .gear-btn {
          background: none; border: none; cursor: pointer;
          font-size: 16px; padding: 4px; opacity: .5; transition: opacity .15s;
        }
        .gear-btn:hover { opacity: 1; }
        .chart {
          padding-top: 10px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }
        .chart-title {
          font-size: 11px; font-weight: 600;
          color: var(--color-muted, #9ca3af);
          text-transform: uppercase; letter-spacing: .05em;
          margin: 0 0 8px;
        }
        .chart-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
        .chart-cat { font-size: 11px; color: var(--color-text-sub, #4b5563); width: 52px; flex-shrink: 0; }
        .chart-bar-wrap {
          flex: 1; height: 8px;
          background: var(--color-border, #e5e7eb);
          border-radius: 4px; overflow: hidden;
        }
        .chart-bar {
          height: 100%;
          background: var(--color-accent, #7c6af7);
          border-radius: 4px; transition: width .4s ease;
        }
        .chart-amt { font-size: 11px; color: var(--color-muted, #9ca3af); width: 72px; text-align: right; flex-shrink: 0; }
        .settings {
          display: flex; flex-direction: column; gap: 10px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }
        .settings-title {
          font-size: 12px; font-weight: 700;
          color: var(--color-muted, #9ca3af);
          text-transform: uppercase; letter-spacing: .05em; margin: 0;
        }
        .field-label {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 12px; color: var(--color-text-sub, #4b5563);
        }
        .field-input {
          padding: 8px 12px; border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-bg-subtle, #f9fafb);
          font-size: 15px; color: var(--color-text, #1a1a1a); width: 100%;
          box-sizing: border-box;
        }
        .field-input:focus { outline: none; border-color: var(--color-accent, #7c6af7); }
        .settings-actions { display: flex; gap: 8px; justify-content: flex-end; }
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
          transition: opacity .15s;
        }
        .save-btn:disabled { opacity: .4; cursor: default; }
      `}</style>
    </div>
  )
}

function BudgetRow({
  label, spent, budget, remaining, ratio, over, barColor,
}: {
  label: string; spent: number; budget: number; remaining: number
  ratio: number; over: boolean; barColor: string
}) {
  return (
    <div className="row">
      <div className="labels">
        <span className="period">{label}</span>
        <span className="spent">¥{spent.toLocaleString()}</span>
        <span className="limit">/ ¥{budget.toLocaleString()}</span>
        <span className={`rem ${over ? 'over' : ''}`}>
          {over
            ? `¥${Math.abs(remaining).toLocaleString()} オーバー`
            : `あと ¥${remaining.toLocaleString()}`}
        </span>
      </div>
      <div className="bar-wrap">
        <div className="bar" style={{ width: `${ratio}%`, background: barColor }} />
      </div>

      <style jsx>{`
        .row { display: flex; flex-direction: column; gap: 4px; }
        .labels { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
        .period { font-size: 11px; font-weight: 600; color: var(--color-muted, #9ca3af); width: 32px; }
        .spent  { font-size: 14px; font-weight: 600; color: var(--color-text, #1a1a1a); }
        .limit  { font-size: 12px; color: var(--color-muted, #9ca3af); }
        .rem    { font-size: 12px; color: var(--color-accent, #7c6af7); margin-left: auto; }
        .rem.over { color: #ef4444; }
        .bar-wrap {
          height: 6px; background: var(--color-border, #e5e7eb);
          border-radius: 3px; overflow: hidden;
        }
        .bar { height: 100%; border-radius: 3px; transition: width .4s ease; }
      `}</style>
    </div>
  )
}
