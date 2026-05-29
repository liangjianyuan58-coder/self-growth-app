# 涼のログ — セットアップ手順（一人用モード）

ログインなしの **一人用** 構成です。サーバー側から Supabase の service_role キーで
直接読み書きし、固定ユーザーIDで全データを管理します。

## 必要なもの

- Node.js 20+
- Supabaseアカウント（無料）
- Anthropic APIキー

---

## 1. Supabase セットアップ

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor で **`supabase/schema-single-user.sql`** の内容を実行
   - ⚠️ 旧 `schema.sql` は使わないこと。あちらは `auth.users` への外部キーが
     付いており、一人用の固定ユーザーIDだと **保存時に外部キー違反でエラー** になります。
   - すでに `schema.sql` を実行済みの場合は、テーブルを作り直すか、
     `schema-single-user.sql` の「RLS無効化」部分と外部キー削除を実行してください。
3. Project Settings → API から以下をコピー
   - `Project URL`
   - `anon public` キー
   - **`service_role` キー**（※絶対に公開しない。ブラウザに出さない）

---

## 2. 環境変数

`.env.local.example` をコピーして `.env.local` を作り、キーを入れます。

```bash
cp .env.local.example .env.local
```

| 変数 | 内容 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public キー |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role キー（一人用で必須）** |
| `ANTHROPIC_API_KEY` | Anthropic APIキー |
| `APP_USER_ID` | （任意）固定ユーザーID。未設定なら既定値を使用 |

---

## 3. ローカル起動

```bash
npm install
npm run dev
# → http://localhost:3000 で開く
```

---

## 4. Vercel デプロイ

```bash
npm i -g vercel   # 初回のみ
vercel
```

環境変数は Vercel 管理画面 → Settings → Environment Variables から **4つすべて** 設定します。

| 変数 | 必須 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ |
| `ANTHROPIC_API_KEY` | ✓ |

> `SUPABASE_SERVICE_ROLE_KEY` の設定漏れに注意（これが無いと保存・取得が500エラーになります）。

---

## 5. ファイル構成

```
src/
├── app/
│   ├── api/
│   │   ├── journal/route.ts   # POST(保存+AI分析) / GET(一覧)
│   │   └── summary/route.ts   # GET(週次取得) / POST(再生成)
│   ├── journal/page.tsx       # メイン入力画面
│   ├── review/page.tsx        # 週次レビュー画面
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── journal/
│   │   ├── JournalInput.tsx   # 入力フォーム + AI分析バナー
│   │   └── JournalFeed.tsx    # ログ一覧
│   ├── review/
│   │   └── WeeklyReview.tsx   # 週次まとめ
│   └── ui/
│       └── BottomNav.tsx
├── lib/
│   ├── supabase/
│   │   └── admin.ts           # service_role クライアント + 固定USER_ID
│   └── ai/
│       └── claude.ts          # AI分析・サマリー生成
└── types/index.ts
```

> `lib/supabase/client.ts` `server.ts`（認証あり版の名残）は一人用モードでは未使用です。

---

## 6. 次のフェーズで追加できるもの

- [ ] セマンティック検索（pgvector + embedding 生成）
- [ ] 検索UI（日付・人名・場所の三軸）
- [ ] 目標管理ページ（goals テーブルは用意済み）
- [ ] レシートOCR
- [ ] Supabase Auth（複数ユーザー化する場合）

---

## カテゴリ自動判定の例

| 書いたメモ | 分類 |
|---|---|
| 「ランチ850円 松屋」 | 💰 支出 |
| 「宇宙兄弟読み終えた。小栗旬の話が刺さった」 | 📚 インプット |
| 「今日は1on1うまくいった気がする」 | 📓 日記 |
| 「今週中に資料作成終わらせる」 | 🎯 目標 |
