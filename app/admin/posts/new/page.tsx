import PostEditor from '@/components/PostEditor'
import { getAdminProjects } from '@/lib/projects'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const projects = await getAdminProjects()
  return <PostEditor projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
}
