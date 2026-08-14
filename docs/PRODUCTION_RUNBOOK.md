# The Lobby Production Runbook

This runbook defines the minimum release gate for The Lobby.

## 1. Release prerequisites

- Release from `main` only.
- Working tree must be clean.
- GitHub CI must pass.
- Firebase CLI must be authenticated to the intended production project.
- Production environment variables must be configured in the deployment platform.
- Never commit service-account JSON files or real API keys.

## 2. Required production environment

Use `.env.example` as the contract. The required groups are:

- Firebase client configuration (`NEXT_PUBLIC_FIREBASE_*`)
- Firebase Admin service-account environment (`FIREBASE_ADMIN_*`)
- Groq (`GROQ_API_KEY`)
- Resend email delivery (`COMMUNICATION_EMAIL_PROVIDER`, `RESEND_API_KEY`, `COMMUNICATION_FROM_EMAIL`)

Before a release, validate an injected environment with:

```bash
npm run check:production-env
```

For local `.env.local` validation:

```bash
npm run check:production-env:local
```

The validator never prints secret values.

## 3. Local release gate

The development server must be running for the Firebase-backed E2E suite.

```bash
npm ci
npm run check:phase10
npm run build
```

Expected final markers:

- `PHASE9_REGRESSION_ALL_PASSED`
- `PHASE10_PRODUCTION_READINESS_CHECK_PASSED`
- `PHASE10_REGRESSION_ALL_PASSED`
- Next.js build completes successfully

## 4. Firestore infrastructure deployment

Rules and indexes are part of the release unit. Deploy both explicitly to the production Firebase project:

```bash
npm run deploy:firestore
```

Index creation may continue asynchronously after the CLI reports deployment success. Do not run production smoke checks for index-dependent queries until required indexes are serving.

Rules-only emergency deployment:

```bash
npm run deploy:firestore:rules
```

Indexes-only deployment:

```bash
npm run deploy:firestore:indexes
```

## 5. Application deployment

Deploy the application from the exact `main` commit that passed CI and the local release gate. Record the deployed commit SHA.

The application must expose:

```text
GET /api/health
```

A healthy response has HTTP 200 and `status: "ok"`.

## 6. Production smoke gate

Set the deployed origin, without a trailing slash:

```bash
PRODUCTION_BASE_URL=https://your-production-domain.example npm run check:phase10:smoke
```

PowerShell example:

```powershell
$env:PRODUCTION_BASE_URL="https://your-production-domain.example"
npm run check:phase10:smoke
```

The smoke gate verifies:

- `/api/health`
- `/`
- `/jobs`
- `/login`
- `/b2b-admin/login`

Expected marker:

```text
PHASE10_PRODUCTION_SMOKE_PASSED
```

## 7. Release evidence

Record these items for every production release:

- Git commit SHA
- GitHub CI result
- Phase 10 regression result
- production build result
- Firestore rules/index deployment result
- production smoke result
- deployment timestamp

## 8. Rollback

If the application deployment fails, roll back the application to the last known-good commit first.

If Firestore rules cause authorization failures, redeploy `firestore.rules` from the last known-good commit. Do not weaken rules as an emergency shortcut.

Firestore indexes are generally additive infrastructure. A newly deployed index should not be deleted during an application rollback unless there is a separate, reviewed reason to remove it.
