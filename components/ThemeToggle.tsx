'use client'

import { useEffect, useRef, useState } from 'react'

const THEMES = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'green', label: '护眼' },
  { value: 'paper', label: '纸张' },
] as const

type Theme = (typeof THEMES)[number]['value']

const THEME_ICONS: Record<Theme, string> = {
  light: '☀️',
  dark: '🌙',
  green: '🌿',
  paper: '📜',
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme
    if (THEMES.some((t) => t.value === current)) {
      setTheme(current)
    }
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [])

  const applyTheme = (next: Theme) => {
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="切换主题"
        title="切换主题"
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors hover:bg-muted"
      >
        {THEME_ICONS[theme]}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-32 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => applyTheme(t.value)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted ${
                theme === t.value ? 'font-medium text-primary' : 'text-foreground'
              }`}
            >
              <span>{THEME_ICONS[t.value]}</span>
              {t.label}
              {theme === t.value && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
