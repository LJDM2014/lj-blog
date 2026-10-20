-- =============================================================
-- 博客迁移脚本 009：收藏互动明细支持
-- 问题：favorites 为历史遗留表，post_id/user_id 无外键约束，
--       PostgREST 无法联表 posts/profiles（PGRST200）；
--       且 RLS 仅允许用户查看自己的收藏，管理员无法查看
--       「自己文章被谁收藏」。
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

-- ---------- 1. 清理孤儿行（外键约束要求引用有效） ----------
delete from public.favorites
where post_id is null or user_id is null
   or not exists (select 1 from public.posts where posts.id = favorites.post_id)
   or not exists (select 1 from public.profiles where profiles.id = favorites.user_id);

-- ---------- 2. 补外键约束 ----------
do $$ begin
  alter table public.favorites
    add constraint favorites_post_fk foreign key (post_id) references public.posts(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.favorites
    add constraint favorites_user_fk foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

create index if not exists favorites_post_id_idx on public.favorites (post_id);
create index if not exists favorites_user_id_idx on public.favorites (user_id);

-- ---------- 3. 管理员可查看全部收藏（与自身策略 OR 叠加） ----------
drop policy if exists "favorites_select_admin" on public.favorites;
create policy "favorites_select_admin" on public.favorites
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ---------- 验证 ----------
-- select conname from pg_constraint
--   where conrelid = 'public.favorites'::regclass and contype = 'f';
-- 应返回 favorites_post_fk / favorites_user_fk
