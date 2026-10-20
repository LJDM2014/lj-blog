'use client'

import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** 前端是否启用了 Turnstile（与 TURNSTILE_SECRET_KEY 成对配置） */
export const turnstileEnabled = Boolean(SITE_KEY)

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

interface TurnstileProps {
  /** 验证通过回调（token 一次性，提交后由父组件重置组件重新获取） */
  onToken: (token: string | null) => void
}

/** Cloudflare Turnstile 人机验证组件（未配置 NEXT_PUBLIC_TURNSTILE_SITE_KEY 时不渲染） */
export default function Turnstile({ onToken }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!SITE_KEY) return
    const el = containerRef.current
    if (!el) return

    const render = () => {
      if (!el || widgetIdRef.current !== null || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': () => onTokenRef.current(null),
      })
    }

    if (window.turnstile) {
      render()
      return
    }

    const SCRIPT_ID = 'cf-turnstile-script'
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)

    return () => {
      script?.removeEventListener('load', render)
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!SITE_KEY) return null
  return <div ref={containerRef} className="mt-3" />
}
