-- =============================================================
-- 博客迁移脚本 004：修复收藏功能
-- 问题：favorites 为历史遗留表，缺少 id 列，前端 select('id') 返回
-- 42703 "column favorites.id does not exist"（HTTP 400），
-- 导致已收藏状态无法识别，再次点击收藏时撞唯一约束 409 静默失败。
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================

-- ---------- favorites：补充 id 列 ----------
alter table public.favorites add column if not exists id uuid;

-- 为已有记录回填 id
update public.favorites set id = gen_random_uuid() where id is null;

-- 新记录自动生成 id（重复执行无副作用）
alter table public.favorites alter column id set default gen_random_uuid();

-- 注：该表已有复合主键 (post_id, user_id)，id 仅作普通列供前端查询，
-- 不再添加主键/唯一约束（42P16 "multiple primary keys" 即源于此）。

-- ---------- 验证（应输出 4 行结构信息） ----------
-- select column_name, data_type from information_schema.columns
--   where table_name = 'favorites' order by ordinal_position;
