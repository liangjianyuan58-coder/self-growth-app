# 涼のログ — セットアップ手順

## 必要なもの

- Node.js 20+
- Supabaseアカウント（無料）
- Anthropic APIキー

---

## 1. Supabase セットアップ

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase/schema.sql` の内容を実行
3. Project Settings → API から URL と anon key をコピー

---

## 2. ローカル起動

```bash
# 1. 依存インストール
npm install

# 2. 環境変数
cp .env.local.example .env.local
# .env.local を編集してキーを入れる

# 3. 起動
npm run dev
# → http://localhost:3000 で開く
```

---

## 3. Vercel デプロイ

```bash
# Vercel CLI インストール（初回のみ）
npm i -g vercel

# デプロイ
vercel

# 環境変数を Vercel にも設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY
```

Vercel の管理画面 → Settings → Environment Variables からGUIで設定しても OK。

---

## 4. ファイル構成

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
│   │   ├── client.ts          # ブラウザ用
│   │   └── server.ts          # サーバー用
│   └── ai/
│       └── claude.ts          # AI分析・サマリー生成
└── types/index.ts
```

---

## 5. 次のフェーズで追加できるもの

- [ ] Supabase Auth（メール認証）
- [ ] 支出グラフ（Recharts）
- [ ] セマンティック検索（pgvector + embedding）
- [ ] 目標管理ページ
- [ ] Xポスト草稿のコピーボタン

---

## カテゴリ自動判定の例

| 書いたメモ | 分類 |
|---|---|
| 「ランチ850円 松屋」 | 💰 支出 |
| 「宇宙兄弟読み終えた。小栗旬の話が刺さった」 | 📚 インプット |
| 「今日は1on1うまくいった気がする」 | 📓 日記 |
| 「今週中に資料作成終わらせる」 | 🎯 目標 |
