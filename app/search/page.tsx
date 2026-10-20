import type { Metadata } from 'next'
import PostList from '@/components/PostList'
import { searchPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '搜索',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const posts = query ? await searchPosts(query) : []

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold text-foreground">搜索</h1>

      <form action="/search" method="get" className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="输入关键词，搜索标题、摘要或正文…"
          className="h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          autoFocus
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          搜索
        </button>
      </form>

      {query ? (
        posts.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              找到 {posts.length} 篇与「{query}」相关的文章
            </p>
            <PostList posts={posts} highlightTerms={query.split(/\s+/).filter(Boolean).slice(0, 8)} />
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <p className="text-muted-foreground">没有找到与「{query}」相关的文章</p>
          </div>
        )
      ) : null}
    </main>
  )
}
