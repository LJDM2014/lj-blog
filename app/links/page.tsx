import type { Metadata } from 'next'
import { FRIEND_LINKS } from '@/lib/links'

export const metadata: Metadata = {
  title: '友链',
}

export default function LinksPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">友情链接</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {FRIEND_LINKS.length} 个站点
        </p>
      </div>

      {FRIEND_LINKS.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">暂无友链，欢迎交换</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {FRIEND_LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              {link.avatar ? (
                <img
                  src={link.avatar}
                  alt={link.name}
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary">
                  {link.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  {link.name}
                </span>
                {link.description && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {link.description}
                  </span>
                )}
              </span>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
