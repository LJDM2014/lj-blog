-- =============================================================
-- 002 修复评论外键 + 补齐迁移（幂等，可重复执行）
-- 背景：001 在 Dashboard 执行时 comments 外键段中断，导致：
--   1. comments 与 profiles 缺少外键 → 联表查询报 PGRST200
--   2. comments/favorites 的 RLS 策略可能未创建
-- 在 Supabase Dashboard → SQL Editor 中整体执行本文件即可
-- =============================================================

-- ---------- 1. 清理孤儿数据（保证外键能创建成功） ----------
-- user_id 在 profiles 中无对应行的旧评论
delete from public.comments
where user_id is not null
  and not exists (select 1 from public.profiles p where p.id = comments.user_id);

-- parent_id 指向不存在评论的悬空回复
delete from public.comments
where parent_id is not null
  and not exists (select 1 from public.comments c where c.id = comments.parent_id);

-- ---------- 2. comments 外键（联表查询的关键修复） ----------
do $$ begin
  alter table public.comments
    add constraint comments_user_fk foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.comments
    add constraint comments_parent_fk foreign key (parent_id) references public.comments(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.comments
    add constraint comments_post_fk foreign key (post_id) references public.posts(id) on delete cascade;
exception when duplicate_object then null; end $$;

create index if not exists comments_post_id_idx on public.comments (post_id, created_at);

-- ---------- 3. comments RLS ----------
alter table public.comments enable row level security;

drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments
  for select using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

-- ---------- 4. favorites 唯一约束 + RLS ----------
do $$ begin
  alter table public.favorites add constraint favorites_post_user_key unique (post_id, user_id);
exception when duplicate_object then null; end $$;

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- ---------- 5. Storage media 桶 + 策略 ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ---------- 6. 强制刷新 PostgREST schema 缓存 ----------
notify pgrst, 'reload schema';
