# Fileray

## Overview

Fileray is a full-stack Google Drive UX companion app that helps users find files, understand permissions, organize shared content, and manage team access. It connects to Google Drive via the Replit Connectors SDK. Branded with the Fileray identity: deep plum/purple backgrounds, lime green (#c9ff33) accents, Bricolage Grotesque headings, Plus Jakarta Sans body text, dark-first theme.

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
- **Google Drive**: Replit Connectors SDK (`@replit/connectors-sdk`)
- **Routing**: wouter
- **AI**: OpenAI (via Replit AI Integrations proxy, `@workspace/integrations-openai-ai-server`)
- **Fonts**: Bricolage Grotesque (headings), Plus Jakarta Sans (body) via Google Fonts

## Architecture

- Frontend artifact at `/` (`artifacts/driveiq`)
- API server at `/api` (`artifacts/api-server`)
- Google Drive API calls proxied through `@replit/connectors-sdk` in `artifacts/api-server/src/lib/googleDrive.ts`
- Database stores: team members, user settings, cached scan results

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

- `team_members` — Team member emails for access scanning
- `user_settings` — Stale threshold, naming patterns
- `cached_scans` — Cached team scan results with timestamps

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
