'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'

interface User {
  id: string
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
  }
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        setIsAdmin(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      setIsAdmin(data?.role === 'admin')
    }

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser((session?.user as User) ?? null)
      await loadProfile(session?.user?.id)
    }
    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser((session?.user as User) ?? null)
      await loadProfile(session?.user?.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-foreground">
              我的博客
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              首页
            </Link>
            <Link
              href="/archives"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              归档
            </Link>
            <Link
              href="/tags"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              标签
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/search"
              aria-label="搜索"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </Link>
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationBell />
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary sm:block"
                  >
                    管理后台
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-foreground"
                    aria-label="用户菜单"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="头像"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.user_metadata?.full_name || user.email || '?')
                        ?.charAt(0)
                        .toUpperCase()
                    )}
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
                      <div className="truncate px-3 py-2 text-xs text-muted-foreground">
                        {user.email}
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        个人中心
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="block px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted sm:hidden"
                        >
                          管理后台
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
