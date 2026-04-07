# Crushd — Data Model Specification

## 1. Database Options Analysis

### PostgreSQL (Supabase)

**Pros:**
- Full relational integrity — foreign keys, constraints, cascades. Grade votes, memberships, and follow graphs are inherently relational and benefit from joins.
- `JSONB` columns give document-like flexibility for metadata without sacrificing query power.
- Supabase bundles auth, realtime subscriptions, row-level security (RLS), and storage — drastically reducing infrastructure surface area.
- PostGIS extension available if geo-search by gym becomes needed.
- Strong aggregation support — computing consensus grades via `MODE() WITHIN GROUP`, `PERCENTILE_CONT`, window functions is native.
- Transactional consistency for vote tallying, membership state changes.
- pgvector available for future ML-based grade recommendations.

**Cons:**
- Vertical scaling requires care; horizontal sharding is not native (Citus extension exists but adds ops complexity).
- Supabase's free tier has connection limits; need pooling (PgBouncer) under load.
- Schema migrations require discipline.

---

### PlanetScale (MySQL Serverless)

**Pros:**
- Branching workflow for schema changes is developer-friendly.
- Serverless scaling with no connection management overhead.
- Low operational cost at startup scale.

**Cons:**
- No foreign key enforcement by default (Vitess architecture) — referential integrity must be enforced in app code.
- MySQL's window functions and aggregations are less expressive than PostgreSQL's.
- No native full-text search comparable to Postgres `tsvector`.
- PlanetScale removed their free tier in 2024.

---

### MongoDB Atlas

**Pros:**
- Flexible schema is useful during early iteration.
- Atlas Search (Lucene-backed) is excellent for route/gym search.
- `$lookup` aggregation handles joins, though it's verbose.

**Cons:**
- No ACID transactions across collections without careful design (sessions API exists but adds overhead).
- Grade vote aggregation and follow-graph queries are significantly more complex than SQL equivalents.
- Schema flexibility becomes a liability as the data model matures — vote integrity, membership roles, and threading require discipline.
- Higher cost at scale for write-heavy workloads (grade votes, activity feeds).

---

### Firebase Firestore

**Pros:**
- Real-time sync baked in — useful for live grade vote counts.
- Tight integration with Firebase Auth, Storage, and Cloud Functions.
- No server required at small scale.

**Cons:**
- No native aggregations — vote counting requires Cloud Functions or counter sharding patterns.
- Composite queries require manually defined indexes; complex queries (e.g., "routes at gym X with consensus grade V5+, active this month") are painful or impossible.
- Data modeling often requires heavy denormalization, creating sync nightmares when a user's display name changes.
- Pricing scales poorly with read-heavy feeds.

---

### Recommendation: PostgreSQL via Supabase

**Justification:** Crushd's core data is fundamentally relational — gyms own routes, users vote on routes, memberships have roles, follows connect entities. The grade consensus computation is an aggregation problem that PostgreSQL handles natively and efficiently. Supabase provides auth, storage, RLS, and realtime as first-class primitives, eliminating the need to stitch multiple services together. The operational ceiling is high enough for this use case without requiring a distributed database.

---

## 2. Full Schema Design (PostgreSQL / Supabase)

### Conventions

- Primary keys: `UUID` (generated via `gen_random_uuid()`), except `short_code` on routes which is a 7-char string.
- Timestamps: `TIMESTAMPTZ` with `DEFAULT now()`.
- Soft deletes via `deleted_at TIMESTAMPTZ` where applicable.
- Row-Level Security (RLS) policies enforced at the database layer.

---

### `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id         UUID UNIQUE NOT NULL,          -- Supabase auth.users FK
  username        TEXT UNIQUE NOT NULL,           -- @handle, max 30 chars
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,                           -- R2/Storage object key
  bio             TEXT,
  instagram_handle TEXT,
  experience_level SMALLINT DEFAULT 0,           -- 0–10, derived from verified sends
  is_setter       BOOLEAN DEFAULT FALSE,          -- globally flagged verified setter
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

**Notes:**
- `auth_id` links to Supabase Auth; the `users` row is the public profile.
- `experience_level` is computed periodically (nightly job) from logged sends and gym roles; stored for use in grade weighting.

---

### `gyms`

```sql
CREATE TABLE gyms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- URL-safe identifier, e.g. "mesa-rim-mission"
  name            TEXT NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  cover_url       TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT DEFAULT 'US',
  instagram_handle TEXT,
  website_url     TEXT,
  timezone        TEXT DEFAULT 'America/Los_Angeles',
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

---

### `gym_memberships`

```sql
CREATE TYPE gym_role AS ENUM ('owner', 'admin', 'setter', 'member');

CREATE TABLE gym_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        gym_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT now(),
  invited_by  UUID REFERENCES users(id),
  UNIQUE(gym_id, user_id)
);
```

**Role hierarchy:**
- `owner` — full control, can transfer ownership. One per gym.
- `admin` — manage members, edit gym profile, archive routes.
- `setter` — create/edit/archive routes they set.
- `member` — vote, comment, post.

---

### `routes`

```sql
CREATE TABLE routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code      TEXT UNIQUE NOT NULL,           -- e.g. "V3xK9mP", see §4
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  setter_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT,                           -- optional, setters may not name
  description     TEXT,
  hold_color      TEXT,                           -- "red", "#FF3B30", or enum
  wall_section    TEXT,                           -- free-form: "cave", "slab A", etc.
  setter_grade    SMALLINT,                       -- V-scale: 0–17, NULL if ungraded
  consensus_grade SMALLINT,                       -- denormalized, updated async
  consensus_confidence REAL,                      -- 0.0–1.0, see §3
  vote_count      INTEGER DEFAULT 0,              -- denormalized counter
  thumbnail_url   TEXT,                           -- primary route photo
  is_active       BOOLEAN DEFAULT TRUE,
  archived_at     TIMESTAMPTZ,
  archived_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

**Notes:**
- `consensus_grade` and `vote_count` are denormalized for read performance. Updated via Postgres trigger or background job after each vote.
- `setter_grade` is authoritative for display when vote threshold is not met.

---

### `grade_votes`

```sql
CREATE TABLE grade_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade       SMALLINT NOT NULL CHECK (grade BETWEEN 0 AND 17),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(route_id, user_id)                       -- one vote per user per route, upsertable
);
```

---

### `comments`

```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- NULL = top-level
  body        TEXT NOT NULL CHECK (char_length(body) <= 2000),
  is_deleted  BOOLEAN DEFAULT FALSE,              -- soft delete preserves threading
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

**Threading model:** Two-level threading (comment → replies). Depth is capped at 1 (`parent_id` must reference a top-level comment). Avoids infinite nesting complexity while supporting conversation.

---

### `posts`

```sql
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'instagram');

CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID REFERENCES routes(id) ON DELETE CASCADE,  -- NULL = gym-level post
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  type            post_type NOT NULL,
  body            TEXT,
  media_url       TEXT,                           -- R2 object key for image/video
  media_thumbnail_url TEXT,                      -- extracted frame for video
  instagram_url   TEXT,                           -- canonical IG post URL
  instagram_media_id TEXT,                       -- for oEmbed lookup, see §6
  oembed_payload  JSONB,                          -- cached oEmbed JSON blob
  oembed_cached_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

---

### `follows`

```sql
CREATE TYPE followee_type AS ENUM ('user', 'gym');

CREATE TABLE follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_type   followee_type NOT NULL,
  followee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followee_gym_id  UUID REFERENCES gyms(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, followee_type, followee_user_id),
  UNIQUE(follower_id, followee_type, followee_gym_id),
  CHECK (
    (followee_type = 'user' AND followee_user_id IS NOT NULL AND followee_gym_id IS NULL) OR
    (followee_type = 'gym'  AND followee_gym_id  IS NOT NULL AND followee_user_id IS NULL)
  )
);
```

---

### `media`

```sql
CREATE TYPE media_type AS ENUM ('image', 'video');

CREATE TABLE media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id     UUID NOT NULL REFERENCES users(id),
  route_id        UUID REFERENCES routes(id) ON DELETE SET NULL,
  gym_id          UUID REFERENCES gyms(id) ON DELETE SET NULL,
  post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
  type            media_type NOT NULL,
  storage_key     TEXT NOT NULL UNIQUE,           -- R2 object key
  cdn_url         TEXT NOT NULL,                  -- public CDN URL
  thumbnail_key   TEXT,                           -- derived thumbnail object key
  width           INTEGER,
  height          INTEGER,
  duration_secs   REAL,                           -- video only
  size_bytes      BIGINT,
  mime_type       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

### `short_codes` (lookup table)

```sql
CREATE TABLE short_codes (
  code        TEXT PRIMARY KEY,                   -- 7-char alphanumeric
  route_id    UUID UNIQUE NOT NULL REFERENCES routes(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

Maintained as a separate lookup table for fast resolution without a full routes scan.

---

## 3. Grade Consensus Algorithm

### Design Goals
- Reflect genuine community consensus, not stuffed ballot boxes.
- Weight experienced climbers more heavily (not equally).
- Show confidence when vote count is low.
- Degrade gracefully to setter grade when insufficient votes.

### Algorithm

```
MINIMUM_VOTES = 5

weighted_grade = Σ(vote.grade × weight(voter)) / Σ(weight(voter))
consensus_grade = ROUND(weighted_grade)

weight(voter):
  base = 1.0
  + 0.5  if voter is a verified setter at this gym
  + min(voter.experience_level / 10, 1.0)   # 0.0–1.0 additive bonus
  → clamp weight to [0.5, 2.5]
```

**Confidence score** (0.0–1.0):

```
if vote_count < MINIMUM_VOTES:
  confidence = vote_count / MINIMUM_VOTES       # ramps up 0→1

else:
  std_dev = population std deviation of votes
  # tighter distribution = higher confidence
  confidence = max(0, 1 - (std_dev / 4.0))     # std_dev of 4 grades → 0 confidence

confidence = clamp(confidence, 0.0, 1.0)
```

**Display rules:**
- `vote_count < 3`: Show setter grade, no community grade.
- `3 ≤ vote_count < 5`: Show community grade with "?" badge (low confidence).
- `vote_count ≥ 5 AND confidence ≥ 0.6`: Show consensus grade fully.
- `vote_count ≥ 5 AND confidence < 0.6`: Show grade with "disputed" badge.

**Update trigger (Postgres):**

```sql
CREATE OR REPLACE FUNCTION update_consensus_grade()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_weighted_grade REAL;
  v_std_dev REAL;
  v_confidence REAL;
BEGIN
  SELECT
    COUNT(*),
    SUM(gv.grade * u.weight) / NULLIF(SUM(u.weight), 0),
    STDDEV_POP(gv.grade)
  INTO v_count, v_weighted_grade, v_std_dev
  FROM grade_votes gv
  JOIN users u ON u.id = gv.user_id
    -- weight expression simplified; real impl uses a computed column or function
  WHERE gv.route_id = NEW.route_id;

  v_confidence := CASE
    WHEN v_count < 5 THEN v_count / 5.0
    ELSE GREATEST(0, 1.0 - (COALESCE(v_std_dev, 0) / 4.0))
  END;

  UPDATE routes SET
    consensus_grade     = ROUND(v_weighted_grade),
    consensus_confidence = v_confidence,
    vote_count          = v_count,
    updated_at          = now()
  WHERE id = NEW.route_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grade_vote_upsert
AFTER INSERT OR UPDATE OR DELETE ON grade_votes
FOR EACH ROW EXECUTE FUNCTION update_consensus_grade();
```

---

## 4. Short Code System

### Requirements
- 7-character alphanumeric codes: `[A-Z0-9]` — 36^7 ≈ 78 billion unique codes.
- URL-safe, unambiguous (exclude `0`, `O`, `I`, `1`, `L` to avoid visual confusion — yields 31 chars, 31^7 ≈ 27 billion).
- Collision-resistant at scale.
- Fast lookup: `O(1)` via primary key.

### Generation Strategy

```
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # 31 chars, visually unambiguous

function generateShortCode():
  loop:
    code = random_sample(ALPHABET, 7).join("")
    result = INSERT INTO short_codes (code, route_id)
             VALUES (code, route_id)
             ON CONFLICT DO NOTHING
             RETURNING code
    if result is not empty:
      return code
    # collision (astronomically rare) → retry
```

**URL structure:** `crushd.app/r/{SHORT_CODE}` — resolved via an edge function (Supabase Edge Function / Cloudflare Worker) that looks up `short_codes` and issues a `301` to the canonical route URL (`crushd.app/gyms/{gym_slug}/routes/{route_id}`).

**QR codes:** Generated client-side using `qrcode` npm package, pointing to `crushd.app/r/{SHORT_CODE}`. No server storage needed — regenerated on demand from the short code. Gym setters can print or download as SVG/PNG.

---

## 5. Media Storage

### Options

| Option | Egress Cost | CDN | Transform API | Auth | Notes |
|---|---|---|---|---|---|
| **Cloudflare R2** | Free egress | Cloudflare CDN | No (Images add-on) | Signed URLs | Best cost profile by far |
| AWS S3 + CloudFront | ~$0.09/GB | Yes | Lambda@Edge | IAM | Gold standard, highest ops overhead |
| Supabase Storage | Free tier, then S3 pricing | Basic CDN | No | RLS-integrated | Convenient but limited |
| Cloudinary | Free tier, then costly | Yes | Excellent | Token | Best DX, worst economics at scale |

### Recommendation: Cloudflare R2 + Cloudflare Images

**Justification:**
- Zero egress fees — route photos and videos will be viewed far more than they are uploaded.
- Cloudflare Images add-on ($5/month + $1/100k images) handles resizing, format conversion (WebP/AVIF), and responsive variants without a separate service.
- Workers integrate natively for upload pre-signing and access control.
- R2's S3-compatible API means a migration path exists if needed.

**Upload flow:**
1. Client requests a presigned PUT URL from the Supabase Edge Function.
2. Edge Function validates user auth + membership, generates R2 presigned URL (15-min TTL).
3. Client uploads directly to R2 — never through the app server.
4. Client signals completion; Edge Function records the `media` row and triggers thumbnail extraction (Cloudflare Worker + ffmpeg WASM for video).

**Storage key convention:** `{env}/{gym_id}/{route_id}/{uuid}.{ext}`

---

## 6. Instagram Integration

### Options Analysis

| Approach | Reliability | Data | Maintenance |
|---|---|---|---|
| Instagram oEmbed API | High (official) | HTML embed + thumbnail | Requires Facebook App approval |
| Unofficial scraping | Low (breaks frequently) | Full metadata | TOS violation, fragile |
| Store URL only | Trivial | Nothing | No preview |
| Store URL + fetched thumbnail | Medium | Preview image | Requires initial fetch |

### Recommendation: oEmbed with cached payload

Instagram provides an official oEmbed endpoint (`graph.facebook.com/v18.0/instagram_oembed`) for embedding public posts. It returns an HTML embed snippet with the iframe/embed code and a `thumbnail_url`.

**Implementation:**

1. User pastes an Instagram post URL into a post creation form.
2. On post creation, the Supabase Edge Function calls the oEmbed API:
   ```
   GET https://graph.facebook.com/v18.0/instagram_oembed
     ?url={encoded_instagram_url}
     &fields=thumbnail_url,html,author_name,width,height
     &access_token={app_access_token}
   ```
3. The `oembed_payload` JSONB and `oembed_cached_at` are stored on the `posts` row.
4. The `thumbnail_url` from the payload is proxied through R2 (downloaded and re-hosted) to prevent hotlinking breakage if IG changes URLs.

**Staleness:** Re-fetch oEmbed payload if `oembed_cached_at` is older than 7 days. Deleted IG posts return a 404 — mark the post with `instagram_unavailable = TRUE` and show a fallback card.

**Limitations:** Requires a Facebook/Meta Developer App with `instagram_basic` permission. Private accounts cannot be embedded. Videos embedded via oEmbed will not autoplay in most contexts.

---

## 7. Indexes and Query Patterns

### Top 10 Query Patterns

#### Q1 — Route listing for a gym (active routes, newest first)
```sql
SELECT * FROM routes
WHERE gym_id = $1 AND is_active = TRUE
ORDER BY created_at DESC;
```
```sql
CREATE INDEX idx_routes_gym_active_created
  ON routes(gym_id, is_active, created_at DESC);
```

#### Q2 — Single route by short code (QR scan / URL resolve)
```sql
SELECT r.* FROM short_codes sc
JOIN routes r ON r.id = sc.route_id
WHERE sc.code = $1;
```
```sql
-- short_codes.code is already PRIMARY KEY (B-tree, implicit)
-- routes.id is already PRIMARY KEY
-- No additional index needed.
```

#### Q3 — Grade votes for a route (to recompute consensus)
```sql
SELECT gv.grade, u.experience_level FROM grade_votes gv
JOIN users u ON u.id = gv.user_id
WHERE gv.route_id = $1;
```
```sql
CREATE INDEX idx_grade_votes_route ON grade_votes(route_id);
```

#### Q4 — User's vote on a specific route (check-before-vote / upsert)
```sql
SELECT grade FROM grade_votes
WHERE route_id = $1 AND user_id = $2;
```
```sql
-- Covered by the UNIQUE(route_id, user_id) constraint index.
```

#### Q5 — Activity feed: posts from followed gyms and users
```sql
SELECT p.* FROM posts p
WHERE p.gym_id IN (
  SELECT followee_gym_id FROM follows
  WHERE follower_id = $1 AND followee_type = 'gym'
)
OR p.user_id IN (
  SELECT followee_user_id FROM follows
  WHERE follower_id = $1 AND followee_type = 'user'
)
ORDER BY p.created_at DESC
LIMIT 30;
```
```sql
CREATE INDEX idx_follows_follower_gym
  ON follows(follower_id, followee_gym_id)
  WHERE followee_type = 'gym';

CREATE INDEX idx_follows_follower_user
  ON follows(follower_id, followee_user_id)
  WHERE followee_type = 'user';

CREATE INDEX idx_posts_gym_created ON posts(gym_id, created_at DESC);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
```

#### Q6 — Comments for a route (top-level only, then replies)
```sql
-- Top-level
SELECT * FROM comments
WHERE route_id = $1 AND parent_id IS NULL AND is_deleted = FALSE
ORDER BY created_at ASC;

-- Replies for a comment
SELECT * FROM comments
WHERE parent_id = $1 AND is_deleted = FALSE
ORDER BY created_at ASC;
```
```sql
CREATE INDEX idx_comments_route_parent
  ON comments(route_id, parent_id, created_at ASC)
  WHERE is_deleted = FALSE;
```

#### Q7 — Gym membership lookup (auth / permission check)
```sql
SELECT role FROM gym_memberships
WHERE gym_id = $1 AND user_id = $2;
```
```sql
-- Covered by UNIQUE(gym_id, user_id) constraint index.
```

#### Q8 — All gyms a user belongs to (profile page)
```sql
SELECT g.*, gm.role FROM gym_memberships gm
JOIN gyms g ON g.id = gm.gym_id
WHERE gm.user_id = $1 AND g.deleted_at IS NULL
ORDER BY gm.joined_at DESC;
```
```sql
CREATE INDEX idx_gym_memberships_user ON gym_memberships(user_id);
```

#### Q9 — Follower / following counts (profile page)
```sql
SELECT COUNT(*) FROM follows WHERE followee_user_id = $1 AND followee_type = 'user';
SELECT COUNT(*) FROM follows WHERE follower_id = $1;
```
```sql
CREATE INDEX idx_follows_followee_user ON follows(followee_user_id)
  WHERE followee_type = 'user';
-- idx_follows_follower_* indexes from Q5 cover the follower_id side.
```

#### Q10 — Routes set by a user (setter profile)
```sql
SELECT r.*, g.name AS gym_name FROM routes r
JOIN gyms g ON g.id = r.gym_id
WHERE r.setter_id = $1 AND r.is_active = TRUE
ORDER BY r.created_at DESC;
```
```sql
CREATE INDEX idx_routes_setter_active ON routes(setter_id, is_active, created_at DESC);
```

---

### Full Index Summary

```sql
-- routes
CREATE INDEX idx_routes_gym_active_created   ON routes(gym_id, is_active, created_at DESC);
CREATE INDEX idx_routes_setter_active        ON routes(setter_id, is_active, created_at DESC);

-- grade_votes
CREATE INDEX idx_grade_votes_route           ON grade_votes(route_id);
-- UNIQUE(route_id, user_id) constraint covers user vote lookup

-- comments
CREATE INDEX idx_comments_route_parent       ON comments(route_id, parent_id, created_at ASC)
                                             WHERE is_deleted = FALSE;

-- posts
CREATE INDEX idx_posts_gym_created           ON posts(gym_id, created_at DESC);
CREATE INDEX idx_posts_user_created          ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_route_created         ON posts(route_id, created_at DESC)
                                             WHERE route_id IS NOT NULL;

-- follows
CREATE INDEX idx_follows_follower_gym        ON follows(follower_id, followee_gym_id)
                                             WHERE followee_type = 'gym';
CREATE INDEX idx_follows_follower_user       ON follows(follower_id, followee_user_id)
                                             WHERE followee_type = 'user';
CREATE INDEX idx_follows_followee_user       ON follows(followee_user_id)
                                             WHERE followee_type = 'user';

-- gym_memberships
CREATE INDEX idx_gym_memberships_user        ON gym_memberships(user_id);
-- UNIQUE(gym_id, user_id) covers gym-side permission checks

-- gyms
CREATE INDEX idx_gyms_slug                   ON gyms(slug);  -- for URL routing
```

---

## Appendix: Entity Relationship Summary

```
users ──< gym_memberships >── gyms
                                │
                                └──< routes >── grade_votes ── users
                                          │
                                          ├──< comments ── users
                                          ├──< posts ── users
                                          └──< media ── users

follows: users → (users | gyms)
short_codes: 1-to-1 → routes
```
