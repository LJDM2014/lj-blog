# lj-blog

基于 **Next.js 16 + Supabase + Cloudflare Workers** 的全栈个人博客系统，支持 Markdown 写作、全文搜索、用户互动（评论/点赞/收藏）、站内通知、管理后台与定时发布。

## 功能特性

### 前台
- **文章**：首页分页列表、详情页（目录 TOC 高亮、阅读时长估算、上下篇导航、相关文章推荐、代码块一键复制、移动端目录抽屉、返回顶部）
- **搜索**：PostgreSQL 全文检索（支持中日韩分词优化 + 权重排序），关键词 `<mark>` 高亮，RPC 不可用时自动回退 ILIKE
- **标签 / 归档**：标签云与标签筛选页、按年月归档
- **SEO**：动态 OG 分享图生成（`/og/[slug]`）、RSS（`/feed.xml`）、sitemap、robots、JSON-LD（BlogPosting）
- **页面**：关于页、友链页（配置驱动）、自定义 404 / error 页

### 用户系统
- 邮箱密码注册 / 登录，GitHub OAuth 登录
- 个人中心：昵称编辑、头像上传（Supabase Storage）、修改密码；我的评论 / 收藏 / 点赞
- 站内通知：被回复 / 文章被点赞收藏时实时提醒（Supabase Realtime），通知中心支持一键已读、全部已读

### 互动
- 评论（支持回复，敏感词自动过滤）、点赞、收藏，全部走 Server Action，防自通知
- 点赞 / 收藏按钮乐观更新，未登录自动跳转

### 管理后台（`/admin`）
- **仪表盘**：PV / UV 趋势图（纯 SVG）、总览统计、热门文章 TOP10
- **文章管理**：Markdown 编辑器增强版 —— 快捷工具栏、粘贴 / 拖拽上传图片、localStorage 自动保存与恢复、字数统计、定时发布
- **评论管理**：分页查看与删除
- **媒体库**：图片上传、复制链接、删除（防目录穿越）
- **互动明细**：查看文章被谁点赞 / 收藏

### 安全与防滥用
- Supabase Row Level Security 全表覆盖
- IP / 用户级限流（登录、注册、评论、点赞收藏分别限频，fail-open 设计）
- Cloudflare Turnstile 人机验证（未配置密钥时自动软关闭）
- 敏感词过滤

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| 样式 | Tailwind CSS 4 |
| 数据库 | Supabase（PostgreSQL + Auth + Storage + Realtime） |
| Markdown | react-markdown + remark/rehype + Shiki 代码高亮 |
| 部署 | OpenNext → Cloudflare Workers |

## 快速开始

### 1. 环境要求

- Node.js 20+
- 一个 Supabase 项目

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# 服务端密钥（定时发布接口用）
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
CRON_SECRET=<random-string>

# 站点根地址（RSS/sitemap/robots/OG 用，结尾不带斜杠）
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Cloudflare Turnstile（可选，不配置则自动关闭人机验证）
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

### 3. 初始化数据库

在 Supabase Dashboard → SQL Editor 中按编号顺序执行 `supabase/migrations/` 下的迁移文件（001 ~ 010）。

> 如需定时发布，先启用 `pg_cron` 扩展：`create extension pg_cron;`

### 4. 启动开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000 ，管理后台在 http://localhost:3000/admin 。

## 部署

```bash
npm run deploy:cf
```

通过 OpenNext 部署到 Cloudflare Workers。注意：

- 构建环境需配置与本地一致的 Supabase 环境变量（`wrangler.jsonc` / CI secrets）
- 定时发布需外部触发 `GET/POST /api/cron/publish`（Header：`Authorization: Bearer <CRON_SECRET>`），可用 `pg_cron` 或 Cloudflare Cron Triggers 调度

## 项目结构

```
app/
  blog/[slug]/        # 文章详情
  search/ tags/ archives/ about/ links/   # 前台页面
  login/ register/ profile/ notifications/ # 用户相关
  admin/              # 管理后台（dashboard/posts/comments/media/interactions）
  actions/            # Server Actions（评论/点赞/收藏）
  api/                # auth 代理、cron 定时发布
  og/[slug]/          # OG 图动态生成
  feed.xml/ sitemap.ts robots.ts
components/           # UI 组件（含 admin/ 子目录）
lib/                  # 数据层（posts/moderation/ratelimit/turnstile 等）
supabase/migrations/  # 数据库迁移（001 ~ 010）
```

## 参与贡献

1. Fork 本仓库
2. 新建 `Feat_xxx` 分支
3. 提交代码
4. 新建 Pull Request

## License

MIT
