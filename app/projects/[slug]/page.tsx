import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getProjectBySlug, getProjectPosts } from '@/lib/projects'
import { renderMarkdown } from '@/lib/markdown'
import { SITE_URL } from '@/lib/site'
import MarkdownBody from '@/components/MarkdownBody'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  return {
    title: project.name,
    description: project.tagline ?? undefined,
    openGraph: {
      title: project.name,
      description: project.tagline ?? undefined,
      images: project.screenshots?.[0] ? [project.screenshots[0]] : undefined,
    },
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  const [posts, { html }] = await Promise.all([
    getProjectPosts(project.id),
    renderMarkdown(project.description ?? ''),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: project.name,
    description: project.tagline ?? project.description ?? undefined,
    url: `${SITE_URL}/projects/${project.slug}`,
    screenshot: project.screenshots ?? undefined,
    keywords: [...(project.languages ?? []), ...(project.tech_stack ?? [])].join(', ') || undefined,
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto min-w-0 max-w-3xl">
        <Link
          href="/projects"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← 返回项目列表
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {project.name}
          </h1>
          {project.tagline && (
            <p className="mt-3 text-base text-muted-foreground">{project.tagline}</p>
          )}

          {(project.repo_url || project.demo_url) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
                  </svg>
                  代码仓库
                </a>
              )}
              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                  </svg>
                  在线演示
                </a>
              )}
            </div>
          )}

          {(project.languages?.length ?? 0) + (project.tech_stack?.length ?? 0) > 0 && (
            <div className="mt-5 space-y-2 text-sm">
              {(project.languages?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-muted-foreground">语言：</span>
                  {project.languages!.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              )}
              {(project.tech_stack?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-muted-foreground">关键技术：</span>
                  {project.tech_stack!.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        {project.screenshots && project.screenshots.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-foreground">页面截图</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {project.screenshots.map((shot, i) => (
                <a
                  key={shot}
                  href={shot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-xl border border-border transition-colors hover:border-primary"
                >
                  <img
                    src={shot}
                    alt={`${project.name} 截图 ${i + 1}`}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {project.description && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-foreground">项目介绍</h2>
            <article className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <MarkdownBody html={html} />
            </article>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-bold text-foreground">相关文章</h2>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card py-12 text-center text-muted-foreground">
              暂无相关文章
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card">
              {posts.map((post) => (
                <li key={post.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted"
                  >
                    <span className="line-clamp-1 text-sm text-foreground transition-colors hover:text-primary">
                      {post.title}
                    </span>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {new Date(post.published_at ?? post.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
