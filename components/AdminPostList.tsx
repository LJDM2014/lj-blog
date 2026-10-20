'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deletePost, importMarkdown } from '@/app/admin/actions'
import type { Post } from '@/lib/posts'

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}
const STATUS_LABEL: Record<string, string> = { published: '已发布', draft: '草稿' }

export default function AdminPostList({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const importRef = useRef<HTMLInputElement>(null)

  const filtered = posts.filter((p) => filter === 'all' || p.status === filter)

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`确定删除「${title}」吗？此操作不可恢复。`)) return
    startTransition(async () => {
      const result = await deletePost(id)
      if (result.ok === false) setError(result.error)
      else router.refresh()
    })
  }

  const handleImport = (file: File) => {
    setError(null)
    startTransition(async () => {
      const result = await importMarkdown(file)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(
            [
              ['all', `全部 (${posts.length})`],
              ['published', `已发布 (${posts.filter((p) => p.status === 'published').length})`],
              ['draft', `草稿 (${posts.filter((p) => p.status === 'draft').length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => importRef.current?.click()}
            disabled={pending}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {pending ? '处理中...' : '导入 .md'}
          </button>
          <Link
            href="/admin/write"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            撰写文章
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          {filter === 'all' ? '还没有文章，点击「撰写文章」开始创作' : '该分类下暂无文章'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <div
              key={post.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="truncate font-medium text-card-foreground hover:text-primary"
                    title={post.title}
                  >
                    {post.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[post.status]}`}
                  >
                    {STATUS_LABEL[post.status]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  /blog/{post.slug} · 创建于{' '}
                  {new Date(post.created_at).toLocaleDateString('zh-CN')}
                  {post.published_at &&
                    ` · 发布于 ${new Date(post.published_at).toLocaleDateString('zh-CN')}`}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="rounded-lg px-3 py-1.5 text-primary hover:bg-muted"
                >
                  编辑
                </Link>
                <a
                  href={`/admin/posts/${post.id}/export`}
                  className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  导出
                </a>
                <button
                  onClick={() => handleDelete(post.id, post.title)}
                  disabled={pending}
                  className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
