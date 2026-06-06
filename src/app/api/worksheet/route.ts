// src/app/api/worksheet/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('worksheet_answers')
    .select('answers')
    .eq('user_id', USER_ID)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ answers: data?.answers ?? {} })
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const { section, data: sectionData } = await req.json()

  if (!section) return NextResponse.json({ error: 'section is required' }, { status: 400 })

  // 既存のanswerを取得してマージ
  const { data: existing } = await supabase
    .from('worksheet_answers')
    .select('answers')
    .eq('user_id', USER_ID)
    .maybeSingle()

  const merged = { ...(existing?.answers ?? {}), [section]: sectionData }

  const { error } = await supabase
    .from('worksheet_answers')
    .upsert({ user_id: USER_ID, answers: merged }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
