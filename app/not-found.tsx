import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">页面不存在</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        你访问的页面可能已被删除、改名或从未存在。
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          返回首页
        </Link>
        <Link
          href="/archives"
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          浏览归档
        </Link>
      </div>
    </main>
  )
}
