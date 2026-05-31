// src/app/api/schedule/events/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { gcalCreate, gcalUpdate, gcalDelete, isGoogleConnected } from '@/lib/google/calendar'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const month = new URL(req.url).searchParams.get('month') // YYYY-MM

  let query = supabase
    .from('schedule_events')
    .select('*')
    .eq('user_id', USER_ID)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
    query = query.gte('event_date', start).lte('event_date', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { title, date, start_time, end_time, note } = await req.json()

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: 'title と date は必須です' }, { status: 400 })
  }

  // 1. DBに保存
  const { data, error } = await supabase
    .from('schedule_events')
    .insert({
      user_id: USER_ID,
      title: title.trim(),
      event_date: date,
      start_time: start_time || null,
      end_time:   end_time   || null,
      note:       note?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. Google Calendar に Push（失敗してもDBは確定させる）
  if (isGoogleConnected()) {
    const googleId = await gcalCreate({
      title: title.trim(), event_date: date,
      start_time: start_time || null, end_time: end_time || null,
      note: note?.trim() || null,
    })
    if (googleId) {
      await supabase.from('schedule_events')
        .update({ google_event_id: googleId })
        .eq('id', data.id)
    }
  }

  return NextResponse.json({ event: data })
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const { id, title, date, start_time, end_time, note } = await req.json()

  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

  // 既存の google_event_id を取得
  const { data: existing } = await supabase
    .from('schedule_events')
    .select('google_event_id')
    .eq('id', id).eq('user_id', USER_ID)
    .single()

  // 1. DBを更新
  const { data, error } = await supabase
    .from('schedule_events')
    .update({
      title: title.trim(), event_date: date,
      start_time: start_time || null, end_time: end_time || null,
      note: note?.trim() || null,
    })
    .eq('id', id).eq('user_id', USER_ID)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. Google Calendar を更新
  if (isGoogleConnected() && existing?.google_event_id) {
    await gcalUpdate(existing.google_event_id, {
      title: title.trim(), event_date: date,
      start_time: start_time || null, end_time: end_time || null,
      note: note?.trim() || null,
    })
  }

  return NextResponse.json({ event: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { id } = await req.json()

  // google_event_id を取得してから削除
  const { data: existing } = await supabase
    .from('schedule_events')
    .select('google_event_id')
    .eq('id', id).eq('user_id', USER_ID)
    .single()

  const { error } = await supabase
    .from('schedule_events')
    .delete()
    .eq('id', id).eq('user_id', USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Google Calendar からも削除
  if (isGoogleConnected() && existing?.google_event_id) {
    await gcalDelete(existing.google_event_id)
  }

  return NextResponse.json({ ok: true })
}
