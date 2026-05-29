// src/app/layout.tsx

import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/ui/BottomNav'

export const metadata: Metadata = {
  title: '涼のログ',
  description: '今日のログを書く、振り返る',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="app-shell">
          <div className="content">{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
