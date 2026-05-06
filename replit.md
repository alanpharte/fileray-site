# Fileray
Fileray is a paid SaaS Google Drive companion that helps users find files, understand permissions, organize shared content, and manage team access.

## Run & Operate
- `pnpm run typecheck`: Full typecheck across all packages.
- `pnpm run build`: Typecheck and build all packages.
- `pnpm --filter @workspace/api-spec run codegen`: Regenerate API hooks and Zod schemas from OpenAPI spec.
- `pnpm --filter @workspace/db run push`: Push DB schema changes (dev only).
- **Required Environment Variables**:
    - `GOOGLE_OAUTH_CLIENT_ID`
    - `GOOGLE_OAUTH_CLIENT_SECRET`
    - `SESSION_SECRET` (production)
    - `STRIPE_SECRET_KEY`
    - `STRIPE_PRICE_ID`
    - `STRIPE_WEBHOOK_SECRET`
    - `AUTH_ENCRYPTION_KEY` (optional)
    - `GOOGLE_OAUTH_REDIRECT_URI` (optional)

## Stack
- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **TypeScript**: 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Google Drive**: Per-user Google OAuth 2.0 (`drive.file` scope) with refresh-token storage
- **Routing**: wouter
- **AI**: OpenAI (via Replit AI Integrations proxy)
- **Fonts**: Bricolage Grotesque (headings), Plus Jakarta Sans (body)

## Where things live
- `lib/api-spec/openapi.yaml`: OpenAPI specification (source of truth for API contracts).
- `artifacts/api-server/src/lib/googleDrive.ts`: Google Drive API service layer.
- `artifacts/api-server/src/routes/`: API route handlers.
- `lib/db/src/schema/`: Database schema definitions (source of truth for DB schema).
- `artifacts/driveiq/src/`: React frontend.
- `/`: Frontend artifact.
- `/api`: API server.

## Architecture decisions
- **Google OAuth Token Management**: Access tokens are pulled from `AsyncLocalStorage` and auto-refresh. Refresh tokens are AES-256-GCM encrypted at rest.
- **Session Management**: `express-session` with `connect-pg-simple` uses a `user_sessions` table for session storage.
- **Account Deletion**: `POST /api/auth/delete-account` revokes Google refresh token, deletes user data across multiple tables, and destroys the session within a single transaction.
- **Scope-Limited Features**: Features requiring broader Google Drive access are gated with a `ScopeLimitedBanner` and "Coming soon" notice to adhere to the narrow `drive.file` scope for initial launch.
- **Auth Gate Flow**: Authentication flows through a gate that redirects based on connection status (`Landing`), onboarding completion (`Onboarding`), or to the main `Layout`.

## Product
- **Landing / Sales Page**: Marketing homepage for unauthenticated users with sales content and CTAs.
- **Smart File Finder**: Unified search with rich file cards, detailed permissions, multi-select, download, infinite scroll, file preview, and AI Smart Search.
- **Starred Files**: Dashboard section and in-app toggles for managing Google Drive starred files.
- **Activity Log**: Feed of recent Google Drive actions.
- **Shared With Me Organized**: Tools to group shared files, detect stale files.
- **Instant Preview Panel**: Right-side panel for file previews.
- **Permission Inspector**: Visual breakdown and inline editing of file access.
- **Team Access Dashboard**: Management of team members, scan for issues.
- **Smart Organiser**: Tools to find duplicates, unnamed files, orphans.
- **Dashboard**: Summary stats, recent activity, storage breakdown.
- **Upload to Drive**: Dedicated page for uploading files with destination selection and AI tagging.
- **Folder Explorer**: Tree-view browsing of Google Drive folders with file listing and search.

## User preferences
_Populate as you build_

## Gotchas
- Existing environments must run `pnpm --filter @workspace/db run push` to pick up new `users` table and other schema changes. Pre-existing rows may need truncation/migration due to `NOT NULL` FKs.
- Stub routes for `/api/auth/google` and `/api/checkout` return "not configured yet" if relevant secrets are missing.
- The dev environment uses Replit Connectors SDK for Drive access; production requires its own Google OAuth client and Stripe billing.

## Pointers
- **Google Drive API Docs**: [https://developers.google.com/drive/api/guides/manage-uploads](https://developers.google.com/drive/api/guides/manage-uploads)
- **Stripe API Docs**: [https://stripe.com/docs/api](https://stripe.com/docs/api)
- **Drizzle ORM Docs**: [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
- **Tailwind CSS Docs**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Zod Docs**: [https://zod.dev/](https://zod.dev/)
- **OpenAPI Specification**: [https://swagger.io/specification/](https://swagger.io/specification/)