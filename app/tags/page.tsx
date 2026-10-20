import type { Metadata } from 'next'
import Link from 'next/link'
import { getTagCounts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '标签',
}

export default async function TagsPage() {
  const tags = await getTagCounts()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">标签</h1>
        <p className="mt-1 text-sm text-muted-foreground">共 {tags.length} 个标签</p>
      </div>

      {tags.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">暂无标签</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary"
            >
              <span className="text-foreground transition-colors group-hover:text-primary">
                {tag}
              </span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
