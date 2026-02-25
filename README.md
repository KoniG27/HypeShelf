# HypeShelf

Collect and share the stuff you're hyped about.

## 1) Architecture Overview

- **Next.js App Router** for UI and route boundaries:
  - `/` public page.
  - `/app` authenticated experience.
- **Clerk** for identity/session (`ClerkProvider`, `SignedIn`, `SignedOut`, `SignInButton`, `UserButton`).
- **Convex** for schema, queries, mutations, RBAC checks, and audit records.
- **TypeScript** across frontend/backend for safer contracts.

Design principle: keep UX simple, keep authorization authoritative in backend.

## 2) Data Model (and why each table exists)

### `users`
- `clerkUserId` (indexed)
- `name`
- `role` (`admin | user`)
- `createdAt`

Purpose: canonical app profile and role for authorization decisions.

### `recommendations`
- `title`
- `genre`
- `link`
- `blurb`
- `userId` (immutable creator clerk id)
- `userName` (display name snapshot)
- `createdAt`
- `staffPick` (boolean)

Purpose: primary domain records displayed publicly and in authenticated app view.

### `audit_logs`
- `action` (`create_recommendation | delete_recommendation | set_staff_pick | unset_staff_pick`)
- `actorUserId`
- `targetId` (optional)
- `createdAt`

Purpose: lightweight traceability for sensitive state changes.

## 3) Authorization Strategy

All authorization checks happen in Convex mutations:

- `requireIdentity` in `convex/auth.ts` rejects unauthenticated callers.
- `users.getOrCreateMe` bootstraps app user and role.
- `recommendations.create` requires authenticated profile.
- `recommendations.deleteRecommendation` enforces ownership/admin:
  - `admin` can delete any.
  - `user` can delete only own.
- `recommendations.setStaffPick` is admin-only.

Frontend only hides/disables buttons for usability; it is non-authoritative.

## 4) Security Considerations

- **Server-side validation**:
  - trim + normalize genre.
  - strict max lengths.
  - URL parsing with `http/https` protocol allowlist.
- **RBAC**:
  - role stored in `users` and evaluated in backend per mutation.
- **Ownership checks**:
  - deletion allowed only for owner/admin.
  - recommendation ownership fields are set on create and never mutated.
- **Auditability**:
  - create/delete/staff-pick changes write `audit_logs`.
- **Fail-secure behavior**:
  - mutations throw explicit errors when auth/profile/permission checks fail.

## 5) Improvements Beyond Base Requirements (Within Scope)

1. Added `audit_logs` table and writes in sensitive mutations.
Reason: improve traceability without changing UX or product scope.

2. Enforced single Staff Pick invariant.
Reason: avoid inconsistent state and keep business rule deterministic.

3. Tightened backend input validation for recommendation payload.
Reason: reduce malformed or unsafe data entry.

4. Kept authz strictly in Convex.
Reason: prevent bypasses via client-side calls.

## 6) Trade-offs

- Role bootstrap uses env (`ADMIN_EMAIL` / `ADMIN_CLERK_USER_ID`) for pragmatic setup in take-home scope.
- Audit logs are minimal and intentionally not exposed in UI.
- No rate limiter implemented in-app to keep scope tight and dependencies minimal.

## 7) What I'd Add in Real Production

- Mutation rate limiting / abuse controls.
- Structured observability + alerts (Datadog/Sentry).
- Immutable audit trail protections and log retention policy.
- Stronger hardening headers/CSP and stricter outbound link policy if required.
- Periodic role review workflows and admin action alerting.

## Environment Variables

`.env.local`:

```bash
# Convex
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Optional bootstrap admin
ADMIN_CLERK_USER_ID=user_...
ADMIN_EMAIL=admin@example.com
```

`convex/auth.config.ts` must use your real Clerk issuer domain.

## Run Locally

```bash
npm install
npx convex dev
npm run dev
```

## Tests

```bash
npm test
```

Included tests: `tests/validation.test.ts` (normalization + URL protocol + max-length enforcement).

## Troubleshooting (Clerk + Convex)

If you get `Not authenticated` from Convex mutations:

1. Confirm `convex/auth.config.ts` uses your Clerk issuer domain (example: `https://your-app.clerk.accounts.dev`).
2. In Clerk Dashboard, create JWT template named `convex`.
3. Verify the template includes audience `convex`.
4. Confirm `.env.local` has valid:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. Restart both processes:
   - `npx convex dev`
   - `npm run dev`
6. Sign out/in again on `localhost`.

## Manual Verification Checklist

1. Public `/` renders latest recommendations and sign-in CTA.
2. Signed-out user cannot create/delete/staff-pick.
3. Signed-in user can create and sees author names.
4. User can delete only own recommendation.
5. Admin can delete any recommendation.
6. Admin sets Staff Pick; previous pick is automatically unset.
7. Filter by genre updates list.
8. Sensitive actions create audit log entries in `audit_logs`.
