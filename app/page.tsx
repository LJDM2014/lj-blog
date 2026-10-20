import PostList from '@/components/PostList'
import Pagination from '@/components/Pagination'
import { getPublishedPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const { posts, total } = await getPublishedPosts(page, PAGE_SIZE)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">最新文章</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 篇文章
          </p>
        </div>
        <PostList posts={posts} />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
      </section>
    </main>
  )
}
