-- =============================================================
-- 博客重构迁移脚本 001
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 执行前请先注册你的博主账号，然后执行文末「提升管理员」语句
-- =============================================================

-- ---------- profiles：用户资料（注册触发器自动创建） ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- posts：升级现有表 ----------
alter table public.posts
  add column if not exists status text not null default 'draft',
  add column if not exists author_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists tags text[] not null default '{}';

-- 约束可能已存在时避免报错
do $$ begin
  alter table public.posts add constraint posts_status_check
    check (status in ('draft', 'published'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.posts add constraint posts_slug_key unique (slug);
exception when duplicate_object then null; end $$;

-- 已有发布记录的文章回填为已发布状态
update public.posts set status = 'published' where published_at is not null;

alter table public.posts enable row level security;

-- 所有人可读已发布文章
drop policy if exists "posts_select_published" on public.posts;
create policy "posts_select_published" on public.posts
  for select using (
    status = 'published'
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 仅 admin 可新增/修改/删除
drop policy if exists "posts_admin_insert" on public.posts;
create policy "posts_admin_insert" on public.posts
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "posts_admin_update" on public.posts;
create policy "posts_admin_update" on public.posts
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "posts_admin_delete" on public.posts;
create policy "posts_admin_delete" on public.posts
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ---------- comments：补齐缺失的外键（修复联表查询 PGRST200） ----------
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

alter table public.comments enable row level security;

-- 所有人（含游客）可读
drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments
  for select using (true);

-- 登录用户可发表（自己的身份）
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);

-- 作者可删自己的评论
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

-- ---------- favorites：唯一约束 + RLS ----------
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

-- ---------- Storage：media 桶（公开读，仅 admin 可写） ----------
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

-- =============================================================
-- 提升管理员：把下面的邮箱替换为你的博主账号邮箱后，
-- 取消本段注释并执行（需先注册账号，触发器会自动创建 profile）
--
-- update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- =============================================================
