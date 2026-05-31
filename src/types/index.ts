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

// ── スケジュール管理 ────────────────────────────────────────────

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface DayAvailability {
  enabled: boolean
  slots: TimeSlot[]
}

// keys: "0"=日, "1"=月, "2"=火, "3"=水, "4"=木, "5"=金, "6"=土 (JS getDay() 準拠)
export type WeeklyTemplate = Record<string, DayAvailability>

export interface ScheduleBlock {
  id: string
  blocked_date: string  // YYYY-MM-DD
  note: string | null
  created_at: string
}

export interface CandidateDate {
  date: string         // YYYY-MM-DD
  dayLabel: string     // "6月5日(木)"
  slots: TimeSlot[]
  slotLabels: string[] // ["午後", "夜"]
}
