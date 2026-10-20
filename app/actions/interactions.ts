'use server'

import { getUser, createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'
import { filterSensitiveWords } from '@/lib/moderation'

/** 通知类型（与 notifications.type 的 check 约束一致） */
type NotificationType = 'reply' | 'like' | 'favorite' | 'system'

export type InteractionResult =
  | { ok: true; liked?: boolean; count?: number; favorited?: boolean }
  | { ok: false; error: string }

/** 服务端发送站内通知（RLS 兜底：不能给自己发） */
async function notify(input: {
  userId: string
  actorId: string
  type: NotificationType
  postId?: string
  commentId?: string
  commentExcerpt?: string
}): Promise<void> {
  if (input.userId === input.actorId) return
  const supabase = await createClient()
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    actor_id: input.actorId,
    type: input.type,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    comment_excerpt: input.commentExcerpt ? input.commentExcerpt.slice(0, 100) : null,
  })
  if (error) console.error('发送通知失败:', error.message)
}

/**
 * 发表评论（根评论或回复）。
 * 服务端链路：登录校验 → 限流 3 次/分 → Turnstile → 敏感词过滤 → RLS insert。
 */
export async function submitComment(
  postId: string,
  content: string,
  parentId: string | null,
  turnstileToken: string | null
): Promise<InteractionResult> {
  try {
    const user = await getUser()
    if (!user) return { ok: false, error: '请先登录' }

    const text = content.trim()
    if (!text) return { ok: false, error: '评论内容不能为空' }
    if (text.length > 2000) return { ok: false, error: '评论最长 2000 字' }

    const supabase = await createClient()

    const { allowed } = await checkRateLimit(supabase, 'comment', `user:${user.id}`, 3, 60)
    if (!allowed) return { ok: false, error: '评论太频繁了，请一分钟后再试' }

    const human = await verifyTurnstile(turnstileToken)
    if (!human) return { ok: false, error: '人机验证未通过，请重试' }

    // 回复时查询被回复人，用于发送站内通知
    let replyToUserId: string | null = null
    if (parentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentId)
        .maybeSingle()
      replyToUserId = parent?.user_id ?? null
    }

    const filtered = filterSensitiveWords(text)
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: filtered,
        parent_id: parentId,
      })
      .select('id')
      .single()

    if (error) return { ok: false, error: `评论提交失败：${error.message}` }

    if (replyToUserId) {
      await notify({
        userId: replyToUserId,
        actorId: user.id,
        type: 'reply',
        postId,
        commentId: data.id,
        commentExcerpt: text,
      })
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}

/** 点赞/取消点赞（限流 30 次/分），返回最新状态 */
export async function toggleLike(postId: string): Promise<InteractionResult> {
  try {
    const user = await getUser()
    if (!user) return { ok: false, error: '请先登录' }

    const supabase = await createClient()

    const { allowed } = await checkRateLimit(supabase, 'like', `user:${user.id}`, 30, 60)
    if (!allowed) return { ok: false, error: '操作太频繁了，请稍后再试' }

    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
      if (error) return { ok: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id })
      if (error) return { ok: false, error: error.message }

      // 通知文章作者
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .maybeSingle()
      if (post?.author_id) {
        await notify({ userId: post.author_id, actorId: user.id, type: 'like', postId })
      }
    }

    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)

    return { ok: true, liked: !existing, count: count ?? 0 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}

/** 收藏/取消收藏（限流 30 次/分），返回最新状态 */
export async function toggleFavorite(postId: string): Promise<InteractionResult> {
  try {
    const user = await getUser()
    if (!user) return { ok: false, error: '请先登录' }

    const supabase = await createClient()

    const { allowed } = await checkRateLimit(supabase, 'favorite', `user:${user.id}`, 30, 60)
    if (!allowed) return { ok: false, error: '操作太频繁了，请稍后再试' }

    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
      if (error) return { ok: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ post_id: postId, user_id: user.id })
      if (error) return { ok: false, error: error.message }

      // 通知文章作者
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .maybeSingle()
      if (post?.author_id) {
        await notify({ userId: post.author_id, actorId: user.id, type: 'favorite', postId })
      }
    }

    return { ok: true, favorited: !existing }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '操作失败' }
  }
}
