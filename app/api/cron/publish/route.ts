import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * 定时发布：把 published_at 已到期的草稿批量置为已发布。
 * 由定时任务触发（推荐 Supabase pg_cron，或 cron-job.org 等外部服务），
 * 也可手动调用。鉴权：请求头 Authorization: Bearer <CRON_SECRET>
 */
async function publishDuePosts(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('缺少 Supabase 环境变量')
  }

  // service_role 绕过 RLS，仅更新到期草稿，无越权面
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'published' })
    .eq('status', 'draft')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .select('id')

  if (error) throw new Error(error.message)
  return data?.length ?? 0
}

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function handle(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const published = await publishDuePosts()
    return NextResponse.json({ ok: true, published })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '执行失败' },
      { status: 500 }
    )
  }
}

export { handle as GET, handle as POST }
