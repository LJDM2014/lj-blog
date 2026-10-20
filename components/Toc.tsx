'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/markdown'

export default function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headings.length === 0) return

    // 标题滚过视口顶部 100px 处即视为激活
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-100px 0px -75% 0px', threshold: 0 }
    )
    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  return (
    <nav aria-label="目录" className="text-sm">
      <p className="mb-3 font-semibold text-foreground">目录</p>
      <ul className="space-y-1.5 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${encodeURIComponent(item.id)}`}
              className={`
                block border-l-2 py-0.5 leading-snug transition-colors
                ${
                  item.depth === 3
                    ? 'pl-7 text-xs'
                    : '-ml-px pl-3.5 text-[13px]'
                }
                ${
                  activeId === item.id
                    ? 'border-primary font-medium text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
