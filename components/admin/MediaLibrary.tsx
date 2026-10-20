'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadMedia } from '@/app/admin/actions'
import { removeMedia } from '@/app/admin/actions'

export interface MediaFile {
  name: string
  url: string
  size: number
  mimetype: string
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function kindOf(file: MediaFile): 'image' | 'video' | 'audio' | 'other' {
  if (file.mimetype.startsWith('image/')) return 'image'
  if (file.mimetype.startsWith('video/')) return 'video'
  if (file.mimetype.startsWith('audio/')) return 'audio'
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(file.name)) return 'image'
  if (/\.(mp4|webm|mov)$/i.test(file.name)) return 'video'
  if (/\.(mp3|wav|ogg|m4a)$/i.test(file.name)) return 'audio'
  return 'other'
}

export default function MediaLibrary({ files }: { files: MediaFile[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const handleUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setUploading(true)
    setError(null)
    for (const file of Array.from(list)) {
      const res = await uploadMedia(file)
      if (res.ok === false) {
        setError(`「${file.name}」上传失败：${res.error}`)
        break
      }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    startTransition(() => router.refresh())
  }

  const handleCopy = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url)
      setCopied(file.name)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setError('复制失败，请手动复制')
    }
  }

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`确定删除「${file.name}」吗？已引用它的文章将无法显示该文件。`)) return
    setBusy(file.name)
    setError(null)
    const res = await removeMedia(file.name)
    setBusy(null)
    if (res.ok === false) {
      setError(res.error)
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? '上传中...' : '上传文件'}
        </button>
        <p className="text-sm text-muted-foreground">共 {files.length} 个文件</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {files.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">媒体库为空，上传第一个文件吧</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => {
            const kind = kindOf(f)
            return (
              <li key={f.name} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex h-32 items-center justify-center overflow-hidden bg-muted">
                  {kind === 'image' ? (
                    <img src={f.url} alt={f.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : kind === 'video' ? (
                    <video src={f.url} className="h-full w-full object-cover" preload="metadata" />
                  ) : kind === 'audio' ? (
                    <span className="text-3xl" aria-hidden>♪</span>
                  ) : (
                    <span className="text-3xl" aria-hidden>📄</span>
                  )}
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="truncate text-xs font-medium text-foreground" title={f.name}>
                    {f.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleCopy(f)}
                      className="flex-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {copied === f.name ? '已复制' : '复制链接'}
                    </button>
                    <button
                      onClick={() => handleDelete(f)}
                      disabled={busy === f.name}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                      {busy === f.name ? '...' : '删除'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
