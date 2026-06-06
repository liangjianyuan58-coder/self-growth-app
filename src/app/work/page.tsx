'use client'
// src/app/work/page.tsx
// JKが知らない富裕層の仕組み ワークシート

import { useEffect, useState, useCallback, useRef } from 'react'

// ── 型定義 ──────────────────────────────────────────────────────
interface Answers {
  intro?:         { goal?: string; worries?: string; fears?: string }
  money_mindset?: { wishes?: Array<{ item: string; amount: string }> }
  checklist?:     { checked?: string[] }
  cost_benefit?:  { expenses?: Array<{ item: string; type: 'investment' | 'consumption' | 'waste' | '' }> }
  affirmation?:   { exciting?: string; after?: string; place?: string; outfit?: string; sound?: string; people?: string; expression?: string; conversation?: string; symbol?: string; level?: string; howto?: string }
  belief_reset?:  { musts?: Array<{ original: string; rewritten: string }> }
  visualization?: { scene?: string }
  word_power?:    { habits?: Array<{ original: string; positive: string }> }
  compound_time?: { current?: string; ideal_hours?: string; to_cut?: string }
  five_people?:   { inner?: string[]; outer?: string[] }
  mastermind?:    { ideal?: string; where?: string }
  summary?:       { learnings?: string; changes?: string }
}

const CHECKLIST_ITEMS = [
  '体験（旅行・外食・イベント）にお金を使う',
  '必要なものだけを買い、無駄遣いしない',
  '使ったお金・もらったお金に感謝している',
  '自分の成長になる知識・スキルに投資している',
  '大切な人のためにお金を使えている',
  'お金の勉強（本・セミナー）をしている',
  '収入より支出を意識している',
  'お金が自分を助けてくれると思っている',
]

const TYPE_LABEL: Record<string, string> = { investment: '投資', consumption: '消費', waste: '浪費', '': '未分類' }
const TYPE_COLOR: Record<string, string> = { investment: '#10b981', consumption: '#f59e0b', waste: '#ef4444', '': '#9ca3af' }

// ── 保存フック ──────────────────────────────────────────────────
function useSaveSection(section: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')

  const scheduleSave = useCallback((data: unknown) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/worksheet', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, data }),
        })
        if (res.ok) {
          setSaveState('saved')
          setTimeout(() => setSaveState('idle'), 2000)
        } else {
          const json = await res.json().catch(() => ({}))
          console.error('[worksheet] save error:', json)
          setSaveState('error')
          setTimeout(() => setSaveState('idle'), 4000)
        }
      } catch (e) {
        console.error('[worksheet] network error:', e)
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 4000)
      }
    }, 800)
  }, [section])

  return { scheduleSave, saveState }
}

// ── 共通コンポーネント ───────────────────────────────────────────
function SectionCard({ sectionKey, title, emoji, subtitle, children, done }: {
  sectionKey: string; title: string; emoji: string; subtitle?: string
  children: React.ReactNode; done?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`card ${done ? 'done' : ''}`}>
      <button className="card-head" onClick={() => setOpen(v => !v)}>
        <span className="card-emoji">{emoji}</span>
        <div className="card-info">
          <span className="card-title">{title}</span>
          {subtitle && <span className="card-sub">{subtitle}</span>}
        </div>
        <span className="card-status">{done ? '✅' : ''}</span>
        <span className="card-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="card-body">{children}</div>}

      <style jsx>{`
        .card {
          background: var(--color-bg-card); border: 1px solid var(--color-border);
          border-radius: 14px; overflow: hidden;
        }
        .card.done { border-color: #10b981; }
        .card-head {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 16px; background: none; border: none; cursor: pointer; text-align: left;
        }
        .card-emoji { font-size: 22px; flex-shrink: 0; }
        .card-info { flex: 1; display: flex; flex-direction: column; gap: 2px; text-align: left; }
        .card-title { font-size: 14px; font-weight: 700; color: var(--color-text); }
        .card-sub { font-size: 11px; color: var(--color-muted); }
        .card-status { font-size: 14px; }
        .card-arrow { font-size: 10px; color: var(--color-muted); flex-shrink: 0; }
        .card-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 14px; }
      `}</style>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{children}</span>
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
        border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)',
        color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit',
        resize: 'vertical', minHeight: rows * 24 + 20, outline: 'none',
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  )
}

function SavedBadge({ saveState }: { saveState: 'idle' | 'saved' | 'error' }) {
  if (saveState === 'saved') return <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>保存しました ✓</span>
  if (saveState === 'error') return <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>⚠️ 保存失敗 — /setup でテーブルを作成してください</span>
  return null
}

// ── 各セクション ─────────────────────────────────────────────────

function IntroSection({ init }: { init: Answers['intro'] }) {
  const [data, setData] = useState({ goal: '', worries: '', fears: '', ...init })
  const { scheduleSave, saveState } = useSaveSection('intro')

  function update(key: string, val: string) {
    const next = { ...data, [key]: val }
    setData(next); scheduleSave(next)
  }

  return (
    <SectionCard sectionKey="intro" emoji="🌱" title="現状理解" subtitle="まずは今の気持ちを全部吐き出す" done={!!(data.goal && data.worries && data.fears)}>
      <div>
        <Label>このワークを通じてどうなりたいか？</Label>
        <TextArea value={data.goal} onChange={v => update('goal', v)} placeholder="3ヶ月後の自分のイメージを書いてみよう" rows={3} />
      </div>
      <div>
        <Label>今何に悩んでいるか、モヤモヤを全部吐き出す</Label>
        <TextArea value={data.worries} onChange={v => update('worries', v)} placeholder="お金・人間関係・将来・自分自身… なんでもOK" rows={4} />
      </div>
      <div>
        <Label>今、最も不安なことは？</Label>
        <TextArea value={data.fears} onChange={v => update('fears', v)} placeholder="一番心に引っかかっていることを正直に" rows={3} />
      </div>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function MoneyMindsetSection({ init }: { init: Answers['money_mindset'] }) {
  const [wishes, setWishes] = useState<Array<{ item: string; amount: string }>>(
    init?.wishes?.length ? init.wishes : Array(5).fill(null).map(() => ({ item: '', amount: '' }))
  )
  const { scheduleSave, saveState } = useSaveSection('money_mindset')

  function update(idx: number, key: 'item' | 'amount', val: string) {
    const next = wishes.map((w, i) => i === idx ? { ...w, [key]: val } : w)
    setWishes(next); scheduleSave({ wishes: next })
  }

  function addRow() {
    const next = [...wishes, { item: '', amount: '' }]
    setWishes(next); scheduleSave({ wishes: next })
  }

  return (
    <SectionCard sectionKey="money_mindset" emoji="💰" title="1. お金が集まる思考" subtitle="何にいくら必要かを超具体的に書く" done={wishes.some(w => w.item)}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
        「もしどんな願いも叶うとしたら？」という前提で、過程を考えずに書いてみよう
      </p>
      {wishes.map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--color-muted)', flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
          <input
            style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit' }}
            value={w.item} onChange={e => update(i, 'item', e.target.value)}
            placeholder="例: 海外移住"
          />
          <input
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit' }}
            value={w.amount} onChange={e => update(i, 'amount', e.target.value)}
            placeholder="例: 500万"
          />
        </div>
      ))}
      <button onClick={addRow} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px dashed var(--color-border)', background: 'none', color: 'var(--color-muted)', fontSize: 13, cursor: 'pointer' }}>
        + 追加
      </button>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function ChecklistSection({ init }: { init: Answers['checklist'] }) {
  const [checked, setChecked] = useState<string[]>(init?.checked ?? [])
  const { scheduleSave, saveState } = useSaveSection('checklist')

  function toggle(item: string) {
    const next = checked.includes(item) ? checked.filter(c => c !== item) : [...checked, item]
    setChecked(next); scheduleSave({ checked: next })
  }

  return (
    <SectionCard sectionKey="checklist" emoji="✓" title="2. お金の知識チェックリスト" subtitle="できているものにチェック" done={checked.length > 0}>
      {CHECKLIST_ITEMS.map(item => (
        <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)}
            style={{ marginTop: 2, accentColor: 'var(--color-accent)', flexShrink: 0, width: 16, height: 16 }} />
          <span style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5 }}>{item}</span>
        </label>
      ))}
      <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
        {checked.length}/{CHECKLIST_ITEMS.length} できている — できていないものが今後の課題
      </p>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function CostBenefitSection({ init }: { init: Answers['cost_benefit'] }) {
  const [expenses, setExpenses] = useState<Array<{ item: string; type: 'investment' | 'consumption' | 'waste' | '' }>>(
    init?.expenses?.length ? init.expenses : Array(10).fill(null).map(() => ({ item: '', type: '' as const }))
  )
  const { scheduleSave, saveState } = useSaveSection('cost_benefit')

  function update(idx: number, key: 'item' | 'type', val: string) {
    const next = expenses.map((e, i) => i === idx ? { ...e, [key]: val } : e)
    setExpenses(next as typeof expenses); scheduleSave({ expenses: next })
  }

  return (
    <SectionCard sectionKey="cost_benefit" emoji="📊" title="3. 費用対効果" subtitle="最近の支出を投資・消費・浪費に分類" done={expenses.some(e => e.item)}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
        最近お金を使ったもの10個を書き、「投資・消費・浪費」に分類しよう
      </p>
      {expenses.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--color-muted)', flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
          <input
            style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit' }}
            value={e.item} onChange={ev => update(i, 'item', ev.target.value)}
            placeholder="例: スタバ、飲み会、参考書"
          />
          <select
            style={{ padding: '8px 6px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)', color: e.type ? TYPE_COLOR[e.type] : 'var(--color-muted)', fontSize: 12, fontWeight: 700 }}
            value={e.type} onChange={ev => update(i, 'type', ev.target.value)}
          >
            <option value="">未分類</option>
            <option value="investment">投資</option>
            <option value="consumption">消費</option>
            <option value="waste">浪費</option>
          </select>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
        {(['investment', 'consumption', 'waste'] as const).map(t => (
          <span key={t} style={{ color: TYPE_COLOR[t], fontWeight: 700 }}>
            {TYPE_LABEL[t]}: {expenses.filter(e => e.type === t).length}件
          </span>
        ))}
      </div>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function AffirmationSection({ init }: { init: Answers['affirmation'] }) {
  const questions = [
    { key: 'exciting',     q: 'ワクワクすることは？' },
    { key: 'after',        q: '経済的に成功した後の自分の姿は？' },
    { key: 'place',        q: 'どんな場所にいる？' },
    { key: 'outfit',       q: 'どんな服を着ている？' },
    { key: 'sound',        q: '何が聞こえている？（音・声）' },
    { key: 'people',       q: '周りにどんな人がいる？' },
    { key: 'expression',   q: '自分の表情は？' },
    { key: 'conversation', q: 'どんな会話をしている？' },
    { key: 'symbol',       q: '成功を感じさせるものは何？' },
    { key: 'level',        q: '今のワクワク度（10段階）と高める方法は？' },
  ]
  const [data, setData] = useState<Record<string, string>>(init ?? {})
  const { scheduleSave, saveState } = useSaveSection('affirmation')

  function update(key: string, val: string) {
    const next = { ...data, [key]: val }
    setData(next); scheduleSave(next)
  }

  return (
    <SectionCard sectionKey="affirmation" emoji="✨" title="4. アファメーション" subtitle="理想の自分を全感覚でイメージして言語化" done={Object.values(data).some(v => v)}>
      {questions.map(({ key, q }) => (
        <div key={key}>
          <Label>{q}</Label>
          <TextArea value={data[key] ?? ''} onChange={v => update(key, v)} rows={2} placeholder="具体的に…" />
        </div>
      ))}
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function BeliefResetSection({ init }: { init: Answers['belief_reset'] }) {
  const [musts, setMusts] = useState<Array<{ original: string; rewritten: string }>>(
    init?.musts?.length ? init.musts : Array(5).fill(null).map(() => ({ original: '', rewritten: '' }))
  )
  const { scheduleSave, saveState } = useSaveSection('belief_reset')

  function update(idx: number, key: 'original' | 'rewritten', val: string) {
    const next = musts.map((m, i) => i === idx ? { ...m, [key]: val } : m)
    setMusts(next); scheduleSave({ musts: next })
  }

  return (
    <SectionCard sectionKey="belief_reset" emoji="🔓" title="5. 思い込みを外す" subtitle="「〜しなければ」を「〜しなくていい」に書き換え" done={musts.some(m => m.original)}>
      {musts.map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', background: 'var(--color-bg-subtle)', borderRadius: 10 }}>
          <input
            style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit' }}
            value={m.original} onChange={e => update(i, 'original', e.target.value)}
            placeholder={`${i + 1}. 〜しなければならない`}
          />
          {m.original && (
            <input
              style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #10b981', background: 'var(--color-bg-card)', color: '#10b981', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}
              value={m.rewritten} onChange={e => update(i, 'rewritten', e.target.value)}
              placeholder="→ 〜しなくていい"
            />
          )}
        </div>
      ))}
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function VisualizationSection({ init }: { init: Answers['visualization'] }) {
  const [data, setData] = useState({ scene: '', ...init })
  const { scheduleSave, saveState } = useSaveSection('visualization')

  function update(val: string) {
    const next = { scene: val }
    setData(next); scheduleSave(next)
  }

  return (
    <SectionCard sectionKey="visualization" emoji="🎨" title="6. ビジュアライゼーション（最重要）" subtitle="ワクワクするシーンを言葉や画像で表現" done={!!data.scene}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
        理想の未来シーンを五感も含めて詳しく描写しよう。Canvaで画像を作るのもおすすめ。
      </p>
      <TextArea value={data.scene} onChange={update} placeholder="例: 朝、南の島のリゾートホテルのバルコニーで海を見ながらコーヒーを飲んでいる。白いリネンのシャツを着て、隣には大切な人がいる。仕事はスマホで完結していて…" rows={6} />
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function WordPowerSection({ init }: { init: Answers['word_power'] }) {
  const [habits, setHabits] = useState<Array<{ original: string; positive: string }>>(
    init?.habits?.length ? init.habits : Array(10).fill(null).map(() => ({ original: '', positive: '' }))
  )
  const { scheduleSave, saveState } = useSaveSection('word_power')

  function update(idx: number, key: 'original' | 'positive', val: string) {
    const next = habits.map((h, i) => i === idx ? { ...h, [key]: val } : h)
    setHabits(next); scheduleSave({ habits: next })
  }

  function addRow() {
    const next = [...habits, { original: '', positive: '' }]
    setHabits(next); scheduleSave({ habits: next })
  }

  return (
    <SectionCard sectionKey="word_power" emoji="💬" title="7. 言葉の魔力" subtitle="口癖をポジティブに書き換える" done={habits.some(h => h.original)}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
        普段の口癖・よく使う言葉を書き出して、自己受容の言葉に言い換えよう
      </p>
      {habits.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit' }}
            value={h.original} onChange={e => update(i, 'original', e.target.value)}
            placeholder="口癖"
          />
          <input
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #10b981', background: 'var(--color-bg-subtle)', color: '#10b981', fontSize: 13, fontFamily: 'inherit' }}
            value={h.positive} onChange={e => update(i, 'positive', e.target.value)}
            placeholder="→ 言い換え"
          />
        </div>
      ))}
      <button onClick={addRow} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px dashed var(--color-border)', background: 'none', color: 'var(--color-muted)', fontSize: 13, cursor: 'pointer' }}>
        + 追加
      </button>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function CompoundTimeSection({ init }: { init: Answers['compound_time'] }) {
  const [data, setData] = useState({ current: '', ideal_hours: '', to_cut: '', ...init })
  const { scheduleSave, saveState } = useSaveSection('compound_time')

  function update(key: string, val: string) {
    const next = { ...data, [key]: val }
    setData(next); scheduleSave(next)
  }

  return (
    <SectionCard sectionKey="compound_time" emoji="⏱️" title="8. 複利の力を使う" subtitle="1日の時間の使い方を見直す" done={!!(data.current || data.ideal_hours)}>
      <div>
        <Label>1日の時間の使い方（起きてから寝るまで）</Label>
        <TextArea value={data.current} onChange={v => update('current', v)} placeholder="例: 6:00 起床 / 7:00〜9:00 通学 / 12:00〜13:00 昼食・SNS / 放課後 YouTube2h…" rows={5} />
      </div>
      <div>
        <Label>理想を叶えるために使っている時間（1日何時間くらい？）</Label>
        <TextArea value={data.ideal_hours} onChange={v => update('ideal_hours', v)} placeholder="例: 勉強30分、読書0分、副業の勉強0分…" rows={2} />
      </div>
      <div>
        <Label>理想から逆算して、最も削るべき時間は？</Label>
        <TextArea value={data.to_cut} onChange={v => update('to_cut', v)} placeholder="例: YouTube2h → 1hに。SNSのダラ見30分 → 0に" rows={3} />
      </div>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function FivePeopleSection({ init }: { init: Answers['five_people'] }) {
  const [inner, setInner] = useState<string[]>(init?.inner ?? Array(5).fill(''))
  const [outer, setOuter] = useState<string[]>(init?.outer ?? Array(5).fill(''))
  const { scheduleSave, saveState } = useSaveSection('five_people')

  function updateInner(idx: number, val: string) {
    const next = inner.map((v, i) => i === idx ? val : v)
    setInner(next); scheduleSave({ inner: next, outer })
  }
  function updateOuter(idx: number, val: string) {
    const next = outer.map((v, i) => i === idx ? val : v)
    setOuter(next); scheduleSave({ inner, outer: next })
  }

  return (
    <SectionCard sectionKey="five_people" emoji="👥" title="9. 5人の平均の法則" subtitle="一番一緒にいる人が自分の平均値になる" done={inner.some(v => v)}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
        あなたの思考・収入・価値観は、一番時間を共にする5人の平均になると言われている
      </p>
      <div>
        <Label>内側の円 — 最も一緒にいる5人（家族含む）</Label>
        {inner.map((v, i) => (
          <input key={i}
            style={{ display: 'block', width: '100%', marginBottom: 6, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-accent)', background: 'var(--color-bg-subtle)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            value={v} onChange={e => updateInner(i, e.target.value)}
            placeholder={`${i + 1}. 名前や関係性`}
          />
        ))}
      </div>
      <div>
        <Label>外側の円 — 次に時間を共にする5人</Label>
        {outer.map((v, i) => (
          <input key={i}
            style={{ display: 'block', width: '100%', marginBottom: 6, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-subtle)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            value={v} onChange={e => updateOuter(i, e.target.value)}
            placeholder={`${i + 1}. 名前や関係性`}
          />
        ))}
      </div>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function MastermindSection({ init }: { init: Answers['mastermind'] }) {
  const [data, setData] = useState({ ideal: '', where: '', ...init })
  const { scheduleSave, saveState } = useSaveSection('mastermind')

  function update(key: string, val: string) {
    const next = { ...data, [key]: val }
    setData(next); scheduleSave(next)
  }

  return (
    <SectionCard sectionKey="mastermind" emoji="🤝" title="10. マスターマインドを形成する" subtitle="夢を一緒に追える仲間を探す" done={!!(data.ideal || data.where)}>
      <div>
        <Label>理想の夢を一緒に追える人はどんな人？</Label>
        <TextArea value={data.ideal} onChange={v => update('ideal', v)} placeholder="例: 同世代で起業を目指している、ポジティブで行動力がある、お互いを高め合える…" rows={3} />
      </div>
      <div>
        <Label>そういう人はどこに行けば見つかりそう？</Label>
        <TextArea value={data.where} onChange={v => update('where', v)} placeholder="例: ビジネス系のオンラインコミュニティ、読書会、インターン先…" rows={3} />
      </div>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

function SummarySection({ init }: { init: Answers['summary'] }) {
  const [data, setData] = useState({ learnings: '', changes: '', ...init })
  const { scheduleSave, saveState } = useSaveSection('summary')

  function update(key: string, val: string) {
    const next = { ...data, [key]: val }
    setData(next); scheduleSave(next)
  }

  return (
    <SectionCard sectionKey="summary" emoji="🚀" title="まとめ — 行動に移す" subtitle="学びを行動に変える" done={!!(data.learnings && data.changes)}>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700, margin: 0 }}>
        行動に移さなければ水の泡。今日から変えていこう！
      </p>
      <div>
        <Label>今回のワーク全体での学び・気づき</Label>
        <TextArea value={data.learnings} onChange={v => update('learnings', v)} placeholder="ワーク全体を振り返って、特に気づいたことは？" rows={4} />
      </div>
      <div>
        <Label>これから具体的に何を変えていくか</Label>
        <TextArea value={data.changes} onChange={v => update('changes', v)} placeholder="明日からできる小さな行動から書いてみよう" rows={4} />
      </div>
      <SavedBadge saveState={saveState} />
    </SectionCard>
  )
}

// ── メインページ ─────────────────────────────────────────────────
export default function WorkPage() {
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res  = await fetch('/api/worksheet')
    const json = await res.json()
    setAnswers(json.answers ?? {})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sections = [
    !!answers.intro?.goal,
    !!(answers.money_mindset?.wishes?.some(w => w.item)),
    !!(answers.checklist?.checked?.length),
    !!(answers.cost_benefit?.expenses?.some(e => e.item)),
    !!(answers.affirmation && Object.values(answers.affirmation).some(v => v)),
    !!(answers.belief_reset?.musts?.some(m => m.original)),
    !!answers.visualization?.scene,
    !!(answers.word_power?.habits?.some(h => h.original)),
    !!(answers.compound_time?.current || answers.compound_time?.ideal_hours),
    !!(answers.five_people?.inner?.some(v => v)),
    !!(answers.mastermind?.ideal || answers.mastermind?.where),
    !!(answers.summary?.learnings && answers.summary?.changes),
  ]
  const doneCount = sections.filter(Boolean).length

  if (loading) {
    return <main style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-muted)' }}>読み込み中…</main>
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>📖 富裕層の思考ワーク</h1>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-muted)' }}>
          JKが知らない富裕層の仕組み 〜お金に好かれる思考のクセ〜
        </p>
        {/* 進捗バー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(doneCount / 12) * 100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 4, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', flexShrink: 0 }}>{doneCount}/12 完了</span>
        </div>
      </div>

      <IntroSection         init={answers.intro} />
      <MoneyMindsetSection  init={answers.money_mindset} />
      <ChecklistSection     init={answers.checklist} />
      <CostBenefitSection   init={answers.cost_benefit} />
      <AffirmationSection   init={answers.affirmation} />
      <BeliefResetSection   init={answers.belief_reset} />
      <VisualizationSection init={answers.visualization} />
      <WordPowerSection     init={answers.word_power} />
      <CompoundTimeSection  init={answers.compound_time} />
      <FivePeopleSection    init={answers.five_people} />
      <MastermindSection    init={answers.mastermind} />
      <SummarySection       init={answers.summary} />
    </main>
  )
}
