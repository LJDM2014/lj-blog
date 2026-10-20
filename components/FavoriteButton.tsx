'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleFavorite } from '@/app/actions/interactions'

interface FavoriteButtonProps {
  postId: string
}

export default function FavoriteButton({ postId }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user ? { id: user.id } : null)
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setIsFavorite(false)
      return
    }
    const supabase = createClient()
    supabase
      .from('favorites')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data))
  }, [user, postId])

  const handleToggleFavorite = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    // 服务端链路：登录校验 → 限流 30 次/分 → RLS 写入 → 通知作者
    const res = await toggleFavorite(postId)
    if (res.ok === false) {
      setError(res.error)
    } else {
      setIsFavorite(!!res.favorited)
    }
    setLoading(false)
  }

  return (
    <div className="text-right">
      <button
        onClick={handleToggleFavorite}
        disabled={loading || !user}
        title={!user ? '登录后可收藏' : undefined}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          isFavorite
            ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
            : 'border-border bg-card text-muted-foreground hover:text-foreground'
        }`}
      >
        <svg
          className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          fill={isFavorite ? 'currentColor' : 'none'}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {isFavorite ? '已收藏' : '收藏'}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
