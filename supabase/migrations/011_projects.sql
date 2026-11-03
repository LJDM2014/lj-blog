-- =============================================================
-- 迁移脚本 011：项目（Project）功能
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 内容：projects 表 + RLS + posts.project_id 外键
-- =============================================================

-- ---------- projects：项目档案 ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  tagline text,
  description text,
  repo_url text,
  demo_url text,
  languages text[] not null default '{}',
  tech_stack text[] not null default '{}',
  screenshots text[] not null default '{}',
  status text not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.projects add constraint projects_status_check
    check (status in ('draft', 'published'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.projects add constraint projects_slug_key unique (slug);
exception when duplicate_object then null; end $$;

create index if not exists projects_status_idx on public.projects (status, sort_order);

alter table public.projects enable row level security;

-- 所有人可读已发布项目（admin 可读全部）
drop policy if exists "projects_select_published" on public.projects;
create policy "projects_select_published" on public.projects
  for select using (
    status = 'published'
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 仅 admin 可新增/修改/删除
drop policy if exists "projects_admin_insert" on public.projects;
create policy "projects_admin_insert" on public.projects
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "projects_admin_update" on public.projects;
create policy "projects_admin_update" on public.projects
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "projects_admin_delete" on public.projects;
create policy "projects_admin_delete" on public.projects
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ---------- posts：新增所属项目外键 ----------
alter table public.posts
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists posts_project_id_idx on public.posts (project_id);
