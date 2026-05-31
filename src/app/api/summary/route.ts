// src/app/api/summary/route.ts
// 一人用：認証チェックを外し、固定ユーザーIDで集計する

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { generateWeeklySummary } from '@/lib/ai/gemini'
import type { Journal } from '@/types'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay() + 1) // 月曜始まり
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()

  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ?? getWeekStart(new Date())
  const weekEnd   = new Date(new Date(weekStart).getTime() + 7 * 86400_000)
    .toISOString().slice(0, 10)

  const { data: cached } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('week_start', weekStart)
    .single()

  if (cached) return NextResponse.json({ review: cached, cached: true })

  return generateAndSave({ supabase, weekStart, weekEnd })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  const { week } = await req.json().catch(() => ({}))
  const weekStart = week ?? getWeekStart(new Date())
  const weekEnd   = new Date(new Date(weekStart).getTime() + 7 * 86400_000)
    .toISOString().slice(0, 10)

  return generateAndSave({ supabase, weekStart, weekEnd, force: true })
}

async function generateAndSave({
  supabase,
  weekStart,
  weekEnd,
  force = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  weekStart: string
  weekEnd: string
  force?: boolean
}) {
  const { data: journals, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', USER_ID)
    .gte('created_at', weekStart)
    .lt('created_at', weekEnd)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { summary, patterns } = await generateWeeklySummary(
    (journals as Journal[]) ?? []
  )

  const { data: review, error: upsertError } = await supabase
    .from('weekly_reviews')
    .upsert(
      { user_id: USER_ID, week_start: weekStart, summary, patterns, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' }
    )
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ review, cached: false, force })
}
