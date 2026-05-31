// src/app/api/schedule/settings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'
import { WeeklyTemplate } from '@/types'

const DEFAULT_TEMPLATE: WeeklyTemplate = Object.fromEntries(
  [0, 1, 2, 3, 4, 5, 6].map(d => [
    String(d),
    { enabled: false, slots: [] },
  ])
)

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('schedule_settings')
    .select('weekly_template')
    .eq('user_id', USER_ID)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    weekly_template: data?.weekly_template ?? DEFAULT_TEMPLATE,
  })
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const { weekly_template } = await req.json()

  const { error } = await supabase
    .from('schedule_settings')
    .upsert({ user_id: USER_ID, weekly_template, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
