import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPostBySlug, getAdjacentPosts, getRelatedPosts, incrementViews } from '@/lib/posts'
import { renderMarkdown } from '@/lib/markdown'
import { SITE_URL } from '@/lib/site'
import FavoriteButton from '@/components/FavoriteButton'
import CommentSection from '@/components/CommentSection'
import Toc from '@/components/Toc'
import LikeButton from '@/components/LikeButton'
import MarkdownBody from '@/components/MarkdownBody'
import MobileToc from '@/components/MobileToc'
import BackToTop from '@/components/BackToTop'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  // 在 metadata 阶段触发 404：早于流式响应首字节，保证返回真实 404 状态码
  if (!post) notFound()

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      // 有封面用封面，否则回退到动态生成的 OG 图
      images: [post.cover_image ?? `${SITE_URL}/og/${post.slug}`],
    },
  }
}

/** 中文按字数估算：约 400 字/分钟 */
function readingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.replace(/\s/g, '').length / 400))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  incrementViews(slug)
  const [{ html, toc }, { prev, next }, related] = await Promise.all([
    renderMarkdown(post.content ?? ''),
    getAdjacentPosts(post.id, post.published_at),
    getRelatedPosts(post.id, post.tags),
  ])
  const dateText = new Date(post.published_at ?? post.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image ?? `${SITE_URL}/og/${post.slug}`,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at ?? post.published_at ?? post.created_at,
    author: { '@type': 'Person', name: '博主' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_230px] lg:gap-10">
        <div className="mx-auto min-w-0 max-w-3xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← 返回首页
          </Link>

          <header className="mb-8">
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <time>{dateText}</time>
              <span>{post.views ?? 0} 次阅读</span>
              <span>约 {readingMinutes(post.content ?? '')} 分钟</span>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/tags/${encodeURIComponent(tag)}`}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-primary transition-opacity hover:opacity-80"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </header>

          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              className="mb-8 aspect-video w-full rounded-2xl object-cover"
            />
          )}

          <article className="rounded-2xl border border-border bg-card p-6 sm:p-10">
            <MarkdownBody html={html} />
          </article>

          <div className="mt-6 flex items-center justify-between">
            <LikeButton postId={post.id} />
            <FavoriteButton postId={post.id} />
          </div>

          {(prev || next) && (
            <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="相邻文章">
              {prev ? (
                <Link
                  href={`/blog/${prev.slug}`}
                  className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <span className="mb-1 block text-xs text-muted-foreground">← 上一篇</span>
                  <span className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/blog/${next.slug}`}
                  className="group rounded-2xl border border-border bg-card p-4 text-right transition-colors hover:border-primary sm:col-start-2"
                >
                  <span className="mb-1 block text-xs text-muted-foreground">下一篇 →</span>
                  <span className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {next.title}
                  </span>
                </Link>
              )}
            </nav>
          )}

          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-bold text-foreground">相关文章</h2>
              <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                {related.map((rel) => (
                  <li key={rel.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/blog/${rel.slug}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted"
                    >
                      <span className="line-clamp-1 text-sm text-foreground transition-colors hover:text-primary">
                        {rel.title}
                      </span>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {new Date(rel.published_at ?? rel.created_at).toLocaleDateString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                        })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CommentSection postId={post.id} />
        </div>

        {toc.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto py-2">
              <Toc items={toc} />
            </div>
          </aside>
        )}
      </div>

      {toc.length > 0 && <MobileToc items={toc} />}
      <BackToTop />
    </main>
  )
}
