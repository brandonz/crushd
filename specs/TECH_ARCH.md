# Crushd — Technical Architecture

> Version: 0.1 | Status: Draft | Date: 2026-04-07

---

## 1. Stack Recommendation

### Frontend: **Next.js 15 (App Router)**

**Chosen over:** Remix, SvelteKit, Nuxt

**Rationale:**
- App Router enables per-route SSR/SSG/ISR with zero extra config — critical for SEO on route hub pages.
- React ecosystem dominance means more libraries (QR code, embeds, image upload) are React-first.
- Vercel's native Next.js support eliminates ops overhead at indie scale.
- SvelteKit would be slightly leaner but the ecosystem gap matters here (shadcn/ui, Radix, tRPC).
- Remix is excellent but App Router has caught up on the data-fetching model.

### Backend/API: **tRPC over Next.js API Routes**

**Chosen over:** REST, GraphQL

**Rationale:**
- Shared types end-to-end with zero codegen — massive DX win for a solo/small team.
- Procedures map naturally to the domain (gym.create, route.vote, comment.list).
- Incremental adoption: tRPC sits on top of Next.js API routes, so REST endpoints can coexist for webhooks and QR/redirect flows that need clean URLs.
- GraphQL is overkill at this scale; REST requires duplicating type definitions.

### Auth: **Clerk**

**Chosen over:** NextAuth v5, Supabase Auth, Lucia

**Rationale:**
- Handles the full auth UX (sign-up, sign-in, magic link, OAuth, user management) out of the box.
- Middleware-based route protection integrates cleanly with Next.js App Router.
- Built-in organization/membership model maps to Gym → Staff roles.
- Lucia gives more control but requires building all the UX from scratch — not worth it at MVP.
- Supabase Auth ties you to Supabase; Clerk is database-agnostic.
- Cost: free tier is generous enough for indie launch; revisit if DAU grows significantly.

### Database: **PostgreSQL via Supabase**

**Chosen over:** PlanetScale (MySQL), Neon, Railway Postgres, SQLite/Turso

**Rationale:**
- PostgreSQL's full-text search, JSONB, and array types are useful for tags, grade distributions, and search.
- Supabase provides managed Postgres + Realtime (websockets) + Storage (media) in one bill.
- Row-Level Security (RLS) provides a second layer of permission enforcement below the API.
- Supabase's direct connection + pgBouncer pooling handles indie-to-growth traffic smoothly.
- Neon is a strong alternative (serverless branching is great for dev), but Supabase's extras (Realtime, Storage) justify the choice here.

### ORM: **Drizzle ORM**

**Chosen over:** Prisma, Kysely

**Rationale:**
- Drizzle schema is plain TypeScript — no separate `.prisma` DSL, no codegen step in dev loop.
- Drizzle-kit migrations are explicit SQL files, making it easy to audit and customize.
- Lighter runtime than Prisma — matters in edge/serverless environments.
- Type-safe query builder is more predictable than Prisma's abstraction for complex joins.
- Kysely is excellent but Drizzle has better ergonomics for schema-first development.

### Deployment: **Vercel (app) + Supabase (data)**

**Chosen over:** Fly.io, Railway, Cloudflare Pages

**Rationale:**
- Vercel's Next.js integration is zero-config: preview deployments, edge middleware, image optimization.
- Supabase handles the stateful layer; Vercel is fully stateless.
- Railway is a strong alternative for more control, but Vercel's DX edge is worth it at this stage.
- Cloudflare Pages doesn't support the Node.js runtime needed for some libraries.
- Fly.io is excellent for containers but adds ops complexity not needed yet.

### CSS/UI: **Tailwind CSS v4 + shadcn/ui**

**Rationale:**
- shadcn/ui components are copied into the project (no version lock), fully customizable.
- Radix UI primitives underneath give accessible, unstyled components.
- Tailwind v4 (Vite-native, CSS variables) is faster to iterate on than styled-components or Chakra.
- Mobile-first is Tailwind's default mental model.

---

## 2. Project Structure

```
crushd/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group (no layout chrome)
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── (main)/                   # Main app with nav/layout
│   │   │   ├── layout.tsx            # Root layout (nav, footer)
│   │   │   ├── page.tsx              # Home / gym discovery
│   │   │   ├── gyms/
│   │   │   │   ├── page.tsx          # Gym list/search
│   │   │   │   ├── new/page.tsx      # Create gym (staff+)
│   │   │   │   └── [gymSlug]/
│   │   │   │       ├── page.tsx      # Gym hub (SSR)
│   │   │   │       ├── routes/
│   │   │   │       │   ├── page.tsx  # Route list
│   │   │   │       │   ├── new/page.tsx
│   │   │   │       │   └── [routeId]/
│   │   │   │       │       ├── page.tsx   # Route detail (SSR+ISR)
│   │   │   │       │       └── qr/page.tsx
│   │   │   │       └── settings/page.tsx  # Gym admin
│   │   │   ├── feed/page.tsx         # Social feed
│   │   │   └── profile/
│   │   │       └── [username]/page.tsx
│   │   ├── r/
│   │   │   └── [code]/route.ts       # Short URL redirect (Next.js Route Handler)
│   │   └── api/
│   │       ├── trpc/[trpc]/route.ts  # tRPC handler
│   │       ├── webhooks/
│   │       │   └── clerk/route.ts    # Clerk webhook (user sync)
│   │       └── og/
│   │           └── route.tsx         # Open Graph image generation
│   │
│   ├── trpc/                         # tRPC layer
│   │   ├── server.ts                 # tRPC init, context, middleware
│   │   ├── client.ts                 # Client-side tRPC hooks
│   │   ├── root.ts                   # App router (merge all routers)
│   │   └── routers/
│   │       ├── auth.ts               # User profile sync
│   │       ├── gym.ts
│   │       ├── route.ts
│   │       ├── grade.ts              # Voting procedures
│   │       ├── comment.ts
│   │       ├── post.ts
│   │       └── shortUrl.ts
│   │
│   ├── db/                           # Database layer
│   │   ├── index.ts                  # Drizzle client
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── gyms.ts
│   │   │   ├── routes.ts
│   │   │   ├── grades.ts
│   │   │   ├── comments.ts
│   │   │   ├── posts.ts
│   │   │   └── shortUrls.ts
│   │   └── migrations/               # SQL migration files
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (copied in)
│   │   ├── gym/
│   │   │   ├── GymCard.tsx
│   │   │   └── GymHeader.tsx
│   │   ├── route/
│   │   │   ├── RouteCard.tsx
│   │   │   ├── RouteDetail.tsx
│   │   │   ├── GradeVoting.tsx
│   │   │   └── QRCodeDisplay.tsx
│   │   ├── comments/
│   │   │   ├── CommentThread.tsx
│   │   │   └── CommentComposer.tsx
│   │   ├── feed/
│   │   │   ├── FeedPost.tsx
│   │   │   └── InstagramEmbed.tsx
│   │   └── shared/
│   │       ├── UserAvatar.tsx
│   │       └── GradeChip.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts                   # Clerk helpers, role checks
│   │   ├── qr.ts                     # QR code generation
│   │   ├── shortcode.ts              # Short code generation
│   │   ├── grade-utils.ts            # Grade consensus algorithm
│   │   └── instagram.ts              # Instagram oEmbed helpers
│   │
│   ├── hooks/
│   │   ├── useGymRole.ts
│   │   └── useRealtimeComments.ts
│   │
│   └── types/
│       └── index.ts                  # Shared domain types
│
├── drizzle.config.ts
├── middleware.ts                     # Clerk auth middleware
├── next.config.ts
├── tailwind.config.ts
├── components.json                   # shadcn/ui config
├── package.json
└── .env.local
```

---

## 3. Key API Endpoints (tRPC Procedures)

All tRPC procedures are exposed at `/api/trpc`. Non-tRPC routes (redirects, webhooks, OG images) use Next.js Route Handlers.

### Auth / User Sync
```
POST /api/webhooks/clerk          # Clerk webhook → sync user to DB on signup/update

trpc.auth.me                      # query  — get current user profile
trpc.auth.updateProfile           # mutation — update display name, bio, avatar
```

### Gyms
```
trpc.gym.list                     # query  — paginated gym list, filterable by location/name
trpc.gym.bySlug({ slug })         # query  — single gym with stats
trpc.gym.create({ name, ... })    # mutation — requires admin
trpc.gym.update({ id, ... })      # mutation — requires gym:owner or gym:staff
trpc.gym.delete({ id })           # mutation — requires gym:owner
trpc.gym.addMember({ gymId, userId, role })   # mutation — owner only
trpc.gym.removeMember({ gymId, userId })      # mutation — owner only
trpc.gym.listMembers({ gymId })   # query  — staff list
```

### Routes
```
trpc.route.list({ gymId, ... })   # query  — paginated, filterable by grade/color/active
trpc.route.byId({ id })           # query  — route detail with vote tally
trpc.route.create({ gymId, ... }) # mutation — requires gym:staff or gym:setter
trpc.route.update({ id, ... })    # mutation — requires gym:staff or route setter
trpc.route.archive({ id })        # mutation — soft delete, requires gym:staff
trpc.route.getQR({ id })          # query  — returns QR code data URL or SVG
```

### Grade Voting
```
trpc.grade.vote({ routeId, grade })   # mutation — one vote per user per route, upserts
trpc.grade.myVote({ routeId })        # query  — current user's vote
trpc.grade.distribution({ routeId })  # query  — full vote histogram
```

### Comments
```
trpc.comment.list({ routeId, cursor })   # query  — paginated, cursor-based
trpc.comment.create({ routeId, body })   # mutation — authenticated
trpc.comment.delete({ id })              # mutation — own comment or gym:staff
trpc.comment.report({ id, reason })      # mutation — flag for moderation
```

### Posts / Media
```
trpc.post.list({ gymId?, routeId?, cursor })  # query  — feed, filtered
trpc.post.create({ body, routeId?, mediaUrls?, instagramUrl? }) # mutation
trpc.post.delete({ id })                      # mutation — own post or gym:staff
trpc.post.getUploadUrl({ filename, contentType }) # mutation — presigned Supabase Storage URL
```

### Short URLs & QR
```
trpc.shortUrl.resolve({ code })     # query  — return target URL (also done server-side in redirect)
trpc.shortUrl.create({ routeId })   # mutation — idempotent, returns existing if present

GET /r/[code]                       # Route Handler — 302 redirect to route page
GET /api/og?routeId=...             # Route Handler — dynamic OG image (satori)
```

---

## 4. Short URL + QR System

### Short Code Generation

Short codes are 6-character, base58-encoded identifiers (no 0, O, I, l to avoid visual ambiguity). Generated at route creation time.

```typescript
// src/lib/shortcode.ts
import { customAlphabet } from 'nanoid';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const generateShortCode = customAlphabet(BASE58, 6);
// Collision probability at 1M routes: ~0.004% — acceptable; retry on unique constraint violation
```

**Schema:**
```sql
short_urls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(8) UNIQUE NOT NULL,
  route_id    uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
)
CREATE UNIQUE INDEX idx_short_urls_code ON short_urls(code);
```

Short code is generated at route creation and stored in the `short_urls` table. The `routes` table holds a `short_code` denormalized column for fast lookup without a join.

### Redirect Flow

```
User scans QR code → crushd.app/r/ABC123
  → Next.js middleware checks: not auth-protected
  → /r/[code]/route.ts (Route Handler)
      → SELECT route_id FROM short_urls WHERE code = 'ABC123'
      → redirect(307) to /gyms/[gymSlug]/routes/[routeId]
      → 404 if not found
```

The redirect handler runs at the edge (no cold start) and hits the database via a connection pool. For very high QR scan volume, codes can be cached in Vercel KV (Redis) with a TTL of 24h.

### QR Code Generation

**Strategy: Server-side generation, client-side display.**

- Library: `qrcode` (npm) — generates SVG or PNG buffer server-side.
- QR codes are generated on-demand via `trpc.route.getQR` and optionally cached in Supabase Storage.
- The QR code encodes the full short URL: `https://crushd.app/r/ABC123`.
- Gym staff can download a print-ready SVG from the route detail page.

```typescript
// src/lib/qr.ts
import QRCode from 'qrcode';

export async function generateQRSVG(code: string): Promise<string> {
  const url = `https://crushd.app/r/${code}`;
  return QRCode.toString(url, { type: 'svg', margin: 2, width: 256 });
}
```

No external QR service needed — the `qrcode` package is pure JS, runs in Node.js serverless functions without issues.

---

## 5. Real-Time Considerations

### What needs real-time?

| Feature | Real-time needed? | Rationale |
|---|---|---|
| Grade voting | No | Eventual consistency is fine; reload on vote |
| Comments | Soft yes | Nice to have; polling is acceptable for MVP |
| Feed posts | No | Pull-to-refresh pattern sufficient |
| Gym announcements | No | Not a chat product |

### MVP Approach: Optimistic UI + Polling

For MVP, use **optimistic updates via tRPC mutations** (instant local state update) + **polling** for comment lists (every 30s on active route page). This avoids any websocket infrastructure.

```typescript
// Poll comments every 30s when page is active
trpc.comment.list.useQuery({ routeId }, { refetchInterval: 30_000 });
```

### Post-MVP: Supabase Realtime

When real-time comments are worth the complexity, enable **Supabase Realtime** on the `comments` table. Supabase Realtime uses Postgres logical replication → websocket broadcast. No additional infrastructure; it's part of the Supabase plan.

```typescript
// src/hooks/useRealtimeComments.ts
const supabase = createClient(...);
supabase
  .channel(`comments:${routeId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `route_id=eq.${routeId}` }, handleNewComment)
  .subscribe();
```

Grade voting does **not** need real-time. The consensus grade shown on a route page is recomputed server-side and cached at ISR revalidation intervals (60s). Users see the live tally only after their own vote via optimistic update.

---

## 6. Auth & Permissions Model

### Role Hierarchy

```
SYSTEM_ADMIN      — platform-level (Crushd staff)
GYM_OWNER         — full control of a gym, can manage staff
GYM_STAFF         — can create/edit/archive routes, moderate comments
GYM_SETTER        — can create/edit own routes only
MEMBER            — authenticated user, can vote/comment/post
ANONYMOUS         — can view public route pages, cannot interact
```

### Storage

Clerk handles identity (JWT). Gym roles are stored in the application database:

```sql
gym_members (
  gym_id   uuid REFERENCES gyms(id),
  user_id  varchar NOT NULL,   -- Clerk user ID
  role     gym_role NOT NULL,  -- enum: owner | staff | setter
  PRIMARY KEY (gym_id, user_id)
)
```

### Enforcement Pattern

Permission checks happen in the **tRPC procedure middleware**, not in the database. Two layers:

**Layer 1 — tRPC middleware:**
```typescript
// Reusable middleware in src/trpc/server.ts
const requireGymRole = (minRole: GymRole) =>
  t.middleware(async ({ ctx, input, next }) => {
    const { gymId } = input as { gymId: string };
    const member = await db.query.gymMembers.findFirst({
      where: and(eq(gymMembers.gymId, gymId), eq(gymMembers.userId, ctx.userId)),
    });
    if (!member || !hasRole(member.role, minRole)) throw new TRPCError({ code: 'FORBIDDEN' });
    return next({ ctx: { ...ctx, gymRole: member.role } });
  });

// Usage
export const routeRouter = router({
  create: protectedProcedure
    .use(requireGymRole('setter'))
    .input(createRouteSchema)
    .mutation(async ({ ctx, input }) => { ... }),
});
```

**Layer 2 — Supabase RLS (defense in depth):**

Row-Level Security policies on sensitive tables ensure that even a misconfigured tRPC procedure cannot leak or corrupt data. RLS policies mirror the role logic using the Clerk user ID stored in the JWT claims.

### Auth Flow

```
1. User signs in via Clerk (hosted UI or embedded)
2. Clerk issues JWT with userId in sub claim
3. Next.js middleware (middleware.ts) validates JWT on every request
4. tRPC context extracts userId from Clerk's auth() helper
5. Protected procedures check ctx.userId exists
6. Gym-scoped procedures additionally check gym_members table
```

**Public routes** (gym hub pages, route detail pages) are accessible without auth. Clerk middleware is configured to only protect mutation-adjacent paths and `/api/trpc` non-query routes.

---

## 7. SEO Strategy

Route hub pages and gym pages must be crawlable and linkable.

### Rendering Strategy by Page

| Page | Strategy | Why |
|---|---|---|
| `/gyms/[gymSlug]` | SSR (dynamic) | Gym data changes frequently |
| `/gyms/[gymSlug]/routes/[routeId]` | ISR (60s revalidation) | Route detail is mostly stable; votes/comments excluded from initial HTML |
| `/gyms` | SSG (revalidate: 3600) | Gym list is slow-changing |
| `/feed` | CSR | Personal, auth-gated, not indexed |
| `/r/[code]` | Edge redirect | Not a page, transparent to crawlers |

### Route Detail Page SEO

```typescript
// app/(main)/gyms/[gymSlug]/routes/[routeId]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const route = await fetchRoute(params.routeId);
  return {
    title: `${route.name} — ${route.gym.name} | Crushd`,
    description: `${route.gradeConsensus} boulder at ${route.gym.name}. Set by ${route.setter}.`,
    openGraph: {
      images: [{ url: `/api/og?routeId=${params.routeId}` }],
    },
  };
}
```

### Dynamic OG Images

Route pages get dynamically generated Open Graph images using **Satori** (Vercel's edge-compatible OG image library). The image includes:
- Route name and consensus grade
- Gym name and logo
- A preview of the route photo if available

```typescript
// app/api/og/route.tsx — Edge Runtime
import { ImageResponse } from 'next/og';
export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get('routeId');
  const route = await fetchRouteForOG(routeId);
  return new ImageResponse(<OGRouteCard route={route} />, { width: 1200, height: 630 });
}
```

### Structured Data

Route pages include JSON-LD for Google:
```json
{
  "@type": "SportsActivity",
  "name": "Route Name",
  "location": { "@type": "SportsActivityLocation", "name": "Gym Name" },
  "description": "V5 boulder, red tape, overhang section near the cave"
}
```

### Sitemap

`/sitemap.xml` generated dynamically via Next.js route handler, listing all public gym pages and active routes. Regenerated on demand via ISR.

---

## 8. Phase 1 MVP Scope

### In for MVP (Launch-Blocking)

- [ ] Clerk auth (sign-up, sign-in, profile)
- [ ] Gym creation and basic profile page
- [ ] Route creation with: name, setter-assigned grade, color, description, set date
- [ ] Route detail page (SSR, publicly viewable)
- [ ] Community grade voting (one vote per user)
- [ ] Grade consensus display (median of votes)
- [ ] Comments on routes (create, delete own)
- [ ] Short URL generation per route (`/r/[code]`)
- [ ] QR code display + download on route detail
- [ ] Gym staff role assignment (owner can add staff)
- [ ] Route archiving (soft delete)
- [ ] Mobile-first responsive UI
- [ ] Basic SEO (title, description, OG tags)

### Cut for Post-MVP

| Feature | Why Cut |
|---|---|
| Instagram embedding | API complexity, not core loop |
| Dynamic OG images (Satori) | Nice-to-have, add in week 2 |
| Feed / social posts | Core loop is routes first |
| User profiles / activity history | Not launch-blocking |
| Supabase Realtime comments | Polling is fine initially |
| Sitemap.xml | Add before marketing push |
| Route photos/media upload | Text-first MVP is viable |
| Gym discovery / search | Direct links + QR are the primary entry points |
| Multiple gym membership | MVP assumes one gym per staff |
| Notifications | Post-traction feature |
| Route tagging / filtering | Simplify to grade filter only |

### MVP Data Model (Minimum Tables)

```
users         (id, clerk_id, username, display_name, created_at)
gyms          (id, slug, name, description, owner_id, created_at)
gym_members   (gym_id, user_id, role)
routes        (id, gym_id, name, setter_id, setter_grade, short_code, color, description, archived_at, created_at)
grade_votes   (route_id, user_id, grade, created_at) — unique (route_id, user_id)
comments      (id, route_id, user_id, body, created_at, deleted_at)
```

Six tables. Ship with this.

---

## 9. Feature Complexity Estimates

| Feature | Size | Notes |
|---|---|---|
| **Auth (Clerk integration)** | S | Clerk does the heavy lifting; mostly config |
| **Gym CRUD** | S | Standard CRUD, one owner role |
| **Route CRUD** | M | Includes setter grade, archiving, validation |
| **Grade voting + consensus** | M | Upsert logic, median calculation, optimistic UI |
| **Short URL system** | S | nanoid + DB row + redirect handler |
| **QR code generation** | S | Single library, one endpoint |
| **Comments (basic)** | M | Thread display, pagination, delete |
| **Gym role system** | M | Middleware, DB join, tested edge cases |
| **Route detail SSR/ISR** | M | generateMetadata, ISR config, SEO tags |
| **Media / photo upload** | L | Presigned URLs, Supabase Storage, image resizing |
| **Feed / social posts** | L | Feed algorithm, pagination, mixed content |
| **Instagram embedding** | L | oEmbed API, rate limits, fallback UI |
| **Realtime comments** | M | Supabase channel subscription, dedup |
| **Dynamic OG images** | M | Satori setup, font loading, edge runtime |
| **Sitemap generation** | S | Next.js route handler, DB query |
| **Gym discovery / search** | M | Full-text search (pg_trgm or Postgres FTS) |
| **Notifications** | XL | Delivery infrastructure, preferences, unread counts |
| **Mobile app (future)** | XL | Separate project; tRPC types are reusable |

---

## 10. Key Dependencies

```json
{
  "next": "^15",
  "@clerk/nextjs": "^6",
  "@trpc/server": "^11",
  "@trpc/client": "^11",
  "@trpc/react-query": "^11",
  "@tanstack/react-query": "^5",
  "drizzle-orm": "^0.41",
  "drizzle-kit": "^0.30",
  "@supabase/supabase-js": "^2",
  "postgres": "^3",
  "zod": "^3",
  "nanoid": "^5",
  "qrcode": "^1.5",
  "next/og": "built-in",
  "tailwindcss": "^4",
  "clsx": "^2",
  "tailwind-merge": "^2"
}
```

---

## 11. Infrastructure Diagram

```
                        ┌─────────────────┐
                        │   Vercel Edge   │
                        │  (middleware,   │
                        │   redirects)    │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌───────▼───────┐ ┌───────▼──────┐
     │  Next.js SSR/   │ │  tRPC API     │ │  OG Image    │
     │  ISR Pages      │ │  /api/trpc    │ │  /api/og     │
     └────────┬────────┘ └───────┬───────┘ └──────────────┘
              │                  │
              └─────────┬────────┘
                        │
              ┌─────────▼────────┐
              │  Supabase (PG)   │
              │  + RLS policies  │
              │  + Storage       │
              │  + Realtime      │
              └──────────────────┘
                        │
              ┌─────────▼────────┐
              │  Clerk           │
              │  (Auth / JWT)    │
              └──────────────────┘
```

---

## 12. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

DATABASE_URL=                        # Supabase direct connection (for migrations)
DATABASE_URL_POOLED=                 # Supabase pgBouncer (for serverless runtime)

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # Server-only, for admin operations

NEXT_PUBLIC_APP_URL=https://crushd.app
```

---

*See DATA_MODEL.md for full schema definitions and indexes.*
*See DECISIONS.md for ADRs on key trade-offs.*
