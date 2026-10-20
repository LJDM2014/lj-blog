-- =============================================================
-- 博客迁移脚本 007：Phase 5.1 全文搜索（tsvector 生成列 + 搜索 RPC）
-- 在 Supabase Dashboard → SQL Editor 中执行
--
-- 说明：PostgreSQL 默认解析器把连续中文当作单个 token，
-- 无法按词匹配。这里在索引和查询两侧统一在中日韩字符间插入空格，
-- 配合 phrase 查询（"天 气" → 天 <-> 气）实现中文子串匹配，
-- 语义接近原来的 ILIKE，同时获得标题加权与 ts_rank 相关性排序。
-- =============================================================

-- ---------- 1. CJK 字符间插入空格（immutable，供生成列使用） ----------
create or replace function public.posts_cjk_space(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    coalesce(t, ''),
    '([一-鿿぀-ヿ가-힣])',
    '\1 ',
    'g'
  );
$$;

-- ---------- 2. search_vector 生成列（标题 A / 摘要 B / 正文 C 加权） ----------
-- 注意：生成列在写入时计算，若日后修改 posts_cjk_space 函数体，
-- 需执行 `update public.posts set id = id` 触发全量重算
alter table public.posts
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', public.posts_cjk_space(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.posts_cjk_space(coalesce(excerpt, ''))), 'B') ||
    setweight(to_tsvector('simple', public.posts_cjk_space(coalesce(content, ''))), 'C')
  ) stored;

-- ---------- 3. GIN 索引 ----------
create index if not exists posts_search_vector_idx
  on public.posts using gin (search_vector);

-- ---------- 4. 搜索 RPC：相关性排序（ts_rank）+ 定时发布过滤 ----------
-- 查询串由应用侧预处理（CJK 逐字加空格 + 引号包裹 + OR 连接），
-- 此处用 websearch_to_tsquery 解析
create or replace function public.search_posts(p_query text, p_limit int default 20)
returns table (
  id uuid,
  slug text,
  title text,
  excerpt text,
  cover_image text,
  tags text[],
  status text,
  published_at timestamptz,
  created_at timestamptz,
  views int
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.slug, p.title, p.excerpt, p.cover_image, p.tags, p.status,
         p.published_at, p.created_at, p.views
  from public.posts p
  where p.status = 'published'
    and (p.published_at is null or p.published_at <= now())
    and websearch_to_tsquery('simple', p_query) @@ p.search_vector
  order by ts_rank(p.search_vector, websearch_to_tsquery('simple', p_query)) desc,
           p.published_at desc nulls last
  limit least(greatest(p_limit, 1), 50);
$$;

revoke all on function public.search_posts(text, int) from public;
grant execute on function public.search_posts(text, int) to anon, authenticated;

-- =============================================================
-- 5.（可选）定时发布 Cron：把 published_at 已到期的草稿自动置为已发布
-- 代码侧已提供 /api/cron/publish（Bearer CRON_SECRET 鉴权），二选一：
--
-- 方案 A（推荐，零外部依赖）：Database → Extensions 启用 pg_cron 后，
-- 取消下方注释执行（每 5 分钟检查一次）：
--
-- select cron.schedule(
--   'publish-scheduled-posts',
--   '*/5 * * * *',
--   $$ update public.posts set status = 'published'
--      where status = 'draft' and published_at is not null and published_at <= now() $$
-- );
--
-- 方案 B：外部定时服务（cron-job.org 等）每 5 分钟调用
--   POST <SITE_URL>/api/cron/publish
--   请求头：Authorization: Bearer <CRON_SECRET>
-- =============================================================
