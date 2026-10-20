import type { MetadataRoute } from 'next'
import { getPublishedPosts, getTagCounts } from '@/lib/posts'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/archives`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/tags`, changeFrequency: 'weekly', priority: 0.5 },
  ]

  try {
    const [{ posts }, tags] = await Promise.all([
      getPublishedPosts(1, 1000),
      getTagCounts(),
    ])

    return [
      ...staticRoutes,
      ...posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at ?? post.published_at ?? post.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
      ...tags.map(({ tag }) => ({
        url: `${SITE_URL}/tags/${encodeURIComponent(tag)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.4,
      })),
    ]
  } catch {
    // 构建期数据库不可用时退化为仅静态路由
    return staticRoutes
  }
}
