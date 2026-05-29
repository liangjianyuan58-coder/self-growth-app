// src/app/review/page.tsx

import WeeklyReview from '@/components/review/WeeklyReview'

export default function ReviewPage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>週次レビュー</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          書いたログがまとまって見えます
        </p>
      </header>
      <WeeklyReview />
    </main>
  )
}
