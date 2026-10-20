import { notFound } from 'next/navigation'
import PostEditor from '@/components/PostEditor'
import { getPostById } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPostById(id)

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
      }}
    />
  )
}
