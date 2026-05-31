// src/app/api/schedule/candidates/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { CandidateDate, TimeSlot, WeeklyTemplate } from '@/types'

const SLOT_LABELS: Record<TimeSlot, string> = {
  morning:   '午前',
  afternoon: '午後',
  evening:   '夜',
}

const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateJP(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日(${JP_DAYS[d.getDay()]})`
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildCandidates(
  template: WeeklyTemplate,
  blockedSet: Set<string>,
  count: number,
): CandidateDate[] {
  const results: CandidateDate[] = []
  let cursor = addDays(new Date(), 1) // 明日から探す
  const limit = 120

  for (let i = 0; i < limit && results.length < count; i++) {
    const dow = String(cursor.getDay())
    const iso = toISO(cursor)
    const day = template[dow]

    if (day?.enabled && day.slots.length > 0 && !blockedSet.has(iso)) {
      results.push({
        date: iso,
        dayLabel: formatDateJP(cursor),
        slots: day.slots,
        slotLabels: day.slots.map(s => SLOT_LABELS[s]),
      })
    }
    cursor = addDays(cursor, 1)
  }

  return results
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const count = Number(new URL(req.url).searchParams.get('count') ?? '5')

  const [settingsRes, blocksRes] = await Promise.all([
    supabase.from('schedule_settings').select('weekly_template').eq('user_id', USER_ID).maybeSingle(),
    supabase.from('schedule_blocks').select('blocked_date').eq('user_id', USER_ID),
  ])

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })
  if (blocksRes.error)   return NextResponse.json({ error: blocksRes.error.message  }, { status: 500 })

  const template: WeeklyTemplate = settingsRes.data?.weekly_template ?? {}
  const blockedSet = new Set((blocksRes.data ?? []).map(b => b.blocked_date as string))

  const candidates = buildCandidates(template, blockedSet, Math.min(count, 10))

  return NextResponse.json({ candidates })
}
