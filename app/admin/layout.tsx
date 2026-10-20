import { redirect } from 'next/navigation'
import { getRole } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getRole()

  if (role !== 'admin') {
    redirect('/login')
  }

  return (
    <div>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-foreground">管理后台</h1>
          <AdminNav />
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
