'use client'

import { useEffect, useRef } from 'react'

/**
 * 文章正文渲染（客户端增强版）：
 * 为每个代码块注入「复制」按钮，其余内容与服务端渲染结果一致
 */
export default function MarkdownBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const buttons: HTMLButtonElement[] = []
    container.querySelectorAll('pre').forEach((pre) => {
      // 防止重复注入（如 StrictMode 双执行）
      if (pre.querySelector('.code-copy-btn')) return

      pre.classList.add('group', 'relative')
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className =
        'code-copy-btn absolute right-3 top-3 z-10 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-xs leading-none text-white/70 opacity-0 backdrop-blur transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100'
      btn.textContent = '复制'
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? ''
        try {
          await navigator.clipboard.writeText(code)
          btn.textContent = '已复制'
        } catch {
          btn.textContent = '复制失败'
        }
        setTimeout(() => {
          btn.textContent = '复制'
        }, 1500)
      })
      pre.appendChild(btn)
      buttons.push(btn)
    })

    return () => buttons.forEach((b) => b.remove())
  }, [html])

  return (
    <div
      ref={ref}
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
