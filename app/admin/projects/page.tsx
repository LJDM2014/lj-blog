import AdminProjectList from '@/components/AdminProjectList'
import { getAdminProjects } from '@/lib/projects'

export const dynamic = 'force-dynamic'

export default async function AdminProjectsPage() {
  const projects = await getAdminProjects()
  return <AdminProjectList projects={projects} />
}
