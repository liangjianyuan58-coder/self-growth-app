// src/app/api/summary/route.ts
// GET  /api/summary?week=2025-05-26  — 週次サマリー取得（キャッシュ優先）
// POST /api/summary                  — 強制再生成

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklySummary } from '@/lib/ai/claude'
import type { Journal } from '@/types'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay() + 1) // 月曜始まり
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ?? getWeekStart(new Date())
  const weekEnd   = new Date(new Date(weekStart).getTime() + 7 * 86400_000)
    .toISOString().slice(0, 10)

  // キャッシュ確認
  const { data: cached } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  if (cached) return NextResponse.json({ review: cached, cached: true })

  // キャッシュなし → 生成
  return generateAndSave({ supabase, userId: user.id, weekStart, weekEnd })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { week } = await req.json().catch(() => ({}))
  const weekStart = week ?? getWeekStart(new Date())
  const weekEnd   = new Date(new Date(weekStart).getTime() + 7 * 86400_000)
    .toISOString().slice(0, 10)

  return generateAndSave({ supabase, userId: user.id, weekStart, weekEnd, force: true })
}

async function generateAndSave({
  supabase,
  userId,
  weekStart,
  weekEnd,
  force = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  userId: string
  weekStart: string
  weekEnd: string
  force?: boolean
}) {
  const { data: journals, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
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
      { user_id: userId, week_start: weekStart, summary, patterns, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' }
    )
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ review, cached: false, force })
}
