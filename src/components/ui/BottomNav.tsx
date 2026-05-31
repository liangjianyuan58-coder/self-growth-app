'use client'
// src/components/ui/BottomNav.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/journal',  label: 'ログ',    icon: '✏️' },
  { href: '/goals',    label: '目標',    icon: '🎯' },
  { href: '/tasks',    label: 'タスク',  icon: '✅' },
  { href: '/review',   label: 'レビュー', icon: '📊' },
  { href: '/schedule', label: '調整',    icon: '📅' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {NAV.map(n => (
        <Link
          key={n.href}
          href={n.href}
          className={`nav-item ${pathname.startsWith(n.href) ? 'active' : ''}`}
        >
          <span className="nav-icon">{n.icon}</span>
          <span className="nav-label">{n.label}</span>
        </Link>
      ))}

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: var(--color-bg-card, #fff);
          border-top: 1px solid var(--color-border, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 100;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          text-decoration: none;
          padding: 8px 10px;
          border-radius: 8px;
          color: var(--color-muted, #9ca3af);
          transition: color .15s;
        }
        .nav-item.active { color: var(--color-accent, #7c6af7); }
        .nav-icon { font-size: 20px; }
        .nav-label { font-size: 10px; font-weight: 500; }
      `}</style>
    </nav>
  )
}
