'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ProfileRow {
  display_name: string | null
  avatar_url: string | null
}

interface MyComment {
  id: string
  content: string
  created_at: string
  post: { title: string; slug: string } | null
}

interface MyPostRef {
  post_id: string
  created_at: string
  post: { title: string; slug: string } | null
}

type Tab = 'comments' | 'favorites' | 'likes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'comments', label: '我的评论' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'likes', label: '我的点赞' },
]

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // 资料编辑
  const [profile, setProfile] = useState<ProfileRow>({ display_name: '', avatar_url: null })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 修改密码
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

  // 互动 Tab
  const [tab, setTab] = useState<Tab>('comments')
  const [comments, setComments] = useState<MyComment[]>([])
  const [favorites, setFavorites] = useState<MyPostRef[]>([])
  const [likes, setLikes] = useState<MyPostRef[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { id: user.id, email: user.email } : null)
      setAuthChecked(true)
    })
  }, [])

  const loadProfile = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', uid)
      .single()
    if (data) setProfile({ display_name: data.display_name ?? '', avatar_url: data.avatar_url })
  }, [])

  useEffect(() => {
    if (user) loadProfile(user.id)
  }, [user, loadProfile])

  const loadTab = useCallback(async (t: Tab, uid: string) => {
    setListLoading(true)
    setListError(null)
    const supabase = createClient()
    // comments → posts 存在两条外键（comments_post_fk / comments_post_id_fkey），
    // 必须用显式外键名消除联表歧义，否则 PostgREST 报 PGRST201
    if (t === 'comments') {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, post:posts!comments_post_fk ( title, slug )')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) {
        setListError(`评论加载失败：${error.message}`)
        setComments([])
      } else {
        setComments((data as unknown as MyComment[]) ?? [])
      }
    } else if (t === 'favorites') {
      const { data, error } = await supabase
        .from('favorites')
        .select('post_id, created_at, post:post_id ( title, slug )')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) {
        setListError(`收藏加载失败：${error.message}`)
        setFavorites([])
      } else {
        setFavorites((data as unknown as MyPostRef[]) ?? [])
      }
    } else {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id, created_at, post:post_id ( title, slug )')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) {
        setListError(`点赞加载失败：${error.message}`)
        setLikes([])
      } else {
        setLikes((data as unknown as MyPostRef[]) ?? [])
      }
    }
    setListLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadTab(tab, user.id)
  }, [tab, user, loadTab])

  if (!authChecked) return null

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            登录
          </Link>{' '}
          后查看个人中心
        </div>
      </main>
    )
  }

  /** 上传头像：写到 avatars/{uid}/ 目录（RLS 限定只能写本人目录） */
  const handleAvatarUpload = async (file: File) => {
    setProfileMsg(null)
    if (!file.type.startsWith('image/')) {
      setProfileMsg('只能上传图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg('头像不能超过 5MB')
      return
    }

    setSavingProfile(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { cacheControl: '31536000', upsert: false })

    if (uploadError) {
      setProfileMsg(`上传失败：${uploadError.message}`)
      setSavingProfile(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id)

    if (updateError) {
      setProfileMsg(`保存失败：${updateError.message}`)
    } else {
      setProfile((p) => ({ ...p, avatar_url: data.publicUrl }))
      setProfileMsg('头像已更新')
    }
    setSavingProfile(false)
  }

  const handleSaveProfile = async () => {
    setProfileMsg(null)
    const name = profile.display_name?.trim() ?? ''
    if (!name) {
      setProfileMsg('昵称不能为空')
      return
    }
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user.id)
    setProfileMsg(error ? `保存失败：${error.message}` : '资料已保存')
    setSavingProfile(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (!user.email) {
      setPasswordMsg('当前账号未绑定邮箱，无法校验密码')
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg('新密码至少 6 位字符')
      return
    }
    setSavingPassword(true)
    const supabase = createClient()
    // 先用当前密码尝试登录，验证旧密码正确后才允许修改
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })
    if (verifyError) {
      setPasswordMsg('当前密码不正确')
      setSavingPassword(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordMsg(`修改失败：${error.message}`)
    } else {
      setPasswordMsg('密码已修改')
      setOldPassword('')
      setNewPassword('')
    }
    setSavingPassword(false)
  }

  const commentCount = comments.length
  const favoriteCount = favorites.length
  const likeCount = likes.length

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">个人中心</h1>

      {/* ---------- 资料编辑 ---------- */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">基本资料</h2>
        <div className="mb-4 flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="头像"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-medium text-primary">
              {(profile.display_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingProfile}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
            >
              {savingProfile ? '上传中...' : '更换头像'}
            </button>
            <p className="mt-1 text-xs text-muted-foreground">支持 JPG/PNG，不超过 5MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleAvatarUpload(file)
              e.target.value = ''
            }}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-card-foreground">
            昵称
          </label>
          <input
            id="displayName"
            type="text"
            value={profile.display_name ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
            placeholder="你的昵称"
            className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">邮箱</label>
          <p className="text-sm text-muted-foreground">{user.email ?? '未绑定邮箱'}</p>
        </div>

        {profileMsg && <p className="mb-3 text-sm text-primary">{profileMsg}</p>}

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {savingProfile ? '保存中...' : '保存资料'}
        </button>
      </section>

      {/* ---------- 修改密码 ---------- */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">修改密码</h2>
        <form onSubmit={handleChangePassword} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="oldPassword" className="mb-1.5 block text-sm font-medium text-card-foreground">
              当前密码
            </label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="输入当前密码验证"
              required
              className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-card-foreground">
              新密码
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 位字符"
              minLength={6}
              required
              className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {savingPassword ? '修改中...' : '修改密码'}
          </button>
        </form>
        {passwordMsg && <p className="mt-3 text-sm text-primary">{passwordMsg}</p>}
      </section>

      {/* ---------- 我的互动 ---------- */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex border-b border-border">
          {TABS.map((t) => {
            const count = t.key === 'comments' ? commentCount : t.key === 'favorites' ? favoriteCount : likeCount
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
                {count > 0 && ` (${count})`}
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {listLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">加载中...</p>
          ) : listError ? (
            <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{listError}</p>
          ) : tab === 'comments' ? (
            comments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">还没有发表过评论</p>
            ) : (
              <ul className="divide-y divide-border">
                {comments.map((c) => (
                  <li key={c.id} className="py-3">
                    <p className="line-clamp-2 text-sm text-foreground">{c.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.post ? (
                        <Link href={`/blog/${c.post.slug}`} className="text-primary hover:underline">
                          {c.post.title}
                        </Link>
                      ) : (
                        '文章已删除'
                      )}
                      {' · '}
                      {new Date(c.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : (
            (() => {
              const list = tab === 'favorites' ? favorites : likes
              return list.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {tab === 'favorites' ? '还没有收藏文章' : '还没有点赞文章'}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {list.map((item) => (
                    <li key={item.post_id} className="py-3">
                      <Link
                        href={`/blog/${item.post?.slug ?? ''}`}
                        className="text-sm text-foreground transition-colors hover:text-primary"
                      >
                        {item.post?.title ?? '文章已删除'}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            })()
          )}
        </div>
      </section>
    </main>
  )
}
