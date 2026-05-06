# Fileray

## Overview

Fileray is a paid SaaS Google Drive companion (fileray.io) that helps users find files, understand permissions, organize shared content, and manage team access. The product flow is: sales page → Stripe Checkout (14-day free trial, single monthly Solo plan at £19/mo placeholder) → Sign in with Google → onboarding screen → dashboard. Currently the dev environment uses the Replit Connectors SDK for Drive access; production needs its own Google OAuth client (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`) and Stripe billing (`STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET`). Launch scope is the narrow `drive.file` Drive scope to avoid CASA audit; features that need broader access are gated with a `ScopeLimitedBanner` "Coming soon" notice. Branded with the Fileray identity: deep plum/purple backgrounds, lime green (#c9ff33) accents, Bricolage Grotesque headings, Plus Jakarta Sans body text, dark-first theme.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Google Drive**: Per-user Google OAuth 2.0 (`drive.file` scope) with refresh-token storage
- **Routing**: wouter
- **AI**: OpenAI (via Replit AI Integrations proxy, `@workspace/integrations-openai-ai-server`)
- **Fonts**: Bricolage Grotesque (headings), Plus Jakarta Sans (body) via Google Fonts

## Architecture

- Frontend artifact at `/` (`artifacts/driveiq`)
- API server at `/api` (`artifacts/api-server`)
- Google Drive API calls in `artifacts/api-server/src/lib/googleDrive.ts` use the signed-in user's OAuth access token, pulled out of `AsyncLocalStorage` (set per request by `middlewares/currentUser.ts`). Tokens auto-refresh on expiry or 401 via `lib/googleOAuth.ts`. Refresh tokens are AES-256-GCM encrypted at rest (`lib/crypto.ts`)
- Sessions are managed by `express-session` + `connect-pg-simple` against the project's Postgres pool, in a `user_sessions` table that connect-pg-simple creates on first boot. Session cookie is `fileray.sid`, signed with `SESSION_SECRET` (required in production; auto-generated per process in dev with a warning)
- Database stores: users (Google OAuth identities + encrypted refresh tokens + cached access tokens), user_sessions (express-session store), team members (scoped per user), user settings (one row per user, extended with onboarding flag + display name + tagging mode + theme + email notifications + onboarding timestamp + Stripe billing fields), cached scan results (scoped per user)
- Public pages (`/privacy`, `/terms`, `/checkout/success`, `/checkout/cancel`) bypass the auth gate via top-level routes in `App.tsx`
- Auth-gated content sits behind `AuthGate` which: redirects to Landing if not connected → Onboarding if `onboardingCompletedAt` is null → main Layout otherwise
- Stub routes `/api/auth/google` and `/api/checkout` return a friendly "not configured yet" HTML page when the relevant secrets are missing

## Outstanding Work

Done so far (Tasks #15 + #17):
- Sales / privacy / terms / onboarding / checkout-result pages
- `ScopeLimitedBanner` applied to FolderExplorer, TeamDashboard, SmartOrganiser duplicates
- Real per-user Google OAuth flow at `/api/auth/google` + `/api/auth/google/callback` (drive.file scope), `POST` and `GET` `/api/auth/logout`. Refresh tokens are AES-256-GCM encrypted; access tokens auto-refresh
- `users` table + `user_sessions` table (express-session via connect-pg-simple)
- `auth/status` and `auth/user` now read the signed-in user from the session, no longer the connector
- Stub Stripe checkout route still returns "not configured" HTML when secrets are missing

Deployment note: environments must run `pnpm --filter @workspace/db run push` to pick up the new `users` table. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and a stable `SESSION_SECRET` before going to production. Optionally set `AUTH_ENCRYPTION_KEY` to derive the refresh-token encryption key from a dedicated secret instead of `SESSION_SECRET` / `GOOGLE_OAUTH_CLIENT_SECRET`. Optionally set `GOOGLE_OAUTH_REDIRECT_URI` to override the auto-derived `https://<host>/api/auth/google/callback`.

Still to do:
- Stripe product + monthly price → set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- Wire real Stripe Checkout session creation + webhook in `routes/checkout.ts` (replace stub)
- Settings page now exposes a Billing card (plan, status, trial end, next billing date) and a "Manage billing" button that calls `POST /api/billing/portal` → Stripe Billing Portal session
- Submit the OAuth consent screen for Google verification (drive.file avoids CASA)
- Register fileray.io and deploy

## UI Layout

- **No header bar** — the top bar with page title is removed; pages use full vertical space
- **Sidebar** — left sidebar (w-64) with Fileray logo, nav items, and user info at bottom
- **Theme toggle** — absolutely positioned top-right corner of main content area (not in a header)
- **Home page order** — stat cards → search bar (pill-shaped, yellow border) → filter chips → AI Smart Search → Starred Files grid → results
- **Search bar** — large pill-shaped input (h-16, text-xl, rounded-[100px]) with brand yellow (#c9ff33) border, stands out as the primary interaction element
- **Stat cards** — bold graphic design with Bricolage Grotesque font, text-4xl numbers, unique accent colors per card: lime (#c9ff33) Total Files, cyan (#33d4ff) Shared With Me, red (#ff6b6b) Sharing Risks, orange (#ffb347) Stale Files. Colored borders and subtle glow backgrounds. Hidden during active search.

## Features

0. **Landing / Sales Page** — Full marketing homepage shown to unauthenticated visitors (`Landing.tsx` + `landing.css`). Sections: fixed nav bar, hero with "Google Drive, finally fixed" headline, stats bar, 6 pain-point cards, 6 feature showcases with mock UIs, 3-step "How it works", testimonials, 3-tier pricing (Solo/Team/Enterprise), bottom CTA, and footer. All login/CTA buttons link to `/api/auth/google`. CSS is scoped under `.landing-page` class with `--lp-` prefixed CSS variables to avoid Tailwind conflicts. IntersectionObserver-based scroll-reveal animations. Page appears when `authStatus?.connected` is falsy in `App.tsx`.
1. **Smart File Finder** — Unified search with rich file cards: 2-column grid, large 96px thumbnails, full-depth clickable breadcrumbs linking to Google Drive folders, detailed permission tooltips (per-user name/email/role), multi-select checkboxes, download (single=original format, multi=ZIP), infinite scroll pagination with IntersectionObserver, file preview drawer (Sheet), and always-visible action buttons. Breadcrumb resolver uses in-flight request deduplication and cycle protection. Pagination uses AbortController + activeQueryRef to prevent stale page appends on query changes. **File Type Filters**: pill-shaped filter chips below the search bar let users narrow results by category — All (default), Documents, Spreadsheets, Slides, PDFs, Images, Videos, Audio, Folders. Filter is applied to both the initial query and pagination via the `fileType` query parameter. **File Sub-Type Filters**: when Images, Videos, or Audio is selected, a second row of format-specific chips appears (e.g. PNG, JPEG, SVG, GIF for images; MP4, MOV, AVI for videos; MP3, WAV, FLAC for audio) using the `fileSubType` query parameter for exact MIME type filtering. **AI Smart Search**: users describe what's in a file they can't remember the name of, select file type filters (PSD, PNG, SVG, JPEG, etc.), and AI (OpenAI gpt-5-mini) generates smart search terms to find matching files on Google Drive. Results display in the same file card grid. Endpoint: POST /api/files/smart-search.
1b. **Starred Files** — Dashboard section showing Google Drive starred/favorited files in a responsive grid (1-4 columns). Branded header with lime star icon and count badge. Cards show file icon, name, date, and a clickable lime star button to **unstar** in-place. Each search result file card and the file preview panel header also expose a Star/Unstar toggle so users get full star control without leaving the app. Backend uses `PATCH /api/files/{fileId}/star` (body `{starred: boolean}`) which calls Drive `PATCH /drive/v3/files/{id}`. The `DriveFile` schema now exposes a `starred` boolean. API endpoint: GET /api/files/starred (queries `starred = true and trashed = false`, ordered by `viewedByMeTime desc`).

1c. **Activity Log** — Feed beneath Starred Files showing the last ~20 actions in the user's Drive: avatar/initials of the actor, action verb (uploaded / edited / created folder / updated folder), file name, and relative timestamp. Action verb is derived in the backend by comparing `createdTime` vs `modifiedTime` (within 5 s ⇒ created/uploaded) and folder mime type. Clicking a row opens the file preview or jumps to the folder in Folder Explorer. API endpoint: GET /api/dashboard/recent-activity?limit=20.
2. **Shared With Me Organized** — Group shared files by person, type, or date; stale file detection
3. **Instant Preview Panel** — Right-side slide-in panel for previewing files without leaving the app
4. **Permission Inspector** — Visual breakdown of file access with color-coded alerts; inline permission editing via interactive popovers (change roles directly without leaving the app); owner transfer protected by confirmation dialog; theme-aware styling for dark/light mode
5. **Team Access Dashboard** — Manage team members, scan for stale/oversharing issues, access matrix
6. **Smart Organiser** — Find duplicates, unnamed files, orphans, and naming convention violations
7. **Dashboard** — Summary stats, recent activity, storage breakdown, sharing overview
8a. **Upload to Drive** — Dedicated `/upload` page (sidebar nav item between Smart File Finder and Folder Explorer). Lets users upload any Drive-supported file (up to 100 MB) with three steps: (1) drag-and-drop or click file picker; (2) destination — pick from existing folder list (searchable, indented tree paths) OR create a new folder with a parent picker (root or any subfolder); (3) tagging — Custom tags (chip input, up to 20), AI auto-tag (vision model `gpt-5.4` for images, `gpt-5-mini` for non-images using name+mime), or No tags. Tags are written to Drive `properties.tags` + mirrored in description. XHR upload with progress %, query invalidation refreshes folder tree. Backend routes: `POST /api/folders` (create), `POST /api/files/auto-tag` (AI tags), `POST /api/files/upload` (multer memoryStorage, 100MB limit, returns 413 on overflow). Page: `Upload.tsx`. Service: `googleDrive.ts` `createFolder`/`uploadFile`/`autoTagFile`.
8. **Folder Explorer** — Dedicated page (`/folders`) with its own sidebar nav item for browsing the entire Google Drive folder hierarchy. Clean tree view with expand/collapse arrows, folder icons (open/closed state), item counts, subfolder counts (direct + total descendants), search bar that highlights matching folder names and auto-expands ancestor paths, Expand All / Collapse controls, and external links to open any folder in Google Drive on hover. **File listing**: when a folder is expanded, all non-folder files within it are listed below subfolders with icons, names, sizes, and dates. Each folder has a **per-folder search bar** ("Search files in this folder...") with debounced input that filters files by name via the API. Clicking a file opens the preview panel. API endpoints: `GET /api/folders/tree` (folder structure), `GET /api/folders/{folderId}/files` (files within a folder, supports `search`, `pageToken`, `pageSize` query params). Server-side 5-minute in-memory cache for folder tree. Component: `FolderExplorer.tsx`.

## Database Tables

- `users` — Google OAuth identities (googleId, email, displayName, photoUrl), cached access token + expiry, AES-256-GCM-encrypted refresh token
- `user_sessions` — express-session store (managed by connect-pg-simple)
- `team_members` — Team member emails for access scanning, scoped per signed-in user (`user_id` FK → `users.id`, cascade; unique on `(user_id, email)`)
- `user_settings` — Stale threshold, naming patterns, billing/subscription state — one row per user (`user_id` FK → `users.id`, cascade, unique)
- `cached_scans` — Cached team scan results, scoped per user (`user_id` FK → `users.id`, cascade)

Existing environments must run `pnpm --filter @workspace/db run push` after pulling these changes; the new `user_id` FK columns are NOT NULL so any pre-existing rows will need to be truncated/migrated first.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Key Files

- `lib/api-spec/openapi.yaml` — OpenAPI specification (source of truth)
- `artifacts/api-server/src/lib/googleDrive.ts` — Google Drive API service layer
- `artifacts/api-server/src/routes/` — API route handlers (auth, files, shared, team, organiser, settings, dashboard, folders)
- `lib/db/src/schema/` — Database schema definitions
- `artifacts/driveiq/src/` — React frontend
