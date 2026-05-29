// src/app/api/journal/route.ts
// POST /api/journal — エントリ保存 + AI分析

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeJournal } from '@/lib/ai/claude'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  // AI分析（並行して保存しない — 分析結果を保存に使うため）
  const analysis = await analyzeJournal(body.trim())

  const { data, error } = await supabase
    .from('journals')
    .insert({
      user_id:  user.id,
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

// GET /api/journal — 一覧取得（最新50件）
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const from = searchParams.get('from')   // ISO date
  const to   = searchParams.get('to')

  let query = supabase
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (category) query = query.eq('category', category)
  if (from)     query = query.gte('created_at', from)
  if (to)       query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ journals: data })
}
