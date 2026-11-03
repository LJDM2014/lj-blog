import { notFound } from 'next/navigation'
import PostEditor from '@/components/PostEditor'
import { getPostById } from '@/lib/posts'
import { getAdminProjects } from '@/lib/projects'

export const dynamic = 'force-dynamic'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [post, projects] = await Promise.all([getPostById(id), getAdminProjects()])

  if (!post) {
    notFound()
  }

  return (
    <PostEditor
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        cover_image: post.cover_image ?? '',
        tags: (post.tags ?? []).join(', '),
        status: post.status,
        published_at: post.published_at,
        project_id: post.project_id ?? null,
      }}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  )
}
