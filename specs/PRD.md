# Crushd — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-07  
**Status:** Draft  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Roles](#2-user-roles)
3. [Core User Stories](#3-core-user-stories)
4. [Feature List](#4-feature-list)
5. [Route Hub Page Spec](#5-route-hub-page-spec)
6. [Grading System Spec](#6-grading-system-spec)
7. [Sharing Spec](#7-sharing-spec)
8. [Social & Media Spec](#8-social--media-spec)
9. [Gym Page Spec](#9-gym-page-spec)
10. [Non-Functional Requirements](#10-non-functional-requirements)

---

## 1. Executive Summary

### Vision

Crushd is a mobile-optimized web app that gives climbing gyms and their communities a living, community-driven hub for tracking, grading, and sharing boulder problems and sport routes. Every route set at a gym becomes a shareable page — a place where climbers vote on the grade, log sends, post beta, and embed media. Gyms are the organizing unit; routes live inside gyms; community consensus drives quality data.

### Problem

- Gym-set routes are ephemeral — there is no persistent record of what was set, what grade the community agreed on, or how long a classic stayed on the wall.
- Grade disputes happen on paper tape, Instagram comments, or Discord servers — scattered and lost.
- Gym setters have no feedback loop. Members have no ownership over their gym's content.
- Sharing a specific route with a friend requires photographing a QR code on the wall, screenshotting, or verbal description.

### Solution

Crushd creates a permanent, lightweight digital presence for every route. A setter adds a route in 60 seconds. Members vote on the grade. A QR code is generated instantly and can be printed on a tag at the wall. Community discussion lives on the route page. Instagram clips get embedded inline. When the route comes down, its page stays — it becomes history.

### Target Users

- **Bouldering and sport climbing gyms** (commercial and community) looking for low-friction member engagement tools.
- **Route setters** who want feedback and a portfolio.
- **Gym members** who want to participate in grade consensus and discover routes.
- **Visiting climbers** who want to quickly find what's worth projecting.

### Platform

Web app (React, mobile-first responsive). No native app at launch. Installable as a PWA.

---

## 2. User Roles

### 2.1 Anonymous Visitor

A user who has not authenticated. May arrive via a shared route link or QR code scan.

**Capabilities:**
- View any public gym page
- View any public route hub page
- View grades, vote distribution, and community consensus
- Read comments and posts
- View embedded Instagram media
- Scan or follow a share link

**Cannot:**
- Vote on grades
- Post comments or beta
- Create routes or gyms
- Follow gyms

---

### 2.2 Member

An authenticated user who has joined at least one gym. The default role upon account creation.

**Capabilities:**
- All anonymous capabilities
- Follow one or more gyms
- Vote on route grade (once per route)
- Change their vote (up to once per 24-hour window, after the minimum vote threshold is met)
- Log a send (mark a route as completed, with optional date and attempt count)
- Post comments on route pages
- Embed Instagram links in comments
- Upload photos/videos to route pages (subject to gym settings)
- Create a public climber profile
- View their own send history and voting history

**Cannot:**
- Create or edit routes (unless granted Setter role)
- Manage gym settings

---

### 2.3 Setter

A member who has been granted setter permissions by a Gym Admin for a specific gym. Setters are gym-scoped; a user can be a Setter at Gym A and only a Member at Gym B.

**Capabilities:**
- All Member capabilities within the gym
- Create new routes for the gym
- Edit routes they created (name, description, wall location, color, type)
- Mark a route as "active" or "retired"
- Add official setter notes and beta to route pages
- Upload the route photo/thumbnail
- Generate and download the route QR code + printable tag
- View route engagement analytics (votes, views, sends, comments)

**Cannot:**
- Edit routes created by other setters (unless also an Admin)
- Manage gym membership or roles
- Change gym settings

---

### 2.4 Gym Admin

A user with full administrative control over a specific gym. Gyms can have multiple Admins. The user who creates a gym is automatically its first Admin.

**Capabilities:**
- All Setter capabilities
- Create and manage the gym profile (name, location, logo, cover image, description, social links)
- Invite members and grant/revoke Setter and Admin roles
- Edit or delete any route within the gym
- Retire routes in bulk
- Configure gym-level settings (public vs. private gym, media upload permissions, short URL slug)
- View gym-level analytics dashboard (route activity, member engagement, grade distribution)
- Pin announcements to the gym page
- Moderate comments (hide, delete)

**Cannot:**
- Access other gyms' admin panels
- Impersonate other users

---

### 2.5 Platform Admin (Internal)

Crushd platform operators. Not visible to end users.

**Capabilities:**
- All gym admin capabilities across all gyms
- Manage user accounts
- Configure platform-wide settings
- Access cross-gym analytics

---

## 3. Core User Stories

### Gym Setup

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| GS-01 | Gym Admin | As a gym admin, I want to create a gym profile with a name, location, logo, and short URL slug so that my gym has a home page on Crushd. | Gym page is publicly accessible at `crushd.app/g/{slug}` within 60 seconds of creation. |
| GS-02 | Gym Admin | As a gym admin, I want to invite setters by email or shareable invite link so that they can add routes without giving them full admin access. | Invite link generates a role-scoped token valid for 7 days. |
| GS-03 | Gym Admin | As a gym admin, I want to configure whether my gym is public or invite-only so that I can control who can see our routes. | Private gyms require gym membership to view any route pages. |
| GS-04 | Gym Admin | As a gym admin, I want to pin an announcement at the top of the gym page so that members see important updates (e.g., "New wall section open this week"). | Pinned post appears above route feed. Max 1 pinned post. |

### Route Creation

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| RC-01 | Setter | As a setter, I want to create a new route with a name, setter grade suggestion, wall location, hold color, and type (boulder/lead/top-rope) so that it appears in the gym's route feed immediately. | Route page is live within 5 seconds of submission. Setter's suggested grade is displayed with a "setter grade" label until community votes override it. |
| RC-02 | Setter | As a setter, I want to upload a photo of the route when I create it so that members can identify it visually. | Photo appears as route thumbnail. Max 10MB. Compressed on upload. |
| RC-03 | Setter | As a setter, I want to add a description and setter notes (optional beta, style notes) to the route so that members have context. | Setter notes are visually distinct from community comments. |
| RC-04 | Setter | As a setter, I want to specify the route's set date and expected take-down date so that members know how long it will be up. | Set date and "coming down ~{date}" label displayed on route page. |
| RC-05 | Setter | As a setter, I want to mark a route as retired when it comes off the wall so that it is archived but still accessible via its permanent URL. | Retired routes show a "RETIRED" badge. Removed from active feed; accessible via archive. |

### Grading

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| GR-01 | Member | As a member, I want to vote on the V-grade of a route so that I can contribute to the community consensus grade. | Vote is cast from the route page in ≤2 taps. Voter must have the gym joined. |
| GR-02 | Member | As a member, I want to see the current consensus grade and vote distribution so that I understand how the community is grading the route. | Grade consensus badge and bar chart of vote distribution are always visible on the route page. |
| GR-03 | Member | As a member, I want to change my grade vote within a 24-hour window after casting it so that I can correct a hasty first impression. | Vote edit allowed once per route. UI shows "you voted V5 — change vote?" |
| GR-04 | Setter | As a setter, I want to see if my suggested grade is significantly different from community consensus so that I can improve my setting calibration over time. | Setter analytics shows delta between setter grade and final consensus grade per route. |

### Comments & Social

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| CM-01 | Member | As a member, I want to post a comment on a route page so that I can share beta, ask questions, or celebrate a send. | Comment appears in under 1 second (optimistic UI). |
| CM-02 | Member | As a member, I want to embed an Instagram post or Reel link in a comment so that I can share video beta inline. | Instagram oEmbed or screenshot-preview card renders within the comment. |
| CM-03 | Member | As a member, I want to mark a route as "sent" and optionally log attempt count and date so that I have a personal send log. | Send log is visible on my profile. A send count appears on the route page (e.g., "47 sends"). |
| CM-04 | Gym Admin | As a gym admin, I want to hide or delete inappropriate comments so that the community space stays welcoming. | Deleted comments show "comment removed" placeholder to maintain thread integrity. |

### Sharing

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| SH-01 | Setter | As a setter, I want to generate a QR code for a route so that I can print it and stick it next to the route on the wall. | QR code is available immediately after route creation. Downloadable as PNG and SVG. Printable tag template (with route name, grade, QR) also available. |
| SH-02 | Member | As a member, I want to copy a short link to a route so that I can share it in a text message or on Instagram. | Short URL format: `crushd.app/r/{routeId}`. Copies to clipboard in 1 tap. |
| SH-03 | Anonymous | As an anonymous visitor who scanned a QR code, I want to see the full route page without logging in so that I'm not blocked by a signup wall on first encounter. | Route page renders fully for anonymous users (public gyms). Grade vote and comment require sign-up prompt. |
| SH-04 | Member | As a member, I want to follow a gym so that I get a feed of its new routes. | Follow button on gym page. Followed gym routes appear in home feed. |

---

## 4. Feature List

### Priority Definitions

- **P0 — Launch Blocker:** Must be present for the product to function. No launch without these.
- **P1 — Launch Target:** Should ship at launch. Strong UX degradation without them.
- **P2 — Post-Launch:** Valuable but deferrable. Plan for 30–90 days post-launch.

### P0 — Core (Launch Blockers)

| ID | Feature | Description |
|----|---------|-------------|
| F-001 | User authentication | Sign up / sign in via email+password and Google OAuth. |
| F-002 | Gym creation | Admin creates a gym with slug, name, location. |
| F-003 | Route creation | Setter creates a route with name, grade suggestion, type, color, wall location. |
| F-004 | Route hub page | Public-facing page for each route (see Section 5). |
| F-005 | Gym page | Public-facing page for each gym (see Section 9). |
| F-006 | Community grade voting | Members vote on V-grade; consensus computed and displayed. |
| F-007 | Short URL routing | `crushd.app/r/{id}` resolves to route page. `crushd.app/g/{slug}` resolves to gym page. |
| F-008 | QR code generation | Per-route QR code, downloadable as PNG. |
| F-009 | Role system | Member, Setter, Admin roles scoped to gyms. |
| F-010 | Route active/retired state | Setters can retire routes; retired routes display badge and are removed from active feed. |

### P1 — Launch Target

| ID | Feature | Description |
|----|---------|-------------|
| F-011 | Comments | Threaded comments on route pages. |
| F-012 | Instagram embed | Paste an Instagram URL in a comment to render a preview card. |
| F-013 | Send logging | Members mark routes as sent; send count displayed on route page. |
| F-014 | Member profile | Public profile showing send history, gyms followed, account info. |
| F-015 | Gym follow | Members follow gyms; followed gym routes appear in home feed. |
| F-016 | Photo upload (routes) | Setter uploads route photo. Members can add additional photos (gym-configurable). |
| F-017 | Setter analytics | Per-route stats: views, vote count, grade delta, send count. |
| F-018 | Printable route tag | PDF/PNG template with route name, setter grade, QR code, gym logo. |
| F-019 | Admin moderation | Hide/delete comments. Ban members from gym. |
| F-020 | Gym invite links | Role-scoped invite tokens for setters and admins. |
| F-021 | Active route feed | Gym page shows paginated feed of active routes, sortable by newest/grade/sends. |
| F-022 | Grade vote distribution chart | Bar chart of vote counts per grade on route page. |
| F-023 | PWA installability | App manifest + service worker for Add to Home Screen. |

### P2 — Post-Launch

| ID | Feature | Description |
|----|---------|-------------|
| F-024 | Gym analytics dashboard | Admin view: member growth, active vs. retired routes, grade distribution, top-sent routes. |
| F-025 | Route archive | Browsable archive of retired routes per gym, searchable. |
| F-026 | Leaderboards | Top senders per gym (week/month/all-time). Setter with most routes set. |
| F-027 | Push notifications (PWA) | Notify followers when new routes are added to followed gyms. |
| F-028 | Bulk route operations | Admin can retire multiple routes at once (e.g., full reset). |
| F-029 | Video upload | Direct video upload to route pages (not just Instagram embed). |
| F-030 | Setter portfolio | Public setter profile page aggregating all routes set across gyms. |
| F-031 | Route difficulty filters | Filter gym route feed by grade range, type, setter, wall section. |
| F-032 | Gym search / discovery | Public directory of gyms on Crushd. |
| F-033 | Apple/Google sign-in | Additional OAuth providers. |
| F-034 | Attempt logging | Members log attempt count per route session (not just binary send). |
| F-035 | Grade calibration score | Member profile stat showing how their votes align with eventual consensus. |
| F-036 | API access for gyms | Read-only API for gyms to pull route data into their own systems. |

---

## 5. Route Hub Page Spec

The route hub page is the core atomic unit of Crushd. It is the page a climber lands on when they scan a QR code on the wall.

### 5.1 URL Structure

```
crushd.app/r/{routeShortId}
```

`routeShortId` is a 6–8 character alphanumeric ID generated at route creation. It is permanent and does not change if the route name or gym slug changes.

### 5.2 Page Sections (Top to Bottom)

#### Header
- **Route name** (large, prominent)
- **Gym name** (linked to gym page) + gym logo thumbnail
- **Route type badge** (Boulder / Lead / Top-Rope)
- **Hold color swatch** (visual pill)
- **Wall location** (e.g., "Cave — Left Panel", "Slab Wall")
- **Set date** and **expected take-down date** (if provided)
- **Active / Retired badge**
- **Share button** (copies short URL to clipboard; opens share sheet on mobile)

#### Hero Media
- Primary route photo (uploaded by setter, or placeholder if none)
- If multiple photos exist: horizontal scrollable carousel
- Photo count indicator
- "Add photo" button (for members, if gym permits)

#### Consensus Grade
- **Large grade display:** e.g., `V7` — the computed consensus grade (see Section 6)
- **Confidence indicator:** e.g., "Based on 23 votes" or "Needs more votes (3/10 minimum)"
- **Setter's suggested grade** (displayed separately as "Setter: V6")
- **Vote CTA:** "How do you grade it?" — tapping opens the grade voting modal
- **User's current vote** (if authenticated and voted): "You voted: V7" with "Change vote" link

#### Vote Distribution Chart
- Horizontal bar chart showing vote count per V-grade
- Only grades that received at least 1 vote are shown
- Consensus grade bar is highlighted
- Visible to all (including anonymous)

#### Route Details
- **Description** (setter-authored, markdown-supported, optional)
- **Setter notes** (distinguished by avatar and "Setter" badge, pinned above community comments)
- **Style tags** (e.g., "Crimpy", "Powerful", "Technical", "Slopey") — setter-applied, community-addable P2

#### Send Count
- `{N} sends logged` — tapping opens a sheet showing member send entries (most recent first)
- "Log your send" CTA for authenticated members
- Send entry: avatar, display name, date, optional note (max 280 chars), optional attempt count

#### Comments
- Chronological thread (newest at bottom, paginated, lazy-loaded)
- Each comment: avatar, display name, timestamp, text content, optional Instagram embed card
- Reply threading: one level deep (reply to a comment, not to a reply)
- Like/upvote on comments (P2)
- "Add comment" input fixed at bottom of page on mobile

#### Footer / Metadata
- Route ID (for support reference)
- Created by: setter display name (linked to setter profile)
- QR code mini-preview + "Download QR" link (visible to setters/admins; available to all as P2)

### 5.3 Retired Route State

When a route is marked retired:
- A full-width "RETIRED" banner appears below the header
- The "How do you grade it?" vote CTA is hidden
- The "Log your send" CTA is hidden
- All historical data (grades, sends, comments) remains visible
- The page still resolves and is shareable
- A "Retired on {date}" field is shown

### 5.4 Data Model (Route)

```
Route {
  id:               string (short ID, permanent)
  gymId:            string
  name:             string
  type:             enum(boulder, lead, top_rope)
  holdColor:        string
  wallLocation:     string
  setDate:          date
  expectedTakeDown: date | null
  retiredAt:        date | null
  status:           enum(active, retired)
  setterUserId:     string
  setterGrade:      string (e.g., "V5")
  description:      string (markdown)
  setterNotes:      string (markdown)
  photoPrimary:     url | null
  photos:           url[]
  createdAt:        timestamp
  updatedAt:        timestamp
}
```

---

## 6. Grading System Spec

### 6.1 Grade Scale

Crushd uses the **Hueco/V-scale** for bouldering:
`VB, V0, V1, V2, V3, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14, V15, V16, V17`

For lead/top-rope routes, the **Yosemite Decimal System (YDS)** is used:
`5.6, 5.7, 5.8, 5.9, 5.10a, 5.10b, 5.10c, 5.10d, 5.11a, ..., 5.15d`

The UI adapts the grade picker to the route type. The rest of this section uses V-scale for examples but the logic applies equally to YDS.

### 6.2 Voting Rules

1. **One vote per member per route.** A member may cast exactly one grade vote per route.
2. **Vote eligibility:** Voter must be a joined member of the gym that owns the route.
3. **Vote change window:** A voter may change their grade vote once, within 24 hours of their original vote. After 24 hours, votes are locked.
4. **Anonymous users cannot vote.** Attempting to vote prompts a sign-up/sign-in flow.
5. **Setters can vote** on their own routes (their vote carries no special weight).
6. **Setter grade is not a vote.** The setter's suggested grade is stored separately and displayed separately. It does not factor into community consensus calculation unless the setter also casts a member vote.

### 6.3 Consensus Algorithm

**Minimum vote threshold:** Community consensus grade is only displayed when a route has received **≥ 5 votes**. Below this threshold the UI shows the setter's grade with a label: "Setter grade — community voting in progress (3/5 votes)".

**Consensus method: weighted trimmed mean rounded to nearest grade**

Steps:

1. Assign each V-grade a numeric index: VB=0, V0=1, V1=2, ... V17=18.
2. Collect all votes as a list of numeric indices.
3. If vote count ≥ 5: apply a **10% trimmed mean** — discard the bottom 10% and top 10% of votes (by index value) to reduce outlier impact.
4. Compute the arithmetic mean of remaining votes.
5. Round to the nearest integer index.
6. Map back to a grade string.

**Tie-breaking:** If the mean falls exactly between two grades (e.g., 3.5 between V2 and V3), round to the harder grade (V3). This reflects the convention that it's better to understate difficulty than overstate it.

**Display precision:** The UI always displays a single grade string (e.g., "V7"), never a range or decimal. The vote distribution chart provides the nuance.

**Example:**
- 12 votes: [V4, V4, V5, V5, V5, V5, V6, V6, V6, V7, V7, V8]
- 10% trim of 12 votes = remove 1 from each end → discard lowest (V4) and highest (V8)
- Remaining 10 votes: [V4, V5, V5, V5, V5, V6, V6, V6, V7, V7]
- Numeric indices: [5, 6, 6, 6, 6, 7, 7, 7, 8, 8] → mean = 6.6 → rounds to 7 → **V6**

### 6.4 Grade Confidence Display

| Vote Count | Confidence Label | Behavior |
|-----------|-----------------|----------|
| 0–4 | "Needs more votes" | Show setter grade; no consensus badge |
| 5–9 | "Early consensus" | Show consensus grade with muted styling |
| 10–24 | "Community grade" | Show consensus grade with standard styling |
| 25+ | "Strong consensus" | Show consensus grade with bold/highlighted styling |

### 6.5 Grade Recalculation

- Consensus grade is recomputed server-side on each new vote or vote change.
- The current consensus grade is stored denormalized on the Route record for fast reads (no recompute on page load).
- A background job validates denormalized grades hourly to detect drift.

---

## 7. Sharing Spec

### 7.1 Short URL Format

**Route short URLs:**
```
crushd.app/r/{routeShortId}
```
- `routeShortId`: 7-character base-62 string (a-z, A-Z, 0-9), generated at route creation.
- Permanently assigned. Not reused if route is deleted.
- Resolves with a 200 (not a redirect) for SEO purposes — the short URL IS the canonical URL.

**Gym URLs:**
```
crushd.app/g/{gymSlug}
```
- `gymSlug`: 3–32 characters, lowercase alphanumeric + hyphens. Set by admin at gym creation. Can be changed by admin (old slug redirects for 90 days).

**User profile URLs:**
```
crushd.app/u/{username}
```

### 7.2 QR Code Generation

**Technical spec:**
- QR code encodes the route's short URL: `https://crushd.app/r/{routeShortId}`
- Error correction level: **M** (15% correction) — balances size and scannability when printed small
- Generated server-side using a QR library (e.g., `qrcode` npm package)
- Output formats: **PNG** (300×300px, 600×600px) and **SVG** (vector, scalable)
- QR codes are generated at route creation and cached (they are static — the URL never changes)

**Download options (available to setters and admins on the route page):**
- Download QR PNG (300px) — for digital sharing
- Download QR PNG (600px) — for printing
- Download QR SVG — for professional print production
- Download printable tag (PDF) — see below

### 7.3 Printable Route Tag

A printable PDF or PNG template that setters can output and laminate for wall placement.

**Tag contents:**
- Gym logo (top-left)
- Route name (large)
- Setter's suggested grade (with "Setter Grade" label)
- Route type and hold color swatch
- Wall location text
- QR code (large, center-right)
- `crushd.app` wordmark (bottom)
- Set date

**Tag dimensions:** 4×3 inches (landscape) — fits standard laminating pouches.

**Generation:** Server-side PDF generation (e.g., Puppeteer or pdf-lib). Rendered from a styled HTML template. Available as PNG fallback.

### 7.4 In-App Share Flow

On route pages, tapping the **Share** button:

1. On mobile: triggers the native Web Share API (`navigator.share`) with title, text, and the short URL.
2. On desktop (or fallback): shows a share sheet with:
   - "Copy link" button (writes short URL to clipboard)
   - QR code display (for in-person sharing)
   - "Share to Instagram Stories" (copies URL + opens Instagram; deep link on mobile)

---

## 8. Social & Media Spec

### 8.1 Comments

**Comment structure:**
```
Comment {
  id:           string
  routeId:      string
  authorUserId: string
  parentId:     string | null   // for one-level replies
  body:         string (max 1000 chars)
  mediaEmbeds:  InstagramEmbed[]
  isDeleted:    boolean
  deletedBy:    userId | null
  createdAt:    timestamp
  updatedAt:    timestamp
}
```

**Behavior:**
- Max body length: 1000 characters
- Markdown rendering: bold, italic, inline code only (no headings, no images via markdown)
- Newlines rendered as `<br>` in display
- Comments load in chronological order (oldest first), paginated at 20 per page
- New comments are appended optimistically (appear immediately, confirmed on server response)
- Failed posts show an error with a retry option
- Deleted comment body replaced with "This comment was removed." — author and timestamp remain visible

**Anti-spam (P1):**
- Rate limit: max 5 comments per user per route per hour
- Members must have joined the gym for at least 1 hour before commenting

### 8.2 Instagram Embedding

When a comment body contains a URL that matches the pattern `instagram.com/p/`, `instagram.com/reel/`, or `instagram.com/tv/`:

1. The URL is extracted during comment save.
2. A server-side call is made to the Instagram oEmbed endpoint (no user credential required for public posts).
3. The oEmbed response (thumbnail, caption, author) is cached and stored with the comment.
4. On render, the embed appears as a **card** below the comment text:
   - Thumbnail image (linked to Instagram post)
   - Author username (e.g., `@crushdbeta`)
   - Caption truncated to 120 characters
   - "View on Instagram" link
   - A "Play" icon overlay if the post is a video/Reel

**Fallback:** If oEmbed fails (private account, deleted post, API error), the URL renders as a standard hyperlink with no card.

**Privacy note:** No Instagram login is required from the user or the platform. Only public post metadata is fetched.

**Rate limits:** Instagram oEmbed is unauthenticated and may be rate-limited. Embed data is cached per URL indefinitely (since post content rarely changes). Manual cache bust available to admins.

### 8.3 Photo Uploads

**Route photos (setter-uploaded):**
- Max file size: 10MB per image
- Accepted formats: JPEG, PNG, WEBP, HEIC (converted to WEBP on ingest)
- Max photos per route: 20
- First photo uploaded becomes primary (reorderable by setter)
- Photos are compressed server-side to max 1920px on longest dimension
- Stored in object storage (e.g., S3-compatible)
- Served via CDN with cache headers

**Member photo uploads:**
- Enabled or disabled per gym by gym admin (default: enabled)
- Same size/format limits as setter photos
- Member photos appear in the route carousel after setter photos
- Setter/admin can remove member photos

**Thumbnails:**
- Route cards in the gym feed show a 400×300px cropped thumbnail
- Generated on upload via image processing pipeline
- Center-crop strategy; setter can adjust crop anchor (P2)

### 8.4 Video

At launch (P1): video is supported only via Instagram embed (no direct upload).

Post-launch (P2): direct video upload to route pages.
- Max file size: 100MB
- Accepted formats: MP4, MOV (converted to MP4/H.264 on ingest)
- Max 1 video per route (in addition to photos)
- Transcoded to 1080p max, served via CDN
- Autoplay muted on route page

### 8.5 Send Log

```
Send {
  id:           string
  routeId:      string
  userId:       string
  sentAt:       date (user-reported)
  loggedAt:     timestamp
  attempts:     integer | null
  note:         string | null (max 280 chars)
}
```

- One send log entry per user per route (a route can only be "sent" once per user, though attempts can be updated)
- Send count on route page = count of distinct users who have logged a send
- Send list is public: shows avatar and display name of senders
- User can delete their own send log entry

---

## 9. Gym Page Spec

### 9.1 URL

```
crushd.app/g/{gymSlug}
```

### 9.2 Page Sections

#### Header
- **Gym cover image** (full-width banner, 1200×400px recommended)
- **Gym logo** (circular avatar, overlapping cover image bottom-left)
- **Gym name** (H1)
- **Location** (city, state/country)
- **Member count** ("142 members")
- **Follow / Unfollow button** (authenticated members)
- **Admin button** (visible to admins: links to gym settings)

#### About
- **Description** (admin-authored, markdown-supported, max 2000 chars)
- **Social links** (Instagram handle, website URL, optional Facebook/YouTube)
- **Gym type** (e.g., Bouldering Only, Full-Service, Outdoor Crag — admin-set enum)
- **Operating hours** (optional free-text)

#### Pinned Announcement
- Full-width banner (optional, admin-managed)
- Max 1 active pinned announcement
- Rendered as a styled callout with title and body

#### Active Routes Feed
- Paginated list/grid of active route cards
- Default sort: newest first
- Sort options: Newest, Grade (Low→High, High→Low), Most Sends, Most Discussed
- Filter controls (P2): Grade range, Route type, Setter, Wall section
- Route card contents:
  - Route thumbnail photo (or color placeholder with hold color)
  - Route name
  - Consensus grade badge (or "Voting in progress" if < 5 votes)
  - Route type icon
  - Set date
  - Send count
  - Comment count

#### Route Archive Link
- "View archived routes ({N} routes)" — links to `/g/{slug}/archive`
- Archive page: same card layout, filtered to retired routes, sortable by retired date

#### Members Section (P2)
- "Top contributors this month" — members with most sends logged
- Member count stat

### 9.3 Data Model (Gym)

```
Gym {
  id:           string
  slug:         string (unique, URL-safe)
  name:         string
  description:  string (markdown)
  location: {
    city:       string
    state:      string
    country:    string
    lat:        float | null
    lng:        float | null
  }
  logoUrl:      url | null
  coverUrl:     url | null
  type:         enum(bouldering, full_service, outdoor_crag, other)
  social: {
    instagram:  string | null  // handle, not full URL
    website:    url | null
    facebook:   url | null
  }
  isPublic:     boolean
  operatingHours: string | null
  pinnedPost: {
    title:      string
    body:       string
    pinnedAt:   timestamp
  } | null
  createdAt:    timestamp
  updatedAt:    timestamp
}
```

### 9.4 Gym Settings (Admin Panel)

Accessible at `/g/{slug}/settings` for admins.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Gym visibility | Public / Private | Public | Private gyms require gym membership to view any page. |
| Member media uploads | On / Off | On | Whether members (non-setters) can upload photos to route pages. |
| Custom short slug | String | — | Change the gym's URL slug (old slug redirects for 90 days). |
| Route card style | List / Grid | Grid | Preferred default layout for route feed. |
| Grade scale | V-scale / YDS / Both | Both | Which grade scales are used when setters create routes. |
| Require gym join to comment | On / Off | Off | Prevents non-members from commenting even if gym is public. |

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Route page Time to First Byte (TTFB) | < 200ms | Server-side rendered or statically generated with ISR |
| Route page Largest Contentful Paint (LCP) | < 2.5s | On 4G mobile connection |
| Route page Total Blocking Time (TBT) | < 300ms | |
| Gym feed initial load | < 3s | Includes first 12 route cards |
| Vote submission round-trip | < 500ms | Optimistic UI update on tap |
| Comment post round-trip | < 1s | Optimistic UI; server confirm async |
| QR code generation | < 2s | First generation; subsequent reads from cache |
| Image upload processing | < 10s | User shown progress indicator |
| Route page cache TTL | 60s (CDN) | Revalidate on vote/comment activity |

### 10.2 Mobile-First Design

- **Breakpoints:** Mobile (< 640px), Tablet (640–1024px), Desktop (> 1024px)
- **Touch targets:** All interactive elements ≥ 44×44px (Apple HIG standard)
- **Primary interaction model is thumb-native:** CTAs in bottom half of screen on mobile; no hover-only interactions
- **Font sizes:** Minimum 16px body text (prevents iOS auto-zoom on input focus)
- **Scrolling:** Infinite scroll on feeds (no pagination buttons on mobile); pull-to-refresh
- **Navigation:** Bottom navigation bar on mobile (Home, Gym, Add Route, Profile); top nav on desktop
- **Input forms:** Route creation and comment forms use native mobile keyboard types (numeric for attempt count, URL keyboard for links)

### 10.3 PWA Requirements

- `manifest.json` with app name, icons (192px, 512px), theme color, display mode `standalone`
- Service worker caching strategy: **network-first** for route/gym pages (fresh data priority), **cache-first** for static assets
- Offline state: cached route pages viewable offline; write actions (vote, comment) queued and replayed on reconnect
- "Add to Home Screen" prompt shown after 2+ route page visits

### 10.4 SEO

Route and gym pages must be indexable and share-friendly.

**Route page SEO:**
- Server-side rendered HTML (not client-side only)
- `<title>`: `{Route Name} — {Gym Name} | Crushd`
- `<meta description>`: `{Route type} at {Gym Name}. Community grade: {grade}. {send count} sends logged.`
- Open Graph tags:
  - `og:title`: Route name
  - `og:description`: Same as meta description
  - `og:image`: Route primary photo URL (or gym logo fallback)
  - `og:url`: Canonical short URL
- Twitter Card: `summary_large_image`
- Structured data: `SportsEvent` or `Place` schema where applicable (P2)
- Canonical URL: `https://crushd.app/r/{id}` (short URL is canonical)

**Gym page SEO:**
- `<title>`: `{Gym Name} — Climbing Routes & Community | Crushd`
- Open Graph with gym cover image

**Sitemap:**
- Auto-generated sitemap at `crushd.app/sitemap.xml`
- Includes all public gym pages and all public active route pages
- Regenerated on route creation/retirement (or daily batch)
- `robots.txt` allows all crawlers on public pages

### 10.5 Accessibility

- WCAG 2.1 AA compliance target
- All images have descriptive `alt` text (route photos auto-captioned from route name + gym; overridable by setter)
- Grade voting UI operable via keyboard
- Color is never the sole indicator of state (active/retired badge uses text + color)
- Focus management: modals and sheets trap focus; restore on close
- ARIA landmarks on all page regions

### 10.6 Security

- All API endpoints require authentication except explicitly public read routes
- Route and gym creation rate-limited (max 50 routes per gym per day; max 3 gyms per user per day)
- File uploads scanned for malware (ClamAV or equivalent)
- Image uploads stripped of EXIF data before storage
- Short URL IDs are non-sequential (base-62 random) to prevent enumeration
- Private gym pages return 404 (not 403) to non-members to prevent existence disclosure
- All user-generated text is sanitized before render; markdown parser runs in safe mode (no raw HTML)
- CSRF protection on all state-mutating endpoints
- Content-Security-Policy headers block inline scripts; Instagram embed content loaded in sandboxed iframe

### 10.7 Reliability & Scalability

- Target uptime: 99.5% monthly (excluding planned maintenance)
- Database: PostgreSQL with read replica for feed/analytics queries
- Object storage: S3-compatible (images, PDFs); multi-region replication for media
- CDN: All static assets and media served via CDN edge nodes
- Background jobs: QR code generation, image processing, Instagram oEmbed fetch, sitemap rebuild
- Rate limiting applied at API gateway level, not just application level

### 10.8 Data Retention & Privacy

- User accounts and their votes/sends/comments are retained until account deletion
- Account deletion: anonymizes user data (username replaced with "Deleted User"), removes personal profile data; content (comments, votes) retained in anonymized form to preserve route history integrity
- Gym data retained indefinitely (gyms are community infrastructure)
- GDPR / CCPA: data export available on request; deletion request honored within 30 days
- No third-party advertising trackers embedded in the product at launch

---

*This document is the source of truth for the Crushd v1.0 build. All feature scope decisions, implementation details, and UX flows should be reconciled against this PRD. Amendments require a version bump and team review.*
