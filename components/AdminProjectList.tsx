'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/app/admin/actions'
import type { ProjectListItem } from '@/lib/projects'

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}
const STATUS_LABEL: Record<string, string> = { published: '已发布', draft: '草稿' }

export default function AdminProjectList({ projects }: { projects: ProjectListItem[] }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`确定删除项目「${name}」吗？关联文章不会删除，仅解除关联。`)) return
    startTransition(async () => {
      const result = await deleteProject(id)
      if (result.ok === false) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">项目管理（{projects.length}）</h2>
        <Link
          href="/admin/projects/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          新建项目
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          还没有项目，点击「新建项目」开始添加
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              {project.screenshots?.[0] && (
                <img
                  src={project.screenshots[0]}
                  alt={project.name}
                  className="h-12 w-20 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="truncate font-medium text-card-foreground hover:text-primary"
                    title={project.name}
                  >
                    {project.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[project.status]}`}
                  >
                    {STATUS_LABEL[project.status]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  /projects/{project.slug} · {project.post_count ?? '—'} 篇关联文章 · 排序值{' '}
                  {project.sort_order}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="rounded-lg px-3 py-1.5 text-primary hover:bg-muted"
                >
                  编辑
                </Link>
                <button
                  onClick={() => handleDelete(project.id, project.name)}
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
