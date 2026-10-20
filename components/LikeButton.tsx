'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleLike } from '@/app/actions/interactions'

interface LikeButtonProps {
  postId: string
}

export default function LikeButton({ postId }: LikeButtonProps) {
  const [count, setCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)

  // 监听登录态
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { id: user.id } : null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 点赞数公开可读；已登录时查询自己是否点过
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .then(({ count }) => setCount(count ?? 0))

    if (!user) {
      setLiked(false)
      return
    }
    supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [user, postId])

  const handleToggleLike = async () => {
    if (!user || loading) return

    setLoading(true)
    setError(null)
    // 服务端链路：登录校验 → 限流 30 次/分 → RLS 写入 → 通知作者
    const res = await toggleLike(postId)
    if (res.ok === false) {
      setError(res.error)
    } else {
      setLiked(!!res.liked)
      setCount(res.count ?? 0)
    }
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleToggleLike}
        disabled={loading || !user}
        title={!user ? '登录后可点赞' : undefined}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          liked
            ? 'border-primary bg-accent text-primary'
            : 'border-border bg-card text-muted-foreground hover:text-foreground'
        }`}
      >
        <svg
          className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          fill={liked ? 'currentColor' : 'none'}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
          />
        </svg>
        点赞 {count > 0 && count}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
