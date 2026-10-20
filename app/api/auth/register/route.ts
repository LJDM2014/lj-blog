import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'

/**
 * 注册代理：服务端限流（5 次/时/IP）+ Turnstile 人机验证后执行 signUp。
 * 未开启邮箱确认时注册即登录（会话 cookie 由服务端写入）。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : ''
  const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken : null

  if (!email || !password) {
    return NextResponse.json({ error: '请输入邮箱与密码' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少 6 位字符' }, { status: 400 })
  }

  const ip = getClientIp(req.headers)
  const supabase = await createClient()

  const { allowed } = await checkRateLimit(supabase, 'register', `ip:${ip}`, 5, 3600)
  if (!allowed) {
    return NextResponse.json({ error: '注册尝试过于频繁，请一小时后再试' }, { status: 429 })
  }

  const human = await verifyTurnstile(turnstileToken, ip)
  if (!human) {
    return NextResponse.json({ error: '人机验证未通过，请重试' }, { status: 403 })
  }

  // 确认邮件回跳地址：优先用请求方 host（本地/线上通用）
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? new URL(req.url).host
  const origin = `${proto}://${host}`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: nickname || undefined },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, hasSession: !!data.session })
}
