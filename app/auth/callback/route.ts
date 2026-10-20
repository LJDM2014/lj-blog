import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** OAuth 回调：用授权码交换 session（GitHub 等第三方登录统一走这里） */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next 参数允许 OAuth 前页面指定登录后跳转地址
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 授权失败或缺少 code：带回错误标记跳登录页
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
