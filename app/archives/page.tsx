import type { Metadata } from 'next'
import Link from 'next/link'
import { getArchivePosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '归档',
}

export default async function ArchivesPage() {
  const posts = await getArchivePosts()

  // 按年份分组（保持倒序）
  const groups = new Map<number, typeof posts>()
  for (const post of posts) {
    const year = new Date(post.published_at ?? post.created_at).getFullYear()
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)!.push(post)
  }
  const years = [...groups.keys()].sort((a, b) => b - a)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">归档</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {posts.length} 篇文章
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">暂无文章，敬请期待</p>
        </div>
      ) : (
        <div className="space-y-10">
          {years.map((year) => (
            <section key={year}>
              <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-bold text-foreground">
                {year}
                <span className="text-sm font-normal text-muted-foreground">
                  {groups.get(year)!.length} 篇
                </span>
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                {groups.get(year)!.map((post) => (
                  <li key={post.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted"
                    >
                      <time className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {new Date(post.published_at ?? post.created_at)
                          .toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                      </time>
                      <span className="flex-1 truncate text-sm text-foreground transition-colors hover:text-primary">
                        {post.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
