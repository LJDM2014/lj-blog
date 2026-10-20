import Link from 'next/link'
import { createClient, getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ like_page?: string; fav_page?: string }>
}

interface InteractionRow {
  id: string
  created_at: string
  posts: { title: string | null; slug: string | null } | null
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

interface InteractionItem {
  id: string
  created_at: string
  post_title: string | null
  post_slug: string | null
  user_name: string | null
  avatar_url: string | null
}

function parsePage(param?: string) {
  return Math.max(1, Number(param) || 1)
}

function toItems(rows: InteractionRow[] | null): InteractionItem[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    post_title: r.posts?.title ?? null,
    post_slug: r.posts?.slug ?? null,
    user_name: r.profiles?.display_name ?? null,
    avatar_url: r.profiles?.avatar_url ?? null,
  }))
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? '用户头像'}
        className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
      />
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

function InteractionList({
  items,
  emptyText,
}: {
  items: InteractionItem[]
  emptyText: string
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
  }
  return (
    <ul className="overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
        >
          <Avatar url={item.avatar_url} name={item.user_name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium text-foreground">
                {item.user_name || '匿名用户'}
              </span>
              {item.post_slug ? (
                <Link
                  href={`/blog/${item.post_slug}`}
                  className="truncate text-primary hover:underline"
                >
                  《{item.post_title || '无标题'}》
                </Link>
              ) : (
                <span className="text-muted-foreground">文章已删除</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminInteractionsPage({ searchParams }: Props) {
  const { like_page: likePageParam, fav_page: favPageParam } = await searchParams
  const likePage = parsePage(likePageParam)
  const favPage = parsePage(favPageParam)
  const likeFrom = (likePage - 1) * PAGE_SIZE
  const favFrom = (favPage - 1) * PAGE_SIZE

  const user = await getUser()
  const uid = user?.id ?? ''

  const supabase = await createClient()

  const [likesRes, favsRes] = await Promise.all([
    supabase
      .from('likes')
      .select('id, created_at, posts ( title, slug ), profiles ( display_name, avatar_url )', {
        count: 'exact',
        head: false,
      })
      .eq('posts.author_id', uid)
      .order('created_at', { ascending: false })
      .range(likeFrom, likeFrom + PAGE_SIZE - 1)
      .returns<InteractionRow[]>(),
    supabase
      .from('favorites')
      .select(
        'id, created_at, posts!favorites_post_fk ( title, slug ), profiles!favorites_user_fk ( display_name, avatar_url )',
        {
          count: 'exact',
          head: false,
        }
      )
      .eq('posts.author_id', uid)
      .order('created_at', { ascending: false })
      .range(favFrom, favFrom + PAGE_SIZE - 1)
      .returns<InteractionRow[]>(),
  ])

  const likes = toItems(likesRes.data)
  const favs = toItems(favsRes.data)
  const likeTotal = likesRes.count ?? 0
  const favTotal = favsRes.count ?? 0
  const likePages = Math.max(1, Math.ceil(likeTotal / PAGE_SIZE))
  const favPages = Math.max(1, Math.ceil(favTotal / PAGE_SIZE))

  const errorBanner = (msg: string) => (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {msg}
    </div>
  )

  const buildHref = (likeP: number, favP: number) => {
    const params = new URLSearchParams()
    if (likeP > 1) params.set('like_page', String(likeP))
    if (favP > 1) params.set('fav_page', String(favP))
    const qs = params.toString()
    return qs ? `/admin/interactions?${qs}` : '/admin/interactions'
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            收到的点赞 <span className="text-sm font-normal text-muted-foreground">共 {likeTotal} 条</span>
          </h2>
          {likePages > 1 && (
            <div className="flex items-center gap-3 text-sm">
              {likePage > 1 ? (
                <Link href={buildHref(likePage - 1, favPage)} className="text-primary hover:underline">
                  上一页
                </Link>
              ) : (
                <span className="text-muted-foreground/50">上一页</span>
              )}
              <span className="text-muted-foreground">
                {likePage} / {likePages}
              </span>
              {likePage < likePages ? (
                <Link href={buildHref(likePage + 1, favPage)} className="text-primary hover:underline">
                  下一页
                </Link>
              ) : (
                <span className="text-muted-foreground/50">下一页</span>
              )}
            </div>
          )}
        </div>
        {likesRes.error
          ? errorBanner(`点赞数据加载失败：${likesRes.error.message}`)
          : <InteractionList items={likes} emptyText="还没有人点赞你的文章" />}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            收到的收藏 <span className="text-sm font-normal text-muted-foreground">共 {favTotal} 条</span>
          </h2>
          {favPages > 1 && (
            <div className="flex items-center gap-3 text-sm">
              {favPage > 1 ? (
                <Link href={buildHref(likePage, favPage - 1)} className="text-primary hover:underline">
                  上一页
                </Link>
              ) : (
                <span className="text-muted-foreground/50">上一页</span>
              )}
              <span className="text-muted-foreground">
                {favPage} / {favPages}
              </span>
              {favPage < favPages ? (
                <Link href={buildHref(likePage, favPage + 1)} className="text-primary hover:underline">
                  下一页
                </Link>
              ) : (
                <span className="text-muted-foreground/50">下一页</span>
              )}
            </div>
          )}
        </div>
        {favsRes.error
          ? errorBanner(`收藏数据加载失败：${favsRes.error.message}`)
          : <InteractionList items={favs} emptyText="还没有人收藏你的文章" />}
      </section>
    </div>
  )
}
