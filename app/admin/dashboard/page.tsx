import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TrendChart from '@/components/admin/TrendChart'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totals: { posts: number; published: number; comments: number; users: number; total_views: number }
  today: { pv: number; uv: number }
  daily: { view_date: string; pv: number; uv: number }[]
  top_posts: { id: string; title: string; slug: string; views: number }[]
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 聚合数据走 get_dashboard_stats RPC（008 迁移）；未执行时回退到 posts 表基础统计
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats')
  const stats = rpcError ? null : (rpcData as unknown as DashboardStats)

  let topPosts = stats?.top_posts ?? []
  let fallbackTotals: DashboardStats['totals'] | null = null

  if (!stats) {
    const { count: postCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
    const { count: publishedCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
    const { count: commentCount } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
    const { count: userCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    const { data: viewsRow } = await supabase.from('posts').select('views')
    fallbackTotals = {
      posts: postCount ?? 0,
      published: publishedCount ?? 0,
      comments: commentCount ?? 0,
      users: userCount ?? 0,
      total_views: (viewsRow ?? []).reduce((acc, r) => acc + (r.views ?? 0), 0),
    }
    const { data: top } = await supabase
      .from('posts')
      .select('id, title, slug, views')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(10)
    topPosts = (top as DashboardStats['top_posts']) ?? []
  }

  const totals = stats?.totals ?? fallbackTotals!
  const notMigrated = !!rpcError && (rpcError as { code?: string }).code === 'PGRST202'

  return (
    <div className="space-y-8">
      {notMigrated && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          008 迁移尚未在 Supabase SQL Editor 执行：PV/UV 趋势与今日统计暂不可用（基础统计来自 posts 表）。
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">概览</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="文章总数" value={totals.posts} hint={`已发布 ${totals.published}`} />
          <StatCard label="评论总数" value={totals.comments} />
          <StatCard label="注册用户" value={totals.users} />
          <StatCard label="总阅读量" value={totals.total_views} />
          <StatCard label="今日 PV" value={stats ? stats.today.pv : '—'} />
          <StatCard label="今日 UV" value={stats ? stats.today.uv : '—'} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-bold text-foreground">近 14 天访问趋势</h2>
        {stats ? <TrendChart data={stats.daily} /> : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            执行 008 迁移后可查看 PV/UV 趋势
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">热门文章 TOP10</h2>
        {topPosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无已发布文章</p>
        ) : (
          <ol className="overflow-hidden rounded-2xl border border-border bg-card">
            {topPosts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <Link
                  href={`/blog/${p.slug}`}
                  className="min-w-0 flex-1 truncate text-sm text-foreground transition-colors hover:text-primary"
                >
                  {p.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{p.views ?? 0} 次阅读</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
