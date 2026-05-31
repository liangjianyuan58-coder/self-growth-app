// src/app/api/schedule/blocks/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('schedule_blocks')
    .select('id, blocked_date, note, created_at')
    .eq('user_id', USER_ID)
    .gte('blocked_date', today)
    .order('blocked_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ blocks: data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { date, note } = await req.json()

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date は YYYY-MM-DD 形式で指定してください' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .upsert({ user_id: USER_ID, blocked_date: date, note: note ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ block: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { id } = await req.json()

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
