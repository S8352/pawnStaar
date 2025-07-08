# PawnStaar MVP TODO List

## Phase 1: Database & Backend Foundation
- [ ] **Task 1.1:** Update User and Game models in `apps/backend/models.py`.
- [ ] **Task 1.2:** Create and apply database migration for platform profile fields.
- [ ] **Task 1.3:** Update `apps/backend/core/config.py` with Chess.com API and rate limiting settings.

## Phase 2: Chess Platform Integration
- [ ] **Task 2.1:** Create `apps/backend/core/chess_com.py` with profile and game fetching.
- [ ] **Task 2.2:** Enhance `apps/backend/core/lichess.py` with profile image fetching and better error handling.
- [ ] **Task 2.3:** Create `apps/backend/core/platform_service.py` to unify platform interactions.

## Phase 3: Frontend Account Linking
- [ ] **Task 3.1:** Add account linking and profile search endpoints to `apps/backend/routers/users.py`.
- [ ] **Task 3.2:** Enhance `apps/frontend/components/features/settings-form.tsx` for account linking.

## Phase 4: Game Import & Storage
- [ ] **Task 4.1:** Set up Celery and create game import task in `apps/backend/celery_worker.py`.
- [ ] **Task 4.2:** Create `apps/backend/routers/import.py` with endpoints to start and monitor imports.

## Phase 5: AI-Assisted Deployment
- [ ] **Task 5.1:** Create `vercel.json` for frontend deployment.
- [ ] **Task 5.2:** Create `railway.toml` for backend deployment.
- [ ] **Task 5.3:** Update `apps/backend/Dockerfile` for production.
- [ ] **Task 5.4:** Create `.github/workflows/deploy.yml` for CI/CD.
- [ ] **Task 5.5:** Configure environment variables for production.

## Phase 6: MVP Launch
- [ ] **Task 6.1:** Conduct end-to-end testing.
- [ ] **Task 6.2:** Set up Sentry for error tracking.
- [ ] **Task 6.3:** Set up Vercel Analytics.
- [ ] **Task 6.4:** Complete pre-launch checklist.
- [ ] **Task 6.5:** Launch MVP.
