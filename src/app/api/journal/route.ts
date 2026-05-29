// src/app/api/journal/route.ts
// 一人用：認証チェックを外し、固定ユーザーIDで保存する

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { analyzeJournal } from '@/lib/ai/claude'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  const { body } = await req.json()
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const analysis = await analyzeJournal(body.trim())

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

  return NextResponse.json({ journal: data, analysis })
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
