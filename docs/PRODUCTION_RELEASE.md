# The Lobby Production Release Runbook

This runbook is the release checklist for deploying the Next.js application to Vercel while keeping Firebase Authentication / Firestore as the application backend.

## 1. Release prerequisites

The release candidate must satisfy all of the following before production deployment:

```bash
npm run check:phase10:static
npm run build
```

Firestore rules and indexes must already be deployed to the `the-lobby-platform` Firebase project:

```bash
npm run deploy:firestore
```

## 2. Vercel project

Import the GitHub repository `ckddnjs1173/the-lobby-platform` into Vercel.

Recommended project settings:

- Framework Preset: Next.js
- Root Directory: repository root
- Production Branch: `main`
- Build Command: default (`next build`)
- Install Command: default (`npm install`)
- Node version: use the version supported by the current Next.js release

Do not add a custom `vercel.json` unless a concrete routing/runtime requirement appears. Next.js should use Vercel's native framework integration.

## 3. Production environment variables

Configure these variables in Vercel Production Environment. Use `.env.example` only as the name/shape reference and never commit real values.

### Firebase Web client

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=the-lobby-platform`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin server runtime

- `FIREBASE_ADMIN_PROJECT_ID=the-lobby-platform`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Important: production Vercel must not use the local Windows `GOOGLE_APPLICATION_CREDENTIALS=C:/Secrets/...json` path. The Vercel server runtime cannot read the developer workstation. Copy only the service-account `client_email` and `private_key` values into Vercel encrypted environment variables.

If the private key is pasted with escaped newlines (`\n`), keep that representation intact; the server initialization normalizes it before creating the Firebase Admin credential.

### AI

- `GROQ_API_KEY`

### Communication

- `COMMUNICATION_EMAIL_PROVIDER=RESEND`
- `RESEND_API_KEY`
- `COMMUNICATION_FROM_EMAIL`

The sender domain/address must be verified in the email provider before enabling real production communication.

## 4. Validate the environment contract

Before treating a deployment as production-ready, confirm the production values satisfy:

```bash
npm run check:production-env
```

The expected final line is:

```text
PRODUCTION_ENV_VALIDATION_PASSED
```

## 5. Firebase Authentication authorized domains

After Vercel creates the production hostname, add the hostname to Firebase Authentication's authorized domains for the `the-lobby-platform` project.

Examples:

- `the-lobby-platform.vercel.app`
- final custom production domain, when attached

Without this, browser Firebase Auth flows can fail even when the Vercel build itself succeeds.

## 6. First production deployment

Deploy `main` after all Production environment variables have been configured.

Verify deployment status is Ready before running smoke checks.

## 7. Production smoke checks

Set the deployed origin temporarily in the terminal running the smoke command:

PowerShell:

```powershell
$env:PRODUCTION_BASE_URL="https://<production-host>"
npm run check:phase10:smoke
```

Expected checks:

- `/api/health` -> 200 and `{ status: "ok", service: "the-lobby-platform" }`
- `/` -> 200
- `/jobs` -> 200
- `/login` -> 200
- `/b2b-admin/login` -> 200

Expected final line:

```text
PHASE10_PRODUCTION_SMOKE_PASSED
```

## 8. Manual authenticated smoke checks

After the public smoke test passes, verify these flows once in production:

### Candidate

1. Open `/login`.
2. Sign in with a known Candidate test account.
3. Open `/candidate`.
4. Confirm profile and application data load.
5. Open `/jobs`, open a job detail page, and verify authenticated application state.

### B2B

1. Open `/b2b-admin/login`.
2. Sign in with the known ADMIN test account.
3. Confirm `/b2b-admin` pipeline loads.
4. Confirm Candidate CRM loads.
5. Confirm Jobs loads.
6. Confirm Analytics loads without a 500 response.

Do not create destructive or irreversible production test data unless needed. Prefer read-only checks on the initial production launch.

## 9. Runtime monitoring after launch

For the first launch window, check Vercel runtime errors/logs for:

- `/api/b2b/session`
- `/api/b2b/analytics`
- `/api/candidate/me`
- `/api/candidate/applications`
- `/api/applications/apply`
- `/api/ai-parse-resume`

Any unexpected 500 should be investigated before announcing the deployment broadly.

## 10. Rollback

If the deployment has a production-blocking regression:

1. Do not change Firestore data to compensate for a frontend bug.
2. Roll production back to the last known-good Vercel deployment.
3. Keep Firestore rules/indexes unchanged unless the incident is specifically caused by those resources.
4. Fix the issue on a branch and rerun CI/build before redeploying.

Because the application APIs and authorization rules are server-authoritative, rollback should prefer deployment rollback over manual data mutation.

## 11. Launch completion criteria

Production launch is complete only when all are true:

- GitHub CI passes on the deployed `main` commit.
- Vercel deployment is Ready.
- Production environment validation passes.
- Firebase Auth production hostname is authorized.
- Public smoke test passes.
- Candidate authenticated smoke passes.
- B2B authenticated smoke passes.
- No unexplained production 500 errors are visible during the launch check.
