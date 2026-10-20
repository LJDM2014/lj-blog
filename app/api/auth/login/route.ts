import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

/**
 * 登录代理：服务端限流（5 次/分/IP）后执行 signInWithPassword。
 * 会话 cookie 由服务端 supabase client 直接写入。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: '请输入邮箱与密码' }, { status: 400 })
  }

  const ip = getClientIp(req.headers)
  const supabase = await createClient()

  const { allowed, degraded } = await checkRateLimit(supabase, 'login', `ip:${ip}`, 5, 60)
  if (!allowed) {
    return NextResponse.json({ error: '尝试过于频繁，请一分钟后再试' }, { status: 429 })
  }
  if (degraded) console.warn('限流 RPC 未部署（008 迁移未执行），登录限流暂未生效')

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // 统一文案，避免泄露账号是否存在
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
