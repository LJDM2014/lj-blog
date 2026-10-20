'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { submitComment } from '@/app/actions/interactions'
import Turnstile, { turnstileEnabled } from '@/components/Turnstile'

interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  created_at: string
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
}

interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[]
}

interface CommentSectionProps {
  postId: string
}

interface CommentItemProps {
  comment: CommentWithReplies
  isReply?: boolean
  loggedIn: boolean
  replyingTo: string | null
  replyContent: string
  loading: boolean
  onToggleReply: (id: string) => void
  onReplyChange: (value: string) => void
  onReplySubmit: (e: React.FormEvent) => void
  onCancelReply: () => void
}

/** 单条评论（含回复框与递归子回复）。
 *  必须定义在 CommentSection 外部：若定义在组件内部，父组件每次
 *  setState 都会重建组件类型，导致 React 卸载重挂、输入框失焦 */
function CommentItem({
  comment,
  isReply = false,
  loggedIn,
  replyingTo,
  replyContent,
  loading,
  onToggleReply,
  onReplyChange,
  onReplySubmit,
  onCancelReply,
}: CommentItemProps) {
  const authorName = comment.profiles?.display_name || '匿名用户'

  return (
    <div className={isReply ? 'ml-6 border-l-2 border-border pl-4 sm:ml-8' : ''}>
      <div className="mb-3 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          {comment.profiles?.avatar_url ? (
            <img
              src={comment.profiles.avatar_url}
              alt={authorName}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-medium text-primary">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-card-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{comment.content}</p>
        {loggedIn && !isReply && (
          <button
            onClick={() => onToggleReply(comment.id)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            回复
          </button>
        )}
      </div>

      {replyingTo === comment.id && (
        <form onSubmit={onReplySubmit} className="mb-3">
          <textarea
            value={replyContent}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder={`回复 ${authorName}...`}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            rows={2}
            required
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '提交中...' : '提交回复'}
            </button>
            <button
              type="button"
              onClick={onCancelReply}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          isReply
          loggedIn={loggedIn}
          replyingTo={replyingTo}
          replyContent={replyContent}
          loading={loading}
          onToggleReply={onToggleReply}
          onReplyChange={onReplyChange}
          onReplySubmit={onReplySubmit}
          onCancelReply={onCancelReply}
        />
      ))}
    </div>
  )
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Turnstile token（一次性：每次提交后重置组件重新获取）
  const [tsToken, setTsToken] = useState<string | null>(null)
  const [tsKey, setTsKey] = useState(0)
  const resetTurnstile = () => {
    setTsToken(null)
    setTsKey((k) => k + 1)
  }

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

  const fetchComments = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('comments')
      .select(
        `*,
        profiles:user_id (display_name, avatar_url)`
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取评论失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      setError(`评论加载失败：${error.message}`)
      return
    }
    setError(null)
    setComments(buildCommentTree((data as Comment[]) ?? []))
  }, [postId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const buildCommentTree = (comments: Comment[]): CommentWithReplies[] => {
    const commentMap = new Map<string, CommentWithReplies>()
    const rootComments: CommentWithReplies[] = []

    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    comments.forEach((comment) => {
      const node = commentMap.get(comment.id)!
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies.push(node)
          return
        }
      }
      rootComments.push(node)
    })

    return rootComments
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    setLoading(true)
    setError(null)
    const res = await submitComment(postId, newComment.trim(), null, tsToken)

    if (res.ok === false) {
      setError(res.error)
    } else {
      setNewComment('')
      resetTurnstile()
      await fetchComments()
    }
    setLoading(false)
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !replyContent.trim() || !replyingTo) return

    setLoading(true)
    setError(null)
    const res = await submitComment(postId, replyContent.trim(), replyingTo, tsToken)

    if (res.ok === false) {
      setError(res.error)
    } else {
      // 被回复人通知由服务端处理
      setReplyContent('')
      setReplyingTo(null)
      resetTurnstile()
      await fetchComments()
    }
    setLoading(false)
  }

  const total = (function count(nodes: CommentWithReplies[]): number {
    return nodes.reduce((acc, n) => acc + 1 + count(n.replies), 0)
  })(comments)

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl font-semibold text-foreground">评论 ({total})</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="写下你的评论..."
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            rows={3}
            required
          />
          <Turnstile key={tsKey} onToken={setTsToken} />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading || !newComment.trim() || (turnstileEnabled && !tsToken)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '提交中...' : '发表评论'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            登录
          </Link>{' '}
          或{' '}
          <Link href="/register" className="text-primary hover:underline">
            注册
          </Link>{' '}
          后参与评论
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            loggedIn={!!user}
            replyingTo={replyingTo}
            replyContent={replyContent}
            loading={loading}
            onToggleReply={(id) => {
              setReplyingTo(replyingTo === id ? null : id)
              setReplyContent('')
            }}
            onReplyChange={setReplyContent}
            onReplySubmit={handleReply}
            onCancelReply={() => {
              setReplyingTo(null)
              setReplyContent('')
            }}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          暂无评论，快来发表你的看法吧！
        </p>
      )}
    </section>
  )
}
