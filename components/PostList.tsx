import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Post } from '@/lib/posts'

/** 搜索结果关键词高亮：整词大小写不敏感，命中片段包 <mark> */
function highlight(text: string | null | undefined, terms: string[]): ReactNode {
  if (!text || terms.length === 0) return text
  const pattern = [...terms]
    .sort((a, b) => b.length - a.length) // 优先匹配更长的词
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  if (!pattern) return text
  const re = new RegExp(`(${pattern})`, 'gi')
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function PostList({
  posts,
  highlightTerms,
}: {
  posts: Post[]
  highlightTerms?: string[]
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <p className="text-muted-foreground">暂无文章，敬请期待</p>
      </div>
    )
  }

  const terms = highlightTerms ?? []

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/blog/${post.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          {post.cover_image ? (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img
                src={post.cover_image}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-accent to-muted">
              <span className="text-3xl opacity-40">📝</span>
            </div>
          )}

          <div className="flex flex-1 flex-col p-5">
            <h2 className="mb-2 text-lg font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
              {highlight(post.title, terms)}
            </h2>
            <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {highlight(post.excerpt, terms)}
            </p>
            <div className="flex items-center justify-between">
              <time className="text-xs text-muted-foreground">
                {new Date(post.published_at ?? post.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {post.tags && post.tags.length > 0 && (
                <span className="truncate rounded-full bg-accent px-2 py-0.5 text-xs text-primary">
                  {post.tags[0]}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
