import { createClient } from '@/lib/supabase/server'

export interface Project {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  repo_url: string | null
  demo_url: string | null
  languages: string[] | null
  tech_stack: string[] | null
  screenshots: string[] | null
  status: 'draft' | 'published'
  sort_order: number
  created_at: string
  updated_at?: string
}

export interface ProjectListItem extends Project {
  /** 关联文章数（admin 列表用，查询失败时为 null） */
  post_count?: number | null
}

/** 文章所属项目信息（文章详情页徽章用） */
export interface PostProject {
  id: string
  slug: string
  name: string
}

const LIST_FIELDS =
  'id, slug, name, tagline, description, repo_url, demo_url, languages, tech_stack, screenshots, status, sort_order, created_at'

/**
 * 定时发布过滤：published_at 晚于当前时间的文章不对外可见。
 * 与 lib/posts.ts 的 publishedGuard 语义保持一致
 */
const publishedGuard = () => `published_at.is.null,published_at.lte.${new Date().toISOString()}`

/** 已发布项目列表（前台列表页用），按 sort_order、创建时间排序 */
export async function getPublishedProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(LIST_FIELDS)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取项目列表失败:', error)
    return []
  }
  return data ?? []
}

/** 按 slug 获取已发布项目（详情页用；草稿返回 null → 404） */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, name, tagline, description, repo_url, demo_url, languages, tech_stack, screenshots, status, sort_order, created_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) return null
  return data
}

/** 某项目下的已发布文章（项目详情页「相关文章」用） */
export async function getProjectPosts(projectId: string): Promise<
  { id: string; slug: string; title: string; published_at: string | null; created_at: string }[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, published_at, created_at')
    .eq('project_id', projectId)
    .eq('status', 'published')
    .or(publishedGuard())
    .order('published_at', { ascending: false })

  if (error) {
    console.error('获取项目文章失败:', error)
    return []
  }
  return data ?? []
}

/** 文章所属项目（文章详情页徽章用；迁移未执行或未关联时返回 null） */
export async function getPostProject(postId: string): Promise<PostProject | null> {
  try {
    const supabase = await createClient()
    // 通过 posts → projects 外键反向嵌入；011 未执行（外键不存在）时整体失败，静默返回 null
    const { data, error } = await supabase
      .from('posts')
      .select('project:projects(id, slug, name)')
      .eq('id', postId)
      .single()

    if (error || !data) return null
    // 无类型客户端下 embed 可能被推断为数组，做一次兼容取值
    const raw = data.project as unknown
    const project = Array.isArray(raw) ? raw[0] : raw
    if (!project) return null
    return project as PostProject
  } catch {
    return null
  }
}

/** 管理后台项目列表（含草稿，带关联文章数） */
export async function getAdminProjects(): Promise<ProjectListItem[]> {
  const supabase = await createClient()

  // 先带文章数联查（依赖 posts → projects 外键），失败时回退为不带文章数的普通查询
  const { data, error } = await supabase
    .from('projects')
    .select(`${LIST_FIELDS}, posts(count)`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const fallback = await supabase
      .from('projects')
      .select(LIST_FIELDS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (fallback.error) {
      console.error('获取管理项目列表失败:', fallback.error)
      return []
    }
    return (fallback.data ?? []).map((p) => ({ ...(p as Project), post_count: null }))
  }

  return (data ?? []).map((p) => {
    const { posts, ...rest } = p as typeof p & { posts?: { count: number }[] }
    return { ...(rest as Project), post_count: posts?.[0]?.count ?? 0 }
  })
}

/** 按 id 获取项目（管理后台编辑用，含草稿） */
export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, name, tagline, description, repo_url, demo_url, languages, tech_stack, screenshots, status, sort_order, created_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
