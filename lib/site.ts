/** 站点根地址（RSS/sitemap/robots 用），部署时配置 NEXT_PUBLIC_SITE_URL，结尾不带斜杠 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')
