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

## Features

1. **Smart File Finder** — Unified search with rich file cards: 2-column grid, large 96px thumbnails, full-depth clickable breadcrumbs linking to Google Drive folders, detailed permission tooltips (per-user name/email/role), multi-select checkboxes, download (single=original format, multi=ZIP), infinite scroll pagination with IntersectionObserver, file preview drawer (Sheet), and always-visible action buttons. Breadcrumb resolver uses in-flight request deduplication and cycle protection. Pagination uses AbortController + activeQueryRef to prevent stale page appends on query changes. **AI Smart Search**: users describe what's in a file they can't remember the name of, select file type filters (PSD, PNG, SVG, JPEG, etc.), and AI (OpenAI gpt-5-mini) generates smart search terms to find matching files on Google Drive. Results display in the same file card grid. Endpoint: POST /api/files/smart-search.
2. **Shared With Me Organized** — Group shared files by person, type, or date; stale file detection
3. **Instant Preview Panel** — Right-side slide-in panel for previewing files without leaving the app
4. **Permission Inspector** — Visual breakdown of file access with color-coded alerts; inline permission editing via interactive popovers (change roles directly without leaving the app); owner transfer protected by confirmation dialog; theme-aware styling for dark/light mode
5. **Team Access Dashboard** — Manage team members, scan for stale/oversharing issues, access matrix
6. **Smart Organiser** — Find duplicates, unnamed files, orphans, and naming convention violations
7. **Dashboard** — Summary stats, recent activity, storage breakdown, sharing overview
8. **Folder Tree** — Visual family-tree view of the entire Google Drive folder hierarchy on the homepage. Features: pannable canvas (click+drag), scroll-to-zoom with +/-/fit controls, expand/collapse nodes (starts collapsed showing only root + direct children for performance with 7k+ folders), hover tooltips showing subfolder counts, click to open folder in Google Drive. API endpoint `GET /api/folders/tree` returns flat folder list with parent references; tree is built client-side. Server-side 5-minute in-memory cache avoids repeated slow Google Drive API pagination. Component: `FolderTreeCanvas.tsx`.

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
