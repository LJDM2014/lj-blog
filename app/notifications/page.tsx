'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NotificationRow {
  id: string
  type: 'reply' | 'like' | 'favorite' | 'system'
  is_read: boolean
  created_at: string
  comment_excerpt: string | null
  actor: { display_name: string | null; avatar_url: string | null } | null
  post: { title: string; slug: string } | null
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

function describe(n: NotificationRow): string {
  const name = n.actor?.display_name || '有人'
  switch (n.type) {
    case 'reply':
      return `${name} 回复了你的评论`
    case 'like':
      return `${name} 赞了你的文章`
    case 'favorite':
      return `${name} 收藏了你的文章`
    default:
      return `${name} 给你发了系统通知`
  }
}

export default function NotificationsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  const fetchItems = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select(
        `id, type, is_read, created_at, comment_excerpt,
        actor:actor_id ( display_name, avatar_url ),
        post:post_id ( title, slug )`
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    setItems((data as unknown as NotificationRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { id: user.id } : null)
      setAuthChecked(true)
      if (user) fetchItems(user.id)
      else setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null
      setUser(uid ? { id: uid } : null)
      if (uid) fetchItems(uid)
      else {
        setItems([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchItems])

  const unreadCount = items.filter((n) => !n.is_read).length

  /** 点击通知：标记已读并跳转到对应文章 */
  const handleOpen = async (n: NotificationRow) => {
    if (!n.is_read) {
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setItems((list) => list.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)))
    }
    if (n.post?.slug) router.push(`/blog/${n.post.slug}`)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setItems((list) => list.map((it) => ({ ...it, is_read: true })))
  }

  if (!authChecked) return null

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">通知中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} 条未读` : '全部已读'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            全部已读
          </button>
        )}
      </div>

      {!user ? (
        <div className="rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            登录
          </Link>{' '}
          后查看通知
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">暂无通知</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((n) => (
            <li key={n.id} className="border-b border-border last:border-b-0">
              <button
                onClick={() => handleOpen(n)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted ${
                  n.is_read ? '' : 'bg-accent/40'
                }`}
              >
                {n.actor?.avatar_url ? (
                  <img
                    src={n.actor.avatar_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-primary">
                    {(n.actor?.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {!n.is_read && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />
                    )}
                    {describe(n)}
                    {n.post?.title && (
                      <span className="text-muted-foreground">「{n.post.title}」</span>
                    )}
                  </p>
                  {n.comment_excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {n.comment_excerpt}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{relativeTime(n.created_at)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
