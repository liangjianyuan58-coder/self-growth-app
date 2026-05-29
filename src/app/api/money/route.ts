// src/app/api/money/route.ts
// 一人用：今月の支出合計と「あと○円使えるか」を返す

import { NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

// 月次予算（円）。env で上書き可、未設定なら既定値
const MONTHLY_BUDGET = Number(process.env.MONTHLY_BUDGET ?? 100000)

function monthRange(now = new Date()): { start: string; end: string } {
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1).toISOString().slice(0, 10)
  const end = new Date(y, m + 1, 1).toISOString().slice(0, 10) // 翌月1日（未満で絞る）
  return { start, end }
}

export async function GET() {
  const supabase = createAdminClient()
  const { start, end } = monthRange()

  const { data, error } = await supabase
    .from('journals')
    .select('metadata')
    .eq('user_id', USER_ID)
    .eq('category', 'money')
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const spent = (data ?? []).reduce((sum: number, row: { metadata: unknown }) => {
    const amount = (row.metadata as { amount?: number })?.amount ?? 0
    return sum + (typeof amount === 'number' ? amount : 0)
  }, 0)

  return NextResponse.json({
    budget: MONTHLY_BUDGET,
    spent,
    remaining: MONTHLY_BUDGET - spent,
    month: start.slice(0, 7),
  })
}
