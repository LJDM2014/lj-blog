'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { savePost, uploadMedia, parseMarkdown } from '@/app/admin/actions'
import MarkdownPreview from './MarkdownPreview'

export interface PostEditorData {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string
  tags: string
  status: 'draft' | 'published'
  published_at?: string | null
}

/** 本地自动保存的草稿结构 */
interface LocalDraft {
  title: string
  slug: string
  excerpt: string
  coverImage: string
  tags: string
  content: string
  savedAt: number
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40'

/** ISO 时间 → datetime-local 输入框格式（本地时区） */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 快捷工具栏按钮 */
const TOOLBAR: { label: string; title: string; action: 'wrap' | 'block' | 'link' | 'image'; before?: string; after?: string; placeholder?: string }[] = [
  { label: 'B', title: '加粗', action: 'wrap', before: '**', after: '**', placeholder: '加粗文本' },
  { label: 'I', title: '斜体', action: 'wrap', before: '*', after: '*', placeholder: '斜体文本' },
  { label: 'H2', title: '二级标题', action: 'block', before: '## 标题' },
  { label: 'H3', title: '三级标题', action: 'block', before: '### 标题' },
  { label: '链接', title: '插入链接', action: 'link' },
  { label: 'code', title: '行内代码', action: 'wrap', before: '`', after: '`', placeholder: '代码' },
  { label: '代码块', title: '代码块', action: 'wrap', before: '\n```\n', after: '\n```\n', placeholder: '代码' },
  { label: '引用', title: '引用', action: 'wrap', before: '> ', after: '', placeholder: '引用内容' },
  { label: '列表', title: '无序列表', action: 'wrap', before: '- ', after: '', placeholder: '列表项' },
  { label: '图片', title: '上传图片/音视频并插入', action: 'image' },
]

export default function PostEditor({ initial }: { initial?: PostEditorData }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? '')
  const [tags, setTags] = useState(initial?.tags ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [schedule, setSchedule] = useState(
    initial?.published_at && initial.status !== 'published' ? toLocalInput(initial.published_at) : ''
  )
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'media' | 'cover' | 'import' | null>(null)
  const [restorable, setRestorable] = useState<LocalDraft | null>(null)

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const draftKey = `post-draft-${initial?.id ?? 'new'}`
  const isPublishedPost = initial?.status === 'published'

  // ---------- 本地自动保存草稿 ----------
  // 进入页面时检查是否存在未恢复的本地草稿
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as LocalDraft
      if (!draft.title.trim() && !draft.content.trim()) return
      const current = JSON.stringify({
        title: initial?.title ?? '',
        slug: initial?.slug ?? '',
        excerpt: initial?.excerpt ?? '',
        coverImage: initial?.cover_image ?? '',
        tags: initial?.tags ?? '',
        content: initial?.content ?? '',
      })
      const stored = JSON.stringify({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        coverImage: draft.coverImage,
        tags: draft.tags,
        content: draft.content,
      })
      if (stored !== current) setRestorable(draft)
    } catch {
      // 草稿解析失败静默忽略
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // 内容变更 800ms 后写入 localStorage（空内容不落盘）
  useEffect(() => {
    if (!title.trim() && !content.trim()) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title, slug, excerpt, coverImage, tags, content, savedAt: Date.now() })
        )
      } catch {
        // 存储空间不足等异常静默忽略
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [title, slug, excerpt, coverImage, tags, content, draftKey])

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // 忽略
    }
  }

  const restoreDraft = () => {
    if (!restorable) return
    setTitle(restorable.title)
    setSlug(restorable.slug)
    setExcerpt(restorable.excerpt)
    setCoverImage(restorable.coverImage)
    setTags(restorable.tags)
    setContent(restorable.content)
    setRestorable(null)
    setSuccess('已恢复本地草稿')
  }

  const discardDraft = () => {
    clearDraft()
    setRestorable(null)
  }

  /** 本地草稿的相对时间描述 */
  const draftAgeText = (savedAt: number): string => {
    const diff = Math.max(0, Date.now() - savedAt)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  // ---------- 编辑操作 ----------
  const generateSlug = () => {
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(generated)
  }

  /** 在光标处插入文本 */
  const insertAtCursor = (text: string) => {
    const el = contentRef.current
    if (!el) {
      setContent((c) => c + text)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + text.length
    })
  }

  /** 用 before/after 包裹选中文本（无选中时插入占位文本） */
  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const el = contentRef.current
    if (!el) {
      insertAtCursor(`${before}${placeholder}${after}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.slice(start, end) || placeholder
    const next = content.slice(0, start) + before + selected + after + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + before.length
      el.selectionEnd = start + before.length + selected.length
    })
  }

  /** 插入链接：选中文本作为链接文字，光标定位到 URL 处 */
  const insertLink = () => {
    const el = contentRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.slice(start, end) || '链接文本'
    const next = content.slice(0, start) + `[${selected}](https://)` + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + selected.length + 3
      el.selectionEnd = start + selected.length + 11
    })
  }

  const handleToolbar = (item: (typeof TOOLBAR)[number]) => {
    switch (item.action) {
      case 'wrap':
        wrapSelection(item.before!, item.after ?? '', item.placeholder ?? '')
        break
      case 'block':
        insertAtCursor(`\n${item.before}\n`)
        break
      case 'link':
        insertLink()
        break
      case 'image':
        mediaInputRef.current?.click()
        break
    }
  }

  // ---------- 上传 ----------
  const uploadAndInsert = (file: File) => {
    setBusy('media')
    setError(null)
    startTransition(async () => {
      const result = await uploadMedia(file)
      setBusy(null)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      if (!result.url) {
        setError('上传结果异常，未返回文件地址')
        return
      }
      const url = result.url
      const snippet = /\.(mp4|webm|mov)(\?.*)?$/i.test(url)
        ? `[视频：${file.name}](${url})`
        : /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url)
          ? `[音频：${file.name}](${url})`
          : `![${file.name}](${url})`
      insertAtCursor(`\n${snippet}\n`)
    })
  }

  /** 编辑区内粘贴：图片/音视频文件自动上传并插入 */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files)
    const media = files.filter((f) => /^(image|video|audio)\//.test(f.type))
    if (media.length === 0) return
    e.preventDefault()
    media.forEach((file) => uploadAndInsert(file))
  }

  /** 编辑区拖拽：媒体文件自动上传并插入 */
  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer.files)
    const media = files.filter((f) => /^(image|video|audio)\//.test(f.type))
    if (media.length === 0) return
    e.preventDefault()
    media.forEach((file) => uploadAndInsert(file))
  }

  const uploadCover = (file: File) => {
    setBusy('cover')
    setError(null)
    startTransition(async () => {
      const result = await uploadMedia(file)
      setBusy(null)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      if (!result.url) {
        setError('上传结果异常，未返回文件地址')
        return
      }
      setCoverImage(result.url)
    })
  }

  const importFile = (file: File) => {
    setBusy('import')
    setError(null)
    startTransition(async () => {
      const result = await parseMarkdown(file)
      setBusy(null)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      setTitle(result.title)
      setSlug(result.slug)
      setExcerpt(result.excerpt)
      setCoverImage(result.cover_image)
      setTags(result.tags.join(', '))
      setContent(result.content)
      setSuccess('已导入 md 文件内容，请检查后保存')
    })
  }

  const handleSave = (status: 'draft' | 'published') => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await savePost({
        id: initial?.id,
        title,
        slug,
        excerpt,
        content,
        cover_image: coverImage,
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        // 草稿携带定时发布时间；正式发布由服务端决定发布时间
        scheduled_at: status === 'draft' && !isPublishedPost ? (schedule || null) : undefined,
      })
      if (result.ok === false) {
        setError(result.error)
        return
      }
      clearDraft()
      if (!initial?.id) {
        try {
          localStorage.removeItem('post-draft-new')
        } catch {
          // 忽略
        }
      }
      if (status === 'published') {
        setSuccess('文章已发布！')
        setTimeout(() => router.push('/admin'), 800)
      } else {
        setSuccess(schedule ? '草稿已保存，到设定时间将自动发布' : '草稿已保存')
      }
      if (result.id && result.id !== initial?.id) {
        // 新建成功后切换到编辑模式（刷新服务端列表）
        router.replace(`/admin/posts/${result.id}`)
      }
      router.refresh()
    })
  }

  // 字数统计（去空白）与预计阅读时长
  const wordCount = content.replace(/\s/g, '').length
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 400))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {initial?.id ? '编辑文章' : '撰写文章'}
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importFile(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={busy !== null}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {busy === 'import' ? '导入中...' : '导入 .md'}
          </button>
          <button
            onClick={() => setPreview((v) => !v)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            {preview ? '编辑' : '预览'}
          </button>
        </div>
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
      {restorable && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <span>检测到 {draftAgeText(restorable.savedAt)} 保存的本地草稿</span>
          <div className="flex gap-2">
            <button
              onClick={restoreDraft}
              className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              恢复
            </button>
            <button
              onClick={discardDraft}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
            >
              丢弃
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {/* 标题 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入文章标题"
            className={inputClass}
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
              className="text-xs text-primary hover:underline"
            >
              从标题生成
            </button>
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="article-slug"
            className={inputClass}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            注意：Slug 发布后不建议修改，否则旧评论与收藏会失联
          </p>
        </div>

        {/* 摘要 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            摘要 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="输入文章摘要"
            className={`${inputClass} resize-none`}
            required
          />
        </div>

        {/* 标签 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            标签 <span className="text-muted-foreground">(逗号分隔，可选)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="技术, 生活, 随笔"
            className={inputClass}
          />
        </div>

        {/* 定时发布 */}
        {!isPublishedPost && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">
              定时发布 <span className="text-muted-foreground">(可选)</span>
            </label>
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              填写后保存草稿，到达该时间将自动发布（需已配置定时任务）；留空表示不定时
            </p>
          </div>
        )}

        {/* 封面图 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              封面图 <span className="text-muted-foreground">(可选)</span>
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadCover(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={busy !== null}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {busy === 'cover' ? '上传中...' : '上传图片'}
            </button>
          </div>
          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://... 或点击右侧上传"
            className={inputClass}
          />
          {coverImage && (
            <img
              src={coverImage}
              alt="封面预览"
              className="mt-2 aspect-video w-full rounded-lg object-cover"
            />
          )}
        </div>

        {/* 内容 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              内容 (Markdown) <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {wordCount} 字 · 约 {readingMinutes} 分钟 · 自动保存中
            </span>
          </div>

          {/* 快捷工具栏 */}
          {!preview && (
            <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
              {TOOLBAR.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  title={item.title}
                  onClick={() => handleToolbar(item)}
                  disabled={busy !== null}
                  className="rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-background disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAndInsert(file)
              e.target.value = ''
            }}
          />

          {preview ? (
            <div className="min-h-[24rem] rounded-lg border border-border bg-background p-4">
              {content.trim() ? (
                <MarkdownPreview content={content} />
              ) : (
                <p className="text-sm text-muted-foreground">暂无内容</p>
              )}
            </div>
          ) : (
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              rows={16}
              placeholder={'使用 Markdown 编写内容...\n\n支持图片、代码块、表格、音频与视频（插入菜单、粘贴或拖拽文件）'}
              className={`${inputClass} resize-y font-mono text-sm leading-relaxed`}
              required
            />
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            支持 GFM 语法：# 标题、**粗体**、表格、代码块 ``` 等；编辑区内可直接粘贴或拖拽图片/音视频文件自动上传
          </p>
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
            {pending ? '处理中...' : '发布文章'}
          </button>
        </div>
      </div>
    </div>
  )
}
