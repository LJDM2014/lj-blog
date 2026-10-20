-- =============================================================
-- 博客迁移脚本 008：Phase 6（后台仪表盘 + 防滥用）
-- 在 Supabase Dashboard → SQL Editor 中执行
--
-- 内容：
--   1. daily_views / visitor_hits 日表（PV/UV 统计）
--   2. increment_views 重写（同步写入日表，UV 按访客去重）
--   3. get_dashboard_stats RPC（仪表盘聚合数据，仅 admin）
--   4. rate_limits 表 + check_rate_limit RPC（服务端限流）
--   5. comments_admin_delete policy（admin 可删任意评论）
--
-- 注意：本迁移执行前，点赞/收藏/评论/登录/注册的限流自动软关闭
--       （RPC 不存在时应用层放行），阅读量自增会静默失败，执行后恢复。
-- =============================================================

-- ---------- 1. daily_views：每日每文章 PV/UV 日表 ----------
create table if not exists public.daily_views (
  view_date date not null default current_date,
  post_id uuid not null references public.posts(id) on delete cascade,
  pv int not null default 0,
  uv int not null default 0,
  primary key (view_date, post_id)
);

alter table public.daily_views enable row level security;
-- 不创建任何 policy：仅 increment_views / get_dashboard_stats（security definer）可读写

-- ---------- visitor_hits：访客命中明细（UV 去重依据） ----------
create table if not exists public.visitor_hits (
  view_date date not null default current_date,
  visitor_id text not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (view_date, visitor_id, post_id)
);

alter table public.visitor_hits enable row level security;
-- 不创建任何 policy：访客明细彻底私有

-- ---------- 2. increment_views 重写（新签名带 p_visitor_id） ----------
drop function if exists public.increment_views(text);

create or replace function public.increment_views(p_slug text, p_visitor_id text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
begin
  -- 仅统计已发布（含已到定时时间）的文章
  select id into v_post_id
    from public.posts
   where slug = p_slug
     and status = 'published'
     and (published_at is null or published_at <= now())
   limit 1;

  if v_post_id is null then
    return;
  end if;

  -- 总阅读量
  update public.posts set views = views + 1 where id = v_post_id;

  -- 当日 PV +1
  insert into public.daily_views (view_date, post_id, pv, uv)
  values (current_date, v_post_id, 1, 0)
  on conflict (view_date, post_id)
  do update set pv = daily_views.pv + 1;

  -- 当日 UV 去重：同一访客同一文章每天只计一次
  if p_visitor_id is not null and p_visitor_id <> '' then
    insert into public.visitor_hits (view_date, visitor_id, post_id)
    values (current_date, left(p_visitor_id, 64), v_post_id)
    on conflict do nothing;

    if found then
      update public.daily_views set uv = uv + 1
       where view_date = current_date and post_id = v_post_id;
    end if;
  end if;
end;
$$;

revoke all on function public.increment_views(text, text) from public;
grant execute on function public.increment_views(text, text) to anon, authenticated;

-- ---------- 3. get_dashboard_stats：仪表盘聚合数据（仅 admin） ----------
create or replace function public.get_dashboard_stats(p_days int default 14)
returns json
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ) then
    raise exception '仅管理员可查看统计数据';
  end if;

  return json_build_object(
    'totals', json_build_object(
      'posts',      (select count(*) from public.posts),
      'published',  (select count(*) from public.posts where status = 'published'),
      'comments',   (select count(*) from public.comments),
      'users',      (select count(*) from public.profiles),
      'total_views',(select coalesce(sum(views), 0) from public.posts)
    ),
    'today', json_build_object(
      'pv', (select coalesce(sum(pv), 0) from public.daily_views where view_date = current_date),
      'uv', (select count(distinct visitor_id) from public.visitor_hits where view_date = current_date)
    ),
    'daily', (
      select coalesce(json_agg(row_to_json(t) order by t.view_date), '[]'::json)
      from (
        select d.day::date as view_date,
               (select coalesce(sum(pv), 0) from public.daily_views
                 where view_date = d.day::date) as pv,
               (select count(distinct visitor_id) from public.visitor_hits
                 where view_date = d.day::date) as uv
        from generate_series(
               current_date - make_interval(days => greatest(p_days, 1) - 1),
               current_date,
               interval '1 day'
             ) d(day)
      ) t
    ),
    'top_posts', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, title, slug, views
          from public.posts
         where status = 'published'
         order by views desc
         limit 10
      ) t
    )
  );
end;
$$;

revoke all on function public.get_dashboard_stats(int) from public;
grant execute on function public.get_dashboard_stats(int) to authenticated;

-- ---------- 4. rate_limits：服务端限流 ----------
create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  action text not null,
  identity text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on public.rate_limits (action, identity, created_at);

alter table public.rate_limits enable row level security;
-- 不创建任何 policy：仅 check_rate_limit（security definer）可读写

-- 原子检查并记录：窗口内已达上限返回 false，否则记录本次并返回 true
create or replace function public.check_rate_limit(
  p_action text,
  p_identity text,
  p_max int,
  p_window_secs int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  -- 概率性清理过期记录，保持表体积
  if random() < 0.05 then
    delete from public.rate_limits
     where created_at < now() - interval '24 hours';
  end if;

  select count(*) into v_count
    from public.rate_limits
   where action = p_action
     and identity = p_identity
     and created_at > now() - make_interval(secs => greatest(p_window_secs, 1));

  if v_count >= greatest(p_max, 1) then
    return false;
  end if;

  insert into public.rate_limits (action, identity) values (p_action, p_identity);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, text, int, int) from public;
grant execute on function public.check_rate_limit(text, text, int, int) to anon, authenticated;

-- ---------- 5. admin 可删除任意评论（评论管理页） ----------
drop policy if exists "comments_admin_delete" on public.comments;
create policy "comments_admin_delete" on public.comments
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
