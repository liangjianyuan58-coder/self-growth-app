// src/app/api/schedule/sync/google/route.ts
// Google Calendar → このアプリ への同期（Pull）

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { gcalList, parseGCalEvent, isGoogleConnected } from '@/lib/google/calendar'

// 接続状態の確認
export async function GET() {
  return NextResponse.json({ connected: isGoogleConnected() })
}

// 指定月を Google Calendar から Pull して DB にマージ
export async function POST(req: NextRequest) {
  if (!isGoogleConnected()) {
    return NextResponse.json({ error: 'Google Calendar が未設定です' }, { status: 400 })
  }

  const { month } = await req.json() as { month?: string } // "YYYY-MM"
  const [year, m] = (month ?? new Date().toISOString().slice(0, 7)).split('-').map(Number)

  const gEvents = await gcalList(year, m - 1)
  if (gEvents.length === 0) return NextResponse.json({ created: 0, updated: 0 })

  const supabase = createAdminClient()

  // 既存の google_event_id マップを取得
  const { data: existing } = await supabase
    .from('schedule_events')
    .select('id, google_event_id')
    .eq('user_id', USER_ID)
    .not('google_event_id', 'is', null)

  const gIdMap = new Map((existing ?? []).map(e => [e.google_event_id as string, e.id as string]))

  let created = 0
  let updated = 0

  for (const gev of gEvents) {
    if (!gev.id) continue
    const { event_date, start_time, end_time } = parseGCalEvent(gev)
    const fields = {
      title:      gev.summary?.trim() || '(タイトルなし)',
      event_date,
      start_time,
      end_time,
      note:       gev.description?.trim() || null,
    }

    if (gIdMap.has(gev.id)) {
      // 既存を更新
      await supabase.from('schedule_events').update(fields)
        .eq('google_event_id', gev.id).eq('user_id', USER_ID)
      updated++
    } else {
      // 新規作成
      await supabase.from('schedule_events').insert({
        user_id: USER_ID, google_event_id: gev.id, ...fields,
      })
      created++
    }
  }

  return NextResponse.json({ created, updated })
}
