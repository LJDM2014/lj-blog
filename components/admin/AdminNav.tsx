'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  exact?: boolean
  /** 额外归属到该导航项的路径前缀（如撰写/编辑文章页归属"文章管理"） */
  aliases?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: '仪表盘' },
  { href: '/admin', label: '文章管理', exact: true, aliases: ['/admin/posts'] },
  { href: '/admin/projects', label: '项目' },
  { href: '/admin/comments', label: '评论' },
  { href: '/admin/interactions', label: '互动' },
  { href: '/admin/media', label: '媒体库' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {NAV_ITEMS.map((item) => {
        const selfActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        const aliasActive = item.aliases?.some(
          (a) => pathname === a || pathname.startsWith(a + '/')
        )
        const active = selfActive || aliasActive
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
