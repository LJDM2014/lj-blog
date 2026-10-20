import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/lib/posts'

export const dynamic = 'force-dynamic'

const WIDTH = 1200
const HEIGHT = 630

// 中文字体在模块级缓存（isolate 存活期内复用），Source Han Sans 思源黑体简中子集
let fontCache: ArrayBuffer | null = null
async function loadFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/gh/adobe-fonts/source-han-sans@release/SubsetOTF/CN/SourceHanSansCN-Regular.otf',
      { cache: 'force-cache' }
    )
    if (!res.ok) return null
    fontCache = await res.arrayBuffer()
    return fontCache
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) {
    return new Response('Not Found', { status: 404 })
  }

  const font = await loadFont()
  // 字体加载失败时返回 503：无中文字体渲染会出豆腐块，宁缺毋滥
  if (!font) {
    return new Response('Font unavailable', { status: 503 })
  }

  // 标题过长截断
  const title = post.title.length > 30 ? `${post.title.slice(0, 30)}…` : post.title
  const date = new Date(post.published_at ?? post.created_at)
    .toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)',
          color: '#f8fafc',
          fontFamily: 'Source Han Sans CN',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, opacity: 0.75 }}>我的博客</div>
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 16 ? 60 : 72,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.75 }}>{date}</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Source Han Sans CN',
          data: font,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  )
}
