import matter from 'gray-matter'
import { getRole } from '@/lib/supabase/server'
import { getPostById } from '@/lib/posts'

export const dynamic = 'force-dynamic'

/** 导出文章为 .md 文件下载（frontmatter + 正文） */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const role = await getRole()
  if (role !== 'admin') {
    return new Response('无权访问', { status: 403 })
  }

  const post = await getPostById(id)
  if (!post) {
    return new Response('文章不存在', { status: 404 })
  }

  const frontmatter = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    cover_image: post.cover_image ?? '',
    tags: post.tags ?? [],
    date: post.published_at ?? post.created_at,
    draft: post.status === 'draft',
  }

  const markdown = matter.stringify(post.content ?? '', frontmatter)

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(post.slug)}.md"`,
    },
  })
}
