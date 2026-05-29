// src/lib/supabase/admin.ts
// 一人用：サービスロールキーで直接DBにアクセスするクライアント
// （RLSを無視できる。サーバー側でのみ使うこと。ブラウザに絶対露出させない）

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // ← anon key ではなく service_role
    { auth: { persistSession: false } }
  )
}

// 固定ユーザーID（あなた一人ぶん）
// 環境変数で上書きできるが、未設定ならこの既定値を使う
export const USER_ID =
  process.env.APP_USER_ID ?? '00000000-0000-0000-0000-000000000001'
