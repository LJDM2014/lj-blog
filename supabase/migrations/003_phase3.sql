-- =============================================================
-- 博客迁移脚本 003：Phase 3 功能（点赞）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

-- ---------- likes：文章点赞（一人一篇一次，计数公开） ----------
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.likes add constraint likes_post_user_key unique (post_id, user_id);
exception when duplicate_object then null; end $$;

create index if not exists likes_post_id_idx on public.likes (post_id);

alter table public.likes enable row level security;

-- 点赞数公开可读（游客可见计数）
drop policy if exists "likes_select_all" on public.likes;
create policy "likes_select_all" on public.likes
  for select using (true);

-- 登录用户可点赞/取消自己的点赞
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes
  for delete using (auth.uid() = user_id);
