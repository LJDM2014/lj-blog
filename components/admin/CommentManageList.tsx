'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteComment } from '@/app/admin/actions'

export interface AdminComment {
  id: string
  content: string
  created_at: string
  post_title: string | null
  post_slug: string | null
  author_name: string | null
}

export default function CommentManageList({ comments }: { comments: AdminComment[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条评论吗？其回复也会一并删除。')) return
    setDeletingId(id)
    setError(null)
    const res = await deleteComment(id)
    setDeletingId(null)
    if (res.ok === false) {
      setError(res.error)
      return
    }
    startTransition(() => router.refresh())
  }

  if (comments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无评论</p>
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      <ul className="overflow-hidden rounded-2xl border border-border bg-card">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-border px-5 py-4 last:border-b-0">
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{c.author_name || '匿名用户'}</span>
              <span>{new Date(c.created_at).toLocaleString('zh-CN')}</span>
              {c.post_slug ? (
                <Link
                  href={`/blog/${c.post_slug}`}
                  className="truncate text-primary hover:underline"
                >
                  《{c.post_title || '无标题'}》
                </Link>
              ) : (
                <span>文章已删除</span>
              )}
            </div>
            <div className="flex items-start justify-between gap-4">
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{c.content}</p>
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deletingId === c.id || pending}
                className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
              >
                {deletingId === c.id ? '删除中...' : '删除'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
