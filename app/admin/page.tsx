import AdminPostList from '@/components/AdminPostList'
import { getAdminPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const posts = await getAdminPosts()
  return <AdminPostList posts={posts} />
}
