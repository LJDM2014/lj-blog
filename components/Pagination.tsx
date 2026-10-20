import Link from 'next/link'

interface Props {
  page: number
  pageSize: number
  total: number
  /** 链接前缀，默认 '/'，翻页链接形如 /?page=2 */
  basePath?: string
}

export default function Pagination({ page, pageSize, total, basePath = '/' }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const href = (n: number) => `${basePath}?page=${n}`

  // 页码窗口：当前页前后各 2 页，首尾始终展示
  const pages = new Set<number>([1, totalPages])
  for (let n = page - 2; n <= page + 2; n++) {
    if (n >= 1 && n <= totalPages) pages.add(n)
  }
  const pageList = [...pages].sort((a, b) => a - b)

  const linkClass =
    'flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="分页">
      {page > 1 && (
        <Link href={href(page - 1)} className={linkClass} aria-label="上一页">
          ←
        </Link>
      )}
      {pageList.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - pageList[i - 1] > 1 && (
            <span className="px-1 text-sm text-muted-foreground">…</span>
          )}
          {n === page ? (
            <span
              className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-sm font-medium text-primary-foreground"
              aria-current="page"
            >
              {n}
            </span>
          ) : (
            <Link href={href(n)} className={linkClass}>
              {n}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className={linkClass} aria-label="下一页">
          →
        </Link>
      )}
    </nav>
  )
}
