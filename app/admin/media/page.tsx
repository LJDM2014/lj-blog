import { createClient } from '@/lib/supabase/server'
import MediaLibrary, { type MediaFile } from '@/components/admin/MediaLibrary'

export const dynamic = 'force-dynamic'

export default async function AdminMediaPage() {
  const supabase = await createClient()

  // media 桶为平铺结构（上传 path 无目录），list 根目录即可
  const { data, error } = await supabase.storage.from('media').list('', {
    limit: 200,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  const files: MediaFile[] = (data ?? [])
    .filter((f) => f.id && f.metadata) // 排除子目录占位（id/metadata 为空）
    .map((f) => ({
      name: f.name,
      url: supabase.storage.from('media').getPublicUrl(f.name).data.publicUrl,
      size: f.metadata?.size ?? 0,
      mimetype: f.metadata?.mimetype ?? '',
    }))

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          媒体列表加载失败：{error.message}
        </div>
      )}
      <MediaLibrary files={files} />
    </div>
  )
}
