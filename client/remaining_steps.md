# Remaining steps: readability and consolidation

Status checked on 2026-11-07 against the working tree on `development`. Phases are renumbered from the original plan; what is already done is listed first so it isn't redone.

Guiding rule for every phase: **delete first, then consolidate, then move.** Each phase lands on its own, and URLs and behaviour stay the same unless a step says otherwise.

---

## Phase 3: One home for shared logic (`lib/`)

### 3e. Types
- **Split `lib/definitions.ts`.**
  - Domain types go into `lib/types/*` (customer, business, paging, problem-detail).
  - `NavItem` and `NavSection` go into `lib/navigation.ts`, typed with `LucideIcon`.
  - Delete `lib/definitions.ts` once it's empty.
- **Move `app/d/types.ts`** to `lib/types/dashboard.ts`, since it's used outside `app/d/`.
- **Remove duplicate types:**
  - `StorefrontSummary` in `app/d/sign-in/actions.ts` (use the one in `lib/types/point-program.ts`).
  - The re-derived `PointAction` in `point-action-list.tsx`.
  - Derive `PointExpirationMonths` from `POINT_EXPIRATION_MONTHS as const`.
- **Leave** `AdminUserInfo`, `UserInfo`, `Customer` and `SignInUser` separate, since they mirror different backend DTOs. Add a one-line comment to each naming its endpoint.
- **The password regex** lives only in `schemas/user.ts`. `app/b/perfil/page.tsx` and `profile-form-admin.tsx` import it from there.
- **Delete `isValidImage`** in `components/modals/rewards/helpers.ts`; `lib/image-upload.ts` is the only image rule.

### 3f. Preferences
- **Group the preference code under `lib/preferences/`** with one small cookie helper:
  - `lib/sidebar-preference.ts`, `lib/preference-store.ts` and `lib/ui-store.ts`.
  - The hand-written `reward-view` cookie (`reward-view-toggle.tsx`, `gestion-recompensas/page.tsx`).
- **Move the theme logic** in `theme-toggle.tsx` to `lib/preferences/theme.ts`.

**Done when:** tsc is clean, the focused suites pass, and the manual smoke test of sign-in, refresh and logout works in both areas.

---

## Phase 4: Shared hooks and UI primitives

Extract only what has three or more real copies.

| New piece | Replaces |
|---|---|
| `hooks/use-dismissable.ts` (outside click + Escape) | `dashboard-shell.tsx`, `theme-toggle.tsx`, `city-select.tsx`, `tooltip.tsx` |
| `hooks/use-scroll-lock.ts` | `modal.tsx`, `dashboard-shell.tsx`, `b/perfil/page.tsx` |
| `hooks/use-form-toast.ts` + `components/ui/submit-button.tsx` (`useFormStatus`) | the effect + SubmitButton copies in `organization-section`, `storefront-form`, `point-program-form` |
| `hooks/use-save-state.ts` (idle / saving / saved / error) | the many `useState`s in `b/perfil/page.tsx` and both forms in `profile-form-admin.tsx` |
| `EmptyState` (existing) | hand-written empty blocks in `point-action-list`, `rewards-list`, `storefronts-section`, `point-programs-section`, `resolved-redemption-list`, `facturacion/page.tsx` |
| `ErrorState` (existing) | `SectionError` in `facturacion/page.tsx` |
| `Spinner` (existing) | inline spinners in `point-action-list`, `profile-form-admin`, `user-menu`, `b/perfil/page.tsx` |
| `SectionCard` (icon tile + title + action) | about 11 copies of the `size-10 rounded-2xl bg-primary/10` header and card shadow |
| `ListItemCard` (thumbnail + Gift fallback) | `member-only-reward-card`, `exchange-card`, `movement-card` |
| `UserAvatar` | `customer-header.tsx`, `side-menu.tsx` |
| `ConfirmDialog` on `components/modal.tsx` | the private `<dialog>` in `b/perfil/page.tsx` |
| `PaginationControls` (existing) | the hand-written pager in `auditoria/page.tsx` |

Other steps:
- **`components/ui/input.tsx`:** add a `size="lg"` class-map entry (h-11, rounded-xl, px-3.5), following `buttonVariants`. Make `profile-form-admin.tsx` use `Input`, `Field` and `Button` instead of raw `<input>`s.
- **Reward modals:** merge `create-reward-modal.tsx` (287 lines) and `update-reward-modal.tsx` (245 lines) into a single `RewardForm` with a `RewardImagePicker`. Use one error style (inline alert), voseo copy, and `appendRewardFields` for both.
- **`bottom-nav.tsx`:**
  - Merge `BottomNav` and `MemberOnlyBottomNav` into one component that takes `items`, `isActive` and `accent`.
  - Move the nav arrays and `getNavSections` (`sidebar.tsx`) to `lib/navigation.ts`.
  - Fix `side-menu.tsx`, which hard-codes `/b` instead of using `backHref`.
- **`city-select.tsx`:** rebuild it on the listbox from `autocomplete-input.tsx`. In `address-selector.tsx`, collapse the reset logic into one `resetFrom(level)` function.
- **`dashboard-shell.tsx` (338 lines):** split it into `storefront-switcher.tsx`, `dashboard-sidebar.tsx` and `dashboard-mobile-nav.tsx`. Move the colour-to-CSS-variable code to `lib/helpers/color.ts`.
- **`redemption-validator.tsx`:** extract `useRedemptionLookup`, `RedemptionDetails` and `CancelRedemptionPanel`.
- **`lib/helpers/qr-code.ts`:** add a "vendored, do not refactor" header comment and leave it alone.

---

## Phase 5: Folder structure (Next.js 16 private folders)

Read `node_modules/next/dist/docs` on project structure and private folders first. Do the moves as pure renames with `git mv` or an IDE refactor, one commit each, with no logic changes. Today `components/` imports *from* `app/` routes (`create-reward-modal.tsx`, `movement-card.tsx`, `side-menu.tsx`), which is the wrong direction.

```
app/d/[slug]/_components/                           dashboard-shell (+ split parts), sidebar, user-menu
app/d/[slug]/(admin-only)/mi-negocio/_components/   organization/storefront/point-program sections, cards, forms
app/d/[slug]/gestion-recompensas/_components/       rewards-view, rewards-list, reward-view-toggle, create-reward-button, reward-form, delete-reward-modal
app/d/[slug]/verificacion-canjes/_components/       redemption-validator, resolved-redemption-list
app/d/[slug]/administrar-puntos/_components/        point-action-list, update-grant-modal, help, grant-points-form, points-workspace
app/d/[slug]/(admin-only)/auditoria/_components/    operation-select, audit-help, audit-table
app/d/[slug]/perfil/_components/                    profile-form
app/d/sign-in/_components/                          select-storefront-modal
app/s/[slug]/(member-only)/_components/             member-only-header, user-points-card, member-only-reward-card, claim-reward-modal, movement-card
app/b/resumen/_components/                          exchange-card, exchange-state-badge, copy-code-button, cancel-redemption-button
app/(auth)/_components/                             AuthShell, IconInput, PasswordInput, AuthSubmit (also used by app/d/sign-in)

components/ui/          button, input, card, badge, skeleton, submit-button
components/feedback/    empty-state, error-state, spinner, toast
components/overlays/    modal, action-status-modal, confirm-dialog, tooltip
components/navigation/  side-menu, bottom-nav, customer-header, theme-toggle, user-avatar
components/forms/       autocomplete-input, address-selector, city-select, image-upload-field, pagination-controls
components/             brand, business-list, reward-card, carousel, point-expiration-badge, landing-particles, list-item-card, section-card
```

Lib moves:
- `lib/onboarding-progress.ts` and the onboarding helpers move to `lib/onboarding/`.
- `lib/billing*.ts` moves to `lib/billing/`.
- `point-expiration`, `point-program-settings` and `traceability` (plus the `OPERATIONS` table from `auditoria/page.tsx`) move to `lib/domain/`.
- `auth-redirect.ts` is a client hook, so it moves to `hooks/`.
- The storefront-cookie helpers in `app/d/sign-in/actions.ts` (`getDashboardStorefronts`, `saveStorefronts`), used by the `d/[slug]` layout and by onboarding, move to `lib/auth/storefronts.ts`. Do the same for the route actions that `app/onboarding/actions.ts` imports.
- Update the test import paths after each move.

**Route URLs do not change** (`b`, `d`, `s`, `app/billing`). They are public or payment-return contracts. Add a comment at the top of `app/billing/page.tsx` and a route map in the README instead.

---

## Phase 6: Break up large pages and move reads to the server

- **Use a server read and a small client island, instead of fetching in `useEffect`:**
  - `app/b/page.tsx` (`getPoints`). This also settles the error state from Phase 2.4.
  - `facturacion/page.tsx`: add a new `loading.tsx` and a `useDownloadPdf` hook for the invoice card.
  - Device sessions in `b/perfil/page.tsx`.
- **`b/perfil/page.tsx` (684 lines):** keep `page.tsx` as a server shell. Under `_components/`, add `ProfileSection`, `PasswordSection`, `VerifyEmailSection`, `SessionsSection` and `DangerZone`, using `useSaveState` and `ConfirmDialog`. Share the password form with the dashboard profile form.
- **`auditoria/page.tsx` (665 lines):** split it into `OperationSelect`, `AuditHelp`, `AuditTable` and `PaginationControls`. The static help and header render on the server.
- **`administrar-puntos/page.tsx`:** extract the help panel, and map the two copy-pasted mode buttons over an array. Replace `isNotValidAmount` with a `parsePositiveInt` helper in `format.ts`.
- **`inicio/page.tsx`:** merge `TopRewardsCard` and `TopClientsCard` into one `RankedList`. Move its readers from `app/d/actions.ts` to `inicio/actions.ts`.
- **Auth pages (`(auth)/sign-in`, `sign-up`, `d/sign-in`):** use `AuthShell`, `IconInput`, `PasswordInput` and `AuthSubmit`, with one error style.
- **`descubrir/layout.tsx` and `b/layout.tsx`:** extract a shared `CustomerChrome` (`getMe` → `UserProvider` → `SideMenu` / `BottomNav`), and rename `ProfileLayout` to `CustomerLayout`.
- **Boundaries:**
  - Add `error.tsx` to `app/d/[slug]/`, `app/b/` and `app/s/[slug]/`, plus a `global-error.tsx`. Follow the Next 16 docs.
  - Add a `loading.tsx` wherever a server read replaces an effect.
  - Replace the stub `app/d/page.tsx` with a redirect to `/d/sign-in`.
- **`mi-negocio/actions.ts`:** a local `withRevalidate(result)` helper replaces the repeated `revalidatePath(PATH, "page")` calls.

---

## Phase 7: Onboarding readability

- **Give the three meanings of "progress" distinct names:**
  - `app/onboarding/state.ts` → `onboarding-hint-cookie.ts`
  - `app/onboarding/progress-state.ts` → `backend-step.ts`
  - `lib/onboarding-progress.ts` → `lib/onboarding/navigation-store.ts`
  - `pago/payment-button.tsx` → `payment-screen.tsx`, to match its export
  - Move `PollBudget` out of `request-gate.ts`.
- **Steps:**
  - Add a named `OnboardingSlide` const instead of the bare numbers 0–4.
  - Turn the five-level ternary `availableStep` into a lookup.
  - Extract the v1/v2/v3 storage-key migration into one function used by `load`, `save` and `clear`.
- **`onboarding.tsx` (531 lines):**
  - Split it into one component per step: `OrganizationStep`, `PaymentStep`, `StorefrontStep`, `ProgramStep` and `DoneStep`.
  - Factor the duplicated "refresh, then clamp on error" block into one function.
- Write short, bulleted READMEs for the onboarding contracts, to replace the deleted ones.

---

## Out of scope

- Renaming URLs.
- Changing the backend (`../src/`) or `../demo/`.
- Rewriting `qr-code.ts`.
- Merging the DTO-mirroring user types.
- Adding libraries.
- Changing the refresh-rotation ordering or session semantics.

## Verification (after every phase, from `client/`)

- `bunx tsc --noEmit --incremental false`, `bun run lint` (once Phase 2.6 fixes ESLint), and `bun run build`.
- Focused suites, **each in its own Bun process**:
  - `bun test ./proxy.test.ts`
  - `bun test ./lib/onboarding-progress.test.js`
  - `bun test ./lib/auth/session-isolation.test.js`
  - `bun test ./app/onboarding/onboarding.test.js`
  - `bun test ./app/onboarding/dashboard-session.test.js`
  - `bun test ./app/onboarding/storefront-session.test.js`
  - `bun test ./app/onboarding/pago/billing.test.js`
  - `bun test './app/d/[slug]/(admin-only)/facturacion/billing.test.js'`
  - `bun test ./lib/helpers/point-expiration.test.ts`
  - `bun test ./lib/helpers/traceability.test.ts`
- `bun run audit:unused` with the corrected `knip.json` should list only intentional test-only exports.
- After a build, confirm `billingAdminToken` isn't in `.next/server/server-reference-manifest.json`.
- **Manual smoke test** with `bun run dev` against the local backend:
  - **Customer:** sign-in, `/b`, `/b/perfil` (save, password, sessions), and claiming a reward in `/s/[slug]`.
  - **Dashboard:** sign-in and storefront selection, then inicio, administrar-puntos, gestion-recompensas, verificacion-canjes, mi-negocio, auditoria, and facturación with a PDF download.
  - **Onboarding** from start to finish.
  - **Themes and access:** light, dark and abismo themes, mobile width, and keyboard navigation of menus and dialogs.
- **Performance:** compare the `bun run build` route-size table before and after. Client JS for `/b`, `/b/perfil` and `facturacion` should shrink once their reads move to the server.
