# lj-blog

A full-stack personal blog built with **Next.js 16 + Supabase + Cloudflare Workers**, featuring Markdown writing, full-text search, user interactions (comments/likes/favorites), in-app notifications, an admin dashboard, and scheduled publishing.

## Features

### Frontend
- **Posts**: paginated home list; detail pages with sticky TOC (with scroll-spy highlight), reading time estimate, prev/next navigation, related posts, one-click code copy, mobile TOC drawer, and back-to-top
- **Search**: PostgreSQL full-text search (CJK-aware tokenizer + weighted ranking) with `<mark>` keyword highlighting; automatic ILIKE fallback when the RPC is unavailable
- **Tags / Archives**: tag cloud, per-tag listing, archives grouped by year/month
- **SEO**: dynamic OG image generation (`/og/[slug]`), RSS (`/feed.xml`), sitemap, robots, JSON-LD (BlogPosting)
- **Pages**: About, Links (config-driven), custom 404 / error pages

### User System
- Email/password sign-up & sign-in, GitHub OAuth login
- Profile: edit display name, upload avatar (Supabase Storage), change password; my comments / favorites / likes
- In-app notifications: real-time alerts when replied to or when your posts are liked/favorited (Supabase Realtime); notification center with mark-as-read and mark-all-as-read

### Interactions
- Comments (with replies, sensitive-word auto-filtering), likes, favorites — all via Server Actions with self-notification prevention
- Optimistic UI updates on like/favorite buttons; unauthenticated users are redirected to login

### Admin Dashboard (`/admin`)
- **Dashboard**: PV/UV trend charts (pure SVG), overview stats, top 10 posts
- **Post management**: enhanced Markdown editor — quick toolbar, paste/drag image upload, localStorage autosave & restore, word count, scheduled publishing
- **Comment management**: paginated listing and deletion
- **Media library**: image upload, copy URL, delete (path-traversal protected)
- **Interactions**: see who liked/favorited your posts

### Security & Anti-abuse
- Row Level Security enabled across all tables
- IP/user-level rate limiting (login, register, comments, likes/favorites — fail-open design)
- Cloudflare Turnstile bot protection (soft-disabled when keys are not configured)
- Sensitive word filtering

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Markdown | react-markdown + remark/rehype + Shiki syntax highlighting |
| Deployment | OpenNext → Cloudflare Workers |

## Getting Started

### 1. Prerequisites

- Node.js 20+
- A Supabase project

### 2. Configure environment variables

Create `.env.local` in the project root:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Server-side secrets (for the cron publish endpoint)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
CRON_SECRET=<random-string>

# Site root URL (used by RSS/sitemap/robots/OG, no trailing slash)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Cloudflare Turnstile (optional; auto-disabled when unset)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

### 3. Initialize the database

Run the migration files in `supabase/migrations/` in order (001 ~ 010) via Supabase Dashboard → SQL Editor.

> For scheduled publishing, enable the `pg_cron` extension first: `create extension pg_cron;`

### 4. Run in development

```bash
npm install
npm run dev
```

Visit http://localhost:3000 ; the admin dashboard is at http://localhost:3000/admin .

## Deployment

```bash
npm run deploy:cf
```

Deploys to Cloudflare Workers via OpenNext. Notes:

- The build environment must have the same Supabase environment variables configured (`wrangler.jsonc` / CI secrets)
- Scheduled publishing requires an external trigger on `GET/POST /api/cron/publish` (Header: `Authorization: Bearer <CRON_SECRET>`), e.g. via `pg_cron` or Cloudflare Cron Triggers

## Project Structure

```
app/
  blog/[slug]/        # Post detail
  search/ tags/ archives/ about/ links/   # Frontend pages
  login/ register/ profile/ notifications/ # User pages
  admin/              # Admin dashboard (dashboard/posts/comments/media/interactions)
  actions/            # Server Actions (comments/likes/favorites)
  api/                # auth proxy, cron publish
  og/[slug]/          # Dynamic OG image generation
  feed.xml/ sitemap.ts robots.ts
components/           # UI components (incl. admin/)
lib/                  # Data layer (posts/moderation/ratelimit/turnstile, etc.)
supabase/migrations/  # Database migrations (001 ~ 010)
```

## Contributing

1. Fork the repository
2. Create a `Feat_xxx` branch
3. Commit your code
4. Open a Pull Request

## License

MIT
