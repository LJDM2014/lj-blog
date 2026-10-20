'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import GithubLoginButton from '@/components/GithubLoginButton'
import Turnstile, { turnstileEnabled } from '@/components/Turnstile'

export default function RegisterPage() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Turnstile token（一次性：每次提交后重置组件重新获取）
  const [tsToken, setTsToken] = useState<string | null>(null)
  const [tsKey, setTsKey] = useState(0)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    // 走服务端代理：限流（5 次/时/IP）+ Turnstile 校验
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname, turnstileToken: tsToken }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? '注册失败，请稍后再试')
      setTsToken(null)
      setTsKey((k) => k + 1)
      setLoading(false)
      return
    }

    if (json.hasSession) {
      // 未开启邮箱确认：注册即登录
      router.push('/')
      router.refresh()
    } else {
      // 开启了邮箱确认：提示查收邮件
      setLoading(false)
      setInfo('注册成功！请查收邮箱中的验证邮件，验证后即可登录。')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold text-card-foreground">注册</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            只需邮箱和密码，一分钟完成注册
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-card-foreground">
                昵称 <span className="text-muted-foreground">(可选)</span>
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-card-foreground">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-card-foreground">
                密码
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位字符"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <Turnstile key={tsKey} onToken={setTsToken} />

            <button
              type="submit"
              disabled={loading || (turnstileEnabled && !tsToken)}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">或</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <GithubLoginButton onError={setError} />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？
            <Link href="/login" className="text-primary hover:underline">
              直接登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
