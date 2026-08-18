# The Lobby v1.0 Release Candidate Finalization

This document marks the code-development boundary before production deployment.

## Included in the release candidate

### Candidate / Public
- Public Job data is served through a sanitized server API; anonymous clients cannot read raw internal Job documents.
- Job intent is preserved across Candidate login and profile registration.
- Candidate password reset, working Portal navigation, job re-entry, and self-service application withdrawal are available.
- Candidate PDF/DOCX/TXT AI resume intake reuses the same extraction/parsing service as B2B intake.
- Public and Candidate navigation supports compact/mobile screens.

### Recruiter / Admin
- Passive Candidates may be saved to the Talent Pool without immediate placement.
- Candidate Pool search is tenant-scoped and server-side rather than limited to the currently displayed page.
- Jobs support full content editing after creation.
- ADMIN Job creation uses a customer/organization selector.
- ADMIN analytics can switch between J&C-wide and organization-scoped views; RECRUITER analytics remains tenant-fixed.
- Pipeline UI routes guarded transitions to Interview scheduling, Hiring Outcome, or reason capture instead of relying on failed direct stage updates.
- B2B workspace navigation is available on compact/mobile screens.

### Production hardening
- Deprecated legacy AI formatting endpoint removed.
- Public AI resume parsing has conservative request rate limiting.
- `/api/readiness` validates required server environment and Firebase Admin/Firestore connectivity.
- Production smoke requires readiness.
- Phase 10 static readiness checks cover public-data, AI, and readiness boundaries.

## Merge gate

The release branch must pass GitHub Actions:

```bash
npm ci
npm run check:phase10:static
npm run build
```

## Required after merge and before production launch

These are deployment/operations gates, not additional product feature development:

1. Run the Firebase-backed full regression with release credentials: `npm run check:phase10`.
2. Deploy Firestore rules and indexes: `npm run deploy:firestore`.
3. Create/import the Vercel project and configure the production environment contract.
4. Add the production domain to Firebase Authentication authorized domains.
5. Deploy the exact validated `main` revision.
6. Run `PRODUCTION_BASE_URL=<url> npm run check:phase10:smoke` and require `/api/health` and `/api/readiness` to pass.
7. Run authenticated Candidate and Recruiter smoke scenarios.
8. Verify one real Groq resume parse and one real Resend email in production.
9. Confirm runtime logs contain no unexpected 5xx responses.
10. Publish only after J&C-approved privacy policy, terms, and data-retention/deletion policy are linked in the Candidate experience.

## Post-launch scale notes

- The current request limiter is process-local and is suitable as a conservative beta guard; replace it with shared/durable rate limiting when public traffic grows.
- Candidate server search scans the latest 500 tenant candidates and returns up to 50 matches; replace it with a dedicated search projection/index when Talent Pools exceed this operating range.
