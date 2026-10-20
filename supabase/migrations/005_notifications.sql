-- =============================================================
-- 博客迁移脚本 005：Phase 4.1 站内通知系统
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

-- ---------- notifications：站内通知 ----------
-- user_id    接收人（被回复/被点赞/被收藏的人）
-- actor_id   触发人（谁回复/点赞/收藏了；系统通知为空）
-- type       通知类型
-- comment_excerpt  回复类通知的内容摘要快照（评论删除后仍可展示）
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('reply', 'like', 'favorite', 'system')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  comment_excerpt text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

-- 接收人可读自己的通知
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

-- 登录用户只能以本人身份触发通知，且不能给自己发
drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert with check (auth.uid() = actor_id and actor_id <> user_id);

-- 接收人可标记已读
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 接收人可删除自己的通知
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);

-- Realtime：把表加入发布系统，客户端可实时订阅本人通知
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;   -- 已在发布系统中
  when undefined_object then null;   -- 项目未开启 Realtime 发布
end $$;
