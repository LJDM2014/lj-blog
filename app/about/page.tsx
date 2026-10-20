import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '关于',
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">关于</h1>

      <div className="space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-10">
        <section className="prose prose-lg max-w-none text-foreground">
          <h2 className="text-xl font-bold">关于我</h2>
          <p className="text-muted-foreground">
            你好，欢迎来到我的博客。这里记录我在技术路上的学习笔记、踩坑经验与一些生活随想。
          </p>

          <h2 className="text-xl font-bold">关于本站</h2>
          <p className="text-muted-foreground">
            本站基于 Next.js + Supabase + Tailwind CSS 构建，部署在 Cloudflare
            Workers 上，源码与内容均由自己维护。
          </p>

          <h2 className="text-xl font-bold">联系我</h2>
          <p className="text-muted-foreground">
            如果你想交流技术、互换友链或仅仅打个招呼，欢迎在文章下方留言。
          </p>
        </section>
      </div>
    </main>
  )
}
