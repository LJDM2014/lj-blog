# 「项目」功能开发方案与实现提示词

> 背景：为 lj-blog 增加「项目（Project）」概念。博主可录入项目档案（名称、仓库地址、语言、关键技术、功能简介、页面截图），并可围绕项目发布博客文章，形成「项目主页 ↔ 项目博客」双向关联。
> 前置阅读：docs/development-plan.md（现有架构与约定）。

---

## 一、方案总览

| 模块 | 内容 | 涉及文件（新建/改动） |
|---|---|---|
| 数据库 | projects 表 + posts 加 project_id 外键（迁移 011） | supabase/migrations/011_projects.sql（新建） |
| 数据层 | 项目查询函数，风格对齐 lib/posts.ts | lib/projects.ts（新建） |
| Server Actions | 项目增删改，复用 requireAdmin | app/admin/actions.ts（追加） |
| 前台页面 | 项目列表 /projects、项目详情 /projects/[slug] | app/projects/**（新建） |
| 后台管理 | 项目列表 + 编辑器（含截图上传） | app/admin/projects/**、components/ProjectEditor.tsx（新建） |
| 文章关联 | 文章编辑器可选所属项目；详情页展示项目徽章 | components/PostEditor.tsx、app/blog/[slug]/page.tsx（改动） |
| 导航/SEO | Navbar 加「项目」入口；sitemap、JSON-LD SoftwareApplication | components/Navbar.tsx、app/sitemap.ts（改动） |

设计取舍：
- 截图存储复用现有 **media 桶**（uploadMedia 已就绪），projects 表只存公开 URL 数组，不建新桶。
- 项目与文章为 **一对多**（一篇文章最多归属一个项目；一个项目下多篇文章），后续如需多对多再扩展关联表。
- 全部遵循现有约定：SQL 用 `drop policy if exists → create policy` 与 `do $$ exception when duplicate_object` 风格；RLS admin-only 写；迁移未执行时前台软降级不报错。

---

## 二、实现提示词

> 以下为可直接交给 AI 编码代理的完整提示词。

```markdown
# 任务：为 lj-blog 实现「项目」功能

## 项目背景
- 技术栈：Next.js 16（App Router）+ Supabase（Postgres/Auth/Storage）+ Tailwind CSS 4，部署 Cloudflare Workers（OpenNext）。
- 请先阅读以下文件，严格沿用其代码风格与模式：
  - supabase/migrations/001_init.sql（表结构与 RLS 风格）
  - lib/posts.ts（数据访问层风格）
  - app/admin/actions.ts（requireAdmin + Server Action 模式）
  - app/blog/[slug]/page.tsx、app/tags/[tag]/page.tsx（前台页面风格）
  - components/PostEditor.tsx（编辑器模式）
- 现有迁移编号至 010，本次新建 **011_projects.sql**。迁移在 Supabase SQL Editor 手动执行，**代码必须在迁移未执行时不报错、软降级**。

## 需求
博主（admin）可以录入项目档案；前台游客可浏览项目列表与详情；文章可归属某项目，项目详情页展示该项目全部已发布文章。

### 字段定义（projects 表）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| slug | text unique not null | URL 标识，小写字母数字连字符 |
| name | text not null | 项目名称 |
| tagline | text | 一句话简介（列表卡片用） |
| description | text | 功能详细介绍（Markdown，详情页渲染） |
| repo_url | text | 代码仓库地址 |
| demo_url | text | 在线演示地址（可选） |
| languages | text[] default '{}' | 编程语言，如 TypeScript、Rust |
| tech_stack | text[] default '{}' | 关键技术，如 Next.js、Supabase |
| screenshots | text[] default '{}' | 页面截图公开 URL（存 media 桶） |
| status | text default 'draft' check in ('draft','published') | 与 posts 一致 |
| sort_order | int default 0 | 列表排序，小在前 |
| created_at / updated_at | timestamptz default now() | |

### posts 表改动
- 新增可空列 `project_id uuid references public.projects(id) on delete set null` + 索引 `posts_project_id_idx`。

### RLS（沿用 001 风格）
- projects：所有人可读 published（admin 可读全部）；insert/update/delete 仅 admin。
- 写校验 RLS + Server Action 双重防线，与 posts 相同。

## 数据层 lib/projects.ts（对齐 lib/posts.ts 风格）
- `getPublishedProjects()`：已发布列表按 sort_order, created_at 排序。
- `getProjectBySlug(slug)`：已发布单条；未命中返回 null（详情页 404）。
- `getProjectPosts(projectId)`：该项目下已发布文章（复用 posts 的 publishedGuard 语义：status='published' 且 published_at<=now()），按 published_at 倒序，取列表字段。
- 管理端查询写在 admin 页面或本文件均可，但需 admin 判定。
- 查询失败 console.error 后返回空值，不抛错（与现有风格一致）。

## Server Actions（追加到 app/admin/actions.ts）
- upsertProject / deleteProject：requireAdmin → 校验 slug 格式与必填项 → 写库；deleteProject 前置校验无关联文章或直接允许（外键 set null）。
- 删除项目时把 posts.project_id 置空（由外键 on delete set null 保证），并 revalidatePath 相关路径。

## 前台页面
1. `/projects`（app/projects/page.tsx）
   - 卡片网格：名称、tagline、languages/tech_stack 以小标签（chip）展示、首张截图作封面（无截图用占位渐变块）。
   - 点击进入详情。复用现有页面容器与暗色模式样式。
2. `/projects/[slug]`（app/projects/[slug]/page.tsx）
   - 头部：名称、tagline、仓库/演示外链按钮（repo_url/demo_url 存在才渲染）。
   - 信息区：languages、tech_stack 标签组。
   - 截图区：screenshots 网格展示，点击新窗口看大图即可（不引入重型灯箱库）。
   - 介绍区：description 走 MarkdownBody 渲染。
   - 「相关文章」列表：getProjectPosts 结果，复用文章列表项样式；无文章显示空态。
   - `generateMetadata`：title/description 取项目字段。
   - 未命中返回 notFound()，真实 404 状态码。
3. 文章详情页（改动 app/blog/[slug]/page.tsx）
   - 查询联表带出 project（name/slug）；页面顶部或标题下方渲染项目徽章（如「📦 项目：xxx」链接到 /projects/[slug]），无关联则不渲染。

## 后台管理
1. `/admin/projects`：项目列表（名称、状态、关联文章数、排序值），新建/编辑/删除入口。
2. `/admin/projects/new` 与 `/admin/projects/[id]` 共用 `components/ProjectEditor.tsx`：
   - 表单字段覆盖全部 projects 字段；languages/tech_stack 用逗号输入转数组。
   - 截图上传：复用现有 uploadMedia（media 桶），上传后 push URL 进 screenshots；每张截图可删除、可拖动排序（简单上移/下移按钮即可，不引入拖拽库）。
   - status 切换 draft/published；slug 自动生成（name 转拼音或留空由用户填，简单实现即可）。
   - 保存调用 Server Action，成功后跳回 /admin/projects。
3. 文章编辑器（改动 components/PostEditor.tsx）
   - 新增「所属项目」下拉（数据源：admin 全量项目列表，由页面 server 端传入 props）；
   - 保存时随 upsertPost 一起提交 project_id（app/admin/actions.ts 中文章保存逻辑同步支持）。

## 导航 / SEO
- Navbar 加「项目」链接（与现有标签/归档并列）。
- app/sitemap.ts 加入已发布项目列表与详情 URL。
- 项目详情页注入 JSON-LD `SoftwareApplication`（name、description、url、screenshot），参考现有 BlogPosting 注入方式。
- /projects 不属于私有页，无需加入 robots disallow；/admin/projects 需要（检查现有 robots.ts 规则是否已覆盖 /admin 前缀）。

## 软降级要求
- 迁移 011 未执行时：/projects 页面返回空列表不报错；/admin/projects 保存失败时给出明确错误提示（如"请先执行 011 迁移"）；文章编辑器项目下拉为空即可。参考 007 搜索回退 ILIKE 的处理哲学。

## 验收清单
- [ ] 011 迁移 SQL 语法正确，可在 SQL Editor 一次执行通过
- [ ] 游客访问 /projects、/projects/[slug] 正常；未发布项目不可见；不存在 slug 返回 404
- [ ] 未登录调用项目写操作被拒（RLS + requireAdmin 双拦截）
- [ ] admin 可新建/编辑/发布/删除项目，截图上传成功且 URL 可公开访问
- [ ] 文章可选所属项目，文章详情显示项目徽章，项目详情列出关联文章
- [ ] 删除项目后原关联文章 project_id 自动置空，文章仍正常显示
- [ ] 迁移未执行时全站无白屏/报错（软降级验证）
- [ ] Navbar 出现「项目」入口，sitemap 包含项目 URL，暗色模式下样式正常
```

---

## 三、建议实施顺序

```
011 迁移 → lib/projects.ts → Server Actions → /projects + /projects/[slug]
→ 后台 /admin/projects + ProjectEditor → 文章关联（PostEditor + 详情徽章）
→ Navbar/sitemap/JSON-LD → 回归验收清单
```

依赖关系：迁移是一切地基；数据层与 Actions 完成后前后台页面可并行；文章关联依赖 projects 表存在。
