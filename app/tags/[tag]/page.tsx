import type { Metadata } from 'next'
import Link from 'next/link'
import PostList from '@/components/PostList'
import { getPostsByTag } from '@/lib/posts'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  return { title: `标签：${decodeURIComponent(tag)}` }
}

export default async function TagPage({ params }: Props) {
  const { tag: rawTag } = await params
  const tag = decodeURIComponent(rawTag)
  const posts = await getPostsByTag(tag)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/tags"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← 全部标签
        </Link>
        <h1 className="text-3xl font-bold text-foreground">
          标签：<span className="text-primary">{tag}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">共 {posts.length} 篇文章</p>
      </div>

      {posts.length > 0 ? (
        <PostList posts={posts} />
      ) : (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">该标签下暂无文章</p>
        </div>
      )}
    </main>
  )
}
