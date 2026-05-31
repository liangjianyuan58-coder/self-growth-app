// src/app/api/goals/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { title, description, due_date } = await req.json() as {
    title: string; description?: string; due_date?: string
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id:     USER_ID,
      title:       title.trim(),
      description: description?.trim() || null,
      due_date:    due_date || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data })
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const { id, title, description, due_date, status } = await req.json() as {
    id: string; title?: string; description?: string; due_date?: string | null; status?: string
  }

  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (title       !== undefined) patch.title       = title.trim()
  if (description !== undefined) patch.description = description?.trim() || null
  if (due_date    !== undefined) patch.due_date    = due_date || null
  if (status      !== undefined) patch.status      = status

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', id)
    .eq('user_id', USER_ID)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { id } = await req.json() as { id: string }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
