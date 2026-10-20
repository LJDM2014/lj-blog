-- =============================================================
-- 博客迁移脚本 006：Phase 4.4 用户中心（头像存储）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

-- ---------- Storage：avatars 桶（公开读，用户只能写自己的 uid 目录） ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- favorites：遗留表补 created_at（个人中心「我的收藏」按时间排序用） ----------
alter table public.favorites
  add column if not exists created_at timestamptz not null default now();

-- ---------- 老用户补档：触发器安装（001）之前注册的用户没有 profile 行，
-- 发评论会违反 comments_user_fk；幂等，可重复执行 ----------
insert into public.profiles (id, display_name)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------- 遗留文章补作者：author_id 为空的旧文章统一归到管理员名下
-- （否则站内通知找不到接收人，评论/点赞/收藏不会产生通知）；幂等 ----------
update public.posts
set author_id = (select id from public.profiles where role = 'admin' limit 1)
where author_id is null;
