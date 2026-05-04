# DriveIQ

## Overview

DriveIQ is a full-stack Google Drive UX companion app that helps users find files, understand permissions, organize shared content, and manage team access. It connects to Google Drive via the Replit Connectors SDK.

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

## Architecture

- Frontend artifact at `/` (`artifacts/driveiq`)
- API server at `/api` (`artifacts/api-server`)
- Google Drive API calls proxied through `@replit/connectors-sdk` in `artifacts/api-server/src/lib/googleDrive.ts`
- Database stores: team members, user settings, cached scan results

## Features

1. **Smart File Finder** — Unified search across My Drive, Shared Drives, and Shared With Me with filters
2. **Shared With Me Organized** — Group shared files by person, type, or date; stale file detection
3. **Instant Preview Panel** — Right-side slide-in panel for previewing files without leaving the app
4. **Permission Inspector** — Visual breakdown of file access with color-coded alerts
5. **Team Access Dashboard** — Manage team members, scan for stale/oversharing issues, access matrix
6. **Smart Organiser** — Find duplicates, unnamed files, orphans, and naming convention violations
7. **Dashboard** — Summary stats, recent activity, storage breakdown, sharing overview

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
- `artifacts/api-server/src/routes/` — API route handlers (auth, files, shared, team, organiser, settings, dashboard)
- `lib/db/src/schema/` — Database schema definitions
- `artifacts/driveiq/src/` — React frontend
