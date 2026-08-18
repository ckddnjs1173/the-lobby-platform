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

Use `.env.example` as the contract. The required groups for the initial public release are:

- Firebase client configuration (`NEXT_PUBLIC_FIREBASE_*`)
- Firebase Admin service-account environment (`FIREBASE_ADMIN_*`)
- Groq (`GROQ_API_KEY`) for resume and job-description structuring

Candidate communication starts in **manual mode**. Recruiters use the applicant email/phone shown in the admin workspace and contact candidates through the organization’s existing mail/phone tools. Resend is therefore not a release blocker.

Automated email can be enabled later by configuring all of these together:

- `COMMUNICATION_EMAIL_PROVIDER=RESEND`
- `RESEND_API_KEY`
- `COMMUNICATION_FROM_EMAIL`

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
npm run check:core-workflows
npm run check:phase10
npm run build
```

Expected final markers:

- `CORE_WORKFLOWS_RELEASE_CHECK_PASSED`
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

Deploy the application from the exact `main` commit that passed CI and the release gate. Record the deployed commit SHA.

The application must expose:

```text
GET /api/health
GET /api/readiness
```

A healthy release returns HTTP 200 from both endpoints. `/api/readiness` should report Firestore ready, AI parsing available, and `communicationMode: "MANUAL"` until automated email is intentionally configured.

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
- `/api/readiness`
- `/`
- `/jobs`
- `/login`
- `/b2b-admin/login`

After the anonymous smoke gate, manually verify the three core workflows against the deployed revision:

1. Candidate signup/login → profile creation/update → job application visibility.
2. B2B job intake → PDF/DOCX/TXT or pasted JD → AI standardization → human review → DRAFT/OPEN save.
3. Admin application operations → candidate contact details → stage/assignment/interview/outcome workflow.

Expected marker:

```text
PHASE10_PRODUCTION_SMOKE_PASSED
```

## 7. Release evidence

Record these items for every production release:

- Git commit SHA
- GitHub CI result
- core workflow gate result
- Phase 10 regression result
- production build result
- Firestore rules/index deployment result
- production smoke result
- deployment timestamp

## 8. Rollback

If the application deployment fails, roll back the application to the last known-good commit first.

If Firestore rules cause authorization failures, redeploy `firestore.rules` from the last known-good commit. Do not weaken rules as an emergency shortcut.

Firestore indexes are generally additive infrastructure. A newly deployed index should not be deleted during an application rollback unless there is a separate, reviewed reason to remove it.
