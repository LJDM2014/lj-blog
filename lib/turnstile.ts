/**
 * Cloudflare Turnstile 服务端校验。
 * 未配置 TURNSTILE_SECRET_KEY 时软关闭（直接放行），与 GitHub OAuth 的
 * 「代码就绪、待配置」策略一致。
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    const json = (await res.json()) as { success?: boolean }
    return json.success === true
  } catch (e) {
    console.error('Turnstile 校验失败:', e)
    return false
  }
}
