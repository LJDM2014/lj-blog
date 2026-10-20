import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CommentManageList, { type AdminComment } from '@/components/admin/CommentManageList'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ page?: string }>
}

interface CommentRow {
  id: string
  content: string
  created_at: string
  posts: { title: string | null; slug: string | null } | null
  profiles: { display_name: string | null } | null
}

export default async function AdminCommentsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data, count } = await supabase
    .from('comments')
    .select(
      'id, content, created_at, posts!comments_post_fk ( title, slug ), profiles!comments_user_fk ( display_name )',
      {
        count: 'exact',
        head: false,
      }
    )
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
    .returns<CommentRow[]>()

  const comments: AdminComment[] = (data ?? []).map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    post_title: c.posts?.title ?? null,
    post_slug: c.posts?.slug ?? null,
    author_name: c.profiles?.display_name ?? null,
  }))

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {total} 条评论</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-3 text-sm">
            {page > 1 ? (
              <Link
                href={`/admin/comments?page=${page - 1}`}
                className="text-primary hover:underline"
              >
                上一页
              </Link>
            ) : (
              <span className="text-muted-foreground/50">上一页</span>
            )}
            <span className="text-muted-foreground">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/admin/comments?page=${page + 1}`}
                className="text-primary hover:underline"
              >
                下一页
              </Link>
            ) : (
              <span className="text-muted-foreground/50">下一页</span>
            )}
          </div>
        )}
      </div>
      <CommentManageList comments={comments} />
    </div>
  )
}
