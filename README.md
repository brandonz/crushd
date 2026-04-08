# Crushd — Community Bouldering Hub

A web app for bouldering gym communities to track routes, vote on grades, and connect with each other.

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **API**: tRPC v11 + TanStack Query v5
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **QR Codes**: `qrcode` npm package (server-side generation)
- **Short URLs**: `nanoid` with custom alphabet
- **Deployment**: Vercel (app) + Supabase (data)
- **Media Storage**: Cloudflare R2 (planned)

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the required values (see [Environment Variables](#environment-variables) below).

### 3. Set up the database

Generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

Or open Drizzle Studio to inspect the schema:

```bash
npm run db:studio
```

### 4. Configure Clerk

1. Create a Clerk app at [clerk.com](https://clerk.com)
2. Add the publishable key and secret key to `.env.local`
3. Set up a webhook pointing to `https://your-domain/api/webhooks/clerk` for `user.created` and `user.updated` events
4. Add the webhook secret to `.env.local` as `CLERK_WEBHOOK_SECRET`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `DATABASE_URL` | Supabase Postgres direct connection (for migrations) |
| `DATABASE_URL_POOLED` | Supabase pgBouncer pooled URL (for serverless runtime) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g. `https://crushd.app`) |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare account ID (media storage) |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret key |
| `CLOUDFLARE_R2_BUCKET_NAME` | R2 bucket name |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public CDN URL for R2 media |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (sign-in, sign-up) — no nav chrome
│   ├── (main)/             # Main app pages with nav layout
│   │   └── gyms/[gymSlug]/
│   │       └── routes/[routeId]/
│   ├── api/
│   │   ├── trpc/[trpc]/    # tRPC handler
│   │   └── webhooks/clerk/ # Clerk user sync webhook
│   └── r/[code]/           # Short URL redirect handler
├── db/
│   ├── schema/             # Drizzle table definitions
│   └── index.ts            # Drizzle client
├── trpc/
│   ├── routers/            # tRPC router per domain
│   ├── root.ts             # App router (merges all routers)
│   ├── server.ts           # tRPC init + context + middleware
│   └── client.ts           # Client-side tRPC hooks
└── lib/
    ├── short-code.ts       # nanoid short code generation
    ├── qr.ts               # QR code generation utilities
    └── grade-utils.ts      # Grade consensus algorithm
```

## Database Scripts

```bash
npm run db:generate   # Generate SQL migrations from schema changes
npm run db:migrate    # Apply pending migrations to the database
npm run db:studio     # Open Drizzle Studio (visual DB browser)
```

## Architecture Notes

- **Short URLs**: Routes get a 7-character code (e.g. `AB3K9MX`) from a visually unambiguous alphabet. `GET /r/[code]` redirects to the full route page.
- **Grade consensus**: Weighted voting system — experienced climbers and gym setters get higher vote weight. See `src/lib/grade-utils.ts` for the algorithm.
- **Auth flow**: Clerk handles identity. A `user.created` webhook syncs the Clerk user into the `users` table. Gym roles are stored in `gym_memberships`.
- **Permissions**: tRPC middleware (`requireGymRole`) checks gym membership before any mutation. Roles: `owner > admin > setter > member`.
