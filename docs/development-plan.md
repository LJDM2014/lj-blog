# lj-blog 功能盘点与开发计划

> 更新时间：2026-10-15（Phase 6 代码完成）
> 技术栈：Next.js 16 + Supabase（Postgres / Auth / Storage / Realtime）+ Tailwind CSS 4 + Cloudflare Workers（OpenNext 部署）

---

## 一、已有功能盘点

### 内容与阅读
| 功能 | 说明 |
|---|---|
| 首页文章流 | 分页浏览（12 篇/页），显示总篇数 |
| 文章详情 | TOC 目录（桌面端粘性侧栏 + IntersectionObserver 高亮）、上下篇导航、相关文章（标签重合度优先）、阅读时长（400 字/分钟）、阅读量、可点击标签、封面图 |
| Markdown 渲染 | GFM + Shiki 代码高亮，h2/h3 自动注入锚点 |
| 搜索 | 标题/摘要/正文 ILIKE 模糊匹配 |
| 标签 | 标签聚合页 + 单标签文章页 |
| 归档 | 按时间归档页 |

### 互动
| 功能 | 说明 |
|---|---|
| 评论 | 嵌套回复（递归树）、头像/昵称展示、未登录引导 |
| 点赞 | 一人一篇一次，计数公开 |
| 收藏 | 本人可见，唯一约束 |

### 账号与后台
| 功能 | 说明 |
|---|---|
| 认证 | 邮箱密码注册/登录（Supabase Auth）+ GitHub OAuth（代码就绪，待配置 Provider） |
| 角色体系 | profiles.role（admin/user），admin 专属操作走 RLS + Server Action 双重校验 |
| 管理后台 | 文章列表、Markdown 编辑器（分屏预览）、发布/草稿、删除、`.md` 导入、文章导出、媒体上传（Storage media 桶）、未登录访问 /admin 307 → /login |
| 后台仪表盘 ✅ 新增 | /admin/dashboard：总览卡片（文章/评论/用户/总 PV/今日 PV/UV）、近 14 天 PV/UV 趋势（纯 SVG 柱状图，get_dashboard_stats RPC，008 未执行时自动回退 posts 表基础统计）、热门文章 TOP10 |
| 评论管理 ✅ 新增 | /admin/comments：全站评论分页列表（联表文章/作者）、删除（comments_admin_delete policy，008 迁移） |
| 媒体库 ✅ 新增 | /admin/media：media 桶文件网格（图片/视频预览）、上传（复用 uploadMedia）、复制公开 URL、删除 |
| 站内通知 | 回复/点赞/收藏触发；顶栏铃铛（Realtime 实时 +1、未读红点）；通知中心（点击已读跳转、全部已读） |
| 个人中心 | /profile：昵称编辑、头像上传（avatars 桶，RLS 限定本人目录）、修改密码、我的评论/收藏/点赞三 Tab |

### SEO 与基建
| 功能 | 说明 |
|---|---|
| RSS | /feed.xml（RSS 2.0） |
| Sitemap / robots | 自动生成；/admin /search /notifications /profile 等私有页已屏蔽 |
| JSON-LD | BlogPosting 注入详情页 |
| OG 图 | /og/[slug] 动态生成（next/og + 中文字体，globalThis 缓存） |
| 主题 | 暗色模式切换 |
| 容错 | 全局 404 / error 页（文章详情返回真实 404 状态码） |
| 关于 / 友链 | 静态配置驱动（lib/links.ts），footer 入口 |

---

## 二、功能测试结果

### 第一轮全站回归（2026-10-14，16 项全部通过）
首页/分页、文章详情、真实 404、搜索命中、标签、归档/关于/友链、登录/注册页、后台守卫（307→/login）、RSS 合法性、sitemap/robots 内容、OG 图（PNG 49KB）、四张业务表匿名读、RLS 匿名写拦截（42501）、Supabase Auth 健康、阅读量自动递增（27→28）。

### 通知/个人中心专项（2026-10-14）
- REST + RLS 实测（临时测试号）：自通知拦截、伪造身份拦截、正常通知 201、接收人读回、标记已读、未读数清零 —— 全部通过
- 浏览器 UI 走查 6/6：登录、铃铛红点角标、通知中心列表与未读高亮、全部已读、个人中心三 Tab 切换

### 已知小问题
1. RSS 摘要含原始 Markdown 语法（excerpt 截取未 strip）
2. 内容量极少（1 篇文章），分页/相关文章等功能的真实效果待内容补充后观察

---

## 三、与主流博客平台的差距

对标掘金 / 知乎专栏 / CSDN / WordPress / Ghost / Hashnode：

| 维度 | 主流标配 | 现状 | 差距等级 |
|---|---|---|---|
| 搜索 | 全文检索、中文分词、关键词高亮、相关性排序 | ✅ tsvector 生成列 + CJK 空格分词 + ts_rank 相关性排序 + <mark> 高亮（007 已执行） | — |
| 评论通知 | 被回复/被点赞邮件+站内提醒 | 站内通知已上线，邮件通知未做 | ★★★ |
| 第三方登录 | GitHub/Google/微信 OAuth | GitHub 代码就绪，待配置 Provider | ★★★ |
| 用户中心 | 个人主页、资料编辑、我的评论/收藏/点赞 | ✅ 已上线 | — |
| 后台仪表盘 | PV/UV 趋势、热门文章、评论管理、媒体库 | ✅ 代码完成（/admin/dashboard + /admin/comments + /admin/media，待 008 迁移后 PV/UV 趋势生效） | — |
| 编辑器 | 粘贴图片上传、自动保存、字数统计、工具栏 | ✅ 已上线（快捷工具栏、粘贴/拖拽上传、localStorage 自动保存+恢复、字数/阅读时长） | — |
| 防滥用 | 限流 + Turnstile + 敏感词过滤 ✅ 代码完成（008 迁移待执行，执行前限流自动软关闭放行） | — |
| 移动端 TOC | 移动端也有目录 | ✅ 底部抽屉（另含返回顶部、代码块复制） | — |
| 定时发布 | scheduled publish | ✅ 已上线（查询层 published_at<=now() 守卫 + /api/cron/publish，待配置定时任务） | — |
| 邮件订阅 | 新文章推送 | 无 | ★ |
| PWA / 离线 | 可安装、离线缓存 | 无 | ★ |
| 友链生态 | 在线申请、存活检测 | 静态配置文件 | ★ |

---

## 四、开发计划与实现方案

### Phase 4：通知与账号（核心体验补齐）

| 子项 | 状态 | 说明 |
|---|---|---|
| 4.1 站内通知 | ✅ 已完成（2026-10-14） | 005 迁移 + lib/notifications.ts + 三处触发点 + NotificationBell + /notifications |
| 4.2 邮件通知 | ⬜ 待做 | Supabase Database Webhook（comment insert）→ Edge Function → Resend API；profiles 加 notify_email 开关 |
| 4.3 GitHub OAuth | ✅ 代码完成 | app/auth/callback + GithubLoginButton；**待在 Supabase Dashboard → Authentication → Providers 启用 GitHub（回调 URL：`https://<project>.supabase.co/auth/v1/callback`）** |
| 4.4 用户中心 | ✅ 代码完成 | 006 迁移（avatars 桶）+ /profile 页面 + Navbar 入口 |

### Phase 5：搜索与内容体验（✅ 已完成 2026-10-14）

| 子项 | 状态 | 说明 |
|---|---|---|
| 5.1 全文搜索 | ✅ 代码完成 | 007 迁移：`posts_cjk_space()` immutable 函数（中日韩字符间插空格，配合 phrase 查询实现中文子串匹配）+ `search_vector` tsvector 生成列（标题 A / 摘要 B / 正文 C 加权）+ GIN 索引 + `search_posts()` RPC（`websearch_to_tsquery` + `ts_rank` 相关性排序）；lib/posts.ts 优先走 RPC、迁移未执行时自动回退 ILIKE；搜索结果标题/摘要 `<mark>` 高亮。**007 待在 SQL Editor 执行** |
| 5.2 编辑器增强 | ✅ 已完成 | PostEditor：快捷工具栏（加粗/斜体/标题/链接/代码/代码块/引用/列表/图片）、编辑区粘贴或拖拽图片音视频自动上传、800ms 防抖 localStorage 自动保存 + 进入页面恢复/丢弃提示、字数与预计阅读时长统计、定时发布时间输入 |
| 5.3 阅读体验 | ✅ 已完成 | MarkdownBody 客户端组件为代码块注入「复制」按钮；MobileToc 移动端底部抽屉目录（点链接自动收起）；BackToTop 返回顶部悬浮球（滚过 400px 出现）。浏览器实测 3/3 通过 |
| 5.4 定时发布 | ✅ 代码完成 | 编辑器可填定时时间（草稿携带 published_at）；查询层统一 `published_at <= now()` 守卫（含搜索 RPC），未到期文章全站不可见；`/api/cron/publish`（GET/POST，`Authorization: Bearer <CRON_SECRET>` 鉴权，service_role）把到期草稿置为 published。**定时任务二选一：Supabase pg_cron（推荐，007 迁移内有现成 SQL）或外部服务每 5 分钟调 API** |

### Phase 6：后台与安全（✅ 代码完成 2026-10-15）

| 子项 | 状态 | 说明 |
|---|---|---|
| 6.1 后台仪表盘 | ✅ 已完成 | 008 迁移：daily_views 日表（view_date+post_id 主键，pv/uv 列）+ visitor_hits 访客明细（UV 去重）+ increment_views 重写（`p_visitor_id` 可选参数，同步写日表）+ get_dashboard_stats RPC（仅 admin，返回总览/今日/近 N 天/ TOP10）。页面：/admin/dashboard（总览卡片 + 纯 SVG 趋势图 + TOP10，008 未执行时回退 posts 表基础统计并显示提示横幅） |
| 6.1 评论管理 | ✅ 已完成 | /admin/comments：分页 20 条/页，联表文章与作者；删除走 deleteComment action（requireAdmin + 008 新增 comments_admin_delete policy） |
| 6.1 媒体库 | ✅ 已完成 | /admin/media：storage.list 列 media 桶（创建时间倒序，最多 200），网格预览 + 上传（多选，复用 uploadMedia）+ 复制公开 URL + 删除（removeMedia，防目录穿越） |
| 6.2 限流 | ✅ 已完成 | 008 迁移：rate_limits 表 + check_rate_limit RPC（security definer 原子检查+记录，5% 概率清理 24h 前旧记录）。服务端统一走 lib/ratelimit.ts，**RPC 不存在时 fail-open 放行**（与搜索回退 ILIKE 同一哲学）。规则：登录 5 次/分/IP（/api/auth/login）、注册 5 次/时/IP（/api/auth/register）、评论 3 次/分/用户、点赞 30 次/分/用户、收藏 30 次/分/用户 |
| 6.2 Turnstile | ✅ 代码完成 | lib/turnstile.ts 服务端 siteverify（**TURNSTILE_SECRET_KEY 未配置时软关闭**）+ components/Turnstile.tsx 前端 widget（**NEXT_PUBLIC_TURNSTILE_SITE_KEY 未配置时不渲染**）。接入：注册页 + 评论框。token 一次性，提交后 key 重挂重置 |
| 6.2 敏感词过滤 | ✅ 已完成 | lib/moderation.ts：词库 + filterSensitiveWords（命中替换 ***），评论提交时在服务端执行，词库按需增删 |
| 6.2 写操作收口 | ✅ 已完成 | 评论/点赞/收藏从「客户端直插 Supabase」改为 Server Action（app/actions/interactions.ts）：登录校验 → 限流 → Turnstile（评论）→ 敏感词 → RLS insert → 服务端通知（回复/点赞/收藏通知作者，替代原客户端 sendNotification，lib/notifications.ts 已删除）；登录/注册改为 API route 代理（会话 cookie 由服务端写入） |

**008 迁移执行前后的行为**：执行前——登录/注册/评论/点赞/收藏全部正常（限流软关闭）、PV/UV 日表不写入、increment_views 因新签名不匹配静默失败（总阅读量暂停增长）、评论管理页删除报错、仪表盘回退基础统计；执行后——全部功能生效。

### Phase 7：增强（可选）
- 邮件订阅（Resend Audience + 新文章广播）
- PWA（manifest + SW 静态缓存）
- 友链在线申请 + 每日存活检测（Cron）
- 文章修订历史（posts_revisions 表）
- RSS 摘要 strip Markdown（小项，随时可做）

### 建议执行顺序

```
4.1 通知表 ✅ → 4.3 OAuth ✅ → 4.4 用户中心 ✅ → 5.1 搜索 ✅ → 5.2 编辑器 ✅ → 5.3 阅读 ✅ → 5.4 定时 ✅
→ Phase 6 全部 ✅（待 008 迁移执行）
→ 4.2 邮件（下一步）→ Phase 7
```

依赖关系：通知表是站内信/邮件的共同地基；Phase 6 限流/Turnstile 为公开推广前必备（代码已就绪，008 迁移执行前自动软关闭，不影响可用性）。

---

## 五、运维备忘

- **迁移执行**：Supabase Dashboard → SQL Editor 手动执行；已执行 001/002/003/004/005/006/007；**008（Phase 6：PV/UV 日表 + 仪表盘 RPC + 限流表 + admin 删评论 policy）待执行**，执行前 Phase 6 功能自动软降级（见 Phase 6 一节说明）；SQL 风格：`drop policy if exists → create policy`，约束用 `do $$ exception when duplicate_object` 包裹
- **PV/UV 统计**：proxy.ts 为访客发放 `vid` cookie（httpOnly，1 年），increment_views 以 vid 做 UV 去重；首次访问的当次请求读不到 vid（少计一次 UV），从第二次请求起正常；**注意 Next 16 用 proxy.ts（不是 middleware.ts），两文件不能共存，共存会导致全站 404**
- **限流规则**：登录 5 次/分/IP、注册 5 次/时/IP、评论 3 次/分/用户、点赞 30 次/分/用户、收藏 30 次/分/用户；记录在 rate_limits 表（无 RLS policy，仅 RPC 读写），RPC 调用时 5% 概率清理 24h 前旧记录
- **Turnstile 配置**（可选，未配置自动关闭）：Cloudflare Dashboard → Turnstile 建站点 → 拿 Site Key + Secret Key；`NEXT_PUBLIC_TURNSTILE_SITE_KEY`（前端）与 `TURNSTILE_SECRET_KEY`（服务端）成对配置，本地写 .env.local，CF 部署时同步
- **定时发布**：007 末尾附 pg_cron 现成 SQL（启用 pg_cron 扩展后取消注释执行即可）；或外部服务每 5 分钟调 `POST /api/cron/publish`，请求头 `Authorization: Bearer <CRON_SECRET>`（本地密钥在 `.env.local`，生产部署需在 CF 环境同步配置）
- **部署**：`npm run deploy:cf`（OpenNext → Cloudflare Workers），构建环境需配置 Supabase 环境变量与 `NEXT_PUBLIC_SITE_URL`；启用 Turnstile 时同步两个 Turnstile 变量
- **排查捷径**：用 `.env.local` 的 anon/service_role key 直接 curl `/rest/v1/<table>` 看真实错误体
- **新增私有页面**：记得同步加入 robots.ts disallow 列表
