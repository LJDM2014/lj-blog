import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/search', '/admin', '/login', '/register', '/notifications', '/profile'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
