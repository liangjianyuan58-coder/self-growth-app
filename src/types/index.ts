// src/types/index.ts

export type Category = 'journal' | 'money' | 'input' | 'goal'

export interface Journal {
  id: string
  user_id: string
  body: string
  mood: 1 | 2 | 3 | 4 | 5 | null
  tags: string[]
  category: Category | null
  metadata: JournalMetadata
  created_at: string
  updated_at: string
}

// category 別の metadata スキーマ
export type JournalMetadata =
  | MoneyMetadata
  | InputMetadata
  | GoalMetadata
  | Record<string, never>

export interface MoneyMetadata {
  amount: number
  expense_category: string   // 食費 / 交通費 / 娯楽 / その他
  label: string
}

export interface InputMetadata {
  source_type: 'book' | 'anime' | 'article' | 'podcast' | 'other'
  title: string
  highlight: string          // 面白かった箇所
  output_draft?: string      // AIが生成した発信文草稿
}

export interface GoalMetadata {
  goal_id?: string
  progress_note: string
}

// AIが返す分析結果
export interface AnalysisResult {
  category: Category
  tags: string[]
  mood: 1 | 2 | 3 | 4 | 5
  metadata: JournalMetadata
  summary_line: string       // 1行要約（週次レビュー用）
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  status: 'active' | 'done' | 'archived'
  created_at: string
}

export interface WeeklyReview {
  id: string
  user_id: string
  week_start: string
  summary: string | null
  patterns: WeeklyPatterns
  generated_at: string
}

export interface WeeklyPatterns {
  strengths: string[]
  struggles: string[]
  money_total: number
  money_breakdown: Record<string, number>
  inputs: Array<{ title: string; source_type: string }>
  mood_avg: number
  entry_count: number
}
