// src/app/api/settings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, USER_ID } from '@/lib/supabase/admin'

const DEFAULTS = {
  current_balance: 0,
  monthly_budget:  Number(process.env.MONTHLY_BUDGET ?? 100000),
  weekly_budget:   25000,
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', USER_ID)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? { user_id: USER_ID, ...DEFAULTS })
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json() as {
    current_balance?: number
    monthly_budget?:  number
    weekly_budget?:   number
  }

  const patch: { user_id: string; current_balance?: number; monthly_budget?: number; weekly_budget?: number } = {
    user_id: USER_ID,
  }
  if (body.current_balance !== undefined) patch.current_balance = Number(body.current_balance)
  if (body.monthly_budget  !== undefined) patch.monthly_budget  = Number(body.monthly_budget)
  if (body.weekly_budget   !== undefined) patch.weekly_budget   = Number(body.weekly_budget)

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(patch, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
