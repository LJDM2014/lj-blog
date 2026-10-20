import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image: string | null
  content?: string
  status: 'draft' | 'published'
  tags?: string[] | null
  published_at: string | null
  created_at: string
  updated_at?: string
  views?: number
}

const LIST_FIELDS = 'id, slug, title, excerpt, cover_image, tags, status, published_at, created_at, views'

/**
 * 定时发布过滤：published_at 晚于当前时间的文章不对外可见。
 * is.null 兼容历史数据；配合 status='published' 使用（AND 关系）
 */
const publishedGuard = () => `published_at.is.null,published_at.lte.${new Date().toISOString()}`

/** 已发布文章列表（首页用），返回当前页数据与总数 */
export async function getPublishedPosts(
  page = 1,
  pageSize = 12
): Promise<{ posts: Post[]; total: number }> {
  const supabase = await createClient()
  const from = (page - 1) * pageSize

  const [{ count }, { data, error }] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or(publishedGuard()),
    supabase
      .from('posts')
      .select(LIST_FIELDS)
      .eq('status', 'published')
      .or(publishedGuard())
      .order('published_at', { ascending: false })
      .range(from, from + pageSize - 1),
  ])

  if (error) {
    console.error('获取文章列表失败:', error)
    return { posts: [], total: 0 }
  }
  return { posts: data ?? [], total: count ?? 0 }
}

/** 按 slug 获取已发布文章（详情页用；草稿或未到定时发布时间返回 null → 404） */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, content, status, tags, published_at, created_at, views')
    .eq('slug', slug)
    .eq('status', 'published')
    .or(publishedGuard())
    .single()

  if (error) return null
  return data
}

/** 阅读量自增（详情页每次访问调用，同步写 PV/UV 日表，失败静默忽略） */
export async function incrementViews(slug: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    const visitorId = cookieStore.get('vid')?.value ?? null
    const supabase = await createClient()
    await supabase.rpc('increment_views', { p_slug: slug, p_visitor_id: visitorId })
  } catch (e) {
    console.error('阅读量自增失败:', e)
  }
}

/** CJK 字符（中日韩文/假名/谚文），与 007 迁移中 posts_cjk_space 的范围保持一致 */
const CJK_RE = /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af])/g

/**
 * 构造 websearch 查询串（配合 007 迁移的 search_vector）：
 * - CJK 词逐字加空格，引号包裹后 phraseto 语义（天 <-> 气）实现中文子串匹配
 * - 西文词整体引号包裹，避免 OR/减号等 websearch 语法被误用
 * - 各词之间 OR 连接，最多取 8 个词
 */
function toWebSearchQuery(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["\\]/g, '').trim())
    .filter(Boolean)
    .slice(0, 8)
  if (terms.length === 0) return ''
  return terms.map((t) => `"${t.replace(CJK_RE, '$1 ').trim()}"`).join(' OR ')
}

/** 兜底搜索：ILIKE 模糊匹配（007 迁移未执行时使用） */
async function searchPostsILIKE(query: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<Post[]> {
  const q = query.replace(/[,()\\%_]/g, '')
  if (!q) return []
  const { data, error } = await supabase
    .from('posts')
    .select(LIST_FIELDS)
    .eq('status', 'published')
    .or(publishedGuard())
    .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('搜索失败:', error)
    return []
  }
  return data ?? []
}

/** 站内搜索：全文检索（tsvector + ts_rank 相关性排序），未执行 007 迁移时回退 ILIKE */
export async function searchPosts(query: string): Promise<Post[]> {
  const q = query.trim()
  if (!q) return []

  const supabase = await createClient()
  const tsQuery = toWebSearchQuery(q)
  if (tsQuery) {
    const { data, error } = await supabase
      .rpc('search_posts', { p_query: tsQuery, p_limit: 30 })
    if (!error) return (data ?? []) as Post[]
    // PGRST202 = 函数不存在（迁移未执行），回退 ILIKE；其余错误仅记录后同样回退
    console.error('全文搜索失败（回退 ILIKE）:', error)
  }
  return searchPostsILIKE(q, supabase)
}

/** 指定标签的已发布文章 */
export async function getPostsByTag(tag: string): Promise<Post[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(LIST_FIELDS)
    .eq('status', 'published')
    .or(publishedGuard())
    .contains('tags', [tag])
    .order('published_at', { ascending: false })

  if (error) {
    console.error('获取标签文章失败:', error)
    return []
  }
  return data ?? []
}

/** 所有标签及文章数（从已发布文章聚合） */
export async function getTagCounts(): Promise<{ tag: string; count: number }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('tags')
    .eq('status', 'published')

  if (error) {
    console.error('获取标签失败:', error)
    return []
  }

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** 归档数据：全部已发布文章的标题/时间（按发布时间倒序） */
export async function getArchivePosts(): Promise<
  Pick<Post, 'id' | 'slug' | 'title' | 'published_at' | 'created_at'>[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, published_at, created_at')
    .eq('status', 'published')
    .or(publishedGuard())
    .order('published_at', { ascending: false })

  if (error) {
    console.error('获取归档失败:', error)
    return []
  }
  return data ?? []
}

/** 相邻文章：返回发布时间早于/晚于当前文章的各一篇（详情页底部导航） */
export async function getAdjacentPosts(
  currentId: string,
  publishedAt: string | null
): Promise<{
  prev: Pick<Post, 'slug' | 'title' | 'published_at'> | null
  next: Pick<Post, 'slug' | 'title' | 'published_at'> | null
}> {
  if (!publishedAt) return { prev: null, next: null }

  const supabase = await createClient()
  const base = () =>
    supabase.from('posts').select('slug, title, published_at').eq('status', 'published').or(publishedGuard())

  const [prevRes, nextRes] = await Promise.all([
    base().lt('published_at', publishedAt).order('published_at', { ascending: false }).limit(1),
    base().gt('published_at', publishedAt).order('published_at', { ascending: true }).limit(1),
  ])

  return {
    prev: prevRes.data?.[0] ?? null,
    next: nextRes.data?.[0] ?? null,
  }
}

/** 相关文章：优先按标签重合度，无结果时回退为最新文章（均排除当前篇） */
export async function getRelatedPosts(
  currentId: string,
  tags: string[] | null | undefined,
  limit = 3
): Promise<Post[]> {
  const supabase = await createClient()
  const base = () =>
    supabase
      .from('posts')
      .select(LIST_FIELDS)
      .eq('status', 'published')
      .or(publishedGuard())
      .neq('id', currentId)
      .order('published_at', { ascending: false })

  // 先按标签重合度取
  if (tags && tags.length > 0) {
    const { data, error } = await base().overlaps('tags', tags).limit(limit)
    if (!error && data && data.length > 0) return data
  }

  // 回退：最新文章
  const { data, error } = await base().limit(limit)
  if (error) {
    console.error('获取相关文章失败:', error)
    return []
  }
  return data ?? []
}

/** 管理后台文章列表（RLS 保证仅 admin 可见草稿） */
export async function getAdminPosts(): Promise<Post[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, status, tags, published_at, created_at, updated_at, views')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取管理文章列表失败:', error)
    return []
  }
  return data ?? []
}

/** 按 id 获取文章（管理后台编辑用，含草稿） */
export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, content, status, tags, published_at, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
