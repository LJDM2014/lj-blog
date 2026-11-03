import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedProjects } from '@/lib/projects'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '项目',
  description: '博主的开发项目：技术栈、功能介绍与页面截图',
}

export default async function ProjectsPage() {
  const projects = await getPublishedProjects()

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">项目</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          我做过或正在维护的项目，点击卡片查看详细介绍
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          暂无项目
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const cover = project.screenshots?.[0]
            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={project.name}
                    className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/20 via-accent to-muted text-2xl font-bold text-primary">
                    {project.name}
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-card-foreground transition-colors group-hover:text-primary">
                    {project.name}
                  </h2>
                  {project.tagline && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {project.tagline}
                    </p>
                  )}
                  {(project.languages?.length ?? 0) + (project.tech_stack?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(project.languages ?? []).slice(0, 3).map((lang) => (
                        <span
                          key={`lang-${lang}`}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {lang}
                        </span>
                      ))}
                      {(project.tech_stack ?? []).slice(0, 3).map((tech) => (
                        <span
                          key={`tech-${tech}`}
                          className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
