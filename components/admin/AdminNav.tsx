'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '仪表盘' },
  { href: '/admin/write', label: '撰写文章' },
  { href: '/admin', label: '文章管理', exact: true },
  { href: '/admin/comments', label: '评论' },
  { href: '/admin/interactions', label: '互动' },
  { href: '/admin/media', label: '媒体库' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'font-medium text-primary underline underline-offset-4'
                : 'text-muted-foreground hover:text-primary'
            }
          >
            {item.label}
          </Link>
        )
      })}
      <Link href="/" className="text-muted-foreground hover:text-primary">
        返回博客
      </Link>
    </nav>
  )
}
