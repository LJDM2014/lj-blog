import type { SupabaseClient } from '@supabase/supabase-js'

export interface RateLimitResult {
  /** 是否放行 */
  allowed: boolean
  /** true = 008 迁移未执行（RPC 不存在），限流软关闭 */
  degraded: boolean
}

/**
 * 服务端限流：调用 008 迁移的 check_rate_limit RPC（原子检查 + 记录）。
 * RPC 未部署时软关闭（放行并标记 degraded），避免迁移前全站写操作瘫痪。
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  action: string,
  identity: string,
  max: number,
  windowSecs: number
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_action: action,
    p_identity: identity,
    p_max: max,
    p_window_secs: windowSecs,
  })

  if (error) {
    // 008 迁移未执行（RPC 不存在）或瞬时数据库故障时放行：
    // 限流是防滥用辅助，不应阻断正常可用性（与搜索回退 ILIKE 同一哲学）
    console.error(`限流检查未生效（${action}）:`, error.code, error.message)
    return { allowed: true, degraded: true }
  }

  return { allowed: data === true, degraded: false }
}

/** 从请求头提取客户端 IP（CF Workers 提供 cf-connecting-ip） */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
