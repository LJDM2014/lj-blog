'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('页面渲染出错:', error)
  }, [error])

  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <p className="text-7xl font-bold text-primary">!</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">出了点问题</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        页面加载时发生错误，请重试。
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        重试
      </button>
    </main>
  )
}
