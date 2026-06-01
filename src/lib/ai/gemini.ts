// src/lib/ai/gemini.ts
// Claude API (Anthropic) でジャーナル分析・週次サマリーを生成

import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisResult, Journal, WeeklyPatterns } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function callClaude(prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text : ''
}

// --------------------------------------------------------
// ジャーナルエントリの自動分析
// --------------------------------------------------------
export async function analyzeJournal(body: string): Promise<AnalysisResult> {
  const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

  const prompt = `今日の日付: ${today}

以下のメモを分析して JSON のみを返してください（前後に余分なテキストは不要）。

メモ: """${body}"""

返す JSON のスキーマ:
{
  "category": "journal" | "money" | "input" | "goal",
  "tags": string[],
  "mood": 1 | 2 | 3 | 4 | 5,
  "metadata": {
    "amount": number,
    "expense_category": "食費" | "交通費" | "娯楽" | "仕事" | "健康" | "その他",
    "label": string,
    "source_type": "book" | "anime" | "article" | "podcast" | "other",
    "title": string,
    "highlight": string,
    "output_draft": string,
    "progress_note": string
  },
  "summary_line": string,
  "auto_tasks": string[],
  "auto_events": [
    {
      "title": string,
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM" | null,
      "end_time": "HH:MM" | null
    }
  ]
}

カテゴリ判定:
- 金額・支出が含まれる → money
- 本・アニメ・記事・知識のメモ → input
- 目標への言及 → goal
- それ以外 → journal

metadata はカテゴリに関係するフィールドのみ含めること。
auto_tasks: 「〜しなきゃ」「〜する必要がある」など明確なTODOのみ。なければ []
auto_events: 具体的な日付・時刻が書かれているものだけ。"明日" → ${today}の翌日。なければ []`

  try {
    const text = await callClaude(prompt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult
    return {
      ...parsed,
      auto_tasks:  parsed.auto_tasks  ?? [],
      auto_events: parsed.auto_events ?? [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[claude] analyzeJournal failed:', message)
    return {
      category: 'journal',
      tags: [],
      mood: 3,
      metadata: {},
      summary_line: body.slice(0, 15),
      auto_tasks: [],
      auto_events: [],
      _aiError: message,
    }
  }
}

// --------------------------------------------------------
// 週次サマリー生成
// --------------------------------------------------------
export async function generateWeeklySummary(
  journals: Journal[]
): Promise<{ summary: string; patterns: WeeklyPatterns }> {
  if (journals.length === 0) {
    return {
      summary: 'この週のログはありません。',
      patterns: {
        strengths: [], struggles: [],
        money_total: 0, money_breakdown: {},
        inputs: [], mood_avg: 0, entry_count: 0,
      },
    }
  }

  const moneyEntries = journals.filter(j => j.category === 'money')
  const money_total = moneyEntries.reduce((s, j) => s + ((j.metadata as { amount?: number }).amount ?? 0), 0)

  const money_breakdown: Record<string, number> = {}
  moneyEntries.forEach(j => {
    const m = j.metadata as { expense_category?: string; amount?: number }
    const cat = m.expense_category ?? 'その他'
    money_breakdown[cat] = (money_breakdown[cat] ?? 0) + (m.amount ?? 0)
  })

  const inputEntries = journals
    .filter(j => j.category === 'input')
    .map(j => {
      const m = j.metadata as { title?: string; source_type?: string }
      return { title: m.title ?? '', source_type: m.source_type ?? 'other' }
    })

  const moodsWithValue = journals.filter(j => j.mood)
  const mood_avg = moodsWithValue.length
    ? moodsWithValue.reduce((s, j) => s + (j.mood ?? 0), 0) / moodsWithValue.length
    : 0

  const entrySummaries = journals
    .map(j => `[${j.created_at.slice(0, 10)}] ${'summary_line' in (j.metadata as object) ? (j.metadata as unknown as { summary_line: string }).summary_line : j.body.slice(0, 40)}`)
    .join('\n')

  const prompt = `以下は1週間のログ一覧です。

${entrySummaries}

この週を振り返り、以下の JSON のみを返してください（前後に余分なテキストは不要）:
{
  "summary": string,
  "strengths": string[],
  "struggles": string[]
}`

  try {
    const text = await callClaude(prompt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary: string; strengths: string[]; struggles: string[]
    }
    return {
      summary: parsed.summary,
      patterns: {
        strengths: parsed.strengths ?? [],
        struggles: parsed.struggles ?? [],
        money_total, money_breakdown, inputs: inputEntries,
        mood_avg: Math.round(mood_avg * 10) / 10,
        entry_count: journals.length,
      },
    }
  } catch {
    return {
      summary: '週次サマリーの生成に失敗しました。',
      patterns: {
        strengths: [], struggles: [],
        money_total, money_breakdown, inputs: inputEntries,
        mood_avg: Math.round(mood_avg * 10) / 10,
        entry_count: journals.length,
      },
    }
  }
}
