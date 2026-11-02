@AGENTS.md

# Bonus Bissen frontend

Paths below are relative to `client/` unless prefixed with `../`.
This file provides frontend context; manifests and implementation remain authoritative.

## Purpose and stack

- Bonus Bissen is a customer loyalty platform: customers discover businesses, join point programs, earn points, and redeem rewards. Business administrators configure organizations, storefronts, programs, and rewards; administrators and cashiers operate the points/redemption dashboard.
- The production frontend is this Next.js App Router application. `../demo/` is a separate app, not the implementation to update for production frontend requests.
- Core versions: Next.js **16.3.4**, React **19.2.8**, TypeScript **5.9**, Tailwind CSS **4**. Use Bun and `bun.lock`; `package.json` is the source of truth for versions and scripts.
- Existing libraries include Base UI primitives, Lucide icons, Motion, Zustand, Zod, and `jose`. Reuse them rather than adding competing libraries.
- The separate backend in `../src/` uses Java 25 / Spring Boot 4.1.1, PostgreSQL/JPA/Flyway, and Redis-backed refresh sessions (`../pom.xml`, `../docker-compose.yml`). Business rules and tenant authorization belong there, not in browser state.

## Architecture and navigation

- `app/`: routes, layouts, route-local `actions.ts`, and occasional `route.ts` handlers. Both server-rendered pages and interactive `"use client"` pages exist; follow the nearest feature's pattern.
- `app/(auth)/`: customer authentication; `app/b/`: customer home, profile, and summary; `app/descubrir/`: full business discovery; `app/s/[slug]/`: storefront-scoped customer membership, points history, and rewards.
- `app/d/sign-in/`: staff authentication and storefront selection. `app/d/[slug]/`: organization dashboard; `app/d/[slug]/(admin-only)/`: organization configuration, billing, audit, and affiliation QR. Route groups do not add URL segments.
- `app/onboarding/`: business setup and billing authorization. `lib/onboarding-progress.ts` persists navigation hints, not authoritative state. `app/billing/` redirects payment returns to onboarding billing; query parameters are not payment evidence.
- `components/`: reusable feature components; `components/ui/`: shared primitives. `components/sidebar.tsx` defines role-filtered dashboard navigation; `components/dashboard-shell.tsx` composes the dashboard.
- `lib/api.ts`: backend request wrappers. `lib/auth/` and `proxy.ts`: sessions, role verification, refresh, and logout. `lib/billing*.ts`: billing contracts, validation, formatting, and requests.
- `lib/types/`, `lib/definitions.ts`: shared domain/API types; `lib/helpers/`: reusable transformations. `schemas/`: shared validation. `hooks/`, `providers/`, and the small Zustand stores supply shared client behavior/state.
- `app/globals.css`: Tailwind setup and theme tokens. `public/`: static assets. `../docs/` contains points/redemption explanations; verify older prose against current contracts.

## Domain constraints

- An organization owns storefronts (sucursales) and point programs. A storefront has at most one program; one program can span multiple storefronts in the same organization.
- Customer membership and point balance are **per program**, not per storefront. Rewards also belong to programs. Staff are users with organization membership and assigned storefronts, with `ADMIN` or `CASHIER` permissions.
- The dashboard URL slug identifies the organization; the verified JWT's `sf` claim identifies the selected storefront. Neither a URL nor a client-selected ID grants access.
- Reward claim deducts points and creates a pending exchange. Verification does not deliver it; approval marks delivery without charging points again. Cancellation and refund are distinct operations. Wire states are `pending`, `delivered`, `cancelled` (`lib/types/exchange.ts`).
- Grant corrections submit a **target total**, not a delta; the backend computes a linked adjustment. Inspect `app/d/[slug]/administrar-puntos/actions.ts` and backend DTOs before changing point operations.
- Program expiration supports `null` or 3/6/9/12 months. Updates must preserve/send `expirationMonths` explicitly: omission disables expiration. Creation does not configure expiration. Reuse `lib/helpers/point-program-settings.ts`; see the expiration section in `README.md` for policy details.
- Subscription authorization is not proof of invoice payment. History uses invoice status, paid date, and reference independently of payment method. `nextInvoiceDueAt` is an invoice due date, **not** a renewal/expiration date; the organization contract exposes no such subscription date.
- Billing PDFs use the existing organization-scoped backend endpoint via the authenticated frontend handler under `app/d/[slug]/(admin-only)/facturacion/`. They are bookkeeping documents, not AFIP electronic invoices. Do not fabricate payment links, provider-neutral subscription fields, or missing backend capabilities.

## Backend access and security

- Use `request` for customer credentials, `dashboardRequest` for staff credentials, and `publicRequest` for public backend requests (`lib/api.ts`). Calls normally live in server actions/components; keep credentials out of Client Components.
- `BACKEND_URL` is server-only and defaults to `http://localhost:8080`. Browser-facing asset resolution uses `NEXT_PUBLIC_ASSETS_URL` through `lib/helpers/assets.ts`; public variables are baked in at build time and must never contain secrets.
- Mercado Pago checkout/subscription processing and webhooks live in the backend. Geographic selectors use Argentina's GeoRef API via `lib/georef.ts`. Follow existing integration boundaries instead of calling privileged provider APIs from the browser.
- The Next server forwards bearer tokens from separate HttpOnly cookies: customer `access_token` / `bb_user_rt`, dashboard `d_token` / `bb_dashboard_rt`. Do not mix sessions or expose tokens to browser JavaScript or localStorage.
- `proxy.ts` refreshes missing/expired protected-route sessions; `lib/auth/session.ts` verifies ES256 signatures and role. Decoding a JWT is **not** verification. Preserve distinctions between invalid, expired, and temporarily unavailable verification.
- Dashboard layouts enforce roles for pages, but actions and route handlers must enforce their own authorization. Sidebar visibility is not access control; backend organization scoping remains authoritative. See `lib/auth/billing-admin.ts` for an explicit admin guard.
- Refresh rotation is replay-sensitive: reuse existing refresh/logout/storefront-selection utilities. Coordination is process-local; multiple Next replicas need shared coordination before safely relying on this refresh design. See `README.md` → Session refresh.
- Authenticated billing requests use runtime Zod schemas, no-store caching, timeouts, and rejected redirects (`lib/billing-api.ts`). General API wrapper generics only assert response types; they do not validate JSON. Check actual backend DTOs/nullability rather than treating TypeScript casts as proof.
- Never log, hardcode, commit, or expose secrets, session cookies, authorization headers, or sensitive configuration. Do not make a backend secret public to work around a missing frontend endpoint.

## Existing patterns and guidance for changes

- Use strict TypeScript for application code, `@/` imports rooted at `client/`, PascalCase component names, and kebab-case shared filenames. Keep Next's special filenames and route-local organization (`tsconfig.json`). Match surrounding formatting; it is not uniform enough to justify unrelated reformatting.
- Keep interactive/browser-only work behind `"use client"` boundaries and server actions behind `"use server"`. Keep shared contracts/helpers importable without pulling credentials or server APIs into client bundles. Dynamic route `params` and `cookies()` are asynchronous; follow the installed Next docs imported via `AGENTS.md`.
- Use React local state for feature interactions. Existing shared state uses Zustand (`lib/ui-store.ts`, `lib/preference-store.ts`) and context (`providers/user-provider.tsx`, modal/toast providers). Persistence is for preferences/navigation, not authorization or balances; preserve hydration guards.
- Reuse `components/ui/`, `components/modal.tsx`, `components/toast.tsx`, existing hooks, and `lib/helpers/` before introducing abstractions. Follow existing server-action form state / `useActionState` patterns where applicable; revalidate affected data after successful mutations when the feature uses server-rendered reads.
- Expected failures commonly use discriminated `{ ok, data/error, status? }` results or form state. `lib/action-result.ts` provides `runAction`: it serializes `ApiError` details but propagates redirects/unexpected errors; it does not currently carry HTTP status through that conversion. Handle loading/error/empty/retry states; do not disguise failed reads as empty lists.
- For new changes, validate server-bound input with existing schemas/helpers, prevent duplicate submissions/stale responses, and confirm backend behavior before retrying mutations: a lost response does not prove the write failed.
- User-facing copy is Spanish. Reuse Tailwind semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`) and `cn` from `lib/helpers/utils.ts` instead of inventing a parallel visual system.
- Preserve light/dark/abismo themes, responsive layouts, keyboard access, visible focus, labeled controls, and status/error announcements. Reuse primitive behavior rather than replacing it with inaccessible clickable containers. Respect reduced motion for new animations.
- Keep server timestamps authoritative. Reuse date/money/expiration helpers instead of duplicating timezone or locale logic; expiration rendering has a deterministic initial fallback and a shared clock (`hooks/use-current-time.ts`).
- Independent reads are often parallelized with `Promise.all`; preserve operation ordering where session rotation, resource creation, or persistence requires it. Do not cache tenant/private data across users.
- `next.config.ts` deliberately disables image optimization for the deployment's asset topology and builds standalone output. Do not casually remove these settings; the Docker image runs the standalone server using Bun.

## Development and verification

Run commands from `client/`:

| Purpose | Command |
| --- | --- |
| Install reproducibly | `bun install --frozen-lockfile` |
| Development (long-running) | `bun run dev` |
| Type-check without build artifacts | `bunx tsc --noEmit --incremental false` |
| Lint | `bun run lint` |
| Production build | `bun run build` |
| Start Next production server (after build) | `bun run start` |
| Unused-code audit | `bun run audit:unused` |

- Tests are colocated as `*.test.js` / `*.test.ts`; existing suites use both `bun:test` and `node:test`, run through Bun. There is no package `test` script. Examples:
  - `bun test ./proxy.test.ts`
  - `bun test ./lib/helpers/point-expiration.test.ts`
  - `bun test './app/d/[slug]/(admin-only)/facturacion/billing.test.js'`
- Run mock-heavy suites in **separate Bun processes**: onboarding, billing, storefront-session, and proxy tests replace modules/fetch and are not safely isolated by running the entire tree in one process. Quote paths containing route groups or brackets.
- Test behavior, boundaries, authorization, and recovery rather than restating mocks or duplicating coverage. Mocked tests do not replace live backend/browser verification.
- Inspect relevant implementations and backend contracts first. Prefer small, consistent changes over rewrites or new layers. Preserve existing behavior and user work; do not silently introduce breaking changes or edit `../src/`, deployment configuration, or `../demo/` for a frontend-only task.
- Avoid new dependencies unless the task clearly benefits; use Bun and update the existing lockfile when dependencies change. Do not introduce another package manager/lockfile.
- For code changes, run focused tests, type-checking, lint, and build as appropriate. Report actual results and tool/environment failures; do not suppress rules, weaken types, or claim passing checks that were not run. Documentation-only changes generally need reference/command checks and `git diff --check`, not a production build.
- Existing code/docs can be wrong: identify significant contract, security, accessibility, or performance issues with evidence. Explain limitations rather than inventing endpoints or bypassing backend constraints; keep unrelated fixes out of scope.
- Keep this memory concise and stable. Update facts when their source changes; link to detailed implementations/docs rather than duplicating them. If specialized guidance grows, move it to path-scoped `client/.claude/rules/` instead of expanding this file indefinitely.
