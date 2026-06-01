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

function toISO(d: Date): string {
  return d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

function hhmm(t: string): string { return t.slice(0, 5) }

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

// テンプレート時間帯から既存予定を除いた空き時間を計算（30分未満は除外）
function subtractBusy(ranges: TimeRange[], busy: TimeRange[]): TimeRange[] {
  let result = [...ranges]
  for (const b of busy) {
    const bStart = toMinutes(b.from)
    const bEnd   = toMinutes(b.to)
    const next: TimeRange[] = []
    for (const r of result) {
      const rStart = toMinutes(r.from)
      const rEnd   = toMinutes(r.to)
      if (bEnd <= rStart || bStart >= rEnd) {
        next.push(r)
      } else {
        if (rStart < bStart) next.push({ from: r.from,               to: fromMinutes(bStart) })
        if (rEnd   > bEnd)   next.push({ from: fromMinutes(bEnd),    to: r.to })
      }
    }
    result = next
  }
  return result.filter(r => toMinutes(r.to) - toMinutes(r.from) >= 30)
}

// 旧形式(slots)を新形式(ranges)に変換
function normalizeDay(raw: Record<string, unknown>): { enabled: boolean; ranges: TimeRange[] } {
  if (Array.isArray(raw.ranges)) {
    return { enabled: Boolean(raw.enabled), ranges: raw.ranges as TimeRange[] }
  }
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
  busyMap: Map<string, TimeRange[]>,
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
        const busy = busyMap.get(iso) ?? []
        const freeRanges = busy.length > 0 ? subtractBusy(day.ranges, busy) : day.ranges
        if (freeRanges.length > 0) {
          results.push({
            date: iso,
            dayLabel: formatDateJP(cursor),
            ranges: freeRanges,
            rangeLabels: freeRanges.map(r => `${hhmm(r.from)}〜${hhmm(r.to)}`),
          })
        }
      }
    }
    cursor = addDays(cursor, 1)
  }
  return results
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const count = Math.min(Number(new URL(req.url).searchParams.get('count') ?? '5'), 10)

  const rangeStart = toISO(addDays(new Date(), 1))
  const rangeEnd   = toISO(addDays(new Date(), 121))

  const [settingsRes, blocksRes, eventsRes] = await Promise.all([
    supabase.from('schedule_settings').select('weekly_template').eq('user_id', USER_ID).maybeSingle(),
    supabase.from('schedule_blocks').select('blocked_date').eq('user_id', USER_ID),
    supabase.from('schedule_events')
      .select('event_date, start_time, end_time')
      .eq('user_id', USER_ID)
      .gte('event_date', rangeStart)
      .lte('event_date', rangeEnd),
  ])

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })
  if (blocksRes.error)   return NextResponse.json({ error: blocksRes.error.message  }, { status: 500 })

  const template: WeeklyTemplate = settingsRes.data?.weekly_template ?? {}
  const blockedSet = new Set((blocksRes.data ?? []).map(b => b.blocked_date as string))

  // 既存予定をdateでグループ化（start/end両方ある予定のみ）
  const busyMap = new Map<string, TimeRange[]>()
  for (const ev of eventsRes.data ?? []) {
    if (ev.start_time && ev.end_time) {
      const date = ev.event_date as string
      const entry: TimeRange = { from: hhmm(ev.start_time as string), to: hhmm(ev.end_time as string) }
      busyMap.set(date, [...(busyMap.get(date) ?? []), entry])
    }
  }

  return NextResponse.json({ candidates: buildCandidates(template, blockedSet, busyMap, count) })
}
