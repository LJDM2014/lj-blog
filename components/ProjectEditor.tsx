'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveProject, uploadMedia } from '@/app/admin/actions'
import MarkdownPreview from './MarkdownPreview'

export interface ProjectEditorData {
  id?: string
  name: string
  slug: string
  tagline: string
  description: string
  repo_url: string
  demo_url: string
  languages: string
  tech_stack: string
  screenshots: string[]
  status: 'draft' | 'published'
  sort_order: number
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40'

export default function ProjectEditor({ initial }: { initial?: ProjectEditorData }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [repoUrl, setRepoUrl] = useState(initial?.repo_url ?? '')
  const [demoUrl, setDemoUrl] = useState(initial?.demo_url ?? '')
  const [languages, setLanguages] = useState(initial?.languages ?? '')
  const [techStack, setTechStack] = useState(initial?.tech_stack ?? '')
  const [screenshots, setScreenshots] = useState<string[]>(initial?.screenshots ?? [])
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  const shotInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const generateSlug = () => {
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(generated)
  }

  const uploadScreenshot = (file: File) => {
    setBusy(true)
    setError(null)
    startTransition(async () => {
      const result = await uploadMedia(file)
      setBusy(false)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      if (!result.url) {
        setError('上传结果异常，未返回文件地址')
        return
      }
      setScreenshots((prev) => [...prev, result.url!])
    })
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index))
  }

  const moveScreenshot = (index: number, dir: -1 | 1) => {
    setScreenshots((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = (nextStatus: 'draft' | 'published') => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await saveProject({
        id: initial?.id,
        name,
        slug,
        tagline,
        description,
        repo_url: repoUrl,
        demo_url: demoUrl,
        languages: languages
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        tech_stack: techStack
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        screenshots,
        status: nextStatus,
        sort_order: sortOrder,
      })
      if (result.ok === false) {
        setError(result.error)
        return
      }
      setStatus(nextStatus)
      if (nextStatus === 'published') {
        // 发布成功后返回上一级项目管理页面
        setSuccess('项目已发布！即将返回项目管理...')
        setTimeout(() => router.push('/admin/projects'), 800)
        return
      }
      setSuccess('草稿已保存')
      if (result.id && result.id !== initial?.id) {
        router.replace(`/admin/projects/${result.id}`)
      }
      router.refresh()
    })
  }

  const splitToList = (value: string) => value.split(/[,，]/).map((t) => t.trim()).filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {initial?.id ? '编辑项目' : '新建项目'}
        </h2>
        <button
          onClick={() => setPreview((v) => !v)}
          disabled={pending}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
        >
          {preview ? '编辑' : '预览介绍'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {success}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {/* 名称 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            项目名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入项目名称"
            className={inputClass}
            disabled={pending}
            required
          />
        </div>

        {/* Slug */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              Slug <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={generateSlug}
              disabled={pending}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              从名称生成
            </button>
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="project-slug"
            className={inputClass}
            disabled={pending}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">项目页地址：/projects/{slug || '…'}</p>
        </div>

        {/* 一句话简介 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            一句话简介 <span className="text-muted-foreground">(列表卡片展示)</span>
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="一句话介绍这个项目"
            className={inputClass}
            disabled={pending}
          />
        </div>

        {/* 功能详细介绍 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            功能详细介绍 (Markdown，可选)
          </label>
          {preview ? (
            <div className="min-h-[10rem] rounded-lg border border-border bg-background p-4">
              {description.trim() ? (
                <MarkdownPreview content={description} />
              ) : (
                <p className="text-sm text-muted-foreground">暂无内容</p>
              )}
            </div>
          ) : (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              placeholder={'### 主要功能\n- 功能一\n- 功能二\n\n### 实现效果\n...'}
              className={`${inputClass} resize-y font-mono text-sm leading-relaxed`}
              disabled={pending}
            />
          )}
        </div>

        {/* 仓库 / 演示地址 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">
              代码仓库地址 <span className="text-muted-foreground">(可选)</span>
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/..."
              className={inputClass}
              disabled={pending}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">
              在线演示地址 <span className="text-muted-foreground">(可选)</span>
            </label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
              disabled={pending}
            />
          </div>
        </div>

        {/* 语言 / 关键技术 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">
              编程语言 <span className="text-muted-foreground">(逗号分隔)</span>
            </label>
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="TypeScript, Rust"
              className={inputClass}
              disabled={pending}
            />
            {splitToList(languages).length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {splitToList(languages).join(' / ')}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">
              关键技术 <span className="text-muted-foreground">(逗号分隔)</span>
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="Next.js, Supabase, Tailwind"
              className={inputClass}
              disabled={pending}
            />
            {splitToList(techStack).length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {splitToList(techStack).join(' / ')}
              </p>
            )}
          </div>
        </div>

        {/* 页面截图 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              页面截图 <span className="text-muted-foreground">(第一张将作为列表封面)</span>
            </label>
            <input
              ref={shotInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadScreenshot(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => shotInputRef.current?.click()}
              disabled={busy || pending}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {busy ? '上传中...' : '上传截图'}
            </button>
          </div>

          {screenshots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              暂无截图，点击右上角「上传截图」添加
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {screenshots.map((shot, i) => (
                <div
                  key={`${shot}-${i}`}
                  className="overflow-hidden rounded-lg border border-border bg-background"
                >
                  <img
                    src={shot}
                    alt={`截图 ${i + 1}`}
                    className="aspect-video w-full object-cover"
                  />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">第 {i + 1} 张</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveScreenshot(i, -1)}
                        disabled={i === 0 || pending}
                        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="前移"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveScreenshot(i, 1)}
                        disabled={i === screenshots.length - 1 || pending}
                        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="后移"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => removeScreenshot(i)}
                        disabled={pending}
                        className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 排序 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            排序值 <span className="text-muted-foreground">(越小越靠前)</span>
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className={`${inputClass} w-32`}
            disabled={pending}
          />
        </div>

        {/* 操作 */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={pending}
            className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            {pending ? '处理中...' : '保存草稿'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? '处理中...' : '发布项目'}
          </button>
        </div>
      </div>
    </div>
  )
}
