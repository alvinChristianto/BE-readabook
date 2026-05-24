# CLAUDE.md — BE_readabook

NestJS API for **Dongeng Digital**. Owns authentication, subscription state, story catalog metadata, and the payment lifecycle. The FE app (`../FE_readabook`) is the only first-party client.

> Status: this folder is **empty**. On first run, scaffold with `npx @nestjs/cli new . --package-manager npm` (run inside `BE_readabook/`).

## Commands (after scaffold)

```bash
npm run start:dev     # nest start --watch
npm run build
npm run start:prod
npm run test          # unit tests (jest)
npm run test:e2e
npm run lint
```

Update this section if commands change after scaffolding.

## Data model (PostgreSQL)

Four tables. Use **Prisma** or **TypeORM** — decide at scaffold time and record the choice here. Use `uuid` primary keys.

### `users`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | from Google profile or registration form |
| `email` | text, unique | |
| `password_hash` | text, nullable | bcrypt hash; null for Google-only accounts |
| `google_id` | text, unique, nullable | Google `sub` claim; null for email+password accounts |
| `auth_method` | enum `google` \| `email` | set at registration, never changed — enforces the conflict rule |
| `role` | enum `admin` \| `user` | default `user` |
| `created_at`, `updated_at` | timestamptz | |

### `subscriptions`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | one active row per user |
| `status` | enum `active` \| `expired` \| `pending` | |
| `plan` | enum `ksatria_cerita` \| `penjaga_keajaiban` | which paid tier the user subscribed to |
| `billing_period` | enum `monthly` \| `yearly` | billing cadence within the chosen plan |
| `start_date`, `end_date` | timestamptz | |

### `stories`

Stories contain **catalog metadata only** — there is no single `video_url`. The actual content is in `story_pages` (see below).

| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `title` | text | |
| `slug` | text, unique | used in FE routes `/stories/[slug]` |
| `description` | text | |
| `thumbnail_url` | text, nullable | cover image for the catalog card |
| `cover_emoji` | text | fallback emoji when no thumbnail |
| `cover_gradient` | text | Tailwind gradient string for card background |
| `duration_minutes` | integer | approximate total reading time |
| `is_premium` | boolean | free 3 stories have `is_premium = false` |
| `categories` | text[] | one or more slugs from the canonical category list |
| `created_at`, `updated_at` | timestamptz | |

### `story_pages`

Each story is composed of one or more pages. Pages are displayed in `page_number` order. Each page has its own animation (moving image) and audio narration — these are the core media assets of Dongeng Digital.

| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `story_id` | uuid (FK → stories, cascade delete) | |
| `page_number` | integer | 1-based ordering within the story |
| `text` | text | narration text displayed as caption overlay on the FE |
| `animation_url` | text | path or URL to the looping `.webm` animation file |
| `audio_url` | text | path or URL to the `.mp3` narration file |
| `background_color` | text | Tailwind class used as fallback while webm loads |
| `created_at`, `updated_at` | timestamptz | |

**Constraint:** `UNIQUE (story_id, page_number)` — no duplicate page numbers within a story.

The FE `GET /api/v1/stories/:slug` response must include all pages ordered by `page_number` so the `StoryReader` component can render the full story without additional fetches.

### Story categories (canonical slug list)

The `categories` column stores an array of these slugs. Use a PostgreSQL `text[]` column with a check constraint, or a separate `story_categories` join table if query performance requires it.

| Slug | Label |
|---|---|
| `cerita_rakyat` | Cerita Rakyat |
| `penghantar_tidur` | Penghantar Tidur |
| `hewan` | Dunia Hewan |
| `petualangan` | Petualangan |
| `persahabatan` | Persahabatan & Nilai |
| `alam` | Alam & Sains |
| `keluarga` | Keluarga |

**API filtering:** `GET /api/v1/stories?category=cerita_rakyat` returns all stories whose `categories` array contains the given slug. Combine with `?is_premium=false` for free-only results. Both params are optional — omitting them returns the full catalog. The catalog list response does **not** include `story_pages` — only metadata. The detail endpoint `GET /api/v1/stories/:slug` includes the full `pages[]` array ordered by `page_number`.

### `payments`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `order_id` | text, unique | from payment gateway, used for idempotency |
| `user_id` | uuid (FK → users) | |
| `amount` | integer | IDR, smallest unit |
| `payment_method` | text | e.g. `qris` |
| `status` | enum `pending` \| `success` \| `failed` | |

## Auth

- JWT payload: `{ sub: userId, role }`. **Do not** put subscription state inside the token — query the DB on each request so expiry takes effect immediately.
- Transport: prefer httpOnly cookie (same-site, secure in prod). Also accept `Authorization: Bearer <token>` for API clients and future native apps.
- `/api/v1/auth/me` returns the current user + full subscription info — FE calls this to hydrate `userStore`. Response shape:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "user | admin",
    "subscription": {
      "status": "active | expired | free_tier",
      "plan": "ksatria_cerita | penjaga_keajaiban | null",
      "billing_period": "monthly | yearly | null",
      "end_date": "ISO8601 | null"
    }
  }
  ```
  The `plan` field is what the FE uses to gate the **Audio Only** feature (exclusive to `penjaga_keajaiban`).

### Google OAuth

- `/api/v1/auth/google` starts the OAuth flow; `/api/v1/auth/google/callback` completes it and redirects to `FRONTEND_URL`.
- On callback: look up the email in `users`. If a row exists with `auth_method = 'email'`, do **not** create a session — return a conflict response (`409`) so the FE shows the conflict modal. If no row or `auth_method = 'google'`, proceed: upsert the user (set `google_id`, `auth_method = 'google'`) and issue a JWT.

### Email + password

- `POST /api/v1/auth/register` — `{ name, email, password }`. Check if email exists:
  - Row exists with `auth_method = 'google'` → return `409` with conflict code `google_account`.
  - Row exists with `auth_method = 'email'` → return `409` with conflict code `email_already_registered`.
  - No row → hash password with bcrypt, insert user with `auth_method = 'email'`, issue JWT.
- `POST /api/v1/auth/login` — `{ email, password }`. Check if email exists:
  - Row exists with `auth_method = 'google'` → return `409` with conflict code `google_account`.
  - Row not found or password mismatch → return `401 Unauthorized` (do not reveal which).
  - Match → issue JWT.
- `POST /api/v1/auth/logout` — clear the httpOnly cookie.

### Account-conflict rule

Each email is permanently bound to the `auth_method` it was first registered with. The BE enforces this on every login/register attempt. The FE renders the appropriate Indonesian-language modal based on the `409` conflict code (copy defined in `../CLAUDE.md`).

## `@PremiumGuard`

A NestJS guard applied to every endpoint that streams or returns premium story content.

Logic:

1. Read JWT from the request (cookie or `Authorization` header).
2. Resolve the user; load their latest `subscriptions` row.
3. Pass only if `status === 'active'` **AND** `end_date > now()`.
4. Otherwise respond `403 Forbidden` with a short JSON error — no leaking of why.

Free endpoints (the 3 free stories, public catalog metadata) do **not** use this guard.

## Plan-level feature gating

`@PremiumGuard` only gates premium vs. free. Tier-specific features (Audio Only mode) are gated differently:

- The FE reads `subscription.plan` from `/auth/me` and enforces Audio Only client-side: for `ksatria_cerita` users, the toggle is shown but disabled; for `penjaga_keajaiban`, it is enabled.
- The BE does **not** need a separate guard for Audio Only. The `audio_url` for each `story_page` is included in the standard story response — there is no separate audio-only endpoint. The FE decides whether to hide the animation; the audio files themselves are not gated beyond the premium/free story gate.
- If a dedicated HD animation endpoint is added in a future version, apply a `@PlanGuard('penjaga_keajaiban')` guard at that point.

## Payment webhook

- Endpoint: `POST /api/v1/payments/webhook` (no auth — relies on gateway signature).
- Validate the gateway signature using `PAYMENT_SERVER_KEY`. Reject with `401` if invalid.
- On a `settlement` / success event:
  1. `payments.status = 'success'` for the matching `order_id`.
  2. Upsert the user's `subscriptions` row: `status = 'active'`, `start_date = now()`, `end_date = now() + 30 days` (monthly) or `+ 365 days` (yearly).
- **Idempotency:** if the same `order_id` arrives twice, the second call must be a no-op — do not extend `end_date` again. Enforce via the unique `order_id` and a "was this already success?" check before mutating subscriptions.

## Environment variables

| name | purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | signing secret for app JWT |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth credentials |
| `PAYMENT_PROVIDER` | `midtrans` or `xendit` |
| `PAYMENT_SERVER_KEY` | signature verification + API calls |
| `FRONTEND_URL` | for CORS allow-list and OAuth redirect target |

Document any new env var here before merging.

## Local dev

- PostgreSQL on `localhost:5432` (matches the root `CLAUDE.md` baseline).
- Expose the API via `ngrok http <api-port>` and register the public URL as the webhook target in the payment gateway sandbox.
- Use sandbox credentials only — never commit real keys.

## Conventions

- All HTTP routes live under `/api/v1/...`.
- Validate request bodies with `class-validator` DTOs; use `ValidationPipe` globally.
- Throw Nest's `HttpException` subclasses for errors — never return raw stack traces or internal error messages to the client.
- Keep modules small and feature-scoped (`auth`, `users`, `subscriptions`, `stories`, `payments`).
