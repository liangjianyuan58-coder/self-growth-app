// src/lib/ai/gemini.ts
// Google Gemini Flash（無料枠: 1日1,500リクエスト）

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AnalysisResult, Journal, WeeklyPatterns } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// JSON モードで確実に JSON を返させる
function getModel() {
  return genai.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
}

// --------------------------------------------------------
// ジャーナルエントリの自動分析
// --------------------------------------------------------
export async function analyzeJournal(body: string): Promise<AnalysisResult> {
  const prompt = `以下のメモを分析して JSON で返してください。

メモ: """${body}"""

返す JSON のスキーマ:
{
  "category": "journal" | "money" | "input" | "goal",
  "tags": string[],          // 3〜5個、短い日本語タグ
  "mood": 1 | 2 | 3 | 4 | 5, // 1=低調 5=好調
  "metadata": {
    // category が money の場合
    "amount": number,
    "expense_category": "食費" | "交通費" | "娯楽" | "仕事" | "健康" | "その他",
    "label": string,

    // category が input の場合
    "source_type": "book" | "anime" | "article" | "podcast" | "other",
    "title": string,
    "highlight": string,
    "output_draft": string,

    // category が goal の場合
    "progress_note": string,

    // category が journal の場合は {}
  },
  "summary_line": string      // 15字以内の1行要約
}

判定基準:
- 金額・支出が含まれる → money
- 本・アニメ・記事・メモした知識 → input
- 目標への言及 → goal
- それ以外 → journal`

  try {
    const result = await getModel().generateContent(prompt)
    return JSON.parse(result.response.text()) as AnalysisResult
  } catch {
    return {
      category: 'journal',
      tags: [],
      mood: 3,
      metadata: {},
      summary_line: body.slice(0, 15),
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

  // JS側で集計（APIトークン節約）
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

この週を振り返り、以下の JSON を返してください:
{
  "summary": string,       // 3〜4文の週次振り返り文
  "strengths": string[],   // うまくいったこと・パターン（2〜3個）
  "struggles": string[]    // 課題・気になったこと（1〜2個）
}`

  try {
    const result = await getModel().generateContent(prompt)
    const parsed = JSON.parse(result.response.text()) as {
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
