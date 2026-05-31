// src/app/api/money/route.ts

import { NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

const DEFAULT_MONTHLY = Number(process.env.MONTHLY_BUDGET ?? 100000)
const DEFAULT_WEEKLY  = 25000

function monthRange(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth()
  return {
    start: new Date(y, m, 1).toISOString().slice(0, 10),
    end:   new Date(y, m + 1, 1).toISOString().slice(0, 10),
  }
}

function weekRange(now = new Date()) {
  // 月曜始まり
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const next = new Date(mon)
  next.setDate(mon.getDate() + 7)
  return {
    start: mon.toISOString().slice(0, 10),
    end:   next.toISOString().slice(0, 10),
  }
}

export async function GET() {
  const supabase = createAdminClient()

  // ユーザー設定を取得（なければデフォルト）
  const { data: settings } = await supabase
    .from('user_settings')
    .select('current_balance, monthly_budget, weekly_budget')
    .eq('user_id', USER_ID)
    .maybeSingle()

  const monthly_budget  = settings?.monthly_budget  ?? DEFAULT_MONTHLY
  const weekly_budget   = settings?.weekly_budget   ?? DEFAULT_WEEKLY
  const current_balance = settings?.current_balance ?? 0

  const { start: mStart, end: mEnd } = monthRange()
  const { start: wStart, end: wEnd } = weekRange()

  // 今月の支出エントリを取得
  const { data: rows, error } = await supabase
    .from('journals')
    .select('metadata, created_at')
    .eq('user_id', USER_ID)
    .eq('category', 'money')
    .gte('created_at', mStart)
    .lt('created_at', mEnd)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const breakdown: Record<string, number> = {}
  let monthly_spent = 0
  let weekly_spent  = 0

  for (const row of rows ?? []) {
    const meta   = row.metadata as { amount?: number; expense_category?: string }
    const amount = typeof meta.amount === 'number' ? meta.amount : 0
    const cat    = meta.expense_category ?? 'その他'

    monthly_spent        += amount
    breakdown[cat]        = (breakdown[cat] ?? 0) + amount

    const date = (row.created_at as string).slice(0, 10)
    if (date >= wStart && date < wEnd) weekly_spent += amount
  }

  return NextResponse.json({
    current_balance,
    monthly_budget,
    monthly_spent,
    monthly_remaining: monthly_budget - monthly_spent,
    weekly_budget,
    weekly_spent,
    weekly_remaining: weekly_budget - weekly_spent,
    breakdown,
    month: mStart.slice(0, 7),
  })
}
