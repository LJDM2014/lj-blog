-- =============================================================
-- 博客迁移脚本 002：Phase 1 功能（阅读量 / 分页索引 / 标签索引）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

-- ---------- posts：阅读量字段 ----------
alter table public.posts
  add column if not exists views int not null default 0;

-- ---------- 阅读量原子自增 RPC ----------
-- security definer 绕过 RLS，允许游客（anon）触发自增，
-- 函数体仅更新已发布文章，无越权风险
create or replace function public.increment_views(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.posts
     set views = views + 1
   where slug = p_slug
     and status = 'published';
$$;

revoke all on function public.increment_views(text) from public;
grant execute on function public.increment_views(text) to anon, authenticated;

-- ---------- 索引：分页排序 + 标签查询 ----------
-- 首页/归档按发布时间倒序分页
create index if not exists posts_published_idx
  on public.posts (published_at desc)
  where status = 'published';

-- 标签页数组包含查询（tags @> array[...]）
create index if not exists posts_tags_idx
  on public.posts using gin (tags);
