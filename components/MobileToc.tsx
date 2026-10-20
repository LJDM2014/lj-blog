'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/markdown'
import Toc from './Toc'

/** 移动端目录：右下角悬浮按钮 + 底部抽屉（桌面端仍用右侧粘性栏） */
export default function MobileToc({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开文章目录"
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:text-primary lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 6h10M4 12h16M4 18h10" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="文章目录">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-5 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-foreground">文章目录</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭目录"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {/* 点击目录项跳转后自动收起抽屉 */}
            <div onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) }}>
              <Toc items={items} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
