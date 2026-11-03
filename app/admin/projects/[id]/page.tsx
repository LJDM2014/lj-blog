import { notFound } from 'next/navigation'
import ProjectEditor from '@/components/ProjectEditor'
import { getProjectById } from '@/lib/projects'

export const dynamic = 'force-dynamic'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProjectById(id)

  if (!project) {
    notFound()
  }

  return (
    <ProjectEditor
      initial={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        tagline: project.tagline ?? '',
        description: project.description ?? '',
        repo_url: project.repo_url ?? '',
        demo_url: project.demo_url ?? '',
        languages: (project.languages ?? []).join(', '),
        tech_stack: (project.tech_stack ?? []).join(', '),
        screenshots: project.screenshots ?? [],
        status: project.status,
        sort_order: project.sort_order,
      }}
    />
  )
}
