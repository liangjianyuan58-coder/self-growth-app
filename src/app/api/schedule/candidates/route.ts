// src/app/api/schedule/candidates/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import type { CandidateDate, TimeRange, WeeklyTemplate } from '@/types'

const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateJP(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日(${JP_DAYS[d.getDay()]})`
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d); c.setDate(c.getDate() + n); return c
}

// toISOString() は UTC → JST ずれ防止のため toLocaleDateString を使用
function toISO(d: Date): string {
  return d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

function hhmm(t: string): string { return t.slice(0, 5) }

// 旧形式(slots)を新形式(ranges)に変換
function normalizeDay(raw: Record<string, unknown>): { enabled: boolean; ranges: TimeRange[] } {
  if (Array.isArray(raw.ranges)) {
    return { enabled: Boolean(raw.enabled), ranges: raw.ranges as TimeRange[] }
  }
  // legacy slots format
  const slotMap: Record<string, TimeRange> = {
    morning:   { from: '09:00', to: '12:00' },
    afternoon: { from: '13:00', to: '18:00' },
    evening:   { from: '19:00', to: '22:00' },
  }
  const slots = (raw.slots as string[] | undefined) ?? []
  return {
    enabled: Boolean(raw.enabled),
    ranges: slots.map(s => slotMap[s]).filter(Boolean),
  }
}

function buildCandidates(
  template: WeeklyTemplate,
  blockedSet: Set<string>,
  count: number,
): CandidateDate[] {
  const results: CandidateDate[] = []
  let cursor = addDays(new Date(), 1)

  for (let i = 0; i < 120 && results.length < count; i++) {
    const iso = toISO(cursor)
    const raw = template[String(cursor.getDay())]
    if (raw) {
      const day = normalizeDay(raw as unknown as Record<string, unknown>)
      if (day.enabled && day.ranges.length > 0 && !blockedSet.has(iso)) {
        results.push({
          date: iso,
          dayLabel: formatDateJP(cursor),
          ranges: day.ranges,
          rangeLabels: day.ranges.map(r => `${hhmm(r.from)}〜${hhmm(r.to)}`),
        })
      }
    }
    cursor = addDays(cursor, 1)
  }
  return results
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const count = Math.min(Number(new URL(req.url).searchParams.get('count') ?? '5'), 10)

  const [settingsRes, blocksRes] = await Promise.all([
    supabase.from('schedule_settings').select('weekly_template').eq('user_id', USER_ID).maybeSingle(),
    supabase.from('schedule_blocks').select('blocked_date').eq('user_id', USER_ID),
  ])

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })
  if (blocksRes.error)   return NextResponse.json({ error: blocksRes.error.message  }, { status: 500 })

  const template: WeeklyTemplate = settingsRes.data?.weekly_template ?? {}
  const blockedSet = new Set((blocksRes.data ?? []).map(b => b.blocked_date as string))

  return NextResponse.json({ candidates: buildCandidates(template, blockedSet, count) })
}
