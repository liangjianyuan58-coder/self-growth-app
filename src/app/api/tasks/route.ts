// src/app/api/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', USER_ID)
    .order('done', { ascending: true })        // 未完了を上に
    .order('created_at', { ascending: false }) // 新しい順

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { title, note } = await req.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: USER_ID, title: title.trim(), note: note?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const { id, done, title, note } = await req.json()

  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof done === 'boolean') {
    updates.done = done
    updates.done_at = done ? new Date().toISOString() : null
  }
  if (title !== undefined) updates.title = title.trim()
  if (note !== undefined)  updates.note  = note?.trim() || null

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', USER_ID)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { id } = await req.json()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
