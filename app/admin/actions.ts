'use server'

import { revalidatePath } from 'next/cache'
import matter from 'gray-matter'
import { createClient, getUser, getRole } from '@/lib/supabase/server'

export type ActionResult = { ok: true; id?: string; url?: string } | { ok: false; error: string }

async function requireAdmin(): Promise<string> {
  const role = await getRole()
  if (role !== 'admin') {
    throw new Error('无权访问：仅博主可以执行此操作')
  }
  const user = await getUser()
  if (!user) throw new Error('请先登录')
  return user.id
}

/** 从标题生成 URL 友好的 slug */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean)
  if (typeof raw === 'string') {
    return raw.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
  }
  return []
}

export interface SavePostInput {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image?: string
  tags: string[]
  status: 'draft' | 'published'
  /** 定时发布时间（仅草稿生效）；null 表示清除定时，undefined 表示不改动 */
  scheduled_at?: string | null
  /** 所属项目 id；null 表示清除关联，undefined 表示不改动 */
  project_id?: string | null
}

/** 新建或更新文章（admin 专用） */
export async function savePost(input: SavePostInput): Promise<ActionResult> {
  try {
    const userId = await requireAdmin()
    const supabase = await createClient()

    const slug = slugify(input.slug || input.title)
    if (!input.title.trim() || !slug || !input.excerpt.trim() || !input.content.trim()) {
      return { ok: false, error: '标题、Slug、摘要与内容均为必填' }
    }

    const now = new Date().toISOString()
    const payload: Record<string, unknown> = {
      title: input.title.trim(),
      slug,
      excerpt: input.excerpt.trim(),
      content: input.content,
      cover_image: input.cover_image?.trim() || null,
      tags: input.tags,
      status: input.status,
      updated_at: now,
    }

    // 所属项目（仅传入时改动；空串视为清除）
    if (input.project_id !== undefined) {
      payload.project_id = input.project_id || null
    }

    if (input.id) {
      const { data: existing } = await supabase
        .from('posts')
        .select('published_at, status')
        .eq('id', input.id)
        .single()

      if (input.status === 'published') {
        // 已发布过的文章保持原发布时间
        if (!existing?.published_at) payload.published_at = now
      } else if (input.scheduled_at !== undefined) {
        // 草稿同步定时发布时间（null 表示清除）
        payload.published_at = input.scheduled_at
          ? new Date(input.scheduled_at).toISOString()
          : null
      }

      const { error } = await supabase.from('posts').update(payload).eq('id', input.id)
      if (error) return { ok: false, error: `保存失败：${error.message}` }
      revalidatePath('/')
      revalidatePath('/admin')
      revalidatePath('/projects')
      revalidatePath(`/blog/${slug}`)
      return { ok: true, id: input.id }
    }

    payload.author_id = userId
    if (input.status === 'published') {
      payload.published_at = now
    } else if (input.scheduled_at) {
      // 新建草稿携带定时发布时间
      payload.published_at = new Date(input.scheduled_at).toISOString()
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: `Slug「${slug}」已存在，请更换一个` }
      }
      return { ok: false, error: `保存失败：${error.message}` }
    }
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/projects')
    return { ok: true, id: data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '保存失败' }
  }
}

/** 删除文章（admin 专用） */
export async function deletePost(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) return { ok: false, error: `删除失败：${error.message}` }
    revalidatePath('/')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}

/** 上传媒体文件到 Storage media 桶，返回公开 URL（admin 专用） */
export async function uploadMedia(file: File): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    if (file.size > 100 * 1024 * 1024) {
      return { ok: false, error: '文件不能超过 100MB' }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

    const { error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    })
    if (error) return { ok: false, error: `上传失败：${error.message}` }

    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return { ok: true, url: data.publicUrl }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '上传失败' }
  }
}

/** 删除任意评论（admin 专用，依赖 008 迁移的 comments_admin_delete policy） */
export async function deleteComment(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) return { ok: false, error: `删除失败：${error.message}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}

/** 删除 media 桶文件（admin 专用） */
export async function removeMedia(name: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    // 简单防目录穿越：只允许删除根目录下的文件名
    if (!name || name.includes('/') || name.includes('..')) {
      return { ok: false, error: '非法文件名' }
    }
    const { error } = await supabase.storage.from('media').remove([name])
    if (error) return { ok: false, error: `删除失败：${error.message}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '删除失败' }
  }
}

/** 解析 .md 文件的 frontmatter 与正文（不落库），供编辑器导入填充 */
export async function parseMarkdown(
  file: File
): Promise<
  | {
      ok: true
      title: string
      slug: string
      excerpt: string
      content: string
      cover_image: string
      tags: string[]
      status: 'draft' | 'published'
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdmin()
    const text = await file.text()
    const { data: fm, content } = matter(text)
    const title = String(fm.title ?? '').trim() || file.name.replace(/\.md$/i, '')

    return {
      ok: true,
      title,
      slug: slugify(String(fm.slug ?? '') || title),
      excerpt: String(fm.excerpt ?? '').trim(),
      content,
      cover_image: fm.cover_image ? String(fm.cover_image) : '',
      tags: normalizeTags(fm.tags),
      status: fm.draft === true ? 'draft' : 'published',
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '解析失败' }
  }
}

/** 导入 .md 文件（解析 frontmatter），返回新文章 id（admin 专用） */
export async function importMarkdown(file: File): Promise<ActionResult> {
  try {
    const userId = await requireAdmin()
    const supabase = await createClient()

    const text = await file.text()
    const { data: fm, content } = matter(text)

    const title = String(fm.title ?? '').trim() || file.name.replace(/\.md$/i, '')
    const slug = slugify(String(fm.slug ?? '') || title) || `post-${Date.now()}`
    const status = fm.draft === true ? 'draft' : 'published'
    const published_at =
      fm.date && !isNaN(new Date(fm.date as string).getTime())
        ? new Date(fm.date as string).toISOString()
        : status === 'published'
          ? new Date().toISOString()
          : null

    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        slug,
        excerpt: String(fm.excerpt ?? '').trim() || content.slice(0, 100).replace(/\s+/g, ' '),
        content,
        cover_image: fm.cover_image ? String(fm.cover_image) : null,
        tags: normalizeTags(fm.tags),
        status,
        published_at,
        author_id: userId,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: `Slug「${slug}」已存在，请修改 md 文件中的 slug 后重试` }
      }
      return { ok: false, error: `导入失败：${error.message}` }
    }

    revalidatePath('/')
    revalidatePath('/admin')
    return { ok: true, id: data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '导入失败' }
  }
}

/** 规范化逗号/数组输入为去重后的字符串数组 */
function normalizeList(raw: unknown): string[] {
  const list = normalizeTags(raw)
  return [...new Set(list)]
}

/** 清理 URL 字段：空串视为 null */
function cleanUrl(raw: unknown): string | null {
  const url = String(raw ?? '').trim()
  return url || null
}

export interface SaveProjectInput {
  id?: string
  name: string
  slug: string
  tagline?: string
  description?: string
  repo_url?: string
  demo_url?: string
  languages: string[]
  tech_stack: string[]
  screenshots: string[]
  status: 'draft' | 'published'
  sort_order?: number
}

/** 新建或更新项目（admin 专用） */
export async function saveProject(input: SaveProjectInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const name = input.name.trim()
    const slug = slugify(input.slug || input.name)
    if (!name || !slug) {
      return { ok: false, error: '项目名称与 Slug 均为必填' }
    }

    const payload: Record<string, unknown> = {
      name,
      slug,
      tagline: input.tagline?.trim() || null,
      description: input.description?.trim() || null,
      repo_url: cleanUrl(input.repo_url),
      demo_url: cleanUrl(input.demo_url),
      languages: normalizeList(input.languages),
      tech_stack: normalizeList(input.tech_stack),
      screenshots: (input.screenshots ?? []).map((s) => s.trim()).filter(Boolean),
      status: input.status,
      sort_order: Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0,
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      const { error } = await supabase.from('projects').update(payload).eq('id', input.id)
      if (error) return { ok: false, error: `保存失败：${error.message}` }
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single()
      if (error) {
        if (error.code === '23505') {
          return { ok: false, error: `Slug「${slug}」已存在，请更换一个` }
        }
        return { ok: false, error: `保存失败：${error.message}` }
      }
      revalidatePath('/admin/projects')
      return { ok: true, id: data.id }
    }

    revalidatePath('/admin/projects')
    revalidatePath('/projects')
    return { ok: true, id: input.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}

/** 删除项目（admin 专用；关联文章的 project_id 由外键 on delete set null 自动置空） */
export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return { ok: false, error: `删除失败：${error.message}` }
    revalidatePath('/admin/projects')
    revalidatePath('/projects')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}
