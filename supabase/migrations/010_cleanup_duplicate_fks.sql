-- =============================================================
-- 博客迁移脚本 010：清理重复外键（可选，建议执行）
-- 背景：favorites/comments 历史上存在自动命名与显式命名并存的
--       重复外键（如 favorites 上同时有 favorites_post_id_fkey 和
--       favorites_post_fk），导致 PostgREST 嵌入歧义（PGRST201），
--       且旧外键的 on delete 行为不可控。
-- 本脚本幂等：只删除"名字不在白名单内"的外键，可重复执行。
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

do $$
declare
  r record;
begin
  for r in
    select con.conname, con.conrelid::regclass as tbl
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where con.contype = 'f'
      and nsp.nspname = 'public'
      and (
        -- favorites 只保留 009 建的两条
        (cls.relname = 'favorites'
         and con.conname not in ('favorites_post_fk', 'favorites_user_fk'))
        or
        -- comments 只保留 002 建的三条
        (cls.relname = 'comments'
         and con.conname not in ('comments_post_fk', 'comments_user_fk', 'comments_parent_fk'))
      )
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    raise notice 'dropped % on %', r.conname, r.tbl;
  end loop;
end $$;

-- ---------- 验证（应各只剩白名单内的外键） ----------
-- select cls.relname, con.conname
--   from pg_constraint con
--   join pg_class cls on cls.oid = con.conrelid
--  where con.contype = 'f' and cls.relname in ('favorites', 'comments');
