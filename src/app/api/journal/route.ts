// src/app/api/journal/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { analyzeJournal } from '@/lib/ai/gemini'
import { gcalCreate, isGoogleConnected } from '@/lib/google/calendar'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  const { body } = await req.json()
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const analysis = await analyzeJournal(body.trim())

  // 1. ジャーナルを保存
  const { data, error } = await supabase
    .from('journals')
    .insert({
      user_id:  USER_ID,
      body:     body.trim(),
      mood:     analysis.mood,
      tags:     analysis.tags,
      category: analysis.category,
      metadata: { ...analysis.metadata, summary_line: analysis.summary_line },
    })
    .select()
    .single()

  if (error) {
    console.error('[journal/route]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. タスクを自動追加
  const addedTasks: string[] = []
  if (analysis.auto_tasks?.length) {
    const { error: taskErr } = await supabase.from('tasks').insert(
      analysis.auto_tasks.map(title => ({ user_id: USER_ID, title }))
    )
    if (!taskErr) addedTasks.push(...analysis.auto_tasks)
  }

  // 3. 予定を自動追加
  const addedEvents: string[] = []
  if (analysis.auto_events?.length) {
    for (const ev of analysis.auto_events) {
      const { data: evData, error: evErr } = await supabase
        .from('schedule_events')
        .insert({
          user_id:    USER_ID,
          title:      ev.title,
          event_date: ev.date,
          start_time: ev.start_time ?? null,
          end_time:   ev.end_time   ?? null,
        })
        .select('id')
        .single()

      if (!evErr && evData) {
        addedEvents.push(ev.title)

        // Google Calendar にも Push
        if (isGoogleConnected()) {
          const googleId = await gcalCreate({
            title: ev.title, event_date: ev.date,
            start_time: ev.start_time ?? null,
            end_time:   ev.end_time   ?? null,
            note: null,
          })
          if (googleId) {
            await supabase.from('schedule_events')
              .update({ google_event_id: googleId })
              .eq('id', evData.id)
          }
        }
      }
    }
  }

  const aiError = (analysis as { _aiError?: string })._aiError
  return NextResponse.json({ journal: data, analysis, addedTasks, addedEvents, aiError })
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('journals')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(50)

  if (category) query = query.eq('category', category)
  if (from)     query = query.gte('created_at', from)
  if (to)       query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ journals: data })
}
